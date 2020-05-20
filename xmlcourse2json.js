const fs = require('fs')
const path = require('path')

const xml2js = require('xml2js');

const {md5, sha1} = require('./helpers.js');

async function xml2obj(filepath) {
  const xmlstr = fs.readFileSync(path.resolve(__dirname, filepath), 'utf-8')

  return await xml2js.parseStringPromise(xmlstr)
}

async function main(xmlcoursepath) {
  const ret = {
    "course": {
      "name": "WDPT",
      "number": "MASTER",
      "version": "5.0",
      "chapter": []
    }
  }

  const dir = path.dirname(xmlcoursepath)

  const root = await xml2obj(xmlcoursepath)
  // console.log('root', root)

  const course = await xml2obj(`${dir}/course/${root.course.$.url_name}.xml`)
  //console.log(course);

  const checksum = sha1(xmlcoursepath)

  let i = 0;
  for (chap of course.course.chapter) {
    //console.log(chap)

    const chapter = await xml2obj(`${dir}/chapter/${chap.$.url_name}.xml`)
    //console.log(chapter)

    const o = {
      name: chapter.chapter.$.display_name,
      sequential: []
    }

    let j = 0;
    for (seq of chapter.chapter.sequential) {
      //console.log(seq)

      const sequential = await xml2obj(`${dir}/sequential/${seq.$.url_name}.xml`)
      //console.log(sequential)

      const o2 = {
        name: sequential.sequential.$.display_name,
        vertical: []
      }

      let k = 0;
      for (vert of sequential.sequential.vertical) {
        const vertical = await xml2obj(`${dir}/vertical/${vert.$.url_name}.xml`)
        // console.log(vertical)

        const name = vertical.vertical.$.display_name;

        const o3 = {
          id: md5(`${checksum}_${i}.${j}.${k}-${name}`).substring(0,5), // generate an unique id
          name,
          html: []
        }

        for (h of vertical.vertical.html || []) {
          const html = await xml2obj(`${dir}/html/${h.$.url_name}.xml`)
          // console.log(html)

          o3.html.push({
            file: html.html && html.html.$ && html.html.$.filename && `${dir}/html/${html.html.$.filename}.html` || ''
          })
        }

        o2.vertical.push(o3)
      
        k++;
      }

      o.sequential.push(o2)

      j++;
    }

    ret.course.chapter.push(o)

    i++;
  }

  //console.log(JSON.stringify(ret, null, 2))
  return ret;
}

module.exports = main