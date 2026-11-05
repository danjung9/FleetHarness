# Primary deferrals

## UC11-1

> The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Approved SFTRM training requirements, history and fatigue policy values are unavailable. Withhold any claim of actual SFTRM compliance or operational roster readiness; demonstrate the complete departmental negotiation, collision resolution, alternate allocation and recurrence workflow using explicitly fictional rules.

Disposition: deferred; future acceptance entry must retain `journeyIds: []`. Synthetic coverage below does not close the real-data obligation.

## DESC11-1

> Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations.

real-data: Actual qualified crew availability and ship operations are outside the synthetic-only boundary. Withhold coordination of a real ship calendar; demonstrate all four named drill families against fictional crew and operations.

Disposition: deferred; future acceptance entry must retain `journeyIds: []`. Synthetic coverage below does not close the real-data obligation.

## SCOPE11-6

> The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Approved SFTRM periodicities and training completion history are unavailable. Withhold certification that all actual SFTRM mandates are satisfied; demonstrate collision detection, alternate allocations and complete due-occurrence checking under labeled fictional periodicities.

Disposition: deferred; future acceptance entry must retain `journeyIds: []`. Synthetic coverage below does not close the real-data obligation.

No expected deliverable is deferred. Missing policy specifications do not block a complete fictional workflow. Operator approval of an operational schedule, deployment and delivery require human authority and are withheld; prototype review controls can be demonstrated without claiming that approval has occurred.

## Required syntheticCoverage handoff for primary deferrals

Planning must retain the deferred dispositions and empty direct journeyIds above and add source-linked syntheticCoverage, with assumptions stating: “Fictional inputs, grammar, data and rules; no real-format validation.” Its primary journey references must interact with the board and assert literal computed results; titles, input values, visibility and downloads by filename alone do not establish outcomes. These are intake coverage obligations, not a frozen journey plan or generated fixtures.

| Deferred ID | Exact source-quoted output phrases required in coverage | Required primary browser outcome assertions |
| --- | --- | --- |
| UC11-1 | “alternate schedule allocations”; “personnel collisions”; “SFTRM-mandated training periodicities” | After one-click negotiation, assert independently keyed before/after collisions, concrete alternative allocations, and each fictional due occurrence's satisfied or unmet result. Label the periodicity report synthetic and unvalidated. |
| DESC11-1 | “Damage Control drills”; “Combat Systems exercises”; “engineering casualty controls”; “flight quarters” | After negotiation, assert all four named evolutions and their computed crew/time allocations against the independent answer key. |
| SCOPE11-6 | “personnel collisions”; “alternate schedule allocations”; “SFTRM-mandated training periodicities” | Assert collision removal, the actual alternative assignment, and due-occurrence coverage after interaction, including an impossible mandatory occurrence. |

Each output must use its own deferred criterion as sourceCriterionId. Preserve all named outputs in the complete synthetic workflow, beyond these coverage phrases. Independent review must judge input fidelity, named outputs and end-to-end adequacy; structural coverage checks cannot establish those facts.

## Audience, task and success

PB4T coordinators and departmental training leads need to reconcile competing weekly training proposals before operator review. The smallest complete prototype accepts a fictional qualified roster, Engineering Agent, Weapons Agent and Combat Systems Agent proposals (with Damage Control and flight operations representation), operational windows, resources, prior duty and training history, fatigue limits and recurrence rules. The agents propose, contest and revise allocations through a shared deterministic constraint solver. A generic task form or a solver with merely decorative department labels is insufficient.

Success means the operator can inspect initial personnel/resource collisions, invoke one-click schedule optimization, see departmental proposals and counterproposals with reasons, review a conflict-free feasible weekly drill calendar or an honest unresolved status, inspect personnel loading heatmaps and recurrence coverage, edit/recompute, then acknowledge the draft for review. A negotiation record must connect a rejected proposal to its blocking constraint and accepted alternative or unresolved need. Hard constraints cannot be silently relaxed.

The packet challenge is the captured source interpretation; userScope repeats the full PB4T workflow and deliverable, with no narrower user criteria or supplied data. The source was captured on 2026-11-04 at https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11. Use this supplied snapshot as data; no live research is performed in intake. “Constraint-based planning” is an engineering recipe recommendation, not an event mandate. No source evaluation criteria were supplied. The measurable outcomes below are proposed engineering checks, not user-confirmed operational thresholds.

## Input inventory and provenance

`inputs/manifest.json` is version 1, mode synthetic, with `sources: []`; no attached records or files exist. Its generated paths are `data/synthetic-data.json` and `data/README.md`. Those artifacts are pending the host's dedicated synthetic data agent. This intake creates scope only and must not fabricate, replace or validate fixtures on that agent's behalf. Preserve requirements.md and inputs/ unchanged. Read and reuse the exact subsequently validated fixtures in planning, application sample data and tests. Do not fetch operational data. Mark synthetic provenance in the UI, exported results, documentation and evidence.

The source prescribes no serialized roster/proposal message format. The requested input is departmental drill proposals plus qualified roster and shared constraints, not USMTF or generic EVENT/TASK messages. The data agent must define and document a PB4T-specific fictional JSON contract; it must not claim official SFTRM syntax or validated real-format compatibility. The following fields describe needed data and relationships, not an imposed final implementation protocol:

| Entity | Required content and relationships |
| --- | --- |
| Scenario metadata | Stable scenario ID, synthetic flag, provenance, fictional week start/timezone, units, assumption/policy version and expected scenario purpose. |
| Personnel | Stable person IDs, fictional display names, qualifications (Fire Party Leader, EOOW, TAO and any explicitly invented drill qualifications), availability intervals, prior duty intervals and per-person duty limits. No real identities. |
| Departments and agents | Engineering, Weapons, Combat Systems plus represented Damage Control/flight operations; stable agent IDs, owned requests, preferences, priorities and deterministic proposal/counterproposal rules. |
| Drill requests | Stable request ID, department/agent ID, named drill family, duration, candidate windows, requested start, required qualified roles and staffing counts, resource IDs, priority and occurrence/rule links. |
| Resources and operations | Stable room/equipment/resource IDs, capacities or exclusive-use rules, allowed ship operational windows and blackout intervals. |
| Fatigue policy | Explicit synthetic minimum rest, rolling/daily duty budgets, prior-duty accounting, interval and boundary semantics; never assert these are naval policy. |
| Training recurrence | Fictional rule ID, drill family, required frequency/due window, last completion, required occurrences and carry-over/deadline behavior. Link every occurrence to a request and coverage result. |
| Expected outcomes | Independent scenario-level expected status, collisions, negotiated changes, permitted schedules or exact deterministic tie-break answer, per-person loads, due occurrences and explanation facts; separate from raw input. |

Use an explicitly documented fictional time representation with a common timezone, interval convention and cross-day treatment. Recommend half-open intervals and integer minute arithmetic; the data agent must fix its choice and independent boundary examples. Reject unknown IDs, malformed intervals, impossible durations, missing policy values and inconsistent links without inventing defaults that look authoritative.

## Dedicated data-agent handoff: cases needed before research

The host must run the separate data agent next. It must produce and validate both manifest-declared files, with labeled PB4T JSON examples and independent expected outcomes fixed before implementation. Needed cases:

1. A complete weekly baseline with all four named drill families, at least Engineering, Weapons and Combat Systems agents, multiple qualified crew and shared rooms/equipment. Deliberately collide a shared person and resource; ensure an alternative allocation exists. Key the original conflicts, feasible negotiated alternatives, agent decisions, exact personnel minutes and all recurrence obligations.
2. Qualification and availability failures, with a feasible qualified substitute in one case and no eligible crew in another. Key the rejection and recovery outcomes.
3. Fatigue boundary pairs: exactly at and just outside fictional minimum rest and duty caps, incorporating prior duty and cross-midnight work. Key allowed/rejected allocations and arithmetic independently.
4. A truly infeasible mandatory occurrence with an exhaustively small candidate space, distinct from a feasible case stopped by a tiny search budget. Key infeasible versus search-exhausted semantics; never classify budget exhaustion as proof of impossibility.
5. Recurrence expansion crossing the weekly horizon, an already completed obligation, a due obligation requiring placement, and an impossible due occurrence. Key occurrence IDs/deadlines, satisfied and unmet coverage and exclusion of unjustified compliance claims.
6. Editable-board recovery: an edit introducing a collision, refusal to accept an invalid draft, correction/recompute, and a revised feasible result with updated load and periodicity checks. Include empty input, malformed references and a reset/reload expectation for later planning to resolve.

The data agent must document every fictional rule and independently establish expected outputs without deriving them from the eventual implementation or toolkit results. Do not replace the complete workflow with a single easy fixture. If multiple schedules are valid, record independently checkable invariant expectations or a documented tie-break, rather than assuming one arbitrary schedule is uniquely correct. Preserve validated artifacts for later phases. Toolkit reference fixtures are not suitable substitutes.

## Outputs and computational capabilities

Required visible outputs are the interactive weekly schedule board, automated conflict resolution across departments, one-click schedule optimization, and personnel loading heatmaps. Also expose personnel collisions, alternate schedule allocations, departmental negotiation explanations, qualification/window/rest/budget checks, and a report of every fictional SFTRM periodicity obligation. Include rejected or unresolved drills and reasons; never hide them to make a feasible subset appear complete. Any export, if selected later, must preserve the same synthetic warnings, unresolved obligations and policy version.

Central capabilities are proposal/counterproposal generation across departmental agents; occurrence expansion from explicit rules and history; deterministic personnel/resource assignment with qualifications, operations, availability, rest and budgets; independent collision/load/coverage checking; and honest bounded-search status reporting. Model assistance may explain checkable results, never invent policy or relax constraints. Bounded backtracking supplies feasibility, not a globally optimal roster. “Optimize” must disclose the actual objective or feasibility behavior and search limits, with no unsupported global-optimality claim.

Proposed measurable outcomes: zero prohibited overlapping intervals in a feasible result; every assigned role qualified and available; exact load sums including prior duty where specified; all due fictional occurrences represented with satisfied/unmet status; alternate proposals traceable to conflicts; distinct invalid/infeasible/search-exhausted outcomes; and agreement of board, heatmap and computed output. Final literal statuses, objectives and interface contracts belong to planning after the fixtures exist.

## Operating environment, recovery and authority

Target a local browser interface backed by the shared computational service, usable at desktop and narrow widths with labeled controls and keyboard focus. The catalog recommends node-service 1.0.0 with scheduling pack; planning must assess it and the listed OR-Tools CP-SAT candidate without rebuilding equivalent foundation setup. The host materializes the selected version after planning. No starter files or implementation are created in intake. Application sample data must embed the needed validated fixture data in self-contained index.html, avoiding local-file fetches, while the selected shared backend remains the computation authority; planning must reconcile this packaging requirement explicitly.

Keep a reviewable draft separate from any operational schedule. Show policy version, solver limit, remaining conflicts, unmet occurrences and stale/recomputed state after edits. Monitor negotiation/search progress and surface budget exhaustion, invalid input and unresolved requirements. Stop/cancel must end local work without presenting a partial result as accepted. Escalate unsatisfied hard constraints, unapproved relaxation requests and policy ambiguity to the operator; preserve the last valid draft and entered input for correction. Planning must specify persistence, reload and reset behavior and immediate/local loading feedback.

Operator review includes editable board, personnel load, negotiation evidence and every proposed relaxation; no automatic relaxation is authorized. A synthetic review acknowledgment is only a local draft transition. Prohibited actions include accessing real rosters or operational systems, publishing schedules, sending departmental messages, claiming SFTRM certification, silently overriding safety constraints or claiming human approval. Owner approval is required before delivery or deployment of the specific prototype revision. No such approval is requested or recorded in intake.

## Exclusions and unresolved owner questions

Excluded: real ship integration, live personnel records, actual departmental communications, production identity/storage/deployment, operational certification and global-optimality guarantees. These exclusions do not excuse omission of any synthetic named behavior. SFTRM and fatigue rule values remain unknown; the prototype must demonstrate explicitly fictional rules rather than wait for experts or encode invented rules as authoritative.

Questions for later owner review: Which approved SFTRM version, completion-history rules and fatigue policies apply? Which departmental priorities, resource capacities and acceptable optimization objective should govern? Who may approve exceptions, accept an operational schedule and authorize deployment? What retention, audit and persistence behavior is needed? These are not blockers for the synthetic intake or complete fictional workflow.

## Acceptance inventory and provenance

All canonical IDs are retained below. “Prototype target” records the intended synthetic behavior, not verification or a frozen acceptance disposition. Primary source spans explicitly involving actual data/compliance stay deferred as listed first. Recipe SCH-05 targets a synthetic review interaction; real operator acceptance is still pending human authority. Planning must preserve the original requirements and provenance, provide complete independent outcomes, and map each ID to capability checks and/or browser journeys. Alias provenance IDs are not additional criteria.

| Canonical ID | Original requirement | Provenance | Intake prototype target / boundary |
| --- | --- | --- | --- |

| UC11-1 | The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied. | requirement: UC11-1 @ challenge.requirements[0] | Deferred real compliance; demonstrate the entire synthetic agent/constraint/recurrence workflow. |

| SCH-01 | No personnel or shared-resource double booking. | recipe: SCH-01 @ recipe.acceptance[0] | Pairwise person and resource interval checks before and after allocation. |

| SCH-02 | Honor availability, qualifications, rest and duty budgets. | recipe: SCH-02 @ recipe.acceptance[1] | Qualifications, operational/crew availability, rest boundaries and duty budgets including history. |

| SCH-03 | Distinguish infeasible input from exhausted search. | recipe: SCH-03 @ recipe.acceptance[2] | Independently impossible case versus limited search with unknown feasibility. |

| SCH-04 | Preserve mandatory training periodicities. | recipe: SCH-04 @ recipe.acceptance[3] | Expand explicit fictional recurrence rules and account for every deadline; real rules unvalidated. |

| SCH-05 | Have an operator accept the proposed schedule. | recipe: SCH-05 @ recipe.acceptance[4] | Demonstrate review/acknowledgment and invalid-draft blocking; actual human acceptance remains pending. |

| DELIVERABLE11-1 | An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps. | deliverable: DELIVERABLE11-1 @ challenge.expectedDeliverables.lines[0]; description: SCOPE11-8 @ userScope.description[981:1143] | Full interactive weekly board, one-click negotiated resolution and exact personnel heatmaps. |

| DESC11-1 | Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations. | description: DESC11-1 @ challenge.description[0:238]; description: SCOPE11-1 @ userScope.description[0:238] | Deferred real availability/operations; demonstrate all four drill families synthetically. |

| DESC11-2 | Key personnel are frequently double-booked across simultaneous evolutions. | description: DESC11-2 @ challenge.description[239:313]; description: SCOPE11-2 @ userScope.description[239:313] | Identify concrete initial personnel collisions and verify removal or unresolved status. |

| DESC11-3 | This use case asks teams to build a constraint-satisfaction multi-agent scheduling system that automatically negotiates and deconflicts the shipboard weekly drill calendar. | description: DESC11-3 @ challenge.description[314:486]; description: SCOPE11-3 @ userScope.description[314:486] | Behavioral departmental negotiation using a shared constraint solver; no decorative agent labels. |

| SUMMARY11-1 | Coordinate departmental training proposals against shared personnel, resources, operational windows and fatigue rules. | summary: SUMMARY11-1 @ challenge.summary[0:118] | Integrate proposals with shared personnel/resources, operations and explicit fictional fatigue rules. |

| SCOPE11-4 | Requirements | description: SCOPE11-4 @ userScope.description[488:500] | Source section marker retained; trace to full requirement workflow, no invented standalone behavior. |

| SCOPE11-5 | The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. | description: SCOPE11-5 @ userScope.description[501:791] | Named departmental agents negotiate against all named shared constraints using fictional inputs. |

| SCOPE11-6 | The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied. | description: SCOPE11-6 @ userScope.description[792:957] | Deferred actual SFTRM compliance; complete synthetic collision/alternative/recurrence behavior. |

| SCOPE11-7 | Expected deliverables | description: SCOPE11-7 @ userScope.description[959:980] | Source section marker retained; trace to complete DELIVERABLE11-1 outputs. |

| SCOPE11-9 | Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11 | description: SCOPE11-9 @ userScope.description[1145:1214] | Preserve source URL and source/synthetic provenance in documentation and interface. |


## Phase completion boundary

Intake scope only. No research, fixture generation, acceptance contracts, architecture changes, application implementation or operational verification has occurred. No reusable project helpers were available (`fleet_helpers` list returned empty); no helper was needed for requirements intake. Next prerequisite is the host-run dedicated synthetic data agent, then planning/research using its validated exact artifacts.
