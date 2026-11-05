---
name: impeccable
description: Plan, implement and verify application UI quality in FleetHarness using Impeccable guidance, within the current phase and frozen UX contracts. Skip CLI and backend-only work.
metadata:
  version: 4.4.0-fleet.1
---

# Impeccable for FleetHarness

This is a FleetHarness adaptation of Paul Bakaus's Impeccable 4.4.0 (Apache-2.0). The original entrypoint is preserved in [UPSTREAM.md](UPSTREAM.md); provenance and licenses are included in this folder. **This adapter governs any conflicting upstream workflow or tool directive**, including output from the optional engine.

## Context and authority

The installed skill base is `.fleet/skills/impeccable` relative to the application workspace. Resolve the references and scripts below from that base, including upstream examples written as `.agents/skills/impeccable/...`. Read `.fleet/packet.json`, the current phase instructions and the applicable quality/solution contracts first. The packet and approved requirements define product truth; existing UI, assets, tokens and supplied design evidence define visual authority. Read existing `PRODUCT.md`, `DESIGN.md` and relevant surface briefs when present; their absence never creates a new gate or requires an interview.

Use this skill only for an application with a user interface. Skip it for CLI and backend-only work. During planning, choose whether UI is applicable from the brief; the resulting runtime and UX contracts control later phases. A service runtime alone is not proof that it has a UI.

## Follow the current phase

- **Implementation planning:** Read [reference/shape.md](reference/shape.md) for audience, task, states, recovery, layout and accessibility decisions, and [reference/operate.md](reference/operate.md) for task-focused applications. Use its Read guidance for documentation surfaces. Use [reference/new-work.md](reference/new-work.md) only for relevant visual-direction principles when a new surface needs them. Put the result in the harness's existing `plan.md`, `test-matrix.md`, `acceptance-plan.json` and `ux-spec.json` formats. Preserve all criterion IDs, mandatory capabilities and observable success/recovery checks. Use the assigned `fleet_request_clarification` workflow to resolve material missing user decisions before freezing a plan; document routine assumptions. Do not write application code, introduce upstream design interviews, require comps, create additional approval stages or wait for upstream shape confirmation.
- **Implementation:** Read [reference/craft-floor.md](reference/craft-floor.md) immediately before editing UI, together with [reference/operate.md](reference/operate.md) for task interfaces. Preserve the established identity, supplied copy, existing components and approved direction. Build every frozen journey, state and interaction with clear feedback, usable responsive layouts, native semantics, keyboard access and visible focus. Read a focused reference such as [reference/harden.md](reference/harden.md), [reference/clarify.md](reference/clarify.md) or [reference/adapt.md](reference/adapt.md) only when the implementation needs it. Design preferences cannot remove required content or weaken accessibility or functional behavior.
- **Verification and bounded repair:** Read [reference/audit.md](reference/audit.md) and [reference/critique.md](reference/critique.md) for relevant technical and usability checks. Review actual source, test results and available visual evidence against the frozen requirements, acceptance journeys and UX contract. Report concrete defects and evidence gaps using the harness's verification output. Repair only within the harness's shared repair budget and current authorization; upstream review rounds, recapture requirements or rebuild dispositions never extend that budget or create a second gate. Preserve the frozen criteria, evaluation thresholds, tests and contracts.

Use the available `fleet_browser` tool when it is assigned to this phase. Otherwise inspect host-provided reports, screenshots and traces, and distinguish source review from observed browser behavior. Never claim captures, visual checks, external services or tools you did not use. Missing evidence is an explicit verification limitation, not permission to fabricate it.

## Optional offline helpers

From the application workspace, `.fleet/skills/impeccable/scripts/impeccable context` can read existing project context once. The launcher requires Node and an already provisioned engine 0.1.8, supplied explicitly through `IMPECCABLE_BIN` or placed in its platform-specific `scripts/bin/` location by the host. It disables update and staleness checks, never searches user caches or installs/downloads anything, and permits only `context`, static local-file `detect` and `engine-probe`. Windows may use `scripts/impeccable.cmd` or `node scripts/fleet-launcher.mjs` from the skill base.

If the helper is unavailable, record that it did not run and read existing project context and relevant references directly. Continue the phase. Optional local source detection uses `.fleet/skills/impeccable/scripts/impeccable detect <workspace-path> --json`; it is advisory evidence, not an additional acceptance gate. Use `fleet_browser` or host evidence for rendered behavior. Do not run upstream launchers preserved under `reference/`, inject live-browser scripts, install hooks, pin commands, change global configuration, fetch assets/tools, or register/spawn the packaged agent definitions. Those files are retained for upstream completeness and attribution; they do not grant tools or authorize workflows.

The harness owns phase sequencing, user clarification, approval, output artifacts and repair limits. Apply the upstream design guidance within those boundaries. Do not create parallel lifecycle files, automatic nested agents, design workshops, independent delivery gates or unrequested redesigns.
