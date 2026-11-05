import type { TestReport } from './types.js';
import { isDeterministicEvaluator } from './solution.js';
import type { EvaluationResult } from './solution.js';
import { meanEvaluationScore } from './evaluation-score.js';
import { visualReviewPassed } from './visual-review.js';

export function judgeAccepted(report?: TestReport): boolean {
  return report?.independentJudge?.verdict === 'SATISFACTORY';
}

/** Missing evaluation evidence also needs an explicit human decision. */
export function judgeGaps(report?: TestReport) {
  return report?.independentJudge?.gaps ?? [{ requirement: 'Independent check',
    evidence: 'No independent judgment was recorded for this build.',
    fix: 'Inspect the application and its evidence before accepting this prototype.' }];
}

const unitScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

/** Saved summaries must be supported by a complete set of case/trial observations. */
function evaluationEvidencePassed(result: EvaluationResult): boolean {
  if (!result || !['exact', 'numeric', 'schedule', 'classification', 'retrieval'].includes(result.evaluator)
    || result.status !== 'passed' || !unitScore(result.actual) || !unitScore(result.threshold) || result.threshold === 0
    || (result.baseline !== undefined && (!unitScore(result.baseline) || result.threshold < result.baseline))
    || !Number.isSafeInteger(result.trials) || result.trials < 1 || result.trials > 10
    || !Array.isArray(result.cases) || !result.cases.length || result.cases.length > 100 * result.trials) return false;
  const trialsByCase = new Map<string, Set<number>>();
  for (const entry of result.cases) {
    if (!entry || typeof entry.id !== 'string' || !entry.id.length
      || !Number.isSafeInteger(entry.trial) || entry.trial < 1 || entry.trial > result.trials
      || !unitScore(entry.score) || entry.passed !== (entry.score === 1)) return false;
    const trials = trialsByCase.get(entry.id) ?? new Set<number>();
    if (trials.has(entry.trial)) return false;
    trials.add(entry.trial);
    trialsByCase.set(entry.id, trials);
  }
  if (trialsByCase.size > 100 || [...trialsByCase.values()].some(trials => trials.size !== result.trials)
    || result.actual !== meanEvaluationScore(result.cases)) return false;
  if (isDeterministicEvaluator(result.evaluator) && (result.threshold !== 1 || result.actual !== 1
    || !result.cases.every(entry => entry.passed))) return false;
  return result.actual >= result.threshold && (result.baseline === undefined || result.actual >= result.baseline);
}

/** A legacy Node-only report is never enough for a run using the quality contract. */
export function reportPassed(report?: TestReport, requireQuality: boolean | 1 | 2 | 3 | 4 = false): boolean {
  if (!report || report.exitCode !== 0 || report.total <= 0 || report.passed <= 0 || report.failed !== 0 || report.skipped !== 0 || report.passed !== report.total) return false;
  if (!report.quality) return !requireQuality;
  const quality = report.quality;
  // A numeric requirement is the project's minimum evidence version; true retains legacy compatibility.
  if (typeof requireQuality === 'number' && quality.schemaVersion < requireQuality) return false;
  if (quality.schemaVersion === 4 && (!quality.experiment
    || !/^[A-Za-z0-9_-]{1,200}$/.test(quality.experiment.experimentId) || !/^[A-Za-z0-9_-]{1,200}$/.test(quality.experiment.candidateId)
    || ![quality.experiment.behaviorHash, quality.experiment.evaluationSetHash, quality.experiment.executionHash].every(hash => /^[a-f0-9]{64}$/.test(hash)))) return false;
  if (quality.status !== 'passed' || quality.errors.length !== 0
    || !quality.journeys.every(journey => journey.status === 'passed')
    || !quality.criteria.some(criterion => criterion.status === 'passed')
    || !quality.criteria.every(criterion => criterion.status === 'passed' || criterion.status === 'unverified')) return false;
  if (quality.schemaVersion === 1) return quality.journeys.length > 0;
  if (quality.schemaVersion !== 2 && quality.schemaVersion !== 3 && quality.schemaVersion !== 4) return false;
  const evaluation = quality.solutionEvaluation, delivery = quality.package, capabilities = quality.capabilities;
  if (!evaluation || evaluation.schemaVersion !== 1 || evaluation.status !== 'passed' || evaluation.errors.length !== 0
    || !delivery || delivery.status !== 'passed' || !delivery.cleanCopy || !delivery.filesHash
    || delivery.filesHash !== evaluation.runtime.filesHash || delivery.profile !== evaluation.runtime.profile
    || !capabilities?.length || !capabilities.some(capability => capability.required)) return false;
  if (quality.schemaVersion >= 3 && delivery.profile !== 'cli'
    && (quality.visualReview?.contractHash !== quality.contractHash || !visualReviewPassed(quality.visualReview, delivery.filesHash, 'verify',
      quality.visualReview?.schemaVersion === 2 ? [...new Set(quality.journeys.map(journey => journey.id))] : undefined))) return false;
  if (!Number.isSafeInteger(quality.expectedJourneys) || quality.expectedJourneys !== quality.journeys.length) return false;
  if (delivery.profile === 'cli' ? quality.expectedJourneys !== 0 : quality.expectedJourneys! < 4) return false;
  if (new Set(quality.journeys.map(journey => journey.id + '/' + journey.viewport)).size !== quality.journeys.length
    || quality.journeys.some(journey => !['desktop', 'narrow'].every(viewport => quality.journeys.some(other => other.id === journey.id && other.viewport === viewport)))) return false;
  if (new Set(capabilities.map(capability => capability.id)).size !== capabilities.length
    || new Set(evaluation.evaluations.map(item => item.id)).size !== evaluation.evaluations.length) return false;
  if (!evaluation.evaluations.every(evaluationEvidencePassed)) return false;
  const successfulEvaluation = (id: string, capabilityId: string, required: boolean) => {
    const result = evaluation.evaluations.find(item => item.id === id && item.capabilityId === capabilityId);
    return !!result && result.cases.length >= result.trials * (required ? 2 : 1);
  };
  for (const capability of capabilities) {
    const used = quality.criteria.some(criterion => criterion.capabilityIds?.includes(capability.id));
    if (!capability.required && !used) continue;
    if (capability.status !== 'passed' || !capability.evaluationIds.length || !capability.criterionIds.length
      || !evaluation.capabilities.some(item => item.id === capability.id && item.required === capability.required && item.status === 'passed')
      || !capability.evaluationIds.every(id => successfulEvaluation(id, capability.id, capability.required))
      || !capability.criterionIds.every(id => quality.criteria.some(criterion => criterion.criterionId === id && criterion.status === 'passed'
        && criterion.capabilityIds?.includes(capability.id)))) return false;
  }
  return quality.criteria.every(criterion => (criterion.capabilityIds ?? []).every(id => capabilities.some(capability => capability.id === id && capability.status === 'passed')));
}
