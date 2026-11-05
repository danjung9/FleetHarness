import type { AcceptanceCriterion } from './types.js';
import type { BrowserJourney, BrowserStep, QualityPlan, UxSpec } from '../shared/quality.js';

const limits = { criteria: 512, journeys: 12, steps: 40, screens: 12, description: 4_000, selector: 512, value: 10_000 };

function object(value: unknown, name: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error(`${name} must be an object.`);
  }
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(`${name} has an unknown field: ${key}.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, max = limits.description, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) {
    throw new Error(`${name} must be ${allowEmpty ? 'a' : 'a nonempty'} string of at most ${max} characters.`);
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

function version(value: unknown, name: string) {
  if (value !== 1) throw new Error(`${name}.schemaVersion must be 1.`);
}

function step(value: unknown, name: string): BrowserStep {
  const entry = object(value, name, ['action', 'selector', 'value', 'key', 'text', 'fileName']);
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
    case 'click': case 'check': case 'expectVisible':
      fields('selector');
      return { action, selector: selector() };
    case 'press':
      fields('selector', 'key');
      return { action, selector: selector(), key: text(entry.key, `${name}.key`, 80) };
    case 'reload':
      fields();
      return { action };
    case 'expectText':
      fields('selector', 'text');
      return { action, selector: selector(), text: text(entry.text, `${name}.text`, limits.value) };
    case 'expectDownload': {
      fields('selector', 'fileName', 'text');
      const result: Extract<BrowserStep, { action: 'expectDownload' }> = { action, selector: selector() };
      if (Object.hasOwn(entry, 'fileName')) result.fileName = text(entry.fileName, `${name}.fileName`, 255);
      if (Object.hasOwn(entry, 'text')) result.text = text(entry.text, `${name}.text`, limits.value);
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
    if (['click', 'press', 'check', 'select', 'expectDownload'].includes(item.action)) interaction = true;
    if (interaction && ['expectText', 'expectValue', 'expectVisible', 'expectDownload'].includes(item.action)) assertion = true;
    if (interaction && (item.action === 'expectText' || item.action === 'expectValue' || (item.action === 'expectDownload' && item.text !== undefined))) literalOutcome = true;
  }
  if (!interaction || !assertion) throw new Error(`${name} must interact with the application (click, press, check, select or download) and then assert the outcome. Filling and echoing an input alone is insufficient.`);
  if (entry.kind === 'primary' && !literalOutcome) throw new Error(`${name} is a primary journey and must assert a literal outcome after interaction using expectText, expectValue or expectDownload.text.`);
  return { id, title, kind: entry.kind, steps };
}

/** Parse the complete host-owned acceptance inventory into a bounded browser test contract. */
export function parseQualityPlan(value: unknown, acceptance: AcceptanceCriterion[]): QualityPlan {
  const plan = object(value, 'acceptance-plan.json', ['schemaVersion', 'criteria', 'journeys']);
  version(plan.schemaVersion, 'acceptance-plan.json');
  const inventory = new Set(acceptance.map(criterion => criterion.id));
  if (!inventory.size || inventory.size !== acceptance.length || inventory.size > limits.criteria) throw new Error('The acceptance inventory must have 1–512 unique criterion IDs.');
  const journeys = array(plan.journeys, 'journeys', 2, limits.journeys).map((value, i) => journey(value, `journeys[${i}]`));
  const journeyIds = new Set(journeys.map(item => item.id));
  if (journeyIds.size !== journeys.length) throw new Error('Journey IDs must be unique.');
  if (!journeys.some(item => item.kind === 'primary') || !journeys.some(item => item.kind === 'recovery')) throw new Error('Include at least one primary journey and one recovery journey.');
  const seen = new Set<string>(), referenced = new Set<string>();
  const criteria: QualityPlan['criteria'] = array(plan.criteria, 'criteria', 1, limits.criteria).map((value, i) => {
    const name = `criteria[${i}]`;
    const entry = object(value, name, ['criterionId', 'disposition', 'expectedOutcome', 'journeyIds', 'reason']);
    const criterionId = identifier(entry.criterionId, `${name}.criterionId`);
    if (!inventory.has(criterionId)) throw new Error(`${name} names an unknown criterion: ${criterionId}.`);
    if (seen.has(criterionId)) throw new Error(`Duplicate criterion: ${criterionId}.`);
    seen.add(criterionId);
    if (entry.disposition !== 'implemented' && entry.disposition !== 'deferred') throw new Error(`${name}.disposition must be implemented or deferred.`);
    const expectedOutcome = text(entry.expectedOutcome, `${name}.expectedOutcome`);
    const ids = array(entry.journeyIds, `${name}.journeyIds`, 0, limits.journeys).map((value, j) => identifier(value, `${name}.journeyIds[${j}]`));
    if (new Set(ids).size !== ids.length) throw new Error(`${name}.journeyIds contains duplicates.`);
    for (const id of ids) if (!journeyIds.has(id)) throw new Error(`${name} references an unknown journey: ${id}.`);
    const reason = Object.hasOwn(entry, 'reason') ? text(entry.reason, `${name}.reason`) : undefined;
    if (entry.disposition === 'deferred') {
      if (!reason || ids.length) throw new Error(`${name}: a deferred criterion requires a nonempty reason and no journeyIds.`);
    } else {
      if (!ids.length) throw new Error(`${name}: an implemented criterion must map to at least one journey.`);
      ids.forEach(id => referenced.add(id));
    }
    return { criterionId, disposition: entry.disposition, expectedOutcome, journeyIds: ids, ...(reason !== undefined ? { reason } : {}) };
  });
  const missing = [...inventory].filter(id => !seen.has(id));
  if (missing.length) throw new Error(`Missing acceptance criteria: ${missing.join(', ')}.`);
  if (!criteria.some(criterion => criterion.disposition === 'implemented')) throw new Error('At least one acceptance criterion must be implemented.');
  const unused = [...journeyIds].filter(id => !referenced.has(id));
  if (unused.length) throw new Error(`Every journey must map to an implemented criterion. Unmapped journeys: ${unused.join(', ')}.`);
  return { schemaVersion: 1, criteria, journeys };
}

export function parseUxSpec(value: unknown): UxSpec {
  const spec = object(value, 'ux-spec.json', ['schemaVersion', 'audience', 'primaryTask', 'successOutcome', 'screens', 'states', 'persistence', 'recovery', 'keyboard']);
  version(spec.schemaVersion, 'ux-spec.json');
  const screens = array(spec.screens, 'screens', 1, limits.screens).map((value, i) => {
    const screen = object(value, `screens[${i}]`, ['name', 'purpose', 'primaryAction']);
    return { name: text(screen.name, `screens[${i}].name`, 200), purpose: text(screen.purpose, `screens[${i}].purpose`), primaryAction: text(screen.primaryAction, `screens[${i}].primaryAction`) };
  });
  if (new Set(screens.map(screen => screen.name.trim())).size !== screens.length) throw new Error('Screen names must be unique.');
  const states = object(spec.states, 'states', ['empty', 'loading', 'error', 'success']);
  return {
    schemaVersion: 1,
    audience: text(spec.audience, 'audience'), primaryTask: text(spec.primaryTask, 'primaryTask'), successOutcome: text(spec.successOutcome, 'successOutcome'), screens,
    states: { empty: text(states.empty, 'states.empty'), loading: text(states.loading, 'states.loading'), error: text(states.error, 'states.error'), success: text(states.success, 'states.success') },
    persistence: text(spec.persistence, 'persistence'), recovery: text(spec.recovery, 'recovery'), keyboard: text(spec.keyboard, 'keyboard')
  };
}

export const qualityContractGuide = `# Application quality contract (schema version 1)

Write acceptance-plan.json and ux-spec.json during planning, before application implementation. Use valid JSON without comments or extra fields. The host validates and freezes these contracts for browser verification; implementation and repair must satisfy the planned outcomes rather than rewrite them to match observed behavior.

## acceptance-plan.json

Include every canonical ID from packet.json acceptance exactly once in criteria. Each entry has criterionId, disposition (implemented or deferred), expectedOutcome (an independently established complete outcome), journeyIds (array of journey IDs), and optional reason. An implemented criterion needs at least one journey. A deferred criterion needs a nonempty reason and an empty journeyIds array. At least one criterion must be implemented. Preserve the source meaning: a partial demo of a broad requirement is deferred, with the demonstrated slice described in its reason. Any deferred criterion remains unverified and prevents a claim that all requirements are met. Provenance identifies repeated source entries combined under one canonical ID; do not add alias IDs as separate criteria.

Include 2–12 journeys. Each has a unique id, title, kind (primary or recovery), and 2–40 ordered steps. Include both primary and recovery journeys; every journey must be referenced by an implemented criterion. Each journey must interact via click, press, check, select or expectDownload and then assert the outcome. Filling a field and reading its value alone does not establish a working application. A primary journey must assert a literal result with expectText, expectValue or expectDownload with text; expectVisible alone is insufficient. Choose narrow result selectors and independent expected values. A recovery journey should induce invalid input or another failure, observe it, then recover and verify success. All journeys run at desktop and narrow widths against the delivered application.

Allowed steps (selector is ordinary CSS identifying one element):
- {"action":"fill","selector":"#title","value":"Inspect pump"}
- {"action":"click","selector":"#save"}
- {"action":"select","selector":"#department","value":"engineering"}
- {"action":"press","selector":"#title","key":"Enter"}
- {"action":"check","selector":"#reviewed"}
- {"action":"reload"}
- {"action":"expectText","selector":"#result","text":"Saved: Inspect pump"}
- {"action":"expectValue","selector":"#title","value":""}
- {"action":"expectVisible","selector":"#validation-error"}
- {"action":"expectDownload","selector":"#export","fileName":"records.csv","text":"Inspect pump"}

expectText compares the exact visible innerText after whitespace normalization. expectValue compares the exact value. expectDownload clicks the selected control and checks the download; optional fileName must match the suggested filename exactly, and optional text is a literal substring of the UTF-8 file contents. No evaluate, JavaScript, navigation, URLs, arbitrary commands, timeouts or custom step fields are supported. Use local synthetic inputs. Values for fill and expectValue may be empty for validation/reset checks; all other strings must be nonempty. IDs start with a letter and contain letters, digits, underscores or hyphens (maximum 80 characters). Descriptions and expectedOutcome are at most 4,000 characters, titles 200, selectors 512, values/expected text 10,000, keys 80, filenames 255. At most 512 criteria are supported.

Example shape (replace UCcustom-1 and add every remaining packet criterion; do not copy sample outcomes unless they describe the actual requested workflow):
{
  "schemaVersion": 1,
  "criteria": [{"criterionId":"UCcustom-1","disposition":"implemented","expectedOutcome":"A saved task is visible and empty titles are rejected without losing the draft.","journeyIds":["save-task","recover-title"]}],
  "journeys": [
    {"id":"save-task","title":"Create a task","kind":"primary","steps":[{"action":"fill","selector":"#title","value":"Inspect pump"},{"action":"click","selector":"#save"},{"action":"expectText","selector":"#result","text":"Saved: Inspect pump"}]},
    {"id":"recover-title","title":"Recover from an empty title","kind":"recovery","steps":[{"action":"fill","selector":"#title","value":""},{"action":"click","selector":"#save"},{"action":"expectText","selector":"#validation-error","text":"Enter a title."},{"action":"fill","selector":"#title","value":"Inspect valve"},{"action":"click","selector":"#save"},{"action":"expectText","selector":"#result","text":"Saved: Inspect valve"}]}
  ]
}

## ux-spec.json

All fields below are required, nonempty strings (maximum 4,000 characters), except schemaVersion (1), screens (1–12 objects; unique name at most 200 characters), and states (object). Explicitly describe loading behavior even for immediate local operations. Describe intended behavior before coding, using real task language and planned control labels.
{
  "schemaVersion": 1,
  "audience": "Maintenance staff working offline",
  "primaryTask": "Create and review a maintenance task",
  "successOutcome": "The task appears in the list with a clear saved state",
  "screens": [{"name":"Tasks","purpose":"Capture and review work","primaryAction":"Save task"}],
  "states": {"empty":"Explain how to add a first task and offer synthetic sample input","loading":"Local saves are immediate; prevent duplicate submissions","error":"Place a specific error beside the field and preserve entered values","success":"Confirm the saved task and show the next action"},
  "persistence": "Tasks survive reload in local storage; disclose local-only storage and provide export",
  "recovery": "Correct invalid fields without losing the draft; confirm destructive reset",
  "keyboard": "Every control is labeled and reachable in logical Tab order with visible focus"
}

Passing these contracts checks the declared browser behavior. Domain experts still need to assess whether the planned expected outcomes fully express the source requirements. A passed browser run does not establish operational validation or certify deferred integrations.
`;
