import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { AgentBackend, Bootstrap, FleetAPI } from '../shared/types';
import { GenAiMilTab } from './GenAiMilTab';
import './model-settings.css';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
const tabs = [{ id: 'chatgpt', name: 'ChatGPT' }, { id: 'api-key', name: 'API key' }, { id: 'genai-mil', name: 'GenAI.mil' }, { id: 'other', name: 'Other providers' }] as const;
type Tab = typeof tabs[number]['id'];
export function ModelSettings({ data, api, busy, action, updated, desktop, onSaved }: { data: Bootstrap; api: FleetAPI; busy: boolean; action: Action; updated: (value: Bootstrap) => void; desktop: boolean; onSaved?: (value: Bootstrap) => void }) {
  const [backend, setBackend] = useState<AgentBackend>(data.state.settings.backend ?? (data.state.settings.provider ? 'pi' : 'codex'));
  const [tab, setTab] = useState<Tab>(backend === 'codex' ? data.chatgpt?.authType === 'apiKey' ? 'api-key' : 'chatgpt' : data.state.settings.provider === 'genai-mil' ? 'genai-mil' : 'other');
  const [provider, setProvider] = useState(data.state.settings.provider);
  const [model, setModel] = useState(data.state.settings.model);
  const [key, setKey] = useState(''), [remember, setRemember] = useState(data.state.settings.rememberKey);
  const allModels = data.models.filter(m => (m.backend ?? 'pi') === backend && m.provider !== 'genai-mil');
  const selectedProvider = backend === 'codex' ? 'chatgpt' : provider;
  const models = allModels.filter(m => m.provider === selectedProvider);
  const selectedModel = models.some(m => m.id === model) ? model : models[0]?.id ?? '';
  const providers = [...new Set(allModels.map(m => m.provider))];
  const account = data.chatgpt;
  const connecting = account?.status === 'connecting';
  const connected = account?.status === 'connected';
  const keyConnected = connected && account.authType === 'apiKey';
  const planReady = connected && (keyConnected || account.planUsageEnabled === true);
  const accounts = account?.accounts ?? [];
  const activeAccountId = account?.activeAccountId;
  const running = data.state.projects.some(p => p.status === 'running');
  const disabled = busy || !desktop || running;
  const chooseTab = (next: Tab) => { setTab(next); setBackend(next === 'chatgpt' || next === 'api-key' ? 'codex' : 'pi'); setModel(''); setKey(''); };
  const updateRef = useRef(updated); updateRef.current = updated;
  useEffect(() => {
    if (!connecting) return;
    let cancelled = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const next = await api.bootstrap(); if (!cancelled) updateRef.current(next); }
      finally { if (!cancelled) timer = setTimeout(() => void poll().catch(() => {}), 1500); }
    };
    timer = setTimeout(() => void poll().catch(() => {}), 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [api, connecting]);
  return <form className="model-settings-form" onSubmit={e => {
    e.preventDefault(); if (tab === 'genai-mil') return; void action(async () => {
      const saved = await api.saveSettings({ backend, provider: selectedProvider, model: selectedModel, rememberKey: backend === 'pi' && remember }, backend === 'pi' ? key || undefined : undefined);
      updated(saved); setKey(''); onSaved?.(saved);
    }, 'Model settings saved.');
  }}>
    {!desktop && <div className="desktop-setup-notice"><h3>Builds run in the desktop app</h3><p>This browser preview lets you explore AppYard and save briefs. To run a build, open the AppYard desktop app, add your brief, then connect a model in Settings.</p><p>Briefs saved here stay in this browser; they do not sync to the desktop app.</p></div>}
    <div className="model-settings-tabs" role="tablist" aria-label="Model connection">
      {tabs.map((item, index) => <button key={item.id} id={'model-tab-' + item.id} type="button" role="tab" aria-selected={tab === item.id} aria-controls="model-settings-panel" tabIndex={tab === item.id ? 0 : -1} disabled={disabled || connecting} onClick={() => chooseTab(item.id)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return; event.preventDefault(); chooseTab(tabs[next].id); document.getElementById('model-tab-' + tabs[next].id)?.focus();
      }}>{item.name}</button>)}
    </div>
    <div id="model-settings-panel" role="tabpanel" aria-labelledby={'model-tab-' + tab}>
    {tab === 'genai-mil' ? <GenAiMilTab data={data} api={api} disabled={disabled} action={action} updated={updated} onSaved={onSaved}/> : <>
    {backend === 'codex' ? <div className="chatgpt-connection">
      <h3>Codex account</h3>
      <p>Connect with ChatGPT or an API key. ChatGPT uses your plan; API-key usage is billed to the key's account.</p>
      {tab === 'chatgpt' && accounts.length > 0 && <label className="saved-chatgpt-account">Saved account<select aria-label="Saved ChatGPT account" value={activeAccountId ?? ''} disabled={disabled || connecting} onChange={e => void action(async () => { updated(await api.selectChatGPTAccount(e.target.value)); setModel(''); })}>
        {!activeAccountId && <option value="" disabled>Choose an account</option>}
        {accounts.map(saved => <option key={saved.id} value={saved.id}>{saved.label}{saved.email && saved.email !== saved.label ? ` · ${saved.email}` : ''}{saved.connected ? '' : ' · signed out'}</option>)}
      </select></label>}
      <div role="status" aria-live="polite">
        {connected ? <p className="account-identity"><CheckCircle2 size={17}/><span>{account.email || 'ChatGPT connected'}{account.plan && <small>{account.plan} plan</small>}</span></p>
          : connecting ? <p className="account-identity"><Loader2 size={17}/><span>{account.authType === 'apiKey' ? 'Connecting your API key.' : 'Finish signing in in your browser. This screen updates automatically.'}</span></p> : <p>{tab === 'api-key' ? 'Enter an API key to connect your account.' : activeAccountId ? 'Reconnect this account to use your ChatGPT plan.' : 'Sign in and allow ChatGPT plan usage to connect your account.'}</p>}
        {connected && <p>{keyConnected ? 'You’re using an API key' : planReady ? 'You’re using your ChatGPT plan' : 'Your account is signed in. Enable ChatGPT plan usage to choose a model and run builds.'}</p>}
      </div>
      {account?.error && <p className="connection-error" role="alert">{account.error}</p>}
      <div className="connection-actions">
        {connecting ? <>
          {account.authType !== 'apiKey' && <button className="button primary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.reopenChatGPTLogin()))}>Reopen browser <ExternalLink size={14}/></button>}
          <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.cancelChatGPTLogin()))}>Cancel sign-in</button>
        </> : <>
          {tab === 'chatgpt' && (!planReady || keyConnected) && <button className="button primary" type="button" data-oai-siwc-button="" disabled={disabled} onClick={() => void action(async () => updated(await api.connectChatGPT(activeAccountId)))}>{keyConnected ? 'Continue with ChatGPT' : connected ? 'Enable ChatGPT plan usage' : activeAccountId ? 'Reconnect account' : 'Continue with ChatGPT'} <ArrowRight size={16}/></button>}
          {tab === 'chatgpt' && connected && !keyConnected && <button className="button secondary" type="button" disabled={busy || !desktop} onClick={() => void action(() => api.manageChatGPTUsage())}>Manage ChatGPT usage <ExternalLink size={14}/></button>}
          {connected && <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.disconnectChatGPT()), keyConnected ? 'API key signed out of AppYard.' : 'ChatGPT signed out of AppYard.')}>Sign out</button>}
          {tab === 'chatgpt' && accounts.length > 0 && <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.connectChatGPT()))}>Add account</button>}
          <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.refreshChatGPT()))}><RefreshCw size={14}/>Refresh connection</button>
        </>}
      </div>
      {tab === 'api-key' && !connected && !connecting && <><label>API key<input type="password" value={key} disabled={disabled} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder="OpenAI API key"/></label><button className="button secondary" type="button" disabled={disabled || !key.trim() || !api.connectCodexKey} onClick={() => { const entered = key; setKey(''); void action(async () => updated(await api.connectCodexKey!(entered))); }}>Sign in with API key</button></>}
      <p className="connection-note">ChatGPT sign-in opens your browser. AppYard keeps its login locally, separate from your other apps. API keys stay out of project files and exports.</p>
    </div> : <>
      <label>Provider<select aria-label="Provider" value={provider} disabled={disabled} onChange={e => { setProvider(e.target.value); setModel(''); }}><option value="">Select a provider</option>{providers.map(p => <option key={p} value={p}>{p}{allModels.find(m => m.provider === p)?.configured ? ' · connected' : ''}</option>)}</select></label>
      <label>API key <span className="field-hint">Leave blank to use existing Pi credentials.</span><input type="password" value={key} disabled={disabled} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder="Provider API key"/></label>
      <label className="checkbox checkbox-label"><input type="checkbox" checked={remember} disabled={disabled} onChange={e => setRemember(e.target.checked)}/>Remember this key using operating-system encryption</label>
    </>}
    <label>Model<select aria-label="Model" value={backend === 'codex' && !planReady ? '' : selectedModel} disabled={disabled || connecting || (backend === 'codex' && !planReady)} onChange={e => setModel(e.target.value)}><option value="" disabled>{backend === 'codex' && !planReady ? connected ? 'Enable plan usage to choose a model' : 'Sign in to choose a model' : 'Select a model'}</option>{models.map(m => <option key={m.id} value={m.id}>{m.name} · {m.id}</option>)}</select></label>
    {backend === 'codex' && planReady && <p className="connection-note">Model access depends on your connected account.</p>}
    <button className="button primary" disabled={disabled || connecting || !selectedProvider || !selectedModel || (backend === 'codex' && !planReady)} type="submit">Save model settings <ArrowRight size={16}/></button>
    </>}
    {running && <p className="connection-note">Stop active builds before changing engines or accounts.</p>}
    </div>
  </form>;
}
