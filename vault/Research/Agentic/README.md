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

[E, prior pinned diff and November 4 QA receipts] `631849f` retains Home/Flow and removes Studio/Workbench; backend/harness/skills/shared/dependency-lock contents are unchanged from `50fcaea`. The 14:42:27 gate reports 128 passes, zero failures. [Results-631849f-GUI](../QA/Results-631849f-GUI.md) adds six successful smoke scripts, consent on one Pi fixture path, reproduced U1/U2/U3 and one Stop observation: stopped at the first query 3 ms after click completion, with no later request over eight seconds. [Receipt-Review](../QA/GUI-631849f/Receipt-Review.md) limits this to observed plumbing, not child termination or live generation. [E, relay] `main` at `d322b39` adds hosted-preview deployment configuration; deployment success remains NOT VERIFIED and is separate from Electron and delivered ID 11 acceptance.

[E, new receipt completed November 4 at 15:12:06 EST] [STOP-CHILD-01](../QA/GUI-631849f/stop-child-16bd720f-1ef9-408f-aac2-df194cc67e21/result.json) separately reports PASS at `631849f` for one ordinary Pi shell parent and non-detached child: both PIDs absent, stable heartbeats and no further requests over eight seconds after settling, before cleanup. This supersedes missing evidence for that case only. It does not clear pending-start, packaging, quit, detached/resistant descendants, containment or the environment shutdown fallback.

[R] Live readiness remains HOLD for missing actual provider, containment, complete shutdown and authority evidence. [E, current directive] The 3 PM gate passed without supplied clearance. [R] Recommend the disclosed checker scope; the overseer must still identify its permitted workspace, implementation owner and execution/budget authority. Preserve the 4 PM useful-candidate cutoff and 6 PM accepted app/checker or eligible technical-finding gate. [E] Acceptance-11 application outcomes remain NOT RUN; the seven verification/export failures remain open. See [[Research/Agentic/Run-Readiness-50fcaea]] for exact receipts and the next decision.

[E] Reviewed local Git object `50fcaea1e86028503ae66bd2f17287093ad30cbe` and its changes from `0f175a8`. The checkout's local `mvp` reference began at the older commit and advanced to `50fcaea` during review; all code claims use pinned object reads. The latest commit adds executable packaging/worker, delivery locking and interruption recovery, README follow-up and tests, and Workbench/frontend changes. No frontend implementation was opened for redesign or changed.

[E, historical review] Plan/Findings and older Test-Results apply to `0f175a8`. The earlier gate reported 128 passes at `50fcaea`, 14:34:58; the current gate and subsequent GUI evidence are identified above. No tests were rerun for this document update. The initial design review is recorded in [[Research/Agentic/Session-2026-11-04]]; the current evidence correction and shared-log handoff are in [[Research/Agentic/Run-Readiness-50fcaea]].

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

[E] This document review performed no runtime checks. It credits QA's `631849f` fixtures and narrow Stop observation above; real event-key inference through this app, containment, complete shutdown, live-generated task, delivered ID 11 acceptance/recovery and candidate executable cold start remain NOT VERIFIED or NOT RUN. Only local research documents changed. [R] Designs, fixture passes and a green development-test badge do not establish accepted delivered behavior or operational authority.

## Sources

- [E] Local pinned source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe.
- [E] [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Test-Results]], [[Research/Architecture/Target-Architecture]], [[Research/Architecture/Optimizations]].
- [E] [[Research/Build-Patterns/Specs-and-Acceptance-Tests]], [[Research/Build-Patterns/Test-and-Repair-Loops]], [[Research/Build-Patterns/Isolated-Execution]].
- [E] [[Research/Agentic/Review-Log]], [[Research/Agentic/Session-2026-11-04]].
