/* Shared application core: embedded verbatim in index.html. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const sample={activity:'Damage control drill',date:'2026-11-01',durationMinutes:60,unit:'Unit Example',sourceRef:'synthetic-log-v1'};
function validateLog(v){
 if(typeof v.activity!=='string'||!v.activity.trim()||v.activity.trim().length>120) throw Error('Enter an activity from 1 to 120 characters.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!Number.isFinite(Date.parse(v.date+'T00:00:00Z'))||new Date(v.date+'T00:00:00Z').toISOString().slice(0,10)!==v.date) throw Error('Enter a valid date in YYYY-MM-DD format.');
 if(String(v.durationMinutes).trim()===''||!Number.isInteger(Number(v.durationMinutes))||Number(v.durationMinutes)<1||Number(v.durationMinutes)>1440) throw Error('Duration must be a whole number from 1 to 1440 minutes.');
 return true;
}
function canonicalizeLog(v){validateLog(v);return JSON.stringify({activity:v.activity.trim(),date:v.date,durationMinutes:Number(v.durationMinutes),unit:'Unit Example',sourceRef:'synthetic-log-v1'});}
function reconcile(local,remote){
 if(!Array.isArray(local)||!Array.isArray(remote)||local.length+remote.length>5000)throw Error('History limit exceeded (5000 revisions).');
 const m=new Map();
 for(const v of [...local,...remote]){
 if(!v||!['id','recordId','actor'].every(k=>typeof v[k]==='string'&&v[k].length>0&&v[k].length<=200)||!Array.isArray(v.parents)||v.parents.length>100||!v.parents.every(p=>typeof p==='string'&&p)||!(v.value===null||typeof v.value==='string'&&v.value.length<=50000))throw Error('Malformed revision.');
 const r={id:v.id,recordId:v.recordId,parents:[...new Set(v.parents)].sort(),actor:v.actor,value:v.value};
 if(m.has(r.id)&&JSON.stringify(m.get(r.id))!==JSON.stringify(r))throw Error('Revision ID collision: '+r.id);
 m.set(r.id,r);
 }
 for(const r of m.values())for(const p of r.parents){if(!m.has(p))throw Error('Missing parent '+p+'; request missing history and retry.');if(m.get(p).recordId!==r.recordId)throw Error('Cross-record parent.');}
 const seen=new Set(),active=new Set();
 function visit(id){if(active.has(id))throw Error('Revision history contains a cycle.');if(seen.has(id))return;active.add(id);m.get(id).parents.forEach(visit);active.delete(id);seen.add(id);}
 m.forEach(r=>visit(r.id));return [...m.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
function getHeads(rs,recordId='log-example'){const parents=new Set(rs.flatMap(r=>r.parents));return rs.filter(r=>r.recordId===recordId&&!parents.has(r.id));}
function initial(){return {schemaVersion:1,recordId:'log-example',revisions:[],pendingOperations:[],review:null,routeQueue:[],receipts:[],audit:[],draft:null,resolution:null};}
function audit(s,action,revisionId,details){s.audit.push({id:'event-'+(s.audit.length+1),sequence:s.audit.length+1,action,actor:action==='approval'||action==='resolution'?'Reviewer Example':'Local Example',recordId:s.recordId,revisionId,details});}
function current(s){const h=getHeads(s.revisions);return h.length===1?h[0]:null;}
function saved(s){const r=current(s);return r&&r.value!==null?JSON.parse(r.value):null;}
function save(s,v,id){if(getHeads(s.revisions).length>1)throw Error('Resolve the conflict before saving.');const value=canonicalizeLog(v),n=clone(s);const r={id,recordId:s.recordId,parents:getHeads(s.revisions).map(r=>r.id),actor:'Local Example',value};n.revisions=reconcile(s.revisions,[r]);n.pendingOperations.push(id);n.review=null;n.draft=null;audit(n,'save',id,'Saved locally');return n;}
function merge(s,remote){const rs=reconcile(s.revisions,remote),fresh=rs.filter(r=>!s.revisions.some(x=>x.id===r.id));if(!fresh.length)return clone(s);const n=clone(s);n.revisions=rs;n.review=null;fresh.forEach(r=>audit(n,'merge',r.id,'Peer change applied'));return n;}
function resolveHeads(s,choice,id,custom){const heads=getHeads(s.revisions);if(heads.length<2)throw Error('No conflict to resolve.');let chosen;if(choice==='custom')chosen=canonicalizeLog(custom);else{const r=heads.find(r=>choice==='local'?r.actor==='Local Example':r.actor==='Peer Example');if(!r)throw Error('Choose a competing value.');chosen=r.value;}const n=clone(s);n.revisions=reconcile(s.revisions,[{id,recordId:s.recordId,parents:heads.map(r=>r.id),actor:'Reviewer Example',value:chosen}]);n.pendingOperations.push(id);n.review=null;n.draft=null;n.resolution={choice,parents:heads.map(r=>r.id),revisionId:id};audit(n,'resolution',id,choice+' value; all heads retained as parents');return n;}
function gate(s,dirty,task){if(getHeads(s.revisions).length>1)throw Error('Resolve the conflict before '+task+'.');if(dirty)throw Error('Save or discard changes before '+task+'.');const r=current(s);if(!r||r.value===null)throw Error('Save a valid log before '+task+'.');validateLog(JSON.parse(r.value));return r;}
function reviewRevision(s,dirty=false,revisionId){const r=gate(s,dirty,'reviewing');if(revisionId&&r.id!==revisionId)throw Error('Review the current saved revision again.');const n=clone(s);n.review={revisionId:r.id,actor:'Reviewer Example',decision:'approved'};audit(n,'approval',r.id,'Approved saved revision');return n;}
function enqueueRoute(s,dirty=false){const r=gate(s,dirty,'routing');if(s.review?.revisionId!==r.id)throw Error('Review the saved revision before routing.');const n=clone(s);if(!n.routeQueue.includes(r.id)&&!n.receipts.includes(r.id)){n.routeQueue.push(r.id);audit(n,'enqueue',r.id,'Queued for simulated routing');}return n;}
function applySimulatedReceipt(s){const n=clone(s);for(const id of s.routeQueue){if(!n.receipts.includes(id)){n.receipts.push(id);audit(n,'simulated receipt',id,'No external delivery');}}n.routeQueue=[];return n;}
function peer(s,type){const root=s.revisions.find(r=>r.parents.length===0);if(!root)throw Error('Save the synthetic sample before applying a peer change.');const v=JSON.parse(root.value);v.activity='First aid drill';return {id:'peer-'+type+'-'+root.id,recordId:s.recordId,parents:[root.id],actor:'Peer Example',value:type==='delete'?null:canonicalizeLog(v)};}
function compareOrders(){const a=save(initial(),sample,'root');const l={id:'local',recordId:a.recordId,parents:['root'],actor:'Local Example',value:canonicalizeLog({...sample,activity:'Pump drill'})};const p=peer(a,'edit');const x=reconcile(reconcile(a.revisions,[l]),[p]),y=reconcile(reconcile(a.revisions,[p]),[l]);return {a:x,b:y,equal:JSON.stringify(x)===JSON.stringify(y)};}
function summary(v){return v?`${v.activity} | ${v.date} | ${v.durationMinutes} minutes | ${v.unit}`:'No saved log — load the synthetic sample to begin.';}
function commitTransaction(db,value){return new Promise((resolve,reject)=>{let tx;try{tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(clone(value),'state');tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Local transaction aborted.'));}catch(e){reject(e);}});}
async function persist(db,previous,next){await commitTransaction(db,next);return next;}
const api={sample,clone,validateLog,canonicalizeLog,reconcile,getHeads,initial,current,saved,save,merge,resolveHeads,reviewRevision,enqueueRoute,applySimulatedReceipt,peer,compareOrders,summary,commitTransaction,persist,audit};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AppCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
