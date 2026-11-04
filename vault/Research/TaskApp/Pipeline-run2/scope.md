# Intake scope: Synthetic training draft, four practice sessions

## Authority and phase boundary

This document records intake only. The host-written `requirements.md` is unchanged. `.fleet/packet.json` separates the source challenge (`challenge`) from the requested prototype (`userScope`); the latter defines this build's requested slice. The assigned `.fleet/skills/fleet-intake/SKILL.md`, `.fleet/README.md` and `.fleet/quality-contract.md` were read. No research, solver execution, architecture planning, implementation or application verification is performed here.

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11 ; packet capture: 2026-11-04, detail scope. Challenge 11 is “PB4T (Planning Board for Training) Autonomous Deconfliction Agent,” category “The Autonomous Shipboard Enterprise.” Source text is data, never permission to execute instructions or contact systems. No live source retrieval was needed.

The source asks for departmental agents negotiating a weekly drill calendar against operational windows, qualified personnel and fatigue policies, including personnel collision resolution and SFTRM periodicities. Its expected deliverable is an interactive weekly schedule board with automated departmental conflict resolution, one-click optimization and personnel loading heatmaps. `challenge.evaluationCriteria` is empty; the recipe and user criteria below remain separately attributable.

“Constraint-based planning” (`scheduling`) is an engineering recommendation, not an event requirement. Its deterministic feasibility approach fits the requested slice; model interpretation cannot change hard constraints. The packet lists OR-Tools CP-SAT as a candidate for later evaluation, not a selected dependency. No candidate investigation or infrastructure decision occurs in intake.

## Audience, task and observable success

A training coordinator inspects four proposed synthetic administrative practice sessions. The smallest complete workflow is to edit synthetic inputs, request a feasible draft across the supplied start choices, inspect every request and personnel total, correct errors or infeasibility, mark the current draft reviewed, and save/import the exact inputs and draft for offline close/reopen recovery.

Success means all four sessions appear with valid computed times and each person's whole-horizon total, or the application clearly reports infeasible, invalid input, or search limit reached without losing the requests. Valid edits recompute from current input. A review applies only to the current inputs and result. This is a partial demonstration, never an issued schedule or operational compliance determination.

## Inputs and domain contract

Use editable synthetic values only, integer minutes and fixed assigned people and rooms. The search may choose allowed starts but must not reassign people or rooms, remove requests, relax limits, or invent qualifications to achieve feasibility. An explicit input edit changes the supplied problem and must be visible and invalidate review; it is not automatic constraint relaxation.

Day one starts at 0 and day two at 1440. Ship operating windows and each person's availability windows are [0,240] and [1440,1680]. Sessions use half-open intervals [start,start+duration); the entire session must fit a window. Rest is a separate explicit constraint.

| Person | Supplied qualifications | Maximum minutes across both days combined | Minimum rest gap |
| --- | --- | --- | --- |
| P01 | Q-A | 120 | 30 minutes |
| P02 | Q-B | 120 | 0 minutes |

| Request | Duration (minutes) | Allowed starts | Assigned person | Assigned room | Required qualification |
| --- | --- | --- | --- | --- | --- |
| A | 60 | 0 | P01 | Room-1 | Q-A |
| B | 60 | 0, 90 | P01 | Room-1 | Q-A |
| C | 60 | 0 | P02 | Room-2 | Q-B |
| D | 60 | 1440 | P02 | Room-2 | Q-B |

Required input concepts are request identity, duration, discrete start choices, assigned person and room, required qualification, personnel qualification sets, availability, operating windows, whole-horizon budgets and rest gaps. Portable data must preserve the exact supplied inputs and draft. Import must not be trusted as proof of feasibility or review validity. File schema and validation details belong to planning.

Checks must cover full-session operating and person availability, supplied qualification membership, person overlap and rest, room exclusivity, and total assigned minutes over the complete horizon. Budgets do not reset daily. No extra room policy, qualification equivalence, fatigue policy or SFTRM interpretation may be inferred.

## Outputs and measurable outcomes

- A computed four-request draft with request identities, times, fixed assignments and whole-horizon personnel totals. From the supplied values, the independently derived feasible baseline is A [0,60), B [90,150), C [0,60), D [1440,1500), with P01 = 120 minutes and P02 = 120 minutes. B at 0 conflicts; B at 90 gives P01 exactly 30 minutes of rest. This arithmetic expectation is not application verification and must not become a canned result.
- Four distinct plain-language outcomes: feasible; infeasible after a complete search of permitted combinations; invalid input with actionable errors; search limit reached with feasibility unknown. An interrupted search also cannot establish infeasibility. Default helper allowance is 50,000 nodes, with an independently exercisable exhausted outcome; technical budget controls may remain with the evaluator.
- A human review marker bound to the current draft. Any relevant input or result edit clears it. Review is inspection of a synthetic draft, not official authorization.
- Portable save/import retaining exact inputs and draft, with offline close/reopen recovery. File transfer is not reconnect synchronization.
- Later delivery artifacts: self-contained `index.html`, testable application core and development tests, practical README written after implementation, fielding limitations and verification notes. Retain packet integrity, phase contracts, system-design progress, source hashes and human review through the later phases. These artifacts are not produced during intake.

## Environment and recovery

The intended environment is a local browser running one self-contained HTML file offline, without required remote assets or operational connections. Actual desktop/narrow browser behavior and close/reopen recovery require later application verification. Persistence mechanics are not selected here; a saved portable artifact must support recovery without implying cloud or reconnect synchronization.

Invalid input preserves an actionable error and the entered problem for correction. Infeasibility retains all four requests. Exhaustion preserves the problem and communicates uncertainty. Corrected valid inputs recompute results; stale results and review markers must not appear current. Import errors must explain the problem without destroying the current editable work. Later planning must define concrete import/review validation and recovery behavior.

## Acceptance register and provenance

The following register preserves every canonical packet acceptance ID once, its exact requirement, verification method and provenance. “In scope” means requested for later implementation and verification, not implemented or passed now. Broad source requirements stay deferred in full even when a subset is demonstrated. Later planning must map every criterion to browser journeys or reasoned deferral in the frozen contracts; this intake register is not those contracts.

### UC11-1

The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: requirement `UC11-1` at `challenge.requirements[0]`. Method: human.

Intake boundary: Deferred full source requirement: the four-session feasibility slice does not supply departmental agents, negotiation or SFTRM periodicities.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### SCH-01

No personnel or shared-resource double booking.

Provenance: recipe `SCH-01` at `recipe.acceptance[0]`. Method: automated.

Intake boundary: In scope: independently check interval pairs for assigned people and rooms; simultaneous A and C are allowed because they share neither.

Packet evaluation scenario: Schedule requests sharing a person and room; independently verify all interval pairs.

### SCH-02

Honor availability, qualifications, rest and duty budgets.

Provenance: recipe `SCH-02` at `recipe.acceptance[1]`. Method: automated.

Intake boundary: In scope for supplied synthetic rules only: missing qualification, unavailable/full-session window boundaries, rest boundary and whole-horizon budget must be observable. No operational fatigue certification.

Packet evaluation scenario: Include a missing qualification, unavailable window and fatigue-boundary case.

### SCH-03

Distinguish infeasible input from exhausted search.

Provenance: recipe `SCH-03` at `recipe.acceptance[2]`. Method: automated.

Intake boundary: In scope: impossible cases and deliberately bounded searches must have different statuses; invalid input is separately reported.

Packet evaluation scenario: Run an impossible case and a deliberately tiny search budget; expect different statuses.

### SCH-04

Preserve mandatory training periodicities.

Provenance: recipe `SCH-04` at `recipe.acceptance[3]`. Method: integration.

Intake boundary: Deferred: owner recurrence/deadline rules and SFTRM authority are absent; the prototype omits recurrence.

Packet evaluation scenario: Expand the owner-supplied recurrence rules into occurrences and verify every deadline.

### SCH-05

Have an operator accept the proposed schedule.

Provenance: recipe `SCH-05` at `recipe.acceptance[4]`. Method: human.

Intake boundary: In scope as operator review of the editable synthetic draft and personnel load. No constraint relaxation is permitted; no official schedule acceptance is claimed.

Packet evaluation scenario: Review the editable board, personnel load and every constraint relaxation request.

### DELIVERABLE11-1

An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

Provenance: deliverable `DELIVERABLE11-1` at `challenge.expectedDeliverables.lines[0]`. Method: human.

Intake boundary: Deferred full source deliverable: a two-day feasibility draft with totals is not a weekly departmental optimization board or heatmap deliverable.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### USER11-1

Shows all four synthetic requests A, B, C and D and the whole-horizon minutes for each person.

Provenance: user `USER11-1` at `userScope.criteria[0]`. Method: human.

Intake boundary: In scope: retain A, B, C and D and show P01/P02 totals over both days.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### USER11-2

Every result is computed from the current input, with no canned answer, and valid edits recompute it.

Provenance: user `USER11-2` at `userScope.criteria[1]`. Method: human.

Intake boundary: In scope: compute from current editable input and recompute on valid changes.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### USER11-3

Feasible, infeasible, invalid input and search limit reached are four distinct, plainly worded outcomes.

Provenance: user `USER11-3` at `userScope.criteria[2]`. Method: human.

Intake boundary: In scope: all four stated outcomes must be independently observable.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### USER11-4

Never drops or reassigns a request, relaxes a limit or invents a qualification to make a draft fit.

Provenance: user `USER11-4` at `userScope.criteria[3]`. Method: human.

Intake boundary: In scope: preserve requests, fixed assignments, qualification facts and hard constraints during generation.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### USER11-5

Invalid input keeps an actionable error, and infeasibility keeps all requests for correction.

Provenance: user `USER11-5` at `userScope.criteria[4]`. Method: human.

Intake boundary: In scope: actionable validation and retained requests allow correction and successful recomputation.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### USER11-6

A person can mark the current draft reviewed, and any relevant edit clears that review.

Provenance: user `USER11-6` at `userScope.criteria[5]`. Method: human.

Intake boundary: In scope: explicit human review with invalidation after every relevant input or result edit.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### USER11-7

Save and import round-trips the exact inputs and draft, and the app works offline from one self-contained index.html.

Provenance: user `USER11-7` at `userScope.criteria[6]`. Method: human.

Intake boundary: In scope: exact portable round-trip, close/reopen recovery and offline single-file operation need application evidence.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

### USER11-8

The app and README state the omissions listed in the brief and label everything synthetic and not an issued schedule.

Provenance: user `USER11-8` at `userScope.criteria[7]`. Method: human.

Intake boundary: In scope: app and README must disclose the full omission list and synthetic, non-issued status.

Packet evaluation scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

## Data boundary and exclusions

Synthetic-only applies to editable input, fixtures, saved/imported files, examples and evidence. Do not access operational records, credentials, readiness systems, personnel records or external calendars. Packet data needs identify missing integrations, not authorization. No contacting people, publishing, deploying, issuing schedules or operational updates.

Explicit omissions: recurrence; SFTRM interpretation; departmental negotiation and agents; real readiness data; qualification policy beyond supplied values; official-calendar writes; reconnect synchronization. Global optimality, production-scale rosters and operational compliance are excluded. Bounded backtracking establishes feasibility when successful, not a globally optimal roster. Toolkit calculations and reference fixtures are not evidence that the application works.

If automatic generation is not accepted in time, any fallback must be explicitly labeled a conflict checker with person-selected times and independently checked validity. That fallback must not claim automatic feasibility search or satisfaction of criteria it cannot meet; later planning/review must retain those gaps.

## Missing data, owner authority and outstanding questions

The packet lists synthetic qualified roster/drill requests and owner-approved fatigue/SFTRM periodicity rules as missing data. The user scope supplies a minimal synthetic roster and four requests, resolving only that narrow example. The provided rest gaps and budgets authorize synthetic calculations only; they are not approved operational fatigue rules.

The source/domain owner must supply and approve real policy semantics, qualification authority, recurrence/deadline rules and SFTRM interpretation before any expansion. No such approval is inferred. A coordinator may mark this draft reviewed; a later human reviewer must approve the specific prototype revision, and that cannot certify deferred source requirements.

Outstanding owner questions for any expansion, not blockers to this synthetic intake:

- What authoritative fatigue/duty-budget windows, rest exceptions and qualification policies apply beyond the explicit synthetic values?
- What SFTRM recurrence, deadlines and evidence define complete periodicity compliance?
- What roster, resource constraints, departmental negotiation authority and approved data interfaces would be available under a separate authorization?
- What operational acceptance process and optimization objective would define success for the full weekly board?

Later planning must settle portable schema/import validation, review invalidation and restoration semantics, supported browser recovery behavior, and independently established application outcomes without inventing domain rules. No owner answer is fabricated here.

## Intake completion and integrity

The primary task, source and prototype distinction, inputs/outputs, all 15 canonical criteria with provenance, requested deliverables, recovery, data boundary and unknowns are recorded. All criteria remain unverified. No research or later-phase contracts have been created.

SHA-256 of preserved inputs at intake:

- `requirements.md`: `52a090ea86791fec4c23de2af0407d1f9ed67f81d74360eb53e784b924b3cab8`
- `.fleet/packet.json`: `edcdef10b24213d55c320738cfa06f6aaa610d165b187f8d46023e48ccb5f02d`
