import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { createSocket } from 'node:dgram';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { Store, newProject } from '../dist-electron/electron/storage.js';

// Fixed UI records exercise the real renderer/main/preload, isolated runtime and
// browser network boundary. No model, provider, or external API is involved.
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-preview-smoke-')));
const output = path.resolve('output/playwright/experiments');
const source = path.join(root, 'candidate');
const requests = [], packets = [], connections = []; 
const canary = createServer((request, response) => { requests.push(request.url); response.end('unexpected network access'); });
canary.on('connection', socket => connections.push(socket.remoteAddress));
const stun = createSocket('udp4'); stun.on('message', bytes => packets.push(bytes));
let desktop;
try {
  await Promise.all([fs.mkdir(source), fs.mkdir(output, { recursive: true }), new Promise(resolve => canary.listen(0, '127.0.0.1', resolve)), new Promise(resolve => stun.bind(0, '127.0.0.1', resolve))]);
  const canaryURL = `http://127.0.0.1:${canary.address().port}/leak`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px system-ui;padding:24px;background:#f4f6f4;color:#123c32}button{padding:10px;margin:8px}output{display:block;padding:18px}</style></head><body><h1>Isolated candidate fixture</h1><button id="calculate">Calculate</button><output id="result">Ready</output><button id="navigate">Attempt external navigation</button><script>
    window.probe={require:typeof require,bridge:typeof window.fleetHarness};
    try { window.probe.parentBridge=typeof parent.fleetHarness; } catch(error) { window.probe.parentBridge=error.name; }
    document.getElementById('calculate').onclick=async()=>{const response=await fetch('/api/invoke',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({values:[2,3]})});document.getElementById('result').textContent='Result: '+await response.json();};
    document.getElementById('navigate').onclick=()=>{location.href=${JSON.stringify(canaryURL)};};
    fetch(${JSON.stringify(canaryURL)}).catch(()=>{});
    (async()=>{const pc=new RTCPeerConnection({iceServers:[{urls:'stun:127.0.0.1:${stun.address().port}'},{urls:'turn:127.0.0.1:${canary.address().port}?transport=tcp',username:'fixture',credential:'fixture-password'}]});window.peer=pc;pc.createDataChannel('probe');await pc.setLocalDescription(await pc.createOffer());window.probe.iceStarted=true;setTimeout(()=>{pc.close();window.probe.iceComplete=true;},1800);})().catch(error=>{window.probe.iceError=error.name;});
  </script></body></html>`;
  await fs.writeFile(path.join(source, 'index.html'), html);
  await fs.writeFile(path.join(source, 'app.mjs'), 'export function invoke(input){return input.values.reduce((sum,value)=>sum+value,0)}');
  const manifest = { profile: 'service', entrypoint: 'app.mjs', command: { runtime: 'node', entrypoint: 'app.mjs', args: [] }, files: ['app.mjs', 'index.html'], requiredEnv: [], healthPath: '/health' };
  const store = new Store(path.join(root, 'state')); await store.init();
  const project = newProject({ title: 'Isolated preview fixture', description: 'Exercise the real desktop preview boundary with a synthetic sum application.', criteria: ['Returns the sum of the provided values.'] });
  Object.assign(project, { status: 'review', workspace: source, runtimeProfile: 'service', runId: 'smoke-run', report: { time: new Date().toISOString(), command: 'synthetic fixture', exitCode: 0, passed: 1, failed: 0, skipped: 0, total: 1, output: 'Synthetic fixture.', durationMs: 1, sourceHash: 'fixture' } });
  store.state.projects = [project]; await store.save();
  desktop = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: store.root, PI_CODING_AGENT_DIR: path.join(root, 'pi'), VITE_DEV_SERVER_URL: '' }, timeout: 45000 });
  const page = await desktop.firstWindow(); page.setDefaultTimeout(15000);
  await page.locator('.app-shell').waitFor();
  assert.ok(page.url().startsWith('file:'), 'Exercise the packaged file-origin embedding policy.');
  await desktop.evaluate(async ({ BrowserWindow }, fixture) => {
    const fixtureRequire = process.getBuiltinModule('module').createRequire(fixture.service);
    const { ExperimentService } = fixtureRequire(fixture.service);
    const { prepareIsolatedSolutionRuntime } = fixtureRequire(fixture.runtime);
    const summary = { id: 'desktop-comparison', projectId: fixture.project.id, mode: 'paired', status: 'review', createdAt: fixture.project.createdAt, updatedAt: fixture.project.updatedAt, candidates: [{ id: 'candidate-node', profileId: 'node-service', profileVersion: '1', baseline: true, status: 'passed', success: true }] };
    ExperimentService.prototype.experimentState = async () => ({ experiments: [summary], settings: { schemaVersion: 1, mode: 'paired', memoryEnabled: false, automaticComparisons: false, maxHumanRequestsPerDay: 0 }, availability: { available: true } });
    ExperimentService.prototype.inspectCandidate = async () => ({ experimentId: summary.id, candidateId: 'candidate-node', sourceHash: 'fixture', project: fixture.project });
    ExperimentService.prototype.candidateArtifacts = async () => [];
    ExperimentService.prototype.previewCandidate = async () => {
      globalThis.previewFixture = await prepareIsolatedSolutionRuntime(fixture.source, fixture.manifest, process.execPath, undefined, {}, { embeddingOrigin: 'file:' });
      return globalThis.previewFixture.url;
    };
    ExperimentService.prototype.closeCandidatePreview = async () => { await globalThis.previewFixture?.close(); globalThis.previewFixture = undefined; };
    if (BrowserWindow.getAllWindows()[0].webContents.getWebRTCIPHandlingPolicy() !== 'disable_non_proxied_udp') throw new Error('WebRTC egress policy is missing.');
  }, { service: path.resolve('dist-electron/electron/experiment-service.js'), runtime: path.resolve('dist-electron/electron/isolated-solution-runtime.js'), source, manifest, project });
  await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('heading', { name: 'Compare approaches', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open candidate preview', exact: true }).click();
  const frame = page.frameLocator('.candidate-preview iframe');
  await frame.getByRole('heading', { name: 'Isolated candidate fixture' }).waitFor();
  await frame.getByRole('button', { name: 'Calculate', exact: true }).click();
  await frame.getByText('Result: 5', { exact: true }).waitFor();
  const child = page.frames().find(item => item.url().startsWith('http://127.0.0.1:'));
  assert.ok(child);
  await child.waitForFunction(() => window.probe.iceComplete || window.probe.iceError);
  assert.deepEqual(await child.evaluate(() => ({ require: window.probe.require, bridge: window.probe.bridge, parentBridge: window.probe.parentBridge, iceStarted: window.probe.iceStarted })), { require: 'undefined', bridge: 'undefined', parentBridge: 'SecurityError', iceStarted: true });
  assert.equal(connections.length, 0, 'The isolated iframe must not open direct TURN TCP connections.');
  assert.equal(packets.length, 0, 'The isolated iframe must not emit STUN packets.');
  await page.screenshot({ path: path.join(output, 'desktop-isolated-preview.png'), animations: 'disabled' });
  await frame.getByRole('button', { name: 'Attempt external navigation' }).click();
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(requests.length, 0, 'Iframe fetch and self-navigation must not reach the canary.');
  await frame.getByRole('heading', { name: 'Isolated candidate fixture' }).waitFor();
  const previewURL = child.url();
  await page.getByRole('button', { name: 'Close preview', exact: true }).click();
  await page.locator('.candidate-preview iframe').waitFor({ state: 'detached' });
  await assert.rejects(fetch(previewURL));
  assert.equal((await page.evaluate(() => window.fleetHarness.bootstrap())).state.projects[0].id, project.id);
  console.log(JSON.stringify({ passed: true, realElectron: true, fileOriginIframe: true, isolatedStdioAPI: true, noHostBridge: true, stunPackets: packets.length, directTCPConnections: connections.length, externalHTTPRequests: requests.length, previewRevoked: true, screenshot: path.join(output, 'desktop-isolated-preview.png') }, null, 2));
} finally {
  if (desktop) { await desktop.evaluate(async () => { await globalThis.previewFixture?.close(); }).catch(() => {}); await desktop.close(); }
  canary.closeAllConnections(); await new Promise(resolve => canary.close(resolve)); stun.close();
  await fs.rm(root, { recursive: true, force: true });
}
