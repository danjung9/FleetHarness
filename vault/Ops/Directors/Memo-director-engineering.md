---
type: memo
status: active
owner: mukul
updated: 2026-11-04
summary: "Finish shared pipeline integration and assign one bounded repair for a measured benchmark failure."
---

# Engineering decisions

## Bottom line

[P, Flow-Goals] Ten satisfactory catalog builds govern work. [E, Scoreboard read this meeting] Six finished, five automatic passes, zero satisfactory; ID 12 judged NOT. [R] Finish existing repairs before expanding scope.

[E, feed-77] Retry, telemetry and preflight work remains separated by repeated merge conflicts. [R] Main/runner retains serial integration. Return the extra unsandboxed registration execution; finish dev-3's verifier dependency first. Preserve retry checkpoints, bounded repairs, usage unknowns and preflight cancellation. Freeze competing edits to shared pipeline files until one writer receives them.

[R] Replace the unstarted native-select recommendation for builder with one dev-5 task: repair guidance plus a real-browser regression pair. ID 36's malformed option survived label-only repair. Architect retains already routed primary-requirement and false-oracle diagnoses; no duplicate assignment or generated-app hand edit.

[E, Auto/1d9eeee] 125 unit and 51 harness tests pass; Electron and Norfolk smokes fail. [R] Finish dev-3's reviewed smoke changes, then resolve Norfolk through its existing queue if unassigned. Preserve Dan's frontend.

[R] Reconcile Windows e68e90e/4c49e85 test changes under one writer. New hosted relay 89874ce has no reported overlap; main owns obtaining exact integrated receipts through Quality. Neither establishes release readiness.

[R] Keep detached Stop, benchmark cancellation and final-manifest defects open with main. Preserve Thursday noon freeze, independent judgments and human artifact/submission approval. No new deployment, connector or broad research work.
