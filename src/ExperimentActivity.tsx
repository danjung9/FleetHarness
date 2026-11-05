import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CandidateReview } from '../shared/experiments';
import type { ExperimentSummary } from '../shared/learning';
import { buildActivity, stageNames } from '../shared/activity';
import { experimentMessage, experimentRunning } from '../shared/journey';
import { ActivityFeed } from './ActivityFeed';
import { api } from './api';
import './experiments.css';

const labels: Record<string, string> = { queued: 'Queued', running: 'Building', passed: 'Passed', failed: 'Needs attention', stopped: 'Stopped' };

/** Render candidate checkpoints, never the previous build's retained activity. */
export function ExperimentActivity({ experiment, onReview }: { experiment: ExperimentSummary; onReview: () => void }) {
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<CandidateReview>();
  const [error, setError] = useState('');
  const candidates = experiment.preferenceRequest
    ? [...experiment.candidates].sort((a, b) => experiment.preferenceRequest!.presentationOrder.indexOf(a.id) - experiment.preferenceRequest!.presentationOrder.indexOf(b.id))
    : experiment.candidates;
  const candidate = candidates.find(item => item.id === selected) ?? candidates.find(item => item.status === 'running') ?? candidates[0];
  const live = experimentRunning(experiment);
  useEffect(() => {
    let alive = true, timer: ReturnType<typeof setTimeout>;
    setDetail(undefined); setError('');
    async function load() {
      if (!candidate || candidate.status === 'queued') return;
      try {
        const next = await api.inspectCandidate(experiment.id, candidate.id);
        if (alive) { setDetail(next); setError(''); }
      } catch (failure) { if (alive) setError(failure instanceof Error ? failure.message : String(failure)); }
      if (alive && live) timer = setTimeout(() => void load(), 2500);
    }
    void load();
    return () => { alive = false; clearTimeout(timer); };
  }, [experiment.id, candidate?.id, candidate?.status, live]);
  const activity = detail && detail.candidateId === candidate?.id
    ? buildActivity(detail.project.logs, detail.project.status, candidate.stage) : [];
  return <div className="page agents-page">
    <div className="page-heading"><div><h1>Candidate activity</h1><p>{experimentMessage(experiment)}</p></div>
      <button className="secondary" onClick={onReview}>Open candidate review<ArrowRight size={15}/></button></div>
    {candidates.length > 0 && <div className="candidate-switch" role="group" aria-label="Choose candidate activity">
      {candidates.map((item, index) => <button key={item.id} type="button" aria-pressed={item.id === candidate?.id} onClick={() => setSelected(item.id)}>
        <strong>Candidate {String.fromCharCode(65 + index)}</strong><span>{labels[item.status] ?? item.status}{item.stage ? ` · ${stageNames[item.stage]}` : ''}</span>
      </button>)}
    </div>}
    <div className="activity-toolbar"><div className="activity-toolbar-heading"><h2>{candidate ? 'Candidate work' : 'Shared planning'}</h2></div>
      <p className="experiment-note">Select a passing candidate in Review before approving the project build.</p></div>
    {error && <p className="experiment-error" role="alert">Activity could not be loaded. {error}</p>}
    <div className="transcript"><ActivityFeed key={candidate?.id ?? experiment.id} items={activity} live={live && candidate?.status === 'running'}
      emptyTitle={candidate ? candidate.status === 'queued' ? 'Candidate queued' : 'Waiting for candidate activity' : 'Preparing the shared plan'}
      emptyDescription={candidate ? 'Saved messages and tool results appear here as this candidate progresses.' : 'The shared brief and checks are prepared before each candidate builds independently.'}/></div>
  </div>;
}
