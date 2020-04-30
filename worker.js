// see: https://devcenter.heroku.com/articles/node-concurrency
const WORKERS = process.env.WEB_CONCURRENCY || 1

const conf = require('./conf')
console.log('conf=', JSON.stringify(conf, null, 4));

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const spawn = require('child_process').spawn

async function buildPDF(tarballPath) {
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
    mv ${tarballPath} ${tarballPath}.tar.gz && \
    mkdir -p ${tarballPath}/x && tar -xzvf ${tarballPath}.tar.gz -C ${tarballPath}/x && \
    mv $(dirname $(find ${tarballPath}/x -type d -name chapter)) ${tarballPath}/${rootDirCourseFolderName} && \
    rm -rf ${tarballPath}/x
  `)

  //
  // make the PDF
  //

  function make() {
    return new Promise((resolve, reject) => {
      // https://stackoverflow.com/a/27716861/133327
      var env = Object.create( process.env );
      env.COURSEXMLRELPATH = `${rootDirCourseFolderName}/course.xml`;

      make = spawn(`make`, [`${tarballPath}/public/pages.pdf`], {
        stdio: 'inherit', // see: https://stackoverflow.com/a/43477289/133327
        env
      })

      make.on('exit', function (code) {
        // console.log('code', code)
        if (code !== 0) {
          return reject(new Error('make has failed'));
        }

        // serve it
        resolve(`${tarballPath}/public/pages.pdf`)
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

    const kue = require('kue'); 
    const redis_uri = require('url').parse(require('url').format(process.env.REDIS_URL || conf.redis_uri));
    const queue = kue.createQueue({
      redis: redis_uri.href,
      disableSearch: true
    });
    queue.on('error', err => {
      console.err('Oops... ', err)
    })

    queue.process('book', 1, async function (job, done) {
      try {
        console.log('Now processing job', JSON.stringify(job.data, null, 4));

        //
        // Download the course.tar.gz file from S3
        //

        if (!job.data.tarball) {
          throw new Error('No tarball in this job')
        }

        const tarballPath = await s3.download(job.data.tarball);

        //
        // Build the PDF with
        //

        const dst = await buildPDF(tarballPath)

        //
        // Upload to S3
        //

        console.log(`Uploading ${dst} to S3...`)

        const loc = (await s3.upload({
          name: `${job.data.hash}.pdf`,
          path: dst,
          contentType: 'application/pdf'
        })).Location;

        console.log('Successfully uploaded to S3, persisting URL to `job.result`: %s', loc);
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