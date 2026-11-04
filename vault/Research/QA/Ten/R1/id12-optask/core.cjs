'use strict';
// Node adapter executes the same self-contained core used by the browser.
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, 'index.html'), 'utf8');
const match = html.match(/<script id="application-core">([\s\S]*?)<\/script>/);
if (!match) throw new Error('Application core missing');
const context = vm.createContext({});
vm.runInContext(match[1], context, {filename: 'index.html#application-core'});
module.exports = context.SyntheticCore;
