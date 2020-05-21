// see: https://devcenter.heroku.com/articles/node-concurrency
const WORKERS = process.env.WEB_CONCURRENCY || 1

const conf = require('./conf')
console.log('conf=', JSON.stringify(conf, null, 4));

const buildPDF = require('./buildpdf.js')

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