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
const item = body => ({ id: 'synthetic', title: 'Synthetic training', kind: 'file', body });
async function allBytes(root) {
  const output = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    output.push(entry.isDirectory() ? await allBytes(file) : await fs.readFile(file));
  }
  return Buffer.concat(output);
}

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
  assert.equal(routes.size, 5); await saved(service);
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
