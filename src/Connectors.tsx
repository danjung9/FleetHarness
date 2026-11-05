import { useState } from 'react';
import {
  ArrowUpRight, CalendarDays, CircleDot, FileText, FolderOpen, GitBranch, Mail,
  MessageSquare, Network, Plug, Search, Users, X, type LucideIcon
} from 'lucide-react';
import './connectors.css';

type Category = 'Knowledge & data' | 'Productivity' | 'Communication' | 'Development';
type Connector = {
  id: string;
  name: string;
  category: Category;
  description: string;
  icon: LucideIcon;
};

const catalog: Connector[] = [
  { id: 'mss-ontology', name: 'MSS Ontology', category: 'Knowledge & data', description: 'Bring objects, relationships, and shared operational context into your workspace.', icon: Network },
  { id: 'google-calendar', name: 'Google Calendar', category: 'Productivity', description: 'Events, schedules, and availability.', icon: CalendarDays },
  { id: 'gmail', name: 'Gmail', category: 'Communication', description: 'Email conversations and attachments.', icon: Mail },
  { id: 'google-drive', name: 'Google Drive', category: 'Knowledge & data', description: 'Files, documents, and shared folders.', icon: FolderOpen },
  { id: 'slack', name: 'Slack', category: 'Communication', description: 'Channels, messages, and team discussions.', icon: MessageSquare },
  { id: 'notion', name: 'Notion', category: 'Knowledge & data', description: 'Pages, databases, and team knowledge.', icon: FileText },
  { id: 'github', name: 'GitHub', category: 'Development', description: 'Repositories, issues, and pull requests.', icon: GitBranch },
  { id: 'microsoft-teams', name: 'Microsoft Teams', category: 'Communication', description: 'Team conversations and collaboration.', icon: Users }
];
const categories: Category[] = ['Knowledge & data', 'Productivity', 'Communication', 'Development'];

export function Connectors() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const search = query.trim().toLowerCase();
  const matches = catalog.filter(connector =>
    (category === 'all' || connector.category === category) &&
    `${connector.name} ${connector.description} ${connector.category}`.toLowerCase().includes(search)
  );
  const featured = matches.find(connector => connector.id === 'mss-ontology');
  const services = matches.filter(connector => connector.id !== 'mss-ontology');
  const filtered = Boolean(search) || category !== 'all';

  // The remaining connectors only reveal local setup notices.
  function connectButton(connector: Connector) {
    return <button
      type="button"
      className="secondary"
      aria-label={`Connect ${connector.name}`}
      aria-expanded={expanded === connector.id}
      aria-controls={expanded === connector.id ? `connector-setup-${connector.id}` : undefined}
      onClick={() => setExpanded(expanded === connector.id ? null : connector.id)}
    ><Plug size={15} aria-hidden="true"/>Connect</button>;
  }

  function setupNotice(connector: Connector) {
    if (expanded !== connector.id) return null;
    return <div className="connector-setup" id={`connector-setup-${connector.id}`}>
      <div role="status"><strong>{connector.name} setup is coming soon.</strong><p>Account authorization and data sync aren’t available yet. No connection has been made.</p></div>
      <button type="button" className="icon-button" aria-label={`Dismiss ${connector.name} setup notice`} onClick={() => setExpanded(null)}><X size={16} aria-hidden="true"/></button>
    </div>;
  }

  function clearFilters() { setQuery(''); setCategory('all'); setExpanded(null); }

  return <section className="page connectors-page" aria-labelledby="connectors-title">
    <div className="connectors-content">
      <header className="page-heading connectors-heading">
        <div><h1 id="connectors-title">Connectors</h1><p>A place for the tools, knowledge, and context your work depends on.</p></div>
        <span className="connector-status"><CircleDot size={14} aria-hidden="true"/>No accounts connected</span>
      </header>

      <div className="connector-toolbar">
        <label className="connector-search"><Search size={17} aria-hidden="true"/><input
          type="search" aria-label="Search connectors" placeholder="Search connectors…" value={query}
          onChange={event => { setQuery(event.target.value); setExpanded(null); }}
        /></label>
        <select aria-label="Filter connectors by category" value={category} onChange={event => { setCategory(event.target.value); setExpanded(null); }}>
          <option value="all">All categories</option>
          {categories.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <span className="connector-count" role="status">{matches.length} {matches.length === 1 ? 'connector' : 'connectors'}</span>
      </div>

      {featured && <article className="connector-featured" aria-labelledby="mss-ontology-title">
        <div className="connector-featured-main">
          <Network className="connector-ontology-icon" size={38} strokeWidth={1.4} aria-hidden="true"/>
          <div className="connector-featured-copy">
            <div className="connector-featured-title"><h2 id="mss-ontology-title">MSS Ontology</h2><span className="connector-category">{featured.category}</span></div>
            <p>{featured.description}</p>
            <ul className="connector-concepts" aria-label="Ontology context"><li>Objects</li><li>Relationships</li><li>Properties</li></ul>
          </div>
          <a className="primary connector-external-link" href="https://mss.data.mil" target="_blank" rel="noopener noreferrer" aria-label="Connect MSS Ontology (opens in a new tab)"><Plug size={15} aria-hidden="true"/>Connect MSS Ontology<ArrowUpRight size={15} aria-hidden="true"/></a>
        </div>
      </article>}

      {services.length > 0 && <section className="connector-catalog" aria-labelledby="connector-catalog-title">
        <h2 id="connector-catalog-title">{filtered ? 'Matching services' : 'Explore services'}</h2>
        <ul className="connector-list">
          {services.map(connector => <li key={connector.id}>
            <div className="connector-row">
              <connector.icon className="connector-service-icon" size={25} strokeWidth={1.6} aria-hidden="true"/>
              <div className="connector-service-copy"><h3>{connector.name}</h3><p>{connector.description}</p></div>
              <span className="connector-category">{connector.category}</span>
              {connectButton(connector)}
            </div>
            {setupNotice(connector)}
          </li>)}
        </ul>
      </section>}

      {!matches.length && <div className="connector-empty"><Search size={26} aria-hidden="true"/><h2>No connectors found</h2><p>Try another name or choose a different category.</p><button type="button" className="secondary" onClick={clearFilters}>Clear filters</button></div>}

      <footer className="connector-footer"><Plug size={15} aria-hidden="true"/><p>Connection setup is coming soon. Browse the catalog to see what’s planned.</p>{filtered && matches.length > 0 && <button type="button" className="text-button" onClick={clearFilters}>Clear filters</button>}</footer>
    </div>
  </section>;
}
