import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { compute } from './compute.mjs';

// Exercise the delivered client event handlers and real domain core; browser layout
// and native behavior remain the separate host browser gate.
async function client() {
  let release; const pending=new Promise(resolve=>{release=resolve}); let first=true;
  const data = JSON.parse(await readFile(new URL('./data/synthetic-data.json', import.meta.url)));
  const nodes = new Map();
  const element = () => ({value:'', textContent:'', checked:false, disabled:false, hidden:false,
    set id(value){nodes.set(value,this)}, style:{}, children:[], append(...items){this.children.push(...items)},
    replaceChildren(){this.children=[]}, focus(){}, scrollIntoView(){}});
  const get = id => { if (!nodes.has(id)) nodes.set(id,element()); return nodes.get(id); };
  get('samples').textContent=JSON.stringify(data.records);
  get('sample').value='weekly-conflicts';
  const saved=new Map();
  const context=vm.createContext({document:{getElementById:get, createElement:element},
    structuredClone, AbortController, Blob, URL, setTimeout,
    localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
    fetch:async(_url,options)=>{if(first){first=false;await pending}return {ok:true,json:async()=>compute(JSON.parse(options.body))}}});
  vm.runInContext(await readFile(new URL('./public/app.js',import.meta.url),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {get,release};
}

test('startup blocks draft editing until delayed sample hydration finishes',async()=>{
  const {get,release}=await client();
  assert.equal(get('input-json').disabled,true);
  assert.equal(get('apply-input').disabled,true);
  release();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(get('input-json').disabled,false);
  assert.equal(get('apply-input').disabled,false);
  const input=JSON.parse(get('input-json').value);
  input.fixtureId='startup-custom';
  input.recurrenceRequirements[0].occurrences.push({id:'PAST',releaseMinute:-1440,deadlineMinute:-1,requiredCount:1});
  input.recurrenceRequirements[0].lastCompletionMinute=-2000;
  get('input-json').value=JSON.stringify(input);
  get('input-json').oninput();
  await get('apply-input').onclick();
  await get('optimize').onclick();
  assert.equal(JSON.parse(get('input-json').value).fixtureId,'startup-custom');
  assert.equal(get('historical').textContent,'Historical overdue: PAST; coordinator review required.');
  assert.equal(get('status').textContent,'Feasible draft; pending local review.');
});
