import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { chromium } from 'playwright';
import { PreviewServers } from '../dist-electron/electron/preview.js';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';
import { standaloneMain } from '../dist-electron/electron/executable.js';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';

// A real two-input integer addition module, used by both the Node core and UI.
const wasm = Buffer.from('0061736d0100000001070160027f7f017f030201000707010361646400000a09010700200020016a0b', 'hex');
const files = ['index.html', 'core.mjs', 'sum.wasm'];
const core = `export async function invoke({a,b,mode='streaming'}) {
  const source=new URL('./sum.wasm',import.meta.url);
  const loaded=typeof document==='undefined'
    ? await WebAssembly.instantiate(await import('node:fs/promises').then(fs=>fs.readFile(source)))
    : mode==='streaming' ? await WebAssembly.instantiateStreaming(fetch(source))
      : await WebAssembly.instantiate(await fetch(source).then(response=>response.arrayBuffer()));
  return loaded.instance.exports.add(a,b);
}`;
// These checks execute as application script. DevTools evaluation itself would
// bypass CSP and could falsely suggest JavaScript string evaluation is allowed.
const javascriptChecks = `
  const result={inline:window.inlineScriptRan===true,module:true};
  try { eval('window.dynamicEvalRan=true'); result.evalBlocked=false; }
  catch(error) { result.evalBlocked=error instanceof EvalError; }
  try { new Function('window.dynamicFunctionRan=true')(); result.functionBlocked=false; }
  catch(error) { result.functionBlocked=error instanceof EvalError; }
`;
const html = `<!doctype html><title>Shared WebAssembly core</title><p id="result">Loading</p>
<script>window.inlineScriptRan=true;</script><script type="module">
import {invoke} from './core.mjs';
${javascriptChecks}
try { result.streaming=await invoke({a:17,b:25}); result.bytes=await invoke({a:-12,b:5,mode:'bytes'}); }
catch(error) { result.error=String(error); }
result.undeclaredStatus=(await fetch('./undeclared.wasm')).status;
window.wasmResult=result; document.querySelector('#result').textContent=JSON.stringify(result);
</script>`;

async function fixture(t, body = html) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-wasm-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await Promise.all([
    fs.writeFile(path.join(root, 'index.html'), body), fs.writeFile(path.join(root, 'core.mjs'), core),
    fs.writeFile(path.join(root, 'sum.wasm'), wasm), fs.writeFile(path.join(root, 'undeclared.wasm'), wasm)
  ]);
  return root;
}

async function browserPage(t) {
  const browser = await chromium.launch({ channel: 'chromium', headless: true, chromiumSandbox: false, timeout: 5_000 })
    .catch(() => chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: false, timeout: 5_000 }));
  t.after(() => browser.close());
  return browser.newPage();
}

async function resultAt(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => window.wasmResult, undefined, { timeout: 5_000 });
  return page.evaluate(() => window.wasmResult);
}

function assertApplicationResult(result, restricted = false) {
  assert.equal(result.inline, true, 'ordinary inline scripts remain available');
  assert.equal(result.module, true, 'ordinary module scripts remain available');
  assert.equal(result.evalBlocked, restricted, 'Only optional comparison previews restrict JavaScript eval');
  assert.equal(result.functionBlocked, restricted, 'Only optional comparison previews restrict Function construction');
  assert.equal(result.undeclaredStatus, 404, 'the undeclared WASM resource stays unavailable');
  assert.equal(result.streaming, 42, result.error);
  assert.equal(result.bytes, -7, result.error);
  assert.equal(result.error, undefined);
}

test('declared browser preview executes streaming and byte WebAssembly with JavaScript eval available', { timeout: 20_000 }, async t => {
  const root = await fixture(t), previews = new PreviewServers();
  t.after(() => previews.close());
  const page = await browserPage(t);
  assertApplicationResult(await resultAt(page, await previews.url(root, files)));
});

test('isolated browser preview and its Node evaluator execute the same declared WebAssembly core',
  { skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000 }, async t => {
    const root = await fixture(t);
    const runtime = await prepareIsolatedSolutionRuntime(root, { profile: 'browser', entrypoint: 'index.html',
      files, requiredEnv: [], evaluator: { runtime: 'node', entrypoint: 'core.mjs', args: [] } }, process.execPath);
    t.after(() => runtime.close());
    assert.equal(await runtime.invoke({ a: 17, b: 25 }), 42);
    assert.equal(await runtime.invoke({ a: -12, b: 5 }), -7);
    const page = await browserPage(t);
    assertApplicationResult(await resultAt(page, runtime.url), true);
    await runtime.assertIntegrity();
  });

test('legacy inline preview executes embedded WebAssembly and permits JavaScript eval', { timeout: 20_000 }, async t => {
  const legacy = `<!doctype html><title>Embedded WebAssembly</title><script>window.inlineScriptRan=true;
(async()=>{${javascriptChecks}
try { const {instance}=await WebAssembly.instantiate(new Uint8Array(${JSON.stringify([...wasm])}));
  result.first=instance.exports.add(17,25); result.second=instance.exports.add(-12,5); }
catch(error) { result.error=String(error); } window.wasmResult=result;})();</script>`;
  const root = await fixture(t, legacy), previews = new PreviewServers();
  t.after(() => previews.close());
  const result = await resultAt(await browserPage(t), await previews.url(root));
  assert.equal(result.inline, true);
  assert.equal(result.evalBlocked, false);
  assert.equal(result.functionBlocked, false);
  assert.equal(result.first, 42, result.error);
  assert.equal(result.second, -7, result.error);
  assert.equal(result.error, undefined);
});

// Execute the actual emitted protocol handler, then bridge its Responses into
// Chromium. This verifies MIME and CSP behavior without changing app policy or
// requiring a second Electron app in every repository test run.
async function standaloneUrl(t, root) {
  let handler;
  const electron = {
    app: { setName() {}, setPath() {}, getPath: () => root, whenReady: () => Promise.resolve(), on() {} },
    protocol: { registerSchemesAsPrivileged() {}, handle(_scheme, value) { handler = value; } },
    Menu: { setApplicationMenu() {}, buildFromTemplate: value => value },
    BrowserWindow: class {
      webContents = { setWindowOpenHandler() {}, on() {}, session: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} } };
      loadURL() {}
      on() {}
    }
  };
  const require = createRequire(import.meta.url);
  vm.runInNewContext(standaloneMain('WebAssembly parity', 'test.wasm.parity', files), {
    require: name => name === 'electron' ? electron : require(name), __dirname: root, process: { platform: 'linux' }, URL, Response
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof handler, 'function');
  const server = createServer(async (request, response) => {
    try {
      const result = await handler({ url: 'fleet-app://app' + request.url, method: request.method });
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) { response.writeHead(500).end(String(error)); }
  });
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}/index.html`;
}

test('emitted standalone responses execute the same WASM core and retain resource and eval restrictions', { timeout: 20_000 }, async t => {
  const root = await fixture(t), url = await standaloneUrl(t, root);
  assertApplicationResult(await resultAt(await browserPage(t), url), true);
});

for (const broken of [false, true]) test(`host browser acceptance ${broken ? 'rejects incorrect' : 'accepts correct'} shared WASM output at both widths`,
  { timeout: 30_000 }, async t => {
    const application = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WASM addition</title><style>body{margin:16px;font:16px sans-serif}label{display:block;margin:8px 0}input{width:80px}button{margin:4px}</style>
<main><h1>WASM addition</h1><label>First integer <input id="a" type="number"></label><label>Second integer <input id="b" type="number"></label>
<button id="streaming">Add with streaming</button><button id="bytes">Add with bytes</button><p id="sum">Ready</p></main>
<script type="module">import {invoke} from './core.mjs';
for(const mode of ['streaming','bytes']) document.getElementById(mode).onclick=async()=>{
  const result=await invoke({a:Number(document.querySelector('#a').value),b:Number(document.querySelector('#b').value),mode});
  document.querySelector('#sum').dataset.core=String(result);
  document.querySelector('#sum').textContent='Sum: '+(result${broken ? '+1' : ''});
};</script></html>`;
    const root = await fixture(t, application), previews = new PreviewServers();
    t.after(() => previews.close());
    const url = await previews.url(root, files);
    if (broken) {
      // Prove the application's visible error independently of the verifier's
      // equal-duration inner assertion and outer step deadline timers.
      const page = await browserPage(t);
      await page.goto(url);
      await page.locator('#a').fill('17'); await page.locator('#b').fill('25');
      await page.locator('#streaming').click();
      await page.waitForFunction(() => document.querySelector('#sum')?.dataset.core === '42', undefined, { timeout: 5_000 });
      assert.equal(await page.locator('#sum').innerText(), 'Sum: 43');
      await page.context().browser().close();
    }
    const result = await verifyBrowserJourneys({ root, url, allowSameOrigin: true,
      contractHash: 'a'.repeat(64), timeoutMs: 20_000, stepTimeoutMs: 1_500,
      plan: { schemaVersion: 1,
        criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Add the supplied integers using the shared WASM core.', journeyIds: ['add'] }],
        journeys: [{ id: 'add', title: 'Add positive and negative integers', kind: 'primary', steps: [
          { action: 'fill', selector: '#a', value: '17' }, { action: 'fill', selector: '#b', value: '25' },
          { action: 'click', selector: '#streaming' }, { action: 'expectText', selector: '#sum', text: 'Sum: 42' },
          { action: 'fill', selector: '#a', value: '-12' }, { action: 'fill', selector: '#b', value: '5' },
          { action: 'click', selector: '#bytes' }, { action: 'expectText', selector: '#sum', text: 'Sum: -7' }
        ] }]
      } });
    assert.deepEqual(result.errors, [], JSON.stringify(result));
    assert.deepEqual(result.journeys.map(item => item.viewport), ['desktop', 'narrow']);
    for (const item of result.journeys) {
      assert.equal(item.status, broken ? 'failed' : 'passed', JSON.stringify(result));
      if (broken) assert.match(item.detail, /expectText #sum: expected "Sum: 42", received "Sum: 43"|Browser step exceeded its 1\.5-second limit\./);
      assert.ok(item.screenshot?.startsWith('.quality-evidence/'));
      assert.ok(item.trace?.endsWith('.zip'));
      const screenshot = await fs.readFile(path.join(root, item.screenshot));
      assert.equal(screenshot.readUInt32BE(16), item.viewport === 'desktop' ? 1280 : 390);
      assert.equal(screenshot.readUInt32BE(20), item.viewport === 'desktop' ? 800 : 844);
      const trace = await fs.readFile(path.join(root, item.trace));
      assert.equal(trace.readUInt32LE(0), 0x04034b50, 'The retained trace is a ZIP archive.');
    }
  });
