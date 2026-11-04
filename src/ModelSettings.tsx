import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { AgentBackend, Bootstrap, FleetAPI } from '../shared/types';
import './model-settings.css';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
export function ModelSettings({ data, api, busy, action, updated, desktop, onSaved }: { data: Bootstrap; api: FleetAPI; busy: boolean; action: Action; updated: (value: Bootstrap) => void; desktop: boolean; onSaved?: (value: Bootstrap) => void }) {
  const [backend, setBackend] = useState<AgentBackend>(data.state.settings.backend ?? (data.state.settings.provider ? 'pi' : 'codex'));
  const [provider, setProvider] = useState(data.state.settings.provider);
  const [model, setModel] = useState(data.state.settings.model);
  const [key, setKey] = useState(''), [remember, setRemember] = useState(data.state.settings.rememberKey);
  const allModels = data.models.filter(m => (m.backend ?? 'pi') === backend);
  const selectedProvider = backend === 'codex' ? 'chatgpt' : provider;
  const models = allModels.filter(m => m.provider === selectedProvider);
  const selectedModel = models.some(m => m.id === model) ? model : models[0]?.id ?? '';
  const providers = [...new Set(allModels.map(m => m.provider))];
  const account = data.chatgpt;
  const connecting = account?.status === 'connecting';
  const connected = account?.status === 'connected';
  const running = data.state.projects.some(p => p.status === 'running');
  const disabled = busy || !desktop || running;
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
    e.preventDefault(); void action(async () => {
      const saved = await api.saveSettings({ backend, provider: selectedProvider, model: selectedModel, rememberKey: backend === 'pi' && remember }, backend === 'pi' ? key || undefined : undefined);
      updated(saved); setKey(''); onSaved?.(saved);
    }, 'Model settings saved.');
  }}>
    {!desktop && <div className="desktop-setup-notice"><h3>Builds run in the desktop app</h3><p>This browser preview lets you explore AppYard and save briefs. To run a build, open the AppYard desktop app, add your brief, then connect a model in Settings.</p><p>Briefs saved here stay in this browser; they do not sync to the desktop app.</p></div>}
    <fieldset className="engine-selector" disabled={disabled || connecting}>
      <legend>Build engine</legend>
      <div className="engine-options">
        {([{ id: 'codex', name: 'Codex', description: 'ChatGPT or API key' }, { id: 'pi', name: 'Pi', description: 'Model providers' }] as const).map(engine => <label className="engine-option" key={engine.id}>
          <input type="radio" name="build-engine" value={engine.id} checked={backend === engine.id} onChange={() => { setBackend(engine.id); setModel(''); setKey(''); }}/>
          <span><strong>{engine.name}</strong><small>{engine.description}</small></span>
        </label>)}
      </div>
    </fieldset>
    {backend === 'codex' ? <div className="chatgpt-connection">
      <h3>Codex account</h3>
      <p>Connect with ChatGPT or an API key. ChatGPT uses your plan's Codex allowance; API-key usage is billed to the key's account.</p>
      <div role="status" aria-live="polite">
        {connected ? <p className="account-identity"><CheckCircle2 size={17}/><span>{account.email || 'ChatGPT connected'}{account.plan && <small>{account.plan} plan</small>}</span></p>
          : connecting ? <p className="account-identity"><Loader2 size={17}/><span>{account.authType === 'apiKey' ? 'Connecting your API key.' : 'Finish signing in in your browser. This screen updates automatically.'}</span></p> : <p>Sign in with ChatGPT or enter an API key.</p>}
      </div>
      {account?.error && <p className="connection-error" role="alert">{account.error}</p>}
      <div className="connection-actions">
        {connecting ? <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.cancelChatGPTLogin()))}>Cancel sign-in</button>
          : connected ? <button className="button secondary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.disconnectChatGPT()), 'Codex signed out of AppYard.')}>Sign out</button>
          : <button className="button primary" type="button" disabled={disabled} onClick={() => void action(async () => updated(await api.connectChatGPT()))}>Continue with ChatGPT <ArrowRight size={16}/></button>}
        {!connecting && <button className="button secondary" type="button" disabled={busy || !desktop} onClick={() => void action(async () => updated(await api.refreshChatGPT()))}><RefreshCw size={14}/>Refresh connection</button>}
      </div>
      {!connected && !connecting && <><label>API key<input type="password" value={key} disabled={disabled} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder="OpenAI API key"/></label><button className="button secondary" type="button" disabled={disabled || !key.trim() || !api.connectCodexKey} onClick={() => { const entered = key; setKey(''); void action(async () => updated(await api.connectCodexKey!(entered))); }}>Sign in with API key</button></>}
      {connected && <div className="subscription-usage">{account.limits?.length ? account.limits.map((limit, i) => <div key={i}><span>{limit.label}</span><strong>{Math.round(limit.usedPercent)}% used</strong>{limit.resetsAt && <small>Resets {new Date(limit.resetsAt * 1000).toLocaleString()}</small>}</div>) : <p>Usage details are currently unavailable.</p>}</div>}
      <p className="connection-note">ChatGPT sign-in opens your browser. AppYard keeps its Codex login locally, separate from your other Codex apps. API keys stay out of project files and exports.</p>
    </div> : <>
      <label>Provider<select aria-label="Provider" value={provider} disabled={disabled} onChange={e => { setProvider(e.target.value); setModel(''); }}><option value="">Select a provider</option>{providers.map(p => <option key={p} value={p}>{p}{allModels.find(m => m.provider === p)?.configured ? ' · connected' : ''}</option>)}</select></label>
      <label>API key <span className="field-hint">Leave blank to use existing Pi credentials.</span><input type="password" value={key} disabled={disabled} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder="Provider API key"/></label>
      <label className="checkbox checkbox-label"><input type="checkbox" checked={remember} disabled={disabled} onChange={e => setRemember(e.target.checked)}/>Remember this key using operating-system encryption</label>
    </>}
    <label>Model<select aria-label="Model" value={backend === 'codex' && !connected ? '' : selectedModel} disabled={disabled || connecting || (backend === 'codex' && !connected)} onChange={e => setModel(e.target.value)}><option value="" disabled>{backend === 'codex' && !connected ? 'Sign in to choose a model' : 'Select a model'}</option>{models.map(m => <option key={m.id} value={m.id}>{m.name} · {m.id}</option>)}</select></label>
    {backend === 'codex' && connected && <p className="connection-note">Model access depends on your plan and workspace.</p>}
    {running && <p className="connection-note">Stop active builds before changing engines or accounts.</p>}
    <button className="button primary" disabled={disabled || connecting || !selectedProvider || !selectedModel || (backend === 'codex' && !connected)} type="submit">Save model settings <ArrowRight size={16}/></button>
  </form>;
}
