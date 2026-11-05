# Synthetic CASREP workflow fixtures

These files contain **fictional data only**, authored deterministically from `requirements.md`, `scope.md`, `.fleet/packet.json` and the empty-source `inputs/manifest.json`. No operational records, sponsor samples, official format excerpts or external services were used. Every sample message is labeled **SYNTHETIC, NOT VALIDATED AGAINST NWP 1-03.1**. Names and the FSV Lantern training unit are invented. This is intake data preparation, not application implementation or verification.

DESC8-2 remains deferred for real-world benefit evidence. The fixtures demonstrate synthetic readiness and parts priority context and workflow counts; they establish no measured reporting-time, rework, readiness or supply improvement. Owner approval before delivery/deployment and host validation/freezing of these data remain outstanding.

## Files and use

`synthetic-data.json` has the requested envelope: `classification`, `useCase`, `fields`, `records`, `scenarios`, `limitations`. `fields` declares every top-level regular-record field. Each regular record has exactly those fields with matching JSON types. Scenarios include `name`, `kind`, `input`, `expectedBehavior` and a supplemental `expected` object containing independently authored expected values. Invalid inputs belong only in scenarios. No future application code generated these answers.

Downstream agents must reuse these exact records and scenarios, preserve the frozen artifacts and embed required fixture inputs into the self-contained index.html. Expected values are fixed data oracles, not implementation templates. They must be checked against the actual shared backend and user workflow; toolkit tests and this data's structural checks do not verify an application. Source criterion links in SC-01 are an illustrative subset, not the acceptance inventory or an acceptance plan.

## Regular-record schema

| Field | JSON type | Meaning |
| --- | --- | --- |
| fixtureId | string | Unique sample key |
| provenance | object | Synthetic origin, label, grammar and fictional actors |
| draft | object | Complete editable report content |
| revisions | array | Full immutable revision snapshots, oldest first |
| workflow | object | Initial routing state |
| messageText | string | Canonical message matching `draft` |

`provenance` has string fields `classification` (synthetic), `handling` (NOTIONAL UNCLASSIFIED), `label`, `grammarVersion` (SYN-CASREP-1), `method`; `actors` is an array of `{actorId, name, role}` string objects. SYN-A01 through SYN-A06 map to Originator (Sailor/LPO), Division Officer, Department Head, CHENG (Engineer Officer), XO and CO respectively. The identities are demonstration roles, not authenticated accounts.

Every `draft` has the following string fields:

| Field | Demonstration meaning and constraint |
| --- | --- |
| reportId | Stable unique fictional report identifier, e.g. SYN-CR-001 |
| reportType | INITIAL, UPDATE, CORRECT or CASCOR, exact uppercase |
| category | One of DEMO-1, DEMO-2, DEMO-3; invented labels without official category meaning |
| unit | Fictional unit display name and identifier |
| equipmentId, equipmentName | Fictional equipment relationship and display name |
| occurredAt | Valid UTC ISO 8601 instant, `YYYY-MM-DDTHH:mm:ssZ` |
| description | Casualty narrative |
| readinessImpact | Fictional readiness context, never a calculated readiness measure |
| partsPriority | DEMO-URGENT or DEMO-ROUTINE; invented priority labels |
| repairNarrative | Proposed action and fictional parts/arrival narrative |
| maintenanceJsn | Optional fictional maintenance reference; empty string means absent |
| relatedReportId | Empty for INITIAL; released INITIAL report ID for other types in these examples |
| classification | Exactly NOTIONAL UNCLASSIFIED |

All draft fields other than `maintenanceJsn` and INITIAL's `relatedReportId` must contain non-whitespace content. Values are case sensitive; do not silently map unknown types, categories or handling labels. In this invented line-oriented grammar, field values must not contain CR or LF. `equipmentId` and `equipmentName` also exclude ` | ` so the equipment pair is unambiguous. This is a demonstration restriction, not a real message standard. Supplied fixture strings meet it. Free text remains inert content, including instruction-like comments; a label cannot certify arbitrary text as unclassified. Planning must specify additional limits or validation outcomes before implementation if it adds them.

`revisions` elements have strings `revisionId`, `reportId`, `parentRevisionId` (empty at root), `authorId`, `authorRole`, `createdAt`; array `mergeParentRevisionIds` (empty except explicit merges); object `content` (the entire draft schema); and string `messageText`. Times are UTC instants. Root revisions are independent roots for their reports; `relatedReportId` supplies cross-report lifecycle linkage, not revision ancestry. Complete old content is retained after later edits.

`workflow` has string `status`, `currentHolder`, `currentRevisionId`; array `route`; arrays `approvals`, `comments`, `conflicts`, `audit`; and `release`, initially JSON null. All regular records start in DRAFT with Originator holding one revision and empty event arrays. These are editable starting samples, not claimed historical releases. SC-01's CREATE action explicitly creates the initial sample from empty state and supplies its first audit event; loading a preset must not silently simulate approvals. In released scenario output, the holder string is `None` (not JSON null).

## Inventory and relationships

- `initial-return-loop`: SYN-CR-001 / INITIAL / DEMO-2, auxiliary cooling pump fault, missing seal-kit detail and estimated arrival in R1. R2 fixes exactly `repairNarrative`.
- `update-linked`: SYN-CR-002 / UPDATE / DEMO-2, fictional kit arrived and installation planned.
- `correct-linked`: SYN-CR-003 / CORRECT / DEMO-2, narrative explicitly corrects an equipment identifier transcription. It is its own new report; it does not rewrite SYN-CR-001. The typo exists in this correction's fictional context, not as an extra undocumented R1 field change.
- `cascor-linked`: SYN-CR-004 / CASCOR / DEMO-1, fictional repair and test complete with restored training capacity.
- `optional-jsn-empty`: SYN-CR-005 / INITIAL / DEMO-3, a distinct training display fault with no JSN.

The three lifecycle reports refer to SYN-CR-001 as their released INITIAL. SC-02 through SC-04 supply that simulated-release prerequisite. The inventory alone starts drafts and does not assert the prerequisite has already occurred. Occurrence time remains the original casualty instant; revision authoring dates distinguish later reports. No operational deadlines, category meanings, official lifecycle relationships or maintenance-system integration are asserted.

## Invented message grammar and exports

`SYN-CASREP-1` is a CASREP-oriented teaching grammar, not an NWP implementation. Canonical messages use UTF-8, LF separators, no indentation, no trailing spaces and exactly one terminal LF. The first line is the synthetic warning and the second is `SYN-CASREP-1`. Then emit `KEY: value` in this exact order:

1. REPORT = reportId
2. TYPE = reportType
3. CATEGORY = category
4. CLASSIFICATION = classification
5. UNIT = unit
6. EQUIPMENT = equipmentId + ` | ` + equipmentName
7. OCCURRED_UTC = occurredAt
8. CASUALTY = description
9. READINESS = readinessImpact
10. PARTS_PRIORITY = partsPriority
11. REPAIR = repairNarrative
12. MAINTENANCE_JSN = maintenanceJsn or NONE
13. RELATED_REPORT = relatedReportId or NONE

The last line is `END SYN-CASREP`. Full exact messages are stored alongside each regular draft and each revision, and in scenario expected outputs. Structured content and message bytes must agree; replacing these with generic tasks or JSON-only output omits the message-format demonstration.

SC-01 fixes message and audit download filenames and bytes in `expected.exports`. Its audit text is a deliberately invented `SYN-AUDIT-1` format: synthetic warning, format marker, one event per line, `END SYN-AUDIT`, terminal LF. Each event joins sequence, eventId, timestamp, actorId, actorRole, action, reportId, revisionId, note, resultStatus and resultHolder with ` | ` in that order. The full canonical revision/audit JSON download is also fixed in `revisionAuditText`. It contains provenance, full revisions, approvals, accepted events, release receipt and the readiness/priority context. SC-25 fixes the same content for reload/export consistency. Compare download bytes to these fixtures; exports must not create review events.

## Routing and audit assumptions

The invented route is Originator → Division Officer → Department Head → CHENG → XO → CO. Originator SUBMIT counts as its approve/forward decision. Only the current holder may approve, return or comment. Originator may amend an unreleased current draft while review is pending; a content amendment resets to DRAFT and invalidates all previous approvals. Its own RETURN means a recorded withdrawal to its own DRAFT with a reason. Other returns require a reason, invalidate approvals and go to Originator in RETURNED state. Comments do not move the holder or change content. Every role has independent comment, return and forward examples in SC-24.

The five subsequent reviewers approve the exact current revision in order. CO APPROVE produces READY_FOR_RELEASE while CO remains holder. A separate confirmed CO SIMULATE_RELEASE produces RELEASED, holder `None` and a receipt with `simulated: true`, `transmitted: false`. Released content is frozen. Further work uses a linked new report. These are conservative fictional rules, not approved Navy routing or release policy. Simulated CO release is never owner approval to deliver or deploy.

Actions carry operation IDs for retry protection. Identical ID and identical payload return the original result without a new event; a fresh operation repeating an existing approval is rejected. Revision-staleness checks precede holder checks. A duplicate current-revision approval is identified before a holder mismatch. Non-CO release fails authority before checking completeness; CO release checks completeness before confirmation. Unknown types/categories/handling and missing required content fail before any route advancement. Individual negative fixtures each isolate one error; planning must fix multi-error ordering if needed.

Accepted audit events have `eventId` (string), `sequence` (integer number), `timestamp`, `actorId`, `actorRole`, `action`, `reportId`, `revisionId`, `note`, `resultStatus`, `resultHolder` (strings). They are append-only and ordered by sequence, not by arbitrary clock sorting. Rejected attempts are retained in a separate attributed stream with attempted action/payload, actor, report/revision, timestamp and exact rejection reason. Rejections do not mutate accepted audit, revision content or holder. Retry replay is not a rejection. Exact rejection-stream encoding and IDs remain planning choices; fixtures fix its event-count and state invariants.

Approvals identify `revisionId`, `actorId`, `role`, `eventId` (strings) and `valid` (boolean). An old decision is retained and marked invalid after return/edit; it is not erased or reused. The main route's R1 submission becomes historical; the six current valid decisions are R2 Originator submission and the five reviewer approvals. Release receipts contain string IDs, actor and `releasedAt`, plus boolean `simulated` and `transmitted`. Counts in SC-01 distinguish two submissions from five reviewer approvals and include twelve accepted events. They are synthetic counts, not performance evidence.

Competing amendments from R2 preserve full branch content and base lineage. R3A remains accepted; R3B is retained as the conflict candidate without overwriting R3A. CONFLICT blocks review/release until explicit confirmed resolution. R4 references R3A as primary parent and both R3A/R3B as merge parents, retains all five revisions, records resolution and requires fresh submission/review. These fixtures demonstrate local conflict semantics only.

## Scenario expectations

`input.scenarioId` is stable. References `{scenarioId: SC-01, throughAction: N}` mean execute the first N one-based actions of SC-01 from empty state, inclusive, then run the scenario independently. SC-24 cases also run independently; do not concatenate alternative actions or share state between scenarios.

| IDs | Kind | Required observable outcome |
| --- | --- | --- |
| SC-01 | typical | INITIAL draft, comment/return, R2, every role approval, explicit simulated release; exact message, lineage, difference, audit, route, receipt and downloads |
| SC-02 to 04 | typical | Validate and generate distinct UPDATE, CORRECT and CASCOR messages linked to released INITIAL; no automatic release |
| SC-05 | edge | Empty optional JSN renders NONE |
| SC-06 to 10 | invalid | Exact missing/unknown field or handling errors, draft preserved; corrected submission succeeds |
| SC-11 to 18 | invalid | Wrong-role, skipped-role, stale approval, incomplete release, missing reason, unconfirmed release or released edit rejected without state loss |
| SC-19 | edge | Identical operation replay commits no duplicate; new duplicate approval attempt rejected |
| SC-20 | edge | Content edit preserves history and invalidates every prior current-revision approval |
| SC-21 | edge | Stale/offline branch retained, conflict blocks review, confirmed merge retains lineage and restarts review |
| SC-22 | invalid | Malicious-looking comment is stored as inert content and cannot release or delete audit |
| SC-23 | edge | Acknowledged checkpoint survives reload/restart; failed write retains draft and route, retry commits once |
| SC-24 | typical | All six roles meaningfully comment, return and forward, including Originator self-withdrawal and separate CO release |
| SC-25 | edge | Export bytes and revision/audit content agree with released revision before/after reload |

For DESC8-2 synthetic coverage, the independently fixed resulting literal is:

> readiness and parts priority: Training cooling capacity reduced; backup pump supports one training loop. | DEMO-URGENT

SC-01 and SC-25 include this in resulting output, not merely a field input. Planning should assert it after the workflow/export along with the complete CASREP, revision history and route. It cannot establish operational benefit.

## Uncertainty and limits

Official NWP editions, sponsor samples, approved categories, required fields and routing are absent. Every grammar, routing, lifecycle and priority rule here is explicitly invented and needs domain confirmation. No identity provider, messaging endpoint, Microsoft 365 connector, real release, classification certification or readiness update is represented as working. No software or operational system was contacted to generate these fixtures.

SC-23 fixes logical recovery outcomes while leaving persistence medium, checkpoint encoding and fault injection to planning. It does not prove persistence or distributed synchronization. Exact implementation protocol, non-fixture input limits and additional parser failure cases must be documented during planning. The host must validate/freeze both files before research; downstream application tests, format-fidelity review, human walkthrough and owner approval are separate outstanding gates.
