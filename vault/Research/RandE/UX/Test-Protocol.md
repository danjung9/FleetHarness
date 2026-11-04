---
type: research
status: complete
owner: mukul
updated: 2026-11-04
summary: "Reuses current Quality receipts, final-copy acceptance and the existing synthetic trial without duplicating their protocols."
---

# Existing acceptance and trial handoff

## Bottom line

[R, meeting 31] Use [[Research/QA/Acceptance/Review-Candidates]] for current candidate evidence and [[Research/QA/Officer/Acceptance-11]] for the independent key and human decision. [E, receipt reads] Task checks have run: both candidates have fresh-input, review-invalidation and fresh offline import evidence, while residual coverage and human acceptance remain open. [R] Reuse [[Research/QA/Officer/Trial-Protocol]] and [[Research/QA/Officer/Burden-Claim]] after acceptance and scope reconciliation. This note creates no replacement matrix, fixture, trial or acceptance decision.

## Current evidence and its limits

[E, attributed report] [[Research/Plan/Real-Build-Run1]] identifies the modified 631849f factory build, true route and 22 generated-test passes at 15:24:21. Those tests establish the reported build result, not independent domain acceptance. The report's later modified d0f4c69 run2 remains distinct from this assigned Pipeline-run1/CLI comparison.

[E, JSON reads] [Factory edf3150f](../../QA/Acceptance/Results/training-acceptance-edf3150f-4563-4059-b9c0-6ecca70e64ac/result.json) records **33 PASS/1 FAIL/14 NOT CHECKED**; [CLI af6357a9](../../QA/Acceptance/Results/training-acceptance-af6357a9-6421-4d12-ba9b-21b462cd2b3c/result.json) records **28 PASS/0 FAIL/18 NOT CHECKED**. Quality reports 17 and 13 numeric/outcome passes respectively, with four exact CLI variants unavailable in its form. These receipts include observed review clearing and fresh-context offline saved-file import, replacing this note's previous blanket NOT RUN status. They do not establish human acceptance or measured usability.

[E, receipt comparison and Quality review] CLI af6357a9 preserves the aaa1585f payload manifest; the checker confirmation handling changed. Retain the [failed attempt](../../QA/Acceptance/Results/training-acceptance-aaa1585f-8701-485b-861e-d2cc2ff42f8a/result.json) and the earlier Review-Candidates rerun-pending wording only as history. The review read here already records successful import. No pending import repair or rerun is assigned by this handoff.

[E, attributed Quality review] Preserve CLOCK-DISPLAY FAIL and READABLE-SUMMARY NOT CHECKED. The supplied brief requires relative minutes and portable JSON, not 0800 or a separate readable summary. Quality owns that contract gap and the factory G10 contradiction between unknown feasibility and a complete conflict-free explanation. Imported-review binding, tampered-file assessment, guides and remaining Fleet-Ready evidence remain with its existing owners. [R] Do not edit the oracle, copy the acceptance matrix, turn an automated review-state check into a person's approval or hand-edit generated output.

## Preparation and delivery boundaries

[E, source-only] At d0f4c69 the operator uses **Home -> New challenge -> Norfolk catalog -> Find a published challenge (11) -> #11 -> brief -> Save challenge -> Flow**. The Home example **A training plan that fits** is a shorter prefilled route. **Brief / Save requirements** edits an existing project; **Start build** opens a separate execution consent dialog. Exact paths and the only three unresolved operator checks are in [Delta-d0f4c69](Delta-d0f4c69.md). This is source-based guidance, not an observed current-UI rehearsal.

[E, source-only] `src/api.ts:5-34` distinguishes the desktop bridge from the hosted browser's locally saved briefs and desktop-only actions. `docs/desktop.md:20-38,60` separately describes generated preview storage, packaged-task storage and factory state. [R] Keep desktop creation, hosted UI preview and final copied task distinct. A saved factory brief or generated download does not establish task-data restoration. Conversely, the cited copied-task offline import receipts do not establish executable packaging, browser-to-desktop migration or reconnect sync.

[E, source-only] `electron/browser-verification.ts:143-157` tries installed Playwright Chromium then Chrome, or a supplied compatible executable; failure directs the operator to Chrome or source-checkout browser setup. `package.json:16,40` declares the setup command and Playwright runtime dependency. No installation or browser launch was performed here. The host's reload/download actions do not prove fresh saved-file import; use the existing external receipts.

[E, dated gate] November 4 at 15:46:40 EST, `org/reports/mvp-gate.md` reports **147 pass/20 fail**, d0f4c69 on dev/reviewed, inside the sandbox. The earlier 96/20 remains history. Sandbox attribution and unlinked outside-browser success are runner claims pending Quality's exact evidence, not acceptance. Historical 631849f smoke/Stop results keep their bounded revision and path.

## Existing human walkthrough and trial

[R, meeting 31] Quality and main retain final-copy acceptance: stop writers, record sorted relative paths, lengths and independent SHA-256 digests, exercise the actual copy and bind the person's decision to that manifest. Changed bytes require affected checks and renewed review. Clock/summary scope and exhaustion wording must be resolved openly before the walkthrough. Keep the six Fleet-Ready requirements visible; local recovery does not supply sync or authorization.

[R] An authorized person arranges the existing ten-minute matched synthetic trial, with its consent, baseline, app attempt and anonymous results sheet. Do not run it with an unaccepted artifact or silently change its 0800 key to fit a candidate. Use Burden-Claim's no-trial wording until an actual record supports a narrower observation. No new participant count, recruitment, measurement target or study protocol is assigned here.

[R] Keep execution bounds, final-artifact review and submission approval separate. Monitor active work, changed bytes, failures and tool activity. Stop and escalate prohibited data, unclear results or failed shutdown to the overseer. No official scheduling, messages, publication or credential handling belongs in this task. Historical proposals below remain deferred; current results and ownership above control.

## Sources

[E] [[Ops/Directors/Directive-rande]], [[Ops/Directors/Memo-director-product]], [[Research/Plan/Review]], [[Research/Plan/Real-Build-Run1]], [[Research/QA/Acceptance/Review-Candidates]], [[Research/QA/Acceptance-Reconcile-d0f4c69]], [[Research/QA/Officer/Acceptance-11]], [[Research/QA/Officer/Trial-Protocol]], [[Research/QA/Officer/Burden-Claim]]. Pinned source paths and relay/gate attribution: [Delta-d0f4c69](Delta-d0f4c69.md).

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

