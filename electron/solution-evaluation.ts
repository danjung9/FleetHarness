import { performance } from 'node:perf_hooks';
import type { EvaluationPlan, EvaluationResult, JsonValue, SolutionContract, SolutionEvaluation, SolutionEvaluationReport } from '../shared/solution.js';
import type { SolutionRuntime } from './solution-runtime.js';

type Score = { score: number; detail: string; fatal?: boolean };
export const solutionEvidenceLimits = { caseOutputBytes: 64 * 1024, totalOutputBytes: 8 * 1024 * 1024 } as const;
type RecordValue = Record<string, any>;
const record = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string') && new Set(value).size === value.length;
const sameSet = (left: string[], right: string[]) => left.length === right.length && left.every(item => right.includes(item));
function equal(actual: JsonValue, expected: JsonValue, tolerance = 0): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') return finite(actual) && finite(expected) && Math.abs(actual - expected) <= tolerance;
  if (actual === expected) return true;
  if (Array.isArray(actual) && Array.isArray(expected)) return actual.length === expected.length && actual.every((value, index) => equal(value, expected[index], tolerance));
  if (record(actual) && record(expected)) {
    const keys = Object.keys(expected);
    return Object.keys(actual).length === keys.length && keys.every(key => Object.hasOwn(actual, key) && equal((actual as Record<string, JsonValue>)[key], (expected as Record<string, JsonValue>)[key], tolerance));
  }
  return false;
}

/** Describe structure only; frozen answer values never enter the diagnostic. */
function mismatchDetail(actual: JsonValue, expected: JsonValue, tolerance?: number): string {
  const maxDepth = 16, maxPathLength = 400;
  const type = (value: JsonValue) => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const describe = (path: string, reason: string) => ` First mismatch at ${path}: ${reason}.`;
  const childPath = (path: string, key: string | number): string | undefined => {
    // Omit unsafe/long names whole: escaping or truncating a credential-bearing key
    // could prevent the runtime's subsequent exact-secret redaction from matching it.
    const segment = typeof key === 'number' ? `[${key}]` : /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(key) ? `.${key}` : '[property name omitted]';
    return path.length + segment.length <= maxPathLength ? path + segment : undefined;
  };
  const visit = (actual: JsonValue, expected: JsonValue, path: string, depth: number): string | undefined => {
    if (type(actual) !== type(expected)) return describe(path, 'type mismatch');
    if (typeof actual === 'number' && typeof expected === 'number') {
      if (finite(actual) && finite(expected) && Math.abs(actual - expected) <= (tolerance ?? 0)) return;
      return describe(path, tolerance === undefined ? 'value mismatch' : 'numeric difference exceeds tolerance');
    }
    if (actual === expected) return;
    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) return describe(path, 'array length mismatch');
      // Right values in another order is a different failure from wrong values, and it gives away no answer.
      if (actual.length <= 500 && !equal(actual, expected, tolerance)) {
        const rest = [...expected];
        const sameValues = actual.every(item => {
          const found = rest.findIndex(other => equal(item, other, tolerance));
          if (found < 0) return false;
          rest.splice(found, 1); return true;
        });
        if (sameValues) return describe(path, 'array order differs; the values are right, so reorder this output to satisfy the check');
      }
      for (let i = 0; i < expected.length; i++) {
        if (equal(actual[i], expected[i], tolerance)) continue;
        const next = childPath(path, i);
        return depth >= maxDepth || !next ? describe(path, 'nested value mismatch (path limit reached)') : visit(actual[i], expected[i], next, depth + 1);
      }
      return;
    }
    if (record(actual) && record(expected)) {
      const actualObject = actual as Record<string, JsonValue>, expectedObject = expected as Record<string, JsonValue>;
      const expectedKeys = Object.keys(expected).sort(), actualKeys = Object.keys(actual).sort();
      for (const key of expectedKeys) if (!Object.hasOwn(actual, key)) return describe(childPath(path, key) ?? path, 'missing key');
      for (const key of actualKeys) if (!Object.hasOwn(expected, key)) return describe(childPath(path, key) ?? path, 'unexpected key');
      for (const key of expectedKeys) {
        if (equal(actualObject[key], expectedObject[key], tolerance)) continue;
        const next = childPath(path, key);
        return depth >= maxDepth || !next ? describe(path, 'nested value mismatch (path limit reached)') : visit(actualObject[key], expectedObject[key], next, depth + 1);
      }
      return;
    }
    return describe(path, 'value mismatch');
  };
  return visit(actual, expected, '$', 0) ?? '';
}
const scored = (passed: boolean, detail: string): Score => ({ score: passed ? 1 : 0, detail });
const invalid = (detail: string): Score => ({ score: 0, detail, fatal: true });

/** Independent interval/constraint checker; this does not call the generated solver or toolkit solver. */
function schedule(input: unknown, output: unknown, expected: unknown): Score {
  if (!record(input) || !record(expected) || !record(output)) return invalid('Schedule inputs and outputs must be objects.');
  if (output.status !== expected.status) return scored(false, 'Expected schedule status ' + expected.status + ', received ' + output.status + '.');
  if (expected.status === 'infeasible') {
    if (output.assignments !== undefined && (!Array.isArray(output.assignments) || output.assignments.length !== 0)) return invalid('An infeasible result cannot contain assignments.');
    return scored(true, 'Infeasible status matches the frozen answer key; this is not a general infeasibility proof.');
  }
  if (expected.status !== 'feasible' || !Array.isArray(input.requests) || !Array.isArray(input.people) || !Array.isArray(input.windows) || !Array.isArray(output.assignments)) return invalid('Feasibility checking requires requests, people, windows and assignments.');
  const validWindow = (value: unknown) => record(value) && finite(value.start) && finite(value.end) && value.end > value.start;
  if (!input.windows.every(validWindow) || !input.people.every((p: any) => record(p) && typeof p.id === 'string' && strings(p.qualifications) && Array.isArray(p.windows) && p.windows.every(validWindow) && finite(p.maxMinutes) && p.maxMinutes >= 0 && finite(p.restMinutes) && p.restMinutes >= 0)) return invalid('Schedule fixture contains malformed people or windows.');
  const roster = new Map<string, RecordValue>(input.people.map((p: RecordValue) => [p.id, p]));
  const requests = new Map<string, RecordValue>();
  for (const request of input.requests) {
    if (!record(request) || typeof request.id !== 'string' || requests.has(request.id) || !finite(request.duration) || request.duration <= 0 || !Array.isArray(request.starts) || !request.starts.every(finite) || !strings(request.people) || !strings(request.resources) || !strings(request.qualifications) || request.people.some((id: string) => !roster.has(id))) return invalid('Schedule fixture contains a malformed or duplicate request.');
    requests.set(request.id, request);
  }
  if (roster.size !== input.people.length || output.assignments.length !== requests.size) return invalid('Schedule must include exactly one assignment for each request.');
  const seen = new Set<string>(), allocations: RecordValue[] = [];
  const fits = (windows: RecordValue[], start: number, end: number) => windows.some(w => start >= w.start && end <= w.end);
  for (const assignment of output.assignments) {
    if (!record(assignment) || typeof assignment.id !== 'string' || seen.has(assignment.id) || !finite(assignment.start) || !finite(assignment.end) || !strings(assignment.people) || !strings(assignment.resources)) return invalid('Schedule contains a malformed or duplicate assignment.');
    seen.add(assignment.id);
    const request = requests.get(assignment.id);
    if (!request || !sameSet(assignment.people, request.people) || !sameSet(assignment.resources, request.resources)) return invalid('Schedule changed the request personnel or resource allocation.');
    if (!request.starts.includes(assignment.start) || assignment.end - assignment.start !== request.duration || !fits(input.windows, assignment.start, assignment.end)) return invalid('Schedule violates candidate start, duration or operational availability.');
    if (!request.qualifications.every((q: string) => assignment.people.some((id: string) => roster.get(id)!.qualifications.includes(q)))) return invalid('Schedule does not cover required qualifications.');
    for (const id of assignment.people) if (!fits(roster.get(id)!.windows, assignment.start, assignment.end)) return invalid('Schedule violates personnel availability.');
    allocations.push(assignment);
  }
  for (let a = 0; a < allocations.length; a++) for (let b = a + 1; b < allocations.length; b++) {
    const left = allocations[a], right = allocations[b];
    if (left.start < right.end && right.start < left.end && left.resources.some((id: string) => right.resources.includes(id))) return invalid('Schedule double-books a shared resource.');
    for (const person of left.people.filter((id: string) => right.people.includes(id))) {
      const rest = roster.get(person)!.restMinutes;
      if (left.start < right.end + rest && right.start < left.end + rest) return invalid('Schedule violates personnel overlap or minimum rest.');
    }
  }
  for (const person of roster.values()) {
    const minutes = allocations.filter(a => a.people.includes(person.id)).reduce((sum, a) => sum + a.end - a.start, 0);
    if (minutes > person.maxMinutes) return invalid('Schedule exceeds a personnel duty budget.');
  }
  return scored(true, 'Every request satisfies independent coverage, availability, qualification, resource, rest and duty checks.');
}

function retrieval(input: unknown, output: unknown, expected: unknown): Score {
  if (!record(input) || !Array.isArray(input.documents) || !record(expected) || !strings(expected.ids) || !record(output) || !Array.isArray(output.results)) return invalid('Retrieval requires input documents, expected ids, and output results.');
  const documents = new Map<string, RecordValue>();
  for (const document of input.documents) {
    if (!record(document) || typeof document.id !== 'string' || typeof document.text !== 'string' || documents.has(document.id)) return invalid('Retrieval fixture documents must have unique ids and text.');
    documents.set(document.id, document);
  }
  if (expected.ids.some(id => !documents.has(id) || documents.get(id)!.approved === false)) return invalid('Retrieval answer key references an absent or excluded document.');
  const actual = new Set<string>();
  for (const result of output.results) {
    if (!record(result) || typeof result.id !== 'string' || actual.has(result.id)) return invalid('Retrieval results must contain unique source ids.');
    const source = documents.get(result.id), span = result.excerpt;
    if (!source || source.approved === false) return invalid('Retrieval returned an absent or excluded source.');
    if (source.source !== undefined && result.source !== source.source) return invalid('Retrieval source locator does not match its document.');
    if (!record(span) || !Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end) || span.start < 0 || span.end <= span.start || span.end > source.text.length || source.text.slice(span.start, span.end) !== span.text) return invalid('Retrieval citation does not exactly reproduce its source span.');
    actual.add(result.id);
  }
  if (!expected.ids.length) return scored(!actual.size, 'Expected abstention for a query without relevant evidence.');
  const matches = expected.ids.filter(id => actual.has(id)).length;
  const score = actual.size ? 2 * matches / (actual.size + expected.ids.length) : 0;
  return { score, detail: 'Source spans verified; relevant-id F1 is ' + score.toFixed(4) + '.' };
}

export function scoreSolutionOutput(evaluation: Pick<SolutionEvaluation, 'evaluator' | 'tolerance'>, input: JsonValue, output: JsonValue, expected: JsonValue): Score {
  switch (evaluation.evaluator) {
    case 'exact': {
      const passed = equal(output, expected);
      return scored(passed, passed ? 'Output matches the frozen JSON answer.' : 'Output differs from the frozen JSON answer.' + mismatchDetail(output, expected));
    }
    case 'numeric': {
      const tolerance = evaluation.tolerance ?? 0, passed = equal(output, expected, tolerance);
      return scored(passed, 'Compared matching JSON structure with absolute numeric tolerance ' + tolerance + '.' + (passed ? '' : mismatchDetail(output, expected, tolerance)));
    }
    case 'classification': {
      const labels = Array.isArray(expected) ? expected : [expected], actual = Array.isArray(output) ? output : [output];
      if (Array.isArray(output) !== Array.isArray(expected) || actual.length !== labels.length || !labels.length) return invalid('Classification output must preserve the answer-key label shape.');
      const score = labels.filter((label, i) => equal(actual[i], label)).length / labels.length;
      return { score, detail: 'Label accuracy is ' + score.toFixed(4) + '.' };
    }
    case 'schedule': return schedule(input, output, expected);
    case 'retrieval': return retrieval(input, output, expected);
    default: return invalid('Unsupported host evaluator.');
  }
}

/** Scores engine outputs using frozen host expectations; never executes a generated grading script. */
export async function runSolutionEvaluation(runtime: SolutionRuntime, solution: SolutionContract, plan: EvaluationPlan,
  signal?: AbortSignal): Promise<SolutionEvaluationReport> {
  const started = performance.now(), evaluations: EvaluationResult[] = [], errors: string[] = [];
  let retainedOutputBytes = 0;
  for (const evaluation of plan.evaluations) {
    signal?.throwIfAborted();
    const result: EvaluationResult = { id: evaluation.id, capabilityId: evaluation.capabilityId, evaluator: evaluation.evaluator,
      dataset: structuredClone(evaluation.dataset), metric: evaluation.evaluator === 'classification' ? 'mean_label_accuracy' : evaluation.evaluator === 'retrieval' ? 'mean_relevant_id_f1' : 'case_pass_rate',
      threshold: evaluation.threshold, actual: 0, trials: evaluation.trials, ...(evaluation.baseline === undefined ? {} : { baseline: evaluation.baseline }), status: 'failed', cases: [] };
    let fatal = false;
    for (let trial = 1; trial <= evaluation.trials; trial++) for (const entry of evaluation.cases) {
      signal?.throwIfAborted();
      const caseStarted = performance.now();
      try {
        // Only input crosses the runtime boundary; the answer key stays in the host.
        const output = await runtime.invoke(structuredClone(entry.input));
        const scored = scoreSolutionOutput(evaluation, entry.input, output, entry.expected);
        fatal ||= !!scored.fatal;
        let detail = runtime.redactMessage(scored.detail).slice(0, 2000), retainedOutput: JsonValue | undefined;
        const rawBytes = Buffer.byteLength(JSON.stringify(output), 'utf8');
        if (rawBytes > solutionEvidenceLimits.caseOutputBytes) {
          detail += ` Output omitted from evidence: ${rawBytes} bytes exceeds the ${solutionEvidenceLimits.caseOutputBytes}-byte per-case retention limit; scoring used the full output.`;
        } else {
          const redacted = runtime.redactOutput(output), bytes = Buffer.byteLength(JSON.stringify(redacted), 'utf8');
          if (bytes > solutionEvidenceLimits.caseOutputBytes) {
            detail += ' Output omitted from evidence because the redacted value exceeds the per-case retention limit; scoring used the full output.';
          } else if (retainedOutputBytes + bytes > solutionEvidenceLimits.totalOutputBytes) {
            detail += ` Output omitted from evidence because the ${solutionEvidenceLimits.totalOutputBytes}-byte aggregate output retention budget is exhausted; scoring used the full output.`;
          } else { retainedOutput = redacted; retainedOutputBytes += bytes; }
        }
        result.cases.push({ id: entry.id, trial, passed: scored.score === 1 && !scored.fatal, score: scored.score,
          durationMs: Math.round(performance.now() - caseStarted), detail, ...(retainedOutput === undefined ? {} : { output: retainedOutput }) });
      } catch (error) {
        signal?.throwIfAborted(); fatal = true;
        result.cases.push({ id: entry.id, trial, passed: false, score: 0, durationMs: Math.round(performance.now() - caseStarted), detail: runtime.redactMessage(error instanceof Error ? error.message : String(error)).slice(0, 2000) });
      }
    }
    result.actual = result.cases.length ? result.cases.reduce((sum, entry) => sum + entry.score, 0) / result.cases.length : 0;
    result.status = !fatal && result.cases.length > 0 && result.actual >= result.threshold && (result.baseline === undefined || result.actual >= result.baseline) ? 'passed' : 'failed';
    evaluations.push(result);
  }
  const capabilities = solution.capabilities.map(capability => {
    const mapped = capability.evaluationIds.map(id => evaluations.find(evaluation => evaluation.id === id && evaluation.capabilityId === capability.id));
    const status = !mapped.length ? 'unverified' as const : mapped.every(result => result?.status === 'passed') ? 'passed' as const : 'failed' as const;
    return { id: capability.id, required: capability.required, status };
  });
  if (!evaluations.length) errors.push('No domain evaluations were executed.');
  if (!capabilities.some(capability => capability.required)) errors.push('No required capability was declared.');
  return { schemaVersion: 1, status: !errors.length && capabilities.filter(capability => capability.required).every(capability => capability.status === 'passed') && evaluations.every(result => result.status === 'passed') ? 'passed' : 'failed',
    runtime: structuredClone(runtime.provenance), evaluations, capabilities, errors, durationMs: Math.round(performance.now() - started) };
}
