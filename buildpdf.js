const os = require('os')

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const spawn = require('child_process').spawn

const path = require('path')

const uuid = require('uuid')
const tmpdir = os.tmpdir()

async function buildPDF(tarballPath, job, options = {}) {
  options.progressRange || (options.progressRange = [0, 100])

  // 
  // Make a copy of `public/` folder to a new temp dir
  //

  const dstdir = `${tmpdir}/${uuid.v4()}`
  await exec(`cp -rf public ${dstdir}`)

  //
  // make the PDF
  //

  function make() {
    return new Promise((resolve, reject) => {
      var env = Object.create( process.env ); // https://stackoverflow.com/a/27716861/133327
      // console.log('env', env)

      //
      // override Makefile variables
      //

      const HBS = path.resolve(__dirname, './hbs')
      const EXTRACT = path.resolve(__dirname, './bin/extract.sh')
      const TARBALL = tarballPath
      const UNITSFILTER = job && job.data.filter.join(',') || ''

      make = spawn(`make`, [
        `HBS=${HBS}`, `EXTRACT=${EXTRACT}`, `TARBALL=${TARBALL}`, `UNITSFILTER=${UNITSFILTER}`,
        `-C`, `${dstdir}`
      ], {
        //stdio: 'inherit', // see: https://stackoverflow.com/a/43477289/133327
        env
      })

      //
      // Job progress
      //

      let pass = 1
      const passes = 2;
      let prg;

      const initialProgress = options.progressRange[0]
      const finalProgress = options.progressRange[1]

      function intprog(x, a, b) {
        return a + (b-a) * x/100
      }

      make.stderr.on('data', data => {
        data = `${data}`
        console.error(data)

        if (job) {
          if (data.includes('Running scripts')) {
            job.progress(intprog(3, initialProgress, finalProgress), 100, {step: 'prince:scripts'});
          }
          if (data.includes('sta|Preparing document')) {
            job.progress(intprog(10, initialProgress, finalProgress), 100, {step: 'prince:prepare'});
          }
          if (data.includes('sta|Converting document')) {
            job.progress(intprog(36, initialProgress, finalProgress), 100, {step: 'prince:convert'});
          }
  
          // dealing with 2 passes
          if (data.includes("sta|Resolving cross-references")) {
            pass = 2
          }
  
          // `prince --server` outputs lines like: "prg|40"
          prgMatches = data.match(/prg\|([0-9]*)/)
          if (prgMatches) {
            prg = Number(prgMatches[1])
            const prgprog = 100 * (prg + 100*(pass-1)) / (100*passes) // (40 + 100) / 200
  
            const localProgress = intprog(prgprog, 36, 100)
  
            job.progress(intprog(localProgress, initialProgress, finalProgress), 100, {step: 'prince:processing'})
          }
        }
      })

      make.stdout.on('data', data => {
        data = `${data}`
        console.error(data)
      })

      make.on('exit', function (code) {
        // console.log('code', code)
        if (code !== 0) {
          return reject(new Error('make has failed'));
        }

        // serve the path of the generated PDF
        resolve(`${dstdir}/pages.pdf`)
      })
    })
  }

  const pdfpath = await make()
  return pdfpath
}

module.exports = buildPDF