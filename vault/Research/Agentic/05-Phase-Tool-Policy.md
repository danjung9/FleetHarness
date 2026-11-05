---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Enforce path and operation permissions at dispatch, including a README-only build follow-up."
---

# Tools limited by phase

## Bottom line

[R] Must before restricted live generation: phases receive only tools and paths needed for that phase. Keep the existing recipe selection and five-phase pipeline, then enforce permissions in the host tool dispatcher. [R] Should: add one dependency-free browser execution mode with scoped file tools and no shell. Cut generic arbitrary-code execution and cross-backend parity until their boundaries can be proved.

## Current evidence

[E, local source at 50fcaea] `harness/phases.ts::toolsForPhase` combines every agent phase with `globalAgentTools = ['read', 'write', 'edit', 'bash']`. Recipe-specific custom tools are genuinely filtered by `createFleetTools`. `pi-backend.ts` disables extensions and normal skill discovery, supplies selected skill paths, and excludes MCP tools. The remaining general file and bash tools still permit more than phase output descriptions promise.

[E] `system-design.ts` is an additional host-write tool path. Its tools must receive the same phase/token checks as file operations. `codex-session.ts` exposes selected dynamic tools but requests a general workspace-write coding environment; the Pi tool array does not restrict that backend's built-in shell or edits. Its support cannot be claimed by changing Pi alone.

## Smallest change and exact files

| File | Small proposed change [R] |
| --- | --- |
| `harness/phases.ts` | Add explicit read/write policy per phase/substep and a restricted-browser mode. Preserve phase IDs, skills, recipe tools and existing display fields. |
| New `electron/workspace-tools.ts` | Parent-owned read, bounded write and edit tools with approved paths, byte limits, symlink rejection, cancellation and phase-token validation. |
| `electron/pi-backend.ts::agent` | Select only scoped custom tools in restricted mode; disable SDK default file/shell tools and verify effective exposure. Switch the build step's authoritative policy to guide-only before its follow-up prompt. |
| `harness/pi-tools.ts`, `electron/system-design.ts` | Apply dispatch policy to pure domain tools and all host mutations. Worker cannot claim a later phase or set acceptance/review state. |
| `skills/fleet-intake/SKILL.md`, `skills/fleet-research/SKILL.md`, `skills/fleet-planning/SKILL.md`, `skills/fleet-evidence/SKILL.md`, `skills/fleet-delivery/SKILL.md` | Align instructions with enforced permissions, read-only inspection and host-owned evidence. Skills explain controls; they do not enforce them. |
| New `tests/workspace-tools.test.mjs`, existing `tests/pi-sdk.test.mjs`, `tests/pi-backend.test.mjs`, `tests/harness-integration.test.ts` | Test real tool exposure and forbidden writes, not merely the planned tool-name array. |

## Proposed restricted-browser policy

[R] All reads are confined to approved public run inputs, selected skills and allowed candidate files. No home, controller store, credential store, evaluator cases, unrelated files or external network tools. No phase may edit requirements, `.fleet`, policy, canonical tests, acceptance reports, review or delivery receipts. Pure Fleet tools may read only their supplied arguments and obey cancellation and size limits.

| Phase/substep | Allowed writes [R] | Extra tools [R] |
| --- | --- | --- |
| Intake | `scope.md` | `fleet_get_challenge` |
| Research | `research.md` | `fleet_search_evidence` over supplied public/synthetic data |
| Plan | `plan.md`, `test-matrix.md`; validated `system-design.json` through host tool only | `fleet_system_design` |
| Build implementation | `index.html`, approved core/test paths, `path-to-fleet.md` | Selected recipe tools and component progress |
| Build guide follow-up | `README.md` only | Read actual implementation and public examples; no component/source mutations |
| Verify inspection | `verification.md` only; diagnostics to host | Read source, guide and development tests; approved pure checks |
| Bounded repair | Candidate implementation and development-test allowlist, README and verification notes | Same bounded build tools; never canonical acceptance |
| Human review / host delivery | None for model | Existing host approval and packaging services |

[R] The verifier can report a guide or source defect but cannot silently fix it while claiming independence. Route its findings through the same single repair allowance used for host-test failure. The host checker remains the acceptance authority. Preserve required artifacts and stage IDs so Dan's phase inspector and Workbench continue to consume the same sequence.

[R] Define output paths before dispatch. A builder may propose a new module path, but only the trusted restricted-mode policy can approve a path inside the allowed candidate set. Deny executables, credential-like files and package install hooks in this mode. Do not trust a model-generated plan to grant itself file authority. Keep dependency-free HTML/core/test scope from the existing prompt.

[R] Validate and serialize every operation in the parent: normalize relative path, reject absolute/parent traversal and links at every path component, enforce size, then write through a temporary regular file inside the trusted directory. Check run epoch, phase and revocation before mutation and commit. For edits, require expected current content/hash to prevent stale writes. No competing untrusted filesystem writer may exist in this mode; otherwise path checking alone has time-of-check races. Unexpected external mutation invalidates the run.

[R] The exact Pi 1.5.0 mechanism for replacing every built-in tool needs the real-SDK test before implementation is accepted. Existing `tools`, `excludeTools` and custom-tool options are observed seams, not proof that an empty list disables defaults. Fail startup if effective capabilities exceed policy. Keep resource-loader extension/MCP restrictions. Do not silently fall back to bash when a file operation fails.

## Proof to require

[R] In a real Pi SDK fixture session, ask each phase to write a forbidden predecessor artifact, canonical case and outside-workspace canary. Try absolute path, traversal, symlinked parent, rename-based replacement, duplicate delayed calls and stale phase token. The host must deny before changing bytes. Verify guide follow-up cannot change `index.html` even if its prompt asks. Confirm normal artifacts and selected domain tools still work.

[R] Make the verification session request a source repair and prove it receives a diagnostic failure, while a separately authorized single repair succeeds. Confirm tools absent from the model menu are also rejected by dispatch. Test all mutating system-design callbacks after Stop. Never claim prompt-only prohibitions passed these tests.

## Risk and relationship to Dan's latest change

[E] Dan's guide follow-up runs in the same build session with the same tool list; its README-only rule currently exists in text. [R] Preserve that sequence and enforce a host-owned guide substep, even if the session retains the visible tool schema. Retain recipe filtering and the phase metadata he already added. No edits to `src/`, `studio/`, `workbench/`, HTML entrypoints or CSS are proposed.

[A] Scoped tools and phase integration are roughly 3 to 5 hours, overlapping the restricted worker work in note 03. The complete security claim depends on removing alternative execution/file paths and testing actual SDK behavior. For Thursday, using a separately proved preparation boundary plus manual final acceptance is preferable to claiming an unproved scoped tool implementation is a full sandbox. Restricted-mode support for the current Codex adapter remains cut unless separately enforced and tested; do not silently switch backends.

## Sources

[E, final relay reconciliation] `631849f` later consolidated the frontend. A pinned diff shows no changes from `50fcaea` in `electron/`, `harness/`, `skills/`, `shared/` or the dependency lock, so this design's backend file map remains applicable. Use the retained unified desktop path in [[Research/Agentic/Run-Readiness-50fcaea]]; do not restore removed Studio/Workbench interfaces. All implementation remains deferred pending allocation.

- [E] Local source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe, `harness/phases.ts`, `pi-tools.ts`, `electron/pi-backend.ts`, `codex-session.ts`, `system-design.ts`, selected skills.
- [E] [[Research/Architecture/Target-Architecture]], [[Research/Build-Patterns/Isolated-Execution]].
- [R] [[Research/Agentic/01-Protected-Acceptance]], [[Research/Agentic/03-Stop-and-Supervision]].
