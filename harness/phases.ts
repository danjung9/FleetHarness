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

/** The same resolved contracts drive packets, Pi sessions and the phase inspector. */
export function phasesForRecipe(recipe: Recipe): PhaseContract[] {
  const domain = recipe.skills.filter(skill => !['fleet-intake', 'fleet-evidence', 'fleet-delivery'].includes(skill));
  return [
    { id: 'intake', role: 'Requirements analyst', owner: 'agent',
      inputs: ['requirements.md', '.fleet/packet.json'], outputs: ['scope.md'],
      exit: 'Scope, data boundaries, unknowns and measurable outcomes are recorded before research begins.',
      skills: ['fleet-intake'], tools: ['fleet_get_challenge'], hostTools: ['Save original requirements and challenge packet'] },
    { id: 'research', role: 'Reuse researcher', owner: 'agent',
      inputs: ['scope.md', 'Recipe candidates'], outputs: ['research.md'],
      exit: 'Reuse decisions and source limitations are documented. Unchecked versions, licenses and integrations remain explicit.',
      skills: ['fleet-research', 'fleet-evidence', ...domain], tools: ['fleet_search_evidence'], hostTools: [] },
    { id: 'plan', role: 'Implementation planner', owner: 'agent',
      inputs: ['scope.md', 'research.md', 'Acceptance criteria'], outputs: ['plan.md', 'test-matrix.md', 'system-design.json'],
      exit: 'Tasks and acceptance checks are defined, and the application architecture is published before implementation.',
      skills: ['fleet-planning', 'fleet-evidence', ...domain], tools: ['fleet_system_design'], hostTools: [] },
    { id: 'build', role: 'Implementation agent', owner: 'agent',
      inputs: ['plan.md', 'test-matrix.md', 'system-design.json', 'Synthetic fixtures'],
      outputs: ['index.html', 'Application modules', '*.test.cjs or *.test.mjs', 'README.md', 'path-to-fleet.md'],
      exit: 'Application source and tests exist, then README.md is written as a practical user guide for the finished application. Every planned component has reported its implementation.',
      skills: [...domain, 'fleet-evidence', 'fleet-delivery'], tools: [...recipe.tools, 'fleet_component_progress'], hostTools: [] },
    { id: 'verify', role: 'Verifier and bounded repair', owner: 'agent',
      inputs: ['Application source', 'Acceptance matrix', 'Application tests', 'README.md'], outputs: ['verification.md', 'test-report.json'],
      exit: 'Independent application tests pass with no skipped checks. The README matches the final application. A failed run gets one repair attempt before it stops.',
      skills: ['fleet-evidence', ...domain], tools: [...recipe.tools, 'fleet_component_progress'], hostTools: ['Run application tests', 'Check packet integrity and source hash'] },
    { id: 'review', role: 'Human reviewer', owner: 'human',
      inputs: ['Verified source', 'README.md', 'Test evidence', 'Limitations'], outputs: ['review.json'],
      exit: 'You inspect the application and evidence, then approve this specific revision with review notes.',
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
