import { fixtures } from './fixtures.js';
import { invokeFleetTool } from './tool-registry.js';
import { extractMessages } from './tools/messages.js';
import { solveSchedule } from './tools/scheduling.js';
import { reconcileRecords, planUploads } from './tools/offline.js';
import { searchEvidence } from './tools/evidence.js';
import { analyzeDependencies } from './tools/readiness.js';
import { canonical } from './tools/validation.js';
import type { CheckResult } from './types.js';

/** Small offline smoke scenario with independent expected outcomes; full regressions live in tests/. */
export function runToolkitDemo() {
  const results=Object.fromEntries(Object.entries(fixtures).map(([name,input]) => [name,invokeFleetTool(name,input)]));
  const messages=results.fleet_extract_messages as ReturnType<typeof extractMessages>;
  const schedule=results.fleet_solve_schedule as ReturnType<typeof solveSchedule>;
  const records=results.fleet_reconcile_records as ReturnType<typeof reconcileRecords>;
  const uploads=results.fleet_plan_uploads as ReturnType<typeof planUploads>;
  const evidence=results.fleet_search_evidence as ReturnType<typeof searchEvidence>;
  const dependencies=results.fleet_analyze_dependencies as ReturnType<typeof analyzeDependencies>;
  const checks: CheckResult[]=[];
  const check=(id:string,passed:boolean,detail:string) => checks.push({id,passed,detail});
  check('MSG-FIELDS',messages.items.length===3 && messages.items[0].start==='2026-11-04T09:00:00.000Z','Three fixture items, exact expected first timestamp.');
  check('MSG-UNKNOWN',messages.items[2].due===null && messages.needsReview,'Ambiguous date is retained for review.');
  check('MSG-SOURCES',messages.items.every(item => Object.values(item.fields).every(s => fixtures.fleet_extract_messages.text.slice(s.start,s.end)===s.text)),'All field offsets reproduce source text.');
  check('SCH-REST',schedule.status==='feasible' && schedule.assignments.length===2 && schedule.assignments[1].start-schedule.assignments[0].end>=30,'Both drills fit without violating the supplied 30-minute rest rule.');
  const impossible=structuredClone(fixtures.fleet_solve_schedule);impossible.requests.forEach(r => {r.starts=[540];});
  check('SCH-INFEASIBLE',solveSchedule(impossible).status==='infeasible','Simultaneous mandatory requests cannot share the assigned person.');
  check('OFF-CONFLICT',records.conflicts===1 && records.records[0].heads.length===2,'Concurrent replica edits remain visible.');
  check('OFF-REPLAY',canonical(records)===canonical(reconcileRecords({local:records.operations,remote:records.operations})),'Replayed revision exchange has no extra effect.');
  check('OFF-CONVERGENCE',canonical(records)===canonical(reconcileRecords({local:fixtures.fleet_reconcile_records.remote,remote:fixtures.fleet_reconcile_records.local})),'Replica exchange order yields the same result.');
  check('UPLOAD-BUDGET',uploads.usedBytes===1000 && uploads.transfers[0].id==='record-1' && uploads.transfers[1].offset===2000,'Critical record precedes a resumed photo and consumes only the available bytes.');
  check('RET-FILTER',evidence.results.length===1 && evidence.results[0].id==='doc-1','Excluded document does not enter retrieval results.');
  check('DEP-MARGIN',dependencies.targets[0].finish===190 && dependencies.targets[0].margin===-10,'Known dependency graph finishes ten minutes after its deadline.');
  return {schemaVersion:1,scope:'synthetic-toolkit-only',createdAt:new Date().toISOString(),
    passed:checks.filter(c => c.passed).length,failed:checks.filter(c => !c.passed).length,total:checks.length,checks,results,
    limitations:['These checks do not verify generated applications, model quality, government connectors or operational readiness.','No credentials, model requests or network access are used.']};
}
