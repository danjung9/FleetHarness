import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
// The new connector has no host import until the separate core writer integrates it.
// Node's native type stripping executes the production source without a fake transport.
import { CustomApiConnector, classifyDataServiceAddress, DATA_SERVICE_SECRET_NAMES, readableLabel } from '../electron/connectors/custom-api.ts';
import { createAppYardConnectors } from '../skills/fleet-delivery/appyard-connectors.js';
import { startDataServiceServer } from './fixtures/data-service-server.mjs';

const freshKey = () => `synthetic-data-service-${randomUUID()}`;
function secretStore() {
  const values = new Map();
  return {
    async get(name) { return values.get(name); },
    async set(name, value) { values.set(name, value); },
    async remove(name) { values.delete(name); },
    size() { return values.size; },
  };
}
function connectUi(answers = {}) {
  const questions = [];
  return {
    questions,
    async ask(question) { questions.push(question); return answers[question.id] ?? (question.id === 'internal-address' ? 'yes' : ''); },
    async openBrowser() { assert.fail('A data service must not open a sign-in page'); },
    showCode() { assert.fail('A data service must not request a device code'); },
  };
}
const fetchOptions = extra => ({ signal: new AbortController().signal, maxItems: 100, maxBytes: 100_000, ...extra });
async function fixture(t, serverOptions = {}, connectorOptions = {}, answers = {}) {
  const server = await startDataServiceServer(serverOptions);
  t.after(() => server.close());
  const connector = new CustomApiConnector({ address: `${server.origin}/ships`, ...connectorOptions });
  const secrets = secretStore(); const ui = connectUi(answers);
  return { server, connector, secrets, ui, connect: () => connector.connect(secrets, ui, new AbortController().signal) };
}
function plainFailure(error) {
  assert.equal(typeof error.message, 'string');
  assert.equal(error.message.split('. ').length, 2, 'A failure must have one explanation and one next step');
  assert.equal(/https?:|stack|ECONN|ETIMEDOUT/i.test(error.message), false, 'Public failures must omit transport details');
  return true;
}
function noSecret(value, ...hidden) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of hidden) assert.equal(text.includes(secret), false, 'A private value must not appear in public data');
}

test('discovers OpenAPI from a documentation link and makes one data test request', async t => {
  const f = await fixture(t, { description: 'openapi' });
  const connector = new CustomApiConnector({ address: `${f.server.origin}/docs` });
  assert.equal(connector.kind, 'custom-api');
  assert.equal(connector.available(), true);
  assert.deepEqual(await connector.connect(f.secrets, f.ui, new AbortController().signal), { accountLabel: 'Ships' });
  assert.equal(connector.preview.summary, 'Ships (2 records).');
  assert.deepEqual(connector.preview.labels, ['Ship name', 'Work Order Count']);
  assert.deepEqual(connector.preview.rows[0], { 'Ship name': 'Sample Harbor', 'Work Order Count': 2 });
  assert.equal(f.server.requests.filter(r => r.path === '/ships').length, 1);
  assert.deepEqual(f.ui.questions.map(q => q.id), ['internal-address']);
  assert.equal(f.server.requests.every(r => r.method === 'GET'), true);
});

test('tries the supplied address without a description and uses real hostname resolution', async t => {
  const f = await fixture(t);
  const connector = new CustomApiConnector({ address: f.server.origin.replace('127.0.0.1', 'localhost') + '/ships' });
  await connector.connect(f.secrets, f.ui, new AbortController().signal);
  const items = await connector.fetch(f.secrets, fetchOptions());
  assert.equal(items.length, 2);
  assert.equal(items[0].kind, 'record');
  assert.deepEqual(JSON.parse(items[1].body), { 'Ship name': 'Sample Bay', 'Work Order Count': 4 });
  assert.equal(f.ui.questions.filter(q => q.secret).length, 0);
  assert.equal(f.server.requests.every(r => r.method === 'GET'), true);
});

test('a description at a custom path is discovered rather than reported as a data record', async t => {
  const f = await fixture(t, { description: 'custom-path' });
  const connector = new CustomApiConnector({ address: `${f.server.origin}/specification` });
  await connector.connect(f.secrets, f.ui, new AbortController().signal);
  assert.equal(connector.preview.summary, 'Ships (2 records).');
  assert.equal((await connector.fetch(f.secrets, fetchOptions())).length, 2);
  assert.equal(f.server.requests.filter(r => r.path === '/specification').length, 1);
});

test('a named collection wrapper becomes rows instead of a nested single record', async t => {
  const f = await fixture(t, { mode: 'named-wrapper' }); await f.connect();
  assert.equal(f.connector.preview.count, 2);
  assert.equal((await f.connector.fetch(f.secrets, fetchOptions())).length, 2);
});

test('a supplied collection and its filters take precedence over the first collection in the description', async t => {
  const f = await fixture(t, { description: 'openapi', mode: 'multiple' });
  const connector = new CustomApiConnector({ address: `${f.server.origin}/work-orders?page=4` });
  await connector.connect(f.secrets, f.ui, new AbortController().signal);
  assert.equal(connector.preview.summary, 'Work orders (1 records).');
  assert.equal(connector.preview.rows[0]['Requested page'], '4');
  assert.equal(f.server.requests.some(r => r.path === '/ships'), false);
  // Recreating the adapter proves the connection is retained by SecretStore.
  const items = await new CustomApiConnector().fetch(f.secrets, fetchOptions());
  assert.equal(JSON.parse(items[0].body)['Work order'], 'Synthetic work order');
});

for (const description of ['none', 'openapi', 'swagger']) {
  for (const mode of ['header', 'bearer', 'basic']) {
    test(`${description} description: asks only for ${mode} credentials and reads records`, async t => {
      const key = freshKey(); const password = freshKey();
      const f = await fixture(t, { mode, description, key, password }, {}, { key, token: key, username: 'sample-reader', password });
      const result = await f.connect();
      assert.equal((await f.connector.fetch(f.secrets, fetchOptions())).length, 2);
      assert.deepEqual(f.ui.questions.filter(q => q.secret).map(q => q.id), mode === 'basic' ? ['username', 'password'] : [mode === 'header' ? 'key' : 'token']);
      assert.equal(f.server.requests.filter(r => r.path === '/ships').length, description === 'none' ? 3 : 2);
      noSecret([result, f.connector.preview, f.connector.plainSummary, f.ui.questions, await f.secrets.get(DATA_SERVICE_SECRET_NAMES.connection)], key, password);
      assert.equal(f.server.requests.every(r => r.method === 'GET'), true);
    });
  }
}

test('wrong key has a plain failure and does not leave a connected account or a saved key', async t => {
  const key = freshKey(); const wrong = freshKey();
  const f = await fixture(t, { mode: 'header', description: 'openapi', key }, {}, { key: wrong });
  await assert.rejects(f.connect(), error => { plainFailure(error); noSecret(error.message, key, wrong); assert.match(error.message, /did not accept/); return true; });
  assert.equal(f.secrets.size(), 0);
  assert.equal(f.connector.preview, undefined);
  await assert.rejects(f.connector.fetch(f.secrets, fetchOptions()), /not connected/);
});

test('a distinctive echoed key stays out of summaries, errors, field names, nested values and returned items', async t => {
  const key = freshKey();
  const f = await fixture(t, { mode: 'header', key }, { }, { key });
  const connector = new CustomApiConnector({ address: `${f.server.origin}/echo` });
  const result = await connector.connect(f.secrets, f.ui, new AbortController().signal);
  const items = await connector.fetch(f.secrets, fetchOptions());
  noSecret([result, connector.preview, connector.plainSummary, items, f.ui.questions, await f.secrets.get(DATA_SERVICE_SECRET_NAMES.connection)], key, encodeURIComponent(key), Buffer.from(key).toString('base64'));
  assert.equal(JSON.stringify(items).includes('[Hidden]'), true);
  f.server.setMode('rate-limit');
  await assert.rejects(connector.fetch(f.secrets, fetchOptions()), error => { plainFailure(error); noSecret(error.message, key); return true; });
});

test('basic sign-in echoes are hidden in both preview and fetched rows', async t => {
  const username = 'synthetic-reader'; const password = freshKey();
  const f = await fixture(t, { mode: 'basic', username, password }, {}, { username, password });
  const connector = new CustomApiConnector({ address: `${f.server.origin}/echo` });
  await connector.connect(f.secrets, f.ui, new AbortController().signal);
  const items = await connector.fetch(f.secrets, fetchOptions());
  noSecret([connector.preview, connector.plainSummary, items], username, password, Buffer.from(`${username}:${password}`).toString('base64'));
});

for (const mode of ['wrapped', 'links', 'cursor']) {
  test(`reads ${mode} pagination and honors the record and byte limits`, async t => {
    const f = await fixture(t, { mode }); await f.connect();
    const rows = await f.connector.fetch(f.secrets, fetchOptions());
    assert.equal(rows.length, 2);
    assert.equal(JSON.parse(rows[1].body)['Ship name'], 'Sample Bay');
    assert.equal(new Set(rows.map(r => r.id)).size, 2);
    assert.equal((await f.connector.fetch(f.secrets, fetchOptions({ maxItems: 1 }))).length, 1);
    const firstBytes = Buffer.byteLength(JSON.stringify(rows[0]));
    const bounded = await f.connector.fetch(f.secrets, fetchOptions({ maxBytes: firstBytes }));
    assert.equal(bounded.length, 1);
    assert.equal(bounded.reduce((n, row) => n + Buffer.byteLength(JSON.stringify(row)), 0) <= firstBytes, true);
  });
}

test('CSV quotes, commas and line breaks remain readable', async t => {
  const f = await fixture(t, { mode: 'csv' }); await f.connect();
  const items = await f.connector.fetch(f.secrets, fetchOptions());
  assert.equal(items.length, 2);
  assert.equal(JSON.parse(items[0].body).Notes, 'A comma, and a "quote"');
  assert.equal(JSON.parse(items[1].body).Notes, 'Two\nlines');
});

for (const [mode, pattern] of [['html', /web page/], ['slow', /too long/], ['large', /too much/], ['large-header', /too much/], ['metadata', /reserved/], ['metadata-v6', /reserved/], ['malformed-csv', /readable/], ['malformed-json', /readable/], ['unknown-auth', /did not describe/], ['rate-limit', /busy/], ['redirect-loop', /too many/]]) {
  test(`${mode} fails safely through the actual HTTP request path`, async t => {
    const f = await fixture(t, { mode }, { limits: { timeoutMs: mode === 'slow' ? 100 : 2_000, maxResponseBytes: 4_096 } });
    const started = Date.now();
    await assert.rejects(f.connect(), error => { plainFailure(error); assert.match(error.message, pattern); return true; });
    if (mode === 'slow') assert.equal(Date.now() - started < 900, true, 'The deadline must interrupt the actual request');
    assert.equal(f.connector.preview, undefined);
    assert.equal(f.secrets.size(), 0);
    assert.equal(f.server.requests.every(r => r.method === 'GET'), true);
  });
}

test('same-origin redirects remain GET requests', async t => {
  const f = await fixture(t, { mode: 'redirect' }); await f.connect();
  assert.equal((await f.connector.fetch(f.secrets, fetchOptions())).length, 2);
  assert.equal(f.server.requests.some(r => r.path === '/records'), true);
  assert.equal(f.server.requests.every(r => r.method === 'GET'), true);
});

test('pagination never visits a metadata address or follows a cycle forever', async t => {
  const f = await fixture(t, { mode: 'pagination-metadata' }); await f.connect();
  await assert.rejects(f.connector.fetch(f.secrets, fetchOptions()), /different address|reserved/);
  f.server.setMode('cycle');
  const before = f.server.requests.length;
  assert.equal((await f.connector.fetch(f.secrets, fetchOptions())).length, 2);
  assert.equal(f.server.requests.length - before, 1);
});

test('a declined internal address is never requested', async t => {
  const f = await fixture(t, {}, {}, { 'internal-address': 'no' });
  await assert.rejects(f.connect(), /permission/);
  assert.equal(f.server.requests.length, 0);
});

test('metadata, mapped metadata and link-local addresses are always blocked', async () => {
  for (const address of ['169.254.169.254', '169.254.1.1', '100.100.100.200', '168.63.129.16', '::ffff:169.254.169.254', '::ffff:a9fe:a9fe', 'fe80::1', 'fd00:ec2::254', '64:ff9b::a9fe:a9fe']) {
    assert.equal(classifyDataServiceAddress(address), 'blocked', address);
    const connector = new CustomApiConnector({ address: `http://${address.includes(':') ? `[${address}]` : address}/` });
    const ui = connectUi();
    await assert.rejects(connector.connect(secretStore(), ui, new AbortController().signal), error => { plainFailure(error); return true; });
    assert.equal(ui.questions.length, 0);
  }
  assert.equal(classifyDataServiceAddress('::1'), 'internal');
  assert.equal(classifyDataServiceAddress('10.0.0.1'), 'internal');
  assert.equal(classifyDataServiceAddress('2606:4700::1111'), 'public');
});

test('URL credentials and key query parameters are rejected without echoing them', async () => {
  const key = freshKey();
  for (const address of [`https://reader:${key}@example.invalid/records`, `https://example.invalid/records?api_key=${key}`, 'file:///records', 'not an address']) {
    const connector = new CustomApiConnector({ address });
    await assert.rejects(connector.connect(secretStore(), connectUi(), new AbortController().signal), error => { plainFailure(error); noSecret(error.message, key); return true; });
  }
});

test('abort stops an active HTTP read and disconnect removes all stored connection values', async t => {
  const f = await fixture(t); await f.connect();
  f.server.setMode('slow');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50);
  try { await assert.rejects(f.connector.fetch(f.secrets, fetchOptions({ signal: controller.signal })), /stopped/); }
  finally { clearTimeout(timer); }
  await f.connector.disconnect(f.secrets);
  assert.equal(f.secrets.size(), 0);
  assert.equal(f.connector.preview, undefined);
  await assert.rejects(f.connector.fetch(f.secrets, fetchOptions()), /not connected/);
});

test('Stop also cancels while a person is entering the address or a key', async t => {
  const f = await fixture(t, { mode: 'bearer' });
  for (const stage of ['address', 'token']) {
    const controller = new AbortController();
    let reached;
    const waiting = new Promise(resolve => { reached = resolve; });
    const ui = connectUi();
    const original = ui.ask;
    ui.ask = question => question.id === stage ? (reached(), new Promise(() => {})) : original(question);
    const connector = new CustomApiConnector(stage === 'address' ? {} : { address: `${f.server.origin}/ships` });
    const connected = connector.connect(secretStore(), ui, controller.signal);
    await waiting;
    controller.abort();
    await assert.rejects(connected, /stopped/);
    assert.equal(connector.preview, undefined);
  }
});

test('cancellation during a save cannot report a successful connection', async t => {
  const f = await fixture(t); const controller = new AbortController();
  const original = f.secrets.set;
  f.secrets.set = async (name, value) => {
    await original(name, value);
    if (name === DATA_SERVICE_SECRET_NAMES.connection) controller.abort();
  };
  await assert.rejects(f.connector.connect(f.secrets, f.ui, controller.signal), /stopped/);
  assert.equal(f.secrets.size(), 0);
  assert.equal(f.connector.preview, undefined);
});

test('a person can take longer than the network deadline to enter a key', async t => {
  const key = freshKey();
  const f = await fixture(t, { mode: 'header', key, description: 'openapi' }, { limits: { timeoutMs: 100 } });
  const original = f.ui.ask;
  f.ui.ask = question => question.id === 'key' ? new Promise(resolve => setTimeout(() => resolve(key), 150)) : original(question);
  await f.connect();
  assert.equal(f.connector.preview.count, 2);
});

test('record and page limits cannot exceed their production ceiling', async t => {
  const f = await fixture(t, { mode: 'wrapped' }, { limits: { maxPages: 1 } }); await f.connect();
  assert.equal((await f.connector.fetch(f.secrets, fetchOptions())).length, 1);
  const before = f.server.requests.length;
  assert.deepEqual(await f.connector.fetch(f.secrets, fetchOptions({ maxItems: 0 })), []);
  assert.equal(f.server.requests.length, before);
});

test('field labels separate camel case, acronyms and separators', () => {
  assert.equal(readableLabel('ship_name'), 'Ship name');
  assert.equal(readableLabel('workOrderCount'), 'Work Order Count');
  assert.equal(readableLabel('HTTP_status-code'), 'HTTP status code');
});

// Config is a data URL to keep helper tests independent of file-serving or a GUI.
// Service reads still use the real fetch implementation and the real HTTP fixture.
const configUrl = services => 'data:application/json,' + encodeURIComponent(JSON.stringify({ version: 1, services }));
function browserStorage() {
  const values = new Map();
  return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), size: () => values.size };
}

test('delivered helper reads the configured address and retains its key only in this browser session', async t => {
  const key = freshKey(); const f = await fixture(t, { mode: 'header', key });
  const storage = browserStorage(); const ui = connectUi({ key });
  const helper = createAppYardConnectors({ configUrl: configUrl([{ id: 'ships', url: `${f.server.origin}/echo`, auth: { type: 'header', name: 'X-Fleet-Key' }, sample: [{ ship_name: 'Frozen sample' }] }]), ask: ui.ask, storage });
  const first = await helper.read('ships');
  assert.equal(first.source, 'live');
  assert.equal(first.rows.length, 1);
  noSecret(first, key);
  assert.equal(storage.size(), 1);
  assert.equal((await helper.read('ships')).source, 'live');
  assert.equal(ui.questions.filter(q => q.id === 'key').length, 1);
  helper.disconnect('ships');
  assert.equal(storage.size(), 0);
  assert.equal((await helper.read('ships')).source, 'live');
  assert.equal(ui.questions.filter(q => q.id === 'key').length, 2);
  assert.equal(f.server.requests.every(r => r.method === 'GET'), true);
});

for (const mode of ['wrapped', 'csv', 'links', 'cursor', 'named-wrapper']) {
  test(`delivered helper handles ${mode} data through real fetch`, async t => {
    const f = await fixture(t, { mode });
    const helper = createAppYardConnectors({ configUrl: configUrl([{ id: 'ships', url: `${f.server.origin}/ships`, sample: [] }]), ask: connectUi().ask });
    const result = await helper.read('ships');
    assert.equal(result.source, 'live');
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[1].ship_name, 'Sample Bay');
  });
}

for (const mode of ['html', 'metadata', 'metadata-v6', 'redirect', 'malformed-json']) {
  test(`delivered helper falls back to a frozen sample for ${mode}`, async t => {
    const f = await fixture(t, { mode });
    const sample = [{ ship_name: 'Frozen sample' }];
    const helper = createAppYardConnectors({ configUrl: configUrl([{ id: 'ships', url: `${f.server.origin}/ships`, sample }]), ask: connectUi().ask });
    const result = await helper.read('ships');
    assert.equal(result.source, 'sample');
    assert.deepEqual(result.rows, sample);
    assert.equal(result.message.split('. ').length, 2);
    assert.equal(f.server.requests.length, 1, 'No redirect destination may be fetched');
  });
}

test('delivered helper rejects unknown DNS answers and direct metadata without requesting a key', async () => {
  for (const url of ['https://example.invalid/ships', 'http://169.254.169.254/ships', 'http://[fd00:ec2::254]/ships']) {
    const ui = connectUi({ key: freshKey() });
    const helper = createAppYardConnectors({ configUrl: configUrl([{ id: 'ships', url, auth: { type: 'bearer' }, sample: [{ value: 1 }] }]), ask: ui.ask });
    assert.equal((await helper.read('ships')).source, 'sample');
    assert.equal(ui.questions.length, 0);
  }
});

test('delivered helper rejects a wrong key without retaining it or exposing it', async t => {
  const key = freshKey(); const wrong = freshKey(); const f = await fixture(t, { mode: 'header', key });
  const storage = browserStorage();
  const helper = createAppYardConnectors({ configUrl: configUrl([{ id: 'ships', url: `${f.server.origin}/ships`, auth: { type: 'header', name: 'X-Fleet-Key' }, sample: [] }]), ask: connectUi({ key: wrong }).ask, storage });
  const result = await helper.read('ships');
  assert.equal(result.source, 'sample');
  assert.match(result.message, /did not accept/);
  assert.equal(storage.size(), 0);
  noSecret(result, key, wrong);
});

test('delivered helper can stop while the key question is still open', async t => {
  const f = await fixture(t, { mode: 'bearer', key: freshKey() });
  const controller = new AbortController();
  let reached; const waiting = new Promise(resolve => { reached = resolve; });
  const helper = createAppYardConnectors({
    configUrl: configUrl([{ id: 'ships', url: `${f.server.origin}/ships`, auth: { type: 'bearer' }, sample: [{ value: 'saved' }] }]),
    ask: question => question.id === 'key' ? (reached(), new Promise(() => {})) : Promise.resolve('yes'),
  });
  const result = helper.read('ships', { signal: controller.signal });
  await waiting; controller.abort();
  assert.equal((await result).source, 'sample');
  assert.equal(f.server.requests.length, 0);
});
