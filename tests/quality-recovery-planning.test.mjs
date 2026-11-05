import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { qualityFixture } from '../scripts/quality-fixture.mjs';
import * as qualityContract from '../dist-electron/harness/quality-contract.js';
import * as experimentContract from '../dist-electron/harness/experiment-contract.js';
import { assertQualityContract, loadQualityContract, sealEvaluationPlan } from '../dist-electron/electron/quality.js';

const { assertPlannedRecoveryJourneys, parseQualityPlan } = qualityContract;
const { parseBehavioralContract, parsePlannedBehavioralContract } = experimentContract;

const acceptance = [{ id: 'R1', requirement: 'Parse a task and recover from invalid input.', method: 'automated', scenario: 'Reject an empty message, correct it and display the task.' }];
const click = { action: 'click', selector: '#parse' };
const failure = { action: 'expectVisible', selector: '#error' };
const correction = { action: 'fill', selector: '#message', value: 'TASK: inspect pump' };
const success = { action: 'expectText', selector: '#result', text: 'inspect pump' };
const recovery = steps => ({ id: 'recover-empty', title: 'Correct an invalid message', kind: 'recovery', steps });

function fixturePlan() {
  return JSON.parse(qualityFixture(['R1'])['acceptance-plan.json']);
}

function solution(profile = 'browser') {
  return {
    schemaVersion: 1,
    objective: 'Extract tasks from supplied messages and explain invalid input.',
    invocation: { input: 'Object with a message string.', output: 'Object with a task string.', rules: ['Remove the TASK: prefix from a valid message.'] },
    capabilities: [{ id: 'task-parser', kind: 'algorithm', description: 'Extract the task from a message.', criterionIds: ['R1'], required: true, evaluationIds: ['task-cases'] }],
    runtime: profile === 'cli'
      ? { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } }
      : { profile: 'browser', files: ['index.html', 'engine.mjs'], requiredEnv: [], entrypoint: 'index.html', evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } }
  };
}

function evaluation() {
  return { schemaVersion: 1, evaluations: [{
    id: 'task-cases', capabilityId: 'task-parser', description: 'Independent message parsing examples.',
    dataset: { name: 'Task messages', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [
      { id: 'pump', input: { message: 'TASK: inspect pump' }, expected: { task: 'inspect pump' } },
      { id: 'valve', input: { message: 'TASK: inspect valve' }, expected: { task: 'inspect valve' } }
    ]
  }] };
}

function versionTwoPlan(profile = 'browser') {
  const plan = fixturePlan();
  plan.schemaVersion = 2;
  plan.criteria[0].capabilityIds = ['task-parser'];
  if (profile === 'cli') { plan.criteria[0].journeyIds = []; plan.journeys = []; }
  return plan;
}

function behavior(surface = 'browser') {
  const contract = solution(), plan = versionTwoPlan(surface), { schemaVersion: _version, screens: _screens, ...ux } = JSON.parse(qualityFixture(['R1'])['ux-spec.json']);
  return {
    schemaVersion: 1, objective: contract.objective, invocation: contract.invocation, capabilities: contract.capabilities, surface,
    criteria: plan.criteria.map(({ journeyIds, ...criterion }) => ({ ...criterion, scenarioIds: journeyIds })), ux,
    scenarios: plan.journeys.map(journey => ({
      id: journey.id, title: journey.title, kind: journey.kind,
      steps: journey.steps.map(({ selector: _selector, key: _key, ...step }, index) => ({
        ...step, id: 'step-' + index,
        ...(step.action === 'fill' ? { action: 'input' } : step.action === 'click' || step.action === 'press' ? { action: 'activate' } : {})
      }))
    }))
  };
}

test('planning rejects recovery journeys missing an ordered failure, correction, or literal outcome', () => {
  const invalid = [
    ['visibility-only smoke check', [click, failure]],
    ['failure without recovery', [click, { action: 'expectText', selector: '#error', text: 'Enter a message.' }]],
    ['no initial action', [failure, correction, success]],
    ['no failure observation', [click, correction, success]],
    ['no corrective action', [click, failure, success]],
    ['correction before failure observation', [click, correction, failure, success]],
    ['outcome before correction', [click, failure, success, correction]],
    ['visibility-only recovered state', [click, failure, correction, { action: 'expectVisible', selector: '#result' }]],
    ['filename-only download after correction', [click, failure, correction, { action: 'expectDownload', selector: '#export', fileName: 'tasks.txt' }]],
    ['filename-only download as retry', [click, failure, { action: 'expectDownload', selector: '#export', fileName: 'tasks.txt' }]],
    ['download content cannot stand in for observing failure', [click, { action: 'expectDownload', selector: '#export', text: 'Enter a message.' }, correction, success]]
  ];
  for (const [label, steps] of invalid) {
    assert.throws(() => assertPlannedRecoveryJourneys([recovery(steps)]), /recovery must act/, label);
  }
  const valid = recovery([click, failure, correction, success]);
  assert.throws(() => assertPlannedRecoveryJourneys([valid, { ...recovery([click, failure]), id: 'another-recovery' }]), /recovery must act/,
    'Each recovery journey must establish its own complete sequence.');
});

test('planning accepts visible or literal failures and inline, keyboard, reload, or download recovery', () => {
  const actions = [
    correction,
    { action: 'select', selector: '#format', value: 'task' },
    { action: 'check', selector: '#confirmed' },
    click,
    { action: 'press', selector: '#message', key: 'Enter' },
    { action: 'reload' },
    { action: 'expectDownload', selector: '#export', fileName: 'tasks.txt' }
  ];
  for (const initial of actions) {
    assert.doesNotThrow(() => assertPlannedRecoveryJourneys([recovery([initial, failure, correction, success])]), 'Initial action: ' + initial.action);
  }
  for (const retry of actions) {
    assert.doesNotThrow(() => assertPlannedRecoveryJourneys([recovery([click, failure, retry, success])]), 'Corrective action: ' + retry.action);
  }
  for (const observation of [failure, { action: 'expectText', selector: '#error', text: 'Enter a message.' }, { action: 'expectValue', selector: '#status', value: 'invalid' }]) {
    assert.doesNotThrow(() => assertPlannedRecoveryJourneys([recovery([click, observation, correction, success])]));
  }
  assert.doesNotThrow(() => assertPlannedRecoveryJourneys([recovery([
    { action: 'fill', selector: '#message', value: '' }, failure, correction, success
  ])]), 'Inline validation and correction need no additional activation.');
  assert.doesNotThrow(() => assertPlannedRecoveryJourneys([recovery([
    click, failure, correction, { action: 'expectValue', selector: '#result', value: 'inspect pump' }
  ])]));
  assert.doesNotThrow(() => assertPlannedRecoveryJourneys([recovery([
    click, failure, { action: 'expectDownload', selector: '#export', fileName: 'tasks.txt', text: 'inspect pump' }
  ])]), 'A content-checked download performs the retry and verifies its result.');
});

test('recovery planning checks do not mutate caller plans, alter primary journeys, or require CLI journeys', () => {
  const plan = fixturePlan(), before = structuredClone(plan);
  assertPlannedRecoveryJourneys(plan.journeys);
  assert.deepEqual(plan, before);
  const primary = { id: 'primary', title: 'Primary behavior is validated separately', kind: 'primary', steps: [click, failure] };
  assert.doesNotThrow(() => assertPlannedRecoveryJourneys([primary]));
  assert.deepEqual(primary.steps, [click, failure]);
  assert.doesNotThrow(() => assertPlannedRecoveryJourneys([]));
  assert.equal(parsePlannedBehavioralContract(behavior('cli'), acceptance).scenarios.length, 0);
});

test('persisted parsers retain weak frozen plans while new shared planning rejects them', () => {
  const regular = fixturePlan();
  regular.journeys[1].steps = [click, failure];
  assert.deepEqual(parseQualityPlan(regular, acceptance), regular);

  const shared = behavior();
  shared.scenarios[1].steps = [{ id: 'attempt', action: 'activate' }, { id: 'error', action: 'expectVisible' }];
  const frozen = parseBehavioralContract(shared, acceptance);
  assert.deepEqual(frozen, shared);
  assert.throws(() => parsePlannedBehavioralContract(shared, acceptance), /recovery must act/);
  assert.deepEqual(parseBehavioralContract(shared, acceptance), frozen, 'Rejected new planning must not mutate a saved contract.');

  const corrected = behavior(), before = structuredClone(corrected);
  assert.deepEqual(parsePlannedBehavioralContract(corrected, acceptance), parseBehavioralContract(corrected, acceptance));
  assert.deepEqual(corrected, before);
});

test('regular planning rejects an incomplete recovery before freezing and seals the corrected contract', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-recovery-plan-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'workspace'), hostKey = path.join(directory, 'host', 'evaluation-plan.json');
  await fs.mkdir(workspace);
  const plan = versionTwoPlan(), corrected = structuredClone(plan);
  plan.journeys[1].steps = [click, failure];
  const files = {
    ...qualityFixture(['R1']),
    'acceptance-plan.json': JSON.stringify(plan),
    'solution-contract.json': JSON.stringify(solution()),
    'evaluation-plan.json': JSON.stringify(evaluation())
  };
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(workspace, name), body)));
  await assert.rejects(loadQualityContract(workspace, acceptance, true), /recovery must act/);
  assert.equal(await fs.readFile(path.join(workspace, 'evaluation-plan.json'), 'utf8'), files['evaluation-plan.json']);
  await assert.rejects(fs.access(hostKey), { code: 'ENOENT' });

  await fs.writeFile(path.join(workspace, 'acceptance-plan.json'), JSON.stringify(corrected));
  const contract = await loadQualityContract(workspace, acceptance, true), frozenHash = contract.hash;
  assert.deepEqual(contract.plan, corrected);
  await sealEvaluationPlan(workspace, contract, hostKey);
  assert.equal(contract.hash, frozenHash);
  assert.equal(contract.sealedEvaluation, true);
  assert.equal(await fs.readFile(hostKey, 'utf8'), files['evaluation-plan.json']);
  await assert.rejects(fs.access(path.join(workspace, 'evaluation-plan.json')), { code: 'ENOENT' });
  await assertQualityContract(workspace, contract);
});
