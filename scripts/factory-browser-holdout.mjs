import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';

// This interface is part of the public task; the independent inputs below are
// never attached to the generated workspace or taken from its acceptance plan.
export const factoryBrowserInterface = 'For independent browser checks, expose a labeled editable JSON input with data-testid="factory-input", a submit button with data-testid="factory-submit", and one visible result region with data-testid="factory-result". Replace that region on every submission with compact JSON.stringify output: {"total":number} on success, or {"error":"Enter valid JSON."} for malformed JSON. Correcting the input must replace the error with the new result. These attributes do not constrain the visual design.';

const input = '[data-testid="factory-input"]', submit = '[data-testid="factory-submit"]', result = '[data-testid="factory-result"]';
const calculate = (values, total) => [
  { action: 'fill', selector: input, value: JSON.stringify({ values }) },
  { action: 'click', selector: submit },
  { action: 'expectText', selector: result, text: JSON.stringify({ total }) }
];

export function factoryBrowserHoldoutPlan() {
  return { schemaVersion: 1,
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Compute changed inputs and replace success/error results during recovery.', journeyIds: ['host-changed-inputs', 'host-recovery'] }],
    journeys: [
      { id: 'host-changed-inputs', title: 'Compute independent fractional, negative and empty inputs', kind: 'primary', steps: [
        ...calculate([8.25, -3.5, 1.75], 6.5), ...calculate([-4, 1], -3), ...calculate([], 0)
      ] },
      { id: 'host-recovery', title: 'Replace a valid result with an error and recover with a changed input', kind: 'recovery', steps: [
        ...calculate([13, 6], 19),
        { action: 'fill', selector: input, value: '{"values":[' },
        { action: 'click', selector: submit },
        { action: 'expectText', selector: result, text: '{"error":"Enter valid JSON."}' },
        ...calculate([9, -1.5], 7.5)
      ] }
    ] };
}

const planHash = createHash('sha256').update(JSON.stringify(factoryBrowserHoldoutPlan())).digest('hex');
const expected = factoryBrowserHoldoutPlan().journeys.flatMap(journey => ['desktop', 'narrow'].map(viewport => `${journey.id}:${viewport}`));

/** No planner-authored or partial browser evidence can stand in for this gate. */
export function factoryBrowserHoldoutPassed(report) {
  if (report?.schemaVersion !== 1 || report.status !== 'passed' || report.contractHash !== planHash
    || createHash('sha256').update(JSON.stringify(report.plan) ?? '').digest('hex') !== planHash
    || report.expectedJourneys !== expected.length || !Array.isArray(report.errors) || report.errors.length
    || !['browser', 'service'].includes(report.runtime?.profile) || typeof report.runtime?.filesHash !== 'string' || !report.runtime.filesHash
    || !Array.isArray(report.journeys) || report.journeys.length !== expected.length) return false;
  const keys = report.journeys.map(journey => `${journey?.id}:${journey?.viewport}`);
  return new Set(keys).size === expected.length && expected.every(key => keys.includes(key))
    && report.journeys.every(journey => journey.status === 'passed');
}

/** Give each journey and viewport a fresh package with identical declared source. */
export async function runFactoryBrowserHoldout({ workspace, manifest, evidenceRoot, nodeExecutable = process.execPath }) {
  await fs.mkdir(evidenceRoot, { recursive: true });
  const plan = factoryBrowserHoldoutPlan();
  const report = { schemaVersion: 1, status: 'failed', contractHash: planHash, expectedJourneys: expected.length,
    scope: 'Public host-authored browser behavior fixtures, independent of planner journeys; not production-domain or code-sharing proof.',
    plan, runtime: null, journeys: [], errors: [] };
  let redact = value => value;
  try {
    if (!['browser', 'service'].includes(manifest?.profile)) throw new Error('The browser benchmark requires a browser or service runtime.');
    const observed = await verifyBrowserJourneys({ root: evidenceRoot, allowSameOrigin: true, plan, contractHash: planHash,
      prepareRuntime: async signal => {
        let runtime;
        try { runtime = await prepareSolutionRuntime(workspace, manifest, nodeExecutable, signal); }
        catch (error) {
          throw new Error(report.runtime ? redact(error instanceof Error ? error.message : String(error))
            : 'Could not prepare a clean browser or service runtime for the independent browser checks.');
        }
        try {
          if (report.runtime && runtime.provenance.filesHash !== report.runtime.filesHash) {
            throw new Error('Deployment files changed between independent browser verification packages.');
          }
          if (!runtime.url) throw new Error('The clean runtime did not provide a browser URL.');
          report.runtime ??= runtime.provenance;
          redact = runtime.redactMessage;
          return runtime;
        } catch (error) { await runtime.close(); throw error; }
      }
    });
    report.journeys = observed.journeys.map(journey => ({ ...journey, detail: redact(journey.detail) }));
    report.errors = observed.errors.map(error => redact(error));
    report.status = 'passed';
    if (!factoryBrowserHoldoutPassed(report)) report.status = 'failed';
  } catch (error) {
    report.status = 'failed';
    report.errors.push(report.runtime ? redact(error instanceof Error ? error.message : String(error)).slice(0, 1800)
      : 'Could not prepare a clean browser or service runtime for the independent browser checks.');
  }
  await fs.writeFile(path.join(evidenceRoot, 'browser-holdout-report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
