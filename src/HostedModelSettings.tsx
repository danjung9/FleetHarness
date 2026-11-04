import { useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Trash2 } from 'lucide-react';
import type { Bootstrap, FleetAPI } from '../shared/types';
import './model-settings.css';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
export function HostedModelSettings({ data, api, busy, action, updated }: { data: Bootstrap; api: FleetAPI; busy: boolean; action: Action; updated: (value: Bootstrap) => void }) {
  const [key, setKey] = useState(''), [model, setModel] = useState(data.state.settings.model);
  const [testing, setTesting] = useState(false);
  const models = data.models.filter(item => item.provider === 'openai' && (item.backend ?? 'pi') === 'pi');
  const selected = models.some(item => item.id === model) ? model : '';
  const connected = models.some(item => item.configured);
  const running = data.state.projects.some(project => project.status === 'running' || project.status === 'pausing');
  const disabled = busy || running;
  return <form className="model-settings-form" aria-busy={testing} onSubmit={event => {
    event.preventDefault();
    void action(async () => {
      setTesting(true);
      try {
        const result = await api.saveSettings({ backend: 'pi', provider: 'openai', model: selected, rememberKey: true }, key.trim() || undefined);
        setKey(''); updated(result);
      } finally { setTesting(false); }
    }, 'OpenAI connection tested and saved.');
  }}>
    <div className="hosted-key-status" role="status"><p className="account-identity">{connected ? <CheckCircle2 size={17}/> : <KeyRound size={17}/>}<strong>{connected ? 'OpenAI connected' : 'Connect OpenAI'}</strong></p><p>{data.credentialStatus}</p></div>
    <label>{connected ? 'Replace API key' : 'OpenAI API key'}<span className="field-hint">{connected ? 'Leave blank to keep your saved key.' : 'Use an API key from your OpenAI project.'}</span><input type="password" value={key} disabled={disabled} autoComplete="off" spellCheck={false} onChange={event => setKey(event.target.value)} placeholder={connected ? 'Enter a new key to replace it' : 'sk-…'} required={!connected}/></label>
    <label>Build model<select aria-label="Model" value={selected} disabled={disabled} onChange={event => setModel(event.target.value)}><option value="" disabled>Select a model</option>{models.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
    <p className="connection-note">Your key is encrypted in account storage and used only by the backend. Testing sends a small request to the selected model and may incur OpenAI usage charges.</p>
    {data.state.projects.some(project => project.canResume) && <p className="connection-note">Paused builds resume with their original model. Select that model again before resuming if you change it here.</p>}
    {running && <p className="connection-note">Pause active builds and wait for their checkpoint before changing the key or model. You can sign out while a build runs.</p>}
    <div className="connection-actions"><button className="primary" type="submit" disabled={disabled || !selected || (!key.trim() && !connected)}>{testing ? <Loader2 size={16} className="auth-spinner"/> : <ArrowRight size={16}/>} {testing ? 'Testing connection…' : 'Test connection & save'}</button>
      {connected && api.removeKey && <button className="secondary" type="button" disabled={disabled} onClick={() => void action(async () => { updated(await api.removeKey!()); setKey(''); }, 'OpenAI key removed from this account.')}><Trash2 size={15}/>Remove key</button>}
    </div>
  </form>;
}
