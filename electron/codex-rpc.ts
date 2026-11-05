import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runProcessEnvironment } from './process-sweep.js';

export interface RpcMessage { id?: number | string; method?: string; params?: any; result?: any; error?: { code: number; message: string } }
export const CHATGPT_MODEL_PROVIDER = 'openai_chatgpt_plan';
export const CHATGPT_ACCESS_TOKEN_ENV = 'FLEET_CHATGPT_ACCESS_TOKEN';
export const CHATGPT_AGENT_NAME = 'AppYard';
export interface CodexCredentials { accessToken: string; expiresAt: number }

/** Keep the subscription bearer token out of command-line arguments and RPC messages. */
export function codexProcessConfig(home: string, credentials: Pick<CodexCredentials, 'accessToken'>, inheritedEnv: NodeJS.ProcessEnv = process.env) {
  if (!credentials?.accessToken?.trim()) throw new Error('Sign in with ChatGPT in Model settings before running Codex.');
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
    'features.code_mode_tool_search=false',
    'features.image_generation=false',
    'features.computer_use=false',
    `shell_environment_policy.exclude=["${CHATGPT_ACCESS_TOKEN_ENV}"]`
  ];
  return { args: ['app-server', '--listen', 'stdio://', ...config.flatMap(value => ['-c', value])], env };
}
export function codexExecutable() {
  const platform = process.platform, arch = process.arch;
  const triple = `${arch === 'arm64' ? 'aarch64' : 'x86_64'}-${platform === 'darwin' ? 'apple-darwin' : platform === 'win32' ? 'pc-windows-msvc' : 'unknown-linux-musl'}`;
  if (!['arm64', 'x64'].includes(arch) || !['darwin', 'linux', 'win32'].includes(platform)) throw new Error('Codex is not bundled for this platform.');
  const require = createRequire(import.meta.url);
  const root = path.dirname(require.resolve(`@openai/codex-${platform}-${arch}/package.json`)).replace(/app\.asar([/\\])/, 'app.asar.unpacked$1');
  return path.join(root, 'vendor', triple, 'bin', platform === 'win32' ? 'codex.exe' : 'codex');
}
export class CodexRpc {
  private nextId = 0;
  private closed = false;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private listeners = new Set<(message: RpcMessage) => void>();
  private closeListeners = new Set<(error: Error) => void>();
  constructor(private child: ChildProcessWithoutNullStreams, private timeoutMs = 30_000) {
    const lines = createInterface({ input: child.stdout });
    lines.on('line', line => {
      let message: RpcMessage;
      try { message = JSON.parse(line); } catch { this.fail(new Error('Codex returned an invalid protocol message.')); this.dispose(); return; }
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
    child.on('exit', () => { lines.close(); this.fail(new Error('Codex stopped unexpectedly. Reconnect in Settings and retry.')); });
  }
  static launch(home: string, credentials: Pick<CodexCredentials, 'accessToken'>) {
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
  dispose() {
    this.fail(new Error('Codex session closed.'));
    const pid = this.child.pid;
    const kill = (signal: NodeJS.Signals) => { try { if (pid && process.platform !== 'win32') process.kill(-pid, signal); else this.child.kill(signal); } catch {} };
    kill('SIGTERM');
    const timer = setTimeout(() => kill('SIGKILL'), 1000); timer.unref();
    this.child.once('exit', () => clearTimeout(timer));
  }
}
