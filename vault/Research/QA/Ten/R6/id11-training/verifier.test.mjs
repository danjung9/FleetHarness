import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compute} from './compute.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./data/synthetic-data.json',import.meta.url)));
const base=()=>structuredClone(fixtures.scenarios[0].input);

test('adversarial board: missing mandatory allocation blocks review even without overlaps',async()=>{
 const d=base();d.initialAssignments=(await compute({data:d})).assignments.slice(1);
 const r=await compute({action:'check',data:d});
 assert.equal(r.status,'invalid-board');assert.equal(r.remainingConflicts,0);assert.equal(r.reviewAllowed,false);
 assert.deepEqual(r.negotiation.at(-1),{agentId:d.requests[0].agentId,requestId:'DC-1',startMinute:540,personIds:[],outcome:'rejected',reasons:['MISSING_ASSIGNMENT']});
 assert.deepEqual(r.coverage[0],{occurrenceId:'O-DC-1-0',status:'unmet',requestId:'DC-1',deadlineMinute:10080});
});

test('adversarial immutable prior duty: overlapping history rejects whole roster',async()=>{
 const d=base();d.personnel[5].priorDuty=[[-120,-60],[-90,-30]];
 const r=await compute({data:d});assert.equal(r.status,'infeasible');assert.deepEqual(r.assignments,[]);assert.equal(r.reviewAllowed,false);
 assert.deepEqual(r.loads.at(-1),{personId:'P6',drillMinutes:0,priorDutyMinutes:120,totalDutyMinutes:120,drillMinutesByDay:[0,0,0,0,0,0,0]});
});

test('adversarial history cannot credit a completion at the excluded window end',async()=>{
 const d=structuredClone(fixtures.scenarios.find(s=>s.input.scenarioId==='recurrence-horizon').input);
 d.trainingHistory[0].completedMinute=2880;
 for(const action of ['solve','check','loading','coverage','allocations','status','conflicts'])assert.deepEqual(await compute({action,data:d}),{status:'invalid-input',error:'INVALID_LINK'});
});

test('real worker returns complete same response as direct entrypoint for novel unavailable resource',async()=>{
 const d=base();d.resources[0].availability=[];
 const direct=await compute({data:d});const worker=await compute({data:d},{signal:new AbortController().signal});
 assert.deepEqual(worker,direct);assert.equal(worker.status,'infeasible');assert.deepEqual(worker.assignments,[]);assert.equal(worker.reviewAllowed,false);
 assert.ok(worker.negotiation.some(n=>n.reasons.includes('AVAILABILITY')));
});
