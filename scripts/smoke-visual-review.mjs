import { chromium, _electron as electron } from 'playwright';
import { createServer } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { stageDefinitions } from '../dist-electron/shared/types.js';
import { isVisualReviewReport } from '../dist-electron/shared/visual-review.js';
import { Store } from '../dist-electron/electron/storage.js';

// Deterministic synthetic evidence. These screenshots test this UI, not a hosted model's judgment.
const output = path.resolve('output/playwright/visual-review');
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-visual-ui-')));
await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: false } });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const time = '2026-11-05T16:20:00Z';
const hash = value => createHash('sha256').update(value).digest('hex');
const originalHash = hash('synthetic-original-source'), fixedHash = hash('synthetic-fixed-source');
const buildSession = 'build-session', verifySession = 'verify-session';
const ledger = { schemaVersion: 2, runId: 'visual-review-ui-fixture', contractHash: hash('synthetic-contract'), status: 'passed', filesHash: fixedHash, activeSessionId: verifySession,
  sessions: [buildSession, verifySession].map((id, index) => ({ id, stage: index ? 'verify' : 'build', startedAt: time, status: 'passed', filesHash: fixedHash, errors: [], requiredJourneyIds: ['review-message'] })), captures: [], reviews: [] };
const imageSources = {};
let browser, desktop;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome' });
  const specimen = await browser.newPage();
  for (const viewport of ['desktop', 'narrow']) for (const fixed of [false, true]) {
    await specimen.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 800 } : { width: 390, height: 844 });
    await specimen.setContent(`<!doctype html><html><head><style>body{margin:0;background:#f3f5f3;color:#163c33;font:16px system-ui}main{padding:36px;max-width:900px;margin:auto}small{color:#546d65}h1{font:38px Georgia;margin:24px 0 12px}label{display:block;margin:28px 0 8px}textarea{box-sizing:border-box;width:100%;height:120px;padding:12px;background:white;border:1px solid #7d9187;border-radius:6px;font:16px system-ui}button{margin-top:14px;background:#194e3e;color:white;border:0;border-radius:6px;padding:14px 20px;font:16px system-ui}.result{margin-top:28px;background:white;padding:22px;border-top:1px solid #cad6cf}.result p{line-height:1.6}.row{display:flex;gap:12px;${fixed ? 'flex-wrap:wrap;' : 'width:650px;'}}strong{font-weight:600} .tag{padding:7px;background:#e5eee7} @media(max-width:600px){main{padding:24px}h1{font-size:30px}}</style></head><body><main><small>Synthetic UI fixture · local message review</small><h1>Message review</h1><p>Extract a task and retain its source.</p><label for="message">Operational message</label><textarea id="message">TASK: Inspect pump at 14:00. Report the result.</textarea><button>Extract task</button><section class="result"><strong>1 task ready for review</strong><p>Inspect pump</p><div class="row"><span class="tag">Time: 14:00</span><span class="tag">Source preserved</span><span class="tag">${fixed ? 'All controls fit this screen' : 'Review actions extend beyond the narrow screen'}</span></div></section></main></body></html>`);
    const bytes = await specimen.screenshot({ animations: 'disabled' });
    imageSources[viewport + (fixed ? '-fixed' : '-initial')] = bytes;
  }
  await specimen.close();
  let sequence = 0;
  for (const session of ledger.sessions) for (const viewport of ['desktop', 'narrow']) for (const round of ['initial', 'recheck']) {
    const initial = round === 'initial', build = session.stage === 'build';
    const bytes = imageSources[viewport + (initial && build ? '-initial' : '-fixed')];
    const id = `${session.stage}-${viewport}-${round}`;
    const capture = { id, sessionId: session.id, stage: session.stage, viewport, screenshot: `.browser-observations/${randomUUID()}/${hash(bytes).slice(0, 12)}-${randomUUID()}.png`, screenshotHash: hash(bytes), filesHash: initial && build ? originalHash : fixedHash, capturedAt: time, sequence: ++sequence,
      journey: { id: 'review-message', status: initial && build && viewport === 'narrow' ? 'failed' : 'passed', completedSteps: 3, totalSteps: 3, detail: 'Synthetic workflow evidence for the review viewer.' },
      errors: initial && build && viewport === 'narrow' ? ['Review actions overflow the narrow screen.'] : [] };
    ledger.captures.push(capture);
    const findingId = 'narrow-actions';
    ledger.reviews.push({ id: 'review-' + id, sessionId: session.id, stage: session.stage, captureId: id, viewport, round,
      expected: 'The task, source excerpt and review actions remain readable and reachable without horizontal scrolling.',
      observed: initial && build && viewport === 'narrow' ? 'The task is readable, but the review actions extend beyond the right edge of the narrow screen.' : 'The task and source are visible. The review actions fit within the viewport and remain readable.',
      findings: initial && build && viewport === 'narrow' ? [{ id: findingId, description: 'Review actions overflow the narrow screen.' }] : [],
      resolutions: !initial && build && viewport === 'narrow' ? [{ findingId, change: 'Allowed the action row to wrap, reopened the changed app and checked that every control fits.' }] : [],
      reviewedAt: time, sequence: ++sequence });
    const location = path.join(root, capture.screenshot);
    await fs.mkdir(path.dirname(location), { recursive: true }); await fs.writeFile(location, bytes);
    imageSources[id] = 'data:image/png;base64,' + bytes.toString('base64');
  }
  assert.equal(isVisualReviewReport(ledger), true);
  const project = { id: 'visual-project', runId: ledger.runId, title: 'Message review · synthetic UI fixture', description: 'Deterministic evidence viewer fixture. No hosted model was used.', criteria: ['Keep review actions visible at both widths.'], status: 'running', runtimeProfile: 'browser', qualityVersion: 3, createdAt: time, updatedAt: time, workspace: root, stages: stageDefinitions.map(stage => ({ ...stage, status: ['intake', 'research', 'plan', 'build'].includes(stage.id) ? 'complete' : stage.id === 'verify' ? 'active' : 'queued' })), logs: [], feedback: '', model: 'synthetic-ui-fixture', visualReview: structuredClone(ledger) };
  const pending = structuredClone(project);
  pending.visualReview.status = 'pending'; delete pending.visualReview.filesHash;
  pending.visualReview.sessions[1].status = 'pending'; delete pending.visualReview.sessions[1].filesHash;
  pending.visualReview.captures = pending.visualReview.captures.filter(capture => capture.stage === 'build');
  pending.visualReview.reviews = pending.visualReview.reviews.filter(review => review.stage === 'build');
  const state = { version: 1, settings: { provider: '', model: '', rememberKey: false }, projects: [pending] };
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ state, sources }) => {
    let current = state;
    const listeners = new Set();
    window.visualImageFailures = [];
    window.fleetHarness = {
      bootstrap: async () => ({ state: current, models: [], storagePath: 'Synthetic UI fixture', credentialStatus: 'Fixture only', runtime: 'Fixture only' }),
      onState: fn => { listeners.add(fn); return () => listeners.delete(fn); },
      preview: async () => null, artifacts: async () => [],
      visualReviewImage: async (_id, captureId) => { if (window.visualImageFailures.includes(captureId)) throw new Error('Screenshot content changed after its host capture.'); return sources[captureId]; }
    };
    window.updateVisualFixture = project => { current = { ...current, projects: [project] }; for (const fn of listeners) fn(current); };
  }, { state, sources: Object.fromEntries(ledger.captures.map(capture => [capture.id, imageSources[capture.id]])) });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
  await page.getByRole('button', { name: 'Visual review', exact: true }).click();
  await page.getByRole('heading', { name: 'Visual review', exact: true }).waitFor();
  assert.equal(await page.getByText('No test evidence yet', { exact: true }).isVisible(), true, 'Visual evidence is available before a test report');
  assert.equal(await page.getByText('Waiting for a saved screenshot and the agent’s comparison.', { exact: true }).count(), 2);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, 'pending-desktop.png'), animations: 'disabled' });
  const completed = { ...project, status: 'review' };
  await page.evaluate(next => window.updateVisualFixture(next), completed);
  await page.locator('.visual-review-entry').first().waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.visual-review-entry img')].every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator('.visual-review-entry').count(), 4);
  assert.equal(await page.getByRole('article', { name: 'Desktop initial review', exact: true }).count(), 1);
  assert.equal(await page.getByRole('article', { name: 'Desktop recheck', exact: true }).count(), 1);
  const build = page.locator('.visual-session').filter({ has: page.locator('summary').filter({ hasText: /^Build review/ }) });
  await build.locator(':scope > summary').click();
  await page.getByText('Resolved in recheck', { exact: true }).waitFor();
  assert.equal(await page.getByText('Allowed the action row to wrap, reopened the changed app and checked that every control fits.', { exact: true }).isVisible(), true);
  await build.locator(':scope > summary').click();
  const expand = page.getByRole('button', { name: 'Expand desktop initial review screenshot', exact: true });
  const originalWidth = (await expand.boundingBox()).width;
  await expand.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('button', { name: 'Reduce desktop initial review screenshot', exact: true }).getAttribute('aria-expanded'), 'true');
  assert.ok((await page.getByRole('button', { name: 'Reduce desktop initial review screenshot', exact: true }).boundingBox()).width > originalWidth * 1.5, 'Expansion gives a screenshot the full evidence width');
  await page.keyboard.press('Enter');
  await page.locator('.review-workspace').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(output, 'review-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1120, height: 720 });
  await page.screenshot({ path: path.join(output, 'review-minimum.png'), animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator('.visual-review').evaluate(element => element.scrollWidth > element.clientWidth + 1), false);
  await build.locator(':scope > summary').click();
  const corrected = build.getByRole('region', { name: 'Build review narrow', exact: true });
  await corrected.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'recorded-fix-minimum.png'), animations: 'disabled' });
  await build.locator(':scope > summary').click();
  const broken = structuredClone(completed); broken.status = 'failed'; broken.visualReview.status = 'failed'; broken.visualReview.sessions[1].status = 'failed'; broken.visualReview.sessions[1].errors = ['The final narrow screenshot is stale. Open the latest runtime and record another recheck.'];
  await page.evaluate(next => { window.visualImageFailures = ['verify-desktop-initial']; window.updateVisualFixture(next); }, broken);
  const verify = page.locator('.visual-session').filter({ has: page.locator('summary').filter({ hasText: /^Verification review/ }) });
  await verify.locator(':scope > summary').click(); await verify.locator(':scope > summary').click();
  await page.getByText('Screenshot unavailable', { exact: true }).waitFor();
  await page.getByText('Screenshot unavailable', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'blocked-minimum.png'), animations: 'disabled' });
  await page.evaluate(() => { window.visualImageFailures = []; });
  await page.getByRole('button', { name: 'Retry screenshot', exact: true }).click();
  await page.getByText('Screenshot unavailable', { exact: true }).waitFor({ state: 'detached' });
  const cli = { ...completed, runtimeProfile: 'cli', visualReview: undefined };
  await page.evaluate(next => window.updateVisualFixture(next), cli);
  await page.getByText('Not required for a command-line application.', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();

  // Exercise the actual preload and main-process route against an isolated workspace.
  const store = new Store(path.join(root, 'host-state')); await store.init();
  store.state.projects = [{ ...project, status: 'failed' }]; await store.save();
  desktop = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: store.root, PI_CODING_AGENT_DIR: path.join(root, 'pi'), VITE_DEV_SERVER_URL: url }, timeout: 45000 });
  const hostPage = await desktop.firstWindow(); await hostPage.locator('.app-shell').waitFor();
  const read = captureId => hostPage.evaluate(({ id, captureId }) => window.fleetHarness.visualReviewImage(id, captureId), { id: project.id, captureId });
  assert.equal(await read(ledger.captures[0].id), imageSources[ledger.captures[0].id]);
  await assert.rejects(read('../outside.png'), /not recorded/);
  await assert.rejects(read('file:///etc/passwd'), /not recorded/);
  const capture = ledger.captures[0], screenshot = path.join(root, capture.screenshot), saved = await fs.readFile(screenshot);
  await fs.writeFile(screenshot, Buffer.concat([saved, Buffer.from('modified')]));
  await assert.rejects(read(capture.id), /changed after/);
  await fs.writeFile(screenshot, saved);
  await fs.unlink(screenshot);
  await assert.rejects(read(capture.id), /ENOENT|no such file/i);
  const outside = path.join(root, 'outside.png'); await fs.writeFile(outside, saved); await fs.symlink(outside, screenshot);
  await assert.rejects(read(capture.id), /symlink|ordinary/);
  assert.equal(JSON.stringify((await hostPage.evaluate(() => window.fleetHarness.bootstrap())).state).includes('data:image/png;base64,'), false, 'Image bytes stay out of app state');
  console.log(JSON.stringify({ passed: true, syntheticFixtureOnly: true, pendingBeforeReport: true, initialAndRecheck: true, recordedFixes: true, keyboardExpansion: true, imageRetry: true, safeImageIPC: true, tamperAndSymlinkRejected: true, noBase64InState: true, rendererErrors: errors.length, screenshots: output }, null, 2));
} finally {
  await desktop?.close(); await browser?.close(); await server.close();
  await fs.rm(root, { recursive: true, force: true });
}
