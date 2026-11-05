import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSolutionContract, parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { parseExperimentEvaluationPlan } from '../dist-electron/harness/experiment-contract.js';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { ClassifiedExecutionFailure } from '../dist-electron/electron/execution-failure.js';
import { loadQualityContract, assertQualityContract, sealEvaluationPlan, restoreEvaluationPlan } from '../dist-electron/electron/quality.js';

const acceptance = [{ id: 'R1', requirement: 'Validate values before calculating a total', method: 'automated', scenario: 'Reject invalid input, then accept corrected input' }];
const errorBody = { error: 'values must contain only finite numbers' };
const manifest = { profile: 'service', files: ['service.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'service.mjs', args: [] }, healthPath: '/health', invokePath: '/invoke' };
const solution = () => ({ schemaVersion: 1, objective: 'Calculate totals and reject malformed input', runtime: structuredClone(manifest),
  capabilities: [{ id: 'totals', kind: 'algorithm', description: 'Validate values and calculate their total', criterionIds: ['R1'], required: true, evaluationIds: ['validation-cases'] }] });
const plan = () => ({ schemaVersion: 1, evaluations: [{ id: 'validation-cases', capabilityId: 'totals', description: 'Independent rejection and recovery cases',
  dataset: { name: 'validation-reference', version: '1', provenance: 'reviewed' }, evaluator: 'exact', threshold: 1, trials: 1,
  cases: [{ id: 'invalid', input: { mode: 'reject', values: ['bad'] }, expectedStatus: 422, expected: structuredClone(errorBody) },
    { id: 'corrected', input: { mode: 'ok', values: [2, 3] }, expected: { total: 5 } }] }] });
function oneCase(input = { mode: 'reject' }, expected = structuredClone(errorBody)) {
  const value = plan();
  value.evaluations[0].cases = [{ id: 'invalid', input, expectedStatus: 422, expected }];
  return value;
}
const runtimeMock = (overrides = {}) => ({ provenance: { profile: 'service', filesHash: 'known', runtime: 'node', environmentNames: [] },
  invoke: async () => ({ total: 5 }), invokeHttp: async () => ({ status: 422, output: structuredClone(errorBody) }),
  redactOutput: value => value, redactMessage: value => value, ...overrides });

test('service rejection cases retain a frozen HTTP status and JSON body alongside ordinary cases', () => {
  const input = plan(), contract = parseSolutionContract(solution(), acceptance);
  const parsed = parseEvaluationPlan(input, contract);
  assert.deepEqual(parsed, input);
  input.evaluations[0].cases[0].expected.error = 'changed';
  input.evaluations[0].cases[0].expectedStatus = 400;
  assert.equal(parsed.evaluations[0].cases[0].expectedStatus, 422);
  assert.deepEqual(parsed.evaluations[0].cases[0].expected, errorBody);
  assert.equal(Object.hasOwn(parsed.evaluations[0].cases[1], 'expectedStatus'), false);
  for (const status of [400, 499]) {
    const candidate = plan(); candidate.evaluations[0].cases[0].expectedStatus = status;
    assert.equal(parseEvaluationPlan(candidate, contract).evaluations[0].cases[0].expectedStatus, status);
  }
});

test('HTTP rejection expectations require an integer 4xx status, exact evaluator and service runtime', () => {
  for (const expectedStatus of [null, undefined, true, '422', 0, 200, 399, 400.5, 500, 599, NaN, Infinity]) {
    const value = plan(); value.evaluations[0].cases[0].expectedStatus = expectedStatus;
    assert.throws(() => parseEvaluationPlan(value, solution()), /expectedStatus|integer|400|499/, String(expectedStatus));
  }
  for (const evaluator of ['numeric', 'classification', 'schedule', 'retrieval']) {
    const value = plan(); value.evaluations[0].evaluator = evaluator;
    assert.throws(() => parseEvaluationPlan(value, solution()), /expectedStatus|exact/);
  }
  for (const profile of ['cli', 'browser']) {
    const contract = solution(); contract.runtime.profile = profile;
    assert.throws(() => parseEvaluationPlan(plan(), contract), /expectedStatus|service/);
  }
  assert.throws(() => parseEvaluationPlan(plan(), { capabilities: solution().capabilities }), /expectedStatus|service/);
  assert.throws(() => parseExperimentEvaluationPlan(plan(), { capabilities: solution().capabilities }), /expectedStatus|service/,
    'Architecture-neutral experiment planning cannot freeze service-only assertions');
  for (const expected of [undefined, Infinity, { error: undefined }]) {
    const value = plan(); value.evaluations[0].cases[0].expected = expected;
    assert.throws(() => parseEvaluationPlan(value, solution()), /JSON|finite/);
  }
});

test('host loading rejects invalid HTTP status before freezing and preserves corrected expectations through sealing and restoration', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-http-rejection-plan-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'workspace'), hostKey = path.join(directory, 'host', 'evaluation-plan.json');
  await fs.mkdir(workspace);
  const contractInput = solution();
  contractInput.invocation = { input: 'Object with values containing finite numbers.', output: 'HTTP 200 with {total:number}, or HTTP 422 with {error:string}.',
    rules: ['Sum all valid numbers; reject malformed values with the error values must contain only finite numbers.'] };
  const acceptancePlan = { schemaVersion: 2,
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Reject malformed values and calculate corrected values.', journeyIds: ['primary', 'recovery'], capabilityIds: ['totals'] }],
    journeys: [
      { id: 'primary', title: 'Calculate a total', kind: 'primary', steps: [{ action: 'click', selector: '#calculate' }, { action: 'expectText', selector: '#total', text: '5' }] },
      { id: 'recovery', title: 'Correct invalid values', kind: 'recovery', steps: [{ action: 'fill', selector: '#values', value: 'invalid' }, { action: 'click', selector: '#calculate' },
        { action: 'expectText', selector: '#error', text: errorBody.error }, { action: 'fill', selector: '#values', value: '2,3' }, { action: 'click', selector: '#calculate' }, { action: 'expectText', selector: '#total', text: '5' }] }
    ] };
  const ux = { schemaVersion: 1, audience: 'An operator', primaryTask: 'Calculate a total', successOutcome: 'Read the correct total',
    screens: [{ name: 'Calculator', purpose: 'Enter values and read a total', primaryAction: 'Calculate' }],
    states: { empty: 'Explain the input', loading: 'Show calculation progress', error: 'Explain invalid input', success: 'Show the total' },
    persistence: 'No persistence required', recovery: 'Correct invalid input and retry', keyboard: 'All controls are keyboard accessible' };
  const value = plan(); value.evaluations[0].cases[0].expectedStatus = 500;
  const invalidBody = JSON.stringify(value, null, 2) + '\n';
  const files = { 'solution-contract.json': JSON.stringify(contractInput), 'acceptance-plan.json': JSON.stringify(acceptancePlan),
    'ux-spec.json': JSON.stringify(ux), 'evaluation-plan.json': invalidBody };
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), body);

  await assert.rejects(loadQualityContract(workspace, acceptance, true), /expectedStatus|400|499/);
  assert.equal(await fs.readFile(path.join(workspace, 'evaluation-plan.json'), 'utf8'), invalidBody, 'Invalid planning output stays available for correction');
  await assert.rejects(fs.access(hostKey), /ENOENT/);

  value.evaluations[0].cases[0].expectedStatus = 422;
  const correctedBody = JSON.stringify(value, null, 2) + '\n';
  await fs.writeFile(path.join(workspace, 'evaluation-plan.json'), correctedBody);
  const contract = await loadQualityContract(workspace, acceptance, true);
  assert.deepEqual(contract.evaluation, value);
  assert.equal(contract.evaluationBody, correctedBody);
  const frozenHash = contract.hash;
  await sealEvaluationPlan(workspace, contract, hostKey);
  assert.equal(contract.sealedEvaluation, true);
  assert.equal(await fs.readFile(hostKey, 'utf8'), correctedBody, 'The host keeps the exact original status and body expectations');
  assert.equal(contract.evaluation.evaluations[0].cases[0].expectedStatus, 422);
  assert.deepEqual(contract.evaluation.evaluations[0].cases[0].expected, errorBody);
  await assert.rejects(fs.access(path.join(workspace, 'evaluation-plan.json')), /ENOENT/);
  await assertQualityContract(workspace, contract);

  await restoreEvaluationPlan(workspace, contract);
  assert.equal(contract.sealedEvaluation, false);
  assert.equal(await fs.readFile(path.join(workspace, 'evaluation-plan.json'), 'utf8'), correctedBody);
  const restored = await loadQualityContract(workspace, acceptance, true);
  assert.equal(restored.hash, frozenHash, 'Sealing and restoration cannot alter the frozen contract hash');
  assert.deepEqual(restored.evaluation, value);
});

test('the evaluator observes HTTP outcomes without sending expected status or answers to the candidate', async () => {
  const calls = [], value = plan(); value.evaluations[0].trials = 2;
  const runtime = runtimeMock({
    async invokeHttp(...args) { calls.push(['http', args]); args[0].values.push('mutated'); return { status: 422, output: structuredClone(errorBody) }; },
    async invoke(...args) { calls.push(['ordinary', args]); return { total: 5 }; }
  });
  const report = await runSolutionEvaluation(runtime, solution(), value);
  assert.equal(report.status, 'passed');
  assert.equal(report.evaluations[0].actual, 1);
  assert.equal(report.evaluations[0].cases.length, 4);
  assert.deepEqual(calls.map(([kind]) => kind), ['http', 'ordinary', 'http', 'ordinary']);
  assert.ok(calls.every(([, args]) => args.length === 1), 'Only the case input crosses the runtime boundary');
  assert.ok(calls.every(([, [input]]) => !Object.hasOwn(input, 'expectedStatus') && !Object.hasOwn(input, 'expected')));
  assert.deepEqual(value.evaluations[0].cases[0].input.values, ['bad'], 'Candidate mutation must not change the frozen fixture');
  assert.deepEqual(report.evaluations[0].cases[0].output, errorBody);
  assert.deepEqual(report.evaluations[0].cases.map(item => item.httpStatus), [422, undefined, 422, undefined]);
  assert.equal(Object.hasOwn(report.evaluations[0].cases[1], 'httpStatus'), false, 'Ordinary invocation does not invent an observed HTTP status');
});

test('a matching error body cannot hide an unexpected success or incorrect HTTP rejection status', async () => {
  for (const status of [200, 201, 400, 401, 500]) {
    const report = await runSolutionEvaluation(runtimeMock({ invokeHttp: async () => ({ status, output: structuredClone(errorBody) }) }), solution(), oneCase());
    assert.equal(report.status, 'failed', String(status));
    assert.equal(report.evaluations[0].cases[0].passed, false, String(status));
    assert.equal(report.evaluations[0].cases[0].score, 0, String(status));
    assert.equal(report.evaluations[0].cases[0].httpStatus, status, 'Failure evidence preserves the observed status');
  }
  for (const output of [{ error: 'wrong reason' }, { error: errorBody.error, extra: true }, { message: errorBody.error }, null]) {
    const report = await runSolutionEvaluation(runtimeMock({ invokeHttp: async () => ({ status: 422, output }) }), solution(), oneCase());
    assert.equal(report.status, 'failed');
    assert.equal(report.evaluations[0].cases[0].passed, false);
    assert.equal(report.evaluations[0].cases[0].httpStatus, 422);
  }
});

test('direct evaluation rejects invalid status expectations and unsupported adapters before HTTP invocation', async () => {
  for (const expectedStatus of [undefined, null, '422', 200, 400.5, 500, Infinity]) {
    let calls = 0;
    const value = oneCase(); value.evaluations[0].cases[0].expectedStatus = expectedStatus;
    const report = await runSolutionEvaluation(runtimeMock({ invokeHttp: async () => { calls++; return { status: expectedStatus, output: structuredClone(errorBody) }; } }), solution(), value);
    assert.equal(report.status, 'failed', String(expectedStatus));
    assert.equal(calls, 0, 'Invalid expectations must not invoke the service');
  }
  for (const profile of ['cli', 'browser']) {
    let calls = 0;
    const contract = solution(); contract.runtime.profile = profile;
    const report = await runSolutionEvaluation(runtimeMock({ invokeHttp: async () => { calls++; return { status: 422, output: structuredClone(errorBody) }; } }), contract, oneCase());
    assert.equal(report.status, 'failed');
    assert.equal(calls, 0);
  }
  for (const evaluator of ['numeric', 'classification', 'schedule', 'retrieval']) {
    let calls = 0;
    const value = oneCase(); value.evaluations[0].evaluator = evaluator;
    const report = await runSolutionEvaluation(runtimeMock({ invokeHttp: async () => { calls++; return { status: 422, output: structuredClone(errorBody) }; } }), solution(), value);
    assert.equal(report.status, 'failed');
    assert.equal(calls, 0);
  }
  const unavailable = runtimeMock(); delete unavailable.invokeHttp;
  let ordinaryCalls = 0; unavailable.invoke = async () => { ordinaryCalls++; return structuredClone(errorBody); };
  const report = await runSolutionEvaluation(unavailable, solution(), oneCase());
  assert.equal(report.status, 'failed');
  assert.equal(ordinaryCalls, 0, 'An adapter without HTTP observation must not guess a status from normal output');
});

test('malformed HTTP outcomes and generic execution failures never count as expected rejection', async () => {
  for (const outcome of [null, {}, { status: '422', output: errorBody }, { status: 422.5, output: errorBody }, { status: 422 }, { status: 422, output: undefined }]) {
    const report = await runSolutionEvaluation(runtimeMock({ invokeHttp: async () => outcome }), solution(), oneCase());
    assert.equal(report.status, 'failed');
    assert.equal(report.evaluations[0].cases[0].passed, false);
  }
  for (const error of [new Error('Runtime request exceeded its deadline'), new Error('Runtime process exited with 1'), new Error('Runtime HTTP request failed with status 422')]) {
    const report = await runSolutionEvaluation(runtimeMock({ invokeHttp: async () => { throw error; } }), solution(), oneCase());
    assert.equal(report.status, 'failed');
    assert.equal(report.evaluations[0].cases[0].score, 0);
  }
  for (const classification of ['infrastructure', 'integrity']) {
    const error = new ClassifiedExecutionFailure(classification, 'Trusted failure boundary');
    await assert.rejects(runSolutionEvaluation(runtimeMock({ invokeHttp: async () => { throw error; } }), solution(), oneCase()), failure => failure === error);
  }
});

test('legacy cases use normal invoke and runtime errors remain fatal', async () => {
  const value = oneCase(); delete value.evaluations[0].cases[0].expectedStatus;
  assert.equal(Object.hasOwn(parseEvaluationPlan(planWithoutStatus(), solution()).evaluations[0].cases[0], 'expectedStatus'), false);
  let httpCalls = 0;
  const runtime = runtimeMock({ invoke: async () => structuredClone(errorBody), invokeHttp: async () => { httpCalls++; throw new Error('Unexpected HTTP observation'); } });
  assert.equal((await runSolutionEvaluation(runtime, solution(), value)).status, 'passed');
  assert.equal(httpCalls, 0);
  runtime.invoke = async () => { throw new Error('Runtime HTTP request failed with status 422'); };
  assert.equal((await runSolutionEvaluation(runtime, solution(), value)).status, 'failed');
  assert.equal(httpCalls, 0);
});

function planWithoutStatus() {
  const value = plan(); delete value.evaluations[0].cases[0].expectedStatus; return value;
}

const serviceSource = `import { createServer } from 'node:http';
import { appendFile } from 'node:fs/promises';
const body = ${JSON.stringify(errorBody)};
createServer(async (request, response) => {
  if (request.url === '/health') { response.writeHead(200).end('ready'); return; }
  let text = ''; for await (const chunk of request) text += chunk;
  const input = JSON.parse(text);
  if (input.mode === 'reset') { request.socket.destroy(); return; }
  if (input.mode === 'hang') return;
  if (input.mode === 'redirect') { response.writeHead(302, { location: '/health' }).end(); return; }
  if (input.mode === 'tamper') await appendFile(new URL(import.meta.url), '\\n// changed during invocation\\n');
  const status = input.mode === 'ok' ? 200 : input.mode === 'wrong-status' ? 400 : 422;
  response.writeHead(status, { 'content-type': 'application/json' });
  if (input.mode === 'malformed') response.end('not-json');
  else if (input.mode === 'nonfinite') response.end('1e400');
  else if (input.mode === 'deep') response.end('['.repeat(70) + '0' + ']'.repeat(70));
  else if (input.mode === 'overflow') response.end(JSON.stringify('x'.repeat(10_000)));
  else if (input.mode === 'secret') response.end(JSON.stringify({ error: process.env.FLEET_HTTP_REJECTION_SECRET }));
  else response.end(JSON.stringify(input.mode === 'ok' ? { total: input.values.reduce((sum, value) => sum + value, 0) } : body));
}).listen(Number(process.env.PORT), process.env.HOST);`;

async function serviceRuntime(t, options = {}, requiredEnv = []) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-http-rejection-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'service.mjs'), serviceSource);
  const runtime = await prepareSolutionRuntime(root, { ...manifest, requiredEnv }, process.execPath, undefined, options);
  t.after(() => runtime.close());
  return runtime;
}

test('a real service proves JSON rejection and recovery while ordinary invocation still rejects 4xx', async t => {
  const runtime = await serviceRuntime(t);
  assert.deepEqual(await runtime.invokeHttp({ mode: 'reject' }), { status: 422, output: errorBody });
  await assert.rejects(runtime.invoke({ mode: 'reject' }), /422/);
  const value = parseEvaluationPlan(plan(), solution()); value.evaluations[0].trials = 2;
  const report = await runSolutionEvaluation(runtime, solution(), value);
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.evaluations[0].cases.map(item => item.passed), [true, true, true, true]);
  assert.deepEqual(report.evaluations[0].cases.map(item => item.httpStatus), [422, undefined, 422, undefined]);
  const wrongStatus = await runSolutionEvaluation(runtime, solution(), oneCase({ mode: 'wrong-status' }));
  assert.equal(wrongStatus.status, 'failed');
  assert.equal(wrongStatus.evaluations[0].cases[0].httpStatus, 400);
  assert.equal((await runSolutionEvaluation(runtime, solution(), planWithoutStatus())).status, 'failed');
});

test('HTTP error bodies enforce JSON, output-size and transport budgets before matching', { timeout: 15_000 }, async t => {
  const runtime = await serviceRuntime(t, { maxOutputBytes: 1024, invocationTimeoutMs: 500, startupTimeoutMs: 5000 });
  for (const [mode, message] of [['malformed', /JSON/], ['nonfinite', /nonfinite/], ['deep', /structural limits/], ['overflow', /output limit/]]) {
    const report = await runSolutionEvaluation(runtime, solution(), oneCase({ mode }));
    assert.equal(report.status, 'failed', mode);
    assert.equal(report.evaluations[0].cases[0].passed, false, mode);
    assert.match(report.evaluations[0].cases[0].detail, message, mode);
  }
  for (const mode of ['reset', 'hang', 'redirect']) {
    const report = await runSolutionEvaluation(runtime, solution(), oneCase({ mode }));
    assert.equal(report.status, 'failed', mode);
    assert.equal(report.evaluations[0].cases[0].score, 0, mode);
  }
  assert.deepEqual(await runtime.invoke({ mode: 'ok', values: [4, 6] }), { total: 10 }, 'A failed request must not fabricate a passing rejection or prevent ordinary recovery');
});

test('a service cannot satisfy a rejection case by changing the delivered package', async t => {
  const runtime = await serviceRuntime(t);
  const report = await runSolutionEvaluation(runtime, solution(), oneCase({ mode: 'tamper' }));
  assert.equal(report.status, 'failed');
  assert.match(report.evaluations[0].cases[0].detail, /runtime files changed/);
});

test('rejection bodies are compared before credentials are redacted from retained evidence', async t => {
  const secret = 'private-http-rejection-secret';
  const previous = process.env.FLEET_HTTP_REJECTION_SECRET;
  process.env.FLEET_HTTP_REJECTION_SECRET = secret;
  t.after(() => { if (previous === undefined) delete process.env.FLEET_HTTP_REJECTION_SECRET; else process.env.FLEET_HTTP_REJECTION_SECRET = previous; });
  const runtime = await serviceRuntime(t, {}, ['FLEET_HTTP_REJECTION_SECRET']);
  const report = await runSolutionEvaluation(runtime, solution(), oneCase({ mode: 'secret' }, { error: secret }));
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.evaluations[0].cases[0].output, { error: '[redacted]' });
  assert.equal(JSON.stringify(report).includes(secret), false);
});
