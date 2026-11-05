import { useEffect, useState } from 'react';
import type { Bootstrap, FleetAPI } from '../shared/types';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
export function GenAiMilTab({ data, api, disabled, action, updated, onSaved }: {
  data: Bootstrap; api: FleetAPI; disabled: boolean; action: Action; updated: (value: Bootstrap) => void; onSaved?: (value: Bootstrap) => void;
}) {
  const connection = data.genAiMil;
  const [address, setAddress] = useState(connection?.address ?? 'https://api.genai.mil/v1');
  const [key, setKey] = useState('');
  const [model, setModel] = useState(data.state.settings.provider === 'genai-mil' ? data.state.settings.model : '');
  const [replacement, setReplacement] = useState<string>();
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const issue = connection?.issue;
  useEffect(() => { if (issue?.replacementModel) setReplacement(issue.replacementModel); }, [issue?.replacementModel]);
  useEffect(() => {
    if (!issue?.retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [issue?.retryAt]);
  const waiting = !!issue?.retryAt && now < issue.retryAt;
  const changed = address !== connection?.address || !!key;
  const connected = !!connection?.connected && !changed && !pending;
  const models = connected ? connection.models : [];
  const selected = models.includes(model) ? model : models[0] ?? '';
  const locked = disabled || pending || !api.saveGenAiMil || !api.connectGenAiMil;
  const run = async (task: () => Promise<unknown>, success?: string) => {
    setPending(true);
    try { await action(task, success); } finally { setPending(false); }
  };
  return <div className="genai-mil-connection">
    <h3>GenAI.mil</h3>
    <p>Get your key from the GenAI.mil site. It locks every 14 days and must be unlocked there.</p>
    <p>GenAI.mil is for government devices. Follow your command's rules on what can be sent.</p>
    <label>Service address<input type="url" value={address} disabled={locked} onChange={e => setAddress(e.target.value)} autoComplete="off" spellCheck={false}/></label>
    <label>GenAI.mil key <span className="field-hint">{connection?.hasKey ? 'Leave blank to keep the saved key at this address.' : 'Saved using operating-system encryption.'}</span>
      <input type="password" value={key} disabled={locked} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder="GenAI.mil key"/>
    </label>
    <div className="connection-actions">
      <button className="button secondary" type="button" disabled={locked || waiting || (!key.trim() && (!connection?.hasKey || address !== connection.address))} onClick={() => {
        const entered = key.trim(); setKey('');
        void run(async () => {
          if (changed) {
            const saved = await api.saveGenAiMil!(address, entered || undefined);
            updated(saved); setAddress(saved.genAiMil!.address);
          }
          updated(await api.connectGenAiMil!());
        });
      }}>{pending ? 'Connecting...' : connected ? 'Refresh models' : 'Save and connect'}</button>
      <button className="button secondary" type="button" disabled={locked || !connection?.hasKey || !api.clearGenAiMil} onClick={() => void run(async () => {
        const next = await api.clearGenAiMil!(); updated(next); setKey(''); setAddress(next.genAiMil!.address); setModel(''); setReplacement(undefined);
      })}>Clear connection</button>
    </div>
    <p role="status" aria-live="polite">{connected ? 'Connected' : 'Not connected'}{waiting ? `; try again in ${Math.ceil((issue!.retryAt! - now) / 1000)} seconds.` : ''}</p>
    {issue && <div className="connection-error" role="alert"><p>{issue.message} {issue.nextStep}</p>
      {issue.unlockUrl && <><p>{issue.unlockUrl}</p><button className="button secondary" type="button" disabled={locked || !api.openGenAiMilUnlock} onClick={() => void run(() => api.openGenAiMilUnlock!())}>Unlock key on GenAI.mil</button></>}
    </div>}
    {replacement && models.includes(replacement) && <button className="button secondary" type="button" disabled={locked} onClick={() => setModel(replacement)}>Select replacement {replacement}</button>}
    <label>Model<select aria-label="GenAI.mil model" value={selected} disabled={locked || !connected} onChange={e => setModel(e.target.value)}>
      <option value="" disabled>{connected ? 'Select a model' : 'Connect to load models'}</option>
      {models.map(id => <option key={id} value={id}>{id}</option>)}
    </select></label>
    <p className="connection-note">Only models ending in -withtools can run agents. GenAI.mil uses Pi. A delivered app that uses this service needs a backend; browser calls are blocked.</p>
    <p className="connection-note">This connection has not yet been tried against the live service.</p>
    <button className="button primary" type="button" disabled={locked || !connected || !selected} onClick={() => void run(async () => {
      const next = await api.saveSettings({ backend: 'pi', provider: 'genai-mil', model: selected, rememberKey: true });
      updated(next); onSaved?.(next);
    }, 'Model settings saved.')}>Save model settings</button>
  </div>;
}
