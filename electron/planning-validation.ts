import { promises as fs } from 'node:fs';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import type { AcceptanceCriterion } from '../harness/types.js';
import { validateFoundationPlan } from '../harness/foundations.js';
import { loadQualityContract, type QualityContract } from './quality.js';
import { safeFile } from './storage.js';

const artifacts = ['acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json', 'foundation-plan.json'];

/** Shared by the completion gate and planner preflight; never freezes or changes saved artifacts. */
export async function validatePlanningArtifacts(workspace: string, acceptance: AcceptanceCriterion[]): Promise<QualityContract> {
  const contract = await loadQualityContract(workspace, acceptance, true, { requireStructuredUi: true });
  if (!contract.solution!.invocation) {
    throw new Error('solution-contract.json requires invocation with public input, output and rules. Document exact status/error strings and array ordering here; the builder cannot read sealed evaluation cases.');
  }
  validateFoundationPlan(JSON.parse(await fs.readFile(await safeFile(workspace, 'foundation-plan.json'), 'utf8')), contract.solution!.runtime);
  return contract;
}

function diagnostic(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 4000);
  // Field-level UX errors omit the document name. Add it without changing the host validator.
  if (/^(?:structure|screens|states|audience|primaryTask|successOutcome|persistence|recovery|keyboard)(?:\b|\[|\.)|^Screen (?:IDs|names|selectors) must/.test(message)) {
    return 'ux-spec.json: ' + message;
  }
  if (/^(?:journeys|criteria)(?:\b|\[|\.)/.test(message)) return 'acceptance-plan.json: ' + message;
  return message;
}

export interface PlanningValidationOptions {
  workspace: string;
  acceptance: AcceptanceCriterion[];
  signal?: AbortSignal;
}

export function createPlanningValidationTool(options: PlanningValidationOptions): ToolDefinition {
  const { workspace, signal: sessionSignal } = options;
  const acceptance = structuredClone(options.acceptance);
  return {
    name: 'fleet_validate_plan',
    label: 'Validate saved planning contracts',
    description: 'Read and validate the saved acceptance, UX, solution, evaluation and foundation contracts using the Plan completion checks. Call after saving planning files; fix every reported error and call again before ending the turn. Does not edit, freeze, seal or approve the plan; the host still checks required documents and architecture.',
    promptSnippet: 'Validate saved planning contracts before ending Plan; fix failures and re-run.',
    parameters: Type.Object({}, { additionalProperties: false }),
    annotations: { readOnlyHint: true, openWorldHint: false },
    executionMode: 'sequential',
    async execute(_id, args, signal) {
      const check = () => { sessionSignal?.throwIfAborted(); signal?.throwIfAborted(); };
      check();
      try {
        if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length) {
          throw new Error('fleet_validate_plan takes an empty object; it reads the current saved files from this workspace.');
        }
        await validatePlanningArtifacts(workspace, acceptance);
        check();
        const result = { status: 'passed', readOnly: true, artifacts: [...artifacts], errors: [],
          nextStep: 'The saved quality and foundation contracts pass validation. Complete the remaining required planning documents and publish the system design. Re-run fleet_validate_plan after any contract edit and before ending the turn. The host will recheck the saved files before review and freeze.' };
        return { content: [{ type: 'text', text: JSON.stringify(result) }], details: result, structuredContent: result, isError: false };
      } catch (error) {
        check();
        const result = { status: 'failed', readOnly: true, artifacts: [...artifacts], errors: [diagnostic(error)],
          nextStep: 'Correct the reported error in the saved planning contracts using the current contract instructions, then call fleet_validate_plan again. Do not end this Plan turn while validation fails; later checks may reveal additional errors.' };
        return { content: [{ type: 'text', text: JSON.stringify(result) }], details: result, structuredContent: result, isError: true };
      }
    },
  };
}
