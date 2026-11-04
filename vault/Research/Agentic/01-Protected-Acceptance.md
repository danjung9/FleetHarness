---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Freeze one acceptance contract outside agent authority and reject attempts to change its meaning."
---

# Protected acceptance checks

## Bottom line

[R] Must: freeze the partial ID 11 contract and expected outcomes before generation. Agents may propose extra tests, but cannot replace, skip or approve the canonical checks. [R] Thursday can use an independent evaluator who holds the cases outside the build environment and tests after that environment is stopped. Software enforcement requires the restricted tools and process boundary in notes 03 and 05; a hash or a sibling directory alone does not provide it.

## Current evidence

[E, local source at 50fcaea] `electron/pi-backend.ts::checkInputs` compares requirements text and calls `assertFleetPacketIntegrity`. `harness/integration.ts` retains the packet hash in the host and rechecks supplied skills, fixtures and toolkit. These checks detect persistent input changes between prompts. They do not stop a write followed by restoration or make generated tests independent.

[E, same source] `test-matrix.md` and application tests are written by the plan/build/verify sessions. `verifyWorkspace` discovers test files in the candidate workspace. The repair prompt asks for meaningful tests but has no immutable answer key. `.fleet/fixtures.json` contains disclosed toolkit examples and must remain development input, not be relabeled as hidden acceptance.

## Smallest change and exact files

[R] Add one contract for the chosen synthetic training task, with stable acceptance IDs, inputs, expected outputs, prohibited outcomes, invalid-input behavior and explicit exclusions. Reuse the four-request specification in [[Research/Plan/Plan]]. Have a second technical reviewer check its expected answers before freezing it. This review does not approve the contract or create its final holdouts.

| File | Small proposed change [R] |
| --- | --- |
| New `harness/acceptance/training-draft-v1.json` | Public reviewed contract and disclosed examples only. Version and required case IDs fixed before Start. |
| New `electron/acceptance.ts` | Load trusted contract, compute digest, validate complete case-ID coverage and create acceptance records. Never accept candidate-supplied expected values. |
| `electron/pi-backend.ts`, `harness/integration.ts` | Copy only the public contract into agent context; retain canonical digest and version outside worker authority. Keep current packet integrity checks. |
| `shared/types.ts` | Add optional acceptance record: contract hash, checker hash, candidate manifest hash, run/attempt ID, required/observed case IDs and per-case outcome. Old saved runs have no acceptance record. |
| `electron/main.ts::assertVerified`, `electron/executable.ts::assertExecutableSource` | Require the matching acceptance record as well as development-test evidence before either delivery route. No implicit acceptance of historical runs. |
| `skills/fleet-evidence/SKILL.md`, `harness/phases.ts` | Explain development tests versus canonical acceptance. Remove the implication that agent-owned tests constitute independent acceptance. |
| New `tests/acceptance.test.mjs` | Cover missing/duplicate/unknown IDs, altered contract, stale attempt and forged pass report. |

[R] Store sealed expected values and evaluator code in an evaluator-controlled location outside all model read/write tools and generated-process mounts. Suggested host records are `acceptance/<runId>/<attemptId>/`; this path is a naming convention, not access control. Do not ship sealed holdouts inside `.fleet`, a run artifact, model context or repair packet. The controller's contract, policy, checker and report paths must all be inaccessible to candidate execution.

[R] Separate trust classes: immutable contract and checker; immutable results for each attempt; mutable candidate source and development tests. Pass means every required case executed exactly once with a passing structured result and correct identities. Missing, skipped, duplicate, malformed, timeout and checker error all block approval. A model-produced `test-report.json` is never authoritative.

[R] A requirement correction creates a new contract version, invalidates previous acceptance and human approval, and requires a new run or explicit re-evaluation. The repair agent may request correction through a diagnostic note; it cannot change the contract. Record any public case released for diagnosis, and retain undisclosed cases for the final check.

## Proof to require

| Negative control [R] | Required observation |
| --- | --- |
| Builder attempts a canonical-file write, path escape or shell replacement | Denied before mutation; controller logs the case and revokes the attempt. Hash check also detects any persistent tampering. |
| Replace candidate tests with trivial assertions, delete a failing test or forge a pass report | Development suite may pass, but canonical missing/wrong behavior still blocks acceptance. |
| Return only three of four requested events | Required IDs and independent count check fail. |
| Change the contract after a pass or attach a report from another attempt | Approval and both delivery paths reject it. |
| Wrong expected answer discovered by human review | Version changes explicitly; old evidence remains preserved and cannot approve the new contract. |

[R] For the manual Thursday route, use a separate evaluator context with no shared build mounts, terminate the build environment, copy the final candidate, then run the fixed case list and record digest/results. State that this was procedural independent acceptance. Do not claim FleetHarness enforces the boundary until the software negative controls pass.

## Risk and relationship to Dan's latest change

[E] At `50fcaea`, Dan added a README follow-up in `pi-backend.ts` and updated `harness/phases.ts` and `fleet-delivery`. [R] Include README behavior in the contract review, but let agents update the guide only before final snapshot acceptance. Preserve the five-phase flow and the guide follow-up. Add the new gate to both source export and the new executable download without touching their controls.

[A] A small contract and manual record take roughly 0.5 to 1 active engineering hour plus reviewer time. A reusable host acceptance gate is roughly 2 to 4 hours after the boundary exists. Incorrect domain expectations remain possible even with perfectly enforced immutability; a qualified human owns meaning. File permissions under the same unrestricted account do not establish isolation.

## Sources

[E, final relay reconciliation] `631849f` later consolidated the frontend. A pinned diff shows no changes from `50fcaea` in `electron/`, `harness/`, `skills/`, `shared/` or the dependency lock, so this design's backend file map remains applicable. Use the retained unified desktop path in [[Research/Agentic/Run-Readiness-50fcaea]]; do not restore removed Studio/Workbench interfaces. All implementation remains deferred pending allocation.

- [E] Local source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe, files and symbols above.
- [E] [[Research/Plan/Plan]], [[Research/Build-Patterns/Specs-and-Acceptance-Tests]], [[Research/Architecture/Target-Architecture]].
- [R] Boundary designs: [[Research/Agentic/03-Stop-and-Supervision]], [[Research/Agentic/05-Phase-Tool-Policy]].
