Primary deferrals, external portions remain unverified:

| ID | Basis | Concrete dependency, impact and synthetic demonstration |
| --- | --- | --- |
| UC36-4 | real-systems | Authorized government device/browser policy and owner-selected low-code runtime are required to establish actual compatibility. Synthetic desktop/narrow workflow, reload and exports are demonstrated; they cannot certify those systems. |
| EVAL36-3 | human-authority | A Fleet SME must authorize the official manual baseline; synthetic elapsed timing, assumed 1200-second comparison and arithmetic cannot establish that authorized comparison. |
| EVAL36-5 | human-authority | An actual Sailor panel must judge usability. Complete task flows and an unscored panel worksheet are demonstrated; software cannot supply panel judgment. |
| EVAL36-6 | human-authority | Official judges must assign the rubric scores. A worksheet with exact categories/weights and blank scores is demonstrated; it cannot confer official scores. |
| DELIVERABLE36-1 | real-data | Observed unit workload and time-use data are needed to establish hours actually returned. Measured prototype timing and fictional 20-packet illustrative savings cannot establish realized benefit. |
| DELIVERABLE36-2 | real-data | Comparable unit baseline and follow-up error/rework observations are needed to establish actual reductions. Four seeded issues caught/corrected demonstrate synthetic prevention, not operational improvement. |

# Verification, bounded host-failure repair, 2026-11-04

Generated and locally tested; prototype browser gate remains failed pending host rerun. requirementsMet: false. Reviewer acceptance and operational validation are unverified. Frozen acceptance-plan.json, ux-spec.json, system-design.json, .fleet inputs and host evidence were not edited.

## Original host evidence

The supplied test-report.json records 21/21 Node tests passed, no skips. Browser journeys passed 14/20 executions: tasking-records, validation-recovery, missing-history, transfer-resume, evaluation-exports, save-recovery and safety-stop passed on desktop (1280×800) and narrow (390×844), with no reported errors or horizontal overflow. forms-route failed step 11 (training summary); conflict-review failed step 17 (local conflict value); replay-converge failed step 17 (edit heads), at both sizes. Each timed out at five seconds. All original screenshots and trace ZIPs remain in .quality-evidence/0968e8743ec2-bc1c736d-3eb4-4f40-aaa6-8872f0555f33/; exact paths are in test-report.json quality.journeys. The forms-route desktop trace snapshot shows duration reverted to `4?` and quantity to `-2` while the corrected subject survived. Trace snapshots were inspected; no visual screenshot inspection is claimed.

Some host aggregate criterion failures list journeys that individually passed. The mapping below uses each criterion's frozen journey references and the actual journey entries, without editing or overriding the host aggregate status.

## Diagnosis, bounded repair and local tests

A queued change clones state before awaiting IndexedDB, but form controls previously stayed editable. A later edit could mutate the current state while the transaction was pending, then be lost when change adopted its earlier snapshot. This accounts for intermittent reverted corrections and the three literal mismatches.

The shared UI queue in index.html now locks buttons, inputs, selects and textareas synchronously on enqueue, retaining the draft-export escape. A pending-operation counter keeps controls locked until the queue drains, including after failures; initial storage opening also locks fields. This prevents editing during adoption of a transaction snapshot. Domain logic in core.cjs and the inline core is unchanged and consistent. No tests or frozen expectations were weakened. Architecture filenames remain accurate.

Executed before repair: node --test core.test.cjs, 21 passed, zero failed/skipped. Executed after repair: node --test core.test.cjs ui.test.cjs, 23 passed, zero failed/skipped/cancelled/todo. The new tests execute the real UI script in a Node VM with a minimal DOM fixture and controlled storage promises: synchronous locking during delayed state adoption, successful subsequent duration/quantity save, and unlock/draft preservation after rejected work. They are application tests, but not a real browser or IndexedDB test.

Existing adversarial application checks cover opposite merge orders, replay idempotence, concurrent edit/edit and edit/delete, all-head resolution, unfinished draft guards, missing/cross-record/cyclic/colliding history, invalid dates, whitespace, stale approval, paused routing, zero/negative/fractional byte budgets, interrupted and duplicate acknowledgements, atomic invalid-receipt rejection, retention and negative illustrative savings. Prior verification recorded six adversarial failures before its earlier core fixes; those fixes and tests remain intact. This host-requested repair addresses only the newly supplied browser failures.

Fleet domain tools additionally returned two preserved edit/delete heads and the 4096-byte allocation (critical 1024, image 3072 from offset 6144). These are reference calculations, never counted as application verification.

## Every-criterion evidence mapping

Inputs and independently planned expectations remain in test-matrix.md and acceptance-plan.json. Application evidence is core.test.cjs and ui.test.cjs. Browser evidence below is the original host run, not a post-repair pass. Every repaired browser journey and all regression journeys await the host rerun at both sizes.

| Criterion | Frozen journeys / original evidence | Current disposition |
| --- | --- | --- |
| UC36-1 | forms-route, tasking-records, conflict-review, save-recovery; test-report.json quality.journeys | Original browser failure: forms-route, conflict-review; post-repair rerun pending |
| UC36-2 | validation-recovery, conflict-review; test-report.json quality.journeys | Original browser failure: conflict-review; post-repair rerun pending |
| UC36-3 | evaluation-exports, conflict-review; test-report.json quality.journeys | Original browser failure: conflict-review; post-repair rerun pending |
| UC36-4 | External dependency: Authorized government device/browser policy and owner-selected low-code runtime are required to establish actual compatibility. Synthetic desktop/narrow workflow, reload and exports are demonstrated; they cannot certify those systems. | Deferred / unverified |
| UC36-5 | safety-stop, forms-route, evaluation-exports; test-report.json quality.journeys | Original browser failure: forms-route; post-repair rerun pending |
| UC36-6 | forms-route, tasking-records, conflict-review, evaluation-exports; test-report.json quality.journeys | Original browser failure: forms-route, conflict-review; post-repair rerun pending |
| OFF-01 | replay-converge; test-report.json quality.journeys | Original browser failure: replay-converge; post-repair rerun pending |
| OFF-02 | replay-converge, conflict-review; test-report.json quality.journeys | Original browser failure: replay-converge, conflict-review; post-repair rerun pending |
| OFF-03 | replay-converge, missing-history; test-report.json quality.journeys | Original browser failure: replay-converge; post-repair rerun pending |
| OFF-04 | transfer-resume; test-report.json quality.journeys | Original journeys passed at both sizes; post-repair rerun pending |
| OFF-05 | forms-route, save-recovery, conflict-review, transfer-resume; test-report.json quality.journeys | Original browser failure: forms-route, conflict-review; post-repair rerun pending |
| EVAL36-1 | evaluation-exports, tasking-records; test-report.json quality.journeys | Original journeys passed at both sizes; post-repair rerun pending |
| EVAL36-2 | validation-recovery, evaluation-exports; test-report.json quality.journeys | Original journeys passed at both sizes; post-repair rerun pending |
| EVAL36-3 | External dependency: A Fleet SME must authorize the official manual baseline; synthetic elapsed timing, assumed 1200-second comparison and arithmetic cannot establish that authorized comparison. | Deferred / unverified |
| EVAL36-4 | forms-route, tasking-records, conflict-review, replay-converge; test-report.json quality.journeys | Original browser failure: forms-route, conflict-review, replay-converge; post-repair rerun pending |
| EVAL36-5 | External dependency: An actual Sailor panel must judge usability. Complete task flows and an unscored panel worksheet are demonstrated; software cannot supply panel judgment. | Deferred / unverified |
| EVAL36-6 | External dependency: Official judges must assign the rubric scores. A worksheet with exact categories/weights and blank scores is demonstrated; it cannot confer official scores. | Deferred / unverified |
| DELIVERABLE36-1 | External dependency: Observed unit workload and time-use data are needed to establish hours actually returned. Measured prototype timing and fictional 20-packet illustrative savings cannot establish realized benefit. | Deferred / unverified |
| DELIVERABLE36-2 | External dependency: Comparable unit baseline and follow-up error/rework observations are needed to establish actual reductions. Four seeded issues caught/corrected demonstrate synthetic prevention, not operational improvement. | Deferred / unverified |
| DELIVERABLE36-3 | forms-route; test-report.json quality.journeys | Original browser failure: forms-route; post-repair rerun pending |

## Remaining verification and limitations

The host owns test-report.json, hashes, browser screenshots and traces. They were preserved and no replacement evidence was manufactured. No dedicated browser tool is assigned in this phase. The completion gate cannot be claimed until the host reruns Node and all ten frozen journeys at both viewport sizes; successful Node fixtures do not substitute. Human clarity, keyboard/focus usability and visual review remain unverified beyond the host's specified interactions.

README now explains the field lock and awaiting operations between edits, retains the exact sample corrections and output names, and records original browser results separately from the post-repair Node result. All mapped implementation files exist; component generated status means implementation presence only.

Real government/low-code compatibility, official formats and ground truth, SME baseline, panel and judges, measured operational benefits, physical restart/eviction/quota resilience, cross-tab races, authenticated transport/identity, encryption/key lifecycle and operational retention remain unverified. Browser reload is narrower than device restart. Diagnostic save failure is simulated. Both replicas and receipts are local; no operational endpoint was contacted. Exports have no import/restore workflow. requirementsMet remains false independently of any later prototype pass.
