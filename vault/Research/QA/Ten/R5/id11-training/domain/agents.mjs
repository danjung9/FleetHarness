// Each department owns the ordered role combinations for its requests.
function* combinations(ids,n,offset=0,prefix=[]) {
 if(n===0){yield prefix;return;}
 for(let i=offset;i<=ids.length-n;i++)yield* combinations(ids,n-1,i+1,[...prefix,ids[i]]);
}
export function* personnel(roles,i=0,selected=[]) {
 if(i===roles.length){yield selected;return;}
 for(const group of combinations(roles[i].candidatePersonIds,roles[i].count)) {
  yield* personnel(roles,i+1,[...selected,...group]);
 }
}
export function* proposals(p,r) {
 const department=p.departments.find(d=>d.id===r.departmentId);
 if(!department) return;
 for(const start of r.candidateStarts)for(const personIds of personnel(r.roles))yield {requestId:r.id,start,personIds};
}
export function negotiation(p,allocations,baselineCollisions,baselineOperationalViolations,status) {
 return p.requests.map(r=>{
 const a=allocations.find(a=>a.requestId===r.id);
 return {departmentId:r.departmentId,requestId:r.id,proposalStart:r.preferredStart,proposalPersonIds:r.preferredPersonIds,counterStart:a?.start??null,counterPersonIds:a?.personIds??[],objections:[...baselineCollisions.filter(c=>c.requests.includes(r.id)).map(c=>`${c.kind}:${c.id}:${c.requests.join('/')}`),...baselineOperationalViolations.filter(v=>v.startsWith(r.id+':')).map(v=>'operation:'+v),...(status==='feasible'?[]:['unscheduled'])],response:a?'accept':'unresolved',disposition:!a?'unresolved':JSON.stringify(a.personIds)!==JSON.stringify(r.preferredPersonIds)?'reassigned':a.start!==r.preferredStart?'moved':'retained'};
 });
}
