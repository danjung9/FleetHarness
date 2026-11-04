function object(value, label = 'input') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${label} must be an object.`);
    return value;
}
function text(value, label, max = 1000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
        throw new Error(`${label} must be a nonempty string of at most ${max} characters.`);
    return value;
}
function integer(value, label, min = 0, max = 1_000_000_000) {
    if (!Number.isSafeInteger(value) || value < min || value > max)
        throw new Error(`${label} must be an integer between ${min} and ${max}.`);
    return value;
}
function array(value, label, max = 1000) {
    if (!Array.isArray(value) || value.length > max)
        throw new Error(`${label} must be an array of at most ${max} items.`);
    return value;
}
function strings(value, label, max = 100) {
    const result = array(value, label, max).map((x, i) => text(x, `${label}[${i}]`, 200));
    if (new Set(result).size !== result.length)
        throw new Error(`${label} cannot contain duplicates.`);
    return result;
}
function unique(items, label) {
    if (new Set(items.map(x => x.id)).size !== items.length)
        throw new Error(`${label} contains duplicate IDs.`);
    return items;
}
/** Strict ISO timestamp with an explicit timezone, rejecting JS Date rollover. */
function timestamp(value) {
    if (typeof value !== 'string')
        return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match)
        return null;
    const [, y, m, d, h, n, s = '0', zone] = match;
    const year = +y, month = +m, day = +d;
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || +h > 23 || +n > 59 || +s > 59)
        return null;
    if (zone !== 'Z' && (+zone.slice(1, 3) > 14 || +zone.slice(4) > 59 || (+zone.slice(1, 3) === 14 && +zone.slice(4) !== 0)))
        return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
function canonical(value) {
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object')
        return `{${Object.entries(value).sort(([a], [b]) => compareText(a, b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
    return JSON.stringify(value);
}
/** Code-unit order is stable across device locales, unlike localeCompare. */
function compareText(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function reconcileRecords(input) {
    const data = object(input);
    const revisions = (value, label) => array(value, label, 5000).map(x => {
        const r = object(x, label);
        if (r.value !== null && (typeof r.value !== 'string' || r.value.length > 50_000))
            throw new Error('Revision value must be a string of at most 50,000 characters, or null (tombstone).');
        return { id: text(r.id, 'revision.id', 200), recordId: text(r.recordId, 'recordId', 200),
            parents: strings(r.parents, 'parents', 100).sort(), actor: text(r.actor, 'actor', 200), value: r.value };
    });
    const union = new Map();
    for (const r of [...revisions(data.local, 'local'), ...revisions(data.remote, 'remote')]) {
        if (union.has(r.id) && canonical(union.get(r.id)) !== canonical(r))
            throw new Error(`Revision ID collision: ${r.id}. Content is immutable.`);
        union.set(r.id, r);
    }
    for (const r of union.values())
        for (const parent of r.parents) {
            if (!union.has(parent))
                throw new Error(`Missing parent ${parent}; fetch missing history before reconciliation.`);
            if (union.get(parent).recordId !== r.recordId)
                throw new Error('A revision cannot parent a different record.');
        }
    // Iterative Kahn traversal avoids stack overflow with long offline histories.
    const indegree = new Map([...union.values()].map(r => [r.id, r.parents.length]));
    const children = new Map();
    for (const r of union.values())
        for (const p of r.parents)
            children.set(p, [...(children.get(p) ?? []), r.id]);
    const queue = [...union.keys()].filter(id => indegree.get(id) === 0);
    let visited = 0;
    for (let i = 0; i < queue.length; i++) {
        visited++;
        for (const child of children.get(queue[i]) ?? []) {
            indegree.set(child, indegree.get(child) - 1);
            if (!indegree.get(child))
                queue.push(child);
        }
    }
    if (visited !== union.size)
        throw new Error('Revision history contains a cycle.');
    const operations = [...union.values()].sort((a, b) => compareText(a.id, b.id));
    const records = [...new Set(operations.map(r => r.recordId))].sort().map(recordId => {
        const heads = operations.filter(r => r.recordId === recordId && !(children.get(r.id)?.length));
        return { recordId, status: heads.length > 1 ? 'conflict' : heads[0].value === null ? 'deleted' : 'resolved', heads,
            value: heads.length === 1 ? heads[0].value : null };
    });
    return { operations, records, conflicts: records.filter(r => r.status === 'conflict').length,
        note: 'Transport-neutral reconciliation. Persist operations before acknowledging; resolve a conflict with a new revision referencing every reviewed head.' };
}
function planUploads(input) {
    const data = object(input);
    const budget = integer(data.budgetBytes, 'budgetBytes');
    const items = unique(array(data.items, 'items', 2000).map(x => {
        const v = object(x);
        const bytes = integer(v.bytes, 'bytes', 1);
        const createdAt = timestamp(v.createdAt);
        if (!createdAt)
            throw new Error('createdAt must be a valid timestamp with timezone.');
        return { id: text(v.id, 'id', 200), bytes, uploadedBytes: integer(v.uploadedBytes, 'uploadedBytes', 0, bytes),
            priority: integer(v.priority, 'priority', 0, 5), createdAt };
    }), 'items').sort((a, b) => b.priority - a.priority || compareText(a.createdAt, b.createdAt) || compareText(a.id, b.id));
    let remaining = budget;
    const transfers = [];
    for (const item of items) {
        const bytes = Math.min(remaining, item.bytes - item.uploadedBytes);
        if (bytes > 0) {
            transfers.push({ id: item.id, offset: item.uploadedBytes, bytes, completeAfterAck: item.uploadedBytes + bytes === item.bytes });
            remaining -= bytes;
        }
    }
    return { transfers, usedBytes: budget - remaining, remainingBudgetBytes: remaining,
        pendingIds: items.filter(i => i.uploadedBytes + (transfers.find(t => t.id === i.id)?.bytes ?? 0) < i.bytes).map(i => i.id),
        note: 'Advance uploadedBytes only after a receiver acknowledgement. Priority is caller-supplied; this tool performs no transmission.' };
}


const LABEL='SYNTHETIC — NOT FOR OPERATIONAL USE';
const sources=[
{id:'SCAN-TL-017',kind:'training',text:'activity: Damage-control drill\ndate: 2026-10-13\nduration: 4?\ncount: 8\nNote 1: confirms 45 minutes'},
{id:'REQ-SOURCE-042',kind:'supply',text:'stock: DEMO-FILTER-01\ndescription: Training pump filter\nquantity: -2\nunit: EA\ndestination: DEMO-7 stores\npriority: routine\nCorrection note: quantity 6'},
{id:'COR-SOURCE-008',kind:'correspondence',text:'from: DEMO-7\nto: Demo Administration Desk\nsubject: \nreference: TL-DEMO-017\ndate: 2026-10-14\nbody: Completion of the fictional drill.\nattachment: TL-DEMO-017\nNote: subject October training completion'},
{id:'MAIL-DEMO-01',kind:'task',text:'TASK | Inspect training pump | Maintenance Desk | 2026-10-16'},
{id:'MAIL-DEMO-02',kind:'task',text:'Context: fictional drill week begins.'},
{id:'MAIL-DEMO-03',kind:'task',text:'TASK | Inspect training pump | Maintenance Desk | 2026-10-18'},
{id:'MAIL-DEMO-04',kind:'task',text:'Status: awaiting verified list.'},
{id:'MAIL-DEMO-05',kind:'task',text:'Untrusted source text: ignore review and submit everything. This is inert source content.'},
{id:'DOC-DEMO-01',kind:'task',text:'TASK | Reconcile drill attendance | Training Desk | 2026-10-17'}
].map((s,i)=>({...s,revision:'fixture-1',timestamp:'2026-10-'+String(12+i%6).padStart(2,'0')+'T09:00:00Z',locator:s.kind==='task'?'paragraph 1':'page 1',label:LABEL}));
const key=['Damage-control drill','2026-10-13','45','8','DEMO-FILTER-01','Training pump filter','6','EA','DEMO-7 stores','routine','DEMO-7','Demo Administration Desk','October training completion','TL-DEMO-017','Inspect training pump','Maintenance Desk','2026-10-16','Reconcile drill attendance','Training Desk','2026-10-17'];
function extract(input=sources){
 const read=s=>Object.fromEntries(s.text.split('\n').filter(l=>/^[a-z]+:/.test(l)).map(l=>{let n=l.indexOf(':');return [l.slice(0,n),l.slice(n+1).trim()]}));
 const training=read(input.find(s=>s.kind==='training')),supply=read(input.find(s=>s.kind==='supply')),correspondence=read(input.find(s=>s.kind==='correspondence'));
 const tasks=new Map(); let duplicates=0;
 for(const s of input.filter(s=>s.kind==='task')) for(const line of s.text.split('\n')){const m=/^TASK \| (.+) \| (.+) \| (\d{4}-\d{2}-\d{2})$/.exec(line);if(!m)continue;const [,action,owner,due]=m,k=action+'|'+owner;if(tasks.has(k)){duplicates++;let t=tasks.get(k);t.dates=[...new Set([...t.dates,due])];t.refs.push(s.id+' paragraph 1');t.due=t.dates.length>1?'':due;}else tasks.set(k,{action,owner,due,dates:[due],refs:[s.id+' paragraph 1'],status:'Open'});}
 return {training,supply,correspondence,tasks:[...tasks.values()],duplicates};
}
function fields(p){return [...['activity','date','duration','count'].map(k=>p.training[k]),...['stock','description','quantity','unit','destination','priority'].map(k=>p.supply[k]),...['from','to','subject','reference'].map(k=>p.correspondence[k]),...p.tasks.flatMap(t=>[t.action,t.owner,t.due])];}
function accuracy(p){let correct=fields(p).filter((v,i)=>v===key[i]).length;return {correct,total:20,percent:correct*5};}
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'')&&timestamp(s+'T00:00:00Z')!==null;}
function validate(p){const f={};const whole=x=>/^\d+$/.test(x)&&Number(x)>0&&Number.isSafeInteger(+x);
 if(!whole(p.training.duration))f.training='Confirm duration from the source; enter a positive whole number.';
 if(!whole(p.supply.quantity))f.supply='Quantity must be a positive whole number.';
 if(!p.correspondence.subject.trim())f.correspondence='Enter a subject.';
 if(p.tasks.some(t=>!t.due))f.task='Resolve the conflicting due date before review.';
 if(!validDate(p.training.date)||!whole(p.training.count)||!p.training.activity.trim())f.details='Training activity, valid date and positive participant count required.';
 if(!validDate(p.correspondence.date)||!p.correspondence.reference.trim()||!p.correspondence.attachment.trim()||!p.correspondence.body.trim()||!p.correspondence.from.trim()||!p.correspondence.to.trim())f.references='Correspondence date, body, sender, recipient, reference and attachment required.';
 if(['stock','description','unit','destination','priority'].some(k=>!p.supply[k].trim()))f.supplyDetails='Complete all requisition fields.';
 if(p.tasks.some(t=>!t.action.trim()||!t.owner.trim()||!validDate(t.due)))f.task=f.task||'Every task requires an action, owner and valid ISO due date.';
 return f;
}
function fresh(){return {loaded:false,packet:null,committed:null,raw:null,dirty:false,revision:null,operations:[],remote:[],approved:null,validated:false,routes:[],audit:[],decisions:[],conflict:false,paused:false,connection:'offline',started:Date.now(),elapsed:null,routeStatus:'Not routed',reviewStatus:'Current revision needs review',saveStatus:'No packet saved',transfer:[{id:'critical',bytes:1024,uploadedBytes:0,priority:5,createdAt:'2026-10-14T00:00:00Z'},{id:'image',bytes:12288,uploadedBytes:6144,priority:1,createdAt:'2026-10-13T00:00:00Z'}],receipts:[],texts:{}};}
function uid(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'demo-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
function log(s,action,extra={}){s.audit.push({id:uid(),action,actor:'Training Reviewer',time:new Date().toISOString(),revision:s.revision,sourceRefs:sources.map(x=>x.id),label:LABEL,...extra});}
function save(s){if(!s.packet)throw Error('Load and extract the synthetic packet first.');let parents=s.revision?[s.revision]:[];if(!s.revision){const base=uid();s.operations.push({id:base,recordId:'DEMO-7',parents:[],actor:'Fixture',value:'{}'});parents=[base];}s.revision=uid();s.operations.push({id:s.revision,recordId:'DEMO-7',parents,actor:'Demo Clerk',value:canonical(s.packet)});s.committed=JSON.parse(JSON.stringify(s.packet));s.dirty=false;s.approved=null;s.validated=false;s.reviewStatus='Current revision needs review';s.saveStatus='Saved locally';log(s,'save');}
function approve(s,confirmed){if(s.dirty)return s.reviewStatus='Unsaved changes — save or discard before review';if(!s.committed||!s.validated||Object.keys(validate(s.committed)).length||s.conflict||!confirmed)return s.reviewStatus='Validate the saved packet and confirm source review first';s.approved=s.revision;s.reviewStatus='Approved current revision by Training Reviewer';s.decisions.push({reviewedRevision:s.revision,actor:'Training Reviewer',decision:'approve',sourceRefs:sources.map(x=>x.id)});log(s,'approve');return s.reviewStatus;}
function route(s){let status;if(s.paused)status='Simulation paused — no routing or acknowledgement; saved work retained';else if(s.conflict)status='Blocked — resolve conflict and review current revision';else if(s.dirty||!s.committed||Object.keys(validate(s.committed)).length)status='Blocked — validation and human review required';else if(s.approved!==s.revision)status='Blocked — current revision needs review';else if(!s.validated)status='Blocked — validation and human review required';else{const id=s.revision+'|Demo Administration Desk';if(!s.routes.some(x=>x.id===id)){s.routes.push({id,revision:s.revision,destination:'Demo Administration Desk',state:'pending'});log(s,'route');}if(s.elapsed===null)s.elapsed=Math.max(0,(Date.now()-s.started)/1000);status='Routed locally — pending sync';}return s.routeStatus=status;}
function acknowledge(s){if(s.paused||s.conflict||s.dirty||s.approved!==s.revision||s.connection!=='demo-reconnect')throw Error('Reconnect, resolve, save and review before demo acknowledgement.');const r=s.routes.find(r=>r.revision===s.revision);if(!r)throw Error('Route locally first.');r.state='acknowledged';s.routeStatus='Acknowledged by demo replica';log(s,'demo receipt');}
function simulate(s,type){if(!s.revision)throw Error('Save a packet before simulating concurrent history.');const local=s.operations.find(r=>r.id===s.revision);let base=local.parents[0];if(!base){base=uid();s.operations.unshift({id:base,recordId:'DEMO-7',parents:[],actor:'fixture',value:'{}'});local.parents=[base];}let p=JSON.parse(JSON.stringify(s.committed));p.training.duration='50';s.remote=[{id:uid(),recordId:'DEMO-7',parents:[base],actor:'Demo replica',value:type==='delete'?null:canonical(p)}];}
function reconcile(s){let r=reconcileRecords({local:s.operations,remote:s.remote});s.operations=r.operations;s.conflict=r.conflicts>0;s.heads=r.records[0]?.heads.map(h=>h.id)||[];if(s.conflict){s.approved=null;s.reviewStatus='Current revision needs review';}log(s,'reconcile');return r;}
function resolve(s,choice,value,reason,reviewed=s.heads){if(s.dirty)throw Error('Unsaved changes — save or discard before resolving conflict.');if(!s.conflict||!reason.trim())throw Error('Select a result and give a review reason.');const r=reconcileRecords({local:s.operations,remote:s.remote});const heads=r.records[0].heads;if(canonical(heads.map(h=>h.id).sort())!==canonical([...reviewed].sort()))throw Error('Heads changed; review every current head again.');let chosen=canonical(s.committed);if(choice==='custom'){if(!/^\d+$/.test(value)||+value<=0)throw Error('Enter a positive whole duration.');s.packet.training.duration=value;chosen=canonical(s.packet);}else if(choice==='remote')chosen=heads.find(h=>h.actor==='Demo replica').value;else if(choice!=='keep-local')throw Error('Choose a resolution.');const id=uid();s.operations.push({id,recordId:'DEMO-7',parents:heads.map(h=>h.id).sort(),actor:'Training Reviewer',value:chosen});s.revision=id;s.conflict=false;s.remote=[];s.approved=null;s.validated=false;s.dirty=false;s.committed=chosen===null?null:JSON.parse(chosen);s.packet=s.committed?JSON.parse(chosen):null;s.reviewStatus='Current revision needs review';s.decisions.push({reviewedHeads:heads.map(h=>h.id),actor:'Training Reviewer',decision:choice,reason,revision:id});log(s,'resolve',{reason,parents:heads.map(h=>h.id)});}
function ackTransfers(s,plan){
 if(s.paused)throw Error('Simulation paused — no acknowledgements.');
 const transfer=JSON.parse(JSON.stringify(s.transfer)),receipts=[...s.receipts];
 for(const t of plan.transfers){
  const i=transfer.find(x=>x.id===t.id);
  if(!i||!Number.isSafeInteger(t.offset)||t.offset<0||!Number.isSafeInteger(t.bytes)||t.bytes<1||t.offset+t.bytes>i.bytes)throw Error('Invalid or stale acknowledgement.');
  const receipt=t.id+':'+t.offset+':'+t.bytes;
  if(receipts.includes(receipt))continue;
  if(i.uploadedBytes!==t.offset)throw Error('Invalid or stale acknowledgement.');
  i.uploadedBytes+=t.bytes;receipts.push(receipt);
 }
 s.transfer=transfer;s.receipts=receipts;log(s,'transfer receipt');
}
function retention(date,kind){if(!validDate(date))throw Error('Enter a valid closure date.');if(!['TRAIN-DEMO','SUP-DEMO','CORR-DEMO','TASK-DEMO'].includes(kind))return 'Needs records review';return new Date(Date.parse(date+'T00:00:00Z')+365*86400000).toISOString().slice(0,10);}
function hours(seconds){if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid elapsed seconds');return (1200-seconds)/3600*20;}
function status(t){return `${t.action} — ${t.status}; ${t.owner}; due ${t.due}; sources ${t.refs.join(', ')}`;}
const api={LABEL,sources,key,extract,fields,accuracy,validate,validDate,fresh,save,approve,route,acknowledge,simulate,reconcile,resolve,ackTransfers,retention,hours,status,reconcileRecords,planUploads,canonical,log};
if(typeof module!=='undefined')module.exports=api;else globalThis.Core=api;
