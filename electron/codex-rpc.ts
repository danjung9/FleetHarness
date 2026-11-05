import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { atomicHostWrite } from '../shared/host-files.js';
import { registerCredential } from './secrets.js';
import path from 'node:path';
import { runProcessEnvironment } from './process-sweep.js';

export interface RpcMessage { id?: number | string; method?: string; params?: any; result?: any; error?: { code: number; message: string } }
export const CHATGPT_MODEL_PROVIDER = 'openai_chatgpt_plan';
export const CHATGPT_ACCESS_TOKEN_ENV = 'FLEET_CHATGPT_ACCESS_TOKEN';
export const CHATGPT_AGENT_NAME = 'AppYard';
export interface CodexCredentials { accessToken: string; expiresAt: number; authType?: 'chatgpt' | 'apiKey' }

/** Keep the subscription bearer token out of command-line arguments and RPC messages. */
export function codexProcessConfig(home: string, credentials: Pick<CodexCredentials, 'accessToken' | 'authType'>, inheritedEnv: NodeJS.ProcessEnv = process.env) {
  if (credentials?.authType === 'apiKey') {
    const env: NodeJS.ProcessEnv = { ...inheritedEnv, CODEX_HOME: home };
    for (const name of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'OPENAI_BASE_URL', CHATGPT_ACCESS_TOKEN_ENV]) delete env[name];
    return { args: ['app-server', '--listen', 'stdio://', '-c', 'cli_auth_credentials_store="file"'], env };
  }
  if (!credentials?.accessToken?.trim()) throw new Error('Sign in with ChatGPT in Model settings before running Codex.');
  registerCredential(credentials.accessToken);
  const env: NodeJS.ProcessEnv = { ...inheritedEnv, CODEX_HOME: home, [CHATGPT_ACCESS_TOKEN_ENV]: credentials.accessToken };
  delete env.OPENAI_API_KEY; delete env.CODEX_API_KEY; delete env.OPENAI_BASE_URL;
  const provider = 'model_providers.' + CHATGPT_MODEL_PROVIDER;
  const config = [
    `model_provider="${CHATGPT_MODEL_PROVIDER}"`,
    `${provider}.name="ChatGPT plan"`,
    `${provider}.base_url="https://api.openai.com/v1"`,
    `${provider}.env_key="${CHATGPT_ACCESS_TOKEN_ENV}"`,
    `${provider}.wire_api="responses"`,
    `${provider}.requires_openai_auth=false`,
    `${provider}.supports_websockets=false`,
    `shell_environment_policy.exclude=["${CHATGPT_ACCESS_TOKEN_ENV}"]`
  ];
  return { args: ['app-server', '--listen', 'stdio://', ...config.flatMap(value => ['-c', value])], env };
}
// Retain entered values only in process memory to redact even late account/build
// diagnostics. Never put these values in project state, config or activity logs.
const enteredKeys = new Set<string>();
export function protectCodexKey(key: string) { enteredKeys.add(key); registerCredential(key); }
export function redactCodexText(text: string) {
  for (const key of enteredKeys) text = text.replaceAll(key, '[redacted]');
  return text;
}
function redactResponse(value: any): any {
  if (typeof value === 'string') return redactCodexText(value);
  if (Array.isArray(value)) return value.map(redactResponse);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [redactCodexText(key), redactResponse(item)]));
  return value;
}
export function codexExecutable() {
  const platform = process.platform, arch = process.arch;
  const triple = `${arch === 'arm64' ? 'aarch64' : 'x86_64'}-${platform === 'darwin' ? 'apple-darwin' : platform === 'win32' ? 'pc-windows-msvc' : 'unknown-linux-musl'}`;
  if (!['arm64', 'x64'].includes(arch) || !['darwin', 'linux', 'win32'].includes(platform)) throw new Error('Codex is not bundled for this platform.');
  const require = createRequire(import.meta.url);
  const root = path.dirname(require.resolve(`@openai/codex-${platform}-${arch}/package.json`)).replace(/app\.asar([/\\])/, 'app.asar.unpacked$1');
  return path.join(root, 'vendor', triple, 'bin', platform === 'win32' ? 'codex.exe' : 'codex');
}

/** Replace the former app-owned restrictions, including on existing installations. */
export async function prepareCodexHome(home: string) {
  home = path.resolve(home);
  const temporary = path.join(home, 'tmp');
  await fs.mkdir(temporary, { recursive: true, mode: 0o700 });
  await atomicHostWrite(home, 'config.toml', 'sandbox_mode = "danger-full-access"\napproval_policy = "never"\nweb_search = "live"\n');
}
export class CodexRpc {
  readonly whenClosed: Promise<void>;
  private disposing?: Promise<void>;
  private nextId = 0;
  private closed = false;
  private stopping = false;
  private killTimer?: ReturnType<typeof setTimeout>;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private listeners = new Set<(message: RpcMessage) => void>();
  private closeListeners = new Set<(error: Error) => void>();
  constructor(private child: ChildProcessWithoutNullStreams, private timeoutMs = 30_000) {
    this.whenClosed = new Promise(resolve => child.once('close', () => resolve()));
    const lines = createInterface({ input: child.stdout });
    lines.on('line', line => {
      let message: RpcMessage;
      try { message = redactResponse(JSON.parse(line)); } catch { this.fail(new Error('Codex returned an invalid protocol message.')); this.dispose(); return; }
      if (message.id !== undefined && !message.method) {
        const pending = this.pending.get(Number(message.id)); if (!pending) return;
        this.pending.delete(Number(message.id)); clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
      } else for (const listener of this.listeners) listener(message);
    });
    // Drain stderr without forwarding potentially sensitive process diagnostics to the renderer.
    child.stderr.resume();
    child.on('error', () => this.fail(new Error('Could not start bundled Codex. Reinstall AppYard and retry.')));
    child.stdin.on('error', () => this.fail(new Error('The Codex connection closed. Reconnect in Settings.')));
    child.on('exit', () => {
      this.stopping = true;
      clearTimeout(this.killTimer);
      // The app-server can exit before its tools or background workers. They
      // must not keep writing to the workspace or holding the RPC pipes open.
      if (process.platform !== 'win32') this.kill('SIGKILL');
      lines.close(); this.fail(new Error('Codex stopped unexpectedly. Reconnect in Settings and retry.'));
    });
  }
  static launch(home: string, credentials: Pick<CodexCredentials, 'accessToken' | 'authType'> = { authType: 'apiKey', accessToken: '' }) {
    const { args, env: inherited } = codexProcessConfig(home, credentials);
    const env = runProcessEnvironment(inherited);
    return new CodexRpc(spawn(codexExecutable(), args, {
      cwd: home, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true
    }));
  }
  async initialize() {
    await this.request('initialize', { clientInfo: { name: CHATGPT_AGENT_NAME, title: 'AppYard', version: '0.1.0' }, capabilities: { experimentalApi: true } });
    this.send({ method: 'initialized', params: {} });
  }
  request(method: string, params: unknown = {}): Promise<any> {
    if (this.closed) return Promise.reject(new Error('Codex is disconnected. Reconnect in Settings.'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Codex ${method} timed out. Retry in Settings.`)); }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.send({ id, method, params }); } catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  send(message: RpcMessage) { if (!this.closed) this.child.stdin.write(JSON.stringify(message) + '\n'); }
  subscribe(listener: (message: RpcMessage) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  onClose(listener: (error: Error) => void) { this.closeListeners.add(listener); return () => { this.closeListeners.delete(listener); }; }
  private fail(error: Error) {
    if (this.closed) return; this.closed = true;
    for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(error); }
    this.pending.clear();
    for (const listener of this.closeListeners) listener(error);
    this.listeners.clear(); this.closeListeners.clear();
  }
  private kill(signal: NodeJS.Signals) {
    const pid = this.child.pid;
    try { if (pid && process.platform !== 'win32') process.kill(-pid, signal); else this.child.kill(signal); } catch {}
  }
  dispose() {
    if (this.disposing) return this.disposing;
    this.disposing = this.whenClosed;
    if (this.stopping) return this.disposing;
    this.stopping = true;
    this.fail(new Error('Codex session closed.'));
    if (this.child.exitCode !== null || this.child.signalCode !== null) return this.disposing;
    this.kill('SIGTERM');
    this.killTimer = setTimeout(() => this.kill('SIGKILL'), 1000); this.killTimer.unref();
    return this.disposing;
  }
}
