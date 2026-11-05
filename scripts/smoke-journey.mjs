import { stubCodexGoalLaunch } from './codex-goal-smoke-fixture.mjs';
import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { startFixtureProvider } from './mock-provider.mjs';
import { qualityFixtureProject } from './quality-fixture.mjs';

// Run the real desktop workflow against the explicit local provider fixture.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-journey-'));
const output = path.resolve('output/playwright');
await fs.mkdir(output, { recursive: true });
const piDir = path.join(root, 'pi');
await fs.mkdir(piDir);
const fixture = await startFixtureProvider();
fixture.setDelay(200);
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: {
  'fleet-fixture': {
    baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
    models: [{ id: 'fixture-model', name: 'Local journey fixture', reasoning: false, input: ['text', 'image'],
      contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }]
  }
} }));

async function assertCompactNavigation(page) {
  const progress = page.getByRole('navigation', { name: 'Challenge progress', exact: true });
  assert.equal(await progress.getByRole('button').count(), 4, 'The journey has exactly four milestone controls');
  for (const name of ['Brief', 'Build', 'Review', 'Deliver']) {
    assert.equal(await progress.getByRole('button', { name, exact: true }).count(), 1);
  }
  const utilities = page.getByRole('navigation', { name: 'Primary', exact: true });
  assert.equal(await utilities.getByRole('button').count(), 4, 'The default utility rail excludes settings sections and developer-only system design');
  for (const name of ['Home — challenge portfolio', 'Preview — generated app', 'Activity — agent work', 'Files — artifacts']) {
    assert.equal(await utilities.getByRole('button', { name, exact: true }).count(), 1);
  }
  assert.equal(await utilities.getByRole('button', { name: 'Connectors', exact: true }).count(), 0, 'Connectors is available inside Settings');
  assert.equal(await utilities.getByRole('button', { name: /^System design/ }).count(), 0, 'System design has no utility control outside developer mode');
  assert.equal(await page.locator('.system-design').count(), 0, 'System design stays hidden throughout the non-developer journey');
}

async function captureCompact(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => {
    const selectors = ['html', '.app-shell', '.workspace', '.journey-header', '.build-flow', '.review-workspace', '.delivery-workspace', '.development'];
    return selectors.flatMap(selector => [...document.querySelectorAll(selector)]
      .filter(element => element.clientWidth && element.scrollWidth > element.clientWidth + 1)
      .map(element => ({ selector, width: element.clientWidth, content: element.scrollWidth })));
  });
  assert.deepEqual(overflow, [], `${name}: no outer horizontal overflow at the minimum desktop size`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1), false, 'Scrolling stays inside the main work area');
  await assertCompactNavigation(page);
  await page.screenshot({ path: path.join(output, name), scale: 'css', animations: 'disabled' });
}

let app, page, projectId;
try {
  const executablePath = process.env.FLEET_EXECUTABLE;
  app = await electron.launch({ ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }),
    env: { ...process.env, FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: piDir, VITE_DEV_SERVER_URL: '' }, timeout: 45000 });
  page = await app.firstWindow();
  await stubCodexGoalLaunch(app);
  await app.evaluate(({ BrowserWindow, shell }) => {
    const testWindow = BrowserWindow.getAllWindows()[0];
    // Keep this isolated fixture out of the user's foreground workspace while
    // allowing rendering and Playwright actionability checks to keep running.
    testWindow.webContents.setBackgroundThrottling(false);
    testWindow.hide();
    testWindow.setSize(1120, 720);
    shell.showItemInFolder = () => {};
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('.app-shell').waitFor({ timeout: 45000 });

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  assert.equal(await page.getByRole('switch', { name: 'Developer mode', exact: true }).isChecked(), false, 'Developer mode is off by default');
  await page.getByRole('tab', { name: 'Other model providers', exact: true }).click();
  await page.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'New challenge', exact: true }).click();
  const intake = page.getByRole('dialog', { name: 'New challenge', exact: true });
  await intake.getByLabel('Challenge title', { exact: true }).fill('Journey regression fixture');
  await intake.getByLabel(/^Problem statement(?:\s|$)/).fill(qualityFixtureProject.description);
  await intake.getByLabel('Evaluation criteria (optional)', { exact: false }).fill(qualityFixtureProject.criteria.join('\n'));
  await intake.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByText('Challenge saved.', { exact: true }).waitFor();
  const id = await page.evaluate(async () => (await window.fleetHarness.bootstrap()).state.projects[0].id);
  projectId = id;
  const progress = page.getByRole('navigation', { name: 'Challenge progress', exact: true });
  assert.equal(await progress.getByRole('button', { name: 'Brief', exact: true }).getAttribute('aria-current'), 'step');

  await progress.getByRole('button', { name: 'Brief', exact: true }).click();
  await page.getByRole('heading', { name: 'Brief', exact: true }).waitFor();
  await captureCompact(page, 'journey-brief-minimum.png');
  await page.getByRole('button', { name: 'Save brief', exact: true }).click();
  await page.getByText('Brief saved.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Start build', exact: true }).click();
  const start = page.getByRole('dialog', { name: 'Start build', exact: true });
  await start.waitFor();
  assert.match(await start.innerText(), /automatically.*You review the result before delivery/s);
  await start.getByRole('button', { name: 'Start automatic build', exact: true }).click();
  await page.getByRole('button', { name: 'Stop build', exact: true }).waitFor();
  assert.equal(await progress.getByRole('button', { name: 'Build', exact: true }).getAttribute('aria-current'), 'step');
  assert.equal(await progress.getByRole('button', { name: 'Build', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.build-phase-list > li').count(), 5);
  assert.equal(await page.locator('iframe').count(), 0, 'Starting a build stays in its phase view');
  assert.equal(await page.locator('.build-disclosure[open]').count(), 0, 'Activity and technical details start collapsed');
  await captureCompact(page, 'journey-build-minimum.png');

  // Locator waiting uses Node timers, so it also works while the native window
  // is hidden. It observes the same milestone/status the reviewer sees.
  await page.locator('.journey-steps button[aria-current="step"][title^="Review"]')
    .or(page.locator('.journey-message').filter({ hasText: /^Build (?:stopped|needs attention)\./ }))
    .waitFor({ state: 'visible', timeout: 90000 });
  const built = await page.evaluate(async projectId => (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === projectId), id);
  assert.equal(built.status, 'review', built.error);
  assert.equal(built.report.passed, 1);
  assert.equal(built.report.quality.status, 'passed');
  assert.ok(built.logs.some(log => log.text.includes('Starting functional final repair')), 'The automatic repair loop must finish without a user checkpoint');
  assert.equal(await page.locator('.build-flow').isVisible(), true, 'Completion preserves the current Build view until the reviewer continues');
  assert.equal(await progress.getByRole('button', { name: 'Review', exact: true }).getAttribute('aria-current'), 'step');
  await page.getByRole('button', { name: 'Review build', exact: true }).click();
  await page.getByRole('heading', { name: 'Review', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve app', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Request changes', exact: true }).isDisabled(), true, 'Sending a build back requires review comments');

  const reviewNotes = 'Tried the synthetic parser and checked the test evidence. This is a local integration fixture only.';
  const acknowledgment = 'I inspected the application, test evidence, and limitations.';
  await page.getByLabel('Review notes', { exact: true }).fill(reviewNotes);
  await page.getByLabel(acknowledgment, { exact: true }).check();
  await captureCompact(page, 'journey-review-minimum.png');
  await page.getByRole('button', { name: 'Open preview', exact: true }).click();
  const preview = page.frameLocator('iframe[title="Generated application preview"]');
  await preview.getByLabel('Message', { exact: true }).fill('TASK: inspect pump');
  await preview.getByRole('button', { name: 'Parse message', exact: true }).click();
  assert.equal(await preview.locator('#result').textContent(), 'inspect pump');
  assert.equal(await progress.getByRole('button', { name: 'Review', exact: true }).getAttribute('aria-current'), 'step', 'Preview preserves the current review milestone');
  await captureCompact(page, 'journey-preview-minimum.png');
  await page.getByRole('button', { name: 'Review build', exact: true }).click();
  assert.equal(await page.getByLabel('Review notes', { exact: true }).inputValue(), reviewNotes, 'Review notes survive a trip to preview');
  assert.equal(await page.getByLabel(acknowledgment, { exact: true }).isChecked(), true, 'The review acknowledgment survives a trip to preview');
  assert.equal(await page.getByRole('button', { name: 'Approve app', exact: true }).isEnabled(), true);

  await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
  await page.getByRole('heading', { name: 'Activity', exact: true }).waitFor();
  await progress.getByRole('button', { name: 'Review', exact: true }).click();
  assert.equal(await page.getByLabel('Review notes', { exact: true }).inputValue(), reviewNotes, 'Review notes survive an activity inspection');
  assert.equal(await page.getByLabel(acknowledgment, { exact: true }).isChecked(), true);
  await page.reload();
  await page.locator('.app-shell').waitFor();
  await page.getByRole('button', { name: /^Journey regression fixture/ }).click();
  await page.getByRole('heading', { name: 'Review', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Review notes', { exact: true }).inputValue(), reviewNotes, 'Review notes survive a renderer reload');
  assert.equal(await page.getByLabel(acknowledgment, { exact: true }).isChecked(), true, 'The review acknowledgment survives a renderer reload');

  const changeNotes = 'Improve the empty-message guidance so reviewers know to enter a TASK: message before trying again.';
  await page.getByLabel('Review notes', { exact: true }).fill(changeNotes);
  await page.getByLabel(acknowledgment, { exact: true }).uncheck();
  assert.equal(await page.getByRole('button', { name: 'Approve app', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Request changes', exact: true }).isEnabled(), true, 'Changes can be requested without the approval acknowledgment');
  const iterationRequestStart = fixture.requests.length;
  await page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await page.getByRole('button', { name: 'Stop build', exact: true }).waitFor();
  assert.equal(await progress.getByRole('button', { name: 'Build', exact: true }).getAttribute('aria-current'), 'step');
  assert.equal(await progress.getByRole('button', { name: 'Build', exact: true }).getAttribute('aria-pressed'), 'true', 'Sending comments returns the reviewer to Build');
  const rebuilding = await page.evaluate(async projectId => (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === projectId), id);
  assert.notEqual(rebuilding.runId, built.runId, 'A requested iteration starts a distinct build');
  assert.equal(rebuilding.approvedAt, undefined);
  assert.equal(rebuilding.report, undefined, 'The previous report is not current verification evidence');
  const changeRecord = rebuilding.reviewHistory.find(review => review.decision === 'changes_requested' && review.runId === built.runId);
  assert.equal(changeRecord?.feedback, changeNotes, 'The requested changes are saved against the reviewed build');
  assert.equal(changeRecord.nextRunId, rebuilding.runId, 'The review record identifies the resulting iteration');
  await captureCompact(page, 'journey-requested-iteration-minimum.png');

  await page.locator('.journey-steps button[aria-current="step"][title^="Review"]')
    .or(page.locator('.journey-message').filter({ hasText: /^Build (?:stopped|needs attention)\./ }))
    .waitFor({ state: 'visible', timeout: 90000 });
  const iterated = await page.evaluate(async projectId => (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === projectId), id);
  assert.equal(iterated.status, 'review', iterated.error);
  assert.equal(iterated.report.quality.status, 'passed');
  assert.equal(iterated.reviewHistory.find(review => review.id === changeRecord.id)?.feedback, changeNotes, 'Review history survives the completed iteration');
  assert.equal(iterated.description, built.description, 'Requesting changes preserves the original challenge brief');
  assert.ok((await fs.readFile(path.join(iterated.workspace, 'requirements.md'), 'utf8')).includes(changeNotes), 'The iteration saves review comments with its requirements');
  const iterationPrompts = fixture.requests.slice(iterationRequestStart).flatMap(request => request.messages
    .filter(message => message.role === 'user').map(message => typeof message.content === 'string' ? message.content
      : Array.isArray(message.content) ? message.content.map(part => part.text ?? '').join('\n') : JSON.stringify(message.content)));
  assert.ok(iterationPrompts.some(prompt => prompt.includes('You are the implementation agent') && prompt.includes(changeNotes)), 'The implementation agent receives the reviewer’s comments');
  await page.getByRole('button', { name: 'Review build', exact: true }).click();
  await page.getByRole('heading', { name: 'Review', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Review notes', { exact: true }).inputValue(), '', 'The previous build’s notes do not become the new review draft');
  assert.equal(await page.getByLabel(acknowledgment, { exact: true }).isChecked(), false, 'The new build needs a fresh inspection acknowledgment');
  assert.equal(await page.getByRole('button', { name: 'Approve app', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Request changes', exact: true }).isDisabled(), true);
  await page.getByLabel('Review notes', { exact: true }).fill('Inspected the new iteration and its fresh test evidence. Ready for local prototype delivery.');
  await page.getByLabel(acknowledgment, { exact: true }).check();
  await captureCompact(page, 'journey-review-after-iteration-minimum.png');
  await page.getByRole('button', { name: 'Approve app', exact: true }).click();
  await page.getByRole('heading', { name: 'Deliver', exact: true }).waitFor();
  assert.equal(await progress.getByRole('button', { name: 'Deliver', exact: true }).getAttribute('aria-current'), 'step');
  assert.equal(await page.getByRole('button', { name: 'Download app', exact: true }).isEnabled(), true);
  assert.equal(await page.locator('.journey-action .primary').count(), 0, 'The delivery page owns its primary action');
  await captureCompact(page, 'journey-delivery-minimum.png');

  const destination = path.join(root, 'delivery');
  await fs.mkdir(destination);
  await app.evaluate(({ dialog }, directory) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] });
  }, destination);
  await page.getByRole('button', { name: 'Export source & evidence', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Source and evidence saved to' }).waitFor();
  const delivered = await page.evaluate(async projectId => (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === projectId), id);
  assert.equal(delivered.status, 'delivered');
  assert.equal(delivered.reviewHistory.at(-1).decision, 'approved', 'Fresh approval is recorded after the change request');
  assert.equal(delivered.reviewHistory.at(-1).runId, iterated.runId);
  assert.ok(delivered.exportedTo.startsWith(await fs.realpath(destination) + path.sep));
  assert.equal(delivered.executable, undefined, 'Exporting source does not claim a packaged app was downloaded');
  assert.match(await fs.readFile(path.join(delivered.exportedTo, 'DELIVERY.md'), 'utf8'), /1\/1 passed/);
  assert.match(await page.locator('.journey-message').innerText(), /Source and evidence exported/);
  assert.equal(await page.getByRole('heading', { name: 'Your app is saved', exact: true }).count(), 0);
  assert.equal(await page.locator('.executable-path').count(), 0);
  await captureCompact(page, 'journey-source-export-minimum.png');

  await progress.getByRole('button', { name: 'Brief', exact: true }).click();
  await page.getByPlaceholder('Who is affected? What happens today? What outcome would count as success?', { exact: true }).fill('Revise the synthetic message parser to recognize additional task formats and preserve source excerpts.');
  await page.getByRole('button', { name: 'Save brief', exact: true }).click();
  await page.getByText('Brief saved.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Start new build', exact: true }).click();
  await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('.journey-steps button[aria-current="step"][title^="Brief"]').waitFor();
  const revised = await page.evaluate(async challengeId => (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === challengeId), id);
  assert.equal(revised.status, 'draft');
  assert.equal(revised.runId, iterated.runId, 'Editing preserves the previous workspace for inspection');
  assert.equal(revised.report, undefined);
  assert.equal(revised.approvedAt, undefined);
  assert.equal(revised.exportedTo, undefined);
  assert.match(await page.locator('.journey-message').innerText(), /Brief updated.*Start a new build/);
  assert.equal(await page.locator('.build-phase-row.complete').count(), 0, 'Old completed stages do not imply the changed brief was built');
  await page.getByRole('button', { name: 'Preview — generated app', exact: true }).click();
  await page.locator('.previous-build-note').waitFor();
  assert.match(await page.locator('.previous-build-note').innerText(), /do not reflect your updated brief/);
  await progress.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('heading', { name: 'No test evidence yet', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve app', exact: true }).count(), 0);
  await progress.getByRole('button', { name: 'Deliver', exact: true }).click();
  await page.getByRole('heading', { name: 'Nothing to deliver yet', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Download app', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Export source & evidence', exact: true }).count(), 0);
  await captureCompact(page, 'journey-revised-brief-minimum.png');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, automaticBuildAndRepair: true, reviewDraftRetained: true,
    reviewDraftSurvivesReload: true, requestedChangesStartIteration: true, reviewerCommentsReachAgent: true,
    iterationRequiresFreshReview: true, revisedBriefClearsApproval: true,
    approvalToDelivery: true, truthfulSourceExport: true, milestones: 4, utilityEntries: 4, developerModeOff: true,
    minimumWindow: '1120x720', rendererErrors: errors.length, providerRequests: fixture.requests.length, screenshots: output }, null, 2));
} catch (error) {
  if (page && !page.isClosed()) {
    const failure = await page.evaluate(async id => {
      const project = (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === id);
      return { status: project?.status, error: project?.error, stages: project?.stages,
        report: project?.report, logs: project?.logs.slice(-25),
        currentStep: document.querySelector('.journey-steps button[aria-current="step"]')?.getAttribute('title'),
        message: document.querySelector('.journey-message')?.textContent,
        url: location.href, visibility: document.visibilityState,
        headings: [...document.querySelectorAll('h1, h2')].map(element => element.textContent),
        dialogs: [...document.querySelectorAll('dialog[open]')].map(element => element.innerText.slice(0, 2500)),
        buildViewPresent: !!document.querySelector('.build-flow') };
    }, projectId).catch(diagnosticError => ({ diagnosticError: diagnosticError.message }));
    const diagnosticPath = path.join(output, 'journey-failure.json');
    await fs.writeFile(diagnosticPath, JSON.stringify(failure, null, 2));
    await page.screenshot({ path: path.join(output, 'journey-failure.png'), scale: 'css' }).catch(() => {});
    console.error(JSON.stringify({ status: failure.status, error: failure.error, diagnostics: diagnosticPath }));
  }
  throw error;
} finally {
  await app?.close();
  await fixture.close();
  await fs.rm(root, { recursive: true, force: true });
}
