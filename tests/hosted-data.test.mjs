import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const directory = await mkdtemp(resolve('.hosted-data-test-'));
after(() => rm(directory, { recursive: true, force: true }));
await build({ entryPoints: ['server/data.ts', 'server/http.ts', 'server/api.ts'], outdir: directory, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
const { HostedDatabase, validateArtifactPath, artifactPrefix, hashSourceFiles, assertManifest } = await import(pathToFileURL(`${directory}/data.mjs`).href);
const { readJson } = await import(pathToFileURL(`${directory}/http.mjs`).href);
const { handleApi } = await import(pathToFileURL(`${directory}/api.mjs`).href);
const userId = randomUUID(), projectId = randomUUID(), runId = randomUUID();
const run = { userId, projectId, id: runId, epoch: 2, status: 'running', metadata: {} };
const content = Buffer.from('<h1>Demo</h1>');
const version = randomUUID();
const manifest = { version, prefix: artifactPrefix(run, version), sourceHash: hashSourceFiles([{ path: 'index.html', content }]), createdAt: new Date().toISOString(),
  files: [{ path: 'index.html', size: content.length, sha256: createHash('sha256').update(content).digest('hex') }] };

test('artifact paths and manifests cannot escape the account/run prefix', () => {
  for (const path of ['/tmp/file', '../file', 'a/../b', 'a\\b', 'a//b', '.env', '.env.local', '.pi/auth.json', 'node_modules/secret', 'a\0b']) assert.throws(() => validateArtifactPath(path));
  assert.equal(validateArtifactPath('src/app.js'), 'src/app.js');
  assert.doesNotThrow(() => assertManifest(run, manifest));
  assert.throws(() => assertManifest({ ...run, userId: randomUUID() }, manifest));
  assert.throws(() => assertManifest(run, { ...manifest, files: [...manifest.files, ...manifest.files] }));
});

test('project lookup always filters by the authenticated owner', async () => {
  const requests = [];
  const database = new HostedDatabase('https://fixture.supabase.co', 'fixture-service', async (url, init) => {
    requests.push([url, init]); return Response.json([]);
  });
  await assert.rejects(database.getProject(userId, projectId), error => error.status === 404);
  const url = new URL(requests[0][0]);
  assert.equal(url.searchParams.get('user_id'), `eq.${userId}`); assert.equal(url.searchParams.get('id'), `eq.${projectId}`);
  assert.equal(requests[0][1].headers.get('Authorization'), 'Bearer fixture-service');
});

test('authentication verifies bearer with Supabase and ignores caller IDs', async () => {
  let calls = 0;
  const database = new HostedDatabase('https://fixture.supabase.co', 'fixture-service', async (url, init) => {
    calls++; assert.equal(url, 'https://fixture.supabase.co/auth/v1/user');
    assert.equal(init.headers.Authorization, 'Bearer browser-token'); return Response.json({ id: userId });
  });
  await assert.rejects(database.authenticate(new Request('https://app/api/bootstrap')), error => error.status === 401);
  assert.equal(calls, 0);
  assert.deepEqual(await database.authenticate(new Request('https://app/api/bootstrap?userId=attacker', { headers: { Authorization: 'Bearer browser-token' } })), { id: userId, email: undefined });
});

test('stale epochs and model budgets use atomic RPCs', async () => {
  const calls = [];
  const database = new HostedDatabase('https://fixture.supabase.co', 'fixture-service', async (url, init) => {
    calls.push([url, JSON.parse(init.body)]); return Response.json(url.endsWith('fleet_patch_run') ? null : false);
  });
  assert.equal(await database.patchRun(runId, 1, { status: 'review' }), null);
  assert.equal(await database.claimModelRequest(runId, 2, 99999), false);
  assert.equal(calls[0][1].p_epoch, 1); assert.equal(calls[1][1].p_max, 120);
});

test('artifact reads reject corrupted content and unlisted objects', async () => {
  let calls = 0;
  const database = new HostedDatabase('https://fixture.supabase.co', 'fixture-service', async () => { calls++; return new Response('modified'); });
  await assert.rejects(database.getArtifact({ ...run, manifest }, 'secret.txt'), error => error.status === 404);
  assert.equal(calls, 0);
  await assert.rejects(database.getArtifact({ ...run, manifest }, 'index.html'), /verification failed/);
  assert.equal(calls, 1);
});

test('source hash is deterministic and binds evidence except approval/report documents', () => {
  const files = [{ path: 'b.js', content: Buffer.from('b') }, { path: 'a.js', content: Buffer.from('a') }];
  assert.equal(hashSourceFiles(files), hashSourceFiles([...files].reverse()));
  assert.equal(hashSourceFiles(files), hashSourceFiles([...files, { path: 'review.json', content: Buffer.from('approval') }]));
  assert.notEqual(hashSourceFiles(files), hashSourceFiles([...files, { path: '.quality-evidence/page.png', content: Buffer.from('evidence') }]));
});

test('streamed JSON bodies are bounded without Content-Length', async () => {
  await assert.rejects(readJson(new Request('https://app/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(100) }) }), 50), error => error.status === 413);
});

test('API never starts a run before an owner lookup succeeds', async () => {
  let started = false;
  const database = { authenticate: async () => ({ id: userId }), getProject: async () => { throw Error('ownership denied'); } };
  const response = await handleApi(new Request(`https://app/api/projects/${projectId}/start`, { method: 'POST' }), {
    startRun: async () => { started = true; }, pauseRun: async () => {},
  }, database);
  assert.equal(response.status, 500); assert.equal(started, false);
});

test('shared previews use the immutable manifest on a separate origin', async () => {
  const token = 'a'.repeat(43); let seen;
  const hooks = { startRun: async () => {}, pauseRun: async () => {}, previewUrl: async value => { seen = value.manifest; return 'https://isolated.example/index.html'; } };
  const database = { getPublicShare: async () => ({ run: { ...run, manifest: { bad: true } }, manifest, title: 'Demo' }) };
  const response = await handleApi(new Request(`https://app/api/share/${token}`), hooks, database);
  assert.equal(response.status, 302); assert.equal(seen.version, version);
  const unsafe = await handleApi(new Request(`https://app/api/share/${token}`), { ...hooks, previewUrl: async () => 'https://app/generated.html' }, database);
  assert.equal(unsafe.status, 502);
});
