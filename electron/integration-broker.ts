import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { integrationLimits, validateIntegrationOperation, type IntegrationOperation, type IntegrationInput, type IntegrationEvidence } from '../shared/integration.js';
import type { JsonValue } from '../shared/solution.js';
import { ClassifiedExecutionFailure } from './execution-failure.js';

export interface CredentialCipher {
  isEncryptionAvailable(): boolean;
  getSelectedStorageBackend?(): string;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}
/** Electron safeStorage is injected by the main process; plaintext never reaches state or IPC. */
export class IntegrationCredentialVault {
  private writes: Promise<unknown> = Promise.resolve();
  constructor(private root: string, private cipher: CredentialCipher) {}
  private encryptionAvailable() { return this.cipher.isEncryptionAvailable() && this.cipher.getSelectedStorageBackend?.() !== 'basic_text'; }
  private file(id: string) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,99}$/.test(id)) throw new Error('Invalid credential identifier.');
    return path.join(this.root, 'integration-credentials', id + '.enc');
  }
  async get(id: string): Promise<string> {
    if (!this.encryptionAvailable()) throw new Error('Encrypted credential storage is unavailable.');
    await this.writes;
    const directory = await fs.lstat(path.dirname(this.file(id)));
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('Credential storage must be an ordinary host directory.');
    const file = this.file(id), info = await fs.lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > 64_000) throw new Error('Invalid encrypted integration credential.');
    return this.cipher.decryptString(await fs.readFile(file));
  }
  set(id: string, secret: string): Promise<void> {
    const file = this.file(id);
    if (typeof secret !== 'string' || !secret.trim() || secret.length > 16_000 || /[\r\n\0]/.test(secret)) return Promise.reject(new Error('Provide a bounded, single-line credential.'));
    if (!this.encryptionAvailable()) return Promise.reject(new Error('Encrypted credential storage is unavailable.'));
    const encrypted = this.cipher.encryptString(secret);
    const operation = this.writes.catch(() => {}).then(async () => {
      const directory = path.dirname(file);
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      if ((await fs.lstat(directory)).isSymbolicLink()) throw new Error('Credential storage must be an ordinary host directory.');
      const temporary = file + '.' + randomUUID() + '.tmp';
      try { await fs.writeFile(temporary, encrypted, { flag: 'wx', mode: 0o600 }); await fs.rename(temporary, file); }
      finally { await fs.rm(temporary, { force: true }); }
    });
    this.writes = operation; return operation;
  }
  async delete(id: string) { await this.writes.catch(() => {}); await fs.rm(this.file(id), { force: true }); }
}

export interface IntegrationTransportRequest {
  url: URL; method: IntegrationOperation['method']; headers: Record<string, string>; body?: string; signal: AbortSignal; maxBytes: number;
}
export interface IntegrationTransportResponse { status: number; body: string; contentType: string }
export type IntegrationTransport = (request: IntegrationTransportRequest) => Promise<IntegrationTransportResponse>;
export interface IntegrationCallBudget { calls: number }
// A candidate's successive runtime leases share one state object. Serializing
// admission across leases prevents concurrent requests spending the last slot.
const consumptionQueues = new WeakMap<IntegrationCallBudget, Promise<void>>();

/** Reject private, loopback, multicast, reserved and documentation destinations before connecting. */
export function publicIntegrationAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 2 && c === 0)))
      || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  // Public IPv6 global unicast only; exclude documentation and embedded IPv4 forms.
  const first = Number.parseInt(address.split(':')[0], 16);
  return family === 6 && first >= 0x2000 && first <= 0x3fff && !/^2001:(?:db8:|0:|:)/i.test(address) && !address.includes('.') && !/^2002:/i.test(address);
}

async function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let abort!: () => void;
  const aborted = new Promise<never>((_resolve, reject) => { abort = () => reject(signal.reason ?? new Error('Integration request cancelled.')); signal.addEventListener('abort', abort, { once: true }); });
  try { return await Promise.race([promise, aborted]); }
  finally { signal.removeEventListener('abort', abort); }
}

export const httpsIntegrationTransport: IntegrationTransport = async options => {
  options.signal.throwIfAborted();
  const addresses = await untilAborted(lookup(options.url.hostname, { all: true, verbatim: true }), options.signal);
  options.signal.throwIfAborted();
  if (!addresses.length || addresses.some(entry => !publicIntegrationAddress(entry.address))) throw new Error('Integration endpoint resolved to an unsupported private or reserved address.');
  const selected = addresses[0];
  return new Promise((resolve, reject) => {
    // Bind the checked DNS answer to this connection. TLS still verifies the original hostname.
    const outgoing = request(options.url, { method: options.method, headers: options.headers, signal: options.signal,
      family: selected.family, servername: options.url.hostname, agent: false,
      lookup: (_host, _options, callback) => callback(null, selected.address, selected.family) }, response => {
      let bytes = 0; const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > options.maxBytes) { response.destroy(new Error('Integration response exceeds the 2 MB limit.')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8'), contentType: String(response.headers['content-type'] ?? '') }));
    });
    outgoing.once('error', reject); outgoing.end(options.body);
  });
};

export class IntegrationBroker {
  readonly candidateId: string;
  readonly sessionId = randomUUID();
  private controller = new AbortController();
  private operations = new Map<string, IntegrationOperation>();
  private secrets = new Set<string>();
  private records: IntegrationEvidence[] = [];
  private budget: IntegrationCallBudget;
  private transport: IntegrationTransport;
  constructor(private options: {
    candidateId: string; operations: readonly IntegrationOperation[];
    credentials?: Pick<IntegrationCredentialVault, 'get'>;
    /** Host-only dependency injection for deterministic tests. Never expose through renderer configuration. */
    transport?: IntegrationTransport;
    onEvidence?: (evidence: IntegrationEvidence) => void;
    /** Restore once per candidate and share across every runtime/preview lease. */
    budget?: IntegrationCallBudget;
    /** Persist the new count before any authenticated network request starts. */
    onConsume?: (state: Readonly<IntegrationCallBudget>) => Promise<void> | void;
  }) {
    if (!options.candidateId || options.candidateId.length > 200 || options.operations.length > 100) throw new Error('Invalid candidate integration configuration.');
    this.candidateId = options.candidateId; this.transport = options.transport ?? httpsIntegrationTransport;
    this.budget = options.budget ?? { calls: 0 };
    if (!Number.isSafeInteger(this.budget.calls) || this.budget.calls < 0 || this.budget.calls > integrationLimits.calls) throw new Error('Invalid persisted integration call budget.');
    for (const raw of options.operations) {
      const operation = validateIntegrationOperation(raw);
      if (this.operations.has(operation.id)) throw new Error('Duplicate integration operation.');
      this.operations.set(operation.id, operation);
    }
  }
  get evidence(): IntegrationEvidence[] { return structuredClone(this.records); }
  get callsConsumed() { return this.budget.calls; }
  get revoked() { return this.controller.signal.aborted; }
  revoke() { this.controller.abort(new Error('Integration session revoked.')); }
  private consume(signal: AbortSignal) {
    const pending = (consumptionQueues.get(this.budget) ?? Promise.resolve()).catch(() => {}).then(async () => {
      signal.throwIfAborted();
      if (this.budget.calls >= integrationLimits.calls) throw new Error('This candidate reached its 100-call integration limit.');
      this.budget.calls++;
      try { await this.options.onConsume?.({ calls: this.budget.calls }); }
      catch (error) { throw new ClassifiedExecutionFailure('infrastructure', 'The host could not persist the integration call budget: ' + this.redact(error instanceof Error ? error.message : String(error)).slice(0, 1_000), { cause: error }); }
    });
    consumptionQueues.set(this.budget, pending);
    return untilAborted(pending, signal);
  }
  redact(value: string): string {
    for (const secret of [...this.secrets].sort((a, b) => b.length - a.length)) {
      value = value.split(secret).join('[redacted]');
      const escaped = JSON.stringify(secret).slice(1, -1);
      if (escaped !== secret) value = value.split(escaped).join('[redacted]');
    }
    return value;
  }
  redactValue(value: JsonValue, depth = 0): JsonValue {
    if (depth > 64) throw new Error('Integration JSON exceeds its structural limit.');
    if (typeof value === 'string') return this.redact(value);
    if (value === null || typeof value !== 'object') return this.secrets.has(String(value)) ? '[redacted]' : value;
    if (Array.isArray(value)) return value.map(entry => this.redactValue(entry, depth + 1));
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [this.redact(key), this.redactValue(entry, depth + 1)]));
  }
  async invoke(operationId: string, input: IntegrationInput = {}, signal?: AbortSignal): Promise<JsonValue> {
    this.controller.signal.throwIfAborted(); signal?.throwIfAborted();
    const operation = this.operations.get(operationId);
    if (!operation) throw new Error('This integration operation is not configured for the candidate.');
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['query', 'body'].includes(key))) throw new Error('Invalid integration input.');
    const url = new URL(operation.path, operation.origin);
    if (input.query !== undefined) {
      if (!input.query || typeof input.query !== 'object' || Array.isArray(input.query)) throw new Error('Invalid integration query.');
      for (const [key, value] of Object.entries(input.query)) {
        if (!operation.queryKeys?.includes(key) || typeof value !== 'string' || value.length > 10_000) throw new Error('Integration query key is not allowed.');
        url.searchParams.set(key, value);
      }
    }
    if (operation.method === 'GET' && input.body !== undefined) throw new Error('GET integrations cannot contain a request body.');
    const body = input.body === undefined ? undefined : JSON.stringify(input.body);
    const requestBytes = Buffer.byteLength(body ?? '') + Buffer.byteLength(url.search);
    if (requestBytes > integrationLimits.bytes) throw new Error('Integration input exceeds the 2 MB limit.');
    const combined = AbortSignal.any([this.controller.signal, AbortSignal.timeout(integrationLimits.timeoutMs), ...(signal ? [signal] : [])]);
    await this.consume(combined);
    const started = Date.now(), record: IntegrationEvidence = { operationId, startedAt: new Date(started).toISOString(), durationMs: 0, status: 'failed', requestBytes, responseBytes: 0 };
    try {
      const headers: Record<string, string> = { accept: operation.responseType === 'json' ? 'application/json' : 'text/plain', ...(body === undefined ? {} : { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) }) };
      if (operation.auth) {
        if (!this.options.credentials) throw new ClassifiedExecutionFailure('infrastructure', 'Configure this integration credential before running the candidate.');
        let secret: string;
        try { secret = await untilAborted(this.options.credentials.get(operation.auth.credentialId), combined); }
        catch (error) { throw new ClassifiedExecutionFailure('infrastructure', error instanceof Error ? error.message : 'The configured integration credential is unavailable.', { cause: error }); }
        if (!secret || secret.length > 16_000 || /[\r\n\0]/.test(secret)) throw new ClassifiedExecutionFailure('infrastructure', 'The integration credential is invalid.');
        this.secrets.add(secret);
        headers[operation.auth.type === 'bearer' ? 'authorization' : operation.auth.headerName!.toLowerCase()] = operation.auth.type === 'bearer' ? 'Bearer ' + secret : secret;
      }
      combined.throwIfAborted();
      let response: IntegrationTransportResponse;
      try { response = await untilAborted(this.transport({ url, method: operation.method, headers, body, signal: combined, maxBytes: integrationLimits.bytes }), combined); }
      catch (error) {
        const code = String((error as NodeJS.ErrnoException)?.code ?? '');
        if (/^(?:ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|ENOTFOUND|EPIPE|ERR_TLS_|CERT_)/.test(code)) {
          throw new ClassifiedExecutionFailure('infrastructure', 'Configured service transport is unavailable (' + code + ').', { cause: error });
        }
        throw error;
      }
      combined.throwIfAborted();
      record.responseBytes = Buffer.byteLength(response.body);
      if (record.responseBytes > integrationLimits.bytes) throw new Error('Integration response exceeds the 2 MB limit.');
      if (response.status >= 300 && response.status < 400) throw new Error('Integration redirects are not allowed.');
      if ([401, 403, 408, 429].includes(response.status) || response.status >= 500) throw new ClassifiedExecutionFailure('infrastructure', 'Configured service returned HTTP ' + response.status + '.');
      if (response.status < 200 || response.status >= 300) throw new Error('Integration returned HTTP ' + response.status + '.');
      let result: JsonValue;
      if (operation.responseType === 'json') {
        if (!/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(response.contentType)) throw new Error('Integration did not return JSON.');
        try { result = this.redactValue(JSON.parse(response.body)); } catch { throw new Error('Integration returned invalid or excessively nested JSON.'); }
      } else {
        if (!/^text\/|^application\/(?:json|xml)(?:\s*;|$)/i.test(response.contentType)) throw new Error('Integration did not return supported text.');
        result = this.redact(response.body);
      }
      record.status = 'passed'; return result;
    } catch (error) {
      if (combined.aborted) record.status = 'cancelled';
      const message = this.redact(combined.aborted ? 'Integration request cancelled or timed out.' : error instanceof Error ? error.message : String(error));
      if (combined.aborted && !this.controller.signal.aborted && !signal?.aborted) throw new ClassifiedExecutionFailure('infrastructure', message);
      if (error instanceof ClassifiedExecutionFailure) throw new ClassifiedExecutionFailure(error.classification, message);
      throw new Error(message);
    } finally {
      record.durationMs = Date.now() - started; this.records.push(record);
      this.options.onEvidence?.(structuredClone(record));
    }
  }
}
