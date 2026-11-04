# Primary deferrals

All source wording is preserved in the full inventory in test-matrix.md. Deferred obligations remain unverified even if every synthetic check passes.

- **UC11-1**, Original wording: “The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.” **real-data:** Applicable SFTRM periodicities, approved fatigue policy, actual roster and training history cannot be supplied under the synthetic-only boundary. Withhold actual SFTRM assurance. Demonstrate every named behavior using deterministic simulated departmental agents and explicit synthetic rules, including recurrence.
- **SCH-04**, Original wording: “Preserve mandatory training periodicities.” **real-data:** Applicable owner-supplied recurrence rules and prior completion history are unavailable under this boundary. Withhold validation of actual mandated training. Demonstrate synthetic recurrence expansion, carry-in history, deadlines, missing-occurrence detection and carry-out obligations.
- **SCH-05**, Original wording: “Have an operator accept the proposed schedule.” **human-authority:** Only an authorized PB4T operator can actually accept the specific calendar. Withhold actual approval and release. Demonstrate editable review, numeric heatmaps, pending policy requests and local demonstration-only acceptance.

No deliverable is deferred. These are concrete real-data/authority boundaries, not a reason to omit synthetic functionality. Verification, user guide and review summary must begin with these same primary deferrals, original wording, dependencies, withheld actions and stand-ins. Never report all source requirements met from prototype passes.

# Verification result, 2026-11-04

Synthetic, not validated against the real format. **Node: PASS after browser-failure repair (15 tests, 0 failures, 0 skipped). Browser gate: FAILED in preserved host report (14/16 journey executions passed); rerun pending. requirementsMet: false.** Generated implementation exists and Node functions are runnable/tested. Reviewer acceptance and operational validation are unverified. No deployment or operational access occurred.

Executed `node --test core.test.cjs` from the workspace. The current repair run exited 0: 15 tests, 15 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo. Tests call actual exported and inline application functions. A Node DOM shim additionally runs the full page script and its real load, optimize and export handlers; it does not establish browser rendering, native downloads or storage behavior.

## Failure evidence and single bounded repair

Initial existing suite: 9/9 passed. Adversarial probes then found reversed prior duty (-960 to -1020) incorrectly returned feasible and counted negative duty; a recurrence deadline of `bad` also incorrectly returned feasible; a reversed drill availability window was classified infeasible rather than invalid. Regression suite before repair: 13 tests, 11 passed, 2 failed (both factories' malformed-temporal test, expected invalid, actual feasible, core.test.cjs test beginning at line 48). This records the observed failure rather than overwriting it with the repaired result.

One repair batch in core.cjs and the inline index.html factory adds input-shape, horizon, recurrence interval, drill-window and prior-duty validation; invalid inputs cannot be accepted. Page startup discards an invalid in-memory restoration and offers loading a synthetic scenario instead of trying to render broken state. Stored content is not overwritten until a subsequent user action. Both cores retain the same behavior and the literal weekly answer key. Frozen acceptance-plan.json, ux-spec.json, system-design.json and .fleet files were not edited. No additional repair budget is claimed.

## Criterion evidence

Source is supplied .fleet/packet.json schemaVersion 1, capturedOn 2026-11-04, source URL in requirements.md; no independent current source retrieval. Exact original requirements and JSON provenance paths are retained in test-matrix.md; UC11-1 and primary deferrals are quoted above. No external document claims are used.

| Criterion / provenance | Executed application evidence in core.test.cjs | Result and remaining boundary |
| --- | --- | --- |
| UC11-1 / challenge.requirements[0] | Both factories: literal six-event answer key, actual rejection log and alternate allocations, recurrence due windows and all supplied constraints | Synthetic stand-in checks pass; full source requirement deferred/unverified because actual SFTRM, roster, history and fatigue data are absent. |
| SCH-01 / recipe.acceptance[0] | Independent enumeration of all board interval pairs; shared person/resource edits fail then alternate restores validity; concurrent resource collision fixture fails | Node pass; weekly-board and board-edit-recovery browser outcomes pending. |
| SCH-02 / recipe.acceptance[1] | Missing qualification/availability, rest59/60, duty180/181, prior-duty rest, exact due endpoints, operational/resource windows, horizon crossing, cross-midnight and malformed temporal data | Node pass; weekly-board, constraint-recovery and duration-recovery browser outcomes pending. Qualification expiry and multi-person role cardinality are not modeled and are not claimed tested. |
| SCH-03 / recipe.acceptance[2] | Impossible supplied candidates exhaustively infeasible; maxNodes1 exhausted with explored1; maxNodes5000 feasible; invalid0/noninteger budgets rejected | Node pass; search-recovery browser outcomes pending. No global-optimality or complete-space feasibility assertion. |
| SCH-04 / recipe.acceptance[3] | Anchored Engineering occurrence inventory, missing policy/ENG-2, due inclusivity and carry-out12060 | Synthetic stand-in Node pass; actual mandatory periodicity preservation deferred/unverified. Other departments have explicit one-off obligations, without a historical training feed. |
| SCH-05 / recipe.acceptance[4] | Dirty input and pending request acceptance gates; saved duration change revokes acceptance; JSON state round-trip; invalid saved input blocked | Synthetic stand-in Node pass; authorized operator acceptance deferred/unverified. Actual browser reload and revision review journeys pending. |
| DELIVERABLE11-1 / challenge.expectedDeliverables.lines[0] | Exact board, moved allocations, numeric loads180/120/120; edited duration loads150; both factories compared on all scenarios; actual page load/optimize/export handlers exercised under DOM shim with disclosure and six coverage records | Node pass; interactive board, heatmap rendering, review and all eight frozen browser journeys pending. Bounded first-feasible search does not establish global optimization. |

## Host browser failure and bounded implementation repair

The supplied host report (`test-report.json`, time `2026-11-04T22:24:37.025Z`, pre-repair source hash `0f55c7cb36b40b9b4a1e41d32b5edecd6825f6292023808fbbce2cefa803e197`) records 14/14 Node tests and 14/16 browser journey executions passing. `constraint-recovery` failed at step 10 on desktop and narrow. Its frozen expected text is `WPN-1: no candidate fits personnel availability.` The unavailable fixture also removed Alex's Engineering window, so the earlier independent-candidate check correctly returned `ENG-1: no candidate fits personnel availability.` This is a fixture defect, not permission to change the expectation or solver ordering.

Preserved screenshot and trace evidence for both failures is in `.quality-evidence/e38e48c97500-6cbfd6ba-d62b-4dbf-a627-efbe96439714/constraint-recovery-desktop.png`, `constraint-recovery-desktop.zip`, `constraint-recovery-narrow.png` and `constraint-recovery-narrow.zip`. The desktop zip's `trace.trace` contains the actual ENG-1 diagnostic. Trace text was inspected; screenshot pixels were not visually reviewed with the assigned tools.

This host-requested bounded repair changes only the unavailable fixture in `core.cjs` and the matching inline factory in `index.html`: retain Alex's valid Engineering availability; restrict WPN-1 to Blair at Mon 10:00, with Blair unavailable for that interval. Every Weapons candidate now fails availability while Engineering remains individually valid. No policy is relaxed, solver behavior changed, or frozen expectation rewritten. Existing test coverage now asserts the exact availability diagnostic in both factories. One additional test executes the real page script and every frozen constraint-recovery step through actual handlers under a Node DOM shim, checking all literal outcomes for qualification, availability, rest59, duty181 and exact boundaries. It is not browser evidence. The prior validation repair described above is retained as historical evidence; this is the single repair batch requested for the supplied independent browser failure, with no further retries claimed.

`node --test core.test.cjs` after this repair: **15 passed, 0 failed, 0 skipped**, exit 0. Adversarial fixtures include impossible allocation, alternate board allocations, unavailable personnel, missing qualifications, rest and duty boundaries, malformed temporal data, missing recurrence, exhausted search and prior-duty/resource/window/horizon exclusions. No toolkit result counts toward these totals.

The seven other journeys passed at both viewports in the supplied report: weekly-board, duration-recovery, search-recovery, recurrence-recovery, review-revision, board-edit-recovery and policy-change-recovery. Host evidence records no browser errors or horizontal overflow for those executions. These results describe the prior source revision. All eight journeys must be rerun by the host at both viewports against the repaired source before prototype review. No new browser pass, screenshots or traces are claimed. The host-owned report and evidence remain unchanged.

README walkthrough and unavailable-personnel recovery now match the actual fixture and literal result. Native focus, layout, download and storage behavior on the repaired revision remain subject to host browser checks and human review. Human usability, accessibility and departmental negotiation usefulness remain unverified.

### Current criterion evidence disposition

| Criterion | Preserved host evidence | Current repair disposition |
| --- | --- | --- |
| UC11-1 | Unverified, real-data deferral | Synthetic stand-in only; actual SFTRM assurance unverified. |
| SCH-01 | Passed weekly-board and board-edit-recovery at both sizes | Local Node pass; repaired-source browser rerun pending. |
| SCH-02 | Failed constraint-recovery at both sizes; weekly-board and duration-recovery passed | Exact diagnostic and full handler recovery now pass locally; browser gate remains failed pending rerun. |
| SCH-03 | Passed search-recovery at both sizes | Local Node pass; repaired-source browser rerun pending. |
| SCH-04 | Unverified, real-data deferral | Synthetic recurrence checks pass; actual mandatory rules unverified. |
| SCH-05 | Unverified, human-authority deferral | Demonstration review checks pass; actual operator acceptance unverified. |
| DELIVERABLE11-1 | Failed because constraint-recovery failed; seven other journeys passed at both sizes | Local Node pass; full interactive deliverable browser gate awaits host rerun. |

Generated: yes. Runnable: local page and Node code supplied. Tested: 15 local application tests passed; prior browser gate failed. Reviewer-accepted: unverified. Operationally validated: no. `requirementsMet=false` independently of any future prototype browser pass.

## Other evidence boundaries

The fleet_solve_schedule tool returned feasible for the separate two-drill reference fixture (Alex, starts480/600, duration60 each, rest60, availability480 to 660, budget120). This is a reference calculation only, with no prior duty, not application verification. The application independently checks its exact-boundary case with prior60 and budget180. No toolkit self-test is counted in the 14 tests.

Architecture mapped files exist: board=index.html; agents, constraints, solver, fixtures and review=index.html plus core.cjs. system-design.json remains unchanged. Generated component status denotes implementation only. No production-scale benchmark, OR-Tools evaluation, real-format validation, operational readiness, authoritative fatigue policy or actual approval has been established.
