import { parentPort, workerData } from 'node:worker_threads';
export const warning='Synthetic, not validated against the real format. No SFTRM compliance or operational approval.';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x), str=x=>typeof x==='string'&&x.trim().length>0, int=Number.isSafeInteger, pos=x=>int(x)&&x>0, strings=x=>Array.isArray(x)&&x.every(str), arr=Array.isArray;
const overlap=(a,b)=>a[0]<b[1]&&b[0]<a[1], inside=(a,b)=>a[0]>=b[0]&&a[1]<=b[1], span=a=>[a.startMinute,a.endMinute], cmp=(a,b)=>a<b?-1:a>b?1:0;
const ordered=d=>[...d.requests].sort((a,b)=>b.priority-a.priority||cmp(a.id,b.id));
function occurrences(d){const out=[];for(const r of d.trainingRules){for(let k=Math.max(0,Math.floor((d.horizonMinutes[0]-r.anchorMinute)/r.periodMinutes));r.anchorMinute+k*r.periodMinutes<d.horizonMinutes[1];k++){const start=r.anchorMinute+k*r.periodMinutes,end=start+r.windowMinutes;if(end<=d.horizonMinutes[0])continue;const id=`O-${r.id.replace(/^RULE-/,'')}-${k}`;out.push({rule:r,id,start,end,history:d.trainingHistory.some(h=>h.ruleId===r.id&&h.occurrenceId===id&&h.completedMinute>=start&&h.completedMinute<end)});}}return out;}
function validate(d){
 const intervals=[];const ws=x=>{if(!arr(x)||!x.every(w=>arr(w)&&w.length===2))throw 'INVALID_SCHEMA';intervals.push(...x);};
 try{
 if(!obj(d)||!str(d.scenarioId)||!str(d.provenance)||d.synthetic!==true||!str(d.weekStart)||!/^\d{4}-\d\d-\d\dT00:00:00Z$/.test(d.weekStart)||!Number.isFinite(Date.parse(d.weekStart))||d.timezone!=='UTC')throw 'INVALID_SCHEMA';
 ws([d.horizonMinutes]);const p=d.policy;if(!obj(p)||!str(p.version)||!int(p.minimumRestMinutes)||p.minimumRestMinutes<0||!pos(p.dailyDutyLimitMinutes)||!pos(p.rolling24hDutyLimitMinutes)||p.recurrenceMode!=='fixed-window'||p.approvalStatus!=='unapproved-synthetic')throw 'INVALID_SCHEMA';
 for(const key of ['agents','personnel','resources','requests','trainingRules'])if(!arr(d[key])||!d[key].length||!d[key].every(obj))throw 'INVALID_SCHEMA';
 if(d.requests.length>24||d.personnel.length>200||!arr(d.trainingHistory)||!arr(d.initialAssignments))throw 'INVALID_SCHEMA';
 for(const a of d.agents)if(![a.id,a.department,a.name,a.proposalRule].every(str)||!strings(a.requestIds))throw 'INVALID_SCHEMA';
 for(const p of d.personnel){if(![p.id,p.displayName].every(str)||!strings(p.qualifications)||!pos(p.dailyDutyLimitMinutes)||!pos(p.rolling24hDutyLimitMinutes))throw 'INVALID_SCHEMA';ws(p.availability);ws(p.priorDuty);}
 for(const r of d.resources){if(!str(r.id)||!str(r.name)||r.capacity!==1)throw 'INVALID_SCHEMA';ws(r.availability);}
 if(!obj(d.operations))throw 'INVALID_SCHEMA';ws(d.operations.allowedWindows);ws(d.operations.blackouts);
 for(const r of d.requests){if(![r.id,r.agentId,r.family,r.ruleId,r.occurrenceId].every(str)||!pos(r.durationMinutes)||!int(r.requestedStartMinute)||!int(r.priority)||typeof r.mandatory!=='boolean'||!strings(r.resourceIds)||!arr(r.roles)||!r.roles.length||!arr(r.candidateWindows)||!r.candidateWindows.length||r.candidateWindows.length>100)throw 'INVALID_SCHEMA';ws(r.candidateWindows);for(const role of r.roles)if(!obj(role)||!str(role.qualification)||!pos(role.count)||!strings(role.preferredPersonIds))throw 'INVALID_SCHEMA';}
 for(const r of d.trainingRules)if(![r.id,r.family].every(str)||!int(r.anchorMinute)||!pos(r.periodMinutes)||r.windowMinutes!==r.periodMinutes||r.requiredCount!==1||!strings(r.requestIds)||typeof r.mandatory!=='boolean')throw 'INVALID_SCHEMA';
 for(const h of d.trainingHistory)if(!obj(h)||![h.id,h.ruleId,h.occurrenceId].every(str)||!int(h.completedMinute))throw 'INVALID_SCHEMA';
 for(const a of d.initialAssignments){if(!obj(a)||!str(a.requestId)||!strings(a.personIds)||!strings(a.resourceIds))throw 'INVALID_SCHEMA';ws([[a.startMinute,a.endMinute]]);}
 const s=d.search;if(!obj(s)||!pos(s.maxCandidateChecks)||s.requestOrder!=='priority-descending-then-id'||s.candidateOrder!=='listed-windows-then-person-id'||s.objective!=='first-feasible-complete-roster')throw 'INVALID_SCHEMA';
 if(int(d.horizonMinutes[0])&&int(d.horizonMinutes[1])&&d.horizonMinutes[1]-d.horizonMinutes[0]>10080)throw 'INVALID_SCHEMA';
 for(const key of ['agents','personnel','resources','requests','trainingRules','trainingHistory'])if(new Set(d[key].map(v=>v.id)).size!==d[key].length)throw 'DUPLICATE_ID';
 if(new Set(d.initialAssignments.map(a=>a.requestId)).size!==d.initialAssignments.length)throw 'DUPLICATE_ID';
 if(intervals.some(w=>!w.every(int)||w[1]<=w[0]))throw 'INVALID_INTERVAL';
 if(d.requests.some(r=>r.candidateWindows.some(w=>w[1]-w[0]!==r.durationMinutes)))throw 'INVALID_SCHEMA';
 const has=(k,id)=>d[k].some(x=>x.id===id);
 for(const a of d.agents)if(a.requestIds.some(id=>!has('requests',id)))throw 'INVALID_REFERENCE';
 for(const r of d.requests)if(!has('agents',r.agentId)||!has('trainingRules',r.ruleId)||r.resourceIds.some(id=>!has('resources',id))||r.roles.some(s=>s.preferredPersonIds.some(id=>!has('personnel',id))))throw 'INVALID_REFERENCE';
 for(const r of d.trainingRules)if(r.requestIds.some(id=>!has('requests',id)))throw 'INVALID_REFERENCE';
 for(const h of d.trainingHistory)if(!has('trainingRules',h.ruleId))throw 'INVALID_REFERENCE';
 for(const a of d.initialAssignments)if(!has('requests',a.requestId)||a.personIds.some(id=>!has('personnel',id))||a.resourceIds.some(id=>!has('resources',id)))throw 'INVALID_REFERENCE';
 const windowFor=(rule,id)=>{const prefix=`O-${rule.id.replace(/^RULE-/,'')}-`;if(!id.startsWith(prefix)||!/^\d+$/.test(id.slice(prefix.length)))return null;const k=Number(id.slice(prefix.length));return [rule.anchorMinute+k*rule.periodMinutes,rule.anchorMinute+(k+1)*rule.periodMinutes];};
 for(const r of d.requests){const rule=d.trainingRules.find(x=>x.id===r.ruleId);if(!d.agents.find(a=>a.id===r.agentId).requestIds.includes(r.id)||!rule.requestIds.includes(r.id)||rule.family!==r.family||!windowFor(rule,r.occurrenceId))throw 'INVALID_LINK';}
 for(const a of d.agents)if(a.requestIds.some(id=>d.requests.find(r=>r.id===id).agentId!==a.id))throw 'INVALID_LINK';
 for(const rule of d.trainingRules)if(rule.requestIds.some(id=>d.requests.find(r=>r.id===id).ruleId!==rule.id))throw 'INVALID_LINK';
 for(const h of d.trainingHistory){const w=windowFor(d.trainingRules.find(r=>r.id===h.ruleId),h.occurrenceId);if(!w||h.completedMinute<w[0]||h.completedMinute>=w[1])throw 'INVALID_LINK';}
 for(const o of occurrences(d))if(o.end<=d.horizonMinutes[1]&&!o.history&&!o.rule.requestIds.some(id=>d.requests.find(r=>r.id===id).occurrenceId===o.id))throw 'INVALID_LINK';
 return null;
 }catch(e){return typeof e==='string'?e:'INVALID_SCHEMA';}
}
export function conflicts(as){const out=[];for(let i=0;i<as.length;i++)for(let j=i+1;j<as.length;j++){const a=as[i],b=as[j];if(!overlap(span(a),span(b)))continue;const personIds=[...new Set(a.personIds.filter(id=>b.personIds.includes(id)))].sort(),resourceIds=[...new Set(a.resourceIds.filter(id=>b.resourceIds.includes(id)))].sort();if(personIds.length||resourceIds.length)out.push({requests:[a.requestId,b.requestId].sort(),personIds,resourceIds,overlapMinutes:[Math.max(a.startMinute,b.startMinute),Math.min(a.endMinute,b.endMinute)]});}return out.sort((a,b)=>cmp(a.requests.join('\0'),b.requests.join('\0')));}
const reasonOrder=['PERSON_OVERLAP','RESOURCE_OVERLAP','QUALIFICATION','AVAILABILITY','OPERATIONS','REST','DAILY_DUTY','ROLLING_DUTY','OCCURRENCE','CANDIDATE','STAFFING','MISSING_ASSIGNMENT'];
function dutyReasons(d,p,intervals){const reasons=[];for(let i=0;i<intervals.length;i++)for(let j=i+1;j<intervals.length;j++){const a=intervals[i],b=intervals[j];if(overlap(a,b))reasons.push('PERSON_OVERLAP');if(!overlap(a,b)&&Math.max(a[0],b[0])-Math.min(a[1],b[1])<d.policy.minimumRestMinutes)reasons.push('REST');}
 const sum=(s,e)=>intervals.reduce((n,w)=>n+Math.max(0,Math.min(e,w[1])-Math.max(s,w[0])),0);
 const days=new Set(intervals.flatMap(w=>{const a=[];for(let t=Math.floor(w[0]/1440);t<Math.ceil(w[1]/1440);t++)a.push(t);return a;}));
 if([...days].some(day=>sum(day*1440,(day+1)*1440)>Math.min(p.dailyDutyLimitMinutes,d.policy.dailyDutyLimitMinutes)))reasons.push('DAILY_DUTY');
 if(intervals.flatMap(w=>[w[0],w[1],w[0]-1440,w[1]-1440]).some(t=>sum(t,t+1440)>Math.min(p.rolling24hDutyLimitMinutes,d.policy.rolling24hDutyLimitMinutes)))reasons.push('ROLLING_DUTY');return reasons;}
function reasons(d,a,others,oc){const r=d.requests.find(r=>r.id===a.requestId),w=span(a),rs=[];const slots=r.roles.flatMap(s=>Array(s.count).fill(s.qualification));
 if(a.personIds.length!==slots.length||new Set(a.personIds).size!==a.personIds.length)rs.push('STAFFING');
 if(slots.some((q,i)=>!d.personnel.find(p=>p.id===a.personIds[i])?.qualifications.includes(q)))rs.push('QUALIFICATION');
 if(a.personIds.some(id=>!d.personnel.find(p=>p.id===id).availability.some(v=>inside(w,v)))||a.resourceIds.some(id=>!d.resources.find(r=>r.id===id).availability.some(v=>inside(w,v))))rs.push('AVAILABILITY');
 if(!inside(w,d.horizonMinutes)||!d.operations.allowedWindows.some(v=>inside(w,v))||d.operations.blackouts.some(v=>overlap(w,v)))rs.push('OPERATIONS');
 if(a.endMinute-a.startMinute!==r.durationMinutes||!r.candidateWindows.some(v=>v[0]===a.startMinute&&v[1]===a.endMinute)||a.resourceIds.slice().sort().join()!==r.resourceIds.slice().sort().join())rs.push('CANDIDATE');
 const o=oc.find(o=>o.id===r.occurrenceId&&o.rule.id===r.ruleId);if(!o||!inside(w,[o.start,o.end]))rs.push('OCCURRENCE');
 for(const b of others)if(overlap(w,span(b))){if(a.personIds.some(id=>b.personIds.includes(id)))rs.push('PERSON_OVERLAP');if(a.resourceIds.some(id=>b.resourceIds.includes(id)))rs.push('RESOURCE_OVERLAP');}
 for(const id of a.personIds){const p=d.personnel.find(p=>p.id===id);rs.push(...dutyReasons(d,p,[...p.priorDuty,...others.filter(b=>b.personIds.includes(id)).map(span),w]));}
 return reasonOrder.filter(v=>rs.includes(v));}
function* staff(d,r,index=0,chosen=[]){const slots=r.roles.flatMap(role=>Array(role.count).fill(role));if(index===slots.length){yield chosen;return;}const role=slots[index];const ids=[...new Set([...role.preferredPersonIds,...d.personnel.map(p=>p.id).sort()])].filter(id=>d.personnel.find(p=>p.id===id).qualifications.includes(role.qualification));for(const id of ids)if(!chosen.includes(id))yield* staff(d,r,index+1,[...chosen,id]);}
// Department-owned proposal state. Prose is a label, never evaluated as code.
// The frozen wire protocol fixes the executable policy: listed windows, preferred
// qualified crew, then qualified IDs. Each agent receives coordinator feedback.
export class DepartmentAgent {
 constructor(data, owner) { this.data=data; this.owner=owner; this.feedback=[]; }
 *propose(request) {
  if(request.agentId!==this.owner.id||!this.owner.requestIds.includes(request.id)) throw Error('Request ownership mismatch');
  for(const window of request.candidateWindows) for(const personIds of staff(this.data,request)) {
   const feedback=yield {requestId:request.id,startMinute:window[0],endMinute:window[1],personIds,resourceIds:[...request.resourceIds].sort()};
   if(feedback) this.feedback.push({requestId:request.id,...feedback});
  }
 }
}
export function negotiate(data, requests, check) {
 const agents=new Map(data.agents.map(owner=>[owner.id,new DepartmentAgent(data,owner)]));
 const assignments=[],decisions=[];let count=0,exhausted=false;
 const coordinate=index=>{
  if(index===requests.length)return true;
  const request=requests[index],agent=agents.get(request.agentId),proposals=agent.propose(request);
  let next=proposals.next();
  while(!next.done){
   if(count===data.search.maxCandidateChecks){exhausted=true;return false;}
   count++;const candidate=next.value,reasons=check(candidate,assignments);
   decisions.push({agentId:agent.owner.id,requestId:request.id,startMinute:candidate.startMinute,personIds:candidate.personIds,outcome:reasons.length?'rejected':'accepted',reasons});
   if(!reasons.length){
    assignments.push(candidate);if(coordinate(index+1))return true;assignments.pop();
    if(exhausted)return false;
   }
   next=proposals.next({outcome:reasons.length?'rejected':'backtracked',reasons:[...reasons]});
  }
  return false;
 };
 const agreed=coordinate(0);
 return {status:agreed?'feasible':exhausted?'budget_exhausted':'infeasible',assignments:agreed?assignments:[],decisions,agents};
}
export function run(input){const action=input?.action===undefined?'solve':input.action;if(!['solve','status','allocations','loading','coverage','conflicts','check'].includes(action))return {status:'invalid-input',error:'INVALID_ACTION'};const d=input?.data;const error=validate(d);if(error)return {status:'invalid-input',error};
 const oc=occurrences(d),req=ordered(d).filter(r=>oc.some(o=>o.id===r.occurrenceId&&o.rule.id===r.ruleId&&!o.history&&o.end<=d.horizonMinutes[1]));let assignments=[],negotiation=[],status='feasible';
 const decision=(r,a,rs)=>({agentId:r.agentId,requestId:r.id,startMinute:a.startMinute,personIds:a.personIds,outcome:rs.length?'rejected':'accepted',reasons:rs});
 const badPrior=d.personnel.some(p=>dutyReasons(d,p,p.priorDuty).length);
 if(action==='check'){assignments=ordered(d).flatMap(r=>d.initialAssignments.filter(a=>a.requestId===r.id).map(a=>({...a,resourceIds:[...a.resourceIds].sort()})));for(const a of assignments){const r=d.requests.find(r=>r.id===a.requestId),rs=reasons(d,a,assignments.filter(b=>b!==a),oc);negotiation.push(decision(r,a,rs));}for(const r of req)if(!assignments.some(a=>a.requestId===r.id))negotiation.push(decision(r,{startMinute:r.requestedStartMinute,personIds:[]},['MISSING_ASSIGNMENT']));if(badPrior||negotiation.some(x=>x.outcome==='rejected'))status='invalid-board';
 }else{if(badPrior){status='infeasible';}else{const result=negotiate(d,req,(a,others)=>reasons(d,a,others,oc));status=result.status;assignments=result.assignments;negotiation=result.decisions;}}
 const coverage=oc.map(o=>{const linked=o.rule.requestIds.filter(id=>d.requests.find(r=>r.id===id).occurrenceId===o.id),a=assignments.find(a=>linked.includes(a.requestId)&&inside(span(a),[o.start,o.end]));const state=o.end>d.horizonMinutes[1]?'pending-future':o.history?'satisfied-by-history':a?'satisfied-by-schedule':'unmet';return {occurrenceId:o.id,status:state,requestId:state==='satisfied-by-history'?null:a?.requestId??linked[0]??null,deadlineMinute:o.end};});
 const loads=[...d.personnel].sort((a,b)=>cmp(a.id,b.id)).map(p=>{const aa=assignments.filter(a=>a.personIds.includes(p.id)),drillMinutes=aa.reduce((n,a)=>n+a.endMinute-a.startMinute,0),priorDutyMinutes=p.priorDuty.reduce((n,w)=>n+w[1]-w[0],0),drillMinutesByDay=[];for(let day=Math.floor(d.horizonMinutes[0]/1440);day<Math.ceil(d.horizonMinutes[1]/1440);day++)drillMinutesByDay.push(aa.reduce((n,a)=>n+Math.max(0,Math.min(a.endMinute,(day+1)*1440,d.horizonMinutes[1])-Math.max(a.startMinute,day*1440,d.horizonMinutes[0])),0));return {personId:p.id,drillMinutes,priorDutyMinutes,totalDutyMinutes:drillMinutes+priorDutyMinutes,drillMinutesByDay};});
 const initialConflicts=conflicts(d.initialAssignments),remainingConflicts=conflicts(assignments).length;
 if(action==='status')return {status,error:null};if(action==='allocations')return {status,assignments};if(action==='loading')return {status,loads};if(action==='coverage')return {status,coverage};if(action==='conflicts')return {status,initialConflicts,remainingConflicts};return {status,assignments,loads,coverage,initialConflicts,remainingConflicts,negotiation,reviewAllowed:status==='feasible'&&!coverage.some(c=>c.status==='unmet'),synthetic:true,warning};}
if(parentPort&&workerData?.pb4t)parentPort.postMessage(run(workerData.input));
