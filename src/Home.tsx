import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, CheckCircle2, CircleDot, FileCode2, Radio, Search, X } from 'lucide-react';
import { challenges } from '../harness/catalog';
import { recipes } from '../harness/recipes';
import type { RecipeId } from '../harness/types';
import type { Project } from '../shared/types';
import './home.css';

const categories: Record<RecipeId, string> = {
  messages: 'Documents & messages', scheduling: 'Scheduling', offline: 'Offline & edge',
  knowledge: 'Knowledge & search', readiness: 'Fleet readiness', cyber: 'Cyber resilience',
  governance: 'Agent governance', workflow: 'Workflows', physics: 'Engineering', fielding: 'Path to fleet'
};
const titles: Record<string, string> = {
  '12': 'Message to mission timeline', '11': 'A training plan that fits', '36': 'Paperless. Even underway.',
  '40': 'One source for official records', '24': 'Turn message traffic into tasks', '35': 'A second set of eyes for cyber',
  '44': 'Maintenance beyond the network', '14': 'See the mission consequence', '32': 'Know before it breaks', '26': 'Restore to mission'
};
const marks: Record<RecipeId, string> = { messages: 'Aa', scheduling: 'T/t', offline: '', knowledge: 'K', readiness: 'R', cyber: 'C', governance: 'G', workflow: 'W', physics: 'ƒ', fielding: 'F' };
const statusNames: Record<Project['status'], string> = { draft: 'Brief saved', running: 'Building', stopped: 'Stopped', failed: 'Needs attention', review: 'Needs review', approved: 'Approved', delivered: 'Delivered' };
const featured = ['12', '11', '36'];
const catalog = [...challenges].sort((a, b) => {
  const rank = (id: string) => featured.includes(id) ? featured.indexOf(id) : 99;
  return rank(a.id) - rank(b.id);
});

export function Home({ projects, open, create }: {
  projects: Project[]; open: (id: string) => void; create: (challengeId?: string) => void;
}) {
  const [tab, setTab] = useState<'discover' | 'builds'>('discover');
  const [query, setQuery] = useState(''), [category, setCategory] = useState<RecipeId | 'all'>('all');
  const [limit, setLimit] = useState(9), [buildQuery, setBuildQuery] = useState('');
  const main = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => catalog.filter(c => (category === 'all' || c.recipe === category)
    && `${c.id} ${c.title} ${c.summary} ${categories[c.recipe]}`.toLowerCase().includes(query.trim().toLowerCase())), [category, query]);
  const builds = projects.filter(p => `${p.title} ${p.description}`.toLowerCase().includes(buildQuery.trim().toLowerCase()));
  function navigate(next: 'discover' | 'builds') { setTab(next); main.current?.scrollTo({ top: 0 }); }

  return <section className="home-shell" aria-label="Home workspace">
    <div className="home-main" id="home-main" ref={main} tabIndex={-1}>
      <div className="home-width">
        <header className="home-heading"><h1>Your workspace</h1><p>Start with a fleet challenge or pick up a saved build.</p></header>
        <nav className="home-nav" aria-label="Home views">
          <button aria-current={tab === 'discover' ? 'page' : undefined} onClick={() => navigate('discover')}>Challenge catalog <span>{challenges.length}</span></button>
          <button aria-current={tab === 'builds' ? 'page' : undefined} onClick={() => navigate('builds')}>My builds <span>{projects.length}</span></button>
        </nav>
        {tab === 'discover' ? <>
          <section className="home-collection" aria-labelledby="home-collection-title">
            <div className="home-section-heading">
              <div><h2 id="home-collection-title">Find your next challenge</h2><p>Browse the Norfolk FleetHacker catalog, or <button className="home-inline-action" onClick={() => create()}>write your own brief <ArrowUpRight size={13}/></button></p></div>
              <label className="home-search"><Search size={18}/><input aria-label="Search challenges" placeholder="Search challenges, ideas, keywords…" value={query} onChange={e => { setQuery(e.target.value); setLimit(9); }}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15}/></button>}</label>
            </div>
            <div className="home-filters" aria-label="Filter challenges">
              <button aria-pressed={category === 'all'} onClick={() => { setCategory('all'); setLimit(9); }}>All challenges</button>
              {(['messages', 'scheduling', 'offline', 'knowledge'] as RecipeId[]).map(id => <button key={id} aria-pressed={category === id} onClick={() => { setCategory(id); setLimit(9); }}>{categories[id]}</button>)}
              <select aria-label="More categories" value={['all', 'messages', 'scheduling', 'offline', 'knowledge'].includes(category) ? '' : category} onChange={e => { setCategory(e.target.value as RecipeId || 'all'); setLimit(9); }}>
                <option value="">More categories</option>{(['readiness', 'cyber', 'governance', 'workflow', 'physics', 'fielding'] as RecipeId[]).map(id => <option key={id} value={id}>{categories[id]}</option>)}
              </select>
            </div>
            <div className="home-results" role="status">{filtered.length} {filtered.length === 1 ? 'challenge' : 'challenges'}{category === 'all' ? ' to make a difference' : ` in ${categories[category]}`}</div>
            <div className="home-grid">{filtered.slice(0, limit).map(c => <article className={'home-card recipe-' + c.recipe} key={c.id}>
              <div className="home-card-meta"><span>NF / {c.id.padStart(2, '0')}</span>{c.pilot && <span className="home-pilot">Pilot pick</span>}</div>
              <button className="home-card-body" onClick={() => create(c.id)} aria-label={'Start a brief: ' + c.title}>
                <span className="home-card-mark" aria-hidden="true">{c.recipe === 'offline' ? <Radio size={28} strokeWidth={1.5}/> : marks[c.recipe]}</span>
                <span className="home-card-category">{categories[c.recipe]}</span><h3>{titles[c.id] || c.title}</h3><p>{c.summary}</p>
                <span className="home-card-footer"><span>{c.requirements.length} requirements · {recipes[c.recipe].skills.length} skills</span><ArrowUpRight size={19}/></span>
              </button>
            </article>)}</div>
            {!filtered.length && <div className="home-empty"><Search size={28}/><h3>No matching challenges</h3><p>Try another keyword or reset the category filters.</p><button className="text-button" onClick={() => { setQuery(''); setCategory('all'); }}>Reset filters <ArrowRight size={15}/></button></div>}
            {filtered.length > limit && <div className="home-more"><button className="secondary" onClick={() => setLimit(v => v + 9)}>Explore more challenges <ArrowDown size={16}/></button><span>Showing {Math.min(limit, filtered.length)} of {filtered.length}</span></div>}
          </section>
        </> : <section className="home-builds" aria-label="Saved builds">
          <div className="home-builds-heading"><div><h2>My builds</h2><p>Saved briefs, active builds, and applications ready for review.</p></div></div>
          <label className="home-search"><Search size={18}/><input aria-label="Search your builds" placeholder="Find a previous challenge…" value={buildQuery} onChange={e => setBuildQuery(e.target.value)}/></label>
          <div className="home-build-list">{builds.map(p => <button key={p.id} onClick={() => open(p.id)}><FileCode2 size={24}/><span className="home-build-copy"><strong>{p.title}</strong><small>{p.criteria.length} criteria · {p.runId ? 'Updated ' + new Date(p.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Not started'}</small></span><span className={'badge ' + p.status}>{p.status === 'approved' || p.status === 'delivered' ? <CheckCircle2 size={13}/> : <CircleDot size={13}/>} {statusNames[p.status]}</span><ArrowUpRight size={19}/></button>)}</div>
          {!builds.length && <div className="home-empty"><FileCode2 size={28}/><h2>{buildQuery ? 'No builds match that search' : 'Your next idea starts here'}</h2><p>{buildQuery ? 'Try a different challenge name.' : 'Choose a challenge from the collection or create your own brief.'}</p><button className="text-button" onClick={() => buildQuery ? setBuildQuery('') : navigate('discover')}>{buildQuery ? 'Clear search' : 'Explore challenges'} <ArrowRight size={15}/></button></div>}
        </section>}
      </div>
    </div>
  </section>;
}
