# Primary deferrals

## UC11-1

Original wording: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Actual qualified crew availability, duty and training-completion records are unavailable and prohibited by the synthetic-only boundary. Withhold operational SFTRM assurance; demonstrate complete synthetic departmental negotiation, collisions, alternate allocations, fatigue and due occurrence coverage.

Demonstrated stand-in: the exact prepared synthetic PB4T JSON format, five departmental agents, all four named training types, initial two collision entries, ENG-1 at 1980, six due/scheduled occurrences, numeric daily heatmaps, deadline/history recovery and local review. See syntheticCoverage and literal post-interaction assertions in `synthetic-pb4t`. This entire criterion remains deferred and unverified; no synthetic test satisfies the operational obligation.

## DESC11-1

Original wording: Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations.

real-data: Actual crew availability and ship operations are unavailable and prohibited. Withhold coordination against real crew/operations; demonstrate all four named fictional training types against explicit synthetic availability and operating windows.

Demonstrated stand-in: the exact prepared synthetic PB4T JSON format, five departmental agents, all four named training types, initial two collision entries, ENG-1 at 1980, six due/scheduled occurrences, numeric daily heatmaps, deadline/history recovery and local review. See syntheticCoverage and literal post-interaction assertions in `synthetic-pb4t`. This entire criterion remains deferred and unverified; no synthetic test satisfies the operational obligation.

## SCOPE11-6

Original wording: The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Actual training-completion records are unavailable and prohibited. Withhold operational SFTRM compliance assurance; demonstrate synthetic collisions, alternate allocations and every supplied fictional due occurrence.

Demonstrated stand-in: the exact prepared synthetic PB4T JSON format, five departmental agents, all four named training types, initial two collision entries, ENG-1 at 1980, six due/scheduled occurrences, numeric daily heatmaps, deadline/history recovery and local review. See syntheticCoverage and literal post-interaction assertions in `synthetic-pb4t`. This entire criterion remains deferred and unverified; no synthetic test satisfies the operational obligation.

# Frozen acceptance-to-test matrix

This is planned evidence, not passed tests. All source wording and canonical provenance below are preserved from packet.json (captured 2026-11-04); aliases remain provenance, never duplicate criteria. There are no source evaluation criteria or separately confirmed user criteria. Proposed metrics are planner-defined under the approved synthetic scope. `pb4t-planning` is the required optimization capability; `pb4t-reference` uses full exact response equality, threshold 1, one deterministic trial, baseline 0 (unchanged conflicting proposals attain no full correct response). Every implemented mapping needs passing clean-runtime computation and applicable browser evidence. Every deferred row remains unverified even if stand-in tests pass.

## Canonical inventory

### UC11-1, deferred

Original: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: requirement:UC11-1 at `challenge.requirements[0]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Operational requirement remains unverified. Complete synthetic workflow: initial P1/ROOM DC-1 to ENG-1 collisions resolve by ENG-1 moving 540 to 1980; Engineering counterproposes and Weapons/Combat Systems retain; six of six explicit due occurrences satisfy all declared constraints, zero remaining hard violations. No SFTRM compliance assertion.

Planned evidence: syntheticCoverage: synthetic-pb4t (stand-in only). Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

Unverified dependency/action: real-data: Actual qualified crew availability, duty and training-completion records are unavailable and prohibited by the synthetic-only boundary. Withhold operational SFTRM assurance; demonstrate complete synthetic departmental negotiation, collisions, alternate allocations, fatigue and due occurrence coverage.

### SCH-01, implemented

Original: No personnel or shared-resource double booking.

Provenance: recipe:SCH-01 at `recipe.acceptance[0]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Every allocation pair has no shared-person/resource overlap; base starts are DC-1 540, ENG-1 1980, WPN-1 780, CS-1 2220, AIR-1 3420, DC-2 6300. Conflicting operator edit is rejected while last valid board remains.

Planned evidence: pb4t-planning / pb4t-reference; synthetic-pb4t, review-edit. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SCH-02, implemented

Original: Honor availability, qualifications, rest and duty budgets.

Provenance: recipe:SCH-02 at `recipe.acceptance[1]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Distinct valid role coverage, whole-interval availability and explicit watches/rest/daily/weekly duty are enforced. Rest 480 accepted/479 rejected; weekly 360 accepted/359 rejected; fixed-history daily 540 accepted/539 invalid; expiry at end accepted/one minute early infeasible.

Planned evidence: pb4t-planning / pb4t-reference; fatigue-recovery, new-input. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SCH-03, implemented

Original: Distinguish infeasible input from exhausted search.

Provenance: recipe:SCH-03 at `recipe.acceptance[2]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Known impossible qualified roster returns infeasible; known feasible input with maxNodes=0 returns search-exhausted; neither returns a partial board. Correcting inputs recovers feasible result.

Planned evidence: pb4t-planning / pb4t-reference; search-recovery. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SCH-04, implemented

Original: Preserve mandatory training periodicities.

Provenance: recipe:SCH-04 at `recipe.acceptance[3]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Expand supplied explicit obligation list into current/history/future IDs without inventing interval rules: base 6 due/6 completed/0 missed, both DC occurrences retained. Deadline 2340 accepted/2339 infeasible; old unmet occurrence reports historical overdue=1 and DC-NEXT remains future. Applies fictional rules only; real SFTRM unverified.

Planned evidence: pb4t-planning / pb4t-reference; history-future, deadline-recovery. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SCH-05, deferred

Original: Have an operator accept the proposed schedule.

Provenance: recipe:SCH-05 at `recipe.acceptance[4]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Actual operator acceptance remains unverified. Local revision 1 review has realApproval=false; conflicting edit creates revision 2 pending review, preserves valid board and requires save/discard before fresh local review.

Planned evidence: human PB4T acceptance of exact revision, not performed; review-edit proves local stand-in only. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

Unverified dependency/action: human-authority: An actual PB4T operator must accept the specific proposed schedule. No real operator approval is recorded; demonstrate revision-bound local review with realApproval false, retaining pending approval for owner review.

### DELIVERABLE11-1, implemented

Original: An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

Provenance: deliverable:DELIVERABLE11-1 at `challenge.expectedDeliverables.lines[0]`; description:SCOPE11-8 at `userScope.description[981:1143]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Interactive seven-day board, one-click bounded zero-collision optimization, computed departmental negotiation, editable/revalidated allocations and numeric heatmaps: P1/P2 360 training each; P3 to P7 120 each; P8/P9 zero; total training 1320, duty 1380. New custom JSON changes results; review/export/reload/reset/cancel work.

Planned evidence: pb4t-planning / pb4t-reference; synthetic-pb4t, new-input, review-edit, export-draft, cancel-reset. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### DESC11-1, deferred

Original: Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations.

Provenance: description:DESC11-1 at `challenge.description[0:238]`; description:SCOPE11-1 at `userScope.description[0:238]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Real crew/operations remain unverified. Synthetic Damage Control DC-1 540 to 660 and DC-2 6300 to 6420, engineering casualty ENG-1 1980 to 2100, Combat Systems CS-1 2220 to 2340 and flight quarters AIR-1 3420 to 3540 are coordinated with qualified crews and explicit operational windows.

Planned evidence: syntheticCoverage: synthetic-pb4t (stand-in only). Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

Unverified dependency/action: real-data: Actual crew availability and ship operations are unavailable and prohibited. Withhold coordination against real crew/operations; demonstrate all four named fictional training types against explicit synthetic availability and operating windows.

### DESC11-2, implemented

Original: Key personnel are frequently double-booked across simultaneous evolutions.

Provenance: description:DESC11-2 at `challenge.description[239:313]`; description:SCOPE11-2 at `userScope.description[239:313]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Initial simultaneous DC-1/ENG-1 P1 collision [540,660) is detected and eliminated; no remaining double booking is hidden by merging duty.

Planned evidence: pb4t-planning / pb4t-reference; synthetic-pb4t. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### DESC11-3, implemented

Original: This use case asks teams to build a constraint-satisfaction multi-agent scheduling system that automatically negotiates and deconflicts the shipboard weekly drill calendar.

Provenance: description:DESC11-3 at `challenge.description[314:486]`; description:SCOPE11-3 at `userScope.description[314:486]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Computed departmental agents submit owned preferences and receive shared-constraint counterproposals; base Engineering moves to Tuesday 1980 while Weapons and Combat Systems retain; complete weekly calendar is deconflicted automatically.

Planned evidence: pb4t-planning / pb4t-reference; synthetic-pb4t. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SUMMARY11-1, implemented

Original: Coordinate departmental training proposals against shared personnel, resources, operational windows and fatigue rules.

Provenance: summary:SUMMARY11-1 at `challenge.summary[0:118]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: All departmental proposals pass shared person/resource, ship-window, qualification and fictional fatigue constraints; late/conflicting/impossible changes cannot produce a valid complete board.

Planned evidence: pb4t-planning / pb4t-reference; synthetic-pb4t, fatigue-recovery. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SCOPE11-4, implemented

Original: Requirements

Provenance: description:SCOPE11-4 at `userScope.description[488:500]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Requirements heading is represented by the complete synthetic planning workflow and explicit operational limitations, with schema errors recoverable without losing the valid board.

Planned evidence: synthetic-pb4t, malformed-recovery. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SCOPE11-5, implemented

Original: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies.

Provenance: description:SCOPE11-5 at `userScope.description[501:791]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Engineering, Weapons, Combat Systems, Damage Control and Air have distinct computed proposal ownership; EOOW/FPL/TAO role matching, explicit operating windows and invented fatigue are enforced with no model overriding constraints.

Planned evidence: pb4t-planning / pb4t-reference; synthetic-pb4t, new-input. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SCOPE11-6, deferred

Original: The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: description:SCOPE11-6 at `userScope.description[792:957]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Operational SFTRM assurance remains unverified; synthetic collision results 2→0, alternate ENG-1 1980 to 2100, due 6/scheduled 6/missed 0; late CS deadline 2339 is infeasible; historical overdue is visible separately.

Planned evidence: syntheticCoverage: synthetic-pb4t (stand-in only). Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

Unverified dependency/action: real-data: Actual training-completion records are unavailable and prohibited. Withhold operational SFTRM compliance assurance; demonstrate synthetic collisions, alternate allocations and every supplied fictional due occurrence.

### SCOPE11-7, implemented

Original: Expected deliverables

Provenance: description:SCOPE11-7 at `userScope.description[959:980]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Expected deliverables heading is represented by the working weekly board, optimization and loading plus complete labeled local-review export; it adds no independent integration obligation.

Planned evidence: synthetic-pb4t, export-draft. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

### SCOPE11-9, implemented

Original: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11

Provenance: description:SCOPE11-9 at `userScope.description[1145:1214]`.

Input: exact prepared weekly-conflicts JSON and the applicable independent boundary/invalid variants below; no real data. Expected: Visible source attribution links exactly to https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11 and visible synthetic disclosure accompanies computed outputs. Packet captured 2026-11-04 remains source authority; no remote system access.

Planned evidence: synthetic-pb4t. Application tests: domain.test.mjs and, for state/transport, service.test.mjs; browser state is independently observed through applicable journeys.

## Prepared scenario inventory and independent expectations

Reuse every supplied scenario on a fresh deep copy, never apply modifications cumulatively. Scenario `input.expected` is answer data only and must be stripped from scheduler input. These independent fixture expectations are not inferred from candidate code. Each algorithm case belongs in domain.test.mjs; UI state cases belong in the named frozen browser journeys and service lifecycle tests where applicable.

| Prepared scenario | Independent expected outcome | Planned check |
| --- | --- | --- |
| Full weekly deconfliction | Identify exactly two collision entries for DC-1/ENG-1, move ENG-1 to 1980, produce the listed feasible allocation, six of six due occurrences, and the independently summed loads. Expected is an oracle, not scheduler input. | domain.test.mjs; pb4t-reference applicable wire cases |
| Alternate qualified EOOW | ENG-1 at 1980 may use P9 as EOOW and P3 as Engineering Operator; P9 has 120 training minutes and P1 drops to 240. P9 is unavailable at 540; do not assign there. Other allocations and six-of-six coverage remain as in the base oracle. | domain.test.mjs; pb4t-reference applicable wire cases |
| Expired sole EOOW proves infeasible | infeasible: ENG-1 has no eligible EOOW valid throughout either candidate. P8 validity ends at 0. This is a finite contradiction, not search exhaustion; preserve prior valid board. | domain.test.mjs; pb4t-reference applicable wire cases |
| Absent qualification | infeasible: mandatory ENG-1 has no eligible EOOW; P3 is only Engineering Operator. Do not silently drop ENG-1. | domain.test.mjs; pb4t-reference applicable wire cases |
| Blocked availability | infeasible: WPN-1 requires P4 for [780,900), which is outside P4 availability; exactly touching boundaries does not make this interval available. | domain.test.mjs; pb4t-reference applicable wire cases |
| Exclusive room contradiction | infeasible: DC-1 and ENG-1 are both forced to [540,660) and require exclusive ROOM and P1. No constraint may be relaxed. | domain.test.mjs; pb4t-reference applicable wire cases |
| Rest exactly threshold | feasible with base allocation: P1 rest before DC-1 is 540-60=480 minutes, exactly accepted. P1 Monday duty is 60+120=180; weekly duty is 420. | domain.test.mjs; pb4t-reference applicable wire cases |
| Rest below threshold | infeasible: only DC-1 start 540 leaves 479 minutes rest for P1, below 480. No replacement FPL is eligible. | domain.test.mjs; pb4t-reference applicable wire cases |
| Duty exactly limit | feasible with base allocation: P1 and P2 each have 360 weekly duty minutes, exactly accepted. Pre-week portion of WATCH-P1 is excluded from weekly total. | domain.test.mjs; pb4t-reference applicable wire cases |
| Duty above limit | infeasible: mandatory base assignments force P1 and P2 to 360 weekly minutes each, one above limit; no eligible replacements. | domain.test.mjs; pb4t-reference applicable wire cases |
| Daily duty exactly limit | feasible: pre-week WATCH-P1 contributes 540 minutes on the previous UTC day, exactly accepted; displayed-week duty days remain below this limit. | domain.test.mjs; pb4t-reference applicable wire cases |
| Daily duty above limit | invalid fixed-duty policy combination: immutable pre-week WATCH-P1 is 540 minutes in one UTC day, exceeding 539. Explain the fixed-history violation; do not return a valid board. | domain.test.mjs; pb4t-reference applicable wire cases |
| Deliberately exhausted search | search-exhausted: zero assignment attempts permitted; base is demonstrably feasible by the stored oracle. Do not claim infeasible or return a partial schedule as complete. Restore 10000 to recover. | domain.test.mjs; pb4t-reference applicable wire cases |
| Exact deadline accepted | feasible: CS-1 ends at 2340, before 2400; DC-1 ends 660 before 720. A separate assignment shifted to end exactly its obligation deadline must be accepted if all other constraints permit it. | domain.test.mjs; pb4t-reference applicable wire cases |
| Deadline exactly met concrete | feasible with base allocation; CS-1 ends exactly 2340 and counts toward coverage. Due 6, scheduled 6, missed 0. | domain.test.mjs; pb4t-reference applicable wire cases |
| One minute late obligation | infeasible: CS-1 only starts at 2220 and ends 2340, one minute after deadline 2339. Coverage of base proposed allocation is due 6, scheduled-within-deadline 5, missed 1; never claim complete. | domain.test.mjs; pb4t-reference applicable wire cases |
| Boundary and overdue obligations | DC last completion -600 satisfies DC-OLD ending at deadline -1, so historical overdue 0; DC-NEXT is outside week and not silently dropped from future obligations. Week due 6, scheduled 6. Cross-week obligation DC-1 uses history -600 and week deadline 720. | domain.test.mjs; pb4t-reference applicable wire cases |
| Explicit historical overdue | Report one historical overdue obligation DC-OLD, not repairable by a week assignment; week allocation still covers all 6 current obligations. No SFTRM compliance claim; require coordinator review of historical overdue. | domain.test.mjs; pb4t-reference applicable wire cases |
| Qualification expires at drill end | feasible: P5 TAO validity covers the entire half-open CS-1 interval [2220,2340), including validity ending at 2340. | domain.test.mjs; pb4t-reference applicable wire cases |
| Qualification expires during drill | infeasible: P5 TAO expires one minute before CS-1 ends; no alternate eligible TAO. | domain.test.mjs; pb4t-reference applicable wire cases |
| Duplicate drill ID | invalid-input: Duplicate drill ID DC-1. Preserve prior valid draft and entered text; correcting the field or reloading weekly-conflicts permits base feasible outcome. | domain.test.mjs; pb4t-reference applicable wire cases |
| Invalid time range | invalid-input: Operational window start must be less than end. Preserve prior valid draft and entered text; correcting the field or reloading weekly-conflicts permits base feasible outcome. | domain.test.mjs; pb4t-reference applicable wire cases |
| Dangling person reference | invalid-input: Unknown personnel ID P404. Preserve prior valid draft and entered text; correcting the field or reloading weekly-conflicts permits base feasible outcome. | domain.test.mjs; pb4t-reference applicable wire cases |
| Missing fatigue policy | invalid-input: Missing required policy minimumRestMinutes. Preserve prior valid draft and entered text; correcting the field or reloading weekly-conflicts permits base feasible outcome. | domain.test.mjs; pb4t-reference applicable wire cases |
| Unknown resource | invalid-input: Unknown resource ID ROOM404. Preserve prior valid draft and entered text; correcting the field or reloading weekly-conflicts permits base feasible outcome. | domain.test.mjs; pb4t-reference applicable wire cases |
| Malformed JSON and recovery | invalid-input: malformed JSON; preserve the prior valid board and entered text. Loading the unchanged weekly-conflicts record recovers the six-of-six feasible result. | malformed-recovery; service.test.mjs |
| Local review and edit revalidation | Successful revision 1 starts pending-review. Local demonstration review marks only revision 1 locally reviewed, realApproval false. Edit creates revision 2, resets to pending-review, reports P1 and ROOM overlap with DC-1 and rejects edited draft as valid; retain prior valid allocation. Re-negotiate restores feasible base allocation and still needs fresh local review. | review-edit; state tests |
| Reset cancelled and confirmed | Cancelled reset preserves edited draft. Confirmed reset restores exact weekly-conflicts fixture, pending-review and realApproval false; original DC-1/ENG-1 collisions are visible until negotiation. | cancel-reset; service.test.mjs lifecycle |
| Cancel pending search | cancelled: preserve last valid base allocation and its revision; no incomplete replacement or approval is produced. | cancel-reset; service.test.mjs lifecycle |

For “Alternate qualified EOOW”, validate the supplied P9 crew witness at 1980 (P9=120, P1=240); deterministic negotiate may choose P1 first under the declared ascending-ID candidate order. A separate alternate-only eligible roster proves automatic replacement selection. “Exact deadline accepted” has a duplicate base input; retain the separate concrete 2340 boundary case as independently meaningful evidence. For old/future classification use explicit deadline semantics from the public protocol and do not infer missing obligations from interval metadata.

## Additional held-out design and complete-object protocol checks

The public protocol states general rules only. Case-specific input/answer pairs live exclusively in evaluation-plan.json, which the host seals outside builder workspace. New ALPHA/BETA input is also submitted through the delivered JSON editor in `new-input` to prove no preset-only solver. Independent bounded objective reference: ALPHA has only 100; BETA's colliding 100 is rejected and its alternate 160 gives zero collisions with 30-minute rest. Nonnegative collision objective has lower bound 0. Changed slot 200 changes required allocation; rest 31 makes the original domain impossible; unknown resource is invalid. No global roster/minimum-move claim follows. Expected arrays are ASCII ordered; all complete envelopes are frozen, including null failure result/error and empty lists, and checked structurally with exact evaluator.

Application-only boundary additions: empty drills with no people/resources yields feasible zero totals; maxNodes=0 with nonempty drills yields search-exhausted, with empty drills feasible; counted-role distinct matching fails when one person holds two required roles but there are two slots; proposed invalid crew is inspect conflicts, not silently corrected. Availability/resources/qualifications ending exactly at end accepted. Two duties spanning UTC midnight split daily; negative pre-week watch contributes daily history but weekly totals clip. Pairwise collision count is per shared entity, not per pair. Duplicate IDs take precedence over recurrence mapping; reference errors precede cross-reference subset checks. Tests must compare complete output objects, not source strings or field presence.

## Browser coverage and literal results

- `synthetic-pb4t` (primary): Negotiate all named departmental drills and inspect numeric loading. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `new-input` (primary): Submit a new qualified roster and drill proposals through the interface. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `malformed-recovery` (recovery): Reject malformed input while retaining the valid board and draft text. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `search-recovery` (recovery): Distinguish impossible qualified staffing from exhausted search. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `fatigue-recovery` (recovery): Correct a fictional duty limit without relaxing it silently. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `history-future` (primary): Review explicit historical and future obligations without claiming compliance. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `deadline-recovery` (recovery): Reject one-minute-late completion and recover at the exact deadline. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `review-edit` (primary): Review a saved revision, reject a conflicting edit, and require fresh review. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `cancel-reset` (recovery): Cancel a staged computation and deliberately cancel or confirm reset. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.
- `export-draft` (primary): Export the complete synthetic draft for local review. Literal assertions and ordered interactions are in acceptance-plan.json; run in fresh 1440px and 390px contexts.

All primary deferred output names are source-quoted in syntheticCoverage. `synthetic-pb4t` independently asserts computed personnel/resource collisions 2→0, alternate ENG-1 1980 to 2100, six due/scheduled and SFTRM-unverified caveat, both Damage Control occurrences, Combat Systems, engineering casualty controls and flight quarters transformed allocations. A title/visibility assertion does not replace these values. `history-future` and `deadline-recovery` additionally test the complete temporal transformation, and `new-input` prevents preset overfitting. SyntheticCoverage remains stand-in evidence, not implementation of operational portions.

## Local export and destination state

`export-draft` asserts the entire UTF-8 base snapshot, not a substring fragment masquerading as complete evidence. It includes all top-level fields, all six allocations, every load/day array, complete coverage and negotiation, policy, objective and realApproval=false. Destination is one browser download `pb4t-draft.json`; saved state stays pending revision 1. No external delivery exists or is claimed. Application export tests parse complete snapshot and verify no unsaved edits leak; browser checks disabled action explanation with unresolved edits. Owner delivery approval is later and separate.

## Evidence and human review boundaries

Build/verify must run actual application tests, host core evaluator and all frozen journeys at both widths, plus fleet_browser/fleet_visual_review initial and fresh recheck at both widths in each assigned session. Captures must show actual current runtime and resolve any finding IDs after changed source; do not author visual-review.json. Host test-report/source hashing/browser traces are independent from development observations. Tests can demonstrate only declared synthetic behavior, not full usability/keyboard/a11y or operational validity; human reviewers assess fit, format fidelity and every original named output.

Operational review requires actual PB4T operator acceptance (SCH-05), authoritative fatigue/SFTRM values and occurrence mapping/history, real roster/availability/ship windows within an authorized data boundary, representative data evaluation, production identity/persistence/security and any real deployment/integration. None are supplied or authorized by this synthetic plan. No expert absence is recast as approval authority. Primary deferrals must be repeated first in verification/user guide/review summary, and requirementsMet remains false while they are outstanding.

Monitor budget/status, collision/constraint counts, due/current/history/future coverage, load totals and pending review. Escalate invalid history, impossible demands, overdue history, rule-change requests and exhaustion; do not relax constraints. Abort/shutdown terminates compute worker, discards stale result and preserves committed state. Bound solver/request size and report missing storage/transport explicitly. No external messages, transmissions or operational changes. Known scale and data-history limits plus unverified foundation licensing remain visible for owner review. Tests/toolkit fixtures are never operator approval or operational validation.

Planning consistency review: canonical coverage, journey limits, public-protocol field bounds, reference-envelope arithmetic/ordering, complete runtime foundation manifest and preserved fixture hashes were checked. These are planning checks, not application verification. The arbitrary-input browser example is distinct from sealed novel evaluation inputs; sealed case-specific answers are not implementation instructions.

## Named synthetic output assertions (planning correction)

The primary `synthetic-pb4t` journey now asserts the exact source output phrases after Optimize schedule, alongside independently fixed transformed values. Builder must render these narrow summary elements from the shared backend result, in addition to the existing detailed board, collision, negotiation and coverage outputs:

- `#personnel-collisions`: personnel collisions: P1 shared by DC-1 and ENG-1 at 540 to 660; 1 initial personnel collision; 0 remaining.
- `#alternate-allocations`: alternate schedule allocations: ENG-1 moves from 540 to 660 to 1980 to 2100 with P1/P3 in ROOM; all 6 mandatory drills retained.
- `#periodicity-output`: SFTRM-mandated training periodicities: operational compliance unverified. Synthetic explicit obligations: 6 due; 6 scheduled within deadline; 0 missed; 0 historically overdue.

These summaries cover UC11-1 and SCOPE11-6 syntheticCoverage; the existing allocation assertions contain all four DESC11-1 named output phrases and their fixed allocations. All three primary criteria remain deferred with empty journeyIds. These literal assertions demonstrate the labeled stand-in only and do not establish operational SFTRM assurance.

Visual review remains required during build and verification, using the actual running application and assigned fleet_browser/fleet_visual_review tools. This planning-only correction does not produce runtime source or captures, and no visual check is claimed.
