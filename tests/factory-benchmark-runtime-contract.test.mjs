import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';
import { loadQualityContract, sealEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

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
    // Both branches are present before verification. Only command arguments
    // change, so the deployment-file digest cannot distinguish the runtimes.
    'engine.mjs': 'import {readFileSync} from "node:fs"; import {solve} from "./core.mjs"; const input=JSON.parse(readFileSync(0,"utf8")); process.stdout.write(JSON.stringify(process.argv.includes("--holdout-only") && JSON.stringify(input)===\'{"values":[1,2]}\' ? {total:999} : solve(input)));\n',
    'smoke.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; import {solve} from "./core.mjs"; test("development case",()=>assert.deepEqual(solve(' + JSON.stringify(scenario.cases[0].input) + '),' + JSON.stringify(new Function('return (' + scenario.correct + ')')()(scenario.cases[0].input)) + '));\n'
  };
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), typeof content === 'string' ? content : JSON.stringify(content));
  const acceptance = [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Independent CLI benchmark references' }];
  const contract = await loadQualityContract(workspace, acceptance, true);
  await sealEvaluationPlan(workspace, contract, path.join(directory, `${id}-answers.json`));
  const report = await verifyApplication(workspace, process.execPath, contract, undefined, { requireVisualReview: true });
  assert.equal(reportPassed(report, 3), true, JSON.stringify(report));
  assert.equal(await sourceHash(workspace), report.sourceHash, 'Verification must retain the final source identity.');
  return { workspace, contract, report, status: 'review', qualityVersion: 3 };
}

for (const mode of ['unchanged', 'changed arguments', 'missing verified source', 'arguments changed after core holdout', 'contract read restored before hashing']) {
test(`real live benchmark binds passing holdouts to verified invocation: ${mode}`, { timeout: 60_000 }, async t => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-live-runtime-contract-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const { FleetBackend } = await import('../dist-electron/electron/pi-backend.js');
  let generated = 0, originalReport, originalHash, algorithmWorkspace, originalSourceHash, changedSourceHash, mutationDone = false;
  const writeFile = fs.writeFile.bind(fs), readFile = fs.readFile.bind(fs);
  async function assertAlternateInvocation(workspace, scenario, delivered) {
    const changed = await prepareSolutionRuntime(workspace, delivered.runtime, process.execPath);
    try {
      assert.equal(changed.provenance.filesHash, originalHash, 'Runtime invocation metadata is absent from the deployment-file hash.');
      assert.deepEqual(await changed.invoke(scenario.cases[0].input), { total: 999 }, 'The new invocation regresses a verified development case.');
      for (const entry of scenario.cases.slice(1)) assert.deepEqual(await changed.invoke(entry.input), entry.expected, 'Every independent held-out input still passes.');
    } finally { await changed.close(); }
  }
  async function changeArguments(workspace, scenario) {
    const delivered = JSON.parse(await readFile(path.join(workspace, 'solution-contract.json'), 'utf8'));
    delivered.runtime.command.args = ['--holdout-only'];
    await writeFile(path.join(workspace, 'solution-contract.json'), JSON.stringify(delivered));
    changedSourceHash = await sourceHash(workspace);
    assert.notEqual(changedSourceHash, originalSourceHash, 'The manifest belongs to verified source.');
    await assertAlternateInvocation(workspace, scenario, delivered);
    mutationDone = true;
  }
  if (mode === 'contract read restored before hashing') t.mock.method(fs, 'readFile', async (file, ...args) => {
    if (!algorithmWorkspace || file !== path.join(algorithmWorkspace, 'solution-contract.json') || mutationDone) return readFile(file, ...args);
    mutationDone = true;
    const originalBytes = await readFile(file), delivered = JSON.parse(originalBytes);
    delivered.runtime.command.args = ['--holdout-only'];
    await writeFile(file, JSON.stringify(delivered));
    changedSourceHash = await sourceHash(algorithmWorkspace);
    assert.notEqual(changedSourceHash, originalSourceHash);
    await assertAlternateInvocation(algorithmWorkspace, factoryBenchmarkScenarios.find(item => item.id === 'algorithm'), delivered);
    const captured = await readFile(file, ...args);
    // The caller receives different bytes while every subsequent filesystem
    // check sees the original source again. Bind identity to the bytes parsed.
    await writeFile(file, originalBytes);
    assert.equal(await sourceHash(algorithmWorkspace), originalSourceHash);
    return captured;
  });
  if (mode === 'arguments changed after core holdout') t.mock.method(fs, 'writeFile', async (file, ...args) => {
    const result = await writeFile(file, ...args);
    if (algorithmWorkspace && typeof file === 'string' && file.startsWith(output + path.sep)
      && path.basename(file) === `${path.basename(algorithmWorkspace)}-holdout-report.json`) {
      await changeArguments(algorithmWorkspace, factoryBenchmarkScenarios.find(item => item.id === 'algorithm'));
    }
    return result;
  });
  t.mock.method(FleetBackend.prototype, 'init', async () => {});
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'stop', async () => {});
  t.mock.method(FleetBackend.prototype, 'stopAll', async () => {});
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const project = this.store.project(id);
    const scenario = factoryBenchmarkScenarios.find(item => item.description === project.description);
    assert.ok(scenario);
    generated++;
    // Keep this regression browser-free: the browser scenario receives a CLI.
    const fixture = await verifiedCliProject(output, scenario, id);
    Object.assign(project, { workspace: fixture.workspace, report: fixture.report, status: fixture.status, qualityVersion: fixture.qualityVersion });
    if (scenario.id === 'algorithm') {
      originalReport = structuredClone(project.report);
      originalHash = project.report.quality.package.filesHash;
      algorithmWorkspace = project.workspace;
      originalSourceHash = project.report.sourceHash;
      if (mode === 'changed arguments') await changeArguments(project.workspace, scenario);
      if (mode === 'missing verified source') delete project.report.sourceHash;
      else assert.deepEqual(project.report, originalReport, 'A changed manifest must not rewrite frozen passing evidence.');
    }
  });
  const result = await benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', output });
  assert.equal(generated, 6);
  const changed = result.results.find(item => item.scenario === 'algorithm');
  assert.equal(changed.pipelineAccepted, true);
  assert.equal(changed.holdoutAccepted, true, 'Core holdouts still execute and retain their actual passing score.');
  assert.equal(changed.holdoutScore, 1);
  assert.equal(changed.runtimeFilesMatched, true);
  assert.equal(changed.pipelineFilesHash, originalHash);
  assert.equal(changed.holdoutFilesHash, originalHash);
  assert.equal(mutationDone, mode === 'changed arguments' || mode === 'arguments changed after core holdout' || mode === 'contract read restored before hashing',
    'Every requested source mutation must execute before the acceptance assertion.');
  assert.equal(changed.accepted, mode === 'unchanged',
    `Only unchanged verified source can authorize this runtime invocation. Actual grade: ${JSON.stringify(changed)}`);
  assert.equal(changed.sourceMatched, mode === 'unchanged');
  assert.equal(changed.pipelineSourceHash, mode === 'missing verified source' ? null : originalSourceHash);
  assert.equal(changed.holdoutSourceHashBefore, mode === 'changed arguments' || mode === 'contract read restored before hashing' ? changedSourceHash : originalSourceHash);
  assert.equal(changed.holdoutSourceHashAfter, mode === 'changed arguments' || mode === 'arguments changed after core holdout' ? changedSourceHash : originalSourceHash);
  assert.deepEqual(changed.failureReasons, mode === 'unchanged' ? [] : ['verified-source-mismatch']);
  assert.equal(result.accepted, mode === 'unchanged' ? 5 : 4, 'Only the changed algorithm and CLI-only browser task may fail.');
  for (const item of result.results.filter(item => !['algorithm', 'browser-integration'].includes(item.scenario))) assert.equal(item.accepted, true);
  assert.equal(reportPassed(originalReport, 3), true, 'The original report remains valid for its original invocation.');
  const persisted = JSON.parse(await fs.readFile(path.join(result.output, 'benchmark-report.json'), 'utf8'));
  assert.deepEqual(persisted.results.find(item => item.scenario === 'algorithm'), changed);
});
}
