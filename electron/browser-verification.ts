import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { atomicHostWrite } from '../shared/host-files.js';
import { createHash, randomUUID } from 'node:crypto';
import { chromium, type Browser, type BrowserContext, type BrowserServer, type Page } from 'playwright';
import { PreviewServers } from './preview.js';
import { runProcessEnvironment } from './process-sweep.js';
import type { BrowserStep, JourneyResult, QualityPlan } from '../shared/quality.js';

export interface BrowserVerificationOptions {
  root: string;
  plan: QualityPlan;
  contractHash: string;
  /** Optional Chromium-compatible browser binary; never the Node/Electron runtime. */
  executable?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  stepTimeoutMs?: number;
}

const viewports = { desktop: { width: 1280, height: 800 }, narrow: { width: 390, height: 844 } } as const;
const maxArtifactBytes = 8_000_000;
const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 1800);
const normalized = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Every operation shares one deadline, including launch, evidence capture and teardown. */
class Deadline {
  private failure?: Error;
  private reject!: (error: Error) => void;
  private readonly stopped = new Promise<never>((_resolve, reject) => { this.reject = reject; });
  private readonly timer: ReturnType<typeof setTimeout>;
  private readonly started = Date.now();
  private readonly abort = () => this.stop(new Error('Browser verification stopped.'));
  constructor(private readonly timeoutMs: number, private readonly signal?: AbortSignal) {
    void this.stopped.catch(() => {});
    this.timer = setTimeout(() => this.stop(new Error(`Browser verification exceeded its ${timeoutMs / 1000}-second limit.`)), timeoutMs);
    signal?.addEventListener('abort', this.abort, { once: true });
    if (signal?.aborted) this.abort();
  }
  private stop(error: Error) { if (!this.failure) { this.failure = error; this.reject(error); } }
  check() { if (this.failure) throw this.failure; }
  remaining() { this.check(); return Math.max(1, this.timeoutMs - (Date.now() - this.started)); }
  run<T>(operation: Promise<T>): Promise<T> { return Promise.race([operation, this.stopped]); }
  dispose() { clearTimeout(this.timer); this.signal?.removeEventListener('abort', this.abort); }
}

async function settleWithin(operation: Promise<unknown>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([operation.catch(() => {}), new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs); })]);
  } finally { clearTimeout(timer); }
}

async function stepWithin(operation: Promise<unknown>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([operation, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`Browser step exceeded its ${timeoutMs / 1000}-second limit.`)), timeoutMs); })]);
  } finally { clearTimeout(timer); }
}

async function artifactPath(root: string, contractHash: string) {
  const base = await fs.realpath(root);
  const folder = path.join(base, '.quality-evidence');
  await fs.mkdir(folder, { recursive: true });
  if ((await fs.lstat(folder)).isSymbolicLink() || await fs.realpath(folder) !== folder) throw new Error('Browser evidence directory must be a real workspace directory.');
  const prefix = createHash('sha256').update(contractHash).digest('hex').slice(0, 12);
  const relative = path.join('.quality-evidence', prefix + '-' + randomUUID());
  await fs.mkdir(path.join(base, relative));
  return { base, relative };
}

async function keepArtifact(file: string) {
  const stat = await fs.stat(file);
  if (stat.size > maxArtifactBytes) {
    await fs.rm(file, { force: true });
    throw new Error('Browser evidence exceeded the 8 MB per-file limit.');
  }
}

export type DownloadCaptures = Map<string, { fileName: string; text: string }>;
export async function performBrowserStep(page: Page, step: BrowserStep, timeout: number, downloads: DownloadCaptures) {
  if (['fill', 'click', 'select', 'press', 'check', 'reload'].includes(step.action)) downloads.clear();
  if (step.action === 'reload') { await page.reload({ waitUntil: 'domcontentloaded', timeout }); return; }
  // Prefixing with css prevents selectors from being treated as executable browser code.
  const target = page.locator('css=' + step.selector);
  switch (step.action) {
    case 'fill': await target.fill(step.value, { timeout }); break;
    case 'click': await target.click({ timeout }); break;
    case 'select': await target.selectOption(step.value, { timeout }); break;
    case 'press': await target.press(step.key, { timeout }); break;
    case 'check': await target.check({ timeout }); break;
    case 'expectVisible': await target.waitFor({ state: 'visible', timeout }); break;
    case 'expectText':
    case 'expectValue': {
      await target.waitFor({ state: 'visible', timeout });
      const expected = step.action === 'expectText' ? normalized(step.text) : step.value;
      const until = Date.now() + timeout;
      let actual = '';
      do {
        actual = step.action === 'expectText' ? normalized(await target.innerText({ timeout })) : await target.inputValue({ timeout });
        if (actual === expected) return;
        if (Date.now() >= until) break;
        await new Promise(resolve => setTimeout(resolve, Math.min(50, Math.max(1, until - Date.now()))));
      } while (Date.now() < until);
      throw new Error(`${step.action} ${step.selector}: expected ${JSON.stringify(expected.slice(0, 500))}, received ${JSON.stringify(actual.slice(0, 500))}.`);
    }
    case 'expectDownload': {
      let captured = step.fresh ? undefined : downloads.get(step.selector);
      if (!captured) {
      const [download] = await Promise.all([page.waitForEvent('download', { timeout }), target.click({ timeout })]);
      if (step.fileName !== undefined && download.suggestedFilename() !== step.fileName) {
        await download.cancel();
        throw new Error(`Expected download ${JSON.stringify(step.fileName)}, received ${JSON.stringify(download.suggestedFilename())}.`);
      }
      const stream = await download.createReadStream();
      if (!stream) throw new Error('The application did not produce a readable download.');
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of stream) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > maxArtifactBytes) { stream.destroy(); await download.cancel(); throw new Error('Download exceeded the 8 MB verification limit.'); }
        chunks.push(bytes);
      }
      const failure = await download.failure();
      if (failure) throw new Error('Download failed: ' + failure);
      captured = { fileName: download.suggestedFilename(), text: Buffer.concat(chunks).toString('utf8') };
      downloads.set(step.selector, captured);
      }
      if (step.fileName !== undefined && captured.fileName !== step.fileName) throw new Error(`Expected download ${JSON.stringify(step.fileName)}, received ${JSON.stringify(captured.fileName)}.`);
      if (step.text !== undefined && !captured.text.includes(step.text)) throw new Error('Downloaded content does not contain the expected literal text.');
      break;
    }
    default: throw new Error('Unsupported browser action.');
  }
}

export async function verifyBrowserJourneys(options: BrowserVerificationOptions): Promise<{ journeys: JourneyResult[]; errors: string[] }> {
  const { root, plan, contractHash, executable, signal } = options;
  const timeoutMs = options.timeoutMs ?? 120_000, stepTimeoutMs = options.stepTimeoutMs ?? 5_000;
  for (const [name, value] of Object.entries({ timeoutMs, stepTimeoutMs })) if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid browser verification limit: ' + name);
  if (signal?.aborted) throw new Error('Browser verification stopped.');
  const deadline = new Deadline(timeoutMs, signal);
  const previews = new PreviewServers();
  const journeys: JourneyResult[] = [], errors: string[] = [];
  let server: BrowserServer | undefined, browser: Browser | undefined, context: BrowserContext | undefined;
  let launching: Promise<BrowserServer> | undefined;
  try {
    if (!plan.journeys.length) throw new Error('No browser journeys were supplied for verification.');
    const evidence = await deadline.run(artifactPath(root, contractHash));
    const url = await deadline.run(previews.url(root));
    const failures: string[] = [];
    const candidates = executable ? [{ executablePath: executable }] : [{}, { channel: 'chrome' }];
    for (const candidate of candidates) {
      deadline.check();
      try {
        launching = chromium.launchServer({ ...candidate, env: runProcessEnvironment(), headless: true, chromiumSandbox: true, host: '127.0.0.1', timeout: Math.min(5_000, deadline.remaining()) });
        server = await deadline.run(launching);
        browser = await deadline.run(chromium.connect(server.wsEndpoint(), { timeout: Math.min(5_000, deadline.remaining()) }));
        break;
      } catch (error) {
        failures.push(message(error));
        deadline.check();
        if (server) { await settleWithin(server.kill(), 1000); server = undefined; }
      }
    }
    if (!browser) throw new Error('Browser verification could not start. Install Google Chrome, or run `npm run setup:browser` from the source checkout to install Chromium, then retry. No browser is downloaded during a build.\n' + failures.join('\n').slice(0, 2000));
    for (const journey of plan.journeys) for (const [viewport, dimensions] of Object.entries(viewports)) {
      deadline.check();
      const result: JourneyResult = { id: journey.id, title: journey.title, viewport: viewport as JourneyResult['viewport'], status: 'failed', detail: '' };
      journeys.push(result);
      const problems: string[] = [];
      const record = (problem: string) => { if (problems.length < 12 && !problems.includes(problem)) problems.push(problem.slice(0, 1200)); };
      let page: Page | undefined, tracing = false, stepIndex = 0;
      const stem = journey.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) + '-' + viewport;
      try {
        context = await deadline.run(browser.newContext({ viewport: dimensions, acceptDownloads: true, serviceWorkers: 'block' }));
        context.setDefaultTimeout(Math.min(stepTimeoutMs, deadline.remaining()));
        await deadline.run(context.route('**/*', route => {
          const address = route.request().url();
          if (address === new URL('/favicon.ico', url).href) return route.fulfill({ status: 204 });
          if (address === url || address.startsWith('data:') || address.startsWith('blob:')) return route.continue();
          record('Application requested a blocked resource: ' + address.slice(0, 300));
          return route.abort('blockedbyclient');
        }));
        await deadline.run(context.tracing.start({ screenshots: true, snapshots: true, sources: false }));
        tracing = true;
        page = await deadline.run(context.newPage());
        page.on('pageerror', error => record('Browser error: ' + error.message));
        page.on('console', entry => { if (entry.type() === 'error') record('Console error: ' + entry.text()); });
        page.on('dialog', dialog => { record('Unexpected ' + dialog.type() + ' dialog: ' + dialog.message()); void dialog.dismiss().catch(() => {}); });
        context.on('page', opened => { if (opened !== page) { record('Application opened an unexpected new window.'); void opened.close().catch(() => {}); } });
        await deadline.run(page.goto(url, { waitUntil: 'load', timeout: Math.min(stepTimeoutMs, deadline.remaining()) }));
        const downloads: DownloadCaptures = new Map();
        for (const step of journey.steps) {
          stepIndex++;
          const stepLimit = Math.min(stepTimeoutMs, deadline.remaining());
          await deadline.run(stepWithin(performBrowserStep(page, step, stepLimit, downloads), stepLimit));
          const overflow = await deadline.run(page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) > innerWidth + 1));
          if (overflow) record('Horizontal overflow prevents the application fitting the ' + viewport + ' viewport.');
        }
        result.status = problems.length ? 'failed' : 'passed';
        result.detail = problems.length ? problems.join('\n') : `Completed ${journey.steps.length} steps at ${dimensions.width}×${dimensions.height}; no browser errors or horizontal overflow.`;
      } catch (error) {
        result.detail = [`Step ${stepIndex || 'load'}: ${message(error)}`, ...problems].join('\n');
      } finally {
        try {
          deadline.check();
          if (page && !page.isClosed()) {
            const screenshot = path.join(evidence.relative, stem + '.png');
            const bytes = await deadline.run(page.screenshot({ timeout: Math.min(2000, deadline.remaining()), animations: 'disabled', fullPage: false }));
            await deadline.run(atomicHostWrite(evidence.base, screenshot, bytes));
            await deadline.run(keepArtifact(path.join(evidence.base, screenshot)));
            result.screenshot = screenshot.replaceAll(path.sep, '/');
          }
          if (context && tracing) {
            const trace = path.join(evidence.relative, stem + '.zip');
            const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-trace-'));
            try {
              const file = path.join(scratch, 'trace.zip');
              await deadline.run(context.tracing.stop({ path: file }));
              await deadline.run(atomicHostWrite(evidence.base, trace, await fs.readFile(file)));
            } finally { await fs.rm(scratch, { recursive: true, force: true }); }
            await deadline.run(keepArtifact(path.join(evidence.base, trace)));
            result.trace = trace.replaceAll(path.sep, '/');
          }
        } catch (error) { result.status = 'failed'; result.detail += '\nEvidence capture: ' + message(error); }
        if (problems.length && result.status === 'passed') { result.status = 'failed'; result.detail = problems.join('\n'); }
        if (context) { await settleWithin(context.close(), Math.min(1000, Math.max(1, timeoutMs))); context = undefined; }
      }
    }
  } catch (error) { errors.push(message(error)); }
  finally {
    // Killing the browser server also interrupts unresponsive page scripts. A launch
    // interrupted before it resolves is explicitly disposed once Playwright settles.
    if (context) await settleWithin(context.close(), 500);
    if (server) await settleWithin(server.kill(), 1000);
    else if (launching) await settleWithin(launching.then(late => late.kill()), 5500);
    previews.close();
    deadline.dispose();
  }
  if (signal?.aborted) throw new Error('Browser verification stopped.');
  for (const journey of plan.journeys) for (const viewport of Object.keys(viewports) as JourneyResult['viewport'][]) {
    if (!journeys.some(result => result.id === journey.id && result.viewport === viewport)) journeys.push({ id: journey.id, title: journey.title, viewport, status: 'failed', detail: 'Not executed: ' + (errors[0] || 'browser verification interrupted') });
  }
  return { journeys, errors };
}
