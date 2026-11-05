import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('..', import.meta.url));
const bundle = path.resolve(process.env.APPYARD_DEMO_BUNDLE || path.join(repository, 'output/mailmcp-demo/bundle'));
const evidence = path.resolve(process.env.APPYARD_DEMO_EVIDENCE || path.join(repository, 'output/mailmcp-demo/evidence'));
const executablePath = process.env.FLEET_EXECUTABLE;
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-mailmcp-smoke-'));
const profile = path.join(root, 'profile');
const piDirectory = path.join(root, 'pi');
const checks = [];
const notes = [];
const rendererErrors = [];
const externalRequests = [];
const started = Date.now();
let app, page, frame, previewOrigin, project, bootstrap;

await fs.mkdir(evidence, { recursive: true });
await fs.mkdir(piDirectory, { recursive: true });

async function check(name, work) {
  const start = Date.now();
  try {
    await work();
    checks.push({ name, status: 'passed', durationMs: Date.now() - start });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, status: 'failed', durationMs: Date.now() - start, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function screenshot(name) {
  await page.screenshot({ path: path.join(evidence, `${name}.png`), scale: 'css' });
}

function observeWindow(window) {
  window.on('pageerror', error => rendererErrors.push(error.message));
  window.on('request', request => {
    const address = request.url();
    if (!/^https?:/.test(address)) return;
    const url = new URL(address);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) externalRequests.push(address);
  });
}

try {
  await check('The separate demo launches in a fresh isolated profile', async () => {
    await fs.access(path.join(bundle, 'manifest.json'));
    await fs.access(path.join(bundle, 'seed-project.json'));
    app = await electron.launch({
      ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }),
      cwd: repository,
      env: { ...process.env, APPYARD_DEMO_BUNDLE: bundle, FLEET_USER_DATA: profile, PI_CODING_AGENT_DIR: piDirectory },
      timeout: 60_000,
    });
    app.on('window', observeWindow);
    page = await app.firstWindow();
    observeWindow(page);
    page.setDefaultTimeout(15_000);
    await page.locator('.app-shell').waitFor({ timeout: 60_000 });
    bootstrap = await page.evaluate(() => window.fleetHarness.bootstrap());
    project = bootstrap.state.projects.find(item => item.id === bootstrap.demo?.projectId);
    assert.ok(project, 'The bootstrap must identify the preloaded demo project.');
    assert.equal(bootstrap.storagePath, profile);
    assert.equal(project.demo?.kind, 'mailmcp');
    assert.equal(project.demo?.activity, 'simulated');
    assert.equal(project.demo?.repository, 'https://github.com/shourovsahaaa/mailmcp');
    assert.match(project.demo?.commit ?? '', /^[a-f0-9]{40}$/);
    assert.ok(project.workspace.startsWith(profile + path.sep));
    assert.equal(await app.evaluate(({ app: application }) => application.getName()), 'AppYard Demo');
    notes.push(`Repository commit: ${project.demo.commit}`);
    notes.push(executablePath ? `Installed executable: ${executablePath}` : 'Executable: repository Electron development build');
  });

  await check('Startup selects Build and clearly labels the preloaded demonstration', async () => {
    await page.getByRole('heading', { name: 'Build phases', exact: true }).waitFor();
    await page.getByText('Demo · MailMCP', { exact: true }).waitFor();
    await page.getByText('Simulated agent activity · live local preview', { exact: true }).waitFor();
    assert.match(await page.getByRole('complementary', { name: 'MailMCP demo' }).getAttribute('title'), /simulated/);
    assert.equal(await page.getByLabel('Current challenge', { exact: true }).inputValue(), project.id);
    await screenshot('build');
  });

  await check('The seeded activity includes messages and completed tool records across five build phases', async () => {
    const stages = ['intake', 'research', 'plan', 'build', 'verify'];
    for (const stage of stages) assert.ok(project.logs.some(log => log.stage === stage), `Missing ${stage} demo activity.`);
    assert.ok(project.logs.some(log => log.kind === 'text' && log.text.length > 40), 'Expected substantive agent messages.');
    assert.ok(project.logs.some(log => log.tool?.phase === 'complete'), 'Expected completed tool activity.');
    await page.getByRole('button', { name: 'Agent activity', exact: true }).click();
    await page.getByRole('heading', { name: 'Activity', exact: true }).waitFor();
    assert.ok(await page.locator('.activity-timeline .activity-row').count() >= 5);
    assert.ok(await page.locator('.activity-timeline .activity-row.tool.complete').count() > 0);
    await screenshot('activity');
  });

  await check('View app opens the upstream MailMCP interface with fictional cached mail', async () => {
    await page.getByRole('button', { name: 'View app', exact: true }).click();
    const iframe = page.locator('iframe[title="Generated application preview"]');
    await iframe.waitFor({ timeout: 45_000 });
    frame = await iframe.contentFrame();
    await frame.locator('#global-search').waitFor({ timeout: 45_000 });
    if (await frame.locator('#connect-dialog').evaluate(dialog => dialog.open)) {
      await frame.getByRole('button', { name: 'Continue offline', exact: true }).click();
      notes.push('Dismissed the upstream token dialog using Continue offline.');
    }
    await frame.locator('#mail-list [data-open-message]').first().waitFor();
    previewOrigin = new URL(await iframe.getAttribute('src')).origin;
    assert.equal(new URL(previewOrigin).hostname, '127.0.0.1');
    assert.equal(await frame.locator('#count-all').innerText(), '16');
    assert.match(await frame.locator('#mailbox-eyebrow').innerText(), /FICTIONAL DEMO/);
    await frame.locator('#reader-subject').filter({ hasText: /Cedar workshop/ }).waitFor();
    await screenshot('preview');
  });

  await check('The running local HTTP service confirms demo data without a connected GenAI session', async () => {
    const response = await fetch(`${previewOrigin}/api/bootstrap`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.demo, true);
    assert.equal(result.connection?.connected, false);
    const messages = await fetch(`${previewOrigin}/api/messages?folder=all&view=all&search=&offset=0&limit=50`).then(value => value.json());
    assert.equal(messages.total, 16);
    assert.ok(messages.messages.every(message => message.source === 'demo'));
  });

  await check('Inbox search narrows cached messages using the actual search control', async () => {
    await frame.locator('#global-search').fill('room schedule');
    await frame.locator('#list-mode').filter({ hasText: /MATCHES IN CACHED MAIL/ }).waitFor();
    const rows = await frame.locator('#mail-list [data-open-message]').allTextContents();
    assert.ok(rows.length > 0 && rows.length < 16);
    assert.ok(rows.every(row => /room schedule/i.test(row)), 'Search matches the subject or body excerpt.');
  });

  await check('Opening a search result renders its message body and fictional-data label', async () => {
    await frame.locator('#mail-list [data-open-message]').filter({ hasText: 'Facilities confirmed Conference Room B' }).click();
    await frame.locator('#reader-demo-chip').waitFor();
    assert.match(await frame.locator('#reader-subject').innerText(), /room schedule/);
    assert.match(await frame.locator('#reader-body').innerText(), /Conference Room B/);
    assert.match(await frame.locator('#reader-body').innerText(), /Fictional demo message/);
  });

  await check('Local notes show useful source-grounded context without calling GenAI', async () => {
    await frame.locator('#refresh-brief').click();
    assert.equal(await frame.locator('#brief-title').innerText(), 'Local notes');
    assert.equal(await frame.locator('#brief-mode').innerText(), 'OFFLINE');
    assert.ok(await frame.locator('#brief-content li').count() > 0);
    assert.match(await frame.locator('#brief-content').innerText(), /room|attendee|Thursday/i);
    assert.match(await frame.locator('#brief-footer').innerText(), /no GenAI request/);
  });

  await check('Priority filtering and explanations work on the local inbox', async () => {
    await frame.locator('.favorite-folders [data-folder="all"]').first().click();
    await frame.getByRole('tab', { name: 'Priority', exact: true }).click();
    await frame.locator('.view-order').filter({ hasText: 'By priority' }).waitFor();
    assert.equal(await frame.getByRole('tab', { name: 'Priority', exact: true }).getAttribute('aria-selected'), 'true');
    await frame.locator('#mail-list [data-open-message]').first().click();
    await frame.locator('#priority-explanation').waitFor();
    await frame.locator('#priority-explanation summary').click();
    assert.ok(await frame.locator('#priority-reasons li').count() > 0);
    assert.equal(await frame.locator('#priority-explanation').evaluate(details => details.open), true);
  });

  await check('Reply all opens an editable local draft with recipients and offline guidance', async () => {
    await frame.locator('.reader-toolbar [data-reply="true"]').click();
    await frame.locator('#compose-dialog').waitFor();
    assert.equal(await frame.locator('#compose-title').innerText(), 'Reply all');
    assert.ok((await frame.locator('#draft-to').inputValue()).includes('@example.com'));
    assert.match(await frame.locator('#draft-feedback').innerText(), /fictional demo stays offline/);
  });

  const replyText = 'Hi Jordan,\n\nI have noted Conference Room B and will confirm the attendee count by Thursday. Please keep the current room schedule while we finalize the count.\n\nBest,\nAlex';
  await check('Editing and saving a reply writes the exact draft body to the local service', async () => {
    await frame.locator('#draft-body').fill(replyText);
    assert.equal(await frame.locator('#draft-state').innerText(), 'Unsaved edits');
    await frame.locator('#save-draft').click();
    await frame.locator('#draft-feedback').filter({ hasText: 'Draft saved locally.' }).waitFor();
    assert.equal(await frame.locator('#draft-state').innerText(), 'Saved locally');
    const saved = await fetch(`${previewOrigin}/api/drafts`).then(response => response.json());
    assert.ok(saved.drafts.some(draft => draft.body_text === replyText));
    await screenshot('draft');
  });

  await check('Saved draft contents survive closing and reopening the editor', async () => {
    await frame.locator('#close-compose').click();
    await frame.locator('#compose-dialog').waitFor({ state: 'hidden' });
    await frame.locator('.favorite-folders [data-folder="drafts"]').click();
    await frame.locator('#mail-list [data-open-draft]').first().click();
    await frame.locator('#compose-dialog').waitFor();
    assert.equal(await frame.locator('#draft-body').inputValue(), replyText);
    await frame.locator('#close-compose').click();
    await frame.locator('.favorite-folders [data-folder="all"]').first().click();
    await frame.locator('#mail-list [data-open-message]').first().click();
  });

  await check('The preview cannot access desktop IPC, Node, or the parent document', async () => {
    const access = await frame.locator('body').evaluate(() => ({
      ipc: typeof window.fleetHarness,
      require: typeof window.require,
      parent: (() => { try { void parent.document.body; return 'accessible'; } catch { return 'blocked'; } })(),
    }));
    assert.deepEqual(access, { ipc: 'undefined', require: 'undefined', parent: 'blocked' });
  });

  await check('The app and mail preview fit the supported 1120 × 720 minimum window', async () => {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
    await page.waitForFunction(() => innerWidth <= 1120);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await frame.locator('body').evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await screenshot('minimum');
  });

  await check('The tested flow completes without renderer exceptions or external HTTP requests', async () => {
    assert.deepEqual(rendererErrors, []);
    assert.deepEqual(externalRequests, []);
    assert.equal(await page.locator('.error-banner').count(), 0);
  });
} catch (error) {
  console.error(error);
  if (!checks.some(result => result.status === 'failed')) checks.push({ name: 'Smoke-test execution', status: 'failed', durationMs: 0, error: String(error) });
  await screenshot('failure').catch(() => {});
  await fs.writeFile(path.join(evidence, 'failure-context.txt'), [
    `Error: ${error instanceof Error ? error.stack : String(error)}`,
    'Desktop DOM:', await page?.locator('body').innerText().catch(() => ''),
    'Preview DOM:', await frame?.locator('body').innerText().catch(() => ''),
  ].join('\n\n'));
} finally {
  try { await app?.close(); }
  catch (error) { checks.push({ name: 'Demo closes cleanly', status: 'failed', durationMs: 0, error: String(error) }); }
  await fs.rm(root, { recursive: true, force: true });
  const passed = checks.filter(result => result.status === 'passed').length;
  const failed = checks.filter(result => result.status === 'failed').length;
  const report = {
    time: new Date().toISOString(), command: 'node scripts/smoke-mailmcp-demo.mjs',
    exitCode: failed ? 1 : 0, passed, failed, skipped: 0, total: checks.length,
    output: [
      'Real Electron end-to-end validation of the MailMCP demonstration.',
      'The app contains explicitly simulated agent history; checks below exercise its real local runtime and UI.',
      ...notes, ...checks.map((result, index) => `${index + 1}. ${result.status.toUpperCase()}: ${result.name}${result.error ? `\n   ${result.error}` : ''}`),
      `Renderer exceptions: ${rendererErrors.length}. External HTTP requests observed: ${externalRequests.length}.`,
      'Only local fictional mail and drafts were used. No email was sent or handed off to Outlook.',
    ].join('\n'), durationMs: Date.now() - started, sourceHash: '',
    checks,
  };
  await fs.writeFile(path.join(evidence, 'demo-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed, failed, total: checks.length, evidence }, null, 2));
  process.exitCode = failed ? 1 : 0;
}
