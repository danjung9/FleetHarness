import test from 'node:test';
import { completeFixturePlanningReview } from '../scripts/planning-review-fixture.mjs';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newProject } from '../dist-electron/electron/storage.js';
import { ExperimentWorkers, ExperimentWorkerFailure } from '../dist-electron/electron/experiment-workers.js';

const evaluation = { schemaVersion: 1, evaluations: [{
  id: 'sum-cases', capabilityId: 'total', description: 'Independently calculated sums.',
  dataset: { name: 'reference-sums', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
  cases: [{ id: 'ordinary', input: { values: [1, 2] }, expected: { total: 3 } },
    { id: 'empty', input: { values: [] }, expected: { total: 0 } }]
}] };

const recoverySteps = corrected => corrected ? [
  { id: 'invalid', action: 'input', value: 'invalid' },
  { id: 'reject', action: 'activate' },
  { id: 'error', action: 'expectText', text: 'Enter numbers.' },
  { id: 'correct', action: 'input', value: '1,2' },
  { id: 'retry', action: 'activate' },
  { id: 'result', action: 'expectText', text: '3' }
] : [{ id: 'help', action: 'activate' }, { id: 'visible', action: 'expectVisible' }];

function behavior(acceptance, corrected) {
  return {
    schemaVersion: 1, objective: 'Calculate totals and recover from invalid numeric input.', surface: 'browser',
    delivery: { profiles: ['browser-js', 'node-service'], network: 'offline', operationIds: [] },
    invocation: { input: 'An object with values containing finite numbers.', output: 'Exactly {total:number}.',
      rules: ['Sum every supplied value; an empty array returns zero.'] },
    capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum all supplied values.',
      criterionIds: acceptance.map(item => item.id), required: true, evaluationIds: ['sum-cases'] }],
    criteria: acceptance.map(item => ({ criterionId: item.id, disposition: 'implemented',
      expectedOutcome: 'Show the correct sum and allow invalid input to be corrected.', capabilityIds: ['total'], scenarioIds: ['primary', 'recovery'] })),
    ux: { audience: 'An operator', primaryTask: 'Sum durations', successOutcome: 'A correct total',
      states: { empty: 'Explain numeric input', loading: 'Show calculation progress', error: 'Explain the invalid field', success: 'Show the total' },
      persistence: 'No persistence required.', recovery: 'Correct invalid values and calculate again.', keyboard: 'All controls are keyboard accessible.' },
    scenarios: [
      { id: 'primary', title: 'Calculate a sum', kind: 'primary', steps: [
        { id: 'values', action: 'input', value: '1,2' }, { id: 'calculate', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }
      ] },
      { id: 'recovery', title: 'Recover invalid input', kind: 'recovery', steps: recoverySteps(corrected) }
    ]
  };
}

async function fixture(t, correctOnRetry) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-recovery-workers-'));
  const project = newProject({ title: 'Sum supplied durations', description: 'Build a browser app to sum numbers and recover from invalid input.',
    criteria: ['Calculate the sum and allow correction of invalid input.'] });
  project.dataInputs = [{ name: 'sample.json', kind: 'text', content: '{"values":[1,2]}' }];
  const experiment = { id: 'recovery-fixture', projectId: project.id, lineageId: 'fixture', partition: 'development', cohortKey: 'pending',
    mode: 'paired', status: 'planning', baselineProfileId: 'browser-js', candidateIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const sharedFile = path.join(root, 'experiments', experiment.id, 'shared.json');
  const sessions = [], planningPrompts = [], projections = [];
  const createSession = async ({ cwd, customTools }) => {
    const listeners = new Set();
    const session = {
      stage: undefined, disposed: false,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      async prompt(prompt) {
        this.stage ??= customTools.some(tool => tool.name === 'fleet_submit_planning_review') ? 'planning-review' : prompt.includes('You are the intake agent') ? 'intake' : prompt.includes('You are the research agent') ? 'research' : 'plan';
        const emit = event => { for (const listener of listeners) listener(event); };
        emit({ type: 'turn_start' });
        if (this.stage === 'planning-review') await completeFixturePlanningReview(customTools, { shared: true, emit });
        else if (this.stage === 'intake') await fs.writeFile(path.join(cwd, 'scope.md'), 'Calculate sums and permit correction of invalid input.');
        else if (this.stage === 'research') await fs.writeFile(path.join(cwd, 'research.md'), 'Sum a numeric array; render validation errors and allow correction.');
        else {
          planningPrompts.push(prompt);
          // Neither the rejected plan nor the completion retry may see a committed shared artifact.
          await assert.rejects(fs.stat(sharedFile), { code: 'ENOENT' });
          const packet = JSON.parse(await fs.readFile(path.join(cwd, '.fleet', 'packet.json'), 'utf8'));
          const corrected = correctOnRetry && planningPrompts.length > 1;
          await fs.writeFile(path.join(cwd, 'behavior-contract.json'), JSON.stringify(behavior(packet.acceptance, corrected), null, 2));
          await fs.writeFile(path.join(cwd, 'evaluation-plan.json'), JSON.stringify(evaluation, null, 2));
        }
        emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } });
        emit({ type: 'turn_end' });
      },
      async abort() {},
      dispose() { this.disposed = true; }
    };
    sessions.push(session);
    return { session };
  };
  const workers = new ExperimentWorkers({ root, executable: process.execPath, resourcesRoot: path.resolve('.'),
    runtime: { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true },
    operations: () => [], integrations: () => { throw new Error('Shared planning must not start a candidate integration runtime.'); }, createSession });
  const worker = await workers.sharedPlanner({ experiment, project, modelConfig: { backend: 'pi', provider: 'fixture', model: 'fixture-v1' },
    signal: new AbortController().signal, saveProjection: value => { projections.push(structuredClone(value)); } });
  t.after(async () => { await worker.stop(); await fs.rm(root, { recursive: true, force: true }); });
  return { workers, worker, experiment, sharedFile, sessions, planningPrompts, projections };
}

test('shared worker rejects help-only recovery before freezing after its bounded completion retry', { timeout: 30_000 }, async t => {
  const h = await fixture(t, false);
  await h.worker.start(); await h.worker.wait();
  await assert.rejects(h.worker.result(), error => error instanceof ExperimentWorkerFailure && error.classification === 'implementation'
    && /recovery must act.*observe.*correct or retry.*literal outcome/s.test(h.projections.at(-1).logs.filter(log => log.kind === 'error').map(log => log.text).join('\n')));
  const project = h.projections.at(-1);
  assert.equal(project.status, 'failed');
  assert.equal(project.resumeStage, 'plan');
  assert.equal(project.executionFailure, 'implementation');
  assert.equal(h.planningPrompts.length, 2, 'The existing completion retry is bounded to one correction attempt.');
  assert.match(h.planningPrompts[1], /The stage is incomplete.*recovery must act/s);
  assert.deepEqual(h.sessions.map(session => session.stage), ['intake', 'research', 'plan']);
  assert.ok(h.sessions.every(session => session.disposed));
  await assert.rejects(fs.stat(h.sharedFile), { code: 'ENOENT' });
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(project.workspace, 'evaluation-plan.json'), 'utf8')), evaluation,
    'Rejected planning leaves the original evaluation editable instead of sealing it.');
});

test('shared worker completion retry corrects recovery before freezing unchanged answer keys', { timeout: 30_000 }, async t => {
  const h = await fixture(t, true);
  await h.worker.start(); await h.worker.wait();
  const result = await h.worker.result(), project = h.projections.at(-1);
  assert.equal(project.status, 'review', project.error);
  assert.equal(h.planningPrompts.length, 2);
  assert.match(h.planningPrompts[1], /The stage is incomplete.*recovery must act/s);
  assert.deepEqual(h.sessions.map(session => session.stage), ['intake', 'research', 'plan', 'planning-review']);
  assert.ok(h.sessions.every(session => session.disposed));
  assert.equal(result.checkpointRef, h.sharedFile);
  const shared = await h.workers.shared(h.experiment.id);
  assert.deepEqual(shared.behavior.scenarios.find(item => item.id === 'recovery').steps, recoverySteps(true));
  assert.deepEqual(shared.evaluation, evaluation);
  await assert.rejects(fs.stat(path.join(result.workspace, 'evaluation-plan.json')), { code: 'ENOENT' });
  assert.ok(!JSON.stringify(project).includes('"expected"'), 'The public projection does not expose answer keys.');
});
