import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { startConnectorServers } from './fixtures/connector-servers.mjs';
import { startDataServiceServer } from './fixtures/data-service-server.mjs';

// Compile production sources independently so this test also runs on a clean clone.
execFileSync(process.execPath, [fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)),
  '--ignoreConfig', '--target', 'ES2023', '--module', 'NodeNext', '--moduleResolution', 'NodeNext',
  '--strict', '--skipLibCheck', '--types', 'node', '--rootDir', '.',
  '--outDir', 'dist-electron/connector-wording-tests', 'electron/connectors/index.ts'],
{ cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'pipe' });
const { ConnectorService, registerConnectorIPC } = await import('../dist-electron/connector-wording-tests/electron/connectors/index.js');
const { GmailConnector } = await import('../dist-electron/connector-wording-tests/electron/connectors/google.js');
const { OutlookConnector } = await import('../dist-electron/connector-wording-tests/electron/connectors/microsoft.js');
const { CustomApiConnector, DATA_SERVICE_SECRET_NAMES } = await import('../dist-electron/connector-wording-tests/electron/connectors/custom-api.js');
process.env.NODE_ENV = 'test';

function wording(message) {
  // Design.md uses one explanation followed by one next-step sentence.
  assert.match(message, /^[A-Z][^.!?\n]+\. [A-Z][^.!?\n]+\.$/, 'Use one explanation and one next-step sentence');
  const next = message.split('. ')[1];
  assert.match(next, /^(?:Ask|Check|Choose|Confirm|Connect|Correct|Exclude|Open|Paste|Refresh|Remove|Return|Start|Try|Unlock|Use|Wait)\b/, 'Give a concrete next step');
  assert.doesNotMatch(next, /\bor (?:ask|try|provide)\b/i, 'Give one next step rather than alternative actions');
  assert.doesNotMatch(message, /https?:|\b(?:JSON|CSV|OAuth|PKCE|client ID|tenant ID|account cloud|callback|header key|ECONN\w*|ETIMEDOUT|error_description)\b/i, 'Use plain words without provider or transport details');
}
function privateValuesAbsent(value, hidden) {
  const text = JSON.stringify(value);
  for (const secret of hidden.filter(Boolean)) {
    for (const form of new Set([secret, encodeURIComponent(secret), Buffer.from(secret).toString('base64')])) {
      assert.equal(text.includes(form), false, 'Synthetic private values must not escape in errors');
    }
  }
}
async function failure(operation, expected, hidden = []) {
  let caught;
  try { await operation(); } catch (error) { caught = error; }
  assert.ok(caught instanceof Error, 'The failing path must reject, not succeed');
  privateValuesAbsent({ message: caught.message, stack: caught.stack, cause: caught.cause }, hidden);
  assert.match(caught.message, expected);
  wording(caught.message);
  return caught.message;
}
function secretStore() {
  const values = new Map();
  return { values, async get(name) { return values.get(name); }, async set(name, value) { values.set(name, value); }, async remove(name) { values.delete(name); } };
}
function memoryStore() {
  const connections = new Map(), snapshots = new Map(), secrets = new Map();
  return {
    assertEncryptionAvailable() {}, async init() {},
    async connections() { return [...connections.values()]; }, async list() { return [...snapshots.values()]; },
    async saveConnection(value) { connections.set(value.id, value); }, async save(value) { snapshots.set(value.id, value); },
    async read(id) { if (!snapshots.has(id)) throw new Error('Synthetic missing snapshot'); return snapshots.get(id); },
    async remove(id) { connections.delete(id); snapshots.delete(id); secrets.delete(id); },
    secrets(id) { if (!secrets.has(id)) secrets.set(id, secretStore()); return secrets.get(id); },
  };
}
function host(t, adapters = [], options = {}) {
  const store = memoryStore(), service = new ConnectorService(store, adapters, 1000, { allowConnections: true, ...options });
  t.after(() => service.shutdown());
  const routes = new Map(); registerConnectorIPC((name, work) => routes.set(name, work), service);
  return { store, service, call: (name, ...args) => routes.get(`fleet:connectors:${name}`)(...args) };
}
const fetchOptions = () => ({ maxItems: 10, maxBytes: 100_000, signal: new AbortController().signal });

const accountCases = [
  { name: 'admin approval required', initial: { authError: 'consent_required' }, connect: true, expected: /organization.*administrator/ },
  { name: 'expired sign-in', change: async ({ secrets, fixture }) => {
    const [key, raw] = [...secrets.values][0], value = JSON.parse(raw);
    value.expiresAt = 0; await secrets.set(key, JSON.stringify(value));
    fixture.state.tokenStatus = 400;
  }, expected: /sign-in has expired/ },
  { name: '401 after refresh', initial: { apiStatus: 401 }, expected: /sign-in has expired/, refreshes: 1 },
  { name: '403', initial: { apiStatus: 403 }, expected: /organization.*administrator/ },
  { name: '429 after retry', initial: { apiStatus: 429 }, expected: /too many requests/, requests: 2 },
  { name: 'slow service headers', initial: { slowMs: 500 }, expected: /too long/ },
  { name: 'slow service body', initial: { slowMs: 500, slowBody: true }, expected: /too long/ },
  { name: 'unreachable address', change: ({ fixture }) => fixture.close(), expected: /could not be reached/ },
  { name: 'no client ID', missing: true, connect: true, expected: /administrator/ },
  { name: 'unregistered account', initial: { tokenStatus: 400, tokenError: 'invalid_client' }, connect: true, expected: /not registered/ },
  { name: 'invalid provider data', initial: { malformed: true }, expected: /could not read/ },
  { name: 'service unavailable', initial: { apiStatus: 503 }, expected: /temporarily unavailable/ },
  { name: 'sign-in declined', initial: { authError: 'access_denied' }, connect: true, expected: /not approved/ },
  { name: 'permissions missing', initial: { grantedScope: 'unrelated' }, connect: true, expected: /required read-only access/ },
];
for (const [family, Adapter] of [['google', GmailConnector], ['microsoft', OutlookConnector]]) {
  for (const entry of accountCases) {
    test(`${family} wording: ${entry.name}`, async t => {
      const fixture = await startConnectorServers(entry.initial);
      let closed = false;
      const close = async () => { if (!closed) { closed = true; await fixture.close(); } };
      t.after(close);
      const adapter = new Adapter(entry.missing ? {} : { clientId: 'synthetic-client-id' }, { ...fixture[family], requestTimeoutMs: 150 });
      const secrets = secretStore(), ui = fixture.ui(), signal = new AbortController().signal;
      const context = { fixture: { ...fixture, close }, secrets };
      if (!entry.connect) await adapter.connect(secrets, ui, signal);
      await entry.change?.(context);
      const message = await failure(() => entry.connect ? adapter.connect(secrets, ui, signal) : adapter.fetch(secrets, fetchOptions()), entry.expected, [fixture.distinctive]);
      if (entry.refreshes !== undefined) assert.equal(fixture.state.refreshes, entry.refreshes);
      if (entry.requests !== undefined) assert.equal(fixture.state.requests.filter(r => r.path.includes(family === 'google' ? '/gmail/v1/' : '/v1.0/')).length, entry.requests);
      // Exercise the same failure through the real host and IPC serializer.
      const h = host(t, [adapter], { openBrowser: url => ui.openBrowser(url) });
      if (!entry.connect) await h.store.saveConnection({ id: 'synthetic-connection', kind: adapter.kind, sample: false });
      h.store.secrets = () => secrets;
      // A Microsoft connect asks the person to choose a cloud; the direct call above covers that path.
      if (!entry.connect || family === 'google' || entry.missing) {
        const hostMessage = await failure(() => entry.connect ? h.call('connect', adapter.kind) : h.call('preview', adapter.kind, {}, 'connected'), entry.expected, [fixture.distinctive]);
        if (!entry.missing) assert.equal(hostMessage, message);
        const progress = await h.call('progress', adapter.kind);
        if (progress.stage === 'failed') { assert.equal(progress.error, hostMessage); privateValuesAbsent(progress, [fixture.distinctive]); }
      }
    });
  }
}

function dataUi(answers = {}) {
  return { async ask(question) { return answers[question.id] ?? (question.id === 'internal-address' ? 'yes' : ''); },
    async openBrowser() { assert.fail('Data services do not open a browser'); }, showCode() { assert.fail('Data services do not show a code'); } };
}
const dataCases = [
  { name: 'refused internal address', answer: 'no', expected: /needs your permission/ },
  { name: 'blocked metadata address', address: 'http://169.254.169.254/', expected: /reserved/ },
  { name: 'address with credentials', address: (origin, hidden) => `http://reader:${hidden}@${new URL(origin).host}/ships`, expected: /cannot be used safely/ },
  { name: 'address with key', address: (origin, hidden) => `${origin}/ships?api_key=${hidden}`, expected: /cannot be used safely/ },
  { name: '401 with a rejected key', mode: 'bearer', answerKey: true, expected: /did not accept/ },
  { name: '429', mode: 'rate-limit', expected: /busy/ },
  { name: 'slow service', mode: 'slow', expected: /too long/ },
  { name: 'unreachable address', close: true, expected: /could not be reached/ },
  { name: 'unreadable data', mode: 'malformed-json', expected: /readable records/ },
  { name: 'unknown sign-in', mode: 'unknown-auth', expected: /did not describe/ },
  { name: 'web page', mode: 'html', expected: /web page/ },
  { name: 'too much data', mode: 'large-header', expected: /too much data/ },
  { name: 'redirect loop', mode: 'redirect-loop', expected: /too many requests/ },
];
for (const entry of dataCases) {
  test(`data-service wording: ${entry.name}`, async t => {
    // Keys are distinctive synthetic fixture values, never real credentials.
    const hidden = `SYNTHETIC_ONLY_${randomUUID()}`;
    const server = await startDataServiceServer({ key: hidden, mode: entry.mode });
    let closed = false;
    const close = async () => { if (!closed) { closed = true; await server.close(); } };
    t.after(close);
    if (entry.close) await close();
    const address = typeof entry.address === 'function' ? entry.address(server.origin, hidden) : entry.address ?? `${server.origin}/ships`;
    const adapter = new CustomApiConnector({ address, limits: { timeoutMs: 150 } });
    await failure(() => adapter.connect(secretStore(), dataUi({ 'internal-address': entry.answer ?? 'yes', token: entry.answerKey ? `${hidden}_wrong` : hidden }), new AbortController().signal), entry.expected, [hidden, address]);
    if (entry.name === 'refused internal address' || entry.name.startsWith('address with') || entry.name === 'blocked metadata address') assert.equal(server.requests.length, 0);
  });
}

for (const [name, state, expected] of [
  ['401', { apiStatus: 401 }, /did not accept/],
  ['403', { apiStatus: 403 }, /did not accept/],
  ['429', { apiStatus: 429 }, /busy/],
  ['slow service', { slowMs: 500 }, /too long/],
  ['unreadable records', { malformed: true }, /readable records/],
  ['service failure', { apiStatus: 503 }, /could not provide/],
]) {
  test(`custom API wording against connector servers: ${name}`, async t => {
    const fixture = await startConnectorServers(state); t.after(() => fixture.close());
    const account = new GmailConnector({ clientId: 'synthetic-client-id' }, fixture.google), accountSecrets = secretStore();
    await account.connect(accountSecrets, fixture.ui(), new AbortController().signal);
    const { accessToken } = JSON.parse([...accountSecrets.values.values()][0]);
    const secrets = secretStore();
    await secrets.set(DATA_SERVICE_SECRET_NAMES.connection, JSON.stringify({ version: 1, url: `${fixture.google.gmailBaseUrl}/users/me/messages`,
      label: 'Synthetic records', auth: { type: 'bearer' }, internalOrigins: [fixture.base] }));
    await secrets.set(DATA_SERVICE_SECRET_NAMES.credential, accessToken);
    await failure(() => new CustomApiConnector({ limits: { timeoutMs: 150 } }).fetch(secrets, fetchOptions()), expected, [fixture.distinctive, accessToken]);
  });
}

const serviceCases = [
  ['unavailable source', h => h.call('preview', 'missing-source'), /not available/],
  ['invalid filters', h => h.call('preview', 'gmail', { sinceDays: -1 }), /choices are not valid/],
  ['expired question', h => h.call('answer', 'gmail', 'expired', 'synthetic'), /question has expired/],
  ['no client ID', h => h.call('connect', 'gmail'), /not set up.*administrator/],
  ['not connected', h => h.call('preview', 'gmail', {}, 'connected'), /not connected/],
  ['expired preview', h => h.call('use', 'missing', 'expired'), /preview has expired/],
  ['source removed', h => h.call('disconnect', 'missing'), /no longer saved/],
];
for (const [name, run, expected] of serviceCases) {
  test(`host wording: ${name}`, async t => { const h = host(t); await failure(() => run(h), expected); });
}
test('host wording: unexpected provider bodies are hidden from IPC and progress', async t => {
  const fixture = await startConnectorServers(); t.after(() => fixture.close());
  const body = `${fixture.distinctive} https://reader:${fixture.distinctive}@example.invalid/ error_description`;
  const adapter = { kind: 'gmail', available: () => true, async connect() { throw new Error(body); }, async disconnect() {} };
  const h = host(t, [adapter]);
  const message = await failure(() => h.call('connect', 'gmail'), /could not be prepared/, [body, fixture.distinctive]);
  assert.deepEqual(await h.call('progress', 'gmail'), { stage: 'failed', error: message });
});
test('data-service wording: saved connection missing', async () => {
  await failure(() => new CustomApiConnector().fetch(secretStore(), fetchOptions()), /not connected/);
});

test('all public connector error literals and screen notices follow the wording rule', async t => {
  const root = new URL('../electron/connectors/', import.meta.url), problems = [];
  let checked = 0;
  function check(file, source, position, text) {
    checked++;
    try { wording(text); } catch (error) { problems.push(`${file}:${source.slice(0, position).split('\n').length}: ${error.message.split('\n')[0]}`); }
  }
  for (const file of await readdir(root)) {
    if (!file.endsWith('.ts')) continue;
    const source = await readFile(new URL(file, root), 'utf8');
    // Cover both direct errors and fail(message) helpers, plus shared message tables.
    for (const match of source.matchAll(/(?:new (?:Error|ConnectorError|ServiceError|PublicError|BrowserUnavailable|ConnectorStorageError)|\bfail|res\.end)\('([^']*)'\)/g)) {
      const text = match[1];
      // Host fixture and registration diagnostics do not reach connector operations.
      if (text.startsWith('Test server') || text.startsWith('The Microsoft tenant ID') || text.startsWith('Sign-in complete.')) continue;
      check(file, source, match.index, text);
    }
    for (const table of source.matchAll(/const (?:messages|MESSAGES) = \{([\s\S]*?)\n\};/g)) {
      for (const match of table[1].matchAll(/\w+: '([^']*)'/g)) check(file, source, table.index + match.index, match[1]);
    }
  }
  const screen = await readFile(new URL('../src/Connectors.tsx', import.meta.url), 'utf8');
  // Action buttons supply the next step for the missing-selected-data notice.
  for (const match of screen.matchAll(/(?:const plainFailure = |setError\()'([^']+)'|<p>(Sign-in is not set up[^<]+)<\/p>/g)) {
    check('Connectors.tsx', screen, match.index, match[1] ?? match[2]);
  }
  assert.ok(checked >= 60, 'Keep the complete error literal inventory in the audit');
  t.diagnostic(`${checked} error literals and screen notices audited`);
  assert.deepEqual(problems, [], 'Every public error must keep one plain explanation and one next step');
});
