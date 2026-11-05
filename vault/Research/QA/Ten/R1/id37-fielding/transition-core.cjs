/* Shared pure core: embedded verbatim in index.html. No browser or Node dependencies. */
(function(root){
'use strict';
const gaps = [
['baseline','Owner application unavailable','Obtain source, version, license and baseline tests from the tool owner.'],
['device','Target device unknown','Confirm representative device and permitted offline install route with the device authority.'],
['hosting','Hosting and signing unapproved','Request hosting decision and signing process from the hosting representative.'],
['security','Authorization evidence requirements unknown','Obtain the applicable checklist and review criteria from the authorizing representative.'],
['sustainment','Sustainment owner unassigned','Ask the command to name an owner who accepts support, updates and rollback.'],
['rules','Calculation rules and answer key absent','Obtain authoritative worksheet rules and an independent hand-computed answer key from the SME.'],
['approval','Operational approval and audit undefined','Define per-result human approval, identity, retention and audit integrity with the Beachmaster authority.'],
['sync','Disconnected transfer unspecified','Define transport, acknowledgements, replay and conflict rules with the network owner.']];
const topics = {task:'Primary task',deviceProposal:'Device proposal',hostingProposal:'Hosting proposal',installProposal:'Offline install proposal',securityNotes:'Security evidence needed',humanReviewNotes:'Human approval and audit proposal',updateRollbackNotes:'Update and rollback proposal',sustainmentNotes:'Sustainment proposal'};
const disclaimer='Synthetic draft — not authorized for fielding';
const source={sourceId:'P37',revision:'c6876348a266cb16cffc1c625d45328bb1ab985806dd6bc3c2594eaad68e7c4e',capturedOn:'2026-11-04',excerpt:'Packaging does not grant authorization to operate or install on government devices.',pointer:'/recipe/limitations/0',purpose:'Challenge attribution only; upstream revision and timestamp unknown.',status:'synthetic-unverified'};
const clone=x=>JSON.parse(JSON.stringify(x));
const trim=x=>typeof x==='string'?x.trim():'';
function createEmpty(){return {toolName:'',toolVersion:'',...Object.fromEntries(Object.keys(topics).map(k=>[k,''])),baseline:'missing',evidence:[clone(source)],barriers:gaps.map(([id,title,proposedFix])=>({id,title,proposedFix,owner:'Unassigned',status:'Unresolved'}))};}
function createSample(){let r=createEmpty();r.toolName='Synthetic Beach Log';r.toolVersion='0.1';for(const k of Object.keys(topics))r[k]='Unknown — not supplied; external owner review required.';r.task='Record fictional beach observations.';return r;}
function normalizeRecord(r){let n=createEmpty();for(const k of ['toolName','toolVersion',...Object.keys(topics)])n[k]=trim(r[k]);n.baseline=r.baseline==='supplied-synthetic'?'supplied-synthetic':'missing';n.evidence=clone(r.evidence||[]);n.barriers=gaps.map(([id,title])=>{let b=(r.barriers||[]).find(b=>b.id===id)||{};return {id,title,proposedFix:trim(b.proposedFix),owner:trim(b.owner)||'Unassigned',status:'Unresolved'};});return n;}
function validateRecord(r){const errors=[];function field(key,label,max,empty){const v=trim(r[key]);if(!v)errors.push({field:key,message:empty||'Enter '+label.toLowerCase()+'.'});else if(v.length>max)errors.push({field:key,message:label+' must be '+max+' characters or fewer.'});}
field('toolName','Fictional tool name',120,'Enter a fictional tool name.');field('toolVersion','Tool version',40);for(const [k,label] of Object.entries(topics))field(k,label,1000);
for(const [id,title] of gaps){let b=(r.barriers||[]).find(b=>b.id===id);if(!b||!trim(b.proposedFix))errors.push({field:'fix-'+id,message:'Enter a proposed fix for '+title+'.'});else if(trim(b.proposedFix).length>1000)errors.push({field:'fix-'+id,message:'Proposed fix for '+title+' must be 1000 characters or fewer.'});if(b&&trim(b.owner).length>120)errors.push({field:'owner-'+id,message:'Owner must be 120 characters or fewer.'});}
return {valid:errors.length===0,errors};}
function isDirty(d,s){return !s||JSON.stringify(normalizeRecord(d))!==JSON.stringify(normalizeRecord(s));}
function commitRecord(e){const v=validateRecord(e.draft);if(!v.valid)throw new Error(v.errors[0].message);const r=normalizeRecord(e.draft);return {schemaVersion:1,draft:clone(r),saved:clone(r),savedRevision:e.savedRevision+1};}
function guard(e){if(!e.saved)throw new Error('Save a record before review or export.');if(isDirty(e.draft,e.saved))throw new Error('Unsaved changes. Save or discard changes before review or export.');return e.saved;}
function shape(r){return r&&['toolName','toolVersion','baseline',...Object.keys(topics)].every(k=>typeof r[k]==='string')&&['missing','supplied-synthetic'].includes(r.baseline)&&Array.isArray(r.evidence)&&r.evidence.every(x=>x&&['sourceId','revision','capturedOn','excerpt','pointer','purpose','status'].every(k=>typeof x[k]==='string')&&['missing','synthetic-unverified'].includes(x.status))&&Array.isArray(r.barriers)&&r.barriers.length===8&&gaps.every(([id,title])=>r.barriers.filter(b=>b&&b.id===id&&b.title===title&&typeof b.proposedFix==='string'&&typeof b.owner==='string'&&b.status==='Unresolved').length===1);}
function decode(raw){const e=JSON.parse(raw);if(!e||e.schemaVersion!==1||!Number.isSafeInteger(e.savedRevision)||e.savedRevision<0||!shape(e.draft)||!(e.saved===null&&e.savedRevision===0||shape(e.saved)&&e.savedRevision>0&&validateRecord(e.saved).valid))throw new Error('Invalid storage format');return e;}
function persist(storage,key,e){try{storage.setItem(key,JSON.stringify(e));return {durable:true};}catch(err){return {durable:false,error:String(err.message||err)};}}
function barrierText(b){return b.title+' | Proposed fix: '+b.proposedFix+' | Owner: '+(trim(b.owner)||'Unassigned')+' | Status: Unresolved';}
const steps=[
'Obtain the owner application, version, license and baseline tests.',
'Confirm the representative device, permitted install route and offline test conditions.',
'Record proposed hosting and signing decisions with the responsible external reviewers.',
'Obtain the applicable security checklist and collect traceable evidence for authority review.',
'Define human approval of every operational result and auditable change handling.',
'Specify disconnected transfer, acknowledgements, replay handling and reconnect conflicts.',
'Name an accepting sustainment owner and document updates, rollback and support.',
'Record remaining barriers with a proposed fix and accountable owner or Unassigned.',
'Have a second operator rehearse installation and the offline demo, then retain review evidence.'];
const attribution='Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/37\nP37; reported capture 2026-11-04; snapshot SHA-256 '+source.revision+'. Upstream revision/timestamp unknown; not fetched or verified.';
// Escape Markdown/HTML so user content remains text even in Markdown viewers.
const plain=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]#])/g,'\\$1');
function buildPlaybook(){return '# Reusable fielding playbook\n\n'+disclaimer+'\n\n'+steps.map((s,i)=>(i+1)+'. '+s).join('\n')+'\n\nDo not install, publish or submit for authorization without the appropriate external approvals.\n\nFor the next tool, start a fresh fictional record, replace identity, proposals and evidence, revisit every gap and obtain independent reviews. Never copy acceptance from this example.\n\n'+attribution+'\n';}
function buildPackage(saved,revision){if(!saved||!validateRecord(saved).valid)throw new Error('Save a valid record before export.');const r=normalizeRecord(saved);return '# Transition package\n\n'+disclaimer+'\n\n'+plain(r.toolName+' '+r.toolVersion)+'\nSaved revision '+revision+'\n\nBaseline: '+r.baseline+' (unverified)\n\n'+Object.entries(topics).map(([k,l])=>l+': '+plain(r[k])).join('\n\n')+'\n\n## Evidence index\n'+r.evidence.map(e=>Object.entries(e).map(([k,v])=>k+': '+plain(v)).join('\n')).join('\n\n')+'\n\n## 8 unresolved barriers\n'+r.barriers.map(b=>plain(barrierText(b))).join('\n\n')+'\n\n## Path to fleet\nOperational sponsor: Unassigned. Sustainment owner: Unassigned. Device, hosting, signing and installation require external decisions. Obtain owner baseline and independent SME answer key before preserving or validating operational behavior. Security evidence, result approval/audit and disconnected sync remain undefined. Retain second-operator installation/offline rehearsal and authority review evidence. Packaging grants no authority to operate or install on government devices.\n\n'+attribution+'\n';}
const api={gaps,topics,source,disclaimer,clone,createEmpty,createSample,normalizeRecord,validateRecord,isDirty,commitRecord,guard,decode,persist,barrierText,buildPackage,buildPlaybook};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TransitionCore=api;
})(globalThis);
