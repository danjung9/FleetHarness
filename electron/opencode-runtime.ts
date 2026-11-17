import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { json } from 'node:stream/consumers';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AgentModel } from '../shared/types.js';
import { runProcessEnvironment } from './process-sweep.js';
import type { GenAiMil } from './genai-mil.js';
import type { CodexAccount } from './codex-account.js';

export interface OpenCodeProvider { id: string; models: Record<string, { id: string; name: string; capabilities?: { input?: { image?: boolean } } }> }
export interface OpenCodeConnection {
  request<T>(route: string, body?: unknown, signal?: AbortSignal): Promise<T>;
  events(signal: AbortSignal): Promise<Response>;
  close(): Promise<void>;
}
function requestFailed(status: number | undefined) {
  return new Error(`AppYard request failed (${status}). Check the model connection and retry.`);
}

async function postSessionMessage<T>(url: URL, headers: Record<string, string>, body: unknown, signal: AbortSignal): Promise<T> {
  // OpenCode sends headers only when the turn finishes. The stage monitors progress
  // through events and owns cancellation for turns that outlast fetch's header timeout.
  const response = await new Promise<IncomingMessage>((resolve, reject) => {
    const request = httpRequest(url, { method: 'POST', headers, signal }, resolve);
    request.once('error', reject);
    request.end(JSON.stringify(body));
  });
  const status = response.statusCode ?? 0;
  if (status < 200 || status >= 300) {
    response.resume();
    throw requestFailed(status);
  }
  return await json(response) as T;
}

export function openCodeExecutable() {
  const require = createRequire(import.meta.url);
  // The package's postinstall selects the CPU-compatible native executable on every platform.
  return path.join(path.dirname(require.resolve('opencode-ai/package.json')), 'bin', 'opencode.exe').replace('app.asar', 'app.asar.unpacked');
}
/** App-owned data avoids loading or migrating an unrelated OpenCode installation's database. */
export async function launchOpenCode(options: { root: string; cwd: string; config?: Record<string, unknown>; signal?: AbortSignal }): Promise<OpenCodeConnection> {
  options.signal?.throwIfAborted();
  await fs.mkdir(options.cwd, { recursive: true });
  const password = randomUUID();
  const env = runProcessEnvironment({ ...process.env,
    XDG_DATA_HOME: path.join(options.root, 'data'), XDG_CONFIG_HOME: path.join(options.root, 'config'),
    XDG_CACHE_HOME: path.join(options.root, 'cache'), XDG_STATE_HOME: path.join(options.root, 'state'),
    OPENCODE_CONFIG_DIR: path.join(options.root, 'config'), OPENCODE_DISABLE_PROJECT_CONFIG: 'true',
    OPENCODE_SERVER_PASSWORD: password,
    OPENCODE_CONFIG_CONTENT: JSON.stringify({ plugin: [], tools: { '*': false }, ...options.config, permission: { '*': 'deny', 'fleet_*': 'allow', task: 'deny' } }) });
  const child: ChildProcess = spawn(openCodeExecutable(), ['serve', '--pure', '--hostname', '127.0.0.1', '--port', '0'], {
    cwd: options.cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let closed = false;
  let closing: Promise<void> | undefined;
  const close = () => closing ??= (async () => {
    closed = true; options.signal?.removeEventListener('abort', stop);
    if (child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 2000);
      child.once('exit', () => { clearTimeout(timer); resolve(); }); child.kill();
    });
  })();
  const stop = () => { void close(); };
  options.signal?.addEventListener('abort', stop, { once: true });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => finish(new Error('AppYard did not start. Check the bundled runtime and retry.')), 45000);
      const abort = () => finish(new Error('AppYard startup stopped.'));
      const finish = (error?: Error, url?: string) => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); error ? reject(error) : resolve(url!); };
      options.signal?.addEventListener('abort', abort, { once: true });
      child.once('error', () => finish(new Error('AppYard could not launch. Reinstall dependencies and retry.')));
      child.once('exit', () => finish(new Error('AppYard exited before it was ready.')));
      child.stderr?.on('data', () => {}); // Startup logs can contain provider details; never forward them to project output.
      child.stdout?.on('data', bytes => { output = (output + bytes.toString()).slice(-4000); const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) finish(undefined, match[0]); });
      if (options.signal?.aborted) abort();
    });
    const headers = { Authorization: `Basic ${Buffer.from('opencode:' + password).toString('base64')}`, 'Content-Type': 'application/json' };
    const endpoint = (route: string) => { const target = new URL(route, url); target.searchParams.set('directory', options.cwd); return target; };
    return {
      async request<T>(route: string, body?: unknown, signal?: AbortSignal): Promise<T> {
        if (closed) throw new Error('AppYard session is closed.');
        const url = endpoint(route);
        if (signal && body !== undefined && /^\/session\/[^/]+\/message$/.test(route)) return postSessionMessage<T>(url, headers, body, signal);
        const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal });
        if (!response.ok) throw requestFailed(response.status);
        return await response.json() as T;
      },
      events: signal => fetch(endpoint('/event'), { headers, signal }), close
    };
  } catch (error) { await close(); throw error; }
}

export class OpenCodeRuntime {
  private catalog: AgentModel[] = [];
  get models(): AgentModel[] {
    const connection = this.genAiMil?.()?.view();
    return [...this.catalog, ...(this.chatGPT?.()?.models.filter(model => model.backend === 'opencode') ?? []), ...(connection?.connected ? connection.models.map(id => ({ backend: 'opencode' as const, provider: 'genai-mil', id, name: id, configured: true })) : [])];
  }
  providers: OpenCodeProvider[] = [];
  error = '';
  private keys = new Map<string, string>();
  constructor(readonly root: string, readonly genAiMil?: () => GenAiMil | undefined, readonly chatGPT?: () => CodexAccount | undefined) {}
  config(): { provider: Record<string, unknown> } { return { provider: Object.fromEntries([...this.keys].map(([id, apiKey]) => [id, { options: { apiKey } }])) }; }
  async refresh(signal?: AbortSignal) {
    const connection = await launchOpenCode({ root: this.root, cwd: this.root, config: this.config(), signal });
    try {
      const result = await connection.request<{ all: OpenCodeProvider[]; connected: string[] }>('/provider', undefined, signal);
      this.providers = result.all;
      this.catalog = result.all.flatMap(provider => Object.values(provider.models).map(model => ({ backend: 'opencode' as const,
        provider: provider.id, id: model.id, name: model.name, configured: result.connected.includes(provider.id) || this.keys.has(provider.id) })));
      this.error = '';
    } finally { await connection.close(); }
  }
  async setKey(provider: string, key: string) {
    const previous = this.keys.get(provider); this.keys.set(provider, key);
    try { await this.refresh(); } catch (error) { previous === undefined ? this.keys.delete(provider) : this.keys.set(provider, previous); throw error; }
  }
  supportsImages(provider: string, model: string) {
    if (provider === 'chatgpt') return this.chatGPT?.()?.models.some(item => item.id === model && item.configured) === true;
    if (provider === 'genai-mil') { const connection = this.genAiMil?.()?.view(); return connection?.connected === true && connection.imageModels?.includes(model) === true; }
    return this.providers.find(item => item.id === provider)?.models[model]?.capabilities?.input?.image === true; }
}
