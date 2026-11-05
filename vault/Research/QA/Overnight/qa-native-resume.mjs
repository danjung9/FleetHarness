// Main executes this against a clean, already built checkout. No fixed commit.
// This uses an owned local provider fixture, never a live model or real key.
// node qa-native-resume.mjs /absolute/landed-checkout /absolute/existing-results
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
const earlierPhases = ['intake', 'data', 'research', 'plan'];
const completedPhases = ['intake', 'research', 'plan'];
const phaseArtifacts = ['scope.md', 'research.md', 'plan.md', 'test-matrix.md'];
const fixtureFiles = ['mock-provider.mjs', 'quality-fixture.mjs', 'solution-fixture.mjs', 'data-fixture.mjs', 'visual-review-fixture.mjs'];
const MAX_BODY = 32 * 1024 * 1024;
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
function gateDecision(phase, resumed, implementationCount) {
  if (!resumed && phase === 'build') return implementationCount === 1 ? 'hold-first-build' : 'unexpected-build-before-resume';
  if (resumed && earlierPhases.includes(phase)) return 'earlier-phase-after-resume';
  if (resumed && phase === 'verify') return 'hold-verification';
  return 'forward';
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
  assert.equal(requestPhase(body('You are the synthetic data agent.')), 'data');
  assert.equal(requestPhase(body('Read requirements. You are the planning agent.')), 'plan');
  assert.equal(requestPhase({ ...body('You are the implementation agent'), messages: [...body('You are the implementation agent').messages, { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:synthetic' } }, { type: 'text', text: 'Implementation is complete.' }] }] }), 'build');
  assert.throws(() => requestPhase({ model: 'fixture-model', messages: [null] }));
  assert.throws(() => requestPhase({ model: 'other', messages: [] }));
  assert.throws(() => requestPhase(body('unknown marker')));
  assert.equal(gateDecision('build', false, 1), 'hold-first-build');
  assert.equal(gateDecision('build', false, 2), 'unexpected-build-before-resume');
  assert.equal(gateDecision('build', true, 2), 'forward');
  assert.equal(gateDecision('guide', true, 2), 'forward');
  for (const phase of earlierPhases) assert.equal(gateDecision(phase, true, 2), 'earlier-phase-after-resume');
  assert.equal(gateDecision('verify', true, 2), 'hold-verification');
  const identity = { version: 1, projectId: 'p', runId: 'r', workspace: '/owned/w', briefHash: 'b', packetHash: 'h', stage: 'build' };
  assert.deepEqual(checkpointIdentity({ ...identity, context: 'PRIVATE', requirements: 'PRIVATE', data: {} }), identity);
  assert.throws(() => checkpointIdentity({ ...identity, runId: null }));
  assert.equal(inside('/owned', '/owned/workspace'), true);
  assert.equal(inside('/owned', '/owned-elsewhere/workspace'), false);
  assert.equal(inside('/owned', '/owned'), false);
  const passes = Array.from({ length: 5 }, () => ({ result: 'PASS' }));
  assert.equal(verdict(passes, false, true, 'PASS'), 'PASS');
  assert.equal(verdict([...passes.slice(1), { result: 'FAIL' }], false, true, 'PASS'), 'FAIL');
  assert.equal(verdict([...passes.slice(1), { result: 'ERROR' }], false, true, 'PASS'), 'ERROR');
  assert.equal(verdict(passes.slice(1), false, true, 'PASS'), 'ERROR');
  assert.equal(verdict(passes, false, true, 'UNCONFIRMED'), 'ERROR');
  assert.equal(verdict(passes, false, false, 'PASS'), 'ERROR');
  console.log(JSON.stringify({ validationOnly: true, passed: true, runtimeExecuted: false, controls: ['phase classification', 'gate decisions', 'checkpoint projection', 'path ownership', 'verdict sensitivity'] }));
  process.exit(0);
}

need(process.argv[2] && process.argv[3], 'Supply a landed checkout and an existing output directory.');
const repo = await fs.realpath(process.argv[2]), base = await fs.realpath(process.argv[3]);
need(base !== repo && !inside(repo, base), 'Results must be outside the checkout.');
const output = path.join(base, 'native-resume-' + randomUUID()); await fs.mkdir(output);
const resultPath = path.join(output, 'result.json');
const result = { schemaVersion: 1, suite: 'native-stop-restart-resume', startedAt: new Date().toISOString(), repo,
  scope: 'Real Electron UI and production bridge. Owned synthetic Pi provider behind a request gate. Stop, full app restart and resume of the same implementation phase. No abrupt-crash recovery, live authentication, completed verification, approval or delivery claim.',
  revisionPolicy: 'Supplied clean HEAD and stable compiled bytes, with no fixed commit. Build provenance remains a separate prerequisite.',
  rows: [], pageErrors: [], proxyErrors: [], requests: [], result: 'ERROR' };
let app, page, root, fixture, proxy, electron, executablePath, watchdog, projectId, firstSnapshot, stoppedSnapshot;
let runMayBeActive = false, stopping = false, launchUnconfirmed = false;
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
  catch (error) { item.result = error.code === 'ERR_ASSERTION' ? 'FAIL' : 'ERROR'; item.error = String(error.message).slice(0, 1400); item.requiresReceiptReview = true; failure = error; }
  item.finishedAt = new Date().toISOString();
  try { await page.screenshot({ path: path.join(output, id + '.png'), timeout: 5000 }); item.screenshot = id + '.png'; } catch { item.screenshotUnavailable = true; }
  await save(); if (failure) { failure.recordedRowFailure = true; throw failure; }
}

async function startProxy(upstreamBase) {
  const upstream = new URL(upstreamBase);
  need(upstream.protocol === 'http:' && upstream.hostname === '127.0.0.1' && upstream.pathname === '/v1', 'Fixture must bind owned IPv4 loopback.');
  const active = new Set(), sockets = new Set();
  const state = { resumed: false, implementationCount: 0, firstHeld: null, verificationHeld: null, resumeOffset: null };
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
      if (phase === 'build') state.implementationCount++;
      const decision = gateDecision(phase, state.resumed, state.implementationCount);
      const record = { index: result.requests.length, phase, decision, receivedAt: new Date().toISOString(), bytes: raw.length, bodySha256: hash(raw), afterResume: state.resumed, forwarded: false };
      transfer.record = record; result.requests.push(record);
      if (transfer.closed) { record.abortedBy = 'client-response-close'; record.closedAt = new Date().toISOString(); return; }
      if (decision === 'hold-first-build') { state.firstHeld = record; return; }
      if (decision === 'hold-verification') { state.verificationHeld = record; return; }
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
      need(state.firstHeld?.abortedBy === 'client-response-close' && state.implementationCount === 1, 'First gated implementation was not uniquely aborted by native Stop.');
      state.resumed = true; state.resumeOffset = result.requests.length;
    },
    async close() { abortAll(); await bounded(new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())), 5000, 'Owned proxy did not close.'); }
  };
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
      writerState: p.runCheckpoint?.writerState, processCleanup: p.processScope?.cleanup, processRunId: p.processScope?.runId } : null;
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
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-native-resume-'))); await fs.mkdir(path.join(root, 'pi'));
  watchdog = setTimeout(() => {
    stopping = true; result.result = 'ERROR'; result.error = 'Harness exceeded 360 seconds.'; result.cleanup = 'UNCONFIRMED'; result.retainedTemporaryRoot = root;
    proxy?.abortAll(); try { proxy?.server.close(); fixture?.server.closeAllConnections(); fixture?.server.close(); } catch {}
    for (const child of ownedProcesses) if (child.exitCode === null && child.signalCode === null) { try { child.kill('SIGKILL'); } catch {} }
    result.finishedAt = new Date().toISOString(); try { writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n'); } catch {} process.exit(2);
  }, 360000);
  const fixtureModule = await import(pathToFileURL(path.join(repo, 'scripts', 'mock-provider.mjs')).href);
  need(typeof fixtureModule.startFixtureProvider === 'function', 'Fixture provider API changed.');
  fixture = await fixtureModule.startFixtureProvider(); proxy = await startProxy(fixture.baseUrl);
  const config = { providers: { 'fleet-fixture': { baseUrl: proxy.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
    models: [{ id: 'fixture-model', name: 'Native resume fixture', reasoning: false, input: ['text', 'image'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] } } };
  const configBody = JSON.stringify(config); await fs.writeFile(path.join(root, 'pi', 'models.json'), configBody);
  result.fixtureConfiguration = { provider: 'fleet-fixture', model: 'fixture-model', proxyOrigin: new URL(proxy.baseUrl).origin, sha256: hash(configBody), syntheticCredentialOnly: true };
  await launch();
  await row('UI-SETUP-AND-HELD-IMPLEMENTATION', async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tablist', { name: 'Model connection', exact: true }).getByRole('tab', { name: /^Other (?:model )?providers$/, exact: true }).click();
    const modelPanel = page.getByRole('tabpanel', { name: /^Other (?:model )?providers$/, exact: true });
    await modelPanel.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture');
    await modelPanel.getByLabel('Model', { exact: true }).selectOption('fixture-model');
    await modelPanel.getByRole('button', { name: 'Save model settings', exact: true }).click();
    await page.getByText('Model settings saved.', { exact: true }).waitFor();
    await page.locator('header.topbar').getByRole('button', { name: 'New challenge', exact: true }).click();
    const intake = page.getByRole('dialog', { name: 'New challenge', exact: true });
    await intake.getByRole('button', { name: 'Custom problem', exact: true }).click();
    const title = 'Synthetic task parser resume ' + randomUUID(); result.projectTitle = title;
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
    await poll(async () => Boolean(proxy.state.firstHeld), 'Fixture never reached a held implementation request; native precondition unavailable.', 90000);
    firstSnapshot = await snapshot(); const p = firstSnapshot.project;
    need(p.status === 'running' && p.resumeStage === 'build' && p.stages.find(stage => stage.id === 'build')?.status === 'active', 'Held request did not coincide with active implementation.');
    need(completedState(p).every(stage => stage.status === 'complete'), 'Intake, research and planning were not complete at the gate.');
    need(firstSnapshot.checkpoint.stage === 'build' && firstSnapshot.checkpoint.projectId === p.id && firstSnapshot.checkpoint.runId === p.runId && firstSnapshot.checkpoint.workspace === p.workspace, 'Private checkpoint did not identify this implementation phase.');
    assert.equal(proxy.state.firstHeld.forwarded, false);
    return { snapshot: firstSnapshot, heldRequestIndex: proxy.state.firstHeld.index, acknowledgedBeforeForwarding: true, createdAndConfiguredThroughUI: true };
  });
  await row('NATIVE-STOP-ABORTS-HELD-REQUEST', async () => {
    need(!proxy.state.firstHeld.abortedBy, 'The held implementation request ended before native Stop; cancellation precondition unavailable.');
    const stopRequestedAt = new Date().toISOString();
    await stopNative();
    await poll(async () => Boolean(proxy.state.firstHeld.abortedBy), 'Native Stop did not close the held provider response.');
    assert.equal(proxy.state.firstHeld.abortedBy, 'client-response-close'); assert.equal(proxy.state.firstHeld.forwarded, false);
    assert.ok(Date.parse(proxy.state.firstHeld.closedAt) >= Date.parse(stopRequestedAt), 'Held response must close after the Stop action begins.');
    assert.equal(proxy.state.implementationCount, 1, 'No second implementation request may precede Resume.');
    stoppedSnapshot = await snapshot();
    assert.deepEqual(runIdentity(stoppedSnapshot.project), runIdentity(firstSnapshot.project));
    assert.deepEqual(completedState(stoppedSnapshot.project), completedState(firstSnapshot.project));
    assert.deepEqual(stoppedSnapshot.artifacts, firstSnapshot.artifacts); assert.deepEqual(stoppedSnapshot.checkpoint, firstSnapshot.checkpoint);
    return { snapshot: stoppedSnapshot, stopRequestedAt, responseClosedAt: proxy.state.firstHeld.closedAt, heldRequestAbortedByNativeStop: true, forwarded: false };
  });
  await row('FULL-RESTART-PRESERVES-SAVED-WORK', async () => {
    await closeApp(); await launch();
    await page.getByRole('region', { name: 'Recent builds', exact: true }).getByRole('button').filter({ has: page.getByText(result.projectTitle, { exact: true }) }).click();
    await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Build', exact: true }).click();
    const restored = await snapshot();
    assert.deepEqual(runIdentity(restored.project), runIdentity(stoppedSnapshot.project)); assert.equal(restored.project.status, 'stopped');
    assert.deepEqual(completedState(restored.project), completedState(stoppedSnapshot.project));
    assert.deepEqual(restored.artifacts, stoppedSnapshot.artifacts); assert.deepEqual(restored.checkpoint, stoppedSnapshot.checkpoint);
    assert.equal(proxy.state.implementationCount, 1, 'Restart must not silently start implementation.');
    need(result.launches.length === 2 && Boolean(result.launches[0].exitedAt), 'A full owned Electron exit and relaunch was not established.');
    return { snapshot: restored, firstProcessExited: true, launchPids: result.launches.map(item => item.pid), sameProfile: true };
  });
  await row('NATIVE-RESUME-ADVANCES-SAME-RUN', async () => {
    const resume = page.locator('.build-phase-recovery').getByRole('button', { name: 'Resume implementation', exact: true });
    await resume.waitFor(); need(await resume.isEnabled(), 'Native Resume is unavailable for the stopped fixture.');
    proxy.armResume(); runMayBeActive = true; await resume.click();
    await poll(async () => result.requests.some(request => request.afterResume && request.phase === 'build' && request.forwarded), 'Native Resume did not forward a new implementation request.', 20000);
    await poll(async () => Boolean(proxy.state.verificationHeld), 'Implementation did not advance to the held verification phase.', 120000);
    const advanced = await snapshot();
    assert.deepEqual(runIdentity(advanced.project), runIdentity(firstSnapshot.project)); assert.deepEqual(completedState(advanced.project), completedState(firstSnapshot.project));
    assert.deepEqual(advanced.artifacts, firstSnapshot.artifacts);
    assert.equal(advanced.project.stages.find(stage => stage.id === 'build')?.status, 'complete');
    assert.equal(advanced.project.stages.find(stage => stage.id === 'verify')?.status, 'active'); assert.equal(advanced.checkpoint.stage, 'verify');
    assert.equal(proxy.state.verificationHeld.forwarded, false);
    const after = result.requests.slice(proxy.state.resumeOffset);
    assert.ok(after.some(request => request.phase === 'build' && request.forwarded && request.completedAt));
    assert.deepEqual(after.filter(request => earlierPhases.includes(request.phase)), [], 'Resume must not rerun completed phases.');
    return { snapshot: advanced, resumeRequestOffset: proxy.state.resumeOffset, secondImplementationRequestForwarded: true, implementationComplete: true, verificationRequestHeld: true, fullVerification: false, earlierPhasesRerun: false };
  });
  await row('FINAL-NATIVE-STOP-AND-ERROR-CHECK', async () => {
    need(!proxy.state.verificationHeld.abortedBy, 'The held verification request ended before final Stop.');
    const stopRequestedAt = new Date().toISOString();
    const p = await stopNative();
    await poll(async () => Boolean(proxy.state.verificationHeld.abortedBy), 'Final Stop did not abort the held verification request.');
    assert.equal(proxy.state.verificationHeld.abortedBy, 'client-response-close');
    assert.ok(Date.parse(proxy.state.verificationHeld.closedAt) >= Date.parse(stopRequestedAt));
    assert.deepEqual(runIdentity(p), runIdentity(firstSnapshot.project));
    assert.deepEqual(result.requests.slice(proxy.state.resumeOffset).filter(request => earlierPhases.includes(request.phase)), []);
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.proxyErrors, []);
    return { stopRequestedAt, responseClosedAt: proxy.state.verificationHeld.closedAt, stoppedAtVerification: true, writerIdle: true, runProcessCleanupConfirmed: true, noUnhandledRendererErrors: true, noFullVerificationClaim: true };
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
      result.identityStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter)
        && JSON.stringify(result.buildBefore) === JSON.stringify(result.buildAfter) && JSON.stringify(result.fixtureBefore) === JSON.stringify(result.fixtureAfter)
        && result.scriptSha256 === result.scriptSha256After;
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
