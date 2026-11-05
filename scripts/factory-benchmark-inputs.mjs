import { createHash } from 'node:crypto';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Capture exactly what generation and external core grading will consume.
 * This identifies benchmark inputs, not the executing grader or environment.
 */
export function captureLiveBenchmarkInputs({ scenarios, browserHoldoutPlan, provider, model, runs, timeoutMs }) {
  const manifest = structuredClone({
    schemaVersion: 1,
    execution: { backend: 'pi', provider, model, runsPerScenario: runs, generationTimeoutMs: timeoutMs },
    browserHoldoutPlan,
    scenarios: scenarios.map(scenario => {
      const task = {
        title: `Benchmark ${scenario.title}`, description: scenario.description,
        criteria: [scenario.description, 'Declare and pass an independently checked mandatory computational capability. Provide accurate setup and error handling.'],
        resources: 'The attached examples are synthetic development data. Derive additional independent evaluation examples before building; do not copy fixed outputs into the implementation.'
      };
      const dataInputs = [{ name: 'development-cases.json', kind: 'text',
        content: JSON.stringify({ provenance: 'synthetic', examples: scenario.cases.slice(0, 1) }, null, 2) }];
      const holdoutPlan = { schemaVersion: 1, evaluations: [{
        id: 'factory-holdout', capabilityId: scenario.id, description: scenario.description,
        dataset: { name: `${scenario.id}-heldout`, version: '1', provenance: 'synthetic', description: 'Hand-authored before generation; only the first separate development case was supplied to the builder' },
        cases: scenario.cases.slice(1), evaluator: scenario.evaluator, threshold: 1, trials: 1,
        ...(scenario.evaluator === 'numeric' ? { tolerance: 0 } : {})
      }] };
      return { id: scenario.id, kind: scenario.kind, profile: scenario.profile,
        projectInput: { ...task, dataInputs },
        trialTitles: Array.from({ length: runs }, (_, index) => `${task.title} (${index + 1})`), holdoutPlan,
        taskSha256: digest(task), developmentSha256: digest(dataInputs), holdoutSha256: digest(holdoutPlan) };
    })
  });
  const bytes = JSON.stringify(manifest, null, 2) + '\n';
  return freeze({ manifest, bytes, sha256: createHash('sha256').update(bytes).digest('hex') });
}
