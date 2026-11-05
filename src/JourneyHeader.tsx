import { ArrowRight, Check, ClipboardCheck, Download, Pause, Play, Settings2, ShieldCheck, Square } from 'lucide-react';
import type { Project, View } from '../shared/types';
import { getJourneyState, journeySteps, type Milestone } from '../shared/journey';
import { isDesktop, isHosted } from './api';
import './journey.css';

export const milestoneViews: Record<Milestone, View> = {
  brief: 'requirements', build: 'factory', review: 'evidence', deliver: 'delivery'
};

export function JourneyHeader({ project, view, busy, configured, navigate, start, stop, resume }: {
  project: Project; view: View; busy: boolean; configured: boolean;
  navigate: (view: View) => void; start: () => void; stop: () => void; resume?: () => void;
}) {
  const journey = getJourneyState(project, { hosted: isHosted });
  const canBuild = isDesktop || isHosted;
  const startLabel = !canBuild ? 'Desktop setup' : !configured ? 'Connect model' : project.runId ? 'Start new build' : 'Start build';
  const pendingQuestion = project.status === 'running' && project.conversation?.questions.find(question => question.status === 'pending' && question.runId === project.runId);
  let nextAction = null;
  if (project.status === 'running') {
    nextAction = <button className="secondary" disabled={busy} onClick={stop}>{isHosted ? <Pause size={14}/> : <Square size={14}/>} {isHosted ? 'Pause build' : 'Stop build'}</button>;
  } else if (project.status === 'pausing') {
    nextAction = <button className="secondary" disabled><Pause size={14}/>Saving checkpoint…</button>;
  } else if (isHosted && project.canResume && resume && ['paused', 'failed', 'stopped'].includes(project.status)) {
    nextAction = <button className="primary" disabled={busy} onClick={() => configured ? resume() : navigate('settings')}><Play size={15}/>{configured ? 'Resume build' : 'Connect model'}</button>;
  } else if (view === 'requirements') {
    // The form saves its edits before offering the next build.
    nextAction = null;
  } else if (journey.current === 'review' && view !== 'evidence') {
    nextAction = <button className="primary" onClick={() => navigate('evidence')}><ClipboardCheck size={16}/>Review build</button>;
  } else if (journey.current === 'deliver' && view !== 'delivery') {
    nextAction = <button className="primary" onClick={() => navigate('delivery')}><Download size={16}/>Go to delivery</button>;
  } else if (journey.current === 'brief' || journey.current === 'build') {
    nextAction = <button className="primary" disabled={busy} onClick={() => canBuild && configured ? start() : navigate('settings')}>
      {canBuild && configured ? <Play size={15}/> : <Settings2 size={16}/>} {startLabel}
    </button>;
  }
  const message = pendingQuestion ? 'Waiting for your answer. Open Project lead to continue this build.' : project.status === 'draft' && !canBuild
    ? 'Brief saved in this browser. Open the desktop app to build.'
    : project.status === 'draft' && !configured
      ? 'Brief saved. Connect a model when you’re ready to build.' : journey.message;
  return <section className="run-header journey-header" aria-label="Challenge journey">
    <div className="journey-heading"><div className="run-title"><h1>{project.title}</h1></div><div className="journey-action">{nextAction}</div></div>
    <div className="journey-progress">
      <nav className="journey-steps" aria-label="Challenge progress">
        {journeySteps.map((step, index) => <div className="journey-step" key={step.id}>
          {index > 0 && <ArrowRight className="journey-connector" size={13} aria-hidden="true"/>}
          <button type="button" aria-current={journey.current === step.id ? 'step' : undefined}
            aria-pressed={view === milestoneViews[step.id]} className={view === milestoneViews[step.id] ? 'is-viewed' : ''}
            title={`${step.label}${journey.current === step.id ? ' · Current step' : journey.completed.includes(step.id) ? ' · Complete' : ''}`}
            onClick={() => navigate(milestoneViews[step.id])}>
            <span className="journey-index" aria-hidden="true">{journey.completed.includes(step.id) ? <Check size={12}/> : index + 1}</span>{step.label}
          </button>
        </div>)}
      </nav>
      <p className="journey-message" role="status" aria-live="polite" aria-atomic="true">{message}</p>
    </div>
    {isHosted && project.status === 'running' && <p className="cloud-run-note"><ShieldCheck size={13}/>Running in the cloud. Closing this page or signing out won’t interrupt the build.</p>}
  </section>;
}
