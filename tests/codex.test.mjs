import { qualityFixture, qualityFixtureHtml } from '../scripts/quality-fixture.mjs';
import { syntheticDataFiles } from '../scripts/data-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CodexRpc } from '../dist-electron/electron/codex-rpc.js';
import { CodexAccount } from '../dist-electron/electron/codex-account.js';
import { createCodexSession } from '../dist-electron/electron/codex-session.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store } from '../dist-electron/electron/storage.js';

class FakeRpc {
  listeners = new Set(); closers = new Set(); calls = []; sent = []; disposed = false; signedIn = false;
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
    if (method === 'account/read') return { account: this.signedIn ? { type: 'chatgpt', email: 'builder@example.test', planType: 'plus' } : null };
    if (method === 'model/list') return { data: [{ model: 'fixture-codex', displayName: 'Fixture Codex' }], nextCursor: null };
    if (method === 'account/rateLimits/read') return { rateLimits: { primary: { usedPercent: 18, windowDurationMins: 300, resetsAt: 1900000000 } } };
    if (method === 'account/login/start') return { type: 'chatgpt', loginId: 'login-1', authUrl: 'https://auth.openai.com/authorize?state=fixture' };
    if (method === 'account/logout') this.signedIn = false;
    if (method === 'thread/start') return { thread: { id: 'thread-1' } };
    if (method === 'turn/start') return { turn: { id: 'turn-1' } };
    return {};
  }
}
async function temp(t) { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-codex-test-')); t.after(() => fs.rm(root, { recursive: true, force: true })); return root; }
const tick = () => new Promise(resolve => setImmediate(resolve));

test('ChatGPT login uses an isolated home, waits for completion and exposes only safe account fields', async t => {
  const root = await temp(t), rpc = new FakeRpc(), opened = [];
  const account = new CodexAccount(root, async url => opened.push(url), home => { assert.equal(home, path.join(root, 'codex')); return rpc; });
  t.after(() => account.dispose());
  await account.refresh(); assert.equal(account.account.status, 'disconnected'); assert.equal(account.models[0].configured, false);
  await account.login(); await account.login();
  assert.equal(opened.length, 1); assert.equal(account.account.status, 'connecting');
  rpc.emit('account/login/completed', { loginId: 'stale-login', success: true }); assert.equal(account.account.status, 'connecting');
  rpc.signedIn = true; rpc.emit('account/login/completed', { loginId: 'login-1', success: true }); await tick();
  assert.equal(account.account.status, 'connected'); assert.equal(account.models[0].configured, true);
  assert.equal(account.account.limits[0].usedPercent, 18);
  assert.deepEqual(Object.keys(account.account).sort(), ['email', 'limits', 'plan', 'status']);
  await account.logout(); assert.equal(account.account.status, 'disconnected'); assert.equal(account.models[0].configured, false);
});

test('login cancellation and OAuth rejection stay disconnected', async t => {
  const rpc = new FakeRpc(), account = new CodexAccount(await temp(t), async () => {}, () => rpc); t.after(() => account.dispose());
  await account.login(); await account.cancel();
  assert.ok(rpc.calls.some(c => c.method === 'account/login/cancel' && c.params.loginId === 'login-1'));
  rpc.emit('account/login/completed', { loginId: 'login-1', success: true }); await tick(); assert.equal(account.account.status, 'disconnected');
  await account.login(); rpc.emit('account/login/completed', { loginId: 'login-1', success: false, error: 'Consent declined' });
  assert.equal(account.account.error, 'Consent declined');
});

test('untrusted login URLs are never opened and browser-open failures cancel the login', async t => {
  for (const browserFails of [false, true]) {
    const rpc = new FakeRpc(); let opened = false;
    if (!browserFails) rpc.handler = method => method === 'account/login/start' ? { loginId: 'login-1', authUrl: 'https://malicious.example/signin' } : undefined;
    const account = new CodexAccount(await temp(t), async () => { opened = true; throw new Error('Browser unavailable'); }, () => rpc); t.after(() => account.dispose());
    await assert.rejects(account.login(), browserFails ? /Browser unavailable/ : /unexpected sign-in address/);
    assert.equal(opened, browserFails); assert.equal(account.account.status, 'disconnected');
    if (browserFails) assert.ok(rpc.calls.some(c => c.method === 'account/login/cancel'));
  }
});

test('API-key-only accounts cannot be used as ChatGPT subscriptions', async t => {
  const rpc = new FakeRpc(); rpc.handler = method => method === 'account/read' ? { account: { type: 'apiKey' } } : undefined;
  const account = new CodexAccount(await temp(t), async () => {}, () => rpc); t.after(() => account.dispose());
  await account.refresh(); assert.equal(account.account.status, 'disconnected'); assert.equal(account.models[0].configured, false);
  await assert.rejects(createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture', signal: new AbortController().signal, tools: [], launch: () => rpc }), /Sign in with ChatGPT/);
});

async function session(t, rpc = new FakeRpc(), tools = []) {
  rpc.signedIn = true;
  const controller = new AbortController();
  const value = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'fixture-codex', signal: controller.signal, tools, launch: () => rpc });
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
test('RPC handles correlation, timeouts and process death without hanging', async () => {
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import {createInterface} from 'node:readline';createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(m.method==='crash')process.exit(2);if(m.method==='echo')process.stdout.write(JSON.stringify({id:m.id,result:m.params})+'\\n');});`], { stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  const rpc = new CodexRpc(child, 300);
  try {
    assert.deepEqual(await Promise.all([rpc.request('echo', { n: 1 }), rpc.request('echo', { n: 2 })]), [{ n: 1 }, { n: 2 }]);
    await assert.rejects(rpc.request('hang'), /timed out/); await assert.rejects(rpc.request('crash'), /stopped unexpectedly/);
    await assert.rejects(rpc.request('echo'), /disconnected/);
  } finally { rpc.dispose(); }
});

test('the Codex engine runs every factory phase, domain tools and independent verification without a Pi session', { timeout: 15000 }, async t => {
  const root = await temp(t), store = new Store(root); await store.init();
  store.state.settings = { backend: 'codex', provider: 'chatgpt', model: 'fixture-codex', rememberKey: false };
  const project = store.state.projects[0], phases = [];
  const codex = { home: path.join(root, 'codex'), models: [{ id: 'fixture-codex', configured: true }], async refresh() {} };
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'), { codex,
    createSession: () => { throw new Error('Pi must not run'); },
    createCodexSession: async options => {
      const rpc = new FakeRpc(); rpc.signedIn = true;
      let phase;
      rpc.handler = async (method, params) => {
        if (method !== 'turn/start') return;
        const text = params.input[0].text;
        phase ??= text.includes('You are the synthetic data agent') ? 'synthetic-data' : /Current phase: (\w+)/.exec(text)?.[1] || 'plan'; phases.push(phase);
        const guide = text.startsWith('Implementation is complete.');
        if (guide) {
          await fs.access(path.join(options.cwd, 'index.html'));
          await assert.rejects(fs.access(path.join(options.cwd, 'README.md')), /ENOENT/);
        }
        const files = guide ? { 'README.md': '# Fixture guide\nOpen index.html in a browser. Enter TASK: inspect pump in Message and select Parse message. The task appears and survives reload. Empty input asks you to enter a message. Run `node --test app.test.cjs` with Node for developer tests.' }
          : phase === 'synthetic-data' ? syntheticDataFiles
          : phase === 'intake' ? { 'scope.md': 'Scope' } : phase === 'research' ? { 'research.md': 'Research' } : phase === 'plan' ? { 'scope.md': 'Scope', 'research.md': 'Research', 'plan.md': 'Plan', 'test-matrix.md': 'Test mapping' }
          : phase === 'build' ? { 'index.html': qualityFixtureHtml, 'path-to-fleet.md': 'Domain review required', 'app.test.cjs': 'require("node:test")("sum",()=>require("node:assert/strict").equal(2+2,4));' }
          : { 'verification.md': 'Verified by the independent runner' };
        if (phase === 'plan') Object.assign(files, qualityFixture(JSON.parse(await fs.readFile(path.join(options.cwd, '.fleet/packet.json'), 'utf8')).acceptance.map(criterion => criterion.id)));
        for (const [file, content] of Object.entries(files)) {
          await fs.mkdir(path.dirname(path.join(options.cwd, file)), { recursive: true });
          await fs.writeFile(path.join(options.cwd, file), content);
        }
        const tool = options.tools.find(t => t.name === (phase === 'plan' ? 'fleet_system_design' : 'fleet_component_progress'));
        const args = phase === 'plan' ? { title: 'Fixture', description: 'Application architecture', components: [{ id: 'app', label: 'App', description: 'Browser app', kind: 'interface', files: ['index.html'] }], connections: [] } : { componentId: 'app', status: 'generated', detail: 'Source written' };
        if (tool) await tool.execute('architecture', args);
        setImmediate(() => rpc.emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }));
        return { turn: { id: 'turn-1' } };
      };
      return createCodexSession({ ...options, launch: () => rpc });
    }
  });
  backend.runtime = { getModel() { throw new Error('Pi model lookup must not run'); } };
  t.after(() => backend.stopAll()); await backend.start(project.id); await backend.active.get(project.id)?.done;
  assert.equal(project.status, 'review', project.error); assert.equal(project.backend, 'codex'); assert.equal(project.report.passed, 1); assert.equal(project.report.quality.status, 'passed'); assert.equal(project.report.quality.journeys.length, 4);
  assert.deepEqual(phases, ['intake', 'synthetic-data', 'research', 'plan', 'build', 'build', 'verify']); assert.ok(project.logs.some(l => l.text.includes('Codex · ChatGPT subscription')));
  assert.match(await fs.readFile(path.join(project.workspace, 'README.md'), 'utf8'), /Fixture guide/);
});
