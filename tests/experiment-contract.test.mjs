import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseBehavioralContract, parseCandidateExecutionContract, compilePublicContracts, experimentContractHash, parseExperimentEvaluationPlan } from '../dist-electron/harness/experiment-contract.js';
import { compileExperimentContracts, materializeExperimentContracts, assertExperimentContracts, verifyExperimentCandidate, experimentVerificationPassed, assertExperimentCandidateVerified } from '../dist-electron/electron/experiment-quality.js';

const acceptance = [{ id: 'R1', requirement: 'Compute a total and recover from invalid inputs.', method: 'automated', scenario: 'Independent ordinary and empty sums.' }];
function behavior(surface = 'cli') {
  return {
    schemaVersion: 1, objective: 'Compute the total of supplied values.', surface,
    invocation: { input: 'Object with values: finite number[].', output: 'Exactly {total:number}.', rules: ['Sum every supplied value; an empty array returns zero.'] },
    capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum all supplied values.', criterionIds: ['R1'], required: true, evaluationIds: ['sum-cases'] }],
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'The independently calculated sum is returned.', capabilityIds: ['total'], scenarioIds: surface === 'browser' ? ['primary', 'recovery'] : [] }],
    ux: { audience: 'An operator', primaryTask: 'Sum durations', successOutcome: 'A correct total', states: { empty: 'Explain input', loading: 'Show progress', error: 'Explain validation', success: 'Show total' }, persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'All controls usable by keyboard.' },
    scenarios: surface === 'browser' ? [
      { id: 'primary', title: 'Calculate total', kind: 'primary', steps: [{ id: 'values', action: 'input', value: '1,2' }, { id: 'submit', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }] },
      { id: 'recovery', title: 'Correct invalid values', kind: 'recovery', steps: [{ id: 'invalid', action: 'input', value: 'invalid' }, { id: 'reject', action: 'activate' }, { id: 'error', action: 'expectText', text: 'Enter numbers' }, { id: 'correct', action: 'input', value: '1,2' }, { id: 'retry', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }] }
    ] : []
  };
}
function evaluation() {
  return { schemaVersion: 1, evaluations: [{ id: 'sum-cases', capabilityId: 'total', description: 'Independent reference sums.', dataset: { name: 'sums', version: '1', provenance: 'reviewed' }, evaluator: 'numeric', tolerance: 0, threshold: 1, trials: 1,
    cases: [{ id: 'ordinary', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] };
}
function execution(shared, language = 'node') {
  const file = language === 'python' ? 'engine.py' : 'engine.mjs';
  const runtime = shared.surface === 'browser'
    ? { profile: 'service', files: [file], requiredEnv: [], command: { runtime: language, entrypoint: file, args: [] }, healthPath: '/health', invokePath: '/invoke' }
    : { profile: 'cli', files: [file], requiredEnv: [], command: { runtime: language, entrypoint: file, args: [] } };
  return { schemaVersion: 1, behaviorHash: experimentContractHash(shared), architectureId: language + '-service', runtime,
    foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'Minimal independent architecture fixture.' },
    systemDesign: { title: 'Sum application', description: 'A shared sum engine.', components: [{ id: 'core', label: 'Core', description: 'Compute the sum.', kind: 'logic', files: [file] }], connections: [] },
    screens: [{ name: 'Calculator', purpose: 'Input values and read their sum.', primaryAction: 'Calculate' }],
    bindings: shared.scenarios.map(scenario => ({ scenarioId: scenario.id, steps: scenario.steps.map(step => ({ stepId: step.id, selector: '#' + step.id, ...(step.action === 'input' ? { action: 'fill' } : step.action === 'activate' ? { action: 'click' } : {}) })) })) };
}
function compiled(surface = 'cli', language = 'node') {
  const shared = parseBehavioralContract(behavior(surface), acceptance);
  return compileExperimentContracts(shared, execution(shared, language), evaluation(), acceptance);
}
async function directory(t) { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'experiment-contract-')); t.after(() => fs.rm(root, { recursive: true, force: true })); return root; }

test('different runtime architectures retain the same behavior and evaluation identity', () => {
  const node = compiled('browser', 'node'), python = compiled('browser', 'python');
  assert.equal(node.behaviorHash, python.behaviorHash);
  assert.equal(node.evaluationSetHash, python.evaluationSetHash);
  assert.notEqual(node.executionHash, python.executionHash);
  assert.notEqual(node.qualityContractHash, python.qualityContractHash);
  assert.deepEqual(node.quality.solution.invocation, python.quality.solution.invocation);
  assert.deepEqual(node.quality.solution.capabilities, python.quality.solution.capabilities);
  assert.deepEqual(node.quality.evaluation, python.quality.evaluation);
  assert.equal(node.quality.solution.runtime.command.runtime, 'node');
  assert.equal(python.quality.solution.runtime.command.runtime, 'python');
});

test('shared behavioral planning cannot omit, disconnect, or defer required acceptance', () => {
  for (const mutate of [value => { value.criteria = []; }, value => { value.criteria[0].capabilityIds = []; }, value => { value.criteria[0].disposition = 'deferred'; value.criteria[0].reason = 'Too hard'; value.criteria[0].capabilityIds = []; }, value => { value.capabilities[0].criterionIds = ['invented']; }]) {
    const value = behavior(); mutate(value); assert.throws(() => parseBehavioralContract(value, acceptance));
  }
  const value = behavior('browser'); value.scenarios.pop();
  assert.throws(() => parseBehavioralContract(value, acceptance), /2–12/);
  const noLiteral = behavior('browser'); noLiteral.scenarios[0].steps[2] = { id: 'result', action: 'expectVisible' };
  assert.throws(() => parseBehavioralContract(noLiteral, acceptance), /literal outcome/);
});

test('delivery profiles bind actual runtime and prevent ambient credential requirements', () => {
  const input = behavior('browser'); input.delivery = { profiles: ['node-service', 'python-service'], network: 'configured-services', operationIds: ['weather'] };
  const shared = parseBehavioralContract(input, acceptance), node = execution(shared);
  assert.equal(parseCandidateExecutionContract(node, shared, acceptance).architectureId, 'node-service');
  const wrong = structuredClone(node); wrong.runtime.command.runtime = 'python';
  assert.throws(() => parseCandidateExecutionContract(wrong, shared, acceptance), /allowed by the frozen delivery/);
  const credentials = structuredClone(node); credentials.runtime.requiredEnv = ['API_KEY'];
  assert.throws(() => parseCandidateExecutionContract(credentials, shared, acceptance), /configured host operations/);
  const restricted = parseBehavioralContract({ ...input, delivery: { profiles: ['node-service'], network: 'offline', operationIds: [] } }, acceptance);
  assert.throws(() => parseCandidateExecutionContract(execution(restricted, 'python'), restricted, acceptance), /allowed by the frozen delivery/);
});

test('comparison contracts retain primary synthetic coverage and require its named output in the shared journey', () => {
  const requirements = [...acceptance, { id: 'R2', requirement: 'Prepare a synthetic draft for publication after owner approval.', method: 'automated', scenario: 'Prepare a draft without publishing.' }];
  const input = behavior('browser');
  const coverage = { assumptions: 'Fictional local draft only; no publication or authority is granted.', journeyIds: ['primary'], outputs: [{ sourceCriterionId: 'R2', name: 'synthetic draft' }] };
  input.criteria.push({ criterionId: 'R2', disposition: 'deferred', expectedOutcome: 'Owner approval remains necessary before publication.', capabilityIds: [], scenarioIds: [],
    reason: 'human-authority: Publication requires owner approval. A local synthetic draft is demonstrated without publication.', syntheticCoverage: coverage });
  input.scenarios[0].steps.push({ id: 'draft', action: 'expectText', text: 'Synthetic draft ready for owner review' });
  const shared = parseBehavioralContract(input, requirements);
  const contracts = compilePublicContracts(shared, parseCandidateExecutionContract(execution(shared), shared, requirements));
  assert.deepEqual(contracts.plan.criteria.find(item => item.criterionId === 'R2').syntheticCoverage, coverage);
  const missing = structuredClone(input); delete missing.criteria[1].syntheticCoverage;
  assert.throws(() => parseBehavioralContract(missing, requirements), /synthetic|primary/i);
  const unobserved = structuredClone(input); unobserved.scenarios[0].steps.pop();
  assert.throws(() => parseBehavioralContract(unobserved, requirements), /output|assert|synthetic/i);
});

test('a candidate cannot escape a common browser requirement or rewrite shared expectations', () => {
  const shared = parseBehavioralContract(behavior('browser'), acceptance);
  const cli = execution(shared); cli.runtime = execution(parseBehavioralContract(behavior(), acceptance)).runtime;
  assert.throws(() => parseCandidateExecutionContract(cli, shared, acceptance), /shared product surface/);
  for (const mutate of [value => { value.invocation = { input: 'different' }; }, value => { value.behaviorHash = '0'.repeat(64); }, value => { value.bindings[0].steps[2].text = 'an easier result'; }, value => { value.bindings[0].steps[0].value = 'easier input'; }, value => { value.bindings[0].steps[2].action = 'expectVisible'; }]) {
    const value = execution(shared); mutate(value); assert.throws(() => parseCandidateExecutionContract(value, shared, acceptance), /unknown field|hash|host-owned/);
  }
});

test('different forms and wizard navigation compile shared inputs and host assertions', () => {
  const shared = parseBehavioralContract(behavior('browser'), acceptance), candidate = execution(shared);
  candidate.bindings[0].steps[0].before = [{ action: 'click', selector: '#open-calculator' }, { action: 'press', selector: '#wizard', key: 'Enter' }];
  candidate.bindings[0].steps[0].selector = '#duration-list';
  candidate.bindings[0].steps[1] = { stepId: 'submit', selector: '#duration-list', action: 'press', key: 'Enter' };
  candidate.bindings[0].steps[2].selector = '.computed-value';
  const result = compilePublicContracts(shared, parseCandidateExecutionContract(candidate, shared, acceptance));
  assert.deepEqual(result.plan.journeys[0].steps, [
    { action: 'click', selector: '#open-calculator' }, { action: 'press', selector: '#wizard', key: 'Enter' },
    { action: 'fill', selector: '#duration-list', value: '1,2' }, { action: 'press', selector: '#duration-list', key: 'Enter' }, { action: 'expectText', selector: '.computed-value', text: '3' }
  ]);
  assert.deepEqual(result.ux.states, shared.ux.states);
});

test('candidate bindings cannot omit/reorder scenarios, weaken observations or execute arbitrary code', () => {
  const shared = parseBehavioralContract(behavior('browser'), acceptance);
  const mutations = [
    value => value.bindings.pop(), value => value.bindings.reverse(), value => value.bindings[0].steps.reverse(), value => value.bindings[0].steps.pop(),
    value => { value.bindings[0].steps[2].before = [{ action: 'click', selector: '#fake-result' }]; },
    value => { value.bindings[0].steps[0].before = [{ action: 'evaluate', script: 'return true' }]; },
    value => { value.bindings[0].steps[0].before = Array.from({ length: 5 }, () => ({ action: 'click', selector: '#next' })); },
    value => { value.runtime.files.push('behavior-contract.json'); }, value => { value.systemDesign.components[0].files = ['undeclared.js']; }
  ];
  for (const mutate of mutations) { const value = execution(shared); mutate(value); assert.throws(() => parseCandidateExecutionContract(value, shared, acceptance)); }
});

test('combined recipe steps cannot exceed existing host browser limits', () => {
  const value = behavior('browser');
  value.scenarios[0].steps = Array.from({ length: 20 }, (_, i) => ({ id: 'input-' + i, action: 'input', value: String(i) })).concat([{ id: 'submit', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }]);
  const shared = parseBehavioralContract(value, acceptance), candidate = execution(shared);
  for (const step of candidate.bindings[0].steps.slice(0, 20)) step.before = [{ action: 'click', selector: '#open' }];
  assert.throws(() => parseCandidateExecutionContract(candidate, shared, acceptance), /2–40/);
});

test('strict JSON contracts reject extra fields, accessors, sparse arrays and cycles', () => {
  for (const mutate of [value => { value.ux.unapproved = true; }, value => { value.capabilities[0].extra = true; }, value => { value.criteria = new Array(1); }, value => { value.ux.states = value; }, value => { Object.defineProperty(value.ux, 'audience', { enumerable: true, get() { assert.fail('Getter must not execute'); } }); }]) {
    const value = behavior(); mutate(value); assert.throws(() => parseBehavioralContract(value, acceptance));
  }
  const shared = parseBehavioralContract(behavior(), acceptance), candidate = execution(shared);
  candidate.systemDesign.components[0].extra = true;
  assert.throws(() => parseCandidateExecutionContract(candidate, shared, acceptance), /unknown field/);
});

test('shared evaluator references and expected cases stay private while public contracts freeze', async t => {
  const root = await directory(t), contract = compiled();
  assert.deepEqual(parseExperimentEvaluationPlan(evaluation(), contract.behavior), contract.evaluation);
  await materializeExperimentContracts(root, contract);
  await assert.rejects(fs.stat(path.join(root, 'evaluation-plan.json')), { code: 'ENOENT' });
  await assertExperimentContracts(root, contract);
  assert.equal(await fs.readFile(path.join(root, 'solution-contract.json'), 'utf8'), contract.bodies.solution);
  assert.equal(contract.quality.sealedEvaluation, true);
  assert.ok(!contract.bodies.behavior.includes('"expected"'));
  await fs.writeFile(path.join(root, 'execution-contract.json'), contract.bodies.execution.replace('node-service', 'other-architecture'));
  await assert.rejects(assertExperimentContracts(root, contract), /execution-contract/);
});

test('candidate workspace answer keys and aliased frozen files are rejected', async t => {
  const root = await directory(t), contract = compiled();
  await fs.writeFile(path.join(root, 'evaluation-plan.json'), '{}');
  await assert.rejects(materializeExperimentContracts(root, contract), /outside every candidate/);
  await fs.unlink(path.join(root, 'evaluation-plan.json'));
  const outside = path.join(await directory(t), 'private.json'); await fs.writeFile(outside, '{}');
  await fs.symlink(outside, path.join(root, 'behavior-contract.json'));
  await assert.rejects(materializeExperimentContracts(root, contract), /aliased/);
  assert.equal(await fs.readFile(outside, 'utf8'), '{}');
  await fs.unlink(path.join(root, 'behavior-contract.json')); await fs.link(outside, path.join(root, 'behavior-contract.json'));
  await assert.rejects(materializeExperimentContracts(root, contract), /aliased/);
});

async function runtimeFixture(t, language = 'node', broken = false) {
  const root = await directory(t), contract = compiled('cli', language);
  await materializeExperimentContracts(root, contract);
  if (language === 'node') {
    await fs.writeFile(path.join(root, 'engine.mjs'), `let raw='';for await(const chunk of process.stdin)raw+=chunk;const {values}=JSON.parse(raw);console.log(JSON.stringify({total:${broken ? '5' : 'values.reduce((a,b)=>a+b,0)'}}));`);
  } else {
    await fs.writeFile(path.join(root, 'engine.py'), `import sys,json\nvalue=json.load(sys.stdin)\nprint(json.dumps({'total':${broken ? '5' : "sum(value['values'])"}}))\n`);
  }
  // Deliberately weak developer test: host case evidence must still reject the broken core.
  await fs.writeFile(path.join(root, 'engine.test.mjs'), `import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';test('delivered engine exists',()=>assert.ok(readFileSync('${language === 'node' ? 'engine.mjs' : 'engine.py'}').length>0));`);
  return { root, contract };
}

test('a real Node candidate verifies through existing clean-package scorers with bound experiment identity', async t => {
  const { root, contract } = await runtimeFixture(t), expected = { experimentId: 'experiment-1', candidateId: 'candidate-A' };
  const evidence = await verifyExperimentCandidate(root, process.execPath, contract, expected);
  assert.equal(experimentVerificationPassed(evidence, contract, expected), true);
  await assertExperimentCandidateVerified(root, evidence, contract, expected);
  assert.equal(experimentVerificationPassed(evidence, contract, { ...expected, candidateId: 'candidate-B' }), false);
  for (const mutate of [
    value => { value.identity.executionHash = '0'.repeat(64); },
    value => { value.report.quality.schemaVersion = 3; },
    value => { value.report.quality.experiment.candidateId = 'another-candidate'; },
    value => { value.report.quality.experiment.evaluationSetHash = '0'.repeat(64); },
    value => { value.report.quality.solutionEvaluation.evaluations[0].cases[1].id = 'invented'; },
    value => { value.report.quality.solutionEvaluation.evaluations[0].threshold = 0.5; },
    value => { value.report.quality.solutionEvaluation.evaluations[0].dataset.version = '2'; },
    value => { value.report.quality.criteria[0].status = 'unverified'; }
  ]) { const changed = structuredClone(evidence); mutate(changed); assert.equal(experimentVerificationPassed(changed, contract, expected), false); }
  await fs.appendFile(path.join(root, 'engine.mjs'), '\n// changed after verification\n');
  await assert.rejects(assertExperimentCandidateVerified(root, evidence, contract, expected), /source changed/);
});

test('broken core cannot be selected despite passing developer tests', async t => {
  const { root, contract } = await runtimeFixture(t, 'node', true), expected = { experimentId: 'experiment-1', candidateId: 'candidate-B' };
  const evidence = await verifyExperimentCandidate(root, process.execPath, contract, expected);
  assert.equal(evidence.report.failed, 0);
  assert.equal(evidence.report.quality.solutionEvaluation.status, 'failed');
  assert.equal(experimentVerificationPassed(evidence, contract, expected), false);
});

const pythonAvailable = spawnSync('python3', ['--version']).status === 0;
test('Python and Node engines satisfy identical shared protocol and host evaluations', { skip: !pythonAvailable }, async t => {
  const python = await runtimeFixture(t, 'python'), node = await runtimeFixture(t, 'node');
  for (const [candidateId, fixture] of [['python', python], ['node', node]]) {
    const expected = { experimentId: 'comparison', candidateId };
    const evidence = await verifyExperimentCandidate(fixture.root, process.execPath, fixture.contract, expected);
    assert.equal(experimentVerificationPassed(evidence, fixture.contract, expected), true, evidence.report.output);
  }
  assert.equal(node.contract.behaviorHash, python.contract.behaviorHash);
  assert.equal(node.contract.evaluationSetHash, python.contract.evaluationSetHash);
});
