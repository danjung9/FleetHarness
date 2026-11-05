---
name: ponytail
description: Select reuse and implement the simplest complete solution during FleetHarness research, planning, build and bounded repair, preserving requirements and verification.
metadata:
  upstream-commit: 96608e078b2d5ea607c5c3b8b5a54d1c1fba6846
---

# Ponytail for FleetHarness

This is a FleetHarness adaptation of DietrichGebert's MIT-licensed Ponytail. Its complete original is preserved in [reference/upstream-skill.md](reference/upstream-skill.md), with source hash and attribution in `PROVENANCE.json` and `LICENSE`.

Use Ponytail's **full** mode for the current phase only. Solve the whole required problem with the least new code and complexity. The harness's phase instructions, packet, quality contract and solution contract govern scope and outputs. This adapter overrides upstream session persistence, level switching, reply formatting and any suggestion to narrow an approved requirement. Do not use ultra mode, renegotiate the user's request or introduce extra human gates.

## Apply it to the assigned work

- **Reuse research:** Inspect available foundations, platform capabilities, installed dependencies and existing patterns. Prefer a suitable existing capability over a new dependency or custom subsystem. Document concrete fit, limitations and justified gaps in `research.md`; do not implement code, select an incomplete shortcut or preempt planning decisions.
- **Implementation planning:** Choose the simplest architecture that fulfills every required capability and user journey. Prefer existing code and house conventions, then standard platform features, then suitable installed dependencies. Explain necessary additions and define the smallest complete workflow, including failure and recovery states, accessibility, domain invariants and meaningful checks. Preserve every criterion ID and explicit mandatory requirement in the harness contracts.
- **Implementation:** Read the affected code and callers before editing. Reuse shared logic and existing components, repair the root cause once, and finish the relevant callers, fixtures, configuration and tests. Avoid speculative abstraction, options and wrappers. Prefer readable code over clever brevity. Keep validation, error handling and data safety when moving or simplifying code. A known shortcut must name its limit and the condition that would require upgrading it.
- **Verification and bounded repair:** Check completeness and edge cases against the frozen contracts and actual evidence. Prefer the smallest repair that fixes the observed defect. Preserve test expectations and protected artifacts; work inside the harness's shared repair budget. Report unresolved limitations honestly instead of declaring them complete or weakening a check to pass.

Never cut mandatory features, acceptance criteria, validation at trust boundaries, data-loss prevention, security, accessibility, required calibration, or tests that establish intended behavior. Minimize unnecessary implementation, not the definition of success. New nontrivial logic needs a meaningful check under the project's normal test workflow; trivial changes need no ceremonial tests. Harness acceptance and evaluation checks remain mandatory.

Return only the artifacts and handoff required by the current phase. No automatic nested agents, global configuration changes, installers, hooks or additional lifecycle steps follow from this skill.
