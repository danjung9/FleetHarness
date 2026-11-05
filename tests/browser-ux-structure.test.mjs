import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { PreviewServers } from '../dist-electron/electron/preview.js';
import { AgentBrowserSession } from '../dist-electron/electron/agent-browser.js';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';
import { performBrowserStep } from '../dist-electron/electron/browser-actions.js';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';
import { uxStructureSpec, uxStructureJourney, uxStructureFiles } from '../scripts/ux-structure-fixture.mjs';

const integrationStepMs = 1800, rejectionStepMs = 150;

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-ux-structure-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = uxStructureFiles(options);
  await Promise.all(Object.entries(files).map(([file, contents]) => fs.writeFile(path.join(root, file), contents)));
  const prepare = async () => {
    const previews = new PreviewServers(), url = await previews.url(root, Object.keys(files));
    return { url, routeBase: new URL('.', url).pathname.replace(/\/$/, ''), assertIntegrity: async () => {}, redactMessage: value => value, close: async () => previews.close() };
  };
  return { root, prepare, ux: uxStructureSpec(options.mode), journey: uxStructureJourney() };
}

const plan = journey => ({ schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Save edits through separate focused views.', journeyIds: [journey.id], capabilityIds: [] }], journeys: [journey] });
const verify = (app, overrides = {}) => verifyBrowserJourneys({ root: app.root, ux: app.ux, plan: plan(app.journey), contractHash: 'screen-structure',
  prepareRuntime: app.prepare, allowSameOrigin: true, timeoutMs: 30_000, stepTimeoutMs: integrationStepMs, ...overrides });

function both(result, status) {
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.journeys.map(item => item.viewport), ['desktop', 'narrow']);
  for (const journey of result.journeys) { assert.equal(journey.status, status, journey.detail); assert.ok(journey.screenshot); assert.ok(journey.trace); }
}

async function development(t, app, options = {}) {
  const browser = new AgentBrowserSession({ root: app.root, signal: new AbortController().signal, prepare: app.prepare,
    journeys: [app.journey], ux: app.ux, timeoutMs: 30_000, stepTimeoutMs: integrationStepMs, ...options });
  t.after(() => browser.close());
  return input => browser.tools()[0].execute('structure-test', { action: 'journey', journeyId: app.journey.id, ...input });
}

for (const mode of ['pages', 'views']) test(`independent verification checks ${mode === 'pages' ? 'real HTML pages' : 'hash views with delayed rendering'}, reload and Back persistence at both widths`, { timeout: 40_000 }, async t => {
  const app = await fixture(t, { mode }), result = await verify(app);
  both(result, 'passed');
  for (const journey of result.journeys) {
    const png = await fs.readFile(path.join(app.root, journey.screenshot));
    assert.equal(png.readUInt32BE(16), journey.viewport === 'desktop' ? 1280 : 390);
  }
});

test('isolated browser leases enter index.html and verify a real second page against the frozen screen map', {
  skip: !['darwin', 'linux'].includes(process.platform), timeout: 40_000
}, async t => {
  const app = await fixture(t);
  await fs.writeFile(path.join(app.root, 'core.mjs'), 'export const invoke = value => value;');
  const manifest = { profile: 'browser', files: ['index.html', 'resources.html', 'app.js', 'core.mjs'], requiredEnv: [],
    entrypoint: 'index.html', evaluator: { runtime: 'node', entrypoint: 'core.mjs', args: [] } };
  const result = await verify(app, { prepareRuntime: async signal => {
    const runtime = await prepareIsolatedSolutionRuntime(app.root, manifest, process.execPath, signal,
      { totalTimeoutMs: 30_000, startupTimeoutMs: 5_000, invocationTimeoutMs: 5_000 });
    t.after(() => runtime.close());
    assert.equal(runtime.routeBase, '');
    const lease = await fetch(runtime.url, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
    await lease.arrayBuffer();
    assert.equal(lease.status, 302);
    assert.equal(lease.headers.get('location'), '/index.html');
    return runtime;
  } });
  both(result, 'passed');
});

test('development journeys use the same frozen screens for real multi-page navigation at both widths', { timeout: 40_000 }, async t => {
  const app = await fixture(t), run = await development(t, app);
  // Caller mutation must not change the host's frozen acceptance structure.
  app.ux.screens[0].route = '/changed-after-construction';
  app.journey.steps[0].screenId = 'changed-after-construction';
  for (const viewport of ['desktop', 'narrow']) {
    const result = await run({ viewport });
    assert.equal(result.isError, false, JSON.stringify(result.details));
    assert.equal(result.details.journey.status, 'passed');
    assert.equal(result.details.journey.completedSteps, 21);
    assert.ok(result.content.some(item => item.type === 'image'));
  }
});

test('independent verification snapshots its UX and journeys before asynchronous runtime work', { timeout: 40_000 }, async t => {
  const app = await fixture(t), frozenPlan = plan(app.journey);
  const result = await verify(app, { plan: frozenPlan, prepareRuntime: async () => {
    app.ux.screens[0].route = '/mutated'; frozenPlan.journeys[0].steps[0].screenId = 'mutated';
    return app.prepare();
  } });
  both(result, 'passed');
});

test('stacking every declared screen visibly fails both independent and development journeys', { timeout: 40_000 }, async t => {
  const app = await fixture(t, { mode: 'views', stacked: true });
  // A full journey also starts a runtime and browser. Keep the integration
  // budget for that work; short deadline behavior has its own helper test.
  const independent = await verify(app);
  both(independent, 'failed');
  assert.ok(independent.journeys.every(item => /Inactive screen resources is still visible/.test(item.detail)), JSON.stringify(independent));
  const run = await development(t, app);
  for (const viewport of ['desktop', 'narrow']) {
    const result = await run({ viewport });
    assert.equal(result.isError, true);
    assert.equal(result.details.journey.status, 'failed');
    assert.equal(result.details.journey.completedSteps, 0);
    assert.match(result.details.error, /Inactive screen resources is still visible/);
  }
});

test('legacy journeys without a screen contract still execute in both runners', { timeout: 40_000 }, async t => {
  const app = await fixture(t);
  app.journey.steps = app.journey.steps.slice(2, 5);
  both(await verify(app, { ux: undefined }), 'passed');
  const run = await development(t, app, { ux: undefined });
  assert.equal((await run({ viewport: 'narrow' })).isError, false);
});

test('screen assertions reject missing/unknown contracts, duplicate roots, wrong routes and selector-engine chains', { timeout: 30_000 }, async t => {
  const app = await fixture(t), runtime = await app.prepare();
  t.after(runtime.close);
  const browser = await chromium.launch({ channel: 'chromium', headless: true })
    .catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(runtime.url);
  const check = (step, ux = app.ux, routeBase = runtime.routeBase, timeout = rejectionStepMs) => performBrowserStep(page, step, timeout, undefined, ux, routeBase);
  await assert.rejects(performBrowserStep(page, { action: 'expectScreen', screenId: 'schedule' }, 150), /frozen version 2/);
  await assert.rejects(check({ action: 'expectScreen', screenId: 'absent' }), /unknown frozen screen/);
  await assert.rejects(check({ action: 'expectScreen', screenId: 'schedule' }, { ...app.ux, schemaVersion: 1 }), /version 2/);
  await assert.rejects(check({ action: 'expectScreen', screenId: 'schedule' }, { ...app.ux, structure: undefined }));
  await assert.rejects(check({ action: 'expectScreen', screenId: 'schedule' }, app.ux, '//unsafe'), /route base/);
  await assert.rejects(check({ action: 'expectHidden', selector: '#absent >> text=Schedule' }), /selector-engine/);
  await assert.rejects(check({ action: 'expectScreen', screenId: 'schedule' }, { ...app.ux, screens: app.ux.screens.map(screen => screen.id === 'schedule' ? { ...screen, selector: '#schedule >> text=Schedule' } : screen) }), /selector/);
  await page.evaluate(() => { document.querySelector('#schedule').insertAdjacentHTML('afterend', '<main id="schedule" hidden>Duplicate root</main>'); });
  await assert.rejects(check({ action: 'expectScreen', screenId: 'schedule' }), /matched 2/);
  await page.goto(runtime.url + '?wrong=1');
  await assert.rejects(check({ action: 'expectScreen', screenId: 'schedule' }), /Expected route/);
  await page.goto(runtime.url + '#wrong');
  await assert.rejects(check({ action: 'expectScreen', screenId: 'schedule' }), /Expected route/);
  await page.goto(runtime.url);
  await check({ action: 'expectHidden', selector: '#absent' }, app.ux, runtime.routeBase, integrationStepMs);
  await check({ action: 'expectHidden', selector: '#advanced-panel' }, app.ux, runtime.routeBase, integrationStepMs);
  await page.click('#advanced-toggle');
  await assert.rejects(check({ action: 'expectHidden', selector: '#advanced-panel' }), /Timeout/);
});

test('both runners fail screen steps when the host supplied no UX contract', { timeout: 30_000 }, async t => {
  const app = await fixture(t);
  const result = await verify(app, { ux: undefined });
  both(result, 'failed');
  assert.ok(result.journeys.every(item => /frozen version 2/.test(item.detail)));
  const run = await development(t, app, { ux: undefined });
  const observed = await run({ viewport: 'narrow' });
  assert.equal(observed.isError, true);
  assert.match(observed.details.error, /frozen version 2/);
});

test('atomic screen observations preserve Playwright visibility for hidden, zero-size and display contents roots', { timeout: 20_000 }, async t => {
  const app = await fixture(t), runtime = await app.prepare();
  t.after(runtime.close);
  const browser = await chromium.launch({ channel: 'chromium', headless: true })
    .catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(runtime.url);
  const cases = [
    { style: 'display:none', visible: false },
    { style: 'visibility:hidden', visible: false },
    { hidden: true, visible: false },
    { style: 'width:0;height:0;overflow:hidden', visible: false },
    { style: 'opacity:0', visible: true },
    { style: 'display:contents', content: '<p>Visible child</p>', visible: true },
    { style: 'display:contents', content: 'Visible text', visible: true },
    { style: 'display:contents', content: '', visible: false }
  ];
  for (const value of cases) {
    await page.evaluate(value => {
      const root = document.querySelector('#schedule');
      root.setAttribute('style', value.style ?? ''); root.hidden = value.hidden ?? false;
      root.innerHTML = value.content ?? '<p>Schedule contents</p>';
    }, value);
    assert.equal(await page.locator('#schedule').isVisible(), value.visible, JSON.stringify(value));
    const checked = performBrowserStep(page, { action: 'expectScreen', screenId: 'schedule' }, value.visible ? integrationStepMs : rejectionStepMs, undefined, app.ux, runtime.routeBase);
    if (value.visible) await checked;
    else await assert.rejects(checked, /must have exactly one visible root/, JSON.stringify(value));
  }
});

test('a stalled later screen observation retains the last concrete mismatch at the step deadline', { timeout: 10_000 }, async t => {
  const app = await fixture(t, { mode: 'views', stacked: true }), runtime = await app.prepare();
  t.after(runtime.close);
  const browser = await chromium.launch({ channel: 'chromium', headless: true })
    .catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(runtime.url);
  const evaluate = page.evaluate.bind(page);
  let observations = 0;
  // Obtain actual DOM evidence once, then simulate a renderer that stops
  // answering. The host must stop on time without losing that evidence.
  page.evaluate = (...args) => ++observations === 1 ? evaluate(...args) : new Promise(() => {});
  try {
    await assert.rejects(performBrowserStep(page, { action: 'expectScreen', screenId: 'schedule' }, 250, undefined, app.ux, runtime.routeBase),
      /Inactive screen resources is still visible/);
    assert.ok(observations >= 2);
  } finally { page.evaluate = evaluate; }
});
