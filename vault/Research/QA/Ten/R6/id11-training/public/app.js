export function calendarDays(input){
 const days=[];
 for(let day=Math.floor(input.horizonMinutes[0]/1440);day<Math.ceil(input.horizonMinutes[1]/1440);day++){
  const date=new Date(Date.parse(input.weekStart)+day*86400000);
  days.push({day,date:date.toISOString().slice(0,10),weekday:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()]});
 }
 return days;
}
export function loadBand(minutes){return minutes<=0?'load-zero':minutes<=60?'load-low':minutes<=120?'load-medium':'load-high';}
export function guidedUpdate(input,kind,id,value){
 const d=structuredClone(input);
 if(kind==='week'){d.weekStart=value+'T00:00:00Z';return d;}
 if(kind==='operations'){d.operations=value;return d;}
 if(kind==='trainingRules'){
  const previous=d.trainingRules.find(r=>r.id===id);
  if(previous&&(previous.periodMinutes!==value.periodMinutes||previous.anchorMinute!==value.anchorMinute)){
   const template=d.requests.find(r=>r.ruleId===id);if(!template)throw Error('Rule needs a drill template.');
   const removed=d.requests.filter(r=>r.ruleId===id).map(r=>r.id);
   d.requests=d.requests.filter(r=>r.ruleId!==id);for(const a of d.agents)a.requestIds=a.requestIds.filter(x=>!removed.includes(x));
   d.initialAssignments=d.initialAssignments.filter(a=>!removed.includes(a.requestId));d.trainingHistory=d.trainingHistory.filter(h=>h.ruleId!==id);value={...value,requestIds:[]};
   const oldK=Number(template.occurrenceId.split('-').at(-1)),offset=template.requestedStartMinute-(previous.anchorMinute+oldK*previous.periodMinutes);
   if(value.periodMinutes<=0)throw Error('Period must be positive.');
   for(let k=Math.max(0,Math.floor((d.horizonMinutes[0]-value.anchorMinute)/value.periodMinutes));value.anchorMinute+k*value.periodMinutes<d.horizonMinutes[1];k++){
    if(d.requests.length>=24)throw Error('This week exceeds the 24-drill limit.');
    const origin=value.anchorMinute+k*value.periodMinutes,start=origin+offset;
    if(start+template.durationMinutes>origin+value.periodMinutes)throw Error('Drill duration and offset must fit the training period.');
    const request={...structuredClone(template),id:template.id+'-R'+k,family:value.family,occurrenceId:'O-'+id.replace(/^RULE-/,'')+'-'+k,requestedStartMinute:start,candidateWindows:template.candidateWindows.map(w=>w.map(m=>m-template.requestedStartMinute+start))};
    d.requests.push(request);d.agents.find(a=>a.id===request.agentId).requestIds.push(request.id);value.requestIds.push(request.id);
   }
  }
  for(const r of d.requests.filter(r=>r.ruleId===id))r.family=value.family;
 }
 const list=d[kind],index=list.findIndex(x=>x.id===id);
 if(index<0)list.push(value);else list[index]=value;
 if(kind==='requests'){
  if(!d.trainingRules.some(r=>r.id===value.ruleId))d.trainingRules.push({id:value.ruleId,family:value.family,anchorMinute:0,periodMinutes:10080,windowMinutes:10080,requiredCount:1,requestIds:[],mandatory:true});
  for(const a of d.agents)a.requestIds=a.requestIds.filter(x=>x!==id);
  for(const r of d.trainingRules)r.requestIds=r.requestIds.filter(x=>x!==id);
  d.agents.find(a=>a.id===value.agentId).requestIds.push(id);
  const rule=d.trainingRules.find(r=>r.id===value.ruleId);rule.requestIds.push(id);rule.family=value.family;
  for(const sibling of d.requests.filter(r=>r.ruleId===value.ruleId))sibling.family=value.family;
  d.initialAssignments=d.initialAssignments.filter(a=>a.requestId!==id);
 }
 return d;
}
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id), samples=JSON.parse($('fixtures').textContent), clone=x=>structuredClone(x);
let state={input:null,result:null,editor:'{}',dirty:false,stale:false,ack:false,board:null},controller=null;
try{const saved=JSON.parse(localStorage.getItem('pb4t-v1'));if(saved)state=saved;}catch{}
const persist=()=>{try{localStorage.setItem('pb4t-v1',JSON.stringify(state));}catch{$('error').textContent='Local storage unavailable. Export your current draft before closing.';}};
const text=(id,value)=>$(id).textContent=value;
const node=(tag,content)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=content;return n;};
function time(m){const date=new Date(Date.parse(state.input.weekStart)+m*60000);return date.toLocaleTimeString('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit'});}
function when(a){const date=new Date(Date.parse(state.input.weekStart)+a.startMinute*60000);return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()]} ${time(a.startMinute)}–${time(a.endMinute)} UTC`;}
function gates(){const valid=state.result?.reviewAllowed&&!state.dirty&&!state.stale&&!controller;$('acknowledge').disabled=!(valid&&$('review-evidence').checked);$('export').disabled=!state.result||state.dirty||state.stale||!!controller; text('review-status',state.dirty||state.stale?'Unsaved changes — recompute or discard before review.':state.ack?'Synthetic draft acknowledged locally. Operational approval: none.':'Unacknowledged synthetic draft. Operational approval: none.');text('draft-status',state.dirty?'Unsaved editor changes.':state.stale?'Board changed; derived evidence is stale.':state.input?'Saved locally in this browser.':'No draft loaded.');}
function markDirty(){state.editor=$('input-json').value;state.dirty=true;state.ack=false;$('review-evidence').checked=false;persist();gates();}
$('input-json').value=state.editor;
for(const s of samples){const op=node('option',s.name);op.value=s.input.scenarioId||'empty-input';$('scenario').append(op);}
function load(id){if(state.dirty||state.stale){text('error','Save draft or Discard draft before loading another scenario.');return;}const sample=samples.find(s=>(s.input.scenarioId||'empty-input')===id);state={input:clone(sample.input),result:null,editor:JSON.stringify(sample.input,null,2),dirty:false,stale:false,ack:false,board:null};$('input-json').value=state.editor;$('review-evidence').checked=false;text('error','');text('board-check','');text('status','Draft loaded. Optimize schedule to negotiate allocations.');render();persist();}
$('load-baseline').onclick=()=>load('weekly-baseline');$('load-scenario').onclick=()=>load($('scenario').value);
$('input-json').addEventListener('input',markDirty);
$('discard-draft').onclick=()=>{formPending=false;$('guided-fields').replaceChildren();state.editor=JSON.stringify(state.input||{},null,2);state.dirty=false;state.stale=false;state.board=clone(state.result?.assignments||null);$('input-json').value=state.editor;state.ack=false;text('error','');render();persist();};
$('save-draft').onclick=async()=>{try{const data=JSON.parse($('input-json').value);const response=await fetch('/api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'status',data})});const result=await response.json();if(result.status==='invalid-input')throw Error(`${result.error}: Complete PB4T metadata, policy and arrays are required.`);state.input=data;state.editor=$('input-json').value;state.dirty=false;state.stale=false;state.result=null;state.board=null;state.ack=false;text('error','');text('status','Draft saved. Optimize schedule to calculate evidence.');persist();render();}catch(e){text('error',e.message);}};
$('review-evidence').onchange=gates;
$('acknowledge').onclick=()=>{if($('acknowledge').disabled)return;state.ack=true;persist();gates();};
$('export').onclick=()=>{if($('export').disabled)return;const blob=new Blob([JSON.stringify({warning:state.result.warning,policy:state.input.policy,input:state.input,result:state.result,reviewStatus:$('review-status').textContent},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='pb4t-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('cancel').onclick=()=>controller?.abort();
async function invoke(action){if(controller)return;let data;try{data=JSON.parse($('input-json').value);}catch{text('error','INVALID_SCHEMA: Enter valid PB4T JSON; correct quotes, commas and brackets.');return;}if(action==='check'){if(!state.board){text('error','Optimize a schedule before checking board edits.');return;}data.initialAssignments=clone(state.board);}
 controller=new AbortController();for(const id of ['load-baseline','load-scenario','save-draft','discard-draft','input-json','scenario'])$(id).disabled=true;document.querySelectorAll('article input,article button').forEach(n=>n.disabled=true);$('optimize').disabled=true;$('check-board').disabled=true;$('cancel').disabled=false;text('status','Calculating synthetic schedule');text('error','');gates();
 try{const response=await fetch('/api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data}),signal:controller.signal}),result=await response.json();if(!response.ok)throw Error(result.error?.message||'Service unavailable. Try again.');if(result.status==='invalid-input'){text('error',`${result.error}: Complete PB4T metadata, policy and arrays are required.`);text('status','Input needs correction; review blocked.');state.ack=false;state.dirty=true;return;}
 state.input=data;state.editor=$('input-json').value;state.result=result;state.board=clone(result.assignments);state.dirty=false;state.stale=false;state.ack=false;$('review-evidence').checked=false;
 if(action==='check'){if(result.status==='invalid-board'){const c=result.initialConflicts[0];text('board-check',c?`Invalid board: ${c.requests.join(' / ')} share ${[...c.personIds,...c.resourceIds].join(' and ')}. Review blocked.`:'Invalid board: constraints or mandatory coverage violated. Review blocked.');}else text('board-check','Valid board: all constraints and due occurrences satisfied.');}else text('board-check','');render();
 }catch(e){state.ack=false;text('status',e.name==='AbortError'?'Calculation canceled. Previous draft preserved; review blocked.':'Calculation failed; previous draft preserved.');state.stale=true;text('error',e.name==='AbortError'?'Canceled. Optimize schedule to retry.':e.message);}finally{controller=null;for(const id of ['load-baseline','load-scenario','save-draft','discard-draft','input-json','scenario'])$(id).disabled=false;document.querySelectorAll('article input,article button').forEach(n=>n.disabled=false);$('optimize').disabled=false;$('check-board').disabled=false;$('cancel').disabled=true;persist();gates();}}
$('optimize').onclick=()=>invoke('solve');$('check-board').onclick=()=>invoke('check');
function render(){gates();refreshChoices();const d=state.input,r=state.result;text('policy',d?.policy?`${d.policy.version} · unapproved synthetic policy · minimum rest ${d.policy.minimumRestMinutes} min · daily cap ${d.policy.dailyDutyLimitMinutes} min · rolling 24h cap ${d.policy.rolling24hDutyLimitMinutes} min · search budget ${d.search.maxCandidateChecks} checks`:'No draft loaded. Load the synthetic baseline to begin.');
 for(const id of ['board','negotiation','trace','coverage','heatmap'])$(id).replaceChildren();if(!r){text('initial-collisions','No collision evidence yet.');text('collision-summary','');text('alternative-summary','');text('loads-summary','No loading calculated.');text('coverage-summary','No coverage calculated.');$('board').append(node('p','No allocations yet. Optimize a draft to populate the week.'));return;}
 const statuses={feasible:`Feasible synthetic draft — ${r.assignments.length} drills; ${r.remainingConflicts} remaining collisions.`,infeasible:'Infeasible synthetic draft — unresolved mandatory obligations; review blocked.',budget_exhausted:'Search budget exhausted — feasibility unknown; review blocked.','invalid-board':'Invalid synthetic board — review blocked.'};text('status',statuses[r.status]);
 for(const {day,date,weekday} of calendarDays(d)){const section=node('div');section.className='day';section.dataset.date=date;section.append(node('h3',`${weekday} ${date}`));const aa=(state.board||[]).filter(a=>Math.floor(a.startMinute/1440)===day);if(!aa.length)section.append(node('p','No drills'));for(const a of aa){const request=d.requests.find(x=>x.id===a.requestId),card=node('article');card.append(node('h4',a.requestId));const desc=node('p',`${request.family} | ${when(a)} | ${a.personIds.join(', ')} | ${a.resourceIds.join(', ')}`);desc.id=`allocation-${a.requestId}`;card.append(desc);const label=node('label','Start minute'),start=node('input');start.type='number';start.id=`edit-start-${a.requestId}`;start.value=a.startMinute;label.htmlFor=start.id;card.append(label,start);const crewLabel=node('label','Crew IDs (role order)'),crew=node('input');crew.id=`edit-crew-${a.requestId}`;crew.value=a.personIds.join(', ');crewLabel.htmlFor=crew.id;card.append(crewLabel,crew);const apply=node('button','Apply edit');apply.id=`apply-edit-${a.requestId}`;for(const field of [start,crew])field.oninput=()=>{state.stale=true;state.ack=false;persist();gates();};apply.onclick=()=>{const value=Number(start.value),people=crew.value.split(',').map(s=>s.trim()).filter(Boolean);if(!Number.isSafeInteger(value)||!start.value||people.some(id=>!d.personnel.some(p=>p.id===id))){text('error','Enter an integer start minute and known crew IDs.');return;}a.startMinute=value;a.endMinute=value+request.durationMinutes;a.personIds=people;state.stale=true;state.ack=false;persist();gates();};card.append(apply);section.append(card);}$('board').append(section);}
 const pairs=[...r.initialConflicts].sort((a,b)=>d.requests.findIndex(q=>q.id===a.requests[0])-d.requests.findIndex(q=>q.id===b.requests[0])).map(c=>`${c.requests.join(' / ')} (${[...c.personIds,...c.resourceIds].join(', ')})`);text('initial-collisions',`${pairs.length} colliding pairs: ${pairs.join('; ')}.`);text('collision-summary',`personnel collisions: ${pairs.length} initial pairs; ${r.remainingConflicts} remaining.`);const changed=r.assignments.filter(a=>a.startMinute!==d.requests.find(q=>q.id===a.requestId).requestedStartMinute);text('alternative-summary',`alternate schedule allocations: ${changed.map(a=>`${a.requestId} ${d.requests.find(q=>q.id===a.requestId).requestedStartMinute} → ${a.startMinute}`).join('; ')}.`);
 for(const request of d.requests){const agent=d.agents.find(a=>a.id===request.agentId),a=r.assignments.find(a=>a.requestId===request.id),collision=r.initialConflicts.find(c=>c.requests.includes(request.id)&&c.requests[1]===request.id),p=node('p');p.id=`negotiation-${request.id}`;let message=`${agent.name}: requested ${request.requestedStartMinute}; `;if(collision&&a&&a.startMinute!==request.requestedStartMinute)message=`${agent.name}: rejected ${request.requestedStartMinute} (${[...collision.personIds,...collision.resourceIds].join(' and ')} blocked by ${collision.requests[0]}); accepted ${a.startMinute}.`;else {const rejected=r.negotiation.filter(t=>t.requestId===request.id&&t.outcome==='rejected');if(rejected.length)message+=`rejected (${[...new Set(rejected.flatMap(t=>t.reasons))].join(', ')}); `;message+=a?`accepted ${a.startMinute}.`:'no final agreement; escalate to planning lead; review blocked.';}p.textContent=message;$('negotiation').append(p);}
 for(const trace of r.negotiation)$('trace').append(node('p',`${trace.agentId} / ${trace.requestId} · ${trace.startMinute} · ${trace.personIds.join(', ')} · ${trace.outcome}${trace.reasons.length?': '+trace.reasons.join(', '):''}`));
 text('loads-summary',`Weekly drill minutes: ${r.loads.map(p=>`${p.personId} ${p.drillMinutes}`).join('; ')}. Total ${r.loads.reduce((n,p)=>n+p.drillMinutes,0)} person-minutes.`);
 const table=node('table'),head=node('tr');for(const s of ['Person',...calendarDays(d).map(({date,weekday})=>`${weekday} ${date}`),'Prior duty','Total duty'])head.append(node('th',s));table.append(head);for(const p of r.loads){const row=node('tr');row.append(node('th',`${p.personId} · ${d.personnel.find(x=>x.id===p.personId).displayName}`));for(const min of [...p.drillMinutesByDay,p.priorDutyMinutes,p.totalDutyMinutes]){const td=node('td',min);td.className=loadBand(min);td.title=`${min} minutes · ${loadBand(min).replace('load-','')}`;row.append(td);}table.append(row);}$('heatmap').append(table);
 text('coverage-summary',`Synthetic SFTRM-mandated training periodicities: ${r.coverage.filter(c=>c.status.startsWith('satisfied')).length} satisfied; ${r.coverage.filter(c=>c.status==='unmet').length} unmet; ${r.coverage.filter(c=>c.status==='pending-future').length} pending-future. Not validated against real SFTRM.`);for(const c of r.coverage){const p=node('p',`${c.occurrenceId} | deadline ${c.deadlineMinute} | ${c.status}`);p.id=`occurrence-${c.occurrenceId}`;$('coverage').append(p);}gates();}
function draftData(){return JSON.parse($('input-json').value);}
function stageGuided(data){
 formPending=false;$('input-json').value=JSON.stringify(data,null,2);markDirty();
 text('guided-message','Changes staged locally. Save draft or Optimize schedule to validate and compute.');
}
let formPending=false;
function guardForm(){if(formPending){text('guided-message','Apply planning changes or Discard draft before continuing.');return true;}return false;}
function field(parent,label,type,value){
 const wrap=node('label',label),control=node(type==='select'?'select':'input');control.id='guided-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 if(type!=='select')control.type=type;control.value=value??'';wrap.append(control);parent.append(wrap);return control;
}
function options(control,values,selected){for(const [value,label] of values){const op=node('option',label);op.value=value;control.append(op);}control.value=selected||values[0]?.[0]||'';}
function dateValue(d,m){return new Date(Date.parse(d.weekStart)+m*60000).toISOString().slice(0,16);}
function minute(d,value){const m=(Date.parse(value+'Z')-Date.parse(d.weekStart))/60000;if(!Number.isSafeInteger(m))throw Error('Choose a valid UTC date and time.');return m;}
function intervals(parent,label,values,d){
 const box=node('fieldset'),legend=node('legend',label);box.append(legend);parent.append(box);const rows=[];
 const add=w=>{const row=node('div');row.className='interval-row';const a=field(row,label+' start','datetime-local',dateValue(d,w[0])),b=field(row,label+' end','datetime-local',dateValue(d,w[1]));a.id+='-'+rows.length;b.id+='-'+rows.length;const remove=node('button','Remove interval');remove.type='button';remove.onclick=()=>{row.remove();rows.splice(rows.indexOf(item),1);};const item={a,b};rows.push(item);row.append(remove);box.append(row);};
 values.forEach(add);const button=node('button','Add '+label.toLowerCase());button.type='button';button.onclick=()=>add([540,600]);box.append(button);
 return ()=>rows.map(({a,b})=>{const w=[minute(d,a.value),minute(d,b.value)];if(w[1]<=w[0])throw Error(label+': end must follow start.');return w;});
}
function refreshChoices(){
 if(!$('guided-kind'))return;
 const select=$('guided-record'),old=select.value;select.replaceChildren();
 try{const d=draftData(),kind=$('guided-kind').value;options(select,(d[kind]||[]).map(x=>[x.id,x.displayName||x.family||x.name||x.id]),old);}catch{}
}
function setupGuided(){
 $('guided-fields').addEventListener('click',e=>{if(e.target.tagName==='BUTTON'&&e.target.id!=='guided-apply'){formPending=true;state.dirty=true;state.ack=false;persist();gates();}});
 $('guided-fields').addEventListener('input',()=>{formPending=true;state.dirty=true;state.ack=false;persist();gates();});
 document.addEventListener('click',e=>{if(formPending&&e.target.closest('#load-baseline,#load-scenario,#save-draft,#optimize,#check-board,#new-week')){e.stopImmediatePropagation();e.preventDefault();guardForm();}},true);
 window.addEventListener('beforeunload',e=>{if(formPending){e.preventDefault();e.returnValue='';}});
 $('guided-kind').onchange=()=>{if(guardForm()){$('guided-kind').value=$('guided-fields').dataset.kind;return;}refreshChoices();$('guided-fields').replaceChildren();};
 $('guided-edit').onclick=()=>editGuided(false);$('guided-new').onclick=()=>editGuided(true);
 $('new-week').onclick=()=>{try{if(!$('week-date').value)throw Error('Choose a week start.');stageGuided(guidedUpdate(draftData(),'week','',$('week-date').value));}catch(e){text('guided-message',e.message);}};
}
function editGuided(isNew){try{if(guardForm())return;
 const d=draftData();if(!d.personnel)throw Error('Load synthetic baseline first.');
 const kind=$('guided-kind').value,box=$('guided-fields');box.replaceChildren();box.dataset.kind=kind;
 const existing=(d[kind]||[]).find(x=>x.id===$('guided-record').value);
 if(isNew&&['operations','trainingRules'].includes(kind))throw Error('Edit existing rules; adding a drill creates its linked weekly rule automatically.');
 const v=isNew?{}:structuredClone(existing||{}),reads={};
 const input=(key,label,type='text',value=v[key])=>{const f=field(box,label,type,value);if(type==='number')f.min='0';reads[key]=()=>type==='number'?Number(f.value):f.value.trim();return f;};
 const choose=(key,label,values,value=v[key])=>{const f=field(box,label,'select');options(f,values,value);reads[key]=()=>f.value;return f;};
 const commas=(key,label,value=v[key]||[])=>{const f=input(key,label,'text',value.join(', '));reads[key]=()=>f.value.split(',').map(x=>x.trim()).filter(Boolean);};
 if(kind!=='operations'){const id=input('id','Record ID','text',v.id||('NEW-'+Date.now().toString(36)));id.readOnly=true;}
 if(kind==='personnel'){
 input('displayName','Person name');commas('qualifications','Qualifications (comma separated)');input('dailyDutyLimitMinutes','Daily duty limit','number',v.dailyDutyLimitMinutes||240);input('rolling24hDutyLimitMinutes','Rolling duty limit','number',v.rolling24hDutyLimitMinutes||300);
 reads.availability=intervals(box,'Availability',v.availability||[[0,10080]],d);reads.priorDuty=intervals(box,'Prior duty',v.priorDuty||[],d);
 }else if(kind==='operations'){
 reads.allowedWindows=intervals(box,'Operational windows',d.operations.allowedWindows,d);reads.blackouts=intervals(box,'Blackouts',d.operations.blackouts,d);
 }else if(kind==='resources'){
 input('name','Resource name');reads.capacity=()=>1;reads.availability=intervals(box,'Resource availability',v.availability||[[0,10080]],d);
 }else if(kind==='trainingRules'){
 input('family','Training family');input('periodMinutes','Period minutes','number');const anchor=input('anchorMinute','First window begins UTC','datetime-local',dateValue(d,v.anchorMinute));reads.anchorMinute=()=>minute(d,anchor.value);
 box.append(node('p','Changing the period or anchor regenerates linked drill occurrences from the first drill, retaining its relative start and crew preferences; clears their previous assignments and synthetic completion history. Fictional fixed windows require one completion per period. Editing rules never establishes real SFTRM compliance.'));
 }else if(kind==='requests'){
 input('family','Drill family');choose('agentId','Department',d.agents.map(a=>[a.id,a.department]));input('priority','Priority','number',v.priority??50);
 const windows=intervals(box,'Drill candidates',v.candidateWindows||[[540,600],[1980,2040]],d);reads.candidateWindows=windows;
 choose('resource','Shared resource',d.resources.map(r=>[r.id,r.name]),v.resourceIds?.[0]);
 const roles=node('fieldset');roles.append(node('legend','Qualified roles'));box.append(roles);const roleReads=[];
 const addRole=role=>{const row=node('div'),qual=field(row,'Qualification','select');options(qual,[...new Set(d.personnel.flatMap(p=>p.qualifications))].map(q=>[q,q]),role.qualification);qual.id+='-'+roleReads.length;const count=field(row,'People required','number',role.count||1);count.id+='-'+roleReads.length;count.min=1;const preferred=field(row,'Preferred crew','select');options(preferred,[['','Any qualified person'],...d.personnel.map(p=>[p.id,p.displayName])],role.preferredPersonIds?.[0]);preferred.id+='-'+roleReads.length;const remove=node('button','Remove role');remove.type='button';const get=()=>({qualification:qual.value,count:Number(count.value),preferredPersonIds:preferred.value?[preferred.value]:[]});roleReads.push(get);remove.onclick=()=>{row.remove();roleReads.splice(roleReads.indexOf(get),1);};row.append(remove);roles.append(row);};
 (v.roles||[{}]).forEach(addRole);const add=node('button','Add qualified role');add.type='button';add.onclick=()=>addRole({});roles.append(add);reads.roles=()=>roleReads.map(f=>f());
 }
 const save=node('button','Apply planning changes');save.type='button';save.id='guided-apply';box.append(save);
 save.onclick=()=>{try{
  const values=Object.fromEntries(Object.entries(reads).map(([key,get])=>[key,get()]));
  if(Object.values(values).some(x=>x===''||typeof x==='number'&&(!Number.isSafeInteger(x)||x<0)))throw Error('Complete all fields with valid values.');
  let updated={...v,...values};
  if(kind==='requests'){
   const ww=values.candidateWindows;if(!ww.length||!values.roles.length)throw Error('Add a candidate and qualified role.');
   const duration=ww[0][1]-ww[0][0];if(ww.some(w=>w[1]-w[0]!==duration))throw Error('Every candidate must have the same duration.');
   updated={...updated,durationMinutes:duration,requestedStartMinute:ww[0][0],resourceIds:[values.resource],mandatory:true};delete updated.resource;
   if(isNew){const ruleId='RULE-'+values.id;updated.ruleId=ruleId;updated.occurrenceId='O-'+values.id+'-0';}
   else d.trainingRules.find(r=>r.id===updated.ruleId).family=values.family;
  }
  if(kind==='trainingRules'){updated.windowMinutes=updated.periodMinutes;updated.requiredCount=1;for(const r of d.requests.filter(r=>r.ruleId===v.id))r.family=updated.family;}
  stageGuided(guidedUpdate(d,kind,updated.id,updated));box.replaceChildren();refreshChoices();
 }catch(e){text('guided-message',e.message);}};
 text('guided-message','Editing '+kind+'. Apply planning changes to stage; Save draft or Optimize validates all relationships.');
 }catch(e){text('guided-message',e.message);}}
setupGuided();render();
}
