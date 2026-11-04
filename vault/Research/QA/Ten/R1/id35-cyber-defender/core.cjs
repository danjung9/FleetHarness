/* Shared application factory; embedded unchanged in index.html. */
function createCyberCore() {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const asOf = '2026-11-04T00:00:00Z';
  const baseline = {controlId:'SYN-AUDIT',revision:'r1',sourceTimestamp:'2026-11-01T00:00:00Z',source:'baseline/SYN-AUDIT/r1',excerpt:'For training-service assets, auditEnabled must be true.',offsets:[0,55]};
  const sample = {schemaVersion:1,synthetic:true,bundleId:'SYN-SEED-1',capturedAt:'2026-11-01T12:00:00Z',assets:[false,true].map((v,i)=>({assetId:'LAB-'+(i?'B':'A'),type:'training-service',evidenceId:'CFG-'+(i?'B':'A'),revision:'r1',sourceTimestamp:'2026-11-01T12:00:00Z',controlId:'SYN-AUDIT',controlRevision:'r1',excerpt:'auditEnabled='+v,auditEnabled:v}))};
  const canonical = x => JSON.stringify(sort(x));
  function sort(x) { if(Array.isArray(x)) return x.map(sort); if(x && typeof x==='object') return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])); return x; }
  // SHA-256 over UTF-8, also available in file:// contexts without Web Crypto.
  function sha256(input) {
    const data = Array.from(new TextEncoder().encode(input)); const bits=data.length*8;
    data.push(128); while(data.length%64!==56) data.push(0);
    for(let i=7;i>=0;i--) data.push(Math.floor(bits/2**(i*8))&255);
    const primes=[]; for(let n=2;primes.length<64;n++) {let ok=true;for(let d=2;d*d<=n;d++)if(n%d===0){ok=false;break;}if(ok)primes.push(n);}
    let h=primes.slice(0,8).map(n=>(Math.sqrt(n)%1*2**32)|0);
    const k=primes.map(n=>(Math.cbrt(n)%1*2**32)|0), r=(x,n)=>(x>>>n)|(x<<(32-n));
    for(let off=0;off<data.length;off+=64) {
      const w=[]; for(let i=0;i<16;i++)w[i]=(data[off+i*4]<<24)|(data[off+i*4+1]<<16)|(data[off+i*4+2]<<8)|data[off+i*4+3];
      for(let i=16;i<64;i++)w[i]=(w[i-16]+(r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3))+w[i-7]+(r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10)))|0;
      let [a,b,c,d,e,f,g,z]=h;
      for(let i=0;i<64;i++){const t=(z+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]+w[i])|0;const u=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))|0;z=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+u)|0;}
      h=h.map((v,i)=>(v+[a,b,c,d,e,f,g,z][i])|0);
    }
    return h.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');
  }
  const digest = p => sha256(canonical(p));
  const id = x => typeof x==='string' && /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(x);
  const stamp = x => typeof x==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().replace('.000Z','Z')===x.replace('.000Z','Z');
  const current = x => {const age=Date.parse(asOf)-Date.parse(x);return age>=0 && age<=30*86400000;};
  function validate(raw) {
    if(typeof raw!=='string'||new TextEncoder().encode(raw).length>65536) throw Error('Evidence must be at most 65536 UTF-8 bytes.');
    let b;try{b=JSON.parse(raw);}catch{throw Error('Enter valid synthetic evidence JSON.');}
    const keys=(o,allowed)=>o && typeof o==='object' && !Array.isArray(o) && Object.keys(o).every(k=>allowed.includes(k));
    if(!keys(b,['schemaVersion','synthetic','bundleId','capturedAt','assets']) || b.schemaVersion!==1 || b.synthetic!==true || !id(b.bundleId)||!stamp(b.capturedAt)||!Array.isArray(b.assets)||b.assets.length<1||b.assets.length>20)throw Error('Use a synthetic version 1 bundle with 1–20 assets and a valid UTC timestamp.');
    const ids=new Set(),refs=new Set();
    for(const a of b.assets){
      if(!keys(a,['assetId','type','evidenceId','revision','sourceTimestamp','controlId','controlRevision','excerpt','auditEnabled'])||!['assetId','evidenceId','revision','controlId','controlRevision'].every(k=>id(a[k]))||typeof a.type!=='string'||!a.type.trim()||!stamp(a.sourceTimestamp)||typeof a.excerpt!=='string'||!a.excerpt.trim()||a.excerpt.length>1000||![true,false,null,undefined].includes(a.auditEnabled)||ids.has(a.assetId)||refs.has(a.evidenceId)) throw Error('Check unique asset/evidence IDs, fields, Boolean values and UTC timestamps.');
      if(a.excerpt!=='auditEnabled='+(a.auditEnabled==null?'unknown':a.auditEnabled))throw Error('The evidence excerpt must match auditEnabled exactly.');
      ids.add(a.assetId);refs.add(a.evidenceId);
    }
    return b;
  }
  function analyze(raw) {
    const b=validate(raw);
    const findings=b.assets.map((a,i)=>{
      const unknown=a.auditEnabled==null;
      const supported=a.type==='training-service'&&a.controlId==='SYN-AUDIT'&&a.controlRevision==='r1'&&current(a.sourceTimestamp)&&current(b.capturedAt)&&current(baseline.sourceTimestamp);
      const outcome=unknown||!supported?'insufficient':a.auditEnabled?'benign':'finding';
      const reason=outcome==='finding'?'auditEnabled=false; SYN-AUDIT r1 requires true.':outcome==='benign'?'auditEnabled=true matches SYN-AUDIT r1.':unknown?'auditEnabled is unknown; obtain a current configuration snapshot.':'Evidence is stale, future-dated or unsupported; obtain a current applicable snapshot.';
      return {findingId:'F-'+(i+1),bundleId:b.bundleId,assetId:a.assetId,outcome,observed:a.auditEnabled??null,expected:true,reason,text:a.assetId+': '+(outcome==='finding'?'Finding':outcome==='benign'?'No finding':'Insufficient evidence')+' — '+reason,evidence:{evidenceId:a.evidenceId,revision:a.revision,sourceTimestamp:a.sourceTimestamp,sourcePointer:'/assets/'+i+'/excerpt',excerpt:a.excerpt,offsets:[0,a.excerpt.length]},control:copy(baseline),uncertainties:['Synthetic correlation only; exploitation and mission impact are unknown.'],nextStep:outcome==='insufficient'?'Obtain a current applicable configuration snapshot.':'Ask an authorized lab owner to review applicability before any change.'};
    });
    const n=o=>findings.filter(f=>f.outcome===o).length, count=n('finding');
    return {bundle:b,raw,asOf,findings,summary:count+' '+(count===1?'finding':'findings')+'; '+n('benign')+' benign; '+n('insufficient')+' insufficient evidence.'};
  }
  function fresh() {return {schemaVersion:1,raw:'',analysis:null,committed:null,draft:null,review:null,history:[],events:[],reviewer:'',evidenceError:'',proposalError:''};}
  function event(s,action,reason='',success=true){s.events.push({sequence:s.events.length+1,eventId:'E-'+(s.events.length+1),timestamp:new Date().toISOString(),actor:s.reviewer||'Synthetic analyst',action,success,reason,bundleId:s.analysis?.bundle.bundleId||null,proposalId:s.committed?.proposalId||null,revision:s.committed?.revision||null,digest:s.committed?digest(s.committed):null});}
  const dirty=s=>!!s.committed&&canonical(s.draft)!==canonical(s.committed);
  function analyzeState(s) {if(s.committed)throw Error('Discard the current proposal before replacing its evidence.');try{s.analysis=analyze(s.raw);s.evidenceError='';event(s,'analysis');}catch(e){s.evidenceError=e.message;event(s,'analysis',e.message,false);throw e;}}
  function createProposal(s){
    if(s.committed)return;
    const f=s.analysis?.findings.find(f=>f.outcome==='finding');if(!f)throw Error('A supported finding is required to create a proposal.');
    s.committed={proposalId:'SYN-PROP-1',revision:1,bundleId:s.analysis.bundle.bundleId,assetId:f.assetId,setting:'auditEnabled',before:false,after:true,finding:copy(f),rationale:'Disabled audit logging may leave local activity unrecorded in this training scenario.',prerequisites:'Obtain authorized lab access, capture the current configuration and confirm control applicability.',verification:'In an authorized lab, confirm auditEnabled=true and inspect a new local test event.',rollback:'In the same authorized lab, restore auditEnabled=false from the captured prior configuration and verify the restored value.',impact:'Potential missing local audit records in the synthetic scenario; mission impact is unknown.',gaps:['No execution adapter, authenticated reviewer or approved STIG baseline supplied.'],responsibleRole:'Synthetic system-owner reviewer'};
    s.draft=copy(s.committed);s.review=null;event(s,'proposal created');
  }
  function edit(s,value){if(!s.draft)throw Error('Create a proposal first.');const was=dirty(s);s.draft.rationale=value;if(!was&&dirty(s))event(s,'draft changed','Current review suspended until save or discard.');}
  function save(s){if(!s.committed)throw Error('Create a proposal first.');if(!s.draft.rationale.trim())throw Error('Enter a rationale before saving.');if(!dirty(s)){event(s,'save no-op');return;}s.committed=copy(s.draft);s.committed.revision++;s.draft=copy(s.committed);s.review=null;event(s,'review invalidated','Proposal content changed.');event(s,'proposal saved');}
  function discard(s){s.draft=copy(s.committed);s.proposalError='';event(s,'draft discarded');}
  function review(s,decision='reviewed'){
    if(!s.committed)throw Error('Create a proposal first.');
    if(dirty(s)){event(s,'review blocked','Unsaved changes',false);throw Error('Save or discard draft changes before review.');}
    if(!s.reviewer.trim()){event(s,'review blocked','Missing reviewer',false);throw Error('Enter a synthetic reviewer label.');}
    if(!['reviewed','rejected'].includes(decision))throw Error('Unsupported review decision.');
    s.review={proposalId:s.committed.proposalId,revision:s.committed.revision,digest:digest(s.committed),reviewer:s.reviewer.trim(),decision,timestamp:new Date().toISOString()};s.history.push(copy(s.review));event(s,decision);
  }
  const reviewed=s=>!!s.committed&&!dirty(s)&&s.review?.decision==='reviewed'&&s.review.proposalId===s.committed.proposalId&&s.review.digest===digest(s.committed)&&s.review.revision===s.committed.revision;
  function exportHandoff(s){if(!reviewed(s))throw Error('Save and review the current proposal before export.');event(s,'export requested');return {schemaVersion:1,synthetic:true,bundle:s.analysis.bundle,rawSource:s.analysis.raw,baseline:copy(baseline),analysis:copy(s.analysis),proposal:copy(s.committed),proposalDigest:digest(s.committed),review:copy(s.review),reviewHistory:copy(s.history),events:copy(s.events),uncertainties:s.committed.gaps,impact:s.committed.impact,nextActions:s.committed.prerequisites,executionStatus:'not executed',verificationStatus:'not verified',rollbackStatus:'not executed',boundary:'Synthetic proposal review only; no execution authority, scanning, synchronization or operational validation.'};}
  function restore(raw){let s;try{s=JSON.parse(raw);if(s.schemaVersion!==1||typeof s.raw!=='string'||!Array.isArray(s.events)||!Array.isArray(s.history)||typeof s.reviewer!=='string')throw Error();if(s.analysis){const a=analyze(s.analysis.raw);if(canonical(a)!==canonical(s.analysis))throw Error();}if(s.committed&&(!s.draft||!s.analysis||s.committed.bundleId!==s.analysis.bundle.bundleId))throw Error();if(s.review&&(!s.committed||s.review.proposalId!==s.committed.proposalId||s.review.digest!==digest(s.committed)||s.review.revision!==s.committed.revision)){s.review=null;event(s,'review invalidated','Stored proposal digest mismatch.');}return s;}catch{throw Error('Stored work could not be restored. Keep it untouched or deliberately discard and load a sample.');}}
  function persist(storage,s){try{storage.setItem('synthetic-cyber-workbench-v1',JSON.stringify(s));return true;}catch{return false;}}
  return {copy,asOf,baseline,sample,canonical,sha256,digest,validate,analyze,fresh,event,dirty,analyzeState,createProposal,edit,save,discard,review,reviewed,exportHandoff,restore,persist};
}
if(typeof module!=='undefined') module.exports=createCyberCore();
