'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const C=require('./core.cjs');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');const ctx=vm.createContext({});vm.runInContext(html.match(/<script id="application-core">([\s\S]*?)<\/script>/)[1],ctx);const inline=ctx.SyntheticCore;
const plain=x=>JSON.parse(JSON.stringify(x));
test('actual inline core and Node adapter execute frozen journey inputs with matching behavior',()=>{
 const plan=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'acceptance-plan.json'),'utf8'));
 const inputs=new Set(plan.journeys.flatMap(j=>j.steps.filter(x=>x.action==='fill'&&x.selector==='#source-input').map(x=>x.value)));
 for(const text of inputs){const a=C.parseSource({sourceText:text}),b=inline.parseSource({sourceText:text});assert.deepEqual(plain(a),plain(b));
 const outputs=[C,inline].map(core=>{const s=core.createSession();s.draft=text;core.commit(s);for(const r of s.snapshot.records)core.setCategory(s,r.key,'frequency');const status=core.approve(s);return {status,day:core.buildDay(s.approved?s.snapshot.records:[],'2026-11-04'),export:s.approved?core.buildExport(s,'2026-11-04'):null};});assert.deepEqual(plain(outputs[0]),plain(outputs[1]));}
});
