import {solveOrdered} from '../lib/scheduling.js';
import {minute,interval,overlap,recurrence,duty,fatigueReason} from './policy.mjs';
import {proposals,negotiation} from './agents.mjs';
const fits=(a,ws)=>ws.some(w=>{w=interval(w);return a.start>=w.start&&a.end<=w.end;});
export function candidateReason(p,r,a,assigned,occurrences) {
 if(new Set(a.personIds).size!==a.personIds.length)return 'distinct personnel required';
 if(!fits(a,[p.metadata.horizon])||!fits(a,r.allowedStartWindows))return 'execution window';
 const o=occurrences.find(o=>o.occurrenceId===r.occurrenceId);
 if(!o||a.start<o.previous||a.end>minute(o.deadline))return 'recurrence deadline';
 let offset=0;
 for(const role of r.roles)for(let j=0;j<role.count;j++) {
  const id=a.personIds[offset++];const person=p.roster.find(v=>v.id===id);
  if(!person.qualifications.some(q=>q.id===role.qualificationId&&minute(q.validFrom)<=a.start&&minute(q.validUntil)>=a.end))return 'qualification: '+person.id;
  if(!fits(a,person.availability))return 'availability: '+person.id;
 }
 for(const op of p.operationalWindows)if(overlap(a,interval(op.interval))&&(op.prohibitedFamilies.includes(r.family)||r.resourceDemands.some(d=>op.prohibitedResourceIds.includes(d.resourceId))))return 'operation: '+op.id;
 for(const d of r.resourceDemands) {
  const resource=p.resources.find(v=>v.id===d.resourceId);
  if(!fits(a,resource.availability))return 'resource availability: '+d.resourceId;
  const events=[];
  for(const b of [...assigned,a]){const req=p.requests.find(q=>q.id===b.requestId),units=req.resourceDemands.find(v=>v.resourceId===d.resourceId)?.units??0;if(units){events.push([b.start,units],[b.end,-units]);}}
  events.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let load=0;for(const [,n] of events){load+=n;if(load>resource.capacity)return 'capacity: '+d.resourceId;}
 }
 return fatigueReason(p,[...assigned,a]);
}
export function baseline(p) {
 const collisions=[], operations=[];
 for(const kind of ['person','resource'])for(let i=0;i<p.requests.length;i++)for(let j=i+1;j<p.requests.length;j++) {
  const a=p.requests[i],b=p.requests[j];if(!overlap({start:minute(a.preferredStart),end:minute(a.preferredStart)+a.durationMinutes},{start:minute(b.preferredStart),end:minute(b.preferredStart)+b.durationMinutes}))continue;
  for(const item of kind==='person'?p.roster:p.resources) {
   const collide=kind==='person'?a.preferredPersonIds.includes(item.id)&&b.preferredPersonIds.includes(item.id):(a.resourceDemands.find(d=>d.resourceId===item.id)?.units??0)>0&&(b.resourceDemands.find(d=>d.resourceId===item.id)?.units??0)>0&&(a.resourceDemands.find(d=>d.resourceId===item.id)?.units??0)+(b.resourceDemands.find(d=>d.resourceId===item.id)?.units??0)>item.capacity;
   if(collide)collisions.push({kind,id:item.id,requests:[a.id,b.id]});
  }
 }
 for(const r of p.requests)for(const w of p.operationalWindows)if(overlap({start:minute(r.preferredStart),end:minute(r.preferredStart)+r.durationMinutes},interval(w.interval))&&(w.prohibitedFamilies.includes(r.family)||r.resourceDemands.some(d=>w.prohibitedResourceIds.includes(d.resourceId))))operations.push(r.id+':'+w.id);
 return {baselineCollisions:collisions,baselineOperationalViolations:operations};
}
export async function schedule(p,signal,diagnostics={}) {
 const rec=recurrence(p);
 const possible=!rec.occurrences.some(o=>o.mandatory&&!o.requestId)&&!fatigueReason(p,[]);
 const search=possible?await solveOrdered({requests:p.requests,budget:p.searchBudget,signal,
  candidates:function*(r){for(const proposal of proposals(p,r))yield {requestId:r.id,start:minute(proposal.start),end:minute(proposal.start)+r.durationMinutes,personIds:proposal.personIds};},
  reject:(r,a,assigned)=>candidateReason(p,r,a,assigned,rec.occurrences)
 }):{feasible:false,exhausted:false,assigned:[],attempts:0,rejections:[]};
 const {feasible,exhausted,assigned,attempts,rejections}=search;
 const status=feasible?'feasible':exhausted?'exhausted':'infeasible';
 const allocations=feasible?assigned.map(a=>({requestId:a.requestId,start:new Date(a.start*60000-5*3600000).toISOString().slice(0,19)+'-05:00',personIds:a.personIds})):[];
 Object.assign(diagnostics,{attempts,rejections:[...rejections]});
 const base=baseline(p), load=duty(p,feasible?assigned:[]),training=Object.fromEntries(p.roster.map(v=>[v.id,0]));
 if(feasible)for(const a of assigned)for(const id of a.personIds)training[id]+=a.end-a.start;
 const covered=rec.occurrences.filter(o=>feasible&&o.requestId);
 return {status,allocations,...base,occurrences:rec.occurrences.map(({occurrenceId,deadline,requestId})=>({occurrenceId,deadline,requestId})),nextOutsideHorizon:rec.nextOutsideHorizon,trainingMinutesByPerson:training,dutyMinutesByPersonInHorizon:load.totals,personDayMinutes:load.days,totalTrainingPersonMinutes:Object.values(training).reduce((s,n)=>s+n,0),coveredCount:covered.length,unmet:rec.occurrences.filter(o=>!feasible||!o.requestId).map(o=>o.occurrenceId),negotiation:negotiation(p,allocations,base.baselineCollisions,base.baselineOperationalViolations,status)};
}
