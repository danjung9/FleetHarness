import './builder.css';
import { workerURL } from './worker-api';
import { Home } from './Home';
import { NewChat } from './NewChat';
import { DataStorage } from './DataStorage';
import { Mark } from './Mark';
import brandLogo from './assets/brand/logo-on-dark.svg';
import { ReviewWorkspace, DeliveryWorkspace } from './ReviewFlow';
import { ModelSettings } from './ModelSettings';
import { ModelSelector } from './ModelSelector';
import { ProjectConversation } from './ProjectConversation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Activity, Archive, Inbox, GitBranch, FlaskConical, ArrowRight, Check, CheckCircle2, CircleDot,
  Code2, FileCode2, FolderOpen, LayoutDashboard,
  Play, Plus, RefreshCw, Search, Settings2, ShieldCheck, Square, TerminalSquare, X, XCircle
} from 'lucide-react';
import type { AppState, Artifact, Bootstrap, Project, StageId, View } from '../shared/types';
import { api, isDesktop } from './api';
import { IconButton } from './IconButton';
import { ActivityFeed } from './ActivityFeed';
import { getResumeStage, getJourneyState } from '../shared/journey';
import { buildActivity, stageNames } from '../shared/activity';

type Action = (work: () => Promise<unknown>, success?: string) => Promise<boolean>;
const labels: Record<string, string> = { draft: 'Ready to build', running: 'Building', stopped: 'Stopped', failed: 'Needs attention', review: 'Needs review', approved: 'Approved', delivered: 'Delivered', queued: 'Queued', complete: 'Complete', active: 'In progress' };
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
function Development({ project, action }: { project: Project; action: Action }) {
  const [preview, setPreview] = useState<string | null>(null), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true);
  const [previewFailed, setPreviewFailed] = useState(false);
  const completed = ['review', 'approved', 'delivered'].includes(project.status);
  useEffect(() => {
    let current = true; setLoading(true); setPreviewFailed(false);
    api.preview(project.id).then(value => { if (current) setPreview(value); }).catch(() => { if (current) { setPreview(null); setPreviewFailed(true); } }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [project.id, project.runId, project.status, revision]);
  useEffect(() => { if (project.status !== 'running' || preview) return; const timer = setInterval(() => setRevision(value => value + 1), 10000); return () => clearInterval(timer); }, [project.status, preview]);
  return <div className="development"><section className="preview-panel">
    <div className="preview-toolbar"><h2>App preview</h2><div className="preview-actions">
      <IconButton label="Open source folder" disabled={!project.workspace} onClick={() => void action(() => api.openWorkspace(project.id))}><FolderOpen size={18}/></IconButton>
      <IconButton label="Reload preview" onClick={() => setRevision(r => r + 1)}><RefreshCw size={17}/></IconButton>
    </div></div>
    {loading ? <div className="preview-placeholder"><p className="muted" role="status">Opening the latest preview…</p></div> : preview ? <iframe key={revision} title="Generated application preview" src={preview}/> : project.runtimeProfile !== 'cli' && (completed || (previewFailed && project.status !== 'running')) ? <div className="preview-placeholder"><Empty icon={<Code2 size={32}/>} title="Preview unavailable" action={<><button className="secondary" onClick={() => setRevision(r => r + 1)}>Retry preview</button></>}>Could not open the preview. Your build and its evidence are kept.</Empty></div> : <div className="preview-placeholder"><Empty icon={<Code2 size={32}/>} title={project.runtimeProfile === 'cli' ? 'Command-line solution' : 'Your app will appear here'}>{project.runtimeProfile === 'cli' ? 'This solution runs from the command line. Review its capability evidence and open the workspace for startup instructions.' : project.status === 'running' ? 'Your app is building. You can keep chatting while the preview is prepared.' : 'Describe your app in the chat, then choose Build to start.'}</Empty></div>}
  </section></div>;
}
function Artifacts({ project, action, requested, onManage }: { project: Project; action: Action; requested: string; onManage: () => void }) {
  const [files, setFiles] = useState<Artifact[]>([]), [selected, setSelected] = useState(''), [content, setContent] = useState('');
  const [readError, setReadError] = useState(false), [readAttempt, setReadAttempt] = useState(0);
  const consumedRequest = useRef('');
  useEffect(() => { let current = true; void action(async () => { const f = await api.artifacts(project.id); if (current) setFiles(f); }); return () => { current = false; }; }, [project.id, project.runId, project.status]);
  useEffect(() => {
    if (!requested) { consumedRequest.current = ''; return; }
    if (consumedRequest.current === requested || !files.some(file => file.path === requested)) return;
    consumedRequest.current = requested; setSelected(requested);
  }, [requested, files]);
  useEffect(() => {
    if (!selected) return;
    let current = true; setContent('Loading…'); setReadError(false);
    void action(async () => {
      try { const value = await api.readArtifact(project.id, selected); if (current) setContent(value); }
      catch (error) { if (current) setReadError(true); throw error; }
    });
    return () => { current = false; };
  }, [project.id, project.runId, selected, readAttempt]);
  return <div className="page artifact-page"><div className="page-heading"><div><h1>Files</h1><button className="text-button" onClick={onManage}>Manage all builds & storage <ArrowRight size={14}/></button></div><button className="secondary" disabled={!project.workspace} onClick={() => void action(() => api.openWorkspace(project.id))}><FolderOpen size={16}/> Open folder</button></div>
    {!files.length ? <Empty icon={<Archive size={30}/>} title="No generated artifacts">Files appear after the first build.</Empty> : <div className="artifact-browser"><div className="file-list">{files.map(f => <button key={f.path} className={selected === f.path ? 'selected' : ''} onClick={() => setSelected(f.path)}><FileCode2 size={15}/><span>{f.path}</span><small>{Math.ceil(f.size / 1024)} KB</small></button>)}</div><div className="file-content"><h3>{selected || 'Select a file'}</h3>
      {readError ? <div role="alert"><p>Could not open this file. Try again.</p><button type="button" className="secondary" onClick={() => setReadAttempt(value => value + 1)}>Retry</button></div> : <pre>{selected ? content || 'This file is empty.' : 'Choose an artifact to inspect its saved contents.'}</pre>}
    </div></div>}
  </div>;
}
function AgentSessions({ project, onReview }: { project: Project; onReview: () => void }) {
  const [filter, setFilter] = useState<StageId | 'all'>('all');
  const [kind, setKind] = useState<'all' | 'message' | 'tool' | 'error'>('all');
  const all = buildActivity(project.logs, project.status, project.stages.find(s => s.status === 'active')?.id);
  const staged = all.filter(item => filter === 'all' || item.stage === filter);
  const isIssue = (item: typeof all[number]) => item.kind === 'error' || item.status === 'failed' || item.status === 'interrupted';
  const items = staged.filter(item => kind === 'all' || (kind === 'error' ? isIssue(item) : item.kind === kind));
  const completed = staged.filter(item => item.kind === 'tool' && item.status === 'complete').length;
  const filters = [{ id: 'all', label: 'All activity', count: staged.length }, { id: 'message', label: 'Messages', count: staged.filter(item => item.kind === 'message').length }, { id: 'tool', label: 'Tools', count: staged.filter(item => item.kind === 'tool').length }, { id: 'error', label: 'Issues', count: staged.filter(isIssue).length }] as const;
  return <div className="page agents-page"><div className="page-heading"><div><h1>Activity</h1><p>Follow the work, inspect results, and see what needs attention.</p></div>{project.visualReview && <button type="button" className="secondary" onClick={onReview}>Visual review <ArrowRight size={15}/></button>}</div>
    <div className="agent-roles" aria-label="Filter by agent">{(['intake', 'research', 'plan', 'build', 'verify'] as StageId[]).map(id => { const stage = project.stages.find(s => s.id === id)!; const Icon = id === 'intake' ? Inbox : id === 'research' ? Search : id === 'plan' ? GitBranch : id === 'build' ? Code2 : FlaskConical; return <button key={id} onClick={() => { setFilter(filter === id ? 'all' : id); }} aria-pressed={filter === id} className={filter === id ? 'selected' : ''}><Icon size={21}/><div><h2>{stageNames[id]} agent</h2><p>{stage.detail}</p></div><Badge status={stage.status}/></button>; })}</div>
    <div className="activity-toolbar"><div className="activity-toolbar-heading"><h2>{filter === 'all' ? 'Run activity' : stageNames[filter] + ' activity'}</h2><span className="activity-count">{completed} tool{completed === 1 ? '' : 's'} completed</span></div><label className="activity-stage-filter">Stage<select aria-label="Filter activity by stage" value={filter} onChange={e => setFilter(e.target.value as StageId | 'all')}><option value="all">All stages</option>{project.stages.map(stage => <option key={stage.id} value={stage.id}>{stageNames[stage.id]}</option>)}</select></label>
      <div className="activity-filters" aria-label="Filter activity type">{filters.map(option => <button key={option.id} type="button" aria-label={`${option.label} ${option.count}`} aria-pressed={kind === option.id} onClick={() => setKind(option.id)}>{option.label}<span>{option.count}</span></button>)}</div>
    </div>
    <div className="transcript"><ActivityFeed key={filter + kind} items={items} live={project.status === 'running'} emptyTitle={kind === 'error' ? 'No issues recorded' : staged.length ? 'No matching activity' : 'No activity yet'} emptyDescription={kind === 'error' ? 'Failed actions and interrupted tools will appear here.' : staged.length ? 'Choose another activity type to see more of this run.' : filter === 'all' ? 'Start a build to follow AppYard here, from the first plan to the final checks.' : 'Updates will appear here when this stage begins.'}/></div>
  </div>;
}
function Settings({ data, action, updated, busy, onBack, onSaved }: { data: Bootstrap; action: Action; updated: (b: Bootstrap) => void; busy: boolean; onBack?: () => void; onSaved: (b: Bootstrap) => void }) {
  const { backend, provider, model, rememberKey } = data.state.settings;
  return <div className="page settings-page"><div className="page-heading"><div><h1>Settings</h1></div><div>{onBack && <button className="secondary" onClick={onBack}>Back to workspace <ArrowRight size={14}/></button>}</div></div>
    <div className="settings-grid"><section><h2>Model & credentials</h2><p className="muted">{workerURL ? 'Choose how to connect a model for this workspace.' : 'Connect ChatGPT or choose another model provider.'}</p>
      <ModelSettings key={JSON.stringify([backend, provider, model, rememberKey])} data={data} api={api} busy={busy} action={action} updated={updated} desktop={isDesktop} onSaved={onSaved}/>
    </section><aside>
      <div className="readiness-note"><TerminalSquare size={20}/><p>AppYard can read and write files and execute shell commands on the build host. AppYard independently runs the generated tests locally. Builds use your connected ChatGPT plan or configured API account.</p></div>
      <h3 className="section-label">Workspace storage</h3><p className="path-note">{data.storagePath}</p><p className="small-note">Credentials stay on your build host. The interface shows your account, models, and usage status.</p>
    </aside></div>
  </div>;
}
export default function App() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [active, setActive] = useState<View>('portfolio');
  const [current, setCurrent] = useState('');
  const [newSession, setNewSession] = useState(false);
  const [requestedArtifact, setRequestedArtifact] = useState('');
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const settingsReturn = useRef<View>('workspace');
  useEffect(() => {
    let mounted = true;
    api.bootstrap().then(value => { if (mounted) { setData(value); setState(value.state); } }).catch(error => { if (mounted) setError(String(error)); });
    const unsubscribe = api.onState(setState);
    return () => { mounted = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearch(value => !value); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(timer); }, [message]);
  const projects = state?.projects.filter(project => !project.archivedAt) ?? [];
  const project = projects.find(project => project.id === current);
  const results = projects.filter(project => (project.title + ' ' + project.description).toLowerCase().includes(query.toLowerCase()));
  const configured = !!data?.models.some(model => (!state?.settings.model || model.id === state.settings.model) && model.provider === state?.settings.provider && model.configured && (model.backend ?? 'pi') === (state?.settings.backend ?? 'pi'));
  const action: Action = async (work, success) => {
    setBusy(true); setError('');
    try { await work(); if (success) setMessage(success); return true; }
    catch (error) { setError((error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '')); return false; }
    finally { setBusy(false); }
  };
  function navigate(view: View) {
    if (view === 'settings' && active !== 'settings') settingsReturn.current = active;
    // Old build/brief destinations return to the shared chat workspace.
    setActive(['requirements', 'factory', 'design'].includes(view) ? 'workspace' : view);
  }
  function openProject(id: string) { setCurrent(id); setNewSession(false); setRequestedArtifact(''); setSearch(false); setError(''); setActive('workspace'); }
  function newChat() { setNewSession(true); setCurrent(''); setError(''); setActive('workspace'); }
  async function build(prompt: string) {
    return action(async () => {
      const created = await api.createProject({ title: prompt.trim().split(/[.!?\n]/)[0].slice(0, 100), description: prompt.trim(), criteria: [] });
      setState(previous => previous ? { ...previous, projects: [created, ...previous.projects.filter(item => item.id !== created.id)] } : previous);
      openProject(created.id);
      if (isDesktop && configured) await api.startRun(created.id);
    });
  }
  function updateBootstrap(value: Bootstrap) { setData(value); setState(value.state); }
  if (!state || !data) return <div className="loading-screen"><div className="mark"><Mark/></div><h1>AppYard</h1><p>{error || 'Opening your workspace…'}</p>{error && <button className="secondary" onClick={() => location.reload()}>Retry</button>}</div>;
  const globalView = ['portfolio', 'settings', 'storage'].includes(active);
  const showHome = active === 'portfolio' || (!project && !newSession && !globalView);
  const tabs: { id: View; label: string }[] = [{ id: 'workspace', label: 'Preview' }, { id: 'artifacts', label: 'Files' }, { id: 'agents', label: 'Activity' }];
  if (project && ['review', 'approved', 'delivered'].includes(project.status)) tabs.push({ id: 'evidence', label: 'Review' });
  if (project && ['approved', 'delivered'].includes(project.status)) tabs.push({ id: 'delivery', label: 'Export' });
  return <div className={'app-shell builder-shell' + (workerURL ? ' remote-worker' : '')}>
    <aside className="rail"><div className="window-drag"/><div className="brand" aria-label="AppYard"><div className="mark"><Mark/></div></div>
      <nav aria-label="Primary"><IconButton label="Home" placement="right" className={'icon-button' + (showHome ? ' active' : '')} onClick={() => setActive('portfolio')}><LayoutDashboard size={21}/><span>Home</span></IconButton><IconButton label="New app" placement="right" onClick={newChat}><Plus size={21}/><span>New app</span></IconButton></nav>
      <div className="rail-bottom"><IconButton label="Settings" placement="right" className={'icon-button' + (active === 'settings' ? ' active' : '')} onClick={() => navigate('settings')}><Settings2 size={21}/><span>Settings</span></IconButton></div>
    </aside>
    <main className="workspace">
      <header className="topbar">
        {project && !globalView ? <div className="workspace-picker"><select aria-label="Current app" value={project.id} onChange={event => openProject(event.target.value)}>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div> : <div className="workspace-title"><img className="brand-wordmark" src={brandLogo} width={452} height={112} alt="AppYard"/><span>/ {active === 'settings' ? 'Settings' : active === 'storage' ? 'Storage' : newSession && !showHome ? 'New app' : 'Home'}</span></div>}
        <div className="top-actions"><ModelSelector compact data={{ ...data, state }} api={api} busy={busy} action={action} updated={updateBootstrap} desktop={isDesktop} openSettings={() => navigate('settings')}/><IconButton label="Find app (Ctrl+K)" onClick={() => { setQuery(''); setSearch(true); }}><Search size={18}/></IconButton></div>
      </header>
      {error && <div className="builder-error" role="alert"><XCircle size={17}/><span>{error}</span><IconButton label="Dismiss error" onClick={() => setError('')}><X size={16}/></IconButton></div>}
      {showHome && <Home projects={projects} open={openProject} busy={busy} canBuild={configured} build={build}/>}
      {active === 'settings' && <Settings data={{ ...data, state }} action={action} updated={updateBootstrap} busy={busy} onSaved={value => { updateBootstrap(value); }} onBack={() => setActive(settingsReturn.current)}/>}
      {active === 'storage' && <DataStorage projects={state.projects} onOpenProject={openProject} onLearning={() => navigate('settings')}/>}
      {newSession && !globalView && <div className="builder-workspace"><NewChat busy={busy} configured={configured} build={build}/><div className="builder-preview-empty"><Code2 size={28}/><h2>Your app starts here</h2><p>Describe what you want in the chat. Your preview will appear here.</p></div></div>}
      {project && !newSession && !globalView && <div className="builder-workspace">
        <ProjectConversation key={project.id} project={project} open focusRequest={0} api={api} desktop={isDesktop} configured={configured} restartRequired={isDesktop && data.capabilities?.projectConversation !== true} openSettings={() => navigate('settings')} onApplied={() => setActive('workspace')}/>
        <section className="builder-output" aria-label="App workspace">
          <div className="builder-output-toolbar"><nav aria-label="App views">{tabs.map(tab => <button key={tab.id} className={active === tab.id ? 'active' : ''} aria-current={active === tab.id ? 'page' : undefined} onClick={() => navigate(tab.id)}>{tab.label}</button>)}</nav><div className="builder-run-actions"><span className={'builder-status ' + project.status} role="status">{labels[project.status] || project.status}</span>{project.status === 'running' ? <button className="secondary" disabled={busy} onClick={() => void action(() => api.stopRun(project.id))}><Square size={13}/>Stop</button> : ['draft', 'failed', 'stopped'].includes(project.status) && <button className="primary" disabled={busy || !isDesktop || !configured} onClick={() => void action(() => getResumeStage(project) ? api.resumeRun(project.id) : api.startRun(project.id))}><Play size={13}/>{busy ? 'Starting…' : getResumeStage(project) ? 'Resume' : project.status === 'failed' ? 'Retry build' : 'Build'}</button>}</div></div>
          {project.error && project.status !== 'running' && !error && <div className="builder-error" role="alert"><XCircle size={17}/><span>{project.error}</span></div>}
          {getJourneyState(project).stale && <p className="builder-stale" role="status">This preview is from the previous build. Build your latest changes to update it.</p>}
          {active === 'workspace' && <Development key={project.id} project={project} action={action}/>}
          {active === 'artifacts' && <Artifacts key={project.id} project={project} action={action} requested={requestedArtifact} onManage={() => navigate('storage')}/>}
          {active === 'agents' && <AgentSessions key={project.id} project={project} onReview={() => navigate('evidence')}/>}
          {active === 'evidence' && <ReviewWorkspace key={project.id + (project.runId || '')} project={project} busy={busy} action={action} onPreview={() => navigate('workspace')} onGuide={() => { setRequestedArtifact('README.md'); navigate('artifacts'); }} onApproved={() => navigate('delivery')} onChangesRequested={() => navigate('workspace')}/>}
          {active === 'delivery' && <DeliveryWorkspace project={project} busy={busy} action={action} onReview={() => navigate('evidence')} onChangesRequested={() => navigate('workspace')}/>}
        </section>
      </div>}
    </main>
    {message && <div className="toast" role="status"><CheckCircle2 size={17}/>{message}</div>}
    {search && <Modal title="Find an app" close={() => setSearch(false)}><label className="search-field"><Search size={18}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your apps"/></label><div className="search-results">{results.map(project => <button key={project.id} onClick={() => openProject(project.id)}><span>{project.title}<small>{labels[project.status]}</small></span><ArrowRight size={16}/></button>)}{!results.length && <p className="muted">No matching apps.</p>}</div></Modal>}
  </div>;
}
