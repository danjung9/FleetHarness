import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CodexRpc, codexExecutable } from '../dist-electron/electron/codex-rpc.js';
import { runCodexGoalThread } from '../dist-electron/electron/codex-goal-thread.js';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';

async function fixture(t, scenario) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-headless-goal-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const executable = path.join(root, 'codex-fixture.cjs');
  await fs.writeFile(executable, `#!${process.execPath}
const fs = require('node:fs');
const readline = require('node:readline');
const scenario = ${JSON.stringify(scenario)};
const threadId = 'fixture-thread';
const send = value => process.stdout.write(JSON.stringify(value) + '\\n');
const event = (method, params) => send({ method, params: { threadId, ...params } });
const goal = status => ({ threadId, objective: 'Build the dashboard.', status });
const turn = status => ({ id: 'turn-1', status, items: [] });
fs.writeFileSync('process.json', JSON.stringify({ pid: process.pid, marker: process.env.APPYARD_RUN_PROCESS, args: process.argv.slice(2) }));
process.on('SIGTERM', () => { fs.writeFileSync('closed', 'closed'); process.exit(0); });
readline.createInterface({ input: process.stdin }).on('line', line => {
  const request = JSON.parse(line);
  fs.appendFileSync('requests.jsonl', JSON.stringify(request) + '\\n');
  if (request.id === undefined || !request.method) return;
  if (request.method === 'initialize') { if (scenario !== 'stuck-initialize') send({ id: request.id, result: {} }); return; }
  if (request.method === 'thread/start') { send({ id: request.id, result: { thread: { id: threadId }, model: 'fixture-model', reasoningEffort: 'high' } }); return; }
  if (request.method === 'model/list') { send({ id: request.id, result: { data: [{ id: 'fixture-model', supportedReasoningEfforts: [{ reasoningEffort: 'high' }] }] } }); return; }
  if (request.method === 'turn/interrupt') { send({ id: request.id, result: {} }); return; }
  if (request.method !== 'thread/goal/set') { send({ id: request.id, result: {} }); return; }
  if (request.params.status === 'paused') { if (scenario !== 'stuck-pause') send({ id: request.id, result: { goal: goal('paused') } }); return; }
  send({ id: request.id, result: { goal: goal('active') } });
  event('thread/goal/updated', { goal: goal('active') });
  event('turn/started', { turn: turn('inProgress') });
  event('item/agentMessage/delta', { turnId: 'turn-1', itemId: 'message-1', delta: 'Building the dashboard.' });
  event('item/commandExecution/outputDelta', { turnId: 'turn-1', itemId: 'command-1', delta: 'Check passed.' });
  event('item/agentMessage/delta', { threadId: 'unrelated-thread', delta: 'Must not appear.' });
  if (scenario === 'exit') { process.exit(1); return; }
  if (scenario === 'input') { send({ id: 'input-1', method: 'item/tool/requestUserInput', params: { threadId, turnId: 'turn-1', itemId: 'input', isBlocking: true, questions: [] } }); return; }
  if (scenario === 'failed' || scenario === 'interrupted') { event('turn/completed', { turn: { ...turn(scenario), error: { message: 'Turn ' + scenario } } }); return; }
  if (scenario === 'provider-error') { event('error', { turnId: 'turn-1', willRetry: false, error: { message: 'Provider is unavailable.' } }); return; }
  if (scenario === 'system-error') { event('thread/status/changed', { status: { type: 'systemError' } }); return; }
  if (scenario === 'retry') {
    event('thread/status/changed', { status: { type: 'systemError' } });
    event('error', { turnId: 'turn-1', willRetry: true, error: { message: 'Retrying transient failure.' } });
  }
  if (scenario === 'active' || scenario === 'stuck-pause') return;
  if (scenario === 'turn-only') { event('turn/completed', { turn: turn('completed') }); return; }
  event('thread/goal/updated', { goal: goal(['blocked', 'usageLimited', 'budgetLimited'].includes(scenario) ? scenario : 'complete') });
  setTimeout(() => {
    event('item/agentMessage/delta', { turnId: 'turn-1', itemId: 'final', delta: 'Final summary after goal update.' });
    event('turn/completed', { turn: turn(scenario === 'complete-then-fail' ? 'failed' : 'completed') });
  }, scenario === 'retry' ? 350 : 60);
});
`, { mode: 0o700 });
  const controller = new AbortController();
  t.after(() => controller.abort());
  t.signal.addEventListener('abort', () => controller.abort(), { once: true });
  const events = [];
  let thread;
  const options = { workspace: root, objective: 'Build the dashboard.', executable, env: { PATH: process.env.PATH, HOME: root, TMPDIR: process.env.TMPDIR }, signal: controller.signal, onThread: value => { thread = value; }, onEvent: message => { events.push(message); } };
  return { root, options, events, controller, thread: () => thread, requests: async () => (await fs.readFile(path.join(root, 'requests.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line)) };
}

function abortAfterProgress(fixture) {
  const forward = fixture.options.onEvent;
  fixture.options.onEvent = message => {
    forward(message);
    if (message.method === 'item/commandExecution/outputDelta') queueMicrotask(() => fixture.controller.abort());
  };
}

test('headless goals stream matching progress and wait for the final turn before disposing', { timeout: 5000 }, async t => {
  const f = await fixture(t, 'complete');
  const scope = new RunProcessSweep({ marker: 'goal-fixture-marker', scan: async () => [] });
  assert.deepEqual(await scope.run(() => runCodexGoalThread({ ...f.options, reasoningEffort: 'high' })), { status: 'completed' });
  assert.equal(f.thread(), 'fixture-thread');
  assert.ok(f.events.some(message => message.params.delta === 'Building the dashboard.'));
  assert.ok(f.events.some(message => message.params.delta === 'Check passed.'));
  assert.ok(f.events.some(message => message.params.delta === 'Final summary after goal update.'));
  assert.equal(f.events.some(message => message.params.threadId === 'unrelated-thread'), false);
  const requests = await f.requests();
  assert.deepEqual(requests.find(request => request.method === 'thread/goal/set').params, { threadId: 'fixture-thread', objective: 'Build the dashboard.', status: 'active', origin: 'user' });
  assert.equal(requests.some(request => request.method === 'turn/start' || request.method === 'thread/unsubscribe'), false, 'native goals own continuation');
  const processInfo = JSON.parse(await fs.readFile(path.join(f.root, 'process.json'), 'utf8'));
  assert.equal(processInfo.marker, scope.marker);
  assert.deepEqual(processInfo.args, ['app-server', '--listen', 'stdio://', '--enable', 'goals']);
  assert.equal(await fs.readFile(path.join(f.root, 'closed'), 'utf8'), 'closed');
  assert.throws(() => process.kill(processInfo.pid, 0), { code: 'ESRCH' }, 'returning must wait for process cleanup');
});

for (const scenario of ['failed', 'interrupted', 'provider-error', 'exit', 'complete-then-fail', 'system-error']) test(`headless ${scenario} cannot report successful completion`, { timeout: 5000 }, async t => {
  const f = await fixture(t, scenario);
  const result = await runCodexGoalThread(f.options);
  assert.equal(result.status, 'failed');
  assert.ok(result.error);
});

for (const scenario of ['blocked', 'usageLimited', 'budgetLimited', 'input']) test(`headless ${scenario} ends with a useful blocked result`, { timeout: 5000 }, async t => {
  const f = await fixture(t, scenario);
  const result = await runCodexGoalThread(f.options);
  assert.equal(result.status, 'blocked');
  assert.ok(result.error);
  if (scenario === 'input') assert.ok((await f.requests()).some(request => request.id === 'input-1' && request.error), 'interactive server requests must receive a response');
});

test('transient provider retry keeps streaming until native goal completion', async t => {
  const f = await fixture(t, 'retry');
  assert.equal((await runCodexGoalThread(f.options)).status, 'completed');
  assert.ok(f.events.some(message => message.method === 'error' && message.params.willRetry));
});

for (const scenario of ['active', 'turn-only', 'stuck-pause']) test(`Stop pauses and interrupts ${scenario} goal before closing its process`, { timeout: 5000 }, async t => {
  const f = await fixture(t, scenario);
  if (scenario === 'turn-only') {
    const forward = f.options.onEvent;
    f.options.onEvent = message => { forward(message); if (message.method === 'turn/completed') setTimeout(() => f.controller.abort(), 60); };
  } else abortAfterProgress(f);
  const result = await runCodexGoalThread(f.options);
  assert.deepEqual(result, { status: 'stopped' });
  const requests = await f.requests();
  const paused = requests.findIndex(request => request.method === 'thread/goal/set' && request.params.status === 'paused');
  assert.ok(paused > 0);
  if (scenario !== 'turn-only') assert.ok(requests.findIndex(request => request.method === 'turn/interrupt') > paused);
  assert.equal(await fs.readFile(path.join(f.root, 'closed'), 'utf8'), 'closed');
});

test('Stop during unresponsive initialization does not wait for the RPC timeout', { timeout: 5000 }, async t => {
  const f = await fixture(t, 'stuck-initialize');
  const timer = setTimeout(() => f.controller.abort(), 150);
  t.after(() => clearTimeout(timer));
  assert.equal((await runCodexGoalThread(f.options)).status, 'stopped');
});

test('a missing Codex executable reports failure after process cleanup', { timeout: 5000 }, async t => {
  const f = await fixture(t, 'complete');
  const result = await runCodexGoalThread({ ...f.options, executable: path.join(f.root, 'missing-codex') });
  assert.equal(result.status, 'failed');
  assert.match(result.error, /Could not start bundled Codex/);
});

test('empty objectives and already stopped runs never launch Codex', async () => {
  await assert.rejects(runCodexGoalThread({ workspace: '/unused', objective: '  ', executable: '/does-not-exist', signal: new AbortController().signal }), /objective is required/);
  assert.deepEqual(await runCodexGoalThread({ workspace: '/unused', objective: 'Build something.', executable: '/does-not-exist', signal: AbortSignal.abort() }), { status: 'stopped' });
});

async function nativeFixture(t, respond) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-native-goal-'));
  const home = path.join(root, 'codex-home');
  const workspace = path.join(root, "project ' quoted");
  await Promise.all([fs.mkdir(home), fs.mkdir(workspace)]);
  const calls = [];
  const server = createServer(async (request, response) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    calls.push(body);
    respond(response, body, calls.length);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); });
  await fs.writeFile(path.join(home, 'config.toml'), `
model = "gpt-5.5"
model_reasoning_effort = "low"
model_provider = "goal_test"
check_for_update_on_startup = false
web_search = "disabled"
[model_providers.goal_test]
name = "Offline goal test"
base_url = "http://127.0.0.1:${server.address().port}/v1"
requires_openai_auth = false
wire_api = "responses"
supports_websockets = false
request_max_retries = 0
stream_max_retries = 0
[features]
plugins = false
apps = false
skill_search = false
browser_use = false
computer_use = false
image_generation = false
multi_agent = false
[analytics]
enabled = false
[projects.${JSON.stringify(workspace)}]
trust_level = "trusted"
`);
  // Never inherit actual provider credentials or the developer's Codex home.
  const env = { PATH: process.env.PATH, HOME: os.homedir(), TMPDIR: process.env.TMPDIR, CODEX_HOME: home };
  const controller = new AbortController();
  t.after(() => controller.abort());
  t.signal.addEventListener('abort', () => controller.abort(), { once: true });
  return { home, workspace, env, calls, controller };
}

for (const reasoningEffort of [undefined, 'high']) test(`native headless goal preserves ${reasoningEffort ?? 'configured default'} reasoning and reports provider failure`, { timeout: 20_000 }, async t => {
  const f = await nativeFixture(t, response => {
    response.writeHead(401, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: { message: 'Offline goal test; no real provider.', type: 'authentication_error' } }));
  });
  const objective = "Build the requested dashboard. Keep the customer's 'quoted' text.\nVerify the result.";
  if (reasoningEffort) {
    const unsupported = await runCodexGoalThread({ ...f, objective, reasoningEffort: 'ultra', signal: f.controller.signal });
    assert.equal(unsupported.status, 'failed');
    assert.match(unsupported.error, /does not support ultra reasoning/);
    assert.equal(f.calls.length, 0, 'unsupported reasoning must fail before model work');
  }
  const events = [];
  let threadId;
  const result = await runCodexGoalThread({ ...f, objective, reasoningEffort, signal: f.controller.signal, onThread: value => { threadId = value; }, onEvent: message => events.push(message) });
  assert.equal(result.status, 'failed');
  assert.match(threadId, /^[a-f0-9-]{36}$/);
  assert.ok(f.calls.length > 0, 'the live goal should call the local provider without Terminal or resume');
  assert.ok(JSON.stringify(f.calls[0]).includes('Build the requested dashboard.'));
  assert.equal(f.calls[0].reasoning.effort, reasoningEffort ?? 'low');
  assert.ok(events.some(message => message.method === 'turn/started'));
  assert.ok(events.some(message => message.method === 'error' || message.method === 'turn/completed'));
});

function stream(response, item) {
  response.writeHead(200, { 'Content-Type': 'text/event-stream' });
  for (const data of [
    { type: 'response.created', response: { id: 'resp_goal', status: 'in_progress', output: [] } },
    { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', ...(item.type === 'custom_tool_call' ? { input: '' } : item.type === 'function_call' ? { arguments: '' } : { content: [] }) } },
    item.type === 'function_call'
      ? { type: 'response.function_call_arguments.delta', item_id: item.id, output_index: 0, delta: item.arguments }
      : item.type === 'custom_tool_call'
      ? { type: 'response.custom_tool_call_input.delta', item_id: item.id, output_index: 0, delta: item.input }
      : { type: 'response.output_text.delta', item_id: item.id, output_index: 0, content_index: 0, delta: item.content[0].text },
    { type: 'response.output_item.done', output_index: 0, item },
    { type: 'response.completed', response: { id: 'resp_goal', status: 'completed', output: [item], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } }
  ]) response.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
  response.end();
}

test('native goals stream final output and persist completion without a Terminal handoff', { timeout: 20_000 }, async t => {
  const f = await nativeFixture(t, (response, body, index) => {
    if (index > 3) { response.writeHead(401); response.end(JSON.stringify({ error: { message: 'Fixture did not complete the goal.' } })); return; }
    if (index === 1) {
      assert.ok(body.tools.some(tool => tool.name === 'update_goal'), 'the native goal tool must be available');
      stream(response, { id: 'call_complete', type: 'function_call', call_id: 'complete-1', name: 'update_goal', arguments: JSON.stringify({ status: 'complete' }), status: 'completed' });
    }
    else stream(response, { id: 'msg_complete', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Synthetic goal completed.', annotations: [] }] });
  });
  const events = [];
  let threadId;
  const result = await runCodexGoalThread({ ...f, objective: 'Complete the synthetic local goal.', signal: f.controller.signal, onThread: value => { threadId = value; }, onEvent: message => events.push(message) });
  assert.equal(result.status, 'completed');
  assert.ok(events.some(message => message.method === 'thread/goal/updated' && message.params.goal.status === 'complete'));
  assert.ok(events.some(message => message.method === 'item/agentMessage/delta' && message.params.delta.includes('Synthetic goal completed.')));
  assert.equal(f.calls.length, 2);
  const rpc = new CodexRpc(spawn(codexExecutable(), ['app-server', '--listen', 'stdio://', '--enable', 'goals'], { cwd: f.workspace, env: f.env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true }));
  try {
    await rpc.initialize();
    const { goal } = await rpc.request('thread/goal/get', { threadId });
    assert.equal(goal.status, 'complete');
    assert.equal(goal.tokenBudget, null);
  } finally { await rpc.dispose(); }
});


test('stopping a native active goal persists pause and interrupts its streamed turn', { timeout: 20_000 }, async t => {
  const f = await nativeFixture(t, response => {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    for (const data of [
      { type: 'response.created', response: { id: 'resp_running', status: 'in_progress', output: [] } },
      { type: 'response.output_item.added', output_index: 0, item: { id: 'msg_running', type: 'message', role: 'assistant', status: 'in_progress', content: [] } },
      { type: 'response.output_text.delta', item_id: 'msg_running', output_index: 0, content_index: 0, delta: 'Still building the local fixture.' }
    ]) response.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
  });
  let threadId;
  const result = await runCodexGoalThread({ ...f, objective: 'Build until stopped.', signal: f.controller.signal,
    onThread: value => { threadId = value; },
    onEvent: message => { if (message.method === 'item/agentMessage/delta') f.controller.abort(); }
  });
  assert.deepEqual(result, { status: 'stopped' });
  const rpc = new CodexRpc(spawn(codexExecutable(), ['app-server', '--listen', 'stdio://', '--enable', 'goals'], { cwd: f.workspace, env: f.env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true }));
  try {
    await rpc.initialize();
    const { goal } = await rpc.request('thread/goal/get', { threadId });
    assert.equal(goal.status, 'paused');
    const { thread } = await rpc.request('thread/read', { threadId, includeTurns: true });
    assert.equal(thread.turns.at(-1).status, 'interrupted');
    assert.equal(f.calls.length, 1, 'Stop must prevent automatic goal continuation');
  } finally { await rpc.dispose(); }
});
