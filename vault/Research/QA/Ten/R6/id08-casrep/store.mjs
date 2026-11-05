import {mkdir,open,rename,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {computeCore,workflow,parse,render,reconcile,dag,roles,marking} from './casrep.mjs';
const data=JSON.parse(await readFile(new URL('./data/synthetic-data.json',import.meta.url),'utf8'));
const sample=data.records[0];
const conflict=data.scenarios.find(s=>s.name==='Concurrent amendments and explicit resolution').input;
export class Store{
 constructor(directory=path.join(tmpdir(),'casrep-command-local')){this.directory=directory;this.queue=Promise.resolve();}
 async load(id){try{return JSON.parse(await readFile(path.join(this.directory,id+'.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return this.empty();}}
 empty(){return {reportId:sample.recordId,revisions:[],commands:[],events:[],decisions:[],rejections:[],branches:[],reports:{},notices:[]};}
 state(w){const normalized=w.revisions.map(r=>r.revisionId===w.resolutionId?{...r,parentRevisionIds:[w.resolutionBase]}:r);const s=workflow({...w,revisions:normalized});s.revisionIds=w.revisions.map(r=>r.revisionId);return s;}
 async commit(id,w){await mkdir(this.directory,{recursive:true});const file=path.join(this.directory,id+'.json'),temp=file+'.tmp';const f=await open(temp,'w',0o600);try{await f.writeFile(JSON.stringify(w));await f.sync();}finally{await f.close();}await rename(temp,file);const dir=await open(this.directory,'r');try{await dir.sync();}finally{await dir.close();}}
 view(w){return {...w,state:this.state(w)};}
 async request(id,input){if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw new TypeError('Invalid workspace ID');const task=this.queue.then(()=>this.run(id,input));this.queue=task.catch(()=>{});return task;}
 async run(id,input){let w=await this.load(id);const old=this.state(w);
 if(input.operation==='get')return this.view(w);
 const reject=async reason=>{w.rejections.push({attemptId:w.rejections.length+1,actorId:input.actorId||'ACT-01',action:input.operation,revisionId:old.currentRevisionId,reason,timestamp:new Date().toISOString()});await this.commit(id,w);return {...this.view(w),error:reason};};
 if(input.operation==='setup'){
 w=this.empty();if(input.scenario!=='initial'){const count=7;for(let i=0;i<count;i++){const event=sample.events[i];if(event.action==='save')w.revisions.push(structuredClone(sample.revisions.find(r=>r.revisionId===event.revisionId)));this.apply(w,structuredClone(event));}if(input.scenario==='conflict'){w.branches=structuredClone(conflict.branches);dag([...w.revisions,...w.branches]);}}
 await this.commit(id,w);return this.view(w);
 }
 if(input.operation==='compare'){if(w.branches.length!==2)return reject('conflict: load both branches first');return {...this.view(w),comparison:reconcile(w.revisions.find(r=>r.revisionId===conflict.baseRevisionId).content,...w.branches.map(r=>r.content))};}
 if(input.operation==='export'){
 if(input.fault==='export')return reject('export: simulated export failure');if(!old.renderedMessage)return reject('export: save a valid draft first');return {...this.view(w),exportText:JSON.stringify(this.export(w),null,2)+'\n'};}
 if(input.baseRevisionId!==old.currentRevisionId)return reject('revision: saved content changed; review both versions');
 if(input.operation==='notice'){if(input.actorId!=='ACT-06')return reject('actorId: role is not permitted');if(!['supersession','cancellation','expiry'].includes(input.kind)||!input.text?.trim())return reject('notice: select lifecycle notice and enter reason');w.notices.push({kind:input.kind,reason:input.text,actorId:input.actorId,timestamp:new Date().toISOString(),revisionId:old.currentRevisionId});await this.commit(id,w);return this.view(w);}
 if(input.operation==='linked'){
 if(input.actorId!=='ACT-01')return reject('actorId: role is not permitted');
 const p=parse(input.message);if(p.validationErrors.length)return reject(p.validationErrors[0]);const c=p.parsedFields,prior=w.revisions.find(r=>r.revisionId===old.currentRevisionId)?.content;
 if(old.status!=='RELEASED'||!prior||c.relatedReportId!==w.reportId||c.familyId!==prior.familyId||c.equipmentId!==prior.equipmentId||c.jsn!==prior.jsn||c.reportId===w.reportId||c.reportType==='INITIAL'||w.reports[c.reportId])return reject('link: requires released predecessor and matching family/equipment/JSN with new report ID');
 const reports={...w.reports,[w.reportId]:{...w,reports:{}}};w={...this.empty(),reportId:c.reportId,reports};await this.commit(id,w);return this.view(w);
 }
 if(input.operation==='resolve'){
 if(input.actorId!=='ACT-01')return reject('actorId: role is not permitted');if(w.branches.length!==2)return reject('conflict: load both branches first');const result=reconcile(w.revisions.at(-1).content,...w.branches.map(r=>r.content));const value=input.choice==='left'?w.branches[0].content.repair:input.choice==='right'?w.branches[1].content.repair:input.value;result.merged.repair=value;const p=parse(render(result.merged));if(p.validationErrors.length)return reject(p.validationErrors[0]);
 const r={...structuredClone(conflict.resolution.revision),content:p.parsedFields,sourceMessage:p.renderedMessage};r.parentRevisionIds=w.branches.map(r=>r.revisionId);w.resolutionBase=old.currentRevisionId;w.resolutionId=r.revisionId;dag([...w.revisions,...w.branches,r]);w.revisions.push(...w.branches,r);w.branches=[];
 const cmd=this.command(w,'save',input.actorId,r.revisionId,r.changeReason);const normalized={...w,revisions:w.revisions.filter(x=>!['REV-001-C','REV-001-D'].includes(x.revisionId)).map(x=>x.revisionId===r.revisionId?{...x,parentRevisionIds:[w.resolutionBase]}:x),commands:[...w.commands,cmd]};const s=workflow(normalized);if(s.errors.length)return reject(s.errors[0]);this.apply(w,cmd);await this.commit(id,w);return this.view(w);
 }
 if(input.operation!=='command')return reject('action: unsupported');
 if(w.branches.length)return reject('conflict: compare and resolve both branches before review');
 if(input.fault==='save'&&input.action==='save')return reject('save: simulated storage failure');
 let revisionId=old.currentRevisionId;
 if(input.action==='save'){
 const p=computeCore({action:'parse',message:input.message});if(p.error||p.validationErrors.length)return reject(p.error||p.validationErrors[0]);
 revisionId=`REV-${w.reportId.slice(-3)}-${String.fromCharCode(65+w.revisions.length)}`;
 const fixture=sample.revisions.find(r=>r.revisionId===revisionId);
 const r={revisionId,reportId:w.reportId,parentRevisionIds:old.currentRevisionId==='NONE'?[]:[old.currentRevisionId],content:p.parsedFields,sourceMessage:input.message,actorId:input.actorId,timestamp:fixture?.timestamp||new Date().toISOString().replace(/\.\d+Z$/,'Z'),changeReason:fixture?.changeReason||input.text||'Revised draft'};
 w.revisions.push(r);
 }
 const cmd=this.command(w,input.action,input.actorId,revisionId,input.text);const candidate=structuredClone(w);candidate.commands.push(cmd);const s=this.state(candidate);
 if(s.errors.length){if(input.action==='save')w.revisions.pop();return reject(s.errors[0]);}
 this.apply(w,cmd);await this.commit(id,w);return this.view(w);
 }
 command(w,action,actorId,revisionId,text){const f=sample.events[w.commands.length];const use=f?.action===action&&f.actorId===actorId&&f.revisionId===revisionId;return {eventId:`EV-${w.reportId.slice(-3)}-${String(w.commands.length+1).padStart(2,'0')}`,actorId,timestamp:use?f.timestamp:new Date().toISOString().replace(/\.\d+Z$/,'Z'),revisionId,action,text:['comment','return'].includes(action)?text||'':use?f.text:text||''};}
 apply(w,cmd){const prior=this.state(w);w.commands.push(Object.fromEntries(['eventId','actorId','timestamp','revisionId','action','text'].map(k=>[k,cmd[k]])));const s=this.state(w);w.events.push({eventId:cmd.eventId,actorId:cmd.actorId,role:roles[Number(cmd.actorId.slice(-1))-1],timestamp:cmd.timestamp,reportId:w.reportId,revisionId:cmd.revisionId,action:cmd.action,text:cmd.text,priorStatus:prior.status,newStatus:s.status,currentHolder:s.holder,approvalValid:s.validApprovalEventIds.includes(cmd.eventId),routeVersion:'synthetic-route-1',ruleVersion:'synthetic-casrep-1'});for(const e of w.events)e.approvalValid=s.validApprovalEventIds.includes(e.eventId);if(['approve','approveForward'].includes(cmd.action))w.decisions.push({actorId:cmd.actorId,decision:cmd.action,revisionId:cmd.revisionId,digest:createHash('sha256').update(s.renderedMessage).digest('hex'),timestamp:cmd.timestamp});}
 export(w){const s=this.state(w);return {classification:'synthetic',provenance:marking,routeId:'ROUTE-LANTERN',routeVersion:'synthetic-route-1',ruleVersion:'synthetic-casrep-1',reportId:w.reportId,releasedRevisionId:s.currentRevisionId,status:s.status,currentHolder:s.holder,message:s.renderedMessage,revisions:w.revisions,events:w.events,validApprovalEventIds:s.validApprovalEventIds};}
}
export const workspaceStore=new Store();
