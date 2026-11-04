---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Ranked design-only improvements for protected acceptance, independent checking, shutdown, delivery and bounded event-key generation."
---

# Agent workflow designs for Thursday

## Bottom line

[R] Prioritize one independently accepted synthetic app and verifiable final delivery before expanding the factory. Keep Dan's five phases, README follow-up and executable packaging. [R] Must outcomes may be met by an explicitly recorded manual procedure for Thursday, but live generation requires proved access and shutdown controls. Cut a general sandbox/backend rewrite and frontend changes. [E] These are designs against `50fcaea`, not implemented fixes or passing runtime results.

[E, final directive read] Code seats are disabled. [[Ops/Directors/Directive-agentic]] selects manual final-copy acceptance and defers implementation of the acceptance store, checker, supervisor and snapshot systems. [R] The should rows below rank design value only; they are not current assignments. Read [[Research/Agentic/Run-Readiness-50fcaea]] for the immediate HOLD decision and one next gate. Pending-start and packaging Stop observations need Quality reproduction before any patch; queued source-export work belongs to development.

## Evidence and teammate alignment

[E, final relay and pinned diff] A later commit, `631849f`, consolidates the interface into the retained Home/Flow desktop app and browser preview. Studio/Workbench and their commands are removed. `git diff 50fcaea 631849f -- electron harness skills shared package-lock.json` is empty, so the seven backend designs remain applicable without a new general review. Use the retained desktop interface for any approved preparation; do not restore alternate renderers or assume saved alternate-profile data migrated. The latest gate reports 128 passed, zero failed at `631849f`, 14:42:27, still without live-provider or shutdown proof.

[E] Reviewed local Git object `50fcaea1e86028503ae66bd2f17287093ad30cbe` and its changes from `0f175a8`. The checkout's local `mvp` reference began at the older commit and advanced to `50fcaea` during review; all code claims use pinned object reads. The latest commit adds executable packaging/worker, delivery locking and interruption recovery, README follow-up and tests, and Workbench/frontend changes. No frontend implementation was opened for redesign or changed.

[E] The supplied Plan/Findings and older Test-Results apply to `0f175a8`. A newly arrived `reports/mvp-gate.md` reports 128 passed, zero failed at `50fcaea`, at 14:34:58. It supplies no command breakdown, desktop smoke, live-provider or shutdown result. This review did not rerun those tests. The relay files and directive were absent initially, arrived during review and were read before completion. Final reconciliation is recorded in [[Research/Agentic/Session-2026-11-04]].

## Ranked work before Thursday, November 5, 2:00 PM EST

[R] Must means required evidence or operating condition for the claim being made. Should means a bounded implementation improvement after one accepted app exists. Cut means no deadline allocation. Estimates in individual notes are assumptions for a contributor familiar with the code, include focused proof and exclude integration surprises; they are not staffing commitments or additive across shared modules.

| Order | Rank | Deliverable | Thursday acceptance and design |
| --- | --- | --- | --- |
| 1 | Must | Frozen acceptance contract outside agent authority | Human checks the partial ID 11 expected outcomes; builder cannot edit canonical cases or reports. Manual evaluator boundary is allowed and labeled. [[Research/Agentic/01-Protected-Acceptance]] |
| 2 | Must | Independent check of actual final app | Bad inline app rejected despite passing generated core tests; fresh edit, failure cases and save/reopen pass on final bytes. [[Research/Agentic/02-Independent-Checker]] |
| 3 | Must | Final-byte delivery record | Build stopped, final copy tested, manifest/digest and human approval recorded. Executable delivery requires extracted-package checks. [[Research/Agentic/04-Tested-Delivery]] |
| 4 | Must, conditional on a new build | Working Pi event-key route | Owner-driven real inference and harmless tool round trip through the selected Pi profile, followed separately by a bounded app run. [[Research/Agentic/07-Pi-Event-Key]] |
| 5 | Must, conditional on live generation | Proved tool authority and shutdown | Outside canaries denied, Stop prevents new work and ends owned activity; incomplete shutdown blocks restart and delivery. Use an already proved preparation environment if the product implementation is not ready. [[Research/Agentic/03-Stop-and-Supervision]], [[Research/Agentic/05-Phase-Tool-Policy]] |
| 6 | Must, conditional on live generation | One whole-run deadline and declared usage policy | One run, at most one repair, guide/retries share limits; usage/cost unknown stays explicit. [[Research/Agentic/06-Run-Budgets]] |
| 7 | Should, first small host patch | Pi preflight, whole-run timer and unified Stop | Small separately reviewed changes; Stop includes pending starts and Dan's package job. This patch alone does not prove process containment. Notes 03, 06, 07. |
| 8 | Should, highest evidence automation value | Snapshot-bound approval and both exports | Dialog/copy races cannot substitute untested bytes; retain new executable safeguards. Note 04. |
| 9 | Should | Host-owned acceptance gate and one browser driver | Fixed case IDs, independent oracle, mutation failure proof; manual evidence remains required until this passes. Notes 01, 02. |
| 10 | Should only if proved within a separate timebox | Restricted Pi worker, phase file tools and full token gate | Guide-only write policy; real SDK exposes no extra tool; all inference attempts accounted. Notes 03, 05, 06. |
| 11 | Cut | General shell sandbox, cross-platform descendant guarantee, new orchestration framework, more agents, automatic provider migration, catalog-wide acceptance | Too much integration and proof for this deadline. No current safety/acceptance claim depends on pretending these exist. |
| 12 | Cut | Frontend redesign, new dashboards, restoring alternate interfaces, signing/sync expansion | Preserve Dan's unified interface and ownership; consume existing IPC, logs and error/status fields. |

## Small implementation sequence for later authorization

[R] No build is authorized by this design task. If the team later selects implementation, coordinate one editor per shared host file and use this sequence:

1. Freeze the one task contract and choose the actual delivery format. Assign an independent evaluator role without inventing a named approver. This is required before generation or claiming acceptance.
2. If no new generation is needed, skip provider/worker work and spend time on independent final-copy checks and the delivery record. If a new run is needed, prove the existing preparation boundary and event-key preflight first; do not use the pitch as the experiment.
3. Timebox the small host improvements as separate patches: preflight, global deadline/one-run policy, unified cancellation. Stop or scope down if the live capability proof fails.
4. After the app works, choose snapshot enforcement before broad browser automation. Bind the same host gate to source export and executable download. Inspect Dan's current branch again before editing `main.ts`, `pi-backend.ts`, `storage.ts`, `phases.ts` or `fleet-delivery`.
5. Do not start the restricted worker/tool redesign alongside submission packaging unless an owner has a credible separate proof window. It is a coherent follow-on design, not a hidden requirement to finish all code before Thursday.

[R] This reconciles the earlier architecture's larger restricted-worker target with the plan's smaller manual acceptance default. It preserves the plan's one-repair limit rather than adopting an older build-pattern suggestion of two repairs. The hard artifact/evidence goals remain; their automatic enforcement can follow after the deadline.

## Trust and handoff model

```text
Human reviews task contract and execution limits
  -> bounded builder with phase-scoped tools
  -> revoke writer authority and confirm shutdown
  -> freeze candidate snapshot
  -> independent checker against fixed expectations
       failure -> one bounded repair -> new snapshot and recheck
       pass -> human review bound to acceptance and payload hashes
  -> locked source export OR trusted executable packaging
  -> final destination/archive identity check and delivery receipt
```

[R] The controller owns policy, epochs, budgets, reports, approval and delivery. The builder owns candidate edits only. The checker never grants operational authority. Prohibited actions include deployment, publication, operational-system writes, credential discovery and canonical-test changes. Existing logs carry current phase, deadline, denial, last action and stop result. Escalation blocks promotion for changed contract, tampering, missing checker, failed entitlement, budget exhaustion or incomplete shutdown. A person decides whether to revise scope or restart; no automatic authority expansion.

## What these designs do not establish

[E] No real event-key probe, full generated task, canary isolation/termination trial, current-commit test run, browser acceptance or executable cold start was performed. No code, frontend, dependencies, shared Sprint files or Team/Now was changed. No messages, commits or pushes were sent. [R] Do not turn these designs, existing fixture tests or a green development-test badge into a claim that the delivered app is accepted or operationally authorized.

## Sources

- [E] Local pinned source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe.
- [E] [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Test-Results]], [[Research/Architecture/Target-Architecture]], [[Research/Architecture/Optimizations]].
- [E] [[Research/Build-Patterns/Specs-and-Acceptance-Tests]], [[Research/Build-Patterns/Test-and-Repair-Loops]], [[Research/Build-Patterns/Isolated-Execution]].
- [E] [[Research/Agentic/Review-Log]], [[Research/Agentic/Session-2026-11-04]].
