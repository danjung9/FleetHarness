import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createSocket } from 'node:dgram';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { createRuntimeFilesHasher } from '../dist-electron/electron/runtime-files-hash.js';
import { AgentBrowserSession } from '../dist-electron/electron/agent-browser.js';
import { VisualReviewLedger, runtimeFilesHash } from '../dist-electron/electron/visual-review.js';

const application = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Task editor</title>
<style>*{box-sizing:border-box}body{font:16px sans-serif;padding:16px;margin:0}input,select,button{max-width:100%}label{display:block;margin:8px 0}</style>
<main><h1>Task editor version one</h1><label>Task <input id="task"></label><label>Priority <select id="priority"><option>Low</option><option>High</option></select></label>
<button id="save">Save task</button><button id="api">Call API</button><p id="result">No saved task.</p></main>
<script>
const task=document.querySelector('#task'), result=document.querySelector('#result');
document.querySelector('#save').onclick=()=>{result.textContent='Saved: '+task.value+' ('+document.querySelector('#priority').value+')';console.error('save diagnostic');};
task.onkeydown=e=>{if(e.key==='Enter')document.querySelector('#save').click();};
document.querySelector('#api').onclick=()=>fetch('/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task:task.value})}).then(r=>r.json()).then(data=>{result.textContent='API saved: '+data.task;});
</script></html>`;

async function workspace(t, html = application) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-agent-browser-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'index.html'), html);
  return root;
}

async function serve(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: 'http://127.0.0.1:' + server.address().port + '/', close: async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  } };
}

async function session(t, root, overrides = {}) {
  const state = { prepared: 0, closed: 0, requests: [] };
  const controller = new AbortController();
  const browser = new AgentBrowserSession({ root, signal: controller.signal, timeoutMs: 30_000, stepTimeoutMs: 1500,
    prepare: async signal => {
      signal.throwIfAborted();
      state.prepared++;
      const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
      const runtime = await serve(async (request, response) => {
        state.requests.push({ url: request.url, method: request.method });
        if (request.url === '/api') {
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          response.writeHead(200, { 'Content-Type': 'application/json' }).end(Buffer.concat(chunks));
        } else if (request.url === '/export.json') response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="tasks.json"' }).end('{"task":"Inspect pump"}');
        else if (request.url === '/internal-redirect') response.writeHead(302, { location: '/' }).end();
        else if (request.url?.startsWith('/escape')) response.writeHead(302, { location: new URL(request.url, 'http://example.invalid').searchParams.get('target') }).end();
        else response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end(html);
      });
      const hash = createRuntimeFilesHasher(); hash.add('index.html', Buffer.from(html));
      return { url: runtime.url, filesHash: hash.digest(), close: async () => { state.closed++; await runtime.close(); } };
    }, ...overrides });
  t.after(() => browser.close());
  const tool = browser.tools()[0];
  const run = (input, signal) => tool.execute('browser-test', input, signal);
  return { browser, run, state, controller, tool };
}

function image(result, expectedWidth = 1280, expectedHeight = 800, expectedError = false) {
  assert.equal(result.isError, expectedError, JSON.stringify(result.details));
  const content = result.content.find(item => item.type === 'image');
  assert.ok(content, 'The tool response must contain an actual image, not only its file path.');
  assert.equal(content.mimeType, 'image/png');
  const png = Buffer.from(content.data, 'base64');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), expectedWidth);
  assert.equal(png.readUInt32BE(20), expectedHeight);
  assert.ok(result.details.screenshot?.startsWith('.browser-observations/'));
  assert.ok(!result.details.screenshot.includes('.quality-evidence'));
  assert.ok(!JSON.stringify(result.details).includes(content.data));
  assert.deepEqual(JSON.parse(result.content.find(item => item.type === 'text').text), result.details);
  return png;
}

test('agents receive actual screenshots and selectors, edit fields, select, click and press with console diagnostics', { timeout: 30_000 }, async t => {
  const root = await workspace(t), { run, tool, state } = await session(t, root);
  assert.equal(tool.name, 'fleet_browser');
  const opened = await run({ action: 'open' });
  const png = image(opened);
  assert.deepEqual(await fs.readFile(path.join(root, opened.details.screenshot)), png);
  assert.match(opened.details.pageText, /Task editor/);
  assert.equal(opened.details.controls.find(control => control.selector === '#task').name, 'Task');
  image(await run({ action: 'type', selector: '#task', text: 'Inspect pump' }));
  image(await run({ action: 'select', selector: '#priority', value: 'High' }));
  const saved = await run({ action: 'click', selector: '#save' });
  image(saved);
  assert.match(saved.details.pageText, /Saved: Inspect pump \(High\)/);
  assert.ok(saved.details.console.some(entry => entry.level === 'error' && /save diagnostic/.test(entry.message)));
  image(await run({ action: 'type', selector: '#task', text: 'Replace previous text' }));
  const pressed = await run({ action: 'press', selector: '#task', key: 'Enter' });
  image(pressed);
  assert.match(pressed.details.pageText, /Saved: Replace previous text \(High\)/);
  image(await run({ action: 'screenshot', viewport: 'narrow' }), 390, 844);
  image(await run({ action: 'scroll', deltaY: 300 }), 390, 844);
  assert.equal(state.prepared, 1);
});

test('open re-prepares changed source and resets browser state; close releases runtime and permits reopening', { timeout: 20_000 }, async t => {
  const root = await workspace(t), { run, state, browser } = await session(t, root);
  image(await run({ action: 'open', viewport: 'narrow' }), 390, 844);
  await run({ action: 'type', selector: '#task', text: 'Old input' });
  await fs.writeFile(path.join(root, 'index.html'), application.replace('version one', 'version two'));
  const refreshed = await run({ action: 'open' });
  image(refreshed);
  assert.match(refreshed.details.pageText, /version two/);
  assert.equal(refreshed.details.controls.find(control => control.selector === '#task').value, '');
  assert.equal(state.prepared, 2);
  assert.equal(state.closed, 1);
  const closed = await run({ action: 'close' });
  assert.equal(closed.details.status, 'closed');
  assert.equal(state.closed, 2);
  assert.match((await run({ action: 'screenshot' })).details.error, /Open the application/);
  image(await run({ action: 'open' }));
  await browser.close();
  assert.equal(state.closed, 3);
  assert.match((await run({ action: 'open' })).details.error, /session closed/);
});

test('same-origin API requests preserve method/body and same-origin redirects work', { timeout: 15_000 }, async t => {
  const root = await workspace(t, application.replace('</main>', '<a id="redirect" href="/internal-redirect">Redirect</a></main>'));
  const { run, state } = await session(t, root);
  image(await run({ action: 'open' }));
  await run({ action: 'type', selector: '#task', text: 'From API' });
  image(await run({ action: 'click', selector: '#api' }));
  const result = await run({ action: 'screenshot' });
  image(result);
  assert.match(result.details.pageText, /API saved: From API/);
  assert.ok(state.requests.some(request => request.url === '/api' && request.method === 'POST'));
  const redirected = await run({ action: 'click', selector: '#redirect' });
  image(redirected);
  assert.match(redirected.details.pageText, /Task editor version one/);
});

test('failed selectors still return the current image, page state and runtime errors', { timeout: 15_000 }, async t => {
  const root = await workspace(t, application.replace('</script>', "setTimeout(()=>{throw Error('visible runtime failure')},0);</script>"));
  const { run } = await session(t, root, { stepTimeoutMs: 2000 });
  image(await run({ action: 'open' }));
  const failed = await run({ action: 'click', selector: '#missing' });
  assert.equal(failed.isError, true);
  assert.match(failed.details.error, /Timeout|limit/);
  assert.match(failed.details.pageText, /Task editor/);
  assert.ok(failed.content.some(item => item.type === 'image'));
  assert.ok(failed.details.errors.some(error => /visible runtime failure/.test(error)));
});

test('external fetch, navigation, redirect escapes and WebSockets never reach another server', { timeout: 20_000 }, async t => {
  let remoteRequests = 0, upgrades = 0;
  const remote = await serve((_request, response) => { remoteRequests++; response.end('unexpected'); });
  remote.server.on('upgrade', (_request, socket) => { upgrades++; socket.destroy(); });
  t.after(() => remote.close());
  const html = application.replace('</script>', `fetch(${JSON.stringify(remote.url)}).catch(()=>{});new WebSocket(${JSON.stringify(remote.url.replace('http:', 'ws:'))});</script>`)
    .replace('</main>', `<a id="external" href="${remote.url}">External</a><a id="escape" href="/escape?target=${encodeURIComponent(remote.url)}">Redirect escape</a></main>`);
  const root = await workspace(t, html), { run } = await session(t, root);
  const opened = await run({ action: 'open' });
  image(opened);
  assert.ok(opened.details.errors.some(error => /Blocked resource/.test(error)));
  assert.ok(opened.details.errors.some(error => /Blocked WebSocket/.test(error)));
  await run({ action: 'click', selector: '#external' });
  image(await run({ action: 'open' }));
  const escaped = await run({ action: 'click', selector: '#escape' });
  assert.ok(escaped.details.errors.some(error => /Blocked resource/.test(error)), JSON.stringify(escaped.details));
  assert.equal(remoteRequests, 0, 'Even redirected browser traffic must pass the host origin policy.');
  assert.equal(upgrades, 0);
});

test('the agent browser cannot bypass its origin proxy with WebRTC UDP', { timeout: 10_000 }, async t => {
  const udp = createSocket('udp4');
  let datagrams = 0;
  udp.on('message', () => { datagrams++; });
  await new Promise(resolve => udp.bind(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => udp.close(resolve)));
  const root = await workspace(t, `<!doctype html><p id="result">Checking</p><script>
    const peer = new RTCPeerConnection({iceServers:[{urls:'stun:127.0.0.1:${udp.address().port}'}]});
    peer.createDataChannel('probe');
    peer.createOffer().then(offer=>peer.setLocalDescription(offer)).then(()=>setTimeout(()=>{peer.close();document.querySelector('#result').textContent='Checked';},1000));
  </script>`);
  const { run } = await session(t, root, { stepTimeoutMs: 2500, journeys: [{ id: 'network', title: 'Check network boundaries', kind: 'primary', steps: [{ action: 'expectText', selector: '#result', text: 'Checked' }] }] });
  const result = await run({ action: 'journey', journeyId: 'network' });
  assert.equal(result.details.journey?.status, 'passed', JSON.stringify(result.details));
  assert.equal(datagrams, 0, 'The browser must not send non-proxied STUN packets.');
});

test('dialogs, popups and downloads are dismissed or cancelled and reported', { timeout: 15_000 }, async t => {
  const html = application.replace('</main>', '<button id="dialog">Dialog</button><button id="popup">Popup</button><button id="download">Download</button></main>')
    .replace('</script>', `document.querySelector('#dialog').onclick=()=>alert('Test dialog');document.querySelector('#popup').onclick=()=>window.open('/');document.querySelector('#download').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['test']));a.download='test.txt';a.click();};</script>`);
  const root = await workspace(t, html), { run } = await session(t, root);
  image(await run({ action: 'open' }));
  const dialog = await run({ action: 'click', selector: '#dialog' });
  image(dialog); assert.ok(dialog.details.errors.some(error => /Dismissed alert dialog/.test(error)));
  const popup = await run({ action: 'click', selector: '#popup' });
  image(popup); assert.ok(popup.details.errors.some(error => /popup/.test(error)));
  await run({ action: 'click', selector: '#download' });
  const download = await run({ action: 'screenshot' });
  image(download); assert.ok(download.details.errors.some(error => /Blocked download/.test(error)));
});

test('arbitrary URLs, executable scripts, artifact paths and selector engine chains are rejected before preparation', async t => {
  const root = await workspace(t), { run, state } = await session(t, root);
  for (const args of [
    { action: 'open', url: 'https://example.com' }, { action: 'evaluate', script: 'fetch("https://example.com")' },
    { action: 'screenshot', path: '../escape.png' }, { action: 'click', selector: '#task >> internal:control=enter-frame' },
    { action: 'type', selector: '#task' }, { action: 'screenshot', viewport: 'massive' },
  ]) assert.equal((await run(args)).isError, true);
  assert.equal(state.prepared, 0);
  await assert.rejects(fs.access(path.join(root, '.browser-observations')), /ENOENT/);
});

test('observation artifacts reject symlinked directories and do not overwrite outside files', { timeout: 15_000 }, async t => {
  const root = await workspace(t), elsewhere = await workspace(t);
  await fs.symlink(elsewhere, path.join(root, '.browser-observations'), 'dir');
  const { run } = await session(t, root);
  const result = await run({ action: 'open' });
  assert.equal(result.isError, true);
  assert.ok(result.details.errors.some(error => /ordinary workspace directories/.test(error)));
  assert.deepEqual(await fs.readdir(elsewhere), ['index.html']);
  assert.equal(result.content.some(item => item.type === 'image'), false);
});

test('artifact directories are revalidated after an application replaces the session directory', { timeout: 15_000 }, async t => {
  const root = await workspace(t), elsewhere = await workspace(t), { run } = await session(t, root);
  const opened = await run({ action: 'open' });
  image(opened);
  const directory = path.dirname(path.join(root, opened.details.screenshot));
  await fs.rename(directory, directory + '-original');
  await fs.symlink(elsewhere, directory, 'dir');
  const result = await run({ action: 'screenshot' });
  assert.equal(result.isError, true);
  assert.ok(result.details.errors.some(error => /ordinary workspace directories/.test(error)));
  assert.deepEqual(await fs.readdir(elsewhere), ['index.html']);
});

test('large control summaries are structured safely even when redaction inserts quotes', { timeout: 15_000 }, async t => {
  const html = '<!doctype html>' + Array.from({ length: 80 }, (_, index) => `<label>Label ${index} ${'x'.repeat(180)}<input id="field${index}" value="secret ${'v'.repeat(280)}"></label>`).join('');
  const root = await workspace(t, html);
  const runtime = await serve((_request, response) => response.writeHead(200, { 'Content-Type': 'text/html' }).end(html));
  const { run } = await session(t, root, { prepare: async () => ({ url: runtime.url, close: runtime.close, redactMessage: text => text.replaceAll('secret', '"redacted"') }) });
  const result = await run({ action: 'open' });
  image(result);
  assert.equal(result.details.controls.length, 80);
  assert.ok(JSON.stringify(result.details.controls).length > 16_000);
  assert.match(result.details.controls[0].value, /"redacted"/);
});

test('cancelled and concurrent preparation cannot leak a late runtime or begin another operation', { timeout: 10_000 }, async t => {
  const root = await workspace(t);
  let resolvePreparation, passedSignal, disposed = 0;
  const pending = new Promise(resolve => { resolvePreparation = resolve; });
  const { run, controller, browser } = await session(t, root, { prepare: signal => { passedSignal = signal; return pending; } });
  const opening = run({ action: 'open' });
  await new Promise(resolve => setImmediate(resolve));
  assert.match((await run({ action: 'open' })).details.error, /Another browser action/);
  const started = performance.now();
  controller.abort();
  const result = await opening;
  await browser.close();
  assert.equal(result.isError, true);
  assert.ok(performance.now() - started < 2000);
  assert.equal(passedSignal.aborted, true);
  resolvePreparation({ url: 'http://127.0.0.1:1/', close: async () => { disposed++; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(disposed, 1);
  await assert.rejects(fs.access(path.join(root, '.browser-observations')), /ENOENT/);
});

test('hung renderer reaches the overall deadline and closes the prepared runtime promptly', { timeout: 12_000 }, async t => {
  const root = await workspace(t, '<!doctype html><script>while(true){}</script>');
  const { run, state } = await session(t, root, { timeoutMs: 1800, stepTimeoutMs: 600 });
  const started = performance.now();
  const result = await run({ action: 'open' });
  assert.equal(result.isError, true);
  assert.match(result.details.error, /limit/);
  assert.ok(performance.now() - started < 6000);
  assert.equal(state.closed, 1);
  await fs.writeFile(path.join(root, 'index.html'), application);
  image(await run({ action: 'open' }));
  assert.equal(state.prepared, 2, 'A timed-out renderer must not permanently disable the stage browser.');
});

test('cancelling a tool action closes its browser promptly and allows a fresh open', { timeout: 15_000 }, async t => {
  const root = await workspace(t), { run, state } = await session(t, root, { stepTimeoutMs: 10_000 });
  image(await run({ action: 'open' }));
  const controller = new AbortController();
  const waiting = run({ action: 'click', selector: '#missing' }, controller.signal);
  await new Promise(resolve => setImmediate(resolve));
  const started = performance.now();
  controller.abort(new Error('Cancelled waiting for the control.'));
  const result = await waiting;
  assert.equal(result.isError, true);
  assert.match(result.details.error, /Cancelled waiting/);
  assert.ok(performance.now() - started < 2500);
  assert.equal(state.closed, 1);
  image(await run({ action: 'open' }));
  assert.equal(state.prepared, 2);
});

test('an unavailable browser and invalid prepared URL fail clearly and release their runtime', { timeout: 10_000 }, async t => {
  const root = await workspace(t);
  const missing = await session(t, root, { executable: path.join(root, 'not-a-browser') });
  const result = await missing.run({ action: 'open' });
  assert.equal(result.isError, true);
  assert.match(result.details.error, /Install Google Chrome.*setup:browser/s);
  assert.equal(missing.state.closed, 1);
  let closed = 0;
  const invalid = await session(t, root, { prepare: async () => ({ url: 'https://example.com/', close: async () => { closed++; } }) });
  assert.match((await invalid.run({ action: 'open' })).details.error, /host-started HTTP runtime/);
  assert.equal(closed, 1);
});

test('visual review receives real saved captures with prepared-runtime provenance and failed actions do not count', { timeout: 20_000 }, async t => {
  const root = await workspace(t), manifest = { profile: 'browser', files: ['index.html'], requiredEnv: [], entrypoint: 'index.html' };
  const ledger = new VisualReviewLedger({ root, manifest, contractHash: 'a'.repeat(64), runId: 'browser-proof', stage: 'build' });
  const registrations = [], originalHash = await runtimeFilesHash(root, manifest);
  const { run } = await session(t, root, { onCapture: async input => {
    registrations.push(input);
    const saved = await fs.readFile(path.join(root, input.screenshot));
    assert.equal(createHash('sha256').update(saved).digest('hex'), input.screenshotHash);
    return ledger.registerCapture(input);
  } });
  const initial = await run({ action: 'open' }); image(initial);
  assert.ok(initial.details.captureId);
  assert.equal(registrations[0].filesHash, originalHash);
  const failed = await run({ action: 'click', selector: '#missing' });
  assert.equal(failed.isError, true); assert.equal(failed.details.captureId, undefined);
  assert.equal(registrations.length, 1);
  await fs.writeFile(path.join(root, 'index.html'), application.replace('version one', 'version two'));
  const stale = await run({ action: 'screenshot' });
  assert.equal(stale.isError, true);
  assert.ok(stale.details.errors.some(error => /stale runtime/.test(error)));
  assert.equal(registrations[1].filesHash, originalHash, 'A screenshot of an old browser cannot be relabelled with current workspace contents.');
  assert.equal(stale.details.captureId, undefined);
  assert.equal(ledger.report().captures.length, 1);
  const refreshed = await run({ action: 'open', viewport: 'narrow' }); image(refreshed, 390, 844);
  assert.notEqual(refreshed.details.captureId, initial.details.captureId);
  assert.equal(registrations[2].filesHash, await runtimeFilesHash(root, manifest));
  assert.equal(ledger.report().captures.at(-1).viewport, 'narrow');
});

test('visual review persistence failure returns a tool error without an accepted capture identity', { timeout: 10_000 }, async t => {
  const root = await workspace(t);
  const { run } = await session(t, root, { onCapture: async () => { throw new Error('Host evidence persistence failed.'); } });
  const result = await run({ action: 'open' });
  assert.equal(result.isError, true);
  assert.equal(result.details.captureId, undefined);
  assert.ok(result.details.errors.some(error => /persistence failed/.test(error)));
  assert.ok(result.content.some(item => item.type === 'image'), 'The agent can still see the failed observation, but it cannot count as review evidence.');
});

test('prepared runtime integrity is checked before a browser observation enters visual review', { timeout: 10_000 }, async t => {
  const root = await workspace(t), runtime = await serve((_request, response) => response.writeHead(200, { 'Content-Type': 'text/html' }).end(application));
  let registered = 0;
  const { run } = await session(t, root, { prepare: async () => ({ url: runtime.url, close: runtime.close, filesHash: 'a'.repeat(64),
    assertIntegrity: async () => { throw new Error('Declared runtime files changed during execution.'); } }),
  onCapture: async () => { registered++; return 'must-not-register'; } });
  const result = await run({ action: 'open' });
  assert.equal(result.isError, true);
  assert.equal(result.details.captureId, undefined);
  assert.ok(result.details.errors.some(error => /changed during execution/.test(error)));
  assert.equal(registered, 0);
});

const journeyApplication = application.replace("console.error('save diagnostic');", "localStorage.setItem('task',task.value);")
  .replace('</main>', '<label><input id="confirmed" type="checkbox"> Confirm details</label><button id="export">Export</button></main>')
  .replace('</script>', `task.value=localStorage.getItem('task')||'';
  document.querySelector('#export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({task:task.value})],{type:'application/json'}));a.download='tasks.json';a.click();};</script>`);
const frozenJourneys = () => [{ id: 'save', title: 'Save, export and reload a task', kind: 'primary', steps: [
  { action: 'expectValue', selector: '#task', value: '' },
  { action: 'fill', selector: '#task', value: 'Inspect pump' },
  { action: 'select', selector: '#priority', value: 'High' },
  { action: 'check', selector: '#confirmed' },
  { action: 'press', selector: '#task', key: 'Enter' },
  { action: 'expectText', selector: '#result', text: 'Saved: Inspect pump (High)' },
  { action: 'expectDownload', selector: '#export', fileName: 'tasks.json', text: '"task":"Inspect pump"' },
  { action: 'reload' },
  { action: 'expectValue', selector: '#task', value: 'Inspect pump' },
] }];

test('a frozen journey failure returns reviewable PNG evidence, then source fixes rerun all steps in fresh desktop and narrow runtimes', { timeout: 25_000 }, async t => {
  const root = await workspace(t, journeyApplication.replace("result.textContent='Saved: '+task.value", "result.textContent='Wrong: '+task.value"));
  const registrations = [], journeys = frozenJourneys();
  const ledger = new VisualReviewLedger({ root, manifest: { profile: 'browser', files: ['index.html'], requiredEnv: [], entrypoint: 'index.html' }, contractHash: 'a'.repeat(64), runId: 'journey-proof', stage: 'build', journeys });
  const review = (captureId, extra = {}) => ledger.tool().execute('journey-review', { captureId,
    expected: 'Saving produces the requested task and priority, export contains the task, and reload preserves it.',
    observed: 'The task field and controls fit in the image; the host journey reports the observed workflow result.',
    findings: [], resolutions: [], ...extra });
  const { run, state } = await session(t, root, { journeys, stepTimeoutMs: 1000, onCapture: async capture => { registrations.push(capture); return ledger.registerCapture(capture); } });
  const failed = await run({ action: 'journey', journeyId: 'save' });
  image(failed, 1280, 800, true);
  assert.ok(failed.details.captureId, 'The agent must be able to review a failed journey screenshot.');
  assert.deepEqual(failed.details.journeys, [{ id: 'save', title: 'Save, export and reload a task' }]);
  assert.equal(failed.details.journey.status, 'failed');
  assert.equal(failed.details.journey.completedSteps, 5);
  assert.equal(failed.details.journey.totalSteps, 9);
  assert.match(failed.details.journey.detail, /Step 6/);
  assert.ok(failed.details.errors.length);
  assert.match(failed.details.pageText, /Wrong: Inspect pump/);
  assert.deepEqual(registrations[0].journey, failed.details.journey);
  assert.deepEqual(registrations[0].errors, failed.details.errors);
  const failedReview = await review(failed.details.captureId, { findings: ['The saved task result starts with Wrong instead of Saved.'] });
  assert.equal(failedReview.isError, false);
  assert.ok((await ledger.problems()).some(problem => /failed|finding|journey/i.test(problem)), 'Reviewed failure evidence cannot pass the host gate.');
  const findingId = failedReview.details.review.findings[0].id;
  const before = registrations[0].filesHash;
  // Mutating caller data cannot weaken the host snapshot stored by the browser.
  journeys[0].steps.length = 0;
  await fs.writeFile(path.join(root, 'index.html'), journeyApplication);
  const desktop = await run({ action: 'journey', journeyId: 'save' });
  image(desktop);
  assert.equal(desktop.details.journey.status, 'passed');
  assert.equal(desktop.details.journey.completedSteps, 9);
  assert.notEqual(registrations[1].filesHash, before);
  assert.deepEqual(desktop.details.errors, []);
  assert.equal(desktop.details.controls.find(control => control.selector === '#task').value, 'Inspect pump');
  assert.equal((await review(desktop.details.captureId, { resolutions: [{ findingId, change: 'Corrected the saved task success label so the complete frozen journey passes.' }] })).isError, false);
  const narrow = await run({ action: 'journey', journeyId: 'save', viewport: 'narrow' });
  image(narrow, 390, 844);
  assert.equal(narrow.details.journey.status, 'passed');
  assert.equal(narrow.details.journey.completedSteps, 9);
  assert.deepEqual(narrow.details.errors, []);
  assert.equal(state.prepared, 3);
  assert.equal(state.closed, 2);
  assert.equal(ledger.report().captures.length, 3);
  assert.equal((await review(narrow.details.captureId)).isError, false);
  assert.ok((await ledger.problems()).some(problem => /fresh narrow/.test(problem)), 'Narrow review also requires a fresh recheck.');
  const recheck = await run({ action: 'journey', journeyId: 'save', viewport: 'narrow' });
  image(recheck, 390, 844);
  assert.equal((await review(recheck.details.captureId)).isError, false);
  assert.deepEqual(await ledger.problems(), [], 'Current, clean, reviewed journey rechecks at both widths satisfy the gate after the fix.');
});

test('journey selection accepts only frozen IDs and exposes available journeys on open', { timeout: 10_000 }, async t => {
  const root = await workspace(t, journeyApplication), { run, state } = await session(t, root, { journeys: frozenJourneys() });
  for (const input of [
    { action: 'journey' }, { action: 'journey', journeyId: 'invented' },
    { action: 'journey', journeyId: 'save', steps: [] },
    { action: 'journey', journeyId: 'save', url: 'http://example.com' },
  ]) assert.equal((await run(input)).isError, true);
  assert.equal(state.prepared, 0);
  const opened = await run({ action: 'open' });
  image(opened);
  assert.deepEqual(opened.details.journeys, [{ id: 'save', title: 'Save, export and reload a task' }]);
});

test('console, page and request errors are preserved in capture metadata and fail otherwise completed journeys', { timeout: 15_000 }, async t => {
  const html = journeyApplication.replace('</script>', `console.error('broken console');for(let i=0;i<100;i++)console.log('noise '+i);setTimeout(()=>{throw Error('broken runtime')},0);fetch('http://127.0.0.1:1/blocked').catch(()=>{});</script>`);
  const root = await workspace(t, html), captures = [];
  const { run } = await session(t, root, { journeys: frozenJourneys(), onCapture: async input => { captures.push(input); return 'capture-' + captures.length; } });
  const opened = await run({ action: 'open' }); image(opened);
  assert.ok(captures[0].errors.some(error => /broken console/.test(error)), 'Later console logging cannot erase an earlier console error.');
  assert.ok(captures[0].errors.some(error => /broken runtime/.test(error)));
  assert.ok(captures[0].errors.some(error => /Request failed/.test(error)));
  const result = await run({ action: 'journey', journeyId: 'save' });
  image(result, 1280, 800, true);
  assert.equal(result.details.journey.completedSteps, 9);
  assert.equal(result.details.journey.status, 'failed');
  assert.ok(result.details.captureId);
  assert.ok(captures[1].errors.some(error => /broken console/.test(error)));
  assert.ok(captures[1].errors.some(error => /broken runtime/.test(error)));
  assert.ok(captures[1].errors.some(error => /Request failed/.test(error)));
});

test('downloads remain blocked outside frozen expectations and wrong or oversized expected exports fail', { timeout: 25_000 }, async t => {
  const root = await workspace(t, journeyApplication), { run } = await session(t, root, { journeys: frozenJourneys() });
  image(await run({ action: 'open' }));
  await run({ action: 'click', selector: '#export' });
  assert.ok((await run({ action: 'screenshot' })).details.errors.some(error => /Blocked download/.test(error)));
  // Even in a download-enabled journey, only its expectDownload step is allowed one export.
  await fs.writeFile(path.join(root, 'index.html'), journeyApplication.replace("localStorage.setItem('task',task.value);", "localStorage.setItem('task',task.value);document.querySelector('#export').click();"));
  const unexpected = await run({ action: 'journey', journeyId: 'save' });
  assert.equal(unexpected.details.journey.status, 'failed');
  assert.ok(unexpected.details.errors.some(error => /Blocked download/.test(error)));
  await fs.writeFile(path.join(root, 'index.html'), journeyApplication.replace("a.download='tasks.json'", "a.download='wrong.json'"));
  const wrong = await run({ action: 'journey', journeyId: 'save' });
  assert.equal(wrong.details.journey.status, 'failed');
  assert.match(wrong.details.journey.detail, /Expected download.*wrong.json/);
  await fs.writeFile(path.join(root, 'index.html'), journeyApplication.replaceAll('JSON.stringify({task:task.value})', "'x'.repeat(8_000_001)"));
  const huge = await run({ action: 'journey', journeyId: 'save' });
  assert.equal(huge.details.journey.status, 'failed');
  assert.match(huge.details.journey.detail, /8 MB/);
});

test('idle editing does not expire the browser and a timed-out journey can run again after a source fix', { timeout: 15_000 }, async t => {
  const root = await workspace(t, journeyApplication), { run, state } = await session(t, root, { journeys: frozenJourneys(), timeoutMs: 2500, stepTimeoutMs: 800 });
  image(await run({ action: 'open' }));
  await new Promise(resolve => setTimeout(resolve, 2600));
  image(await run({ action: 'journey', journeyId: 'save', viewport: 'narrow' }), 390, 844);
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><script>while(true){}</script>');
  const expired = await run({ action: 'journey', journeyId: 'save' });
  assert.equal(expired.isError, true);
  assert.equal(expired.details.journey.status, 'failed');
  assert.match(expired.details.error, /limit/);
  await fs.writeFile(path.join(root, 'index.html'), journeyApplication);
  const recovered = await run({ action: 'journey', journeyId: 'save' }); image(recovered);
  assert.equal(recovered.details.journey.status, 'passed');
  assert.equal(state.prepared, 4);
});

test('frozen export expectations accept same-origin HTTP attachments without treating download navigation as a request failure', { timeout: 10_000 }, async t => {
  const html = journeyApplication.replace("a.href=URL.createObjectURL(new Blob([JSON.stringify({task:task.value})],{type:'application/json'}))", "a.href='/export.json'")
    .replace("a.download='tasks.json';", '');
  const root = await workspace(t, html), { run } = await session(t, root, { journeys: frozenJourneys() });
  const result = await run({ action: 'journey', journeyId: 'save' });
  image(result);
  assert.equal(result.details.journey.status, 'passed');
  assert.deepEqual(result.details.errors, []);
  const invalid = frozenJourneys();
  invalid[0].steps.find(step => step.action === 'expectDownload').text = 'Missing expected export content';
  const rejected = await session(t, root, { journeys: invalid });
  const failure = await rejected.run({ action: 'journey', journeyId: 'save' });
  image(failure, 1280, 800, true);
  assert.match(failure.details.journey.detail, /Downloaded content/);
  assert.ok(failure.details.errors.some(error => /Request failed:.*export.json.*ERR_ABORTED/.test(error)), 'A failed export expectation must not suppress its request diagnostics.');
  const unexpected = await run({ action: 'click', selector: '#export' });
  assert.ok(unexpected.details.errors.some(error => /Blocked download/.test(error)));
  assert.ok(unexpected.details.errors.some(error => /Request failed:.*export.json.*ERR_ABORTED/.test(error)), 'An unrelated later request cannot borrow a previous successful export exemption.');
});

test('a stalled evidence callback obeys the action deadline and permits a fresh browser action', { timeout: 12_000 }, async t => {
  const root = await workspace(t), captures = [];
  const { run, state } = await session(t, root, { timeoutMs: 1800, stepTimeoutMs: 5000, onCapture: async input => {
    captures.push(input);
    if (captures.length === 1) return new Promise(() => {});
    return 'recovered-capture';
  } });
  const failed = await run({ action: 'open' });
  assert.equal(failed.isError, true);
  assert.match(failed.details.error, /limit/);
  assert.equal(state.closed, 1);
  const recovered = await run({ action: 'open' }); image(recovered);
  assert.equal(recovered.details.captureId, 'recovered-capture');
  assert.equal(state.prepared, 2);
});
