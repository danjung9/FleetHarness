/* Application core: also embedded verbatim in index.html. No runtime dependencies. */
const FleetCore = (() => {
'use strict';
const clone = x => JSON.parse(JSON.stringify(x));
const epoch = '2026-11-04T00:00:00Z';
const eventNames = ['Radar casualty','Part delay','Maintenance backlog','Two qualified personnel detach','Mission schedule moves'];
function record(recordId, revision, excerpt, hour=0) { return {recordId,revision,excerpt,excerptStart:0,excerptEnd:excerpt.length,assetId:'SYN-DDG-01',reportType:recordId,observedAt:epoch.replace('00:00:00',String(hour).padStart(2,'0')+':00:00'),lastSyncAt:epoch.replace('00:00:00',String(hour).padStart(2,'0')+':00:00'),synthetic:true,...(revision==='r2'?{supersedes:'r1'}:{})}; }
const ref = (recordId, revision='r1') => ({recordId,revision});
function createBaseline() {
const specs=[['parts','Parts',[],4,0,'SYN-PARTS','Part available day 4.'],['repair','Repair',['parts'],0,3,'SYN-MAINT','Repair duration 3 days.'],['radar','Radar test',['repair'],0,2,'SYN-TEST','Radar test duration 2 days.'],['staff','Qualified personnel',[],6,0,'SYN-MANNING','Qualified personnel available day 6.'],['watch','Qualification review',['staff'],0,1,'SYN-QUAL','Qualification review duration 1 day.']];
return {schemaVersion:1,classification:'synthetic',id:'SYN-21',revision:'r1',modelId:'ILLUSTRATIVE-DAG-1',assetId:'SYN-DDG-01',epoch,timeUnit:'day',observedAt:epoch,lastSyncAt:epoch,deadline:21,targetIds:['radar','watch'],nodes:specs.map(([id,label,deps,readyAt,duration,src])=>({id,label,deps,readyAt,duration,assetId:'SYN-DDG-01',sourceRefs:[ref(src)]})),records:[...specs.map(s=>record(s[5],'r1',s[6])),record('SYN-SCHEDULE','r1','Mission deadline day 21.')],scheduleRef:ref('SYN-SCHEDULE'),appliedEvents:[]};
}
function applyEvent(input) {
const s=clone(input), i=s.appliedEvents.length;
if(i>=5)return s;
const changes=[['repair','duration',6,'SYN-CASUALTY','r1','Radar repair duration 6 days.'],['parts','readyAt',15,'SYN-PARTS','r2','Part available day 15.'],['repair','duration',8,'SYN-MAINT','r2','Repair duration increased to 8 days.'],['staff','readyAt',23,'SYN-MANNING','r2','Two qualified personnel detach; illustrative replacement availability day 23.'],[null,'deadline',20,'SYN-SCHEDULE','r2','Mission deadline day 20.']];
const [id,key,value,src,rev,excerpt]=changes[i], n=id?s.nodes.find(n=>n.id===id):s;
const before=n[key];n[key]=value;
if(id) {if(i===2)n.sourceRefs=[ref('SYN-CASUALTY'),ref(src,rev)];else n.sourceRefs=[ref(src,rev)];} else s.scheduleRef=ref(src,rev);
s.records.push(record(src,rev,excerpt,i+1));s.observedAt=s.lastSyncAt=s.records.at(-1).observedAt;
s.appliedEvents.push({id:'E'+(i+1),name:eventNames[i],before,after:value,node:id||'schedule',field:key});return s;
}
function setRepairDuration(input, draft) {
const s=clone(input);
if(draft!==''&&!/^\d+$/.test(draft))throw Error('Repair duration must be a nonnegative whole number or blank.');
const duration=draft===''?null:Number(draft);
if(duration!==null&&!Number.isSafeInteger(duration))throw Error('Repair duration is too large.');
const n=s.nodes.find(n=>n.id==='repair');n.duration=duration;
const revision='local-'+(s.records.filter(r=>r.recordId==='SYN-WHATIF').length+1);
s.records.push(record('SYN-WHATIF',revision,duration===null?'Local what-if: repair duration is unknown.':`Local what-if: repair duration ${duration} days.`));
n.sourceRefs=[...n.sourceRefs.filter(r=>r.recordId!=='SYN-WHATIF'),ref('SYN-WHATIF',revision)];return s;
}
function analysisFingerprint(s) { return JSON.stringify(s); }
function validateModel(s) {
if(s.classification!=='synthetic')throw Error('Only synthetic models are supported.');
if(s.timeUnit!=='day'||s.epoch!==epoch)throw Error('Use whole elapsed days from the declared epoch.');
const integer=(x,label)=>{if(!Number.isSafeInteger(x)||x<0)throw Error(label+' must be a nonnegative whole number.');};integer(s.deadline,'Deadline');
if(!Array.isArray(s.nodes)||!s.nodes.length||s.nodes.length>200)throw Error('Provide 1–200 tasks.');
const map=new Map();for(const n of s.nodes){if(!n.id||map.has(n.id))throw Error('Duplicate or missing task ID.');map.set(n.id,n);if(n.assetId!==s.assetId)throw Error('Stable asset identity mismatch.');integer(n.readyAt,'Availability');if(n.duration!==null)integer(n.duration,'Duration');if(!Array.isArray(n.deps)||new Set(n.deps).size!==n.deps.length)throw Error('Duplicate or invalid dependencies.');}
if(!s.targetIds?.length||new Set(s.targetIds).size!==s.targetIds.length)throw Error('Provide unique analysis targets.');
for(const t of s.targetIds)if(!map.has(t))throw Error('Unknown target: '+t+'.');
for(const n of s.nodes)for(const d of n.deps)if(!map.has(d))throw Error(`Unknown dependency: ${d} referenced by ${n.id}. Restore the valid model to continue.`);
const visiting=new Set(),done=new Set();function visit(id){if(visiting.has(id))throw Error('Dependency cycle detected. Restore the valid model to continue.');if(done.has(id))return;visiting.add(id);map.get(id).deps.forEach(visit);visiting.delete(id);done.add(id);}s.nodes.forEach(n=>visit(n.id));return map;
}
function resolveEvidence(s,id,asOf=s.observedAt) {
const map=new Map(s.nodes.map(n=>[n.id,n])), refs=[],seen=new Set();
function add(r){if(!r)throw Error('Missing source reference.');const k=r.recordId+' '+r.revision;if(!seen.has(k)){refs.push(r);seen.add(k);}}
const visited=new Set();function walk(t){if(visited.has(t))return;visited.add(t);const n=map.get(t);if(!n)throw Error('Unknown evidence task.');n.deps.forEach(walk);if(!n.sourceRefs?.length)throw Error('Missing citation for '+t+'.');n.sourceRefs.forEach(add);}walk(id);add(s.scheduleRef);
return refs.map(r=>{const matches=s.records.filter(x=>x.recordId===r.recordId&&x.revision===r.revision);if(!matches.length)throw Error('Unresolved source: '+r.recordId+' '+r.revision+'.');if(matches.length!==1)throw Error('Conflicting source records: '+r.recordId+' '+r.revision+'. Human selection required.');const x=matches[0];if(x.assetId!==s.assetId)throw Error('Stable asset identity mismatch for '+x.recordId+'.');if(x.synthetic!==true||x.excerptStart!==0||x.excerptEnd!==x.excerpt.length)throw Error('Invalid source provenance.');const a=Date.parse(asOf),o=Date.parse(x.observedAt),l=Date.parse(x.lastSyncAt);const warning=![a,o,l].every(Number.isFinite)?'Freshness unavailable':o>a||l>a?'Future timestamp — cannot support a current claim':null;return {...clone(x),warning,ageDays:Number.isFinite(a-o)?(a-o)/86400000:null};});
}
function analyze(s) {
const map=validateModel(s), memo=new Map();
function visit(id){if(memo.has(id))return memo.get(id);const n=map.get(id),ds=n.deps.map(visit),start=Math.max(n.readyAt,...ds.map(d=>d.lowerBound)),unknowns=[...new Set([...ds.flatMap(d=>d.unknowns),...(n.duration===null?[id]:[])])],lowerBound=start+(n.duration??0);if(!Number.isSafeInteger(lowerBound))throw Error('Calculated finish exceeds the safe whole-number range.');let paths=ds.filter(d=>d.lowerBound===start).flatMap(d=>d.paths.map(p=>[...p,id]));if(!paths.length)paths=[[id]];const out={id,lowerBound,finish:unknowns.length?null:lowerBound,unknowns,paths,ownAvailabilityControls:n.readyAt>Math.max(0,...ds.map(d=>d.lowerBound))};memo.set(id,out);return out;}
s.nodes.forEach(n=>visit(n.id));const targets=s.targetIds.map(id=>{const r=visit(id),evidence=resolveEvidence(s,id);if(evidence.some(e=>e.warning))throw Error('Source freshness unavailable or future-dated. Resolve timestamps before analysis.');return {...r,margin:r.finish===null?null:s.deadline-r.finish,status:r.finish===null?'unknown':r.finish>s.deadline?'late':'within_deadline',evidence};});
return {fingerprint:analysisFingerprint(s),deadline:s.deadline,targets};
}
const titles={radar:'Radar restoration',watch:'Watch qualification'};
function resultText(r,deadline){return r.status==='unknown'?`${titles[r.id]||r.id}: UNKNOWN; ${r.unknowns.join(', ')} duration is missing; finish and margin unavailable.`:`${titles[r.id]||r.id}: finish day ${r.finish}; deadline day ${deadline}; margin ${r.margin} days; ${r.status==='late'?'LATE':'WITHIN DEADLINE'}.`;}
function evidenceText(s,r){return (r.id==='radar'?'Radar':'Watch')+' evidence: '+r.evidence.map(e=>`${e.recordId} ${e.revision} — ${e.excerpt}`).join('; ');}
function makeBrief(s,a,review){if(!a||a.fingerprint!==analysisFingerprint(s))throw Error('Analyze the current model before export.');if(!review||review.fingerprint!==a.fingerprint||!review.ack)throw Error('Record a review of the current analysis before export.');return ['ADVISORY ONLY — Human decision required.','SYNTHETIC dependency timing brief',`${s.id} ${s.revision} | ${s.modelId} | ${s.assetId}`,`Epoch ${s.epoch}; unit: elapsed day; observed ${s.observedAt}; last sync ${s.lastSyncAt}`, 'Applied synthetic changes:',...s.appliedEvents.map(e=>`${e.id} ${e.name}: ${e.node} ${e.field} ${e.before} → ${e.after}`),...a.targets.map(r=>resultText(r,s.deadline)),...a.targets.map(r=>evidenceText(s,r)),...a.targets.flatMap(r=>r.evidence.map(e=>`${e.recordId} ${e.revision}: observed ${e.observedAt}, last sync ${e.lastSyncAt}, excerpt [${e.excerptStart},${e.excerptEnd})`)), 'Considerations ordered by known target margin (illustrative, not approved priorities):',...a.targets.filter(r=>r.margin!==null).sort((a,b)=>a.margin-b.margin||a.id.localeCompare(b.id)).map(r=>`${titles[r.id]}: confirm estimates and dependency assumptions with a human reviewer.`),'Unknown estimates: '+a.targets.flatMap(r=>r.unknowns).join(', '), 'No approved capability model or SME-reviewed scenario. No shared-resource, parts-competition or reliability model. Freshness policy unapproved. E4 is an illustrative replacement-availability assumption. Target margin is not upstream slack.', 'Review note: '+review.note,'Review recorded locally at '+review.at,'No operational action was executed.'].join('\n');}
function parseSession(text){const s=JSON.parse(text);if(s.version!==1||!s.model||typeof s.note!=='string'||typeof s.draft!=='string'||!Array.isArray(s.audit))throw Error('Invalid saved session.');validateModel(s.model);if(s.analysis){const duration=s.model.nodes.find(n=>n.id==='repair')?.duration;if((s.modelCase&&s.modelCase!=='valid')||(s.draft!==''&&!/^\d+$/.test(s.draft))||(s.draft===''?null:Number(s.draft))!==duration)throw Error('Saved analysis does not match the displayed inputs.');const a=analyze(s.model);if(a.fingerprint!==s.analysis.fingerprint)throw Error('Saved analysis does not match the model.');s.analysis=a;}if(s.review&&(!s.analysis||s.review.fingerprint!==s.analysis.fingerprint||s.review.note!==s.note||s.review.ack!==true||s.ack!==true))s.review=null;return s;}
function saveSession(storage,key,session){const serialized=JSON.stringify(session);storage.setItem(key,serialized);return serialized;}
function loadSession(storage,key){const raw=storage.getItem(key);return raw===null?null:parseSession(raw);}
return {setRepairDuration,saveSession,loadSession,createBaseline,applyEvent,validateModel,analyze,resolveEvidence,makeBrief,analysisFingerprint,resultText,evidenceText,parseSession,eventNames};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FleetCore;
