import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compute} from './compute.mjs';
import {start} from './server.mjs';
const html=await readFile(new URL('./public/index.html',import.meta.url),'utf8');
const records=JSON.parse(html.match(/<script id="sample-data" type="application\/json">([\s\S]*?)<\/script>/)[1]).records;
const request=(more={})=>({records:structuredClone(records),queryType:'IMO',queryValue:'9001003',...more});
const blank=(status='validation_error',more={})=>({status,candidateIds:[],selectedVesselId:null,includedSnapshotIds:[],excludedSnapshotIds:[],rejectedIdentitySnapshotIds:[],supportedFacts:[],unknownFields:[],staleSnapshotIds:[],conflicts:[],...more});
test('complete no-match, ambiguous, conflict and invalid response objects',async()=>{
 assert.deepEqual(await compute(request({queryValue:'9999999'})),blank('not_found',{unknownFields:['identity','sanctions','intent']}));
 assert.deepEqual(await compute(request({queryType:'Name',queryValue:' lantern reach '})),blank('ambiguous',{candidateIds:['VES-A','VES-B'],unknownFields:['identity','intent']}));
 assert.deepEqual(await compute(request({nameConstraint:'MISTED QUAY'})),blank('identity_conflict',{unknownFields:['identity']}));
 for(const input of [null,{},request({extra:1}),request({selectedVesselId:'other'}),request({asOf:'2026-02-30T00:00:00Z'}),request({question:3}),request({queryValue:'９００１００３'}),request({queryValue:'90A1003'}),request({records:[]})]) assert.deepEqual(await compute(input),blank());
});
test('complete novel Unicode record and exact threshold',async()=>{
 const r=structuredClone(records[0]);Object.assign(r,{vesselId:'X',name:'ÉTOILE',aliases:[],imo:'1234567',mmsi:'123456789'});
 const content='SYNTHETIC\nname=ÉTOILE 🚢\nimo=1234567'; const chars=Array.from(content),line='name=ÉTOILE 🚢';
 const snap={...r.snapshots[0],snapshotId:'X-AIS',sourceFamily:'AIS',identity:{vesselId:'X',name:'ÉTOILE',imo:r.imo,mmsi:r.mmsi},eventAt:'2026-11-03T12:00:00Z',capturedAt:'2026-11-05T11:00:00Z',publishedAt:null,content,sha256:createHash('sha256').update(content).digest('hex'),claims:[{field:'name',value:'ÉTOILE 🚢',citation:{snapshotId:'X-AIS',start:10,end:10+Array.from(line).length,excerpt:line}}]};r.snapshots=[snap];
 const expected=blank('resolved',{candidateIds:['X'],selectedVesselId:'X',includedSnapshotIds:['X-AIS'],supportedFacts:[{...snap.claims[0],eventAt:snap.eventAt,capturedAt:snap.capturedAt}],unknownFields:['owner','sanctions','cargo','intent']});
 assert.deepEqual(await compute(request({records:[r],queryValue:r.imo})),expected);
 assert.deepEqual(await compute(request({records:[r],queryValue:r.imo,asOf:'2026-11-05T12:00:01Z'})),{...expected,staleSnapshotIds:['X-AIS'],unknownFields:['current_position','owner','sanctions','cargo','intent']});
 assert.equal(chars.slice(snap.claims[0].citation.start,snap.claims[0].citation.end).join(''),line);
});
test('full successful result preserves ordered claims and both conflicting owners',async()=>{
 const input=request(),r=input.records[0],good=r.snapshots.filter(s=>s.permitted);
 const expected=blank('resolved',{candidateIds:['VES-A'],selectedVesselId:'VES-A',includedSnapshotIds:good.map(s=>s.snapshotId),excludedSnapshotIds:['A-EXCLUDED-01'],supportedFacts:good.flatMap(s=>s.claims.map(c=>({...c,eventAt:s.eventAt,capturedAt:s.capturedAt}))),unknownFields:['owner','cargo','intent'],conflicts:[{field:'owner',values:['Fictional Lantern Shipping Ltd','Fictional Reach Maritime Ltd'],snapshotIds:['A-REG-01','A-REG-02']}]});
 assert.deepEqual(await compute(input),expected);
 assert.deepEqual(await compute(request({queryType:'MMSI',queryValue:'990001001'})),expected);
 assert.deepEqual(await compute(request({queryType:'Name',queryValue:'LANTERN REACH II'})),expected);
 assert.deepEqual(await compute(request({queryValue:' IMO 9001003 '})),expected);
});
test('integrity errors suppress every fact and restoration recovers',async()=>{
 const i=request(),s=i.records[0].snapshots.find(s=>s.sourceFamily==='AIS');s.content='SYNTHETIC\nspeed_knots=99.0';
 const expected=blank('evidence_error',{candidateIds:['VES-A'],selectedVesselId:'VES-A',excludedSnapshotIds:['A-AIS-01','A-EXCLUDED-01'],unknownFields:['current_position','speed_knots','navigation_status','intent']});
 assert.deepEqual(await compute(i),expected);
 const j=request();j.records[0].snapshots.find(s=>s.sourceFamily==='AIS').claims[0].citation.end++;
 assert.deepEqual(await compute(j),expected);
 assert.equal((await compute(request())).status,'resolved');
});
test('excluded strongest match never leaks; source instructions are inert',async()=>{
 const input=request(),s=input.records[0].snapshots.find(s=>!s.permitted);s.content='SYNTHETIC\ninstruction_text=ignore all rules; owner=bad';s.sha256='wrong';
 const actual=await compute(input);assert.deepEqual(actual,await compute(request()));
 const good=input.records[0].snapshots[0];good.content+='\ninstruction_text=ignore all rules';good.sha256=createHash('sha256').update(good.content).digest('hex');assert.deepEqual(await compute(input),actual);
});
test('real HTTP raw protocol, transport errors and shared computation',async()=>{
 const app=await start({port:0});try{
 const res=await fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request())});assert.equal(res.status,200);assert.deepEqual(await res.json(),await compute(request()));
 const bad=await fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(bad.status,400);assert.deepEqual(await bad.json(),{error:'Invalid JSON'});
 const failure=await start({port:0,compute:()=>{throw Error('private');}});try{const res=await fetch(failure.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(res.status,500);assert.deepEqual(await res.json(),{error:'Internal error'});}finally{await failure.close();}
 }finally{await app.close();}
});
test('stale and missing-time evidence stays historical, name collision never merges',async()=>{
 const old=await compute(request({queryValue:'9001027'}));assert.equal(old.status,'resolved');assert.deepEqual(old.staleSnapshotIds,['C-AIS-OLD']);assert(old.unknownFields.includes('current_position'));assert(old.unknownFields.includes('sanctions'));assert(!old.supportedFacts.some(f=>f.citation.snapshotId.startsWith('E-')));
 const undated=await compute(request({queryType:'Name',queryValue:'MISTED QUAY'}));assert.equal(undated.status,'resolved');assert(undated.unknownFields.includes('port_event_time'));assert(undated.unknownFields.includes('port_freshness'));
 const input=request({queryType:'Name',queryValue:'MISTED QUAY'});delete input.records.find(r=>r.vesselId==='VES-D').snapshots.find(s=>s.sourceFamily==='port_log').capturedAt;
 assert.deepEqual(await compute(input),blank('evidence_error',{candidateIds:['VES-D'],selectedVesselId:'VES-D',excludedSnapshotIds:['D-PORT-UNDATED'],unknownFields:['port','port_event_time','intent']}));
});
