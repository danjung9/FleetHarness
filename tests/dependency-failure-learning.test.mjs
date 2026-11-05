import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { completeFixturePlanningReview } from '../scripts/planning-review-fixture.mjs';
import { newProject } from '../dist-electron/electron/storage.js';
import { ExperimentWorkers, ExperimentWorkerFailure, experimentProfiles } from '../dist-electron/electron/experiment-workers.js';
import { ExperimentCoordinator } from '../dist-electron/electron/experiment-coordinator.js';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { IntegrationBroker } from '../dist-electron/electron/integration-broker.js';
import { experimentContractHash } from '../dist-electron/harness/experiment-contract.js';

const write = async (root, files) => {
  for (const [name, value] of Object.entries(files)) {
    await fs.writeFile(path.join(root, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  }
};

function behavior(acceptance) {
  return { schemaVersion: 1, objective: 'Compute the total of supplied numbers.', surface: 'cli',
    delivery: { profiles: ['node-cli', 'python-cli'], network: 'offline', operationIds: [] },
    invocation: { input: 'Object with values: finite number[].', output: 'Exactly {total:number}.', rules: ['Sum every supplied value; an empty array returns zero.'] },
    capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum supplied values.', criterionIds: acceptance.map(value => value.id), required: true, evaluationIds: ['sum-cases'] }],
    criteria: acceptance.map(value => ({ criterionId: value.id, disposition: 'implemented', expectedOutcome: 'The independently calculated sum is returned.', capabilityIds: ['total'], scenarioIds: [] })),
    ux: { audience: 'An operator', primaryTask: 'Sum durations', successOutcome: 'A correct total', states: { empty: 'Explain input', loading: 'Show progress', error: 'Explain validation', success: 'Show total' },
      persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'All controls usable by keyboard.' }, scenarios: [] };
}

const evaluation = { schemaVersion: 1, evaluations: [{ id: 'sum-cases', capabilityId: 'total', description: 'Independent reference sums.',
  dataset: { name: 'sums', version: '1', provenance: 'synthetic' }, evaluator: 'numeric', tolerance: 0, threshold: 1, trials: 1,
  cases: [{ id: 'ordinary', input: { values: [23, 31] }, expected: { total: 54 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] };

function execution(shared) {
  return { schemaVersion: 1, behaviorHash: experimentContractHash(shared), architectureId: 'node-cli',
    runtime: { profile: 'cli', files: ['app.mjs', 'runtime-broker/node.mjs', 'integration-config.json', 'foundation-lock.json'], requiredEnv: [],
      command: { runtime: 'node', entrypoint: 'app.mjs', args: [] } },
    foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'Host-pinned isolated adapter and arithmetic fixture.' },
    systemDesign: { title: 'Sum application', description: 'A sum module with a JSON adapter.',
      components: [{ id: 'core', label: 'Core', description: 'Sum all values.', kind: 'logic', files: ['app.mjs'] }], connections: [] },
    screens: [{ name: 'Command line', purpose: 'Input JSON values and read their sum.', primaryAction: 'Calculate' }], bindings: [] };
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-dependency-learning-'));
  const store = new LearningStore(root);
  await store.init();
  store.setSettings({ automaticComparisons: false, maxHumanRequestsPerDay: 0 });
  const project = newProject({ title: 'Sum supplied durations', description: 'Build a local command-line tool to sum finite numbers.', criteria: ['Calculate the sum of all supplied values.'] });
  project.dataInputs = [{ name: 'sample.json', kind: 'text', content: '{"values":[1,2]}' }];
  const stages = [], workerFailures = [], commits = [];
  const createSession = async ({ cwd, customTools }) => {
    const listeners = new Set();
    const session = { stage: undefined,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      async prompt(prompt) {
        const emit = event => { for (const listener of listeners) listener(event); };
        this.stage ??= customTools.some(tool => tool.name === 'fleet_submit_planning_review') ? 'planning-review'
          : prompt.includes('You are the intake agent') ? 'intake' : prompt.includes('You are the research agent') ? 'research'
            : prompt.includes('You are the implementation agent') ? 'build' : prompt.includes('You are the verification agent') || prompt.includes('The independent test run failed.') ? 'verify' : 'plan';
        const stage = prompt.startsWith('Implementation is complete.') ? 'guide' : this.stage;
        stages.push(stage); emit({ type: 'turn_start' });
        if (stage === 'planning-review') await completeFixturePlanningReview(customTools, { shared: true, emit });
        else if (stage === 'intake') await write(cwd, { 'scope.md': 'Return the sum of all supplied numbers.' });
        else if (stage === 'research') await write(cwd, { 'research.md': 'A reduction over a numeric array is sufficient.' });
        else if (stage === 'plan') {
          const candidate = await fs.stat(path.join(cwd, 'runtime-guide.md')).then(() => true, () => false);
          if (!candidate) {
            const packet = JSON.parse(await fs.readFile(path.join(cwd, '.fleet/packet.json'), 'utf8'));
            await write(cwd, { 'behavior-contract.json': behavior(packet.acceptance), 'evaluation-plan.json': evaluation });
          } else {
            const shared = JSON.parse(await fs.readFile(path.join(cwd, 'behavior-contract.json'), 'utf8')), contract = execution(shared);
            await customTools.find(tool => tool.name === 'fleet_system_design').execute('design', contract.systemDesign);
            await write(cwd, { 'execution-contract.json': contract, 'plan.md': 'Implement a sum module behind the frozen host adapter.', 'test-matrix.md': 'Positive, negative and empty input.' });
          }
        } else if (stage === 'build') await write(cwd, {
          'app.mjs': 'export async function invoke(input) { if (!Array.isArray(input.values) || input.values.some(value => !Number.isFinite(value))) throw new Error("Expected finite numbers"); return { total: input.values.reduce((sum, value) => sum + value, 0) }; }',
          'app.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; import {invoke} from "./app.mjs"; test("sum",async()=>assert.deepEqual(await invoke({values:[2,-1,3]}),{total:4})); test("empty",async()=>assert.deepEqual(await invoke({values:[]}),{total:0}));',
          'path-to-fleet.md': 'Review supplied data and operational constraints before use.'
        });
        else if (stage === 'guide') await write(cwd, { 'README.md': '# Sum tool\n\nPass JSON containing values to node runtime-broker/node.mjs --invoke app.mjs integration-config.json. For {"values":[2,3]} the result is {"total":5}. Empty arrays produce zero. Correct invalid input and retry. Run node --test app.test.mjs for developer tests. No dependencies or environment settings are needed. See verification.md and path-to-fleet.md for limitations.' });
        else await write(cwd, { 'verification.md': 'Developer tests cover mixed signs and empty values. Host reference cases check independent sums. Operational acceptance still requires user review.' });
        if (['build', 'verify', 'guide'].includes(stage)) {
          await customTools.find(tool => tool.name === 'fleet_component_progress').execute('progress', { componentId: 'core', status: 'generated', detail: 'Sum implementation is ready for independent tests.' });
        }
        emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } }); emit({ type: 'turn_end' });
      }, async abort() {}, dispose() { listeners.clear(); } };
    return { session };
  };
  const workers = new ExperimentWorkers({ root, executable: process.execPath, resourcesRoot: path.resolve('.'),
    runtime: { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true }, operations: async () => [],
    integrations: (candidateId, operations) => new IntegrationBroker({ candidateId, operations, credentials: async () => undefined }), createSession });
  const recordOutcome = store.recordOutcome.bind(store);
  store.recordOutcome = (id, outcome) => { commits.push(id); return recordOutcome(id, outcome); };
  const coordinator = new ExperimentCoordinator({ store, profiles: experimentProfiles.filter(profile => ['node-cli', 'python-cli'].includes(profile.id)),
    project: id => { assert.equal(id, project.id); return project; }, modelConfig: () => ({ backend: 'pi', provider: 'fixture', model: 'fixture-v1' }),
    readiness: async () => ({ supported: true }), acquire: async () => () => {}, sharedPlanner: context => workers.sharedPlanner(context),
    selectProfiles: (shared, registry) => workers.selectProfiles(shared, registry),
    candidateWorker: async context => {
      const worker = await workers.candidateWorker(context);
      return { ...worker, result: async () => {
        try { return await worker.result(); }
        catch (error) { workerFailures.push(error); throw error; }
      } };
    }, verifyCandidate: candidate => workers.verifyCandidate(candidate), applyPromotion: async () => assert.fail('This test does not select a delivery.'),
    // Match ExperimentService: structured integrity errors roll back the gate;
    // interrupted worker outcomes remain unscored.
    classifyFailure: error => error?.classification === 'integrity' ? 'gate-defect' : 'infrastructure', random: () => 0.75, timeZone: 'UTC' });
  t.after(async () => { await coordinator.stopAll(); store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return { root, store, project, workers, coordinator, stages, workerFailures, commits };
}

test('dependency host exhaustion is unscored and resumes the same candidate without spending its repair', { timeout: 60_000 }, async t => {
  const h = await fixture(t), originalLstat = fs.lstat;
  let injectedPath;
  const fault = t.mock.method(fs, 'lstat', async function (file, ...args) {
    const name = String(file);
    // This is acquireDependencies' root check, after the real runtime copied
    // every declared file. No model output or installer stderr creates the error.
    if (!injectedPath && path.basename(name) === 'package' && path.basename(path.dirname(name)).startsWith('fleet-candidate-package-')) {
      injectedPath = name;
      throw Object.assign(new Error('Host dependency filesystem exhausted.'), { code: 'ENOSPC', syscall: 'lstat', path: name });
    }
    return originalLstat.call(this, file, ...args);
  });
  const run = await h.coordinator.start(h.project.id, { automatic: true });
  await h.coordinator.wait(run.id);
  fault.mock.restore();
  const candidates = h.store.listCandidates(run.id);
  assert.ok(injectedPath, 'The test must reach the actual dependency filesystem boundary. ' + JSON.stringify({
    experiment: h.store.getExperiment(run.id), candidates, stages: h.stages,
  }));
  assert.equal(candidates.length, 1);
  const before = candidates[0];
  assert.equal(h.store.getExperiment(run.id).status, 'stopped', JSON.stringify({
    experimentError: h.store.getExperiment(run.id).error, candidateStatus: before.status,
    failure: before.executionState?.executionFailure, error: before.executionState?.error,
    outcome: before.outcome, commits: h.commits, observations: h.store.listObservations(),
  }));
  assert.equal(before.status, 'stopped'); assert.equal(before.outcome, undefined);
  assert.equal(before.executionState.executionFailure, 'infrastructure', before.executionState.error);
  assert.equal(before.executionState.resumeStage, 'build'); assert.equal(before.executionState.report, undefined);
  assert.equal(h.workerFailures.length, 1);
  assert.ok(h.workerFailures[0] instanceof ExperimentWorkerFailure);
  assert.equal(h.workerFailures[0].classification, 'infrastructure');
  assert.deepEqual(h.commits, []); assert.deepEqual(h.store.listObservations(), []);
  assert.ok(h.store.listPolicies().every(policy => !policy.sourceExperimentIds.includes(run.id)), 'An interruption cannot become policy training evidence.');
  const checkpointPath = path.join(h.root, 'run-checkpoints', before.executionState.runId + '.json');
  const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
  assert.ok(checkpoint.repairUsed === undefined || checkpoint.repairUsed === false, 'An unspent optional repair marker may be absent or false.');
  assert.equal(checkpoint.coreReportHash, undefined);
  assert.ok(checkpoint.executionBudget.consumedMs > 0);
  for (const suffix of ['failure', 'verification']) {
    await assert.rejects(fs.stat(path.join(h.root, 'experiments', run.id, before.id + '-' + suffix + '.json')), { code: 'ENOENT' });
  }
  const stageCount = h.stages.length;
  await h.coordinator.resume(run.id); await h.coordinator.wait(run.id);
  const after = h.store.getCandidate(before.id);
  assert.equal(h.store.getExperiment(run.id).status, 'review', h.store.getExperiment(run.id).error);
  assert.equal(after.status, 'passed', after.error); assert.equal(after.outcome.terminalReason, 'completed');
  assert.equal(after.outcome.mandatoryPassed, true); assert.equal(after.outcome.requiredScopePassed, true);
  assert.equal(after.outcome.repairCount, 0); assert.equal(after.executionState.runId, before.executionState.runId);
  assert.equal(after.executionState.workspace, before.executionState.workspace);
  assert.deepEqual(h.stages.slice(stageCount), ['build', 'guide', 'verify'], 'Recovery preserves completed shared and candidate planning.');
  assert.deepEqual(h.commits, [before.id]); assert.equal(h.workerFailures.length, 1);
  const resumed = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
  assert.ok(resumed.repairUsed === undefined || resumed.repairUsed === false, 'Successful recovery must leave the repair allowance unspent.');
  assert.equal(resumed.executionBudget.totalLimitMs, checkpoint.executionBudget.totalLimitMs);
  assert.ok(resumed.executionBudget.consumedMs >= checkpoint.executionBudget.consumedMs, 'Resume retains time consumed before the host interruption.');
  await h.workers.verifyCandidate(after);
});
