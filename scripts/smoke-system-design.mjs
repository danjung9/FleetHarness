import { chromium, _electron as electron } from 'playwright';
import { createServer } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { startFixtureProvider } from './mock-provider.mjs';

async function openBuild(page) {
  const legacyFlow = page.getByRole('button', { name: 'Flow — build pipeline', exact: true });
  if (await legacyFlow.count()) return legacyFlow.click();
  if (!await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).count()) {
    await page.getByRole('button', { name: 'Preview — generated app', exact: true }).click();
  }
  await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Build', exact: true }).click();
}

async function openSystemDesign(page) {
  await openBuild(page);
  if (await page.locator('.build-flow').count()) {
    await page.getByRole('button', { name: /^Plan: / }).click();
    const disclosure = page.locator('.build-disclosure').filter({ has: page.locator('summary').filter({ hasText: /^System design$/ }) });
    await disclosure.waitFor();
    if (await disclosure.getAttribute('open') === null) await disclosure.locator(':scope > summary').click();
  } else {
    await page.getByRole('button', { name: 'System design', exact: true }).click();
  }
}

async function openDesignWithActivity(page) {
  const legacyPreview = page.getByRole('button', { name: 'Preview — development workspace', exact: true });
  if (await legacyPreview.count()) {
    await legacyPreview.click();
    await page.getByRole('button', { name: 'System design', exact: true }).click();
    const activity = page.getByRole('button', { name: 'Toggle activity', exact: true });
    if (await activity.getAttribute('aria-expanded') !== 'true') await activity.click();
  } else {
    await openSystemDesign(page);
    const activity = page.locator('.build-disclosure').filter({ has: page.locator('summary').filter({ hasText: /^Activity/ }) });
    if (await activity.getAttribute('open') === null) await activity.locator(':scope > summary').click();
  }
}

async function assertNoOuterOverflow(page, context) {
  const overflowing = await page.evaluate(() => {
    const selectors = ['html', '.app-shell', '.factory-main', '.build-flow', '.development', '.preview-system-design', '.system-design'];
    return selectors.flatMap(selector => [...document.querySelectorAll(selector)]
      .filter(element => element.clientWidth && element.scrollWidth > element.clientWidth + 1)
      .map(element => ({ selector, width: element.clientWidth, content: element.scrollWidth, children: [...element.querySelectorAll('*')]
        .filter(child => child.getBoundingClientRect().right > element.getBoundingClientRect().right + 1)
        .slice(0, 5).map(child => child.className) })));
  });
  assert.deepEqual(overflowing, [], `${context}: horizontal scrolling must stay inside the diagram`);
}

async function checkDiagramControls(page, definition) {
  const zoomValue = page.locator('.sd-zoom-value');
  await page.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  const originalZoom = Number.parseInt(await zoomValue.innerText(), 10);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.waitForFunction(previous => Number.parseInt(document.querySelector('.sd-zoom-value')?.textContent, 10) > previous, originalZoom);
  const enlargedZoom = Number.parseInt(await zoomValue.innerText(), 10);
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForFunction(previous => Number.parseInt(document.querySelector('.sd-zoom-value')?.textContent, 10) < previous, enlargedZoom);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  await page.waitForFunction(fitted => Number.parseInt(document.querySelector('.sd-zoom-value')?.textContent, 10) === fitted, originalZoom);

  const selectedLabel = await page.locator('.sd-detail-title h3').innerText();
  const selected = definition.components.find(component => component.label === selectedLabel);
  const edge = definition.connections.find(connection => connection.from === selected.id || connection.to === selected.id);
  const other = definition.components.find(component => component.id === (edge.from === selected.id ? edge.to : edge.from));
  await page.getByRole('button', { name: `Inspect ${other.label}`, exact: true }).first().click();
  assert.equal(await page.locator('.sd-detail-title h3').innerText(), other.label, 'Connection links select the connected component');
  assert.equal(await page.getByRole('button', { name: `${other.label}: Generated`, exact: true }).getAttribute('aria-pressed'), 'true');

  const focus = page.getByRole('button', { name: 'Focus connections', exact: true });
  assert.equal(await focus.getAttribute('aria-pressed'), 'false');
  await focus.click();
  assert.equal(await focus.getAttribute('aria-pressed'), 'true');
  const neighbors = new Set([other.id]);
  for (const connection of definition.connections) {
    if (connection.from === other.id) neighbors.add(connection.to);
    if (connection.to === other.id) neighbors.add(connection.from);
  }
  assert.equal(await page.locator('.sd-node.is-dimmed').count(), definition.components.length - neighbors.size, 'Focus dims only components outside the selected neighborhood');
  await focus.click();
  assert.equal(await focus.getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('.sd-node.is-dimmed').count(), 0);

  await page.getByRole('button', { name: 'Hide component details', exact: true }).click();
  await page.locator('.sd-detail').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Show component details', exact: true }).click();
  await page.locator('.sd-detail').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.sd-detail-title h3').innerText(), other.label, 'Reopening details retains the selected component');
}

function denseDesign(project) {
  const result = structuredClone(project);
  const kinds = ['interface', 'logic', 'data', 'integration'];
  const labels = [
    'Operations review and exception management workspace', 'Incoming message and attachment review', 'Dispatch schedule and assignment overview',
    'Message classification and structured task extraction', 'Assignment policy and conflict resolution', 'Availability and schedule reconciliation',
    'Locally retained message and task history', 'Operator preferences and saved review state', 'Versioned schedule and availability records',
    'Simulated dispatch notification and acknowledgement service', 'Simulated upstream schedule synchronization', 'Standalone integration health and diagnostics',
  ];
  const components = labels.map((label, index) => ({
    id: `component-${index}`, label, kind: kinds[Math.floor(index / 3)],
    description: `${label} keeps the prototype's responsibilities explicit. This intentionally long description checks that the inspector remains readable when real architecture details span several lines.`,
    files: [`src/features/${'long-workspace-path-'.repeat(5)}${index}/component.tsx`],
  }));
  const pairs = [[0, 3], [3, 0], [0, 1], [0, 6], [1, 4], [2, 5], [3, 4], [3, 6], [4, 7], [5, 8], [6, 7], [7, 8], [3, 9], [9, 3], [5, 10], [10, 8]];
  const connections = pairs.map(([from, to], index) => ({
    from: components[from].id, to: components[to].id,
    label: index === 0 ? 'Validated synthetic message and attachment context for structured task extraction and review' : `Application data flow ${index + 1}`,
  }));
  result.systemDesign.definition = { title: 'Operations workspace with twelve connected responsibilities', description: 'A dense architecture fixture spanning interfaces, application logic, data, and simulated integrations.', components, connections };
  result.systemDesign.progress = Object.fromEntries(components.map(component => [component.id, { status: 'generated', detail: 'The implementation and mapped sources are present for review.', updatedAt: result.systemDesign.updatedAt }]));
  return result;
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-design-ui-'));
const output = path.resolve('output/playwright'); await fs.mkdir(output, { recursive: true });
const piDir = path.join(root, 'pi'); await fs.mkdir(piDir);
const fixture = await startFixtureProvider(); fixture.setDelay(1000);
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: { 'fleet-fixture': { baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only', models: [{ id: 'fixture-model', name: 'Local test fixture', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] } } }));
let app, browser, server;
try {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: piDir }, timeout: 45000 });
  const page = await app.firstWindow(); await page.locator('.app-shell').waitFor();
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.webContents.setBackgroundThrottling(false);
    window.hide();
  });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const id = await page.evaluate(async () => {
    const api = window.fleetHarness;
    await api.saveSettings({ provider: 'fleet-fixture', model: 'fixture-model', rememberKey: false });
    const p = (await api.bootstrap()).state.projects[0];
    window.designSnapshots = [];
    api.onState(state => { const p = state.projects[0]; window.designSnapshots.push({ status: p.status, runId: p.runId, progress: p.systemDesign?.progress, report: p.report }); });
    return p.id;
  });
  await openBuild(page);
  await page.getByRole('button', { name: 'Start build', exact: true }).click();
  await page.getByRole('button', { name: /^(Run Pi agents|Start automatic build)$/ }).click();
  await page.waitForFunction(() => window.designSnapshots.some(state => state.status === 'running' && state.runId));
  if (await page.locator('.build-flow').count()) await openSystemDesign(page);
  else await page.getByRole('heading', { name: 'Designing your system' }).waitFor();
  await page.getByRole('button', { name: 'Message review: Planned', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Task extraction: Building', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Task extraction: Building', exact: true }).click();
  await page.locator('.sd-detail-title h3').filter({ hasText: 'Task extraction' }).waitFor();
  await page.screenshot({ path: path.join(output, 'system-design-building.png'), scale: 'css' });
  await page.waitForFunction(() => ['review', 'failed'].includes(window.designSnapshots.at(-1)?.status), undefined, { timeout: 90000, polling: 250 });
  const final = await page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(p => p.id === id), id);
  assert.equal(final.status, 'review', final.error);
  assert.ok(Object.values(final.systemDesign.progress).every(p => p.status === 'generated'));
  assert.equal(final.report.passed, 1);
  const states = await page.evaluate(() => window.designSnapshots);
  assert.ok(states.some(s => s.progress && Object.values(s.progress).every(p => p.status === 'planned')));
  assert.ok(states.some(s => s.progress?.parser.status === 'building' && !s.report));
  assert.ok(states.some(s => s.progress?.parser.status === 'building' && s.report?.failed === 1), 'Repair must return affected component to building');
  await page.getByRole('button', { name: 'Message review: Generated', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('.sd-relationships').innerText(), /Synthetic message text/);
  await checkDiagramControls(page, final.systemDesign.definition);
  await page.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  await assertNoOuterOverflow(page, 'Desktop system design');
  await page.screenshot({ path: path.join(output, 'system-design-desktop.png'), scale: 'css' });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
  await page.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  await page.screenshot({ path: path.join(output, 'system-design-minimum.png'), scale: 'css' });
  await assertNoOuterOverflow(page, 'Minimum desktop system design');
  await page.getByRole('button', { name: /^(App preview|Preview — generated app)$/ }).click();
  await page.frameLocator('iframe').getByRole('button', { name: 'Parse message' }).click();
  await page.reload(); await page.locator('.app-shell').waitFor();
  await openSystemDesign(page);
  assert.equal(await page.locator('.sd-node.generated').count(), 3, 'Saved design survives reload');
  await openDesignWithActivity(page);
  await page.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  await assertNoOuterOverflow(page, 'Minimum development workspace with activity open');
  await page.screenshot({ path: path.join(output, 'system-design-development-activity.png'), scale: 'css' });
  await page.evaluate(id => window.fleetHarness.updateProject(id, { title: 'Revised parser', description: 'A revised application brief should clear the previous system architecture.', criteria: ['Publish a new design.'] }), id);
  assert.equal(await page.evaluate(async id => !!(await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id)?.systemDesign, id), false, 'Editing the brief clears the persisted design');
  if (await page.locator('.build-flow').count()) await page.locator('.system-design').waitFor({ state: 'hidden' });
  else await page.getByRole('heading', { name: 'Your system design will appear here' }).waitFor();
  assert.deepEqual(errors, []);
  // Check interrupted states in the retained browser renderer using the real fixture result.
  server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: false }, plugins: [{
    name: 'system-design-smoke-mount',
    resolveId(id) { if (id === '/@system-design-smoke') return '\0system-design-smoke'; },
    load(id) { if (id === '\0system-design-smoke') return `
      import { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SystemDesign } from '/src/SystemDesign.tsx';
      let root;
      export function mount(project) {
        if (!root) {
          document.getElementById('root').style.display = 'none';
          const host = document.createElement('main');
          host.style.cssText = 'width:100vw;height:100vh;overflow:auto;background:var(--ground)';
          document.body.appendChild(host);
          root = createRoot(host);
        }
        root.render(createElement(SystemDesign, { project }));
      }
    `; },
  }] });
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome' });
  const renderer = await browser.newPage({ viewport: { width: 1120, height: 720 }, reducedMotion: 'reduce' });
  renderer.on('pageerror', e => errors.push(e.message));
  await renderer.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  const seed = async project => {
    await renderer.evaluate(project => localStorage.setItem('fleet-browser-preview', JSON.stringify({ version: 1, settings: { provider: '', model: '', rememberKey: false }, projects: [project] })), project);
    await renderer.reload();
    await renderer.locator('.app-shell').waitFor();
    await openSystemDesign(renderer);
    await renderer.locator('.sd-node').first().waitFor();
  };
  const interrupted = structuredClone(final);
  interrupted.status = 'stopped'; interrupted.systemDesign.progress.parser.status = 'building';
  await seed(interrupted);
  assert.equal(await renderer.locator('.sd-node.building').count(), 0);
  assert.equal(await renderer.getByRole('button', { name: 'Task extraction: Stopped' }).count(), 1);
  interrupted.status = 'failed'; await seed(interrupted);
  assert.equal(await renderer.getByRole('button', { name: 'Task extraction: Blocked' }).count(), 1);

  const dense = denseDesign(final);
  await renderer.setViewportSize({ width: 1600, height: 1000 });
  await seed(dense);
  assert.equal(await renderer.locator('.sd-node.generated').count(), 12);
  assert.equal(await renderer.locator('.sd-column-label').count(), 4, 'All four component kinds are visible');
  await checkDiagramControls(renderer, dense.systemDesign.definition);
  await renderer.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  await assertNoOuterOverflow(renderer, 'Dense desktop diagram');
  await renderer.screenshot({ path: path.join(output, 'system-design-dense-desktop.png'), scale: 'css' });
  if (await renderer.evaluate(() => document.fullscreenEnabled)) {
    await renderer.getByRole('button', { name: 'Expand system design', exact: true }).click();
    await renderer.waitForFunction(() => document.fullscreenElement?.classList.contains('system-design'));
    await renderer.getByRole('button', { name: 'Fit diagram', exact: true }).click();
    await renderer.screenshot({ path: path.join(output, 'system-design-expanded.png'), scale: 'css' });
    await renderer.getByRole('button', { name: 'Exit expanded system design', exact: true }).click();
    await renderer.waitForFunction(() => !document.fullscreenElement);
  }

  await renderer.setViewportSize({ width: 1120, height: 720 });
  await openDesignWithActivity(renderer);
  await renderer.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  const longLabel = dense.systemDesign.definition.components[0].label;
  await renderer.getByRole('button', { name: `${longLabel}: Generated`, exact: true }).click();
  assert.equal(await renderer.locator('.sd-detail-title h3').innerText(), longLabel);
  assert.equal(await renderer.locator('.sd-files code').first().innerText(), dense.systemDesign.definition.components[0].files[0]);
  assert.equal(await renderer.locator('.sd-detail').evaluate(element => element.scrollWidth > element.clientWidth + 1), false, 'Long labels and paths stay inside the inspector');
  const clippedDetails = await renderer.locator('.sd-detail-title h3, .sd-files code').evaluateAll(elements => elements
    .filter(element => element.clientWidth && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1))
    .map(element => element.textContent));
  assert.deepEqual(clippedDetails, [], 'The inspector exposes the full component label and source paths');
  await assertNoOuterOverflow(renderer, 'Dense minimum workspace with activity open');
  await renderer.screenshot({ path: path.join(output, 'system-design-dense-minimum-activity.png'), scale: 'css' });

  for (let step = 0; step < 4; step++) await renderer.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const canvas = renderer.locator('.sd-graph-scroll');
  const canvasSize = await canvas.evaluate(element => { element.scrollLeft = 0; element.scrollTop = 0; return { width: element.clientWidth, content: element.scrollWidth }; });
  assert.ok(canvasSize.content > canvasSize.width, 'Enlarged dense diagrams can be panned horizontally');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  await renderer.mouse.move(bounds.x + Math.min(bounds.width - 24, 200), bounds.y + 20);
  await renderer.mouse.down();
  await renderer.mouse.move(bounds.x + 24, bounds.y + 20, { steps: 6 });
  await renderer.mouse.up();
  await renderer.waitForFunction(() => document.querySelector('.sd-graph-scroll').scrollLeft > 0);
  await renderer.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  await assertNoOuterOverflow(renderer, 'Dense workspace after zoom and pan');

  // Empty states remain covered even when the surrounding shell only shows published designs.
  const emptyPage = await browser.newPage({ viewport: { width: 1120, height: 720 }, reducedMotion: 'reduce' });
  emptyPage.on('pageerror', error => errors.push(error.message));
  await emptyPage.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  const empty = structuredClone(final); delete empty.systemDesign; empty.status = 'running';
  await emptyPage.evaluate(async project => (await import('/@system-design-smoke')).mount(project), empty);
  await emptyPage.getByRole('heading', { name: 'Designing your system', exact: true }).waitFor();
  empty.status = 'review';
  await emptyPage.evaluate(async project => (await import('/@system-design-smoke')).mount(project), empty);
  await emptyPage.getByRole('heading', { name: 'Your system design will appear here', exact: true }).waitFor();
  await assertNoOuterOverflow(emptyPage, 'Empty design state');
  const oneKind = structuredClone(dense);
  oneKind.systemDesign.definition.components.forEach(component => { component.kind = 'logic'; });
  await emptyPage.evaluate(async project => (await import('/@system-design-smoke')).mount(project), oneKind);
  await emptyPage.locator('.sd-node').first().waitFor();
  await emptyPage.getByRole('button', { name: 'Fit diagram', exact: true }).click();
  await emptyPage.waitForFunction(() => {
    const canvas = document.querySelector('.sd-graph-scroll');
    return canvas && canvas.scrollWidth <= canvas.clientWidth + 1 && canvas.scrollHeight <= canvas.clientHeight + 1;
  });
  assert.equal(await emptyPage.locator('.sd-node').count(), 12, 'Fit includes every component when all twelve share a kind');
  const fittedOneKind = await emptyPage.locator('.sd-zoom-value').innerText();
  await emptyPage.locator('.sd-graph-scroll').focus();
  await emptyPage.keyboard.press('-');
  assert.equal(await emptyPage.locator('.sd-zoom-value').innerText(), fittedOneKind, 'Zoom out cannot enlarge a diagram fitted below the manual minimum');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, planning: true, liveProgress: true, repair: true, sourceReferences: true, persistence: true, staleDesignCleared: true, interruptedStates: true, emptyStates: true, zoomAndPan: true, connectionFocus: true, linkedInspector: true, denseResponsiveLayout: true, rendererErrors: 0, screenshots: output }, null, 2));
} catch (error) {
  if (app) {
    const page = await app.firstWindow();
    console.error(await page.evaluate(async () => ({
      projects: (await window.fleetHarness.bootstrap()).state.projects.map(p => ({ status: p.status, error: p.error, progress: p.systemDesign?.progress })),
      snapshots: window.designSnapshots,
      selectedPhase: document.querySelector('.build-phase-row[aria-pressed="true"]')?.getAttribute('aria-label'),
      designDisclosures: [...document.querySelectorAll('.build-disclosure')].map(element => ({ open: element.open, summary: element.querySelector('summary')?.textContent })),
      nodes: [...document.querySelectorAll('.sd-node')].map(element => ({ name: element.getAttribute('aria-label'), visible: !!element.getClientRects().length }))
    })));
    await page.screenshot({ path: path.join(output, 'system-design-failure.png'), scale: 'css' }).catch(() => {});
  }
  throw error;
} finally {
  await browser?.close(); await app?.close(); await fixture.close();
  await server?.close();
  await fs.rm(root, { recursive: true, force: true });
}
