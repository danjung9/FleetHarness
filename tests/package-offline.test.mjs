import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { extract } from '@electron-internal/extract-zip';
import { extractFile } from '@electron/asar';
import { runPackageWorker } from '../dist-electron/electron/executable.js';
import { localElectronZip } from '../dist-electron/electron/package-runtime.js';

const require = createRequire(import.meta.url);
const runtime = path.join(path.dirname(require.resolve('electron/package.json')), 'dist');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-offline-package-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const before = { mirror: process.env.ELECTRON_MIRROR, cache: process.env.electron_config_cache };
  // Any accidental download fails. A fresh cache cannot hide the regression.
  process.env.ELECTRON_MIRROR = 'http://127.0.0.1:9/offline-test/';
  process.env.electron_config_cache = path.join(root, 'empty-cache');
  t.after(() => {
    for (const [name, value] of [['ELECTRON_MIRROR', before.mirror], ['electron_config_cache', before.cache]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  const source = path.join(root, 'source'); await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'package.json'), JSON.stringify({ name: 'offline-proof', version: '1.0.0', main: 'main.cjs' }));
  await fs.writeFile(path.join(source, 'main.cjs'), 'require("electron").app.quit();');
  await fs.writeFile(path.join(source, 'index.html'), '<h1>Synthetic offline delivery</h1>');
  return { root, job: { source, output: path.join(root, 'output'), archive: path.join(root, 'delivered.zip'),
    electronVersion: (await fs.readFile(path.join(runtime, 'version'), 'utf8')).trim(), name: 'offline-proof', appId: 'dev.fleetharness.offline-proof' } };
}

for (const bundled of [false, true]) test(`real packager produces an offline zip from ${bundled ? 'distributed resources' : 'development runtime'}`, { timeout: 240_000 }, async t => {
  const { root, job } = await fixture(t);
  if (bundled) {
    const config = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')).build;
    assert.ok(config.extraResources.some(resource => resource.from === 'node_modules/electron/dist' && resource.to === 'electron-runtime'));
    assert.ok(config.asarUnpack.includes('dist-electron/electron/package-runtime.js'));
    job.runtimeDirectory = path.join(root, 'resources', 'electron-runtime');
    await fs.cp(runtime, job.runtimeDirectory, { recursive: true, verbatimSymlinks: true });
    await fs.writeFile(path.join(job.runtimeDirectory, 'local-runtime-origin.txt'), 'bundled runtime selected');
  }
  await runPackageWorker(job, process.execPath, undefined, 230_000);
  assert.ok((await fs.stat(job.archive)).size > 1_000_000);
  const unpacked = path.join(root, 'unpacked');
  await extract(job.archive, { dir: unpacked });
  const app = process.platform === 'darwin' ? path.join(unpacked, 'offline-proof.app', 'Contents') : unpacked;
  const binary = process.platform === 'darwin' ? path.join(app, 'MacOS', 'offline-proof')
    : path.join(app, process.platform === 'win32' ? 'offline-proof.exe' : 'offline-proof');
  assert.ok((await fs.stat(binary)).size > 0);
  if (process.platform !== 'win32') assert.ok((await fs.stat(binary)).mode & 0o111);
  const asar = path.join(app, process.platform === 'darwin' ? 'Resources' : 'resources', 'app.asar');
  assert.equal(extractFile(asar, 'index.html').toString(), '<h1>Synthetic offline delivery</h1>');
  assert.match(await fs.readFile(path.join(unpacked, 'START-HERE.txt'), 'utf8'), /Unzip the entire download/);
  if (bundled) assert.equal(await fs.readFile(path.join(unpacked, 'local-runtime-origin.txt'), 'utf8'), 'bundled runtime selected');
  assert.equal(await fs.stat(process.env.electron_config_cache).then(() => true, () => false), false);
});

test('local cache lookup uses the exact release filename under the mirror hash', async t => {
  const { root } = await fixture(t), directory = path.join(process.env.electron_config_cache, 'a'.repeat(64));
  await fs.mkdir(directory, { recursive: true });
  const filename = `electron-v0.0.1-${process.platform}-${process.arch}.zip`;
  // This only tests discovery. The integration tests above execute the real archive and packager paths.
  await fs.writeFile(path.join(directory, filename), 'cache discovery fixture');
  assert.equal(await localElectronZip('0.0.1', path.join(root, 'staged')), directory);
  assert.equal(await localElectronZip('0.0.2', path.join(root, 'staged')), undefined);
});

test('missing local runtime and failed download return one actionable sentence', { timeout: 15_000 }, async t => {
  const { job } = await fixture(t);
  job.electronVersion = '0.0.0';
  await assert.rejects(runPackageWorker(job, process.execPath, undefined, 12_000), {
    message: 'No local Electron runtime was found and its download failed; reinstall AppYard with its bundled runtime or connect to the internet and retry.'
  });
});
