import { useId } from 'react';
import { ChevronRight, FolderOpen, TerminalSquare, XCircle } from 'lucide-react';
import type { Project } from '../shared/types';
import { experimentRunning } from '../shared/journey';
import './codex-goal.css';

export function CodexGoalPanel({ project, busy, desktop, launch, openWorkspace }: {
  project: Project; busy: boolean; desktop: boolean;
  launch: () => void; openWorkspace: () => void;
}) {
  const heading = useId();
  const goal = project.codexGoal;
  const pipelineRunning = project.status === 'running' || experimentRunning(project.experiment);
  const failed = goal?.status === 'failed';
  const status = goal?.status === 'opened' ? 'Opened in Terminal' : failed ? 'Could not open Codex' : goal ? 'Workspace ready' : undefined;
  return <section className="codex-goal-panel" aria-labelledby={heading}>
    <div className="codex-goal-copy">
      <div className="codex-goal-heading"><h2 id={heading}>Build with a Codex goal</h2>{status && <span className={'codex-goal-status' + (failed ? ' failed' : '')} role="status">{failed ? <XCircle size={14}/> : <TerminalSquare size={14}/>} {status}</span>}</div>
      <p>{desktop ? 'Send the saved brief and attached inputs to Codex CLI for one complete build. Follow progress and results in Terminal.' : 'Open AppYard on a Mac to send this brief to Codex CLI in Terminal.'}</p>
      {failed && <p className="codex-goal-error" role="alert">{goal.error || 'The workspace was saved, but Terminal could not be opened. Try again.'}</p>}
      <details className="codex-goal-details"><summary>How the handoff works <ChevronRight size={13}/></summary><p>Codex uses its own sign-in and model preferences and may ask you to sign in or trust the workspace. Each launch creates a new folder. AppYard does not track completion or verify the result.</p>{goal && <p className="codex-goal-path">{goal.workspace}</p>}</details>
      {pipelineRunning && <p className="codex-goal-wait">Stop the pipeline build before opening a new Codex goal.</p>}
    </div>
    <div className="codex-goal-actions">
      <button className="primary" type="button" disabled={busy || !desktop || pipelineRunning} onClick={launch}><TerminalSquare size={16}/>{busy ? 'Please wait…' : failed ? 'Try again in Terminal' : goal ? 'Open new Codex goal' : 'Open Codex goal'}</button>
      {goal && <button className="secondary" type="button" disabled={busy || !desktop} onClick={openWorkspace}><FolderOpen size={16}/>Open goal folder</button>}
    </div>
  </section>;
}
