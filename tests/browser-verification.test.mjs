import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createServer } from 'node:http';
import { createSocket } from 'node:dgram';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';

const application = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Task editor</title>
<style>*{box-sizing:border-box}body{font:16px sans-serif;padding:16px;margin:0}input,select,button{max-width:100%}label{display:block;margin:8px 0}</style>
<main><h1>Task editor</h1><section id="editor"><label>Task <input id="task"></label><label>Priority <select id="priority"><option>Low</option><option>High</option></select></label>
<label><input id="confirmed" type="checkbox"> Confirm details</label><button id="save" type="button">Save task</button></section><p id="error" role="alert"></p><p id="result">No saved task.</p><button id="export">Export</button></main>
<script>
const task=document.querySelector('#task'), result=document.querySelector('#result'), error=document.querySelector('#error');
task.value=localStorage.getItem('task')||'';
document.querySelector('#save').onclick=()=>{if(!task.value.trim()){error.textContent='Enter a task.';return;}error.textContent='';localStorage.setItem('task',task.value);result.textContent='Saved: '+task.value+' ('+document.querySelector('#priority').value+')';};
task.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();document.querySelector('#save').click();}};
document.querySelector('#export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({task:task.value})],{type:'application/json'}));a.download='tasks.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
</script></html>`;

function plan(steps = [
  { action: 'expectValue', selector: '#task', value: '' },
  { action: 'fill', selector: '#task', value: 'Inspect pump' },
  { action: 'select', selector: '#priority', value: 'High' },
  { action: 'check', selector: '#confirmed' },
  { action: 'press', selector: '#task', key: 'Enter' },
  { action: 'expectText', selector: '#result', text: 'Saved: Inspect pump (High)' },
  { action: 'expectDownload', selector: '#export', fileName: 'tasks.json', text: '"task":"Inspect pump"' },
  { action: 'reload' },
  { action: 'expectValue', selector: '#task', value: 'Inspect pump' }
]) {
  return { schemaVersion: 1, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Save, reload and recover from invalid input.', journeyIds: ['save', 'recover'] }], journeys: [
    { id: 'save', title: 'Save and export a task', kind: 'primary', steps },
    { id: 'recover', title: 'Recover from an empty task', kind: 'recovery', steps: [
      { action: 'expectValue', selector: '#task', value: '' },
      { action: 'fill', selector: '#task', value: '' },
      { action: 'click', selector: '#save' },
      { action: 'expectVisible', selector: '#error' },
      { action: 'expectText', selector: '#error', text: 'Enter a task.' },
      { action: 'fill', selector: '#task', value: 'Recovered' },
      { action: 'click', selector: '#save' },
      { action: 'expectText', selector: '#result', text: 'Saved: Recovered (Low)' }
    ] }
  ] };
}

async function workspace(t, html = application) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'index.html'), html);
  return root;
}
const verify = (root, overrides = {}) => verifyBrowserJourneys({ root, plan: plan(), contractHash: 'a'.repeat(64), timeoutMs: 20_000, stepTimeoutMs: 600, ...overrides });

test('actual browser journeys cover keyboard, selection, validation, reload persistence and downloads at both viewport sizes', { timeout: 30_000 }, async t => {
  const root = await workspace(t);
  const result = await verify(root, { stepTimeoutMs: 2500 });
  assert.deepEqual(result.errors, []);
  assert.equal(result.journeys.length, 4);
  for (const journey of result.journeys) {
    assert.equal(journey.status, 'passed', journey.detail);
    assert.ok(journey.screenshot?.startsWith('.quality-evidence/'));
    assert.ok(journey.trace?.endsWith('.zip'));
    const screenshot = await fs.readFile(path.join(root, journey.screenshot));
    assert.equal(screenshot.readUInt32BE(16), journey.viewport === 'desktop' ? 1280 : 390);
    assert.equal(screenshot.readUInt32BE(20), journey.viewport === 'desktop' ? 800 : 844);
    assert.ok((await fs.stat(path.join(root, journey.trace))).size > 0);
  }
});

test('native download assertions reuse each file until an edit requires a fresh export', { timeout: 30_000 }, async t => {
  const html = application.replace('</main>', '<button id="second-export">Export second file</button><p id="captures">0</p></main>')
    .replace('</script>', `let captures=0;
      for(const id of ['export','second-export']) document.getElementById(id).onclick=()=>{
        document.getElementById('captures').textContent=String(++captures);
        const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([Array.from({length:9},(_,i)=>'part-'+i+': '+task.value).join('\\n')]));
        a.download=id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      };</script>`);
  const root = await workspace(t, html);
  const steps = [{ action: 'fill', selector: '#task', value: 'Inspect pump' }];
  for (let i = 0; i < 9; i++) for (const selector of ['#export', '#second-export']) {
    steps.push({ action: 'expectDownload', selector, fileName: selector.slice(1) + '.txt', text: 'part-' + i + ': Inspect pump' });
  }
  steps.push({ action: 'expectText', selector: '#captures', text: '2' },
    { action: 'fill', selector: '#task', value: 'Inspect valve' },
    { action: 'expectDownload', selector: '#export', fileName: 'export.txt', text: 'part-8: Inspect valve' },
    { action: 'expectText', selector: '#captures', text: '3' },
    { action: 'expectDownload', selector: '#export', fresh: true, text: 'part-0: Inspect valve' },
    { action: 'expectText', selector: '#captures', text: '4' });
  const result = await verify(root, { plan: plan(steps), stepTimeoutMs: 2500 });
  assert.deepEqual(result.errors, []);
  assert.equal(result.journeys.length, 4);
  assert.ok(result.journeys.every(journey => journey.status === 'passed'), JSON.stringify(result));
});

test('passing core tests cannot hide a wrong rendered result', { timeout: 20_000 }, async t => {
  const root = await workspace(t, application.replace("result.textContent='Saved: '+task.value+' ('+document.querySelector('#priority').value+')'", "result.textContent='Wrong result'"));
  await fs.writeFile(path.join(root, 'app.test.cjs'), 'require("node:test")("core passes",()=>require("node:assert/strict").equal(2+2,4));');
  assert.equal(reportPassed(await verifyWorkspace(root, process.execPath, () => {})), true);
  const result = await verify(root, { stepTimeoutMs: 250 });
  assert.equal(result.journeys.every(journey => journey.status === 'failed'), true);
  assert.match(result.journeys[0].detail, /expectText|step exceeded/);
  assert.ok(result.journeys[0].screenshot);
});

test('a correct primary flow does not conceal broken error recovery or incorrect export contents', { timeout: 20_000 }, async t => {
  const root = await workspace(t, application.replace("error.textContent='Enter a task.'", "error.textContent='Unknown error'").replace('JSON.stringify({task:task.value})', 'JSON.stringify({task:"wrong task"})'));
  const result = await verify(root, { stepTimeoutMs: 250 });
  assert.ok(result.journeys.filter(j => j.id === 'save').every(j => j.status === 'failed' && /Downloaded content/.test(j.detail)));
  assert.ok(result.journeys.filter(j => j.id === 'recover').every(j => j.status === 'failed'));
});

test('the preview supports native form events and permits external form navigation', { timeout: 20_000 }, async t => {
  const nativeForm = application.replace('<section id="editor">', '<form id="editor">').replace('</section>', '</form>')
    .replace('id="save" type="button"', 'id="save" type="submit"')
    .replace("document.querySelector('#save').onclick=()=>{", "document.querySelector('#editor').onsubmit=e=>{e.preventDefault();")
    .replace("task.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();document.querySelector('#save').click();}};", '');
  const root = await workspace(t, nativeForm);
  const result = await verify(root, { stepTimeoutMs: 1000 });
  assert.ok(result.journeys.every(j => j.status === 'passed'), JSON.stringify(result));
  let requests = 0;
  const remote = createServer((_request, response) => { requests++; response.end('unexpected'); });
  await new Promise(resolve => remote.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => remote.close(resolve)));
  await fs.writeFile(path.join(root, 'index.html'), `<!doctype html><form action="http://127.0.0.1:${remote.address().port}"><label>Task<input id="task" name="task"></label><button>Send</button></form>`);
  const blocked = await verify(root, { stepTimeoutMs: 200, plan: plan([
    { action: 'fill', selector: '#task', value: 'Inspect pump' },
    { action: 'press', selector: '#task', key: 'Enter' },
    { action: 'expectValue', selector: '#task', value: 'Inspect pump' }
  ]) });
  assert.ok(requests > 0);
  assert.ok(blocked.journeys.filter(j => j.id === 'save').every(j => j.status === 'failed'), JSON.stringify(blocked));
});

test('console errors, runtime errors and narrow overflow fail otherwise working journeys', { timeout: 20_000 }, async t => {
  let requests = 0;
  const remote = createServer((_request, response) => { requests++; response.end('unexpected'); });
  await new Promise(resolve => remote.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => remote.close(resolve)));
  const url = 'http://127.0.0.1:' + remote.address().port;
  const html = application.replace('</script>', `console.error('broken console');setTimeout(()=>{throw Error('broken runtime')},0);fetch(${JSON.stringify(url)}).catch(()=>{});</script><style>main{min-width:700px}</style>`);
  const root = await workspace(t, html);
  const result = await verify(root);
  assert.ok(requests > 0, 'Generated scripts may reach other origins.');
  assert.ok(result.journeys.every(j => j.status === 'failed'));
  assert.match(result.journeys[0].detail, /broken console/);
  assert.match(result.journeys[0].detail, /broken runtime/);
  assert.match(result.journeys.find(j => j.viewport === 'narrow').detail, /Horizontal overflow/);
});

test('optional comparison verification blocks redirect, WebSocket and WebRTC egress while preserving same-origin service calls', { timeout: 20_000 }, async t => {
  let remoteRequests = 0, upgrades = 0, datagrams = 0, serviceCalls = 0, redirects = 0;
  const remote = createServer((_request, response) => { remoteRequests++; response.end('unexpected'); });
  remote.on('upgrade', (_request, socket) => { upgrades++; socket.destroy(); });
  await new Promise(resolve => remote.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { remote.closeAllConnections(); remote.close(resolve); }));
  const udp = createSocket('udp4');
  udp.on('message', () => { datagrams++; });
  await new Promise(resolve => udp.bind(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => udp.close(resolve)));
  const remoteUrl = `http://127.0.0.1:${remote.address().port}/`;
  const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><p id="result">Checking</p><script>
    fetch('/redirect').catch(()=>{});
    const socket = new WebSocket(${JSON.stringify(remoteUrl.replace('http:', 'ws:'))});
    const peer = new RTCPeerConnection({iceServers:[{urls:'stun:127.0.0.1:${udp.address().port}'}]});
    peer.createDataChannel('probe');
    peer.createOffer().then(offer=>peer.setLocalDescription(offer)).catch(()=>{});
    fetch('/health').then(response=>response.text()).then(text=>setTimeout(()=>{document.querySelector('#result').textContent=text;peer.close();socket.close();},1000));
  </script>`;
  const root = await workspace(t, html);
  const runtime = createServer((request, response) => {
    if (request.url === '/redirect') { redirects++; response.writeHead(302, { Location: remoteUrl }).end(); }
    else if (request.url === '/health') { serviceCalls++; response.end('Same-origin service works'); }
    else response.writeHead(200, { 'Content-Type': 'text/html' }).end(html);
  });
  await new Promise(resolve => runtime.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { runtime.closeAllConnections(); runtime.close(resolve); }));
  const checks = plan([{ action: 'expectText', selector: '#result', text: 'Same-origin service works' }]);
  checks.journeys = checks.journeys.slice(0, 1);
  const result = await verify(root, { url: `http://127.0.0.1:${runtime.address().port}/`, isolateNetwork: true, allowSameOrigin: true, stepTimeoutMs: 2500, plan: checks });
  assert.deepEqual(result.errors, []);
  assert.equal(serviceCalls, 2, 'Both verification viewports must complete the allowed service call.');
  assert.equal(redirects, 2, 'The test must exercise an allowed first redirect hop.');
  assert.ok(result.journeys.every(journey => journey.status === 'failed' && /blocked WebSocket/.test(journey.detail)), JSON.stringify(result));
  assert.ok(result.journeys.every(journey => !/expectText|step exceeded/i.test(journey.detail)), JSON.stringify(result));
  assert.equal(remoteRequests, 0, 'Redirect destinations must pass the same-origin transport policy.');
  assert.equal(upgrades, 0, 'WebSocket upgrades must never reach another server.');
  assert.equal(datagrams, 0, 'WebRTC must never send non-proxied UDP datagrams.');
});

test('a hung browser script hits the overall deadline and releases the browser and preview', { timeout: 12_000 }, async t => {
  const root = await workspace(t, '<!doctype html><script>while(true){}</script>');
  const started = performance.now();
  const result = await verify(root, { timeoutMs: 1800, stepTimeoutMs: 250 });
  assert.ok(performance.now() - started < 6000);
  assert.equal(result.journeys.length, 4);
  assert.ok(result.journeys.every(j => j.status === 'failed'));
  assert.match(result.errors.join('\n'), /limit/);
  await fs.writeFile(path.join(root, 'index.html'), application);
  assert.ok((await verify(root)).journeys.every(j => j.status === 'passed'), 'A subsequent run can start normally after timeout cleanup.');
});

test('cancellation while waiting for the app settles promptly and an already cancelled run creates no evidence', { timeout: 12_000 }, async t => {
  const root = await workspace(t), controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  const started = performance.now();
  try {
    await assert.rejects(verify(root, { signal: controller.signal, stepTimeoutMs: 10_000, plan: plan([{ action: 'click', selector: '#missing' }]) }), /stopped/);
  } finally { clearTimeout(timer); }
  assert.ok(performance.now() - started < 6000);
  const empty = await workspace(t);
  await assert.rejects(verify(empty, { signal: controller.signal }), /stopped/);
  await assert.rejects(fs.access(path.join(empty, '.quality-evidence')), /ENOENT/);
});

test('an unavailable browser is an actionable failure, never skipped verification', { timeout: 5000 }, async t => {
  const root = await workspace(t);
  const result = await verify(root, { executable: path.join(root, 'missing-browser') });
  assert.match(result.errors.join('\n'), /Install Google Chrome.*setup:browser/s);
  assert.equal(result.journeys.length, 4);
  assert.ok(result.journeys.every(j => j.status === 'failed'));
});

test('browser evidence cannot be written through an application-created symlink', async t => {
  const root = await workspace(t), elsewhere = await workspace(t);
  await fs.symlink(elsewhere, path.join(root, '.quality-evidence'), 'dir');
  const result = await verify(root);
  assert.match(result.errors.join('\n'), /real workspace directory/);
  assert.deepEqual(await fs.readdir(elsewhere), ['index.html']);
});
