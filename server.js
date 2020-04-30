const path = require('path')

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const spawn = require('child_process').spawn
const os = require('os')

const express = require('express')
var multer  = require('multer')
var upload = multer({ dest: os.tmpdir() || 'tmp' })

const app = express()

function catchNext(asyncMidd) {
  return (...args) => {
    const rethrow = err => {throw err}
    const next = args[args.length-1] // last arg
    
    // execute the async middleware catching an error to next
    asyncMidd(...args).catch(next || rethrow)
  }
}

app.get('/', (req, res, next) => {
  res.send(`<code>curl -XPOST -F 'tarball=@/Users/abernier/tmp/course.tar.gz' https://ironboook.herokuapp.com/ >~/Desktop/ironbook.pdf</code>`)
})

app.post('/', upload.single('tarball'), catchNext(async (req, res, next) => {
  console.log(req.file.path)

  //
  // Extract tar.gz
  //
  // ⚠️ Depending on wether the archive comes from `md2oedx` or studio.ironhack.school, it will have a leading `course` folder
  // Script here take this into account and avoid this problem: we search for `chapter/` folder and take the parent folder.
  //
  //   1. Rename /tmp/abcd uploaded file into /tmp/abcd.tar.gz
  //   2. Extract it to /tmp/abcd/x
  //   3. Find the `chapter/` parent dir and move it to /tmp/abcd/course
  //   4. remove /tmp/abcd/x
  //
  const rootDirCourseFolderName = 'course'
  await exec(`
    mv ${req.file.path} ${req.file.path}.tar.gz && \
    mkdir -p ${req.file.path}/x && tar -xzvf ${req.file.path}.tar.gz -C ${req.file.path}/x && \
    mv  $(dirname $(find ${req.file.path}/x -type d -name chapter)) ${req.file.path}/${rootDirCourseFolderName} && \
    rm -rf ${req.file.path}/x
  `)

  //
  // make the PDF
  //

  // https://stackoverflow.com/a/27716861/133327
  var env = Object.create( process.env );
  env.COURSEXMLRELPATH = `${rootDirCourseFolderName}/course.xml`;

  make = spawn(`make`, [`${req.file.path}/public/pages.pdf`], {
    stdio: 'inherit', // see: https://stackoverflow.com/a/43477289/133327
    env
  });
  make.on('exit', function (code) {
    // console.log('code', code)
    if (code !== 0) {
      return next(new Error('make has failed'));
    }

    // serve it
    res.sendFile(path.resolve(__dirname, `${req.file.path}/public/pages.pdf`))
  });

}))

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`app listening on port ${port}`))