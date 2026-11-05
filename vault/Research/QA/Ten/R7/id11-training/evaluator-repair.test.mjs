import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {compute,prepareCadence,negotiateWithTrace} from './compute.mjs';
import {start} from './server.mjs';
const data=JSON.parse(fs.readFileSync(new URL('./data/synthetic-data.json',import.meta.url)));
const base=()=>structuredClone(data.records[0]);
function cadence(cadenceMinutes=5040,lastCompletionMinute=0){const record=base();record.drills=record.drills.slice(0,1);record.recurrenceRequirements=record.recurrenceRequirements.slice(0,1);record.fixedDuties=[];record.operationalWindows=[[0,10080]];record.policy.minimumRestMinutes=0;const template=structuredClone(record.drills[0]);template.allowedStartMinutes=[100,5140,8500];template.preferredStartMinute=100;return {record,rules:[{requirementId:'R-DC',cadenceMinutes,lastCompletionMinute,template}]};}
test('agents exchange rejection feedback and retract earlier department reservation before counterproposal',()=>{
 const r=base(),trace=negotiateWithTrace({action:'negotiate',record:r});assert.deepEqual(trace.output,compute({action:'negotiate',record:r}));
 const rejected=trace.exchanges.find(e=>e.type==='rejected');assert.equal(rejected.departmentId,'DC');assert.ok(rejected.feedback.some(v=>v.code==='resource-overlap'));
 const retract=trace.exchanges.find(e=>e.type==='retracted'&&e.drillId==='ENG-1');assert.equal(retract.allocation.startMinute,540);assert.deepEqual(retract.feedback,[{code:'downstream-infeasible',ids:['ENG-1']}]);
 const counter=trace.exchanges.find(e=>e.type==='counterproposal'&&e.drillId==='ENG-1');assert.equal(counter.allocation.startMinute,1980);assert.ok(counter.sequence>retract.sequence);
 r.drills.find(d=>d.id==='ENG-1').preferredStartMinute=1980;
 const changed=negotiateWithTrace({action:'negotiate',record:r});assert.equal(changed.exchanges[0].allocation.startMinute,1980);assert.equal(changed.exchanges.some(e=>e.type==='retracted'),false);
 assert.equal(trace.exchanges.at(-1).type,'feasible');assert.equal(trace.traceTruncated,false);
});
test('impossible and exhausted exchange traces terminate without a fabricated solution',()=>{
 for(const [record,status]of [[data.records[1],'infeasible'],[data.records[2],'search-exhausted']]){const t=negotiateWithTrace({action:'negotiate',record});assert.deepEqual(t.output,{status,error:null,result:null});assert.equal(t.exchanges.at(-1).type,status);assert.ok(t.totalExchanges<500);}
});
test('cadence derives multiple obligations from history and repairs deletion of both obligation and drill',()=>{
 const {record,rules}=cadence();const before=JSON.stringify(record);const prepared=prepareCadence(record,rules);
 assert.deepEqual(prepared.recurrenceRequirements[0].occurrences,[{id:'R-DC-C1',releaseMinute:0,deadlineMinute:5040,requiredCount:1},{id:'R-DC-C2',releaseMinute:5040,deadlineMinute:10080,requiredCount:1}]);
 const out=compute({action:'negotiate',record:prepared});assert.equal(out.status,'feasible');assert.equal(out.result.coverage.dueInWeek,2);assert.deepEqual(out.result.allocations.map(a=>a.startMinute),[100,5140]);
 prepared.drills.pop();prepared.recurrenceRequirements[0].occurrences.pop();assert.equal(prepareCadence(prepared,rules).drills.length,2);
 prepared.drills=[];prepared.recurrenceRequirements=[];assert.equal(prepareCadence(prepared,rules).drills.length,2);assert.equal(JSON.stringify(record),before);
 const slower=prepareCadence(record,[{...rules[0],cadenceMinutes:10080}]);assert.equal(slower.drills.length,1);
 const history=prepareCadence(record,[{...rules[0],lastCompletionMinute:-5040}]);assert.equal(history.recurrenceRequirements[0].occurrences[0].deadlineMinute,0);assert.equal(compute({action:'negotiate',record:history}).status,'infeasible');
});
test('generated deadline boundary, changed candidates and impossible coverage are enforced',()=>{
 const {record,rules}=cadence(10080);rules[0].template.allowedStartMinutes=[9960];rules[0].template.preferredStartMinute=9960;
 assert.equal(compute({action:'negotiate',record:prepareCadence(record,rules)}).status,'feasible');
 rules[0].template.allowedStartMinutes=[9961];rules[0].template.preferredStartMinute=9961;
 assert.deepEqual(compute({action:'negotiate',record:prepareCadence(record,rules)}),{status:'infeasible',error:null,result:null});
 assert.throws(()=>prepareCadence(record,[{...rules[0],cadenceMinutes:0}]));assert.throws(()=>prepareCadence(record,[{...rules[0],cadenceMinutes:1}]));
});
test('real heat mapping gives zero, low and high computed loads distinct ordered intensities',()=>{
 // Run the delivered UI function; test it against changed real backend duty loads.
 const source=fs.readFileSync(new URL('./public/app.js',import.meta.url),'utf8');const fn=source.slice(source.indexOf('function heatStyle('),source.indexOf('let cadenceRules='));const style=vm.runInNewContext(fn+';heatStyle');
 const r=base();r.fixedDuties.push({id:'ADDED',personnelId:'P9',startMinute:5000,endMinute:5300});const out=compute({action:'negotiate',record:r});assert.equal(out.status,'feasible');
 const minutes=[out.result.loads.find(l=>l.personnelId==='P8').dailyDutyMinutes[0],out.result.loads.find(l=>l.personnelId==='P5').dailyDutyMinutes[0],out.result.loads.find(l=>l.personnelId==='P9').dailyDutyMinutes[3]];
 assert.deepEqual(minutes,[0,60,300]);const colors=minutes.map(v=>style(v,600).backgroundColor);assert.equal(new Set(colors).size,3);assert.deepEqual(colors,['hsl(207 55% 100%)','hsl(207 55% 93.5%)','hsl(207 55% 67.5%)']);assert.equal(style(600,600).color,'#ffffff');assert.equal(style(900,600).backgroundColor,style(600,600).backgroundColor);
});
test('HTTP cadence and exchanges use the shared backend and exact invoke remains unchanged',async()=>{
 const app=await start({port:0});try{const post=async(path,input)=>(await fetch(app.url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).json();const input=cadence();assert.deepEqual(await post('api/cadence',input),{record:prepareCadence(input.record,input.rules)});const invocation={action:'negotiate',record:base()};assert.deepEqual(await post('api/exchanges',invocation),negotiateWithTrace(invocation));assert.deepEqual(await post('api/invoke',invocation),compute(invocation));}finally{await app.close();}
});
test('delivered client cadence workflow regenerates missing input and resets rules when loading sample',async()=>{
 const nodes=new Map();const element=()=>({value:'',textContent:'',checked:false,disabled:false,hidden:false,style:{},children:[],set id(v){nodes.set(v,this)},append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]},focus(){},scrollIntoView(){}});const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
 get('samples').textContent=JSON.stringify(data.records);get('sample').value='weekly-conflicts';const saved=new Map();
 const context=vm.createContext({document:{getElementById:get,createElement:element},structuredClone,AbortController,Blob,URL,setTimeout,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},fetch:async(url,options)=>({ok:true,json:async()=>{const input=JSON.parse(options.body);return url==='/api/cadence'?{record:prepareCadence(input.record,input.rules)}:url==='/api/exchanges'?negotiateWithTrace(input):compute(input)}})});
 vm.runInContext(fs.readFileSync(new URL('./public/app.js',import.meta.url),'utf8'),context);await new Promise(r=>setImmediate(r));get('cadence-example').onclick();await get('cadence-expand').onclick();await get('apply-input').onclick();await get('optimize').onclick();assert.match(get('coverage').textContent,/6 due; 6 scheduled/);assert.match(get('allocation-R-DC-C2').textContent,/6300–6420/);
 const r=JSON.parse(get('input-json').value);r.drills=r.drills.filter(d=>d.requirementId!=='R-DC');r.recurrenceRequirements=r.recurrenceRequirements.filter(q=>q.id!=='R-DC');get('input-json').value=JSON.stringify(r);get('input-json').oninput();await get('apply-input').onclick();await get('optimize').onclick();assert.equal(JSON.parse(get('input-json').value).drills.length,6); // saved editor and computed board both include regenerated obligations
 assert.match(get('coverage').textContent,/6 due; 6 scheduled/);assert.match(get('allocation-R-DC-C2').textContent,/6300–6420/);
 await get('load-sample').onclick();assert.equal(get('cadence-rules').value,'[]');await get('optimize').onclick();assert.match(get('allocation-DC-2').textContent,/6300–6420/);assert.match(get('coverage').textContent,/6 due; 6 scheduled/);
});
