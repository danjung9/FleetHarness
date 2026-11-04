---
type: memo
status: active
owner: mukul
updated: 2026-11-04
summary: "Finish reviewed work, remove duplicate queues and consolidate test evidence inside the sandbox."
---

# Engineering decisions

[E, snapshot-51] Code seats are enabled. [R] Remove stale dev-1 and builder assignments; retain overseer work and exact-commit review.

[E, feed/source inspection] Dev-2 and builder both changed electron/pi-backend.ts. Builder's registration check directly launches generated tests after verification, bypassing dev-3's sandbox. [R] Send that slice back. Serialize provenance integration, sandbox landing and one builder consolidation task with exclusive file ownership. Preserve test-change evidence and foreground guidance; neither proves general shutdown.

[E, reviewer] H1 regressions support the encoding fix, but d591223 needs corrected authorship. [R] Runner replaces the commit as Mukul and resubmits it; no duplicate implementation.

[E, automatic QA] Outside-sandbox tests pass 116 unit plus 51 harness cases; five smoke scripts fail at stale assumptions. [R] Dev-3 already owns those repairs. Require downstream behavior receipts, protect Dan's frontend and retain native-containment gaps.

[E, acceptance review] Both recorded candidates pass fresh offline import. Run1's clock failure is a brief/key mismatch; exhausted-state wording is contradictory. Run2 reached review but lacks independent acceptance. [R] Keep run1 primary and CLI backup; preserve raw failures and human scope decisions. No new build or hand-edited output.

[R] Keep 6 PM task, 7 PM evidence and Thursday noon freeze targets. Other seats finish current reviews, then idle. Details: [[Ops/Directors/Sprint/Engineering-Meeting-51]].
