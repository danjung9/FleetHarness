// Main executes this against a clean, already built checkout. No fixed commit.
// This uses an owned local provider fixture, never a live model or real key.
// node qa-native-baseline-resume.mjs /absolute/landed-checkout /absolute/existing-results
import assert from 'node:assert/strict';
import { promises as fs, constants, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const earlierPhases = ['intake', 'data', 'research', 'plan', 'build', 'guide'];
const completedPhases = ['intake', 'research', 'plan', 'build'];
const phaseArtifacts = ['scope.md', 'research.md', 'plan.md', 'test-matrix.md'];
const fixtureFiles = ['mock-provider.mjs', 'quality-fixture.mjs', 'solution-fixture.mjs', 'data-fixture.mjs', 'visual-review-fixture.mjs'];
const MAX_BODY = 32 * 1024 * 1024;
const ORIGINAL_TEST = 'parser.test.cjs', BASELINE_TEST = 'token.test.cjs';
const derivedFromCheckerSHA256 = '0d30239375513bcf547e295af76d87d79822f3be7eee476a7fd6aea0de960be8';
function need(condition, message) { if (!condition) throw new Error(message); }
function inside(root, candidate) { const r = path.relative(root, candidate); return r !== '' && !r.startsWith('..' + path.sep) && r !== '..' && !path.isAbsolute(r); }
function requestPhase(body) {
  need(body && body.model === 'fixture-model' && Array.isArray(body.messages) && body.messages.length > 0, 'Unsupported fixture request shape or model.');
  for (const message of body.messages) need(message && typeof message.role === 'string' && (message.content == null || typeof message.content === 'string' || Array.isArray(message.content)), 'Unsupported message shape.');
  const text = message => typeof message.content === 'string' ? message.content : Array.isArray(message.content) ? message.content.map(part => typeof part?.text === 'string' ? part.text : '').join('\n') : '';
  const prompt = body.messages.filter(message => message.role === 'user' && text(message).trim()
    && !(Array.isArray(message.content) && message.content.some(part => part?.type === 'image_url'))).map(text).join('\n');
  if (Array.isArray(body.tools) && body.tools.some(tool => tool?.function?.name === 'judge_read')) return 'judge';
  if (prompt.includes('Implementation is complete.')) return 'guide';
  if (prompt.includes('You are the implementation agent')) return 'build';
  if (prompt.includes('You are the verification agent') || prompt.includes('The independent test run failed')) return 'verify';
  if (prompt.includes('You are the synthetic data agent')) return 'data';
  if (prompt.includes('You are the intake agent')) return 'intake';
  if (prompt.includes('You are the research agent')) return 'research';
  if (prompt.includes('You are the planning agent')) return 'plan';
  throw new Error('No recognized fixture phase marker; no request was forwarded.');
}
function gateDecision(phase, resumed, verificationCount) {
  if (!resumed && phase === 'verify') return verificationCount === 1 ? 'hold-first-verification' : 'unexpected-verification-before-resume';
  if (resumed && earlierPhases.includes(phase)) return 'earlier-phase-after-resume';
  if (resumed && phase === 'verify') return verificationCount === 2 ? 'forward' : verificationCount === 3 ? 'hold-progress-verification' : 'unexpected-verification-count';
  return 'forward';
}
function transformFixture(source) {
  return { source: source.split(ORIGINAL_TEST).join(BASELINE_TEST), occurrences: source.split(ORIGINAL_TEST).length - 1 };
}
function assertBaseline(sample, original) {
  assert.equal(sample.actualFile, BASELINE_TEST);
  assert.match(sample.fileSHA256, /^[a-f0-9]{64}$/);
  assert.equal(hash(Buffer.from(sample.fileBase64, 'base64')), sample.fileSHA256);
  for (const field of ['buildTests', 'lastTests', 'buildTestContents']) assert.deepEqual(sample.persistedKeys[field], [BASELINE_TEST], field + ' must identify only the renamed original test, without parser.test.cjs or an extra test.');
  for (const field of ['buildTests', 'lastTests']) assert.equal(sample.persisted[field], sample.fileSHA256, field + '[' + BASELINE_TEST + '] must retain the exact original hash in private state.json.');
  assert.equal(sample.persisted.buildTestContents, sample.fileBase64, 'buildTestContents[' + BASELINE_TEST + '] must retain the exact unredacted original base64 in private state.json.');
  if (original) {
    assert.equal(sample.fileSHA256, original.fileSHA256, 'The original generated test bytes changed.');
    assert.equal(sample.fileBase64, original.fileBase64, 'The original generated test bytes changed.');
    assert.deepEqual(sample.persisted, original.persisted, 'Persisted original baseline changed across Stop/restart/Resume.');
  }
}
function checkpointIdentity(value) {
  need(value && value.version === 1 && ['projectId', 'runId', 'workspace', 'briefHash', 'packetHash', 'stage'].every(key => typeof value[key] === 'string' && value[key]), 'Checkpoint identity is missing or unsupported.');
  return Object.fromEntries(['version', 'projectId', 'runId', 'workspace', 'briefHash', 'packetHash', 'stage'].map(key => [key, value[key]]));
}
function runIdentity(project) { return { id: project.id, runId: project.runId, workspace: project.workspace }; }
function completedState(project) { return completedPhases.map(id => ({ id, status: project.stages.find(stage => stage.id === id)?.status })); }
function verdict(rows, error, stable, cleanup) {
  if (error || !stable || cleanup !== 'PASS' || rows.some(row => row.result === 'ERROR')) return 'ERROR';
  if (rows.some(row => row.result === 'FAIL')) return 'FAIL';
  return rows.length === 5 && rows.every(row => row.result === 'PASS') ? 'PASS' : 'ERROR';
}
if (process.argv[2] === '--validate-only') {
  const body = prompt => ({ model: 'fixture-model', messages: [{ role: 'user', content: prompt }] });
  assert.equal(requestPhase(body('You are the implementation agent.')), 'build');
  assert.equal(requestPhase(body('You are the implementation agent. Implementation is complete.')), 'guide');
  assert.equal(requestPhase(body('You are the verification agent.')), 'verify');
  assert.equal(gateDecision('build', false, 0), 'forward');
  assert.equal(gateDecision('verify', false, 1), 'hold-first-verification');
  assert.equal(gateDecision('verify', true, 2), 'forward');
  assert.equal(gateDecision('verify', true, 3), 'hold-progress-verification');
  for (const phase of earlierPhases) assert.equal(gateDecision(phase, true, 2), 'earlier-phase-after-resume');
  const input = "['parser.test.cjs', 'unchanged test source']; README: node --test parser.test.cjs";
  const transformed = transformFixture(input);
  assert.equal(transformed.occurrences, 2);
  assert.equal(transformed.source, "['token.test.cjs', 'unchanged test source']; README: node --test token.test.cjs");
  assert.equal(transformFixture('unrelated dependency').occurrences, 0);
  const bytes = Buffer.from('synthetic original executable test\n');
  const sample = { actualFile: BASELINE_TEST, fileSHA256: hash(bytes), fileBase64: bytes.toString('base64') };
  sample.persisted = { buildTests: sample.fileSHA256, lastTests: sample.fileSHA256, buildTestContents: sample.fileBase64 };
  sample.persistedKeys = Object.fromEntries(['buildTests', 'lastTests', 'buildTestContents'].map(field => [field, [BASELINE_TEST]]));
  assertBaseline(sample); assertBaseline(structuredClone(sample), sample);
  for (const field of ['buildTests', 'lastTests', 'buildTestContents']) {
    const corrupt = structuredClone(sample); corrupt.persisted[field] = '[REDACTED]';
    assert.throws(() => assertBaseline(corrupt, sample), { code: 'ERR_ASSERTION' });
  }
  const missedRename = structuredClone(sample); missedRename.persistedKeys.buildTests.push(ORIGINAL_TEST);
  assert.throws(() => assertBaseline(missedRename, sample), { code: 'ERR_ASSERTION' });
  assert.equal(inside('/owned', '/owned/workspace'), true); assert.equal(inside('/owned', '/owned-other/workspace'), false);
  const passes = Array.from({ length: 5 }, () => ({ result: 'PASS' }));
  assert.equal(verdict(passes, false, true, 'PASS'), 'PASS');
  assert.equal(verdict([...passes.slice(1), { result: 'FAIL' }], false, true, 'PASS'), 'FAIL');
  assert.equal(verdict(passes, false, false, 'PASS'), 'ERROR');
  assert.equal(verdict(passes, false, true, 'UNCONFIRMED'), 'ERROR');
  console.log(JSON.stringify({ validationOnly: true, passed: true, runtimeExecuted: false, controls: ['first verification gate after build', 'one resumed response then held progress', 'earlier phases rejected', 'filename-only transformation', 'exact baseline hash/base64', 'each redacted baseline field fails', 'ownership and verdict'] }));
  process.exit(0);
}

need(process.argv[2] && process.argv[3], 'Supply a landed checkout and an existing output directory.');
const repo = await fs.realpath(process.argv[2]), base = await fs.realpath(process.argv[3]);
need(base !== repo && !inside(repo, base), 'Results must be outside the checkout.');
const output = path.join(base, 'native-baseline-resume-' + randomUUID()); await fs.mkdir(output);
const resultPath = path.join(output, 'result.json');
const result = { schemaVersion: 1, suite: 'native-original-baseline-restart-resume', startedAt: new Date().toISOString(), repo,
  scope: 'Real Electron UI and production bridge. Owned synthetic Pi provider behind a request gate. Filename-only transformed token.test.cjs baseline through native Stop, full Electron exit/restart and Resume verification. One resumed verification response is forwarded, then the next is held. No completed verification, full acceptance, abrupt-crash recovery, live authentication, approval or delivery claim.',
  revisionPolicy: 'Supplied clean HEAD and stable compiled bytes, with no fixed commit. Build provenance remains a separate prerequisite.',
  rows: [], baselineSamples: [], pageErrors: [], proxyErrors: [], requests: [], result: 'ERROR', derivedFromCheckerSHA256 };
let app, page, root, fixture, proxy, electron, executablePath, watchdog, projectId, firstSnapshot, stoppedSnapshot;
let runMayBeActive = false, stopping = false, launchUnconfirmed = false;
let originalBaseline;
const ownedProcesses = [];
const git = args => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sourceIdentity = () => ({ commit: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), tree: git(['rev-parse', 'HEAD^{tree}']), trackedStatus: git(['status', '--porcelain', '--untracked-files=no']) });
const save = () => fs.writeFile(resultPath, JSON.stringify(result, null, 2) + '\n');
async function regularFile(rootPath, relative, maxBytes = 32 * 1024 * 1024) {
  const target = path.resolve(rootPath, relative);
  need(inside(rootPath, target), 'File escaped its owned or declared root.');
  let current = rootPath;
  for (const part of path.relative(rootPath, target).split(path.sep)) {
    current = path.join(current, part); const stat = await fs.lstat(current);
    need(!stat.isSymbolicLink(), 'Symlink is unsupported in evidence inputs.');
    need(current === target ? stat.isFile() : stat.isDirectory(), 'Expected an ordinary evidence file or directory.');
  }
  const file = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { const stat = await file.stat(); need(stat.isFile() && stat.size <= maxBytes, 'Evidence file is oversized or not ordinary.'); return await file.readFile(); }
  finally { await file.close(); }
}
async function manifest(dir) {
  const stat = await fs.lstat(dir); need(stat.isDirectory() && !stat.isSymbolicLink(), 'Build root must be an ordinary directory.');
  const files = [];
  async function walk(relative) {
    for (const entry of (await fs.readdir(path.join(dir, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) files.push({ path: name, sha256: hash(await regularFile(dir, name, 128 * 1024 * 1024)) });
      else throw new Error('Unexpected nonregular build artifact.');
    }
  }
  await walk(''); return files;
}
async function buildIdentity() { return { frontend: await manifest(path.join(repo, 'dist')), backend: await manifest(path.join(repo, 'dist-electron')) }; }
async function fixtureIdentity() {
  return Promise.all(fixtureFiles.map(async name => ({ path: 'scripts/' + name, sha256: hash(await regularFile(repo, 'scripts/' + name)) })));
}
async function bounded(promise, ms, message) {
  let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]); }
  finally { clearTimeout(timer); }
}
async function poll(check, message, ms = 10000) {
  const end = Date.now() + ms;
  do {
    if (!stopping) {
      assert.equal(result.requests.some(request => request.afterResume && earlierPhases.includes(request.phase)), false, 'Resume requested an already completed phase.');
      if (result.proxyErrors.length) throw new Error('Owned proxy rejected an unsupported request; see metadata.');
    }
    if (await check()) return; await new Promise(resolve => setTimeout(resolve, 50));
  } while (Date.now() < end);
  throw new Error(message);
}
async function row(id, fn) {
  const item = { id, startedAt: new Date().toISOString() }; result.rows.push(item);
  let failure;
  try { item.evidence = await fn(); item.result = 'PASS'; }
  catch (error) {
    item.result = error.code === 'ERR_ASSERTION' ? 'FAIL' : 'ERROR'; item.error = String(error.message).slice(0, 1400); item.requiresReceiptReview = true; failure = error;
    try { if (page && projectId) item.observedProject = await project(); } catch { /* Preserve the original failure if the app is already closed. */ }
    try { if (page) item.visibleAppErrors = await page.locator('.error-banner').allTextContents(); } catch { /* Screenshot is a separate best-effort capture. */ }
  }
  item.finishedAt = new Date().toISOString();
  try { await page.screenshot({ path: path.join(output, id + '.png'), timeout: 5000 }); item.screenshot = id + '.png'; } catch { item.screenshotUnavailable = true; }
  await save(); if (failure) { failure.recordedRowFailure = true; throw failure; }
}

async function startProxy(upstreamBase) {
  const upstream = new URL(upstreamBase);
  need(upstream.protocol === 'http:' && upstream.hostname === '127.0.0.1' && upstream.pathname === '/v1', 'Fixture must bind owned IPv4 loopback.');
  const active = new Set(), sockets = new Set();
  const state = { resumed: false, verificationCount: 0, firstHeld: null, verificationHeld: null, resumeOffset: null };
  const server = createServer((req, res) => {
    const transfer = { req, res, upstreamRequest: null, upstreamResponse: null, record: null, closed: false };
    active.add(transfer);
    // IncomingMessage close also fires after a normal fully-read request body.
    // Only response close tells us the client abandoned a held response.
    res.on('close', () => {
      transfer.closed = true;
      if (!res.writableFinished && transfer.record && !transfer.record.abortedBy) {
        transfer.record.abortedBy = 'client-response-close'; transfer.record.closedAt = new Date().toISOString();
      }
      transfer.upstreamResponse?.destroy(); transfer.upstreamRequest?.destroy(); active.delete(transfer);
    });
    void (async () => {
      need(req.method === 'POST' && req.url === '/v1/chat/completions', 'Unsupported proxy route or method.');
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; need(size <= MAX_BODY, 'Fixture request exceeded the 32 MB harness limit.'); chunks.push(chunk); }
      const raw = Buffer.concat(chunks), phase = requestPhase(JSON.parse(raw.toString('utf8')));
      if (phase === 'verify') state.verificationCount++;
      const decision = gateDecision(phase, state.resumed, state.verificationCount);
      const record = { index: result.requests.length, phase, decision, receivedAt: new Date().toISOString(), bytes: raw.length, bodySha256: hash(raw), afterResume: state.resumed, forwarded: false };
      transfer.record = record; result.requests.push(record);
      if (transfer.closed) { record.abortedBy = 'client-response-close'; record.closedAt = new Date().toISOString(); return; }
      if (decision === 'hold-first-verification') { state.firstHeld = record; return; }
      if (decision === 'hold-progress-verification') { state.verificationHeld = record; return; }
      need(decision === 'forward', 'Unexpected phase request: ' + decision);
      record.forwarded = true; record.forwardedAt = new Date().toISOString();
      const outgoing = httpRequest(new URL('/v1/chat/completions', upstream), { method: 'POST', agent: false,
        headers: { 'content-type': 'application/json', 'content-length': raw.length }, timeout: 45000 }, incoming => {
        transfer.upstreamResponse = incoming; record.upstreamStatus = incoming.statusCode;
        if (transfer.closed) { incoming.destroy(); return; }
        res.writeHead(incoming.statusCode ?? 502, { 'content-type': incoming.headers['content-type'] ?? 'text/event-stream', 'cache-control': 'no-cache' });
        incoming.on('error', () => { if (!transfer.closed) res.destroy(); });
        incoming.on('end', () => { record.completedAt = new Date().toISOString(); });
        incoming.pipe(res);
      });
      transfer.upstreamRequest = outgoing;
      outgoing.on('timeout', () => outgoing.destroy(new Error('Owned fixture forwarding timed out.')));
      outgoing.on('error', error => {
        if (transfer.closed || stopping) return;
        result.proxyErrors.push({ requestIndex: record.index, message: error.code ?? 'UPSTREAM_ERROR' }); res.destroy();
      });
      outgoing.end(raw);
    })().catch(error => {
      if (transfer.closed || stopping) return;
      result.proxyErrors.push({ requestIndex: transfer.record?.index ?? null, message: String(error.message).slice(0, 300) });
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' }); res.end('Owned QA fixture request rejected.');
    });
  });
  server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  function abortAll() {
    for (const transfer of active) {
      if (transfer.record && !transfer.record.completedAt && !transfer.record.abortedBy) transfer.record.abortedBy = 'harness-cleanup';
      transfer.upstreamResponse?.destroy(); transfer.upstreamRequest?.destroy(); transfer.res.destroy(); transfer.req.destroy();
    }
    for (const socket of sockets) socket.destroy();
  }
  return { state, server, baseUrl: 'http://127.0.0.1:' + server.address().port + '/v1', abortAll,
    armResume() {
      need(state.firstHeld?.abortedBy === 'client-response-close' && state.verificationCount === 1, 'First gated verification was not uniquely aborted by native Stop.');
      state.resumed = true; state.resumeOffset = result.requests.length;
    },
    async close() { abortAll(); await bounded(new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())), 5000, 'Owned proxy did not close.'); }
  };
}

async function installTransformedFixture() {
  const directory = path.join(root, 'fixture-provider'); await fs.mkdir(directory);
  const records = [];
  for (const name of fixtureFiles) {
    const bytes = await regularFile(repo, 'scripts/' + name);
    const transformed = transformFixture(bytes.toString('utf8'));
    const imports = [...transformed.source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);
    for (const specifier of imports) need(specifier.startsWith('node:') || specifier.startsWith('./') && fixtureFiles.includes(specifier.slice(2)), 'Unrecorded fixture import dependency.');
    await fs.writeFile(path.join(directory, name), transformed.source, { flag: 'wx' });
    records.push({ path: name, originalSHA256: hash(bytes), transformedSHA256: hash(Buffer.from(transformed.source)), occurrences: transformed.occurrences });
  }
  need(records.find(record => record.path === 'mock-provider.mjs').occurrences >= 2, 'Expected generated filename and README test-command references are absent.');
  result.fixtureTransformation = { originalFilename: ORIGINAL_TEST, replacementFilename: BASELINE_TEST, rule: 'Literal filename substitution only; no test content, oracle, product code or IPC changes.', files: records };
  await save();
  return directory;
}
async function baselineSample(p, label) {
  const workspace = await ownedWorkspace(p);
  const bytes = await regularFile(workspace, BASELINE_TEST);
  assert.ok(bytes.length > 0, 'The generated original test must contain executable source.');
  const stateBytes = await regularFile(path.join(root, 'state'), 'state.json', 16 * 1024 * 1024);
  const saved = JSON.parse(stateBytes.toString('utf8')).projects.find(item => item.id === p.id);
  assert.ok(saved && saved.runId === p.runId && saved.workspace === p.workspace, 'Private persisted project does not identify this run.');
  const c = saved.runCheckpoint ?? {};
  const sample = { label, capturedAt: new Date().toISOString(), actualFile: BASELINE_TEST, fileSHA256: hash(bytes), fileBase64: bytes.toString('base64'),
    fileUTF8: bytes.toString('utf8'), stateFileSHA256: hash(stateBytes), runIdentity: runIdentity(saved),
    persistedKeys: Object.fromEntries(['buildTests', 'lastTests', 'buildTestContents'].map(field => [field, c[field] && typeof c[field] === 'object' ? Object.keys(c[field]).sort() : []])),
    persisted: { buildTests: c.buildTests?.[BASELINE_TEST] ?? null, buildTestContents: c.buildTestContents?.[BASELINE_TEST] ?? null, lastTests: c.lastTests?.[BASELINE_TEST] ?? null } };
  result.baselineSamples.push(sample); await save();
  return sample;
}
async function baselineInvariant(p, label) {
  const sample = await baselineSample(p, label); assertBaseline(sample, originalBaseline);
  return sample;
}
async function pollProduct(check, message, ms) {
  try { await poll(check, message, ms); }
  catch (error) { if (result.proxyErrors.length || error.code === 'ERR_ASSERTION') throw error; assert.fail(message); }
}

async function launch() {
  launchUnconfirmed = true;
  app = await electron.launch({ executablePath, args: [repo], cwd: repo, timeout: 45000, env: {
    PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'en_US.UTF-8', TMPDIR: os.tmpdir(),
    FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: path.join(root, 'pi')
  } });
  const child = app.process(); ownedProcesses.push(child);
  launchUnconfirmed = false;
  result.launches ??= []; result.launches.push({ pid: child.pid, launchedAt: new Date().toISOString() });
  page = await app.firstWindow({ timeout: 45000 }); page.setDefaultTimeout(7000);
  page.on('pageerror', error => result.pageErrors.push(String(error.message).slice(0, 800)));
  await page.locator('.app-shell').waitFor({ timeout: 45000 });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 900));
}
async function closeApp() {
  if (!app) return;
  const current = app, child = current.process();
  const exited = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve));
  await bounded(Promise.all([current.close(), exited]), 15000, 'Owned Electron did not exit.');
  const launchRecord = result.launches.findLast(item => item.pid === child.pid); if (launchRecord) launchRecord.exitedAt = new Date().toISOString();
  app = undefined; page = undefined;
}
async function project() {
  const value = await page.evaluate(async id => {
    const p = (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === id);
    return p ? { id: p.id, runId: p.runId, workspace: p.workspace, status: p.status, resumeStage: p.resumeStage,
      stages: p.stages.map(stage => ({ id: stage.id, status: stage.status })),
      writerState: p.runCheckpoint?.writerState, processCleanup: p.processScope?.cleanup, processRunId: p.processScope?.runId,
      error: p.error ?? null, repairAttempts: p.runCheckpoint?.repairAttempts, verificationAgent: p.runCheckpoint?.verificationAgent } : null;
  }, projectId);
  need(value && Array.isArray(value.stages), 'Saved project was not available through production bootstrap.');
  result.lastObservedProject = value; return value;
}
async function ownedWorkspace(p) {
  need(typeof p.workspace === 'string' && inside(path.join(root, 'state', 'workspaces'), p.workspace), 'Workspace is outside the owned profile.');
  const actual = await fs.realpath(p.workspace); need(actual === p.workspace, 'Workspace path contains a symlink or alias.'); return actual;
}
async function checkpoint(p) {
  await ownedWorkspace(p);
  need(/^[a-zA-Z0-9_-]{1,100}$/.test(p.runId), 'Unsupported run ID.');
  const stateRoot = path.join(root, 'state');
  const identity = checkpointIdentity(JSON.parse((await regularFile(stateRoot, 'run-checkpoints/' + p.runId + '.json', 8 * 1024 * 1024)).toString('utf8')));
  need(identity.projectId === p.id && identity.runId === p.runId && identity.workspace === p.workspace, 'Private checkpoint does not identify the owned project run.');
  return identity;
}
async function artifacts(p) {
  const actual = await ownedWorkspace(p);
  return Promise.all(phaseArtifacts.map(async name => ({ path: name, sha256: hash(await regularFile(actual, name)) })));
}
async function snapshot() { const p = await project(); return { project: p, checkpoint: await checkpoint(p), artifacts: await artifacts(p) }; }
async function stopNative() {
  await page.getByRole('region', { name: 'Challenge journey', exact: true }).getByRole('button', { name: 'Stop build', exact: true }).click();
  let p;
  await poll(async () => { p = await project(); return p.status === 'stopped'; }, 'Native Stop did not reach stopped state.', 20000);
  assert.equal(p.writerState, 'idle', 'Native Stop must confirm the checkpoint writer is idle.');
  assert.equal(p.processCleanup, 'confirmed', 'Native Stop must confirm run process cleanup.');
  assert.equal(p.processRunId, p.runId);
  runMayBeActive = false; return p;
}

try {
  result.scriptSha256 = hash(await fs.readFile(fileURLToPath(import.meta.url)));
  const pkg = JSON.parse((await regularFile(repo, 'package.json')).toString('utf8'));
  need(pkg.name === 'fleetharness' && pkg.main === 'dist-electron/electron/main.js', 'Unsupported desktop checkout.');
  result.sourceBefore = sourceIdentity(); need(result.sourceBefore.trackedStatus === '', 'Use a completed clean checkout, not the active merge.');
  result.buildBefore = await buildIdentity(); result.fixtureBefore = await fixtureIdentity();
  need(result.buildBefore.frontend.some(file => file.path === 'index.html') && result.buildBefore.backend.some(file => file.path === 'electron/main.js'), 'Compiled desktop artifacts are missing.');
  const installed = path.join(repo, 'node_modules', 'electron');
  executablePath = path.resolve(installed, 'dist', (await fs.readFile(path.join(installed, 'path.txt'), 'utf8')).trim());
  need(inside(path.join(installed, 'dist'), executablePath), 'Installed Electron executable escaped its package.'); await fs.access(executablePath, constants.X_OK);
  ({ _electron: electron } = createRequire(path.join(repo, 'package.json'))('playwright'));
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-native-baseline-resume-'))); await fs.mkdir(path.join(root, 'pi'));
  watchdog = setTimeout(() => {
    stopping = true; result.result = 'ERROR'; result.error = 'Harness exceeded 360 seconds.'; result.cleanup = 'UNCONFIRMED'; result.retainedTemporaryRoot = root;
    proxy?.abortAll(); try { proxy?.server.close(); fixture?.server.closeAllConnections(); fixture?.server.close(); } catch {}
    for (const child of ownedProcesses) if (child.exitCode === null && child.signalCode === null) { try { child.kill('SIGKILL'); } catch {} }
    result.finishedAt = new Date().toISOString(); try { writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n'); } catch {} process.exit(2);
  }, 360000);
  const fixtureDirectory = await installTransformedFixture();
  const fixtureModule = await import(pathToFileURL(path.join(fixtureDirectory, 'mock-provider.mjs')).href);
  need(typeof fixtureModule.startFixtureProvider === 'function', 'Fixture provider API changed.');
  fixture = await fixtureModule.startFixtureProvider(); proxy = await startProxy(fixture.baseUrl);
  const config = { providers: { 'fleet-fixture': { baseUrl: proxy.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
    models: [{ id: 'fixture-model', name: 'Native baseline verification resume fixture', reasoning: false, input: ['text', 'image'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] } } };
  const configBody = JSON.stringify(config); await fs.writeFile(path.join(root, 'pi', 'models.json'), configBody);
  result.fixtureConfiguration = { provider: 'fleet-fixture', model: 'fixture-model', proxyOrigin: new URL(proxy.baseUrl).origin, sha256: hash(configBody), syntheticCredentialOnly: true };
  await launch();
  await row('UI-BUILD-AND-HELD-VERIFICATION', async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tablist', { name: 'Model connection', exact: true }).getByRole('tab', { name: 'Other providers', exact: true }).click();
    const modelPanel = page.getByRole('tabpanel', { name: 'Other providers', exact: true });
    await modelPanel.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture');
    await modelPanel.getByLabel('Model', { exact: true }).selectOption('fixture-model');
    await modelPanel.getByRole('button', { name: 'Save model settings', exact: true }).click();
    await page.getByText('Model settings saved.', { exact: true }).waitFor();
    await page.locator('header.topbar').getByRole('button', { name: 'New challenge', exact: true }).click();
    const intake = page.getByRole('dialog', { name: 'New challenge', exact: true });
    await intake.getByRole('button', { name: 'Custom problem', exact: true }).click();
    const title = 'Synthetic baseline verification resume ' + randomUUID(); result.projectTitle = title;
    await intake.getByLabel('Challenge title', { exact: true }).fill(title);
    await intake.getByLabel('Problem statement', { exact: true }).fill('Parse the invented TASK: prefix, retain a task across reload and prepare a synthetic review draft. No publication or operational-format validation is performed.');
    await intake.getByLabel('Evaluation criteria (optional)', { exact: false }).fill('Parse a synthetic task and recover from empty input.\nPublication of the synthetic review draft requires owner approval.');
    await intake.getByRole('button', { name: 'Save challenge', exact: true }).click(); await intake.waitFor({ state: 'hidden' });
    projectId = await page.evaluate(async title => (await window.fleetHarness.bootstrap()).state.projects.find(p => p.title === title)?.id, title);
    need(typeof projectId === 'string', 'UI-created project was not saved.');
    await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Brief', exact: true }).click();
    await page.getByRole('button', { name: 'Save & start build', exact: true }).click();
    runMayBeActive = true;
    await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Start automatic build', exact: true }).click();
    await poll(async () => Boolean(proxy.state.firstHeld), 'Fixture never reached the first held verification request.', 120000);
    firstSnapshot = await snapshot(); const p = firstSnapshot.project;
    need(p.status === 'running' && p.resumeStage === 'verify' && p.stages.find(stage => stage.id === 'verify')?.status === 'active', 'Gate did not coincide with active verification.');
    need(completedState(p).every(stage => stage.status === 'complete'), 'All earlier stages including implementation must complete before the gate.');
    need(firstSnapshot.checkpoint.stage === 'verify', 'Private checkpoint must identify verification, after build baseline capture.');
    assert.equal(proxy.state.firstHeld.forwarded, false);
    originalBaseline = await baselineSample(p, 'initial-verification-held-after-build');
    assertBaseline(originalBaseline);
    let verificationAbsent = false;
    try { await regularFile(await ownedWorkspace(p), 'verification.md'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; verificationAbsent = true; }
    assert.equal(verificationAbsent, true, 'verification.md must be absent before the first held verification request, so later progress is a new write.');
    result.preResumeVerificationArtifactAbsent = true;
    return { snapshot: firstSnapshot, baselineSampleIndex: result.baselineSamples.length - 1, heldRequestIndex: proxy.state.firstHeld.index, initialVerificationForwarded: false, capturedAfterImplementation: true, verificationArtifactAbsent: true };
  });
  await row('NATIVE-STOP-PRESERVES-ORIGINAL-BASELINE', async () => {
    need(!proxy.state.firstHeld.abortedBy, 'The initial held request ended before native Stop.');
    const stopRequestedAt = new Date().toISOString(); await stopNative();
    await poll(async () => Boolean(proxy.state.firstHeld.abortedBy), 'Stop did not close the initial held verification response.');
    assert.equal(proxy.state.firstHeld.abortedBy, 'client-response-close'); assert.equal(proxy.state.firstHeld.forwarded, false);
    assert.ok(Date.parse(proxy.state.firstHeld.closedAt) >= Date.parse(stopRequestedAt));
    assert.equal(proxy.state.verificationCount, 1);
    stoppedSnapshot = await snapshot();
    assert.deepEqual(runIdentity(stoppedSnapshot.project), runIdentity(firstSnapshot.project));
    assert.deepEqual(completedState(stoppedSnapshot.project), completedState(firstSnapshot.project));
    assert.deepEqual(stoppedSnapshot.artifacts, firstSnapshot.artifacts); assert.deepEqual(stoppedSnapshot.checkpoint, firstSnapshot.checkpoint);
    await baselineInvariant(stoppedSnapshot.project, 'after-native-stop');
    return { snapshot: stoppedSnapshot, stopRequestedAt, responseClosedAt: proxy.state.firstHeld.closedAt, heldVerificationAbortedByNativeStop: true, baselineUnredacted: true };
  });
  await row('FULL-EXIT-RESTART-PRESERVES-BASELINE', async () => {
    await closeApp();
    await baselineInvariant(stoppedSnapshot.project, 'after-first-electron-process-exit');
    await launch();
    await page.getByRole('region', { name: 'Recent builds', exact: true }).getByRole('button').filter({ has: page.getByText(result.projectTitle, { exact: true }) }).click();
    await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Build', exact: true }).click();
    const restored = await snapshot();
    assert.deepEqual(runIdentity(restored.project), runIdentity(stoppedSnapshot.project)); assert.equal(restored.project.status, 'stopped');
    assert.deepEqual(completedState(restored.project), completedState(stoppedSnapshot.project));
    assert.deepEqual(restored.artifacts, stoppedSnapshot.artifacts); assert.deepEqual(restored.checkpoint, stoppedSnapshot.checkpoint);
    await baselineInvariant(restored.project, 'after-full-electron-restart');
    assert.equal(proxy.state.verificationCount, 1);
    need(result.launches.length === 2 && Boolean(result.launches[0].exitedAt), 'Full exit and two launches were not established.');
    assert.notEqual(result.launches[0].pid, result.launches[1].pid);
    return { snapshot: restored, firstProcessExited: true, launchPids: result.launches.map(item => item.pid), sameProfile: true, rawOriginalBaselineUnredacted: true };
  });
  await row('NATIVE-RESUME-VERIFICATION-MAKES-PROGRESS', async () => {
    const resume = page.locator('.build-phase-recovery').getByRole('button', { name: 'Resume verification', exact: true });
    await resume.waitFor(); assert.equal(await resume.isEnabled(), true, 'Resume verification must be enabled for this stopped checkpoint.');
    proxy.armResume(); runMayBeActive = true; await resume.click();
    await pollProduct(async () => result.requests.some(request => request.afterResume && request.phase === 'verify' && request.completedAt), 'Resume verification did not complete its first local-fixture response.', 20000);
    await pollProduct(async () => Boolean(proxy.state.verificationHeld), 'Resume verification made no subsequent request after its first response.', 20000);
    const advanced = await snapshot();
    assert.deepEqual(runIdentity(advanced.project), runIdentity(firstSnapshot.project)); assert.deepEqual(completedState(advanced.project), completedState(firstSnapshot.project));
    assert.deepEqual(advanced.artifacts, firstSnapshot.artifacts);
    assert.equal(advanced.project.stages.find(stage => stage.id === 'verify')?.status, 'active'); assert.equal(advanced.checkpoint.stage, 'verify');
    await baselineInvariant(advanced.project, 'resumed-verification-after-response');
    const verification = await regularFile(await ownedWorkspace(advanced.project), 'verification.md');
    assert.match(verification.toString('utf8'), /One source behavior is covered/);
    result.verificationProgress = { path: 'verification.md', sha256: hash(verification), bytes: verification.length, text: verification.toString('utf8') };
    assert.equal(proxy.state.verificationHeld.forwarded, false);
    assert.deepEqual(result.requests.slice(proxy.state.resumeOffset).filter(request => earlierPhases.includes(request.phase)), []);
    return { snapshot: advanced, resumedResponseCompleted: true, verificationArtifactWritten: true, nextVerificationRequestHeld: true, earlierPhasesRerun: false, fullVerification: false };
  });
  await row('FINAL-STOP-RETAINS-BASELINE-AND-CLOSES-REQUEST', async () => {
    need(!proxy.state.verificationHeld.abortedBy, 'Held progress request ended before final native Stop.');
    const stopRequestedAt = new Date().toISOString(); const p = await stopNative();
    await poll(async () => Boolean(proxy.state.verificationHeld.abortedBy), 'Final Stop did not close the held verification request.');
    assert.equal(proxy.state.verificationHeld.abortedBy, 'client-response-close');
    assert.ok(Date.parse(proxy.state.verificationHeld.closedAt) >= Date.parse(stopRequestedAt));
    assert.deepEqual(runIdentity(p), runIdentity(firstSnapshot.project));
    await baselineInvariant(p, 'after-final-native-stop');
    assert.deepEqual(result.requests.slice(proxy.state.resumeOffset).filter(request => earlierPhases.includes(request.phase)), []);
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.proxyErrors, []);
    return { stopRequestedAt, responseClosedAt: proxy.state.verificationHeld.closedAt, writerIdle: true, runProcessCleanupConfirmed: true, baselineUnredacted: true, noFullVerificationClaim: true };
  });
} catch (error) { if (!error.recordedRowFailure) result.error = String(error.message).slice(0, 1600); }
finally {
  const cleanupProblems = [];
  stopping = true;
  if (app && runMayBeActive && projectId) {
    try { await bounded(stopNative(), 25000, 'Cleanup Stop timed out.'); }
    catch { cleanupProblems.push('Could not confirm native Stop during cleanup.'); }
  }
  proxy?.abortAll();
  try { await closeApp(); } catch (error) {
    cleanupProblems.push(String(error.message));
    for (const child of ownedProcesses) if (child.exitCode === null && child.signalCode === null) { try { child.kill('SIGKILL'); } catch {} }
  }
  try { await proxy?.close(); } catch (error) { cleanupProblems.push(String(error.message)); }
  try { if (fixture) { fixture.server.closeAllConnections(); await bounded(fixture.close(), 5000, 'Owned fixture did not close.'); } } catch (error) { cleanupProblems.push(String(error.message)); }
  if (runMayBeActive) cleanupProblems.push('Run shutdown was not confirmed before app exit.');
  if (launchUnconfirmed) cleanupProblems.push('Electron launch failed before its owned process handle was available.');
  try {
    if (result.sourceBefore && result.buildBefore && result.fixtureBefore) {
      result.sourceAfter = sourceIdentity(); result.buildAfter = await buildIdentity(); result.fixtureAfter = await fixtureIdentity();
      result.scriptSha256After = hash(await fs.readFile(fileURLToPath(import.meta.url)));
      if (result.fixtureTransformation) {
        result.transformedFixtureStable = true;
        for (const item of result.fixtureTransformation.files) if (hash(await regularFile(path.join(root, 'fixture-provider'), item.path)) !== item.transformedSHA256) result.transformedFixtureStable = false;
      }
      result.identityStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter)
        && JSON.stringify(result.buildBefore) === JSON.stringify(result.buildAfter) && JSON.stringify(result.fixtureBefore) === JSON.stringify(result.fixtureAfter)
        && result.scriptSha256 === result.scriptSha256After && result.transformedFixtureStable === true;
    }
  } catch (error) { result.identityStable = false; result.identityError = String(error.message).slice(0, 500); }
  result.cleanup = cleanupProblems.length ? 'UNCONFIRMED' : 'PASS';
  if (cleanupProblems.length) { result.cleanupErrors = cleanupProblems; result.retainedTemporaryRoot = root; }
  else if (root) { try { await fs.rm(root, { recursive: true, force: true }); } catch { result.cleanup = 'UNCONFIRMED'; result.retainedTemporaryRoot = root; } }
  clearTimeout(watchdog);
  result.result = verdict(result.rows, Boolean(result.error), result.identityStable === true, result.cleanup);
  result.finishedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ result: result.result, cases: result.rows.length, resultPath, error: result.error }));
  process.exitCode = result.result === 'PASS' ? 0 : result.result === 'FAIL' ? 1 : 2;
}
