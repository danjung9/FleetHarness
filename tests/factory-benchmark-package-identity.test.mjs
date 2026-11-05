import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { benchmarkLiveFactory, factoryBenchmarkScenarios, gradeLiveBenchmarkResult } from '../scripts/benchmark-factory.mjs';
import { factoryBrowserHoldoutPlan } from '../scripts/factory-browser-holdout.mjs';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { loadQualityContract, sealEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

const cliScenario = factoryBenchmarkScenarios.find(scenario => scenario.id === 'algorithm');
const browserScenario = factoryBenchmarkScenarios.find(scenario => scenario.id === 'browser-integration');

// Grading-only fixtures use the real host scorer with synthetic pipeline and
// browser evidence. The caller regression below executes real clean packages.
async function gradeInput(profile) {
  const scenario = profile === 'cli' ? cliScenario : browserScenario;
  const filesHash = 'pipeline-package-a';
  const capability = { id: scenario.id, kind: scenario.kind, description: scenario.description,
    criterionIds: ['R1'], required: true, evaluationIds: ['reference-cases'] };
  const plan = { schemaVersion: 1, evaluations: [{ id: 'reference-cases', capabilityId: scenario.id,
    evaluator: scenario.evaluator, description: scenario.description, threshold: 1, trials: 1, tolerance: 0,
    dataset: { name: scenario.id, version: '1', provenance: 'synthetic' }, cases: scenario.cases }] };
  const solve = new Function('return (' + scenario.correct + ')')();
  const solutionEvaluation = await runSolutionEvaluation({ provenance: { profile, filesHash, runtime: 'node', environmentNames: [] },
    invoke: async input => solve(input), redactOutput: value => value, redactMessage: value => value },
  { schemaVersion: 1, objective: scenario.description, capabilities: [capability], runtime: { profile } }, plan);
  const journeys = profile === 'cli' ? [] : ['primary', 'recovery'].flatMap(id => ['desktop', 'narrow'].map(viewport =>
    ({ id, viewport, title: id, status: 'passed', detail: 'Synthetic grading fixture' })));
  const project = { status: 'review', qualityVersion: 2, report: { sourceHash: 'a'.repeat(64), exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0,
    quality: { schemaVersion: 2, contractHash: 'synthetic-contract', status: 'passed', requirementsMet: true, errors: [],
      criteria: [{ criterionId: 'R1', requirement: scenario.description, status: 'passed', capabilityIds: [scenario.id] }],
      expectedJourneys: journeys.length, journeys,
      capabilities: [{ ...capability, status: 'passed' }], solutionEvaluation,
      package: { status: 'passed', cleanCopy: true, profile, filesHash, detail: 'Synthetic grading fixture' } } } };
  assert.equal(reportPassed(project.report, project.qualityVersion), true);
  const browserPlan = factoryBrowserHoldoutPlan();
  const browserHoldout = { schemaVersion: 1, status: 'passed', plan: browserPlan,
    contractHash: createHash('sha256').update(JSON.stringify(browserPlan)).digest('hex'), expectedJourneys: 4, errors: [],
    runtime: { profile, filesHash }, journeys: browserPlan.journeys.flatMap(journey => ['desktop', 'narrow'].map(viewport =>
      ({ id: journey.id, viewport, status: 'passed' }))) };
  return { scenario, project, deliveredProfile: profile, holdoutAccepted: true, holdoutScore: 1, holdoutFilesHash: filesHash,
    holdoutSourceHashBefore: 'a'.repeat(64), holdoutSourceHashAfter: 'a'.repeat(64),
    ...(profile === 'cli' ? {} : { browserHoldout }) };
}

test('live benchmark acceptance binds CLI, browser and service evidence to identical declared files', async t => {
  for (const profile of ['cli', 'browser', 'service']) await t.test(profile, async () => {
    const input = await gradeInput(profile), before = structuredClone(input);
    const result = gradeLiveBenchmarkResult(input);
    assert.equal(result.accepted, true);
    assert.equal(result.runtimeFilesMatched, true);
    assert.equal(result.pipelineFilesHash, 'pipeline-package-a');
    assert.equal(result.holdoutFilesHash, 'pipeline-package-a');
    assert.equal(result.sourceMatched, true);
    assert.deepEqual(result.failureReasons, []);
    assert.deepEqual(input, before, 'Grading cannot mutate any pipeline or holdout evidence.');
  });
});

test('passing holdouts require valid matching verified source identities before and after execution', async t => {
  for (const profile of ['cli', 'browser', 'service']) for (const side of ['pipeline', 'before', 'after']) {
    await t.test(`${profile}: ${side}`, async () => {
      const input = await gradeInput(profile);
      for (const identity of [undefined, null, '', ' ', 42, false, [], {}, 'a'.repeat(63), 'A'.repeat(64), 'b'.repeat(64)]) {
        const changed = structuredClone(input);
        if (side === 'pipeline') changed.project.report.sourceHash = identity;
        if (side === 'before') changed.holdoutSourceHashBefore = identity;
        if (side === 'after') changed.holdoutSourceHashAfter = identity;
        const before = structuredClone(changed), result = gradeLiveBenchmarkResult(changed);
        assert.equal(result.pipelineAccepted, true);
        assert.equal(result.holdoutAccepted, true);
        assert.equal(result.runtimeFilesMatched, true);
        assert.equal(result.sourceMatched, false, `${side}: ${JSON.stringify(identity)}`);
        assert.equal(result.accepted, false);
        assert.deepEqual(result.failureReasons, ['verified-source-mismatch']);
        const field = side === 'pipeline' ? 'pipelineSourceHash' : side === 'before' ? 'holdoutSourceHashBefore' : 'holdoutSourceHashAfter';
        assert.equal(result[field], identity === 'b'.repeat(64) ? identity : null);
        assert.deepEqual(changed, before, 'Source identity checks must not rewrite verification evidence.');
      }
    });
  }
});

test('a passing external package cannot borrow pipeline evidence from different declared files', async t => {
  for (const profile of ['cli', 'browser', 'service']) await t.test(profile, async () => {
    const input = await gradeInput(profile);
    input.holdoutFilesHash = 'external-package-b';
    if (input.browserHoldout) input.browserHoldout.runtime.filesHash = 'external-package-b';
    const before = structuredClone(input), result = gradeLiveBenchmarkResult(input);
    assert.equal(result.pipelineAccepted, true);
    assert.equal(result.holdoutAccepted, true);
    assert.equal(result.browserHoldoutAccepted, profile === 'cli' ? null : true);
    assert.equal(result.accepted, false);
    assert.equal(result.runtimeFilesMatched, false);
    assert.equal(result.pipelineFilesHash, 'pipeline-package-a');
    assert.equal(result.holdoutFilesHash, 'external-package-b');
    assert.deepEqual(result.failureReasons, ['runtime-files-mismatch']);
    assert.deepEqual(input, before);
  });
});

test('missing and invalid package identities never count as matching evidence', async t => {
  const invalid = [undefined, null, '', ' ', '\t\n', 42, false, [], {}];
  for (const profile of ['cli', 'browser', 'service']) for (const side of ['pipeline', 'holdout', 'both']) {
    await t.test(`${profile}: ${side}`, async () => {
      for (const filesHash of invalid) {
        const input = await gradeInput(profile);
        if (side !== 'holdout') {
          input.project.report.quality.package.filesHash = filesHash;
          input.project.report.quality.solutionEvaluation.runtime.filesHash = filesHash;
        }
        if (side !== 'pipeline') input.holdoutFilesHash = filesHash;
        if (input.browserHoldout && side !== 'pipeline') input.browserHoldout.runtime.filesHash = filesHash;
        const before = structuredClone(input), result = gradeLiveBenchmarkResult(input);
        assert.equal(result.runtimeFilesMatched, false, `${side}: ${JSON.stringify(filesHash)}`);
        assert.equal(result.accepted, false);
        assert.equal(result.pipelineFilesHash, side === 'holdout' ? 'pipeline-package-a' : null);
        assert.equal(result.holdoutFilesHash, side === 'pipeline' ? 'pipeline-package-a' : null);
        assert.ok(result.failureReasons.includes('runtime-files-mismatch'));
        assert.deepEqual(input, before);
      }
    });
  }
});

const userExperience = {
  schemaVersion: 1, audience: 'Benchmark operator', primaryTask: 'Submit structured input', successOutcome: 'Inspect a checked result',
  screens: [{ name: 'Result', purpose: 'Inspect the computed output', primaryAction: 'Calculate' }],
  states: { empty: 'Accept an empty collection', loading: 'Wait for completion', error: 'Report invalid input', success: 'Show the computed result' },
  persistence: 'Only the state in the input transcript is verified', recovery: 'Correct the input and retry', keyboard: 'CLI stdin'
};

async function verifiedCliProject(directory, scenario, id) {
  const workspace = path.join(directory, id);
  await fs.mkdir(workspace, { recursive: true });
  const solution = { schemaVersion: 1, objective: scenario.description,
    capabilities: [{ id: scenario.id, kind: scenario.kind, description: scenario.description, criterionIds: ['R1'], required: true, evaluationIds: ['reference-cases'] }],
    runtime: { profile: 'cli', files: ['core.mjs', 'engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } };
  const files = {
    'solution-contract.json': solution,
    'evaluation-plan.json': { schemaVersion: 1, evaluations: [{ id: 'reference-cases', capabilityId: scenario.id,
      description: scenario.description, dataset: { name: scenario.id, version: '1', provenance: 'synthetic' },
      cases: scenario.cases, evaluator: scenario.evaluator, threshold: 1, trials: 1,
      ...(scenario.evaluator === 'numeric' ? { tolerance: 0 } : {}) }] },
    'acceptance-plan.json': { schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented',
      expectedOutcome: scenario.description, journeyIds: [], capabilityIds: [scenario.id] }], journeys: [] },
    'ux-spec.json': userExperience,
    'core.mjs': `export const solve = ${scenario.correct};\n`,
    'engine.mjs': 'import {readFileSync} from "node:fs"; import {solve} from "./core.mjs"; process.stdout.write(JSON.stringify(solve(JSON.parse(readFileSync(0,"utf8")))));\n',
    'smoke.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; import {solve} from "./core.mjs"; test("development case",()=>assert.deepEqual(solve(' + JSON.stringify(scenario.cases[0].input) + '),' + JSON.stringify(new Function('return (' + scenario.correct + ')')()(scenario.cases[0].input)) + '));\n'
  };
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), typeof content === 'string' ? content : JSON.stringify(content));
  const acceptance = [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Independent CLI benchmark references' }];
  const contract = await loadQualityContract(workspace, acceptance, true);
  await sealEvaluationPlan(workspace, contract, path.join(directory, `${id}-answers.json`));
  const report = await verifyApplication(workspace, process.execPath, contract, undefined, { requireVisualReview: true });
  assert.equal(reportPassed(report, 3), true, JSON.stringify(report));
  return { workspace, contract, report, status: 'review', qualityVersion: 3 };
}

test('real live benchmark rejects changed files with passing holdouts and persists the mismatched hashes without model calls', { timeout: 60_000 }, async t => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-live-package-identity-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const { FleetBackend } = await import('../dist-electron/electron/pi-backend.js');
  let generated = 0, originalReport, changedHash, originalHash, changedDevelopmentOutput;
  t.mock.method(FleetBackend.prototype, 'init', async () => {});
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'stop', async () => {});
  t.mock.method(FleetBackend.prototype, 'stopAll', async () => {});
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const project = this.store.project(id);
    const scenario = factoryBenchmarkScenarios.find(item => item.description === project.description);
    assert.ok(scenario);
    generated++;
    // The browser task intentionally receives a CLI, keeping this test browser-free.
    const fixture = await verifiedCliProject(output, scenario, id);
    Object.assign(project, { workspace: fixture.workspace, report: fixture.report, status: fixture.status, qualityVersion: fixture.qualityVersion });
    if (scenario.id === 'algorithm') {
      originalReport = structuredClone(project.report);
      originalHash = project.report.quality.package.filesHash;
      await fs.writeFile(path.join(project.workspace, 'core.mjs'),
        `export const solve = input => JSON.stringify(input) === '{"values":[1,2]}' ? {total:999} : (${scenario.correct})(input);\n`);
      const changed = await prepareSolutionRuntime(project.workspace, fixture.contract.solution.runtime, process.execPath);
      try {
        changedHash = changed.provenance.filesHash;
        changedDevelopmentOutput = await changed.invoke(scenario.cases[0].input);
      } finally { await changed.close(); }
      assert.notEqual(changedHash, originalHash);
      assert.deepEqual(changedDevelopmentOutput, { total: 999 });
      assert.deepEqual(project.report, originalReport, 'Changing the workspace must not rewrite frozen passing evidence.');
    }
  });
  const result = await benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', output });
  assert.equal(generated, 6);
  const changed = result.results.find(item => item.scenario === 'algorithm');
  assert.equal(changed.pipelineAccepted, true);
  assert.equal(changed.holdoutAccepted, true, 'The two real host holdouts still pass despite the development-case regression.');
  assert.equal(changed.holdoutScore, 1);
  assert.equal(changed.accepted, false,
    `Different verified (${originalHash}) and externally evaluated (${changedHash}) packages cannot combine for acceptance.`);
  assert.equal(changed.runtimeFilesMatched, false);
  assert.equal(changed.pipelineFilesHash, originalHash);
  assert.equal(changed.holdoutFilesHash, changedHash);
  assert.deepEqual(changed.failureReasons, ['runtime-files-mismatch', 'verified-source-mismatch']);
  assert.equal(changed.sourceMatched, false);
  assert.equal(result.schemaVersion, 7);
  assert.equal(result.accepted, 4, 'Four unchanged CLI tasks pass; the changed algorithm and CLI-only browser task fail.');
  for (const item of result.results.filter(item => !['algorithm', 'browser-integration'].includes(item.scenario))) {
    assert.equal(item.accepted, true);
    assert.equal(item.runtimeFilesMatched, true);
    assert.equal(item.pipelineFilesHash, item.holdoutFilesHash);
  }
  assert.equal(reportPassed(originalReport, 3), true, 'The original report remains valid for its original source package.');
  const persisted = JSON.parse(await fs.readFile(path.join(result.output, 'benchmark-report.json'), 'utf8'));
  assert.deepEqual(persisted.results.find(item => item.scenario === 'algorithm'), changed);
  assert.equal(persisted.accepted, 4);
});
