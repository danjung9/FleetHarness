import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ConnectorAdapter, ConnectorKind, ConnectUi, ContextItem, FetchOptions, SecretStore } from './types.js';

/** Only supplied by fixture code, never copied from saved connection settings. */
export interface OAuthTestOptions {
  authorizationUrl?: string;
  tokenUrl?: string;
  deviceCodeUrl?: string;
  revokeUrl?: string;
  requestTimeoutMs?: number;
  signInTimeoutMs?: number;
  fetchTimeoutMs?: number;
}
export interface OAuthProvider {
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  deviceCodeUrl?: string;
  revokeUrl?: string;
  scopes: string[];
  accountLabel: string;
  cloud?: string;
  deviceFallback?: boolean;
  redirectHost?: '127.0.0.1' | 'localhost';
  authorizationParams?: Record<string, string>;
}
export interface Credentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  cloud?: string;
}
export type Json = Record<string, any>;
const MESSAGES = {
  network: 'The service could not be reached. Check your connection and try again.',
  timeout: 'The service took too long to respond. Try again in a moment.',
  cancelled: 'The connection was cancelled. Connect again when you are ready.',
  signin: 'Your sign-in has expired. Connect this account again.',
  approval: 'Your organization has to approve AppYard before it can read this account. Ask your administrator to approve the listed read-only permissions.',
  busy: 'The service is receiving too many requests. Wait a minute and try again.',
  invalid: 'The service returned data AppYard could not read. Try again or ask your administrator for help.',
  secret: 'AppYard could not access secure account storage. Unlock your system keychain and try again.',
};
export class ConnectorError extends Error {}
class BrowserUnavailable extends ConnectorError {}
export const problem = (message: keyof typeof MESSAGES) => new ConnectorError(MESSAGES[message]);
export function object(value: unknown): Json { return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {}; }
export function string(value: unknown): string { return typeof value === 'string' ? value : ''; }
export function array(value: unknown): Json[] { return Array.isArray(value) ? value.map(object) : []; }

export function validateTestOptions(testOnly?: OAuthTestOptions): void {
  if (testOnly && process.env.NODE_ENV !== 'test') throw new ConnectorError('Test server settings are disabled. Use the normal account configuration.');
}
export function testEndpoint(normal: string, override?: string): string {
  if (override === undefined) return normal;
  let url: URL;
  try { url = new URL(override); } catch { throw problem('invalid'); }
  if (process.env.NODE_ENV !== 'test' || !['http:', 'https:'].includes(url.protocol)
    || !['127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.hash || url.search) {
    throw new ConnectorError('Test servers must use a local loopback address. Correct the test configuration.');
  }
  return url.href.replace(/\/$/, '');
}
function check(signal: AbortSignal): void { if (signal.aborted) throw problem('cancelled'); }
export function interruptible<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(problem('cancelled'));
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(problem('cancelled')); };
    const cleanup = () => signal.removeEventListener('abort', abort);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}
async function delay(ms: number, signal: AbortSignal): Promise<void> {
  check(signal);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
    const abort = () => { clearTimeout(timer); cleanup(); reject(problem('cancelled')); };
    const cleanup = () => signal.removeEventListener('abort', abort);
    signal.addEventListener('abort', abort, { once: true });
  });
}
interface Reply { status: number; headers: Headers; text: string }
/** Reads the body under the same deadline as the headers, with a hard byte cap. */
async function request(url: string, init: RequestInit, signal: AbortSignal, timeoutMs: number, maxBytes = 8 * 1024 * 1024): Promise<Reply> {
  check(signal);
  const deadline = AbortSignal.timeout(timeoutMs);
  const combined = AbortSignal.any([signal, deadline]);
  try {
    const response = await fetch(url, { ...init, redirect: init.redirect ?? 'error', signal: combined });
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    if (Number(response.headers.get('content-length')) > maxBytes) {
      await reader?.cancel();
      throw new ConnectorError('This response is too large to read safely. Choose fewer items or a smaller file.');
    }
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          await reader.cancel();
          throw new ConnectorError('This response is too large to read safely. Choose fewer items or a smaller file.');
        }
        chunks.push(value);
      }
    }
    return { status: response.status, headers: response.headers, text: Buffer.concat(chunks).toString('utf8') };
  } catch (error) {
    if (signal.aborted) throw problem('cancelled');
    if (deadline.aborted) throw problem('timeout');
    if (error instanceof ConnectorError) throw error;
    throw problem('network');
  }
}
function json(reply: Reply): Json {
  try {
    const value = JSON.parse(reply.text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw problem('invalid');
    return value;
  } catch { throw problem('invalid'); }
}
function httpError(status: number): ConnectorError {
  if (status === 401) return problem('signin');
  if (status === 403) return problem('approval');
  if (status === 429) return problem('busy');
  if (status >= 500) return new ConnectorError('The service is temporarily unavailable. Try again in a moment.');
  return problem('invalid');
}
function oauthError(data: Json): ConnectorError {
  if (data.error === 'access_denied' || data.error === 'authorization_declined') return new ConnectorError('Sign-in was not approved. Connect again and approve read-only access if you want to continue.');
  if (data.error === 'consent_required' || data.error === 'interaction_required'
    || (Array.isArray(data.error_codes) && data.error_codes.some((code: unknown) => [65001, 90094, 90093].includes(Number(code))))) return problem('approval');
  if (data.error === 'invalid_client' || data.error === 'unauthorized_client') return new ConnectorError('AppYard is not registered for this account. Ask your administrator to check the client ID and account cloud.');
  return problem('signin');
}

async function authorizationCode(provider: OAuthProvider, ui: ConnectUi, signal: AbortSignal): Promise<{ code: string; verifier: string; redirectUri: string }> {
  check(signal);
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  let redirectUri = '';
  let accept!: (code: string) => void;
  let fail!: (error: Error) => void;
  const result = new Promise<string>((resolve, reject) => { accept = resolve; fail = reject; });
  void result.catch(() => {});
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    let url: URL;
    try { url = new URL(req.url ?? '/', 'http://127.0.0.1'); }
    catch { res.writeHead(400); res.end('Sign-in could not be checked. Return to AppYard.'); return; }
    if (req.method !== 'GET' || url.pathname !== '/oauth/callback' || req.headers.host !== new URL(redirectUri).host
      || url.searchParams.getAll('state').length !== 1 || url.searchParams.get('state') !== state) {
      res.writeHead(400); res.end('Sign-in could not be checked. Return to AppYard and try again.'); return;
    }
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    if (error) {
      res.writeHead(400); res.end('Sign-in was not completed. Return to AppYard.');
      fail(oauthError({ error }));
    } else if (!code || code.length > 8192 || url.searchParams.getAll('code').length !== 1) {
      res.writeHead(400); res.end('Sign-in was not completed. Return to AppYard.'); fail(problem('invalid'));
    } else { res.end('Sign-in complete. You can close this page and return to AppYard.'); accept(code); }
  });
  try {
    await interruptible(new Promise<void>((resolve, reject) => {
      server.once('error', () => reject(new BrowserUnavailable('AppYard could not open the local sign-in callback. Try again or ask your administrator for help.')));
      server.listen({ port: 0, host: '127.0.0.1', signal }, () => resolve());
    }), signal);
    redirectUri = `http://${provider.redirectHost ?? '127.0.0.1'}:${(server.address() as AddressInfo).port}/oauth/callback`;
    const url = new URL(provider.authorizationUrl);
    for (const [key, value] of Object.entries(provider.authorizationParams ?? {})) url.searchParams.set(key, value);
    for (const [key, value] of Object.entries({ response_type: 'code', client_id: provider.clientId, redirect_uri: redirectUri,
      scope: provider.scopes.join(' '), state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' })) url.searchParams.set(key, value);
    try { await interruptible(ui.openBrowser(url.href), signal); }
    catch { check(signal); throw new BrowserUnavailable('The sign-in page could not be opened. Check your default browser and connect again.'); }
    return { code: await interruptible(result, signal), verifier, redirectUri };
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

/** Shared secure sign-in, refresh, bounded HTTP and safe error handling. */
export abstract class OAuthConnector implements ConnectorAdapter {
  abstract kind: ConnectorKind;
  abstract label: string;
  abstract plainSummary: string;
  protected readonly testOnly?: OAuthTestOptions;
  private lifetime = new AbortController();
  private readonly refreshes = new WeakMap<SecretStore, Promise<Credentials>>();
  private readonly sensitive = new Set<string>();
  constructor(testOnly?: OAuthTestOptions) { validateTestOptions(testOnly); this.testOnly = testOnly; }
  abstract available(): boolean;
  protected abstract provider(cloud?: string): OAuthProvider;
  protected async chooseProvider(_ui: ConnectUi, _signal: AbortSignal): Promise<OAuthProvider> { return this.provider(); }
  protected abstract read(secrets: SecretStore, options: FetchOptions, credentials: Credentials): Promise<ContextItem[]>;
  private key(): string { return `connectors:${this.kind}:oauth`; }
  private get timeout(): number { return this.testOnly?.requestTimeoutMs ?? 15_000; }
  private remember(credentials: Credentials): void {
    this.sensitive.add(credentials.accessToken);
    if (credentials.refreshToken) this.sensitive.add(credentials.refreshToken);
  }
  private async load(secrets: SecretStore): Promise<Credentials> {
    let raw: string | undefined;
    try { raw = await secrets.get(this.key()); } catch { throw problem('secret'); }
    if (!raw) throw problem('signin');
    try {
      const value = JSON.parse(raw) as Credentials;
      if (!value || !string(value.accessToken) || !Number.isFinite(value.expiresAt)
        || (value.refreshToken !== undefined && !string(value.refreshToken))) throw problem('signin');
      this.remember(value);
      return value;
    } catch { throw problem('signin'); }
  }
  private async save(secrets: SecretStore, credentials: Credentials, signal: AbortSignal): Promise<void> {
    check(signal);
    this.remember(credentials);
    try { await secrets.set(this.key(), JSON.stringify(credentials)); } catch { throw problem('secret'); }
    if (signal.aborted) {
      try { await secrets.remove(this.key()); } catch { throw problem('secret'); }
      check(signal);
    }
  }
  private credentials(data: Json, provider: OAuthProvider, previous?: Credentials): Credentials {
    const seconds = Number(data.expires_in);
    if (!string(data.access_token) || !Number.isFinite(seconds) || seconds <= 0 || string(data.token_type).toLowerCase() !== 'bearer') throw problem('invalid');
    if (typeof data.scope === 'string') {
      const names = new Set(data.scope.split(/\s+/).map((scope: string) => scope.slice(scope.lastIndexOf('/') + 1).toLowerCase()));
      if (provider.scopes.some(scope => scope !== 'offline_access' && !names.has(scope.slice(scope.lastIndexOf('/') + 1).toLowerCase()))) {
        throw new ConnectorError('The account did not grant the required read-only access. Connect again and approve the listed permissions.');
      }
    }
    return { accessToken: data.access_token, refreshToken: string(data.refresh_token) || previous?.refreshToken,
      expiresAt: Date.now() + Math.min(seconds, 365 * 86400) * 1000, cloud: provider.cloud };
  }
  private async token(provider: OAuthProvider, fields: Record<string, string>, signal: AbortSignal): Promise<Json> {
    const reply = await this.retryRequest(provider.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: provider.clientId, ...fields }) }, signal, 128 * 1024);
    if (reply.status === 403) throw problem('approval');
    const data = json(reply);
    if (reply.status < 200 || reply.status >= 300 || data.error) throw oauthError(data);
    return data;
  }
  private async device(provider: OAuthProvider, ui: ConnectUi, signal: AbortSignal): Promise<Json> {
    if (!provider.deviceCodeUrl) throw problem('signin');
    const reply = await this.retryRequest(provider.deviceCodeUrl, { method: 'POST', body: new URLSearchParams({ client_id: provider.clientId, scope: provider.scopes.join(' ') }) }, signal, 128 * 1024);
    if (reply.status === 403) throw problem('approval');
    const data = json(reply);
    if (reply.status < 200 || reply.status >= 300) throw oauthError(data);
    const deviceCode = string(data.device_code), userCode = string(data.user_code);
    let verify: URL;
    try { verify = new URL(string(data.verification_uri) || string(data.verification_url)); } catch { throw problem('invalid'); }
    const allowed = provider.authorizationUrl.startsWith('http://127.0.0.1:')
      ? verify.origin === new URL(provider.authorizationUrl).origin
      : verify.protocol === 'https:' && ['microsoft.com', 'www.microsoft.com', 'login.microsoftonline.us', 'login.microsoftonline.com'].includes(verify.hostname);
    if (!allowed || verify.username || verify.password || verify.search || verify.hash || !deviceCode || !userCode || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0) throw problem('invalid');
    this.sensitive.add(deviceCode);
    ui.showCode(userCode, verify.href);
    try { await interruptible(ui.openBrowser(verify.href), signal); } catch { check(signal); }
    let interval = Math.max(1, Number(data.interval) || 5) * 1000;
    const expires = Date.now() + Math.min(Number(data.expires_in), 1800) * 1000;
    while (Date.now() < expires) {
      await delay(Math.min(interval, Math.max(1, expires - Date.now())), signal);
      if (Date.now() >= expires) break;
      const poll = await this.retryRequest(provider.tokenUrl, { method: 'POST', body: new URLSearchParams({ client_id: provider.clientId,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: deviceCode }) }, signal, 128 * 1024);
      if (poll.status === 403) throw problem('approval');
      const value = json(poll);
      if (value.error === 'authorization_pending') continue;
      if (value.error === 'slow_down') { interval += 5000; continue; }
      if (poll.status < 200 || poll.status >= 300 || value.error) throw oauthError(value);
      return value;
    }
    throw new ConnectorError('The sign-in code expired. Connect again to get a new code.');
  }
  async connect(secrets: SecretStore, ui: ConnectUi, signal: AbortSignal): Promise<{ accountLabel: string }> {
    if (!this.available()) throw new ConnectorError('Account sign-in is not configured. Ask your administrator to turn this on.');
    const timeout = AbortSignal.timeout(this.testOnly?.signInTimeoutMs ?? 300_000);
    const combined = AbortSignal.any([signal, this.lifetime.signal, timeout]);
    try {
      check(combined);
      const provider = await this.chooseProvider(ui, combined);
      if (!provider.clientId.trim()) throw new ConnectorError('This account cloud is not configured. Ask your administrator to register AppYard in that cloud.');
      let data: Json;
      try {
        const { code, verifier, redirectUri } = await authorizationCode(provider, ui, combined);
        this.sensitive.add(code);
        data = await this.token(provider, { grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirectUri }, combined);
      } catch (error) {
        if (!(error instanceof BrowserUnavailable) || !provider.deviceFallback) throw error;
        data = await this.device(provider, ui, combined);
      }
      await this.save(secrets, this.credentials(data, provider), combined);
      return { accountLabel: provider.accountLabel };
    } catch (error) {
      if (timeout.aborted && !signal.aborted) throw new ConnectorError('Sign-in took too long. Connect again when you are ready.');
      if (error instanceof ConnectorError) throw error;
      throw problem('invalid');
    }
  }
  private async refresh(secrets: SecretStore, old: Credentials, signal: AbortSignal): Promise<Credentials> {
    const existing = this.refreshes.get(secrets);
    if (existing) return interruptible(existing, signal);
    const operation = (async () => {
      const latest = await this.load(secrets);
      if (latest.accessToken !== old.accessToken && latest.expiresAt > Date.now() + 60_000) return latest;
      if (!latest.refreshToken) throw problem('signin');
      const provider = this.provider(latest.cloud);
      const data = await this.token(provider, { grant_type: 'refresh_token', refresh_token: latest.refreshToken }, signal);
      const updated = this.credentials(data, provider, latest);
      await this.save(secrets, updated, signal);
      return updated;
    })();
    this.refreshes.set(secrets, operation);
    try { return await operation; } finally { this.refreshes.delete(secrets); }
  }
  protected async retryRequest(url: string, init: RequestInit, signal: AbortSignal, cap?: number): Promise<Reply> {
    let reply = await request(url, init, signal, this.timeout, cap);
    if (reply.status === 429) {
      const retry = reply.headers.get('retry-after');
      const seconds = retry === null ? 1 : /^\d+(\.\d+)?$/.test(retry) ? Number(retry) : (Date.parse(retry) - Date.now()) / 1000;
      if (Number.isFinite(seconds) && seconds <= 5) {
        await delay(Math.max(0, seconds * 1000), signal);
        reply = await request(url, init, signal, this.timeout, cap);
      }
    }
    if (reply.status === 429 || reply.status >= 500) throw httpError(reply.status);
    return reply;
  }
  protected async api(secrets: SecretStore, url: string, base: string, options: FetchOptions, text = false, headers: Record<string, string> = {}, cap?: number, downloadAllowed?: (url: URL) => boolean): Promise<any> {
    const target = new URL(url), root = new URL(base);
    if (target.origin !== root.origin || (target.pathname !== root.pathname && !target.pathname.startsWith(root.pathname.replace(/\/$/, '') + '/'))
      || target.username || target.password || target.hash) throw new ConnectorError('The service returned an unexpected page address. Reconnect or ask your administrator for help.');
    let credentials = await this.load(secrets);
    if (credentials.expiresAt <= Date.now() + 60_000) credentials = await this.refresh(secrets, credentials, options.signal);
    const send = () => this.retryRequest(target.href, { redirect: downloadAllowed ? 'manual' : 'error', headers: { ...headers, Authorization: `Bearer ${credentials.accessToken}` } }, options.signal, cap);
    let reply = await send();
    if (reply.status === 401) { credentials = await this.refresh(secrets, credentials, options.signal); reply = await send(); }
    let previous = target;
    for (let hop = 0; downloadAllowed && [301, 302, 303, 307, 308].includes(reply.status) && hop < 4; hop++) {
      const next = new URL(reply.headers.get('location') || '', previous);
      if (!reply.headers.get('location') || !downloadAllowed(next) || next.username || next.password || next.hash) {
        throw new ConnectorError('The file service returned an unexpected download address. Ask your administrator for help.');
      }
      // Download links are temporary credentials. Never forward the bearer token.
      reply = await this.retryRequest(next.href, { redirect: 'manual' }, options.signal, cap);
      previous = next;
    }
    if (reply.status < 200 || reply.status >= 300) throw httpError(reply.status);
    return text ? reply.text : json(reply);
  }
  protected cloud(credentials: Credentials): string | undefined { return credentials.cloud; }
  private scrub(value: string): string {
    for (const token of this.sensitive) {
      if (token) for (const form of new Set([token, encodeURIComponent(token)])) value = value.split(form).join('[hidden]');
    }
    return value;
  }
  async fetch(secrets: SecretStore, options: FetchOptions): Promise<ContextItem[]> {
    if (!Number.isSafeInteger(options.maxItems) || options.maxItems < 0 || !Number.isSafeInteger(options.maxBytes) || options.maxBytes < 0
      || (options.sinceDays !== undefined && (!Number.isFinite(options.sinceDays) || options.sinceDays < 0 || options.sinceDays > 36500))) {
      throw new ConnectorError('The selected data limits are invalid. Choose a valid item count, size and date range.');
    }
    if (!options.maxItems || !options.maxBytes) return [];
    const timeout = AbortSignal.timeout(this.testOnly?.fetchTimeoutMs ?? 120_000);
    const signal = AbortSignal.any([options.signal, this.lifetime.signal, timeout]);
    try {
      const credentials = await this.load(secrets);
      const rows = await this.read(secrets, { ...options, signal }, credentials);
      const result: ContextItem[] = [];
      let bytes = 0;
      for (const row of rows) {
        const clean = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, this.scrub(string(value))])) as unknown as ContextItem;
        const length = Buffer.byteLength(JSON.stringify(clean), 'utf8');
        if (bytes + length > options.maxBytes) continue;
        if (result.length >= options.maxItems) break;
        bytes += length; result.push(clean);
      }
      check(signal);
      return result;
    } catch (error) {
      if (timeout.aborted && !options.signal.aborted) throw problem('timeout');
      if (error instanceof ConnectorError) throw error;
      throw problem('invalid');
    }
  }
  async disconnect(secrets: SecretStore): Promise<void> {
    this.lifetime.abort();
    this.lifetime = new AbortController();
    let credentials: Credentials | undefined;
    try { credentials = await this.load(secrets); } catch (error) { if (error instanceof ConnectorError && error.message === MESSAGES.secret) throw error; }
    try { await secrets.remove(this.key()); } catch { throw problem('secret'); }
    if (!credentials) return;
    const provider = this.provider(credentials.cloud);
    if (provider.revokeUrl) {
      try {
        const reply = await request(provider.revokeUrl, { method: 'POST', body: new URLSearchParams({ token: credentials.refreshToken ?? credentials.accessToken }) }, AbortSignal.timeout(this.timeout), this.timeout, 128 * 1024);
        if (reply.status < 200 || reply.status >= 300) throw problem('invalid');
      } catch { throw new ConnectorError('The account was removed from AppYard, but remote access could not be revoked. Remove AppYard in your account permissions.'); }
    }
  }
}

export function plainText(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(?:br|hr)\b[^>]*>|<\/(?:p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_all, entity: string) => {
      const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      if (entity[0] !== '#') return named[entity.toLowerCase()] ?? '';
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    }).replace(/\r\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
export function readableFile(name: string, mime: string): boolean {
  const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  const supported = new Set(['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'log', 'yaml', 'yml', 'ics']);
  return !!extension && supported.has(extension) && (mime.startsWith('text/') || ['application/json', 'application/xml', 'application/yaml', 'application/octet-stream', ''].includes(mime));
}
export function fileText(text: string, name: string, mime: string): string | undefined {
  if (text.includes('\0') || text.includes('\ufffd')) return undefined;
  return mime === 'text/html' || /\.html?$/i.test(name) ? plainText(text) : text;
}
/** Limits count encoded metadata as well as body bytes. Oversized items are omitted whole. */
export class ItemBudget {
  readonly items: ContextItem[] = [];
  private used = 0;
  private readonly ids = new Set<string>();
  constructor(private options: FetchOptions) {}
  get full(): boolean { return this.items.length >= this.options.maxItems || this.used >= this.options.maxBytes; }
  add(item: ContextItem): void {
    const bytes = Buffer.byteLength(JSON.stringify(item), 'utf8');
    if (!this.full && !this.ids.has(item.id) && bytes + this.used <= this.options.maxBytes) {
      this.items.push(item); this.used += bytes; this.ids.add(item.id);
    }
  }
}
export function since(options: FetchOptions): string { return new Date(Date.now() - (options.sinceDays ?? 30) * 86400_000).toISOString(); }
