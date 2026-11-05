import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSolutionContract, parseEvaluationPlan, solutionLimits } from '../dist-electron/harness/solution-contract.js';

const acceptance = [{ id: 'R1', requirement: 'Compute a result', method: 'automated', scenario: 'Independent reference cases' }];
const solution = (profile = 'cli') => ({
  schemaVersion: 1,
  objective: 'Compute a total from task durations',
  capabilities: [{ id: 'totals', kind: 'algorithm', description: 'Calculate the sum', criterionIds: ['R1'], required: true, evaluationIds: ['sum-check'] }],
  runtime: profile === 'browser'
    ? { profile, entrypoint: 'index.html', files: ['index.html', 'engine.mjs', 'evaluate.mjs'], requiredEnv: [], evaluator: { runtime: 'node', entrypoint: 'evaluate.mjs', args: [] } }
    : { profile, files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] }, ...(profile === 'service' ? { healthPath: '/health', invokePath: '/invoke' } : {}) }
});
const plan = () => ({ schemaVersion: 1, evaluations: [{
  id: 'sum-check', capabilityId: 'totals', description: 'Independent sums for ordinary and empty inputs',
  dataset: { name: 'sum-reference', version: '1', provenance: 'reviewed', description: 'Calculated from the source rule' },
  evaluator: 'numeric', threshold: 1, trials: 1, baseline: 0.5, tolerance: 0,
  cases: [{ id: 'ordinary', input: { values: [1, 2] }, expected: { total: 3 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }]
}] });
const parsedSolution = () => parseSolutionContract(solution(), acceptance);
const invalidSolution = (mutate, expression) => { const value = solution(); mutate(value); assert.throws(() => parseSolutionContract(value, acceptance), expression); };
const invalidPlan = (mutate, expression) => { const value = plan(); mutate(value); assert.throws(() => parseEvaluationPlan(value, parsedSolution()), expression); };

test('solution contracts support browser, executable and service runtimes with frozen evaluation inputs', () => {
  for (const profile of ['browser', 'cli', 'service']) assert.deepEqual(parseSolutionContract(solution(profile), acceptance), solution(profile));
  const input = plan();
  const result = parseEvaluationPlan(input, parsedSolution());
  assert.deepEqual(result, input);
  input.evaluations[0].cases[0].input.values.push(100);
  assert.deepEqual(result.evaluations[0].cases[0].input, { values: [1, 2] });
});

test('a required core capability cannot be omitted, disconnected from acceptance, or left untested', () => {
  invalidSolution(value => { value.capabilities[0].required = false; }, /core capability must be required/);
  invalidSolution(value => { value.capabilities[0].evaluationIds = []; }, /must contain 1/);
  invalidSolution(value => { value.capabilities[0].criterionIds = ['invented']; }, /unknown acceptance criterion/);
  invalidSolution(value => { value.capabilities[0].criterionIds = []; }, /must contain 1/);
  invalidSolution(value => { value.capabilities[0].criterionIds.push('R1'); }, /duplicate/);
  invalidSolution(value => { value.capabilities.push(structuredClone(value.capabilities[0])); }, /duplicate/);
  invalidSolution(value => { value.capabilities[0].required = 'true'; }, /must be a boolean/);
  assert.throws(() => parseSolutionContract(solution(), []), /acceptance inventory/);
  assert.throws(() => parseSolutionContract(solution(), [...acceptance, ...acceptance]), /acceptance inventory/);
});

test('a public invocation protocol is validated and copied while legacy solutions remain readable', () => {
  const value = solution();
  value.invocation = { input: 'Object containing values: finite number[].', output: 'Exactly {total: number}.', rules: ['Sum all values; empty input totals zero.'] };
  const parsed = parseSolutionContract(value, acceptance);
  assert.deepEqual(parsed.invocation, value.invocation);
  value.invocation.rules.push('Changed after parsing.');
  assert.equal(parsed.invocation.rules.length, 1);
  assert.equal(Object.hasOwn(parsedSolution(), 'invocation'), false);
  for (const invocation of [null, {}, { input: 'values', output: 'total', rules: [] },
    { input: 'values', output: ' ', rules: ['sum'] },
    { input: 'values', output: 'total', rules: ['sum'], expected: { total: 3 } },
    { input: 'x'.repeat(12_001), output: 'total', rules: ['sum'] },
    { input: 'values', output: 'total', rules: ['x'.repeat(2_001)] }]) {
    invalidSolution(value => { value.invocation = invocation; }, /invocation/);
  }
});

test('capability/evaluation references must be complete, unique and owned by the named capability', () => {
  invalidPlan(value => { value.evaluations[0].capabilityId = 'missing'; }, /unknown capability/);
  invalidPlan(value => { value.evaluations[0].id = 'unplanned'; }, /must be referenced/);
  invalidPlan(value => { value.evaluations.push(structuredClone(value.evaluations[0])); }, /Evaluation IDs contains duplicate/);
  const contract = solution();
  contract.capabilities[0].evaluationIds.push('boundary-check');
  assert.throws(() => parseEvaluationPlan(plan(), parseSolutionContract(contract, acceptance)), /Missing declared evaluations: boundary-check/);
  contract.capabilities.push({ ...contract.capabilities[0], id: 'other', required: false, evaluationIds: ['sum-check'] });
  assert.throws(() => parseSolutionContract(contract, acceptance), /evaluation IDs contains duplicate/);
});

test('required evaluation cases need two distinct inputs independent of object key ordering', () => {
  invalidPlan(value => { value.evaluations[0].cases.pop(); }, /must contain 2/);
  invalidPlan(value => {
    value.evaluations[0].cases[0].input = { alpha: 1, beta: [2, { gamma: 3, delta: 4 }] };
    value.evaluations[0].cases[1].input = { beta: [2, { delta: 4, gamma: 3 }], alpha: 1 };
  }, /two distinct inputs/);
  invalidPlan(value => { value.evaluations[0].cases[1].id = 'ordinary'; }, /case IDs contains duplicate/);
});

test('evaluation thresholds cannot be zero, nonfinite, above one, or below the baseline', () => {
  for (const threshold of [0, -0.01, 1.01, NaN, Infinity, '1']) invalidPlan(value => { value.evaluations[0].threshold = threshold; }, /finite number/);
  invalidPlan(value => { value.evaluations[0].threshold = 0.2; }, /meet or exceed/);
  invalidPlan(value => { value.evaluations[0].baseline = 1.01; }, /finite number/);
  invalidPlan(value => { value.evaluations[0].tolerance = -1; }, /finite number/);
  invalidPlan(value => { value.evaluations[0].evaluator = 'exact'; }, /tolerance is only supported/);
});

test('evaluation complexity and invocation budgets are enforced across the complete plan', () => {
  for (const trials of [0, 1.2, 11, Infinity]) invalidPlan(value => { value.evaluations[0].trials = trials; }, /integer/);
  const contract = solution();
  contract.capabilities[0].evaluationIds = ['sum-check', 'more-check'];
  const value = plan();
  value.evaluations[0].cases = Array.from({ length: solutionLimits.cases }, (_, i) => ({ id: `case-${i}`, input: i, expected: i }));
  value.evaluations[0].trials = solutionLimits.trials;
  value.evaluations.push({ ...value.evaluations[0], id: 'more-check', trials: 1 });
  assert.throws(() => parseEvaluationPlan(value, parseSolutionContract(contract, acceptance)), /invocation budget/);
  invalidPlan(value => { value.evaluations[0].cases[0].input = 'x'.repeat(solutionLimits.caseBytes + 1); }, /JSON limit/);
  invalidPlan(value => { value.evaluations[0].cases[0].input = '😀'.repeat(Math.ceil(solutionLimits.caseBytes / 3)); }, /byte JSON limit/);
  invalidPlan(value => { value.evaluations[0].cases[0].input = Array.from({ length: solutionLimits.jsonNodes + 1 }, () => 1); }, /must contain/);
  invalidPlan(value => { let nested = 0; for (let i = 0; i < solutionLimits.jsonDepth + 1; i++) nested = { nested }; value.evaluations[0].cases[0].input = nested; }, /complexity budget/);
});

test('JSON values reject cycles, holes, nonfinite values, functions, accessors and prototype-bearing objects', () => {
  for (const input of [undefined, Infinity, NaN, 1n, () => 1, new Date(), { value: undefined }, new Array(2)]) {
    invalidPlan(value => { value.evaluations[0].cases[0].input = input; }, /JSON|plain object/);
  }
  const cycle = {}; cycle.self = cycle;
  invalidPlan(value => { value.evaluations[0].cases[0].input = cycle; }, /cyclic/);
  const accessor = Object.defineProperty({}, 'getter', { enumerable: true, get() { assert.fail('Getter must never run'); } });
  invalidPlan(value => { value.evaluations[0].cases[0].input = accessor; }, /ordinary JSON field/);
  const arrayAccessor = Object.defineProperty([], '0', { enumerable: true, get() { assert.fail('Array getter must never run'); } });
  invalidPlan(value => { value.evaluations[0].cases[0].input = arrayAccessor; }, /ordinary JSON array/);
});

test('contracts reject unknown fields and arbitrary executable evaluators', () => {
  invalidSolution(value => { value.extra = true; }, /unknown field/);
  invalidSolution(value => { value.runtime.command.shell = 'sh'; }, /unknown field/);
  invalidSolution(value => { value.runtime.command.runtime = 'bash'; }, /must be node or python/);
  invalidSolution(value => { value.capabilities[0].kind = 'ranking'; }, /kind must be one of/);
  invalidPlan(value => { value.evaluations[0].evaluator = 'custom-script'; }, /evaluator must be one of/);
  invalidPlan(value => { value.evaluations[0].score = '() => 1'; }, /unknown field/);
  invalidPlan(value => { value.evaluations[0].cases[0].skip = true; }, /unknown field/);
  invalidPlan(value => { value.evaluations[0].dataset.secret = 'value'; }, /unknown field/);
  invalidPlan(value => { value.evaluations[0].dataset.provenance = 'verified'; }, /provenance/);
});

test('runtime file allowlists reject traversal, host answer keys, secret files and case collisions', () => {
  for (const file of ['/tmp/engine.mjs', '../engine.mjs', 'nested/../engine.mjs', './engine.mjs', 'nested//engine.mjs', 'C:\\engine.mjs', 'engine;rm.mjs', '.fleet/packet.json', 'inputs/manifest.json', 'evaluation-plan.json', 'EVALUATION-PLAN.JSON', 'data/solution-contract.json', 'node_modules/lib.mjs', '.env', '.env.local', 'a\0b']) {
    invalidSolution(value => { value.runtime.files.push(file); }, /relative portable|NUL/);
  }
  invalidSolution(value => { value.runtime.files.push('ENGINE.MJS'); }, /case-insensitive/);
  invalidSolution(value => { value.runtime.command.entrypoint = 'missing.mjs'; }, /appear in runtime.files/);
  invalidSolution(value => { value.runtime.files = []; }, /must contain 1/);
});

test('runtime configuration enforces profile-specific entrypoints and local service endpoints', () => {
  const browser = solution('browser');
  delete browser.runtime.evaluator;
  assert.throws(() => parseSolutionContract(browser, acceptance), /runtime.evaluator must be a plain object/);
  const configuredBrowser = solution('browser'); configuredBrowser.runtime.requiredEnv = ['MODEL_API_KEY'];
  assert.throws(() => parseSolutionContract(configuredBrowser, acceptance), /static browser runtime cannot receive requiredEnv/);
  const pythonBrowser = solution('browser'); pythonBrowser.runtime.evaluator.runtime = 'python';
  assert.throws(() => parseSolutionContract(pythonBrowser, acceptance), /static browser evaluator must use node/);
  invalidSolution(value => { value.runtime.evaluator = value.runtime.command; }, /CLI and service runtimes use command/);
  invalidSolution(value => { value.runtime.healthPath = '/health'; }, /Only service/);
  for (const healthPath of ['https://example.com/health', '//remote', '/../../health', '/health?token=secret', '/health#fragment', '/a%2fhealth']) {
    const service = solution('service'); service.runtime.healthPath = healthPath;
    assert.throws(() => parseSolutionContract(service, acceptance), /local absolute HTTP path/);
  }
  const service = solution('service'); service.runtime.healthPath = '/invoke';
  assert.throws(() => parseSolutionContract(service, acceptance), /must be distinct/);
});

test('dependency installation requires explicit allowlisted manifests and matching runtimes', () => {
  const node = solution();
  node.runtime.files.push('package.json', 'package-lock.json');
  node.runtime.dependencies = { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' };
  assert.deepEqual(parseSolutionContract(node, acceptance), node);
  node.runtime.files.pop();
  assert.throws(() => parseSolutionContract(node, acceptance), /manifest and lockfile must appear/);
  node.runtime.files.push('package-lock.json');
  node.runtime.dependencies.lockfile = 'package.json';
  assert.throws(() => parseSolutionContract(node, acceptance), /must be distinct/);
  const python = solution();
  python.runtime.command.runtime = 'python';
  python.runtime.files.push('requirements.in', 'requirements.txt');
  python.runtime.dependencies = { manager: 'pip', manifest: 'requirements.in', lockfile: 'requirements.txt' };
  assert.deepEqual(parseSolutionContract(python, acceptance), python);
  python.runtime.command.runtime = 'node';
  assert.throws(() => parseSolutionContract(python, acceptance), /manager must match/);
});

test('required environment variables contain names only and command arguments are bounded strings', () => {
  invalidSolution(value => { value.runtime.requiredEnv = ['OPENAI_API_KEY=secret']; }, /environment variable name/);
  for (const name of ['PATH', 'NODE_OPTIONS', 'PYTHONPATH', 'PIP_INDEX_URL', 'model_key']) invalidSolution(value => { value.runtime.requiredEnv = [name]; }, /nonreserved uppercase/);
  invalidSolution(value => { value.runtime.requiredEnv = ['TOKEN', 'TOKEN']; }, /duplicate/);
  invalidSolution(value => { value.runtime.command.args = ['line\nbreak']; }, /control line breaks/);
  invalidSolution(value => { value.runtime.command.args = ['x'.repeat(1025)]; }, /1024/);
  const configured = solution(); configured.runtime.requiredEnv = ['MODEL_API_KEY', 'MODEL_NAME'];
  assert.deepEqual(parseSolutionContract(configured, acceptance), configured);
});

test('numeric, classification, schedule and retrieval answer keys have appropriate nonvacuous shapes', () => {
  invalidPlan(value => { value.evaluations[0].cases[0].expected = { result: 'three' }; }, /numeric value/);
  const withEvaluator = (kind, expected) => {
    const value = plan(); value.evaluations[0].evaluator = kind; delete value.evaluations[0].tolerance;
    value.evaluations[0].cases.forEach(item => { item.expected = expected; });
    return value;
  };
  for (const expected of [null, [], { label: 'yes' }, ['yes', null]]) assert.throws(() => parseEvaluationPlan(withEvaluator('classification', expected), parsedSolution()), /scalar label|contain 1/);
  assert.doesNotThrow(() => parseEvaluationPlan(withEvaluator('classification', ['yes', false, 1]), parsedSolution()));
  for (const expected of [{ status: 'budget_exhausted' }, { status: 'feasible', score: 1 }]) assert.throws(() => parseEvaluationPlan(withEvaluator('schedule', expected), parsedSolution()), /status must|unknown field/);
  assert.doesNotThrow(() => parseEvaluationPlan(withEvaluator('schedule', { status: 'infeasible' }), parsedSolution()));
  assert.throws(() => parseEvaluationPlan(withEvaluator('retrieval', { ids: ['a', 'a'] }), parsedSolution()), /duplicate/);
  assert.throws(() => parseEvaluationPlan(withEvaluator('retrieval', { ids: ['a'], allowUnsupported: true }), parsedSolution()), /unknown field/);
  assert.doesNotThrow(() => parseEvaluationPlan(withEvaluator('retrieval', { ids: [] }), parsedSolution()));
});
