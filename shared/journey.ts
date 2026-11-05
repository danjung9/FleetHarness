import type { Project, StageId } from './types.js';
import { reportPassed } from './verification.js';

export type Milestone = 'brief' | 'build' | 'review' | 'deliver';
export interface JourneyState {
  current: Milestone;
  completed: Milestone[];
  activeStage?: StageId;
  resumeStage?: StageId;
  message: string;
  stale: boolean;
}

export const journeySteps: ReadonlyArray<{ id: Milestone; label: string }> = [
  { id: 'brief', label: 'Brief' },
  { id: 'build', label: 'Build' },
  { id: 'review', label: 'Review' },
  { id: 'deliver', label: 'Deliver' }
];

const buildMessages: Partial<Record<StageId, string>> = {
  intake: 'Understanding your brief. Research comes next automatically.',
  research: 'Researching your challenge. Planning comes next automatically.',
  plan: 'Planning the app. Implementation comes next automatically.',
  build: 'Building the app. Testing comes next automatically.',
  verify: 'Testing the app. Your review comes next when checks pass.'
};

const resumeNames: Partial<Record<StageId, string>> = {
  intake: 'intake', research: 'research', plan: 'planning', build: 'implementation', verify: 'testing'
};

export function getResumeStage(project: Project): StageId | undefined {
  if (!['failed', 'stopped'].includes(project.status) || !project.runId || !project.workspace) return undefined;
  return project.resumeStage && project.resumeStage in resumeNames ? project.resumeStage : undefined;
}

export function resumeLabel(stage: StageId): string {
  return `Resume ${resumeNames[stage] ?? 'phase'}`;
}

function deliveryMessage(project: Project, appSaved: boolean): string {
  if (project.runtimeProfile && project.runtimeProfile !== 'browser') return project.exportedTo
    ? 'Runnable package and evidence exported. Follow README.md to start the solution.'
    : 'Build approved. Export the runnable package when you’re ready.';
  if (project.executable?.status === 'packaging') return project.exportedTo
    ? 'Source and evidence exported. Packaging your app…'
    : 'Packaging your app. The download will be saved automatically.';
  if (project.executable?.status === 'failed') return project.exportedTo
    ? 'Source and evidence exported. App download failed; you can retry.'
    : 'App download failed. Retry the download when you’re ready.';
  if (appSaved && project.exportedTo) return 'App saved. Source and evidence exported.';
  if (appSaved) return 'App saved. Your download is ready to open.';
  if (project.exportedTo) return 'Source and evidence exported. You can also download the app.';
  return 'Build approved. Download the app when you’re ready.';
}

/** Run status wins over retained artifacts and stage records from an earlier build. */
export function getJourneyState(project: Project, { hosted = false }: { hosted?: boolean } = {}): JourneyState {
  if (project.status === 'draft') {
    const stale = Boolean(project.runId);
    return { current: 'brief', completed: [], stale, message: stale
      ? 'Brief updated. Start a new build to use these changes.'
      : 'Brief saved. Start the build when you’re ready.' };
  }

  if (project.status === 'approved' || project.status === 'delivered') {
    const appSaved = project.executable?.status === 'ready' && Boolean(project.executable.savedTo);
    return { current: 'deliver', completed: appSaved || project.exportedTo
      ? ['brief', 'build', 'review', 'deliver'] : ['brief', 'build', 'review'],
    activeStage: 'deliver', message: hosted ? 'Build approved. Download the source and evidence or share the app.' : deliveryMessage(project, appSaved), stale: false };
  }

  const passed = reportPassed(project.report, project.qualityVersion ?? false);
  if (project.status === 'review' && (project.workspace || (hosted && project.runId)) && passed) {
    return { current: 'review', completed: ['brief', 'build'], activeStage: 'review',
      message: 'Your review is needed. Try the app and check the evidence.', stale: false };
  }

  const buildStages = project.stages.filter(stage => stage.id in buildMessages).reverse();
  const resumeStage = getResumeStage(project);
  const activeStage = resumeStage ?? (project.status === 'running'
    ? buildStages.find(stage => stage.status === 'active')
    : buildStages.find(stage => stage.status === 'failed')
      ?? buildStages.find(stage => stage.status === 'active'))?.id;
  let message: string;
  if (project.status === 'pausing') {
    message = 'Stopping the active phase and saving the latest checkpoint. You can leave this page.';
  } else if (project.status === 'paused' || (hosted && project.canResume)) {
    message = project.canResume ? 'Checkpoint saved. Resume when you’re ready; an interrupted phase may restart.' : 'Build paused without a resumable checkpoint. Start a new build to continue.';
  } else if (project.status === 'stopped') {
    message = resumeStage
      ? `Build stopped. ${resumeLabel(resumeStage)} to continue with your saved work.`
      : 'Build stopped. Your files are kept; start a new build when ready.';
  } else if (project.status === 'failed') {
    message = resumeStage
      ? `Build needs attention. ${resumeLabel(resumeStage)} to retry this phase with your saved work.`
      : 'Build needs attention. Inspect the details, then start a new build.';
  } else if (project.status === 'review') {
    message = 'Verification needs attention. Start a new build before review.';
  } else if (activeStage === 'verify' && project.report && !passed) {
    message = 'Repairing the app after failed checks. Testing will run again automatically.';
  } else if (activeStage) {
    message = buildMessages[activeStage]!;
  } else if (passed) {
    message = 'Checks passed. Preparing your review.';
  } else {
    message = 'The build is progressing automatically. Your review comes after testing.';
  }
  return { current: 'build', completed: ['brief'], activeStage, resumeStage, message, stale: false };
}
