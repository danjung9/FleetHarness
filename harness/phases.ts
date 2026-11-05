import type { StageId } from '../shared/types.js';
import type { RuntimeManifest } from '../shared/solution.js';
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
export const globalAgentTools = ['read', 'write', 'edit', 'bash', 'fleet_helpers', 'fleet_run_helper'];

export function toolsForPhase(phase: PhaseContract, globalTools: readonly string[] = globalAgentTools): string[] {
  return phase.owner === 'agent' ? [...new Set([...globalTools, ...phase.tools])] : [];
}

/** Planning can choose a UI; the frozen CLI runtime no longer needs design guidance. */
export function resolvePhaseForRuntime(phase: PhaseContract, profile?: RuntimeManifest['profile']): PhaseContract {
  if (profile !== 'cli' || (phase.id !== 'build' && phase.id !== 'verify')) return phase;
  return { ...phase, skills: phase.skills.filter(skill => skill !== 'impeccable'), tools: phase.tools.filter(tool => tool !== 'fleet_visual_review') };
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
      exit: 'The primary user task, source-linked requirements, evaluation criteria, deliverables, user criteria, data boundaries and unknowns are recorded. With no supplied inputs, a dedicated synthetic data agent creates validated use-case fixtures before research begins. Report primary deferrals first; missing specifications or experts require explicit synthetic assumptions and examples in the requested input format.',
      skills: ['fleet-intake'], tools: ['fleet_get_challenge'], hostTools: ['Save original requirements, challenge packet and attached inputs', 'Spawn a dedicated synthetic data agent when no inputs are attached', 'Validate and freeze prepared data'] },
    { id: 'research', role: 'Reuse researcher', owner: 'agent',
      inputs: ['scope.md', 'Recipe candidates', '.fleet/foundation-catalog.json', '.fleet/foundation-guide.md', 'inputs/manifest.json', 'Supplied inputs or validated synthetic data'], outputs: ['research.md'],
      exit: 'Reuse decisions and source limitations are documented. Unchecked versions, licenses and integrations remain explicit.',
      skills: ['fleet-research', 'fleet-evidence', ...domain, 'ponytail'], tools: ['fleet_search_evidence'], hostTools: [] },
    { id: 'plan', role: 'Implementation planner', owner: 'agent',
      inputs: ['scope.md', 'research.md', 'inputs/manifest.json', 'Supplied inputs or data/synthetic-data.json and data/README.md', 'Source-linked acceptance criteria', '.fleet/quality-contract.md'],
      outputs: ['plan.md', 'test-matrix.md', 'system-design.json', 'foundation-plan.json', 'acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json'],
      exit: 'Architecture, runtime, the public invocation protocol, mandatory capabilities and independent evaluation cases are planned before implementation. Browser/service plans also define a version 2 UX screen map, task-based navigation, routes, main/supporting regions and narrow layouts; frozen journeys cover every screen with expectScreen. Multiple pages and client-side views are supported. The public protocol specifies input/output shapes, literal statuses/errors and array ordering without exposing held-out answer pairs. Criteria map to computational checks and applicable browser journeys. Core capabilities cannot be deferred. Primary deferrals include source-linked syntheticCoverage and independently fixed outputs in the requested format. The independent judge assesses semantic adequacy. New regular builds need a separate read-only review of useful scope, deferrals, test strength and recovery, with one planning revision if needed. The host freezes accepted contracts and seals evaluation answers outside the builder workspace.',
      skills: ['fleet-planning', 'fleet-ux', 'fleet-evidence', ...domain, 'ponytail', 'impeccable'], tools: ['fleet_system_design'], hostTools: ['Validate solution, evaluation, acceptance and UX contracts', 'Independently review new regular plans before freezing, with one bounded revision', 'Validate foundation choice and copy pinned starter files', 'Seal evaluation answer keys outside the builder workspace'] },
    { id: 'build', role: 'Implementation agent', owner: 'agent',
      inputs: ['plan.md', 'test-matrix.md', 'system-design.json', 'foundation-plan.json', 'foundation-lock.json', 'Materialized starter files and FOUNDATION.md when bundled', 'Frozen acceptance-plan.json', 'Frozen ux-spec.json', 'Frozen solution-contract.json', '.fleet/solution-contract.md', '.fleet/quality-contract.md', 'inputs/manifest.json', 'Supplied inputs or validated data/synthetic-data.json fixtures'],
      outputs: ['Declared runtime entrypoint and manifest files', 'Application modules', '*.test.cjs or *.test.mjs', 'README.md', 'path-to-fleet.md', '.quality-evidence/core-report.json', 'Host-recorded initial visual review and recheck at both widths'],
      exit: 'The computational core passes host-owned evaluation in a clean runtime before completing application interactions. The application uses the evaluated core, implements the frozen user tasks, and includes meaningful tests. Browser/service apps require initial visual reviews, resolved findings and fresh rechecks at desktop and narrow widths against the final runtime files. README.md describes the finished application. The frozen plans remain unchanged.',
      skills: [...domain, 'fleet-ux', 'fleet-evidence', 'fleet-delivery', 'ponytail', 'impeccable'], tools: [...recipe.tools, 'fleet_component_progress', 'fleet_browser', 'fleet_visual_review'], hostTools: ['Run independent capability evaluation before application completion', 'Require initial visual review, resolved findings and fresh rechecks of final files at desktop and narrow sizes', 'Share one bounded repair budget across core and final verification'] },
    { id: 'verify', role: 'Verifier and bounded repair', owner: 'agent',
      inputs: ['Application source', 'Frozen acceptance-plan.json', 'Frozen ux-spec.json', 'Frozen solution-contract.json', '.fleet/solution-contract.md', '.fleet/quality-contract.md', 'Acceptance matrix', 'Application tests', 'README.md'], outputs: ['verification.md', 'test-report.json', 'Capability results and clean-runtime evidence', 'Browser screenshots and traces'],
      exit: 'Node tests, required capability evaluations and clean runtime execution pass. Applicable browser journeys pass on desktop and narrow viewports. Browser/service apps require this verifier session to complete its own initial visual reviews and fresh rechecks of the final runtime files, with no unresolved findings. Deferred criteria remain unverified and requirementsMet is reported separately from prototype checks. The README matches the application. Bounded repair within the shared two-attempt budget may change implementation, never the frozen plans.',
      skills: ['fleet-evidence', 'fleet-ux', ...domain, 'ponytail', 'impeccable'], tools: [...recipe.tools, 'fleet_component_progress', 'fleet_browser', 'fleet_visual_review'], hostTools: ['Install and run the declared package in a fresh temporary directory', 'Evaluate capabilities using host-owned scorers and frozen cases', 'Run Node tests and planned browser journeys', 'Capture screenshots and traces', 'Require a fresh visual review and recheck, including after repairs', 'Check frozen plans, packet integrity and source hash'] },
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
    ...(phase.skills.includes('ponytail') ? ['Use the bundled skill entrypoints for this phase. Phase scope, required outputs, frozen contracts and the host verification and repair budget take precedence over upstream workflows. Simplify implementation without removing required behavior, accessibility or meaningful tests. Only the host starts additional agent sessions.'] : []),
    `Global workspace tools inherited by every agent phase: ${phase.owner === 'agent' ? globalTools.join(', ') : 'none'}.`,
    `Additional tools specific to this phase: ${phase.tools.join(', ') || 'none'}.`,
    `Effective tool access: ${toolsForPhase(phase, globalTools).join(', ') || 'none'}.`,
    ...(phase.owner === 'agent' ? ['Use fleet_helpers to discover reusable project helpers. When a capability is missing, read .fleet/helper-guide.md, create a helper in .agent-tools/, test it with fleet_run_helper, then run it. Helpers are optional, inherit the phase scope, and never replace independent application verification.'] : []),
    ...(phase.tools.includes('fleet_browser') ? ['For a browser or service application, use fleet_browser after creating its declared runtime files. Open the app, inspect the returned screenshot and page controls, click/type through the main workflow, and check console errors at desktop and narrow sizes. Fix defects with the workspace tools and call open again to load the latest source. Browser interactions are exploratory observations, not independent acceptance evidence. CLI applications do not have a browser preview.'] : []),
    ...(phase.tools.includes('fleet_visual_review') ? [visualReviewInstructions] : []),
    `Inputs: ${phase.inputs.join(', ')}. Required outputs: ${phase.outputs.join(', ')}.`,
    `Completion gate: ${phase.exit}`
  ].join('\n');
}

export const visualReviewInstructions = 'Mandatory visual review for browser and service applications: for desktop and narrow viewports, capture with fleet_browser, inspect the actual image against ux-spec.json and the acceptance criteria, then call fleet_visual_review with its captureId, concrete expected and observed descriptions, findings (an array of defect descriptions, empty only when none are observed), and resolutions (an array of {findingId, change}, initially empty). Record both initial reviews before making fixes. Exercise EVERY frozen acceptance-plan.json journey at BOTH widths using fleet_browser {action:"journey",journeyId,viewport}; inspect and review each returned screenshot, including failed journeys. The host executes the planned interactions and assertions against a fresh copy of the current app and returns step failures and browser diagnostics. Explore additional screens, intermediate states, scrolling and keyboard behavior with the manual browser actions. Fix defects with workspace tools, rerun affected journeys and record reviewed rechecks until all journeys pass with no browser errors and all findings are resolved. Resolve workflow findings on the same journey and viewport with the actual source change. Every source edit invalidates earlier journey evidence: rerun and review all journeys against the final files. Both widths need an initial review and a later fresh reviewed capture even if no defects were found. Every build, verification and repair session needs its own reviews; previous sessions cannot substitute. The host rejects missing interactions/reviews, reused or stale captures, modified images and unresolved findings. Do not write visual-review.json; the host records and exports evidence. Work within the existing stage deadline; the host allows at most three further visual completion turns while progress continues. A CLI application is exempt.';
