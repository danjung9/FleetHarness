# Acceptance and test matrix

Verification update (2026-11-04): 21 Node tests passed, zero failed/skipped; actual inline listeners run in a minimal DOM adapter, not a browser. See verification.md for per-criterion evidence and preserved failures.

Build update: application core checks have run; browser and human outcomes remain UNVERIFIED. Implemented is a scope disposition, not a browser pass. Host owns test-report.json and screenshot/trace locations. Every journey runs fresh at desktop and narrow widths, starting with baseline and no saved state. Toolkit fixtures and self-tests are not application evidence.

## UC11-1

Original requirement: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: requirement UC11-1 at `challenge.requirements[0]`. Method: human.

Expected outcome: Departmental agents negotiate the weekly calendar, resolve personnel collisions and alternate allocations under operational windows, approved qualifications and fatigue policies, and satisfy all mandated SFTRM periodicities.

Disposition: deferred. Deferred in full: four synthetic sessions demonstrate bounded feasibility only. Departmental agents/negotiation, owner-approved operational fatigue rules, interfaces and SFTRM semantics are absent.

Inputs/browser evidence: None: deferred. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: No verification: needs owner rules and a new planning scope. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: NOT RUN / UNVERIFIED. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## SCH-01

Original requirement: No personnel or shared-resource double booking.

Provenance: recipe SCH-01 at `recipe.acceptance[0]`. Method: automated.

Expected outcome: No pair sharing a person or room overlaps. Baseline A is 0 to 60, B is 90 to 150, C is 0 to 60, D is 1440 to 1500; simultaneous A/C share neither person nor room.

Disposition: implemented. 

Inputs/browser evidence: `baseline`, `collision`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Independent all-pairs person/room checker, room-only collision and separate-person concurrency. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (core.test.cjs: baseline oracle and collision/tamper checks). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## SCH-02

Original requirement: Honor availability, qualifications, rest and duty budgets.

Provenance: recipe SCH-02 at `recipe.acceptance[1]`. Method: automated.

Expected outcome: Full sessions fit operating and person windows, qualifications are covered, rest and whole-horizon budgets hold. Baseline P01 rest is exactly 30, each total 120. Rest 31, budget 119, missing Q-A and window end 1499 fail; end 1500 permits D.

Disposition: implemented. 

Inputs/browser evidence: `baseline`, `rest-budget`, `qualification`, `windows`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Full-window ends at boundary versus one minute beyond; rest 29/30/31; budgets 119/120/121 across both days; unavailable people and missing qualification. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (core.test.cjs: qualification/window/budget failures and boundary checks). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## SCH-03

Original requirement: Distinguish infeasible input from exhausted search.

Provenance: recipe SCH-03 at `recipe.acceptance[2]`. Method: automated.

Expected outcome: B start 0 only is infeasible after complete search; budget 1 reports search limit reached with feasibility unknown; budget 50000 finds B at 90.

Disposition: implemented. 

Inputs/browser evidence: `collision`, `search-limit`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Exhaustive impossible search versus maxNodes 1 and 50000; cancellation/exhaustion never proves infeasible. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (core.test.cjs: distinct statuses and final-node success). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## SCH-04

Original requirement: Preserve mandatory training periodicities.

Provenance: recipe SCH-04 at `recipe.acceptance[3]`. Method: integration.

Expected outcome: Owner recurrence rules expand into explicit mandatory occurrence IDs and due windows; every occurrence meets its deadline.

Disposition: deferred. Deferred: owner recurrence/deadline rules and SFTRM authority are absent. Four explicit sessions do not establish periodicity compliance; future integration must expand and check every occurrence.

Inputs/browser evidence: None: deferred. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: No verification: needs owner rules and a new planning scope. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: NOT RUN / UNVERIFIED. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## SCH-05

Original requirement: Have an operator accept the proposed schedule.

Provenance: recipe SCH-05 at `recipe.acceptance[4]`. Method: human.

Expected outcome: A coordinator inspects the synthetic board and loads and deliberately marks the current feasible draft reviewed. Any edit clears review. No automatic constraint relaxation is available. Actual revision acceptance remains a human review obligation.

Disposition: implemented. 

Inputs/browser evidence: `baseline`, `edit-review`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Current-revision review only, no stale/nonfeasible approval; human revision acceptance remains pending. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (application.test.cjs: deliberate review and invalidation). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## DELIVERABLE11-1

Original requirement: An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

Provenance: deliverable DELIVERABLE11-1 at `challenge.expectedDeliverables.lines[0]`. Method: human.

Expected outcome: An interactive weekly departmental board resolves cross-department conflicts with one-click objective-based schedule optimization and personnel loading heatmaps.

Disposition: deferred. Deferred in full: this two-day feasibility draft and totals are not a weekly departmental optimization board or heatmaps. Objectives, negotiation and operational calendar integrations are absent.

Inputs/browser evidence: None: deferred. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: No verification: needs owner rules and a new planning scope. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: NOT RUN / UNVERIFIED. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## USER11-1

Original requirement: Shows all four synthetic requests A, B, C and D and the whole-horizon minutes for each person.

Provenance: user USER11-1 at `userScope.criteria[0]`. Method: human.

Expected outcome: All four baseline intervals and fixed assignments appear, with P01 and P02 each 120 minutes across both days.

Disposition: implemented. 

Inputs/browser evidence: `baseline`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Exact complete A to D set, baseline arithmetic and totals. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (core.test.cjs: baseline exact intervals and totals). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## USER11-2

Original requirement: Every result is computed from the current input, with no canned answer, and valid edits recompute it.

Provenance: user USER11-2 at `userScope.criteria[1]`. Method: human.

Expected outcome: Current inputs drive computation. Editing D duration 60 to 30 recomputes end 1470 and P02 total 90; editing a window can make the problem infeasible with no stale current draft.

Disposition: implemented. 

Inputs/browser evidence: `edit-review`, `windows`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Generated valid edits beyond baseline and browser-embedded core equivalence with Node module. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (core.test.cjs: current-input edits; packaging.test.cjs: embedded parity). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## USER11-3

Original requirement: Feasible, infeasible, invalid input and search limit reached are four distinct, plainly worded outcomes.

Provenance: user USER11-3 at `userScope.criteria[2]`. Method: human.

Expected outcome: Feasible draft, Infeasible, Invalid input, and Search limit reached with feasibility unknown are distinct plainly worded outcomes matching the literal journey messages.

Disposition: implemented. 

Inputs/browser evidence: `baseline`, `invalid`, `collision`, `search-limit`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: All four status variants from real application functions and UI. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (core.test.cjs: four outcome variants). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## USER11-4

Original requirement: Never drops or reassigns a request, relaxes a limit or invents a qualification to make a draft fit.

Provenance: user USER11-4 at `userScope.criteria[3]`. Method: human.

Expected outcome: Search keeps A to D, exact people/rooms, qualification requirements and limits; impossible cases retain the problem rather than dropping requests, reassigning or silently relaxing constraints.

Disposition: implemented. 

Inputs/browser evidence: `collision`, `qualification`, `rest-budget`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Deep input immutability, exact fixed assignments, no partial successful schedules, no relaxed limits. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (core.test.cjs: immutability and identity validation). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## USER11-5

Original requirement: Invalid input keeps an actionable error, and infeasibility keeps all requests for correction.

Provenance: user USER11-5 at `userScope.criteria[4]`. Method: human.

Expected outcome: B duration 0 stays entered with an actionable positive-whole-number error. Impossible B starts retain four requests. Correction recovers feasibility; failed import preserves current work.

Disposition: implemented. 

Inputs/browser evidence: `invalid`, `collision`, `bad-import`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Raw invalid draft retention, failed import preservation, successful correction. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (core.test.cjs: invalid input; application.test.cjs: import rejection). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## USER11-6

Original requirement: A person can mark the current draft reviewed, and any relevant edit clears that review.

Provenance: user USER11-6 at `userScope.criteria[5]`. Method: human.

Expected outcome: Review is bound to the current checked feasible inputs and draft. Relevant edits clear review immediately; imported content never restores trusted review.

Disposition: implemented. 

Inputs/browser evidence: `edit-review`, `portable`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Every input-category edit, recompute and import invalidate review; no stale/nonfeasible review. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (application.test.cjs: review reducer). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## USER11-7

Original requirement: Save and import round-trips the exact inputs and draft, and the app works offline from one self-contained index.html.

Provenance: user USER11-7 at `userScope.criteria[6]`. Method: human.

Expected outcome: Version-1 synthetic JSON round-trips exact structured inputs and draft. Saved D duration 30 recovers after reload and import with end 1470 and P02 load 90. One self-contained index.html works offline without external assets. Node deep-equality round-trip and manual local-file reopen supplement the browser journey.

Disposition: implemented. 

Inputs/browser evidence: `portable`, `bad-import`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Deep exact serialization/import round-trip, candidate order, malformed/foreign/oversized/tampered snapshots, storage failures and offline embedded-core execution. Manual file close/reopen pending. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (application.test.cjs: exact portable round-trip; packaging.test.cjs: embedded execution). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## USER11-8

Original requirement: The app and README state the omissions listed in the brief and label everything synthetic and not an issued schedule.

Provenance: user USER11-8 at `userScope.criteria[7]`. Method: human.

Expected outcome: App and practical README label synthetic practice and not an issued schedule and contain all omissions, limited feasibility and owner-policy warnings in the literal limitations journey.

Disposition: implemented. 

Inputs/browser evidence: `limitations`. Exact input values and literal assertions are frozen in acceptance-plan.json.

Application tests: Compare actual README with download and UI omissions; human clarity review pending. See core.test.cjs, application.test.cjs, packaging.test.cjs and ui.test.cjs for the checks that actually ran; deferred items have no implementation test.

Result: Local application checks PASS where covered (README.md and index.html disclosures; browser download assertion pending). Browser, manual and human checks UNVERIFIED. See verification.md for coverage limits; planned cases beyond current Node coverage remain pending. Evidence reserved: host test-report.json, per-journey desktop/narrow screenshots and traces, Node output; additional/manual findings in verification.md.

## Boundary checks, risks and human requirements

Tests must call actual application functions and independently check every pair and load total. Test half-open touching with zero rest, positive-rest shortfall, operating and availability full containment, room-only collision, missing qualifications, multi-day totals, empty starts, unsafe integers, negative limits, malformed/reversed windows, and unknown/duplicate/missing request IDs. Tampered imports must not forge fixed assignments or review. Embedded and Node core behavior must agree on generated inputs; source-string matching alone is insufficient.

Host browser checks cover specified interactions, not complete usability/accessibility or operational fitness. Inspect keyboard flow, narrow layouts, real offline file open and close/reopen recovery manually. Missing browser runtime is a verification failure. Planner arithmetic reduces implementation drift but is not SME ground truth.

Owner-approved fatigue, qualification authority, SFTRM recurrence/deadlines, optimization objectives, negotiation authority and operational interfaces remain missing. No credentials, live systems, calendar writes or real readiness data. Human acceptance must identify the exact source revision; an in-app review marker is not external prototype approval. RequirementsMet remains false while source criteria are deferred.
