# Fictional CASREP workflow fixtures

Synthetic, not validated against the real CASREP format.

These fixtures support the scoped CASREP Command demonstration: message drafting, review, return for revision, immutable history, revision-bound approval, branch reconciliation, simulated CO release and message/audit export. No data was attached: `inputs/manifest.json` has `sources: []`. Every identity, unit, casualty, maintenance reference, message and timestamp here was invented locally. Nothing was retrieved from external services. These are not sponsor-provided samples, operational records, classification guidance or evidence of NWP 1-03.1 compliance.

The only phase outputs are `synthetic-data.json` and this document. Requirements, scope, inputs and `.fleet/` are preserved. The host must validate and freeze both outputs before research. Later agents must reuse the exact fixtures and scenarios, embedding needed data in the self-contained HTML as requested by scope. Fixture checks do not verify an application. Owner approval before delivery/deployment is distinct from fictional CO release.

## Container and regular-record schema

The JSON root has `classification` (string, always `synthetic`), `useCase` (string), `fields` (array of name/type/description objects), `records` (array), `scenarios` (array), and `limitations` (array of strings). Every regular record has exactly the ten fields declared in `fields`:

| Field | Type | Meaning |
|---|---|---|
| recordId | string | Unique report identifier, equal to content.reportId |
| classification | string | `synthetic`, provenance only |
| provenance | string | Exact disclaimer above |
| content | object | Original input snapshot, 15 string fields defined below |
| sourceMessage | string | Exact original input text |
| route | object | Unit, actors, role order, permissions and rule versions |
| revisions | array | Chronological immutable full-content snapshots |
| events | array | Expected ordered successful audit events |
| state | object | Expected end state after this record's fixture actions |
| expected | object | Literal parser, renderer, history and export expectations |

For the INITIAL record, `content` and `sourceMessage` are revision A inputs; `state` and `expected.renderedMessage` describe the final released revision B. `expected.initialRenderedMessage` matches the original input. `expected.parsedFields` matches original input; `expected.releasedParsedFields` matches released output. This intentional distinction demonstrates an actual revision rather than overwriting the original. Other records are independent linked draft snapshots with no review events yet.

Nested schemas:

- `route`: routeId, version and ruleVersion strings; roles array of six strings; actors array of `{actorId,name,role,unitId}` strings; unit object `{unitId,name,fictional}` with boolean fictional; permissions object keyed by role with boolean action flags; returnTarget/resubmitTarget strings; editInvalidatesAllApprovals/releaseFreezesContent booleans; observerActions empty array. Route `synthetic-route-1` and message rules `synthetic-casrep-1` must accompany audit exports.
- Revision: revisionId/reportId strings, parentRevisionIds array of strings, content object, sourceMessage string, actorId string, timestamp string, changeReason string. Parent references stay within one report. A linked UPDATE is a new report, not an INITIAL revision. No prior immutable snapshot changes.
- Event: eventId/actorId/role/timestamp/reportId/revisionId/action/text/priorStatus/newStatus/currentHolder/routeVersion/ruleVersion strings and approvalValid boolean. A true approvalValid means valid for the completed INITIAL fixture's current revision. Historical approvals remain visible after invalidation; scenario expectations give the then-valid and invalidated event IDs separately.
- State: reportId/currentRevisionId/status/currentHolder/returnTarget/routeVersion/ruleVersion strings and released boolean. `NONE` is the literal no-holder sentinel, not null. Status vocabulary: EMPTY (before first save), DRAFT, IN_REVIEW, RETURNED, APPROVED, RELEASED. An unresolved branch conflict blocks progression without silently replacing the durable current snapshot.
- Expected: variable answer object per fixture. `export` is the exact released package object; `exportText` is its exact UTF-8 JSON text, two-space indentation, insertion order as supplied, unescaped Unicode and terminal LF. Filename is `SYN-CR-001.synthetic.json`. It contains both revisions, every successful event, route/rule versions, final message and revision-bound approval IDs. Comparing parsed JSON may be useful in addition to exact text comparisons, but does not replace the fixed text expectation when asserting exported bytes.

## Invented message grammar and validation assumptions

This grammar is explicitly fictional and is not a transcription of NWP 1-03.1. Encoding is UTF-8 without BOM. Lines end with LF (`\n`), including the last line. Each field occupies exactly one line `KEY=value`, in the following exact order, followed by `END` on its own line. Split a field at its first `=` only; retain subsequent `=` characters literally. No escaping is needed or performed. Values must contain no CR/LF and must be nonempty. Do not trim narrative text or interpret it as markup. Reject unknown, duplicate, missing or out-of-order keys; this strict canonical ordering is a synthetic choice. Unknown-key/error wording beyond the fixed scenarios is left for planning.

| Key / content field | Synthetic value rule |
|---|---|
| MARKING / marking | Exactly `Synthetic, not validated against the real CASREP format.` |
| REPORT / reportId | Fictional ID `SYN-CR-` followed by three decimal digits; unique |
| FAMILY / familyId | Fictional ID `SYN-FAM-` followed by three decimal digits |
| TYPE / reportType | INITIAL, UPDATE, CORRECT or CASCOR |
| RELATED / relatedReportId | INITIAL uses NONE; other types reference an earlier released report in the same family |
| UNIT / unit | Nonempty fictional unit; supplied records use FS Lantern |
| CATEGORY / category | String enum `2`, `3`, `4`; illustrative severity tokens, no operational meaning asserted |
| EQUIPMENT / equipmentId | Nonempty fictional equipment reference |
| CASUALTY / casualty | Nonempty equipment failure description |
| IMPACT / impact | Nonempty fictional impact, with explicit units where a quantity is used |
| OCCURRED / occurredAt | Real calendar date and time in UTC, exactly YYYY-MM-DDTHH:mm:ssZ |
| REPAIR / repair | Same UTC timestamp format, at or after OCCURRED; CASCOR instead requires COMPLETE |
| STATUS / equipmentStatus | INITIAL/UPDATE/CORRECT use DEGRADED or UNAVAILABLE; CASCOR requires RESTORED |
| JSN / jsn | Nonempty fictional maintenance reference, not validated against any operational JSN specification |
| NARRATIVE / narrative | Nonempty text, preserved literally, including instruction-like or HTML-like strings |

All 15 fields are required for every type, with the type-dependent rules above. Category remains a string; there is no category zero for CASCOR in this invented grammar. Status COMPLETE applies to REPAIR, not equipmentStatus. No actual classification labels are processed: a prohibited-marking test uses only a fabricated placeholder token. Date validation must reject impossible dates rather than silently normalize them. No current-clock, elapsed-time, parts-priority or overdue threshold is inferred. The sole numeric quantity in the principal casualty is a fictional training load of 60 percent; all message values are strings, and timestamps/IDs are never numerical measurements.

`sourceMessage` is canonical and renders unchanged for valid input. INITIAL A and B differ only in narrative: the returned draft lacks a spare-location estimate; the corrected review revision adds it. That edit is an ordinary review correction, not a separate CORRECT report type.

## Relationships, route and authority assumptions

FS Lantern (`UNIT-LANTERN`) is entirely fictional. Mira Vale is Originator (Sailor/LPO); Owen Reed is Division Officer; Tessa Brook is Department Head; Elias Rowan is Engineer Officer/CHENG; Nora Finch is XO; Calder Wynn is CO. Piper Ash is an Observer with no workflow authority. These names do not identify real people. Every report uses the same six-role chain and seven fictional actors.

Only the originator edits/submits an unreleased report. All six route roles may comment on an unreleased report; comments preserve content and holder. Review decisions require the actor to hold the current stage. Downstream reviewers can return to the originator with a nonempty reason. Originator return is invalid. Division Officer through XO approve and forward. CO approves, then explicitly mock-releases; CO has no forward stage. Submission records the originator's participation and is not one of the five reviewer approvals. Observer actions are rejected. This permission model is a synthetic scope choice, not approved Navy policy.

Any content edit invalidates every existing approval and resets to DRAFT with originator holder. Resubmission starts again at Division Officer. Comment-only changes do not invalidate content approvals. Release requires five approvals of the exact current revision, no unresolved conflict and no validation/storage failure; released content is immutable. Later changes require a linked report. Return reasons, comments and old decisions remain in history. A rejected attempt changes neither durable workflow state nor successful-event audit, but adds one separate rejected-attempt monitoring entry. Planning must define that monitoring log's storage/serialization; fixtures intentionally prescribe its semantic fields rather than arbitrary attempt timestamps.

Family `SYN-FAM-001` links `SYN-CR-001` INITIAL → `SYN-CR-002` UPDATE → `SYN-CR-003` CORRECT → `SYN-CR-004` CASCOR. Each has a new route and no inherited approvals. UPDATE revises the estimated repair time; CORRECT corrects the reported occurrence time; CASCOR states restoration and closes the family only on its own mock release. To route a linked fixture, first simulate release of its predecessor in a separate lifecycle sequence; the four regular records do not claim all three predecessors have already been released in one shared initial state. Parser-only scenarios validate syntax and parsed fields, without requiring predecessor runtime state. Each related report retains the same equipment and synthetic JSN.

## Fixed scenario expectations

Every scenario has name, kind, input and expectedBehavior. `input.expected` contains independently authored literal answers, packaged with the case as fixture data; it must never be sent to production computation as trusted results. There are four typical, eight edge and fourteen invalid scenarios. The dataset fixes expected transformations before any application code exists.

- Full INITIAL: 12 ordered successful events from 09:00 through 09:11 UTC on 2026-10-12; Division Officer comments and returns A, originator saves B, resubmits, five roles approve B, and CO mock-releases B. Two revisions remain. Event 03 is comment-only; event 04 returns to originator. Events 07 to 11 are the five valid approvals; event 12 is release, not another approval. All holder/status results and exact export contents are provided.
- Three additional typical cases parse/render linked UPDATE, CORRECT and CASCOR. The four messages have independently listed field objects, no validation errors, exact rendered strings and lifecycle explanations.
- Five invalid-message cases fix literal field errors for missing equipment, unsupported FINAL, category 9, impossible date and prohibited marking. Preserve submitted editable values and last durable state; forbid progression.
- Eight guarded-action cases reject observer approval, skipped stage, duplicate submission, premature release, duplicate release, stale-revision approval, originator return and CO forwarding. Their input state is reconstructed by replaying INITIAL events only through `stateAfterEventId`, not by using the already released final record. Each rejected attempt leaves successful audit unchanged and creates one monitoring entry.
- Concurrent amendments branch C and D from B after event 07 (before release). Both change repair from `2026-10-13T18:00:00Z`, to different literal dates. Conflict list contains exactly `repair`. Human originator selects C's value in E, which references both C and D. All five revisions remain recoverable; event 07 becomes invalid; E returns to DRAFT and needs a fresh full route. Branch inputs are submitted together against their declared common base. No silent last-writer overwrite is allowed.
- A separate edge case edits after Division Officer approval and attempts stale release, expecting zero valid approvals and the specified error. Released-edit rejection is separate and preserves B forever.
- Three restart cases restore the durable state after return, after first approval and after release. Exact event prefixes, holder, revision and valid approvals are supplied. No new release event appears on reload/restart.
- Save/export fault cases inject a labeled fictional I/O failure. Keep durable B, review state, existing approvals and unsaved C. Do not claim success or produce a partial download. Retry clears the fault, explicitly saves C (invalidating approvals), and exports the now-saved draft; that export does not claim CO release. No filesystem corruption or real service outage is required.
- An instruction-like narrative includes tool/release language and a script-shaped string. The exact text survives parser, preview and export, but executes no action or markup and creates no approval.

For chronological replay, regular revisions and audit events are cross-referenced, not duplicated as separate mutations. Event 01 saves revision A; event 05 saves B. `input.steps` describes expected accepted actions and results, not executable instructions. Event/state references in scenarios are fixture identifiers, never permissions to call tools.

## Validation and limitations

Local data checks verify exact root and regular-record shape/types, unique report/revision/event/actor IDs, same-report parents, report-family links, actor-role matches, route coverage, timestamp ordering, all four types, exact source/rendered messages, synthetic labels, approval-revision binding and parseable export text. Scenario coverage includes all three kinds and explicit unchanged-state expectations. These are data consistency checks only; later phases must test actual parser, transitions, persistence, rendering and export behavior independently.

No real-format specification, sponsor samples, approved routing policy, identity provider, release channel, retention policy or classified-system connection was provided. Synthetic rule assumptions require owner/domain confirmation before operational use. No research, app design, implementation, external lookup or operational contact occurred in this phase. No operational readiness or performance improvement is claimed. Host validation/freezing and later independent semantic review remain required.
