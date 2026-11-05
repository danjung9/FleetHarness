import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ExperimentService, probeExperimentIsolation } from '../dist-electron/electron/experiment-service.js';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { runExperimentRegressionChecks } from '../dist-electron/electron/experiment-regression.js';
import { summarizeTokenUsage } from '../dist-electron/shared/token-usage.js';

const hash = value => value.repeat(64);
const profiles = ['node-cli', 'python-cli'].map(id => ({ id, version: '1', label: id, instructions: 'Fixture architecture', budget: { timeoutMs: 1000 } }));
const cipher = { isEncryptionAvailable: () => true, encryptString: value => Buffer.from('fixture-encrypted:' + value), decryptString: value => value.toString().replace('fixture-encrypted:', '') };
function worker(run) { let result; return { start: async () => { result = await run(); }, resume: async () => { result = await run(); }, wait: async () => {}, stop: async () => {}, result: async () => result }; }

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-experiment-service-'))), store = new Store(root);
  await store.init();
  const project = newProject({ title: 'Original project', description: 'Preserve the complete original task.', criteria: ['Compute a total'] });
  project.conversation = { marker: 'original conversation' }; project.reviewHistory = [{ id: 'original-review', runId: 'old-run', decision: 'approved', feedback: 'Preserve review history', createdAt: new Date().toISOString() }];
  store.state.projects = [project]; store.state.settings = { backend: 'pi', provider: 'fixture', model: 'fixture', rememberKey: false }; await store.save();
  const evidence = new Map(), compiled = new Map(), reservations = new Set(), previews = [], services = [];
  let failSave = false;
  const originalSave = store.save.bind(store);
  store.save = async () => { if (failSave) { failSave = false; throw new Error('injected durable-state failure'); } return originalSave(); };
  const workers = {
    sharedPlanner: async context => worker(async () => ({ workspace: path.join(root, 'shared'), objectiveHash: hash('a'), taskFamily: 'math', runtimeConstraints: ['cli', 'offline'], budgetTier: 'fixture', checkpointRef: 'host-only-answers' })),
    selectProfiles: async (_shared, registry) => registry,
    candidateWorker: async context => worker(async () => {
      const workspace = path.join(root, context.candidate.id); await fs.mkdir(workspace); await fs.writeFile(path.join(workspace, 'app.txt'), context.candidate.profileId);
      const source = await sourceHash(workspace), metadata = { experimentId: context.experiment.id, candidateId: context.candidate.id, behaviorHash: hash('a'), evaluationSetHash: hash('b'), executionHash: hash('c') };
      const report = { sourceHash: source, time: new Date().toISOString(), command: 'fixture-host-checks', exitCode: 0, passed: 1, failed: 0, skipped: 0, total: 1, output: 'verified fixture', durationMs: 1,
        quality: { schemaVersion: 4, experiment: metadata } };
      const state = { ...context.project, title: 'Candidate must not replace the project brief', workspace, status: 'review', runId: 'run-' + context.candidate.id, model: 'pinned-model', report, qualityVersion: 4,
        approvedAt: 'candidate approval must not leak', exportedTo: '/candidate/export', executable: { status: 'ready' }, conversation: { marker: 'candidate conversation must not leak' } };
      await context.saveProjection(state);
      evidence.set(context.candidate.id, { report }); compiled.set(context.candidate.id, { behaviorHash: hash('a'), evaluationSetHash: hash('b'), executionHash: hash('c'), execution: { runtime: { profile: 'cli', files: ['app.txt'], requiredEnv: [] } } });
      return { mandatoryPassed: true, requiredScopePassed: true, withinBudget: true, terminalReason: 'completed', sourceHash: source, contractHash: hash('d'), evidenceHash: hash('e'), durationMs: 1,
        costUsd: null, repairCount: 0, evaluatorVersion: 'experiment-host-v4', recordedAt: new Date().toISOString() };
    }),
    verifyCandidate: async candidate => { assert.equal(await sourceHash(candidate.workspace), candidate.outcome.sourceHash, 'source changed after verification'); },
    evidence: async candidate => evidence.get(candidate.id), compiled: async candidate => compiled.get(candidate.id),
    shared: async () => ({ operations: [{ id: 'frozen-operation', origin: 'https://api.example.com', path: '/fixed', method: 'GET', responseType: 'json' }] }),
    preview: async candidate => { const runtime = { url: 'http://127.0.0.1/' + candidate.id, closed: false, close: async () => { runtime.closed = true; } }; previews.push(runtime); return runtime; },
  };
  let service;
  const create = async () => {
    service = new ExperimentService({ store, executable: process.execPath, resourcesRoot: process.cwd(), runtime: {}, cipher, workers, profiles,
      notify: () => {}, readiness: async () => ({ available: true }), assertIdle: id => { if (service?.isActive(id) || reservations.has(id)) throw new Error('project busy'); },
      acquire: async id => { if (reservations.has(id)) throw new Error('project busy'); reservations.add(id); return () => reservations.delete(id); } });
    await service.init(); services.push(service); return service;
  };
  await create();
  t.after(async () => { for (const item of services) await item.close(); await fs.rm(root, { recursive: true, force: true }); });
  const compare = async requestId => { const started = await service.startExperiment(project.id, { requestId }); await service.coordinator.wait(started.id); return service.coordinator.inspect(started.id); };
  return { root, store, project, workers, previews, create, compare, service, failNextSave: () => { failSave = true; } };
}

test('ordinary Run keeps Off legacy and paired learning uses quota while explicit comparisons create two candidates', async t => {
  const { service, project } = await fixture(t);
  assert.equal(await service.startOrdinary(project.id), false); assert.equal(service.learning.listExperiments().length, 0);
  await service.saveLearningSettings({ schemaVersion: 1, mode: 'paired', memoryEnabled: true, automaticComparisons: true, maxHumanRequestsPerDay: 0 });
  assert.equal(await service.startOrdinary(project.id), true);
  const first = service.learning.listExperiments()[0]; await service.coordinator.wait(first.id);
  assert.equal(first.mode, 'single'); assert.equal(service.learning.listCandidates(first.id).length, 1);
  const explicit = await service.startExperiment(project.id, { requestId: 'explicit-compare' }); await service.coordinator.wait(explicit.id);
  assert.equal(service.learning.listCandidates(explicit.id).length, 2);
  const summary = JSON.stringify(await service.experimentState(project.id));
  assert.ok(!summary.includes('host-only-answers')); assert.ok(!summary.includes('executionState')); assert.ok(!summary.includes('workspace'));
});

test('usage includes shared planning and both candidates once, survives selection, and recovers from worker projections', async t => {
  const h = await fixture(t);
  const ledger = (id, runId, totalTokens) => ({ version: 1, startedAt: '2026-11-05T12:00:00Z', sessions: [{ id, runId, source: 'build', model: 'fixture',
    startedAt: '2026-11-05T12:00:00Z', updatedAt: '2026-11-05T12:00:00Z', totals: { inputTokens: totalTokens - 2, outputTokens: 2, cachedInputTokens: 0, totalTokens } }] });
  const previous = ledger('earlier', 'earlier-run', 17); h.project.tokenUsage = previous;
  const sharedPlanner = h.workers.sharedPlanner, candidateWorker = h.workers.candidateWorker;
  h.workers.sharedPlanner = async context => {
    assert.equal(context.project.tokenUsage, undefined, 'A worker must not inherit the parent usage ledger');
    const original = await sharedPlanner(context);
    return worker(async () => {
      await context.saveProjection({ ...context.project, tokenUsage: ledger('shared-session', 'shared-run', 13) });
      await original.start(); return original.result();
    });
  };
  h.workers.candidateWorker = async context => {
    assert.equal(context.project.tokenUsage, undefined);
    return candidateWorker({ ...context, saveProjection: async projection => {
      projection.tokenUsage = ledger(context.candidate.id + '-session', projection.runId, 20);
      await context.saveProjection(projection); await context.saveProjection(projection);
    } });
  };
  const summary = await h.compare('token-accounting');
  assert.equal(summarizeTokenUsage([h.project.tokenUsage]).totalTokens, 70);
  for (const candidate of summary.candidates) {
    const detail = await h.service.inspectCandidate(summary.id, candidate.id);
    assert.equal(summarizeTokenUsage([detail.project.tokenUsage]).totalTokens, 20);
  }
  h.service.refreshProjectSummaries(); h.service.refreshProjectSummaries();
  assert.equal(summarizeTokenUsage([h.project.tokenUsage]).totalTokens, 70);
  const selected = summary.candidates[0]; await h.service.selectCandidate(summary.id, selected.id, selected.sourceHash);
  assert.equal(summarizeTokenUsage([h.project.tokenUsage]).totalTokens, 70);
  assert.equal(summarizeTokenUsage([JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects[0].tokenUsage]).totalTokens, 70);
  // Simulate a crash after worker projections were saved but before parent accounting.
  h.project.tokenUsage = previous; await h.store.save(); await h.service.close();
  await h.create();
  assert.equal(summarizeTokenUsage([h.project.tokenUsage]).totalTokens, 70);
});

test('selection preserves project identity and history, requires reviewed hashes, and resets approval only when selection changes', async t => {
  const { service, project, compare } = await fixture(t), original = structuredClone(project), summary = await compare('selection');
  const [a, b] = summary.candidates;
  assert.equal(project.title, original.title); assert.equal(project.workspace, undefined);
  await assert.rejects(service.selectCandidate(summary.id, a.id, hash('f')), /source revision changed/);
  await assert.rejects(service.selectCandidate(summary.id, a.id, undefined), /reviewed source hash/);
  await service.selectCandidate(summary.id, a.id, a.sourceHash);
  for (const field of ['id', 'title', 'description', 'criteria', 'conversation', 'reviewHistory']) assert.deepEqual(project[field], original[field]);
  assert.equal(project.status, 'review'); assert.equal(project.approvedAt, undefined); assert.equal(project.exportedTo, undefined); assert.equal(project.executable, undefined);
  project.approvedAt = 'approved-selected'; project.status = 'approved';
  await service.selectCandidate(summary.id, a.id, a.sourceHash);
  assert.equal(project.approvedAt, 'approved-selected');
  await service.selectCandidate(summary.id, b.id, b.sourceHash);
  assert.equal(project.approvedAt, undefined); assert.equal(project.report.quality.experiment.candidateId, b.id);
  await service.assertSelectedVerified(project);
  project.report.output = 'tampered report'; await assert.rejects(service.assertSelectedVerified(project), /selected host report/);
});

test('pending comparison summaries follow brief and source run identity, not conversation timestamps', async t => {
  const { service, project, compare } = await fixture(t), summary = await compare('summary-identity');
  assert.equal(project.experiment.id, summary.id);
  project.updatedAt = new Date(Date.now() + 60_000).toISOString();
  project.conversation = { marker: 'A later conversation update' };
  service.refreshProjectSummaries();
  assert.equal(project.experiment.id, summary.id, 'Conversation changes do not hide a pending comparison');
  const description = project.description;
  project.description += ' Change the required behavior.';
  service.refreshProjectSummaries(); assert.equal(project.experiment, undefined);
  project.description = description;
  project.runId = 'new-ordinary-run';
  service.refreshProjectSummaries(); assert.equal(project.experiment, undefined);
  project.runId = undefined;
  service.refreshProjectSummaries(); assert.equal(project.experiment.id, summary.id);
  const record = service.learning.getExperiment(summary.id);
  service.learning.updateExperiment(summary.id, { status: 'running' });
  project.description += ' New brief during activity.';
  service.refreshProjectSummaries(); assert.equal(project.experiment.status, 'running', 'Active work remains visible');
  project.description = description;
  service.learning.updateExperiment(summary.id, { status: record.status });
  const candidate = summary.candidates[0];
  await service.selectCandidate(summary.id, candidate.id, candidate.sourceHash);
  project.description += ' Subsequent brief revision.';
  service.refreshProjectSummaries(); assert.equal(project.experiment.selectedCandidateId, candidate.id, 'Selected history remains available');
  await service.close();
  assert.doesNotThrow(() => service.refreshProjectSummaries(), 'Late desktop notifications during shutdown cannot access the closed database');
});

test('a failed state projection is recovered idempotently from the durable selection outbox', async t => {
  const data = await fixture(t), summary = await data.compare('recovery'), candidate = summary.candidates[0];
  data.failNextSave();
  await assert.rejects(data.service.selectCandidate(summary.id, candidate.id, candidate.sourceHash), /durable-state failure/);
  assert.equal(data.project.workspace, undefined); assert.equal(data.service.learning.pendingPromotions().length, 1);
  await data.service.close(); const reopened = await data.create();
  assert.equal(reopened.learning.pendingPromotions().length, 0); assert.equal(data.project.report.sourceHash, candidate.sourceHash);
  data.project.approvedAt = 'retained approval'; await reopened.coordinator.recover(); assert.equal(data.project.approvedAt, 'retained approval');
});

test('forgetting learning removes training records while selected delivery remains verifiable across restart', async t => {
  const data = await fixture(t), summary = await data.compare('forget'), candidate = summary.candidates[0];
  await data.service.selectCandidate(summary.id, candidate.id, candidate.sourceHash);
  await data.service.forgetProjectLearning(data.project.id);
  assert.equal(data.service.learning.listExperiments(data.project.id).length, 0); assert.equal(data.project.experiment, undefined);
  const receipt = JSON.parse(await fs.readFile(path.join(data.root, 'learning', 'selected-receipts', data.project.id + '.json'), 'utf8'));
  assert.equal(receipt.candidate.executionState, undefined); assert.equal(receipt.memorySnapshotId, undefined);
  await data.service.close(); const reopened = await data.create(); await reopened.assertSelectedVerified(data.project);
  const reference = await reopened.exportReference(data.project); assert.equal(reference.experiment.candidateId, candidate.id);
  assert.equal(reference.operations[0].id, 'frozen-operation'); assert.equal(reference.evaluation, undefined);
  await fs.appendFile(path.join(data.project.workspace, 'app.txt'), 'changed'); await assert.rejects(reopened.assertSelectedVerified(data.project), /source changed/);
});

test('candidate previews are serialized and each prior isolated runtime is closed', async t => {
  const { service, previews, compare } = await fixture(t), summary = await compare('previews'), [a, b] = summary.candidates;
  await Promise.all([service.previewCandidate(summary.id, a.id), service.previewCandidate(summary.id, b.id)]);
  assert.equal(previews.length, 2); assert.equal(previews[0].closed, true); assert.equal(previews[1].closed, false);
  await service.closeCandidatePreview(); assert.equal(previews[1].closed, true);
  await assert.rejects(service.previewCandidate('wrong-experiment', a.id), /does not belong/);
});

test('integration configuration serializes concurrent writes, encrypts secrets and durably consumes budget before failed calls', async t => {
  const data = await fixture(t), summary = await data.compare('integration'), candidate = summary.candidates[0];
  const operation = { id: 'first', origin: 'https://api.example.com', path: '/fixed', method: 'GET', responseType: 'json', auth: { type: 'bearer', credentialId: 'missing-secret', envName: 'API_TOKEN' } };
  await Promise.all([data.service.saveIntegrationOperation({ ...operation, id: 'stored', auth: { ...operation.auth, credentialId: 'encrypted-secret' } }, 'private-fixture-value'), data.service.saveIntegrationOperation({ ...operation, id: 'second' })]);
  assert.equal((await data.service.integrationOperations()).length, 2);
  assert.ok(!(await fs.readFile(path.join(data.root, 'learning', 'operations.json'), 'utf8')).includes('private-fixture-value'));
  const a = data.service.integrationLease(candidate.id, [operation]), b = data.service.integrationLease(candidate.id, [operation]);
  await Promise.all([assert.rejects(a.invoke('first'), /ENOENT/), assert.rejects(b.invoke('first'), /ENOENT/)]);
  assert.equal(data.service.learning.getCandidate(candidate.id).integrationCalls, 2);
  await data.service.close(); const reopened = await data.create(), resumed = reopened.integrationLease(candidate.id, [operation]);
  await assert.rejects(resumed.invoke('first'), /ENOENT/); assert.equal(reopened.learning.getCandidate(candidate.id).integrationCalls, 3);
});

test('availability probes actual filesystem and loopback-network confinement', { skip: !['darwin', 'linux'].includes(process.platform), timeout: 15_000 }, async () => {
  assert.deepEqual(await probeExperimentIsolation(process.execPath), { available: true });
});

test('policy activation regression gate runs correct and deliberately broken real Node/Python cores', { skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000 }, async () => {
  assert.equal(await runExperimentRegressionChecks(process.execPath, ['node-cli', 'python-cli']), true);
  assert.equal(await runExperimentRegressionChecks(process.execPath, ['unknown-runtime']), false);
  const controller = new AbortController(); controller.abort();
  assert.equal(await runExperimentRegressionChecks(process.execPath, ['node-cli'], controller.signal), false);
});
