import { useEffect, useId, useRef, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Code2, Database, FileCode2, Focus, GitBranch, Maximize, Maximize2, Minimize, Minus, Monitor, MousePointer2, PanelRight, Plug, Plus, XCircle } from 'lucide-react';
import type { Project } from '../shared/types';
import type { ComponentStatus, SystemComponent, SystemDesign as Design } from '../shared/system-design';
import './system-design.css';

const kinds = ['interface', 'logic', 'data', 'integration'] as const;
const kindNames = { interface: 'Interface', logic: 'Application logic', data: 'Data', integration: 'Integrations' };
const icons = { interface: Monitor, logic: Code2, data: Database, integration: Plug };
const statusLabels = { planned: 'Planned', building: 'Building', generated: 'Generated', blocked: 'Blocked', stopped: 'Stopped' };
type DisplayStatus = ComponentStatus | 'stopped';
const NODE_WIDTH = 216, NODE_HEIGHT = 132, COLUMN_STEP = 272, ROW_STEP = 176;
function StatusIcon({ status }: { status: DisplayStatus }) {
  const Icon = status === 'generated' ? Check : status === 'building' ? Activity : status === 'blocked' ? XCircle : Circle;
  return <Icon size={13} aria-hidden="true"/>;
}

export function SystemDesign({ project }: { project: Project }) {
  const design = project.systemDesign;
  const running = project.status === 'running' && !design;
  const planning = running && project.stages.some(stage => stage.id === 'plan' && stage.status === 'active');
  if (!design || !design.definition.components.length) return <section className="system-design sd-empty-surface" aria-label="System design">
    <div className="sd-empty"><div className="sd-empty-symbol"><GitBranch size={30} aria-hidden="true"/></div><h2>{planning ? 'Designing your system' : 'Your system design will appear here'}</h2>
      <p>{planning ? 'The planning agent is mapping the application’s components and how they connect. The diagram will appear as soon as it publishes the design.' : running ? 'The diagram will appear automatically when the planning agent publishes the architecture, after the brief and research phases.' : project.status === 'stopped' || project.status === 'failed' ? 'The run ended before a system design was published. Start a new run to generate the architecture.' : project.runId && project.status !== 'draft' ? 'This earlier run has no system design. New runs publish a live architecture diagram during planning.' : 'Start a build to see the planned components, their connections, and progress as the agents implement them.'}</p>
      {planning && <span className="sd-status building" role="status"><Activity size={14} aria-hidden="true"/>Planning in progress</span>}
    </div>
  </section>;
  return <DesignExplorer key={project.id + ':' + project.runId} project={project} design={design}/>;
}

function DesignExplorer({ project, design }: { project: Project; design: Design }) {
  const [selected, setSelected] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [focusConnections, setFocusConnections] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 440 });
  const canvas = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLElement>(null);
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandError, setExpandError] = useState('');
  const surface = useRef<HTMLElement>(null);
  const uid = useId().replaceAll(':', '');
  const { components, connections, title, description } = design.definition;
  const active = components.find(c => c.id === selected) || components[0];
  const activeIndex = components.indexOf(active);
  const statusOf = (c: SystemComponent): DisplayStatus => {
    const status = design.progress[c.id]?.status || 'planned';
    if (status === 'building' && project.status !== 'running') return project.status === 'failed' ? 'blocked' : 'stopped';
    return status;
  };
  const generated = components.filter(c => statusOf(c) === 'generated').length;
  const building = components.filter(c => statusOf(c) === 'building').length;
  const groups = kinds.filter(kind => components.some(c => c.kind === kind));
  const rows = Math.max(...groups.map(kind => components.filter(c => c.kind === kind).length));
  const width = groups.length * COLUMN_STEP - (COLUMN_STEP - NODE_WIDTH) + 80;
  const height = rows * ROW_STEP + 112;
  const positions = new Map(components.map(c => {
    const peers = components.filter(peer => peer.kind === c.kind);
    return [c.id, { x: groups.indexOf(c.kind) * COLUMN_STEP + 40, y: 62 + (rows - peers.length) * ROW_STEP / 2 + peers.indexOf(c) * ROW_STEP }];
  }));
  const fittedZoom = Math.min(1, Math.max(.1, Math.min((viewport.width - 32) / width, (viewport.height - 76) / height)));
  const scale = zoom ?? fittedZoom;
  const graphWidth = width * scale, graphHeight = height * scale;
  const report = project.report;
  const passed = report && report.exitCode === 0 && report.total > 0 && report.passed === report.total && report.failed === 0 && report.skipped === 0;
  const verifying = project.status === 'running' && project.stages.some(s => s.id === 'verify' && s.status === 'active');
  const testLabel = project.status === 'stopped' ? 'Run stopped' : project.status === 'failed' ? 'Run needs attention' : verifying ? 'Verification in progress' : passed ? 'Application tests passed' : 'Tests not yet passed';
  const related = connections.filter(c => c.from === active.id || c.to === active.id);
  const neighbors = new Set(related.flatMap(c => [c.from, c.to]));
  const progress = design.progress[active.id];
  const activeStatus = statusOf(active);
  const ActiveIcon = icons[active.kind];

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setExpanded(document.fullscreenElement === surface.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  // Keep zoom centered on the current view. A fitted diagram tracks panel resizes.
  const previousScale = useRef(scale);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ratio = scale / previousScale.current;
    if (zoom === null) element.scrollTo({ left: 0, top: 0 });
    else element.scrollTo({ left: (element.scrollLeft + element.clientWidth / 2) * ratio - element.clientWidth / 2, top: (element.scrollTop + element.clientHeight / 2) * ratio - element.clientHeight / 2 });
    previousScale.current = scale;
  }, [scale, zoom]);

  function reveal(id: string) {
    const node = nodes.current.get(id), container = canvas.current;
    if (!node || !container) return;
    const bounds = node.getBoundingClientRect(), frame = container.getBoundingClientRect();
    const dx = bounds.left < frame.left + 20 ? bounds.left - frame.left - 20 : bounds.right > frame.right - 20 ? bounds.right - frame.right + 20 : 0;
    const dy = bounds.top < frame.top + 20 ? bounds.top - frame.top - 20 : bounds.bottom > frame.bottom - 64 ? bounds.bottom - frame.bottom + 64 : 0;
    if (dx || dy) container.scrollBy({ left: dx, top: dy });
  }
  function selectComponent(id: string) {
    setSelected(id);
    detail.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => reveal(id));
  }
  function changeZoom(delta: number) {
    if ((delta < 0 && scale <= .4) || (delta > 0 && scale >= 1.5)) return;
    setZoom(Math.min(1.5, Math.max(.4, Math.round((scale + delta) * 100) / 100)));
  }
  function fit() { setZoom(null); canvas.current?.scrollTo({ left: 0, top: 0 }); }
  async function toggleExpanded() {
    setExpandError('');
    try {
      if (document.fullscreenElement === surface.current) await document.exitFullscreen();
      else await surface.current?.requestFullscreen();
    } catch { setExpandError('Expanded view is unavailable. Hide component details for more canvas space.'); }
  }

  return <section ref={surface} className="system-design" aria-label="System design">
    <header className="sd-heading">
      <div className="sd-heading-copy"><h2>System design <span className="sd-live"><span className={project.status === 'running' ? 'sd-live-dot is-live' : 'sd-live-dot'}/>{project.status === 'running' ? 'Live build' : 'Saved design'}</span></h2><p>{title}</p></div>
      <div className="sd-build-progress"><span role="status" aria-live="polite"><strong>{generated}<span> / {components.length}</span></strong> components generated{building > 0 && <span className="sd-building-count"> · {building} building</span>}</span><div className="sd-progress-track" aria-hidden="true">{components.map(c => <span key={c.id} className={statusOf(c)} title={c.label + ': ' + statusLabels[statusOf(c)]}/>)}</div></div>
    </header>
    <p className="sd-description">{description}</p>
    <div className="sd-toolbar">
      <div className="sd-graph-facts"><GitBranch size={15} aria-hidden="true"/><span>{components.length} components</span><span className="sd-fact-divider"/><span>{connections.length} connections</span></div>
      <div className="sd-toolbar-actions"><button className="sd-tool sd-focus-button" aria-pressed={focusConnections} onClick={() => setFocusConnections(value => !value)} title="Highlight only the selected component and its connections"><Focus size={15} aria-hidden="true"/><span>Focus connections</span></button><button className="sd-tool sd-icon-tool" aria-label={showDetails ? 'Hide component details' : 'Show component details'} aria-expanded={showDetails} aria-controls={uid + '-detail'} onClick={() => setShowDetails(value => !value)} title={showDetails ? 'Hide component details' : 'Show component details'}><PanelRight size={17} aria-hidden="true"/></button><button className="sd-tool sd-icon-tool" aria-label={expanded ? 'Exit expanded system design' : 'Expand system design'} title={expanded ? 'Exit expanded view (Esc)' : 'Expand system design'} onClick={() => void toggleExpanded()}>{expanded ? <Minimize size={16} aria-hidden="true"/> : <Maximize size={16} aria-hidden="true"/>}</button></div>
    </div>
    {expandError && <p className="sd-expand-error" role="status">{expandError}</p>}
    <div className={'sd-workbench' + (showDetails ? ' has-details' : '')}>
      <div className="sd-canvas-panel">
        <div ref={canvas} className={'sd-graph-scroll' + (panning ? ' is-panning' : '')} tabIndex={0} aria-label="System architecture diagram. Select a component to inspect it. Drag the background or use arrow keys to pan."
          onPointerDown={event => {
            if (event.button !== 0 || event.pointerType === 'touch' || (event.target as Element).closest('button')) return;
            pan.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
            event.currentTarget.setPointerCapture(event.pointerId); setPanning(true);
          }}
          onPointerMove={event => { if (pan.current) { event.currentTarget.scrollLeft = pan.current.left - (event.clientX - pan.current.x); event.currentTarget.scrollTop = pan.current.top - (event.clientY - pan.current.y); } }}
          onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); pan.current = null; setPanning(false); }}
          onPointerCancel={() => { pan.current = null; setPanning(false); }}
          onLostPointerCapture={() => { pan.current = null; setPanning(false); }}
          onKeyDown={event => {
            if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return;
            const moves: Record<string, [number, number]> = { ArrowLeft: [-64, 0], ArrowRight: [64, 0], ArrowUp: [0, -64], ArrowDown: [0, 64] };
            if (moves[event.key]) { event.preventDefault(); event.currentTarget.scrollBy(...moves[event.key]); }
            if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(.1); }
            if (event.key === '-') { event.preventDefault(); changeZoom(-.1); }
            if (event.key === '0') { event.preventDefault(); fit(); }
          }}>
          <div className="sd-graph-stage" style={{ width: Math.max(viewport.width, graphWidth + 32), height: Math.max(viewport.height, graphHeight + 76) }}>
            <div className="sd-graph-frame" style={{ width: graphWidth, height: graphHeight }}>
              <div className="sd-graph" style={{ width, height, transform: `scale(${scale})` }}>
                {groups.map((kind, index) => <div className="sd-column-label" style={{ left: index * COLUMN_STEP + 40, width: NODE_WIDTH }} key={kind}><span>{kindNames[kind]}</span><span>{components.filter(c => c.kind === kind).length}</span></div>)}
                <svg className="sd-connections" width={width} height={height} aria-hidden="true">
                  <defs>{['normal', 'selected'].map(tone => <marker key={tone} id={`${uid}-arrow-${tone}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path className={'sd-arrow ' + tone} d="M0 0L8 4L0 8Z"/></marker>)}</defs>
                  {[...connections].sort((a, b) => Number(a.from === active.id || a.to === active.id) - Number(b.from === active.id || b.to === active.id)).map(edge => {
                    const from = positions.get(edge.from), to = positions.get(edge.to);
                    if (!from || !to) return null;
                    const i = connections.indexOf(edge);
                    const isRelated = edge.from === active.id || edge.to === active.id;
                    const direct = to.x - from.x === COLUMN_STEP;
                    const sameColumn = to.x === from.x;
                    const bottom = rows * ROW_STEP + 44 + (i % 3) * 18;
                    const route = sameColumn
                      ? `M${from.x + NODE_WIDTH} ${from.y + 80}C${from.x + NODE_WIDTH + 64} ${from.y + 80} ${to.x + NODE_WIDTH + 64} ${to.y + 48} ${to.x + NODE_WIDTH} ${to.y + 48}`
                      : direct
                        ? `M${from.x + NODE_WIDTH} ${from.y + NODE_HEIGHT / 2}C${from.x + NODE_WIDTH + 36} ${from.y + NODE_HEIGHT / 2} ${to.x - 36} ${to.y + NODE_HEIGHT / 2} ${to.x} ${to.y + NODE_HEIGHT / 2}`
                        : `M${from.x + NODE_WIDTH * .65} ${from.y + NODE_HEIGHT}C${from.x + NODE_WIDTH * .65} ${bottom} ${to.x + NODE_WIDTH * .35} ${bottom} ${to.x + NODE_WIDTH * .35} ${to.y + NODE_HEIGHT}`;
                    return <path key={edge.from + ':' + edge.to} className={'sd-edge' + (isRelated ? ' selected' : focusConnections ? ' is-dimmed' : '') + (isRelated && project.status === 'running' && (statusOf(components.find(c => c.id === edge.from)!) === 'building' || statusOf(components.find(c => c.id === edge.to)!) === 'building') ? ' is-building' : '')} d={route} markerEnd={`url(#${uid}-arrow-${isRelated ? 'selected' : 'normal'})`}><title>{edge.label}</title></path>;
                  })}
                </svg>
                {components.map(c => {
                  const Icon = icons[c.kind], position = positions.get(c.id)!, status = statusOf(c);
                  return <button key={c.id} ref={node => { if (node) nodes.current.set(c.id, node); else nodes.current.delete(c.id); }} className={'sd-node ' + status + (focusConnections && c.id !== active.id && !neighbors.has(c.id) ? ' is-dimmed' : '')} style={{ left: position.x, top: position.y, width: NODE_WIDTH, height: NODE_HEIGHT }} onClick={() => selectComponent(c.id)} onFocus={() => reveal(c.id)} aria-pressed={active.id === c.id} aria-controls={uid + '-detail'} aria-label={c.label + ': ' + statusLabels[status]} title={c.label}>
                    <span className="sd-node-top"><span className="sd-node-icon"><Icon size={17} aria-hidden="true"/></span><ArrowUpRight className="sd-node-open" size={15} aria-hidden="true"/></span><strong>{c.label}</strong><span className="sd-node-bottom"><span className={'sd-status ' + status}><StatusIcon status={status}/>{statusLabels[status]}</span><span className="sd-node-files">{c.files.length} {c.files.length === 1 ? 'file' : 'files'}</span></span>
                  </button>;
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="sd-canvas-controls"><div className="sd-zoom-controls" role="group" aria-label="Diagram zoom"><button className="sd-tool sd-icon-tool" aria-label="Zoom out" title="Zoom out (−)" disabled={scale <= .4} onClick={() => changeZoom(-.1)}><Minus size={16}/></button><output className="sd-zoom-value" aria-label="Zoom level">{Math.round(scale * 100)}%</output><button className="sd-tool sd-icon-tool" aria-label="Zoom in" title="Zoom in (+)" disabled={scale >= 1.5} onClick={() => changeZoom(.1)}><Plus size={16}/></button><span className="sd-control-divider"/><button className="sd-tool sd-fit" onClick={fit} title="Fit diagram (0)"><Maximize2 size={14} aria-hidden="true"/>Fit diagram</button></div><span className="sd-canvas-hint"><MousePointer2 size={13} aria-hidden="true"/>Drag to pan · Select to inspect</span></div>
      </div>
      {showDetails && <aside ref={detail} className="sd-detail" id={uid + '-detail'} aria-label="Component details">
        <div className="sd-detail-navigation"><span>Component {activeIndex + 1} of {components.length}</span><div><button className="sd-tool sd-icon-tool" aria-label="Previous component" disabled={activeIndex === 0} onClick={() => selectComponent(components[activeIndex - 1].id)}><ChevronLeft size={16}/></button><button className="sd-tool sd-icon-tool" aria-label="Next component" disabled={activeIndex === components.length - 1} onClick={() => selectComponent(components[activeIndex + 1].id)}><ChevronRight size={16}/></button></div></div>
        <div className="sd-detail-title"><h3>{active.label}</h3></div>
        <div className="sd-detail-meta"><span><ActiveIcon size={14} aria-hidden="true"/>{kindNames[active.kind]}</span><span className={'sd-status ' + activeStatus}><StatusIcon status={activeStatus}/>{statusLabels[activeStatus]}</span></div>
        <p className="sd-responsibility">{active.description}</p>
        {(progress?.detail || activeStatus === 'stopped' || activeStatus === 'blocked') && <div className="sd-progress-note"><h4>Implementation update</h4><p>{activeStatus === 'stopped' ? 'Work was interrupted. ' : ''}{activeStatus === 'blocked' && progress?.status === 'building' ? 'The run ended while this component was in progress. ' : ''}{progress?.detail}</p></div>}
        <div className="sd-files"><h4>Source files <span>{active.files.length}</span></h4>{active.files.map(file => <div key={file}><FileCode2 size={14} aria-hidden="true"/><code>{file}</code></div>)}</div>
        <div className="sd-connection-detail"><h4>Connections <span>{related.length}</span></h4>{related.length ? <ul className="sd-relationships" aria-label={'Connections for ' + active.label}>{related.map(edge => {
          const outgoing = edge.from === active.id;
          const other = components.find(c => c.id === (outgoing ? edge.to : edge.from));
          if (!other) return null;
          const descriptionId = `${uid}-edge-${connections.indexOf(edge)}`;
          return <li key={edge.from + ':' + edge.to}><button onClick={event => { selectComponent(other.id); if (event.detail === 0) nodes.current.get(other.id)?.focus({ preventScroll: true }); }} aria-label={'Inspect ' + other.label} aria-describedby={descriptionId}><span className="sd-relationship-icon">{outgoing ? <ArrowUpRight size={16} aria-hidden="true"/> : <ArrowDownLeft size={16} aria-hidden="true"/>}</span><span className="sd-relationship-copy" id={descriptionId}><span className="sd-relationship-name"><span>{outgoing ? 'To' : 'From'}</span> {other.label}</span><span className="sd-relationship-label">{edge.label}</span></span><ChevronRight size={14} aria-hidden="true"/></button></li>;
        })}</ul> : <p className="sd-no-connections">No connections mapped to this component.</p>}</div>
      </aside>}
    </div>
    <footer className="sd-footnote"><span className={'sd-test-state' + (passed ? ' passed' : '')}>{passed ? <CheckCircle2 size={14} aria-hidden="true"/> : <Circle size={14} aria-hidden="true"/>}{testLabel}</span><span>Generated = agent-reported implementation with source files present. Tests apply to the whole application.</span></footer>
    <span className="sd-sr-only" role="status" aria-live="polite">Selected {active.label}. {statusLabels[activeStatus]}. {related.length} connections.</span>
  </section>;
}
