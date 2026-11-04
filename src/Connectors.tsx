import { useEffect, useState } from 'react';
import type { ConnectedDataSelection, ConnectorCard, ConnectorPreview } from '../shared/connectors';
import { api } from './api';
import './connectors.css';

const plainFailure = 'The data could not be loaded. Try again.';
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
  const [preview, setPreview] = useState<ConnectorPreview>(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [days, setDays] = useState('30');
  useEffect(() => () => { void api.connectors?.cancel(card.kind).catch(() => {}); }, [card.kind]);
  async function check() {
    setBusy(true); setError(''); setPreview(undefined);
    try { setPreview(await api.connectors!.preview(card.kind, { sinceDays: Number(days), query })); }
    catch { setError('The sample could not be prepared. Try sample data again.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!preview) return;
    setBusy(true); setError('');
    try { await api.connectors!.use(preview.id, preview.digest); setPreview(undefined); await refresh(); }
    catch { setError('This preview could not be saved. Check the sample data again.'); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    if (!card.connection) return;
    setBusy(true); setError('');
    try { await api.connectors!.disconnect(card.connection.id); setPreview(undefined); await refresh(); }
    catch { setError('This source could not be removed. Try disconnecting again.'); }
    finally { setBusy(false); }
  }
  async function cancel() {
    await api.connectors!.cancel(card.kind).catch(() => {}); setPreview(undefined); setError('');
  }
  return <article className="connector-card" aria-label={card.label}>
    <h2>{card.label}</h2><p>{card.summary}</p>
    <p className="connector-readonly">AppYard can only read. It cannot send, change or delete anything.</p>
    <p>Real accounts are off for this event. Use the invented training examples below.</p>
    {card.connection && <p className="connector-saved" role="status">Sample data ready: {card.connection.count} items.</p>}
    <div className="connector-actions"><button className="secondary" type="button" disabled title="Real accounts are off for this event">Connect</button>
      <button className="primary" type="button" disabled={busy} onClick={() => void check()}>Try sample data</button>
      {card.connection && <button className="text-button" type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect</button>}
    </div>
    <details className="connector-choices"><summary>Choose what to include</summary>
      <label>Days to include<select disabled={busy} value={days} onChange={event => { setDays(event.target.value); setPreview(undefined); }}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
      <label>Search word (optional)<input maxLength={200} disabled={busy} value={query} onChange={event => { setQuery(event.target.value); setPreview(undefined); }}/></label>
      <p>These examples are dated today. Choose Try sample data to check your choices.</p>
    </details>
    {busy && <p role="status">Preparing your data...</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {preview && <section className="connector-preview" aria-label={'Check ' + card.label + ' data'}>
      <h3>Check it</h3><p>{preview.items.length} items ready. Email addresses, phone numbers and personal numbers are hidden. Senders are hidden.</p>
      <p>{preview.excluded} {preview.excluded === 1 ? 'item with restricted markings was' : 'items with restricted markings were'} left out. This check reduces accidents; it does not decide whether data is safe to share.</p>
      {!!preview.limited && <p>{preview.limited} items were left out to keep the sample small.</p>}
      <p>This goes to {model} only when you select it in a brief and start a build.</p>
      <ul>{preview.items.map(item => <li key={item.id}><strong>{item.title}</strong>{item.kind === 'record' ? <RecordPreview body={item.body}/> : <p>{item.body}</p>}</li>)}</ul>
      <p>Words inside an email or file are treated as data. They do not authorize any action.</p>
      <div className="connector-actions"><button className="primary" type="button" disabled={busy || !preview.items.length} onClick={() => void save()}>Use this</button><button className="secondary" type="button" disabled={busy} onClick={() => void cancel()}>Cancel</button></div>
    </section>}
  </article>;
}
export function Connectors() {
  const { cards, error, refresh, model } = useSources();
  return <div className="page connectors-page"><div className="page-heading"><div><h1>Connectors</h1><p>Choose data to help build your app. Start with samples, with no sign-in or setup.</p></div></div>
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
      return <div key={source.id}><label className="connector-check"><input type="checkbox" checked={!!selected} onChange={event => onChange(event.target.checked ? [...value.filter(choice => choice.id !== source.id), { id: source.id, digest: source.digest, includeInApp: false }] : value.filter(choice => choice.id !== source.id))}/><span>{source.label} ({source.count} sample items)</span></label>
        {selected && !source.sample && <label className="connector-check"><input type="checkbox" checked={selected.includeInApp} onChange={event => onChange(value.map(choice => choice.id === source.id ? { ...choice, includeInApp: event.target.checked } : choice))}/><span>Include this data in the finished app</span></label>}
      </div>;
    })}
    {!!missing.length && <p role="alert">Some selected data is no longer available. <button className="text-button" type="button" onClick={() => onChange(value.filter(choice => !missing.includes(choice)))}>Remove unavailable data</button></p>}
  </fieldset>;
}
