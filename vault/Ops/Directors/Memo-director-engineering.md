---
type: memo
status: active
owner: mukul
updated: 2026-11-04
summary: "Target ten satisfactory builds and consolidate test evidence inside the sandbox before benchmarking."
---

# Engineering decisions

[P, overseer's new order and Flow-Goals] Target ten satisfactory end-to-end catalog builds. [E] The named scoreboard is absent. [R] Do not invent benchmark failures or speed gains; finish the execution-boundary prerequisite.

[E, feed/source inspection] Dev-2 and builder both changed electron/pi-backend.ts. Builder's registration check directly launches generated tests after verification, bypassing dev-3's sandbox. [R] Send that slice back. Serialize provenance integration, sandbox landing and one builder consolidation task with exclusive file ownership. Preserve test-change evidence and foreground guidance; neither proves general shutdown.

[E, reviewer] H1 needs corrected commit authorship. [R] Runner resubmits as Mukul; remove duplicate dev-1 work.

[E, automatic QA] Outside-sandbox tests pass 116 unit plus 51 harness cases; five smoke scripts fail at stale assumptions. [R] Dev-3 already owns those repairs. Require downstream behavior receipts, protect Dan's frontend and retain native-containment gaps.

[E, acceptance review] Both recorded candidates pass fresh offline import. Run1's clock failure is a brief/key mismatch; exhausted-state wording is contradictory. Run2 lacks independent acceptance. [R] Preserve evidence and human scope decisions. Benchmark failures drive factory repairs; never hand-edit output.

[R] Code seats are enabled; replace stale builder work with one gated task. The benchmark owns live runs. Keep Thursday noon freeze. Details: [[Ops/Directors/Sprint/Engineering-Meeting-51]].
