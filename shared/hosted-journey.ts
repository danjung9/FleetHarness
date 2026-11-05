import type { Project, StageId, StageStatus } from './types.js';
import type { JourneyState } from './journey.js';

const buildStages = ['intake', 'research', 'plan', 'build', 'verify'] as const;
type BuildStage = typeof buildStages[number];

// checkpointStage records the last saved phase, not the phase to resume.
function unfinishedStage(project: Project): BuildStage | undefined {
  return buildStages.find(id => project.stages.find(stage => stage.id === id)?.status !== 'complete');
}

export function getHostedResumeStage(project: Project): BuildStage | undefined {
  return project.canResume && ['paused', 'failed', 'stopped'].includes(project.status)
    ? unfinishedStage(project) ?? 'verify' : undefined;
}

export function hostedPhaseState(project: Project, id: BuildStage): StageStatus | 'paused' | 'pausing' {
  if (project.status === 'draft') return 'queued';
  const state = project.stages.find(stage => stage.id === id)?.status ?? 'queued';
  if (state === 'complete') return state;
  if (['paused', 'pausing'].includes(project.status) && unfinishedStage(project) === id) return project.status as 'paused' | 'pausing';
  return state;
}

/** Hosted runs have durable checkpoints and no local workspace path. */
export function getHostedJourneyState(project: Project): JourneyState {
  if (project.status === 'draft') return { current: 'brief', completed: [], stale: !!project.runId,
    message: project.runId ? 'Brief updated. Start a new build to use these changes.' : 'Your brief is saved to your account.' };
  if (project.status === 'approved' || project.status === 'delivered') return {
    current: 'deliver', completed: ['brief', 'build', 'review'], activeStage: 'deliver', stale: false,
    message: 'Approved for prototype delivery. Download the saved source and evidence.' };
  // Evidence must stay accessible even when checks failed; approval has its own gate.
  if (project.status === 'review') return { current: 'review', completed: ['brief', 'build'], activeStage: 'review', stale: false,
    message: 'Inspect the app and its verification evidence before approval.' };
  const resumeStage = getHostedResumeStage(project);
  const activeStage: StageId | undefined = resumeStage ?? unfinishedStage(project);
  return { current: 'build', completed: ['brief'], activeStage, resumeStage, stale: false,
    message: project.status === 'pausing' ? 'Saving a durable checkpoint before pausing.'
      : resumeStage ? 'Your checkpoint is saved. Resume continues with the original model.'
      : project.status === 'running' ? 'Building in a cloud sandbox. You can close this page or sign out.'
      : 'Inspect the build details and saved outputs.' };
}
