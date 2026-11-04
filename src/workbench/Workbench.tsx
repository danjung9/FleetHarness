import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ExternalLink, FolderKanban, Layers, LayoutList, Plus, Search, Settings2, ShieldCheck, X } from 'lucide-react';
import type { AppState, Bootstrap, NewProject } from '../../shared/types';
import { challenges, toProjectInput } from '../../harness/catalog';
import { recipes } from '../../harness/recipes';
import { ModelSettings } from '../ModelSettings';
import { api, isDesktop } from './api';
import { cleanBrief, emptyBrief, validateBrief } from './brief';
import { BriefEditor } from './BriefEditor';
import { BuildWorkspace } from './BuildWorkspace';
import { date, domains, Empty, Mark, SourceLink, Status, taskTitles, type Work } from './ui';

type Route = { page: string; id?: string; source?: string; view?: string };
function readRoute(): Route {
  const [path, search] = location.hash.slice(1).split('?');
  const [page, id] = (path || 'catalog').split('/');
  const params = new URLSearchParams(search);
  return { page, id, source: params.get('source') || undefined, view: params.get('view') || undefined };
}
const ordered = [...challenges].sort((a, b) => Number(b.pilot) - Number(a.pilot) || (a.pilot ? [12, 11, 36].indexOf(Number(a.id)) - [12, 11, 36].indexOf(Number(b.id)) : 0));

export default function Workbench() {
  const [route, setRoute] = useState(readRoute), [boot, setBoot] = useState<Bootstrap>(), [state, setState] = useState<AppState>();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const working = useRef(false);
  const routeRef = useRef(route);
  useEffect(() => {
    const changed = () => {
      const next = readRoute();
      const keepSelectionFocus = routeRef.current.page === 'catalog' && next.page === 'catalog' && next.id && window.matchMedia('(min-width: 761px)').matches;
      routeRef.current = next; setRoute(next); setError('');
      if (!keepSelectionFocus) requestAnimationFrame(() => document.getElementById('wb-main')?.focus());
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    let active = true;
    const unsubscribe = api.onState(next => { if (active) setState(next); });
    api.bootstrap().then(b => { if (active) { setBoot(b); setState(b.state); } }).catch(e => { if (active) setError(String(e)); });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  const work: Work = async (task, success) => {
    if (working.current) return false;
    working.current = true; setBusy(true); setError('');
    try { await task(); if (success) setNotice(success); return true; }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); return false; }
    finally { working.current = false; setBusy(false); }
  };
  const navigate = (path: string) => { location.hash = path; };
  const projects = state?.projects || [];
  const running = projects.filter(p => p.status === 'running').length;
  const review = projects.filter(p => p.status === 'review' || p.status === 'failed').length;
  const connected = Boolean(boot?.models.some(m => m.provider === state?.settings.provider && m.id === state?.settings.model && m.configured && (m.backend ?? 'pi') === (state?.settings.backend ?? 'pi')));
  const project = projects.find(p => p.id === route.id);
  const source = challenges.find(c => c.id === route.source);
  const isCatalog = route.page === 'catalog';
  const nav = [
    { id: 'catalog', label: 'Find a solution', icon: LayoutList, count: challenges.length },
    { id: 'builds', label: 'My tools', icon: FolderKanban, count: projects.length },
    { id: 'review', label: 'Needs my review', icon: ShieldCheck, count: review }
  ];
  return <div className="wb-app">
    <a className="wb-skip" href="#wb-main" onClick={e => { e.preventDefault(); document.getElementById('wb-main')?.focus(); }}>Skip to content</a>
    <aside className="wb-sidebar">
      <a className="wb-brand" href="#catalog" aria-label="FleetHarness — Find a solution"><Mark/><span>FleetHarness<small>Field workspace <b>03</b></small></span></a>
      <div className="wb-space"><span className="wb-space-icon"><Layers size={17}/></span><span>Norfolk FleetHacker<small>Field workspace</small></span></div>
      <nav aria-label="Main navigation">{nav.map(item => <a href={'#' + item.id} aria-label={item.label + ' (' + item.count + ')'} key={item.id} aria-current={route.page === item.id || item.id === 'builds' && ['build', 'brief'].includes(route.page) ? 'page' : undefined}><item.icon size={18}/><span>{item.label}</span><span className="wb-nav-count">{item.count}</span></a>)}</nav>
      <div className="wb-sidebar-note"><ShieldCheck size={19}/><strong>You know the problem.</strong><p>Start with what gets in your way. Review the tool before using it.</p></div>
      <div className="wb-sidebar-bottom"><a href="#settings" aria-current={route.page === 'settings' ? 'page' : undefined}><Settings2 size={18}/>Connection & workspace</a><SourceLink className="wb-sidebar-source" href="https://cdao.hackathon.maximus.com/event/norfolk/use-cases"><BookOpen size={17}/>Source challenges</SourceLink><div className="wb-local"><span/>Local workspace<small>UI version 3</small></div></div>
    </aside>
    <div className="wb-shell">
      <header className="wb-topbar"><div><span>Workspace</span><ChevronRight size={14}/><strong>{isCatalog ? 'Find a solution' : route.page === 'settings' ? 'Connection & workspace' : route.page === 'review' ? 'Needs my review' : 'My tools'}</strong></div><button className="wb-connection" onClick={() => navigate('settings')}><span className={connected ? 'connected' : ''}/>{running ? `${running} being created` : isDesktop ? connected ? 'Connected' : 'Set up connection' : 'Planning mode'}<Settings2 size={14}/></button></header>
      <main id="wb-main" tabIndex={-1}>
        {error && <div className="wb-alert" role="alert"><span>{error}</span><button className="wb-icon" aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
        {!boot || !state ? <div className="wb-loading" aria-busy="true"><p>{error ? 'Workspace could not load. Reload to try again.' : 'Loading your workspace…'}</p><div/><div/><div/></div> : <>
          {isCatalog && <Catalog selectedId={route.id} navigate={navigate} running={running} review={review} delivered={projects.filter(p => p.status === 'delivered').length}/>}
          {['builds', 'review'].includes(route.page) && <ProjectList state={state} attention={route.page === 'review'} navigate={navigate}/>}
          {route.page === 'brief' && (route.id && route.id !== 'new' && !project ? <Empty title="Brief not found"><p>Select an existing build or create a new brief.</p><a className="wb-button" href="#builds">My builds</a></Empty> : <BriefEditor key={route.id + ':' + route.source} initial={project ? cleanBrief(project) : source ? { ...toProjectInput(source.id), title: taskTitles[source.id] || source.title.slice(0, 120) } : emptyBrief} project={project} busy={busy} work={work} navigate={navigate} saved={p => navigate('build/' + p.id)}/>)}
          {route.page === 'build' && (project ? <BuildWorkspace key={project.id} project={project} initialView={route.view} busy={busy} connected={connected} work={work} navigate={navigate}/> : <Empty title="Build not found"><p>It may belong to a different workspace.</p><a className="wb-button" href="#builds">Go to My builds</a></Empty>)}
          {route.page === 'settings' && <WorkspaceSettings boot={{ ...boot, state }} busy={busy} work={work} navigate={navigate} updated={b => { setBoot(b); setState(b.state); }}/>} 
          {!['catalog', 'builds', 'review', 'brief', 'build', 'settings'].includes(route.page) && <Empty title="This page could not be found"><a href="#catalog" className="wb-button">Open challenge catalog</a></Empty>}
        </>}
      </main>
      <footer className="wb-footer"><span><span className="wb-footer-dot"/>{isDesktop ? 'Desktop workspace' : 'Planning mode · requests saved on this device'}</span><span>Prototype tools · Your review comes first</span></footer>
    </div>
    {notice && <div className="wb-toast" role="status"><Check size={17}/>{notice}<button className="wb-icon" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15}/></button></div>}
  </div>;
}

function Catalog({ selectedId, navigate, running, review, delivered }: { selectedId?: string; navigate: (path: string) => void; running: number; review: number; delivered: number }) {
  const [query, setQuery] = useState(''), [domain, setDomain] = useState('all'), [pilots, setPilots] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target instanceof HTMLElement && (e.target.matches('input, textarea, select') || e.target.isContentEditable)) && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); search.current?.focus(); } };
    window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut);
  }, []);
  const filtered = ordered.filter(c => (domain === 'all' || c.recipe === domain) && (!pilots || c.pilot) && `${c.title} ${taskTitles[c.id] || ''} ${c.summary} ${c.id} ${domains[c.recipe]}`.toLowerCase().includes(query.toLowerCase()));
  const selected = filtered.find(c => c.id === selectedId) || filtered[0];
  return <div className={'wb-catalog ' + (selectedId && selected ? 'showing-detail' : '')}>
    <div className="wb-page-heading"><div><h1>What do you need to get done?</h1><p>Start with a field challenge, or describe a problem of your own.</p></div><a className="wb-button primary" href="#brief/new"><Plus size={16}/>Describe a problem</a></div>
    <div className="wb-overview" aria-label="Workspace summary"><span><strong>{challenges.length}</strong>field challenges</span><span><Activity size={15}/><strong>{running}</strong>being created</span><span><ShieldCheck size={15}/><strong>{review}</strong>need your review</span><span><Check size={15}/><strong>{delivered}</strong>downloaded</span></div>
    <div className="wb-catalog-tools"><label className="wb-search"><Search size={17}/><input ref={search} aria-label="Search challenges" placeholder="Search a task or problem…" value={query} onChange={e => setQuery(e.target.value)}/>{query ? <button className="wb-icon" aria-label="Clear search" onClick={() => setQuery('')}><X size={15}/></button> : <kbd>/</kbd>}</label><select aria-label="Filter by domain" value={domain} onChange={e => setDomain(e.target.value)}><option value="all">All domains</option>{Object.entries(domains).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button className="wb-button wb-pilot-filter" aria-pressed={pilots} onClick={() => setPilots(!pilots)}><span className="wb-pilot-dot"/>Starter challenges</button></div>
    <div className={'wb-split ' + (selectedId && selected ? 'detail-open' : '')}>
      <section className="wb-challenge-list" aria-label="Source challenges"><div className="wb-list-heading"><span>{filtered.length} challenges</span><span>Norfolk catalog</span></div><div className="wb-list-scroll">
        {filtered.map(c => <button key={c.id} className={'wb-challenge-row ' + (selected?.id === c.id ? 'selected' : '')} aria-pressed={selected?.id === c.id} onClick={() => navigate('catalog/' + c.id)}><span className="wb-challenge-id">{c.id.padStart(2, '0')}</span><span className="wb-row-content"><span className="wb-row-meta">{domains[c.recipe]}{c.pilot && <span className="wb-pilot-label">Starter</span>}</span><strong>{taskTitles[c.id] || c.title}</strong><span className="wb-row-summary">{c.summary}</span></span><ChevronRight size={16}/></button>)}
        {!filtered.length && <Empty title="No matching challenges"><p>Try another keyword or reset the filters.</p><button className="wb-button" onClick={() => { setQuery(''); setDomain('all'); setPilots(false); }}>Reset filters</button></Empty>}
      </div></section>
      {selected ? <section className="wb-detail" aria-label="Selected challenge"><div className="wb-detail-scroll" key={selected.id}>
        <button className="wb-back wb-mobile-back" onClick={() => navigate('catalog')}><ArrowLeft size={15}/>All challenges</button>
        <div className="wb-detail-meta"><span>NF / {selected.id.padStart(2, '0')}</span><span>{domains[selected.recipe]}</span>{selected.pilot && <span className="wb-pilot-label">Starter challenge</span>}</div>
        <h2>{taskTitles[selected.id] || selected.title}</h2><p className="wb-detail-summary">{selected.summary}</p>
        <div className="wb-detail-action"><a className="wb-button primary" href={'#brief/new?source=' + selected.id}>Make this my problem<ArrowRight size={16}/></a><SourceLink className="wb-text-link" href={selected.sourceUrl}>Source challenge</SourceLink></div>
        <section className="wb-detail-section"><h3>What your tool should do <span>{selected.requirements.length}</span></h3><ol className="wb-requirements">{selected.requirements.map((r, i) => <li key={r}><span>{i + 1}</span>{r}</li>)}</ol></section>
        <section className="wb-detail-section"><h3>What you’ll need</h3><ul className="wb-inputs">{selected.dataNeeds.map(r => <li key={r}>{r}</li>)}</ul></section>
        <details className="wb-approach"><summary>How this could work<ChevronRight size={15}/></summary><p>{recipes[selected.recipe].approach}</p><p>Source title: {selected.title}</p><p>{recipes[selected.recipe].skills.length} assigned skills · {recipes[selected.recipe].tools.length} domain tools</p></details>
        <div className="wb-delivery-note"><ShieldCheck size={18}/><div><strong>Try it. Check it. Make it yours.</strong><p>Your tool is tested before it reaches you. You decide whether it solves the problem.</p></div></div>
      </div><div className="wb-detail-foot"><CircleHelp size={14}/>You can change the details to fit your situation.</div></section> : <div className="wb-detail"><Empty title="Choose a challenge"><p>A matching challenge’s scope and dependencies will appear here.</p></Empty></div>}
    </div>
  </div>;
}

function ProjectList({ state, attention, navigate }: { state: AppState; attention: boolean; navigate: (path: string) => void }) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
  const projects = [...state.projects].filter(p => (!attention || ['review', 'failed'].includes(p.status)) && (filter === 'all' || p.status === filter) && p.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <div className="wb-page"><div className="wb-page-heading"><div><h1>{attention ? 'Your experience is the final check.' : 'Tools for the work in front of you.'}</h1><p>{attention ? 'Try each tool against the real problem before approving a download.' : 'Pick up a request, see what’s being created, or open a tool to try.'}</p></div><a className="wb-button primary" href="#brief/new"><Plus size={16}/>Describe a problem</a></div><div className="wb-list-tools"><label className="wb-search"><Search size={17}/><input aria-label="Search builds" placeholder="Find one of your tools…" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Filter build status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option>{(attention ? ['review', 'failed'] : ['draft', 'running', 'review', 'failed', 'stopped', 'approved', 'delivered']).map(s => <option value={s} key={s}>{({ draft: 'Draft', running: 'Building', review: 'Needs review', failed: 'Needs attention', stopped: 'Stopped', approved: 'Approved', delivered: 'Delivered' })[s]}</option>)}</select></div>
      {projects.length ? <div className="wb-project-table"><div className="wb-project-table-head"><span>Your tool</span><span>Status</span><span>Checks</span><span>Updated</span></div>{projects.map(p => <button className="wb-project-row" key={p.id} onClick={() => navigate('build/' + p.id + (attention && p.status === 'review' ? '?view=evidence' : ''))}><div><strong>{p.title}</strong><span>{p.challengeId ? 'NF / ' + p.challengeId : 'Custom challenge'} · {p.criteria.length} requirements</span></div><Status value={p.status}/><span className="wb-project-evidence">{p.report ? `${p.report.passed}/${p.report.total} tests passed` : 'Not tested'}</span><time>{date(p.updatedAt)}</time><ChevronRight size={16}/></button>)}</div> : <Empty title={query || filter !== 'all' ? 'No tools match these filters' : attention ? 'Nothing needs your attention' : 'Start with a problem worth solving'}><p>{query || filter !== 'all' ? 'Change the status filter or search for another title.' : attention ? 'Tools appear here when they are ready to try, or when creation needs help.' : 'Choose a field challenge or describe a problem. Your saved requests will appear here.'}</p><a className="wb-button" href="#catalog">Browse challenges<ArrowRight size={16}/></a></Empty>}
  </div>;
}

function WorkspaceSettings({ boot, busy, work, updated, navigate }: { boot: Bootstrap; busy: boolean; work: Work; updated: (b: Bootstrap) => void; navigate: (path: string) => void }) {
  return <div className="wb-page"><div className="wb-page-heading"><div><h1>Connection & workspace</h1><p>Set up the connection that creates your tools, or get help from your technical support team.</p></div></div><div className="wb-settings-grid"><section className="wb-settings-main"><h2>AI connection</h2><ModelSettings data={boot} api={api} busy={busy} action={work} updated={updated} desktop={isDesktop}/></section><aside className="wb-settings-aside">
    {!isDesktop && <section><h2>Continue on desktop</h2><p>Describe problems and save requests here. Open the desktop workspace to create and try your tools.</p><code className="wb-command">npm run workbench</code><p>Download your request, then import it on desktop.</p></section>}
    <section><h2>Bring in a saved request</h2><p>Open a request downloaded from this workspace.</p><label className="wb-import">Choose request file<input type="file" accept=".json,application/json" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (!file) return; void work(async () => { if (file.size > 150000) throw new Error('Choose a brief smaller than 150 KB.'); const value = JSON.parse(await file.text()); const error = validateBrief(value); if (error) throw new Error(error); const p = await api.createProject(cleanBrief(value as NewProject)); navigate('build/' + p.id); }, 'Request imported.'); e.target.value = ''; }}/></label></section>
    <section><h2>Local storage</h2><p className="wb-path">{boot.storagePath}</p><p>{boot.runtime}</p><p>Workbench keeps its projects and preferences in a separate workspace.</p></section>
  </aside></div></div>;
}
