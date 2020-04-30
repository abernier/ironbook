const fs    = require('fs');
const uuid  = require('uuid');
const conf  = require('./conf');

if (conf.s3_uri == null) throw new Error('s3 conf URI missing');

// url should be formated as:
// s3://ACCESS_KEY_ID:SECRET_KEY@www.amazonaws.com/BUCKET_NAME#REGION
var url = require('url').parse(conf.s3_uri);
var auth = url.auth.split(':');

var accessKeyId = auth[0];
var secretAccessKey = auth[1];
var region = url.hash.substr(1);
var Bucket = url.pathname.substr(1);
var url = `https://s3-${region}.amazonaws.com/${Bucket}`;
//console.log('s3 params');
//console.dir({s3_uri: conf.s3_uri, accessKeyId, secretAccessKey, region, Bucket, url});

var AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region,
});

var s3 = new AWS.S3({
  params: { Bucket },
});

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
exports.upload = function upload(file) {
  let extension = file.name.split('.').reverse()[0]
  let Key = `${uuid.v4()}.${extension}`
  let Body = fs.createReadStream(file.path)
  let ContentType = file.contentType
  
  return new Promise(function (resolve, reject) {
    s3.upload({
      Key,
      Body,
      ContentType
    }, function (er, data) {
      if (er) return reject(er);
      
      return resolve(data);
    });
  });
};

// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/requests-using-stream-objects.html
exports.download = function download(url) {
  return new Promise(function (resolve, reject) {
    let Key = require('url').parse(url).pathname.substr(1)
    console.log('Key', Key)
  
    const finalPath = `${require('os').tmpdir()}/${uuid.v4()}.tar.gz`
  
    var fileStream = require('fs').createWriteStream(finalPath);
    var s3Stream = s3.getObject({Key}).createReadStream();
  
    // Listen for errors returned by the service
    s3Stream.on('error', function (err) {
      // eg: NoSuchKey: The specified key does not exist
      reject(err)
    });
  
    s3Stream.pipe(fileStream).on('error', function (err) {
      // capture any errors that occur when writing data to the file
      reject(err)
    }).on('close', function () {
      resolve(finalPath)
    });
  });
};

exports.client = s3;