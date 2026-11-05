import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CodexAccount } from '../dist-electron/electron/codex-account.js';

const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
const scopes = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const signingKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...signingKey.publicKey.export({ format: 'jwk' }), kid: 'account-test-key', alg: 'RS256', use: 'sig' };

function signedIdentity(payload, key = signingKey.privateKey) {
  const data = [
    { alg: 'RS256', kid: jwk.kid, typ: 'JWT' },
    payload,
  ].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), key).toString('base64url')}`;
}

async function until(predicate, message = 'OAuth operation did not settle', timeoutMs = 3000) {
  const end = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= end) assert.fail(message);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-chatgpt-test-'));
  const state = {
    now: Date.now(), opened: [], calls: [], tokenForms: [], issuedTokens: [], issuedClients: new Map(), tokenReplies: 0,
    clientId: 'oaiapp_fixture_a', subject: 'fixture-subject-a', email: 'builder@example.test',
    identityOverrides: {}, responseOverrides: {}, signingKey: signingKey.privateKey,
    catalog: { models: [{ slug: 'fixture-model', display_name: 'Fixture model', visibility: 'list' }] },
    catalogFailure: false, codeExchangeError: null, refreshError: null, refreshNetworkFailure: false, revocationFailure: false, browserFailure: false,
    revocationEndpoint: `${issuer}/api/accounts/oauth/revoke`,
  };
  const request = async (input, init = {}) => {
    const url = String(input);
    state.calls.push({ url, init });
    if (url === `${issuer}/.well-known/jwks.json`) return Response.json({ keys: [jwk] });
    if (url === `${issuer}/.well-known/openid-configuration`) {
      return Response.json({ issuer, revocation_endpoint: state.revocationEndpoint });
    }
    if (url === `${issuer}/api/accounts/oauth/revoke`) {
      if (state.revocationFailure) throw new Error('Fixture revocation network failure');
      await state.beforeRevocationReply?.();
      return new Response(null, { status: 200 });
    }
    if (url === `${resource}/models`) {
      if (state.catalogFailure) throw new Error('Fixture catalog network failure');
      return Response.json(state.catalog);
    }
    if (url === `${issuer}/api/accounts/oauth/token`) {
      const form = new URLSearchParams(init.body);
      state.tokenForms.push(form);
      assert.equal(form.get('resource'), resource);
      assert.equal(init.method, 'POST');
      assert.match(new Headers(init.headers).get('content-type'), /^application\/x-www-form-urlencoded(?:;|$)/);
      const refresh = form.get('grant_type') === 'refresh_token';
      if (refresh && state.refreshNetworkFailure) throw new Error('Fixture refresh network failure');
      if (refresh && state.refreshError) return Response.json({ error: state.refreshError }, { status: 400 });
      if (!refresh && state.codeExchangeError) return Response.json({ error: state.codeExchangeError }, { status: 400 });
      const auth = new URL(state.opened.filter(value => value.startsWith(`${issuer}/api/accounts/authorize`)).at(-1));
      const clientId = refresh ? state.issuedClients.get(form.get('refresh_token'))
        : auth.searchParams.get('client_id') === 'dynamic_agent_client' ? state.clientId : auth.searchParams.get('client_id');
      assert.equal(form.get('client_id'), clientId);
      if (!refresh) {
        assert.equal(form.get('grant_type'), 'authorization_code');
        assert.equal(form.get('redirect_uri'), auth.searchParams.get('redirect_uri'));
        assert.equal(createHash('sha256').update(form.get('code_verifier')).digest('base64url'), auth.searchParams.get('code_challenge'));
      } else {
        assert.equal(form.has('scope'), false);
      }
      const sequence = state.tokenForms.length;
      const body = {
        access_token: `fixture-access-${sequence}`, refresh_token: `fixture-refresh-${sequence}`,
        token_type: 'Bearer', expires_in: 3600, scope: scopes,
        ...(!refresh ? { id_token: signedIdentity({
          iss: issuer, aud: clientId, sub: state.subject,
          iat: Math.floor(state.now / 1000), exp: Math.floor(state.now / 1000) + 3600,
          nonce: auth.searchParams.get('nonce'), email: state.email,
          ...state.identityOverrides,
        }, state.signingKey) } : {}),
        ...state.responseOverrides,
      };
      state.issuedTokens.push(body);
      if (body.refresh_token) state.issuedClients.set(body.refresh_token, clientId);
      await state.beforeTokenReply?.({ refresh, form, body });
      state.tokenReplies++;
      return Response.json(body);
    }
    throw new Error(`Unexpected outbound request: ${url}`);
  };
  const openExternal = async url => {
    state.opened.push(url);
    if (state.browserFailure) throw new Error('Fixture browser unavailable');
  };
  const create = () => new CodexAccount(root, openExternal, { fetch: request, now: () => state.now, ...options });
  const account = create();
  const accounts = [account];
  t.after(async () => {
    for (const value of accounts) value.dispose();
    await fs.rm(root, { recursive: true, force: true });
  });
  const authorize = async (accountId, target = account) => {
    await target.login(accountId);
    const url = new URL(state.opened.at(-1));
    assert.equal(url.origin + url.pathname, `${issuer}/api/accounts/authorize`);
    return url;
  };
  const callback = async (auth, fields = {}) => {
    const url = new URL(auth.searchParams.get('redirect_uri'));
    const selectedClient = auth.searchParams.get('client_id');
    url.search = new URLSearchParams({
      state: auth.searchParams.get('state'), code: 'fixture-code',
      client_id: selectedClient === 'dynamic_agent_client' ? state.clientId : selectedClient,
      ...fields,
    }).toString();
    return fetch(url);
  };
  const complete = async (auth, target = account) => {
    const response = await callback(auth);
    assert.equal(response.status, 200);
    await response.text();
    await until(() => target.account.status !== 'connecting', 'Login callback did not finish');
    return target.account;
  };
  const login = async () => { const auth = await authorize(); await complete(auth); return auth; };
  return { root, state, account, authorize, callback, complete, login,
    saved: () => fs.readFile(path.join(root, 'chatgpt', 'credentials.json'), 'utf8'),
    reopen: () => { const next = create(); accounts.push(next); return next; },
  };
}

function assertPublicSnapshot(account, state) {
  const exposed = JSON.stringify({ account: account.account, models: account.models });
  for (const body of state.issuedTokens) {
    for (const key of ['access_token', 'refresh_token', 'id_token']) {
      if (body[key]) assert.equal(exposed.includes(body[key]), false, `${key} escaped into renderer state`);
    }
  }
  assert.doesNotMatch(exposed, /code_verifier|authorization_code/);
}

test('ChatGPT signs in through a verified public-client OAuth flow and persists a private session', async t => {
  const f = await fixture(t);
  assert.equal(f.account.home, path.join(f.root, 'codex'));
  await f.account.refresh();
  assert.equal(f.account.account.status, 'disconnected');
  const auth = await f.authorize();
  assert.equal(auth.searchParams.get('client_id'), 'dynamic_agent_client');
  assert.equal(auth.searchParams.get('agent_name_hint'), 'AppYard');
  assert.match(auth.searchParams.get('ext_agent_host_id'), /^urn:uuid:[\da-f-]+$/i);
  assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(auth.searchParams.get('resource'), resource);
  assert.deepEqual(auth.searchParams.get('scope').split(' ').sort(), scopes.split(' ').sort());
  const redirect = new URL(auth.searchParams.get('redirect_uri'));
  assert.equal(redirect.hostname, '127.0.0.1');
  assert.equal(redirect.protocol, 'http:');
  assert.equal(redirect.pathname, '/auth/callback');
  assert.equal(f.account.account.status, 'connecting');
  await f.complete(auth);
  assert.equal(f.account.account.status, 'connected');
  assert.equal(f.account.account.email, f.state.email);
  assert.equal(f.account.account.planUsageEnabled, true);
  assert.ok(f.account.account.activeAccountId);
  await until(() => f.account.models.length === 1, 'Account model catalog was not loaded');
  assert.deepEqual(f.account.models[0], { id: 'fixture-model', name: 'Fixture model', provider: 'chatgpt', backend: 'codex', configured: true });
  assert.equal((await f.account.credentials()).accessToken, 'fixture-access-1');
  const saved = await f.saved();
  assert.ok(saved.includes('fixture-refresh-1'));
  assert.ok(saved.includes(f.state.clientId));
  if (process.platform !== 'win32') assert.equal((await fs.stat(path.join(f.root, 'chatgpt', 'credentials.json'))).mode & 0o777, 0o600);
  assertPublicSnapshot(f.account, f.state);
});

test('unsolicited and duplicate callback parameters cannot consume a valid pending sign-in', async t => {
  const f = await fixture(t), auth = await f.authorize();
  const wrongState = await f.callback(auth, { state: 'unrelated-state' });
  assert.equal(wrongState.status, 400);
  for (const field of ['state', 'code', 'client_id']) {
    const url = new URL(auth.searchParams.get('redirect_uri'));
    url.search = new URLSearchParams({ state: auth.searchParams.get('state'), code: 'fixture-code', client_id: f.state.clientId }).toString();
    url.searchParams.append(field, url.searchParams.get(field));
    assert.equal((await fetch(url)).status, 400);
  }
  assert.equal(f.state.tokenForms.length, 0);
  assert.equal(f.account.account.status, 'connecting');
  await f.complete(auth);
  assert.equal(f.account.account.status, 'connected');
  assert.equal(f.state.tokenForms.length, 1);
});

for (const [description, overrides, invalidKey] of [
  ['issuer', { iss: 'https://untrusted.example' }],
  ['audience', { aud: 'oaiapp_other' }],
  ['nonce', { nonce: 'unrelated-nonce' }],
  ['subject', { sub: '' }],
  ['expiration', { exp: 1 }],
  ['signature', {}, true],
]) test(`ChatGPT rejects an ID token with an invalid ${description}`, async t => {
  const f = await fixture(t);
  f.state.identityOverrides = overrides;
  if (invalidKey) f.state.signingKey = otherKey.privateKey;
  await f.login();
  assert.notEqual(f.account.account.status, 'connected');
  assert.ok(f.account.account.error);
  await assert.rejects(f.account.credentials());
  assert.equal((await f.saved()).includes('fixture-access-1'), false);
  assertPublicSnapshot(f.account, f.state);
});

test('declining consent never exchanges a code and leaves no usable session', async t => {
  const f = await fixture(t), auth = await f.authorize();
  const response = await f.callback(auth, { error: 'access_denied' });
  await response.text();
  await until(() => f.account.account.status !== 'connecting');
  assert.equal(f.state.tokenForms.length, 0);
  assert.notEqual(f.account.account.status, 'connected');
  await assert.rejects(f.account.credentials());
});

test('identity without ChatGPT plan permission is retained without granting inference access', async t => {
  const f = await fixture(t);
  f.state.responseOverrides = { scope: 'openid profile email' };
  await f.login();
  assert.equal(f.account.account.planUsageEnabled, false);
  assert.equal(f.account.account.email, f.state.email);
  assert.ok(f.account.account.accounts.length);
  assert.ok(f.account.account.error);
  assert.equal(f.account.models.length, 0);
  await assert.rejects(f.account.credentials());
  assert.equal(f.state.calls.some(call => call.url === `${resource}/models`), false);
  assert.ok((await f.saved()).includes(f.state.clientId));
});

test('saved registrations survive restart and reauthorize with the same host and client', async t => {
  const f = await fixture(t), initial = await f.login();
  const id = f.account.account.activeAccountId;
  f.account.dispose();
  const restored = f.reopen();
  await restored.refresh();
  assert.equal(restored.account.status, 'connected');
  assert.equal(restored.account.activeAccountId, id);
  const auth = await f.authorize(id, restored);
  assert.equal(auth.searchParams.get('client_id'), f.state.clientId);
  assert.equal(auth.searchParams.get('ext_agent_host_id'), initial.searchParams.get('ext_agent_host_id'));
  assert.equal(auth.searchParams.has('agent_name_hint'), false);
  assert.equal(auth.searchParams.get('login_hint'), f.state.email);
  assert.equal(auth.searchParams.get('id_token_hint'), f.state.issuedTokens[0].id_token);
  const callback = new URL(auth.searchParams.get('redirect_uri'));
  callback.search = new URLSearchParams({ state: auth.searchParams.get('state'), code: 'fixture-code' }).toString();
  await (await fetch(callback)).text();
  await until(() => restored.account.status !== 'connecting');
  assert.equal(restored.account.status, 'connected');
  assert.equal(restored.account.activeAccountId, id);
  assert.equal(restored.account.accounts.length, 1);
  assertPublicSnapshot(restored, f.state);
});

test('returning authorization cannot replace a saved account with another identity or client', async t => {
  const f = await fixture(t);
  await f.login();
  const id = f.account.account.activeAccountId;
  const original = (await f.account.credentials()).accessToken;
  f.state.subject = 'different-user';
  await f.complete(await f.authorize(id));
  assert.ok(f.account.account.error);
  assert.equal(f.account.account.email, 'builder@example.test');
  assert.equal((await f.account.credentials()).accessToken, original);
  f.state.subject = 'fixture-subject-a';
  const auth = await f.authorize(id), before = f.state.tokenForms.length;
  await (await f.callback(auth, { client_id: 'oaiapp_unrelated' })).text();
  await until(() => f.account.account.status !== 'connecting');
  assert.equal(f.state.tokenForms.length, before);
  assert.equal((await f.account.credentials()).accessToken, original);
  assertPublicSnapshot(f.account, f.state);
});

test('two workspaces sharing an email retain separate registrations and explicit selection', async t => {
  const f = await fixture(t);
  await f.login();
  const first = f.account.account.activeAccountId;
  f.state.clientId = 'oaiapp_fixture_workspace_b';
  await f.login();
  const second = f.account.account.activeAccountId;
  assert.notEqual(first, second);
  assert.equal(f.account.account.accounts.length, 2);
  await f.account.selectAccount(first);
  assert.equal(f.account.account.activeAccountId, first);
  assert.equal((await f.account.credentials()).accessToken, 'fixture-access-1');
  await f.account.selectAccount(second);
  assert.equal((await f.account.credentials()).accessToken, 'fixture-access-2');
  await assert.rejects(f.account.selectAccount('nonexistent-account'));
});

test('near-expiry credential leases serialize rotating refreshes and persist the replacement', async t => {
  const f = await fixture(t);
  await f.login();
  f.state.now += 3_590_000;
  const leases = await Promise.all(Array.from({ length: 6 }, () => f.account.credentials()));
  const refreshes = f.state.tokenForms.filter(form => form.get('grant_type') === 'refresh_token');
  assert.equal(refreshes.length, 1);
  assert.equal(refreshes[0].get('refresh_token'), 'fixture-refresh-1');
  for (const lease of leases) {
    assert.equal(lease.accessToken, 'fixture-access-2');
    assert.equal(lease.expiresAt, f.state.now + 3_600_000);
  }
  const saved = await f.saved();
  assert.ok(saved.includes('fixture-refresh-2'));
  assert.equal(saved.includes('fixture-refresh-1'), false);
  assertPublicSnapshot(f.account, f.state);
});

test('invalid_grant removes unusable tokens while preserving the issued registration for reauthorization', async t => {
  const f = await fixture(t);
  await f.login();
  const id = f.account.account.activeAccountId;
  f.state.now += 3_590_000;
  f.state.refreshError = 'invalid_grant';
  await assert.rejects(f.account.credentials());
  assert.notEqual(f.account.account.status, 'connected');
  const saved = await f.saved();
  assert.equal(saved.includes('fixture-access-1'), false);
  assert.equal(saved.includes('fixture-refresh-1'), false);
  assert.ok(saved.includes(f.state.clientId));
  const auth = await f.authorize(id);
  assert.equal(auth.searchParams.get('client_id'), f.state.clientId);
});

test('failed authorization-code exchange retries its issued client ID without registering another client', async t => {
  const f = await fixture(t);
  f.state.codeExchangeError = 'invalid_grant';
  const initial = await f.login();
  assert.notEqual(f.account.account.status, 'connected');
  assert.ok(f.account.account.error);
  assert.ok((await f.saved()).includes(f.state.clientId));
  f.state.codeExchangeError = null;
  const retry = await f.authorize();
  assert.equal(retry.searchParams.get('client_id'), f.state.clientId);
  assert.equal(retry.searchParams.has('agent_name_hint'), false);
  assert.equal(retry.searchParams.get('ext_agent_host_id'), initial.searchParams.get('ext_agent_host_id'));
  assert.notEqual(retry.searchParams.get('state'), initial.searchParams.get('state'));
  await f.complete(retry);
  assert.equal(f.account.account.status, 'connected');
  assert.equal(f.account.account.accounts.length, 1);
});

test('refresh without a replacement refresh token fails closed', async t => {
  const f = await fixture(t);
  await f.login();
  f.state.now += 3_590_000;
  f.state.responseOverrides = { refresh_token: undefined };
  await assert.rejects(f.account.credentials());
  assert.notEqual(f.account.account.status, 'connected');
  const saved = await f.saved();
  assert.equal(saved.includes('fixture-access-2'), false);
  assert.equal(saved.includes('fixture-refresh-1'), false);
});

test('a temporary refresh outage preserves saved tokens so renewal can recover', async t => {
  const f = await fixture(t);
  await f.login();
  f.state.now += 3_590_000;
  f.state.refreshNetworkFailure = true;
  await assert.rejects(f.account.credentials());
  const saved = await f.saved();
  assert.ok(saved.includes('fixture-refresh-1'));
  assert.ok(saved.includes(f.state.clientId));
  f.state.refreshNetworkFailure = false;
  assert.equal((await f.account.credentials()).accessToken, 'fixture-access-3');
  assert.equal(f.account.account.status, 'connected');
});

test('sign-out during token rotation revokes the newest refresh token and rejects the pending lease', async t => {
  const f = await fixture(t);
  await f.login();
  f.state.now += 3_590_000;
  let finishRefresh;
  f.state.beforeTokenReply = () => new Promise(resolve => { finishRefresh = resolve; });
  const pending = f.account.credentials();
  const rejection = assert.rejects(pending);
  await until(() => typeof finishRefresh === 'function');
  const logout = f.account.logout();
  finishRefresh();
  await Promise.all([logout, rejection]);
  const revoke = f.state.calls.find(call => call.url === `${issuer}/api/accounts/oauth/revoke`);
  assert.equal(new URLSearchParams(revoke.init.body).get('token'), 'fixture-refresh-2');
  assert.equal(f.account.account.status, 'disconnected');
  assert.equal((await f.saved()).includes('fixture-refresh-2'), false);
});

test('canceling after callback arrival prevents a delayed token response from activating an account', async t => {
  const f = await fixture(t), auth = await f.authorize();
  let finishExchange;
  f.state.beforeTokenReply = () => new Promise(resolve => { finishExchange = resolve; });
  await (await f.callback(auth)).text();
  await until(() => typeof finishExchange === 'function');
  await f.account.cancel();
  finishExchange();
  await until(() => f.state.tokenReplies === 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.account.account.status, 'disconnected');
  await assert.rejects(f.account.credentials());
  assert.equal((await f.saved()).includes('fixture-access-1'), false);
  assertPublicSnapshot(f.account, f.state);
});

test('model discovery accepts visible account models and catalog failure preserves the connection', async t => {
  const f = await fixture(t);
  f.state.catalog = { models: [
    { slug: 'visible-model', display_name: 'Visible model', visibility: 'list' },
    { slug: 'hidden-model', display_name: 'Hidden model', visibility: 'hidden' },
    { slug: '', display_name: 'Empty slug', visibility: 'list' },
    { slug: 'bad-name', display_name: 12, visibility: 'list' },
    null,
  ] };
  await f.login();
  await until(() => f.account.models.length > 0);
  assert.deepEqual(f.account.models.map(model => model.id), ['visible-model']);
  f.state.catalogFailure = true;
  await f.account.refresh();
  assert.equal(f.account.account.status, 'connected');
  assert.equal((await f.account.credentials()).accessToken, 'fixture-access-1');
  assert.ok(f.account.account.error);
  assertPublicSnapshot(f.account, f.state);
});

test('logout revokes the renewable session, clears local tokens and retains reusable registration metadata', async t => {
  const f = await fixture(t), firstAuth = await f.login();
  const id = f.account.account.activeAccountId;
  await f.account.logout();
  assert.equal(f.account.account.status, 'disconnected');
  await assert.rejects(f.account.credentials());
  const revoke = f.state.calls.find(call => call.url === `${issuer}/api/accounts/oauth/revoke`);
  assert.ok(revoke);
  const form = new URLSearchParams(revoke.init.body);
  assert.equal(form.get('token'), 'fixture-refresh-1');
  assert.equal(form.get('token_type_hint'), 'refresh_token');
  assert.equal(form.get('client_id'), f.state.clientId);
  const saved = await f.saved();
  for (const value of Object.values(f.state.issuedTokens[0]).filter(value => typeof value === 'string' && (value.startsWith('fixture-') || value.startsWith('eyJ')))) assert.equal(saved.includes(value), false);
  assert.ok(saved.includes(f.state.clientId));
  const auth = await f.authorize(id);
  assert.equal(auth.searchParams.get('client_id'), f.state.clientId);
  assert.equal(auth.searchParams.get('ext_agent_host_id'), firstAuth.searchParams.get('ext_agent_host_id'));
  assert.equal(auth.searchParams.has('id_token_hint'), false);
});

test('failed remote revocation still clears local credentials and reports the incomplete remote sign-out', async t => {
  const f = await fixture(t);
  await f.login();
  f.state.revocationFailure = true;
  await f.account.logout();
  assert.equal(f.account.account.status, 'disconnected');
  assert.match(f.account.account.error, /revocation|remote|disconnect/i);
  assert.equal((await f.saved()).includes('fixture-refresh-1'), false);
  await assert.rejects(f.account.credentials());
});

test('revocation discovery cannot send a credential to another origin', async t => {
  const f = await fixture(t);
  await f.login();
  f.state.revocationEndpoint = 'https://untrusted.example/revoke';
  await f.account.logout();
  assert.equal(f.state.calls.some(call => call.url.startsWith('https://untrusted.example')), false);
  assert.equal((await f.saved()).includes('fixture-refresh-1'), false);
  assert.ok(f.account.account.error);
});

test('pending sign-in can reopen its browser, cancel, and time out without leaking a listener', async t => {
  const f = await fixture(t, { loginTimeoutMs: 300 });
  const auth = await f.authorize();
  await f.account.reopenLogin();
  assert.equal(f.state.opened.length, 2);
  assert.equal(f.state.opened[0], f.state.opened[1]);
  await f.account.cancel();
  assert.equal(f.account.account.status, 'disconnected');
  await assert.rejects(fetch(auth.searchParams.get('redirect_uri')));
  const next = await f.authorize();
  assert.notEqual(next.searchParams.get('state'), auth.searchParams.get('state'));
  await until(() => f.account.account.status !== 'connecting');
  assert.match(f.account.account.error, /timed out|timeout/i);
  assert.equal(f.state.tokenForms.length, 0);
  await assert.rejects(fetch(next.searchParams.get('redirect_uri')));
});

test('canceling an added account keeps the previously connected account usable', async t => {
  const f = await fixture(t);
  await f.login();
  const original = f.account.account.activeAccountId;
  assert.equal(f.account.models.length, 1);
  await f.authorize();
  await f.account.cancel();
  assert.equal(f.account.account.status, 'connected');
  assert.equal(f.account.account.activeAccountId, original);
  assert.equal((await f.account.credentials()).accessToken, 'fixture-access-1');
  await until(() => f.account.models.some(model => model.id === 'fixture-model' && model.configured), 'Canceling sign-in left the previous account without a usable model catalog');
});

test('cancel without a pending login cannot strand an ongoing logout', async t => {
  const f = await fixture(t);
  await f.login();
  const id = f.account.account.activeAccountId;
  let finishRevocation;
  f.state.beforeRevocationReply = () => new Promise(resolve => { finishRevocation = resolve; });
  const logout = f.account.logout();
  await until(() => typeof finishRevocation === 'function');
  await f.account.cancel();
  finishRevocation();
  await logout;
  assert.equal(f.account.account.status, 'disconnected');
  assert.equal((await f.saved()).includes('fixture-refresh-1'), false);
  await f.authorize(id);
  assert.equal(f.account.account.status, 'connecting');
});

test('cancel without a pending login cannot strand an account switch waiting for refresh', async t => {
  const f = await fixture(t);
  await f.login();
  const first = f.account.account.activeAccountId;
  f.state.clientId = 'oaiapp_fixture_workspace_b';
  await f.login();
  const second = f.account.account.activeAccountId;
  await f.account.selectAccount(first);
  f.state.now += 3_590_000;
  let finishRefresh;
  f.state.beforeTokenReply = () => {
    if (!finishRefresh) return new Promise(resolve => { finishRefresh = resolve; });
  };
  const rejection = assert.rejects(f.account.credentials());
  await until(() => typeof finishRefresh === 'function');
  const switching = f.account.selectAccount(second);
  await until(() => f.account.account.status === 'disconnected');
  await f.account.cancel();
  finishRefresh();
  await Promise.all([switching, rejection]);
  assert.equal(f.account.account.status, 'connected');
  assert.equal(f.account.account.activeAccountId, second);
  assert.ok(f.account.models.length);
  assert.equal((await f.account.credentials()).accessToken, 'fixture-access-4');
});

test('browser-open failure settles sign-in and Manage usage opens only the fixed ChatGPT settings URL', async t => {
  const f = await fixture(t);
  f.state.browserFailure = true;
  await assert.rejects(f.account.login());
  assert.notEqual(f.account.account.status, 'connecting');
  assert.ok(f.account.account.error);
  assert.equal(f.state.tokenForms.length, 0);
  const auth = new URL(f.state.opened.at(-1));
  await assert.rejects(fetch(auth.searchParams.get('redirect_uri')));
  f.state.browserFailure = false;
  await f.account.manageUsage();
  assert.equal(f.state.opened.at(-1), 'https://chatgpt.com/settings/usage');
});

test('an unreadable credential record fails closed without replacing the saved file', async t => {
  const f = await fixture(t);
  const directory = path.join(f.root, 'chatgpt');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'credentials.json'), '{invalid-json', { mode: 0o600 });
  await f.account.refresh();
  assert.notEqual(f.account.account.status, 'connected');
  assert.ok(f.account.account.error);
  await assert.rejects(f.account.credentials());
  assert.equal(await f.saved(), '{invalid-json');
  assert.equal(f.state.calls.length, 0);
});
