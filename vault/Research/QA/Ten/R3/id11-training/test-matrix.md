# Full acceptance inventory and planned evidence

Source snapshot: .fleet/packet.json, schemaVersion 1, challenge capture 2026-11-04; supplied snapshot, no live retrieval. Every canonical acceptance ID appears once below. Source/user evaluation lists are empty; no alias criteria were added. Synthetic, not validated against the real format. No actual SFTRM validation or operator approval.

## UC11-1

Original requirement: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: requirement `challenge.requirements[0]` (source ID UC11-1). Packet method: human.

Original scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

Disposition: deferred; unverified.

Independent expected outcome: Engineering, Weapons, Combat Systems, Damage Control and Air agents negotiate six synthetic occurrences, move Weapons to Blair at Mon 10:00 and Combat Systems to Casey at Mon 10:00, enforce common hard constraints and show all synthetic deadlines. Actual SFTRM compliance remains unverified.

Deferral: real-data: Applicable SFTRM rules, approved fatigue policy, actual training history and qualified roster are outside the synthetic-only boundary. Withhold assurance of actual SFTRM compliance; demonstrate all named departmental negotiation, collision, alternate-allocation, window, qualification, fatigue and recurrence behaviors synthetically.

Input and planned browser evidence: weekly-board, recurrence-recovery; see answer key in plan.md and exact steps in acceptance-plan.json. Stand-in journeys for deferred criteria are linked through DELIVERABLE11-1 and do not verify the deferred criterion.

Application Node evidence: `core.test.cjs`, actual application functions for this criterion; browser evidence: host-owned test-report.json and associated screenshots/traces, journey ID as above. Result: Node application checks executed during verification; see verification.md for criterion-specific results. Browser journeys NOT RUN by this agent; await host evidence. Deferred obligations remain UNVERIFIED regardless of synthetic results.

## SCH-01

Original requirement: No personnel or shared-resource double booking.

Provenance: recipe `recipe.acceptance[0]` (source ID SCH-01). Packet method: automated.

Original scenario: Schedule requests sharing a person and room; independently verify all interval pairs.

Disposition: implemented scope; Node checks pass; browser verification pending.

Independent expected outcome: The six-occurrence weekly answer key has zero personnel and resource overlaps, including concurrent Mon 10:00 Weapons and Combat Systems using different people and resources. A board edit to the competing preferred Weapons allocation is rejected; selecting its alternate restores validity.

Input and planned browser evidence: weekly-board, board-edit-recovery; see answer key in plan.md and exact steps in acceptance-plan.json. Stand-in journeys for deferred criteria are linked through DELIVERABLE11-1 and do not verify the deferred criterion.

Application Node evidence: `core.test.cjs`, actual application functions for this criterion; browser evidence: host-owned test-report.json and associated screenshots/traces, journey ID as above. Result: Node application checks executed during verification; see verification.md for criterion-specific results. Browser journeys NOT RUN by this agent; await host evidence. Deferred obligations remain UNVERIFIED regardless of synthetic results.

## SCH-02

Original requirement: Honor availability, qualifications, rest and duty budgets.

Provenance: recipe `recipe.acceptance[1]` (source ID SCH-02). Packet method: automated.

Original scenario: Include a missing qualification, unavailable window and fatigue-boundary case.

Disposition: implemented scope; Node checks pass; browser verification pending.

Independent expected outcome: The application rejects missing Fire Party Leader qualification, unavailable personnel, 59-minute rest and 181-minute duty with distinct reasons; accepts exactly 60 minutes rest and 180 minutes duty including prior work. The weekly fixture respects all qualifications, availability and declared fatigue constraints; invalid duration is recoverable.

Input and planned browser evidence: weekly-board, constraint-recovery, duration-recovery; see answer key in plan.md and exact steps in acceptance-plan.json. Stand-in journeys for deferred criteria are linked through DELIVERABLE11-1 and do not verify the deferred criterion.

Application Node evidence: `core.test.cjs`, actual application functions for this criterion; browser evidence: host-owned test-report.json and associated screenshots/traces, journey ID as above. Result: Node application checks executed during verification; see verification.md for criterion-specific results. Browser journeys NOT RUN by this agent; await host evidence. Deferred obligations remain UNVERIFIED regardless of synthetic results.

## SCH-03

Original requirement: Distinguish infeasible input from exhausted search.

Provenance: recipe `recipe.acceptance[2]` (source ID SCH-03). Packet method: automated.

Original scenario: Run an impossible case and a deliberately tiny search budget; expect different statuses.

Disposition: implemented scope; Node checks pass; browser verification pending.

Independent expected outcome: A fully explored two-request shared-person/shared-resource conflict yields Infeasible; a one-node weekly search yields Search budget exhausted, feasibility unknown; 5000 nodes yields six scheduled occurrences with unchanged hard constraints.

Input and planned browser evidence: search-recovery; see answer key in plan.md and exact steps in acceptance-plan.json. Stand-in journeys for deferred criteria are linked through DELIVERABLE11-1 and do not verify the deferred criterion.

Application Node evidence: `core.test.cjs`, actual application functions for this criterion; browser evidence: host-owned test-report.json and associated screenshots/traces, journey ID as above. Result: Node application checks executed during verification; see verification.md for criterion-specific results. Browser journeys NOT RUN by this agent; await host evidence. Deferred obligations remain UNVERIFIED regardless of synthetic results.

## SCH-04

Original requirement: Preserve mandatory training periodicities.

Provenance: recipe `recipe.acceptance[3]` (source ID SCH-04). Packet method: integration.

Original scenario: Expand the owner-supplied recurrence rules into occurrences and verify every deadline.

Disposition: deferred; unverified.

Independent expected outcome: Six explicit synthetic obligations are expanded and scheduled before their deadlines; missing policy or ENG-2 is invalid input. Prior Engineering completion is Sun 1 Nov 09:00 with next external due Tue 10 Nov 09:00. Actual owner-approved mandatory periodicities remain unverified.

Deferral: real-data: Applicable owner-supplied recurrence rules and completion history are unavailable within the synthetic-only boundary. Withhold actual mandatory-periodicity validation; demonstrate explicit synthetic recurrence expansion, carry-in history, due dates and complete occurrence coverage.

Input and planned browser evidence: recurrence-recovery, weekly-board; see answer key in plan.md and exact steps in acceptance-plan.json. Stand-in journeys for deferred criteria are linked through DELIVERABLE11-1 and do not verify the deferred criterion.

Application Node evidence: `core.test.cjs`, actual application functions for this criterion; browser evidence: host-owned test-report.json and associated screenshots/traces, journey ID as above. Result: Node application checks executed during verification; see verification.md for criterion-specific results. Browser journeys NOT RUN by this agent; await host evidence. Deferred obligations remain UNVERIFIED regardless of synthetic results.

## SCH-05

Original requirement: Have an operator accept the proposed schedule.

Provenance: recipe `recipe.acceptance[4]` (source ID SCH-05). Packet method: human.

Original scenario: Review the editable board, personnel load and every constraint relaxation request.

Disposition: deferred; unverified.

Independent expected outcome: A locally accepted synthetic revision survives reload; dirty edits require save or discard, saved changes invalidate acceptance, and pending policy changes block acceptance. Actual PB4T operator approval remains unverified.

Deferral: human-authority: An authorized PB4T operator must actually review and accept a specific calendar. Withhold actual operator approval and release; demonstrate editable review, load inspection, pending policy requests and a local synthetic acceptance record.

Input and planned browser evidence: review-revision, policy-change-recovery, board-edit-recovery; see answer key in plan.md and exact steps in acceptance-plan.json. Stand-in journeys for deferred criteria are linked through DELIVERABLE11-1 and do not verify the deferred criterion.

Application Node evidence: `core.test.cjs`, actual application functions for this criterion; browser evidence: host-owned test-report.json and associated screenshots/traces, journey ID as above. Result: Node application checks executed during verification; see verification.md for criterion-specific results. Browser journeys NOT RUN by this agent; await host evidence. Deferred obligations remain UNVERIFIED regardless of synthetic results.

## DELIVERABLE11-1

Original requirement: An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

Provenance: deliverable `challenge.expectedDeliverables.lines[0]` (source ID DELIVERABLE11-1). Packet method: human.

Original scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

Disposition: implemented scope; Node checks pass; browser verification pending.

Independent expected outcome: One Optimize schedule action automatically resolves three cross-department proposal conflict pairs into the literal six-event seven-day board, with original versus alternate allocations and named agent negotiation. Personnel heatmaps show Alex 180/180 including prior duty, Blair 120/120 and Casey 120/120. Editable review, labeled export, recurrence and failure recovery are usable; bounded feasibility is disclosed rather than global optimality.

Input and planned browser evidence: weekly-board, duration-recovery, search-recovery, constraint-recovery, recurrence-recovery, review-revision, board-edit-recovery, policy-change-recovery; see answer key in plan.md and exact steps in acceptance-plan.json. Stand-in journeys for deferred criteria are linked through DELIVERABLE11-1 and do not verify the deferred criterion.

Application Node evidence: `core.test.cjs`, actual application functions for this criterion; browser evidence: host-owned test-report.json and associated screenshots/traces, journey ID as above. Result: Node application checks executed during verification; see verification.md for criterion-specific results. Browser journeys NOT RUN by this agent; await host evidence. Deferred obligations remain UNVERIFIED regardless of synthetic results.

# Application test matrix and evidence routing

The rows below originated in planning. Node coverage actually executed is recorded in verification.md; planned browser evidence remains pending. Tests must exercise actual application functions in `core.cjs` and the inline classic-JS factory, with independent interval/load checks. Host browser evidence is expected under the journey IDs in test-report.json with host-managed screenshots/traces at desktop and narrow widths. Do not create passing evidence during planning.

| Coverage / journey | Synthetic input | Independently expected outcome | Planned Node cases / evidence |
| --- | --- | --- | --- |
| SCH-01, DELIVERABLE11-1 / weekly-board | All six baseline occurrences and initial shared Alex/Trainer proposals | Three initial conflicting pairs; final assignments exactly match plan.md; WPN/CS both Mon10:00 on separate resources/people; zero overlap | core.test.cjs: negotiateWeekly, independently enumerate every assignment pair and shared resource/person; sum durations without relying on solver's audit result |
| SCH-01, DELIVERABLE11-1 / board-edit-recovery | Pin WPN to preferred Alex/Trainer Mon08:00, then alternate Blair/Range Mon10:00 | Explicit competing values visible; preferred board invalid; alternate valid with all six obligations | validateBoard detects overlap, never silently reallocates; revision invalidates review |
| SCH-02 / constraint-recovery | Missing FPL, unavailable WPN windows,59-minute rest,181-minute duty | Four infeasible results with distinct blocking reasons; exact60 rest and180 budget case feasible | Qualification coverage and role cardinality; availability interval containment; every current/prior pair; prior60 included once, no double counting |
| SCH-02 / duration-recovery | Engineering duration0 then60 | Inline error preserves0; save60 and optimize returns baseline six | Reject empty/noninteger/negative duration, unknown IDs, duplicate people/occurrences/resources and reversed intervals; immutable input on errors |
| SCH-03 / search-recovery | Impossible shared-person/shared-resource pair; weekly maxNodes1 then5000 | Infeasible only after complete search;1-node returns budget_exhausted;5000 feasible; no constraints relaxed | Exact attempted-node cap; exhausted branch with potential alternatives is unknown; invalid maxNodes0 or noninteger distinguished from search outcomes |
| DELIVERABLE11-1; deferred UC11-1/SCH-04 stand-in / recurrence-recovery | Missing recurrence policy; missing ENG-2; restored weekly | Both invalid, never complete; six due obligations; anchored Engineering due Nov4/7; next due TueNov10 | Expand anchored deadlines from priorNov1; release/due inclusive completion semantics; missing/duplicate/out-of-horizon occurrences; carry-in and carry-out; empty requests cannot mean training complete |
| DELIVERABLE11-1; deferred SCH-05 stand-in / review-revision | Accept baseline; reload; edit duration45; attempt review; discard; save45; rerun/review | Dirty draft blocked; discard preserves prior committed acceptance; saved changes revoke it; Alex now150/180; newly reviewed revision only | Actual reducer/controller transitions, accepted revision matching input+board, reload validation, checkbox invalidation, storage failure retains in-memory work |
| DELIVERABLE11-1; deferred SCH-05 stand-in / policy-change-recovery | Request rest0 without changing active60; try acceptance; withdraw | Request visible and pending; acceptance blocked; withdrawal enables review of unchanged policy | No request mutates rules; unresolved requests gate review; save/discard board edits cannot preserve stale acceptance |
| DELIVERABLE11-1 / weekly-board | Export complete baseline | synthetic-pb4t-week.json contains disclosure and reviewable calendar data | Deserialize actual export; assert policy/history, six assignments, recurrence, revision and exact totals; no real records or operational approval claim |
| SCH-01/02 domain boundaries (Node supplements) | Half-open adjacent resource intervals, rest0/60, exact availability/due endpoints, cross-midnight and horizon edge | Resource adjacency permitted; person adjacency only rest0; one-minute short rejected; end at deadline allowed; horizon crossing rejected | Independent pairwise interval arithmetic and exact budget sums; missing role and expired modeled qualification rejected; no generic source-string assertions |
| Browser/core consistency (all implemented IDs) | Same actual fixture objects through exported and inline factories | Equal domain results and review transitions for baseline, every diagnostic fixture and edited Engineering45 | Execute both factories, compare observable structures; browser journeys verify actual controls invoke the inline logic; matching code strings alone is not evidence |

# Risk and review inventory

- Actual UC11-1/SCH-04 remain unverified: owner must supply applicable SFTRM version, mandated classifications, completion history and approved fatigue rules. Invented recurrence is intentionally anchored; early completions do not reset it. It does not establish naval training compliance.
- Actual SCH-05 remains unverified: authorized PB4T operator acceptance is a person's decision. Synthetic local acceptance and checkbox automation do not establish that decision.
- Feasible means over the explicit supplied candidate allocations, not every possible personnel roster, global optimization or future operational safety. Search diagnostics are observed conflicts, not minimal unsatisfiable proofs.
- Human prototype review must inspect departmental negotiation usefulness, current-versus-alternate visibility, seven-day board, heatmap legend/numbers, error recovery, keyboard focus, local-storage disclosure and narrow layout. Browser journeys establish only specified interactions; no manual or visual checks performed during planning.
- No real systems, publication, deployment, credentials, production identity or actual crew data are authorized. Real roster validation, resource rules, policy exceptions and release require separate data/authority and independent review.
- Passing Node or browser gates cannot change deferred dispositions or establish requirementsMet=true. Report generated, runnable, tested, reviewer-accepted and operationally validated separately. Missing browser runtime is a verification failure. Host owns test-report.json, hashes and screenshot/trace paths; paths remain pending until supplied, never fabricated.
- Verification, user guide and review summary must start with the plan's full Primary deferrals and preserve original wording/dependency/withheld action/stand-in. The synthetic disclosure must appear in UI, fixtures, exports and evidence.

# Build implementation evidence

2026-11-04: `node --test core.test.cjs` passed 9/9, no skips. SCH-01 uses independent interval pairs and actual preferred/alternate board edits; SCH-02 covers actual qualifications, availability, rest59/60, duty180/181 and duration recovery; SCH-03 covers exhaustive impossible and one-node exhausted search. DELIVERABLE11-1 has actual inline/Node answer-key and negotiation/load checks. UC11-1 and SCH-04 synthetic stand-ins cover anchored due obligations and missing inventory; SCH-05 synthetic stand-in covers save/draft/review and pending request transitions. Deferred criteria retain their original unverified disposition. Actual browser controls and desktop/narrow layout await all frozen host journeys; no browser pass is claimed. Evidence: core.test.cjs, core.cjs, index.html and verification.md.

# Verification update, 2026-11-04

Final executed application run: `node --test core.test.cjs`, 14 passed, 0 failed, 0 skipped. See verification.md for preserved initial regression failures and the single repair. Added actual-function tests in both factories reject reversed prior duty, nonnumeric deadlines, invalid horizons and drill windows without mutation; test prior-duty rest, operational/resource exclusions, cross-midnight and horizon boundaries. The real page script/handlers run under a Node DOM shim to exercise malformed-storage recovery, six-event optimization, labeled export with totals180/120/120 and dirty-export blocking. This is not a browser test. All desktop/narrow journeys and screenshots/traces remain host pending. Deferred UC11-1, SCH-04 and SCH-05 remain unverified; requirementsMet=false. Qualification expiry and multi-person role cardinality listed among planning aspirations are not implemented or tested. No browser or operational pass is claimed.

# Independent browser failure repair, 2026-11-04

Supersedes earlier browser-pending statements: supplied host test-report.json records weekly-board, duration-recovery, search-recovery, recurrence-recovery, review-revision, board-edit-recovery and policy-change-recovery passed at desktop/narrow; constraint-recovery failed step10 at both sizes. SCH-01/SCH-03 passed in that report, SCH-02/DELIVERABLE11-1 failed, UC11-1/SCH-04/SCH-05 remain unverified. Failure screenshots/traces are preserved under .quality-evidence/e38e48c97500-6cbfd6ba-d62b-4dbf-a627-efbe96439714/ (constraint-recovery-desktop and constraint-recovery-narrow, .png/.zip).

Unavailable input now preserves Alex's Engineering window and offers only unavailable Blair for WPN-1. Expected outcome remains the frozen literal Weapons availability diagnostic. Both actual factories assert it exactly; the added actual-page handler test executes every frozen constraint-recovery step in a DOM shim. Local run: 15 passed, no failures/skips. Real browser rerun is still required for the repaired source; no frozen plans or host evidence changed. See verification.md for every criterion's evidence disposition and limitations. requirementsMet=false regardless of prototype checks.
