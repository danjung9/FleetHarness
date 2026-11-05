import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateExecutionGuide, compilePublicContracts, experimentContractBody, experimentContractHash, parseBehavioralContract,
  parseCandidateExecutionContract, parsePlannedCandidateExecutionContract } from '../dist-electron/harness/experiment-contract.js';

const acceptance = [{ id: 'R1', requirement: 'Compute a sum and recover from invalid inputs.', method: 'automated', scenario: 'Enter values, inspect the total, correct invalid values.' }];
function sharedContract(surface = 'browser') {
  return parseBehavioralContract({
    schemaVersion: 1, objective: 'Compute the total of supplied values.', surface,
    invocation: { input: 'Object with values: finite number[].', output: 'Exactly {total:number}.', rules: ['Sum every supplied value; an empty array returns zero.'] },
    capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum supplied values.', criterionIds: ['R1'], required: true, evaluationIds: ['sum-cases'] }],
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'The correct sum is returned.', capabilityIds: ['total'], scenarioIds: surface === 'browser' ? ['primary', 'recovery'] : [] }],
    ux: { audience: 'An operator', primaryTask: 'Sum durations', successOutcome: 'A correct total',
      states: { empty: 'Explain input', loading: 'Show progress', error: 'Explain validation', success: 'Show total' },
      persistence: 'Preserve values when navigating between screens.', recovery: 'Correct invalid input and retry.', keyboard: 'All controls usable by keyboard.' },
    scenarios: surface === 'browser' ? [
      { id: 'primary', title: 'Calculate total', kind: 'primary', steps: [{ id: 'values', action: 'input', value: '1,2' }, { id: 'submit', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }] },
      { id: 'recovery', title: 'Correct invalid values', kind: 'recovery', steps: [{ id: 'invalid', action: 'input', value: 'invalid' }, { id: 'reject', action: 'activate' }, { id: 'error', action: 'expectText', text: 'Enter numbers' }, { id: 'correct', action: 'input', value: '1,2' }, { id: 'retry', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }] }
    ] : []
  }, acceptance);
}
function candidate(shared, version = 2) {
  const browser = shared.surface === 'browser';
  const base = {
    schemaVersion: version, behaviorHash: experimentContractHash(shared), architectureId: browser ? 'node-service' : 'node-cli',
    runtime: { profile: browser ? 'service' : 'cli', files: browser ? ['engine.mjs', 'index.html', 'results.html'] : ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] },
      ...(browser ? { healthPath: '/health', invokePath: '/invoke' } : {}) },
    foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'An independent sum engine and focused screens.' },
    systemDesign: { title: 'Sum application', description: 'A sum engine and browser interface.', components: [{ id: 'core', label: 'Core', description: 'Compute sums.', kind: 'logic', files: ['engine.mjs'] }], connections: [] },
    screens: [{ name: 'Calculator', purpose: 'Enter values.', primaryAction: 'Calculate' }],
    bindings: shared.scenarios.map(scenario => ({ scenarioId: scenario.id, steps: scenario.steps.map(step => ({ stepId: step.id,
      ...(step.action === 'reload' ? {} : { selector: '#' + step.id }),
      ...(step.action === 'input' ? { action: 'fill' } : step.action === 'activate' ? { action: 'click' } : {}) })) }))
  };
  if (version === 1) return base;
  base.structure = { pattern: 'steps', rationale: 'Separate input from focused result review.', entryScreenId: 'calculator', navigation: 'Calculate opens results; Edit returns to the form.', persistentElements: 'App title and navigation remain available.' };
  base.screens = [
    { id: 'calculator', name: 'Calculator', purpose: 'Enter values.', primaryAction: 'Calculate', route: '/', selector: '#calculator-screen', layout: 'A narrow input form with one primary action.', secondaryContent: 'Examples are in a disclosure below the form.', narrowLayout: 'Use the full width and keep the action after the fields.' },
    { id: 'results', name: 'Results', purpose: 'Review the sum.', primaryAction: 'Edit values', route: '/results.html', selector: '#results-screen', layout: 'The total is the main content; edit is a supporting action.', secondaryContent: 'Input breakdown appears on demand.', narrowLayout: 'Place the total above the supporting controls.' }
  ];
  for (const binding of base.bindings) for (const step of binding.steps) {
    if (step.stepId === 'submit' || step.stepId === 'retry') step.screenId = 'results';
    if (step.stepId === 'reject') step.screenId = 'calculator';
  }
  return base;
}

test('candidate screen plans compile multipage entry and transition assertions without changing shared outcomes', () => {
  const shared = sharedContract(), before = structuredClone(shared), input = candidate(shared);
  const parsed = parsePlannedCandidateExecutionContract(input, shared, acceptance);
  const compiled = compilePublicContracts(shared, parsed);
  assert.equal(parsed.schemaVersion, 2);
  assert.equal(compiled.ux.schemaVersion, 2);
  assert.deepEqual(compiled.ux.structure, input.structure);
  assert.deepEqual(compiled.ux.screens.map(screen => screen.route), ['/', '/results.html']);
  assert.deepEqual(compiled.plan.journeys[0].steps, [
    { action: 'expectScreen', screenId: 'calculator' },
    { action: 'fill', selector: '#values', value: '1,2' },
    { action: 'click', selector: '#submit' },
    { action: 'expectScreen', screenId: 'results' },
    { action: 'expectText', selector: '#result', text: '3' }
  ]);
  for (const journey of compiled.plan.journeys) assert.deepEqual(journey.steps[0], { action: 'expectScreen', screenId: 'calculator' });
  assert.deepEqual(shared, before, 'Architecture-specific routes never enter the shared behavioral contract.');
  assert.equal(experimentContractHash(shared), input.behaviorHash);
});

test('candidate screen assertions follow navigation and shared observations, including reload', () => {
  const shared = sharedContract();
  shared.scenarios[0].steps.push({ id: 'reload-result', action: 'reload' }, { id: 'persisted-result', action: 'expectText', text: '3' });
  const input = candidate(shared);
  input.bindings[0].steps[0].before = [{ action: 'click', selector: '#open-form' }];
  input.bindings[0].steps[2].screenId = 'results';
  input.bindings[0].steps[3].screenId = 'results';
  const compiled = compilePublicContracts(shared, parsePlannedCandidateExecutionContract(input, shared, acceptance));
  assert.deepEqual(compiled.plan.journeys[0].steps.slice(0, 3), [
    { action: 'expectScreen', screenId: 'calculator' }, { action: 'click', selector: '#open-form' }, { action: 'fill', selector: '#values', value: '1,2' }
  ]);
  assert.deepEqual(compiled.plan.journeys[0].steps.slice(-5), [
    { action: 'expectText', selector: '#result', text: '3' }, { action: 'expectScreen', screenId: 'results' },
    { action: 'reload' }, { action: 'expectScreen', screenId: 'results' }, { action: 'expectText', selector: '#persisted-result', text: '3' }
  ]);
});

test('live browser candidate planning requires version 2 and coverage for every screen', () => {
  const shared = sharedContract();
  assert.throws(() => parsePlannedCandidateExecutionContract(candidate(shared, 1), shared, acceptance), /schemaVersion 2/);
  const missing = candidate(shared);
  for (const binding of missing.bindings) for (const step of binding.steps) delete step.screenId;
  assert.throws(() => parsePlannedCandidateExecutionContract(missing, shared, acceptance), /Missing screens: results/);
  const unknown = candidate(shared);
  unknown.bindings[0].steps[1].screenId = 'unplanned';
  assert.throws(() => parseCandidateExecutionContract(unknown, shared, acceptance), /unknown screen/);
  const inPage = candidate(shared);
  inPage.screens[1].route = '/';
  assert.equal(parsePlannedCandidateExecutionContract(inPage, shared, acceptance).screens.length, 2, 'Distinct roots can share a route.');
});

test('screen bindings can only strengthen shared steps and cannot rewrite inputs or assertions', () => {
  const shared = sharedContract();
  for (const mutate of [
    value => { value.bindings[0].steps[0].value = 'easier input'; },
    value => { value.bindings[0].steps[2].text = 'easier result'; },
    value => { value.bindings[0].steps[2].action = 'expectVisible'; },
    value => { value.bindings[0].steps[2].before = [{ action: 'click', selector: '#fake-result' }]; },
    value => { value.bindings[0].steps[2].screenId = { selector: '#fake-result' }; },
    value => { value.bindings[0].steps[2].route = '/easier-result.html'; },
    value => { value.bindings[0].steps[2].stepId = 'submit'; }
  ]) {
    const input = candidate(shared); mutate(input);
    assert.throws(() => parsePlannedCandidateExecutionContract(input, shared, acceptance));
  }
  const legacy = candidate(shared, 1);
  legacy.bindings[0].steps[1].screenId = 'results';
  assert.throws(() => parseCandidateExecutionContract(legacy, shared, acceptance), /unknown field: screenId/);
});

test('legacy candidates preserve their contracts and hashes; CLI planning retains UX version 1', () => {
  for (const surface of ['browser', 'cli']) {
    const shared = sharedContract(surface), input = candidate(shared, 1);
    const parsed = parseCandidateExecutionContract(input, shared, acceptance);
    assert.equal(experimentContractHash(parsed), experimentContractHash(input));
    const originalOrder = { schemaVersion: 1, behaviorHash: parsed.behaviorHash, architectureId: parsed.architectureId,
      runtime: parsed.runtime, foundation: parsed.foundation, systemDesign: parsed.systemDesign, screens: parsed.screens, bindings: parsed.bindings };
    assert.equal(experimentContractBody(parsed), experimentContractBody(originalOrder), 'Restoring a frozen candidate must retain the original JSON field order and serialized body.');
    const compiled = compilePublicContracts(shared, parsed);
    const expectedUx = { schemaVersion: 1, ...shared.ux, screens: input.screens };
    assert.deepEqual(compiled.ux, expectedUx);
    assert.equal(experimentContractHash(compiled.ux), experimentContractHash(expectedUx));
    assert.ok(compiled.plan.journeys.every(journey => journey.steps.every(step => step.action !== 'expectScreen')));
    if (surface === 'cli') {
      assert.deepEqual(parsePlannedCandidateExecutionContract(input, shared, acceptance), parsed);
      assert.throws(() => parsePlannedCandidateExecutionContract(candidate(shared), shared, acceptance), /CLI.*schemaVersion 1/);
    }
  }
});

test('entry and transition assertions count toward the compiled browser step limit', () => {
  const shared = sharedContract();
  shared.scenarios[0].steps = [
    ...Array.from({ length: 19 }, (_, i) => ({ id: 'input-' + i, action: 'input', value: String(i) })),
    { id: 'submit', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }
  ];
  const input = candidate(shared);
  for (const step of input.bindings[0].steps.slice(0, 19)) step.screenId = 'calculator';
  assert.throws(() => parsePlannedCandidateExecutionContract(input, shared, acceptance), /2–40/);
});

test('candidate guides require structured browser plans and preserve CLI planning', () => {
  const browser = candidateExecutionGuide('frozen-hash', 'node-service');
  assert.match(browser, /schemaVersion:2/);
  assert.match(browser, /Multiple HTML pages, routes and in-page views are supported/);
  assert.match(browser, /screen map, navigation transitions, rough layout/);
  assert.match(browser, /Build the shared navigation and layout shell first/);
  assert.match(browser, /AFTER its shared action or observation/);
  const cli = candidateExecutionGuide('frozen-hash', 'node-cli');
  assert.match(cli, /schemaVersion:1/);
  assert.match(cli, /no browser structure/);
  assert.ok(!cli.includes('entryScreenId'));
});
