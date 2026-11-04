import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentModel, ChatGPTAccount } from '../shared/types.js';
import { CodexRpc } from './codex-rpc.js';

/** Owns an isolated Codex login; OAuth credentials never cross renderer IPC. */
export class CodexAccount {
  account: ChatGPTAccount = { status: 'disconnected' };
  models: AgentModel[] = [];
  private rpc?: CodexRpc;
  private opening?: Promise<CodexRpc>;
  private loginId?: string;
  private loginTimer?: ReturnType<typeof setTimeout>;
  private connecting = false;
  private disposed = false;
  readonly home: string;
  constructor(root: string, private openExternal: (url: string) => Promise<void>, private launch = CodexRpc.launch) { this.home = path.join(root, 'codex'); }
  private async connection() {
    if (this.rpc) return this.rpc;
    if (this.opening) return this.opening;
    this.opening = (async () => {
      await fs.mkdir(this.home, { recursive: true, mode: 0o700 });
      const rpc = this.launch(this.home);
      rpc.subscribe(message => {
        if (message.method === 'account/login/completed' && message.params?.loginId === this.loginId) {
          this.clearLogin();
          if (!message.params.success) this.account = { status: 'disconnected', error: message.params.error || 'ChatGPT sign-in was cancelled.' };
          else void this.refresh().catch(() => {});
        }
        if (message.method === 'account/rateLimits/updated') this.setLimits(message.params.rateLimits);
      });
      rpc.onClose(error => {
        if (this.rpc === rpc) { this.rpc = undefined; this.clearLogin(); this.models = []; this.account = { status: 'unavailable', error: error.message }; }
      });
      try { await rpc.initialize(); if (this.disposed) throw new Error('AppYard is closing.'); this.rpc = rpc; return rpc; }
      catch (error) { rpc.dispose(); throw error; }
    })();
    try { return await this.opening; } finally { this.opening = undefined; }
  }
  private clearLogin() { this.loginId = undefined; this.connecting = false; clearTimeout(this.loginTimer); }
  private setLimits(limits: any) {
    if (this.account.status !== 'connected') return;
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
      this.account = account?.type === 'chatgpt' ? { status: 'connected', email: account.email, plan: account.planType } : { status: 'disconnected' };
      this.models = [];
      let cursor: string | null = null;
      do {
        const page = await rpc.request('model/list', { limit: 100, ...(cursor ? { cursor } : {}) });
        this.models.push(...page.data.filter((m: any) => !m.hidden).map((m: any) => ({ id: m.model, name: m.displayName, provider: 'chatgpt', backend: 'codex' as const, configured: this.account.status === 'connected' })));
        cursor = page.nextCursor;
      } while (cursor);
      if (this.account.status === 'connected') {
        try { const result = await rpc.request('account/rateLimits/read'); this.setLimits(result.rateLimits); }
        catch { /* Usage availability does not determine whether the account is signed in. */ }
      }
    } catch (error) { this.account = { status: 'unavailable', error: error instanceof Error ? error.message : String(error) }; this.models = []; }
  }
  async login() {
    if (this.connecting) return;
    this.connecting = true; this.account = { status: 'connecting' };
    try {
      const rpc = await this.connection();
      const result = await rpc.request('account/login/start', { type: 'chatgpt' });
      this.loginId = result.loginId;
      const url = new URL(result.authUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'auth.openai.com') throw new Error('Codex returned an unexpected sign-in address.');
      this.loginTimer = setTimeout(() => { void this.cancel().then(() => { this.account.error = 'Sign-in timed out. Continue with ChatGPT to try again.'; }); }, 5 * 60_000);
      await this.openExternal(url.href);
    } catch (error) { await this.cancel(); this.account.error = error instanceof Error ? error.message : String(error); throw error; }
  }
  async cancel() {
    const id = this.loginId; this.clearLogin();
    if (id) { try { await this.rpc?.request('account/login/cancel', { loginId: id }); } catch {} }
    this.account = { status: 'disconnected' };
  }
  async logout() {
    await this.cancel();
    const rpc = await this.connection(); await rpc.request('account/logout');
    this.models = this.models.map(m => ({ ...m, configured: false }));
    this.account = { status: 'disconnected' };
  }
  dispose() { this.disposed = true; this.clearLogin(); this.rpc?.dispose(); this.rpc = undefined; }
}
