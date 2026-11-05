import { createHash, randomUUID } from 'node:crypto';
import type {
  ArmStatistics, CandidateRecord, CohortContext, ExperimentRecord, PairwisePreferenceStatistics,
  PolicyDecision, PolicySnapshot, PreferenceRecord, PromotionAssessment,
} from '../shared/learning.js';
import { candidateSucceeded, type LearningStore } from './learning-store.js';

const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
export function cohortKey(context: CohortContext): string {
  return createHash('sha256').update(canonical({ ...context, runtimeConstraints: [...context.runtimeConstraints].sort() })).digest('hex');
}
export function successEstimate(arm: ArmStatistics): number { return (arm.successes + 1) / (arm.successes + arm.failures + 2); }

/** Reliability is compared exactly. Preference labels cannot compensate for a lower success estimate. */
export function greedyProfile(policy: PolicySnapshot, eligible = policy.validatedProfileIds): string {
  const allowed = policy.profileIds.filter(id => eligible.includes(id));
  if (!allowed.length) return policy.baselineProfileId;
  const arm = (id: string) => policy.arms.find(item => item.profileId === id) ?? { profileId: id, successes: 0, failures: 0 };
  let best = allowed[0];
  for (const id of allowed.slice(1)) {
    const a = arm(id), b = arm(best);
    const difference = (a.successes + 1) * (b.successes + b.failures + 2) - (b.successes + 1) * (a.successes + a.failures + 2);
    if (difference > 0) best = id;
    else if (difference === 0) {
      const preference = policy.preferences.find(item => item.labels >= 3 && [item.profileAId, item.profileBId].includes(id) && [item.profileAId, item.profileBId].includes(best));
      const wins = (profile: string) => preference ? (preference.profileAId === profile ? preference.aWins : preference.bWins) : 0;
      if (wins(id) > wins(best) || (wins(id) === wins(best) && id === policy.baselineProfileId)) best = id;
    }
  }
  return best;
}

export interface FitPolicyInput {
  cohortKey: string; baselineProfileId: string; profileIds: string[]; memorySnapshotId?: string;
  validatedProfileIds?: string[]; id?: string; createdAt?: string;
}
export function fitPolicy(store: LearningStore, input: FitPolicyInput): PolicySnapshot {
  if (input.profileIds.length !== 2 || new Set(input.profileIds).size !== 2 || !input.profileIds.includes(input.baselineProfileId)) throw new Error('A policy requires two distinct architecture profiles and its baseline.');
  const experiments = store.listExperiments().filter(item => item.cohortKey === input.cohortKey && item.partition === 'development');
  const arms = input.profileIds.map(profileId => ({ profileId, successes: 0, failures: 0 }));
  const seen = new Set<string>(), sources = new Set<string>(), included = new Set<string>();
  // Repeated/resumed attempts from one task lineage do not manufacture independent evidence.
  for (const experiment of experiments) for (const candidate of store.listCandidates(experiment.id)) {
    const arm = arms.find(item => item.profileId === candidate.profileId), success = candidateSucceeded(candidate.outcome);
    const key = `${experiment.lineageId}\0${candidate.profileId}`;
    if (!arm || success === null || seen.has(key)) continue;
    seen.add(key); sources.add(experiment.id); included.add(candidate.id);
    if (success) arm.successes++; else arm.failures++;
  }
  const preference: PairwisePreferenceStatistics = { profileAId: input.profileIds[0], profileBId: input.profileIds[1], aWins: 0, bWins: 0, ties: 0, labels: 0 };
  const seenPreferenceLineages = new Set<string>();
  for (const label of store.listPreferences()) {
    const experiment = experiments.find(item => item.id === label.experimentId);
    if (!experiment || seenPreferenceLineages.has(experiment.lineageId) || !included.has(label.candidateAId) || !included.has(label.candidateBId) || label.choice === 'neither') continue;
    const a = store.getCandidate(label.candidateAId)!, b = store.getCandidate(label.candidateBId)!;
    if (!freshPreference(label, a, b)) continue;
    seenPreferenceLineages.add(experiment.lineageId); preference.labels++;
    if (label.choice === 'tie') { preference.aWins += 0.5; preference.bWins += 0.5; preference.ties++; }
    else {
      const winner = label.choice === 'a' ? a.profileId : b.profileId;
      if (winner === preference.profileAId) preference.aWins++; else preference.bWins++;
    }
  }
  return { id: input.id ?? `policy-${randomUUID()}`, cohortKey: input.cohortKey, createdAt: input.createdAt ?? new Date().toISOString(),
    baselineProfileId: input.baselineProfileId, profileIds: [...input.profileIds], validatedProfileIds: input.validatedProfileIds ?? [input.baselineProfileId],
    arms, preferences: [preference], sourceExperimentIds: [...sources], memorySnapshotId: input.memorySnapshotId, status: 'shadow', version: 1 };
}

function freshPreference(preference: PreferenceRecord, a: CandidateRecord, b: CandidateRecord): boolean {
  return !!candidateSucceeded(a.outcome) && !!candidateSucceeded(b.outcome)
    && preference.sourceHashA === a.outcome?.sourceHash && preference.sourceHashB === b.outcome?.sourceHash;
}

export interface DecisionOptions {
  experimentId: string; credit: number; mode?: 'baseline' | 'paired' | 'adaptive';
  automaticComparisons?: boolean; comparisonBudgetAvailable?: boolean; rolledBack?: boolean;
  memorySnapshotId?: string; random?: () => number; id?: string; createdAt?: string;
  /** Evaluate the frozen proposed router while executing both candidates; never fit on these outcomes. */
  prospectiveValidation?: boolean;
}
export function proposeDecision(policy: PolicySnapshot, options: DecisionOptions): PolicyDecision {
  if (policy.profileIds.length !== 2 || !policy.profileIds.includes(policy.baselineProfileId)) throw new Error('Policy must contain its baseline and one challenger.');
  if (!Number.isFinite(options.credit) || options.credit < 0 || options.credit > 1) throw new Error('Invalid comparison credits.');
  const random = options.random ?? Math.random;
  const primaryDraw = random(), comparisonDraw = random();
  if (![primaryDraw, comparisonDraw].every(value => Number.isFinite(value) && value >= 0 && value < 1)) throw new Error('Random draws must be in [0,1).');
  const adaptive = options.mode === 'adaptive' && policy.status === 'active' && !options.rolledBack;
  const mode = options.mode === 'paired' ? 'paired' : adaptive ? 'adaptive' : 'baseline';
  const eligible = options.prospectiveValidation && mode === 'paired' ? [...policy.profileIds]
    : adaptive ? policy.profileIds.filter(id => policy.validatedProfileIds.includes(id)) : [policy.baselineProfileId];
  if (!eligible.length) eligible.push(policy.baselineProfileId);
  const greedy = greedyProfile(policy, eligible);
  const probabilities = Object.fromEntries(policy.profileIds.map(id => [id, eligible.includes(id) ? Number((0.1 / eligible.length + (id === greedy ? 0.9 : 0)).toFixed(12)) : 0]));
  let cumulative = 0, selectedProfileId = eligible.at(-1)!;
  for (const id of policy.profileIds) { cumulative += probabilities[id]; if (primaryDraw < cumulative) { selectedProfileId = id; break; } }
  const earned = mode === 'paired' ? options.credit : Math.min(1, Math.round((options.credit + 0.1) * 1e10) / 1e10);
  const comparisonProbability = mode === 'paired' ? 1 : options.automaticComparisons && options.comparisonBudgetAvailable && earned >= 1 ? 0.1 : 0;
  const compare = comparisonDraw < comparisonProbability;
  const creditAfter = mode === 'paired' ? options.credit : compare ? earned - 1 : earned;
  return { id: options.id ?? `decision-${randomUUID()}`, experimentId: options.experimentId, cohortKey: policy.cohortKey,
    policySnapshotId: policy.id, memorySnapshotId: options.memorySnapshotId ?? policy.memorySnapshotId,
    createdAt: options.createdAt ?? new Date().toISOString(), mode, selectedProfileId, probabilities,
    observationProbabilities: Object.fromEntries(policy.profileIds.map(id => [id, probabilities[id] + (1 - probabilities[id]) * comparisonProbability])),
    primaryDraw, comparisonDraw, comparisonProbability, compare, creditBefore: options.credit, creditAfter,
    reason: mode === 'paired' ? 'Explicit paired experiment; both architecture outcomes are observed.' : adaptive
      ? 'Reliability-first epsilon-greedy routing; human preference only breaks exact reliability ties.' : 'Baseline fallback until this cohort has a validated active policy.' };
}

export interface ValidationPair {
  experiment: ExperimentRecord; candidates: CandidateRecord[]; decision: PolicyDecision;
}
/** Frozen prospective comparisons, not retrospective winner selection. No fitting on these outcomes. */
export function evaluatePromotion(policy: PolicySnapshot, development: { experiment: ExperimentRecord; candidates: CandidateRecord[] }[], validation: ValidationPair[]): PromotionAssessment {
  const warmup = new Set<string>();
  for (const pair of development) {
    if (pair.experiment.partition !== 'development' || pair.experiment.cohortKey !== policy.cohortKey) continue;
    if (!policy.sourceExperimentIds.includes(pair.experiment.id) || pair.candidates.some(candidate => candidate.outcome
      && (!Number.isFinite(Date.parse(candidate.outcome.recordedAt)) || Date.parse(candidate.outcome.recordedAt) > Date.parse(policy.createdAt)))) continue;
    if (policy.profileIds.every(profile => pair.candidates.some(candidate => candidate.profileId === profile && candidateSucceeded(candidate.outcome) !== null))) warmup.add(pair.experiment.lineageId);
  }
  const validationLineages = new Set<string>(), seenTasks = new Set<string>(), reasons: string[] = [];
  const armChecks = new Map(policy.profileIds.map(profileId => [profileId, { successes: 0, baselineRegressions: 0 }]));
  let validationPairs = 0, proposedSuccesses = 0, baselineRegressions = 0;
  for (const pair of validation) {
    const { experiment, decision } = pair;
    if (!['validation', 'holdout'].includes(experiment.partition) || experiment.cohortKey !== policy.cohortKey || warmup.has(experiment.lineageId)) continue;
    if (!Number.isFinite(Date.parse(experiment.createdAt)) || Date.parse(experiment.createdAt) < Date.parse(policy.createdAt)) continue;
    if (decision.policySnapshotId !== policy.id || decision.memorySnapshotId !== policy.memorySnapshotId || decision.experimentId !== experiment.id) continue;
    if (seenTasks.has(experiment.id)) continue;
    const baseline = pair.candidates.find(candidate => candidate.profileId === policy.baselineProfileId);
    const proposed = pair.candidates.find(candidate => candidate.profileId === decision.selectedProfileId);
    if (!baseline || !proposed || !policy.profileIds.every(profile => pair.candidates.some(candidate => candidate.profileId === profile && candidateSucceeded(candidate.outcome) !== null))) continue;
    // The proposed routing action must precede every candidate outcome in this comparison.
    if (!Number.isFinite(Date.parse(decision.createdAt)) || pair.candidates.some(candidate => !candidate.outcome
      || !Number.isFinite(Date.parse(candidate.outcome.recordedAt)) || Date.parse(decision.createdAt) > Date.parse(candidate.outcome.recordedAt))) continue;
    seenTasks.add(experiment.id); validationLineages.add(experiment.lineageId); validationPairs++;
    const success = candidateSucceeded(proposed.outcome);
    if (success) proposedSuccesses++;
    if (candidateSucceeded(baseline.outcome) && !success) baselineRegressions++;
    for (const [profileId, checks] of armChecks) {
      const armSuccess = candidateSucceeded(pair.candidates.find(candidate => candidate.profileId === profileId)!.outcome);
      if (armSuccess) checks.successes++;
      if (candidateSucceeded(baseline.outcome) && !armSuccess) checks.baselineRegressions++;
    }
  }
  if (warmup.size < 8) reasons.push('At least eight distinct development task lineages need paired outcomes.');
  if (validationPairs !== 12) reasons.push('Use one predeclared batch of exactly twelve fresh paired validation tasks.');
  if (validationLineages.size < 3) reasons.push('Validation requires at least three task lineages.');
  if (proposedSuccesses < 11) reasons.push('The proposed choices must succeed on at least eleven validation tasks.');
  if (baselineRegressions) reasons.push('A proposed choice failed where the baseline succeeded.');
  // Every arm remains reachable through epsilon exploration after promotion. A lucky
  // sample of proposed actions cannot validate an arm whose full-feedback checks failed.
  for (const [profileId, checks] of armChecks) {
    if (checks.successes < 11) reasons.push(`Architecture ${profileId} must succeed on at least eleven validation tasks before exploration.`);
    if (checks.baselineRegressions) reasons.push(`Architecture ${profileId} failed where the baseline succeeded.`);
  }
  return { eligible: reasons.length === 0, reasons, warmupPairs: warmup.size, validationPairs, validationLineages: validationLineages.size,
    proposedSuccesses, baselineRegressions, policySnapshotId: policy.id, memorySnapshotId: policy.memorySnapshotId, validationExperimentIds: [...seenTasks] };
}

/** Promotion produces a new snapshot; the original validated snapshot remains immutable. */
export function promotedPolicy(policy: PolicySnapshot, assessment: PromotionAssessment, id = `policy-${randomUUID()}`): PolicySnapshot {
  if (!assessment.eligible || assessment.policySnapshotId !== policy.id || assessment.memorySnapshotId !== policy.memorySnapshotId) throw new Error('Promotion assessment does not validate this frozen policy and memory.');
  return { ...structuredClone(policy), id, createdAt: new Date().toISOString(), validatedProfileIds: [...policy.profileIds], validation: structuredClone(assessment), status: 'shadow' };
}

export function selectCandidate(candidates: CandidateRecord[], preference?: PreferenceRecord): { candidateId?: string; reason: string } {
  const eligible = candidates.filter(candidate => candidate.status === 'passed' && candidateSucceeded(candidate.outcome));
  if (!eligible.length) return { reason: 'Neither architecture passed all mandatory gates within budget.' };
  if (eligible.length === 1) return { candidateId: eligible[0].id, reason: 'Only this architecture passed all mandatory gates within budget.' };
  if (preference && ['a', 'b'].includes(preference.choice)) {
    const a = eligible.find(item => item.id === preference.candidateAId), b = eligible.find(item => item.id === preference.candidateBId);
    if (a && b && freshPreference(preference, a, b)) return { candidateId: preference.choice === 'a' ? a.id : b.id, reason: 'Explicit human preference between two independently passing candidates.' };
  }
  return { candidateId: (eligible.find(item => item.baseline) ?? eligible[0]).id, reason: 'Both architectures pass; retain the baseline until an explicit human preference is recorded.' };
}
