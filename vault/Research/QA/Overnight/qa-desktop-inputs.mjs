// Main executes this against a clean, already built checkout. No fixed commit.
// No real credential, provider call, build, installer or repository edit.
// node qa-desktop-inputs.mjs /absolute/landed-checkout /absolute/existing-results
import assert from 'node:assert/strict';
import { promises as fs, constants, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { get as httpGet } from 'node:http';
import { runInNewContext } from 'node:vm';

const connectionTabs = ['ChatGPT', 'API key', 'GenAI.mil', /^Other (?:model )?providers$/];
// Serialized into Electron's inspector/eval context. No module imports here:
// dynamic import there has no VM import callback. Compare URLs only in memory;
// never include their query strings or the retained first value in evidence.
function installOAuthProbe({ shell }) {
  let firstURL;
  globalThis.__qaOAuth = { openings: [], loopbackOrigin: null, reopenedSameURL: false, interceptorError: null };
  shell.openExternal = async value => {
    try {
      const url = new URL(value);
      if (firstURL === undefined) firstURL = value;
      else globalThis.__qaOAuth.reopenedSameURL = value === firstURL;
      globalThis.__qaOAuth.openings.push({ protocol: url.protocol, host: url.hostname, path: url.pathname });
      if (url.searchParams.has('redirect_uri')) {
        const callback = new URL(url.searchParams.get('redirect_uri'));
        if (callback.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(callback.hostname)) throw new Error('Expected owned loopback callback.');
        callback.hostname = '127.0.0.1'; globalThis.__qaOAuth.loopbackOrigin = callback.origin;
      }
    } catch (error) {
      globalThis.__qaOAuth.interceptorError = { name: error.name, code: error.code ?? 'QA_INTERCEPTOR_ERROR' };
      throw new Error('QA OAuth interceptor could not inspect routing metadata.');
    }
  };
}

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const payload = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.isBuffer(text) ? text : Buffer.from(text) });
const limit = 256 * 1024;
const cases = [
  { id: 'UNSUPPORTED-TYPE', files: [payload('sample.exe', 'synthetic text')], error: /supported text file/i },
  { id: 'FILE-SIZE-LIMIT', files: [payload('large.txt', Buffer.alloc(limit + 1, 120))], error: /256 KB/i },
  { id: 'INVALID-UTF8', files: [payload('encoding.txt', Buffer.from([0xc3, 0x28]))], error: /UTF-8/i },
  { id: 'EMPTY-FILE', files: [payload('empty.txt', '')], error: /empty|content/i },
  { id: 'BINARY-CONTENT', files: [payload('binary.txt', 'text\u0000more')], error: /binary|UTF-8/i },
  { id: 'COUNT-LIMIT', files: Array.from({ length: 11 }, (_, i) => payload(`item-${i}.txt`, 'synthetic')), error: /10.*inputs/i },
  { id: 'TOTAL-SIZE-LIMIT', files: [...Array.from({ length: 4 }, (_, i) => payload(`part-${i}.txt`, Buffer.alloc(limit, 120))), payload('extra.txt', 'x')], error: /1 MB/i },
  { id: 'ATOMIC-REJECTED-BATCH', files: [payload('valid.txt', 'synthetic valid input'), payload('invalid.txt', Buffer.from([0xff]))], error: /UTF-8/i },
];
function verdict(rows, error, stable, cleanup) {
  if (error || !stable || cleanup !== 'PASS' || rows.some(r => r.result === 'ERROR')) return 'ERROR';
  return rows.some(r => r.result === 'FAIL') ? 'FAIL' : rows.length ? 'PASS' : 'ERROR';
}
if (process.argv[2] === '--validate-only') {
  assert.equal(cases.find(c => c.id === 'TOTAL-SIZE-LIMIT').files.reduce((n, f) => n + f.buffer.length, 0), 1024 * 1024 + 1);
  assert.equal(cases.find(c => c.id === 'FILE-SIZE-LIMIT').files[0].buffer.length, limit + 1);
  assert.throws(() => new TextDecoder('utf-8', { fatal: true }).decode(cases.find(c => c.id === 'INVALID-UTF8').files[0].buffer));
  assert.equal(verdict([{ result: 'PASS' }], false, true, 'PASS'), 'PASS');
  assert.equal(verdict([{ result: 'PASS' }, { result: 'FAIL' }], false, true, 'PASS'), 'FAIL');
  assert.equal(verdict([{ result: 'PASS' }], false, false, 'PASS'), 'ERROR');
  assert.equal(verdict([{ result: 'PASS' }], false, true, 'UNCONFIRMED'), 'ERROR');
  assert.equal(verdict([{ result: 'PASS' }, { result: 'ERROR' }], false, true, 'PASS'), 'ERROR');
  const context = { URL, shell: {} };
  runInNewContext('(' + installOAuthProbe.toString() + ')({shell})', context);
  const syntheticURL = 'https://auth.openai.com/api/accounts/authorize?redirect_uri=http%3A%2F%2F127.0.0.1%3A12345%2Fauth%2Fcallback&state=qa-synthetic';
  await context.shell.openExternal(syntheticURL); await context.shell.openExternal(syntheticURL);
  assert.equal(context.__qaOAuth.reopenedSameURL, true);
  assert.equal(context.__qaOAuth.loopbackOrigin, 'http://127.0.0.1:12345');
  assert.equal(context.__qaOAuth.interceptorError, null);
  assert.equal(JSON.stringify(context.__qaOAuth).includes('qa-synthetic'), false, 'Authorization query data must never enter retained metadata.');
  await context.shell.openExternal(syntheticURL + '-changed'); assert.equal(context.__qaOAuth.reopenedSameURL, false);
  await assert.rejects(context.shell.openExternal('https://auth.openai.com/?redirect_uri=https%3A%2F%2Fexample.test'));
  assert.equal(context.__qaOAuth.interceptorError.code, 'QA_INTERCEPTOR_ERROR');
  console.log(JSON.stringify({ validationOnly: true, passed: true, rejectedInputCases: cases.map(c => c.id), oauthProbe: ['runs without import callback', 'same URL', 'changed URL detected', 'loopback metadata', 'queries not retained', 'bad callback recorded'], runtimeExecuted: false }));
  process.exit(0);
}
if (!process.argv[2] || !process.argv[3]) throw new Error('Supply a landed checkout and an existing output directory.');
const repo = await fs.realpath(process.argv[2]);
const base = await fs.realpath(process.argv[3]);
const relativeBase = path.relative(repo, base);
assert.ok(relativeBase.startsWith('..' + path.sep) || path.isAbsolute(relativeBase), 'Results must be outside the checkout.');
const output = path.join(base, 'desktop-inputs-' + randomUUID());
await fs.mkdir(output);
const resultPath = path.join(output, 'result.json');
const result = { schemaVersion: 1, suite: 'combined-desktop-inputs', startedAt: new Date().toISOString(), repo,
  revisionPolicy: 'Record supplied clean HEAD and compiled artifacts, with no fixed commit.',
  scope: 'Real Electron renderer, brief IPC persistence, and OAuth start/reopen/cancel with external opening intercepted. Key rejection uses a replaced IPC handler, proving UI behavior only, not authentication. No completed login or model access.',
  rows: [], pageErrors: [], result: 'ERROR' };
let app, page, root, watchdog;
const git = args => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sourceIdentity = () => ({ commit: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), tree: git(['rev-parse', 'HEAD^{tree}']), trackedStatus: git(['status', '--porcelain', '--untracked-files=no']) });
async function manifest(dir) {
  const files = [];
  async function walk(relative) {
    for (const entry of (await fs.readdir(path.join(dir, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) files.push({ path: name, sha256: hash(await fs.readFile(path.join(dir, name))) });
      else throw new Error('Unexpected nonregular build artifact: ' + name);
    }
  }
  await walk(''); return files;
}
async function buildIdentity() { return { frontend: await manifest(path.join(repo, 'dist')), backend: await manifest(path.join(repo, 'dist-electron')) }; }
async function poll(check, message, ms = 5000) {
  const end = Date.now() + ms;
  do { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 50)); } while (Date.now() < end);
  assert.fail(message);
}
function freshProbe(url) {
  return new Promise(resolve => {
    const request = httpGet(url, { agent: false, timeout: 1000 }, response => {
      response.resume(); response.once('end', () => resolve({ status: response.statusCode }));
      response.once('error', error => resolve({ errorCode: error.code || 'RESPONSE_ERROR' }));
    });
    request.once('timeout', () => { const error = new Error('Loopback probe timed out.'); error.code = 'PROBE_TIMEOUT'; request.destroy(error); });
    request.once('error', error => resolve({ errorCode: error.code || 'REQUEST_ERROR' }));
  });
}
async function row(id, fn) {
  const item = { id, startedAt: new Date().toISOString() }; result.rows.push(item);
  try { item.evidence = await fn(); item.result = 'PASS'; }
  catch (error) { item.result = error.code === 'ERR_ASSERTION' ? 'FAIL' : 'ERROR'; item.error = String(error.message).slice(0, 1600); item.requiresReceiptReview = true; }
  item.finishedAt = new Date().toISOString();
  try { await page.screenshot({ path: path.join(output, id + '.png'), timeout: 5000 }); item.screenshot = id + '.png'; }
  catch { item.screenshotUnavailable = true; }
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2) + '\n');
}
async function freshIntake() {
  const existing = page.getByRole('dialog', { name: 'New challenge', exact: true });
  if (await existing.isVisible()) await existing.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.locator('header.topbar').getByRole('button', { name: 'New challenge', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New challenge', exact: true }); await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Custom problem', exact: true }).click();
  const section = dialog.getByRole('region', { name: 'Data & inputs', exact: true }); await section.waitFor();
  // Newer UI retains unsaved drafts after closing. Reset only this owned case's
  // inputs through visible controls; closing a dialog need not discard a draft.
  const previousInputs = await section.getByRole('listitem').count();
  const remove = section.getByRole('button', { name: /^Remove / });
  if (previousInputs > 10 || await remove.count() !== previousInputs) throw new Error('Case setup could not identify the owned draft input controls.');
  for (let i = 0; i < previousInputs; i++) await remove.first().click();
  await poll(async () => await section.getByRole('listitem').count() === 0, 'Case setup did not remove previous inputs.');
  assert.equal(await section.getByRole('listitem').count(), 0, 'Each input case must start empty after explicit UI reset.');
  result.caseSetups ??= []; result.caseSetups.push({ at: new Date().toISOString(), removedInputCount: previousInputs, resetThroughUI: true });
  return { dialog, section, chooser: section.getByLabel('Attach data files', { exact: true }) };
}
async function attach(section, chooser, files) {
  await chooser.setInputFiles(files);
  await poll(async () => (await section.getAttribute('aria-busy')) === 'false', 'File read did not finish.');
}
async function selectConnectionTab(name) {
  const tab = page.getByRole('tablist', { name: 'Model connection', exact: true }).getByRole('tab', { name, exact: true });
  await tab.click(); assert.equal(await tab.getAttribute('aria-selected'), 'true');
  await page.getByRole('tabpanel', { name, exact: true }).waitFor();
}
try {
  const pkg = JSON.parse(await fs.readFile(path.join(repo, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'fleetharness'); assert.equal(pkg.main, 'dist-electron/electron/main.js');
  result.scriptSha256 = hash(await fs.readFile(fileURLToPath(import.meta.url)));
  result.sourceBefore = sourceIdentity();
  assert.equal(result.sourceBefore.trackedStatus, '', 'Use a completed clean checkout, not the live integration workspace.');
  result.buildBefore = await buildIdentity();
  assert.ok(result.buildBefore.frontend.some(f => f.path === 'index.html'));
  assert.ok(result.buildBefore.backend.some(f => f.path === path.join('electron', 'main.js')));
  const installedElectron = path.join(repo, 'node_modules', 'electron');
  const executablePath = path.join(installedElectron, 'dist', (await fs.readFile(path.join(installedElectron, 'path.txt'), 'utf8')).trim());
  await fs.access(executablePath, constants.X_OK);
  const { _electron: electron } = createRequire(path.join(repo, 'package.json'))('playwright');
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-input-boundaries-')); await fs.mkdir(path.join(root, 'pi'));
  watchdog = setTimeout(() => {
    result.result = 'ERROR'; result.error = 'Harness exceeded 240 seconds.';
    result.cleanup = 'UNCONFIRMED'; result.retainedTemporaryRoot = root; result.finishedAt = new Date().toISOString();
    try { app?.process()?.kill('SIGKILL'); } catch {}
    try { writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n'); } catch {}
    process.exit(2);
  }, 240000);
  app = await electron.launch({ executablePath, args: [repo], cwd: repo, timeout: 45000, env: {
    PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'en_US.UTF-8', TMPDIR: os.tmpdir(),
    FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: path.join(root, 'pi'),
  } });
  page = await app.firstWindow(); page.setDefaultTimeout(5000);
  page.on('pageerror', error => result.pageErrors.push(String(error.message).slice(0, 1000)));
  await page.locator('.app-shell').waitFor({ timeout: 45000 });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 900));
  // Install before entering any synthetic text. This cannot invoke real sign-in.
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('fleet:codex:connect-key');
    globalThis.__qaKeyInput = { calls: 0, exactSyntheticValue: false };
    ipcMain.handle('fleet:codex:connect-key', (_event, value) => {
      globalThis.__qaKeyInput.calls++; globalThis.__qaKeyInput.exactSyntheticValue = value === 'QA noncredential input';
      throw new Error('Synthetic sign-in rejection for UI verification.');
    });
  });
  await row('KEY-PASSWORD-AND-BLANK', async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await selectConnectionTab('API key');
    const input = page.getByPlaceholder('OpenAI API key', { exact: true });
    assert.equal(await input.getAttribute('type'), 'password'); assert.equal(await input.getAttribute('autocomplete'), 'off');
    assert.equal(await input.inputValue(), '');
    assert.equal(await page.getByRole('button', { name: 'Sign in with API key', exact: true }).isDisabled(), true);
    return { passwordType: true, emptySubmissionDisabled: true, realAuthentication: false };
  });
  await row('KEY-CLEARED-AFTER-REJECTION', async () => {
    await selectConnectionTab('API key');
    const input = page.getByPlaceholder('OpenAI API key', { exact: true }); await input.fill('QA noncredential input');
    await page.getByRole('button', { name: 'Sign in with API key', exact: true }).click();
    await page.getByText(/Synthetic sign-in rejection for UI verification/).waitFor();
    assert.equal(await input.inputValue(), '');
    assert.equal(await page.getByRole('button', { name: 'Sign in with API key', exact: true }).isDisabled(), true);
    const observed = await app.evaluate(() => globalThis.__qaKeyInput); assert.deepEqual(observed, { calls: 1, exactSyntheticValue: true });
    await page.getByRole('button', { name: 'Dismiss error', exact: true }).click();
    return { ...observed, rejectedBy: 'owned IPC fixture', inputCleared: true, realAuthentication: false };
  });
  await row('KEY-CLEARED-ON-ENGINE-CHANGE', async () => {
    await selectConnectionTab('API key');
    await page.getByPlaceholder('OpenAI API key', { exact: true }).fill('QA noncredential input');
    await selectConnectionTab(/^Other (?:model )?providers$/);
    assert.equal(await page.getByPlaceholder('Provider API key', { exact: true }).inputValue(), '');
    await selectConnectionTab('API key');
    assert.equal(await page.getByPlaceholder('OpenAI API key', { exact: true }).inputValue(), '');
    return { bothFieldsCleared: true, noSettingsSaved: true };
  });
  await row('OAUTH-START-REOPEN-CANCEL', async () => {
    await selectConnectionTab('ChatGPT');
    await app.evaluate(installOAuthProbe);
    const selfCheck = await app.evaluate(async ({ shell }) => {
      const value = 'https://auth.openai.com/api/accounts/authorize?redirect_uri=http%3A%2F%2F127.0.0.1%3A12345%2Fauth%2Fcallback&state=qa-synthetic';
      await shell.openExternal(value); await shell.openExternal(value);
      return { calls: globalThis.__qaOAuth.openings.length, sameURL: globalThis.__qaOAuth.reopenedSameURL,
        loopbackOrigin: globalThis.__qaOAuth.loopbackOrigin, interceptorError: globalThis.__qaOAuth.interceptorError };
    });
    try { assert.deepEqual(selfCheck, { calls: 2, sameURL: true, loopbackOrigin: 'http://127.0.0.1:12345', interceptorError: null }); }
    catch { throw new Error('QA OAuth interceptor self-check failed; no sign-in verdict is available.'); }
    await app.evaluate(installOAuthProbe); // Discard synthetic self-check state.
    const cancel = page.getByRole('button', { name: 'Cancel sign-in', exact: true });
    try {
      await page.getByRole('button', { name: 'Continue with ChatGPT', exact: true }).click();
      try { await cancel.waitFor({ timeout: 20000 }); }
      catch (error) {
        result.oauthStartDiagnostics = await app.evaluate(() => globalThis.__qaOAuth);
        throw error;
      }
      const opening = await app.evaluate(() => globalThis.__qaOAuth.openings[0]);
      assert.equal(opening.protocol, 'https:'); assert.equal(opening.host, 'auth.openai.com');
      const callback = await app.evaluate(() => globalThis.__qaOAuth.loopbackOrigin);
      assert.ok(callback, 'Login must establish its loopback callback.');
      const probe = callback + '/__qa_unknown_path__';
      assert.equal((await freshProbe(probe)).status, 404);
      const state = await page.evaluate(async () => {
        const account = (await window.fleetHarness.bootstrap()).chatgpt;
        return { status: account.status, containsCredentialFields: /authUrl|access_token|refresh_token|code_verifier|code_challenge/.test(JSON.stringify(account)) };
      });
      assert.deepEqual(state, { status: 'connecting', containsCredentialFields: false });
      for (const name of connectionTabs) assert.equal(await page.getByRole('tablist', { name: 'Model connection', exact: true }).getByRole('tab', { name, exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Reopen browser', exact: true }).click();
      assert.equal(await app.evaluate(() => globalThis.__qaOAuth.openings.length), 2);
      assert.equal(await app.evaluate(() => globalThis.__qaOAuth.reopenedSameURL), true, 'Reopen must use the same login URL.');
      await cancel.click(); await cancel.waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(async () => (await window.fleetHarness.bootstrap()).chatgpt.status), 'disconnected');
      // A timeout is not evidence of a closed listener. Require connection refusal.
      await poll(async () => (await freshProbe(probe)).errorCode === 'ECONNREFUSED', 'Cancelled login must close the owned callback listener.', 5000);
      return { interceptorSelfCheck: true, realLoopbackStartAndCancel: true, externalOpeningIntercepted: true, reopenCount: 2, sameLoginURL: true, listenerClosed: true, completedLogin: false };
    } finally {
      if (await cancel.isVisible()) { await cancel.click(); await cancel.waitFor({ state: 'hidden' }); }
    }
  });
  for (const test of cases) await row(test.id, async () => {
    const { section, chooser } = await freshIntake(); await attach(section, chooser, test.files);
    const alert = section.getByRole('alert'); await alert.waitFor(); assert.match(await alert.innerText(), test.error);
    assert.equal(await section.getByRole('listitem').count(), 0, 'Rejected batch must not add any input.');
    const rejection = await alert.innerText(); await attach(section, chooser, [payload('recovery.txt', 'synthetic valid recovery')]);
    await poll(async () => await section.getByRole('listitem').count() === 1, 'Valid attach after rejection did not recover.');
    assert.equal(await alert.count(), 0, 'Recovered input must clear the prior error.');
    return { rejection, batchAddedNothing: true, validRetrySucceeded: true };
  });
  await row('EXACT-TOTAL-SIZE-ACCEPTED', async () => {
    const { section, chooser } = await freshIntake();
    await attach(section, chooser, Array.from({ length: 4 }, (_, i) => payload(`boundary-${i}.txt`, Buffer.alloc(limit, 120))));
    await poll(async () => await section.getByRole('listitem').count() === 4, 'Exactly 1 MB total must be accepted.');
    assert.equal(await section.getByRole('alert').count(), 0);
    return { inputCount: 4, bytesEach: limit, totalBytes: 1024 * 1024 };
  });
  await row('EXACT-COUNT-ACCEPTED', async () => {
    const { section, chooser } = await freshIntake();
    await attach(section, chooser, Array.from({ length: 10 }, (_, i) => payload(`count-${i}.txt`, 'synthetic')));
    await poll(async () => await section.getByRole('listitem').count() === 10, 'Ten valid inputs must be accepted.');
    assert.equal(await section.getByRole('button', { name: 'Attach files', exact: true }).isDisabled(), true);
    assert.equal(await section.getByRole('button', { name: 'Paste data', exact: true }).isDisabled(), true);
    await section.getByRole('button', { name: 'Remove count-0.txt', exact: true }).click();
    assert.equal(await section.getByRole('button', { name: 'Attach files', exact: true }).isEnabled(), true);
    return { acceptedCount: 10, overflowControlsDisabled: true, removingOneReenablesAttach: true };
  });
  await row('VALID-INPUT-RENDERER-RELOAD', async () => {
    const { dialog, section, chooser } = await freshIntake(); const title = 'Synthetic input boundary ' + randomUUID();
    await dialog.getByLabel('Challenge title', { exact: true }).fill(title);
    await dialog.getByLabel('Problem statement', { exact: true }).fill('Use these synthetic text records to demonstrate attached data survives saving a brief.');
    const text = 'name,value\r\ncaf\u00e9,2\r\n'; await attach(section, chooser, [payload('sample.csv', text)]);
    await poll(async () => await section.getByRole('listitem').count() === 1, 'Valid UTF-8 input was not connected.');
    await dialog.getByRole('button', { name: 'Save challenge', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    const expected = [{ name: 'sample.csv', kind: 'file', content: text }];
    const read = () => page.evaluate(async title => (await window.fleetHarness.bootstrap()).state.projects.find(p => p.title === title)?.dataInputs, title);
    assert.deepEqual(await read(), expected); await page.reload(); await page.locator('.app-shell').waitFor(); assert.deepEqual(await read(), expected);
    return { createdThroughUI: true, readVia: 'read-only bootstrap IPC', exactUnicodeAndCRLF: true, retainedAfterRendererReload: true, mainProcessRestarted: false };
  });
  if (result.pageErrors.length) result.rows.push({ id: 'NO-UNHANDLED-RENDERER-ERRORS', result: 'FAIL', errors: result.pageErrors });
} catch (error) { result.error = String(error.message).slice(0, 2000); }
finally {
  try {
    if (result.sourceBefore && result.buildBefore) {
      result.sourceAfter = sourceIdentity(); result.buildAfter = await buildIdentity();
      result.identityStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter) && JSON.stringify(result.buildBefore) === JSON.stringify(result.buildAfter);
      assert.equal(result.scriptSha256, hash(await fs.readFile(fileURLToPath(import.meta.url))), 'Checker changed during execution.');
    }
  } catch (error) { result.error = String(error.message).slice(0, 2000); result.identityStable = false; }
  try {
    if (app) {
      const child = app.process();
      const closed = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve));
      await Promise.race([Promise.all([app.close(), closed]), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Owned Electron did not exit in 10 seconds.')), 10000); timer.unref(); })]);
    }
    result.cleanup = 'PASS'; if (root) await fs.rm(root, { recursive: true, force: true });
  } catch (error) {
    result.cleanup = 'UNCONFIRMED'; result.cleanupError = String(error.message).slice(0, 1000); result.retainedTemporaryRoot = root;
    try { app?.process()?.kill('SIGKILL'); } catch {}
  }
  clearTimeout(watchdog); result.result = verdict(result.rows, Boolean(result.error), result.identityStable === true, result.cleanup);
  result.finishedAt = new Date().toISOString(); await fs.writeFile(resultPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ result: result.result, cases: result.rows.length, resultPath, error: result.error }));
  process.exitCode = result.result === 'PASS' ? 0 : result.result === 'FAIL' ? 1 : 2;
}
