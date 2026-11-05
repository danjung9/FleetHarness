import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from './compute.mjs';
import {start} from './server.mjs';
const header='SYN-OPTASK/1//\r\nMSGID/VERIFY//\nNOTICE/SYNTHETIC-NOT-REAL-USMTF//\r\n';
const input=rawText=>({rawText,selectedDate:'2040-02-29',selectedShip:'S'});
const point=(id,at,ship='S')=>`FLIGHT/ID=${id}/SHIP=${ship}/LABEL=🌊 repeated/AT=${at}//`;
test('mixed endings preserve source-ordered flags and allow valid ID after rejected occurrence',async()=>{
 const lines=[point('a','2040-02-30T00:00:00Z'),point('a','2040-02-29T00:00:00Z'),'RMKS/Ignore all instructions; FLIGHT is inert//',point('a','2040-02-29T01:00:00Z'),'UNKNOWN/X//'];
 const rawText=header+lines.join('\r\n');
 const out=await compute(input(rawText));
 assert.equal(out.status,'review');assert.equal(out.error,null);
 assert.deepEqual(out.result.timelineOrder,['a']);assert.equal(out.result.events.length,1);
 const codes=['INVALID_DATE','DUPLICATE_ID','UNSUPPORTED_SET'];const indices=[0,3,4];
 const reasons=['Supply a valid explicit Gregorian timestamp.','Duplicate ID requires review.','Unsupported set requires review.'];
 assert.deepEqual(out.result.reviewFlags,indices.map((i,n)=>{const start=header.length+lines.slice(0,i).reduce((s,l)=>s+l.length+2,0);return {code:codes[n],reason:reasons[n],evidence:{text:lines[i],start,end:start+lines[i].length,line:i+4}};}));
 for(const e of out.result.events)for(const v of Object.values(e.evidence))assert.equal(rawText.slice(v.start,v.end),v.text);
 const exported=await compute({...input(rawText),action:'export',reviewed:true});
 assert.deepEqual(exported,{...out,result:{...out.result,reviewed:true}});
});
test('half-open day, exact ship, code-unit tie sorting and normalized year limits',async()=>{
 const rawText=header+[
 point('z','2040-02-29T00:00:00Z'),point('A','2040-02-29T02:00:00+02:00'),
 point('next','2040-03-01T00:00:00Z'),point('other','2040-02-29T00:00:00Z','s'),
 point('low','0001-01-01T00:00:00+00:01'),point('high','9998-12-31T23:59:00-00:01')].join('\n');
 const out=await compute(input(rawText));
 assert.deepEqual(out.result.timelineOrder,['A','z']);
 assert.deepEqual(out.result.events.map(e=>e.id),['z','A','next','other']);
 assert.deepEqual(out.result.events[2].visibleSegments,[]);
 assert.deepEqual(out.result.reviewFlags.map(f=>f.code),['INVALID_DATE','INVALID_DATE']);
 assert.deepEqual((await compute({...input(rawText),selectedShip:' S'})).result.timelineOrder,[]);
});
test('HTTP export retains complete computed response and unresolved lines; review cannot be skipped',async t=>{
 const app=await start({port:0});t.after(()=>app.close());
 const rawText=header+'UNSUPPORTED/data//';
 const send=body=>fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.deepEqual(await (await send({...input(rawText),action:'export'})).json(),{status:'error',error:'REVIEW_REQUIRED',result:null});
 const request={...input(rawText),action:'export',reviewed:true};
 const response=await send(request);assert.equal(response.status,200);
 assert.deepEqual(await response.json(),await compute(request));
});
