# Existing frontend lines changed in the integration batch

No line changed in src/App.tsx, studio/, index.html or any teammate-owned stylesheet. The rail and brief hooks from the first batch are unchanged.

Only the two core-owned frontend files changed. This exact zero-context diff lists every removed and added line against the merged starting revision. Hunk headers give the old and new line numbers; unchanged lines are omitted.

```diff
diff --git a/src/Connectors.tsx b/src/Connectors.tsx
index 777efde..3f6917f 100644
--- a/src/Connectors.tsx
+++ b/src/Connectors.tsx
@@ -1,2 +1,2 @@
-import { useEffect, useState } from 'react';
-import type { ConnectedDataSelection, ConnectorCard, ConnectorPreview } from '../shared/connectors';
+import { useEffect, useRef, useState } from 'react';
+import type { ConnectedDataSelection, ConnectorCard, ConnectorPreview, ConnectorProgress } from '../shared/connectors';
@@ -6,0 +7,5 @@ const plainFailure = 'The data could not be loaded. Try again.';
+// Connector IPC returns only fixed, public messages. Never display arbitrary provider errors.
+function message(error: unknown) {
+  if (!(error instanceof Error)) return plainFailure;
+  return error.message.replace(/^Error invoking remote method '[^']+': Error: /, '');
+}
@@ -33 +38,4 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-  const [query, setQuery] = useState(''), [days, setDays] = useState('30');
+  const [query, setQuery] = useState(''), [days, setDays] = useState('30'), [folder, setFolder] = useState('');
+  const [address, setAddress] = useState(''), [answer, setAnswer] = useState(''), [choose, setChoose] = useState(false);
+  const [progress, setProgress] = useState<ConnectorProgress>({ stage: 'idle' });
+  const generation = useRef(0);
@@ -35,5 +43,30 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-  async function check() {
-    setBusy(true); setError(''); setPreview(undefined);
-    try { setPreview(await api.connectors!.preview(card.kind, { sinceDays: Number(days), query })); }
-    catch { setError('The sample could not be prepared. Try sample data again.'); }
-    finally { setBusy(false); }
+  useEffect(() => {
+    if (!busy) return;
+    let disposed = false;
+    const poll = () => void api.connectors!.progress(card.kind).then(value => { if (!disposed) setProgress(value); }).catch(() => {});
+    poll(); const timer = setInterval(poll, 150);
+    return () => { disposed = true; clearInterval(timer); };
+  }, [busy, card.kind]);
+  useEffect(() => { setAnswer(''); }, [progress.question?.requestId]);
+  async function work(task: () => Promise<void>) {
+    const current = ++generation.current; setBusy(true); setError('');
+    try { await task(); }
+    catch (error) { if (current === generation.current) setError(message(error)); }
+    finally { if (current === generation.current) { setBusy(false); setProgress({ stage: 'idle' }); setAnswer(''); } }
+  }
+  async function connect() {
+    setPreview(undefined); setProgress({ stage: 'connecting' });
+    await work(async () => {
+      try { await api.connectors!.connect(card.kind, card.kind === 'custom-api' ? address.trim() : undefined); setChoose(true); setAddress(''); }
+      finally { await refresh(); }
+    });
+  }
+  async function check(mode: 'sample' | 'connected' = 'sample') {
+    setPreview(undefined); setProgress({ stage: 'fetching' });
+    await work(async () => { setPreview(await api.connectors!.preview(card.kind, { sinceDays: Number(days), query, folder }, mode)); });
+  }
+  async function submitAnswer() {
+    if (!progress.question) return;
+    const value = answer, requestId = progress.question.requestId; setAnswer('');
+    try { await api.connectors!.answer(card.kind, requestId, value); setProgress(await api.connectors!.progress(card.kind)); }
+    catch (error) { setError(message(error)); }
@@ -43,4 +76,4 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-    setBusy(true); setError('');
-    try { await api.connectors!.use(preview.id, preview.digest); setPreview(undefined); await refresh(); }
-    catch { setError('This preview could not be saved. Check the sample data again.'); }
-    finally { setBusy(false); }
+    await work(async () => {
+      try { await api.connectors!.use(preview.id, preview.digest); setPreview(undefined); }
+      finally { await refresh(); }
+    });
@@ -49,5 +82,6 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-    if (!card.connection) return;
-    setBusy(true); setError('');
-    try { await api.connectors!.disconnect(card.connection.id); setPreview(undefined); await refresh(); }
-    catch { setError('This source could not be removed. Try disconnecting again.'); }
-    finally { setBusy(false); }
+    const id = card.signedIn?.id ?? card.connection?.id;
+    if (!id) return;
+    await work(async () => {
+      try { await api.connectors!.disconnect(id); }
+      finally { setPreview(undefined); setChoose(false); await refresh(); }
+    });
@@ -56 +90,2 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-    await api.connectors!.cancel(card.kind).catch(() => {}); setPreview(undefined); setError('');
+    ++generation.current; setAnswer(''); setPreview(undefined); setError(''); setProgress({ stage: 'cancelled' });
+    await api.connectors!.cancel(card.kind).catch(() => {}); setBusy(false); await refresh();
@@ -61,3 +96,5 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-    <p>Real accounts are off for this event. Use the invented training examples below.</p>
-    {card.connection && <p className="connector-saved" role="status">Sample data ready: {card.connection.count} items.</p>}
-    <div className="connector-actions"><button className="secondary" type="button" disabled title="Real accounts are off for this event">Connect</button>
+    {!card.available && <p>Sign-in is not set up for this source. Ask your administrator to enable it, or try sample data.</p>}
+    {card.signedIn && <p role="status">Connected. Choose what to include below.</p>}
+    {card.connection && <p className="connector-saved" role="status">{card.connection.sample ? 'Sample data ready' : 'Data ready'}: {card.connection.count} items.</p>}
+    {card.kind === 'custom-api' && <label className="connector-address">Service address or documentation link<input type="url" maxLength={2000} value={address} disabled={busy} placeholder="https://example.org/data" onChange={event => setAddress(event.target.value)}/></label>}
+    <div className="connector-actions"><button className="secondary" type="button" disabled={busy || !card.available} onClick={() => void connect()}>Connect</button>
@@ -65 +102 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-      {card.connection && <button className="text-button" type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect</button>}
+      {(card.connection || card.signedIn) && <button className="text-button" type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect</button>}
@@ -67 +104 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-    <details className="connector-choices"><summary>Choose what to include</summary>
+    <details className="connector-choices" open={choose} onToggle={event => setChoose(event.currentTarget.open)}><summary>Choose what to include</summary>
@@ -70 +107,2 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-      <p>These examples are dated today. Choose Try sample data to check your choices.</p>
+      {card.kind !== 'custom-api' && <label>Folder or calendar (optional)<input maxLength={200} disabled={busy} value={folder} onChange={event => { setFolder(event.target.value); setPreview(undefined); }}/></label>}
+      {card.signedIn ? <button className="primary" type="button" disabled={busy} onClick={() => void check('connected')}>Check data</button> : <p>Choose Connect to sign in, or Try sample data to check your choices.</p>}
@@ -72 +110,10 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-    {busy && <p role="status">Preparing your data...</p>}
+    {busy && <div className="connector-progress">
+      <p role="status">{progress.stage === 'connecting' ? 'Finish signing in in your browser, or follow the steps here.' : progress.stage === 'question' ? 'One more step to connect.' : 'Preparing your data...'}</p>
+      {progress.code && <p>Enter this code on the sign-in page: <strong>{progress.code.value}</strong><br/>Sign-in page: {progress.code.url}</p>}
+      {progress.question && <form onSubmit={event => { event.preventDefault(); void submitAnswer(); }} autoComplete="off">
+        <label>{progress.question.label}{progress.question.options ? <select required value={answer} onChange={event => setAnswer(event.target.value)}><option value="" disabled>Choose an answer</option>{progress.question.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
+          : <input required type={progress.question.secret ? 'password' : 'text'} autoComplete="off" maxLength={16000} value={answer} onChange={event => setAnswer(event.target.value)}/>}</label>
+        <button className="primary" type="submit" disabled={!answer}>Continue</button>
+      </form>}
+      <button className="secondary" type="button" onClick={() => void cancel()}>Cancel</button>
+    </div>}
@@ -75 +122 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-      <h3>Check it</h3><p>{preview.items.length} items ready. Email addresses, phone numbers and personal numbers are hidden. Senders are hidden.</p>
+      <h3>Check it</h3><p>{preview.items.length} {preview.items.length === 1 ? 'item' : 'items'} ready. Email addresses, phone numbers and personal numbers are hidden. Senders are hidden.</p>
@@ -77,2 +124,2 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-      {!!preview.limited && <p>{preview.limited} items were left out to keep the sample small.</p>}
-      <p>This goes to {model} only when you select it in a brief and start a build.</p>
+      {!!preview.limited && <p>{preview.limited} items were left out to keep the preview small.</p>}
+      <p>{preview.sample ? `This goes to ${model} only when you select it in a brief and start a build.` : 'You can save this preview on this computer. Builds for this event use sample data only.'}</p>
@@ -81 +128 @@ function SourceCard({ card, refresh, model }: { card: ConnectorCard; refresh: ()
-      <div className="connector-actions"><button className="primary" type="button" disabled={busy || !preview.items.length} onClick={() => void save()}>Use this</button><button className="secondary" type="button" disabled={busy} onClick={() => void cancel()}>Cancel</button></div>
+      <div className="connector-actions"><button className="primary" type="button" disabled={busy || !preview.items.length} onClick={() => void save()}>Use this</button>{!busy && <button className="secondary" type="button" onClick={() => void cancel()}>Cancel</button>}</div>
@@ -102 +149 @@ export function ConnectedDataSection({ value, onChange, disabled }: { value: Con
-      return <div key={source.id}><label className="connector-check"><input type="checkbox" checked={!!selected} onChange={event => onChange(event.target.checked ? [...value.filter(choice => choice.id !== source.id), { id: source.id, digest: source.digest, includeInApp: false }] : value.filter(choice => choice.id !== source.id))}/><span>{source.label} ({source.count} sample items)</span></label>
+      return <div key={source.id}><label className="connector-check"><input type="checkbox" disabled={!source.sample} checked={!!selected} onChange={event => onChange(event.target.checked ? [...value.filter(choice => choice.id !== source.id), { id: source.id, digest: source.digest, includeInApp: false }] : value.filter(choice => choice.id !== source.id))}/><span>{source.label} ({source.count} {source.sample ? 'sample items' : 'items, preview only for this event'})</span></label>
diff --git a/src/connectors.css b/src/connectors.css
index 19ca0e5..9087ca1 100644
--- a/src/connectors.css
+++ b/src/connectors.css
@@ -25,0 +26,4 @@
+.connector-progress{border:1px solid var(--line);padding:14px;margin-top:16px;border-radius:6px}
+.connector-progress form{margin:12px 0}
+.connector-progress button,.connector-choices button{margin-top:12px}
+.connector-address input,.connector-progress input,.connector-progress select,.connector-choices input,.connector-choices select{width:100%;box-sizing:border-box}
```

