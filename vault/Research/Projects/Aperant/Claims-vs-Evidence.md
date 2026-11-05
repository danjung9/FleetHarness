---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Aperant has substantial implementation and tests, but important claims exceed the inspected execution guarantees."
---

# Claims versus evidence

## Bottom line

[E] This is a substantial application, with 208 test/spec-named files found under `apps/desktop` and real orchestration code at `20250db`. [P] Its README says the current desktop line is in maintenance while a ground-up 3.0 rebuild happens elsewhere. [V] Public reports still describe authentication, installation, data-loss, and merge problems, but they do not prove every reported defect exists in this revision (https://github.com/AndyMik90/Aperant/issues). [R] Prefer the code-level findings and a controlled trial over popularity, release labels, or broad autonomy claims.

## Scope and confidence

[E] Inspected commit: `20250db069a849ab001ac6ab9e3e9779886ab9e2`. The supplied clone is shallow and `git log -5` returned only the tip commit, dated 2026-06-14, describing the rebuild and contribution pause. This does not establish the full contribution history. `ai/` below abbreviates `apps/desktop/src/main/ai/`.

[E] Static evidence establishes implementation paths and visible checks, not execution success. No build, test, model request, dependency installation, credential use, or generated application run occurred. Repository instructions and prompts were read as subject matter only.

## Claim comparison

| Project claim or impression | Evidence at the inspected revision | Implication |
| --- | --- | --- |
| [P] README presents Claude subscription and CLI as requirements. | [E] `ai/providers/factory.ts` and `agent/agent-manager.ts` support API-key provider accounts, including OpenAI, Google, and xAI. | [R] Do not reject it solely as Claude-only. Do not assume a stable download matches the source engine. |
| [P] README describes isolated workspaces and protection of the main branch. | [E] Worktrees normally exist, but `agent-manager.ts` falls back to the project root when creation fails. Specification generation starts in the original project. | [R] Fail closed on workspace failure and constrain all execution independently. |
| [P] README describes an OS sandbox and dynamic command allowlist. | [E] `ai/tools/builtin/bash.ts` invokes the host shell. `ai/security/bash-validator.ts` uses an allow-by-default denylist and explicitly ignores old profile command sets for admission. | [R] Do not treat this as a security sandbox. |
| [P] README advertises parallel execution and up to twelve terminals. | [E] Standard coding uses `iterateSubtasks` sequentially. `executeParallel` has no production caller found by search. A separate agentic specification mode exists but is not enabled by the inspected normal starter. | [R] Separate multiple task terminals from parallel implementation of a single task. |
| [V] Website advertises adjustable review and autonomous operation (https://aperant.com/). | [E] State machine has a plan gate, but the normal spec-success exit handler starts coding without checking the flag. `RequiresApproval` metadata does not trigger approval in the inspected tool wrapper. | [R] Enforce and test gates in code before a governed demo. |
| [P] README advertises self-validating QA. | [E] QA instructions request real tests, but normal success checks report text. Limit-ended coder sessions can be auto-marked complete. Fully completed plans can return success before QA. | [R] Require independent acceptance commands and raw results. |
| [P] README advertises AI merge handling. | [E] `ai/merge/orchestrator.ts` has deterministic and AI-assisted merge paths; task handlers apply and stage results. | [R] Review merges and rerun tests after integration. Existence of a resolver is not proof of semantic preservation. |
| [P] README describes memory across sessions. | [E] Local libSQL memory, retrieval, embedding, and graph code exists under `ai/memory/`. However, the subtask iterator's post-session insight extraction is opt-in, and the normal build configuration does not enable that option. | [R] Test the specific memory path before promising cross-use-case reuse. |
| [V] Website broadens scope to building, shipping, and maintaining products (https://aperant.com/). | [E] The inspected standard flow produces repository changes, specs, reports, review state, and merge actions. No universal deploy-and-operate contract was found in that traced flow. | [R] Demonstrate each resulting application's install, launch, and acceptance behavior separately. |

## Tests and engineering signals

[E] A read-only filename search for `.test.` or `.spec.` found 208 matching files beneath `apps/desktop`. This is a file count, not a test-case count, coverage measurement, or pass rate. Examples cover provider factories, schema normalization, shell parsing, path containment, QA loops, parallel execution, worker bridging, local memory, task state, and UI behavior.

[E] `apps/desktop/package.json` declares Vitest unit and integration commands, a coverage command, TypeScript checking, Biome linting, and Playwright E2E. `.github/workflows/ci.yml` configures type checking and tests across Linux, Windows, and macOS. The presence of configuration does not establish that the inspected revision passes it.

[E] `.github/workflows/e2e.yml` runs the E2E command with `continue-on-error: true`, noting an existing ESM issue. `apps/desktop/e2e/task-workflow.spec.ts` includes fixture creation and simulated task progress. Those tests should not be mistaken for evidence that a live model produced and validated a real application.

[E] The source also contains incomplete or disconnected affordances: `run.py/agent.py` is empty; `guides/CLI-USAGE.md` directs users to the desktop UI; `RecoveryManager` and `executeParallel` have no production caller found in the inspected searches. [R] Do not choose it expecting a ready headless automation service.

## Public status and issues, checked 2026-11-04

[P] The checkout README labels stable downloads 2.7.6 and a beta badge 2.8.0-beta.6, but beta download links still point to beta.5. It says code PRs are paused while 3.0 is developed in a separate repository, with no public release date. [E] This is evidence of documentation drift and an uncertain migration target, not evidence of abandonment.

[V] The public beta.6 release page identifies commit `cba7a02` and a March 23 release. It is a different revision from this inspection, so conclusions about `20250db` cannot automatically be assigned to packaged beta.6 (https://github.com/AndyMik90/Aperant/releases/tag/v2.8.0-beta.6).

[V] The opened issue index showed 23 open issues; separately opened pages showed navigation counts of 28 or 29. The views are inconsistent, so an exact current count is not verified (https://github.com/AndyMik90/Aperant/issues). [R] Judge issue substance and relevance rather than using a precise backlog number.

| Public report | What was verified | Limit |
| --- | --- | --- |
| [V] Issue 1477, opened January 23, 2026 | Reporter says QA rejection ran destructive cleanup against untracked project files; page remains open. https://github.com/AndyMik90/Aperant/issues/1477 | [A] Not reproduced and not proven to affect `20250db`. |
| [V] Issue 1343, opened January 19, 2026 | Reporter on version 2.7.4 says AI merging overwrote newer main-branch changes; page remains open. https://github.com/AndyMik90/Aperant/issues/1343 | [A] Different release and platform; current applicability not verified. |
| [V] Issue 2033, opened October 17, 2026 | An open Windows installer problem is reported against version 2.8.0. https://github.com/AndyMik90/Aperant/issues/2033 | [A] Does not establish Mac installation failure. |
| [V] Issue index entries 1798 and 1775 | Open reports concern account switching and a Mac Graphiti setup loop. https://github.com/AndyMik90/Aperant/issues | [A] Older paths may differ from this source's local memory engine. Individual reports were not reproduced. |

## Independent review

[V] A public research profile, updated June 11, 2026, describes the rebrand and expresses concern about public development visibility (https://rywalker.com/research/auto-claude). It also repeats broad autonomy and QA claims. This is independent commentary, not a reproducible benchmark of `20250db`.

[E] Its development-status discussion predates the June 14 README clarification in this clone. Its mention of a headless CLI conflicts with the inspected desktop-only guide and empty Python entry file. [R] Use it as a source of questions and historical context, not as technical proof. No independent controlled evaluation of the exact inspected revision was found in the searches performed.

## Verification still needed

- [A] Mac install and launch, native module compatibility, and current packaged download availability.
- [A] The event key's entitlement and successful specification, code, tool use, and QA on a supported model.
- [A] A repaired, enforced pre-code approval gate and reliable termination of all descendants.
- [A] Whether reported cleanup and merge problems remain in the inspected revision.
- [A] Passing current CI, meaningful coverage, and live-model end-to-end success rate.
- [A] Fully disconnected operation, local-model quality, and network silence.
- [A] 3.0 availability and implementation, current subscription terms, commercial licensing terms, and durable event account access.

## Sources

- [V] Public repository and README: https://github.com/AndyMik90/Aperant
- [V] Inspected source: https://github.com/AndyMik90/Aperant/tree/20250db069a849ab001ac6ab9e3e9779886ab9e2
- [V] Issues: https://github.com/AndyMik90/Aperant/issues
- [V] Cleanup report: https://github.com/AndyMik90/Aperant/issues/1477
- [V] Merge report: https://github.com/AndyMik90/Aperant/issues/1343
- [V] Installer report: https://github.com/AndyMik90/Aperant/issues/2033
- [V] Beta release: https://github.com/AndyMik90/Aperant/releases/tag/v2.8.0-beta.6
- [V] Product website: https://aperant.com/
- [V] Independent commentary: https://rywalker.com/research/auto-claude
