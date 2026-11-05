import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

// Exercise real Electron, preload, intake and pushed renderer state. Replace the
// goal runner only: no model credentials, provider calls or Terminal are used.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-codex-goal-ui-'));
const stateRoot = path.join(root, 'state');
const output = path.resolve('output/playwright/codex-goal-smoke');
await fs.mkdir(output, { recursive: true });
let app, page;
const errors = [];
const project = id => page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id), id);
const push = changes => app.evaluate((_electron, changes) => globalThis.__fleetCodexGoalSmoke.push(changes), changes);
async function capture(name, width, height) {
  await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setContentSize(...size), [width, height]);
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => ['html', '.workspace', '.codex-goal-panel', '.codex-goal-log'].flatMap(selector => [...document.querySelectorAll(selector)]
    .filter(element => element.clientWidth && element.scrollWidth > element.clientWidth + 1).map(() => selector)));
  assert.deepEqual(overflow, [], `${name}: no horizontal overflow`);
  await page.screenshot({ path: path.join(output, name + '.png'), scale: 'css', animations: 'disabled' });
}

try {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: stateRoot,
    PI_CODING_AGENT_DIR: path.join(root, 'pi'), CODEX_HOME: path.join(root, 'codex'), VITE_DEV_SERVER_URL: '' }, timeout: 45000 });
  page = await app.firstWindow();
  await app.evaluate(async ({ BrowserWindow, ipcMain }, directory) => {
    const fs = process.getBuiltinModule('node:fs').promises;
    const path = process.getBuiltinModule('node:path');
    const window = BrowserWindow.getAllWindows()[0];
    window.webContents.setBackgroundThrottling(false); window.hide(); window.setContentSize(1120, 720);
    const fixture = globalThis.__fleetCodexGoalSmoke = { failNext: true, delayNext: false, releaseLaunch: null, launches: [], opened: [], stopped: [], state: null, projectId: null };
    fixture.push = changes => {
      const project = fixture.state.projects.find(item => item.id === fixture.projectId);
      Object.assign(project.codexGoal, changes, { updatedAt: new Date().toISOString() });
      window.webContents.send('fleet:state', fixture.state);
    };
    ipcMain.removeHandler('fleet:codex-goal:launch');
    ipcMain.handle('fleet:codex-goal:launch', async (_event, id) => {
      // Read real saved input so the fixture fails if launch races persistence.
      const state = JSON.parse(await fs.readFile(path.join(directory, 'state.json'), 'utf8'));
      const project = state.projects.find(project => project.id === id);
      if (!project) throw new Error('The brief must be saved before starting Codex.');
      fixture.state = state; fixture.projectId = id;
      fixture.launches.push({ id, description: project.description, dataInputs: project.dataInputs });
      const launch = { id: `fixture-${fixture.launches.length}`, workspace: path.join(directory, 'fixture-goals', `goal-${fixture.launches.length}`),
        createdAt: new Date().toISOString(), status: fixture.failNext ? 'failed' : 'prepared', activity: [] };
      await fs.mkdir(launch.workspace, { recursive: true });
      if (fixture.failNext) { fixture.failNext = false; launch.error = 'Fixture Codex sign-in is unavailable. Sign in using Codex CLI and retry.'; }
      project.codexGoal = launch;
      fixture.push({});
      if (launch.status === 'failed') throw new Error(launch.error);
      if (fixture.delayNext) {
        fixture.delayNext = false;
        await new Promise(resolve => { fixture.releaseLaunch = resolve; });
        fixture.releaseLaunch = null;
      }
      return launch;
    });
    ipcMain.removeHandler('fleet:codex-goal:stop');
    ipcMain.handle('fleet:codex-goal:stop', (_event, id) => { fixture.stopped.push(id); fixture.push({ status: 'stopping' }); });
    ipcMain.removeHandler('fleet:codex-goal:open');
    ipcMain.handle('fleet:codex-goal:open', (_event, id) => { fixture.opened.push(id); });
  }, stateRoot);
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('.app-shell').waitFor({ timeout: 45000 });
  const initial = await page.evaluate(() => window.fleetHarness.bootstrap());
  assert.equal(initial.state.settings.provider, '');
  assert.equal(initial.state.settings.model, '');
  await page.getByRole('region', { name: 'Home workspace', exact: true }).getByRole('button', { name: 'New challenge', exact: true }).click();
  const intake = page.getByRole('dialog', { name: 'New challenge', exact: true });
  await intake.getByLabel('Challenge title', { exact: true }).fill('Schedule viewer');
  await intake.getByPlaceholder('Who is affected? What happens today? What outcome would count as success?', { exact: true }).fill('Build a schedule viewer with local edits and a working export button.');
  await intake.getByRole('button', { name: 'Paste data', exact: true }).click();
  await intake.getByLabel('Input name', { exact: true }).fill('schedule.csv');
  await intake.getByLabel('Input content', { exact: true }).fill('task,time\nInspect pump,09:00\n');
  await intake.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByText('Challenge saved.', { exact: true }).waitFor();
  assert.equal(await intake.count(), 0);
  assert.equal(await app.evaluate(() => globalThis.__fleetCodexGoalSmoke.launches.length), 0, 'Saving never launches Codex');
  await page.getByRole('button', { name: 'Start Codex build', exact: true }).waitFor();
  assert.match(await page.locator('.codex-goal-copy').innerText(), /full access to files, commands, and the network/);
  assert.equal(await page.locator('.codex-goal-status').count(), 0);
  const saved = (await page.evaluate(() => window.fleetHarness.bootstrap())).state.projects[0];
  assert.equal(saved.title, 'Schedule viewer');
  assert.equal(saved.status, 'draft');
  assert.equal(saved.runId, undefined);
  assert.equal(saved.report, undefined);
  assert.equal(saved.dataInputs[0].content, 'task,time\nInspect pump,09:00\n');
  const persisted = JSON.parse(await fs.readFile(path.join(stateRoot, 'state.json'), 'utf8')).projects.find(project => project.id === saved.id);
  assert.equal(persisted.title, saved.title, 'Draft persisted before launch');

  await page.getByRole('button', { name: 'Start Codex build', exact: true }).click();
  await page.locator('.codex-goal-error').filter({ hasText: 'Fixture Codex sign-in is unavailable.' }).waitFor();
  assert.equal((await project(saved.id)).description, saved.description, 'Failed launch preserves brief');
  await page.getByRole('button', { name: 'Dismiss error', exact: true }).click();
  await capture('failed-minimum', 1120, 720);
  await app.evaluate(() => { globalThis.__fleetCodexGoalSmoke.delayNext = true; });
  await page.getByRole('button', { name: 'Retry Codex build', exact: true }).click();
  await page.locator('.codex-goal-status').filter({ hasText: 'Preparing build' }).waitFor();
  await page.getByText('Preparing the workspace and starting Codex…', { exact: true }).waitFor();
  assert.equal(await app.evaluate(() => typeof globalThis.__fleetCodexGoalSmoke.releaseLaunch), 'function', 'Launch IPC remains unresolved during preparation');
  assert.equal(await page.getByRole('button', { name: 'Stop Codex build', exact: true }).isEnabled(), true, 'Stop is available while launch IPC is pending');
  await page.getByRole('button', { name: 'Stop Codex build', exact: true }).click();
  await page.locator('.codex-goal-status').filter({ hasText: 'Stopping' }).waitFor();
  await push({ status: 'stopped', finishedAt: new Date().toISOString() });
  await app.evaluate(() => globalThis.__fleetCodexGoalSmoke.releaseLaunch());
  await page.locator('.codex-goal-status').filter({ hasText: 'Stopped' }).waitFor();
  await page.getByRole('button', { name: 'Start new Codex build', exact: true }).click();
  await page.locator('.codex-goal-status').filter({ hasText: 'Preparing build' }).waitFor();
  assert.equal(await page.locator('.build-flow').count(), 0, 'The running goal replaces idle pipeline phases');
  assert.equal(await page.locator('.journey-action button').count(), 0, 'No conflicting pipeline launch is offered');
  const at = new Date().toISOString();
  await push({ status: 'running', activity: [
    { id: 'plan', at, kind: 'message', text: 'I’m building a schedule viewer with editable tasks and CSV export.' },
    { id: 'files', at, kind: 'file', text: 'Updated src/Schedule.tsx\nUpdated src/export.ts', status: 'completed' },
    { id: 'test', at, kind: 'command', text: 'npm test\nRunning schedule editing and CSV export checks…', status: 'running' }
  ] });
  await page.getByRole('log', { name: 'Codex activity', exact: true }).getByText('Command · Running', { exact: true }).waitFor();
  await capture('running-minimum', 1120, 720);
  await capture('running-desktop', 1512, 982);

  await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Brief', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Save brief', exact: true }).isDisabled(), true, 'Live goal prevents brief save');
  assert.equal(await page.getByLabel('Challenge title', { exact: true }).isDisabled(), true, 'Live goal prevents editing');
  assert.equal(await page.getByRole('button', { name: 'Stop Codex build', exact: true }).isEnabled(), true, 'Journey Stop is available when viewing the brief');
  await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Build', exact: true }).click();
  await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
  await page.getByRole('log', { name: 'Codex activity', exact: true }).getByText('Files · Completed', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Stop Codex build', exact: true }).click();
  await page.locator('.codex-goal-status').filter({ hasText: 'Stopping' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Stopping…', exact: true }).isDisabled(), true);
  await push({ status: 'stopped', finishedAt: new Date().toISOString() });
  await page.locator('.codex-goal-status').filter({ hasText: 'Stopped' }).waitFor();
  assert.match(await page.getByRole('log', { name: 'Codex activity', exact: true }).innerText(), /npm test/, 'Stop keeps activity');
  await page.getByRole('button', { name: 'Open goal folder', exact: true }).click();
  assert.deepEqual(await app.evaluate(() => globalThis.__fleetCodexGoalSmoke.stopped), [saved.id, saved.id]);
  assert.deepEqual(await app.evaluate(() => globalThis.__fleetCodexGoalSmoke.opened), [saved.id]);

  await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Brief', exact: true }).click();
  const updatedDescription = saved.description + ' Include search by task name.';
  await page.getByPlaceholder('Who is affected? What happens today? What outcome would count as success?', { exact: true }).fill(updatedDescription);
  await page.getByRole('button', { name: 'Save brief', exact: true }).click();
  await page.getByText('Brief saved.', { exact: true }).waitFor();
  assert.equal((await project(saved.id)).description, updatedDescription);
  assert.equal(await app.evaluate(() => globalThis.__fleetCodexGoalSmoke.launches.length), 3, 'Editing never launches Codex');
  await page.getByRole('button', { name: 'Start Codex build', exact: true }).click();
  await page.locator('.codex-goal-status').filter({ hasText: 'Preparing build' }).waitFor();
  const finalCalls = await app.evaluate(() => globalThis.__fleetCodexGoalSmoke.launches);
  assert.equal(finalCalls.length, 4);
  assert.equal(finalCalls.at(-1).description, updatedDescription, 'Updated brief reaches runner after save');
  await push({ status: 'completed', finishedAt: new Date().toISOString(), activity: [
    { id: 'test', at, kind: 'command', text: 'npm test\n✓ task editing\n✓ task search\n✓ CSV export\n3 tests passed', status: 'completed' },
    { id: 'result', at, kind: 'message', text: 'The schedule viewer is ready. Run npm start in the goal folder. Editing, search and CSV export checks passed.' }
  ] });
  await page.locator('.codex-goal-status').filter({ hasText: 'Codex completed' }).waitFor();
  assert.equal((await project(saved.id)).status, 'draft', 'Codex completion never claims pipeline verification');
  await capture('completed-minimum', 1120, 720);
  await page.locator('.codex-goal-details summary').click();
  assert.match(await page.locator('.codex-goal-details').innerText(), /independent pipeline verification and delivery gates do not run/);
  await push({ status: 'blocked', error: 'Provide the expected input format in the brief before trying again.' });
  await page.locator('.codex-goal-status').filter({ hasText: 'Needs attention' }).waitFor();
  await page.getByRole('button', { name: 'Retry Codex build', exact: true }).waitFor();
  await push({ status: 'failed', error: 'A command may still be running.', processScope: { marker: 'fixture', cleanup: 'unconfirmed' } });
  await page.getByRole('button', { name: 'Stop Codex build', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Retry Codex build', exact: true }).count(), 0, 'Unconfirmed cleanup permits stop retry, not a conflicting launch');
  await push({ status: 'opened', processScope: undefined });
  await page.locator('.codex-goal-status').filter({ hasText: 'Earlier Terminal session' }).waitFor();
  assert.match(await page.locator('.codex-goal-copy').innerText(), /Start a new build to follow Codex progress here/);
  await page.reload(); await page.locator('.app-shell').waitFor();
  assert.equal(await app.evaluate(() => globalThis.__fleetCodexGoalSmoke.launches.length), 4, 'Reload never launches Codex');
  assert.equal((await project(saved.id)).description, updatedDescription);
  assert.equal((await project(saved.id)).runId, undefined);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, mockedGoalRunnerOnly: true, noModelConfiguration: true, saveDoesNotLaunch: true,
    pushedMessagesCommandsFiles: true, pendingRunningCompletedStoppedBlockedFailed: true, stop: true, openFolder: true,
    activeGoalLocksBriefAndPipeline: true, stopDuringPendingLaunch: true, cleanupRetry: true, legacyHandoff: true, editedBriefSavedBeforeLaunch: true,
    rendererErrors: 0, screenshots: output }, null, 2));
} finally {
  await app?.close();
  await fs.rm(root, { recursive: true, force: true });
}
