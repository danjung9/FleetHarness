import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

// Exercise real Electron, preload, intake and persistence, replacing only the
// external CLI handoff. No provider fixture, credentials or Terminal is used.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-codex-goal-ui-'));
const stateRoot = path.join(root, 'state');
const output = path.resolve('output/playwright/codex-goal-smoke');
await fs.mkdir(output, { recursive: true });
let app, page;
const errors = [];
const project = id => page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id), id);
async function capture(name, width, height) {
  await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setContentSize(...size), [width, height]);
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => ['html', '.workspace', '.codex-goal-panel'].flatMap(selector => [...document.querySelectorAll(selector)]
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
    const fixture = globalThis.__fleetCodexGoalSmoke = { failNext: true, launches: [], opened: [] };
    ipcMain.removeHandler('fleet:codex-goal:launch');
    ipcMain.handle('fleet:codex-goal:launch', async (event, id) => {
      // Read only real saved inputs. The fixture fails if launch races persistence.
      const state = JSON.parse(await fs.readFile(path.join(directory, 'state.json'), 'utf8'));
      const project = state.projects.find(project => project.id === id);
      if (!project) throw new Error('The brief must be saved before opening Codex.');
      fixture.launches.push({ id, description: project.description, dataInputs: project.dataInputs });
      const launch = { id: `fixture-${fixture.launches.length}`, workspace: path.join(directory, 'fixture-goals', `goal-${fixture.launches.length}`),
        createdAt: new Date().toISOString(), status: fixture.failNext ? 'failed' : 'opened' };
      await fs.mkdir(launch.workspace, { recursive: true });
      if (fixture.failNext) { fixture.failNext = false; launch.error = 'Fixture Terminal unavailable. Your brief and goal folder are saved. Try again.'; }
      project.codexGoal = launch;
      // Let the real create/update notification settle, then publish this
      // renderer-only handoff state; backend persistence has separate unit tests.
      await new Promise(resolve => setTimeout(resolve, 150));
      event.sender.send('fleet:state', state);
      if (launch.status === 'failed') throw new Error(launch.error);
      return launch;
    });
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
  await intake.getByLabel('Challenge title', { exact: true }).fill('Codex goal handoff fixture');
  await intake.getByPlaceholder('Who is affected? What happens today? What outcome would count as success?', { exact: true }).fill('Build a schedule viewer with local edits and a working export button.');
  await intake.getByRole('button', { name: 'Paste data', exact: true }).click();
  await intake.getByLabel('Input name', { exact: true }).fill('schedule.csv');
  await intake.getByLabel('Input content', { exact: true }).fill('task,time\nInspect pump,09:00\n');
  await intake.getByRole('button', { name: 'Save & open Codex', exact: true }).click();
  await page.locator('.codex-goal-error').filter({ hasText: 'Fixture Terminal unavailable.' }).waitFor();
  assert.equal(await intake.count(), 0, 'Failed launch closes intake after saving the draft');
  const saved = (await page.evaluate(() => window.fleetHarness.bootstrap())).state.projects[0];
  assert.equal(saved.title, 'Codex goal handoff fixture');
  assert.equal(saved.status, 'draft');
  assert.equal(saved.runId, undefined);
  assert.equal(saved.report, undefined);
  assert.equal(saved.dataInputs[0].content, 'task,time\nInspect pump,09:00\n');
  const persisted = JSON.parse(await fs.readFile(path.join(stateRoot, 'state.json'), 'utf8')).projects.find(project => project.id === saved.id);
  assert.equal(persisted.title, saved.title, 'Launch failure preserves the actual saved brief');
  await capture('failed-minimum', 1120, 720);

  await page.getByRole('button', { name: 'Try again in Terminal', exact: true }).click();
  await page.locator('.codex-goal-status').filter({ hasText: 'Opened in Terminal' }).waitFor();
  assert.equal((await project(saved.id)).status, 'draft', 'External handoff does not claim a completed pipeline');
  await page.getByRole('button', { name: 'Open goal folder', exact: true }).click();
  const calls = await app.evaluate(() => globalThis.__fleetCodexGoalSmoke);
  assert.equal(calls.launches.length, 2);
  assert.deepEqual(calls.launches.map(call => call.id), [saved.id, saved.id]);
  assert.deepEqual(calls.opened, [saved.id]);
  assert.equal(calls.launches[0].dataInputs[0].content, saved.dataInputs[0].content);
  await capture('opened-minimum', 1120, 720);
  await capture('opened-desktop', 1512, 982);

  await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Brief', exact: true }).click();
  const updatedDescription = saved.description + ' Include search by task name.';
  await page.getByPlaceholder('Who is affected? What happens today? What outcome would count as success?', { exact: true }).fill(updatedDescription);
  await page.getByRole('button', { name: 'Save & open Codex', exact: true }).click();
  await page.getByText('Brief saved. Codex opened in Terminal.', { exact: true }).waitFor();
  assert.equal((await project(saved.id)).description, updatedDescription);
  const finalCalls = await app.evaluate(() => globalThis.__fleetCodexGoalSmoke.launches);
  assert.equal(finalCalls.length, 3);
  assert.equal(finalCalls.at(-1).description, updatedDescription, 'Edited brief reaches the handoff only after it is saved');
  await page.reload(); await page.locator('.app-shell').waitFor();
  assert.equal((await project(saved.id)).description, updatedDescription);
  assert.equal((await project(saved.id)).runId, undefined);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, mockedHandoffOnly: true, noModelConfiguration: true, saveBeforeLaunch: true,
    failurePreservesBrief: true, retry: true, openFolder: true, editedBriefSavedBeforeLaunch: true, rendererErrors: 0, screenshots: output }, null, 2));
} finally {
  await app?.close();
  await fs.rm(root, { recursive: true, force: true });
}
