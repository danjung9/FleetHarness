(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const idOK=x=>typeof x==='string'&&/^[a-zA-Z][a-zA-Z0-9-]{0,79}$/.test(x);
const policy={version:'demo-v1',modifiers:{cruising:{repair:0,sensing:0},'general-quarters':{repair:30,sensing:0}},tie:'escalate',leaseSeconds:5};
function agent(id,rank,cls){return {id,displayName:id,class:cls,baseRank:rank,allowedActions:['inspect'],validFrom:0,expiresAt:1000,heartbeatAt:100,contract:{heartbeat:true,intent:true,actionReport:true,halt:true}};}
function auth(id){return {id:'auth-'+id,agentId:id,resourceId:'pump-1',action:'inspect',validFrom:0,expiresAt:200};}
function initial(sessionId='synthetic-session'){return {schemaVersion:1,sessionId,now:100,revision:0,halted:false,condition:'cruising',policy:clone(policy),promotion:0,agents:[agent('sensor',60,'sensing'),agent('repair',40,'repair')],authorizationLeases:[auth('sensor'),auth('repair')],resourceLeases:[],intents:[],decisions:[],actionReports:[],haltAcknowledgements:[],audit:[],drafts:{promotion:'0',condition:'cruising'},batchId:'batch-1',batchSequence:1,selectedAgent:'repair',intentResult:'None',executionResult:'None',currentDecision:null};}
function score(s,a){return a.baseRank+s.policy.modifiers[s.condition][a.class]+(a.id==='repair'?s.promotion:0);}
function eligibility(s,id,resource='pump-1',action='inspect'){
 if(s.halted)return 'operator halt is active.';
 if(!integer(s.now)||!idOK(id)||resource!=='pump-1'||action!=='inspect')return 'malformed intent or telemetry.';
 const a=s.agents.find(a=>a.id===id);if(!a)return `agent ${id} is not registered.`;
 if(!integer(a.validFrom)||!integer(a.expiresAt)||a.validFrom>s.now||s.now>=a.expiresAt)return `${id} manifest is invalid or expired.`;
 if(!a.contract||!['heartbeat','intent','actionReport','halt'].every(k=>a.contract[k]===true)||!Array.isArray(a.allowedActions)||!a.allowedActions.includes(action))return `${id} manifest contract or action is invalid.`;
 const l=s.authorizationLeases.find(l=>l.agentId===id&&l.resourceId===resource&&l.action===action);
 if(!l||!integer(l.validFrom)||!integer(l.expiresAt)||s.now<l.validFrom)return `${id} authorization lease is invalid.`;
 if(s.now>=l.expiresAt)return `${id} authorization lease expired at t=${l.expiresAt}.`;
 if(!integer(a.heartbeatAt)||a.heartbeatAt>s.now)return `${id} heartbeat telemetry is malformed.`;
 if(s.now-a.heartbeatAt>10)return `${id} heartbeat is stale at t=${s.now}.`;
 return null;
}
function validate(s){
 const fail=()=>{throw Error('Invalid local snapshot. Discard it to start a new session.');};
 if(!s||s.schemaVersion!==1||typeof s.sessionId!=='string'||!integer(s.now)||!integer(s.revision)||typeof s.halted!=='boolean'||!['cruising','general-quarters'].includes(s.condition)||!integer(s.promotion)||s.promotion>100||JSON.stringify(s.policy)!==JSON.stringify(policy))fail();
 for(const k of ['agents','authorizationLeases','resourceLeases','intents','decisions','actionReports','haltAcknowledgements','audit'])if(!Array.isArray(s[k]))fail();
 for(const k of ['agents','authorizationLeases','resourceLeases','intents','decisions','actionReports'])if(new Set(s[k].map(x=>x.id)).size!==s[k].length||s[k].some(x=>!idOK(x.id)))fail();
 if(!idOK(s.selectedAgent)||typeof s.intentResult!=='string'||typeof s.executionResult!=='string')fail();
 if(!s.drafts||typeof s.drafts.promotion!=='string'||!['cruising','general-quarters'].includes(s.drafts.condition)||!integer(s.batchSequence)||s.batchId!=='batch-'+s.batchSequence)fail();
 for(const a of s.agents)if(!['repair','sensing'].includes(a.class)||!integer(a.baseRank)||typeof a.displayName!=='string'||!a.displayName.length||a.displayName.length>100||!integer(a.heartbeatAt)||!integer(a.validFrom)||!integer(a.expiresAt)||!a.contract||!Array.isArray(a.allowedActions))fail();
 for(const a of s.authorizationLeases)if(!s.agents.some(x=>x.id===a.agentId)||a.resourceId!=='pump-1'||a.action!=='inspect'||!integer(a.validFrom)||!integer(a.expiresAt))fail();
 for(const i of s.intents)if(!['pending','rejected','granted','denied','canceled','completed'].includes(i.status)||i.resourceId!=='pump-1'||i.action!=='inspect'||!integer(i.announcedAt)||(!s.agents.some(a=>a.id===i.agentId)&&i.status!=='rejected'))fail();
 const active=s.resourceLeases.filter(l=>l.status==='active');if(active.length>1||s.halted&&active.length)fail();
 for(const l of s.resourceLeases)if(!integer(l.issuedAt)||!integer(l.expiresAt)||!s.intents.some(i=>i.id===l.intentId&&i.agentId===l.holder)||!['active','released','revoked'].includes(l.status))fail();
 if(new Set(s.actionReports.map(r=>r.intentId)).size!==s.actionReports.length)fail();
 for(const r of s.actionReports)if(!s.intents.some(i=>i.id===r.intentId&&i.status==='completed'&&i.agentId===r.agentId)||!s.decisions.some(d=>d.id===r.decisionId))fail();
 if(s.intents.filter(i=>i.status==='completed').length!==s.actionReports.length)fail();
 for(const d of s.decisions)if(!Array.isArray(d.candidates)||!integer(d.time)||!['cruising','general-quarters'].includes(d.condition)||d.leaseId&&!s.resourceLeases.some(l=>l.id===d.leaseId))fail();
 for(const l of active)if(!s.intents.some(i=>i.id===l.intentId&&i.status==='granted')||!s.decisions.some(d=>d.leaseId===l.id&&d.winner===l.holder&&!d.obsolete))fail();
 for(const a of s.haltAcknowledgements)if(!s.agents.some(x=>x.id===a.agentId)||a.status!=='acknowledged'||!integer(a.time))fail();
 if(new Set(s.haltAcknowledgements.map(a=>a.agentId)).size!==s.haltAcknowledgements.length)fail();
 // Restored receipts must link the same intent, resource, batch and authority snapshot.
 for(const l of s.resourceLeases){
  const i=s.intents.find(i=>i.id===l.intentId),d=s.decisions.find(d=>d.leaseId===l.id);
  if(!i||!d||l.resourceId!==i.resourceId||l.batchId!==i.batchId||d.batchId!==i.batchId||d.winner!==l.holder||l.issuedAt!==d.time||l.expiresAt!==l.issuedAt+policy.leaseSeconds)fail();
 }
 for(const d of s.decisions){
  if(d.sessionId!==s.sessionId||d.policyVersion!==policy.version||!integer(d.promotion)||d.promotion>100||!integer(d.revision)||d.revision>s.revision||typeof d.obsolete!=='boolean'||typeof d.reason!=='string')fail();
  if(new Set(d.candidates.map(c=>c.intentId)).size!==d.candidates.length)fail();
  for(const c of d.candidates){
   const i=s.intents.find(i=>i.id===c.intentId);
   if(!i||i.agentId!==c.agentId||i.batchId!==d.batchId)fail();
   if(c.eligibility===null){
    const a=c.manifest;
    if(!a||a.id!==c.agentId||!integer(a.baseRank)||!['repair','sensing'].includes(a.class)||!c.authorization||c.authorization.agentId!==a.id||c.score!==a.baseRank+policy.modifiers[d.condition][a.class]+(a.id==='repair'?d.promotion:0))fail();
   }else if(typeof c.eligibility!=='string'||!c.eligibility||c.score!==null)fail();
  }
  if(d.winner!==null&&!d.candidates.some(c=>c.agentId===d.winner&&c.eligibility===null))fail();
 }
 for(const r of s.actionReports){
  const i=s.intents.find(i=>i.id===r.intentId),d=s.decisions.find(d=>d.id===r.decisionId),l=d&&s.resourceLeases.find(l=>l.id===d.leaseId);
  if(!l||l.intentId!==i.id||d.winner!==r.agentId||r.resourceId!==i.resourceId||r.action!==i.action||r.result!=='completed'||!integer(r.time)||r.time<l.issuedAt||r.time>=l.expiresAt||l.status!=='released')fail();
 }
 if(s.currentDecision&&!s.decisions.some(d=>d.id===s.currentDecision))fail();
 if(s.halted&&(s.intents.some(i=>['pending','granted'].includes(i.status))||s.haltAcknowledgements.length!==s.agents.length))fail();
 return s;
}
function clear(s){s.intents.forEach(i=>{if(['pending','granted','denied'].includes(i.status))i.status='canceled';});s.resourceLeases.forEach(l=>{if(l.status==='active')l.status='released';});s.currentDecision=null;s.batchSequence++;s.batchId='batch-'+s.batchSequence;}
function invalidate(s){s.resourceLeases.forEach(l=>{if(l.status==='active')l.status='released';});s.intents.forEach(i=>{if(['granted','denied'].includes(i.status))i.status='pending';});s.decisions.forEach(d=>{if(!s.actionReports.some(r=>r.decisionId===d.id))d.obsolete=true;});}
function announce(s,id,intentId){
 const error=eligibility(s,id);const iid=intentId||'intent-'+(s.intents.length+1);
 if(!idOK(iid)||s.intents.some(i=>i.id===iid)){s.intentResult='Rejected: duplicate or invalid intent ID.';return;}
 s.intents.push({id:iid,batchId:s.batchId,agentId:id,resourceId:'pump-1',action:'inspect',announcedAt:s.now,status:error?'rejected':'pending',reason:error});
 s.intentResult=error?'Rejected: '+error:`Pending: ${id} requests pump-1.`;
}
function transition(input,event){
 validate(input);const s=clone(input);if(!event||typeof event.type!=='string')throw Error('Choose a valid action.');
 if(s.halted&&!['halt','announce','execute','draft'].includes(event.type))throw Error('Operator halt is active. Start a confirmed new session to continue.');
 if(event.type==='draft'){if(event.field==='promotion')s.drafts.promotion=String(event.value);else if(event.field==='condition'&&['cruising','general-quarters'].includes(event.value))s.drafts.condition=event.value;else throw Error('Invalid draft.');return s;}
 switch(event.type){
 case 'announce':announce(s,event.agentId||s.selectedAgent,event.id);break;
 case 'queue':clear(s);for(const id of event.order==='repair-first'?['repair','sensor']:['sensor','repair'])announce(s,id);break;
 case 'clear':clear(s);break;
 case 'scenario':{
 if(!['missing','expired','stale'].includes(event.value))throw Error('Choose a synthetic scenario.');
 clear(s);s.now=100;let a=s.agents.find(a=>a.id==='repair');Object.assign(a,agent('repair',40,'repair'));Object.assign(s.authorizationLeases.find(a=>a.agentId==='repair'),auth('repair'));s.selectedAgent=event.value==='missing'?'ghost':'repair';
 if(event.value==='missing'){s.agents=s.agents.filter(a=>a.id!=='ghost');s.authorizationLeases=s.authorizationLeases.filter(a=>a.agentId!=='ghost');if(s.intents.some(i=>i.agentId==='ghost'&&i.status!=='rejected')){s.agents.push(agent('ghost',20,'repair'));s.authorizationLeases.push(auth('ghost'));throw Error('Ghost already registered in this session; use a new session for the missing scenario.');}}
 if(event.value==='expired')s.authorizationLeases.find(a=>a.agentId==='repair').expiresAt=100;
 if(event.value==='stale')a.heartbeatAt=89;s.intentResult='Scenario loaded. Announce a fresh intent.';break;}
 case 'repair':{const id=s.selectedAgent;let a=s.agents.find(a=>a.id===id);if(!a){a=agent(id,20,'repair');s.agents.push(a);s.authorizationLeases.push(auth(id));}a.validFrom=0;a.expiresAt=1000;a.heartbeatAt=s.now;const l=s.authorizationLeases.find(l=>l.agentId===id);l.validFrom=0;l.expiresAt=s.now+100;s.intentResult='Eligibility repaired. Announce a fresh intent.';break;}
 case 'promotion':{const v=event.value;if(String(v).trim()===''||!integer(Number(v))||Number(v)>100)throw Error('Enter a whole repair promotion from 0 to 100.');s.promotion=Number(v);s.drafts.promotion=String(s.promotion);invalidate(s);break;}
 case 'condition':if(!['cruising','general-quarters'].includes(event.value))throw Error('Choose a valid condition.');s.condition=event.value;s.drafts.condition=s.condition;invalidate(s);break;
 case 'discard':s.drafts={promotion:String(s.promotion),condition:s.condition};break;
 case 'advance':if(!integer(event.seconds)||event.seconds<1)throw Error('Enter positive whole seconds.');s.now+=event.seconds;break;
 case 'resolve':{
 if(s.drafts.promotion!==String(s.promotion)||s.drafts.condition!==s.condition)throw Error('Save or discard policy drafts before resolving.');
 s.resourceLeases.forEach(l=>{if(l.batchId===s.batchId&&l.status==='active')l.status='released';});
 const list=s.intents.filter(i=>i.batchId===s.batchId&&['pending','granted','denied'].includes(i.status));
 const candidates=list.map(i=>{const a=s.agents.find(a=>a.id===i.agentId),error=eligibility(s,i.agentId);i.status=error?'rejected':'pending';i.reason=error;return {intentId:i.id,agentId:i.agentId,eligibility:error,score:error?null:score(s,a),manifest:clone(a||null),authorization:clone(s.authorizationLeases.find(l=>l.agentId===i.agentId)||null)};});
 const ranked=candidates.filter(c=>!c.eligibility).sort((a,b)=>b.score-a.score||a.agentId.localeCompare(b.agentId));
 const d={id:'decision-'+(s.decisions.length+1),sessionId:s.sessionId,revision:s.revision+1,time:s.now,batchId:s.batchId,policyVersion:s.policy.version,condition:s.condition,promotion:s.promotion,candidates,winner:null,reason:'No eligible pending intents. No lease granted.',leaseId:null,obsolete:false};
 if(s.resourceLeases.some(l=>l.status==='active'&&l.expiresAt>s.now))d.reason='Resource pump-1 is already leased. No lease granted.';
 else if(ranked.length>1&&ranked[0].score===ranked[1].score){const top=ranked.filter(c=>c.score===ranked[0].score);d.reason=`Escalate pump-1: ${top.map(c=>c.agentId+' '+c.score).join(' = ')}. No lease granted.`;}
 else if(ranked.length){const w=ranked[0];d.winner=w.agentId;d.reason=ranked.length>1?`${w.agentId} wins pump-1: ${w.score} > ${ranked[1].score} under demo-v1 / ${s.condition}.`:`${w.agentId} wins pump-1: eligible under demo-v1 / ${s.condition}.`;d.leaseId='lease-'+(s.resourceLeases.length+1);s.resourceLeases.push({id:d.leaseId,holder:w.agentId,resourceId:'pump-1',intentId:w.intentId,batchId:s.batchId,issuedAt:s.now,expiresAt:s.now+5,status:'active'});list.forEach(i=>{if(i.status!=='rejected')i.status=i.id===w.intentId?'granted':'denied';});}
 s.decisions.push(d);s.currentDecision=d.id;break;}
 case 'execute':{
 if(s.halted){s.executionResult='Blocked: operator halt is active.';break;}
 if(s.drafts.promotion!==String(s.promotion)||s.drafts.condition!==s.condition){s.executionResult='Blocked: save or discard policy drafts first.';break;}
 const d=s.decisions.find(d=>d.id===s.currentDecision),l=d&&s.resourceLeases.find(l=>l.id===d.leaseId);
 let error=!d||d.obsolete?'Resolve a current batch first.':!l||l.status!=='active'?'No approved action is available.':s.now>=l.expiresAt?'Resource lease expired.':eligibility(s,l.holder);
 if(!error&&s.actionReports.some(r=>r.intentId===l.intentId))error='Action already completed.';
 if(error){s.executionResult='Blocked: '+error;break;}
 const i=s.intents.find(i=>i.id===l.intentId);i.status='completed';l.status='released';s.actionReports.push({id:'action-'+(s.actionReports.length+1),decisionId:d.id,intentId:i.id,agentId:i.agentId,resourceId:i.resourceId,action:i.action,time:s.now,result:'completed'});s.executionResult='Action completed in simulation.';break;}
 case 'halt':if(!s.halted){s.halted=true;s.intents.forEach(i=>{if(['pending','granted','denied'].includes(i.status))i.status='canceled';});s.resourceLeases.forEach(l=>{if(l.status==='active')l.status='revoked';});s.haltAcknowledgements=s.agents.map(a=>({agentId:a.id,time:s.now,status:'acknowledged'})).sort((a,b)=>a.agentId.localeCompare(b.agentId));}else return s;break;
 default:throw Error('Unknown action.');
 }
 s.revision++;s.audit.push({revision:s.revision,time:s.now,event:event.type,message:s.intentResult,decision:s.currentDecision});return validate(s);
}
function restore(text){return validate(JSON.parse(text));}
const api={initial,transition,eligibility,score,validate,restore};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.GovernanceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
