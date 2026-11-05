import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {run,DepartmentAgent,negotiate} from './domain.mjs';
import {guidedUpdate,loadBand} from './public/app.js';
const fixture=JSON.parse(readFileSync(new URL('./data/synthetic-data.json',import.meta.url)));
const base=()=>structuredClone(fixture.scenarios[0].input);
test('department receives shared rejection and counterproposes; changed operations escalate',()=>{
 const d=base(),result=run({data:d});
 const eng=result.negotiation.filter(x=>x.agentId==='A-ENG');
 assert.equal(eng[0].outcome,'rejected');assert.ok(eng[0].reasons.includes('RESOURCE_OVERLAP'));
 assert.equal(eng.at(-1).startMinute,1980);assert.equal(eng.at(-1).outcome,'accepted');
 d.operations.blackouts.push([1980,2040]);const blocked=run({data:d});
 assert.equal(blocked.status,'infeasible');assert.deepEqual(blocked.assignments,[]);assert.equal(blocked.reviewAllowed,false);
 assert.ok(blocked.negotiation.some(x=>x.agentId==='A-ENG'&&x.reasons.includes('OPERATIONS')));
});
test('department proposal ownership and feedback are executable',()=>{
 const d=base(),r=d.requests[1],agent=new DepartmentAgent(d,d.agents[1]);const iterator=agent.propose(r);
 assert.equal(iterator.next().value.startMinute,540);
 iterator.next({outcome:'rejected',reasons:['RESOURCE_OVERLAP']});
 assert.deepEqual(agent.feedback,[{requestId:'ENG-1',outcome:'rejected',reasons:['RESOURCE_OVERLAP']}]);
 assert.throws(()=>agent.propose(d.requests[0]).next(),/ownership/);
 const result=negotiate(d,[r],a=>a.startMinute===540?['OPERATIONS']:[]);
 assert.equal(result.status,'feasible');assert.equal(result.assignments[0].startMinute,1980);
 assert.ok(result.agents.get('A-ENG').feedback.length>0);
});
test('guided new week links a new drill automatically and deconflicts without JSON',()=>{
 let d=guidedUpdate(base(),'week','','2026-11-16');
 const request={...structuredClone(d.requests[0]),id:'NEW-DRILL',ruleId:'RULE-NEW-DRILL',occurrenceId:'O-NEW-DRILL-0',priority:50,candidateWindows:[[540,600],[2280,2340]]};
 d=guidedUpdate(d,'requests',request.id,request);
 assert.equal(d.weekStart,'2026-11-16T00:00:00Z');assert.ok(d.agents[0].requestIds.includes(request.id));
 assert.deepEqual(d.trainingRules.at(-1).requestIds,[request.id]);
 const result=run({data:d});assert.equal(result.status,'feasible');assert.equal(result.assignments.length,6);
 assert.equal(result.assignments.at(-1).startMinute,2280);assert.equal(result.remainingConflicts,0);
 assert.equal(result.coverage.at(-1).status,'satisfied-by-schedule');
});
test('guided rule changes regenerate every due occurrence with owner links',()=>{
 const d=base(),rule={...d.trainingRules[0],periodMinutes:1440,windowMinutes:1440};
 const edited=guidedUpdate(d,'trainingRules',rule.id,rule);
 const due=edited.requests.filter(r=>r.ruleId===rule.id);
 assert.equal(due.length,7);assert.deepEqual(due.map(r=>r.occurrenceId),Array.from({length:7},(_,k)=>'O-DC-1-'+k));
 assert.deepEqual(edited.trainingRules[0].requestIds,due.map(r=>r.id));
 const result=run({data:edited});assert.equal(result.status,'infeasible'); // weekend operations absent; never silently skip
 assert.equal(result.coverage.filter(c=>c.occurrenceId.startsWith('O-DC-1-')&&c.status==='unmet').length,7);
});
test('graduated heatmap distinguishes zero, low, medium, high including cap boundary',()=>{
 assert.deepEqual([0,1,60,61,120,121,240].map(loadBand),['load-zero','load-low','load-low','load-medium','load-medium','load-high','load-high']);
});
test('guided availability change drives alternate allocation and recovery',()=>{
 const d=base(),p={...d.personnel[0],availability:[[0,540],[600,10080]]};
 const edited=guidedUpdate(d,'personnel',p.id,p);
 assert.equal(run({data:edited}).status,'infeasible');assert.equal(run({data:d}).status,'feasible');
 assert.deepEqual(d.personnel[0].availability,[[0,10080]]);
});
