---
type: directive
status: active
owner: mukul
updated: 2026-11-05
summary: "Finish existing returns and verify landed restoration and shutdown before expanding work."
---

# Development directive

## Current priorities

[P] Ten satisfactory catalog builds in [[Research/Agentic/Flow-Goals]] remain the measure. [E, feed/snapshot-189, queue and relay] Current mvp is 5f4eb390d0bddd36dcaeef1945feb0abb65aed6f. Code seats are disabled. Dev-1 and dev-3 have gate returns; agentic-builder has the sole planning-consistency assignment. [R] This meeting adds no tasks. Existing owners resume only after overseer enablement and exclusive file release.

[E, [[Research/QA/Ten/Scoreboard]]] R5 ended with four failures, zero automatic passes and zero satisfactory results on f2e5422 plus scratch changes. [R] Main owns real builds, integration, native execution and shutdown recovery. Keep failures immutable. Packaging, containers, post-delivery changes and shutdown/restoration are landed work to verify, not replacement implementations.

## Existing file ownership and completion

| Owner | Files reserved to that owner | Current instruction and proof |
| --- | --- | --- |
| dev-1 | src/App.tsx; tests/artifact-read-recovery.test.mjs | Finish the existing Files error/retry return. Preserve stale-read protection, empty-file handling and the landed DeliveryWorkspace onChangesRequested callback. Retain failing-first evidence and prove visible error, successful Retry and correct content after switching files. |
| dev-2 | scripts/smoke-home.mjs; scripts/smoke-quality.mjs | Preserve the completed summary-label correction. Reopening a project is not Resume execution; invoking export is not launching a package. Keep all actions/assertions, including new post-delivery change checks. Prove a labels-only delta against the integrated base and syntax-check both scripts. |
| dev-3 | electron/connectors/index.ts; electron/connectors/oauth.ts; electron/connectors/custom-api.ts; tests/connector-failure-wording.test.mjs | Finish the existing wording/gate return. Keep the nine required failure cases, bounded retry and synthetic-secret redaction. Preserve the reported 57 focused and 188 connector passes as local receipts, not native or integration acceptance. |
| agentic-builder | electron/independent-judge.ts; electron/pi-backend.ts; skills/fleet-judge/SKILL.md; tests/independent-judge.test.mjs; tests/pi-backend.test.mjs | Continue only the already queued task in [[Ops/Directors/Directive-agentic]]. Main serializes any integration changes in these files before release. |

[E, feed-189 and state] Dev-2 reported its completed correction, but its later turn exited without a report; it has active file claims, no queued task and no pending review. [R] Main reconciles that existing result once: retain the patch, run exact-delta review/gate, or explicitly release an already integrated claim. Do not invent a successful landing or start another implementation.

[E, dev-3 report] Its necessary text corrections also touch electron/connectors/google.ts and src/Connectors.tsx. [R] Add these to the existing task's exclusive claims before dispatch. Accept the two text-only scope exceptions for review; require exact changed lines and FRONTEND reasoning. No layout, controls or additional connector work.

## Gate returns

[E, current queue] Dev-1 and dev-3 each have 123 failed gate tests, with different pass totals. The reports name runtime, packaging, persistence and evaluation cases. Their scoped receipts do not classify all failures.

[R] Main/runner compares unmodified base and proposed delta with the same dependencies and host. Fix regressions caused by the delta; return exact failing tests and causes. Run process/browser/native-dependent checks on the capable host. Neither matching failure names nor the old twenty-failure baseline excuses every current failure. Preserve assertions and failure receipts. Do not chase restricted-host failures by changing product access or weakening tests.

## QA return adapted to 5f4eb39

[E] The completed [R5 runner triage](~/Documents/CDAO/fh-org/qa/qa-results/Research/QA/Runner/R5-Failure-Triage.md) is present in the QA checkout; its named central copy was absent when checked. IDs 12/36 retain plan mismatch followed by unconfirmed writer shutdown. Exact scratch/compiled identity, original changed bytes and native cause remain missing. The report does not prove a process survived.

[E, relay patch] The new backend stores planBodies, restores plan.md/test-matrix.md after live edits, and uses process quiescence after failed Codex stages. [R] Preserve these semantics. Adapt QA's proposed regression through main's existing integration ownership:

1. Retain exact restoration of a changed planning note and the unchanged-plan control with confirmed shutdown.
2. For the two-error case, make restoration unavailable, invalid or fail, then induce unconfirmed disposal/quiescence. Persist the initiating failure and separate shutdown outcome; keep failed status, absent passing report and blocked retry/Resume/review/delivery.
3. Require process evidence before failed-stage recovery. Abort acknowledgement alone cannot establish shutdown. Retain separate native closure evidence for owned service/browser work.
4. Supply existing passing regression receipts first. Allocate a further fix only after a current-target failure, with serial transfer of shared backend/tests. No new dev-4 or dev-5 task.

[R] Main supplies preserved R5 source/patch/compiled identity, planning-time and rejection-time originals, saved plan hash, categorized disposal/sweep outcomes and cleanup evidence, or marks unavailable items. Include ID 20 in the same evidence handoff if retained records permit it. Do not repeat the completed IDs 12/36 audit. Verify cleanup before reusing affected workspaces.

## Answers and limits

[R] Dev-3: use one plain explanation followed by one next action. Architect: only the queued consistency audit proceeds; fresh-input breadth and receiver/export verification stay deferred. Feed-189 has no literal QUESTIONS line. Historical containment and author-metadata returns do not reopen settled decisions.

[P] Dan owns src/, studio/, index.html and CSS. [R] Preserve his sign-in, input, visual-review, Resume and delivery changes. Existing minimal dev-1 and dev-3 exceptions remain bounded. [[Research/RandE/UX/Merged-Walkthrough]] sends lost drafts, account-switch clarity and reachable Stop to Dan through the existing handoff; those findings remain source/screenshot evidence.

[R] Current LATEST.md reports two overlaps; the older analysis's no-overlap claim is stale. Keep budget, Windows and hosted branches separate. Main/Quality reconcile the 15 screen rows in [[Research/QA/Auto/f2e5422]] against the charter's 16 and obtain current-target delivery/baseline receipts. Older fixture passes do not certify this revision.

[P] Full-access builds remain settled; GenAI.mil remains framework only. [R] Use synthetic/public data, retain human approval, monitoring, escalation and verified shutdown. No credentials in evidence, external messages, pushes or publication. Noon code freeze and final human artifact/submission approval remain.
