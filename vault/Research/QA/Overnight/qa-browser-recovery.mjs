#!/usr/bin/env node
// Owned QA fixture. Preparation may execute only --validate-only.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const KEY = 'fleet-browser-preview';
const CASES = [
  { id: 'absent-storage', seed: null },
  { id: 'malformed-json', seed: '{' },
  { id: 'wrong-shape-object', seed: '{}' },
  { id: 'missing-settings', seed: JSON.stringify({ version: 1, projects: [] }) },
  { id: 'settings-wrong-type', seed: JSON.stringify({ version: 1, projects: [], settings: 'synthetic-invalid-settings' }) },
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const runFile = promisify(execFile);
const LIMIT_MS = 180000, UI_MS = 8000;

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--validate-only') return { validateOnly: true };
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--repo', '--output'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--') || result[key.slice(2)]) throw Error('Use --repo ABSOLUTE_REPO --output EXISTING_OUTPUT_DIRECTORY, or --validate-only.');
    result[key.slice(2)] = args[i + 1];
  }
  if (!result.repo || !result.output || !path.isAbsolute(result.repo) || !path.isAbsolute(result.output)) throw Error('Both --repo and --output must be absolute paths.');
  return result;
}
function inside(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
function seedPreviewState({ key, seed, marker, origin }) {
  if (location.origin !== origin || window.top !== window) return;
  if (sessionStorage.getItem(marker) === '1') return;
  if (seed === null) localStorage.removeItem(key);
  else localStorage.setItem(key, seed);
  sessionStorage.setItem(marker, '1');
}
function localRequest(url, origin) {
  try { return new URL(url).origin === origin; } catch { return false; }
}
function summarize(cases, errors, drift) {
  // Positive controls never replace an initial result.
  if (errors.length || drift) return 'ERROR';
  return cases.length === CASES.length && cases.every(item => item.status === 'PASS' && (!item.manualClearControl || item.manualClearControl.status === 'PASS')) ? 'PASS' : 'FAIL';
}
function validateOnly() {
  assert.equal(CASES.length, 5); assert.equal(new Set(CASES.map(c => c.id)).size, 5);
  assert.throws(() => JSON.parse(CASES[1].seed));
  assert.deepEqual(JSON.parse(CASES[2].seed), {});
  assert.equal(JSON.parse(CASES[3].seed).settings, undefined);
  assert.equal(typeof JSON.parse(CASES[4].seed).settings, 'string');
  const passing = CASES.map(c => ({ id: c.id, status: 'PASS' }));
  assert.equal(summarize(passing, [], false), 'PASS');
  assert.equal(summarize([{ status: 'FAIL', manualClearControl: { status: 'PASS' } }, ...passing.slice(1)], [], false), 'FAIL');
  assert.equal(summarize(passing.slice(1), [], false), 'FAIL');
  assert.equal(summarize(passing, ['setup failed'], false), 'ERROR');
  assert.equal(summarize(passing, [], true), 'ERROR');
  assert.equal(localRequest('http://127.0.0.1:1234/assets/app.js', 'http://127.0.0.1:1234'), true);
  for (const url of ['https://example.test/a', 'http://127.0.0.1:1235/a', 'http://localhost:1234/a']) assert.equal(localRequest(url, 'http://127.0.0.1:1234'), false);
  assert.equal(inside('/a/dist', '/a/dist-other/file'), false);
  assert.equal(inside('/a/dist', '/a/dist/assets/file'), true);
  const storage = () => { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }; };
  const localStorage = storage(), sessionStorage = storage(), window = {}; window.top = window;
  const context = vm.createContext({ localStorage, sessionStorage, window, location: { origin: 'http://127.0.0.1:1234' } });
  const seed = vm.runInContext('(' + seedPreviewState.toString() + ')', context);
  const options = { key: KEY, seed: '{}', marker: 'once', origin: context.location.origin };
  seed(options); assert.equal(localStorage.getItem(KEY), '{}');
  localStorage.removeItem(KEY); seed(options);
  assert.equal(localStorage.getItem(KEY), null, 'manual-clear reload must not reseed');
  seed({ ...options, marker: 'different-origin', origin: 'http://127.0.0.1:9999' });
  assert.equal(localStorage.getItem(KEY), null);
  assert.deepEqual(parseArgs(['--repo', '/repo', '--output', '/output']), { repo: '/repo', output: '/output' });
  assert.throws(() => parseArgs(['--repo', '/repo']));
  assert.throws(() => parseArgs(['--repo', '/repo', '--output', '/out', '--validate-only']));
  console.log(JSON.stringify({ status: 'PASS', mode: 'validate-only', controls: ['five distinct cases', 'manual clearing cannot upgrade FAIL', 'missing cases fail', 'setup and drift produce ERROR', 'external requests denied', 'path boundary', 'seed once across reload', 'CLI validation'], browserLaunched: false, listenerOpened: false, filesWritten: false }));
}
async function git(repo, ...args) {
  return (await runFile('git', ['-C', repo, ...args], { timeout: 10000, maxBuffer: 1024 * 1024, encoding: 'utf8' })).stdout.trimEnd();
}
async function distManifest(dist) {
  const result = {};
  async function walk(directory) {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw Error('Symlink in built dist: ' + path.relative(dist, filename));
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile()) { const bytes = await fs.readFile(filename); result[path.relative(dist, filename).split(path.sep).join('/')] = { bytes: bytes.length, sha256: sha(bytes) }; }
      else throw Error('Unsupported entry in dist.');
    }
  }
  if ((await fs.lstat(dist)).isSymbolicLink()) throw Error('dist must not be a symlink.');
  await walk(dist);
  if (!result['index.html']) throw Error('Existing built dist/index.html is required. No build is performed.');
  return result;
}
async function identity(repo, dist) {
  return { head: await git(repo, 'rev-parse', 'HEAD'), tree: await git(repo, 'rev-parse', 'HEAD^{tree}'),
    status: await git(repo, 'status', '--porcelain=v1', '--untracked-files=normal'), trackedStatus: await git(repo, 'status', '--porcelain=v1', '--untracked-files=no'),
    sourceApiSHA256: sha(await fs.readFile(path.join(repo, 'src/api.ts'))), dist: await distManifest(dist) };
}
function mime(filename) {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon' })[path.extname(filename)] || 'application/octet-stream';
}
async function startServer(dist, manifest, errors) {
  const server = createServer((request, response) => {
    void (async () => {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      let relative;
      try { relative = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html'; }
      catch { response.writeHead(400).end(); return; }
      if (!Object.hasOwn(manifest, relative)) { response.writeHead(404).end(); return; }
      const filename = path.resolve(dist, relative);
      if (!inside(dist, filename) || (await fs.lstat(filename)).isSymbolicLink()) throw Error('Invalid static artifact path.');
      const bytes = await fs.readFile(filename);
      if (sha(bytes) !== manifest[relative].sha256) throw Error('Built artifact changed while serving: ' + relative);
      response.writeHead(200, { 'content-type': mime(filename), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    })().catch(error => { errors.push(String(error.message)); if (!response.headersSent) response.writeHead(500); response.end(); });
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, origin: 'http://127.0.0.1:' + server.address().port };
}
async function visible(locator) { return await locator.first().isVisible().catch(() => false); }
async function mounted(page) {
  return await visible(page.locator('.app-shell')) && await visible(page.getByRole('region', { name: 'Home workspace', exact: true }))
    && await visible(page.getByRole('heading', { name: 'AppYard', exact: true })) && await visible(page.getByRole('button', { name: 'Settings', exact: true }));
}
async function waitForMounted(page) {
  const until = Date.now() + UI_MS;
  while (Date.now() < until) { if (await mounted(page)) return true; await new Promise(resolve => setTimeout(resolve, 100)); }
  return false;
}
async function exerciseHome(page) {
  // Scope explicitly: Home and topbar both expose New challenge.
  await page.getByRole('region', { name: 'Home workspace', exact: true }).getByRole('button', { name: 'New challenge', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New challenge', exact: true });
  await dialog.waitFor({ state: 'visible', timeout: UI_MS });
  await dialog.getByLabel('Challenge title', { exact: true }).fill('Synthetic browser recovery control');
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await dialog.waitFor({ state: 'hidden', timeout: UI_MS });
}
async function appRecovery(page, item) {
  if (await waitForMounted(page)) { await exerciseHome(page); return { status: 'PASS', path: 'mounted-and-interactive' }; }
  const control = page.getByRole('button', { name: /^(Retry|Reset (?:saved workspace|browser preview|stored record|storage)|Clear saved data|Recover workspace|Start fresh)$/i });
  if (await control.count() === 1 && await visible(control) && await control.isEnabled()) {
    item.recoveryControl = (await control.innerText()).slice(0, 120); await control.click();
    if (await waitForMounted(page)) { await exerciseHome(page); return { status: 'PASS', path: 'application-recovery-control', control: item.recoveryControl }; }
  }
  return { status: 'FAIL', path: 'no-usable-application-recovery', shellVisible: await visible(page.locator('.app-shell')), loadingVisible: await visible(page.locator('.loading-screen')), recoveryControl: item.recoveryControl ?? null };
}
async function runCase(browser, origin, output, specification, aborted, started) {
  const item = { id: specification.id, status: 'FAIL', seed: specification.seed, expected: 'Interactive AppYard Home, directly or through an application recovery control.', pageerrors: [], blockedRequests: [], dialogs: [] };
  started(item); // Retain partial evidence even if screenshot or infrastructure capture fails.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  try {
    await context.route('**/*', async route => {
      const request = route.request(); if (localRequest(request.url(), origin)) return route.continue();
      let url; try { url = new URL(request.url()); } catch { /* Invalid requests are denied. */ }
      item.blockedRequests.push({ method: request.method(), origin: url?.origin ?? 'invalid', pathname: url?.pathname ?? '' });
      await route.abort('blockedbyclient');
    });
    await context.routeWebSocket('**/*', route => {
      const url = new URL(route.url());
      item.blockedRequests.push({ method: 'WEBSOCKET', origin: url.origin, pathname: url.pathname });
      route.close({ code: 1008, reason: 'Static local preview fixture permits no WebSocket connections.' });
    });
    await context.addInitScript(seedPreviewState, { key: KEY, seed: specification.seed, marker: 'qa-browser-seeded-' + specification.id, origin });
    const page = await context.newPage(); page.setDefaultTimeout(UI_MS); page.setDefaultNavigationTimeout(15000);
    let phase = 'initial';
    page.on('pageerror', error => item.pageerrors.push({ phase, message: error.message, stack: error.stack }));
    page.on('dialog', dialog => { item.dialogs.push({ phase, type: dialog.type(), message: dialog.message().slice(0, 500) }); void (dialog.type() === 'confirm' ? dialog.accept() : dialog.dismiss()).catch(() => {}); });
    try { await page.goto(origin + '/', { waitUntil: 'load' }); Object.assign(item, await appRecovery(page, item)); }
    catch (error) { item.status = 'FAIL'; item.uiFailure = String(error.message); }
    if (aborted()) throw Error('Run deadline exceeded.');
    await page.screenshot({ path: path.join(output, specification.id + '-initial.png'), fullPage: true, timeout: UI_MS });
    item.initialScreenshot = specification.id + '-initial.png';
    if (specification.seed !== null) {
      // Diagnostic positive control, never application recovery. The init marker remains set.
      phase = 'manual-clear-control';
      item.manualClearControl = { status: 'FAIL', mechanism: 'QA removeItem then reload, without reseeding. Not application recovery.' };
      try {
        await page.evaluate(key => localStorage.removeItem(key), KEY); await page.reload({ waitUntil: 'load' });
        if (await waitForMounted(page)) { await exerciseHome(page); item.manualClearControl.status = 'PASS'; }
      } catch (error) { item.manualClearControl.uiFailure = String(error.message); }
      await page.screenshot({ path: path.join(output, specification.id + '-manual-clear-control.png'), fullPage: true, timeout: UI_MS });
      item.manualClearControl.screenshot = specification.id + '-manual-clear-control.png';
    }
  } finally { await context.close(); }
  return item;
}
async function main(options) {
  const report = { schemaVersion: 1, startedAt: new Date().toISOString(), status: 'ERROR', storageKey: KEY, cases: [], errors: [], artifactDrift: false,
    execution: 'Existing dist only; loopback Chrome with browser sandbox enabled; synthetic inputs; no model calls.',
    buildProvenance: 'HEAD, source and served dist bytes are recorded independently. Main supplies the already built checkout; this fixture does not rebuild or establish source-to-dist equivalence.' };
  let browser, browserServer, server, output, deadline, repo, dist; let timedOut = false;
  const checkDeadline = () => { if (timedOut) throw Error('Run deadline exceeded.'); };
  let rejectRun;
  const expired = new Promise((_, reject) => { rejectRun = reject; deadline = setTimeout(() => { timedOut = true; reject(Error('Overall 180-second deadline exceeded.')); }, LIMIT_MS); });
  const interrupt = signal => { timedOut = true; rejectRun(Error('Interrupted by ' + signal + '.')); };
  const onInt = () => interrupt('SIGINT'), onTerm = () => interrupt('SIGTERM'), onHup = () => interrupt('SIGHUP');
  process.once('SIGINT', onInt); process.once('SIGTERM', onTerm); process.once('SIGHUP', onHup);
  try {
    await Promise.race([(async () => {
      repo = await fs.realpath(options.repo); dist = path.join(repo, 'dist');
      const outputRoot = await fs.realpath(options.output);
      if (!(await fs.stat(outputRoot)).isDirectory() || inside(repo, outputRoot)) throw Error('Output must be an existing directory outside the supplied repo.');
      output = path.join(outputRoot, 'browser-recovery-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8));
      await fs.mkdir(output); report.output = output;
      const packageInfo = JSON.parse(await fs.readFile(path.join(repo, 'package.json'), 'utf8'));
      if (packageInfo.name !== 'fleetharness' || packageInfo.build?.productName !== 'AppYard') throw Error('App-name sanity failed: expected fleetharness / AppYard.');
      report.app = { name: packageInfo.name, version: packageInfo.version, productName: packageInfo.build.productName };
      report.scriptSHA256 = sha(await fs.readFile(fileURLToPath(import.meta.url))); report.repo = repo;
      report.before = await identity(repo, dist); checkDeadline();
      if (report.before.trackedStatus) throw Error('Tracked changes or unresolved merge: a clean landed tree is required.');
      const source = await fs.readFile(path.join(repo, 'src/api.ts'), 'utf8');
      if (!source.includes(KEY)) throw Error('Actual src/api.ts no longer contains the reviewed storage key.');
      const html = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
      if (!/AppYard/i.test(html)) throw Error('Built index.html lacks the AppYard sanity marker.');
      const require = createRequire(path.join(repo, 'package.json')), playwrightFile = require.resolve('playwright');
      if (!inside(path.join(repo, 'node_modules'), await fs.realpath(playwrightFile))) throw Error('Playwright must be installed inside the supplied repository.');
      report.playwright = JSON.parse(await fs.readFile(require.resolve('playwright/package.json'), 'utf8')).version;
      const { chromium } = await import(pathToFileURL(playwrightFile).href); checkDeadline();
      const serving = await startServer(dist, report.before.dist, report.errors); server = serving.server; report.origin = serving.origin;
      checkDeadline();
      // launchServer exposes an owned browser process for bounded close/kill cleanup.
      const launched = await chromium.launchServer({ channel: 'chrome', host: '127.0.0.1', headless: true, chromiumSandbox: true,
        handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false, timeout: 30000 });
      if (timedOut) { await launched.kill(); throw Error('Deadline during browser launch.'); }
      browserServer = launched; report.browserPID = launched.process().pid;
      browser = await chromium.connect(launched.wsEndpoint(), { timeout: 10000 }); checkDeadline();
      for (const specification of CASES) { checkDeadline(); await runCase(browser, serving.origin, output, specification, () => timedOut, item => report.cases.push(item)); }
    })(), expired]);
  } catch (error) { report.errors.push(String(error.stack || error)); }
  finally {
    clearTimeout(deadline);
    const boundedCleanup = async (work, label) => {
      let timer;
      try { await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label + ' timed out.')), 10000); })]); return true; }
      catch (error) { report.errors.push(String(error.message)); return false; }
      finally { clearTimeout(timer); }
    };
    if (browserServer) {
      if (!await boundedCleanup(() => browserServer.close(), 'Browser cleanup')) await boundedCleanup(() => browserServer.kill(), 'Owned browser kill');
      report.browserExit = { exitCode: browserServer.process().exitCode, signalCode: browserServer.process().signalCode };
      if (report.browserExit.exitCode === null && report.browserExit.signalCode === null) report.errors.push('Owned browser exit is unconfirmed.');
    } else if (browser) await boundedCleanup(() => browser.close(), 'Browser cleanup');
    if (server) { server.closeAllConnections(); await boundedCleanup(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())), 'Server cleanup'); }
    if (repo && dist && report.before) {
      try { report.after = await identity(repo, dist); report.artifactDrift = JSON.stringify(report.before) !== JSON.stringify(report.after); if (report.after.trackedStatus) report.errors.push('Tracked checkout is no longer clean.'); }
      catch (error) { report.errors.push('Final identity failed: ' + error.message); }
    }
    report.status = summarize(report.cases, report.errors, report.artifactDrift); report.finishedAt = new Date().toISOString();
    if (output) { try { await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); } catch (error) { report.status = 'ERROR'; report.errors.push('Receipt write failed: ' + error.message); } }
    console.log(JSON.stringify(report, null, 2)); process.exitCode = report.status === 'PASS' ? 0 : report.status === 'FAIL' ? 1 : 2;
    process.removeListener('SIGINT', onInt); process.removeListener('SIGTERM', onTerm); process.removeListener('SIGHUP', onHup);
  }
}
try { const options = parseArgs(process.argv.slice(2)); if (options.validateOnly) validateOnly(); else await main(options); }
catch (error) { console.error(JSON.stringify({ status: 'ERROR', error: String(error.message) })); process.exitCode = 2; }
