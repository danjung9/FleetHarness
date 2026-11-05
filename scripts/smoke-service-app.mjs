import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { extract } from '@electron-internal/extract-zip';
import { runPackageWorker } from '../dist-electron/electron/executable.js';
import { serviceAppFixture, packagedPaths, assertProcessesGone } from './service-app-fixture.mjs';

// Native-only: node scripts/smoke-service-app.mjs after build:electron.
// No model calls. This uses the real packager, service host, process scanner and browser.
const require = createRequire(import.meta.url);
const runtimeDirectory = path.join(path.dirname(require.resolve('electron/package.json')), 'dist');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-service-smoke-'));
const { staged } = await serviceAppFixture(root);
const archive = path.join(root, 'service.zip');
let generated, userData, pids, occupied;
const previousMirror = process.env.ELECTRON_MIRROR, previousCache = process.env.electron_config_cache;
process.env.ELECTRON_MIRROR = 'http://127.0.0.1:9/offline-test/';
process.env.electron_config_cache = path.join(root, 'empty-electron-cache');
try {
  await runPackageWorker({ ...staged, archive, output: path.join(root, 'output'), runtimeDirectory,
    electronVersion: (await fs.readFile(path.join(runtimeDirectory, 'version'), 'utf8')).trim() }, process.execPath);
  const unpacked = path.join(root, 'unpacked'); await extract(archive, { dir: unpacked });
  const { binary } = packagedPaths(unpacked, staged.name);
  // Everything is blocked except the app's own loopback address.
  const args = ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'];
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  async function launch() {
    generated = await electron.launch({ executablePath: binary, args, env, timeout: 45_000 });
    const page = await generated.firstWindow();
    await page.getByRole('heading', { name: 'Synthetic service notebook', exact: true }).waitFor({ timeout: 30_000 });
    assert.match(page.url(), /^http:\/\/127\.0\.0\.1:\d+\/$/, 'The real service page must be the window document.');
    userData = await generated.evaluate(({ app }) => app.getPath('userData'));
    pids = JSON.parse(await fs.readFile(path.join(userData, 'service/pids.json'), 'utf8'));
    assert.equal(pids.cwd, path.join(userData, 'service')); assert.equal(pids.data, pids.cwd);
    assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
    assert.equal(await page.evaluate(() => typeof window.process), 'undefined');
    assert.equal(await generated.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().contextIsolation), true);
    assert.equal(JSON.parse(await fs.readFile(path.join(userData, 'service/bound-address.json'), 'utf8')).address, '127.0.0.1');
    return page;
  }
  async function quit() {
    const current = pids;
    await generated.close(); generated = undefined;
    await assertProcessesGone(assert, current);
    const heartbeat = await fs.readFile(path.join(userData, 'service/heartbeat.txt'), 'utf8');
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(await fs.readFile(path.join(userData, 'service/heartbeat.txt'), 'utf8'), heartbeat);
  }
  let page = await launch();
  const firstOrigin = new URL(page.url()).origin;
  await page.getByLabel('Note', { exact: true }).fill('Synthetic offline note 37');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  assert.equal(await page.locator('output').textContent(), 'Synthetic offline note 37');
  await page.getByRole('link', { name: 'Open notebook', exact: true }).click();
  await page.waitForURL(firstOrigin + '/again');
  assert.equal(await page.locator('output').textContent(), 'Synthetic offline note 37');
  await page.evaluate(() => window.open('https://example.invalid/'));
  assert.equal(generated.windows().length, 1);
  await page.evaluate(() => { location.href = 'https://example.invalid/'; });
  await page.waitForTimeout(250);
  assert.equal(new URL(page.url()).origin, firstOrigin);
  const second = spawn(binary, args, { env, stdio: 'ignore' });
  const secondExit = once(second, 'exit');
  const timer = setTimeout(() => second.kill('SIGKILL'), 10_000);
  const [secondCode] = await secondExit; clearTimeout(timer);
  assert.equal(secondCode, 0, 'A second launch must exit without another service.');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(userData, 'service/pids.json'), 'utf8')), pids);
  await quit();
  page = await launch();
  assert.equal(new URL(page.url()).origin, firstOrigin);
  assert.equal(await page.getByLabel('Note', { exact: true }).inputValue(), 'Synthetic offline note 37');
  assert.equal(await page.locator('output').textContent(), 'Synthetic offline note 37');
  await quit();
  // Occupying the saved port must produce an explicit notice and persist the new choice.
  occupied = createServer();
  await new Promise((resolve, reject) => { occupied.once('error', reject); occupied.listen(Number(new URL(firstOrigin).port), '127.0.0.1', resolve); });
  page = await launch();
  const movedOrigin = new URL(page.url()).origin;
  assert.notEqual(movedOrigin, firstOrigin);
  assert.match(await generated.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle()), /local address changed/);
  await quit();
  await fs.writeFile(path.join(userData, 'service/fail-start'), 'synthetic startup failure');
  generated = await electron.launch({ executablePath: binary, args, env, timeout: 45_000 });
  const errorPage = await generated.firstWindow();
  await errorPage.getByText('The app could not start; close it and open it again.', { exact: true }).waitFor({ timeout: 30_000 });
  pids = JSON.parse(await fs.readFile(path.join(userData, 'service/pids.json'), 'utf8'));
  await quit();
  await new Promise(resolve => occupied.close(resolve)); occupied = undefined;
  await fs.rm(path.join(userData, 'service/fail-start'));
  page = await launch();
  assert.equal(new URL(page.url()).origin, movedOrigin, 'Do not silently revert the saved origin.');
  assert.match(await generated.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle()), /local address changed/);
  await quit();
  assert.equal(await fs.stat(process.env.electron_config_cache).then(() => true, () => false), false);
  console.log(JSON.stringify({ passed: true, offlinePackage: true, servicePage: true, storageAcrossRestart: true,
    secondInstance: true, processCleanup: true, loopbackOnly: true, originChangeNotice: true, rendererIsolation: true, startupFailureMessage: true }, null, 2));
} finally {
  if (generated) { await generated.close(); if (pids) await assertProcessesGone(assert, pids); }
  if (occupied) await new Promise(resolve => occupied.close(resolve));
  if (userData) await fs.rm(userData, { recursive: true, force: true });
  await fs.rm(root, { recursive: true, force: true });
  if (previousMirror === undefined) delete process.env.ELECTRON_MIRROR; else process.env.ELECTRON_MIRROR = previousMirror;
  if (previousCache === undefined) delete process.env.electron_config_cache; else process.env.electron_config_cache = previousCache;
}
