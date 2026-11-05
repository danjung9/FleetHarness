---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Round 3 challenges 12, 36 and 11 fail during final process cleanup; the flow discards the diagnostic reason. Dev-4 owns the bounded correction."
---

# Stop that ends local work

## Bottom line

[E, R3 ID 12, ID 36 and ID 11 receipts and pinned source] Generation and automatic verification finished successfully, but the final process sweep rejected before these runs could settle at human review. The cleanup catch changes review to failed and discards the underlying reason. [R] Return all three receipts to **dev-4**, the existing cleanup owner, with the same three-file correction below. [E] The retained evidence proves the failure boundary, but cannot establish whether processes survived, inspection failed or cleanup ran out of time. A specific native scanner repair is not yet supported by the evidence.

## Round 3 challenge 12: exact failure path

[E] `Research/QA/Ten/R3/id12-optask/final.json` and `test-report.json` contain identical reports at `2026-11-04T22:24:16.638Z`: exit 0, 27/27 Node tests, no skipped tests, 14/14 browser executions, seven criteria passed and requirementsMet true. Intake through verify are complete; review is failed and delivery queued. `log-tail.txt:89` records the successful-check handoff, followed at line 90 by the generic cleanup failure. `first-open.json` separately records no page/console errors, no external requests and a nonblank page. These are retained results, not new runtime tests or independent task acceptance.

[E, `electron/pi-backend.ts` at f662d81] The causal chain is:

1. Lines 271 to 274 accept the verification report, complete verify, mark the review stage pending human review and set `run.outcome = 'review'`.
2. The `execute()` finally block at line 279 always calls `finish()`. At line 53, `finish()` awaits `run.processes.stop()` before assigning the final project status.
3. The catch at lines 59 to 63 sets the project to failed, changes the review stage to failed and logs the generic warning. It does not retain the caught exception. This matches both the recorded event order and final stage states. The report remains passed because this failure occurs after application verification.

[E, `electron/process-sweep.ts:111`] Cleanup requires two empty process scans. It can reject for failed inspection, an invalid target identity, surviving run processes or failure to settle within its deadline. Its own inspection catch at line 115 also collapses discovery exceptions. On macOS, discovery uses three sequential process snapshots, with retries for changed identity; each process-list call has a 1,500 ms timeout, while the sweep uses a nominal 400 ms grace plus 1,600 ms kill window. Those are source facts, not proof that a timeout caused this run's failure. The receipt retains no reason category, elapsed cleanup time, scan count or surviving process identities.

[E] The exact supported agent-flow cause is **post-verification cleanup rejection preventing the review outcome**, compounded by loss of the diagnostic cause in the host. A live descendant, denied inspection, unstable snapshot or insufficient deadline cannot be selected as the exact operating-system cause from these files. No parser repair, extra model turn or relaxation of acceptance follows from this receipt. Keep the cleanup gate: an unconfirmed shutdown must not become a successful review outcome.

## Round 3 challenge 36: same failure boundary

[E, retained JSON and log read] `Research/QA/Ten/R3/id36-paperless/final.json.report` equals `test-report.json`, timestamp `2026-11-04T22:25:42.928Z`: exit 0, 24/24 Node tests, no skips, 14/14 browser executions across seven journeys at two widths, and no quality errors. Fourteen criteria passed and six remain unverified; requirementsMet is false. Intake through verify are complete, review is failed and delivery queued. The run took 14.2 minutes. `log-tail.txt:90` records the successful-check handoff; line 91 records the cleanup error. `first-open.json` reports no page, console or click errors, no outside requests, a nonblank page and no narrow overflow.

[E, receipt matched to f662d81 source] This is the same `execute()` to `finish()` to `run.processes.stop()` rejection documented for ID 12 above. The final status comes from `electron/pi-backend.ts:59-63`, after the successful verification transition at lines 271 to 274. The six unverified requirements do not cause this exception: the host accepted the report and reached review before cleanup failed. Earlier application defects reported in the log were repaired before the saved passing report. This receipt supplies no failed native-select journey and no evidence that another application repair would fix the terminal failure.

[R] Consolidate ID 36 into this dev-4 handoff, with no extra code seat or file scope. Keep all six unverified obligations visible and preserve the separate task-coverage findings in [[Research/Agentic/09-Primary-Task-Deferral]]. Passing automatic checks does not establish satisfactory challenge completion. A native cleanup reason and a functional repair remain unverified because the saved error discarded that reason.

[E, SHA-256 comparison] All 43 manifest paths exist; 36 hashes match. Seven Markdown copies differ: `README.md`, `path-to-fleet.md`, `plan.md`, `research.md`, `scope.md`, `test-matrix.md` and `verification.md`. The manifest warns that vault synchronization normalizes Markdown dashes. Application files, tests, frozen contracts and the test report match; the diagnosis uses the matching report and retained final/log evidence. Final JSON SHA-256: `709e1bc96f4465d4bebd01f223e3c72f2fe9029ade003b06318439994e0a1bb0`. Log-tail SHA-256: `38b20c1c475e4aff08ef91d5cf79cf4679c201063b1c6fc84d256b56232a11d2`. No generated code or native process scan was executed for this check.

## Round 3 challenge 11: same failure boundary

[E, retained JSON and log read] `Research/QA/Ten/R3/id11-training/final.json.report` equals `test-report.json`, timestamp `2026-11-04T22:26:19.292Z`: exit 0, 15/15 Node tests, no skips, 16/16 browser executions and no quality errors. Four criteria pass; UC11-1, SCH-04 and SCH-05 remain unverified, so requirementsMet is false. Intake through verify are complete, review is failed and delivery queued. `log-tail.txt:88` records the successful-check handoff; line 89 records the cleanup error. `first-open.json` separately reports no page, console or click errors, no outside requests, a nonblank page and no narrow overflow.

[E, matched to f662d81 source] This is the same `execute()` finally block calling `finish()` and `run.processes.stop()`, followed by the exception-discarding catch at `electron/pi-backend.ts:59-63`. The earlier unavailable-personnel fixture mismatch was repaired before the saved passing report. Neither that earlier browser failure nor the three deferred requirements caused the terminal cleanup exception. The exact supported flow cause is cleanup rejection after verification; the native reason is unavailable because the host replaced it with a generic message.

[R] Add ID 11 to the existing dev-4 correction in `electron/process-sweep.ts`, `electron/pi-backend.ts` and `tests/process-sweep.test.mjs`. Preserve categorized, bounded cleanup diagnostics and add the missing successful-build-to-review regression, then let main capture native evidence to select the functional cleanup fix. No additional model repair or application edit is justified by this failure. Keep cleanup mandatory, the three unverified obligations visible and final artifact approval with a person.

[E, SHA-256 comparison] All 79 manifest paths exist; 74 hashes match. Five Markdown reading copies differ: `README.md`, `plan.md`, `research.md`, `test-matrix.md` and `verification.md`. The manifest documents dash normalization during vault sync. Application files, tests, frozen contracts and the test report match. Final JSON SHA-256: `952bd8400a10d65df9b0786cc668efa995f9689bdf5ab16d7c00197905f55ab8`; log-tail SHA-256: `fc5ac8e0a987cca8095f10e8ab4ff49dad3d4c669638944d9f2da4890aefa37f`. These checks read retained data and pinned source; no generated code or process scanner was run.

## Smallest correction and code seat

[R] **Owner: dev-4**, the cleanup implementation owner recorded in `org/reports/feed-118.md`. The current [[Ops/Directors/Directive-development]] keeps native investigation with main and routes proved cleanup defects back to the existing owner after current work and file handoff. This is a handoff recommendation, not a new dispatch. Coordinate `electron/pi-backend.ts` with the current integration/judge work before editing. No frontend or generated-app change is needed.

| File | Smallest justified change [R] |
| --- | --- |
| `electron/process-sweep.ts` | Return or throw a bounded cleanup diagnostic with an allowlisted reason, elapsed time, scan count and confirmed remaining PID/start identities where available. Preserve distinctions between inspection failure, unstable snapshots, invalid identity, survivors and insufficient settling. Keep raw process command lines, environments, stdout/stderr and arbitrary exception text out of the receipt. Preserve ownership rechecks and termination safeguards. |
| `electron/pi-backend.ts::finish` | Catch the typed diagnostic and append only its safe fields to the existing persisted log/error. Preserve the passing application report and failed cleanup outcome. Keep review/delivery blocked on cleanup failure. Unknown errors retain a generic fallback. This fixes the demonstrated information loss; it does not by itself repair native cleanup. |
| `tests/process-sweep.test.mjs` | Add a normal-success-to-review case alongside the current stop/failure cases. Prove success waits for cleanup, and that distinct injected inspection, survivor and settling failures remain distinguishable in persisted evidence while still failing the run. Include a raw-error sentinel that must never enter saved logs. Preserve PID-reuse and lost-ownership negative controls. |

[R] Dev-4 first retains a failing-before/passing-after diagnostic regression. Main/QA then captures one native successful-run cleanup and the existing detached-worker fixture on the exact prepared revision, with no raw process-environment logging. That receipt determines the smallest functional scanner change in the same owner/files. Require confirmed absence of owned work, stable heartbeats and unrelated-process survival before accepting it. Do not bypass cleanup, blindly increase timeouts, target all processes belonging to a user or send host cleanup failures back to the application repair agent. Failed shutdown remains an operator escalation with separate cleanup evidence and human approval of the final artifact.

[E, `tests/process-sweep.test.mjs` and `org/reports/feed-118.md`] The landed tests exercise real detached workers using injected discovery. Their backend outcome loop covers stop, failure and cleanup-failure, but not normal success reaching review. The implementation/review reports explicitly leave native discovery to main. Those test results do not prove this normal-completion path works on the benchmark machine.

## Identity, grouping and limits

[E] [[Research/QA/Ten/Round-3]] identifies f662d81 plus disclosed scratch changes to the engine/account/verification route. Local Git inspection found no committed changes to `process-sweep.ts`, `pi-backend.ts` or their focused tests between f662d81 and supplied mvp 0da7ce9. The exact prepared scratch tree was not present in the supplied evidence packet; no claim of byte-identical runtime source is made.

[E, ID 12] Forty of 45 retained manifest entries match SHA-256, with none missing. The five differences are `README.md`, `plan.md`, `test-matrix.md`, `user-guide.md` and `verification.md`. The app, test source, frozen acceptance plan and test report match. Final-report equality and the log order establish this diagnosis without relying on those differing Markdown copies. Final JSON SHA-256: `b7c973841ffa5126c3d8085f60653db50bd9fdced9b6b09d816e404e07b374d2`; log-tail SHA-256: `3088baf3361bf3ea704a587deb2bca8103de87591d403dddcdc3de887269d84f`.

[E] ID 12 was the first cleanup rejection recorded here; IDs 36 and 11 are now grouped with it. The shared cause remains separate from [[Research/Agentic/09-Primary-Task-Deferral]] and [[Research/Agentic/08-Native-Select-Repair]]. The earlier measured detached Pi survivor is a separate receipt, not proof of the native cause in these R3 runs. No repository program, browser, process scanner or model build was executed for this review. Native failure reason, a functional repair and independent satisfactory judgment remain unverified.

[E] Current sources: `Research/QA/Ten/R3/id12-optask/{final.json,log-tail.txt,test-report.json,first-open.json,MANIFEST.json}` and the same five files in `Research/QA/Ten/R3/id36-paperless/` and `Research/QA/Ten/R3/id11-training/`; [[Research/QA/Ten/Round-3]]; local pinned source at https://github.com/danjung9/FleetHarness/tree/f662d81; `org/reports/feed-118.md`, `snapshot-158.md`; [[Ops/Directors/Directive-development]] and [[Ops/Directors/Directive-agentic]]. Repository URL is a revision reference, not a remote retrieval.

[E, ID 12 closeout relay] LATEST then named mvp 0da7ce9; LATEST-analysis then covered hosted hash alignment at 5a9d7d1. These are historical relay observations.

[E, ID 36 closeout relay and patch read] LATEST now reports dan/backend-improvements at e27ad6a, pulled 17:28:32. LATEST-analysis now explains that its comparison against mvp 0da7ce9 includes branch divergence. The supplied comparison removes `electron/process-sweep.ts`, its tests and the final cleanup gate in `electron/pi-backend.ts`; it is not evidence that either new commit deliberately removed them or fixed the R3 failure. [R] Dev-4 and the integrator must preserve cleanup, process markers and negative controls when incorporating the new brief-input flow, then apply the bounded correction to the integrated files. Do not replace the current branch wholesale or count a missing cleanup gate as a successful repair. No teammate code is changed here.

## Historical design at 50fcaea, retained as background

[E] The sections below preserve the earlier design and its then-current evidence. Their broad supervisor proposal, estimates and historical holds are not the R3 allocation. Use the bounded dev-4 handoff above and current directives for this failure.

[R] Must before any new live generation: prove that Stop prevents more tool dispatch and leaves no candidate work running. Do not equate a settled promise or saved stopped status with process termination. [R] The smallest immediate patch joins agent and packaging cancellation under the existing Stop IPC. A killable restricted Pi worker and proved test boundary are the complete design; cut the general cross-platform sandbox rewrite for Thursday and use an already proved preparation environment or an accepted saved artifact.

## Current evidence

[E, final directive read] [[Ops/Directors/Directive-agentic]] defers supervisor implementation and asks Quality to reproduce the pending-start and packaging cancellation seams at the current revision before patch allocation. [R] Treat the changes below as design only. No observed shutdown evidence currently clears a live-run gate in this review.

[E, local source at 50fcaea] `runAgentStage` races work against interruption. Cleanup deliberately does not wait for Pi's `abort()` promise and calls `dispose()`. `FleetBackend.stop` awaits the run's `done` promise, which resolves after state persistence. This prevents a hung SDK promise from hanging the controller but does not itself prove every local action has ended.

[E] `verifyWorkspace` sends a process-group kill on non-Windows systems, but can resolve its interruption race before child close. `runPackageWorker` also sends a group kill and waits for close. Neither establishes containment of arbitrary detached descendants on every supported platform. Existing tests prove some stalled-provider and worker cases in their code; no execution at this commit was performed here.

[E] Dan's new `deliveries` map is separate from `backend.active`. `fleet:stop` calls only `backend.stop(id)`, while `before-quit` aborts both agent runs and deliveries. A stop requested during `startingRuns` can also precede backend reservation during asynchronous authentication. These are concrete controller seams to cover; the visible availability of a Stop control during packaging was not inspected.

## Smallest change and exact files

| File | Small proposed change [R] |
| --- | --- |
| `electron/main.ts` | Replace the start-only set with a cancelable operation record before any await. Route existing `fleet:stop` to pending start, active backend and delivery; keep it idempotent. Reject restart, approval and export while stopping or shutdown is incomplete. |
| `electron/pi-backend.ts` | Give each run an immutable epoch/token and supervisor registration. Revoke dispatch immediately; ignore late callbacks from closed runs. Do not free a slot as safely stopped before the supervisor confirms exit. |
| `electron/agent-runner.ts` | Keep watchdogs, but report interruption separately from session cleanup completion. Add bounded cleanup result rather than interpreting abort/dispose as proof. |
| New `electron/run-supervisor.ts`, `electron/pi-worker.ts` | Own the restricted Pi session in a child and typed progress transport. Parent owns lifecycle, tool authorization, persisted state and exit receipts. No arbitrary process-spawning tools in this mode. |
| `electron/verification.ts`, `electron/executable.ts::runPackageWorker` | Register child/process boundary with supervisor, await termination evidence, bound cleanup waiting and surface incomplete shutdown. Preserve current timeout and kill paths. |
| `electron/storage.ts`, `shared/types.ts` | Persist optional lifecycle details: operation ID, stop request, exit receipt, last action, stop reason and incomplete flag. Recover conservatively without auto-resume. |
| New `tests/run-supervisor.test.mjs`, existing `tests/agent-runner.test.mjs`, `tests/pi-sdk.test.mjs`, `tests/executable.test.mjs` | Exercise cancellation races, actual canary activity and packaging cancellation. |

[R] First mergeable slice: one operation/cancellation record and unified Stop handling in main, with race tests. This improves cancellation coverage but must not be advertised as full containment. Second slice: restricted worker and exit proof, dependent on note 05. Generated Node tests require their own already proved isolated executor; do not move them into the Pi worker and call it isolation.

## Lifecycle contract

[R] Use the following internal sequence, represented through existing logs/status fields until Dan chooses any UI change:

1. Register the operation before provider checks, dialogs or worker startup. Stop can revoke even an operation that has not spawned yet.
2. Atomically mark dispatch revoked. Reject new model requests, tool calls, late writes, component events, repair and promotion for that run token.
3. Cancel local request transports and registered test/package work. Give cooperative cleanup at most 2 seconds, then terminate the approved process boundary. This grace period is a proposed starting value.
4. Wait for worker close and confirmed empty process boundary, plus completion of parent-owned in-flight writes. Stage file writes through the parent broker so it can drain or reject them before marking stopped. Late replies cannot reopen authority.
5. Record stopped only when termination is proved. After a proposed 5-second shutdown deadline, report shutdown incomplete, preserve locks and instruct the operator to stop the enclosing environment. Timeout is not success.

[R] Under restricted no-shell tools, the Pi worker has no permitted child launch path. If generated execution or arbitrary shell remains enabled, a process group alone is insufficient: require an owned container/VM or equivalent tested process boundary whose termination includes descendants. Do not promise that mechanism on all platforms before proving it on the demo machine. The parent must also stop unfinished package jobs; a packaging timeout is not the whole-run budget.

[R] Controller crash/restart invalidates old dispatch tokens. An external supervisor or disposable environment provides cleanup if the controller itself dies. Persisted process IDs are diagnostic only; do not blindly kill a possibly reused PID after restart. Quarantine incomplete runs and require operator cleanup. Provider requests already received remotely may still complete or incur usage; local Stop prevents further local work and submissions, not retroactive remote cancellation.

## Proof to require

[R] Use a synthetic heartbeat file and a mock provider, never real credentials. Stop during initialization, stalled stream, long tool call, README follow-up, repair, Node verification, open save dialog and packaging. Assert no later heartbeat/file change, no new requests, no late state promotion, no delivery rename and no active owned process after the acknowledged stop. Include double Stop, start immediately after Stop and stale event arrival from a prior run.

[R] Add a detached-grandchild negative control in the disposable execution environment. If it survives, report incomplete shutdown and disable that execution mode. Inject a stuck close event and a store-save failure to prove the slot stays quarantined. Separately prove normal successful run cleanup and app quit. Run actual process-tree/canary observation on the supported demo platform; promise mocks alone are insufficient.

## Risk and relationship to Dan's latest change

[R] Preserve the new packaging worker, its `deliveries` lock, quit cleanup, archive staging and retryable failure state. Extend their shared cancellation ownership rather than replacing them. Preserve the five phase events and README follow-up; they all share one revocable run token. No frontend file needs editing to enforce these backend gates.

[A] Unified cancellation and race handling are roughly 1 to 2 hours. Restricted Pi transport plus end-to-end stop proof is roughly 4 to 8 additional hours and overlaps note 05. A general executor and multi-platform descendant guarantee exceeds this slice. If the proof is not ready, remove live generation from the demo and use a preparation environment whose emergency shutdown has already been tested. This fallback still requires actual preparation controls.

## Sources

[E, final relay reconciliation] `631849f` later consolidated the frontend. A pinned diff shows no changes from `50fcaea` in `electron/`, `harness/`, `skills/`, `shared/` or the dependency lock, so this design's backend file map remains applicable. Use the retained unified desktop path in [[Research/Agentic/Run-Readiness-50fcaea]]; do not restore removed Studio/Workbench interfaces. All implementation remains deferred pending allocation.

- [E] Local source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe, functions and tests above.
- [E] [[Research/Architecture/Target-Architecture]], [[Research/Build-Patterns/Isolated-Execution]], [[Research/Plan/Findings]].
- [R] [[Research/Agentic/05-Phase-Tool-Policy]], [[Research/Agentic/06-Run-Budgets]].
