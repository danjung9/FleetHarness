# Verification evidence and host handoff

Verification phase, 4 November 2026. Application generated; local Node checks executed. Host verification, browser evidence, reviewer acceptance and operational validation are separate and pending. `requirementsMet` is false: UC11-1, SCH-04, SCH-05 and DELIVERABLE11-1 remain deferred under the unchanged frozen plans.


## Verification-phase execution

Executed `node --test scheduler.test.cjs` on Node v26.0.0. Baseline: **12 passed, 0 failed, 0 skipped**. After adding adversarial coverage: **15 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo** (107.334167 ms reported total). These are actual local application tests, not host-run evidence. No implementation changes were needed during verification; `index.html` and `scheduler-core.cjs` remain unchanged. The earlier build diagnostic failure and correction are preserved below; this phase has not attempted another implementation repair.

Added tests in `scheduler.test.cjs`:

- V1 (line 121): 216 exhaustive two-request models vary rest 0/30/31, duty 119/120/121, availability end 600/689/690, same/different exact personnel, same/different exclusive resources and qualification coverage. An independently structured oracle enumerates every candidate tuple without calling application search/audit predicates. Every status agrees; returned feasible allocations also satisfy the oracle and application audit. This is a bounded family, not a proof over all inputs.
- V2 (line 141): forced backtracking moves the earlier Damage Control request to 630 while Engineering takes 540; four attempted placements. Conflicting immutable prior commitments are rejected, a 30-minute prior-rest boundary succeeds, and 29 minutes fails.
- V3 (line 153): serialization/restoration retains unfinished work and prevents solve/accept until discard/save. Discard requires fresh acknowledgement. A revision-1 proposal replayed into revision 2 is rejected both by acceptance and restore. Forging the stored dirty flag cannot hide changed draft content.

Source inspected: `index.html` lines 23 to 42 validation; 44 to 63 loading and independent audit; 65 to 78 bounded search; 81 to 87 draft/save/review/restore; 93 to 105 editor and storage wiring; 107 to 116 board rendering; 118 to 129 sample confirmation, busy controls, save/solve/review/export handlers. `scheduler-core.cjs` executes the designated inline core and the UI binds the same `PB4TCore`; no parallel browser solver exists. This review is source inspection, not rendered browser evidence.

### Criterion-to-evidence mapping

| Criterion | Verification application evidence | Browser/human status |
| --- | --- | --- |
| UC11-1 | No collaborating agents or authoritative fatigue/SFTRM implementation; domain tests demonstrate only the declared slice | Deferred / unverified |
| SCH-01 | N1/N2/N6/N7/N8 plus V1/V2: exact allocations, personnel/resource collisions, every relevant pair, backtracking and immutable commitments | Node PASS; `resolve-collision`, `review-revision` NOT RUN at desktop and narrow |
| SCH-02 | N3/N4/N6 plus endpoint supplemental test and V1/V2: availability, qualification union, operating windows, rest and total horizon duty | Node PASS; `recover-qualification`, `recover-availability`, `recover-fatigue` NOT RUN at both viewports |
| SCH-03 | N5/N9/validation cases and V3: finite impossibility versus exhaustion versus invalid input; no partial acceptance or stale revision replay | Node PASS; `recover-exhaustion`, `recover-impossible`, `recover-invalid` NOT RUN at both viewports |
| SCH-04 | No owner recurrence rules, applicability/history or expansion engine | Deferred / unverified |
| SCH-05 | N9/N11/V3 test local review mechanics only; no authorized operator review | Deferred / unverified |
| DELIVERABLE11-1 | Source supplies board and load display; feasibility engine has no optimization objective | Deferred / unverified |

### Completion gate and README review

`requirementsMet: false`. Node gate PASS with no skipped tests. Browser gate **NOT PASSED / UNVERIFIED**: no browser runtime/tool or host result is supplied in this phase. All eight frozen journeys require desktop and narrow execution (16 journey/viewport combinations). No screenshots, traces, browser console or layout-overflow results were available to inspect. `test-report.json`, host source hashes and browser evidence remain exclusively owned by the harness and were not created or edited here.

README quick start and sample walkthrough were checked against source labels, sample inputs, application-function outcomes and export code. The documented Node command was exercised. Opening the file, actual clicks/keyboard focus, native replacement dialog Cancel/Escape, reload/localStorage persistence and failure warnings, visual loading/heatmap, narrow layout and real downloaded files could not be exercised. Sample times and loads are verified at the core level only. README now records the current 15-test result. Export-work, storage-failure recovery and replacement cancellation are beyond the frozen browser coverage and still require additional human/browser checks.

Generated: all five mapped components exist and architecture filenames match. Runnable: inline core executed under Node and both classic scripts parse; browser launch unverified. Tested: 15 application Node tests pass. Reviewer-accepted: no. Operationally validated: no. No source requirement deferral was removed, and no synthetic value is owner-approved policy.

Frozen files retained byte-for-byte (SHA-256 computed locally before and after verification, separate from host evidence):

- `acceptance-plan.json`: `9f763d630abf81238483d04bc185ab3b055c3ca4691a2e65ac5d207ae85018bc`
- `ux-spec.json`: `361d7753c03eadb24944424359b6e9664ecc522820ce7e764f82b6c5b6a01899`
- `system-design.json`: `7a7298cc942e4b9e3e714a3094e8cff103b0875666ad4f7bac073c8caae0fdaa`

A system `shasum` attempt could not run because the sandbox lacks its Perl library; the hashes above use Node crypto. This tooling failure is unrelated to application test results.

## Preserved build-phase evidence

## Actual application checks (build history)

Command: `node --test scheduler.test.cjs`. Local runtime: Node v26.0.0. Final result: **12 passed, 0 failed, 0 skipped**. Tests execute `PB4TCore` from the actual inline script in `index.html` through `scheduler-core.cjs`; no copied solver, package dependency or toolkit self-test is used. Both delivered classic scripts also passed Node syntax parsing. Tests do not create mutable data files.

The initial execution had 11 tests: **10 passed, 1 failed**. Failure was N3, `scheduler.test.cjs`: expected `Alex is unavailable for Engineering at every supplied candidate.` but received `Shared exclusive resource collision.` The search had encountered the original room collision before the alternative availability failure. A bounded implementation correction retained the input and expected outcome and prioritized availability observations. Supplemental malformed-record and one-minute boundary checks were included. The corrected suite passed all 12 cases; the final rerun after fixing validation loading feedback also passed all 12. The frozen plans were never modified.

The frozen availability message is shorthand for failure to allocate the complete set: Engineering's original minute-540 candidate individually fits Alex's shortened availability, but conflicts with Damage Control. The later candidate is unavailable. The UI search detail explains that distinction. Any future change to the frozen wording needs a new planning run; no expected text was changed here.

| Criterion | Actual application evidence | Build result |
| --- | --- | --- |
| SCH-01 | N1/N2/N6/N7/N8 check literal sample intervals, all pairs, independent audit rejection, resource-only and person collisions, immutable prior commitments | Node checks pass; resolve-collision and review-revision browser journeys pending |
| SCH-02 | N3/N4/N6 and supplemental test check exact window ends, adjacent windows, qualification union, unassigned qualification rejection, rest 30/31, duty 119/120 and prior duty/rest | Node checks pass; recover-qualification, recover-availability and recover-fatigue pending |
| SCH-03 | N5/N9/N10-N11 check candidate-attempt exhaustion, finite-model infeasibility, invalid data and no partial/current review | Node checks pass; recover-exhaustion, recover-impossible and recover-invalid pending |
| UC11-1 | Synthetic deterministic slice only | Deferred / unverified; no collaborating agents or approved policy |
| SCH-04 | Explicit request coverage audit only, without recurrence rules | Deferred / unverified; no SFTRM completeness claim |
| SCH-05 | N9 tests local revision guard and restored acceptance; actual human acceptance absent | Deferred / unverified; review-revision is pending interaction evidence only |
| DELIVERABLE11-1 | Feasible board/loading implementation; no objective function | Deferred / unverified; no optimization claim |

A single `fleet_solve_schedule` reference calculation returned dc [540,600), eng [630,690), feasible after 3 explored placements. This was a synthetic tool reference, **not application verification**. The application-owned implementation and independent audit are tested separately.

## Outstanding host and human checks

All eight frozen browser journeys must run at desktop and narrow viewports in fresh contexts. No dedicated browser tool is assigned to this build phase. Browser evidence has not been produced, and the browser verification gate is not passed. The host owns `test-report.json`, source hashes, screenshots and traces; none were fabricated or edited. No visual inspection was performed.

Keyboard/focus, visual contrast and narrow layout, replacement Cancel/Escape, storage quota/unavailability/corruption recovery, raw draft restoration, download contents and current-versus-historical presentation need host/browser and human review. Node state tests do not establish these UI outcomes. Maximum-size latency was not benchmarked. No security assessment, government-device approval, authentication, integration test, SME policy validation, authorized operator signoff or operational evaluation occurred.

README and path-to-fleet describe actual controls, formats, supported slice and unresolved ownership. All five component statuses are agent-reported implementation; generated does not mean tested in a browser, reviewer-accepted or operationally validated.
