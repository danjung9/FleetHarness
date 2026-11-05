import { compareText as cmp } from './validation.js';
import { boundedSearch } from './scheduling.js';
const fail=m=>{throw Error(m)}, bad=()=>fail('Invalid input schema.');
const str=x=>typeof x==='string'&&x.trim().length>0;
const id=x=>str(x)&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
const num=(x,min=-1000000,max=1000000)=>Number.isInteger(x)&&x>=min&&x<=max;
const arr=(x,max=1000000,min=0)=>Array.isArray(x)&&x.length<=max&&x.length>=min;
const obj=(x,keys,missing=[])=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!keys.includes(k))||keys.some(k=>!(k in x)&&!missing.includes(k)))bad();};
const policy={synthetic:true,minimumRestMinutes:0,maxDutyMinutesPerUtcDay:0,maxDutyMinutesPerWeek:0,countTrainingAndWatches:true,restAppliesBetweenEveryDistinctDutyInterval:true,dailyBudgetWindow:'UTC midnight; split crossing intervals',weeklyBudgetWindow:'[0,10080); clip crossing intervals',qualificationMustCoverEntireDrill:true};
const check=b=>{if(!b)bad()};
const list=(x,test,max=1000000,min=0)=>{check(arr(x,max,min));x.forEach(v=>check(test(v)));};
const interval=(x,current=false)=>arr(x,2,2)&&x.every(v=>num(v,current?0:-1000000,current?10080:1000000));
const same=(a,b)=>JSON.stringify([...a].sort(cmp))===JSON.stringify([...b].sort(cmp));
function validate(input){
 if(!input||!['inspect','negotiate','validate'].includes(input.action))fail('Unknown action.');
 obj(input,input.action==='validate'?['action','record','allocations']:['action','record']);
 const r=input.record;obj(r,['schemaVersion','fixtureId','provenance','week','departments','personnel','resources','operationalWindows','fixedDuties','policy','drills','recurrenceRequirements','search','review']);
 check(r.schemaVersion===1&&str(r.fixtureId)&&str(r.provenance)&&r.provenance.includes('Synthetic'));
 obj(r.week,['start','timezone','horizonMinutes','intervalSemantics']);const dt=new Date(r.week.start);check(typeof r.week.start==='string'&&/^\d{4}-\d\d-\d\dT00:00:00(?:\.000)?Z$/.test(r.week.start)&&Number.isFinite(+dt)&&dt.getUTCDay()===1&&dt.toISOString().slice(0,10)===r.week.start.slice(0,10)&&r.week.timezone==='UTC'&&r.week.horizonMinutes===10080&&r.week.intervalSemantics==='half-open');
 list(r.departments,x=>{obj(x,['departmentId','name','priority','tieOrder']);return id(x.departmentId)&&str(x.name)&&num(x.priority,1)&&num(x.tieOrder,1)},40,1);
 list(r.personnel,x=>{obj(x,['id','name','departmentId','qualifications','availability']);list(x.qualifications,q=>{obj(q,['role','validFrom','validUntil']);return str(q.role)&&num(q.validFrom)&&num(q.validUntil)});list(x.availability,w=>interval(w,true));return id(x.id)&&str(x.name)&&id(x.departmentId)},200);
 list(r.resources,x=>{obj(x,['id','name','capacity','availability']);list(x.availability,w=>interval(w,true));return id(x.id)&&str(x.name)&&x.capacity===1},40);
 list(r.operationalWindows,w=>interval(w,true),1000000,1);
 list(r.fixedDuties,x=>{obj(x,['id','personnelId','startMinute','endMinute']);return id(x.id)&&id(x.personnelId)&&num(x.startMinute)&&num(x.endMinute)},200);
 obj(r.policy,Object.keys(policy),Object.keys(policy));for(const [k,v] of Object.entries(r.policy))check(typeof policy[k]==='number'?num(v,0):v===policy[k]);
 list(r.drills,x=>{obj(x,['id','title','departmentId','durationMinutes','mandatory','requiredRoles','eligiblePersonnelIds','resourceIds','allowedStartMinutes','preferredStartMinute','proposedPersonnelIds','requirementId']);list(x.requiredRoles,q=>{obj(q,['role','count']);return str(q.role)&&num(q.count,1)},200,1);list(x.eligiblePersonnelIds,id,200,1);list(x.resourceIds,id,40);list(x.allowedStartMinutes,v=>num(v,0),100,1);list(x.proposedPersonnelIds,id,200);return id(x.id)&&str(x.title)&&id(x.departmentId)&&num(x.durationMinutes,1)&&x.mandatory===true&&num(x.preferredStartMinute,0)&&id(x.requirementId)},24);
 let occurrences=0;list(r.recurrenceRequirements,x=>{obj(x,['id','lastCompletionMinute','ruleKind','referenceIntervalMinutes','occurrences']);list(x.occurrences,o=>{obj(o,['id','releaseMinute','deadlineMinute','requiredCount']);occurrences++;return id(o.id)&&num(o.releaseMinute)&&num(o.deadlineMinute)&&o.requiredCount===1});return id(x.id)&&num(x.lastCompletionMinute)&&x.ruleKind==='explicit-window-obligations'&&num(x.referenceIntervalMinutes,1)},40);check(occurrences<=200);
 obj(r.search,['maxNodes','candidateOrder','objective']);check(num(r.search.maxNodes,0,200000)&&r.search.candidateOrder==='department priority, then drill ID; preferred start first then ascending allowed start; personnel IDs ascending'&&str(r.search.objective));obj(r.review,['state','revision','realApproval']);check(['pending-review','locally-reviewed'].includes(r.review.state)&&num(r.review.revision,1)&&r.review.realApproval===false);
 if(input.action==='validate')list(input.allocations,a=>{obj(a,['drillId','startMinute','endMinute','personnelIds','resourceIds']);list(a.personnelIds,id,200);list(a.resourceIds,id,40);return id(a.drillId)&&num(a.startMinute,0)&&num(a.endMinute,0)},24);
 const unique=(xs,drill=false)=>{const s=new Set;for(const x of xs){if(s.has(x))fail(drill?`Duplicate drill ID ${x}.`:`Duplicate ID ${x}.`);s.add(x)}};
 unique(r.departments.map(x=>x.departmentId));for(const xs of [r.personnel,r.resources,r.fixedDuties])unique(xs.map(x=>x.id));for(const p of r.personnel)unique(p.qualifications.map(x=>x.role));unique(r.drills.map(x=>x.id),true);for(const d of r.drills){unique(d.requiredRoles.map(x=>x.role));for(const k of ['eligiblePersonnelIds','resourceIds','allowedStartMinutes','proposedPersonnelIds'])unique(d[k]);}unique(r.recurrenceRequirements.map(x=>x.id));unique(r.recurrenceRequirements.flatMap(x=>x.occurrences.map(o=>o.id)));
 if(input.allocations){unique(input.allocations.map(x=>x.drillId));for(const a of input.allocations){unique(a.personnelIds);unique(a.resourceIds)}}
 for(const w of r.operationalWindows)if(w[0]>=w[1])fail('Operational window start must be less than end.');
 const intervals=[...r.personnel.flatMap(p=>[...p.availability,...p.qualifications.map(q=>[q.validFrom,q.validUntil])]),...r.resources.flatMap(p=>p.availability),...r.fixedDuties.map(x=>[x.startMinute,x.endMinute]),...r.recurrenceRequirements.flatMap(x=>x.occurrences.map(o=>[o.releaseMinute,o.deadlineMinute]))];if(intervals.some(w=>w[0]>=w[1]))fail('Interval start must be less than end.');
 for(const k of Object.keys(policy))if(!(k in r.policy))fail(`Missing required policy ${k}.`);
 const ref=(xs,v,kind='reference')=>{if(!xs.includes(v))fail(`Unknown ${kind} ${v}.`)}, ps=r.personnel.map(x=>x.id),rs=r.resources.map(x=>x.id),ds=r.departments.map(x=>x.departmentId);
 for(const p of r.personnel)ref(ds,p.departmentId);for(const f of r.fixedDuties)ref(ps,f.personnelId,'personnel ID');for(const d of r.drills){ref(ds,d.departmentId);for(const p of [...d.eligiblePersonnelIds,...d.proposedPersonnelIds])ref(ps,p,'personnel ID');for(const v of d.resourceIds)ref(rs,v,'resource ID');ref(r.recurrenceRequirements.map(x=>x.id),d.requirementId)}
 if(input.allocations)for(const a of input.allocations){ref(r.drills.map(x=>x.id),a.drillId);for(const v of a.personnelIds)ref(ps,v,'personnel ID');for(const v of a.resourceIds)ref(rs,v,'resource ID')}
 const due=r.recurrenceRequirements.flatMap(q=>q.occurrences.filter(o=>o.deadlineMinute>=0&&o.deadlineMinute<=10080).map(o=>({...o,requirementId:q.id})));
 if(due.length!==r.drills.length||due.some(o=>!r.drills.some(d=>d.id===o.id&&d.requirementId===o.requirementId)))fail('Invalid recurrence mapping.');
 for(const d of r.drills)check(d.allowedStartMinutes.includes(d.preferredStartMinute)&&d.proposedPersonnelIds.every(p=>d.eligiblePersonnelIds.includes(p)));
 if(input.allocations)check(same(input.allocations.map(x=>x.drillId),r.drills.map(x=>x.id)));
 if(evaluate(r,[],false).violations.length)fail('Fixed duties violate fatigue policy.');
 return r;
}
const fits=(ws,s,e)=>ws.some(w=>w[0]<=s&&w[1]>=e);
function qualified(r,d,a){if(a.personnelIds.length!==d.requiredRoles.reduce((s,x)=>s+x.count,0)||a.personnelIds.some(p=>!d.eligiblePersonnelIds.includes(p)))return false;const slots=d.requiredRoles.flatMap(x=>Array(x.count).fill(x.role));const used=new Set;function match(i){if(i===slots.length)return true;for(const pid of a.personnelIds){const p=r.personnel.find(p=>p.id===pid);if(!used.has(pid)&&p.qualifications.some(q=>q.role===slots[i]&&q.validFrom<=a.startMinute&&q.validUntil>=a.endMinute)){used.add(pid);if(match(i+1))return true;used.delete(pid)}}return false}return match(0)}
const allocation=(d,s,ps)=>({drillId:d.id,startMinute:s,endMinute:s+d.durationMinutes,personnelIds:[...ps].sort(cmp),resourceIds:[...d.resourceIds].sort(cmp)});
function evaluate(r,allocations,local=true){
 const violations=[],add=(code,ids)=>violations.push({code,ids});
 if(local)for(const a of allocations){const d=r.drills.find(d=>d.id===a.drillId),s=a.startMinute,e=a.endMinute;
 if(!d.allowedStartMinutes.includes(s))add('allowed-start',[d.id]);if(e!==s+d.durationMinutes)add('duration',[d.id]);if(s<0||e>10080||!fits(r.operationalWindows,s,e))add('operational-window',[d.id]);if(!same(a.resourceIds,d.resourceIds))add('resources',[d.id]);if(!qualified(r,d,a))add('qualification',[d.id]);for(const pid of a.personnelIds)if(!fits(r.personnel.find(p=>p.id===pid).availability,s,e))add('personnel-availability',[d.id,pid]);for(const rid of a.resourceIds)if(!fits(r.resources.find(p=>p.id===rid).availability,s,e))add('resource-availability',[d.id,rid]);const o=r.recurrenceRequirements.find(q=>q.id===d.requirementId).occurrences.find(o=>o.id===d.id);if(!o||s<o.releaseMinute||e>o.deadlineMinute)add('recurrence',[d.id]);}
 const duties=[...allocations.map(a=>({id:a.drillId,s:a.startMinute,e:a.endMinute,ps:a.personnelIds,rs:a.resourceIds})),...r.fixedDuties.map(f=>({id:f.id,s:f.startMinute,e:f.endMinute,ps:[f.personnelId],rs:[]}))];const collisions=[];
 for(let i=0;i<duties.length;i++)for(let j=i+1;j<duties.length;j++){const a=duties[i],b=duties[j],pair=[a.id,b.id].sort(cmp),ov=a.s<b.e&&b.s<a.e;for(const kind of ['personnel','resource'])for(const id of (kind==='personnel'?a.ps:a.rs).filter(id=>(kind==='personnel'?b.ps:b.rs).includes(id))){if(ov){collisions.push({drillIds:pair,kind,id,overlap:[Math.max(a.s,b.s),Math.min(a.e,b.e)]});add(kind+'-overlap',[id,...pair])}else if(kind==='personnel'&&Math.max(a.s,b.s)-Math.min(a.e,b.e)<r.policy.minimumRestMinutes)add('rest',[id,...pair]);}}
 for(const p of r.personnel){const dd=duties.filter(d=>d.ps.includes(p.id));const days=new Map;let week=0;for(const d of dd){week+=Math.max(0,Math.min(10080,d.e)-Math.max(0,d.s));for(let day=Math.floor(d.s/1440);day<=Math.floor((d.e-1)/1440);day++)days.set(day,(days.get(day)||0)+Math.max(0,Math.min(d.e,(day+1)*1440)-Math.max(d.s,day*1440)))}for(const [day,v]of days)if(v>r.policy.maxDutyMinutesPerUtcDay)add('daily-duty',[p.id,String(day)]);if(week>r.policy.maxDutyMinutesPerWeek)add('weekly-duty',[p.id]);}
 collisions.sort((a,b)=>cmp(a.drillIds[0],b.drillIds[0])||cmp(a.drillIds[1],b.drillIds[1])||cmp(a.kind,b.kind)||cmp(a.id,b.id));const dedup=[...new Map(violations.map(v=>[v.code+'/'+v.ids.join('/'),v])).values()].sort((a,b)=>cmp(a.code,b.code)||cmp(a.ids.join('/'),b.ids.join('/')));return {collisions,violations:dedup};
}
function* crews(ids,n,start=0,prefix=[]){if(n===0){yield prefix;return}for(let i=start;i<=ids.length-n;i++)yield*crews(ids,n-1,i+1,[...prefix,ids[i]])}
export function run(input, exchange=()=>{}){try{if(new TextEncoder().encode(JSON.stringify(input)).length>100000)fail('Input exceeds 100000 bytes.');const r=validate(input),proposals=r.drills.map(d=>allocation(d,d.preferredStartMinute,d.proposedPersonnelIds));const deps=[...r.departments].sort((a,b)=>a.priority-b.priority||a.tieOrder-b.tieOrder||cmp(a.departmentId,b.departmentId));const ordered=deps.flatMap(p=>r.drills.filter(d=>d.departmentId===p.departmentId).sort((a,b)=>cmp(a.id,b.id)));let allocations=input.action==='validate'?input.allocations.map(a=>({...a,personnelIds:[...a.personnelIds].sort(cmp),resourceIds:[...a.resourceIds].sort(cmp)})):proposals;
 if(input.action==='negotiate'){
 const candidates=function*(d){const starts=[d.preferredStartMinute,...d.allowedStartMinutes.filter(s=>s!==d.preferredStartMinute).sort((a,b)=>a-b)];for(const s of starts)for(const ps of crews([...d.eligiblePersonnelIds].sort(cmp),d.requiredRoles.reduce((s,q)=>s+q.count,0))){const a=allocation(d,s,ps);if(!evaluate(r,[a]).violations.some(v=>!['rest','daily-duty','weekly-duty','personnel-overlap'].includes(v.code)))yield a;}};
 const found=boundedSearch(ordered,candidates,as=>evaluate(r,as).violations,r.search.maxNodes,exchange);if(found.status!=='feasible')return {status:found.status,error:null,result:null};allocations=found.allocations;
 }
 allocations.sort((a,b)=>cmp(a.drillId,b.drillId));const initialCollisions=evaluate(r,proposals).collisions,{collisions,violations}=evaluate(r,allocations);
 const coverage={dueInWeek:0,scheduledWithinDeadline:0,missed:0,historicallyOverdue:0,overdueIds:[],futureIds:[]};for(const q of r.recurrenceRequirements)for(const o of q.occurrences){if(o.deadlineMinute<0){if(q.lastCompletionMinute<o.releaseMinute||q.lastCompletionMinute>o.deadlineMinute)coverage.overdueIds.push(o.id)}else if(o.deadlineMinute>10080)coverage.futureIds.push(o.id);else{coverage.dueInWeek++;const a=allocations.find(a=>a.drillId===o.id);if(a&&a.startMinute>=o.releaseMinute&&a.endMinute<=o.deadlineMinute)coverage.scheduledWithinDeadline++}}coverage.missed=coverage.dueInWeek-coverage.scheduledWithinDeadline;coverage.historicallyOverdue=coverage.overdueIds.length;coverage.overdueIds.sort(cmp);coverage.futureIds.sort(cmp);
 const loads=[...r.personnel].sort((a,b)=>cmp(a.id,b.id)).map(p=>{const dailyTrainingMinutes=Array(7).fill(0),dailyDutyMinutes=Array(7).fill(0);for(let day=0;day<7;day++){for(const a of allocations.filter(a=>a.personnelIds.includes(p.id)))dailyTrainingMinutes[day]+=Math.max(0,Math.min(a.endMinute,(day+1)*1440)-Math.max(a.startMinute,day*1440));dailyDutyMinutes[day]=dailyTrainingMinutes[day];for(const f of r.fixedDuties.filter(f=>f.personnelId===p.id))dailyDutyMinutes[day]+=Math.max(0,Math.min(f.endMinute,(day+1)*1440)-Math.max(f.startMinute,day*1440));}return {personnelId:p.id,trainingMinutes:dailyTrainingMinutes.reduce((a,b)=>a+b,0),weeklyDutyMinutes:dailyDutyMinutes.reduce((a,b)=>a+b,0),dailyTrainingMinutes,dailyDutyMinutes}});
 const changed=d=>{const a=allocations.find(a=>a.drillId===d.id);return a.startMinute!==d.preferredStartMinute||!same(a.personnelIds,d.proposedPersonnelIds)};
 const negotiation=input.action==='negotiate'?ordered.map(d=>{const a=allocations.find(a=>a.drillId===d.id);return {departmentId:d.departmentId,drillId:d.id,proposal:{startMinute:d.preferredStartMinute,personnelIds:[...d.proposedPersonnelIds].sort(cmp)},counterproposal:{startMinute:a.startMinute,personnelIds:a.personnelIds},decision:changed(d)?'counterproposal':'retain'}}):[];
 const metrics={initialCollisionCount:initialCollisions.length,remainingCollisionCount:collisions.length,hardViolationCount:violations.length,movedDrillIds:r.drills.filter(changed).map(d=>d.id).sort(cmp),trainingMinutes:loads.reduce((s,l)=>s+l.trainingMinutes,0),weeklyDutyMinutes:loads.reduce((s,l)=>s+l.weeklyDutyMinutes,0),objectiveValue:collisions.length,objectiveLowerBound:0,searchBudget:r.search.maxNodes};
 return {status:violations.length?'conflicts':'feasible',error:null,result:{allocations,initialCollisions,collisions,violations,coverage,loads,negotiation,metrics,realApproval:false}};
 }catch(e){return {status:'invalid-input',error:e.message,result:null}}}

/** Fictional fixed cadence anchored to completion history, never an SFTRM rule.
 * Independent templates preserve obligations even when a draft drops its drills.
 */
export function prepareCadence(record, rules) {
 if(!Array.isArray(rules)||rules.length>40)throw Error('Supply at most 40 synthetic cadence rules.');
 const r=structuredClone(record),seen=new Set();
 for(const rule of rules){
  obj(rule,['requirementId','cadenceMinutes','lastCompletionMinute','template']);
  const {requirementId,cadenceMinutes,lastCompletionMinute,template}=rule;
  if(!id(requirementId)||requirementId.length>65||seen.has(requirementId)||!num(cadenceMinutes,1,1000000)||!num(lastCompletionMinute,-1000000,0)||!template||typeof template!=='object')throw Error('Invalid synthetic cadence rule.');
  seen.add(requirementId);
  const occurrences=[],drills=[];
  // The completion anchors the first deadline. Every interval thereafter is
  // owed, regardless of whether somebody deleted a matching draft entry.
  const count=Math.floor((10080-lastCompletionMinute)/cadenceMinutes);
  if(count>200)throw Error('Synthetic cadence exceeds 200 obligations; use a shorter horizon.');
  for(let n=1;n<=count;n++){
   const deadlineMinute=lastCompletionMinute+n*cadenceMinutes;
   const releaseMinute=deadlineMinute-cadenceMinutes;
   const occurrence={id:requirementId+'-C'+n,releaseMinute,deadlineMinute,requiredCount:1};
   occurrences.push(occurrence);
   if(deadlineMinute>=0){
    const d={...structuredClone(template),id:occurrence.id,requirementId};
    // Keep incompatible candidates so the solver reports infeasible rather
    // than silently dropping an obligation with no candidate in its window.
    const starts=d.allowedStartMinutes?.filter(s=>s>=Math.max(0,releaseMinute)&&s+d.durationMinutes<=deadlineMinute);
    if(starts?.length){d.allowedStartMinutes=starts;if(!starts.includes(d.preferredStartMinute))d.preferredStartMinute=starts[0];}
    drills.push(d);
   }
  }
  r.recurrenceRequirements=r.recurrenceRequirements.filter(q=>q.id!==requirementId);
  r.recurrenceRequirements.push({id:requirementId,lastCompletionMinute,ruleKind:'explicit-window-obligations',referenceIntervalMinutes:cadenceMinutes,occurrences});
  r.drills=r.drills.filter(d=>d.requirementId!==requirementId).concat(drills);
 }
 const checked=run({action:'inspect',record:r});
 if(checked.status==='invalid-input')throw Error(checked.error);
 return r;
}
export function negotiateWithTrace(input){
 const exchanges=[];let total=0;
 const output=run(input,event=>{total++;if(exchanges.length<2000)exchanges.push({...event,sequence:total});});
 return {output,exchanges,totalExchanges:total,traceTruncated:total>exchanges.length};
}
