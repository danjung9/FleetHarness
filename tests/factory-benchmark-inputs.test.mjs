import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';
import { factoryBrowserHoldoutPlan } from '../scripts/factory-browser-holdout.mjs';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { loadQualityContract, sealEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonHash = value => sha256(JSON.stringify(value));
const privateFailure = 'fixture-provider-secret-MUST-NOT-APPEAR';
const readReport = async root => JSON.parse(await fs.readFile(path.join(root, 'benchmark-report.json'), 'utf8'));
const projectFields = project => Object.fromEntries(['title', 'description', 'criteria', 'resources', 'dataInputs']
  .map(name => [name, structuredClone(project[name])]));

async function readInputs(report) {
  if (!report?.benchmarkInputs?.path) return null;
  const bytes = await fs.readFile(report.benchmarkInputs.path);
  return { bytes, manifest: JSON.parse(bytes) };
}

function preserveScenarios(t) {
  const originals = [...factoryBenchmarkScenarios], copies = structuredClone(originals);
  t.after(() => {
    for (const [index, original] of originals.entries()) {
      for (const key of Object.keys(original)) delete original[key];
      Object.assign(original, copies[index]);
    }
    factoryBenchmarkScenarios.splice(0, factoryBenchmarkScenarios.length, ...originals);
  });
  return copies;
}

async function lifecycle(t, { init, start, stopAll } = {}) {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-benchmark-inputs-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const initial = [], starts = [], cleanup = [], startFailures = [];
  // Every model entry point is replaced. The benchmark, Store, snapshot I/O,
  // final grading and (in one regression) CLI verification remain real.
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'init', async function () {
    const report = await readReport(this.store.root);
    const context = { backend: this, report, inputs: await readInputs(report) };
    initial.push(context);
    await init?.(context);
  });
  t.mock.method(FleetBackend.prototype, 'stop', async () => {});
  t.mock.method(FleetBackend.prototype, 'stopAll', async function () {
    const report = await readReport(this.store.root);
    const context = { backend: this, report };
    cleanup.push(context);
    await stopAll?.(context);
  });
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const project = this.store.project(id), report = await readReport(this.store.root);
    project.status = 'failed';
    const context = { backend: this, project, projectInput: projectFields(project), report,
      inputs: await readInputs(report), index: starts.length };
    starts.push(context);
    try { await start?.(context); }
    catch (error) { startFailures.push(error); throw error; }
  });
  return { output, initial, starts, cleanup,
    run: async (options = {}) => {
      const result = await benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', output, ...options });
      // Generation errors are deliberately caught by the real caller; an
      // assertion or fixture setup failure inside our stub must still fail.
      assert.equal(startFailures.length, 0, startFailures.map(error => error.stack).join('\n'));
      return result;
    },
    finalReport: async () => {
      const names = (await fs.readdir(output)).filter(name => name.startsWith('fleet-live-benchmark-'));
      assert.equal(names.length, 1);
      return readReport(path.join(output, names[0]));
    }
  };
}

function assertInputIdentity(report, inputs) {
  assert.ok(report.benchmarkInputs, 'Every progress report must identify its durable benchmark inputs.');
  assert.equal(path.isAbsolute(report.benchmarkInputs.path), true);
  assert.equal(path.dirname(report.benchmarkInputs.path), report.output, 'Answer keys remain in host evidence outside generated workspaces.');
  assert.ok(inputs, 'Input bytes must already exist when the report refers to them.');
  assert.equal(report.benchmarkInputs.sha256, sha256(inputs.bytes), 'The identity must hash the exact saved bytes.');
  assert.equal(inputs.manifest.schemaVersion, 1);
  assert.deepEqual(inputs.manifest.execution, { backend: 'pi', provider: 'fixture', model: 'no-model',
    runsPerScenario: report.runsPerScenario, generationTimeoutMs: report.generationTimeoutMs });
}

test('live benchmark saves exact input identities before model initialization and every repeated generation', async t => {
  const original = structuredClone(factoryBenchmarkScenarios), harness = await lifecycle(t);
  const result = await harness.run({ runs: 2 });
  assert.equal(result.status, 'completed');
  assert.equal(result.generationTimeoutMs, 30 * 60_000);
  assert.equal(result.plannedGenerations, original.length * 2);
  assert.equal(harness.starts.length, original.length * 2);
  const first = harness.initial[0];
  assert.equal(first.report.status, 'running');
  assert.equal(first.report.generations, 0);
  assertInputIdentity(first.report, first.inputs);
  const saved = await readInputs(result);
  assertInputIdentity(result, saved);
  assert.deepEqual(saved.bytes, first.inputs.bytes);
  assert.deepEqual(saved.manifest.browserHoldoutPlan, factoryBrowserHoldoutPlan());
  assert.equal(saved.manifest.scenarios.length, original.length);
  for (const [index, scenario] of saved.manifest.scenarios.entries()) {
    const expected = original[index], { dataInputs, ...task } = scenario.projectInput;
    assert.equal(scenario.id, expected.id);
    assert.equal(scenario.kind, expected.kind);
    assert.equal(scenario.profile, expected.profile);
    assert.equal(task.title, `Benchmark ${expected.title}`);
    assert.equal(task.description, expected.description);
    assert.equal(task.criteria[0], expected.description);
    assert.deepEqual(scenario.trialTitles, [1, 2].map(trial => `Benchmark ${expected.title} (${trial})`));
    assert.deepEqual(dataInputs, [{ name: 'development-cases.json', kind: 'text',
      content: JSON.stringify({ provenance: 'synthetic', examples: expected.cases.slice(0, 1) }, null, 2) }]);
    assert.deepEqual(scenario.holdoutPlan.evaluations[0].cases, expected.cases.slice(1));
    assert.equal(scenario.holdoutPlan.evaluations[0].evaluator, expected.evaluator);
    assert.equal(scenario.holdoutPlan.evaluations[0].threshold, 1);
    assert.equal(scenario.taskSha256, jsonHash(task));
    assert.equal(scenario.developmentSha256, jsonHash(dataInputs));
    assert.equal(scenario.holdoutSha256, jsonHash(scenario.holdoutPlan));
    for (const key of ['correct', 'broken', 'mutation']) assert.equal(Object.hasOwn(scenario, key), false, 'Reference implementation code is not a benchmark input.');
    assert.equal(saved.bytes.includes(Buffer.from(expected.correct)), false);
  }
  for (const [index, started] of harness.starts.entries()) {
    const scenario = saved.manifest.scenarios[index % original.length], trial = Math.floor(index / original.length) + 1;
    assertInputIdentity(started.report, started.inputs);
    assert.deepEqual(started.inputs.bytes, saved.bytes, 'Every trial consumes the same frozen input artifact.');
    assert.deepEqual(started.projectInput, { ...scenario.projectInput, title: scenario.trialTitles[trial - 1] },
      'Only the frozen public task and first development case may enter the project.');
    assert.equal(started.report.activeGeneration.scenario, scenario.id);
    assert.equal(started.report.activeGeneration.trial, trial);
  }
  assert.deepEqual(await readReport(result.output), result);
});

test('different generation budgets have distinct provenance while task and holdout identities stay stable', async t => {
  const harness = await lifecycle(t);
  const shorter = await harness.run({ timeoutMs: 10_000 }), longer = await harness.run({ timeoutMs: 1_000_000 });
  assert.equal(shorter.generationTimeoutMs, 10_000);
  assert.equal(longer.generationTimeoutMs, 1_000_000);
  const before = await readInputs(shorter), after = await readInputs(longer);
  assertInputIdentity(shorter, before);
  assertInputIdentity(longer, after);
  assert.notEqual(shorter.benchmarkInputs.sha256, longer.benchmarkInputs.sha256);
  assert.deepEqual(before.manifest.scenarios, after.manifest.scenarios);
});

test('task, development and held-out reference changes are visible in independently scoped identities', async t => {
  for (const [name, field, mutate] of [
    ['task', 'taskSha256', scenario => { scenario.title += ' revised task'; }],
    ['development', 'developmentSha256', scenario => { scenario.cases[0].expected.total = 101; }],
    ['holdout', 'holdoutSha256', scenario => { scenario.cases[1].expected.total = 102; }]
  ]) await t.test(name, async t => {
    preserveScenarios(t);
    const harness = await lifecycle(t), original = await harness.run();
    mutate(factoryBenchmarkScenarios[0]);
    const changed = await harness.run(), before = await readInputs(original), after = await readInputs(changed);
    assertInputIdentity(original, before);
    assertInputIdentity(changed, after);
    assert.notEqual(original.benchmarkInputs.sha256, changed.benchmarkInputs.sha256);
    for (const key of ['taskSha256', 'developmentSha256', 'holdoutSha256']) {
      if (key === field) assert.notEqual(before.manifest.scenarios[0][key], after.manifest.scenarios[0][key]);
      else assert.equal(before.manifest.scenarios[0][key], after.manifest.scenarios[0][key]);
    }
    assert.deepEqual(before.manifest.scenarios.slice(1), after.manifest.scenarios.slice(1));
  });
});

test('live benchmark captures task membership and values before its first asynchronous boundary', async t => {
  const original = preserveScenarios(t), harness = await lifecycle(t);
  const running = harness.run();
  factoryBenchmarkScenarios[0].description = 'Changed after invocation but before asynchronous setup completed.';
  factoryBenchmarkScenarios[0].cases[0].input.values.push(700);
  factoryBenchmarkScenarios[0].cases[1].expected.total = 701;
  factoryBenchmarkScenarios.splice(1);
  const result = await running;
  assert.equal(result.generations, original.length);
  assert.equal(result.plannedGenerations, original.length);
  assert.deepEqual(result.results.map(row => row.scenario), original.map(scenario => scenario.id));
  assert.equal(harness.starts[0].projectInput.description, original[0].description);
  const saved = await readInputs(result);
  assertInputIdentity(result, saved);
  assert.deepEqual(saved.manifest.scenarios[0].holdoutPlan.evaluations[0].cases, original[0].cases.slice(1));
  assert.deepEqual(JSON.parse(harness.starts[0].projectInput.dataInputs[0].content).examples, original[0].cases.slice(0, 1));
});

async function verifiedAlgorithm(directory, scenario, id) {
  const workspace = path.join(directory, id);
  await fs.mkdir(workspace, { recursive: true });
  const files = {
    'solution-contract.json': { schemaVersion: 1, objective: scenario.description,
      capabilities: [{ id: scenario.id, kind: scenario.kind, description: scenario.description, criterionIds: ['R1'], required: true, evaluationIds: ['reference'] }],
      runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } },
    'evaluation-plan.json': { schemaVersion: 1, evaluations: [{ id: 'reference', capabilityId: scenario.id, description: scenario.description,
      dataset: { name: 'frozen-input-test', version: '1', provenance: 'synthetic' }, cases: scenario.cases,
      evaluator: 'numeric', threshold: 1, trials: 1, tolerance: 0 }] },
    'acceptance-plan.json': { schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: scenario.description,
      journeyIds: [], capabilityIds: [scenario.id] }], journeys: [] },
    'ux-spec.json': { schemaVersion: 1, audience: 'Operator', primaryTask: 'Submit numeric values', successOutcome: 'Read the computed total',
      screens: [{ name: 'Result', purpose: 'Read the sum', primaryAction: 'Calculate' }],
      states: { empty: 'Accept no values', loading: 'Wait for completion', error: 'Correct the input', success: 'Show the total' },
      persistence: 'No persistent state', recovery: 'Correct and retry', keyboard: 'CLI stdin' },
    'engine.mjs': 'import {readFileSync} from "node:fs"; const input=JSON.parse(readFileSync(0,"utf8")); process.stdout.write(JSON.stringify({total:input.values.reduce((sum,value)=>sum+value,0)}));\n',
    'smoke.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; test("fixture smoke",()=>assert.equal(1+2,3));\n'
  };
  for (const [name, value] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), typeof value === 'string' ? value : JSON.stringify(value));
  const contract = await loadQualityContract(workspace, [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Independent arithmetic cases' }], true);
  await sealEvaluationPlan(workspace, contract, path.join(directory, `${id}-answers.json`));
  const report = await verifyApplication(workspace, process.execPath, contract, undefined, { requireVisualReview: true });
  assert.equal(reportPassed(report, 3), true, JSON.stringify(report));
  return { workspace, report, status: 'review', qualityVersion: 3 };
}

test('real core holdouts use the saved references after exported scenarios change during initialization', { timeout: 30_000 }, async t => {
  const original = preserveScenarios(t);
  const harness = await lifecycle(t, {
    init: () => {
      factoryBenchmarkScenarios[0].cases[1].expected.total = 999;
      factoryBenchmarkScenarios[0].cases[2].input.values.push(500);
      factoryBenchmarkScenarios[0].title = 'Changed title after snapshot';
      factoryBenchmarkScenarios.splice(1);
    },
    start: async ({ backend, project, index }) => {
      if (index === 0) Object.assign(project, await verifiedAlgorithm(backend.store.root, original[0], project.id));
    }
  });
  const result = await harness.run();
  assert.equal(result.generations, original.length);
  assert.equal(result.plannedGenerations, original.length);
  assert.deepEqual(result.results.map(row => row.scenario), original.map(scenario => scenario.id));
  const algorithm = result.results[0];
  assert.equal(algorithm.pipelineAccepted, true);
  assert.equal(algorithm.holdoutAccepted, true, 'Changing public exports must not rewrite the frozen answer keys or inputs.');
  assert.equal(algorithm.holdoutScore, 1);
  assert.equal(algorithm.accepted, true, JSON.stringify(algorithm));
  const evidence = JSON.parse(await fs.readFile(path.join(result.output, `${harness.starts[0].project.id}-holdout-report.json`), 'utf8'));
  assert.deepEqual(evidence.evaluations[0].cases.map(entry => entry.output), original[0].cases.slice(1).map(entry => entry.expected));
  const saved = await readInputs(result);
  assertInputIdentity(result, saved);
  assert.deepEqual(saved.manifest.scenarios[0].holdoutPlan.evaluations[0].cases, original[0].cases.slice(1));
});

test('initialization failure retains the original input artifact without exposing provider details', async t => {
  const harness = await lifecycle(t, { init: () => { throw new Error(privateFailure); } });
  await assert.rejects(harness.run(), error => error instanceof Error && !error.message.includes(privateFailure));
  assert.equal(harness.starts.length, 0);
  const result = await harness.finalReport();
  assert.equal(result.status, 'failed');
  assert.equal(result.generations, 0);
  const saved = await readInputs(result);
  assertInputIdentity(result, saved);
  assert.deepEqual(saved.bytes, harness.initial[0].inputs.bytes);
  assert.equal(JSON.stringify(result).includes(privateFailure), false);
});

test('a failed input-manifest write prevents all backend initialization and model generation', async t => {
  const harness = await lifecycle(t), writeFile = fs.writeFile.bind(fs);
  let attempted = 0;
  t.mock.method(fs, 'writeFile', async (file, ...args) => {
    if (typeof file === 'string' && path.basename(file) === 'benchmark-inputs.json') {
      attempted++;
      throw new Error('Injected benchmark manifest write failure');
    }
    return writeFile(file, ...args);
  });
  await assert.rejects(harness.run(), /Live benchmark did not complete/);
  assert.equal(attempted, 1);
  assert.equal(harness.initial.length, 0);
  assert.equal(harness.starts.length, 0);
  const result = await harness.finalReport();
  assert.equal(result.status, 'failed');
  assert.equal(result.generations, 0);
});

test('missing or changed saved inputs stop further work and cannot produce a completed report', async t => {
  for (const phase of ['generation', 'cleanup']) for (const mutation of ['delete', 'tamper']) {
    await t.test(`${phase}: ${mutation}`, async t => {
      let changed = false, expectedIdentity;
      const corrupt = async ({ report }) => {
        if (changed) return;
        assert.ok(report.benchmarkInputs, 'The active work must identify its saved reference artifact.');
        expectedIdentity = structuredClone(report.benchmarkInputs);
        if (mutation === 'delete') await fs.unlink(report.benchmarkInputs.path);
        else await fs.appendFile(report.benchmarkInputs.path, '\n');
        changed = true;
      };
      const harness = await lifecycle(t, phase === 'generation' ? { start: corrupt } : { stopAll: corrupt });
      await assert.rejects(harness.run(), /Live benchmark did not complete/);
      assert.equal(changed, true);
      assert.equal(harness.starts.length, phase === 'generation' ? 1 : factoryBenchmarkScenarios.length,
        'Corrupting saved reference evidence must stop the next model call.');
      const result = await harness.finalReport();
      assert.equal(result.status, 'failed');
      assert.deepEqual(result.benchmarkInputs, expectedIdentity, 'Failure must not bless changed bytes with a new identity.');
      if (mutation === 'tamper') assert.notEqual(sha256(await fs.readFile(expectedIdentity.path)), expectedIdentity.sha256);
      else await assert.rejects(fs.readFile(expectedIdentity.path), { code: 'ENOENT' });
    });
  }
});
