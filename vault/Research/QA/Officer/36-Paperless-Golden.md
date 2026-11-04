---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Synthetic Paperless Underway answer key for offline forms, reviewed conflict resolution, replay safety and tasking records."
---

# ID 36: synthetic paperless workflow answer key

## Bottom line

[R] A clerk should be able to save a draft while disconnected, recover it, see competing edits and choose what to submit after review. This entirely synthetic example supplies exact form values, a two-device conflict and a small tasking-email exercise. [E] The inspected helper reconciles revision histories but supplies neither durable storage nor a network connection. [R] Passing its data-only checks cannot prove offline restart or sync on reconnect. These are simplified practice records, not completed government forms, actual correspondence or approved submissions.

## Published need and coverage

[P] The captured ID 36 text describes two tracks: offline capture/validation of handwritten training logs, a requisition and correspondence with later sync/routing; and tasking emails/documents converted into verified actions, draft updates and filed records. It requires human review before submission, an audit trail, synthetic data without personal information, and offline operation with sync. It also calls for source citations, a one-page path to fleet, and government devices and existing low-code platforms where possible.

| Published need [P] | Coverage here [R] | Limit |
| --- | --- | --- |
| Capture and validate the three document types offline | Three typed synthetic forms, supplied validation rules and restart checks | No handwritten image or actual form template is supplied; OCR and official format compliance are untested |
| Clean sync after reconnect | Two isolated local test replicas, conflicting edits, retry and reviewed merge | Pure helper results prove only reconciliation; actual transport and persistence require app execution |
| Human review and audit | Review binds to one revision; no automatic submission on reconnect; inspect history | Role labels do not establish authenticated identity or command authority |
| Tasking, status updates and filing | Four short synthetic emails, three actions and an invented filing map | One small sample, not a week-long workload or real records schedule |
| Target platforms and path to fleet | Remain explicit acceptance gaps | No government device, low-code deployment or transition owner is confirmed by these fixtures |

[E] At `50fcaea`, `harness/tools/offline.ts` unions immutable revisions, detects concurrent heads and retains conflicts. The recipes describe replay, ordering and persistence checks, but transport and storage are app integration work. [R] Packet-time savings and a manual baseline may be measured separately; these examples make no productivity claim.

[R] Coordination: use these forms within the O family in [[Research/QA/Test-Plan]], historically O-O/O-S/O-W at `50fcaea`. The final relay's unified UI at `631849f` needs updated navigation, as recorded in [[Research/QA/Officer/README]]; the domain helper is unchanged. G03 through G06 instantiate O1 conflict/replay checks, and G01 supplies records for O2 recovery. Tasking/filing adds Track B coverage. O3 byte budgeting and common interface/delivery gates stay in the main plan; avoid duplicate coverage counts.

## Synthetic forms and test-only rules

[A, synthetic fixture] Two invented devices, SYN-DEVICE-A and SYN-DEVICE-B, hold practice paperwork for an invented clerk role, SYN-CLERK. SYN-REVIEWER is an invented role used for scripted review actions. No actual Sailor, ship, unit, address, stock number or signature appears. All IDs, dates, quantities and text below are synthetic.

[R, synthetic contract] Use these exact three drafts. Dates use YYYY-MM-DD and must be valid calendar dates. Every listed field is required. Attendee count and quantity must be positive integers. Unit must be PACK for this exercise. Record IDs are unique. These are invented test rules, not DD 1348-1A, NAVPERS or correspondence-policy rules.

| Record ID | Kind | Exact synthetic fields |
| --- | --- | --- |
| SYN-LOG-01 | training-log | date = 2032-04-15; activity = Training-record practice; attendeeCount = 3 |
| SYN-REQ-01 | requisition | date = 2032-04-15; item = Practice cards; quantity = 6; unit = PACK |
| SYN-COR-01 | correspondence | date = 2032-04-15; subject = Practice binder return; body = Return unused practice binders to the training shelf. |

## 36-G01: capture and recover without a connection

[R] Simulate disconnection within the isolated app test context before cold launch, without changing the host Mac's network configuration. Enter and save the three drafts, close the app, and reopen while still disconnected. The checker must see exactly three records with the exact fields above. Each remains an unsubmitted draft. Submitted-item count is 0. An offline/pending indication must not claim receipt by another device. Follow the main plan's separate preview and delivered-app recovery checks because they can use different storage origins.

[R] Reopening must not create extra records, erase fields or invent approval. If a browser storage failure prevents saving, the app must report failure rather than acknowledge a durable save. Export/import recovery is useful additional evidence, but copying a file does not by itself pass reconnect sync. Actual cold launch, restart and storage behavior are NOT RUN here.

| Independent validation case [R] | Exact synthetic edit, reset to valid drafts first | Required answer |
| --- | --- | --- |
| 36-G02a | SYN-REQ-01.quantity = 0 | Invalid quantity; 0 retained for correction, no review-for-submission or submission allowed |
| 36-G02b | SYN-REQ-01.quantity = "six" | Invalid integer; no automatic conversion or accepted submission |
| 36-G02c | SYN-LOG-01.date = 2032-04-31 | Invalid calendar date; no rollover into May |
| 36-G02d | SYN-COR-01.subject = empty string | Missing subject; retain body, no accepted submission |

[R] Each invalid draft may be saved with a visible error for later repair. The other two records remain unchanged. Restoring the original field value makes that record valid again; it still needs human review before submission.

## 36-G03: the two-device requisition conflict

[A, synthetic fixture] Both devices start with the same requisition for 6 packs. While disconnected, device A changes it to 8 and device B changes it to 10. Neither update is submitted. This is a quantity disagreement for practice cards, not an actual supply order.

[R] The following is the exact data-only helper input. The value string represents the requisition's quantity projection; the full app must also retain its unchanged date and item fields. All three revisions refer to the same synthetic record.

```json
{
  "local":[
    {"id":"SYN-R0","recordId":"SYN-REQ-01","parents":[],"actor":"SYN-DEVICE-A","value":"SYNTHETIC practice-card requisition; quantity=6; unit=PACK"},
    {"id":"SYN-RA","recordId":"SYN-REQ-01","parents":["SYN-R0"],"actor":"SYN-DEVICE-A","value":"SYNTHETIC practice-card requisition; quantity=8; unit=PACK"}
  ],
  "remote":[
    {"id":"SYN-R0","recordId":"SYN-REQ-01","parents":[],"actor":"SYN-DEVICE-A","value":"SYNTHETIC practice-card requisition; quantity=6; unit=PACK"},
    {"id":"SYN-RB","recordId":"SYN-REQ-01","parents":["SYN-R0"],"actor":"SYN-DEVICE-B","value":"SYNTHETIC practice-card requisition; quantity=10; unit=PACK"}
  ]
}
```

[R] On reconnect, exchange these histories between the isolated test replicas. The exact reconciled result for this one record is:

| Checked value | Exact expected result |
| --- | --- |
| Unique revisions | 3: SYN-R0, SYN-RA, SYN-RB |
| Records | 1: SYN-REQ-01 |
| Current alternatives, called heads in the helper | SYN-RA and SYN-RB |
| Record status | conflict |
| Single accepted value | null, because a human has not selected a result |
| Conflicts count | 1 |
| Visible competing quantities | 8 PACK and 10 PACK, both recoverable with their device and parent revision |
| Submission count | 0 |

[R] The app must neither choose 10 because it is numerically larger nor choose whichever edit arrives last. Swapping local and remote must give the same revisions, alternatives and conflict. Replaying the identical exchange must leave 3 unique revisions and 1 record. The training log and correspondence draft remain unchanged.

## 36-G04: resolve, review, submit once

[R] These are scripted future checker actions, not approvals already given. At the conflict screen, the checker acting as SYN-REVIEWER explicitly chooses a corrected quantity of 9 PACK after inspecting both alternatives. Create this synthetic merge revision without changing or deleting the older revisions:

```json
{
  "id":"SYN-RM",
  "recordId":"SYN-REQ-01",
  "parents":["SYN-RA","SYN-RB"],
  "actor":"SYN-DEVICE-A",
  "value":"SYNTHETIC practice-card requisition; quantity=9; unit=PACK"
}
```

[R] After exchanging the new revision, each replica must have 4 unique revisions, one head SYN-RM, status resolved, conflicts = 0, and the exact quantity-9 value above. The original 6 and competing 8 and 10 remain in history. In the full form, date stays 2032-04-15, item stays Practice cards and unit stays PACK. Resolved means no competing revision remains; it does not mean reviewed, approved or submitted.

| Scripted synthetic action | Exact expected result |
| --- | --- |
| Merge complete, before a review action | Quantity 9; current revision SYN-RM; submission count 0; no submission permission inferred from resolution |
| SYN-REVIEWER reviews SYN-RM, then cancels the submit dialog | Review points to SYN-RM; submission count still 0 |
| Explicitly submit SYN-RM to an isolated local receipt simulator | Exactly one accepted receipt for (SYN-REQ-01, SYN-RM); submitted quantity 9 PACK; the other two drafts remain unsubmitted |
| Retry that same submission after a simulated lost acknowledgement | Still one accepted receipt for (SYN-REQ-01, SYN-RM); acknowledgement may be delivered again without a second effect |
| Close/reopen each test replica after acknowledged sync | Same 4 revisions, one head SYN-RM, quantity 9 and same submission receipt; no loss or duplicate |

[R] A local simulator is only a test receiver and must be labeled as such. These steps authorize no live connector or government submission. If the candidate lacks a receiver or transport, mark those rows UNSUPPORTED; a successful helper call or download is not a passed reconnect test.

## 36-G05: stale review and interrupted exchange

[R] Start from the reviewed but unsubmitted SYN-RM state, not from a prior submission. Make a new synthetic revision SYN-RN with parent SYN-RM and quantity 11 PACK. The current draft is now 11. Its previous review of quantity 9 is retained in history but cannot authorize SYN-RN. An attempted submit before reviewing SYN-RN yields 0 accepted receipts. Cancelling stops the attempted submission while preserving the local draft.

[R] For a separate interrupted-sync case, start from 36-G03 and disconnect before any receiver acknowledgement. The sender retains its pending edit and must not show it as received. On reconnect and eventual acknowledgement, each side ends with exactly the 3 unique revisions and the one unresolved conflict in G03, regardless of retry count. If a receiver acknowledged durable receipt before losing power, its reopened state must still contain that acknowledged revision. These are storage/transport tests; the pure reconciler cannot establish them.

## 36-G06: additional reconciliation checks

[R] These exact failure cases exercise the existing revision model, an explicit implementation of the published clean-sync requirement, not a Navy-mandated wire format. Reset to the G03 input before each row.

| Synthetic mutation | Exact expected result |
| --- | --- |
| Supply only SYN-RA in local and an empty remote history | Reject missing parent SYN-R0; no accepted reconciled snapshot or acknowledgement of complete history. Keep the edit pending until history is recovered. |
| Change only the remote SYN-R0 value from quantity=6 to quantity=7 | Reject revision-ID collision for SYN-R0. Do not overwrite either value or invent a merged revision. |
| Replace remote SYN-RB with SYN-RD, parent SYN-R0, actor SYN-DEVICE-B, value null | 3 unique revisions SYN-R0, SYN-RA, SYN-RD; heads SYN-RA and SYN-RD; conflict count 1, status conflict, value null. Show edit to 8 versus deletion, not a completed deletion. |

## 36-G07: synthetic tasking and filing

[A, synthetic fixture] The following four short emails are source data for a clerk's task list. They have no addresses, real senders or attachments. Source IDs are the citations. All dates, role labels and filing destinations are fictional. The exercise deliberately covers only a tiny administrative sample.

| Source ID | Complete synthetic email body |
| --- | --- |
| SYN-EMAIL-01 | SYNTHETIC TASK: SYN-ROLE-01 must prepare two blank practice-form packs by 2032-04-16T15:00Z. |
| SYN-EMAIL-02 | SYNTHETIC TASK: SYN-ROLE-02 must check the practice binder labels by 2032-04-17T09:00Z. |
| SYN-EMAIL-03 | SYNTHETIC FYI: The practice shelf label is blue. No action is requested. |
| SYN-EMAIL-04 | SYNTHETIC TASK: SYN-ROLE-01 must prepare the practice shelf list by Friday. |

[R] Exact extraction answer: 3 proposed actions, 0 verified actions until a human checks them, 0 completed actions and 0 submissions. SYN-EMAIL-03 creates no action. Each of the other three retains its own exact source citation and body.

| Source | Required action data | Owner | Due in UTC | Review state |
| --- | --- | --- | --- | --- |
| SYN-EMAIL-01 | Prepare 2 blank practice-form packs | SYN-ROLE-01 | 2032-04-16T15:00:00.000Z | Proposed, awaiting human verification |
| SYN-EMAIL-02 | Check the practice binder labels | SYN-ROLE-02 | 2032-04-17T09:00:00.000Z | Proposed, awaiting human verification |
| SYN-EMAIL-04 | Prepare the practice shelf list | SYN-ROLE-01 | null | Needs clarification: Friday has no explicit calendar date, time or timezone |

[R] Do not use the computer's date to resolve Friday. After the checker explicitly verifies actions from EMAIL-01 and EMAIL-02, exactly 2 actions are verified and 1 still needs clarification. Verification does not mark work completed. A draft status update must preserve those meanings: 2 verified actions pending completion, 1 action awaiting a due date, and 0 completed actions. Wording may vary; counts and source-linked deadlines may not.

[A, synthetic filing map SYN-SCHEDULE-01] For this test only: source tasking emails and their action/status drafts belong in SYN-FILE-TASKING; the informational email belongs in SYN-FILE-REFERENCE. No retention period or destruction instruction is supplied.

[R] The proposed filing result assigns EMAIL-01, EMAIL-02 and EMAIL-04, all three proposed actions and the draft status update to SYN-FILE-TASKING; EMAIL-03 goes to SYN-FILE-REFERENCE. Preserve links between each action and its source. Filing does not mark the unresolved action verified. Retention is unknown and no deletion is scheduled. The checker must review this proposed filing before any simulated submission. Correct filing here means only matching this invented map, not compliance with an actual records schedule.

## Audit, control and deliberate wrong answers

[R] Inspect the app's recorded actions, not just its current values. The audit must let a checker recover record/revision IDs, parent links, source or device, changes from 6 to 8 and 6 to 10, the conflict, the human choice of 9, review of SYN-RM, cancellation and the single receipt for SYN-RM. It must distinguish the later unreviewed 11-pack revision. Require recorded event times and ordering, but do not compare them to fictional fixed timestamps: actual test times depend on when the checker runs the exercise. Read-only views or retries may add log entries; they may not add accepted submissions or rewrite old content.

| Deliberately wrong synthetic output | Exact reason the checker must reject it |
| --- | --- |
| G03 displays 10 PACK with no conflict | Lost an unreviewed concurrent edit |
| G04 has one record but only SYN-RM in history | Destroyed lineage needed for the audit |
| Reconnect submits the record before any review | Violated the published review-before-submission requirement |
| A replay produces two accepted receipts | Duplicate submission effect |
| A saved local file is labeled as successful reconnect sync | No second-replica receipt or convergence was demonstrated |
| EMAIL-04 gets a guessed Friday deadline | Invented a missing source value |
| The status update says the two verified actions are complete | Confused checking a task with performing it |

[R] Keep a visible pending/conflict/submitted state and a way to cancel or pause submission. If history is missing, a conflict is unexplained or a save fails, retain the draft, stop submission and escalate to the reviewer or technical operator. Official routing, real email delivery, purchasing, automatic record destruction and entry into government systems are prohibited in this exercise. Human review in a local simulator is not a real approval.

## What remains thin

[A] The source names document families and public resources but does not supply selected form editions, field rules, handwritten scans, a real filing schedule, review roles, sync conflict policy, routing endpoints or device configuration. Therefore the fixture deliberately supplies simple test rules without claiming official conformity. An owner must supply the missing rules before broader acceptance. A typed record is not evidence of handwriting capture; a revision graph is not evidence of storage, transport, authentication or encryption. No genuine paper-to-digital accuracy, full-week tasking coverage, platform compatibility, time saving or path-to-fleet acceptance was measured. All generated-app outcomes are NOT RUN here.

## Sources

- [P] https://cdao.hackathon.maximus.com/event/norfolk/use-cases/36. Read the existing capture's ID 36 description, requirements and resources in `Sources/raw/events_norfolk_combined.json`; no live portal recheck.
- [P] [[UseCases/36-paperless-underway]]. No named public form or manual was treated as read or tested.
- [E] https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/tools/offline.ts. Pure revision reconciliation read locally, not executed.
- [E] https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/recipes.ts and https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/catalog.ts. Project pilot requirements and integration gaps read locally.
- [E] [[Research/Plan/Plan]], [[Research/QA/Static-Findings]], [[Research/QA/Officer/README]].
