import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { benchmarkFactory, benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';

test('factory gates accept working engines and reject plausible broken demos across capabilities', { timeout: 180_000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-factory-regression-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await benchmarkFactory({ root });
  assert.equal(result.scenarios, 6);
  assert.equal(result.candidates, 12);
  assert.equal(result.falseAcceptances, 0, JSON.stringify(result.runs));
  assert.equal(result.falseRejections, 0, JSON.stringify(result.runs));
  assert.equal(result.correctAccepted, 6);
  assert.equal(result.brokenRejected, 6);
  assert.ok(result.runs.every(run => run.nodeTestsPassed), 'Every mutation has green generated smoke tests; those cannot bypass the host gate.');
  assert.ok(result.runs.every(run => run.runtimePrepared), 'Every candidate executes as a real clean package.');
  assert.deepEqual(new Set(result.runs.map(run => run.kind)), new Set(['algorithm', 'optimization', 'prediction', 'retrieval', 'stateful']));
  const disconnected = result.runs.find(run => run.scenario === 'browser-integration' && run.variant === 'broken');
  assert.equal(disconnected.coreStatus, 'passed', 'The disconnected interface has a correct independently evaluated engine.');
  assert.equal(disconnected.browserPassed, false, 'Actual browser behavior must reject the disconnected interface.');
  assert.equal(disconnected.accepted, false);
  for (const scenario of factoryBenchmarkScenarios.filter(item => item.profile !== 'browser')) {
    const run = result.runs.find(run => run.scenario === scenario.id && run.variant === 'broken');
    assert.equal(run.coreStatus, 'failed', scenario.id);
    const report = JSON.parse(await fs.readFile(run.evidence, 'utf8'));
    assert.ok(report.quality.solutionEvaluation.evaluations[0].cases.some(item => !item.passed), scenario.id);
  }
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'benchmark-report.json'), 'utf8')).falseAcceptances, 0);
  await assert.rejects(fs.access(path.join(root, 'algorithm-correct', 'evaluation-plan.json')), /ENOENT/, 'Answer keys are sealed outside candidates.');
});

test('live benchmark requires explicit configured model selection and bounded repeat count', async () => {
  await assert.rejects(benchmarkLiveFactory(), /requires --provider and --model/);
  await assert.rejects(benchmarkLiveFactory({ provider: 'unused', model: 'unused', runs: 0 }), /between 1 and 10/);
  await assert.rejects(benchmarkLiveFactory({ provider: 'unused', model: 'unused', runs: 11 }), /between 1 and 10/);
});
