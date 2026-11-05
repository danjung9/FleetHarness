import { bindSyntheticApproval } from './helpers/approved-evidence.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { standaloneMain, stageExecutable } from '../dist-electron/electron/executable.js';
import { newProject } from '../dist-electron/electron/storage.js';
import { loadQualityContract, verifyApplication } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { solutionFixture, solutionFixtureEvaluator } from '../scripts/solution-fixture.mjs';
import { qualityFixtureHtml } from '../scripts/quality-fixture.mjs';

const navigationEvents = ['will-navigate', 'will-frame-navigate'];

// Exercise the emitted wrapper and actual registered event callbacks. Electron
// 45 supplies url/isMainFrame on the event object for both navigation events.
async function wrapper(root, source) {
  const handlers = new Map();
  let protocolHandler, openHandler, browserOptions, loadedUrl, permissionRequest, permissionCheck;
  const electron = {
    app: { setName() {}, setPath() {}, getPath: () => root, whenReady: () => Promise.resolve(), on() {} },
    protocol: { registerSchemesAsPrivileged() {}, handle(_scheme, handler) { protocolHandler = handler; } },
    Menu: { setApplicationMenu() {}, buildFromTemplate: value => value },
    BrowserWindow: class {
      constructor(options) {
        browserOptions = options;
        this.webContents = {
          setWindowOpenHandler(handler) { openHandler = handler; },
          on(name, handler) { handlers.set(name, handler); },
          session: {
            setPermissionRequestHandler(handler) { permissionRequest = handler; },
            setPermissionCheckHandler(handler) { permissionCheck = handler; }
          }
        };
      }
      loadURL(url) { loadedUrl = url; }
      on() {}
    }
  };
  const require = createRequire(import.meta.url);
  vm.runInNewContext(source, {
    require: name => name === 'electron' ? electron : require(name),
    __dirname: root, process: { platform: 'linux' }, URL, Response
  });
  await new Promise(resolve => setImmediate(resolve));
  for (const name of navigationEvents) assert.equal(typeof handlers.get(name), 'function');
  return {
    browserOptions, loadedUrl, protocolHandler, openHandler, permissionRequest, permissionCheck,
    prevented(name, url, ...frame) {
      let prevented = false;
      const event = { url, preventDefault() { prevented = true; } };
      if (!frame.length) event.isMainFrame = true;
      else if (frame[0] !== undefined) event.isMainFrame = frame[0];
      handlers.get(name)(event);
      return prevented;
    }
  };
}

async function write(root, relative, contents) {
  const file = path.join(root, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents);
}

async function fixture(t, files = ['index.html', 'details.html', 'reports/summary.html']) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-navigation-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return wrapper(root, standaloneMain('Navigation contract', 'test.navigation-contract', files));
}

for (const event of navigationEvents) {
  test(event + ' permits declared application pages with encoded paths, query strings and fragments', async t => {
    const emitted = await fixture(t);
    for (const url of [
      'fleet-app://app/index.html',
      'fleet-app://app/details.html',
      'fleet-app://app/details.html?view=report#summary',
      'fleet-app://app/%64etails.html?filter=a%2Fb#summary',
      'fleet-app://app/reports/%73ummary.html',
      'fleet-app://app/reports%2Fsummary.html?print=1'
    ]) assert.equal(emitted.prevented(event, url), false, url);
  });

  test(event + ' rejects destinations outside declared HTML pages', async t => {
    const emitted = await fixture(t, ['index.html', 'details.html', 'main.cjs', 'evaluate.CJS', 'app.js', 'data.json', 'text.txt', 'upper.HTML']);
    for (const url of [
      'https://app/details.html', 'http://127.0.0.1/details.html', 'file:///details.html',
      'javascript:alert(1)', 'data:text/html,<h1>Foreign page</h1>', 'blob:fleet-app://app/synthetic',
      'fleet-app://other/details.html', 'fleet-app://app.evil/details.html',
      'fleet-app://app:1234/details.html', 'fleet-app://user@app/details.html',
      'fleet-app://user:password@app/details.html', 'fleet-app://app/missing.html',
      'fleet-app://app/../private.html', 'fleet-app://app/%2e%2e/private.html',
      'fleet-app://app/%2564etails.html', 'fleet-app://app/main.cjs', 'fleet-app://app/evaluate.CJS',
      'fleet-app://app/app.js', 'fleet-app://app/data.json', 'fleet-app://app/text.txt',
      'fleet-app://app/upper.HTML', 'fleet-app://app/%', 'fleet-app://app/%E0%A4%A',
      'fleet-app://app/details.html%00', 'not a URL', '', null, undefined
    ]) assert.equal(emitted.prevented(event, url), true, String(url));
  });

  test(event + ' keeps subframes and missing main-frame evidence blocked', async t => {
    const emitted = await fixture(t);
    for (const isMainFrame of [false, null, 0, 1, 'true', undefined]) {
      assert.equal(emitted.prevented(event, 'fleet-app://app/details.html', isMainFrame), true, String(isMainFrame));
    }
  });
}

test('legacy single-page wrappers allow their entrypoint while preserving all renderer restrictions', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-legacy-navigation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const emitted = await wrapper(root, standaloneMain('Legacy application', 'test.legacy-navigation'));
  assert.equal(emitted.loadedUrl, 'fleet-app://app/index.html');
  for (const event of navigationEvents) {
    assert.equal(emitted.prevented(event, 'fleet-app://app/index.html?view=home#top'), false);
    assert.equal(emitted.prevented(event, 'fleet-app://app/not-declared.html'), true);
  }
  assert.equal(emitted.browserOptions.webPreferences.nodeIntegration, false);
  assert.equal(emitted.browserOptions.webPreferences.contextIsolation, true);
  assert.equal(emitted.browserOptions.webPreferences.sandbox, false);
  assert.equal(emitted.browserOptions.webPreferences.webviewTag, false);
  assert.equal(emitted.openHandler({ url: 'fleet-app://app/index.html' }).action, 'deny');
  assert.equal(emitted.openHandler({ url: 'https://example.com' }).action, 'deny');
  let permitted;
  emitted.permissionRequest(null, 'geolocation', value => { permitted = value; });
  assert.equal(permitted, false);
  assert.equal(emitted.permissionCheck(null, 'geolocation'), false);
});

test('a browser-verified multi-page app keeps its declared navigation after approved staging', { timeout: 30_000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-verified-navigation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), staging = path.join(root, 'staging');
  await fs.mkdir(workspace); await fs.mkdir(staging);
  const acceptance = [{ id: 'R1', requirement: 'Parse tasks and open the declared report page.', method: 'automated', scenario: 'Parse varied messages, then navigate to the report.' }];
  const files = solutionFixture(['R1']);
  const solution = JSON.parse(files['solution-contract.json']);
  solution.runtime.files = ['index.html', 'evaluate.cjs', 'reports/summary.html'];
  files['solution-contract.json'] = JSON.stringify(solution);
  const plan = JSON.parse(files['acceptance-plan.json']);
  plan.journeys[0].steps.push(
    { action: 'click', selector: '#report-link' },
    { action: 'expectText', selector: '#summary', text: 'Verified task report' }
  );
  files['acceptance-plan.json'] = JSON.stringify(plan);
  files['index.html'] = qualityFixtureHtml.replace('</body>', '<a id="report-link" href="./reports/%73ummary.html?view=report#summary">Open task report</a></body>');
  files['reports/summary.html'] = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Task report</title></head><body><h1 id="summary">Verified task report</h1><a href="../index.html">Return to parser</a></body></html>';
  files['evaluate.cjs'] = solutionFixtureEvaluator;
  files['app.test.cjs'] = `const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('delivered parser core',()=>{const context={};const html=fs.readFileSync('index.html','utf8');vm.runInNewContext(html.split('/* CORE_START */')[1].split('/* CORE_END */')[0],context);assert.equal(context.parseTask('TASK: inspect valve'),'inspect valve');});`;
  files['.fleet/packet.json'] = JSON.stringify({ acceptance });
  for (const [relative, contents] of Object.entries(files)) await write(workspace, relative, contents);
  const contract = await loadQualityContract(workspace, acceptance, true);
  const report = await verifyApplication(workspace, process.execPath, contract, undefined, { browserTimeoutMs: 20_000, browserStepTimeoutMs: 2_000 });
  assert.equal(reportPassed(report, 2), true, report.output);
  assert.equal(report.quality.journeys.length, 4);
  assert.equal(report.quality.journeys.every(journey => journey.status === 'passed'), true);
  const project = { ...newProject({ title: 'Verified report app', description: 'An offline task parser with a separate report page.', criteria: ['Parse tasks and open the report.'] }),
    workspace, status: 'approved', approvedAt: new Date().toISOString(), qualityVersion: 2, runtimeProfile: 'browser', report };
  bindSyntheticApproval(project);
  const staged = await stageExecutable(project, staging);
  const emitted = await wrapper(staged.source, await fs.readFile(path.join(staged.source, 'main.cjs'), 'utf8'));
  const reportUrl = 'fleet-app://app/reports/%73ummary.html?view=report#summary';
  const response = await emitted.protocolHandler({ url: reportUrl, method: 'GET' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.equal(await response.text(), files['reports/summary.html']);
  for (const event of navigationEvents) {
    assert.equal(emitted.prevented(event, reportUrl), false, 'A report proven by real browser journeys must remain reachable after staging.');
    assert.equal(emitted.prevented(event, 'fleet-app://app/index.html'), false, 'Return navigation remains available.');
    assert.equal(emitted.prevented(event, 'fleet-app://app/evaluate.cjs'), true);
  }
  assert.equal((await emitted.protocolHandler({ url: 'fleet-app://app/evaluate.cjs', method: 'GET' })).status, 404);
});
