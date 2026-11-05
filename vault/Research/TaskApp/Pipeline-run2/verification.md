# Verification evidence, 2026-11-04

Generated source exists and application logic is runnable under Node. Local tests: **21 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo**. Overall prototype verification is **unverified / gate not satisfied**, because no real browser results are available in this phase. **requirementsMet: false**: UC11-1, SCH-04 and DELIVERABLE11-1 are deferred. Reviewer acceptance and operational validation are unverified.

Executed command: `node --test *.test.cjs` (Node built-in runner, no packages). Final run exited 0 and reported 21 tests; the additional adversarial test loops through 144 explicit combinations of A/B starts, minimum rest and whole-horizon budget using independent arithmetic expectations and a pair/load oracle for feasible outputs. Core tests call actual application functions. Packaging tests execute the HTML-embedded core. UI tests execute both delivered scripts and their actual listeners with a minimal DOM/storage adapter. Those adapter checks are local wiring evidence, **not browser verification**, real persistence, layout, screenshots, accessibility or file-system evidence.

## Single bounded repair and preserved failure evidence

Initial existing suite ran: 14 passed, zero failed/skipped. Additional pre-repair probes found:

- `checkDraft(sample(), [null,null,null,null])` threw `Cannot read properties of null (reading 'requestId')`. The checker now returns a failed check for malformed entries; null snapshot roots also produce a schema error. Both embedded and exported core were updated together.
- A real serialized/validated infeasible snapshot has no `explanations` field. The renderer called `draft.explanations.join(' ')`, which threw `Cannot read properties of undefined (reading 'join')` on import/recovery. Rendering now obtains observed explanations from a fresh search when absent. Adapter tests exercise actual import, save and restored infeasible/exhausted UI paths.
- Source audit found current-input edits left staged comparison values visible. Edits now clear staging and ask for a fresh comparison before replacement. This preserves the explicit replacement boundary and entered work.

The first expanded Node run reported 15 passed / 5 failed: every new UI-adapter test failed with `t.trim is not a function` because the adapter did not implement native input.value string coercion. Corrected only the adapter accessor; the next run reported 20 passed / zero failed. Added the 144-case arithmetic oracle, then ran the final 21-test suite successfully. These changes are one bounded verification repair set; no frozen expectation was edited.

Historical build evidence retained: original build reported 12 passed / 1 failed due to an overbroad dependency regex matching human text “import snapshot”; corrected packaging test then passed 13, and an added boundary test produced the incoming 14-test suite. This was a test defect, not browser evidence.

## Criterion mapping

Provenance and full original wording remain in .fleet/packet.json and test-matrix.md. Literal browser inputs/outcomes remain in the frozen acceptance-plan.json. All listed journeys are **not run here** at both desktop and narrow widths; host must record their outcomes. Local evidence below does not convert any criterion into a browser or human pass.

| Criterion | Disposition and local evidence | Host journey / remaining evidence |
| --- | --- | --- |
| UC11-1 | DEFERRED / UNVERIFIED. Deferred in full: four synthetic sessions demonstrate bounded feasibility only. Departmental agents/negotiation, owner-approved operational fatigue rules, interfaces and SFTRM semantics are absent. | None; requires new owner-approved planning scope. |
| SCH-01 | core.test.cjs: baseline independent all-pairs oracle, 144 explicit combinations, collision/tamper rejection. Fixed room/person mapping prevents an isolated cross-person room-only scenario; shared-room overlap is checked for the supported model. | `baseline`, `collision`, browser UNVERIFIED |
| SCH-02 | core.test.cjs: qualification/window failures, rest 29/30/31, touching zero-rest sessions, duty 119/120/121, exact window endpoints; independent arithmetic combinations. | `baseline`, `rest-budget`, `qualification`, `windows`, browser UNVERIFIED |
| SCH-03 | core.test.cjs: impossible B start 0, budget 1 exhausted, exact final-node success at 5. ui.test.cjs: import and restore infeasible/exhausted statuses. | `collision`, `search-limit`, browser UNVERIFIED |
| SCH-04 | DEFERRED / UNVERIFIED. Deferred: owner recurrence/deadline rules and SFTRM authority are absent. Four explicit sessions do not establish periodicity compliance; future integration must expand and check every occurrence. | None; requires new owner-approved planning scope. |
| SCH-05 | application.test.cjs: review reducer checks completeness. ui.test.cjs: actual listener review/clear for all eight editable categories. Operator/reviewer acceptance remains unverified. | `baseline`, `edit-review`, browser UNVERIFIED |
| DELIVERABLE11-1 | DEFERRED / UNVERIFIED. Deferred in full: this two-day feasibility draft and totals are not a weekly departmental optimization board or heatmaps. Objectives, negotiation and operational calendar integrations are absent. | None; requires new owner-approved planning scope. |
| USER11-1 | core.test.cjs: exact A to D intervals and both 120-minute totals; packaging.test.cjs: actual embedded computation parity. | `baseline`, browser UNVERIFIED |
| USER11-2 | core.test.cjs: alternate starts and edited D duration, input immutability. ui.test.cjs: duration edit recomputes end 1470 and P02 load 90 through delivered listeners. | `edit-review`, `windows`, browser UNVERIFIED |
| USER11-3 | core.test.cjs: four outcome variants. ui.test.cjs: rendered text properties for feasible, invalid, infeasible and exhausted paths; real visible text pending host. | `baseline`, `invalid`, `collision`, `search-limit`, browser UNVERIFIED |
| USER11-4 | core.test.cjs: deep input preservation, fixed identity rejection, no partial assignments on constraint failure and all-pairs oracle. | `collision`, `qualification`, `rest-budget`, browser UNVERIFIED |
| USER11-5 | application.test.cjs: malformed/foreign/oversized/forged imports. ui.test.cjs: blank duration retained across adapter reload; correction succeeds; failed import/cancel retains reviewed work. | `invalid`, `collision`, `bad-import`, browser UNVERIFIED |
| USER11-6 | application.test.cjs: review checker. ui.test.cjs: relevant category edits clear review, imports/restoration never trust review, changed current inputs invalidate staged preview. | `edit-review`, `portable`, browser UNVERIFIED |
| USER11-7 | application.test.cjs: exact snapshots with candidate order/duplicates and D duration 30; replay rejects false nonfeasible claims. ui.test.cjs: infeasible/exhausted import/save/restore; storage-denied download initiation via adapter. packaging.test.cjs executes embedded code. Actual file I/O, downloads, local-file storage and offline close/reopen are unverified. | `portable`, `bad-import`, browser UNVERIFIED |
| USER11-8 | Source/README inspection: synthetic banner and all eight omission/owner warnings present. Packaging test parses scripts; downloaded guide and visible disclosures still require host limitations journey. | `limitations`, browser UNVERIFIED |

## Browser, guide and domain limitations

No dedicated browser capability or existing host browser report/screenshots/traces was supplied. No screenshots or traces were generated or claimed. Host owns test-report.json, source hashes, screenshots and traces; they were not written or edited. The host must run all **11 frozen journeys twice**, on desktop and narrow viewports, and verify visible text, console errors and layout overflow before prototype review. Missing browser verification is a gate failure to establish completion, not a pass from Node.

README quick start, labels, formats, sample intervals and limitations were checked against source and actual calculation results. The guide now names all four test files and the preview invalidation behavior. Browser opening from file, keyboard focus/Tab interactions, actual file chooser, completed downloads, physical offline close/reopen, browser storage denial, visual clarity, narrow overflow and accessibility were not exercised in a real browser. Adapter calls only check event handlers and observable element properties; they do not establish native event ordering or browser API semantics. The embedded downloadable guide is an earlier self-contained guide, as disclosed in README.

The fleet_solve_schedule tool was run in this phase for the impossible B-start-0 fixture: infeasible, 2 explored attempts, observed shared-resource collision. The incoming build recorded a baseline tool result A 0 to 60, B 90 to 150, C 0 to 60, D 1440 to 1500. Toolkit calculations are reference fixtures, never application verification. The app uses its own bounded search and a separate full-output checker. Search does not optimize or select personnel. No owner-approved fatigue or recurrence policy, SFTRM semantics, weekly departmental agents/heatmaps, real readiness data, qualification authority, government connection or operational approval is established.

## Frozen artifact integrity

Pre/post verification SHA-256 (unchanged):

- acceptance-plan.json: dc935ec5c05eff4449c9d74f4c2b0f059d7d169c0f2c43e5a679824e7a96926c
- ux-spec.json: fa966ab56a153eebb5e6483b39e3cdf9b81e7d9aabe08aaeb7c6a6489664e04b
- system-design.json: fea53f5dd466dffa73fd61a9adec07002ad25b693c089ab6e13eaedaca8b0893

No .fleet content or host evidence was changed. An attempted system shasum command failed because sandbox access blocked its Perl dynamic library; Node crypto was used successfully for contract comparison instead. All six mapped architecture components were moved to building during verification and returned to generated after the source/test repair. Generated denotes implementation presence only.
