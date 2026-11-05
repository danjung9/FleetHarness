import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createPreviewProxy } from './preview-proxy.js';
import { chromium, type Browser, type BrowserContext, type BrowserServer, type Page } from 'playwright';
import { Type, type Static } from 'typebox';
import { Check } from 'typebox/value';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import type { BrowserJourney, UxSpec } from '../shared/quality.js';
import { performBrowserStep, type BrowserRuntimeHooks } from './browser-actions.js';
import { BrowserHttpEvidence } from './browser-http-evidence.js';
import type { VisualCaptureInput } from './visual-review.js';
import { BrowserFlowLedger, observeBrowserFlow, type BrowserFlowAttempt, type BrowserFlowDom, type BrowserFlowReport } from './browser-flow.js';

export interface AgentBrowserOptions {
  root: string;
  signal: AbortSignal;
  /** Prepare a fresh host-owned copy of the application's declared runtime files. */
  prepare: (signal: AbortSignal) => Promise<BrowserRuntimeHooks & { url: string; routeBase?: string; close: () => Promise<void>; redactMessage?: (message: string) => string; filesHash?: string; assertIntegrity?: () => Promise<void> }>;
  /** Record a saved, successful screenshot against the runtime that was actually rendered. */
  onCapture?: (capture: VisualCaptureInput) => Promise<string>;
  /** Optional trusted persistence; editable workspace reports are never imported. */
  onFlow?: (report: BrowserFlowReport) => void | Promise<void>;
  /** Frozen host acceptance journeys; callers may select an ID, never supply steps. */
  journeys?: BrowserJourney[];
  /** Frozen screen structure used by host-authored expectScreen steps. */
  ux?: UxSpec;
  executable?: string;
  timeoutMs?: number;
  stepTimeoutMs?: number;
}

const viewports = { desktop: { width: 1280, height: 800 }, narrow: { width: 390, height: 844 } } as const;
const schema = Type.Object({
  action: Type.Union(['open', 'journey', 'click', 'type', 'press', 'select', 'scroll', 'screenshot', 'flow', 'close'].map(action => Type.Literal(action))),
  journeyId: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  viewport: Type.Optional(Type.Union([Type.Literal('desktop'), Type.Literal('narrow')])),
  selector: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
  text: Type.Optional(Type.String({ maxLength: 20_000 })),
  key: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  value: Type.Optional(Type.String({ maxLength: 2000 })),
  deltaY: Type.Optional(Type.Integer({ minimum: -5000, maximum: 5000 })),
}, { additionalProperties: false });
type Input = Static<typeof schema>;
type Runtime = Awaited<ReturnType<AgentBrowserOptions['prepare']>>;
type JourneyCapture = NonNullable<VisualCaptureInput['journey']>;
type Event = { type: 'console' | 'error'; level?: string; message: string };
type Generation = {
  controller: AbortController; signal: AbortSignal; closed: boolean; closing?: Promise<void>;
  runtime?: Runtime; server?: BrowserServer; browser?: Browser; context?: BrowserContext; page?: Page;
  httpEvidence?: BrowserHttpEvidence;
  proxy?: { url: string; close: () => Promise<void> };
  expectedDownloads: number;
  expectedDownloadUrl?: string;
  expectedDownloadStep?: number;
  downloadRequestSteps: WeakMap<object, number>;
  verifiedDownloads: Array<{ url: string; step: number }>;
  navigationAborts: Array<{ url: string; step: number; message: string }>;
  /** Only a deliberate open starts exploration; frozen replay never earns flow credit. */
  flow?: { id: string; viewport: keyof typeof viewports };
};
type Result = { content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: 'image/png' })[]; details: Record<string, unknown>; isError: boolean };
const maxImageBytes = 8_000_000, maxImages = 100, maxTotalImageBytes = 128_000_000;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 1800);

async function within<T>(operation: Promise<T>, timeout: number | undefined, signal?: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let aborted: (() => void) | undefined;
  try {
    const stopped = new Promise<never>((_resolve, reject) => {
      if (timeout !== undefined) timer = setTimeout(() => reject(new Error(`Browser operation exceeded its ${timeout / 1000}-second limit.`)), timeout);
      aborted = () => reject(signal?.reason instanceof Error ? signal.reason : new Error('Browser operation stopped.'));
      signal?.addEventListener('abort', aborted, { once: true });
      if (signal?.aborted) aborted();
    });
    return await Promise.race([operation, stopped]);
  } finally { clearTimeout(timer); if (aborted) signal?.removeEventListener('abort', aborted); }
}

async function settle(operation: Promise<unknown>, timeout = 1000) {
  try { await within(operation, timeout); } catch { /* Teardown must finish even for a hung renderer or runtime. */ }
}

function runtimeAddress(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password) {
    throw new Error('Browser sessions require a host-started HTTP runtime on 127.0.0.1 with an explicit port.');
  }
  return url;
}

/** Same-origin transport boundary shared by agent and verification browsers. */
export const originProxy = (origin: string) => createPreviewProxy(target => target === origin);

/** One stage's interactive browser. Generated code never chooses a URL, browser
 * executable, image path, launch arguments, or JavaScript to evaluate. */
export class AgentBrowserSession {
  private readonly controller = new AbortController();
  private readonly timeout: number;
  private readonly stepTimeout: number;
  private readonly journeys: BrowserJourney[];
  private readonly ux?: UxSpec;
  private readonly flow: BrowserFlowLedger;
  private flowPersistenceFailure?: string;
  private active?: Generation;
  private closing?: Promise<void>;
  private busy = false;
  private events: Event[] = [];
  private diagnostics: string[] = [];
  private viewport: keyof typeof viewports = 'desktop';
  private artifacts?: { base: string; relative: string };
  private imageCount = 0;
  private imageBytes = 0;
  private readonly aborted = () => { void this.stop(new Error('Browser session stopped.')); };

  constructor(private readonly options: AgentBrowserOptions) {
    this.timeout = options.timeoutMs ?? 600_000;
    this.stepTimeout = options.stepTimeoutMs ?? 5000;
    for (const [name, value] of Object.entries({ timeoutMs: this.timeout, stepTimeoutMs: this.stepTimeout })) {
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid browser session limit: ' + name);
    }
    this.journeys = structuredClone(options.journeys ?? []);
    this.ux = options.ux === undefined ? undefined : structuredClone(options.ux);
    this.flow = new BrowserFlowLedger(options.root, this.journeys);
    if (new Set(this.journeys.map(journey => journey.id)).size !== this.journeys.length) throw new Error('Browser journey IDs must be unique.');
    options.signal.addEventListener('abort', this.aborted, { once: true });
    if (options.signal.aborted) this.aborted();
  }

  tools(): ToolDefinition[] {
    return [{
      name: 'fleet_browser', label: 'Inspect and interact with the application', parameters: schema,
      description: 'Use open to prepare and open the latest application files in a host-managed Playwright browser; returned journeys list frozen host acceptance journeys. First explore the actual UI manually at desktop and narrow: open each width, inspect screenshot and controls, then use returned selectors to discover navigation, disclosures and the main task result. Use flow for the read-only observed screen/transition graph and untried controls. Frozen journey replay never counts as manual UI flow discovery. Use journey with journeyId and viewport to run every frozen step in a fresh runtime/browser, including screen routes, assertions, persistence and exports. Journey returns its host result and final PNG, including failures. After edits, open again and repeat affected exploration and frozen journeys at both widths. Use returned CSS selectors to click, type (replace a field), press a key, or select an option; scroll uses deltaY (default 600). Each observation returns an actual PNG, visible text/controls, and console/errors. Screenshot can switch viewport, but flow evidence requires a fresh open at each width. For asynchronous results, screenshot again after activation. Review captureId with fleet_visual_review. Only the application origin is accessible; WebSockets, popups, arbitrary JavaScript and unexpected downloads are unavailable. Downloads are bounded and allowed only during a frozen expectDownload step. Observations do not replace independent verification. Close releases the preview.',
      execute: async (_id, raw, signal) => this.execute(raw, signal),
    }];
  }

  private clean(text: string) {
    try { return (this.active?.runtime?.redactMessage?.(text) ?? text).slice(0, 16_000); }
    catch { return '[Browser text could not be redacted]'; }
  }

  private cleanValue(value: unknown): unknown {
    if (typeof value === 'string') return this.clean(value);
    if (Array.isArray(value)) return value.map(item => this.cleanValue(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.cleanValue(item)]));
    return value;
  }

  private record(message: string, level?: string) {
    const cleaned = this.clean(message.slice(0, 1200));
    this.events.push({ type: level ? 'console' : 'error', ...(level ? { level } : {}), message: cleaned });
    if (this.events.length > 40) this.events.shift();
    const error = level === 'error' ? 'Console error: ' + cleaned : cleaned;
    if ((!level || level === 'error') && this.diagnostics.length < 40 && !this.diagnostics.includes(error)) this.diagnostics.push(error);
  }

  private errors() {
    // Chromium reports a successful attachment navigation as ERR_ABORTED. Exempt
    // one matching request only after the frozen export step verified its bytes.
    const downloads = [...(this.active?.verifiedDownloads ?? [])];
    const failures = (this.active?.navigationAborts ?? []).filter(request => {
      const index = downloads.findIndex(download => download.url === request.url && download.step === request.step);
      if (index < 0) return true;
      downloads.splice(index, 1); return false;
    }).map(request => request.message);
    return [...this.diagnostics, ...failures, ...(this.active?.httpEvidence?.errors() ?? []).map(error => this.clean(error))].slice(0, 40);
  }

  private availableJourneys() { return this.journeys.map(({ id, title }) => ({ id, title })); }

  flowReport(): BrowserFlowReport { return this.flow.report(); }
  flowProgress() { return this.flow.progress(); }
  async flowProblems(filesHash: string, journeyIds?: readonly string[]) {
    return [...(this.flowPersistenceFailure ? [this.flowPersistenceFailure] : []), ...await this.flow.problems(filesHash, journeyIds)];
  }

  private result(details: Record<string, unknown>, png?: Buffer): Result {
    return { content: [{ type: 'text', text: JSON.stringify(details) }, ...(png ? [{ type: 'image' as const, data: png.toString('base64'), mimeType: 'image/png' as const }] : [])],
      details, isError: Boolean(details.error) };
  }

  private validate(raw: unknown): Input {
    if (!Check(schema, raw)) throw new Error('Invalid fleet_browser input. Use the documented action fields; arbitrary URLs, file paths and scripts are not accepted.');
    const input = raw as Input;
    const fields: Record<string, readonly string[]> = { open: ['viewport'], journey: ['journeyId', 'viewport'], screenshot: ['viewport'], click: ['selector'], type: ['selector', 'text'],
      press: ['selector', 'key'], select: ['selector', 'value'], scroll: ['deltaY'], flow: [], close: [] };
    if (Object.keys(input).some(field => field !== 'action' && !fields[input.action]?.includes(field))) throw new Error('Unsupported field for browser action ' + input.action + '.');
    if (['click', 'type', 'press', 'select'].includes(input.action) && !input.selector) throw new Error('This browser action requires a CSS selector from the latest observation.');
    if (input.selector?.includes('>>')) throw new Error('Use a single CSS selector, without Playwright selector-engine chains.');
    for (const [action, field] of [['type', 'text'], ['press', 'key'], ['select', 'value']] as const) {
      if (input.action === action && input[field] === undefined) throw new Error(action + ' requires ' + field + '.');
    }
    if (input.action === 'journey' && !this.journeys.some(journey => journey.id === input.journeyId)) {
      throw new Error('Choose a frozen journeyId from the available journeys: ' + (this.journeys.map(journey => journey.id).join(', ') || '(none supplied by the host)') + '.');
    }
    return input;
  }

  private async execute(raw: unknown, callSignal?: AbortSignal): Promise<Result> {
    let input: Input;
    try { input = this.validate(raw); } catch (error) { return this.result({ error: errorText(error), journeys: this.availableJourneys() }); }
    if (this.controller.signal.aborted) return this.result({ action: input.action, error: errorText(this.controller.signal.reason) });
    if (callSignal?.aborted) return this.result({ action: input.action, error: 'Browser operation stopped.' });
    if (this.busy) return this.result({ action: input.action, error: 'Another browser action is running. Wait for it to finish before continuing.' });
    this.busy = true;
    // A deadline belongs to one tool call. Time spent editing between calls must
    // neither exhaust a stage's browser nor prevent reopening after a timeout.
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(new Error(`Browser operation exceeded its ${this.timeout / 1000}-second limit.`)), this.timeout);
    const signal = AbortSignal.any([this.controller.signal, deadline.signal, ...(callSignal ? [callSignal] : [])]);
    const cancelled = () => { if (this.active) void this.dispose(this.active); };
    signal.addEventListener('abort', cancelled, { once: true });
    const definition = input.action === 'journey' ? this.journeys.find(journey => journey.id === input.journeyId)! : undefined;
    let journey: JourneyCapture | undefined = definition ? { id: definition.id, status: 'failed', completedSteps: 0, totalSteps: definition.steps.length, detail: '' } : undefined;
    let flowAttempt: BrowserFlowAttempt | undefined;
    try {
      if (input.action === 'flow') {
        const filesHash = this.active?.runtime?.filesHash;
        const report = this.flowReport();
        const compact = { ...report, observations: report.observations.map(({ id, generationId, parentId, viewport, action, route, headings, screenIds, screenshot, reachable, errors }) =>
          ({ id, generationId, parentId, viewport, action, route, headings, screenIds, screenshot, reachable, errors })) };
        const manual = this.active?.flow && !this.active.closed;
        return this.result({ action: 'flow', report: compact, progress: this.flowProgress(), frontier: manual ? this.flow.frontier() : [], requiresManualOpen: !manual,
          ...(filesHash ? { remaining: await this.flowProblems(filesHash) } : {}),
          ...(this.artifacts ? { artifact: this.artifacts.relative.replaceAll(path.sep, '/') + '/flow.json' } : {}),
          scope: 'Host-observed manual UI exploration; frozen journeys independently verify acceptance.' });
      }
      if (input.action === 'close') {
        if (this.active) await this.dispose(this.active);
        this.active = undefined;
        return this.result({ action: 'close', status: 'closed', scope: 'Development observation only; independent verification is still required.' });
      }
      if (this.imageCount >= maxImages || this.imageBytes >= maxTotalImageBytes) throw new Error('Browser observation limit reached. This stage permits at most 100 screenshots and 128 MB of image artifacts.');
      let failure: string | undefined;
      try {
        if (input.action === 'open' || definition) {
          await this.open(input.viewport ?? 'desktop', signal, Boolean(definition?.steps.some(step => step.action === 'expectDownload')));
          if (!definition) this.active!.flow = { id: randomUUID(), viewport: this.viewport };
          if (definition && journey) {
            const generation = this.active!, page = generation.page!;
            for (const step of definition.steps) {
              generation.expectedDownloads = step.action === 'expectDownload' ? 1 : 0;
              generation.expectedDownloadStep = step.action === 'expectDownload' ? journey.completedSteps : undefined;
              try {
                // Host service calls enforce startup/invocation budgets, which may
                // exceed a DOM interaction's timeout. The whole call stays cancellable.
                const hostDeadline = ['expectScreen', 'restartRuntime', 'expectServiceState'].includes(step.action);
                await within(performBrowserStep(page, step, this.stepTimeout, generation.httpEvidence, this.ux, generation.runtime?.routeBase, generation.runtime), hostDeadline ? undefined : this.stepTimeout, signal);
                if (step.action === 'expectDownload' && generation.expectedDownloadUrl) generation.verifiedDownloads.push({ url: generation.expectedDownloadUrl, step: journey.completedSteps });
              } finally { generation.expectedDownloads = 0; generation.expectedDownloadUrl = undefined; generation.expectedDownloadStep = undefined; }
              journey.completedSteps++;
              const overflow = await within(page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) > innerWidth + 1), this.stepTimeout, signal);
              if (overflow) this.record('Horizontal overflow prevents the application fitting the ' + this.viewport + ' viewport.');
            }
          }
        } else {
          const page = this.active?.page;
          if (!page || page.isClosed() || this.active?.closed) throw new Error('Open the application with fleet_browser before interacting with it.');
          if (this.active?.flow && ['click', 'type', 'press', 'select'].includes(input.action)) {
            const before = this.cleanValue(await within(observeBrowserFlow(page, this.ux, this.active.runtime?.routeBase), this.stepTimeout, signal)) as BrowserFlowDom;
            flowAttempt = this.flow.begin(this.active.flow.id, this.viewport, input, before);
          }
          if (input.action === 'screenshot' && input.viewport && input.viewport !== this.viewport) this.flow.clearPending();
          const target = input.selector ? page.locator('css=' + input.selector) : undefined;
          let action: Promise<unknown>;
          switch (input.action) {
            case 'click': action = target!.click({ timeout: this.stepTimeout }); break;
            case 'type': action = target!.fill(input.text!, { timeout: this.stepTimeout }); break;
            case 'press': action = target!.press(input.key!, { timeout: this.stepTimeout }); break;
            case 'select': action = target!.selectOption(input.value!, { timeout: this.stepTimeout }); break;
            case 'scroll': action = page.mouse.wheel(0, input.deltaY ?? 600); break;
            case 'screenshot':
              if (input.viewport) this.viewport = input.viewport;
              action = page.setViewportSize(viewports[this.viewport]); break;
            default: throw new Error('Unsupported browser action.');
          }
          await within(action, this.stepTimeout, signal);
        }
      } catch (error) {
        failure = this.clean((journey ? `Step ${journey.completedSteps + 1}: ` : '') + errorText(error));
      }
      if (signal.aborted) throw signal.reason ?? new Error('Browser operation stopped.');
      if (this.active?.httpEvidence) {
        try { await within(this.active.httpEvidence.flush(), this.stepTimeout, signal); }
        catch (error) { await this.dispose(this.active); throw error; }
      }
      if (journey) {
        const errors = this.errors();
        journey.status = failure || errors.length || journey.completedSteps !== journey.totalSteps ? 'failed' : 'passed';
        journey.detail = (failure ?? (errors.length ? errors.join('\n') : `Completed ${journey.totalSteps} steps at ${viewports[this.viewport].width}×${viewports[this.viewport].height}; no browser errors or horizontal overflow.`)).slice(0, 2000);
      }
      const page = this.active?.page;
      if (!page || page.isClosed() || this.active?.closed) {
        if (this.active) await this.dispose(this.active);
        return this.result({ action: input.action, ...(journey ? { journey } : {}), error: failure ?? 'The application browser is closed.', errors: this.errors() });
      }
      return await this.observe(page, input.action, signal, failure, journey, flowAttempt);
    } catch (error) {
      this.flow.clearPending();
      if (signal.aborted && this.active) await this.dispose(this.active);
      const failure = this.clean(errorText(error));
      if (journey) journey = { ...journey, status: 'failed', detail: failure };
      return this.result({ action: input.action, ...(journey ? { journey } : {}), error: failure, errors: this.errors() });
    } finally {
      clearTimeout(timer); signal.removeEventListener('abort', cancelled); this.busy = false;
    }
  }

  private async open(viewport: keyof typeof viewports, signal: AbortSignal, expectedDownloads = false) {
    this.flow.clearPending();
    if (this.active) await this.dispose(this.active);
    signal.throwIfAborted();
    this.events = [];
    this.diagnostics = [];
    this.viewport = viewport;
    const controller = new AbortController();
    const generation: Generation = { controller, signal: AbortSignal.any([signal, controller.signal]), closed: false,
      expectedDownloads: 0, downloadRequestSteps: new WeakMap(), verifiedDownloads: [], navigationAborts: [] };
    this.active = generation;
    generation.signal.addEventListener('abort', () => { if (!generation.closed) void this.dispose(generation); }, { once: true });
    // Every asynchronous resource acquisition registers disposal of a late result
    // before racing a deadline. Cancelling during install/launch cannot orphan it.
    const preparing = Promise.resolve().then(() => { generation.signal.throwIfAborted(); return this.options.prepare(generation.signal); }).then(async runtime => {
      if (generation.closed || generation.signal.aborted) { await settle(runtime.close()); throw new Error('Browser preparation stopped.'); }
      generation.runtime = runtime; return runtime;
    });
    let runtime: Runtime;
    try { runtime = await within(preparing, 120_000, generation.signal); }
    catch (error) { await this.dispose(generation); throw error; }
    const address = runtimeAddress(runtime.url);
    const proxying = originProxy(address.origin).then(async proxy => {
      if (generation.closed || generation.signal.aborted) { await proxy.close(); throw new Error('Browser launch stopped.'); }
      generation.proxy = proxy; return proxy;
    });
    const proxy = await within(proxying, this.stepTimeout, generation.signal);
    const failures: string[] = [];
    // Use full Chromium: headless-shell's embedder can ignore WebRTC routing preferences.
    const candidates = this.options.executable ? [{ executablePath: this.options.executable }] : [{ channel: 'chromium' }, { channel: 'chrome' }];
    for (const candidate of candidates) {
      generation.signal.throwIfAborted();
      let accepting = true;
      try {
        const launching = chromium.launchServer({ ...candidate, headless: true, chromiumSandbox: true, host: '127.0.0.1', timeout: 5000,
          proxy: { server: proxy.url, bypass: '<-loopback>' }, args: ['--disable-quic', '--webrtc-ip-handling-policy=disable_non_proxied_udp', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'] }).then(async server => {
          if (!accepting || generation.closed || generation.signal.aborted) { await settle(server.kill()); throw new Error('Browser launch stopped.'); }
          generation.server = server; return server;
        });
        const server = await within(launching, 5500, generation.signal);
        const connecting = chromium.connect(server.wsEndpoint(), { timeout: 5000 }).then(async browser => {
          if (!accepting || generation.closed || generation.signal.aborted) { await settle(browser.close()); throw new Error('Browser connection stopped.'); }
          generation.browser = browser; return browser;
        });
        await within(connecting, 5500, generation.signal);
        break;
      } catch (error) {
        accepting = false;
        failures.push(errorText(error));
        if (generation.server) { await settle(generation.server.kill()); generation.server = undefined; }
        generation.browser = undefined;
        generation.signal.throwIfAborted();
      }
    }
    if (!generation.browser) throw new Error('Browser could not start. Install Google Chrome, or run `npm run setup:browser` from the source checkout, then retry. No browser is downloaded during a build.\n' + failures.join('\n').slice(0, 1800));
    const creating = generation.browser.newContext({ viewport: viewports[viewport], acceptDownloads: expectedDownloads, serviceWorkers: 'block', permissions: [] }).then(async context => {
      if (generation.closed || generation.signal.aborted) { await settle(context.close()); throw new Error('Browser context stopped.'); }
      generation.context = context; return context;
    });
    const context = await within(creating, this.stepTimeout, generation.signal);
    context.setDefaultTimeout(this.stepTimeout);
    await within(context.route('**/*', async route => {
      try {
        const url = new URL(route.request().url());
        if (url.origin === address.origin && !url.username && !url.password) {
          if (url.pathname === '/favicon.ico') await route.fulfill({ status: 204 });
          else await route.continue();
        } else { this.record('Blocked resource outside the application origin: ' + url.href.slice(0, 500)); await route.abort('blockedbyclient'); }
      } catch { await route.abort().catch(() => {}); }
    }), this.stepTimeout, generation.signal);
    await within(context.routeWebSocket(/.*/, async socket => {
      this.record('Blocked WebSocket: ' + socket.url().slice(0, 500));
      await socket.close({ code: 1008, reason: 'WebSockets are unavailable in development browser sessions.' }).catch(() => {});
    }), this.stepTimeout, generation.signal);
    context.on('page', opened => {
      if (!generation.page) { generation.page = opened; return; }
      this.record('Blocked application popup.'); void opened.close().catch(() => {});
    });
    const page = await within(context.newPage(), this.stepTimeout, generation.signal);
    generation.page = page;
    generation.httpEvidence = await within(BrowserHttpEvidence.attach(page), this.stepTimeout, generation.signal);
    page.on('pageerror', error => this.record('Browser error: ' + error.message));
    page.on('console', entry => { if (!generation.httpEvidence!.captureConsole(entry)) this.record(entry.text(), entry.type()); });
    // Attribute diagnostics to application requests, not Chrome's own background
    // services. The proxy blocks both; page events also cover redirect hops.
    page.on('request', request => {
      if (generation.expectedDownloadStep !== undefined) generation.downloadRequestSteps.set(request, generation.expectedDownloadStep);
      try {
        const url = new URL(request.url());
        if (url.origin !== address.origin && url.protocol !== 'data:' && url.protocol !== 'blob:') this.record('Blocked resource outside the application origin: ' + url.href.slice(0, 500));
      } catch { /* A malformed request is blocked by routing/proxy policy. */ }
    });
    page.on('requestfailed', request => {
      const failure = request.failure()?.errorText ?? '';
      const message = 'Request failed: ' + request.url().slice(0, 500) + ' ' + failure;
      const step = generation.downloadRequestSteps.get(request);
      if (step !== undefined && request.isNavigationRequest() && failure === 'net::ERR_ABORTED') {
        if (generation.navigationAborts.length < 140) generation.navigationAborts.push({ url: request.url(), step, message: this.clean(message) });
        else this.record('The application exceeded the browser navigation failure limit.');
      } else this.record(message);
    });
    page.on('dialog', dialog => { this.record('Dismissed ' + dialog.type() + ' dialog: ' + dialog.message()); void dialog.dismiss().catch(() => {}); });
    page.on('download', download => {
      if (generation.expectedDownloads > 0) { generation.expectedDownloads--; generation.expectedDownloadUrl = download.url(); return; }
      this.record('Blocked download: ' + download.suggestedFilename()); void download.cancel().catch(() => {});
    });
    await within(page.goto(address.href, { waitUntil: 'load', timeout: this.stepTimeout }), this.stepTimeout, generation.signal);
  }

  private async artifactDirectory() {
    const base = await fs.realpath(this.options.root);
    const folder = path.join(base, '.browser-observations');
    await fs.mkdir(folder, { recursive: true, mode: 0o700 });
    const assertDirectory = async (directory: string) => {
      const stat = await fs.lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(directory) !== directory) throw new Error('Browser observations must use ordinary workspace directories, without symlinks.');
    };
    await assertDirectory(folder);
    if (!this.artifacts) {
      const relative = path.join('.browser-observations', randomUUID());
      await fs.mkdir(path.join(base, relative), { mode: 0o700 });
      this.artifacts = { base, relative };
    }
    if (this.artifacts.base !== base) throw new Error('Browser workspace location changed during the session.');
    await assertDirectory(path.join(base, this.artifacts.relative));
    return this.artifacts;
  }

  private async saveImage(png: Buffer, signal: AbortSignal) {
    signal.throwIfAborted();
    if (png.length > maxImageBytes || this.imageCount >= maxImages || this.imageBytes + png.length > maxTotalImageBytes) throw new Error('Browser screenshot exceeds the observation image limits (8 MB/image, 100 images, 128 MB total).');
    const { base, relative } = await this.artifactDirectory();
    const name = createHash('sha256').update(png).digest('hex').slice(0, 12) + '-' + randomUUID() + '.png';
    const target = path.join(base, relative, name), temporary = target + '.tmp';
    const handle = await fs.open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try {
      signal.throwIfAborted();
      await handle.writeFile(png, { signal });
      await handle.close();
      await this.artifactDirectory();
      signal.throwIfAborted();
      await fs.rename(temporary, target);
      if (signal.aborted) { await fs.rm(target, { force: true }); signal.throwIfAborted(); }
    } catch (error) { await handle.close().catch(() => {}); await fs.rm(temporary, { force: true }).catch(() => {}); throw error; }
    this.imageCount++; this.imageBytes += png.length;
    return path.join(relative, name).replaceAll(path.sep, '/');
  }

  private async saveFlow(signal: AbortSignal) {
    const { base, relative } = await this.artifactDirectory();
    const report = this.flowReport(), bytes = Buffer.from(JSON.stringify(report));
    if (bytes.length > 4_000_000) throw new Error('UI flow evidence reached its 4 MB limit.');
    const target = path.join(base, relative, 'flow.json'), temporary = target + '.' + randomUUID() + '.tmp';
    const handle = await fs.open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try {
      await handle.writeFile(bytes, { signal }); await handle.close();
      await this.artifactDirectory(); signal.throwIfAborted();
      await fs.rename(temporary, target);
      signal.throwIfAborted();
      await this.options.onFlow?.(report);
    } finally { await handle.close().catch(() => {}); await fs.rm(temporary, { force: true }).catch(() => {}); }
  }

  private async observe(page: Page, action: string, signal: AbortSignal, failure?: string, journey?: JourneyCapture, flowAttempt?: BrowserFlowAttempt) {
    let summary: BrowserFlowDom = { route: '', pageText: '', controls: [], headings: [], screens: [], screenIds: [], content: [] };
    let png: Buffer | undefined, screenshot: string | undefined;
    const observationErrors: string[] = [];
    const snapshot = () => within(observeBrowserFlow(page, this.ux, this.active?.runtime?.routeBase), Math.min(this.stepTimeout, 2000), signal);
    // Route/root/control alignment must be stable across the PNG. Live text such
    // as a clock need not freeze to inspect a screen; action evidence separately
    // excludes text that was already changing before activation.
    const fingerprint = ({ route, controls, screens }: BrowserFlowDom) => JSON.stringify({ route, controls, screens });
    // A navigation or async update can land between DOM extraction and the PNG.
    // Retry once so graph nodes cannot pair one screen's DOM with another image.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        summary = await snapshot();
        png = await within(page.screenshot({ animations: 'disabled', fullPage: false, type: 'png', timeout: Math.min(this.stepTimeout, 3000) }), Math.min(this.stepTimeout, 3000), signal);
        const after = await snapshot();
        if (fingerprint(summary) !== fingerprint(after)) {
          summary = after;
          if (attempt === 0) continue;
          throw new Error('The screen changed while capturing its screenshot. Take a new observation once the result is visible.');
        }
        break;
      } catch (error) {
        if (attempt === 0 && /Execution context was destroyed|Cannot find context with specified id/.test(errorText(error))) continue;
        observationErrors.push('Page observation: ' + errorText(error)); break;
      }
    }
    if (png) {
      try { screenshot = await within(this.saveImage(png, signal), this.stepTimeout, signal); }
      catch (error) { png = undefined; observationErrors.push('Screenshot: ' + errorText(error)); }
    }
    try { if (this.active?.httpEvidence) await within(this.active.httpEvidence.flush(), this.stepTimeout, signal); }
    catch (error) { observationErrors.push('HTTP response evidence: ' + errorText(error)); }
    signal.throwIfAborted();
    const hostErrors = () => [...(failure ? [failure] : []), ...this.errors(), ...observationErrors.map(error => this.clean(error))].slice(0, 40).map(error => error.slice(0, 2000));
    const updateJourney = () => {
      if (journey && hostErrors().length) journey = { ...journey, status: 'failed', detail: hostErrors().join('\n').slice(0, 2000) };
    };
    updateJourney();
    let captureId: string | undefined;
    // A failed frozen journey is useful review evidence. It must retain its host
    // result and errors so it cannot be mistaken for a successful acceptance run.
    if ((!failure || journey) && !observationErrors.length && screenshot && png && this.options.onCapture) {
      try {
        const filesHash = this.active?.runtime?.filesHash;
        if (!filesHash) throw new Error('The prepared browser runtime did not provide its files digest for visual review.');
        await within(Promise.resolve().then(() => this.active?.runtime?.assertIntegrity?.()), this.stepTimeout, signal);
        if (this.active?.httpEvidence) await within(this.active.httpEvidence.flush(), this.stepTimeout, signal);
        updateJourney();
        captureId = await within(this.options.onCapture({ viewport: this.viewport, screenshot, filesHash, screenshotHash: createHash('sha256').update(png).digest('hex'), errors: hostErrors(), ...(journey ? { journey } : {}) }), this.stepTimeout, signal);
        if (!captureId) throw new Error('The host did not return a visual review capture identity.');
      } catch (error) { observationErrors.push('Visual review evidence: ' + errorText(error)); }
    }
    signal.throwIfAborted();
    updateJourney();
    if (!journey && this.active?.flow && !this.active.runtime?.filesHash) {
      // Generic inspection runtimes can omit a source digest. They still render,
      // but can never supply evidence for the host's source-bound flow gate.
      this.flowPersistenceFailure = 'UI flow evidence requires the prepared runtime files digest.';
    } else if (!journey && this.active?.flow && screenshot && png) {
      try {
        const filesHash = this.active.runtime?.filesHash;
        if (!filesHash || !/^[a-f0-9]{64}$/.test(filesHash)) throw new Error('UI flow evidence requires the prepared runtime files digest.');
        await within(Promise.resolve().then(() => this.active?.runtime?.assertIntegrity?.()), this.stepTimeout, signal);
        signal.throwIfAborted();
        this.flow.record({ ...this.cleanValue(summary) as BrowserFlowDom, id: randomUUID(), generationId: this.active.flow.id,
          openedViewport: this.active.flow.viewport, viewport: this.viewport, action, filesHash, screenshot,
          screenshotHash: createHash('sha256').update(png).digest('hex'), capturedAt: new Date().toISOString(), errors: hostErrors() }, flowAttempt);
        await within(this.saveFlow(signal), this.stepTimeout, signal);
        this.flowPersistenceFailure = undefined;
      } catch (error) {
        this.flow.clearPending();
        this.flowPersistenceFailure = 'UI flow evidence: ' + errorText(error);
        observationErrors.push(this.flowPersistenceFailure);
      }
    }
    const details = {
      action, url: this.clean(page.url()), viewport: this.viewport, dimensions: viewports[this.viewport], ...(screenshot ? { screenshot } : {}),
      ...(['open', 'journey'].includes(action) ? { journeys: this.availableJourneys() } : {}),
      ...(journey ? { journey } : {}),
      ...(captureId ? { captureId } : {}),
      pageText: this.clean(summary.pageText), controls: this.cleanValue(summary.controls),
      route: this.clean(summary.route), screenIds: summary.screenIds, flow: this.flowProgress(),
      ...(this.flowPersistenceFailure ? { flowEvidenceError: this.flowPersistenceFailure } : {}),
      console: this.events.filter(event => event.type === 'console').map(({ level, message }) => ({ level, message })),
      errors: hostErrors(),
      ...((failure || observationErrors.length || journey?.status === 'failed') ? { error: failure ?? (observationErrors.length ? 'The browser observation could not be fully captured.' : journey!.detail) } : {}),
      scope: 'Development observation only; independent verification is still required.',
    };
    return this.result(details, png);
  }

  private dispose(generation: Generation) {
    if (generation.closing) return generation.closing;
    generation.closed = true;
    this.flow.clearPending();
    generation.controller.abort(new Error('Browser runtime closed.'));
    generation.closing = (async () => {
      // Kill the process before context cleanup: a page can run an infinite loop.
      await Promise.all([
        generation.server ? settle(generation.server.kill()) : Promise.resolve(),
        generation.proxy ? settle(generation.proxy.close()) : Promise.resolve(),
        generation.runtime ? settle(Promise.resolve().then(() => generation.runtime!.close()), 1500) : Promise.resolve(),
      ]);
      if (generation.httpEvidence) await settle(generation.httpEvidence.dispose(), 300);
      if (generation.context) await settle(generation.context.close(), 300);
    })();
    return generation.closing;
  }

  private stop(reason: Error) {
    if (this.closing) return this.closing;
    this.controller.abort(reason);
    this.options.signal.removeEventListener('abort', this.aborted);
    this.closing = this.active ? this.dispose(this.active) : Promise.resolve();
    return this.closing;
  }

  /** Permanently release this stage's browser. Tool action close permits reopening. */
  close(): Promise<void> { return this.stop(new Error('Browser session closed.')); }
}
