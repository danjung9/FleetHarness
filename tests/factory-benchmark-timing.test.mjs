import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store } from '../dist-electron/electron/storage.js';
import { briefFingerprint, writeRunCheckpoint } from '../dist-electron/electron/run-checkpoint.js';
import { loadQualityContract, sealEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

const readReport = async directory => JSON.parse(await fs.readFile(path.join(directory, 'benchmark-report.json'), 'utf8'));

async function verifiedCli(output) {
  const scenario = factoryBenchmarkScenarios[0], workspace = path.join(output, 'verified-cli');
  await fs.mkdir(workspace);
  const capability = { id: scenario.id, kind: scenario.kind, description: scenario.description,
    criterionIds: ['R1'], required: true, evaluationIds: ['reference-cases'] };
  const files = {
    'solution-contract.json': { schemaVersion: 1, objective: scenario.description, capabilities: [capability],
      runtime: { profile: 'cli', files: ['core.mjs', 'engine.mjs'], requiredEnv: [],
        command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } },
    'evaluation-plan.json': { schemaVersion: 1, evaluations: [{ id: 'reference-cases', capabilityId: scenario.id,
      description: scenario.description, dataset: { name: scenario.id, version: '1', provenance: 'synthetic' },
      cases: scenario.cases, evaluator: 'numeric', threshold: 1, trials: 1, tolerance: 0 }] },
    'acceptance-plan.json': { schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented',
      expectedOutcome: scenario.description, journeyIds: [], capabilityIds: [scenario.id] }], journeys: [] },
    'ux-spec.json': { schemaVersion: 1, audience: 'Benchmark operator', primaryTask: 'Submit structured input',
      successOutcome: 'Inspect a checked result', screens: [{ name: 'Result', purpose: 'Inspect output', primaryAction: 'Calculate' }],
      states: { empty: 'Accept empty input', loading: 'Wait for completion', error: 'Report invalid input', success: 'Show result' },
      persistence: 'One input transcript', recovery: 'Correct input and retry', keyboard: 'CLI stdin' },
    'core.mjs': `export const solve = ${scenario.correct};\n`,
    'engine.mjs': 'import {readFileSync} from "node:fs"; import {solve} from "./core.mjs"; process.stdout.write(JSON.stringify(solve(JSON.parse(readFileSync(0,"utf8")))));\n',
    'smoke.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; import {solve} from "./core.mjs"; test("sum",()=>assert.deepEqual(solve({values:[1,2]}),{total:3}));\n'
  };
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(workspace, name),
    typeof body === 'string' ? body : JSON.stringify(body));
  const acceptance = [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Independent references' }];
  const contract = await loadQualityContract(workspace, acceptance, true);
  await sealEvaluationPlan(workspace, contract, path.join(output, 'answers.json'));
  const report = await verifyApplication(workspace, process.execPath, contract, undefined, { requireVisualReview: true });
  assert.equal(reportPassed(report, 3), true, JSON.stringify(report));
  return { workspace, report, status: 'review', qualityVersion: 3 };
}

async function timingFixture(t, { acceptedCli = false, timedOut = false, failGradingAt } = {}) {
  const output = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-benchmark-timing-')));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  // Verify the one accepted candidate before installing the synthetic clock.
  // Its independent benchmark holdout still executes through a real clean CLI.
  const accepted = acceptedCli ? await verifiedCli(output) : null;
  let now = 0, active, directory;
  const starts = [], snapshots = [], setupErrors = [], stops = [];
  const original = Object.fromEntries(['open', 'readFile', 'writeFile', 'rm'].map(name => [name, fs[name].bind(fs)]));
  const save = Store.prototype.save;
  const elapse = milliseconds => { now += milliseconds; };
  t.mock.method(performance, 'now', () => now);
  t.mock.method(Store.prototype, 'save', async function () { elapse(7); return save.call(this); });
  t.mock.method(FleetBackend.prototype, 'init', async () => { elapse(100); });
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'stopAll', async () => { await Promise.resolve(); elapse(41); });
  t.mock.method(FleetBackend.prototype, 'stop', async () => {
    stops.push(active.index);
    await Promise.resolve();
    elapse(40.25); active.generation += 40.25;
  });
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    try {
      directory = this.store.root;
      const project = this.store.project(id), index = starts.length;
      active = { index, generation: 0, grading: 0, repairReads: 0, sourceReads: 0, holdoutWrites: 0, runtimeCloses: 0,
        hostChecked: false, before: await readReport(directory), project };
      starts.push(active);
      const context = active;
      const startup = timedOut && index === 0 ? 100.25 : 10.25;
      elapse(startup); context.generation += startup;
      project.status = 'failed';
      project.workspace = path.join(output, id);
      if (accepted && index === 0) Object.assign(project, accepted);
      await fs.mkdir(project.workspace, { recursive: true });
      project.runId = `timing-${index}`;
      await writeRunCheckpoint(directory, project, { version: 1, projectId: id, runId: project.runId,
        workspace: project.workspace, stage: 'verify', packetHash: 'fixture', briefHash: briefFingerprint(project),
        context: '', requirements: '', phases: [], globalTools: [], acceptance: [], data: {}, repairUsed: false });
      // A thenable adds time only when the benchmark actually awaits active.done.
      this.active.set(id, { done: { then: resolve => {
        const duration = timedOut && index === 0 ? 1.25 : 20.25;
        elapse(duration); context.generation += duration;
        this.active.delete(id); resolve();
      } } });
    } catch (error) { setupErrors.push(error); throw error; }
  });
  t.mock.method(fs, 'open', async function (file, ...args) {
    if (active && path.basename(path.dirname(String(file))) === 'run-checkpoints' && args[0] !== 'wx') {
      elapse(0.5); active.grading += 0.5; active.repairReads++;
    }
    if (active && accepted && String(file).startsWith(accepted.workspace + path.sep) && args[0] !== 'wx') {
      elapse(1.25); active.grading += 1.25; active.sourceReads++;
    }
    return original.open(file, ...args);
  });
  t.mock.method(fs, 'readFile', async function (file, ...args) {
    const name = String(file);
    if (active?.repairReads && !active.hostChecked && path.basename(name) === 'benchmark-host.json') {
      active.hostChecked = true;
      elapse(2.25); active.grading += 2.25;
      if (active.index === failGradingAt) throw new Error('Fixture host evidence became unreadable');
    }
    if (active && accepted && name.startsWith(accepted.workspace + path.sep)) {
      elapse(1.25); active.grading += 1.25; active.sourceReads++;
    }
    return original.readFile(file, ...args);
  });
  t.mock.method(fs, 'writeFile', async function (file, body, ...args) {
    const name = path.basename(String(file));
    if (name === 'benchmark-report.json.tmp') {
      snapshots.push({ at: now, report: JSON.parse(String(body)) });
      elapse(11);
    } else if (active && name === `${active.project.id}-holdout-report.json`) {
      elapse(8.25); active.grading += 8.25; active.holdoutWrites++;
    }
    return original.writeFile(file, body, ...args);
  });
  t.mock.method(fs, 'rm', async function (file, ...args) {
    if (active && path.basename(String(file)).startsWith('appyard-solution-')) {
      await Promise.resolve();
      elapse(6.25); active.grading += 6.25; active.runtimeCloses++;
    }
    return original.rm(file, ...args);
  });
  return { starts, snapshots, setupErrors, stops, directory: () => directory,
    run: () => benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', output, timeoutMs: timedOut ? 100 : 10_000 }) };
}

function assertTimings(report, contexts) {
  assert.equal(report.generations, contexts.length);
  for (const [index, row] of report.results.entries()) {
    const expected = contexts[index];
    assert.equal(expected.repairReads, 1, 'Repair evidence must actually be read during grading.');
    assert.equal(row.generationDurationMs, Math.round(expected.generation), `${row.scenario}: generation boundary`);
    assert.equal(row.durationMs, Math.round(expected.generation + expected.grading), `${row.scenario}: complete duration`);
    assert.equal(row.gradingDurationMs, row.durationMs - row.generationDurationMs, `${row.scenario}: rounding conservation`);
  }
  assert.equal(report.generationDurationMs, report.results.reduce((total, row) => total + row.generationDurationMs, 0));
  assert.equal(report.gradingDurationMs, report.results.reduce((total, row) => total + row.gradingDurationMs, 0));
}

function assertTimingNote(report) {
  assert.equal(typeof report.timingNote, 'string');
  for (const concept of ['generation', 'verification', 'model', 'setup', 'persist', 'cleanup', 'unfinished']) {
    assert.ok(report.timingNote.toLowerCase().includes(concept), `Timing disclosure must explain ${concept}.`);
  }
}

async function assertFinalEvidence(harness, report) {
  assert.deepEqual(harness.setupErrors, [], 'The benchmark must not swallow fixture preparation failures.');
  assert.deepEqual(await readReport(harness.directory()), report);
  assert.equal(report.durationMs, Math.round(harness.snapshots.at(-1).at),
    'Overall wall time includes setup, earlier persistence and final backend/state cleanup.');
  assertTimingNote(report);
}

test('live timings separate awaited generation from grading and preserve rounded totals in progress evidence', { timeout: 10_000 }, async t => {
  const harness = await timingFixture(t);
  const report = await harness.run();
  assert.equal(report.status, 'completed');
  assertTimings(report, harness.starts);
  assert.equal(report.generations, factoryBenchmarkScenarios.length);
  assert.ok(report.results.every(row => !row.accepted && row.repairEvidence === 'checkpoint'));
  assert.deepEqual(report.results.map(row => [row.generationDurationMs, row.gradingDurationMs, row.durationMs]),
    factoryBenchmarkScenarios.map(() => [31, 2, 33]), 'Round the total once, then derive grading to avoid an extra millisecond.');
  for (const [index, context] of harness.starts.entries()) assertTimings(context.before, harness.starts.slice(0, index));
  assertTimings(harness.snapshots[0].report, []);
  assert.ok(report.durationMs > report.generationDurationMs + report.gradingDurationMs + 100,
    'Injected setup and persistence costs must remain outside the per-generation phases.');
  await assertFinalEvidence(harness, report);
});

test('timed-out generation includes awaited stop cleanup before repair lookup and grading', { timeout: 10_000 }, async t => {
  const harness = await timingFixture(t, { timedOut: true });
  const report = await harness.run();
  assertTimings(report, harness.starts);
  assert.deepEqual(harness.stops, [0]);
  const first = report.results[0];
  assert.equal(first.generationDurationMs, 142);
  assert.equal(first.gradingDurationMs, 3);
  assert.equal(first.durationMs, 145);
  assert.equal(first.timedOut, true);
  assert.ok(first.failureReasons.includes('generation-timed-out'));
  assert.ok(report.results.slice(1).every(row => !row.timedOut));
  await assertFinalEvidence(harness, report);
});

test('failed later grading retains completed phase totals and excludes the unfinished generation', { timeout: 10_000 }, async t => {
  const harness = await timingFixture(t, { failGradingAt: 2 });
  await assert.rejects(harness.run, /Live benchmark did not complete/);
  const report = await readReport(harness.directory());
  assert.equal(report.status, 'failed');
  assert.equal(harness.starts.length, 3);
  assertTimings(report, harness.starts.slice(0, 2));
  assert.deepEqual(report.results, harness.starts[2].before.results);
  assert.equal(report.activeGeneration.projectId, harness.starts[2].project.id);
  assert.equal(report.generationDurationMs, 62);
  assert.equal(report.gradingDurationMs, 4);
  assert.ok(report.durationMs > report.generationDurationMs + report.gradingDurationMs + 141,
    'Overall time also contains the injected setup, unfinished run and final cleanup costs.');
  await assertFinalEvidence(harness, report);
});

test('accepted CLI attribution includes independent holdout evidence, source checks and runtime cleanup in grading', { timeout: 30_000 }, async t => {
  const harness = await timingFixture(t, { acceptedCli: true });
  const report = await harness.run();
  const first = report.results[0], context = harness.starts[0];
  assert.equal(first.accepted, true);
  assert.equal(first.holdoutAccepted, true);
  assert.equal(first.sourceMatched, true);
  assert.equal(first.generationDurationMs, 31);
  assert.ok(context.sourceReads > 1, 'The real delivered contract and source identity must be read.');
  assert.equal(context.holdoutWrites, 1, 'The independent real CLI holdout must save evidence.');
  assert.equal(context.runtimeCloses, 1, 'The clean runtime must finish asynchronous cleanup.');
  assertTimings(report, harness.starts);
  assert.ok(first.gradingDurationMs > report.results[1].gradingDurationMs + 14);
  const holdout = JSON.parse(await fs.readFile(path.join(report.output, `${context.project.id}-holdout-report.json`), 'utf8'));
  assert.equal(holdout.status, 'passed');
  await assertFinalEvidence(harness, report);
});
