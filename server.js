const conf = require('./conf')

const express = require('express')
var multer  = require('multer')
var upload = multer({ dest: /*os.tmpdir() ||*/ 'tmp' })

const app = express()

// Default 'Accept' and 'Content-Type'
app.use(function (req, res, next) {
  req.headers['accept'] = req.headers['accept'] || 'application/json';

  // if 'Accept: application/json' and 'Content-Type' is not set => defaults to 'application/json'
  if (req.headers['accept'] === 'application/json' && !req.headers['content-type']) {
    req.headers['content-type'] = req.headers['content-type'] || 'application/json';
  }

  next();
});

// body parser (see: http://expressjs.com/en/4x/api.html#req.body)
const bodyParser = require('body-parser');
app.use(bodyParser.json());

function catchNext(asyncMidd) {
  return (...args) => {
    const rethrow = err => {throw err}
    const next = args[args.length-1] // last arg
    
    // execute the async middleware catching an error to next
    asyncMidd(...args).catch(next || rethrow)
  }
}

//
// Kue
//

const kue = require('kue'); 
const redis_uri = require('url').parse(require('url').format(process.env.REDIS_URL || conf.redis_uri));
const queue = kue.createQueue({
  redis: redis_uri.href,
  //disableSearch: true
});
queue.on('job enqueue', (id, type) => console.log('[Queue] Job #%s[%s] just queued', id, type))
queue.on('job start', (id) => console.log('[Queue] Job #%s has just started to be processed', id))
queue.on('job complete', (id) => console.log('[Queue] Job #%s has just finished to be processed', id))
queue.on('job failed', (id, er) => console.log('[Queue] Job #%s has just failed', id, er))
app.queue = queue;

app.use('/kue', kue.app);

const ttl = 60*1000 // ms
function enqueueBook(params, cb) {
  console.log('enqueueBook', params);

  let job = queue.create('book', params)/*.ttl(ttl)*/.save(function (er) {
    if (er) return cb(er);

    cb(null, job);
  });
}

app.get('/', (req, res, next) => {
  res.send(`<code>curl -XPOST -F 'tarball=@/Users/abernier/tmp/course.tar.gz' https://ironboook.herokuapp.com/ >~/Desktop/ironbook.pdf</code>`)
})

app.post('/', upload.single('tarball'), catchNext(async function (req, res, next) {
  console.log('post /', req.body, req.file)

  if (!req.file) {
    const err = new Error('tarball file is required')
    err.status = 422
    throw err
  }

  //
  // Make a hash of the request params (req.file and req.body)
  //

  function sha1(path) {
    return new Promise((resolve, reject) => {
      const hash = require('crypto').createHash('sha1')
      const rs = require('fs').createReadStream(path)
      rs.on('error', reject)
      rs.on('data', chunk => hash.update(chunk))
      rs.on('end', () => resolve(hash.digest('hex')))
    })
  }
  
  function md5(data) {
    return require('crypto').createHash("md5").update(data).digest("hex");
  }

  const checksum = await sha1(req.file.path)
  console.log('checksum', checksum)

  let hash = md5(JSON.stringify({
    tarball: checksum,
    body: req.body
  }));
  console.log('hash', hash);

  //
  //
  //

  let body = req.body;

  //let async = (req.header('Prefer') === 'respond-async');
  let async = true
  if (!async) {
    console.log('sync')
  } else {
    console.log('async')

    coursetgz = await require('./s3').upload({
      name: hash,
      path: req.file.path,
      contentType: 'application/gzip' // https://superuser.com/questions/901962/what-is-the-correct-mime-type-for-a-tar-gz-file
    })

    enqueueBook({
      hash: hash,
      headers: {
        //'Accept': accept
      },
      body: req.body,
      tarball: coursetgz.Location
    }, function (er, job) {
      if (er) return next(er);

      //console.log('Ok, job is enqueued, id: ', job.id);

      let url = `${req.protocol}://${req.get('host')}/queue/${job.id}`
      console.log('url', url) 
      res.header('Location', url).sendStatus(202);
    });

  }
}));

/*
    ██╗ ██████╗ ██╗   ██╗███████╗██╗   ██╗███████╗    ██╗   ██╗██████╗ 
   ██╔╝██╔═══██╗██║   ██║██╔════╝██║   ██║██╔════╝   ██╔╝██╗██║██╔══██╗
  ██╔╝ ██║   ██║██║   ██║█████╗  ██║   ██║█████╗    ██╔╝ ╚═╝██║██║  ██║
 ██╔╝  ██║▄▄ ██║██║   ██║██╔══╝  ██║   ██║██╔══╝   ██╔╝  ██╗██║██║  ██║
██╔╝   ╚██████╔╝╚██████╔╝███████╗╚██████╔╝███████╗██╔╝   ╚═╝██║██████╔╝
╚═╝     ╚══▀▀═╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝╚═╝       ╚═╝╚═════╝ 
*/
app.get('/queue/:jobid', function (req, res, next) {
  let jobid = req.params.jobid;

  kue.Job.get(jobid, function (er, job){
    if (er) return next(er);

    let state = job.state();
    if (state !== 'complete') {
      res.json(job);
    } else {
      // return the AWS S3 ressource
      res.header('Location', `${job.result}`).sendStatus(303);
    }
  });
});

/*
    ██╗██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗███████╗    ██╗   ██╗██████╗ 
   ██╔╝██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔════╝   ██╔╝██╗██║██╔══██╗
  ██╔╝ ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗  ███████╗  ██╔╝ ╚═╝██║██║  ██║
 ██╔╝  ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝  ╚════██║ ██╔╝  ██╗██║██║  ██║
██╔╝   ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗███████║██╔╝   ╚═╝██║██████╔╝
╚═╝     ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝╚═╝       ╚═╝╚═════╝ 
Used by the client when a `202 Accepted` is returned to get updates about the `Location: /queue/:jobid` ressource

*/
const SseStream = require('ssestream');
app.get('/updates/:jobid', function (req, res, next) {
  let jobid = +req.params.jobid;

  //
  // Retrieve job from kue
  //    

  kue.Job.get(jobid, function (er, job) {
    if (er) return next(er) // if job does not exist => return an HTTP error that will make the eventsource fails

    const sse = new SseStream(req)
    sse.pipe(res)

    let closed;
    res.on('close', () => {
      closed = true;

      console.log(`Closing /updates/${jobid} connection`)
      sse.end()
      sse.unpipe(res)
    })
    
    let state = job.state();
    console.log('job retrieved', job.id, state);


    if (state !== 'complete') {
      //
      // Job is not yet 'complete'd, let's subscribe on it
      //
      console.log('job not already completed => subscribing')

      function waitingForJobToComplete(id, result) {
        if (id !== jobid || closed) return;

        console.log('[Job] Job #%s has just finished to complete', id)

        queue.off('job complete', waitingForJobToComplete);
        queue.off('job failed', waitingForJobToFail);
        sse.write({
          data: {result: result}
        });
      }
      function waitingForJobToFail(id, errmsg) {
        if (id !== jobid || closed) return;

        console.log('[Job] Job #%s has just failed', id, errmsg)

        queue.off('job complete', waitingForJobToComplete);
        queue.off('job failed', waitingForJobToFail);
        sse.write({
          data: {error: errmsg}
        });
      }
      queue.on('job complete', waitingForJobToComplete)
      queue.on('job failed', waitingForJobToFail)
      
    } else {
      //
      // Job is already 'complete'd, let's send it back to the eventsource
      //
      console.log('job already completed')

      // Already completed => send the result/error
      sse.write({
        data: {
          error: job.Error,
          result: job.result
        }
      });
    }

    
  });
});

const port = process.env.PORT || 3000
const server = app.listen(port, () => console.log(`app listening on port ${port}`))
server.setTimeout(5*1000*60) // timeout of 5 mins