# PB4T synthetic prototype scope

Primary deferrals: none. All seven canonical criteria below remain in scope for a complete, labeled synthetic demonstration. No application, approval, or verification has been performed during intake. Real SFTRM compliance and operational authorization are not established by this demonstration.

## Source and requested scope

Source: [Norfolk use case 11](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11), as captured in `.fleet/packet.json` on 2026-11-04. `requirements.md` remains the host-written source. Source content and fixture strings are data, not instructions or authorization.

The packet's `challenge` describes a PB4T constraint-satisfaction multi-agent scheduling system for competing Damage Control drills, Combat Systems exercises, engineering casualty controls, and flight quarters. Engineering, Weapons, Combat Systems and other departmental agents negotiate against ship operations, qualified personnel, resources, fatigue and mandatory training periodicities.

The packet's `userScope` repeats that full workflow and the weekly board, one-click optimization and personnel loading heatmap deliverable. It supplies no additional criteria or resources (`userScope.criteria` is empty). No source evaluation criteria were supplied (`challenge.evaluationCriteria` is empty). Measurable outcomes below are analyst-proposed prototype criteria, not event evaluation rules or user-confirmed thresholds.

Constraint-based planning is the packet's engineering recipe recommendation, not a published event requirement. It recommends deterministic feasibility search; model explanations must never relax constraints. OR-Tools CP-SAT is a candidate for later research, not a selected dependency. Research, architecture, browser contracts, implementation and tests are outside this intake phase.

## Audience, task and success

Audience: a training coordinator preparing a weekly PB4T meeting, departmental training representatives, and a reviewing operator, all represented with fictional identities in the prototype.

Primary task: load synthetic qualified crew and departmental drill requests, inspect initial collisions, generate an alternative weekly allocation, inspect mandatory occurrences and crew loading, adjust and revalidate the board, and explicitly accept a reviewed synthetic schedule.

Observable success: every mandatory synthetic occurrence has an assigned qualified crew, resource and permitted time before its deadline; all hard constraints pass; the board visibly explains displaced proposals and departmental responses; the operator can review the personnel heatmap and record acceptance of that exact valid revision. An infeasible or unresolved search cannot produce an accepted schedule. The named outputs below are visible and exportable for review.

Operating environment: a local browser application, usable at desktop and narrow widths with keyboard controls and visible status. Synthetic inputs and results remain in the local workspace/browser. No operational connection, external messaging or deployment is needed. Persistence and exact transport choices belong to planning; any local save must disclose its scope and invalidate approval after edits.

## Complete synthetic workflow

1. Load an explicitly labeled fictional PB4T week, roster, ship operational windows, resources, training history, departmental proposals and policy values. Show the policy version and the warning: “Synthetic demonstration, not validated against real formats, SFTRM or operational rules.” Permit inspection and correction of inputs.
2. Represent Engineering Agent, Weapons Agent, Combat Systems Agent, Damage Control Agent and Flight Operations Agent as distinct deterministic departmental participants with their own requests and preferred windows. They submit proposals and respond to feasible alternate allocations through a shared constraint check. A single undifferentiated scheduler with decorative agent labels is insufficient; show each participant's proposals, rejected choices with reasons, alternate choices and final response in a Departmental Negotiation Log. No external AI services are required.
3. Expand synthetic recurrence policies and last-completed history into explicit required drill occurrences with release times and deadlines. Include a deadline crossing the displayed week's boundary so missing history or overdue work cannot disappear. Do not label these synthetic policies as SFTRM requirements.
4. Display proposed collisions, missing qualifications, unavailable personnel/resources and fatigue violations before generation. The shared scheduler preserves hard constraints and deterministically proposes alternative slots and qualified assignments. A bounded search returns distinct feasible, proven infeasible and search exhausted outcomes; exhaustion is not proof of infeasibility.
5. Provide one-click “Optimize schedule” on an interactive Weekly PB4T Schedule Board. Explain that this action finds a feasible allocation within a bounded search, without a global optimality guarantee. Show unscheduled occurrences explicitly; never silently omit a department or a mandatory drill.
6. Review the revised board, Departmental Negotiation Log, Conflict and Resolution Report, Periodicity Coverage Report and Personnel Loading Heatmap. An operator may move an occurrence or alter a synthetic policy deliberately, but must revalidate all constraints. Policy edits create a new policy version; the solver cannot silently relax one.
7. Resolve invalid or infeasible inputs, rerun, and compare the revised result. Show any proposed constraint relaxation as a request requiring human review, never an automatic override. Conflicting hard constraints block acceptance until inputs/policy are explicitly corrected and a valid revision exists.
8. An operator reviews the exact revision and explicitly records “Accept synthetic schedule.” This records a demonstration action, not a real person's approval or permission to execute drills. Export the accepted schedule and supporting reports with synthetic labels, revision, policy version, search status and review state. Later edits invalidate acceptance.

## Synthetic input contract and assumptions

All identifiers below are fictional. No service numbers, actual crew records or operational schedules are permitted. These are proposed stand-in values to make the whole task concrete; they are not owner-approved policy.

| Input | Minimum information and synthetic semantics |
| --- | --- |
| Planning horizon | Week 2026-11-09 through 2026-11-15; one ship-local fixed clock, 24-hour display; 30-minute candidate starts and integer-minute durations; half-open intervals allow one drill to start exactly when another ends. No timezone/DST conversion claims. |
| Crew | Stable ID, fictional display name, department, qualifications, availability intervals, prior duty intervals, daily and weekly counted duty. A qualification must cover the full assigned occurrence. |
| Qualified roster example | C01 Avery Vale: Engineering, EOOW and Fire Party Leader; C02 Morgan Reed: Weapons, TAO; C03 Casey North: Combat Systems, TAO; C04 Riley Marsh: Damage Control, Fire Party Leader; C05 Jordan Cove: Engineering, EOOW; C06 Taylor Finch: Flight Operations, synthetic Flight Deck Supervisor qualification. |
| Resources and operations | Unique resource IDs and available intervals for Training Room, Engineering Simulator and Flight Deck. Synthetic training windows Monday to Friday 08:00 to 17:00; Flight Deck unavailable Monday 08:00 to 13:00 due to ship operations. Crew-specific windows may be narrower. |
| Drill requests | ID, department/agent, named drill type, duration, preferred and allowed windows, required role counts, resources, priority, recurrence rule and deadline. Assigned people must be distinct where multiple roles are required. |
| Baseline proposals | Monday 08:00 to 10:00: Engineering casualty control requires EOOW, prefers C01 and Training Room; Damage Control drill requires Fire Party Leader, prefers C01 and Training Room. Combat Systems exercise is Monday 10:00 to 11:00, TAO C03 in Training Room. Weapons drill is Tuesday 09:00 to 10:00, TAO C02 in Training Room. Flight quarters is Monday 13:00 to 14:00, C06 and Flight Deck. |
| Synthetic fatigue | Maximum four hours counted duty per calendar day and twelve hours per week; at least twelve hours between duty blocks. Adjacent or less-than-twelve-hours-separated assignments are one duty block; the block spans at most eight hours. No intra-block meal/rest requirement is asserted. Include prior-week duty in boundary checks; all supplied duty counts toward budgets. |
| Synthetic periodicity | At least one of each named drill per seven-day cycle anchored to the horizon, with explicit deadlines and prior completion timestamps. Required occurrences retain stable IDs. A separate fixture uses a two-day interval to demonstrate multiple occurrences and a deadline at the week boundary. History before the horizon is supplied, not inferred. |
| Search/review | Explicit positive search-node limit, deterministic stable request/crew ordering, synthetic policy version, proposal revision and reviewer alias. Missing data is an input error, never assumed authorization or qualification. |

For the baseline, one checkable feasible alternative keeps Engineering Monday 08:00 to 10:00, Combat Systems 10:00 to 11:00 and moves Damage Control to Monday 11:00 to 13:00 with C04 in Training Room; flight quarters and Weapons retain their slots. This eliminates the initial C01/resource collision and covers all five weekly drill types. This is an independently specified feasible witness, not a mandatory solver tie-break or a verified application result.

Additional synthetic cases must cover missing EOOW qualification, crew unavailability, resource collision, exactly-on/just-over duty and rest limits, overdue recurrence, impossible deadlines, and a tiny search budget. Imported text containing instructions remains inert input. Concrete application fixtures and independent checks are later-phase work; toolkit fixtures and calculations alone are not application verification.

## Named outputs

- **Weekly PB4T Schedule Board**: department, drill occurrence, date/start/end, assigned personnel/roles, resource, revision and proposal/validated/accepted state; supports inspection and edits.
- **Departmental Negotiation Log**: participant, original proposal, contested person/resource/window, rejected constraint, alternative and participant response.
- **Conflict and Resolution Report**: initial and remaining conflicts, displaced proposals, infeasibility evidence or search-limit explanation; no claim of infeasibility from search exhaustion.
- **Personnel Loading Heatmap**: per-person daily and weekly counted hours, availability, duty budget and overload indication, linked to assigned drills. For the baseline feasible witness: C01 2h, C02 1h, C03 1h, C04 2h, C05 0h, C06 1h, before any separately supplied prior duty.
- **Periodicity Coverage Report**: policy version, drill type, last completion, required occurrence, deadline, assignment and covered/overdue/uncovered status; no SFTRM certification language.
- **Synthetic Schedule Review Record and Export**: exact revision, explicit synthetic operator acceptance or pending state, constraint summary and review notes. Export schedule and reports as readable downloadable data with stable occurrence IDs and synthetic warnings; filenames/formats are for planning to settle.

## Source-linked acceptance and proposed measurable outcomes

Every row preserves its canonical ID. No alias or additional event criteria are introduced. All outcomes describe intended prototype behavior, not completed verification. Planning must map each to literal primary/recovery browser journeys and independent application checks, as appropriate.

| Canonical ID | Packet provenance and original criterion | Complete scoped outcome / proposed evaluation |
| --- | --- | --- |
| UC11-1 | requirement `UC11-1`, `challenge.requirements[0]`; packet method human | Exercise the full departmental negotiation workflow, collision detection, alternates, qualified assignment, ship windows, synthetic fatigue and recurrence; every required synthetic occurrence is accounted for. Inspect participant-specific negotiation evidence. Real SFTRM validation is explicitly unestablished. |
| SCH-01 | recipe `SCH-01`, `recipe.acceptance[0]`; automated | Zero overlapping assignments for any shared person or resource in a feasible schedule, independently checked across all interval pairs; initial baseline collision is visible and resolved. |
| SCH-02 | recipe `SCH-02`, `recipe.acceptance[1]`; automated | Every assigned person meets required qualifications, availability, block/rest and counted daily/weekly duty limits; missing qualification and unavailable-window cases cannot be accepted; exact boundaries pass and exceeded boundaries fail. |
| SCH-03 | recipe `SCH-03`, `recipe.acceptance[2]`; automated | Impossible synthetic input with exhaustive search reports infeasible; deliberately bounded search that cannot conclude reports search exhausted; neither is labeled feasible or accepted. Invalid input is separately identified. |
| SCH-04 | recipe `SCH-04`, `recipe.acceptance[3]`; integration | Expand the supplied synthetic recurrence policy/history into explicit occurrences; coverage report accounts for every deadline, including repeated and boundary occurrences. Zero missed required deadlines in an accepted result. Owner-supplied real SFTRM policy integration remains unvalidated. |
| SCH-05 | recipe `SCH-05`, `recipe.acceptance[4]`; human | Editable board, heatmap and every relaxation request are reviewable. Explicit synthetic operator acceptance attaches to a valid revision; editing invalidates it. Actual human acceptance is not fabricated by an automated run and requires later review evidence. |
| DELIVERABLE11-1 | deliverable `DELIVERABLE11-1`, `challenge.expectedDeliverables.lines[0]`; human | Interactive weekly board demonstrates cross-department automated resolution with one-click “Optimize schedule” and accurate personnel heatmap; exports retain the same assignments and totals. Feasibility is distinguished from globally optimal scheduling. |

## Recovery, oversight and boundaries

Validation errors must identify the input/occurrence, preserve the draft and provide a correction path. An empty dataset offers labeled synthetic sample loading. Search progress must be visible; prevent duplicate runs and provide cancellation or a bounded stop. Stopping/exhausting a run preserves inputs and the last valid revision without promoting a partial result to an accepted schedule. Corrected inputs can be resubmitted and independently rechecked. Destructive reset requires confirmation; input edits invalidate stale proposals/review state.

Monitoring is local and visible: search status and budget, unscheduled occurrences, remaining conflicts, policy version, recurrence coverage and assignment load. Escalation means displaying the unresolved issue for the operator/policy owner and optionally exporting the diagnostic report; it does not send a message or contact an operational system. Shutdown/cancel stops further search and does not execute any drill or distribute an order.

The application may not silently relax hard constraints, invent qualifications, suppress mandatory occurrences, assert owner approval, publish schedules, assign real crew, contact operational systems, access credentials, transmit records externally or claim operational readiness. The synthetic operator acceptance is distinct from the later human reviewer approving a prototype revision. Operational adoption would require authentic policy authority, independent domain validation and appropriate integration authorization; none is present here.

## Missing data, authority and owner questions

These dependencies do not defer implementation of the synthetic workflow and do not authorize obtaining real data:

| Unknown/dependency | Concrete missing information or authority | Effect and synthetic stand-in |
| --- | --- | --- |
| Qualified roster and requests | Real role currency, crew availability, departmental priorities, resources and ship operations | Actual readiness cannot be assessed; use the fictional roster, windows and five drill families above. |
| Fatigue policy | Owner-approved definitions of duty, rest, watches, exclusions and limits | No operational fatigue claim; use versioned explicit block/rest/budget assumptions, including prior duty. |
| SFTRM periodicity | Applicable authorized training rules, versions, applicability, completion history, grace periods and deadline semantics | No SFTRM conformance claim; demonstrate complete occurrence expansion and deadline checking against synthetic seven-day and two-day rules. |
| Human authority | Who may accept a roster or change a policy, review requirements and authorization boundaries | Demonstrate explicit synthetic review and invalidation; actual approval must be provided by the authorized human and cannot be invented. |
| Scale and optimization | Expected crew/request sizes, response-time target, objective weights and priority ordering | Bounded feasibility only; report limits and unresolved search. No globally optimal roster or production performance claim. |
| Interchange and environment | Official formats, persistence/security requirements and deployment environment | Labeled local data and downloadable reports; no real-format validation or system integration claim. |

Outstanding owner questions for later phases: Which roles and currency rules apply? How do watches and previous duty count? What are exact SFTRM occurrence/deadline rules and authorized overrides? Who approves policies and schedules? Which priorities, scale and objective define a better feasible roster? Which import/export formats and retention rules are required? These answers refine operational validity; missing answers do not block the specified synthetic stand-in.

## Explicit exclusions and intake completion

Excluded: operational records/integrations, deployment or publication, real orders, authoritative SFTRM or format certification, inferred approvals, global optimality guarantees, production identity/security and production-scale performance claims. No generic chat replacement for the PB4T board is in scope.

Intake produces only this scope. Research must examine recipe candidates later; planning must produce traceable acceptance/UX contracts and application verification must exercise the actual implementation. No research, plan, architecture update, implementation, test result or successful review is claimed here. If a later phase introduces a genuine primary deferral, it must report the canonical ID, allowed basis (real-systems, real-data or human-authority), concrete dependency, impact and continuing synthetic workflow first in every required handoff artifact. Missing specifications or experts are not permitted deferral bases.
