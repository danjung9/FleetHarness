import {reconcileRecords} from './lib/offline.js';
export const fields=['marking','reportId','familyId','reportType','relatedReportId','unit','category','equipmentId','casualty','impact','occurredAt','repair','equipmentStatus','jsn','narrative'];
export const keys=['MARKING','REPORT','FAMILY','TYPE','RELATED','UNIT','CATEGORY','EQUIPMENT','CASUALTY','IMPACT','OCCURRED','REPAIR','STATUS','JSN','NARRATIVE'];
export const roles=['Originator (Sailor/LPO)','Division Officer','Department Head','Engineer Officer/CHENG','XO','CO'];
export const marking='Synthetic — not validated against the real CASREP format.';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const strings=(x,fs)=>obj(x)&&fs.every(f=>typeof x[f]==='string');
export const date=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().replace('.000Z','Z')===x;
export const render=c=>keys.map((k,i)=>`${k}=${c[fields[i]]}`).join('\n')+'\nEND\n';
export function parse(message){
 const c=Object.fromEntries(fields.map(f=>[f,'']));let grammar=false,last=-1;
 if(message.includes('\r')||!message.endsWith('\nEND\n'))grammar=true;
 else for(const line of message.slice(0,-5).split('\n')){const p=line.indexOf('=');const i=keys.indexOf(line.slice(0,p));if(p<0||i<=last||i<0){grammar=true;break;}last=i;c[fields[i]]=line.slice(p+1);}
 const errors=[]; if(grammar)errors.push('message: expected canonical KEY=value lines and END');
 else for(const f of fields){const v=c[f];let e='';
 if(f==='marking'){if(v!==marking)e='synthetic marking required';}
 else if(!v)e='required';
 else if(f==='reportId'&&!/^SYN-CR-\d{3}$/.test(v))e='expected SYN-CR-NNN';
 else if(f==='familyId'&&!/^SYN-FAM-\d{3}$/.test(v))e='expected SYN-FAM-NNN';
 else if(f==='reportType'&&!['INITIAL','UPDATE','CORRECT','CASCOR'].includes(v))e='expected INITIAL, UPDATE, CORRECT or CASCOR';
 // Link rules depend on a recognized type; an unsupported TYPE has its own error.
 else if(f==='relatedReportId'&&(c.reportType==='INITIAL'?v!=='NONE':['UPDATE','CORRECT','CASCOR'].includes(c.reportType)&&(!/^SYN-CR-\d{3}$/.test(v)||v===c.reportId)))e='invalid link';
 else if(f==='category'&&!['2','3','4'].includes(v))e='expected 2, 3 or 4';
 else if(f==='occurredAt'&&!date(v))e='expected a real UTC timestamp YYYY-MM-DDTHH:mm:ssZ';
 else if(f==='repair'&&(c.reportType==='CASCOR'?v!=='COMPLETE':!date(v)||v<c.occurredAt))e=c.reportType==='CASCOR'?'CASCOR requires COMPLETE':'expected UTC timestamp at or after occurredAt';
 else if(f==='equipmentStatus'&&(c.reportType==='CASCOR'?v!=='RESTORED':!['DEGRADED','UNAVAILABLE'].includes(v)))e=c.reportType==='CASCOR'?'CASCOR requires RESTORED':'expected DEGRADED or UNAVAILABLE';
 if(e)errors.push(`${f}: ${e}`);}
 return {parsedFields:c,validationErrors:errors,renderedMessage:errors.length?null:render(c)};
}
export function reconcile(base,left,right){const merged={},conflicts=[];for(const field of fields){const b=base[field],l=left[field],r=right[field];merged[field]=l===r?l:l===b?r:r===b?l:b;if(l!==r&&l!==b&&r!==b)conflicts.push({field,base:b,left:l,right:r});}return {conflicts,merged};}
export function dag(revisions){return reconcileRecords({local:revisions.map(r=>({id:r.revisionId,recordId:r.reportId,parents:r.parentRevisionIds,actor:r.actorId,value:JSON.stringify(r.content)})),remote:[]});}
export function workflow(input){
 const s={status:'EMPTY',holder:roles[0],currentRevisionId:'NONE',revisionIds:[],auditEventIds:[],validApprovalEventIds:[],invalidatedApprovalEventIds:[],renderedMessage:null,errors:[],rejections:[]};
 const invalidate=()=>{s.invalidatedApprovalEventIds.push(...s.validApprovalEventIds);s.validApprovalEventIds=[];};
 for(const cmd of input.commands){const {actorId,action,revisionId,eventId,text}=cmd;const n=/^ACT-0[1-6]$/.test(actorId)?Number(actorId.slice(-1))-1:-1;let error='';
 const reject=e=>{error=e;};
 if(!['save','submit','comment','return','approveForward','approve','mockRelease'].includes(action))reject('action: unsupported');
 else if(n<0||(['save','submit'].includes(action)&&n!==0)||(['approve','mockRelease'].includes(action)&&n!==5))reject('actorId: role is not permitted');
 else if(s.auditEventIds.includes(eventId))reject('eventId: duplicate');
 else if(s.status==='RELEASED')reject(action==='mockRelease'?'status: report already released':'status: released report is immutable; create a linked report');
 else if(action!=='save'&&revisionId!==s.currentRevisionId)reject(`revisionId: current revision is ${s.currentRevisionId}`);
 else if(action==='return'&&n===0)reject('action: originator cannot return its own draft');
 else if(action==='approveForward'&&n===5)reject('action: CO has no next reviewer');
 else if(action==='save'){
 const r=input.revisions.find(r=>r.revisionId===revisionId);const p=r&&parse(r.sourceMessage);
 if(p?.validationErrors.length)reject(p.validationErrors[0]);
 else if(!r||r.reportId!==input.reportId||r.content.reportId!==input.reportId||fields.some(f=>r.content[f]!==p.parsedFields[f])||input.revisions.filter(x=>x.revisionId===revisionId).length!==1||s.revisionIds.includes(revisionId)||JSON.stringify(r.parentRevisionIds)!==JSON.stringify(s.currentRevisionId==='NONE'?[]:[s.currentRevisionId])||r.actorId!==actorId)reject('revision: invalid lineage');
 else {try{dag([...s.revisionIds.map(id=>input.revisions.find(r=>r.revisionId===id)),r]);}catch{reject('revision: invalid lineage');}if(!error){invalidate();s.status='DRAFT';s.holder=roles[0];s.currentRevisionId=revisionId;s.revisionIds.push(revisionId);s.renderedMessage=p.renderedMessage;}}
 }else if(action==='comment'){if(!text.trim())reject('text: required');}
 else if(action==='submit'){if(!['DRAFT','RETURNED'].includes(s.status))reject('status: submission requires DRAFT or RETURNED');else{s.status='IN_REVIEW';s.holder=roles[1];}}
 else if(action==='mockRelease'){
 if(['DRAFT','RETURNED'].includes(s.status)||s.invalidatedApprovalEventIds.length&&s.validApprovalEventIds.length<5)reject('approvals: current revision requires all five reviewer approvals');
 else if(s.status!=='APPROVED')reject('approvals: CO approval required for current revision');
 else if(s.validApprovalEventIds.length!==5)reject('approvals: current revision requires all five reviewer approvals');else{s.status='RELEASED';s.holder='NONE';}
 }else if(roles[n]!==s.holder)reject(`currentHolder: ${s.holder} must act next`);
 else if(s.status!=='IN_REVIEW')reject('status: review requires IN_REVIEW');
 else if(action==='return'){if(!text.trim())reject('text: required');else{invalidate();s.status='RETURNED';s.holder=roles[0];}}
 else {s.validApprovalEventIds.push(eventId);if(action==='approve'){s.status='APPROVED';}else s.holder=roles[n+1];}
 if(error){s.errors=[error];s.rejections=[{actorId,action,revisionId,reason:error}];break;}s.auditEventIds.push(eventId);
 }return s;
}
export function computeCore(input){
 if(!obj(input)||typeof input.action!=='string')return {error:'input: invalid shape'};
 if(!['parse','workflow','reconcile'].includes(input.action))return {error:'action: unsupported'};
 if(input.action==='parse')return typeof input.message==='string'?parse(input.message):{error:'input: invalid shape'};
 if(input.action==='reconcile')return [input.base,input.left,input.right].every(c=>strings(c,fields))?reconcile(input.base,input.left,input.right):{error:'input: invalid shape'};
 if(typeof input.reportId!=='string'||!/^SYN-CR-\d{3}$/.test(input.reportId)||!Array.isArray(input.revisions)||!Array.isArray(input.commands)||!input.revisions.every(r=>strings(r,['revisionId','reportId','sourceMessage','actorId','timestamp','changeReason'])&&strings(r.content,fields)&&Array.isArray(r.parentRevisionIds)&&r.parentRevisionIds.every(x=>typeof x==='string'))||!input.commands.every(c=>strings(c,['eventId','actorId','timestamp','revisionId','action','text'])&&date(c.timestamp)))return {error:'input: invalid shape'};
 return workflow(input);
}
