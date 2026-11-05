import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import yazl from 'yazl';
import { prepareIsolatedDependencies } from '../dist-electron/electron/isolated-dependencies.js';
import { executeIsolatedProcess } from '../dist-electron/electron/isolated-executor.js';

const supported = ['darwin', 'linux'].includes(process.platform);
async function fixture(t, runtime = 'node') {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-dependency-test-'))), root = path.join(directory, 'package');
  await fs.mkdir(root); await fs.writeFile(path.join(directory, 'answer-key.txt'), 'HOST_ONLY');
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const manifest = { profile: 'cli', command: { runtime, entrypoint: runtime === 'node' ? 'engine.mjs' : 'engine.py', args: [] }, files: [], requiredEnv: [] };
  return { directory, root, manifest, nodeExecutable: process.execPath, timeoutMs: 30_000 };
}
function tar(files) {
  const chunks = [];
  for (const [name, value] of Object.entries(files)) {
    const data = Buffer.from(value), header = Buffer.alloc(512);
    header.write('package/' + name, 0, 100); header.write('0000644\0', 100, 8); header.write('0000000\0', 108, 8); header.write('0000000\0', 116, 8);
    header.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 12); header.write('00000000000\0', 136, 12); header.fill(' ', 148, 156);
    header.write('0', 156, 1); header.write('ustar\0', 257, 6); header.write('00', 263, 2);
    header.write([...header].reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148, 8);
    chunks.push(header, data, Buffer.alloc((512 - data.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}
async function npmFixture(options, optionsOverride = {}) {
  const name = 'fleet-offline-fixture', version = '1.0.0', url = 'https://registry.npmjs.org/fleet-offline-fixture/-/fleet-offline-fixture-1.0.0.tgz';
  const bytes = tar({ 'package.json': JSON.stringify({ name, version, main: 'index.js', scripts: { postinstall: 'node postinstall.js' }, bin: { 'fleet-fixture': 'index.js' } }),
    'index.js': 'module.exports = value => ({value: value * 7});\n',
    'postinstall.js': `require('node:fs').writeFileSync(${JSON.stringify(path.join(options.directory, 'script-ran.txt'))}, 'unsafe');\n` });
  const integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
  const manifest = { name: 'generated-runtime', version, dependencies: { [name]: version }, scripts: { install: 'node -e "process.exit(77)"' } };
  const lock = { name: 'generated-runtime', version, lockfileVersion: 3, requires: true,
    packages: { '': { name: 'generated-runtime', version, dependencies: { [name]: version } }, ['node_modules/' + name]: { version, resolved: url, integrity, hasInstallScript: true, ...optionsOverride } } };
  await fs.writeFile(path.join(options.root, 'package.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(options.root, 'package-lock.json'), JSON.stringify(lock));
  options.manifest.files = ['package.json', 'package-lock.json'];
  options.manifest.dependencies = { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' };
  return { url, bytes, lock, integrity };
}
function offlineFetch(responses, seen = []) {
  return async (input, init) => {
    const url = String(input); seen.push(url);
    assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit'); assert.ok(init.signal);
    if (!responses.has(url)) throw new Error('Unexpected external acquisition: ' + url);
    const content = responses.get(url);
    return new Response(content, { status: 200 });
  };
}

test('real npm installs verified offline archives without lifecycle scripts or candidate npm configuration', { skip: !supported, timeout: 35_000 }, async t => {
  const options = await fixture(t), packageFixture = await npmFixture(options), seen = [];
  await fs.writeFile(path.join(options.root, '.npmrc'), 'ignore-scripts=false\nregistry=https://hostile.invalid/\n');
  const result = await prepareIsolatedDependencies(options, { fetch: offlineFetch(new Map([[packageFixture.url, packageFixture.bytes]]), seen) });
  assert.deepEqual(seen, [packageFixture.url]); assert.deepEqual(result.testEnvironment, {});
  const probe = await executeIsolatedProcess({ workspace: options.root, command: [process.execPath, '--no-global-search-paths', '-e', 'console.log(JSON.stringify(require("fleet-offline-fixture")(6)))'], readPaths: result.readPaths });
  assert.equal(probe.exitCode, 0, probe.stderr); assert.deepEqual(JSON.parse(probe.stdout), { value: 42 });
  await assert.rejects(fs.access(path.join(options.directory, 'script-ran.txt')));
  await assert.rejects(fs.access(path.join(options.root, 'node_modules', '.bin')));
  await assert.rejects(fs.access(path.join(options.root, '.fleet-dependencies')));
});

test('unapproved registries and weak or corrupt integrity fail before extraction', async t => {
  for (const [change, pattern] of [[{ resolved: 'http://registry.npmjs.org/pkg.tgz' }, /approved HTTPS/], [{ resolved: 'https://127.0.0.1/pkg.tgz' }, /approved HTTPS/],
    [{ integrity: 'sha1-' + Buffer.alloc(20).toString('base64') }, /stronger integrity/], [{ integrity: 'sha512-' + Buffer.alloc(64).toString('base64') }, /integrity mismatch/]]) {
    const options = await fixture(t), item = await npmFixture(options, change), seen = [];
    await assert.rejects(prepareIsolatedDependencies(options, { fetch: offlineFetch(new Map([[item.url, item.bytes]]), seen) }), pattern);
    assert.equal(seen.length, pattern.source.includes('mismatch') ? 1 : 0);
    await assert.rejects(fs.access(path.join(options.root, 'node_modules')));
    await assert.rejects(fs.access(path.join(options.root, '.fleet-dependencies')));
  }
});

test('acquisition refuses redirected or oversized archives and obeys cancellation', async t => {
  const options = await fixture(t); await npmFixture(options);
  await assert.rejects(prepareIsolatedDependencies(options, { fetch: async () => new Response('x', { headers: { 'content-length': '64000001' } }) }), /byte limit/);
  await assert.rejects(prepareIsolatedDependencies(options, { fetch: async () => ({ ok: true, status: 200, redirected: true }) }), /acquisition failed/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(prepareIsolatedDependencies({ ...options, signal: controller.signal }, { fetch: async () => { throw new Error('must not fetch'); } }), /abort/i);
});

test('registry outages are censored as infrastructure while invalid candidate pins remain implementation failures', async t => {
  const options = await fixture(t); await npmFixture(options);
  for (const [status, classification] of [[503, 'infrastructure'], [429, 'infrastructure'], [404, 'implementation']]) {
    await assert.rejects(prepareIsolatedDependencies(options, { fetch: async () => new Response('', { status }) }), error => error.classification === classification);
  }
  await assert.rejects(prepareIsolatedDependencies(options, { fetch: async () => { throw new TypeError('network fixture disconnected'); } }), error => error.classification === 'infrastructure');
});

async function wheel(files) {
  const zip = new yazl.ZipFile(), output = [];
  for (const [name, contents] of Object.entries(files)) zip.addBuffer(Buffer.from(contents), name);
  const finished = new Promise((resolve, reject) => { zip.outputStream.on('data', chunk => output.push(chunk)); zip.outputStream.once('end', () => resolve(Buffer.concat(output))); zip.outputStream.once('error', reject); });
  zip.end(); return finished;
}
async function pythonFixture(options) {
  const name = 'fleet-offline-fixture', version = '1.0.0', filename = 'fleet_offline_fixture-1.0.0-py3-none-any.whl';
  const files = { 'fleet_offline_fixture/__init__.py': 'def calculate(value):\n    return {"value": value * 7}\n',
    'fleet_escape_probe.pth': 'import pathlib; pathlib.Path(' + JSON.stringify(path.join(options.directory, 'wheel-escaped.txt')) + ').write_text("escape")\n',
    'fleet_offline_fixture-1.0.0.dist-info/METADATA': 'Metadata-Version: 2.1\nName: fleet-offline-fixture\nVersion: 1.0.0\n\nOffline fixture\n',
    'fleet_offline_fixture-1.0.0.dist-info/WHEEL': 'Wheel-Version: 1.0\nGenerator: Fleet test\nRoot-Is-Purelib: true\nTag: py3-none-any\n' };
  files['fleet_offline_fixture-1.0.0.dist-info/RECORD'] = Object.keys(files).map(file => file + ',,').join('\n') + '\nfleet_offline_fixture-1.0.0.dist-info/RECORD,,\n';
  const bytes = await wheel(files), hash = createHash('sha256').update(bytes).digest('hex'), url = 'https://files.pythonhosted.org/packages/fixture/' + filename;
  const metadataUrl = 'https://pypi.org/pypi/' + name + '/' + version + '/json';
  const metadata = JSON.stringify({ urls: [{ filename, url, digests: { sha256: hash }, packagetype: 'bdist_wheel' }] });
  await fs.writeFile(path.join(options.root, 'requirements.lock'), name + '==' + version + ' --hash=sha256:' + hash + '\n');
  options.manifest.files = ['requirements.lock']; options.manifest.dependencies = { manager: 'pip', manifest: 'requirements.lock', lockfile: 'requirements.lock' };
  return { bytes, hash, url, metadataUrl, metadata };
}

test('real Python installs a hash-pinned compatible wheel offline and exposes an isolated interpreter', { skip: !supported, timeout: 35_000 }, async t => {
  const options = await fixture(t, 'python'), item = await pythonFixture(options), seen = [];
  const result = await prepareIsolatedDependencies(options, { fetch: offlineFetch(new Map([[item.metadataUrl, item.metadata], [item.url, item.bytes]]), seen) });
  assert.deepEqual(seen, [item.metadataUrl, item.url]); assert.equal(result.testEnvironment.FLEET_PYTHON, result.python);
  await assert.rejects(fs.access(path.join(options.directory, 'wheel-escaped.txt')));
  assert.deepEqual(JSON.parse(result.testEnvironment.FLEET_PYTHON_READ_PATHS), result.readPaths);
  const probe = await executeIsolatedProcess({ workspace: options.root, readPaths: result.readPaths, command: [result.python, '-I', '-B', '-c',
    'import json; from fleet_offline_fixture import calculate; print(json.dumps(calculate(6)))'] });
  assert.equal(probe.exitCode, 0, probe.stderr); assert.deepEqual(JSON.parse(probe.stdout), { value: 42 });
  await assert.rejects(fs.access(path.join(options.directory, 'wheel-escaped.txt')));
  assert.equal((await fs.lstat(result.python)).isSymbolicLink(), false);
  const attempt = await executeIsolatedProcess({ workspace: options.root, readPaths: result.readPaths, command: [result.python, '-I', '-B', '-c',
    'from pathlib import Path; print(Path(' + JSON.stringify(path.join(options.directory, 'answer-key.txt')) + ').read_text())'] });
  assert.notEqual(attempt.exitCode, 0); assert.ok(!attempt.stdout.includes('HOST_ONLY'));
});

test('Python rejects source-only releases, incompatible or corrupt wheels and unsafe lock options', { skip: !supported, timeout: 35_000 }, async t => {
  const options = await fixture(t, 'python'), item = await pythonFixture(options);
  await assert.rejects(prepareIsolatedDependencies(options, { fetch: offlineFetch(new Map([[item.metadataUrl, JSON.stringify({ urls: [] })]])) }), /No compatible hash-pinned binary wheel/);
  const incompatible = JSON.parse(item.metadata); incompatible.urls[0].filename = 'fleet_offline_fixture-1.0.0-cp999-cp999-impossible.whl';
  await assert.rejects(prepareIsolatedDependencies(options, { fetch: offlineFetch(new Map([[item.metadataUrl, JSON.stringify(incompatible)]])) }), /No compatible hash-pinned binary wheel/);
  await assert.rejects(prepareIsolatedDependencies(options, { fetch: offlineFetch(new Map([[item.metadataUrl, item.metadata], [item.url, 'corrupted']])) }), /integrity mismatch/);
  await fs.writeFile(path.join(options.root, 'requirements.lock'), 'fleet-offline-fixture==1.0.0 --hash=sha256:' + item.hash + ' --index-url=https://hostile.invalid\n');
  await assert.rejects(prepareIsolatedDependencies(options, { fetch: async () => { throw new Error('must not fetch'); } }), /pins and SHA-256 hashes/);
});
