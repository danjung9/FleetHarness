import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { AgentBackend, Bootstrap, FleetAPI } from '../shared/types';
import { workerURL } from './worker-api';
import { ModelChoices } from './ModelChoices';
import { GenAiMilTab } from './GenAiMilTab';
import { resolveReasoningEffort } from '../shared/reasoning';
import './model-settings.css';
import { LearningSettingsPanel } from './ExperimentReview';
import { ContinueWithChatGPTButton, ChatGPTManageUsageButton } from '@siwc/react';
import '@siwc/react/styles.css';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
const tabs = [{ id: 'chatgpt', name: 'ChatGPT' }, { id: 'api-key', name: 'API key' }, { id: 'genai-mil', name: 'GenAI.mil' }, { id: 'opencode', name: 'Provider API' }, { id: 'other', name: 'Other model providers' }] as const;
type Tab = typeof tabs[number]['id'];
export function ModelSettings({ data, api, busy, action, updated, desktop, onSaved }: { data: Bootstrap; api: FleetAPI; busy: boolean; action: Action; updated: (value: Bootstrap) => void; desktop: boolean; onSaved?: (value: Bootstrap) => void }) {
  const [backend, setBackend] = useState<AgentBackend>(data.state.settings.backend ?? (data.state.settings.provider ? 'pi' : 'opencode'));
  const [tab, setTab] = useState<Tab>(workerURL && data.state.settings.provider !== 'genai-mil' ? 'opencode' : data.state.settings.provider === 'genai-mil' ? 'genai-mil' : data.state.settings.provider === 'chatgpt' && data.chatgpt?.authType !== 'apiKey' ? 'chatgpt' : backend === 'opencode' ? 'opencode' : backend === 'codex' ? data.chatgpt?.authType === 'apiKey' ? 'api-key' : 'chatgpt' : 'other');
  const [provider, setProvider] = useState(data.state.settings.provider);
  const [model, setModel] = useState(data.state.settings.model);
  const [key, setKey] = useState(''), [remember, setRemember] = useState(data.state.settings.rememberKey);
  const allModels = data.models.filter(m => (m.backend ?? 'pi') === backend && m.provider !== 'genai-mil');
  const accountTab = tab === 'chatgpt' || tab === 'api-key';
  const selectedProvider = accountTab ? 'chatgpt' : provider;
  const models = allModels.filter(m => m.provider === selectedProvider);
  const selectedModel = models.some(m => m.id === model) ? model : models[0]?.id ?? '';
  const configuredProviders = new Set(allModels.filter(model => model.configured).map(model => model.provider));
  const providers = [...new Set(allModels.map(m => m.provider))].sort((a,b) => Number(configuredProviders.has(b)) - Number(configuredProviders.has(a)) || a.localeCompare(b));
  const account = data.chatgpt;
  const connecting = account?.status === 'connecting';
  const connected = account?.status === 'connected';
  const keyConnected = connected && account.authType === 'apiKey';
  const planReady = connected && (keyConnected || account.planUsageEnabled === true);
  const switchingToKey = tab === 'api-key' && connected && !keyConnected;
  const accountReady = planReady && (tab !== 'api-key' || keyConnected);
  const accounts = account?.accounts ?? [];
  const activeAccountId = account?.activeAccountId;
  const running = data.state.projects.some(p => p.status === 'running' || p.conversation?.status === 'responding');
  const disabled = busy || !desktop || running;
  const visibleTabs = workerURL ? tabs.filter(item => item.id === 'opencode' || item.id === 'genai-mil') : tabs;
  const chooseTab = (next: Tab) => { setTab(next); setBackend(next === 'opencode' || next === 'genai-mil' || next === 'chatgpt' ? 'opencode' : next === 'api-key' ? 'codex' : 'pi'); setModel(''); setKey(''); };
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
  return <><form className="model-settings-form" onSubmit={e => {
    e.preventDefault(); if (tab === 'genai-mil' || disabled || connecting || !selectedProvider || !selectedModel || (accountTab && !accountReady)) return; void action(async () => {
      const reasoningEffort = data.state.settings.reasoningEffort === undefined ? undefined
        : resolveReasoningEffort(models.find(item => item.id === selectedModel), data.state.settings.reasoningEffort);
      const saved = await api.saveSettings({ backend, provider: selectedProvider, model: selectedModel, rememberKey: !accountTab && remember, reasoningEffort }, backend !== 'codex' ? key || undefined : undefined);
      updated(saved); setKey(''); onSaved?.(saved);
    }, 'Model settings saved.');
  }}>
    {!desktop && <div className="desktop-setup-notice"><h3>Builds run in the desktop app</h3><p>This browser preview lets you explore AppYard and save briefs. To run a build, open the AppYard desktop app, add your brief, then connect a model in Settings.</p><p>Briefs saved here stay in this browser; they do not sync to the desktop app.</p></div>}
    <div className="builder-process"><h3>One model, from brief to working app</h3><p>Your selected model plans, builds, and repairs. AppYard runs tests and browser checks, then returns failures for bounded repair before review and export.</p><ol aria-label="Build process"><li>Understand</li><li>Plan</li><li>Build</li><li>Test & repair</li><li>Review</li></ol></div>
    <h3>Connect a model</h3>
    <div className="model-settings-tabs" role="tablist" aria-label="Model connection">
      {visibleTabs.map((item, index) => <button key={item.id} id={'model-tab-' + item.id} type="button" role="tab" aria-selected={tab === item.id} aria-controls="model-settings-panel" tabIndex={tab === item.id ? 0 : -1} disabled={connecting || (disabled && item.id !== 'genai-mil')} onClick={() => chooseTab(item.id)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % visibleTabs.length : event.key === 'ArrowLeft' ? (index + visibleTabs.length - 1) % visibleTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? visibleTabs.length - 1 : -1;
        if (next < 0) return; event.preventDefault(); chooseTab(visibleTabs[next].id); document.getElementById('model-tab-' + visibleTabs[next].id)?.focus();
      }}><strong>{item.name}</strong><span>{item.id === 'chatgpt' ? 'Sign in with your ChatGPT account' : item.id === 'api-key' ? 'Connect an OpenAI API key' : item.id === 'genai-mil' ? 'Use your approved service address and key' : item.id === 'opencode' ? 'Choose a provider and bring your API key' : 'Use an existing provider connection'}</span></button>)}
    </div>
    <div id="model-settings-panel" role="tabpanel" aria-labelledby={'model-tab-' + tab}>
    {tab === 'genai-mil' ? <GenAiMilTab data={data} api={api} disabled={disabled} action={action} updated={updated} onSaved={onSaved}/> : <>
    {tab === 'opencode' && <p className="connection-note">AppYard builds and refines your app using AppYard’s browser, preview, and verification tools. Choose a provider and model below. {workerURL ? 'Keys stay on your build worker; remembered keys are encrypted at rest.' : 'Keys stay in the desktop backend; remembered keys use operating-system encryption.'}</p>}
    {accountTab ? <div className="chatgpt-connection">
      <h3>Model account</h3>
      <p>Connect with ChatGPT or an API key. ChatGPT uses your plan; API-key usage is billed to the key's account.</p>
      {tab === 'chatgpt' && accounts.length > 0 && <label className="saved-chatgpt-account">Saved account<select aria-label="Saved ChatGPT account" value={activeAccountId ?? ''} disabled={disabled || connecting} onChange={e => void action(async () => { updated(await api.selectChatGPTAccount(e.target.value)); setModel(''); })}>
        {!activeAccountId && <option value="" disabled>Choose an account</option>}
        {accounts.map(saved => <option key={saved.id} value={saved.id}>{saved.label}{saved.email && saved.email !== saved.label ? ` · ${saved.email}` : ''}{saved.connected ? '' : ' · signed out'}</option>)}
      </select></label>}
      <div role="status" aria-live="polite">
        {connected ? <p className="account-identity"><CheckCircle2 size={17}/><span>{account.email || 'ChatGPT connected'}{account.plan && <small>{account.plan} plan</small>}</span></p>
          : connecting ? <p className="account-identity"><Loader2 size={17}/><span>{account.authType === 'apiKey' ? 'Connecting your API key.' : 'Finish signing in in your browser. This screen updates automatically.'}</span></p> : <p>{tab === 'api-key' ? 'Enter an API key to connect your account.' : activeAccountId ? 'Reconnect this account to use your ChatGPT plan.' : 'Sign in and allow ChatGPT plan usage to connect your account.'}</p>}
        {connected && <p>{keyConnected ? 'You’re using an API key' : planReady ? 'You’re using your ChatGPT plan' : 'Your account is signed in. Enable ChatGPT plan usage to choose a model and run builds.'}</p>}
        {switchingToKey && <p>ChatGPT is still connected; choose Switch to API key to disconnect it and enter your key.</p>}
      </div>
      {account?.error && <p className="connection-error" role="alert">{account.error}</p>}
      <div className="connection-actions">
        {connecting ? <>
          {account.authType !== 'apiKey' && <button className="button primary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.reopenChatGPTLogin()))}>Reopen browser <ExternalLink size={14}/></button>}
          <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.cancelChatGPTLogin()))}>Cancel sign-in</button>
        </> : <>
          {tab === 'chatgpt' && (!planReady || keyConnected) && <ContinueWithChatGPTButton disabled={disabled} data-oai-siwc-button="" onClick={() => void action(async () => updated(await api.connectChatGPT(activeAccountId)))}/> }
          {tab === 'chatgpt' && connected && !keyConnected && <ChatGPTManageUsageButton disabled={busy || !desktop} onClick={() => void action(() => api.manageChatGPTUsage())}/>}
          {connected && <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.disconnectChatGPT()), keyConnected ? 'API key signed out of AppYard.' : 'ChatGPT signed out of AppYard.')}>{switchingToKey ? 'Switch to API key' : 'Sign out'}</button>}
          {tab === 'chatgpt' && accounts.length > 0 && <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.connectChatGPT()))}>Add account</button>}
          <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.refreshChatGPT()))}><RefreshCw size={14}/>Refresh connection</button>
        </>}
      </div>
      {tab === 'api-key' && !connected && !connecting && <><label>API key<input type="password" value={key} disabled={disabled} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder="OpenAI API key"/></label><button className="button secondary" type="button" disabled={disabled || !key.trim() || !api.connectCodexKey} onClick={() => { const entered = key; setKey(''); void action(async () => updated(await api.connectCodexKey!(entered))); }}>Sign in with API key</button></>}
      <p className="connection-note">ChatGPT sign-in opens your browser. AppYard keeps its login locally, separate from your other apps. API keys stay out of project files and exports.</p>
    </div> : <>
      <ModelChoices label="Provider" value={provider} disabled={disabled} onChange={next => { setProvider(next); setModel(''); setKey(''); }} options={providers.filter(id => id !== 'chatgpt').map(id => ({ id, name: id.startsWith('opencode') ? 'Hosted models' : id, detail: configuredProviders.has(id) ? 'Connected' : 'API key required' }))}/>
      <label>API key <span className="field-hint">Leave blank to use your existing provider credentials.</span><input type="password" value={key} disabled={disabled} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder="Provider API key"/></label>
      <label className="checkbox checkbox-label"><input type="checkbox" checked={remember} disabled={disabled} onChange={e => setRemember(e.target.checked)}/>{workerURL ? 'Remember this key on the encrypted worker' : 'Remember this key using operating-system encryption'}</label>
    </>}
    <ModelChoices label="Model" value={accountTab && !accountReady ? '' : selectedModel} disabled={disabled || connecting || (accountTab && !accountReady)} onChange={setModel} options={models.map(item => ({ id: item.id, name: item.name, detail: item.id }))}/>

    {accountTab && planReady && <p className="connection-note">Model access depends on your connected account.</p>}
    <button className="button primary" disabled={disabled || connecting || !selectedProvider || !selectedModel || (accountTab && !accountReady)} type="submit">Save model settings <ArrowRight size={16}/></button>
    </>}
    {running && <p className="connection-note">Stop active builds before changing engines or accounts.</p>}
    </div>
  </form>{!workerURL && <LearningSettingsPanel data={data} api={api} busy={busy} desktop={desktop} action={action}/>}</>;
}
