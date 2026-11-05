import { constants, promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import type { AgentBackend, AgentModel, Settings } from '../shared/types.js';

export const preflightTimeoutMs = 15000;
// Bound persistence separately after the readiness check finishes.
export const refusalSaveTimeoutMs = 250;
export const minimumFreeBytes = 256 * 1024 ** 2;
export const preflightMessages = {
  engine: 'The build service is not connected; connect it in Model settings and try again.',
  model: 'The selected build option is unavailable; reconnect the service in Model settings and try again.',
  browser: 'The browser needed to check your app is unavailable; install Google Chrome and try again.',
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

/** A single budget covers connection, model, browser and disk checks. */
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
