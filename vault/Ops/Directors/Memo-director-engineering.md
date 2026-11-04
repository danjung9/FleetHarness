---
type: memo
status: active
owner: mukul
updated: 2026-11-04
summary: "Keep one training draft and require current evidence before coding."
---

# Engineering decisions

[R] Keep the plan's four-request partial ID 11 training draft. Preserve the 3 PM access, 4 PM real-build and 6 PM useful-artifact gates. No second pilot, connector, framework replacement or general worker rewrite.

[E, feed-7 and snapshot-7] Code seats are disabled; no development reports or team QUESTIONS were supplied. [R] Queue export work for dev-1 after enablement. Keep dev-2, dev-3 and agentic-builder unassigned. Agentic-architect should close the review with the missing run-readiness decision.

[E, mvp-gate.md and referenced log] At 50fcaea the runner reports 89 main plus 39 harness tests passing. This is not a live-build or delivered-app result. [R] Return older QA findings for current-revision confirmation. Use the plan's four-request fixture; the older QA plan's two-request example is supplementary.

[E, pinned main.ts and executable.ts] Source export still checks before the folder dialog and copies live files. Executable delivery has separate staging and hash checks. [R] Do not rewrite Dan's delivery system. Fix source export only within a small reviewed change; otherwise independently accept and hash the final copied artifact after generation stops.

[R] Preserve Workbench and the build-then-README sequence. Quality should establish consent, Stop, review invalidation and delivered-byte behavior. Product should retain partial-scope and missing-sync disclosures. The overseer owns code enablement and live-run approval. Shared logs/status and the blocked content guard need the authorized handoff in [[Ops/Directors/Sprint/Engineering-Meeting-7]].
