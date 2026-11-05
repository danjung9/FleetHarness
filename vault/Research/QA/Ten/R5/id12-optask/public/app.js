const $ = s => document.querySelector(s);
const data = JSON.parse($('#sample-data').textContent);
const clone = x => JSON.parse(JSON.stringify(x));
const disclosure = 'Synthetic, not validated against the real USMTF format.';
const storageKey = 'synthetic-optask-workspace-v1';
let state = { documents:[{documentId:'DRAFT',rawText:''}], selectedDay:'2026-11-05', shipId:null, active:0, dirty:false, history:[], parsed:null, parsedRequest:null, saved:null, localOnly:false };
try { const stored=localStorage.getItem(storageKey); if(stored) { const s=JSON.parse(stored); if(Array.isArray(s.documents) && s.documents.length && s.active>=0 && s.active<s.documents.length) state={...state,...s}; } } catch { $('#storage-status').textContent='Local storage is unavailable. Work stays in memory; export before leaving.'; }
const persist = () => { try {localStorage.setItem(storageKey,JSON.stringify(state));} catch {$('#storage-status').textContent='Could not save to local storage. Keep this page open and export the saved schedule before leaving.';} };
const text = (id,value) => $(id).textContent=value;
const option = (value,label) => { const e=document.createElement('option');e.value=value;e.textContent=label;return e; };
const button = (label,fn,cls='secondary') => {const e=document.createElement('button'); e.type='button';e.className=cls;e.textContent=label;e.addEventListener('click',fn);return e;};
const hm = min => String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0');
const utcTime = s => s.slice(11,16);
const key = e => e.documentId+':'+e.eventId;
const request = () => ({documents:clone(state.documents),selectedDay:state.selectedDay,shipId:state.shipId,decisions:[]});
function error(message) { text('#error',message); if(message) $('#error').focus(); }
function savedStatus() {
  const ev=state.saved?.result.events;
  text('#save-status',ev ? `Saved locally: ${ev.filter(e=>e.reviewStatus==='included').length} included, ${ev.filter(e=>e.reviewStatus==='excluded').length} excluded.` : 'No saved schedule.');
  $('#export').disabled=!state.saved || state.dirty || JSON.stringify(state.parsedRequest)!==JSON.stringify(state.saved.request);
}
function draftStatus() {
  text('#draft-status',state.dirty ? state.saved ? 'Unsaved changes; saved schedule retained.' : 'Unsaved changes; parse to review.' : state.parsed ? state.saved && JSON.stringify(state.parsedRequest)===JSON.stringify(state.saved.request) ? 'Reviewed snapshot saved locally.' : 'Parsed draft; review required.' : 'Load a sample or enter a synthetic message.');
  savedStatus();
}
function editors() {
  $('#active-document').replaceChildren(...state.documents.map((d,i)=>option(String(i),d.documentId || 'Unnamed document')));
  $('#active-document').value=String(state.active);
  $('#document-id').value=state.documents[state.active].documentId;
  $('#raw-text').value=state.documents[state.active].rawText;
  $('#day').value=state.selectedDay;$('#ship').value=state.shipId || '';
  $('#local-only').checked=state.localOnly;networkStatus();
  $('#history').replaceChildren();
  if(!state.history.length) text('#history','No earlier source drafts.');
  for(const h of state.history) {const d=document.createElement('details');const summary=document.createElement('summary');summary.textContent=h.documentId+' · previous original';const p=document.createElement('pre');p.textContent=h.rawText;d.append(summary,p);$('#history').append(d);}
  draftStatus();
}
function changed() {
  if(!state.dirty) {const prior=state.parsedRequest?.documents[state.active] || state.documents[state.active]; if(prior?.rawText) state.history.push(clone(prior));}
  state.dirty=true;$('#review-ack').checked=false;error('');draftStatus();persist();
}
$('#raw-text').addEventListener('input',()=>{changed();state.documents[state.active].rawText=$('#raw-text').value;persist();});
$('#document-id').addEventListener('input',()=>{changed();state.documents[state.active].documentId=$('#document-id').value;persist();});
$('#day').addEventListener('input',()=>{changed();state.selectedDay=$('#day').value;persist();});
$('#ship').addEventListener('input',()=>{changed();state.shipId=$('#ship').value || null;persist();});
$('#active-document').addEventListener('change',()=>{state.active=+$('#active-document').value;editors();persist();});
$('#add-document').addEventListener('click',()=>{changed();state.documents.push({documentId:'DRAFT-'+(state.documents.length+1),rawText:''});state.active=state.documents.length-1;editors();persist();});
$('#remove-document').addEventListener('click',()=>{changed();state.documents.splice(state.active,1);if(!state.documents.length)state.documents=[{documentId:'DRAFT',rawText:''}];state.active=0;editors();persist();});
for(const s of data.scenarios) $('#sample').append(option(s.id,s.id+' · '+s.name));
function loadSample() {
  const sample=data.scenarios.find(s=>s.id===$('#sample').value);
  state.documents=sample.documentIds.length ? sample.documentIds.map(id=>{const r=data.records.find(r=>r.documentId===id);return {documentId:r.documentId,rawText:r.rawText};}) : [{documentId:sample.id,rawText:sample.rawText}];
  const record=data.records.find(r=>r.documentId===sample.documentIds[0]);
  state.selectedDay=sample.selectedDay;state.shipId=record?.shipId || null;state.active=0;state.dirty=false;state.parsed=null;state.parsedRequest=null;
  $('#review-ack').checked=false;$('#replace-prompt').hidden=true;error('');editors();render();persist();
}
$('#load-sample').addEventListener('click',()=>{if(state.dirty) $('#replace-prompt').hidden=false;else loadSample();});
$('#discard-load').addEventListener('click',loadSample);
$('#cancel-load').addEventListener('click',()=>$('#replace-prompt').hidden=true);
$('#discard-draft').addEventListener('click',()=>{
  if(state.saved) {const s=state.saved;state.documents=clone(s.request.documents);state.selectedDay=s.request.selectedDay;state.shipId=s.request.shipId;state.parsed=clone(s.result);state.parsedRequest=clone(s.request);}
  else if(state.parsedRequest) {state.documents=clone(state.parsedRequest.documents);state.selectedDay=state.parsedRequest.selectedDay;state.shipId=state.parsedRequest.shipId;}
  else {state.documents=[{documentId:'DRAFT',rawText:''}];state.parsed=null;state.parsedRequest=null;}
  state.active=0;state.dirty=false;$('#review-ack').checked=false;error('');editors();render();persist();
});
let pending=false;
async function invoke(value) {
  const url=new URL('/api/invoke',location.href);if(url.origin!==location.origin)throw new Error('External requests are blocked.');
  const c=new AbortController();const timeout=setTimeout(()=>c.abort(),15000);
  try {const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),credentials:'same-origin',signal:c.signal});const result=await response.json();if(!response.ok)throw new Error(result?.error?.message || 'Local service failed.');return result;}
  catch(e) {if(e instanceof TypeError || e.name==='AbortError')throw new Error('Could not reach the local service. Start the local service and retry.');throw e;}
  finally {clearTimeout(timeout);}
}
async function busy(work) {
  if(pending)return;pending=true;
  const controls=[...document.querySelectorAll('.editor input,.editor textarea,.editor select,.editor button,#save-review,#review-ack,#export')];
  const previous=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);
  text('#draft-status','Parsing message…');
  try{await work();}catch(e){error(e.message);}finally{pending=false;controls.forEach((c,i)=>c.disabled=previous[i]);draftStatus();}
}
$('#parse').addEventListener('click',()=>busy(async()=>{
  error('');const req=request();const result=await invoke(req);
  if(result.status==='error') {error(result.error==='EMPTY_INPUT' ? 'EMPTY_INPUT: Enter a synthetic message.' : result.error+': Correct the message or selection and retry.');return;}
  state.parsed=result;state.parsedRequest=req;state.dirty=false;$('#review-ack').checked=false;editors();render();draftStatus();persist();
}));
let revisionGroups=[];
function render() {
  const r=state.parsed;const day=state.parsedRequest?.selectedDay || state.selectedDay;
  const events=r?.events || [];const active=events.filter(e=>e.reviewStatus!=='excluded');const visible=active.filter(e=>e.selectedDay.visible);
  text('#summary',r ? `${events.length} events; ${visible.length} on ${day} UTC; ${r.reviewItems.length} review issues.` : 'No parsed schedule. Load a sample, then choose Parse message.');
  text('#context',r ? `${state.parsedRequest.shipId || 'All synthetic ships'} · ${day} UTC · ${events.filter(e=>e.reviewStatus==='unreviewed' || e.reviewStatus==='revision_review').length} awaiting review` : '');
  text('#timeline-caption',`Consolidated visual timeline — ${day} — 00:00–24:00 UTC`);
  const labels={FREQPLAN:'Frequency plans',CRYPTO:'Crypto change-over windows',FLIGHTQ:'Flight quarters event times'};
  const ids={FREQPLAN:'#frequency-plans',CRYPTO:'#crypto-windows',FLIGHTQ:'#flight-quarters'};
  $('#timeline').replaceChildren();const axis=document.createElement('div');axis.className='axis';for(let i=0;i<=24;i+=3){const n=document.createElement('span');n.textContent=hm(i*60);axis.append(n);}$('#timeline').append(axis);
  for(const category of Object.keys(labels)) {
    const items=visible.filter(e=>e.category===category);
    const value=items.map(e=>e.eventId+' — '+(category==='FREQPLAN'?e.normalized.frequencyMHz+' MHz — ':'')+hm(e.selectedDay.clippedStartMinute)+(e.kind==='interval'?'–'+hm(e.selectedDay.clippedEndMinute):'')+' UTC').join('; ');
    text(ids[category],labels[category]+': '+(value || 'none'));
    const lane=document.createElement('div');lane.className='lane';const label=document.createElement('div');label.className='lane-label';label.textContent=labels[category];lane.append(label);
    for(const e of items) {const track=document.createElement('div');track.className='track';const b=button('',()=>selectEvent(e),'bar '+category+(e.kind==='point'?' point':''));const name=document.createElement('span');name.textContent=e.eventId;b.append(name);b.title=e.eventId+' · '+hm(e.selectedDay.clippedStartMinute)+' UTC';b.setAttribute('aria-label',b.title);b.style.left=(e.selectedDay.clippedStartMinute/14.4)+'%';b.style.width=((e.selectedDay.clippedEndMinute-e.selectedDay.clippedStartMinute)/14.4)+'%';track.append(b);lane.append(track);}
    if(!items.length){const empty=document.createElement('div');empty.className='track';lane.append(empty);}$('#timeline').append(lane);
  }
  $('#events').replaceChildren();$('#evidence').hidden=true;
  for(const e of events) {const b=button('',()=>selectEvent(e),'event-button');b.dataset.event=key(e);const name=document.createElement('span');name.textContent=e.eventId+' · '+labels[e.category]+' · '+utcTime(e.normalized.startUtc)+' UTC';const sub=document.createElement('small');sub.textContent=`${e.documentId} · revision ${e.revision} · ${e.reviewStatus.replaceAll('_',' ')}${e.selectedDay.visible?'':' · outside selected day'}`;b.append(name,sub);$('#events').append(b);}
  $('#issues').replaceChildren();
  if(!r?.reviewItems.length) {const p=document.createElement('p');p.id='first-issue';p.textContent='No review issues.';$('#issues').append(p);}
  for(const [i,issue] of (r?.reviewItems || []).entries()) {const p=document.createElement('p');if(i===0)p.id='first-issue';p.textContent=`${issue.documentId} · line ${issue.line} · ${issue.code}`;const b=button('Inspect source',()=>{const index=state.documents.findIndex(d=>d.documentId===issue.documentId);state.active=index;editors();$('#raw-text').focus();$('#raw-text').setSelectionRange(issue.source.start,issue.source.end);});$('#issues').append(p,b);}
  const groups=new Map();for(const e of events){const k=JSON.stringify([e.messageId,e.shipId,e.eventId]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e);}
  revisionGroups=[...groups.values()].filter(g=>new Set(g.map(e=>e.revision)).size>1);
  $('#revision-panel').hidden=!revisionGroups.length;$('#revision-choice').replaceChildren(option('','Choose a revision…'));$('#more-revisions').replaceChildren();
  for(const [i,group] of revisionGroups.entries()) {
    const desc=`${group[0].eventId}: ${group.map(e=>`revision ${e.revision} — ${utcTime(e.normalized.startUtc)} UTC`).join('; ')}. Choose which to include.`;
    let select=$('#revision-choice');
    if(i===0)text('#revision-values',desc);else {const p=document.createElement('p');p.textContent=desc;const label=document.createElement('label');label.textContent='Include revision for '+group[0].eventId;select=document.createElement('select');select.id='revision-choice-'+i;label.htmlFor=select.id;select.append(option('','Choose a revision…'));$('#more-revisions').append(p,label,select);}
    for(const e of group)select.append(option(key(e),`Revision ${e.revision} · ${utcTime(e.normalized.startUtc)} UTC · ${e.documentId}`));
    const included=group.find(e=>e.reviewStatus==='included');if(included)select.value=key(included);
    select.addEventListener('change',()=>{$('#review-ack').checked=false;$('#export').disabled=true;text('#draft-status','Review choices changed; save to commit.');});
  }
  const resolved=revisionGroups.filter(g=>g.some(e=>e.reviewStatus==='included'));
  text('#revision-status',resolved.map(g=>{const include=g.find(e=>e.reviewStatus==='included');return `Included revision ${include.revision} at ${utcTime(include.normalized.startUtc)} UTC; ${g.filter(e=>e!==include).map(e=>`excluded revision ${e.revision} at ${utcTime(e.normalized.startUtc)} UTC`).join('; ')}.`;}).join(' '));
  savedStatus();
}
function selectEvent(e) {
  $('#evidence').hidden=false;text('#event-title',e.eventId+' · '+e.category+' · revision '+e.revision);
  const n=e.normalized;const s=e.selectedDay;
  text('#event-time',e.kind==='interval'?`${n.startUtc} → ${n.endUtc} · ${e.durationMinutes} minutes · ${s.visible?'displayed '+hm(s.clippedStartMinute)+'–'+hm(s.clippedEndMinute)+' UTC':'outside selected day'}`:`${n.startUtc} · point event · ${s.visible?'displayed '+hm(s.clippedStartMinute)+' UTC':'outside selected day'}`);
  $('#fields').replaceChildren();
  const selectField=(name,span)=>{text('#evidence-value',span.text);text('#evidence-range',`${e.documentId} · UTF-16 [${span.start}, ${span.end})`);};
  for(const [name,span] of Object.entries(e.source.fields)){const b=button(name,()=>selectField(name,span));b.dataset.field=name;$('#fields').append(b);}
  text('#evidence-line',e.source.range.text);selectField('category',e.source.fields.category);
  for(const b of document.querySelectorAll('[data-event]'))b.setAttribute('aria-pressed',String(b.dataset.event===key(e)));
}
$('#save-review').addEventListener('click',()=>busy(async()=>{
  error('');if(state.dirty || !state.parsedRequest){error('Reparse changed text before saving review.');return;}
  if(!$('#review-ack').checked){error('Review the evidence and check the acknowledgement before saving.');return;}
  if(state.parsed.reviewItems.some(i=>i.code!=='REVISION_REVIEW')){error('Correct the review issues in the original raw text, then reparse before saving.');return;}
  const chosen=new Map();
  for(const [i,g] of revisionGroups.entries()) {const val=$(i===0?'#revision-choice':'#revision-choice-'+i).value;if(!val){error('Choose one revision to include for each alternative before saving.');return;}for(const e of g)chosen.set(key(e),key(e)===val?'include':'exclude');}
  const req=clone(state.parsedRequest);req.decisions=state.parsed.events.map(e=>({documentId:e.documentId,eventId:e.eventId,decision:chosen.get(key(e)) || 'include'}));
  const result=await invoke(req);if(result.status!=='ok'){error('Review remains unresolved. Correct the issues and reparse.');return;}
  state.saved={request:clone(req),result:clone(result)};state.parsed=result;state.parsedRequest=req;state.dirty=false;render();persist();draftStatus();
}));
$('#export').addEventListener('click',()=>{
  if(!state.saved || state.dirty || JSON.stringify(state.parsedRequest)!==JSON.stringify(state.saved.request))return;
  const {request: req,result}=state.saved;const body={disclosure,selectedDay:req.selectedDay,shipId:req.shipId,documents:req.documents,decisions:req.decisions,result};
  const url=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='synthetic-schedule.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function networkStatus(){text('#network-status',state.localOnly?'Local-only mode: external requests blocked; local service required.':'Local service required. No external requests are made.');}
$('#local-only').addEventListener('change',()=>{state.localOnly=$('#local-only').checked;networkStatus();persist();});
$('#about').addEventListener('click',()=>{$('#about-panel').hidden=false;$('#return-schedule').focus();});
$('#return-schedule').addEventListener('click',()=>{$('#about-panel').hidden=true;$('#about').focus();});
editors();render();draftStatus();
