const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function app(){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{get value(){return this._value||''},set value(v){this._value=String(v)},textContent:'',checked:false,hidden:false,disabled:false,addEventListener(){},replaceChildren(){},focus(){}});return nodes.get(id)};
 let stored;
 const db={transaction(){const tx={objectStore(){return {put(v){queueMicrotask(()=>{stored=structuredClone(v);tx.oncomplete()})}}}};return tx}};
 const ctx=vm.createContext({console,queueMicrotask,setTimeout,crypto:require('node:crypto').webcrypto,document:{getElementById:node,querySelectorAll:()=>[],createElement:()=>({})},indexedDB:{open:()=>({})}});
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))vm.runInContext(match[1],ctx);
 ctx.testDB=db;
 vm.runInContext("db=testDB;locked(false);ready=true;state=C.save(C.initial(),C.sample,'root');render(true)",ctx);
 return {run:code=>vm.runInContext(code,ctx),node,stored:()=>stored};
}
test('actual UI discard during conflict restores local fields and permits resolution',async()=>{
 const a=app();a.run("state=C.merge(C.save(state,{...C.sample,activity:'Pump drill'},'local'),[C.peer(state,'edit')]);setFields({...C.sample,activity:'Unfinished draft'});state.draft=formValue();render()");
 await a.node('discard').onclick();
 assert.equal(a.node('activity').value,'Pump drill');
 assert.equal(a.run('dirty()'),false);
 a.node('resolution-choice').value='local';await a.node('resolve').onclick();
 assert.equal(a.node('conflict-status').textContent,'Conflict resolved: Pump drill');
 assert.equal(a.stored().draft,null);
});
test('actual UI peer merge retains unfinished draft in committed envelope',async()=>{
 const a=app();a.node('activity').value='Unfinished draft';a.run('state.draft=formValue()');
 await a.node('peer-update').onclick();
 assert.equal(a.node('activity').value,'Unfinished draft');
 assert.equal(a.stored().draft.activity,'Unfinished draft');
 assert.equal(a.run('C.saved(state).activity'),'First aid drill');
});
for(const type of ['edit','delete'])test('actual UI '+type+' conflict recovers from route rejection through approval',async()=>{
 const a=app();
 a.run("state=C.save(state,{...C.sample,activity:'Pump drill'},'local');render(true)");
 await a.node(type==='edit'?'peer-concurrent-edit':'peer-concurrent-delete').onclick();
 assert.equal(a.node('local-head').textContent,'Pump drill | 2026-11-01 | 60 minutes | Unit Example');
 assert.equal(a.node('peer-head').textContent,type==='delete'?'Deleted by Peer Example':'First aid drill | 2026-11-01 | 60 minutes | Unit Example');
 await a.node('route').onclick();
 assert.equal(a.node('route-status').textContent,'Resolve the conflict before routing.');
 assert.equal(a.node('resolution-choice').disabled,false);
 assert.equal(a.node('conflict-panel').hidden,false);
 a.node('resolution-choice').value='local';await a.node('resolve').onclick();
 assert.equal(a.node('conflict-status').textContent,'Conflict resolved: Pump drill');
 a.node('review').onclick();a.node('review-confirm').checked=true;
 await a.node('approve').onclick();await a.node('route').onclick();
 assert.equal(a.node('route-status').textContent,'Queued for simulated routing');
 assert.equal(a.stored().review.revisionId,a.stored().routeQueue[0]);
});
