import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { stageDefinitions } from '../dist-electron/shared/types.js';

// UI regression against a deterministic desktop bridge. Backend resume and
// checkpoint integrity are exercised separately by the backend test suite.
const output = path.resolve('output/playwright/resume');
await fs.mkdir(output, { recursive: true });
const project = {
  id: 'resume-fixture', title: 'Operational-message parser', description: 'Parse synthetic messages and inspect extracted tasks.', criteria: ['Parse a synthetic task.'],
  createdAt: '2026-11-05T12:00:00Z', updatedAt: '2026-11-05T12:00:00Z',
  status: 'failed', runId: 'saved-run', workspace: '/fixture/saved-run', resumeStage: 'build',
  stages: stageDefinitions.map((stage, index) => ({ ...stage, status: index < 3 ? 'complete' : index === 3 ? 'failed' : 'queued' })),
  logs: [], feedback: '', error: 'The model connection was interrupted. Your application files were saved.'
};
const state = { version: 1, settings: { backend: 'pi', provider: 'fixture', model: 'fixture', rememberKey: false }, projects: [project] };
let browser;
const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
const address = server.httpServer.address();
const url = `http://127.0.0.1:${address.port}`;
const errors = [];

async function openProject(page) {
  await page.goto(url);
  await page.locator('.home-build-list>button').first().click();
  await page.getByRole('heading', { name: 'Build phases', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function capture(page, name, size) {
  await page.setViewportSize(size);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.app-shell').count(), 1);
  const overflow = await page.evaluate(() => ['html', '.app-shell', '.workspace', '.journey-header', '.journey-heading', '.build-flow', '.build-phase-detail']
    .flatMap(selector => [...document.querySelectorAll(selector)].filter(element => element.clientWidth && element.scrollWidth > element.clientWidth + 1)
      .map(element => ({ selector, width: element.clientWidth, content: element.scrollWidth }))));
  assert.deepEqual(overflow, [], `${name}: no horizontal overflow`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1), false, 'Scrolling stays inside the main work area');
  await page.screenshot({ path: path.join(output, name), scale: 'css', animations: 'disabled' });
}

try {
  try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'chrome' }); }
  const page = await browser.newPage({ viewport: { width: 1512, height: 982 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(initialState => {
    let state = structuredClone(initialState);
    const listeners = new Set();
    const calls = { resume: [], start: [] };
    let pending;
    const publish = () => { for (const listener of listeners) listener(structuredClone(state)); };
    const bootstrap = async () => ({ state: structuredClone(state), models: [{ id: 'fixture', provider: 'fixture', name: 'Local resume fixture', backend: 'pi', configured: true }],
      storagePath: '/fixture', credentialStatus: 'Connected', runtime: 'UI fixture', capabilities: { projectConversation: false } });
    window.__resumeFixture = {
      calls,
      settle(error) {
        if (error) pending.reject(new Error(error));
        else {
          const project = state.projects[0]; project.status = 'running'; project.error = undefined;
          project.stages.find(stage => stage.id === project.resumeStage).status = 'active';
          publish(); pending.resolve();
        }
        pending = undefined;
      },
      reset(changes = {}, settings = {}) { state = structuredClone(initialState); Object.assign(state.projects[0], changes); Object.assign(state.settings, settings); publish(); },
      read: () => structuredClone(state)
    };
    window.fleetHarness = {
      bootstrap,
      onState: listener => { listeners.add(listener); return () => listeners.delete(listener); },
      artifacts: async () => [{ path: 'index.html', size: 100 }, { path: 'README.md', size: 100 }, { path: 'research.md', size: 100 }],
      readArtifact: async () => 'Saved source', preview: async () => null,
      resumeRun: id => { calls.resume.push(id); return new Promise((resolve, reject) => { pending = { resolve, reject }; }); },
      startRun: async id => { calls.start.push(id); },
      stopRun: async () => {},
      requestChanges: async () => {}
    };
  }, state);
  await openProject(page);
  const resume = page.getByRole('button', { name: 'Resume implementation', exact: true });
  assert.equal(await resume.count(), 2, 'Resume is visible in the phase panel and journey header');
  assert.equal(await page.getByRole('button', { name: 'Start new build', exact: true }).isEnabled(), true);
  assert.equal(await page.locator('.build-phase-row.complete').count(), 3);
  assert.match(await page.locator('.build-phase-problem').innerText(), /Completed phases stay complete/);
  await capture(page, 'failed-desktop.png', { width: 1512, height: 982 });
  await capture(page, 'failed-minimum.png', { width: 1120, height: 720 });

  // The phase-panel action reports progress and prevents either entry point
  // from submitting another resume while the request is pending.
  await page.evaluate(() => {
    document.querySelector('.build-phase-recovery button').click();
    document.querySelector('.journey-action .primary').click();
  });
  await page.getByRole('button', { name: 'Resuming…', exact: true }).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Resuming…', exact: true }).count(), 2);
  assert.equal(await page.getByRole('button', { name: 'Resuming…', exact: true }).first().isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Resuming…', exact: true }).last().isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Start new build', exact: true }).isDisabled(), true);
  assert.deepEqual(await page.evaluate(() => window.__resumeFixture.calls.resume), ['resume-fixture']);
  await page.evaluate(() => window.__resumeFixture.settle('The saved checkpoint could not be validated. Start a new build.'));
  await page.getByRole('alert').filter({ hasText: 'The saved checkpoint could not be validated.' }).waitFor();
  assert.equal(await resume.last().isEnabled(), true);
  assert.equal(await page.locator('.build-phase-row.complete').count(), 3, 'Rejected resume keeps completed phases and saved outputs');

  // The header action resumes the same run; it never invokes startRun.
  await page.locator('.journey-action').getByRole('button', { name: 'Resume implementation', exact: true }).click();
  await page.getByRole('button', { name: 'Resuming…', exact: true }).first().waitFor();
  await page.evaluate(() => window.__resumeFixture.settle());
  await page.getByRole('button', { name: 'Stop build', exact: true }).waitFor();
  assert.equal(await page.locator('.build-phase-row.complete').count(), 3);
  const resumed = await page.evaluate(() => window.__resumeFixture.read().projects[0]);
  assert.equal(resumed.runId, project.runId);
  assert.equal(resumed.workspace, project.workspace);
  assert.equal(resumed.stages.find(stage => stage.id === 'build').status, 'active');
  assert.deepEqual(await page.evaluate(() => window.__resumeFixture.calls.start), []);

  await page.evaluate(() => window.__resumeFixture.reset({ status: 'stopped' }));
  await page.locator('.build-detail-state.stopped').waitFor();
  assert.equal(await resume.count(), 2);

  // A persisted checkpoint can win a race with the subsequent stage-status
  // save. Both entry points must still offer the same recoverable phase.
  for (const stageStatus of ['queued', 'complete']) {
    await page.evaluate(stageStatus => {
      const stages = window.__resumeFixture.read().projects[0].stages.map(stage => stage.id === 'build' ? { ...stage, status: stageStatus } : stage);
      window.__resumeFixture.reset({ status: 'stopped', stages });
    }, stageStatus);
    await page.locator('.build-detail-state.stopped').waitFor();
    assert.equal(await resume.count(), 2);
    assert.equal(await page.locator('.build-phase-row.complete').count(), 3);
  }

  await page.evaluate(() => window.__resumeFixture.reset({}, { provider: 'missing' }));
  await page.getByText('Connect a model in Settings to resume this phase.', { exact: true }).waitFor();
  assert.equal(await resume.first().isDisabled(), true);
  assert.equal(await resume.last().isDisabled(), true);

  await page.evaluate(() => window.__resumeFixture.reset({ resumeStage: undefined }));
  await page.getByRole('button', { name: 'Start new build', exact: true }).waitFor();
  assert.equal(await resume.count(), 0, 'Legacy runs without a checkpoint do not promise resume');
  assert.match(await page.locator('.build-phase-problem').innerText(), /Saved outputs remain available.*Start a new build/s);

  await page.evaluate(() => window.__resumeFixture.reset({ status: 'draft' }));
  assert.equal(await resume.count(), 0, 'An edited brief cannot resume the stale run');

  await page.evaluate(() => {
    window.__resumeFixture.reset();
    delete window.fleetHarness.resumeRun;
  });
  await page.locator('.build-phase-recovery').getByRole('button', { name: 'Resume implementation', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Resuming phases needs a full app restart to load this update.' }).waitFor();
  assert.equal(await resume.last().isEnabled(), true, 'An old preload bridge shows restart guidance and releases the pending state');

  const previewPage = await browser.newPage({ viewport: { width: 1120, height: 720 } });
  previewPage.on('pageerror', error => errors.push(error.message));
  await previewPage.addInitScript(state => localStorage.setItem('fleet-browser-preview', JSON.stringify(state)), state);
  await openProject(previewPage);
  const previewResume = previewPage.getByRole('button', { name: 'Resume implementation', exact: true });
  assert.equal(await previewResume.count(), 2);
  assert.equal(await previewResume.first().isDisabled(), true);
  assert.equal(await previewResume.last().isDisabled(), true);
  assert.match(await previewPage.locator('.journey-message').innerText(), /Open the desktop app to resume/);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, phaseAndHeaderActions: true, pendingAndFailureRecovery: true, sameRunAndCompletedPhases: true,
    stoppedAndLegacyStates: true, checkpointStatusRace: true, oldBridgeRecovery: true, disconnectedAndBrowserPreviewDisabled: true, rendererErrors: errors.length, screenshots: output }, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
