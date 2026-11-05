import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { AgentBrowserSession } from '../dist-electron/electron/agent-browser.js';
import { createRuntimeFilesHasher } from '../dist-electron/electron/runtime-files-hash.js';

const html = body => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font:16px sans-serif;margin:12px}input,button,select{max-width:100%}[hidden]{display:none!important}</style>${body}</html>`;
const screens = [{ id: 'entry', route: '/', selector: '#entry' }, { id: 'result', route: '/result', selector: '#result' }];
const ux = { schemaVersion: 2, audience: 'Operators', primaryTask: 'Save a task', successOutcome: 'The saved task is visible',
  states: { empty: 'Enter a task.', loading: 'Wait for saving.', error: 'Correct the input.', success: 'Review the saved task.' },
  persistence: 'Retain task state.', recovery: 'Keep the draft.', keyboard: 'Use labeled inputs and buttons.',
  structure: { pattern: 'steps', rationale: 'Enter then review the task.', entryScreenId: 'entry', navigation: 'Save advances and Back returns.', persistentElements: 'Task identity is retained.' },
  screens: screens.map(screen => ({ ...screen, name: screen.id, purpose: 'Complete the task', primaryAction: 'Continue', layout: 'Centered form', secondaryContent: 'Back action', narrowLayout: 'Stack controls' })) };
const journeys = [{ id: 'primary', title: 'Complete the task', kind: 'primary', steps: [
  { action: 'expectScreen', screenId: 'entry' }, { action: 'fill', selector: '#task', value: 'Inspect pump' },
  { action: 'click', selector: '#save' }, { action: 'expectScreen', screenId: 'result' }, { action: 'expectText', selector: '#answer', text: 'Saved: Inspect pump' },
] }];
const app = html(`<main id="entry"><h1>New task</h1><label>Task <input id="task"></label><button id="save">Save task</button></main>
<main id="result" hidden><h1>Saved task</h1><p id="answer"></p><button id="back">Back to editor</button></main>
<script>save.onclick=()=>{answer.textContent='Saved: '+task.value;entry.hidden=true;result.hidden=false;history.pushState({},'', '/result')};back.onclick=()=>{entry.hidden=false;result.hidden=true;history.pushState({},'', '/')};</script>`);
function hash(html) { const value = createRuntimeFilesHasher(); value.add('index.html', Buffer.from(html)); return value.digest(); }
async function setup(t, initial = app, options = {}) {
  const { mount = '', ...browserOptions } = options;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-flow-'));
  await fs.writeFile(path.join(root, 'index.html'), initial);
  const controller = new AbortController();
  const browser = new AgentBrowserSession({ root, signal: controller.signal, timeoutMs: 30_000, stepTimeoutMs: 2000,
    prepare: async () => {
      const source = await fs.readFile(path.join(root, 'index.html'), 'utf8');
      const server = createServer((_request, response) => response.writeHead(200, { 'content-type': 'text/html' }).end(source));
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      return { url: `http://127.0.0.1:${server.address().port}${mount}/`, routeBase: mount, filesHash: hash(source), close: async () => {
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
      } };
    }, ...browserOptions });
  t.after(async () => { await browser.close(); await fs.rm(root, { recursive: true, force: true }); });
  const run = async (input, error = false) => {
    const result = await browser.tools()[0].execute('flow-test', input);
    assert.equal(result.isError, error, JSON.stringify(result.details));
    return result.details;
  };
  return { root, browser, run };
}
const desktopProblems = async (browser, source) => (await browser.flowProblems(hash(source))).filter(problem => problem.includes('UI flow desktop:'));

test('Playwright discovers actual screens and grounded transitions at both widths, exports the graph and invalidates stale source or altered PNGs', { timeout: 30_000 }, async t => {
  const updates = [], { root, browser, run } = await setup(t, app, { journeys, ux, onFlow: report => updates.push(report) });
  for (const viewport of ['desktop', 'narrow']) {
    const opened = await run({ action: 'open', viewport });
    assert.deepEqual(opened.screenIds, ['entry']);
    const input = opened.controls.find(control => control.name === 'Task');
    const typed = await run({ action: 'type', selector: input.selector, text: 'Inspect pump' });
    const saved = await run({ action: 'click', selector: typed.controls.find(control => control.name === 'Save task').selector });
    assert.deepEqual(saved.screenIds, ['result']);
    assert.equal(saved.route, '/result');
    assert.match(saved.pageText, /Saved: Inspect pump/);
  }
  assert.deepEqual(await browser.flowProblems(hash(app)), []);
  const flow = await run({ action: 'flow' }), report = browser.flowReport();
  assert.equal(flow.progress.transitions, 2);
  assert.equal(report.observations.length, 6);
  assert.equal(report.transitions.filter(edge => edge.status === 'changed' && edge.grounded).length, 2);
  assert.ok(flow.frontier.some(control => control.name === 'Back to editor'));
  assert.ok(!JSON.stringify(flow.report).includes('::text('), 'Read-only graph keeps verbose DOM internals out of the agent context.');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, flow.artifact), 'utf8')), report);
  assert.equal(updates.length, 6);
  const copy = browser.flowReport(); copy.observations[0].reachable = false;
  assert.equal(browser.flowReport().observations[0].reachable, true, 'Reports cannot mutate host authority.');
  assert.equal((await browser.flowProblems(hash(app + '\n'))).filter(problem => problem.includes('fresh manual')).length, 2);
  const typed = report.observations.find(node => node.action === 'type' && node.viewport === 'desktop');
  await fs.writeFile(path.join(root, typed.screenshot), 'Tampered PNG');
  assert.ok((await desktopProblems(browser, app)).some(problem => problem.includes('planned screen result')));
});

test('frozen journey replay, screenshot resizing and edited diagnostic JSON cannot fabricate manual discovery', { timeout: 30_000 }, async t => {
  const { root, browser, run } = await setup(t, app, { journeys, ux });
  // A valid frozen journey is independent acceptance and supplies no manual nodes.
  for (const viewport of ['desktop', 'narrow']) {
    const exercised = await run({ action: 'journey', journeyId: 'primary', viewport });
    assert.equal(exercised.journey.status, 'passed');
  }
  assert.equal(browser.flowReport().observations.length, 0);
  const afterJourney = await run({ action: 'flow' });
  assert.equal(afterJourney.requiresManualOpen, true); assert.deepEqual(afterJourney.frontier, []);
  await run({ action: 'open' });
  await run({ action: 'screenshot', viewport: 'narrow' });
  await run({ action: 'click', selector: '#save' });
  const details = await run({ action: 'flow' });
  await fs.writeFile(path.join(root, details.artifact), JSON.stringify({ passed: true, observations: [{ action: 'open', reachable: true }] }));
  const problems = await browser.flowProblems(hash(app));
  assert.ok(problems.some(problem => /UI flow narrow: open/.test(problem)));
  assert.ok(problems.some(problem => /UI flow narrow: activate/.test(problem)));
});

test('no-op focus and input echo do not count; asynchronous Enter submission observes a readonly result', { timeout: 20_000 }, async t => {
  const source = html(`<h1>Task calculator</h1><label>Amount <input id="amount"></label><button id="noop">Focus field</button><label>Computed <input id="computed" readonly></label>
  <script>noop.onclick=()=>amount.focus();amount.onkeydown=e=>{if(e.key==='Enter')setTimeout(()=>{computed.value=String(Number(amount.value)*2)},700)};</script>`);
  const { browser, run } = await setup(t, source);
  await run({ action: 'open' });
  await run({ action: 'type', selector: '#amount', text: '21' });
  await run({ action: 'click', selector: '#noop' });
  assert.ok((await desktopProblems(browser, source)).some(problem => problem.includes('activate an observed')));
  await run({ action: 'press', selector: '#amount', key: 'Enter' });
  await new Promise(resolve => setTimeout(resolve, 800));
  const result = await run({ action: 'screenshot' });
  assert.equal(result.controls.find(control => control.selector === '#computed').value, '42');
  assert.deepEqual(await desktopProblems(browser, source), []);
  const edge = browser.flowReport().transitions.find(edge => edge.action === 'press');
  assert.equal(edge.status, 'changed'); assert.ok(edge.changes.includes('controls or output values'));
});

test('select-driven output counts but selecting an option alone does not', { timeout: 15_000 }, async t => {
  const source = html(`<h1>Price calculator</h1><label>Units <select id="units"><option value="1">One</option><option value="2">Two</option></select></label>
    <label>Currency <select id="currency"><option>USD</option><option>EUR</option></select></label><output id="price">10</output>
    <script>units.onchange=()=>price.textContent=String(Number(units.value)*10)</script>`);
  const { browser, run } = await setup(t, source);
  await run({ action: 'open' });
  await run({ action: 'select', selector: '#currency', value: 'EUR' });
  assert.ok((await desktopProblems(browser, source)).some(problem => problem.includes('activate an observed')));
  await run({ action: 'select', selector: '#units', value: '2' });
  assert.deepEqual(await desktopProblems(browser, source), []);
});

test('stacked screen roots and guessed selectors never receive screen provenance', { timeout: 15_000 }, async t => {
  const source = app.replace('id="result" hidden', 'id="result"');
  const { browser, run } = await setup(t, source, { journeys, ux });
  const opened = await run({ action: 'open' });
  assert.deepEqual(opened.screenIds, []);
  await run({ action: 'click', selector: 'button[id="save"]' });
  const report = browser.flowReport();
  assert.equal(report.transitions.at(-1).status, 'ungrounded');
  assert.equal(report.observations.at(-1).reachable, false);
  assert.ok((await desktopProblems(browser, source)).some(problem => problem.includes('planned screen result')));
});

test('actual same-origin document navigation retains screen provenance beneath a trusted runtime mount', { timeout: 15_000 }, async t => {
  const source = html(`<main id="entry"><h1>Start</h1><a id="go" href="./?screen=done">Continue task</a></main>
    <main id="result" hidden><h1>Completed</h1></main><script>if(location.search==='?screen=done'){entry.hidden=true;result.hidden=false}</script>`);
  const declared = { ...ux, screens: ux.screens.map(screen => ({ ...screen, route: screen.id === 'entry' ? '/' : '/?screen=done' })) };
  const { browser, run } = await setup(t, source, { journeys, ux: declared, mount: '/_preview/host-token' });
  const initial = await run({ action: 'open' });
  assert.equal(initial.route, '/');
  await run({ action: 'click', selector: initial.controls.find(control => control.name === 'Continue task').selector });
  assert.deepEqual(await desktopProblems(browser, source), []);
  assert.equal(browser.flowReport().observations.at(-1).route, '/?screen=done');
});

test('live clocks inside noninteractive ARIA regions do not turn focus into a transition or hide observed controls', { timeout: 15_000 }, async t => {
  const hidden = '<input hidden>'.repeat(450);
  const source = html(`<main role="main">${hidden}<h1>Clock</h1><time id="clock"></time><label>Task <input id="task"></label><button id="noop">Focus task</button></main>
    <script>setInterval(()=>clock.textContent=String(Date.now()),30);noop.onclick=()=>task.focus()</script>`);
  const { browser, run } = await setup(t, source);
  const initial = await run({ action: 'open' });
  assert.ok(initial.controls.some(control => control.selector === '#noop'));
  assert.ok(!initial.controls.some(control => control.role === 'main'));
  await run({ action: 'click', selector: '#noop' });
  assert.ok((await desktopProblems(browser, source)).some(problem => problem.includes('activate an observed')));
});

test('auto-scrolling an offscreen no-op in a capped control inventory does not count, while a real disclosure still does', { timeout: 15_000 }, async t => {
  const rows = Array.from({ length: 100 }, (_, index) => `<button id="row${index}" style="display:block;height:40px">Row ${index}</button>`).join('');
  const source = html(`<h1>Long task list</h1>${rows}<div id="details" hidden><label>Calculated result <input id="computed" readonly value="42"></label></div>
    <script>document.getElementById('row80').onclick=()=>document.getElementById('details').hidden=false</script>`);
  const { browser, run } = await setup(t, source);
  const initial = await run({ action: 'open' });
  assert.equal(initial.controls.length, 80);
  const offscreen = initial.controls.find(control => control.selector === '#row79');
  assert.equal(offscreen?.inViewport, false, 'The clicked no-op must trigger Playwright auto-scroll.');
  const clicked = await run({ action: 'click', selector: offscreen.selector });
  const originalSelectors = new Set(initial.controls.map(control => control.selector));
  assert.ok(clicked.controls.some(control => !originalSelectors.has(control.selector)), 'Auto-scroll must change capped inventory membership to exercise the regression.');
  assert.equal(browser.flowReport().observations.at(-1).controlCount, 100);
  assert.equal(browser.flowReport().transitions.at(-1).status, 'unchanged');
  assert.deepEqual(browser.flowReport().transitions.at(-1).changes, []);
  assert.ok((await desktopProblems(browser, source)).some(problem => problem.includes('activate an observed')));
  await run({ action: 'screenshot' });
  assert.ok((await desktopProblems(browser, source)).some(problem => problem.includes('activate an observed')), 'A later screenshot must not turn inventory churn into pending activation credit.');
  const disclosure = clicked.controls.find(control => control.selector === '#row80');
  assert.ok(disclosure, 'The refreshed inventory must expose the neighboring disclosure control.');
  await run({ action: 'click', selector: disclosure.selector });
  assert.equal(browser.flowReport().observations.at(-1).controlCount, 101);
  assert.deepEqual(await desktopProblems(browser, source), []);
});
