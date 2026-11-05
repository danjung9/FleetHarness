import test from 'node:test';
import { completeFixturePlanningReview } from '../scripts/planning-review-fixture.mjs';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { ExperimentWorkers, ExperimentWorkerFailure, experimentProfiles } from '../dist-electron/electron/experiment-workers.js';
import { experimentContractHash } from '../dist-electron/harness/experiment-contract.js';
import { IntegrationBroker } from '../dist-electron/electron/integration-broker.js';
import { ExecutionBudgetExceeded } from '../dist-electron/electron/execution-budget.js';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { LessonMemory } from '../dist-electron/electron/lesson-memory.js';
import { ExperimentService } from '../dist-electron/electron/experiment-service.js';
import { ExperimentCoordinator } from '../dist-electron/electron/experiment-coordinator.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';

const resourcesRoot = path.resolve('.');
const write = async (cwd, files) => { for (const [file, value] of Object.entries(files)) await fs.writeFile(path.join(cwd, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
function behavior(acceptance) {
  return { schemaVersion: 1, objective: 'Compute the total of supplied numbers.', surface: 'cli',
    delivery: { profiles: ['node-cli', 'python-cli'], network: 'offline', operationIds: [] },
    invocation: { input: 'Object with values: finite number[].', output: 'Exactly {total:number}.', rules: ['Sum every supplied value; an empty array returns zero.'] },
    capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum supplied values.', criterionIds: acceptance.map(value => value.id), required: true, evaluationIds: ['sum-cases'] }],
    criteria: acceptance.map(value => ({ criterionId: value.id, disposition: 'implemented', expectedOutcome: 'The independently calculated sum is returned.', capabilityIds: ['total'], scenarioIds: [] })),
    ux: { audience: 'An operator', primaryTask: 'Sum durations', successOutcome: 'A correct total', states: { empty: 'Explain input', loading: 'Show progress', error: 'Explain validation', success: 'Show total' }, persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'All controls usable by keyboard.' }, scenarios: [] };
}
const evaluation = { schemaVersion: 1, evaluations: [{ id: 'sum-cases', capabilityId: 'total', description: 'Independent reference sums.', dataset: { name: 'sums', version: '1', provenance: 'reviewed' }, evaluator: 'numeric', tolerance: 0, threshold: 1, trials: 1,
  cases: [{ id: 'ordinary', input: { values: [23, 31] }, expected: { total: 54 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] };
function execution(shared, python = false) {
  const runtime = python ? 'python' : 'node', file = python ? 'app.py' : 'app.mjs';
  return { schemaVersion: 1, behaviorHash: experimentContractHash(shared), architectureId: runtime + '-cli',
    runtime: { profile: 'cli', files: [file, 'runtime-broker/' + (python ? 'python.py' : 'node.mjs'), 'integration-config.json', 'foundation-lock.json'], requiredEnv: [], command: { runtime, entrypoint: file, args: [] } },
    foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'Host-pinned isolated adapter and arithmetic fixture.' },
    systemDesign: { title: 'Sum application', description: 'A sum module with a JSON adapter.', components: [{ id: 'core', label: 'Core', description: 'Sum all values.', kind: 'logic', files: [file] }], connections: [] },
    screens: [{ name: 'Command line', purpose: 'Input JSON values and read their sum.', primaryAction: 'Calculate' }], bindings: [] };
}
async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-workers-')), snapshots = new Map(), sessions = [];
  const source = newProject({ title: 'Sum supplied durations', description: 'Build a local command-line tool to sum finite numbers.', criteria: ['Calculate the sum of all supplied values.'] });
  source.dataInputs = [{ name: 'sample.json', kind: 'text', content: '{"values":[1,2]}' }];
  const experiment = { id: 'experiment-fixture', projectId: source.id, lineageId: 'fixture', partition: 'development', cohortKey: 'pending', mode: 'paired', status: 'planning', baselineProfileId: 'node-cli', candidateIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const createSession = async ({ cwd, customTools }) => {
    const listeners = new Set(); const session = { stage: undefined, disposed: false,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      async prompt(prompt) {
        const emit = event => { for (const listener of listeners) listener(event); };
        this.stage ??= customTools.some(tool => tool.name === 'fleet_submit_planning_review') ? 'planning-review' : prompt.includes('You are the intake agent') ? 'intake' : prompt.includes('You are the research agent') ? 'research'
          : prompt.includes('You are the implementation agent') ? 'build' : prompt.includes('You are the verification agent') || prompt.includes('The independent test run failed.') ? 'verify' : 'plan';
        const stage = prompt.startsWith('Implementation is complete.') ? 'guide' : this.stage;
        const python = await fs.stat(path.join(cwd, 'runtime-broker/python.py')).then(() => true, () => false);
        emit({ type: 'turn_start' });
        if (await options.scenario?.({ cwd, stage, session: this, prompt })) return;
        if (stage === 'planning-review') await completeFixturePlanningReview(customTools, { shared: true, emit });
        else if (stage === 'intake') await write(cwd, { 'scope.md': 'Return the sum of all supplied numbers.' });
        else if (stage === 'research') await write(cwd, { 'research.md': 'A reduction over a numeric array is sufficient.' });
        else if (stage === 'plan') {
          const candidate = await fs.stat(path.join(cwd, 'runtime-guide.md')).then(() => true, () => false);
          if (!candidate) {
            const packet = JSON.parse(await fs.readFile(path.join(cwd, '.fleet/packet.json'), 'utf8'));
            const contract = behavior(packet.acceptance); options.behaviorTransform?.(contract, packet.acceptance);
            await write(cwd, { 'behavior-contract.json': contract, 'evaluation-plan.json': evaluation });
          } else {
            const shared = JSON.parse(await fs.readFile(path.join(cwd, 'behavior-contract.json'), 'utf8')), contract = execution(shared, python); options.executionTransform?.(contract);
            const publish = customTools.find(tool => tool.name === 'fleet_system_design');
            assert.ok(publish, `Design tool missing for inferred ${stage} (${python ? 'Python' : 'Node'}), prompt: ${prompt.slice(0, 140)}`);
            await publish.execute('design', contract.systemDesign);
            await write(cwd, { 'execution-contract.json': contract, 'plan.md': 'Implement a sum module behind the frozen host adapter.', 'test-matrix.md': 'Positive, negative, empty and invalid input.' });
          }
        } else if (stage === 'build') await write(cwd, {
          ...(python ? {
            'app.py': 'import math\ndef invoke(value, context):\n    values = value.get("values")\n    if not isinstance(values, list) or any(not isinstance(item, (int, float)) or not math.isfinite(item) for item in values):\n        raise ValueError("Expected finite numbers")\n    return {"total": sum(values)}\n',
            'app.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; import {execFileSync} from "node:child_process"; const invoke = values => JSON.parse(execFileSync(process.env.FLEET_PYTHON, ["-I", "-B", "-c", "import importlib.util,json; spec=importlib.util.spec_from_file_location(\\"app\\",\\"app.py\\"); app=importlib.util.module_from_spec(spec); spec.loader.exec_module(app); print(json.dumps(app.invoke({\\"values\\":"+JSON.stringify(values)+"},{})))"], {encoding:"utf8"})); test("sum",()=>assert.deepEqual(invoke([2,-1,3]),{total:4})); test("empty",()=>assert.deepEqual(invoke([]),{total:0}));'
          } : {
            'app.mjs': options.brokenCore ? 'export async function invoke() { return { total: 54 }; }' : 'export async function invoke(input) { if (!Array.isArray(input.values) || input.values.some(value => !Number.isFinite(value))) throw new Error("Expected finite numbers"); return { total: input.values.reduce((sum, value) => sum + value, 0) }; }',
            'app.test.mjs': options.brokenCore ? 'import test from "node:test"; import assert from "node:assert/strict"; import {invoke} from "./app.mjs"; test("numeric output",async()=>assert.equal(typeof (await invoke({values:[1]})).total,"number"));' : 'import test from "node:test"; import assert from "node:assert/strict"; import {invoke} from "./app.mjs"; test("sum",async()=>assert.deepEqual(await invoke({values:[2,-1,3]}),{total:4})); test("empty",async()=>assert.deepEqual(await invoke({values:[]}),{total:0}));'
          }),
          'path-to-fleet.md': 'Review supplied data and operational constraints before use.'
        });
        else if (stage === 'guide') await write(cwd, { 'README.md': '# Sum tool\n\nRun `echo \'{"values":[2,3]}\' | ' + (python ? 'python3 -I -B runtime-broker/python.py --invoke app.py' : 'node runtime-broker/node.mjs --invoke app.mjs') + ' integration-config.json` to get `{"total":5}`. Empty arrays produce zero. Invalid values report an error; correct values and retry. Run `node --test app.test.mjs` for developer tests. All inputs remain local. No application environment variables are needed. Developer Python tests use FLEET_PYTHON set to the installed interpreter. See verification.md and path-to-fleet.md for evidence and limitations.' });
        else await write(cwd, { 'verification.md': 'Developer tests cover mixed signs and empty values. Host reference cases check independent sums. Operational acceptance still requires user review.' });
        if (['build', 'verify', 'guide'].includes(stage)) {
          const progress = customTools.find(tool => tool.name === 'fleet_component_progress');
          assert.ok(progress, `Component tool missing for inferred ${stage} (${python ? 'Python' : 'Node'}): ${customTools.map(tool => tool.name).join(', ')}`);
          await progress.execute('progress', { componentId: 'core', status: 'generated', detail: 'Sum implementation is ready for independent tests.' });
        }
        emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } }); emit({ type: 'turn_end' });
      }, async abort() {}, dispose() { this.disposed = true; } };
    sessions.push(session); return { session };
  };
  const workers = new ExperimentWorkers({ root, executable: process.execPath, resourcesRoot, runtime: { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true },
    operations: options.operations ?? (() => []), integrations: (candidateId, operations) => new IntegrationBroker({ candidateId, operations, credentials: async () => undefined }), createSession, classifyFailure: options.classifyFailure });
  const context = project => ({ experiment, project, modelConfig: { backend: 'pi', provider: 'fixture', model: 'fixture-v1' }, signal: new AbortController().signal,
    saveProjection: value => snapshots.set(value.id, structuredClone(value)) });
  const sharedProject = { ...structuredClone(source), id: 'shared-fixture' };
  const sharedWorker = await workers.sharedPlanner(context(sharedProject));
  t.after(async () => { await sharedWorker.stop(); await fs.rm(root, { recursive: true, force: true }); });
  const plan = async () => { await sharedWorker.start(); await sharedWorker.wait(); try { return await sharedWorker.result(); } catch (error) { error.message += '\n' + snapshots.get(sharedProject.id).logs.filter(log => log.kind === 'error').map(log => log.text).join('\n'); throw error; } };
  const candidate = async (shared, profileId = 'node-cli') => {
    const profile = experimentProfiles.find(value => value.id === profileId), record = { id: profileId === 'node-cli' ? 'candidate-fixture' : 'candidate-python-fixture', experimentId: experiment.id, profileId: profile.id, profileVersion: profile.version, baseline: profileId === 'node-cli', status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const project = { ...structuredClone(source), id: record.id };
    const ctx = { ...context(project), candidate: record, profile, shared, memory: { id: 'memory-fixture', text: 'Use explicit validation for numeric inputs.' } };
    const worker = await workers.candidateWorker(ctx); t.after(() => worker.stop()); return { worker, record, ctx };
  };
  return { root, source, workers, experiment, snapshots, sessions, context, sharedProject, sharedWorker, plan, candidate };
}

test('shared fake-session planning freezes host-only evaluation and eligible profiles without mutating the parent', { timeout: 30_000 }, async t => {
  const h = await fixture(t), before = structuredClone(h.source), shared = await h.plan();
  assert.deepEqual(h.source, before); assert.deepEqual(h.sessions.map(value => value.stage), ['intake', 'research', 'plan', 'planning-review']);
  assert.equal(h.snapshots.get(h.sharedProject.id).status, 'review');
  const artifact = await h.workers.shared(h.experiment.id);
  assert.equal(artifact.evaluation.evaluations[0].cases[0].expected.total, 54);
  await assert.rejects(fs.stat(path.join(shared.workspace, 'evaluation-plan.json')), { code: 'ENOENT' });
  assert.deepEqual((await h.workers.selectProfiles(shared, experimentProfiles)).map(value => value.id), ['node-cli', 'python-cli']);
  assert.ok(!JSON.stringify(h.snapshots.get(h.sharedProject.id)).includes('"expected"'));
  await assert.rejects(fs.stat(path.join(h.root, 'state.json')), { code: 'ENOENT' });
});

test('candidate fake sessions retain compiled identity, private answers, isolated gates and live source verification', { timeout: 60_000 }, async t => {
  const h = await fixture(t), shared = await h.plan(), { worker, record } = await h.candidate(shared);
  await worker.start(); await worker.wait(); const outcome = await worker.result(), projection = h.snapshots.get(record.id);
  assert.equal(projection.status, 'review', projection.error ?? projection.report?.output);
  assert.equal(outcome.mandatoryPassed, true, projection.report?.output); assert.equal(outcome.requiredScopePassed, true); assert.equal(outcome.withinBudget, true);
  const candidate = { ...record, workspace: projection.workspace, outcome };
  await h.workers.verifyCandidate(candidate);
  assert.equal(await h.workers.preview(candidate), undefined);
  const compiled = await h.workers.compiled(candidate), evidence = await h.workers.evidence(candidate);
  assert.equal(evidence.report.quality.schemaVersion, 4); assert.equal(evidence.identity.qualityContractHash, compiled.qualityContractHash);
  assert.equal(compiled.behaviorHash, (await h.workers.shared(h.experiment.id)).behaviorHash);
  await assert.rejects(fs.stat(path.join(projection.workspace, 'evaluation-plan.json')), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(projection.workspace, 'memory-context.md'), 'utf8'), 'Use explicit validation for numeric inputs.');
  assert.ok(!JSON.stringify(projection).includes('"expected"'));
  await fs.appendFile(path.join(projection.workspace, 'app.mjs'), '\n// edited after host verification\n');
  await assert.rejects(h.workers.verifyCandidate(candidate), /source changed/);
});

test('configured operation definitions freeze before model work and exclude credential references from public guidance', async t => {
  const operation = { id: 'lookup', origin: 'https://api.example.com', path: '/v1/lookup', method: 'GET', responseType: 'json', auth: { type: 'bearer', credentialId: 'private-vault-reference', envName: 'API_TOKEN' } };
  const h = await fixture(t, { operations: () => [operation] }); operation.origin = 'https://changed.example.com';
  await h.plan();
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'experiments', h.experiment.id, 'operations.json'), 'utf8'));
  assert.equal(saved[0].origin, 'https://api.example.com');
  const projection = h.snapshots.get(h.sharedProject.id), publicOperations = await fs.readFile(path.join(projection.workspace, 'available-operations.json'), 'utf8');
  assert.ok(publicOperations.includes('API_TOKEN')); assert.ok(!publicOperations.includes('private-vault-reference'));
});

test('fresh worker resumes a candidate with frozen contracts, memory and already consumed budget', { timeout: 60_000 }, async t => {
  let fail = true;
  const h = await fixture(t, { scenario: ({ stage }) => { if (stage === 'build' && fail) { fail = false; throw new Error('Application interrupted during build.'); } } });
  const shared = await h.plan(), { worker, record, ctx } = await h.candidate(shared);
  await worker.start(); await worker.wait();
  const interrupted = h.snapshots.get(record.id), count = h.sessions.length;
  assert.equal(interrupted.status, 'failed'); assert.equal(interrupted.resumeStage, 'build');
  const checkpointPath = path.join(h.root, 'run-checkpoints', interrupted.runId + '.json');
  const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8')), consumed = checkpoint.executionBudget.consumedMs;
  assert.ok(consumed > 0); assert.equal(checkpoint.modelConfig.model, 'fixture-v1');
  const resumed = await h.workers.candidateWorker({ ...ctx, project: interrupted, memory: { id: 'new-memory', text: 'New advice must not enter an old run.' }, modelConfig: { backend: 'pi', provider: 'changed', model: 'changed' } });
  t.after(() => resumed.stop()); await resumed.resume(); await resumed.wait(); const result = await resumed.result();
  const projection = h.snapshots.get(record.id);
  assert.equal(projection.status, 'review', projection.error); assert.equal(result.mandatoryPassed, true);
  assert.equal(projection.runId, interrupted.runId); assert.ok(result.durationMs >= consumed);
  assert.deepEqual(h.sessions.slice(count).map(value => value.stage), ['build', 'verify']);
  assert.equal(await fs.readFile(path.join(projection.workspace, 'memory-context.md'), 'utf8'), ctx.memory.text);
  const after = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
  assert.equal(after.modelConfig.model, 'fixture-v1'); assert.equal(after.executionBudget.totalLimitMs, 90 * 60_000);
});

test('shared recovery after immutable commit does not regenerate private reference answers', { timeout: 30_000 }, async t => {
  const h = await fixture(t); await h.plan(); const count = h.sessions.length;
  const interrupted = structuredClone(h.snapshots.get(h.sharedProject.id)); interrupted.status = 'failed'; interrupted.resumeStage = 'plan';
  const checkpointPath = path.join(h.root, 'run-checkpoints', interrupted.runId + '.json');
  const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8')); checkpoint.stage = 'plan';
  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint));
  const worker = await h.workers.sharedPlanner(h.context(interrupted)); t.after(() => worker.stop());
  await worker.resume(); await worker.wait(); const result = await worker.result();
  assert.equal(h.snapshots.get(h.sharedProject.id).status, 'review'); assert.equal(h.sessions.length, count);
  assert.equal(result.workspace, interrupted.workspace);
  assert.equal((await h.workers.shared(h.experiment.id)).evaluation.evaluations[0].cases[0].expected.total, 54);
  await assert.rejects(fs.stat(path.join(interrupted.workspace, 'evaluation-plan.json')), { code: 'ENOENT' });
});

test('shared explicit deferral remains visible while required computational scope can pass', { timeout: 60_000 }, async t => {
  let deferredId;
  const h = await fixture(t, { behaviorTransform: (contract, acceptance) => {
    const optional = acceptance.find(item => item.method === 'human' && item.provenance?.length && item.provenance.every(source => source.kind === 'recipe'));
    assert.ok(optional, 'Defer an optional recipe review while retaining all primary outputs.');
    deferredId = optional.id; const deferred = contract.criteria.find(item => item.criterionId === deferredId);
    deferred.disposition = 'deferred'; deferred.reason = 'human-authority: The operational owner must review the prototype on the intended device before deployment; the local calculation remains implemented.'; deferred.capabilityIds = [];
    contract.capabilities[0].criterionIds = contract.capabilities[0].criterionIds.filter(id => id !== deferred.criterionId);
  } });
  const shared = await h.plan(), { worker, record } = await h.candidate(shared); await worker.start(); await worker.wait();
  const outcome = await worker.result(), projection = h.snapshots.get(record.id);
  assert.equal(projection.status, 'review', projection.error); assert.equal(projection.report.quality.requirementsMet, false);
  assert.equal(outcome.mandatoryPassed, true); assert.equal(outcome.requiredScopePassed, true);
  assert.equal(projection.report.quality.criteria.find(item => item.criterionId === deferredId).status, 'unverified');
});

test('structured provider failures are censored and frozen-input violations retain integrity classification', { timeout: 30_000 }, async t => {
  for (const kind of ['infrastructure', 'integrity']) {
    const h = await fixture(t, { classifyFailure: error => error?.status === 503 ? 'infrastructure' : 'implementation', scenario: async ({ cwd, stage }) => {
      if (stage !== 'build') return;
      if (kind === 'infrastructure') throw Object.assign(new Error('Provider temporarily unavailable.'), { status: 503 });
      await fs.writeFile(path.join(cwd, 'memory-context.md'), 'Changed frozen guidance.');
    } });
    const shared = await h.plan(), { worker, record } = await h.candidate(shared); await worker.start(); await worker.wait();
    assert.equal(h.snapshots.get(record.id).executionFailure, kind);
    await assert.rejects(worker.result(), error => error instanceof ExperimentWorkerFailure && error.classification === kind);
    await assert.rejects(fs.stat(path.join(h.root, 'experiments', h.experiment.id, record.id + '-verification.json')), { code: 'ENOENT' });
  }
});

test('candidate planning cannot include private learning context in the delivered manifest', { timeout: 30_000 }, async t => {
  const h = await fixture(t, { executionTransform: contract => { contract.runtime.files.push('memory-context.md'); }, classifyFailure: () => 'implementation' });
  const shared = await h.plan(), { worker, record } = await h.candidate(shared); await worker.start(); await worker.wait();
  const result = await worker.result(); assert.equal(result.mandatoryPassed, false);
  assert.match(h.snapshots.get(record.id).logs.filter(log => log.kind === 'error').map(log => log.text).join('\n'), /learning guidance|reserved|memory-context/);
  await assert.rejects(h.workers.compiled(record));
  const evidence = await h.workers.failureEvidence(record);
  assert.equal(experimentContractHash(evidence), result.evidenceHash);
  assert.equal(evidence.failure.classification, 'implementation'); assert.equal(evidence.identity.executionHash, undefined);
  assert.equal(evidence.identity.behaviorHash, (await h.workers.shared(h.experiment.id)).behaviorHash);
  await assert.rejects(h.workers.verifyCandidate({ ...record, workspace: h.snapshots.get(record.id).workspace, outcome: result }), /passing host gates/);
});

test('one shared plan drives independent Node and Python workers through their actual isolated verification lifecycle', { timeout: 60_000 }, async t => {
  const h = await fixture(t), shared = await h.plan(), results = [];
  for (const profile of ['node-cli', 'python-cli']) {
    const { worker, record } = await h.candidate(shared, profile); await worker.start(); await worker.wait();
    const outcome = await worker.result(), projection = h.snapshots.get(record.id);
    assert.equal(projection.status, 'review', [projection.error, projection.report?.output].filter(Boolean).join('\n'));
    assert.equal(outcome.mandatoryPassed, true, projection.report?.output); assert.equal(outcome.requiredScopePassed, true); assert.equal(outcome.withinBudget, true);
    const candidate = { ...record, workspace: projection.workspace, outcome }; await h.workers.verifyCandidate(candidate);
    results.push({ compiled: await h.workers.compiled(candidate), projection });
  }
  assert.equal(results[0].compiled.behaviorHash, results[1].compiled.behaviorHash);
  assert.equal(results[0].compiled.evaluationSetHash, results[1].compiled.evaluationSetHash);
  assert.notEqual(results[0].compiled.executionHash, results[1].compiled.executionHash);
  assert.notEqual(results[0].projection.workspace, results[1].projection.workspace);
  assert.equal(h.sessions.filter(session => session.stage === 'intake').length, 1);
});

test('a broken computational core consumes the shared repair then records implementation failure rather than infrastructure censoring', { timeout: 30_000 }, async t => {
  const h = await fixture(t, { brokenCore: true }), shared = await h.plan(), { worker, record } = await h.candidate(shared);
  await worker.start(); await worker.wait(); const outcome = await worker.result(), projection = h.snapshots.get(record.id);
  assert.equal(projection.executionFailure, 'implementation', projection.error); assert.equal(outcome.mandatoryPassed, false);
  assert.equal(outcome.terminalReason, 'build-failed'); assert.equal(outcome.repairCount, 1); assert.equal(outcome.withinBudget, true);
  assert.equal(projection.report, undefined, 'This failure precedes final application verification');
  const evidence = await h.workers.failureEvidence(record), checkpoint = JSON.parse(await fs.readFile(path.join(h.root, 'run-checkpoints', projection.runId + '.json'), 'utf8'));
  assert.equal(experimentContractHash(evidence), outcome.evidenceHash); assert.equal(evidence.sourceHash, outcome.sourceHash);
  assert.equal(evidence.failure.classification, 'implementation'); assert.equal(evidence.coreReportHash, checkpoint.coreReportHash);
  assert.match(evidence.coreReportHash, /^[a-f0-9]{64}$/); assert.equal(evidence.budget.consumedMs, outcome.durationMs);
  assert.equal(evidence.identity.qualityContractHash, outcome.contractHash);
  assert.equal(JSON.stringify(evidence).includes('expected'), false); assert.equal(JSON.stringify(evidence).includes(projection.error), false);
  assert.equal((await worker.result()).evidenceHash, outcome.evidenceHash, 'Repeated collection reuses identical immutable failure evidence');
  await assert.rejects(h.workers.evidence(record));
  await assert.rejects(h.workers.verifyCandidate({ ...record, workspace: projection.workspace, outcome }), /passing host gates/);
  await assert.rejects(h.workers.verifyCandidate({ ...record, workspace: projection.workspace,
    outcome: { ...outcome, mandatoryPassed: true, requiredScopePassed: true, terminalReason: 'completed' } }), /verification.json/,
  'Changing outcome flags cannot turn a failure receipt into verification proof');

  // A real pre-verification worker failure must contradict two prior corroborating lineages.
  const store = new LearningStore(h.root); await store.init(); t.after(() => store.close());
  const memory = new LessonMemory(store);
  for (const id of ['prior-one', 'prior-two', h.experiment.id]) {
    store.createExperiment({ ...h.experiment, id, lineageId: id, cohortKey: 'same-cohort', status: 'review', candidateIds: [] });
    const candidateId = id === h.experiment.id ? record.id : id + '-candidate';
    store.putCandidate({ ...record, id: candidateId, experimentId: id, status: 'running' });
    store.recordOutcome(candidateId, id === h.experiment.id ? outcome : { ...outcome, mandatoryPassed: true, requiredScopePassed: true,
      terminalReason: 'completed', evidenceHash: id + '-verified-evidence', sourceHash: id + '-source' });
    const [lesson] = memory.recordComparison(id, 'algorithm');
    assert.equal(lesson.status, id === 'prior-one' ? 'proposed' : id === 'prior-two' ? 'corroborated' : 'contradicted');
  }
  const [lesson] = store.listLessons();
  assert.equal(memory.retrieve({ taskFamily: 'algorithm', query: 'architecture' }).lessons.length, 0);
  const contradiction = store.listObservations().find(item => item.outcome === 'contradicted');
  assert.equal(contradiction.evidenceHash, outcome.evidenceHash);
  assert.ok(store.listEdges().some(edge => edge.fromId === lesson.id && edge.toId === contradiction.id && edge.relation === 'contradicts'));
});

test('budget failure before verification retains sanitized negative evidence without creating passing proof', { timeout: 30_000 }, async t => {
  const h = await fixture(t, { scenario: ({ stage }) => { if (stage === 'build') throw new ExecutionBudgetExceeded(); } });
  const shared = await h.plan(), { worker, record } = await h.candidate(shared); await worker.start(); await worker.wait();
  const outcome = await worker.result(), projection = h.snapshots.get(record.id), evidence = await h.workers.failureEvidence(record);
  assert.equal(projection.executionFailure, 'budget'); assert.equal(projection.report, undefined);
  assert.equal(outcome.terminalReason, 'timeout'); assert.equal(outcome.withinBudget, false);
  assert.equal(evidence.failure.classification, 'budget'); assert.equal(evidence.failure.terminalReason, 'timeout');
  assert.equal(evidence.budget.totalLimitMs, 90 * 60_000); assert.equal(experimentContractHash(evidence), outcome.evidenceHash);
  assert.equal(evidence.coreReportHash, undefined);
  assert.ok(!JSON.stringify(evidence).includes(projection.error));
  await assert.rejects(h.workers.verifyCandidate({ ...record, workspace: projection.workspace, outcome }), /passing host gates/);
});

test('fresh coordinator finalizes a SQLite-restored core failure without spending another repair or changing its proof', { timeout: 60_000 }, async t => {
  const h = await fixture(t, { brokenCore: true }), actions = [], collected = [], commits = [], coordinators = [];
  let store = new LearningStore(h.root), interruptCollection = true, recoverySessions = 0;
  await store.init();
  store.setSettings({ automaticComparisons: false, maxHumanRequestsPerDay: 0 });
  const observeCommits = () => {
    const record = store.recordOutcome.bind(store);
    store.recordOutcome = (id, outcome) => { commits.push(id); return record(id, outcome); };
  };
  const createCoordinator = workers => {
    const coordinator = new ExperimentCoordinator({ store,
      profiles: experimentProfiles.filter(profile => ['node-cli', 'python-cli'].includes(profile.id)),
      project: id => { assert.equal(id, h.source.id); return h.source; },
      modelConfig: () => ({ backend: 'pi', provider: 'fixture', model: 'fixture-v1' }),
      readiness: async () => ({ supported: true }), acquire: async () => () => {},
      sharedPlanner: context => workers.sharedPlanner(context),
      candidateWorker: async context => {
        const worker = await workers.candidateWorker(context);
        return { ...worker,
          start: async () => { actions.push('start'); await worker.start(); },
          resume: async () => { actions.push('resume'); await worker.resume(); },
          result: async () => {
            actions.push('result');
            const outcome = await worker.result(); collected.push(outcome);
            // The real worker has committed immutable failure evidence, while
            // the coordinator has not yet recorded this candidate's outcome.
            if (interruptCollection) {
              interruptCollection = false;
              throw Object.assign(new Error('Result collection interrupted after failure evidence was saved.'), { collectionInterrupted: true });
            }
            return outcome;
          },
        };
      },
      verifyCandidate: candidate => workers.verifyCandidate(candidate),
      applyPromotion: async () => { assert.fail('Failed candidates cannot be promoted.'); },
      classifyFailure: error => error.collectionInterrupted ? 'infrastructure' : 'build-failed',
      random: () => 0.75, timeZone: 'UTC',
    });
    coordinators.push(coordinator); return coordinator;
  };
  try {
    observeCommits();
    const original = createCoordinator(h.workers), run = await original.start(h.source.id, { automatic: true });
    await original.wait(run.id);
    const [before] = store.listCandidates(run.id);
    assert.equal(store.listCandidates(run.id).length, 1);
    assert.equal(store.getExperiment(run.id).status, 'stopped');
    assert.equal(before.status, 'stopped'); assert.equal(before.outcome, undefined);
    assert.equal(before.executionState.status, 'failed'); assert.equal(before.executionState.executionFailure, 'implementation');
    assert.equal(before.executionState.resumeStage, 'build');
    assert.equal(collected[0].terminalReason, 'build-failed'); assert.equal(collected[0].repairCount, 1);
    assert.deepEqual(actions, ['start', 'result']); assert.deepEqual(commits, []);
    assert.equal(store.listObservations().length, 0, 'An interrupted outcome must not train the lesson memory.');
    const checkpointPath = path.join(h.root, 'run-checkpoints', before.executionState.runId + '.json');
    const failurePath = path.join(h.root, 'experiments', run.id, before.id + '-failure.json');
    const checkpointBefore = await fs.readFile(checkpointPath, 'utf8'), failureBefore = await fs.readFile(failurePath, 'utf8');
    const checkpoint = JSON.parse(checkpointBefore), failure = JSON.parse(failureBefore), sessionCount = h.sessions.length;
    assert.equal(checkpoint.repairUsed, true); assert.ok(checkpoint.executionBudget.consumedMs > 0);
    assert.equal(failure.coreReportHash, checkpoint.coreReportHash);
    assert.equal(experimentContractHash(failure), collected[0].evidenceHash);

    store.close(); store = new LearningStore(h.root); await store.init(); observeCommits();
    assert.deepEqual(store.getCandidate(before.id), before, 'Restart retains the failed projection and its unscored outcome.');
    const workers = new ExperimentWorkers({ ...h.workers.options,
      createSession: async () => { recoverySessions++; assert.fail('Finalizing a terminal failure must not allocate another model session.'); },
    });
    const recovered = createCoordinator(workers);
    await recovered.recover(); await recovered.resume(run.id); await recovered.wait(run.id);
    const after = store.getCandidate(before.id);
    assert.deepEqual(actions, ['start', 'result', 'result'], 'Resume collects existing evidence without redispatching the failed backend.');
    assert.equal(recoverySessions, 0); assert.equal(h.sessions.length, sessionCount);
    assert.equal(store.getExperiment(run.id).status, 'failed'); assert.equal(after.status, 'failed');
    assert.deepEqual(after.executionState, before.executionState);
    assert.equal(after.outcome.terminalReason, 'build-failed'); assert.equal(after.outcome.withinBudget, true);
    assert.equal(after.outcome.mandatoryPassed, false); assert.equal(after.outcome.requiredScopePassed, false);
    assert.equal(after.outcome.evidenceHash, collected[0].evidenceHash); assert.equal(after.outcome.sourceHash, collected[0].sourceHash);
    assert.equal(after.outcome.durationMs, checkpoint.executionBudget.consumedMs); assert.equal(after.outcome.repairCount, 1);
    assert.equal(await fs.readFile(checkpointPath, 'utf8'), checkpointBefore, 'Recovery cannot spend or reset the original execution budget.');
    assert.equal(await fs.readFile(failurePath, 'utf8'), failureBefore, 'Recovery must retain the original immutable failure proof.');
    assert.deepEqual(commits, [before.id]);
    await assert.rejects(recovered.resume(run.id), /finalized outcomes/);
    assert.deepEqual(store.getCandidate(before.id).outcome, after.outcome); assert.deepEqual(commits, [before.id]);
    await assert.rejects(workers.evidence(after), /ENOENT/);
  } finally { await Promise.all(coordinators.map(coordinator => coordinator.stopAll())); store.close(); }
});

test('real service coordinates two architectures, verifies explicit selection, and exports runnable source adapters', { timeout: 60_000 }, async t => {
  const h = await fixture(t), store = new Store(h.root); await store.init();
  store.state.projects = [h.source]; store.state.settings = { backend: 'pi', provider: 'fixture', model: 'fixture-v1', rememberKey: false }; await store.save();
  const reservations = new Set(); let acquisitions = 0;
  const service = new ExperimentService({ store, executable: process.execPath, resourcesRoot, runtime: h.workers.options.runtime, workers: h.workers,
    cipher: { isEncryptionAvailable: () => true, encryptString: value => Buffer.from(value), decryptString: value => value.toString() }, notify: () => {},
    readiness: async () => ({ available: true }), assertIdle: id => { if (reservations.has(id)) throw new Error('Project capacity already reserved'); },
    acquire: async id => { assert.equal(reservations.size, 0); reservations.add(id); acquisitions++; return () => reservations.delete(id); } });
  await service.init();
  try {
    const started = await service.startExperiment(h.source.id, { requestId: 'real-workers-service-export' });
    await service.coordinator.wait(started.id);
    const summary = service.coordinator.inspect(started.id);
    assert.equal(summary.status, 'review', service.learning.getExperiment(started.id).error);
    assert.deepEqual(summary.candidates.map(candidate => candidate.profileId).sort(), ['node-cli', 'python-cli']);
    assert.equal(acquisitions, 1); assert.equal(reservations.size, 0);
    assert.equal(h.source.workspace, undefined, 'Completing candidates does not silently select one');
    const exports = path.join(h.root, 'exports'); await fs.mkdir(exports);
    for (const candidate of summary.candidates) {
      const saved = service.learning.getCandidate(candidate.id);
      assert.equal(candidate.success, true, [saved.executionState.error, saved.executionState.report?.output].filter(Boolean).join('\n'));
      await service.selectCandidate(summary.id, candidate.id, candidate.sourceHash);
      assert.equal(h.source.status, 'review'); assert.equal(h.source.approvedAt, undefined);
      assert.equal(h.source.report.quality.experiment.candidateId, candidate.id);
      await service.assertSelectedVerified(h.source);
      const reference = await service.exportReference(h.source);
      const bundle = await exportVerifiedBundle({ workspace: h.source.workspace, parent: exports, title: candidate.profileId,
        verifiedHash: h.source.report.sourceHash, deliveryMarkdown: 'Synthetic integration fixture. Approval remains a separate product step.', reference });
      const manifest = JSON.parse(await fs.readFile(path.join(bundle, 'reproducibility/manifest.json'), 'utf8'));
      assert.equal(manifest.experiment.candidateId, candidate.id); assert.equal(manifest.verifiedSourceHash, candidate.sourceHash);
      await assert.rejects(fs.stat(path.join(bundle, 'memory-context.md')), { code: 'ENOENT' });
      await assert.rejects(fs.stat(path.join(bundle, 'evaluation-plan.json')), { code: 'ENOENT' });
      const python = candidate.profileId === 'python-cli';
      const result = execFileSync(python ? 'python3' : process.execPath,
        [...(python ? ['-I', '-B'] : []), 'runtime-broker/' + (python ? 'python.py' : 'node.mjs'), '--invoke', python ? 'app.py' : 'app.mjs', 'integration-config.json'],
        { cwd: bundle, input: '{"values":[8,-3,12]}\n', encoding: 'utf8', timeout: 10_000 });
      assert.deepEqual(JSON.parse(result), { total: 17 }, 'Exported adapter executes the verified implementation on a fresh input');
    }
  } finally { await service.close(); }
});
