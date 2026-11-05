import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn, type SpawnOptions } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import type { AgentBackend, AgentModel, Settings } from '../shared/types.js';
import { createCodexSession } from './codex-session.js';
import { codexExecutable } from './codex-rpc.js';

export const preflightTimeoutMs = 1500;
export const minimumFreeBytes = 256 * 1024 ** 2;
export const preflightMessages = {
  engine: 'The build service is not connected; connect it in Model settings and try again.',
  model: 'The selected build option is unavailable; reconnect the service in Model settings and try again.',
  browser: 'The browser needed to check your app is unavailable; install Google Chrome and try again.',
  sandbox: 'Safe build tools could not start; restart AppYard and ask the app maintainer for help if this continues.',
  disk: 'AppYard could not confirm enough free space; check that this drive has at least 256 MB free and try again.',
  stopped: 'The build was stopped; press Start build when you are ready to try again.'
} as const;
export type PreflightCode = keyof typeof preflightMessages;
export interface BuildSelection { backend: AgentBackend; provider: string; model: string }
const providerDefaults: Record<string, string> = {
  openai: 'gpt-6.1-sol', 'openai-codex': 'gpt-6.1-sol', anthropic: 'claude-opus-4-8',
  google: 'gemini-3.1-pro-preview', 'google-vertex': 'gemini-3.1-pro-preview', azure: 'gpt-5.4'
};

export interface PreflightOptions {
  settings: Settings; root: string;
  engine: (signal: AbortSignal) => Promise<{ connected: boolean; models: AgentModel[] }>;
  browser?: (signal: AbortSignal) => Promise<unknown>;
  // Must exercise the same containment mechanism as the build, without inference.
  // A missing probe refuses startup rather than treating an ordinary cwd as isolation.
  sandbox?: (signal: AbortSignal, selection: BuildSelection) => Promise<unknown>;
  freeBytes?: (root: string, signal: AbortSignal) => Promise<number>;
  signal?: AbortSignal; timeoutMs?: number;
}
export class PreflightError extends Error {
  constructor(public readonly code: PreflightCode, cause?: unknown) {
    super(preflightMessages[code], { cause }); this.name = 'PreflightError';
  }
}

function selectModel(settings: Settings, models: AgentModel[]): BuildSelection {
  const backend = settings.backend ?? 'pi', provider = settings.provider;
  const available = models.filter(model => model.configured && model.provider === provider && (model.backend ?? 'pi') === backend);
  // Use only a model the connected service actually advertises. Preserve an explicit choice.
  const preferred = backend === 'codex' ? ['gpt-6.1-sol', 'gpt-5.4', 'gpt-5.3-codex'] : [providerDefaults[provider]].filter(Boolean);
  const selected = settings.model ? available.find(model => model.id === settings.model)
    : preferred.map(id => available.find(model => model.id === id)).find(Boolean) ?? available[0];
  if (!selected) throw new PreflightError('model');
  return { backend, provider, model: selected.id };
}

/** A single budget covers connection, model, browser, containment and disk checks. */
export async function runPreflight(options: PreflightOptions): Promise<BuildSelection> {
  const controller = new AbortController();
  if (options.signal?.aborted) throw new PreflightError('stopped', options.signal.reason);
  let checking: PreflightCode = 'engine';
  let reject!: (error: PreflightError) => void;
  const interrupted = new Promise<never>((_resolve, fail) => { reject = fail; });
  const stop = (error: PreflightError) => { reject(error); controller.abort(error); };
  const abort = () => stop(new PreflightError('stopped', options.signal?.reason));
  options.signal?.addEventListener('abort', abort, { once: true });
  // Callers may shorten the deadline for tests, never extend the production budget.
  const requested = options.timeoutMs ?? preflightTimeoutMs;
  const timeoutMs = Number.isFinite(requested) && requested > 0 ? Math.min(requested, preflightTimeoutMs) : preflightTimeoutMs;
  const timer = setTimeout(() => stop(new PreflightError(checking, 'Readiness check timed out.')), timeoutMs);
  const check = async <T>(code: PreflightCode, work: () => Promise<T>): Promise<T> => {
    controller.signal.throwIfAborted(); checking = code;
    try { const result = await work(); controller.signal.throwIfAborted(); return result; }
    catch (error) { throw error instanceof PreflightError ? error : new PreflightError(code, error); }
  };
  try {
    return await Promise.race([(async () => {
      const engine = await check('engine', () => options.engine(controller.signal));
      if (!engine.connected) throw new PreflightError('engine');
      const selection = selectModel(options.settings, engine.models);
      await check('browser', () => (options.browser ?? findVerificationBrowser)(controller.signal));
      await check('sandbox', async () => {
        if (!options.sandbox) throw new PreflightError('sandbox', 'No containment startup probe was supplied.');
        await options.sandbox(controller.signal, selection);
      });
      const bytes = await check('disk', async () => {
        if (options.freeBytes) return options.freeBytes(options.root, controller.signal);
        const stat = await fs.statfs(options.root, { bigint: true });
        return Number(stat.bavail * stat.bsize);
      });
      if (!Number.isFinite(bytes) || bytes < minimumFreeBytes) throw new PreflightError('disk');
      return selection;
    })(), interrupted]);
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
    controller.abort();
  }
}

/** Resolve the exact headless/default and chrome/channel launch targets of Playwright 1.64.1. */
export function verificationBrowserCandidates(): string[] {
  // executablePath() on BrowserType points at full Chromium, while headless
  // verification launches chromium-headless-shell. Use the pinned runtime registry.
  const require = createRequire(import.meta.url);
  const { registry: { registry } } = require('playwright-core/lib/coreBundle') as {
    registry: { registry: { findExecutable(name: string): { executablePath(): string | undefined } | undefined } }
  };
  return ['chromium-headless-shell', 'chrome'].map(name => registry.findExecutable(name)?.executablePath())
    .filter((file): file is string => Boolean(file));
}

/** Same Chromium/Chrome candidates as browser verification; no download or model call. */
export async function findVerificationBrowser(signal: AbortSignal, candidates?: string[]): Promise<string> {
  for (const candidate of candidates ?? verificationBrowserCandidates()) {
    signal.throwIfAborted();
    try {
      await fs.access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
      if ((await fs.stat(candidate)).isFile()) { signal.throwIfAborted(); return candidate; }
    } catch { signal.throwIfAborted(); }
  }
  throw new PreflightError('browser');
}

/** Starts the existing app-owned permission profile and thread, never a model turn. */
export async function probeCodexSandbox(options: {
  home: string; cwd: string; model: string; signal: AbortSignal;
  getCredentials?: Parameters<typeof createCodexSession>[0]['getCredentials'];
  create?: (options: Parameters<typeof createCodexSession>[0]) => Promise<Pick<Awaited<ReturnType<typeof createCodexSession>>, 'dispose'>>;
}) {
  options.signal.throwIfAborted();
  const session = await (options.create ?? createCodexSession)({
    home: options.home, cwd: options.cwd, model: options.model, signal: options.signal, tools: [], getCredentials: options.getCredentials
  });
  try { options.signal.throwIfAborted(); } finally { session.dispose(); }
}

/** Exercise the native verification boundary with trusted code and no account. */
export async function probeVerificationSandbox(options: {
  root: string; executable: string; signal: AbortSignal;
  launch?: (runner: string, args: string[], options: SpawnOptions) => ReturnType<typeof spawn>;
}) {
  options.signal.throwIfAborted();
  const scratch = await fs.mkdtemp(path.join(options.root, 'preflight-'));
  try {
    const runner = codexExecutable(), runtime = await fs.realpath(options.executable);
    const runtimeRoot = runtime.match(/^(.*\.app)[/\\]Contents[/\\]/)?.[1]
      ?? (runtime.startsWith('/opt/homebrew/') ? '/opt/homebrew' : path.dirname(runtime));
    // Match the verifier's fleet-build boundary, including the packaged Electron runtime.
    const toolchains = [...new Set(['/Library/Developer', '/opt/homebrew', '/usr/local', path.dirname(process.execPath), path.dirname(runner), runtimeRoot])];
    const filesystem = { ':root': 'deny', ':minimal': 'read', ':workspace_roots': 'write',
      ...Object.fromEntries(toolchains.map(folder => [folder, 'read'])) };
    const toml = '{' + Object.entries(filesystem).map(([key, value]) => JSON.stringify(key) + '=' + JSON.stringify(value)).join(',') + '}';
    const cwd = await fs.realpath(scratch);
    const marker = 'appyard-preflight-ready-' + randomUUID();
    const args = ['sandbox', '-P', 'fleet-build', '-c', 'permissions.fleet-build.filesystem=' + toml,
      '-c', 'permissions.fleet-build.network.enabled=false',
      '-c', 'projects={' + JSON.stringify(cwd) + '={trust_level="untrusted"}}',
      '--', runtime, '--input-type=commonjs', '-e', `process.stdout.write(${JSON.stringify(marker)});`];
    options.signal.throwIfAborted();
    const child = (options.launch ?? spawn)(runner, args, {
      cwd, env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT,
        HOME: cwd, CODEX_HOME: cwd, TMPDIR: cwd, TEMP: cwd, TMP: cwd, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true
    });
    const kill = () => {
      try { if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {}
    };
    let output = '', stdout = '';
    let abort!: () => void;
    try {
      await new Promise<void>((resolve, reject) => {
        const failure = (cause: unknown) => reject(new PreflightError('sandbox', cause));
        abort = () => { kill(); failure(options.signal.reason); };
        const collect = (chunk: Buffer) => {
          output += chunk.toString();
          if (output.length > 64_000) { kill(); failure('Sandbox readiness output exceeded its limit.'); }
        };
        child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); collect(chunk); }); child.stderr?.on('data', collect);
        child.once('error', failure);
        child.once('close', code => code === 0 && stdout === marker ? resolve() : failure(output || 'Sandbox readiness marker missing.'));
        options.signal.addEventListener('abort', abort, { once: true });
        if (options.signal.aborted) abort();
      });
    } finally {
      options.signal.removeEventListener('abort', abort);
      kill(); child.stdout?.destroy(); child.stderr?.destroy();
    }
  } catch (error) { throw error instanceof PreflightError ? error : new PreflightError('sandbox', error); }
  finally { await fs.rm(scratch, { recursive: true, force: true }); }
}
