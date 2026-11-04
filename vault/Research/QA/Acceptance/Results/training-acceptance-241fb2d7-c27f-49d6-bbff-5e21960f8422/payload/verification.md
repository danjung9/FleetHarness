# Verification-phase evidence, 2026-11-04

Executed `node --test *.test.cjs` on Node v26.0.0. Final result: **22 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo**. Evidence: [final run](evidence/verify-run2.tap), [initial run](evidence/verify-run1.tap). This is local application-test evidence; the desktop runner owns test-report.json, source hashes and packet integrity. test-report.json was deliberately left for that runner. No .fleet files or system-design.json were changed. All architecture filenames still map to existing implementation files; no application architecture change was necessary.

The initial verification run passed21/22. V1's new fixture incorrectly expected C60 to 120 to fit Room-1 while B occupied90 to 150. The application correctly returned infeasible. The one correction changed the supplied fixture to B=[150], retaining C=[0,60]. Independently, C0 conflicts with A0 to 60; C60 to 120 is adjacent to A and finishes before B150 to 210, while P01 has90 minutes between A and B. V1 still requires C60 and independently checks every interval pair. This corrects an erroneous test premise, not the requirement or an implementation to match observed output. One rerun passed22/22; no further repair attempts were used. Previous build-phase failures are retained below as historical evidence.

## Source inspection and test scope

app-core.js:34 validates the exact bounded contract; :73 enforces complete-window containment, literal qualifications, horizon duty, room overlap and pairwise rest; :90 performs bounded search; :110 checks whole manual drafts; :134 checks review eligibility; :144 validates snapshots by recomputing exact results. index.html:19 embeds the tested core verbatim (P1/P2); :203 handles pending edits; :204 renders board/load/status; :219 commits row edits; :241 handles JSON; :247 reviews; :248 downloads; :249 imports. P1 compiles both scripts and checks no external runtime references. Actual controller execution now runs in controller.test.cjs with a minimal DOM adapter. It does not simulate browser focus ordering, rendering, file permissions or browser security behavior.

All fixture data is synthetic. T1's independent interval oracle checks every returned pair, exact request membership, fixed people/rooms, allowed starts, qualifications, window containment and duty totals. T3 to T9 and V1 cover negative/boundary cases. S3 uses cleaned OS-temporary files outside the source tree. UI1 to UI3 execute the actual inline controller rather than a rewritten workflow. The toolkit/reference tool is not a test oracle or application verification.

## Criterion-to-evidence mapping

Inputs and independently expected outcomes remain specified in test-matrix.md. Evidence for every automated result below is evidence/verify-run2.tap and the named test file. PASS means the scoped automated behavior only.

| Criterion | Tests / independent expectation | Result and limits |
| --- | --- | --- |
| UC11-1 | core.test.cjs T1/T4/T10; controller.test.cjs UI1: four proposals, fixed assignments and retained constraints | Scoped PASS; departmental negotiation omitted; human correspondence pending |
| UC11-2 | T3/T5/T6/T7/V1: missing qualification/unavailability fail, rest29 fails/30 passes, duty119 fails/120 passes, whole-window boundaries | Synthetic constraints PASS; recurrence/SFTRM GAP |
| UC11-3 | T1/T4/T8, S2/S4, UI2: choose B90 over conflict B0, manual alternate retained, explicit conflicts and exhaustion | Scoped PASS; alternate personnel selection omitted; human explanation acceptance pending |
| UC11-4 | T1/T2, UI1/UI2: calculated loads120/120 then120/90 and editable rows | Scoped two-day controller PASS; actual rendering unverified; weekly board omitted |
| SCH-01 | T1 independent every-pair oracle, T4 collisions, V1 shared-room adjacency | PASS |
| SCH-02 | T3/T5/T6/T7/V1 | PASS for supplied synthetic inputs; approved fatigue/qualification policy absent |
| SCH-03 | T8/T9 and UI2: infeasible, invalid and budget-exhausted remain distinct from feasible; exact node boundaries | PASS |
| SCH-04 | No recurrence implementation or owner rules; explicit omissions in HTML/README | GAP, not passed |
| SCH-05 | S1/S2/S4 and UI2/UI3 test review mechanics | Mechanics PASS; operator acceptance and source review HUMAN PENDING |
| US-1 | T1/P2/UI1: A0/B90/C0/D1440, loads120/120 | PASS logic/controller; B1 rendering unverified |
| US-2 | T2/S1/P2/UI1: D30 ends1470, P02 total90; valid edits recalculate | PASS; B2 actual event ordering unverified |
| US-3 | T8/T9/UI1/UI2: all four distinct outcomes | PASS logic/controller; browser wording display unverified |
| US-4 | T1/T10/S4: immutable inputs and all four exact assignments, no relaxed constraints | PASS |
| US-5 | T9/S1/UI1/UI2: invalid raw text/error retained; four proposal rows retained after failures | PASS controller; browser correction workflow unverified |
| US-6 | S1/S2/S4/UI2/UI3: edit/revert/manual conflict/import clears review | PASS logic/controller; browser focus timing and real human action unverified |
| US-7 | S3/S4/S4b/P1/P2/UI3: exact inputs/results round-trip, tampered imports rejected, manual B120 retained | PASS core/import controller; actual Save JSON/download, offline close/reopen and file picker UNVERIFIED |
| US-8 | P3 plus source/README inspection: synthetic/not issued and all omissions stated | Static PASS; human readability/prominence acceptance pending |

## README walkthrough and remaining checks

README quick start matches self-contained HTML and actual control labels. Walkthrough expectations A0/B90/C0/D1440, D30→1470/load90, B0 conflict, manual B0→90, budget1 exhaustion and duration0 invalid correspond to tested application functions/controller. No changed controls or implementation repair required guide changes. Updated the developer command to include all four test files and the recorded22-test result.

B1 to B5 from test-matrix.md remain **UNVERIFIED in a real browser** because this phase has bash/Node and no assigned browser automation tools. No browser was launched. Specifically unexercised guide steps: direct file opening in a browser, leaving fields/focus/change ordering, rendering board time labels and narrow layouts, keyboard/accessibility, real download and permissions, closing/reopening from an isolated folder with networking disabled, file picker/cancellation, harmless markup rendering, worst-case synchronous-search responsiveness, and human review. UI3 covers actual import handler rejection/restore using synthetic File-like objects; it does not prove browser file transfer. Static self-containment is evidence of packaging only, not observed offline use.

No application tests are skipped. Unperformed browser/human procedures are named rather than counted as passing tests. Full acceptance cannot be claimed: recurrence/SFTRM, weekly coverage, negotiation, real readiness, official calendar, reconnect sync and operational identity/integration remain excluded. No owner-approved operational policy was invented. No operational systems, credentials, deployment or contacts were accessed.

Generated: all six implemented components and mapped files, reported via fleet_component_progress. Runnable: inline scripts compile and execute under Node VM; real browser launch unverified. Tested:22 local application checks pass. Harness report/hash: pending runner. Reviewer-accepted: no. Operationally validated: no. The automated completion gate passes locally; browser/human and full challenge acceptance remain open.

---

# Build-phase development evidence

Date: 2026-11-04. This document records implementation-agent checks only. It does not complete the independent verification phase. The desktop runner owns test-report.json, source hashing and packet-integrity evidence; those artifacts were not authored here. requirements.md, system-design.json and .fleet inputs were preserved.

## Exercised application

Command: `node --test core.test.cjs state.test.cjs packaging.test.cjs` using local Node v26.0.0. Result after packaging-test repair: **18 passed, 0 failed, 0 skipped**. Following the final browser-controller edit, the affected `node --test packaging.test.cjs` checks were rerun: **3 passed, 0 failed, 0 skipped**. No core source changed after the full passing run. The harness must independently run the final source revision.

- T1 to T10 call app-core.js: default 0/90/0/1440, total duty120/120, edit recomputation, independent pairwise checks, fixed assignments, qualifications, whole-window availability, room collisions, rest29/30 in both time orders, zero-rest adjacency, cross-day duty119/120, exact window end, no split windows, malformed fields, immutable input and exact-budget completion/exhaustion.
- S1 to S4b call application state/snapshot functions: edit/revert invalidation, manual conflicts and alternate starts, exact raw-input/result round-trip for feasible/infeasible/exhausted/invalid states, temporary-file recovery and cleanup, atomic rejection of altered inputs/results/reviews, unsupported versions and oversize text. Imported review is historical; current review always clears. This is core/file-format recovery evidence, not proof of browser download/reopen.
- P1 to P3 extract the actual embedded core, check byte equality to app-core.js, compile both actual classic scripts, execute inline core in Node VM and inspect runtime-reference/disclosure/textContent safeguards. This establishes packaging/calculation evidence only. It is not a DOM or browser test.

The fleet_solve_schedule tool was run on the supplied synthetic default and returned a feasible reference allocation with starts A0/B90/C0/D1440. That calculation is not application verification and was not used as the expected-value oracle. Expected values derive from requirements.md. Application core was independently written without package dependencies or copied toolkit runtime. Toolkit provenance/version/license concerns from research remain unresolved for future reuse.

## Failure evidence and repair

Build run 1: 17 passed / 1 failed (P1). The overbroad import regex matched prose beginning `Import always requires a fresh review` through `Separate from`. Byte equality and inline execution already passed. Corrected import detection to recognize import-statement syntax.

Build run 2: 17 passed / 1 failed (P1). The CSS `url(` detector also matched the suffix in `URL.revokeObjectURL(` because it lacked a word boundary. Corrected the detector to require a word boundary for CSS `url(`. The independent requirement (no external runtime dependencies) was unchanged. Build run 3: all18 passed. No failed application expectation was replaced with observed solver output. Browser pending-edit handling was also added before the passing run: clear review immediately and label the previous board stale until the edited table/budget field is committed on leaving it. A final blur fallback handles change-then-revert; P1 to P3 were rerun after that controller change.

## Unverified browser and human work

B1 initial offline file opening, real layout, keyboard/accessibility and exact visible correspondence: **UNVERIFIED**.

B2 actual DOM edits/statuses, event ordering, responsiveness at bounded search limits: **UNVERIFIED**. The search is synchronous; no cancellation or responsiveness guarantee is made.

B3 browser review events and a human accepting the current draft: **UNVERIFIED / HUMAN PENDING**. Source approval is a separate host gate; none was fabricated.

B4 real browser download/import, file-picker cancellation, standalone offline close/reopen, script-like label rendering and failed-import workspace retention in the browser: **UNVERIFIED**. Core snapshot/file-format recovery is tested, not the browser flow. Browser tools are outside this build phase’s assigned tool access; follow the B1 to B5 procedures in test-matrix.md during verification.

B5 disclosure audit: required omission labels are checked in the HTML by P3 and explicitly documented in README/path-to-fleet. Prominence, readability and human semantic acceptance remain **HUMAN PENDING**.

G1 / SCH-04: **GAP**, no recurrence or SFTRM rules or periodicity implementation. G2 operational integrations: **GAP**, no approved identities, calendar, readiness, sync, storage or device route. G3 human authority: **PENDING**. No local test establishes operational readiness, safe engineering decisions, ATO, CAC, device encryption, a government-system connection or issuing authority.

Generated: application source, Node tests and documentation. Development tests exercised: actual core/state/inline logic. Browser behavior: unverified. Independently verified by harness: pending. Reviewer accepted: no. Operationally validated: no. All six mapped components have agent-reported generated status, which is not proof of correctness.
