'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const C=require('./core.cjs');
const run=(s,...events)=>events.reduce((s,e)=>C.transition(s,e),s);
const decision=s=>s.decisions.at(-1);
test('GOV-01 distinct eligibility failures and deliberate repair, no automatic execution',()=>{
 let s=C.initial();
 for(const [value,message,id] of [['missing','Rejected: agent ghost is not registered.','ghost'],['expired','Rejected: repair authorization lease expired at t=100.','repair'],['stale','Rejected: repair heartbeat is stale at t=100.','repair']]){
 s=run(s,{type:'scenario',value},{type:'announce'});assert.equal(s.intentResult,message);assert.equal(s.actionReports.length,0);
 s=run(s,{type:'repair'},{type:'announce'});assert.equal(s.intentResult,`Pending: ${id} requests pump-1.`);assert.equal(s.actionReports.length,0);
 }
 s=run(s,{type:'resolve'},{type:'execute'});assert.equal(s.actionReports.length,1);assert.equal(s.actionReports[0].agentId,'repair');assert.equal(s.intents.filter(i=>i.status==='rejected').length,3);
});
test('GOV-02 reversed arrival produces sensor winner, one exclusive lease, one action',()=>{
 for(const order of ['sensor-first','repair-first']){let s=run(C.initial(),{type:'queue',order},{type:'resolve'});assert.equal(decision(s).reason,'sensor wins pump-1: 60 > 40 under demo-v1 / cruising.');assert.equal(s.resourceLeases.filter(l=>l.status==='active').length,1);assert.equal(s.actionReports.length,0);s=run(s,{type:'execute'},{type:'execute'});assert.equal(s.actionReports.length,1);assert.equal(s.actionReports[0].agentId,'sensor');}
});
test('GOV-02 exact tie escalates in either order; saved promotion recovers',()=>{
 for(const order of ['sensor-first','repair-first']){let s=run(C.initial(),{type:'promotion',value:20},{type:'queue',order},{type:'resolve'},{type:'execute'});assert.equal(decision(s).reason,'Escalate pump-1: repair 60 = sensor 60. No lease granted.');assert.equal(s.actionReports.length,0);assert.equal(s.resourceLeases.length,0);s=run(s,{type:'promotion',value:40},{type:'resolve'},{type:'execute'});assert.equal(s.actionReports[0].agentId,'repair');assert.equal(decision(s).reason,'repair wins pump-1: 80 > 60 under demo-v1 / cruising.');}
});
test('condition invalidates issued work; snapshot retains original policy',()=>{
 let s=run(C.initial(),{type:'queue'},{type:'resolve'});const old=JSON.stringify(decision(s).candidates);s=run(s,{type:'condition',value:'general-quarters'},{type:'execute'});assert.equal(s.actionReports.length,0);assert.equal(s.decisions[0].condition,'cruising');assert.equal(JSON.stringify(s.decisions[0].candidates),old);s=run(s,{type:'resolve'});assert.equal(decision(s).reason,'repair wins pump-1: 70 > 60 under demo-v1 / general-quarters.');
});
test('policy bounds, unsaved drafts and discard preserve committed authority',()=>{
 for(const value of ['',-1,101,1.5,'x'])assert.throws(()=>C.transition(C.initial(),{type:'promotion',value}),/whole repair promotion/);
 let s=run(C.initial(),{type:'queue'},{type:'resolve'},{type:'draft',field:'promotion',value:'40'},{type:'execute'});assert.equal(s.promotion,0);assert.equal(s.actionReports.length,0);assert.throws(()=>C.transition(s,{type:'resolve'}),/Save or discard/);s=run(s,{type:'discard'},{type:'execute'});assert.equal(s.actionReports[0].agentId,'sensor');
});
test('lease expiry is exclusive; release permits fresh ownership',()=>{
 for(const seconds of [4,5]){let s=run(C.initial(),{type:'queue'},{type:'resolve'},{type:'advance',seconds},{type:'execute'});assert.equal(s.actionReports.length,seconds===4?1:0);if(seconds===5)assert.match(s.executionResult,/lease expired/);}
 let s=run(C.initial(),{type:'queue'},{type:'resolve'},{type:'clear'},{type:'queue',order:'repair-first'},{type:'resolve'});assert.equal(s.resourceLeases.filter(l=>l.status==='active').length,1);assert.equal(s.actionReports.length,0);
});
test('duplicate announcements and unregistered agents never allocate or execute',()=>{
 let s=run(C.initial(),{type:'announce',agentId:'repair',id:'request-a'},{type:'announce',agentId:'repair',id:'request-a'});assert.equal(s.intents.length,1);assert.match(s.intentResult,/duplicate/);s=run(s,{type:'resolve'},{type:'execute'},{type:'execute'});assert.equal(s.actionReports.length,1);
 s=run(C.initial(),{type:'announce',agentId:'ghost'},{type:'resolve'},{type:'execute'});assert.equal(s.actionReports.length,0);assert.equal(s.resourceLeases.length,0);
});
test('eligibility boundaries and malformed telemetry fail closed',()=>{
 for(const [field,value] of [['heartbeatAt',null],['heartbeatAt',NaN],['heartbeatAt',101],['heartbeatAt',99.5],['heartbeatAt','100'],['validFrom',-1],['expiresAt',100]]){
 const s=C.initial();s.agents.find(a=>a.id==='repair')[field]=value;assert.ok(C.eligibility(s,'repair'));try{const out=C.transition(s,{type:'announce'});assert.equal(out.intents[0].status,'rejected');}catch(e){assert.match(e.message,/Invalid local/);}
 }
 let s=C.initial();s.now=110;assert.equal(C.eligibility(s,'repair'),null);s.now=111;assert.match(C.eligibility(s,'repair'),/stale/);s=C.initial();s.authorizationLeases[1].expiresAt=100;assert.match(C.eligibility(s,'repair'),/expired/);
});
test('eligibility is rechecked at execution after grant',()=>{
 for(const change of [s=>s.agents[0].heartbeatAt=89,s=>s.agents[0].expiresAt=100,s=>s.authorizationLeases[0].expiresAt=100,s=>s.agents[0].contract.halt=false]){let s=run(C.initial(),{type:'queue'},{type:'resolve'});change(s);s=run(s,{type:'execute'});assert.equal(s.actionReports.length,0);assert.match(s.executionResult,/Blocked:/);}
});
test('existing lease of another batch blocks conflicting allocation',()=>{
 let s=run(C.initial(),{type:'queue'},{type:'resolve'});s.batchSequence++;s.batchId='batch-'+s.batchSequence;s=run(s,{type:'announce',agentId:'repair'},{type:'resolve'});assert.match(decision(s).reason,/already leased/);assert.equal(s.resourceLeases.filter(l=>l.status==='active').length,1);
});
test('GOV-03 halt cancels pending and issued work, retains reports, persists and guards all mutations',()=>{
 for(const granted of [false,true]){let s=run(C.initial(),{type:'queue'},{type:'resolve'},{type:'execute'},{type:'clear'},{type:'queue'});if(granted)s=run(s,{type:'resolve'});s=run(s,{type:'halt'});assert.equal(s.intents.filter(i=>['pending','granted'].includes(i.status)).length,0);assert.equal(s.resourceLeases.filter(l=>l.status==='active').length,0);assert.deepEqual(s.haltAcknowledgements.map(a=>a.agentId),['repair','sensor']);assert.equal(s.actionReports.length,1);const stopped=C.restore(JSON.stringify(s));s=run(stopped,{type:'execute'},{type:'announce'});assert.equal(s.executionResult,'Blocked: operator halt is active.');assert.equal(s.intentResult,'Rejected: operator halt is active.');assert.equal(s.actionReports.length,1);for(const type of ['queue','resolve','clear','repair','scenario','promotion','condition','advance'])assert.throws(()=>C.transition(s,{type}),/halt/);assert.deepEqual(C.transition(s,{type:'halt'}),s);}
 let s=run(C.initial(),{type:'scenario',value:'missing'},{type:'repair'},{type:'halt'});assert.equal(s.haltAcknowledgements.length,3);
});
test('restore rejects corrupt schema, references, duplicate ownership and completed count',()=>{
 const valid=run(C.initial(),{type:'queue'},{type:'resolve'});assert.deepEqual(C.restore(JSON.stringify(valid)),valid);
 for(const corrupt of [s=>s.schemaVersion=2,s=>s.condition='unknown',s=>s.resourceLeases.push({...s.resourceLeases[0],id:'other-lease'}),s=>s.resourceLeases[0].intentId='missing',s=>s.intents[0].status='completed',s=>s.agents.push(s.agents[0])]){const s=JSON.parse(JSON.stringify(valid));corrupt(s);assert.throws(()=>C.restore(JSON.stringify(s)),/Invalid local/);}
});
