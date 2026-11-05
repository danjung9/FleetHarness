import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { streamSimple } from '@earendil-works/pi-ai/api/openai-completions';
import type { GenAiMilConnection, GenAiMilIssue } from '../shared/types.js';
import { redactSecrets, redactValue, registerCredential } from './secrets.js';
import { atomicHostWrite } from '../shared/host-files.js';

export const GENAI_MIL_PROVIDER = 'genai-mil';
export const GENAI_MIL_ADDRESS = 'https://api.genai.mil/v1';
interface Encryption {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}
interface Options { fetch?: typeof fetch; log?: (line: string) => void; now?: () => number }
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
export function genAiMilAddress(value: unknown): string {
  try {
    if (typeof value !== 'string' || value.length > 2048) throw 0;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw 0;
    return url.href.replace(/\/+$/, '');
  } catch { throw new Error('Enter an HTTPS service address without credentials, a query or a fragment.'); }
}
export function genAiMilUnlockUrl(value: unknown): string | undefined {
  try {
    if (typeof value !== 'string' || value.length > 2048 || redactSecrets(value) !== value) return;
    const url = new URL(value);
    if (url.protocol === 'https:' && (url.hostname === 'genai.mil' || url.hostname.endsWith('.genai.mil'))
      && !url.username && !url.password && (!url.port || url.port === '443')) return url.href;
  } catch { /* Untrusted error bodies never supply an unchecked link. */ }
}
const chatId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,250}-withtools$/.test(value)
  && !/embed/i.test(value) && redactSecrets(value) === value;
export function genAiMilModels(body: unknown): string[] {
  const data = object(body).data;
  if (!Array.isArray(data)) throw new Error('GenAI.mil did not return a model list. Check the service address and connect again.');
  return [...new Set(data.filter(row => !/embed/i.test(String(object(row).type ?? object(row).object ?? '')))
    .map(row => object(row).id).filter(chatId))];
}
export function genAiMilError(status: number, body: unknown, headers: Headers, now = Date.now()): GenAiMilIssue {
  const error = object(object(body).error), details = object(error.details);
  if (status === 401 && typeof error.unlock_url === 'string') {
    const unlockUrl = genAiMilUnlockUrl(error.unlock_url);
    return { message: 'Your GenAI.mil key is locked.', nextStep: unlockUrl ? 'Open the unlock link and unlock your key, then connect again.' : 'Unlock your key on the GenAI.mil site, then connect again.', ...(unlockUrl ? { unlockUrl } : {}) };
  }
  if (status === 401) return { message: 'Your GenAI.mil key is invalid or expired.', nextStep: 'Get a new key from the GenAI.mil site and connect again.' };
  if (status === 403) return { message: 'Your GenAI.mil key lacks permission.', nextStep: 'Ask your GenAI.mil administrator for access.' };
  if (status === 410) {
    const replacementModel = chatId(details.replacement_model) ? details.replacement_model : undefined;
    return { message: 'This GenAI.mil model has been retired.', nextStep: replacementModel ? `Refresh the model list and select ${replacementModel}.` : 'Refresh the model list and select another model.', ...(replacementModel ? { replacementModel } : {}) };
  }
  if (status === 429) {
    const value = headers.get('retry-after');
    const seconds = value && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
    const parsed = value ? Date.parse(value) : NaN;
    const retryAt = Math.max(now, Number.isFinite(seconds) ? now + seconds * 1000 : Number.isFinite(parsed) ? parsed : now + 60_000);
    const daily = /daily|per[_ -]?day|insufficient_quota|daily_quota_exceeded/i.test([error.code, error.type, error.message].filter(v => typeof v === 'string').join(' '));
    return { message: daily ? 'Your GenAI.mil daily allowance is used up.' : 'GenAI.mil is temporarily limiting requests.',
      nextStep: daily ? 'Wait for your daily allowance to reset before trying again.' : `Wait ${Math.max(1, Math.ceil((retryAt - now) / 1000))} seconds before trying again.`, retryAt };
  }
  if (status === 502) return { message: 'GenAI.mil is having a service problem.', nextStep: 'Try again in a few minutes.' };
  return { message: 'GenAI.mil could not complete the request.', nextStep: 'Check the service address and connection, then try again.' };
}
const issueText = (issue: GenAiMilIssue) => `${issue.message} ${issue.nextStep}`;
export class GenAiMilRequestError extends Error {}

/** Main-process provider. Only the encrypted file holds the key outside memory. */
export class GenAiMil {
  #key = '';
  #address = GENAI_MIL_ADDRESS;
  #models: string[] = [];
  #connected = false;
  #issue?: GenAiMilIssue;
  #retryAt = 0;
  #retryIssue?: GenAiMilIssue;
  #file: string;
  #fetch: typeof fetch;
  #now: () => number;
  #busy = false;
  constructor(root: string, private encryption: Encryption, private runtime: Pick<ModelRuntime, 'registerProvider' | 'unregisterProvider'>, private options: Options = {}) {
    this.#file = path.join(root, 'genai-mil.enc'); this.#fetch = options.fetch ?? globalThis.fetch; this.#now = options.now ?? Date.now;
  }
  view(): GenAiMilConnection {
    return redactValue({ address: this.#address, hasKey: !!this.#key, connected: this.#connected, models: [...this.#models], ...(this.#issue ? { issue: { ...this.#issue } } : {}) });
  }
  async load(): Promise<void> {
    try {
      const saved = object(JSON.parse(this.encryption.decryptString(await fs.readFile(this.#file))));
      const address = genAiMilAddress(saved.address);
      if (typeof saved.key !== 'string' || !saved.key.trim()) throw 0;
      registerCredential(saved.key); this.#key = saved.key; this.#address = address;
      // A saved credential or catalog never counts as a successful connection.
    } catch (error) {
      if (object(error).code !== 'ENOENT') this.#issue = { message: 'The saved GenAI.mil connection could not be loaded.', nextStep: 'Enter your service address and key again.' };
    }
  }
  async #exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (this.#busy) throw new Error('Wait for the GenAI.mil connection change to finish.');
    this.#busy = true;
    try { return await work(); } finally { this.#busy = false; }
  }
  async save(address: unknown, key?: unknown): Promise<void> {
    return this.#exclusive(async () => {
      // Register before validation so even a key pasted into another field is redacted.
      if (typeof key === 'string') registerCredential(key.trim());
      const nextAddress = genAiMilAddress(address);
      if (redactSecrets(nextAddress) !== nextAddress) throw new Error('Enter a service address without a key.');
      if (key !== undefined && (typeof key !== 'string' || !key.trim() || key.length > 20000 || /[\r\n]/.test(key))) throw new Error('Enter a valid GenAI.mil key.');
      const nextKey = typeof key === 'string' ? key.trim() : this.#key;
      if (!nextKey) throw new Error('Enter a GenAI.mil key from the GenAI.mil site.');
      if (nextAddress !== this.#address && key === undefined) throw new Error('Enter your key again when changing the service address.');
      if (!this.encryption.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable. Restore operating-system encryption and try again.');
      try {
        await atomicHostWrite(path.dirname(this.#file), path.basename(this.#file), this.encryption.encryptString(JSON.stringify({ address: nextAddress, key: nextKey })));
      } catch { throw new Error('The GenAI.mil connection could not be saved. Check local storage and try again.'); }
      this.runtime.unregisterProvider(GENAI_MIL_PROVIDER);
      this.#address = nextAddress; this.#key = nextKey; this.#models = []; this.#connected = false; this.#issue = undefined;
    });
  }
  async clear(): Promise<void> {
    return this.#exclusive(async () => {
      try { await fs.rm(this.#file, { force: true }); }
      catch { throw new Error('The GenAI.mil connection could not be cleared. Check local storage and try again.'); }
      this.runtime.unregisterProvider(GENAI_MIL_PROVIDER);
      this.#key = ''; this.#address = GENAI_MIL_ADDRESS; this.#models = []; this.#connected = false; this.#issue = undefined;
    });
  }
  assertModel(backend: string, model: string): void {
    if (this.#busy || backend !== 'pi' || !this.#connected || !chatId(model) || !this.#models.includes(model))
      throw new Error('Connect GenAI.mil and select an available -withtools model on Pi before building.');
  }
  buildError(error: unknown): unknown { return this.#issue ? new GenAiMilRequestError(issueText(this.#issue)) : error; }
  async connect(): Promise<void> {
    return this.#exclusive(async () => {
      this.runtime.unregisterProvider(GENAI_MIL_PROVIDER); this.#connected = false; this.#models = []; this.#issue = undefined;
      if (!this.#key) throw new Error('Save your GenAI.mil key before connecting.');
      try {
        const response = await this.#request('/models', { method: 'GET', signal: AbortSignal.timeout(30_000) });
        if (!response.ok) return;
        this.#models = genAiMilModels(await response.json());
        this.#connected = true;
        if (!this.#models.length) this.#issue = { message: 'GenAI.mil returned no models that support agent tools.', nextStep: 'Ask your administrator for access to a -withtools chat model.' };
        this.#register();
      } catch {
        this.#issue ??= { message: 'GenAI.mil did not return a usable model list.', nextStep: 'Check the service address and connection, then connect again.' };
      }
    });
  }
  #register() {
    this.runtime.registerProvider(GENAI_MIL_PROVIDER, {
      name: 'GenAI.mil', baseUrl: this.#address, api: 'openai-completions',
      // This nonsecret marker satisfies Pi authentication discovery. The real key
      // is attached only by the main-process transport, never handed to the SDK.
      apiKey: 'genai-mil-main-process',
      models: this.#models.map(id => ({ id, name: id, reasoning: false, input: ['text'],
        // Local conservative budgets, not claims about the service's limits or prices.
        contextWindow: 32768, maxTokens: 4096, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        compat: { supportsUsageInStreaming: true, supportsDeveloperRole: false } })),
      streamSimple: (model, context, options) => {
        this.assertModel('pi', model.id);
        return streamSimple({ ...model, api: 'openai-completions' }, context, { ...options,
          apiKey: 'genai-mil-main-process', fetch: this.#chatFetch,
          onPayload: async (payload, selected) => {
            const result = await options?.onPayload?.(payload, selected) ?? payload;
            return { ...object(result), stream_options: { include_usage: true } };
          }
        });
      }
    });
  }
  #chatFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== this.#address + '/chat/completions' || init?.method !== 'POST') throw new Error('Unsupported GenAI.mil request.');
    const body = object(JSON.parse(String(init.body)));
    this.assertModel('pi', String(body.model));
    return this.#request('/chat/completions', { ...init, body: JSON.stringify({ ...body, stream_options: { include_usage: true } }) });
  };
  #errorResponse(status: number): Response {
    // Do not let SDK retries ignore Retry-After or retain arbitrary error bodies.
    return Response.json({ error: { message: issueText(this.#issue!) } }, { status,
      headers: { 'x-should-retry': 'false' } });
  }
  async #request(route: string, init: RequestInit): Promise<Response> {
    if (this.#now() < this.#retryAt) {
      this.#issue = this.#retryIssue;
      return this.#errorResponse(429);
    }
    let response: Response;
    try {
      response = await this.#fetch(this.#address + route, { ...init, redirect: 'error',
        headers: { 'Authorization': 'Bearer ' + this.#key, 'Content-Type': 'application/json' } });
    } catch {
      this.#issue = { message: 'GenAI.mil could not be reached.', nextStep: 'Check your connection and service address, then try again.' };
      // No raw fetch exception, request object or cause can expose Authorization.
      throw new Error(issueText(this.#issue));
    }
    const requestId = redactSecrets(response.headers.get('x-request-id') ?? '').replace(/[^A-Za-z0-9._:/-]/g, '').slice(0, 200);
    this.options.log?.(`GenAI.mil ${route} status=${response.status}${requestId ? ' x-request-id=' + requestId : ''}`);
    if (!response.ok) {
      let body: unknown;
      try { body = await response.json(); } catch { body = {}; }
      this.#issue = genAiMilError(response.status, body, response.headers, this.#now());
      if (this.#issue.retryAt) { this.#retryAt = this.#issue.retryAt; this.#retryIssue = this.#issue; }
      if ([401, 403].includes(response.status)) this.#connected = false;
      return this.#errorResponse(response.status);
    }
    this.#issue = undefined;
    // Provider headers do not flow into SDK diagnostics or persisted sessions.
    return new Response(response.body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' } });
  }
}
