import type { AgentBackend, Project, StageId } from './types.js';

export type LearningPartition = 'development' | 'validation' | 'holdout' | 'test';
export type LearningMode = 'off' | 'paired' | 'adaptive';
export type ExperimentStatus = 'queued' | 'planning' | 'running' | 'comparing' | 'review' | 'promoting' | 'complete' | 'failed' | 'stopped';
export type CandidateStatus = 'queued' | 'running' | 'passed' | 'failed' | 'stopped';
export interface LearningSettings {
  schemaVersion: 1;
  mode: LearningMode;
  memoryEnabled: boolean;
  automaticComparisons: boolean;
  maxHumanRequestsPerDay: number;
}
export const defaultLearningSettings: LearningSettings = {
  schemaVersion: 1, mode: 'off', memoryEnabled: true, automaticComparisons: true, maxHumanRequestsPerDay: 2,
};
export interface PinnedModelConfig { backend: AgentBackend; provider: string; model: string }
export interface CandidateBudget { timeoutMs: number; maxModelCalls?: number; maxTokens?: number; maxCostUsd?: number }
export interface ArchitectureProfile {
  id: string; version: string; label: string; instructions: string; budget: CandidateBudget;
}
/** Host-only: never send executionState, workspaces, contracts or raw evidence through bootstrap. */
export interface ExperimentRecord {
  id: string; projectId: string; lineageId: string; partition: LearningPartition; cohortKey: string;
  mode: 'paired' | 'single' | 'adaptive' | 'holdout'; status: ExperimentStatus;
  baselineProfileId: string; candidateIds: string[]; createdAt: string; updatedAt: string;
  briefFingerprint?: string; modelConfig?: PinnedModelConfig; sharedWorkspace?: string; checkpointRef?: string;
  sharedExecutionState?: Project; objectiveHash?: string; memorySnapshotId?: string; policySnapshotId?: string;
  decisionId?: string; selectedCandidateId?: string; humanRequestAt?: string; error?: string;
  settingsSnapshot?: LearningSettings; profileSnapshots?: ArchitectureProfile[]; executionOrder?: string[];
  sourceProject?: Project; taskFamily?: string; runtimeConstraints?: string[]; budgetTier?: string;
  preferenceRequest?: PreferenceRequest;
  eligibleProfileIds?: string[]; comparisonProfileIds?: [string, string];
}
export interface CandidateOutcome {
  /** All mandatory host gates and required scope pass. Agent self-reports are not outcomes. */
  mandatoryPassed: boolean; requiredScopePassed: boolean; withinBudget: boolean;
  terminalReason: 'completed' | 'verification-failed' | 'build-failed' | 'timeout' | 'cancelled' | 'infrastructure';
  durationMs: number; costUsd: number | null; repairCount: number;
  sourceHash?: string; contractHash?: string; evidenceHash?: string; evaluatorVersion: string;
  recordedAt: string;
}
export interface CandidateRecord {
  id: string; experimentId: string; profileId: string; profileVersion: string; baseline: boolean;
  status: CandidateStatus; createdAt: string; updatedAt: string; stage?: StageId;
  budget?: CandidateBudget; workspace?: string; checkpointRef?: string; executionState?: Project;
  outcome?: CandidateOutcome; error?: string;
  integrationCalls?: number;
}
export interface PreferenceRecord {
  id: string; experimentId: string; candidateAId: string; candidateBId: string;
  sourceHashA: string; sourceHashB: string; choice: 'a' | 'b' | 'tie' | 'neither';
  reasonTags: string[]; note?: string; createdAt: string; presentationOrder: [string, string];
  sampling: 'targeted' | 'random-audit' | 'manual'; samplingProbability: number | null;
}
export interface PreferenceRequest {
  id: string; experimentId: string; createdAt: string; localDay: string;
  sampling: 'targeted' | 'random-audit'; samplingProbability: number | null;
  presentationOrder: [string, string]; sourceHashes: [string, string];
  status: 'pending' | 'answered' | 'skipped';
}
export type LessonStatus = 'proposed' | 'corroborated' | 'contradicted' | 'retired';
export interface EvidenceObservation {
  id: string; experimentId: string; candidateId: string; lineageId: string; partition: LearningPartition;
  cohortKey: string; profileId: string; sourceHash: string; evidenceHash: string;
  /** A host-allowlisted, generalized summary. No files, examples, answers, user text, or credentials. */
  summary: string; outcome: 'supported' | 'contradicted'; createdAt: string;
}
export interface LessonRecord {
  id: string; key: string; statement: string; conditions: string[]; taskFamily: string;
  profileIds: string[]; status: LessonStatus; observationIds: string[]; lineageIds: string[];
  explanation: 'observation' | 'hypothesis'; createdAt: string; updatedAt: string;
}
export interface MemorySnapshot {
  id: string; createdAt: string; taskFamily: string; lessonIds: string[];
  text: string; contentHash: string; policyVersion: string;
}
export interface EvidenceEdge {
  fromType: 'experiment' | 'candidate' | 'observation' | 'lesson' | 'policy' | 'memory'; fromId: string;
  relation: 'contains' | 'supports' | 'contradicts' | 'derived-from' | 'retrieved';
  toType: EvidenceEdge['fromType']; toId: string;
}
export interface CohortContext {
  taskFamily: string; runtimeConstraints: string[]; budgetTier: string;
  backend: AgentBackend; provider: string; model: string;
  profileVersions: Record<string, string>; evaluatorVersion: string; memoryPolicyVersion: string;
}
export interface ArmStatistics { profileId: string; successes: number; failures: number }
export interface PairwisePreferenceStatistics { profileAId: string; profileBId: string; aWins: number; bWins: number; ties: number; labels: number }
export interface PolicySnapshot {
  id: string; cohortKey: string; createdAt: string; baselineProfileId: string; profileIds: string[];
  validatedProfileIds: string[]; arms: ArmStatistics[]; preferences: PairwisePreferenceStatistics[];
  sourceExperimentIds: string[]; memorySnapshotId?: string; validation?: PromotionAssessment;
  status: 'shadow' | 'active' | 'invalidated' | 'rolled-back'; invalidationReason?: string;
  version: 1;
}
export interface PolicyDecision {
  id: string; experimentId: string; cohortKey: string; policySnapshotId: string; memorySnapshotId?: string;
  createdAt: string; mode: 'baseline' | 'paired' | 'adaptive'; selectedProfileId: string;
  probabilities: Record<string, number>; observationProbabilities: Record<string, number>;
  primaryDraw: number; comparisonDraw: number; comparisonProbability: number; compare: boolean;
  creditBefore: number; creditAfter: number; reason: string;
}
export interface PromotionAssessment {
  eligible: boolean; reasons: string[]; warmupPairs: number; validationPairs: number;
  validationLineages: number; proposedSuccesses: number; baselineRegressions: number;
  policySnapshotId?: string; memorySnapshotId?: string;
  /** Validation evidence affects eligibility but is never a fitting source. */
  validationExperimentIds?: string[];
}
export interface PromotionOutboxRecord {
  id: string; experimentId: string; candidateId: string; createdAt: string; status: 'pending' | 'applied';
  /** Host-owned projection to merge into state.json. Never executed as instructions. */
  payload: Record<string, unknown>; appliedAt?: string;
}
export interface ForgetResult { experimentIds: string[]; lessonIds: string[]; policyIds: string[]; memorySnapshotIds: string[] }
export interface CandidateSummary {
  id: string; profileId: string; profileVersion: string; baseline: boolean; status: CandidateStatus;
  stage?: StageId; success: boolean | null; durationMs?: number; costUsd?: number | null; error?: string;
  sourceHash?: string;
}
export interface ExperimentSummary {
  id: string; projectId: string; mode: ExperimentRecord['mode']; status: ExperimentStatus;
  candidates: CandidateSummary[]; selectedCandidateId?: string; createdAt: string; updatedAt: string;
  preferenceRequest?: PreferenceRequest;
}
