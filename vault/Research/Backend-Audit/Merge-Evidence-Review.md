---
type: review
status: changes-requested
owner: mukul
updated: 2026-11-05
summary: "The committed integration can refresh passing evidence to include a late source mutation before helper cleanup."
---

# Evidence binding at 8053707

[E, pinned source] Reviewed commit 80537076a7443480acfcc5b9745ca245ccd8c61d through Git objects. The concurrently edited worktree is outside this finding's pin. The intentional full-access execution choice is not the issue.

## P1: final hash refresh can include untested source

[E] The committed source has this sequence:

1. Detached helpers may survive a completed tool call until run cleanup: electron/helper-execution.ts:102-114 and tests/helper-process-cleanup.test.mjs:99-109.
2. The judge checks unchanged source at electron/independent-judge.ts:252, then writes judge evidence and computes a fresh source hash at lines 266-278.
3. The backend restores the evaluation plan and unconditionally recomputes report.sourceHash at electron/pi-backend.ts:774-775.
4. Only afterward does finalization stop run processes: pi-backend.ts:785 calls finish, whose line 112 awaits the sweep. On confirmed cleanup, lines 128-132 publish authoritative report evidence.
5. Approval checks the current manifest against that report and records its hash: electron/review.ts:18-32 and 43.

[E/A] The ordering is directly established by source. A background writer changing an application file after the final judge comparison but before either hash refresh can be incorporated into the passing report without reverification. Later approval checks would compare against the refreshed hash. The actual late-writer interleaving has not been executed; this is a source-level finding, not a native reproduction or proof of a delivered bad artifact.

## Deterministic regression for the implementation owner

[R] Use existing synthetic passing verification and judge fixtures. Wrap restoreEvaluationPlan with an injected barrier: delegate its real restore, release a deferred synthetic writer that changes core.cjs, and await its acknowledgement before returning. Inject an empty process registry so no native child or scanner is required. Assert that finalization rejects the changed application, leaves authoritative verification unset and refuses approval. This requires no browser, network or live inference.

[R] Preserve the verified application manifest through host evidence writes and final cleanup. Treat only explicitly enumerated host-owned evidence changes as expected. After writers settle, reject or reverify any application difference instead of replacing the verified identity with whatever bytes now exist. A final equality check against a newly recomputed baseline does not close the gap.

[E] No product edit, model run, native test or raw-receipt modification was performed. The current merge owner must carry the fix and regression into the final integration pin.

## Executed injected probe

[E, 01:25 Nov 5] Ran Fleethacker-Work/coordination-fixes/check-judge-evidence-binding.mjs. It extracts the actual runIndependentJudge function from pinned 8053707, supplies a synthetic passing precondition and judge result, and injects an in-memory application change when judge evidence is written. The function returns SATISFACTORY and requirementsMet:true, with its reported source hash matching the changed application and zero reverifications. Source digest is 91c080bf2065cd8ae2d5839812023567cff86d42d917c2e6889d3628c5bddf99. No application, native child, browser or model ran; final approval was not executed. This reproduces the persistence gap with a controlled interleaving and does not claim a native late-writer observation.
