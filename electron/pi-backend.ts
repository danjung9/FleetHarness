import type { Project, StageId } from '../shared/types.js';
import type { AcceptanceCriterion } from '../harness/types.js';
import type { PhaseContract } from '../harness/phases.js';
import type { QualityContract, ApplicationVerificationLimits } from './quality.js';
import type { AnyPlanningReviewSnapshot, PlanningReviewRecord } from './planning-review.js';
import type { BriefDataSnapshot } from './brief-data.js';
import type { prepareSolutionRuntime } from './solution-runtime.js';
import type { ConnectorStore } from './connectors/store.js';
import type { ClarificationBroker } from './clarifications.js';
import type { PreflightOptions } from './preflight.js';
import type { CodexAccount } from './codex-account.js';
import type { GenAiMil } from './genai-mil.js';
import type { createCodexSession } from './codex-session.js';
import type { CreateAgentSessionOptions } from '@earendil-works/pi-coding-agent';
import type { StageSession, AgentLimits } from './agent-runner.js';
import type { RunProcessSweep } from './process-sweep.js';

export interface ScopedPlanningContext {
  project: Project;
  acceptance: AcceptanceCriterion[];
  signal: AbortSignal;
  /** A fresh read-only reviewer assesses host-captured shared inputs before freeze. */
  review(snapshot: AnyPlanningReviewSnapshot): Promise<PlanningReviewRecord>;
  /** Runs the same bounded engine lifecycle, with the scoped planner's artifact validator. */
  agent(instruction: string, files: string[], phase: PhaseContract, validate: () => Promise<unknown>, requireDesign?: boolean): Promise<void>;
}
/** Host-only extension points for detached shared-planning and candidate workers. */
export interface ScopedWorkflow {
  startAt?: 'intake' | 'plan';
  stopAfterPlan?: boolean;
  budget?: { totalLimitMs: number; phaseLimitMs: number };
  initialize?(project: Project): Promise<{ data?: BriefDataSnapshot; context?: string } | void>;
  plan(context: ScopedPlanningContext): Promise<{ quality?: QualityContract; foundationPlan?: string }>;
  assertInputs?(project: Project): Promise<void>;
  prepareRuntime?: typeof prepareSolutionRuntime;
  /** Public seed files, contracts and data protected throughout this scoped worker. */
  immutablePaths?(stage: StageId): string[];
  verification?: Pick<import('./quality.js').ApplicationVerificationOptions, 'prepareRuntime' | 'verifyTests' | 'isolateNetwork'>;
  decorateReport?(project: Project, report: import('../shared/types.js').TestReport): Promise<void> | void;
  classifyFailure?(error: unknown): 'infrastructure' | 'integrity' | 'implementation';
}
export interface BackendOptions {
  connectorStore?: ConnectorStore;
  clarifications?: ClarificationBroker;
  // Trusted host/test probes only; renderer settings cannot disable readiness checks.
  preflight?: Pick<PreflightOptions, 'browser' | 'freeBytes' | 'timeoutMs'>;
  codex?: CodexAccount;
  genAiMil?: () => GenAiMil;
  createCodexSession?: typeof createCodexSession;
  createSession?: (options: CreateAgentSessionOptions) => Promise<{ session: StageSession }>;
  agentLimits?: Partial<AgentLimits>;
  shutdownTimeoutMs?: number;
  verificationLimits?: Partial<ApplicationVerificationLimits>;
  processSweep?: () => RunProcessSweep;
  scoped?: ScopedWorkflow;
  /** Trusted test seam; production always runs host verification. */
  verify?: typeof import('./quality.js').verifyApplication;
  checkBuildPreview?: typeof import('./build-preview-check.js').checkBuildPreview;
  /** Release a published snapshot's desktop runtime before sweeping the build. */
  closeInProgressPreview?: (id: string) => Promise<void>;
}

// Compatibility exports for saved data and integrations. The staged executor was removed.
export { AppBuilder as FleetBackend, AppBuilder as PiBackend, briefHash } from './app-builder.js';
