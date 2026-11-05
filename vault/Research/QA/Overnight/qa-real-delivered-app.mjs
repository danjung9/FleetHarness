// Main runs this after real-journey.mjs. No build, model, account or approval calls.
// node qa-real-delivered-app.mjs --repo CLONE --journey /absolute/journey.json --output EXISTING_DIRECTORY
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { runInNewContext } from 'node:vm';
import { PROJECT_ID, RUN_ID, expectedRecords, mutatedRecords, mutatedInputs, checkBrief } from './morning-brief-oracle.mjs';
import { ready, observe, reviewItem, importSources } from './morning-brief-adapter.mjs';

const exec = promisify(execFile), stamp = () => new Date().toISOString();
const sha = value => createHash('sha256').update(value).digest('hex');
const inside = (root, file) => { const r = path.relative(root, file); return r !== '' && r !== '..' && !r.startsWith('..' + path.sep) && !path.isAbsolute(r); };
const ids = ['DELIVERED-IDENTITY', 'FRESH-SOURCE-BRIEF', 'ONE-SOURCE-SCOPED-REVIEW', 'FULL-EXIT-RESTART', 'SECOND-INDEPENDENT-REVIEW', 'CHANGED-SOURCE-INPUT', 'SECOND-EXIT-RESTART', 'QUIET-OFFLINE-CLOSE'];
const workOrder = '0aff332f-7afe-44ff-8f99-bc6295b0ffb6:item-2', training = '7ab13a96-26f0-47c9-91e5-32054cc4f91b:item-1';
const verdict = (rows, errors, cleanup) => errors.length || cleanup !== 'PASS' ? 'ERROR' : rows.some(r => r.result === 'FAIL') ? 'FAIL' : rows.length === ids.length && rows.every(r => r.result === 'PASS') ? 'PASS' : 'ERROR';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const need = (condition, message) => { if (!condition) throw new Error(message); };
async function bounded(promise, ms, message) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]); } finally { clearTimeout(timer); } }
function allowedURL(value) { try { const u = new URL(value); return u.protocol === 'fleet-app:' && u.host === 'app' || ['data:', 'blob:', 'about:'].includes(u.protocol); } catch { return false; } }
function exitEvidence(a, b) { assert.ok(a.exitedAt, 'Previous native process did not exit.'); assert.equal(a.exitCode, 0); assert.notEqual(a.pid, b.pid); assert.ok(Date.parse(b.launchedAt) > Date.parse(a.exitedAt), 'Restart preceded full exit.'); assert.equal(b.userData, a.userData); }
function profilePreload(root, home) {
  return `const {app,session}=require('electron'); const fs=require('node:fs'); const path=require('node:path');
const root=${JSON.stringify(root)}, appData=${JSON.stringify(path.join(home, 'appData'))};
const beforeReady=!app.isReady(); if(!beforeReady) throw new Error('Profile preload ran too late');
fs.mkdirSync(appData,{recursive:true}); app.setPath('appData',appData);
fs.writeFileSync(path.join(root,'prelaunch-'+process.pid+'.json'),JSON.stringify({beforeReady,appData:app.getPath('appData')}));
const events=[]; const record=value=>{events.push({...value,at:new Date().toISOString()});fs.writeFileSync(path.join(root,'startup-'+process.pid+'.json'),JSON.stringify(events));};
record({kind:'preload'});
app.on('web-contents-created',(_event,contents)=>{
 contents.on('console-message',(details,level,message)=>{if(details.level==='error'||level===3)record({kind:'console-error',message:String(details.message??message).slice(0,300)});});
 contents.on('render-process-gone',(_event,details)=>{if(details.reason!=='clean-exit')record({kind:'renderer-exit',reason:details.reason});});
});
app.whenReady().then(()=>session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
 let allowed=false;try{const u=new URL(details.url);allowed=(u.protocol==='fleet-app:'&&u.host==='app')||['data:','blob:','about:','devtools:'].includes(u.protocol);}catch{}
 if(!allowed)record({kind:'external-request',scheme:details.url.split(':')[0]});callback({cancel:!allowed});
}));\n`;
}
if (process.argv.includes('--validate-only')) {
  const rows = ids.map(id => ({ id, result: 'PASS' })); assert.equal(verdict(rows, [], 'PASS'), 'PASS'); assert.equal(verdict(rows.slice(1), [], 'PASS'), 'ERROR');
  assert.equal(verdict(rows.map((r, i) => i ? r : { ...r, result: 'FAIL' }), [], 'PASS'), 'FAIL'); assert.equal(verdict(rows, ['network'], 'PASS'), 'ERROR'); assert.equal(verdict(rows, [], 'UNCONFIRMED'), 'ERROR');
  for (const url of ['https://api.example.invalid/run', 'http://127.0.0.1:3210/', 'file:///tmp/page', 'fleet-app://other/index.html']) assert.equal(allowedURL(url), false);
  assert.equal(allowedURL('fleet-app://app/index.html'), true);
  const a = { pid: 1, userData: '/owned/profile', exitedAt: '2026-11-05T10:00:00Z', exitCode: 0 }, b = { pid: 2, userData: '/owned/profile', launchedAt: '2026-11-05T10:00:01Z' }; exitEvidence(a, b);
  for (const change of [{ pid: 1 }, { userData: '/other' }, { launchedAt: '2026-11-05T09:59:59Z' }]) assert.throws(() => exitEvidence(a, { ...b, ...change }));
  assert.equal(inside('/owned', '/owned-other/file'), false);
  const writes = new Map(), events = new Map(); let appData, requestHandler;
  const fakeApp = { isReady: () => false, setPath: (name, value) => { assert.equal(name, 'appData'); appData = value; }, getPath: () => appData, on: (name, callback) => events.set(name, callback), whenReady: () => ({ then: fn => fn() }) };
  const fakeFS = { mkdirSync: () => {}, writeFileSync: (file, value) => writes.set(file, value) };
  const context = { require: name => { if (name === 'electron') return { app: fakeApp, session: { defaultSession: { webRequest: { onBeforeRequest: fn => { requestHandler = fn; } } } } }; if (name === 'node:fs') return fakeFS; if (name === 'node:path') return path; throw new Error('Unexpected preload import'); }, process: { pid: 123 }, URL, Date };
  runInNewContext(profilePreload('/owned/run', '/owned/home'), context);
  assert.deepEqual(JSON.parse(writes.get('/owned/run/prelaunch-123.json')), { beforeReady: true, appData: '/owned/home/appData' });
  let canceled; requestHandler({ url: 'https://api.example.invalid/run' }, value => { canceled = value.cancel; }); assert.equal(canceled, true);
  requestHandler({ url: 'fleet-app://app/index.html' }, value => { canceled = value.cancel; }); assert.equal(canceled, false);
  const listeners = new Map(); events.get('web-contents-created')({}, { on: (name, fn) => listeners.set(name, fn) });
  listeners.get('console-message')({ level: 'error', message: 'Owned control error' });
  assert.deepEqual(JSON.parse(writes.get('/owned/run/startup-123.json')).map(event => event.kind), ['preload', 'external-request', 'console-error']);
  fakeApp.isReady = () => true; assert.throws(() => runInNewContext(profilePreload('/owned/run', '/owned/home'), context), /too late/);
  console.log(JSON.stringify({ validationOnly: true, passed: true, nativeExecuted: false, listenersOpened: false, filesWritten: false, controls: ['missing-row/failure sensitivity', 'offline URL rules', 'full process restart', 'profile ownership', 'prelaunch profile and startup observers'] })); process.exit(0);
}
const result = { schemaVersion: 1, suite: 'real-generated-morning-brief-delivery', startedAt: stamp(), result: 'ERROR',
  scope: 'Actual downloaded browser app from the existing Morning training brief build. Independent synthetic source values, source-scoped review, two complete native restarts and offered source import. No new build, model, credentials or approval. Prior scratch approval is not human acceptance. No Node-service, Windows, live account, crash-recovery or general containment claim.',
  rows: ids.map(id => ({ id, result: 'NOT RUN' })), processes: [], observations: [], errors: [], pageErrors: [], blockedRequests: [], proxyAttempts: [], cleanup: 'UNCONFIRMED' };
let resultPath, root, app, page, proxy, electron, executablePath, home, bundle, bundleBefore, archivePath, archiveHash, scriptHashes, interrupted = false, cleanupPromise, pendingLaunch, watchdog, preloadPath;
const children = [], save = async () => { if (resultPath) await fs.writeFile(resultPath, JSON.stringify(result, null, 2) + '\n'); };
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => { interrupted = true; result.errors.push('Interrupted by ' + signal); void cleanup().then(save); });
async function files(rootPath) {
  const found = []; async function walk(dir) { for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name), relative = path.relative(rootPath, absolute);
    if (entry.isSymbolicLink()) { need(inside(rootPath, await fs.realpath(absolute)), 'Bundle symlink escapes its root.'); found.push({ path: relative, link: await fs.readlink(absolute) }); }
    else if (entry.isDirectory()) await walk(absolute); else if (entry.isFile()) found.push({ path: relative, sha256: sha(await fs.readFile(absolute)) }); else throw new Error('Unexpected bundle file type.');
  } } await walk(rootPath); return found;
}
async function ownHashes() { const hashes = {}; for (const name of ['qa-real-delivered-app.mjs', 'morning-brief-oracle.mjs', 'morning-brief-adapter.mjs']) hashes[name] = sha(await fs.readFile(new URL(name, import.meta.url))); return hashes; }
async function sourceDigest(rootPath) {
  const artifacts = [], ignored = new Set(['node_modules', '.git', '.pi', '.DS_Store']);
  async function walk(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    need(!entry.isSymbolicLink(), 'Export contains a symlink.'); if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name), relative = path.relative(rootPath, full);
    if (entry.isDirectory()) await walk(full); else if (entry.isFile() && !['test-report.json', 'review.json', 'DELIVERY.md', 'Dockerfile', 'compose.yaml'].includes(relative)) artifacts.push({ path: relative, full });
  } } await walk(rootPath); need(artifacts.length > 0 && artifacts.length <= 2000, 'Invalid source manifest size.');
  const hash = createHash('sha256').update('AppYard source hash v2\0');
  for (const file of artifacts.sort((a, b) => a.path.localeCompare(b.path))) { const bytes = await fs.readFile(file.full), key = Buffer.from(file.path), lengths = Buffer.alloc(8); need(bytes.length <= 10 * 1024 * 1024, 'Oversized source file.'); lengths.writeUInt32BE(key.length, 0); lengths.writeUInt32BE(bytes.length, 4); hash.update(lengths).update(key).update(bytes); }
  return hash.digest('hex');
}
async function capture(name) {
  const records = await observe(page), value = { name, time: stamp(), url: page.url(), records }; result.observations.push(value);
  await fs.writeFile(path.join(root, name + '.json'), JSON.stringify(value, null, 2) + '\n'); await page.screenshot({ path: path.join(root, name + '.png'), fullPage: true, scale: 'css' }); return records;
}
async function row(id, action) {
  need(!interrupted, 'Execution interrupted.'); const r = result.rows.find(item => item.id === id); r.startedAt = stamp();
  try { r.observation = await bounded(action(), 120000, 'Checker row exceeded its deadline.'); r.result = 'PASS'; } catch (error) { r.result = error instanceof assert.AssertionError ? 'FAIL' : 'ERROR'; r.error = String(error).slice(0, 1200); if (r.result === 'ERROR') result.errors.push(r.error); throw error; }
  finally { r.finishedAt = stamp(); await save(); }
}
async function launch() {
  need(!interrupted, 'Execution interrupted.'); const launchedAt = stamp();
  let p;
  pendingLaunch = electron.launch({ executablePath, cwd: root, offline: true, args: ['-r', preloadPath, '--disable-background-networking', '--disable-quic', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--proxy-server=http://127.0.0.1:' + proxy.address().port, '--proxy-bypass-list=<-loopback>'],
    env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), TMPDIR: path.join(root, 'tmp'), LANG: 'en_US.UTF-8' }, timeout: 60000 }).then(handle => {
      app = handle; const child = app.process(); children.push(child); p = { pid: child.pid, launchedAt }; result.processes.push(p);
      child.once('exit', (code, signal) => { p.exitedAt = stamp(); p.exitCode = code; p.exitSignal = signal; }); return handle;
    });
  try { await pendingLaunch; } finally { pendingLaunch = undefined; }
  need(!interrupted && !cleanupPromise, 'Launch completed after shutdown was requested.');
  const context = app.context(); await context.setOffline(true);
  context.on('request', request => { if (!allowedURL(request.url())) result.blockedRequests.push({ scheme: request.url().split(':')[0], at: stamp() }); });
  await context.route('**/*', route => allowedURL(route.request().url()) ? route.continue() : route.abort('internetdisconnected'));
  page = await app.firstWindow(); page.setDefaultTimeout(10000); page.on('pageerror', error => result.pageErrors.push({ message: error.message.slice(0, 300), at: stamp() }));
  const paths = await app.evaluate(({ app }) => ({ appData: app.getPath('appData'), userData: app.getPath('userData'), appPath: app.getAppPath() }));
  need(paths.appData === path.join(home, 'appData') && inside(paths.appData, paths.userData), 'Prelaunch profile isolation failed.'); p.appData = paths.appData; p.userData = paths.userData; p.appPath = paths.appPath;
  const prelaunch = JSON.parse(await fs.readFile(path.join(root, 'prelaunch-' + p.pid + '.json'), 'utf8')); need(prelaunch.beforeReady === true && prelaunch.appData === paths.appData, 'Profile was not isolated before application startup.');
  need(inside(bundle, paths.appPath), 'Native app is outside the delivered bundle.');
  await page.reload({ waitUntil: 'load', timeout: 30000 }); await ready(page); assert.equal(page.url(), 'fleet-app://app/index.html'); return p;
}
async function quit() {
  const p = result.processes.at(-1); need(app, 'No owned app to close.'); p.quitRequestedAt = stamp(); await bounded(app.close(), 20000, 'Native quit did not complete.'); app = undefined; page = undefined;
  for (const until = Date.now() + 5000; !p.exitedAt && Date.now() < until;) await sleep(50);
  assert.ok(p.exitedAt, 'Full native exit required before restart.'); assert.equal(p.exitCode, 0, 'Delivered app exited abnormally.'); await sleep(150); return p;
}
async function cleanup() {
  return cleanupPromise ??= (async () => { let clean = true;
    if (pendingLaunch) await pendingLaunch.catch(() => { clean = false; });
    if (app) { try { await bounded(app.close(), 20000, 'Cleanup close timed out.'); } catch { clean = false; } app = undefined; }
    for (const child of children) if (child.exitCode === null && child.signalCode === null) { clean = false; try { child.kill('SIGKILL'); } catch { /* Unconfirmed cleanup is retained. */ } }
    if (proxy) { proxy.closeAllConnections(); await bounded(new Promise(resolve => proxy.close(resolve)), 3000, 'Proxy close timed out.').catch(() => { clean = false; }); }
    result.cleanup = clean ? 'PASS' : 'UNCONFIRMED';
  })(); // Retain owned evidence/profile. Never erase another profile.
}
try {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i += 2) { need(['--repo', '--journey', '--output'].includes(args[i]) && args[i + 1], 'Usage: --repo CLONE --journey JOURNEY_JSON --output EXISTING_DIRECTORY'); options[args[i].slice(2)] = path.resolve(args[i + 1]); }
  need(options.repo && options.journey && options.output, 'All three named arguments are required.'); need(process.platform === 'darwin', 'This checker supports the delivered macOS browser app only.');
  const output = await fs.realpath(options.output); need((await fs.stat(output)).isDirectory(), 'Output directory must exist.'); root = path.join(output, 'real-delivered-app-' + randomUUID()); await fs.mkdir(root);
  resultPath = path.join(root, 'result.json'); home = path.join(root, 'home'); await fs.mkdir(home); await fs.mkdir(path.join(root, 'tmp'));
  watchdog = setTimeout(() => { interrupted = true; result.errors.push('Overall 12 minute checker deadline exceeded.'); void cleanup().then(save); }, 12 * 60000);
  preloadPath = path.join(root, 'owned-profile-preload.cjs');
  await fs.writeFile(preloadPath, profilePreload(root, home));
  const require = createRequire(path.join(await fs.realpath(options.repo), 'package.json')); ({ _electron: electron } = require('playwright')); const asar = require('@electron/asar');
  result.dependencies = {};
  for (const name of ['playwright', '@electron/asar']) { const file = require.resolve(name + '/package.json'); const bytes = await fs.readFile(file); result.dependencies[name] = { version: JSON.parse(bytes).version, packageHash: sha(bytes) }; }
  const bytes = await fs.readFile(options.journey), journey = JSON.parse(bytes); result.precedingJourney = { path: options.journey, sha256: sha(bytes), priorClaimedPass: journey.passed, projectId: journey.project?.id, approvalIsScratchTest: true };
  need(journey.project?.id === PROJECT_ID, 'Journey is not the selected synthetic project.');
  const download = journey.steps?.find(s => s.name === 'download app or see the plain reason'); need(download?.ok && download.value?.offered === true && download.value.bytes > 0, 'No actual successful app download in the preceding journey.');
  const base = path.dirname(options.journey); archivePath = path.join(base, 'delivered.zip'); const archiveBytes = await fs.readFile(archivePath); need(archiveBytes.length === download.value.bytes, 'Archive size differs from journey.'); archiveHash = sha(archiveBytes);
  const exports = (await fs.readdir(path.join(base, 'export'), { withFileTypes: true })).filter(e => e.isDirectory()); need(exports.length === 1, 'Exactly one export required; do not select a stale first child.');
  const exportedRoot = path.join(base, 'export', exports[0].name), reportBytes = await fs.readFile(path.join(exportedRoot, 'test-report.json')), report = JSON.parse(reportBytes), review = JSON.parse(await fs.readFile(path.join(exportedRoot, 'review.json'), 'utf8'));
  need(review.runId === RUN_ID && review.reportHash === sha(reportBytes) && review.sourceHash === report.sourceHash, 'Export does not bind to the selected run and review.');
  const contract = JSON.parse(await fs.readFile(path.join(exportedRoot, 'solution-contract.json'), 'utf8')); need(contract.runtime?.profile === 'browser' && contract.runtime.entrypoint === 'index.html', 'Adapter covers this browser candidate only, not service/CLI.');
  need(Array.isArray(contract.runtime.files) && contract.runtime.files.includes('index.html') && new Set(contract.runtime.files).size === contract.runtime.files.length, 'Runtime payload list is empty, duplicated or missing its entrypoint.');
  need(await sourceDigest(exportedRoot) === report.sourceHash, 'Current source export no longer matches the approved source hash.');
  const unpacked = path.join(root, 'unpacked'); await fs.mkdir(unpacked); await exec('/usr/bin/ditto', ['-x', '-k', archivePath, unpacked], { timeout: 60000 });
  const bundles = (await fs.readdir(unpacked, { withFileTypes: true })).filter(e => e.isDirectory() && e.name.endsWith('.app')); need(bundles.length === 1, 'Expected exactly one .app.'); bundle = path.join(unpacked, bundles[0].name);
  const executable = (await exec('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleExecutable', path.join(bundle, 'Contents/Info.plist')])).stdout.trim(); need(executable && path.basename(executable) === executable, 'Invalid executable name.'); executablePath = path.join(bundle, 'Contents/MacOS', executable);
  const asarPath = path.join(bundle, 'Contents/Resources/app.asar'); bundleBefore = await files(bundle); scriptHashes = await ownHashes();
  result.identity = { archive: { path: archivePath, sha256: archiveHash, bytes: archiveBytes.length }, exportedRoot, sourceHash: report.sourceHash, reportHash: sha(reportBytes), runId: review.runId, scriptHashes, profilePreloadHash: sha(await fs.readFile(preloadPath)), bundleBefore, runtimeFiles: [] };
  await row('DELIVERED-IDENTITY', async () => {
    for (const relative of contract.runtime.files) { need(typeof relative === 'string' && inside(exportedRoot, path.resolve(exportedRoot, relative)), 'Invalid payload path.'); const data = asar.extractFile(asarPath, 'application/' + relative), source = await fs.readFile(path.join(exportedRoot, relative)); assert.equal(sha(data), sha(source), 'Downloaded runtime differs from reviewed export: ' + relative); result.identity.runtimeFiles.push({ path: relative, sha256: sha(data) }); }
    const host = asar.extractFile(asarPath, 'main.cjs').toString('utf8'); need(host.includes('protocol.registerSchemesAsPrivileged') && !host.includes('createServiceHost'), 'Unexpected native wrapper.'); result.identity.hostHash = sha(host); return { payloadBoundToExport: true, priorApprovalIsNotHumanAcceptance: true };
  });
  proxy = createServer((request, response) => { result.proxyAttempts.push({ method: request.method, at: stamp() }); response.writeHead(502); response.end('Offline acceptance check'); });
  proxy.on('connect', (_request, socket) => { result.proxyAttempts.push({ method: 'CONNECT', at: stamp() }); socket.end('HTTP/1.1 502 Offline\r\n\r\n'); });
  await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(0, '127.0.0.1', resolve); });
  const initial = await launch();
  await row('FRESH-SOURCE-BRIEF', async () => { checkBrief(await capture('01-fresh'), {}); return { expectedSourceItems: expectedRecords.length, profile: initial.userData }; });
  await row('ONE-SOURCE-SCOPED-REVIEW', async () => { await reviewItem(page, workOrder); checkBrief(await capture('02-one-review'), { [workOrder]: true }); return { reviewedOnly: workOrder }; });
  await row('FULL-EXIT-RESTART', async () => { const prior = await quit(), next = await launch(); exitEvidence(prior, next); checkBrief(await capture('03-restarted'), { [workOrder]: true }); return { previousPID: prior.pid, newPID: next.pid }; });
  await row('SECOND-INDEPENDENT-REVIEW', async () => { await reviewItem(page, training); checkBrief(await capture('04-two-reviews'), { [workOrder]: true, [training]: true }); return { independentlyReviewed: training }; });
  await row('CHANGED-SOURCE-INPUT', async () => { await importSources(page, mutatedInputs); checkBrief(await capture('05-source-updated'), { [workOrder]: true }, mutatedRecords); return { changedSource: training, capacity: 7, priorAcknowledgmentInvalidated: true, otherSourceReviewPreserved: true, scope: 'Offered import/version behavior, supplemental to simple public brief.' }; });
  await row('SECOND-EXIT-RESTART', async () => { const prior = await quit(), next = await launch(); exitEvidence(prior, next); checkBrief(await capture('06-updated-restart'), { [workOrder]: true }, mutatedRecords); return { previousPID: prior.pid, newPID: next.pid }; });
  await row('QUIET-OFFLINE-CLOSE', async () => {
    await sleep(1000); await quit(); result.startupEvents = [];
    for (const p of result.processes) result.startupEvents.push({ pid: p.pid, events: JSON.parse(await fs.readFile(path.join(root, 'startup-' + p.pid + '.json'), 'utf8')) });
    assert.deepEqual(result.startupEvents.flatMap(p => p.events.filter(event => event.kind !== 'preload')), [], 'Startup observer recorded an error or external request.');
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.blockedRequests, [], 'Browser attempted external request.'); assert.deepEqual(result.proxyAttempts, [], 'App attempted proxied request.');
    need(sha(await fs.readFile(archivePath)) === archiveHash, 'Archive identity changed during execution.');
    need(JSON.stringify(await files(bundle)) === JSON.stringify(bundleBefore), 'Bundle identity changed during execution.');
    need(JSON.stringify(await ownHashes()) === JSON.stringify(scriptHashes), 'Checker changed during execution.');
    need(await sourceDigest(exportedRoot) === report.sourceHash, 'Source export changed during execution.');
    return { fullNativeExits: result.processes.length, noObservedNetworkAttempts: true, bundleUnchanged: true };
  });
} catch (error) { if (!result.rows.some(r => ['FAIL', 'ERROR'].includes(r.result))) result.errors.push(String(error).slice(0, 1200)); }
finally { clearTimeout(watchdog); await cleanup().catch(error => result.errors.push(String(error))); result.result = verdict(result.rows, result.errors, result.cleanup); result.finishedAt = stamp(); await save(); console.log(JSON.stringify({ result: result.result, receipt: resultPath, rows: result.rows.map(({ id, result }) => ({ id, result })) })); if (result.result !== 'PASS') process.exitCode = 1; }
