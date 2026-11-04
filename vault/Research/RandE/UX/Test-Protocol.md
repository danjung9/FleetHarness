---
type: research
status: complete
owner: mukul
updated: 2026-11-04
summary: "Maps four retained UX outcomes to existing Quality acceptance at 631849f and archives the unrun formative-study proposal."
---

# Existing acceptance checks for the retained task

## Bottom line

[R, proposed, Directive-rande] Reuse [[Research/QA/Officer/Acceptance-11]] for the actual four-request training app and [[Ops/Directors/Directive-qa]] for the factory route. [E, attributed report, Acceptance-11] All task-app outcomes below are **NOT RUN**; the independently checked arithmetic is not an application result. [E, source-only, pinned Git] `2e30b4a` and `631849f` share one tree; retain `631849f` evidence attribution. [R, proposed, Directive-rande] This mapping completes the UX handoff and assigns no new study, fixture or duplicate QA.

## Four outcomes, one acceptance record

[E] Status terms: **observed** means a runtime result with a cited receipt; **source-only** means implemented source inspected without that result; **proposed** means an expected action or outcome; **NOT RUN** means the actual app check has no supplied result. None of the four task outcomes qualifies as implemented-and-observed. Factory controls do not establish behavior inside a generated task app.

| Retained outcome | Current evidence and runtime status | Existing Quality mapping and required evidence [R, proposed] |
| --- | --- | --- |
| Try example | **NOT RUN** for the task. Proposed by Plan and Acceptance-11. The desktop catalog/brief route is **source-only**, `631849f:src/Home.tsx:63`, `src/App.tsx:102,210,253`; it is not a task example loader. | Acceptance-11 **11-G01, A11-GUIDE**, shared **G10/G18/G19**. In the actual accepted copy, use its existing example action and show all four requests, base assignments and both totals of 120. Record actual control names and artifact identity. No new Try example control is assigned here. |
| Conflict correction | **NOT RUN** for the task. Acceptance-11 supplies independently checked base/edit/impossible expectations; source existence or helper tests do not prove rendered correction. | **11-G02 through 11-G12b, N1/N2/N3**, **G10/G11**. Show changed A/B values for G02, reject impossible/invalid drafts without losing requests or relaxing limits, and distinguish exhausted search from infeasibility. Use the existing key, not a copied fixture. |
| Fresh human review | Task **NOT RUN**. Factory review controls are **source-only**, `631849f:src/App.tsx:139-148,247,249`; [[Research/QA/Acceptance-Reconcile-631849f]] documents why factory approval alone is insufficient. | **A11-REVIEW, A11-EXPORT, A11-BYTES, A11-DECISION**, **G08/G10/G11/G13/G14/G18**. Review the base, edit to G02, show immediate clearing/superseding of old review, check the fresh result and explicitly review it. Rerun/repair requires fresh preview and acceptance. Bind the human decision to the exact final-copy manifest. |
| Save and reopen | Task restoration **NOT RUN**. Factory brief storage and executable download are separately **source-only**, `631849f:electron/storage.ts:29-61`, `src/ExecutableDownload.tsx:9-19`. Neither proves task data recovery. | **A11-SAVE/A11-GUIDE/A11-OFFLINE**, **G12/G19**; **A11-PACKAGE, G20-G23** only for a claimed executable route. Save reviewed G02 and its readable summary; close, reopen the exact delivered app and restore its own saved draft. Compare all inputs/results, totals, rest and version-specific review. Cold offline launch needs separate observed evidence. |

[R, proposed, Acceptance-11] Keep observations and decisions in that existing acceptance record, including source revision, actual route/run/artifact ID, manual edits, fixture identity, platform, timestamp and evidence path. A changed copy needs new identity and affected checks. The record already defines PASS/FAIL/NOT RUN/BLOCKED/NOT IMPLEMENTED; no result is filled here. For a checker fallback, reject an invalid proposed draft without claiming a search proved infeasibility; use its documented acceptance adjustments.

## Preparation and delivery boundaries

[R, proposed, Directive-qa; source-only `631849f:src/App.tsx:102-111,210,253`] The technical operator prepares **desktop Home -> catalog ID 11 -> brief -> Save challenge -> Flow**. Verify the saved challenge ID and partial scope, then resume through Home -> My builds when needed. Acceptance-11 **A11-UI** maps this to **G01/G02/G08/G11**. The existing `scripts/smoke-home.mjs` checks an ID 36 intake and persistence, not ID 11 generation; its execution is NOT RUN in the supplied gate. Quality owns the narrow ID 11 supplement and any launch.

[E, source-only, `631849f:src/api.ts:9-23`, `electron/storage.ts:29-61`, `electron/executable.ts:65-79`] Browser briefs use browser storage, desktop briefs use factory state, and executable packaging stages application bytes. None transfers task data by itself. [R, proposed, Directive-rande and Acceptance-11 A11-SAVE/A11-PACKAGE] Record those three boundaries independently. Claim no browser-to-desktop transfer, alternate-profile migration, automatic draft recovery or synchronization without matching evidence. Restore only the task's own saved format through its existing supported mechanism; do not build a general importer.

[R, proposed, Directive-qa G05/G07/G15 and Acceptance-11 A11-AUTHORITY] Before live preparation, the main QA lead needs existing consent, containment and Stop/quit evidence. Monitor active work and changed bytes; stop and escalate failed shutdown, unexplained output or prohibited data to the overseer. Human decisions cover execution, final artifact and submission separately. No official scheduling, external messages, publication or credential entry is part of this task. [E, source-only] The current Home/Stop concern and minimal reproduction are in [Delta-631849f](Delta-631849f.md).

## Current handoff limits

[E, attributed report] `org/reports/mvp-gate.md` reports 128 passes at `631849f`; Acceptance-11 still has blank actual-app observations and decisions. Its arithmetic and the old UX screenshots do not prove task usability, benefit or recovery. [R, proposed, Directive-rande] Finish this handoff once, leave missing outcomes NOT RUN and await an actual artifact or material change. Do not recruit participants, run this protocol, poll for results or expand the design.

## Sources

- [E] [[Research/QA/Officer/Acceptance-11]], [[Research/QA/Officer/11-Training-Golden]], [[Research/QA/Test-Plan]], [[Ops/Directors/Directive-qa]], [[Ops/Directors/Directive-rande]].
- [E] [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Test-Results]], [[Research/QA/Acceptance-Reconcile-631849f]].
- [E, local read only] https://github.com/danjung9/FleetHarness/tree/631849f638614735a89a555d487d6b3c777c52e3 ; source files cited per row.

## Historical formative protocol, deferred and unrun

[E] The original proposal below is preserved verbatim. Its participant recruitment, timings, comparison, controls and targets are historical proposals, not authorized current work or observed results. Directive-rande closes that research expansion.

<details>
<summary>Original formative-study proposal</summary>

# Check whether the proposals actually make the task easier

## Bottom line

[R] Test the completed task separately from software creation. [R] Ask participants to act without a narrated tour, then observe correction and recovery. [A] Five participants provide formative feedback, not a representative Fleet study. [E] This protocol is proposed; no participants or results are recorded here.

## Preparation

[R] Use the Plan's four-request synthetic fixture and independently fixed expected outcomes. The evaluator holds failure cases outside the build worker's access. Record application commit/artifact digest, fixture version, browser/OS, starting state, permitted setup and which interface owns the saved run. State whether the app was generated, manually edited or a deterministic fixture. Do not use real rosters, messages or schedules.

[R] Seek up to five available representative noncoding users. If only teammates are available, label the exercise a proxy walkthrough and do not claim Sailor validation. Collect aggregate counts and timings without names, unit details, contact information, recordings or screenshots containing people.

## Session, approximately 15 minutes [A]

| Task given to the participant [R] | Observe [R] | Proposed target [A] |
| --- | --- | --- |
| Open the tool and check the supplied example. | First useful result, help requests, errors; setup time separately. | 4 of 5 within 5 minutes. |
| Make this conflicting request fit the supplied limits. | Find the error, explain it, correct it without dropping requests or constraints. | 4 of 5 within 2 minutes. |
| Review the draft, change one input, then save it. | Understand review scope and invalidation. | No stale review accepted; every participant recognizes draft status. |
| Close the app, disconnect and recover the saved draft. | Fresh launch, exact restored values, unsupported storage behavior. | All acknowledged saved values recover or an explicit failure is recorded. |
| On a separate prepared creation run, stop work. | Find Stop and explain pending/confirmed state. Technical observer checks termination. | 4 of 5 find Stop within 10 seconds; no false stopped claim. |
| Optional sponsor task: correct and save the sample brief. | Can identify input, output, limitations, reviewer and check. | 4 of 5 within 3 minutes. |

[R] Use at most ten minutes of orientation if needed, but record it separately and retain first-attempt failures. Do not teach the button sequence before measuring discoverability.

## Correctness and recovery checks

[R] An independent evaluator exercises feasible, fresh-edit, impossible, rest-boundary, invalid/duplicate ID and search-budget cases from the Plan. Check displayed and exported values against the independent answer, including every request. Deliberately wrong output must fail acceptance. A passing generated test suite is supporting evidence, not a substitute for these browser checks.

[R] Test the main route by keyboard and at 200% zoom. Identify states without color. Invalid files, blocked storage and unavailable model service must preserve the user's draft. Cold offline launch is different from disconnecting a page that is already open.

## Comparison and reporting

[R] Use matched synthetic cases with similar difficulty for the current manual method and tool method. Alternate order to reduce learning effects. Count preparation, data entry, checking, correction and export/reconciliation, plus critical errors and help. Report per-task values and medians with sample size. The existing 30% reduction target is a hypothesis; do not project ship-wide hours from this sample.

[R] Record each check as Pass, Fail or Not run, with version and evidence. A missed critical constraint, silent data loss, stale approval or false stop claim prevents calling that path accepted. Escalate to the designated technical operator, use a known checked artifact if available and state the limitation. No automatic publication or outward message occurs.

## Sources

- [R] [[Research/Plan/Plan]], [[Research/Naval-User/Simplicity-Requirements]].
- [V] Review and correction pattern: https://design-system.service.gov.uk/patterns/check-answers/
- [V] Error focus and links: https://design-system.service.gov.uk/components/error-summary/
- [V] Component-specific testing remains necessary: https://designsystem.digital.gov/components/step-indicator/

</details>

