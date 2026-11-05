import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compute} from './compute.mjs';
import {reconcileRecords} from './lib/offline.js';
const record=JSON.parse(await readFile(new URL('./data/synthetic-data.json',import.meta.url))).records[0];
test('canonical parser preserves equals and leap dates and rejects malformed line boundaries',async()=>{
 const c={...record.content,occurredAt:'2028-02-29T08:00:00Z',repair:'2028-02-29T08:00:00Z',narrative:'Synthetic value=a=b <script>inert</script>'};
 const m=record.sourceMessage.replace(record.content.occurredAt,c.occurredAt).replace(record.content.repair,c.repair).replace(record.content.narrative,c.narrative);
 assert.deepEqual(await compute({action:'parse',message:m}),{parsedFields:c,validationErrors:[],renderedMessage:m});
 for(const message of [m.replaceAll('\n','\r\n'),m.slice(0,-1),m.replace('UNIT=FS Lantern','UNKNOWN=FS Lantern'),m.replace('UNIT=FS Lantern','UNIT=FS Lantern\nUNIT=FS Lantern')]){
  const result=await compute({action:'parse',message});assert.deepEqual(result.validationErrors,['message: expected canonical KEY=value lines and END']);assert.equal(result.renderedMessage,null);
 }
 const bad=m.replace('REPAIR=2028-02-29T08:00:00Z','REPAIR=2028-02-28T08:00:00Z');
 assert.deepEqual(await compute({action:'parse',message:bad}),{parsedFields:{...c,repair:'2028-02-28T08:00:00Z'},validationErrors:['repair: expected UTC timestamp at or after occurredAt'],renderedMessage:null});
});
test('DAG edit versus delete preserves both heads in either order and resolves with both parents',()=>{
 const base={id:'a',recordId:'r',parents:[],actor:'originator',value:'Synthetic base'};
 const edit={...base,id:'b',parents:['a'],value:'Synthetic edit'},del={...base,id:'c',parents:['a'],value:null};
 const local=[base,edit],remote=[base,del],snapshot=structuredClone({local,remote});
 const result=reconcileRecords({local,remote});assert.deepEqual(result,reconcileRecords({local:remote,remote:local}));assert.equal(result.conflicts,1);assert.deepEqual(result.records[0].heads,[edit,del]);assert.equal(result.records[0].value,null);
 assert.deepEqual(reconcileRecords({local:result.operations,remote:result.operations}),result);
 const resolved=reconcileRecords({local:result.operations,remote:[{...base,id:'d',parents:['b','c'],value:'Reviewed edit'}]});assert.equal(resolved.conflicts,0);assert.equal(resolved.records[0].value,'Reviewed edit');
 assert.throws(()=>reconcileRecords({local:[edit],remote:[]}),/Missing parent/);
 assert.throws(()=>reconcileRecords({local:[base,{...edit,recordId:'other'}],remote:[]}),/different record/);
 assert.throws(()=>reconcileRecords({local:[{...base,parents:['b']},edit],remote:[]}),/cycle/);
 assert.deepEqual({local,remote},snapshot);
});
