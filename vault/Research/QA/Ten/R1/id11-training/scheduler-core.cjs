'use strict';
// Execute the actual classic-script core delivered to the browser. No second solver.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const script = html.match(/<script id="pb4t-core">([\s\S]*?)<\/script>/);
if (!script) throw new Error('Application core is missing');
const context = vm.createContext({});
vm.runInContext(script[1] + '\nthis.core = PB4TCore;', context, {timeout: 5000});
module.exports = context.core;
