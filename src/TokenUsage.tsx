import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChartColumn, ChevronDown, X } from 'lucide-react';
import type { Project } from '../shared/types';
import { summarizeTokenUsage, type TokenTotals } from '../shared/token-usage';
import './token-usage.css';

const exact = new Intl.NumberFormat();
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

function TokenBreakdown({ totals }: { totals: TokenTotals }) {
  return <dl className="token-breakdown">
    <div><dt>Input <span>(includes cache)</span></dt><dd>{exact.format(totals.inputTokens)}</dd></div>
    <div><dt>Output</dt><dd>{exact.format(totals.outputTokens)}</dd></div>
    {totals.cachedInputTokens > 0 && <div className="token-cached"><dt>Cached input</dt><dd>{exact.format(totals.cachedInputTokens)}</dd></div>}
  </dl>;
}

export function TokenUsage({ projects }: { projects: Project[] }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const summary = useMemo(() => summarizeTokenUsage(projects.map(project => project.tokenUsage)), [projects]);
  const rows = useMemo(() => projects.map(project => ({ project, usage: summarizeTokenUsage([project.tokenUsage]) }))
    .sort((a, b) => b.usage.totalTokens - a.usage.totalTokens || a.project.title.localeCompare(b.project.title)), [projects]);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      if (!trigger.current || !panel.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth - 24);
      panel.current.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      panel.current.style.top = `${rect.bottom + 10}px`;
      panel.current.style.maxHeight = `${Math.max(120, window.innerHeight - rect.bottom - 22)}px`;
    };
    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [open]);

  function close() { panel.current?.hidePopover(); trigger.current?.focus(); }
  const inputShare = summary.totalTokens ? summary.inputTokens / summary.totalTokens * 100 : 0;
  const outputShare = summary.totalTokens ? summary.outputTokens / summary.totalTokens * 100 : 0;

  return <>
    <button ref={trigger} type="button" className="token-usage-trigger" popoverTarget={id}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      aria-label={`Token usage: ${summary.hasUsage ? `${exact.format(summary.totalTokens)} tokens recorded` : 'no usage recorded'}. Show workspace breakdown`}>
      <ChartColumn size={16} aria-hidden="true"/>
      <span><strong>{summary.hasUsage ? compact.format(summary.totalTokens) : '—'}</strong> tokens</span>
      <ChevronDown size={12} aria-hidden="true"/>
    </button>
    <div ref={panel} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className="token-usage-panel"
      onToggle={event => setOpen(event.newState === 'open')}>
      <div className="token-panel-heading"><h2 id={`${id}-title`}>Token usage</h2><button className="icon-button" type="button" aria-label="Close token usage" onClick={close}><X size={16}/></button></div>
      <p className="token-scope">Saved projects · this device</p>
      {summary.hasUsage ? <>
        <div className="token-total"><strong>{exact.format(summary.totalTokens)}</strong><span>tokens recorded</span></div>
        <div className="token-composition" role="img" aria-label={`${exact.format(summary.inputTokens)} input tokens and ${exact.format(summary.outputTokens)} output tokens`}>
          <span className="token-input" style={{ width: `${inputShare}%` }}/><span className="token-output" style={{ width: `${outputShare}%` }}/>
        </div>
        <div className="token-composition-key"><span><i className="token-input"/>Input {compact.format(summary.inputTokens)}</span><span><i className="token-output"/>Output {compact.format(summary.outputTokens)}</span></div>
      </> : <div className="token-empty"><strong>No usage recorded yet</strong><p>Counts appear as your agents report usage during builds and project-lead conversations.</p></div>}
      {summary.unreportedSessions > 0 && <p className="token-pending">Some sessions haven’t reported usage. The total includes reported tokens only.</p>}
      {rows.length > 0 && <section className="token-projects" aria-labelledby={`${id}-projects`}>
        <div className="token-projects-heading"><h3 id={`${id}-projects`}>By project</h3><span>Share of total</span></div>
        {rows.map(({ project, usage }) => {
          const share = summary.totalTokens > 0 ? usage.totalTokens / summary.totalTokens * 100 : 0;
          const currentRun = project.runId ? summarizeTokenUsage([project.tokenUsage], { runId: project.runId }) : undefined;
          const conversation = summarizeTokenUsage([project.tokenUsage], { source: 'conversation' });
          return <details key={project.id} className="token-project">
            <summary><span className="token-project-title">{project.title}{project.archivedAt && <small>Archived</small>}</span>
              <span className="token-project-count">{usage.hasUsage ? exact.format(usage.totalTokens) : 'Not recorded'}</span><ChevronDown size={14} aria-hidden="true"/>
              <span className="token-project-track" aria-hidden="true"><span style={{ '--token-share': `${share}%` } as CSSProperties}/></span>
            </summary>
            <div className="token-project-detail">
              {usage.hasUsage ? <><TokenBreakdown totals={usage}/>
                <dl className="token-subtotals">
                  {currentRun?.hasUsage && <div><dt>Current run · all agents</dt><dd>{exact.format(currentRun.totalTokens)}</dd></div>}
                  {conversation.hasUsage && <div><dt>Project lead · all builds</dt><dd>{exact.format(conversation.totalTokens)}</dd></div>}
                </dl>
              </> : <p>No token counts have been recorded for this project.</p>}
              {usage.unreportedSessions > 0 && <p>Waiting for usage from {exact.format(usage.unreportedSessions)} {usage.unreportedSessions === 1 ? 'session' : 'sessions'}.</p>}
            </div>
          </details>;
        })}
      </section>}
      <p className="token-footnote">Includes cached tokens and saved projects’ previous builds. Earlier activity may be missing. These counts are separate from provider billing and plan limits.</p>
    </div>
  </>;
}
