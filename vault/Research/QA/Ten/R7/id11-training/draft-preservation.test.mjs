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

test('loading the same sample preserves unfinished input until explicit discard',async()=>{
  const get=await client();
  get('replace-confirm').hidden=true;
  const draft=get('input-json').value+' ';
  get('input-json').value=draft;
  get('input-json').oninput();
  await get('load-sample').onclick();
  assert.equal(get('input-json').value,draft);
  assert.equal(get('replace-confirm').hidden,false);
  get('replace-cancel').onclick();
  assert.equal(get('input-json').value,draft);
  assert.equal(get('replace-confirm').hidden,true);
  await get('load-sample').onclick();
  await get('replace-discard').onclick();
  assert.notEqual(get('input-json').value,draft);
  assert.equal(get('dirty-state').textContent,'Input saved locally.');
});

test('loading same sample preserves unfinished allocation until explicit discard',async()=>{
 const get=await client();
 get('replace-confirm').hidden=true;
 await get('optimize').onclick();
 get('edit-ENG-1').onclick();
 get('edit-start').value='540'; get('edit-start').oninput();
 await get('load-sample').onclick();
 assert.equal(get('replace-confirm').hidden,false);
 assert.equal(get('edit-start').value,'540');
 assert.match(get('allocation-ENG-1').textContent,/1980–2100/);
});
