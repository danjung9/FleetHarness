import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { compute } from './compute.mjs';

// Exercise the delivered client event handlers and real domain core; browser layout
// and native behavior remain the separate host browser gate.
async function client() {
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
    fetch:async(_url,options)=>({ok:true,json:async()=>compute(JSON.parse(options.body))})});
  vm.runInContext(await readFile(new URL('./public/app.js',import.meta.url),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return get;
}

test('applied conflicting record cannot review or export a retained feasible board',async()=>{
  const get=await client();
  await get('optimize').onclick();
  assert.equal(get('export').disabled,false);
  const applied=JSON.parse(get('input-json').value);
  applied.search.maxNodes=0;
  get('input-json').value=JSON.stringify(applied);
  get('input-json').oninput();
  await get('apply-input').onclick();
  get('review-confirm').checked=true;
  get('review-confirm').onchange();
  assert.equal(get('export').disabled,true);
  assert.equal(get('review-save').disabled,true);
  assert.equal(get('review-help').textContent,'Optimize the applied input or discard input changes before reviewing or exporting the retained board.');
  get('review-save').onclick();
  assert.match(get('review-state').textContent,/pending local review/);
  await get('optimize').onclick();
  assert.equal(get('status').textContent,'Search exhausted; infeasibility is not established.');
  assert.equal(get('export').disabled,true);
  get('discard-input').onclick();
  assert.equal(get('export').disabled,false);
  assert.equal(JSON.parse(get('input-json').value).search.maxNodes,10000);
});

test('rejected allocation draft blocks review until deliberate discard',async()=>{
  const get=await client();
  await get('optimize').onclick();
  get('edit-ENG-1').onclick();
  get('edit-start').value='540';
  get('edit-start').oninput();
  await get('save-edit').onclick();
  assert.equal(get('edit-error').textContent,'Edit rejected: P1 and ROOM overlap DC-1. Last valid board retained.');
  assert.equal(get('export').disabled,true);
  get('discard-edit').onclick();
  assert.equal(get('export').disabled,false);
  assert.match(get('allocation-ENG-1').textContent,/1980–2100/);
  assert.equal(get('review-state').textContent,'Revision 2 pending local review; real approval: false.');
});
