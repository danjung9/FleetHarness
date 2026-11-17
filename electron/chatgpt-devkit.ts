import { createChatGPT, type ChatGPTClient, type CredentialEncryption, type SessionState } from '@siwc/local';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CodexAccount } from './codex-account.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { registerCredential } from './secrets.js';

/** Official local SDK owns OAuth, profiles, refresh rotation and encrypted storage. */
export class ChatGPTDevkitAccount extends CodexAccount {
  readonly client: ChatGPTClient;
  private keyMode = false;
  private modeLoaded = false;
  private loginWork?: Promise<void>;
  private loginURL?: string;
  private closed = false;
  private unsubscribe: () => void;
  constructor(private rootDir: string, private openBrowser: (url: string) => Promise<void>, encryption: CredentialEncryption,
    client?: ChatGPTClient) {
    super(rootDir, openBrowser);
    this.client = client ?? createChatGPT({ appName: 'AppYard', appId: 'dev.appyard.desktop', redirectPort: 0,
      storageDir: path.join(rootDir, 'chatgpt-devkit'), credentialEncryption: encryption,
      openBrowser: async url => { this.loginURL = url; await openBrowser(url); } });
    this.unsubscribe = this.client.subscribe(state => { if (!this.keyMode && !this.closed) this.applySession(state); });
  }
  override get route() { return this.keyMode ? { provider: 'openai', label: 'API key' } : { provider: 'chatgpt', label: 'ChatGPT plan' }; }
  private applySession(session: SessionState) {
    this.account = { status: session.status === 'reauth_required' ? 'disconnected' : session.status,
      authType: 'chatgpt', planUsageEnabled: session.sharing, activeAccountId: session.profileId,
      email: session.identity?.email ?? session.profileLabel, accounts: this.account.accounts ?? [],
      ...(session.error ? { error: session.error.message } : {}) };
    if (session.status !== 'connected' || !session.sharing) this.models = [];
  }
  private async setKeyMode(value: boolean) {
    await atomicHostWrite(this.rootDir, 'chatgpt-devkit-mode.json', JSON.stringify({ apiKey: value }));
    this.keyMode = value; this.modeLoaded = true;
  }
  override async refresh() {
    if (this.closed) return;
    if (!this.modeLoaded) {
      try { this.keyMode = JSON.parse(await fs.readFile(path.join(this.rootDir, 'chatgpt-devkit-mode.json'), 'utf8')).apiKey === true; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('The saved connection mode could not be read.'); }
      this.modeLoaded = true;
    }
    if (this.keyMode) return super.refresh();
    this.applySession(await this.client.getSession());
    const profiles = await this.client.listProfiles();
    this.account.accounts = profiles.map(profile => ({ id: profile.id, label: profile.label, email: profile.identity?.email, connected: profile.status === 'connected' }));
    if (this.account.status === 'connected' && this.account.planUsageEnabled) {
      try { this.models = (await this.client.listModels()).map(model => ({ backend: 'opencode', provider: 'chatgpt', id: model.slug, name: model.displayName, configured: true })); }
      catch { this.models = []; this.account.error = 'Your account is connected, but models could not be loaded. Refresh the connection to try again.'; }
    }
  }
  override async login(accountId?: string) {
    if (this.loginWork) return;
    await this.setKeyMode(false);
    this.account = { ...this.account, status: 'connecting', authType: 'chatgpt', error: undefined };
    const work = this.client.signIn({ ...(accountId ? { profileId: accountId, reconsent: !this.account.planUsageEnabled } : { newProfile: true }) })
      .then(async () => { await this.refresh(); }, async () => { this.applySession(await this.client.getSession()); });
    this.loginWork = work;
    void work.catch(() => { this.models = []; this.account = { ...this.account, status: 'disconnected', error: 'ChatGPT sign-in could not finish. Reconnect to try again.' }; }).finally(() => { this.loginWork = undefined; this.loginURL = undefined; });
  }
  override async reopenLogin() { if (!this.loginURL) throw new Error('Start ChatGPT sign-in again.'); await this.openBrowser(this.loginURL); }
  override async cancel() { if (this.keyMode) return super.cancel(); this.client.cancelSignIn(); await this.loginWork; await this.refresh(); }
  override async selectAccount(id: string) { await this.setKeyMode(false); await this.client.selectProfile(id); await this.refresh(); }
  override async logout() { if (this.keyMode) return super.logout(); this.client.cancelSignIn(); await this.loginWork; try { await this.client.disconnect(); } finally { await this.refresh(); } }
  override async loginWithKey(value: unknown) { if (this.loginWork) throw new Error('Finish or cancel ChatGPT sign-in first.'); await this.setKeyMode(true); await super.loginWithKey(value); }
  override async credentials() {
    if (this.keyMode) return super.credentials();
    const accessToken = await this.client.hostAccessToken(); registerCredential(accessToken);
    return { authType: 'chatgpt' as const, accessToken, expiresAt: Date.now() + 30_000 };
  }
  override async dispose() { this.closed = true; this.unsubscribe(); this.client.cancelSignIn(); await this.loginWork; await super.dispose(); }
}
