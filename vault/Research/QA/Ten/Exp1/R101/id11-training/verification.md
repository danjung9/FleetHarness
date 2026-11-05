Primary deferrals: none. All seven frozen dispositions describe a synthetic demonstration. Real crew readiness, SFTRM conformance, official formats, actual human prototype acceptance and operational authorization are unestablished.

# Verification, 2026-11-04

**Node gate passed; browser gate unverified and not satisfied. requirementsMet: false.** No host test-report.json, browser screenshots or traces were present. The host owns and must generate those artifacts; none were authored or substituted here. All ten frozen journeys still require execution on both desktop and narrow viewports, including rendered outcomes, console errors and overflow. No browser tool was available in the effective phase tools.

Generated: self-contained index.html and domain.test.cjs exist, consistent with the six unchanged system-design.json components. Runnable: application-core and inline-controller code executed on Node; direct-file quick start inspected but not exercised in a browser. Tested: 20 application tests pass. Reviewer-accepted: unverified. Operationally validated: unverified. Component status “generated” reports file implementation, not correctness or approval.

## Actual execution and bounded repair

Command: `node --test domain.test.cjs`, Node v26.0.0, workspace root. Initial existing suite: 9 passed, 0 failed, 0 skipped. First adversarial run: 14 tests, 12 passed, 2 failed, 0 skipped (exit 1). After one bounded repair and expanded coverage: 20 tests, 20 passed, 0 failed, 0 cancelled, 0 skipped, 0 TODO (exit 0; reported duration 76.101541ms). This is an agent-executed local run, not the independent host report.

Preserved pre-repair failure details:

- `SCH-03 malformed mandatory inputs are invalid, never feasible or silently dropped`: input `w.requests=[]`; actual `feasible`, expected `invalid_input`. The assertion stopped the loop at this first case; it did not establish the results of subsequent malformed cases before repair.
- `SCH-01 board audit rejects duplicate occurrences and substituted resources`: change the Engineering allocation resource to `Engineering Simulator`; expected audit error, actual error count 0. The original duplicate fixture could also collide with Tuesday Weapons; it was subsequently moved to Wednesday to isolate duplicate-ID enforcement without that unrelated collision.

The single repair adds structural/semantic synthetic input validation before candidate search; rejects duplicate allocations and unrequested resources; tracks pending editors individually; blocks crew selection until crew drafts are saved; preserves allocation drafts when another editor saves; and disables mutable controls during search while preserving Stop. The heatmap uses fixed table layout and wrapping to reduce narrow-width overflow risk; browser verification of that styling remains pending. No frozen expectations were changed. No host/browser repair result was supplied; no further repair cycle is claimed.

The application tests extract the actual inline PB4TCore and controller from index.html. There is no copied solver. Tests use fictional fixtures and independently enumerate assignment pairs, qualifications, calendars, exact recurrence IDs, deadlines, daily/week totals and duty-block spans across baseline, two-day and overdue samples. A minimal DOM/storage adapter invokes actual controller handlers in five tests. It tests state transitions; it cannot establish native control semantics, automatic waiting, rendering, real downloads or browser storage behavior.

The phase's fleet_solve_schedule tool was used for one explicitly synthetic single-person/single-drill calculation. It returned a 0 to 60 minute feasible assignment. This reference calculation is **not application evidence** and does not encode the application's block-fatigue policy, recurrence or interface. No toolkit self-tests count toward the 20 application checks.

## Criterion evidence mapping

Canonical IDs/provenance are from .fleet/packet.json (capturedOn 2026-11-04). Original source text is retained in requirements.md and test-matrix.md. Results below cover only the declared synthetic assumptions; source fitness still needs domain/human review. Test names in domain.test.cjs provide the executable evidence locations. Frozen journey IDs identify pending host evidence; no screenshot/trace path is invented.

| Criterion / provenance | Inputs and literal expected result | Executed evidence / result | Browser evidence still required |
| --- | --- | --- | --- |
| UC11-1 / challenge.requirements[0] | Five participants; Engineering/DC original C01/Training Room collision; choose DC C04 Mon 11:00, retain all five drills; repeated/history cases stay explicit | First baseline test and final independent allocation oracle PASS; qualification/availability/recurrence/fatigue tests PASS. Deterministic participant proposals/logs checked, not independent autonomous services | weekly-resolution, qualification-recovery, availability-recovery, recurrence-coverage, overdue-recovery, fatigue-policy, UNVERIFIED |
| SCH-01 / recipe.acceptance[0] | All unordered assignment pairs obey exclusive people/resources; touching intervals allowed; a one-minute overlap fails; duplicate IDs or substituted resources rejected; conflicting edit recoverable | Baseline independent pair oracle, edited-collision test, touching intervals test, duplicate/resource regression and final multi-sample oracle PASS | weekly-resolution, edit-review, UNVERIFIED |
| SCH-02 / recipe.acceptance[1] | Missing/expired EOOW, unavailable C06 and closed resource fail; C05 alternate works; distinct role count enforced; daily 240/241, weekly 720/721, block 480/481 and gap 719/720/721 boundaries; prior duty and midnight/week splits; 270min load requires deliberate 270 policy | Qualification recovery, resource/validity/count/alternate test, daily/prior-duty policy test, fatigue boundary tests, final independent oracle PASS | qualification-recovery, availability-recovery, fatigue-policy, UNVERIFIED |
| SCH-03 / recipe.acceptance[2] | Impossible DC deadline → infeasible; budget 1 → budget_exhausted; 0/noninteger/out-of-range → invalid_input; malformed inputs rejected without mutation; stop commits no new board and permits retry | Search-status, malformed-input and controller lock/stop/recovery tests PASS. No partial assignments presented as complete | search-recovery, invalid-and-stop, UNVERIFIED |
| SCH-04 / recipe.acceptance[3] | Exact eight-ID two-day fixture; DC starts 660/3540/6420/10740, last deadline 11520; overdue DC-0 uncovered until explicit valid history; missing assignment uncovered; end exactly due valid, +1 invalid | Recurrence/history test, exact occurrence/deadline test and final independent oracle PASS. These are explicit synthetic occurrences, not real SFTRM recurrence generation | recurrence-coverage, overdue-recovery, UNVERIFIED |
| SCH-05 / recipe.acceptance[4] | Alias/confirmation accepts revision1, restored review unchanged; pending editor/allocation blocks acceptance; conflict fails validation; corrected revision3 requires fresh review; other saves preserve pending edits | Edited-collision and five actual-controller tests PASS, including in-memory storage round trip. Human acceptance and real browser persistence are not established | review-export, edit-review, fatigue-policy, UNVERIFIED |
| DELIVERABLE11-1 / challenge.expectedDeliverables.lines[0] | Baseline exact board text and totals C01=120,C02=60,C03=60,C04=120,C05=0,C06=60 minutes; six named reports and accepted revision export | Baseline independent totals, boardText/loads projection test and controller rendering code executed PASS. Test title “actual rendered export strings” checks core text functions, not rendered browser text or actual export | weekly-resolution, review-export, edit-review, UNVERIFIED |

All ten journey IDs pending on both viewport sizes: weekly-resolution, review-export, edit-review, qualification-recovery, availability-recovery, search-recovery, recurrence-coverage, overdue-recovery, fatigue-policy, invalid-and-stop. Passing Node checks does not change their status.

## README and source review

Read requirements.md, plan.md, acceptance-plan.json, ux-spec.json, system-design.json, README.md, test-matrix.md, assigned skills and source/tests. README quick start, synthetic scenario values, board-edit controls, crew editor, policy/history controls, review labels and suggested export filename were checked against the actual controller. Updated README to describe per-editor draft handling, protected crew selection, search control locking and 20-test verification evidence. It retains warnings about one-interval availability replacement, fixed recurrence/calendar fixtures, local storage and non-importable exports.

Guide steps not exercised in a real browser: opening index.html directly; every sample walkthrough; native date/time entry; in-page confirm/cancel replacement and reset; real file-origin reload persistence; permissions/quota/corrupt-storage recovery; search status/Stop responsiveness; keyboard Tab/focus/announcements; narrow table readability; acceptance and downloadable text/filename. Adapter execution of selected review/edit/search steps is supporting application evidence only. No external browser installation, network access, credentials, operational connection or publication was attempted.

The source remains self-contained with inline CSS and classic scripts. No runtime dependencies were added. Architecture IDs/files remain unchanged: inputs, agents, domain, board and review map to index.html; tests maps to domain.test.cjs. Documents and tests remain synthetic-only. No temporary fixture data was written to the source tree.

## Frozen contracts and limitations

Preserved SHA-256 values, computed using Python hashlib before repair and checked afterward:

- acceptance-plan.json: `00439070a073fd9ccb90af8c3150c915c6e60db17a998d88cdb797adfe655804`
- ux-spec.json: `79e1e977aea650eae7a26af7ff5cf42d8b5c3aa9af8ce566aa155a13a917161d`
- system-design.json: `9ef034b9398a7f6b18931b143a0cacff49f2ac777b8f74b81cc395de4a5fa273`

An attempted system shasum command could not load a sandbox-blocked Perl library; hashlib supplied these actual hashes instead. This environment utility failure is not an application-test failure. No .fleet files, frozen contracts or host-owned evidence were edited.

Skipped Node checks: none. Remaining failed checks after repair: none locally. Unverified gate: all browser journeys and screenshots/traces; completion cannot be declared passed until the host supplies passing desktop/narrow results. Unverified review: comprehensive accessibility/usability, production performance, security, safe operational policy and human acceptance. No source/plan mismatch was resolved by rewriting a frozen expectation.

Known scope limits: finite explicit candidates and deterministic simulated departmental participants; feasibility rather than optimization; recurrence scenarios are pre-expanded supplied fixtures with no general recurrence editor; no owner-approved fatigue/SFTRM rules or real crew histories. There is no real identity, integration, multi-user conflict protocol, production persistence, official format or operational authority. Browser success would cover specified interactions only. requirementsMet remains false for the source's real operational meaning, separately from prototype checks.
