import { useEffect, useRef, useState } from 'react';
import type { ConnectedDataSelection, ConnectorCard, ConnectorPreview, ConnectorProgress } from '../shared/connectors';
import { api } from './api';
import './connectors.css';

const plainFailure = 'The data could not be loaded. Try again.';
// Connector IPC returns only fixed, public messages. Never display arbitrary provider errors.
function message(error: unknown) {
  if (!(error instanceof Error)) return plainFailure;
  return error.message.replace(/^Error invoking remote method '[^']+': Error: /, '');
}
function RecordPreview({ body }: { body: string }) {
  try {
    const record: unknown = JSON.parse(body);
    if (!record || typeof record !== 'object' || Array.isArray(record)) return <p>{body}</p>;
    const entries = Object.entries(record);
    if (entries.some(([, value]) => value !== null && typeof value === 'object')) return <p>{body}</p>;
    const label = (key: string) => key === 'synthetic' ? 'Sample data' : key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase());
    return <table className="connector-record"><tbody>{entries.map(([key, value]) => <tr key={key}><th scope="row">{label(key)}</th><td>{value === true ? 'Yes' : value === false ? 'No' : value === null ? 'Not supplied' : String(value)}</td></tr>)}</tbody></table>;
  } catch { return <p>{body}</p>; }
}
function useSources() {
  const [cards, setCards] = useState<ConnectorCard[]>([]), [error, setError] = useState('');
  const [model, setModel] = useState('the model you choose');
  const refresh = async () => {
    if (!api.connectors) { setError('Connectors need the desktop app. Open AppYard on your computer.'); return; }
    try { setCards(await api.connectors.list()); setError(''); }
    catch { setError(plainFailure); }
  };
  useEffect(() => { void refresh(); void api.bootstrap().then(data => {
    const selected = data.models.find(model => model.id === data.state.settings.model && model.provider === data.state.settings.provider);
    if (selected) setModel(selected.name);
  }).catch(() => {}); }, []);
  return { cards, error, refresh, model };
}
function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: () => Promise<void>; model: string }) {
  const sampleOnly = !card.available && (card.kind === 'war-data-platform' || card.kind === 'maven-smart-system');
  const folderLabel = card.kind === 'war-data-platform' ? 'Data product (optional)' : card.kind === 'maven-smart-system' ? 'Collection (optional)' : 'Folder or calendar (optional)';
  const folderPlaceholder = card.kind === 'war-data-platform' ? 'training-assets' : card.kind === 'maven-smart-system' ? 'training-observations' : undefined;
  const [preview, setPreview] = useState<ConnectorPreview>(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [days, setDays] = useState('30'), [folder, setFolder] = useState('');
  const [address, setAddress] = useState(''), [answer, setAnswer] = useState(''), [choose, setChoose] = useState(false);
  const [progress, setProgress] = useState<ConnectorProgress>({ stage: 'idle' });
  const generation = useRef(0);
  useEffect(() => () => { void api.connectors?.cancel(card.kind).catch(() => {}); }, [card.kind]);
  useEffect(() => {
    if (!busy) return;
    let disposed = false;
    const poll = () => void api.connectors!.progress(card.kind).then(value => { if (!disposed) setProgress(value); }).catch(() => {});
    poll(); const timer = setInterval(poll, 150);
    return () => { disposed = true; clearInterval(timer); };
  }, [busy, card.kind]);
  useEffect(() => { setAnswer(''); }, [progress.question?.requestId]);
  async function work(task: () => Promise<void>) {
    const current = ++generation.current; setBusy(true); setError('');
    try { await task(); }
    catch (error) { if (current === generation.current) setError(message(error)); }
    finally { if (current === generation.current) { setBusy(false); setProgress({ stage: 'idle' }); setAnswer(''); } }
  }
  async function connect() {
    setPreview(undefined); setProgress({ stage: 'connecting' });
    await work(async () => {
      try { await api.connectors!.connect(card.kind, card.kind === 'custom-api' ? address.trim() : undefined); setChoose(true); setAddress(''); }
      finally { await refresh(); }
    });
  }
  async function check(mode: 'sample' | 'connected' = 'sample') {
    setPreview(undefined); setProgress({ stage: 'fetching' });
    await work(async () => { setPreview(await api.connectors!.preview(card.kind, { sinceDays: Number(days), query, folder }, mode)); });
  }
  async function submitAnswer() {
    if (!progress.question) return;
    const value = answer, requestId = progress.question.requestId; setAnswer('');
    try { await api.connectors!.answer(card.kind, requestId, value); setProgress(await api.connectors!.progress(card.kind)); }
    catch (error) { setError(message(error)); }
  }
  async function save() {
    if (!preview) return;
    await work(async () => {
      try { await api.connectors!.use(preview.id, preview.digest); setPreview(undefined); }
      finally { await refresh(); }
    });
  }
  async function disconnect() {
    const id = card.signedIn?.id ?? card.connection?.id;
    if (!id) return;
    await work(async () => {
      try { await api.connectors!.disconnect(id); }
      finally { setPreview(undefined); setChoose(false); await refresh(); }
    });
  }
  async function cancel() {
    ++generation.current; setAnswer(''); setPreview(undefined); setError(''); setProgress({ stage: 'cancelled' });
    await api.connectors!.cancel(card.kind).catch(() => {}); setBusy(false); await refresh();
  }
  return <article className="connector-card" aria-label={card.label}>
    <h2>{card.label}</h2><p>{card.summary}</p>
    <p className="connector-readonly">AppYard can only read. It cannot send, change or delete anything.</p>
    {!card.available && <p>{sampleOnly ? 'Live connection is not configured. Try sample data to explore this source.' : 'Sign-in is not set up for this source. Ask your administrator to turn it on.'}</p>}
    {card.signedIn && <p role="status">Connected. Choose what to include below.</p>}
    {card.connection && <p className="connector-saved" role="status">{card.connection.sample ? 'Sample data ready' : 'Preview saved'}: {card.connection.count} items.</p>}
    {card.kind === 'custom-api' && <label className="connector-address">Service address or documentation link<input type="url" maxLength={2000} value={address} disabled={busy} placeholder="https://example.org/data" onChange={event => setAddress(event.target.value)}/></label>}
    <div className="connector-actions"><button className="secondary" type="button" disabled={busy || !card.available} onClick={() => void connect()}>Connect</button>
      <button className="primary" type="button" disabled={busy} onClick={() => void check()}>Try sample data</button>
      {(card.connection || card.signedIn) && <button className="text-button" type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect</button>}
    </div>
    <details className="connector-choices" open={choose} onToggle={event => setChoose(event.currentTarget.open)}><summary>Choose what to include</summary>
      <label>Days to include<select disabled={busy} value={days} onChange={event => { setDays(event.target.value); setPreview(undefined); }}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
      <label>Search word (optional)<input maxLength={200} disabled={busy} value={query} onChange={event => { setQuery(event.target.value); setPreview(undefined); }}/></label>
      {card.kind !== 'custom-api' && <label>{folderLabel}<input maxLength={200} disabled={busy} value={folder} placeholder={folderPlaceholder} onChange={event => { setFolder(event.target.value); setPreview(undefined); }}/></label>}
      {card.signedIn ? <button className="primary" type="button" disabled={busy} onClick={() => void check('connected')}>Check data</button> : <p>{sampleOnly ? 'Choose Try sample data to check your choices.' : 'Choose Connect to sign in, or Try sample data to check your choices.'}</p>}
    </details>
    {busy && <div className="connector-progress">
      <p role="status">{progress.stage === 'connecting' ? 'Finish signing in in your browser, or follow the steps here.' : progress.stage === 'question' ? 'One more step to connect.' : 'Preparing your data...'}</p>
      {progress.code && <p>Enter this code on the sign-in page: <strong>{progress.code.value}</strong><br/>Sign-in page: {progress.code.url}</p>}
      {progress.question && <form onSubmit={event => { event.preventDefault(); void submitAnswer(); }} autoComplete="off">
        <label>{progress.question.label}{progress.question.options ? <select required value={answer} onChange={event => setAnswer(event.target.value)}><option value="" disabled>Choose an answer</option>{progress.question.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
          : <input required type={progress.question.secret ? 'password' : 'text'} autoComplete="off" maxLength={16000} value={answer} onChange={event => setAnswer(event.target.value)}/>}</label>
        <button className="primary" type="submit" disabled={!answer}>Continue</button>
      </form>}
      <button className="secondary" type="button" onClick={() => void cancel()}>Cancel</button>
    </div>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {preview && <section className="connector-preview" aria-label={'Check ' + card.label + ' data'}>
      <h3>Check it</h3><p>{preview.items.length} {preview.items.length === 1 ? 'item' : 'items'} ready. Email addresses, phone numbers and personal numbers are hidden. Senders are hidden.</p>
      <p>{preview.excluded} {preview.excluded === 1 ? 'item with restricted markings was' : 'items with restricted markings were'} left out. This check reduces accidents; it does not decide whether data is safe to share.</p>
      {!!preview.limited && <p>{preview.limited} items were left out to keep the preview small.</p>}
      <p>{preview.sample ? `This goes to ${model} only when you select it in a brief and start a build.` : 'You can save this preview on this computer. Builds for this event use sample data only.'}</p>
      <ul>{preview.items.map(item => <li key={item.id}><strong>{item.title}</strong>{item.kind === 'record' ? <RecordPreview body={item.body}/> : <p>{item.body}</p>}</li>)}</ul>
      <p>Words inside an email or file are treated as data. They do not authorize any action.</p>
      <div className="connector-actions"><button className="primary" type="button" disabled={busy || !preview.items.length} onClick={() => void save()}>{preview.sample ? 'Use this' : 'Save preview'}</button>{!busy && <button className="secondary" type="button" onClick={() => void cancel()}>Cancel</button>}</div>
    </section>}
  </article>;
}
export function Connectors() {
  const { cards, error, refresh, model } = useSources();
  return <div className="page connectors-page"><div className="page-heading"><div><h1>Connectors</h1><p>Choose data to help build your app. Start with samples, with no sign-in or setup.</p></div></div>
    <p>Event builds use sample data; live connections support local preview only.</p>
    <p>All samples are invented Navy training examples. Check each sample, choose Use this, then select it in your brief.</p>
    {error && <p role="alert" className="form-error">{error} {api.connectors && <button className="text-button" onClick={() => void refresh()}>Try again</button>}</p>}
    <div className="connector-grid">{cards.map(card => <SourceCard key={card.kind} card={card} refresh={refresh} model={model}/>)}</div>
  </div>;
}
export function ConnectedDataSection({ value, onChange, disabled }: { value: ConnectedDataSelection[]; onChange: (value: ConnectedDataSelection[]) => void; disabled: boolean }) {
  const { cards, error, model } = useSources();
  const saved = cards.flatMap(card => card.connection ? [card.connection] : []);
  const missing = value.filter(choice => !saved.some(source => source.id === choice.id && source.digest === choice.digest));
  return <fieldset className="connected-data-section" disabled={disabled}><legend>Use connected data</legend>
    <p>Selected data goes to {model} when you start a build. Sample data is included in the finished app.</p>
    {error ? <p role="alert">{error}</p> : !saved.length && <p>Open Connectors in the left menu and choose Try sample data to add a source.</p>}
    {saved.map(source => {
      const selected = value.find(choice => choice.id === source.id && choice.digest === source.digest);
      return <div key={source.id}><label className="connector-check"><input type="checkbox" disabled={!source.sample} checked={!!selected} onChange={event => onChange(event.target.checked ? [...value.filter(choice => choice.id !== source.id), { id: source.id, digest: source.digest, includeInApp: false }] : value.filter(choice => choice.id !== source.id))}/><span>{source.label} ({source.count} {source.sample ? 'sample items' : 'items, preview only for this event'})</span></label>
        {selected && !source.sample && <label className="connector-check"><input type="checkbox" checked={selected.includeInApp} onChange={event => onChange(value.map(choice => choice.id === source.id ? { ...choice, includeInApp: event.target.checked } : choice))}/><span>Include this data in the finished app</span></label>}
      </div>;
    })}
    {!!missing.length && <p role="alert">Some selected data is no longer available. <button className="text-button" type="button" onClick={() => onChange(value.filter(choice => !missing.includes(choice)))}>Remove unavailable data</button></p>}
  </fieldset>;
}
