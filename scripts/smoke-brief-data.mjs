import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { startFixtureProvider } from './mock-provider.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-brief-data-ui-'));
const output = path.resolve('output/playwright/brief-data');
await fs.mkdir(output, { recursive: true });
const piDir = path.join(root, 'pi');
await fs.mkdir(piDir);
const fixture = await startFixtureProvider();
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: { 'fleet-fixture': {
  baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
  models: [{ id: 'fixture-model', name: 'Brief data fixture', reasoning: false, input: ['text'],
    contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }]
} } }));
const fileContent = 'message\r\nTASK: inspect pump\r\n';
const file = path.join(root, 'messages.csv');
await fs.writeFile(file, fileContent);
const readProject = (page, id) => page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id), id);
async function waitBuild(page, id) {
  for (let attempt = 0; attempt < 900; attempt++) {
    const project = await readProject(page, id);
    if (project.status !== 'running') { assert.equal(project.status, 'review', project.error); return project; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.fail('The local fixture build did not complete within 90 seconds.');
}
async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.screenshot({ path: path.join(output, name), scale: 'css', animations: 'disabled' });
}

let app, page;
try {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: path.join(root, 'state'),
    PI_CODING_AGENT_DIR: piDir, VITE_DEV_SERVER_URL: '' }, timeout: 45000 });
  page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.webContents.setBackgroundThrottling(false); window.hide(); window.setSize(1120, 720);
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('.app-shell').waitFor({ timeout: 45000 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: 'Pi Model providers' }).check();
  await page.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'New challenge', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New challenge', exact: true });
  await dialog.getByLabel('Challenge title', { exact: true }).fill('Connected inputs regression');
  await dialog.getByLabel(/^Problem statement(?:\s|$)/).fill('Create a local message parser to inspect a task and retain source context.');
  await dialog.getByLabel('Attach data files', { exact: true }).setInputFiles(file);
  await dialog.getByRole('button', { name: 'Paste data', exact: true }).click();
  await dialog.getByLabel('Input name', { exact: true }).fill('task-notes.txt');
  await dialog.getByLabel('Input content', { exact: true }).fill('  TASK: check valve\n');
  await dialog.getByRole('button', { name: 'Add input', exact: true }).click();
  await dialog.getByRole('button', { name: 'Paste data', exact: true }).click();
  await dialog.getByLabel('Input name', { exact: true }).fill('pending-notes.txt');
  await dialog.getByLabel('Input content', { exact: true }).fill('TASK: check gauge\n');
  await dialog.getByRole('button', { name: /^Norfolk catalog · / }).click();
  await dialog.getByRole('button', { name: 'Custom problem', exact: true }).click();
  assert.equal(await dialog.getByLabel('Input name', { exact: true }).inputValue(), 'pending-notes.txt');
  assert.equal(await dialog.getByLabel('Input content', { exact: true }).inputValue(), 'TASK: check gauge\n');
  assert.equal(await dialog.getByRole('list', { name: 'Connected data inputs', exact: true }).getByRole('listitem').count(), 2);
  await dialog.getByRole('heading', { name: 'Data & inputs', exact: true }).scrollIntoViewIfNeeded();
  await screenshot(page, 'intake-connected-minimum.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1512, 982));
  await screenshot(page, 'intake-connected-desktop.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
  // Saving the brief also saves the visibly pending paste, without a separate Add click.
  await dialog.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByText('Challenge saved.', { exact: true }).waitFor();
  const id = await page.evaluate(async () => (await window.fleetHarness.bootstrap()).state.projects[0].id);
  const expected = [
    { name: 'messages.csv', kind: 'file', content: fileContent },
    { name: 'task-notes.txt', kind: 'text', content: '  TASK: check valve\n' },
    { name: 'pending-notes.txt', kind: 'text', content: 'TASK: check gauge\n' }
  ];
  assert.deepEqual((await readProject(page, id)).dataInputs, expected);

  await page.reload(); await page.locator('.app-shell').waitFor();
  await page.getByRole('button', { name: /^Connected inputs regression/ }).click();
  const progress = page.getByRole('navigation', { name: 'Challenge progress', exact: true });
  await progress.getByRole('button', { name: 'Brief', exact: true }).click();
  const inputs = page.getByRole('list', { name: 'Connected data inputs', exact: true });
  assert.equal(await inputs.getByRole('listitem').count(), 3);
  assert.deepEqual((await readProject(page, id)).dataInputs, expected);
  await page.getByRole('heading', { name: 'Data & inputs', exact: true }).scrollIntoViewIfNeeded();
  await screenshot(page, 'brief-connected-minimum.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1512, 982));
  await screenshot(page, 'brief-connected-desktop.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
  await page.getByRole('button', { name: 'Save & start build', exact: true }).click();
  await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Start automatic build', exact: true }).click();
  const provided = await waitBuild(page, id);
  await assert.rejects(fs.access(path.join(provided.workspace, 'data/synthetic-data.json')), /ENOENT/);
  assert.equal(await fs.readFile(path.join(provided.workspace, 'inputs/001-messages.csv'), 'utf8'), fileContent);
  await page.getByRole('button', { name: 'Preview — generated app', exact: true }).click();
  await page.frameLocator('iframe[title="Generated application preview"]').getByRole('button', { name: 'Parse message', exact: true }).waitFor();
  await screenshot(page, 'preview-provided-minimum.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1512, 982));
  await screenshot(page, 'preview-provided-desktop.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));

  await progress.getByRole('button', { name: 'Brief', exact: true }).click();
  for (const input of expected) await page.getByRole('button', { name: `Remove ${input.name}`, exact: true }).click();
  await page.getByRole('heading', { name: 'Data & inputs', exact: true }).scrollIntoViewIfNeeded();
  await screenshot(page, 'brief-synthetic-minimum.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1512, 982));
  await screenshot(page, 'brief-synthetic-desktop.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
  await page.getByRole('button', { name: 'Save & start new build', exact: true }).click();
  await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Start automatic build', exact: true }).click();
  const synthetic = await waitBuild(page, id);
  assert.deepEqual(synthetic.dataInputs, []);
  assert.notEqual(synthetic.workspace, provided.workspace);
  assert.equal(JSON.parse(await fs.readFile(path.join(synthetic.workspace, 'data/synthetic-data.json'), 'utf8')).classification, 'synthetic');
  assert.ok(synthetic.logs.some(log => /synthetic data/i.test(log.text)));
  assert.deepEqual(errors, []);
  await fs.rm(path.join(output, 'failure.png'), { force: true });
  await fs.rm(path.join(output, 'failure.json'), { force: true });
  console.log(JSON.stringify({ passed: true, uploadedAndPastedInputs: true, pendingPasteSaved: true,
    pendingPasteSurvivesSourceSwitch: true, persistedAfterReload: true, suppliedDataSkipsSpecialist: true, removalTriggersSpecialist: true,
    rendererErrors: 0, screenshots: output }, null, 2));
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), scale: 'css' }).catch(() => {});
    await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify(await page.evaluate(async () => ({
      labels: [...document.querySelectorAll('dialog label')].map(label => label.textContent),
      projects: (await window.fleetHarness.bootstrap()).state.projects.map(project => ({ id: project.id, status: project.status, error: project.error }))
    })), null, 2)).catch(() => {});
  }
  throw error;
} finally {
  await app?.close(); await fixture.close(); await fs.rm(root, { recursive: true, force: true });
}
