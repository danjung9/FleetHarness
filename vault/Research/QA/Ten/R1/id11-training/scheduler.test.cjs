'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('./scheduler-core.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
const model=()=>C.sample();
const valid=m=>assert.equal(C.validateInputs(m).length,0);
const feasible=m=>{const r=C.findSchedule(m);assert.equal(r.status,'feasible');assert.equal(C.auditSchedule(m,r.assignments).ok,true);return r;};

test('N1: actual application resolves the planned collision with exact literal times and loads',()=>{
 const m=model();valid(m);assert.deepEqual(plain(C.compareProposals(m)),{personnel:1,resources:1});
 const r=feasible(m);assert.deepEqual(plain(r.assignments.map(a=>[a.id,a.start,a.end])),[['dc',540,600],['eng',630,690]]);
 const a=C.auditSchedule(m,r.assignments);assert.equal(a.personnelOverlaps,0);assert.equal(a.resourceOverlaps,0);assert.equal(a.violations.length,0);
 assert.deepEqual(plain(a.loads.map(l=>[l.id,l.minutes,l.minGap])),[['alex',120,30],['bea',0,null]]);
});
test('N2: independently audit all pairs, resource-only collisions, unknowns and incomplete coverage',()=>{
 const m=model(),good=feasible(m).assignments;
 const bad=C.copy(good);bad[1].start=540;bad[1].end=600;const audit=C.auditSchedule(m,bad);assert.equal(audit.ok,false);assert.equal(audit.personnelOverlaps,1);assert.equal(audit.resourceOverlaps,1);
 assert.equal(C.auditSchedule(m,[good[0]]).ok,false);assert.equal(C.auditSchedule(m,[good[0],good[0]]).ok,false);
 for(const change of [a=>a.start++,a=>a.end++,a=>a.people=['bea'],a=>a.resources=[],a=>a.id='unknown']){const x=C.copy(good);change(x[0]);assert.equal(C.auditSchedule(m,x).ok,false);}
 m.requests[1].people=['bea'];m.requests[1].qualifications=['TAO'];m.requests[1].candidates=[540];assert.equal(C.findSchedule(m).status,'infeasible');
 m.requests[1].resources=[];feasible(m);
});
test('N3: qualification union, assigned-person availability and operating windows',()=>{
 let m=model();m.people[0].qualifications=['EOOW'];let r=C.findSchedule(m);assert.equal(r.status,'infeasible');assert.equal(r.detail,'Engineering requires FPL; assigned personnel do not hold FPL.');
 m.people[0].qualifications.push('FPL');feasible(m);m.people[0].availability=[[540,600]];r=C.findSchedule(m);assert.equal(r.status,'infeasible');assert.equal(r.detail,'Alex is unavailable for Engineering at every supplied candidate.');
 m.people[0].availability=[[540,1020]];feasible(m);m.operatingWindows=[[540,600]];assert.equal(C.findSchedule(m).status,'infeasible');
 m=model();m.operatingWindows=[[540,570],[570,1020]];assert.equal(C.findSchedule(m).status,'infeasible'); // no silent window merging
 m=model();m.requests[1].people=['alex','bea'];m.requests[1].qualifications=['EOOW','TAO'];feasible(m);
});
test('N4: minimum-rest and weekly-duty boundaries, zero values and back-to-back',()=>{
 let m=model();m.people[0].minRestMinutes=31;let r=C.findSchedule(m);assert.equal(r.status,'infeasible');assert.equal(r.detail,'No supplied allocation gives Alex 31 minutes of rest.');
 m.people[0].minRestMinutes=30;m.people[0].maxMinutes=119;r=C.findSchedule(m);assert.equal(r.status,'infeasible');assert.equal(r.detail,'Alex requires 120 duty minutes; budget is 119.');
 m.people[0].maxMinutes=120;feasible(m);m.people[0].maxMinutes=121;feasible(m);
 m.requests[1].candidates=[600];assert.equal(C.findSchedule(m).status,'infeasible');m.people[0].minRestMinutes=0;feasible(m);
 m.people[0].maxMinutes=0;assert.equal(C.findSchedule(m).status,'infeasible');m.people[0].maxMinutes=120;m.people[1].maxMinutes=0;feasible(m);
});
test('N5: impossible set and exhaustion differ; budget counts attempted candidate placements',()=>{
 const m=model();m.maxNodes=1;let r=C.findSchedule(m);assert.equal(r.status,'budget_exhausted');assert.equal(r.nodesVisited,1);assert.equal(r.assignments.length,0);
 m.maxNodes=2;r=C.findSchedule(m);assert.equal(r.status,'budget_exhausted');m.maxNodes=3;assert.equal(feasible(m).nodesVisited,3);
 m.requests[1].candidates=[540];m.maxNodes=1000;r=C.findSchedule(m);assert.equal(r.status,'infeasible');assert.equal(r.assignments.length,0);assert.equal(r.nodesVisited,2);
 m.maxNodes=1;assert.equal(C.findSchedule(m).status,'budget_exhausted');
});
test('N6: prior commitments consume duty and enforce rest, personnel/resource collisions and availability',()=>{
 const m=model();m.priorCommitments=[{id:'prior',start:720,end:750,people:['alex'],resources:['room-a']}];assert.equal(C.findSchedule(m).status,'infeasible');m.people[0].maxMinutes=150;feasible(m);
 m.priorCommitments[0].start=719;assert.equal(C.findSchedule(m).status,'infeasible');
 m.priorCommitments[0]={id:'prior',start:540,end:600,people:['bea'],resources:['room-a']};assert.equal(C.findSchedule(m).status,'infeasible');
 m.priorCommitments[0]={id:'prior',start:800,end:830,people:['bea'],resources:[]};feasible(m);
 m.people[1].availability=[[540,800]];assert.equal(C.findSchedule(m).status,'infeasible');
});
test('N7: alternate exact personnel assignment recovers a collision without changing constraints',()=>{
 const m=model();m.requests[1].candidates=[540];assert.equal(C.findSchedule(m).status,'infeasible');m.requests[1].people=['bea'];m.people[1].qualifications.push('FPL');m.requests[1].resources=[];feasible(m);
});
test('N8: independent audit catches third-to-first conflicts and prior duty excess',()=>{
 const m=model();m.people[0].maxMinutes=180;m.requests.push({...C.copy(m.requests[0]),id:'third',title:'Third',candidates:[560],originalStart:560});
 const as=m.requests.map(r=>({id:r.id,start:r.candidates.at(-1),end:r.candidates.at(-1)+r.duration,people:r.people,resources:r.resources}));
 assert.equal(C.auditSchedule(m,as).ok,false);assert.ok(C.auditSchedule(m,as).personnelOverlaps>0);
 const base=model(),r=feasible(base);base.priorCommitments=[{id:'prior',start:800,end:830,people:['alex'],resources:[]}];assert.equal(C.auditSchedule(base,r.assignments).ok,false);
});
test('N9: actual revision transitions, dirty guard, unchanged save, failed solve, history and fresh review',()=>{
 const s=C.loadSample();C.solve(s);assert.notEqual(C.accept(s),'');s.reviewAcknowledged=true;assert.equal(C.accept(s),'');assert.equal(s.lastAcceptedProposal.revision,1);
 C.save(s);assert.equal(s.revision,1);const draft=C.copy(s.draft);draft.requests[1].candidates=[540];C.edit(s,draft);assert.equal(C.accept(s),'Save or discard unsaved changes before review.');assert.ok(C.solve(s).errors);
 C.discard(s);assert.equal(s.dirty,false);assert.equal(s.currentProposal.revision,1);
 C.edit(s,draft);C.save(s);assert.equal(s.revision,2);assert.equal(s.currentProposal,null);assert.equal(s.reviewAcknowledged,false);assert.equal(s.lastAcceptedProposal.revision,1);assert.equal(C.solve(s).status,'infeasible');assert.equal(C.accept(s),'No current proposal to review.');
 const fixed=C.copy(s.draft);fixed.requests[1].candidates=[540,630];C.edit(s,fixed);C.save(s);C.solve(s);s.reviewAcknowledged=true;assert.equal(C.accept(s),'');assert.equal(s.lastAcceptedProposal.revision,3);
 const restored=C.restore(JSON.stringify(s));assert.equal(restored.revision,3);assert.equal(restored.lastAcceptedProposal.revision,3);
 restored.draft.requests[1].duration=0;restored.dirty=true;const previous=JSON.stringify(restored.committedInputs);assert.ok(C.save(restored).errors);assert.equal(JSON.stringify(restored.committedInputs),previous);
});
test('N10/N11: validation limits and malformed models remain invalid, not infeasible',()=>{
 const mutations=[m=>m.requests[1].duration=0,m=>m.requests[0].duration=481,m=>m.requests[0].duration='60',m=>m.requests[0].duration=NaN,m=>m.requests[0].candidates=[540.5],m=>m.requests[0].candidates=[-1],m=>m.requests[0].candidates=[10070],m=>m.requests[0].candidates=[540,540],m=>m.requests=[],m=>m.people=[],m=>m.requests[1].id='dc',m=>m.people[1].id='alex',m=>m.operatingWindows=[[600,540]],m=>m.operatingWindows=[[540,10081]],m=>m.people[0].minRestMinutes=-1,m=>m.people[0].maxMinutes='120',m=>m.requests[0].people=[],m=>m.requests[0].people=['unknown'],m=>m.requests[0].resources=['unknown'],m=>m.requests[0].qualifications=[],m=>m.resources[0].capacity=2,m=>m.resources[0].availability=[[540,600]],m=>m.maxNodes=0,m=>m.maxNodes=200001,m=>m.rollingPolicy={},m=>m.requests[0].candidates=Array.from({length:21},(_,i)=>540+i),m=>m.requests=Array.from({length:13},(_,i)=>({...m.requests[0],id:'r'+i}))];
 for(const mutate of mutations){const m=model();mutate(m);assert.ok(C.validateInputs(m).length,mutate.toString());assert.ok(C.findSchedule(m).errors);}
 const m=model();m.maxNodes=200000;m.requests=Array.from({length:12},(_,i)=>({...m.requests[0],id:'r'+i,candidates:Array.from({length:20},(_,j)=>540+j)}));m.people=Array.from({length:50},(_,i)=>({...m.people[0],id:i?'p'+i:'alex'}));valid(m);
});
test('N11: storage rejects corrupt, stale or forged acceptance and preserves invalid drafts separately',()=>{
 assert.throws(()=>C.restore('{'));assert.throws(()=>C.restore('{"schemaVersion":4}'));
 const s=C.loadSample();C.solve(s);s.reviewAcknowledged=true;C.accept(s);
 let x=C.copy(s);x.currentProposal.result.assignments[0].end=999;assert.throws(()=>C.restore(JSON.stringify(x)));
 x=C.copy(s);x.lastAcceptedProposal.revision=5;assert.throws(()=>C.restore(JSON.stringify(x)));
 x=C.copy(s);x.committedInputs.people[0].maxMinutes=0;assert.throws(()=>C.restore(JSON.stringify(x)));
 x=C.copy(s);x.draft.requests[0].duration=0;x.rawFields={'dc-duration':'invalid draft'};x.dirty=true;const restored=C.restore(JSON.stringify(x));assert.equal(restored.dirty,true);assert.equal(restored.draft.requests[0].duration,0);assert.equal(restored.committedInputs.requests[0].duration,60);assert.equal(restored.rawFields['dc-duration'],'invalid draft');
});
test('supplemental exact window endpoints, 1-minute shortfalls and prior-rest boundaries',()=>{
 let m=model();m.people[0].availability=[[540,690]];m.operatingWindows=[[540,690]];feasible(m);
 m.people[0].availability=[[540,689]];assert.equal(C.findSchedule(m).status,'infeasible');m=model();m.operatingWindows=[[541,1020]];assert.equal(C.findSchedule(m).status,'infeasible');
 m=model();m.people[0].minRestMinutes=0;m.requests[1].candidates=[599];assert.equal(C.findSchedule(m).status,'infeasible');m.requests[1].candidates=[600];feasible(m);
 m=model();m.operatingWindows=[[480,1020]];m.people[0].availability=[[480,1020]];m.people[0].maxMinutes=150;m.priorCommitments=[{id:'prior',start:480,end:510,people:['alex'],resources:[]}];feasible(m);m.priorCommitments[0].end=511;m.people[0].maxMinutes=151;assert.equal(C.findSchedule(m).status,'infeasible');
 m=model();m.people[1].qualifications.push('FPL');m.people[0].qualifications=['EOOW'];assert.equal(C.findSchedule(m).status,'infeasible');
 m=model();m.resources=[null];assert.ok(C.validateInputs(m).length);m=model();const r=feasible(m);assert.equal(C.auditSchedule(m,[null,...r.assignments]).ok,false);
});

// Exhaustive test oracle deliberately does not call the application's audit,
// availability, overlap, loading or search helpers.
function independentValid(m, rows) {
 const all=[...m.priorCommitments,...rows];
 for(const a of all){
  if(!m.operatingWindows.some(([s,e])=>s<=a.start&&a.end<=e))return false;
  for(const id of a.people){const p=m.people.find(p=>p.id===id);
   if(!p.availability.some(([s,e])=>s<=a.start&&a.end<=e))return false;
  }
 }
 for(const r of m.requests){
  if(!r.qualifications.every(q=>r.people.some(id=>m.people.find(p=>p.id===id).qualifications.includes(q))))return false;
 }
 for(const p of m.people){
  const work=all.filter(a=>a.people.includes(p.id)).sort((a,b)=>a.start-b.start);
  if(work.reduce((sum,a)=>sum+a.end-a.start,0)>p.maxMinutes)return false;
  for(let i=0;i<work.length;i++)for(let j=i+1;j<work.length;j++)
   if(work[j].start-work[i].end<p.minRestMinutes)return false;
 }
 for(const resource of m.resources){
  const work=all.filter(a=>a.resources.includes(resource.id)).sort((a,b)=>a.start-b.start);
  for(let i=1;i<work.length;i++)if(work[i].start<work[i-1].end)return false;
 }
 return true;
}
function exhaustiveAllocations(m) {
 let rows=[[]];
 for(const r of m.requests)rows=rows.flatMap(prefix=>r.candidates.map(start=>[...prefix,{id:r.id,start,end:start+r.duration,people:r.people,resources:r.resources}]));
 return rows.filter(rows=>independentValid(m,rows));
}
test('V1: 216 finite models agree with an independent exhaustive oracle',()=>{
 let count=0,yes=0,no=0;
 for(const rest of [0,30,31])for(const budget of [119,120,121])
 for(const end of [600,689,690])for(const samePerson of [true,false])
 for(const sameRoom of [true,false])for(const qualified of [true,false]){
  const m=model();m.people[0].minRestMinutes=rest;m.people[0].maxMinutes=budget;
  m.people[0].availability=[[540,end]];
  if(!samePerson){m.requests[1].people=['bea'];m.people[1].qualifications=['FPL'];}
  if(!sameRoom)m.requests[1].resources=[];
  if(!qualified){m.people[0].qualifications=['EOOW'];m.people[1].qualifications=[];}
  valid(m);const options=exhaustiveAllocations(m),r=C.findSchedule(m);
  assert.equal(r.status,options.length?'feasible':'infeasible',JSON.stringify({rest,budget,end,samePerson,sameRoom,qualified}));
  if(options.length){yes++;assert.ok(independentValid(m,r.assignments));
   assert.ok(options.some(rows=>JSON.stringify(rows.map(a=>a.start))===JSON.stringify(Array.from(r.assignments,a=>a.start))));
   assert.equal(C.auditSchedule(m,r.assignments).ok,true);
  }else{no++;assert.equal(r.assignments.length,0);}
  count++;
 }
 assert.equal(count,216);assert.ok(yes>0);assert.ok(no>0);
});
test('V2: search must backtrack an earlier request and audit immutable commitment pairs',()=>{
 const m=model();m.requests[0].candidates=[540,630];m.requests[1].candidates=[540];
 const r=feasible(m);assert.deepEqual(plain(r.assignments.map(a=>[a.id,a.start])),[['dc',630],['eng',540]]);
 assert.ok(independentValid(m,r.assignments));assert.equal(r.nodesVisited,4);
 m.people[1].maxMinutes=120;
 m.priorCommitments=[{id:'p1',start:800,end:860,people:['bea'],resources:[]},{id:'p2',start:830,end:890,people:['bea'],resources:[]}];
 assert.equal(exhaustiveAllocations(m).length,0);assert.equal(C.findSchedule(m).status,'infeasible');
 assert.equal(C.auditSchedule(m,r.assignments).ok,false);
 m.priorCommitments[1].start=890;m.priorCommitments[1].end=950;feasible(m);
 m.priorCommitments[1].start=889;m.priorCommitments[1].end=949;
 assert.equal(C.findSchedule(m).status,'infeasible');
});
test('V3: restored unfinished work cannot approve or solve; discard and stale replay guards',()=>{
 const s=C.loadSample();C.solve(s);s.reviewAcknowledged=true;assert.equal(C.accept(s),'');
 const draft=C.copy(s.draft);draft.requests[1].candidates=[540];C.edit(s,draft);
 const restored=C.restore(JSON.stringify(s));
 assert.equal(restored.dirty,true);assert.ok(C.solve(restored).errors);
 assert.equal(C.accept(restored),'Save or discard unsaved changes before review.');
 assert.equal(restored.lastAcceptedProposal.revision,1);
 C.discard(restored);assert.equal(restored.reviewAcknowledged,false);
 assert.notEqual(C.accept(restored),'');restored.reviewAcknowledged=true;assert.equal(C.accept(restored),'');
 const old=C.copy(restored.currentProposal);C.edit(restored,draft);C.save(restored);
 restored.currentProposal=old;assert.equal(C.accept(restored),'No current proposal to review.');
 assert.throws(()=>C.restore(JSON.stringify(restored)));
 const forged=C.copy(s);forged.dirty=false;
 assert.equal(C.restore(JSON.stringify(forged)).dirty,true);
});
