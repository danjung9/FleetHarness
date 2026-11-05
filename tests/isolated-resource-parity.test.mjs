import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';

const supported = ['darwin', 'linux'].includes(process.platform);
const limits = { totalTimeoutMs: 30_000, startupTimeoutMs: 5_000, invocationTimeoutMs: 5_000 };
const application = `export const invoke = value => ({answer:value.count+1});
export const handleHttp = request => ({status:request.path==='/api/status'?200:404,
  headers:{'content-type':'application/json'},body:JSON.stringify({through:'application',method:request.method,path:request.path})});`;

async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-isolated-resource-parity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [relative, bytes] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await fs.writeFile(path.join(root, relative), bytes);
  }
  return root;
}

function manifest(files, profile = 'browser') {
  const command = { runtime: 'node', entrypoint: 'app.mjs', args: [] };
  return { profile, files, requiredEnv: [], ...(profile === 'browser'
    ? { entrypoint: 'index.html', evaluator: command }
    : { command, healthPath: '/health', invokePath: '/api/invoke' }) };
}

async function prepare(t, factory, root, configuration) {
  const runtime = await factory(root, configuration, process.execPath, undefined, limits);
  t.after(() => runtime.close());
  return runtime;
}

async function lease(runtime) {
  const response = await fetch(runtime.url, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
  await response.arrayBuffer();
  assert.equal(response.status, 302);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  return { base: new URL(runtime.url).origin + '/', headers: { cookie } };
}

async function read(base, relative, options = {}) {
  const response = await fetch(new URL(relative, base), { signal: AbortSignal.timeout(5_000), ...options });
  return { status: response.status, headers: response.headers, bytes: Buffer.from(await response.arrayBuffer()) };
}

test('isolated browser serves the declared resources accepted by ordinary preview', { skip: !supported, timeout: 30_000 }, async t => {
  const assets = {
    'index.html': { bytes: Buffer.from('<h1>Declared resources</h1>'), type: 'text/html' },
    'app.mjs': { bytes: Buffer.from(application), type: 'text/javascript' },
    'assets/stock data.csv': { bytes: Buffer.from('item,count\nvalve,3\npump,2\n'), type: 'application/octet-stream' },
    'assets/notes.txt': { bytes: Buffer.from('Keep the supplied data.\n'), type: 'application/octet-stream' },
    'assets/weights.bin': { bytes: Buffer.from([0, 255, 128, 13, 10, 1]), type: 'application/octet-stream' },
    'assets/state.custom': { bytes: Buffer.from([255, 0, 254, 42]), type: 'application/octet-stream' },
    'assets/LICENSE': { bytes: Buffer.from('Fixture data license'), type: 'application/octet-stream' },
    'assets/photo.jpg': { bytes: Buffer.from([255, 216, 255, 217]), type: 'image/jpeg' },
    'assets/engine.wasm': { bytes: Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]), type: 'application/wasm' }
  };
  const root = await fixture(t, Object.fromEntries(Object.entries(assets).map(([name, asset]) => [name, asset.bytes])));
  const configuration = manifest(Object.keys(assets));
  const ordinary = await prepare(t, prepareSolutionRuntime, root, configuration);
  const isolated = await prepare(t, prepareIsolatedSolutionRuntime, root, configuration);
  const authorized = await lease(isolated);
  for (const [relative, asset] of Object.entries(assets)) await t.test(relative, async () => {
    const expected = await read(ordinary.url, relative);
    assert.equal(expected.status, 200);
    assert.deepEqual(expected.bytes, asset.bytes);
    const actual = await read(authorized.base, relative, { headers: authorized.headers });
    assert.equal(actual.status, expected.status, relative + ' must be served as a declared resource');
    assert.deepEqual(actual.bytes, expected.bytes);
    assert.equal(actual.headers.get('content-type')?.split(';')[0], asset.type);
    assert.equal(actual.headers.get('content-type')?.split(';')[0], expected.headers.get('content-type')?.split(';')[0]);
    assert.equal(actual.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(actual.headers.get('cache-control'), 'no-store');
    assert.match(actual.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  });
  assert.equal(isolated.provenance.filesHash, ordinary.provenance.filesHash);
  await isolated.assertIntegrity();
  await ordinary.assertIntegrity();
});

test('isolated service resources preserve leases, method routing and the static file boundary', { skip: !supported, timeout: 20_000 }, async t => {
  const files = {
    'index.html': '<h1>Service resources</h1>', 'app.mjs': application,
    'assets/data.csv': 'task,count\ninspect valve,3\n',
    'engine.cjs': 'module.exports="private CommonJS source";',
    'assets/evaluator.CJS': 'module.exports="uppercase CommonJS source";'
  };
  const root = await fixture(t, { ...files, 'unlisted.csv': 'Unlisted source bytes' });
  const runtime = await prepare(t, prepareIsolatedSolutionRuntime, root, manifest(Object.keys(files), 'service'));
  const { base, headers } = await lease(runtime);
  // A file physically present in the clean package still needs explicit authorization.
  await fs.writeFile(path.join(runtime.root, 'unlisted.csv'), 'Unlisted staged bytes');
  for (const relative of ['engine.cjs', 'assets/evaluator.CJS', 'unlisted.csv']) {
    const response = await read(base, relative, { headers });
    assert.equal(response.status, 404, relative + ' must not be served statically');
    assert.equal(JSON.parse(response.bytes).through, 'application');
  }
  assert.equal((await read(base, 'assets/data.csv')).status, 403);
  assert.equal((await read(base, 'assets/data.csv', { headers: { ...headers, origin: 'https://untrusted.example' } })).status, 403);
  const posted = await read(base, 'assets/data.csv', { headers, method: 'POST', body: 'not a static GET' });
  assert.equal(posted.status, 404);
  assert.equal(JSON.parse(posted.bytes).method, 'POST');
  const dynamic = await read(base, 'api/status', { headers });
  assert.equal(dynamic.status, 200);
  assert.deepEqual(JSON.parse(dynamic.bytes), { through: 'application', method: 'GET', path: '/api/status' });
  const resource = await read(base, 'assets/data.csv?download=1', { headers });
  assert.equal(resource.status, 200);
  assert.equal(resource.bytes.toString(), files['assets/data.csv']);
  assert.equal(resource.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await runtime.invoke({ count: 4 }), { answer: 5 });
  await runtime.assertIntegrity();
});

test('newly served resources retain response size and frozen source integrity checks', { skip: !supported, timeout: 20_000 }, async t => {
  const root = await fixture(t, {
    'index.html': '<h1>Bounded resources</h1>', 'app.mjs': application,
    'assets/large.csv': Buffer.alloc(2_000_001, 97), 'assets/data.bin': Buffer.from([0, 255, 42])
  });
  const runtime = await prepare(t, prepareIsolatedSolutionRuntime, root,
    manifest(['index.html', 'app.mjs', 'assets/large.csv', 'assets/data.bin']));
  const { base, headers } = await lease(runtime);
  const tooLarge = await read(base, 'assets/large.csv', { headers });
  assert.equal(tooLarge.status, 502);
  assert.match(tooLarge.bytes.toString(), /Static runtime artifact exceeds its limit/);
  await runtime.assertIntegrity();
  await fs.writeFile(path.join(runtime.root, 'assets/data.bin'), Buffer.from([0, 254, 42]));
  await assert.rejects(runtime.assertIntegrity(), /changed its frozen application files/);
});

test('Chromium completes the same CSV-dependent browser output in ordinary and isolated runtimes', { skip: !supported, timeout: 30_000 }, async t => {
  const root = await fixture(t, {
    'app.mjs': application,
    'core.mjs': 'export const total = rows => rows.reduce((sum, row) => sum + Number(row.split(",")[1]), 0);',
    'assets/tasks.csv': 'task,count\ninspect valve,3\nreplace pump,2\n',
    'index.html': `<!doctype html><html lang="en"><meta charset="utf-8"><title>Resource-dependent output</title>
<main><h1>Work inventory</h1><p id="result" data-state="loading">Loading supplied tasks</p></main>
<script type="module">
import { total } from './core.mjs';
const result = document.querySelector('#result');
try {
  const response = await fetch('./assets/tasks.csv');
  if (!response.ok) throw new Error('Task data HTTP ' + response.status);
  const rows = (await response.text()).trim().split('\\n').slice(1);
  result.textContent = 'Tasks ready: ' + total(rows);
  result.dataset.state = 'ready';
} catch (error) { result.textContent = error.message; result.dataset.state = 'error'; }
</script></html>`
  });
  const configuration = manifest(['index.html', 'app.mjs', 'core.mjs', 'assets/tasks.csv']);
  // Match the host verifier's installed-browser choices, including environments
  // that install full Chromium without Playwright's separate headless shell.
  const browser = await chromium.launch({ channel: 'chromium', headless: true, chromiumSandbox: true, timeout: 5_000 })
    .catch(() => chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: true, timeout: 5_000 }));
  t.after(() => browser.close());
  for (const [label, factory] of [['ordinary', prepareSolutionRuntime], ['isolated', prepareIsolatedSolutionRuntime]]) {
    const runtime = await prepare(t, factory, root, configuration);
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(runtime.url, { waitUntil: 'load', timeout: 10_000 });
      await page.locator('#result[data-state="ready"], #result[data-state="error"]').waitFor({ timeout: 5_000 });
      assert.equal(await page.locator('#result').textContent(), 'Tasks ready: 5', label + ' browser must consume the declared CSV');
      assert.equal(await page.locator('#result').getAttribute('data-state'), 'ready');
      await runtime.assertIntegrity();
    } finally { await context.close(); }
  }
});
