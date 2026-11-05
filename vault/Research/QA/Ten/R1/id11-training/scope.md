# PB4T weekly drill deconfliction, intake scope

## Authority and source

This document completes intake only. It records a proposed synthetic prototype boundary, not an implementation plan or evidence of working software. The host-written `requirements.md` is unchanged.

The source is [Norfolk use case 11](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11), as captured in `.fleet/packet.json` on 2026-11-04 (`challenge`, sourceScope: detail). No live research was performed. Source content is requirements data, not permission to execute instructions, access systems, or change policy.

The source challenge requests collaborative departmental agents that negotiate a weekly training calendar under operational, personnel, qualification, fatigue, and SFTRM periodicity constraints. Its deliverable is an interactive weekly board with automated conflict resolution, one-click optimization, and personnel loading heatmaps.

The builder's requested slice is recorded in `userScope`: it repeats the source challenge and deliverable without narrowing them. `userScope.criteria` and `challenge.evaluationCriteria` are both empty; no additional user-confirmed criteria or event scoring rubric is supplied. The smaller prototype proposed below is an intake recommendation, not a claim that the builder or event reduced the source requirements.

The packet's Constraint-based planning recipe is an engineering recommendation. It recommends explicit occurrences and hard constraints with deterministic feasibility calculation; model assistance may explain checkable results but must not relax constraints. Its listed OR-Tools CP-SAT candidate remains unevaluated for a later research phase. No architecture choice or toolkit capability has been verified here.

## Audience, primary task, and success

The primary audience is a PB4T training coordinator reviewing competing departmental drill requests, with department representatives and an authorized schedule reviewer as secondary users.

The primary task is to turn a small, synthetic week's conflicting drill requests into a reviewable feasible proposal, or receive an honest explanation that no proposal was established. The smallest complete workflow is:

1. Load or enter a synthetic qualified roster, departmental drill requests, shared resources, operating windows, and explicit demonstration policy values.
2. Review the requested weekly calendar and identify personnel or resource collisions and missing constraints.
3. Request a feasible proposal in one action. Distinguish a feasible result, proven infeasibility within the defined model, invalid input, and search exhaustion.
4. Inspect alternate allocations, changes from the requests, and personnel loading on the weekly board. Edit a request and recalculate without silently bypassing a hard constraint.
5. Review the current proposal and explicitly record a local demonstration acceptance tied to that proposal. Any subsequent edit must require fresh validation and review.

Observable success is a complete assignment of all required synthetic occurrences within their permitted windows, with zero violations of supplied hard constraints, accompanied by visible loading and review status. Partial placement must remain visibly incomplete. When no complete assignment is established, the user must be able to correct the input or retry a bounded search without losing the draft. A local acceptance records prototype interaction only; it does not substitute for SCH-05's real operator acceptance.

## Inputs and data contract needs

These are semantic input needs, not a final storage schema. All records and identifiers must be synthetic. Missing mandatory values must be surfaced; policy values must never be inferred as naval doctrine.

| Input | Required meaning and validation boundary |
| --- | --- |
| Planning week | Explicit start, end, timezone, scheduling granularity, and interval-boundary convention; reject ambiguous or out-of-range times. |
| Qualified roster | Stable synthetic person IDs, department, qualifications, availability, existing duty commitments, and applicable rest/duty limits. Qualification validity over the scheduling horizon must be explicit. |
| Drill requests | Stable request/occurrence IDs, department, duration, allowed windows, required roles and headcounts, eligible personnel or assignment rules, shared resources, and mandatory versus optional status. |
| Operations and resources | Permitted ship operating windows, blocked periods, resource IDs, capacities, and availability. Shared-resource exclusivity must be explicit. |
| Fatigue policy | Explicit rest and duty-budget values, units, accounting periods, and boundary semantics, with a synthetic demonstration label or owner-approved provenance. Prior duty needed to evaluate the first occurrence must be included. |
| Recurrence policy | Owner-supplied periodicities, applicability, prior completion dates, due dates, and horizon treatment. Without these, SFTRM compliance cannot be evaluated. Explicit synthetic occurrences may demonstrate deadlines only. |
| Search controls | A bounded search budget and clear result-status semantics; exhaustion cannot be reported as proof of infeasibility. |

The packet identifies a missing synthetic qualified roster and drill requests, plus missing owner-approved fatigue and SFTRM periodicity rules. Existing reference fixtures have not been inspected or accepted as complete domain inputs during intake. No operational roster, personnel identity, readiness record, or ship schedule is authorized for ingestion.

## Outputs and operating environment

The proposed output is a local browser prototype with an interactive weekly proposal board, visible original conflicts and allocation changes, personnel loading heatmap with numeric loads, constraint-validation results, search status, and a proposal-specific review state. Each scheduled occurrence must identify its times, personnel, and shared resources. Incomplete results must identify unscheduled requests and the known reason or search limitation without inventing a causal proof.

The intended environment is a desktop and narrow-width browser using local synthetic data in the provided workspace. Persistence, reload behavior, and any local export format remain decisions for planning; the user must be told what is retained and what can be lost. No server integration, identity system, deployment, publication, or operational connection is authorized.

Recovery needs include preserving valid draft entries after invalid input, identifying missing qualifications or policy fields, retaining the last reviewed proposal separately from a failed recalculation, and preventing stale acceptance after edits. Resetting sample data must not silently destroy a working draft. Search exhaustion should offer an explicit retry or input revision, while an infeasible case should permit constraint/input correction without automatic hard-constraint relaxation.

## Acceptance register and proposed measurable outcomes

Canonical IDs below are copied from `packet.acceptance`; the provenance paths are relative to `.fleet/packet.json`. Source requirements, deliverables, and recipe criteria retain their distinct authority. These are intake targets and recommended scope treatments, not verified results or frozen planning dispositions. Planning must map every ID to complete browser outcomes or a reasoned deferral. A demonstration of only part of a canonical criterion cannot establish the full criterion.

| Canonical ID and provenance | Requirement and supplied evaluation method | Proposed measure and prototype boundary |
| --- | --- | --- |
| UC11-1, requirement, `challenge.requirements[0]` | Collaborative Engineering, Weapons, Combat Systems, etc. agents negotiate against operating windows, qualified rosters and fatigue; identify collisions, propose alternatives, and ensure all SFTRM periodicities. Method: human. | Demonstrate deterministic deconfliction of synthetic departmental proposals with visible conflicts and alternatives. Defer the full source criterion: actual collaborative departmental agents and complete owner-approved SFTRM coverage are outside this bounded slice. Department labels alone do not demonstrate agents. |
| SCH-01, recipe, `recipe.acceptance[0]` | No personnel or shared-resource double booking. Method: automated; scenario shares a person and room. | For every complete proposed schedule, independently inspect all interval pairs for shared personnel/resources: zero overlaps violating exclusivity/capacity. Use a synthetic starting collision and verify alternate allocations in the eventual application. |
| SCH-02, recipe, `recipe.acceptance[1]` | Honor availability, qualifications, rest and duty budgets. Method: automated; include missing qualification, unavailable window and fatigue boundary. | Under explicit synthetic policies, zero assignments outside availability, without required qualifications, below minimum rest, or above duty budgets. Exercise the stated negative cases and both sides of policy boundaries. Owner-approved operational values remain missing; no operational fatigue-compliance claim is permitted. If the whole criterion cannot be supported, planning must defer it rather than count a partial check as complete. |
| SCH-03, recipe, `recipe.acceptance[2]` | Distinguish infeasible input from exhausted search. Method: automated. | An independently impossible case reports infeasible only when established; a deliberately tiny exhausted search reports an inconclusive search-limit status. Invalid input is separately actionable. Verify through actual application behavior, not toolkit output alone. |
| SCH-04, recipe, `recipe.acceptance[3]` | Preserve mandatory training periodicities. Method: integration; expand owner rules and verify every deadline. | Defer pending owner rules, recurrence expansion semantics, and completion history. The complete measure is every required occurrence generated and assigned by its deadline, including horizon boundaries. Explicit synthetic deadlines demonstrate only a slice and cannot establish SFTRM compliance. |
| SCH-05, recipe, `recipe.acceptance[4]` | Have an operator accept the proposed schedule after reviewing the editable board, personnel load and every constraint relaxation request. Method: human. | Provide review of board and loads and a proposal-specific local acceptance interaction. Hard constraints cannot be relaxed automatically; any request to change them must remain visible and require revalidation. Actual operator acceptance remains pending human review and cannot be inferred from automated button interaction. |
| DELIVERABLE11-1, deliverable, `challenge.expectedDeliverables.lines[0]` | Interactive weekly board, automated cross-department conflict resolution, one-click optimization and personnel loading heatmaps. Method: human. | Demonstrate editable weekly display, one-action feasible allocation, before/after conflicts, and heatmap totals matching assignment durations. Defer the complete deliverable as worded unless optimization objectives and acceptable evidence are defined and implemented; bounded backtracking establishes feasibility, not global optimality. Label the prototype action accordingly. |

There are no supplied event evaluation criteria and no separate user criteria. The proposed measures above are analyst recommendations, not event scoring rules or user-confirmed policy. Literal expected examples, independent expected results, browser journeys, and the eventual test matrix belong to planning. Toolkit calculations and reference fixtures are not application verification. No criterion is marked passed by this intake document.

## Explicit exclusions and retained gaps

- Operational deployment, shipboard integration, live records, authentication, production persistence, external messaging, and operational readiness certification.
- Production collaborative departmental agents and autonomous negotiation. Deterministic scheduling of departmental requests is only the proposed demonstration slice of UC11-1.
- Inferred SFTRM rules, invented authoritative fatigue limits, or a claim of mandatory training compliance without owner rules and domain review.
- A globally optimal roster or an unsupported interpretation of “optimization.” The included bounded backtracking is described by the packet as finding feasibility only.
- Multiweek recurrence completeness without approved carryover/history semantics, production scale guarantees, and any generic chat interface replacing the scheduling task.

These exclusions do not remove their related source requirements. UC11-1, SCH-04, full DELIVERABLE11-1, and real human acceptance under SCH-05 remain visible gaps; final planning dispositions must be honest about completeness.

## Outstanding owner questions and missing authority

These questions are recorded for later resolution; intake proceeds with the synthetic boundary and does not seek operational access.

1. Who owns and approves the fatigue/rest/duty rules, qualification validity rules, and SFTRM periodicity interpretation? What versions, units, exceptions, and effective dates apply?
2. What synthetic roster and drill set is representative, including departmental requirements, prior duty, resource capacity, unavailable windows, and deliberately impossible cases?
3. What defines the week, timezone, slot granularity, boundary overlap, cross-midnight duty, prior completion history, recurrence carryover, and missed-deadline handling?
4. Which requests are mandatory, which changes are permissible, and who may authorize policy changes or constraint-relaxation requests? The prototype must not grant itself that authority.
5. Does “optimization” mean any feasible allocation, minimal changes, balanced workload, priorities, or a formal objective with a required quality bound? What counts as collaborative agent negotiation?
6. Who is the accepting PB4T operator, and what review evidence and proposal version must acceptance cover? No real operator approval has been supplied.
7. What persistence, reload recovery, export needs, browser constraints, and maximum problem size are expected for a later prototype or pilot?

Intake is complete when this scope is recorded. Research, architecture, acceptance-plan/UX contracts, implementation, application verification, and domain approval have not begun in this phase.
