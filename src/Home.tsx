import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, CircleDot, FileCode2, Search } from 'lucide-react';
import type { Project } from '../shared/types';
import { getJourneyState } from '../shared/journey';
import { Mark } from './Mark';
import './home.css';

const statusNames: Record<Project['status'], string> = { draft: 'Ready to build', running: 'Building', stopped: 'Stopped', failed: 'Needs attention', review: 'Needs review', approved: 'Approved', delivered: 'Delivered' };

function BuildRow({ project, open }: { project: Project; open: (id: string) => void }) {
  const nextAction = {
    brief: 'Open app',
    build: project.status === 'running' ? 'View build' : 'Inspect build',
    review: 'Review build',
    deliver: 'View delivery'
  }[getJourneyState(project).current];
  return <button onClick={() => open(project.id)}>
    <FileCode2 size={24} aria-hidden="true"/>
    <span className="home-build-copy"><strong>{project.title}</strong><small>{nextAction} · Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span>
    <span className={'badge ' + project.status}>{project.status === 'approved' || project.status === 'delivered' ? <CheckCircle2 size={13} aria-hidden="true"/> : <CircleDot size={13} aria-hidden="true"/>} {statusNames[project.status]}</span>
    <ArrowUpRight size={19} aria-hidden="true"/>
  </button>;
}

export function Home({ projects, open, build, busy, canBuild }: {
  projects: Project[]; open: (id: string) => void; build: (prompt: string) => Promise<boolean>; busy: boolean; canBuild: boolean;
}) {
  const [prompt, setPrompt] = useState('');
  const [view, setView] = useState<'welcome' | 'builds'>('welcome');
  const [buildQuery, setBuildQuery] = useState('');
  const main = useRef<HTMLDivElement>(null);
  const sortedProjects = [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const recentBuilds = sortedProjects.slice(0, 3);
  const builds = sortedProjects.filter(p => `${p.title} ${p.description}`.toLowerCase().includes(buildQuery.trim().toLowerCase()));
  function navigate(next: 'welcome' | 'builds') {
    setView(next);
    main.current?.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
  }

  return <section className="home-shell" aria-label="Home workspace">
    <div className="home-main" id="home-main" ref={main} tabIndex={-1}>
      {view === 'welcome' ? <div className={'home-welcome' + (projects.length ? ' home-returning' : '')}>
        <header className="home-heading">
          <div className="home-identity">
            <div className="mark home-mark"><Mark/></div>
            <div><h1>AppYard</h1><p>Describe an idea. Build it. Make it yours.</p></div>
          </div>
        </header>
        <form className="home-prompt" onSubmit={event => { event.preventDefault(); if (prompt.trim().length >= 20 && !busy) void build(prompt).then(saved => { if (saved) setPrompt(''); }); }}>
          <label htmlFor="app-prompt">What do you want to build?</label>
          <textarea id="app-prompt" rows={4} minLength={20} maxLength={16000} value={prompt} disabled={busy} onChange={event => setPrompt(event.target.value)} placeholder="Build a team task board with projects, deadlines, and a weekly progress view…" onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
          <div><span>{canBuild ? 'Your app opens in a live preview. Refine it through chat.' : 'Your idea is saved before you connect a build model.'}</span><button type="submit" className="primary" disabled={busy || prompt.trim().length < 20}>{busy ? 'Starting…' : 'Build my app'}<ArrowRight size={16}/></button></div>
        </form>
        <div className="home-prompt-examples" aria-label="App ideas">{['A client portal for a design studio with project milestones and feedback.', 'An inventory tracker with stock alerts, search, and CSV import.', 'A personal habit tracker with daily check-ins and weekly progress.'].map(idea => <button key={idea} type="button" disabled={busy} onClick={() => { setPrompt(idea); document.getElementById('app-prompt')?.focus(); }}>{idea.split(' with ')[0]}<ArrowUpRight size={14}/></button>)}</div>
        {recentBuilds.length > 0 && <section className="home-recent" aria-labelledby="home-recent-title">
          <header className="home-recent-heading"><h2 id="home-recent-title">Recent builds</h2><button className="home-builds-link" onClick={() => navigate('builds')}>My builds <span>{projects.length}</span><ArrowRight size={15} aria-hidden="true"/></button></header>
          <div className="home-build-list">{recentBuilds.map(project => <BuildRow key={project.id} project={project} open={open}/>)}</div>
        </section>}
        {!projects.length && <button className="home-builds-link" onClick={() => navigate('builds')}>My builds <span>{projects.length}</span><ArrowRight size={15} aria-hidden="true"/></button>}
      </div> : <section className="home-builds" aria-label="Saved builds">
        <button className="text-button home-back" onClick={() => navigate('welcome')}><ArrowLeft size={15}/>Back to home</button>
        <header className="home-builds-heading"><h1>My builds</h1><p>Your apps and conversations.</p></header>
        <label className="home-search"><Search size={18}/><input aria-label="Search your builds" placeholder="Find an app…" value={buildQuery} onChange={e => setBuildQuery(e.target.value)}/></label>
        <div className="home-build-list">{builds.map(project => <BuildRow key={project.id} project={project} open={open}/>)}</div>
        {!builds.length && <div className="home-empty"><FileCode2 size={28}/><h2>{buildQuery ? 'No builds match that search' : 'Your next idea starts here'}</h2><p>{buildQuery ? 'Try a different challenge name.' : 'Describe your app to start building.'}</p><button className="text-button" onClick={() => buildQuery ? setBuildQuery('') : navigate('welcome')}>{buildQuery ? 'Clear search' : 'Start building'} <ArrowRight size={15}/></button></div>}
      </section>}
    </div>
  </section>;
}
