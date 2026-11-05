import type { CDPSession, ConsoleMessage, Page } from 'playwright';

type HttpErrorStep = { selector: string; path: string; method: string; status: number };
type RequestEvidence = {
  id: string; order: number; url: string; method: string; type: string;
  redirected: boolean; status?: number; finished?: boolean; failed?: string;
};
type ResourceError = { text: string; url: string; requestId?: string };
type PendingExpectation = {
  after: number; url: string; method: string; status: number; requestId?: string;
  resolve: (request: RequestEvidence) => void; reject: (error: Error) => void;
};

// Bound retained protocol evidence independently of generated page behavior.
const maxRequests = 1024, maxErrors = 256, maxExpectations = 128;
const maxUrlLength = 16_384, maxDiagnosticLength = 2048, maxRequestIdLength = 256;
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const resourceStatus = (text: string) => /^Failed to load resource: the server responded with a status of (4\d\d)(?: \([^\r\n]*\))?$/.exec(text);
const key = (entry: ResourceError) => JSON.stringify([entry.text, entry.url]);
const isApiRequest = (type: string) => type === 'Fetch' || type === 'XHR';

/** Host-only correlation of explicit HTTP rejection assertions and native
 * Chromium diagnostics. Page-authored console calls never supply this evidence. */
export class BrowserHttpEvidence {
  private readonly requests = new Map<string, RequestEvidence>();
  private readonly consoleErrors: ResourceError[] = [];
  private readonly networkErrors: ResourceError[] = [];
  private readonly expectedRequests = new Set<string>();
  private order = 0;
  private pending?: PendingExpectation;
  private failure?: string;
  private disposed = false;

  private constructor(private readonly page: Page, private readonly session: CDPSession) {}

  static async attach(page: Page): Promise<BrowserHttpEvidence> {
    const session = await page.context().newCDPSession(page);
    const evidence = new BrowserHttpEvidence(page, session);
    session.on('Network.requestWillBeSent', evidence.requested);
    session.on('Network.responseReceived', evidence.responded);
    session.on('Network.loadingFinished', evidence.finished);
    session.on('Network.loadingFailed', evidence.failed);
    session.on('Log.entryAdded', evidence.logged);
    try {
      await session.send('Network.enable');
      await session.send('Log.enable');
      return evidence;
    } catch (error) { await evidence.dispose(); throw error; }
  }

  private stop(message: string) {
    this.failure ??= message;
    this.pending?.reject(new Error(this.failure));
  }

  private readonly requested = (event: { requestId: string; request: { url: string; method: string }; type?: string; redirectResponse?: unknown }) => {
    if (this.disposed) return;
    // Only API requests can fulfill an expectation. Ordinary assets (including
    // large, valid data images) do not need retained request metadata; their
    // native failure diagnostics still pass through the error collector.
    if (!isApiRequest(event.type ?? '') || !/^https?:/.test(event.request.url)) return;
    if (event.requestId.length > maxRequestIdLength || event.request.url.length > maxUrlLength || event.request.method.length > 32) {
      this.stop('Browser HTTP evidence exceeded its request size limit.'); return;
    }
    const earlier = this.requests.get(event.requestId);
    if (!earlier && this.requests.size >= maxRequests) { this.stop('Browser HTTP evidence exceeded its request limit.'); return; }
    const request: RequestEvidence = { id: event.requestId, order: earlier?.order ?? ++this.order,
      url: event.request.url, method: event.request.method, type: event.type ?? '',
      redirected: !!earlier || !!event.redirectResponse };
    this.requests.set(request.id, request);
    const pending = this.pending;
    if (!pending) return;
    if (pending.requestId === request.id && request.redirected) {
      pending.reject(new Error('Expected HTTP error request must not redirect.')); return;
    }
    if (!pending.requestId && request.order > pending.after && !request.redirected &&
      isApiRequest(request.type) && request.url === pending.url && request.method === pending.method) pending.requestId = request.id;
  };

  private readonly responded = (event: { requestId: string; type?: string; response: { status: number; url: string } }) => {
    const request = this.requests.get(event.requestId);
    if (!request || this.disposed) return;
    request.status = event.response.status;
    if (event.type !== request.type || event.response.url !== request.url) request.redirected = true;
    this.checkPending(request);
  };

  private readonly finished = (event: { requestId: string }) => {
    const request = this.requests.get(event.requestId);
    if (!request || this.disposed) return;
    request.finished = true;
    this.checkPending(request);
  };

  private readonly failed = (event: { requestId: string; errorText?: string }) => {
    const request = this.requests.get(event.requestId);
    if (!request || this.disposed) return;
    request.failed = (event.errorText ?? 'Unknown transport failure').slice(0, 500);
    this.checkPending(request);
  };

  private checkPending(request: RequestEvidence) {
    const pending = this.pending;
    if (!pending || pending.requestId !== request.id) return;
    if (request.redirected) pending.reject(new Error('Expected HTTP error request must not redirect.'));
    else if (request.failed) pending.reject(new Error('Expected HTTP error request failed before completing: ' + request.failed));
    else if (request.status !== undefined && request.status !== pending.status) pending.reject(new Error(`Expected HTTP status ${pending.status}, received ${request.status}.`));
    else if (request.status === pending.status && request.finished) pending.resolve(request);
  }

  private readonly logged = ({ entry }: { entry: { source: string; level: string; text: string; url?: string; networkRequestId?: string } }) => {
    if (this.disposed || entry.source !== 'network' || entry.level !== 'error') return;
    if (entry.text.length > maxDiagnosticLength || (entry.url?.length ?? 0) > maxUrlLength || (entry.networkRequestId?.length ?? 0) > maxRequestIdLength) {
      this.stop('Browser HTTP evidence exceeded its diagnostic size limit.'); return;
    }
    if (!resourceStatus(entry.text)) return;
    if (this.networkErrors.length >= maxErrors) { this.stop('Browser HTTP evidence exceeded its diagnostic limit.'); return; }
    this.networkErrors.push({ text: entry.text, url: entry.url ?? '', requestId: entry.networkRequestId });
  };

  /** True means the caller must defer this native error to errors(). */
  captureConsole(entry: ConsoleMessage): boolean {
    if (this.disposed || entry.type() !== 'error' || entry.args().length || !resourceStatus(entry.text())) return false;
    if (entry.text().length > maxDiagnosticLength || entry.location().url.length > maxUrlLength) {
      this.stop('Browser HTTP evidence exceeded its diagnostic size limit.'); return false;
    }
    if (this.consoleErrors.length >= maxErrors) { this.stop('Browser HTTP evidence exceeded its diagnostic limit.'); return false; }
    this.consoleErrors.push({ text: entry.text(), url: entry.location().url });
    return true;
  }

  /** Drain both the host CDP session and Playwright's page session before
   * recording errors(); response/log callbacks can use different sessions. */
  async flush(): Promise<void> {
    if (this.disposed) throw new Error('Browser HTTP evidence is closed.');
    await this.session.send('Runtime.evaluate', { expression: 'void 0', returnByValue: true });
    await this.page.evaluate(() => undefined);
  }

  errors(): string[] {
    const errors = this.failure ? [this.failure] : [];
    const groups = new Map<string, { console: ResourceError[]; network: ResourceError[] }>();
    for (const entry of this.consoleErrors) {
      const group = groups.get(key(entry)) ?? { console: [], network: [] };
      group.console.push(entry); groups.set(key(entry), group);
    }
    for (const entry of this.networkErrors) {
      const group = groups.get(key(entry)) ?? { console: [], network: [] };
      group.network.push(entry); groups.set(key(entry), group);
    }
    for (const group of groups.values()) {
      const claimed = new Set<string>();
      let matched = 0;
      for (const entry of group.network) {
        const request = entry.requestId ? this.requests.get(entry.requestId) : undefined;
        if (request && this.expectedRequests.has(request.id) && !claimed.has(request.id) && !request.redirected &&
          request.finished && !request.failed && isApiRequest(request.type) && request.url === entry.url &&
          request.status === Number(resourceStatus(entry.text)?.[1])) { claimed.add(request.id); matched++; }
      }
      // Each successful assertion excuses one attributed request, never every
      // error sharing its URL/text. Missing console/log counterparts fail closed.
      const unmatched = Math.max(group.console.length, group.network.length) - Math.min(matched, group.console.length);
      if (unmatched > 0) errors.push('Console error: ' + (group.console[0] ?? group.network[0]).text);
    }
    return errors;
  }

  async expectError(step: HttpErrorStep, timeout: number): Promise<void> {
    if (this.disposed) throw new Error('Browser HTTP evidence is closed.');
    if (this.failure) throw new Error(this.failure);
    if (this.pending) throw new Error('An HTTP error assertion is already running.');
    if (!Number.isSafeInteger(timeout) || timeout <= 0) throw new Error('Invalid HTTP error assertion timeout.');
    if (!Number.isSafeInteger(step.status) || step.status < 400 || step.status > 499) throw new Error('Expected HTTP status must be an integer from 400 to 499.');
    if (typeof step.path !== 'string' || step.path.length > 1000 || /[\\\s#]/.test(step.path) || !methods.has(step.method)) {
      throw new Error('Expected HTTP error requires an exact origin-relative path and a supported method.');
    }
    const origin = new URL(this.page.url());
    const target = new URL(step.path, origin);
    if (!/^https?:$/.test(origin.protocol) || !step.path.startsWith('/') || step.path.startsWith('//') ||
      target.origin !== origin.origin || target.hash || target.username || target.password || target.pathname + target.search !== step.path) {
      throw new Error('Expected HTTP error requires an exact same-origin path and supported method.');
    }
    if (this.expectedRequests.size >= maxExpectations) { this.stop('Browser HTTP evidence exceeded its assertion limit.'); throw new Error(this.failure); }
    let resolve!: (request: RequestEvidence) => void, reject!: (error: Error) => void;
    const response = new Promise<RequestEvidence>((done, fail) => { resolve = done; reject = fail; });
    void response.catch(() => {});
    // The initial barrier drains requests already started before this action.
    // Infinity prevents a delayed old event from becoming its candidate.
    const pending: PendingExpectation = { after: Infinity, url: target.href, method: step.method, status: step.status, resolve, reject };
    this.pending = pending;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_resolve, fail) => {
      timer = setTimeout(() => fail(new Error(`Expected HTTP ${step.method} ${step.path} status ${step.status} was not completed within the browser step limit.`)), timeout);
    });
    try {
      await Promise.race([timedOut, (async () => {
        await this.flush();
        if (this.pending !== pending || this.disposed) throw new Error('HTTP error assertion stopped.');
        if (this.failure) throw new Error(this.failure);
        pending.after = this.order;
        const [, request] = await Promise.all([this.page.locator('css=' + step.selector).click({ timeout: Math.max(1, timeout - (Date.now() - started)) }), response]);
        await this.flush();
        if (this.pending !== pending || this.disposed) throw new Error('HTTP error assertion stopped.');
        if (this.failure) throw new Error(this.failure);
        this.expectedRequests.add(request.id);
      })()]);
    } finally {
      clearTimeout(timer);
      if (this.pending === pending) this.pending = undefined;
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.pending?.reject(new Error('Browser HTTP evidence is closed.'));
    this.pending = undefined;
    this.session.off('Network.requestWillBeSent', this.requested);
    this.session.off('Network.responseReceived', this.responded);
    this.session.off('Network.loadingFinished', this.finished);
    this.session.off('Network.loadingFailed', this.failed);
    this.session.off('Log.entryAdded', this.logged);
    await this.session.detach().catch(() => {});
  }
}
