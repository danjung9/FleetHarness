---
type: review
status: complete
owner: mukul
updated: 2026-11-04
summary: "Independent source review of three queued commits, with one inherited blocker and required integration checks."
---

# Queued factory changes

[E, pinned Git objects, 2026-11-04 about 16:27 EST] Reviewed b8cb505 in dev-1, 1cd427d in dev-2 and 4af1bd9 in agentic-builder. Inspected implementation, regression tests, ancestry and retained receipts without executing product code or changing any clone. This supplements the assigned reviewer; it is not a landing approval or fresh runtime receipt.

## Blocking finding

**[E, P1] Do not land 4af1bd9 with its current e612ce0 parent unchanged.** The inherited electron/pi-backend.ts:298 directly spawns generated tests in registeredTestError. verify invokes it at :333 after verifyApplication. The new metrics commit retains this second execution outside the proposed mandatory verifier sandbox. Restricting the first verifier does not restrict this second process. This confirms the existing review finding rather than introducing a duplicate defect. Route registered-case collection through the same mandatory executor before landing the branch, preserve failure/Stop/output limits, and review the resulting exact commit.

## Commit assessments

| Commit | Assessment | Evidence and limit |
| --- | --- | --- |
| b8cb505 | [E] No additional blocking source defect found in the retry/resume delta. | Checkpoints bind the brief, requirements, packet, acceptance/UX plans and planning notes. Resume clears delivery approval and reruns host verification. Transport retries are bounded to one per stage; permanent authentication errors reject. The two-repair budget persists across Resume. Source tests cover changed inputs, stalled attempts, stale events, review-boundary Stop and real Node failures. Retained resume-green.log records 34 passes, zero failures/skips; this audit did not rerun it. |
| 1cd427d | [E] No additional blocking source defect found in the allocated helper delta. Product integration is incomplete. | One 1,500 ms budget covers checks, defaults use advertised configured models, missing containment rejects, unknown errors receive a plain instruction, and cancellation aborts probes. Retained preflight-errors-green.log records 25 passes, zero failures/skips. git grep finds no production caller for runPreflight or recordProjectError. The developer explicitly provides a separate unapplied integration patch and does not claim shipped behavior. |
| 4af1bd9 | [E] Metrics/note-budget delta has meaningful coverage, but its current branch remains blocked above. | Pi message/compaction usage is summed; Codex cumulative usage replaces previous totals; missing receipts stay unknown. Notes are bounded by UTF-8 bytes without truncating contracts. Retained flow-final.tap records 25 passes, zero failures/skips. No real speed or token improvement is established. |

## Required integration checks

1. [E/R] Preserve the API-key route from d402b67 when merging b8cb505 and 4af1bd9. The pinned metrics branch still has the old ChatGPT-only check and legacy sandbox fields; the pinned resume branch records provider/model directly in both fresh and resumed paths. The final merged source must retain restrictive profile selection and actual account provenance in both paths. These are sibling-branch integration requirements, not newly introduced regressions in the isolated deltas.
2. [E/R] Wire preflight, plain errors and defaults into both Start and Resume under dev-2's assigned serial integration. Test refusal before inference and Stop while readiness is pending. The proposed patch targets the older backend and cannot simply replace dev-1's begin/restore logic. The latest frontend still requires an exact saved model and may hide errors before a phase becomes active, as documented in dev-2's PREFLIGHT-REPORT.md.
3. [E/R] Reconcile metrics with Resume explicitly. stage(..., active) in 4af1bd9 replaces existing stage.metrics. A direct merge would erase the failed attempt's timing/token observations when b8cb505 resumes that stage. Preserve an attempt history or cumulative totals and test failed attempt plus resumed attempt, including exhausted repair budgets. This would block claiming complete per-run efficiency evidence from that merged implementation.
4. [E/R] b8cb505 exposes resumeRun through IPC/preload but has no renderer caller. The small Resume control still belongs to the frontend owner. Do not call user-facing recovery delivered before that control and an actual UI check exist.
5. [E/R] Preserve all existing regression assertions in the combined gate. b8cb505 includes the sixth tests/pi-sdk.test.mjs change that deliberately expects two requests for its bounded timeout retry. 4af1bd9 changes three wiring files beyond its original seven-file metadata. Update ownership/review scope to the actual diff, not only the stale task file list.

[E] Existing full-suite receipts retain environment-limited failures. Focused fixture passes above do not prove native sandbox containment, browser acceptance, packaging or ten satisfactory real builds. The runtime owner confirmed that dev-3 submits its verifier through review and dev-2 owns preflight integration after dev-1 lands.
