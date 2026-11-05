import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { completeFixturePlanningReview } from '../scripts/planning-review-fixture.mjs';
import { newProject } from '../dist-electron/electron/storage.js';
import { ExperimentWorkers, experimentProfiles } from '../dist-electron/electron/experiment-workers.js';
import { experimentContractHash } from '../dist-electron/harness/experiment-contract.js';
import { IntegrationBroker } from '../dist-electron/electron/integration-broker.js';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { ClassifiedExecutionFailure } from '../dist-electron/electron/execution-failure.js';
import { ExecutionBudgetExceeded } from '../dist-electron/electron/execution-budget.js';

const write = async (cwd, files) => {
  for (const [file, value] of Object.entries(files)) {
    await fs.writeFile(path.join(cwd, file), typeof value === 'string' ? value : JSON.stringify(value));
  }
};

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-finalization-'));
  const snapshots = new Map(), stages = [], workersToStop = [];
  let store = new LearningStore(root);
  t.after(async () => {
    await Promise.all(workersToStop.map(worker => worker.stop()));
    store.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  const source = newProject({ title: 'Sum values', description: 'Build a local command-line tool that sums finite numbers.', criteria: ['Calculate the sum of all supplied values.'] });
  source.dataInputs = [{ name: 'sample.json', kind: 'text', content: '{"values":[1,2]}' }];
  const experiment = { id: 'finalization-experiment', projectId: source.id, lineageId: 'finalization', partition: 'development', cohortKey: 'pending',
    mode: 'paired', status: 'planning', baselineProfileId: 'node-cli', candidateIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await store.init(); store.createExperiment(experiment);
  const createSession = async ({ cwd, customTools }) => {
    const listeners = new Set();
    return { session: {
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      async prompt(prompt) {
        const emit = event => { for (const listener of listeners) listener(event); };
        this.stage ??= customTools.some(tool => tool.name === 'fleet_submit_planning_review') ? 'planning-review'
          : prompt.includes('You are the intake agent') ? 'intake' : prompt.includes('You are the research agent') ? 'research'
          : prompt.includes('You are the implementation agent') ? 'build' : prompt.includes('You are the verification agent') ? 'verify' : 'plan';
        const stage = prompt.startsWith('Implementation is complete.') ? 'guide' : this.stage;
        stages.push(stage); emit({ type: 'turn_start' });
        if (stage === 'planning-review') await completeFixturePlanningReview(customTools, { shared: true, emit });
        else if (stage === 'intake') await write(cwd, { 'scope.md': 'Return the sum of supplied finite numbers.' });
        else if (stage === 'research') await write(cwd, { 'research.md': 'A reduction over the array computes its sum.' });
        else if (stage === 'plan') {
          const candidate = await fs.stat(path.join(cwd, 'runtime-guide.md')).then(() => true, () => false);
          if (!candidate) {
            const { acceptance } = JSON.parse(await fs.readFile(path.join(cwd, '.fleet/packet.json'), 'utf8'));
            await write(cwd, {
              'behavior-contract.json': { schemaVersion: 1, objective: 'Sum supplied finite numbers.', surface: 'cli',
                delivery: { profiles: ['node-cli', 'python-cli'], network: 'offline', operationIds: [] },
                invocation: { input: 'Object with values: finite number[].', output: 'Exactly {total:number}.', rules: ['Sum every value; an empty array returns zero.'] },
                capabilities: [{ id: 'sum', kind: 'algorithm', description: 'Sum all supplied values.', criterionIds: acceptance.map(item => item.id), required: true, evaluationIds: ['sum-cases'] }],
                criteria: acceptance.map(item => ({ criterionId: item.id, disposition: 'implemented', expectedOutcome: 'The independent reference sum is returned.', capabilityIds: ['sum'], scenarioIds: [] })),
                ux: { audience: 'An operator', primaryTask: 'Sum durations', successOutcome: 'A correct total', states: { empty: 'Explain input', loading: 'Show progress', error: 'Explain validation', success: 'Show total' }, persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'All controls usable by keyboard.' }, scenarios: [] },
              'evaluation-plan.json': { schemaVersion: 1, evaluations: [{ id: 'sum-cases', capabilityId: 'sum', description: 'Independent reference sums.',
                dataset: { name: 'sums', version: '1', provenance: 'reviewed' }, evaluator: 'numeric', tolerance: 0, threshold: 1, trials: 1,
                cases: [{ id: 'ordinary', input: { values: [23, 31] }, expected: { total: 54 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] }
            });
          } else {
            const behavior = JSON.parse(await fs.readFile(path.join(cwd, 'behavior-contract.json'), 'utf8'));
            const systemDesign = { title: 'Sum application', description: 'A sum module behind a JSON adapter.',
              components: [{ id: 'core', label: 'Core', description: 'Sum all values.', kind: 'logic', files: ['app.mjs'] }], connections: [] };
            await customTools.find(tool => tool.name === 'fleet_system_design').execute('design', systemDesign);
            await write(cwd, {
              'execution-contract.json': { schemaVersion: 1, behaviorHash: experimentContractHash(behavior), architectureId: 'node-cli',
                runtime: { profile: 'cli', files: ['app.mjs', 'runtime-broker/node.mjs', 'integration-config.json', 'foundation-lock.json'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'app.mjs', args: [] } },
                foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'Host-pinned adapter with a sum module.' },
                systemDesign, screens: [{ name: 'Command line', purpose: 'Read JSON and return its sum.', primaryAction: 'Calculate' }], bindings: [] },
              'plan.md': 'Implement a sum module behind the frozen host adapter.', 'test-matrix.md': 'Positive, negative, empty and invalid input.'
            });
          }
        } else if (stage === 'build') await write(cwd, {
          'app.mjs': 'export async function invoke(input) { if (!Array.isArray(input.values) || input.values.some(value => !Number.isFinite(value))) throw new Error("Expected finite numbers"); return {total: input.values.reduce((sum, value) => sum + value, 0)}; }',
          'app.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; import {invoke} from "./app.mjs"; test("sum",async()=>assert.deepEqual(await invoke({values:[2,-1,3]}),{total:4})); test("empty",async()=>assert.deepEqual(await invoke({values:[]}),{total:0}));',
          'path-to-fleet.md': 'Review operational constraints before use.'
        });
        else if (stage === 'guide') await write(cwd, { 'README.md': '# Sum tool\n\nRun `echo \'{"values":[2,3]}\' | node runtime-broker/node.mjs --invoke app.mjs integration-config.json` to get `{"total":5}`. Empty arrays return zero. Invalid values report an error; correct values and retry. Run `node --test app.test.mjs` for developer tests. All inputs remain local. No environment variables are needed. See verification.md and path-to-fleet.md for evidence and limitations.' });
        else await write(cwd, { 'verification.md': 'Developer tests cover mixed signs and empty input; host cases independently check sums. User operational review remains required.' });
        if (['build', 'verify', 'guide'].includes(stage)) {
          await customTools.find(tool => tool.name === 'fleet_component_progress').execute('progress', { componentId: 'core', status: 'generated', detail: 'The sum module is ready for independent verification.' });
        }
        emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } }); emit({ type: 'turn_end' });
      }, async abort() {}, dispose() { listeners.clear(); }
    } };
  };
  const options = { root, executable: process.execPath, resourcesRoot: path.resolve('.'),
    runtime: { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true }, operations: () => [],
    integrations: (candidateId, operations) => new IntegrationBroker({ candidateId, operations, credentials: async () => undefined }), createSession };
  const context = project => ({ experiment, project, modelConfig: { backend: 'pi', provider: 'fixture', model: 'fixture-v1' },
    signal: new AbortController().signal, saveProjection: async value => {
      snapshots.set(value.id, structuredClone(value));
      // Match the coordinator's durable projection boundary, which serializes
      // supplied input objects before a replacement worker reads them.
      if (store.getCandidate(value.id)) store.updateCandidate(value.id, { executionState: structuredClone(value), workspace: value.workspace });
      else store.updateExperiment(experiment.id, { sharedExecutionState: structuredClone(value), sharedWorkspace: value.workspace });
    } });
  const reopenStore = async () => { store.close(); store = new LearningStore(root); await store.init(); };
  const track = worker => { workersToStop.push(worker); return worker; };
  return { root, source, experiment, options, snapshots, stages, context, track, reopenStore,
    get store() { return store; }, workers: new ExperimentWorkers(options) };
}

test('fresh production workers finalize SQLite-restored supplied-input projections without restarting execution or accepting changed source', { timeout: 60_000 }, async t => {
  const h = await fixture(t);
  const sharedWorker = h.track(await h.workers.sharedPlanner(h.context({ ...h.source, id: 'finalization-shared' })));
  await sharedWorker.start(); await sharedWorker.wait();
  await h.reopenStore();
  const sharedProjection = h.store.getExperiment(h.experiment.id).sharedExecutionState;
  assert.deepEqual(sharedProjection, JSON.parse(JSON.stringify(h.snapshots.get('finalization-shared'))));
  assert.deepEqual(sharedProjection.dataInputs, h.source.dataInputs, 'SQLite preserves the supplied input values.');
  assert.equal(sharedProjection.status, 'review', sharedProjection.error);
  const sharedCheckpoint = path.join(h.root, 'run-checkpoints', sharedProjection.runId + '.json');
  const sharedCheckpointBefore = await fs.readFile(sharedCheckpoint, 'utf8');
  const sharedArtifact = path.join(h.root, 'experiments', h.experiment.id, 'shared.json');
  const sharedArtifactBefore = await fs.readFile(sharedArtifact, 'utf8');
  const completedPlanningStages = [...h.stages];
  // Simulate restart after the backend committed review but before coordinator result collection.
  const recoveredWorkers = new ExperimentWorkers({ ...h.options,
    createSession: async () => { assert.fail('Finalization must not create a model session.'); },
    operations: () => { assert.fail('Finalization must use the frozen operation definitions.'); } });
  const recoveredShared = h.track(await recoveredWorkers.sharedPlanner(h.context(sharedProjection)));
  const shared = await recoveredShared.result();
  assert.equal(shared.workspace, sharedProjection.workspace);
  assert.deepEqual(h.snapshots.get(sharedProjection.id), sharedProjection);
  assert.equal(await fs.readFile(sharedCheckpoint, 'utf8'), sharedCheckpointBefore);
  assert.equal(await fs.readFile(sharedArtifact, 'utf8'), sharedArtifactBefore);
  assert.deepEqual(h.stages, completedPlanningStages);

  const profile = experimentProfiles.find(item => item.id === 'node-cli');
  const candidate = { id: 'finalization-candidate', experimentId: h.experiment.id, profileId: profile.id, profileVersion: profile.version,
    baseline: true, status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  h.store.putCandidate(candidate);
  const memory = { id: 'original-memory', text: 'Reject inputs containing non-finite numbers.' };
  const candidateContext = { ...h.context({ ...h.source, id: candidate.id }), candidate, profile, shared, memory };
  const worker = h.track(await h.workers.candidateWorker(candidateContext));
  await worker.start(); await worker.wait();
  await h.reopenStore();
  const persistedCandidate = h.store.getCandidate(candidate.id), projection = persistedCandidate.executionState;
  assert.deepEqual(projection, JSON.parse(JSON.stringify(h.snapshots.get(candidate.id))));
  assert.deepEqual(projection.dataInputs, h.source.dataInputs, 'The completed build retains every supplied input value.');
  assert.notEqual(JSON.stringify(projection.dataInputs), JSON.stringify(h.source.dataInputs), 'The durable boundary changes key insertion order.');
  assert.equal(persistedCandidate.workspace, projection.workspace);
  assert.equal(projection.status, 'review', projection.error ?? projection.report?.output);
  const checkpointPath = path.join(h.root, 'run-checkpoints', projection.runId + '.json');
  const checkpointBefore = await fs.readFile(checkpointPath, 'utf8');
  const checkpoint = JSON.parse(checkpointBefore), completedStages = [...h.stages];
  assert.ok(checkpoint.executionBudget.consumedMs > 0);
  assert.equal(checkpoint.runId, projection.runId);
  assert.equal(checkpoint.workspace, projection.workspace);
  assert.deepEqual(checkpoint.modelConfig, candidateContext.modelConfig);
  const evidencePath = path.join(h.root, 'experiments', h.experiment.id, candidate.id + '-verification.json');
  await assert.rejects(fs.stat(evidencePath), { code: 'ENOENT' });

  const recover = async () => h.track(await recoveredWorkers.candidateWorker({ ...candidateContext, project: projection,
    modelConfig: { backend: 'pi', provider: 'changed', model: 'changed' }, memory: { id: 'new-memory', text: 'New guidance must not enter the completed run.' } }));
  const outcome = await (await recover()).result();
  assert.equal(outcome.terminalReason, 'completed'); assert.equal(outcome.mandatoryPassed, true); assert.equal(outcome.requiredScopePassed, true);
  assert.equal(outcome.withinBudget, true); assert.equal(outcome.durationMs, checkpoint.executionBudget.consumedMs);
  assert.equal(outcome.repairCount, Number(checkpoint.repairUsed === true));
  assert.deepEqual(h.snapshots.get(candidate.id), projection, 'Collection preserves the completed run, workspace and report.');
  assert.deepEqual(h.store.getCandidate(candidate.id).executionState, projection, 'Collection preserves the durable completed projection.');
  assert.equal(await fs.readFile(checkpointPath, 'utf8'), checkpointBefore, 'Collection cannot reset the consumed budget or frozen model.');
  assert.equal(await fs.readFile(path.join(projection.workspace, 'memory-context.md'), 'utf8'), memory.text);
  assert.deepEqual(h.stages, completedStages);
  assert.equal(experimentContractHash(await recoveredWorkers.evidence(candidate)), outcome.evidenceHash);
  await recoveredWorkers.verifyCandidate({ ...candidate, workspace: projection.workspace, outcome });
  h.store.recordOutcome(candidate.id, outcome);
  await h.reopenStore();
  const finalized = h.store.getCandidate(candidate.id);
  assert.deepEqual(finalized.executionState, projection);
  assert.deepEqual(finalized.outcome, outcome, 'The finalized evidence identity survives a second database restart.');
  assert.equal((await (await recover()).result()).evidenceHash, finalized.outcome.evidenceHash, 'Repeated finalization retains the same immutable proof.');

  await fs.appendFile(path.join(projection.workspace, 'app.mjs'), '\n// changed after the completed projection was saved\n');
  await assert.rejects((await recover()).result(), /source changed/);
  await assert.rejects(recoveredWorkers.verifyCandidate({ ...candidate, workspace: projection.workspace, outcome }), /source changed/);
  assert.equal(await fs.readFile(checkpointPath, 'utf8'), checkpointBefore);
  assert.deepEqual(h.stages, completedStages);
});

async function persistenceFixture(t, { failStatus = 'review', createSession } = {}) {
  const h = await fixture(t);
  const sharedWorker = h.track(await h.workers.sharedPlanner(h.context({ ...h.source, id: 'persistence-shared' })));
  await sharedWorker.start(); await sharedWorker.wait();
  const shared = await sharedWorker.result();
  const profile = experimentProfiles.find(item => item.id === 'node-cli');
  const candidate = { id: 'persistence-candidate', experimentId: h.experiment.id, profileId: profile.id, profileVersion: profile.version,
    baseline: true, status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  h.store.putCandidate(candidate);
  const context = { ...h.context({ ...h.source, id: candidate.id }), candidate, profile, shared };
  const saveProjection = context.saveProjection;
  let failedProjection;
  context.saveProjection = async project => {
    if (!failedProjection && project.status === failStatus) {
      failedProjection = structuredClone(project);
      throw new Error('Temporary candidate final-state persistence failure.');
    }
    await saveProjection(project);
  };
  const workers = createSession ? new ExperimentWorkers({ ...h.options, createSession: options => createSession(options, h.options.createSession) }) : h.workers;
  const worker = h.track(await workers.candidateWorker(context));
  const noTerminalEvidence = async () => {
    for (const suffix of ['failure', 'verification']) {
      await assert.rejects(fs.stat(path.join(h.root, 'experiments', h.experiment.id, candidate.id + '-' + suffix + '.json')), { code: 'ENOENT' });
    }
    assert.equal(h.store.getCandidate(candidate.id).outcome, undefined, 'Infrastructure recovery cannot finalize a scored outcome.');
  };
  return { ...h, worker, candidate, context, noTerminalEvidence, get failedProjection() { return failedProjection; } };
}

test('a passing candidate with a failed final save remains unscored and resumes verification to success', { timeout: 60_000 }, async t => {
  const h = await persistenceFixture(t);
  await h.worker.start(); await h.worker.wait();
  assert.equal(h.failedProjection.status, 'review');
  assert.equal(h.failedProjection.report.exitCode, 0);
  assert.equal(h.failedProjection.report.failed, 0);
  assert.ok(h.failedProjection.report.passed > 0, 'This failure must follow successful real application tests.');
  const checkpointPath = path.join(h.root, 'run-checkpoints', h.failedProjection.runId + '.json');
  const checkpointBefore = await fs.readFile(checkpointPath, 'utf8');
  await assert.rejects(h.worker.result(), error => error.classification === 'infrastructure'
    && /final-state persistence failure/.test(error.message));
  const projection = h.store.getCandidate(h.candidate.id).executionState;
  assert.equal(projection.status, 'failed'); assert.equal(projection.executionFailure, 'infrastructure');
  assert.equal(projection.resumeStage, 'verify');
  assert.deepEqual(projection.report, h.failedProjection.report, 'The passing report remains available for recovery.');
  assert.equal(await fs.readFile(checkpointPath, 'utf8'), checkpointBefore);
  await h.noTerminalEvidence();
  const stagesBefore = [...h.stages], budgetBefore = JSON.parse(checkpointBefore).executionBudget;
  const recovered = h.track(await new ExperimentWorkers(h.options).candidateWorker({ ...h.context, project: projection }));
  await recovered.resume(); await recovered.wait();
  const outcome = await recovered.result();
  assert.equal(outcome.terminalReason, 'completed'); assert.equal(outcome.mandatoryPassed, true);
  assert.equal(outcome.requiredScopePassed, true); assert.equal(outcome.withinBudget, true);
  assert.equal(h.store.getCandidate(h.candidate.id).executionState.runId, h.failedProjection.runId);
  assert.deepEqual(h.stages.slice(stagesBefore.length), ['verify'], 'Recovery must preserve completed planning and implementation.');
  const recoveredBudget = JSON.parse(await fs.readFile(checkpointPath, 'utf8')).executionBudget;
  assert.equal(recoveredBudget.totalLimitMs, budgetBefore.totalLimitMs);
  assert.equal(recoveredBudget.phases.plan, budgetBefore.phases.plan);
  assert.equal(recoveredBudget.phases.build, budgetBefore.phases.build);
  assert.ok(recoveredBudget.consumedMs >= budgetBefore.consumedMs, 'Recovery cannot refund elapsed budget.');
});

for (const classification of ['implementation', 'budget', 'integrity']) {
  test(`${classification === 'budget' ? 'A' : 'An'} ${classification} failure followed by a failed final save cannot become a scored candidate failure`, { timeout: 60_000 }, async t => {
    const h = await persistenceFixture(t, { failStatus: 'failed', createSession: async (options, original) => {
      const result = await original(options), prompt = result.session.prompt.bind(result.session);
      result.session.prompt = async text => {
        if (text.includes('You are the implementation agent')) throw classification === 'budget'
          ? new ExecutionBudgetExceeded() : new ClassifiedExecutionFailure(classification, `Fixture ${classification} failure.`);
        await prompt(text);
      };
      return result;
    } });
    await h.worker.start(); await h.worker.wait();
    assert.equal(h.failedProjection.executionFailure, classification);
    const checkpointPath = path.join(h.root, 'run-checkpoints', h.failedProjection.runId + '.json');
    const checkpointBefore = await fs.readFile(checkpointPath, 'utf8');
    const expected = classification === 'integrity' ? 'integrity' : 'infrastructure';
    await assert.rejects(h.worker.result(), error => error.classification === expected
      && /final-state persistence failure/.test(error.message));
    const projection = h.store.getCandidate(h.candidate.id).executionState;
    assert.equal(projection.status, 'failed'); assert.equal(projection.executionFailure, expected);
    assert.equal(await fs.readFile(checkpointPath, 'utf8'), checkpointBefore);
    await h.noTerminalEvidence();
  });
}

test('stopping a candidate remains cancelled when its final save also fails', { timeout: 60_000 }, async t => {
  let enteredBuild;
  const building = new Promise(resolve => { enteredBuild = resolve; });
  const h = await persistenceFixture(t, { failStatus: 'stopped', createSession: async (options, original) => {
    const result = await original(options), prompt = result.session.prompt.bind(result.session);
    result.session.prompt = async text => {
      if (text.includes('You are the implementation agent')) { enteredBuild(); await new Promise(() => {}); }
      else await prompt(text);
    };
    return result;
  } });
  await h.worker.start(); await building; await h.worker.stop();
  assert.equal(h.failedProjection.status, 'stopped'); assert.equal(h.failedProjection.executionFailure, 'cancelled');
  const outcome = await h.worker.result(), projection = h.store.getCandidate(h.candidate.id).executionState;
  assert.equal(projection.status, 'stopped'); assert.equal(projection.executionFailure, 'cancelled');
  assert.match(projection.error, /final-state persistence failure/);
  assert.equal(outcome.terminalReason, 'cancelled'); assert.equal(outcome.mandatoryPassed, false);
  await h.noTerminalEvidence();
});
