const rc = require('rc')
const pkg = require('./package.json')

const appname = pkg.name

const defaults = {}
const conf = rc(appname, defaults)

console.log('conf', conf)

module.exports = conf