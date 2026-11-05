import { randomBytes, randomUUID } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { promises as fs } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JsonValue } from '../shared/solution.js';
import type { BrokerHttpRequest, BrokerHttpResponse, IntegrationInput } from '../shared/integration.js';
import { IntegrationBroker } from './integration-broker.js';
import { spawnIsolatedProcess, type IsolatedProcess } from './isolated-executor.js';
import { ClassifiedExecutionFailure } from './execution-failure.js';

export const runtimeBrokerLimits = { frameBytes: 2_000_000, pending: 32, requestMs: 30_000, outputBytes: 16_000_000 } as const;
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const hopHeaders = /^(?:connection|keep-alive|proxy-authenticate|proxy-authorization|te|trailer|transfer-encoding|upgrade|content-length|host|set-cookie)$/i;
const contentPolicy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
export interface RuntimeBrokerOptions {
  workspace: string; executable: string; runtime: 'node' | 'python'; entrypoint: string;
  integrations?: IntegrationBroker; signal?: AbortSignal;
  readPaths?: string[]; writePaths?: string[]; adapterPath?: string;
  timeoutMs?: number; startupTimeoutMs?: number; requestTimeoutMs?: number; maxOutputBytes?: number;
  onLog?: (text: string) => void;
}

/** One candidate process, one private framed channel; no socket or credential is granted to generated code. */
export class RuntimeBroker {
  private process!: IsolatedProcess;
  private starting?: Promise<IsolatedProcess>;
  private pending = new Map<string, { resolve(value: unknown): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
  private integrationIds = new Set<string>();
  private buffer = Buffer.alloc(0);
  private stopped?: Error;
  private servers = new Set<Server>();
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private ready = new Promise<void>((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject; });
  private seenReady = false;
  private controller = new AbortController();
  private processController?: AbortController;
  private generation = 0;
  private restarting?: Promise<void>;
  private closing?: Promise<void>;
  private deadline: number;
  private deadlineTimer: ReturnType<typeof setTimeout>;
  private constructor(private options: RuntimeBrokerOptions) {
    if (options.timeoutMs !== undefined && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0 || options.timeoutMs > 3_600_000)) {
      throw new Error('Invalid isolated execution limit.');
    }
    this.deadline = Date.now() + (options.timeoutMs ?? 300_000);
    this.deadlineTimer = setTimeout(() => this.fail(new Error('Runtime broker exhausted its execution budget.')), options.timeoutMs ?? 300_000);
    void this.ready.catch(() => {});
  }
  static async start(options: RuntimeBrokerOptions): Promise<RuntimeBroker> {
    const broker = new RuntimeBroker(options);
    try { await broker.startProcess(); return broker; }
    catch (error) { await broker.close(); throw error; }
  }
  private async startProcess(): Promise<void> {
    const options = this.options;
    if (this.stopped) throw this.stopped;
    options.signal?.throwIfAborted();
    const workspace = await fs.realpath(options.workspace);
    if (!['node', 'python'].includes(options.runtime) || !options.entrypoint || path.isAbsolute(options.entrypoint)
      || options.entrypoint.split(/[\\/]/).some(part => part === '..' || !part)) throw new Error('Invalid broker runtime entrypoint.');
    const entrypoint = await fs.realpath(path.join(workspace, options.entrypoint));
    if (!entrypoint.startsWith(workspace + path.sep) || !(await fs.stat(entrypoint)).isFile()) throw new Error('Broker entrypoint must stay inside its runtime package.');
    const templateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', 'templates/runtime-broker');
    // External interpreters cannot read Electron's virtual asar filesystem.
    const adapter = await fs.realpath(options.adapterPath ?? path.join(templateRoot, options.runtime === 'node' ? 'node.mjs' : 'python.py').replace(/\.asar([\\/])/, '.asar.unpacked$1'));
    const command = options.runtime === 'node'
      ? [options.executable, '--no-global-search-paths', adapter, '--stdio', entrypoint]
      : [options.executable, '-I', '-B', adapter, '--stdio', entrypoint];
    const remaining = this.deadline - Date.now();
    if (remaining <= 0) { this.fail(new Error('Runtime broker exhausted its execution budget.')); throw this.stopped; }
    const generation = ++this.generation;
    this.buffer = Buffer.alloc(0); this.integrationIds.clear(); this.seenReady = false;
    this.ready = new Promise<void>((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject; });
    void this.ready.catch(() => {});
    this.processController = new AbortController();
    const signal = AbortSignal.any([this.controller.signal, this.processController.signal, ...(options.signal ? [options.signal] : [])]);
    const timer = setTimeout(() => this.fail(new Error('Runtime broker did not become ready.')),
      options.startupTimeoutMs ?? options.requestTimeoutMs ?? runtimeBrokerLimits.requestMs);
    try {
      const starting = this.starting = spawnIsolatedProcess({ workspace, command, readPaths: [path.dirname(adapter), ...(options.readPaths ?? [])],
        writePaths: options.writePaths, signal, timeoutMs: remaining,
        maxOutputBytes: options.maxOutputBytes ?? runtimeBrokerLimits.outputBytes,
        onStdout: chunk => { if (generation === this.generation) this.receive(chunk, generation, signal); },
        onStderr: chunk => options.onLog?.(this.redact(chunk.toString('utf8'))) });
      try { this.process = await starting; }
      finally { if (this.starting === starting) this.starting = undefined; }
      void this.process.done.then(result => {
        if (generation === this.generation) this.fail(new Error('Runtime broker exited with ' + result.exitCode + '.'));
      }, error => { if (generation === this.generation) this.fail(error); });
      await this.ready;
    } catch (error) {
      // The readiness timer can abort sandbox setup before it returns a process.
      const failure = this.stopped ?? error;
      await this.close(); throw failure;
    } finally { clearTimeout(timer); }
  }
  /** Replace only the generated process; the preview server and its lease stay live. */
  restart(): Promise<void> {
    if (this.restarting) return this.restarting;
    this.restarting = (async () => {
      try {
        if (this.stopped) throw this.stopped;
        this.options.signal?.throwIfAborted();
        ++this.generation;
        const interrupted = new Error('Runtime broker request interrupted by service restart.');
        for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(interrupted); }
        this.pending.clear();
        // The per-process abort also cancels old external requests. Keep the
        // integration lease and its persisted call budget for the replacement.
        this.processController?.abort(interrupted);
        await this.process.close();
        await this.startProcess();
      } catch (error) { await this.close(); throw error; }
    })().finally(() => { this.restarting = undefined; });
    return this.restarting;
  }
  private redact(text: string) { return this.options.integrations?.redact(text) ?? text; }
  private fail(error: Error) {
    if (this.stopped) return;
    this.stopped = error instanceof ClassifiedExecutionFailure ? new ClassifiedExecutionFailure(error.classification, this.redact(error.message)) : new Error(this.redact(error.message)); this.readyReject(this.stopped);
    for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(this.stopped); }
    this.pending.clear(); this.options.integrations?.revoke(); this.controller.abort();
    for (const server of this.servers) { server.closeAllConnections(); server.close(); }
  }
  private send(value: object) {
    if (this.stopped) throw this.stopped;
    const bytes = Buffer.from(JSON.stringify(value) + '\n');
    if (bytes.length > runtimeBrokerLimits.frameBytes) throw new Error('Runtime broker frame exceeds its 2 MB limit.');
    if (!this.process.child.stdin.write(bytes) && this.process.child.stdin.writableLength > runtimeBrokerLimits.frameBytes * 2) throw new Error('Runtime broker input backlog exceeded its limit.');
  }
  private receive(chunk: Buffer, generation: number, signal: AbortSignal) {
    if (this.stopped) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const newline = this.buffer.indexOf(10);
      if (newline < 0) { if (this.buffer.length > runtimeBrokerLimits.frameBytes) this.fail(new Error('Runtime broker frame exceeds its 2 MB limit.')); return; }
      if (newline > runtimeBrokerLimits.frameBytes) { this.fail(new Error('Runtime broker frame exceeds its 2 MB limit.')); return; }
      const bytes = this.buffer.subarray(0, newline); this.buffer = this.buffer.subarray(newline + 1);
      try {
        if (!isUtf8(bytes)) throw new Error('Runtime broker frames must contain valid UTF-8.');
        const message: unknown = JSON.parse(bytes.toString('utf8'));
        if (!object(message) || message.version !== 1) throw new Error('Malformed runtime broker frame.');
        if (message.type === 'ready') {
          if (this.seenReady) throw new Error('Duplicate runtime broker handshake.');
          this.seenReady = true; this.readyResolve();
        } else if (message.type === 'response' && id(message.id)) {
          const request = this.pending.get(message.id);
          if (!request) throw new Error('Runtime returned an unknown or duplicate response.');
          if (!((message.ok === true && Object.hasOwn(message, 'value')) || (message.ok === false && typeof message.error === 'string'))) throw new Error('Invalid runtime response.');
          this.pending.delete(message.id); clearTimeout(request.timer);
          if (message.ok === true && Object.hasOwn(message, 'value')) request.resolve(message.value);
          else if (message.ok === false && typeof message.error === 'string') request.reject(new Error(this.redact(message.error).slice(0, 2000)));
          else throw new Error('Invalid runtime response.');
        } else if (message.type === 'integration' && id(message.id) && typeof message.operationId === 'string') {
          if (!this.seenReady || this.integrationIds.has(message.id) || this.integrationIds.size >= 100) throw new Error('Invalid or exhausted integration request identity.');
          this.integrationIds.add(message.id);
          void this.integration(message.id, message.operationId, message.input, generation, signal);
        } else throw new Error('Unknown runtime broker frame.');
      } catch (error) { this.fail(error instanceof Error ? error : new Error(String(error))); return; }
    }
  }
  private async integration(requestId: string, operationId: string, input: IntegrationInput, generation: number, signal: AbortSignal) {
    try {
      if (!this.options.integrations) throw new Error('This candidate has no configured external integrations.');
      const value = await this.options.integrations.invoke(operationId, input, signal);
      if (!this.stopped && generation === this.generation) this.send({ version: 1, type: 'integration-result', id: requestId, ok: true, value });
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof ClassifiedExecutionFailure && error.classification !== 'implementation') { this.fail(error); return; }
      if (!this.stopped) try { this.send({ version: 1, type: 'integration-result', id: requestId, ok: false, error: this.redact(error instanceof Error ? error.message : String(error)).slice(0, 2000) }); }
      catch (failure) { this.fail(failure instanceof Error ? failure : new Error(String(failure))); }
    }
  }
  private call(kind: 'invoke' | 'http', input: unknown): Promise<unknown> {
    if (this.stopped) return Promise.reject(this.stopped);
    if (this.restarting) return Promise.reject(new Error('Runtime broker is restarting.'));
    if (this.pending.size >= runtimeBrokerLimits.pending) return Promise.reject(new Error('Runtime broker has too many pending requests.'));
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error('Runtime broker request exceeded its deadline.')), this.options.requestTimeoutMs ?? runtimeBrokerLimits.requestMs);
      this.pending.set(requestId, { resolve, reject, timer });
      try { this.send({ version: 1, type: 'request', id: requestId, kind, input }); }
      catch (error) { this.pending.delete(requestId); clearTimeout(timer); reject(error); }
    });
  }
  async invoke(input: JsonValue): Promise<JsonValue> { return await this.call('invoke', input) as JsonValue; }
  async http(input: BrokerHttpRequest): Promise<BrokerHttpResponse> {
    if (!input || !/^[A-Z]{3,12}$/.test(input.method) || !input.path.startsWith('/') || input.path.startsWith('//') || /[\r\n\0\\]/.test(input.path)
      || typeof input.body !== 'string') throw new Error('Invalid broker HTTP request.');
    const result = await this.call('http', input);
    if (!object(result) || !Number.isInteger(result.status) || result.status < 200 || result.status > 599
      || typeof result.body !== 'string' || Buffer.byteLength(result.body) > runtimeBrokerLimits.frameBytes
      || (result.headers !== undefined && (!object(result.headers) || Object.entries(result.headers).some(([key, value]) => !/^[A-Za-z0-9-]+$/.test(key) || typeof value !== 'string' || /[\r\n\0]/.test(value))))) throw new Error('Invalid broker HTTP response.');
    return result as BrokerHttpResponse;
  }
  async listen(options: { staticRoot?: string; files?: string[]; index?: string;
    /** Host-selected static browser entry; services retain their root route. */ startPath?: '/index.html';
    /** Trusted desktop renderer origin, supplied by the host only. */ embeddingOrigin?: string } = {}): Promise<string> {
    if (this.stopped) throw this.stopped;
    const ancestor = options.embeddingOrigin;
    if (ancestor !== undefined && ancestor !== 'file:') {
      const parsed = new URL(ancestor);
      if (parsed.origin !== ancestor || parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1' || !parsed.port) throw new Error('Runtime embedding requires the trusted desktop file or loopback development origin.');
    }
    const policy = contentPolicy + '; frame-ancestors ' + (ancestor ?? "'none'");
    // A file: desktop is a different site from its loopback iframe. Partitioned
    // cookies preserve the lease within that top-level site without sharing it
    // with unrelated websites. Loopback is a trustworthy Secure-cookie origin.
    const cookiePolicy = ancestor ? 'SameSite=None; Secure; Partitioned' : 'SameSite=Strict';
    const lease = randomBytes(24).toString('hex'), cookieName = 'fleet_runtime_' + randomBytes(8).toString('hex');
    const staticRoot = options.staticRoot ? await fs.realpath(options.staticRoot) : undefined;
    const allowed = new Set(options.files ?? []);
    const server = createServer(async (request, response) => {
      try {
        const host = '127.0.0.1:' + (server.address() as { port: number }).port;
        if (request.headers.host !== host || (request.headers.origin && request.headers.origin !== 'http://' + host)) { response.writeHead(403).end(); return; }
        if (request.url === '/' + lease + '/') {
          response.writeHead(302, { location: options.startPath ?? '/', 'set-cookie': `${cookieName}=${lease}; HttpOnly; ${cookiePolicy}; Path=/`, 'cache-control': 'no-store' }).end(); return;
        }
        if (!(request.headers.cookie ?? '').split(';').some(cookie => cookie.trim() === cookieName + '=' + lease)) { response.writeHead(403).end(); return; }
        const url = new URL(request.url ?? '/', 'http://' + host);
        if (request.method === 'GET' && staticRoot) {
          const relative = decodeURIComponent(url.pathname).replace(/^\//, '') || options.index || 'index.html';
          if (allowed.has(relative)) {
            const file = await fs.realpath(path.join(staticRoot, relative));
            if (!file.startsWith(staticRoot + path.sep) || !(await fs.stat(file)).isFile()) throw new Error('Invalid static runtime artifact.');
            const body = await fs.readFile(file);
            if (body.length > runtimeBrokerLimits.frameBytes) throw new Error('Static runtime artifact exceeds its limit.');
            response.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store',
              'content-security-policy': policy, 'x-content-type-options': 'nosniff' }).end(body); return;
          }
        }
        const chunks: Buffer[] = []; let bytes = 0;
        for await (const chunk of request) { bytes += chunk.length; if (bytes > runtimeBrokerLimits.frameBytes) throw new Error('HTTP request exceeds its 2 MB limit.'); chunks.push(chunk); }
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(request.headers)) if (typeof value === 'string' && !hopHeaders.test(key) && key !== 'cookie') headers[key] = value;
        const result = await this.http({ method: request.method ?? 'GET', path: url.pathname + url.search, headers, body: Buffer.concat(chunks).toString('utf8') });
        const outputHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.headers ?? {})) if (!hopHeaders.test(key) && !/^(?:location|refresh|content-security-policy|cache-control|x-content-type-options)$/i.test(key)) outputHeaders[key] = value;
        Object.assign(outputHeaders, { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': policy });
        response.writeHead(result.status, outputHeaders).end(result.body);
      } catch (error) { if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' }); response.end(this.redact(error instanceof Error ? error.message : 'Runtime request failed.').slice(0, 2000)); }
    });
    server.requestTimeout = runtimeBrokerLimits.requestMs; server.headersTimeout = runtimeBrokerLimits.requestMs;
    server.on('upgrade', (_request, socket) => socket.destroy());
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    if (this.stopped) { server.closeAllConnections(); server.close(); throw this.stopped; }
    this.servers.add(server); return 'http://127.0.0.1:' + (server.address() as { port: number }).port + '/' + lease + '/';
  }
  close(): Promise<void> {
    return this.closing ??= (async () => {
      clearTimeout(this.deadlineTimer);
      this.fail(new Error('Runtime broker closed.'));
      // Cancellation can arrive during sandbox preparation, before process is
      // assigned. Wait for that launch as well before releasing package files.
      const starting = await this.starting?.catch(() => undefined);
      await starting?.close();
      if (starting !== this.process) await this.process?.close();
      await Promise.all([...this.servers].map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); })));
      this.servers.clear();
    })();
  }
}
