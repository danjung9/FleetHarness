import { Home } from './Home';
import { Mark } from './Mark';
import brandLogo from './assets/brand/logo-on-dark.svg';
import { JourneyHeader, milestoneViews } from './JourneyHeader';
import { getJourneyState } from '../shared/journey';
import { BuildFlow } from './BuildFlow';
import { SystemDesign } from './SystemDesign';
import { ReviewWorkspace, DeliveryWorkspace } from './ReviewFlow';
import { ModelSettings } from './ModelSettings';
import { ModelSelector } from './ModelSelector';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, Archive, ArrowRight, Bot, Check, CheckCircle2, CircleDot,
  Code2, FileCode2, FolderOpen, GitBranch, Inbox, LayoutDashboard,
  Play, Plus, RefreshCw, Search, Settings2, ShieldCheck, TerminalSquare, X, XCircle, Info, FlaskConical
} from 'lucide-react';
import type { AppState, Artifact, Bootstrap, NewProject, Project, StageId, View } from '../shared/types';
import { starters } from '../shared/types';
import { normalizeProjectInput } from '../shared/project-input';
import { api, isDesktop } from './api';
import { IconButton } from './IconButton';
import { ActivityFeed } from './ActivityFeed';
import { buildActivity, stageNames } from '../shared/activity';
import { bundledNorfolkCatalog, toProjectInput } from '../harness/catalog';
import type { NorfolkCatalog } from '../harness/norfolk';

type Action = (work: () => Promise<unknown>, success?: string) => Promise<boolean>;
const labels: Record<string, string> = { draft: 'Brief saved', running: 'Building', stopped: 'Stopped', failed: 'Needs attention', review: 'Needs review', approved: 'Approved', delivered: 'Delivered', queued: 'Queued', complete: 'Complete', active: 'In progress' };
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
function Glyph({ status }: { status: string }) {
  return status === 'complete' || status === 'approved' || status === 'delivered' ? <Check size={15}/> : status === 'active' || status === 'running' ? <Activity size={15}/> : status === 'failed' ? <XCircle size={15}/> : status === 'review' ? <ShieldCheck size={15}/> : <CircleDot size={15}/>;
}
function Badge({ status, label }: { status: string; label?: string }) { return <span className={'badge ' + status}><Glyph status={status}/>{label || labels[status] || status}</span>; }
function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-symbol">{icon}</div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
function Modal({ title, close, children, wide = false, className = '' }: { title: string; close: () => void; children: ReactNode; wide?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} aria-labelledby={headingId} className={'dialog ' + (wide ? 'wide ' : '') + className} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === ref.current) close(); }}>
    <div className="dialog-inner"><div className="dialog-heading"><h2 id={headingId}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={18}/></button></div>{children}</div>
  </dialog>;
}
function RequirementsForm({ initial, submit, busy, submitLabel, onDraftChange }: { initial: NewProject; submit: (p: NewProject) => Promise<void>; busy: boolean; submitLabel: string; onDraftChange?: (draft: NewProject) => void }) {
  const [title, setTitle] = useState(initial.title), [description, setDescription] = useState(initial.description), [criteria, setCriteria] = useState(initial.criteria.join('\n'));
  const [resources, setResources] = useState(initial.resources ?? ''), [links, setLinks] = useState((initial.links ?? []).join('\n'));
  const [error, setError] = useState('');
  const [contextOpen, setContextOpen] = useState(false);
  const draftChange = useRef(onDraftChange); draftChange.current = onDraftChange;
  useEffect(() => {
    draftChange.current?.({ title, description, criteria: criteria.split('\n'), resources, links: links.split('\n'), challengeId: initial.challengeId });
  }, [title, description, criteria, resources, links, initial.challengeId]);
  async function save(e: FormEvent) {
    e.preventDefault(); setError('');
    let input: NewProject;
    try { input = normalizeProjectInput({ title, description, criteria: criteria.split('\n'), resources, links: links.split('\n'), challengeId: initial.challengeId }); }
    catch (error) { setContextOpen(true); setError(error instanceof Error ? error.message : String(error)); return; }
    await submit(input);
  }
  return <form className="requirements-form" onSubmit={save}>
    <div className="requirements-fields">
    <label>Challenge title<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Maintenance record reconciliation"/></label>
    <label>Problem statement<textarea required minLength={20} maxLength={16000} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Who is affected? What happens today? What outcome would count as success?"/></label>
    <label>Evaluation criteria (optional)<span className="field-hint">One measurable outcome per line. You can refine this during planning.</span><textarea rows={2} value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="Every extracted item links to an exact source excerpt."/></label>
    <details className="brief-context" open={contextOpen} onToggle={e => setContextOpen(e.currentTarget.open)}><summary>Add resources & links <span>{resources.trim() || links.trim() ? 'Context included' : 'Optional'}</span></summary>
    <label>Resources (optional)<span className="field-hint">Describe available datasets, documents, tools, or reference material.</span><textarea maxLength={16000} rows={3} value={resources} onChange={e => setResources(e.target.value)} placeholder="Synthetic sample messages, a blank report template, or an existing API."/></label>
    <label>Links (optional)<span className="field-hint">Add one complete http:// or https:// URL per line.</span><textarea rows={3} value={links} onChange={e => setLinks(e.target.value)} placeholder="https://example.com/reference" spellCheck={false}/></label>
    </details>
    </div>
    <div className="requirements-footer">
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><span className="small-note">Saved locally. Build when ready.</span><button className="primary" disabled={busy} type="submit"><Check size={16}/>{submitLabel}</button></div>
    </div>
  </form>;
}
function Intake({ close, action, created, busy, initialCatalogId, catalog }: { catalog: NorfolkCatalog; initialCatalogId: string; close: () => void; action: Action; created: (project: Project) => void; busy: boolean }) {
  const challenges = catalog.challenges;
  const availableInitialId = challenges.some(c => c.id === initialCatalogId) ? initialCatalogId : '';
  const [template, setTemplate] = useState(initialCatalogId ? -2 : -1);
  const [catalogId, setCatalogId] = useState(availableInitialId);
  const [catalogInput, setCatalogInput] = useState(() => availableInitialId ? toProjectInput(availableInitialId, challenges) : undefined);
  const drafts = useRef<Record<string, NewProject>>({});
  const draftKey = template === -2 ? `catalog:${catalogId}` : `custom:${template}`;
  const [catalogExpanded, setCatalogExpanded] = useState(!availableInitialId);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false), [refreshError, setRefreshError] = useState('');
  async function refresh() {
    setRefreshing(true); setRefreshError('');
    try { await api.refreshNorfolkCatalog(); }
    catch { setRefreshError('Could not refresh Norfolk. Your saved catalog is still available. Try again when connected.'); }
    finally { setRefreshing(false); }
  }
  const matches = challenges.filter(c => (c.id + ' ' + c.title + ' ' + c.category).toLowerCase().includes(catalogQuery.toLowerCase()));
  return <Modal title="New challenge" close={close} wide className="intake-dialog">
    <div className="template-picker" role="group" aria-label="Challenge source"><button aria-pressed={template === -2} className={template === -2 ? 'selected' : ''} onClick={() => { setTemplate(-2); setCatalogExpanded(true); }}>Norfolk catalog · {challenges.length}</button><button aria-pressed={template !== -2} className={template !== -2 ? 'selected' : ''} onClick={() => setTemplate(-1)}>Custom problem</button></div>
    {template !== -2 && <details className="starter-choices"><summary>Use a starter brief</summary><div className="template-picker" role="group" aria-label="Starter brief">{starters.map((p, i) => <button key={p.title} aria-pressed={template === i} className={template === i ? 'selected' : ''} onClick={() => setTemplate(i)}>{['Message parsing', 'Scheduling', 'Offline workflow'][i]}</button>)}</div></details>}
    {template === -2 && catalogExpanded && <><div className="intake-source"><span role="status">{refreshing ? 'Refreshing Norfolk challenges…' : `Norfolk source saved ${date(catalog.fetchedAt)}`}</span><button className="text-button" disabled={refreshing || !isDesktop} title={isDesktop ? undefined : 'Refresh is available in the desktop app.'} onClick={() => void refresh()}><RefreshCw size={14}/>Refresh from Norfolk</button></div>{refreshError && <p className="form-error" role="alert">{refreshError}</p>}</>}
    {template === -2 && (catalogExpanded ? <div className="catalog-picker"><label>Find a published challenge<input value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)} placeholder="Search title, category, or challenge ID"/></label><p className="catalog-count" role="status">{matches.length} of {challenges.length} challenges</p><div className="catalog-results">{matches.map(c => <button aria-pressed={catalogId === c.id} className={catalogId === c.id ? 'selected' : ''} key={c.id} disabled={refreshing} onClick={() => { setCatalogId(c.id); setCatalogInput(toProjectInput(c.id, challenges)); setCatalogExpanded(false); }}><span className="catalog-id">#{c.id}</span><span>{c.title}<small>{c.category || 'Uncategorized'} · {c.recipe}</small></span>{catalogId === c.id && <Check size={16}/>}</button>)}{!matches.length && <div className="catalog-empty"><p>No challenges match “{catalogQuery}”.</p><button className="text-button" onClick={() => setCatalogQuery('')}>Clear search</button></div>}</div></div> : <div className="intake-source"><span>Starting from Norfolk challenge #{catalogId}</span><button className="text-button" onClick={() => setCatalogExpanded(true)}>Change challenge</button></div>)}
    {(template !== -2 || catalogInput) && <div className="intake-form" hidden={template === -2 && catalogExpanded}><RequirementsForm key={draftKey} initial={drafts.current[draftKey] ?? (template === -2 ? catalogInput! : template < 0 ? { title: '', description: '', criteria: [] } : starters[template])} onDraftChange={draft => { drafts.current[draftKey] = draft; }} busy={busy} submitLabel="Save challenge" submit={async input => {
      await action(async () => { const p = await api.createProject(input); close(); created(p); }, 'Challenge saved.');
    }}/></div>}
  </Modal>;
}
function Development({ project, action, onBuild }: { project: Project; action: Action; onBuild: () => void }) {
  const [preview, setPreview] = useState<string | null>(null), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true);
  useEffect(() => {
    let current = true; setLoading(true);
    api.preview(project.id).then(value => { if (current) setPreview(value); }).catch(() => { if (current) setPreview(null); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [project.id, project.runId, project.status, revision]);
  return <div className="development"><section className="preview-panel">
    <div className="preview-toolbar"><h2>App preview</h2><div className="preview-actions">
      <button className="text-button" onClick={onBuild}>Back to build <ArrowRight size={14}/></button>
      <IconButton label="Open source folder" disabled={!project.workspace} onClick={() => void action(() => api.openWorkspace(project.id))}><FolderOpen size={18}/></IconButton>
      <IconButton label="Reload preview" onClick={() => setRevision(r => r + 1)}><RefreshCw size={17}/></IconButton>
    </div></div>
    {loading ? <div className="preview-placeholder"><p className="muted" role="status">Opening the latest preview…</p></div> : preview ? <iframe key={revision} title="Generated application preview" sandbox="allow-scripts allow-same-origin allow-downloads allow-forms" src={preview}/> : <div className="preview-placeholder"><Empty icon={<Code2 size={32}/>} title="Your app will appear here" action={<button className="secondary" onClick={onBuild}>Back to build <ArrowRight size={15}/></button>}>{project.status === 'running' ? 'AppYard is working automatically. Follow the build while your preview is prepared.' : 'Start a build from your brief to try the app here.'}</Empty></div>}
    <div className="preview-footer"><ShieldCheck size={13}/> Isolated preview · synthetic data</div>
  </section></div>;
}
function Artifacts({ project, action, requested }: { project: Project; action: Action; requested: string }) {
  const [files, setFiles] = useState<Artifact[]>([]), [selected, setSelected] = useState(''), [content, setContent] = useState('');
  const consumedRequest = useRef('');
  useEffect(() => { let current = true; void action(async () => { const f = await api.artifacts(project.id); if (current) setFiles(f); }); return () => { current = false; }; }, [project.id, project.runId, project.status]);
  useEffect(() => {
    if (!requested) { consumedRequest.current = ''; return; }
    if (consumedRequest.current === requested || !files.some(file => file.path === requested)) return;
    consumedRequest.current = requested; setSelected(requested);
  }, [requested, files]);
  useEffect(() => {
    if (!selected) return;
    let current = true; setContent('Loading…');
    void action(async () => { const value = await api.readArtifact(project.id, selected); if (current) setContent(value); });
    return () => { current = false; };
  }, [project.id, project.runId, selected]);
  return <div className="page artifact-page"><div className="page-heading"><div><h1>Files</h1></div><button className="secondary" disabled={!project.workspace} onClick={() => void action(() => api.openWorkspace(project.id))}><FolderOpen size={16}/> Open folder</button></div>
    {!files.length ? <Empty icon={<Archive size={30}/>} title="No generated artifacts">Files appear after the first build.</Empty> : <div className="artifact-browser"><div className="file-list">{files.map(f => <button key={f.path} className={selected === f.path ? 'selected' : ''} onClick={() => setSelected(f.path)}><FileCode2 size={15}/><span>{f.path}</span><small>{Math.ceil(f.size / 1024)} KB</small></button>)}</div><div className="file-content"><h3>{selected || 'Select a file'}</h3><pre>{selected ? content || 'This file is empty.' : 'Choose an artifact to inspect its saved contents.'}</pre></div></div>}
  </div>;
}
function AgentSessions({ project }: { project: Project }) {
  const [filter, setFilter] = useState<StageId | 'all'>('all');
  const [kind, setKind] = useState<'all' | 'message' | 'tool' | 'error'>('all');
  const all = buildActivity(project.logs, project.status, project.stages.find(s => s.status === 'active')?.id);
  const staged = all.filter(item => filter === 'all' || item.stage === filter);
  const isIssue = (item: typeof all[number]) => item.kind === 'error' || item.status === 'failed' || item.status === 'interrupted';
  const items = staged.filter(item => kind === 'all' || (kind === 'error' ? isIssue(item) : item.kind === kind));
  const completed = staged.filter(item => item.kind === 'tool' && item.status === 'complete').length;
  const filters = [{ id: 'all', label: 'All activity', count: staged.length }, { id: 'message', label: 'Messages', count: staged.filter(item => item.kind === 'message').length }, { id: 'tool', label: 'Tools', count: staged.filter(item => item.kind === 'tool').length }, { id: 'error', label: 'Issues', count: staged.filter(isIssue).length }] as const;
  return <div className="page agents-page"><div className="page-heading"><div><h1>Activity</h1><p>Follow the work, inspect results, and see what needs attention.</p></div></div>
    <div className="agent-roles" aria-label="Filter by agent">{(['intake', 'research', 'plan', 'build', 'verify'] as StageId[]).map(id => { const stage = project.stages.find(s => s.id === id)!; const Icon = id === 'intake' ? Inbox : id === 'research' ? Search : id === 'plan' ? GitBranch : id === 'build' ? Code2 : FlaskConical; return <button key={id} onClick={() => { setFilter(filter === id ? 'all' : id); }} aria-pressed={filter === id} className={filter === id ? 'selected' : ''}><Icon size={21}/><div><h2>{stageNames[id]} agent</h2><p>{stage.detail}</p></div><Badge status={stage.status}/></button>; })}</div>
    <div className="activity-toolbar"><div className="activity-toolbar-heading"><h2>{filter === 'all' ? 'Run activity' : stageNames[filter] + ' activity'}</h2><span className="activity-count">{completed} tool{completed === 1 ? '' : 's'} completed</span></div><label className="activity-stage-filter">Stage<select aria-label="Filter activity by stage" value={filter} onChange={e => setFilter(e.target.value as StageId | 'all')}><option value="all">All stages</option>{project.stages.map(stage => <option key={stage.id} value={stage.id}>{stageNames[stage.id]}</option>)}</select></label>
      <div className="activity-filters" aria-label="Filter activity type">{filters.map(option => <button key={option.id} type="button" aria-label={`${option.label} ${option.count}`} aria-pressed={kind === option.id} onClick={() => setKind(option.id)}>{option.label}<span>{option.count}</span></button>)}</div>
    </div>
    <div className="transcript"><ActivityFeed key={filter + kind} items={items} live={project.status === 'running'} emptyTitle={kind === 'error' ? 'No issues recorded' : staged.length ? 'No matching activity' : 'No activity yet'} emptyDescription={kind === 'error' ? 'Failed actions and interrupted tools will appear here.' : staged.length ? 'Choose another activity type to see more of this run.' : filter === 'all' ? 'Start a build to follow your agents here, from the first plan to the final checks.' : 'Updates will appear here when this stage begins.'}/></div>
  </div>;
}
function Settings({ data, action, updated, busy, onBack, onSaved }: { data: Bootstrap; action: Action; updated: (b: Bootstrap) => void; busy: boolean; onBack?: () => void; onSaved: (b: Bootstrap) => void }) {
  const developerMode = data.state.settings.developerMode === true;
  const { backend, provider, model, rememberKey } = data.state.settings;
  return <div className="page settings-page"><div className="page-heading"><div><h1>Settings</h1></div><div>{onBack && <button className="secondary" onClick={onBack}>Back to challenge <ArrowRight size={14}/></button>}</div></div>
    <section className="developer-mode-setting" aria-labelledby="developer-mode-label">
      <div><h2 id="developer-mode-label">Developer mode</h2><p id="developer-mode-description">Show system design in navigation and while building.</p></div>
      <label className="settings-switch"><input type="checkbox" role="switch" aria-labelledby="developer-mode-label" aria-describedby="developer-mode-description" checked={developerMode} disabled={busy} onChange={event => {
        const enabled = event.target.checked;
        void action(async () => updated(await api.setDeveloperMode(enabled)), enabled ? 'Developer mode enabled.' : 'Developer mode disabled.');
      }}/><span aria-hidden="true">{developerMode ? 'On' : 'Off'}</span></label>
    </section>
    <div className="settings-grid"><section><h2>Model & credentials</h2><p className="muted">Connect ChatGPT or choose a Pi provider.</p>
      <ModelSettings key={JSON.stringify([backend, provider, model, rememberKey])} data={data} api={api} busy={busy} action={action} updated={updated} desktop={isDesktop} onSaved={onSaved}/>
    </section><aside><details className="inline-details"><summary>How builds work</summary><ol className="settings-steps"><li><strong>Plan the work</strong><p>Your selected engine reads your brief and creates research and implementation plans.</p></li><li><strong>Build & verify</strong><p>The agent writes the app and tests. AppYard executes tests and sends failures back for one repair attempt.</p></li><li><strong>Review & deliver</strong><p>You inspect the live preview, verify coverage, and export source with evidence.</p></li></ol></details>
      <div className="readiness-note"><TerminalSquare size={20}/><p>Agents can read and write files and execute shell commands on this Mac. AppYard independently runs the generated tests locally. Codex uses your ChatGPT allowance; Pi uses your configured provider account.</p></div>
      <h3 className="section-label">Workspace storage</h3><p className="path-note">{data.storagePath}</p><p className="small-note">Credentials stay in the desktop backend. The interface shows your account, models, and usage status.</p>
    </aside></div>
  </div>;
}
export default function App() {
  const [data, setData] = useState<Bootstrap | null>(null), [state, setState] = useState<AppState | null>(null);
  const [selectedView, setActive] = useState<View>('portfolio'), [current, setCurrent] = useState('');
  const developerMode = state?.settings.developerMode === true;
  const active = selectedView === 'design' && !developerMode ? 'factory' : selectedView;
  const [requestedArtifact, setRequestedArtifact] = useState('');
  const settingsReturn = useRef<View | null>(null);
  const [intakeCatalogId, setIntakeCatalogId] = useState('');
  const [intake, setIntake] = useState(false), [search, setSearch] = useState(false), [start, setStart] = useState(false);
  const [query, setQuery] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => { api.bootstrap().then(b => { setData(b); setState(b.state); setCurrent(b.state.projects[0]?.id || ''); }).catch(e => setError(String(e))); return api.onState(setState); }, []);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(v => !v); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(timer); }, [message]);
  useEffect(() => {
    if (!developerMode) {
      setActive(view => view === 'design' ? 'factory' : view);
      if (settingsReturn.current === 'design') settingsReturn.current = 'factory';
    }
  }, [developerMode]);
  const action: Action = async (work, success) => {
    setBusy(true); setError('');
    try { await work(); if (success) setMessage(success); return true; }
    catch (e) { setError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': Error: /, '')); return false; }
    finally { setBusy(false); }
  };
  const p = state?.projects.find(p => p.id === current) || state?.projects[0];
  const configured = data?.models.some(m => m.id === state?.settings.model && m.provider === state?.settings.provider && m.configured && (m.backend ?? 'pi') === (state?.settings.backend ?? 'pi'));
  function navigate(view: View) {
    if (view === 'settings' && active !== 'settings') settingsReturn.current = active === 'portfolio' ? null : active;
    if (view === 'artifacts') setRequestedArtifact('');
    setActive(view === 'design' && !developerMode ? 'factory' : view);
  }
  function updateBootstrap(value: Bootstrap) {
    setData(value); setState(value.state);
  }
  function settingsSaved(value: Bootstrap) {
    const ready = value.models.some(model => model.id === value.state.settings.model && model.provider === value.state.settings.provider && model.configured && (model.backend ?? 'pi') === (value.state.settings.backend ?? 'pi'));
    if (active === 'settings' && ready && settingsReturn.current) {
      setActive(settingsReturn.current); settingsReturn.current = null;
    }
  }
  function createChallenge(challengeId = '') { setIntakeCatalogId(challengeId); setIntake(true); }
  function openProject(id: string) {
    const project = state?.projects.find(item => item.id === id);
    setCurrent(id); setRequestedArtifact('');
    setActive(project ? milestoneViews[getJourneyState(project).current] : 'requirements'); setSearch(false);
  }
  const nav: { id: View; label: string; shortLabel: string; icon: typeof Bot }[] = [
    { id: 'portfolio', label: 'Home — challenge portfolio', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'design', label: 'System design — application architecture', shortLabel: 'Design', icon: GitBranch },
    { id: 'workspace', label: 'Preview — generated app', shortLabel: 'Preview', icon: Code2 },
    { id: 'agents', label: 'Activity — agent work', shortLabel: 'Activity', icon: Activity },
    { id: 'artifacts', label: 'Files — artifacts', shortLabel: 'Files', icon: Archive }
  ];
  const results = useMemo(() => state?.projects.filter(p => (p.title + ' ' + p.description).toLowerCase().includes(query.toLowerCase())) || [], [state, query]);
  if (!state || !data) return <div className="loading-screen"><div className="mark"><Mark/></div><h1>AppYard</h1><p>{error || 'Opening your local workspace…'}</p>{error && <button className="secondary" onClick={() => location.reload()}>Retry</button>}</div>;
  const showHome = active === 'portfolio' || (!p && active !== 'settings');
  const journey = p ? getJourneyState(p) : null;
  return <div className="app-shell">
    {error && <div className="error-banner" role="alert"><XCircle size={17}/><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
    <aside className="rail"><div className="window-drag"/><div className="brand" aria-label="AppYard" title="AppYard"><div className="mark"><Mark/></div></div>
      <nav aria-label="Primary">{nav.filter(item => item.id !== 'design' || developerMode).map(item => <IconButton key={item.id} disabled={!p && item.id !== 'portfolio'} label={item.label} placement="right" className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><item.icon size={21}/><span>{item.shortLabel}</span>{item.id === 'agents' && state.projects.some(project => project.status === 'running') && <i className="live-dot"/>}</IconButton>)}</nav>
      <div className="rail-bottom"><IconButton label="Settings" title={configured ? 'Model connected' : 'Connect a model in settings'} placement="right" className={'settings-link ' + (active === 'settings' ? 'active' : '')} aria-current={active === 'settings' ? 'page' : undefined} onClick={() => navigate('settings')}><Settings2 size={21}/><span>Settings</span><i className={'health-dot ' + (configured ? 'connected' : '')} aria-hidden="true"/></IconButton></div>
    </aside>
    <main className="workspace">
      <header className="topbar">
        {showHome || !p ? <div className="workspace-title"><img className="brand-wordmark" src={brandLogo} width={452} height={112} alt="AppYard" /><span>/ {showHome ? 'Home' : 'Settings'}</span></div> : <div className="workspace-picker"><select aria-label="Current challenge" value={p.id} onChange={e => openProject(e.target.value)}>{state.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div>}
        <div className="top-actions">
          {!isDesktop && <span className="preview-mode" title="Use the desktop app to run agents">Browser preview</span>}
          <ModelSelector data={{ ...data, state }} api={api} busy={busy} action={action} updated={updateBootstrap} desktop={isDesktop} openSettings={() => navigate('settings')}/>
          <IconButton label="Find challenge (⌘K)" onClick={() => { setQuery(''); setSearch(true); }}><Search size={18}/></IconButton>
          {showHome ? <button className="primary" onClick={() => createChallenge()}><Plus size={16}/>New challenge</button> : <IconButton label="New challenge" onClick={() => createChallenge()}><Plus size={20}/></IconButton>}
        </div>
      </header>
      {showHome && <Home projects={state.projects} open={openProject} create={createChallenge}/>}
      {p && !showHome && active !== 'settings' && <JourneyHeader project={p} view={active} busy={busy} configured={!!configured} navigate={navigate} start={() => setStart(true)} stop={() => void action(() => api.stopRun(p.id), 'Stop requested. Current artifacts will be kept.')}/>}
      {p && journey?.stale && ['workspace', 'artifacts'].includes(active) && <div className="previous-build-note"><Info size={16}/>Previous build — these files do not reflect your updated brief.</div>}
      {p && active === 'factory' && <BuildFlow key={p.id + (p.runId || '')} project={p} developerMode={developerMode} onPreview={() => navigate('workspace')} onReview={() => navigate('evidence')} onEditBrief={() => navigate('requirements')} onArtifact={file => { setRequestedArtifact(file); setActive('artifacts'); }}/>}
      {p && developerMode && active === 'design' && <div className="design-workspace"><SystemDesign key={p.id + (p.runId || '')} project={p}/></div>}
      {p && active === 'workspace' && <Development key={p.id} project={p} action={action} onBuild={() => navigate('factory')}/>}
      {p && active === 'agents' && <AgentSessions key={p.id} project={p}/>}
      {p && active === 'evidence' && <ReviewWorkspace key={p.id + (p.runId || '')} project={p} busy={busy} action={action} onPreview={() => navigate('workspace')} onApproved={() => navigate('delivery')}/>}
      {p && active === 'delivery' && <DeliveryWorkspace project={p} busy={busy} action={action} onReview={() => navigate('evidence')}/>}
      {p && active === 'artifacts' && <Artifacts key={p.id} project={p} action={action} requested={requestedArtifact}/>}
      {p && active === 'requirements' && <div className="page requirements-page"><div className="page-heading"><div><h1>Brief</h1><p>{p.runId ? 'Saving changes resets test results and approval. A new build starts fresh.' : 'Describe the problem and what a successful app should do.'}</p></div></div><RequirementsForm key={p.id} initial={p} busy={busy || p.status === 'running'} submitLabel={!isDesktop ? 'Save brief' : !configured ? 'Save & connect model' : p.runId ? 'Save & start new build' : 'Save & start build'} submit={async input => {
        const saved = await action(() => api.updateProject(p.id, input), 'Brief saved.');
        if (!saved) return;
        setActive('factory');
        if (isDesktop && configured) setStart(true);
        else if (isDesktop) { settingsReturn.current = 'factory'; setActive('settings'); }
      }}/></div>}
      {active === 'settings' && <Settings data={{ ...data, state }} action={action} updated={updateBootstrap} busy={busy} onSaved={settingsSaved} onBack={p ? () => { setActive(settingsReturn.current ?? milestoneViews[getJourneyState(p).current]); settingsReturn.current = null; } : undefined}/>}
    </main>
    {message && <div className="toast" role="status"><CheckCircle2 size={17}/>{message}</div>}
    {intake && <Intake catalog={state.norfolkCatalog ?? bundledNorfolkCatalog} initialCatalogId={intakeCatalogId} close={() => setIntake(false)} action={action} created={project => { setState(previous => previous ? { ...previous, projects: [project, ...previous.projects.filter(p => p.id !== project.id)] } : previous); setCurrent(project.id); setRequestedArtifact(''); setActive('factory'); }} busy={busy}/>}
    {search && <Modal title="Find a challenge" close={() => setSearch(false)}><label className="search-field"><Search size={18}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search saved challenges"/></label><div className="search-results">{results.map(project => <button key={project.id} onClick={() => openProject(project.id)}><span>{project.title}<small>{labels[project.status]}</small></span><ArrowRight size={16}/></button>)}{!results.length && <p className="muted">No matching challenges.</p>}</div></Modal>}
    {start && p && <Modal title="Start build" close={() => setStart(false)}><p className="muted">{state.settings.backend === 'codex' ? 'Codex' : 'Pi'} will research, plan, build, and test <strong>{p.title}</strong> automatically using <strong>{state.settings.provider}/{state.settings.model}</strong>. You review the result before delivery.</p><div className="run-disclosure"><TerminalSquare size={20}/><p>The agents can edit files and execute shell commands on this Mac. {state.settings.backend === 'codex' ? 'Codex runs with workspace write access and external command network access disabled. AppYard independently executes generated tests locally.' : 'They work in a new project folder, which is not an OS sandbox.'} {state.settings.backend === 'codex' ? 'OpenAI receives the brief and tool context. This build uses your ChatGPT plan’s Codex allowance and is subject to its limits.' : 'Your configured model provider receives the brief and tool context; provider usage charges may apply.'}</p></div><p className="small-note">Prior run folders are preserved. This starts fresh from the current brief.</p><div className="dialog-actions"><button className="secondary" onClick={() => setStart(false)}>Cancel</button><button className="primary" disabled={busy} onClick={() => void action(async () => { await api.startRun(p.id); setStart(false); setActive('factory'); }, 'Build started.')}><Play size={16}/>Start automatic build</button></div></Modal>}
  </div>;
}
