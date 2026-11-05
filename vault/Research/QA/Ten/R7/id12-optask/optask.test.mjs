import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compute} from './compute.mjs';
const data=JSON.parse(await readFile(new URL('./data/synthetic-data.json',import.meta.url)));
for(const r of data.records)test(r.caseId+' complete response and evidence',async()=>{
 const actual=await compute(r);
 // Fixtures define event truth; frozen invocation defines flag reasons and whole-line evidence.
 const reason={EMPTY_INPUT:'Enter a synthetic message.',MISSING_TIMEZONE:'Supply an explicit timezone.',INVALID_DATE:'Supply a valid explicit Gregorian timestamp.',REVERSED_WINDOW:'End must be after start.',MISSING_FIELD:'A required field is missing.',UNSUPPORTED_SET:'Unsupported set requires review.',DUPLICATE_ID:'Duplicate ID requires review.'};
 const flags=r.expectedReviewFlags.map(f=>{const line=f.evidence.line;if(line===0)return {...f,reason:reason[f.code]};const physical=r.rawText.split('\n');const text=physical[line-1].replace(/\r$/,'');const start=physical.slice(0,line-1).reduce((n,s)=>n+s.length+1,0);return {code:f.code,reason:reason[f.code],evidence:{text,start,end:start+text.length,line}};});
 assert.deepEqual(actual,{status:r.expectedReviewFlags.length?'review':'ok',error:null,result:{messageId:r.rawText?r.messageId:null,rawText:r.rawText,selectedDate:r.selectedDate,selectedShip:r.selectedShip,displayTimezone:'UTC',lineCount:r.lineCount,events:r.expectedEvents,reviewFlags:flags,timelineOrder:r.expectedTimelineOrder,disclaimer:'Synthetic, not validated against the real USMTF format.',reviewed:false}});
 for(const e of actual.result.events)for(const v of Object.values(e.evidence))assert.equal(r.rawText.slice(v.start,v.end),v.text);
 const exported=await compute({...r,action:'export',reviewed:true});assert.deepEqual(exported,{...actual,result:{...actual.result,reviewed:true}});
});
test('validation precedence and literal errors',async()=>{
 const base={rawText:'',selectedDate:'2026-11-06',selectedShip:'S'};
 for(const [input,error] of [[null,'INVALID_INPUT_TYPE'],[{...base,rawText:3,action:'x'},'INVALID_INPUT_TYPE'],[{...base,action:null},'INVALID_ACTION'],[{...base,selectedDate:'2025-02-29'},'INVALID_SELECTION'],[{...base,reviewed:null},'INVALID_SELECTION'],[{...base,action:'export'},'REVIEW_REQUIRED']])assert.deepEqual(await compute(input),{status:'error',error,result:null});
});
test('novel early year offset, rejected duplicate and missing header',async()=>{
 const rawText='SYN-OPTASK/1//\r\nMSGID/NOVEL//\nNOTICE/SYNTHETIC-NOT-REAL-USMTF//\nFLIGHT/ID=A/SHIP=S/LABEL=α/AT=0004-02-29T02:00:00+02:00//';
 const out=await compute({rawText,selectedDate:'0004-02-29',selectedShip:'S'});assert.equal(out.result.events[0].startUtc,'0004-02-29T00:00:00Z');assert.deepEqual(out.result.timelineOrder,['A']);
 assert.deepEqual(await compute({rawText:'SYN-OPTASK/1//',selectedDate:'0001-01-01',selectedShip:' '}),{status:'review',error:null,result:{messageId:null,rawText:'SYN-OPTASK/1//',selectedDate:'0001-01-01',selectedShip:' ',displayTimezone:'UTC',lineCount:1,events:[],reviewFlags:[{code:'HEADER_INVALID',reason:'Use the three SYN-OPTASK/1 header lines.',evidence:{text:'',start:14,end:14,line:2}}],timelineOrder:[],disclaimer:'Synthetic, not validated against the real USMTF format.',reviewed:false}});
});
test('per-category precision/recall across preserved records',async()=>{
 const counts={};for(const r of data.records){const actual=(await compute(r)).result;for(const category of ['frequency-plan','crypto-changeover','flight-quarters']){const expected=r.expectedEvents.filter(e=>e.category===category).map(e=>e.id);const found=actual.events.filter(e=>e.category===category).map(e=>e.id);const c=counts[category]??={tp:0,fp:0,fn:0};c.tp+=found.filter(id=>expected.includes(id)).length;c.fp+=found.filter(id=>!expected.includes(id)).length;c.fn+=expected.filter(id=>!found.includes(id)).length;}}
 for(const c of Object.values(counts)){assert.equal(c.tp/(c.tp+c.fp),1);assert.equal(c.tp/(c.tp+c.fn),1);}console.log('Synthetic fixture event metrics:',JSON.stringify(counts));
});
test('public protocol exact complete novel point result',async()=>{
 const rawText='SYN-OPTASK/1//\nMSGID/T//\nNOTICE/SYNTHETIC-NOT-REAL-USMTF//\nFLIGHT/ID=X/SHIP=S/LABEL=Z/AT=2030-01-02T01:00:00+01:00//';
 assert.deepEqual(await compute({rawText,selectedDate:'2030-01-02',selectedShip:'S',action:'export',reviewed:true}),{status:'ok',error:null,result:{messageId:'T',rawText,selectedDate:'2030-01-02',selectedShip:'S',displayTimezone:'UTC',lineCount:4,events:[{id:'X',messageId:'T',category:'flight-quarters',fields:{id:'X',ship:'S',label:'Z',at:'2030-01-02T01:00:00+01:00'},evidence:{id:{text:'X',start:69,end:70,line:4},ship:{text:'S',start:76,end:77,line:4},label:{text:'Z',start:84,end:85,line:4},at:{text:'2030-01-02T01:00:00+01:00',start:89,end:114,line:4}},startUtc:'2030-01-02T00:00:00Z',endUtc:null,derivedFrom:{startUtc:'at',endUtc:null,visibleSegments:['startUtc','endUtc','selectedDate']},visibleSegments:[{startUtc:'2030-01-02T00:00:00Z',endUtc:null,startMinute:0,endMinute:null,continuesBefore:false,continuesAfter:false}]}],reviewFlags:[],timelineOrder:['X'],disclaimer:'Synthetic, not validated against the real USMTF format.',reviewed:true}});
});
test('empty duplicate required field precedes malformed syntax and invalid first ID does not occupy it',async()=>{
 const header='SYN-OPTASK/1//\nMSGID/B//\nNOTICE/SYNTHETIC-NOT-REAL-USMTF//\n';
 const first='FLIGHT/ID=A/ID=/SHIP=S/LABEL=B/AT=2030-01-01T00:00:00Z//';
 const second='FLIGHT/ID=A/SHIP=S/LABEL=B/AT=2030-01-01T00:00:00Z//';
 const r=(await compute({rawText:header+first+'\n'+second,selectedDate:'2030-01-01',selectedShip:'S'})).result;
 assert.deepEqual(r.reviewFlags,[{code:'MISSING_FIELD',reason:'A required field is missing.',evidence:{text:first,start:header.length,end:header.length+first.length,line:4}}]);assert.deepEqual(r.timelineOrder,['A']);
});
