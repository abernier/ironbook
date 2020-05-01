let ENDPOINT = '';

function configure(settings) {
  ENDPOINT = settings.endpoint;
}

//
// SSE connection to get information back about our async job (pushed from the server)
//
function jobUpdate(id, options = {}) {

  return new Promise(function (resolve, reject) {
    let url = `${ENDPOINT}/updates/${id}`;
    let eventSource = new EventSource(url);

    eventSource.onmessage = function (e) {
      // console.log('onmessage', e)

      let data = JSON.parse(e.data);

      if ('error' in data) {
        reject(new Error(data.error));
        eventSource.close();
      } else {
        if (data.result) {
          resolve(data.result);
          eventSource.close();
        } else if (data.progress) {
          options.progress && options.progress(data.progress)
        } else {
          //console.log('message', data)
        }
      }
    }

    eventSource.onerror = function (er) {
      reject(er);
      eventSource.close()
    };
  })
}

function post(file, options) {
  options || (options = {
    headers: {},
    json: {},
    progress: console.log
  })

  return new Promise(function (resolve, reject) {
    //console.log('sending a new request', headers, json)
    
    if (!file) {
      reject(new Error('file is required'));
    }
    
    let xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.open("POST", `${ENDPOINT}/`);

    xhr.onload = async function () {
      if (xhr.status >= 400) {
        console.log('xhr status >= 400');
        return reject(new Error(xhr.response.message));
      }

      let response;
      if (xhr.status === 202) {
        //
        // async
        //

        console.log('202 accepted');

        let location = xhr.getResponseHeader('Location');
        if (location.length <= 0) {
          return reject(new Error('No `Location` header in the 202 response.'))
        }

        let jobid = location.match(new RegExp('/queue/([0-9]+)'))[1]

        try {
          response = await jobUpdate(jobid, {progress: options.progress}); // response will contain the S3 URL
        } catch(er) {
          return reject(er);
        }

      } else {
        //
        // sync
        //

        // response = xhr.response; // will be a blob since xhr.responseType='blob'
        // response = window.URL.createObjectURL(response);
      }

      resolve(response);
    };
    xhr.onerror = reject;

    // xhr.setRequestHeader('Content-Type', 'application/json') // to override `text/html` from ajax
    // for (let k in options.headers) {
    //   xhr.setRequestHeader(k, options.headers[k]);
    // }
    
    const formdata = new FormData();
    
    // for (let key in options.json) {
    //   formdata.append(key, options.json[key]);
    // }
    
    formdata.append("tarball", file);

    xhr.send(formdata);
  });
}

export {configure, post}