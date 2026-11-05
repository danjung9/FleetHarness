import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as benchmark from '../scripts/benchmark-factory.mjs';
import { parseSolutionContract, parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { factoryBrowserHoldoutPlan } from '../scripts/factory-browser-holdout.mjs';
import { createHash } from 'node:crypto';
import { sourceHash } from '../dist-electron/electron/storage.js';

const browserScenario = benchmark.factoryBenchmarkScenarios.find(scenario => scenario.id === 'browser-integration');
const cliScenario = benchmark.factoryBenchmarkScenarios.find(scenario => scenario.id === 'algorithm');

function manifest(profile) {
  const command = { runtime: 'node', entrypoint: 'engine.mjs', args: [] };
  return profile === 'browser'
    ? { profile, files: ['engine.mjs', 'index.html'], requiredEnv: [], entrypoint: 'index.html', evaluator: command }
    : { profile, files: ['engine.mjs'], requiredEnv: [], command,
      ...(profile === 'service' ? { healthPath: '/health', invokePath: '/compute' } : {}) };
}

// Synthetic pipeline evidence wraps actual host scoring. It does not claim a real
// model generated the application or that a browser/visual review was performed.
async function scoredProject(scenario, profile = 'cli', complete = true) {
  const solution = parseSolutionContract({ schemaVersion: 1, objective: scenario.description, runtime: manifest(profile),
    capabilities: [{ id: scenario.id, kind: scenario.kind, description: scenario.description, criterionIds: ['R1'],
      required: true, evaluationIds: ['factory-holdout'] }] },
  [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Host-held external benchmark cases' }]);
  const plan = parseEvaluationPlan({ schemaVersion: 1, evaluations: [{ id: 'factory-holdout', capabilityId: scenario.id,
    description: scenario.description, dataset: { name: scenario.id + '-heldout', version: '1', provenance: 'synthetic' },
    cases: scenario.cases.slice(1), evaluator: scenario.evaluator, threshold: 1, trials: 1,
    ...(scenario.evaluator === 'numeric' ? { tolerance: 0 } : {}) }] }, solution);
  const solve = new Function('return (' + scenario.correct + ')')();
  const provenance = { profile, filesHash: 'fixture-host-runtime', runtime: 'node', environmentNames: [] };
  const evaluated = await runSolutionEvaluation({ provenance, invoke: async input => solve(input),
    redactOutput: value => value, redactMessage: value => value }, solution, plan);
  assert.equal(evaluated.status, 'passed', 'The independent host scorer must accept the fixture engine.');
  const journeys = profile === 'cli' ? [] : ['primary', 'recovery'].flatMap(id => ['desktop', 'narrow'].map(viewport =>
    ({ id, viewport, title: id, status: 'passed', detail: 'Synthetic grading fixture' })));
  const project = { status: 'review', report: { sourceHash: 'a'.repeat(64), exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0, quality: {
    schemaVersion: profile === 'cli' ? 3 : 2, contractHash: 'fixture-contract', status: 'passed', requirementsMet: complete,
    errors: [], expectedJourneys: journeys.length, journeys,
    criteria: [{ criterionId: 'R1', requirement: 'Compute the requested result', status: 'passed', detail: 'Host scored', capabilityIds: [scenario.id] },
      { criterionId: 'R2', requirement: 'Provide the requested interface and error handling', status: complete ? 'passed' : 'unverified',
        detail: complete ? 'Synthetic grading fixture' : 'Deferred browser interface', capabilityIds: [] }],
    package: { status: 'passed', cleanCopy: true, profile, filesHash: provenance.filesHash, detail: 'Synthetic grading fixture' },
    capabilities: [{ id: scenario.id, required: true, criterionIds: ['R1'], evaluationIds: ['factory-holdout'], status: 'passed', detail: 'Host scored' }],
    solutionEvaluation: evaluated
  } } };
  assert.equal(reportPassed(project.report, true), true, 'The fixture must satisfy the existing useful-prototype quality gate.');
  return { project, solution, evaluated };
}

function grade(scenario, project, deliveredProfile, overrides = {}) {
  assert.equal(typeof benchmark.gradeLiveBenchmarkResult, 'function', 'Live completion grading must be exported for independent tests.');
  const plan = factoryBrowserHoldoutPlan();
  // Synthetic grading-only evidence. The separate caller/holdout regressions
  // exercise real clean runtimes and Chromium; this helper does not claim either.
  const browserHoldout = { schemaVersion: 1, status: 'passed', plan,
    contractHash: createHash('sha256').update(JSON.stringify(plan)).digest('hex'), expectedJourneys: 4, errors: [],
    runtime: { profile: deliveredProfile, filesHash: 'fixture-host-runtime' },
    journeys: plan.journeys.flatMap(journey => ['desktop', 'narrow'].map(viewport => ({ id: journey.id, viewport, status: 'passed' }))) };
  return benchmark.gradeLiveBenchmarkResult({ scenario, project, deliveredProfile, holdoutAccepted: true, holdoutScore: 1,
    holdoutFilesHash: 'fixture-host-runtime', holdoutSourceHashBefore: 'a'.repeat(64), holdoutSourceHashAfter: 'a'.repeat(64), browserHoldout, ...overrides });
}

test('every live benchmark brief declares its required delivery interface', () => {
  assert.equal(benchmark.factoryBenchmarkScenarios.length, 6);
  assert.deepEqual(benchmark.factoryBenchmarkScenarios.map(scenario => [scenario.id, scenario.profile]), [
    ['algorithm', 'cli'], ['optimization', 'cli'], ['prediction', 'cli'], ['retrieval', 'cli'], ['workflow', 'cli'], ['browser-integration', 'browser']
  ]);
});

test('live completion rejects a correct CLI core with its required browser interface deferred', async () => {
  const { project, solution, evaluated } = await scoredProject(browserScenario, 'cli', false);
  assert.equal(project.status === 'review' && reportPassed(project.report, true) && evaluated.status === 'passed', true,
    'The previous pipeline-and-core predicate falsely accepted this incomplete browser task.');
  const result = grade(browserScenario, project, solution.runtime.profile);
  assert.equal(result.pipelineAccepted, true);
  assert.equal(result.holdoutAccepted, true);
  assert.equal(result.holdoutScore, 1);
  assert.equal(result.requirementsMet, false);
  assert.equal(result.runtimeProfileMatched, false);
  assert.equal(result.accepted, false);
  assert.ok(result.failureReasons.includes('requirements-incomplete'));
  assert.ok(result.failureReasons.includes('delivery-profile-mismatch'));
});

test('complete CLI work and browser or service interfaces retain separate passing evidence', async t => {
  for (const [scenario, profile] of [[cliScenario, 'cli'], [browserScenario, 'browser'], [browserScenario, 'service']]) {
    await t.test(profile, async () => {
      const { project } = await scoredProject(scenario, profile);
      const before = structuredClone(project);
      const result = grade(scenario, project, profile);
      assert.equal(result.accepted, true);
      assert.equal(result.pipelineAccepted, true);
      assert.equal(result.holdoutAccepted, true);
      assert.equal(result.requirementsMet, true);
      assert.equal(result.runtimeProfileMatched, true);
      assert.equal(result.deliveredProfile, profile);
      assert.deepEqual(result.expectedProfiles, profile === 'cli' ? ['cli'] : ['browser', 'service']);
      assert.deepEqual(result.failureReasons, []);
      assert.deepEqual(project, before, 'Grading must not rewrite evidence to make a task complete.');
    });
  }
});

test('declared complete coverage cannot hide a deferred or failed criterion', async t => {
  for (const status of ['unverified', 'failed']) await t.test(status, async () => {
    const { project } = await scoredProject(cliScenario);
    project.report.quality.criteria[1].status = status;
    const result = grade(cliScenario, project, 'cli');
    assert.equal(result.requirementsMet, false);
    assert.equal(result.accepted, false);
    assert.ok(result.failureReasons.includes('requirements-incomplete'));
  });
});

test('task profile and parsed delivery must match the independently verified package profile', async t => {
  for (const [scenario, actualProfile, deliveredProfile] of [
    [browserScenario, 'cli', 'cli'], [cliScenario, 'browser', 'browser'], [browserScenario, 'browser', 'service'],
    [browserScenario, 'service', 'browser']
  ]) await t.test(`${scenario.id}: ${actualProfile} evidence, ${deliveredProfile} delivery`, async () => {
    const { project } = await scoredProject(scenario, actualProfile);
    const result = grade(scenario, project, deliveredProfile);
    assert.equal(result.pipelineAccepted, true);
    assert.equal(result.requirementsMet, true);
    assert.equal(result.runtimeProfileMatched, false);
    assert.equal(result.accepted, false);
    assert.ok(result.failureReasons.includes('delivery-profile-mismatch'));
  });
});

test('missing profile, scenario declaration, report or coverage never counts as complete', async t => {
  const mutations = [
    ['no delivered profile', input => { delete input.deliveredProfile; }],
    ['no scenario profile', input => { input.scenario = { id: cliScenario.id }; }],
    ['unknown scenario profile', input => { input.scenario = { ...cliScenario, profile: 'desktop' }; }],
    ['no report', input => { delete input.project.report; }],
    ['no package evidence', input => { delete input.project.report.quality.package; }],
    ['no requirement completion', input => { delete input.project.report.quality.requirementsMet; }],
    ['truthy nonboolean completion', input => { input.project.report.quality.requirementsMet = 'true'; }],
    ['no criteria', input => { input.project.report.quality.criteria = []; }],
    ['missing criteria array', input => { delete input.project.report.quality.criteria; }],
    ['null criteria array', input => { input.project.report.quality.criteria = null; }],
    ['null criterion entry', input => { input.project.report.quality.criteria[1] = null; }],
    ['missing errors array', input => { delete input.project.report.quality.errors; }],
    ['missing journeys array', input => { delete input.project.report.quality.journeys; }],
    ['missing core evaluations', input => { delete input.project.report.quality.solutionEvaluation.evaluations; }]
  ];
  for (const [name, mutate] of mutations) await t.test(name, async () => {
    const { project } = await scoredProject(cliScenario);
    const input = { scenario: cliScenario, project, deliveredProfile: 'cli', holdoutAccepted: true, holdoutScore: 1 };
    mutate(input);
    const result = benchmark.gradeLiveBenchmarkResult(input);
    assert.equal(result.accepted, false);
    assert.ok(result.failureReasons.length > 0);
    if (name === 'no delivered profile') assert.equal(result.deliveredProfile, null);
  });
});

test('live completion requires the evidence version promised by the current project', async () => {
  const { project } = await scoredProject(browserScenario, 'browser');
  assert.equal(project.report.quality.schemaVersion, 2);
  project.qualityVersion = 3;
  const result = grade(browserScenario, project, 'browser');
  assert.equal(result.requirementsMet, true);
  assert.equal(result.runtimeProfileMatched, true);
  assert.equal(result.pipelineAccepted, false);
  assert.equal(result.accepted, false);
  assert.ok(result.failureReasons.includes('pipeline-not-accepted'));
});

test('browser task completion requires independent evidence from the same core package', async t => {
  const { project } = await scoredProject(browserScenario, 'browser');
  for (const overrides of [{ browserHoldout: undefined }, { holdoutFilesHash: undefined }, { holdoutFilesHash: 'different-package' }]) {
    await t.test(JSON.stringify(overrides), () => {
      const result = grade(browserScenario, project, 'browser', overrides);
      assert.equal(result.pipelineAccepted, true);
      assert.equal(result.holdoutAccepted, true);
      assert.equal(result.browserHoldoutRequired, true);
      assert.equal(result.browserHoldoutAccepted, false);
      assert.equal(result.accepted, false);
      assert.ok(result.failureReasons.includes('browser-holdout-not-passed'));
    });
  }
});

test('pipeline failure, core failure and timeout remain independent blocking outcomes', async t => {
  const mutations = [
    ['pipeline-not-accepted', (project, options) => { project.status = 'failed'; }],
    ['pipeline-not-accepted', (project, options) => { project.report.failed = 1; }],
    ['core-holdout-not-passed', (project, options) => { options.holdoutAccepted = false; options.holdoutScore = 0; }],
    ['core-holdout-not-passed', (project, options) => { options.holdoutAccepted = 'true'; }],
    ['generation-timed-out', (project, options) => { options.timedOut = true; }]
  ];
  for (const [reason, mutate] of mutations) await t.test(reason, async () => {
    const { project } = await scoredProject(cliScenario), options = {};
    mutate(project, options);
    const result = grade(cliScenario, project, 'cli', options);
    assert.equal(result.accepted, false);
    assert.ok(result.failureReasons.includes(reason));
    if (reason === 'core-holdout-not-passed') assert.equal(result.holdoutAccepted, false);
  });
});

test('real live benchmark caller retains core successes but rejects the missing browser task without model calls', { timeout: 30_000 }, async t => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-live-completion-test-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const { FleetBackend } = await import('../dist-electron/electron/pi-backend.js');
  let generated = 0;
  // Stub every model entry point before invoking the real benchmark. Clean
  // package execution, external scoring, report serialization and grading stay real.
  t.mock.method(FleetBackend.prototype, 'init', async () => {});
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'stopAll', async () => {});
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const project = this.store.project(id);
    const scenario = benchmark.factoryBenchmarkScenarios.find(item => project.description === item.description);
    assert.ok(scenario);
    generated++;
    const fixture = await scoredProject(scenario, 'cli', scenario.id !== 'browser-integration');
    Object.assign(project, fixture.project, { workspace: path.join(output, id) });
    await fs.mkdir(project.workspace, { recursive: true });
    await fs.writeFile(path.join(project.workspace, 'solution-contract.json'), JSON.stringify(fixture.solution));
    await fs.writeFile(path.join(project.workspace, 'engine.mjs'),
      'import {readFileSync} from "node:fs"; const solve = ' + scenario.correct + '; process.stdout.write(JSON.stringify(solve(JSON.parse(readFileSync(0,"utf8")))));\n');
    // Bind the synthetic pipeline summary to the actual declared fixture files.
    const runtime = await prepareSolutionRuntime(project.workspace, fixture.solution.runtime, process.execPath);
    try {
      project.report.quality.package.filesHash = runtime.provenance.filesHash;
      project.report.quality.solutionEvaluation.runtime = runtime.provenance;
    } finally { await runtime.close(); }
    project.report.sourceHash = await sourceHash(project.workspace);
  });
  const result = await benchmark.benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', runs: 1, output });
  assert.equal(result.schemaVersion, 7);
  assert.equal(generated, 6);
  assert.equal(result.generations, 6);
  assert.ok(result.results.every(item => item.pipelineAccepted && item.holdoutAccepted && item.holdoutScore === 1),
    'The real external runtime and scorer must pass every known correct computational engine.');
  assert.equal(result.accepted, 5, 'A correct CLI calculator cannot complete the sixth browser-interface task.');
  assert.equal(result.fullyCovered, 5);
  const browser = result.results.find(item => item.scenario === 'browser-integration');
  assert.equal(browser.accepted, false);
  assert.equal(browser.runtimeProfileMatched, false);
  assert.equal(browser.requirementsMet, false);
  assert.deepEqual(browser.expectedProfiles, ['browser', 'service']);
  assert.equal(browser.deliveredProfile, 'cli');
  assert.ok(browser.failureReasons.includes('requirements-incomplete'));
  assert.ok(browser.failureReasons.includes('delivery-profile-mismatch'));
  const saved = JSON.parse(await fs.readFile(path.join(result.output, 'benchmark-report.json'), 'utf8'));
  assert.equal(saved.schemaVersion, 7);
  assert.equal(saved.accepted, 5);
  assert.deepEqual(saved.results.find(item => item.scenario === browser.scenario), browser);
});
