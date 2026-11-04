import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const temporary = await mkdtemp(join(tmpdir(), 'appyard-hosted-client-'));
const outfile = join(temporary, 'client.mjs');
await build({ entryPoints: [new URL('./hosted-client.ts', import.meta.url).pathname], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const { createHostedClient } = await import(pathToFileURL(outfile).href);
const cspFile = join(temporary, 'csp.mjs');
await build({ entryPoints: [new URL('./hosted-csp.ts', import.meta.url).pathname], outfile: cspFile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const { hostedContentSecurityPolicy } = await import(pathToFileURL(cspFile).href);
after(() => rm(temporary, { recursive: true, force: true }));
const response = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const bootstrap = user => ({ state: { version: 1, projects: [{ id: `${user}-project` }], settings: { provider: 'openai', model: 'test-model', rememberKey: true } }, models: [], storagePath: 'private', credentialStatus: 'connected', runtime: 'hosted' });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));

test('no account means no request; authenticated requests use the current bearer token', async t => {
  const calls = []; let account = 'A';
  const client = createHostedClient({ getAccess: async () => ({ userId: account, token: `token-${account}` }), fetch: async (url, init) => { calls.push({ url, init }); return response(bootstrap(account)); } });
  t.after(() => client.setUserId(null));
  await assert.rejects(client.api.bootstrap(), { name: 'AbortError' }); assert.equal(calls.length, 0);
  client.setUserId('A'); await client.api.bootstrap();
  account = 'B'; client.setUserId('B'); await client.api.bootstrap();
  assert.deepEqual(calls.map(call => call.init.headers.get('authorization')), ['Bearer token-A', 'Bearer token-B']);
  assert.ok(calls.every(call => call.init.credentials === 'omit' && call.init.cache === 'no-store'));
});

test('account changes abort requests and reject a late response body from the old account', async t => {
  const body = deferred(); let account = 'A', capturedSignal;
  const client = createHostedClient({ getAccess: async () => ({ userId: account, token: `token-${account}` }), fetch: async (_url, init) => { capturedSignal = init.signal; return { ok: true, text: () => body.promise }; } });
  t.after(() => client.setUserId(null)); client.setUserId('A');
  const states = []; client.api.onState(state => states.push(state));
  const pending = client.api.bootstrap(); const rejected = assert.rejects(pending, { name: 'AbortError' });
  await tick(); account = 'B'; client.setUserId('B'); assert.equal(capturedSignal.aborted, true);
  body.resolve(JSON.stringify(bootstrap('A'))); await rejected; assert.deepEqual(states, []);
});

test('a slow initial bootstrap cannot overwrite a newer progress snapshot', async t => {
  const first = deferred(); let requests = 0;
  const client = createHostedClient({ getAccess: async () => ({ userId: 'A', token: 'token-A' }), fetch: async () => ++requests === 1 ? { ok: true, text: () => first.promise } : response(bootstrap('newer')) });
  t.after(() => client.setUserId(null)); client.setUserId('A');
  const pending = client.api.bootstrap(); await tick();
  await client.api.bootstrap(); first.resolve(JSON.stringify(bootstrap('older')));
  assert.equal((await pending).state.projects[0].id, 'newer-project');
});

test('account switching between response parsing and publishing cannot notify the new account with old data', async t => {
  const states = [];
  const client = createHostedClient({ getAccess: async () => ({ userId: 'A', token: 'token-A' }), fetch: async () => ({ ok: true, text: () => ({ then(parse) {
    queueMicrotask(() => queueMicrotask(() => { client.setUserId('B'); client.api.onState(state => states.push(state)); }));
    return parse(JSON.stringify(bootstrap('A')));
  } }) }) });
  t.after(() => client.setUserId(null)); client.setUserId('A');
  await assert.rejects(client.api.bootstrap(), { name: 'AbortError' });
  assert.deepEqual(states, []);
});

test('logout never pauses a build and unsubscribes polling', async t => {
  const calls = [];
  const client = createHostedClient({ pollInterval: 5, getAccess: async () => ({ userId: 'A', token: 'token-A' }), fetch: async url => { calls.push(url); return response(bootstrap('A')); } });
  t.after(() => client.setUserId(null)); client.setUserId('A'); const unsubscribe = client.api.onState(() => {});
  await new Promise(resolve => setTimeout(resolve, 18)); assert.ok(calls.length > 0);
  unsubscribe(); client.setUserId(null); const count = calls.length;
  await new Promise(resolve => setTimeout(resolve, 18)); assert.equal(calls.length, count);
  assert.ok(calls.every(url => url === '/api/bootstrap'));
});

test('pause, resume, settings, files, and sharing use the agreed routes and JSON shapes', async t => {
  const calls = [];
  const client = createHostedClient({ getAccess: async () => ({ userId: 'A', token: 'token-A' }), fetch: async (url, init) => {
    calls.push({ url, init });
    if (url === '/api/bootstrap' || url.startsWith('/api/settings')) return response(bootstrap('A'));
    if (url.includes('/artifact?')) return response('const app = "private file";');
    if (url.endsWith('/share')) return response({ url: 'https://isolated.example/app' });
    return new Response(null, { status: 204 });
  } });
  t.after(() => client.setUserId(null)); client.setUserId('A');
  await client.api.stopRun('project/id'); await client.api.resumeRun('project/id');
  const settings = { backend: 'pi', provider: 'openai', model: 'test-model', rememberKey: true };
  await client.api.saveSettings(settings, 'secret-test-key'); await client.api.removeKey();
  assert.equal(await client.api.readArtifact('project/id', 'src/my file.ts'), 'const app = "private file";');
  assert.equal(await client.api.shareProject('project/id'), 'https://isolated.example/app');
  assert.ok(calls.some(({ url, init }) => url === '/api/projects/project%2Fid/pause' && init.method === 'POST'));
  assert.ok(calls.some(({ url, init }) => url === '/api/projects/project%2Fid/resume' && init.method === 'POST'));
  const saved = calls.find(({ url, init }) => url === '/api/settings' && init.method === 'POST');
  assert.deepEqual(JSON.parse(saved.init.body), { settings, apiKey: 'secret-test-key' });
  assert.ok(calls.some(({ url, init }) => url === '/api/settings/key' && init.method === 'DELETE'));
  assert.ok(calls.some(({ url }) => url === '/api/projects/project%2Fid/artifact?path=src%2Fmy%20file.ts'));
});

test('export authenticates and downloads binary ZIP without exposing the token in a URL', async t => {
  const downloads = [], calls = [];
  const client = createHostedClient({ getAccess: async () => ({ userId: 'A', token: 'token-A' }), fetch: async (url, init) => { calls.push({ url, init }); return new Response(new Uint8Array([80, 75, 3, 4]), { headers: { 'content-type': 'application/zip' } }); }, download: (blob, name) => downloads.push({ blob, name }) });
  t.after(() => client.setUserId(null)); client.setUserId('A');
  assert.equal(await client.api.exportProject('123'), 'appyard-123.zip');
  assert.equal(calls[0].url, '/api/projects/123/export'); assert.equal(calls[0].init.headers.get('authorization'), 'Bearer token-A');
  assert.equal(downloads[0].blob.size, 4); assert.equal(downloads[0].name, 'appyard-123.zip');
});

test('authorization failures notify the auth boundary and surface an actionable error', async t => {
  let expired = 0;
  const client = createHostedClient({ getAccess: async () => ({ userId: 'A', token: 'token-A' }), onUnauthorized: () => expired++, fetch: async () => new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 }) });
  t.after(() => client.setUserId(null)); client.setUserId('A');
  await assert.rejects(client.api.bootstrap(), /Session expired/); assert.equal(expired, 1);
});

test('hosted CSP allows only the configured auth origin and isolated Sandbox frames', () => {
  const policy = hostedContentSecurityPolicy('https://account.supabase.co/path');
  assert.ok(policy.includes("connect-src 'self' https://account.supabase.co;"));
  assert.ok(policy.includes('frame-src https://*.vercel.run;'));
  assert.equal(policy.includes('http://127.0.0.1'), false);
  assert.equal(policy.includes('ws:'), false);
  assert.equal(policy.includes("script-src 'self' 'unsafe-inline'"), false);
  assert.throws(() => hostedContentSecurityPolicy('http://insecure.test'), /HTTPS/);
  assert.throws(() => hostedContentSecurityPolicy('https://user:password@auth.test'), /HTTPS/);
  assert.ok(hostedContentSecurityPolicy('https://account.supabase.co', true).includes('ws://127.0.0.1:*'));
});
