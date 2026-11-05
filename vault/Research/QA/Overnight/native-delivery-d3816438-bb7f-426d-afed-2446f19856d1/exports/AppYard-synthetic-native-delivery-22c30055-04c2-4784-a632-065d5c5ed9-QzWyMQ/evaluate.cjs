const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const code=html.match(/\/\* CORE_START \*\/([\s\S]*?)\/\* CORE_END \*\//)?.[1];
if(!code) throw new Error('Delivered parser core missing');
const context={}; vm.runInNewContext(code,context,{timeout:1000});
let body=''; process.stdin.on('data',x=>body+=x); process.stdin.on('end',()=>process.stdout.write(JSON.stringify(context.parseTask(JSON.parse(body)))));
