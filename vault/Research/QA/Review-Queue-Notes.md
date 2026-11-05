---
type: review
status: complete
owner: mukul
updated: 2026-11-04
summary: "Three queued commits reviewed; assigned review adds reproduced recovery blockers alongside inherited containment and integration gaps."
---

# Queued factory changes

[E, pinned Git objects, 2026-11-04 about 16:27 EST] Reviewed b8cb505 in dev-1, 1cd427d in dev-2 and 4af1bd9 in agentic-builder. Inspected implementation, regression tests, ancestry and retained receipts without executing product code or changing any clone. This supplements the assigned reviewer; it is not a landing approval or fresh runtime receipt.

## Blocking finding

[E, assigned reviewer report arrived after the initial source pass] dev-1-b8cb505-review.md adds two meaningful failing regressions: a timed-out session can write after the replacement attempt reaches review, and explicit Resume can launch another write-capable verification agent after the two-repair budget is exhausted. The first submitted late-event test covered callbacks, not pending file writes. The second counted only specially labeled repair prompts. These findings supersede any impression that the passing focused suite closes recovery. The coordinator has returned b8cb505 to dev-1. This audit read the report and regression evidence; the assigned reviewer ran them.

[E, subsequent assigned metrics review] agentic-builder-4af1bd9-review.md adds two reproduced blockers: a delayed receipt from an earlier turn can make a receiptless later turn retain a known token total (15 instead of unknown), and failure to write test-report.json skips saving the terminal project state, leaving persisted status running after the active run is removed. Match usage by turn ID and persist final state independently of report-file success. These are additional to the inherited containment blocker and the combined Resume accounting risk below.

**[E, P1] Do not land 4af1bd9 with its current e612ce0 parent unchanged.** The inherited electron/pi-backend.ts:298 directly spawns generated tests in registeredTestError. verify invokes it at :333 after verifyApplication. The new metrics commit retains this second execution outside the proposed mandatory verifier sandbox. Restricting the first verifier does not restrict this second process. This confirms the existing review finding rather than introducing a duplicate defect. Route registered-case collection through the same mandatory executor before landing the branch, preserve failure/Stop/output limits, and review the resulting exact commit.

## Commit assessments

| Commit | Assessment | Evidence and limit |
| --- | --- | --- |
| b8cb505 | [E] CHANGES required by the assigned review: confirm old writer shutdown and close unbudgeted verification on Resume. | Checkpoints and bounded explicit loops have meaningful tests, and retained resume-green.log records 34 passes with no failures/skips. Independent added regressions expose two uncovered paths despite those passes. The numeric counter persists, but it does not count the verification agent rerun. No new runtime execution by this audit. |
| 1cd427d | [E] No additional blocking source defect found in the allocated helper delta. Product integration is incomplete. | One 1,500 ms budget covers checks, defaults use advertised configured models, missing containment rejects, unknown errors receive a plain instruction, and cancellation aborts probes. Retained preflight-errors-green.log records 25 passes, zero failures/skips. git grep finds no production caller for runPreflight or recordProjectError. The developer explicitly provides a separate unapplied integration patch and does not claim shipped behavior. |
| 4af1bd9 | [E] CHANGES required: correlate usage by turn, persist terminal state despite report-write failure, and fix inherited containment. | Retained flow-final.tap records 25 passes with no failures/skips, but added independent regressions expose stale usage and unsaved final state. Note limits preserve structured contracts. No real speed or token improvement is established. |

## Required integration checks

1. [E/R] Preserve the API-key route from d402b67 when merging b8cb505 and 4af1bd9. The pinned metrics branch still has the old ChatGPT-only check and legacy sandbox fields; the pinned resume branch records provider/model directly in both fresh and resumed paths. The final merged source must retain restrictive profile selection and actual account provenance in both paths. These are sibling-branch integration requirements, not newly introduced regressions in the isolated deltas.
2. [E/R] Wire preflight, plain errors and defaults into both Start and Resume under dev-2's assigned serial integration. Test refusal before inference and Stop while readiness is pending. The proposed patch targets the older backend and cannot simply replace dev-1's begin/restore logic. The latest frontend still requires an exact saved model and may hide errors before a phase becomes active, as documented in dev-2's PREFLIGHT-REPORT.md.
3. [E/R] Reconcile metrics with Resume explicitly. stage(..., active) in 4af1bd9 replaces existing stage.metrics. A direct merge would erase the failed attempt's timing/token observations when b8cb505 resumes that stage. Preserve an attempt history or cumulative totals and test failed attempt plus resumed attempt, including exhausted repair budgets. This would block claiming complete per-run efficiency evidence from that merged implementation.
4. [E/R] b8cb505 exposes resumeRun through IPC/preload but has no renderer caller. The small Resume control still belongs to the frontend owner. Do not call user-facing recovery delivered before that control and an actual UI check exist.
5. [E/R] Preserve all existing regression assertions in the combined gate. b8cb505 includes the sixth tests/pi-sdk.test.mjs change that deliberately expects two requests for its bounded timeout retry. 4af1bd9 changes three wiring files beyond its original seven-file metadata. Update ownership/review scope to the actual diff, not only the stale task file list.

[E] Existing full-suite receipts retain environment-limited failures. Focused fixture passes above do not prove native sandbox containment, browser acceptance, packaging or ten satisfactory real builds. The runtime owner confirmed that dev-3 submits its verifier through review and dev-2 owns preflight integration after dev-1 lands.

## Replacement checkpoint at 16:53 EST

[E, assigned reviewer report] e93a877 replaces the recovery defects in b8cb505. All 49 independent focused checks pass; seven added regressions fail against the parent and pass against the replacement. The remaining review hold is integration with the corrected mandatory verifier and registered-test evidence. Treat this as a dependency, not a fresh recovery implementation defect. Native and combined behavior still require validation.

[E, source and staging inspection] The coordinator separated the verifier from bundled smoke work onto the 1d9eeee base. c3057e9 is the replacement under review. Earlier eadfea1 review had 28 passing independent verifier tests and no additional blocking defect in the three verifier files; its exact bundled commit was rejected for scope. Native containment remains distinct from those unit results.

[E, exact diff] Stop replacement 44faa80 fixes a test whose failing assertion was thrown inside a callback where production cleanup catches exceptions. It now records signal attempts and asserts afterward for both PID reuse and lost ownership. No new native Stop success is inferred from the corrected test.

[E, assigned review] 1cd427d still requires production wiring, broader local error-producer coverage and a Stop regression synchronized on actual readiness entry. Its existing helper checks alone do not establish the intended Start/Resume behavior.

## Integration follow-up at 17:15 EST

[E, working judge and telemetry sources] The new internal judge uses host-owned immutable reads, a fresh read-only Codex thread and a two-repair limit. No runtime approval is inferred. Its usage is stored separately under independentJudge.attempts; the stage metrics hook is not called by this path. The benchmark currently totals persisted Codex token_count session logs, while the new judge requests ephemeral threads. [R] Bind complete judge and repair cost into one cumulative receipt, including cache accounting or explicit unknown, before claiming an efficiency gain. Sent this integration risk to main; no new run has demonstrated an undercount yet.

[E, pure adapter probe at 17:22 EST] Current codexJudge concatenates all agentMessage deltas across item IDs. Invoked that actual function after type stripping with an injected fake RPC: a commentary item followed by a valid final SATISFACTORY JSON produces invalid concatenated JSON. The existing parser therefore returns NOT and can spend both repair loops on a transport-format error. No model, application or external call occurred; no source file changed. [R] Use the completed final assistant message and add a commentary-plus-valid-final regression while preserving strict JSON validation. Sent to main for the existing judge owner.

## Scheduler patch prepared at 17:35 EST

[E] A pure extraction of the actual org.py functions reproduces overlap: reapply_after_conflict queues no files metadata, and next_tasks starts that retry even while another seat claims its verification file. Prepared Fleethacker-Work/coordination-fixes/reapply-file-claims.patch. The regression now holds that overlapping retry and admits it only after the prior claim clears; a failed Git inventory retains the clone and queues nothing. Probe uses synthetic state and injected Git, invokes no workers, and records the source digest. Main received the patch for runtime application. Existing queue entries and stale ownership transfers still need reconciliation; the running coordinator was not modified.
