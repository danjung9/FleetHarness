import {object,text,array,compareText,timestamp,integer} from './lib/validation.js';
const fail=(code='INVALID_INPUT')=>{throw Error(code)};
const str=x=>typeof x==='string';
const non=x=>str(x)&&!!x.trim();
const bool=(x,def=false)=>x===undefined?def:typeof x==='boolean'?x:fail();
export function dateOK(x){if(!str(x)||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;const d=new Date(x+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===x}
const category=x=>['training-log','supply-requisition','routine-correspondence'].includes(x)?x:fail();
const split=(v,sep=';')=>v.split(sep).map(s=>s.trim()).filter(Boolean);
const specs={
 'training-log':[['date','Date'],['topic','Topic'],['participants','Participants'],['durationMinutes','Duration minutes'],['reviewer','Reviewer']],
 'supply-requisition':[['documentId','Document'],['documentDate',null],['itemId','Item'],['quantity','Quantity'],['unit','Unit'],['priority','Priority'],['destination','Destination']],
 'routine-correspondence':[['senderRole','From'],['recipientRole','To'],['subject','Subject'],['date','Date'],['reference','Reference'],['enclosureIds','Enclosure'],['route','Route']]};
const lists=['participants','enclosureIds','route'], nums=['durationMinutes','quantity'];
export function extract(i){category(i.category);object(i.source);text(i.source.id,'id');text(i.source.text,'source',1e7);if(!dateOK(i.captureDate))fail();
 const found=new Map(),training=i.category==='training-log';
 if(training){const decode=s=>s.replace(/&(amp|lt|gt|quot|apos);/g,(_,k)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[k]));const vals=[...i.source.text.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(m=>decode(m[1]));for(let k=0;k<5;k++){const label=specs[i.category][k][1], ix=vals.reduce((a,v,n)=>v===label?[...a,n]:a,[]);if(ix.length>1)fail();if(ix.length)found.set(label,{value:vals[ix[0]+1]??'',locator:'R'+(k+1)})}}
 else i.source.text.split(/\r?\n/).forEach((line,n)=>{const m=/^([^:]+):\s*(.*)$/.exec(line);if(m&&specs[i.category].some(s=>s[1]===m[1])){if(found.has(m[1]))fail();found.set(m[1],{value:m[2].trim(),locator:'line:'+(n+1)})}});
 const fields={},citations=[],issues=[];
 for(const [key,label]of specs[i.category]){const f=found.get(label),v=f?.value??'';fields[key]=key==='documentDate'?i.captureDate:lists.includes(key)?split(v,key==='route'?' > ':';'):nums.includes(key)?/^\d+$/.test(v)?Number(v):null:v;if(f)citations.push({field:key,sourceId:i.source.id,locator:f.locator});if(training&&key==='durationMinutes'&&v&&!/^\d+$/.test(v))issues.push({field:key,message:'Duration is ambiguous.',candidates:v==='6O'?['60','6O']:[]})}
 return {fields,citations,issues};
}
export function validate(i){category(i.category);const f=object(i.fields);for(const k of ['availableArtifactIds','availableRecordIds'])if(!Array.isArray(i[k])||!i[k].every(str))fail();const ambiguous=bool(i.ambiguous);
 for(const [k]of specs[i.category])if(Object.hasOwn(f,k)){const v=f[k];if(lists.includes(k)?!Array.isArray(v)||!v.every(str):nums.includes(k)?v!==null&&(typeof v!=='number'||!Number.isFinite(v)):!str(v))fail()}
 const errors=[],add=(ok,msg)=>{if(!ok)errors.push(msg)},required=(k,msg)=>add(non(f[k]),msg),dt=k=>add(dateOK(f[k]),'Enter a valid calendar date.');
 if(i.category==='training-log'){dt('date');required('topic','Topic is required.');add(f.participants?.length>0,'At least one participant is required.');add(Number.isInteger(f.durationMinutes)&&f.durationMinutes>=1&&f.durationMinutes<=480,'Duration must be an integer from 1 to 480.');required('reviewer','Reviewer is required.');add(!ambiguous,'Duration is ambiguous.')}
 if(i.category==='supply-requisition'){required('documentId','Document identifier is required.');dt('documentDate');required('itemId','Item identifier is required.');add(Number.isInteger(f.quantity)&&f.quantity>=1&&f.quantity<=9999,f.quantity==null?'Quantity is required.':'Quantity must be an integer from 1 to 9999.');add(['EA','BOX'].includes(f.unit),'Unit must be EA or BOX.');add(['critical','routine'].includes(f.priority),'Priority must be critical or routine.');required('destination','Destination is required.')}
 if(i.category==='routine-correspondence'){required('senderRole','Sender is required.');required('recipientRole','Recipient is required.');required('subject','Subject is required.');dt('date');add(non(f.reference)&&i.availableRecordIds.includes(f.reference),'Reference is missing.');add(f.enclosureIds?.length>0,'Enclosure is required.');for(const id of [...(f.enclosureIds??[])].sort())add(i.availableArtifactIds.includes(id),`Enclosure ${id} is missing.`);add(JSON.stringify(f.route)===JSON.stringify(['ADMIN-DRAFTER','ADMIN-REVIEWER','ADMIN-APPROVER']),'Route must be ADMIN-DRAFTER > ADMIN-REVIEWER > ADMIN-APPROVER.')}
 return {valid:!errors.length,errors};
}
export function classify(i){text(i.category,'category');if(!str(i.date))fail();const ts=i.taskStatus===undefined?'':i.taskStatus;if(!str(ts))fail();const ambiguous=bool(i.ambiguous), cats=['training-log','supply-requisition','routine-correspondence','tasking'],n=cats.indexOf(i.category),ruleId=n<0?null:'SYN-R'+(n+1);let reviewDate=null;if(n>=0&&dateOK(i.date)&&(n!==3||(['completed','cancelled'].includes(ts)&&!ambiguous))){const d=new Date(i.date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+[365,730,180,90][n]);reviewDate=d.toISOString().slice(0,10)}return {ruleId,reviewDate,disposition:reviewDate?'review-for-disposal':'hold'}}
export function workflow(i){const s=object(i.state);if(!['approve','queue','route','edit','stop'].includes(i.command))fail();text(s.revisionId,'revision');if(s.approvedRevision!==null&&!str(s.approvedRevision))fail();if(typeof s.valid!=='boolean'||typeof s.conflicted!=='boolean'||!['draft','approved','queued-offline','routed-local-simulation','stopped'].includes(s.routeState))fail();text(i.actor,'actor');if(!timestamp(i.timestamp))fail();const online=bool(i.online);if(i.newRevisionId!==undefined&&!str(i.newRevisionId))fail();if(i.command==='edit'&&(!non(i.newRevisionId)||i.newRevisionId===s.revisionId))fail();const state={revisionId:s.revisionId,approvedRevision:s.approvedRevision,valid:s.valid,conflicted:s.conflicted,routeState:s.routeState};
 if(['approve','queue','route'].includes(i.command)){if(!s.valid)fail('VALIDATION_REQUIRED');if(s.conflicted)fail('CONFLICT_REVIEW_REQUIRED')}
 if(['queue','route'].includes(i.command)&&s.approvedRevision!==s.revisionId)fail('APPROVAL_REQUIRED');
 let action;
 if(i.command==='approve'){state.approvedRevision=s.revisionId;state.routeState='approved';action='approved'}
 if(i.command==='queue'){state.routeState='queued-offline';action='queued-offline'}
 if(i.command==='route'){if(!['queued-offline','routed-local-simulation'].includes(s.routeState))fail('QUEUE_REQUIRED');if(!online)fail('OFFLINE');if(s.routeState==='routed-local-simulation')return {state,event:null};state.routeState='routed-local-simulation';action='routed-local-simulation'}
 if(i.command==='edit'){state.revisionId=i.newRevisionId;state.approvedRevision=null;state.routeState='draft';action='edited'}
 if(i.command==='stop'){state.routeState='stopped';action='stopped'}
 return {state,event:{revisionId:state.revisionId,action,actor:i.actor,timestamp:i.timestamp}};
}
export function benchmark(i){for(const k of ['manualMinutes','assistedMinutes'])if(typeof i[k]!=='number'||!Number.isFinite(i[k])||i[k]<0)fail();for(const k of ['packetVolume','caughtErrors','plantedErrors'])integer(i[k],k,0,Number.MAX_SAFE_INTEGER);if(i.caughtErrors>i.plantedErrors)fail();const estimatedMinutesSaved=(i.manualMinutes-i.assistedMinutes)*i.packetVolume;return {estimatedMinutesSaved,estimatedHoursSaved:estimatedMinutesSaved/60,errorDetectionRate:i.plantedErrors===0?null:i.caughtErrors/i.plantedErrors,provenance:'Synthetic estimate; no measured Fleet SME baseline.'}}
export function tasks(i){const sources=array(i.sources,'sources',100).map(s=>{object(s);text(s.id,'id');text(s.text,'text',1e7);const lines=s.text.split(/\r?\n/),dates=lines.filter(l=>l.startsWith('Date:')).map(l=>l.slice(5).trim());if(dates.length>1||dates.length&&!timestamp(dates[0]))fail();return {...s,lines,date:dates[0]??null}});if(new Set(sources.map(s=>s.id)).size!==sources.length)fail();
 // Validate all slot grammar before semantic reference errors.
 const occurrences=[];for(const s of sources)for(let n=0;n<s.lines.length;n++){const l=s.lines[n];if(!l.startsWith('Task:'))continue;const m=/^Task:\s*([^|]+)\|\s*Action:\s*([^|]+)\|\s*Owner:\s*([^|]*)\|\s*Due:\s*([^|]*)\|\s*Status:\s*(open|completed|cancelled)\s*$/.exec(l);if(!m)fail();const [id,action,ownerRaw,dueRaw,status]=m.slice(1).map(x=>x.trim()),owner=ownerRaw==='?'?'':ownerRaw,due=dueRaw==='?'?'':dueRaw;if(!id||!action||due&&!timestamp(due))fail();occurrences.push({source:s.id,n,id,action,owner,due,status})}
 for(const s of sources)for(const l of s.lines){const m=/^(Amends|Forward-of|Attachment):\s*(.*)$/.exec(l);if(m&&!sources.some(s=>s.id===m[2].trim()))fail('SOURCE_MISSING')}
 sources.sort((a,b)=>(a.date?Date.parse(a.date):-Infinity)-(b.date?Date.parse(b.date):-Infinity)||compareText(a.id,b.id));
 const groups=new Map(),lineage=new Map();
 for(const s of sources){const amendments=s.lines.map(l=>/^Amends:\s*(.*)$/.exec(l)).filter(Boolean).map(m=>m[1].trim());const ancestors=new Set(amendments.flatMap(id=>[id,...(lineage.get(id)??[])]));lineage.set(s.id,ancestors);
 for(const o of occurrences.filter(o=>o.source===s.id)){let g=groups.get(o.id);if(!g){g={id:o.id,action:o.action,values:[],status:o.status,closedDate:null,citations:[]};groups.set(o.id,g)}
 const prev=s.lines[o.n-1]??'',meta=/^(Amends|Updates|Forward-of):\s*(.*)$/.exec(prev),relevant=meta&&(meta[1]!=='Updates'||meta[2].trim()===o.id);
 const citation=`${s.id}:${relevant?o.n+'-':''}${o.n+1}`;if(!g.citations.includes(citation))g.citations.push(citation);
 if(ancestors.size){g.values=g.values.filter(v=>!ancestors.has(v.source));g.action=o.action}
 g.values.push(o);
 const updates=s.lines.some(l=>l===`Updates: ${o.id}`);
 if(updates){g.status=o.status;g.closedDate=['completed','cancelled'].includes(o.status)&&s.date?s.date.slice(0,10):null}
 }}
 const result=[...groups.values()].sort((a,b)=>compareText(a.id,b.id)).map(g=>{const ownerCandidates=[...new Set(g.values.map(v=>v.owner).filter(Boolean))],dueCandidates=[...new Set(g.values.map(v=>v.due).filter(Boolean))],errors=[];if(!ownerCandidates.length)errors.push('Task owner is required.');if(!dueCandidates.length)errors.push('Task due date is required.');if(ownerCandidates.length>1||dueCandidates.length>1)errors.push('Conflicting owner and due date without explicit amendment');return {id:g.id,action:g.action,owner:ownerCandidates.length===1?ownerCandidates[0]:'',due:dueCandidates.length===1?dueCandidates[0]:'',ownerCandidates,dueCandidates,status:errors.length?'needs-review':g.status,verified:!errors.length,closedDate:g.closedDate,citations:g.citations,errors}});
 let statusDraft='SYNTHETIC DRAFT — verified actions only.';for(const status of ['completed','cancelled','open'])for(const t of result.filter(t=>t.verified&&t.status===status))statusDraft+=` ${{completed:'Completed',cancelled:'Cancelled',open:'Open'}[status]}: ${t.action} (${t.owner}; due ${t.due}).`;const n=result.filter(t=>!t.verified).length;if(n)statusDraft+=n===1?' One action requires review and is excluded from status claims.':` ${n===2?'Two':n} actions require review and are excluded from status claims.`;
 return {tasks:result,statusDraft};
}
