import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

// Execute the delivered UI controller with a minimal DOM and controlled pending IO.
// The backend and browser gates separately establish full workflow semantics.
test('UI locks every editable control until acknowledgement, including failure recovery',async()=>{
 const nodes=new Map();
 const element=()=>({value:'',textContent:'',children:[],disabled:false,hidden:false,append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(){},classList:{toggle(){}}});
 const get=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);};
 get('#fixture-inputs').textContent='[]';
 const controls=['#save','#actor','#message','#decision-text','#fault'].map(get);
 let resolveIO;
 const context=vm.createContext({document:{querySelector:get,createElement:element,querySelectorAll(selector){return selector==='button, input, select, textarea'?controls:[controls[0]];}},localStorage:{getItem(){return null;},setItem(){}},crypto:{randomUUID(){return 'test-workspace';}},fetch(){return new Promise(r=>{resolveIO=r;});}});
 vm.runInContext(await readFile(new URL('./public/app.js',import.meta.url),'utf8'),context);
 assert.ok(controls.every(c=>c.disabled),'startup locks textareas and actor/fault selectors as well as buttons');
 resolveIO({ok:true,json:async()=>({state:{status:'EMPTY',holder:'Originator (Sailor/LPO)',currentRevisionId:'NONE',validApprovalEventIds:[],renderedMessage:null},revisions:[],events:[],reports:{}})});
 await new Promise(setImmediate);
 assert.ok(controls.every(c=>!c.disabled),'acknowledgement unlocks the entire form');
 let settle;
 context.pending=new Promise(r=>{settle=r;});
 const success=vm.runInContext('run(()=>pending)',context);
 assert.ok(controls.every(c=>c.disabled),'subsequent actions lock edits before any await');
 settle();await success;
 assert.ok(controls.every(c=>!c.disabled));
 const failure=vm.runInContext("run(async()=>{throw Error('save: simulated storage failure');})",context);
 await failure;
 assert.ok(controls.every(c=>!c.disabled),'failed IO permits explicit retry');
 assert.equal(get('#error').textContent,'save: simulated storage failure');
});
