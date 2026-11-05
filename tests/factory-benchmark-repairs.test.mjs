import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as benchmark from '../scripts/benchmark-factory.mjs';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { briefFingerprint, writeRunCheckpoint } from '../dist-electron/electron/run-checkpoint.js';
import { parseSolutionContract, parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

const unavailable = { repairAttempts: null, repairEvidence: 'unavailable' };
const repairMessage = 'Core evaluation failed. Using the shared repair attempt before completing the application.';

async function temporaryRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-benchmark-repairs-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

function checkpointFor(project, fields = {}) {
  return { version: 1, projectId: project.id, runId: project.runId, workspace: project.workspace,
    briefHash: briefFingerprint(project), stage: 'build', context: 'Offline repair evidence fixture',
    phases: [], globalTools: [], packetHash: 'fixture-packet', requirements: 'Fixture requirements',
    acceptance: [], data: {}, ...fields };
}

async function projectFixture(t) {
  const root = await temporaryRoot(t);
  const project = newProject({ title: 'Repair checkpoint fixture', description: 'Read private host repair evidence.', criteria: [] });
  project.runId = 'current-run'; project.workspace = path.join(root, 'workspace');
  await fs.mkdir(project.workspace);
  const checkpoint = checkpointFor(project);
  return { root, project, checkpoint, file: path.join(root, 'run-checkpoints', project.runId + '.json') };
}

async function readEvidence(root, project) {
  assert.equal(typeof benchmark.readLiveRepairEvidence, 'function', 'Repair evidence must have a separately testable host-checkpoint reader.');
  return benchmark.readLiveRepairEvidence(root, project);
}

test('fresh-run repair evidence reads the persisted shared slot without consulting log prose', async t => {
  for (const [label, fields, expected] of [
    ['used', { repairUsed: true }, 1], ['unused', { repairUsed: false }, 0], ['not-yet-used', {}, 0]
  ]) await t.test(label, async t => {
    const { root, project, checkpoint, file } = await projectFixture(t);
    // An apparent repair in the UI history is not host evidence of consumption.
    project.logs.push({ kind: 'info', text: repairMessage });
    await writeRunCheckpoint(root, project, { ...checkpoint, ...fields });
    const body = await fs.readFile(file, 'utf8');
    const before = structuredClone(project);
    assert.deepEqual(await readEvidence(root, project), { repairAttempts: expected, repairEvidence: 'checkpoint' });
    assert.deepEqual(project, before, 'Reading telemetry must not rewrite project state.');
    assert.equal(await fs.readFile(file, 'utf8'), body, 'Reading telemetry must not rewrite recovery state.');
  });
});

test('malformed repair flags are unknown even when the recovery reader accepts their surrounding checkpoint', async t => {
  for (const repairUsed of [null, 'true', 'false', 0, 1, [], {}]) await t.test(JSON.stringify(repairUsed), async t => {
    const { root, project, checkpoint } = await projectFixture(t);
    await writeRunCheckpoint(root, project, { ...checkpoint, repairUsed });
    assert.deepEqual(await readEvidence(root, project), unavailable);
  });
});

test('missing, invalid and mismatched host checkpoints cannot become measured zero or trust repair-looking logs', async t => {
  const fixtures = [
    ['missing', async () => {}],
    ['invalid-json', async h => fs.writeFile(h.file, '{broken')],
    ['foreign-project', async h => writeRunCheckpoint(h.root, h.project, { ...h.checkpoint, projectId: 'another-project', repairUsed: true })],
    ['foreign-run', async h => writeRunCheckpoint(h.root, h.project, { ...h.checkpoint, runId: 'another-run', repairUsed: true })],
    ['foreign-workspace', async h => writeRunCheckpoint(h.root, h.project, { ...h.checkpoint, workspace: h.root, repairUsed: true })],
    ['changed-brief', async h => { h.project.description += ' Changed after the run.'; }],
    ['symlink', async h => {
      const target = path.join(h.root, 'copied-checkpoint.json');
      await fs.rename(h.file, target); await fs.symlink(target, h.file);
    }]
  ];
  for (const [label, mutate] of fixtures) await t.test(label, async t => {
    const h = await projectFixture(t);
    if (label !== 'missing') await writeRunCheckpoint(h.root, h.project, { ...h.checkpoint, repairUsed: true });
    h.project.logs.push({ kind: 'info', text: repairMessage });
    await mutate(h);
    assert.deepEqual(await readEvidence(h.root, h.project), unavailable);
  });
});

// Pipeline evidence is synthetic, but every core case is scored by the real host
// evaluator and the benchmark subsequently executes the clean packaged CLI.
// No fixture claims that a coding model generated this application.
async function acceptedCliFixture(project, scenario) {
  assert.equal(scenario.profile, 'cli');
  const runtime = { profile: 'cli', files: ['engine.mjs'], requiredEnv: [],
    command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
  const solution = parseSolutionContract({ schemaVersion: 1, objective: scenario.description, runtime,
    capabilities: [{ id: scenario.id, kind: scenario.kind, description: scenario.description, criterionIds: ['R1'],
      required: true, evaluationIds: ['fixture-cases'] }] },
  [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Known correct offline engine' }]);
  const plan = parseEvaluationPlan({ schemaVersion: 1, evaluations: [{ id: 'fixture-cases', capabilityId: scenario.id,
    description: scenario.description, dataset: { name: 'offline-repair-fixture', version: '1', provenance: 'synthetic' },
    cases: scenario.cases, evaluator: scenario.evaluator, threshold: 1, trials: 1,
    ...(scenario.evaluator === 'numeric' ? { tolerance: 0 } : {}) }] }, solution);
  const solve = new Function('return (' + scenario.correct + ')')();
  const provenance = { profile: 'cli', filesHash: 'offline-fixture-runtime', runtime: 'node', environmentNames: [] };
  const evaluated = await runSolutionEvaluation({ provenance, invoke: async input => solve(input),
    redactOutput: value => value, redactMessage: value => value }, solution, plan);
  assert.equal(evaluated.status, 'passed');
  project.status = 'review';
  project.report = { exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0, quality: {
    schemaVersion: 3, contractHash: 'offline-fixture-contract', status: 'passed', requirementsMet: true,
    errors: [], expectedJourneys: 0, journeys: [],
    criteria: [{ criterionId: 'R1', requirement: scenario.description, status: 'passed', detail: 'Host scored fixture', capabilityIds: [scenario.id] }],
    package: { status: 'passed', cleanCopy: true, profile: 'cli', filesHash: provenance.filesHash, detail: 'Synthetic pipeline fixture' },
    capabilities: [{ id: scenario.id, required: true, criterionIds: ['R1'], evaluationIds: ['fixture-cases'], status: 'passed', detail: 'Host scored fixture' }],
    solutionEvaluation: evaluated
  } };
  assert.equal(reportPassed(project.report, true), true, 'The positive fixture must satisfy the existing pipeline gate.');
  await fs.writeFile(path.join(project.workspace, 'solution-contract.json'), JSON.stringify(solution));
  await fs.writeFile(path.join(project.workspace, 'engine.mjs'),
    'import {readFileSync} from "node:fs"; const solve = ' + scenario.correct + '; process.stdout.write(JSON.stringify(solve(JSON.parse(readFileSync(0,"utf8")))));\n');
  // Bind the synthetic pipeline summary to the actual declared fixture files.
  const prepared = await prepareSolutionRuntime(project.workspace, runtime, process.execPath);
  try {
    project.report.quality.package.filesHash = prepared.provenance.filesHash;
    project.report.quality.solutionEvaluation.runtime = prepared.provenance;
  } finally { await prepared.close(); }
  project.report.sourceHash = await sourceHash(project.workspace);
}

test('real live caller retains repair evidence after log overflow and preserves unknowns in saved reports', { timeout: 30_000 }, async t => {
  const output = await temporaryRoot(t);
  const observed = new Map();
  let starts = 0, stops = 0, shutdowns = 0;
  // Stub every model lifecycle entry point. Actual backend log pruning, host
  // checkpoints, package execution, scoring and report serialization stay real.
  t.mock.method(FleetBackend.prototype, 'init', async () => {});
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'stop', async () => { stops++; });
  t.mock.method(FleetBackend.prototype, 'stopAll', async () => { shutdowns++; });
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const project = this.store.project(id);
    const scenario = benchmark.factoryBenchmarkScenarios.find(item => item.description === project.description);
    assert.ok(scenario);
    starts++;
    project.runId = 'run-' + scenario.id;
    project.workspace = path.join(this.store.root, 'workspaces', project.runId);
    await fs.mkdir(project.workspace, { recursive: true });
    project.status = 'failed';
    const checkpoint = checkpointFor(project);
    if (scenario.id === 'algorithm') {
      await writeRunCheckpoint(this.store.root, project, { ...checkpoint, repairUsed: true });
      this.log(project, 'build', 'info', repairMessage);
      assert.equal(project.logs.length, 1);
      for (let index = 0; index < 600; index++) this.log(project, 'build', 'info', 'Later host activity ' + index);
      assert.equal(project.logs.length, 600);
      assert.equal(project.logs.some(log => log.text === repairMessage), false, 'The reproduction must actually prune the repair entry.');
      await acceptedCliFixture(project, scenario);
    } else {
      this.log(project, 'build', 'info', repairMessage);
      if (scenario.id === 'optimization') await writeRunCheckpoint(this.store.root, project, { ...checkpoint, repairUsed: false });
      else if (scenario.id === 'retrieval') await writeRunCheckpoint(this.store.root, project, checkpoint);
      else if (scenario.id === 'workflow') await writeRunCheckpoint(this.store.root, project, { ...checkpoint, repairUsed: null });
      else if (scenario.id === 'browser-integration') await writeRunCheckpoint(this.store.root, project, { ...checkpoint, runId: 'foreign-run', repairUsed: true });
      else if (scenario.id === 'prediction') await acceptedCliFixture(project, scenario);
    }
    // Store.save uses JSON, which omits optional undefined project fields.
    observed.set(scenario.id, JSON.parse(JSON.stringify(project)));
  });
  const result = await benchmark.benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', runs: 1, output });
  assert.equal(starts, 6); assert.equal(stops, 0); assert.equal(shutdowns, 1);
  assert.equal(result.generations, 6);
  assert.equal(result.accepted, 2, 'Only the two genuinely evaluated CLI fixtures are accepted.');
  const cases = [
    ['algorithm', 1, 'checkpoint', true, true],
    ['optimization', 0, 'checkpoint', false, false],
    ['prediction', null, 'unavailable', true, null],
    ['retrieval', 0, 'checkpoint', false, false],
    ['workflow', null, 'unavailable', false, false],
    ['browser-integration', null, 'unavailable', false, false]
  ];
  for (const [scenario, repairAttempts, repairEvidence, accepted, repaired] of cases) await t.test(scenario, () => {
    const row = result.results.find(item => item.scenario === scenario);
    assert.deepEqual({ repairAttempts: row.repairAttempts, repairEvidence: row.repairEvidence, accepted: row.accepted, repaired: row.repaired },
      { repairAttempts, repairEvidence, accepted, repaired });
    if (accepted) {
      assert.equal(row.holdoutAccepted, true); assert.equal(row.holdoutScore, 1);
      assert.deepEqual(row.failureReasons, []);
    } else assert.ok(row.failureReasons.includes('pipeline-not-accepted'));
  });
  await t.test('summary and persisted reports preserve known and unknown evidence', async () => {
    assert.equal(result.schemaVersion, 7);
    assert.equal(result.repaired, 1);
    assert.equal(result.repairEvidenceMissing, 3);
    assert.equal(result.costUsd, null, 'Repair telemetry must not invent provider costs.');
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(result.output, 'benchmark-report.json'), 'utf8')), result);
    const saved = JSON.parse(await fs.readFile(path.join(result.output, 'state.json'), 'utf8'));
    for (const project of saved.projects) {
      const scenario = benchmark.factoryBenchmarkScenarios.find(item => item.description === project.description);
      assert.deepEqual(project, observed.get(scenario.id), 'Benchmark measurement must preserve the generated project and its evidence.');
    }
  });
});
