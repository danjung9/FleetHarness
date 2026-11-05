// Native delivery checker. Main owns runtime execution.
import assert from 'node:assert/strict';
import { promises as fs, constants, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

// node qa-native-delivery.mjs REPO EXISTING_OUTPUT [--chrome EXECUTABLE]
// No fixed commit. Local provider AND judge are deterministic fixtures.
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const self = fileURLToPath(import.meta.url), stamp = () => new Date().toISOString();
const need = (condition, message) => { if (!condition) throw new Error(message); };
const inside = (root, file) => { const r = path.relative(root, file); return r !== '' && r !== '..' && !r.startsWith('..' + path.sep) && !path.isAbsolute(r); };
const fixtureNames = ['mock-provider.mjs', 'quality-fixture.mjs', 'solution-fixture.mjs', 'data-fixture.mjs', 'visual-review-fixture.mjs'];
const rowIds = ['NATIVE-COMPLETE-BUILD', 'REVIEW-EVIDENCE', 'NATIVE-PREVIEW-CHANGED-INPUTS', 'HUMAN-REVIEW-GATES', 'STALE-APPROVAL-DENIED', 'RESTORED-SOURCE-APPROVED', 'STALE-EXPORT-DENIED', 'ACTUAL-SOURCE-EXPORT', 'FRESH-EXPORTED-COPY', 'FINAL-NATIVE-STATE'];
const denialText = 'Artifacts changed after verification. Start a new run before approving or exporting.';
const acknowledgment = 'I inspected the application, test evidence, and limitations.';
const reviewNotes = 'Exercised changed synthetic TASK inputs, empty-input recovery, persisted draft behavior and visible evidence. This approves only the local prototype fixture; operational readiness remains unverified.';
// Independently authored literals. No generated test, solver or report supplies answers.
const previewCases = [
  { id: 'P1', input: 'TASK: inspect synthetic valve 47', output: 'inspect synthetic valve 47', draft: 'Synthetic review draft: inspect synthetic valve 47. Publication requires owner approval.' },
  { id: 'P2', input: 'TASK: stage blue training crates', output: 'stage blue training crates', draft: 'Synthetic review draft: stage blue training crates. Publication requires owner approval.' },
  { id: 'P3', input: '', output: 'Enter a message.' },
  { id: 'P4', input: 'TASK: audit training row 19', output: 'audit training row 19', draft: 'Synthetic review draft: audit training row 19. Publication requires owner approval.' }
];
const exportCases = [
  { id: 'E1', input: 'TASK: count fictional orange bins 28', output: 'count fictional orange bins 28', draft: 'Synthetic review draft: count fictional orange bins 28. Publication requires owner approval.' },
  { id: 'E2', input: 'TASK: label synthetic pallet 63', output: 'label synthetic pallet 63', draft: 'Synthetic review draft: label synthetic pallet 63. Publication requires owner approval.' },
  { id: 'E3', input: '', output: 'Enter a message.' },
  { id: 'E4', input: 'TASK: inspect invented panel 91', output: 'inspect invented panel 91', draft: 'Synthetic review draft: inspect invented panel 91. Publication requires owner approval.' }
];
function checkObservations(cases, observations) {
  assert.equal(observations.length, cases.length, 'Every independent input needs an observation.');
  for (let i = 0; i < cases.length; i++) {
    const expected = cases[i], actual = observations[i];
    assert.equal(actual.id, expected.id); assert.equal(actual.input, expected.input);
    assert.equal(actual.output, expected.output, 'Incorrect current result for ' + expected.id);
    assert.equal(actual.draftImmediatelyAfterParse, '', 'Parsing must invalidate the previous review draft.');
    if (expected.draft !== undefined) assert.equal(actual.draftAfterPrepare, expected.draft);
  }
}
const reviewGate = (notes, ack) => typeof notes === 'string' && notes.trim().length >= 10 && ack === true;
function guardState(p) { return { id: p.id, runId: p.runId, workspace: p.workspace, status: p.status, report: p.report, verification: p.verification, approval: p.approval, approvedAt: p.approvedAt, exportedTo: p.exportedTo, reviewHistory: p.reviewHistory, feedback: p.feedback, stages: p.stages }; }
function assertDenied(before, after, error, chooserDelta, destinations) {
  assert.ok(typeof error === 'string' && error.includes(denialText), 'Expected explicit stale-source denial.');
  assert.deepEqual(guardState(after), guardState(before), 'A denied action must not approve, export or change its evidence.');
  assert.equal(chooserDelta, 0, 'Deny stale evidence before the folder chooser.'); assert.deepEqual(destinations, [], 'Denied export must not create a delivery directory.');
}
function behaviorVerdict(rows) { if (rows.some(r => r.result === 'FAIL')) return 'FAIL'; return rows.length === rowIds.length && rows.every(r => r.result === 'PASS') ? 'PASS' : 'ERROR'; }
const finalVerdict = (behavior, errors, stable, cleanup) => errors.length || stable !== true || cleanup !== 'PASS' ? 'ERROR' : behavior;
// Independent v2 source-record framing, for byte identity only.
function sourceHasher() {
  const h = createHash('sha256').update('AppYard source hash v2\0');
  return { add(name, bytes) { const key = Buffer.from(name), lengths = Buffer.alloc(8); lengths.writeUInt32BE(key.length, 0); lengths.writeUInt32BE(bytes.length, 4); h.update(lengths).update(key).update(bytes); }, finish: () => h.digest('hex') };
}
function sourceDigest(files) { const h = sourceHasher(); for (const f of files) h.add(f.path, f.contents); return h.finish(); }
function summarizeRequest(body, index) {
  const text = m => typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map(p => p?.text || '').join('\n') : '';
  const prompt = (body.messages || []).filter(m => m?.role === 'user' && !(Array.isArray(m.content) && m.content.some(p => p?.type === 'image_url'))).map(text).join('\n');
  let phase = 'unknown';
  if (body.tools?.some(t => t.function?.name === 'judge_read')) phase = 'judge';
  else if (prompt.includes('Implementation is complete.')) phase = 'guide';
  else if (prompt.includes('The independent test run failed')) phase = 'repair';
  else for (const [marker, name] of [['implementation', 'build'], ['verification', 'verify'], ['synthetic data', 'data'], ['intake', 'intake'], ['research', 'research'], ['planning', 'plan']]) if (prompt.includes('You are the ' + marker + ' agent')) { phase = name; break; }
  return { index, phase, model: body.model, sha256: sha(JSON.stringify(body)), messageCount: body.messages?.length, deterministicLocalProvider: true };
}
if (process.argv[2] === '--validate-only') {
  for (const cases of [previewCases, exportCases]) {
    const good = cases.map(c => ({ id: c.id, input: c.input, output: c.output, draftImmediatelyAfterParse: '', ...(c.draft ? { draftAfterPrepare: c.draft } : {}) })); checkObservations(cases, good);
    for (const override of [{ output: 'inspect pump' }, { output: good[0].output }, { draftImmediatelyAfterParse: 'old draft' }, { draftAfterPrepare: 'constant draft' }, { output: undefined }]) assert.throws(() => checkObservations(cases, good.map(o => ({ ...o, ...override }))));
    assert.throws(() => checkObservations(cases, good.slice(1)));
  }
  for (const [notes, ack, expected] of [['', false, false], ['', true, false], ['short', true, false], [reviewNotes, false, false], [reviewNotes, true, true]]) assert.equal(reviewGate(notes, ack), expected);
  const p = { id: 'p', runId: 'r', status: 'review', stages: [{ id: 'review', status: 'review' }], report: { sourceHash: 'a' } };
  assertDenied(p, structuredClone(p), denialText, 0, []);
  assert.throws(() => assertDenied(p, { ...p, status: 'approved' }, denialText, 0, [])); assert.throws(() => assertDenied(p, p, 'Export failed.', 0, []));
  assert.throws(() => assertDenied(p, p, denialText, 1, [])); assert.throws(() => assertDenied(p, p, denialText, 0, ['copy']));
  const a = sourceDigest([{ path: 'ab', contents: Buffer.from('c') }]); assert.notEqual(a, sourceDigest([{ path: 'a', contents: Buffer.from('bc') }])); assert.notEqual(a, sourceDigest([{ path: 'ab', contents: Buffer.from('changed') }]));
  assert.equal(inside('/owned', '/owned/work'), true); assert.equal(inside('/owned', '/owned-other/work'), false);
  const passes = rowIds.map(id => ({ id, result: 'PASS' })); assert.equal(behaviorVerdict(passes), 'PASS'); assert.equal(behaviorVerdict(passes.slice(1)), 'ERROR'); assert.equal(behaviorVerdict([...passes.slice(1), { result: 'FAIL' }]), 'FAIL');
  assert.equal(finalVerdict('PASS', [], true, 'PASS'), 'PASS'); assert.equal(finalVerdict('FAIL', [], true, 'PASS'), 'FAIL');
  for (const args of [['PASS', ['setup'], true, 'PASS'], ['PASS', [], false, 'PASS'], ['FAIL', [], true, 'UNCONFIRMED']]) assert.equal(finalVerdict(...args), 'ERROR');
  console.log(JSON.stringify({ validationOnly: true, passed: true, nativeExecuted: false, listenersOpened: false, controls: ['literal independent parser answers', 'canned/stale/missing result rejection', 'draft invalidation', 'notes and acknowledgment', 'denial/no mutation', 'source framing', 'ownership', 'verdict sensitivity'] })); process.exit(0);
}

const result = { schemaVersion: 1, suite: 'native-complete-review-source-delivery', startedAt: stamp(), result: 'ERROR', behaviorVerdict: 'ERROR',
  scope: 'Actual native UI build, preview, review and source export using a deterministic local provider and judge. Independent literal parser answers in native preview and a fresh offline exported-copy browser. No live model, authentication, independent substantive judge assessment, packaged executable, human acceptance or operational-readiness claim.',
  identityPolicy: 'Clean supplied HEAD and stable complete dist/dist-electron hashes. Identifies existing compiled bytes; does not prove they were built from that HEAD.',
  rows: rowIds.map(id => ({ id, result: 'NOT RUN' })), errors: [], pageErrors: [], exportPageErrors: [], snapshots: [], tampers: [], ownedProcesses: [] };
let repo, output, resultPath, root, fixture, app, page, browserServer, browser, context, exportPage, electron, chromium, executablePath, chromePath;
let projectId, built, approved, delivered, activeTamper, watchdog, shutdown = false, runMayBeActive = false, launchUnconfirmed = false, interrupted = false, cleaning = false;
const childHandles = [], providerSockets = new Set();
const signalHandlers = new Map(['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => [signal, () => { interrupted = true; result.errors.push('Harness interrupted by ' + signal + '.'); }]));
for (const [signal, handler] of signalHandlers) process.on(signal, handler);
const save = async () => { if (resultPath) await fs.writeFile(resultPath, JSON.stringify(result, null, 2) + '\n'); };
const allowlistedEnv = () => ({ PATH: process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin', LANG: 'en_US.UTF-8', TMPDIR: os.tmpdir() });
async function bounded(promise, ms, message) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]); } finally { clearTimeout(timer); } }
async function poll(check, message, ms = 12000) { const end = Date.now() + ms; do { need(!shutdown && (!interrupted || cleaning), 'Harness shutdown requested.'); if (await check()) return; await new Promise(resolve => setTimeout(resolve, 100)); } while (Date.now() < end); throw new Error(message); }
async function regularFile(rootPath, relative, max = 128 * 1024 * 1024) {
  const target = path.resolve(rootPath, relative); need(inside(rootPath, target), 'Evidence escaped its declared root.'); let cursor = rootPath;
  for (const part of path.relative(rootPath, target).split(path.sep)) { cursor = path.join(cursor, part); const stat = await fs.lstat(cursor); need(!stat.isSymbolicLink() && (cursor === target ? stat.isFile() : stat.isDirectory()), 'Evidence requires ordinary files and directories.'); }
  const handle = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { const stat = await handle.stat(); need(stat.isFile() && stat.size <= max, 'Evidence is not ordinary or exceeds bound.'); const bytes = await handle.readFile(); need(bytes.length <= max, 'Evidence grew past bound.'); return bytes; } finally { await handle.close(); }
}
async function fileManifest(directory, artifactMode = false) {
  const stat = await fs.lstat(directory); need(stat.isDirectory() && !stat.isSymbolicLink(), 'Manifest root must be ordinary.'); const names = [], ignored = new Set(['node_modules', '.git', '.pi', '.DS_Store']);
  async function walk(relative) {
    for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
      if (/^(?:\.env(?:\..*)?|auth\.json|credentials(?:\.json)?|id_(?:rsa|ed25519))$/i.test(entry.name)) throw new Error('Unexpected credential-like file in artifact tree.');
      if (entry.isSymbolicLink()) throw new Error('Symlink in artifact tree.'); if (artifactMode && ignored.has(entry.name)) continue;
      const name = path.join(relative, entry.name); if (entry.isDirectory()) await walk(name);
      else { need(entry.isFile(), 'Nonregular artifact.'); names.push(name); need(names.length <= 10000, 'Artifact count exceeded bound.'); }
    }
  }
  await walk(''); names.sort((a, b) => a.localeCompare(b)); const files = [], source = sourceHasher(); let bytesTotal = 0;
  for (const name of names) { const bytes = await regularFile(directory, name); bytesTotal += bytes.length; need(bytesTotal <= 512 * 1024 * 1024, 'Artifact tree exceeded byte bound.'); files.push({ path: name, bytes: bytes.length, sha256: sha(bytes) }); if (artifactMode && !['test-report.json', 'review.json', 'DELIVERY.md'].includes(name)) source.add(name, bytes); }
  return artifactMode ? { files, sourceHash: source.finish() } : files;
}
const sourceFiles = m => m.files.filter(f => !['test-report.json', 'review.json', 'DELIVERY.md'].includes(f.path));
const git = args => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sourceIdentity = () => ({ commit: git(['rev-parse', 'HEAD']), tree: git(['rev-parse', 'HEAD^{tree}']), branch: git(['branch', '--show-current']), status: git(['status', '--porcelain', '--untracked-files=normal']) });
async function dependencyIdentity() {
  const paths = ['package.json', 'package-lock.json', ...fixtureNames.map(n => 'scripts/' + n), 'node_modules/playwright/package.json', 'node_modules/playwright/index.js', 'node_modules/playwright-core/package.json', 'node_modules/electron/package.json', 'node_modules/electron/path.txt', 'node_modules/@earendil-works/pi-coding-agent/package.json']; const files = [];
  for (const name of paths) { const bytes = await regularFile(repo, name); files.push({ path: name, sha256: sha(bytes), ...(name.endsWith('package.json') ? { version: JSON.parse(bytes.toString('utf8')).version } : {}) }); }
  for (const [kind, absolute] of [['electron-executable', executablePath], ['chrome-executable', chromePath]]) if (absolute) files.push({ path: absolute, kind, sha256: sha(await regularFile(path.dirname(absolute), path.basename(absolute), 512 * 1024 * 1024)) });
  return { node: process.version, platform: process.platform, arch: process.arch, files, limit: 'Package manifests, lockfile, fixture modules, Playwright entry and executable hashes. Not every installed dependency or runtime framework file.' };
}
async function identity() { return { source: sourceIdentity(), frontend: await fileManifest(path.join(repo, 'dist')), backend: await fileManifest(path.join(repo, 'dist-electron')), dependencies: await dependencyIdentity(), scriptSha256: sha(await fs.readFile(self)) }; }
async function ownedWorkspace(p) { need(root && typeof p.workspace === 'string' && inside(path.join(root, 'state', 'workspaces'), p.workspace), 'Workspace is outside owned profile.'); need(await fs.realpath(p.workspace) === p.workspace, 'Workspace contains a path alias.'); return p.workspace; }
async function project() {
  const p = await page.evaluate(async id => {
    const p = (await window.fleetHarness.bootstrap()).state.projects.find(p => p.id === id); if (!p) return null;
    return { id: p.id, title: p.title, runId: p.runId, workspace: p.workspace, status: p.status, stages: p.stages.map(s => ({ id: s.id, status: s.status })), report: p.report, verification: p.verification, approval: p.approval, approvedAt: p.approvedAt, feedback: p.feedback, reviewHistory: p.reviewHistory, exportedTo: p.exportedTo, executable: p.executable, runtimeProfile: p.runtimeProfile, processCleanup: p.processScope?.cleanup, processRunId: p.processScope?.runId, writerState: p.runCheckpoint?.writerState, error: p.error };
  }, projectId);
  need(p && Array.isArray(p.stages), 'Owned project unavailable through read-only bootstrap.'); result.lastObservedProject = p; return p;
}
async function snapshot(label, target = page) {
  const name = String(result.snapshots.length + 1).padStart(3, '0') + '-' + label;
  const record = { label, at: stamp(), dom: name + '.dom.json', screenshot: name + '.png' }; result.snapshots.push(record); let captureError;
  if (target) {
    const dom = await target.evaluate(() => ({ url: location.href, title: document.title, text: document.body.innerText,
      controls: [...document.querySelectorAll('button,input,textarea,select')].map(e => ({ tag: e.tagName, text: e.textContent, type: e.getAttribute('type'), ariaLabel: e.getAttribute('aria-label'), disabled: e.disabled, checked: e.type === 'checkbox' ? e.checked : undefined, value: e.type === 'password' ? '[not recorded]' : 'value' in e ? e.value : undefined })), frames: [...document.querySelectorAll('iframe')].map(e => ({ title: e.title, src: e.src })) }));
    await fs.writeFile(path.join(output, record.dom), JSON.stringify(dom, null, 2) + '\n');
    try { await target.screenshot({ path: path.join(output, record.screenshot), timeout: 6000, animations: 'disabled' }); } catch (error) { record.screenshotUnavailable = String(error.message).slice(0, 300); delete record.screenshot; captureError = error; }
  }
  if (page && projectId) { record.project = name + '.project.json'; await fs.writeFile(path.join(output, record.project), JSON.stringify(await project(), null, 2) + '\n'); }
  result.providerRequests = fixture?.requests.map(summarizeRequest) ?? []; await save();
  if (captureError) throw new Error('Required screenshot failed for ' + label + ': ' + captureError.message);
  return record;
}
async function row(id, fn) {
  need(!interrupted, 'Harness shutdown requested.');
  const item = result.rows.find(r => r.id === id); item.startedAt = stamp(); item.evidence = {}; let failure;
  try { await fn(item.evidence); item.result = 'PASS'; } catch (error) { item.result = error.code === 'ERR_ASSERTION' ? 'FAIL' : 'ERROR'; item.error = String(error.message).slice(0, 1800); failure = error; }
  item.finishedAt = stamp(); try { item.observation = await snapshot(id); } catch (error) { item.captureError = String(error.message).slice(0, 500); result.errors.push('Receipt capture failed for ' + id + ': ' + item.captureError); if (!failure) { item.result = 'ERROR'; failure = error; } }
  await save(); if (failure) { failure.recorded = true; throw failure; }
}
function registerChild(child, kind) { childHandles.push(child); const r = { kind, pid: child.pid, launchedAt: stamp() }; result.ownedProcesses.push(r); child.once('exit', (code, signal) => Object.assign(r, { exitedAt: stamp(), code, signal })); }
async function closeApp() { if (!app) return; const current = app, child = current.process(); const exited = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve)); await bounded(Promise.all([current.close(), exited]), 15000, 'Owned Electron close/exit unconfirmed.'); app = undefined; page = undefined; }
const chooserCalls = async () => await app.evaluate(() => globalThis.__qaDeliveryChooserCalls ?? []);
async function navigate(name) { await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name, exact: true }).click(); await page.getByRole('heading', { name, exact: true }).waitFor(); }
async function parserJourney(target, cases, evidence, screenshotPage, prefix, reload) {
  evidence.observations = []; await target.getByLabel('Message', { exact: true }).waitFor();
  for (const c of cases) {
    const actual = { id: c.id, input: null, output: null, at: stamp() }; evidence.observations.push(actual);
    await target.getByLabel('Message', { exact: true }).fill(c.input); actual.input = await target.getByLabel('Message', { exact: true }).inputValue(); await target.getByRole('button', { name: 'Parse message', exact: true }).click();
    actual.output = await target.locator('#result').textContent(); actual.draftImmediatelyAfterParse = await target.locator('#review-result').textContent();
    if (c.draft !== undefined) { await target.getByRole('button', { name: 'Prepare synthetic review draft', exact: true }).click(); actual.draftAfterPrepare = await target.locator('#review-result').textContent(); }
    actual.renderedBodyText = await target.locator('body').innerText(); actual.capture = await snapshot(prefix + '-' + c.id, screenshotPage);
  }
  checkObservations(cases, evidence.observations); await reload(); await target.getByLabel('Message', { exact: true }).waitFor();
  evidence.afterReload = { output: await target.locator('#result').textContent(), draft: await target.locator('#review-result').textContent() };
  assert.equal(evidence.afterReload.output, cases.at(-1).output); assert.equal(evidence.afterReload.draft, cases.at(-1).draft); await snapshot(prefix + '-RELOADED', screenshotPage);
}
async function beginTamper(label, p) {
  const workspace = await ownedWorkspace(p); need(p.status !== 'running' && p.writerState === 'idle', 'Do not tamper with active writer.');
  const original = await regularFile(workspace, 'index.html'), modified = Buffer.concat([original, Buffer.from('\n<!-- synthetic QA stale-source probe ' + label + ' -->\n')]);
  const record = { label, path: 'index.html', beforeSha256: sha(original), tamperedSha256: sha(modified), at: stamp(), denialObserved: false, restored: false }; activeTamper = { workspace, original, modified, record }; result.tampers.push(record);
  const file = await fs.open(path.join(workspace, 'index.html'), constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW); try { await file.writeFile(modified); await file.sync(); } finally { await file.close(); }
  assert.equal(sha(await regularFile(workspace, 'index.html')), record.tamperedSha256); assert.notEqual(record.beforeSha256, record.tamperedSha256); await save();
}
async function restoreTamper(cleanupOnly = false) {
  if (!activeTamper) return; const t = activeTamper; need(cleanupOnly || t.record.denialObserved, 'Positive retry requires measured denial.'); assert.equal(sha(await regularFile(t.workspace, 'index.html')), t.record.tamperedSha256, 'Workspace changed during tamper observation.');
  const file = await fs.open(path.join(t.workspace, 'index.html'), constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW); try { await file.writeFile(t.original); await file.sync(); } finally { await file.close(); }
  t.record.restoredSha256 = sha(await regularFile(t.workspace, 'index.html')); assert.equal(t.record.restoredSha256, t.record.beforeSha256); Object.assign(t.record, { restored: true, restoredAt: stamp(), cleanupOnly }); activeTamper = undefined; await save();
}
async function staleAction(label, buttonName, evidence) {
  const before = await project(), callsBefore = (await chooserCalls()).length; evidence.before = before;
  evidence.manifestBefore = await fileManifest(await ownedWorkspace(before), true); assert.equal(evidence.manifestBefore.sourceHash, before.report.sourceHash); assert.deepEqual(await fs.readdir(path.join(output, 'exports')), []);
  await beginTamper(label, before); evidence.tampered = await fileManifest(before.workspace, true); assert.notEqual(evidence.tampered.sourceHash, before.report.sourceHash);
  await snapshot(label + '-TAMPERED-BEFORE-ACTION'); await page.getByRole('button', { name: buttonName, exact: true }).click(); let after, message = '';
  await poll(async () => { after = await project(); message = await page.locator('.error-banner').count() ? await page.locator('.error-banner').innerText() : ''; return Boolean(message) || JSON.stringify(guardState(after)) !== JSON.stringify(guardState(before)); }, 'Stale action produced neither captured denial nor state transition.');
  evidence.after = after; evidence.error = message; evidence.chooserDelta = (await chooserCalls()).length - callsBefore; evidence.destinations = await fs.readdir(path.join(output, 'exports'));
  await snapshot(label + '-DENIAL-BEFORE-RESTORE');
  if (message && !message.includes(denialText) && JSON.stringify(guardState(after)) === JSON.stringify(guardState(before)) && evidence.chooserDelta === 0 && !evidence.destinations.length) throw new Error('Stale-source guard was not established; another precondition or changed error contract blocked the action: ' + message);
  assertDenied(before, after, message, evidence.chooserDelta, evidence.destinations);
  activeTamper.record.denialObserved = true; activeTamper.record.denialAt = stamp(); await restoreTamper(); evidence.restored = await fileManifest(before.workspace, true);
  assert.deepEqual(sourceFiles(evidence.restored), sourceFiles(evidence.manifestBefore)); assert.equal(evidence.restored.sourceHash, before.report.sourceHash);
  await page.getByRole('button', { name: 'Dismiss error', exact: true }).click(); await poll(async () => await page.getByRole('button', { name: buttonName, exact: true }).isEnabled(), 'Action not retryable after restoration.');
}

try {
  // A setup failure still gets a receipt. Invalid output uses an explicitly
  // reported temporary directory and never creates files inside the product.
  let base;
  try { need(process.argv[2], 'Supply a clean compiled checkout.'); repo = await fs.realpath(process.argv[2]); result.repo = repo; } catch (error) { result.errors.push(String(error.message)); }
  try { need(process.argv[3], 'Supply an existing output directory.'); base = await fs.realpath(process.argv[3]); need((await fs.stat(base)).isDirectory(), 'Output is not a directory.'); need(!repo || (base !== repo && !inside(repo, base)), 'Output must be outside checkout.'); }
  catch (error) { base = await fs.mkdtemp(path.join(os.tmpdir(), 'native-delivery-setup-')); result.errors.push(String(error.message)); result.setupReceiptFallback = true; }
  output = path.join(base, 'native-delivery-' + randomUUID()); await fs.mkdir(output); resultPath = path.join(output, 'result.json'); result.output = output; await save();
  need(result.errors.length === 0, 'Argument setup failed; see retained receipt.');
  need(process.argv.length === 4 || (process.argv.length === 6 && process.argv[4] === '--chrome'), 'Usage: node qa-native-delivery.mjs REPO EXISTING_OUTPUT [--chrome EXECUTABLE]');
  const pkg = JSON.parse((await regularFile(repo, 'package.json')).toString('utf8')); need(pkg.name === 'fleetharness' && pkg.main === 'dist-electron/electron/main.js', 'Unsupported desktop checkout.');
  const electronDist = path.join(repo, 'node_modules', 'electron', 'dist'); executablePath = path.resolve(electronDist, (await regularFile(repo, 'node_modules/electron/path.txt')).toString('utf8').trim());
  need(inside(electronDist, executablePath) && inside(electronDist, await fs.realpath(executablePath)), 'Installed Electron path escaped package.'); await fs.access(executablePath, constants.X_OK);
  const chromeCandidates = process.argv[5] ? [process.argv[5]] : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/google-chrome', '/opt/google/chrome/chrome'];
  for (const candidate of chromeCandidates) { try { const actual = await fs.realpath(candidate); await fs.access(actual, constants.X_OK); chromePath = actual; break; } catch {} }
  need(chromePath, 'Existing Chrome not found. Supply --chrome; no installation is performed.');
  result.before = await identity(); need(result.before.source.status === '', 'A clean completed checkout is required.');
  need(result.before.frontend.some(f => f.path === 'index.html') && result.before.backend.some(f => f.path === path.join('electron', 'main.js')), 'Compiled application files are missing.');
  const require = createRequire(path.join(repo, 'package.json')); need(inside(path.join(repo, 'node_modules'), await fs.realpath(require.resolve('playwright'))), 'Playwright must already be installed inside checkout.');
  ({ _electron: electron, chromium } = require('playwright'));
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-native-delivery-'))); result.ownedTemporaryRoot = root; await fs.mkdir(path.join(root, 'pi')); await fs.mkdir(path.join(output, 'exports'));
  watchdog = setTimeout(() => {
    shutdown = true; result.errors.push('Hard 600-second harness deadline exceeded.'); result.behaviorVerdict = behaviorVerdict(result.rows); result.result = 'ERROR'; result.cleanup = 'UNCONFIRMED'; result.finishedAt = stamp();
    for (const socket of providerSockets) socket.destroy(); try { fixture?.server.closeAllConnections(); fixture?.server.close(); } catch {}
    for (const child of childHandles) if (child.exitCode === null && child.signalCode === null) { try { child.kill('SIGKILL'); } catch {} }
    result.retainedTemporaryRoot = root; try { writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n'); } catch {} process.exit(2);
  }, 600000);
  const providerModule = await import(pathToFileURL(path.join(repo, 'scripts/mock-provider.mjs')).href), fixtureModule = await import(pathToFileURL(path.join(repo, 'scripts/quality-fixture.mjs')).href);
  need(typeof providerModule.startFixtureProvider === 'function' && typeof fixtureModule.qualityFixtureProject?.description === 'string' && Array.isArray(fixtureModule.qualityFixtureProject.criteria), 'Fixture API changed.');
  fixture = await providerModule.startFixtureProvider(); const origin = new URL(fixture.baseUrl); need(origin.protocol === 'http:' && origin.hostname === '127.0.0.1', 'Fixture must bind owned loopback.');
  fixture.server.on('connection', socket => { providerSockets.add(socket); socket.once('close', () => providerSockets.delete(socket)); });
  const config = JSON.stringify({ providers: { 'fleet-fixture': { baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only', models: [{ id: 'fixture-model', name: 'Native delivery fixture', reasoning: false, input: ['text', 'image'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] } } });
  await fs.writeFile(path.join(root, 'pi', 'models.json'), config); result.fixture = { origin: origin.origin, configurationSha256: sha(config), syntheticCredentialOnly: true, model: 'fixture-model', deterministicProvider: true, deterministicJudge: true, brief: fixtureModule.qualityFixtureProject };
  launchUnconfirmed = true; app = await electron.launch({ executablePath, args: [repo], cwd: repo, timeout: 45000, env: { ...allowlistedEnv(), FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: path.join(root, 'pi') } });
  registerChild(app.process(), 'electron'); launchUnconfirmed = false; page = await app.firstWindow({ timeout: 45000 }); page.setDefaultTimeout(10000); page.on('pageerror', e => result.pageErrors.push(String(e.message).slice(0, 900))); await page.locator('.app-shell').waitFor({ timeout: 45000 });
  // Sole behavior hook: native folder chooser. Production IPC, report and approval stay intact.
  await app.evaluate(({ dialog }, destination) => {
    globalThis.__qaDeliveryChooserCalls = [];
    dialog.showOpenDialog = async (...args) => {
      const options = args.at(-1), call = { at: new Date().toISOString(), title: options?.title, properties: options?.properties }; globalThis.__qaDeliveryChooserCalls.push(call);
      if (options?.title !== 'Choose a delivery folder' || JSON.stringify(options?.properties) !== JSON.stringify(['openDirectory', 'createDirectory'])) { call.rejected = true; return { canceled: true, filePaths: [] }; }
      return { canceled: false, filePaths: [destination] };
    };
  }, path.join(output, 'exports'));
  await row('NATIVE-COMPLETE-BUILD', async evidence => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await page.getByRole('tablist', { name: 'Model connection', exact: true }).getByRole('tab', { name: 'Other providers', exact: true }).click();
    const panel = page.getByRole('tabpanel', { name: 'Other providers', exact: true }); await panel.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture'); await panel.getByLabel('Model', { exact: true }).selectOption('fixture-model');
    await panel.getByRole('button', { name: 'Save model settings', exact: true }).click(); await page.getByText('Model settings saved.', { exact: true }).waitFor();
    await page.locator('header.topbar').getByRole('button', { name: 'New challenge', exact: true }).click(); const intake = page.getByRole('dialog', { name: 'New challenge', exact: true }); await intake.getByRole('button', { name: 'Custom problem', exact: true }).click();
    const title = 'Synthetic native delivery ' + randomUUID(); result.projectTitle = title; await intake.getByLabel('Challenge title', { exact: true }).fill(title); await intake.getByLabel('Problem statement', { exact: true }).fill(fixtureModule.qualityFixtureProject.description);
    await intake.getByLabel('Evaluation criteria (optional)', { exact: false }).fill(fixtureModule.qualityFixtureProject.criteria.join('\n')); await intake.getByRole('button', { name: 'Save challenge', exact: true }).click(); await intake.waitFor({ state: 'hidden' });
    projectId = await page.evaluate(async title => (await window.fleetHarness.bootstrap()).state.projects.find(p => p.title === title)?.id, title); need(typeof projectId === 'string', 'UI-created project not saved.');
    await navigate('Brief'); await page.getByRole('button', { name: 'Save & start build', exact: true }).click(); runMayBeActive = true; await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Start automatic build', exact: true }).click();
    evidence.stageObservations = []; let last = '';
    await poll(async () => {
      const p = await project(), key = JSON.stringify({ status: p.status, stages: p.stages, cleanup: p.processCleanup });
      if (key !== last) { evidence.stageObservations.push({ at: stamp(), status: p.status, stages: p.stages, processCleanup: p.processCleanup, error: p.error }); last = key; await snapshot('BUILD-STAGE-' + evidence.stageObservations.length); }
      if (['failed', 'stopped'].includes(p.status)) assert.fail('Native build terminated at ' + p.status + ': ' + (p.error || 'see stage evidence'));
      if (p.status === 'review' && p.verification && p.processCleanup === 'confirmed') { built = p; return true; } return false;
    }, 'Complete native build did not reach review within 240 seconds.', 240000);
    runMayBeActive = false; assert.deepEqual(['intake', 'research', 'plan', 'build', 'verify'].map(id => built.stages.find(s => s.id === id)?.status), Array(5).fill('complete')); assert.equal(built.stages.find(s => s.id === 'review')?.status, 'review');
    assert.equal(built.processCleanup, 'confirmed'); assert.equal(built.processRunId, built.runId); assert.equal(built.writerState, 'idle'); assert.equal(built.runtimeProfile, 'browser');
    assert.equal(built.report?.exitCode, 0); assert.ok(built.report.passed > 0); assert.equal(built.report.failed, 0); assert.equal(built.report.skipped, 0); assert.equal(built.report.passed, built.report.total);
    assert.equal(built.report.quality?.status, 'passed'); assert.equal(built.report.quality?.package?.status, 'passed'); assert.equal(built.report.quality?.solutionEvaluation?.status, 'passed'); assert.equal(built.report.independentJudge?.verdict, 'SATISFACTORY', 'This is a canned local judge verdict.');
    assert.equal(built.verification?.runId, built.runId); assert.equal(built.verification?.reportHash, sha(JSON.stringify(built.report, null, 2))); evidence.artifacts = await fileManifest(await ownedWorkspace(built), true); assert.equal(evidence.artifacts.sourceHash, built.report.sourceHash);
    evidence.project = built; evidence.providerRequests = fixture.requests.map(summarizeRequest); result.requestsAtBuildComplete = fixture.requests.length;
    for (const phase of ['intake', 'research', 'plan', 'build', 'verify', 'guide', 'judge']) need(evidence.providerRequests.some(r => r.phase === phase), 'Missing expected fixture ' + phase + ' requests.'); await navigate('Review');
  });
  await row('REVIEW-EVIDENCE', async evidence => {
    evidence.summary = await page.locator('.review-check-result').innerText(); assert.ok(evidence.summary.includes('Automated checks passed')); assert.ok(evidence.summary.includes('Node tests: ' + built.report.passed + ' passed'));
    assert.ok(evidence.summary.includes(built.report.failed + ' failed') && evidence.summary.includes(built.report.skipped + ' skipped')); const journeys = built.report.quality.journeys;
    assert.ok(evidence.summary.includes('Browser journeys: ' + journeys.filter(j => j.status === 'passed').length + '/' + journeys.length + ' passed'));
    await page.locator('details.review-evidence > summary').click(); await page.getByRole('region', { name: 'Requirement and browser evidence', exact: true }).waitFor();
    evidence.requirements = await page.locator('.quality-evidence').innerText(); evidence.limitations = await page.locator('.review-limitations').innerText(); assert.ok(evidence.limitations.includes('Operational readiness is unverified.'));
    if (!built.report.quality.requirementsMet) assert.ok(evidence.requirements.includes('Prototype approval does not accept or complete the unverified requirements.'));
    for (const criterion of built.report.quality.criteria) { assert.ok(evidence.requirements.includes(criterion.criterionId)); assert.ok(evidence.requirements.includes(criterion.requirement)); }
    await page.locator('details.output-details > summary').click(); await page.locator('details.output-details pre').waitFor(); evidence.testOutput = await page.locator('details.output-details pre').textContent(); assert.equal(evidence.testOutput, built.report.output); evidence.reportIsNotIndependentApplicationOracle = true;
  });
  await row('NATIVE-PREVIEW-CHANGED-INPUTS', async evidence => {
    await page.getByRole('button', { name: 'Open preview', exact: true }).click(); const preview = page.frameLocator('iframe[title="Generated application preview"]');
    await parserJourney(preview, previewCases, evidence, page, 'PREVIEW', async () => {
      const handle = await page.locator('iframe[title="Generated application preview"]').elementHandle(), old = await handle.contentFrame();
      const detached = page.waitForEvent('framedetached', { predicate: frame => frame === old, timeout: 10000 }); await page.getByRole('button', { name: 'Reload preview', exact: true }).click(); await detached;
    });
    evidence.frame = await page.locator('iframe[title="Generated application preview"]').getAttribute('src'); need(/^https?:\/\/127\.0\.0\.1(?::\d+)?\//.test(evidence.frame || '') || (evidence.frame || '').startsWith('file:'), 'Unexpected preview origin.'); await navigate('Review');
  });
  await row('HUMAN-REVIEW-GATES', async evidence => {
    const notes = page.getByLabel('Review notes', { exact: true }), ack = page.getByLabel(acknowledgment, { exact: true }), approve = page.getByRole('button', { name: 'Approve prototype', exact: true }); evidence.gates = [];
    for (const [note, checked] of [['', false], ['', true], ['short', true], [reviewNotes, false], [reviewNotes, true]]) {
      await notes.fill(note); await ack.setChecked(checked); const actual = { notes: await notes.inputValue(), acknowledgment: await ack.isChecked(), disabled: await approve.isDisabled() }; evidence.gates.push(actual); assert.equal(actual.disabled, !reviewGate(note, checked)); await snapshot('REVIEW-GATE-' + evidence.gates.length);
    }
    await navigate('Deliver'); await page.getByRole('heading', { name: 'Review comes first', exact: true }).waitFor(); assert.equal(await page.getByRole('button', { name: 'Export source & evidence', exact: true }).count(), 0); assert.equal(await page.getByRole('button', { name: 'Download app', exact: true }).count(), 0); evidence.unapprovedDeliveryBlocked = true;
    await navigate('Review'); assert.equal(await notes.inputValue(), reviewNotes); assert.equal(await ack.isChecked(), true); assert.equal(await approve.isEnabled(), true);
  });
  await row('STALE-APPROVAL-DENIED', evidence => staleAction('APPROVAL', 'Approve prototype', evidence));
  await row('RESTORED-SOURCE-APPROVED', async evidence => {
    await page.getByRole('button', { name: 'Approve prototype', exact: true }).click(); await page.getByRole('heading', { name: 'Deliver', exact: true }).waitFor(); approved = await project();
    assert.equal(approved.status, 'approved'); assert.ok(approved.approvedAt); assert.equal(approved.feedback, reviewNotes); assert.equal(approved.approval?.runId, built.runId); assert.equal(approved.approval?.sourceHash, built.report.sourceHash); assert.equal(approved.approval?.reportHash, built.verification.reportHash); assert.equal(approved.approval?.feedback, reviewNotes); assert.equal(approved.approval?.approvedAt, approved.approvedAt); assert.equal(approved.exportedTo, undefined);
    assert.deepEqual(approved.report, built.report); assert.equal(approved.processCleanup, 'confirmed'); evidence.project = approved; await page.getByRole('heading', { name: 'Your prototype is approved', exact: true }).waitFor();
  });
  await row('STALE-EXPORT-DENIED', evidence => staleAction('EXPORT', 'Export source & evidence', evidence));
  await row('ACTUAL-SOURCE-EXPORT', async evidence => {
    const before = await project(); evidence.workspaceBefore = await fileManifest(await ownedWorkspace(before), true);
    const callsBefore = (await chooserCalls()).length; await page.getByRole('button', { name: 'Export source & evidence', exact: true }).click(); await page.getByRole('status').filter({ hasText: 'Source and evidence saved to' }).waitFor({ timeout: 45000 });
    delivered = await project(); assert.equal(delivered.status, 'delivered'); need(typeof delivered.exportedTo === 'string' && inside(path.join(output, 'exports'), delivered.exportedTo), 'Export must stay in owned destination.'); assert.equal(await fs.realpath(delivered.exportedTo), delivered.exportedTo);
    assert.equal(delivered.executable, undefined, 'Source export must not claim packaged executable.'); evidence.chooserCalls = await chooserCalls(); assert.equal(evidence.chooserCalls.length - callsBefore, 1); assert.equal(evidence.chooserCalls.at(-1).rejected, undefined);
    evidence.exported = await fileManifest(delivered.exportedTo, true); evidence.workspaceAfter = await fileManifest(before.workspace, true); assert.deepEqual(sourceFiles(evidence.exported), sourceFiles(evidence.workspaceBefore)); assert.deepEqual(sourceFiles(evidence.workspaceAfter), sourceFiles(evidence.workspaceBefore)); assert.equal(evidence.exported.sourceHash, built.report.sourceHash);
    evidence.report = JSON.parse((await regularFile(delivered.exportedTo, 'test-report.json')).toString('utf8')); evidence.review = JSON.parse((await regularFile(delivered.exportedTo, 'review.json')).toString('utf8')); assert.deepEqual(evidence.report, delivered.report); assert.deepEqual(evidence.review, delivered.approval); assert.equal(sha(JSON.stringify(evidence.report, null, 2)), delivered.verification.reportHash);
    evidence.deliveryMarkdown = (await regularFile(delivered.exportedTo, 'DELIVERY.md')).toString('utf8'); assert.ok(evidence.deliveryMarkdown.includes('Run ' + delivered.runId)); assert.ok(evidence.deliveryMarkdown.includes(reviewNotes)); assert.ok(evidence.deliveryMarkdown.includes('Operational readiness has not been verified.'));
    assert.equal(await page.getByRole('heading', { name: 'Your app is saved', exact: true }).count(), 0); evidence.visibleSavedPath = await page.locator('.delivery-saved-path').innerText(); assert.ok(evidence.visibleSavedPath.includes(delivered.exportedTo)); result.exportedDirectory = delivered.exportedTo;
  });
  await row('FRESH-EXPORTED-COPY', async evidence => {
    result.chromeLaunchUnconfirmed = true;
    browserServer = await chromium.launchServer({ executablePath: chromePath, host: '127.0.0.1', headless: true, chromiumSandbox: true, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false, timeout: 30000, env: allowlistedEnv() }); registerChild(browserServer.process(), 'exported-copy-chrome'); result.chromeLaunchUnconfirmed = false;
    browser = await chromium.connect(browserServer.wsEndpoint(), { timeout: 10000 }); evidence.browserVersion = browser.version(); context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 900 } }); evidence.offlineBeforeFirstNavigation = true; evidence.remoteRequestsBlocked = [];
    await context.route('**/*', async route => { const url = route.request().url(); if (/^https?:/i.test(url)) { evidence.remoteRequestsBlocked.push({ origin: new URL(url).origin, method: route.request().method() }); await route.abort('blockedbyclient'); } else await route.continue(); });
    await context.routeWebSocket('**/*', socket => { evidence.remoteRequestsBlocked.push({ origin: new URL(socket.url()).origin, method: 'WEBSOCKET' }); socket.close(); });
    exportPage = await context.newPage(); exportPage.setDefaultTimeout(10000); exportPage.on('pageerror', e => result.exportPageErrors.push(String(e.message).slice(0, 900)));
    const url = pathToFileURL(path.join(delivered.exportedTo, 'index.html')).href; await exportPage.goto(url, { waitUntil: 'load', timeout: 20000 }); evidence.url = exportPage.url(); assert.equal(evidence.url, url);
    evidence.initialResult = await exportPage.locator('#result').textContent(); evidence.initialReviewDraft = await exportPage.locator('#review-result').textContent(); assert.equal(evidence.initialResult, '', 'Fresh context must not borrow prior results.'); assert.equal(evidence.initialReviewDraft, '');
    evidence.nativeBridgeTypes = await exportPage.evaluate(() => ({ fleetHarness: typeof window.fleetHarness, require: typeof window.require })); assert.deepEqual(evidence.nativeBridgeTypes, { fleetHarness: 'undefined', require: 'undefined' });
    await parserJourney(exportPage, exportCases, evidence, exportPage, 'EXPORTED', async () => { await exportPage.reload({ waitUntil: 'load' }); }); evidence.finalPayload = await fileManifest(delivered.exportedTo, true); assert.deepEqual(evidence.finalPayload, result.rows.find(r => r.id === 'ACTUAL-SOURCE-EXPORT').evidence.exported); assert.deepEqual(result.exportPageErrors, []); assert.deepEqual(evidence.remoteRequestsBlocked, []);
  });
  await row('FINAL-NATIVE-STATE', async evidence => {
    const p = await project(); assert.equal(p.status, 'delivered'); assert.equal(p.runId, built.runId); assert.equal(p.workspace, built.workspace); assert.equal(p.processCleanup, 'confirmed'); assert.deepEqual(p.report, built.report); assert.deepEqual(p.approval, approved.approval); assert.equal(p.exportedTo, delivered.exportedTo);
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.exportPageErrors, []); assert.equal(fixture.requests.length, result.requestsAtBuildComplete, 'Review/export must not silently start another model phase.'); evidence.project = p; evidence.providerRequestCount = fixture.requests.length; evidence.sourceExportOnly = true; result.chooserCalls = await chooserCalls(); assert.equal(result.chooserCalls.length, 1);
  });
} catch (error) { if (!error.recorded) result.errors.push(String(error.message).slice(0, 2000)); }
finally {
  cleaning = true; const cleanupErrors = []; result.cleanupActions = []; result.behaviorVerdict = behaviorVerdict(result.rows); result.behaviorVerdictAt = stamp();
  try { await save(); } catch (error) { cleanupErrors.push('Pre-cleanup receipt write failed: ' + error.message); }
  if (app && runMayBeActive && projectId) {
    try {
      const before = await project();
      if (before.status === 'running') {
        await page.getByRole('region', { name: 'Challenge journey', exact: true }).getByRole('button', { name: 'Stop build', exact: true }).click(); let p;
        await poll(async () => { p = await project(); return p.status === 'stopped'; }, 'Cleanup Stop did not reach stopped.', 20000); need(p.processCleanup === 'confirmed' && p.writerState === 'idle', 'Run writers not confirmed idle.');
      } else need(before.processCleanup === 'confirmed' && before.writerState === 'idle', 'Terminated run cleanup unconfirmed.');
      runMayBeActive = false; result.cleanupActions.push('Run shutdown confirmed before native close');
    } catch (error) { cleanupErrors.push(String(error.message)); }
  }
  // Cleanup restoration cannot supply denial proof or turn a measured FAIL into PASS.
  try { await restoreTamper(true); } catch (error) { cleanupErrors.push('Tamper cleanup: ' + error.message); }
  try { await closeApp(); if (result.ownedProcesses.some(p => p.kind === 'electron')) result.cleanupActions.push('Owned Electron close/exit confirmed'); } catch (error) { cleanupErrors.push(String(error.message)); }
  try { if (context) await bounded(context.close(), 8000, 'Exported context close timed out.'); } catch (error) { cleanupErrors.push(String(error.message)); }
  try {
    if (browserServer) { const child = browserServer.process(), exited = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve)); await bounded(Promise.all([browserServer.close(), exited]), 12000, 'Owned Chrome exit unconfirmed.'); result.cleanupActions.push('Owned Chrome close/exit confirmed'); }
  } catch (error) { cleanupErrors.push(String(error.message)); }
  result.providerRequests = fixture?.requests.map(summarizeRequest) ?? [];
  try { if (fixture) { for (const socket of providerSockets) socket.destroy(); fixture.server.closeAllConnections(); await bounded(fixture.close(), 5000, 'Owned fixture close timed out.'); result.cleanupActions.push('Owned provider closed'); } } catch (error) { cleanupErrors.push(String(error.message)); }
  if (runMayBeActive) cleanupErrors.push('Run process cleanup remains unconfirmed.'); if (launchUnconfirmed) cleanupErrors.push('Native launch failed before process handle became available.'); if (result.chromeLaunchUnconfirmed) cleanupErrors.push('Chrome launch failed before process handle became available.');
  for (const child of childHandles) if (child.exitCode === null && child.signalCode === null) { cleanupErrors.push('Owned process did not exit: ' + child.pid); try { child.kill('SIGKILL'); } catch {} }
  try { if (result.before) { result.after = await identity(); result.identityStable = JSON.stringify(result.before) === JSON.stringify(result.after); } } catch (error) { result.identityStable = false; result.identityError = String(error.message).slice(0, 800); }
  result.cleanup = cleanupErrors.length ? 'UNCONFIRMED' : 'PASS'; result.cleanupErrors = cleanupErrors;
  if (root) { if (!cleanupErrors.length) { try { await fs.rm(root, { recursive: true, force: true }); result.cleanupActions.push('Owned profile removed; export/evidence retained'); } catch (error) { result.cleanup = 'UNCONFIRMED'; result.cleanupErrors.push(String(error.message)); result.retainedTemporaryRoot = root; } } else result.retainedTemporaryRoot = root; }
  clearTimeout(watchdog); shutdown = true; for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
  result.result = finalVerdict(result.behaviorVerdict, result.errors, result.identityStable, result.cleanup); result.finishedAt = stamp();
  try { await save(); } catch (error) { result.result = 'ERROR'; result.errors.push('Final receipt write failed: ' + error.message); console.error(JSON.stringify({ error: result.errors.at(-1), resultPath })); }
  console.log(JSON.stringify({ result: result.result, behaviorVerdict: result.behaviorVerdict, rows: result.rows.map(r => ({ id: r.id, result: r.result })), resultPath, cleanup: result.cleanup, identityStable: result.identityStable })); process.exitCode = result.result === 'PASS' ? 0 : result.result === 'FAIL' ? 1 : 2;
}
