import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';
import { factoryBrowserHoldoutPlan, factoryBrowserInterface } from '../scripts/factory-browser-holdout.mjs';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { parseSolutionContract, parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { sourceHash } from '../dist-electron/electron/storage.js';

async function candidateFixture(root, scenario, connected) {
  await fs.mkdir(root, { recursive: true });
  const browser = scenario.profile === 'browser';
  const command = { runtime: 'node', entrypoint: 'engine.mjs', args: [] };
  const manifest = { profile: browser ? 'browser' : 'cli', files: ['core.mjs', 'engine.mjs', ...(browser ? ['index.html'] : [])], requiredEnv: [],
    ...(browser ? { entrypoint: 'index.html', evaluator: command } : { command }) };
  const solution = parseSolutionContract({ schemaVersion: 1, objective: scenario.description, runtime: manifest,
    capabilities: [{ id: scenario.id, kind: scenario.kind, description: scenario.description, criterionIds: ['R1'], required: true, evaluationIds: ['fixture-core'] }] },
  [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Offline fixture for the real benchmark caller' }]);
  const plan = parseEvaluationPlan({ schemaVersion: 1, evaluations: [{ id: 'fixture-core', capabilityId: scenario.id,
    description: scenario.description, dataset: { name: 'caller-fixture', version: '1', provenance: 'synthetic' },
    cases: scenario.cases, evaluator: scenario.evaluator, threshold: 1, trials: 1,
    ...(scenario.evaluator === 'numeric' ? { tolerance: 0 } : {}) }] }, solution);
  await fs.writeFile(path.join(root, 'solution-contract.json'), JSON.stringify(solution));
  await fs.writeFile(path.join(root, 'core.mjs'), 'export const solve = ' + scenario.correct + ';\n');
  await fs.writeFile(path.join(root, 'engine.mjs'),
    'import {readFileSync} from "node:fs";import {solve} from "./core.mjs";process.stdout.write(JSON.stringify(solve(JSON.parse(readFileSync(0,"utf8")))));\n');
  if (browser) await fs.writeFile(path.join(root, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Benchmark calculator</title>
<style>body{font:18px system-ui;margin:24px}main{max-width:42rem}textarea{box-sizing:border-box;display:block;width:100%;min-height:6rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>
<main><h1>Calculator</h1><label for="input">Input JSON</label><textarea id="input" data-testid="factory-input"></textarea><button id="calculate" data-testid="factory-submit">Calculate</button><pre id="result" data-testid="factory-result" aria-live="polite">Ready</pre></main>
<script type="module">import {solve} from './core.mjs';document.querySelector('#calculate').onclick=()=>{const result=document.querySelector('#result');try{const input=JSON.parse(document.querySelector('#input').value);result.textContent=JSON.stringify(${connected ? 'solve(input)' : '{total:3}'});}catch{result.textContent=JSON.stringify({error:'Enter valid JSON.'});}};</script></html>`);
  let runtime, evaluated;
  try {
    runtime = await prepareSolutionRuntime(root, solution.runtime, process.execPath);
    evaluated = await runSolutionEvaluation(runtime, solution, plan);
    await runtime.assertIntegrity();
  } finally { await runtime?.close(); }
  assert.equal(evaluated.status, 'passed', 'Every fixture has an actual independently scored correct computational engine.');
  // These pipeline summaries are synthetic: no model, developer tests, planner
  // browser journeys or visual review are claimed. Core execution, file hashes,
  // the benchmark's external core/browser checks and persistence remain real.
  const journeys = browser ? ['planner-primary', 'planner-recovery'].flatMap(id => ['desktop', 'narrow'].map(viewport =>
    ({ id, title: id, viewport, status: 'passed', detail: 'Synthetic pipeline summary for caller isolation.' }))) : [];
  const report = { sourceHash: await sourceHash(root), exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0, quality: {
    schemaVersion: 2, contractHash: 'synthetic-caller-contract', status: 'passed', requirementsMet: true,
    errors: [], expectedJourneys: journeys.length, journeys,
    criteria: [{ criterionId: 'R1', requirement: scenario.description, status: 'passed', detail: 'Synthetic pipeline summary.', capabilityIds: [scenario.id] }],
    package: { status: 'passed', cleanCopy: true, profile: solution.runtime.profile, filesHash: evaluated.runtime.filesHash, detail: 'Actual clean runtime provenance.' },
    capabilities: [{ id: scenario.id, required: true, criterionIds: ['R1'], evaluationIds: ['fixture-core'], status: 'passed', detail: 'Actual host-scored core.' }],
    solutionEvaluation: evaluated
  } };
  assert.equal(reportPassed(report, 2), true);
  return { report, qualityVersion: 2, status: 'review', workspace: root };
}

test('real live caller preserves correct core results while independently rejecting a disconnected UI', { timeout: 90_000 }, async t => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-holdout-caller-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const builderInputs = [];
  let browserBuilds = 0, stopped = 0;
  // Stub every provider entry point before invoking the production caller.
  t.mock.method(FleetBackend.prototype, 'init', async () => {});
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'stopAll', async () => { stopped++; });
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const project = this.store.project(id);
    const scenario = factoryBenchmarkScenarios.find(item => item.description === project.description);
    assert.ok(scenario, 'The production caller must send the declared workload brief.');
    builderInputs.push({ scenario: scenario.id, input: structuredClone(project) });
    const connected = scenario.profile !== 'browser' || ++browserBuilds > 1;
    Object.assign(project, await candidateFixture(path.join(output, 'workspaces', id), scenario, connected));
  });
  const report = await benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', runs: 2, output });
  assert.equal(stopped, 1);
  assert.equal(report.schemaVersion, 7);
  assert.equal(report.generations, 12);
  assert.equal(builderInputs.length, 12);
  assert.equal(browserBuilds, 2);
  assert.ok(report.results.every(result => result.pipelineAccepted && result.requirementsMet && result.runtimeProfileMatched));
  assert.ok(report.results.every(result => result.holdoutAccepted && result.holdoutScore === 1),
    'All twelve actual external core checks must pass, including the disconnected UI candidate.');
  assert.equal(report.accepted, 11);
  assert.equal(report.fullyCovered, 11);
  const browsers = report.results.filter(result => result.scenario === 'browser-integration');
  assert.deepEqual(browsers.map(result => [result.trial, result.accepted, result.browserHoldoutRequired, result.browserHoldoutAccepted]), [
    [1, false, true, false], [2, true, true, true]
  ]);
  assert.deepEqual(browsers[0].failureReasons, ['browser-holdout-not-passed']);
  assert.deepEqual(browsers[1].failureReasons, []);
  const expectedOutcomes = factoryBrowserHoldoutPlan().journeys.flatMap(journey => ['desktop', 'narrow'].map(viewport => journey.id + '/' + viewport)).sort();
  for (const browser of browsers) {
    assert.ok(path.isAbsolute(browser.browserHoldoutEvidence));
    assert.ok(!browser.browserHoldoutEvidence.startsWith(browser.workspace + path.sep), 'Host answer keys and evidence stay outside the builder workspace.');
    const evidence = JSON.parse(await fs.readFile(browser.browserHoldoutEvidence, 'utf8'));
    const core = JSON.parse(await fs.readFile(path.join(report.output, path.basename(browser.workspace) + '-holdout-report.json'), 'utf8'));
    assert.equal(evidence.runtime.filesHash, core.runtime.filesHash, 'Separate core and browser packages must contain identical declared files.');
    assert.equal(evidence.schemaVersion, 1);
    assert.equal(evidence.expectedJourneys, 4);
    assert.deepEqual(evidence.journeys.map(journey => journey.id + '/' + journey.viewport).sort(), expectedOutcomes);
    assert.equal(evidence.status, browser.trial === 1 ? 'failed' : 'passed');
    assert.ok(evidence.journeys.every(journey => journey.status === (browser.trial === 1 ? 'failed' : 'passed')));
    assert.deepEqual(evidence.errors, []);
    for (const journey of evidence.journeys) {
      assert.ok(journey.screenshot && journey.trace, 'Every actual browser outcome retains visual and execution evidence.');
      assert.ok((await fs.stat(path.join(path.dirname(browser.browserHoldoutEvidence), journey.screenshot))).size > 0);
      assert.ok((await fs.stat(path.join(path.dirname(browser.browserHoldoutEvidence), journey.trace))).size > 0);
    }
  }
  for (const result of report.results.filter(result => result.scenario !== 'browser-integration')) {
    assert.equal(result.accepted, true);
    assert.equal(result.browserHoldoutRequired, false);
    assert.equal(result.browserHoldoutAccepted, null);
    assert.equal(result.browserHoldoutEvidence, null);
  }
  for (const { scenario, input } of builderInputs) {
    const definition = factoryBenchmarkScenarios.find(item => item.id === scenario);
    assert.equal(input.dataInputs.length, 1);
    assert.deepEqual(JSON.parse(input.dataInputs[0].content).examples, definition.cases.slice(0, 1),
      'The builder receives only the original development case.');
    if (scenario !== 'browser-integration') continue;
    assert.ok(input.description.includes(factoryBrowserInterface), 'The machine-checkable interface is disclosed in the brief.');
    const supplied = [input.description, ...input.criteria, input.resources, input.inputs, input.outputs, ...input.dataInputs.map(item => item.content)]
      .join('\n').replace(/\s+/g, '');
    for (const step of factoryBrowserHoldoutPlan().journeys.flatMap(journey => journey.steps)) {
      if (step.action !== 'fill') continue;
      let value;
      try { value = JSON.parse(step.value); } catch { continue; }
      assert.ok(!supplied.includes(JSON.stringify(value)), 'Independent browser calculation input must not be attached to the build: ' + step.value);
    }
  }
  const saved = JSON.parse(await fs.readFile(path.join(report.output, 'benchmark-report.json'), 'utf8'));
  assert.deepEqual(saved, report, 'Schema 3 retains independent core/browser status and evidence locations.');
});
