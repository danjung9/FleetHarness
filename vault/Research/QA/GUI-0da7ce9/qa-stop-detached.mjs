// Synthetic detached Pi Stop check. Main must review before execution.
// No real provider, login, installer, source edit, global process kill, or HOME override.
// Usage: node /absolute/path/qa-stop-detached.mjs /absolute/path/gui-0da7ce9 /absolute/output/directory
import { promises as fs, constants as fsConstants, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';

const expectedCommit = '0da7ce9cbd34c25175ef02eafafeda5cd983f866';
// Parse only static generated text; do not initialize the fixture in this mode.
if (process.argv[2] === '--validate-only') {
  const source = await fs.readFile(fileURLToPath(import.meta.url), 'utf8');
  const literal = pattern => {
    const text = source.match(pattern)?.[1];
    assert.ok(text && !text.includes('${'), 'Expected a static worker template.');
    return runInNewContext(text, Object.create(null), { timeout: 1000 });
  };
  const prelude = literal(/const workerPrelude = (`[\s\S]*?`);/);
  const programs = Object.fromEntries(['child', 'parent'].map(role => [role, prelude + literal(new RegExp('await fs.writeFile\\(' + role + 'File, workerPrelude \\+ (`[\\s\\S]*?`)\\);'))]));
  for (const text of Object.values(programs)) execFileSync(process.execPath, ['--check', '--input-type=module'], { input: text, timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
  assert.ok(programs.parent.includes('detached: true'));
  assert.ok(programs.parent.includes('child.unref()'));
  const observation = { parentExists: false, childExists: false, shellExists: false, parentHeartbeat: { count: 3 }, childHeartbeat: { count: 3 }, status: 'stopped' };
  const check = (end, requests = 1, ms = 5) => stopChecks(observation, end, 1, requests, ms, 10000);
  assert.ok(Object.values(check(observation)).every(Boolean));
  const survivor = structuredClone(observation); survivor.childExists = true; survivor.childHeartbeat.count++;
  assert.equal(Object.values(check(survivor)).every(Boolean), false);
  assert.equal(Object.values(check(observation, 2)).every(Boolean), false);
  assert.equal(Object.values(check(observation, 1, null)).every(Boolean), false);
  assert.equal(sameIdentity({ pid: 2, started: 'a' }, { pid: 2, started: 'b', present: true, owned: true }), false);
  const shell = { pid: 27681, pgid: 27681, session: '0', stat: 'Ss' };
  const parent = { pid: 27682, pgid: 27681, session: '0', stat: 'S' };
  const child = { pid: 27683, pgid: 27683, session: '0', stat: 'Ss' };
  assert.equal(detachmentEvidence(parent, shell, child, 'darwin').sessionProof, 'distinct session leaders');
  assert.throws(() => detachmentEvidence(parent, shell, { ...child, pgid: shell.pgid }, 'darwin'));
  assert.throws(() => detachmentEvidence(parent, shell, { ...child, stat: 'S' }, 'darwin'));
  assert.throws(() => detachmentEvidence(parent, { ...shell, stat: 'S' }, child, 'darwin'));
  assert.equal(detachmentEvidence({ ...parent, session: '27681' }, { ...shell, session: '27681' }, { ...child, session: '27683' }, 'linux').sessionProof, 'distinct session identifiers');
  assert.throws(() => detachmentEvidence({ ...parent, session: '27681' }, { ...shell, session: '27681' }, { ...child, session: '27681' }, 'linux'));
  console.log(JSON.stringify({ validationOnly: true, passed: true, generatedSyntax: Object.keys(programs), pureVerdictCases: ['absent/stable', 'surviving detached child', 'provider request after Stop', 'missing stopped state', 'PID start identity change', 'macOS zero sess fields with distinct session leaders', 'same group or missing leader rejected', 'Linux session identifiers'], workerSha256: Object.fromEntries(Object.entries(programs).map(([role, text]) => [role, createHash('sha256').update(text).digest('hex')])) }, null, 2));
  process.exit(0);
}
function stopChecks(start, end, beforeRequests, afterRequests, msToStopped, stopStatusMs) {
  return {
    stoppedWithinDeadline: msToStopped !== null && msToStopped <= stopStatusMs,
    allThreePidsAbsentAtObservationStart: !start.parentExists && !start.childExists && !start.shellExists,
    allThreePidsAbsentAtObservationEnd: !end.parentExists && !end.childExists && !end.shellExists,
    parentHeartbeatStable: start.parentHeartbeat.count === end.parentHeartbeat.count,
    childHeartbeatStable: start.childHeartbeat.count === end.childHeartbeat.count,
    noNewProviderRequests: afterRequests === beforeRequests,
    remainsStopped: start.status === 'stopped' && end.status === 'stopped'
  };
}
function sameIdentity(expected, current) {
  return !!(expected && current?.present && current.owned && expected.pid === current.pid && expected.started === current.started && expected.commandSha256 === current.commandSha256 && expected.pgid === current.pgid && expected.session === current.session);
}
function detachmentEvidence(parent, shell, child, platform) {
  assert.equal(parent.pgid, shell.pgid, 'Parent must remain in the tool shell group.');
  assert.equal(shell.pgid, shell.pid, 'Tool shell must lead its process group.');
  assert.equal(child.pgid, child.pid, 'Detached child must lead its group.');
  assert.notEqual(child.pgid, shell.pgid, 'Child must have a separate process group.');
  const zeroSessions = [parent, shell, child].every(p => /^(?:0x)?0+$/i.test(p.session));
  if (platform === 'darwin' && zeroSessions) {
    // This Mac returned sess=0 for every owned PID. BSD ps documents stat 's'
    // as session leader. Distinct leader PIDs establish separate sessions;
    // zero-valued sess columns themselves provide no session identity evidence.
    assert.ok(shell.stat?.slice(1).includes('s'), 'Tool shell must be an observed session leader.');
    assert.ok(child.stat?.slice(1).includes('s'), 'Detached child must be an observed session leader.');
    return { sessionProof: 'distinct session leaders', source: 'macOS ps stat s flags plus distinct owned PIDs and PGIDs', rawSessionIdentifiersUnavailable: true };
  }
  assert.ok([parent, shell, child].every(p => typeof p.session === 'string' && p.session.length && !/^(?:0x)?0+$/i.test(p.session)), 'Session identifiers unavailable or inconsistent.');
  if (platform === 'linux') {
    assert.equal(Number(shell.session), shell.pid, 'Tool shell must lead its session.');
    assert.equal(Number(child.session), child.pid, 'Detached child must lead its session.');
  }
  assert.equal(parent.session, shell.session, 'Parent must remain in the tool shell session.');
  assert.notEqual(child.session, shell.session, 'Detached child must have a separate session.');
  return { sessionProof: 'distinct session identifiers', source: platform === 'darwin' ? 'macOS ps sess' : 'ps sid', rawSessionIdentifiersUnavailable: false };
}
if (!process.argv[2] || !process.argv[3]) throw new Error('Supply the pinned repository and an output directory.');
const repo = await fs.realpath(path.resolve(process.argv[2]));
const outputBase = await fs.realpath(path.resolve(process.argv[3]));
if (!['darwin', 'linux'].includes(process.platform)) throw new Error('This POSIX shell test does not cover Windows.');
assert.equal(repo, '/Users/mukul/Documents/CDAO/fh-org/gui-0da7ce9', 'Use only the assigned GUI checkout.');
assert.ok(outputBase !== repo && !outputBase.startsWith(repo + path.sep), 'Evidence must remain outside the repo.');
const nonce = randomUUID();
const output = path.join(outputBase, 'stop-detached-' + nonce);
await fs.mkdir(output, { recursive: true });
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-stop-detached-'));
const control = path.join(root, 'control');
await fs.mkdir(control);
const cleanupFile = path.join(control, 'cleanup');
const result = {
  case: 'STOP-DETACHED-01', mode: 'local-scripted-provider', expectedCommit,
  startedAt: new Date().toISOString(), platform: process.platform,
  node: process.version, output, result: 'ERROR',
  limits: { workerWatchdogMs: 60000, stopStatusMs: 10000, settlingMs: 2000, observationMs: 8000 },
  scope: 'One actual Pi bash shell and active Node parent with one unreferenced detached Node child. No resistant, Codex, Quit, packaging or general containment claim.'
};
const requests = [];
let app, server, projectId, parentRecord, childRecord, shellRecord, page;
let parentIdentity, childIdentity, shellIdentity;
let cleanupStarted = false;
let commandIssued = false;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = pid => {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function manifest(directory) {
  const files = [];
  async function visit(relative) {
    for (const entry of (await fs.readdir(path.join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const item = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(item);
      else if (entry.isFile()) files.push({ path: item, sha256: digest(await fs.readFile(path.join(directory, item))) });
      else throw new Error('Unexpected nonregular build artifact: ' + item);
    }
  }
  await visit(''); return files;
}
function processState(record) {
  if (!record || record.nonce !== nonce || !Number.isInteger(record.pid) || record.pid <= 1) return null;
  if (!exists(record.pid)) return { pid: record.pid, present: false };
  try {
    const sessionColumn = process.platform === 'darwin' ? 'sess' : 'sid';
    const ps = execFileSync('/bin/ps', ['-p', String(record.pid), '-o', 'pid=,ppid=,pgid=,' + sessionColumn + '=,lstart=,stat=,comm='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 1000 }).trim();
    const columns = ps.split(/\s+/);
    if (columns.length < 11 || Number(columns[0]) !== record.pid) throw new Error('Incomplete process identity.');
    // Inspect only the recorded PID. Validate nonce/path but retain no arguments.
    const command = execFileSync('/bin/ps', ['-ww', '-p', String(record.pid), '-o', 'command='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 1000 }).trim();
    const workerName = record.role === 'child' ? 'child.mjs' : 'parent.mjs';
    return { pid: record.pid, present: true, ppid: Number(columns[1]), pgid: Number(columns[2]), session: columns[3], started: columns.slice(4, 9).join(' '), stat: columns[9], comm: columns.slice(10).join(' '), commandSha256: digest(command), owned: command.includes(nonce) && command.includes(path.join(control, workerName)) };
  } catch { return { pid: record.pid, present: exists(record.pid), psUnavailable: true }; }
}
async function heartbeat(name) {
  const text = await fs.readFile(path.join(control, name + '.ticks'), 'utf8');
  const rows = text.trim().split('\n').filter(Boolean);
  return { count: rows.length, lastTick: rows.length ? Number(rows.at(-1)) : null };
}
async function snapshot() {
  const sample = {
    at: Date.now(), parentExists: exists(parentRecord.pid), childExists: exists(childRecord.pid), shellExists: exists(shellRecord.pid),
    parentProcess: processState(parentRecord), childProcess: processState(childRecord), shellProcess: processState(shellRecord),
    parentHeartbeat: await heartbeat('parent'), childHeartbeat: await heartbeat('child'),
    requests: requests.length,
    status: await page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(p => p.id === id)?.status, projectId)
  };
  for (const [key, identity] of [['parentProcess', parentIdentity], ['childProcess', childIdentity], ['shellProcess', shellIdentity]]) {
    if (identity && sample[key].present && !sameIdentity(identity, sample[key])) {
      result.processIdentityError = 'Recorded process identity changed or became unavailable during sampling.';
      throw new Error(result.processIdentityError);
    }
  }
  return sample;
}
async function until(check, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  do { const value = await check(); if (value) return value; await delay(100); } while (Date.now() < deadline);
  throw new Error('Timed out: ' + label);
}
const watchdog = setTimeout(() => {
  result.result = 'ERROR'; result.error = 'Test harness exceeded 90 seconds.';
  result.retainedTemporaryRoot = root;
  result.cleanupOutcome = 'UNCONFIRMED';
  result.requests = requests;
  result.finishedAt = new Date().toISOString();
  try { writeFileSync(cleanupFile, nonce); } catch {}
  // This handle belongs only to the Electron process launched by this harness.
  try { app?.process()?.kill('SIGKILL'); } catch {}
  try { writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2)); } catch {}
  process.exit(2);
}, 90000);

try {
  result.commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 5000 }).trim();
  assert.equal(result.commit, expectedCommit, 'Unexpected source revision; do not run changed code implicitly.');
  result.trackedChanges = execFileSync('git', ['-C', repo, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8', timeout: 5000 }).trim();
  assert.equal(result.trackedChanges, '', 'Tracked source changes need a new review.');
  result.sourceTree = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD^{tree}'], { encoding: 'utf8', timeout: 5000 }).trim();
  await fs.access(path.join(repo, 'dist/index.html'));
  await fs.access(path.join(repo, 'dist-electron/electron/main.js'));
  const electronDirectory = path.join(repo, 'node_modules/electron');
  const relativeBinary = (await fs.readFile(path.join(electronDirectory, 'path.txt'), 'utf8')).trim();
  const executablePath = path.resolve(electronDirectory, 'dist', relativeBinary);
  assert.ok(executablePath.startsWith(path.join(electronDirectory, 'dist') + path.sep));
  await fs.access(executablePath, fsConstants.X_OK); // Do not import electron's auto-installing loader.
  result.provenance = {
    scriptSha256: digest(await fs.readFile(fileURLToPath(import.meta.url))),
    lockSha256: digest(await fs.readFile(path.join(repo, 'package-lock.json'))),
    electronBinarySha256: digest(await fs.readFile(executablePath)),
    dist: await manifest(path.join(repo, 'dist')),
    distElectron: await manifest(path.join(repo, 'dist-electron')),
    installedPackages: {},
    limitation: 'Artifact hashes identify the executed bytes. Their derivation from pinned source relies on the separate build receipt; this script does not rebuild or attest every dependency file.'
  };
  for (const name of ['electron', 'playwright', '@earendil-works/pi-coding-agent']) {
    const bytes = await fs.readFile(path.join(repo, 'node_modules', name, 'package.json'));
    result.provenance.installedPackages[name] = { version: JSON.parse(bytes).version, packageJsonSha256: digest(bytes) };
  }
  result.provenance.sdkStopSources = {};
  for (const name of ['dist/core/tools/bash.js', 'dist/utils/shell.js']) result.provenance.sdkStopSources[name] = digest(await fs.readFile(path.join(repo, 'node_modules/@earendil-works/pi-coding-agent', name)));
  const { _electron: electron } = createRequire(path.join(repo, 'package.json'))('playwright');

  // Both workers have independent referenced deadlines. Parent exit never cleans
  // the detached child, which would mask Stop limited to the original group.
  const childFile = path.join(control, 'child.mjs');
  const parentFile = path.join(control, 'parent.mjs');
  const workerPrelude = `import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [root, nonce, deadlineText, shellText] = process.argv.slice(2);
const shellPid = Number(shellText);
const role = path.basename(process.argv[1]).startsWith('child') ? 'child' : 'parent';
const finish = reason => {
  try { writeFileSync(path.join(root, role + '.exit.json'), JSON.stringify({ nonce, pid: process.pid, at: Date.now(), reason })); } catch {}
  process.exit(0);
};
const deadline = Number(deadlineText);
const tick = name => {
  if (existsSync(path.join(root, 'cleanup')) && readFileSync(path.join(root, 'cleanup'), 'utf8') === nonce) finish('cleanup');
  if (Date.now() >= deadline) finish('watchdog');
  try { appendFileSync(path.join(root, name + '.ticks'), String(Date.now()) + '\\n'); }
  catch { finish('write-error'); }
};
setTimeout(() => finish('watchdog'), Math.max(1, Math.min(60000, deadline - Date.now())));
`;
  await fs.writeFile(childFile, workerPrelude + `writeFileSync(path.join(root, 'child.json'), JSON.stringify({ nonce, role: 'child', pid: process.pid, parentPid: process.ppid, shellPid, deadline }));
tick('child'); setInterval(() => tick('child'), 100);
`);
  await fs.writeFile(parentFile, workerPrelude + `import { spawn } from 'node:child_process';
const child = spawn(process.execPath, [path.join(root, 'child.mjs'), root, nonce, String(deadline), String(shellPid)], { stdio: 'ignore', detached: true });
child.unref();
child.on('error', () => process.exit(2));
writeFileSync(path.join(root, 'parent.json'), JSON.stringify({ nonce, role: 'parent', pid: process.pid, parentPid: process.ppid, shellPid, childPid: child.pid, detached: true, unrefCalled: true, deadline }));
tick('parent'); setInterval(() => tick('parent'), 100);
`);
  result.provenance.workers = { parent: digest(await fs.readFile(parentFile)), child: digest(await fs.readFile(childFile)) };

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
        const schema = body.tools.find(tool => tool.function?.name === 'bash').function.parameters;
        assert.equal(schema?.properties?.command?.type, 'string', 'Advertised bash schema does not accept a string command.');
        assert.ok((schema.required || []).every(name => name === 'command'), 'Bash requires additional parameters.');
        result.bashSchemaAccepted = true;
        commandIssued = true;
        const deadline = Date.now() + result.limits.workerWatchdogMs;
        // Trailing commands prevent the shell replacing itself with Node.
        const command = [process.execPath, parentFile, control, nonce, String(deadline)].map(quote).join(' ') + ' "$$"; fixture_status=$?; exit "$fixture_status"';
        result.commandSha256 = digest(command);
        send({ tool_calls: [{ index: 0, id: 'call_stop_child', type: 'function', function: { name: 'bash', arguments: JSON.stringify({ command }) } }] });
        send({}, 'tool_calls');
      } else {
        send({ content: 'Synthetic Stop check only; no application is generated.' });
        send({}, 'stop');
      }
      res.end('data: [DONE]\n\n');
    } catch (error) {
      result.fixtureError = String(error?.message || error).slice(0, 500);
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
    FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: piDirectory
  } });
  page = await app.firstWindow(); page.setDefaultTimeout(15000);
  await page.getByRole('heading', { name: 'AppYard', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: 'Pi Model providers' }).check();
  await page.getByLabel('Provider', { exact: true }).selectOption('fleet-stop-fixture');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Home \u2014 challenge portfolio', exact: true }).click();
  await page.getByRole('button', { name: 'Start a brief: Paperless. Even underway.. Paperless Underway', exact: true }).click();
  await page.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByRole('heading', { name: 'Build phases', exact: true }).waitFor();
  projectId = await page.evaluate(async () => (await window.fleetHarness.bootstrap()).state.projects[0].id);
  await page.getByRole('region', { name: 'Challenge journey', exact: true }).getByRole('button', { name: 'Start build', exact: true }).click();
  await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Start automatic build', exact: true }).click();
  await until(async () => {
    try {
      parentRecord = await readJSON(path.join(control, 'parent.json'));
      childRecord = await readJSON(path.join(control, 'child.json'));
      return parentRecord.nonce === nonce && childRecord.nonce === nonce &&
        parentRecord.childPid === childRecord.pid && childRecord.parentPid === parentRecord.pid && parentRecord.parentPid === parentRecord.shellPid && childRecord.shellPid === parentRecord.shellPid;
    } catch { return false; }
  }, 10000, 'both owned workers starting');
  await until(async () => (await heartbeat('parent')).count >= 3 && (await heartbeat('child')).count >= 3, 3000, 'both workers making progress');
  assert.ok(parentRecord.deadline - Date.now() > 30000, 'Too little time before worker watchdog; result would be ambiguous.');
  shellRecord = { nonce, role: 'shell', pid: parentRecord.shellPid };
  result.workers = { parent: parentRecord, child: childRecord, shell: shellRecord };
  result.beforeStop = await snapshot();
  assert.equal(result.beforeStop.status, 'running');
  assert.equal(result.beforeStop.parentExists, true);
  assert.equal(result.beforeStop.childExists, true);
  assert.equal(result.beforeStop.shellExists, true);
  parentIdentity = result.beforeStop.parentProcess; childIdentity = result.beforeStop.childProcess; shellIdentity = result.beforeStop.shellProcess;
  for (const identity of [parentIdentity, childIdentity, shellIdentity]) assert.equal(identity.owned, true, 'Recorded PID identity must match nonce and worker path.');
  result.detachmentEvidence = detachmentEvidence(parentIdentity, shellIdentity, childIdentity, process.platform);
  await delay(400);
  const advancing = await snapshot();
  assert.ok(advancing.parentHeartbeat.count > result.beforeStop.parentHeartbeat.count && advancing.childHeartbeat.count > result.beforeStop.childHeartbeat.count, 'Both workers must progress before Stop.');
  result.beforeStop = advancing;
  result.identities = { parent: parentIdentity, child: childIdentity, shell: shellIdentity };
  result.detachmentProven = true;
  assert.equal(commandIssued, true);
  await page.screenshot({ path: path.join(output, 'before-stop.png'), scale: 'css' });
  assert.ok(parentRecord.deadline - Date.now() > 30000, 'Screenshot consumed worker watchdog margin.');
  result.stopClickedAt = Date.now();
  await page.getByRole('region', { name: 'Challenge journey', exact: true }).getByRole('button', { name: 'Stop build', exact: true }).click();
  result.stopClickCompletedAt = Date.now();
  result.clickActionDurationMs = result.stopClickCompletedAt - result.stopClickedAt;
  const stoppedPromise = until(async () => (await snapshot()).status === 'stopped', result.limits.stopStatusMs, 'stopped state')
    .then(() => { result.msToStopped = Date.now() - result.stopClickCompletedAt; })
    .catch(() => { result.msToStopped = null; });
  await delay(Math.max(0, result.stopClickCompletedAt + result.limits.settlingMs - Date.now()));
  result.observationStart = await snapshot();
  await delay(result.limits.observationMs);
  result.observationEnd = await snapshot();
  await stoppedPromise;
  assert.ok(!result.processIdentityError, 'Process identity sampling was inconclusive.');
  assert.ok(Date.now() < parentRecord.deadline - 5000, 'Worker watchdog could explain termination; classify inconclusive.');
  await assert.rejects(fs.access(cleanupFile), { code: 'ENOENT' }, 'Cleanup must not precede observation.');
  for (const name of ['parent', 'child']) await assert.rejects(fs.access(path.join(control, name + '.exit.json')), { code: 'ENOENT' }, 'A worker self-exit cannot establish Stop.');
  for (const sample of [result.observationStart, result.observationEnd]) for (const key of ['parentProcess', 'childProcess', 'shellProcess']) assert.ok(!sample[key].psUnavailable, 'Process inspection failure is inconclusive.');
  for (const sample of [result.observationStart, result.observationEnd]) for (const [key, identity] of [['parentProcess', parentIdentity], ['childProcess', childIdentity], ['shellProcess', shellIdentity]]) {
    if (sample[key].present) assert.ok(sameIdentity(identity, sample[key]), 'A sampled PID changed identity; inconclusive.');
  }
  result.checks = stopChecks(result.observationStart, result.observationEnd, result.beforeStop.requests, requests.length, result.msToStopped, result.limits.stopStatusMs);
  result.detachedHeartbeatAdvanced = result.observationEnd.childHeartbeat.count > result.observationStart.childHeartbeat.count;
  result.detachedIdentityStillPresent = sameIdentity(childIdentity, result.observationEnd.childProcess);
  result.result = Object.values(result.checks).every(Boolean) ? 'PASS' : 'FAIL';
  result.stopVerdict = result.result;
  result.verdictRecordedBeforeCleanup = true;
  result.verdictRecordedAt = Date.now();
  await fs.writeFile(path.join(output, 'observation.json'), JSON.stringify({ ...result, requests }, null, 2));
  await page.screenshot({ path: path.join(output, 'after-observation.png'), scale: 'css' });
} catch (error) {
  result.result = 'ERROR';
  result.error = String(error?.message || error).slice(0, 1000);
} finally {
  // Verdict above is immutable with respect to harness cleanup. The marker is
  // consumed only by our two synthetic workers; do not signal unrelated PIDs.
  cleanupStarted = true;
  result.cleanupStartedAt = Date.now();
  try { await fs.writeFile(cleanupFile, nonce); } catch { result.cleanupMarkerError = true; }
  // Recover partial startup records without treating unknown startup as cleanup success.
  for (const name of ['parent', 'child']) {
    try {
      const record = await readJSON(path.join(control, name + '.json'));
      if (record.nonce === nonce && Number.isInteger(record.pid) && record.pid > 1) {
        if (name === 'parent') parentRecord = record; else childRecord = record;
      }
    } catch {}
  }
  const knownPids = new Set([parentRecord?.pid, childRecord?.pid, parentRecord?.childPid, parentRecord?.shellPid].filter(pid => Number.isInteger(pid) && pid > 1));
  if (!commandIssued) result.cleanupWorkersAbsent = true;
  else if (parentRecord && childRecord) {
    try {
      await until(() => [...knownPids].every(pid => !exists(pid)), 3000, 'cooperative test cleanup');
      result.cleanupWorkersAbsent = true;
    } catch {
      result.cleanupSignals = [];
      // Reused/unavailable PIDs are skipped. Never signal a group after losing
      // its recorded leader identity; the worker's own deadline remains active.
      for (const [role, record, identity] of [['child', childRecord, childIdentity], ['parent', parentRecord, parentIdentity], ['shell', shellRecord, shellIdentity]]) {
        const current = processState(record);
        if (!sameIdentity(identity, current)) { if (current?.present) result.cleanupSignals.push({ role, pid: record.pid, skipped: 'identity mismatch or unavailable' }); continue; }
        const group = role === 'child' && current.pgid === record.pid;
        try { process.kill(group ? -record.pid : record.pid, 'SIGKILL'); result.cleanupSignals.push({ role, pid: record.pid, group, signal: 'SIGKILL', identity: current }); }
        catch (error) { result.cleanupSignals.push({ role, pid: record.pid, error: error.code || 'signal failed' }); }
      }
      try { await until(() => [...knownPids].every(pid => !exists(pid)), 2000, 'owned cleanup fallback'); result.cleanupWorkersAbsent = true; }
      catch { result.cleanupWorkersAbsent = false; }
    }
  } else result.cleanupWorkersAbsent = null;
  result.cleanupProcesses = { parent: processState(parentRecord), child: processState(childRecord), shell: processState(shellRecord), knownPids: [...knownPids] };
  try {
    const evidence = path.join(output, 'control-evidence'); await fs.mkdir(evidence);
    for (const name of await fs.readdir(control)) { const file = path.join(control, name); if (!(await fs.lstat(file)).isFile()) throw new Error('Nonregular control entry.'); await fs.copyFile(file, path.join(evidence, name)); }
    result.controlEvidence = await manifest(evidence);
  } catch { result.controlEvidenceError = true; }
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
  result.cleanupSeparateFromVerdict = cleanupStarted && result.verdictRecordedBeforeCleanup === true && result.verdictRecordedAt <= result.cleanupStartedAt;
  result.cleanupOutcome = result.cleanupWorkersAbsent === true && !result.appCloseError && !result.controlEvidenceError && !result.cleanupMarkerError ? 'PASS' : 'UNCONFIRMED';
  if (result.cleanupOutcome !== 'PASS') {
    result.retainedTemporaryRoot = root;
    if (result.result === 'PASS') result.result = 'ERROR';
  }
  else await fs.rm(root, { recursive: true, force: true });
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ result: result.result, checks: result.checks, error: result.error, output, cleanupWorkersAbsent: result.cleanupWorkersAbsent }));
  clearTimeout(watchdog);
  process.exitCode = result.result === 'PASS' ? 0 : result.result === 'FAIL' ? 1 : 2;
}
