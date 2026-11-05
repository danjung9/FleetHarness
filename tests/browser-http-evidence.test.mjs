import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';
import { AgentBrowserSession } from '../dist-electron/electron/agent-browser.js';
import { assertPlannedRecoveryJourneys, parseQualityPlan } from '../dist-electron/harness/quality-contract.js';

const endpoint = '/api/save?mode=task';
const native422 = 'Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)';
const acceptance = [{ id: 'R1', requirement: 'Save valid tasks and recover from API validation errors.', method: 'automated', scenario: 'Reject an empty task, correct it, and save.' }];
const expectedRejection = overrides => ({ action: 'expectHttpError', selector: '#save', path: endpoint, method: 'POST', status: 422, ...overrides });

function recoverySteps(overrides = {}) {
  return [
    { action: 'fill', selector: '#task', value: '' },
    expectedRejection(),
    { action: 'expectText', selector: '#error', text: 'Enter a task.' },
    { action: 'fill', selector: '#task', value: 'Inspect pump' },
    { action: 'click', selector: '#save' },
    { action: 'expectText', selector: '#result', text: 'Saved: Inspect pump' }
  ].map(step => step.action === 'expectHttpError' ? { ...step, ...overrides } : step);
}

function journey(steps = recoverySteps()) {
  return { id: 'recover-api', title: 'Correct API validation and save the task', kind: 'recovery', steps };
}

function plan(steps = recoverySteps()) {
  return { schemaVersion: 1,
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Reject an empty task and save its corrected value.', journeyIds: ['primary', 'recover-api'] }],
    journeys: [
      { id: 'primary', title: 'Save a valid task', kind: 'primary', steps: [
        { action: 'fill', selector: '#task', value: 'Inspect pump' },
        { action: 'click', selector: '#save' },
        { action: 'expectText', selector: '#result', text: 'Saved: Inspect pump' }
      ] }, journey(steps)
    ] };
}

function application(options) {
  const { actualPath = endpoint, actualMethod = 'POST', afterInvalid = '', wrongResult = false, preload = false, noRequest = false, xhr = false, optimisticError = false } = options;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>API task editor</title>
  <style>*{box-sizing:border-box}body{margin:0;padding:16px;font:16px sans-serif}input,button{max-width:100%}label{display:block}</style>
  <main><h1>API task editor</h1><label>Task <input id="task"></label><button id="save" type="button">Save task</button>
  <p id="error" role="alert"></p><p id="result">No saved task.</p><p id="ready">Loading</p></main><script>
  const task=document.querySelector('#task'), error=document.querySelector('#error'), result=document.querySelector('#result');
  const send=()=>${xhr
    ? `new Promise((resolve,reject)=>{const request=new XMLHttpRequest();request.open(${JSON.stringify(actualMethod)},${JSON.stringify(actualPath)});request.setRequestHeader('content-type','application/json');request.onload=()=>resolve({json:async()=>JSON.parse(request.responseText)});request.onerror=()=>reject(Error('XHR failed'));request.send(JSON.stringify({task:task.value}));})`
    : `fetch(${JSON.stringify(actualPath)},{method:${JSON.stringify(actualMethod)},headers:{'content-type':'application/json'},body:JSON.stringify({task:task.value})})`};
  document.querySelector('#save').onclick=async()=>{
    ${noRequest ? "error.textContent='Enter a task.';return;" : ''}
    ${optimisticError ? "if(!task.value.trim())error.textContent='Enter a task.';" : ''}
    const response=await send(), value=await response.json();
    if(!task.value.trim()) { ${afterInvalid} error.textContent='Enter a task.'; }
    else { error.textContent='';result.textContent=${wrongResult ? "'Wrong saved result'" : "'Saved: '+value.task"}; }
  };
  ${preload ? "send().then(response=>response.json()).then(()=>{document.querySelector('#ready').textContent='Ready';});" : "document.querySelector('#ready').textContent='Ready';"}
  </script></html>`;
}

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-http-'));
  const html = application(options), requests = [];
  await fs.writeFile(path.join(root, 'index.html'), html);
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    requests.push({ url: request.url, method: request.method, body });
    if (request.url?.startsWith('/api/save')) {
      const value = body ? JSON.parse(body) : { task: '' };
      const status = value.task?.trim() ? 200 : options.status ?? 422;
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      if (!value.task?.trim() && options.incompleteBody) {
        response.flushHeaders();
        response.write('{"error":');
        if (options.incompleteBody === 'disconnect') setImmediate(() => response.destroy());
        return;
      }
      response.end(JSON.stringify(value.task?.trim() ? { task: value.task } : { error: 'Enter a task.' }));
    } else if (request.url === '/api/redirect') {
      response.writeHead(307, { Location: endpoint }).end();
    } else if (request.url === '/api/unexpected') {
      response.writeHead(422, { 'Content-Type': 'application/json' }).end('{"error":"unrelated rejection"}');
    } else if (request.url === '/missing.png') {
      response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Missing asset');
    } else response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end(html);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, html, requests, url: `http://127.0.0.1:${server.address().port}/` };
}

async function verify(fixture, steps = recoverySteps(), overrides = {}) {
  const selected = plan(steps);
  selected.journeys = [journey(steps)];
  return verifyBrowserJourneys({ root: fixture.root, url: fixture.url, allowSameOrigin: true,
    plan: selected, contractHash: 'c'.repeat(64), timeoutMs: 20_000, stepTimeoutMs: 1600, ...overrides });
}

function both(result, status, pattern) {
  assert.deepEqual(result.errors, [], JSON.stringify(result));
  assert.deepEqual(result.journeys.map(item => item.viewport), ['desktop', 'narrow']);
  for (const item of result.journeys) {
    assert.equal(item.status, status, JSON.stringify(result));
    if (pattern) assert.match(item.detail, pattern, JSON.stringify(result));
    assert.ok(item.screenshot, 'Every executed journey retains screenshot evidence.');
  }
}

async function agent(t, fixture, steps = recoverySteps()) {
  const browser = new AgentBrowserSession({ root: fixture.root, signal: new AbortController().signal,
    timeoutMs: 20_000, stepTimeoutMs: 1800, journeys: [journey(steps)],
    prepare: async () => ({ url: fixture.url, filesHash: createHash('sha256').update(fixture.html).digest('hex'), close: async () => {} }) });
  t.after(() => browser.close());
  const tool = browser.tools()[0];
  return input => tool.execute('http-evidence-test', input);
}

test('HTTP rejection steps parse without weakening ordered recovery or visible outcome requirements', () => {
  const value = plan(), before = structuredClone(value);
  assert.deepEqual(parseQualityPlan(value, acceptance), value);
  assert.doesNotThrow(() => assertPlannedRecoveryJourneys(value.journeys));
  assert.deepEqual(value, before);
  assert.throws(() => assertPlannedRecoveryJourneys([journey([
    expectedRejection(), { action: 'expectText', selector: '#error', text: 'Enter a task.' }
  ])]), /recovery must act/);
});

test('HTTP rejection declarations reject malformed statuses, methods, paths, selectors and unknown fields', () => {
  const invalid = [
    { status: 399 }, { status: 500 }, { status: 422.5 }, { status: '422' }, { status: undefined },
    { method: 'post' }, { method: 'CONNECT' }, { method: undefined },
    { path: 'https://example.com/api/save' }, { path: '//example.com/api/save' },
    { path: 'api/save' }, { path: '/api/save#fragment' }, { path: '/api/../save' },
    { path: '/api/save\n' }, { path: undefined }, { selector: '' }, { tolerance: 1 }
  ];
  for (const changes of invalid) {
    assert.throws(() => parseQualityPlan(plan(recoverySteps(changes)), acceptance), undefined, JSON.stringify(changes));
  }
});

test('declared HTTP 422 recovery verifies the error, corrected success and screenshots at both widths', { timeout: 30_000 }, async t => {
  const app = await fixture(t), result = await verify(app);
  both(result, 'passed');
  assert.equal(app.requests.filter(request => request.url === endpoint).length, 4);
  for (const item of result.journeys) {
    const png = await fs.readFile(path.join(app.root, item.screenshot));
    assert.equal(png.readUInt32BE(16), item.viewport === 'desktop' ? 1280 : 390);
  }
});

test('ordinary click cannot excuse an undeclared HTTP 422 even after successful visible recovery', { timeout: 30_000 }, async t => {
  const app = await fixture(t), steps = recoverySteps().map(step => step.action === 'expectHttpError' ? { action: 'click', selector: '#save' } : step);
  both(await verify(app, steps), 'failed', /422/);
});

test('HTTP rejection controls retain the ordinary CSS selector boundary', { timeout: 30_000 }, async t => {
  const app = await fixture(t);
  both(await verify(app, recoverySteps({ selector: 'text=Save task' })), 'failed', /Step 2:/);
  assert.equal(app.requests.filter(request => request.url === endpoint).length, 0, 'A Playwright selector engine must not activate the control.');
});

for (const status of [200, 400, 500]) test(`a declared HTTP 422 fails when the service actually returns ${status}`, { timeout: 30_000 }, async t => {
  const app = await fixture(t, { status });
  both(await verify(app), 'failed', /Step 2:|expectHttpError|HTTP|response/i);
  assert.equal(app.requests.filter(request => request.url === endpoint).length, 2, 'A mismatched rejection must stop before corrected submission.');
});

test('application console.error impersonating Chromium resource text remains fatal beside the expected response', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { afterInvalid: `console.error(${JSON.stringify(native422)});` });
  both(await verify(app), 'failed', /Failed to load resource.*422/);
});

test('one declared HTTP rejection does not exempt a second identical request and response', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { afterInvalid: 'await send();' });
  both(await verify(app), 'failed', /422/);
  assert.equal(app.requests.filter(request => request.url === endpoint).length, 6);
});

test('an expected API rejection does not hide a missing image response', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { afterInvalid: "await new Promise(resolve=>{const image=new Image();image.onload=image.onerror=resolve;image.src='/missing.png';document.body.append(image);});" });
  both(await verify(app), 'failed', /404|missing\.png/);
  assert.equal(app.requests.filter(request => request.url === '/missing.png').length, 2);
});

test('HTTP evidence collection preserves valid embedded images with large data URLs', { timeout: 30_000 }, async t => {
  const data = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><!--' + 'x'.repeat(20_000) + '--><rect width="1" height="1"/></svg>');
  const app = await fixture(t, { afterInvalid: `await new Promise(resolve=>{const image=new Image();image.onload=image.onerror=resolve;image.src=${JSON.stringify(data)};document.body.append(image);});` });
  both(await verify(app), 'passed');
});

test('an expected API rejection does not hide another failing route', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { afterInvalid: "await fetch('/api/unexpected',{method:'POST'});" });
  both(await verify(app), 'failed', /422|unexpected/);
  assert.equal(app.requests.filter(request => request.url === '/api/unexpected').length, 2);
});

test('HTTP rejection matches the exact method and query instead of a path prefix', { timeout: 45_000 }, async t => {
  for (const options of [{ actualMethod: 'PUT' }, { actualPath: '/api/save?mode=other' }]) {
    const app = await fixture(t, options);
    both(await verify(app), 'failed', /Step 2:/);
    assert.equal(app.requests.filter(request => request.url?.startsWith('/api/save')).length, 2);
  }
});

test('an earlier HTTP rejection cannot fulfill a later click expectation', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { preload: true, noRequest: true });
  const steps = [{ action: 'expectText', selector: '#ready', text: 'Ready' }, expectedRejection(),
    { action: 'expectText', selector: '#error', text: 'Enter a task.' }];
  both(await verify(app, steps), 'failed', /Step 2:/);
  assert.equal(app.requests.filter(request => request.url === endpoint).length, 2, 'Only the already completed page-load request was sent.');
});

test('a redirect to the declared endpoint cannot substitute for its direct HTTP rejection', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { actualPath: '/api/redirect' });
  both(await verify(app), 'failed', /Step 2:/);
  assert.equal(app.requests.filter(request => request.url === '/api/redirect').length, 2);
  assert.equal(app.requests.filter(request => request.url === endpoint).length, 2, 'Both viewports reached the matching final rejection through a redirect.');
});

test('HTTP rejection evidence requires a complete response body despite an optimistic visible error', { timeout: 45_000 }, async t => {
  for (const incompleteBody of ['hang', 'disconnect']) {
    const app = await fixture(t, { incompleteBody, optimisticError: true });
    both(await verify(app), 'failed', /Step 2:/);
    assert.equal(app.requests.filter(request => request.url === endpoint).length, 2, 'Incomplete response evidence stops before corrected submission.');
  }
});

test('matching HTTP status cannot replace the corrected visible result', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { wrongResult: true });
  both(await verify(app), 'failed', /Step 6:|expectText/);
});

test('agent frozen journeys support expected XHR rejection and visible recovery at both widths', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { xhr: true }), run = await agent(t, app);
  for (const viewport of ['desktop', 'narrow']) {
    const result = await run({ action: 'journey', journeyId: 'recover-api', viewport });
    assert.equal(result.isError, false, JSON.stringify(result.details));
    assert.equal(result.details.journey.status, 'passed', JSON.stringify(result.details));
    assert.equal(result.details.journey.completedSteps, recoverySteps().length);
    assert.deepEqual(result.details.errors, []);
    assert.ok(result.content.some(item => item.type === 'image'));
  }
});

test('agent frozen journeys retain explicit application errors alongside a matched HTTP rejection', { timeout: 30_000 }, async t => {
  const app = await fixture(t, { afterInvalid: "console.error('application recovery failure');" }), run = await agent(t, app);
  const result = await run({ action: 'journey', journeyId: 'recover-api' });
  assert.equal(result.isError, true);
  assert.equal(result.details.journey.status, 'failed');
  assert.equal(result.details.journey.completedSteps, recoverySteps().length);
  assert.match(result.details.errors.join('\n'), /application recovery failure/);
});

test('ad hoc agent clicks preserve undeclared HTTP errors and cannot inject an expectation', { timeout: 30_000 }, async t => {
  const app = await fixture(t), run = await agent(t, app);
  assert.equal((await run({ action: 'open' })).isError, false);
  const injected = await run({ action: 'expectHttpError', selector: '#save', path: endpoint, method: 'POST', status: 422 });
  assert.equal(injected.isError, true, 'Only a host-frozen journey may declare expected HTTP errors.');
  await run({ action: 'click', selector: '#save' });
  const observed = await run({ action: 'screenshot' });
  assert.match(observed.details.errors.join('\n'), /422/);
  assert.match(observed.details.pageText, /Enter a task\./);
});
