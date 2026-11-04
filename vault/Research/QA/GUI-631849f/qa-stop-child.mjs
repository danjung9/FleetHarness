// Synthetic Pi Stop check. Run only in the independently authorized GUI environment.
// No real provider, login, installer, source edit, global process kill, or HOME override.
// Usage: node /absolute/path/qa-stop-child.mjs /absolute/path/gui-631849f /absolute/output/directory
import { promises as fs, constants as fsConstants, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const expectedCommit = '631849f638614735a89a555d487d6b3c777c52e3';
const repo = path.resolve(process.argv[2] || '');
const outputBase = path.resolve(process.argv[3] || '');
if (!process.argv[2] || !process.argv[3]) throw new Error('Supply the pinned repository and an output directory.');
if (!['darwin', 'linux'].includes(process.platform)) throw new Error('This POSIX shell test does not cover Windows.');
const nonce = randomUUID();
const output = path.join(outputBase, 'stop-child-' + nonce);
await fs.mkdir(output, { recursive: true });
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-stop-child-'));
const control = path.join(root, 'control');
await fs.mkdir(control);
const cleanupFile = path.join(control, 'cleanup');
const result = {
  case: 'STOP-CHILD-01', mode: 'local-scripted-provider', expectedCommit,
  startedAt: new Date().toISOString(), platform: process.platform,
  node: process.version, output, result: 'ERROR',
  limits: { workerWatchdogMs: 60000, stopStatusMs: 10000, settlingMs: 2000, observationMs: 8000 },
  scope: 'One ordinary foreground bash tool command with one non-detached Node child. No detached, resistant, Codex or packaging claim.'
};
const requests = [];
let app, server, projectId, parentRecord, childRecord, page;
let cleanupStarted = false;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = pid => {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
};
async function heartbeat(name) {
  const text = await fs.readFile(path.join(control, name + '.ticks'), 'utf8');
  const rows = text.trim().split('\n').filter(Boolean);
  return { count: rows.length, lastTick: rows.length ? Number(rows.at(-1)) : null };
}
async function snapshot() {
  return {
    at: Date.now(), parentExists: exists(parentRecord.pid), childExists: exists(childRecord.pid),
    parentHeartbeat: await heartbeat('parent'), childHeartbeat: await heartbeat('child'),
    requests: requests.length,
    status: await page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(p => p.id === id)?.status, projectId)
  };
}
async function until(check, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  do { const value = await check(); if (value) return value; await delay(100); } while (Date.now() < deadline);
  throw new Error('Timed out: ' + label);
}
const watchdog = setTimeout(() => {
  result.result = 'ERROR'; result.error = 'Test harness exceeded 90 seconds.';
  try { writeFileSync(cleanupFile, nonce); } catch {}
  // This handle belongs only to the Electron process launched by this harness.
  try { app?.process()?.kill('SIGKILL'); } catch {}
  try { writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2)); } catch {}
  process.exit(2);
}, 90000);

try {
  result.commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(result.commit, expectedCommit, 'Unexpected source revision; do not run changed code implicitly.');
  await fs.access(path.join(repo, 'dist/index.html'));
  await fs.access(path.join(repo, 'dist-electron/electron/main.js'));
  const electronDirectory = path.join(repo, 'node_modules/electron');
  const relativeBinary = (await fs.readFile(path.join(electronDirectory, 'path.txt'), 'utf8')).trim();
  const executablePath = path.resolve(electronDirectory, 'dist', relativeBinary);
  assert.ok(executablePath.startsWith(path.join(electronDirectory, 'dist') + path.sep));
  await fs.access(executablePath, fsConstants.X_OK); // Do not import electron's auto-installing loader.
  const { _electron: electron } = createRequire(path.join(repo, 'package.json'))('playwright');

  // Workers write only beneath control, exit on a separate cleanup marker, and
  // have an independent 60-second watchdog. Parent exit does not clean its child:
  // that would hide a host Stop implementation that kills only the parent.
  const childFile = path.join(control, 'child.mjs');
  const parentFile = path.join(control, 'parent.mjs');
  const workerPrelude = `import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [root, nonce, deadlineText] = process.argv.slice(2);
const deadline = Number(deadlineText);
const tick = name => {
  if (existsSync(path.join(root, 'cleanup')) || Date.now() >= deadline) process.exit(0);
  try { appendFileSync(path.join(root, name + '.ticks'), String(Date.now()) + '\\n'); }
  catch { process.exit(0); }
};
setTimeout(() => process.exit(0), Math.max(1, deadline - Date.now()));
`;
  await fs.writeFile(childFile, workerPrelude + `writeFileSync(path.join(root, 'child.json'), JSON.stringify({ nonce, pid: process.pid, parentPid: process.ppid, deadline }));
tick('child'); setInterval(() => tick('child'), 100);
`);
  await fs.writeFile(parentFile, workerPrelude + `import { spawn } from 'node:child_process';
const child = spawn(process.execPath, [path.join(root, 'child.mjs'), root, nonce, String(deadline)], { stdio: 'ignore', detached: false });
child.on('error', () => process.exit(2));
writeFileSync(path.join(root, 'parent.json'), JSON.stringify({ nonce, pid: process.pid, childPid: child.pid, deadline }));
tick('parent'); setInterval(() => tick('parent'), 100);
`);

  let commandIssued = false;
  server = createServer(async (req, res) => {
    try {
      if (req.method !== 'POST' || req.url !== '/v1/chat/completions') { res.writeHead(404).end(); return; }
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4000000) throw new Error('Fixture request too large.');
      }
      const body = JSON.parse(raw);
      const tools = (body.tools || []).map(tool => tool.function?.name).filter(Boolean);
      // Retain metadata only, never request headers, auth values or prompt bodies.
      requests.push({ at: Date.now(), tools, afterStop: !!result.stopClickedAt });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      const base = { id: 'fixture-' + nonce, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'stop-fixture' };
      const send = (delta, finish_reason = null) => res.write('data: ' + JSON.stringify({ ...base, choices: [{ index: 0, delta, finish_reason }] }) + '\n\n');
      send({ role: 'assistant', content: '' });
      if (!commandIssued && tools.includes('bash')) {
        commandIssued = true;
        const deadline = Date.now() + result.limits.workerWatchdogMs;
        const command = [process.execPath, parentFile, control, nonce, String(deadline)].map(quote).join(' ');
        send({ tool_calls: [{ index: 0, id: 'call_stop_child', type: 'function', function: { name: 'bash', arguments: JSON.stringify({ command }) } }] });
        send({}, 'tool_calls');
      } else {
        send({ content: 'Synthetic Stop check only; no application is generated.' });
        send({}, 'stop');
      }
      res.end('data: [DONE]\n\n');
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end('Synthetic fixture error.');
    }
  });
  // Catch startup errors explicitly, including sandbox EPERM. No retry/elevation.
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const piDirectory = path.join(root, 'pi');
  await fs.mkdir(piDirectory);
  await fs.writeFile(path.join(piDirectory, 'models.json'), JSON.stringify({ providers: {
    'fleet-stop-fixture': { baseUrl: 'http://127.0.0.1:' + server.address().port + '/v1', api: 'openai-completions', apiKey: 'local-fixture-only', models: [
      { id: 'stop-fixture', name: 'Synthetic Stop fixture', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }
    ] }
  } }));
  app = await electron.launch({ executablePath, args: [repo], cwd: repo, timeout: 45000, env: {
    PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'en_US.UTF-8', TMPDIR: os.tmpdir(),
    FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: piDirectory, CODEX_HOME: path.join(root, 'codex')
  } });
  page = await app.firstWindow(); page.setDefaultTimeout(15000);
  await page.getByRole('heading', { name: 'Your workspace' }).waitFor();
  await page.getByRole('button', { name: 'Model settings', exact: true }).click();
  await page.getByRole('radio', { name: 'Pi Model providers' }).check();
  await page.getByLabel('Provider', { exact: true }).selectOption('fleet-stop-fixture');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Flow — build pipeline', exact: true }).click();
  projectId = await page.evaluate(async () => (await window.fleetHarness.bootstrap()).state.projects[0].id);
  await page.getByRole('button', { name: 'Start build', exact: true }).click();
  await page.getByRole('button', { name: 'Run Pi agents', exact: true }).click();
  await until(async () => {
    try {
      parentRecord = await readJSON(path.join(control, 'parent.json'));
      childRecord = await readJSON(path.join(control, 'child.json'));
      return parentRecord.nonce === nonce && childRecord.nonce === nonce &&
        parentRecord.childPid === childRecord.pid && childRecord.parentPid === parentRecord.pid;
    } catch { return false; }
  }, 10000, 'both owned workers starting');
  await until(async () => (await heartbeat('parent')).count >= 3 && (await heartbeat('child')).count >= 3, 3000, 'both workers making progress');
  assert.ok(parentRecord.deadline - Date.now() > 30000, 'Too little time before worker watchdog; result would be ambiguous.');
  result.workers = { parent: parentRecord, child: childRecord };
  result.beforeStop = await snapshot();
  assert.equal(result.beforeStop.status, 'running');
  assert.equal(result.beforeStop.parentExists, true);
  assert.equal(result.beforeStop.childExists, true);
  assert.equal(commandIssued, true);
  await page.screenshot({ path: path.join(output, 'before-stop.png'), scale: 'css' });
  result.stopClickedAt = Date.now();
  await page.getByRole('button', { name: 'Stop run', exact: true }).click();
  try {
    await until(async () => (await snapshot()).status === 'stopped', result.limits.stopStatusMs, 'stopped state');
    result.msToStopped = Date.now() - result.stopClickedAt;
  } catch { result.msToStopped = null; }
  await delay(Math.max(0, result.stopClickedAt + result.limits.settlingMs - Date.now()));
  result.observationStart = await snapshot();
  await delay(result.limits.observationMs);
  result.observationEnd = await snapshot();
  assert.ok(Date.now() < parentRecord.deadline - 2000, 'Worker watchdog could explain termination; classify inconclusive.');
  result.checks = {
    stoppedWithinDeadline: result.msToStopped !== null,
    bothPidsAbsentAtObservationStart: !result.observationStart.parentExists && !result.observationStart.childExists,
    bothPidsAbsentAtObservationEnd: !result.observationEnd.parentExists && !result.observationEnd.childExists,
    parentHeartbeatStable: result.observationStart.parentHeartbeat.count === result.observationEnd.parentHeartbeat.count,
    childHeartbeatStable: result.observationStart.childHeartbeat.count === result.observationEnd.childHeartbeat.count,
    noNewProviderRequests: requests.length === result.beforeStop.requests,
    remainsStopped: result.observationEnd.status === 'stopped'
  };
  result.result = Object.values(result.checks).every(Boolean) ? 'PASS' : 'FAIL';
  result.verdictRecordedBeforeCleanup = true;
  await page.screenshot({ path: path.join(output, 'after-observation.png'), scale: 'css' });
} catch (error) {
  result.result = 'ERROR';
  result.error = String(error?.message || error).slice(0, 1000);
} finally {
  // Verdict above is immutable with respect to harness cleanup. The marker is
  // consumed only by our two synthetic workers; do not signal unrelated PIDs.
  cleanupStarted = true;
  result.cleanupStartedAt = Date.now();
  try { await fs.writeFile(cleanupFile, nonce); } catch {}
  if (parentRecord && childRecord) {
    try {
      await until(() => !exists(parentRecord.pid) && !exists(childRecord.pid), 3000, 'cooperative test cleanup');
      result.cleanupWorkersAbsent = true;
    } catch { result.cleanupWorkersAbsent = false; }
  }
  if (app) {
    const timer = setTimeout(() => { try { app.process()?.kill('SIGKILL'); } catch {} }, 5000);
    try { await app.close(); } catch { result.appCloseError = true; }
    clearTimeout(timer);
  }
  if (server) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(() => resolve()));
  }
  result.requests = requests;
  result.finishedAt = new Date().toISOString();
  result.cleanupSeparateFromVerdict = cleanupStarted && result.verdictRecordedBeforeCleanup === true;
  if (result.cleanupWorkersAbsent === false) result.retainedTemporaryRoot = root;
  else await fs.rm(root, { recursive: true, force: true });
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ result: result.result, checks: result.checks, error: result.error, output, cleanupWorkersAbsent: result.cleanupWorkersAbsent }));
  clearTimeout(watchdog);
  process.exitCode = result.result === 'PASS' ? 0 : result.result === 'FAIL' ? 1 : 2;
}
