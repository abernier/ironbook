const conf = require('./conf')

const os = require('os')
const path = require('path')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const express = require('express')

var multer  = require('multer')
const tmpdir = /*os.tmpdir() ||*/ path.resolve(__dirname, 'tmp')
var upload = multer({ dest: os.tmpdir() })

const xmlcourse2json = require('./xmlcourse2json.js')

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var cors = require('cors');
app.use(cors({
  exposedHeaders: ['Location'] //see: https://stackoverflow.com/questions/5822985/cross-domain-resource-sharing-get-refused-to-get-unsafe-header-etag-from-re
}));

//
// serve public directory: http://expressjs.com/en/resources/middleware/serve-static.html
//
var staticMiddleware = express.static(__dirname + '/www', {
  cacheControl: false,
  etag: false
});
app.use(staticMiddleware);

//
// Default 'Accept' and 'Content-Type'
//
app.use(function (req, res, next) {
  req.headers['accept'] = req.headers['accept'] || 'application/json';

  // if 'Accept: application/json' and 'Content-Type' is not set => defaults to 'application/json'
  if (req.headers['accept'] === 'application/json' && !req.headers['content-type']) {
    req.headers['content-type'] = req.headers['content-type'] || 'application/json';
  }

  next();
});

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

//
// Routes
//

function catchNext(asyncMidd) {
  return (...args) => {
    const rethrow = err => {throw err}
    const next = args[args.length-1] // last arg
    
    // execute the async middleware catching an error to next
    asyncMidd(...args).catch(next || rethrow)
  }
}

/*
     ██╗
    ██╔╝
   ██╔╝ 
  ██╔╝  
 ██╔╝   
 ╚═╝    
 */

app.post('/', upload.single('tarball'), catchNext(async function (req, res, next) {
  console.log('post /', req.body, req.file)

  const {filter = []} = req.body


  if (!req.file) {
    const err = new Error('tarball file is required')
    err.status = 422
    throw err
  }

  //const checksum = await sha1(req.file.path)
  const checksum = req.file.filename
  console.log('checksum', checksum)

  //
  // Extract the tarball and validate the `course.xml` file:
  //   - it must be present
  //   - it must
  //

  const rootDirCourseFolderName = 'course'
  const dstdir = `${tmpdir}/${checksum}`

  await exec(`./bin/extract.sh ${req.file.path} ${dstdir}/${rootDirCourseFolderName}`).catch(err => {
    err.message = "Unexpected tarball"
    err.status = 500;
    throw err;
  })

  const jsoncourse = await xmlcourse2json(`${dstdir}/${rootDirCourseFolderName}/course.xml`)
  // console.log('jsoncourse', jsoncourse);

  function listUnits(json, filter = []) {
    let units = []; // flat list of units
    let chapters = []; // list of chapters with `units` array inside
    
    json.course.chapter.forEach(chap => {
      const chapter = {
        name: chap.name,
        units: []
      }
      chapters.push(chapter)

      chap.sequential.forEach(seq => {
        seq.vertical.forEach(vert => {
          const unitid = vert.id;
          if (!filter.includes(unitid)) {
            units.push(vert) // only if not filtered
            chapter.units.push(vert)
          }
          
        })
      })
    })

    return {units, chapters};
  }

  const {units, chapters} = listUnits(jsoncourse, filter)
  console.log('units', units.length);

  const unitsLimit = Number(conf.unitslimit) || Infinity;
  if (units.length > unitsLimit) {
    const er = new Error('Too much units')
    er.status = 422;
    er.data = {
      units,
      chapters,
      limit: unitsLimit
    };
    throw er
  }

  //
  // Upload the tar.gz file to S3
  //

  coursetgz = await require('./s3').upload({
    name: checksum,
    path: req.file.path,
    contentType: 'application/gzip' // https://superuser.com/questions/901962/what-is-the-correct-mime-type-for-a-tar-gz-file
  })

  //
  // Create a job in the fifo
  //

  enqueueBook({
    headers: {
      //'Accept': accept
    },
    filter: filter,
    tarball: coursetgz.Location
  }, function (er, job) {
    if (er) return next(er);

    //console.log('Ok, job is enqueued, id: ', job.id);

    let url = `${req.protocol}://${req.get('host')}/queue/${job.id}`
    console.log('url', url) 
    res.header('Location', url).sendStatus(202);
  });

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

    //
    // once the connection is closed from the client: `eventSource.close()`
    //

    // prevent H15 idle connection from Heroku (see https://devcenter.heroku.com/articles/request-timeout#long-polling-and-streaming-responses)
    function tick() {
      sse.write({
        data: {tic: 'tac'}
      });
    }
    const tickInt = setInterval(tick, 30000) // send a tick every 30s

    let closed;
    res.on('close', () => {
      closed = true;

      console.log(`Closing /updates/${jobid} connection`)
      sse.end()
      sse.unpipe(res)

      clearInterval(tickInt);
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
        queue.off('job progress', onJobProgress);
        sse.write({
          data: {result: result}
        });
      }
      function waitingForJobToFail(id, errmsg) {
        if (id !== jobid || closed) return;

        console.log('[Job] Job #%s has just failed', id, errmsg)

        queue.off('job complete', waitingForJobToComplete);
        queue.off('job failed', waitingForJobToFail);
        queue.off('job progress', onJobProgress);
        sse.write({
          data: {error: errmsg}
        });
      }
      function onJobProgress(id, progress, data) {
        if (id !== jobid || closed) return;
        
        console.log('[Job] Job #%s is making good progresses: %s', id, progress, data)

        sse.write({
          data: {
            progress: progress,
            step: data.step
          }
        });
      }
      queue.on('job complete', waitingForJobToComplete)
      queue.on('job failed', waitingForJobToFail)
      queue.on('job progress', onJobProgress)
      
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

const error = require('./middleware/error')
app.use(error)

const port = process.env.PORT || 3000
const server = app.listen(port, () => console.log(`app listening on port ${port}`))
server.setTimeout(5*1000*60) // timeout of 5 mins