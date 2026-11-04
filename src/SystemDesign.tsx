import { useId, useState } from 'react';
import { Activity, ArrowRight, Check, Circle, Code2, Database, GitBranch, Layers, Monitor, Plug, XCircle } from 'lucide-react';
import type { Project } from '../shared/types';
import type { ComponentStatus, SystemComponent } from '../shared/system-design';
import './system-design.css';

const kinds = ['interface', 'logic', 'data', 'integration'] as const;
const kindNames = { interface: 'Interface', logic: 'Application logic', data: 'Data', integration: 'Integrations' };
const icons = { interface: Monitor, logic: Code2, data: Database, integration: Plug };
const statusLabels = { planned: 'Planned', building: 'Building', generated: 'Generated', blocked: 'Blocked', stopped: 'Stopped' };
type DisplayStatus = ComponentStatus | 'stopped';
function StatusIcon({ status }: { status: DisplayStatus }) {
  const Icon = status === 'generated' ? Check : status === 'building' ? Activity : status === 'blocked' ? XCircle : Circle;
  return <Icon size={14} aria-hidden="true"/>;
}

export function SystemDesign({ project, studio = false }: { project: Project; studio?: boolean }) {
  const [selected, setSelected] = useState('');
  const uid = useId().replaceAll(':', '');
  const design = project.systemDesign;
  const planning = project.status === 'running' && !design;
  const className = 'system-design' + (studio ? ' system-design-studio' : '');
  if (!design) return <section className={className} aria-label="System design">
    <div className="sd-empty"><GitBranch size={28} aria-hidden="true"/><h2>{planning ? 'Designing your system' : 'Your system design will appear here'}</h2>
      <p>{planning ? 'The planning agent is mapping the application’s components and how they connect. The diagram will appear as soon as it publishes the design.' : project.status === 'stopped' || project.status === 'failed' ? 'The run ended before a system design was published. Start a new run to generate the architecture.' : project.runId && project.status !== 'draft' ? 'This earlier run has no system design. New runs publish a live architecture diagram during planning.' : 'Start a build to see the planned components, their connections, and progress as the agents implement them.'}</p>
      {planning && <span className="sd-status building" role="status"><Activity size={14}/>Planning in progress</span>}
    </div>
  </section>;

  const { components, connections, title, description } = design.definition;
  const active = components.find(c => c.id === selected) || components[0];
  const statusOf = (c: SystemComponent): DisplayStatus => {
    const status = design.progress[c.id]?.status || 'planned';
    if (status === 'building' && project.status !== 'running') return project.status === 'failed' ? 'blocked' : 'stopped';
    return status;
  };
  const generated = components.filter(c => statusOf(c) === 'generated').length;
  const building = components.filter(c => statusOf(c) === 'building').length;
  const groups = kinds.filter(kind => components.some(c => c.kind === kind));
  const rows = Math.max(...groups.map(kind => components.filter(c => c.kind === kind).length));
  const width = Math.max(300, groups.length * 280 + 8), height = rows * 144 + 72;
  const positions = new Map(components.map(c => {
    const peers = components.filter(peer => peer.kind === c.kind);
    return [c.id, { x: groups.indexOf(c.kind) * 280 + 24, y: peers.indexOf(c) * 144 + 60 }];
  }));
  const report = project.report;
  const passed = report && report.exitCode === 0 && report.total > 0 && report.passed === report.total && report.failed === 0 && report.skipped === 0;
  const verifying = project.status === 'running' && project.stages.some(s => s.id === 'verify' && s.status === 'active');
  const related = connections.filter(c => c.from === active.id || c.to === active.id);
  const progress = design.progress[active.id];
  return <section className={className} aria-label="System design">
    <header className="sd-heading"><div><h2>System design</h2><p>{title}</p></div><span className="sd-live"><Layers size={15}/>{project.status === 'running' ? 'Live build' : 'Saved design'}</span></header>
    <div className="sd-summary"><span role="status" aria-live="polite">{generated} of {components.length} components generated{building > 0 ? ` · ${building} building` : ''}</span><span>{project.status === 'stopped' ? 'Run stopped' : project.status === 'failed' ? 'Run needs attention' : verifying ? 'Verification in progress' : passed ? 'Application tests passed' : 'Tests not yet passed'}</span></div>
    <p className="sd-description">{description}</p>
    <div className="sd-graph-scroll" tabIndex={0} aria-label="System architecture diagram. Scroll to explore, then select a component for details.">
      <div className="sd-graph" style={{ width, height }}>
        {groups.map((kind, index) => <span className="sd-column-label" style={{ left: index * 280 + 24 }} key={kind}>{kindNames[kind]}</span>)}
        <svg className="sd-connections" width={width} height={height} aria-hidden="true">
          <defs><marker id={uid + '-arrow'} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z"/></marker></defs>
          {connections.map((edge, i) => {
            const from = positions.get(edge.from)!, to = positions.get(edge.to)!;
            const forward = to.x > from.x;
            const sameColumn = to.x === from.x;
            const startX = from.x + (forward || sameColumn ? 220 : 0), endX = to.x + (forward ? 0 : 220);
            const startY = from.y + 54, endY = to.y + 54;
            const mid = (startX + endX) / 2;
            const route = sameColumn ? `M${startX} ${startY}H${startX + 18 + i % 3 * 7}V${endY}H${endX}`
              : Math.abs(to.x - from.x) > 280 || !forward ? `M${startX} ${startY}h${forward ? 16 : -16}V${42 - i % 3 * 10}H${endX + (forward ? -16 : 16)}V${endY}H${endX}`
              : `M${startX} ${startY}H${mid}V${endY}H${endX}`;
            return <path key={edge.from + edge.to} className={edge.from === active.id || edge.to === active.id ? 'sd-edge selected' : 'sd-edge'} d={route} markerEnd={`url(#${uid}-arrow)`}><title>{edge.label}</title></path>;
          })}
        </svg>
        {components.map(c => { const Icon = icons[c.kind], position = positions.get(c.id)!, status = statusOf(c); return <button key={c.id} className={'sd-node ' + status} style={{ left: position.x, top: position.y }} onClick={() => setSelected(c.id)} aria-pressed={active.id === c.id} aria-controls={uid + '-detail'} aria-label={c.label + ': ' + statusLabels[status]}>
          <Icon size={18} aria-hidden="true"/><strong>{c.label}</strong><span className={'sd-status ' + status}><StatusIcon status={status}/>{statusLabels[status]}</span>
        </button>; })}
      </div>
    </div>
    <div className="sd-detail" id={uid + '-detail'}>
      <div className="sd-detail-title"><h3>{active.label}</h3><span className={'sd-status ' + statusOf(active)}><StatusIcon status={statusOf(active)}/>{statusLabels[statusOf(active)]}</span></div>
      <p>{active.description}</p><p className="sd-progress-note">{statusOf(active) === 'stopped' ? 'Work was interrupted. ' : ''}{statusOf(active) === 'blocked' && progress?.status === 'building' ? 'The run ended while this component was in progress. ' : ''}{progress?.detail}</p>
      <div className="sd-files"><span>Source files</span>{active.files.map(file => <code key={file}>{file}</code>)}</div>
      {related.length > 0 && <ul className="sd-relationships" aria-label={'Connections for ' + active.label}>{related.map(edge => <li key={edge.from + edge.to}><span>{components.find(c => c.id === edge.from)?.label}</span><ArrowRight size={13} aria-hidden="true"/><span>{components.find(c => c.id === edge.to)?.label}</span><em>{edge.label}</em></li>)}</ul>}
    </div>
    <footer className="sd-footnote">Generated = agent-reported implementation with source files present. Test results apply to the application; individual components are not independently certified.</footer>
  </section>;
}
