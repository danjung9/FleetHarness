---
type: evidence
status: active
owner: mukul
updated: 2026-11-04
summary: "Supporting source and receipt evidence for the concise round-one challenge QA lines."
---

# Round-one QA evidence

[E] Supporting detail for [[Research/QA/Ten/QA-Lead-Notes]]. The first three sections preserve the earlier detailed audits; later sections cover newly finished entries. Source review and receipt inspection only, with no candidate execution or modification. Main owns runtime and independent officer judges own satisfactory verdicts.

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


## R1 ID 08

[E] The CASREP app implements current-input draft creation, revision-bound review, return/revise/release guards and export in `R1/id08-casrep/index.html:20-30`. Tests at `core.test.cjs:15-21` assert substantive rejection and invalidation behavior. No wholly canned output or inert primary workflow was found by source inspection.

[E] Only INITIAL is accepted at `index.html:20`. The source card's format and broader report-type requirements remain deferred in `acceptance-plan.json:5-9,38-42`; the complete source requirement is at `requirements.md:6`. The 15 Node and eight browser passes establish the selected synthetic workflow, not complete report-format or authenticated-routing capability. [R] Require report-format fixtures and trace source outcomes independently of generic workflow criteria.

## R1 ID 20

[E] The Contact Brief app performs real identity matching, ambiguity handling, freshness checks and citation resolution over inline synthetic records, `R1/id20-contact-brief/index.html:16-26`. Ingestion and complete grounding are explicitly deferred in `acceptance-plan.json:5-16`. Current built-in records are consistent; this review found no observed wrong output.

[A, source inference] `validSpan` at `index.html:22` checks source offsets and literal span text, but does not check whether the stored `span.value` follows from that text. Retrieval and lookup subsequently trust that value at lines 25-26. A contradictory stored value could therefore become a cited fact while its cited text remains unchanged. `app.test.cjs:31` mutates the reference value, which fails lookup against the stored value; lines 33-35 mutate stored offsets/text but omit stored-value contradiction. This is an untested grounding weakness, not a reproduced UI attack or wrong fixture result. [R] Add the missing negative case and validate extracted facts against cited text; require an unseen synthetic ingested snapshot before claiming the card outcome.

## R1 ID 35

[E] Cyber Defender computes findings from supplied Boolean configuration values, freshness and control applicability at `R1/id35-cyber-defender/core.cjs:44-54`. Review binding and JSON export are real, with substantive rejection and invalidation tests. The selected control is synthetic audit logging; 17 of 18 criteria remain deferred in acceptance-plan.json. No wholly canned screen or inert primary controls were established.

[E, source] Input supports multiple assets, but `createProposal` at `core.cjs:60-64` always chooses the first finding and returns when a proposal already exists. No finding selector supplies a handoff for the other findings. The tests do not exercise two-finding selection or reordered valid Boolean/asset-ID variants. [R] Require a reachable proposal for every reported supported finding and test reorderings, multiple findings and an all-benign bundle.

[E] The browser download checks at `acceptance-plan.json:211` and later steps search for a status phrase or edited rationale; a truncated report could satisfy them while omitting findings and citations. [R] Compare complete expected downloaded records. The card permits producing remediation steps; absence of live execution alone is not a defect. Keep proposed, executed and verified states distinct.

## R1 ID 10

[E] Mooring's core validates structural inputs and units, saves revisions, gates review and exports committed values, `R1/id10-mooring/core.cjs:9-66`. Its drag handler at `index.html:143` changes illustrative coordinates; other controls have actual event handlers at lines 132-142. No invented physics result or wholly inert workflow was found.

[E] The UI explicitly says engineering assessment is unavailable at `index.html:24`. Full environmental forces, line/bollard evaluation, tug allocation and the approved safety-sheet outcome are deferred in acceptance-plan.json; only PHY-03 passes. The display percentages are not physical geometry. The automatic pass therefore covers a scenario notebook, not the card's planning calculation. [R] Preserve the unavailable state until an independently reviewable equation/unit/reference-case basis exists; it must not count as full card completion.

[E] `core.test.cjs:14-25` contains 12 meaningful behavioral cases, run against both the module and identical inline core, plus parity at line 29: 25 checks, not 25 distinct domain scenarios. Browser journeys exercise save, correction and stale-review recovery, but not pointer dragging; the download assertion checks the advisory banner only. [R] Test actual drag/save/reload behavior and exact exported scenario fields. Both sets of referenced screenshot/trace files are present.

## R1 ID 32

[E] Readiness has real dependency-graph calculations, cycle rejection, unknown propagation, source resolution and review invalidation in `R1/id32-readiness/core.cjs:51` and its controller. Tests at `core.test.cjs:13` and `adversarial.test.cjs:16` use independent numerical expectations, changed graph shapes and invalidation assertions. These tests can detect wrong behavior; the algorithm is not a selection of canned output strings.

[E] Five scripted changes feed the model. The UI correctly labels its flags as timing risks and says mission readiness is not assessed, `index.html:87-89`. Its suggested action is to confirm dates and estimates, ordered by known margin. The card's readiness-risk/noise ranking and differentiated first actions remain unestablished, with 10 of 17 criteria deferred. [R] Require changed dependency estimates, benign-noise cases and evidence-linked action alternatives tied to the primary card outcome.

[E] The export journey's assertion at `acceptance-plan.json:351` checks only the advisory banner. [R] Compare complete risk/result/citation content, not a marker a truncated export could retain.

## R1 ID 16

[E] MORDECAI contains real deterministic eligibility checks, score arithmetic, exclusive simulated leases, duplicate-action guards and persistent local halt. Tests in `R1/id16-mordecai/core.test.cjs:5-53` include meaningful boundary, rejection and state-transition assertions. `browser-core.test.cjs:18-40` covers previously failing restored-reference and missing-authorization cases; parity tests are separate wiring evidence. No wholly canned arbiter or no-op halt was found within the local simulator.

[E] The host `test-report.json` has `quality.requirementsMet: true` after only GOV-01/02/03. The source narrative at `requirements.md:5,9` requires signed manifests, monitoring/quarantine and a live thirteenth-agent demonstration, among other outcomes. These are absent from the three-criterion acceptance contract; `plan.md:21-31` and `verification.md:40-43` explicitly retain the broader deferrals and say the source requirements are unmet. This is a coverage defect in the completion calculation, not evidence that the simulator falsely claims cryptographic enforcement.

[E] Initial state has two agents, `core.cjs:9`; the repair path registers a fixed missing agent at line 91. Halt directly manufactures local acknowledgement records for each registered simulator entry at line 115; it receives no independent worker acknowledgement. UI labels the execution and halt as simulated. [R] Assign IDs and dispositions to narrative obligations before calculating requirementsMet; require a synthetic 12-to-13 onboarding journey and separate worker acknowledgements before any broader shutdown claim. Existing local halt checks should remain.

## Artifact identity and retained evidence

[E] These SHA-256 values identify the inspected app bytes. Each entry's copied tests and host report were also read; screenshots and trace ZIPs were located for the six additional entries. No browser or candidate program was executed here.

| Entry | index.html SHA-256 |
| --- | --- |
| ID 08 | `e4b9ba53b767f2b9205d3b4b63a1ddae2a0d7c0e322c1ea2a824a51714eddf19` |
| ID 20 | `93ff75eb37f7c25321cf1b19b0efa3a71c2fb4aa021049ff38bd328e539403f7` |
| ID 35 | `c9e2986a30cd70da11570cb53323b731cf197acafc871439292812c9182fce1a` |
| ID 10 | `131ef62ae851e4ba25a6958aa8fbac3c952acd72aec09d0c23e053a382b6704a` |
| ID 32 | `9c284750ff2e440a6e62895797d65b61728189cae781f487197e175fd1625421` |
| ID 16 | `ca29bea9c3512e841828bb8e2d888d664ee8c02a9a9eb849fd3e45ddfb0d0c66` |

[E] CASREP and Contact Brief app/test/evidence bytes match their manifests, while five Markdown files differ per entry. CASREP: README, plan, research, test-matrix and verification. Contact Brief: README, requirements, research, test-matrix and verification. Preserve this discrepancy; this audit does not establish its cause. The separate execution audit owns raw-capture/normalization remediation. [R] Seal final documentation together with code and retain exact tested bytes.

[E] Earlier verify-phase notes saying browser work was pending predate the later host reports. They do not negate the later reported browser passes. Those passes establish only their actual frozen assertions; they do not supply an independent satisfactory verdict.
