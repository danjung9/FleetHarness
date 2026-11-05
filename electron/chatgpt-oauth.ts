import { atomicHostWrite } from '../shared/host-files.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';

// Public-client protocol: https://developers.openai.com/siwc/token-sharing-open-source/sign-in
export const CHATGPT_ISSUER = 'https://auth.openai.com';
export const CHATGPT_RESOURCE = 'https://api.openai.com/v1';
export const CHATGPT_SCOPES = ['openid', 'profile', 'email', 'offline_access', 'resource.invoke', 'chatgpt.tokens.use.direct'];
export interface ChatGPTTokens {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  scopes: string[];
  expiresAt: number;
}
export interface ChatGPTRegistration {
  id: string;
  label: string;
  clientId: string;
  issuer: typeof CHATGPT_ISSUER;
  subject?: string;
  email?: string;
  tokens?: ChatGPTTokens;
}
export interface ChatGPTState {
  version: 1;
  hostId: string;
  activeId?: string;
  retryId?: string;
  registrations: ChatGPTRegistration[];
}
export class ChatGPTAuthError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}
export const secretString = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && !/[\x00-\x20\x7f]/.test(value);
export const planEnabled = (tokens?: ChatGPTTokens) => !!tokens?.accessToken && ['resource.invoke', 'chatgpt.tokens.use.direct'].every(scope => tokens.scopes.includes(scope));
export const authError = (error: unknown) => error instanceof ChatGPTAuthError ? error.message : 'ChatGPT could not be reached. Check your connection and try again.';

function validateState(value: unknown): ChatGPTState {
  const state = value as ChatGPTState;
  if (!state || state.version !== 1 || !/^urn:uuid:[a-f\d-]{36}$/i.test(state.hostId) || !Array.isArray(state.registrations)) throw new Error('Invalid state');
  const ids = new Set<string>(), clients = new Set<string>();
  for (const r of state.registrations) {
    if (!r || !secretString(r.id) || ids.has(r.id) || !secretString(r.clientId) || r.clientId === 'dynamic_agent_client' || clients.has(r.clientId) ||
      r.issuer !== CHATGPT_ISSUER || typeof r.label !== 'string' || !r.label || (r.subject !== undefined && !secretString(r.subject)) || (r.email !== undefined && typeof r.email !== 'string')) throw new Error('Invalid registration');
    ids.add(r.id); clients.add(r.clientId);
    if (r.tokens) {
      const t = r.tokens;
      if (!r.subject || !secretString(t.idToken) || !Array.isArray(t.scopes) || !t.scopes.every(secretString) || !Number.isFinite(t.expiresAt) || t.expiresAt < 0 ||
        (t.accessToken !== undefined && (!secretString(t.accessToken) || t.accessToken.startsWith('sk-'))) || (t.refreshToken !== undefined && !secretString(t.refreshToken))) throw new Error('Invalid credentials');
    }
  }
  if ((state.activeId !== undefined && !ids.has(state.activeId)) || (state.retryId !== undefined && !ids.has(state.retryId))) throw new Error('Invalid selection');
  return state;
}

export async function readChatGPTState(file: string): Promise<ChatGPTState | undefined> {
  try { return validateState(JSON.parse(await fs.readFile(file, 'utf8'))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw new ChatGPTAuthError('Saved ChatGPT credentials could not be read. Check local file access before reconnecting.');
  }
}

export async function writeChatGPTState(file: string, state: ChatGPTState) {
  try {
    validateState(state);
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    if (process.platform !== 'win32') await fs.chmod(path.dirname(file), 0o700);
    await atomicHostWrite(path.dirname(file), path.basename(file), JSON.stringify(state) + '\n');
  } catch { throw new ChatGPTAuthError('ChatGPT credentials could not be saved. Check local file access before reconnecting.'); }
}

export async function authJSON(request: typeof fetch, url: string, init: RequestInit = {}) {
  let response: Response;
  try { response = await request(url, { ...init, redirect: 'error', signal: init.signal ?? AbortSignal.timeout(15_000) }); }
  catch { throw new ChatGPTAuthError('ChatGPT could not be reached. Check your connection and try again.'); }
  let body: any;
  try { body = await response.json(); }
  catch { throw new ChatGPTAuthError('ChatGPT returned an unreadable response. Please try again.'); }
  if (!response.ok) {
    // Error descriptions may echo credentials. Only machine codes select safe, app-owned copy.
    const code = typeof body?.error === 'string' ? body.error : body?.error?.code;
    throw new ChatGPTAuthError(response.status === 401 ? 'ChatGPT authorization was rejected. Reconnect this account in Settings.' : 'ChatGPT could not complete the request. Please try again.', typeof code === 'string' ? code : undefined);
  }
  return body;
}

export class ChatGPTIdentityVerifier {
  private keys?: ReturnType<typeof createLocalJWKSet>;
  private fetchedAt = 0;
  constructor(private request: typeof fetch, private now: () => number) {}
  async verify(token: string, clientId: string, nonce?: string, subject?: string, signal?: AbortSignal) {
    try {
      const loadKeys = async () => {
        const body = await authJSON(this.request, `${CHATGPT_ISSUER}/.well-known/jwks.json`, { signal });
        this.keys = createLocalJWKSet(body as JSONWebKeySet); this.fetchedAt = this.now();
      };
      if (!this.keys || this.now() - this.fetchedAt > 10 * 60_000) await loadKeys();
      const verify = () => jwtVerify(token, this.keys!, { issuer: CHATGPT_ISSUER, audience: clientId, algorithms: ['RS256', 'ES256'],
        requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5, currentDate: new Date(this.now()) });
      let result;
      try { result = await verify(); }
      catch (error) {
        if ((error as { code?: string }).code !== 'ERR_JWKS_NO_MATCHING_KEY') throw error;
        await loadKeys(); result = await verify();
      }
      const p = result.payload;
      if (!secretString(p.sub) || (nonce !== undefined && p.nonce !== nonce) || (subject !== undefined && p.sub !== subject) ||
        (p.azp !== undefined && p.azp !== clientId) || (Array.isArray(p.aud) && p.aud.length > 1 && p.azp !== clientId)) throw new Error('Identity mismatch');
      return { subject: p.sub, ...(typeof p.email === 'string' ? { email: p.email } : {}) };
    } catch { throw new ChatGPTAuthError('ChatGPT sign-in could not be verified. Select the intended account and try again.'); }
  }
}

export function chatGPTTokenSet(body: any, now: number, previous?: ChatGPTTokens): ChatGPTTokens {
  const idToken = body?.id_token ?? previous?.idToken;
  const scopes = typeof body?.scope === 'string' ? body.scope.split(/\s+/).filter(Boolean) : previous?.scopes;
  const accessToken = body?.access_token;
  const refreshToken = body?.refresh_token ?? previous?.refreshToken;
  if (!secretString(idToken) || !scopes || !scopes.includes('openid') || (previous && !secretString(body?.refresh_token)) ||
    (accessToken !== undefined && (!secretString(accessToken) || accessToken.startsWith('sk-') || body.token_type?.toLowerCase() !== 'bearer' || !Number.isFinite(body.expires_in) || body.expires_in <= 0)) ||
    (refreshToken !== undefined && !secretString(refreshToken)) ||
    (scopes.includes('chatgpt.tokens.use.direct') && (!accessToken || !scopes.includes('resource.invoke'))) ||
    (scopes.includes('offline_access') && !refreshToken)) throw new ChatGPTAuthError('ChatGPT returned incomplete credentials. Reconnect this account.');
  return { idToken, scopes, expiresAt: accessToken ? now + body.expires_in * 1000 : now,
    ...(accessToken ? { accessToken } : {}), ...(refreshToken ? { refreshToken } : {}) };
}
