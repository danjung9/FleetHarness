import type { Artifact, Project } from './types.js';
import type { ExperimentSummary, LearningSettings, PreferenceRecord } from './learning.js';
import type { IntegrationOperation } from './integration.js';

export interface ExperimentAvailability { available: boolean; reason?: string }
export interface ExperimentState {
  experiments: ExperimentSummary[];
  settings: LearningSettings;
  availability: ExperimentAvailability;
}
export interface CandidateReview {
  experimentId: string; candidateId: string; sourceHash?: string;
  project: Pick<Project, 'id' | 'title' | 'status' | 'stages' | 'logs' | 'runId' | 'model' | 'report' | 'visualReview' | 'runtimeProfile' | 'systemDesign' | 'error'>;
}
export interface ExperimentAPI {
  experimentState(projectId: string): Promise<ExperimentState>;
  startExperiment(projectId: string, input?: { mode?: 'paired' | 'adaptive'; requestId?: string }): Promise<ExperimentSummary>;
  resumeExperiment(experimentId: string): Promise<ExperimentSummary>;
  stopExperiment(experimentId: string): Promise<ExperimentSummary>;
  inspectCandidate(experimentId: string, candidateId: string): Promise<CandidateReview>;
  previewCandidate(experimentId: string, candidateId: string): Promise<string | null>;
  closeCandidatePreview(): Promise<void>;
  candidateArtifacts(experimentId: string, candidateId: string): Promise<Artifact[]>;
  readCandidateArtifact(experimentId: string, candidateId: string, file: string): Promise<string>;
  selectCandidate(experimentId: string, candidateId: string, sourceHash: string): Promise<ExperimentSummary>;
  submitExperimentPreference(experimentId: string, input: { requestId: string; choice: PreferenceRecord['choice']; reasonTags?: string[]; note?: string }): Promise<ExperimentSummary>;
  skipExperimentPreference(experimentId: string, requestId: string): Promise<ExperimentSummary>;
  saveLearningSettings(settings: LearningSettings): Promise<LearningSettings>;
  forgetProjectLearning(projectId: string): Promise<void>;
  rollbackLearningPolicy(projectId: string): Promise<void>;
  integrationOperations(): Promise<IntegrationOperation[]>;
  saveIntegrationOperation(operation: IntegrationOperation, secret?: string): Promise<IntegrationOperation[]>;
  removeIntegrationOperation(operationId: string): Promise<IntegrationOperation[]>;
}
export const experimentMethodNames = ['experimentState', 'startExperiment', 'resumeExperiment', 'stopExperiment', 'inspectCandidate', 'previewCandidate',
  'closeCandidatePreview', 'candidateArtifacts', 'readCandidateArtifact', 'selectCandidate', 'submitExperimentPreference', 'skipExperimentPreference',
  'saveLearningSettings', 'forgetProjectLearning', 'rollbackLearningPolicy', 'integrationOperations', 'saveIntegrationOperation', 'removeIntegrationOperation'] as const;
