'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const source=html.split('/* CORE_START */')[1].split('/* CORE_END */')[0];
const context=vm.createContext({TextEncoder});vm.runInContext(source+';globalThis.api=CyberCore;',context);
const apis=[['CommonJS',require('./core.cjs')],['inline browser factory',context.api]];
for(const [name,C] of apis){
 const raw=()=>JSON.stringify(C.sample), clone=x=>JSON.parse(JSON.stringify(x));
 const ready=()=>{const s=C.fresh();s.raw=raw();C.analyzeState(s);C.createProposal(s);s.reviewer='Training Reviewer';return s;};
 test(name+': seeded finding, benign control and exact citations',()=>{
 const a=C.analyze(raw());assert.equal(a.summary,'1 finding; 1 benign; 0 insufficient evidence.');assert.equal(a.findings[0].text,'LAB-A: Finding — auditEnabled=false; SYN-AUDIT r1 requires true.');assert.equal(a.findings[1].outcome,'benign');assert.equal(a.findings[0].evidence.excerpt,'auditEnabled=false');assert.equal(a.findings[0].evidence.sourcePointer,'/assets/0/excerpt');assert.equal(a.findings[0].control.excerpt.slice(...a.findings[0].control.offsets),C.baseline.excerpt);
 });
 test(name+': unknown, unsupported and temporal boundaries never imply compliance',()=>{
 for(const v of [null,undefined]){let b=clone(C.sample);b.assets=[b.assets[0]];b.assets[0].auditEnabled=v;b.assets[0].excerpt='auditEnabled=unknown';let a=C.analyze(JSON.stringify(b));assert.equal(a.summary,'0 findings; 0 benign; 1 insufficient evidence.');}
 for(const [field,value] of [['type','other'],['controlRevision','r2'],['controlId','OTHER'],['sourceTimestamp','2026-11-05T00:00:00Z'],['sourceTimestamp','2026-10-04T23:59:59Z']]){const b=clone(C.sample);b.assets[0][field]=value;assert.equal(C.analyze(JSON.stringify(b)).findings[0].outcome,'insufficient');}
 const b=clone(C.sample);b.assets[0].sourceTimestamp='2026-10-05T00:00:00Z';assert.equal(C.analyze(JSON.stringify(b)).findings[0].outcome,'finding');b.capturedAt='2027-01-01T00:00:00Z';assert.equal(C.analyze(JSON.stringify(b)).findings[0].outcome,'insufficient');
 });
 test(name+': invalid imports rejected atomically and raw draft retained',()=>{
 const s=ready();s.committed=null;s.draft=null;const prev=C.canonical(s.analysis);s.raw='{';assert.throws(()=>C.analyzeState(s),/Enter valid synthetic evidence JSON/);assert.equal(s.raw,'{');assert.equal(C.canonical(s.analysis),prev);
 for(const mutate of [b=>b.synthetic=false,b=>b.assets.push(b.assets[0]),b=>b.assets[1].evidenceId='CFG-A',b=>b.assets[0].auditEnabled='false',b=>b.assets[0].excerpt='auditEnabled=true',b=>b.assets[0].sourceTimestamp='2026-02-30T00:00:00Z',b=>b.executionStatus='verified',b=>b.assets[0].rollbackStatus='failed',b=>b.assets[0].partialRemediation=true]){const b=clone(C.sample);mutate(b);assert.throws(()=>C.validate(JSON.stringify(b)));}
 assert.throws(()=>C.validate('null'));assert.throws(()=>C.validate('{}'));
 });
 test(name+': byte and asset limits include exact boundaries',()=>{
 const r=raw();assert.doesNotThrow(()=>C.validate(r+' '.repeat(65536-Buffer.byteLength(r))));assert.throws(()=>C.validate(r+' '.repeat(65537-Buffer.byteLength(r))));const b=clone(C.sample);b.assets=Array.from({length:20},(_,i)=>({...b.assets[0],assetId:'ASSET-'+i,evidenceId:'CFG-'+i}));assert.equal(C.validate(JSON.stringify(b)).assets.length,20);b.assets.push({...b.assets[0],assetId:'ASSET-21',evidenceId:'CFG-21'});assert.throws(()=>C.validate(JSON.stringify(b)));
 });
 test(name+': SHA-256, canonical order and all proposal fields bind content',()=>{
 for(const v of ['', 'abc', 'synthetic 🔒', 'x'.repeat(1000)])assert.equal(C.sha256(v),crypto.createHash('sha256').update(v).digest('hex'));
 assert.equal(C.digest({a:1,b:{z:2,c:3}}),C.digest({b:{c:3,z:2},a:1}));const s=ready(),d=C.digest(s.committed);for(const key of ['assetId','after','rationale','prerequisites','rollback','verification','impact','finding']){const p=clone(s.committed);p[key]=key==='after'?false:key==='finding'?{...p.finding,control:{...p.finding.control,revision:'r2'}}:'changed';assert.notEqual(C.digest(p),d);}
 });
 test(name+': dirty draft blocks review/export, survives reload, save invalidates old review',()=>{
 let s=ready();C.review(s);const old=C.copy(s.review);assert.equal(C.reviewed(s),true);C.edit(s,'Review local logging gaps before any lab change.');assert.equal(C.reviewed(s),false);assert.throws(()=>C.review(s),/Save or discard/);assert.throws(()=>C.exportHandoff(s));s=C.restore(JSON.stringify(s));assert.equal(s.draft.rationale,'Review local logging gaps before any lab change.');C.discard(s);assert.equal(C.reviewed(s),true);C.edit(s,'Review local logging gaps before any lab change.');C.save(s);assert.equal(s.committed.revision,2);assert.equal(s.review,null);s.review=old;assert.equal(C.reviewed(s),false);s=C.restore(JSON.stringify(s));assert.equal(s.review,null);C.review(s);assert.equal(C.reviewed(s),true);C.save(s);assert.equal(s.committed.revision,2);C.edit(s,'');assert.throws(()=>C.save(s),/rationale/);
 });
 test(name+': review and evidence replacement require deliberate decisions',()=>{
 const s=ready();s.reviewer=' ';assert.throws(()=>C.review(s),/reviewer label/);s.reviewer='Analyst';C.review(s,'rejected');assert.equal(C.reviewed(s),false);assert.equal(s.history[0].decision,'rejected');assert.throws(()=>C.analyzeState(s),/Discard/);C.review(s);assert.equal(s.history.length,2);
 const u=C.fresh();const b=clone(C.sample);b.assets[0].auditEnabled=null;b.assets[0].excerpt='auditEnabled=unknown';b.assets=b.assets.slice(0,1);u.raw=JSON.stringify(b);C.analyzeState(u);assert.throws(()=>C.createProposal(u),/supported finding/);
 });
 test(name+': portable handoff retains evidence and ordered events, never execution outcomes',()=>{
 const s=ready();C.review(s);const h=C.exportHandoff(s);assert.equal(h.executionStatus,'not executed');assert.equal(h.verificationStatus,'not verified');assert.equal(h.rollbackStatus,'not executed');assert.equal(h.proposalDigest,C.digest(h.proposal));assert.equal(h.events.at(-1).action,'export requested');h.events.forEach((e,i)=>assert.equal(e.sequence,i+1));assert.equal(h.analysis.findings[0].evidence.sourceTimestamp,'2026-11-01T12:00:00Z');assert.equal(h.proposal.before,false);assert.equal(h.proposal.after,true);assert.ok(h.proposal.rollback.includes('restore auditEnabled=false'));assert.equal(C.reviewed(C.restore(JSON.stringify(s))),true);
 });
 test(name+': corrupt and denied storage fail visibly, memory state remains intact',()=>{
 assert.throws(()=>C.restore('{'),/Stored work/);assert.throws(()=>C.restore('{"schemaVersion":1}'),/Stored work/);const s=ready();assert.equal(C.persist({setItem(){throw Error('Quota exceeded');}},s),false);assert.equal(s.committed.assetId,'LAB-A');let stored;assert.equal(C.persist({setItem(k,v){stored=v;}},s),true);assert.equal(C.restore(stored).committed.assetId,'LAB-A');
 });
 test(name+': review replay with mismatched proposal identity is rejected',()=>{
 const s=ready();C.review(s);s.review.proposalId='OTHER-PROPOSAL';
 assert.equal(C.reviewed(s),false);
 assert.throws(()=>C.exportHandoff(s),/Save and review/);
 const restored=C.restore(JSON.stringify(s));assert.equal(restored.review,null);
 assert.equal(restored.events.at(-1).action,'review invalidated');
 C.review(restored);assert.equal(C.reviewed(restored),true);
 });
 test(name+': multibyte byte limits and empty collections reject without losing analysis',()=>{
 const b=clone(C.sample);b.assets=[];assert.throws(()=>C.validate(JSON.stringify(b)));
 const r=raw();const padded=r+' '.repeat(65534-Buffer.byteLength(r))+'\u00a0';
 assert.equal(Buffer.byteLength(padded),65536);assert.throws(()=>C.validate(padded),/valid synthetic evidence JSON/);
 assert.throws(()=>C.validate(padded+' '),/65536 UTF-8 bytes/);
 const s=ready();s.committed=null;s.draft=null;const previous=C.canonical(s.analysis);
 s.raw=JSON.stringify(b);assert.throws(()=>C.analyzeState(s));assert.equal(C.canonical(s.analysis),previous);
 });

}
