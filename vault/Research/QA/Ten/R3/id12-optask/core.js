/* Synthetic OPTASK application core. No external dependencies. */
(function(root){
'use strict';
const disclosure='Synthetic, not validated against the real format.';
const mapping={FREQ:'Frequency plan',CRYPTO:'Crypto change-over',FLIGHT:'Flight quarters'};
const layouts={FREQ:['type','id','start','end','owner','value','unit','description'],CRYPTO:['type','id','start','end','owner','demoLabel','description'],FLIGHT:['type','id','start','end','owner','description'],NOTE:['type','text']};
function normalizeTimestamp(s){
 const m=/^(19\d{2}|20\d{2})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/.exec(s);
 if(!m)return null;
 const [y,mo,d,h,mi]=m.slice(1,6).map(Number), t=new Date(Date.UTC(y,mo-1,d,h,mi));
 if(t.getUTCFullYear()!==y||t.getUTCMonth()!==mo-1||t.getUTCDate()!==d||h>23||mi>59)return null;
 const z=m[6];let offset=0;
 if(z!=='Z'){const a=+z.slice(1,3),b=+z.slice(4);if(a>14||b>59||(a===14&&b!==0))return null;offset=(a*60+b)*(z[0]==='+'?1:-1);}
 return new Date(+t-offset*60000).toISOString();
}
function parseMessage(raw,sourceId='revision-1'){
 const out={grammar:'synthetic-optask/v1',disclosure,offsetUnit:'UTF-16',raw,sourceId,events:[],records:[],issues:[],nonEvents:[]};
 const issue=(line,message,span=null,code='invalid')=>out.issues.push({code,line,sourceId,span,message:`Line ${line}: ${message}`});
 if(typeof raw!=='string'||!raw.trim()){out.issues.push({code:'empty',line:0,sourceId,span:null,message:'Enter synthetic message text.'});return out;}
 if(raw.length>200000){issue(0,'input exceeds 200,000 UTF-16 units.');return out;}
 let base=0;
 raw.split('\n').forEach((part,i)=>{
 const line=part.endsWith('\r')?part.slice(0,-1):part, span={start:base,end:base+line.length},lineNumber=i+1;
 base+=part.length+1;if(!line.trim())return;
 const tokens=line.endsWith('//')?line.slice(0,-2).split('/'):line.split('/'), type=tokens[0],names=Object.prototype.hasOwnProperty.call(layouts,type)?layouts[type]:null;
 if(!names){issue(lineNumber,`unsupported record type ${type}.`,span,'unsupported');out.nonEvents.push({line:lineNumber,span,type});return;}
 let p=span.start;const fields={};tokens.forEach((v,j)=>{const name=names[j]||`extra${j}`;fields[name]={name,sourceText:v,span:{start:p,end:p+v.length},normalizedValue:v};p+=v.length+1;});
 const record={id:tokens[1]||'',category:mapping[type]||null,fields,sourceId,line:lineNumber,lineSpan:span,reviewStatus:'awaiting review',valid:true};out.records.push(record);
 const bad=(msg)=>{record.valid=false;issue(lineNumber,msg,span);};
 if(!line.endsWith('//')||tokens.length!==names.length)bad('incorrect fields or missing terminal // delimiter.');
 if(tokens.some(v=>!v.trim()))bad('all fields must be nonempty.');
 if(type==='NOTE'){out.nonEvents.push({line:lineNumber,span,type,fields});return;}
 if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(record.id))bad('id must start with a letter and contain letters, digits, underscores or hyphens.');
 for(const name of ['start','end']){
 const token=fields[name]?.sourceText||'',norm=normalizeTimestamp(token);if(fields[name])fields[name].normalizedValue=norm;
 record[name+'Utc']=norm;
 if(!norm)bad(!/(Z|[+-]\d{2}:\d{2})$/.test(token)?`${name} requires an explicit timezone.`:`${name} is not a valid calendar timestamp.`);
 }
 if(record.startUtc&&record.endUtc){record.durationMinutes=(Date.parse(record.endUtc)-Date.parse(record.startUtc))/60000;if(record.durationMinutes<=0)bad('end must be after start.');}
 if(type==='FREQ'&&(!/^\d+(\.\d+)?$/.test(fields.value?.sourceText||'')||(!Number.isFinite(Number(fields.value?.sourceText))||Number(fields.value?.sourceText)<=0)||!['kHz','MHz'].includes(fields.unit?.sourceText)))bad('frequency requires a positive decimal value and kHz or MHz.');
 if(type==='CRYPTO'&&!/^KEY-DEMO-[A-Za-z0-9_-]+$/.test(fields.demoLabel?.sourceText||''))bad('crypto label must be a fictitious KEY-DEMO-* token.');
 });
 const groups=Object.create(null);out.records.filter(r=>r.category).forEach(r=>(groups[r.id]||= []).push(r));
 Object.values(groups).filter(g=>g.length>1).forEach(g=>g.forEach(r=>{r.valid=false;issue(r.line,`duplicate id ${r.id}.`,r.lineSpan,'duplicate');}));
 out.events=out.records.filter(r=>r.category&&r.valid);return out;
}
function projectDay(events,utcDay){
 const start=Date.parse(utcDay+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(utcDay)||!Number.isFinite(start)||new Date(start).toISOString().slice(0,10)!==utcDay)return {error:'Choose a valid UTC day.',entries:[],outside:events.length};
 const end=start+86400000,entries=[];
 for(const e of events){const a=Date.parse(e.startUtc),b=Date.parse(e.endUtc);if(a>=end||b<=start)continue;const x=Math.max(a,start),y=Math.min(b,end);entries.push({...e,displayStart:x===end?'24:00':new Date(x).toISOString().slice(11,16),displayEnd:y===end?'24:00':new Date(y).toISOString().slice(11,16),offsetMinutes:(x-start)/60000,visibleMinutes:(y-x)/60000,continued:a<start,continues:b>end});}
 return {day:utcDay,entries,outside:events.length-entries.length};
}
function scheduleText(e){const f=e.fields;return [e.category,e.id,`${e.displayStart}–${e.displayEnd} UTC`,...(e.continued?['continued from previous day']:[]),...(e.continues?['continues next day']:[]),...(f.value?[`${f.value.sourceText} ${f.unit.sourceText}`]:[]),...(f.demoLabel?[f.demoLabel.sourceText]:[]),f.description.sourceText].join(' · ');}
function compareAnswerKey(actual,key){
 let matched=0,fieldDiscrepancies=0,timeDiscrepancies=0,spanDiscrepancies=0;
 for(const expected of key.events){const e=actual.events.find(e=>e.id===expected.id);if(!e)continue;
 if(e.category===expected.category&&e.startUtc===expected.startUtc&&e.endUtc===expected.endUtc)matched++;
 for(const n of ['startUtc','endUtc'])if(e[n]!==expected[n])timeDiscrepancies++;
 for(const [n,k]of Object.entries(expected.fields)){const f=e.fields[n];if(!f||f.sourceText!==k.sourceText)fieldDiscrepancies++;if(!f||f.span.start!==k.span.start||f.span.end!==k.span.end)spanDiscrepancies++;}
 }
 return {expected:key.events.length,extracted:actual.events.length,matched,falsePositives:actual.events.length-matched,missed:key.events.length-matched,precision:actual.events.length?matched/actual.events.length:null,recall:key.events.length?matched/key.events.length:null,fieldDiscrepancies,timeDiscrepancies,spanDiscrepancies};
}
function freshSnapshot(){return {schemaVersion:1,history:[],draft:'',currentId:null,reviewedId:null,day:'2026-11-04',benchmarkReviewed:false};}
function commitDraft(s){if(s.history.at(-1)?.raw!==s.draft){const id='revision-'+(s.history.length+1);s.history.push({id,grammar:'synthetic-optask/v1',disclosure,raw:s.draft,previousRevisionId:s.currentId});s.currentId=id;}s.reviewedId=null;return parseMessage(s.draft,s.currentId);}
function isDirty(s){return s.draft!==(s.history.at(-1)?.raw||'');}
function reviewSnapshot(s,ack){if(isDirty(s))return 'Parse the edited source before review.';if(!s.currentId)return 'Parse message before review.';const p=parseMessage(s.history.at(-1).raw,s.currentId);if(p.issues.length)return 'Resolve all issues before review.';if(!ack)return 'Check the source and mapping acknowledgement before review.';s.reviewedId=s.currentId;return null;}
function restoreSnapshot(text){try{const s=JSON.parse(text);if(s.schemaVersion!==1||!Array.isArray(s.history)||typeof s.draft!=='string'||projectDay([],s.day).error)throw Error();let prev=null;for(let i=0;i<s.history.length;i++){const r=s.history[i];if(r.id!=='revision-'+(i+1)||typeof r.raw!=='string'||r.previousRevisionId!==prev)throw Error();prev=r.id;}if(s.currentId!==prev||(s.reviewedId!==null&&s.reviewedId!==s.currentId))throw Error();if(s.reviewedId&&parseMessage(s.history.at(-1).raw).issues.length)throw Error();return {snapshot:s};}catch{return {error:'Saved workspace is unreadable. Export its original bytes or replace it explicitly.'};}}
function buildExport(s,day){if(isDirty(s))return {error:'Parse and review the edited source before export.'};if(!s.currentId||s.reviewedId!==s.currentId)return {error:'Review and save the parsed source before export.'};const p=parseMessage(s.history.at(-1).raw,s.currentId);if(p.issues.length)return {error:'Resolve all issues before export.'};const schedule=projectDay(p.events,day);if(schedule.error)return schedule;return {schemaVersion:1,grammar:p.grammar,disclosure,utcDay:day,sourceHistory:s.history,reviewedRevisionId:s.reviewedId,reviewStatus:'reviewed',events:p.events.map(e=>({...e,reviewStatus:'reviewed'})),issues:p.issues,schedule};}
const api={disclosure,mapping,normalizeTimestamp,parseMessage,projectDay,scheduleText,compareAnswerKey,freshSnapshot,commitDraft,isDirty,reviewSnapshot,restoreSnapshot,buildExport};if(typeof module!=='undefined')module.exports=api;root.OptaskCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
