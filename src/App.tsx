import { Home } from './Home';
import { Mark } from './Mark';
import { ExecutableDownload } from './ExecutableDownload';
import { ModelSettings } from './ModelSettings';
import { ModelSelector } from './ModelSelector';
import { RunBudgetStatus } from './RunBudgetStatus';
import { DEFAULT_BUILD_TIME_LIMIT_MINUTES } from '../shared/run-budget';
import { QualityEvidence } from './QualityEvidence';
import { reportPassed } from '../shared/verification';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, Archive, ArrowRight, Bot, Check, CheckCircle2, CircleDot,
  ClipboardCheck, Code2, FileCode2, FolderOpen, GitBranch, Inbox, LayoutDashboard,
  Play, Plus, RefreshCw, Search, Settings2, ShieldCheck, Square, TerminalSquare, X, XCircle, Download, PanelRight, ListChecks, Info, UserRound, FlaskConical
} from 'lucide-react';
import type { AppState, Artifact, Bootstrap, NewProject, Project, StageId, View } from '../shared/types';
import { starters } from '../shared/types';
import { normalizeProjectInput } from '../shared/project-input';
import { api, isDesktop } from './api';
import { IconButton } from './IconButton';
import { PhaseDetails, projectPhases } from './PhaseDetails';
import { SystemDesign } from './SystemDesign';
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
function stageStatus(project: Project, status: string) { return status === 'queued' && !project.runId ? 'Not started' : labels[status] || status; }
function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-symbol">{icon}</div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
function Modal({ title, close, children, wide = false, className = '' }: { title: string; close: () => void; children: ReactNode; wide?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.showModal();
    return () => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} aria-labelledby={headingId} className={'dialog ' + (wide ? 'wide ' : '') + className} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === ref.current) close(); }}>
    <div className="dialog-inner"><div className="dialog-heading"><h2 id={headingId}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={18}/></button></div>{children}</div>
  </dialog>;
}
type BuildGuidance = { configured: boolean; busy: boolean; startBuild: () => void; navigate: (view: View) => void };
function BuildNextStep({ project, configured, busy, startBuild, navigate }: BuildGuidance & { project: Project }) {
  if (project.status === 'running') return <div className="build-next-step"><p>Your agents are working. Follow their progress as results arrive.</p><button className="secondary" onClick={() => navigate('agents')}><Activity size={16}/>View activity</button></div>;
  if (!isDesktop) return <div className="build-next-step"><p>Builds run in the AppYard desktop app. This brief is saved only in this browser.</p><button className="secondary" onClick={() => navigate('settings')}><Info size={16}/>Desktop setup</button></div>;
  return <div className="build-next-step"><p>{configured ? 'Build from your saved brief, then inspect the app and its test results.' : 'Connect a model to build from this brief. You can review the plan and results as they arrive.'}</p><button className="primary" disabled={busy} onClick={() => configured ? startBuild() : navigate('settings')}>{configured ? <Play size={15}/> : <Settings2 size={16}/>} {configured ? project.runId ? 'Start new build' : 'Start build' : 'Connect model'}</button></div>;
}
function Logs({ project, stage, compact = false }: { project: Project; stage?: StageId; compact?: boolean }) {
  const items = buildActivity(project.logs, project.status, project.stages.find(s => s.status === 'active')?.id);
  return <ActivityFeed items={stage ? items.filter(item => item.stage === stage) : items} compact={compact} live={project.status === 'running'} emptyDescription={stage ? 'Updates will appear here when this stage begins.' : undefined}/>;
}
function Factory({ project, selected, select, navigate, ...guidance }: BuildGuidance & { project: Project; selected: StageId; select: (id: StageId) => void }) {
  const [inspecting, setInspecting] = useState(true);
  const [surface, setSurface] = useState<'flow' | 'design'>('flow');
  const stage = project.stages.find(s => s.id === selected)!;
  const phases = useMemo(() => projectPhases(project), [project.phasePlan, project.challengeId]);
  const phase = phases.find(phase => phase.id === selected)!;
  function closeInspector() { setInspecting(false); document.getElementById('stage-details-toggle')?.focus(); }
  const output: Record<StageId, string> = { intake: 'requirements.md', research: 'research.md', plan: 'plan.md', build: 'index.html', verify: 'test-report.json', review: 'review.json', deliver: 'Delivery bundle' };
  const icons: Record<StageId, typeof Bot> = { intake: Inbox, research: Search, plan: GitBranch, build: Code2, verify: FlaskConical, review: ShieldCheck, deliver: Download };
  const stageNames: Record<StageId, string> = { intake: 'Intake', research: 'Research', plan: 'Plan', build: 'Build', verify: 'Test', review: 'Review', deliver: 'Deliver' };
  return <div className="factory-main"><div className="canvas-column">
    <div className="sd-view-switch factory-view-switch" aria-label="Flow views"><button aria-pressed={surface === 'flow'} onClick={() => setSurface('flow')}>Build flow</button><button aria-pressed={surface === 'design'} onClick={() => setSurface('design')}>System design</button></div>
    {surface === 'design' ? <div className="factory-design"><SystemDesign project={project}/></div> : <section className="factory-sheet">
      <div className="sheet-head"><h2>Build flow</h2><div className="flow-tools"><span className="flow-progress">{project.stages.filter(s => s.status === 'complete').length} / {project.stages.length} complete</span><IconButton id="stage-details-toggle" label={inspecting ? 'Hide stage details' : 'Show stage details'} aria-expanded={inspecting} aria-controls="stage-inspector" onClick={() => setInspecting(v => !v)}><PanelRight size={18}/></IconButton></div></div>
      <div className="graph-wrap">
        <svg className="connectors" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
          <defs><marker id="arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8" fill="none"/></marker></defs>
          <path d="M225 100H275M475 100H525M725 100H775M875 145V255M775 300H725M525 300H475" markerEnd="url(#arrow)"/>
          <path className={project.stages[4].status === 'active' ? 'active-line' : ''} d="M875 348V377H955V100H930"/>
        </svg>
        {project.stages.map((s, i) => { const StageIcon = icons[s.id]; return <button key={s.id} className={'stage stage-' + i + ' ' + s.status + (inspecting && selected === s.id ? ' selected' : '')} onClick={() => { select(s.id); setInspecting(true); }} aria-label={stageNames[s.id] + ': ' + stageStatus(project, s.status)} aria-pressed={inspecting && selected === s.id} aria-controls="stage-inspector">
          <span className="stage-index">{String(i + 1).padStart(2, '0')}</span><span className="stage-icon"><StageIcon size={22}/></span>
          <strong>{stageNames[s.id]}</strong><em><Glyph status={s.status}/>{stageStatus(project, s.status)}</em>
        </button>; })}
        <div className="graph-note"><ShieldCheck size={18}/><span>Review required</span></div>
        <span className="repair-label">Auto-repair</span>
      </div>
      <div className="sheet-foot"><span>{project.runId ? 'RUN ' + project.runId.slice(0, 8).toUpperCase() : 'Build not started'}</span>{project.model && <span>Run model: {project.model}</span>}</div>
    </section>}
    <section className="evidence-strip"><h3><ClipboardCheck size={18}/>Tests</h3>
      {project.report ? <><div className="evidence-count"><CheckCircle2 size={19}/><strong>{project.report.passed}</strong><span>passed</span></div><div className="evidence-count failed"><XCircle size={19}/><strong>{project.report.failed}</strong><span>failed</span></div></> : <span className="muted">Not run yet</span>}
      <button className="secondary" onClick={() => navigate('evidence')}>Review <ArrowRight size={15}/></button>
    </section>
  </div>{inspecting && <aside className="inspector" id="stage-inspector" aria-label="Stage details" onKeyDown={event => { if (event.key === 'Escape') closeInspector(); }}>
    <div className="inspector-heading"><Badge status={stage.status} label={stageStatus(project, stage.status)}/><IconButton label="Close stage details" onClick={closeInspector}><X size={17}/></IconButton></div><h2>{stage.label}</h2><p className="muted">{stage.detail}</p>
    <section className="stage-outcome"><h3>Ready to advance when</h3><p>{phase.exit}</p></section>
    {!project.runId ? <BuildNextStep project={project} navigate={navigate} {...guidance}/> : <>
      <section className="stage-progress"><h3>Latest activity</h3><Logs project={project} stage={stage.id} compact/><button className="text-button" onClick={() => navigate('agents')}>View all activity <ArrowRight size={13}/></button></section>
      <button className="artifact-link" onClick={() => navigate(stage.id === 'verify' || stage.id === 'review' ? 'evidence' : 'artifacts')}><FileCode2 size={18}/><span>{output[stage.id]}</span><ArrowRight size={15}/></button>
      <button className="secondary full-width" onClick={() => navigate(stage.id === 'review' || stage.id === 'deliver' ? 'evidence' : 'workspace')}><Code2 size={16}/>{stage.id === 'review' || stage.id === 'deliver' ? 'Review & deliver' : 'Open preview'}</button>
    </>}
    <details className="inline-details"><summary>Evaluation criteria <span>{project.criteria.length}</span></summary><EvaluationCriteria criteria={project.criteria}/></details>
    <details className="inline-details stage-configuration"><summary>{phase.owner === 'agent' ? 'Agent configuration' : 'Stage configuration'}</summary><div className="owner-row">{phase.owner === 'human' ? <UserRound size={19}/> : <Bot size={19}/>}<strong>{phase.role}</strong></div><PhaseDetails phase={phase} globalTools={project.globalTools} legacy={!!project.runId && !project.phasePlan} showGate={false}/></details>
  </aside>}</div>;
}
function EvaluationCriteria({ criteria }: { criteria: string[] }) {
  return criteria.length ? <ul className="criteria">{criteria.map((c, i) => <li key={i}><CircleDot size={13}/><span>{c}</span></li>)}</ul>
    : <p className="small-note">No evaluation criteria added. Review the proposed outcomes in the build’s scope and test plan.</p>;
}
function RequirementsForm({ initial, submit, busy, submitLabel }: { initial: NewProject; submit: (p: NewProject) => Promise<void>; busy: boolean; submitLabel: string }) {
  const [title, setTitle] = useState(initial.title), [description, setDescription] = useState(initial.description), [criteria, setCriteria] = useState(initial.criteria.join('\n'));
  const [resources, setResources] = useState(initial.resources ?? ''), [links, setLinks] = useState((initial.links ?? []).join('\n'));
  const [error, setError] = useState('');
  const [contextOpen, setContextOpen] = useState(false);
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
  const [catalogRevision, setCatalogRevision] = useState(0);
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
    {template === -2 && (catalogExpanded ? <div className="catalog-picker"><label>Find a published challenge<input value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)} placeholder="Search title, category, or challenge ID"/></label><p className="catalog-count" role="status">{matches.length} of {challenges.length} challenges</p><div className="catalog-results">{matches.map(c => <button aria-pressed={catalogId === c.id} className={catalogId === c.id ? 'selected' : ''} key={c.id} disabled={refreshing} onClick={() => { setCatalogId(c.id); setCatalogRevision(revision => revision + 1); setCatalogInput(toProjectInput(c.id, challenges)); setCatalogExpanded(false); }}><span className="catalog-id">#{c.id}</span><span>{c.title}<small>{c.category || 'Uncategorized'} · {c.recipe}</small></span>{catalogId === c.id && <Check size={16}/>}</button>)}{!matches.length && <div className="catalog-empty"><p>No challenges match “{catalogQuery}”.</p><button className="text-button" onClick={() => setCatalogQuery('')}>Clear search</button></div>}</div></div> : <div className="intake-source"><span>Starting from Norfolk challenge #{catalogId}</span><button className="text-button" onClick={() => setCatalogExpanded(true)}>Change challenge</button></div>)}
    {(template !== -2 || catalogInput) && <div className="intake-form" hidden={template === -2 && catalogExpanded}><RequirementsForm key={`${template}:${catalogId}:${catalogRevision}`} initial={template === -2 ? catalogInput! : template < 0 ? { title: '', description: '', criteria: [] } : starters[template]} busy={busy} submitLabel="Save challenge" submit={async input => {
      await action(async () => { const p = await api.createProject(input); close(); created(p); }, 'Challenge saved.');
    }}/></div>}
  </Modal>;
}
function Development({ project, action, navigate, ...guidance }: BuildGuidance & { project: Project; action: Action }) {
  const [surface, setSurface] = useState<'preview' | 'design'>(project.status === 'running' ? 'design' : 'preview');
  useEffect(() => { if (project.status === 'running') setSurface('design'); }, [project.runId]);
  const [preview, setPreview] = useState<string | null>(null), [revision, setRevision] = useState(0), [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState(project.status === 'running'), [review, setReview] = useState(false);
  useEffect(() => { let current = true; setLoading(true); api.preview(project.id).then(value => { if (current) setPreview(value); }).catch(() => { if (current) setPreview(null); }).finally(() => { if (current) setLoading(false); }); return () => { current = false; }; }, [project.id, project.status, revision]);
  return <div className="development">
    {activity && <aside className="session-panel" id="preview-activity"><div className="panel-heading"><h2>Activity</h2><Badge status={project.status}/></div><Logs project={project}/><button className="text-button" onClick={() => navigate('agents')}>View all agent activity <ArrowRight size={13}/></button></aside>}
    <section className="preview-panel"><div className="preview-toolbar"><div className="sd-view-switch" aria-label="Development views"><button aria-pressed={surface === 'design'} onClick={() => setSurface('design')}>System design</button><button aria-pressed={surface === 'preview'} onClick={() => setSurface('preview')}>App preview</button></div><div className="preview-actions">
      <IconButton label="Toggle activity" aria-expanded={activity} aria-controls="preview-activity" onClick={() => setActivity(v => !v)}><TerminalSquare size={18}/></IconButton>
      <IconButton label="Toggle review checklist" aria-expanded={review} aria-controls="preview-review" onClick={() => setReview(v => !v)}><ListChecks size={18}/></IconButton>
      <IconButton label="Open source folder" disabled={!project.workspace} onClick={() => void action(() => api.openWorkspace(project.id))}><FolderOpen size={18}/></IconButton>
      <IconButton label="Reload preview" onClick={() => { setSurface('preview'); setRevision(r => r + 1); }}><RefreshCw size={17}/></IconButton>
    </div></div>
      {surface === 'design' ? <div className="preview-system-design"><SystemDesign project={project}/></div> : loading ? <Empty icon={<RefreshCw size={26}/>} title="Loading preview">Opening the latest build.</Empty> : preview ? <iframe key={revision} title="Generated application preview" sandbox="allow-scripts allow-same-origin allow-downloads allow-forms" src={preview}/> : <Empty icon={<Code2 size={36}/>} title={project.runId ? 'No preview available yet' : 'Your brief is ready to build'} action={<BuildNextStep project={project} navigate={navigate} {...guidance}/>}>{project.status === 'running' ? 'Your app will appear here when the build produces a preview.' : 'Build an app from this brief to try it here.'}</Empty>}
      <div className="preview-footer"><ShieldCheck size={13}/> Isolated preview · synthetic data</div>
    </section>
    {review && <aside className="review-panel" id="preview-review"><h2>Review checklist</h2><EvaluationCriteria criteria={project.criteria}/>
      <div className="test-tally"><strong>{project.report ? project.report.passed + ' / ' + project.report.total : '—'}</strong><span>tests passed</span></div>
      <button className="secondary full-width" onClick={() => navigate('evidence')}><ClipboardCheck size={16}/> Review & deliver</button>
    </aside>}
  </div>;
}
function Evidence({ project, action, busy, ...guidance }: BuildGuidance & { project: Project; action: Action }) {
  const [feedback, setFeedback] = useState(project.feedback), [reviewed, setReviewed] = useState(false);
  const passed = reportPassed(project.report, project.qualityVersion === 1);
  return <div className="page evidence-page"><div className="page-heading"><div><h1>Review & delivery</h1></div></div>
    {!project.report ? <Empty icon={<ClipboardCheck size={32}/>} title="No test evidence yet" action={<BuildNextStep project={project} busy={busy} {...guidance}/>}>Test results appear after the build reaches verification.</Empty> : <>
      <div className="evidence-summary"><div className={passed ? 'result-pass' : 'result-fail'}>{passed ? <CheckCircle2 size={26}/> : <XCircle size={26}/>}<div><h2>{passed ? 'Automated checks passed' : 'Verification needs attention'}</h2><p>Node tests: {project.report.passed} passed · {project.report.failed} failed · {project.report.skipped} skipped · {(project.report.durationMs / 1000).toFixed(2)}s</p>{project.report.quality && <p>Browser journeys: {project.report.quality.journeys.filter(journey => journey.status === 'passed').length} / {project.report.quality.journeys.length} passed</p>}</div></div><span className="muted">{date(project.report.time)}</span></div>
      <details className="output-details" open={!passed}><summary>Test runner output <span>Exit {project.report.exitCode ?? 'terminated'}</span></summary><code>{project.report.command}</code><pre>{project.report.output}</pre></details>
      <QualityEvidence report={project.report.quality}/>
      <div className="review-form"><div><h2>Human review</h2><p className="muted">Try the app, check the agent-written tests, and note limitations before approving this prototype.</p><EvaluationCriteria criteria={project.criteria}/></div><div>
        <label>Review notes<span className="field-hint">Add at least 10 characters describing what you checked and any limitations.</span><textarea rows={5} maxLength={10000} value={feedback} disabled={!!project.approvedAt} onChange={e => setFeedback(e.target.value)} placeholder="What did you try? What worked, and what still needs domain validation?"/></label>
        {!project.approvedAt && <label className="checkbox"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/>I inspected the application, test evidence, and limitations.</label>}
        {project.approvedAt ? <p className="approval-note"><ShieldCheck size={17}/>Approved for prototype delivery · {date(project.approvedAt)}</p> : <button className="primary full-width" disabled={!passed || !reviewed || feedback.trim().length < 10 || busy || project.status === 'running'} onClick={() => void action(() => api.approve(project.id, feedback), 'Prototype approved for delivery.')}><ShieldCheck size={16}/> Approve prototype</button>}
        <ExecutableDownload project={project} api={api} busy={busy} action={action} buttonClassName="primary full-width"/>
        <button className="secondary full-width" disabled={!project.approvedAt || busy || project.executable?.status === 'packaging'} onClick={() => void action(() => api.exportProject(project.id))}><Download size={16}/> Export app & evidence</button>
        {project.exportedTo && <p className="path-note">{project.exportedTo}</p>}
      </div></div>
      <div className="readiness-note"><ShieldCheck size={19}/><p><strong>Operational readiness: unverified.</strong> Synthetic fixtures and prototype review do not validate production integrations, security accreditation, or field performance.</p></div>
    </>}
  </div>;
}
function Artifacts({ project, action }: { project: Project; action: Action }) {
  const [files, setFiles] = useState<Artifact[]>([]), [selected, setSelected] = useState(''), [content, setContent] = useState('');
  useEffect(() => { let current = true; void action(async () => { const f = await api.artifacts(project.id); if (current) setFiles(f); }); return () => { current = false; }; }, [project.id, project.status]);
  async function open(file: string) { setSelected(file); setContent('Loading…'); await action(async () => { setContent(await api.readArtifact(project.id, file)); }); }
  return <div className="page artifact-page"><div className="page-heading"><div><h1>Files</h1></div><button className="secondary" disabled={!project.workspace} onClick={() => void action(() => api.openWorkspace(project.id))}><FolderOpen size={16}/> Open folder</button></div>
    {!files.length ? <Empty icon={<Archive size={30}/>} title="No generated artifacts">Files appear after the first build.</Empty> : <div className="artifact-browser"><div className="file-list">{files.map(f => <button key={f.path} className={selected === f.path ? 'selected' : ''} onClick={() => void open(f.path)}><FileCode2 size={15}/><span>{f.path}</span><small>{Math.ceil(f.size / 1024)} KB</small></button>)}</div><div className="file-content"><h3>{selected || 'Select a file'}</h3><pre>{content || 'Choose an artifact to inspect its saved contents.'}</pre></div></div>}
  </div>;
}
function AgentSessions({ project, selectStage }: { project: Project; selectStage: (id: StageId) => void }) {
  const [filter, setFilter] = useState<StageId | 'all'>('all');
  const [kind, setKind] = useState<'all' | 'message' | 'tool' | 'error'>('all');
  const all = buildActivity(project.logs, project.status, project.stages.find(s => s.status === 'active')?.id);
  const staged = all.filter(item => filter === 'all' || item.stage === filter);
  const isIssue = (item: typeof all[number]) => item.kind === 'error' || item.status === 'failed' || item.status === 'interrupted';
  const items = staged.filter(item => kind === 'all' || (kind === 'error' ? isIssue(item) : item.kind === kind));
  const completed = staged.filter(item => item.kind === 'tool' && item.status === 'complete').length;
  const filters = [{ id: 'all', label: 'All activity', count: staged.length }, { id: 'message', label: 'Messages', count: staged.filter(item => item.kind === 'message').length }, { id: 'tool', label: 'Tools', count: staged.filter(item => item.kind === 'tool').length }, { id: 'error', label: 'Issues', count: staged.filter(isIssue).length }] as const;
  return <div className="page agents-page"><div className="page-heading"><div><h1>Agents</h1><p>Follow the work, inspect results, and see what needs attention.</p></div></div>
    <div className="agent-roles" aria-label="Filter by agent">{(['intake', 'research', 'plan', 'build', 'verify'] as StageId[]).map(id => { const stage = project.stages.find(s => s.id === id)!; const Icon = id === 'intake' ? Inbox : id === 'research' ? Search : id === 'plan' ? GitBranch : id === 'build' ? Code2 : FlaskConical; return <button key={id} onClick={() => { setFilter(filter === id ? 'all' : id); selectStage(id); }} aria-pressed={filter === id} className={filter === id ? 'selected' : ''}><Icon size={21}/><div><h2>{stageNames[id]} agent</h2><p>{stage.detail}</p></div><Badge status={stage.status}/></button>; })}</div>
    <div className="activity-toolbar"><div className="activity-toolbar-heading"><h2>{filter === 'all' ? 'Run activity' : stageNames[filter] + ' activity'}</h2><span className="activity-count">{completed} tool{completed === 1 ? '' : 's'} completed</span></div><label className="activity-stage-filter">Stage<select aria-label="Filter activity by stage" value={filter} onChange={e => setFilter(e.target.value as StageId | 'all')}><option value="all">All stages</option>{project.stages.map(stage => <option key={stage.id} value={stage.id}>{stageNames[stage.id]}</option>)}</select></label>
      <div className="activity-filters" aria-label="Filter activity type">{filters.map(option => <button key={option.id} type="button" aria-label={`${option.label} ${option.count}`} aria-pressed={kind === option.id} onClick={() => setKind(option.id)}>{option.label}<span>{option.count}</span></button>)}</div>
    </div>
    <div className="transcript"><ActivityFeed key={filter + kind} items={items} live={project.status === 'running'} emptyTitle={kind === 'error' ? 'No issues recorded' : staged.length ? 'No matching activity' : 'No activity yet'} emptyDescription={kind === 'error' ? 'Failed actions and interrupted tools will appear here.' : staged.length ? 'Choose another activity type to see more of this run.' : filter === 'all' ? 'Start a build to follow your agents here, from the first plan to the final checks.' : 'Updates will appear here when this stage begins.'}/></div>
  </div>;
}
function Settings({ data, action, updated, busy }: { data: Bootstrap; action: Action; updated: (b: Bootstrap) => void; busy: boolean }) {
  return <div className="page settings-page"><div className="page-heading"><div><h1>Model settings</h1></div><span className="runtime-label">{data.runtime}</span></div>
    <div className="settings-grid"><section><h2>Model & credentials</h2><p className="muted">Connect ChatGPT or choose a Pi provider.</p>
      <ModelSettings key={JSON.stringify(data.state.settings)} data={data} api={api} busy={busy} action={action} updated={updated} desktop={isDesktop}/>
    </section><aside><details className="inline-details"><summary>How builds work</summary><ol className="settings-steps"><li><strong>Plan the work</strong><p>Your selected engine reads your brief and creates research and implementation plans.</p></li><li><strong>Build & verify</strong><p>The agent writes the app and tests. AppYard executes tests and sends failures back for one repair attempt.</p></li><li><strong>Review & deliver</strong><p>You inspect the live preview, verify coverage, and export source with evidence.</p></li></ol></details>
      <div className="readiness-note"><TerminalSquare size={20}/><p>Agents can read and write files and execute shell commands on this Mac. AppYard independently runs the generated tests locally. Codex uses your ChatGPT allowance; Pi uses your configured provider account.</p></div>
      <h3 className="section-label">Workspace storage</h3><p className="path-note">{data.storagePath}</p><p className="small-note">Credentials stay in the desktop backend. The interface shows your account, models, and usage status.</p>
    </aside></div>
  </div>;
}
export default function App() {
  const [data, setData] = useState<Bootstrap | null>(null), [state, setState] = useState<AppState | null>(null);
  const [active, setActive] = useState<View>('portfolio'), [current, setCurrent] = useState(''), [selected, setSelected] = useState<StageId>('intake');
  const [intakeCatalogId, setIntakeCatalogId] = useState('');
  const [intake, setIntake] = useState(false), [search, setSearch] = useState(false), [start, setStart] = useState(false);
  const [query, setQuery] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => { api.bootstrap().then(b => { setData(b); setState(b.state); setCurrent(b.state.projects[0]?.id || ''); }).catch(e => setError(String(e))); return api.onState(setState); }, []);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(v => !v); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(timer); }, [message]);
  const action: Action = async (work, success) => {
    setBusy(true); setError('');
    try { await work(); if (success) setMessage(success); return true; }
    catch (e) { setError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': Error: /, '')); return false; }
    finally { setBusy(false); }
  };
  const p = state?.projects.find(p => p.id === current) || state?.projects[0];
  const configured = data?.models.some(m => m.id === state?.settings.model && m.provider === state?.settings.provider && m.configured && (m.backend ?? 'pi') === (state?.settings.backend ?? 'pi'));
  function createChallenge(challengeId = '') { setIntakeCatalogId(challengeId); setIntake(true); }
  function openProject(id: string) {
    const project = state?.projects.find(item => item.id === id);
    const next = project?.stages.find(stage => stage.status === 'active' || stage.status === 'failed' || stage.status === 'review') ?? project?.stages.find(stage => stage.status !== 'complete');
    setCurrent(id); setSelected(next?.id ?? (project ? 'deliver' : 'intake'));
    setActive(project && ['review', 'approved', 'delivered'].includes(project.status) ? 'evidence' : 'factory'); setSearch(false);
  }
  const nav: { id: View; label: string; shortLabel: string; icon: typeof Bot }[] = [
    { id: 'portfolio', label: 'Home — challenge portfolio', shortLabel: 'Home', icon: LayoutDashboard }, { id: 'factory', label: 'Flow — build pipeline', shortLabel: 'Flow', icon: GitBranch },
    { id: 'workspace', label: 'Preview — development workspace', shortLabel: 'Preview', icon: Code2 }, { id: 'agents', label: 'Agents — coding sessions', shortLabel: 'Agents', icon: Bot },
    { id: 'evidence', label: 'Review — evidence & delivery', shortLabel: 'Review', icon: ClipboardCheck }
  ];
  const results = useMemo(() => state?.projects.filter(p => (p.title + ' ' + p.description).toLowerCase().includes(query.toLowerCase())) || [], [state, query]);
  if (!state || !data) return <div className="loading-screen"><div className="mark"><Mark/></div><h1>AppYard</h1><p>{error || 'Opening your local workspace…'}</p>{error && <button className="secondary" onClick={() => location.reload()}>Retry</button>}</div>;
  const showHome = active === 'portfolio' || (!p && active !== 'settings');
  const guidance: BuildGuidance = { configured: !!configured, busy, startBuild: () => setStart(true), navigate: setActive };
  return <div className="app-shell">
    {error && <div className="error-banner" role="alert"><XCircle size={17}/><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
    <aside className="rail"><div className="window-drag"/><div className="brand" aria-label="AppYard" title="AppYard"><div className="mark"><Mark/></div></div>
      <nav aria-label="Primary">{nav.map(item => <IconButton key={item.id} disabled={!p && item.id !== 'portfolio'} label={item.label} placement="right" className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => setActive(item.id)}><item.icon size={21}/><span>{item.shortLabel}</span>{item.id === 'agents' && state.projects.some(p => p.status === 'running') && <i className="live-dot"/>}</IconButton>)}
        <div className="nav-divider"/>
        <IconButton disabled={!p} label="Brief — requirements" placement="right" className={active === 'requirements' ? 'active' : ''} aria-current={active === 'requirements' ? 'page' : undefined} onClick={() => setActive('requirements')}><Inbox size={21}/><span>Brief</span></IconButton>
        <IconButton disabled={!p} label="Files — artifacts" placement="right" className={active === 'artifacts' ? 'active' : ''} aria-current={active === 'artifacts' ? 'page' : undefined} onClick={() => setActive('artifacts')}><Archive size={21}/><span>Files</span></IconButton>
      </nav>
      <div className="rail-bottom"><IconButton label="Model settings" title={configured ? 'Model connected' : 'Connect a model in settings'} placement="right" className={'settings-link ' + (active === 'settings' ? 'active' : '')} aria-current={active === 'settings' ? 'page' : undefined} onClick={() => setActive('settings')}><Settings2 size={21}/><span>Settings</span><i className={'health-dot ' + (configured ? 'connected' : '')} aria-hidden="true"/></IconButton></div>
    </aside>
    <main className="workspace">
      <header className="topbar">
        {showHome || !p ? <div className="workspace-title">AppYard <span>/ {showHome ? 'Home' : 'Settings'}</span></div> : <div className="workspace-picker"><select aria-label="Current challenge" value={p.id} onChange={e => openProject(e.target.value)}>{state.projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>}
        <div className="top-actions">
          {!isDesktop && <span className="preview-mode" title="Use the desktop app to run agents">Browser preview</span>}
          <ModelSelector data={{ ...data, state }} api={api} busy={busy} action={action} updated={b => { setData(b); setState(b.state); }} desktop={isDesktop} openSettings={() => setActive('settings')}/>
          <IconButton label="Find challenge (⌘K)" onClick={() => { setQuery(''); setSearch(true); }}><Search size={18}/></IconButton>
          {showHome ? <button className="primary" onClick={() => createChallenge()}><Plus size={16}/>New challenge</button> : <>
            <IconButton label="New challenge" onClick={() => createChallenge()}><Plus size={20}/></IconButton>
            {p && active !== 'settings' && (p.status === 'running' ? <button className="secondary" disabled={busy} onClick={() => void action(() => api.stopRun(p.id), 'Stop requested. Current artifacts will be kept.')}><Square size={14}/>Stop run</button> : ['review', 'approved', 'delivered'].includes(p.status) ? <button className="primary" onClick={() => setActive(active === 'evidence' ? 'workspace' : 'evidence')}>{active === 'evidence' ? <Code2 size={16}/> : <ClipboardCheck size={16}/>} {active === 'evidence' ? 'Open preview' : p.status === 'review' ? 'Review build' : 'Delivery'}</button> : <button className="primary" disabled={busy} onClick={() => isDesktop && configured ? setStart(true) : setActive('settings')}>{!isDesktop ? <Info size={16}/> : <Play size={15}/>} {!isDesktop ? 'Desktop setup' : configured ? p.runId ? 'Start new build' : 'Start build' : 'Connect model'}</button>)}
          </>}
        </div>
      </header>
      {showHome && <Home projects={state.projects} open={openProject} create={createChallenge}/>}
      {p && !showHome && active !== 'settings' && <section className="run-header"><div><div className="run-title"><h1>{p.title}</h1><Badge status={p.status}/></div><details className="brief-disclosure"><summary><Info size={13}/> Challenge brief</summary><p>{p.description}</p><button className="text-button" onClick={() => setActive('requirements')}>Edit brief <ArrowRight size={13}/></button></details><RunBudgetStatus project={p}/></div></section>}
      {p?.error && active === 'factory' && <div className="run-error"><XCircle size={16}/><span>{p.error}</span></div>}
      {p && active === 'factory' && <Factory key={p.id} project={p} selected={selected} select={setSelected} {...guidance}/>}
      {p && active === 'workspace' && <Development key={p.id} project={p} action={action} {...guidance}/>}
      {p && active === 'agents' && <AgentSessions key={p.id} project={p} selectStage={setSelected}/>}
      {p && active === 'evidence' && <Evidence key={p.id + (p.approvedAt || '')} project={p} action={action} {...guidance}/>}
      {p && active === 'artifacts' && <Artifacts key={p.id} project={p} action={action}/>}
      {p && active === 'requirements' && <div className="page requirements-page"><div className="page-heading"><div><h1>Brief</h1><p>Saving changes resets tests and approval.</p></div></div><RequirementsForm key={p.id} initial={p} busy={busy || p.status === 'running'} submitLabel="Save requirements" submit={async input => { await action(() => api.updateProject(p.id, input), 'Requirements saved.'); }}/></div>}
      {active === 'settings' && <Settings data={{ ...data, state }} action={action} updated={b => { setData(b); setState(b.state); }} busy={busy}/>}
    </main>
    {message && <div className="toast" role="status"><CheckCircle2 size={17}/>{message}</div>}
    {intake && <Intake catalog={state.norfolkCatalog ?? bundledNorfolkCatalog} initialCatalogId={intakeCatalogId} close={() => setIntake(false)} action={action} created={project => { setState(previous => previous ? { ...previous, projects: [project, ...previous.projects.filter(p => p.id !== project.id)] } : previous); openProject(project.id); }} busy={busy}/>}
    {search && <Modal title="Find a challenge" close={() => setSearch(false)}><label className="search-field"><Search size={18}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search saved challenges"/></label><div className="search-results">{results.map(p => <button key={p.id} onClick={() => openProject(p.id)}><span>{p.title}<small>{labels[p.status]}</small></span><ArrowRight size={16}/></button>)}{!results.length && <p className="muted">No matching challenges.</p>}</div></Modal>}
    {start && p && <Modal title={state.settings.backend === 'codex' ? 'Start Codex build' : 'Start Pi build'} close={() => setStart(false)}><p className="muted">{state.settings.backend === 'codex' ? 'Codex' : 'Pi'} will plan, implement, and verify <strong>{p.title}</strong> using <strong>{state.settings.provider}/{state.settings.model}</strong>.</p><div className="run-disclosure"><TerminalSquare size={20}/><p>The agents can edit files and execute shell commands on this Mac. {state.settings.backend === 'codex' ? 'Codex runs with workspace write access and external command network access disabled. AppYard independently executes generated tests locally.' : 'They work in a new project folder, which is not an OS sandbox.'} {state.settings.backend === 'codex' ? 'OpenAI receives the brief and tool context. This build uses your ChatGPT plan’s Codex allowance and is subject to its limits.' : 'Your configured model provider receives the brief and tool context; provider usage charges may apply.'}</p></div><div className="start-budget-note"><p><strong>{state.settings.buildTimeLimitMinutes ?? DEFAULT_BUILD_TIME_LIMIT_MINUTES}-minute whole-build limit.</strong> Setup, generation, retries, verification and repair share one timer. At the limit, AppYard stops the build and keeps its artifacts. Human review, export and app packaging are separate.</p><button className="text-button" onClick={() => { setStart(false); setActive('settings'); }}>Change time limit in Settings <ArrowRight size={13}/></button></div><p className="small-note">Prior run folders are preserved. This starts fresh from the current requirements.</p><div className="dialog-actions"><button className="secondary" onClick={() => setStart(false)}>Cancel</button><button className="primary" disabled={busy} onClick={() => void action(async () => { await api.startRun(p.id); setStart(false); setActive('workspace'); }, 'Build started.')}><Play size={16}/>Run {state.settings.backend === 'codex' ? 'Codex' : 'Pi'} agents</button></div></Modal>}
  </div>;
}
