import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { build } from 'esbuild';

const directory = await mkdtemp(resolve('.hosted-preview-test-'));
after(() => rm(directory, { recursive: true, force: true }));
await build({ entryPoints: ['server/preview.ts'], outfile: `${directory}/preview.mjs`, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
const { previewUrl, staticPreviewServer, isPreviewAsset } = await import(pathToFileURL(`${directory}/preview.mjs`).href);
const hash = data => createHash('sha256').update(data).digest('hex');
function fixture() {
  const run = { id: randomUUID(), projectId: randomUUID(), userId: randomUUID(), epoch: 1, status: 'review', metadata: {} };
  const version = randomUUID();
  const files = [
    { path: 'index.html', content: Buffer.from('<h1>Fixture</h1>') }, { path: 'data.json', content: Buffer.from('{}') },
    { path: '.fleet/packet.json', content: Buffer.from('{"private":"brief"}') }, { path: 'test-report.json', content: Buffer.from('{}') },
  ];
  const manifest = { version, prefix: `${run.userId}/${run.projectId}/${run.id}/${version}`, sourceHash: 'a'.repeat(64), createdAt: new Date().toISOString(),
    files: files.map(file => ({ path: file.path, size: file.content.length, sha256: hash(file.content) })) };
  return { run, manifest, files };
}

test('preview assets omit internal evidence and permit browser modules and data', () => {
  for (const path of ['.fleet/packet.json', '.quality-evidence/screenshot.png', 'test-report.json', 'review.json', 'acceptance-plan.json', 'ux-spec.json', 'package.json', 'server.cjs']) assert.equal(isPreviewAsset(path), false, path);
  for (const path of ['index.html', 'src/app.mjs', 'assets/logo.gif', 'fonts/demo.woff', 'data/fixtures.json', 'data.csv']) assert.equal(isPreviewAsset(path), true, path);
});

test('static preview serves only allowed regular files with isolation headers', { timeout: 10_000 }, async t => {
  const root = join(directory, 'static'); await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<script>localStorage.setItem("demo","works")</script><p>Demo</p>');
  await writeFile(join(root, 'assets/app.mjs'), 'export const value=1;');
  await writeFile(join(root, 'private.json'), '{"private":"brief"}');
  await writeFile(join(directory, 'outside.txt'), 'outside-file');
  await symlink(join(directory, 'outside.txt'), join(root, 'linked.txt'));
  const script = join(directory, 'serve.mjs');
  await writeFile(script, staticPreviewServer(['index.html', 'assets/app.mjs', 'linked.txt', '../outside.txt'], 'fixture-ready', root, 0));
  const child = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null) { child.kill(); await once(child, 'exit'); } });
  const [stdout] = await once(child.stdout, 'data');
  const base = `http://127.0.0.1:${JSON.parse(stdout.toString()).port}`;
  const home = await fetch(base);
  assert.equal(home.status, 200); assert.match(await home.text(), /localStorage/);
  assert.match(home.headers.get('Content-Security-Policy'), /connect-src 'self'/);
  assert.match(home.headers.get('Content-Security-Policy'), /worker-src 'none'/);
  assert.equal(home.headers.get('Referrer-Policy'), 'no-referrer'); assert.equal(home.headers.get('X-Content-Type-Options'), 'nosniff');
  const module = await fetch(base + '/assets/app.mjs'); assert.equal(module.status, 200); assert.match(module.headers.get('Content-Type'), /javascript/);
  for (const path of ['/private.json', '/linked.txt', '/%2e%2e%2foutside.txt', '/assets/%2e%2e%2fprivate.json', '/%00']) assert.equal((await fetch(base + path)).status, 404, path);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal(await (await fetch(base, { method: 'HEAD' })).text(), '');
  assert.equal(await (await fetch(base + '/__fleet_health')).text(), 'fixture-ready');
});

test('concurrent previews share initialization and return only after readiness', async () => {
  const { run, manifest, files } = fixture();
  let creates = 0, uploads = 0, reads = 0, launches = 0, checks = 0, initialized = false;
  const sandbox = {
    writeFiles: async saved => { uploads++; assert.ok(!saved.some(file => file.path.endsWith('packet.json') || file.path.endsWith('test-report.json'))); assert.ok(saved.some(file => file.path.endsWith('data.json'))); },
    runCommand: async command => { if (command.cmd === 'flock') { launches++; initialized = true; return {}; } checks++; assert.equal(command.timeoutMs, 15000); return { exitCode: initialized ? 0 : 1 }; },
    domain: port => { assert.equal(port, 3000); assert.ok(checks > 0); return 'https://fixture.vercel.run'; },
  };
  let exists = false;
  const dependencies = {
    database: { readManifestFiles: async (savedRun, savedManifest) => { reads++; assert.equal(savedRun.id, run.id); assert.equal(savedManifest.version, manifest.version); return files; } },
    sandboxes: { getOrCreate: async options => { creates++; assert.equal(options.networkPolicy, 'deny-all'); assert.equal(options.persistent, true); assert.deepEqual(options.keepLastSnapshots, { count: 1 }); assert.equal(options.snapshotExpiration, 86400000); assert.equal(options.name, `preview-${manifest.version}`); if (!exists) { exists = true; await options.onCreate(sandbox); } return sandbox; }, get: async () => sandbox },
  };
  const urls = await Promise.all([previewUrl(run, manifest, dependencies), previewUrl(run, manifest, dependencies)]);
  assert.deepEqual(urls, ['https://fixture.vercel.run', 'https://fixture.vercel.run']);
  assert.equal(creates, 1); assert.equal(uploads, 1); assert.equal(reads, 1); assert.equal(launches, 1);
  await previewUrl(run, manifest, dependencies);
  assert.equal(reads, 1); assert.equal(launches, 1);
});

test('preview recovers a creation race and an interrupted initialization', async () => {
  const { run, manifest, files } = fixture();
  let gets = 0, initialized = false, checks = 0;
  const sandbox = {
    writeFiles: async () => {}, domain: () => 'https://fixture.vercel.run',
    runCommand: async command => { if (command.cmd === 'flock') { initialized = true; return {}; } checks++; return { exitCode: initialized ? 0 : 1 }; },
  };
  const dependencies = { database: { readManifestFiles: async () => files }, sandboxes: {
    getOrCreate: async () => { throw { response: { status: 409 } }; },
    get: async options => { gets++; assert.equal(options.resume, true); return sandbox; },
  } };
  assert.equal(await previewUrl(run, manifest, dependencies), 'https://fixture.vercel.run');
  assert.equal(gets, 1); assert.equal(checks, 2); assert.equal(initialized, true);
});

test('failed readiness cannot produce a broken preview URL', async () => {
  const { run, manifest, files } = fixture(); let gotDomain = false;
  const sandbox = { writeFiles: async () => {}, runCommand: async () => ({ exitCode: 1 }), domain: () => { gotDomain = true; return 'https://broken.vercel.run'; } };
  await assert.rejects(previewUrl(run, manifest, { database: { readManifestFiles: async () => files }, sandboxes: { getOrCreate: async () => sandbox, get: async () => sandbox } }), error => error.status === 503);
  assert.equal(gotDomain, false);
  await assert.rejects(previewUrl({ ...run, userId: randomUUID() }, manifest, { database: { readManifestFiles: async () => { assert.fail(); } }, sandboxes: {} }));
});

test('expired and production previews restore immutable files without reusing a staging URL', async () => {
  const { run, manifest, files } = fixture();
  const stale = { ...run, metadata: { previewUrl: 'https://expired-stage.vercel.run', sandboxId: 'old-stage-sandbox' } };
  let restores = 0;
  const database = { readManifestFiles: async (saved, version) => { assert.equal(saved.id, run.id); assert.equal(version.version, manifest.version); restores++; return files; } };
  function scope(domain) {
    let ready = false;
    const sandbox = { writeFiles: async saved => { assert.ok(saved.some(file => file.path.endsWith('/index.html'))); },
      runCommand: async command => { if (command.cmd === 'flock') ready = true; return { exitCode: ready ? 0 : 1 }; }, domain: () => domain };
    return { database, sandboxes: { getOrCreate: async options => { assert.equal(options.name, `preview-${manifest.version}`); await options.onCreate(sandbox); return sandbox; }, get: async () => sandbox } };
  }
  assert.equal(await previewUrl(stale, manifest, scope('https://recreated-stage.vercel.run')), 'https://recreated-stage.vercel.run');
  assert.equal(await previewUrl(stale, manifest, scope('https://production.vercel.run')), 'https://production.vercel.run');
  assert.equal(restores, 2);
  assert.equal(stale.metadata.previewUrl, 'https://expired-stage.vercel.run');
});

test('the production missing-snapshot error restores a legacy preview once and reuses it', async () => {
  const { run, manifest, files } = fixture();
  let restores = 0, installed = false, resumes = 0;
  const names = [];
  const sandbox = {
    writeFiles: async saved => { restores++; assert.ok(saved.some(file => file.path.endsWith('/index.html'))); },
    runCommand: async command => { if (command.cmd === 'flock') installed = true; return { exitCode: installed ? 0 : 1 }; },
    domain: () => 'https://restored.vercel.run',
  };
  const dependencies = { database: { readManifestFiles: async () => files }, sandboxes: {
    getOrCreate: async options => {
      names.push(options.name);
      if (options.name === `preview-${manifest.version}`) throw Object.assign(new Error('Status code 400 is not ok: Cannot resume sandbox: no snapshot available.'), { response: { status: 400 } });
      assert.equal(options.name, `preview-restored-${manifest.version}`);
      assert.equal(options.persistent, true);
      if (!installed) await options.onCreate(sandbox);
      return sandbox;
    }, get: async () => { assert.fail('No resource should be deleted or replaced'); },
  } };
  assert.deepEqual(await Promise.all([previewUrl(run, manifest, dependencies), previewUrl(run, manifest, dependencies)]), ['https://restored.vercel.run', 'https://restored.vercel.run']);
  assert.equal(restores, 1);
  await previewUrl(run, manifest, dependencies);
  assert.equal(restores, 1);
  assert.equal(names.length, 4);
  // Simulate the next stopped persistent session, including another instance's creation race.
  dependencies.sandboxes.getOrCreate = async options => { if (options.name === `preview-${manifest.version}`) throw { response: { status: 400 }, message: 'Cannot resume sandbox: no snapshot available.' }; throw { response: { status: 409 } }; };
  dependencies.sandboxes.get = async options => { assert.equal(options.name, `preview-restored-${manifest.version}`); assert.equal(options.resume, true); resumes++; await options.onResume(sandbox); return sandbox; };
  assert.equal(await previewUrl(run, manifest, dependencies), 'https://restored.vercel.run');
  assert.equal(resumes, 1);
});

test('unrelated upstream failures are sanitized for every concurrent caller without creating more sandboxes', async t => {
  const { run, manifest } = fixture();
  let calls = 0;
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  const dependencies = { database: { readManifestFiles: async () => assert.fail() }, sandboxes: {
    getOrCreate: async () => { calls++; throw Object.assign(new Error('Invalid request with private upstream credential'), { response: { status: 400 } }); },
    get: async () => assert.fail(),
  } };
  const results = await Promise.allSettled([previewUrl(run, manifest, dependencies), previewUrl(run, manifest, dependencies)]);
  for (const result of results) { assert.equal(result.status, 'rejected'); assert.equal(result.reason.status, 503); assert.equal(result.reason.code, 'preview_unavailable'); assert.doesNotMatch(result.reason.message, /credential/); }
  assert.equal(calls, 1);
  assert.doesNotMatch(JSON.stringify(logs), /credential/);
  await assert.rejects(previewUrl(run, manifest, dependencies), error => error.status === 503);
  assert.equal(calls, 2, 'A failed request must not poison the initialization cache');
});
