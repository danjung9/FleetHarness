import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { preview as servePreview } from 'vite';

const output = path.resolve('output/playwright/builder');
await fs.mkdir(output, { recursive: true });
const server = process.env.BUILDER_TEST_URL ? null : await servePreview({ preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false } });
const url = process.env.BUILDER_TEST_URL || `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ stages }) => {
    const listeners = new Set();
    const state = { version: 1, projects: [], settings: { backend: 'pi', provider: 'fixture', model: 'local-model', rememberKey: false } };
    const publish = () => listeners.forEach(listener => listener(structuredClone(state)));
    const find = id => state.projects.find(project => project.id === id);
    window.builderFixture = { state, failStart: true, publish };
    window.fleetHarness = {
      bootstrap: async () => ({ state: structuredClone(state), models: [{ id: 'local-model', name: 'Local test model', provider: 'fixture', backend: 'pi', configured: true }], storagePath: 'Local test workspace', credentialStatus: '', runtime: 'fixture', capabilities: { projectConversation: true, planningContinuation: true } }),
      onState: callback => { listeners.add(callback); return () => listeners.delete(callback); },
      createProject: async input => { const project = { ...input, id: crypto.randomUUID(), status: 'draft', stages: structuredClone(stages), logs: [], feedback: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; state.projects.unshift(project); publish(); return structuredClone(project); },
      startRun: async id => { if (window.builderFixture.failStart) throw new Error('EPERM: operation not permitted, rename temporary -> .fleet'); find(id).status = 'running'; find(id).runId = 'local-run'; find(id).workspace = '/local-test'; find(id).resumeStage = 'build'; publish(); },
      resumeRun: async id => { find(id).status = 'running'; publish(); },
      stopRun: async id => { find(id).status = 'stopped'; delete find(id).inProgressPreview; publish(); },
      preview: async (id, token) => {
        const project = find(id);
        if (project.status === 'running' && token && token === project.inProgressPreview) return location.origin + '/fixture-checked-preview';
        if (project.status === 'review' && token === null) return location.origin + '/fixture-verified-preview';
        return null;
      },
      artifacts: async () => [{ path: 'README.md', size: 100 }],
      readArtifact: async () => '# Local test app',
      sendMessage: async (id, text) => { const project = find(id); project.conversation ??= { status: 'idle', messages: [], questions: [], actions: [] }; project.conversation.messages.push({ id: crypto.randomUUID(), role: 'user', text, status: 'complete', createdAt: new Date().toISOString() }, { id: crypto.randomUUID(), role: 'assistant', text: 'I will update the app.', status: 'complete', createdAt: new Date().toISOString() }); publish(); },
      cancelMessage: async () => {}, answerClarification: async () => {}, applyConversationAction: async () => {}, dismissConversationAction: async () => {},
    };
  }, { stages: ['intake', 'research', 'plan', 'build', 'verify', 'review', 'deliver'].map(id => ({ id, label: id, detail: 'Local UI fixture', status: 'queued' })) });
  await page.route('**/fixture-checked-preview', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="font-family:system-ui;padding:32px"><h1>Local test app</h1><p>One workflow is ready to try.</p></body></html>' }));
  await page.route('**/fixture-verified-preview', route => route.fulfill({ contentType: 'text/html', body: '<html><body><h1>Local verified app</h1></body></html>' }));
  await page.goto(url);
  page.setDefaultTimeout(5000);
  await page.getByRole('button', { name: 'New app', exact: true }).click();
  await page.getByRole('complementary', { name: 'New app chat' }).waitFor();
  assert.equal(await page.locator('.requirements-form,.requirements-page,.journey-header').count(), 0);
  const chat = await page.locator('.conversation-panel').boundingBox();
  const preview = await page.locator('.builder-preview-empty').boundingBox();
  assert(chat.x + chat.width <= preview.x + 1, 'Chat sits to the left of preview');
  await page.getByLabel('Describe your app', { exact: true }).fill('Build a team task board with projects, deadlines, and weekly progress.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'EPERM' }).waitFor();
  await page.getByLabel('Message', { exact: true }).waitFor();
  assert.equal(await page.locator('.builder-output').count(), 1, 'Failed start stays in chat workspace');
  await page.getByLabel('Message', { exact: true }).fill('Keep this draft while I inspect files.');
  await page.getByRole('navigation', { name: 'App views' }).getByRole('button', { name: 'Files', exact: true }).click();
  await page.getByRole('heading', { name: 'Files', exact: true }).waitFor({ timeout: 2000 });
  assert.equal(await page.getByLabel('Message', { exact: true }).inputValue(), 'Keep this draft while I inspect files.');
  await page.getByRole('navigation', { name: 'App views' }).getByRole('button', { name: 'Activity', exact: true }).click();
  await page.getByRole('heading', { name: 'Activity', exact: true }).waitFor();
  await page.getByRole('navigation', { name: 'App views' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await page.evaluate(() => { window.builderFixture.failStart = false; });
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await page.getByText('The preview opens after a workflow passes its first check.', { exact: false }).waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  await page.evaluate(() => {
    const { state, publish } = window.builderFixture;
    state.projects[0].inProgressPreview = 'checked-workflow-revision';
    publish();
  });
  await page.getByText('In progress', { exact: true }).waitFor();
  await page.frameLocator('iframe').getByRole('heading', { name: 'Local test app' }).waitFor();
  const appViews = page.getByRole('navigation', { name: 'App views' });
  assert.equal(await appViews.getByRole('button', { name: /^(Review|Export)$/ }).count(), 0);
  await page.getByRole('button', { name: 'Reload preview', exact: true }).click();
  await page.frameLocator('iframe').getByRole('heading', { name: 'Local test app' }).waitFor();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText('I will update the app.', { exact: true }).waitFor();
  for (const [width, height, name] of [[1440,960,'desktop'],[1120,720,'minimum'],[390,844,'mobile']]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: no page overflow`);
    assert.equal(await page.getByRole('button', { name: 'Send', exact: true }).isVisible(), true);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.rail .icon-button')].every(node => node.scrollWidth <= node.clientWidth)), true, `${name}: navigation labels fit`);
    if (!process.env.BUILDER_SKIP_CAPTURES) await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.locator('iframe').waitFor({ state: 'detached' });
  assert.equal(await page.getByText('In progress', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByText('The preview opens after a workflow passes its first check.', { exact: false }).waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.locator('.home-build-list>button').first().click();
  await page.getByLabel('Message', { exact: true }).waitFor();
  assert.equal(await page.locator('.requirements-form,.requirements-page,.journey-header').count(), 0);
  await page.getByLabel('Message', { exact: true }).press('Escape');
  assert.equal(await page.locator('.builder-output').count(), 1, 'Escape does not close the workspace chat');
  await page.evaluate(() => {
    const { state, publish } = window.builderFixture;
    Object.assign(state.projects[0], {
      status: 'review',
      runCheckpoint: { context: 'appyard-single-agent-v1' },
      experiment: { status: 'failed' },
      report: { exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0, output: 'Checks passed.', time: new Date().toISOString(), durationMs: 1 },
    });
    publish();
  });
  await page.frameLocator('iframe').getByRole('heading', { name: 'Local verified app' }).waitFor();
  assert.equal(await page.getByText('In progress', { exact: true }).count(), 0);
  await appViews.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByText('Automated checks passed', { exact: true }).waitFor();
  assert.equal(await page.locator('.experiment-review, .experiment-unavailable').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Use these gaps as my change request' }).count(), 0);
  await page.getByLabel('Review notes').fill('Checked the portal and its local revision workflow.');
  await page.getByLabel('I inspected the application, test evidence, and limitations.').check();
  assert.equal(await page.getByRole('button', { name: 'Approve app', exact: true }).isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks: ['new chat opens split workspace','no briefing UI','failed build preserves workspace','tabs preserve chat draft','chat send','checked in-progress preview and reload','stop and resume','reopen saved project','verified preview and review gate','desktop/minimum/mobile overflow'], screenshots: output }, null, 2));
} finally { await browser.close(); await server?.httpServer.close(); }
