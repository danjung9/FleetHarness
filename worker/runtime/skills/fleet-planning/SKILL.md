---
name: fleet-planning
description: Turn scoped requirements and reuse decisions into an application architecture, ordered implementation plan, frozen acceptance journeys and UX contract.
---

# Implementation planning

Read `requirements.md`, `scope.md`, `research.md`, `.fleet/packet.json` and `.fleet/quality-contract.md`. The quality contract defines the exact JSON formats; do not invent a second schema. Publish the application architecture with `fleet_system_design`, mapping components to source files. Write `plan.md`, `test-matrix.md`, `acceptance-plan.json` and `ux-spec.json`.

Define the smallest complete workflow, data contracts, dependencies, failure states and ordered tasks. Preserve every packet criterion ID and its provenance, including source requirements, evaluation criteria, deliverables and user criteria. Give each criterion a literal expected outcome and an implemented or deferred disposition. Implemented criteria must reference browser journeys; deferrals require an explicit reason and remain unverified. Keep missing domain facts visible and domain calculations separate from model-assisted explanation.

Use `fleet-ux` to specify the intended user experience. Plan primary and recovery journeys with stable CSS selectors and literal observable assertions before the build agent sees the task. Use declarative steps from the quality contract, not executable test code. Pair browser journeys with Node tests for domain invariants and boundary cases in `test-matrix.md`. An outcome based on a separate planning session is protected from implementation drift; it is not independent SME ground truth.

Target a self-contained index.html with inline styles and classic JavaScript, testable core logic, and Node built-in tests named *.test.cjs or *.test.mjs. Plan consistency checks between the browser app and tested core. No external dependencies are required for this delivery contract.

Hand off once all five planning artifacts exist. The host validates and freezes the two JSON contracts immediately after planning; build and verification repair cannot weaken, rewrite or defer their expectations. Do not implement application code or claim tests passed during planning.
