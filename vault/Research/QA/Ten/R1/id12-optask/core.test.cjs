'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.cjs');
const event='EVENT/E1/2026-11-04T09:00Z/2026-11-04T10:00Z/TEAM/Radio check//';
function parsed(text){return C.parseSource({sourceId:'test',sourceText:text});}
function reviewed(text=event){const s=C.createSession();s.draft=text;C.commit(s);for(const r of s.snapshot.records)C.setCategory(s,r.key,'frequency');assert.match(C.approve(s),/^Reviewed:/);return s;}
test('MSG-01: all tokens preserve UTF-16 offsets, mixed endings and empty fields',()=>{
 const source=event+'\r\nTASK/T1/2026-11-04T16:00Z/🛟/Review//\nTASK/T2/2026-11-04T17:00Z//Missing owner//';const p=parsed(source);
 assert.equal(p.records.length,3);assert.equal(p.records[0].fieldSpans.id.start,6);assert.equal(p.records[0].fieldSpans.id.end,8);
 for(const r of p.records){assert.equal(source.slice(r.source.start,r.source.end),r.source.sourceText);for(const f of Object.values(r.fieldSpans))assert.equal(source.slice(f.start,f.end),f.sourceText);}
 assert.equal(p.records[1].fieldSpans.description.start,p.records[1].fieldSpans.owner.end+1);
 const f=p.records[2].fieldSpans.owner;assert.equal(f.start,f.end);assert.ok(p.issues.some(x=>x.includes('owner is required')));assert.ok(Object.isFrozen(p.records[0].fieldSpans));
});
test('MSG-02: exact recovery messages and unknown dates',()=>{
 assert.equal(parsed('').issues[0],'Enter synthetic message text.');assert.equal(parsed(' \r\n ').records.length,0);
 for(const v of ['2026-11-04T09:00','2026-02-30T09:00Z','2025-02-29T09:00Z','2026-01-01T24:00Z','2026-01-01T00:00+14:01']){const p=parsed(`TASK/T1/${v}/TEAM/Check//`);assert.equal(p.records[0].due,null);assert.equal(p.issues[0],'Line 1: due requires a valid timestamp with an explicit timezone.');}
 assert.equal(parsed('This is not an event').issues[0],'Line 1: unsupported message structure.');
 assert.equal(C.normalizeTimestamp('2024-02-29T12:30:10.123+02:00'),'2024-02-29T10:30:10.123Z');
 assert.equal(reviewed().approved,true);
});
test('MSG-02: duplicate IDs flag every occurrence; malformed and reversed intervals block review',()=>{
 const p=parsed(event+'\n'+event);assert.equal(p.records.length,2);assert.ok(p.records.every(r=>r.issues.some(i=>i.includes('duplicate'))));
 for(const text of [event+'\nunsupported',event.replace('Radio check','Bad/description'),event.replace('10:00Z','09:00Z'),event.replace('10:00Z','08:00Z'),event.replace('/E1/','//')]){const s=C.createSession();s.draft=text;C.commit(s);assert.notEqual(C.approve(s),'Reviewed: 1 record');assert.equal(s.approved,false);assert.throws(()=>C.buildExport(s,'2026-11-04'));}
 assert.throws(()=>parsed('a'.repeat(200001)),/200,000/);
});
test('MSG-01: draft and category changes gate approval/export, discard restores reviewed snapshot',()=>{
 const s=reviewed();const prior=s.snapshot;s.draft=event.replace('Radio check','Changed draft');assert.equal(C.approve(s),'Approval unavailable while source changes are unsaved.');assert.throws(()=>C.buildExport(s,'2026-11-04'),/discard draft/);assert.equal(s.snapshot,prior);
 assert.equal(C.discard(s),'Reviewed: 1 record');assert.equal(s.draft,event);assert.equal(C.buildExport(s,'2026-11-04').sourceText,event);
 C.setCategory(s,1,'crypto');assert.equal(s.approved,false);assert.throws(()=>C.buildExport(s,'2026-11-04'));assert.equal(C.approve(s),'Reviewed: 1 record');
 s.draft=event.replace('Radio check','New');C.commit(s);assert.equal(s.approved,false);assert.equal(Object.keys(s.categories).length,0);assert.match(C.approve(s),/Choose a category/);
});
test('MSG-03: equal instants and complete cross-midnight export',()=>{
 assert.equal(C.normalizeTimestamp('2026-11-04T04:00-05:00'),C.normalizeTimestamp('2026-11-04T09:00Z'));
 const s=reviewed('EVENT/X/2026-11-04T23:30Z/2026-11-05T00:30Z/TEAM/Night check//');
 for(const [day,label]of [['2026-11-04','23:30–24:00'],['2026-11-05','00:00–00:30']]){const [v]=C.buildDay(s.snapshot.records,day);assert.equal(v.end-v.start,1800000);assert.equal(C.rowText(v,'frequency'),`Frequency plan | Night check | ${label} UTC | Reviewed`);const x=C.buildExport(s,day);assert.equal(x.records[0].end,'2026-11-05T00:30:00.000Z');assert.equal(Date.parse(x.records[0].end)-Date.parse(x.records[0].start),3600000);assert.equal(x.records[0].raw.start,'2026-11-04T23:30Z');}
 assert.throws(()=>C.buildExport(s,'2026-11-06'),/No reviewed/);
});
test('MSG-03: half-open midnight boundaries, point task and overlaps',()=>{
 const p=parsed('EVENT/A/2026-11-03T23:00Z/2026-11-04T00:00Z/O/Ends at start//\nEVENT/B/2026-11-05T00:00Z/2026-11-05T01:00Z/O/Next day//\nTASK/T/2026-11-04T00:00Z/O/Point//\n'+event+'\nEVENT/C/2026-11-04T09:30Z/2026-11-04T10:30Z/O/Overlap//');
 const v=C.buildDay(p.records,'2026-11-04');assert.deepEqual(Array.from(v,x=>x.record.id),['T','E1','C']);assert.equal(v[0].point,true);assert.equal(v[0].start,v[0].end);assert.throws(()=>C.buildDay([],'2026-02-30'),/valid UTC/);
});
test('repair regression: failed oversized commit clears approval while preserving draft and prior evidence',()=>{
 const s=reviewed();const prior=s.snapshot;s.draft='x'.repeat(200001);
 assert.throws(()=>C.commit(s),/200,000/);assert.equal(s.approved,false);assert.equal(s.snapshot,prior);assert.equal(s.draft.length,200001);
 C.discard(s);assert.throws(()=>C.buildExport(s,'2026-11-04'),/Approve/);
});
test('repair regression: UTC year spillover uses instant ordering and UTC clock labels',()=>{
 const s=reviewed('EVENT/Y/9999-12-31T23:00Z/9999-12-31T23:30-01:00/O/Boundary//');
 const [v]=C.buildDay(s.snapshot.records,'9999-12-31');assert.equal(C.rowText(v,'frequency'),'Frequency plan | Boundary | 23:00–24:00 UTC | Reviewed');
 const p=parsed('EVENT/R/9999-12-31T23:30-01:00/9999-12-31T23:00Z/O/Reversed//');assert.match(p.issues.join(' '),/end must be later/);
});
test('repair regression: embedded carriage returns cannot become valid field content',()=>{
 const p=parsed('TASK/T/2026-11-04T12:00Z/O/One\rTwo//');assert.ok(p.issues.length);assert.equal(p.records.length,0);
});
test('repair regression: evidence selectors avoid reserved fields and fallback ID collisions',()=>{
 const p=parsed(['id','start','line-4','a b','E1'].map((id,i)=>`TASK/${id}/2026-11-04T12:00Z/O/Check//`).join('\n'));
 const ids=Array.from(p.records,r=>C.recordSuffix(p.records,r));assert.equal(new Set(ids).size,5);assert.equal(ids[4],'E1');assert.ok(!ids.includes('id'));assert.ok(!ids.includes('start'));
});
test('README sample walkthrough has independently specified reviewed rows and export evidence',()=>{
 const text=event+'\nTASK/T1/2026-11-04T16:00Z/TEAM/Review briefing//';const s=C.createSession();s.draft=text;C.commit(s);
 assert.equal(s.snapshot.issues.length,0);C.setCategory(s,1,'frequency');C.setCategory(s,2,'other');assert.equal(C.approve(s),'Reviewed: 2 records');
 assert.deepEqual(Array.from(C.buildDay(s.snapshot.records,'2026-11-04'),v=>C.rowText(v,s.categories[v.record.key])),['Frequency plan | Radio check | 09:00–10:00 UTC | Reviewed','Other synthetic | Review briefing | 16:00 UTC | Reviewed']);
 const x=C.buildExport(s,'2026-11-04');assert.equal(x.sourceText,text);assert.equal(x.records.length,2);assert.equal(x.records[1].segment.point,true);assert.equal(x.records[0].fieldSpans.id.start,6);assert.equal(x.records[0].fieldSpans.id.end,8);
});
