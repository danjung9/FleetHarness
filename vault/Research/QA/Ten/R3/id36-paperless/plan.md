# Primary deferrals

- **UC36-4, Runs on government devices and existing low-code platforms where possible**
  real-system: Authorized government devices and the owner low-code runtime are unavailable; withhold compatibility/deployment claims. Demonstrate the complete local browser workflow and a platform-transition checklist.
- **EVAL36-3, Time per packet against a manual baseline [baseline to be set with Fleet SME]**
  real-data: A Fleet-SME-established manual timing baseline is unavailable; withhold fleet timing comparison. Record observed synthetic elapsed time and a separately invented 20-minute baseline.
- **EVAL36-5, Ease of use judged by a Sailor panel**
  human-authority: A Sailor panel must supply its own usability judgment; withhold endorsement. Demonstrate both tracks and provide an unscored panel worksheet.
- **EVAL36-6, Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.**
  human-authority: Official judges must issue official rubric scores; withhold scoring. Display the five original weights with every score unassessed.
- **DELIVERABLE36-1, Sailor hours returned to maintenance, training and watchstanding**
  real-data: Observed operational workload and independently measured manual/assisted timings are unavailable; withhold actual hours-returned claims. Show an invented 20 versus 8 minute, 10-packet estimate of 2.00 hours.
- **DELIVERABLE36-2, Fewer errors and less rework**
  real-data: Matched operational error and rework observations are unavailable; withhold actual fleet error-reduction claims. Detect and correct five seeded synthetic errors before local routing.

All six remain unverified. Browser prototype checks cannot establish all source requirements met. The same up-front inventory is required in verification.md, README.md and the review summary. No real-format or operational validation is claimed.

# Implementation plan, Paperless Underway

Planning only. Architecture published in system-design.json before these documents. Apply fleet-planning, fleet-ux, fleet-evidence and fleet-offline. Original requirements, scope, research and packet remain unchanged. Contracts are host-frozen after planning; builders/repair must not modify expectations. No application code or tests have been run here.

## Smallest complete vertical slice

A self-contained index.html, inline CSS, classic JavaScript, inline synthetic sources and image; no imports, fetch, CDN or external assets. Opening the file completes both tracks without connectivity. IndexedDB is the persistence adapter; use the same origin/file location on reopening. Testable pure functions are mirrored in core.cjs with core.test.cjs using Node built-ins. Tests must evaluate the actual inline core script from index.html in node:vm and run the same behavioral vectors against both copies, comparing structured results; string equality alone is insufficient. UI uses that inline core. Browser host exercises actual persistence and selectors. No service worker/server is required for local-file shell availability; local-file IndexedDB/browser support is a genuine test risk, not grounds to claim a pass.

Track A: capture/extract an inline synthetic handwritten-style training-log raster or canvas-rendered image, supply requisition document and routine correspondence package. Track B: ingest five weekday emails/documents plus one duplicate task reminder, produce five deduplicated cited actions, draft status updates and filing manifest. The extraction strategy is a bounded synthetic fixture recognizer for the invented image plus deterministic delimiter parsing for text. Visibly label it fixture-assisted extraction, not general OCR. Image region mapping and original image remain inspectable; no manual-entry-only substitute. Display raw candidates and ambiguity before correction. No model service is needed; any explanatory prose is static and cannot change domain values, approve, classify authoritatively or route.

## Frozen synthetic grammar and independent answer key

Every UI, sample source, export and evidence starts with: **synthetic, not validated against the real format**. No real DD 1348-1A, NAVPERS or SECNAV compliance is claimed. Invented grammar v1: UTF-8 lines `TYPE|key=value|...`; delimiters cannot occur in values, unknown keys and malformed lines are errors. Types TRAIN, REQ, CORR, TASK and SCHEDULE. Every line also has id=<source/task ID>; TASK reminder repeats its task ID, while email source IDs remain unique. Metadata IDs and citations are not counted as scored fields. Serialize the key/value fields from the answer-key table literally; TASK-02 raw owner is the ambiguous string specified below, and clarification is separate source evidence. Image TRAIN-01 uses the same four field positions in a visible handwritten-style image; recognition is restricted to this fixture. Sources use fixed IDs, revision demo-v1, timestamp 2026-11-02T08:00:00Z (TASK days have their respective date at 08:00Z), and line/region references. No upstream publication timestamps are invented. Preserve exact excerpts and offsets/region in exports.

Independent planning answer key (author before extraction implementation; not independent SME ground truth):

| Source | Literal reviewed values | Location |
| --- | --- | --- |
| TRAIN-01 | event=Damage-control drill; date=2026-11-02; minutes=60; reviewer=Training Reviewer A | image region 1 |
| REQ-01 | number=DEMO-0001; item=Filter cartridge; quantity=4; unit=EA; destination=Supply Reviewer A | line 1 |
| CORR-01 | sender=Admin Reviewer A; recipient=Training Reviewer A; subject=Weekly readiness summary; body=Submit the synthetic readiness summary for review. | line 1 |
| TASK-01 | action=Inspect locker; owner=Training Reviewer A; due=2026-11-02 | Monday email line 1 |
| TASK-02 | action=Count filters; owner=Supply Reviewer A; due=2026-11-03 | Tuesday email line 1; Wednesday clarification line 2 |
| TASK-03 | action=Draft readiness note; owner=Admin Reviewer A; due=2026-11-04 | Wednesday document line 1 |
| TASK-04 | action=Test radio; owner=Training Reviewer A; due=2026-11-05 | Thursday email line 1 |
| TASK-05 | action=File weekly summary; owner=Admin Reviewer A; due=2026-11-06 | Friday document line 1 |

Extraction denominator = 4 + 5 + 4 + 5×3 = 28 fields. Raw TASK-02 owner says `Supply Reviewer A / Admin Reviewer A`; parser flags ambiguity and leaves candidate owner blank despite the clarification source, so raw accuracy is 27/28. User chooses Supply Reviewer A based on visible clarification: `Supply Reviewer A owns Count filters.` Do not silently correct raw scores. Other 27 fields match the key. Thursday reminder duplicates TASK-01 by ID and attaches another citation without a sixth task. All action statuses initially pending, hence `Draft: 0/5 actions complete; 5 awaiting role confirmation.`

Synthetic SCHEDULE rules: TRAIN → TRAIN-DEMO, REQ → SUPPLY-DEMO, CORR → ADMIN-DEMO, TASK → TASK-DEMO. Display rationale based on document type and invented retention `Demo review only; no disposition authorized`. Filing manifest lists all eight records, source references, class and rationale. Every named output uses these literal values and its actual name, not a generic record dump. Export packet contains separately named Training log, Supply requisition document, Routine correspondence package, Verified action list, Draft status updates and Records filing manifest sections plus source candidates/corrections and disclosure.

Invented validation: strict real calendar ISO dates, minutes and integer quantity >0, nonempty event/item/subject/body/number, allowed unit EA, allowed role labels, all five task owners assigned, due dates parseable, classes match schedule, recipients are local allowed role inboxes. No invented rule is operational policy. `Seed errors` sets training date 2026-02-30, requisition quantity 0, subject empty, TASK-02 owner blank, TRAIN filing class UNKNOWN. This yields exactly the five frozen errors. Correcting them yields zero. Route must revalidate even if user skipped Validate. Validation never silently coerces values.

## Data contracts and transaction boundaries

Workspace v1: sources [{id, revision, timestamp, type, text/image, locations}], draft fields, committed packet, correction history, validation findings, output sections, two replica histories, approvals, inbox receipts, pending transfers, audit and timer. Immutable operation `{id, recordId, parents, actor, value}`: value stable canonical JSON string or null tombstone. IDs unique per immutable operation, never based only on clock. Canonical states sort records/heads/parents deterministically. Reject ID/content collisions, missing/cross-record parents and cycles atomically, retaining original queue on failure.

Store packet changes as one aggregate record revision with embedded form/task values; sync-lab uses separate records for focused invariant examples. Concurrent scenario branches the routed packet on both replicas: subject Ready for review versus Needs supply check, task Inspect locker versus null. Preserve both full competing versions and allow per-field selection/custom subject before new aggregate merge revision references every reviewed head. Do not use clocks to choose winners. Audit reviewer Training Reviewer A, reviewed head IDs, selected/custom values, decision time and resulting revision. Actor-role strings demonstrate roles, not authentication.

Persist draft on input debounce/blur and before navigation; don't overwrite committed content. Save commits packet + revision + audit transaction before Saved locally. Approval binds current revision hash/ID; edits and merge invalidate it. Dirty draft blocks approval/routing until deliberate save or discard. Approval/routing are distinct actions. Local route atomically writes three form inbox receipts, five action entries, audit and remote packet queue with idempotency `(packetId, revisionId, destination)`. New reviewed revision supersedes prior inbox view but retains history. Simulated remote packet receipt is an upsert by packetId, with revision history, so final current packet receipt count is 1. Replay must not reroute or duplicate business audit events; sync attempts may be recorded separately.

Acknowledged bytes, not sent bytes, persist. Transfer fixture starts critical 1000 bytes at offset 0, priority 5; photo 10000 bytes at offset 5000, priority 1. Fixed creation timestamps tie-break by age then ID. A 2000 budget allocates critical [0,1000), photo [5000,6000). Interrupt-after-send-before-ack leaves both offsets unchanged; retry same offsets and atomically persist simulated receiver receipts. Next 4000 completes photo. Zero budget is a no-op. This is a labeled simulation, no transport, authentication or encryption.

Timing: start sample load, end first successful local routing; display observed elapsed local duration separately. Fixed hypothetical scenario only: manual 20 min, assisted 8 min, packets 10; (20−8)×10/60=2.00 hours. Never substitute observed timings for invented assumptions or claim actual savings. Five seeded errors before/zero after are not operational error reduction. Keep Sailor-panel worksheet blank and rubric weights exact/unassessed.

## Ordered build tasks and dependencies

1. Author demo-v1 sources, image, schedule and separate literal key fixtures from the table above; keep fixture/extractor/key independent. Set source IDs/locations/disclosures and all six named output templates.
2. Implement pure extraction, validation, accuracy, status, classification and metrics functions in inline core and core.cjs. Write substantive Node tests against actual functions for the exact independent vectors and invalid/unknown fields.
3. Implement immutable merge and byte planner behavior and application wrappers; build-phase fleet tools may inform these calculations but their output is not app evidence. Test replay/order/conflicts/error atomicity and acknowledgement semantics. Do not contact endpoints. Research already evaluates PouchDB/CouchDB as a future option; no package selected because versions/licenses/adapter fit are unverified. This simulator is no claim of a superior production protocol.
4. Implement IndexedDB v1 persistence transactions and reload hydration, including failed-save retained draft and recovery export. All assets inline for file opening. Save/reload browser checks establish persistence, not toolkit tests.
5. Implement source/candidate review, validation and six named outputs; all frozen selectors are IDs on one element. Use native controls, readable tablet layout, focused errors/live status and persistent saved/draft distinction.
6. Implement exact-revision approval, local inboxes and idempotent routing; revalidate at the boundary. Finish primary and seeded-error recovery journeys before sync UI.
7. Implement labeled simulated two-replica reconnect, explicit field choices, missing-history restore, reapproval, replay and transfer lab. Fault controls visibly say simulation and remain secondary. `fail-next-save` injects adapter failure before any write; real exceptions share the same recovery path.
8. Implement packet/audit/path exports, evidence summary and observed timing. README.md and path-to-fleet.md start with Primary deferrals and describe file launch, data recovery, source limitations and synthetic metrics. Path export must include the literal milestones in the frozen journey.
9. Run Node application tests; host runs all frozen browser journeys fresh on desktop/narrow. Record actual evidence and failures in verification.md. Never edit frozen contracts; single bounded repair may change implementation only. No planning test pass is claimed.

## Acceptance and recovery contract details

acceptance-plan.json specifies stable IDs, ordinary CSS selectors, literal assertions and intended actions before build. Each fresh journey begins in empty local state; Load synthetic packet seeds only then. Sync lab controls are available without a packet. Review checkbox resets whenever saved revision changes. `#interrupt-ack` is a native checkbox toggled by click after being checked; persists only for that scenario. `#open-evidence` and `#open-sync-lab` reveal sections without dropping draft edits. No dialog blocks scripted journeys. `#audit-summary` summarizes business steps; detailed audit includes revision/source/time fields and unrelated diagnostic attempts separately. `#audit-detail` is a human-readable row summary while export retains actual revision IDs/timestamps.

OFF-05 restart evidence here is browser reload/persistent origin, not a physical device power-cycle. Physical restart, storage eviction resistance and government-device suitability remain human/operational checks. Browser host should run without external network requests and report runtime failure if local storage/file support is missing. Missing browser runtime is a failure, not a Node-only pass.

## Risks and operational review

No authenticated transport, government/cloud endpoint, CAC identity, certified audit immutability, device encryption, validated OCR or real records disposition is provided. IndexedDB is not encryption; device/key design and storage retention require owner security review. Source forms, current editions, filing authorities and real field ground truth remain unknown. Preserve the synthetic grammar rather than deferring the whole workflow. Owner chooses platform/device, retention, reviewers, routing authority and allowed endpoint before any future integration.

One-page path: proposed owners NAVSUP Business Systems Center, NAVIFOR, Navy Reserve Force; destination owner low-code/automation platform. 30d selects forms/workflows, 60d owner-platform build, 90d unit pilot, 180d fleet release decision. These are source proposals, not commitments. Include replication-library/version/license review, transport auth/receipts, encryption/key management, real-format mappings, ground truth, timing/rework protocol and panel/rubric gates. Human approval of this prototype is distinct from operational authority.
