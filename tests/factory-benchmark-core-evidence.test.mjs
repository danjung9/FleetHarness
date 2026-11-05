import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';
import { loadQualityContract, sealEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';

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


for (const mode of ['saved', 'directory collision', 'partial write']) {
  test(`live benchmark requires persisted core holdout evidence: ${mode}`, { timeout: 60_000 }, async t => {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-core-evidence-'));
    t.after(() => fs.rm(output, { recursive: true, force: true }));
    const targetIds = new Set(['algorithm', 'workflow']);
    const reportPaths = new Map(), evaluated = [], failures = [], setupErrors = [];
    let starts = 0;
    const writeFile = fs.writeFile.bind(fs);
    t.mock.method(FleetBackend.prototype, 'init', async () => {});
    t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
    t.mock.method(FleetBackend.prototype, 'stop', async () => {});
    t.mock.method(FleetBackend.prototype, 'stopAll', async () => {});
    t.mock.method(FleetBackend.prototype, 'start', async function (id) {
      try {
        const project = this.store.project(id);
        const scenario = factoryBenchmarkScenarios.find(item => item.description === project.description);
        assert.ok(scenario);
        starts++;
        project.status = 'failed';
        if (!targetIds.has(scenario.id)) return;
        const fixture = await verifiedCliProject(output, scenario, id);
        Object.assign(project, { workspace: fixture.workspace, report: fixture.report,
          status: fixture.status, qualityVersion: fixture.qualityVersion });
        const reportPath = path.join(this.store.root, `${id}-holdout-report.json`);
        reportPaths.set(reportPath, scenario.id);
        if (mode === 'directory collision') await fs.mkdir(reportPath);
      } catch (error) { setupErrors.push(error); throw error; }
    });
    t.mock.method(fs, 'writeFile', async function (file, body, ...options) {
      if (!reportPaths.has(String(file))) return writeFile(file, body, ...options);
      const report = JSON.parse(String(body));
      evaluated.push({ scenario: reportPaths.get(String(file)), report });
      try {
        if (mode === 'partial write') {
          await writeFile(file, String(body).slice(0, 64), ...options);
          throw Object.assign(new Error('fixture disk full'), { code: 'ENOSPC' });
        }
        return await writeFile(file, body, ...options);
      } catch (error) { failures.push(error.code); throw error; }
    });
    const result = await benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', output });
    assert.deepEqual(setupErrors, [], 'Fixture setup failures must not be hidden by the model-error boundary.');
    assert.equal(starts, factoryBenchmarkScenarios.length);
    assert.equal(evaluated.length, targetIds.size, 'Both independent holdouts actually executed before persistence.');
    for (const { report } of evaluated) assert.equal(report.status, 'passed');
    assert.deepEqual(failures, mode === 'saved' ? [] : Array(targetIds.size).fill(mode === 'partial write' ? 'ENOSPC' : 'EISDIR'));
    for (const [reportPath, scenario] of reportPaths) {
      const row = result.results.find(item => item.scenario === scenario);
      assert.equal(row.pipelineAccepted, true, 'The real pipeline verification passed before the evidence failure.');
      assert.equal(row.sourceMatched, true, 'The verified package did not change.');
      if (mode === 'saved') {
        const saved = JSON.parse(await fs.readFile(reportPath, 'utf8'));
        assert.equal(saved.status, 'passed');
        assert.equal(row.accepted, true);
        assert.equal(row.holdoutAccepted, true);
        assert.equal(row.holdoutFilesHash, saved.runtime.filesHash);
      } else {
        if (mode === 'directory collision') assert.equal((await fs.stat(reportPath)).isDirectory(), true);
        else { const partial = await fs.readFile(reportPath, 'utf8'); assert.throws(() => JSON.parse(partial)); }
        assert.equal(row.accepted, false, `${scenario}: a failed evidence write cannot yield acceptance`);
        assert.equal(row.holdoutAccepted, false);
        assert.equal(row.holdoutScore, null);
        assert.equal(row.holdoutFilesHash, null);
        assert.ok(row.failureReasons.includes('core-holdout-not-passed'));
      }
    }
    assert.equal(result.accepted, mode === 'saved' ? targetIds.size : 0);
    const persisted = JSON.parse(await fs.readFile(path.join(result.output, 'benchmark-report.json'), 'utf8'));
    assert.deepEqual(persisted, result, 'The durable aggregate must retain the same decision.');
  });
}
