import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { parseSolutionContract, parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';

const echoSource = `
(async () => {
  let text = ''; for await (const chunk of process.stdin) text += chunk;
  console.log(JSON.stringify({ source: 'declared file', input: JSON.parse(text), args: process.argv.slice(2) }));
})().catch(error => { console.error(error); process.exitCode = 1; });
`;
const serviceSource = marker => `
require('node:http').createServer(async (request, response) => {
  if (request.url === '/health') { response.end('ready'); return; }
  let text = ''; for await (const chunk of request) text += chunk;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ source: ${JSON.stringify(marker)}, input: JSON.parse(text), args: process.argv.slice(2) }));
}).listen(Number(process.env.PORT), process.env.HOST);
`;
const argumentCode = 'console.log(JSON.stringify({ source: "command argument", input: null, args: [] }));';
const literalArgs = ['literal argument', '--version', '-e', '--', '', 'quotes " and $(literal)', '日本語 🚢'];

async function fixture(t, entrypoint, { profile = 'cli', args = [], source = echoSource } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-entrypoint-test-'));
  let runtime;
  t.after(async () => {
    try { await runtime?.close(); }
    finally { await fs.rm(root, { recursive: true, force: true }); }
  });
  await fs.mkdir(path.dirname(path.join(root, entrypoint)), { recursive: true });
  await fs.writeFile(path.join(root, entrypoint), source);
  const command = { runtime: 'node', entrypoint, args };
  const manifest = { profile, files: [entrypoint], requiredEnv: [],
    ...(profile === 'browser' ? { entrypoint: 'index.html', evaluator: command } : { command }),
    ...(profile === 'service' ? { healthPath: '/health', invokePath: '/invoke' } : {}) };
  if (profile === 'browser') {
    manifest.files.push('index.html');
    await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><title>Literal entrypoint fixture</title>');
  }
  runtime = await prepareSolutionRuntime(root, manifest, process.execPath, undefined,
    { startupTimeoutMs: 3000, invocationTimeoutMs: 3000, totalTimeoutMs: 10000 });
  return { runtime, manifest };
}

for (const entrypoint of ['-e', '--eval']) {
  test(`CLI executes the literal ${entrypoint} file and preserves code-like arguments`, { timeout: 10000 }, async t => {
    const args = [argumentCode, ...literalArgs];
    const { runtime } = await fixture(t, entrypoint, { args });
    const input = { value: 7 };
    assert.deepEqual(await runtime.invoke(input), { source: 'declared file', input, args });
  });
}

test('CLI executes a literal dash file instead of treating JSON input as JavaScript stdin', { timeout: 10000 }, async t => {
  const { runtime } = await fixture(t, '-', { args: literalArgs });
  // null is both valid JSON and valid JavaScript. Node's stdin mode would exit
  // successfully without running the declared file or producing JSON output.
  assert.deepEqual(await runtime.invoke(null), { source: 'declared file', input: null, args: literalArgs });
});

test('CLI treats an unknown leading-dash filename as its entrypoint', { timeout: 10000 }, async t => {
  const { runtime } = await fixture(t, '-engine.cjs', { args: literalArgs });
  assert.deepEqual(await runtime.invoke(3), { source: 'declared file', input: 3, args: literalArgs });
});

test('browser evaluator executes its literal option-named file', { timeout: 10000 }, async t => {
  const args = [argumentCode, ...literalArgs];
  const { runtime } = await fixture(t, '-e', { profile: 'browser', args });
  assert.match(await (await fetch(runtime.url)).text(), /Literal entrypoint fixture/);
  const input = { browser: true };
  assert.deepEqual(await runtime.invoke(input), { source: 'declared file', input, args });
});

test('service launches its literal option-named file even when an argument can start a healthy impostor', { timeout: 10000 }, async t => {
  const args = [serviceSource('command argument').replace(/\n/g, ' '), ...literalArgs];
  const { runtime } = await fixture(t, '--eval', { profile: 'service', args, source: serviceSource('declared file') });
  const input = { service: true };
  assert.deepEqual(await runtime.invoke(input), { source: 'declared file', input, args });
  assert.deepEqual(await runtime.invokeHttp(input), { status: 200, output: { source: 'declared file', input, args } });
});

test('literal Node entrypoints retain ordinary, nested, space and Unicode filename support', { timeout: 15000 }, async t => {
  // Space/Unicode names retain the direct runtime API's existing behavior;
  // the authoring contract separately restricts paths to portable ASCII.
  for (const entrypoint of ['engine.cjs', 'nested/-engine.cjs', '-dir/engine.cjs', '--', 'space dir/engine name.cjs', '日本語/航海.cjs']) {
    await t.test(entrypoint, async t => {
      const { runtime } = await fixture(t, entrypoint, { args: literalArgs });
      const input = ['Café', '🚢'];
      assert.deepEqual(await runtime.invoke(input), { source: 'declared file', input, args: literalArgs });
    });
  }
});

test('command argument code cannot supply passing evidence for a failing declared file', { timeout: 10000 }, async t => {
  const { runtime, manifest } = await fixture(t, '-e', {
    source: 'console.log(0);',
    args: ['console.log(42);']
  });
  const solution = { schemaVersion: 1, objective: 'Execute the declared engine', runtime: manifest,
    capabilities: [{ id: 'core', kind: 'algorithm', description: 'Declared engine behavior', criterionIds: ['R1'],
      required: true, evaluationIds: ['declared-engine'] }] };
  const plan = { schemaVersion: 1, evaluations: [{ id: 'declared-engine', capabilityId: 'core', description: 'Frozen expected result',
    dataset: { name: 'literal-entrypoint', version: '1', provenance: 'reviewed' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [{ id: 'answer', input: null, expected: 42 }, { id: 'second-answer', input: 1, expected: 42 }] }] };
  const parsed = parseSolutionContract(solution, [{ id: 'R1', requirement: 'Execute the declared engine',
    method: 'automated', scenario: 'Frozen expected result' }]);
  const report = await runSolutionEvaluation(runtime, parsed, parseEvaluationPlan(plan, parsed));
  assert.equal(report.status, 'failed');
  assert.equal(report.capabilities[0].status, 'failed');
  assert.equal(report.evaluations[0].actual, 0);
  assert.equal(report.evaluations[0].cases[0].output, 0,
    'Evidence must come from the allowlisted file, even when command arguments could print the frozen answer.');
});
