import { createHash } from 'node:crypto';
import type { AcceptanceCriterion } from './types.js';
import type { BehavioralContract, BehavioralScenario, BrowserNavigation, BrowserStepBinding, CandidateExecutionContract, SemanticBrowserStep } from '../shared/experiment-contract.js';
import type { BrowserJourney, BrowserStep, QualityPlan, UxSpec } from '../shared/quality.js';
import type { EvaluationPlan, SolutionContract } from '../shared/solution.js';
import { parseSolutionContract, parseEvaluationPlan, parseContractJson } from './solution-contract.js';
import { assertPlannedCapabilityEvidence, assertPlannedRecoveryJourneys, assertPlannedUxStructure, parseQualityPlan, parseUxSpec } from './quality-contract.js';
import { validateFoundationPlan } from './foundations.js';
import { parseSystemDefinition } from '../shared/system-design.js';

const maxBytes = 2_000_000;
function jsonInput(value: unknown) {
  let nodes = 0;
  const active = new Set<object>();
  const visit = (entry: unknown, depth: number) => {
    if (++nodes > 20_000 || depth > 24) throw new Error('Experiment contract exceeds its JSON complexity limit.');
    if (entry === null || typeof entry === 'string' || typeof entry === 'boolean' || (typeof entry === 'number' && Number.isFinite(entry))) return;
    if (!entry || typeof entry !== 'object' || active.has(entry)) throw new Error('Experiment contracts require finite, acyclic JSON data.');
    if (!Array.isArray(entry) && ![Object.prototype, null].includes(Object.getPrototypeOf(entry))) throw new Error('Experiment contracts require plain JSON objects.');
    active.add(entry);
    const descriptors = Object.getOwnPropertyDescriptors(entry);
    if (Object.getOwnPropertySymbols(entry).length) throw new Error('Experiment contracts cannot contain symbol fields.');
    if (Array.isArray(entry)) {
      for (let i = 0; i < entry.length; i++) if (!Object.hasOwn(descriptors[String(i)] ?? {}, 'value')) throw new Error('Experiment contracts require ordinary JSON array entries.');
    }
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (Array.isArray(entry) && key === 'length') continue;
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('Experiment contracts require ordinary JSON fields.');
      if (Array.isArray(entry) && !/^(?:0|[1-9][0-9]*)$/.test(key)) throw new Error('Experiment arrays cannot contain named properties.');
      visit(descriptor.value, depth + 1);
    }
    active.delete(entry);
  };
  visit(value, 0);
  bounded(value);
}
function object(value: unknown, name: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${name} must be a plain object.`);
  for (const [key, property] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!property.enumerable || !Object.hasOwn(property, 'value')) throw new Error(`${name}.${key} must be an ordinary JSON field.`);
    if (!keys.includes(key)) throw new Error(`${name} has an unknown field: ${key}.`);
  }
  return value as Record<string, unknown>;
}
function text(value: unknown, name: string, max = 4000, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) throw new Error(`${name} must be ${empty ? 'a' : 'a nonempty'} string of at most ${max} characters.`);
  return value;
}
function id(value: unknown, name: string): string {
  const result = text(value, name, 80);
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(result)) throw new Error(`${name} must be an identifier.`);
  return result;
}
function array(value: unknown, name: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${name} must contain ${min}–${max} entries.`);
  for (let i = 0; i < value.length; i++) if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, String(i)) ?? {}, 'value')) throw new Error(`${name} must contain ordinary JSON array entries.`);
  return value;
}
function unique(values: string[], name: string) { if (new Set(values).size !== values.length) throw new Error(`${name} contains duplicate IDs.`); }
function schema(value: unknown, name: string) { if (value !== 1) throw new Error(`${name}.schemaVersion must be 1.`); }
function bounded<T>(value: T): T { if (Buffer.byteLength(JSON.stringify(value)) > maxBytes) throw new Error('Experiment contract exceeds the 2 MB limit.'); return value; }
const digest = (body: string) => createHash('sha256').update(body).digest('hex');
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
  return JSON.stringify(value);
}
export function experimentContractHash(value: unknown): string { return digest(canonical(value)); }
export function experimentContractBody(value: unknown): string { return JSON.stringify(value, null, 2) + '\n'; }

function semanticStep(value: unknown, name: string): SemanticBrowserStep {
  const step = object(value, name, ['id', 'action', 'value', 'text', 'fileName', 'input', 'expected']);
  const stepId = id(step.id, `${name}.id`), action = step.action;
  const fields = (...keys: string[]) => object(value, name, ['id', 'action', ...keys]);
  switch (action) {
    case 'input': case 'expectValue': fields('value'); return { id: stepId, action, value: text(step.value, `${name}.value`, 10_000, true) };
    case 'activate': case 'check': case 'reload': case 'restartRuntime': case 'expectVisible': fields(); return { id: stepId, action };
    case 'expectServiceState':
      fields('input', 'expected');
      return { id: stepId, action, input: parseContractJson(step.input, `${name}.input`), expected: parseContractJson(step.expected, `${name}.expected`) };
    case 'expectText': fields('text'); return { id: stepId, action, text: text(step.text, `${name}.text`, 10_000) };
    case 'expectDownload': {
      fields('text', 'fileName');
      return { id: stepId, action, ...(step.fileName === undefined ? {} : { fileName: text(step.fileName, `${name}.fileName`, 255) }), ...(step.text === undefined ? {} : { text: text(step.text, `${name}.text`, 10_000) }) };
    }
    default: throw new Error(`${name}.action is not a supported semantic browser action.`);
  }
}
function defaultBinding(step: SemanticBrowserStep): BrowserStepBinding {
  return { stepId: step.id, ...(['reload', 'restartRuntime', 'expectServiceState'].includes(step.action) ? {} : { selector: '#shared-outcome' }),
    ...(step.action === 'input' ? { action: 'fill' as const } : step.action === 'activate' ? { action: 'click' as const } : {}) };
}
function compileStep(step: SemanticBrowserStep, binding: BrowserStepBinding): BrowserStep[] {
  const selector = binding.selector!;
  let main: BrowserStep;
  switch (step.action) {
    case 'input': main = { action: binding.action as 'fill' | 'select', selector, value: step.value }; break;
    case 'activate': main = binding.action === 'press' ? { action: 'press', selector, key: binding.key! } : { action: 'click', selector }; break;
    case 'reload': case 'restartRuntime': main = { action: step.action }; break;
    case 'expectServiceState': main = { action: step.action, input: structuredClone(step.input), expected: structuredClone(step.expected) }; break;
    case 'expectText': main = { action: 'expectText', selector, text: step.text }; break;
    case 'expectValue': main = { action: 'expectValue', selector, value: step.value }; break;
    case 'expectDownload': main = { action: 'expectDownload', selector, ...(step.fileName === undefined ? {} : { fileName: step.fileName }), ...(step.text === undefined ? {} : { text: step.text }) }; break;
    default: main = { action: step.action, selector };
  }
  return [...(binding.before ?? []), main, ...(binding.screenId ? [{ action: 'expectScreen' as const, screenId: binding.screenId }] : [])];
}
function qualityPlan(behavior: BehavioralContract, journeys: BrowserJourney[]): QualityPlan {
  return { schemaVersion: 2, criteria: behavior.criteria.map(({ scenarioIds, ...criterion }) => ({ ...criterion, journeyIds: [...scenarioIds] })), journeys };
}
function solutionFor(behavior: Pick<BehavioralContract, 'objective' | 'capabilities' | 'invocation'>, runtime: SolutionContract['runtime']): SolutionContract {
  return { schemaVersion: 1, objective: behavior.objective, invocation: structuredClone(behavior.invocation), capabilities: structuredClone(behavior.capabilities), runtime: structuredClone(runtime) };
}
const placeholderRuntime = (surface: 'browser' | 'cli', service = false): SolutionContract['runtime'] => service
  ? { profile: 'service', files: ['server.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'server.mjs', args: [] }, healthPath: '/health', invokePath: '/invoke' }
  : surface === 'cli'
  ? { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } }
  : { profile: 'browser', files: ['index.html', 'engine.mjs'], requiredEnv: [], entrypoint: 'index.html', evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };

export function parseBehavioralContract(value: unknown, acceptance: AcceptanceCriterion[]): BehavioralContract {
  jsonInput(value);
  const item = object(value, 'behavior-contract.json', ['schemaVersion', 'objective', 'invocation', 'capabilities', 'surface', 'delivery', 'criteria', 'ux', 'scenarios']);
  schema(item.schemaVersion, 'behavior-contract.json');
  if (item.surface !== 'browser' && item.surface !== 'cli') throw new Error('The shared product surface must be browser or cli.');
  let delivery: BehavioralContract['delivery'];
  if (item.delivery !== undefined) {
    const raw = object(item.delivery, 'delivery', ['profiles', 'network', 'operationIds']);
    const profiles = array(raw.profiles, 'delivery.profiles', 1, 5).map(value => text(value, 'delivery profile', 40));
    const allowed = item.surface === 'cli' ? ['node-cli', 'python-cli'] : ['browser-js', 'node-service', 'python-service'];
    if (profiles.some(profile => !allowed.includes(profile))) throw new Error('Delivery profiles must preserve the shared product surface.');
    unique(profiles, 'Delivery profiles');
    if (raw.network !== 'offline' && raw.network !== 'configured-services') throw new Error('Delivery network must be offline or configured-services.');
    const operationIds = array(raw.operationIds, 'delivery.operationIds', 0, 30).map(value => id(value, 'operationId'));
    unique(operationIds, 'Delivery operations');
    if (raw.network === 'offline' && operationIds.length || raw.network === 'configured-services' && (profiles.includes('browser-js') || !operationIds.length)) throw new Error('External operations require configured service or CLI profiles.');
    delivery = { profiles: profiles as NonNullable<BehavioralContract['delivery']>['profiles'], network: raw.network, operationIds };
  }
  const scenarios = array(item.scenarios, 'scenarios', item.surface === 'browser' ? 2 : 0, item.surface === 'browser' ? 12 : 0).map((raw, i): BehavioralScenario => {
    const name = `scenarios[${i}]`, scenario = object(raw, name, ['id', 'title', 'kind', 'steps']);
    if (scenario.kind !== 'primary' && scenario.kind !== 'recovery') throw new Error(`${name}.kind must be primary or recovery.`);
    const steps = array(scenario.steps, `${name}.steps`, 2, 40).map((step, j) => semanticStep(step, `${name}.steps[${j}]`));
    unique(steps.map(step => step.id), `${name} steps`);
    return { id: id(scenario.id, `${name}.id`), title: text(scenario.title, `${name}.title`, 200), kind: scenario.kind, steps };
  });
  unique(scenarios.map(scenario => scenario.id), 'Scenarios');
  const serviceLifecycle = scenarios.some(scenario => scenario.steps.some(step => step.action === 'restartRuntime' || step.action === 'expectServiceState'));
  if (serviceLifecycle && (!delivery || delivery.profiles.some(profile => profile !== 'node-service' && profile !== 'python-service'))) {
    throw new Error('restartRuntime and expectServiceState require an explicit shared delivery contract permitting only node-service and/or python-service profiles.');
  }
  const solution = parseSolutionContract({ schemaVersion: 1, objective: item.objective, invocation: item.invocation, capabilities: item.capabilities, runtime: placeholderRuntime(item.surface, serviceLifecycle) }, acceptance);
  if (!solution.invocation) throw new Error('A shared public invocation protocol is required.');
  const criteria = array(item.criteria, 'criteria', 1, 512).map((raw, i) => {
    const entry = object(raw, `criteria[${i}]`, ['criterionId', 'disposition', 'expectedOutcome', 'capabilityIds', 'scenarioIds', 'reason']);
    return { ...entry, journeyIds: entry.scenarioIds, scenarioIds: undefined };
  });
  const journeys = scenarios.map(scenario => ({ id: scenario.id, title: scenario.title, kind: scenario.kind, steps: scenario.steps.flatMap(step => compileStep(step, defaultBinding(step))) }));
  const parsed = parseQualityPlan({ schemaVersion: 2, criteria: criteria.map(({ scenarioIds: _unused, ...criterion }) => criterion), journeys }, acceptance, solution);
  const uxInput = object(item.ux, 'ux', ['audience', 'primaryTask', 'successOutcome', 'states', 'persistence', 'recovery', 'keyboard']);
  const { schemaVersion: _version, screens: _screens, ...ux } = parseUxSpec({ schemaVersion: 1, ...uxInput, screens: [{ name: 'Application', purpose: 'Complete the shared task.', primaryAction: 'Complete the task.' }] });
  return bounded({ schemaVersion: 1, objective: solution.objective, invocation: solution.invocation, capabilities: solution.capabilities, surface: item.surface,
    ...(delivery ? { delivery } : {}), criteria: parsed.criteria.map(({ journeyIds, ...criterion }) => ({ ...criterion, capabilityIds: criterion.capabilityIds!, scenarioIds: journeyIds })), ux, scenarios });
}

/** Apply current planning gates before freeze, without reinterpreting persisted shared plans. */
export function parsePlannedBehavioralContract(value: unknown, acceptance: AcceptanceCriterion[]): BehavioralContract {
  const behavior = parseBehavioralContract(value, acceptance);
  assertPlannedCapabilityEvidence(behavior.criteria, behavior.capabilities);
  assertPlannedRecoveryJourneys(behavior.scenarios.map(scenario => ({ id: scenario.id, title: scenario.title, kind: scenario.kind,
    steps: scenario.steps.flatMap(step => compileStep(step, defaultBinding(step))) })));
  return behavior;
}

function navigation(value: unknown, name: string): BrowserNavigation {
  const item = object(value, name, ['action', 'selector', 'key']);
  const selector = text(item.selector, `${name}.selector`, 512).trim();
  if (item.action === 'click') { object(value, name, ['action', 'selector']); return { action: 'click', selector }; }
  if (item.action === 'press') return { action: 'press', selector, key: text(item.key, `${name}.key`, 80) };
  throw new Error(`${name} permits only click or press navigation.`);
}
function binding(value: unknown, step: SemanticBrowserStep, name: string, structuredScreens: boolean): BrowserStepBinding {
  const screenFields = structuredScreens ? ['screenId'] : [];
  const item = object(value, name, ['stepId', 'selector', 'action', 'key', 'before', ...screenFields]);
  if (item.stepId !== step.id) throw new Error(`${name} must bind the exact shared step in order: ${step.id}.`);
  const screen = item.screenId === undefined ? {} : { screenId: id(item.screenId, `${name}.screenId`) };
  if (['reload', 'restartRuntime', 'expectServiceState'].includes(step.action)) { object(value, name, ['stepId', ...screenFields]); return { stepId: step.id, ...screen }; }
  const result: BrowserStepBinding = { stepId: step.id, selector: text(item.selector, `${name}.selector`, 512).trim(), ...screen };
  if (step.action === 'input') {
    if (item.action !== 'fill' && item.action !== 'select') throw new Error(`${name} must bind input with fill or select.`);
    if (item.key !== undefined) throw new Error(`${name}.key is only valid for press.`);
    if (item.action === 'select' && !step.value.trim()) throw new Error(`${name} cannot select an empty shared input; use fill.`);
    result.action = item.action;
  } else if (step.action === 'activate') {
    if (item.action !== 'click' && item.action !== 'press') throw new Error(`${name} must bind activate with click or press.`);
    result.action = item.action;
    if (item.action === 'press') result.key = text(item.key, `${name}.key`, 80);
    else if (item.key !== undefined) throw new Error(`${name}.key is only valid for press.`);
  } else if (item.action !== undefined || item.key !== undefined) throw new Error(`${name} cannot replace a host-owned assertion or action.`);
  if (item.before !== undefined) {
    if (!['input', 'activate', 'check'].includes(step.action)) throw new Error(`${name} cannot navigate before a host-owned observation.`);
    result.before = array(item.before, `${name}.before`, 0, 4).map((entry, i) => navigation(entry, `${name}.before[${i}]`));
  }
  return result;
}
export function parseCandidateExecutionContract(value: unknown, behavior: BehavioralContract, acceptance: AcceptanceCriterion[] = behavior.criteria.map(item => ({ id: item.criterionId, requirement: item.expectedOutcome, method: 'automated', scenario: item.expectedOutcome }))): CandidateExecutionContract {
  jsonInput(value);
  const item = object(value, 'execution-contract.json', ['schemaVersion', 'behaviorHash', 'architectureId', 'runtime', 'foundation', 'systemDesign', 'screens', 'structure', 'bindings']);
  if (item.schemaVersion !== 1 && item.schemaVersion !== 2) throw new Error('execution-contract.json.schemaVersion must be 1 or 2.');
  if (item.schemaVersion === 1) object(value, 'execution-contract.json', ['schemaVersion', 'behaviorHash', 'architectureId', 'runtime', 'foundation', 'systemDesign', 'screens', 'bindings']);
  if (behavior.surface === 'cli' && item.schemaVersion !== 1) throw new Error('CLI candidate execution contracts use schemaVersion 1 without browser structure.');
  if (item.behaviorHash !== experimentContractHash(behavior)) throw new Error('Candidate execution contract does not match the frozen shared behavior hash.');
  const runtime = parseSolutionContract({ schemaVersion: 1, objective: behavior.objective, capabilities: behavior.capabilities, invocation: behavior.invocation, runtime: item.runtime }, acceptance).runtime;
  if ((behavior.surface === 'cli') !== (runtime.profile === 'cli')) throw new Error('Candidate runtime must preserve the shared product surface.');
  if (behavior.delivery) {
    const command = runtime.profile === 'browser' ? runtime.evaluator : runtime.command;
    const profile = runtime.profile === 'browser' ? 'browser-js' : `${command?.runtime}-${runtime.profile}`;
    if (!behavior.delivery.profiles.includes(profile as NonNullable<BehavioralContract['delivery']>['profiles'][number]) || item.architectureId !== profile) throw new Error('Candidate runtime must match an architecture allowed by the frozen delivery contract.');
    if (runtime.requiredEnv.length) throw new Error('Candidate credentials must use configured host operations, never runtime environment variables.');
  }
  if (runtime.files.some(file => /(?:^|\/)(?:behavior-contract|execution-contract)\.json$/i.test(file))) throw new Error('Shared and candidate execution contracts are host metadata, not runtime files.');
  const foundation = validateFoundationPlan(item.foundation, runtime);
  const design = object(item.systemDesign, 'systemDesign', ['title', 'description', 'components', 'connections']);
  array(design.components, 'systemDesign.components', 1, 12).forEach((component, i) => object(component, `systemDesign.components[${i}]`, ['id', 'label', 'description', 'kind', 'files']));
  array(design.connections, 'systemDesign.connections', 0, 24).forEach((connection, i) => object(connection, `systemDesign.connections[${i}]`, ['from', 'to', 'label']));
  const systemDesign = parseSystemDefinition(design);
  if (systemDesign.components.some(component => component.files.some(file => !runtime.files.includes(file)))) throw new Error('Every system-design source file must belong to the candidate runtime allowlist.');
  const ux = parseUxSpec({ schemaVersion: item.schemaVersion, ...behavior.ux, screens: item.screens,
    ...(item.schemaVersion === 2 ? { structure: item.structure } : {}) });
  const entries = array(item.bindings, 'bindings', behavior.scenarios.length, behavior.scenarios.length);
  const bindings = entries.map((raw, i) => {
    const entry = object(raw, `bindings[${i}]`, ['scenarioId', 'steps']), scenario = behavior.scenarios[i]!;
    if (entry.scenarioId !== scenario.id) throw new Error(`bindings[${i}] must bind shared scenario ${scenario.id} in order.`);
    return { scenarioId: scenario.id, steps: array(entry.steps, `bindings[${i}].steps`, scenario.steps.length, scenario.steps.length).map((value, j) => binding(value, scenario.steps[j]!, `bindings[${i}].steps[${j}]`, item.schemaVersion === 2)) };
  });
  if (ux.schemaVersion === 2) {
    const screenIds = new Set(ux.screens.map(screen => screen.id));
    for (const entry of bindings) for (const step of entry.steps) {
      if (step.screenId && !screenIds.has(step.screenId)) throw new Error(`Binding ${step.stepId} references an unknown screen: ${step.screenId}.`);
    }
  }
  const common = { behaviorHash: String(item.behaviorHash), architectureId: id(item.architectureId, 'architectureId'), runtime, foundation, systemDesign };
  // Version 1 field order is part of the serialized body checked when saved runs resume.
  const result: CandidateExecutionContract = bounded(ux.schemaVersion === 2
    ? { schemaVersion: 2, ...common, structure: ux.structure, screens: ux.screens, bindings }
    : { schemaVersion: 1, ...common, screens: ux.screens, bindings });
  // The existing parser remains the authority for compiled journey limits and coverage.
  parseQualityPlan(compilePublicContracts(behavior, result).plan, acceptance, solutionFor(behavior, runtime));
  return result;
}
/** Require the current screen plan for new browser candidates while saved candidates remain readable. */
export function parsePlannedCandidateExecutionContract(value: unknown, behavior: BehavioralContract, acceptance?: AcceptanceCriterion[]): CandidateExecutionContract {
  const execution = parseCandidateExecutionContract(value, behavior, acceptance);
  if (behavior.surface === 'browser') {
    const { ux, plan } = compilePublicContracts(behavior, execution);
    assertPlannedUxStructure(ux, plan.journeys, true);
  }
  return execution;
}
export function compilePublicContracts(behavior: BehavioralContract, execution: CandidateExecutionContract): { solution: SolutionContract; plan: QualityPlan; ux: UxSpec } {
  const journeys = behavior.scenarios.map((scenario, index): BrowserJourney => ({ id: scenario.id, title: scenario.title, kind: scenario.kind,
    steps: [...(execution.schemaVersion === 2 ? [{ action: 'expectScreen' as const, screenId: execution.structure.entryScreenId }] : []),
      ...scenario.steps.flatMap((step, i) => compileStep(step, execution.bindings[index]!.steps[i]!))] }));
  const ux: UxSpec = execution.schemaVersion === 2
    ? { schemaVersion: 2, ...structuredClone(behavior.ux), screens: structuredClone(execution.screens), structure: structuredClone(execution.structure) }
    : { schemaVersion: 1, ...structuredClone(behavior.ux), screens: structuredClone(execution.screens) };
  return { solution: solutionFor(behavior, execution.runtime), plan: qualityPlan(behavior, journeys), ux };
}
export function parseExperimentEvaluationPlan(value: unknown, behavior: BehavioralContract): EvaluationPlan { return parseEvaluationPlan(value, behavior); }

export const behavioralContractGuide = `# Shared architecture experiment contract
Write behavior-contract.json and evaluation-plan.json before any candidate architecture planning. Do not implement an app or choose a candidate runtime here.
behavior-contract.json has exactly schemaVersion:1, objective, invocation:{input,output,rules}, capabilities, surface (browser or cli), criteria, ux, scenarios.
Use the solution-contract guide's capability and invocation schemas. Every capability has id, kind, description, criterionIds, required, evaluationIds. Every original acceptance criterion occurs once in criteria with criterionId, disposition (implemented or deferred), expectedOutcome, capabilityIds, scenarioIds, and reason only when needed. Deferral decisions are shared: candidates cannot change them. Required capabilities cannot be deferred.
surface browser permits browser or Node/Python service architectures; cli requires CLI delivery. A required interface cannot be omitted by selecting CLI.
ux has audience, primaryTask, successOutcome, states:{empty,loading,error,success}, persistence, recovery, keyboard. Describe required behavior; candidate planners choose screens and design.
scenarios is empty for cli. For browser provide 2–12 scenarios, at least one primary and one recovery; every scenario is referenced by criteria. Each has id,title,kind and 2–40 ordered steps with unique id fields. Steps are {id,action:"input",value}, {id,action:"activate"}, {id,action:"check"}, {id,action:"reload"}, {id,action:"restartRuntime"}, {id,action:"expectServiceState",input,expected}, {id,action:"expectVisible"}, {id,action:"expectText",text}, {id,action:"expectValue",value}, or {id,action:"expectDownload",fileName?,text?}. No selectors here. Use semantic step IDs explaining the target, e.g. duration-input, submit-schedule, computed-total. Include an activation and subsequent assertion; primary scenarios require a literal outcome. Shared inputs and exact expected visible atomic results are common to all designs. Recovery should observe a failure, correct it, and verify success.
restartRuntime and expectServiceState require explicit delivery.profiles restricted to node-service and/or python-service. The host restarts the actual process while retaining writable data, URL and browser context, then reloads. The host state assertion invokes the public service protocol directly and compares the complete expected JSON, independently of browser storage. input and expected each use the solution guide's bounded finite JSON rules (100,000 bytes, 20 levels). Use read-only state operations and assert backend state plus visible results after restart. Candidates bind these steps with stepId and optional screenId only; selectors, code, commands and replacement input/expected values are forbidden.
evaluation-plan.json uses the existing solution evaluation schema: independently derived cases, host evaluator IDs, versioned datasets, thresholds and trials. Its capability/evaluation IDs must match the shared capabilities. This file is host-only after shared planning. Never copy its input/answer pairs into the public behavior contract or planning prose. Use the public invocation protocol to document complete behavior instead. Do not write foundation-plan.json, solution-contract.json, acceptance-plan.json, ux-spec.json or system-design.json during this shared step.`;

export function candidateExecutionGuide(behaviorHash: string, architectureId: string): string {
  const cli = architectureId.endsWith('-cli');
  const structureGuide = cli
    ? 'screens uses ux-spec version 1: [{name,purpose,primaryAction}]. CLI candidates have no browser structure and an empty bindings array.'
    : `structure is {pattern,rationale,entryScreenId,navigation,persistentElements}, with nonempty strings. pattern is single-task, steps, list-detail or workspace; choose it from the actual user tasks and explain the choice in rationale. A single-task pattern is appropriate only for one focused screen. screens is 1–12 objects: {id,name,purpose,primaryAction,route,selector,layout,secondaryContent,narrowLayout}. Each ID, name and root selector must be unique; entryScreenId names one screen. route is an exact origin-relative local route, including any query or fragment, e.g. /, /resources.html or /#/review. For a static browser runtime the entry route is / followed by runtime.entrypoint (usually /index.html); service runtimes start at /. Exclude host-generated URL mount prefixes. selector identifies that screen's unique content root. layout describes the primary content, supporting controls and visual hierarchy; secondaryContent describes how advanced settings, help, diagnostics and raw data are revealed when needed; narrowLayout describes the small-screen arrangement. Keep shared navigation outside individual screen roots. Only the active screen is visible. Multiple HTML pages, routes and in-page views are supported: choose the structure the tasks need. Declare every page and source file in runtime.files. Do not stack independent screens as sections of one long page.
Every compiled scenario begins with a host-owned expectScreen for entryScreenId. In version 2, any binding may add screenId to assert the active screen AFTER its shared action or observation; this adds an assertion without changing shared behavior. Add screenId on transitions and reloads as appropriate. Every planned screen must be covered by a compiled expectScreen across the scenarios; the entry screen is covered automatically. An expectScreen checks the declared route and unique visible root, and that other planned screen roots are hidden. Include navigation away and back with a shared expectValue/expectText where persistence is part of the shared behavior. In plan.md, write the screen map, navigation transitions, rough layout per screen and narrow-screen behavior before implementation. Build the shared navigation and layout shell first, then each focused screen.`;
  return `# Candidate architecture plan
Read behavior-contract.json. Its behaviorHash is ${behaviorHash}. Implement architecture ${architectureId}; do not substitute another architecture or weaken shared requirements. Write execution-contract.json with exactly schemaVersion:${cli ? 1 : 2}, behaviorHash:"${behaviorHash}", architectureId:"${architectureId}", runtime, foundation, systemDesign, ${cli ? '' : 'structure, '}screens, bindings.
Use the existing runtime and foundation schemas. foundation is the foundation-plan object; the host materializes it after validation. systemDesign is the application architecture {title,description,components,connections} using fleet_system_design's schema. Every component source file must be declared in runtime.files. Choose different architecture and interface design as appropriate while preserving all common behavior.
${structureGuide}
bindings has one entry per shared scenario, in the same order: {scenarioId,steps}. Each step corresponds to the shared step in the same order. input binds as {stepId,selector,action:"fill"|"select"}; activate as {stepId,selector,action:"click"} or {stepId,selector,action:"press",key}. check and every expect action bind {stepId,selector}; reload binds {stepId}.${cli ? '' : ' Each binding may additionally include screenId as described above.'} Before input/activate/check you may add before:[{action:"click",selector}|{action:"press",selector,key}], at most four navigation actions, to open panels or advance a wizard. No navigation before observations. At most 40 compiled steps per scenario, including navigation and screen assertions. Never put values, expected results, replacement actions or assertions, code, URLs or evaluator changes into bindings: the host supplies shared inputs and expected results. Select narrow visible result elements whose actual value matches the shared atomic expectation.
The host compiles solution-contract.json, acceptance-plan.json and ux-spec.json and freezes this execution plan. Never write or request evaluation-plan.json. Write plan.md and test-matrix.md covering this candidate's implementation and all shared scenarios. Do not implement source files before the host materializes the foundation.`;
}
