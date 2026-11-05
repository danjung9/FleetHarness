import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';

const fileName = 'tasks.json';
const contents = JSON.stringify({ task: 'Inspect pump' });
const exported = { action: 'expectText', selector: '#result', text: 'Export requested' };
const expected = overrides => ({ action: 'expectDownload', selector: '#export', fileName, text: contents, ...overrides });

function application({ duplicate = false, reloadDownload = false, initialDownload = false } = {}) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Task export</title>
  <style>*{box-sizing:border-box}body{margin:0;padding:16px;font:16px sans-serif}button,a{max-width:100%}</style>
  <main><h1>Task export</h1><p id="result">Ready</p><button id="export">Export tasks</button>
  <button id="later-export">Export again</button><a id="attachment" href="/attachment">Download attachment</a></main><script>
  function download(name=${JSON.stringify(fileName)}) {
    const link=document.createElement('a');
    link.href=URL.createObjectURL(new Blob([${JSON.stringify(contents)}],{type:'application/json'}));
    link.download=name;
    link.click();
  }
  document.querySelector('#export').onclick=()=>{
    download();
    ${duplicate ? "download('unplanned-extra.json');" : ''}
    ${reloadDownload ? "sessionStorage.setItem('download-on-reload','yes');" : ''}
    document.querySelector('#result').textContent='Export requested';
  };
  document.querySelector('#later-export').onclick=()=>{download('unplanned-later.json');document.querySelector('#result').textContent='Export requested';};
  ${reloadDownload ? "if(sessionStorage.getItem('download-on-reload')==='yes'){download('unplanned-reload.json');document.querySelector('#result').textContent='Reload export requested';}" : ''}
  ${initialDownload ? "download('unplanned-load.json');document.querySelector('#result').textContent='Load export requested';" : ''}
  </script></html>`;
}

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-download-'));
  const html = application(options), requests = [];
  await fs.writeFile(path.join(root, 'index.html'), html);
  const server = createServer((request, response) => {
    requests.push(request.url);
    if (request.url === '/attachment') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' });
      response.end(contents);
    } else response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end(html);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, requests, url: `http://127.0.0.1:${server.address().port}/` };
}

function plan(steps) {
  return { schemaVersion: 1,
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Export the requested task file.', journeyIds: ['export'] }],
    journeys: [{ id: 'export', title: 'Export a task file', kind: 'primary', steps }] };
}

async function verify(app, steps) {
  return verifyBrowserJourneys({ root: app.root, url: app.url, allowSameOrigin: true,
    plan: plan(steps), contractHash: 'd'.repeat(64), timeoutMs: 20_000, stepTimeoutMs: 2000 });
}

async function both(app, result, status, pattern) {
  assert.deepEqual(result.errors, [], JSON.stringify(result));
  assert.deepEqual(result.journeys.map(item => item.viewport), ['desktop', 'narrow']);
  for (const item of result.journeys) {
    assert.equal(item.status, status, JSON.stringify(result));
    if (pattern) assert.match(item.detail, pattern, JSON.stringify(result));
    assert.ok(item.screenshot?.startsWith('.quality-evidence/'), 'Every executed journey retains screenshot evidence.');
    assert.ok(item.trace?.endsWith('.zip'), 'Every executed journey retains trace evidence.');
    const screenshot = await fs.readFile(path.join(app.root, item.screenshot));
    assert.equal(screenshot.readUInt32BE(16), item.viewport === 'desktop' ? 1280 : 390);
    assert.equal(screenshot.readUInt32BE(20), item.viewport === 'desktop' ? 800 : 844);
    const trace = await fs.readFile(path.join(app.root, item.trace));
    assert.equal(trace.readUInt32LE(0), 0x04034b50, 'The recorded trace is a ZIP archive.');
  }
}

test('ordinary click cannot authorize a blob export even when the visible outcome passes', { timeout: 30_000 }, async t => {
  const app = await fixture(t);
  await both(app, await verify(app, [{ action: 'click', selector: '#export' }, exported]), 'failed', /unexpected.*download|unplanned.*download|download.*(?:unexpected|unplanned)/i);
});

test('a page-load export fails before any frozen download expectation', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { initialDownload: true });
  await both(app, await verify(app, [{ action: 'expectText', selector: '#result', text: 'Load export requested' }]), 'failed', /unexpected.*download|unplanned.*download|download.*(?:unexpected|unplanned)/i);
});

test('one declared blob export preserves filename, contents and evidence at both widths', { timeout: 30_000 }, async t => {
  const app = await fixture(t);
  await both(app, await verify(app, [expected(), exported]), 'passed');
});

for (const [label, changes, detail] of [
  ['filename', { fileName: 'wrong.json' }, /download.*(?:filename|file name)|expected.*wrong\.json/i],
  ['contents', { text: 'Wrong task contents' }, /Downloaded content/i]
]) test(`declaring a blob export does not bypass its ${label} assertion`, { timeout: 30_000 }, async t => {
  const app = await fixture(t);
  await both(app, await verify(app, [expected(changes), exported]), 'failed', detail);
});

test('one declared export cannot authorize a second download from the same click', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { duplicate: true });
  await both(app, await verify(app, [expected(), exported]), 'failed', /unexpected.*download|unplanned.*download|download.*(?:unexpected|unplanned)/i);
});

test('download permission ends before an ordinary click in the next step', { timeout: 30_000 }, async t => {
  const app = await fixture(t);
  await both(app, await verify(app, [expected(), { action: 'click', selector: '#later-export' }, exported]), 'failed', /unexpected.*download|unplanned.*download|download.*(?:unexpected|unplanned)/i);
});

test('a new frozen expectation grants one new download after a completed export', { timeout: 30_000 }, async t => {
  const app = await fixture(t);
  await both(app, await verify(app, [expected(), exported, expected(), exported]), 'passed');
});

test('download permission does not survive reload after a declared export', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { reloadDownload: true });
  await both(app, await verify(app, [expected(), { action: 'reload' },
    { action: 'expectText', selector: '#result', text: 'Reload export requested' }]), 'failed', /unexpected.*download|unplanned.*download|download.*(?:unexpected|unplanned)/i);
});

test('a declared same-origin HTTP attachment still verifies its filename and contents', { timeout: 30_000 }, async t => {
  const app = await fixture(t);
  await both(app, await verify(app, [expected({ selector: '#attachment' }),
    { action: 'expectText', selector: '#result', text: 'Ready' }]), 'passed');
  assert.equal(app.requests.filter(url => url === '/attachment').length, 2, 'Both viewports must fetch the attachment.');
});
