import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createServer, request as httpRequest, type ClientRequest, type OutgoingHttpHeaders } from 'node:http';
import type { Socket } from 'node:net';
import { chromium, type Browser, type BrowserContext, type BrowserServer, type Page } from 'playwright';
import { Type, type Static } from 'typebox';
import { Check } from 'typebox/value';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import type { VisualCaptureInput } from './visual-review.js';
import { runProcessEnvironment } from './process-sweep.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { redactSecrets } from './secrets.js';

export interface AgentBrowserOptions {
  root: string;
  signal: AbortSignal;
  /** Prepare a fresh host-owned copy of the application's declared runtime files. */
  prepare: (signal: AbortSignal) => Promise<{ url: string; close: () => Promise<void>; redactMessage?: (message: string) => string; filesHash?: string; assertIntegrity?: () => Promise<void> }>;
  /** Record a saved, successful screenshot against the runtime that was actually rendered. */
  onCapture?: (capture: VisualCaptureInput) => Promise<string>;
  executable?: string;
  timeoutMs?: number;
  stepTimeoutMs?: number;
  startupTimeoutMs?: number;
  observationTimeoutMs?: number;
}

const viewports = { desktop: { width: 1280, height: 800 }, narrow: { width: 390, height: 844 } } as const;
const schema = Type.Object({
  action: Type.Union(['open', 'click', 'type', 'press', 'select', 'scroll', 'screenshot', 'close'].map(action => Type.Literal(action))),
  viewport: Type.Optional(Type.Union([Type.Literal('desktop'), Type.Literal('narrow')])),
  selector: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
  text: Type.Optional(Type.String({ maxLength: 20_000 })),
  key: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  value: Type.Optional(Type.String({ maxLength: 2000 })),
  deltaY: Type.Optional(Type.Integer({ minimum: -5000, maximum: 5000 })),
}, { additionalProperties: false });
type Input = Static<typeof schema>;
type Runtime = Awaited<ReturnType<AgentBrowserOptions['prepare']>>;
type Event = { type: 'console' | 'error'; level?: string; message: string };
type Generation = {
  controller: AbortController; signal: AbortSignal; closed: boolean; closing?: Promise<void>;
  runtime?: Runtime; server?: BrowserServer; browser?: Browser; context?: BrowserContext; page?: Page;
  proxy?: { url: string; close: () => Promise<void> };
};
type Result = { content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: 'image/png' })[]; details: Record<string, unknown>; isError: boolean };
const maxImageBytes = 8_000_000, maxImages = 200, maxTotalImageBytes = 128_000_000;
const finalCheckImages = 8;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 1800);

async function within<T>(operation: Promise<T>, timeout: number, signal?: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let aborted: (() => void) | undefined;
  try {
    const stopped = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`Browser operation exceeded its ${timeout / 1000}-second limit.`)), timeout);
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

/** Chromium's route handlers do not intercept every redirect hop. A proxy enforces
 * the same origin at the transport layer, including redirects and CONNECT, while
 * retaining streaming responses and normal same-origin navigation semantics. */
async function originProxy(origin: string) {
  const sockets = new Set<Socket>(), requests = new Set<ClientRequest>();
  const server = createServer((incoming, outgoing) => {
    let target: URL;
    try { target = new URL(incoming.url ?? ''); }
    catch { outgoing.writeHead(400).end(); return; }
    if (target.origin !== origin || target.username || target.password) {
      outgoing.writeHead(403, { 'Content-Type': 'text/plain' }).end('Browser access is limited to the application origin.');
      return;
    }
    const headers: OutgoingHttpHeaders = { ...incoming.headers, host: target.host };
    delete headers['proxy-authorization']; delete headers['proxy-connection'];
    const upstream = httpRequest(target, { method: incoming.method, headers, agent: false }, response => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.on('error', () => outgoing.destroy());
      response.pipe(outgoing);
    });
    requests.add(upstream);
    upstream.on('close', () => requests.delete(upstream));
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    upstream.setTimeout(30_000, () => upstream.destroy());
    incoming.on('aborted', () => upstream.destroy());
    outgoing.on('close', () => upstream.destroy());
    incoming.pipe(upstream);
  });
  server.on('connection', socket => {
    if (sockets.size >= 64) { socket.destroy(); return; }
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
  });
  server.on('connect', (_request, socket) => socket.destroy());
  server.on('upgrade', (_request, socket) => socket.destroy());
  server.on('clientError', (_error, socket) => socket.destroy());
  server.requestTimeout = 30_000;
  try { await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); }
  catch (error) { server.close(); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') { server.close(); throw new Error('Browser proxy failed to start.'); }
  return {
    url: 'http://127.0.0.1:' + address.port,
    close: async () => {
      for (const request of requests) request.destroy();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

/** One stage's interactive browser. Generated code never chooses a URL, browser
 * executable, image path, launch arguments, or JavaScript to evaluate. */
export class AgentBrowserSession {
  private readonly controller = new AbortController();
  private readonly timeout: number;
  private readonly stepTimeout: number;
  private readonly startupTimeout: number;
  private readonly observationTimeout: number;
  private timer?: ReturnType<typeof setTimeout>;
  private active?: Generation;
  private closing?: Promise<void>;
  private busy = false;
  private events: Event[] = [];
  private viewport: keyof typeof viewports = 'desktop';
  private artifacts?: { base: string; relative: string };
  private imageCount = 0;
  private imageBytes = 0;
  private readonly aborted = () => { void this.stop(new Error('Browser session stopped.')); };

  constructor(private readonly options: AgentBrowserOptions) {
    // A build stage can run for 30 minutes of edit and recheck loops, and its final recheck must still work.
    this.timeout = options.timeoutMs ?? 1_800_000;
    this.stepTimeout = options.stepTimeoutMs ?? 10_000;
    this.startupTimeout = options.startupTimeoutMs ?? 30_000;
    this.observationTimeout = options.observationTimeoutMs ?? 10_000;
    for (const [name, value] of Object.entries({ timeoutMs: this.timeout, stepTimeoutMs: this.stepTimeout, startupTimeoutMs: this.startupTimeout, observationTimeoutMs: this.observationTimeout })) {
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid browser session limit: ' + name);
    }
    options.signal.addEventListener('abort', this.aborted, { once: true });
    if (options.signal.aborted) this.aborted();
  }

  tools(): ToolDefinition[] {
    return [{
      name: 'fleet_browser', label: 'Inspect and interact with the application', parameters: schema,
      description: 'Use open to prepare and open the latest application files in a host-managed browser. Open resets runtime and browser state; call it again after edits. Use CSS selectors from returned controls to click, type (replace a field), press a key, or select an option; scroll uses deltaY (default 600). Each action returns an actual PNG image, visible page text/controls, and console/errors. Screenshot can switch desktop/narrow viewport. When visual review is enabled, successful observations also return a captureId for fleet_visual_review. Only the host-provided application origin is accessible; WebSockets, popups, downloads and arbitrary JavaScript are unavailable. Observations help development and do not replace independent verification. Close releases the preview.',
      execute: async (_id, raw, signal) => this.execute(raw, signal),
    }];
  }

  private clean(text: string) {
    try { return redactSecrets(this.active?.runtime?.redactMessage?.(text) ?? text).slice(0, 16_000); }
    catch { return '[Browser text could not be redacted]'; }
  }

  private cleanValue(value: unknown): unknown {
    if (typeof value === 'string') return this.clean(value);
    if (Array.isArray(value)) return value.map(item => this.cleanValue(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.cleanValue(item)]));
    return value;
  }

  private record(message: string, level?: string) {
    this.events.push({ type: level ? 'console' : 'error', ...(level ? { level } : {}), message: this.clean(message.slice(0, 1200)) });
    if (this.events.length > 40) this.events.shift();
  }

  private result(details: Record<string, unknown>, png?: Buffer): Result {
    return { content: [{ type: 'text', text: JSON.stringify(details) }, ...(png ? [{ type: 'image' as const, data: png.toString('base64'), mimeType: 'image/png' as const }] : [])],
      details, isError: Boolean(details.error) };
  }

  private validate(raw: unknown): Input {
    if (!Check(schema, raw)) throw new Error('Invalid fleet_browser input. Use the documented action fields; arbitrary URLs, file paths and scripts are not accepted.');
    const input = raw as Input;
    const fields: Record<string, readonly string[]> = { open: ['viewport'], screenshot: ['viewport'], click: ['selector'], type: ['selector', 'text'],
      press: ['selector', 'key'], select: ['selector', 'value'], scroll: ['deltaY'], close: [] };
    if (Object.keys(input).some(field => field !== 'action' && !fields[input.action]?.includes(field))) throw new Error('Unsupported field for browser action ' + input.action + '.');
    if (['click', 'type', 'press', 'select'].includes(input.action) && !input.selector) throw new Error('This browser action requires a CSS selector from the latest observation.');
    if (input.selector?.includes('>>')) throw new Error('Use a single CSS selector, without Playwright selector-engine chains.');
    for (const [action, field] of [['type', 'text'], ['press', 'key'], ['select', 'value']] as const) {
      if (input.action === action && input[field] === undefined) throw new Error(action + ' requires ' + field + '.');
    }
    return input;
  }

  private async execute(raw: unknown, callSignal?: AbortSignal): Promise<Result> {
    let input: Input;
    try { input = this.validate(raw); } catch (error) { return this.result({ error: errorText(error) }); }
    if (this.controller.signal.aborted) return this.result({ action: input.action, error: errorText(this.controller.signal.reason) });
    if (callSignal?.aborted) return this.result({ action: input.action, error: 'Browser operation stopped.' });
    if (this.busy) return this.result({ action: input.action, error: 'Another browser action is running. Wait for it to finish before continuing.' });
    this.busy = true;
    this.timer ??= setTimeout(() => { void this.stop(new Error(`Browser session exceeded its ${this.timeout / 1000}-second limit.`)); }, this.timeout);
    const signal = callSignal ? AbortSignal.any([this.controller.signal, callSignal]) : this.controller.signal;
    const cancelled = () => { if (this.active) void this.dispose(this.active); };
    callSignal?.addEventListener('abort', cancelled, { once: true });
    try {
      if (input.action === 'close') {
        if (this.active) await this.dispose(this.active);
        this.active = undefined;
        return this.result({ action: 'close', status: 'closed', scope: 'Development observation only; independent verification is still required.' });
      }
      if (this.imageCount >= maxImages || this.imageBytes >= maxTotalImageBytes) throw new Error('Browser observation limit reached. This stage permits at most 200 screenshots and 128 MB of image artifacts.');
      let failure: string | undefined;
      try {
        if (input.action === 'open') await this.open(input.viewport ?? 'desktop', signal);
        else {
          const page = this.active?.page;
          if (!page || page.isClosed() || this.active?.closed) throw new Error('Open the application with fleet_browser before interacting with it.');
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
      } catch (error) { failure = this.clean(errorText(error)); }
      if (signal.aborted) throw signal.reason ?? new Error('Browser operation stopped.');
      const page = this.active?.page;
      if (!page || page.isClosed() || this.active?.closed) {
        if (this.active) await this.dispose(this.active);
        return this.result({ action: input.action, error: failure ?? 'The application browser is closed.', errors: this.events.filter(event => event.type === 'error').map(event => event.message) });
      }
      return await this.observe(page, input.action, signal, failure);
    } catch (error) {
      if (signal.aborted && this.active) await this.dispose(this.active);
      return this.result({ action: input.action, error: this.clean(errorText(error)) });
    } finally { callSignal?.removeEventListener('abort', cancelled); this.busy = false; }
  }

  private async open(viewport: keyof typeof viewports, signal: AbortSignal) {
    if (this.active) await this.dispose(this.active);
    signal.throwIfAborted();
    this.events = [];
    this.viewport = viewport;
    const controller = new AbortController();
    const generation: Generation = { controller, signal: AbortSignal.any([signal, controller.signal]), closed: false };
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
    const startupDeadline = Date.now() + this.startupTimeout;
    const startupRemaining = () => Math.max(1, startupDeadline - Date.now());
    const address = runtimeAddress(runtime.url);
    const proxying = originProxy(address.origin).then(async proxy => {
      if (generation.closed || generation.signal.aborted) { await proxy.close(); throw new Error('Browser launch stopped.'); }
      generation.proxy = proxy; return proxy;
    });
    const proxy = await within(proxying, startupRemaining(), generation.signal);
    const failures: string[] = [];
    const candidates = this.options.executable ? [{ executablePath: this.options.executable }] : [{}, { channel: 'chrome' }];
    for (const candidate of candidates) {
      generation.signal.throwIfAborted();
      let accepting = true;
      try {
        const launching = chromium.launchServer({ ...candidate, env: runProcessEnvironment(), headless: true, chromiumSandbox: false, host: '127.0.0.1', timeout: startupRemaining(),
          proxy: { server: proxy.url, bypass: '<-loopback>' }, args: ['--disable-quic', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'] }).then(async server => {
          if (!accepting || generation.closed || generation.signal.aborted) { await settle(server.kill()); throw new Error('Browser launch stopped.'); }
          generation.server = server; return server;
        });
        const server = await within(launching, startupRemaining(), generation.signal);
        const connecting = chromium.connect(server.wsEndpoint(), { timeout: startupRemaining() }).then(async browser => {
          if (!accepting || generation.closed || generation.signal.aborted) { await settle(browser.close()); throw new Error('Browser connection stopped.'); }
          generation.browser = browser; return browser;
        });
        await within(connecting, startupRemaining(), generation.signal);
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
    const creating = generation.browser.newContext({ viewport: viewports[viewport], acceptDownloads: false, serviceWorkers: 'block', permissions: [] }).then(async context => {
      if (generation.closed || generation.signal.aborted) { await settle(context.close()); throw new Error('Browser context stopped.'); }
      generation.context = context; return context;
    });
    const context = await within(creating, startupRemaining(), generation.signal);
    context.setDefaultTimeout(this.stepTimeout);
    await within(context.route('**/*', async route => {
      try {
        const url = new URL(route.request().url());
        if (url.origin === address.origin && !url.username && !url.password) {
          if (url.pathname === '/favicon.ico') await route.fulfill({ status: 204 });
          else await route.continue();
        } else { this.record('Blocked resource outside the application origin: ' + url.href.slice(0, 500)); await route.abort('blockedbyclient'); }
      } catch { await route.abort().catch(() => {}); }
    }), startupRemaining(), generation.signal);
    await within(context.routeWebSocket(/.*/, async socket => {
      this.record('Blocked WebSocket: ' + socket.url().slice(0, 500));
      await socket.close({ code: 1008, reason: 'WebSockets are unavailable in development browser sessions.' }).catch(() => {});
    }), startupRemaining(), generation.signal);
    context.on('page', opened => {
      if (!generation.page) { generation.page = opened; return; }
      this.record('Blocked application popup.'); void opened.close().catch(() => {});
    });
    const page = await within(context.newPage(), startupRemaining(), generation.signal);
    generation.page = page;
    page.on('pageerror', error => this.record('Browser error: ' + error.message));
    page.on('console', entry => this.record(entry.text(), entry.type()));
    // Attribute diagnostics to application requests, not Chrome's own background
    // services. The proxy blocks both; page events also cover redirect hops.
    page.on('request', request => {
      try {
        const url = new URL(request.url());
        if (url.origin !== address.origin && url.protocol !== 'data:' && url.protocol !== 'blob:') this.record('Blocked resource outside the application origin: ' + url.href.slice(0, 500));
      } catch { /* A malformed request is blocked by routing/proxy policy. */ }
    });
    page.on('requestfailed', request => this.record('Request failed: ' + request.url().slice(0, 500) + ' ' + (request.failure()?.errorText ?? '')));
    page.on('dialog', dialog => { this.record('Dismissed ' + dialog.type() + ' dialog: ' + dialog.message()); void dialog.dismiss().catch(() => {}); });
    page.on('download', download => { this.record('Blocked download: ' + download.suggestedFilename()); void download.cancel().catch(() => {}); });
    await within(page.goto(address.href, { waitUntil: 'load', timeout: startupRemaining() }), startupRemaining(), generation.signal);
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

  /** The final visual recheck must fit, however many screenshots the agent used before it. */
  allowFinalCheck() {
    this.imageCount = Math.min(this.imageCount, maxImages - finalCheckImages);
    this.imageBytes = Math.min(this.imageBytes, maxTotalImageBytes - finalCheckImages * maxImageBytes);
  }

  private async saveImage(png: Buffer, signal: AbortSignal) {
    signal.throwIfAborted();
    if (png.length > maxImageBytes || this.imageCount >= maxImages || this.imageBytes + png.length > maxTotalImageBytes) throw new Error('Browser screenshot exceeds the observation image limits (8 MB/image, 200 images, 128 MB total).');
    const { base, relative } = await this.artifactDirectory();
    const name = createHash('sha256').update(png).digest('hex').slice(0, 12) + '-' + randomUUID() + '.png';
    const target = path.join(base, relative, name);
    await this.artifactDirectory();
    signal.throwIfAborted();
    await atomicHostWrite(base, path.join(relative, name), png, { exclusive: true });
    if (signal.aborted) { await fs.rm(target, { force: true }); signal.throwIfAborted(); }
    this.imageCount++; this.imageBytes += png.length;
    return path.join(relative, name).replaceAll(path.sep, '/');
  }

  private async observe(page: Page, action: string, signal: AbortSignal, failure?: string) {
    let summary: { pageText: string; controls: unknown[] } = { pageText: '', controls: [] };
    let png: Buffer | undefined, screenshot: string | undefined;
    const observationErrors: string[] = [];
    try {
      // Fixed host-authored DOM extraction; no model-provided JavaScript executes.
      summary = await within(page.evaluate(() => {
        const compact = (value: string | null | undefined, size = 180) => (value ?? '').replace(/\s+/g, ' ').trim().slice(0, size);
        const selectorFor = (element: Element) => {
          if (element.id) return '#' + CSS.escape(element.id);
          const parts: string[] = [];
          let node: Element | null = element;
          for (let depth = 0; node && depth < 12; depth++, node = node.parentElement) {
            if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
            const tag = node.localName;
            const index = Array.from(node.parentElement?.children ?? []).filter(sibling => sibling.localName === tag).indexOf(node) + 1;
            parts.unshift(tag + (index ? ':nth-of-type(' + index + ')' : ''));
          }
          return parts.join(' > ');
        };
        const controls = Array.from(document.querySelectorAll('button,input,textarea,select,a[href],[role],[contenteditable="true"]')).slice(0, 400)
          .filter(element => element.getClientRects().length > 0).slice(0, 80).map(element => {
            const input = element as HTMLInputElement;
            const labels = input.labels ? Array.from(input.labels).map(label => label.textContent ?? '').join(' ') : '';
            const labelledBy = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).slice(0, 8).map(id => document.getElementById(id)?.textContent ?? '').join(' ');
            const name = compact(element.getAttribute('aria-label') || labelledBy.trim() || labels || element.getAttribute('placeholder') || element.textContent || element.getAttribute('title'));
            return { selector: selectorFor(element).slice(0, 1000), tag: element.localName, role: compact(element.getAttribute('role')), name,
              ...(input.value !== undefined && input.type !== 'password' ? { value: compact(input.value, 300) } : {}),
              ...(input.disabled ? { disabled: true } : {}), ...(input.type === 'checkbox' || input.type === 'radio' ? { checked: input.checked } : {}),
              ...(element.localName === 'select' ? { options: Array.from((element as HTMLSelectElement).options).slice(0, 30).map(option => ({ value: compact(option.value), label: compact(option.label) })) } : {}) };
          });
        return { pageText: compact(document.body?.innerText, 12_000), controls };
      }), this.observationTimeout, signal);
    } catch (error) { observationErrors.push('Page summary: ' + errorText(error)); }
    try {
      png = await within(page.screenshot({ animations: 'disabled', fullPage: false, type: 'png', timeout: this.observationTimeout }), this.observationTimeout, signal);
      screenshot = await within(this.saveImage(png, signal), this.observationTimeout, signal);
    } catch (error) { png = undefined; observationErrors.push('Screenshot: ' + errorText(error)); }
    signal.throwIfAborted();
    let captureId: string | undefined;
    if (!failure && !observationErrors.length && screenshot && png && this.options.onCapture) {
      try {
        const filesHash = this.active?.runtime?.filesHash;
        if (!filesHash) throw new Error('The prepared browser runtime did not provide its files digest for visual review.');
        await this.active?.runtime?.assertIntegrity?.();
        captureId = await this.options.onCapture({ viewport: this.viewport, screenshot, filesHash, screenshotHash: createHash('sha256').update(png).digest('hex') });
        if (!captureId) throw new Error('The host did not return a visual review capture identity.');
      } catch (error) { observationErrors.push('Visual review evidence: ' + errorText(error)); }
    }
    signal.throwIfAborted();
    const details = {
      action, url: this.clean(page.url()), viewport: this.viewport, dimensions: viewports[this.viewport], ...(screenshot ? { screenshot } : {}),
      ...(captureId ? { captureId } : {}),
      pageText: this.clean(summary.pageText), controls: this.cleanValue(summary.controls),
      console: this.events.filter(event => event.type === 'console').map(({ level, message }) => ({ level, message })),
      errors: [...this.events.filter(event => event.type === 'error').map(event => event.message), ...observationErrors.map(error => this.clean(error))],
      ...((failure || observationErrors.length) ? { error: failure ?? 'The browser observation could not be fully captured.' } : {}),
      scope: 'Development observation only; independent verification is still required.',
    };
    return this.result(details, png);
  }

  private dispose(generation: Generation) {
    if (generation.closing) return generation.closing;
    generation.closed = true;
    generation.controller.abort(new Error('Browser runtime closed.'));
    generation.closing = (async () => {
      // Kill the process before context cleanup: a page can run an infinite loop.
      await Promise.all([
        generation.server ? settle(generation.server.kill()) : Promise.resolve(),
        generation.proxy ? settle(generation.proxy.close()) : Promise.resolve(),
        generation.runtime ? settle(Promise.resolve().then(() => generation.runtime!.close()), 1500) : Promise.resolve(),
      ]);
      if (generation.context) await settle(generation.context.close(), 300);
    })();
    return generation.closing;
  }

  private stop(reason: Error) {
    if (this.closing) return this.closing;
    this.controller.abort(reason);
    clearTimeout(this.timer);
    this.options.signal.removeEventListener('abort', this.aborted);
    this.closing = this.active ? this.dispose(this.active) : Promise.resolve();
    return this.closing;
  }

  /** Permanently release this stage's browser. Tool action close permits reopening. */
  close(): Promise<void> { return this.stop(new Error('Browser session closed.')); }
}
