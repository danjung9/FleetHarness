export const minute = s => Date.parse(s) / 60000;
export const stamp = n => new Date(n * 60000 - 5 * 3600000).toISOString().slice(0,19) + '-05:00';
export const overlap = (a,b) => a.start < b.end && b.start < a.end;
export const interval = v => ({start:minute(v.start),end:minute(v.end)});
export function recurrence(p) {
 const occurrences=[], nextOutsideHorizon=[];
 p.trainingRequirements.forEach((r,index)=>{
  let previous=Math.max(...p.completionHistory.filter(h=>h.requirementId===r.id).map(h=>minute(h.completedEnd)));
  let deadline=previous+r.intervalDays*1440;
  while(deadline<minute(p.metadata.horizon.end)) {
   const occurrenceId=r.id+'@'+stamp(deadline);
   occurrences.push({occurrenceId,deadline:stamp(deadline),requestId:p.requests.find(q=>q.occurrenceId===occurrenceId)?.id??null,previous,mandatory:r.mandatory,index,requirementId:r.id});
   previous=deadline;deadline+=r.intervalDays*1440;
  }
  nextOutsideHorizon.push({requirementId:r.id,deadline:stamp(deadline)});
 });
 occurrences.sort((a,b)=>minute(a.deadline)-minute(b.deadline)||a.index-b.index);
 return {occurrences,nextOutsideHorizon};
}
function union(xs) {
 const sorted=xs.filter(a=>a.end>a.start).sort((a,b)=>a.start-b.start), out=[];
 for(const a of sorted) {const b=out.at(-1);if(b&&a.start<=b.end)b.end=Math.max(b.end,a.end);else out.push({...a});}return out;
}
export function duty(p, assignments, clipped=true) {
 const horizon=interval(p.metadata.horizon), totals={}, days={};
 for(const person of p.roster) {
  let xs=[...p.fixedDuties.filter(d=>d.personId===person.id).map(d=>interval(d.interval)),...assignments.filter(a=>a.personIds.includes(person.id)).map(a=>({start:a.start,end:a.end}))];
  if(clipped) xs=xs.map(a=>({start:Math.max(a.start,horizon.start),end:Math.min(a.end,horizon.end)}));
  xs=union(xs);totals[person.id]=xs.reduce((s,a)=>s+a.end-a.start,0);
  for(const a of xs) {let t=a.start;while(t<a.end){const day=stamp(t).slice(0,10), midnight=minute(day+'T00:00:00-05:00')+1440,end=Math.min(a.end,midnight);days[day]??=Object.fromEntries(p.roster.map(v=>[v.id,0]));days[day][person.id]+=end-t;t=end;}}
 }
 return {totals,days};
}
export function fatigueReason(p,as) {
 for(const person of p.roster) {
  const xs=[...p.fixedDuties.filter(d=>d.personId===person.id).map(d=>interval(d.interval)),...as.filter(a=>a.personIds.includes(person.id))];
  for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++) if(xs[i].start<xs[j].end+p.policy.minRestMinutes&&xs[j].start<xs[i].end+p.policy.minRestMinutes)return 'rest: '+person.id;
 }
 const all=duty(p,as,false), clipped=duty(p,as,true);
 if(Object.values(all.days).some(v=>Object.values(v).some(n=>n>p.policy.maxDutyMinutesPerCalendarDay)))return 'daily duty budget';
 if(Object.values(clipped.totals).some(n=>n>p.policy.maxDutyMinutesPerHorizon))return 'horizon duty budget';
 return null;
}
