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

module.exports = {
  sha1,
  md5
}