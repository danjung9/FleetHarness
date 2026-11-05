import { ArrowRight, Check, ClipboardCheck, Download, Play, Settings2, Square } from 'lucide-react';
import type { Project, View } from '../shared/types';
import { canContinuePlanning, experimentRunning, getJourneyState, journeySteps, pendingExperiment, resumeLabel, type Milestone } from '../shared/journey';
import { isDesktop } from './api';
import './journey.css';

export const milestoneViews: Record<Milestone, View> = {
  brief: 'requirements', build: 'factory', review: 'evidence', deliver: 'delivery'
};

export function JourneyHeader({ project, view, busy, configured, resuming, navigate, start, resume, stop }: {
  project: Project; view: View; busy: boolean; configured: boolean; resuming: boolean;
  navigate: (view: View) => void; start: () => void; resume: () => void; stop: () => void;
}) {
  const journey = getJourneyState(project);
  const continuingPlan = canContinuePlanning(project);
  const experiment = pendingExperiment(project);
  const pendingQuestion = project.status === 'running' && project.conversation?.questions.find(question => question.status === 'pending' && question.runId === project.runId);
  const startLabel = !isDesktop ? 'Desktop setup' : project.codexGoal
    ? !configured ? 'Connect pipeline model' : project.runId ? 'Start new pipeline' : 'Start pipeline'
    : !configured ? 'Connect model' : project.runId ? 'Start new build' : 'Start build';
  let nextAction = null;
  if (project.status === 'running' || experimentRunning(experiment)) {
    nextAction = <button className="secondary" disabled={busy} onClick={stop}><Square size={14}/>Stop build</button>;
  } else if (experiment) {
    nextAction = view !== 'evidence' ? <button className="primary" onClick={() => navigate('evidence')}><ClipboardCheck size={16}/>Review candidates</button> : null;
  } else if (view === 'requirements') {
    // The form saves its edits before offering the next build.
    nextAction = null;
  } else if (journey.resumeStage) {
    nextAction = <>
      {!continuingPlan && <button className="secondary" disabled={busy} onClick={() => isDesktop && configured ? start() : navigate('settings')}>{startLabel}</button>}
      <button className="primary" disabled={busy || !isDesktop || !configured} onClick={resume}><Play size={15}/>{resuming ? continuingPlan ? 'Continuing…' : 'Resuming…' : resumeLabel(journey.resumeStage, project)}</button>
    </>;
  } else if (journey.current === 'review' && view !== 'evidence') {
    nextAction = <button className="primary" onClick={() => navigate('evidence')}><ClipboardCheck size={16}/>Review build</button>;
  } else if (journey.current === 'deliver' && view !== 'delivery') {
    nextAction = <button className="primary" onClick={() => navigate('delivery')}><Download size={16}/>Go to delivery</button>;
  } else if (journey.current === 'brief' || journey.current === 'build') {
    nextAction = <button className="primary" disabled={busy} onClick={() => isDesktop && configured ? start() : navigate('settings')}>
      {isDesktop && configured ? <Play size={15}/> : <Settings2 size={16}/>} {startLabel}
    </button>;
  }
  const message = experiment ? journey.message : pendingQuestion ? `${pendingQuestion.phase === 'research' ? 'Research' : 'Planning'} is waiting for your answer in Project lead.` : journey.resumeStage && !isDesktop
    ? 'Your work is saved. Open the desktop app to resume this phase.' : journey.resumeStage && !configured
      ? 'Your work is saved. Connect a model in Settings to resume this phase.' : project.status === 'draft' && !isDesktop
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
      <p className="journey-message" role="status" aria-live="polite" aria-atomic="true">{project.codexGoal ? 'Pipeline comparison: ' : ''}{message}</p>
    </div>
  </section>;
}
