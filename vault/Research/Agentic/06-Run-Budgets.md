---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Apply one deadline and shared request/token accounting across phases, guide writing, retry and repair."
---

# Token and time budgets

## Bottom line

[R] Must for another live run: one operator-approved wall-clock limit, one active run and a bounded request policy. Should: enforce a shared token ledger when every model request, retry and compaction can be intercepted and measured. [R] Keep monetary cost unknown unless actual usage and applicable event pricing are available. No phase transition, guide prompt or repair may reset a run's allowance.

## Current evidence

[E, local source at 50fcaea] `defaultAgentLimits` is 30 minutes per stage, 5 minutes idle and 40 turn starts. `SettingsManager` enables compaction and two SDK retries. Five stages plus one repair can allocate six stage timers, nominally 180 minutes before other overhead; that is arithmetic, not measured duration. Up to three runs are allowed. `TestReport` and `Project` carry no run-wide usage ledger.

[E] Dan's README follow-up stays inside the build stage timer and turn counter, but adds a prompt plus a possible artifact completion prompt. Completion recovery is once per step. The Codex adapter emits a turn event for a user turn, which is not necessarily a count of individual model requests. `runPackageWorker` adds a separate ten-minute timeout after human review. Stopping at a budget currently inherits the termination limitations in note 03.

## Smallest change and exact files

| File | Small proposed change [R] |
| --- | --- |
| New `electron/run-budget.ts` | Immutable limits and monotonic deadline; charge attempts before dispatch and retain usage/unknown flags by request ID. |
| `electron/pi-backend.ts` | Create one budget before preflight/start; enforce one run for the event profile. Pass remaining allowance through all five phases, guide follow-up and repair. |
| `electron/agent-runner.ts` | Use the smaller of phase limit and remaining run time; never refresh the hard deadline on heartbeat, retry or compaction. |
| New `electron/model-request-gate.ts` | Wrap the selected Pi request transport only if all request paths can be covered; reserve input/output allowance before dispatch and reconcile provider usage. |
| `electron/verification.ts` | Limit test duration by remaining run time as well as the existing test timeout; no fresh budget on retry. |
| `electron/main.ts`, `electron/executable.ts` | Give human-triggered packaging its own declared bounded operation; Stop still cancels it. Do not silently include human review time in an automatic generation timer. |
| `shared/types.ts`, `electron/storage.ts` | Add optional budget and usage summary, terminal reason, request count and unknown/estimated flags; emit through existing logs. |
| New `tests/run-budget.test.mjs`, existing `tests/pi-sdk.test.mjs`, `tests/agent-runner.test.mjs` | Fake-clock boundary tests and real-SDK request-count tests. |

## Proposed initial event limits

[A] These numbers are starting policy values for a small synthetic app, not measured optimums or authorized event spending. A human must select the final limits before use. The stop deadline should also respect any earlier gate in the main plan.

| Limit | Proposed value [R] | Meaning |
| --- | --- | --- |
| Concurrent generation | 1 | Simpler monitoring and no multiplied hidden allowance. |
| Entire automatic run | 20 minutes | Includes setup, inference, retries, guide writing, tests and at most one repair; excludes later human review. |
| Phase maxima | Intake 2, research 2, plan 3, build including guide 8, verify/repair shared 5 minutes | Each is also clamped to remaining whole-run time; unused time does not extend the hard deadline. |
| Idle limit | 90 seconds | Genuine model/tool activity resets idle only, not total time. |
| Inference attempts | 24 across the run | Charge transport attempts, including retry and compaction. A prompt count is not a substitute. |
| Total accounted input/output | 120,000 input and 24,000 output tokens | Include repeated context, cached input without double counting, reasoning/output where supplied and failed attempts with usage. |
| Per-request reservation | At most 16,000 input and 4,000 output tokens | Reject or shorten context before dispatch; ensure the provider cap is honored. Tune if a supported model needs different reasoning headroom. |
| Repair | 1 total | Shared across verifier-discovered defects and failed host acceptance. Missing-file recovery still consumes all other limits. |
| Test / packaging | Existing 120-second test maximum; up to 10 minutes for separately approved packaging | Tests also use remaining run time. Packaging is a distinct logged operation after review. |

[R] If the SDK cannot expose and gate every hidden request, do not claim the numeric request/token caps are enforced. Thursday's minimal implementation is a hard whole-run wall timer and measured counters labeled partial, with the operator's agreed provider limit where available. Make an enforced token ceiling should, not a fake must satisfied by `maxTurns`.

## Accounting and failure behavior

[R] Before dispatch, reserve a proven input bound and maximum possible output. Prefer the provider's compatible token counter or a conservatively established bound over guessed character ratios. Refuse dispatch when remaining allowance cannot cover the reservation. Reconcile once per completed request with actual usage; handle cached/reasoning fields without counting a nested total twice. The transport adapter and model-specific accounting require verification.

[R] A failed or canceled request with missing usage retains its full reservation and is marked unknown. Retry and automatic context compaction must pass through the same gate. Turn-start telemetry alone is insufficient because it can arrive after dispatch. If the required hook is absent in Pi 1.5.0, record that limitation and stop at the wall-clock/operator gate rather than monkey-patching undocumented internals under deadline pressure.

[R] Exhaustion revokes authority through note 03, saves partial evidence, blocks review/delivery and reports the exhausted dimension. A human may explicitly start a new run with revised limits; automatic retries never obtain a new budget. Preserve failures and prior usage so a fresh run is not mistaken for first-attempt success. Do not calculate a dollar estimate from another model's public price or event credit balance.

## Proof to require

[R] With a fake clock, cross the deadline during session creation, continuous streaming, a tool, guide recovery, verification and repair. Activity must not postpone the hard stop. Make the first phase consume most allowance and verify the next phase receives only the remainder. Verify canceled requests retain reservations, duplicate usage events charge once and a retry/compaction cannot bypass the gate.

[R] At the real-SDK fixture transport, count network attempts rather than prompts. Force 503 retries, context compaction and missing usage. Require zero further attempts after cap/revocation. Test concurrent start races and compare final usage ledger with observed requests. If that comparison fails, label token enforcement unverified and do not promote the claim.

## Risk and relationship to Dan's latest change

[R] Keep Dan's README step and its completion recovery inside the build budget. Preserve one repair; do not adopt the older build-pattern note's two-repair suggestion. Keep executable packaging's own timeout but report it separately from generation. All monitoring can use existing log and error fields; new charts or controls would belong to Dan and are cut here.

[A] Whole-run wall time and one-run guard are roughly 1 to 2 hours. Complete token interception/usage accounting is roughly 2 to 4 more hours if the pinned SDK exposes a supported seam, otherwise defer it. Token accounting does not guarantee the provider stops billing immediately on local cancellation.

## Sources

[E, final relay reconciliation] `631849f` later consolidated the frontend. A pinned diff shows no changes from `50fcaea` in `electron/`, `harness/`, `skills/`, `shared/` or the dependency lock, so this design's backend file map remains applicable. Use the retained unified desktop path in [[Research/Agentic/Run-Readiness-50fcaea]]; do not restore removed Studio/Workbench interfaces. All implementation remains deferred pending allocation.

- [E] Local source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe, `electron/agent-runner.ts`, `pi-backend.ts`, `codex-session.ts`, `verification.ts`, `executable.ts`, `shared/types.ts`.
- [E] [[Research/Plan/Plan]], [[Research/Build-Patterns/Test-and-Repair-Loops]].
- [R] [[Research/Agentic/03-Stop-and-Supervision]], [[Research/Agentic/07-Pi-Event-Key]].
