'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const C=require('./core.js');const key=require('./answer-key.json');
const html=fs.readFileSync(__dirname+'/index.html','utf8');const context={};vm.runInNewContext(html.match(/<script id="optask-core">([\s\S]*?)<\/script>/)[1],context);const inline=context.OptaskCore;const plain=x=>JSON.parse(JSON.stringify(x));
const freq='FREQ/F1/2026-11-04T08:00Z/2026-11-04T12:00Z/COMMS/251.5/MHz/Training net//';
for(const [name,core]of [['module',C],['inline',inline]]){
 test(name+': literal planning answer key and non-events',()=>{const p=core.parseMessage(key.raw,'H');assert.deepEqual(plain(core.compareAnswerKey(p,key)),{expected:3,extracted:3,matched:3,falsePositives:0,missed:0,precision:1,recall:1,fieldDiscrepancies:0,timeDiscrepancies:0,spanDiscrepancies:0});assert.equal(p.issues.length,1);assert.equal(p.issues[0].line,5);const none=core.parseMessage(key.raw.split('\n').slice(3).join('\n'));assert.equal(none.events.length,0);const b=core.compareAnswerKey(none,{events:[]});assert.equal(b.precision,null);assert.equal(b.recall,null);});
 test(name+': exact UTF-16 provenance with CRLF, LF and emoji',()=>{const raw='NOTE/🧭 synthetic//\r\n'+freq+'\nFLIGHT/A1/2026-11-04T23:30Z/2026-11-05T00:30Z/AIR/Deck 🛫//';const p=core.parseMessage(raw);assert.equal(p.events.length,2);for(const r of p.records)for(const f of Object.values(r.fields))assert.equal(raw.slice(f.span.start,f.span.end),f.sourceText);const single=core.parseMessage(freq).events[0];assert.deepEqual(plain(single.fields.id.span),{start:5,end:7});assert.deepEqual(plain(single.fields.start.span),{start:8,end:25});});
 test(name+': empty, invalid calendars and no zone cannot become events',()=>{assert.equal(core.parseMessage('').issues[0].code,'empty');for(const token of ['2026-02-30T08:00Z','2026-11-04T24:00Z','2026-11-04T08:00','2026-11-04T08:00+14:01','2100-01-01T00:00Z']){assert.equal(core.normalizeTimestamp(token),null);assert.equal(core.parseMessage(freq.replace('2026-11-04T08:00Z',token)).events.length,0);}assert.equal(core.normalizeTimestamp('2024-02-29T08:00Z'),'2024-02-29T08:00:00.000Z');});
 test(name+': duplicate groups, malformed fields and reversed intervals',()=>{const dup=core.parseMessage(freq+'\n'+freq);assert.equal(dup.events.length,0);assert.equal(dup.issues.filter(i=>i.code==='duplicate').length,2);for(const raw of [freq.slice(0,-1),freq.replace('/COMMS/','//'),freq.replace('/251.5/','/-3/'),freq.replace('/MHz/','/Hz/'),freq.replace('T12:00Z','T07:00Z'),'CRYPTO/C1/2026-11-04T08:00Z/2026-11-04T09:00Z/COMMS/REAL/No//'])assert.equal(core.parseMessage(raw).events.length,0);});
 test(name+': zone preservation and half-open daily boundaries',()=>{assert.equal(core.normalizeTimestamp('2026-11-04T10:00+02:00'),core.normalizeTimestamp('2026-11-04T08:00Z'));const p=core.parseMessage('FLIGHT/A1/2026-11-04T23:30Z/2026-11-05T00:30Z/AIR/Deck rehearsal//');assert.equal(p.events[0].durationMinutes,60);const a=core.projectDay(p.events,'2026-11-04'),b=core.projectDay(p.events,'2026-11-05');assert.equal(a.entries[0].visibleMinutes,30);assert.equal(a.entries[0].displayEnd,'24:00');assert.equal(a.entries[0].continues,true);assert.equal(b.entries[0].continued,true);assert.equal(b.entries[0].visibleMinutes,30);const midnight=core.parseMessage(p.raw.replace('05T00:30','05T00:00'));assert.equal(core.projectDay(midnight.events,'2026-11-05').entries.length,0);assert.ok(core.projectDay([], '2026-02-30').error);});
 test(name+': revisions, review, dirty persistence and export provenance',()=>{const s=core.freshSnapshot();s.draft=freq;core.commitDraft(s);assert.ok(core.buildExport(s,s.day).error);assert.ok(core.reviewSnapshot(s,false));assert.equal(core.reviewSnapshot(s,true),null);const exp=core.buildExport(s,s.day);assert.equal(exp.events[0].fields.value.sourceText,'251.5');assert.equal(exp.sourceHistory[0].raw,freq);assert.equal(exp.disclosure,core.disclosure);s.draft=freq.replace('Training net','Updated drill');assert.equal(core.reviewSnapshot(s,true),'Parse the edited source before review.');assert.equal(core.buildExport(s,s.day).error,'Parse and review the edited source before export.');const restored=core.restoreSnapshot(JSON.stringify(s)).snapshot;assert.equal(restored.draft,s.draft);assert.equal(core.isDirty(restored),true);core.commitDraft(s);assert.equal(s.history.length,2);assert.equal(s.history[0].raw,freq);assert.equal(s.reviewedId,null);core.commitDraft(s);assert.equal(s.history.length,2);assert.equal(core.reviewSnapshot(s,true),null);assert.equal(core.buildExport(s,s.day).events[0].fields.description.sourceText,'Updated drill');});
 test(name+': snapshot corruption and issue review rejection',()=>{for(const x of ['{','{}',JSON.stringify({...core.freshSnapshot(),reviewedId:'fake'})])assert.ok(core.restoreSnapshot(x).error);const s=core.freshSnapshot();s.draft='UNKNOWN/no//';core.commitDraft(s);assert.equal(core.reviewSnapshot(s,true),'Resolve all issues before review.');});
 test(name+': comparison detects discrepancies',()=>{const actual=core.parseMessage(key.raw);actual.events[0].startUtc='2026-11-04T09:00:00.000Z';actual.events[0].fields.owner.sourceText='Changed';actual.events[0].fields.owner.span.start=0;const r=core.compareAnswerKey(actual,key);assert.equal(r.matched,2);assert.equal(r.timeDiscrepancies,1);assert.equal(r.fieldDiscrepancies,1);assert.equal(r.spanDiscrepancies,1);});
}
test('inline and module produce identical complete behavior',()=>{for(const raw of [key.raw,freq,'',freq+'\r\n'+freq]){const a=C.parseMessage(raw,'eq'),b=inline.parseMessage(raw,'eq');assert.deepEqual(plain(a),plain(b));assert.deepEqual(plain(C.projectDay(a.events,'2026-11-04')),plain(inline.projectDay(b.events,'2026-11-04')));assert.deepEqual(plain(C.compareAnswerKey(a,key)),plain(inline.compareAnswerKey(b,key)));}const s=C.freshSnapshot();s.draft=freq;C.commitDraft(s);C.reviewSnapshot(s,true);assert.deepEqual(plain(C.buildExport(s,s.day)),plain(inline.buildExport(s,s.day)));});

for(const [name,core]of [['module',C],['inline',inline]]){
 test(name+': reserved object names cannot crash extraction or become record types',()=>{
  for(const id of ['constructor','toString','__proto__','hasOwnProperty']){
   const raw=freq.replace('/F1/','/'+id+'/');
   const parsed=core.parseMessage(raw);
   if(id==='__proto__') assert.equal(parsed.events.length,0);
   else {assert.equal(parsed.events.length,1);assert.equal(core.parseMessage(raw+'\n'+raw).events.length,0);}
  }
  for(const type of ['constructor','toString','__proto__']){
   const parsed=core.parseMessage(type+'/ignored//');
   assert.equal(parsed.events.length,0);assert.equal(parsed.issues[0].code,'unsupported');
  }
 });
 test(name+': positive frequency must be finite',()=>{
  assert.equal(core.parseMessage(freq.replace('/251.5/','/'+'9'.repeat(400)+'/')).events.length,0);
 });
 test(name+': input bounds, full-day clipping, replay and corrupt reviewed restoration',()=>{
  assert.equal(core.parseMessage(' '.repeat(200001)+'X').events.length,0);
  assert.match(core.parseMessage(' '.repeat(200001)+'X').issues[0].message,/200,000/);
  const p=core.parseMessage('FLIGHT/L1/2026-11-03T23:00Z/2026-11-06T01:00Z/AIR/Long synthetic rehearsal//');
  const d=core.projectDay(p.events,'2026-11-04');
  assert.equal(d.entries[0].visibleMinutes,1440);assert.equal(d.entries[0].continued,true);assert.equal(d.entries[0].continues,true);
  const s=core.freshSnapshot();s.draft=freq;core.commitDraft(s);core.reviewSnapshot(s,true);
  core.commitDraft(s);assert.equal(s.history.length,1);assert.equal(s.reviewedId,null);assert.ok(core.buildExport(s,s.day).error);
  core.reviewSnapshot(s,true);s.history[0].raw='FLIGHT/A/unknown/unknown/AIR/Invalid//';
  assert.ok(core.restoreSnapshot(JSON.stringify(s)).error);
 });
}

for(const [name,core]of [['module',C],['inline',inline]]){
 test(name+': planned calendar and missing-field boundaries',()=>{
  for(const token of ['1900-01-01T00:00Z','2099-12-31T23:59Z','2028-02-29T08:00Z','2026-11-04T08:00+14:00','2026-11-04T08:00-14:00']) assert.ok(core.normalizeTimestamp(token));
  for(const token of ['2026-02-29T08:00Z','1900-02-29T08:00Z','2026-11-04T08:00+14:30','tomorrow']) assert.equal(core.normalizeTimestamp(token),null);
  for(const raw of ['   \r\n',freq.replace('T12:00Z','T08:00Z'),freq.replace('/COMMS','')]) assert.equal(core.parseMessage(raw).events.length,0);
 });
 test(name+': benchmark measures missed and spurious events separately',()=>{
  const missing=core.parseMessage(key.raw);missing.events=missing.events.filter(e=>e.id!=='HA');
  const a=core.compareAnswerKey(missing,key);assert.equal(a.recall,2/3);assert.equal(a.missed,1);assert.equal(a.precision,1);
  const extra=core.parseMessage(key.raw+'\n'+freq.replace('/F1/','/X/'));
  const b=core.compareAnswerKey(extra,key);assert.equal(b.precision,3/4);assert.equal(b.falsePositives,1);assert.equal(b.recall,1);
 });
}
