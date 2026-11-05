import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startConnectorServers } from './fixtures/connector-servers.mjs';

// These files can be tested before the separately owned service imports them.
// Compile the actual sources, into an isolated ignored build directory.
execFileSync(process.execPath, [fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)), '--ignoreConfig', '--target', 'ES2023', '--module', 'NodeNext',
  '--moduleResolution', 'NodeNext', '--strict', '--skipLibCheck', '--types', 'node', '--rootDir', '.',
  '--outDir', 'dist-electron/connector-account-tests', 'electron/connectors/oauth.ts', 'electron/connectors/google.ts', 'electron/connectors/microsoft.ts'],
{ cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'pipe' });
const { GoogleConnector, GmailConnector, GoogleCalendarConnector, GoogleDriveConnector } = await import('../dist-electron/connector-account-tests/electron/connectors/google.js');
const { MicrosoftConnector, OutlookConnector, OutlookCalendarConnector, OneDriveConnector, MICROSOFT_CLOUDS } = await import('../dist-electron/connector-account-tests/electron/connectors/microsoft.js');
const { plainText } = await import('../dist-electron/connector-account-tests/electron/connectors/oauth.js');
process.env.NODE_ENV = 'test';
const definitions = [
  ['gmail', GmailConnector, 'google', 'email', 'gmail.readonly'],
  ['google-calendar', GoogleCalendarConnector, 'google', 'event', 'calendar.readonly'],
  ['google-drive', GoogleDriveConnector, 'google', 'file', 'drive.readonly'],
  ['outlook', OutlookConnector, 'microsoft', 'email', 'Mail.Read'],
  ['outlook-calendar', OutlookCalendarConnector, 'microsoft', 'event', 'Calendars.Read'],
  ['onedrive', OneDriveConnector, 'microsoft', 'file', 'Files.Read.All'],
];
function secretStore() {
  const values = new Map();
  return { values, async get(key) { return values.get(key); }, async set(key, value) { values.set(key, value); }, async remove(key) { values.delete(key); } };
}
const options = changes => ({ maxItems: 20, maxBytes: 100_000, signal: new AbortController().signal, ...changes });
async function setup(t, Adapter = GmailConnector, family = 'google', initial = {}, overrides = {}, cloud = 'commercial') {
  const fixture = await startConnectorServers(initial);
  t.after(() => fixture.close());
  const adapter = new Adapter({ clientId: 'synthetic-client-id' }, { ...fixture[family], ...overrides });
  const secrets = secretStore(), ui = fixture.ui(cloud);
  await adapter.connect(secrets, ui, new AbortController().signal);
  return { fixture, adapter, secrets, ui };
}
function noSecret(fixture, value) {
  assert.equal(JSON.stringify(value).includes(fixture.distinctive), false, 'Synthetic credentials must not escape secure storage or requests.');
}
async function safeFailure(fixture, operation, expected) {
  let caught;
  try { await operation(); } catch (error) { caught = error; }
  assert.ok(caught, 'Expected a visible failure, not a false success.');
  assert.match(caught.message, expected);
  noSecret(fixture, { message: caught.message, stack: caught.stack, cause: caught.cause });
  return caught;
}

for (const [kind, Adapter, family, itemKind, scope] of definitions) {
  test(`${kind}: actual PKCE callback, exact scopes, pagination, plain items and disconnect`, async t => {
    const { adapter, fixture, secrets, ui } = await setup(t, Adapter, family, { echoSecrets: true });
    assert.equal(adapter.kind, kind);
    assert.equal(adapter.available(), true);
    assert.equal(fixture.state.pkceVerified, 1);
    assert.deepEqual(fixture.state.grants, ['authorization_code']);
    assert.deepEqual(fixture.state.authorizations[0].scopes, family === 'google' ? [`https://www.googleapis.com/auth/${scope}`]
      : [`https://graph.microsoft.com/${scope}`, 'https://graph.microsoft.com/User.Read', 'offline_access']);
    if (family === 'google') {
      assert.equal(fixture.state.authorizations[0].params.access_type, 'offline');
      assert.equal(ui.state.questions.length, 0);
    } else {
      assert.equal(ui.state.questions.length, 1);
      assert.equal(ui.state.questions[0].label, 'Which Microsoft account?');
      assert.deepEqual(ui.state.questions[0].options.map(value => value.label), ['Personal or business', 'US Government', 'Navy or DoD']);
    }
    assert.equal(ui.state.callbacks[0].status, 200);
    await assert.rejects(fetch(ui.state.callbacks[0].url), /fetch failed/);
    const items = await adapter.fetch(secrets, options());
    assert.equal(items.length, 2);
    assert.ok(items.every(item => item.kind === itemKind && item.body.length > 0));
    assert.ok(items.every(item => !/<\/?(?:p|div|script|style)\b|hidden executable|hidden style/.test(item.body)));
    assert.equal(new Set(items.map(item => item.id)).size, 2);
    noSecret(fixture, items);
    const apiRequests = fixture.state.requests.filter(request => request.path.includes('/v1') || request.path.includes('/v3'));
    assert.ok(apiRequests.length >= 2);
    assert.ok(apiRequests.every(request => request.method === 'GET' && request.authorized));
    if (kind === 'onedrive') assert.deepEqual(fixture.state.downloadAuthorized, [false, false]);
    if (kind.endsWith('drive')) assert.equal(fixture.state.requests.some(request => request.path.includes('/binary/')), false);
    assert.equal(secrets.values.size, 1);
    await adapter.disconnect(secrets);
    assert.equal(secrets.values.size, 0);
    assert.equal(fixture.state.revocations, family === 'google' ? 1 : 0);
    if (family === 'google') assert.equal(fixture.state.revokedKnownToken, true);
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /Connect this account again/);
  });

  test(`${kind}: missing configuration and enforced item and byte limits`, async t => {
    const missing = new Adapter();
    assert.equal(missing.available(), false);
    await assert.rejects(missing.connect(secretStore(), { openBrowser() { assert.fail('No browser without configuration.'); } }, new AbortController().signal), /administrator/);
    const { adapter, fixture, secrets } = await setup(t, Adapter, family);
    const one = await adapter.fetch(secrets, options({ maxItems: 1 }));
    assert.equal(one.length, 1);
    const size = Buffer.byteLength(JSON.stringify(one[0]));
    const bounded = await adapter.fetch(secrets, options({ maxBytes: size }));
    assert.ok(bounded.reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify(row)), 0) <= size);
    assert.deepEqual(await adapter.fetch(secrets, options({ maxItems: 0 })), []);
    assert.deepEqual(await adapter.fetch(secrets, options({ maxBytes: 1 })), []);
    await safeFailure(fixture, () => adapter.fetch(secrets, options({ maxItems: -1 })), /limits are invalid/);
    await safeFailure(fixture, () => adapter.fetch(secrets, options({ maxBytes: NaN })), /limits are invalid/);
  });
}

test('configuration cannot override production destinations; test endpoints require explicit local test arguments', () => {
  const google = new GoogleConnector('gmail', { clientId: 'synthetic', tokenUrl: 'http://127.0.0.1/ignored' });
  assert.equal(google.provider().tokenUrl, 'https://oauth2.googleapis.com/token');
  const microsoft = new MicrosoftConnector('outlook', { clientId: 'synthetic', graphBaseUrl: 'http://127.0.0.1/ignored', authorizationUrl: 'http://127.0.0.1/ignored' });
  for (const [cloud, expected] of Object.entries(MICROSOFT_CLOUDS)) {
    const provider = microsoft.provider(cloud);
    assert.equal(new URL(provider.authorizationUrl).origin, expected.login);
    assert.equal(new URL(provider.tokenUrl).origin, expected.login);
    assert.equal(new URL(provider.deviceCodeUrl).origin, expected.login);
    assert.deepEqual(provider.scopes, [`${expected.graph}/Mail.Read`, `${expected.graph}/User.Read`, 'offline_access']);
  }
  assert.throws(() => new GmailConnector({ clientId: 'synthetic' }, { gmailBaseUrl: 'https://example.invalid' }), /loopback/);
  assert.throws(() => new OutlookConnector({ clientId: 'synthetic' }, { tokenUrl: 'http://localhost/token' }), /loopback/);
  assert.throws(() => new OutlookConnector({ clientId: 'synthetic', tenantId: '../escape' }), /tenant ID/);
  process.env.NODE_ENV = 'production';
  try { assert.throws(() => new GmailConnector({ clientId: 'synthetic' }, {}), /Test server settings are disabled/); }
  finally { process.env.NODE_ENV = 'test'; }
});

for (const [Adapter, family] of [[GmailConnector, 'google'], [OutlookConnector, 'microsoft']]) {
  test(`${family}: expiry, rotated refresh tokens and restart use the real token endpoint`, async t => {
    const { fixture, secrets } = await setup(t, Adapter, family, { expiresIn: 1 });
    fixture.state.expiresIn = 3600;
    const restarted = new Adapter({ clientId: 'synthetic-client-id' }, fixture[family]);
    assert.equal((await restarted.fetch(secrets, options())).length, 2);
    assert.equal(fixture.state.refreshes, 1);
    const [key, value] = [...secrets.values][0], saved = JSON.parse(value);
    saved.expiresAt = 0;
    await secrets.set(key, JSON.stringify(saved));
    assert.equal((await restarted.fetch(secrets, options())).length, 2);
    assert.equal(fixture.state.refreshes, 2);
  });
  test(`${family}: 401 refreshes once, repeated 401 asks for sign-in`, async t => {
    const { adapter, fixture, secrets } = await setup(t, Adapter, family);
    fixture.state.apiOnceStatus = 401;
    assert.equal((await adapter.fetch(secrets, options())).length, 2);
    assert.equal(fixture.state.refreshes, 1);
    fixture.state.apiStatus = 401;
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /Connect this account again/);
    assert.equal(fixture.state.refreshes, 2);
  });
  test(`${family}: admin approval, rejected refresh, malformed response and rate limits stay safe`, async t => {
    const { adapter, fixture, secrets } = await setup(t, Adapter, family);
    fixture.state.apiStatus = 403;
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /administrator.*read-only permissions/);
    fixture.state.apiStatus = 429;
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /Wait a minute and try again/);
    fixture.state.apiStatus = undefined;
    fixture.state.apiOnceStatus = 429;
    assert.equal((await adapter.fetch(secrets, options())).length, 2);
    fixture.state.apiOnceStatus = 429; fixture.state.retryAfter = 100;
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /too many requests/);
    fixture.state.malformed = true;
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /could not read/);
    fixture.state.malformed = false; fixture.state.apiStatus = 401; fixture.state.tokenStatus = 400;
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /Connect this account again/);
  });
  test(`${family}: slow headers and slow streaming bodies time out`, async t => {
    const { adapter, fixture, secrets } = await setup(t, Adapter, family, {}, { requestTimeoutMs: 50 });
    fixture.state.slowMs = 300;
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /took too long.*Try again/);
    fixture.state.slowBody = true;
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /took too long.*Try again/);
  });
}

test('PKCE callback rejects forged state and duplicate state without consuming valid sign-in', async t => {
  const fixture = await startConnectorServers(); t.after(() => fixture.close());
  const ui = fixture.ui('commercial', { async beforeCallback(callback) {
    const forged = new URL(callback); forged.searchParams.set('state', 'wrong-state');
    assert.equal((await fetch(forged)).status, 400);
    const duplicate = new URL(callback); duplicate.searchParams.append('state', duplicate.searchParams.get('state'));
    assert.equal((await fetch(duplicate)).status, 400);
  } });
  const adapter = new GmailConnector({ clientId: 'synthetic' }, fixture.google);
  await adapter.connect(secretStore(), ui, new AbortController().signal);
  assert.equal(fixture.state.pkceVerified, 1);
});

test('cancelled and timed-out sign-in close the actual listener and save no tokens', async t => {
  const fixture = await startConnectorServers(); t.after(() => fixture.close());
  for (const cancel of [true, false]) {
    const adapter = new GmailConnector({ clientId: 'synthetic' }, { ...fixture.google, signInTimeoutMs: 80 });
    const secrets = secretStore(), controller = new AbortController(); let callback;
    const ui = { async openBrowser(value) { callback = new URL(value).searchParams.get('redirect_uri'); if (cancel) controller.abort(); } };
    await safeFailure(fixture, () => adapter.connect(secrets, ui, controller.signal), cancel ? /cancelled/ : /took too long/);
    assert.equal(secrets.values.size, 0);
    await assert.rejects(fetch(callback), /fetch failed/);
  }
});

test('declined consent and missing permissions cannot falsely connect', async t => {
  const fixture = await startConnectorServers({ authError: 'consent_required' }); t.after(() => fixture.close());
  const adapter = new GmailConnector({ clientId: 'synthetic' }, fixture.google), secrets = secretStore();
  await safeFailure(fixture, () => adapter.connect(secrets, fixture.ui(), new AbortController().signal), /administrator/);
  assert.equal(secrets.values.size, 0);
  fixture.state.authError = undefined; fixture.state.grantedScope = 'unrelated.read';
  await safeFailure(fixture, () => adapter.connect(secrets, fixture.ui(), new AbortController().signal), /required read-only access/);
  assert.equal(secrets.values.size, 0);
});

for (const cloud of ['government', 'dod']) {
  test(`${cloud}: government device fallback completes and uses that cloud's scopes`, async t => {
    const fixture = await startConnectorServers(); t.after(() => fixture.close());
    const adapter = new OutlookConnector({ clientId: 'synthetic' }, fixture.microsoft), secrets = secretStore();
    const ui = fixture.ui(cloud, { browserUnavailable: true });
    const connected = await adapter.connect(secrets, ui, new AbortController().signal);
    assert.equal(ui.state.questions.length, 1);
    assert.equal(ui.state.codes.length, 1);
    assert.equal(fixture.state.devicePolls, 1);
    assert.equal(fixture.state.deviceScope, `${MICROSOFT_CLOUDS[cloud].graph}/Mail.Read ${MICROSOFT_CLOUDS[cloud].graph}/User.Read offline_access`);
    assert.equal((await adapter.fetch(secrets, options())).length, 2);
    noSecret(fixture, connected);
    assert.equal(JSON.parse([...secrets.values.values()][0]).cloud, cloud);
  });
}

test('device polling honors pending and slow_down and refuses expired codes', async t => {
  const fixture = await startConnectorServers({ deviceErrors: ['authorization_pending', 'slow_down'] }); t.after(() => fixture.close());
  const adapter = new OneDriveConnector({ clientId: 'synthetic' }, fixture.microsoft);
  const started = Date.now();
  await adapter.connect(secretStore(), fixture.ui('dod', { browserUnavailable: true }), new AbortController().signal);
  assert.equal(fixture.state.devicePolls, 3);
  assert.ok(Date.now() - started >= 7900, 'slow_down must increase the real polling interval by five seconds.');
  fixture.state.deviceExpiresIn = 0.1;
  const secrets = secretStore();
  await safeFailure(fixture, () => adapter.connect(secrets, fixture.ui('dod', { browserUnavailable: true }), new AbortController().signal), /code expired/);
  assert.equal(secrets.values.size, 0);
});

test('commercial browser failure does not start government fallback', async t => {
  const fixture = await startConnectorServers(); t.after(() => fixture.close());
  const adapter = new OutlookConnector({ clientId: 'synthetic' }, fixture.microsoft);
  await safeFailure(fixture, () => adapter.connect(secretStore(), fixture.ui('commercial', { browserUnavailable: true }), new AbortController().signal), /default browser/);
  assert.equal(fixture.state.requests.some(request => request.path.endsWith('/devicecode')), false);
});

test('cross-origin pagination and ordinary redirects cannot receive a bearer token', async t => {
  const { adapter, fixture, secrets } = await setup(t, OutlookConnector, 'microsoft');
  const other = await startConnectorServers(); t.after(() => other.close());
  fixture.state.nextLink = `${other.base}/stolen`;
  await safeFailure(fixture, () => adapter.fetch(secrets, options()), /unexpected page address/);
  assert.equal(other.state.requests.length, 0);
  fixture.state.nextLink = undefined; fixture.state.apiRedirect = `${other.base}/stolen`;
  await safeFailure(fixture, () => adapter.fetch(secrets, options()), /could not be reached/);
  assert.equal(other.state.requests.length, 0);
});

test('OneDrive validates every download redirect and strips authorization', async t => {
  const { adapter, fixture, secrets } = await setup(t, OneDriveConnector, 'microsoft');
  const other = await startConnectorServers(); t.after(() => other.close());
  fixture.state.contentRedirect = `${other.base}/stolen`;
  await safeFailure(fixture, () => adapter.fetch(secrets, options()), /unexpected download address/);
  fixture.state.contentRedirect = undefined; fixture.state.downloadRedirect = `${other.base}/stolen`;
  await safeFailure(fixture, () => adapter.fetch(secrets, options()), /unexpected download address/);
  assert.equal(other.state.requests.length, 0);
  assert.deepEqual(fixture.state.downloadAuthorized, [false]);
});

test('repeating pages fail explicitly instead of duplicating or hanging', async t => {
  for (const [Adapter, family] of [[GmailConnector, 'google'], [OutlookConnector, 'microsoft']]) {
    const { adapter, fixture, secrets } = await setup(t, Adapter, family, { repeatPage: true });
    await safeFailure(fixture, () => adapter.fetch(secrets, options()), /repeated a page/);
  }
});

test('query, folder and date filters are carried to provider requests', async t => {
  for (const [, Adapter, family] of definitions) {
    const { adapter, fixture, secrets } = await setup(t, Adapter, family);
    await adapter.fetch(secrets, options({ query: "sample's", folder: "folder's", sinceDays: 4 }));
    const requests = fixture.state.requests.filter(request => request.method === 'GET' && request.authorized);
    assert.ok(requests.length > 0);
    const first = requests[0];
    if (adapter.kind === 'gmail') {
      assert.equal(first.query.labelIds, "folder's"); assert.match(first.query.q, /after:\d+/);
    } else if (adapter.kind === 'google-drive') {
      assert.match(first.query.q, /folder\\'s.*in parents/); assert.match(first.query.q, /modifiedTime >=/);
    } else if (adapter.kind === 'google-calendar') {
      assert.equal(first.query.q, "sample's"); assert.ok(first.query.timeMin);
    } else if (adapter.kind === 'outlook') assert.match(first.query.$filter, /receivedDateTime ge/);
    else if (adapter.kind === 'outlook-calendar') { assert.ok(first.query.startDateTime); assert.ok(first.query.endDateTime); }
    else assert.match(decodeURIComponent(first.path), /search\(q='sample''s'\)/);
  }
});

test('plain alternative wins; unreadable binary and non-UTF8 content are omitted', async t => {
  const { adapter, secrets } = await setup(t, GmailConnector, 'google', { multipartPlain: true });
  assert.equal((await adapter.fetch(secrets, options()))[0].body, 'Preferred plain body.');
  for (const [Adapter, family] of [[GoogleDriveConnector, 'google'], [OneDriveConnector, 'microsoft']]) {
    const result = await setup(t, Adapter, family, { fileBody: 'binary\0payload' });
    assert.deepEqual(await result.adapter.fetch(result.secrets, options()), []);
  }
  assert.equal(plainText('<p>A &amp; B &#x1f680;</p><script>ignore</script>'), 'A & B 🚀');
});

test('oversized streaming content is stopped and never returned partially', async t => {
  const { adapter, fixture, secrets } = await setup(t, GoogleDriveConnector, 'google', { fileBody: 'x'.repeat(5000) });
  await safeFailure(fixture, () => adapter.fetch(secrets, options({ maxBytes: 500 })), /too large.*smaller file/);
});

test('Gmail reads a body stored as an attachment and decodes its declared character set', async t => {
  const { adapter, fixture, secrets } = await setup(t, GmailConnector, 'google', { attachedBody: true });
  const items = await adapter.fetch(secrets, options());
  assert.equal(items.length, 2);
  assert.ok(items.every(item => item.body === 'Synthetic caf\u00e9 body.'));
  assert.equal(fixture.state.requests.filter(request => request.path.endsWith('/attachments/body')).length, 2);
});

test('cancel and disconnect stop in-flight refresh without restoring credentials', async t => {
  const { adapter, fixture, secrets } = await setup(t, OutlookConnector, 'microsoft', { expiresIn: 1 });
  fixture.state.refreshDelayMs = 300;
  const fetching = adapter.fetch(secrets, options());
  const failed = safeFailure(fixture, () => fetching, /cancelled/);
  while (fixture.state.refreshes === 0) await new Promise(resolve => setTimeout(resolve, 5));
  await adapter.disconnect(secrets);
  await failed;
  assert.equal(secrets.values.size, 0);
});

test('secure storage failures cannot leak a token through exception text', async t => {
  const { fixture, adapter } = await setup(t);
  const badStore = { async get() { throw new Error(fixture.distinctive); }, async set() { throw new Error(fixture.distinctive); }, async remove() { throw new Error(fixture.distinctive); } };
  await safeFailure(fixture, () => adapter.fetch(badStore, options()), /keychain/);
  await safeFailure(fixture, () => adapter.connect(badStore, fixture.ui(), new AbortController().signal), /keychain/);
  await safeFailure(fixture, () => adapter.disconnect(badStore), /keychain/);
});

test('failed Google revocation still removes local credentials and gives a next step', async t => {
  const { fixture, adapter, secrets } = await setup(t);
  fixture.state.revokeStatus = 500;
  await safeFailure(fixture, () => adapter.disconnect(secrets), /removed from AppYard.*account permissions/);
  assert.equal(secrets.values.size, 0);
});
