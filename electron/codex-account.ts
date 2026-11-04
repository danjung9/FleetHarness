import path from 'node:path';
import type { AgentModel, ChatGPTAccount } from '../shared/types.js';
import { CodexRpc, prepareCodexHome, protectCodexKey, redactCodexText } from './codex-rpc.js';

/** Owns an isolated Codex login; OAuth credentials never cross renderer IPC. */
export class CodexAccount {
  account: ChatGPTAccount = { status: 'disconnected' };
  models: AgentModel[] = [];
  private accountType?: string;
  get route() {
    return this.accountType === 'apiKey' ? { provider: 'openai', label: 'API key' }
      : { provider: 'chatgpt', label: 'ChatGPT subscription' };
  }
  private rpc?: CodexRpc;
  private opening?: Promise<CodexRpc>;
  private loginId?: string;
  private loginTimer?: ReturnType<typeof setTimeout>;
  private connecting = false;
  private keyLogin?: Promise<void>;
  private disposed = false;
  readonly home: string;
  constructor(root: string, private openExternal: (url: string) => Promise<void>, private launch = CodexRpc.launch) { this.home = path.join(root, 'codex'); }
  private async connection() {
    if (this.rpc) return this.rpc;
    if (this.opening) return this.opening;
    this.opening = (async () => {
      await prepareCodexHome(this.home);
      const rpc = this.launch(this.home);
      rpc.subscribe(message => {
        if (this.loginId && message.method === 'account/login/completed' && message.params?.loginId === this.loginId) {
          this.clearLogin();
          if (!message.params.success) this.account = { status: 'disconnected', error: redactCodexText(message.params.error || 'ChatGPT sign-in was cancelled.') };
          else void this.refresh().catch(() => {});
        }
        if (message.method === 'account/rateLimits/updated') this.setLimits(message.params.rateLimits);
      });
      rpc.onClose(error => {
        if (this.rpc === rpc) { this.rpc = undefined; this.clearLogin(); this.models = []; this.account = { status: 'unavailable', error: redactCodexText(error.message) }; }
      });
      try { await rpc.initialize(); if (this.disposed) throw new Error('AppYard is closing.'); this.rpc = rpc; return rpc; }
      catch (error) { rpc.dispose(); throw error; }
    })();
    try { return await this.opening; } finally { this.opening = undefined; }
  }
  private clearLogin() { this.loginId = undefined; this.connecting = false; clearTimeout(this.loginTimer); }
  private setLimits(limits: any) {
    if (this.account.status !== 'connected' || this.accountType !== 'chatgpt') return;
    this.account.limits = ['primary', 'secondary'].flatMap((key, i) => {
      const value = limits?.[key];
      if (!value || typeof value.usedPercent !== 'number') return [];
      const minutes = value.windowDurationMins;
      return [{ label: minutes ? (minutes >= 1440 ? `${Math.round(minutes / 1440)}-day usage` : `${minutes / 60}-hour usage`) : i ? 'Longer window' : 'Current window', usedPercent: value.usedPercent, resetsAt: value.resetsAt ?? null }];
    });
  }
  async refresh() {
    try {
      const rpc = await this.connection();
      if (this.connecting) return;
      const { account } = await rpc.request('account/read', { refreshToken: false });
      this.accountType = account?.type;
      this.account = account?.type === 'chatgpt' ? { status: 'connected', authType: 'chatgpt', email: account.email, plan: account.planType }
        : account?.type === 'apiKey' ? { status: 'connected', authType: 'apiKey', email: 'API key' } : { status: 'disconnected' };
      this.models = [];
      let cursor: string | null = null;
      do {
        const page = await rpc.request('model/list', { limit: 100, ...(cursor ? { cursor } : {}) });
        // Keep the existing settings selector compatible; run provenance uses the observed route.
        this.models.push(...page.data.filter((m: any) => !m.hidden).map((m: any) => ({ id: m.model, name: m.displayName, provider: 'chatgpt', backend: 'codex' as const, configured: this.account.status === 'connected' })));
        cursor = page.nextCursor;
      } while (cursor);
      if (this.account.status === 'connected' && this.accountType === 'chatgpt') {
        try { const result = await rpc.request('account/rateLimits/read'); this.setLimits(result.rateLimits); }
        catch { /* Usage availability does not determine whether the account is signed in. */ }
      }
    } catch { this.account = { status: 'unavailable', error: 'Could not check the account; reconnect in Model settings and try again.' }; this.models = []; }
  }
  async loginWithKey(value: unknown) {
    if (typeof value !== 'string' || !value.trim() || value.length > 20_000 || /\s/.test(value.trim())) throw new Error('Enter a valid API key in Model settings.');
    if (this.connecting || this.keyLogin) throw new Error('Finish or cancel the current sign-in before trying again.');
    const apiKey = value.trim(); protectCodexKey(apiKey);
    this.connecting = true; this.models = []; this.account = { status: 'connecting', authType: 'apiKey' };
    const work = (async () => {
      try {
        const rpc = await this.connection();
        // Codex 0.166.0 LoginAccountParams/Response: API-key login is immediate.
        const result = await rpc.request('account/login/start', { type: 'apiKey', apiKey });
        if (result.type !== 'apiKey') throw new Error('API-key sign-in did not complete.');
        this.clearLogin(); await this.refresh();
        if (this.account.status !== 'connected' || this.accountType !== 'apiKey') throw new Error('API-key sign-in did not complete.');
      } catch {
        // Never attach a raw server error or cause: it may echo the submitted key.
        try { await this.rpc?.request('account/logout'); } catch {}
        this.clearLogin(); this.accountType = undefined; this.models = [];
        const message = 'API-key sign-in failed; check the key and its access, then try again in Model settings.';
        this.account = { status: 'disconnected', error: message };
        throw new Error(message);
      }
    })();
    this.keyLogin = work;
    try { await work; } finally { this.keyLogin = undefined; }
  }
  async login() {
    if (this.connecting || this.keyLogin) return;
    this.connecting = true; this.account = { status: 'connecting' };
    try {
      const rpc = await this.connection();
      const result = await rpc.request('account/login/start', { type: 'chatgpt' });
      this.loginId = result.loginId;
      const url = new URL(result.authUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'auth.openai.com') throw new Error('Codex returned an unexpected sign-in address.');
      this.loginTimer = setTimeout(() => { void this.cancel().then(() => { this.account.error = 'Sign-in timed out. Continue with ChatGPT to try again.'; }); }, 5 * 60_000);
      await this.openExternal(url.href);
    } catch (error) { await this.cancel(); this.account.error = redactCodexText(error instanceof Error ? error.message : String(error)); throw new Error(this.account.error); }
  }
  async cancel() {
    if (this.keyLogin) {
      await this.keyLogin.catch(() => {});
      // API-key login has no cancellable loginId. Clear the completed account
      // before reporting cancellation, including when it completed while waiting.
      await this.rpc?.request('account/logout');
      this.accountType = undefined; this.models = [];
    }
    const id = this.loginId; this.clearLogin();
    if (id) { try { await this.rpc?.request('account/login/cancel', { loginId: id }); } catch {} }
    this.account = { status: 'disconnected' };
  }
  async logout() {
    await this.cancel();
    const rpc = await this.connection(); await rpc.request('account/logout');
    this.models = this.models.map(m => ({ ...m, configured: false }));
    this.accountType = undefined;
    this.account = { status: 'disconnected' };
  }
  dispose() { this.disposed = true; this.clearLogin(); this.rpc?.dispose(); this.rpc = undefined; }
}
