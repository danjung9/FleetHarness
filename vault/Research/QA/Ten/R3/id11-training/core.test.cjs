const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('./core.cjs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const context=vm.createContext({});
vm.runInContext(html.split('/* APP_CORE_START */')[1].split('/* APP_CORE_END */')[0]+';this.app=createPB4T();',context);
const normalize=x=>JSON.parse(JSON.stringify(x));
for(const [name,C] of [['exported',core],['browser inline',context.app]]){
 test(name+': complete weekly answer key with independent interval and budget evidence',()=>{
 const d=C.fixture(),r=C.solve(d);assert.equal(r.status,'feasible');
 assert.deepEqual(normalize(r.board.map(b=>[b.id,b.person,b.start,b.end,b.resource])),[['ENG-1','Alex',480,540,'Trainer'],['WPN-1','Blair',600,660,'Range'],['CS-1','Casey',600,660,'Trainer'],['DC-1','Blair',3360,3420,'Trainer'],['ENG-2','Alex',4800,4860,'Trainer'],['AIR-1','Casey',6240,6300,'Flight deck']]);
 for(let i=0;i<r.board.length;i++)for(let j=i+1;j<r.board.length;j++){let a=r.board[i],b=r.board[j];if(a.person===b.person||a.resource===b.resource)assert.ok(a.end<=b.start||b.end<=a.start);if(a.person===b.person)assert.ok(Math.max(a.start,b.start)-Math.min(a.end,b.end)>=60);}
 assert.deepEqual(normalize(C.loads(d,r.board).map(l=>l.total)),[180,120,120]);
 assert.equal(r.log.filter(x=>x.decision==='rejected').length,2);
 for(const rule of d.recurrence.rules){const a=r.board.find(b=>b.id===rule.id);assert.ok(a&&a.start>=rule.release&&a.end<=rule.due);}
 assert.equal(d.recurrence.nextEngineering,12060);assert.equal(d.recurrence.priorEngineering,-900);
 });
 test(name+': diagnostics represent actual candidate and policy failures',()=>{
 for(const kind of ['impossible','missing-qualification','unavailable','rest-short','duty-over'])assert.equal(C.solve(C.fixture(kind)).status,'infeasible',kind);
 assert.match(C.solve(C.fixture('missing-qualification')).reason,/Fire Party Leader/);
 assert.equal(C.solve(C.fixture('unavailable')).reason,'WPN-1: no candidate fits personnel availability.');
 assert.match(C.solve(C.fixture('rest-short')).reason,/59 minutes rest/);
 assert.match(C.solve(C.fixture('duty-over')).reason,/181 minutes/);
 assert.equal(C.solve(C.fixture('exact-boundary')).status,'feasible');
 for(const kind of ['missing-policy','missing-occurrence'])assert.equal(C.solve(C.fixture(kind)).status,'invalid');
 const d=C.fixture();d.maxNodes=1;const r=C.solve(d);assert.equal(r.status,'exhausted');assert.equal(r.explored,1);d.maxNodes=5000;assert.equal(C.solve(d).status,'feasible');
 });
 test(name+': saved review boundaries and duration recovery',()=>{
 const s=C.newState('weekly');s.result=C.solve(s.data);s.board=s.result.board;assert.equal(C.accept(s,true),'');assert.equal(s.accepted,true);
 s.dirty=true;s.duration='0';assert.match(C.saveInputs(s),/positive whole/);assert.equal(s.duration,'0');assert.match(C.accept(s,true),/Save or discard/);
 s.duration='45';assert.equal(C.saveInputs(s),'');assert.equal(s.accepted,false);assert.equal(s.result,null);s.result=C.solve(s.data);s.board=s.result.board;assert.equal(C.loads(s.data,s.board)[0].total,150);
 s.pending='Reduce rest';assert.match(C.accept(s,true),/pending policy/);assert.equal(s.data.people[0].minRestMinutes,60);s.pending='';assert.equal(C.accept(s,true),'');
 const restored=JSON.parse(JSON.stringify(s));assert.equal(C.accept(restored,true),'');
 });
 test(name+': edits, resource adjacency, due edges and malformed inventory',()=>{
 let d=C.fixture(),r=C.solve(d);r.board[1]=C.assignment(d.occurrences[1],d.occurrences[1].alternatives[0]);assert.match(C.violations(d,r.board,true).issues[0],/ENG-1 and WPN-1 overlap/);r.board[1]=C.assignment(d.occurrences[1],d.occurrences[1].alternatives[1]);assert.equal(C.violations(d,r.board,true).valid,true);
 d=C.fixture('exact-boundary');assert.equal(C.solve(d).status,'feasible');d.recurrence.rules[1].due=659;assert.equal(C.solve(d).status,'infeasible');
 d=C.fixture();d.occurrences.push(d.occurrences[0]);assert.match(C.validateInput(d),/duplicate/);d=C.fixture();d.occurrences[0].alternatives[0].resource='Unknown';assert.match(C.validateInput(d),/unknown/);
 d=C.fixture('exact-boundary');d.people[0].minRestMinutes=0;d.occurrences[1].alternatives[0].start=540;assert.equal(C.solve(d).status,'feasible');d.people[0].minRestMinutes=1;assert.equal(C.solve(d).status,'infeasible');
 });
}
test('both delivered factories return identical domain results for all supplied scenarios',()=>{
 for(const kind of ['weekly','impossible','missing-qualification','unavailable','exact-boundary','rest-short','duty-over','missing-policy','missing-occurrence'])assert.deepEqual(normalize(core.solve(core.fixture(kind))),normalize(context.app.solve(context.app.fixture(kind))));
});
for(const [name,C] of [['exported',core],['browser inline',context.app]]){
 test(name+': malformed temporal data is invalid and never reviewable',()=>{
 const mutations=[d=>d.priorDuty[0].end=-1020,d=>d.recurrence.rules[0].due='bad',d=>d.occurrences[0].windows=[[600,480]],d=>d.horizon.end=NaN,d=>d.priorDuty[0].person='Unknown',d=>d.people[0].qualifications=null,d=>d.occurrences[0].windows=null];
 for(const mutate of mutations){const d=C.fixture();mutate(d);const before=JSON.stringify(d);assert.equal(C.solve(d).status,'invalid');assert.equal(JSON.stringify(d),before);const s=C.newState('weekly');s.result=C.solve(s.data);s.board=s.result.board;s.data=d;assert.notEqual(C.accept(s,true),'');assert.equal(s.accepted,false);}
 });
 test(name+': prior duty, cross-midnight, horizon and exclusive resources',()=>{
 let d=C.fixture();d.priorDuty=[{person:'Alex',start:420,end:480}];assert.equal(C.solve(d).status,'infeasible');
 d=C.fixture();d.occurrences[2].alternatives[1].resource='Range';assert.equal(C.solve(d).status,'infeasible');
 d=C.fixture();d.resources[0].windows=[[0,480],[540,10080]];assert.equal(C.solve(d).status,'infeasible');
 d=C.fixture();d.operationalWindows=[[0,480],[540,10080]];assert.equal(C.solve(d).status,'infeasible');
 d=C.fixture();d.occurrences[5].alternatives[0].start=10050;assert.equal(C.solve(d).status,'infeasible');
 d=C.fixture();d.occurrences[5].alternatives[0].start=7170;const r=C.solve(d);assert.equal(r.status,'feasible');assert.equal(r.board[5].end,7230);
 d=C.fixture();d.maxNodes=0;assert.equal(C.solve(d).status,'invalid');d.maxNodes=1.5;assert.equal(C.solve(d).status,'invalid');
 });
}
test('actual page startup recovers from malformed storage; handlers optimize and export synthetic content',()=>{
 class Element{constructor(){this.value='';this.children=[];this.checked=false;this.textContent='';}append(e){this.children.push(e);if(!this.value&&e.value)this.value=e.value;}replaceChildren(){this.children=[];}focus(){}click(){this.onclick?.();}}
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 let saved,download;const document={getElementById:get,createElement:()=>new Element()};
 const sandbox=vm.createContext({document,localStorage:{getItem:()=>'{"data":null}',setItem:(k,v)=>{saved=JSON.parse(v);}},Blob:class{constructor(parts){download=JSON.parse(parts.join(''));}},URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL:()=>{}},setTimeout:()=>{}});
 vm.runInContext(html.split('<script>')[1].split('</script>')[0],sandbox);
 assert.match(get('storage-error').textContent,/load a synthetic scenario/);
 get('scenario').value='weekly';get('load-scenario').click();get('optimize').click();
 assert.equal(get('solve-status').textContent,'Feasible — 6 of 6 required occurrences scheduled.');assert.equal(saved.board.length,6);
 get('export').click();assert.match(download.disclosure,/synthetic, not validated against the real format/);assert.deepEqual(download.loads.map(l=>l.total),[180,120,120]);assert.equal(download.occurrenceCoverage.length,6);assert.equal(download.accepted,false);
 get('eng-duration').value='45';get('max-nodes').value='5000';get('eng-duration').oninput();get('export').click();assert.match(get('review-error').textContent,/Save or discard/);
});

test('actual page constraint recovery handlers satisfy all frozen literal outcomes (DOM shim only)',()=>{
 class Element{constructor(){this.value='';this.children=[];this.checked=false;this.textContent='';}append(e){this.children.push(e);if(!this.value&&e.value)this.value=e.value;}replaceChildren(){this.children=[];}focus(){}click(){this.onclick?.();}}
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 const sandbox=vm.createContext({document:{getElementById:get,createElement:()=>new Element()},localStorage:{getItem:()=>null,setItem:()=>{}}});
 vm.runInContext(html.split('<script>')[1].split('</script>')[0],sandbox);
 const journey=JSON.parse(fs.readFileSync(__dirname+'/acceptance-plan.json','utf8')).journeys.find(j=>j.id==='constraint-recovery');
 for(const [i,step] of journey.steps.entries()){
  const el=get(step.selector.slice(1));
  if(step.action==='select')el.value=step.value;
  else if(step.action==='click')el.click();
  else if(step.action==='expectText')assert.equal(el.textContent,step.text,'frozen constraint-recovery step '+(i+1));
  else assert.fail('Unsupported step '+step.action);
 }
});
