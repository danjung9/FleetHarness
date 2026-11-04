import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID, randomBytes, createHmac } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai';
import { stream as piStream } from '@earendil-works/pi-ai/api/openai-responses';
import { normalizeContext } from '@earendil-works/pi-ai/utils/transcript';

const directory = await mkdtemp(resolve('.hosted-model-test-'));
await build({ entryPoints: ['server/model-proxy.ts', 'server/credentials.ts'], outdir: directory, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
const { modelToken, verifyModelToken, proxyModel } = await import(pathToFileURL(`${directory}/model-proxy.mjs`).href);
const { encryptKey } = await import(pathToFileURL(`${directory}/credentials.mjs`).href);
const secret = randomBytes(32).toString('base64'), previousSecret = process.env.CREDENTIAL_ENCRYPTION_KEY;
process.env.CREDENTIAL_ENCRYPTION_KEY = secret;
after(async () => {
  if (previousSecret === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY; else process.env.CREDENTIAL_ENCRYPTION_KEY = previousSecret;
  await rm(directory, { recursive: true, force: true });
});
const run = { id: randomUUID(), userId: randomUUID(), epoch: 2, model: 'gpt-5.2', status: 'running' };
const realKey = 'sk-fixture-account-key-not-for-a-sandbox';
const encrypted = encryptKey(run.userId, realKey, secret);
const token = modelToken(run.id, run.epoch);
const request = (body = {}, auth = token, options = {}) => new Request(`https://app.example/api/internal/model/${run.id}/responses`, {
  method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json', 'OpenAI-Project': 'must-not-forward' },
  body: JSON.stringify({ model: run.model, input: 'Build the demo', stream: true, ...body }), ...options,
});
function database(overrides = {}) {
  return { getRun: async () => ({ ...run }), getCredential: async id => { assert.equal(id, run.userId); return encrypted; }, claimModelRequest: async (...args) => { assert.deepEqual(args, [run.id, run.epoch, 120]); return true; }, ...overrides };
}
const frame = event => `data: ${JSON.stringify(event)}\n\n`;
const terminal = { type: 'response.completed', response: { id: 'resp_fixture', status: 'completed', output: [], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } };
const eventResponse = (events = [terminal]) => new Response(events.map(frame).join(''), { headers: { 'Content-Type': 'text/event-stream', 'X-Upstream-Secret': realKey } });

test('run capabilities are authenticated, expire, and reject malformed signatures safely', () => {
  assert.deepEqual(verifyModelToken(token, run.id).epoch, run.epoch);
  assert.ok(!token.includes(realKey));
  for (const candidate of [token + '.extra', token.slice(0, -1) + '!', token.split('.')[0] + '.' + 'é'.repeat(43), 'Bearer ' + token]) assert.throws(() => verifyModelToken(candidate, run.id), error => error.status === 401);
  assert.throws(() => verifyModelToken(token, randomUUID()), error => error.status === 401);
  assert.throws(() => verifyModelToken(modelToken(run.id, 1, 1000, secret), run.id, 1000, secret), /expired/);
  assert.throws(() => verifyModelToken(token, run.id, Date.now(), randomBytes(32).toString('base64')), error => error.status === 401);
  const payload = Buffer.from('null').toString('base64url');
  const signature = createHmac('sha256', Buffer.from(secret, 'base64')).update('fleet-model-v1:' + payload).digest('base64url');
  assert.throws(() => verifyModelToken(`${payload}.${signature}`, run.id), error => error.status === 401);
  assert.throws(() => modelToken(run.id, 1, Date.now() + 1000, 'weak-key'), error => error.status === 503);
});

test('stale epochs, inactive runs, wrong models and exhausted budgets never contact OpenAI', async () => {
  const forbidden = async () => { assert.fail('No provider request should be made'); };
  await assert.rejects(proxyModel(request({}, modelToken(run.id, 1)), run.id, database(), forbidden), error => error.status === 409);
  for (const status of ['queued', 'paused', 'failed', 'review', 'approved', 'delivered']) await assert.rejects(proxyModel(request(), run.id, database({ getRun: async () => ({ ...run, status }) }), forbidden), error => error.status === 409);
  await assert.rejects(proxyModel(request({ model: 'another-model' }), run.id, database(), forbidden), error => error.status === 403);
  await assert.rejects(proxyModel(request(), run.id, database({ claimModelRequest: async () => false }), forbidden), error => error.status === 429);
  await assert.rejects(proxyModel(request(), run.id, database({ getCredential: async () => null }), forbidden), error => error.status === 409);
});

test('build credentials reject account resources, remote inputs and hosted tools', async () => {
  const forbidden = async () => { assert.fail('No provider request should be made'); };
  for (const body of [
    { background: true }, { previous_response_id: 'resp_other' }, { conversation: 'conv_other' }, { stream: false },
    { tools: [{ type: 'web_search' }] }, { tools: { type: 'function' } },
    { input: [{ type: 'item_reference', id: 'file_other' }] },
    { input: [{ role: 'user', content: [{ type: 'input_file', file_id: 'file_other' }] }] },
    { input: [{ role: 'user', content: [{ type: 'input_image', image_url: 'https://elsewhere.example/image' }] }] },
  ]) await assert.rejects(proxyModel(request(body), run.id, database(), forbidden), error => error.status === 400);
});

test('only the fixed OpenAI endpoint receives the real key and requests are bounded', async () => {
  let calls = 0;
  const response = await proxyModel(request({ max_output_tokens: 999999, store: true, user: 'caller', metadata: { secret: token }, service_tier: 'priority', prompt: { id: 'saved-resource' } }), run.id, database(), async (url, init) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(init.redirect, 'error');
    assert.deepEqual(init.headers, { 'Content-Type': 'application/json', Authorization: `Bearer ${realKey}` });
    const body = JSON.parse(init.body);
    assert.equal(body.model, run.model); assert.equal(body.max_output_tokens, 16384); assert.equal(body.store, false);
    for (const field of ['user', 'metadata', 'service_tier', 'prompt']) assert.equal(body[field], undefined);
    return eventResponse();
  });
  assert.equal(calls, 1); assert.equal(response.headers.get('X-Upstream-Secret'), null);
  assert.ok(!(await response.text()).includes(realKey));
});

test('HTTP failures, unexpected bodies and streamed failures never expose raw diagnostics', async () => {
  for (const status of [401, 403, 429, 500, 302]) {
    const response = await proxyModel(request(), run.id, database(), async () => new Response(`private provider diagnostic ${realKey}`, { status, headers: { Location: 'https://elsewhere.example' } }));
    assert.equal(response.status, status === 302 ? 502 : status);
    const text = await response.text(); assert.ok(!text.includes(realKey)); assert.ok(!text.includes('private provider diagnostic'));
  }
  for (const event of [{ type: 'error', message: realKey }, { type: 'response.failed', response: { status: 'failed', error: { message: realKey } } }]) {
    const response = await proxyModel(request(), run.id, database(), async () => eventResponse([event]));
    const text = await response.text(); assert.ok(!text.includes(realKey)); assert.match(text, /provider_error/);
  }
  const response = await proxyModel(request(), run.id, database(), async () => Response.json({ error: { message: realKey } }));
  assert.equal(response.status, 502); assert.ok(!(await response.text()).includes(realKey));
  await assert.rejects(proxyModel(request(), run.id, database(), async () => { throw Error(realKey); }), error => !error.message.includes(realKey) && error.status === 502);
});

test('streaming is incremental, UTF-8 safe and cancellation reaches upstream', async () => {
  const encoder = new TextEncoder(); let upstream, cancelled = false, signal;
  const source = new ReadableStream({ start(controller) { upstream = controller; }, cancel() { cancelled = true; } });
  const abort = new AbortController();
  const response = await proxyModel(request({}, token, { signal: abort.signal }), run.id, database(), async (_url, init) => { signal = init.signal; return new Response(source, { headers: { 'Content-Type': 'text/event-stream' } }); });
  const reader = response.body.getReader();
  const bytes = encoder.encode(frame({ type: 'response.output_text.delta', delta: 'hello 🛠️' }));
  for (let i = 0; i < bytes.length; i++) upstream.enqueue(bytes.subarray(i, i + 1));
  assert.match(new TextDecoder().decode((await reader.read()).value), /hello 🛠️/);
  abort.abort(); assert.equal(signal.aborted, true);
  await reader.cancel(); assert.equal(cancelled, true);
});

test('truncated and broken streams end with safe SDK errors', async () => {
  for (const body of ['data: {broken-json}\n\n', frame({ type: 'response.created', response: { id: 'partial' } })]) {
    const response = await proxyModel(request(), run.id, database(), async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }));
    assert.match(await response.text(), /provider_error/);
  }
  const broken = new ReadableStream({ pull(controller) { controller.error(Error(realKey)); } });
  const response = await proxyModel(request(), run.id, database(), async () => new Response(broken, { headers: { 'Content-Type': 'text/event-stream' } }));
  const output = await response.text(); assert.match(output, /provider_error/); assert.ok(!output.includes(realKey));
});

test('real Pi Responses SDK works through the scoped proxy with tools and reasoning', async () => {
  const item = { id: 'msg_fixture', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Hello from the fixture', annotations: [] }] };
  const events = [
    { type: 'response.created', response: { id: 'resp_fixture', status: 'in_progress' } },
    { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', content: [] } },
    { type: 'response.output_text.delta', output_index: 0, content_index: 0, delta: 'Hello from the fixture' },
    { type: 'response.output_item.done', output_index: 0, item },
    { ...terminal, response: { ...terminal.response, output: [item] } },
  ];
  const model = { ...openaiProvider().getModels().find(model => model.id === run.model), baseUrl: `https://app.example/api/internal/model/${run.id}` };
  let requests = 0;
  const stream = piStream(model, normalizeContext({ systemPrompt: 'Build a demo', messages: [{ role: 'user', content: 'Say hello', timestamp: Date.now() }], tools: [{ name: 'write', description: 'Write a local file', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }] }), {
    apiKey: token, reasoningEffort: 'low', maxRetries: 0, sessionId: 'fixture-session',
    fetch: async (input, init) => proxyModel(new Request(input, init), run.id, database(), async (url, upstream) => {
      requests++; assert.equal(url, 'https://api.openai.com/v1/responses'); const body = JSON.parse(upstream.body);
      assert.equal(body.tools[0].type, 'function'); assert.equal(body.tools[0].name, 'write');
      assert.deepEqual(body.include, ['reasoning.encrypted_content']); return eventResponse(events);
    }),
  });
  const received = []; for await (const event of stream) received.push(event);
  assert.equal(requests, 1); assert.equal(received.at(-1).type, 'done', JSON.stringify(received.at(-1)));
  assert.equal(received.at(-1).message.content[0].text, 'Hello from the fixture');
});
