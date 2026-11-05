import type { AcceptanceCriterion } from './types.js';
import { isClassificationLabel, isDeterministicEvaluator } from '../shared/solution.js';
import { assertRuntimeSourceFiles } from '../shared/runtime-artifacts.js';
import { retrievalFixtureProblem } from '../shared/retrieval-fixture.js';
import { scheduleFixtureProblem } from '../shared/schedule-fixture.js';
import type {
  CapabilityKind, DatasetDescriptor, EvaluationPlan, EvaluatorKind, JsonValue,
  RuntimeCommand, RuntimeManifest, SolutionCapability, SolutionContract, SolutionEvaluation
} from '../shared/solution.js';

export const solutionLimits = Object.freeze({
  capabilities: 32, evaluations: 64, cases: 100, trials: 10, invocations: 1_000,
  files: 256, args: 32, environmentNames: 32, description: 4_000,
  jsonDepth: 20, jsonNodes: 20_000, caseBytes: 100_000, planBytes: 2_000_000
});

const kinds: readonly CapabilityKind[] = ['algorithm', 'optimization', 'prediction', 'retrieval', 'generation', 'workflow', 'stateful'];
const evaluators: readonly EvaluatorKind[] = ['exact', 'numeric', 'classification', 'schedule', 'retrieval'];
const hostFiles = new Set(['solution-contract.json', 'evaluation-plan.json', 'acceptance-plan.json', 'ux-spec.json', 'packet.json', 'visual-review.json']);
const hostDirectories = new Set(['.fleet', '.git', '.quality-evidence', '.solution-evidence', '.browser-observations', 'node_modules', '.venv']);
const reservedEnv = /^(?:PATH|HOME|TMPDIR|TMP|TEMP|NODE_OPTIONS|NODE_PATH|PYTHONPATH|PYTHONHOME|LD_.*|DYLD_.*|ELECTRON_.*|HOST|PORT|npm_.*|NPM_.*|PIP_.*|VIRTUAL_ENV)$/;

function object(value: unknown, name: string, keys?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error(`${name} must be a plain object.`);
  }
  const entries = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string')) throw new Error(`${name} cannot contain symbol fields.`);
  for (const [key, descriptor] of Object.entries(entries)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error(`${name}.${key} must be an ordinary JSON field.`);
    if (keys && !keys.includes(key)) throw new Error(`${name} has an unknown field: ${key}.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, max: number = solutionLimits.description): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0')) {
    throw new Error(`${name} must be a nonempty string of at most ${max} characters without NUL bytes.`);
  }
  return value;
}

function identifier(value: unknown, name: string): string {
  const id = text(value, name, 80);
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) throw new Error(`${name} must start with a letter and use only letters, digits, underscores or hyphens.`);
  return id;
}

function array(value: unknown, name: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${name} must contain ${min}–${max} entries.`);
  if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1 ||
      Array.from({ length: value.length }, (_, i) => Object.getOwnPropertyDescriptor(value, String(i))).some(descriptor => !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value'))) {
    throw new Error(`${name} must be an ordinary JSON array without holes, accessors or extra fields.`);
  }
  return Array.from(value);
}

function unique(values: string[], name: string): string[] {
  if (new Set(values).size !== values.length) throw new Error(`${name} contains duplicate values.`);
  return values;
}

function identifiers(value: unknown, name: string, min: number, max: number): string[] {
  return unique(array(value, name, min, max).map((item, i) => identifier(item, `${name}[${i}]`)), name);
}

function number(value: unknown, name: string, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`${name} must be ${integer ? 'an integer' : 'a finite number'} between ${min} and ${max}.`);
  }
  return value;
}

function version(value: unknown, name: string) {
  if (value !== 1) throw new Error(`${name}.schemaVersion must be 1.`);
}

/** Portable file names only; filesystem containment and symlinks are checked again at execution. */
function file(value: unknown, name: string): string {
  const path = text(value, name, 240);
  const parts = path.split('/');
  if (!/^[A-Za-z0-9_.\/-]+$/.test(path) || /(?:^|\/)inputs\/manifest\.json$/i.test(path) || parts.some(part => !part || part === '.' || part === '..' || hostDirectories.has(part.toLowerCase())) ||
      parts.some(part => hostFiles.has(part.toLowerCase()) || part.toLowerCase().startsWith('.env'))) {
    throw new Error(`${name} must be a relative portable file path without traversal, host contracts, answer keys, dependencies or secret files.`);
  }
  return path;
}

function command(value: unknown, name: string, files: Set<string>): RuntimeCommand {
  const entry = object(value, name, ['runtime', 'entrypoint', 'args']);
  if (entry.runtime !== 'node' && entry.runtime !== 'python') throw new Error(`${name}.runtime must be node or python.`);
  const entrypoint = file(entry.entrypoint, `${name}.entrypoint`);
  if (!files.has(entrypoint)) throw new Error(`${name}.entrypoint must appear in runtime.files.`);
  const args = array(entry.args, `${name}.args`, 0, solutionLimits.args).map((arg, i) => {
    if (typeof arg !== 'string' || arg.length > 1_024 || /[\0\r\n]/.test(arg)) throw new Error(`${name}.args[${i}] must be a string of at most 1024 characters without control line breaks.`);
    return arg;
  });
  return { runtime: entry.runtime, entrypoint, args };
}

function endpoint(value: unknown, name: string): string {
  const path = text(value, name, 200);
  if (!/^\/(?:[A-Za-z0-9_-]+\/?)*$/.test(path)) throw new Error(`${name} must be a local absolute HTTP path without origin, query, fragment or traversal.`);
  return path;
}

function runtime(value: unknown): RuntimeManifest {
  const name = 'runtime';
  const entry = object(value, name, ['profile', 'files', 'requiredEnv', 'entrypoint', 'command', 'evaluator', 'dependencies', 'healthPath', 'invokePath']);
  if (entry.profile !== 'browser' && entry.profile !== 'cli' && entry.profile !== 'service') throw new Error('runtime.profile must be browser, cli or service.');
  const files = unique(array(entry.files, 'runtime.files', 1, solutionLimits.files).map((item, i) => file(item, `runtime.files[${i}]`)), 'runtime.files');
  assertRuntimeSourceFiles(files);
  const names = new Set(files);
  const requiredEnv = unique(array(entry.requiredEnv, 'runtime.requiredEnv', 0, solutionLimits.environmentNames).map((item, i) => {
    const env = text(item, `runtime.requiredEnv[${i}]`, 100);
    if (!/^[A-Z_][A-Z0-9_]*$/.test(env) || reservedEnv.test(env)) throw new Error(`runtime.requiredEnv[${i}] must be a nonreserved uppercase environment variable name, never a value or host runtime setting.`);
    return env;
  }), 'runtime.requiredEnv');
  const result: RuntimeManifest = { profile: entry.profile, files, requiredEnv };
  if (entry.profile === 'browser') {
    if (entry.entrypoint !== 'index.html' || !names.has('index.html')) throw new Error('A browser runtime requires entrypoint index.html in runtime.files.');
    if (Object.hasOwn(entry, 'command') || Object.hasOwn(entry, 'healthPath') || Object.hasOwn(entry, 'invokePath')) throw new Error('A browser runtime uses evaluator, not command or service paths.');
    if (requiredEnv.length) throw new Error('A static browser runtime cannot receive requiredEnv configuration. Use a service or CLI profile for model/API environment settings.');
    result.entrypoint = 'index.html';
    result.evaluator = command(entry.evaluator, 'runtime.evaluator', names);
    if (result.evaluator.runtime !== 'node') throw new Error('A static browser evaluator must use node with a shared browser-compatible JavaScript/WASM core. Use a service or CLI profile for Python.');
  } else {
    if (Object.hasOwn(entry, 'evaluator') || Object.hasOwn(entry, 'entrypoint')) throw new Error('CLI and service runtimes use command; evaluator and browser entrypoint are not allowed.');
    result.command = command(entry.command, 'runtime.command', names);
    if (entry.profile === 'service') {
      result.healthPath = endpoint(entry.healthPath, 'runtime.healthPath');
      result.invokePath = endpoint(entry.invokePath, 'runtime.invokePath');
      if (result.healthPath === result.invokePath) throw new Error('runtime.healthPath and runtime.invokePath must be distinct.');
    } else if (Object.hasOwn(entry, 'healthPath') || Object.hasOwn(entry, 'invokePath')) throw new Error('Only service runtimes have healthPath and invokePath.');
  }
  if (Object.hasOwn(entry, 'dependencies')) {
    const dep = object(entry.dependencies, 'runtime.dependencies', ['manager', 'manifest', 'lockfile']);
    if (dep.manager !== 'npm' && dep.manager !== 'pip') throw new Error('runtime.dependencies.manager must be npm or pip.');
    const manifest = file(dep.manifest, 'runtime.dependencies.manifest');
    const lockfile = file(dep.lockfile, 'runtime.dependencies.lockfile');
    if (!names.has(manifest) || !names.has(lockfile)) throw new Error('Dependency manifest and lockfile must appear in runtime.files.');
    if (manifest === lockfile) throw new Error('Dependency manifest and lockfile must be distinct.');
    if (dep.manager === 'npm' && (manifest !== 'package.json' || lockfile !== 'package-lock.json')) throw new Error('npm dependencies require root package.json and package-lock.json.');
    const runtimeName = (result.command ?? result.evaluator)!.runtime;
    if ((dep.manager === 'npm' && runtimeName !== 'node') || (dep.manager === 'pip' && runtimeName !== 'python')) throw new Error('The dependency manager must match the command runtime.');
    result.dependencies = { manager: dep.manager, manifest, lockfile };
  }
  return result;
}

/** Parse a planned solution against the host-owned acceptance inventory. */
export function parseSolutionContract(value: unknown, acceptance: AcceptanceCriterion[]): SolutionContract {
  const entry = object(value, 'solution-contract.json', ['schemaVersion', 'objective', 'capabilities', 'runtime', 'invocation']);
  version(entry.schemaVersion, 'solution-contract.json');
  const inventory = new Set(acceptance.map(item => item.id));
  if (!inventory.size || inventory.size !== acceptance.length || inventory.size > 512) throw new Error('The acceptance inventory must have 1–512 unique criterion IDs.');
  const capabilities = array(entry.capabilities, 'capabilities', 1, solutionLimits.capabilities).map((value, i): SolutionCapability => {
    const name = `capabilities[${i}]`;
    const cap = object(value, name, ['id', 'kind', 'description', 'criterionIds', 'required', 'evaluationIds']);
    if (!kinds.includes(cap.kind as CapabilityKind)) throw new Error(`${name}.kind must be one of ${kinds.join(', ')}.`);
    if (typeof cap.required !== 'boolean') throw new Error(`${name}.required must be a boolean.`);
    const criterionIds = identifiers(cap.criterionIds, `${name}.criterionIds`, 1, 512);
    for (const id of criterionIds) if (!inventory.has(id)) throw new Error(`${name} references an unknown acceptance criterion: ${id}.`);
    return {
      id: identifier(cap.id, `${name}.id`), kind: cap.kind as CapabilityKind, description: text(cap.description, `${name}.description`),
      criterionIds, required: cap.required, evaluationIds: identifiers(cap.evaluationIds, `${name}.evaluationIds`, cap.required ? 1 : 0, solutionLimits.evaluations)
    };
  });
  unique(capabilities.map(cap => cap.id), 'Capability IDs');
  unique(capabilities.flatMap(cap => cap.evaluationIds), 'Capability evaluation IDs');
  if (!capabilities.some(cap => cap.required)) throw new Error('At least one core capability must be required.');
  const result: SolutionContract = { schemaVersion: 1, objective: text(entry.objective, 'objective'), capabilities, runtime: runtime(entry.runtime) };
  if (Object.hasOwn(entry, 'invocation')) {
    const protocol = object(entry.invocation, 'invocation', ['input', 'output', 'rules']);
    result.invocation = {
      input: text(protocol.input, 'invocation.input', 12_000),
      output: text(protocol.output, 'invocation.output', 12_000),
      rules: array(protocol.rules, 'invocation.rules', 1, 64).map((rule, i) => text(rule, `invocation.rules[${i}]`, 2_000))
    };
  }
  return result;
}

function json(value: unknown, name: string): JsonValue {
  let count = 0;
  const active = new Set<object>();
  function visit(value: unknown, name: string, depth: number): JsonValue {
    if (++count > solutionLimits.jsonNodes || depth > solutionLimits.jsonDepth) throw new Error(`${name} exceeds the JSON complexity budget.`);
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value || typeof value !== 'object') throw new Error(`${name} must contain only finite JSON values.`);
    if (active.has(value)) throw new Error(`${name} cannot contain a cyclic value.`);
    active.add(value);
    let result: JsonValue;
    if (Array.isArray(value)) result = array(value, name, 0, solutionLimits.jsonNodes).map((item, i) => visit(item, `${name}[${i}]`, depth + 1));
    else result = Object.fromEntries(Object.entries(object(value, name)).map(([key, item]) => [key, visit(item, `${name}.${key}`, depth + 1)]));
    active.delete(value);
    return result;
  }
  const result = visit(value, name, 0);
  if (new TextEncoder().encode(JSON.stringify(result)).length > solutionLimits.caseBytes) throw new Error(`${name} exceeds the ${solutionLimits.caseBytes}-byte JSON limit.`);
  return result;
}

/** Bounded ordinary JSON shared by frozen evaluation and lifecycle observations. */
export { json as parseContractJson };

function canonical(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function dataset(value: unknown, name: string): DatasetDescriptor {
  const data = object(value, name, ['name', 'version', 'provenance', 'description']);
  if (data.provenance !== 'synthetic' && data.provenance !== 'supplied' && data.provenance !== 'reviewed') throw new Error(`${name}.provenance must be synthetic, supplied or reviewed.`);
  return {
    name: text(data.name, `${name}.name`, 200), version: text(data.version, `${name}.version`, 100), provenance: data.provenance,
    ...(Object.hasOwn(data, 'description') ? { description: text(data.description, `${name}.description`) } : {})
  };
}

function validateExpected(expected: JsonValue, evaluator: EvaluatorKind, name: string) {
  if (evaluator === 'schedule') {
    const data = object(expected, name, ['status']);
    if (data.status !== 'feasible' && data.status !== 'infeasible') throw new Error(`${name}.status must be feasible or infeasible; budget exhaustion is never a success answer.`);
  } else if (evaluator === 'retrieval') {
    const data = object(expected, name, ['ids']);
    unique(array(data.ids, `${name}.ids`, 0, 200).map((id, i) => text(id, `${name}.ids[${i}]`, 200)), `${name}.ids`);
  } else if (evaluator === 'classification') {
    const values = Array.isArray(expected) ? array(expected, name, 1, 1_000) : [expected];
    if (!values.every(isClassificationLabel)) throw new Error(`${name} must be a scalar label (string, boolean or finite number) or a nonempty array of those labels.`);
  } else if (evaluator === 'numeric') {
    const containsNumber = (value: JsonValue): boolean => typeof value === 'number' || (Array.isArray(value) ? value.some(containsNumber) : value !== null && typeof value === 'object' && Object.values(value).some(containsNumber));
    if (!containsNumber(expected)) throw new Error(`${name} must contain at least one numeric value for the numeric evaluator.`);
  }
}

/** Freeze independently specified answer keys; candidate processes receive only each case's input. */
export function parseEvaluationPlan(value: unknown, solution: Pick<SolutionContract, 'capabilities'> & Partial<Pick<SolutionContract, 'runtime'>>): EvaluationPlan {
  const entry = object(value, 'evaluation-plan.json', ['schemaVersion', 'evaluations']);
  version(entry.schemaVersion, 'evaluation-plan.json');
  const capabilities = new Map(solution.capabilities.map(cap => [cap.id, cap]));
  let invocations = 0;
  const evaluations = array(entry.evaluations, 'evaluations', 1, solutionLimits.evaluations).map((value, i): SolutionEvaluation => {
    const name = `evaluations[${i}]`;
    const item = object(value, name, ['id', 'capabilityId', 'description', 'dataset', 'cases', 'evaluator', 'threshold', 'trials', 'baseline', 'tolerance']);
    const id = identifier(item.id, `${name}.id`), capabilityId = identifier(item.capabilityId, `${name}.capabilityId`);
    const capability = capabilities.get(capabilityId);
    if (!capability) throw new Error(`${name} references an unknown capability: ${capabilityId}.`);
    if (!capability.evaluationIds.includes(id)) throw new Error(`${name} must be referenced by its capability's evaluationIds.`);
    if (!evaluators.includes(item.evaluator as EvaluatorKind)) throw new Error(`${name}.evaluator must be one of ${evaluators.join(', ')}.`);
    const evaluator = item.evaluator as EvaluatorKind;
    const threshold = number(item.threshold, `${name}.threshold`, Number.MIN_VALUE, 1);
    if (isDeterministicEvaluator(evaluator) && threshold !== 1) {
      throw new Error(`${name}.threshold must be 1 for the ${evaluator} evaluator; every case and trial must pass.`);
    }
    const trials = number(item.trials, `${name}.trials`, 1, solutionLimits.trials, true);
    const cases = array(item.cases, `${name}.cases`, capability.required ? 2 : 1, solutionLimits.cases).map((value, j) => {
      const caseName = `${name}.cases[${j}]`;
      const data = object(value, caseName, ['id', 'input', 'expected', 'expectedStatus']);
      let expectedStatus: number | undefined;
      if (Object.hasOwn(data, 'expectedStatus')) {
        expectedStatus = number(data.expectedStatus, `${caseName}.expectedStatus`, 400, 499, true);
        if (evaluator !== 'exact' || solution.runtime?.profile !== 'service') {
          throw new Error(`${caseName}.expectedStatus requires the exact evaluator and a service runtime; architecture-neutral experiment plans cannot assert HTTP status.`);
        }
      }
      const expected = json(data.expected, `${caseName}.expected`);
      validateExpected(expected, evaluator, `${caseName}.expected`);
      const input = json(data.input, `${caseName}.input`);
      if (evaluator === 'retrieval') {
        const problem = retrievalFixtureProblem(input, expected);
        if (problem) throw new Error(`${caseName}.${problem}`);
      }
      if (evaluator === 'schedule') {
        const problem = scheduleFixtureProblem(input, expected);
        if (problem) throw new Error(`${caseName}.${problem}`);
      }
      return { id: identifier(data.id, `${caseName}.id`), input, expected, ...(expectedStatus === undefined ? {} : { expectedStatus }) };
    });
    unique(cases.map(item => item.id), `${name} case IDs`);
    const inputs = new Set(cases.map(item => canonical(item.input)));
    if (capability.required && inputs.size < 2) throw new Error(`${name}: a required evaluation needs at least two distinct inputs.`);
    invocations += cases.length * trials;
    if (invocations > solutionLimits.invocations) throw new Error(`Evaluation plan exceeds the ${solutionLimits.invocations}-invocation budget.`);
    const result: SolutionEvaluation = { id, capabilityId, description: text(item.description, `${name}.description`), dataset: dataset(item.dataset, `${name}.dataset`), cases, evaluator, threshold, trials };
    if (Object.hasOwn(item, 'baseline')) {
      result.baseline = number(item.baseline, `${name}.baseline`, 0, 1);
      if (threshold < result.baseline) throw new Error(`${name}.threshold must meet or exceed its declared baseline.`);
    }
    if (Object.hasOwn(item, 'tolerance')) {
      if (evaluator !== 'numeric') throw new Error(`${name}.tolerance is only supported by the numeric evaluator.`);
      result.tolerance = number(item.tolerance, `${name}.tolerance`, 0, 1_000_000_000);
    }
    return result;
  });
  const ids = new Set(unique(evaluations.map(item => item.id), 'Evaluation IDs'));
  const missing = solution.capabilities.flatMap(cap => cap.evaluationIds).filter(id => !ids.has(id));
  if (missing.length) throw new Error(`Missing declared evaluations: ${missing.join(', ')}.`);
  const result: EvaluationPlan = { schemaVersion: 1, evaluations };
  if (new TextEncoder().encode(JSON.stringify(result)).length > solutionLimits.planBytes) throw new Error(`Evaluation plan exceeds the ${solutionLimits.planBytes}-byte JSON limit.`);
  return result;
}

export const solutionContractGuide = `# Computational solution contract (schema version 1)

Before implementation write solution-contract.json and evaluation-plan.json beside acceptance-plan.json. These are host-validated and frozen: repair must change the delivered implementation, never the objectives, expected answers, thresholds or dataset. Use JSON with exactly the documented fields. Plan the real computational outcome and connect it to canonical acceptance IDs. Supported capabilities can be composed: algorithm, optimization, prediction, retrieval, generation, workflow and stateful. At least one core capability must be required and may not be deferred in the acceptance plan.

## solution-contract.json

{
  "schemaVersion": 1,
  "objective": "Calculate the total workload from supplied durations",
  "invocation": {"input":"Object with durations: array of finite nonnegative numbers, and unit: nonblank string.","output":"Object with exactly total: number and unit: string. No extra fields.","rules":["total is the sum of durations; an empty array totals zero.","Return the supplied unit unchanged. Reject malformed inputs with a runtime error."]},
  "capabilities": [{"id":"workload","kind":"algorithm","description":"Sum valid task durations and preserve the supplied unit","criterionIds":["R1"],"required":true,"evaluationIds":["workload-cases"]}],
  "runtime": {"profile":"browser","entrypoint":"index.html","files":["index.html","engine.mjs","evaluate.mjs"],"requiredEnv":[],"evaluator":{"runtime":"node","entrypoint":"evaluate.mjs","args":[]}}
}

Replace R1 with real canonical IDs. Maximum 32 capabilities; IDs start with a letter and use letters, digits, underscores or hyphens (80 characters). Every capability needs a description, one or more criterionIds, an explicit required boolean, and evaluationIds. Required capabilities need at least one evaluation. Every evaluation is owned by exactly one capability. At most 64 evaluations. Objective and descriptions are nonempty, at most 4,000 characters.

New builds must include invocation, the public wire protocol that stays visible to the builder when evaluation-plan.json is sealed. It has exactly input and output (nonempty strings, maximum 12,000 characters each) and rules (1–64 nonempty strings, maximum 2,000 characters each). Describe every action/discriminator, field name, type, optional/default/null behavior, output envelope, status and error vocabulary, error precedence, and array ordering. Write every literal status/error string used by exact evaluation here; never say "see evaluation cases" for interface details. Define general computational rules, not evaluation input/answer pairs or case-specific answers. Derive independent cases from this public protocol, using held-out values. The protocol is frozen with the solution and cannot be changed during repair. Older saved contracts without invocation remain readable, but cannot be used as a new plan.

Runtime profiles:
- browser: entrypoint is index.html; evaluator is a node command over a shared browser-compatible JavaScript/WASM core. requiredEnv must be empty: a static browser has no runtime environment or model credential channel. Use service or cli for Python or runtime model/API settings. The UI and evaluator MUST call the same computational module. A duplicate test-only implementation or hardcoded fixture results is not acceptable. Put index.html, the shared module and evaluator entrypoint in files. Browser and core checks independently verify the planned outputs; they do not prove structural code identity or untested UI behavior.
- cli: command replaces evaluator; omit browser entrypoint. The command reads exactly one JSON input from stdin and writes exactly one JSON result to stdout. Send diagnostic logs to stderr. The host launches a fresh process per case.
- service: command replaces evaluator; omit browser entrypoint. Include healthPath (for example /health) and invokePath (for example /invoke), distinct local paths. Bind to loopback using the host-provided PORT. Health requests must return success; POST invokePath receives a JSON input and returns one JSON result. Process startup, health and invocation have host-enforced budgets.

Every command has runtime (node or python), entrypoint (a relative file) and args (0–32 strings). The host uses executable arguments, not a shell. files is an explicit 1–256-file deployment allowlist, using portable relative paths with no traversal. Include all imported modules, static assets, runtime data and dependency manifests. Entry points and dependency files must occur in this allowlist. Each entry must name a distinct file, ignoring letter case; never list a directory alongside a child file (for example assets and assets/data.json). No host contracts/answer keys (solution-contract.json, evaluation-plan.json, acceptance-plan.json, ux-spec.json, packet.json), inputs/manifest.json host metadata, .fleet, .git, evidence directories, node_modules, .venv or secret .env files. Ordinary supplied data files may be listed. The artifact inventory excludes .pi, .DS_Store, .git and node_modules at every depth; runtime paths cannot contain those segments or case aliases. Move application code and data to an included path such as data/value.json. Root test-report.json, review.json and DELIVERY.md are reserved for host-written evidence and delivery notes, including case variants and directories at those paths; use separate application data paths such as data/review.json. Do not package hidden copies of evaluation cases or expected outputs. The host verifies regular files and rejects symlinks before copying into a clean temporary directory. Declared deployment files must remain unchanged during execution; write mutable state to new files outside the allowlist or OS temporary storage. Deployment isolation is not an OS security sandbox.

requiredEnv lists uppercase environment variable NAMES (maximum 32), never credentials or values. Host settings such as PATH, HOME, PORT, HOST, NODE_OPTIONS, PYTHONPATH and package-manager settings are reserved. Missing required values must fail visibly; do not substitute canned responses for live inference. Use real runtime model adapters for AI calls and record versions in output/evidence as appropriate. Optional dependencies is {"manager":"npm","manifest":"package.json","lockfile":"package-lock.json"} for node, or {"manager":"pip","manifest":"requirements.in","lockfile":"requirements.txt"} for python. Both manifest and lockfile must be distinct listed files; dependencies install from the lockfile in the clean runtime. npm installation disables lifecycle scripts; pip requires fully pinned, hashed requirements and binary wheels. The runtime installation budget may reject heavy dependencies. CLI/service processes need their own interface; the application quality plan still proves any promised user interaction.

## evaluation-plan.json

{
  "schemaVersion": 1,
  "evaluations": [{
    "id":"workload-cases","capabilityId":"workload","description":"Independent sums include ordinary and boundary cases",
    "dataset":{"name":"workload-reference","version":"1","provenance":"synthetic","description":"Expected totals calculated from the specification before implementation"},
    "evaluator":"numeric","threshold":1,"trials":1,"baseline":0.5,"tolerance":0,
    "cases":[{"id":"ordinary","input":{"durations":[10,20,5],"unit":"minutes"},"expected":{"total":35,"unit":"minutes"}},{"id":"empty","input":{"durations":[],"unit":"hours"},"expected":{"total":0,"unit":"hours"}}]
  }]
}

Each evaluation requires id, capabilityId, description, dataset, evaluator, threshold, trials and cases. dataset requires name, version and provenance (synthetic, supplied or reviewed); description is optional and should explain the source and independent basis for expected values. The host treats provenance as a declaration, not proof of expert review or a hidden holdout. For predictive or AI systems establish a separate reviewed holdout and prevent training/preprocessing leakage. Builder-authored fixtures alone establish only those declared cases. Human/domain review is still required where independent reference data is unavailable.

Each case has a unique id, input JSON and expected JSON. The candidate receives ONLY input; expected answers stay in host memory and outside the deployment. Required evaluations need at least two distinct inputs (object key order does not create a new input). Use boundary cases, invalid or missing data, counterexamples and appropriate failure/recovery cases. A plan may contain at most 100 cases per evaluation, 10 trials per case and 1,000 total invocations. JSON must be finite, at most 20 levels deep and 100,000 UTF-8 bytes per input/expected value; the complete plan is capped at 2,000,000 UTF-8 bytes. threshold is a score in (0,1]; optional baseline is a score in [0,1] and threshold must meet or exceed it. The exact, numeric and schedule evaluators require threshold 1: every case in every trial must pass. Lower deterministic thresholds are rejected during planning, evaluation and report approval. Only classification and retrieval support fractional aggregate thresholds; justify them using independent representative data and the domain objective. Runtime errors, malformed outputs and invalid citations or constraints still fail independently of aggregate scores. Model-based behavior should use multiple trials and independent representative examples, including abstention and unsupported-claim cases. Do not lower thresholds to make broken output pass.

For a service runtime with the exact evaluator, a case may also declare expectedStatus, an integer from 400 to 499. Example: {"id":"invalid","input":{"values":null},"expectedStatus":422,"expected":{"error":"values must be an array"}}. The host must observe both that HTTP status and the exact expected JSON body; unexpected success, a different status/body, redirects, crashes, timeouts and malformed JSON fail. Cases without expectedStatus still require successful invocation. Health checks still require success. Specify rejection status and error vocabulary in the public invocation rules and include a corrected-input recovery case. CLI/browser process errors and architecture-neutral experiment plans do not support expectedStatus; use ordinary JSON error results for those protocols, or prove process-exit behavior with application tests. An adapter without HTTP observation fails explicitly.

Host-owned evaluators:
- exact: exact structural JSON equality; object key order is ignored, array order matters.
- numeric: exact JSON shape and exact nonnumeric values; numbers compare with absolute tolerance (optional, default 0). Expected JSON must contain a number. tolerance is valid only for numeric.
- classification: expected/output are a scalar string/finite-number/boolean label or a nonempty array of such labels. Array length must match; score is label accuracy. Nulls, objects, nested arrays and other malformed labels fail the evaluation regardless of aggregate accuracy. Valid incorrect labels remain ordinary accuracy misses.
- schedule: input uses windows [{start,end}], people [{id,qualifications,windows,maxMinutes,restMinutes}], requests [{id,duration,starts,people,resources,qualifications}] in nonnegative safe integer minutes, with positive durations and window ends greater than starts. Both feasible and infeasible fixtures are validated before freezing: person/request IDs must be unique strings, personnel references must exist, and qualifications, people and resources must be arrays of unique strings. Empty availability windows or candidate starts are valid inputs for infeasibility checks. expected is {"status":"feasible"} or {"status":"infeasible"}. Output contains status and assignments [{id,start,end,people,resources}]. Feasible results are independently checked for complete coverage, candidate starts, duration, qualifications, availability, shared-resource/person overlap, rest and duty budgets. Infeasible results are compared with the frozen answer key; this is not a general infeasibility proof. budget_exhausted cannot pass as infeasible.
- retrieval: input contains documents [{id,text,source?,approved?}] and any query/context needed by the engine. Each document needs a unique string id and string text; source, when supplied, must be a string locator. expected is {"ids":["relevant-document"]}, with unique IDs (empty for no-answer cases). Every expected ID must name a supplied document whose approved field is not false and whose text contains at least one character so a nonempty citation is possible; invalid fixtures are rejected during planning before contracts freeze. Empty document arrays and empty-text documents not named in expected IDs remain valid, including abstention cases. Output is {"results":[{"id":"relevant-document","source":"optional-matching-source","excerpt":{"start":0,"end":5,"text":"exact"}}]}. Each result must reference a permitted input document with an exact matching nonempty excerpt, and IDs must be unique. Copy the document's source string exactly when supplied, including an empty string; omit source from the result when the document omits it. Source strings and excerpt text are matched literally without trimming or normalization. Score is set F1 against expected IDs. Unsupported or fabricated citations fail independently of relevance.

Record honest limitations. These evaluators establish bounded evidence about the frozen cases and clean runtime; they do not certify all domain behavior, general model quality or production readiness. Use exact/state JSON checks for calculation and workflow outcomes; the current runtime restarts commands for independent cases, so cross-process persistence and UI integration also need explicit integration/browser evidence. Compare a useful baseline, inspect failure evidence, repair within the run budget, and verify the delivered package rather than only a demonstration screen.
`;
