const path = require('path')

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const spawn = require('child_process').spawn

const express = require('express')
var multer  = require('multer')
var upload = multer({ dest: 'tmp' })

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

  // extract tar.gz
  await exec(`
              mv ${req.file.path} ${req.file.path}.tar.gz && \
              mkdir -p ${req.file.path}/course && \
              tar -zxvf ${req.file.path}.tar.gz -C ${req.file.path}/course
            `)

  // make the PDF
  make = spawn('make', [`${req.file.path}/public/pages.pdf`], { stdio: 'inherit' }); // see: https://stackoverflow.com/a/43477289/133327
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