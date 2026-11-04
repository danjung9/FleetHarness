import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, CircleDot, FileCode2, Plus, Search } from 'lucide-react';
import { challenges } from '../harness/catalog';
import type { Project } from '../shared/types';
import { getJourneyState } from '../shared/journey';
import { Mark } from './Mark';
import './home.css';

const examples = [
  { id: '12', title: 'Message to mission timeline' },
  { id: '11', title: 'A training plan that fits' },
  { id: '36', title: 'Paperless. Even underway.' }
].flatMap(example => {
  const challenge = challenges.find(c => c.id === example.id);
  return challenge ? [{ ...example, challenge }] : [];
});
const statusNames: Record<Project['status'], string> = { draft: 'Brief saved', running: 'Building', stopped: 'Stopped', failed: 'Needs attention', review: 'Needs review', approved: 'Approved', delivered: 'Delivered' };

function BuildRow({ project, open }: { project: Project; open: (id: string) => void }) {
  const nextAction = {
    brief: 'Edit brief',
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

export function Home({ projects, open, create }: {
  projects: Project[]; open: (id: string) => void; create: (challengeId?: string) => void;
}) {
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
            <div><h1>AppYard</h1><p>Start with a fleet challenge or pick up a saved build.</p></div>
          </div>
          <button className="primary home-create" onClick={() => create()}><Plus size={16} aria-hidden="true"/>New challenge</button>
        </header>
        {recentBuilds.length > 0 && <section className="home-recent" aria-labelledby="home-recent-title">
          <header className="home-recent-heading"><h2 id="home-recent-title">Recent builds</h2><button className="home-builds-link" onClick={() => navigate('builds')}>My builds <span>{projects.length}</span><ArrowRight size={15} aria-hidden="true"/></button></header>
          <div className="home-build-list">{recentBuilds.map(project => <BuildRow key={project.id} project={project} open={open}/>)}</div>
        </section>}
        <section className="home-examples" aria-labelledby="home-examples-title">
          <h2 id="home-examples-title">Start with an example</h2>
          <div className="home-grid">{examples.map(({ id, title, challenge }) => <button className="home-example" key={id} onClick={() => create(id)} aria-label={'Start a brief: ' + title + '. ' + challenge.title}>
            <span className="home-example-title">{title}<ArrowUpRight size={16} aria-hidden="true"/></span>
            <span className="home-example-summary">{challenge.summary}</span>
          </button>)}</div>
        </section>
        {!projects.length && <button className="home-builds-link" onClick={() => navigate('builds')}>My builds <span>{projects.length}</span><ArrowRight size={15} aria-hidden="true"/></button>}
      </div> : <section className="home-builds" aria-label="Saved builds">
        <button className="text-button home-back" onClick={() => navigate('welcome')}><ArrowLeft size={15}/>Back to home</button>
        <header className="home-builds-heading"><h1>My builds</h1><p>Saved briefs, active builds, and applications ready for review.</p></header>
        <label className="home-search"><Search size={18}/><input aria-label="Search your builds" placeholder="Find a previous challenge…" value={buildQuery} onChange={e => setBuildQuery(e.target.value)}/></label>
        <div className="home-build-list">{builds.map(project => <BuildRow key={project.id} project={project} open={open}/>)}</div>
        {!builds.length && <div className="home-empty"><FileCode2 size={28}/><h2>{buildQuery ? 'No builds match that search' : 'Your next idea starts here'}</h2><p>{buildQuery ? 'Try a different challenge name.' : 'Choose an example or create your own brief.'}</p><button className="text-button" onClick={() => buildQuery ? setBuildQuery('') : navigate('welcome')}>{buildQuery ? 'Clear search' : 'Explore examples'} <ArrowRight size={15}/></button></div>}
      </section>}
    </div>
  </section>;
}
