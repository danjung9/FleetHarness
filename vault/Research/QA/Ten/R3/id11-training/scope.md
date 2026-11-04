# Primary deferrals

The synthetic prototype must demonstrate the complete scheduling workflow below. These source obligations remain unverified; demonstrating invented rules cannot establish operational compliance. Intake dispositions are scope disclosures, not a completed acceptance plan.

## UC11-1

Original wording: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Authoritative applicable SFTRM periodicities, training completion history, qualified roster, and approved fatigue policy are unavailable and outside the synthetic-only boundary. Withhold any assertion that all actual SFTRM-mandated training is satisfied. Still demonstrate Engineering, Weapons, Combat Systems and supporting departmental agents negotiating alternate allocations, collisions, operational windows, qualifications, fatigue and recurrence using explicit synthetic rules. This deferral concerns the real compliance obligation; it does not remove any named behavior from the demonstration.

## SCH-04

Original wording: Preserve mandatory training periodicities.

real-data: Owner-supplied applicable recurrence rules and prior completion dates are unavailable. Withhold validation of actual mandatory periodicities. Demonstrate synthetic recurrence expansion, due dates, carry-in history, and a check that every required occurrence is scheduled before its deadline; missing rules produce an explicit gap, never a compliance claim.

## SCH-05

Original wording: Have an operator accept the proposed schedule.

human-authority: An actual PB4T operator must review and accept the specific proposed schedule. No such acceptance has occurred in this unattended intake. Withhold actual operator approval and operational release. Demonstrate an editable review board, personnel loading, constraint-change requests and a local synthetic acceptance record; this record cannot stand for a real operator decision.

No deferral of DELIVERABLE11-1 is proposed: the full named interactive board, automated conflict resolution, one-click scheduling action and personnel loading heatmaps belong in the synthetic demonstration. “Optimization” must disclose that bounded feasibility search does not establish a global optimum.

# Source and requested scope

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11. Challenge 11, “PB4T (Planning Board for Training) Autonomous Deconfliction Agent,” category “The Autonomous Shipboard Enterprise.” Provenance is the supplied snapshot captured 2026-11-04 in `.fleet/packet.json`, not independently researched live content.

The source describes weekly PB4T coordination of Damage Control drills, Combat Systems exercises, engineering casualty controls and flight quarters against shared personnel, resources, operations and fatigue. The requested userScope repeats that challenge and deliverable without narrowing it. `userScope.criteria` is empty; no additional user-specific acceptance criteria or resources were provided. The source evaluation criteria list is also empty. The measurable outcomes below are proposed engineering criteria, not source-published evaluation criteria or user-confirmed policy.

“Constraint-based planning” is the packet's engineering recipe recommendation, not an event requirement. Its deterministic feasibility approach fits the requested task. The packet lists OR-Tools CP-SAT as a candidate for later evaluation; no research, adoption decision, architecture, solver execution or implementation is undertaken in intake.

# Audience, primary task and success

Audience: a PB4T coordinator reviewing departmental training proposals, departmental representatives, and an operator authorized to accept a calendar. All personnel and departments in the demonstration are synthetic representations.

Primary task: turn competing departmental drill proposals into a reviewable weekly drill calendar. Departmental agents must actually propose and negotiate alternatives under common hard constraints; a manual entry form or generic chat interface alone is insufficient.

Smallest complete demonstration: one synthetic seven-day shipboard week, Engineering, Weapons and Combat Systems agents plus Damage Control and flight-quarters participation, a shared qualified roster and resources, and enough overlapping proposals to expose cross-department conflicts. Agents submit proposals, receive explicit rejection reasons, offer alternate slots or eligible personnel, and converge through deterministic constraint checks. The operator sees the initial conflicts, invokes one-click schedule optimization, inspects the revised board and personnel heatmap, edits a proposal and revalidates, then records a clearly labeled demonstration acceptance. Hard constraints cannot be silently relaxed by an agent, user edit or explanation.

Observable success: a feasible proposal accounts for every required synthetic occurrence, assigns qualified available personnel and resources within permitted windows, respects declared rest/duty limits and deadlines, and explains each changed allocation. An impossible dataset yields infeasible; exhausted bounded search yields search-exhausted/unknown, never proof of impossibility. Unscheduled mandatory work and unresolved conflicts remain visible and prevent a clean acceptance state. A feasible result is not proof of global optimality or real SFTRM compliance.

# Inputs and data contract

Inputs must be local synthetic fixtures or synthetic edits. No operational systems, actual crew information, real schedules, credentials or shipboard records may be read or transmitted. The missing integrations listed in the packet confer no access permission.

Required input concepts (logical contract, not an implementation schema):

- Planning horizon: start/end of a seven-day week, one declared time basis, interval units and boundary semantics. Cross-midnight work must retain its actual end time.
- Departmental proposals: stable drill ID, department/agent, drill type, duration, preferred and permitted windows, required personnel roles and counts, shared resources, mandatory/optional designation, and alternative proposals with reasons.
- Qualified roster: invented person IDs and names, qualification identifiers such as Fire Party Leader, EOOW and TAO, valid qualification dates where modeled, availability, prior duty/rest history, and duty budgets.
- Shared resources and operations: resource IDs/capacity, unavailable windows and ship operational windows applicable to each drill.
- Policy set: versioned synthetic minimum rest, duty-budget measurement windows, recurrence intervals, prior completions, due dates, and required occurrences. Every invented value is labeled a demonstration assumption rather than actual naval or SFTRM policy.
- Search controls and review: bounded search budget, deterministic ordering/tie resolution, proposed changes, rejection reasons and local review state. Search exhaustion is distinct from fully explored infeasibility.

The fixture author must supply a documented answer key later, covering a feasible collision case, unavailable personnel, missing qualifications, fatigue boundaries, periodicity deadlines, an impossible case and an exhausted-search case. No values or domain-policy defaults are authorized as operational rules here. Proposed demonstration interval convention: half-open intervals, so adjacent events do not overlap; later fixtures must state their convention explicitly. Recurrence must account for prior completion and deadlines crossing the displayed week rather than assuming the week resets obligations.

# Outputs and operating environment

Deliver the source-named interactive weekly schedule board, automated cross-department conflict resolution, one-click schedule optimization action and personnel loading heatmaps. Show original versus alternate allocations, agent negotiation history with constraint reasons, assigned people/resources, required occurrences and due-date coverage, rest/duty loads and outstanding work. Report feasible, infeasible, invalid input and search exhaustion distinctly. The schedule and any exports/evidence must carry “Synthetic demonstration; not validated against real SFTRM rules or operational data.”

The local review state must distinguish proposed, invalidated by edits, and accepted for demonstration. Show every constraint-change request explicitly; changes to a hard policy require a declared revised synthetic policy and full revalidation. No automatic operational approval is implied.

Intended environment: a local browser prototype in the provided workspace, usable at desktop and narrow widths with keyboard-accessible labeled controls. No deployment, publication or connection to shipboard systems is in scope. Persistence and export formats are unresolved design choices for planning; if local drafts persist, disclose local-only storage and allow recovery without confusing old results with the current input revision. No production identity or durability is assumed.

# Recovery needs

Reject malformed intervals, missing role/policy data, unknown IDs and inconsistent recurrence inputs with specific explanations while preserving draft entries. Show conflicts and blocked occurrences without presenting an incomplete schedule as valid. Permit correction and rerun after infeasibility or search exhaustion. Increasing a search budget must not relax constraints. Editing an accepted demonstration invalidates its acceptance and requires revalidation. Reset must avoid accidental loss of an edited draft. Immediate local processing still needs clear pending/completed state and protection against duplicate scheduling actions.

# Traceable acceptance inventory

All seven canonical IDs are retained below. Source requirements, recipe checks and deliverables retain distinct provenance. These are intake outcomes for later planning and independent application verification; they are not browser journeys or claims that checks have run.

## UC11-1

Original wording: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: requirement `challenge.requirements[0]` (ID `UC11-1`).

Packet method: human. Packet scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

Proposed measurable outcome: Demonstrate named departmental agents negotiating and reallocating competing drills under every listed synthetic constraint, including recurrence, with a visible explanation of collisions and alternatives. Real SFTRM assurance remains deferred as above.

Scope status: Source obligation deferred with full synthetic stand-in required; see Primary deferrals.

## SCH-01

Original wording: No personnel or shared-resource double booking.

Provenance: recipe `recipe.acceptance[0]` (ID `SCH-01`).

Packet method: automated. Packet scenario: Schedule requests sharing a person and room; independently verify all interval pairs.

Proposed measurable outcome: On proposals sharing people and a room, every final interval pair is independently checked for personnel overlap and resource capacity; no conflicting pair remains in a feasible result.

Scope status: Full synthetic prototype outcome required; not yet implemented or verified.

## SCH-02

Original wording: Honor availability, qualifications, rest and duty budgets.

Provenance: recipe `recipe.acceptance[1]` (ID `SCH-02`).

Packet method: automated. Packet scenario: Include a missing qualification, unavailable window and fatigue-boundary case.

Proposed measurable outcome: Independently verify assignments against availability, qualifications, minimum rest and duty budgets. Include missing-qualification, unavailable-window and exact fatigue-boundary cases; invalid assignments cannot be accepted.

Scope status: Full synthetic prototype outcome required; not yet implemented or verified.

## SCH-03

Original wording: Distinguish infeasible input from exhausted search.

Provenance: recipe `recipe.acceptance[2]` (ID `SCH-03`).

Packet method: automated. Packet scenario: Run an impossible case and a deliberately tiny search budget; expect different statuses.

Proposed measurable outcome: An independently impossible small case and a deliberately exhausted bounded search produce different literal statuses; an unknown result cannot be called infeasible or accepted as feasible.

Scope status: Full synthetic prototype outcome required; not yet implemented or verified.

## SCH-04

Original wording: Preserve mandatory training periodicities.

Provenance: recipe `recipe.acceptance[3]` (ID `SCH-04`).

Packet method: integration. Packet scenario: Expand the owner-supplied recurrence rules into occurrences and verify every deadline.

Proposed measurable outcome: Expand explicit synthetic recurrence rules and verify every mandatory occurrence and deadline against an independent fixture answer key, including carry-in history. Actual owner-rule integration remains deferred.

Scope status: Source obligation deferred with full synthetic stand-in required; see Primary deferrals.

## SCH-05

Original wording: Have an operator accept the proposed schedule.

Provenance: recipe `recipe.acceptance[4]` (ID `SCH-05`).

Packet method: human. Packet scenario: Review the editable board, personnel load and every constraint relaxation request.

Proposed measurable outcome: Demonstrate editable review, load inspection, visible constraint-change requests and acceptance gated on current valid results. Actual operator acceptance remains deferred until an authorized person acts.

Scope status: Source obligation deferred with full synthetic stand-in required; see Primary deferrals.

## DELIVERABLE11-1

Original wording: An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

Provenance: deliverable `challenge.expectedDeliverables.lines[0]` (ID `DELIVERABLE11-1`).

Packet method: human. Packet scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

Proposed measurable outcome: Show an interactive seven-day board with cross-department conflicts automatically resolved through a single scheduling action, visible changed allocations, and personnel loading heatmaps whose loads reconcile with assigned durations. Disclose feasibility-only search.

Scope status: Full synthetic prototype outcome required; not yet implemented or verified.

# Explicit exclusions and evidence boundary

Exclude operational records and integrations, real compliance certification, actual schedule release, publication/deployment, production identity and fleet-scale performance guarantees. Do not promise a globally optimal roster: the included bounded backtracking finds feasibility. The toolkit does not encode SFTRM; recurrence and fatigue values must be supplied explicitly. Toolkit calculations and reference fixtures are not evidence that an application works. Later application verification must exercise its actual behavior and use independent expected outcomes; operational readiness additionally requires independent domain review. Missing an expert or an official format is not a reason to omit the complete synthetic workflow.

# Unknowns and outstanding owner questions

These questions are recorded for later owner resolution, not blockers to creating explicitly invented demonstration data:

- What is the authoritative qualified roster, availability, shared-resource capacity and drill request representation? Real data remains excluded; a realistic synthetic qualified roster and drill requests still need authoring.
- Which fatigue policy, rest accounting period, prior duty history and exceptions apply? Which role owns and approves these policies? No operational defaults are known.
- Which SFTRM revision, drill classifications, recurrence rules, prior completion dates and deadline semantics apply? The toolkit supplies none of these rules.
- Who has actual PB4T acceptance and exception authority, and what evidence must accompany their decision? Human review cannot be simulated into actual approval.
- What objective should “optimization” prioritize among feasible schedules (preferred slots, fairness, or another measure), and how should optional versus mandatory requests be ordered? No global-optimality claim is available.
- What time basis, week boundary, cross-midnight conventions, scale and local draft/export needs should the eventual owner require? Demonstration assumptions must remain visible until resolved.

Intake completion: source-linked requirements, deliverable, empty source/user criterion lists, recipe criteria, workflow, data boundaries, missing policy/data, authority needs and proposed measurable outcomes are recorded. Research, planning contracts, implementation and verification remain subsequent phases. `requirements.md` is preserved unchanged.
