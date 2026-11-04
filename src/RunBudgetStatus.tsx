import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import type { Project } from '../shared/types';
import type { UsageMetric } from '../shared/run-usage';
import './run-budget.css';

function duration(milliseconds: number, roundUp = false) {
  const seconds = Math.max(0, (roundUp ? Math.ceil : Math.floor)(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`;
}
function metric(value: UsageMetric, dollars = false) {
  if (value.value === null || value.state === 'unavailable') return 'Unavailable';
  const amount = dollars ? value.value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }) : value.value.toLocaleString();
  const state = value.source === 'mixed' ? `${value.state}; includes estimates` : value.source === 'catalog' ? value.state === 'partial' ? 'partial catalog estimate' : 'catalog estimate' : value.state;
  return `${amount} (${state})`;
}

export function RunBudgetStatus({ project }: { project: Project }) {
  const summary = project.runSummary;
  const running = project.status === 'running' && !!summary && !summary.finishedAt;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running, summary?.runId]);

  if (!summary) return project.runId ? <div className="run-budget-legacy">Time and usage were not recorded for this earlier build.</div> : null;
  const deadline = Date.parse(summary.deadlineAt);
  const elapsed = running && Number.isFinite(deadline)
    ? Math.max(summary.elapsedMs, summary.timeLimitMs - Math.max(0, deadline - now)) : summary.elapsedMs;
  const remaining = Math.max(0, summary.timeLimitMs - elapsed);
  const exhausted = summary.terminalReason === 'time_budget_exhausted';
  const status = exhausted ? 'Time budget exhausted' : running ? remaining > 0 ? `${duration(remaining, true)} left` : 'Time limit reached · stopping' : `${duration(elapsed)} used`;
  const usage = summary.usage;

  return <details className={'run-budget-status' + (exhausted ? ' exhausted' : '')}>
    <summary><Clock3 size={13} aria-hidden="true"/><strong>{status}</strong><span>· {summary.timeLimitMs / 60_000} min limit</span><span className="run-budget-token-summary">Tokens: {metric(usage.tokens)}</span><span className="run-budget-details-label">Time & usage</span></summary>
    <div className="run-budget-details">
      <p className="run-budget-note">The time limit covers setup, generation, retries, verification and repair. Human review, export and app packaging are separate.</p>
      <dl className="run-budget-metrics">
        <div><dt>Build time</dt><dd>{duration(elapsed)} used</dd></div>
        <div><dt>Time limit</dt><dd>{summary.timeLimitMs / 60_000} {summary.timeLimitMs === 60_000 ? 'minute' : 'minutes'}</dd></div>
        <div><dt>Prompts submitted</dt><dd>{usage.prompts.toLocaleString()}</dd></div>
        <div><dt>Observed model responses</dt><dd>{metric(usage.requests)}</dd></div>
        <div><dt>Tokens</dt><dd>{metric(usage.tokens)}</dd></div>
        <div><dt>Cost</dt><dd>{metric(usage.costUsd, true)}</dd></div>
      </dl>
      <p className="run-budget-note">Usage is observational; token and spend caps are unavailable. Prompts are not request counts. Cached and reasoning tokens are already included in their applicable totals.</p>
      {usage.limitations.map((limitation, index) => <p className="run-budget-note" key={index}>{limitation}</p>)}
      <dl className="run-budget-phases run-budget-token-breakdown">
        {([['Input', usage.inputTokens], ['Output', usage.outputTokens], ['Cached input', usage.cachedInputTokens], ['Cache writes', usage.cacheWriteTokens], ['Reasoning', usage.reasoningTokens]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{metric(value)}</dd></div>)}
      </dl>
      {!!summary.phases.length && <><h3>Phase durations</h3><dl className="run-budget-phases">{summary.phases.map((phase, index) => <div key={phase.id + ':' + index}><dt>{phase.label}</dt><dd>{duration(running && !phase.finishedAt ? Math.max(phase.durationMs, now - Date.parse(phase.startedAt)) : phase.durationMs)}</dd></div>)}</dl></>}
    </div>
  </details>;
}
