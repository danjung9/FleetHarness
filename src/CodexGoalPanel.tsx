import { useEffect, useId, useRef } from 'react';
import { CheckCircle2, ChevronRight, Clock3, FolderOpen, MessageSquare, Play, Square, TerminalSquare, XCircle } from 'lucide-react';
import type { Project } from '../shared/types';
import { codexGoalActive, type CodexGoalLaunch } from '../shared/codex-goal';
import { experimentRunning } from '../shared/journey';
import './codex-goal.css';

const goalLabels: Record<CodexGoalLaunch['status'], string> = {
  prepared: 'Preparing build', running: 'Building', stopping: 'Stopping', completed: 'Codex completed',
  stopped: 'Stopped', blocked: 'Needs attention', failed: 'Build failed', opened: 'Earlier Terminal session'
};

export function CodexGoalPanel({ project, busy, desktop, launch, stop, openWorkspace }: {
  project: Project; busy: boolean; desktop: boolean;
  launch: () => void; stop: () => void; openWorkspace: () => void;
}) {
  const heading = useId();
  const activityHeading = useId();
  const activityLog = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const goal = project.codexGoal;
  const active = codexGoalActive(goal);
  const pipelineRunning = project.status === 'running' || experimentRunning(project.experiment);
  const failed = goal?.status === 'failed' || goal?.status === 'blocked';
  const entries = goal?.activity ?? [];
  const hasActivity = !pipelineRunning && (active || entries.length > 0);
  useEffect(() => { following.current = true; }, [goal?.id]);
  useEffect(() => {
    if (following.current && activityLog.current) activityLog.current.scrollTop = activityLog.current.scrollHeight;
  }, [goal?.id, goal?.updatedAt, entries]);
  const description = !desktop ? 'Open the AppYard desktop app to start a Codex build from this saved brief.'
    : goal?.status === 'completed' ? 'Codex finished this goal. Open the goal folder to run the app and review its tests and startup instructions.'
    : goal?.status === 'stopped' ? 'The build was stopped. Its files and activity are saved. A new build starts in a fresh folder.'
    : goal?.status === 'stopping' ? 'Stopping Codex and its tracked commands. Files and activity will be kept.'
    : goal?.status === 'opened' ? 'This earlier goal opened in Terminal. Start a new build to follow Codex progress here.'
    : active && failed ? 'Codex could not confirm that all commands stopped. Use Stop Codex build again before starting new work.'
    : active ? 'Codex is working in the background. Messages, commands, and file changes appear here as they happen.'
    : 'Build from the saved brief and attached inputs, with full access to files, commands, and the network. Follow progress here.';
  return <section className={'codex-goal-panel' + (active ? ' is-active' : '') + (hasActivity ? ' has-activity' : '')} aria-labelledby={heading}>
    <div className="codex-goal-overview">
      <div className="codex-goal-copy">
        <div className="codex-goal-heading"><h2 id={heading}>Build with a Codex goal</h2>{goal && <span className={'codex-goal-status ' + goal.status} role="status" aria-live="polite">{failed ? <XCircle size={14}/> : goal.status === 'completed' ? <CheckCircle2 size={14}/> : active ? <Clock3 size={14}/> : <TerminalSquare size={14}/>} {goalLabels[goal.status]}</span>}</div>
        <p>{description}</p>
        {failed && <p className="codex-goal-error" role="alert">{goal.error || 'Codex could not finish this build. Review its activity and saved files, then try a new build.'}</p>}
        <details className="codex-goal-details"><summary>How this build works <ChevronRight size={13}/></summary><p>Codex runs headlessly using its own sign-in and model, with full access to files, commands, and the network. Sign in with the Codex CLI before starting. A reasoning choice made here applies to new goals when the Codex model supports it. Each build creates a new folder. Completion is reported by Codex; AppYard’s independent pipeline verification and delivery gates do not run for this goal.</p>{goal && <p className="codex-goal-path">{goal.workspace}</p>}</details>
        {pipelineRunning && <p className="codex-goal-wait">Stop the pipeline or comparison before starting a Codex build.</p>}
      </div>
      <div className="codex-goal-actions">
        {active ? <button className="secondary" type="button" disabled={!desktop || goal?.status === 'stopping'} onClick={stop}><Square size={15}/>{goal?.status === 'stopping' ? 'Stopping…' : 'Stop Codex build'}</button>
          : <button className="primary" type="button" disabled={busy || !desktop || pipelineRunning} onClick={launch}><Play size={16}/>{busy ? 'Please wait…' : failed ? 'Retry Codex build' : goal ? 'Start new Codex build' : 'Start Codex build'}</button>}
        {goal && <button className="secondary" type="button" disabled={busy || !desktop} onClick={openWorkspace}><FolderOpen size={16}/>Open goal folder</button>}
      </div>
    </div>
    {hasActivity && <div className="codex-goal-activity">
      <div className="codex-goal-activity-heading"><h3 id={activityHeading}>Codex activity</h3><span>{active ? 'Live updates' : 'Saved activity'}</span></div>
      <div className="codex-goal-log" ref={activityLog} role="log" aria-labelledby={activityHeading} aria-live="polite" aria-relevant="additions" tabIndex={0} onScroll={event => {
        const log = event.currentTarget; following.current = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
      }}>
        {entries.length ? entries.map(entry => <div key={entry.id} className={'codex-goal-entry ' + entry.kind + (entry.status ? ' ' + entry.status : '')}>
          <div className="codex-goal-entry-meta">{entry.kind === 'message' ? <MessageSquare size={13} aria-hidden="true"/> : entry.kind === 'command' ? <TerminalSquare size={13} aria-hidden="true"/> : entry.kind === 'file' ? <FolderOpen size={13} aria-hidden="true"/> : <Clock3 size={13} aria-hidden="true"/>}<span>{entry.kind === 'message' ? 'Codex' : entry.kind === 'command' ? 'Command' : entry.kind === 'file' ? 'Files' : 'Update'}{entry.status ? ` · ${entry.status === 'running' ? 'Running' : entry.status === 'failed' ? 'Failed' : 'Completed'}` : ''}</span><time dateTime={entry.at}>{new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div>
          <p>{entry.text}</p>
        </div>) : <p className="codex-goal-empty">{goal?.status === 'prepared' ? 'Preparing the workspace and starting Codex…' : 'Waiting for Codex’s first update…'}</p>}
      </div>
    </div>}
  </section>;
}
