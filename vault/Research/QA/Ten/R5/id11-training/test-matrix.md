# Primary deferrals

UC11-1 and SCOPE11-6: actual SFTRM rules/history absent; no actual compliance claim. DESC11-1: actual crew/operations absent; no real validation. Full original wording/dependencies/stand-ins are recorded first in plan.md and below. SCH-04 real-data and SCH-05 human-authority remain recipe-only unverified. Passing prototype gates does not mean requirementsMet.

# Full criterion inventory

All results are **planned, not executed**. Canonical criteria occur exactly once below; aliases remain provenance. Acceptance contracts hold literal assertions. Host evidence will be test-report.json, core-report and browser screenshots/traces; Node tests will be named domain.test.mjs and workflow.test.mjs (not runtime imports).

## UC11-1

Original: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: `[{"kind": "requirement", "id": "UC11-1", "path": "challenge.requirements[0]"}]`

Disposition: deferred. Expected complete outcome: Actual SFTRM compliance remains unverified. Synthetic Engineering, Weapons, Combat Systems, Damage Control and Flight Operations agents negotiate proposals using qualified role alternatives; baseline has P1/P2/SIM collisions, alternate allocations D2/D4/D5 at 10:00, and all 7 fictional due occurrences covered; shifted operations reassigns D2 to P3 at 08:00 and moves D3 to 10:00.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs none (deferred or UI-only), journeys none on criterion (deferred). Mandatory synthetic coverage journeys: synthetic-week and shifted-negotiation; source-quoted outputs: personnel collisions, alternate schedule allocations, SFTRM-mandated training periodicities. Unverified boundary: real-data: Applicable actual SFTRM rules, policy revisions and actual completion history are absent within the synthetic-only boundary. Withhold actual SFTRM compliance; demonstrate all named agents, constraints, collisions, alternate allocations and complete fictional recurrence. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCH-01

Original: No personnel or shared-resource double booking.

Provenance: `[{"kind": "recipe", "id": "SCH-01", "path": "recipe.acceptance[0]"}]`

Disposition: implemented. Expected complete outcome: Every feasible full allocation has zero personnel overlaps and aggregate resource usage within capacity, independently checked across all interval endpoints; baseline resolves exactly three original collisions.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs qualified-allocation, journeys synthetic-week. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCH-02

Original: Honor availability, qualifications, rest and duty budgets.

Provenance: `[{"kind": "recipe", "id": "SCH-02", "path": "recipe.acceptance[1]"}]`

Disposition: implemented. Expected complete outcome: Whole execution availability, dated qualifications, distinct role headcounts, fixed-duty/prior-week rest, daily and horizon union budgets enforced. Exact limits pass and below-limit/rest or expired/unavailable candidates cannot be silently relaxed.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs qualified-allocation, journeys invalid-recovery. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCH-03

Original: Distinguish infeasible input from exhausted search.

Provenance: `[{"kind": "recipe", "id": "SCH-03", "path": "recipe.acceptance[2]"}]`

Disposition: implemented. Expected complete outcome: Malformed input is invalid_input; complete no-solution enumeration is infeasible; zero-budget valid nonempty package is exhausted with zero attempts. UI preserves prior draft and allows successful correction.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs qualified-allocation, journeys search-recovery. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCH-04

Original: Preserve mandatory training periodicities.

Provenance: `[{"kind": "recipe", "id": "SCH-04", "path": "recipe.acceptance[3]"}]`

Disposition: deferred. Expected complete outcome: Actual mandatory periodicity compliance is unverified. Synthetic register expands exactly 7 occurrences including 3 DC deadlines, reports next outside-horizon dates and exposes impossible D7 deadline without omission.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs none (deferred or UI-only), journeys none on criterion (deferred). Unverified boundary: real-data: Actual applicable mandatory training register and history are absent. Withhold actual periodicity compliance; demonstrate complete fictional recurrence and impossible-deadline recovery. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCH-05

Original: Have an operator accept the proposed schedule.

Provenance: `[{"kind": "recipe", "id": "SCH-05", "path": "recipe.acceptance[4]"}]`

Disposition: deferred. Expected complete outcome: Actual operator acceptance remains unverified. Simulated local review records only the saved revision, edits clear review, unsaved content must be saved/discarded, and cancelled generation cannot overwrite the prior valid schedule.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs none (deferred or UI-only), journeys none on criterion (deferred). Unverified boundary: human-authority: Designated PB4T operator must personally accept the schedule. Withhold real acceptance/publication; demonstrate explicit simulated local review, revision invalidation and cancellation. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## DELIVERABLE11-1

Original: An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

Provenance: `[{"kind": "deliverable", "id": "DELIVERABLE11-1", "path": "challenge.expectedDeliverables.lines[0]"}, {"kind": "description", "id": "SCOPE11-8", "path": "userScope.description[981:1143]"}]`

Disposition: implemented. Expected complete outcome: Interactive seven-day board supports edits, computed departmental conflict resolution, one-click Optimize schedule (bounded feasibility), numeric personnel/day heatmap and labeled export. Baseline all seven allocations match fixed fixture; total 540 person-minutes, P2 240. Shifted operations yields P1 60 and P3 120.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs pb4t-audit, journeys synthetic-week, shifted-negotiation, review-cancel, deadline-recovery. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## DESC11-1

Original: Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations.

Provenance: `[{"kind": "description", "id": "DESC11-1", "path": "challenge.description[0:238]"}, {"kind": "description", "id": "SCOPE11-1", "path": "userScope.description[0:238]"}]`

Disposition: deferred. Expected complete outcome: Real crew/operations validation remains unverified. Synthetic departmental training requirements produce engineering D1 Mon08, Combat Systems D2 Mon10, Damage Control D4 Mon10/Thu08/Sun08 and flight quarters D5 Mon10; every assigned role and operation window passes declared fictional constraints.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs none (deferred or UI-only), journeys none on criterion (deferred). Mandatory synthetic coverage journeys: synthetic-week and shifted-negotiation; source-quoted outputs: departmental training requirements. Unverified boundary: real-data: Actual crew availability and ship operations are unavailable and outside the synthetic-only boundary. Withhold validation against real crew and operations; demonstrate all four named drill families against fictional roster and operations. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## DESC11-2

Original: Key personnel are frequently double-booked across simultaneous evolutions.

Provenance: `[{"kind": "description", "id": "DESC11-2", "path": "challenge.description[239:313]"}, {"kind": "description", "id": "SCOPE11-2", "path": "userScope.description[239:313]"}]`

Disposition: implemented. Expected complete outcome: Original P1 collision D1/D2 and P2 collision D1/D4 are explicitly shown, and resulting schedule has zero simultaneous personnel bookings.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs qualified-allocation, journeys synthetic-week. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## DESC11-3

Original: This use case asks teams to build a constraint-satisfaction multi-agent scheduling system that automatically negotiates and deconflicts the shipboard weekly drill calendar.

Provenance: `[{"kind": "description", "id": "DESC11-3", "path": "challenge.description[314:486]"}, {"kind": "description", "id": "SCOPE11-3", "path": "userScope.description[314:486]"}]`

Disposition: implemented. Expected complete outcome: Five deterministic departmental software agents contribute owned candidate proposals, computed objections, alternate allocations and accepted counterproposals through shared constraints; changed operations causes genuine CS/Weapons negotiation and a changed weekly calendar.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs qualified-allocation, pb4t-audit, journeys synthetic-week, shifted-negotiation. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SUMMARY11-1

Original: Coordinate departmental training proposals against shared personnel, resources, operational windows and fatigue rules.

Provenance: `[{"kind": "summary", "id": "SUMMARY11-1", "path": "challenge.summary[0:118]"}]`

Disposition: implemented. Expected complete outcome: Department proposals respect personnel, resource capacity/availability, ship restrictions and supplied fictional fatigue rules; baseline resolves P1/P2/SIM and OP1 conflicts without policy relaxation.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs qualified-allocation, pb4t-audit, journeys synthetic-week. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCOPE11-4

Original: Requirements

Provenance: `[{"kind": "description", "id": "SCOPE11-4", "path": "userScope.description[488:500]"}]`

Disposition: implemented. Expected complete outcome: Requirements heading retained in secondary source/context panel; complete functional scope maps to the canonical requirements and their provenance, with synthetic and operational boundaries visible.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs none (deferred or UI-only), journeys synthetic-week. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCOPE11-5

Original: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies.

Provenance: `[{"kind": "description", "id": "SCOPE11-5", "path": "userScope.description[501:791]"}]`

Disposition: implemented. Expected complete outcome: Engineering, Weapons, Combat Systems and supporting agents generate role/time alternatives and exchange constraint objections against ship windows, Fire Party Leader, EOOW, TAO, and supplied synthetic fatigue rules. Shifted operation moves Weapons to 10 and CS to P3 at 08.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs qualified-allocation, pb4t-audit, journeys synthetic-week, shifted-negotiation. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCOPE11-6

Original: The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: `[{"kind": "description", "id": "SCOPE11-6", "path": "userScope.description[792:957]"}]`

Disposition: deferred. Expected complete outcome: Actual SFTRM compliance remains unverified. Synthetic collision lists, alternate allocations and 7/7 fictional periodicities are shown; an impossible D7 finish is infeasible and visible, not omitted.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs none (deferred or UI-only), journeys none on criterion (deferred). Mandatory synthetic coverage journeys: synthetic-week and shifted-negotiation; source-quoted outputs: personnel collisions, alternate schedule allocations, SFTRM-mandated training periodicities. Unverified boundary: real-data: Applicable actual SFTRM register and completion history are absent. Withhold actual mandated-periodicity certification; demonstrate collisions, alternate allocations and all seven fictional due occurrences. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCOPE11-7

Original: Expected deliverables

Provenance: `[{"kind": "description", "id": "SCOPE11-7", "path": "userScope.description[959:980]"}]`

Disposition: implemented. Expected complete outcome: Expected deliverables heading retained in secondary source/context panel alongside the interactive weekly schedule board, computed conflict resolution, optimization action and heatmap.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs none (deferred or UI-only), journeys synthetic-week. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

## SCOPE11-9

Original: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11

Provenance: `[{"kind": "description", "id": "SCOPE11-9", "path": "userScope.description[1145:1214]"}]`

Disposition: implemented. Expected complete outcome: Display exact source attribution: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11; supplied captured packet is source authority, with no claim of live access.

Input: exact baseline-week/shifted-operations/tiny-impossible solverInput and applicable mutations in data/synthetic-data.json. Evidence: capability IDs none (deferred or UI-only), journeys synthetic-week. Result: not run. Future evidence: host test-report.json criterion record and journey traces, host core report for mapped evaluations, domain.test.mjs/workflow.test.mjs results; human review separately for operational boundaries.

# Domain invariant and boundary test matrix

Tests call actual compute.mjs/agent/policy functions shared by UI and service. The independent pairwise checker must be written from interval arithmetic and supplied policy, not call solver's own validity helper as its only assertion. Test complete public response objects, not just a status subset. Baseline comparator is original proposals (three collisions/one operation violation), not a global optimum. Computational exact score threshold=1, all cases, one deterministic trial; zero-output or always-feasible baseline score declared0. The baseline is a reference design, not a measured application result. Feasible board target: zero final hard violations and all7 due occurrences. Metrics and independent input/answer pairs are sealed by host in evaluation-plan.json; never reconstruct that file in build.

| Test family | Independent outcome | Planned evidence |
|---|---|---|
| Baseline allocation + report | Fixed seven allocations;3 original collisions; OP1;540 person-minutes; P1=120/P2=240/P3=P4=P5=60/P6=0;7 due; DC9/12/15 at12 | allocation-reference + audit-reference; domain.test.mjs; synthetic-week |
| Shifted operations | OP2 forces D3 Mon10; CS counteroffers P3 Mon08; P1=60/P3=120; all unchanged rows retain values | Both core evaluations; shifted-negotiation; causal agent tests |
| Independent final validation | Every person interval pair, all resource capacity endpoints, every role count/validity, all availability/operation windows, all-pair rest and union duty constraints pass | domain.test.mjs invariant checker |
| Recurrence expansion |7 occurrences, all3 DC; next16 Nov for weekly and18 for DC; deadline equality allowed; missing mandatory request remains explicit; optional missing not mandatory | audit-reference; domain.test.mjs |
| Resource capacity >1 | Aggregate3 concurrent unit demands exceed2 even though each pair fits; alternate valid schedule or infeasible, never false success | domain.test.mjs independent sweep |
| Role cardinality | count2 requires2 distinct qualified candidates; same person in two roles rejected | domain.test.mjs |
| Midnight/fixed duty | Split union at fixed-offset midnight; clip to horizon; prior duty enforces rest but does not add horizon load | domain.test.mjs hand arithmetic |
| Budget exhaustion | zero attempts on nonempty valid input; no infeasibility claim; invalid input still wins at budget0; complete tiny enumeration proves infeasible | allocation-reference; search-recovery |
| Policy and malformed input | missing numeric policy, negative duration, reversed interval, bad timestamp, unknown ref, duplicate ID, unsupported metadata, bad action/null all exact INVALID_PACKAGE | allocation-reference + additional Node complete envelopes |
| Persist/review/cancel | saved/unsaved states distinct; edit invalidates simulated review; deliberate save/discard; reload preserves; cancellation token prevents late overwrite | workflow.test.mjs + review-cancel |
| Invalid import/storage/service failure | preserve current content; show specific recovery, no canned fallback; export possible after storage error | workflow.test.mjs and phase browser inspection |

## All preserved fixture scenarios

Apply each patch sequence to a fresh exact record solverInput. Test expectedBehavior literally and add specified secondary runs; tests may read embedded input samples, never rely on ambient workspace fixture files in clean runtime. No source fixture modifications. Every row is planned, not run; future location domain.test.mjs unless interaction row maps workflow.test.mjs and browser journeys.

- **Complete weekly negotiation** (typical): feasible; exactly records[0].expected allocations, 3 baseline collisions, 1 operational violation, zero final hard violations, 7/7 occurrences covered, 540 training person-minutes.

- **Shifted operations with interdepartmental counterproposal** (typical): feasible; D2 P3 at Monday08, D3 P3 at Monday10; P1 load60 and P3 load120; other allocations unchanged; 7/7 covered. Compare records[1].expected.

- **Expired sole Fire Party Leader** (edge): infeasible, not invalid_input: P6 exists but FPL expired exactly at horizon start; D4 occurrence unmet. No policy relaxation.

- **Unavailable sole TAO** (edge): infeasible: P1 unavailable for D1 and D2. Empty availability means no availability, never unrestricted.

- **Prior-week rest exactly60** (edge): feasible: prior P1 duty ends Sunday23; D1 Monday00 has exactly60 minutes rest. D2 can remain Monday08; D4 Monday08; D5 Monday10. P1 prior duty does not add to horizon load.

- **Prior-week rest just below limit** (edge): infeasible: 0 rest minutes before sole D1 start is less than60; no alternative. One grid step beyond boundary.

- **Daily budget exactly120** (edge): feasible with baseline allocations; P1 and P2 Monday duty each120 equals limit.

- **Daily budget one minute below demand** (edge): infeasible: P1 must perform two Monday60-minute occurrences;120 exceeds119 regardless of ordering.

- **Horizon budget exactly240 and below** (edge): feasible: P2 total240 equals limit. In a second independent run replace limit with239: infeasible because mandatory P2 demand240. Do not relax budget.

- **Impossible recurrence deadline** (edge): infeasible: enumerate all7 due occurrences; R-DC@2026-11-15T12:00:00-05:00 cannot finish by12:00 (ends13:00). Other6 have feasible witness. Never omit D7.

- **Proven tiny infeasibility** (edge): infeasible after complete enumeration of one joint candidate combination; both requests cannot coexist. Return no purported valid full schedule.

- **Zero-budget exhaustion** (edge): exhausted with zero attempted candidate assignments; no infeasibility claim. Budget counts candidate assignment attempts, checked before each attempt; zero prevents the first. Preserve last valid draft. Planning must explicitly retain or reconcile this fixture convention.

- **Missing required policy** (invalid): invalid_input naming policy.minRestMinutes; preserve draft; restoring60 recovers the baseline result.

- **Unknown qualification reference** (invalid): invalid_input with unknown qualification reference; restore EOOW then recover baseline. An existing qualification absent from a roster is infeasible instead.

- **Malformed duration then correction** (invalid): invalid_input naming D1 duration; preserve draft; replace with60 and recover baseline feasible allocations.

- **Malformed interval then correction** (invalid): invalid_input because end precedes start; restore Monday11 and recover baseline.

- **Unknown person reference** (invalid): invalid_input naming unknown person; restore P1 and recover baseline.

- **Missing qualification on existing person** (edge): infeasible: existing P1 lacks EOOW for D1; TAO still valid for D2. Do not classify well-formed roster as malformed input.

- **Qualification expires at drill finish** (edge): feasible: EOOW valid over half-open D1 interval08-09. Expiry08 instead makes D1 infeasible.

- **Simulated review invalidation and cancellation** (edge): Load baseline feasible draft revision1; simulate local review -> reviewedRevision1. Edit D5 preferredStart to10 -> revision2 unreviewed. Begin generation then cancel -> cancelled; previous valid allocations retained, stale results discarded, no publication or real approval.

## Failure, authority and evidence limits

Invalid packages preserve last saved input/result. Failed or exhausted generation retains previous valid board with a stale revision banner and current unmet state; it cannot count old allocations as current coverage. Cancel terminates/discards current result safely. No real publication, calendar writes, messaging, crew ingestion or policy relaxation. Local monitoring exposes status/attempt count/policy version and unmet constraints; coordinator handles escalation. Actual fatigue policies, SFTRM rules/history, real availability and true operator acceptance need authorized review/data outside this synthetic prototype. Owner must approve before delivery/deployment.

Mandatory later checks: host clean-runtime invocation, actual application Node tests, frozen primary/recovery browser journeys at both widths, session-specific initial/recheck visual review at both widths with capture IDs and resolved findings, and human prototype review. These are separate evidence classes. No planning pass, toolkit self-test or source-string check substitutes for them. No tests, browser outcomes or operational validation are claimed here.

## Named synthetic output assertion completion

The primary synthetic-week journey additionally asserts #personnel-collisions-result, #alternate-allocations-result and #departmental-requirements-result after generation. Each literal includes the source-quoted output name plus its independently fixed baseline result: P1 D1/D2 and P2 D1/D4 become zero final personnel collisions; D2/D4/D5 move to Mon10 with the specified people; all four source-named training families appear with their exact allocated dates/times. #coverage-summary already asserts the source-quoted SFTRM-mandated training periodicities with 7 of 7 fictional due occurrences and actual compliance unverified. These are required result summaries, not titles or input echoes; implement their stable selectors alongside the more detailed existing allocation and negotiation assertions.

Visual review remains a required build/verification-phase gate, not a planning observation. No application runtime has been implemented in this phase and no rendered captures or visual verdicts are claimed.
