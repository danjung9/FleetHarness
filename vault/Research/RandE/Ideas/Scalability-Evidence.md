---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Recommend a bounded ID 36 supply-paperwork repeat and map all six Fleet-Ready requirements to evidence, additions and gaps."
---

# Scalability evidence

## Bottom line

[R] Choose **ID 36, Paperless Underway**, narrowed to one synthetic supply draft, as the single second brief. [A] Its proposed user is a logistics clerk, potentially an LS, distinct from the first brief's training coordinator; neither role assignment has been validated with a user. [E, pinned catalog review] It changes the recipe from scheduling to offline records, with existing reconciliation tools and an independent synthetic answer key. [R] Attempt it only after the first artifact is accepted and a permitted factory route has actually succeeded; a second manually made checker would show another app, not repeated factory generation. [P, captured requirements] Fleet-Ready has six shared requirements, including audit actions, citations and a one-page fielding path, all of which must appear in the evidence checklist.

## Why this one of the 34

[E, read `harness/catalog.ts` at `631849f`] The catalog contains 34 entries. ID 11 uses `scheduling`; ID 36 uses `offline` and is one of three marked pilots (11, 12, 36). These are catalog and preparation facts, not completed applications. [P, [[Event/Judging]]] Fleet scalability carries 20% and asks about spread across ship classes, ratings or domains. [R] Prove one new user domain and one new recipe before claiming broader spread.

| Selection consideration | Reason for ID 36 |
| --- | --- |
| Different work | [R] Move from training-time constraints to supply-paperwork validity, review and revision conflict. [A] This tests cross-domain reuse; it does not yet establish cross-rating adoption. |
| Existing foundation | [E, `631849f:harness/recipes.ts` and `harness/tools/offline.ts`] The offline recipe selects reconciliation and upload-planning tools. Reconciliation retains concurrent revision heads; upload planning calculates byte allocations and performs no transmission. |
| Independent expected results | [E, document read] [[Research/QA/Officer/36-Paperless-Golden]] already supplies exact drafts, validation failures, conflict/replay cases and an audit checklist. Reuse it rather than inventing another oracle. App outcomes there are NOT RUN. |
| Bounded build | [R] One typed synthetic requisition, local save/reopen, validation, review and exported evidence. Add a displayed reconciliation exercise only if required acceptance is already secure. No OCR, mailbox, spreadsheet importer, tenant or remote endpoint. |
| Comparison with alternatives | [R] ID 12 is the closest runner-up because its parser and golden key exist, but another timeline task is a weaker domain contrast. ID 22 adds OCR without an OCR toolkit. IDs 17 and 37 depend on approved formulae or an owner-supplied app; ID 35 adds range/remediation work. [E, catalog and Harness-Coverage read] Those dependencies or toolkit limits are recorded, not measured build-time comparisons. |

[R] This is a partial ID 36 demonstrator, not completion of either published track. Omitted: handwritten logs, full forms/correspondence, tasking extraction and filing, actual reconnect transport, official routing and government-device deployment. Both IDs 11 and 36 share the portal's enterprise category, but the proposed work domains and selected recipes differ. Do not claim a second category or ship class.

## Second brief and synthetic inputs

[R] Proposed brief: Build a self-contained synthetic supply-draft app from catalog ID 36. Let a clerk edit a practice requisition, check supplied test rules, save and recover it, inspect source/revision history, mark the current revision reviewed and save a draft plus audit export. Clear current review after any edit. Label every screen and export synthetic and unsubmitted. Never send orders, messages or updates to an external system. Show unsupported sync plainly. Keep the factory and its connected preparation separate from disconnected use of the task app.

[R] Reuse this subset of [[Research/QA/Officer/36-Paperless-Golden]]; retain its exact values so existing checks apply. Do not create a new competing fixture suite.

| Input | Exact proposed content and purpose |
| --- | --- |
| One practice record | [A, existing synthetic fixture] `SYN-REQ-01`: date `2032-04-15`, item `Practice cards`, quantity `6`, unit `PACK`. No real stock number, unit, address, signature or person. |
| Test rules | [R] All four fields required; valid calendar date; positive integer quantity; unit exactly `PACK`. These are invented exercise rules. Use G02a/G02b for `0` and `six`, which must remain invalid and unreviewed. |
| Revision history | [A, existing synthetic fixture] `SYN-R0` has no parent and quantity 6. `SYN-RA` and `SYN-RB` each parent R0, with quantities 8 and 10 and invented actors `SYN-DEVICE-A/B`. Use the golden key's full revision objects and value strings. |
| Optional local conflict demonstration | [R] G03 expects 3 unique revisions, 1 record, 2 heads, conflict count 1 and no accepted value. Replaying changes none of those counts. G04's explicit human choice of 9 makes `SYN-RM`, parenting both heads. Display this as local reconciliation, never reconnect sync. |
| Review and audit | [R] Use invented role `SYN-REVIEWER`, revision-specific review, event time/order, record/revision/parent IDs, source IDs, before/after values and decision. A subsequent quantity 11 invalidates the review of 9. Role labels do not authenticate a person. |
| Source manifest | [R] Include the synthetic record/rule IDs, fixture revision or file digest and ID 36 source URL. Keep supplied evidence separate from generated explanations. Each quantity and test rule must lead back to its input. |

[V, official search-index metadata checked 2026-11-04] WHS lists DD 1348-1A as an Issue Release/Receipt Document: https://www.esd.whs.mil/Directives/forms/dd1000_1499/DD1348-1/. [R] Use the existing simplified practice record; do not claim it implements that form or authoritative requisition rules. Direct WHS and DLA page retrieval returned 403; the full form and instructions were not inspected or adopted. No external dataset is needed.

## What would establish repetition

[E, records read] The reported `631849f` baseline is 128 passed, zero failed. The separate `50fcaea` Harness-Coverage report has 403/410 additional checks passing and seven verification/export failures. Its all-entry preparation checks establish catalog handoffs, not 34 generated apps. [[Research/Plan/Test-Results]] records older fake/scripted-provider tests. [[Research/Plan/Review]] reports a real build started at 15:11, not a completed accepted build. No matched pair of accepted factory artifacts was found in these records.

[R] Keep this optional and subordinate to the accepted ID 11 package. A technical operator may attempt one bounded second run Thursday morning only after the overseer clears execution, usage and shutdown prerequisites. Use the same successful factory revision and route, a fresh workspace and catalog ID 36. Do not patch the factory to make the second example work. Record the actual revision if it differs from `631849f` and disclose that difference. Stop the attempt at a pre-agreed deadline that preserves submission work; do not restart missed Wednesday gates.

- [ ] [R] First artifact accepted; actual run/model/route and final digest recorded. A fallback made outside FleetHarness is labeled as such.
- [ ] [R] Second run records input brief, source commit, run ID, model/provider, timestamps, generated files, verification report and every human edit. Cost is unknown unless measured.
- [ ] [R] Existing Quality checks exercise fresh input, invalid quantity, changed-review rejection, save/reopen and audit/source links on the actual final copy. Wrong outputs must fail. Optional conflict checks reuse G03/G04; omitted checks remain unsupported.
- [ ] [R] Stop writers, identify each final file with an unambiguous digest manifest, test the copied artifact and bind the human decision to those bytes. Repeat affected checks after changes. Retain the seven open defects until separate evidence resolves them.
- [ ] [R] Present both results: two task domains, two recipes, observed outcomes, failures, intervention and elapsed time. Claim only bounded repetition of this route. Do not infer fleet deployment, scale/load capacity, autonomy or time savings.

[R] If the second run fails or never starts, retain the repeatability finding as unproven and report the failure or unused brief. A catalog screenshot, hosted preview or manually repaired second app cannot replace run provenance and independent acceptance.

## Fleet-Ready checklist for IDs 32 to 37

[P, captured source inspection] All six entries repeat the same six-part Fleet-Ready definition. The checklist below covers every shared item. Their short vault summaries omit parts of that repeated block; `Sources/raw/events_norfolk_combined.json`, restricted to the six requirement fields, was used to recover it. This paraphrases the capture and does not establish current portal acceptance. Unchecked means evidence is still required, not that nothing has been designed.

| Check and shared requirement [P] | What we have [E, source/report review] | Cheap addition or proof [R] | Gap to state [R] |
| --- | --- | --- | --- |
| [ ] Runs offline | Plan targets a self-contained task app; source helper is local deterministic code. Neither proves delivered offline use. | On the final copy, cold-launch disconnected, make a fresh edit, validate, review, close/reopen and recover saved data with local dependencies. Reuse QA acceptance. | Offline task behavior NOT VERIFIED. Connected factory inference is separate; no offline factory claim. |
| [ ] Keeps humans in authority | Plan defines draft-only scope, review and prohibited actions. Factory has review gates; GUI evidence shows controls with known Home/Stop issues. | In the task, review exact revision, invalidate on edit, expose cancel, record reject/modify decisions and show no external action. Operator monitors failures/usage; technical lead owns escalation and shutdown fallback. | Role labels are not authenticated authority. Ordinary Pi child-stop evidence does not cover detached jobs or every engine. No approval inferred from this note. |
| [ ] Cites sources | Catalog has event URLs; golden keys have synthetic source IDs; toolkit can search evidence. None establishes claim-level citations in a generated task. | Add a small source panel and export manifest: synthetic label, record/field or rule ID, source revision/date and digest. Link each result to inputs. | No verified claim-level citation coverage or authoritative procedure/form compliance. A bibliography alone is insufficient. |
| [ ] Logs auditable actions | Factory reports/review records and pure revision lineage exist. Plan proposes controls/disclosure records. They do not prove a durable task-action log. | Export a local append-only-in-behavior event history with sequence/time, revision IDs, validation results, before/after edits, human decisions, cancellation and draft exports. Inspect it after reopen and edit. | No verified durable task log; no authenticated signatures, tamper resistance or trusted clock. An editable local log is limited evidence. |
| [ ] Syncs on reconnect | `reconcileRecords` retains conflicting heads; `planUploads` allocates bytes. Recipe explicitly leaves persistence, transport and encryption to integration. | Document pending/conflict state and demonstrate the existing pure reconciler if useful. This is explanation, not a compliance fix. | Actual durable two-replica transport, acknowledgement/retry, convergence and reconnect behavior are absent from the proposed slice. Save/import/download is not sync. Seek an organizer ruling on partial eligibility; do not assume a waiver. |
| [ ] Includes a one-page path to fleet | Plan proposes `06-transition.md`, owner roles/resources and 30/60/90-day gates. A completed accepted page was not found. | Make one page naming proposed mission/technical owner roles, confirmation status, target device/hosting/install path, security/authorization review, update/support responsibility, next experiment and resources. 30 days: owner/workflow validation; 60: controlled target-device pilot; 90: authorization/sustainment decision. | Actual owner commitments, approved hosting/install route, security acceptance and resources remain unconfirmed. A page is a plan, not authorization. |

[A] Cheap means a bounded local addition or document using the retained artifact, not a measured effort estimate. [R] Prioritize source labels, audit export and the one-page path before optional conflict visuals. Do not add a replication service, government integration or identity system to close a checklist row before the deadline.

## Additional use-case constraints that the common checklist does not satisfy

| ID | Specific requirements from capture [P] | Current coverage and honest disposition [E/R] |
| --- | --- | --- |
| 32 | Read-only source access; record-linked explanations; last-synced view; synthetic data | [E] Dependency analysis exists in the toolkit. [R] No readiness app or last-synced source store demonstrated; do not claim ID 32 completion. Preserve no-write-back boundary. |
| 33 | Fully offline edge use; only loaded procedures; signed, policy-checked actions; no equipment control; surrogate procedures | [E] Evidence retrieval is available. [R] Procedure grounding, identity/signatures, enforcement and device behavior remain gaps. No equipment actions permitted. |
| 34 | Public AIS/synthetic reports; analyst review; every-claim provenance; low-bandwidth edge use | [R] No AIS ingestion, seeded anomaly brief or analyst acceptance demonstrated. Do not introduce real tracks for this second brief. |
| 35 | Isolated/low-bandwidth setting; approval and rollback for each change; full audit; open interfaces; no live Navy network | [E] Toolkit offers evidence search, not remediation. [R] Range, rollback and end-to-end change controls remain gaps; no network scan or patch is assigned. |
| 36 | Offline clean sync; review before submission; audit; government devices/existing low-code where possible; synthetic/no personal data | [R] Proposed slice covers typed supply draft only. Full two-track workflow, OCR, sync, platform/device acceptance and measured packet-time benefit remain gaps. |
| 37 | Offline government mobile; approval of every result; authorization evidence; open maintainable code | [R] No owner-supplied surf app, mobile installation, disconnected exchange or authorization package accepted. Publishing source or a browser preview does not satisfy these. |

## Controls and handoff

[R] Human approval governs any charged run, accepted artifact and submission. Prohibit real personnel/supply records, operational tasking, external submissions, source-system writes and equipment control. Monitor run revision, failed checks, missing history, export integrity, usage and shutdown. On unexplained output, prohibited data, failed persistence or failed shutdown, stop progression and escalate to the overseer. This research makes no execution or submission approval.

[E, relay read] The relay records `main` deployment changes at `d322b39`; assigned desktop baseline remains `mvp` at `631849f`. A hosted browser preview is distinct from desktop generation and a delivered offline artifact. No project code, test, browser, model build or deployment was executed here.

## Sources

- [P] [[Event/Judging]], [[Event/Rules]], [[UseCases/README]] and the six existing ID 32 to 37 summaries. Captured shared requirements: `Sources/raw/events_norfolk_combined.json`, ID-specific requirement fields, dated 2026-11-04.
- [P] Event source locations, not live revalidated: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/32, https://cdao.hackathon.maximus.com/event/norfolk/use-cases/33, https://cdao.hackathon.maximus.com/event/norfolk/use-cases/34, https://cdao.hackathon.maximus.com/event/norfolk/use-cases/35, https://cdao.hackathon.maximus.com/event/norfolk/use-cases/36, https://cdao.hackathon.maximus.com/event/norfolk/use-cases/37.
- [E] Assigned local project source inspected read-only with `git show 631849f:harness/catalog.ts`, `harness/recipes.ts` and `harness/tools/offline.ts`. No private repository content or implementation was copied into the proposed public input set.
- [E] [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Review]], [[Research/Plan/Test-Results]], [[Research/QA/Runner/Harness-Coverage]], [[Research/QA/GUI-631849f/Receipt-Review]], [[Research/QA/Officer/36-Paperless-Golden]], [[Ops/Directors/Directive-rande]]. Gate: `~/.local/share/fleethacker-context/org/reports/mvp-gate.md`.
- [V, search-index metadata only] Official public form listings: https://www.esd.whs.mil/Directives/forms/dd1000_1499/DD1348-1/ and https://www.dla.mil/Working-With-DLA/Forms/DDFormList/udt_94998_param_detail/286394/. Direct reads returned 403. No external dataset or form template adopted.
