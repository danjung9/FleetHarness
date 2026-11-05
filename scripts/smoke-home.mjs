import { stubCodexGoalLaunch } from './codex-goal-smoke-fixture.mjs';
import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { challenges } from '../dist-electron/harness/catalog.js';
import { starters } from '../dist-electron/shared/types.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-home-'));
const output = path.resolve('output/playwright/home');
await fs.mkdir(output, { recursive: true });
let app;
try {
  // Check the centered welcome layout before creating the returning user's builds.
  const stateDir = path.join(root, 'state');
  await fs.mkdir(stateDir);
  await fs.writeFile(path.join(stateDir, 'state.json'), JSON.stringify({ version: 1, projects: [], settings: { provider: '', model: '', rememberKey: false } }));
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: path.join(root, 'pi') } });
  const page = await app.firstWindow();
  await stubCodexGoalLaunch(app);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('heading', { name: 'AppYard', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.getByRole('navigation', { name: 'Primary', exact: true }).isVisible(), true);
  assert.equal(await page.locator('.home-example').count(), 3);
  assert.equal(await page.locator('.home-mark img').isVisible(), true);
  const centered = await page.evaluate(() => {
    const main = document.querySelector('.home-main').getBoundingClientRect();
    return ['.home-heading h1', '.home-mark'].every(selector => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return Math.abs((box.left + box.width / 2) - (main.left + main.width / 2)) < 10;
    });
  });
  assert.equal(centered, true);
  assert.equal(await page.locator('.home-returning').count(), 0);
  await page.screenshot({ path: path.join(output, 'home-fresh.png'), scale: 'css' });
  await page.evaluate(async starters => {
    for (const starter of starters) await window.fleetHarness.createProject(starter);
  }, starters);
  await page.reload();
  await page.getByRole('region', { name: 'Recent builds', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.home-returning').count(), 1);
  assert.equal(await page.locator('.home-example').count(), 3);
  assert.equal(await page.getByRole('region', { name: 'Recent builds', exact: true }).isVisible(), true);
  assert.equal(await page.locator('.home-recent .home-build-list>button').count(), 3);
  await page.screenshot({ path: path.join(output, 'home-desktop.png'), scale: 'css' });
  await page.getByRole('region', { name: 'Home workspace', exact: true }).getByRole('button', { name: 'New challenge', exact: true }).click();
  assert.equal(await page.getByRole('dialog', { name: 'New challenge', exact: true }).isVisible(), true);
  await page.getByRole('dialog', { name: 'New challenge', exact: true }).getByRole('group', { name: 'Challenge source', exact: true }).getByRole('button', { name: /^Norfolk catalog\b/ }).click();
  await page.getByRole('dialog', { name: 'New challenge', exact: true }).getByText(`${challenges.length} of ${challenges.length} challenges`, { exact: true }).waitFor();
  assert.equal(await page.locator('.catalog-results>button').count(), challenges.length);
  await page.getByPlaceholder('Search title, category, or challenge ID').fill('Paperless');
  assert.equal(await page.locator('.catalog-results>button').count(), 1);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: /^Start a brief: Paperless\. Even underway\./ }).click();
  assert.equal(await page.getByLabel('Challenge title', { exact: true }).inputValue(), 'Paperless Underway');
  assert.match(await page.getByPlaceholder('Who is affected? What happens today? What outcome would count as success?').inputValue(), /offline/i);
  assert.equal(await page.locator('.catalog-results').count(), 0);
  await page.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByRole('heading', { name: 'Build phases', exact: true }).waitFor();
  assert.equal(await page.locator('.run-title h1').textContent(), 'Paperless Underway');
  assert.equal((await page.evaluate(() => window.fleetHarness.bootstrap())).state.projects[0].challengeId, '36');
  await page.screenshot({ path: path.join(output, 'flow-desktop.png'), scale: 'css' });
  await page.getByRole('button', { name: 'Home — challenge portfolio', exact: true }).click();
  await page.getByRole('button', { name: 'My builds 4', exact: true }).click();
  await page.getByLabel('Search your builds', { exact: true }).fill('not-a-real-build-zzz');
  await page.getByRole('heading', { name: 'No builds match that search' }).waitFor();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  assert.equal(await page.locator('.home-build-list>button').count(), 4);
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  assert.equal(await page.locator('.home-example').count(), 3);
  await page.getByRole('button', { name: 'My builds 4', exact: true }).click();
  await page.getByLabel('Search your builds', { exact: true }).fill('Paperless');
  assert.equal(await page.locator('.home-build-list>button').count(), 1);
  await page.locator('.home-build-list>button').click();
  assert.equal(await page.locator('.run-title h1').textContent(), 'Paperless Underway');
  await page.reload();
  await page.getByRole('heading', { name: 'AppYard', exact: true }).waitFor();
  assert.equal((await page.evaluate(() => window.fleetHarness.bootstrap())).state.projects.length, 4);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
  await page.screenshot({ path: path.join(output, 'home-minimum.png'), scale: 'css' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.evaluate(() => {
    const main = document.querySelector('.home-main');
    return main.scrollHeight > main.clientHeight;
  }), false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, centeredBrand: true, recentBuilds: true, threeExamples: true, fullCatalogAccess: true, catalogBriefOpensBuildView: true, reopensProject: true, projectCountPersistsAfterReload: true, rendererErrors: 0, screenshots: output }, null, 2));
} finally {
  await app?.close();
  await fs.rm(root, { recursive: true, force: true });
}
