import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { InMemoryCredentialStore } from '@earendil-works/pi-ai';
import { GenAiMil, GENAI_MIL_PROVIDER, GENAI_MIL_ADDRESS, genAiMilAddress, genAiMilModels, genAiMilError, genAiMilUnlockUrl } from '../dist-electron/electron/genai-mil.js';
import { Store } from '../dist-electron/electron/storage.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { plainError } from '../dist-electron/electron/plain-errors.js';
import { redactedSessionManager } from '../dist-electron/electron/session-logs.js';
import { redactValue } from '../dist-electron/electron/secrets.js';
import { ConnectorService } from '../dist-electron/electron/connectors/index.js';
import { ConnectorStore } from '../dist-electron/electron/connectors/store.js';
import { mainHarness } from './helpers/main-harness.mjs';

// Synthetic only. Any un-injected network path fails before issuing a request.
globalThis.fetch = async () => { throw new Error('Un-injected network access is forbidden in this test.'); };
const fakeKey = 'SYNTHETIC-GENAI-ONLY-9d4a2f-NEVER-A-CREDENTIAL';
const modelId = 'synthetic-chat-withtools';
const list = () => Response.json({ data: [{ id: modelId }, { id: 'plain-chat' }, { id: 'embed-withtools' }] });
function encryption() {
  const wrappingKey = randomBytes(32);
  return {
    isEncryptionAvailable: () => true,
    encryptString(text) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', wrappingKey, iv);
      const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), body]);
    },
    decryptString(buffer) {
      const decipher = createDecipheriv('aes-256-gcm', wrappingKey, buffer.subarray(0, 12));
      decipher.setAuthTag(buffer.subarray(12, 28));
      return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString();
    }
  };
}
async function fixture(t, respond = list) {
  const root = await fs.mkdtemp(path.resolve('.genai-mil-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null,
    modelsStorePath: path.join(root, 'catalog'), refreshOnCreate: false, allowModelNetwork: false });
  const requests = [], logs = [], secure = encryption();
  let now = Date.UTC(2026, 10, 4);
  const options = { now: () => now, log: line => logs.push(line), fetch: async (url, init) => {
    requests.push({ url, init }); return respond(url, init);
  } };
  const provider = new GenAiMil(root, secure, runtime, options);
  return { root, runtime, provider, requests, logs, secure, options, advance: ms => { now += ms; } };
}
const absent = value => assert.equal(JSON.stringify(value).includes(fakeKey), false, 'Synthetic credential escaped its transport or encrypted store.');
async function complete(h, options = {}) {
  const stream = h.runtime.streamSimple(h.runtime.getModel(GENAI_MIL_PROVIDER, modelId), {
    systemPrompt: 'Synthetic system instruction.', messages: [{ role: 'user', content: 'Synthetic request.', timestamp: 0 }],
    tools: [{ name: 'synthetic_tool', description: 'Synthetic tool.', parameters: { type: 'object', properties: { text: { type: 'string' } } } }]
  }, options);
  const events = [];
  for await (const event of stream) events.push(structuredClone(event));
  return { events, result: await stream.result() };
}

test('saves and clears encrypted configuration without connecting; load requires a fresh model list', async t => {
  const h = await fixture(t);
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey);
  assert.equal(h.requests.length, 0);
  assert.equal(h.provider.view().hasKey, true);
  assert.equal(h.provider.view().connected, false);
  const encrypted = await fs.readFile(path.join(h.root, 'genai-mil.enc'));
  assert.equal(encrypted.includes(Buffer.from(fakeKey)), false);
  assert.equal((await fs.stat(path.join(h.root, 'genai-mil.enc'))).mode & 0o777, 0o600);
  assert.equal(JSON.parse(h.secure.decryptString(encrypted)).key, fakeKey);
  await h.provider.connect();
  assert.equal(h.provider.view().connected, true);
  const restored = new GenAiMil(h.root, h.secure, h.runtime, h.options);
  await restored.load();
  assert.equal(restored.view().connected, false);
  assert.deepEqual(restored.view().models, []);
  assert.equal(h.requests.length, 1);
  await restored.save(GENAI_MIL_ADDRESS); // Retains the encrypted key without returning it.
  await restored.clear();
  assert.equal(restored.view().hasKey, false);
  assert.equal(h.runtime.getModel(GENAI_MIL_PROVIDER, modelId), undefined);
  await assert.rejects(fs.stat(path.join(h.root, 'genai-mil.enc')), { code: 'ENOENT' });
  absent([restored.view(), h.provider.view(), h.logs]);
});

test('addresses are HTTPS only and address changes require re-entering the key', async t => {
  const h = await fixture(t);
  for (const address of ['http://api.genai.mil/v1', 'file:///x', 'https://user:pass@example.test/v1', 'https://example.test/v1?key=x', 'https://example.test/v1#key', '', null]) {
    assert.throws(() => genAiMilAddress(address), /HTTPS service address/);
    await assert.rejects(h.provider.save(address, fakeKey), /HTTPS service address/);
  }
  assert.equal(genAiMilAddress('https://environment.example.test/v1///'), 'https://environment.example.test/v1');
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey);
  await assert.rejects(h.provider.save('https://environment.example.test/v1'), /Enter your key again/);
  await h.provider.save('https://environment.example.test/v1', fakeKey);
  await h.provider.connect();
  assert.equal(h.requests[0].url, 'https://environment.example.test/v1/models');
  assert.equal(h.requests[0].init.redirect, 'error');
  assert.equal(new Headers(h.requests[0].init.headers).get('authorization'), 'Bearer ' + fakeKey);
});

test('requires encryption and does not persist or expose a raw encryption error', async t => {
  const h = await fixture(t);
  h.secure.isEncryptionAvailable = () => false;
  await assert.rejects(h.provider.save(GENAI_MIL_ADDRESS, fakeKey), /Secure credential storage is unavailable/);
  h.secure.isEncryptionAvailable = () => true;
  h.secure.encryptString = () => { throw new Error(fakeKey); };
  await assert.rejects(h.provider.save(GENAI_MIL_ADDRESS, fakeKey), error => { absent(error.message); return true; });
  absent(await fs.readdir(h.root));
  assert.equal(h.provider.view().hasKey, false);
});

test('only discovered chat models ending in -withtools can be selected or built with Pi', async t => {
  assert.deepEqual(genAiMilModels({ data: [{ id: modelId }, { id: modelId }, { id: 'plain' }, { id: 'embedding-withtools' },
    { id: 'looks-chat-withtools', type: 'embedding' }, { id: 'suffix-withtools-extra' }, { id: null }, { id: fakeKey + '-withtools' }] }), [modelId]);
  const h = await fixture(t);
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey);
  assert.throws(() => h.provider.assertModel('pi', modelId), /Connect GenAI.mil/);
  await h.provider.connect();
  assert.deepEqual(h.provider.view().models, [modelId]);
  assert.equal(h.runtime.hasConfiguredAuth(GENAI_MIL_PROVIDER), true);
  assert.equal(h.runtime.getModel(GENAI_MIL_PROVIDER, modelId).api, 'openai-completions');
  for (const [engine, id] of [['codex', modelId], ['pi', 'plain'], ['pi', 'undiscovered-withtools']])
    assert.throws(() => h.provider.assertModel(engine, id), /-withtools model on Pi/);
  h.provider.assertModel('pi', modelId);
  const store = new Store(h.root); await store.init();
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'), { genAiMil: () => h.provider });
  backend.runtime = h.runtime;
  for (const [engine, id] of [['codex', modelId], ['pi', 'plain'], ['pi', 'undiscovered-withtools']]) {
    store.state.settings = { backend: engine, provider: GENAI_MIL_PROVIDER, model: id, rememberKey: true };
    await assert.rejects(backend.start(store.state.projects[0].id), /-withtools model on Pi/);
    assert.equal(backend.active.size, 0);
  }
});

test('a malformed or failed model response never reports Connected; an empty list cannot build', async t => {
  let response = () => Response.json({ error: { message: fakeKey } });
  const h = await fixture(t, () => response());
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey); await h.provider.connect();
  assert.equal(h.provider.view().connected, false);
  response = () => new Response('invalid JSON');
  await h.provider.connect(); assert.equal(h.provider.view().connected, false);
  response = () => Response.json({ data: [] });
  await h.provider.connect(); assert.equal(h.provider.view().connected, true);
  assert.throws(() => h.provider.assertModel('pi', modelId));
  absent(h.provider.view());
});

const errors = [
  [401, { unlock_url: 'https://genai.mil/unlock/synthetic' }, {}, 'Your GenAI.mil key is locked.', 'Open the unlock link and unlock your key, then connect again.'],
  [401, {}, {}, 'Your GenAI.mil key is invalid or expired.', 'Get a new key from the GenAI.mil site and connect again.'],
  [403, {}, {}, 'Your GenAI.mil key lacks permission.', 'Ask your GenAI.mil administrator for access.'],
  [410, { details: { replacement_model: 'replacement-withtools' } }, {}, 'This GenAI.mil model has been retired.', 'Refresh the model list and select replacement-withtools.'],
  [429, {}, { 'retry-after': '5' }, 'GenAI.mil is temporarily limiting requests.', 'Wait 5 seconds before trying again.'],
  [429, { code: 'daily_quota_exceeded' }, { 'retry-after': '86400' }, 'Your GenAI.mil daily allowance is used up.', 'Wait for your daily allowance to reset before trying again.'],
  [502, {}, {}, 'GenAI.mil is having a service problem.', 'Try again in a few minutes.']
];
for (const [status, error, headers, message, nextStep] of errors) test(`maps ${status}: ${message}`, async t => {
  const h = await fixture(t, () => Response.json({ error: { ...error, message: fakeKey } }, { status, headers: { ...headers, 'x-request-id': 'synthetic-support-42' } }));
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey); await h.provider.connect();
  assert.equal(h.provider.view().connected, false);
  assert.equal(h.provider.view().issue.message, message);
  assert.equal(h.provider.view().issue.nextStep, nextStep);
  assert.match(h.logs[0], /x-request-id=synthetic-support-42/);
  const mapped = plainError(h.provider.buildError(new Error(fakeKey)));
  assert.equal(mapped.message, message + ' ' + nextStep);
  absent([h.provider.view(), h.logs, mapped]);
});

test('unlock links cannot escape HTTPS genai.mil; replacements must support tools', () => {
  for (const url of ['http://genai.mil/unlock', 'https://genai.mil.evil.test/', 'https://evilgenai.mil/', 'https://genai.mil@evil.test/', 'javascript:alert(1)', 'https://genai.mil:444/', 'https://genai.mil/?key=' + fakeKey]) {
    assert.equal(genAiMilUnlockUrl(url), undefined);
    const result = genAiMilError(401, { error: { unlock_url: url } }, new Headers());
    assert.equal(result.unlockUrl, undefined); assert.match(result.nextStep, /on the GenAI.mil site/); absent(result);
  }
  assert.equal(genAiMilUnlockUrl('https://portal.genai.mil/unlock'), 'https://portal.genai.mil/unlock');
  for (const replacement_model of ['plain-chat', 'embed-withtools', fakeKey + '-withtools']) {
    const result = genAiMilError(410, { error: { details: { replacement_model } } }, new Headers());
    assert.equal(result.replacementModel, undefined); assert.equal(result.nextStep, 'Refresh the model list and select another model.'); absent(result);
  }
});

test('honors Retry-After seconds and HTTP dates without sending early retries', async t => {
  let calls = 0;
  const h = await fixture(t, () => ++calls === 1 ? Response.json({ error: {} }, { status: 429, headers: { 'retry-after': '5' } }) : list());
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey); await h.provider.connect();
  h.advance(4999); await h.provider.connect(); assert.equal(calls, 1);
  h.advance(1); await h.provider.connect(); assert.equal(calls, 2); assert.equal(h.provider.view().connected, true);
  const now = Date.UTC(2026, 10, 4), retryAt = now + 10_000;
  assert.equal(genAiMilError(429, {}, new Headers({ 'retry-after': new Date(retryAt).toUTCString() }), now).retryAt, retryAt);
  assert.equal(genAiMilError(429, {}, new Headers({ 'retry-after': '86400' }), now).message, 'GenAI.mil is temporarily limiting requests.');
});

test('an early reconnect preserves the daily allowance explanation', async t => {
  const h = await fixture(t, () => Response.json({ error: { code: 'daily_quota_exceeded' } }, { status: 429, headers: { 'retry-after': '86400' } }));
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey); await h.provider.connect();
  await h.provider.connect();
  assert.equal(h.requests.length, 1);
  assert.equal(h.provider.view().issue.message, 'Your GenAI.mil daily allowance is used up.');
});

test('real Pi adapter uses fake fetch for Chat Completions SSE, tools, system messages and usage', async t => {
  const chunks = [
    { choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: 'synthetic-call', type: 'function', function: { name: 'synthetic_tool', arguments: '{"text":"synthetic"}' } }] }, finish_reason: null }] },
    { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
    { choices: [], usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 } }
  ];
  const h = await fixture(t, url => url.endsWith('/models') ? list() : new Response(chunks.map(chunk => 'data: ' + JSON.stringify(chunk) + '\n\n').join('') + 'data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream', 'x-request-id': 'synthetic-stream-9' } }));
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey); await h.provider.connect();
  const output = await complete(h);
  assert.equal(output.result.stopReason, 'toolUse', output.result.errorMessage);
  assert.equal(output.result.usage.totalTokens, 16);
  assert.equal(output.result.content[0].name, 'synthetic_tool');
  const request = h.requests.at(-1), body = JSON.parse(request.init.body);
  assert.equal(request.url, GENAI_MIL_ADDRESS + '/chat/completions');
  assert.equal(new Headers(request.init.headers).get('authorization'), 'Bearer ' + fakeKey);
  assert.equal(request.init.redirect, 'error');
  assert.equal(body.stream_options.include_usage, true);
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.tools[0].function.name, 'synthetic_tool');
  assert.match(h.logs.at(-1), /x-request-id=synthetic-stream-9/);
  absent([output, body, h.logs, h.runtime.getRegisteredProviderConfig(GENAI_MIL_PROVIDER), h.runtime.getModel(GENAI_MIL_PROVIDER, modelId)]);
});

test('stream errors and echoed keys cannot reach diagnostics, project state, sessions or renderer payloads', async t => {
  const h = await fixture(t, url => url.endsWith('/models') ? list() : Response.json({ error: { message: fakeKey, detail: fakeKey } }, { status: 502, headers: { 'x-request-id': 'synthetic-failed-stream', 'x-echo': fakeKey } }));
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey); await h.provider.connect();
  const output = await complete(h);
  assert.equal(output.result.stopReason, 'error');
  assert.match(output.result.errorMessage, /GenAI.mil is having a service problem/);
  assert.equal(h.requests.length, 2, 'The SDK must not automatically retry the sanitized failure.');
  const store = new Store(h.root); await store.init();
  const project = store.state.projects[0];
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'));
  backend.log(project, 'intake', 'error', 'Echo: ' + fakeKey);
  project.error = fakeKey; await store.save();
  const session = redactedSessionManager(h.root, path.join(h.root, 'sessions'));
  session.appendMessage({ role: 'user', content: fakeKey, timestamp: 0 });
  const renderer = { state: redactValue(store.state), genAiMil: h.provider.view() };
  absent([output, renderer, project.logs, h.logs, plainError(h.provider.buildError(new Error(fakeKey)))]);
  absent(await fs.readFile(path.join(h.root, 'state.json'), 'utf8'));
  for (const name of await fs.readdir(path.join(h.root, 'sessions'))) absent(await fs.readFile(path.join(h.root, 'sessions', name), 'utf8'));
});

test('transport exceptions containing a key are replaced without retaining a cause', async t => {
  const h = await fixture(t, () => { throw new Error('Authorization: Bearer ' + fakeKey); });
  await h.provider.save(GENAI_MIL_ADDRESS, fakeKey); await h.provider.connect();
  assert.equal(h.provider.view().connected, false);
  assert.equal(h.provider.view().issue.message, 'GenAI.mil could not be reached.');
  const error = h.provider.buildError(new Error(fakeKey));
  assert.equal(error.cause, undefined); absent([error.stack, h.provider.view(), h.logs]);
});

test('combined IPC redaction preserves connection status text and removes credentials inside it', () => {
  assert.equal(redactValue({ credentialStatus: 'GenAI.mil connected' }).credentialStatus, 'GenAI.mil connected');
  const redacted = redactValue({ credentialStatus: 'Echo: ' + fakeKey, nested: { authorization: 'Bearer ' + fakeKey } });
  assert.equal(redacted.credentialStatus, 'Echo: [REDACTED]');
  assert.equal(redacted.nested.authorization, '[REDACTED]');
  absent(redacted);
});

test('connector and GenAI.mil IPC coexist with account controls and block provider changes during work', async t => {
  const h = await fixture(t), store = new Store(h.root); await store.init();
  const connectors = new ConnectorService(new ConnectorStore(path.join(h.root, 'connectors'), h.secure));
  await connectors.init();
  const lead = { active: new Map() };
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'), { genAiMil: () => h.provider, connectorStore: connectors.store });
  backend.runtime = h.runtime;
  const main = await mainHarness(store, backend, 'electron/main.ts', { hostConnectors: connectors, hostGenAiMil: h.provider, hostLead: lead });
  assert.ok(main.handlers.has('fleet:chatgpt:connect'));
  assert.ok(main.handlers.has('fleet:codex:connect-key'));
  const cards = await main.invoke('fleet:connectors:list');
  assert.equal(cards.length, 7);
  const preview = await main.invoke('fleet:connectors:preview', 'gmail', {});
  await main.invoke('fleet:connectors:use', preview.id, preview.digest);
  const saved = await main.invoke('fleet:genai-mil:save', GENAI_MIL_ADDRESS, fakeKey);
  assert.equal(saved.genAiMil.hasKey, true); assert.equal(saved.genAiMil.connected, false);
  const connected = await main.invoke('fleet:genai-mil:connect');
  assert.equal(connected.genAiMil.connected, true);
  assert.ok(connected.models.some(model => model.provider === GENAI_MIL_PROVIDER && model.id === modelId && model.configured));
  const selected = await main.invoke('fleet:settings', { backend: 'pi', provider: GENAI_MIL_PROVIDER, model: modelId, rememberKey: true });
  assert.equal(selected.state.settings.provider, GENAI_MIL_PROVIDER);
  assert.equal(selected.credentialStatus, 'GenAI.mil connected');
  assert.equal((await connectors.store.read(preview.id)).digest, preview.digest);
  absent([saved, connected, selected]);
  for (const active of [backend.active, lead.active]) {
    active.set('synthetic-work', {});
    for (const [channel, args] of [['save', [GENAI_MIL_ADDRESS, fakeKey]], ['connect', []], ['clear', []]]) {
      await assert.rejects(main.invoke('fleet:genai-mil:' + channel, ...args), /Stop active builds and project lead replies/);
    }
    active.clear();
  }
  assert.equal(h.provider.view().connected, true);
  const cleared = await main.invoke('fleet:genai-mil:clear');
  assert.equal(cleared.genAiMil.hasKey, false); assert.equal(cleared.genAiMil.connected, false);
  assert.equal(cleared.models.some(model => model.provider === GENAI_MIL_PROVIDER), false);
});
