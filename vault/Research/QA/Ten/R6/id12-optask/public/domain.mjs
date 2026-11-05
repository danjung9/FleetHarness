export const provenance='Synthetic; not validated against the real USMTF format.';
const categories={FREQPLAN:'frequency plan',CRYPTO:'crypto change-over window',FLIGHTQ:'flight quarters'};
function day(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||s.slice(0,4)==='0000')return null; const n=Date.parse(s+'T00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s?n:null;}
function time(s){const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(Z|([+-])(\d{2}):(\d{2}))$/.exec(s);if(!m||day(m[1])===null||+m[2]>23||+m[3]>59||(+m[6]>14)||(+m[7]>59)||(+m[6]===14&&+m[7]!==0))return null;return day(m[1])+(+m[2]*60 + +m[3]-(m[4]==='Z'?0:(m[5]==='+'?1:-1)*(+m[6]*60 + +m[7])))*60000;}
const utc=n=>new Date(n).toISOString().replace(':00.000Z','Z');
export function invoke(x){
 const fail={status:'error',error:'INVALID_INPUT',result:null};
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!['action','grammarVersion','rawText','selectedShip','selectedDay','displayTimezone','reviewed'].includes(k))||('action'in x&&x.action!=='extract')||x.grammarVersion!=='SYN-OPTASK/1'||typeof x.rawText!=='string'||typeof x.selectedShip!=='string'||!x.selectedShip.length||day(x.selectedDay)===null||x.displayTimezone!=='UTC'||('reviewed'in x&&typeof x.reviewed!=='boolean'))return fail;
 const raw=x.rawText,issues=[],events=[],blocks=[],lines=[];let offset=0;
 for(const [i,t] of raw.split('\n').entries()){const text=t.endsWith('\r')?t.slice(0,-1):t; lines.push({start:offset,end:offset+text.length,text,line:i+1});offset+=t.length+1;}
 const evidence=(l,a=0,b=l.text.length)=>({start:l.start+a,end:l.start+b,text:l.text.slice(a,b),line:l.line});
 const add=(code,message,source,block=null)=>issues.push({code,message,source,resolution:'Correct source and reparse; acknowledgement does not validate an order.',block});
 const structure=(l,b)=>{add('INVALID_STRUCTURE','Message structure is invalid.',l,b);if(b)b.bad=true;};
 let current=null,firstId=null,seenBanner=false;
 for(const l of lines){if(!l.text.trim())continue;
 if(!seenBanner){seenBanner=true;if(l.text==='SYNTHETIC OPTASK — NOT REAL USMTF')continue;structure(l,null);}
 if(!l.text.endsWith('//')){add('MALFORMED_SET','Line is missing the // set terminator.',l,current);continue;}
 const parts=l.text.slice(0,-2).split('/');l.parts=parts;l.set=parts[0];
 if(l.set==='MSGID'){
 if(current){structure(l,current);}
 current={id:parts[1],open:l,lines:[],bad:parts.length!==2||!parts[1]};blocks.push(current);if(firstId===null&&parts[1])firstId=parts[1];if(current.bad)structure(l,current);continue;
 }
 if(l.set==='ENDMSG'){if(!current||parts.length!==1)structure(l,current);current=null;continue;}
 if(categories[l.set]){if(!current)structure(l,null);else current.lines.push(l);continue;}
 if(['EXERCISE','TIMEZONE','SUBJ','REMARK'].includes(l.set)){if(parts.length!==2||!parts[1]||(l.set==='TIMEZONE'&&parts[1]!=='EXPLICIT-ENDPOINT-OFFSETS'))structure(l,current);continue;}
 add('UNSUPPORTED_SET',`Unsupported set ${l.set}; review potentially relevant source.`,l,current);
 }
 if(current)structure(current.open,current);
 const duplicated=new Set();for(const b of blocks)if(b.id&&blocks.filter(z=>z.id===b.id).length>1)duplicated.add(b.id);
 for(const id of duplicated){const b=blocks.find(z=>z.id===id);add('DUPLICATE_MESSAGE_ID',`${id}: duplicate message ID; both message blocks quarantined.`,b.open);}
 for(let i=issues.length-1;i>=0;i--)if(issues[i].block&&duplicated.has(issues[i].block.id))issues.splice(i,1);
 for(const b of blocks){if(b.bad||duplicated.has(b.id))continue;
 const dup=new Set();for(const l of b.lines)if(l.parts[1]&&b.lines.filter(z=>z.parts[1]===l.parts[1]).length>1)dup.add(l.parts[1]);
 for(const id of dup)add('DUPLICATE_RECORD_ID',`${id}: duplicate record ID; both occurrences quarantined.`,b.lines.find(l=>l.parts[1]===id));
 for(const l of b.lines){const p=l.parts,id=p[1]||'?';if(dup.has(p[1]))continue;const names=['record ID','ship','label','start','end',...(l.set==='FREQPLAN'?['frequency','frequency unit']:[])];const keys=['recordId','ship','label','start','end','frequency','unit'];let error=null;
 const missing=names.findIndex((_,i)=>p[i+1]===undefined||p[i+1]==='');
 if(missing>=0)error=['MISSING_FIELD',`${id}: ${names[missing]} is required.`];else if(p.length>names.length+1)error=['EXTRA_FIELD',`${id}: extra fields are unsupported.`];
 else if(!/(Z|[+-]\d{2}:\d{2})$/.test(p[4])||!/(Z|[+-]\d{2}:\d{2})$/.test(p[5]))error=['MISSING_TIMEZONE',`${id}: explicit timezone required on both endpoints.`];
 const start=time(p[4]),end=time(p[5]);
 if(!error&&(start===null||end===null))error=['INVALID_DATE',`${id}: impossible calendar date.`];
 if(!error&&end<=start)error=['NONPOSITIVE_INTERVAL',`${id}: end must be after start; no inferred rollover.`];
 if(!error&&l.set==='FREQPLAN'&&(!/^\d+(\.\d+)?$/.test(p[6])||!Number.isFinite(+p[6])||+p[6]<=0))error=['INVALID_FREQUENCY',`${id}: frequency must be a positive finite decimal.`];
 if(!error&&l.set==='FREQPLAN'&&!['MHz','kHz'].includes(p[7]))error=['INVALID_UNIT',`${id}: frequency unit must be MHz or kHz.`];
 if(error){add(...error,l);continue;}
 const fields={};let pos=p[0].length+1;for(let i=0;i<names.length;i++){fields[keys[i]]=evidence(l,pos,pos+p[i+1].length);pos+=p[i+1].length+1;}
 const base=day(x.selectedDay),selected=p[2]===x.selectedShip&&start<base+86400000&&end>base;
 events.push({category:categories[l.set],id:p[1],ship:p[2],label:p[3],startRaw:p[4],endRaw:p[5],frequency:l.set==='FREQPLAN'?+p[6]:null,unit:l.set==='FREQPLAN'?p[7]:null,source:evidence(l),fields,messageIdSource:evidence(b.open,6,6+b.id.length),categorySource:evidence(l,0,p[0].length),startUtc:utc(start),endUtc:utc(end),durationMinutes:(end-start)/60000,selected,selectionReason:p[2]!==x.selectedShip?'other ship':selected?'intersects selected UTC day and matches ship':'outside selected UTC day',displaySegment:selected?{startMinute:(Math.max(start,base)-base)/60000,endMinute:(Math.min(end,base+86400000)-base)/60000}:null});
 }}
 if(!raw.trim())add('EMPTY_INPUT','Enter a synthetic OPTASK message.',null);
 issues.sort((a,b)=>(a.source?.start??-1)-(b.source?.start??-1));const cleanIssues=issues.map(({block,...i})=>({...i,source:i.source?evidence(i.source):null}));
 const categoryCounts=Object.fromEntries(Object.values(categories).map(c=>[c,events.filter(e=>e.category===c).length]));
 const exportContent={provenance,messageId:firstId,selectedShip:x.selectedShip,selectedDay:x.selectedDay,timezone:'UTC',reviewStatus:x.reviewed&&!issues.length?'reviewed-draft':'unreviewed',unresolvedIssueCodes:cleanIssues.map(i=>i.code),events:events.filter(e=>e.selected),originalText:raw};
 return {status:issues.length?'needs_review':'ok',error:null,result:{extractedEventCount:events.length,selectedEventCount:exportContent.events.length,categoryCounts,events,issues:cleanIssues,exportContent}};
}
