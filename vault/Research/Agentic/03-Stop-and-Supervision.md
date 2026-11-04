---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Revoke authority first, await local work termination, and keep restart or delivery blocked when shutdown is incomplete."
---

# Stop that ends local work

## Bottom line

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
