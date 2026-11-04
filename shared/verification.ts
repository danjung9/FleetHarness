import type { TestReport } from './types.js';

/** A legacy Node-only report is never enough for a run using the quality contract. */
export function reportPassed(report?: TestReport, requireQuality = false): boolean {
  if (!report || report.exitCode !== 0 || report.total <= 0 || report.passed <= 0 || report.failed !== 0 || report.skipped !== 0 || report.passed !== report.total) return false;
  if (!report.quality) return !requireQuality;
  const quality = report.quality;
  return quality.schemaVersion === 1 && quality.status === 'passed' && quality.errors.length === 0
    && quality.journeys.length > 0 && quality.journeys.every(journey => journey.status === 'passed')
    && quality.criteria.some(criterion => criterion.status === 'passed')
    && quality.criteria.every(criterion => criterion.status === 'passed' || criterion.status === 'unverified');
}
