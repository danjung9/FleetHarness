const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const script=html.match(/<script id="app-core">([\s\S]*?)<\/script>/)[1];
const context=vm.createContext({TextEncoder,performance});
vm.runInContext(script+'\nglobalThis.core=ContactCore;',context);
const C=context.core, plain=x=>JSON.parse(JSON.stringify(x));
const brief=(c,type='imo',query='9000003',choice)=>C.assemble(c,C.resolve(c,type,query),choice);
test('SHA-256 known vectors, UTF-8 and exact original UTF-16 spans',()=>{
 for(const s of ['', 'abc', 'é🚢\nOriginal\r\n'])assert.equal(C.sha256(s),crypto.createHash('sha256').update(s).digest('hex'));
 for(const d of C.samples())for(const s of d.spans)assert.equal(d.text.slice(s.start,s.end),s.excerpt);
});
test('atomic validation rejects missing metadata, duplicate IDs, malformed dates and spans',()=>{
 const c=C.samples();assert.equal(c.length,8);assert.throws(()=>C.diagnostic(c,'malformed'),/BAD-1 is missing capturedAt/);assert.equal(c.length,8);
 const copy=plain(c);copy.push(copy[0]);assert.throws(()=>C.validate(copy),/Duplicate/);
 for(const mutation of [d=>d.capturedAt='2026-02-30T11:00:00Z',d=>d.spans[0].start=-1,d=>d.spans[0].excerpt='invented',d=>d.text+='changed']){const n=plain(c);mutation(n[0]);assert.throws(()=>C.validate(n));}
});
test('identity normalization, exact joins, ambiguity and abstention',()=>{
 const c=C.samples();assert.equal(C.resolve(c,'imo',' IMO 9000003 ').selected.id,'A');assert.equal(C.resolve(c,'mmsi','999000101').selected.id,'A');
 const r=C.resolve(c,'name','  alder   reach ');assert.equal(r.status,'ambiguous');assert.deepEqual(plain(r.candidates.map(x=>x.id)),['A','B']);assert.equal(C.assemble(c,r),null);const b=C.assemble(c,r,'B');assert.equal(b.vessel.imo,'9000015');assert.match(b.fields.find(f=>f.key==='sanctions').text,/EU-B:designation/);assert.doesNotMatch(JSON.stringify(b),/North Lantern/);
 assert.equal(C.resolve(c,'name','NO SUCH VESSEL').status,'unknown');for(const [type,q] of [['imo','12'],['imo','9000003x'],['mmsi','999'],['name',' ']])assert.throws(()=>C.resolve(c,type,q));
 const onlyDenied=c.filter(d=>!d.permitted);assert.equal(C.resolve(onlyDenied,'imo','9000003').status,'unknown');
});
test('denied strongest lexical hit excluded before scoring, future filtered and no export leakage',()=>{
 const c=C.samples(),q='ALDER REACH owner North Lantern';assert.equal(C.rank(c,q)[0].id,'DENIED-A');assert.deepEqual(plain(C.search(c,q).map(d=>d.id)),['REG-A']);assert.equal(C.search(c,q)[0].spans.find(s=>s.id==='owner').excerpt,'Registered owner: North Lantern Shipping Ltd.');
 assert.equal(C.eligible(c).length,6);const b=brief(c),out=C.exportBrief(c,b);assert.doesNotMatch(out,/RESTRICTED-ORCHID-77|DENIED-A|FUTURE-A/);assert.doesNotMatch(JSON.stringify(C.search(c,q)),/RESTRICTED-ORCHID-77|DENIED-A/);
});
test('time boundary separates capture, observation and unknown time',()=>{
 assert.equal(C.freshness('2026-10-05T12:00:00Z'),'fresh');assert.equal(C.freshness('2026-10-05T11:59:59.999Z'),'STALE');assert.equal(C.freshness(null),'UNKNOWN');assert.equal(C.freshness('2026-11-05T12:00:00Z'),'future');
 const c=C.samples(),p=C.citation(c,'PORT-A:call').document;assert.equal(C.freshness(p.capturedAt),'fresh');assert.equal(C.freshness(p.observedAt),'STALE');assert.equal(C.citation(c,'OFAC-A:name-match').document.observedAt,null);
 const future=plain(c[0]);future.observedAt='2026-11-05T10:00:00Z';assert.equal(C.eligible([future]).length,0);
});
test('actual brief facts and all factual references resolve to exact original permitted spans',()=>{
 const c=C.samples(),b=brief(c);assert.equal(b.vessel.mmsi,'999000101');
 const fields=Object.fromEntries(b.fields.map(f=>[f.key,f.text]));assert.equal(fields.owner,'Registered owner: North Lantern Shipping Ltd. [REG-A:owner]');assert.equal(fields.ais,'Last supported AIS: 36.90 N, 76.30 W at 2026-11-04T10:00:00Z [AIS-A:position]');assert.equal(fields.flag,'Flag: UNKNOWN');assert.equal(fields.intent,'Intent: UNKNOWN');assert.equal(fields.sanctions,'Sanctions status: UNKNOWN — name-only OFAC match; EU evidence absent.');assert.match(fields.port,/STALE; not current location/);
 for(const ref of b.refs){const {document:d,span:s}=C.citation(c,ref);assert.equal(d.permitted,true);assert.equal(d.text.slice(s.start,s.end),s.excerpt);assert.equal(C.sha256(d.text),d.expectedDigest);}
 assert.throws(()=>C.citation(c,'REG-A:invented'));assert.throws(()=>C.citation(c,'DENIED-A:identity'));
});
test('tamper withholds affected owner, blocks viewing and export; original restore recovers',()=>{
 const c=C.samples(),bad=C.diagnostic(c,'tampered'),b=brief(bad);assert.equal(b.fields.find(f=>f.key==='owner').text,'Registered owner: UNKNOWN — snapshot integrity failure.');assert.throws(()=>C.citation(bad,'REG-A:owner'),/integrity/);assert.throws(()=>C.exportBrief(bad,b),/restore verified/);assert.match(brief(C.samples()).fields[0].text,/North Lantern/);
});
test('equal-time conflicting AIS is deterministic and withholds location',()=>{
 const c=C.diagnostic(C.samples(),'conflicting-ais'),a=brief(c),b=brief([...c].reverse());assert.equal(a.fields.find(f=>f.key==='ais').text,'Last supported AIS: UNKNOWN — conflicting observations at 2026-11-04T10:00:00Z.');assert.deepEqual(plain(a.conflict),plain(b.conflict));assert.deepEqual(plain(a.conflict.map(x=>x.value)),['36.90 N, 76.30 W','35.10 N, 75.00 W']);
});
test('portable HTML resolves every anchor and safely retains evidence and unverified note',()=>{
 const c=C.samples(),b=brief(c),out=C.exportBrief(c,b,'<script>alert("x")</script>',true);
 const targets=[...out.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);for(const m of out.matchAll(/href="#([^"]+)"/g))assert.ok(targets.includes(m[1]),'unresolved anchor '+m[1]);
 for(const ref of b.refs){const {document:d,span:s}=C.citation(c,ref);assert.ok(out.includes(C.esc(s.excerpt)));assert.ok(out.includes(d.expectedDigest));assert.ok(out.includes(d.capturedAt));}
 assert.match(out,/Identity Resolution Record/);assert.match(out,/Evidence Appendix/);assert.match(out,/&lt;script&gt;/);assert.doesNotMatch(out,/<script|https?:\/\//);assert.match(out,/Unverified human commentary/);
});
test('review state separates draft, saved note and bound acknowledgement',()=>{
 let r=C.review('original','changed',true,'ack');assert.equal(r.ack,true); // committed review preserved, UI must block dirty draft
 r=C.review('original','changed',true,'save');assert.equal(r.saved,'changed');assert.equal(r.ack,false);r=C.review(r.saved,r.draft,false,'ack');assert.equal(r.ack,true);
 r=C.review(r.saved,'unsaved',r.ack,'discard');assert.equal(r.draft,'changed');assert.equal(r.ack,true);assert.equal(C.review(r.saved,r.draft,true,'new-evidence').ack,false);
});
test('six held-out cases use real pipeline, actual timing, correct relevance and pending owner',()=>{
 const r=C.evaluate(C.samples(),{runtime:process.version,hardware:'unknown'});assert.equal(r.passed,6);assert.equal(r.relevant,4);assert.equal(r.retrieved,4);assert.equal(r.correct,4);assert.equal(r.precision,1);assert.equal(r.recall,1);assert.equal(r.leaks,0);assert.equal(r.corpus,8);assert.equal(r.permitted,7);assert.equal(r.eligible,6);assert.equal(r.sampleCount,120);assert.equal(r.durations.length,120);assert.ok(r.durations.every(x=>Number.isFinite(x)&&x>=0));assert.ok(r.p95>=r.p50);assert.equal(r.ownerReview,'PENDING');assert.equal(r.environment.runtime,process.version);
 assert.equal(C.percentile([],0.5),null);assert.equal(C.percentile([4],.95),4);assert.equal(C.percentile(Array.from({length:20},(_,i)=>i+1),.5),10);assert.equal(C.percentile(Array.from({length:20},(_,i)=>i+1),.95),19);
});

test('stale AIS is visibly historical and unknown observation cannot establish latest location',()=>{
 const c=plain(C.samples());c.find(d=>d.id==='AIS-A').observedAt='2026-08-01T08:00:00Z';
 assert.match(brief(c).fields.find(f=>f.key==='ais').text,/STALE/);
 c.find(d=>d.id==='AIS-A').observedAt=null;
 assert.equal(brief(c).fields.find(f=>f.key==='ais').text,'Last supported AIS: UNKNOWN');
});
test('citation rejects trailing components rather than aliasing a supported reference',()=>{
 assert.throws(()=>C.citation(C.samples(),'REG-A:owner:invented'));
});
test('export rejects altered asserted values even when the reference itself exists',()=>{
 const c=C.samples(),b=plain(brief(c));b.fields.find(f=>f.key==='owner').text='Registered owner: Invented Shipping Ltd. [REG-A:owner]';
 assert.throws(()=>C.exportBrief(c,b),/committed|unsupported|mismatch/i);
});
test('conflicting identity identifiers withhold selection independent of source order',()=>{
 const c=plain(C.samples()),d=c.find(d=>d.id==='AIS-A');
 d.text=d.text.replace('9000003','9000099');d.spans[0].excerpt=d.text.slice(d.spans[0].start,d.spans[0].end);d.expectedDigest=C.sha256(d.text);
 for(const corpus of [c,[...c].reverse()])assert.equal(C.resolve(corpus,'imo','9000003').status,'unknown');
});
test('empty and unmatched lexical queries abstain, duplicate tokens do not change results',()=>{
 const c=C.samples();assert.deepEqual(plain(C.search(c,'  ')),[]);assert.deepEqual(plain(C.search(c,'NONEXISTENT-TOKEN')),[]);
 assert.deepEqual(plain(C.search(c,'owner owner North Lantern')),plain(C.search(c,'owner North Lantern')));
});
test('portable export retains deliberate ambiguous selection and refuses changed identity metadata',()=>{
 const c=C.samples(),b=brief(c,'name','ALDER REACH','B'),out=C.exportBrief(c,b);
 assert.match(out,/EU-B:designation/);assert.doesNotMatch(out,/North Lantern/);
 const altered=plain(b);altered.vessel.mmsi='999999999';assert.throws(()=>C.exportBrief(c,altered),/committed evidence mismatch/);
});

test('actual UI diagnostic handler refreshes identity, blocks export and restores owner',()=>{
 const elements=new Map();
 function element(id=''){return {id,value:'',textContent:'',hidden:false,checked:false,children:[],append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},focus(){}};}
 const get=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id);};
 const storage=new Map();
 const ui=vm.createContext({TextEncoder,performance,document:{getElementById:get,createElement:()=>{const node=element();Object.defineProperty(node,'id',{get(){return this.elementId;},set(id){this.elementId=id;elements.set(id,this);}});return node;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
 const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 for(const source of scripts)vm.runInContext(source,ui);
 get('load-samples').onclick();get('query-type').value='imo';get('query').value='9000003';
 get('query-form').onsubmit({preventDefault(){}});
 assert.equal(get('brief-owner').textContent,'Registered owner: North Lantern Shipping Ltd. [REG-A:owner]');
 get('cite-owner').onclick();assert.equal(get('snapshot-integrity').textContent,'Integrity: verified');
 get('diagnostic-case').value='tampered';get('apply-diagnostic').onclick();
 assert.equal(get('integrity-error').textContent,'REG-A integrity mismatch. Affected claims and export blocked; restore samples.');
 assert.equal(get('brief-owner').textContent,'Registered owner: UNKNOWN — snapshot integrity failure.');
 assert.equal(get('snapshot-text').textContent,'');
 get('export-brief').onclick();assert.equal(get('export-status').textContent,'Export blocked: restore verified snapshots.');
 const stored=JSON.parse(storage.get('synthetic-contact-v1'));assert.equal(stored.record.selected.ref,'AIS-A:identity');
 get('restore-samples').onclick();get('query-form').onsubmit({preventDefault(){}});get('cite-owner').onclick();
 assert.equal(get('brief-owner').textContent,'Registered owner: North Lantern Shipping Ltd. [REG-A:owner]');
 assert.equal(get('snapshot-integrity').textContent,'Integrity: verified');
});
