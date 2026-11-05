import type { RuntimeManifest, SolutionEvaluationReport } from './solution.js';

export type BrowserStep =
  | { action: 'fill'; selector: string; value: string }
  | { action: 'click'; selector: string }
  | { action: 'select'; selector: string; value: string }
  | { action: 'press'; selector: string; key: string }
  | { action: 'check'; selector: string }
  | { action: 'reload' }
  | { action: 'expectText'; selector: string; text: string }
  | { action: 'expectValue'; selector: string; value: string }
  | { action: 'expectVisible'; selector: string }
  | { action: 'expectDownload'; selector: string; fileName?: string; text?: string };

export interface BrowserJourney {
  id: string;
  title: string;
  kind: 'primary' | 'recovery';
  steps: BrowserStep[];
}

export interface QualityPlan {
  schemaVersion: 1 | 2;
  criteria: Array<{
    criterionId: string;
    disposition: 'implemented' | 'deferred';
    expectedOutcome: string;
    journeyIds: string[];
    /** Required in version 2; references the frozen solution contract. */
    capabilityIds?: string[];
    reason?: string;
  }>;
  journeys: BrowserJourney[];
}

export interface UxSpec {
  schemaVersion: 1;
  audience: string;
  primaryTask: string;
  successOutcome: string;
  screens: Array<{ name: string; purpose: string; primaryAction: string }>;
  states: { empty: string; loading: string; error: string; success: string };
  persistence: string;
  recovery: string;
  keyboard: string;
}

export interface CriterionResult {
  criterionId: string;
  requirement: string;
  status: 'passed' | 'failed' | 'unverified';
  detail: string;
  capabilityIds?: string[];
}

export interface CapabilityResult {
  id: string;
  required: boolean;
  criterionIds: string[];
  evaluationIds: string[];
  status: 'passed' | 'failed' | 'unverified';
  detail: string;
}

export interface JourneyResult {
  id: string;
  title: string;
  viewport: 'desktop' | 'narrow';
  status: 'passed' | 'failed';
  detail: string;
  screenshot?: string;
  trace?: string;
}

export interface PackageEvidence {
  status: 'passed' | 'failed';
  cleanCopy: boolean;
  profile: RuntimeManifest['profile'];
  filesHash?: string;
  detail: string;
}

export interface QualityReport {
  schemaVersion: 1 | 2 | 3;
  contractHash: string;
  status: 'passed' | 'failed';
  requirementsMet: boolean;
  criteria: CriterionResult[];
  journeys: JourneyResult[];
  errors: string[];
  /** Version 2 records the expected count so omitted browser checks cannot pass. */
  expectedJourneys?: number;
  capabilities?: CapabilityResult[];
  solutionEvaluation?: SolutionEvaluationReport;
  package?: PackageEvidence;
  /** Version 3 requires host-recorded visual review for browser/service delivery. */
  visualReview?: import('./visual-review.js').VisualReviewReport;
}
