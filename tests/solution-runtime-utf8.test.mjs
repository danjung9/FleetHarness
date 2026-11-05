import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';

const malformed = [
  ['Latin-1 byte', [0xe9]],
  ['stray continuation', [0x80]],
  ['overlong encoding', [0xc0, 0xaf]],
  ['encoded surrogate', [0xed, 0xa0, 0x80]],
  ['code point above Unicode', [0xf4, 0x90, 0x80, 0x80]],
  ['truncated sequence', [0xe2, 0x82]]
];
const malformedJson = bytes => Buffer.concat([Buffer.from('"'), Buffer.from(bytes), Buffer.from('"')]);
const inputFor = (bytes, options = {}) => ({ hex: bytes.toString('hex'), ...options });
const validJson = value => Buffer.from(JSON.stringify(value));

const sendBytes = `
async function send(input, write) {
  const bytes = Buffer.from(input.hex, 'hex');
  if (input.split) {
    for (const byte of bytes) {
      write(Buffer.from([byte]));
      await new Promise(resolve => setTimeout(resolve, 2));
    }
  } else write(bytes);
}
`;

async function fixture(t, profile) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-utf8-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = profile === 'service' ? `
import { createServer } from 'node:http';
${sendBytes}
createServer(async (request, response) => {
  if (request.url === '/health') { response.end('ok'); return; }
  let body = ''; for await (const chunk of request) body += chunk;
  const input = JSON.parse(body);
  response.writeHead(input.status ?? 200, { 'Content-Type': 'application/json' });
  await send(input, bytes => response.write(bytes));
  response.end();
}).listen(Number(process.env.PORT), '127.0.0.1');
` : `
${sendBytes}
let body = ''; for await (const chunk of process.stdin) body += chunk;
const input = JSON.parse(body);
if (input.stderrHex) process.stderr.write(Buffer.from(input.stderrHex, 'hex'));
await send(input, bytes => process.stdout.write(bytes));
if (input.exitCode) process.exitCode = input.exitCode;
`;
  await fs.writeFile(path.join(root, 'engine.mjs'), source);
  const command = { runtime: 'node', entrypoint: 'engine.mjs', args: [] };
  const manifest = { profile, files: ['engine.mjs'], requiredEnv: [],
    ...(profile === 'browser' ? { entrypoint: 'index.html', evaluator: command } : { command }),
    ...(profile === 'service' ? { healthPath: '/health', invokePath: '/invoke' } : {}) };
  if (profile === 'browser') {
    manifest.files.push('index.html');
    await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><title>UTF-8 runtime fixture</title>');
  }
  const runtime = await prepareSolutionRuntime(root, manifest, process.execPath);
  t.after(() => runtime.close());
  const solution = { schemaVersion: 1, objective: 'Preserve JSON text exactly', runtime: manifest,
    capabilities: [{ id: 'text', kind: 'algorithm', description: 'Return valid Unicode JSON', criterionIds: ['R1'], required: true, evaluationIds: ['text-cases'] }] };
  return { runtime, solution };
}

function plan(cases, options = {}) {
  return { schemaVersion: 1, evaluations: [{ id: 'text-cases', capabilityId: 'text', description: 'Independent Unicode output cases',
    dataset: { name: 'unicode-reference', version: '1', provenance: 'reviewed' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases, ...options }] };
}

const boundaries = [
  { name: 'CLI stdout', profile: 'cli' },
  { name: 'browser evaluator stdout', profile: 'browser' },
  { name: 'service success body', profile: 'service' },
  { name: 'service rejection body', profile: 'service', status: 422 }
];

for (const boundary of boundaries) {
  const options = boundary.status ? { status: boundary.status } : {};
  const invoke = (runtime, input) => boundary.status ? runtime.invokeHttp(input).then(response => {
    assert.equal(response.status, boundary.status);
    return response.output;
  }) : runtime.invoke(input);

  test(`${boundary.name} rejects malformed UTF-8 before JSON decoding`, async t => {
    const { runtime } = await fixture(t, boundary.profile);
    for (const [name, bytes] of malformed) await t.test(name, async () => {
      await assert.rejects(invoke(runtime, inputFor(malformedJson(bytes), options)), /UTF-8/i);
    });
    assert.equal(await invoke(runtime, inputFor(validJson('\ufffd'), options)), '\ufffd',
      'A literal replacement character stays valid after a rejected invocation.');
  });

  test(`${boundary.name} preserves Unicode and CRLF when UTF-8 bytes cross write boundaries`, async t => {
    const { runtime } = await fixture(t, boundary.profile);
    const expected = { value: '\ufeffCafé 日本語 🛠️ \ufffd e\u0301\r\n' };
    const bytes = Buffer.from('\r\n' + JSON.stringify(expected) + '\r\n');
    assert.deepEqual(await invoke(runtime, inputFor(bytes, { ...options, split: true })), expected);
  });

  test(`${boundary.name} cannot pass exact evidence by replacing an invalid byte with U+FFFD`, async t => {
    const { runtime, solution } = await fixture(t, boundary.profile);
    const invalidBytes = malformedJson([0xff]);
    assert.equal(invalidBytes.toString('utf8'), JSON.stringify('\ufffd'), 'The old lossy decoder aliases the frozen answer.');
    const cases = [
      { id: 'literal', input: inputFor(validJson('\ufffd'), options), expected: '\ufffd' },
      { id: 'invalid', input: inputFor(invalidBytes, options), expected: '\ufffd' }
    ].map(entry => ({ ...entry, ...(boundary.status ? { expectedStatus: boundary.status } : {}) }));
    const report = await runSolutionEvaluation(runtime, solution, plan(cases));
    assert.equal(report.status, 'failed');
    const result = report.evaluations[0];
    assert.equal(result.status, 'failed');
    assert.equal(result.actual, 0.5);
    assert.deepEqual(result.cases.map(entry => entry.passed), [true, false]);
    assert.equal(result.cases[0].output, '\ufffd');
    assert.equal(Object.hasOwn(result.cases[1], 'output'), false, 'Evidence must not retain synthesized replacement text.');
    assert.match(result.cases[1].detail, /UTF-8/i);
  });
}

for (const profile of ['cli', 'browser', 'service']) {
  test(`${profile} malformed UTF-8 remains fatal at a passing fractional classification threshold`, async t => {
    const { runtime, solution } = await fixture(t, profile);
    const report = await runSolutionEvaluation(runtime, solution, plan([
      { id: 'valid', input: inputFor(validJson('known')), expected: 'known' },
      { id: 'invalid', input: inputFor(malformedJson([0x80])), expected: '\ufffd' }
    ], { evaluator: 'classification', threshold: 0.5 }));
    assert.equal(report.evaluations[0].actual, 0.5);
    assert.equal(report.evaluations[0].status, 'failed');
    assert.equal(report.capabilities[0].status, 'failed');
    assert.equal(report.status, 'failed');
    assert.match(report.evaluations[0].cases[1].detail, /UTF-8/i);
  });
}

test('CLI diagnostic stderr cannot invalidate valid JSON or replace a process exit failure', async t => {
  const { runtime } = await fixture(t, 'cli');
  const stderrHex = Buffer.concat([Buffer.from('diagnostic-before'), Buffer.from([0xff]), Buffer.from('diagnostic-after')]).toString('hex');
  for (const expected of [false, null, 0]) {
    assert.equal(await runtime.invoke(inputFor(validJson(expected), { stderrHex })), expected);
  }
  await assert.rejects(runtime.invoke(inputFor(validJson(true), { stderrHex, exitCode: 23 })), error => {
    assert.match(error.message, /Runtime process exited with 23/);
    assert.match(error.message, /diagnostic-before.*diagnostic-after/);
    assert.doesNotMatch(error.message, /UTF-8/i);
    return true;
  });
});
