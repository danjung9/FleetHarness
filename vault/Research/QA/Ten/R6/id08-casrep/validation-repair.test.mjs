import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compute} from './compute.mjs';
import {start} from './server.mjs';
const fixture=JSON.parse(await readFile(new URL('./data/synthetic-data.json',import.meta.url))).records[0];
const typeError='reportType: expected INITIAL, UPDATE, CORRECT or CASCOR';
function message(type,related='NONE',category='2'){return fixture.sourceMessage.replace('TYPE=INITIAL',`TYPE=${type}`).replace('RELATED=NONE',`RELATED=${related}`).replace('CATEGORY=2',`CATEGORY=${category}`);}
test('unsupported types do not infer linked-type constraints; independent errors retain field order',async()=>{
 for(const type of ['FINAL','AMENDMENT','initial'])for(const related of ['NONE','SYN-CR-765','unrecognized-link']){
  assert.deepEqual(await compute({action:'parse',message:message(type,related)}),{parsedFields:{...fixture.content,reportType:type,relatedReportId:related},validationErrors:[typeError],renderedMessage:null});
 }
 assert.deepEqual(await compute({action:'parse',message:message('UNKNOWN','NONE','8')}),{parsedFields:{...fixture.content,reportType:'UNKNOWN',category:'8'},validationErrors:[typeError,'category: expected 2, 3 or 4'],renderedMessage:null});
 assert.deepEqual(await compute({action:'parse',message:message('','NONE')}),{parsedFields:{...fixture.content,reportType:''},validationErrors:['reportType: required'],renderedMessage:null});
});
test('recognized types still enforce their exact link constraint',async()=>{
 for(const type of ['UPDATE','CORRECT','CASCOR']){
  const source=type==='CASCOR'?message(type).replace('REPAIR=2026-10-13T18:00:00Z','REPAIR=COMPLETE').replace('STATUS=DEGRADED','STATUS=RESTORED'):message(type);
  assert.deepEqual(await compute({action:'parse',message:source}),{parsedFields:{...fixture.content,reportType:type,...(type==='CASCOR'?{repair:'COMPLETE',equipmentStatus:'RESTORED'}:{})},validationErrors:['relatedReportId: invalid link'],renderedMessage:null});
 }
 assert.deepEqual(await compute({action:'parse',message:message('INITIAL','SYN-CR-222')}),{parsedFields:{...fixture.content,relatedReportId:'SYN-CR-222'},validationErrors:['relatedReportId: invalid link'],renderedMessage:null});
});
test('HTTP invocation and failed workflow save use the repaired shared parser',async()=>{
 const source=message('FINAL'),parsedFields={...fixture.content,reportType:'FINAL'};
 const service=await start({port:0});try{const response=await fetch(service.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'parse',message:source})});assert.equal(response.status,200);assert.deepEqual(await response.json(),{parsedFields,validationErrors:[typeError],renderedMessage:null});}finally{await service.close();}
 const revision={...fixture.revisions[0],content:parsedFields,sourceMessage:source};const command={eventId:'BOUNDARY-1',actorId:'ACT-01',timestamp:'2026-11-01T12:00:00Z',revisionId:revision.revisionId,action:'save',text:''};
 assert.deepEqual(await compute({action:'workflow',reportId:fixture.recordId,revisions:[revision],commands:[command]}),{status:'EMPTY',holder:'Originator (Sailor/LPO)',currentRevisionId:'NONE',revisionIds:[],auditEventIds:[],validApprovalEventIds:[],invalidatedApprovalEventIds:[],renderedMessage:null,errors:[typeError],rejections:[{actorId:'ACT-01',action:'save',revisionId:revision.revisionId,reason:typeError}]});
});
