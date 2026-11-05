import type { AcceptanceCriterion } from './types.js';
import type { BrowserJourney, BrowserStep, QualityPlan, UxScreen, UxSpec, UxSpecCommon, UxStructure } from '../shared/quality.js';
import type { SolutionContract } from '../shared/solution.js';
import { parseContractJson } from './solution-contract.js';

const limits = { criteria: 512, journeys: 12, steps: 40, screens: 12, description: 4_000, selector: 512, value: 10_000 };

export const primaryDeferralPolicy = `Report Primary deferrals first, by canonical ID, concrete allowed dependency, withheld action and demonstrated synthetic workflow, or state none. Follow the existing real-system:, real-data: or human-authority: reason policy. Every primary deferral needs syntheticCoverage with explicit assumptions, source-quoted output names and primary browser assertions, while retaining deferred disposition and empty journeyIds. Use labeled synthetic examples in the requested input format, with independent expected outputs fixed before implementation. A substitute input format or generic EVENT/TASK demonstration remains incomplete even when its own tests pass. Missing specifications or experts require explicit synthetic assumptions, never invented real-format validation. The independent judge must assess format fidelity, every named output and the complete workflow; structural validation cannot establish semantic adequacy. Keep human approval, prohibited actions, monitoring, escalation and shutdown visible.`;

function object(value: unknown, name: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error(`${name} must be an object.`);
  }
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(`${name} has an unknown field: ${key}. Allowed fields: ${keys.join(', ')}.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, max = limits.description, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) {
    const received = value === undefined ? 'a missing value' : value === null ? 'null' : Array.isArray(value) ? 'an array'
      : typeof value === 'string' ? value.length > max ? `a ${value.length}-character string` : 'an empty or whitespace-only string'
        : `a value of type ${typeof value}`;
    const correction = typeof value === 'string' && value.length > max ? `Shorten this value to at most ${max} characters.`
      : value === undefined ? 'Add this field with a JSON string value.'
        : Array.isArray(value) ? 'Write one JSON string describing every intended list item; do not omit any requirements.'
          : 'Write this value as a JSON string with the intended content.';
    throw new Error(`${name} must be ${allowEmpty ? 'a' : 'a nonempty'} string of at most ${max} characters. Received ${received}. ${correction}`);
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
  return Array.from(value);
}

function step(value: unknown, name: string): BrowserStep {
  const entry = object(value, name, ['action', 'selector', 'value', 'key', 'text', 'fileName', 'path', 'method', 'status', 'screenId', 'fresh', 'input', 'expected']);
  const action = text(entry.action, `${name}.action`, 32);
  const selector = () => text(entry.selector, `${name}.selector`, limits.selector).trim();
  const fields = (...keys: string[]) => object(value, name, ['action', ...keys]);
  switch (action) {
    case 'fill': case 'expectValue':
      fields('selector', 'value');
      return { action, selector: selector(), value: text(entry.value, `${name}.value`, limits.value, true) };
    case 'select':
      fields('selector', 'value');
      return { action, selector: selector(), value: text(entry.value, `${name}.value`, limits.value) };
    case 'click': case 'check': case 'expectVisible': case 'expectHidden':
      fields('selector');
      return { action, selector: selector() };
    case 'expectScreen':
      fields('screenId');
      return { action, screenId: identifier(entry.screenId, `${name}.screenId`) };
    case 'press':
      fields('selector', 'key');
      return { action, selector: selector(), key: text(entry.key, `${name}.key`, 80) };
    case 'reload': case 'restartRuntime':
      fields();
      return { action };
    case 'expectServiceState':
      fields('input', 'expected');
      return { action, input: parseContractJson(entry.input, `${name}.input`), expected: parseContractJson(entry.expected, `${name}.expected`) };
    case 'expectText':
      fields('selector', 'text');
      return { action, selector: selector(), text: text(entry.text, `${name}.text`, limits.value) };
    case 'expectHttpError': {
      fields('selector', 'path', 'method', 'status');
      const pathname = text(entry.path, `${name}.path`, 1000);
      const base = 'http://127.0.0.1';
      const address = new URL(pathname, base);
      if (!pathname.startsWith('/') || pathname.startsWith('//') || /[\\\s#]/.test(pathname)
        || address.origin !== base || address.pathname + address.search !== pathname) {
        throw new Error(`${name}.path must be an exact origin-relative path with optional query, without a host, fragment or normalization.`);
      }
      if (typeof entry.method !== 'string' || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(entry.method)) throw new Error(`${name}.method must be GET, POST, PUT, PATCH or DELETE.`);
      if (!Number.isInteger(entry.status) || (entry.status as number) < 400 || (entry.status as number) > 499) throw new Error(`${name}.status must be an HTTP rejection integer from 400 to 499.`);
      return { action, selector: selector(), path: pathname, method: entry.method as Extract<BrowserStep, { action: 'expectHttpError' }>['method'], status: entry.status as number };
    }
    case 'expectDownload': {
      fields('selector', 'fileName', 'text', 'fresh');
      const result: Extract<BrowserStep, { action: 'expectDownload' }> = { action, selector: selector() };
      if (Object.hasOwn(entry, 'fileName')) result.fileName = text(entry.fileName, `${name}.fileName`, 255);
      if (Object.hasOwn(entry, 'text')) result.text = text(entry.text, `${name}.text`, limits.value);
      if (Object.hasOwn(entry, 'fresh')) {
        if (typeof entry.fresh !== 'boolean') throw new Error(`${name}.fresh must be a boolean.`);
        result.fresh = entry.fresh;
      }
      return result;
    }
    default: throw new Error(`${name}.action is unsupported: ${action}. Use only the documented browser actions; JavaScript and navigation are not allowed.`);
  }
}

function journey(value: unknown, name: string): BrowserJourney {
  const entry = object(value, name, ['id', 'title', 'kind', 'steps']);
  const id = identifier(entry.id, `${name}.id`);
  const title = text(entry.title, `${name}.title`, 200);
  if (entry.kind !== 'primary' && entry.kind !== 'recovery') throw new Error(`${name}.kind must be primary or recovery.`);
  const steps = array(entry.steps, `${name}.steps`, 2, limits.steps).map((value, i) => step(value, `${name}.steps[${i}]`));
  let interaction = false, assertion = false, literalOutcome = false;
  for (const item of steps) {
    if (['click', 'press', 'check', 'select', 'expectDownload', 'expectHttpError'].includes(item.action)) interaction = true;
    if (interaction && ['expectText', 'expectValue', 'expectVisible', 'expectDownload'].includes(item.action)) assertion = true;
    if (interaction && (item.action === 'expectText' || item.action === 'expectValue' || (item.action === 'expectDownload' && item.text !== undefined))) literalOutcome = true;
  }
  if (!interaction || !assertion) throw new Error(`${name} must interact with the application (click, press, check, select, download or expectHttpError) and then assert the outcome. Filling and echoing an input alone is insufficient.`);
  if (entry.kind === 'primary' && !literalOutcome) throw new Error(`${name} is a primary journey and must assert a literal outcome after interaction using expectText, expectValue or expectDownload.text.`);
  return { id, title, kind: entry.kind, steps };
}

function isPrimary(criterion: AcceptanceCriterion): boolean {
  return !criterion.provenance?.length || criterion.provenance.some(item => item.kind !== 'recipe');
}

// Compare source phrases, not inferred domain meaning. Completeness belongs to the independent judge.
function phrase(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function syntheticCoverage(value: unknown, name: string, criterionId: string,
  acceptance: AcceptanceCriterion[], journeys: BrowserJourney[]): NonNullable<QualityPlan['criteria'][number]['syntheticCoverage']> {
  const coverage = object(value, `${name} (${criterionId}).syntheticCoverage`, ['assumptions', 'journeyIds', 'outputs']);
  const assumptions = text(coverage.assumptions, `${name}.syntheticCoverage.assumptions`);
  const ids = array(coverage.journeyIds, `${name}.syntheticCoverage.journeyIds`, 1, limits.journeys)
    .map((value, i) => identifier(value, `${name}.syntheticCoverage.journeyIds[${i}]`));
  if (new Set(ids).size !== ids.length) throw new Error(`${name}.syntheticCoverage.journeyIds contains duplicates.`);
  const primaryJourneys = ids.map(id => {
    const result = journeys.find(item => item.id === id);
    if (!result || result.kind !== 'primary') throw new Error(`${name}.syntheticCoverage must reference known primary journeys: ${id}.`);
    return result;
  });
  const outputs = array(coverage.outputs, `${name}.syntheticCoverage.outputs`, 1, limits.criteria).map((value, i) => {
    const label = `${name}.syntheticCoverage.outputs[${i}]`;
    const output = object(value, label, ['sourceCriterionId', 'name']);
    const sourceCriterionId = identifier(output.sourceCriterionId, `${label}.sourceCriterionId`);
    const outputName = text(output.name, `${label}.name`, 200).trim();
    const source = acceptance.find(item => item.id === sourceCriterionId);
    if (!source || !isPrimary(source) || !phrase(source.requirement).includes(phrase(outputName))) {
      throw new Error(`${label}: named output must quote text from a source criterion, not a generic recipe or invented output.`);
    }
    // Titles, input values, selectors and pre-interaction assertions are not output evidence.
    const asserted = primaryJourneys.some(item => {
      let interacted = false;
      return item.steps.some(step => {
        if (['click', 'press', 'check', 'select', 'expectDownload'].includes(step.action)) interacted = true;
        const literal = step.action === 'expectText' || step.action === 'expectDownload' ? step.text
          : step.action === 'expectValue' ? step.value : undefined;
        return interacted && literal !== undefined && phrase(literal).includes(phrase(outputName));
      });
    });
    if (!asserted) throw new Error(`${label}: named output ${outputName} needs a literal assertion after interaction in a synthetic primary journey.`);
    return { sourceCriterionId, name: outputName };
  });
  if (new Set(outputs.map(output => output.sourceCriterionId + '\0' + phrase(output.name))).size !== outputs.length) {
    throw new Error(`${name}.syntheticCoverage.outputs contains duplicates.`);
  }
  if (!outputs.some(output => output.sourceCriterionId === criterionId)) {
    throw new Error(`${name}.syntheticCoverage must name an output from its own deferred source criterion ${criterionId}.`);
  }
  return { assumptions, journeyIds: ids, outputs };
}

/** Planning-only strength check; persisted frozen contracts retain their original interpretation. */
export function assertPlannedRecoveryJourneys(journeys: BrowserJourney[]): void {
  for (const [index, journey] of journeys.entries()) {
    if (journey.kind !== 'recovery') continue;
    let acted = false, observed = false, retried = false, outcome = false;
    for (const step of journey.steps) {
      const action = ['fill', 'select', 'check', 'click', 'press', 'reload', 'restartRuntime', 'expectDownload', 'expectHttpError'].includes(step.action);
      const observation = ['expectText', 'expectValue', 'expectVisible'].includes(step.action);
      const literal = step.action === 'expectText' || step.action === 'expectValue'
        || (step.action === 'expectDownload' && step.text !== undefined);
      // A content-checked download may both retry and establish the final outcome.
      // All other stages must occur in separate, ordered steps.
      if (observed && action) retried = true;
      if (retried && literal) outcome = true;
      if (acted && observation) observed = true;
      if (action) acted = true;
    }
    if (!outcome) throw new Error(`journeys[${index}] (${journey.id}) recovery must act, observe the failure with expectText, expectValue or expectVisible, then correct or retry and assert a literal outcome with expectText, expectValue or expectDownload.text. Opening help or observing an error alone is insufficient.`);
  }
}

/** Check screen coverage before freeze without changing legacy frozen UX contracts. */
export function assertPlannedUxStructure(ux: UxSpec, journeys: BrowserJourney[], requireStructure = false): void {
  if (ux.schemaVersion === 1) {
    if (requireStructure && journeys.length) throw new Error('Browser and service planning requires ux-spec.json schemaVersion 2 with an explicit screen structure.');
    if (journeys.some(journey => journey.steps.some(step => step.action === 'expectScreen'))) {
      throw new Error('expectScreen requires ux-spec.json schemaVersion 2 with stable screen IDs, routes and selectors.');
    }
    return;
  }
  if (!journeys.length) return;
  const screenIds = new Set(ux.screens.map(screen => screen.id)), covered = new Set<string>();
  for (const [index, journey] of journeys.entries()) {
    const first = journey.steps[0];
    if (first?.action !== 'expectScreen' || first.screenId !== ux.structure.entryScreenId) {
      throw new Error(`journeys[${index}] (${journey.id}) must start with expectScreen for the entry screen ${ux.structure.entryScreenId}.`);
    }
    let currentScreen: string | undefined, interacted = false;
    for (const step of journey.steps) {
      if (step.action !== 'expectScreen') {
        if (['fill', 'click', 'press', 'select', 'check', 'reload', 'restartRuntime', 'expectDownload', 'expectHttpError'].includes(step.action)) interacted = true;
        continue;
      }
      if (!screenIds.has(step.screenId)) throw new Error(`journeys[${index}] (${journey.id}) references an unknown screen: ${step.screenId}.`);
      if (currentScreen !== undefined && currentScreen !== step.screenId && !interacted) {
        throw new Error(`journeys[${index}] (${journey.id}) must navigate with an application interaction or reload before changing expectScreen from ${currentScreen} to ${step.screenId}.`);
      }
      covered.add(step.screenId);
      currentScreen = step.screenId;
      interacted = false;
    }
  }
  const missing = [...screenIds].filter(id => !covered.has(id));
  if (missing.length) throw new Error(`Every planned screen must be covered by expectScreen in a browser journey. Missing screens: ${missing.join(', ')}.`);
}

/** Reject evidence dead ends before freeze; saved contracts keep their original interpretation. */
export function assertPlannedCapabilityEvidence(
  criteria: ReadonlyArray<Pick<QualityPlan['criteria'][number], 'criterionId' | 'disposition' | 'capabilityIds'>>,
  capabilities: SolutionContract['capabilities']
): void {
  for (const capability of capabilities) {
    const used = criteria.some(criterion => criterion.capabilityIds?.includes(capability.id));
    if (!capability.required && !used) continue;
    if (!capability.evaluationIds.length) {
      throw new Error(`Capability ${capability.id} is required or claimed by an implemented criterion and must declare at least one host evaluation in evaluationIds before planning can freeze.`);
    }
    for (const criterionId of capability.criterionIds) {
      const criterion = criteria.find(item => item.criterionId === criterionId);
      if (criterion?.disposition !== 'implemented' || !criterion.capabilityIds?.includes(capability.id)) {
        throw new Error(`Capability ${capability.id} is required or claimed by an implemented criterion, so criterion ${criterionId} must also be implemented and reference it in capabilityIds. Correct the capability's criterionIds or the acceptance mapping before planning can freeze.`);
      }
    }
  }
}

/** Parse the complete host-owned acceptance inventory into a bounded evidence contract. */
export function parseQualityPlan(value: unknown, acceptance: AcceptanceCriterion[], solution?: SolutionContract): QualityPlan {
  const plan = object(value, 'acceptance-plan.json', ['schemaVersion', 'criteria', 'journeys']);
  if (plan.schemaVersion !== 1 && plan.schemaVersion !== 2) throw new Error('acceptance-plan.json.schemaVersion must be 1 or 2.');
  if (plan.schemaVersion === 2 && !solution) throw new Error('A version 2 acceptance plan requires solution-contract.json.');
  if (solution && plan.schemaVersion !== 2) throw new Error('A solution contract requires acceptance-plan.json schemaVersion 2 with capabilityIds.');
  const inventory = new Set(acceptance.map(criterion => criterion.id));
  if (!inventory.size || inventory.size !== acceptance.length || inventory.size > limits.criteria) throw new Error('The acceptance inventory must have 1–512 unique criterion IDs.');
  const journeys = array(plan.journeys, 'journeys', plan.schemaVersion === 1 ? 2 : 0, limits.journeys).map((value, i) => journey(value, `journeys[${i}]`));
  if (solution?.runtime.profile !== 'service' && journeys.some(journey => journey.steps.some(step => step.action === 'restartRuntime' || step.action === 'expectServiceState'))) {
    throw new Error('restartRuntime and expectServiceState require a declared service runtime; static browser and CLI profiles do not support service lifecycle evidence.');
  }
  if (solution?.runtime.profile !== 'cli' && plan.schemaVersion === 2 && !journeys.length) throw new Error('Browser and service delivery profiles require primary and recovery browser journeys.');
  if (solution?.runtime.profile === 'cli' && journeys.length) throw new Error('A CLI delivery profile cannot declare browser journeys. Use a browser or service profile for an interface.');
  const journeyIds = new Set(journeys.map(item => item.id));
  if (journeyIds.size !== journeys.length) throw new Error('Journey IDs must be unique.');
  if (journeys.length && (!journeys.some(item => item.kind === 'primary') || !journeys.some(item => item.kind === 'recovery'))) throw new Error('Include at least one primary journey and one recovery journey.');
  const seen = new Set<string>(), referenced = new Set<string>();
  const criteria: QualityPlan['criteria'] = array(plan.criteria, 'criteria', 1, limits.criteria).map((value, i) => {
    const name = `criteria[${i}]`;
    const entry = object(value, name, ['criterionId', 'disposition', 'expectedOutcome', 'journeyIds', 'reason', 'syntheticCoverage', ...(plan.schemaVersion === 2 ? ['capabilityIds'] : [])]);
    const criterionId = identifier(entry.criterionId, `${name}.criterionId`);
    if (!inventory.has(criterionId)) throw new Error(`${name} names an unknown criterion: ${criterionId}.`);
    if (seen.has(criterionId)) throw new Error(`Duplicate criterion: ${criterionId}.`);
    seen.add(criterionId);
    if (entry.disposition !== 'implemented' && entry.disposition !== 'deferred') throw new Error(`${name}.disposition must be implemented or deferred.`);
    const expectedOutcome = text(entry.expectedOutcome, `${name}.expectedOutcome`);
    const ids = array(entry.journeyIds, `${name}.journeyIds`, 0, limits.journeys).map((value, j) => identifier(value, `${name}.journeyIds[${j}]`));
    if (new Set(ids).size !== ids.length) throw new Error(`${name}.journeyIds contains duplicates.`);
    for (const id of ids) if (!journeyIds.has(id)) throw new Error(`${name} references an unknown journey: ${id}.`);
    const capabilityIds = plan.schemaVersion === 2
      ? array(entry.capabilityIds, `${name}.capabilityIds`, 0, 64).map((value, j) => identifier(value, `${name}.capabilityIds[${j}]`)) : [];
    if (new Set(capabilityIds).size !== capabilityIds.length) throw new Error(`${name}.capabilityIds contains duplicates.`);
    for (const id of capabilityIds) {
      const capability = solution?.capabilities.find(item => item.id === id);
      if (!capability) throw new Error(`${name} references an unknown capability: ${id}.`);
      if (!capability.criterionIds.includes(criterionId)) throw new Error(`${name} references capability ${id} without its criterion mapping in the solution contract.`);
    }
    const reason = Object.hasOwn(entry, 'reason') ? text(entry.reason, `${name}.reason`) : undefined;
    const requiredCapability = solution?.capabilities.find(capability => capability.required && capability.criterionIds.includes(criterionId));
    if (requiredCapability && entry.disposition === 'deferred') throw new Error(`Required capability ${requiredCapability.id} must be implemented and mapped by criterion ${criterionId}; core capabilities cannot be deferred.`);
    if (entry.disposition === 'deferred') {
      if (!reason || ids.length || capabilityIds.length) throw new Error(`${name}: a deferred criterion requires a nonempty reason and no journeyIds or capabilityIds.`);
      if (!/^(real-system|real-data|human-authority):\s*\S/.test(reason)) {
        throw new Error(`${name} (${criterionId}): deferral reason must start with real-system:, real-data:, or human-authority: followed by a concrete dependency. Missing specifications or experts require a labeled synthetic stand-in, not deferral.`);
      }
    } else {
      if (!ids.length && !capabilityIds.length) throw new Error(`${name}: an implemented criterion must map to at least one journey or capability.`);
      ids.forEach(id => referenced.add(id));
    }
    let synthetic: QualityPlan['criteria'][number]['syntheticCoverage'];
    if (Object.hasOwn(entry, 'syntheticCoverage')) {
      if (entry.disposition !== 'deferred') throw new Error(`${name}.syntheticCoverage is allowed only for a deferred criterion; do not relabel partial work as implemented.`);
      synthetic = syntheticCoverage(entry.syntheticCoverage, name, criterionId, acceptance, journeys);
      synthetic.journeyIds.forEach(id => referenced.add(id));
    }
    return { ...(plan.schemaVersion === 2 ? { capabilityIds } : {}), criterionId, disposition: entry.disposition, expectedOutcome, journeyIds: ids, ...(reason !== undefined ? { reason } : {}), ...(synthetic ? { syntheticCoverage: synthetic } : {}) };
  });
  const missing = [...inventory].filter(id => !seen.has(id));
  if (missing.length) throw new Error(`Missing acceptance criteria: ${missing.join(', ')}.`);
  if (!criteria.some(criterion => criterion.disposition === 'implemented')) throw new Error('At least one acceptance criterion must be implemented.');
  for (const criterion of criteria) {
    if (criterion.disposition === 'deferred' && isPrimary(acceptance.find(item => item.id === criterion.criterionId)!) && !criterion.syntheticCoverage) {
      throw new Error(`${criterion.criterionId}: a primary deferral requires syntheticCoverage with assumptions, named source outputs and primary journey evidence. Generic recipe implementation is insufficient.`);
    }
  }
  const unused = [...journeyIds].filter(id => !referenced.has(id));
  if (unused.length) throw new Error(`Every journey must map to an implemented criterion or deferred syntheticCoverage. Unmapped journeys: ${unused.join(', ')}.`);
  for (const capability of solution?.capabilities ?? []) for (const criterionId of capability.criterionIds) {
    const criterion = criteria.find(item => item.criterionId === criterionId)!;
    if (capability.required && (criterion.disposition !== 'implemented' || !criterion.capabilityIds?.includes(capability.id))) {
      throw new Error(`Required capability ${capability.id} must be implemented and mapped by criterion ${criterionId}; core capabilities cannot be deferred.`);
    }
  }
  return { schemaVersion: plan.schemaVersion, criteria, journeys };
}

export function parseUxSpec(value: unknown): UxSpec {
  const commonFields = ['schemaVersion', 'audience', 'primaryTask', 'successOutcome', 'screens', 'states', 'persistence', 'recovery', 'keyboard'];
  const spec = object(value, 'ux-spec.json', [...commonFields, 'structure']);
  if (spec.schemaVersion !== 1 && spec.schemaVersion !== 2) throw new Error('ux-spec.json.schemaVersion must be 1 or 2.');
  if (spec.schemaVersion === 1) object(value, 'ux-spec.json', commonFields);
  const states = object(spec.states, 'states', ['empty', 'loading', 'error', 'success']);
  const common: UxSpecCommon = {
    audience: text(spec.audience, 'audience'), primaryTask: text(spec.primaryTask, 'primaryTask'), successOutcome: text(spec.successOutcome, 'successOutcome'),
    states: { empty: text(states.empty, 'states.empty'), loading: text(states.loading, 'states.loading'), error: text(states.error, 'states.error'), success: text(states.success, 'states.success') },
    persistence: text(spec.persistence, 'persistence'), recovery: text(spec.recovery, 'recovery'), keyboard: text(spec.keyboard, 'keyboard')
  };
  const screenValues = array(spec.screens, 'screens', 1, limits.screens);
  if (spec.schemaVersion === 1) {
    const screens = screenValues.map((value, i) => {
      const screen = object(value, `screens[${i}]`, ['name', 'purpose', 'primaryAction']);
      return { name: text(screen.name, `screens[${i}].name`, 200), purpose: text(screen.purpose, `screens[${i}].purpose`), primaryAction: text(screen.primaryAction, `screens[${i}].primaryAction`) };
    });
    if (new Set(screens.map(screen => screen.name.trim())).size !== screens.length) throw new Error('Screen names must be unique.');
    return {
      schemaVersion: 1, audience: common.audience, primaryTask: common.primaryTask, successOutcome: common.successOutcome, screens,
      states: common.states, persistence: common.persistence, recovery: common.recovery, keyboard: common.keyboard
    };
  }
  const structureValue = object(spec.structure, 'structure', ['pattern', 'rationale', 'entryScreenId', 'navigation', 'persistentElements']);
  if (!['single-task', 'steps', 'list-detail', 'workspace'].includes(structureValue.pattern as string)) {
    throw new Error('structure.pattern must be single-task, steps, list-detail or workspace.');
  }
  const structure: UxStructure = {
    pattern: structureValue.pattern as UxStructure['pattern'], rationale: text(structureValue.rationale, 'structure.rationale'),
    entryScreenId: identifier(structureValue.entryScreenId, 'structure.entryScreenId'), navigation: text(structureValue.navigation, 'structure.navigation'),
    persistentElements: text(structureValue.persistentElements, 'structure.persistentElements')
  };
  const screens: UxScreen[] = screenValues.map((value, i) => {
    const name = `screens[${i}]`;
    const screen = object(value, name, ['id', 'name', 'purpose', 'primaryAction', 'route', 'selector', 'layout', 'secondaryContent', 'narrowLayout']);
    const route = text(screen.route, `${name}.route`, 1000), base = 'http://127.0.0.1';
    const address = new URL(route, base);
    if (!route.startsWith('/') || route.startsWith('//') || /[\\\s\u0000-\u001f\u007f]/.test(route)
      || address.origin !== base || address.pathname + address.search + address.hash !== route) {
      throw new Error(`${name}.route must be an exact origin-relative path with optional query or fragment, without a host, backslashes, whitespace, control characters or normalization.`);
    }
    const selector = text(screen.selector, `${name}.selector`, limits.selector).trim();
    if (selector.includes('>>')) throw new Error(`${name}.selector must be ordinary CSS, without Playwright selector chains.`);
    return {
      id: identifier(screen.id, `${name}.id`), name: text(screen.name, `${name}.name`, 200), purpose: text(screen.purpose, `${name}.purpose`),
      primaryAction: text(screen.primaryAction, `${name}.primaryAction`), route, selector,
      layout: text(screen.layout, `${name}.layout`), secondaryContent: text(screen.secondaryContent, `${name}.secondaryContent`), narrowLayout: text(screen.narrowLayout, `${name}.narrowLayout`)
    };
  });
  for (const key of ['id', 'name', 'selector'] as const) {
    if (new Set(screens.map(screen => screen[key].trim())).size !== screens.length) throw new Error(`Screen ${key === 'id' ? 'IDs' : key + 's'} must be unique.`);
  }
  if (!screens.some(screen => screen.id === structure.entryScreenId)) throw new Error('structure.entryScreenId must reference a declared screen ID.');
  return { schemaVersion: 2, ...common, structure, screens };
}

export const qualityContractGuide = `# Application and solution quality contract (schema version 2)

Write acceptance-plan.json (schemaVersion 2), ux-spec.json (schemaVersion 2 for browser/service delivery; version 1 is allowed for CLI), solution-contract.json and evaluation-plan.json during planning, before implementation. Read solution-contract.md for runtime and host evaluator schemas. Use valid JSON without comments or extra fields. The host validates and freezes all four contracts; implementation and repair must satisfy planned outcomes rather than rewrite them. Evaluation answer keys are sealed outside the implementation workspace after planning. Do not recreate evaluation-plan.json during implementation or repair. The host restores it for final delivery.

Plan a working application with real workflows and an empty first-run state when no user records have been supplied. Keep generated records in developer tests and evaluation fixtures; browser journeys enter or import those records explicitly. Do not seed the default application with fictional records or make its interface describe itself as a synthetic-data demo, mock, or prototype. When the workflow needs external data, define the plugin or connector interface and the setup path the owner will use to implement and configure it after the build. An unconfigured integration must show its actual setup status and preserve usable local workflows; it must never return fabricated connected results. Include the relevant first-run, import, validation and missing-configuration behavior in the frozen journeys.

## acceptance-plan.json

Include every canonical ID from packet.json acceptance exactly once in criteria. Each entry has criterionId, disposition (implemented or deferred), expectedOutcome (an independently established complete outcome), journeyIds (array of journey IDs), capabilityIds for version 2 (array of solution capability IDs), and optional reason. An implemented criterion needs at least one journey or capability. Required capabilities must be implemented and mapped by their criteria. A deferred criterion needs a nonempty reason and an empty journeyIds array. At least one criterion must be implemented. Provenance identifies repeated source entries combined under one canonical ID; do not add alias IDs as separate criteria.

${primaryDeferralPolicy}

Deferred primary criteria also require syntheticCoverage: {"assumptions":"Fictional inputs, grammar, data and rules; no real-format validation","journeyIds":["synthetic-primary"],"outputs":[{"sourceCriterionId":"UCcustom-1","name":"exact output phrase from that source requirement"}]}. Treat every non-recipe provenance, merged source/recipe criterion and criterion without provenance as primary. Each output name must quote its source requirement (case and whitespace insensitive, at most 200 characters), include at least one output from the deferred criterion itself and have a literal expectText, expectValue or expectDownload.text assertion after interaction in a referenced primary journey. IDs must be unique known primary journeys, and output source/name pairs must be unique. Input values, titles, selectors, filenames and visibility alone are insufficient evidence. Only deferred criteria may carry syntheticCoverage. Recipe-only deferrals retain the existing reason-prefix rule without requiring syntheticCoverage. Every journey must be referenced by an implemented criterion or syntheticCoverage; all journeys still execute at both widths.

Structural limits: source phrases and literal assertions do not establish that the dependency is genuine, the examples match the requested format, the output list is exhaustive, the values are correct or the workflow actually transforms the input. The independent judge checks those against the card and the independent answer key. Do not relabel missing or partial behavior implemented to evade this check. Old plans missing required coverage need a new planning run, never edits to a frozen plan.

A primary requirement or expected deliverable may be deferred only when it truly requires real systems, real data or a person's authority. Lack of an official specification, format mapping or domain expert is never a reason to defer it. Build a clearly labeled synthetic stand-in that demonstrates the whole requested workflow in the challenge's own vocabulary, with realistic invented sample data and the actual named outputs. Document the invented grammar, assumptions and answer key; state plainly in the UI, sample data, exports and evidence: synthetic, not validated against the real format. Never invent operational rules, claim real-format validation or imply that synthetic behavior proves operational readiness. A generic substitute that omits the defining behaviors is incomplete.

For example, mock USMTF extraction must demonstrate frequency plans, crypto change-over windows and flight quarters on a 24-hour timeline using an explicitly invented grammar, not just generic EVENT/TASK records. A departmental-agent challenge needs a synthetic demonstration of the named departments, negotiation and resulting schedule, not merely a manual form. These are synthetic workflows, with no real messages, cryptographic material, personnel or system access.

For every deferral, start reason with exactly one allowed category followed by a concrete unmet dependency: real-system:, real-data:, or human-authority:. Name the required system, data or owner role, the withheld action and the synthetic workflow still demonstrated. Example: "human-authority: Only the owner can authorize publication; no publication is attempted. A labeled synthetic review workflow produces the draft." This conservative structural rule covers all deferrals because the inventory has no primary flag. The parser checks the category and nonempty explanation, not whether the dependency is genuine. Missing a specification or expert cannot be relabeled as human-authority; reserve that category for an action requiring a person's actual approval.

Put a Primary deferrals section first in scope.md, plan.md, verification.md, the user guide and the review summary. List every deferred primary requirement and expected deliverable by canonical ID, original wording, allowed dependency, withheld action and demonstrated stand-in, or explicitly state none. Keep the full inventory in test-matrix.md. A deferred criterion remains unverified and prevents a claim that all requirements are met. Preserve source meaning: implemented synthetic prototype behavior must cover all named behaviors and outputs under an explicit synthetic scope. A partial demonstration cannot count as the whole requirement, and a requirement explicitly demanding real integration, real data validation or approval remains deferred until that dependency is satisfied. Do not rewrite or drop a requirement to manufacture completion.

Each browser step has 5 seconds. A journey cannot wait on anything slower, so a simulated transfer, timer or delay must finish inside that, or its rule must let the app complete it at once. Never freeze a real-time rate or delay that a planned step has to wait for.

CLI delivery uses no browser journeys and requires computational capability evidence. Browser and service delivery include 2 to 12 journeys. Each has a unique id, title, kind (primary or recovery), and 2 to 40 ordered steps. Include both primary and recovery journeys; every journey must be referenced by an implemented criterion or deferred syntheticCoverage. Each journey must interact via click, press, check, select or expectDownload and then assert the outcome. Filling a field and reading its value alone does not establish a working application. A primary journey must assert a literal result with expectText, expectValue or expectDownload with text; expectVisible alone is insufficient. Choose narrow result selectors and independent expected values. A recovery journey should induce invalid input or another failure, observe it, then recover and verify success. All journeys run at desktop and narrow widths against the delivered application.

A recovery journey MUST induce invalid input or another failure with an action, observe it using expectText, expectValue or expectVisible, then perform a later correction or retry and assert a literal successful outcome with expectText, expectValue or expectDownload.text. Correction may use fill, select, check, click, press or reload; a content-checked download can both retry and establish the outcome. Inline correction does not need an extra submit click. Opening help, stopping at an error, or checking only visibility after retry is insufficient. Use an actual error observation and an independent successful result; sequence validation cannot establish their meaning. All journeys run at desktop and narrow widths against the delivered application.

For UX version 2, start EVERY browser journey with expectScreen for structure.entryScreenId. Cover every declared screen across the journeys, navigating through the application's own links, buttons or other controls before asserting a different screen. A reload may also change the active screen when the planned behavior returns to the entry view. expectScreen verifies the exact planned route, the active screen's visible root, and that other planned screen roots are hidden or absent; it does not navigate. Test navigation and work preservation explicitly with literal draft/saved values after moving between views or reloading. Use expectHidden to prove secondary controls remain collapsed until requested. Screen/visibility checks do not replace literal domain outcomes or the complete recovery sequence above.

Allowed steps (selector is ordinary CSS identifying one element):
- {"action":"fill","selector":"#title","value":"Inspect pump"}
- {"action":"click","selector":"#save"}
- {"action":"select","selector":"#department","value":"engineering"}
- {"action":"press","selector":"#title","key":"Enter"}
- {"action":"check","selector":"#reviewed"}
- {"action":"reload"}
- {"action":"restartRuntime"}
- {"action":"expectServiceState","input":{"action":"list"},"expected":{"tasks":["Inspect pump"]}}
- {"action":"expectText","selector":"#result","text":"Saved: Inspect pump"}
- {"action":"expectValue","selector":"#title","value":""}
- {"action":"expectVisible","selector":"#validation-error"}
- {"action":"expectHidden","selector":"#advanced-fields"}
- {"action":"expectScreen","screenId":"tasks"}
- {"action":"expectHttpError","selector":"#save","path":"/api/tasks","method":"POST","status":422}
- {"action":"expectDownload","selector":"#export","fileName":"records.csv","text":"Inspect pump"}

expectText compares the exact visible innerText after whitespace normalization. expectValue compares the exact value. expectHidden requires an element to be hidden or absent. expectDownload captures the selected control once and reuses its file for further assertions on that selector until fill, click, select, press, check, reload or expectHttpError. Set fresh: true to require another capture without an edit. Every assertion checks the captured bytes; optional fileName must match the suggested filename exactly, and optional text is a literal substring of the UTF-8 file contents. expectHttpError clicks the selected control and requires a new same-origin fetch/XHR response at the exact path (including any query), method (GET, POST, PUT, PATCH or DELETE), and status (integer 400–499). Use it instead of click when deliberately submitting invalid input to a service. It excuses only the browser's resource diagnostic for that observed response. Follow it with an assertion of the visible error, correction/retry, and a literal successful outcome; an HTTP rejection alone does not demonstrate recovery. Unexpected requests, other failures and application console errors still fail. HTTP error paths are origin-relative, at most 1,000 characters, with no host, fragment or normalization. No evaluate, JavaScript, arbitrary goto/navigation steps, absolute URLs, arbitrary commands, timeouts or custom step fields are supported. Native application links and navigation controls ARE supported, including transitions between separate HTML pages or server routes; there is no single-page output requirement. Use supplied or generated local test inputs in these verification journeys, entering or importing them explicitly rather than preloading the application with fixtures. Values for fill and expectValue may be empty for validation/reset checks; all other strings must be nonempty. IDs start with a letter and contain letters, digits, underscores or hyphens (maximum 80 characters). Descriptions and expectedOutcome are at most 4,000 characters, titles 200, selectors 512, values/expected text 10,000, keys 80, filenames 255. At most 512 criteria are supported.

restartRuntime and expectServiceState require a service runtime. restartRuntime has no arguments: the host stops and starts the actual application process in the same temporary package at the same URL, retaining its writable data and browser context, then reloads the page. This is distinct from reload, which retains process memory. expectServiceState invokes the declared service protocol directly from the host with input and compares the complete JSON response with expected; object key order is irrelevant and array order is exact. Each value must be finite ordinary JSON, at most 20 levels deep and 100,000 UTF-8 bytes. Use a read-only state operation from the public invocation protocol after a UI save and after restart to prove backend persistence independently of browser-local state. Follow with literal visible outcomes to prove the interface also recovers. Neither action accepts browser code, arbitrary commands, selectors or replacement expectations during implementation. Static browser and CLI plans cannot use these steps.

Example shape (replace UCcustom-1 and add every remaining packet criterion; do not copy sample outcomes unless they describe the actual requested workflow):
{
  "schemaVersion": 2,
  "criteria": [{"criterionId":"UCcustom-1","disposition":"implemented","expectedOutcome":"A saved task is visible and empty titles are rejected without losing the draft.","journeyIds":["save-task","recover-title"],"capabilityIds":["task-storage"]}],
  "journeys": [
    {"id":"save-task","title":"Create a task","kind":"primary","steps":[{"action":"expectScreen","screenId":"tasks"},{"action":"click","selector":"#new-task"},{"action":"expectScreen","screenId":"create-task"},{"action":"expectHidden","selector":"#advanced-fields"},{"action":"fill","selector":"#title","value":"Inspect pump"},{"action":"click","selector":"#save"},{"action":"expectScreen","screenId":"tasks"},{"action":"expectText","selector":"#result","text":"Saved: Inspect pump"},{"action":"reload"},{"action":"expectScreen","screenId":"tasks"},{"action":"expectText","selector":"#task-list .task-title","text":"Inspect pump"}]},
    {"id":"recover-title","title":"Recover from an empty title","kind":"recovery","steps":[{"action":"expectScreen","screenId":"tasks"},{"action":"click","selector":"#new-task"},{"action":"expectScreen","screenId":"create-task"},{"action":"fill","selector":"#title","value":""},{"action":"click","selector":"#save"},{"action":"expectText","selector":"#validation-error","text":"Enter a title."},{"action":"fill","selector":"#title","value":"Inspect valve"},{"action":"click","selector":"#save"},{"action":"expectScreen","screenId":"tasks"},{"action":"expectText","selector":"#result","text":"Saved: Inspect valve"}]}
  ]
}

## ux-spec.json

For browser/service delivery, choose the interaction pattern before placing components: single-task for one focused action, steps for a guided sequence, list-detail for browsing and inspecting records, or workspace for distinct recurring tasks. Choose based on the requested workflow; a single focused screen remains valid. Separate unrelated tasks into focused views and put supporting controls behind purposeful disclosure. Multiple pages, server routes, client routes, tabs or step views are allowed. Do not render every planned screen as a permanently visible section of one long page.

Version 2 requires structure (pattern, rationale, entryScreenId, navigation, persistentElements) and 1–12 screens. Every structure field is a required JSON string; in particular, persistentElements is one prose string, not an array of elements. Describe every shared element and preserved state in that string. When no shared elements exist, say so explicitly instead of omitting the field or using an empty string, null or an empty array. Every screen requires id, name, purpose, primaryAction, route, selector, layout, secondaryContent and narrowLayout, each as a JSON string. Use the exact field name selector, never rootSelector. IDs, trimmed names and selectors are unique; routes may be shared by mutually exclusive tabs/steps. entryScreenId references the screen reached at launch. route is the exact application-relative path with optional query/fragment, at most 1,000 characters; no host, backslashes, whitespace, control characters or normalization. For a static browser delivery, the entry route is typically /index.html (matching runtime.entrypoint); for a service it is typically /. Exclude host-generated preview mount tokens from routes. selector is ordinary CSS for that screen's unique content root, not a persistent app shell, and cannot use Playwright selector chains. Other screen roots must be hidden or absent when that screen is active; place shared navigation/header outside them.

Use layout as a rough textual sketch of regions, order, alignment and emphasis before implementation. secondaryContent specifies which optional controls/details are initially hidden and the control that reveals them (or explicitly says there are none). narrowLayout explains how that screen adapts without clipping or losing its primary action. navigation names real control labels and transitions, including return/back behavior. persistentElements describes shared shell controls and what survives changing views. Build the navigation and screen layout first, then populate the task-specific content. All descriptive fields are required nonempty strings up to 4,000 characters; names are at most 200, selectors 512 and IDs 80. Explicitly describe loading behavior even for immediate local operations. Use real task language and planned control labels. This two-page example is illustrative, not a screen-count or routing requirement:
{
  "schemaVersion": 2,
  "audience": "Maintenance staff working offline",
  "primaryTask": "Create and review a maintenance task",
  "successOutcome": "The task appears in the list with a clear saved state",
  "structure": {"pattern":"list-detail","rationale":"Reviewing saved tasks and entering a new task need different primary content.","entryScreenId":"tasks","navigation":"New task opens the task form; Save task returns to Tasks; Back to tasks preserves the draft.","persistentElements":"A compact application header and Tasks link remain available on both pages. Saved tasks and in-progress drafts survive navigation."},
  "screens": [
    {"id":"tasks","name":"Tasks","purpose":"Review saved work","primaryAction":"New task","route":"/index.html","selector":"#tasks-screen","layout":"Header above a centered content column. Task count and New task share a toolbar; a readable task list fills the main region; save status follows the toolbar.","secondaryContent":"Export and destructive reset are in a labeled More actions menu, initially closed.","narrowLayout":"The toolbar wraps with New task still visible; each task becomes a compact row without horizontal scrolling."},
    {"id":"create-task","name":"New task","purpose":"Capture one task without competing list controls","primaryAction":"Save task","route":"/new-task.html","selector":"#create-task-screen","layout":"Back to tasks above the heading; a narrow form column contains title and validation, optional settings disclosure, then Save task.","secondaryContent":"Advanced settings reveals #advanced-fields; these are initially hidden and contain only optional fields.","narrowLayout":"Labels sit above full-width fields and the save action remains below the form in normal document flow."}
  ],
  "states": {"empty":"Start with no tasks and offer New task or an implemented import action; when external data is needed, show the connector setup path for the owner after the build","loading":"Local saves are immediate; prevent duplicate submissions","error":"Place a specific error beside the field and preserve entered values","success":"Confirm the saved task and show the next action"},
  "persistence": "Tasks survive reload in local storage; disclose local-only storage and provide export",
  "recovery": "Correct invalid fields without losing the draft; confirm destructive reset",
  "keyboard": "Every control is labeled and reachable in logical Tab order with visible focus"
}

Passing these contracts checks the declared browser behavior. Review must still assess whether the planned expected outcomes express every defining source requirement and whether declared deferral dependencies are genuine. Expert validation is a separate evidence boundary, never a prerequisite for building the synthetic workflow. A passed browser run does not establish real-format or operational validation or certify deferred integrations.
CLI delivery may retain schemaVersion 1: omit structure and use screens with only name, purpose and primaryAction to describe terminal interaction. Preserve audience, primaryTask, successOutcome, states, persistence, recovery and keyboard. CLI delivery has no browser screen assertions. Existing frozen version 1 UX contracts remain readable without acquiring new structure requirements.

Passing requires executed Node tests, all required host capability evaluations, a clean runtime prepared from declared delivery files, and all declared browser journeys at both viewport sizes. Every application test file must register and complete at least one node:test case using test() or it(); comments, exports, top-level assertions, empty suites and printed success messages do not count. Skipped/todo tests or suites fail verification. The host derives counts from runner events, not text printed by application tests. For version 2, the host copies application test files into the clean installed runtime and runs them there with only the declared runtime environment. Include any test helper modules and data fixtures in runtime.files; test files cannot rely on ambient workspace files, host toolkit internals or evaluation answer keys. A green browser cannot override a failed computational evaluation. Domain experts still need to assess whether planned expectations and datasets express the source requirements. Synthetic benchmarks establish declared behavior; representative reviewed data is needed to establish operational usefulness. Version 1 browser-only contracts remain readable for earlier runs.
`;
