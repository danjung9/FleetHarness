const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const moduleCore=require('./core.cjs');
const inline=fs.readFileSync(__dirname+'/index.html','utf8').match(/<script id="app-core">([\s\S]*?)<\/script>/)[1];
const context=vm.createContext({});vm.runInContext(inline,context);
// JSON round-trip crosses the VM realm; no test-only domain implementation.
for(const [name,C] of [['module',moduleCore],['browser inline',context.Paperless]]){
 const plain=x=>JSON.parse(JSON.stringify(x));
 const corrected=()=>{const p=C.extract(C.sources());p.tasks[1].owner='Supply Reviewer A';return p;};
 const workspace=()=>{const s=C.empty();s.sources=C.sources();s.started=Date.now();s.draft=corrected();C.commit(s,'r1');return s;};
 test(name+': extraction, independent literal answer, duplicate citations and ambiguity',()=>{const p=C.extract(C.sources());assert.equal(C.accuracy(p),27);assert.equal(p.tasks.length,5);assert.equal(p.tasks[1].owner,'');assert.equal(p.citations['TASK-01'].length,2);assert.equal(p.training.event,'Damage-control drill');assert.equal(p.req.quantity,'4');assert.equal(C.accuracy(corrected()),28);assert.equal(p.citations['TRAIN-01'][0].location,'image region 1');});
 test(name+': malformed grammar and unknown images are rejected',()=>{for(const text of ['BOGUS|id=x','REQ|id=x|bad=y','TASK|id=x|action=a|owner=b|due=c|due=d'])assert.throws(()=>C.parse(text));const src=C.sources();src[0].imageFixture='other';assert.throws(()=>C.extract(src),/Unrecognized image/);const conflict=C.sources();conflict.find(x=>x.id==='THU-REMINDER').text=conflict.find(x=>x.id==='THU-REMINDER').text.replace('Inspect locker','Other action');assert.throws(()=>C.extract(conflict),/Conflicting duplicate/);});
 test(name+': five seeded findings and boundary validation',()=>{assert.deepEqual(plain(C.validate(C.seed(corrected()))),['training date','requisition quantity','correspondence subject','task owner','filing class']);assert.deepEqual(plain(C.validate(corrected())),[]);for(const q of ['0','-1','1.2',' 4','4x']){const p=corrected();p.req.quantity=q;assert.ok(C.validate(p).includes('requisition quantity'));}assert.equal(C.date('2026-02-30'),false);assert.equal(C.date('2024-02-29'),true);const p=corrected();p.corr.subject=' ';p.tasks[0].owner='unknown';assert.equal(C.validate(p).length,2);});
 test(name+': all named outputs and eight source-linked filing rows',()=>{const out=C.outputs(corrected());assert.deepEqual(Object.keys(out),['Training log','Supply requisition document','Routine correspondence package','Verified action list','Draft status updates','Records filing manifest']);assert.equal(out['Training log'],'Damage-control drill | 2026-11-02 | 60 minutes | Training Reviewer A');assert.equal(out['Supply requisition document'],'DEMO-0001 | Filter cartridge | 4 EA | Supply Reviewer A');assert.equal(out['Records filing manifest'].length,8);assert.ok(out['Records filing manifest'].every(x=>x.sources.length&&x.retention==='Demo review only; no disposition authorized'));assert.equal(out['Draft status updates'],'Draft: 0/5 actions complete; 5 awaiting role confirmation.');});
 test(name+': approval binds saved revision, validation cannot be bypassed, routing idempotent',()=>{const s=workspace();assert.match(C.block(s),/review the current/);s.approval=s.rev;assert.match(C.route(s),/^Routed locally/);C.route(s);assert.equal(s.receipts.length,1);assert.equal(s.audit.filter(x=>x.action==='Route locally').length,1);s.draft.corr.subject='Changed';assert.match(C.block(s),/unsaved/);C.commit(s,'r2');assert.match(C.block(s),/review the current/);s.approval=s.rev;s.draft=C.seed(s.draft);C.commit(s,'r3');s.approval=s.rev;assert.match(C.route(s),/fix 5 validation/);assert.ok(s.audit.every(x=>x.actor&&x.timestamp&&x.revision&&x.sourceId));});
 test(name+': merge order, replay, edit/delete and reviewed resolution',()=>{const [r,a,b]=C.lab();const x=C.merge([r,a],[r,b]);assert.deepEqual(plain(x),plain(C.merge([r,b],[r,a])));assert.deepEqual(plain(x),plain(C.merge(x.operations,x.operations)));assert.equal(x.operations.length,3);assert.equal(x.records[0].heads.length,2);assert.ok(x.records[0].heads.some(h=>h.value===null));const resolved=C.merge(x.operations,[{id:'resolution',recordId:'lab',parents:['edit','delete'],actor:'Reviewer',value:'chosen'}]);assert.equal(resolved.conflicts,0);assert.equal(resolved.records[0].value,'chosen');const bothDelete=C.merge([r,{...a,value:null}],[r,b]);assert.equal(bothDelete.conflicts,1);});
 test(name+': invalid histories never mutate input and restore works',()=>{const s=workspace(),original=C.canonical(s);for(const remote of [[{id:'o',recordId:'packet',parents:['missing'],actor:'B',value:null}],[{id:'r1',recordId:'packet',parents:[],actor:'B',value:null}],[{id:'x',recordId:'other',parents:['r1'],actor:'B',value:null}]]){assert.throws(()=>C.merge(s.history,remote));assert.equal(C.canonical(s),original);}assert.throws(()=>C.merge([{id:'a',recordId:'p',parents:['b'],actor:'A',value:null},{id:'b',recordId:'p',parents:['a'],actor:'B',value:null}],[]),/cycle/);});
 test(name+': unsaved edits block simulated delivery and retain queue',()=>{const s=workspace();s.approval=s.rev;C.route(s);s.draft.corr.subject='Unreviewed draft';const before=C.canonical(s);assert.throws(()=>C.sync(s),/Resolve, approve and route/);assert.equal(C.canonical(s),before);});
 test(name+': simulated sync upsert and replay retain one packet receipt',()=>{const s=workspace();s.approval=s.rev;C.route(s);C.sync(s);const before=C.canonical(s);C.sync(s);assert.equal(C.canonical(s),before);assert.equal(s.remoteReceipt.packetId,'demo-packet');assert.equal(s.queue.length,0);assert.deepEqual(plain(s.history),plain(s.remote));});
 test(name+': zero budget, priority, interrupted ack, resume and duplicate ack',()=>{const f=C.transferFixture();assert.equal(C.plan(f,0).usedBytes,0);const plan=C.plan(f,2000);assert.deepEqual(plain(plan.transfers),[{id:'critical',offset:0,bytes:1000},{id:'photo',offset:5000,bytes:1000}]);assert.equal(f[1].uploadedBytes,5000);const acknowledged=C.acknowledge(f,plan.transfers);assert.equal(acknowledged[1].uploadedBytes,6000);assert.deepEqual(plain(C.acknowledge(acknowledged,plan.transfers)),plain(acknowledged));const last=C.acknowledge(acknowledged,C.plan(acknowledged,4000).transfers);assert.equal(last[1].uploadedBytes,10000);assert.throws(()=>C.acknowledge(f,[{id:'photo',offset:6000,bytes:10}]));assert.throws(()=>C.acknowledge(f,[{id:'photo',offset:5000,bytes:6000}]));assert.throws(()=>C.plan(f,-1));const tie=[{...f[0],id:'z',priority:1},{...f[0],id:'a',priority:1}];assert.equal(C.plan(tie,100).transfers[0].id,'a');});
}
test('inline and module functions produce identical domain and reconciliation results',()=>{const a=moduleCore,b=context.Paperless;for(const method of ['sources','lab','transferFixture'])assert.equal(JSON.stringify(a[method]()),JSON.stringify(b[method]()));assert.equal(JSON.stringify(a.outputs(a.extract(a.sources()))),JSON.stringify(b.outputs(b.extract(b.sources()))));assert.equal(JSON.stringify(a.merge(a.lab(),a.lab())),JSON.stringify(b.merge(b.lab(),b.lab())));});

test('every delivered classic browser script parses',()=>{const html=fs.readFileSync(__dirname+'/index.html','utf8');let count=0;for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)){new vm.Script(m[1]);count++;}assert.equal(count,2);});

test('actual UI field reader retains task identity after reviewed deletion',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 const reader=html.match(/function readFields\(\)\{[^\n]+/)[0];
 const draft=moduleCore.extract(moduleCore.sources());draft.tasks=draft.tasks.filter(t=>t.id!=='TASK-01');
 const controls={'filing-class':{value:'TRAIN-DEMO'}};
 for(let n=1;n<=5;n++)for(const k of ['action','owner','due'])controls[`task${n}-${k}`]={value:`task-${n}-${k}`};
 const ctx=vm.createContext({state:{draft},fields:[],$:id=>controls[id]});
 vm.runInContext(reader+';readFields();',ctx);
 assert.equal(draft.tasks[0].id,'TASK-02');assert.equal(draft.tasks[0].action,'task-2-action');
 assert.equal(draft.tasks[3].due,'task-5-due');assert.equal(draft.tasks.length,4);
});

test('actual conflict handlers preserve an unfinished draft',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 for(const id of ['simulate-concurrent','resolve-conflicts']){
  const state=moduleCore.empty();state.draft=moduleCore.extract(moduleCore.sources());moduleCore.commit(state,'r1');state.conflicted=true;state.draft.corr.subject='Unfinished correction';
  const before=moduleCore.canonical(state),messages={};let handler;
  const line=html.split('\n').find(line=>line.startsWith(`on('${id}',`));
  vm.runInNewContext(line,{C:moduleCore,state,on:(_,fn)=>{handler=fn;},msg:(key,value)=>{messages[key]=value;}});handler();
  assert.equal(moduleCore.canonical(state),before);assert.match(Object.values(messages)[0],/Save or discard unsaved changes/);
 }
});
