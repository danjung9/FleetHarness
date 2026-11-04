'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const C=require('./core.cjs');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');const source=html.match(/<script id="governance-core">([\s\S]*?)<\/script>/)[1];const context=vm.createContext({});vm.runInContext(source,context);const B=context.GovernanceCore;const plain=x=>JSON.parse(JSON.stringify(x));
test('actual inline browser core and CommonJS core produce equivalent behavioral states',()=>{
 const vectors=[
 [{type:'scenario',value:'missing'},{type:'announce'},{type:'repair'},{type:'announce'},{type:'resolve'},{type:'execute'}],
 [{type:'scenario',value:'expired'},{type:'announce'},{type:'repair'},{type:'announce'}],
 [{type:'scenario',value:'stale'},{type:'announce'},{type:'repair'},{type:'announce'}],
 ...['sensor-first','repair-first'].map(order=>[{type:'queue',order},{type:'resolve'},{type:'execute'}]),
 [{type:'promotion',value:20},{type:'queue'},{type:'resolve'},{type:'execute'},{type:'promotion',value:40},{type:'resolve'},{type:'execute'}],
 [{type:'queue'},{type:'resolve'},{type:'condition',value:'general-quarters'},{type:'execute'},{type:'resolve'},{type:'execute'}],
 [{type:'queue'},{type:'resolve'},{type:'advance',seconds:5},{type:'execute'}],
 [{type:'queue'},{type:'resolve'},{type:'execute'},{type:'clear'},{type:'queue'},{type:'halt'},{type:'execute'},{type:'announce'}]
 ];
 for(const events of vectors){let a=C.initial(),b=B.initial();for(const event of events){a=C.transition(a,event);b=B.transition(b,event);assert.deepEqual(plain(b),a);}assert.deepEqual(plain(B.restore(JSON.stringify(b))),C.restore(JSON.stringify(a)));}
});

test('both actual cores reject inconsistent restored grant ownership and receipts',()=>{
 for(const api of [C,B]){
  let granted=api.transition(api.transition(api.initial(),{type:'queue'}),{type:'resolve'});
  const corruptions=[
   s=>{s.resourceLeases[0].resourceId='other-resource';},
   s=>{s.resourceLeases[0].batchId='other-batch';},
   s=>{s.resourceLeases[0].expiresAt=s.resourceLeases[0].issuedAt;},
   s=>{s.decisions[0].batchId='other-batch';},
   s=>{s.decisions[0].candidates[0].score=999;},
   s=>{s.decisions[0].candidates[0].intentId='absent-intent';}
  ];
  for(const corrupt of corruptions){const s=plain(granted);corrupt(s);assert.throws(()=>api.restore(JSON.stringify(s)),/Invalid local snapshot/);}
  const completed=api.transition(granted,{type:'execute'});
  for(const corrupt of [s=>{s.actionReports[0].resourceId='other-resource';},s=>{s.actionReports[0].time=-1;},s=>{s.actionReports[0].decisionId='decision-2';}]){
   const s=plain(completed);corrupt(s);assert.throws(()=>api.restore(JSON.stringify(s)),/Invalid local snapshot/);
  }
 }
});

test('both cores retain rejection receipts when authorization disappears before resolution',()=>{
 for(const api of [C,B]){
  let s=api.transition(api.initial(),{type:'announce'});s.authorizationLeases=s.authorizationLeases.filter(l=>l.agentId!=='repair');
  s=api.transition(s,{type:'resolve'});assert.equal(s.decisions.at(-1).winner,null);assert.match(s.decisions.at(-1).candidates[0].eligibility,/authorization lease is invalid/);assert.equal(s.decisions.at(-1).candidates[0].authorization,null);assert.equal(s.actionReports.length,0);
 }
});
