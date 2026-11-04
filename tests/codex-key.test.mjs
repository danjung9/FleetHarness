import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CodexRpc } from '../dist-electron/electron/codex-rpc.js';
import { CodexAccount } from '../dist-electron/electron/codex-account.js';
import { createCodexSession } from '../dist-electron/electron/codex-session.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store, sourceHash } from '../dist-electron/electron/storage.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';

// Synthetic only. Exercise transport redaction even when the server echoes input.
const fakeKey = 'SYNTHETIC_ONLY_AppYard_key_route_654321';
const server = `
const readline = require('node:readline');
let key = '', connected = false;
const send = message => process.stdout.write(JSON.stringify(message) + '\\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  const { id, method, params } = JSON.parse(line);
  if (id === undefined) return;
  let result = {};
  if (method === 'account/login/start') {
    key = params.apiKey;
    process.stderr.write('Synthetic secret diagnostic: ' + key + '\\n');
    send({ method: 'fixture/diagnostic', params: { [key]: key, nested: [key] } });
    if (process.env.FIXTURE_REJECT === 'yes') return send({ id, error: { code: 401, message: 'Invalid API key: ' + key } });
    connected = true; result = { type: 'apiKey' };
  } else if (method === 'account/read') result = { account: connected ? { type: 'apiKey' } : null };
  else if (method === 'model/list') result = { data: [{ model: 'fixture-codex', displayName: 'Fixture model' }], nextCursor: null };
  else if (method === 'account/logout') connected = false;
  else if (method === 'thread/start') result = { thread: { id: 'thread-key' } };
  else if (method === 'turn/start') {
    send({ id, result: { turn: { id: 'turn-key' } } });
    send({ method: 'item/agentMessage/delta', params: { threadId: 'thread-key', delta: 'Synthetic secret echo: ' + key } });
    send({ method: 'turn/completed', params: { threadId: 'thread-key', turn: { id: 'turn-key', status: 'failed', error: { message: '401 Invalid API key: ' + key } } } });
    return;
  } else if (method === 'fixture/error') return send({ id, error: { code: 401, message: 'Invalid API key: ' + key } });
  send({ id, result });
});`;

async function fixture(t, reject = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-key-'));
  const requests = [], notifications = [], rpcs = [];
  const launch = () => {
    const child = spawn(process.execPath, ['-e', server], { stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32',
      env: { ...process.env, FIXTURE_REJECT: reject ? 'yes' : 'no' } });
    const write = child.stdin.write.bind(child.stdin);
    child.stdin.write = (line, ...args) => { requests.push(JSON.parse(String(line))); return write(line, ...args); };
    const rpc = new CodexRpc(child); rpcs.push(rpc);
    rpc.subscribe(message => notifications.push(message));
    return rpc;
  };
  const account = new CodexAccount(root, async () => assert.fail('API-key login must not open a browser'), launch);
  t.after(async () => { account.dispose(); rpcs.forEach(rpc => rpc.dispose()); await fs.rm(root, { recursive: true, force: true }); });
  return { root, account, requests, notifications, rpcs };
}
async function assertNoKey(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    // Never open credential files. These fixtures do not create one.
    assert.notEqual(entry.name, 'auth.json', 'The synthetic server must not persist credentials');
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) await assertNoKey(file);
    else assert.equal((await fs.readFile(file, 'utf8')).includes(fakeKey), false, file);
  }
}

test('API-key login sends the exact protocol, starts a real adapter build, signs out and never exports the key', async t => {
  const h = await fixture(t);
  await h.account.loginWithKey(fakeKey);
  assert.deepEqual(h.requests.find(r => r.method === 'account/login/start'), { id: 2, method: 'account/login/start', params: { type: 'apiKey', apiKey: fakeKey } });
  assert.deepEqual(h.account.account, { status: 'connected', authType: 'apiKey', email: 'API key' });
  assert.deepEqual(h.account.route, { provider: 'openai', label: 'API key' });
  assert.deepEqual(h.account.models, [{ id: 'fixture-codex', name: 'Fixture model', provider: 'chatgpt', backend: 'codex', configured: true }]);
  assert.equal(JSON.stringify(h.notifications).includes(fakeKey), false);
  assert.match(JSON.stringify(h.notifications), /\[redacted\]/);
  await assert.rejects(h.rpcs[0].request('fixture/error'), error => { assert.equal(error.message, 'Invalid API key: [redacted]'); return true; });

  const store = new Store(h.root); await store.init();
  store.state.settings = { backend: 'codex', provider: 'chatgpt', model: '', rememberKey: false };
  // Readiness probes and transport are synthetic. Start, the adapter, thread/turn
  // requests and terminal persistence execute their production implementations.
  const rpc = h.rpcs[0], sessionRpc = Object.create(rpc); sessionRpc.dispose = () => {};
  // Keep the account server for logout, with one shared request-ID sequence.
  for (const name of ['initialize', 'request', 'send', 'subscribe', 'onClose']) sessionRpc[name] = rpc[name].bind(rpc);
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'), {
    codex: h.account, preflight: { browser: async () => {}, sandbox: async () => {}, freeBytes: async () => 1024 ** 3 },
    createSession: () => assert.fail('A key account must use the Codex engine'),
    createCodexSession: options => createCodexSession({ ...options, launch: () => sessionRpc })
  });
  t.after(() => backend.stopAll());
  const project = store.state.projects[0];
  await backend.start(project.id); await backend.active.get(project.id)?.done;
  assert.ok(h.requests.some(r => r.method === 'thread/start'));
  assert.ok(h.requests.some(r => r.method === 'turn/start'));
  assert.equal(project.model, 'openai/fixture-codex'); assert.equal(store.state.settings.model, 'fixture-codex');
  assert.equal(project.status, 'failed'); // Deliberate server error, never live inference.
  assert.ok(project.logs.some(log => log.text.includes('Synthetic secret echo: [redacted]')));
  assert.equal(JSON.stringify({ state: store.state, account: h.account.account, models: h.account.models }).includes(fakeKey), false);
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8'));
  assert.equal(JSON.stringify(saved).includes(fakeKey), false);
  const bundle = await exportVerifiedBundle({ workspace: project.workspace, parent: h.root, title: 'Synthetic key test',
    verifiedHash: await sourceHash(project.workspace), deliveryMarkdown: JSON.stringify(project.logs) });
  await assertNoKey(bundle);
  await h.account.logout();
  assert.deepEqual(h.account.account, { status: 'disconnected' });
  assert.ok(h.account.models.every(m => !m.configured));
  assert.ok(h.requests.some(r => r.method === 'account/logout'));
  await h.account.refresh(); assert.equal(h.account.account.status, 'disconnected');
  await assertNoKey(h.root);
});

test('invalid API keys produce a plain error, clear the login and never expose the echoed key', async t => {
  const h = await fixture(t, true);
  await assert.rejects(h.account.loginWithKey(fakeKey), error => {
    assert.equal(error.message, 'API-key sign-in failed; check the key and its access, then try again in Model settings.');
    assert.equal(String(error.stack).includes(fakeKey), false); assert.equal(error.cause, undefined); return true;
  });
  assert.equal(h.account.account.status, 'disconnected'); assert.deepEqual(h.account.models, []);
  assert.equal(JSON.stringify({ account: h.account.account, notifications: h.notifications }).includes(fakeKey), false);
  assert.ok(h.requests.some(r => r.method === 'account/logout'));
  await assertNoKey(h.root);
});

test('sign-out during key login cannot leave a connected account behind', async t => {
  const h = await fixture(t);
  const signingIn = h.account.loginWithKey(fakeKey);
  const signingOut = h.account.logout();
  await Promise.all([signingIn, signingOut]);
  await h.account.refresh();
  assert.deepEqual(h.account.account, { status: 'disconnected' });
  assert.ok(h.account.models.every(model => !model.configured));
  assert.equal(JSON.stringify(h.notifications).includes(fakeKey), false);
  await assertNoKey(h.root);
});

test('the preload sends the key only on the dedicated login channel', async () => {
  let api, request;
  vm.runInNewContext(await fs.readFile('dist-electron/electron/preload.cjs', 'utf8'), {
    exports: {}, require: name => {
      assert.equal(name, 'electron');
      return { contextBridge: { exposeInMainWorld(_name, value) { api = value; } },
        ipcRenderer: { invoke: async (...args) => { request = args; return { chatgpt: { status: 'connected', authType: 'apiKey', email: 'API key' } }; } } };
    }
  });
  const received = await api.connectCodexKey(fakeKey);
  assert.deepEqual(Array.from(request), ['fleet:codex:connect-key', fakeKey]);
  assert.equal(JSON.stringify(received).includes(fakeKey), false);
});

test('the Codex password control calls key login and clears input on success or rejection', async t => {
  const folder = await fs.mkdtemp(path.resolve('.tmp/key-renderer-'));
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit', 'false', '--outDir', folder]);
  const prefix = pathToFileURL(folder + path.sep).href, url = pathToFileURL(path.join(folder, 'src/ModelSettings.js')).href;
  let cursor = 0, slots = [], pending, submitted, updated, failure;
  const hookName = '__syntheticKeyControl';
  globalThis[hookName] = initial => {
    const i = cursor++; if (!(i in slots)) slots[i] = initial;
    return [slots[i], next => { slots[i] = next; }];
  };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL === url && specifier === 'react') return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(`
        export const useState = value => globalThis.${hookName}(value);
        export const useEffect = () => {}; export const useRef = value => ({ current: value });`) };
      if (context.parentURL?.startsWith(prefix) && specifier.endsWith('.css')) return { shortCircuit: true, url: new URL(specifier, context.parentURL).href };
      return next(specifier, context);
    },
    load(target, context, next) {
      if (target.startsWith(prefix) && target.endsWith('.css')) return { shortCircuit: true, format: 'module', source: 'export default "";' };
      return next(target, context);
    }
  });
  t.after(async () => { hooks.deregister(); delete globalThis[hookName]; await fs.rm(folder, { recursive: true, force: true }); });
  const { ModelSettings } = await import(url);
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const result = find(child, predicate); if (result) return result; }
  };
  for (const reject of [false, true]) {
    slots = []; updated = undefined; failure = undefined;
    const data = { state: { settings: { backend: 'codex', provider: 'chatgpt', model: '', rememberKey: false }, projects: [] }, models: [], chatgpt: { status: 'disconnected' } };
    const result = { ...data, chatgpt: { status: 'connected', authType: 'apiKey', email: 'API key' } };
    const props = { data, desktop: true, busy: false, updated: value => { updated = value; },
      api: { async connectCodexKey(key) { submitted = key; if (reject) throw new Error('Synthetic invalid key'); return result; } },
      action(task) { pending = task().catch(error => { failure = error.message; }); return pending; } };
    const render = () => { cursor = 0; return ModelSettings(props); };
    let tree = render();
    const password = find(tree, node => node.type === 'input' && node.props.type === 'password');
    assert.ok(password); assert.equal(password.props.autoComplete, 'off'); assert.equal(password.props.disabled, false);
    const button = () => find(render(), node => node.type === 'button' && node.props.children === 'Sign in with API key');
    assert.equal(button().props.disabled, true);
    password.props.onChange({ target: { value: fakeKey } }); assert.equal(button().props.disabled, false);
    button().props.onClick();
    assert.equal(find(render(), node => node.type === 'input' && node.props.type === 'password').props.value, '');
    await pending; assert.equal(submitted, fakeKey);
    if (reject) { assert.equal(updated, undefined); assert.equal(failure, 'Synthetic invalid key'); }
    else assert.deepEqual(updated, result);
  }
});
