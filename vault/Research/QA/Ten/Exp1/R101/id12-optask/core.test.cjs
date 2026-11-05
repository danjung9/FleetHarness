const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const core=require('./core.cjs');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const context=vm.createContext({});
vm.runInContext(html.match(/<script id="application-core">([\s\S]*?)<\/script>/)[1],context);
const implementations=[['module',core],['browser inline',context.Optask]];
const plain=x=>JSON.parse(JSON.stringify(x));
for(const [label,C] of implementations){
 test(label+': all three categories and exact sample evidence',()=>{
  const r=C.parseMessage(C.SAMPLE);assert.equal(r.events.length,3);assert.equal(r.issues.length,0);
  assert.deepEqual(plain(r.events.map(e=>e.type)),['Frequency Plan','Crypto Change-over Window','Flight Quarters']);
  assert.deepEqual(plain(r.events[0].fields.start),{value:'2026-11-04T06:00:00Z',sourceText:'2026-11-04T06:00:00Z',start:102,end:122,line:2});
 });
 test(label+': every source field slices unchanged mixed line endings and Unicode',()=>{
  const raw='OPTASK|UNICODE|Fictional 🛳 vessel\r\n\nFREQPLAN|A|Repeated 🛳 label|225.500|MHz|2026-11-04T01:00:00-05:00|2026-11-04T08:00:00Z\r\nCRYPTO|B|Repeated 🛳 label|2026-11-04T07:30:00Z|2026-11-04T07:45:00Z';
  const r=C.parseMessage(raw);assert.equal(r.events.length,2);assert.equal(r.raw,raw);
  for(const record of r.records){assert.equal(raw.slice(record.source.start,record.source.end),record.source.text);for(const field of Object.values(record.fields)){assert.equal(raw.slice(field.start,field.end),field.sourceText);assert.equal(field.value,field.sourceText);}}
  assert.equal(r.events[0].fields.start.line,3);
 });
 test(label+': no inferred timestamps and one issue per invalid record',()=>{
  assert.throws(()=>C.parseMessage(' \r\n'),/Enter a synthetic/);assert.throws(()=>C.parseMessage('x'.repeat(200001)),/200,000/);
  const r=C.parseMessage('CRYPTO|BAD-01|TRAINING-A to TRAINING-B|2026-11-04T07:30:00|2026-11-04T07:45:00Z\nFLIGHTQTRS|BAD-02|Invalid date drill|2026-02-30T09:00:00Z|2026-02-30T10:00:00Z\nUNSUPPORTED training note');
  assert.equal(r.events.length,0);assert.deepEqual(plain(r.issues.map(i=>i.message)),['Start timestamp requires an explicit timezone.','Invalid calendar date.','Unsupported record type.']);
  assert.equal(r.records[0].start,null);assert.equal(r.records[1].end,null);
 });
 test(label+': strict timezone, calendar and interval boundaries',()=>{
  for(const stamp of ['2026-02-29T01:00:00Z','2026-13-01T01:00:00Z','2026-01-01T24:00:00Z','2026-01-01T01:00:60Z','2026-01-01T01:00:00+14:01','2026-01-01T01:00:00-15:00','2026-01-01T01:00Z','2026-01-01T01:00:00.500Z','1899-01-01T01:00:00Z'])assert.equal(C.validateTimestamp(stamp),null,stamp);
  assert.equal(C.validateTimestamp('2024-02-29T01:00:00+14:00'),'2024-02-28T11:00:00.000Z');
  assert.equal(C.validateTimestamp('2026-11-04T01:00:00-05:00'),C.validateTimestamp('2026-11-04T06:00:00Z'));
  for(const end of ['2026-11-04T06:00:00Z','2026-11-04T05:59:59Z'])assert.equal(C.parseMessage('FLIGHTQTRS|X|Drill|2026-11-04T06:00:00Z|'+end).events.length,0);
 });
 test(label+': duplicates invalidate every member; header and missing-field issues',()=>{
  const line='FLIGHTQTRS|X|Drill|2026-11-04T06:00:00Z|2026-11-04T07:00:00Z';
  const r=C.parseMessage(line+'\n'+line);assert.equal(r.events.length,0);assert.equal(r.issues.length,2);assert.match(r.issues[0].message,/Duplicate/);
  assert.equal(C.parseMessage('OPTASK|A|Vessel\nOPTASK|B|Vessel').issues.length,2);
  assert.equal(C.parseMessage('OPTASK|A|Vessel').events.length,0);
  for(const raw of ['FREQPLAN|X|Label|0|MHz|2026-11-04T06:00:00Z|2026-11-04T07:00:00Z','FREQPLAN|X|Label|225|Hz|2026-11-04T06:00:00Z|2026-11-04T07:00:00Z','FLIGHTQTRS|X||2026-11-04T06:00:00Z|2026-11-04T07:00:00Z','FLIGHTQTRS|X|Missing','EVENT/X/unsupported//'])assert.equal(C.parseMessage(raw).events.length,0);
 });
 test(label+': synchronized day clipping retains full interval and overlaps',()=>{
  const r=C.parseMessage(C.SAMPLE),a=C.buildDaySchedule(r,'2026-11-04'),b=C.buildDaySchedule(r,'2026-11-05');
  assert.equal(a.minutes,165);assert.equal(a.events.length,3);assert.deepEqual(plain(a.overlaps),[{a:'FP-01',b:'CW-01',minutes:15}]);
  assert.equal(a.events[2].durationMinutes,60);assert.equal(a.events[2].minutes,30);assert.equal(a.events[2].next,true);
  assert.equal(b.events.length,1);assert.equal(b.minutes,30);assert.equal(b.events[0].previous,true);assert.equal(b.events[0].start,'2026-11-04T23:30:00.000Z');
  assert.equal(C.buildDaySchedule(r,'2026-11-06').events.length,0);assert.throws(()=>C.buildDaySchedule(r,'2026-02-30'),/valid UTC/);
  const touching=C.parseMessage('FLIGHTQTRS|A|Drill|2026-11-04T06:00:00Z|2026-11-04T07:00:00Z\nCRYPTO|B|Training|2026-11-04T07:00:00Z|2026-11-04T08:00:00Z');assert.equal(C.buildDaySchedule(touching,'2026-11-04').overlaps.length,0);
 });
 test(label+': planner key comparison measures actual fields, including negative cases',()=>{
  const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'benchmark-fixtures.json'),'utf8'));
  const result=C.compareBenchmark(fixtures);assert.deepEqual(plain(result),{expected:3,extracted:3,matched:3,falsePositives:0,missed:0,fields:17,totalFields:17,mismatches:[]});
  fixtures.cases[0].events[0].values[2]='Deliberately different answer';const failed=C.compareBenchmark(fixtures);assert.equal(failed.matched,2);assert.equal(failed.fields,16);assert.ok(failed.mismatches.length>0);
 });
}
test('packaged browser core and module behavior agree on parse, review, schedule, exports',()=>{
 const execute=C=>{const s=C.initialState();s.draft=C.SAMPLE+'\nNOTE fictional non-event';C.parseDraft(s);C.excludeIssue(s,1,'Fictional note');C.reviewRevision(s,true,true);return {parsed:C.active(s),schedule:C.buildDaySchedule(C.active(s),s.day),csv:C.exportCsv(s),json:JSON.parse(C.exportTraceability(s)),restored:C.restoreState(JSON.stringify(s))};};
 assert.deepEqual(plain(execute(context.Optask)),plain(execute(core)));
});
