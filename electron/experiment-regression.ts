import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { SolutionContract, EvaluationPlan } from '../shared/solution.js';
import { prepareIsolatedSolutionRuntime } from './isolated-solution-runtime.js';
import { runSolutionEvaluation } from './solution-evaluation.js';
import { createExecutionBudget, beginExecutionPhase, finishExecutionPhase } from './execution-budget.js';

/** Fixed host fixtures. Activation never invokes a model or accepts generated grading code. */
export async function runExperimentRegressionChecks(executable: string, profileIds: string[], signal?: AbortSignal): Promise<boolean> {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-host-regression-')));
  try {
    if (!profileIds.length || profileIds.some(id => !['browser-js', 'node-service', 'python-service', 'node-cli', 'python-cli'].includes(id))) return false;
    const languages = [...new Set(profileIds.map(id => id.startsWith('python') ? 'python' as const : 'node' as const))];
    const plan: EvaluationPlan = { schemaVersion: 1, evaluations: [{ id: 'reference-sums', capabilityId: 'sum', description: 'Independent host regression vectors.',
      evaluator: 'numeric', threshold: 1, trials: 2, tolerance: 0, dataset: { name: 'host-activation-regression', version: '1', provenance: 'reviewed' },
      cases: [{ id: 'positive', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } },
        { id: 'fractional', input: { values: [-2, 0.5] }, expected: { total: -1.5 } }] }] };
    for (const language of languages) for (const correct of [true, false]) {
      signal?.throwIfAborted();
      const root = path.join(directory, language + (correct ? '-correct' : '-broken')), entrypoint = language === 'python' ? 'app.py' : 'app.mjs';
      await fs.mkdir(root);
      const program = language === 'python'
        ? `def invoke(value, context):\n    return {'total': ${correct ? "sum(value['values'])" : '5'}}\n`
        : `export async function invoke(value) { return {total: ${correct ? 'value.values.reduce((sum, value) => sum + value, 0)' : '5'}}; }\n`;
      await fs.writeFile(path.join(root, entrypoint), program);
      const solution: SolutionContract = { schemaVersion: 1, objective: 'Sum the supplied finite values.',
        capabilities: [{ id: 'sum', kind: 'algorithm', description: 'Sum every supplied value.', criterionIds: ['sum'], required: true, evaluationIds: ['reference-sums'] }],
        runtime: { profile: 'cli', command: { runtime: language, entrypoint, args: [] }, files: [entrypoint], requiredEnv: [] } };
      const runtime = await prepareIsolatedSolutionRuntime(root, solution.runtime, executable, signal,
        { totalTimeoutMs: 15_000, invocationTimeoutMs: 3_000, installTimeoutMs: 5_000 });
      try {
        const report = await runSolutionEvaluation(runtime, solution, plan, signal); await runtime.assertIntegrity();
        if ((report.status === 'passed') !== correct || report.evaluations[0]?.cases.length !== 6
          || (correct && report.evaluations[0].actual !== 1) || (!correct && report.evaluations[0].cases.every(entry => entry.passed))) return false;
      } finally { await runtime.close(); }
    }
    // A restart/clock rollback must not mint a fresh planning allowance.
    const budget = createExecutionBudget(90_000, 30_000); beginExecutionPhase(budget, 'plan', 1000);
    beginExecutionPhase(budget, 'plan', 21_000); finishExecutionPhase(budget, 10_000);
    if (budget.consumedMs !== 20_000 || beginExecutionPhase(budget, 'plan', 22_000) !== 10_000) return false;
    return true;
  } catch { return false; }
  finally { await fs.rm(directory, { recursive: true, force: true }); }
}
