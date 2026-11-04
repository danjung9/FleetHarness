# Paperless Underway, intake scope

## Primary deferrals, external portions only

These canonical criteria remain unverified for the external outcome stated below. Their synthetic workflows remain in scope; a later plan must preserve both the demonstration and the deferral, without marking a partial criterion fully implemented. No challenge workflow is deferred for lack of a specification or expert.

| Canonical ID | Allowed basis | Concrete dependency and impact | Synthetic workflow still required |
| --- | --- | --- | --- |
| UC36-4 | real-systems | Access to an authorized government device, its browser/security policies and an owner-selected low-code platform is required to establish compatibility there. A local browser demonstration cannot establish this. | Complete tablet-width and desktop browser workflow, offline persistence/reload, portable exports and a documented platform migration boundary. |
| EVAL36-3 | human-authority | A Fleet SME must set the official manual baseline. No official comparison can be claimed without that decision. | Capture elapsed packet time and compare it with a clearly labeled assumed manual baseline; disclose the inputs and arithmetic. |
| EVAL36-5 | human-authority | A Sailor panel must actually judge usability; developer assertions cannot substitute for panel judgment. | Provide the complete task flow and an unscored panel worksheet recording task completion, errors, assistance and comments. |
| EVAL36-6 | human-authority | Official judges alone assign rubric scores. No official score or endorsement is available. | Prepare an evidence worksheet using the exact five rubric categories and weights, with official scores blank. |
| DELIVERABLE36-1 | real-data | Demonstrating actual hours returned to maintenance, training and watchstanding requires observed unit workload and time-use data. An assumed baseline does not establish realized savings. | Show measured prototype elapsed time and an explicitly illustrative hours-saved estimate for a fictional packet volume. |
| DELIVERABLE36-2 | real-data | Establishing actual reductions in errors/rework requires comparable unit baseline and follow-up observations. Synthetic errors alone cannot establish a fleet improvement. | Detect seeded mistakes, show corrections and blocked submissions, and report synthetic error/rework counts against a declared fixture baseline. |

All other canonical criteria have a scoped synthetic outcome below. None is verified during intake. Real transport, device encryption, authoritative format compliance and operational authorization are excluded qualifications, never implied by synthetic success. Later phase summaries must carry the above primary deferrals forward.

## Source and requested scope

Source: [Norfolk use case 36](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/36), **Paperless Underway**, category **The Autonomous Shipboard Enterprise**. Source interpretation is `.fleet/packet.json` → `challenge`, captured 2026-11-04; `requirements.md` is the unchanged host source. No live source research was performed for intake.

The source asks for replacement of paper, re-keying and manual routing with offline workflows that synchronize when connectivity returns. Track A captures handwritten training logs, a supply requisition and routine correspondence; Track B consolidates a week of tasking emails/documents into verified actions, draft status updates and filed records. Source success is Sailor time returned to maintenance, training and watchstanding, with less error and rework.

The builder's `userScope.title` and `userScope.description` retain that whole workflow rather than selecting only one track. `userScope.criteria[0..5]` repeat the source evaluation criteria and are merged under EVAL36-1 through EVAL36-6, with USER36-1 through USER36-6 preserved as provenance aliases, not additional canonical criteria. Resources are requested inputs, not supplied authoritative fixtures or permission to contact systems.

**Offline records and synchronization** is an engineering recipe recommendation, not an event mandate. Its candidate components are PouchDB/CouchDB and IndexedDB; no reuse selection or architecture decision is made in intake. Research must evaluate these before inventing equivalent infrastructure. Pure reconciliation primitives and upload calculations do not provide application persistence, transport, encryption or verification.

## Audience, task and observable success

Audience: fictional expeditionary-unit clerks, training staff, supply staff and command task coordinators working on a tablet offline, plus a local reviewer responsible for routing decisions.

Primary task: capture source material once, inspect and correct extracted fields against its source, validate, approve the exact revision, route locally while disconnected, then reconcile with a second synthetic replica after a simulated reconnect. In parallel, turn a fictional week of tasking into reviewed actions, status drafts and classified records. Use task-specific forms and review lists rather than a generic chat interface.

Observable success: the operator can reopen saved work offline; produce a completed training log, supply requisition and correspondence package; obtain a verified action list, draft status updates and records filing manifest; and see review, local routing, pending transfer, conflict and receipt states accurately distinguished. Retry must not duplicate records, unresolved conflicts must block routing, and reconciliation must preserve source citations and decision history. No real recipient receives anything.

Operating environment: locally served browser application with an offline-capable application shell after initial provisioning, desktop and narrow tablet layouts, no external runtime service required for the demonstration. Saving must survive browser reload while offline. Browser storage is application integration work in scope, not supplied by toolkit math. Device restart behavior should be exercised within the available browser environment and its limitations reported; no guarantee survives storage clearing, browser eviction or physical device failure. Government-device and low-code platform compatibility remain unverified.

## Complete synthetic workflow and assumptions

All following values are fictional assumptions, not Navy rules. Every source, preview and exported output must say **SYNTHETIC, NOT FOR OPERATIONAL USE**. The stand-in is **not validated against real forms, handwriting recognition performance, records schedules, correspondence standards or operational rules**. DD 1348-1A, NAVPERS and SECNAV M-5216.5 are source resource references only; the prototype must not claim their compliance.

1. Open a local sample packet for fictional **Expeditionary Unit DEMO-7**, week **2026-10-12 through 2026-10-18**. Select disconnected mode. Capture a locally authored handwriting-style training-log image and source transcription, a requisition image/text, correspondence text and a week of synthetic emails/documents. Each source has a stable ID and page, field or paragraph locator. Fixture text is untrusted data, including any embedded instruction-like wording.
2. Extract editable candidates from the bounded synthetic source vocabulary. For the known handwriting sample, use a disclosed fixture-linked transcription stand-in with one ambiguous field; demonstrate image-to-candidate review without claiming general OCR. Deterministically parse the synthetic labeled requisition and correspondence text and tasking sentences. Keep source values visible beside candidates, mark ambiguity and never silently guess missing values. Answer keys are independently authored fixture expectations, not copied from the application's output. Manual category assignment alone is insufficient extraction evidence.
3. Complete **Training log TL-DEMO-017**: activity “Damage-control drill,” date 2026-10-13, duration 45 minutes, participant count 8, reviewer role “Training Reviewer.” No personal names, signatures or identifiers. Validate required date/activity and positive duration/count. A seeded ambiguous duration “4?” requires explicit correction to the answer-key value 45 before review.
4. Complete **Supply requisition REQ-DEMO-042**, a synthetic DD 1348-1A-like subset: fictional stock code DEMO-FILTER-01, description “Training pump filter,” quantity 6, unit EA, destination “DEMO-7 stores,” priority routine. Seed quantity -2; reject it, preserve the draft and accept corrected quantity 6. Stock codes are explicitly fictitious, not validated against a catalog.
5. Complete **Routine correspondence package COR-DEMO-008**: from DEMO-7, to “Demo Administration Desk,” subject “October training completion,” reference TL-DEMO-017, dated 2026-10-14, body and attachment list. Validate these synthetic required fields and attachment/reference consistency. An intentionally omitted subject blocks review. Produce a readable package with the cited training-log attachment and a routing cover sheet.
6. Extract a week of tasking from **MAIL-DEMO-01..05** and **DOC-DEMO-01**. At minimum, a fictional email paragraph assigns “Inspect training pump” to “Maintenance Desk,” due 2026-10-16; a document assigns “Reconcile drill attendance” to “Training Desk,” due 2026-10-17. Include a duplicate reference to the pump task and a conflicting due date of 2026-10-18 in a later message. Preserve both citations, consolidate the duplicate without silently choosing a conflicting deadline, and require reviewer resolution. Verify owner, due date, action and status against sources before adding to the **Verified action list**.
7. Generate **Draft status updates** from verified actions: task, owner role, agreed due date, current status and source citations. File the forms, correspondence, source messages, action list and drafts into a **Records filing manifest** using a supplied synthetic schedule: TRAIN-DEMO for training logs, SUP-DEMO for requisitions, CORR-DEMO for correspondence and TASK-DEMO for tasking/status drafts. Assign a demonstration retention period of 365 days after closure, calculated deterministically, with no automatic disposal. Unknown classification remains “Needs records review.” These are invented classes, not official records authorities.
8. Validate all outputs, present field errors and source evidence, and record an explicit local reviewer decision on the exact revision before any simulated submission/routing. Rejection preserves content and reasons. An edit invalidates earlier approval. Offline local routing moves the approved packet into a named simulated recipient queue; the UI must distinguish **Routed locally, pending sync** from **Acknowledged by demo replica**. Offline routing is possible locally; remote delivery while disconnected is not claimed.
9. Reopen the packet offline after reload. Simulate a second replica's independent edits, including edit versus delete. On simulated reconnect exchange immutable operations, preserve competing heads, show both versions and require a reviewer merge or explicit delete decision. Re-review the resolved revision before routing. Merge in both delivery orders and replay the same operations; canonical record contents must converge with no duplicate business effects. Audit arrival history may differ but must identify each operation unambiguously.
10. Demonstrate bounded transfer of a synthetic 12,288-byte training image: acknowledge 6,144 bytes, interrupt, prioritize a 1,024-byte critical record under a 4,096-byte reconnect budget, then spend the remaining 3,072 bytes on the image, reaching offset 9,216 with 3,072 remaining. The next 3,072-byte budget completes it. Offsets are byte counts; no silent restart or budget overrun. Both replicas and link conditions are local simulations; no endpoint is contacted.
11. Export the named outputs and audit history. Show extraction accuracy, seeded errors caught and corrected, elapsed packet time, assumed manual comparison, illustrative savings, and unscored panel/rubric worksheets. Include the one-page path to fleet as a later deliverable. All metrics explicitly separate measured demonstration values from assumed inputs and unverified operational benefits.

## Inputs and data contract

| Entity/input | Minimum information and constraints |
| --- | --- |
| Synthetic source | Stable source ID, kind (scan/email/document/schedule), fictional timestamp, text or local image bytes, page/paragraph/field locator, synthetic label; no operational uploads or personal information. |
| Extraction/answer key | Source locator, candidate field/value, ambiguity status, reviewer correction; separate expected field/value map and expected task/classification results frozen before verification. Missing values remain missing. |
| Packet/forms | Stable packet/record IDs, type, structured fields described above, attachments, source references, validation findings, state and revision. |
| Task/status/record | Action text, owning role, due date, status, citations, duplicate/conflict references, filing class, closure date and synthetic retention deadline where applicable. Dates use ISO calendar dates; elapsed time uses explicit seconds. |
| Revision/replica | Record ID, unique operation/revision ID, parent revisions, replica ID, edit/delete payload, synthetic timestamp; deletion is a retained tombstone until reviewed. No wall-clock last-writer-wins rule. |
| Review/routing | Reviewed revision ID, fictional reviewer role, explicit approve/reject/resolve decision, reason, time, local destination queue and simulated receipt. Role labels are not authenticated identity. |
| Transfer | Attachment ID, byte length, acknowledged offset, priority, available budget and remaining bytes; reject invalid offsets/budgets without discarding progress. |
| Audit/measurement | Event ID, action, relevant revisions, source references, actor role, decision/result and time; elapsed time, answered/total fields, error counts and declared baseline provenance. No invented approvals or measurements. |

Inputs needed later but not yet supplied: synthetic images and transcriptions, blank stand-in templates, answer keys, week-long emails/documents, synthetic records schedule and baseline assumptions. These can be authored without official specifications and do not defer the workflow. No fixture has been created or checked during intake.

## Named outputs and measurement definitions

Required outputs are the **Completed training log**, **Supply requisition**, **Routine correspondence package and routing cover sheet**, **Verified action list**, **Draft status updates**, **Records filing manifest**, **Review and routing ledger**, **Conflict resolution report**, **Transfer progress/receipt report**, **Audit export**, **Synthetic evaluation report**, **Sailor-panel worksheet**, **Official-rubric evidence worksheet**, and **One-page path to fleet**. Provide readable review views and portable local downloads; exact file formats and browser selectors belong to planning.

Accuracy = correctly extracted expected fields / all expected fields, counting missing and wrong values as failures; report raw and reviewer-corrected results separately, including task owners, dates and classifications. Target for final reviewed fixtures: every expected field correct and every seeded error caught before simulated submission. Invalid or conflicted records must yield zero successful route actions until corrected and reapproved.

Time per packet is measured start-to-approved-local-route elapsed seconds, with pauses disclosed. For a clearly illustrative example only, assumed manual time 1,200 seconds minus measured prototype time, divided by 3,600 and multiplied by a fictional volume of 20 packets/week gives estimated hours/week; show negative results too. No estimate is presented as actual Sailor hours returned. Actual measured values are unavailable at intake. Error reduction uses fixture counts before/after correction, never a claim of operational improvement.

## Acceptance traceability and scoped outcomes

Paths below refer to `.fleet/packet.json`; the source URL above applies to all challenge entries. This is requirements intake, not a browser journey plan or verification result. Every canonical acceptance ID is retained.

| Canonical ID | Source/provenance path | Required prototype outcome / external limitation |
| --- | --- | --- |
| UC36-1 | requirement `challenge.requirements[0]` | Capture, validate, review and route locally offline; reopen saved work; reconcile two local replicas after simulated reconnect without silent conflict loss. |
| UC36-2 | requirement `challenge.requirements[1]` | Explicit decision on current revision before any simulated submission; edits revoke approval and unresolved conflicts block routing. |
| UC36-3 | requirement `challenge.requirements[2]` | Inspect/export events for capture, correction, validation, review, routing, retry, transfer and conflict resolution with actor role and revision links. Local logs are not tamper-proof. |
| UC36-4 | requirement `challenge.requirements[3]` | Complete browser workflow and portability evidence; actual government-device/low-code compatibility deferred as above. |
| UC36-5 | requirement `challenge.requirements[4]` | All source material, roles, identifiers and exports synthetic; no personal information, credentials or operational records. |
| UC36-6 | requirement `challenge.requirements[5]` | Whole offline workflow, human review, field-level source citations, audit and simulated reconnect plus one-page path to fleet. This establishes no operational fleet-ready certification. |
| OFF-01 | recipe `recipe.acceptance[0]` | Replay identical revision twice: same complete canonical record set, no repeated routing effect. |
| OFF-02 | recipe `recipe.acceptance[1]` | Concurrent edits and edit/delete preserve all heads and remain visible until explicit reviewer resolution. |
| OFF-03 | recipe `recipe.acceptance[2]` | A-into-B and B-into-A produce equal canonical records after the same reviewed resolution. |
| OFF-04 | recipe `recipe.acceptance[3]` | Interrupted image resumes at acknowledged offset, critical record goes first and byte accounting matches the bounded example above. |
| OFF-05 | recipe `recipe.acceptance[4]` | Offline edit survives reload, reconnect reveals conflicts, reviewed resolution and routing decision remain inspectable. Actual physical restart not established by a reload alone. |
| EVAL36-1 | evaluation `challenge.evaluationCriteria[0]`; user USER36-1 `userScope.criteria[0]` | Compare extraction and final corrected outputs with independent synthetic answer keys; show numerator, denominator and mismatches. No real OCR/format accuracy claim. |
| EVAL36-2 | evaluation `challenge.evaluationCriteria[1]`; user USER36-2 `userScope.criteria[1]` | Catch invalid quantity, ambiguous duration, missing subject and conflicting task deadline before routing; preserve/correct drafts and review again. |
| EVAL36-3 | evaluation `challenge.evaluationCriteria[2]`; user USER36-3 `userScope.criteria[2]` | Measured demonstration time and assumed-baseline arithmetic; official SME-set baseline comparison deferred. |
| EVAL36-4 | evaluation `challenge.evaluationCriteria[3]`; user USER36-4 `userScope.criteria[3]` | Entire capture-to-local-route workflow offline, then durable local simulated sync with retry, visible conflicts and explicit resolution; no claim that concurrency never occurs. |
| EVAL36-5 | evaluation `challenge.evaluationCriteria[4]`; user USER36-5 `userScope.criteria[4]` | Task-specific usable tablet/desktop flow and panel worksheet; actual Sailor-panel judgment deferred. |
| EVAL36-6 | evaluation `challenge.evaluationCriteria[5]`; user USER36-6 `userScope.criteria[5]` | Evidence grouped under Warfighting 30%, Speed to Fleet 20%, Scalability 20%, Barrier Removal 15%, Judges' Discretion 15%; official judging deferred. No invented score. |
| DELIVERABLE36-1 | deliverable `challenge.expectedDeliverables.lines[0]` | Illustrative hours-returned report with measured/assumed inputs separated; realized fleet time savings deferred. |
| DELIVERABLE36-2 | deliverable `challenge.expectedDeliverables.lines[1]` | Before/after synthetic errors and correction/rework evidence; actual fleet reduction deferred. |
| DELIVERABLE36-3 | deliverable `challenge.expectedDeliverables.lines[2]` | All three forms completed and routed to local simulated reviewer/recipient queues without connectivity; real remote dispatch excluded. |

## Authority, recovery, monitoring and shutdown

Human authority remains visible throughout extraction, conflict resolution, filing and routing. Demonstration approvals are explicit local user actions attributed to fictional roles; they are not real command approval, authentication or signatures. No automatic release, records disposal, external submission or background contact is authorized.

Monitor local saved/unsaved state, offline status, validation blockers, unresolved conflicts, queue count, approved revision, byte offsets and transfer receipts. Preserve drafts on validation errors. A storage failure must prevent a false “Saved” acknowledgment and offer local export/retry. An interrupted transfer resumes from its acknowledged offset. Duplicate reconnects do not duplicate business actions. Loading or saving states prevent accidental double submission. All required controls need labels, keyboard access and visible focus; errors should identify the affected field without clearing the draft.

Escalate ambiguous handwriting, source conflicts, unknown records class and invalid routing destinations into a visible “Needs review” state. The operator can reject or pause routing/synchronization and keep work locally. Stopping a simulated transfer preserves acknowledged progress; closing/reopening preserves successfully saved work. Destructive demo reset requires an explicit confirmation and export opportunity. Unknown classification never triggers deletion.

## Exclusions and boundary

No research, architecture plan, implementation, application testing, deployment, publication or operational contact in this phase. Only `scope.md` is produced. The host-written requirements and toolkit remain unchanged.

Future demonstration excludes actual cloud/government synchronization, authenticated transport, real email ingestion/sending, operational routing, credentials, device encryption certification, government accreditation, official form/records compliance, generalized handwriting OCR, real signatures and operational personal data. Both replicas are synthetic and local. Browser-local audit is inspectable but neither tamper-evident nor an official records repository. Toolkit calculations/reference fixtures are not evidence that the application works; later phases must verify the actual delivered code and browser journeys.

## Missing data, owner questions and transition needs

These questions qualify operational adoption; none blocks authorship of the complete synthetic stand-in:

- Which actual training/NAVPERS forms, DD 1348-1A fields, correspondence variants and authoritative validation rules would an owner select? Public blanks and official rule versions are not verified here.
- What ground-truth values and handwriting samples may be used under an authorized data agreement? Synthetic answer keys will establish demonstration expectations only.
- Who sets the official manual timing protocol, workload volume, rework definitions and success threshold? What observations substantiate realized benefits?
- Which government tablets/browsers, storage quotas, retention rules, encryption, identity and low-code platform constraints apply? What happens after eviction, device loss or a prolonged outage?
- Who holds actual review, release, records classification and conflict-resolution authority, and which real queues/endpoints and receipts define delivery? No identity or authority is assumed from role labels.
- Who convenes the Sailor panel and official judging, and how are their independent results recorded?
- What approved transport, synchronization protocol, link budget and attachment limits apply? What operational monitoring, escalation and shutdown controls are required?

Source transition hypothesis only: NAVSUP Business Systems Center, NAVIFOR and Navy Reserve Force are potential owners; destination is an existing low-code/automation platform with one ship or expeditionary-unit pilot. Source milestones are owner selection at 30 days, platform build at 60, pilot at 90 and fleet-release decision at 180. These are not commitments, approvals or contacted organizations. The later one-page path to fleet must name dependencies, authorities and evidence needed at those gates without claiming endorsement.
