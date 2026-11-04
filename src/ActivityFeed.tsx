import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, ArrowDown, Bot, Check, ChevronRight, CircleHelp, FilePenLine, FileSearch, FileText, Info, Pause, TerminalSquare, Wrench, XCircle } from 'lucide-react';
import type { ActivityItem, ActivityStatus } from '../shared/activity';
import { durationLabel, humanize, parseJSON, resultText, stageNames } from '../shared/activity';

const states: Record<ActivityStatus, string> = { running: 'Running', complete: 'Completed', failed: 'Failed', interrupted: 'Interrupted', unavailable: 'No result recorded' };
function StateIcon({ status }: { status?: ActivityStatus }) {
  return status === 'complete' ? <Check size={13}/> : status === 'failed' ? <XCircle size={13}/> : status === 'running' ? <Activity size={13}/> : status === 'interrupted' ? <Pause size={13}/> : <CircleHelp size={13}/>;
}
function ToolIcon({ name }: { name?: string }) {
  return name === 'bash' ? <TerminalSquare size={16}/> : name === 'read' ? <FileText size={16}/> : name === 'write' || name === 'edit' ? <FilePenLine size={16}/> : name === 'grep' || name === 'find' ? <FileSearch size={16}/> : <Wrench size={16}/>;
}
function InlineText({ text }: { text: string }) {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((part, i) => part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
}
/** A deliberately small, escaped Markdown subset; agent output never becomes HTML. */
function Prose({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith('```')) {
      const code: string[] = [];
      while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]);
      blocks.push(<pre key={i}><code>{code.join('\n')}</code></pre>);
    } else if (/^#{1,6} /.test(line)) {
      blocks.push(<h3 key={i}><InlineText text={line.replace(/^#{1,6} /, '')}/></h3>);
    } else if (/^\s*(?:[-*]|\d+\.) /.test(line)) {
      const ordered = /^\s*\d+\. /.test(line);
      const entries: ReactNode[] = [];
      const pattern = ordered ? /^\s*\d+\. / : /^\s*[-*] /;
      do { entries.push(<li key={i}><InlineText text={lines[i].replace(pattern, '')}/></li>); i++; } while (i < lines.length && pattern.test(lines[i]));
      i--; blocks.push(ordered ? <ol key={i}>{entries}</ol> : <ul key={i}>{entries}</ul>);
    } else {
      const paragraph = [line];
      while (i + 1 < lines.length && lines[i + 1].trim() && !/^(?:#{1,6} |```|\s*[-*] |\s*\d+\. )/.test(lines[i + 1])) paragraph.push(lines[++i]);
      blocks.push(<p key={i}><InlineText text={paragraph.join('\n')}/></p>);
    }
  }
  return <div className="activity-prose">{blocks}</div>;
}
function DataValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null) return <span className="muted">None</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value !== 'object') return <span className="activity-value">{String(value)}</span>;
  if (depth >= 3) return <pre>{JSON.stringify(value, null, 2)}</pre>;
  if (Array.isArray(value)) return value.length ? <ol className="activity-data-list">{value.map((entry, i) => <li key={i}><DataValue value={entry} depth={depth + 1}/></li>)}</ol> : <span className="muted">No items</span>;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length ? <dl className="activity-data">{entries.map(([key, entry]) => <div key={key}><dt>{humanize(key)}</dt><dd><DataValue value={entry} depth={depth + 1}/></dd></div>)}</dl> : <span className="muted">No fields</span>;
}
function Payload({ text, output = false }: { text: string; output?: boolean }) {
  const decoded = output ? resultText(text) : text;
  const data = parseJSON(decoded);
  return <div className="activity-payload">{data !== undefined ? <DataValue value={data}/> : <pre>{decoded || 'No text output.'}</pre>}</div>;
}
function OriginalRecords({ item }: { item: ActivityItem }) {
  return <details className="activity-original"><summary>Original record{item.records.length > 1 ? 's' : ''}</summary>{item.records.map(record => <pre key={record.id}>{record.text}</pre>)}</details>;
}
function Meta({ item }: { item: ActivityItem }) {
  return <div className="activity-meta"><span>{stageNames[item.stage]}{item.kind === 'message' ? ' agent' : ''}</span><time dateTime={item.time} title={new Date(item.time).toLocaleString()}>{new Date(item.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>{item.durationMs !== undefined && <span>{durationLabel(item.durationMs)}</span>}</div>;
}
function ActivityRow({ item, compact }: { item: ActivityItem; compact: boolean }) {
  if (item.kind === 'tool') return <li className={'activity-row tool ' + item.status}>
    <span className="activity-marker"><ToolIcon name={item.name}/></span>
    <details className="activity-action" open={item.status === 'failed' && !compact}>
      <summary><Meta item={item}/><div className="activity-action-title"><strong>{item.text}</strong><span className={'activity-state ' + item.status}><StateIcon status={item.status}/>{states[item.status!]}</span><ChevronRight className="activity-chevron" size={15}/></div>{item.target && <code className="activity-target" title={item.target}>{item.target}</code>}</summary>
      <div className="activity-action-body">
        <p className="activity-tool-name">Tool: <code>{item.name}</code></p>
        {item.input !== undefined && <section><h3>Input</h3><Payload text={item.input}/></section>}
        {item.output !== undefined ? <section><h3>{item.status === 'failed' ? 'Error details' : 'Result'}</h3><Payload text={item.output} output/></section> : <p className="activity-waiting">{item.status === 'running' ? 'Waiting for the tool to return a result.' : 'No result was saved for this action.'}</p>}
        <OriginalRecords item={item}/>
      </div>
    </details>
  </li>;
  const long = item.text.length > (compact ? 220 : 1200);
  const testOutput = item.kind === 'info' && /(?:TAP version|# tests \d|ℹ tests \d)/.test(item.text);
  return <li className={'activity-row ' + item.kind}>
    <span className="activity-marker">{item.kind === 'message' ? <Bot size={17}/> : item.kind === 'error' ? <XCircle size={16}/> : <Info size={16}/>}</span>
    <div className="activity-message"><Meta item={item}/>{item.kind === 'error' && <strong className="activity-error-title">Needs attention</strong>}
      {testOutput ? <details className="activity-original"><summary>Test runner output</summary><pre>{item.text}</pre></details> : <>
        <Prose text={long ? item.text.slice(0, compact ? 220 : 700) + '…' : item.text}/>
        {long && <details className="activity-full-message"><summary>Read full {item.kind === 'message' ? 'message' : 'update'}</summary><Prose text={item.text}/></details>}
      </>}
    </div>
  </li>;
}

export function ActivityFeed({ items, compact = false, live = false, emptyTitle = 'No activity yet', emptyDescription = 'Agent updates and tool results will appear here when a build starts.' }: {
  items: ActivityItem[]; compact?: boolean; live?: boolean; emptyTitle?: string; emptyDescription?: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);
  const last = items.at(-1);
  // A completion may update an older tool while the most recent message stays unchanged.
  const revision = items.map(item => `${item.id}:${item.text.length}:${item.status}:${item.records.length}`).join('|');
  useEffect(() => {
    if (live && following && !compact && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [revision, live, following, compact]);
  if (!items.length) return <div className="activity-empty"><Bot size={24}/><strong>{emptyTitle}</strong><p>{emptyDescription}</p></div>;
  const visible = compact ? items.slice(-4) : items;
  return <div className={'activity-feed' + (compact ? ' compact' : '')}>
    {live && !compact && <div className="activity-live-bar"><span><Activity size={14}/>Receiving activity</span><button type="button" onClick={() => { setFollowing(true); if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }} aria-pressed={following}><ArrowDown size={13}/>{following ? 'Following live' : 'Jump to latest'}</button></div>}
    <div ref={scroll} className="activity-scroll" tabIndex={compact ? undefined : 0} aria-label="Agent activity timeline" onScroll={event => {
      const element = event.currentTarget;
      setFollowing(element.scrollHeight - element.scrollTop - element.clientHeight < 48);
    }}>
      {compact && items.length > 4 && <p className="activity-recent">Latest 4 of {items.length} updates</p>}
      <ol className="activity-timeline">{visible.map(item => <ActivityRow key={item.id} item={item} compact={compact}/>)}</ol>
      {live && last?.kind === 'message' && <p className="activity-streaming"><Activity size={13}/>Agent is working…</p>}
    </div>
  </div>;
}
