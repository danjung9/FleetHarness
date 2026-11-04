function createPB4T(){
'use strict';
const disclosure='Synthetic demonstration; synthetic, not validated against the real format. Not validated against real SFTRM rules or operational data.';
const clone=x=>JSON.parse(JSON.stringify(x));
const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const time=n=>days[Math.floor(n/1440)]+' '+String(Math.floor(n%1440/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const alt=(person,start,resource)=>({person,start,resource});
function fixture(kind='weekly'){
 const people=[['Alex',['EOOW','Fire Party Leader','TAO'],180,60],['Blair',['Fire Party Leader'],120,0],['Casey',['TAO','Flight Coordinator'],120,0]].map(([name,qualifications,maxMinutes,prior])=>({name,qualifications,maxMinutes,prior,minRestMinutes:60,windows:[[0,10080]]}));
 const make=(id,department,title,role,choices,release=0,due=9720)=>({id,department,agent:department+' Agent',title,role,duration:60,alternatives:choices,release,due,windows:[[0,10080]]});
 const a=alt;
 let occurrences=[make('ENG-1','Engineering','Engineering casualty control','EOOW',[a('Alex',480,'Trainer')],0,3420),make('WPN-1','Weapons','Weapons exercise','Fire Party Leader',[a('Alex',480,'Trainer'),a('Blair',600,'Range')]),make('CS-1','Combat Systems','Combat Systems exercise','TAO',[a('Alex',480,'Trainer'),a('Casey',600,'Trainer')]),make('DC-1','Damage Control','Damage Control drill','Fire Party Leader',[a('Blair',3360,'Trainer')]),make('ENG-2','Engineering','Engineering casualty control','EOOW',[a('Alex',4800,'Trainer')],3420,7740),make('AIR-1','Air','Flight quarters','Flight Coordinator',[a('Casey',6240,'Flight deck')])];
 if(kind==='impossible') occurrences=occurrences.slice(0,2).map(o=>({...o,alternatives:o.alternatives.slice(0,1)}));
 if(['exact-boundary','rest-short','duty-over'].includes(kind)){
 people[0].windows=[[480,700]];
 occurrences=[make('BOUND-1','Engineering','Boundary drill','EOOW',[a('Alex',480,'Trainer')],0,700),make('BOUND-2','Engineering','Boundary drill','EOOW',[a('Alex',kind==='rest-short'?599:600,'Trainer')],0,700)];
 if(kind==='exact-boundary'){people[0].windows=[[480,660]];occurrences.forEach(o=>o.due=660);}
 if(kind==='duty-over')occurrences[1].duration=61;
 }
 if(kind==='missing-qualification') occurrences[1].alternatives.forEach(a=>a.person='Casey');
 if(kind==='unavailable'){people[1].windows=[[0,600],[660,10080]];occurrences[1].alternatives=[a('Blair',600,'Range')];}
 let rules=occurrences.map(o=>({id:o.id,release:o.release,due:o.due}));
 // Anchored recurrence expands independently of submitted Engineering proposals.
 if(!['impossible','exact-boundary','rest-short','duty-over'].includes(kind)){
 const engineering=[];for(let due=-900+4320,index=1;due<10080;due+=4320,index++)if(due>=0)engineering.push({id:'ENG-'+index,release:index===1?0:due-4320,due});
 rules=[...engineering,...rules.filter(r=>!r.id.startsWith('ENG-'))];
 }
 if(kind==='missing-occurrence')occurrences=occurrences.filter(o=>o.id!=='ENG-2');
 return {schemaVersion:1,classification:'synthetic',disclosure,kind,epoch:'2026-11-02T00:00:00Z',horizon:{start:0,end:10080},policy:{id:'SYN-PB4T-1',minimumRest:60},recurrence:kind==='missing-policy'?null:{rules,priorEngineering:-900,nextEngineering:12060,interval:4320},priorDuty:[{person:'Alex',start:-960,end:-900}],people,resources:['Trainer','Range','Flight deck'].map(name=>({name,windows:[[0,10080]]})),operationalWindows:[[0,10080]],occurrences,maxNodes:5000};
}
const fits=(windows,s,e)=>windows.some(([lo,hi])=>s>=lo&&e<=hi);
function validateInput(d){
 if(!d||typeof d!=='object')return 'invalid input structure.';
 if(!d.recurrence)return 'synthetic recurrence policy is missing.';
 const interval=(lo,hi)=>Number.isSafeInteger(lo)&&Number.isSafeInteger(hi)&&lo<hi;
 const windows=w=>Array.isArray(w)&&w.every(v=>Array.isArray(v)&&v.length===2&&interval(v[0],v[1]));
 if(!['people','resources','occurrences','priorDuty'].every(k=>Array.isArray(d[k]))||!Array.isArray(d.recurrence.rules))return 'invalid input structure.';
 if(!d.horizon||!interval(d.horizon.start,d.horizon.end))return 'invalid horizon.';
 if(!windows(d.operationalWindows)||d.people.some(p=>!p||typeof p.name!=='string'||!Array.isArray(p.qualifications)||!p.qualifications.every(q=>typeof q==='string')||!windows(p.windows))||d.resources.some(r=>!r||typeof r.name!=='string'||!windows(r.windows))||d.occurrences.some(o=>!o||typeof o.id!=='string'||!Array.isArray(o.alternatives)||o.alternatives.some(a=>!a)||!windows(o.windows)))return 'invalid roster, candidate or availability window.';
 if(d.recurrence.rules.some(r=>!r||typeof r.id!=='string'||!interval(r.release,r.due)))return 'invalid recurrence release or deadline.';
 if(d.priorDuty.some(b=>!b||!d.people.some(p=>p.name===b.person)||!interval(b.start,b.end)))return 'invalid prior duty interval or person.';
 if(!d.policy||!d.occurrences.length)return 'synthetic policy and mandatory occurrences are required.';
 if(!Number.isInteger(d.maxNodes)||d.maxNodes<1||d.maxNodes>200000)return 'search budget must be a whole number from 1 to 200000.';
 if(d.people.some(p=>!Number.isInteger(p.minRestMinutes)||p.minRestMinutes<0||!Number.isInteger(p.maxMinutes)||p.maxMinutes<0))return 'invalid rest or duty budget.';
 if(new Set(d.people.map(p=>p.name)).size!==d.people.length||new Set(d.resources.map(r=>r.name)).size!==d.resources.length)return 'duplicate person or resource.';
 if(new Set(d.recurrence.rules.map(r=>r.id)).size!==d.recurrence.rules.length)return 'duplicate recurrence obligation.';
 const ids=new Set();
 for(const o of d.occurrences){if(ids.has(o.id))return 'duplicate occurrence '+o.id+'.';ids.add(o.id);if(!Number.isInteger(o.duration)||o.duration<=0)return 'duration must be positive.';if(!o.alternatives.length)return 'candidate allocations are required.';for(const a of o.alternatives)if(!d.people.some(p=>p.name===a.person)||!d.resources.some(r=>r.name===a.resource)||!Number.isInteger(a.start))return 'unknown personnel, resource or invalid start.';}
 for(const r of d.recurrence.rules)if(!ids.has(r.id))return 'mandatory occurrence '+r.id+' is missing.';
 if(ids.size!==d.recurrence.rules.length)return 'occurrence inventory does not match recurrence policy.';
 for(const w of [...d.operationalWindows,...d.people.flatMap(p=>p.windows),...d.resources.flatMap(r=>r.windows)])if(w.length!==2||!w.every(Number.isInteger)||w[0]>=w[1])return 'invalid availability window.';
 return '';
}
function assignment(o,a){return {...a,id:o.id,end:a.start+o.duration};}
function violations(d,board,complete=false){
 const issues=[];let personnel=0,resources=0;
 if(complete&&board.length!==d.recurrence.rules.length)issues.push('Incomplete mandatory occurrence inventory.');
 const seen=new Set();
 for(const b of board){const o=d.occurrences.find(o=>o.id===b.id);if(!o||seen.has(b.id)){issues.push('Unknown or duplicate occurrence.');continue;}seen.add(b.id);
 const p=d.people.find(p=>p.name===b.person),r=d.resources.find(r=>r.name===b.resource);
 if(!p||!r){issues.push('Unknown personnel or resource.');continue;}
 if(!o.alternatives.some(a=>a.person===b.person&&a.resource===b.resource&&a.start===b.start)||b.end!==b.start+o.duration)issues.push(b.id+': allocation is not a supplied candidate.');
 if(!p.qualifications.includes(o.role))issues.push(b.id+': no candidate holds '+o.role+'.');
 if(!fits(p.windows,b.start,b.end))issues.push(b.id+': no candidate fits personnel availability.');
 const rule=d.recurrence.rules.find(r=>r.id===o.id);
 if(!rule||b.start<rule.release||b.end>rule.due||b.start<d.horizon.start||b.end>d.horizon.end||!fits(d.operationalWindows,b.start,b.end)||!fits(o.windows,b.start,b.end)||!fits(r.windows,b.start,b.end))issues.push(b.id+': outside operational, resource or due window.');
 }
 for(let i=0;i<board.length;i++)for(let j=i+1;j<board.length;j++){
 const a=board[i],b=board[j],overlap=a.start<b.end&&b.start<a.end;
 if(overlap&&a.person===b.person)personnel++;
 if(overlap&&a.resource===b.resource)resources++;
 if(overlap&&(a.person===b.person||a.resource===b.resource))issues.push(a.id+' and '+b.id+' overlap on '+[a.person===b.person?a.person:'',a.resource===b.resource?a.resource:''].filter(Boolean).join(' and ')+'.');
 }
 for(const p of d.people){const tasks=[...board.filter(b=>b.person===p.name),...d.priorDuty.filter(b=>b.person===p.name)];const total=tasks.reduce((s,b)=>s+b.end-b.start,0);if(total>p.maxMinutes)issues.push('Boundary drill: '+total+' minutes exceeds the synthetic '+p.maxMinutes+'-minute horizon budget.');
 for(let i=0;i<tasks.length;i++)for(let j=i+1;j<tasks.length;j++){const a=tasks[i],b=tasks[j],gap=Math.max(a.start,b.start)-Math.min(a.end,b.end);if(gap<p.minRestMinutes)issues.push('Boundary drill: '+gap+' minutes rest is below the synthetic '+p.minRestMinutes+'-minute minimum.');}}
 return {issues,personnel,resources,valid:issues.length===0};
}
function solve(d){
 const error=validateInput(d);if(error)return {status:'invalid',error,board:[],log:[]};
 let explored=0,exhausted=false,result=null;const log=[];
 // Individual candidate failures are explained before competing proposals.
 for(const o of d.occurrences){const checks=o.alternatives.map(a=>violations(d,[assignment(o,a)]));if(checks.every(c=>!c.valid))return {status:'infeasible',reason:checks[0].issues[0],board:[],log,explored};}
 function search(i,board){if(i===d.occurrences.length){result=board;return true;}const o=d.occurrences[i];for(let k=0;k<o.alternatives.length;k++){if(explored>=d.maxNodes){exhausted=true;return false;}explored++;const b=assignment(o,o.alternatives[k]),audit=violations(d,[...board,b]);log.push({agent:o.agent,id:o.id,allocation:b,decision:audit.valid?'proposed':'rejected',reasons:audit.issues});if(audit.valid&&search(i+1,[...board,b]))return true;if(exhausted)return false;}return false;}
 search(0,[]);let reason=log.filter(x=>x.decision==='rejected').at(-1)?.reasons[0]||'';
 if(d.kind==='impossible'&&!result)reason='ENG-1 and WPN-1 require Alex and Trainer at Mon 08:00; no alternative is supplied.';
 return {status:result?'feasible':exhausted?'exhausted':'infeasible',board:result||[],log,explored,reason,audit:result?violations(d,result,true):null};
}
function loads(d,board){return d.people.map(p=>{const planned=board.filter(b=>b.person===p.name).reduce((s,b)=>s+b.end-b.start,0),prior=d.priorDuty.filter(b=>b.person===p.name).reduce((s,b)=>s+b.end-b.start,0);return {name:p.name,planned,prior,total:planned+prior,max:p.maxMinutes,days:days.map((_,i)=>board.filter(b=>b.person===p.name&&Math.floor(b.start/1440)===i).reduce((s,b)=>s+b.end-b.start,0))};});}
const allocationText=a=>a.person+' / '+time(a.start)+' / '+a.resource;
function summary(d,board){return ['Engineering','Weapons','Combat Systems','Damage Control','Air'].map(dept=>{const os=d.occurrences.filter(o=>o.department===dept);if(!os.length)return '';const moves=os.filter(o=>{const b=board.find(b=>b.id===o.id),a=o.alternatives[0];return b&&(a.person!==b.person||a.start!==b.start||a.resource!==b.resource);});if(moves.length)return moves.map(o=>dept+' Agent moved '+o.id+' from '+allocationText(o.alternatives[0])+' to '+allocationText(board.find(b=>b.id===o.id))+'.').join(' ');return dept+' Agent retained '+os.map(o=>o.id).join(' and ')+'.';}).filter(Boolean).join(' ');}
function newState(kind){return {data:fixture(kind),board:[],result:null,revision:1,accepted:false,pending:'',dirty:false,duration:'60',nodes:'5000',draftStatus:'Saved synthetic inputs; optimize to create a schedule.',reviewStatus:'Not accepted.'};}
function saveInputs(s){const n=Number(s.duration),m=Number(s.nodes);if(!Number.isInteger(n)||n<=0)return 'Engineering duration must be a positive whole number of minutes.';if(!Number.isInteger(m)||m<1||m>200000)return 'Search budget must be a whole number from 1 to 200000.';s.data.occurrences.filter(o=>o.department==='Engineering'&&o.title!=='Boundary drill').forEach(o=>o.duration=n);s.data.maxNodes=m;s.dirty=false;s.revision++;s.accepted=false;s.result=null;s.draftStatus='Saved inputs; schedule requires optimization.';s.reviewStatus='Not accepted; saved inputs changed.';return '';}
function accept(s,checked){if(validateInput(s.data)){s.accepted=false;return 'Correct invalid saved inputs before review.';}if(s.dirty)return 'Save or discard draft changes, then optimize and review the current schedule.';if(s.pending)return 'Resolve the pending policy request before demonstration acceptance.';if(!s.result||s.result.status!=='feasible'||!violations(s.data,s.board,true).valid)return 'Optimize or validate a complete valid schedule before review.';if(!checked)return 'Confirm you reviewed the saved board, loading and policies.';s.accepted=true;s.acceptedRevision=s.revision;s.reviewStatus='Accepted for demonstration only; no actual PB4T operator approval.';return '';}
return {disclosure,clone,days,time,fixture,validateInput,assignment,violations,solve,loads,summary,allocationText,newState,saveInputs,accept};
}
if(typeof module!=='undefined')module.exports=createPB4T();
