// see: https://devcenter.heroku.com/articles/node-concurrency
const WORKERS = process.env.WEB_CONCURRENCY || 1

const conf = require('./conf')
console.log('conf=', JSON.stringify(conf, null, 4));

const os = require('os')

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const spawn = require('child_process').spawn

const uuid = require('uuid')
const tmpdir = os.tmpdir()

async function buildPDF(tarballPath, job, options = {}) {
  options.progressRange || (options.progressRange = [0, 100])

  // Extract the tarball
  const rootDirCourseFolderName = 'course'
  const dstdir = `${tmpdir}/${uuid.v4()}`
  await exec(`./bin/extract.sh ${tarballPath} ${dstdir}/${rootDirCourseFolderName}`)

  //
  // make the PDF
  //

  function make() {
    return new Promise((resolve, reject) => {
      // https://stackoverflow.com/a/27716861/133327
      var env = Object.create( process.env );
      env.COURSEXMLRELPATH = `${rootDirCourseFolderName}/course.xml`;
      env.UNITSFILTER = job.data.filter.join(',')

      make = spawn(`make`, [`${dstdir}/public/pages.pdf`], {
        //stdio: 'inherit', // see: https://stackoverflow.com/a/43477289/133327
        env
      })

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
        //console.log(data)

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
      })

      make.stdout.on('data', data => {
        data = `${data}`
        console.log(data)
      })

      make.on('exit', function (code) {
        // console.log('code', code)
        if (code !== 0) {
          return reject(new Error('make has failed'));
        }

        // serve it
        resolve(`${dstdir}/public/pages.pdf`)
      })
    })
  }

  const path = await make()
  return path
}

async function start(cb) {
  try {
    console.log('Starting worker...');

    const s3 = require('./s3');

    //
    // create the queue
    //

    const kue = require('kue'); 
    const redis_uri = require('url').parse(require('url').format(process.env.REDIS_URL || conf.redis_uri));
    const queue = kue.createQueue({
      redis: redis_uri.href,
      disableSearch: true
    });
    queue.on('error', err => {
      console.err('Oops... ', err)
    })

    //
    // process the queue
    //

    queue.process('book', 1, async function (job, done) {
      try {
        console.log('Now processing job', JSON.stringify(job, null, 4));

        job.progress(1, 100, {step: 'init'})

        //
        // 1. Download the course.tar.gz file from S3
        //

        if (!job.data.tarball) {
          throw new Error('No tarball in this job')
        }

        const tarballPath = await s3.download(job.data.tarball);
        job.progress(3, 100, {step: 'tgz:downloaded'})

        //
        // 2. Build the PDF with
        //

        const dst = await buildPDF(tarballPath, job, {
          progressRange: [3, 85]
        }) // pass the `job` in in order to call `job.progress` inside

        //
        // 3. Upload to S3
        //

        console.log(`Uploading ${dst} to S3...`)

        job.progress(85, 100, {step: 's3:upload'})

        const loc = (await s3.upload({
          name: `${job.data.hash}.pdf`,
          path: dst,
          contentType: 'application/pdf'
        })).Location;

        console.log('Successfully uploaded to S3, persisting URL to `job.result`: %s', loc);

        job.progress(100, 100, {step: 'done'})

        done(null, loc)
      } catch(err) {
        console.error(`Error while processing job ${job.id}`, err)
        done(err)
        return;
      }
    });

    console.log('Worker is now started.')
    cb(null);
  } catch(er) {
    cb(er);
  }
}

if (conf.env === 'development') {
  start(function (er) {
    if (er) throw er
  })
} else {
  const throng = require('throng')
  throng({
    workers: WORKERS,
    lifetime: Infinity,
    start: function (id) {
      console.log(`Started throng-worker ${id}`);

      start(function (er) {
        if (er) throw er
      })
    }
  })
}