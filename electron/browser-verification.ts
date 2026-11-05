import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { chromium, type Browser, type BrowserContext, type BrowserServer, type Page } from 'playwright';
import { PreviewServers } from './preview.js';
import type { JourneyResult, QualityPlan, UxSpec } from '../shared/quality.js';
import { performBrowserStep } from './browser-actions.js';
import { BrowserHttpEvidence } from './browser-http-evidence.js';
import { originProxy } from './agent-browser.js';
import { createPreviewProxy } from './preview-proxy.js';
import type { SolutionRuntime } from './solution-runtime.js';
import { ClassifiedExecutionFailure } from './execution-failure.js';

type JourneyRuntime = Pick<SolutionRuntime, 'url' | 'assertIntegrity' | 'close' | 'redactMessage' | 'restart'>
  & Partial<Pick<SolutionRuntime, 'invoke' | 'provenance'>> & { routeBase?: string };

export interface BrowserVerificationOptions {
  root: string;
  plan: QualityPlan;
  contractHash: string;
  /** Frozen screen structure used by host-authored expectScreen steps. */
  ux?: UxSpec;
  /** Host-started service URL or static runtime preview, never supplied by generated browser steps. */
  url?: string;
  /** Trusted mount prefix belonging to the host-started shared URL. */
  routeBase?: string;
  /** Trusted host factory: each journey and viewport receives a fresh package and process. */
  prepareRuntime?: (signal: AbortSignal) => Promise<JourneyRuntime>;
  allowSameOrigin?: boolean;
  /** Optional Chromium-compatible browser binary; never the Node/Electron runtime. */
  executable?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  stepTimeoutMs?: number;
}

const viewports = { desktop: { width: 1280, height: 800 }, narrow: { width: 390, height: 844 } } as const;
const maxArtifactBytes = 8_000_000;
const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 1800);

/** Every operation shares one deadline, including launch, evidence capture and teardown. */
class Deadline {
  private readonly controller = new AbortController();
  private failure?: Error;
  private reject!: (error: Error) => void;
  private readonly stopped = new Promise<never>((_resolve, reject) => { this.reject = reject; });
  private readonly timer: ReturnType<typeof setTimeout>;
  private readonly started = performance.now();
  private readonly abort = () => this.stop(new Error('Browser verification stopped.'));
  constructor(private readonly timeoutMs: number, private readonly parentSignal?: AbortSignal) {
    void this.stopped.catch(() => {});
    this.timer = setTimeout(() => this.stop(new Error(`Browser verification exceeded its ${timeoutMs / 1000}-second limit.`)), timeoutMs);
    parentSignal?.addEventListener('abort', this.abort, { once: true });
    if (parentSignal?.aborted) this.abort();
  }
  get signal() { return this.controller.signal; }
  private stop(error: Error) { if (!this.failure) { this.failure = error; this.controller.abort(error); this.reject(error); } }
  check() {
    // Synchronous host work can occupy the event loop past the timer deadline.
    if (!this.failure && performance.now() - this.started >= this.timeoutMs) this.stop(new Error(`Browser verification exceeded its ${this.timeoutMs / 1000}-second limit.`));
    if (this.failure) throw this.failure;
  }
  remaining() { this.check(); return Math.max(1, this.timeoutMs - (performance.now() - this.started)); }
  async run<T>(operation: Promise<T>): Promise<T> { const value = await Promise.race([operation, this.stopped]); this.check(); return value; }
  dispose() { clearTimeout(this.timer); this.parentSignal?.removeEventListener('abort', this.abort); this.controller.abort(); }
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

async function cleanupWithin(operation: Promise<unknown>, timeoutMs: number, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([operation, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' exceeded its cleanup limit.')), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

const classifiedFailure = (error: unknown) => error instanceof ClassifiedExecutionFailure && error.classification !== 'implementation';

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

export async function verifyBrowserJourneys(options: BrowserVerificationOptions): Promise<{ journeys: JourneyResult[]; errors: string[] }> {
  const { root, contractHash, executable, signal } = options;
  const plan = structuredClone(options.plan), ux = options.ux === undefined ? undefined : structuredClone(options.ux);
  const timeoutMs = options.timeoutMs ?? 120_000, stepTimeoutMs = options.stepTimeoutMs ?? 5_000;
  for (const [name, value] of Object.entries({ timeoutMs, stepTimeoutMs })) if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid browser verification limit: ' + name);
  if (options.url && options.prepareRuntime) throw new Error('Browser verification accepts either a runtime factory or a shared URL, not both.');
  if (signal?.aborted) throw new Error('Browser verification stopped.');
  const deadline = new Deadline(timeoutMs, signal);
  const previews = new PreviewServers();
  const journeys: JourneyResult[] = [], errors: string[] = [];
  let server: BrowserServer | undefined, browser: Browser | undefined, context: BrowserContext | undefined;
  let launching: Promise<BrowserServer> | undefined;
  let proxy: Awaited<ReturnType<typeof originProxy>> | undefined;
  let proxying: Promise<Awaited<ReturnType<typeof originProxy>>> | undefined;
  let closed = false;
  let redact = (text: string) => text;
  try {
    if (!plan.journeys.length) throw new Error('No browser journeys were supplied for verification.');
    const evidence = await deadline.run(artifactPath(root, contractHash));
    const sharedUrl = options.prepareRuntime ? undefined : options.url ?? await deadline.run(previews.url(root, ux?.schemaVersion === 2 ? ['index.html'] : undefined));
    const sharedRouteBase = options.routeBase ?? (!options.url && sharedUrl && ux?.schemaVersion === 2 ? new URL('.', sharedUrl).pathname.replace(/\/$/, '') : '');
    if (sharedUrl && !/^http:\/\/127\.0\.0\.1:\d+\//.test(sharedUrl)) throw new Error('Verification requires a host-started loopback runtime.');
    // Routing callbacks alone do not cover redirect hops or WebRTC. The proxy
    // enforces origin restrictions at the transport layer, and Chromium must
    // never bypass it for loopback requests or non-proxied UDP traffic.
    // Browser-global requests have no application authority. Every context gets
    // its own proxy restricted to that attempt's independently prepared origin.
    proxying = createPreviewProxy(() => false).then(async started => {
      if (closed) { await started.close(); throw new Error('Browser verification stopped.'); }
      proxy = started; return started;
    });
    await deadline.run(proxying);
    const failures: string[] = [];
    // Full Chromium applies the WebRTC preference; headless-shell may not.
    const candidates = executable ? [{ executablePath: executable }] : [{ channel: 'chromium' }, { channel: 'chrome' }];
    for (const candidate of candidates) {
      deadline.check();
      try {
        launching = chromium.launchServer({ ...candidate, headless: true, chromiumSandbox: true, host: '127.0.0.1', timeout: Math.min(5_000, deadline.remaining()),
          proxy: { server: proxy!.url, bypass: '<-loopback>' }, args: ['--disable-quic', '--webrtc-ip-handling-policy=disable_non_proxied_udp', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'] });
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
      const result: JourneyResult = { id: journey.id, title: journey.title, viewport: viewport as JourneyResult['viewport'], status: 'failed', detail: '', completedSteps: 0, totalSteps: journey.steps.length };
      journeys.push(result);
      const problems: string[] = [];
      const record = (problem: string) => { if (problems.length < 12 && !problems.includes(problem)) problems.push(problem.slice(0, 1200)); };
      let page: Page | undefined, httpEvidence: BrowserHttpEvidence | undefined, tracing = false, stepIndex = 0, expectedDownloads = 0;
      let runtime: JourneyRuntime | undefined, preparing: Promise<JourneyRuntime> | undefined;
      let attemptProxy: Awaited<ReturnType<typeof originProxy>> | undefined;
      let preparingProxy: Promise<Awaited<ReturnType<typeof originProxy>>> | undefined;
      let attemptClosed = false, lifecycleFailure: unknown;
      const cleanupLimit = Math.min(2000, timeoutMs);
      const recordHttpErrors = () => { for (const error of httpEvidence?.errors() ?? []) record(error); };
      const stem = journey.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) + '-' + viewport;
      try {
        if (options.prepareRuntime) {
          preparing = Promise.resolve().then(() => options.prepareRuntime!(deadline.signal)).then(async started => {
            if (attemptClosed || deadline.signal.aborted) {
              await cleanupWithin(started.close(), cleanupLimit, 'Late browser runtime');
              throw new Error('Browser verification stopped before runtime preparation completed.');
            }
            runtime = started; redact = text => started.redactMessage(text); return started;
          });
          try { await deadline.run(preparing); }
          catch (error) { lifecycleFailure = error; throw error; }
        }
        const url = runtime?.url ?? sharedUrl;
        if (!url || !/^http:\/\/127\.0\.0\.1:\d+\//.test(url)) throw new Error('Verification requires a host-started loopback runtime.');
        preparingProxy = originProxy(new URL(url).origin).then(async started => {
          if (attemptClosed) { await started.close(); throw new Error('Browser verification stopped.'); }
          attemptProxy = started; return started;
        });
        await deadline.run(preparingProxy);
        context = await deadline.run(browser.newContext({ viewport: dimensions, acceptDownloads: true, serviceWorkers: 'block', permissions: [],
          proxy: { server: attemptProxy!.url, bypass: '<-loopback>' } }));
        context.setDefaultTimeout(Math.min(stepTimeoutMs, deadline.remaining()));
        await deadline.run(context.route('**/*', route => {
          const address = route.request().url();
          if (address === new URL('/favicon.ico', url).href) return route.fulfill({ status: 204 });
          if (address === url || (options.allowSameOrigin && new URL(address).origin === new URL(url).origin) || address.startsWith('data:') || address.startsWith('blob:')) return route.continue();
          record('Application requested a blocked resource: ' + address.slice(0, 300));
          return route.abort('blockedbyclient');
        }));
        await deadline.run(context.routeWebSocket(/.*/, async socket => {
          record('Application requested a blocked WebSocket: ' + socket.url().slice(0, 300));
          await socket.close({ code: 1008, reason: 'WebSockets are unavailable during verification.' }).catch(() => {});
        }));
        await deadline.run(context.tracing.start({ screenshots: true, snapshots: true, sources: false }));
        tracing = true;
        page = await deadline.run(context.newPage());
        httpEvidence = await deadline.run(BrowserHttpEvidence.attach(page));
        page.on('pageerror', error => record('Browser error: ' + error.message));
        page.on('console', entry => { if (entry.type() === 'error' && !httpEvidence!.captureConsole(entry)) record('Console error: ' + entry.text()); });
        page.on('dialog', dialog => { record('Unexpected ' + dialog.type() + ' dialog: ' + dialog.message()); void dialog.dismiss().catch(() => {}); });
        page.on('download', download => {
          // A frozen export step authorizes one download; every other event is
          // a journey failure, including extra exports from the same click.
          if (expectedDownloads > 0) { expectedDownloads--; return; }
          record('Unexpected download: ' + download.suggestedFilename());
          void download.cancel().catch(() => {});
        });
        context.on('page', opened => { if (opened !== page) { record('Application opened an unexpected new window.'); void opened.close().catch(() => {}); } });
        await deadline.run(page.goto(url, { waitUntil: 'load', timeout: Math.min(stepTimeoutMs, deadline.remaining()) }));
        for (const step of journey.steps) {
          stepIndex++;
          const stepLimit = Math.min(stepTimeoutMs, deadline.remaining());
          expectedDownloads = step.action === 'expectDownload' ? 1 : 0;
          try {
            const hooks = runtime?.provenance?.profile === 'service'
              ? { restart: runtime.restart?.bind(runtime), invokeService: runtime.invoke?.bind(runtime) } : undefined;
            const operation = performBrowserStep(page, step, stepLimit, httpEvidence, ux, runtime?.routeBase ?? sharedRouteBase, hooks);
            // Runtime startup/invocation limits own service operations; the
            // journey deadline still bounds stalled hooks and cancellation.
            const hostDeadline = ['expectScreen', 'restartRuntime', 'expectServiceState'].includes(step.action);
            await deadline.run(hostDeadline ? operation : stepWithin(operation, stepLimit));
            result.completedSteps = stepIndex;
          } finally { expectedDownloads = 0; }
          const overflow = await deadline.run(page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) > innerWidth + 1));
          if (overflow) record('Horizontal overflow prevents the application fitting the ' + viewport + ' viewport.');
        }
        await deadline.run(httpEvidence.flush());
        recordHttpErrors();
        result.status = problems.length ? 'failed' : 'passed';
        result.detail = problems.length ? problems.join('\n') : `Completed ${journey.steps.length} steps at ${dimensions.width}×${dimensions.height}; no browser errors or horizontal overflow.`;
      } catch (error) {
        if (classifiedFailure(error)) lifecycleFailure = error;
        recordHttpErrors();
        result.detail = [`Step ${stepIndex || 'load'}: ${message(error)}`, ...problems].join('\n');
      } finally {
        try {
          deadline.check();
          if (page && !page.isClosed()) {
            const screenshot = path.join(evidence.relative, stem + '.png');
            await deadline.run(page.screenshot({ path: path.join(evidence.base, screenshot), timeout: Math.min(2000, deadline.remaining()), animations: 'disabled', fullPage: false }));
            await deadline.run(keepArtifact(path.join(evidence.base, screenshot)));
            result.screenshot = screenshot.replaceAll(path.sep, '/');
          }
          if (context && tracing) {
            const trace = path.join(evidence.relative, stem + '.zip');
            await deadline.run(context.tracing.stop({ path: path.join(evidence.base, trace) }));
            await deadline.run(keepArtifact(path.join(evidence.base, trace)));
            result.trace = trace.replaceAll(path.sep, '/');
          }
          if (httpEvidence) await deadline.run(httpEvidence.flush());
        } catch (error) { result.status = 'failed'; result.detail += '\nEvidence capture: ' + message(error); }
        recordHttpErrors();
        if (httpEvidence) await settleWithin(httpEvidence.dispose(), 500);
        if (context) { await settleWithin(context.close(), Math.min(1000, Math.max(1, timeoutMs))); context = undefined; }
        if (problems.length && result.status === 'passed') { result.status = 'failed'; result.detail = problems.join('\n'); }
        attemptClosed = true;
        if (attemptProxy) {
          try { await cleanupWithin(attemptProxy.close(), cleanupLimit, 'Browser origin proxy'); }
          catch (error) { lifecycleFailure ??= error; result.status = 'failed'; result.detail += '\nProxy cleanup: ' + message(error); }
        } else if (preparingProxy) await settleWithin(preparingProxy, cleanupLimit);
        if (runtime) {
          try { await deadline.run(runtime.assertIntegrity()); }
          catch (error) { lifecycleFailure ??= error; result.status = 'failed'; result.detail += '\nRuntime integrity: ' + message(error); }
          finally {
            try { await cleanupWithin(runtime.close(), cleanupLimit, 'Browser runtime'); }
            catch (error) { lifecycleFailure ??= error; result.status = 'failed'; result.detail += '\nRuntime cleanup: ' + message(error); }
          }
          result.detail = runtime.redactMessage(result.detail);
        } else if (preparing) await settleWithin(preparing, cleanupLimit);
      }
      if (lifecycleFailure) throw lifecycleFailure;
      try { deadline.check(); }
      catch (error) { result.status = 'failed'; result.detail += '\nVerification deadline: ' + redact(message(error)); throw error; }
    }
  } catch (error) { if (classifiedFailure(error)) throw error; errors.push(redact(message(error))); }
  finally {
    closed = true;
    // Killing the browser server also interrupts unresponsive page scripts. A launch
    // interrupted before it resolves is explicitly disposed once Playwright settles.
    if (context) await settleWithin(context.close(), 500);
    if (server) await settleWithin(server.kill(), 1000);
    else if (launching) await settleWithin(launching.then(late => late.kill()), 5500);
    if (proxy) await settleWithin(proxy.close(), 1000);
    else if (proxying) await settleWithin(proxying, 1000);
    previews.close();
    deadline.dispose();
  }
  if (signal?.aborted) throw new Error('Browser verification stopped.');
  for (const journey of plan.journeys) for (const viewport of Object.keys(viewports) as JourneyResult['viewport'][]) {
    if (!journeys.some(result => result.id === journey.id && result.viewport === viewport)) journeys.push({ id: journey.id, title: journey.title, viewport, status: 'failed', detail: 'Not executed: ' + (errors[0] || 'browser verification interrupted') });
  }
  return { journeys, errors };
}
