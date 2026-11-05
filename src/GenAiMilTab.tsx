import { useEffect, useState } from 'react';
import type { Bootstrap, FleetAPI } from '../shared/types';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
const demoModels = ['gemini-3.5-flash-withtools', 'gemini-3.8-flash-withtools', 'gemini-4-argon-withtools'] as const;
type PendingAction = 'connect' | 'clear' | 'unlock' | 'save';
export function GenAiMilTab({ data, api, disabled, action, updated, onSaved }: {
  data: Bootstrap; api: FleetAPI; disabled: boolean; action: Action; updated: (value: Bootstrap) => void; onSaved?: (value: Bootstrap) => void;
}) {
  const connection = data.genAiMil;
  const [address, setAddress] = useState(connection?.address ?? 'https://api.genai.mil/v1');
  const [key, setKey] = useState('');
  const [model, setModel] = useState(data.state.settings.provider === 'genai-mil' ? data.state.settings.model : '');
  const [replacement, setReplacement] = useState<string>();
  const [pending, setPending] = useState<PendingAction>();
  const [demo, setDemo] = useState(false);
  const [demoModel, setDemoModel] = useState<string>(demoModels[0]);
  const [demoSavedModel, setDemoSavedModel] = useState('');
  const [now, setNow] = useState(Date.now());
  const issue = connection?.issue;
  useEffect(() => { if (issue?.replacementModel) setReplacement(issue.replacementModel); }, [issue?.replacementModel]);
  useEffect(() => {
    if (!issue?.retryAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [issue?.retryAt]);
  const waiting = !!issue?.retryAt && now < issue.retryAt;
  const changed = address !== connection?.address || !!key;
  const connected = !!connection?.connected && !changed;
  const models = connected ? connection.models : [];
  const selected = models.includes(model) ? model : models[0] ?? '';
  const locked = disabled || !!pending || !api.saveGenAiMil || !api.connectGenAiMil;
  const run = async (operation: PendingAction, task: () => Promise<unknown>, success?: string) => {
    setPending(operation);
    try { await action(task, success); } finally { setPending(undefined); }
  };
  return <div className="genai-mil-connection">
    <h3>GenAI.mil</h3>
    {demo ? <>
      <p className="connection-note" role="note"><strong>Demo mode. No connection or model requests are made.</strong></p>
      <p>Explore model selection using sample models from the supplied documentation. Your saved connection and model settings stay unchanged.</p>
      <label>Demo model<select aria-label="GenAI.mil demo model" value={demoModel} onChange={e => { setDemoModel(e.target.value); setDemoSavedModel(''); }}>
        {demoModels.map(id => <option key={id} value={id}>{id}</option>)}
      </select></label>
      <div className="connection-actions">
        <button className="button primary" type="button" onClick={() => setDemoSavedModel(demoModel)}>Use model in demo</button>
        <button className="button secondary" type="button" onClick={() => { setDemo(false); setDemoSavedModel(''); }}>Exit demo</button>
      </div>
      <p role="status" aria-live="polite">{demoSavedModel ? `${demoSavedModel} selected for this demo only. No build has been started.` : 'Choose a sample model to try the demo setup.'}</p>
    </> : <>
    <button className="button secondary" type="button" disabled={!!pending} onClick={() => { setKey(''); setDemoSavedModel(''); setDemo(true); }}>Try demo setup</button>
    <p>Get your key from the GenAI.mil site. It locks every 14 days and must be unlocked there.</p>
    <p>GenAI.mil is for government devices. Follow your command's rules on what can be sent.</p>
    <label>Service address<input type="url" value={address} disabled={locked} onChange={e => setAddress(e.target.value)} autoComplete="off" spellCheck={false}/></label>
    <label>GenAI.mil key <span className="field-hint">{connection?.hasKey ? 'Leave blank to keep the saved key at this address.' : 'Saved using operating-system encryption.'}</span>
      <input type="password" value={key} disabled={locked} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder="GenAI.mil key"/>
    </label>
    <div className="connection-actions">
      <button className="button secondary" type="button" disabled={locked || waiting || (!key.trim() && (!connection?.hasKey || address !== connection.address))} onClick={() => {
        const entered = key.trim(); setKey('');
        void run('connect', async () => {
          if (changed) {
            const saved = await api.saveGenAiMil!(address, entered || undefined);
            updated(saved); setAddress(saved.genAiMil!.address);
          }
          updated(await api.connectGenAiMil!());
        });
      }}>{pending === 'connect' ? 'Connecting...' : connected ? 'Refresh models' : connection?.hasKey && !changed ? 'Connect' : 'Save and connect'}</button>
      <button className="button secondary" type="button" disabled={locked || !connection?.hasKey || !api.clearGenAiMil} onClick={() => void run('clear', async () => {
        const next = await api.clearGenAiMil!(); updated(next); setKey(''); setAddress(next.genAiMil!.address); setModel(''); setReplacement(undefined);
      })}>{pending === 'clear' ? 'Clearing...' : 'Clear connection'}</button>
    </div>
    <p role="status" aria-live="polite">{pending === 'connect' ? 'Connecting and loading models...' : connected ? models.length ? 'Connected to the model catalog. Choose a model for builds.' : 'Connected to the model catalog, but no models for builds are available.' : changed ? 'Save and connect to load models for these connection details.' : connection?.hasKey ? 'Key saved. Connect to load available models.' : 'Enter your service address and key to connect.'}{waiting ? ` Try again in ${Math.ceil((issue!.retryAt! - now) / 1000)} seconds.` : ''}</p>
    {issue && <div className="connection-error" role="alert"><p>{issue.message} {issue.nextStep}</p>
      {issue.unlockUrl && <button className="button secondary" type="button" disabled={locked || !api.openGenAiMilUnlock} onClick={() => void run('unlock', () => api.openGenAiMilUnlock!())}>{pending === 'unlock' ? 'Opening GenAI.mil...' : 'Unlock key on GenAI.mil'}</button>}
    </div>}
    {replacement && models.includes(replacement) && <button className="button secondary" type="button" disabled={locked} onClick={() => setModel(replacement)}>Select replacement {replacement}</button>}
    <label>Model<select aria-label="GenAI.mil model" value={selected} disabled={locked || !connected || !models.length} onChange={e => setModel(e.target.value)}>
      <option value="" disabled>{connected ? models.length ? 'Select a model' : 'No models available for builds' : 'Connect to load models'}</option>
      {models.map(id => <option key={id} value={id}>{id}</option>)}
    </select></label>
    <p className="connection-note">Only models ending in -withtools support builds in AppYard. Connecting loads the model catalog; it does not run a model.</p>
    <button className="button primary" type="button" disabled={locked || !connected || !selected} onClick={() => void run('save', async () => {
      const next = await api.saveSettings({ backend: 'pi', provider: 'genai-mil', model: selected, rememberKey: true });
      updated(next); onSaved?.(next);
    }, 'Model settings saved.')}>{pending === 'save' ? 'Saving...' : 'Use model for builds'}</button>
    </>}
  </div>;
}
