import test from 'node:test';
import assert from 'node:assert/strict';
import {start} from './server.mjs';
import {compute} from './compute.mjs';

const input = rawText => ({grammarVersion:'SYN-OPTASK/1',rawText,selectedShip:'FS VERIFY',selectedDay:'2028-02-29',displayTimezone:'UTC'});
const wrap = lines => ['SYNTHETIC OPTASK — NOT REAL USMTF','MSGID/VERIFY//',...lines,'ENDMSG//'].join('\r\n');
const record = 'FLIGHTQ/A/FS VERIFY/🚁 CHECK/2028-02-29T23:30-01:00/2028-03-01T01:00Z//';
const resolution = 'Correct source and reparse; acknowledgement does not validate an order.';

test('HTTP runtime returns the complete literal empty-input response', async t => {
  const app = await start({port:0}); t.after(() => app.close());
  assert.deepEqual(await (await fetch(app.url+'health')).json(), {status:'ok'});
  const response = await fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input(''))});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{status:'needs_review',error:null,result:{extractedEventCount:0,selectedEventCount:0,categoryCounts:{'frequency plan':0,'crypto change-over window':0,'flight quarters':0},events:[],issues:[{code:'EMPTY_INPUT',message:'Enter a synthetic OPTASK message.',source:null,resolution}],exportContent:{provenance:'Synthetic; not validated against the real USMTF format.',messageId:null,selectedShip:'FS VERIFY',selectedDay:'2028-02-29',timezone:'UTC',reviewStatus:'unreviewed',unresolvedIssueCodes:['EMPTY_INPUT'],events:[],originalText:''}}});
});

test('HTTP computation matches actual shared core on new Unicode and leap-day input',async t=>{
  const app=await start({port:0}); t.after(()=>app.close());
  const x=input(wrap([record]));
  const body=await (await fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(x)})).json();
  assert.deepEqual(body,await compute(x));
  assert.equal(body.status,'ok');
  const e=body.result.events[0];
  assert.equal(e.startUtc,'2028-03-01T00:30Z');
  assert.equal(e.durationMinutes,30);
  assert.equal(e.selected,false);
  assert.equal(e.selectionReason,'outside selected UTC day');
  assert.equal(e.displaySegment,null);
  for(const span of [e.source,e.categorySource,e.messageIdSource,...Object.values(e.fields)]){
    assert.equal(x.rawText.slice(span.start,span.end),span.text);
    assert.equal(x.rawText.slice(0,span.start).split('\n').length,span.line);
  }
});

test('bad records use first-error precedence and cannot become reviewed exports',async()=>{
  const lines=[
    ['FREQPLAN/A/FS VERIFY/BAD/2028-02-29T01:00Z/2028-02-29T02:00Z/0/GHz//','INVALID_FREQUENCY','A: frequency must be a positive finite decimal.'],
    ['FREQPLAN/A/FS VERIFY/BAD/2028-02-29T01:00Z/2028-02-29T02:00Z/12/GHz//','INVALID_UNIT','A: frequency unit must be MHz or kHz.'],
    ['CRYPTO/A/FS VERIFY/BAD/2028-02-29T01:00+14:01/2028-02-29T02:00Z//','INVALID_DATE','A: impossible calendar date.'],
    ['FLIGHTQ/A/FS VERIFY/BAD/2028-02-29T01:00Z/2028-02-29T02:00Z/EXTRA//','EXTRA_FIELD','A: extra fields are unsupported.'],
  ];
  for(const [line,code,message] of lines){
    const raw=wrap([line]),body=await compute({...input(raw),reviewed:true});
    assert.deepEqual(body,{status:'needs_review',error:null,result:{extractedEventCount:0,selectedEventCount:0,categoryCounts:{'frequency plan':0,'crypto change-over window':0,'flight quarters':0},events:[],issues:[{code,message,source:{start:raw.indexOf(line),end:raw.indexOf(line)+line.length,text:line,line:3},resolution}],exportContent:{provenance:'Synthetic; not validated against the real USMTF format.',messageId:'VERIFY',selectedShip:'FS VERIFY',selectedDay:'2028-02-29',timezone:'UTC',reviewStatus:'unreviewed',unresolvedIssueCodes:[code],events:[],originalText:raw}}});
  }
});

test('duplicate collisions quarantine both while preserving unrelated records in source order',async()=>{
  const good=record.replace('/A/','/B/');
  const x=input(wrap([record,good,record]));
  const body=await compute(x);
  assert.equal(body.status,'needs_review');
  assert.deepEqual(body.result.events.map(e=>e.id),['B']);
  assert.deepEqual(body.result.issues.map(e=>e.code),['DUPLICATE_RECORD_ID']);
  assert.equal(body.result.issues[0].source.text,record);
  assert.equal(body.result.exportContent.originalText,x.rawText);
});

test('HTTP rejects malformed JSON and cross-origin invocation before domain computation',async t=>{
  const app=await start({port:0}); t.after(()=>app.close());
  const post=(body,headers={})=>fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
  assert.equal((await post('{')).status,400);
  assert.equal((await post('{}',{Origin:'https://example.invalid'})).status,403);
  assert.deepEqual(await (await post('{}')).json(),{status:'error',error:'INVALID_INPUT',result:null});
});
