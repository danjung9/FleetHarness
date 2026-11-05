import type { TestReport } from './types.js';

/** A legacy Node-only report is never enough for a run using the quality contract. */
export function reportPassed(report?: TestReport, requireQuality = false): boolean {
  if (!report || report.exitCode !== 0 || report.total <= 0 || report.passed <= 0 || report.failed !== 0 || report.skipped !== 0 || report.passed !== report.total) return false;
  if (report.independentJudge && report.independentJudge.verdict !== 'SATISFACTORY') return false;
  if (!report.quality) return !requireQuality;
  const quality = report.quality;
  if (quality.status !== 'passed' || quality.errors.length !== 0
    || !quality.journeys.every(journey => journey.status === 'passed')
    || !quality.criteria.some(criterion => criterion.status === 'passed')
    || !quality.criteria.every(criterion => criterion.status === 'passed' || criterion.status === 'unverified')) return false;
  if (quality.schemaVersion === 1) return quality.journeys.length > 0;
  if (quality.schemaVersion !== 2) return false;
  const evaluation = quality.solutionEvaluation, delivery = quality.package, capabilities = quality.capabilities;
  if (!evaluation || evaluation.schemaVersion !== 1 || evaluation.status !== 'passed' || evaluation.errors.length !== 0
    || !delivery || delivery.status !== 'passed' || !delivery.cleanCopy || !delivery.filesHash
    || delivery.filesHash !== evaluation.runtime.filesHash || delivery.profile !== evaluation.runtime.profile
    || !capabilities?.length || !capabilities.some(capability => capability.required)) return false;
  if (!Number.isSafeInteger(quality.expectedJourneys) || quality.expectedJourneys !== quality.journeys.length) return false;
  if (delivery.profile === 'cli' ? quality.expectedJourneys !== 0 : quality.expectedJourneys! < 4) return false;
  if (new Set(quality.journeys.map(journey => journey.id + '/' + journey.viewport)).size !== quality.journeys.length
    || quality.journeys.some(journey => !['desktop', 'narrow'].every(viewport => quality.journeys.some(other => other.id === journey.id && other.viewport === viewport)))) return false;
  if (new Set(capabilities.map(capability => capability.id)).size !== capabilities.length
    || new Set(evaluation.evaluations.map(item => item.id)).size !== evaluation.evaluations.length) return false;
  const successfulEvaluation = (id: string, capabilityId: string, required: boolean) => {
    const result = evaluation.evaluations.find(item => item.id === id && item.capabilityId === capabilityId);
    return !!result && result.status === 'passed' && Number.isFinite(result.actual) && Number.isFinite(result.threshold)
      && result.actual >= result.threshold && (result.baseline === undefined || result.actual >= result.baseline)
      && Number.isSafeInteger(result.trials) && result.trials > 0 && result.cases.length >= result.trials * (required ? 2 : 1);
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
