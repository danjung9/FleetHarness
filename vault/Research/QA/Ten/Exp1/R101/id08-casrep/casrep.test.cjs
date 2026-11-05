'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const ctx={};vm.createContext(ctx);vm.runInContext(html.split('// CORE_START')[1].split('// CORE_END')[0],ctx);
const C=ctx.CasrepCore,plain=x=>JSON.parse(JSON.stringify(x));
const start=()=>C.apply(C.empty(),'load');
const go=(s,a,role='originator',p={})=>C.apply(s,a,{role,...p});
function release(s){s=go(s,'submit');for(const r of ['division','department','cheng','xo'])s=go(s,'approve',r);return go(s,'release','co',{confirm:true});}
function edit(s,patch){s=go(s,'buffer','originator',{value:{...C.value(s),...patch}});return go(s,'save');}
function memory(){const map=new Map;return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('required fields, exact recovery errors, enum, UTC, linked reports and boundaries',()=>{
 const v=C.sample();for(const key of ['ship','serial','casualty','equipment','impact','action','jsn','restoration'])assert.throws(()=>C.validate({...v,[key]:'  '}));
 assert.throws(()=>C.validate({...v,casualty:''}),/Enter a casualty description\./);
 for(const patch of [{category:'1'},{type:'OTHER'},{casualtyAt:'2026-02-30T09:00:00Z'},{restoration:'tomorrow'}])assert.throws(()=>C.validate({...v,...patch}));
 for(const category of ['2','3','4'])assert.equal(C.validate({...v,category,restoration:'UNKNOWN'}).category,category);
 for(const type of ['UPDATE','CORRECT','CASCOR']){assert.throws(()=>C.validate({...v,type}),new RegExp(type+' requires a related synthetic report'));const x={...v,type,related:'SYN-CASREP-0000',restoredAt:'2026-11-05T18:00:00Z',closure:'Fictional closure.'};assert.equal(C.validate(x).type,type);}
 assert.throws(()=>C.validate({...v,type:'CASCOR',related:'SYN-CASREP-0000'}),/CASCOR requires a restoration time and closure narrative/);
 assert.equal(C.validate({...v,casualty:'x'.repeat(2000)}).casualty.length,2000);assert.throws(()=>C.validate({...v,casualty:'x'.repeat(2001)}));
});
test('full return, revise, six-role approval and immutable release journey',()=>{
 let s=go(start(),'submit');s=go(s,'comment','division',{text:'Check cooling impact.'});assert.equal(s.comments[0].revisionId,C.revision(s).id);
 assert.throws(()=>go(s,'return','division',{reason:''}),/Enter a reason/);
 s=go(s,'return','division',{reason:'Specify the affected cooling loop'});assert.equal(C.record(s).status,'Returned for revision');
 s=edit(s,{casualty:'CHWP-2 failed. Auxiliary cooling loop B.'});s=release(s);
 assert.equal(C.record(s).status,'Simulated release — not transmitted');assert.deepEqual(plain(C.record(s).active.map(d=>d.role)),plain(C.roles));
 const snapshot=JSON.stringify(s.releases[0]);assert.match(s.releases[0].message,/Auxiliary cooling loop B/);assert.equal(s.releases[0].revisionId,C.revision(s).id);assert.equal(s.releases[0].digest,C.digest(s.releases[0].content));
 assert.equal(s.audit.filter(a=>a.action==='returned').length,1);assert.equal(s.comments.length,1);
 assert.throws(()=>go(s,'release','co',{confirm:true}),/immutable/);assert.throws(()=>edit(s,{impact:'changed'}),/immutable/);assert.equal(JSON.stringify(s.releases[0]),snapshot);
});
test('role guards, dirty decisions, stale approvals, comments and release confirmation',()=>{
 let s=go(start(),'submit');assert.throws(()=>go(s,'release','co',{confirm:true}),/current holder is Division Officer/);assert.throws(()=>go(s,'approve','xo'),/Only the current holder/);
 s=go(s,'approve','division');const old=C.record(s).active[0].revisionId;
 s=go(s,'buffer','originator',{value:{...C.value(s),casualty:'Changed fictional casualty.'}});assert.throws(()=>go(s,'approve','department'),/Save or discard unsaved changes/);assert.throws(()=>go(s,'save','department'),/Only Sailor/);
 s=go(s,'save');assert.equal(C.record(s).active.length,0);assert.equal(C.record(s).holder,0);assert.equal(s.decisions.length,2);assert.notEqual(C.revision(s).id,old);
 s=go(s,'submit');const decisions=JSON.stringify(C.record(s).active);s=go(s,'comment','co',{text:'Unicode fictional note ⚓ <script>literal</script>'});assert.equal(JSON.stringify(C.record(s).active),decisions);
 for(const role of ['division','department','cheng','xo'])s=go(s,'approve',role);assert.throws(()=>go(s,'release','co'),/Confirm synthetic CO release/);
 const tampered=plain(s);tampered.records[0].active[0].digest='wrong';assert.throws(()=>go(tampered,'release','co',{confirm:true}),/Fresh sequential approvals/);
 s=go(s,'release','co',{confirm:true});assert.equal(C.record(s).active.length,6);
});
test('branch values survive reconciliation and reload; both reviewed parents retained',()=>{
 let s=go(start(),'submit');s=go(s,'simulate');const parents=[...C.record(s).heads];assert.equal(parents.length,2);
 assert.throws(()=>go(s,'release','co',{confirm:true}),/resolve competing amendments/);
 assert.throws(()=>go(s,'resolve','division',{restoration:'2026-11-05T20:00:00Z',action:'chosen'}),/Sailor/);
 s=go(s,'resolve','originator',{restoration:'2026-11-05T20:00:00Z',action:'Standby pump online; request fictional seal kit.'});assert.deepEqual(plain(C.revision(s).parents),plain(parents));assert.equal(C.record(s).holder,0);assert.equal(C.record(s).active.length,0);
 const store=memory(),repo=new C.Repository(store);repo.write(s);s=new C.Repository(store).state;assert.equal(C.record(s).resolved,true);assert.equal(s.revisions.filter(x=>parents.includes(x.id)).length,2);
 s=release(s);assert.match(s.releases[0].message,/20:00:00Z/);assert.match(s.releases[0].message,/fictional seal kit/);assert.equal(C.record(s).branches.length,2);
});
test('reconciliation union is idempotent, order independent and preserves delete conflict',()=>{
 const base={id:'root',recordId:'r',parents:[],actor:'Example',value:'base'};
 const a={...base,id:'a',parents:['root'],value:'edit'},b={...base,id:'b',parents:['root'],value:null};
 const one=C.merge([base,a],[base,b]);assert.deepEqual(plain(one),plain(C.merge([base,b],[base,a])));assert.deepEqual(plain(C.merge(one,one)),plain(one));assert.equal(one.length,3);assert.equal(one.find(x=>x.id==='b').value,null);
 const before=JSON.stringify(one);assert.throws(()=>C.merge(one,[{...a,value:'collision'}]),/collision/);assert.throws(()=>C.merge([a],[]),/Missing history/);assert.throws(()=>C.merge([base,{...a,recordId:'other'}],[]),/Cross-record/);assert.throws(()=>C.merge([{...base,parents:['a']},a],[]),/cycle/);assert.equal(JSON.stringify(one),before);
});
test('atomic repository failure leaves committed state unchanged and buffer recoverable',()=>{
 const store=memory(),repo=new C.Repository(store);repo.run('load');const committed=JSON.stringify(repo.state);const oldSet=store.setItem;store.setItem=()=>{throw Error('Quota exceeded')};assert.throws(()=>repo.run('submit',{role:'originator'}),/Quota/);assert.equal(JSON.stringify(repo.state),committed);
 store.setItem=oldSet;repo.run('buffer',{value:{...C.value(repo.state),casualty:'Unfinished assessment.'}});const reload=new C.Repository(store);assert.equal(reload.state.buffer.casualty,'Unfinished assessment.');assert.notEqual(C.canonical(reload.state.buffer),C.canonical(C.value(reload.state)));assert.throws(()=>reload.run('submit',{role:'originator'}),/unsaved changes/);
 reload.run('save',{role:'originator'});assert.equal(C.value(new C.Repository(store).state).casualty,'Unfinished assessment.');
});
test('corrupted or unsupported storage is quarantined without overwrite',()=>{
 for(const raw of ['{bad','{"schemaVersion":9}', '{"schemaVersion":1}']){let writes=0;const storage={getItem:()=>raw,setItem:()=>writes++},repo=new C.Repository(storage);assert.equal(repo.quarantined,true);assert.throws(()=>repo.run('load'));assert.equal(writes,0);}
 const repo=new C.Repository({getItem(){throw Error('Storage denied')},setItem(){throw Error('denied')}});assert.equal(repo.quarantined,true);
});
test('linked amendment, cancellation, expiry, supersession and closure preserve release',()=>{
 const original=release(start()),snapshot=JSON.stringify(original.releases[0]);let s=go(original,'amend','co');assert.equal(C.value(s).type,'UPDATE');assert.equal(C.value(s).related,'SYN-CASREP-0001');assert.equal(C.record(s).active.length,0);
 assert.throws(()=>go(s,'cancel','originator',{confirm:false}),/confirmation/);s=go(s,'cancel','originator',{confirm:true});assert.equal(C.record(s).status,'Cancelled draft — history retained');assert.equal(JSON.stringify(s.releases[0]),snapshot);assert.throws(()=>go(s,'submit'),/immutable/);
 s=go(original,'amend');assert.throws(()=>go(s,'expire','originator',{confirm:true,reason:''}),/expiry reason/);s=go(s,'expire','originator',{confirm:true,reason:'Synthetic training ended'});assert.equal(C.record(s).locked,true);
 for(const type of ['CORRECT','CASCOR']){s=go(original,'amend');s=edit(s,{type,restoredAt:'2026-11-05T18:00:00Z',closure:'Fictional pump restored.'});assert.equal(s.records[0].lifecycle,undefined);s=release(s);assert.equal(s.records[0].lifecycle,type==='CORRECT'?'superseded':'closed');assert.equal(JSON.stringify(s.releases[0]),snapshot);}
});
test('unchanged save does not manufacture revision and stop blocks mutations',()=>{
 let s=start();const n=s.revisions.length;s=go(s,'save');assert.equal(s.revisions.length,n);s=go(s,'stop');for(const a of ['load','buffer','save','submit','cancel','simulate','amend'])assert.throws(()=>go(s,a),/stopped/);s=go(s,'resume');assert.equal(C.record(go(s,'submit')).holder,1);
});

test('incomplete version-1 envelopes and dangling selections are quarantined without writes',()=>{
 const incomplete={schemaVersion:1,records:[],revisions:[],audit:[]};
 const missingComments=plain(start());delete missingComments.comments;
 const dangling=plain(start());dangling.selected='missing-record';
 const missingRevision=plain(start());missingRevision.revisions=[];
 for(const fixture of [incomplete,missingComments,dangling,missingRevision]){
  const raw=JSON.stringify(fixture);let writes=0;
  const repo=new C.Repository({getItem:()=>raw,setItem:()=>writes++});
  assert.equal(repo.quarantined,true);assert.equal(repo.state.selected,null);
  assert.throws(()=>repo.run('load'));assert.equal(writes,0);
 }
});

test('replayed routing cannot duplicate approvals or releases; content binding rejects tampering',()=>{
 let s=go(start(),'submit');const before=JSON.stringify(s);
 assert.throws(()=>go(s,'submit'));assert.equal(JSON.stringify(s),before);
 for(const role of ['division','department','cheng','xo'])s=go(s,'approve',role);
 for(const key of ['content','revisionId']){const bad=plain(s);bad.records[0].active[0][key]='stale';assert.throws(()=>go(bad,'release','co',{confirm:true}),/Fresh sequential approvals/);}
 s=go(s,'release','co',{confirm:true});assert.throws(()=>go(s,'release','co',{confirm:true}));assert.equal(s.releases.length,1);assert.equal(s.decisions.length,6);
});
