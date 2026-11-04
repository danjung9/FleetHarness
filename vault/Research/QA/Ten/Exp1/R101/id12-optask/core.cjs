/* Application domain core. Embedded verbatim in index.html by build.cjs. No dependencies. */
(function (root) {
'use strict';
const TYPES = Object.assign(Object.create(null), {FREQPLAN:'Frequency Plan',CRYPTO:'Crypto Change-over Window',FLIGHTQTRS:'Flight Quarters'});
const GRAMMAR = 'synthetic-optask/v1';
const NOTICE = 'Synthetic only — not validated against actual USMTF formats or operational rules';
const SAMPLE = 'OPTASK|SYNTHETIC-DEMO-01|Fictional training vessel Meridian\nFREQPLAN|FP-01|Training Alpha|225.500|MHz|2026-11-04T06:00:00Z|2026-11-04T08:00:00Z\nCRYPTO|CW-01|TRAINING-KEY-A to TRAINING-KEY-B|2026-11-04T07:30:00Z|2026-11-04T07:45:00Z\nFLIGHTQTRS|FQ-01|Fictional deck drill|2026-11-04T23:30:00Z|2026-11-05T00:30:00Z';
function timestampResult(value, name='Start') {
 if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) return {error:name+' timestamp requires an explicit timezone.'};
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
 if (!m) return {error:'Invalid timestamp format.'};
 const [y,mo,d,h,mi,s]=m.slice(1,7).map(Number);
 const days=new Date(Date.UTC(y,mo,0)).getUTCDate();
 if(y<1900 || mo<1 || mo>12 || d<1 || d>days) return {error:'Invalid calendar date.'};
 if(h>23 || mi>59 || s>59 || (m[7]!=='Z' && (+m[9]>14 || +m[10]>59 || (+m[9]===14 && +m[10]!==0)))) return {error:'Invalid time or timezone offset.'};
 const offset=m[7]==='Z'?0:(m[8]==='+'?1:-1)*(+m[9]*60 + +m[10]);
 return {value:new Date(Date.UTC(y,mo-1,d,h,mi,s)-offset*60000).toISOString()};
}
function validateTimestamp(value) { return timestampResult(value).value || null; }
function parseMessage(raw, revisionId=1) {
 if(typeof raw!=='string' || !raw.trim()) throw Error('Enter a synthetic OPTASK message.');
 if(raw.length>200000) throw Error('Message exceeds 200,000 UTF-16 code units. Shorten the message.');
 const records=[],headers=[],issues=[];
 let offset=0;
 raw.split('\n').forEach((withCR,index)=>{
  const text=withCR.endsWith('\r')?withCR.slice(0,-1):withCR;
  const start=offset; offset+=withCR.length+1;
  if(!text.trim())return;
  const vals=text.split('|'),kind=vals[0],line=index+1;
  const names=kind==='OPTASK'?['tag','id','vessel']:kind==='FREQPLAN'?['tag','id','label','frequency','unit','start','end']:['tag','id','label','start','end'];
  let pos=start; const fields={};
  vals.forEach((v,i)=>{fields[names[i]||'extra'+i]={value:v,sourceText:v,start:pos,end:pos+v.length,line};pos+=v.length+1;});
  const record={kind,id:vals[1]||'',line,source:{start,end:start+text.length,text},fields,reasons:[]};
  const bad=msg=>record.reasons.push(msg);
  if(kind!=='OPTASK' && !TYPES[kind])bad('Unsupported record type.');
  else if(vals.length!==names.length)bad('Incorrect field count for '+kind+'.');
  else {
   if(vals.some(v=>!v.trim()))bad('Required field is empty.');
   if(!/^[A-Za-z0-9-]+$/.test(record.id))bad('Identifier must use letters, digits or hyphens.');
   if(kind==='OPTASK')headers.push(record);
   else {
    if(kind==='FREQPLAN' && (!/^\d+(\.\d+)?$/.test(vals[3]) || !Number.isFinite(Number(vals[3])) || Number(vals[3])<=0 || !['MHz','kHz'].includes(vals[4])))bad('Frequency must be positive with unit MHz or kHz.');
    const a=timestampResult(fields.start.value,'Start'),b=timestampResult(fields.end.value,'End');
    if(a.error)bad(a.error); if(b.error)bad(b.error);
    record.start=a.value||null;record.end=b.value||null;
    if(a.value && b.value && a.value>=b.value)bad('Event end must be later than start.');
   }
  }
  records.push(record);
 });
 const counts={}; records.filter(r=>TYPES[r.kind]).forEach(r=>{counts[r.id]=(counts[r.id]||0)+1;});
 records.forEach(r=>{
  if(TYPES[r.kind] && counts[r.id]>1)r.reasons.push('Duplicate identifier; every matching record requires review.');
  if(r.kind==='OPTASK' && headers.length>1)r.reasons.push('Multiple OPTASK headers require review.');
  if(r.reasons.length)issues.push({id:issues.length+1,line:r.line,code:r.kind, message:r.reasons[0],reasons:r.reasons,source:r.source,fields:r.fields,disposition:'unresolved',note:''});
 });
 const events=records.filter(r=>TYPES[r.kind] && !r.reasons.length).map(r=>({...r,type:TYPES[r.kind],label:r.fields.label.value,frequency:r.fields.frequency?.value||'',unit:r.fields.unit?.value||'',durationMinutes:(Date.parse(r.end)-Date.parse(r.start))/60000,derived:{type:{from:['tag'],transformation:'synthetic mapping'},start:{from:['start'],transformation:'explicit timezone to UTC'},end:{from:['end'],transformation:'explicit timezone to UTC'},duration:{from:['start','end'],transformation:'elapsed minutes'}}}));
 return {id:revisionId,raw,grammar:GRAMMAR,offsetUnit:'UTF-16',records,headers,events,issues,review:{mapping:false,events:false,committed:false}};
}
function initialState(){return {version:1,draft:'',revisions:[],activeId:null,day:'2026-11-04'};}
function active(state){return state.revisions.find(r=>r.id===state.activeId)||null;}
function dirty(state){const r=active(state);return r ? state.draft!==r.raw : !!state.draft;}
function parseDraft(state){const r=parseMessage(state.draft,state.revisions.length+1);state.revisions.push(r);state.activeId=r.id;return r;}
function excludeIssue(state,id,note){const r=active(state);if(!r||dirty(state))throw Error('Parse or discard source changes before review.');if(r.review.committed)throw Error('Create a new revision to change committed review.');if(!note.trim())throw Error('Enter an exclusion reason.');const issue=r.issues.find(i=>i.id===id);if(!issue)throw Error('Issue not found.');issue.disposition='excluded';issue.note=note.trim();}
function reviewRevision(state,mapping,events){
 if(dirty(state))throw Error('Parse or discard source changes before review.');
 const r=active(state);
 if(!r || !mapping || !events || r.issues.some(i=>i.disposition!=='excluded'||!i.note.trim()))throw Error('Resolve all issues and confirm the mapping and events before review.');
 r.review={mapping:true,events:true,committed:true};return r;
}
function exportGate(state){const r=active(state);if(dirty(state))return 'Source changes are unsaved. Parse or discard changes to export.';if(!r||!r.review.committed)return 'Confirm the reviewed revision before exporting.';if(r.issues.some(i=>i.disposition!=='excluded'))return 'Resolve all issues before exporting.';return '';}
function buildDaySchedule(revision, day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || !validateTimestamp(day+'T00:00:00Z'))throw Error('Choose a valid UTC day.');
 const lo=Date.parse(day+'T00:00:00Z'),hi=lo+86400000;
 const events=(revision?.events||[]).filter(e=>Date.parse(e.start)<hi && Date.parse(e.end)>lo).map(e=>{
  const a=Math.max(lo,Date.parse(e.start)),b=Math.min(hi,Date.parse(e.end));
  return {...e,dayStart:new Date(a).toISOString(),dayEnd:new Date(b).toISOString(),minutes:(b-a)/60000,left:(a-lo)/86400000*100,width:(b-a)/86400000*100,previous:Date.parse(e.start)<lo,next:Date.parse(e.end)>hi};
 }).sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
 const overlaps=[];
 events.forEach((a,i)=>events.slice(i+1).forEach(b=>{const minutes=(Math.min(Date.parse(a.dayEnd),Date.parse(b.dayEnd))-Math.max(Date.parse(a.dayStart),Date.parse(b.dayStart)))/60000;if(minutes>0)overlaps.push({a:a.id,b:b.id,minutes});}));
 return {day,events,overlaps,minutes:events.reduce((n,e)=>n+e.minutes,0)};
}
function csvCell(value){let s=String(value);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function exportCsv(state){const error=exportGate(state);if(error)throw Error(error);const schedule=buildDaySchedule(active(state),state.day);return [['selected_date','event_id','event_type','label','frequency','unit','start_utc','end_utc','day_start_utc','day_end_utc','synthetic','review_status'],...schedule.events.map(e=>[state.day,e.id,e.type,e.label,e.frequency,e.unit,e.start,e.end,e.dayStart,e.dayEnd,'true','reviewed'])].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
function exportTraceability(state){const error=exportGate(state);if(error)throw Error(error);return JSON.stringify({synthetic:true,notice:NOTICE,grammar:GRAMMAR,selectedDay:state.day,activeRevision:state.activeId,revisions:state.revisions,schedule:buildDaySchedule(active(state),state.day),independentHumanReview:'pending'},null,2);}
function restoreState(text){const s=JSON.parse(text);if(s.version!==1||!Array.isArray(s.revisions)||typeof s.draft!=='string'||s.draft.length>200000||typeof s.day!=='string')throw Error('Invalid stored session.');buildDaySchedule(null,s.day);
 const ids=new Set();for(const r of s.revisions){if(!Number.isInteger(r.id)||ids.has(r.id)||typeof r.raw!=='string')throw Error('Invalid revision.');ids.add(r.id);const parsed=parseMessage(r.raw,r.id);if(JSON.stringify(parsed.events)!==JSON.stringify(r.events)||JSON.stringify(parsed.records)!==JSON.stringify(r.records)||JSON.stringify(parsed.headers)!==JSON.stringify(r.headers)||r.grammar!==parsed.grammar||r.offsetUnit!==parsed.offsetUnit||r.issues.length!==parsed.issues.length)throw Error('Stored evidence is corrupt.');r.issues.forEach((issue,i)=>{const p=parsed.issues[i];if(['id','line','code','message','reasons','source','fields'].some(key=>JSON.stringify(issue[key])!==JSON.stringify(p[key]))||!['unresolved','excluded'].includes(issue.disposition)||typeof issue.note!=='string'||(issue.disposition==='excluded'&&!issue.note.trim()))throw Error('Stored issue is corrupt.');});if(!r.review||typeof r.review.committed!=='boolean'||(r.review.committed&&(!r.review.mapping||!r.review.events||r.issues.some(i=>i.disposition!=='excluded'))))throw Error('Stored review is corrupt.');}if(s.activeId!==null&&!ids.has(s.activeId))throw Error('Missing active revision.');return s;}
function compareBenchmark(fixtures){let expected=0,extracted=0,matched=0,fields=0,totalFields=0;const mismatches=[];
 fixtures.cases.forEach((c,index)=>{const actual=parseMessage(c.raw).events;expected+=c.events.length;extracted+=actual.length;
 c.events.forEach(key=>{totalFields+=key.values.length;const e=actual.find(e=>e.id===key.values[1]);const values=e?Object.values(e.fields).map(f=>f.value):[];key.values.forEach((v,i)=>{if(values[i]===v)fields++;else mismatches.push('Case '+(index+1)+' '+key.values[1]+' field '+i+' differs.');});if(e && JSON.stringify(values)===JSON.stringify(key.values)&&e.type===key.type&&e.start===key.start&&e.end===key.end)matched++;else mismatches.push('Case '+(index+1)+' '+key.values[1]+' event differs.');});actual.filter(e=>!c.events.some(k=>k.values[1]===e.id)).forEach(e=>mismatches.push('Unexpected event '+e.id));});
 return {expected,extracted,matched,falsePositives:extracted-matched,missed:expected-matched,fields,totalFields,mismatches};
}
const api={TYPES,GRAMMAR,NOTICE,SAMPLE,validateTimestamp,parseMessage,initialState,active,dirty,parseDraft,excludeIssue,reviewRevision,exportGate,buildDaySchedule,exportCsv,exportTraceability,restoreState,compareBenchmark};
if(typeof module==='object'&&module.exports)module.exports=api;else root.Optask=api;
})(typeof globalThis!=='undefined'?globalThis:this);
