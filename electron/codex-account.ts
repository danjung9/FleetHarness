import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import type { AgentModel, ChatGPTAccount } from '../shared/types.js';
import { CHATGPT_AGENT_NAME, CodexRpc, prepareCodexHome, protectCodexKey, type CodexCredentials } from './codex-rpc.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { registerCredential } from './secrets.js';
import { CHATGPT_ISSUER, CHATGPT_RESOURCE, CHATGPT_SCOPES, ChatGPTAuthError, ChatGPTIdentityVerifier,
  authError, authJSON, chatGPTTokenSet, planEnabled, readChatGPTState, secretString, writeChatGPTState,
  type ChatGPTRegistration, type ChatGPTState } from './chatgpt-oauth.js';

interface LoginAttempt {
  epoch: number; server: Server; controller: AbortController;
  state: string; nonce: string; verifier: string; consumed: boolean;
  redirectUri?: string; authUrl?: string; timer?: ReturnType<typeof setTimeout>;
  registrationId?: string;
}
interface Options { fetch?: typeof fetch; now?: () => number; loginTimeoutMs?: number; launch?: typeof CodexRpc.launch }
const random = () => randomBytes(32).toString('base64url');
const unusableRefresh = new Set(['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused']);

/** App-owned SIWC registration. Only the safe snapshot and model catalog cross renderer IPC. */
export class CodexAccount {
  account: ChatGPTAccount = { status: 'disconnected', accounts: [], planUsageEnabled: false };
  models: AgentModel[] = [];
  readonly home: string;
  private readonly file: string;
  private readonly request: typeof fetch;
  private readonly now: () => number;
  private readonly verifier: ChatGPTIdentityVerifier;
  private state?: ChatGPTState;
  private initialization?: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();
  private pending?: LoginAttempt;
  private refreshing?: { epoch: number; promise: Promise<void> };
  private epoch = 0;
  private disposed = false;
  private changingAccount = false;
  private storageFailed = false;
  private lastError?: string;
  private apiMode = false;
  private keyLogin?: Promise<void>;
  private keyRpc?: CodexRpc;
  private keyInitialization?: Promise<CodexRpc>;
  get route() { return this.apiMode ? { provider: 'openai', label: 'API key' } : { provider: 'chatgpt', label: 'ChatGPT subscription' }; }

  constructor(root: string, private openExternal: (url: string) => Promise<void>, private options: Options = {}) {
    this.home = path.join(root, 'codex');
    this.file = path.join(root, 'chatgpt', 'credentials.json');
    this.request = options.fetch ?? fetch; this.now = options.now ?? Date.now;
    this.verifier = new ChatGPTIdentityVerifier(this.request, this.now);
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {}); return next;
  }
  private async ready() {
    if (this.disposed) throw new ChatGPTAuthError('AppYard is closing.');
    if (!this.initialization) this.initialization = (async () => {
      await fs.mkdir(this.home, { recursive: true, mode: 0o700 });
      const saved = await readChatGPTState(this.file);
      if (saved) this.state = saved;
      else await this.persist({ version: 1, hostId: `urn:uuid:${randomUUID()}`, registrations: [] });
      for (const registration of this.state!.registrations) for (const value of Object.values(registration.tokens ?? {})) registerCredential(value);
      try { this.apiMode = JSON.parse(await fs.readFile(path.join(this.home, 'connection.json'), 'utf8')).authType === 'apiKey'; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    })();
    await this.initialization;
    if (this.disposed) throw new ChatGPTAuthError('AppYard is closing.');
  }
  private async persist(next: ChatGPTState) {
    try { await writeChatGPTState(this.file, next); this.state = next; }
    catch (error) { this.storageFailed = true; this.models = []; throw error; }
  }
  private selected() { return this.state?.registrations.find(r => r.id === this.state?.activeId); }
  private snapshot() {
    if (this.apiMode) return;
    const active = this.selected();
    this.account = {
      status: this.pending ? 'connecting' : this.storageFailed ? 'unavailable' : active?.tokens && !this.changingAccount ? 'connected' : 'disconnected',
      accounts: (this.state?.registrations ?? []).map(r => ({ id: r.id, label: r.label, email: r.email, connected: !!r.tokens })),
      ...(active ? { activeAccountId: active.id, email: active.email } : {}),
      planUsageEnabled: !this.storageFailed && !this.changingAccount && planEnabled(active?.tokens),
      ...(this.lastError ? { error: this.lastError } : {})
    };
  }
  private isCurrent(attempt: LoginAttempt) { return !this.disposed && this.pending === attempt && this.epoch === attempt.epoch && !attempt.controller.signal.aborted; }
  private checkAttempt(attempt: LoginAttempt) { if (!this.isCurrent(attempt)) throw new ChatGPTAuthError('ChatGPT sign-in was cancelled.'); }
  private stopListener(attempt: LoginAttempt) {
    try { attempt.server.close(); attempt.server.closeAllConnections(); } catch { /* The listener may not have started yet. */ }
  }
  private finish(attempt: LoginAttempt) {
    clearTimeout(attempt.timer); this.stopListener(attempt);
    if (this.pending === attempt) this.pending = undefined;
  }
  private invalidate() {
    ++this.epoch;
    if (this.pending) { this.pending.controller.abort(); this.finish(this.pending); }
    this.models = [];
  }
  private tokenRequest(fields: Record<string, string>, signal?: AbortSignal) {
    return authJSON(this.request, `${CHATGPT_ISSUER}/api/accounts/oauth/token`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({ ...fields, resource: CHATGPT_RESOURCE }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000)
    });
  }

  async login(accountId?: string) {
    if (this.keyLogin) throw new ChatGPTAuthError('Finish or cancel the current sign-in before trying again.');
    if (this.apiMode) { await this.useApiMode(false); this.models = []; }
    if (this.pending) return;
    if (this.changingAccount) throw new ChatGPTAuthError('Wait for the account change to finish.');
    const attempt: LoginAttempt = { epoch: ++this.epoch, server: createServer(), controller: new AbortController(), state: random(), nonce: random(), verifier: random(), consumed: false };
    this.pending = attempt; this.lastError = undefined; this.snapshot();
    attempt.timer = setTimeout(() => {
      if (!this.isCurrent(attempt)) return;
      const previousModels = this.models;
      this.invalidate(); this.models = previousModels;
      this.lastError = 'ChatGPT sign-in timed out. Continue with ChatGPT to try again.'; this.snapshot();
    }, this.options.loginTimeoutMs ?? 5 * 60_000);
    try {
      await this.ready(); this.checkAttempt(attempt);
      if (this.apiMode) await this.useApiMode(false);
      if (this.storageFailed) throw new ChatGPTAuthError('ChatGPT credential storage is unavailable. Restart AppYard after checking local file access.');
      const registration = this.state!.registrations.find(r => r.id === (accountId ?? this.state!.retryId));
      if (accountId && !registration) throw new ChatGPTAuthError('Select a saved ChatGPT account.');
      attempt.registrationId = registration?.id;
      attempt.server.on('request', (req, res) => { void this.callback(attempt, req, res); });
      await new Promise<void>((resolve, reject) => {
        attempt.server.once('error', reject);
        attempt.server.listen(0, '127.0.0.1', resolve);
      });
      this.checkAttempt(attempt);
      const address = attempt.server.address();
      if (!address || typeof address === 'string') throw new Error('No loopback address');
      attempt.redirectUri = `http://127.0.0.1:${address.port}/auth/callback`;
      const url = new URL(`${CHATGPT_ISSUER}/api/accounts/authorize`);
      url.search = new URLSearchParams({
        client_id: registration?.clientId ?? 'dynamic_agent_client',
        ...(!registration ? { agent_name_hint: CHATGPT_AGENT_NAME } : {}),
        ext_agent_host_id: this.state!.hostId, response_type: 'code', redirect_uri: attempt.redirectUri,
        scope: CHATGPT_SCOPES.join(' '), resource: CHATGPT_RESOURCE,
        state: attempt.state, nonce: attempt.nonce, code_challenge_method: 'S256',
        code_challenge: createHash('sha256').update(attempt.verifier).digest('base64url'),
        ...(registration?.tokens?.idToken ? { id_token_hint: registration.tokens.idToken } : {}),
        ...(registration?.email ? { login_hint: registration.email } : {}),
        ...(registration?.tokens && !planEnabled(registration.tokens) ? { prompt: 'consent' } : {})
      }).toString();
      attempt.authUrl = url.href;
      try { await this.openExternal(url.href); }
      catch { throw new ChatGPTAuthError('Could not open your browser. Check your default browser and try signing in again.'); }
      this.checkAttempt(attempt);
    } catch (error) {
      if (this.isCurrent(attempt)) { this.finish(attempt); this.lastError = authError(error); this.snapshot(); }
      else this.stopListener(attempt);
      throw new ChatGPTAuthError(authError(error));
    }
  }

  private async callback(attempt: LoginAttempt, req: IncomingMessage, res: ServerResponse) {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Security-Policy', "default-src 'none'"); res.setHeader('Referrer-Policy', 'no-referrer');
    let url: URL;
    try { url = new URL(req.url ?? '/', attempt.redirectUri); }
    catch { res.writeHead(400).end(); return; }
    const expected = new URL(attempt.redirectUri!);
    if (!this.isCurrent(attempt) || attempt.consumed || req.method !== 'GET' || url.origin !== expected.origin || req.headers.host !== expected.host || url.pathname !== '/auth/callback') { res.writeHead(404).end(); return; }
    const p = url.searchParams;
    if (['code', 'state', 'client_id', 'error'].some(key => p.getAll(key).length > 1) || p.get('state') !== attempt.state) { res.writeHead(400).end('Sign-in could not be verified.'); return; }
    attempt.consumed = true;
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end('Return to AppYard to see the sign-in result. You can close this tab.');
    // Keep the deadline active through code exchange and validation, but stop accepting callbacks.
    attempt.server.close();
    try {
      if (p.has('error')) throw new ChatGPTAuthError(p.get('error') === 'access_denied' ? 'ChatGPT sign-in was declined. Continue with ChatGPT to try again.' : 'ChatGPT sign-in failed. Please try again.');
      let registration = this.state!.registrations.find(r => r.id === attempt.registrationId);
      const clientId = p.get('client_id') ?? registration?.clientId;
      const code = p.get('code');
      if (!secretString(clientId) || clientId === 'dynamic_agent_client' || clientId.length > 512 || !secretString(code) || (registration && clientId !== registration.clientId)) throw new ChatGPTAuthError('ChatGPT returned an incomplete or mismatched registration. Please try again.');
      // Retain the issued client ID before exchange, so a failed code can be retried without registering again.
      await this.serial(async () => {
        this.checkAttempt(attempt);
        if (!registration) {
          if (this.state!.registrations.some(r => r.clientId === clientId)) throw new ChatGPTAuthError('Choose the saved ChatGPT connection before reconnecting it.');
          registration = { id: randomUUID(), label: `Connection ${this.state!.registrations.length + 1}`, clientId, issuer: CHATGPT_ISSUER };
          const next = structuredClone(this.state!); next.registrations.push(registration); next.retryId = registration.id;
          await this.persist(next); this.checkAttempt(attempt);
          attempt.registrationId = registration.id;
        }
      });
      this.checkAttempt(attempt);
      const body = await this.tokenRequest({ grant_type: 'authorization_code', client_id: clientId, code, code_verifier: attempt.verifier, redirect_uri: attempt.redirectUri! }, attempt.controller.signal);
      this.checkAttempt(attempt);
      const identity = await this.verifier.verify(body.id_token, clientId, attempt.nonce, registration!.subject, AbortSignal.any([attempt.controller.signal, AbortSignal.timeout(15_000)]));
      const tokens = chatGPTTokenSet(body, this.now());
      await this.serial(async () => {
        this.checkAttempt(attempt);
        const previous = this.state!, next = structuredClone(previous);
        const target = next.registrations.find(r => r.id === registration!.id)!;
        Object.assign(target, identity, { tokens }); next.activeId = target.id; delete next.retryId;
        await this.persist(next);
        if (!this.isCurrent(attempt)) { await this.persist(previous); throw new ChatGPTAuthError('ChatGPT sign-in was cancelled.'); }
      });
      this.lastError = planEnabled(tokens) ? undefined : 'You’re signed in, but ChatGPT plan usage is not enabled. Reconnect and allow plan usage to build.';
      this.finish(attempt);
      await this.refresh();
    } catch (error) {
      if (this.isCurrent(attempt)) { this.finish(attempt); this.lastError = authError(error); this.snapshot(); }
    }
  }

  async reopenLogin() {
    const attempt = this.pending;
    if (!attempt?.authUrl || !this.isCurrent(attempt) || attempt.consumed) throw new ChatGPTAuthError('Start a new ChatGPT sign-in first.');
    try { await this.openExternal(attempt.authUrl); }
    catch { throw new ChatGPTAuthError('Could not open your browser. Check your default browser and try again.'); }
  }
  async cancel() {
    if (this.keyLogin) { await this.keyLogin.catch(() => {}); await this.logout(); return; }
    // Cancelling a new sign-in preserves the working account and its catalog.
    // A stale Cancel click must not invalidate an unrelated switch or sign-out.
    if (!this.pending) return;
    const previousModels = this.models;
    this.invalidate(); this.models = previousModels; this.lastError = undefined; this.snapshot();
  }

  /** Main-process only. Serialize rotating tokens with account changes. */
  async credentials(): Promise<CodexCredentials> {
    await this.ready();
    if (this.apiMode) {
      if (this.keyLogin || this.account.status !== 'connected') throw new ChatGPTAuthError('Sign in with an API key in Model settings before running Codex.');
      return { authType: 'apiKey', accessToken: '', expiresAt: Number.MAX_SAFE_INTEGER };
    }
    await this.ready(); const epoch = this.epoch;
    return this.serial(async () => {
      const assertActive = () => {
        const active = this.selected();
        if (this.disposed || epoch !== this.epoch || this.pending || this.changingAccount || this.storageFailed || !active?.tokens) throw new ChatGPTAuthError('Sign in with ChatGPT in Model settings before running Codex.');
        if (!planEnabled(active.tokens)) throw new ChatGPTAuthError('ChatGPT plan usage is not enabled. Reconnect and allow plan usage in Settings.');
        return active;
      };
      let active = assertActive();
      if (active.tokens!.expiresAt <= this.now() + 60_000) {
        if (!active.tokens!.refreshToken) {
          const next = structuredClone(this.state!); delete next.registrations.find(r => r.id === active.id)!.tokens;
          await this.persist(next); this.models = []; this.lastError = 'Your ChatGPT session expired. Reconnect this saved account.'; this.snapshot();
          throw new ChatGPTAuthError(this.lastError);
        }
        let body;
        try { body = await this.tokenRequest({ grant_type: 'refresh_token', client_id: active.clientId, refresh_token: active.tokens!.refreshToken }); }
        catch (error) {
          if (error instanceof ChatGPTAuthError && unusableRefresh.has(error.code ?? '')) {
            const next = structuredClone(this.state!); delete next.registrations.find(r => r.id === active.id)!.tokens;
            await this.persist(next); this.models = []; this.lastError = 'Your ChatGPT session expired or was revoked. Reconnect this saved account.'; this.snapshot();
            throw new ChatGPTAuthError(this.lastError);
          }
          throw error;
        }
        try {
          if (body.id_token !== undefined) await this.verifier.verify(body.id_token, active.clientId, undefined, active.subject);
          const tokens = chatGPTTokenSet(body, this.now(), active.tokens);
          const next = structuredClone(this.state!); next.registrations.find(r => r.id === active.id)!.tokens = tokens;
          // Retain a successful rotation even if a queued sign-out already denied further use.
          await this.persist(next);
        } catch (error) {
          const next = structuredClone(this.state!); delete next.registrations.find(r => r.id === active.id)!.tokens;
          await this.persist(next); this.models = []; this.lastError = authError(error); this.snapshot(); throw error;
        }
        active = assertActive();
      }
      for (const value of Object.values(active.tokens!)) registerCredential(value);
      return { accessToken: active.tokens!.accessToken!, expiresAt: active.tokens!.expiresAt };
    });
  }

  async refresh() {
    const epoch = this.epoch;
    if (this.pending || this.keyLogin || this.changingAccount || this.disposed) return;
    if (this.refreshing?.epoch === epoch) return this.refreshing.promise;
    const promise = (async () => {
      try {
        await this.ready();
        if (epoch !== this.epoch || this.pending || this.disposed) return;
        if (this.apiMode) { await this.refreshKey(); return; }
        if (!this.selected()?.tokens || !planEnabled(this.selected()?.tokens)) { this.models = []; this.snapshot(); return; }
        const token = await this.credentials();
        const body = await authJSON(this.request, `${CHATGPT_RESOURCE}/models`, { headers: { Authorization: `Bearer ${token.accessToken}` } });
        if (!Array.isArray(body?.models)) throw new ChatGPTAuthError('The ChatGPT model catalog is unavailable. Refresh the connection to try again.');
        if (epoch !== this.epoch || this.pending || this.disposed) return;
        this.models = body.models.filter((m: any) => m?.visibility === 'list' && secretString(m.slug) && typeof m.display_name === 'string')
          .map((m: any) => ({ id: m.slug, name: m.display_name, provider: 'chatgpt', backend: 'codex' as const, configured: true }));
        this.lastError = this.models.length ? undefined : 'No models are available for this ChatGPT connection. Manage usage or reconnect to check your plan permission.';
        this.snapshot();
      } catch (error) {
        if (epoch !== this.epoch || this.pending || this.disposed) return;
        this.models = []; this.lastError = authError(error); this.snapshot();
        if (this.apiMode) this.account = { status: 'unavailable', authType: 'apiKey', error: this.lastError };
        if (!this.state) this.account.status = 'unavailable';
      }
    })();
    this.refreshing = { epoch, promise };
    try { await promise; } finally { if (this.refreshing?.promise === promise) this.refreshing = undefined; }
  }

  async selectAccount(id: string) {
    await this.ready();
    if (this.keyLogin) throw new ChatGPTAuthError('Finish or cancel the current sign-in before trying again.');
    if (!this.state!.registrations.some(r => r.id === id)) throw new ChatGPTAuthError('Select a saved ChatGPT account.');
    await this.useApiMode(false);
    this.invalidate(); const epoch = this.epoch; this.changingAccount = true; this.snapshot();
    try {
      await this.serial(async () => { if (this.disposed || epoch !== this.epoch) return; await this.persist({ ...this.state!, activeId: id }); });
    } finally { if (epoch === this.epoch) { this.changingAccount = false; this.lastError = undefined; this.snapshot(); } }
    if (epoch === this.epoch) await this.refresh();
  }

  private async revoke(registration: ChatGPTRegistration) {
    if (!registration.tokens?.refreshToken) return true;
    try {
      const discovery = await authJSON(this.request, `${CHATGPT_ISSUER}/.well-known/openid-configuration`);
      const endpoint = new URL(discovery.revocation_endpoint);
      if (discovery.issuer !== CHATGPT_ISSUER || endpoint.origin !== CHATGPT_ISSUER || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return false;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt) await new Promise(resolve => setTimeout(resolve, 200));
        try {
          const response = await this.request(endpoint.href, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: registration.tokens.refreshToken, token_type_hint: 'refresh_token', client_id: registration.clientId }) });
          if (response.status === 200) return true;
          if (response.status < 500) return false;
        } catch { /* Retry once while the refresh token is still available. */ }
      }
    } catch { /* Complete local sign-out even if remote revocation cannot be confirmed. */ }
    return false;
  }
  async logout() {
    if (this.keyLogin) await this.keyLogin.catch(() => {});
    if (this.apiMode) {
      this.invalidate();
      await (await this.apiConnection()).request('account/logout');
      this.models = []; this.account = { status: 'disconnected' };
      return;
    }
    this.invalidate(); const epoch = this.epoch; this.changingAccount = true; this.snapshot();
    try {
      await this.ready();
      await this.serial(async () => {
        if (this.disposed || epoch !== this.epoch) return;
        const active = this.selected();
        const revoked = active ? await this.revoke(active) : true;
        if (active) {
          const next = structuredClone(this.state!); delete next.registrations.find(r => r.id === active.id)!.tokens;
          await this.persist(next);
        }
        this.lastError = revoked ? undefined : 'Signed out locally. Remote revocation could not be confirmed; disconnect AppYard in ChatGPT Settings to finish.';
      });
    } finally { if (epoch === this.epoch) { this.changingAccount = false; this.snapshot(); } }
  }
  async manageUsage() { await this.openExternal('https://chatgpt.com/settings/usage'); }
  private async useApiMode(enabled: boolean) {
    await fs.mkdir(this.home, { recursive: true, mode: 0o700 });
    await atomicHostWrite(this.home, 'connection.json', JSON.stringify({ authType: enabled ? 'apiKey' : 'chatgpt' }));
    this.apiMode = enabled;
  }
  private async apiConnection() {
    if (this.disposed) throw new ChatGPTAuthError('AppYard is closing.');
    if (this.keyRpc) return this.keyRpc;
    if (this.keyInitialization) return this.keyInitialization;
    const work = (async () => {
      await prepareCodexHome(this.home);
      if (this.disposed) throw new ChatGPTAuthError('AppYard is closing.');
      const rpc = (this.options.launch ?? CodexRpc.launch)(this.home, { authType: 'apiKey', accessToken: '' });
      try { await rpc.initialize(); if (this.disposed) throw new Error('AppYard is closing.'); }
      catch (error) { await rpc.dispose(); throw error; }
      rpc.onClose(() => { if (this.keyRpc === rpc) this.keyRpc = undefined; });
      this.keyRpc = rpc; return rpc;
    })();
    this.keyInitialization = work;
    try { return await work; } finally { if (this.keyInitialization === work) this.keyInitialization = undefined; }
  }
  private async refreshKey() {
    const epoch = this.epoch;
    const rpc = await this.apiConnection();
    const { account } = await rpc.request('account/read', { refreshToken: false });
    const models: AgentModel[] = [];
    let cursor: string | null = null;
    if (account?.type === 'apiKey') do {
      const page = await rpc.request('model/list', { limit: 100, ...(cursor ? { cursor } : {}) });
      models.push(...page.data.filter((model: any) => !model.hidden).map((model: any) => ({ id: model.model, name: model.displayName, provider: 'chatgpt', backend: 'codex' as const, configured: true })));
      cursor = page.nextCursor;
    } while (cursor);
    if (epoch !== this.epoch || this.disposed || !this.apiMode) return;
    this.models = models;
    this.account = account?.type === 'apiKey' ? { status: 'connected', authType: 'apiKey', email: 'API key' } : { status: 'disconnected' };
    if (this.state?.registrations.length) this.account.accounts = this.state.registrations.map(r => ({ id: r.id, label: r.label, email: r.email, connected: !!r.tokens }));
  }
  async loginWithKey(value: unknown) {
    if (typeof value !== 'string' || !value.trim() || value.length > 20_000 || /\s/.test(value.trim())) throw new Error('Enter a valid API key in Model settings.');
    if (this.pending || this.keyLogin || this.changingAccount) throw new Error('Finish or cancel the current sign-in before trying again.');
    const apiKey = value.trim(); protectCodexKey(apiKey);
    const work = (async () => {
      try {
        await this.ready(); this.invalidate(); await this.useApiMode(true);
        this.models = []; this.account = { status: 'connecting', authType: 'apiKey' };
        const rpc = await this.apiConnection();
        const result = await rpc.request('account/login/start', { type: 'apiKey', apiKey });
        if (result.type !== 'apiKey') throw new Error('API-key sign-in did not complete.');
        await this.refreshKey();
        if (this.account.status !== 'connected') throw new Error('API-key sign-in did not complete.');
      } catch {
        try { await this.keyRpc?.request('account/logout'); } catch {}
        const message = 'API-key sign-in failed; check the key and its access, then try again in Model settings.';
        this.models = []; this.account = { status: 'disconnected', error: message };
        throw new Error(message);
      }
    })();
    this.keyLogin = work;
    try { await work; } finally { this.keyLogin = undefined; }
  }
  async dispose() { this.disposed = true; this.invalidate(); await this.keyInitialization?.catch(() => {}); await this.keyRpc?.dispose(); }
}
