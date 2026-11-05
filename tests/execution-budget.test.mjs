import test from 'node:test';
import assert from 'node:assert/strict';
import { beginExecutionPhase, createExecutionBudget, executionBudgetRemaining, finishExecutionPhase, validateExecutionBudget } from '../dist-electron/electron/execution-budget.js';
import { ScopedRunStore } from '../dist-electron/electron/scoped-run-store.js';
import { newProject } from '../dist-electron/electron/storage.js';

test('phase retries and clean resume spend one fixed candidate budget', () => {
  const state = createExecutionBudget(2000, 1000);
  assert.equal(beginExecutionPhase(state, 'plan', 100), 1000);
  finishExecutionPhase(state, 350);
  assert.equal(beginExecutionPhase(state, 'plan', 500), 750);
  finishExecutionPhase(state, 750);
  assert.equal(state.consumedMs, 500);
  assert.equal(beginExecutionPhase(state, 'build', 1000), 1000);
  finishExecutionPhase(state, 2000);
  assert.equal(beginExecutionPhase(state, 'verify', 3000), 500);
  finishExecutionPhase(state, 3500);
  assert.throws(() => beginExecutionPhase(state, 'verify', 4000), /exhausted/);
  assert.equal(state.consumedMs, 2000);
});

test('crash recovery keeps the original lease deadline and backward observations never refill it', () => {
  const state = createExecutionBudget(3000, 1000);
  beginExecutionPhase(state, 'build', 1000);
  assert.equal(executionBudgetRemaining(state, 'build', 1700), 300);
  const recovered = JSON.parse(JSON.stringify(state));
  assert.equal(beginExecutionPhase(recovered, 'build', 1200), 300);
  assert.equal(executionBudgetRemaining(recovered, 'build', 1900), 100);
  assert.throws(() => beginExecutionPhase(recovered, 'build', 2100), /exhausted/);
  finishExecutionPhase(recovered, 1500);
  assert.equal(recovered.phases.build, 1000);
  assert.equal(executionBudgetRemaining(recovered, 'verify', 2200), 1000);
});

test('recovery rejects inconsistent totals, leases, phases, and phase switches', () => {
  const state = createExecutionBudget(3000, 1000);
  assert.throws(() => validateExecutionBudget({ ...state, consumedMs: 5 }), /Invalid/);
  assert.throws(() => validateExecutionBudget({ ...state, phases: { intake: 0 } }), /Invalid/);
  assert.throws(() => validateExecutionBudget({ ...state, active: { stage: 'build', startedAt: 1, allowanceMs: 1001 } }), /Invalid/);
  beginExecutionPhase(state, 'build', 1000);
  assert.throws(() => beginExecutionPhase(state, 'verify', 1001), /current budget lease/);
});

test('detached execution persists ordered snapshots without sharing parent objects or settings', async () => {
  const project = newProject({ title: 'Parent', description: 'Preserve this parent', criteria: ['A meaningful result'] });
  const settings = { provider: 'a', model: 'b', rememberKey: false }, saved = [];
  const repository = new ScopedRunStore('/host', project, settings, value => saved.push(value));
  const candidate = repository.project(project.id);
  candidate.title = 'Candidate'; const first = repository.save();
  candidate.title = 'Final'; const second = repository.save();
  settings.model = 'changed';
  await Promise.all([first, second]);
  assert.deepEqual(saved.map(item => item.title), ['Candidate', 'Final']);
  assert.equal(project.title, 'Parent'); assert.equal(repository.state.settings.model, 'b');
  assert.throws(() => repository.project('another-project'), /another project/);
});
