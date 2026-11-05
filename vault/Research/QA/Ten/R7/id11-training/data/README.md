# PB4T synthetic fixtures

Synthetic; not validated against real records, real format, or SFTRM.

These deterministic fictional records support the Planning Board for Training workflow in `requirements.md` and `scope.md`: competing departmental proposals, qualified crew and room collisions, alternate allocations, a seven-day board, numeric personnel loading, invented fatigue limits, and fictional training obligations. No supplied data existed (`inputs/manifest.json` has no sources). No operational system, remote source or toolkit solver was used to create the records or answers. This is data preparation only; it supplies no application and proves no application behavior. Owner approval remains required before delivery or deployment.

## Container and record schema

`synthetic-data.json` has the required container keys: `classification` (literal `synthetic`), `useCase` (string), `fields` (array of record-field name/type/description objects), `records` (array), `scenarios` (array), and `limitations` (array of strings). Every regular record has every declared field with the declared JSON type. There are no null or implicit policy defaults.

Three complete records are supplied: `weekly-conflicts` (the full feasible negotiation example), `impossible-expired-eoow` (the same requests with only expired P8 eligible as EOOW), and `feasible-zero-budget` (the feasible input with zero assignment attempts allowed). The latter two are literal copies of the corresponding scenario variants, making infeasible and exhausted-search inputs directly reusable. Each retains all record fields.

The invented JSON grammar is version 1. It is a fixture format, not an official Navy exchange format or a prescribed application transport protocol. A regular record contains a complete scheduling input, including the following nested structures:

| Field | Type | Meaning |
| --- | --- | --- |
| schemaVersion | number | Integer 1 |
| fixtureId | string | Unique complete dataset ID |
| provenance | string | Required synthetic disclosure |
| week | object | `start` ISO UTC string, `timezone` string, `horizonMinutes` number, `intervalSemantics` string |
| departments | array | Objects with `departmentId`, agent `name` strings, integer `priority` and `tieOrder` |
| personnel | array | Objects with `id`, fictional `name`, `departmentId`, `qualifications` array, `availability` array |
| resources | array | Objects with `id`, `name`, numeric exclusive `capacity` 1, `availability` array |
| operationalWindows | array | Permitted ship training intervals `[startMinute,endMinute]` |
| fixedDuties | array | Objects with `id`, `personnelId`, numeric `startMinute`, `endMinute` |
| policy | object | Explicit fictional rest/budget/qualification rules described below |
| drills | array | Requests described below |
| recurrenceRequirements | array | History and explicit obligation objects described below |
| search | object | Nonnegative integer `maxNodes`, descriptive `candidateOrder` and `objective` strings |
| review | object | `state` string, integer `revision`, boolean `realApproval` always false |

Personnel qualifications are `{role:string, validFrom:number, validUntil:number}`. Availability is a list of numeric interval pairs. All IDs are case-sensitive strings and unique within their entity collection. Department references, eligible/proposed personnel references, fixed-duty personnel references, resource references and requirement references must resolve. Qualification names are exact strings. Fictional roles include Fire Party Leader, EOOW and TAO; these names do not certify anyone.

A drill has string `id`, `title`, `departmentId`, `requirementId`; numeric `durationMinutes`, `preferredStartMinute`; boolean `mandatory`; `requiredRoles` array of `{role:string,count:number}`; string-ID arrays `eligiblePersonnelIds`, `proposedPersonnelIds`, `resourceIds`; and numeric `allowedStartMinutes` array. Each role must be filled by a distinct qualified eligible person. No person fills two role slots in one drill. Eligibility lists can include alternatives; proposed personnel specify the original crew rather than a compulsory crew. Every listed resource is required for the entire drill. Allowed starts are a discrete finite set; a preference never overrides a hard constraint.

Each recurrence requirement has string `id`, `ruleKind`, numeric `lastCompletionMinute`, `referenceIntervalMinutes`, and `occurrences` array. Each occurrence has string `id`, numeric `releaseMinute`, `deadlineMinute`, `requiredCount` (1 here). In-week occurrence IDs correspond exactly to mandatory drill IDs; matching drill start must be at or after release and end at or before deadline. `referenceIntervalMinutes` describes fictional planning cadence only. **The occurrence list is authoritative for this demonstration; do not derive a second obligation list from interval metadata.** R-DC intentionally requires two occurrences in the week. Other histories and illustrative intervals place their next deadlines in the week. No ongoing SFTRM recurrence algorithm is implied.

## Time, qualifications and invented fatigue rules

The horizon is `[0,10080)` minutes from Monday **2026-11-09T00:00:00Z** through Monday 2026-11-16T00:00:00Z. UTC is deliberately used: every day is 1440 minutes and there is no daylight-saving conversion. Negative minutes represent pre-week history. Intervals, availability and qualification validity are half-open. A drill must fit wholly inside personnel availability, resource availability and one ship operational window. End at a window/qualification boundary is accepted. Two exclusive allocations overlap only when `max(starts) < min(ends)`; adjacent resource intervals are allowed, but adjacent personnel duties fail the rest rule.

All fatigue values are invented assumptions requiring owner confirmation: at least **480 minutes** between every two distinct nonoverlapping duties for a person, at most **600 duty minutes per UTC day**, and at most **1200 duty minutes within this week**. Watches and training both count; overlapping allocations are errors, never merged to hide collisions. Duty intervals are split at UTC midnight for daily sums, including recorded pre-week history. Weekly sums clip to `[0,10080)`. Check the fixed history itself against policy. No unspecified watch or rest history is inferred. Qualification validity must cover the entire drill. There are no breaks, transit times, resource setup times or capacity greater than one in this fixture.

`WATCH-P1` is `[-600,-60)` (540 pre-week minutes), providing explicit rest history. `WATCH-P5` is `[0,60)` and contributes 60 displayed-week duty minutes. Lack of other history is a disclosed simplification, not evidence of operational fitness.

## Hand-derived weekly answer

The full oracle is in the `Full weekly deconfliction` scenario at `input.expected`. It is deliberately separate from the regular input record. That `expected` object is **answer data and must be stripped before invoking any future scheduler**. No solver or application was used to obtain it.

Initial DC-1 and ENG-1 both occupy Monday `[540,660)` with P1 and ROOM. There are exactly **two collision entries**: one person collision (P1) and one resource collision (ROOM), on the same request pair. P1's overlap is also an invalid fatigue relationship; it is not a third collision entry. All other proposed requests are pairwise clear.

| Request / output vocabulary | Revised start/end minutes | UTC calendar | Personnel | Resource |
| --- | --- | --- | --- | --- |
| DC-1 / Damage Control drills | 540 to 660 | Mon 09:00 to 11:00 | P1, P2 | ROOM |
| ENG-1 / engineering casualty controls | 1980 to 2100 | Tue 09:00 to 11:00 | P1, P3 | ROOM |
| WPN-1 / Weapons handling drill | 780 to 900 | Mon 13:00 to 15:00 | P4 | RANGE |
| CS-1 / Combat Systems exercises | 2220 to 2340 | Tue 13:00 to 15:00 | P5, P6 | ROOM |
| AIR-1 / flight quarters | 3420 to 3540 | Wed 09:00 to 11:00 | P2, P7 | DECK |
| DC-2 / Damage Control drills | 6300 to 6420 | Fri 09:00 to 11:00 | P1, P2 | ROOM |

DC-1 has only one allowed start. ENG-1 therefore counterproposes Tuesday at 1980, preserving both mandatory requests. Engineering owns the changed proposal; Weapons and Combat Systems retain their compatible proposals. Priorities are ENG, WPN, CS, DC, AIR; ties use drill ID, preferred start then ascending remaining starts, personnel IDs ascending. Backtracking may revisit Engineering after discovering Damage Control's forced slot. The stored negotiation entries describe the observable proposal/counterproposal semantics, not a required internal search trace.

All six revised intervals fit the operational windows. The only repeated-person weekday gaps are far above 480 minutes: P1 Mon end 660 to Tue start 1980 is 1320; P2 Mon end 660 to Wed start 3420 is 2760. P1 prior-watch end -60 to Monday start 540 is 600. ROOM on Tuesday is free from 2100 to 2220. No hard violation remains. The solution is a feasibility witness, not proof of an optimum.

P1 trains 3 × 120 = **360** minutes and P2 trains 3 × 120 = **360**. P3 through P7 each train **120**. P8 and P9 train **0**. Total personnel training is **1320 minutes**, across six two-hour drills (720 drill minutes). Weekly duty equals training except P5: 120 + 60 watch = **180**. Total displayed-week personnel duty is **1380**. P1's 540-minute watch lies wholly before this week. The oracle includes seven-element per-person daily training arrays, Monday first, for numeric heatmap checks; P5 Monday duty is 60 although Monday training is 0.

Occurrence deadlines are DC-1 720, ENG-1 2160, WPN-1 900, CS-1 2400, AIR-1 3600, DC-2 6600. Completion counts at drill end, never at start. All six are scheduled within deadline, with zero missed and zero historically overdue obligations in the base. Last-completion timestamps are contextual history; none fulfills an obligation released at 0. The DC history at -600 and deadline 720 explicitly span the week boundary. Never display “SFTRM compliant.”

## Scenario format and expectations

Each scenario has `name`, `kind` (`typical`, `edge`, `invalid`), `input` object and observable `expectedBehavior` string. Full fixture references use `recordId` or `baseRecordId`. Variant `changes` apply to a **fresh deep copy** of that record in array order: `path` is an absolute JSON pointer; default operation replaces its value, and `operation: remove` deletes it. These are data recipes, not commands or a required application patch API. Never apply changes cumulatively across scenarios. `actions` are fictional user workflow input, never authorization for a real approval. `rawText` is intentionally malformed content, never executed.

The 29 scenarios cover:

- Typical full negotiation with a complete independent oracle; a qualified alternate EOOW P9 on Tuesday (P1 loading drops to 240, P9 rises to 120); and revision-specific local demonstration review followed by a conflicting edit.
- Missing and expired qualifications, qualification valid exactly through end versus expiring one minute early, blocked availability, and a forced shared-room/person contradiction.
- Rest exactly 480 accepted versus 479 rejected; weekly duty exactly 360 accepted versus 359 limit rejected; daily history exactly 540 accepted versus a 539 limit rejected. Fixed-history violations are reported rather than hidden.
- A concrete deadline exactly 2340 accepted versus 2339 rejected. The late proposed allocation covers 5 of 6 current obligations; a solver must report infeasible rather than certify that proposal.
- An explicit old occurrence released at -1440 and due -1, plus future DC-NEXT released at 10080 and due 10800. Completion -600 fulfills the old occurrence; completion -2000 does not, yielding one historical overdue item. Both variants retain 6 current-week obligations. Future obligations remain visible as out-of-week, not as missed current obligations. Historical overdue cannot be repaired retroactively by scheduling this week; return feasible current allocations with a historical-overdue warning and require review rather than claiming all history satisfied.
- Provable infeasibility from no eligible EOOW or conflicting forced intervals, distinct from `search-exhausted` with `maxNodes: 0`. Here a node means an assignment attempt; zero is a deliberate valid budget for exhaustion, never an infeasibility proof. Restoring 10000 recovers the base witness.
- Malformed JSON, duplicate IDs, reversed intervals, unknown person/resource references and missing rest policy. Expected status is `invalid-input`, useful field-specific error, retention of prior valid board and recovery from corrected input or the unchanged fixture.
- Pending/local review, revision invalidation on edit, cancelled/confirmed reset and cancelled pending search. No local state represents real owner/operator approval. No partial result replaces the prior valid board.

Statuses and error wording here are observable fixture expectations; planning must define the final public protocol and browser assertions while retaining their meaning. Errors do not silently relax constraints. The local review scenarios describe expected state changes and do not seed a real approval identity or credential.

## Validation and limitations

Executed preparation checks passed for all three record schemas and references, all 29 scenario kinds, and the base witness arithmetic. Preparation checks parse the JSON, verify declared regular-record types, unique IDs/references, valid interval shapes, role coverage in the hand-derived allocation, interval containment, independent pairwise overlaps, duty arithmetic and occurrence deadlines. Those checks validate these data, not an application, toolkit or operational policy. The host separately validates and freezes this JSON and README before research. Downstream agents must reuse the exact validated examples and label their provenance; needed input can later be embedded in the required HTML without fetching local files. Do not embed answer objects as scheduling logic.

No qualification renewals, partial credits, real crew certification, real watch schedule, ship motion restrictions, multi-capacity resources, rolling fatigue windows, daylight-saving local calendar, external transport or authoritative SFTRM rules are modeled. All regular requests are mandatory; optional cancellation priorities remain unspecified. The single last-completion timestamp per requirement is intentionally limited history. Owner/domain review must supply real rules and authority before any operational use. No research, design, deployment or operational access was performed in this phase.
