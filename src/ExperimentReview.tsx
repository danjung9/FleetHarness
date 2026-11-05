import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronRight, GitCompareArrows, Play, Square, X } from 'lucide-react';
import type { Artifact, Bootstrap, FleetAPI, Project } from '../shared/types';
import type { CandidateReview, ExperimentState } from '../shared/experiments';
import type { CandidateSummary, ExperimentSummary, LearningSettings, PreferenceRecord } from '../shared/learning';
import { defaultLearningSettings } from '../shared/learning';
import { validateIntegrationOperation, type IntegrationOperation } from '../shared/integration';
import { api, isDesktop } from './api';
import { QualityEvidence } from './QualityEvidence';
import './experiments.css';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
const activeStatuses = new Set(['queued', 'planning', 'running', 'comparing', 'promoting']);
const statusLabel: Record<string, string> = { queued: 'Queued', planning: 'Planning', running: 'Building', comparing: 'Comparing evidence', review: 'Ready to compare', promoting: 'Selecting candidate', complete: 'Candidate selected', failed: 'Needs attention', stopped: 'Stopped', passed: 'Passed' };
const duration = (value?: number) => value === undefined ? 'Not recorded' : value < 60_000 ? `${Math.ceil(value / 1000)}s` : `${Math.floor(value / 60_000)}m ${Math.ceil(value % 60_000 / 1000)}s`;
const cost = (value?: number | null) => value == null ? 'Unavailable' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 3 }).format(value);
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export function ExperimentReview({ project, busy, action }: { project: Project; busy: boolean; action: Action }) {
  const [state, setState] = useState<ExperimentState>();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [experimentId, setExperimentId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [detail, setDetail] = useState<CandidateReview>();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [source, setSource] = useState<{ file: string; text: string }>();
  const [preview, setPreview] = useState('');
  const previewGeneration = useRef(0);
  const experiments = [...(state?.experiments ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const experiment = experiments.find(item => item.id === experimentId) ?? experiments[0];
  const request = experiment?.preferenceRequest;
  const candidates = experiment ? orderedCandidates(experiment) : [];
  const candidate = candidates.find(item => item.id === candidateId) ?? candidates[0];
  const candidateIndex = candidates.findIndex(item => item.id === candidate?.id);
  const candidateLabel = `Candidate ${String.fromCharCode(65 + Math.max(0, candidateIndex))}`;
  const running = !!experiment && activeStatuses.has(experiment.status);
  const finalized = candidates.length > 0 && candidates.every(item => item.status === 'passed' || item.status === 'failed');
  const hasActiveExperiment = state?.experiments.some(item => activeStatuses.has(item.status)) === true;
  const blocked = busy || pending;
  const titleId = useId();

  useEffect(() => {
    let alive = true, timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const next = await api.experimentState(project.id);
        if (alive) { setState(next); if (next.experiments.some(item => activeStatuses.has(item.status))) timer = setTimeout(() => void load(), 2500); }
      } catch (failure) { if (alive) setError(message(failure)); }
    }
    void load();
    return () => { alive = false; clearTimeout(timer); };
  }, [project.id, project.updatedAt, hasActiveExperiment]);

  useEffect(() => {
    let alive = true;
    previewGeneration.current++; setPreview(''); setDetail(undefined); setArtifacts([]); setSource(undefined);
    void api.closeCandidatePreview().catch(() => {});
    if (experiment && candidate) {
      void Promise.all([api.inspectCandidate(experiment.id, candidate.id), api.candidateArtifacts(experiment.id, candidate.id)])
        .then(([next, files]) => { if (alive) { setDetail(next); setArtifacts(files); } }, failure => { if (alive) setError(message(failure)); });
    }
    return () => { alive = false; previewGeneration.current++; void api.closeCandidatePreview().catch(() => {}); };
  }, [experiment?.id, candidate?.id, candidate?.status]);

  async function perform(work: () => Promise<unknown>, success?: string) {
    setPending(true); setError('');
    try {
      await action(async () => {
        try { await work(); setState(await api.experimentState(project.id)); }
        catch (failure) { setError(message(failure)); throw failure; }
      }, success);
    } finally { setPending(false); }
  }
  async function showPreview() {
    if (!experiment || !candidate) return;
    const generation = ++previewGeneration.current;
    setPending(true); setError(''); setPreview('');
    try {
      await api.closeCandidatePreview();
      const url = await api.previewCandidate(experiment.id, candidate.id);
      if (generation !== previewGeneration.current) return;
      if (url) setPreview(url); else setError('This candidate has no browser preview. Inspect its artifacts and test evidence below.');
    } catch (failure) { if (generation === previewGeneration.current) setError(message(failure)); }
    finally { setPending(false); }
  }
  if (!isDesktop) return null;
  if (state && !state.availability.available) return <section className="experiment-unavailable"><p>{state.availability.reason ?? 'Candidate comparisons are unavailable on this machine.'}</p></section>;
  return <section className="experiment-review" aria-labelledby={titleId} aria-busy={pending}>
    <div className="experiment-heading"><div><h2 id={titleId}>Compare approaches</h2><p>Build two candidates from the same brief and checks, then inspect the differences.</p></div>
      <button className="secondary" disabled={!state || blocked || hasActiveExperiment || project.status === 'running'} onClick={() => void perform(async () => { const started = await api.startExperiment(project.id, { mode: 'paired', requestId: crypto.randomUUID() }); setExperimentId(started.id); }, 'Candidate comparison started.')}><GitCompareArrows size={16}/>Compare 2 candidates</button></div>
    {error && <p className="experiment-error" role="alert">{error} <button className="text-button" disabled={blocked} onClick={() => void perform(async () => {})}>Refresh comparison</button></p>}
    {!state && !error && <p className="experiment-note" role="status">Loading comparison availability…</p>}
    {experiment && <>
      <div className="experiment-toolbar">
        {experiments.length > 1 && <label>Comparison<select value={experiment.id} onChange={event => { setExperimentId(event.target.value); setCandidateId(''); }} disabled={blocked}>{experiments.map((item, index) => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {statusLabel[item.status]}{index === 0 ? ' · latest' : ''}</option>)}</select></label>}
        <p className="experiment-status" role="status">{statusLabel[experiment.status] ?? experiment.status}</p>
        {running ? <button className="text-button" disabled={blocked} onClick={() => void perform(() => api.stopExperiment(experiment.id), 'Comparison stopped.')}><Square size={13}/>Stop comparison</button>
          : !finalized && ['stopped', 'failed'].includes(experiment.status) && <button className="text-button" disabled={blocked || project.status === 'running'} onClick={() => void perform(() => api.resumeExperiment(experiment.id), 'Comparison resumed.')}><Play size={13}/>Resume comparison</button>}
      </div>
      {finalized && ['stopped', 'failed'].includes(experiment.status) && <p className="experiment-note">All candidate outcomes are final. Choose Compare 2 candidates to start a new attempt.</p>}
      {candidates.length > 0 && <>
        <div className="candidate-switch" role="group" aria-label="Choose candidate to inspect">{candidates.map((item, index) => <button type="button" key={item.id} aria-pressed={candidate?.id === item.id} onClick={() => setCandidateId(item.id)}><strong>Candidate {String.fromCharCode(65 + index)}</strong><span>{statusLabel[item.status]}{experiment.selectedCandidateId === item.id ? ' · selected' : ''}</span></button>)}</div>
        <div className="candidate-comparison-table"><table><caption>Recorded outcomes for each candidate</caption><thead><tr><th scope="col">Evidence</th>{candidates.map((item, index) => <th scope="col" key={item.id}>Candidate {String.fromCharCode(65 + index)}</th>)}</tr></thead><tbody>
          <tr><th scope="row">Required checks</th>{candidates.map(item => <td key={item.id}>{item.success === true ? 'All passed' : item.status === 'queued' || item.status === 'running' ? 'Pending' : 'Not passed'}</td>)}</tr>
          <tr><th scope="row">Elapsed time</th>{candidates.map(item => <td key={item.id}>{duration(item.durationMs)}</td>)}</tr>
          <tr><th scope="row">Recorded cost</th>{candidates.map(item => <td key={item.id}>{cost(item.costUsd)}</td>)}</tr>
        </tbody></table></div>
        {candidate && <div className="candidate-inspection">
          <div className="candidate-inspection-heading"><h3>{candidateLabel}</h3><div className="experiment-actions">
            <button className="secondary" disabled={blocked || !detail || candidate.status === 'queued' || candidate.status === 'running'} onClick={() => void showPreview()}>Open candidate preview</button>
            <button className="primary" disabled={blocked || running || candidate.success !== true || !detail?.sourceHash || experiment.selectedCandidateId === candidate.id} onClick={() => void perform(() => api.selectCandidate(experiment.id, candidate.id, detail!.sourceHash!), `${candidateLabel} selected for project review.`)}>{experiment.selectedCandidateId === candidate.id ? <><Check size={14}/>Selected for review</> : <>Use {candidateLabel.replace('Candidate', 'candidate')}<ChevronRight size={14}/></>}</button>
          </div></div>
          <p className="experiment-note">Choosing a candidate makes it the project build for review. Approval and delivery remain in the review steps below.</p>
          {(candidate.error || detail?.project.error) && <p className="experiment-error">{candidate.error || detail?.project.error}</p>}
          {preview && <div className="candidate-preview"><div><span>{candidateLabel} preview</span><button className="text-button" onClick={() => { previewGeneration.current++; setPreview(''); void api.closeCandidatePreview().catch(() => {}); }}><X size={14}/>Close preview</button></div><iframe key={preview} src={preview} title={`${candidateLabel} application preview`} sandbox="allow-scripts allow-forms allow-same-origin" referrerPolicy="no-referrer"/></div>}
          <details className="candidate-evidence"><summary>Inspect {candidateLabel.replace('Candidate', 'candidate')} evidence and files</summary>
            {detail?.project.report ? <><QualityEvidence report={detail.project.report.quality}/><details><summary>Test output · {detail.project.report.passed} passed, {detail.project.report.failed} failed</summary><pre>{detail.project.report.output}</pre></details></> : <p className="experiment-note">Verification evidence appears when this candidate finishes its checks.</p>}
            {artifacts.length > 0 && <div className="candidate-artifacts"><h4>Candidate files</h4><ul>{artifacts.map(file => <li key={file.path}><button className="text-button" onClick={() => { setError(''); const generation = previewGeneration.current; void api.readCandidateArtifact(experiment.id, candidate.id, file.path).then(text => { if (generation === previewGeneration.current) setSource({ file: file.path, text }); }, failure => { if (generation === previewGeneration.current) setError(message(failure)); }); }}>{file.path}</button></li>)}</ul>{source && <div><strong>{source.file}</strong><pre>{source.text}</pre></div>}</div>}
          </details>
        </div>}
      </>}
      {request?.status === 'pending' && <PreferenceForm key={request.id} experiment={experiment} disabled={blocked || running} submit={(choice, reasonTags, note) => perform(() => api.submitExperimentPreference(experiment.id, { requestId: request.id, choice, reasonTags, note }), 'Preference saved.')} skip={() => perform(() => api.skipExperimentPreference(experiment.id, request.id), 'Feedback skipped.')}/>}
      {request && request.status !== 'pending' && <p className="experiment-note" role="status">{request.status === 'answered' ? 'Your preference is recorded.' : 'You skipped this feedback request.'} Candidate selection is separate from this feedback.</p>}
    </>}
  </section>;
}

function orderedCandidates(experiment: ExperimentSummary): CandidateSummary[] {
  const order = experiment.preferenceRequest?.presentationOrder ?? experiment.candidates.map(item => item.id);
  return [...experiment.candidates].sort((a, b) => {
    const left = order.indexOf(a.id), right = order.indexOf(b.id);
    return (left < 0 ? 100 : left) - (right < 0 ? 100 : right);
  });
}

function PreferenceForm({ experiment, disabled, submit, skip }: { experiment: ExperimentSummary; disabled: boolean; submit: (choice: PreferenceRecord['choice'], tags: string[], note: string) => Promise<void>; skip: () => Promise<void> }) {
  const [choice, setChoice] = useState<PreferenceRecord['choice']>();
  const [tags, setTags] = useState<string[]>([]), [note, setNote] = useState('');
  const group = useId(), noteId = useId();
  return <form className="experiment-preference" onSubmit={event => { event.preventDefault(); if (choice) void submit(choice, tags, note.trim()); }}>
    <fieldset disabled={disabled}><legend>Which result would you prefer?</legend><p>Your optional feedback helps future comparisons. It does not choose or approve a build.</p>
      <div className="preference-options">{([{ value: 'a', label: 'Candidate A' }, { value: 'b', label: 'Candidate B' }, { value: 'tie', label: 'About the same' }, { value: 'neither', label: 'Neither works for me' }] as const).map(item => <label key={item.value}><input type="radio" name={group} value={item.value} checked={choice === item.value} onChange={() => setChoice(item.value)}/>{item.label}</label>)}</div>
      <div className="preference-reasons" role="group" aria-label="Reasons for your preference, optional">{['Usefulness', 'Clarity', 'Ease of use', 'Speed', 'Maintainability'].map(tag => <label key={tag}><input type="checkbox" checked={tags.includes(tag)} onChange={event => setTags(current => event.target.checked ? [...current, tag] : current.filter(value => value !== tag))}/>{tag}</label>)}</div>
      <label htmlFor={noteId}>What made the difference? <span className="field-hint">Optional</span></label><textarea id={noteId} rows={2} maxLength={2000} value={note} onChange={event => setNote(event.target.value)}/>
      <div className="experiment-actions"><button className="secondary" type="submit" disabled={!choice}>Save preference</button><button className="text-button" type="button" onClick={() => void skip()}>Skip feedback</button></div>
    </fieldset>
    <p className="experiment-note">{experiment.preferenceRequest?.sampling === 'random-audit' ? 'Occasional review to check comparison quality.' : 'Your judgment can help resolve a close comparison.'}</p>
  </form>;
}

export function LearningSettingsPanel({ data, api, busy, desktop, action }: { data: Bootstrap; api: FleetAPI; busy: boolean; desktop: boolean; action: Action }) {
  const [projectId, setProjectId] = useState(data.state.projects[0]?.id ?? '');
  const [settings, setSettings] = useState<LearningSettings>({ ...defaultLearningSettings });
  const [state, setState] = useState<ExperimentState>(), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);
  const blocked = busy || pending || !desktop || !state?.availability.available;
  useEffect(() => {
    let alive = true; setState(undefined); setConfirmForget(false);
    if (desktop && projectId) void api.experimentState(projectId).then(next => { if (alive) { setState(next); setSettings(next.settings); } }, failure => { if (alive) setError(message(failure)); });
    return () => { alive = false; };
  }, [api, desktop, projectId]);
  async function perform(work: () => Promise<unknown>, success: string) {
    setPending(true); setError('');
    try { await action(async () => { try { await work(); } catch (failure) { setError(message(failure)); throw failure; } }, success); }
    finally { setPending(false); }
  }
  return <details className="learning-settings"><summary>Comparisons & learning</summary><div>
    <p>Keep evidence from alternative approaches and use occasional feedback to improve future choices.</p>
    {!desktop ? <p className="experiment-note">Open the desktop app to configure candidate comparisons.</p> : !projectId ? <p className="experiment-note">Create a project to configure learning.</p> : state && !state.availability.available && <p className="experiment-note">{state.availability.reason}</p>}
    {error && <p className="experiment-error" role="alert">{error}</p>}
    <fieldset disabled={blocked}><legend>Comparison mode</legend><div className="learning-mode-options">{([{ mode: 'off', label: 'Off', description: 'Use the standard build flow.' }, { mode: 'paired', label: 'Paired', description: 'Start with the baseline and allow occasional comparisons.' }, { mode: 'adaptive', label: 'Adaptive', description: 'Use validated lessons to choose an approach.' }] as const).map(item => <label key={item.mode}><input type="radio" name="learning-mode" checked={settings.mode === item.mode} onChange={() => setSettings(current => ({ ...current, mode: item.mode }))}/><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)}</div>
      <label className="checkbox"><input type="checkbox" checked={settings.memoryEnabled} onChange={event => setSettings(current => ({ ...current, memoryEnabled: event.target.checked }))}/>Use lessons from previous comparisons</label>
      <label className="checkbox"><input type="checkbox" checked={settings.automaticComparisons} onChange={event => setSettings(current => ({ ...current, automaticComparisons: event.target.checked }))}/>Allow occasional extra candidates</label>
      <p className="experiment-note">Automatic extra candidates are capped at 10% of runs in paired and adaptive modes. Compare 2 candidates always builds both approaches separately from this limit.</p>
      <label>Optional feedback requests per day<select value={settings.maxHumanRequestsPerDay} onChange={event => setSettings(current => ({ ...current, maxHumanRequestsPerDay: Number(event.target.value) }))}><option value={0}>None</option><option value={1}>At most 1</option><option value={2}>At most 2</option></select></label>
      <button className="secondary" type="button" onClick={() => void perform(async () => setSettings(await api.saveLearningSettings(settings)), 'Learning settings saved.')}>Save learning settings</button>
    </fieldset>
    <div className="learning-reset"><label>Project memory<select disabled={blocked} value={projectId} onChange={event => setProjectId(event.target.value)}>{data.state.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><div className="experiment-actions"><button className="text-button" type="button" disabled={blocked} onClick={() => void perform(() => api.rollbackLearningPolicy(projectId), 'Learning policy rolled back.')}>Roll back learning policy</button><button className="text-button" type="button" disabled={blocked} onClick={() => setConfirmForget(true)}>Forget project learning…</button></div>
      {confirmForget && <div className="forget-confirmation"><p>Remove this project's comparison history and learned observations? Policies derived from it will be invalidated.</p><div className="experiment-actions"><button type="button" className="secondary" disabled={blocked} onClick={() => void perform(async () => { await api.forgetProjectLearning(projectId); setConfirmForget(false); }, 'Project learning forgotten.')}>Forget learning</button><button type="button" className="text-button" onClick={() => setConfirmForget(false)}>Keep history</button></div></div>}
    </div>
    <IntegrationSettings api={api} disabled={blocked} available={state?.availability.available === true} action={action}/>
  </div></details>;
}

function IntegrationSettings({ api, disabled, available, action }: { api: FleetAPI; disabled: boolean; available: boolean; action: Action }) {
  const [operations, setOperations] = useState<IntegrationOperation[]>([]), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const [draft, setDraft] = useState({ id: '', origin: '', path: '/', method: 'POST', responseType: 'json', queryKeys: '', auth: 'bearer', headerName: 'X-Api-Key', envName: '' });
  const [secret, setSecret] = useState('');
  const field = (name: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [name]: value }));
  useEffect(() => { let alive = true; if (available) void api.integrationOperations().then(next => { if (alive) setOperations(next); }, failure => { if (alive) setError(message(failure)); }); return () => { alive = false; }; }, [api, available]);
  async function save() {
    setError('');
    let operation: IntegrationOperation;
    try { operation = validateIntegrationOperation({ id: draft.id.trim(), origin: draft.origin.trim(), path: draft.path.trim(), method: draft.method, responseType: draft.responseType,
      queryKeys: draft.queryKeys.split(',').map(value => value.trim()).filter(Boolean), ...(draft.auth === 'none' ? {} : { auth: { type: draft.auth, credentialId: operations.find(item => item.id === draft.id)?.auth?.credentialId ?? draft.id + '-credential', envName: draft.envName.trim(), ...(draft.auth === 'header-key' ? { headerName: draft.headerName.trim() } : {}) } }) }); }
    catch (failure) { setError(message(failure)); return; }
    setPending(true);
    try { await action(async () => { try { setOperations(await api.saveIntegrationOperation(operation, secret || undefined)); setSecret(''); } catch (failure) { setError(message(failure)); throw failure; } }, 'External operation saved.'); }
    finally { setPending(false); }
  }
  return <details className="integration-settings"><summary>External API operations</summary><p>Allow a fixed HTTPS endpoint for candidate applications. Credentials stay in encrypted desktop storage and are sent only to that endpoint.</p>
    {error && <p className="experiment-error" role="alert">{error}</p>}
    {operations.length > 0 && <ul className="integration-operation-list">{operations.map(operation => <li key={operation.id}><button type="button" className="text-button" disabled={disabled || pending} onClick={() => { setDraft({ id: operation.id, origin: operation.origin, path: operation.path, method: operation.method, responseType: operation.responseType, queryKeys: operation.queryKeys?.join(', ') ?? '', auth: operation.auth?.type ?? 'none', headerName: operation.auth?.headerName ?? 'X-Api-Key', envName: operation.auth?.envName ?? '' }); setSecret(''); }}>{operation.id}<small>{operation.method} {operation.origin}{operation.path}</small></button><button type="button" className="text-button" disabled={disabled || pending} aria-label={`Remove ${operation.id}`} onClick={() => void action(async () => setOperations(await api.removeIntegrationOperation(operation.id)), 'External operation removed.')}>Remove</button></li>)}</ul>}
    <fieldset disabled={disabled || pending}><legend>Configure an operation</legend>
      <div className="integration-fields"><label>Operation name<input value={draft.id} onChange={event => field('id', event.target.value)} placeholder="search_documents" maxLength={100}/></label><label>HTTPS origin<input value={draft.origin} onChange={event => field('origin', event.target.value)} placeholder="https://api.example.com" spellCheck={false}/></label><label>Fixed path<input value={draft.path} onChange={event => field('path', event.target.value)} placeholder="/v1/search" spellCheck={false}/></label><label>Method<select value={draft.method} onChange={event => field('method', event.target.value)}>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => <option key={method}>{method}</option>)}</select></label><label>Response<select value={draft.responseType} onChange={event => field('responseType', event.target.value)}><option value="json">JSON</option><option value="text">Text</option></select></label><label>Allowed query keys<input value={draft.queryKeys} onChange={event => field('queryKeys', event.target.value)} placeholder="query, limit"/></label><label>Authentication<select value={draft.auth} onChange={event => field('auth', event.target.value)}><option value="bearer">Bearer token</option><option value="header-key">Header API key</option><option value="none">None</option></select></label>
      {draft.auth !== 'none' && <>{draft.auth === 'header-key' && <label>Header name<input value={draft.headerName} onChange={event => field('headerName', event.target.value)} spellCheck={false}/></label>}<label>Environment name for exported source<input value={draft.envName} onChange={event => field('envName', event.target.value)} placeholder="SERVICE_API_KEY" spellCheck={false}/></label><label>Credential<input type="password" value={secret} onChange={event => setSecret(event.target.value)} autoComplete="new-password" spellCheck={false} placeholder="Leave blank to keep the saved credential"/></label></>}</div>
      <p className="experiment-note">Each candidate has a shared limit of 100 calls. Requests and responses are limited to 2 MB and 30 seconds. Redirects, OAuth setup and WebSockets are unsupported.</p><button type="button" className="secondary" onClick={() => void save()}>Save operation</button>
    </fieldset>
  </details>;
}
