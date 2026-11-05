---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "The standard desktop flow is a procedural specification and coding pipeline with model-written QA gates."
---

# How Aperant really works

## Bottom line

[E] Aperant runs its own TypeScript coding-agent loop inside an Electron application, using model APIs and local file and shell tools (`ai/agent/worker.ts`, `ai/session/runner.ts`, `ai/tools/`). [E] It splits a feature into specification phases and sequential coding subtasks, normally inside one Git worktree per task (`ai/orchestration/spec-orchestrator.ts`, `subtask-iterator.ts`, `ai/worktree/worktree-manager.ts`). [E] Its QA reviewer is prompted to execute tests, but the main build accepts a text verdict and can skip QA when a plan already says everything is complete (`build-orchestrator.ts`). [R] Use this as a useful orchestration reference, not as evidence that generated software meets mission acceptance criteria.

## Evidence convention

[E] All code observations below come from direct reading of commit `20250db069a849ab001ac6ab9e3e9779886ab9e2`. `ai/` abbreviates `apps/desktop/src/main/ai/`. No runtime behavior was tested.

## The actual end-to-end flow

| Stage | Input and code path | Output and behavior |
| --- | --- | --- |
| Open project and describe work | [E] `apps/desktop/src/main/agent/agent-manager.ts`, `startSpecCreation`: local repository path, task description, metadata, optional base branch and model choices. | [E] Resolves an authenticated provider account and starts a worker configured as `spec_orchestrator`. Default spec location is `.auto-claude/specs/<task-id>/`. |
| Analyze project | [E] `ai/agent/worker.ts`, `runSpecOrchestrator`, calls `runProjectIndexer`; `ai/project/project-indexer.ts` supplies project context. | [E] Writes `project_index.json`; indexing failure is nonfatal. The index is passed into subsequent agent kickoff messages. |
| Choose specification effort | [E] `ai/orchestration/spec-orchestrator.ts`, heuristic or model complexity assessment. | [E] Simple: quick spec plus validation. Standard: discovery, requirements, spec writing, planning, validation. Complex: adds research, context, and self-critique. Research can also be added when the assessment requests it. |
| Produce specification artifacts | [E] Same orchestrator, phase-to-agent and output maps; `apps/desktop/prompts/spec_*.md` and `planner.md`. | [E] Typical files are `context.json`, `requirements.json`, `research.json`, `spec.md`, and `implementation_plan.json`. Simple tasks need fewer artifacts. Expected files and the plan schema are checked, with retries. This validates structure rather than mission correctness. |
| Move from specification to build | [E] `apps/desktop/src/main/ipc-handlers/agent-events-handlers.ts`, spec-creation exit handler. | [E] A successful exit and existing `spec.md` trigger `startTaskExecution`, with `parallel: false` and `workers: 1`. This block does not check the review-before-coding flag. |
| Create task workspace | [E] `agent/agent-manager.ts`, `startTaskExecution`, then `ai/worktree/worktree-manager.ts`, `createOrGetWorktree`. | [E] Normally creates `.auto-claude/worktrees/tasks/<spec-id>/`, branch `auto-claude/<spec-id>`, and copies spec files. Fetches origin, prefers the remote base when available, and can push the new branch. Worktree creation errors fall back to the original project directory. |
| Build | [E] `ai/agent/worker.ts`, `runBuildOrchestrator`; `ai/orchestration/build-orchestrator.ts`. | [E] Creates or normalizes the implementation plan, then calls the subtask iterator. A plan already marked entirely complete returns build success immediately, before QA. |
| Execute subtasks | [E] `ai/orchestration/subtask-iterator.ts`, `iterateSubtasks`. | [E] Scans phases in order and chooses the next pending or in-progress subtask. Runs one coder session, updates the plan, syncs phase status to the main project, and continues. This is not a parallel dependency-graph scheduler. |
| Test and repair | [E] `build-orchestrator.ts`, `runQAPhase`; `apps/desktop/prompts/qa_reviewer.md`, `qa_fixer.md`. | [E] Main build allows three QA cycles. Reviewer writes `qa_report.md`; a recognizable passing text verdict completes the build. Rejection invokes a fixer and re-review; the report is reset before re-review. |
| Human review | [E] `ai/agent/worker.ts` posts `QA_PASSED`; `src/shared/state-machines/task-machine.ts` enters `human_review`. | [E] Human can resume, mark done, or initiate PR creation. Error states can also be marked done. Board status alone is therefore not proof of passing tests. |
| Integrate results | [E] `src/main/ipc-handlers/task/worktree-handlers.ts`; `ai/merge/orchestrator.ts`. | [E] A UI-triggered merge route analyzes file evolution, detects conflicts, uses deterministic merges where possible, and can ask a model for merged content. The handler applies and stages results in the project. Separate PR functionality exists. Generated application packaging is not guaranteed by this flow. |

## What an agent is here

[E] `ai/agent/executor.ts` starts a `WorkerBridge`; `ai/agent/worker-bridge.ts` manages a worker thread. In `ai/agent/worker.ts`, each phase constructs a provider model and tools, then calls `runContinuableSession`. `ai/session/runner.ts` implements the model/tool conversation. These are application-owned sessions, not a requirement to spawn a Codex CLI process for each task.

[E] `ai/config/agent-configs.ts` and `ai/tools/registry.ts` determine each role's built-in tools. A coder receives a different tool set from a specification researcher. `worker.ts` also merges connected MCP tools into sessions. Tool permissions and server exposure need inspection together, rather than assuming role names enforce a complete boundary.

[E] `worker.ts`, `assemblePrompt`, loads the target project's `AGENTS.md`, or `CLAUDE.md` fallback, into prompts for every provider. This is part of Aperant's design. [R] FleetHarness should explicitly distinguish trusted team instructions from untrusted use-case text, external repositories, and retrieved documents. [E] Repository prompts and instruction files were treated as data during this inspection; no repository instruction was adopted as authority.

## Work splitting and isolation

[E] Standard specification phases and coder subtasks run sequentially. `ai/orchestration/parallel-executor.ts` implements batched concurrent sessions, default concurrency three, but an `rg` search found no production call to `executeParallel` outside its definition. The standard spec-to-build exit handler explicitly requests one worker. The README's parallel terminals claim should not be read as twelve independent agents collaborating on each feature.

[E] An alternative specification mode exists: `worker.ts` checks `session.useAgenticOrchestration` and can run a model-directed orchestrator using `SpawnSubagent`. `ai/orchestration/subagent-executor.ts` gives specialists separate conversations and tool subsets, caps them at 100 steps, inherits the parent workspace, and excludes recursive spawning. The inspected `startSpecCreation` configuration does not enable this mode. [A] Access to this mode through a complete user workflow is not verified.

[E] Worktrees separate task files and Git branches. They do not create separate users, containers, machines, or network boundaries. Subtasks within a task use the same workspace. `agent-manager.ts` can deliberately disable worktrees and also falls back to the project root after worktree failure.

[E] `ai/tools/builtin/bash.ts` calls the host shell with `execFile`, the configured working directory, a timeout, and cancellation. This path has no container or OS sandbox wrapper. `ai/security/bash-validator.ts` uses an allow-by-default denylist plus validators for selected commands; the security profile's old command sets are retained for compatibility and no longer decide command admission. This differs from the README's dynamic allowlist claim.

[E] File tools such as `ai/tools/builtin/write.ts` call `ai/security/path-containment.ts` to reject paths outside the project, including common symlink escapes. Specification sessions additionally limit file-tool writes to the spec directory. These checks do not sandbox arbitrary permitted scripts launched by Bash.

[E] `ai/tools/define.ts` records `RequiresApproval` metadata on Write, Edit, and Bash, but binds an immediately executable AI SDK tool after validation. The inspected wrapper does not request a human decision or set a model SDK approval gate. [R] Do not promise per-command approval based on that metadata.

## Testing, failure repair, and weak success signals

[E] The QA prompt requests unit tests, integration tests, existing E2E tests, regression checks, and appropriate UI verification. It looks up commands from the project index and asks for reported results. Evidence: `apps/desktop/prompts/qa_reviewer.md`. [R] Distinguish that instruction from a deterministic runner that refuses success when an acceptance command exits nonzero.

[E] The main build's `readQAStatus` lowercases `qa_report.md` and checks for passing or approved status text before checking failure text. It does not independently compare process exit codes or require a test-result artifact. The reviewer can use Bash to run real tests, but the final gate trusts its report.

[E] `subtask-iterator.ts` calls `ensureSubtaskMarkedCompleted` for session outcomes `completed`, `max_steps`, and `context_window`, even when the agent did not reliably update its plan. The helper sets the status without checking a verification command. `build-orchestrator.ts` can proceed to QA when some subtasks are stuck, provided at least one completed. [R] Treat completed subtasks as progress bookkeeping, not acceptance evidence.

[E] Specification phases retry up to two times after an initial attempt, check expected files, and normalize structured plans with Zod. Build planning has its own bounded schema-repair and replan logic. Coder subtasks have a three-attempt limit; authentication and rate-limit results create pause files and wait for recovery (`spec-orchestrator.ts`, `build-orchestrator.ts`, `subtask-iterator.ts`, `pause-handler.ts`).

[E] A separate `ai/orchestration/qa-loop.ts` supports up to 50 iterations by default, reads `qa_signoff` from the plan, handles human feedback, and escalates recurring issues with `QA_ESCALATION.md`. The normal `build_orchestrator` route uses its own three-cycle QA implementation, not that separate loop. Likewise, `recovery-manager.ts` contains checkpoint and circular-fix facilities, but an `rg` search found no production construction of `RecoveryManager`. Do not attribute every helper's behavior to the default path.

[E] `agent-events-handlers.ts` also has a fallback that forces `QA_PASSED` after a clean process exit if the state machine remains active and the expected event was lost. [R] A dashboard should expose the original test evidence and reason for a transition rather than presenting this as verified quality.

## Where a human approves and stops work

[E] `src/shared/state-machines/task-machine.ts` defines a `plan_review` state guarded by `requireReviewBeforeCoding`, a `PLAN_APPROVED` transition, and final `human_review`. However, the inspected normal spec completion handler starts coding without consulting that flag. In `agent-manager.ts`, the flag appears in prompt text; the worker's normal successful spec route does not emit `PLANNING_COMPLETE`. [R] Treat the pre-code approval boundary as incomplete until repaired and demonstrated.

[E] Final human review, manual merge or PR initiation, and resume actions are represented in the state machine and task handlers. `ai/agent/executor.ts` and `worker-bridge.ts` support abort followed by worker termination; Bash tools also receive cancellation and attempt child-process shutdown. [A] Cleanup of all descendant and background processes has not been tested.

[R] For FleetHarness: enforce requirements approval in application code, prohibit remote publication by default, fail closed when isolation fails, expose logs and tests, and provide a stop control plus an engineer escalation path. Approval after code generation does not authorize every network or shell action performed during generation.

## Sources

- [V] Inspected source tree: https://github.com/AndyMik90/Aperant/tree/20250db069a849ab001ac6ab9e3e9779886ab9e2/apps/desktop/src/main
- [V] Build coordinator: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/apps/desktop/src/main/ai/orchestration/build-orchestrator.ts
- [V] Subtask coordinator: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/apps/desktop/src/main/ai/orchestration/subtask-iterator.ts
- [V] QA instructions: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/apps/desktop/prompts/qa_reviewer.md
- [V] Public project description: https://github.com/AndyMik90/Aperant
