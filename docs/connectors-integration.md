Connector integration, 2026-11-05

Resolved all seven conflict files in the working tree, preserving the incoming backend, API-key sign-in, conversation, review, resume and browser features alongside connectors. The merge index is deliberately untouched; the overseer must stage the resolved files.

Selected snapshots now join attached inputs in inputs/manifest.json with mode provided. The pipeline skips synthetic record generation, retains plain context files, the untrusted-data notice, source digests and marking/redaction checks, and checks all prepared data through the shared brief-data integrity path. Source labels, kinds, counts and digests reach the project lead without connection credentials or item bodies. Event builds still accept synthetic snapshots only.

The smoke keeps the overseer's native-check and explicit fixture encryption behavior. Its model now accepts images for visual review. It checks the shared manifest, no synthetic-data session, acceptance plan version 2, the required solution contract, passing capability evidence and review. The provider already supplied the incoming solution fixture; a new test exercises its actual local HTTP response, loads the production contract parser and runs the delivered evaluator on all four cases. Removing the app parser makes evaluation fail.

Observed checks: frontend, Electron and harness type checks passed. Connector, brief-data, conversation and smoke-contract tests passed 157/157. Both targeted pipeline cases passed, including the reported recovery/checkpoint regression and the new connector-to-provided-data flow. Script syntax checks passed. No assertion was removed or relaxed. Two old fixtures were aligned with the incoming export evidence requirement and the overseer's explicit test-encryption override; ciphertext, native storage guards and export hash assertions remain.

Not run here: the real Electron screen smoke, OS keychain check, native browser verification, native process discovery, and the full outside-sandbox suite. Chrome and ps cannot run in this sandbox. Orchestration tests replace browser/process boundaries and are not proof of those production paths. No live model or real account call was made.

Existing frontend lines changed

Only src/App.tsx and src/BriefDataInputs.tsx were edited for this integration. App.tsx is compared with the incoming combined version (merge stage 3), so the listing isolates the connector hooks from the teammate's incoming frontend work. BriefDataInputs.tsx is compared with its incoming working-tree version before this turn. Every removed, replaced and added line is reproduced below; hunk headers give exact old and new line numbers. No CSS or other frontend file was edited.

`src/App.tsx`, current changed lines: 2, 61, 70, 71, 76, 88, 89, 264, 273, 278, 283, 293, 294, 295.

```diff
--- incoming/src/App.tsx
+++ src/App.tsx
@@ -1,0 +2 @@
+import { Connectors, ConnectedDataSection } from './Connectors';
@@ -59,0 +61 @@
+  const [connectedData, setConnectedData] = useState(initial.connectedData ?? []);
@@ -68,2 +70,2 @@
-    draftChange.current?.({ title, description, inputs, outputs, criteria: criteria.split('\n'), resources, links: links.split('\n'), dataInputs, dataInputEditor, challengeId: initial.challengeId });
-  }, [title, description, inputs, outputs, criteria, resources, links, dataInputs, dataInputEditor, initial.challengeId]);
+    draftChange.current?.({ title, description, inputs, outputs, criteria: criteria.split('\n'), resources, links: links.split('\n'), dataInputs, dataInputEditor, connectedData, challengeId: initial.challengeId });
+  }, [title, description, inputs, outputs, criteria, resources, links, dataInputs, dataInputEditor, connectedData, initial.challengeId]);
@@ -74 +76 @@
-    try { input = normalizeProjectInput({ title, description, inputs, outputs, criteria: criteria.split('\n'), resources, links: links.split('\n'), dataInputs: includePastedInput(dataInputs, dataInputEditor), challengeId: initial.challengeId }); }
+    try { input = normalizeProjectInput({ title, description, inputs, outputs, criteria: criteria.split('\n'), resources, links: links.split('\n'), dataInputs: includePastedInput(dataInputs, dataInputEditor), connectedData, challengeId: initial.challengeId }); }
@@ -86 +88,2 @@
-    <BriefDataInputs value={dataInputs} onChange={setDataInputs} editor={dataInputEditor} onEditorChange={setDataInputEditor} disabled={busy} onReadingChange={reading => { readingInputsRef.current = reading; setReadingInputs(reading); onReadingChange?.(reading); }}/>
+    <BriefDataInputs value={dataInputs} onChange={setDataInputs} editor={dataInputEditor} onEditorChange={setDataInputEditor} disabled={busy} connectedCount={connectedData.length} onReadingChange={reading => { readingInputsRef.current = reading; setReadingInputs(reading); onReadingChange?.(reading); }}/>
+    <ConnectedDataSection value={connectedData} onChange={setConnectedData} disabled={busy}/>
@@ -260,0 +264 @@
+    { id: 'connectors', label: 'Connectors', shortLabel: 'Connectors', icon: Inbox },
@@ -269 +273 @@
-  const showHome = active === 'portfolio' || (!p && active !== 'settings');
+  const showHome = active === 'portfolio' || (!p && active !== 'settings' && active !== 'connectors');
@@ -274 +278 @@
-      <nav aria-label="Primary">{nav.filter(item => item.id !== 'design' || developerMode).map(item => <IconButton key={item.id} disabled={!p && item.id !== 'portfolio'} label={item.label} placement="right" className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><item.icon size={21}/><span>{item.shortLabel}</span>{item.id === 'agents' && state.projects.some(project => project.status === 'running') && <i className="live-dot"/>}</IconButton>)}</nav>
+      <nav aria-label="Primary">{nav.filter(item => item.id !== 'design' || developerMode).map(item => <IconButton key={item.id} disabled={!p && item.id !== 'portfolio' && item.id !== 'connectors'} label={item.label} placement="right" className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><item.icon size={21}/><span>{item.shortLabel}</span>{item.id === 'agents' && state.projects.some(project => project.status === 'running') && <i className="live-dot"/>}</IconButton>)}</nav>
@@ -279 +283 @@
-        {showHome || !p ? <div className="workspace-title"><img className="brand-wordmark" src={brandLogo} width={452} height={112} alt="AppYard" /><span>/ {showHome ? 'Home' : 'Settings'}</span></div> : <div className="workspace-picker"><select aria-label="Current challenge" value={p.id} onChange={e => openProject(e.target.value)}>{state.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div>}
+        {showHome || !p || active === 'connectors' ? <div className="workspace-title"><img className="brand-wordmark" src={brandLogo} width={452} height={112} alt="AppYard" /><span>/ {showHome ? 'Home' : active === 'connectors' ? 'Connectors' : 'Settings'}</span></div> : <div className="workspace-picker"><select aria-label="Current challenge" value={p.id} onChange={e => openProject(e.target.value)}>{state.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div>}
@@ -289,2 +293,3 @@
-      {p && !showHome && active !== 'settings' && <JourneyHeader project={p} view={active} busy={busy} configured={!!configured} resuming={resuming} navigate={navigate} start={() => setStart(true)} resume={() => void resumeRun()} stop={() => void action(() => api.stopRun(p.id), 'Stop requested. Current artifacts will be kept.')}/>}
-      {p && !showHome && active !== 'settings' && <ClarificationNotice project={p} onOpen={openConversation}/>}
+      {active === 'connectors' && <Connectors/>}
+      {p && !showHome && active !== 'settings' && active !== 'connectors' && <JourneyHeader project={p} view={active} busy={busy} configured={!!configured} resuming={resuming} navigate={navigate} start={() => setStart(true)} resume={() => void resumeRun()} stop={() => void action(() => api.stopRun(p.id), 'Stop requested. Current artifacts will be kept.')}/>}
+      {p && !showHome && active !== 'settings' && active !== 'connectors' && <ClarificationNotice project={p} onOpen={openConversation}/>}
```

`src/BriefDataInputs.tsx`, current changed lines: 20, 26, 99.

```diff
--- incoming/src/BriefDataInputs.tsx
+++ src/BriefDataInputs.tsx
@@ -20 +20 @@
-export function BriefDataInputs({ value, onChange, editor, onEditorChange, disabled, onReadingChange }: {
+export function BriefDataInputs({ value, onChange, editor, onEditorChange, disabled, onReadingChange, connectedCount = 0 }: {
@@ -25,0 +26 @@
+  connectedCount?: number;
@@ -98 +99 @@
-    </> : <p className="brief-data-empty">{pendingPaste ? <ClipboardPaste size={17} aria-hidden="true"/> : <Bot size={17} aria-hidden="true"/>}<span>{pendingPaste ? 'Your pasted input will be included when you save the brief.' : 'No data yet. A dedicated agent will create synthetic data for this use case when the build starts.'}</span></p>}
+    </> : <p className="brief-data-empty">{pendingPaste || connectedCount ? <ClipboardPaste size={17} aria-hidden="true"/> : <Bot size={17} aria-hidden="true"/>}<span>{pendingPaste ? 'Your pasted input will be included when you save the brief.' : connectedCount ? 'Your build will use the connected data selected below.' : 'No data yet. A dedicated agent will create synthetic data for this use case when the build starts.'}</span></p>}
```

