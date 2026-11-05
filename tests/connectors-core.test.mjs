import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { ConnectorStore } from '../dist-electron/electron/connectors/store.js';
import { ConnectorService, registerConnectorIPC } from '../dist-electron/electron/connectors/index.js';
import { connectorCatalog, sampleAdapter } from '../dist-electron/electron/connectors/sample-data.js';
import { sanitizeItems, hasMarking } from '../dist-electron/electron/connectors/sanitize.js';
import { writeConnectedContext, assertContext, snapshotDigest } from '../dist-electron/electron/connectors/snapshot.js';
import { validateSelections } from '../dist-electron/shared/connectors.js';
import { normalizeProjectInput } from '../dist-electron/shared/project-input.js';
import { briefHash } from '../dist-electron/electron/pi-backend.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';
import { connectorConfiguration, connectorEncryption, installedAdapters, fixtureSource } from '../dist-electron/electron/connectors/config.js';
import { startConnectorServers } from './fixtures/connector-servers.mjs';
import { startDataServiceServer } from './fixtures/data-service-server.mjs';

process.env.NODE_ENV = 'test';

// Real filesystem and crypto. This substitutes the OS keychain boundary only;
// native safeStorage and process cleanup need the separate Electron smoke.
function encryption() {
  const key = randomBytes(32);
  return {
    isEncryptionAvailable: () => true,
    encryptString(text) {
      const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
      return Buffer.concat([nonce, cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    },
    decryptString(bytes) {
      const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
      decipher.setAuthTag(bytes.subarray(-16));
      return Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString();
    }
  };
}
async function setup(t, crypto = encryption()) {
  const parent = path.resolve('output/connectors-unit'); await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'case-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new ConnectorStore(path.join(root, 'saved'), crypto), service = new ConnectorService(store);
  await service.init();
  const workspace = path.join(root, 'workspace'); await fs.mkdir(workspace);
  return { root, store, service, workspace };
}
async function saved(service, kind = 'gmail') {
  const preview = await service.preview(kind, {}); await service.use(preview.id, preview.digest); return preview;
}
const choice = snapshot => ({ id: snapshot.id, digest: snapshot.digest, includeInApp: false });
function ipc(service) {
  const routes = new Map(); registerConnectorIPC((name, fn) => routes.set(name, fn), service);
  return (name, ...args) => routes.get('fleet:connectors:' + name)(...args);
}
async function question(service, kind) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const progress = await service.progress(kind);
    if (progress.stage === 'question' && progress.question) return progress.question;
    assert.notEqual(progress.stage, 'failed', progress.error);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail('The connector did not ask its question.');
}
function configuration(accounts, dataService) {
  return connectorConfiguration(false, { NODE_ENV: 'test', APPYARD_CONNECTOR_TEST_MODE: '1', APPYARD_CONNECTOR_TEST_SERVERS: JSON.stringify({ accounts, dataService }) });
}
const unavailableStorage = {
  isEncryptionAvailable: () => false,
  encryptString() { throw new Error('Unavailable storage must not encrypt.'); },
  decryptString() { throw new Error('Unavailable storage must not decrypt.'); }
};
function encryptionEnvironment() {
  return { NODE_ENV: 'test', APPYARD_CONNECTOR_TEST_MODE: '1', APPYARD_CONNECTOR_TEST_SERVERS: JSON.stringify({ accounts: 'http://127.0.0.1:1', dataService: 'http://127.0.0.1:2' }),
    APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY: randomBytes(32).toString('hex') };
}
function fixtureEncryption() { return connectorEncryption(false, encryptionEnvironment(), unavailableStorage); }
const item = body => ({ id: 'synthetic', title: 'Synthetic training', kind: 'file', body });
async function allBytes(root) {
  const output = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.name === 'auth.json') continue;
    const file = path.join(root, entry.name);
    output.push(entry.isDirectory() ? await allBytes(file) : await fs.readFile(file));
  }
  return Buffer.concat(output);
}

test('packaged apps ignore test endpoint settings, even malformed ones', () => {
  const env = { NODE_ENV: 'test', APPYARD_CONNECTOR_TEST_MODE: '1', APPYARD_CONNECTOR_TEST_SERVERS: '{bad', APPYARD_GOOGLE_CLIENT_ID: 'registered-client' };
  const packaged = connectorConfiguration(true, env);
  assert.equal(packaged.fixture, undefined); assert.equal(packaged.google.clientId, 'registered-client');
  const commercial = connectorConfiguration(true, { APPYARD_MICROSOFT_CLIENT_ID: 'registered-commercial-client' });
  assert.equal(commercial.microsoft.clientId, undefined);
  assert.equal(commercial.microsoft.clouds.commercial.clientId, 'registered-commercial-client');
  assert.equal(commercial.microsoft.clouds.government.clientId, undefined);
  assert.equal(commercial.microsoft.clouds.dod.clientId, undefined);
  assert.equal(installedAdapters(packaged).length, 7);
  assert.equal(connectorConfiguration(false, { ...env, APPYARD_CONNECTOR_TEST_MODE: undefined }).fixture, undefined);
  assert.throws(() => connectorConfiguration(false, { ...env, NODE_ENV: 'production' }), /not enabled/);
  assert.throws(() => configuration('https://example.invalid', 'http://127.0.0.1:12'), /local addresses/);
  const local = configuration('http://127.0.0.1:11', 'http://127.0.0.1:12');
  assert.equal(fixtureSource(local, 'gmail'), true);
  assert.equal(fixtureSource(packaged, 'gmail'), false);
  assert.equal(fixtureSource(local, 'custom-api', 'http://127.0.0.1:12/ships'), true);
  assert.equal(fixtureSource(local, 'custom-api', 'http://127.0.0.1:13/ships'), false);
});
test('packaged and production hosts refuse unavailable secure storage without enabling the fixture encryptor', async t => {
  const fixtureEnv = encryptionEnvironment(), sentinel = 'synthetic-plain-secret-' + randomUUID();
  for (const [packaged, env] of [
    [true, fixtureEnv], [true, { ...fixtureEnv, APPYARD_CONNECTOR_TEST_SERVERS: '{bad', APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY: 'invalid' }],
    [false, { ...fixtureEnv, NODE_ENV: 'production', APPYARD_CONNECTOR_TEST_MODE: undefined }],
    [false, { ...fixtureEnv, APPYARD_CONNECTOR_TEST_MODE: '0' }]
  ]) {
    const selected = connectorEncryption(packaged, env, unavailableStorage);
    assert.equal(selected, unavailableStorage);
    const { root, store } = await setup(t, selected), id = randomUUID();
    await assert.rejects(store.secrets(id).set('access', sentinel), { message: 'Secure storage is unavailable. Use sample data.' });
    const service = new ConnectorService(store, installedAdapters(connectorConfiguration(true, {})), 5000, { allowConnections: true });
    t.after(() => service.shutdown());
    await assert.rejects(ipc(service)('connect', 'custom-api', 'http://127.0.0.1:1/unused'), { message: 'Secure storage is unavailable. Use sample data.' });
    assert.deepEqual(await store.connections(), []);
    assert.equal((await saved(service)).items.length, 2);
    assert.equal((await allBytes(root)).includes(Buffer.from(sentinel)), false);
  }
  const native = encryption();
  assert.equal(connectorEncryption(false, fixtureEnv, native), native);
  assert.throws(() => connectorEncryption(false, { ...fixtureEnv, NODE_ENV: 'production' }, unavailableStorage), /not enabled/);
  assert.throws(() => connectorEncryption(false, { ...fixtureEnv, APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY: undefined }, unavailableStorage), /Local test encryption is not configured/);
  assert.throws(() => connectorEncryption(false, { ...fixtureEnv, APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY: 'invalid' }, unavailableStorage), /Local test encryption is not configured/);
});
test('fixture encryption survives reopening, authenticates ciphertext and keeps fake secrets and its key off disk', async t => {
  const env = encryptionEnvironment(), selected = connectorEncryption(false, env, unavailableStorage);
  assert.notEqual(selected, unavailableStorage);
  const { root, store } = await setup(t, selected), id = randomUUID();
  const values = ['synthetic-access-' + randomUUID(), 'synthetic-service-key-' + randomUUID()];
  await store.secrets(id).set('access', values[0]); await store.secrets(id).set('service', values[1]);
  const reopened = new ConnectorStore(store.root, connectorEncryption(false, { ...env }, unavailableStorage));
  await reopened.init();
  assert.equal(await reopened.secrets(id).get('access'), values[0]);
  assert.equal(await reopened.secrets(id).get('service'), values[1]);
  const bytes = await allBytes(root);
  for (const value of [...values, env.APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY]) assert.equal(bytes.includes(Buffer.from(value)), false);
  assert.equal(bytes.includes(Buffer.from(env.APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY, 'hex')), false);
  const first = selected.encryptString(values[0]), second = selected.encryptString(values[0]);
  assert.notDeepEqual(first, second);
  const modified = Buffer.from(first); modified[modified.length - 1] ^= 1;
  assert.throws(() => selected.decryptString(modified));
  assert.throws(() => fixtureEncryption().decryptString(first));
  await reopened.remove(id); await assert.rejects(fs.access(path.join(store.root, 'secrets', id)), { code: 'ENOENT' });
});
for (const [boundary, encryptor] of [['unit encryption', encryption], ['fixture fallback encryption', fixtureEncryption]]) {
test('real account adapter connects through IPC, fetches, refreshes after restart, and removes secrets with ' + boundary, async t => {
  const crypto = encryptor(), { store, root } = await setup(t, crypto);
  const provider = await startConnectorServers({ echoSecrets: true }); t.after(() => provider.close());
  const config = configuration(provider.base, provider.base);
  // The unit host opens the actual local authorization and callback URLs. The
  // separate native smoke exercises shell.openExternal through the real screen.
  const options = { allowConnections: true, openBrowser: provider.ui().openBrowser };
  const service = new ConnectorService(store, installedAdapters(config), 5000, options), call = ipc(service);
  t.after(() => service.shutdown());
  assert.equal((await call('list'))[0].available, true);
  assert.equal(await call('connect', 'gmail'), undefined);
  assert.equal(provider.state.pkceVerified, 1);
  assert.deepEqual(await call('progress', 'gmail'), { stage: 'choose' });
  assert.equal((await call('list'))[0].connection, undefined);
  const preview = await call('preview', 'gmail', {}, 'connected');
  assert.equal(preview.sample, false); assert.equal(preview.items.length, 2);
  assert.equal(preview.redacted, 2);
  assert.equal(JSON.stringify(preview).includes(provider.distinctive), false);
  assert.equal(JSON.stringify(preview).includes('sample@example.invalid'), false);
  await call('use', preview.id, preview.digest);
  assert.deepEqual(await store.read(preview.id), preview);
  assert.deepEqual(await store.connections(), [{ id: preview.id, kind: 'gmail', sample: false }]);
  assert.equal((await allBytes(root)).includes(Buffer.from(provider.distinctive)), false);
  const restarted = new ConnectorService(new ConnectorStore(store.root, crypto), installedAdapters(config), 5000, options);
  await restarted.init(); t.after(() => restarted.shutdown());
  assert.equal((await restarted.list())[0].signedIn.id, preview.id);
  provider.state.apiOnceStatus = 401;
  const next = await restarted.preview('gmail', {}, 'connected');
  assert.equal(next.items.length, 2); assert.equal(provider.state.refreshes, 1);
  assert.equal(JSON.stringify(next).includes(provider.distinctive), false);
  assert.equal((await allBytes(root)).includes(Buffer.from(provider.distinctive)), false);
  await restarted.use(next.id, next.digest); await restarted.disconnect(next.id);
  assert.equal(provider.state.revocations, 1); assert.equal(provider.state.revokedKnownToken, true);
  assert.deepEqual(await store.list(), []); assert.deepEqual(await store.connections(), []);
  await assert.rejects(fs.access(path.join(store.root, 'secrets', next.id)), { code: 'ENOENT' });
});
test('data service questions keep keys private, survive restart and cancel without a partial connection with ' + boundary, async t => {
  const crypto = encryptor(), { store, root } = await setup(t, crypto), key = 'synthetic-service-' + randomUUID();
  const server = await startDataServiceServer({ key, mode: 'header', description: 'openapi' }); t.after(() => server.close());
  const config = configuration(server.origin, server.origin), options = { allowConnections: true };
  const service = new ConnectorService(store, installedAdapters(config), 5000, options), call = ipc(service);
  t.after(() => service.shutdown());
  const connecting = call('connect', 'custom-api', server.origin + '/docs');
  let prompt = await question(service, 'custom-api');
  assert.match(prompt.label, /internal service/); assert.deepEqual(prompt.options.map(option => option.id), ['no', 'yes']);
  await call('answer', 'custom-api', prompt.requestId, 'yes');
  prompt = await question(service, 'custom-api');
  assert.equal(prompt.secret, true); assert.match(prompt.label, /needs a key/);
  await assert.rejects(call('answer', 'custom-api', randomUUID(), key), /expired/);
  await call('answer', 'custom-api', prompt.requestId, key); await connecting;
  assert.deepEqual(await call('progress', 'custom-api'), { stage: 'choose' });
  assert.equal((await store.list()).length, 0);
  server.setMode('leak');
  const scrubbed = await call('preview', 'custom-api', {}, 'connected');
  assert.equal(scrubbed.items.length, 1); assert.equal(JSON.stringify(scrubbed).includes(key), false);
  server.setMode('header');
  const preview = await call('preview', 'custom-api', {}, 'connected');
  assert.equal(preview.items.length, 2); await call('use', preview.id, preview.digest);
  assert.equal((await allBytes(root)).includes(Buffer.from(key)), false);
  const restarted = new ConnectorService(new ConnectorStore(store.root, crypto), installedAdapters(config), 5000, options);
  await restarted.init(); t.after(() => restarted.shutdown());
  assert.equal((await restarted.list()).find(card => card.kind === 'custom-api').signedIn.id, preview.id);
  assert.equal((await restarted.preview('custom-api', {}, 'connected')).items.length, 2);
  const cancelled = call('connect', 'custom-api', server.origin + '/docs');
  const rejected = assert.rejects(cancelled, /could not be prepared/);
  prompt = await question(service, 'custom-api'); await call('answer', 'custom-api', prompt.requestId, 'yes');
  prompt = await question(service, 'custom-api'); assert.equal(prompt.secret, true);
  await call('cancel', 'custom-api'); await rejected;
  assert.deepEqual(await call('progress', 'custom-api'), { stage: 'cancelled' });
  await assert.rejects(call('answer', 'custom-api', prompt.requestId, key), /expired/);
  assert.equal((await store.connections()).length, 1); assert.equal((await store.list()).length, 1);
  assert.equal(JSON.stringify(await call('list')).includes(key), false);
  assert.equal((await allBytes(root)).includes(Buffer.from(key)), false);
  assert.ok(server.requests.length > 5); assert.ok(server.requests.every(request => request.method === 'GET'));
  await restarted.disconnect(preview.id); assert.deepEqual(await store.connections(), []); assert.deepEqual(await store.list(), []);
  await assert.rejects(fs.access(path.join(store.root, 'secrets', preview.id)), { code: 'ENOENT' });
});
}
test('government sign-in displays the user code and cancelling clears it without saving credentials', async t => {
  const { store } = await setup(t), provider = await startConnectorServers(); t.after(() => provider.close());
  const config = configuration(provider.base, provider.base);
  const service = new ConnectorService(store, installedAdapters(config), 5000, { allowConnections: true,
    openBrowser: async address => { if (new URL(address).pathname.endsWith('/authorize')) throw new Error('Synthetic unavailable browser'); }
  });
  t.after(() => service.shutdown());
  const connecting = service.connect('outlook'), rejected = assert.rejects(connecting, /could not be prepared/);
  const prompt = await question(service, 'outlook');
  assert.match(prompt.label, /Which Microsoft account/);
  await service.answer('outlook', prompt.requestId, 'government');
  let progress;
  const deadline = Date.now() + 5000;
  do { progress = await service.progress('outlook'); if (progress.code) break; await new Promise(resolve => setTimeout(resolve, 10)); } while (Date.now() < deadline);
  assert.deepEqual(progress.code, { value: 'SAMPLE-123', url: provider.base + '/device' });
  assert.equal(JSON.stringify(progress).includes(provider.distinctive), false);
  await service.cancel('outlook'); await rejected;
  assert.deepEqual(await service.progress('outlook'), { stage: 'cancelled' });
  assert.deepEqual(await store.connections(), []); assert.deepEqual(await store.list(), []);
});
test('reconnecting an account revokes the old grant before the new sign-in', async t => {
  const { store } = await setup(t), provider = await startConnectorServers(); t.after(() => provider.close());
  const service = new ConnectorService(store, installedAdapters(configuration(provider.base, provider.base)), 5000,
    { allowConnections: true, openBrowser: provider.ui().openBrowser });
  t.after(() => service.shutdown());
  await service.connect('gmail'); const previous = (await store.connections())[0];
  await service.connect('gmail');
  assert.equal(provider.state.revocations, 1); assert.equal(provider.state.pkceVerified, 2);
  const order = provider.state.requests.map(request => request.path).filter(route => /\/(authorize|revoke)$/.test(route));
  assert.deepEqual(order, ['/google/authorize', '/google/revoke', '/google/authorize']);
  const next = (await store.connections())[0]; assert.notEqual(next.id, previous.id);
  assert.equal((await store.connections()).length, 1); assert.equal((await service.preview('gmail', {}, 'connected')).items.length, 2);
  await assert.rejects(fs.access(path.join(store.root, 'secrets', previous.id)), { code: 'ENOENT' });
  await service.shutdown(); assert.equal(service.busy, false);
});
test('every card previews real sample adapter data and saves only after Use this', async t => {
  const { service, store } = await setup(t);
  assert.equal((await service.list()).length, 7);
  for (const card of connectorCatalog) {
    const preview = await service.preview(card.kind, {});
    assert.equal((await service.list()).find(entry => entry.kind === card.kind).connection, undefined);
    assert.equal(preview.sample, true); assert.equal(preview.items.length, 2);
    assert.equal(preview.digest, snapshotDigest(preview));
    await service.use(preview.id, preview.digest);
    assert.deepEqual(await store.read(preview.id), preview);
    assert.equal((await service.list()).find(entry => entry.kind === card.kind).connection.count, 2);
  }
  assert.equal((await store.list()).length, 7);
});
test('banner item is absent, contact details are hidden and email instructions stay literal data', async t => {
  const { service, store } = await setup(t), preview = await saved(service);
  assert.equal(preview.excluded, 1); assert.equal(preview.redacted, 1);
  const bytes = (await allBytes(store.root)).toString();
  for (const value of ['mail-marked', 'Synthetic banner check', 'training.desk@example.invalid', '202-555-0147']) assert.equal(bytes.includes(value), false, value);
  assert.match(bytes, /ignore previous instructions/);
  assert.match(bytes, /\[sender hidden\]/); assert.match(bytes, /\[phone hidden\]/);
  assert.equal(JSON.stringify(await service.preview('google-drive', {})).includes('000-12-3456'), false);
});
test('sample banner is checked before redaction or size truncation in every text field', async () => {
  const rows = await sampleAdapter('gmail').fetch({}, { signal: new AbortController().signal, maxItems: 100, maxBytes: 512_000 });
  const marked = rows.find(row => row.id === 'mail-marked');
  assert.ok(marked); assert.equal(hasMarking(marked), true);
  assert.equal(sanitizeItems([{ ...marked, body: 'x'.repeat(600_000) + '\n' + marked.body }]).excluded, 1);
  for (const field of ['title', 'from', 'sourceUrl']) assert.equal(sanitizeItems([{ ...item('Synthetic training'), [field]: marked.body }]).excluded, 1);
  assert.equal(hasMarking(item('A training note discusses markings such as CUI in prose.')), false);
});
test('ordinary lowercase parentheses remain data alongside the existing synthetic banner', async () => {
  const rows = await sampleAdapter('gmail').fetch({}, { signal: new AbortController().signal, maxItems: 100, maxBytes: 512_000 });
  const marked = rows.find(row => row.id === 'mail-marked');
  assert.ok(marked);
  const ordinary = ['file(s)', '(c) 2024', '(s) synthetic example', '(ts) sample'];
  for (const body of ordinary) assert.equal(hasMarking({ ...marked, body }), false, body);
  const clean = sanitizeItems([...ordinary.map(body => ({ ...marked, body })), marked]);
  assert.equal(clean.excluded, 1); assert.equal(clean.items.length, ordinary.length);
  assert.deepEqual(clean.items.map(row => row.body), ordinary);
});
test('sanitizer drops provider extras and links and respects UTF-8 byte and count limits', () => {
  const sentinel = 'synthetic-private-value-' + randomUUID();
  const clean = sanitizeItems([{ ...item('Training'), id: sentinel, sourceUrl: 'https://example.invalid/?key=' + sentinel, token: sentinel }]);
  assert.equal(JSON.stringify(clean).includes(sentinel), false);
  const limited = sanitizeItems([item('a'.repeat(50)), item('船'.repeat(100)), item('b')], 2, 240);
  assert.equal(limited.items.length, 2); assert.equal(limited.limited, 1);
  assert.ok(Buffer.byteLength(JSON.stringify(limited.items)) <= 240);
  assert.equal(sanitizeItems([item('a'), item('b')], 1).items.length, 1);
  assert.throws(() => sanitizeItems([{ title: 'bad', body: 2 }]), /unreadable/);
});
test('search works and stale, cancelled or modified approvals cannot be saved', async t => {
  const { service, store } = await setup(t);
  const old = await service.preview('gmail', {}), current = await service.preview('gmail', { query: 'harbor' });
  assert.equal(current.items.length, 1);
  await assert.rejects(service.use(old.id, old.digest), /expired/);
  await assert.rejects(service.use(current.id, '0'.repeat(64)), /expired/);
  await service.cancel('gmail'); await assert.rejects(service.use(current.id, current.digest), /expired/);
  assert.equal((await store.list()).length, 0);
  await assert.rejects(service.preview('gmail', { sinceDays: -1 }), /choices/);
  await assert.rejects(service.preview('not-a-source', {}), /not available/);
});
test('caller preview mutation cannot change what Use this persists', async t => {
  const { service, store } = await setup(t), preview = await service.preview('gmail', {});
  preview.items[0].body = 'Caller mutation'; await service.use(preview.id, preview.digest);
  assert.notEqual((await store.read(preview.id)).items[0].body, 'Caller mutation');
});
test('immediate cancellation and shutdown cannot leave a usable preview', async t => {
  const { service, store } = await setup(t);
  const pending = service.preview('gmail', {}); await service.cancel('gmail');
  await assert.rejects(pending, /could not be prepared/);
  const next = service.preview('google-drive', {}); await service.shutdown();
  await assert.rejects(next, /could not be prepared/);
  assert.deepEqual(await store.list(), []);
});
test('a newer concurrent preview cancels the previous preview', async t => {
  const { service, store } = await setup(t);
  const first = service.preview('gmail', {}), second = service.preview('gmail', { query: 'harbor' });
  await assert.rejects(first, /could not be prepared/);
  const current = await second; assert.equal(current.items.length, 1);
  await service.use(current.id, current.digest); assert.equal((await store.list()).length, 1);
});
test('registered adapters cannot enable real accounts in the event profile', async t => {
  const { service } = await setup(t); let called = false;
  service.register({ ...sampleAdapter('gmail'), connect: async () => { called = true; throw Error('must not connect'); }, fetch: async () => { called = true; throw Error('must not fetch'); } });
  assert.equal((await service.list())[0].available, false); await saved(service); assert.equal(called, false);
});
test('replacement keeps one source and disconnect removes snapshots and encrypted secrets', async t => {
  const { service, store } = await setup(t), first = await saved(service), next = await saved(service);
  assert.equal((await store.list()).length, 1); await assert.rejects(store.read(first.id));
  await store.secrets(next.id).set('access', 'synthetic-' + randomUUID()); await service.disconnect(next.id);
  assert.equal((await store.list()).length, 0); assert.equal(await store.secrets(next.id).get('access'), undefined);
});
test('encrypted secrets survive reopening and never appear in disk plaintext or summaries', async t => {
  const crypto = encryption(), { root, service, store } = await setup(t, crypto), snapshot = await saved(service);
  const sentinel = 'synthetic-secret-' + randomUUID(); await store.secrets(snapshot.id).set('access', sentinel);
  assert.equal(await new ConnectorStore(store.root, crypto).secrets(snapshot.id).get('access'), sentinel);
  assert.equal((await allBytes(root)).includes(Buffer.from(sentinel)), false);
  assert.equal(JSON.stringify(await service.list()).includes(sentinel), false);
  await store.secrets(snapshot.id).remove('access'); assert.equal(await store.secrets(snapshot.id).get('access'), undefined);
});
test('unavailable or basic-text encryption fails closed and encryption exceptions hide values', async t => {
  const { store } = await setup(t, { ...encryption(), isEncryptionAvailable: () => false }), id = randomUUID();
  await assert.rejects(store.secrets(id).set('access', 'synthetic'), /Secure storage/);
  const weak = new ConnectorStore(store.root, { ...encryption(), getSelectedStorageBackend: () => 'basic_text' });
  await assert.rejects(weak.secrets(id).set('access', 'synthetic'), /Secure storage/);
  const sentinel = 'synthetic-error-' + randomUUID();
  const broken = new ConnectorStore(store.root, { ...encryption(), encryptString: () => { throw Error(sentinel); } });
  await assert.rejects(broken.secrets(id).set('access', sentinel), error => !error.message.includes(sentinel) && /securely/.test(error.message));
  assert.throws(() => store.secrets('../escape'), /not available/);
});
test('IPC summaries omit items and never forward storage errors', async t => {
  const { service, store } = await setup(t), routes = new Map(); registerConnectorIPC((name, fn) => routes.set(name, fn), service);
  assert.equal(routes.size, 8);
  assert.deepEqual([...routes.keys()].sort(), ['answer', 'cancel', 'connect', 'disconnect', 'list', 'preview', 'progress', 'use'].map(name => 'fleet:connectors:' + name));
  await saved(service);
  assert.equal('items' in (await routes.get('fleet:connectors:list')())[0].connection, false);
  const sentinel = 'synthetic-parser-error-' + randomUUID(), snapshot = (await store.list())[0];
  await fs.writeFile(path.join(store.root, 'snapshots', snapshot.id + '.json'), sentinel);
  await assert.rejects(routes.get('fleet:connectors:list')(), error => !error.message.includes(sentinel) && /Try sample data/.test(error.message));
});
test('approved samples survive restart without keychain or provider access', async t => {
  const { service, store } = await setup(t), snapshot = await saved(service);
  const restarted = new ConnectorService(new ConnectorStore(store.root, { ...encryption(), isEncryptionAvailable: () => false }));
  await restarted.init(); assert.equal((await restarted.list())[0].connection.digest, snapshot.digest);
});
test('real context files list all items and preserve untrusted instructions as data', async t => {
  const { service, store, workspace } = await setup(t);
  const snapshots = await Promise.all(['gmail', 'google-calendar', 'google-drive', 'custom-api'].map(kind => saved(service, kind)));
  const result = await writeConnectedContext(store, workspace, snapshots.map(choice), new AbortController().signal);
  assert.match(result.requirements, /## Connected data/); assert.match(result.activity, /Gmail/);
  const readme = await fs.readFile(path.join(workspace, 'context/README.md'), 'utf8');
  assert.match(readme, /UNTRUSTED DATA/); assert.match(readme, /never instructions/);
  for (const snapshot of snapshots) {
    const actual = JSON.parse(await fs.readFile(path.join(workspace, 'context', snapshot.id + '.json'), 'utf8'));
    assert.deepEqual(actual.items, snapshot.items);
    for (const entry of snapshot.items) assert.ok(readme.includes(entry.title));
  }
  assert.match((await allBytes(workspace)).toString(), /ignore previous instructions/); await assertContext(workspace, result.hash);
  await fs.appendFile(path.join(workspace, 'context', snapshots[0].id + '.json'), '\nChanged');
  await assert.rejects(assertContext(workspace, result.hash), /changed/);
});
test('context detects extra files, missing files and symlink replacements', async t => {
  const { service, store, workspace, root } = await setup(t), snapshot = await saved(service);
  const result = await writeConnectedContext(store, workspace, [choice(snapshot)], new AbortController().signal);
  const extra = path.join(workspace, 'context/extra.txt'); await fs.writeFile(extra, 'synthetic extra');
  await assert.rejects(assertContext(workspace, result.hash), /changed/); await fs.rm(extra);
  const target = path.join(workspace, 'context', snapshot.id + '.json'), outside = path.join(root, 'outside.json');
  await fs.copyFile(target, outside); await fs.rm(target); await assert.rejects(assertContext(workspace, result.hash), /changed/);
  await fs.symlink(outside, target); await assert.rejects(assertContext(workspace, result.hash), /changed/);
});
test('changed data changes brief identity and selections validate at the shared boundary', async t => {
  const { service } = await setup(t), snapshot = await saved(service);
  const brief = { title: 'Synthetic training', description: 'Build a schedule from synthetic training data.', criteria: [], connectedData: [choice(snapshot)] };
  assert.deepEqual(normalizeProjectInput(brief).connectedData, brief.connectedData);
  const changed = await service.preview('gmail', { query: 'harbor' });
  assert.notEqual(briefHash(brief), briefHash({ ...brief, connectedData: [choice(changed)] }));
  assert.notEqual(briefHash(brief), briefHash({ ...brief, connectedData: [] }));
  assert.throws(() => validateSelections([choice(snapshot), choice(snapshot)]), /not valid/);
  assert.throws(() => normalizeProjectInput({ ...brief, connectedData: [{ ...choice(snapshot), includeInApp: 'yes' }] }), /not valid/);
});
test('changed, disconnected and real-account snapshots fail before workspace writes', async t => {
  const { service, store, workspace } = await setup(t), snapshot = await saved(service);
  await assert.rejects(writeConnectedContext(store, workspace, [{ ...choice(snapshot), digest: '0'.repeat(64) }], new AbortController().signal), /changed/);
  const real = { ...snapshot, sample: false }; real.digest = snapshotDigest(real); await store.save(real);
  await assert.rejects(writeConnectedContext(store, workspace, [choice(real)], new AbortController().signal), /Real account data/);
  await service.disconnect(real.id);
  await assert.rejects(writeConnectedContext(store, workspace, [choice(real)], new AbortController().signal), /no longer available/);
  assert.deepEqual(await fs.readdir(workspace), []);
});
test('Stop before preparation and during a saved read leaves no context', async t => {
  const { service, store, workspace } = await setup(t), snapshot = await saved(service), controller = new AbortController();
  controller.abort(); await assert.rejects(writeConnectedContext(store, workspace, [choice(snapshot)], controller.signal), { name: 'AbortError' });
  const during = new AbortController(), read = store.read.bind(store);
  store.read = async id => { const value = await read(id); during.abort(); return value; };
  await assert.rejects(writeConnectedContext(store, workspace, [choice(snapshot)], during.signal), { name: 'AbortError' });
  assert.deepEqual(await fs.readdir(workspace), []);
});
test('real export copier preserves sample context and verification hash', async t => {
  const { service, store, workspace, root } = await setup(t), snapshot = await saved(service);
  await writeConnectedContext(store, workspace, [choice(snapshot)], new AbortController().signal);
  await fs.writeFile(path.join(workspace, 'index.html'), '<h1>Synthetic training app</h1>');
  const parent = path.join(root, 'exports'); await fs.mkdir(parent); const verifiedHash = await sourceHash(workspace);
  const exported = await exportVerifiedBundle({ workspace, parent, title: 'Training', verifiedHash, deliveryMarkdown: 'Synthetic sample export.' });
  assert.equal(await sourceHash(exported), verifiedHash);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(exported, 'context', snapshot.id + '.json'), 'utf8')).items, snapshot.items);
});
