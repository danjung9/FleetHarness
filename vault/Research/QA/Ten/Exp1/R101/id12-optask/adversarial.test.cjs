const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/<script id="application-core">([\s\S]*?)<\/script>/)[1],ctx);
for(const [name,C] of [['module',require('./core.cjs')],['inline',ctx.Optask]]) {
 const state=()=>{const s=C.initialState();s.draft=C.SAMPLE+'\nNOTE synthetic non-event';C.parseDraft(s);C.excludeIssue(s,1,'Not an event');C.reviewRevision(s,true,true);return s;};
 test(name+': prototype property names are unsupported records, never events',()=>{
  for(const tag of ['constructor','toString','__proto__','hasOwnProperty']) {
   const r=C.parseMessage(tag+'|X|Fictional|2026-11-04T06:00:00Z|2026-11-04T07:00:00Z');
   assert.equal(r.events.length,0,tag);assert.equal(r.issues.length,1,tag);
   assert.equal(r.issues[0].message,'Unsupported record type.');
  }
 });
 test(name+': restored evidence rejects changed issue spans, headers and grammar',()=>{
  for(const mutate of [s=>s.revisions[0].issues[0].source.start=0,s=>s.revisions[0].issues[0].fields.tag.sourceText='forged',s=>s.revisions[0].headers[0].fields.vessel.value='forged',s=>s.revisions[0].grammar='forged',s=>s.revisions[0].issues[0].reasons=['forged']]) {
   const s=state();mutate(s);assert.throws(()=>C.restoreState(JSON.stringify(s)),/corrupt/);
  }
 });
 test(name+': exact size boundary and rejected reparse preserve reviewed work',()=>{
  const s=state(),before=JSON.stringify(s.revisions);s.draft='x'.repeat(200001);
  assert.throws(()=>C.parseDraft(s),/200,000/);assert.equal(JSON.stringify(s.revisions),before);assert.equal(s.activeId,1);
  assert.equal(C.parseMessage('x'.repeat(200000)).issues.length,1);
 });
 test(name+': midnight endpoint excludes next day and seconds retain fractional minutes',()=>{
  const r=C.parseMessage('FLIGHTQTRS|N|Synthetic drill|2026-11-04T23:59:30Z|2026-11-05T00:00:00Z');
  assert.equal(C.buildDaySchedule(r,'2026-11-04').minutes,0.5);
  assert.equal(C.buildDaySchedule(r,'2026-11-05').events.length,0);
 });
 test(name+': comparison detects missed and unexpected events and handles zero denominators',()=>{
  const key=JSON.parse(fs.readFileSync(path.join(__dirname,'benchmark-fixtures.json'),'utf8'));
  key.cases[0].raw=key.cases[0].raw.replace(/FREQPLAN[^\n]+\n/,'');
  key.cases[1].raw+='\nFLIGHTQTRS|EXTRA|Synthetic extra|2026-11-04T01:00:00Z|2026-11-04T02:00:00Z';
  const r=C.compareBenchmark(key);assert.equal(r.matched,2);assert.equal(r.missed,1);assert.equal(r.falsePositives,1);assert.ok(r.mismatches.some(x=>x.includes('Unexpected event EXTRA')));
  const zero=C.compareBenchmark({cases:[{raw:'OPTASK|ZERO|Synthetic vessel',events:[]}]});
  assert.equal(zero.expected,0);assert.equal(zero.extracted,0);assert.equal(zero.totalFields,0);
 });
}
