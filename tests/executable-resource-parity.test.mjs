import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { PreviewServers } from '../dist-electron/electron/preview.js';
import { standaloneMain, stageExecutable } from '../dist-electron/electron/executable.js';
import { newProject } from '../dist-electron/electron/storage.js';
import { loadQualityContract, verifyApplication } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { solutionFixture, solutionFixtureEvaluator } from '../scripts/solution-fixture.mjs';
import { qualityFixtureHtml } from '../scripts/quality-fixture.mjs';

async function write(root, relative, contents) {
  const destination = path.join(root, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, contents);
}

// Execute the emitted host wrapper, including its protocol handler, without
// launching Electron or substituting a second implementation of asset serving.
async function wrapper(root, source) {
  let handler, browserOptions;
  const electron = {
    app: { setName() {}, setPath() {}, getPath: () => root, whenReady: () => Promise.resolve(), on() {} },
    protocol: { registerSchemesAsPrivileged() {}, handle(_scheme, value) { handler = value; } },
    Menu: { setApplicationMenu() {}, buildFromTemplate: value => value },
    BrowserWindow: class {
      constructor(options) {
        browserOptions = options;
        this.webContents = { setWindowOpenHandler() {}, on() {}, session: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} } };
      }
      loadURL() {} on() {}
    }
  };
  const require = createRequire(import.meta.url);
  vm.runInNewContext(source, {
    require: name => name === 'electron' ? electron : require(name),
    __dirname: root, process: { platform: 'linux' }, URL, Response
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof handler, 'function');
  assert.equal(browserOptions.webPreferences.nodeIntegration, false);
  assert.equal(browserOptions.webPreferences.contextIsolation, true);
  assert.equal(browserOptions.webPreferences.sandbox, true);
  return handler;
}

async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-resource-parity-'));
  const previews = new PreviewServers();
  t.after(async () => { previews.close(); await fs.rm(root, { recursive: true, force: true }); });
  for (const [relative, contents] of Object.entries(files)) await write(root, relative, contents);
  const names = Object.keys(files);
  const url = await previews.url(root, names);
  const handler = await wrapper(root, standaloneMain('Asset parity', 'test.asset-parity', names));
  return { root, url, handler };
}

test('declared data resources preserve preview status, MIME type and exact bytes in the standalone wrapper', async t => {
  const data = {
    'data/tasks.csv': Buffer.from('task,count\ninspect valve,3\n'),
    'data/readme.txt': Buffer.from('Offline task instructions.\n'),
    'data/model.bin': Buffer.from([0, 255, 128, 10, 0, 1]),
    'data/custom.fleetdata': Buffer.from([4, 0, 250, 9]),
    'data/dataset': Buffer.from('extensionless seed data'),
    'data/empty.bin': Buffer.alloc(0),
    'data/UPPER.CSV': Buffer.from('key,value\npriority,high\n')
  };
  const { url, handler } = await fixture(t, { 'index.html': '<h1>Data-driven app</h1>', ...data });
  for (const [relative, bytes] of Object.entries(data)) await t.test(relative, async () => {
    const preview = await fetch(new URL(relative, url), { headers: { connection: 'close' } });
    const packaged = await handler({ url: new URL(relative, 'fleet-app://app/').href, method: 'GET' });
    assert.equal(preview.status, 200);
    assert.equal(packaged.status, preview.status, `${relative} must survive delivery`);
    assert.equal(packaged.headers.get('content-type'), preview.headers.get('content-type'));
    assert.equal(packaged.headers.get('x-content-type-options'), 'nosniff');
    assert.match(packaged.headers.get('content-security-policy'), /connect-src 'self'/);
    assert.match(packaged.headers.get('content-security-policy'), /object-src 'none'/);
    assert.deepEqual(Buffer.from(await preview.arrayBuffer()), bytes);
    assert.deepEqual(Buffer.from(await packaged.arrayBuffer()), bytes);
  });
});

test('standalone resource fallback preserves supported browser MIME types and request restrictions', async t => {
  const assets = {
    'index.html': '<h1>Asset contract</h1>', 'assets/app.js': 'window.ready=true;',
    'assets/module.mjs': 'export const ready=true;', 'assets/style.css': 'body{color:#123}',
    'assets/data.json': '{"ready":true}', 'assets/mark.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'assets/mark.png': Buffer.from([137, 80, 78, 71]), 'assets/mark.jpg': Buffer.from([255, 216, 255]),
    'assets/font.woff2': Buffer.from([119, 79, 70, 50]), 'assets/engine.wasm': Buffer.from([0, 97, 115, 109]),
    'main.cjs': 'throw new Error("Generated main must stay payload data");',
    'assets/evaluator.CJS': 'throw new Error("CommonJS is not a browser module");'
  };
  const { root, url, handler } = await fixture(t, assets);
  for (const relative of Object.keys(assets).filter(file => !/\.cjs$/i.test(file))) {
    const preview = await fetch(new URL(relative, url), { headers: { connection: 'close' } });
    const packaged = await handler({ url: new URL(relative, 'fleet-app://app/').href, method: 'GET' });
    assert.equal(preview.status, 200, relative);
    assert.equal(packaged.status, 200, relative);
    assert.equal(packaged.headers.get('content-type'), preview.headers.get('content-type'), relative);
    assert.equal(packaged.headers.get('x-content-type-options'), 'nosniff', relative);
    assert.deepEqual(Buffer.from(await packaged.arrayBuffer()), Buffer.from(await preview.arrayBuffer()), relative);
  }
  await write(root, 'undeclared.csv', 'private seed data');
  await write(root, '.env', 'PRIVATE=hidden');
  await write(root, 'evaluation-plan.json', '{"answer":"private"}');
  for (const relative of ['undeclared.csv', '.env', 'evaluation-plan.json']) {
    assert.equal((await fetch(new URL(relative, url), { headers: { connection: 'close' } })).status, 404, relative);
    assert.equal((await handler({ url: new URL(relative, 'fleet-app://app/').href, method: 'GET' })).status, 404, relative);
  }
  // Preview historically serves declared CommonJS as inert octet-stream data.
  // Delivery intentionally retains its stricter CommonJS source restriction.
  for (const relative of ['main.cjs', 'assets/evaluator.CJS']) {
    assert.equal((await handler({ url: new URL(relative, 'fleet-app://app/').href, method: 'GET' })).status, 404, relative);
  }
  assert.equal((await handler({ url: 'fleet-app://other/index.html', method: 'GET' })).status, 404);
  assert.equal((await handler({ url: 'fleet-app://app/assets/%2e%2e/%2e%2e/undeclared.csv', method: 'GET' })).status, 404);
  for (const method of ['POST', 'HEAD']) {
    assert.equal((await fetch(url, { method, headers: { connection: 'close' } })).status, 404, method);
    assert.equal((await handler({ url: 'fleet-app://app/index.html', method })).status, 404, method);
  }
});

test('a browser-verified CSV-dependent app serves the same data after approved executable staging', { timeout: 30_000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-verified-resource-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), staging = path.join(root, 'staging');
  await fs.mkdir(workspace); await fs.mkdir(staging);
  const acceptance = [{ id: 'R1', requirement: 'Parse tasks with supplied seed data available.', method: 'automated', scenario: 'Parse varied messages and load the supplied CSV.' }];
  const files = solutionFixture(['R1']);
  const solution = JSON.parse(files['solution-contract.json']);
  solution.runtime.files = ['index.html', 'evaluate.cjs', 'assets/tasks.csv'];
  files['solution-contract.json'] = JSON.stringify(solution);
  const plan = JSON.parse(files['acceptance-plan.json']);
  for (const journey of plan.journeys) journey.steps.unshift({ action: 'expectText', selector: '#seed', text: 'task,count\ninspect valve,3' });
  files['acceptance-plan.json'] = JSON.stringify(plan);
  files['assets/tasks.csv'] = 'task,count\ninspect valve,3\n';
  files['index.html'] = qualityFixtureHtml.replace('</body>', `<pre id="seed" aria-live="polite"></pre><script>
fetch('./assets/tasks.csv').then(response=>{if(!response.ok)throw new Error('Seed data unavailable');return response.text();})
.then(csv=>{document.getElementById('seed').textContent=csv;});</script></body>`);
  files['evaluate.cjs'] = solutionFixtureEvaluator;
  files['app.test.cjs'] = `const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('delivered parser uses its actual core and CSV data',()=>{const context={};const html=fs.readFileSync('index.html','utf8');vm.runInNewContext(html.split('/* CORE_START */')[1].split('/* CORE_END */')[0],context);const task=fs.readFileSync('assets/tasks.csv','utf8').trim().split('\\n')[1].split(',')[0];assert.equal(context.parseTask('TASK: '+task),'inspect valve');});`;
  files['.fleet/packet.json'] = JSON.stringify({ acceptance });
  for (const [relative, contents] of Object.entries(files)) await write(workspace, relative, contents);
  const contract = await loadQualityContract(workspace, acceptance, true);
  const report = await verifyApplication(workspace, process.execPath, contract, undefined, { browserTimeoutMs: 20_000, browserStepTimeoutMs: 2_000 });
  assert.equal(reportPassed(report, 2), true, report.output);
  const project = { ...newProject({ title: 'Verified CSV app', description: 'An offline parser that loads supplied CSV data.', criteria: ['Parse tasks with seed data.'] }),
    workspace, status: 'approved', approvedAt: new Date().toISOString(), qualityVersion: 2, runtimeProfile: 'browser', report };
  const staged = await stageExecutable(project, staging);
  const handler = await wrapper(staged.source, await fs.readFile(path.join(staged.source, 'main.cjs'), 'utf8'));
  const response = await handler({ url: 'fleet-app://app/assets/tasks.csv', method: 'GET' });
  assert.equal(response.status, 200, 'Data verified by the real browser journeys must be accessible after staging.');
  assert.equal(response.headers.get('content-type'), 'application/octet-stream');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await response.text(), files['assets/tasks.csv']);
  assert.equal((await handler({ url: 'fleet-app://app/evaluate.cjs', method: 'GET' })).status, 404);
});
