/** JSON passed to a delivered engine; expected values are retained by the host. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface RuntimeCommand {
  runtime: 'node' | 'python';
  entrypoint: string;
  args: string[];
}

export interface RuntimeManifest {
  profile: 'browser' | 'cli' | 'service';
  files: string[];
  requiredEnv: string[];
  entrypoint?: 'index.html';
  command?: RuntimeCommand;
  evaluator?: RuntimeCommand;
  dependencies?: { manager: 'npm' | 'pip'; manifest: string; lockfile: string };
  healthPath?: string;
  invokePath?: string;
}

export type CapabilityKind = 'algorithm' | 'optimization' | 'prediction' | 'retrieval' | 'generation' | 'workflow' | 'stateful';

export interface SolutionCapability {
  id: string;
  kind: CapabilityKind;
  description: string;
  criterionIds: string[];
  required: boolean;
  evaluationIds: string[];
}

export interface SolutionContract {
  schemaVersion: 1;
  objective: string;
  capabilities: SolutionCapability[];
  runtime: RuntimeManifest;
  /** Public wire protocol, frozen with the solution; legacy saved contracts may omit it. */
  invocation?: { input: string; output: string; rules: string[] };
}

export interface DatasetDescriptor {
  name: string;
  version: string;
  provenance: 'synthetic' | 'supplied' | 'reviewed';
  description?: string;
}

export type EvaluatorKind = 'exact' | 'numeric' | 'classification' | 'schedule' | 'retrieval';

/** Classification accuracy applies only to well-formed scalar labels. */
export function isClassificationLabel(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
}

/** Correctness and feasibility checks cannot trade a failed case for aggregate accuracy. */
export function isDeterministicEvaluator(evaluator: EvaluatorKind): boolean {
  return evaluator === 'exact' || evaluator === 'numeric' || evaluator === 'schedule';
}

export interface EvaluationCase {
  id: string;
  input: JsonValue;
  expected: JsonValue;
  /** Exact service rejection: require this 4xx status as well as the expected JSON body. */
  expectedStatus?: number;
}

export interface SolutionEvaluation {
  id: string;
  capabilityId: string;
  description: string;
  dataset: DatasetDescriptor;
  cases: EvaluationCase[];
  evaluator: EvaluatorKind;
  threshold: number;
  trials: number;
  baseline?: number;
  tolerance?: number;
}

export interface EvaluationPlan {
  schemaVersion: 1;
  evaluations: SolutionEvaluation[];
}

export interface EvaluationCaseResult {
  id: string;
  trial: number;
  passed: boolean;
  score: number;
  durationMs: number;
  detail: string;
  output?: JsonValue;
  /** Observed by the host HTTP adapter, never inferred from the application's JSON. */
  httpStatus?: number;
}

export interface EvaluationResult {
  id: string;
  capabilityId: string;
  evaluator: EvaluatorKind;
  dataset: DatasetDescriptor;
  metric: string;
  threshold: number;
  actual: number;
  trials: number;
  baseline?: number;
  status: 'passed' | 'failed';
  cases: EvaluationCaseResult[];
}

export interface SolutionEvaluationReport {
  schemaVersion: 1;
  status: 'passed' | 'failed';
  runtime: {
    profile: RuntimeManifest['profile'];
    filesHash: string;
    runtime: string;
    environmentNames: string[];
  };
  evaluations: EvaluationResult[];
  capabilities: Array<{ id: string; required: boolean; status: 'passed' | 'failed' | 'unverified' }>;
  errors: string[];
  durationMs: number;
}
