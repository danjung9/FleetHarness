# Primary deferrals

The following source obligations remain deferred for operational claims. All their computational and interactive behaviors must still be demonstrated end to end with synthetic data. A deferred disposition must not be changed merely because the demonstration passes. Full original wording and provenance appear in the inventory below.

| Canonical ID | Concrete dependency and withheld action | Synthetic workflow still required |
|---|---|---|
| UC11-1 | real-data: Applicable SFTRM rule register, effective policy versions and actual completion history are absent and outside the synthetic-only boundary. Withhold any assertion that all actual SFTRM-mandated periodicities are satisfied. | Engineering, Weapons, Combat Systems and supporting departmental agents negotiate qualified assignments and alternative times, detect collisions, enforce fictional fatigue rules and expand/check every fictional periodicity. |
| DESC11-1 | real-data: Actual crew availability and ship operations are absent and may not be imported. Withhold validation of a calendar against real crew or operations. | Coordinate Damage Control drills, Combat Systems exercises, engineering casualty controls and flight quarters against fictional crew availability and operational windows. |
| SCOPE11-6 | real-data: Applicable SFTRM rules and actual training history are unavailable within this synthetic-only brief. Withhold actual SFTRM compliance certification. | Identify collisions, propose alternative allocations and display coverage/deadlines for a complete fictional periodicity register. |

Recipe-only deferrals: SCH-04 remains deferred for actual mandatory periodicity compliance (real-data: applicable rule register and completion history absent; withhold operational compliance, demonstrate complete synthetic recurrence expansion and deadline checking). SCH-05 remains deferred until a person actually accepts the proposed schedule (human-authority: designated PB4T operator must review and accept; withhold real acceptance/publication, demonstrate a clearly labeled local simulated review). Lack of a specification or expert is not the reason for any deferral. Every behavior must have explicit synthetic assumptions instead.

Intake coverage obligations for planning: retain deferred criteria with empty criterion `journeyIds`; each primary deferral also needs `syntheticCoverage` whose journey references point to primary synthetic journeys. No planning contracts or browser selectors are being frozen here.

| Deferred source | Explicit assumptions | Source-quoted output names to cover | Required primary interaction and result assertions |
|---|---|---|---|
| UC11-1 | Fictional JSON inputs, qualifications, agents, grammar, fatigue limits, recurrence and history; no real-format validation. | “alternate schedule allocations”; “SFTRM-mandated training periodicities” | After one-click proposal generation, assert the independent fixture's literal revised allocations and occurrence/deadline coverage totals, visibly labeled synthetic. The output must also show departmental proposals/counterproposals and personnel collisions. |
| DESC11-1 | Fictional roster, operations and drill requests; no real crew validation. | “departmental training requirements” | After negotiation, assert literal resulting times for all four named drill families against the independently fixed expected fixture, with availability/operations checks. |
| SCOPE11-6 | Fictional policy and history; no actual SFTRM validation. | “personnel collisions”; “alternate schedule allocations”; “SFTRM-mandated training periodicities” | After generation and after an infeasible change, assert exact independently fixed collision results, alternate assignments and recurrence coverage or explicit unmet deadlines. |

Planning must cover every named behavior/output, not just one assertion per row. Output source/name pairs must be unique, names must remain literal source phrases, and literal result assertions must follow interaction. Structural validation does not establish format fidelity, correct values or complete workflow; independent review must assess those against the source and answer key.

## Audience, primary task and observable outcome

The audience is a PB4T coordinator and departmental training representatives. The smallest complete prototype lets them load a synthetic weekly drill package, inspect competing departmental proposals, run one-click automated deconfliction, inspect negotiated alternatives and personnel loading, revise a proposal, regenerate and review a draft calendar. The board must show unresolved requests and policy failures, never silently omit mandatory occurrences.

Success means a deterministic proposed weekly schedule satisfies every declared synthetic hard constraint, covers every due synthetic occurrence, explains moved/rejected requests through departmental negotiation, and displays an accurately calculated personnel loading heatmap. If no valid schedule is established, distinguish invalid input, proven infeasibility and search exhaustion; retain the draft and provide useful recovery. “Optimization” means finding a feasible deconflicted proposal, not a globally optimal roster. Report any comparative movement/load metric honestly without claiming optimality.

## Source and requested scope

The authoritative supplied interpretation is `.fleet/packet.json`, challenge 11, captured 2026-11-04 from https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11. `requirements.md` and the packet's `userScope.description` request the full PB4T workflow, not a narrower builder slice. `userScope.criteria` and data inputs are empty. The source supplies no evaluation criteria. Measures below are analyst-proposed, not owner-confirmed or event-published evaluation rules.

Constraint-based planning is an engineering recipe recommendation. It recommends deterministic feasibility calculation; interpretation may be assisted only if results can be checked. Separate departmental agents must contribute proposals, objections and counterproposals against shared constraints; a single solver with decorative agent labels or a manual calendar alone is insufficient. Agents may be deterministic software modules; autonomous external services or language-model calls are not necessary.

Read intake guidance, quality contract and foundation guidance. `fleet_helpers` discovery returned no reusable project helpers. No helper is needed to write this scope. The listed Node service 1.0.0 with scheduling pack is a later-phase reuse candidate; planning must evaluate it and the recipe's OR-Tools CP-SAT candidate. The host chooses/materializes the approved foundation after planning. Its backend must be extended rather than duplicated, and toolkit examples/calculations are not verification of the resulting application.

## Inputs, provenance and data handoff

`inputs/manifest.json` is version 1, mode `synthetic`, with `sources: []`. No supplied data files or field mappings exist. It names future `data/synthetic-data.json` and `data/README.md`. This intake does not generate them: the host must run the dedicated synthetic data agent next, before research. Preserve `requirements.md`, `inputs/`, and later validated fixture files unchanged. No operational records, live systems, personnel details or external integrations are authorized.

The source names no exchange grammar. Use an explicitly invented, use-case-specific UTF-8 JSON weekly PB4T package, not generic EVENT/TASK text. Document it as synthetic, not an official Navy/SFTRM format. The dedicated data agent should provide the following entities and relationships, concrete labeled examples and independent expected outputs in the two named artifacts:

| Entity | Required fields and relationships |
|---|---|
| Package metadata | Schema/version, synthetic provenance, fictional ship/week, fixed timezone, time resolution, policy version and explanatory assumptions. |
| Departments/agents | Stable department IDs and Engineering Agent, Weapons Agent, Combat Systems Agent, Damage Control and flight-operations responsibilities. Each owns identified proposals and allowed alternatives. |
| Qualified roster | Fictional person IDs/names, department, qualification IDs including Fire Party Leader, EOOW and TAO, validity intervals, availability intervals, prior duty/training history and fixed duties. No real identities. |
| Shared resources | Resource IDs, capacity and availability; requests reference named spaces/equipment so resource collisions are tested independently of person collisions. |
| Ship operational windows | Time intervals and allowed/prohibited drill families or resources, including a window that forces a proposed drill to move. |
| Drill proposals | ID, owner department, drill family, duration, preferred start, allowed start windows, required role counts/qualifications, candidate personnel, resource demand, priority and links to training requirement/occurrence. Include all four named families. |
| Fictional policy register | Explicit units and values for rest, duty budgets, counting windows, recurrence intervals, due boundaries, history treatment and horizon carry-over. Label every value invented; do not call it an actual SFTRM rule. |
| Negotiation evidence | Department proposal, conflicting constraint, counterproposal, response and final disposition tied to request/occurrence IDs. Expected reasoning must correspond to actual changes, not canned dialogue. |
| Independent expected outcomes | Baseline collisions, valid allocations or allowed solution sets, per-person load totals, due occurrence/deadline list, unscheduled reasons and scenario statuses. Keep answer keys distinct from solver input and never have the application read expected results to compute outputs. |

Use stable references with uniqueness and referential-integrity checks. Specify half-open time intervals so touching endpoints do not overlap, exact timezone/offset handling, horizon boundaries, resource capacity accounting, role headcounts and whether one person can fill more than one role in the same evolution. Specify whether rest applies between all duties or only selected duty classes. Document each as a synthetic assumption. Model prior-week duty and completion history so week-boundary fatigue and recurrence are actually testable. Missing/expired qualification, unavailable people and absent mandatory policy values must produce explicit validation or infeasibility results, not permissive defaults.

Required fixture scenarios, fixed before implementation:

1. A small hand-verifiable feasible week with Engineering, Weapons and Combat Systems agents negotiating proposals, all four named drill families, a shared Fire Party Leader/EOOW/TAO collision and a separate shared-resource collision. Supply exact baseline collisions and a complete independently verified valid outcome; use fixed tie-breaking or enumerate valid outcomes rather than assuming a unique solution.
2. A shifted operational window forcing a counterproposal, with exact expected revised times and loading differences.
3. Qualification absence/expiry and unavailable personnel; distinguish malformed references from a well-formed but unsatisfiable roster.
4. Rest and duty-budget values exactly at the invented limit and just beyond it, including prior-week fixed duty.
5. Multiple required recurrence occurrences, a completion before the horizon, a due boundary within the week and an impossible deadline. Expected outputs must enumerate every occurrence and unmet deadline.
6. Proven infeasibility in a tiny fully enumerable case versus a deliberately exhausted search budget. Exhaustion must never be called proof of infeasibility; define reproducible budget behavior in planning.
7. Invalid duration, reference or time window, followed by a corrected package; expected recovery preserves the draft and yields a valid proposal.
8. An edited accepted/simulated-reviewed draft becomes unreviewed again; cancellation stops generation and leaves the last valid draft intact. Simulated approval cannot authorize publication.

The data agent must validate syntax, IDs, interval consistency and independently verify expected arithmetic and small-case feasibility, documenting its method. Fixtures are not validated until that work is complete. Later planning, application samples and tests must reuse those exact validated scenarios. Embed needed fixture inputs into the self-contained `index.html` as requested, avoiding local-file fetches; computation must still use the shared evaluated backend. Do not duplicate computation in the browser or embed answer keys as application logic.

## Outputs and central computational capabilities

The requested outputs are an interactive weekly schedule board, automated conflict resolution across departments, one-click schedule optimization and personnel loading heatmaps. Supporting outputs needed to make these reviewable are baseline collision lists, departmental negotiation/counterproposal trace, alternate schedule allocations, qualification/availability/resource/fatigue checks, occurrence/deadline coverage and explicit unresolved reasons. A locally exportable draft should include the synthetic label, policy version, status and allocations; it is not an operational publication.

Core computations are occurrence expansion from fictional periodicities/history; qualified candidate generation; interval/resource collision detection; rest and duty accounting; deterministic bounded scheduling with departmental negotiation; independent schedule validation; and loading aggregation. Evidence of usefulness requires actual computed results on changed inputs, exhaustive checks on small cases, exact independent load/deadline totals, and clear infeasible versus exhausted statuses. All hard constraints remain hard. Any proposed policy change is an unapproved request requiring explicit owner action outside the solver, never automatic relaxation.

The heatmap must expose numeric person/day duty totals and a readable legend, not color alone. The board must identify department, drill, time, assigned qualified people, resources, moved requests and unmet training. Review must include the entire package and every proposed exception, not only a green success badge.

## Operating environment, recovery and authority

Target a local browser interface backed by the materialized shared service; no production hosting or deployment is in scope. Support desktop and narrow widths, keyboard operation, clear loading/cancel states, errors beside affected data and preservation of the last valid draft after failures. Planning must decide and disclose local draft persistence and export/reload behavior. Reject invalid imported JSON without overwriting valid data; offer correction or restore the exact synthetic sample. Resetting changes requires a deliberate action.

Show synthetic provenance in the interface, data documentation and exports. No actual SFTRM compliance, actual personnel availability, real-format validation or operational readiness claim is permitted. No external calendar writes, messaging, real roster ingestion, automated policy relaxation or ship-system actions are authorized. Human approval is required before delivery/deployment; the designated PB4T operator separately owns operational schedule acceptance. A demonstration review control records only simulated local review.

Monitor computation status, visited-search budget, unresolved occurrences, rejected constraints and policy version locally. Escalate infeasibility, exhaustion, missing policies or requested relaxations to the coordinator with a specific reason; never silently drop requests. A cancel/stop action must halt scheduling or discard its result safely and preserve the prior valid draft. Shutdown must terminate child processes through the inherited environment; do not create persistent external agents.

## Acceptance inventory and proposed measurable outcomes

Every canonical packet ID is retained below; aliases remain provenance, never additional criteria. “Synthetic target” means a proposed complete demonstration, not a verified implementation. Operational deferrals above remain unverified even when synthetic checks pass. Planning must assign capability checks and applicable browser journeys to every row, or retain the stated deferral. Headings and source attribution are retained as source obligations rather than invented functional requirements.

### UC11-1

Original wording: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: requirement `UC11-1` at `challenge.requirements[0]`. Packet method: human.

Intake disposition: Deferred; full synthetic coverage required. Proposed outcome: All named departmental behaviors and constraints, collision detection, alternative allocations and fictional recurrence coverage; no actual SFTRM compliance claim.

### SCH-01

Original wording: No personnel or shared-resource double booking.

Provenance: recipe `SCH-01` at `recipe.acceptance[0]`. Packet method: automated.

Intake disposition: Synthetic target. Proposed outcome: Independent pairwise/capacity checks find zero personnel/resource double bookings in every reported feasible schedule.

### SCH-02

Original wording: Honor availability, qualifications, rest and duty budgets.

Provenance: recipe `SCH-02` at `recipe.acceptance[1]`. Packet method: automated.

Intake disposition: Synthetic target. Proposed outcome: Every assignment satisfies qualification validity, availability, rest and duty-budget limits including exact boundaries.

### SCH-03

Original wording: Distinguish infeasible input from exhausted search.

Provenance: recipe `SCH-03` at `recipe.acceptance[2]`. Packet method: automated.

Intake disposition: Synthetic target. Proposed outcome: Tiny impossible case yields proven infeasibility; bounded search case yields exhaustion without claiming impossibility.

### SCH-04

Original wording: Preserve mandatory training periodicities.

Provenance: recipe `SCH-04` at `recipe.acceptance[3]`. Packet method: integration.

Intake disposition: Deferred; recipe synthetic demonstration required. Proposed outcome: Enumerate all fictional mandatory occurrences from history, schedule within deadlines or report each unmet occurrence.

### SCH-05

Original wording: Have an operator accept the proposed schedule.

Provenance: recipe `SCH-05` at `recipe.acceptance[4]`. Packet method: human.

Intake disposition: Deferred; human acceptance pending. Proposed outcome: Review board/load/exception requests; simulate local review with explicit provenance and invalidate it after edits.

### DELIVERABLE11-1

Original wording: An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

Provenance: deliverable `DELIVERABLE11-1` at `challenge.expectedDeliverables.lines[0]`; description `SCOPE11-8` at `userScope.description[981:1143]`. Packet method: human.

Intake disposition: Synthetic target. Proposed outcome: Interactive weekly board, computed cross-department resolution via one click and numeric personnel heatmaps all reflect the same computed proposal.

### DESC11-1

Original wording: Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations.

Provenance: description `DESC11-1` at `challenge.description[0:238]`; description `SCOPE11-1` at `userScope.description[0:238]`. Packet method: human.

Intake disposition: Deferred; full synthetic coverage required. Proposed outcome: All four named drill families are coordinated against fictional crew and operations; real crew/operations remain unverified.

### DESC11-2

Original wording: Key personnel are frequently double-booked across simultaneous evolutions.

Provenance: description `DESC11-2` at `challenge.description[239:313]`; description `SCOPE11-2` at `userScope.description[239:313]`. Packet method: human.

Intake disposition: Synthetic target. Proposed outcome: Detect exact shared-person collisions in the baseline and show their computed resolution or explicit unresolved state.

### DESC11-3

Original wording: This use case asks teams to build a constraint-satisfaction multi-agent scheduling system that automatically negotiates and deconflicts the shipboard weekly drill calendar.

Provenance: description `DESC11-3` at `challenge.description[314:486]`; description `SCOPE11-3` at `userScope.description[314:486]`. Packet method: human.

Intake disposition: Synthetic target. Proposed outcome: Departmental proposals and counterproposals automatically produce a deconflicted weekly calendar or explain failure.

### SUMMARY11-1

Original wording: Coordinate departmental training proposals against shared personnel, resources, operational windows and fatigue rules.

Provenance: summary `SUMMARY11-1` at `challenge.summary[0:118]`. Packet method: human.

Intake disposition: Synthetic target. Proposed outcome: Every departmental proposal is evaluated against shared personnel/resources, operations and declared fatigue rules.

### SCOPE11-4

Original wording: Requirements

Provenance: description `SCOPE11-4` at `userScope.description[488:500]`. Packet method: human.

Intake disposition: Source heading retained. Proposed outcome: Requirements heading is represented by the complete requirement inventory; no independent computation is implied.

### SCOPE11-5

Original wording: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies.

Provenance: description `SCOPE11-5` at `userScope.description[501:791]`. Packet method: human.

Intake disposition: Synthetic target. Proposed outcome: Engineering, Weapons and Combat Systems agents negotiate against explicit windows, qualified Fire Party Leader/EOOW/TAO roster and fictional fatigue constraints.

### SCOPE11-6

Original wording: The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: description `SCOPE11-6` at `userScope.description[792:957]`. Packet method: human.

Intake disposition: Deferred; full synthetic coverage required. Proposed outcome: Computed collisions, alternative allocations and complete fictional periodicity checks; no actual SFTRM certification.

### SCOPE11-7

Original wording: Expected deliverables

Provenance: description `SCOPE11-7` at `userScope.description[959:980]`. Packet method: human.

Intake disposition: Source heading retained. Proposed outcome: Expected deliverables heading remains linked to the complete weekly-board deliverable.

### SCOPE11-9

Original wording: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11

Provenance: description `SCOPE11-9` at `userScope.description[1145:1214]`. Packet method: human.

Intake disposition: Source attribution target. Proposed outcome: Source URL and synthetic interpretation/provenance remain visible in documentation and application context.

## Exclusions and outstanding owner questions

Exclude live ship/crew integrations, real records, official SFTRM certification, global optimality claims, automatic operational publication, production identity/security and external autonomous actions. These exclusions do not remove departmental negotiation, recurrence, fatigue, the board, heatmaps or the full synthetic workflow.

Owner questions for later operational review: Which applicable SFTRM version, training requirements/history and fatigue rules are authoritative? Who may approve policy changes and accept a weekly schedule? Which operational windows are fixed and which preferences may move? What counts toward duty and rest, including simultaneous roles and history? What objectives and priorities resolve equivalent feasible schedules? What timezone, week boundaries, persistence and export format are desired? None blocks explicit fictional assumptions for the synthetic demonstration; no unanswered question grants approval.

Phase boundary: only scope.md is produced in this intake. No research, planning contracts, implementation, fixture generation or operational actions were performed. The next host step is dedicated synthetic data preparation and validation; planning must consume those exact artifacts and freeze independent expected outputs before implementation.
