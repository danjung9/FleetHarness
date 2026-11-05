---
type: memo
status: active
owner: mukul
updated: 2026-11-05
summary: "Keep existing owners, adapt QA to landed restoration and request current evidence."
---

# Engineering decisions

[E, feed/snapshot-189 and current queue] Code seats remain disabled. Dev-1/3 have gate returns; builder already has the planning-consistency assignment. Dev-2 retains smoke-file claims without a queued task or pending review. [R] Add no duplicate assignments. Main reconciles dev-2's completed return before another seat receives those files.

[E, Scoreboard] R5 finished four failed builds, zero automatic passes and zero satisfactory results on f2e5422 plus scratch changes. [R] Preserve those failures and the canonical training NOT verdict. Builder keeps the single pre-freeze consistency audit; architect's other proposals stay deferred.

[E, QA runner triage] IDs 12/36 show plan rejection followed by shutdown uncertainty. Native cause remains unproved. [E, relay patch] 5f4eb39 now restores frozen planning notes and uses process evidence for failed-stage shutdown. [R] Main verifies these landed paths. Adapt the proposed regression: valid restoration may proceed; unavailable or corrupt restoration plus unconfirmed shutdown must retain both failures and block progress. Do not restore obsolete rejection behavior.

[R] Dev-1 preserves the new delivery callback; dev-2 preserves new smoke assertions. Dev-3 retains only its necessary wording exceptions. Require baseline comparisons for gate failures, not blanket environmental exemptions.

[R] Main owns native execution, integration and real reruns. Keep Dan's frontend, current full access, noon freeze and human acceptance. Missing sealed evaluator identity, exact R5 execution bytes and new-target runtime evidence remain explicit gaps.
