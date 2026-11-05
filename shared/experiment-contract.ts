import type { JsonValue, RuntimeManifest, SolutionCapability, SolutionContract } from './solution.js';
import type { LegacyUxScreen, UxScreen, UxSpecCommon, UxStructure } from './quality.js';
import type { SystemDefinition } from './system-design.js';
import type { FoundationPlan } from '../harness/foundations.js';

/** Public behavioral expectations. Evaluation cases and answer keys never belong here. */
export type SemanticBrowserStep = { id: string } & (
  | { action: 'input'; value: string }
  | { action: 'activate' | 'check' | 'reload' | 'restartRuntime' | 'expectVisible' }
  | { action: 'expectServiceState'; input: JsonValue; expected: JsonValue }
  | { action: 'expectText'; text: string }
  | { action: 'expectValue'; value: string }
  | { action: 'expectDownload'; fileName?: string; text?: string }
);
export interface BehavioralScenario {
  id: string;
  title: string;
  kind: 'primary' | 'recovery';
  steps: SemanticBrowserStep[];
}
export interface BehavioralContract {
  schemaVersion: 1;
  objective: string;
  invocation: NonNullable<SolutionContract['invocation']>;
  capabilities: SolutionCapability[];
  /** Product surface is shared; an architecture cannot drop a required interface. */
  surface: 'browser' | 'cli';
  delivery?: { profiles: Array<'browser-js' | 'node-service' | 'python-service' | 'node-cli' | 'python-cli'>;
    network: 'offline' | 'configured-services'; operationIds: string[] };
  criteria: Array<{
    criterionId: string;
    disposition: 'implemented' | 'deferred';
    expectedOutcome: string;
    capabilityIds: string[];
    scenarioIds: string[];
    reason?: string;
  }>;
  ux: UxSpecCommon;
  scenarios: BehavioralScenario[];
}
export type BrowserNavigation = { action: 'click'; selector: string } | { action: 'press'; selector: string; key: string };
export interface BrowserStepBinding {
  stepId: string;
  selector?: string;
  /** input permits fill/select; activate permits click/press. Other actions are host-owned. */
  action?: 'fill' | 'select' | 'click' | 'press';
  key?: string;
  /** Bounded UI navigation before an interaction, never before a host assertion. */
  before?: BrowserNavigation[];
  /** Version 2 only: assert the active screen after the shared action or observation. */
  screenId?: string;
}
interface CandidateExecutionCommon {
  behaviorHash: string;
  architectureId: string;
  runtime: RuntimeManifest;
  foundation: FoundationPlan;
  systemDesign: SystemDefinition;
  bindings: Array<{ scenarioId: string; steps: BrowserStepBinding[] }>;
}
/** Saved version 1 candidates retain their original public contracts and hashes. */
export type CandidateExecutionContract = CandidateExecutionCommon & (
  | { schemaVersion: 1; screens: LegacyUxScreen[] }
  | { schemaVersion: 2; structure: UxStructure; screens: UxScreen[] }
);
export interface ExperimentContractIdentity {
  behaviorHash: string;
  evaluationSetHash: string;
  executionHash: string;
  qualityContractHash: string;
}
