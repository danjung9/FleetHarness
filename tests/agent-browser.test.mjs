import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { RunProcessSweep, runProcessEnvironment } from '../dist-electron/electron/process-sweep.js';
import { AgentBrowserSession } from '../dist-electron/electron/agent-browser.js';
import { VisualReviewLedger, runtimeFilesHash } from '../dist-electron/electron/visual-review.js';

for (const stopped of [false, true]) test(`browser launch and its service retain the run marker through ${stopped ? 'Stop' : 'completion'} even when browser teardown fails`, { timeout: 5000 }, async t => {
  const root = await workspace(t), jobs = [], controller = new AbortController();
  // Real detached processes and OS signals. Chrome and native discovery are
  // separate permitted-host checks; this exercises production launch wiring.
  const start = async env => {
    const child = spawn(process.execPath, ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000);process.send(process.env.APPYARD_RUN_PROCESS);'], {
      detached: true, env, stdio: ['ignore', 'ignore', 'ignore', 'ipc']
    });
    const job = { child, env, exited: false };
    job.exit = once(child, 'exit').then(() => { job.exited = true; }); jobs.push(job);
    t.after(async () => { if (!job.exited) child.kill('SIGKILL'); await job.exit; });
    assert.equal((await once(child, 'message'))[0], scope.marker);
    return child;
  };
  const scope = new RunProcessSweep({ graceMs: 10, killMs: 1000,
    scan: async marker => jobs.filter(job => !job.exited && job.env.APPYARD_RUN_PROCESS === marker).map(job => ({ pid: job.child.pid, started: String(job.child.pid) })) });
  let killRequests = 0;
  t.mock.method(chromium, 'launchServer', async options => {
    assert.equal(options.chromiumSandbox, false);
    assert.equal(options.env.APPYARD_RUN_PROCESS, scope.marker);
    await start(options.env);
    return { wsEndpoint: () => 'ws://synthetic-browser', kill: async () => { killRequests++; throw new Error('Synthetic lost browser shutdown response'); } };
  });
  t.mock.method(chromium, 'connect', async () => ({ newContext: async () => { throw new Error('Synthetic closed renderer'); } }));
  const browser = new AgentBrowserSession({ root, signal: controller.signal, executable: 'synthetic-browser',
    prepare: async () => {
      await start(runProcessEnvironment());
      return { url: 'http://127.0.0.1:1/', close: async () => {} };
    } });
  t.after(() => browser.close());
  const result = await scope.run(() => browser.tools()[0].execute('probe', { action: 'open' }));
  assert.equal(result.isError, true);
  assert.equal(jobs.length, 2);
  assert.ok(jobs.every(job => !job.exited), 'Fixture processes must survive the failed normal shutdown');
  if (stopped) controller.abort();
  await browser.close();
  assert.ok(killRequests > 0);
  await scope.stop();
  assert.ok(jobs.every(job => job.exited), 'Browser or service survived run cleanup');
  assert.throws(() => scope.run(() => runProcessEnvironment()), /closed/);
});

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

test('browser startup has a separate bounded budget from short interaction deadlines', async t => {
  const root = await workspace(t), controller = new AbortController();
  let launchedWith, navigatedWith, closed = 0;
  const page = { on() {}, async goto(_url, options) { navigatedWith = options.timeout; await new Promise(resolve => setTimeout(resolve, 30)); }, async close() {} };
  const context = { on() {}, setDefaultTimeout(value) { assert.equal(value, 5); }, async route() {}, async routeWebSocket() {}, async newPage() { return page; }, async close() {} };
  t.mock.method(chromium, 'launchServer', async options => {
    launchedWith = options.timeout; await new Promise(resolve => setTimeout(resolve, 30));
    return { wsEndpoint: () => 'ws://synthetic-startup', async kill() { closed++; } };
  });
  t.mock.method(chromium, 'connect', async () => ({ async newContext() { return context; }, async close() {} }));
  const browser = new AgentBrowserSession({ root, signal: controller.signal, stepTimeoutMs: 5, startupTimeoutMs: 1000,
    prepare: async () => ({ url: 'http://127.0.0.1:1/', async close() {} }) });
  t.after(() => browser.close());
  await browser.open('desktop', controller.signal);
  assert.ok(launchedWith > 5 && launchedWith <= 1000);
  assert.ok(navigatedWith > 5 && navigatedWith < launchedWith, 'Startup shares one bounded deadline');
  await browser.close(); assert.equal(closed, 1);
});

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
        } else if (request.url === '/internal-redirect') response.writeHead(302, { location: '/' }).end();
        else if (request.url?.startsWith('/escape')) response.writeHead(302, { location: new URL(request.url, 'http://example.invalid').searchParams.get('target') }).end();
        else response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end(html);
      });
      return { url: runtime.url, filesHash: createHash('sha256').update('index.html\0').update(html).update('\0').digest('hex'), close: async () => { state.closed++; await runtime.close(); } };
    }, ...overrides });
  t.after(() => browser.close());
  const tool = browser.tools()[0];
  const run = (input, signal) => tool.execute('browser-test', input, signal);
  return { browser, run, state, controller, tool };
}

function image(result, expectedWidth = 1280, expectedHeight = 800) {
  assert.equal(result.isError, false, JSON.stringify(result.details));
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
  assert.match((await run({ action: 'open' })).details.error, /limit/);
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
