/* Synthetic training application core. Dependency-free; embedded verbatim in index.html. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const ids=['A','B','C','D'];
function sample(){return {epoch:'Day 1 minute 0',operatingWindows:[[0,240],[1440,1680]],people:[{id:'P01',qualifications:['Q-A'],availability:[[0,240],[1440,1680]],maxMinutes:120,minRestMinutes:30},{id:'P02',qualifications:['Q-B'],availability:[[0,240],[1440,1680]],maxMinutes:120,minRestMinutes:0}],requests:ids.map((id,i)=>({id,duration:60,starts:i===1?[0,90]:[i===3?1440:0],person:i<2?'P01':'P02',room:i<2?'Room-1':'Room-2',qualification:i<2?'Q-A':'Q-B'})),maxNodes:50000};}
const integer=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
function validateInputs(x){
 const errors={}; const err=(k,v)=>errors[k]=v;
 const windows=w=>Array.isArray(w)&&w.length>0&&w.length<=100&&w.every(a=>Array.isArray(a)&&a.length===2&&integer(a[0])&&integer(a[1])&&a[1]>a[0]);
 if(!x||typeof x!=='object')return {inputs:'Expected a synthetic input object.'};
 if(x.epoch!=='Day 1 minute 0')err('epoch','Epoch must be Day 1 minute 0.');
 if(!windows(x.operatingWindows))err('operating-windows','Use windows such as 0-240;1440-1680.');
 if(!integer(x.maxNodes,1)||x.maxNodes>200000)err('max-nodes','Search allowance must be 1–200000 whole nodes.');
 if(!Array.isArray(x.people)||x.people.length!==2)err('people','Keep exactly P01 and P02.');
 else x.people.forEach((p,i)=>{
 if(!p||p.id!==['P01','P02'][i])return err('people','Keep P01 and P02 in their supplied order.');
 if(!Array.isArray(p.qualifications)||!p.qualifications.length||p.qualifications.length>100||!p.qualifications.every(q=>typeof q==='string'&&q.trim()===q&&q.length>0&&q.length<=80))err('qualifications-'+p.id,'Enter comma-separated qualification tokens.');
 if(!windows(p.availability))err('availability-'+p.id,'Use windows such as 0-240;1440-1680.');
 if(!integer(p.maxMinutes))err('budget-'+p.id,'Budget must be nonnegative whole minutes across both days.');
 if(!integer(p.minRestMinutes))err('rest-'+p.id,'Rest must be nonnegative whole minutes.');
 });
 if(!Array.isArray(x.requests)||x.requests.length!==4)err('requests','Keep exactly requests A, B, C, D.');
 else x.requests.forEach((r,i)=>{
 const ref=sample().requests[i];
 if(!r||['id','person','room','qualification'].some(k=>r[k]!==ref[k]))return err('requests','Fixed request identities, people, rooms and requirements cannot change.');
 if(!integer(r.duration,1))err('duration-'+r.id,r.id+' duration must be a positive whole number of minutes.');
 if(!Array.isArray(r.starts)||!r.starts.length||r.starts.length>100||!r.starts.every(n=>integer(n)&&Number.isSafeInteger(n+r.duration)))err('starts-'+r.id,'Enter up to 100 comma-separated nonnegative whole start minutes with safe end arithmetic.');
 });return errors;
}
function computeLoads(assignments){return {P01:assignments.filter(a=>a.person==='P01').reduce((n,a)=>n+a.end-a.start,0),P02:assignments.filter(a=>a.person==='P02').reduce((n,a)=>n+a.end-a.start,0)};}
// Independent full-output checker: completeness, each interval, every pair, totals.
function checkDraft(x,assignments){
 const errors=[];if(Object.keys(validateInputs(x)).length)return {ok:false,errors:['Invalid inputs.']};
 if(!Array.isArray(assignments)||assignments.length!==4||assignments.some(a=>!a||typeof a!=='object'))return {ok:false,errors:['All four assignments are required.']};
 for(const r of x.requests){
 const matches=assignments.filter(a=>a.requestId===r.id);if(matches.length!==1){errors.push(r.id+': missing or duplicated assignment.');continue;}
 const a=matches[0],p=x.people.find(p=>p.id===r.person);
 if(!integer(a.start)||!integer(a.end)||a.end-a.start!==r.duration||!r.starts.includes(a.start)||a.person!==r.person||a.room!==r.room)errors.push(r.id+': assignment differs from request.');
 if(!x.operatingWindows.some(w=>a.start>=w[0]&&a.end<=w[1]))errors.push(r.id+': outside operating windows.');
 if(!p.availability.some(w=>a.start>=w[0]&&a.end<=w[1]))errors.push(r.id+': outside '+p.id+' availability.');
 if(!p.qualifications.includes(r.qualification))errors.push(r.id+': '+p.id+' lacks '+r.qualification+'.');
 }
 for(let i=0;i<assignments.length;i++)for(let j=i+1;j<assignments.length;j++){
 const a=assignments[i],b=assignments[j],overlap=a.start<b.end&&b.start<a.end;
 if(a.room===b.room&&overlap)errors.push(a.requestId+' / '+b.requestId+': shared-room collision.');
 if(a.person===b.person){const p=x.people.find(p=>p.id===a.person);if(p){const gap=Math.max(a.start,b.start)-Math.min(a.end,b.end);if(overlap||gap<p.minRestMinutes)errors.push(a.requestId+' / '+b.requestId+': person overlap or insufficient rest.');}}
 }
 const loads=computeLoads(assignments);for(const p of x.people)if(loads[p.id]>p.maxMinutes)errors.push(p.id+': whole-horizon duty budget exceeded.');
 return {ok:errors.length===0,errors,loads};
}
function solveDraft(x){
 const errors=validateInputs(x);if(Object.keys(errors).length)return {status:'invalid',assignments:[],loads:{},errors};
 let nodes=0,exhausted=false;const assigned=[],reasons=new Set();
 function visit(i){if(i===4)return true;const r=x.requests[i],p=x.people.find(p=>p.id===r.person);
 for(const start of [...new Set(r.starts)].sort((a,b)=>a-b)){
 if(nodes>=x.maxNodes){exhausted=true;return false;}nodes++;
 const a={requestId:r.id,start,end:start+r.duration,person:r.person,room:r.room};let reason='';
 if(!p.qualifications.includes(r.qualification))reason=r.id+': '+p.id+' lacks '+r.qualification+'.';
 else if(!x.operatingWindows.some(w=>start>=w[0]&&a.end<=w[1]))reason=r.id+': outside operating windows.';
 else if(!p.availability.some(w=>start>=w[0]&&a.end<=w[1]))reason=r.id+': outside '+p.id+' availability.';
 else if(assigned.some(b=>b.room===a.room&&start<b.end&&b.start<a.end))reason=r.id+': shared-room collision.';
 else if(assigned.some(b=>b.person===a.person&&start<b.end+p.minRestMinutes&&b.start<a.end+p.minRestMinutes))reason=r.id+': person overlap or insufficient rest.';
 else if(assigned.filter(b=>b.person===p.id).reduce((n,b)=>n+b.end-b.start,r.duration)>p.maxMinutes)reason=p.id+': whole-horizon duty budget exceeded.';
 if(reason){reasons.add(reason);continue;}assigned.push(a);if(visit(i+1))return true;assigned.pop();if(exhausted)return false;
 }return false;}
 const feasible=visit(0);if(feasible){const checked=checkDraft(x,assigned);if(!checked.ok)throw new Error('Independent check failed: '+checked.errors.join(' '));}
 return {status:feasible?'feasible':exhausted?'budget_exhausted':'infeasible',assignments:feasible?copy(assigned):[],loads:feasible?computeLoads(assigned):{},explanations:feasible?[]:[...reasons],nodes};
}
function draftOnly(d){return {status:d.status,assignments:copy(d.assignments),loads:copy(d.loads)};}
function serializeSnapshot(inputs,draft){const s={schemaVersion:1,classification:'synthetic',inputs:copy(inputs),draft:draftOnly(draft)};validateSnapshot(JSON.stringify(s));return JSON.stringify(s);}
function validateSnapshot(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>1048576)throw new Error('Snapshot must be at most 1 MiB.');
 const s=JSON.parse(text);if(!s||typeof s!=='object'||s.schemaVersion!==1||s.classification!=='synthetic'||Object.keys(validateInputs(s.inputs)).length)throw new Error('Invalid synthetic schema or inputs.');
 if(!s.draft||!['feasible','infeasible','budget_exhausted'].includes(s.draft.status))throw new Error('Invalid draft status.');
 if(s.draft.status==='feasible'){
 const c=checkDraft(s.inputs,s.draft.assignments);if(!c.ok||JSON.stringify(c.loads)!==JSON.stringify(s.draft.loads))throw new Error('Draft constraints or totals do not match.');
 }else{const actual=solveDraft(s.inputs);if(actual.status!==s.draft.status||JSON.stringify(s.draft.assignments)!=='[]'||JSON.stringify(s.draft.loads)!=='{}')throw new Error('Unverified nonfeasible claim.');}
 return {schemaVersion:1,classification:'synthetic',inputs:copy(s.inputs),draft:draftOnly(s.draft)};
}
function reviewState(state,event){if(event==='edit'||event==='restore')return false;if(event==='review')return state.draft?.status==='feasible'&&checkDraft(state.inputs,state.draft.assignments).ok;return !!state.reviewed;}
const api={sample,validateInputs,solveDraft,checkDraft,computeLoads,serializeSnapshot,validateSnapshot,reviewState,draftOnly};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TrainingCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
