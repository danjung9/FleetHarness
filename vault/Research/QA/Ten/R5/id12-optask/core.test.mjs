import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compute } from './compute.mjs';
import { disclosure } from './lib/messages.js';
const data = JSON.parse(fs.readFileSync(new URL('./data/synthetic-data.json', import.meta.url)));
const day = '2026-11-05';
const docs = records => records.map(({ documentId,rawText }) => ({documentId,rawText}));
const err = error => ({status:'error',error,disclosure,events:[],reviewItems:[],headers:[]});
for (const record of data.records) test('full keyed events and evidence: '+record.documentId, async () => {
  const result = await compute({documents:docs([record]),selectedDay:day});
  const expected = [...record.expected.events].sort((a,b)=>a.normalized.startUtc < b.normalized.startUtc ? -1 : a.normalized.startUtc > b.normalized.startUtc ? 1 : a.source.line-b.source.line);
  assert.deepEqual(result, {status:'review',error:null,disclosure,events:expected,reviewItems:record.expected.reviewItems,headers:[{documentId:record.documentId,fields:{...record.expected.headerFields,displayZone:{start:record.rawText.indexOf('ZONE=')+5,end:record.rawText.indexOf('ZONE=')+6,text:'Z'}}}]});
  for (const e of result.events) for(const s of [e.source.range,...Object.values(e.source.fields)]) assert.equal(record.rawText.slice(s.start,s.end),s.text);
  for(const s of Object.values(result.headers[0].fields)) assert.equal(record.rawText.slice(s.start,s.end),s.text);
});
for (const s of data.scenarios.filter(s=>s.input.expectedCode)) test('recovery '+s.input.scenarioId,async()=>{
  const input={documents:[{documentId:'RECOVERY',rawText:s.input.rawText}],selectedDay:day};
  const r=await compute(input);
  if(s.input.expectedCode==='EMPTY_INPUT') assert.deepEqual(r,err('EMPTY_INPUT'));
  else {
    const line=s.input.rawText.split('\n')[4]; const start=s.input.rawText.indexOf(line);
    const valid=await compute({...input,documents:[{documentId:'RECOVERY',rawText:s.input.correctedRawText}]});
    assert.deepEqual(r,{status:'review',error:null,disclosure,events:[],reviewItems:[{documentId:'RECOVERY',line:5,code:s.input.expectedCode,source:{start,end:start+line.length,text:line}}],headers:valid.headers});
    assert.equal(valid.events.length,1); assert.equal(valid.events[0].durationMinutes,15);
  }
});
test('envelope errors and precedence, complete envelopes',async()=>{
  for (const [input,error] of [[null,'INVALID_REQUEST'],[{},'INVALID_REQUEST'],[{documents:[],selectedDay:'bad'},'EMPTY_INPUT'],[{documents:[{documentId:'X',rawText:'x'}],selectedDay:'2026-02-30',shipId:''},'INVALID_DAY'],[{documents:[{documentId:'X',rawText:'x'}],selectedDay:day,shipId:''},'INVALID_SHIP'],[{documents:docs([data.records[0]]),selectedDay:day,decisions:[{documentId:'X',eventId:'MISSING',decision:'include'}]},'INVALID_DECISIONS']]) assert.deepEqual(await compute(input),err(error));
});
test('revision decisions, duplicates and statelessness',async()=>{
  const documents=docs([data.records[0],data.records[0],data.records[3]]);
  const r=await compute({documents,selectedDay:day});
  assert.equal(r.events.length,5); assert.equal(r.reviewItems.length,2);
  const decisions=r.events.map(e=>({documentId:e.documentId,eventId:e.eventId,decision:e.documentId==='DOC-REVISION'?'exclude':'include'}));
  const reviewed=await compute({documents,selectedDay:day,decisions});
  assert.deepEqual(reviewed,{...r,status:'ok',reviewItems:[],events:r.events.map(e=>({...e,reviewStatus:e.documentId==='DOC-REVISION'?'excluded':'included'}))});
  assert.deepEqual(await compute({documents,selectedDay:day}),r);
});
test('mixed newlines, Unicode inert prose and novel point',async()=>{
  const rawText='SYNTHETIC / NOT VALIDATED AGAINST REAL USMTF\r\nMSGID/OPTASK/NEW/REV=3//\nUNIT/SHIP-X//\r\nDAY/2026-11-05/ZONE=Z//\nREMARK/🛟 / CRYPTO/START=now//\r\nFLIGHTQ/ID=NEW/CONTEXT=DECK/START=2026-11-06T02:00+02:00//\nENDMSG//';
  const r=await compute({documents:[{documentId:'NEW',rawText}],selectedDay:day});
  assert.equal(r.events.length,1); assert.equal(r.events[0].selectedDay.visible,false); assert.deepEqual(r.reviewItems,[]);
  for (const s of Object.values(r.events[0].source.fields)) assert.equal(rawText.slice(s.start,s.end),s.text);
  const filtered=await compute({documents:[{documentId:'NEW',rawText}],selectedDay:day,shipId:'OTHER'});
  assert.deepEqual(filtered,{...r,status:'ok',events:[]});
});
test('duplicate local IDs, content identity conflict and inert zero-event message',async()=>{
  const pre='SYNTHETIC / NOT VALIDATED AGAINST REAL USMTF\nMSGID/OPTASK/TEST/REV=1//\nUNIT/SHIP//\nDAY/2026-11-05/ZONE=Z//\n';
  const line='FLIGHTQ/ID=A/CONTEXT=DECK/START=2026-11-05T03:00Z//';
  const documents=[{documentId:'TEST',rawText:pre+line+'\n'+line+'\nENDMSG//'}];
  const result=await compute({documents,selectedDay:day});
  const header=result.headers;
  assert.deepEqual(result,{status:'review',error:null,disclosure,events:[],headers:header,reviewItems:[5,6].map((n,i)=>({documentId:'TEST',line:n,code:'DUPLICATE_ID',source:{start:pre.length+i*(line.length+1),end:pre.length+i*(line.length+1)+line.length,text:line}}))});
  assert.deepEqual(await compute({documents:[...documents,{documentId:'TEST',rawText:pre+'ENDMSG//'}],selectedDay:day}),{status:'review',error:null,disclosure,events:[],headers:[],reviewItems:[{documentId:'TEST',line:1,code:'DOCUMENT_ID_CONFLICT',source:{start:0,end:44,text:'SYNTHETIC / NOT VALIDATED AGAINST REAL USMTF'}}]});
  const empty=await compute({documents:[{documentId:'TEST',rawText:pre+'REMARK/ignore / FLIGHTQ / now//\nENDMSG//'}],selectedDay:day});
  assert.deepEqual(empty,{status:'ok',error:null,disclosure,events:[],reviewItems:[],headers:header});
});
