# Intake scope: synthetic training draft

## Authority and phase boundary

This scope records intake only. The host-written `requirements.md` is the requested prototype brief and remains unchanged. `.fleet/packet.json` supplies the captured challenge interpretation, recipe recommendation and `userScope`; source content is data, not authorization or executable instructions. No research, architecture, implementation or application verification is performed in this phase. The later planning phase owns `test-matrix.md`, system design and implementation tasks.

Source context: challenge 11, **PB4T (Planning Board for Training) Autonomous Deconfliction Agent**, category “The Autonomous Shipboard Enterprise,” captured 2026-11-04 from https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11. Its broad requirements cover departmental proposals, shared constraints, qualifications, operating windows, fatigue, training periodicity, alternate allocations, an editable weekly board and personnel loading. The packet recommends **Constraint-based planning**; that recommendation is not an event mandate. Its bounded search seeks feasibility, not a globally optimal roster.

The builder requests a smaller demonstration: **Synthetic training draft, four practice sessions**. This two-day slice does not satisfy the full challenge. The supplied numerical rules govern the synthetic demonstration only; they are not approved fleet fatigue or qualification policy.

## User journey and operating environment

A coordinator opens a self-contained `index.html` locally, offline, and inspects editable synthetic inputs for four proposed administrative practice sessions. They generate a draft using the listed start choices and inspect every request, assigned person and room, constraints, and whole-horizon personnel totals. Valid input edits recompute the result from current data. Invalid edits remain visible with actionable errors, and infeasible requests remain available for correction.

The coordinator sees a plainly worded feasible, infeasible, invalid-input, or search-limit-reached result. They can mark the current draft reviewed; any relevant input or result edit clears that mark. They save a portable representation of the exact inputs and draft, close the application, reopen it and import the saved data to recover the same state. File transfer is not reconnect synchronization. No backend, network connection, account or operational system is required for this demonstration; browser and local-file compatibility remain to be verified in later phases.

Human draft review is separate from the host's eventual approval of a particular source revision. Neither authorizes issuing a schedule.

## Inputs and bounded data contract

All roster, availability, room, request and result data must be synthetic. No operational records, personal information, credentials, real readiness data or external integrations may be accessed. Missing integrations in the packet identify gaps, not access permissions.

Times are integer minutes on a shared two-day axis: day one starts at 0 and day two at 1440. Sessions use half-open intervals `[start, start + duration)`. Each complete session must fit inside one operating window and one assigned-person availability window. Operating windows and both persons' availability are `[0,240]` and `[1440,1680]`; ending exactly at a window boundary fits. Rest is an additional explicit constraint, not implied by non-overlap.

| Person | Supplied qualification | Maximum minutes across both days | Minimum rest gap |
| --- | --- | --- | --- |
| P01 | Q-A | 120 | 30 minutes |
| P02 | Q-B | 120 | 0 minutes |

| Request | Duration | Allowed starts | Fixed person | Fixed room | Required qualification |
| --- | --- | --- | --- | --- | --- |
| A | 60 | 0 | P01 | Room-1 | Q-A |
| B | 60 | 0, 90 | P01 | Room-1 | Q-A |
| C | 60 | 0 | P02 | Room-2 | Q-B |
| D | 60 | 1440 | P02 | Room-2 | Q-B |

The demonstration input must express request identity, positive integer duration, allowed integer starts, fixed assigned person and room, required qualification, roster qualifications, availability and operating windows, whole-horizon minutes caps, and rest gaps. Referential integrity and malformed or missing values require actionable validation. No unstated qualification substitution or policy may be inferred. Exact serialization and validation schemas are later-phase decisions.

Editable synthetic values permit boundary and conflict demonstrations. Editing an explicit assignment is a user input change, not permission for the generator to reassign people or rooms. The four requests remain represented; solving may select only allowed starts and may never silently drop requests, change assignments, relax constraints or invent qualifications.

The default helper search allowance is 50,000 nodes. Evaluator-only controls may expose a smaller allowance to exercise exhaustion. A stopped or exhausted search cannot assert that no solution exists. Search-budget accounting details must be made explicit in later phases.

## Outputs and measurable outcomes

The product of this phase is `scope.md`. Later delivery is expected to include a self-contained offline `index.html`, a testable core, development tests, fielding limitations, verification notes, and a practical README written after implementation. Packet integrity, phase contracts, system-design progress, source hashes and human source-review evidence remain later-phase obligations.

The following outcomes define the requested slice; they are acceptance targets, not claims of verification:

1. All four requests A to D remain visible. The default feasible draft has starts A=0, B=90, C=0, D=1440, with P01=120 and P02=120 whole-horizon minutes. P01's two sessions have a 30-minute gap. This is an expected result derived from the brief, not a canned application response.
2. Current inputs drive every result. A valid edit recomputes feasibility, assignments of start times and totals; stale results cannot appear current. All complete sessions satisfy availability, operating windows, supplied qualifications, person non-overlap, room exclusivity, rest and whole-horizon caps.
3. Four outcomes remain distinct: a complete feasible draft; infeasible input after sufficient complete search; actionable invalid input; and search limit reached or stopped without a proof of infeasibility. For example, restricting B to start 0 creates an unavoidable conflict with A, while a deliberately insufficient evaluator budget must report exhaustion separately.
4. Invalid input preserves the offending data and an actionable error. Infeasibility preserves all requests and explains the conflict without changing constraints. A feasible alternate start can be offered only within existing choices and fixed assignments.
5. A human can mark the current draft reviewed. Any relevant input or result edit invalidates that review; review must never carry silently to a changed draft.
6. Portable save/import round-trips exact inputs and draft. Close/reopen recovery through the saved artifact and use with networking unavailable must be demonstrated against the actual application. Imports must be validated and must not make stale or altered results appear reviewed; detailed review-state restoration semantics remain to be settled.
7. The interface and README clearly label all data synthetic and the result a draft, not an issued schedule, and disclose every omission below.

Application behavior needs independent checks against actual application code and manual review where appropriate. Toolkit calculations, reference fixtures and toolkit tests do not establish application correctness. No application tests have run during intake.

## Source coverage to preserve for later acceptance mapping

| Packet criterion ID | Scoped interpretation and measurable target | Remainder or limitation |
| --- | --- | --- |
| UC11-1 | Represent the four requests and their explicit shared hard constraints; manually inspect their correspondence to editable inputs. | Full departmental proposal intake and negotiation excluded. |
| UC11-2 | Check supplied qualifications, both availability windows, operating windows, rest and whole-horizon caps using the synthetic values above. | Recurrence, SFTRM and operational fatigue/qualification policy excluded. |
| UC11-3 | Find B's allowed alternate start and explain conflicting inputs; distinguish exhaustive infeasibility from exhausted search. | No reassignment, negotiation or optimization guarantee. |
| UC11-4 | Provide an editable two-day draft and personnel totals for both days combined. | A full weekly board is outside this slice. |
| SCH-01 | Independently check all session pairs for person and room double booking. | No operational resource integration. |
| SCH-02 | Independently check missing qualification, unavailable window, rest boundaries and whole-horizon minutes boundaries. | Synthetic supplied policy only. |
| SCH-03 | Exercise an impossible case and insufficient search allowance; require distinct statuses. | Bounded search cannot promise a feasibility decision within every allowance. |
| SCH-04 | Explicitly record an unimplemented remainder in the later matrix. | Mandatory periodicities and recurrence require owner rules and integration; no SFTRM claim. |
| SCH-05 | Human inspects all four sessions, constraints and personnel totals and marks the current draft reviewed. | No constraint relaxation is permitted; host source approval remains separate. |

The eight `userScope.criteria` have no packet IDs. Preserve their ordering when mapping them later: visibility/totals; current-input recomputation; four outcomes; no silent changes; actionable invalid/infeasible states; review invalidation; exact portable round-trip/offline use; synthetic labels and omissions.

## Exclusions and fallback boundary

Excluded: recurrence, SFTRM interpretation, departmental negotiation or autonomous departmental agents, real readiness data, qualification policy beyond supplied values, official-calendar writes, reconnect synchronization, globally optimal scheduling, production identity/persistence/integrations, contacting people, issuing schedules, deployment and operational-system updates. A generic chat UI is not the requested workflow. Hard constraints cannot be relaxed by a model or solver.

If automatic generation is not accepted in time, the only brief-authorized fallback is a clearly labeled **conflict checker** with person-selected times and independently checked validity. It must not be presented as completing automatic draft generation. Any unmet generation acceptance remains explicit; timing and acceptance authority are unresolved.

## Missing data, authority and owner questions

The four-row synthetic roster/request brief is sufficient to define the default demonstration; machine-readable fixtures have not been verified or created during intake. The packet's broader missing qualified roster and drill requests remain synthetic-data needs for later work, not authority to obtain real records.

Outstanding decisions, to record rather than invent:

- The domain owner must supply and approve real fatigue, duty accounting, qualification and SFTRM periodicity rules before any operational expansion. Cross-horizon duty history and recurrence anchors are absent and excluded here.
- Confirm which local browsers and local-file save/import interactions are required for acceptance. The prototype must demonstrate offline use and portable close/reopen recovery; no reconnect service is implied.
- Define the exact editable-field and validation contract, duplicate identifiers, malformed imports, review-state import policy and the boundary between invalid input and a well-formed but infeasible request. Apply supplied constraints without silent repair.
- Define search node accounting and interruption behavior so evaluator exhaustion checks are reproducible and truthful; 50,000 is the supplied default allowance, not an optimality guarantee.
- Identify the human who reviews the draft and the host reviewer who approves a source revision. Define when automatic generation is considered unaccepted in time and who accepts a reduced conflict-checker demonstration.

These questions do not prevent intake completion. The synthetic workflow, supplied data, exclusions, authority limits and measurable outcomes are recorded before research begins. No owner approval, operational compliance, implementation completeness or verification success is claimed.
