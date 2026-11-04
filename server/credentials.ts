import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai';
import type { AgentModel } from '../shared/types.js';
import { HttpError } from './http.js';

function encryptionKey(encoded = process.env.CREDENTIAL_ENCRYPTION_KEY): Buffer {
  if (!encoded) throw new HttpError(503, 'Account credential storage is not configured.');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) {
    throw new HttpError(503, 'Account credential storage is not configured.');
  }
  return key;
}

export function encryptKey(userId: string, apiKey: string, secret?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  cipher.setAAD(Buffer.from(`fleetharness:openai:v1:${userId}`));
  const data = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decryptKey(userId: string, encrypted: string, secret?: string): string {
  try {
    const [version, rawIv, rawTag, rawData, extra] = encrypted.split('.');
    if (version !== 'v1' || extra || !rawIv || !rawTag || !rawData) throw new Error();
    const iv = Buffer.from(rawIv, 'base64url'), tag = Buffer.from(rawTag, 'base64url');
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const cipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv);
    cipher.setAAD(Buffer.from(`fleetharness:openai:v1:${userId}`));
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(Buffer.from(rawData, 'base64url')), cipher.final()]).toString('utf8');
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, 'The saved OpenAI key cannot be opened. Reconnect it in Settings.', 'credential_unavailable');
  }
}

const bundledModels = openaiProvider().getModels().map(model => ({
  id: model.id, name: model.name, provider: 'openai', backend: 'pi' as const, configured: false,
}));

export function openAIModels(configured = false, availableIds?: string[]): AgentModel[] {
  const available = availableIds ? new Set(availableIds) : undefined;
  return bundledModels.filter(model => !available || available.has(model.id))
    .map(model => ({ ...model, configured }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function validateModelId(model: unknown): string {
  if (typeof model !== 'string' || !bundledModels.some(item => item.id === model)) {
    throw new HttpError(400, 'Select a supported OpenAI model.');
  }
  return model;
}

export async function validateOpenAIKey(apiKey: string, model: string, fetcher: typeof fetch = fetch): Promise<string[]> {
  if (typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 1024 || /\s/.test(apiKey)) {
    throw new HttpError(400, 'Enter a valid OpenAI API key.');
  }
  validateModelId(model);
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const call = async (path: string, init: RequestInit = {}) => {
    let response: Response;
    try {
      response = await fetcher(`https://api.openai.com/v1/${path}`, {
        ...init, headers, signal: AbortSignal.timeout(45_000),
      });
    } catch { throw new HttpError(502, 'OpenAI could not be reached. Check the connection and try again.', 'provider_unavailable'); }
    if (!response.ok) {
      const status = response.status;
      if (status === 401) throw new HttpError(400, 'OpenAI rejected this API key. Check or replace it.', 'invalid_api_key');
      if (status === 403 || status === 404) throw new HttpError(400, 'This key cannot access the selected model. Choose another model or check its project permissions.', 'model_access_denied');
      if (status === 429) throw new HttpError(429, 'OpenAI usage or rate limits prevented the connection test. Check your project credits and retry.', 'provider_limit');
      if (status === 400) throw new HttpError(400, 'The selected model could not complete a connection test. Choose another model.', 'model_test_failed');
      throw new HttpError(502, 'OpenAI is temporarily unavailable. Try again shortly.', 'provider_unavailable');
    }
    return response;
  };
  const list = await (await call('models')).json() as { data?: { id: string }[] };
  const ids = Array.isArray(list.data) ? list.data.map(item => item.id).filter(id => typeof id === 'string') : [];
  if (!ids.includes(model)) throw new HttpError(400, 'This key cannot access the selected model. Choose another model.', 'model_access_denied');
  // A model listing alone does not demonstrate permission or credit to generate.
  const result = await (await call('responses', { method: 'POST', body: JSON.stringify({
    model, input: 'Reply with OK.', max_output_tokens: 64, store: false,
  }) })).json() as { status?: string; error?: unknown };
  if (result.error || (result.status !== 'completed' && result.status !== 'incomplete')) {
    throw new HttpError(502, 'OpenAI did not finish the connection test. Try again.', 'model_test_failed');
  }
  return ids.filter(id => bundledModels.some(model => model.id === id));
}
