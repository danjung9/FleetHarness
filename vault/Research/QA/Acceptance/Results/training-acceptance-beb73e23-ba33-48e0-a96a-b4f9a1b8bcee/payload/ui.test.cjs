// Execute the actual delivered UI listeners with a minimal DOM adapter.
// This tests wiring and recovery, not browser rendering or browser API behavior.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const C=require('./core.cjs');
function app(initial={},storageFails=false){
 const nodes=new Map(),saved=new Map(Object.entries(initial)),downloads=[];
 class Element{
  constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.listeners={};this.children=[];}
  set value(v){this._value=String(v);}
  get value(){return this._value;}
  set innerHTML(html){for(const m of html.matchAll(/id="([^"]+)"/g))get(m[1]);}
  setAttribute(k,v){this[k]=v;}
  addEventListener(k,fn){this.listeners[k]=fn;}
  replaceChildren(){this.children=[];}
  append(...children){this.children.push(...children);for(const c of children)if(c.id)nodes.set(c.id,c);}
  focus(){this.focused=true;}
  click(){if(!this.disabled)this.onclick?.();}
 }
 function get(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);}
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 for(const m of html.matchAll(/id="([^"]+)"/g))get(m[1]);
 const context={TextEncoder,Blob,URL:{createObjectURL(b){downloads.push(b);return 'blob:test';},revokeObjectURL(){}},setTimeout:fn=>fn(),document:{getElementById:get,createElement:()=>new Element()},localStorage:{getItem:k=>saved.get(k)||null,setItem(k,v){if(storageFails)throw Error('storage denied');saved.set(k,v);}}};
 vm.createContext(context);for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],context);
 return {get,saved,downloads,click:id=>get(id).click(),edit(id,value){get(id).value=value;get(id).listeners.input();get(id).listeners.change?.();}};
}
test('actual UI imports and restores infeasible/exhausted snapshots without missing diagnostic crashes',()=>{
 for(const status of ['infeasible','budget_exhausted']){
  const x=C.sample();if(status==='infeasible')x.requests[1].starts=[0];else x.maxNodes=1;
  const snapshot=C.serializeSnapshot(x,C.solveDraft(x));
  const a=app();a.click('generate');a.get('import-text').value=snapshot;a.click('stage-import');a.click('confirm-import');
  assert.match(a.get('status').textContent,status==='infeasible'?/^Infeasible/:/^Search limit reached/);
  assert.equal(a.get('mark-reviewed').disabled,true);assert.equal(a.get('save-portable').disabled,false);
  a.click('save-portable');assert.equal(a.downloads.length,1);
  const restored=app({'training-saved-v1':snapshot});assert.equal(restored.get('status').textContent,a.get('status').textContent);
  assert.equal(restored.get('mark-reviewed').disabled,true);
 }
});
test('actual UI clears review on every input category and recomputes current duration',()=>{
 for(const [id,value] of [['duration-D','30'],['starts-B','120'],['operating-windows','0-230;1440-1680'],['qualifications-P01','Q-A,Q-X'],['availability-P01','0-230;1440-1680'],['budget-P01','121'],['rest-P01','29'],['max-nodes','50001']]){
  const a=app();a.click('generate');a.click('mark-reviewed');assert.match(a.get('review-status').textContent,/^Reviewed/);a.edit(id,value);assert.match(a.get('review-status').textContent,/^Not reviewed/);assert.match(a.get('status').textContent,/^Feasible/);
  if(id==='duration-D'){assert.equal(a.get('result-D').textContent,'D | 1440–1470 | P02 | Room-2');assert.match(a.get('load-P02').textContent,/90 \/ 120/);}
 }
});
test('actual UI invalid text survives recovery and corrections preserve all requests',()=>{
 const a=app();a.click('generate');a.edit('duration-B','');assert.match(a.get('status').textContent,/^Invalid input/);assert.equal(a.get('duration-B').value,'');assert.equal(a.get('mark-reviewed').disabled,true);
 const b=app(Object.fromEntries(a.saved));assert.equal(b.get('duration-B').value,'');assert.match(b.get('status').textContent,/^Invalid input/);b.edit('duration-B','60');assert.match(b.get('status').textContent,/^Feasible/);
});
test('actual UI invalidates staged comparisons on edits; failed import and cancel preserve reviewed work',()=>{
 const a=app();a.click('generate');a.click('mark-reviewed');a.get('import-text').value='{broken';a.click('stage-import');assert.match(a.get('import-status').textContent,/^Import failed/);assert.match(a.get('review-status').textContent,/^Reviewed/);
 a.get('import-text').value=C.serializeSnapshot(C.sample(),C.solveDraft(C.sample()));a.click('stage-import');a.click('cancel-import');assert.match(a.get('review-status').textContent,/^Reviewed/);
 a.click('stage-import');a.edit('duration-D','30');assert.equal(a.get('preview').hidden,true);a.click('confirm-import');assert.equal(a.get('duration-D').value,'30');
});
test('actual UI storage failure still initiates portable download and discloses recovery limit',()=>{
 const a=app({},true);a.click('generate');a.click('save-portable');assert.equal(a.downloads.length,1);assert.equal(a.get('save-status').textContent,'Downloaded only — browser storage unavailable. Keep the portable file.');
});
