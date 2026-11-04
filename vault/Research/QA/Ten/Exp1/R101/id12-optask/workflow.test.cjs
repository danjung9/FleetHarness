const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./core.cjs');
function reviewed(raw=C.SAMPLE){const s=C.initialState();s.draft=raw;C.parseDraft(s);C.reviewRevision(s,true,true);return s;}
test('empty parse consumes no revision; correction preserves exact invalid original',()=>{
 const s=C.initialState();assert.throws(()=>C.parseDraft(s));assert.equal(s.revisions.length,0);
 s.draft='FLIGHTQTRS|BAD|Drill|2026-02-30T09:00:00Z|2026-02-30T10:00:00Z';C.parseDraft(s);
 assert.throws(()=>C.reviewRevision(s,true,true),/Resolve all issues/);
 const original=JSON.stringify(s.revisions[0]);s.draft=C.SAMPLE;C.parseDraft(s);C.reviewRevision(s,true,true);
 assert.equal(s.activeId,2);assert.equal(JSON.stringify(s.revisions[0]),original);assert.match(C.exportTraceability(s),/2026-02-30T09:00:00Z/);
});
test('stale draft blocks review and both exports; explicit discard restores reviewed revision',()=>{
 const s=reviewed();const committed=JSON.stringify(C.active(s));s.draft='FLIGHTQTRS|NEW|Drill|2026-11-04T10:00:00Z|2026-11-04T11:00:00Z';
 assert.equal(C.dirty(s),true);assert.throws(()=>C.reviewRevision(s,true,true),/Parse or discard/);assert.throws(()=>C.exportCsv(s),/Source changes/);assert.throws(()=>C.exportTraceability(s),/Source changes/);assert.equal(JSON.stringify(C.active(s)),committed);
 s.draft=C.active(s).raw;assert.equal(C.exportGate(s),'');assert.match(C.exportCsv(s),/FP-01/);
 C.parseDraft(s);assert.equal(s.activeId,2);assert.equal(C.active(s).review.committed,false);assert.throws(()=>C.exportCsv(s),/Confirm/);
});
test('reasoned exclusion and both confirmations required; invalid record stays unplotted',()=>{
 const s=C.initialState();s.draft=C.SAMPLE+'\nNOTE training lunch';C.parseDraft(s);
 assert.throws(()=>C.excludeIssue(s,1,'  '),/exclusion reason/);assert.throws(()=>C.reviewRevision(s,true,true),/Resolve/);
 C.excludeIssue(s,1,'Non-event training note; exclude from schedule.');assert.throws(()=>C.reviewRevision(s,true,false),/confirm/);C.reviewRevision(s,true,true);
 const out=JSON.parse(C.exportTraceability(s));assert.equal(out.revisions[0].events.length,3);assert.equal(out.revisions[0].issues[0].note,'Non-event training note; exclude from schedule.');assert.throws(()=>C.excludeIssue(s,1,'Changed'),/new revision/);
});
test('reviewed zero-event revision exports only header and traceable excluded source',()=>{
 const s=reviewed('OPTASK|ZERO|Fictional vessel');assert.equal(C.buildDaySchedule(C.active(s),s.day).events.length,0);assert.equal(C.exportCsv(s).trim().split('\r\n').length,1);assert.equal(JSON.parse(C.exportTraceability(s)).synthetic,true);
});
test('CSV has stable order, full UTC endpoints, day clips and safe spreadsheet text',()=>{
 const s=reviewed();const csv=C.exportCsv(s);assert.equal(csv.split('\r\n')[0],'selected_date,event_id,event_type,label,frequency,unit,start_utc,end_utc,day_start_utc,day_end_utc,synthetic,review_status');
 assert.match(csv,/2026-11-04T23:30:00.000Z,2026-11-05T00:30:00.000Z,2026-11-04T23:30:00.000Z,2026-11-05T00:00:00.000Z,true,reviewed/);
 const unsafe=reviewed('FLIGHTQTRS|X|=CMD("fictional",1)|2026-11-04T06:00:00Z|2026-11-04T07:00:00Z');assert.ok(C.exportCsv(unsafe).includes('"\'=CMD(""fictional"",1)"'));assert.equal(C.active(unsafe).events[0].label,'=CMD("fictional",1)');
});
test('persistence round trip retains draft, review, exclusions, history and chosen day',()=>{
 const s=reviewed();s.day='2026-11-05';s.draft+='\nNOTE unsaved';const restored=C.restoreState(JSON.stringify(s));assert.deepEqual(restored,s);assert.equal(C.dirty(restored),true);assert.throws(()=>C.exportCsv(restored),/Source changes/);
 assert.throws(()=>C.restoreState('{bad'));assert.throws(()=>C.restoreState(JSON.stringify({version:999,draft:'',revisions:[]})));
 const corrupt=reviewed();corrupt.revisions[0].events[0].start='2026-01-01T00:00:00.000Z';assert.throws(()=>C.restoreState(JSON.stringify(corrupt)),/corrupt/);
});
