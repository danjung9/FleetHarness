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
      exit: 'The primary user task, source-linked requirements, evaluation criteria, deliverables, user criteria, data boundaries and unknowns are recorded before research begins.',
      skills: ['fleet-intake'], tools: ['fleet_get_challenge'], hostTools: ['Save original requirements and challenge packet'] },
    { id: 'research', role: 'Reuse researcher', owner: 'agent',
      inputs: ['scope.md', 'Recipe candidates'], outputs: ['research.md'],
      exit: 'Reuse decisions and source limitations are documented. Unchecked versions, licenses and integrations remain explicit.',
      skills: ['fleet-research', 'fleet-evidence', ...domain], tools: ['fleet_search_evidence'], hostTools: [] },
    { id: 'plan', role: 'Implementation planner', owner: 'agent',
      inputs: ['scope.md', 'research.md', 'Source-linked acceptance criteria', '.fleet/quality-contract.md'],
      outputs: ['plan.md', 'test-matrix.md', 'system-design.json', 'acceptance-plan.json', 'ux-spec.json'],
      exit: 'Architecture, UX behavior and literal browser outcomes are planned for every implemented criterion; deferred criteria retain a reason. The host validates and freezes both JSON plans before implementation.',
      skills: ['fleet-planning', 'fleet-ux', 'fleet-evidence', ...domain], tools: ['fleet_system_design'], hostTools: ['Validate and freeze acceptance and UX plans'] },
    { id: 'build', role: 'Implementation agent', owner: 'agent',
      inputs: ['plan.md', 'test-matrix.md', 'system-design.json', 'Frozen acceptance-plan.json', 'Frozen ux-spec.json', '.fleet/quality-contract.md', 'Synthetic fixtures'],
      outputs: ['index.html', 'Application modules', '*.test.cjs or *.test.mjs', 'README.md', 'path-to-fleet.md'],
      exit: 'The working application implements the frozen user tasks, selectors and expected outcomes; application tests exist and every component reports its implementation. README.md describes the finished application. The frozen plans remain unchanged.',
      skills: [...domain, 'fleet-ux', 'fleet-evidence', 'fleet-delivery'], tools: [...recipe.tools, 'fleet_component_progress'], hostTools: [] },
    { id: 'verify', role: 'Verifier and bounded repair', owner: 'agent',
      inputs: ['Application source', 'Frozen acceptance-plan.json', 'Frozen ux-spec.json', '.fleet/quality-contract.md', 'Acceptance matrix', 'Application tests', 'README.md'], outputs: ['verification.md', 'test-report.json', 'Browser screenshots and traces'],
      exit: 'Node tests pass with no skipped checks, and every implemented browser check passes on desktop and narrow viewports. Deferred criteria remain unverified and requirementsMet is reported separately from prototype checks. The README matches the application. One bounded repair may change implementation, never the frozen plans.',
      skills: ['fleet-evidence', 'fleet-ux', ...domain], tools: [...recipe.tools, 'fleet_component_progress'], hostTools: ['Run Node tests and planned browser journeys', 'Capture screenshots and traces', 'Check frozen plans, packet integrity and source hash'] },
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
    'Do not start background or detached jobs. Run shell commands in the foreground and wait for completion. Do not use &, nohup, disown, setsid, detached subprocesses, or persistent servers/watchers. Before finishing, check that every process you started has exited. If cleanup fails, report it and stop for the operator. Stop tracks foreground shell calls only; it cannot guarantee cleanup of detached jobs.',
    `Inputs: ${phase.inputs.join(', ')}. Required outputs: ${phase.outputs.join(', ')}.`,
    `Completion gate: ${phase.exit}`
  ].join('\n');
}
