import assert from 'node:assert/strict';
import { syntheticDataPhase } from '../dist-electron/harness/phases.js';

// Check every request, including the specialist within intake and the final judge.
export function assertFixturePhaseRequests(project, requests) {
  const observed = new Set(), sessions = new Set();
  for (const request of requests) {
    const prompt = request.messages.filter(message => message.role === 'user')
      .map(message => typeof message.content === 'string' ? message.content : JSON.stringify(message.content)).join('\n');
    const tools = request.tools.map(tool => tool.function.name).sort();
    if (prompt.includes('You are a fresh independent judge.')) {
      assert.deepEqual(tools, ['judge_read'], 'The independent judge has only immutable evidence reading');
      sessions.add('judge');
      continue;
    }
    if (tools.includes('fleet_submit_planning_review')) {
      assert.deepEqual(tools, ['fleet_read_planning_artifact', 'fleet_submit_planning_review']);
      sessions.add('planning-review');
      continue;
    }
    if (prompt.includes('Use planning audit mode.')) {
      assert.deepEqual(tools, ['judge_read'], 'The planning audit has only immutable evidence reading');
      sessions.add('planning-audit');
      continue;
    }
    const stage = /Current phase: (\w+)\./.exec(prompt)?.[1];
    assert.ok(stage, 'Every builder request identifies its phase');
    observed.add(stage);
    const synthetic = prompt.includes('You are the synthetic data agent.');
    const phase = synthetic ? syntheticDataPhase : project.phasePlan.find(phase => phase.id === stage);
    assert.ok(phase, 'Every builder request has an assigned phase contract');
    assert.equal(stage, phase.id);
    const session = synthetic ? 'synthetic-data' : stage;
    sessions.add(session);
    assert.deepEqual(tools, [...new Set([...project.globalTools, ...phase.tools])].sort(), session);
    if (stage === 'build' || stage === 'verify') assert.ok(tools.includes('fleet_extract_messages'), 'Message recipe retains its validation tool');
    assert.equal(tools.includes('fleet_solve_schedule'), false, 'Message builds must not expose scheduling tools');
  }
  assert.deepEqual([...observed], ['intake', 'research', 'plan', 'build', 'verify']);
  assert.equal(sessions.has('planning-review') && sessions.has('planning-audit'), false, 'A normal run must not dispatch both plan reviewers');
  assert.deepEqual([...sessions], ['intake', 'synthetic-data', 'research', 'plan', sessions.has('planning-review') ? 'planning-review' : 'planning-audit', 'build', 'verify', 'judge']);
  return { phases: [...observed], sessions: [...sessions] };
}
