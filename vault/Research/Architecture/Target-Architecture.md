---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A bounded extension of the existing Electron and Pi design for Thursday, with separate incremental steps for later fielding."
---

# Target architecture

## Bottom line

[R] Keep the current application and make one browser recipe trustworthy end to end. [R] The Thursday target adds a team-owned acceptance contract, a restricted supervised Pi worker, trusted browser checks and an immutable approved delivery snapshot. [R] Keep the current three-role sequence and one repair while those boundaries are established. [A] Live generation is conditional on proving the worker and browser tooling in time; the fallback is a clearly labeled previously generated, independently checked offline app.

## What stays and why

[E] The baseline has reusable seams: named preload IPC, PiBackend orchestration, runAgentStage lifecycle handling, Store persistence, a verification module, recipe preparation and a separate-origin preview. These are in `electron/preload.cts`, `pi-backend.ts`, `agent-runner.ts`, `storage.ts`, `verification.ts`, `preview.ts` and `harness/integration.ts`. [R] Extend these seams rather than replace the renderer, model SDK, catalog or state format wholesale. None of the observed defects requires importing a new orchestration platform.

[E] Late update: the clone advanced to `0f175a8` during this review, adding a FleetBackend adapter seam, five separate agent phases, `harness/phases.ts`, `src/PhaseDetails.tsx` and shared `src/ModelSettings.tsx`. [R] On that newer base, keep its five-phase event contract until a comparison justifies combining conversations; the three-role diagram below describes the smaller requested baseline, not a mandate to revert the teammate's new work. Reuse the new settings component and phase filtering rather than create competing implementations. This event profile continues to use the event-key Pi route; no personal sign-in is proposed or performed.

## Smallest Thursday target

[R] Proposed design, not implemented by this review:

```text
Technical owner: configures the authorized event provider once
                          |
Officer: task -> synthetic examples -> approve behavior contract
                          |
                          v
Existing Electron main controller
  owns state, contract, policy, evidence, approval, export lock
                          |
           start bounded stage / stop and await exit
                          v
Supervised Pi child: plan -> build -> verify -> [one repair]
  approved model access + scoped file tools + selected pure tools
  no arbitrary shell or candidate Node execution in browser mode
                          |
                    candidate workspace
                          |
                revoke writes; freeze snapshot
                          v
Trusted browser acceptance driver + separate browser context
  external expected results; exact frozen app; no model access
                          |
           failing evidence -> bounded repair of candidate
           passing evidence -> officer tries exact snapshot
                          |
                 approval bound to hashes
                          v
Verified snapshot -> staged export -> digest check -> delivery
                          |
                 cold-start offline app proof
```

[R] The worker remains Pi with the same stage prompts, artifacts and activity event shapes. Its controller-facing messages are typed requests and progress proposals. Main validates those proposals, owns terminal state and verifies files before accepting a generated-component status. A worker cannot send an approval/export command. The controller retains original requirements and canonical acceptance expectations outside the worker's exposed paths.

[R] In the narrow browser mode, the worker receives only reviewed file tools rooted in its candidate workspace plus selected deterministic Fleet tools. File operations reject path escape, symlinks and reserved controller-written inputs. Model access uses explicit event configuration; a runtime credential may be provided through a private parent-child channel, never through prompts, command-line arguments or workspace files. This is capability restriction with a killable process, not a full hostile-code OS sandbox. General shell execution remains unavailable until a later sandbox adapter is proven.

[R] Generated HTML runs only in the isolated preview/browser context. Canonical acceptance code stays in the trusted driver, which evaluates visible behavior and exported records across the browser boundary. It does not import generated modules into its own Node process. Agent-written Node tests remain useful artifacts, but execute only in a separately proven sandbox. Do not continue ordinary host execution of arbitrary generated tests under an independence label.

[R] After each passing acceptance run, retain an immutable snapshot identity. Approval references the same contract and snapshot. Export copies that snapshot, verifies the staged bytes and includes controller-generated metadata. Editing requirements invalidates contract approval; editing candidate source requires a new snapshot and acceptance result. A person can reject or request a change; the old accepted package stays available.

## Human controls and failure states

| Control | Thursday behavior [R] |
| --- | --- |
| Approval | Officer confirms examples and exclusions before Start, then approves the exact tested prototype. Technical setup and any broader access are separate decisions. |
| Prohibited actions | No real operational-system writes, deployment, publication, unrelated file access, credential discovery or arbitrary shell execution in officer mode. |
| Monitoring | Show the current task, elapsed time, attempt count, test outcomes and local worker state. Usage/cost is shown only when available; otherwise unknown. Keep technical detail expandable. |
| Escalation | Missing acceptance tool, changed contract, boundary violation, exhausted budget or incomplete shutdown blocks promotion and identifies the technical action needed. |
| Stop | Revoke new dispatch, kill tracked worker/test process groups, wait for termination and retain the draft. Stop incomplete remains visible and blocks restart/export. Remote work already submitted may still finish. |
| Restart | Reconcile persisted run IDs with local worker ownership, mark interrupted work stopped, preserve the last approved snapshot and require explicit restart. Never silently continue generation. |

[R] Use plain visible states: Brief saved, Needs your approval, Building, Checking, Needs attention, Ready for review, Approved prototype, Delivered, Stopping and Stopped. Internally add verification and stopping fields compatibly; do not make the UI's label the authority. The backend must enforce each gate for both renderers.

## Pull requests and overlap with existing work

[E] Git's commit summary at `f72c5dc` identifies UI improvements and system-design display work. The final clean-tree check found newer commits `1f32d87` and `0f175a8`, including phase orchestration and an additional build-engine route. [A] Work in another checkout and the authorship/ownership of individual new changes were not verified. [R] The table names concrete overlap with danjung9's architecture and the newly integrated work without inventing assignments.

| PR | Small boundary / files | Dependency and likely overlap |
| --- | --- | --- |
| [R] T1: one acceptance contract | Add one fixture file and browser driver; adapt `verification.ts` and report types. No catalog-wide expansion. | [A] Medium overlap with existing verification/tests. The other test seat should retain its original baseline results and separately test this revision. |
| [R] T2: verified snapshot export | Add snapshot helper; change `main.ts` approval/export and minimal Store metadata. | [A] Medium overlap with lifecycle work in main/storage. Merge before UI starts referring to snapshot approval. |
| [R] T3: restricted file tools | Add `workspace-tools.ts`; change Pi tool registration and browser-mode prompts. | [A] Medium overlap with `harness/pi-tools.ts` and skills integration. Preserve recipe/tool interfaces where possible. |
| [R] T4a: Pi stage worker transport | Add worker and transport modules; retain existing stage orchestration. Carry typed progress events. | [A] High overlap with `pi-backend.ts` and `system-design.ts`. Preserve danjung9's design publication and incremental component progress rather than replacing that feature. |
| [R] T4b: stop and quit proof | Add revocation, process exit acknowledgment and focused failure tests; adjust `main.ts` shutdown. | [A] High overlap with agent-runner lifecycle. Depends on T4a; test alongside T3. |
| [R] T5: officer entry and review | Modify only the selected renderer and a minimal shared approval contract. Keep engineering views available. | [A] Highest UI overlap: `src/App.tsx`, `src/studio/Studio.tsx`, `src/SystemDesign.tsx`, activity views and styling. Avoid layout changes to design/activity features. Do not undertake both renderer redesigns. |
| [R] T6: offline evidence | Extend T1's one workflow with file-open/save/reopen/export checks and delivery instructions. | [A] Low factory overlap, but app fixes belong to the generated application and its evidence. Depends on snapshot identity. |
| [R] T7: usage and context, optional | Separate small instrumentation and template-routing PRs, as Optimizations 7 and 8. | [A] Medium overlap with Pi events, shared types and Studio brief serialization. Do not merge while worker event semantics are unsettled. |

[R] Specific rebase changes for `0f175a8`: T3 should restrict `globalAgentTools` through the execution-mode policy and reuse `toolsForPhase`; T4 should add a Pi worker adapter beside the new session-adapter seam rather than replace FleetBackend; T5 should use `src/ModelSettings.tsx` and retain `src/PhaseDetails.tsx`; T7 should not recreate already implemented per-phase domain-tool filtering. Combining intake/research/planning would directly conflict with the new five-session flow and should be a separately measured proposal, not bundled into safety fixes.

[R] Each PR preserves existing APIs where practical and brings focused regression evidence. Keep behavioral changes behind one explicit restricted-browser execution mode until the complete mode passes its gates. Before merging, confirm the current base commit and ask the code owner to review overlap in the normal team process. This review sends no messages and creates no PRs.

## Deadline fallback

[R] If either T3 or T4 lacks a successful real-SDK boundary/termination proof before the integration buffer, remove live generation from the officer path. Demonstrate a previously generated snapshot that passes T1/T2/T6, show the existing factory's actual artifacts and disclose what was not rerun live. Do not show a deterministic fixture provider as a live model result. Retain the offline app and honest findings as observable work under rule 3.

[A] The must changes are estimated at 12 to 20 engineering hours in [[Research/Architecture/Optimizations]], with a separate 3 to 4 hour integration/submission buffer. Availability of a developer browser, supported SDK tool replacement and worker packaging is not verified. This is why the fallback is part of the target rather than an afterthought.

## Later design, introduced one boundary at a time

[R] The later architecture keeps the controller and officer flow, adding a proven execution adapter for applications that need more than browser file generation:

```text
Officer UI -> local controller + durable run journal
                    |
       +------------+----------------+
       |                             |
 model request broker         worker supervisor
 approved endpoint/caps       disposable OS boundary
       |                      source/dependency caches
       +------ context/tool results--+
                                     |
                          immutable candidate snapshot
                                     |
                   independent acceptance environment
                                     |
                   human approval -> signed package
```

| Later PR | Bounded change, proposed files and proof |
| --- | --- |
| [R] L1: one sandbox adapter | Add one `electron/executors/<chosen-runtime>.ts` implementation behind a small executor interface. Mount only source/temp; no home, controller store or runtime-management socket; constrain network/resources. Prove canary denials and descendant termination before enabling arbitrary shell. Do not combine runtime selection, multi-platform support and UI work in one PR. |
| [R] L2: request broker | Add a model-request adapter with endpoint allowlisting, per-run revocation and budgets. Keep model credentials outside untrusted executable environments. Prove no broker access after revocation and no secrets in candidate storage. Exact transport depends on the chosen executor and is not verified here. |
| [R] L3: run journal and recovery | Add append-only lifecycle events plus an index/snapshot around Store. Record controller version, contract, artifacts and terminal reason. Prove crash recovery at one transition at a time. A database migration is unnecessary until measured needs justify it. |
| [R] L4: one reusable recipe package | Version one successful recipe, interface, fixtures, provenance/license record and evidence manifest in `harness/recipes/`. Validate it on a second distinct app. Promote tested components, not arbitrary conversation memories. |
| [R] L5: packaging and stable app storage | Add one supported delivery target with local dependencies, stable storage identity, backup/import and update/rollback instructions. Prove cold install and interrupted save on that target. Follow with signing/notarization as its own distribution PR. |
| [R] L6: optional local inference | Add one local-provider configuration and a fixed small quality/latency comparison. Pre-stage weights/tools and prove cold-start without network. Preserve manual review and deterministic application use when inference is unavailable. No local-model suitability claim precedes that experiment. |

[R] Stage these as separately reviewed experiments, each with a concrete artifact and failure condition. Assign mission and technical owners through the team before a pilot; this review does not invent those people or approvals. [R] Borrow bounded scheduling from SWE-AF only if multiple independent jobs demonstrate a need; durable work/evidence from SuperPlane; supervisor recovery from Symphony; and structured specification/reuse records from Aperant. The relevant fit notes are linked in Optimizations. No full replacement is justified by the evidence reviewed here.

## Sources

- [E] Existing seams and baseline: https://github.com/danjung9/FleetHarness/tree/f72c5dc15aa6c34d2b9080c1c0b87742230cc16e (private reference, not fetched).
- [E] [[Research/Architecture/Current-Architecture]], [[Research/Architecture/Findings]], [[Research/Architecture/Optimizations]].
- [E] Design precedents: [[Research/Projects/SWE-AF/FleetHarness-Fit]], [[Research/Projects/SuperPlane/FleetHarness-Fit]], [[Research/Projects/Symphony/FleetHarness-Fit]], [[Research/Projects/Aperant/FleetHarness-Fit]], [[Research/Build-Patterns/Isolated-Execution]], [[Research/Build-Patterns/Security]], [[Research/Build-Patterns/Offline-Local-Models]].
- [P] [[Event/Rules]], [[Event/Judging]].
