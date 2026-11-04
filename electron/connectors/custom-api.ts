import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import type { ConnectUi, ConnectorAdapter, ContextItem, FetchOptions, SecretStore } from './types.js';

type JsonObject = Record<string, any>;
export type DataServiceAuth = { type: 'none' | 'bearer' | 'basic' } | { type: 'header'; name: string };
interface Connection {
  version: 1;
  url: string;
  label: string;
  auth: DataServiceAuth;
  internalOrigins: string[];
}
export interface DataServicePreview {
  summary: string;
  labels: string[];
  rows: Record<string, unknown>[];
  count: number;
  total?: number;
  hasMore: boolean;
}
export interface DataServiceLimits {
  timeoutMs: number;
  maxResponseBytes: number;
  maxTotalBytes: number;
  maxItems: number;
  maxPages: number;
  maxRequests: number;
  maxRedirects: number;
}
export interface CustomApiOptions {
  address?: string;
  /** Can only reduce the production limits. No transport or address-check bypass. */
  limits?: Partial<DataServiceLimits>;
}
const DEFAULT_LIMITS: DataServiceLimits = {
  timeoutMs: 15_000, maxResponseBytes: 2 * 1024 * 1024,
  maxTotalBytes: 8 * 1024 * 1024, maxItems: 500,
  maxPages: 5, maxRequests: 16, maxRedirects: 4,
};
export const DATA_SERVICE_SECRET_NAMES = {
  connection: 'custom-api:connection', credential: 'custom-api:credential',
} as const;
export const DELIVERED_DATA_SERVICE_HELPER = 'skills/fleet-delivery/appyard-connectors.js';

class ServiceError extends Error {}
function fail(message: string): never { throw new ServiceError(message); }
const messages = {
  address: 'This address cannot be used safely. Paste a service address without a key or sign-in details.',
  blocked: 'This address is reserved for local network or cloud controls. Use a different data service address.',
  internal: 'This service needs your permission to use an internal address. Confirm the internal address to continue.',
  timeout: 'This service took too long to answer. Try again when the service is available.',
  cancelled: 'The connection was stopped. Try again when you are ready.',
  network: 'This service could not be reached. Check the address and try again.',
  large: 'This service returned too much data. Use an address for a smaller set of records.',
  auth: 'This service did not accept the sign-in details. Check them and connect again.',
  html: 'This address returned a web page instead of records. Paste the data address from the service documentation.',
  data: 'This service did not return readable records. Use an address that returns JSON or CSV data.',
  scope: 'This service points to a different address. Connect to that address separately.',
  requests: 'This service needs too many requests to read safely. Use a more direct data address.',
  missing: 'This service is not connected. Connect it before using its data.',
};
function publicError(error: unknown, signal?: AbortSignal): Error {
  if (signal?.aborted) return new ServiceError(messages.cancelled);
  return error instanceof ServiceError ? error : new ServiceError(messages.network);
}
function object(value: unknown): value is JsonObject { return !!value && typeof value === 'object' && !Array.isArray(value); }
async function askPerson(ui: ConnectUi, question: Parameters<ConnectUi['ask']>[0], signal: AbortSignal): Promise<string> {
  if (signal.aborted) fail(messages.cancelled);
  let cancel!: () => void;
  try {
    return await Promise.race([ui.ask(question), new Promise<never>((_resolve, reject) => {
      cancel = () => reject(new ServiceError(messages.cancelled));
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
    })]);
  } finally { signal.removeEventListener('abort', cancel); }
}

export function readableLabel(value: string): string {
  const words = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Records';
}
function safeUrl(value: string, base?: string): URL {
  let url: URL;
  try { url = new URL(value, base); } catch { return fail(messages.address); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(messages.address);
  for (const key of url.searchParams.keys()) {
    if (/(?:key|token|secret|password|passwd|authorization|credential|signature)/i.test(key)) fail(messages.address);
  }
  url.hash = '';
  return url;
}
// IPv4 mapped IPv6 is classified by its IPv4 address, including hexadecimal spellings.
function ipv4(address: string): number[] | undefined {
  if (isIP(address) === 4) return address.split('.').map(Number);
  if (isIP(address) !== 6) return undefined;
  const expanded = ipv6Words(address);
  if (expanded.slice(0, 7).every(n => n === 0) && expanded[7] <= 1) return undefined;
  if (expanded.slice(0, 5).every(n => n === 0) && [0, 0xffff].includes(expanded[5])) {
    return [expanded[6] >> 8, expanded[6] & 255, expanded[7] >> 8, expanded[7] & 255];
  }
  return undefined;
}
function ipv6Words(address: string): number[] {
  let value = address.toLowerCase();
  if (value.includes('.')) {
    const last = value.lastIndexOf(':');
    const parts = value.slice(last + 1).split('.').map(Number);
    value = value.slice(0, last + 1) + ((parts[0] << 8) | parts[1]).toString(16) + ':' + ((parts[2] << 8) | parts[3]).toString(16);
  }
  const halves = value.split('::');
  const left = halves[0] ? halves[0].split(':').map(n => parseInt(n, 16)) : [];
  const right = halves[1] ? halves[1].split(':').map(n => parseInt(n, 16)) : [];
  return halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill(0), ...right] : left;
}
export function classifyDataServiceAddress(address: string): 'public' | 'internal' | 'blocked' {
  const v4 = ipv4(address);
  if (v4) {
    const [a, b, c, d] = v4;
    if (a === 169 && b === 254 || a === 0 || a >= 224 || a === 100 && b === 100 && c === 100 && d === 200
      || a === 168 && b === 63 && c === 129 && d === 16) return 'blocked';
    if (a === 10 || a === 127 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168
      || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19)) return 'internal';
    return 'public';
  }
  if (isIP(address) !== 6) return 'blocked';
  const words = ipv6Words(address);
  // Reject link-local, multicast, transition addresses and the IPv6 metadata address.
  if ((words[0] & 0xffc0) === 0xfe80 || (words[0] & 0xff00) === 0xff00
    || words[0] === 0x2002 || words[0] === 0x2001 && words[1] === 0
    || words[0] === 0x64 && words[1] === 0xff9b
    || words[0] === 0xfd00 && words[1] === 0xec2 && words.slice(2, 7).every(n => n === 0) && words[7] === 0x254) return 'blocked';
  if (words.slice(0, 7).every(n => n === 0) && words[7] <= 1) return words[7] === 0 ? 'blocked' : 'internal';
  return (words[0] & 0xfe00) === 0xfc00 || (words[0] & 0xffc0) === 0xfec0 ? 'internal' : 'public';
}

interface ResponseData { status: number; headers: Record<string, string>; body: string; url: string }
class Requests {
  readonly limits: DataServiceLimits;
  readonly signal: AbortSignal;
  readonly internalOrigins: Set<string>;
  readonly ui?: ConnectUi;
  private requests = 0;
  private bytes = 0;
  private controller = new AbortController();
  private timer: ReturnType<typeof setTimeout>;
  private stop: () => void;
  constructor(limits: DataServiceLimits, signal: AbortSignal, internalOrigins: Set<string>, ui?: ConnectUi) {
    this.limits = limits; this.signal = signal; this.internalOrigins = internalOrigins; this.ui = ui;
    this.stop = () => this.controller.abort();
    signal.addEventListener('abort', this.stop, { once: true });
    if (signal.aborted) this.stop();
    this.timer = setTimeout(this.stop, limits.timeoutMs);
  }
  close() { clearTimeout(this.timer); this.signal.removeEventListener('abort', this.stop); this.stop(); }
  check() {
    if (this.signal.aborted) fail(messages.cancelled);
    if (this.controller.signal.aborted) fail(messages.timeout);
  }
  async wait<T>(promise: Promise<T>): Promise<T> {
    this.check();
    let stop!: () => void;
    try {
      return await Promise.race([promise, new Promise<never>((_resolve, reject) => {
        stop = () => reject(new ServiceError(this.signal.aborted ? messages.cancelled : messages.timeout));
        this.controller.signal.addEventListener('abort', stop, { once: true });
      })]);
    } finally { this.controller.signal.removeEventListener('abort', stop); }
  }
  async ask(question: Parameters<ConnectUi['ask']>[0]): Promise<string> {
    this.check();
    // Network deadlines must not time out a person while they enter their key.
    clearTimeout(this.timer);
    try { return await this.wait(this.ui!.ask(question)); }
    finally { this.timer = setTimeout(this.stop, this.limits.timeoutMs); }
  }
  async get(input: string, auth: DataServiceAuth = { type: 'none' }, credential?: string): Promise<ResponseData> {
    let url = safeUrl(input);
    const origin = url.origin;
    for (let redirects = 0; ; redirects++) {
      this.check();
      if (++this.requests > this.limits.maxRequests) fail(messages.requests);
      if (redirects > this.limits.maxRedirects) fail(messages.requests);
      const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
      if (/^(?:metadata|instance-data)(?:\.|$)/i.test(host)) fail(messages.blocked);
      let addresses: { address: string; family: number }[];
      try { addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await this.wait(lookup(host, { all: true, verbatim: true })); }
      catch (error) { throw publicError(error, this.signal); }
      if (!addresses.length || addresses.some(a => classifyDataServiceAddress(a.address) === 'blocked')) fail(messages.blocked);
      const internal = addresses.some(a => classifyDataServiceAddress(a.address) === 'internal');
      if (internal && !this.internalOrigins.has(url.origin)) {
        if (!this.ui || await this.ask({ id: 'internal-address', label: 'Is this an internal service you want AppYard to read?', options: [{ id: 'no', label: 'No' }, { id: 'yes', label: 'Yes, use this internal service' }] }) !== 'yes') fail(messages.internal);
        this.internalOrigins.add(url.origin);
      }
      if (url.protocol !== 'https:' && (!internal || !this.internalOrigins.has(url.origin))) fail(messages.internal);
      const headers: Record<string, string> = { Accept: 'application/json, text/csv;q=0.9', 'Accept-Encoding': 'identity' };
      if (credential && url.origin === origin) {
        if (auth.type === 'header') headers[validHeader(auth.name)] = credential;
        if (auth.type === 'bearer') headers.Authorization = `Bearer ${credential}`;
        if (auth.type === 'basic') headers.Authorization = `Basic ${credential}`;
      }
      // Pin the validated DNS answer in the actual socket lookup. No second lookup can rebind it.
      const chosen = addresses[0];
      const response = await this.wait(new Promise<ResponseData>((resolve, reject) => {
        const req = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
          method: 'GET', headers, agent: false, signal: this.controller.signal,
          lookup: (_host, options, callback) => options.all ? callback(null, [chosen]) : callback(null, chosen.address, chosen.family),
        }, res => {
          const resultHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) if (value !== undefined) resultHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
          const status = res.statusCode ?? 0;
          if ([301, 302, 303, 307, 308].includes(status)) {
            resolve({ status, headers: resultHeaders, body: '', url: url.href });
            res.destroy();
            return;
          }
          if (Number(res.headers['content-length']) > this.limits.maxResponseBytes) {
            reject(new ServiceError(messages.large)); res.destroy(); return;
          }
          let length = 0;
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => {
            length += chunk.length; this.bytes += chunk.length;
            if (length > this.limits.maxResponseBytes || this.bytes > this.limits.maxTotalBytes) {
              reject(new ServiceError(messages.large)); res.destroy(); return;
            }
            chunks.push(chunk);
          });
          res.on('end', () => resolve({ status, headers: resultHeaders, body: Buffer.concat(chunks).toString('utf8'), url: url.href }));
          res.on('error', reject);
        });
        req.on('error', reject);
        req.end();
      })).catch(error => { throw publicError(error, this.signal); });
      if (![301, 302, 303, 307, 308].includes(response.status)) return response;
      if (!response.headers.location) fail(messages.data);
      const next = safeUrl(response.headers.location, url.href);
      // Check the destination even when credentials would prohibit following it.
      const nextHost = next.hostname.replace(/^\[|\]$/g, '');
      if (isIP(nextHost) && classifyDataServiceAddress(nextHost) === 'blocked' || /^(?:metadata|instance-data)(?:\.|$)/i.test(nextHost)) fail(messages.blocked);
      if (next.origin !== origin) fail(messages.scope);
      url = next;
    }
  }
}
function validHeader(name: string): string {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(name) || /^(?:host|cookie|proxy.*|connection|content.*|transfer.*|accept.*|origin|referer|upgrade|te|trailer)$/i.test(name)) {
    fail('This service asks for a sign-in method that is not supported. Ask its owner for a read-only header key or token.');
  }
  return name;
}
function limitSettings(overrides: Partial<DataServiceLimits> = {}): DataServiceLimits {
  return Object.fromEntries(Object.entries(DEFAULT_LIMITS).map(([key, value]) => [key, Math.max(1, Math.min(value, Math.floor(overrides[key as keyof DataServiceLimits] || value)))])) as unknown as DataServiceLimits;
}
function parseJson(text: string): unknown { try { return JSON.parse(text); } catch { return undefined; } }
function ref(value: any, doc: JsonObject): any {
  for (let i = 0; object(value) && typeof value.$ref === 'string' && i < 8; i++) {
    if (!value.$ref.startsWith('#/')) return undefined;
    value = value.$ref.slice(2).split('/').reduce((part: any, key: string) => part?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], doc);
  }
  return value;
}
function describedAuth(doc: JsonObject, operation: JsonObject): DataServiceAuth {
  const security = operation.security ?? doc.security;
  if (!Array.isArray(security) || !security.length || security.some(entry => object(entry) && !Object.keys(entry).length)) return { type: 'none' };
  for (const entry of security) {
    if (!object(entry) || Object.keys(entry).length !== 1) continue;
    const schema = ref((doc.components?.securitySchemes ?? doc.securityDefinitions)?.[Object.keys(entry)[0]], doc);
    if (!object(schema)) continue;
    if (schema.type === 'apiKey' && schema.in === 'header' && typeof schema.name === 'string') return { type: 'header', name: validHeader(schema.name) };
    if (schema.type === 'basic' || schema.type === 'http' && schema.scheme?.toLowerCase() === 'basic') return { type: 'basic' };
    if (['oauth2', 'openIdConnect'].includes(schema.type) || schema.type === 'http' && schema.scheme?.toLowerCase() === 'bearer') return { type: 'bearer' };
  }
  return fail('This service needs a sign-in method that is not supported. Ask its owner for a read-only header key or token.');
}
function describedConnection(doc: JsonObject, descriptionUrl: string, suppliedUrl: URL): Connection | undefined {
  if (!(doc.openapi || doc.swagger) || !object(doc.paths)) return undefined;
  const candidates = Object.entries(doc.paths).filter(([path, item]) => object(item) && object(item.get) && !path.includes('{')
    && ![...(item.parameters ?? []), ...(item.get.parameters ?? [])].some((p: any) => ref(p, doc)?.required && ['path', 'query', 'header'].includes(ref(p, doc)?.in)));
  // Prefer collection responses over health and status endpoints.
  candidates.sort((a, b) => Number(!suppliedUrl.pathname.endsWith(a[0])) - Number(!suppliedUrl.pathname.endsWith(b[0]))
    || Number(!JSON.stringify(a[1].get.responses ?? {}).includes('"array"')) - Number(!JSON.stringify(b[1].get.responses ?? {}).includes('"array"')));
  if (!candidates.length) fail('This description has no ready-to-read records. Paste a direct data address instead.');
  const [path, item] = candidates[0];
  let base = new URL(descriptionUrl).origin;
  if (doc.swagger) {
    base = `${doc.schemes?.[0] ?? new URL(descriptionUrl).protocol.slice(0, -1)}://${doc.host ?? new URL(descriptionUrl).host}${doc.basePath ?? ''}`;
  } else {
    const server = item.get.servers?.[0] ?? item.servers?.[0] ?? doc.servers?.[0];
    if (server?.url) {
      const expanded = String(server.url).replace(/\{([^}]+)\}/g, (_match, key: string) => server.variables?.[key]?.default ?? `{${key}}`);
      if (expanded.includes('{')) fail(messages.address);
      base = safeUrl(expanded, descriptionUrl).href;
    }
  }
  const url = safeUrl(base.replace(/\/$/, '') + '/' + path.replace(/^\//, ''));
  if (url.origin !== new URL(descriptionUrl).origin) fail(messages.scope);
  if (url.pathname === suppliedUrl.pathname) url.search = suppliedUrl.search;
  return { version: 1, url: url.href, label: readableLabel(path.split('/').filter(Boolean).at(-1) ?? 'Records'), auth: describedAuth(doc, item.get), internalOrigins: [] };
}
function detectedAuth(response: ResponseData): DataServiceAuth | undefined {
  const challenge = response.headers['www-authenticate'] ?? '';
  if (/\bbearer\b/i.test(challenge)) return { type: 'bearer' };
  if (/\bbasic\b/i.test(challenge)) return { type: 'basic' };
  const body = parseJson(response.body);
  const hint = object(body) ? body.header ?? body.headerName ?? body.error?.header : undefined;
  if (typeof hint === 'string') return { type: 'header', name: validHeader(hint) };
  const header = /(?:header|name)="([a-z0-9_-]+)"/i.exec(challenge)?.[1];
  if (/api.?key/i.test(challenge)) return { type: 'header', name: validHeader(header ?? 'X-API-Key') };
  if (/x-api-key/i.test(response.body)) return { type: 'header', name: 'X-API-Key' };
  if (/api[_ -]?key/i.test(response.body)) return { type: 'header', name: 'X-API-Key' };
  if (/bearer|access[_ -]?token/i.test(response.body)) return { type: 'bearer' };
  return undefined;
}

function csvRows(text: string): JsonObject[] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (!field || quoted) quoted = !quoted;
      else fail(messages.data);
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) fail(messages.data);
  if (field || row.length) { row.push(field); rows.push(row); }
  const fields = rows.shift()?.map((v, i) => v.trim() || `Field ${i + 1}`);
  if (!fields?.length || new Set(fields).size !== fields.length || rows.some(r => r.length !== fields.length)) fail(messages.data);
  return rows.map(r => Object.fromEntries(fields.map((key, i) => [key, r[i]])));
}
interface Page { rows: JsonObject[]; total?: number; next?: string }
function pageData(response: ResponseData): Page {
  if (response.status === 401 || response.status === 403) fail(messages.auth);
  if (response.status === 429) fail('This service is busy right now. Wait a little and try again.');
  if (response.status < 200 || response.status >= 300) fail('This service could not provide its records. Check the data address and try again.');
  const contentType = response.headers['content-type'] ?? '';
  if (/text\/html/i.test(contentType) || /^\s*<(?:!doctype|html)/i.test(response.body)) fail(messages.html);
  let parsed = parseJson(response.body.replace(/^\uFEFF/, ''));
  if (parsed === undefined) {
    if (/csv/i.test(contentType) || /^\s*[^\r\n,]+,[^\r\n]+\r?\n/.test(response.body)) parsed = csvRows(response.body.replace(/^\uFEFF/, ''));
    else if (response.status === 204) parsed = [];
    else fail(messages.data);
  }
  let rows: unknown = parsed;
  const wrappers: JsonObject[] = [];
  for (let depth = 0; object(rows) && depth < 5; depth++) {
    wrappers.push(rows);
    const arrays = Object.values(rows).filter(Array.isArray);
    const nested: unknown = ['data', 'results', 'items', 'records', 'value', 'rows'].map(key => (rows as JsonObject)[key]).find(v => Array.isArray(v) || object(v))
      ?? (arrays.length === 1 ? arrays[0] : undefined);
    if (nested === undefined) { rows = [rows]; break; }
    rows = nested;
  }
  if (!Array.isArray(rows)) fail(messages.data);
  const result: Page = { rows: rows.map(value => object(value) ? value : { value }) };
  for (const wrapper of wrappers) {
    const count = wrapper.total ?? wrapper.totalCount ?? wrapper.total_count ?? wrapper.meta?.total ?? wrapper.pagination?.total;
    if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) result.total = count;
    const next = wrapper.next ?? wrapper.next_url ?? wrapper.nextPageUrl ?? wrapper['@odata.nextLink'] ?? wrapper.links?.next ?? wrapper.pagination?.next;
    if (typeof next === 'string') result.next = next;
    else if (object(next) && typeof next.href === 'string') result.next = next.href;
    const cursor = wrapper.next_cursor ?? wrapper.nextCursor;
    if (!result.next && (typeof cursor === 'string' || typeof cursor === 'number') && cursor !== '') {
      const url = new URL(response.url); url.searchParams.set('cursor', String(cursor)); result.next = url.href;
    }
    if (!result.next && wrapper.has_more === true && Number.isInteger(wrapper.page)) {
      const url = new URL(response.url); url.searchParams.set('page', String(wrapper.page + 1)); result.next = url.href;
    }
  }
  const link = /<([^>]+)>\s*;\s*rel\s*=\s*["']?next\b/i.exec(response.headers.link ?? '');
  if (link) result.next = link[1];
  return result;
}
function secretVariants(credential?: string, auth?: DataServiceAuth): string[] {
  if (!credential) return [];
  const values = [credential];
  if (auth?.type === 'basic') {
    const decoded = Buffer.from(credential, 'base64').toString('utf8');
    values.push(decoded, ...decoded.split(':'));
  }
  return [...new Set(values.filter(Boolean).flatMap(value => [value, encodeURIComponent(value), Buffer.from(value).toString('base64')]))].sort((a, b) => b.length - a.length);
}
function scrub(value: unknown, secrets: string[], depth = 0): any {
  if (depth > 12) return '[Nested value]';
  if (typeof value === 'string') { for (const secret of secrets) value = (value as string).split(secret).join('[Hidden]'); return value; }
  if (Array.isArray(value)) return value.map(item => scrub(item, secrets, depth + 1));
  if (object(value)) return Object.fromEntries(Object.entries(value).filter(([key]) => !/(?:^|[_ -])(?:password|secret|token|authorization|api.?key)(?:$|[_ -])/i.test(key))
    .map(([key, item]) => [scrub(key, secrets, depth + 1), scrub(item, secrets, depth + 1)]));
  return value;
}
function labelledRows(rows: JsonObject[]): JsonObject[] {
  return rows.map(row => {
    const used = new Set<string>();
    return Object.fromEntries(Object.entries(row).map(([key, value]) => {
      const base = readableLabel(key); let label = base; let count = 2;
      while (used.has(label)) label = `${base} (${count++})`;
      used.add(label); return [label, value];
    }));
  });
}

export class CustomApiConnector implements ConnectorAdapter {
  readonly kind = 'custom-api' as const;
  readonly label = 'Your own data service';
  plainSummary = 'Reads records from your service. It cannot send, change or delete anything.';
  preview?: DataServicePreview;
  private readonly limits: DataServiceLimits;
  private readonly options: CustomApiOptions;
  constructor(options: CustomApiOptions = {}) { this.options = options; this.limits = limitSettings(options.limits); }
  available(): boolean { return true; }

  async connect(secrets: SecretStore, ui: ConnectUi, signal: AbortSignal): Promise<{ accountLabel: string }> {
    this.preview = undefined;
    this.plainSummary = 'Reads records from your service. It cannot send, change or delete anything.';
    let requests: Requests | undefined;
    let wroteCredential = false;
    let wroteConnection = false;
    try {
      if (signal.aborted) fail(messages.cancelled);
      const address = safeUrl((this.options.address ?? await askPerson(ui, { id: 'address', label: 'Paste the service address or its documentation link.' }, signal)).trim());
      requests = new Requests(this.limits, signal, new Set(), ui);
      // Try usual description paths beside the supplied address and at its origin.
      const directory = new URL('.', address).href;
      const paths = [...new Set([
        ...( /(?:openapi|swagger).*\.(?:json|yaml|yml)$/i.test(address.pathname) ? [address.href] : []),
        ...['openapi.json', 'swagger.json', 'api-docs', 'v3/api-docs', 'swagger/v1/swagger.json'].map(p => new URL(p, directory).href),
        ...['openapi.json', 'swagger.json', 'api-docs', 'v3/api-docs', 'swagger/v1/swagger.json'].map(p => new URL(p, address.origin).href),
        address.href,
      ])];
      let connection: Connection | undefined;
      let response: ResponseData | undefined;
      for (const path of paths) {
        const candidate = await requests.get(path);
        const parsed = candidate.status === 200 ? parseJson(candidate.body) : undefined;
        if (object(parsed)) connection = describedConnection(parsed, candidate.url, address);
        if (connection) { response = undefined; break; }
        if (path === address.href) response = candidate;
      }
      connection ??= { version: 1, url: address.href, label: readableLabel(address.pathname.split('/').filter(Boolean).at(-1) ?? 'Records'), auth: { type: 'none' }, internalOrigins: [] };
      let credential: string | undefined;
      if (connection.auth.type === 'none') {
        response ??= await requests.get(connection.url);
        if ([401, 403].includes(response.status)) {
          const detected = detectedAuth(response);
          if (!detected) fail('This service needs sign-in details it did not describe. Ask its owner which read-only key or token to use.');
          connection.auth = detected;
        }
      }
      if (connection.auth.type !== 'none') {
        if (connection.auth.type === 'basic') {
          const username = await requests.ask({ id: 'username', label: 'Enter your username.', secret: true });
          const password = await requests.ask({ id: 'password', label: 'Enter your password.', secret: true });
          if (!username || !password || username.includes(':')) fail(messages.auth);
          credential = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
        } else credential = await requests.ask({ id: connection.auth.type === 'bearer' ? 'token' : 'key', label: connection.auth.type === 'bearer' ? 'This service needs a sign-in token. Paste it here.' : 'This service needs a key. Paste it here.', secret: true });
        if (!credential || /[\r\n]/.test(credential)) fail(messages.auth);
        // All credential persistence and retrieval goes through the host's encrypted store.
        wroteCredential = true; await secrets.set(DATA_SERVICE_SECRET_NAMES.credential, credential);
        response = await requests.get(connection.url, connection.auth, await secrets.get(DATA_SERVICE_SECRET_NAMES.credential));
      }
      const page = pageData(response!);
      const hidden = secretVariants(credential, connection.auth);
      const label = scrub(connection.label, hidden) as string;
      const rows = labelledRows(scrub(page.rows.slice(0, 3), hidden));
      const total = page.total;
      const count = page.rows.length;
      const hasMore = !!page.next || total !== undefined && total > count;
      const summary = `${label} (${total ?? count}${total === undefined && hasMore ? ' or more' : ''} records).`;
      // A response must never smuggle a credential into a saved URL or a renderer result.
      if (hidden.some(value => connection!.url.includes(value))) fail(messages.address);
      connection.label = label;
      connection.internalOrigins = [...requests.internalOrigins];
      requests.check();
      wroteConnection = true;
      await secrets.set(DATA_SERVICE_SECRET_NAMES.connection, JSON.stringify(connection));
      if (connection.auth.type === 'none') await secrets.remove(DATA_SERVICE_SECRET_NAMES.credential);
      requests.check();
      this.preview = { summary, labels: [...new Set(rows.flatMap(row => Object.keys(row)))], rows, count, total, hasMore };
      this.plainSummary = summary;
      return { accountLabel: label };
    } catch (error) {
      if (wroteCredential || wroteConnection) {
        await secrets.remove(DATA_SERVICE_SECRET_NAMES.credential).catch(() => {});
        await secrets.remove(DATA_SERVICE_SECRET_NAMES.connection).catch(() => {});
      }
      throw publicError(error, signal);
    } finally { requests?.close(); }
  }

  async fetch(secrets: SecretStore, options: FetchOptions): Promise<ContextItem[]> {
    let requests: Requests | undefined;
    try {
      if (options.signal.aborted) fail(messages.cancelled);
      if (!Number.isFinite(options.maxItems) || !Number.isFinite(options.maxBytes)) fail(messages.large);
      const maxItems = Math.max(0, Math.min(Math.floor(options.maxItems), this.limits.maxItems));
      const maxBytes = Math.max(0, Math.min(Math.floor(options.maxBytes), this.limits.maxTotalBytes));
      if (!maxItems || !maxBytes) return [];
      const connection = parseJson(await secrets.get(DATA_SERVICE_SECRET_NAMES.connection) ?? '') as Connection | undefined;
      if (!connection || connection.version !== 1 || typeof connection.url !== 'string' || !Array.isArray(connection.internalOrigins)
        || !object(connection.auth) || !['none', 'header', 'bearer', 'basic'].includes(connection.auth.type)) fail(messages.missing);
      const credential = connection.auth.type === 'none' ? undefined : await secrets.get(DATA_SERVICE_SECRET_NAMES.credential);
      if (connection.auth.type !== 'none' && !credential) fail(messages.missing);
      const hidden = secretVariants(credential, connection.auth);
      requests = new Requests(this.limits, options.signal, new Set(connection.internalOrigins));
      const items: ContextItem[] = []; const seen = new Set<string>(); let usedBytes = 0;
      let url: string | undefined = connection.url;
      for (let pageNumber = 0; url && pageNumber < this.limits.maxPages; pageNumber++) {
        url = safeUrl(url, connection.url).href;
        if (new URL(url).origin !== new URL(connection.url).origin) fail(messages.scope);
        if (hidden.some(value => url!.includes(value))) fail(messages.address);
        if (seen.has(url)) break;
        seen.add(url);
        const response = await requests.get(url, connection.auth, credential);
        const page = pageData(response);
        for (const row of labelledRows(scrub(page.rows, hidden))) {
          const item: ContextItem = { id: `data-service:${items.length + 1}`, title: `${connection.label} ${items.length + 1}`, kind: 'record', body: JSON.stringify(row), sourceUrl: connection.url };
          const bytes = Buffer.byteLength(JSON.stringify(item), 'utf8');
          if (usedBytes + bytes > maxBytes || items.length >= maxItems) return items;
          usedBytes += bytes; items.push(item);
        }
        if (items.length >= maxItems) break;
        url = page.next ? safeUrl(page.next, response.url).href : undefined;
      }
      return items;
    } catch (error) { throw publicError(error, options.signal); }
    finally { requests?.close(); }
  }

  async disconnect(secrets: SecretStore): Promise<void> {
    this.preview = undefined;
    this.plainSummary = 'Reads records from your service. It cannot send, change or delete anything.';
    try {
      await secrets.remove(DATA_SERVICE_SECRET_NAMES.credential);
      await secrets.remove(DATA_SERVICE_SECRET_NAMES.connection);
    } catch { fail('The saved connection could not be removed. Try disconnecting it again.'); }
  }
}

export function createCustomApiConnector(options: CustomApiOptions = {}): CustomApiConnector { return new CustomApiConnector(options); }
export default CustomApiConnector;
