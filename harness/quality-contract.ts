import type { AcceptanceCriterion } from './types.js';
import type { BrowserJourney, BrowserStep, QualityPlan, UxSpec } from '../shared/quality.js';

const limits = { criteria: 512, journeys: 12, steps: 40, screens: 12, description: 4_000, selector: 512, value: 10_000 };

export const primaryDeferralPolicy = `Report Primary deferrals first, by canonical ID, concrete allowed dependency, withheld action and demonstrated synthetic workflow, or state none. Follow the existing real-system:, real-data: or human-authority: reason policy. Every primary deferral needs syntheticCoverage with explicit assumptions, source-quoted output names and primary browser assertions, while retaining deferred disposition and empty journeyIds. Use labeled synthetic examples in the requested input format, with independent expected outputs fixed before implementation. A substitute input format or generic EVENT/TASK demonstration remains incomplete even when its own tests pass. Missing specifications or experts require explicit synthetic assumptions, never invented real-format validation. The independent judge must assess format fidelity, every named output and the complete workflow; structural validation cannot establish semantic adequacy. Keep human approval, prohibited actions, monitoring, escalation and shutdown visible.`;

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
  const entry = object(value, name, ['action', 'selector', 'value', 'key', 'text', 'fileName', 'fresh']);
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
    if (['click', 'press', 'check', 'select', 'expectDownload'].includes(item.action)) interaction = true;
    if (interaction && ['expectText', 'expectValue', 'expectVisible', 'expectDownload'].includes(item.action)) assertion = true;
    if (interaction && (item.action === 'expectText' || item.action === 'expectValue' || (item.action === 'expectDownload' && item.text !== undefined))) literalOutcome = true;
  }
  if (!interaction || !assertion) throw new Error(`${name} must interact with the application (click, press, check, select or download) and then assert the outcome. Filling and echoing an input alone is insufficient.`);
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
    const entry = object(value, name, ['criterionId', 'disposition', 'expectedOutcome', 'journeyIds', 'reason', 'syntheticCoverage']);
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
      if (!/^(real-system|real-data|human-authority):\s*\S/.test(reason)) {
        throw new Error(`${name} (${criterionId}): deferral reason must start with real-system:, real-data:, or human-authority: followed by a concrete dependency. Missing specifications or experts require a labeled synthetic stand-in, not deferral.`);
      }
    } else {
      if (!ids.length) throw new Error(`${name}: an implemented criterion must map to at least one journey.`);
      ids.forEach(id => referenced.add(id));
    }
    let synthetic: QualityPlan['criteria'][number]['syntheticCoverage'];
    if (Object.hasOwn(entry, 'syntheticCoverage')) {
      if (entry.disposition !== 'deferred') throw new Error(`${name}.syntheticCoverage is allowed only for a deferred criterion; do not relabel partial work as implemented.`);
      synthetic = syntheticCoverage(entry.syntheticCoverage, name, criterionId, acceptance, journeys);
      synthetic.journeyIds.forEach(id => referenced.add(id));
    }
    return { criterionId, disposition: entry.disposition, expectedOutcome, journeyIds: ids, ...(reason !== undefined ? { reason } : {}), ...(synthetic ? { syntheticCoverage: synthetic } : {}) };
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

Include every canonical ID from packet.json acceptance exactly once in criteria. Each entry has criterionId, disposition (implemented or deferred), expectedOutcome (an independently established complete outcome), journeyIds (array of journey IDs), and optional reason. An implemented criterion needs at least one journey. A deferred criterion needs a nonempty reason and an empty journeyIds array. At least one criterion must be implemented. Provenance identifies repeated source entries combined under one canonical ID; do not add alias IDs as separate criteria.

${primaryDeferralPolicy}

Deferred primary criteria also require syntheticCoverage: {"assumptions":"Fictional inputs, grammar, data and rules; no real-format validation","journeyIds":["synthetic-primary"],"outputs":[{"sourceCriterionId":"UCcustom-1","name":"exact output phrase from that source requirement"}]}. Treat every non-recipe provenance, merged source/recipe criterion and criterion without provenance as primary. Each output name must quote its source requirement (case and whitespace insensitive, at most 200 characters), include at least one output from the deferred criterion itself and have a literal expectText, expectValue or expectDownload.text assertion after interaction in a referenced primary journey. IDs must be unique known primary journeys, and output source/name pairs must be unique. Input values, titles, selectors, filenames and visibility alone are insufficient evidence. Only deferred criteria may carry syntheticCoverage. Recipe-only deferrals retain the existing reason-prefix rule without requiring syntheticCoverage. Every journey must be referenced by an implemented criterion or syntheticCoverage; all journeys still execute at both widths.

Structural limits: source phrases and literal assertions do not establish that the dependency is genuine, the examples match the requested format, the output list is exhaustive, the values are correct or the workflow actually transforms the input. The independent judge checks those against the card and the independent answer key. Do not relabel missing or partial behavior implemented to evade this check. Old plans missing required coverage need a new planning run, never edits to a frozen plan.

A primary requirement or expected deliverable may be deferred only when it truly requires real systems, real data or a person's authority. Lack of an official specification, format mapping or domain expert is never a reason to defer it. Build a clearly labeled synthetic stand-in that demonstrates the whole requested workflow in the challenge's own vocabulary, with realistic invented sample data and the actual named outputs. Document the invented grammar, assumptions and answer key; state plainly in the UI, sample data, exports and evidence: synthetic, not validated against the real format. Never invent operational rules, claim real-format validation or imply that synthetic behavior proves operational readiness. A generic substitute that omits the defining behaviors is incomplete.

For example, mock USMTF extraction must demonstrate frequency plans, crypto change-over windows and flight quarters on a 24-hour timeline using an explicitly invented grammar, not just generic EVENT/TASK records. A departmental-agent challenge needs a synthetic demonstration of the named departments, negotiation and resulting schedule, not merely a manual form. These are synthetic workflows, with no real messages, cryptographic material, personnel or system access.

For every deferral, start reason with exactly one allowed category followed by a concrete unmet dependency: real-system:, real-data:, or human-authority:. Name the required system, data or owner role, the withheld action and the synthetic workflow still demonstrated. Example: "human-authority: Only the owner can authorize publication; no publication is attempted. A labeled synthetic review workflow produces the draft." This conservative structural rule covers all deferrals because the inventory has no primary flag. The parser checks the category and nonempty explanation, not whether the dependency is genuine. Missing a specification or expert cannot be relabeled as human-authority; reserve that category for an action requiring a person's actual approval.

Put a Primary deferrals section first in scope.md, plan.md, verification.md, the user guide and the review summary. List every deferred primary requirement and expected deliverable by canonical ID, original wording, allowed dependency, withheld action and demonstrated stand-in, or explicitly state none. Keep the full inventory in test-matrix.md. A deferred criterion remains unverified and prevents a claim that all requirements are met. Preserve source meaning: implemented synthetic prototype behavior must cover all named behaviors and outputs under an explicit synthetic scope. A partial demonstration cannot count as the whole requirement, and a requirement explicitly demanding real integration, real data validation or approval remains deferred until that dependency is satisfied. Do not rewrite or drop a requirement to manufacture completion.

Include 2 to 12 journeys. Each has a unique id, title, kind (primary or recovery), and 2 to 40 ordered steps. Include both primary and recovery journeys; every journey must be referenced by an implemented criterion or deferred syntheticCoverage. Each journey must interact via click, press, check, select or expectDownload and then assert the outcome. Filling a field and reading its value alone does not establish a working application. A primary journey must assert a literal result with expectText, expectValue or expectDownload with text; expectVisible alone is insufficient. Choose narrow result selectors and independent expected values. A recovery journey should induce invalid input or another failure, observe it, then recover and verify success. All journeys run at desktop and narrow widths against the delivered application.

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

expectText compares the exact visible innerText after whitespace normalization. expectValue compares the exact value. expectDownload captures the selected control once and reuses its file for further assertions on that selector until fill, click, select, press, check or reload. Set fresh: true to require another capture without an edit. Every assertion checks the captured bytes; optional fileName must match the suggested filename exactly, and optional text is a literal substring of the UTF-8 file contents. No evaluate, JavaScript, navigation, URLs, arbitrary commands, timeouts or custom step fields are supported. Use local synthetic inputs. Values for fill and expectValue may be empty for validation/reset checks; all other strings must be nonempty. IDs start with a letter and contain letters, digits, underscores or hyphens (maximum 80 characters). Descriptions and expectedOutcome are at most 4,000 characters, titles 200, selectors 512, values/expected text 10,000, keys 80, filenames 255. At most 512 criteria are supported.

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

Passing these contracts checks the declared browser behavior. Review must still assess whether the planned expected outcomes express every defining source requirement and whether declared deferral dependencies are genuine. Expert validation is a separate evidence boundary, never a prerequisite for building the synthetic workflow. A passed browser run does not establish real-format or operational validation or certify deferred integrations.
`;
