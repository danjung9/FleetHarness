import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { extract } from '@electron-internal/extract-zip';
import { extractFile } from '@electron/asar';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { serviceAppFixture, packagedPaths, assertProcessesGone } from '../scripts/service-app-fixture.mjs';
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

test('offline packaged Node service uses its bundled runtime and stops its detached child', { timeout: 240_000 }, async t => {
  const { root, job } = await fixture(t);
  const staging = path.join(root, 'service-staging'); await fs.mkdir(staging);
  const { staged, runtime: contract } = await serviceAppFixture(staging);
  Object.assign(job, staged);
  await runPackageWorker(job, process.execPath, undefined, 200_000);
  const unpacked = path.join(root, 'service-unpacked');
  await extract(job.archive, { dir: unpacked });
  const { binary, source } = packagedPaths(unpacked, job.name);
  assert.equal((await fs.stat(path.join(source, 'application/server.cjs'))).isFile(), true);
  assert.equal(await fs.stat(path.join(source, 'application/index.html')).then(() => true, () => false), false);
  const driver = path.join(root, 'drive-service.cjs');
  await fs.writeFile(driver, `const path=require('node:path');
const [source,data,appId,contract]=process.argv.slice(2);
const host=require(path.join(source,'standalone-service.cjs'))({appId,runtime:JSON.parse(contract),payloadHash:'test'},path.join(source,'application'),data,process.execPath,path.join(source,'process-sweep.mjs'));
process.on('message',async message=>{if(message==='stop'){try{await host.stop();process.disconnect()}catch{process.exitCode=1;process.disconnect()}}});
host.start().then(ready=>process.send(ready),async()=>{process.exitCode=1;await host.stop();process.disconnect()});`);
  const child = spawn(binary, [driver, source, path.join(root, 'user-data'), staged.appId, JSON.stringify(contract)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ELECTRON_NO_ASAR: '1', PATH: '' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc']
  });
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
  const exited = once(child, 'exit');
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.send('stop'); await exited; } });
  const [ready] = await Promise.race([once(child, 'message'), exited.then(() => { throw new Error('Packaged service driver exited: ' + stderr); })]);
  assert.match(ready.origin, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.equal((await fetch(ready.origin + '/ready')).status, 200);
  assert.match(await (await fetch(ready.origin + '/')).text(), /Synthetic service notebook/);
  const pids = JSON.parse(await fs.readFile(path.join(ready.directory, 'pids.json'), 'utf8'));
  assert.equal(await fs.realpath(pids.cwd), await fs.realpath(ready.directory)); assert.equal(await fs.realpath(pids.data), await fs.realpath(ready.directory));
  assert.equal(JSON.parse(await fs.readFile(path.join(ready.directory, 'bound-address.json'), 'utf8')).address, '127.0.0.1');
  const heartbeatFile = path.join(ready.directory, 'heartbeat.txt');
  let before = '';
  for (let attempt = 0; !before && attempt < 50; attempt++) {
    before = await fs.readFile(heartbeatFile, 'utf8').catch(() => '');
    if (!before) await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ok(before, 'The child must be running before shutdown.');
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.ok((await fs.readFile(heartbeatFile, 'utf8')).length > before.length);
  child.send('stop');
  const [code] = await exited;
  assert.equal(code, 0, stderr);
  await assertProcessesGone(assert, pids);
  const heartbeat = await fs.readFile(path.join(ready.directory, 'heartbeat.txt'), 'utf8');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(await fs.readFile(path.join(ready.directory, 'heartbeat.txt'), 'utf8'), heartbeat);
  await assert.rejects(fetch(ready.origin + '/ready'));
  assert.equal(await fs.stat(process.env.electron_config_cache).then(() => true, () => false), false);
});
