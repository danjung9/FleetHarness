import { qualityFixtureHtml } from '../scripts/quality-fixture.mjs';
import { structuredSolutionFixture as solutionFixture, solutionFixtureEvaluator } from '../scripts/solution-fixture.mjs';
import { syntheticDataFiles } from '../scripts/data-fixture.mjs';
import { completeFixtureVisualReview } from '../scripts/visual-review-fixture.mjs';
import { createFixturePlanningReviewSession } from '../scripts/planning-review-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CHATGPT_ACCESS_TOKEN_ENV, CHATGPT_MODEL_PROVIDER, CodexRpc, codexExecutable, codexProcessConfig } from '../dist-electron/electron/codex-rpc.js';
import { createCodexSession } from '../dist-electron/electron/codex-session.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store } from '../dist-electron/electron/storage.js';

class FakeRpc {
  listeners = new Set(); closers = new Set(); calls = []; sent = []; disposed = false;
  handler;
  async initialize() {}
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onClose(fn) { this.closers.add(fn); return () => this.closers.delete(fn); }
  emit(method, params, id) { for (const fn of this.listeners) fn({ method, params, ...(id === undefined ? {} : { id }) }); }
  send(message) { this.sent.push(message); }
  dispose() { this.disposed = true; for (const fn of this.closers) fn(new Error('Process closed')); }
  async request(method, params) {
    this.calls.push({ method, params });
    if (this.handler) { const result = await this.handler(method, params); if (result !== undefined) return result; }
    if (method === 'thread/start' || method === 'thread/resume') return { thread: { id: 'thread-1' } };
    if (method === 'turn/start') return { turn: { id: 'turn-1' } };
    return {};
  }
}
async function temp(t) { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-codex-test-')); t.after(() => fs.rm(root, { recursive: true, force: true })); return root; }
const tick = () => new Promise(resolve => setImmediate(resolve));

const fixtureCredentials = () => Promise.resolve({ accessToken: 'fixture-subscription-token', expiresAt: Date.now() + 3600_000 });
const screenshotPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==';

test('Codex accepts only explicit ChatGPT credentials and keeps tokens out of argv and RPC', async t => {
  const credentials = await fixtureCredentials();
  const { args, env } = codexProcessConfig('/private/app/codex', credentials, { OPENAI_API_KEY: 'api-key', CODEX_API_KEY: 'codex-key', OPENAI_BASE_URL: 'https://other.test', FLEET_CHATGPT_ACCESS_TOKEN: 'stale-token', KEEP: 'value' });
  assert.equal(env[CHATGPT_ACCESS_TOKEN_ENV], credentials.accessToken);
  assert.equal(env.CODEX_HOME, '/private/app/codex'); assert.equal(env.KEEP, 'value');
  assert.equal(env.OPENAI_API_KEY, undefined); assert.equal(env.CODEX_API_KEY, undefined); assert.equal(env.OPENAI_BASE_URL, undefined);
  assert.equal(args.some(value => value.includes(credentials.accessToken)), false);
  for (const value of [`model_provider="${CHATGPT_MODEL_PROVIDER}"`, `model_providers.${CHATGPT_MODEL_PROVIDER}.base_url="https://api.openai.com/v1"`, `model_providers.${CHATGPT_MODEL_PROVIDER}.requires_openai_auth=false`, `model_providers.${CHATGPT_MODEL_PROVIDER}.supports_websockets=false`, `shell_environment_policy.exclude=["${CHATGPT_ACCESS_TOKEN_ENV}"]`]) assert.ok(args.includes(value), value);
  assert.equal(args.some(value => value.includes('forced_login_method')), false);
  assert.throws(() => codexProcessConfig('/tmp', { accessToken: '' }), /Sign in with ChatGPT/);
  for (const invalid of [{ accessToken: '', expiresAt: Date.now() + 10000 }, { accessToken: 'expired', expiresAt: Date.now() - 1 }]) {
    let launched = false;
    await assert.rejects(createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture', signal: new AbortController().signal, tools: [], getCredentials: async () => invalid, launch: () => { launched = true; return new FakeRpc(); } }), /Sign in with ChatGPT/);
    assert.equal(launched, false);
  }
  const rpc = new FakeRpc();
  const value = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture', signal: new AbortController().signal, tools: [], getCredentials: fixtureCredentials, launch: (_home, supplied) => { assert.equal(supplied.accessToken, credentials.accessToken); return rpc; } });
  t.after(() => value.dispose());
  assert.equal(rpc.calls.some(call => call.method.startsWith('account/')), false);
  assert.equal(JSON.stringify(rpc.calls).includes(credentials.accessToken), false);
  const thread = rpc.calls.find(call => call.method === 'thread/start').params;
  assert.equal(thread.modelProvider, CHATGPT_MODEL_PROVIDER);
  assert.equal(thread.allowProviderModelFallback, false);
});

async function session(t, rpc = new FakeRpc(), tools = []) {
  const controller = new AbortController();
  const value = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture-codex', signal: controller.signal, tools, getCredentials: fixtureCredentials, launch: () => rpc });
  t.after(() => value.dispose()); return { value, rpc, controller };
}
test('Codex streams activity, invokes Fleet tools and waits for successful terminal completion', async t => {
  let args;
  const { value, rpc } = await session(t, new FakeRpc(), [{ name: 'fleet_test', description: 'Test', parameters: { type: 'object' }, async execute(_id, input) { args = input; return { content: [{ type: 'text', text: 'tool result' }] }; } }]);
  const events = []; value.subscribe(e => events.push(e));
  const prompt = value.prompt('Build'); await tick();
  const thread = rpc.calls.find(c => c.method === 'thread/start').params;
  assert.equal(thread.dynamicTools[0].type, 'function'); assert.equal(thread.sandbox, 'workspace-write'); assert.equal(thread.approvalPolicy, 'never');
  rpc.emit('item/agentMessage/delta', { threadId: 'other', delta: 'ignore' });
  rpc.emit('turn/started', { threadId: 'thread-1', turn: { id: 'turn-1' } });
  rpc.emit('item/agentMessage/delta', { threadId: 'thread-1', delta: 'Working' });
  rpc.emit('item/tool/call', { threadId: 'thread-1', tool: 'fleet_test', callId: 'tool-1', arguments: { answer: 42 } }, 77); await tick();
  assert.deepEqual(args, { answer: 42 }); assert.equal(rpc.sent.at(-1).result.success, true);
  rpc.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await prompt;
  assert.equal(events.filter(e => e.type === 'message_update').length, 1);
  assert.equal(events[1].assistantMessageEvent.delta, 'Working');
  const second = value.prompt('Finish'); await tick(); rpc.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await second;
});
test('Codex preserves structured helper execution failures', async t => {
  const { value, rpc } = await session(t, new FakeRpc(), [{ name: 'fleet_run_helper', description: 'Run helper', parameters: { type: 'object' },
    async execute() { return { content: [{ type: 'text', text: 'Self-tests failed.' }], isError: true }; }
  }]);
  const prompt = value.prompt('Test the helper'); await tick();
  rpc.emit('item/tool/call', { threadId: 'thread-1', tool: 'fleet_run_helper', callId: 'helper-1', arguments: {} }, 77); await tick();
  assert.equal(rpc.sent.at(-1).result.success, false);
  assert.equal(rpc.sent.at(-1).result.contentItems[0].text, 'Self-tests failed.');
  rpc.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await prompt;
});

for (const isError of [false, true]) test(`Codex returns actual browser images alongside text with success=${!isError}`, async t => {
  const { value, rpc } = await session(t, new FakeRpc(), [{ name: 'fleet_browser', description: 'Inspect browser', parameters: { type: 'object' },
    async execute() { return { content: [{ type: 'text', text: 'Console error: fixture failure' }, { type: 'image', data: screenshotPng, mimeType: 'image/png' }, { type: 'text', text: '' }], isError }; }
  }]);
  const prompt = value.prompt('Inspect the app'); await tick();
  rpc.emit('item/tool/call', { threadId: 'thread-1', tool: 'fleet_browser', callId: 'browser-1', arguments: {} }, 81); await tick();
  assert.deepEqual(rpc.sent.at(-1), { id: 81, result: { contentItems: [
    { type: 'inputText', text: 'Console error: fixture failure' },
    { type: 'inputImage', imageUrl: `data:image/png;base64,${screenshotPng}` },
    { type: 'inputText', text: '' }
  ], success: !isError } });
  rpc.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await prompt;
});

test('Codex rejects malformed and oversized tool images instead of silently dropping or coercing them', async t => {
  const cases = [
    [[{ type: 'image', data: screenshotPng, mimeType: 'text/html' }], /unsupported image format/],
    [[{ type: 'image', data: '!!!!', mimeType: 'image/png' }], /invalid base64/],
    [[{ type: 'image', data: {}, mimeType: 'image/png' }], /invalid base64/],
    [[{ type: 'text', text: { value: 'not text' } }], /invalid text/],
    [[{ type: 'image', data: 'A'.repeat(14 * 1024 * 1024), mimeType: 'image/png' }], /10 MiB/],
    [Array.from({ length: 2 }, () => ({ type: 'image', data: Buffer.alloc(6 * 1024 * 1024).toString('base64'), mimeType: 'image/png' })), /10 MiB/]
  ];
  let content;
  const { value, rpc } = await session(t, new FakeRpc(), [{ name: 'fleet_browser', description: 'Inspect browser', parameters: { type: 'object' }, async execute() { return { content }; } }]);
  const prompt = value.prompt('Inspect the app'); await tick();
  for (const [invalid, message] of cases) {
    content = invalid;
    rpc.emit('item/tool/call', { threadId: 'thread-1', tool: 'fleet_browser', callId: 'browser-invalid', arguments: {} }, 82); await tick();
    const result = rpc.sent.at(-1).result;
    assert.equal(result.success, false);
    assert.equal(result.contentItems.length, 1);
    assert.equal(result.contentItems[0].type, 'inputText');
    assert.match(result.contentItems[0].text, message);
  }
  rpc.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await prompt;
});

test('the conversational Codex coordinator stays read-only and retains its narrow tool policy after credential refresh', async t => {
  let token = 'conversation-token', calls = 0;
  const processes = [];
  const instructions = 'Explain project evidence and propose actions. Never edit files or apply an action yourself.';
  const value = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture-coordinator', signal: new AbortController().signal,
    conversationInstructions: instructions,
    getCredentials: async () => ({ accessToken: token, expiresAt: Date.now() + 3600_000 }),
    tools: [{ name: 'fleet_propose_action', description: 'Propose an action for review', parameters: { type: 'object' }, async execute() { calls++; return { content: [{ type: 'text', text: 'Proposed, not applied.' }] }; } }],
    launch: () => { const rpc = new FakeRpc(); processes.push(rpc); return rpc; }
  });
  t.after(() => value.dispose());
  const original = processes[0].calls.find(call => call.method === 'thread/start').params;
  assert.equal(original.sandbox, 'read-only'); assert.equal(original.approvalPolicy, 'never');
  assert.equal(original.developerInstructions, instructions);
  assert.equal(original.config.web_search, 'disabled');
  assert.equal(original.config['sandbox_workspace_write.network_access'], false);
  for (const feature of ['shell_tool', 'view_image', 'multi_agent', 'apps', 'plugins', 'hooks', 'browser_use', 'in_app_browser', 'computer_use', 'image_generation', 'code_mode_tool_search']) assert.equal(original.config[`features.${feature}`], false, feature);
  assert.deepEqual(original.dynamicTools.map(tool => tool.name), ['fleet_propose_action']);
  const first = value.prompt('Suggest a safer scope.'); await tick();
  processes[0].emit('item/tool/call', { threadId: 'thread-1', tool: 'bash', callId: 'denied', arguments: { command: 'touch file.txt' } }, 90); await tick();
  assert.equal(processes[0].sent.at(-1).result.success, false); assert.equal(calls, 0);
  processes[0].emit('item/commandExecution/requestApproval', { threadId: 'thread-1' }, 91); await tick();
  assert.equal(processes[0].sent.at(-1).error.code, -32601);
  processes[0].emit('item/tool/call', { threadId: 'thread-1', tool: 'fleet_propose_action', callId: 'allowed', arguments: {} }, 92); await tick();
  assert.equal(calls, 1); assert.equal(processes[0].sent.at(-1).result.success, true);
  processes[0].emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await first;
  token = 'refreshed-conversation-token';
  const next = value.prompt('Explain that proposal.'); await tick();
  const resumed = processes[1].calls.find(call => call.method === 'thread/resume').params;
  assert.equal(resumed.sandbox, 'read-only');
  assert.equal(resumed.developerInstructions, instructions); assert.deepEqual(resumed.config, original.config);
  processes[1].emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await next;
});
for (const status of ['failed', 'interrupted']) test(`Codex ${status} turns never count as successful stages`, async t => {
  const { value, rpc } = await session(t); const prompt = value.prompt('Build'); await tick();
  rpc.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status, error: { message: 'Usage limit reached' } } });
  await assert.rejects(prompt, /Usage limit reached/);
});
test('aborting or losing the Codex process settles pending work and releases the process', async t => {
  for (const abort of [true, false]) {
    const { value, rpc, controller } = await session(t); const prompt = value.prompt('Build'); await tick();
    if (abort) controller.abort(); else rpc.dispose();
    await assert.rejects(prompt, /stopped|closed/); assert.equal(rpc.disposed, true);
  }
});
test('rotated ChatGPT credentials resume the same thread with its tools and isolated provider', async t => {
  let token = 'first-subscription-token', credentialReads = 0, toolCalls = 0;
  const processes = [], launches = [];
  const value = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture', signal: new AbortController().signal,
    getCredentials: async () => { credentialReads++; return { accessToken: token, expiresAt: Date.now() + 3600_000 }; },
    tools: [{ name: 'fleet_test', description: 'Test', parameters: { type: 'object' }, async execute() { toolCalls++; return { content: [{ type: 'text', text: 'ok' }] }; } }],
    launch: (_home, credentials) => { launches.push(credentials.accessToken); const rpc = new FakeRpc(); processes.push(rpc); return rpc; }
  });
  t.after(() => value.dispose());
  const first = value.prompt('Build'); await tick();
  processes[0].emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await first;
  token = 'renewed-subscription-token';
  const second = value.prompt('Write the guide'); await tick();
  assert.equal(processes[0].disposed, true); assert.equal(processes.length, 2);
  assert.deepEqual(launches, ['first-subscription-token', 'renewed-subscription-token']);
  assert.equal(credentialReads, 3);
  const original = processes[0].calls.find(call => call.method === 'thread/start').params;
  const resumed = processes[1].calls.find(call => call.method === 'thread/resume').params;
  assert.equal(resumed.threadId, 'thread-1'); assert.equal(resumed.modelProvider, CHATGPT_MODEL_PROVIDER);
  assert.deepEqual(resumed.config, original.config); assert.equal(resumed.developerInstructions, original.developerInstructions);
  assert.equal(processes[1].calls.some(call => call.method === 'thread/start'), false);
  processes[0].emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'failed', error: { message: 'Stale process' } } });
  processes[1].emit('item/tool/call', { threadId: 'thread-1', tool: 'fleet_test', callId: 'tool-2', arguments: {} }, 78); await tick();
  assert.equal(toolCalls, 1); assert.equal(processes[1].sent.at(-1).result.success, true);
  processes[1].emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await second;
});
test('credential refresh failure never starts a turn with stale or API credentials', async t => {
  const rpc = new FakeRpc(); let rejectRefresh = false;
  const value = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture', signal: new AbortController().signal, tools: [],
    getCredentials: async () => { if (rejectRefresh) throw new Error('Reconnect your ChatGPT account.'); return fixtureCredentials(); }, launch: () => rpc });
  t.after(() => value.dispose()); rejectRefresh = true;
  await assert.rejects(value.prompt('Build'), /Reconnect your ChatGPT account/);
  assert.equal(rpc.calls.some(call => call.method === 'turn/start'), false);
});
test('credential rotation before the first turn starts a new empty thread without a nonexistent rollout', async t => {
  let reads = 0; const processes = [];
  const value = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture', signal: new AbortController().signal, tools: [],
    getCredentials: async () => ({ accessToken: ++reads === 1 ? 'first-token' : 'replacement-token', expiresAt: Date.now() + 3600_000 }),
    launch: () => { const rpc = new FakeRpc(); processes.push(rpc); return rpc; } });
  t.after(() => value.dispose());
  const prompt = value.prompt('Build'); await tick();
  assert.equal(processes[0].disposed, true);
  assert.equal(processes[1].calls.some(call => call.method === 'thread/start'), true);
  assert.equal(processes[1].calls.some(call => call.method === 'thread/resume'), false);
  processes[1].emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await prompt;
});
test('cancellation while credentials refresh is pending does not launch a replacement process', async t => {
  const controller = new AbortController(), rpc = new FakeRpc(); let refreshing = false, resolveRefresh, launches = 0;
  const value = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture', signal: controller.signal, tools: [],
    getCredentials: () => refreshing ? new Promise(resolve => { resolveRefresh = resolve; }) : fixtureCredentials(),
    launch: () => { launches++; return rpc; } });
  t.after(() => value.dispose()); refreshing = true;
  const prompt = value.prompt('Build'); await tick();
  await assert.rejects(value.prompt('Concurrent'), /active turn/);
  controller.abort(); await assert.rejects(prompt, /stopped/);
  resolveRefresh({ accessToken: 'late-token', expiresAt: Date.now() + 3600_000 }); await tick();
  assert.equal(launches, 1); assert.equal(rpc.disposed, true);
  assert.equal(rpc.calls.some(call => call.method === 'turn/start'), false);
});
test('RPC handles correlation, timeouts and process death without hanging', async () => {
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import {createInterface} from 'node:readline';createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(m.method==='crash')process.exit(2);if(m.method==='echo')process.stdout.write(JSON.stringify({id:m.id,result:m.params})+'\\n');});`], { stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  const rpc = new CodexRpc(child, 300);
  try {
    assert.deepEqual(await Promise.all([rpc.request('echo', { n: 1 }), rpc.request('echo', { n: 2 })]), [{ n: 1 }, { n: 2 }]);
    await assert.rejects(rpc.request('hang'), /timed out/); await assert.rejects(rpc.request('crash'), /stopped unexpectedly/);
    await assert.rejects(rpc.request('echo'), /disconnected/);
  } finally { rpc.dispose(); }
});

for (const conversationMode of [false, true]) test(conversationMode ? 'bundled Codex project lead disables command and edit tools across credential rotation' : 'bundled Codex uses SIWC HTTP transport and restores history and dynamic tools after token rotation', { timeout: 15000 }, async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-siwc-transport-'));
  const processClosures = [];
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = ''; for await (const part of request) body += part;
    if (request.url !== '/v1/responses') { response.writeHead(404); response.end(); return; }
    requests.push({ authorization: request.headers.authorization, body: JSON.parse(body) });
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const item = { id: 'msg_fixture', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Synthetic local completion.', annotations: [] }] };
    for (const data of [
      { type: 'response.created', response: { id: 'resp_fixture', status: 'in_progress', output: [] } },
      { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', content: [] } },
      { type: 'response.output_text.delta', item_id: 'msg_fixture', output_index: 0, content_index: 0, delta: 'Synthetic local completion.' },
      { type: 'response.output_item.done', output_index: 0, item },
      { type: 'response.completed', response: { id: 'resp_fixture', status: 'completed', output: [item], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } }
    ]) response.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
    response.end();
  });
  let value;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let accessToken = 'synthetic-first-token';
    value = await createCodexSession({ home, cwd: home, model: 'gpt-6.1-sol', signal: new AbortController().signal,
      ...(conversationMode ? { conversationInstructions: 'You are a read-only project conversation. Use only fleet_siwc_fixture.' } : {}),
      getCredentials: async () => ({ accessToken, expiresAt: Date.now() + 3600_000 }),
      tools: [{ name: 'fleet_siwc_fixture', description: 'Synthetic fixture tool', parameters: { type: 'object', properties: {} }, async execute() { return { content: [] }; } }],
      launch: (directory, credentials) => {
        const { args, env } = codexProcessConfig(directory, credentials);
        // Only this local test replaces the production endpoint; no hosted inference is requested.
        args.push('-c', `model_providers.${CHATGPT_MODEL_PROVIDER}.base_url="http://127.0.0.1:${server.address().port}/v1"`);
        const child = spawn(codexExecutable(), args, { cwd: directory, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true });
        processClosures.push(new Promise(resolve => child.once('close', resolve)));
        return new CodexRpc(child);
      }
    });
    await value.prompt('First synthetic fixture turn.');
    accessToken = 'synthetic-second-token';
    await value.prompt('Second synthetic fixture turn.');
    assert.deepEqual(requests.map(request => request.authorization), ['Bearer synthetic-first-token', 'Bearer synthetic-second-token']);
    for (const { body } of requests) {
      assert.equal(body.store, false); assert.equal(body.stream, true);
      assert.ok(JSON.stringify(body).includes('fleet_siwc_fixture'));
      assert.equal(JSON.stringify(body).includes('"type":"tool_search"'), false);
      if (conversationMode) {
        const toolNames = (body.tools ?? []).flatMap(tool => tool.type === 'namespace' ? tool.tools.map(nested => nested.name) : [tool.name]);
        for (const name of ['exec_command', 'shell', 'shell_command', 'write_stdin', 'apply_patch', 'view_image']) assert.equal(toolNames.includes(name), false, `${name} must be absent from the actual model request: ${toolNames.join(', ')}`);
      }
    }
    assert.ok(requests[1].body.input.length > requests[0].body.input.length);
    assert.ok(JSON.stringify(requests[1].body.input).includes('First synthetic fixture turn.'));
  } finally {
    value?.dispose(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    // dispose initiates shutdown; wait until Codex stops writing its local state.
    await Promise.all(processClosures);
    await fs.rm(home, { recursive: true, force: true });
  }
});

for (const rejectImages of [false, true]) test(rejectImages ? 'bundled Codex surfaces model image rejection as a failed turn' : 'bundled Codex forwards browser screenshot pixels and console errors into the next model request', { timeout: 15000 }, async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-transport-'));
  const processClosures = [], requests = [], toolCalls = [];
  const server = createServer(async (request, response) => {
    let body = ''; for await (const part of request) body += part;
    if (request.url !== '/v1/responses') { response.writeHead(404); response.end(); return; }
    requests.push(JSON.parse(body));
    if (rejectImages && requests.length > 1) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { type: 'invalid_request_error', message: 'Image inputs are not supported by this fixture model.' } }));
      return;
    }
    const toolRequest = requests.length === 1;
    const item = toolRequest
      ? { id: 'fc_browser_fixture', type: 'function_call', call_id: 'call_browser_fixture', name: 'fleet_browser', arguments: '{"action":"screenshot"}', status: 'completed' }
      : { id: 'msg_browser_fixture', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Screenshot received.', annotations: [] }] };
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const events = [
      { type: 'response.created', response: { id: 'resp_browser_fixture', status: 'in_progress', output: [] } },
      { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', ...(toolRequest ? { arguments: '' } : { content: [] }) } },
      toolRequest
        ? { type: 'response.function_call_arguments.delta', item_id: item.id, output_index: 0, delta: item.arguments }
        : { type: 'response.output_text.delta', item_id: item.id, output_index: 0, content_index: 0, delta: 'Screenshot received.' },
      { type: 'response.output_item.done', output_index: 0, item },
      { type: 'response.completed', response: { id: 'resp_browser_fixture', status: 'completed', output: [item], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } }
    ];
    for (const data of events) response.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
    response.end();
  });
  let value;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    value = await createCodexSession({ home, cwd: home, model: 'gpt-6.1-sol', signal: new AbortController().signal, getCredentials: fixtureCredentials,
      tools: [{ name: 'fleet_browser', description: 'Capture local app screenshot', parameters: { type: 'object', properties: { action: { type: 'string' } } },
        async execute(_id, args) {
          toolCalls.push(args);
          return { content: [{ type: 'text', text: 'Console error: synthetic fixture failure.' }, { type: 'image', mimeType: 'image/png', data: screenshotPng }] };
        }
      }],
      launch: (directory, credentials) => {
        const { args, env } = codexProcessConfig(directory, credentials);
        // Synthetic credentials and a loopback endpoint ensure this test never calls hosted inference.
        args.push('-c', `model_providers.${CHATGPT_MODEL_PROVIDER}.base_url="http://127.0.0.1:${server.address().port}/v1"`);
        const child = spawn(codexExecutable(), args, { cwd: directory, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true });
        processClosures.push(new Promise(resolve => child.once('close', resolve)));
        return new CodexRpc(child);
      }
    });
    const prompt = value.prompt('Inspect the local browser screenshot and console.');
    if (rejectImages) await assert.rejects(prompt, /Image inputs are not supported/);
    else await prompt;
    assert.deepEqual(toolCalls, [{ action: 'screenshot' }]);
    assert.equal(requests.length, 2);
    const output = requests[1].input.find(item => item.type === 'function_call_output' && item.call_id === 'call_browser_fixture');
    assert.ok(output, 'the next request must contain the browser tool response');
    assert.deepEqual(output.output, [
      { type: 'input_text', text: 'Console error: synthetic fixture failure.' },
      { type: 'input_image', image_url: `data:image/png;base64,${screenshotPng}` }
    ]);
  } finally {
    value?.dispose(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await Promise.all(processClosures);
    await fs.rm(home, { recursive: true, force: true });
  }
});

test('factory admission rejects stale model catalogs without an active ChatGPT plan grant', async t => {
  const root = await temp(t), store = new Store(root); await store.init();
  store.state.settings = { backend: 'codex', provider: 'chatgpt', model: 'fixture-codex', rememberKey: false };
  const codex = { home: path.join(root, 'codex'), account: {}, models: [{ id: 'fixture-codex', configured: true }], async refresh() {}, credentials: fixtureCredentials };
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'), { codex,
    createCodexSession: () => { throw new Error('No session should start without plan permission'); } });
  for (const account of [{ status: 'disconnected', planUsageEnabled: true }, { status: 'connecting', planUsageEnabled: true }, { status: 'connected', planUsageEnabled: false }]) {
    codex.account = account;
    await assert.rejects(backend.start(store.state.projects[0].id), /sign in with ChatGPT/);
    assert.equal(backend.active.size, 0); assert.equal(store.state.projects[0].status, 'draft');
  }
});

for (const runtimeProfile of ['browser', 'cli']) test(`the Codex engine routes ${runtimeProfile} phase skills and runs independent verification without a Pi session`, { timeout: 30000 }, async t => {
  const root = await temp(t), store = new Store(root); await store.init();
  store.state.settings = { backend: 'codex', provider: 'chatgpt', model: 'fixture-codex', rememberKey: false };
  const project = store.state.projects[0], phases = [], sessions = [];
  const codex = { home: path.join(root, 'codex'), account: { status: 'connected', planUsageEnabled: true }, models: [{ id: 'fixture-codex', configured: true }], async refresh() {}, credentials: fixtureCredentials };
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'), { codex,
    createSession: () => { throw new Error('Pi must not run'); },
    createCodexSession: async options => {
      // Reviewer lifecycle is covered separately; these assertions track the
      // ordinary phase skills while the reviewer still submits through its host ledger.
      if (options.tools.some(tool => tool.name === 'fleet_submit_planning_review')) {
        return createFixturePlanningReviewSession(options.tools);
      }
      const rpc = new FakeRpc();
      const session = { skills: options.skillPaths.map(skillPath => path.basename(skillPath)) };
      sessions.push(session);
      let phase;
      rpc.handler = async (method, params) => {
        if (method !== 'turn/start') return;
        const text = params.input[0].text;
        phase ??= text.includes('You are the synthetic data agent') ? 'synthetic-data' : /Current phase: (\w+)/.exec(text)?.[1] || 'plan'; phases.push(phase);
        session.phase = phase;
        const guide = text.startsWith('Implementation is complete.');
        if (guide) {
          await fs.access(path.join(options.cwd, runtimeProfile === 'browser' ? 'index.html' : 'evaluate.cjs'));
          await assert.rejects(fs.access(path.join(options.cwd, 'README.md')), /ENOENT/);
        }
        const files = guide ? { 'README.md': runtimeProfile === 'browser' ? '# Fixture guide\nOpen index.html in a browser. Enter TASK: inspect pump in Message and select Parse message. The task appears and survives reload. Empty input asks you to enter a message. Run `node --test app.test.cjs` with Node for developer tests.' : '# Fixture guide\nWith Node installed, pipe a JSON message into `node evaluate.cjs`. The input `"TASK: inspect pump"` returns `"inspect pump"`; an empty JSON string returns null. Run `node --test app.test.cjs` for developer tests.' }
          : phase === 'synthetic-data' ? syntheticDataFiles
          : phase === 'intake' ? { 'scope.md': 'Scope' } : phase === 'research' ? { 'research.md': 'Research' } : phase === 'plan' ? { 'scope.md': 'Scope', 'research.md': 'Research', 'plan.md': 'Plan', 'test-matrix.md': 'Test mapping' }
          : phase === 'build' ? { 'index.html': qualityFixtureHtml, 'evaluate.cjs': solutionFixtureEvaluator, 'core.cjs': 'exports.parse = text => text.startsWith("TASK: ") ? text.slice(6) : null;', 'path-to-fleet.md': 'Domain review required', 'app.test.cjs': 'require("node:test")("sum",()=>require("node:assert/strict").equal(2+2,4));' }
          : { 'verification.md': 'Verified by the independent runner' };
        if (phase === 'plan') Object.assign(files, solutionFixture(JSON.parse(await fs.readFile(path.join(options.cwd, '.fleet/packet.json'), 'utf8')).acceptance.map(criterion => criterion.id)));
        if (runtimeProfile === 'cli' && phase === 'plan') {
          const solution = JSON.parse(files['solution-contract.json']);
          solution.runtime = { profile: 'cli', files: ['evaluate.cjs', 'core.cjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] } };
          const plan = JSON.parse(files['acceptance-plan.json']);
          plan.journeys = [];
          for (const criterion of plan.criteria) criterion.journeyIds = [];
          files['solution-contract.json'] = JSON.stringify(solution);
          files['acceptance-plan.json'] = JSON.stringify(plan);
        }
        if (runtimeProfile === 'cli' && phase === 'build' && !guide) {
          delete files['index.html'];
          files['evaluate.cjs'] = 'const {readFileSync} = require("node:fs"), {parse} = require("./core.cjs"); process.stdout.write(JSON.stringify(parse(JSON.parse(readFileSync(0, "utf8")))));';
        }
        for (const [file, content] of Object.entries(files)) {
          await fs.mkdir(path.dirname(path.join(options.cwd, file)), { recursive: true });
          await fs.writeFile(path.join(options.cwd, file), content);
        }
        const tool = options.tools.find(t => t.name === (phase === 'plan' ? 'fleet_system_design' : 'fleet_component_progress'));
        const args = phase === 'plan' ? { title: 'Fixture', description: 'Application architecture', components: [{ id: 'app', label: 'App', description: 'Task parser', kind: runtimeProfile === 'browser' ? 'interface' : 'logic', files: [runtimeProfile === 'browser' ? 'index.html' : 'core.cjs'] }], connections: [] } : { componentId: 'app', status: 'generated', detail: 'Source written' };
        if (tool) await tool.execute('architecture', args);
        if (runtimeProfile === 'browser' && (guide || phase === 'verify')) await completeFixtureVisualReview(options.tools);
        setImmediate(() => rpc.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }));
        return { turn: { id: 'turn-1' } };
      };
      const value = await createCodexSession({ ...options, launch: () => rpc });
      const instructions = rpc.calls.find(call => call.method === 'thread/start').params.developerInstructions;
      for (const skillPath of options.skillPaths) {
        assert.ok(instructions.includes(await fs.readFile(path.join(skillPath, 'SKILL.md'), 'utf8')), `${path.basename(skillPath)} is delivered to Codex`);
      }
      return value;
    }
  });
  backend.runtime = { getModel() { throw new Error('Pi model lookup must not run'); } };
  t.after(() => backend.stopAll()); await backend.start(project.id); await backend.active.get(project.id)?.done;
  assert.equal(project.status, 'review', project.error); assert.equal(project.backend, 'codex'); assert.equal(project.report.passed, 1); assert.equal(project.report.quality.status, 'passed'); assert.equal(project.report.quality.journeys.length, runtimeProfile === 'browser' ? 4 : 0);
  assert.equal(project.runtimeProfile, runtimeProfile);
  assert.deepEqual(phases, ['intake', 'synthetic-data', 'research', 'plan', 'build', 'build', 'verify']); assert.ok(project.logs.some(l => l.text.includes('Codex · ChatGPT subscription')));
  for (const session of sessions) {
    assert.equal(session.skills.includes('ponytail'), ['research', 'plan', 'build', 'verify'].includes(session.phase), `${session.phase} Ponytail access`);
    assert.equal(session.skills.includes('impeccable'), session.phase === 'plan' || runtimeProfile === 'browser' && ['build', 'verify'].includes(session.phase), `${session.phase} Impeccable access`);
    const phase = project.phasePlan.find(phase => phase.id === session.phase);
    assert.deepEqual(session.skills, phase?.skills ?? ['fleet-data']);
  }
  const packet = JSON.parse(await fs.readFile(path.join(project.workspace, '.fleet/packet.json'), 'utf8'));
  assert.deepEqual(project.phasePlan, packet.stages.map(phase => runtimeProfile === 'cli' && ['build', 'verify'].includes(phase.id)
    ? { ...phase, tools: phase.tools.filter(tool => tool !== 'fleet_visual_review'), skills: phase.skills.filter(skill => skill !== 'impeccable') } : phase));
  const saved = JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects.find(savedProject => savedProject.id === project.id);
  assert.deepEqual(saved.phasePlan, project.phasePlan);
  assert.match(await fs.readFile(path.join(project.workspace, 'README.md'), 'utf8'), /Fixture guide/);
});
