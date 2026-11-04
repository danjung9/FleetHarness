import { useEffect, useId, useMemo, useState } from 'react';
import { Activity, ArrowRight, Check, ChevronRight, FileText, Pause, RefreshCw, XCircle } from 'lucide-react';
import type { Artifact, Project, StageId, StageStatus } from '../shared/types';
import { buildActivity } from '../shared/activity';
import { api } from './api';
import { ActivityFeed } from './ActivityFeed';
import { PhaseDetails, projectPhases } from './PhaseDetails';
import { SystemDesign } from './SystemDesign';
import './activity.css';
import './build-flow.css';

type BuildPhaseId = Exclude<StageId, 'review' | 'deliver'>;
type PhaseState = StageStatus | 'stopped';

const phases: { id: BuildPhaseId; name: string; purpose: string; files: string[]; next: string }[] = [
  { id: 'intake', name: 'Understand brief', purpose: 'Define the app’s scope, constraints, and intended outcomes from your brief.', files: ['scope.md'], next: 'Research starts automatically once the scope is ready.' },
  { id: 'research', name: 'Research', purpose: 'Assess reusable approaches, source evidence, and integration risks.', files: ['research.md'], next: 'Planning starts automatically once the research is ready.' },
  { id: 'plan', name: 'Plan', purpose: 'Map the app’s components, user tasks, and acceptance checks before implementation.', files: ['plan.md', 'test-matrix.md', 'acceptance-plan.json', 'ux-spec.json'], next: 'Implementation starts automatically once the plan is ready.' },
  { id: 'build', name: 'Implement', purpose: 'Create the working app, its application tests, and a guide to using it.', files: ['index.html', 'README.md'], next: 'Testing starts automatically once the implementation is ready.' },
  { id: 'verify', name: 'Test', purpose: 'Run the application tests and planned browser checks, then repair failures once if needed.', files: ['test-report.json', 'verification.md'], next: 'Your review comes next when the automated checks pass.' },
];

function stateOf(project: Project, id: BuildPhaseId): PhaseState {
  if (project.status === 'draft') return 'queued';
  const state = project.stages.find(stage => stage.id === id)?.status ?? 'queued';
  return project.status === 'stopped' && (state === 'active' || state === 'failed') ? 'stopped' : state;
}

function stateLabel(state: PhaseState, started: boolean) {
  return state === 'complete' ? 'Complete' : state === 'active' ? 'Working now' : state === 'failed' ? 'Needs attention' : state === 'stopped' ? 'Stopped' : started ? 'Coming up' : 'Not started';
}

function PhaseMarker({ state, number }: { state: PhaseState; number: number }) {
  return state === 'complete' ? <Check size={16} aria-hidden="true"/> : state === 'active' ? <Activity size={16} aria-hidden="true"/> : state === 'failed' ? <XCircle size={16} aria-hidden="true"/> : state === 'stopped' ? <Pause size={15} aria-hidden="true"/> : <span aria-hidden="true">{number}</span>;
}

export function BuildFlow({ project, onPreview, onArtifact, onReview, onEditBrief }: {
  project: Project;
  onPreview: () => void;
  onArtifact: (path: string) => void;
  onReview: () => void;
  onEditBrief: () => void;
}) {
  const detailId = useId();
  const runKey = project.id + ':' + (project.runId ?? 'new') + (project.status === 'draft' ? ':draft' : '');
  const stageRevision = project.stages.map(stage => stage.id + ':' + stage.status).join('|');
  const currentId = (project.status === 'draft' ? 'intake' :
    phases.find(phase => ['active', 'failed', 'stopped'].includes(stateOf(project, phase.id)))?.id ??
    phases.find(phase => stateOf(project, phase.id) !== 'complete')?.id ?? 'verify') as BuildPhaseId;
  const [inspection, setInspection] = useState<{ key: string; id: BuildPhaseId } | null>(null);
  const selectedId = inspection?.key === runKey ? inspection.id : currentId;
  const selected = phases.find(phase => phase.id === selectedId)!;
  const selectedState = stateOf(project, selectedId);
  const activeId = project.stages.find(stage => stage.status === 'active')?.id;
  const contracts = useMemo(() => projectPhases(project), [project.phasePlan, project.challengeId, project.sourceChallenge]);
  const contract = contracts.find(phase => phase.id === selectedId);
  const activity = useMemo(() => buildActivity(project.logs, project.status, activeId).filter(item => item.stage === selectedId), [project.logs, project.status, activeId, selectedId]);
  const [artifactState, setArtifactState] = useState<{ key: string; files: Artifact[]; error: boolean; loading: boolean }>({ key: runKey, files: [], error: false, loading: true });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setArtifactState(previous => previous.key === runKey ? previous : { key: runKey, files: [], error: false, loading: true });
    async function refresh() {
      try {
        const files = await api.artifacts(project.id);
        if (!cancelled) setArtifactState({ key: runKey, files, error: false, loading: false });
      } catch {
        if (!cancelled) setArtifactState(previous => ({ key: runKey, files: previous.key === runKey ? previous.files : [], error: true, loading: false }));
      }
      if (!cancelled && project.status === 'running') timer = setTimeout(refresh, 3000);
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [project.id, project.status, runKey, stageRevision, reload]);

  const files = artifactState.key === runKey ? artifactState.files : [];
  const outputs = selected.files.filter(path => files.some(file => file.path === path));
  const previousBuild = project.status === 'draft' && !!project.runId;
  const completed = project.status === 'draft' ? 0 : phases.filter(phase => stateOf(project, phase.id) === 'complete').length;
  const repair = project.status === 'running' && selectedId === 'verify' && selectedState === 'active' &&
    project.logs.some(log => log.stage === 'verify' && log.kind === 'info' && /^Verification failed\. Starting one (?:Codex|Pi) repair attempt\.$/.test(log.text));
  const blocked = selectedState === 'failed' || selectedState === 'stopped';
  const following = selectedId === currentId;
  const currentName = phases.find(phase => phase.id === currentId)!.name;
  const canPreview = selectedId === 'build' && files.some(file => file.path === 'index.html');

  return <div className="build-flow">
    <section className="build-sequence" aria-labelledby={detailId + '-sequence'}>
      <div className="build-sequence-heading"><h2 id={detailId + '-sequence'}>Build phases</h2><span>{completed} of 5 complete</span></div>
      <ol className="build-phase-list">
        {phases.map((phase, index) => {
          const state = stateOf(project, phase.id);
          return <li key={phase.id}>
            <button type="button" className={'build-phase-row ' + state} onClick={() => setInspection({ key: runKey, id: phase.id })}
              aria-pressed={selectedId === phase.id} aria-controls={detailId} aria-label={phase.name + ': ' + stateLabel(state, !!project.runId && project.status !== 'draft')}>
              <span className="build-phase-marker"><PhaseMarker state={state} number={index + 1}/></span>
              <span className="build-phase-copy"><strong>{phase.name}</strong><span>{stateLabel(state, !!project.runId && project.status !== 'draft')}</span></span>
              <ChevronRight className="build-phase-chevron" size={15} aria-hidden="true"/>
            </button>
          </li>;
        })}
      </ol>
      <p className="build-sequence-note">These phases run automatically.<br/>Your review follows testing.</p>
    </section>

    <section className="build-phase-detail" id={detailId} aria-labelledby={detailId + '-title'}>
      {!following && <div className="build-inspection-note"><span>{project.status === 'running' ? currentName + ' is running.' : 'Viewing another phase.'}</span><button className="text-button" type="button" onClick={() => setInspection(null)}>Back to current phase <ArrowRight size={14}/></button></div>}
      <header className="build-detail-heading"><h2 id={detailId + '-title'}>{selected.name}</h2><span className={'build-detail-state ' + selectedState}>{stateLabel(selectedState, !!project.runId && project.status !== 'draft')}</span></header>
      <p className="build-purpose">{selected.purpose}</p>
      {blocked ? <div className="build-phase-problem" role="status"><strong>{selectedState === 'stopped' ? 'This build was stopped.' : 'This phase needs attention.'}</strong>{project.error && <p>{project.error}</p>}<p>Saved outputs remain available. Start a new build when you’re ready to try again.</p></div> :
        <p className="build-next-phase">{repair ? 'Fixing failed checks · repair attempt 1 of 1. AppYard will run the checks again automatically.' : selectedState === 'complete' ? selectedId === 'verify' ? 'Automated checks are complete. Review the app and evidence before approving delivery.' : 'AppYard has finished this phase.' : selected.next}</p>}

      <section className="build-phase-output" aria-labelledby={detailId + '-outputs'}>
        <div className="build-output-heading"><h3 id={detailId + '-outputs'}>{previousBuild ? 'Previous build outputs' : 'Outputs'}</h3>
          {canPreview && <button type="button" className="text-button" onClick={onPreview}>Try app <ArrowRight size={14}/></button>}
          {selectedId === 'verify' && project.report && <button type="button" className="text-button" onClick={onReview}>Inspect test evidence <ArrowRight size={14}/></button>}
        </div>
        {outputs.length > 0 ? <ul className="build-output-list">{outputs.map(path => <li key={path}><button type="button" onClick={() => onArtifact(path)}><FileText size={16} aria-hidden="true"/><span>{path}</span><ArrowRight size={14} aria-hidden="true"/></button></li>)}</ul> : <p className="build-output-empty">{artifactState.loading ? 'Checking for saved outputs…' : artifactState.error ? 'Outputs could not be loaded.' : project.status === 'draft' ? 'Outputs will appear as your build progresses.' : selectedState === 'queued' ? 'Outputs will appear when this phase runs.' : selectedState === 'active' ? 'The agent is working. Saved outputs will appear here.' : 'No outputs are available for this phase.'}</p>}
        {artifactState.error && <button className="text-button" type="button" onClick={() => setReload(value => value + 1)}><RefreshCw size={13}/>Reload outputs</button>}
        {selectedId === 'intake' && project.status === 'draft' && <button className="text-button build-edit-brief" type="button" onClick={onEditBrief}>Edit brief <ArrowRight size={14}/></button>}
      </section>

      {selectedId === 'plan' && project.systemDesign && <details className="build-disclosure" key={runKey + '-design'}><summary>System design<ChevronRight size={15} aria-hidden="true"/></summary><SystemDesign project={project}/></details>}
      <details className="build-disclosure" key={runKey + selectedId + '-activity'}><summary><span>{previousBuild ? 'Previous build activity' : 'Activity'}{activity.length > 0 && <span className="build-disclosure-count">{activity.length}</span>}</span><ChevronRight size={15} aria-hidden="true"/></summary><div className="build-activity"><ActivityFeed items={activity} live={project.status === 'running' && selectedState === 'active'} emptyDescription="Updates appear here when this phase begins."/></div></details>
      {contract && <details className="build-disclosure" key={runKey + selectedId + '-configuration'}><summary>Phase details<ChevronRight size={15} aria-hidden="true"/></summary><div className="build-configuration"><p className="build-phase-role">{contract.role}</p><PhaseDetails phase={contract} globalTools={project.globalTools} legacy={!!project.runId && !project.phasePlan}/></div></details>}
    </section>
  </div>;
}
