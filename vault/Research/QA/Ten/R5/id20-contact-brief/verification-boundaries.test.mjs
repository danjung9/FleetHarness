import test from 'node:test';
import assert from 'node:assert/strict';
import {start} from './server.mjs';

test('HTTP boundary rejects cross-origin and oversized bodies and remains usable', async()=>{
 const app=await start({port:0,maxInputBytes:64});
 try {
  for(const [headers,body,status] of [
   [{'Content-Type':'application/json',Origin:'https://untrusted.invalid'},'{}',403],
   [{'Content-Type':'text/plain'},'{}',415],
   [{'Content-Type':'application/json'},JSON.stringify({padding:'x'.repeat(100)}),413]
  ]) {
   const response=await fetch(app.url+'api/invoke',{method:'POST',headers,body});
   assert.equal(response.status,status);
  }
  assert.deepEqual(await (await fetch(app.url+'health')).json(),{status:'ok'});
  const response=await fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{status:'validation_error',candidateIds:[],selectedVesselId:null,includedSnapshotIds:[],excludedSnapshotIds:[],rejectedIdentitySnapshotIds:[],supportedFacts:[],unknownFields:[],staleSnapshotIds:[],conflicts:[]});
 } finally {await app.close();}
});

test('served assets and method handling support documented local quick start',async()=>{
 const app=await start({port:0});
 try {
  for(const [path,type] of [['','text/html'],['app.js','text/javascript'],['styles.css','text/css']]) {
   const response=await fetch(app.url+path);assert.equal(response.status,200);assert(response.headers.get('content-type').startsWith(type));assert((await response.text()).length>0);
  }
  assert.equal((await fetch(app.url+'api/invoke')).status,405);
  assert.equal((await fetch(app.url+'not-a-route')).status,404);
 } finally {await app.close();}
});
