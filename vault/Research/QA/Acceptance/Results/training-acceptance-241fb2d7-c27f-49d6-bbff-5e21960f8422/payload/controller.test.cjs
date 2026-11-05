'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
// Minimal DOM adapter executes the real inline controller. This is not a browser.
function page(){
 class Element {
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.textContent='';this.disabled=false;this.attrs={};}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  async dispatchEvent(e){for(const fn of this.listeners[e.type]||[])await fn(e);}
  remove(){}
 }
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 const ids=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element('div')]));
 const document={getElementById:id=>ids[id],createElement:tag=>new Element(tag),body:new Element('body')};
 const sandbox={document,TextEncoder,Blob,URL,setTimeout,Event:class{constructor(type){this.type=type;}},Option:class extends Element{constructor(label,value){super('option');this.textContent=label;this.value=value;}}};
 vm.createContext(sandbox);
 for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(match[1],sandbox);
 const fire=(el,type)=>el.dispatchEvent({type});
 const control=label=>ids.requests.children.flatMap(row=>row.children.flatMap(td=>td.children)).find(c=>c.attrs['aria-label']===label);
 return {ids,fire,control,C:sandbox.TrainingDraft};
}
test('UI1 real controller default rows, edit commit, invalid text and reset',async()=>{
 const {ids,fire,control}=page();
 assert.equal(ids.requests.children.length,4);assert.equal(ids.statusTitle.textContent,'Feasible draft');
 const d=control('D Minutes');d.value='30';await fire(d,'input');assert.equal(ids.statusTitle.textContent,'Edit pending');assert.equal(ids.save.disabled,true);await fire(d,'change');
 assert.equal(JSON.parse(ids.inputText.value).requests[3].duration,30);
 assert.equal(ids.loading.children[1].children[1].textContent,'90 scheduled minutes');
 ids.inputText.value='{broken';await fire(ids.inputText,'input');assert.equal(ids.statusTitle.textContent,'Invalid input');assert.match(ids.error.textContent,/JSON:/);assert.equal(ids.requests.children.length,4);assert.equal(control('D Minutes').disabled,true);
 await fire(ids.reset,'click');assert.equal(ids.statusTitle.textContent,'Feasible draft');assert.equal(ids.loading.children[1].children[1].textContent,'120 scheduled minutes');
});
test('UI2 real controller review invalidation, manual conflict/recovery and exhausted status',async()=>{
 const {ids,fire,control}=page();ids.reviewer.value='Synthetic verifier';await fire(ids.reviewer,'input');await fire(ids.review,'click');assert.match(ids.reviewStatus.textContent,/Reviewed by/);
 let b=control('B Draft start');b.value='0';await fire(b,'change');assert.equal(ids.statusTitle.textContent,'Infeasible with these choices');assert.equal(ids.review.disabled,true);assert.match(ids.reviewStatus.textContent,/Not reviewed/);
 b=control('B Draft start');b.value='90';await fire(b,'change');assert.equal(ids.statusTitle.textContent,'Feasible draft');
 await fire(ids.review,'click');const d=control('D Minutes');d.value='30';await fire(d,'input');assert.equal(ids.review.disabled,true);assert.match(ids.reviewStatus.textContent,/Pending edit/);await fire(d,'change');assert.match(ids.reviewStatus.textContent,/Not reviewed/);
 ids.budget.value='1';await fire(ids.budget,'change');assert.equal(ids.statusTitle.textContent,'Search limit reached; feasibility unknown');assert.equal(ids.requests.children.length,4);
});
test('UI3 actual import handler retains workspace on rejection and restores exact manual alternate',async()=>{
 const {ids,fire,C}=page();const before=ids.inputText.value;
 ids.importFile.files=[{size:1,text:async()=>'{'}];await fire(ids.importFile,'change');assert.equal(ids.inputText.value,before);assert.match(ids.message.textContent,/Import rejected/);
 const input=C.defaults();input.requests[1].allowedStarts=[90,120];let state=C.fromText(JSON.stringify(input));state=C.selectStart(state,'B',120);state=C.markReviewed(state,'Synthetic verifier');const saved=C.snapshot(state);
 ids.importFile.files=[{size:Buffer.byteLength(saved),text:async()=>saved}];await fire(ids.importFile,'change');assert.equal(ids.inputText.value,state.inputText);assert.match(ids.reviewStatus.textContent,/Fresh review required/);assert.equal(JSON.parse(C.snapshot(C.importSnapshot(saved))).result.assignments[1].start,120);
 assert.match(ids.days.children[0].children.map(e=>e.children?.map(c=>c.textContent).join(' ')).join(' '),/D1 02:00/);
});
