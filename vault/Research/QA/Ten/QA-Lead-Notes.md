---
type: review
status: active
owner: mukul
updated: 2026-11-04
summary: "Source and receipt audits of completed ten-challenge entries, with concrete factory improvements and remaining limits."
---

# Ten-challenge QA notes

[E, main-session direction] The mission is ten real catalog-card challenges built without human help, start to finish, until satisfactory. Main owns the sole benchmark runner. These notes identify work the automatic bar cannot establish; independent officer judges own satisfactory verdicts. No app, browser, candidate function or generated test ran during these audits.

[E, inspected Scoreboard] Round 1 uses d0f4c69 plus the reported scratch runtime patch. Three entries have finished; no satisfactory judge verdict was present at inspection. Initially abbreviated review copies were subsequently expanded with tests, matrices and journey evidence. Findings below use the expanded copies.

| Entry | Automatic result | Source-review finding |
| --- | --- | --- |
| ID 12, OPTASK | 12/12 Node, 8/8 browser; 3 met, 4 deferred | Real synthetic parser/review/export; both defining card outcomes deferred. |
| ID 36, paperless | 22/22 Node, 8/12 browser; 3 met, 15 deferred, 2 failed | Malformed HTML removes the local conflict-resolution option required by four failed cases. |
| ID 11, training | 15/15 Node, 16/16 browser; 3 met, 4 deferred | Real bounded scheduler; defining card behaviors deferred and a frozen assertion rewards a false explanation. Separate from narrow Pipeline-run2. |

## R1 ID 12

[E] `R1/id12-optask/index.html:27-64,74-88` implements actual parsing, UTC normalization, source spans, review gating, daily segments and JSON download. The sample fills the editor; later results use current source. No obvious canned result or no-op control was found within this declared workflow. This is source evidence, not an independently repeated interaction.

[E] The card (`requirements.md:6,9`) asks for mock USMTF extraction of frequency plans, crypto change-over windows and flight-quarters times. The app accepts its own EVENT/TASK grammar and asks users to assign domain categories. UC12-1 and DELIVERABLE12-1 are deferred (`acceptance-plan.json:5-10,52-57`). Only generic spans, timestamp validation and normalization pass. UI and guide disclose the limitation. This is a candid partial prototype; the defining transformation remains unimplemented.

[R] In `harness/planner.ts`, `harness/phases.ts` and `skills/fleet-messages/SKILL.md`, require a concrete supported synthetic message-to-result case for the primary outcome before building. Flag plans that defer every defining source requirement/deliverable. Preserve unsupported-format and operational limits; generic recipe success cannot establish catalog-task completion.

[E, supplied test inspection] core.test.cjs contains literal expected timestamps, midnight/point outcomes, rejected malformed input, review/export negatives and a sample walkthrough (`:15-64`). These are meaningful assertions. The separate consistency.test.cjs compares two loads of the same inline implementation; it supplies wiring evidence without an independent correctness oracle. Neither suite was executed here.

[E] The browser evidence journey checks the identifier span, while MSG-01 claims exact spans for every extracted field. Planned browser journeys omit sample-button behavior, category edits after approval, TASK-point rendering and the complete guide walkthrough. Core tests cover several corresponding calculations, not those native interactions. first-open.json records unspecified clicks and infrastructure results, without input/result comparisons.

[R] In `harness/quality-contract.ts` and evidence/UX/delivery skills, bind broad claims to complete semantic assertions, exercise secondary controls and changed inputs, compare exported records, and reconcile phase-specific guide/evidence status after host checks. Retain original tests, matrices and traces with every review copy.

[E, identity] Index SHA-256: `7a6267696266b3dae240f8bc324c16f4ec271a360c53dea0e71f03decafcd0df`. Test-report SHA-256: `e95583a2d8f37c875045d3192946f4ddde2a3b78d4a2bd2c8f8fb8a7cfa02acc`.

## R1 ID 11

[E] `R1/id11-training/index.html:46-77,98-126` contains a bounded backtracking search, a separate full-result audit, real editing/review state and JSON exports. No canned solver or obvious no-op control was found. The edit-candidates action focuses the corresponding field as documented. Defining departmental agents, periodicity compliance and optimization remain deferred despite the unchanged source card; scope.md explicitly says the user did not narrow it. quality.status is passed while requirementsMet is false.

[E] **An incorrect frozen assertion rewards a false explanation.** For availability 540 to 600, Engineering's candidate at 540 to 600 fits that availability but collides with Damage Control. A later candidate is unavailable. Source line 72 nevertheless turns one failed candidate into a claim that the person is unavailable at every candidate. acceptance-plan.json:200 and scheduler.test.cjs:26 require that universal statement. verification.md:52-54 acknowledges the distinction and records changing diagnostic priority to satisfy the expectation. A secondary qualification does not make the primary statement true.

[R] Planning and evidence skills must validate the meaning of negative explanations before freezing them. When the contract is wrong, record and review a new contract revision, then align code and tests. Preserving an incorrect expectation is not successful verification. Report candidate-specific observations separately from conclusions about all possible allocations.

[A, source inference] restore() validates historical accepted proposals separately but does not bind a same-revision acceptance to the current content (`index.html:87`). Display and export use revision equality (`:111,126`). Two separately valid proposals with the same revision but different inputs/results could therefore inherit acceptance after manipulated stored data. No normal-UI or runtime reproduction is claimed. [R] Compare accepted/current content or a checked proposal digest; test that exact same-revision mismatch.

[E] Tests contain meaningful literal allocations, negative assignments, backtracking, exhaustion and replay checks. The independent 216-case enumeration is substantive; correcting an earlier count of 432 to the actual Cartesian product is not evidence of weakened expectations. Its complete identity/coverage check still calls the application's own audit, while independent comparison checks start tuples. The browser export assertion checks filename and a synthetic marker only, so it could pass a canned marker file even though the current export implementation is real.

[R] Strengthen `harness/quality-contract.ts` and `skills/fleet-evidence/SKILL.md` with complete independent assignment comparison and semantic downloaded-file checks. Require defining card outcomes or explicitly approved scope changes before counting task completion. Current README correctly documents colon/en-dash window syntax; an earlier copied-text concern is excluded.

[E, identity] Index SHA-256: `952bde005f4b2d71ba81e7fb42f41df8f97aa27ef8c8f6242e30f4d2dcc7f37f`. scheduler.test.cjs SHA-256: `faf760619b5439372c47210bd47e99e115e2be6f16bc02146ccca2d44bbc755c`.

## R1 ID 36

[E] **The local conflict option is absent from the HTML.** `R1/id36-paperless/index.html:11` attaches value="local" to a closing option tag, with no opening local option. Static HTML parsing finds only blank, peer and custom values. Both frozen conflict journeys select local at step 12 (`acceptance-plan.json:477-478,573-574`); all four corresponding desktop/narrow results time out there. This explains the failure more directly than verification.md:44's runner-incompatibility claim. Relabelling option text did not repair the missing element.

[R] Fix the opening option element and rerun the same frozen journeys. In `skills/fleet-ux/SKILL.md` and `skills/fleet-evidence/SKILL.md`, require source/DOM diagnosis before blaming the runner. The native-browser regression must remain.

[E] ui.test.cjs:7 creates generic objects whose value setter accepts arbitrary strings and whose addEventListener does nothing. Tests assign local directly and invoke the handler (`:22,43`), bypassing actual option membership. Their state/routing assertions are meaningful, but cannot detect the unavailable native choice. Storage tests cover individual transactions, not real input-event ordering.

[A, source inference] Input edits queue writes through draftChain, but Load synthetic sample writes without awaiting that queue (`index.html:79-82`). Rapid editing followed by sample load may allow older queued drafts to overwrite newer persisted state. This was not reproduced. [R] Serialize persistence mutations and test delayed input writes, sample replacement and reload with actual events.

[E] Revision-graph validation, merge, all-head conflict resolution, exact-revision review, routing and idempotent receipts are implemented (`index.html:29-54,79-92`). No obvious canned replacement or no-op button was found in those algorithms. Delivery-order comparison uses a labelled fixed synthetic graph; its success does not establish convergence of arbitrary current work or network synchronization. Fifteen criteria remain deferred, and verification correctly remains failed.

[R] `harness/quality-contract.ts` and offline/workflow skills should validate every planned native select value, preserve real conflict recovery checks, distinguish handler tests from native controls, and retain versioned failures/traces. Keep the disclosed simulation boundary and card completion separate from fixture success.

[E, identity] Index SHA-256: `32431f1ac75303e6a68559366f52be4ded8d67d4225669aa7726b2f100237eb9`. ui.test.cjs SHA-256: `c23487b9ceea3ae8a8f471ed2ada0f2e4ed0c0267507527edb9497f2e4a28c56`. No candidate patch or judge verdict was produced here.
