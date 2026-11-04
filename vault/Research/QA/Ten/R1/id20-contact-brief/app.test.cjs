'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const context=vm.createContext({});
vm.runInContext(html.match(/<script id="contact-core">([\s\S]*?)<\/script>/)[1],context);
const C=context.ContactCore;
const copy=value=>JSON.parse(JSON.stringify(value));
const lookup=(name,docs)=>C.lookup('name',name,C.identities,docs);
function documentWith(text,value='TEST-Z'){return {...copy(C.snapshots[0]),id:'test-z',text,spans:[{field:'flag',start:0,end:text.length,text,value}]};}
test('RET-01: eligible retrieval excludes a strictly stronger lexical match and resolves exact metadata',()=>{
 assert.equal(C.score(C.snapshots.find(d=>d.id==='excluded-reg-a')),1);
 assert.equal(C.score(C.snapshots[0]),0.5);
 const r=lookup('Synthetic Lumen');
 assert.equal(r.currentFacts.flag.value,'TEST-A');
 assert.deepEqual(copy(r.evidenceResults.map(e=>e.id)),['reg-a']);
 const resolved=C.resolve(r.evidenceResults[0]);
 assert.equal(resolved.span.text,'Synthetic Lumen flag: TEST-A.');
 assert.equal(resolved.span.start,0);assert.equal(resolved.span.end,29);
 assert.equal(resolved.doc.locator,'synthetic://registry/reg-a/r1');
 assert.equal(resolved.doc.sourceTime,'2026-11-01T09:00:00Z');
 assert.equal(resolved.doc.capturedTime,'2026-11-01T10:00:00Z');
 const excluded=C.snapshots.find(d=>!d.eligible);
 assert.equal(C.resolve({id:excluded.id,revision:'r1',...excluded.spans[0]}),null);
 assert.equal(C.lookup('name','Synthetic Lumen',C.identities,[excluded]).status,'unknown');
});
test('RET-01: citation references reject broken offsets, revisions, missing and duplicate snapshots',()=>{
 const ref=copy(lookup('Synthetic Lumen').evidenceResults[0]);
 for(const patch of [{start:-1},{end:0},{end:200},{revision:'r2'},{id:'absent'},{text:'wrong'},{value:'wrong'}])assert.equal(C.resolve({...ref,...patch}),null);
 assert.equal(C.resolve(ref,[C.snapshots[0],C.snapshots[0]]),null);
 for(const patch of [{start:-1},{start:12,end:2},{end:999},{text:'invented'}]){
 const doc=copy(C.snapshots[0]);Object.assign(doc.spans[0],patch);
 assert.equal(lookup('Synthetic Lumen',[doc]).currentFacts.flag,undefined);
 }
});
test('RET-01: Unicode and markup remain exact literal source data',()=>{
 const doc=documentWith('😀 <script>literal</script> flag: TEST-Z.');
 const r=lookup('Synthetic Lumen',[doc]);
 assert.equal(r.currentFacts.flag.value,'TEST-Z');
 const span=C.resolve(r.evidenceResults[0],[doc]).span;
 assert.equal(span.text,'😀 <script>literal</script> flag: TEST-Z.');
 assert.equal(span.start,0);assert.equal(span.end,41);
});
test('Identity is exact and ambiguous names are never merged',()=>{
 const twin=lookup('Synthetic Twin');assert.equal(twin.status,'ambiguous');assert.equal(twin.selectedIdentity,null);assert.equal(twin.candidates.length,2);
 const selected=C.lookup('name','Synthetic Twin',undefined,undefined,'SYN-D');assert.equal(selected.currentFacts.flag.value,'TEST-D');
 for(const [type,value] of [['imo','9000004'],['mmsi','990000004']])assert.equal(C.lookup(type,value).selectedIdentity.key,'SYN-D');
 for(const [type,value] of [['imo','900000'],['mmsi','99000000']])assert.equal(C.lookup(type,value).status,'invalid');
 assert.equal(C.lookup('imo','1900000').status,'unknown');
 assert.equal(lookup('  SYNTHETIC   lumen ').selectedIdentity.key,'SYN-A');
 assert.equal(lookup('Lumen').status,'unknown');
});
test('RET-02: stale and missing evidence produce UNKNOWN, recoverable input yields a new result',()=>{
 const ember=lookup('Synthetic Ember');assert.equal(ember.currentFacts.flag,undefined);assert.equal(ember.historicalEvidence[0].value,'TEST-B');
 assert.equal(C.resolve(ember.historicalEvidence[0]).doc.sourceTime,'2026-01-01T09:00:00Z');
 assert.equal(lookup('Synthetic Missing').status,'unknown');
 assert.equal(lookup('').error,'Enter a vessel name, IMO or MMSI.');
 const lumen=lookup('Synthetic Lumen');assert.equal(lumen.currentFacts.flag.value,'TEST-A');assert.equal(lumen.currentFacts.destination,undefined);assert.equal(lumen.currentFacts.sanctions,undefined);
});
test('RET-02: exact freshness boundary and invalid clocks cannot support current facts',()=>{
 const at=new Date(Date.parse(C.AS_OF)-90*86400000).toISOString();
 const doc=copy(C.snapshots[0]);doc.sourceTime=at;doc.capturedTime=at;assert.equal(C.freshness(doc),'current');
 doc.sourceTime=new Date(Date.parse(at)-1).toISOString();assert.equal(C.freshness(doc),'stale');assert.equal(lookup('Synthetic Lumen',[doc]).currentFacts.flag,undefined);
 for(const patch of [{sourceTime:''},{sourceTime:null},{sourceTime:'bad'},{sourceTime:'2026-11-05T09:00:00Z'},{capturedTime:'2026-11-05T09:00:00Z'},{capturedTime:'2026-10-01T09:00:00Z'},{capturedTime:''}]){
 const bad={...copy(C.snapshots[0]),...patch};assert.equal(C.freshness(bad),'invalid');assert.equal(lookup('Synthetic Lumen',[bad]).currentFacts.flag,undefined);
 }
});
test('Conflicting current values stay unknown with inspectable evidence',()=>{
 const doc=documentWith('Synthetic Lumen flag: TEST-Z.');const docs=[copy(C.snapshots[0]),doc];const r=lookup('Synthetic Lumen',docs);
 assert.equal(r.currentFacts.flag,undefined);assert.equal(r.evidenceResults.length,2);assert.equal(r.notices[0],'Conflicting flag evidence; current fact UNKNOWN.');
 for(const ref of r.evidenceResults)assert.ok(C.resolve(ref,docs));
});

test('RET-02: impossible calendar dates are invalid rather than normalized',()=>{
 for(const sourceTime of ['2026-02-30T09:00:00Z','2026-11-01T24:00:00Z']){
  const doc={...copy(C.snapshots[0]),sourceTime};
  assert.equal(C.freshness(doc),'invalid');
  assert.equal(lookup('Synthetic Lumen',[doc]).evidenceResults.length,0);
 }
});
test('RET-01: incomplete provenance and missing spans fail closed',()=>{
 const ref=copy(lookup('Synthetic Lumen').evidenceResults[0]);
 for(const patch of [{locator:''},{id:''},{revision:''},{spans:undefined},{spans:null}]){
  const doc={...copy(C.snapshots[0]),...patch};
  assert.equal(C.resolve({...ref,id:doc.id,revision:doc.revision},[doc]),null);
  assert.equal(lookup('Synthetic Lumen',[doc]).currentFacts.flag,undefined);
 }
});
test('RET-01: candidate selection cannot escape the matching identity set',()=>{
 assert.equal(C.lookup('name','Synthetic Twin',undefined,undefined,'SYN-A').selectedIdentity,null);
 const denied=copy(C.snapshots).map(d=>({...d,eligible:d.identityKey!=='SYN-D'&&d.eligible}));
 assert.equal(C.lookup('name','Synthetic Twin',undefined,denied,'SYN-D').selectedIdentity,null);
 assert.equal(C.lookup('imo','90000040').status,'invalid');
 assert.equal(C.lookup('mmsi','9900000040').status,'invalid');
});
