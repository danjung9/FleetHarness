import type { StageId } from '../shared/types.js';
import type { Recipe } from './types.js';

export interface PhaseContract {
  id: StageId;
  role: string;
  owner: 'agent' | 'human' | 'host';
  inputs: string[];
  outputs: string[];
  exit: string;
  skills: string[];
  tools: string[];
  hostTools: string[];
}

/** Shared workspace capabilities. Phase tools extend this baseline; they never replace it. */
export const globalAgentTools = ['read', 'write', 'edit', 'bash'];

export function toolsForPhase(phase: PhaseContract, globalTools: readonly string[] = globalAgentTools): string[] {
  return phase.owner === 'agent' ? [...new Set([...globalTools, ...phase.tools])] : [];
}

/** A separate agent session within intake, only when the brief supplies no data. */
export const syntheticDataPhase: PhaseContract = {
  id: 'intake', role: 'Synthetic data specialist', owner: 'agent',
  inputs: ['requirements.md', 'scope.md', '.fleet/packet.json', 'inputs/manifest.json'],
  outputs: ['data/synthetic-data.json', 'data/README.md'],
  exit: 'Use-case-specific fictional records match their documented schema, cover typical, edge and invalid scenarios, and disclose assumptions. The host validates and freezes the data before research.',
  skills: ['fleet-data'], tools: [], hostTools: ['Validate synthetic records and scenarios', 'Freeze prepared data artifacts']
};

/** The same resolved contracts drive packets, Pi sessions and the phase inspector. */
export function phasesForRecipe(recipe: Recipe): PhaseContract[] {
  const domain = recipe.skills.filter(skill => !['fleet-intake', 'fleet-evidence', 'fleet-delivery'].includes(skill));
  return [
    { id: 'intake', role: 'Requirements analyst', owner: 'agent',
      inputs: ['requirements.md', '.fleet/packet.json', 'inputs/manifest.json', 'Supplied data files, when attached'], outputs: ['scope.md', 'data/synthetic-data.json and data/README.md when no inputs are attached'],
      exit: 'The primary user task, source-linked requirements, evaluation criteria, deliverables, user criteria, data boundaries and unknowns are recorded. With no supplied inputs, a dedicated synthetic data agent creates validated use-case fixtures before research begins.',
      skills: ['fleet-intake'], tools: ['fleet_get_challenge'], hostTools: ['Save original requirements, challenge packet and attached inputs', 'Spawn a dedicated synthetic data agent when no inputs are attached', 'Validate and freeze prepared data'] },
    { id: 'research', role: 'Reuse researcher', owner: 'agent',
      inputs: ['scope.md', 'Recipe candidates', '.fleet/foundation-catalog.json', '.fleet/foundation-guide.md', 'inputs/manifest.json', 'Supplied inputs or validated synthetic data'], outputs: ['research.md'],
      exit: 'Reuse decisions and source limitations are documented. Unchecked versions, licenses and integrations remain explicit.',
      skills: ['fleet-research', 'fleet-evidence', ...domain], tools: ['fleet_search_evidence'], hostTools: [] },
    { id: 'plan', role: 'Implementation planner', owner: 'agent',
      inputs: ['scope.md', 'research.md', 'inputs/manifest.json', 'Supplied inputs or data/synthetic-data.json and data/README.md', 'Source-linked acceptance criteria', '.fleet/quality-contract.md'],
      outputs: ['plan.md', 'test-matrix.md', 'system-design.json', 'foundation-plan.json', 'acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json'],
      exit: 'Architecture, runtime, mandatory capabilities and independent evaluation cases are planned before implementation. Criteria map to computational checks and applicable browser journeys. Core capabilities cannot be deferred. The host freezes all contracts and seals evaluation answers outside the builder workspace.',
      skills: ['fleet-planning', 'fleet-ux', 'fleet-evidence', ...domain], tools: ['fleet_system_design'], hostTools: ['Validate and freeze solution, evaluation, acceptance and UX contracts', 'Validate foundation choice and copy pinned starter files', 'Seal evaluation answer keys outside the builder workspace'] },
    { id: 'build', role: 'Implementation agent', owner: 'agent',
      inputs: ['plan.md', 'test-matrix.md', 'system-design.json', 'foundation-plan.json', 'foundation-lock.json', 'Materialized starter files and FOUNDATION.md when bundled', 'Frozen acceptance-plan.json', 'Frozen ux-spec.json', 'Frozen solution-contract.json', '.fleet/solution-contract.md', '.fleet/quality-contract.md', 'inputs/manifest.json', 'Supplied inputs or validated data/synthetic-data.json fixtures'],
      outputs: ['Declared runtime entrypoint and manifest files', 'Application modules', '*.test.cjs or *.test.mjs', 'README.md', 'path-to-fleet.md', '.quality-evidence/core-report.json'],
      exit: 'The computational core passes host-owned evaluation in a clean runtime before completing application interactions. The application uses the evaluated core, implements the frozen user tasks, and includes meaningful tests. README.md describes the finished application. The frozen plans remain unchanged.',
      skills: [...domain, 'fleet-ux', 'fleet-evidence', 'fleet-delivery'], tools: [...recipe.tools, 'fleet_component_progress'], hostTools: ['Run independent capability evaluation before application completion', 'Share one bounded repair budget across core and final verification'] },
    { id: 'verify', role: 'Verifier and bounded repair', owner: 'agent',
      inputs: ['Application source', 'Frozen acceptance-plan.json', 'Frozen ux-spec.json', 'Frozen solution-contract.json', '.fleet/solution-contract.md', '.fleet/quality-contract.md', 'Acceptance matrix', 'Application tests', 'README.md'], outputs: ['verification.md', 'test-report.json', 'Capability results and clean-runtime evidence', 'Browser screenshots and traces'],
      exit: 'Node tests, required capability evaluations and clean runtime execution pass. Applicable browser journeys pass on desktop and narrow viewports. Deferred criteria remain unverified and requirementsMet is reported separately from prototype checks. The README matches the application. One bounded repair may change implementation, never the frozen plans.',
      skills: ['fleet-evidence', 'fleet-ux', ...domain], tools: [...recipe.tools, 'fleet_component_progress'], hostTools: ['Install and run the declared package in a fresh temporary directory', 'Evaluate capabilities using host-owned scorers and frozen cases', 'Run Node tests and planned browser journeys', 'Capture screenshots and traces', 'Check frozen plans, packet integrity and source hash'] },
    { id: 'review', role: 'Human reviewer', owner: 'human',
      inputs: ['Verified prototype source', 'README.md', 'Criterion and journey evidence', 'Screenshots and traces', 'Deferred requirements and limitations'], outputs: ['review.json'],
      exit: 'You inspect the application, task outcomes and remaining requirements, then approve this specific prototype revision with review notes. Prototype approval does not establish that deferred requirements are met.',
      skills: ['fleet-evidence'], tools: [], hostTools: ['App preview', 'Evidence viewer', 'Record human approval'] },
    { id: 'deliver', role: 'Host packager', owner: 'host',
      inputs: ['Approved source revision', 'README.md', 'path-to-fleet.md'], outputs: ['DELIVERY.md', 'Source and evidence bundle'],
      exit: 'You choose an export destination. The host checks the approved source hash before copying the package.',
      skills: ['fleet-delivery'], tools: [], hostTools: ['Check approved source hash', 'Export source and evidence'] }
  ];
}

export function phasePrompt(phase: PhaseContract, globalTools: readonly string[] = globalAgentTools): string {
  return [
    `Current phase: ${phase.id}. Role: ${phase.role}. Complete only this phase's work.`,
    `Read these assigned skills: ${phase.skills.map(skill => `.fleet/skills/${skill}/SKILL.md`).join(', ')}.`,
    `Global workspace tools inherited by every agent phase: ${phase.owner === 'agent' ? globalTools.join(', ') : 'none'}.`,
    `Additional tools specific to this phase: ${phase.tools.join(', ') || 'none'}.`,
    `Effective tool access: ${toolsForPhase(phase, globalTools).join(', ') || 'none'}.`,
    `Inputs: ${phase.inputs.join(', ')}. Required outputs: ${phase.outputs.join(', ')}.`,
    `Completion gate: ${phase.exit}`
  ].join('\n');
}
