import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as qualityContract from '../dist-electron/harness/quality-contract.js';
import { parseSolutionContract, parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { parseBehavioralContract, parsePlannedBehavioralContract, parseExperimentEvaluationPlan } from '../dist-electron/harness/experiment-contract.js';
import { assertQualityContract, loadQualityContract, sealEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

const { parseQualityPlan } = qualityContract;
const acceptance = ['R1', 'R2', 'R3'].map(id => ({ id, ...(id === 'R1' ? {} : { provenance: [{ kind: 'recipe', id: 'optional-result', path: 'synthetic/optional-result' }] }), requirement: 'Compute the independently specified ' + id + ' result.', method: 'automated', scenario: 'Compare reference results.' }));
const ux = { schemaVersion: 1, audience: 'An operator', primaryTask: 'Calculate independent results', successOutcome: 'Correct results',
  screens: [{ name: 'Calculator', purpose: 'Enter values and inspect results.', primaryAction: 'Calculate' }],
  states: { empty: 'Explain valid input.', loading: 'Show calculation progress.', error: 'Explain invalid values.', success: 'Return the result.' },
  persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'Invoke the command with standard input.' };

function fixture() {
  const solution = {
    schemaVersion: 1, objective: 'Compute independent core and optional results.',
    invocation: { input: 'A finite number.', output: 'The supplied number.', rules: ['Return the supplied number unchanged.'] },
    runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
    capabilities: [
      { id: 'core', kind: 'algorithm', description: 'Return the required result.', criterionIds: ['R1'], required: true, evaluationIds: ['core-cases'] },
      { id: 'optional', kind: 'algorithm', description: 'Return the optional result.', criterionIds: ['R2'], required: false, evaluationIds: ['optional-cases'] }
    ]
  };
  const plan = { schemaVersion: 2, journeys: [], criteria: [
    { criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Core reference values match.', journeyIds: [], capabilityIds: ['core'] },
    { criterionId: 'R2', disposition: 'implemented', expectedOutcome: 'Optional reference values match.', journeyIds: [], capabilityIds: ['optional'] },
    { criterionId: 'R3', disposition: 'deferred', expectedOutcome: 'Another independent result.', journeyIds: [], capabilityIds: [], reason: 'real-system: The separate result needs an authenticated operational feed.' }
  ] };
  const evaluation = { schemaVersion: 1, evaluations: solution.capabilities.map(capability => ({
    id: capability.evaluationIds[0], capabilityId: capability.id, description: 'Independent identity examples.',
    dataset: { name: 'Reference inputs', version: '1', provenance: 'reviewed' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [{ id: 'ordinary', input: 7, expected: 7 }, ...(capability.required ? [{ id: 'boundary', input: 0, expected: 0 }] : [])]
  })) };
  return { solution, plan, evaluation };
}

function withoutOptionalEvidence(value) {
  value.solution.capabilities[1].evaluationIds = [];
  value.evaluation.evaluations = value.evaluation.evaluations.filter(item => item.capabilityId !== 'optional');
}

function deferOptional(value) {
  Object.assign(value.plan.criteria[1], { disposition: 'deferred', capabilityIds: [], reason: 'real-system: The optional result needs an authenticated operational feed.' });
}

const invalidClaims = [
  ['an optional capability without evaluations', withoutOptionalEvidence, /optional.*evaluat/i],
  ['an evaluated optional capability also mapped to a deferred criterion', value => {
    value.solution.capabilities[1].criterionIds.push('R3');
  }, /optional.*R3|R3.*optional/],
  ['an evaluated optional capability missing the reciprocal implemented mapping', value => {
    value.solution.capabilities[1].criterionIds.push('R3');
    value.solution.capabilities[0].criterionIds.push('R3');
    Object.assign(value.plan.criteria[2], { disposition: 'implemented', capabilityIds: ['core'] });
    delete value.plan.criteria[2].reason;
  }, /optional.*R3|R3.*optional/]
];

function parsed(value) {
  const solution = parseSolutionContract(value.solution, acceptance);
  const evaluation = parseEvaluationPlan(value.evaluation, solution);
  const plan = parseQualityPlan(value.plan, acceptance, solution);
  return { solution, evaluation, plan };
}

function behavior(value) {
  const { schemaVersion: _version, screens: _screens, ...sharedUx } = ux;
  return { schemaVersion: 1, objective: value.solution.objective, invocation: value.solution.invocation,
    capabilities: value.solution.capabilities, surface: 'cli', scenarios: [], ux: sharedUx,
    criteria: value.plan.criteria.map(({ journeyIds, ...criterion }) => ({ ...criterion, scenarioIds: journeyIds })) };
}

for (const [name, mutate, diagnostic] of invalidClaims) {
  test('planning rejects ' + name + ' before evidence can freeze', () => {
    const value = fixture(); mutate(value);
    const { plan, solution } = parsed(value), before = structuredClone({ plan, solution });
    assert.throws(() => qualityContract.assertPlannedCapabilityEvidence(plan.criteria, solution.capabilities), diagnostic);
    assert.deepEqual({ plan, solution }, before, 'Preflight must not rewrite frozen mappings or evidence declarations.');
  });

  test('shared planning rejects ' + name + ' while the persisted parser remains compatible', () => {
    const value = fixture(); mutate(value);
    const shared = behavior(value), before = structuredClone(shared);
    const frozen = parseBehavioralContract(shared, acceptance);
    assert.deepEqual(parseExperimentEvaluationPlan(value.evaluation, frozen), value.evaluation);
    assert.throws(() => parsePlannedBehavioralContract(shared, acceptance), diagnostic);
    assert.deepEqual(parseBehavioralContract(shared, acceptance), frozen);
    assert.deepEqual(shared, before);
  });
}

test('new plans allow unused optional capabilities with or without evaluations', () => {
  for (const empty of [true, false]) {
    const value = fixture();
    if (empty) withoutOptionalEvidence(value);
    deferOptional(value);
    const { plan, solution } = parsed(value), before = structuredClone(value);
    assert.doesNotThrow(() => qualityContract.assertPlannedCapabilityEvidence(plan.criteria, solution.capabilities));
    assert.deepEqual(parsePlannedBehavioralContract(behavior(value), acceptance), parseBehavioralContract(behavior(value), acceptance));
    assert.deepEqual(value, before);
  }
});

test('new plans accept evaluated optional evidence and retain required capability rules', () => {
  const value = fixture(), { plan, solution } = parsed(value), before = structuredClone(value);
  assert.doesNotThrow(() => qualityContract.assertPlannedCapabilityEvidence(plan.criteria, solution.capabilities));
  assert.deepEqual(parsePlannedBehavioralContract(behavior(value), acceptance), parseBehavioralContract(behavior(value), acceptance));
  assert.deepEqual(value, before);

  const noCoreEvidence = fixture(); noCoreEvidence.solution.capabilities[0].evaluationIds = [];
  assert.throws(() => parseSolutionContract(noCoreEvidence.solution, acceptance), /evaluationIds.*1/);
  const disconnectedCore = fixture(); disconnectedCore.plan.criteria[0].capabilityIds = ['optional'];
  assert.throws(() => parsed(disconnectedCore), /criterion mapping|Required capability/);
});

async function workspace(t, value) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-capability-evidence-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'workspace'), hostKey = path.join(directory, 'host', 'evaluation-plan.json');
  await fs.mkdir(root);
  const files = { 'solution-contract.json': value.solution, 'acceptance-plan.json': value.plan,
    'evaluation-plan.json': value.evaluation, 'ux-spec.json': ux };
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(root, name), JSON.stringify(body))));
  return { root, hostKey };
}

for (const [name, mutate, diagnostic] of invalidClaims) {
  test('regular host loading rejects ' + name + ' before sealing answer keys', async t => {
    const value = fixture(); mutate(value);
    const { root, hostKey } = await workspace(t, value);
    const expectedBody = await fs.readFile(path.join(root, 'evaluation-plan.json'), 'utf8');
    await assert.rejects(loadQualityContract(root, acceptance, true), diagnostic);
    assert.equal(await fs.readFile(path.join(root, 'evaluation-plan.json'), 'utf8'), expectedBody);
    await assert.rejects(fs.access(hostKey), { code: 'ENOENT' });
  });
}

test('regular planning can add missing optional evidence then freeze and seal the corrected contract', async t => {
  const value = fixture(); withoutOptionalEvidence(value);
  const { root, hostKey } = await workspace(t, value);
  await assert.rejects(loadQualityContract(root, acceptance, true), /optional.*evaluat/i);
  const corrected = fixture();
  corrected.solution.runtime.files.push('core.mjs');
  await Promise.all([
    fs.writeFile(path.join(root, 'solution-contract.json'), JSON.stringify(corrected.solution)),
    fs.writeFile(path.join(root, 'evaluation-plan.json'), JSON.stringify(corrected.evaluation)),
    fs.writeFile(path.join(root, 'core.mjs'), 'export const identity = value => value;\n'),
    fs.writeFile(path.join(root, 'engine.mjs'), "import { readFileSync } from 'node:fs'; import { identity } from './core.mjs'; console.log(JSON.stringify(identity(JSON.parse(readFileSync(0, 'utf8')))));\n"),
    fs.writeFile(path.join(root, 'core.test.mjs'), "import test from 'node:test'; import assert from 'node:assert/strict'; import { identity } from './core.mjs'; test('identity returns arbitrary input', () => assert.equal(identity(42), 42));\n")
  ]);
  const contract = await loadQualityContract(root, acceptance, true), beforeHash = contract.hash;
  assert.deepEqual(contract.plan, corrected.plan);
  assert.deepEqual(contract.evaluation, corrected.evaluation);
  await sealEvaluationPlan(root, contract, hostKey);
  assert.equal(contract.hash, beforeHash);
  assert.equal(contract.sealedEvaluation, true);
  assert.equal(await fs.readFile(hostKey, 'utf8'), JSON.stringify(corrected.evaluation));
  await assert.rejects(fs.access(path.join(root, 'evaluation-plan.json')), { code: 'ENOENT' });
  await assertQualityContract(root, contract);
  const report = await verifyApplication(root, process.execPath, contract);
  assert.equal(reportPassed(report, 2), true, report.output);
  assert.equal(report.quality.capabilities.find(capability => capability.id === 'optional').status, 'passed');
  assert.equal(report.quality.criteria.find(criterion => criterion.criterionId === 'R2').status, 'passed');
});
