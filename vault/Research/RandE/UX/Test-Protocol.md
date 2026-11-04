---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A small synthetic-task protocol for usability, correctness, review and interrupted use."
---

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

