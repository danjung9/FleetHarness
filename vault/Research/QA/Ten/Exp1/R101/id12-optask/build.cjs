// Developer-only deterministic packaging. Browser users open index.html directly.
const fs = require('node:fs');
const path = require('node:path');
const base = __dirname;
const template = fs.readFileSync(path.join(base,'index.template.html'),'utf8');
const core = fs.readFileSync(path.join(base,'core.cjs'),'utf8');
const benchmark = fs.readFileSync(path.join(base,'benchmark-fixtures.json'),'utf8');
fs.writeFileSync(path.join(base,'index.html'),template.replace('/* CORE_PLACEHOLDER */',()=>core).replace('BENCHMARK_PLACEHOLDER',()=>benchmark.replace(/</g,'\\u003c')));
