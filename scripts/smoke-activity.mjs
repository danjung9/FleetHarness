import { chromium } from 'playwright';
import { preview } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { stageDefinitions } from '../dist-electron/shared/types.js';

// Isolated synthetic data: exercises presentation without credentials or a live model.
const output = path.resolve('output/playwright/activity');
await fs.mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: false } });
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const time = '2026-11-04T15:24:00Z';
const logs = [];
function add(kind, text, stage = 'build', tool) {
  logs.push({ id: `log-${logs.length}`, time: new Date(Date.parse(time) + logs.length * 1500).toISOString(), stage, kind, text, ...(tool ? { tool } : {}) });
}
add('info', 'Requirements saved. Ready to plan the implementation.', 'intake');
add('text', '## Implementation plan\nI’ll build a local parser that keeps each extracted task linked to its source.\n\n- Preserve exact source excerpts.\n- Flag ambiguous deadlines for review.\n- Verify the parser with synthetic examples.', 'plan');
add('tool', 'read\n{"path":"requirements.md"}', 'plan');
add('tool', 'read completed\n{"content":[{"type":"text","text":"Extract tasks and deadlines. Keep processing local."}]}', 'plan');
add('text', 'The parser and review interface are ready. I’m checking **empty input** and ambiguous dates before running the test suite.');
add('tool', 'write\n{"path":"index.html","content":"<main>Local message review</main>"}');
add('tool', 'write completed\n{"content":[{"type":"text","text":"Successfully wrote index.html"}]}');
add('tool', 'fleet_validate_messages\n{"source":"synthetic","strict":true}', 'verify');
add('tool', 'fleet_validate_messages completed\n{"content":[{"type":"text","text":"{\\"passed\\":3,\\"failed\\":0,\\"checks\\":[\\"Empty message\\",\\"Source excerpt\\",\\"Ambiguous date\\"]}"}]}', 'verify');
add('tool', 'bash\n{"command":"node --test parser.test.cjs"}', 'verify');
add('error', 'bash failed\n{"content":[{"type":"text","text":"Ambiguous date check failed: expected a review flag for \\\"next Friday\\\"."}]}', 'verify');
add('info', 'Verification failed. Starting one Pi repair attempt.', 'verify');
add('tool', 'edit\n{"path":"parser.js","oldText":"return date;","newText":"return { date, needsReview: true };"}', 'verify');
add('tool', 'edit completed\n{"content":[{"type":"text","text":"Updated ambiguity handling in parser.js."}]}', 'verify');
add('text', 'The repair is complete. Re-running the date checks now.', 'verify');
add('tool', 'bash\n{"command":"node --test parser.test.cjs"}', 'verify');
const project = { id: 'activity-fixture', title: 'Operational-message parser · UI fixture', description: 'Synthetic activity for verifying the agent interface. No hosted model was used.', criteria: ['Preserve source excerpts.', 'Flag ambiguous dates.'], status: 'running', createdAt: time, updatedAt: time, stages: stageDefinitions.map(s => ({ ...s, status: ['intake', 'research', 'plan', 'build'].includes(s.id) ? 'complete' : s.id === 'verify' ? 'active' : 'queued' })), logs, feedback: '', model: 'local-ui-fixture' };
const state = { version: 1, projects: [project], settings: { provider: '', model: '', rememberKey: false } };
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 }, reducedMotion: 'reduce' });
  await context.addInitScript(state => {
    let current = state;
    const listeners = new Set();
    window.fleetHarness = {
      bootstrap: async () => ({ state: current, models: [], storagePath: 'UI fixture', credentialStatus: 'Fixture only', runtime: 'UI fixture' }),
      onState: fn => { listeners.add(fn); return () => listeners.delete(fn); },
      preview: async () => null,
      artifacts: async () => []
    };
    window.updateActivityFixture = next => { current = next; for (const fn of listeners) fn(next); };
  }, state);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'Agents — coding sessions', exact: true }).click();
  await page.locator('.activity-timeline').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.activity-row.tool').count(), 6, 'Start/result pairs must render once');
  assert.equal(await page.locator('.activity-state.running').count(), 1);
  const scroll = page.locator('.activity-scroll');
  await scroll.evaluate(el => { el.scrollTop = 0; });
  await page.getByRole('button', { name: 'Jump to latest' }).waitFor();
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Tools 6', exact: true }).click();
  const write = page.locator('.activity-action').filter({ hasText: 'Write file' });
  await write.locator(':scope > summary').click();
  assert.equal(await write.getByText('Successfully wrote index.html', { exact: true }).isVisible(), true);
  assert.equal(await write.locator('.activity-data dt').first().textContent(), 'Path');
  await write.locator('.activity-original > summary').click();
  assert.match(await write.locator('.activity-original').innerText(), /"content"/);
  await write.locator('.activity-original > summary').click();
  await page.getByRole('button', { name: 'Issues 1', exact: true }).click();
  assert.equal(await page.locator('.activity-row').count(), 1);
  assert.equal(await page.getByText('Error details', { exact: true }).isVisible(), true);
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'All activity 11', exact: true }).click();
  await page.getByLabel('Filter activity by stage').selectOption('plan');
  assert.equal(await page.locator('.activity-row').count(), 2);
  await page.getByLabel('Filter activity by stage').selectOption('all');
  await page.getByRole('button', { name: 'Tools 6', exact: true }).click();
  const structured = page.locator('.activity-action').filter({ hasText: 'Validate messages' });
  await structured.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await structured.getByText('Passed', { exact: true }).isVisible(), true);
  await structured.getByText('Passed', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'result.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1120, height: 720 });
  await structured.getByText('Passed', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'minimum.png'), fullPage: true, animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await scroll.evaluate(el => el.scrollWidth > el.clientWidth), false);
  await page.getByRole('button', { name: 'All activity 11', exact: true }).click();
  await page.getByRole('button', { name: 'Preview — development workspace', exact: true }).click();
  await page.locator('.session-panel .activity-feed').waitFor();
  await page.screenshot({ path: path.join(output, 'sidebar.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Flow — build pipeline', exact: true }).click();
  await page.getByRole('button', { name: 'Test: In progress', exact: true }).click();
  await page.locator('.inspector .activity-feed').waitFor();
  assert.equal(await page.locator('.inspector .activity-row').count(), 4);
  await page.screenshot({ path: path.join(output, 'inspector.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Agents — coding sessions', exact: true }).click();
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.getByRole('button', { name: 'Jump to latest' }).click().catch(() => {});
  await scroll.evaluate(el => { el.scrollTop = 0; });
  await page.getByRole('button', { name: 'Jump to latest' }).waitFor();
  const before = await scroll.evaluate(el => el.scrollTop);
  add('text', 'A new streamed message should not move the reader.', 'verify');
  await page.evaluate(state => window.updateActivityFixture(state), state);
  await page.waitForFunction(() => document.querySelector('.activity-timeline')?.textContent.includes('A new streamed message'));
  assert.equal(await scroll.evaluate(el => el.scrollTop), before, 'Streaming must respect a reader scrolled away from the bottom');
  project.status = 'stopped';
  await page.evaluate(state => window.updateActivityFixture(state), state);
  await page.locator('.activity-state.interrupted').waitFor();
  assert.equal(await page.locator('.activity-state.running').count(), 0);
  await page.getByRole('button', { name: 'Issues 2', exact: true }).click();
  assert.equal(await page.locator('.activity-row').count(), 2);
  await page.getByRole('button', { name: /^All activity/ }).click();
  const longPath = 'src/' + 'very-long-directory/'.repeat(30) + 'parser.ts';
  project.logs = [{ id: 'long', time, stage: 'build', kind: 'tool', text: `write\n{"path":${JSON.stringify(longPath)},"content":"<script>window.untrusted=true</script>"}` }];
  await page.evaluate(state => window.updateActivityFixture(state), state);
  await page.getByTitle(longPath, { exact: true }).waitFor();
  await page.locator('.activity-action > summary').click();
  assert.equal(await scroll.evaluate(el => el.scrollWidth > el.clientWidth), false);
  assert.equal(await page.evaluate(() => window.untrusted), undefined);
  project.logs = []; project.status = 'draft';
  project.stages = structuredClone(stageDefinitions);
  await page.evaluate(state => window.updateActivityFixture(state), state);
  await page.getByText('No activity yet', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, 'empty.png'), fullPage: true, animations: 'disabled' });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, pairedTools: true, filters: true, keyboardDisclosure: true, structuredResults: true, rawRecords: true, liveScroll: true, interruptedRun: true, longPaths: true, safeText: true, emptyState: true, screenshots: output }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
