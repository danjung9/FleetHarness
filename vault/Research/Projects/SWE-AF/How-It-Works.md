---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "SWE-AF's classic factory is a dependency-scheduled coding and repair pipeline, but its installed engine changes the entry points."
---

# How SWE-AF works

## Bottom line

[E] The classic factory splits a goal into issues, runs independent issues in Git worktrees, merges the results and checks the original requirements (`go/internal/orch/build.go`, `go/internal/dag/executor.go`). [E] Tests are selected and run by coding or testing agents, while the orchestrator handles scheduling and structured results (`go/internal/roles/coding/coding.go`). [E] Human plan approval is conditional on HAX configuration, not a mandatory default (`go/internal/orch/approval_gate.go`). [R] FleetHarness must supply its own required approval and final evidence checks.

## Evidence anchor

[E] All relative code paths below refer to the supplied clone at `ef26ffbf61496387d7ba554e83799cb5385804d0`, rooted at `<local clones>/SWE-AF`. Findings come from reading code, not running it.

## First choose which system is being discussed

| Path | Actual behavior at the inspected commit |
| --- | --- |
| Classic Python | [E] `python -m swe_af` and root Docker use `swe_af/app.py`, with planning, execution, verification, resolve and resume entry points. |
| Classic Go | [E] `SWE_PRO_ENGINE=0` exposes the classic API through `go/internal/node/register.go`; implementations live under `go/internal/orch`, `dag`, `coding`, `roles` and `issue`. |
| Default repository install | [E] Root `agentfield-package.yaml` redirects `af install` to `go/`; its manifest defaults `SWE_PRO_ENGINE` to `1`. With a runnable engine binary, `RegisterPlanner` returns before registering `build`, `plan`, `execute`, `resolve`, `resume_build` and `implement_issue`. |
| Pro engine | [E] `go/internal/pro/pro.go` supervises a platform-specific `swe-pro` executable as a child service. `go/docs/pro-engine.md` describes `swe-pro.code_task` and `code_resume`. The wrapper source is visible; the engine's internal implementation was not found as source in this clone. |
| Fast mode | [E] `go/internal/fast/executor.go` runs one coder pass per task sequentially in the same repository, with no worktrees, QA/reviewer loop or replanning. The fast build also has planning and final verification (`go/internal/fast/build.go`). |

[E] This is a material docs/code discrepancy: `go/README.md` and `go/docs/pro-engine.md` describe seamless engine routing within classic builds, but current registration withholds those builds when the engine is available (`go/internal/node/register.go:70`). [R] Explicitly disable the engine before relying on the classic flow traced below. Do not assume the advertised one-call example reaches it after a default installation.

## Classic end-to-end trace

1. [E] **Input and dispatch.** `go/internal/orch/build.go:Build` accepts `goal`, local `repo_path` or `repo_url`, `additional_context`, artifact directory and build configuration. AgentField accepts asynchronous execution requests and dispatches child reasoners through `App.Call`; node registration is in `go/internal/node/register.go`. The result record can be queried by execution ID.
2. [E] **Prepare a workspace.** `Build` creates a build ID and derives a fresh directory for URL-only builds. `prepareSingleRepo` clones a repository. If both a URL and an existing checkout are supplied, it can remove worktrees, force checkout and hard-reset to the remote branch. `go/internal/orch/clone_repos.go` supports multiple repositories and a workspace manifest. [R] Full builds should receive disposable checkouts, never the team's working copy.
3. [E] **Plan and initialize Git.** `Build` calls `plan` concurrently with `run_git_init`. `go/internal/orch/plan.go:Plan` invokes product manager, optional environment scout, architect, tech lead review with bounded architecture revisions, then sprint planner. Planning roles call the selected harness with prompts and typed output schemas (`go/internal/roles/planning/planning.go`). Git initialization failure can be logged and allowed to continue without the Git workflow.
4. [E] **Decompose work.** `go/internal/dagutil/dagutil.go` computes topological levels, assigns issue sequence numbers and detects declared file conflicts; dependency cycles return errors. `Plan` starts issue writers concurrently. Issues carry descriptions, acceptance criteria, file lists, dependencies, testing guidance and target repository. Issue-writer failures are counted without cancelling the remaining writers. Plans live under `.artifacts/plan/`, including `prd.md`, `architecture.md` and issue documents; `rationale.md` sits at the artifact root.
5. [E] **Optional human checkpoint.** After planning and Git setup, `Build` invokes `PlanApprovalGate` when HAX is configured, an execution ID exists and the gate is wired. The gate creates a plan-review request, pauses through the control plane, accepts approval, handles requested changes with bounded replanning, or returns a terminal rejection/expiry outcome (`go/internal/orch/approval_gate.go`). Missing HAX or pause infrastructure skips the gate. This checkpoint precedes coding, but not all planning or Git changes.
6. [E] **Execute dependency levels.** `go/internal/orch/execute.go` invokes `go/internal/dag/executor.go:RunDAG`. Ready issues within a level run concurrently, bounded by `max_concurrent_issues`, default 3 in `go/internal/config/buildconfig.go`. Later levels wait for the current level. Worktrees are created only when the Git integration branch is available; otherwise the coding loop can fall back to the shared repository path.
7. [E] **Isolate edits with Git.** `go/internal/dag/gitfast.go:fastSetupWorktrees` creates an `issue/<build-id>-<sequence>-<name>` branch and worktree from the integration branch. These are separate working directories with shared Git objects. Deterministic Git handles normal worktree setup, clean merges and cleanup, falling back to agent roles on failure or conflict. This is edit isolation, not a security boundary between agents.
8. [E] **Implement and review.** `go/internal/coding/loop.go:RunCodingLoop` calls the coder in the issue worktree. Normal issues then call a reviewer. Issues marked for deeper QA run QA and review concurrently, followed by synthesis. The coder receives feedback for another iteration. `go/internal/roles/coding/coding.go` supplies shell and file tools, prompts, selected models and structured result schemas. The orchestrator consumes fields such as files changed, tests passed, approval and blocking findings; it does not independently prove every returned field true.
9. [E] **Repair progressively.** The inner loop defaults to 5 iterations. Advisor invocations default to 2 and can change approach, modify scope, split an issue, accept debt or escalate. The DAG layer can replan the remaining graph, default at most 2 replans (`go/internal/coding/loop.go`, `go/internal/dag/executor.go`, `helpers.go`, `gates.go`, `go/internal/config/buildconfig.go`). Repeated blocking findings or exhausted budgets can fail the issue. Fatal harness errors take separate propagation paths. Completion with debt is a supported result, not equivalent to meeting every original requirement.
10. [E] **Merge and test combinations.** `go/internal/dag/gitfast.go` merges completed branches sequentially with `--no-ff`, aborts conflicts and sends those conflicts to the merger agent. Multiple merged branches or agent conflict resolution trigger integration testing; a single clean branch need not trigger a separate integration test. `go/internal/dag/gates.go` handles integration-test retries and associated failure handling.
11. [E] **Check original requirements.** `Build` calls `run_verifier` using the PRD and completed/failed/skipped work. On specific failed criteria, it calls `generate_fix_issues`, executes the fix plan and verifies again. The default is one fix cycle. Unfixable criteria can become debt. Final `success` is derived from the verifier's `passed` field (`go/internal/orch/build.go`).
12. [E] **Finalize and hand off.** Finalization happens after verification and may remove build artifacts and commit cleanup (`go/internal/roles/gitops/finalize.go`, `go/internal/prompts/gitops/repo_finalize.go`). Optional push and ready-for-review PR creation follow, with CI watching and up to 2 CI-fix cycles by default. Full builds default `enable_github_pr=true`; no separate human pre-push approval is enforced by this code. The result includes plan, DAG state, verification, success, summary, PR results and CI-gate results. CI results do not redefine the already computed verifier success.

## Shorter issue-level route

[E] `go/internal/issue/build.go:ImplementIssue` accepts a fully specified issue, committed local checkout, optional base branch and config. It creates a worktree and issue branch from a resolved base commit, runs the classic coding loop, optionally verifies once, removes the worktree and returns the branch, commits, changed files, verification and debt. It preserves useful commits on a failed attempt and removes an empty branch. [E] `go/internal/config/issueconfig.go` defaults to 3 coding iterations, verification enabled and PR creation disabled. [R] This is the most relevant possible integration seam when FleetHarness already owns requirements and planning.

## Important limits on authority and isolation

- [E] The root Compose runs agents in shared service containers and a shared workspace volume, not a new container or VM per issue (`docker-compose.yml`). Agents have shell tools; worktrees do not prevent access to sibling files, environment variables, services or network destinations.
- [E] The Python Codex patch maps `permission_mode=auto` to `--dangerously-bypass-approvals-and-sandbox`; an empty mode maps to workspace-write (`swe_af/runtime/codex_harness_patch.py`). Go forwards permission options through AgentField's SDK; equivalent Go sandbox enforcement was not verified by running or inspecting the external SDK.
- [E] A nonfatal reviewer error can synthesize approval on the default Go loop if there is no previous blocking review (`go/internal/coding/loop.go:runDefaultPath`). [R] Reject unavailable review in FleetHarness and require an independent executable test gate.
- [E] `go/internal/dag/checkpoint.go` writes `.artifacts/execution/checkpoint.json` non-atomically and treats unreadable or invalid checkpoints as missing. [R] Preserve logs and artifacts before finalization; do not promise crash-proof recovery.
- [E] The Go manifest describes optional Furrow workspace mirroring, including untracked files and possible secrets, with defaults depending on deployment environment (`go/agentfield-package.yaml`, `go/internal/furrow/`). [R] Disable mirroring for the initial event evaluation.
- [R] Keep requirements approval outside the agent, prohibit unauthorized external writes, stop on debt affecting required criteria, monitor execution records and child processes, and test cancellation by stopping the node plus its child agents. End-to-end shutdown enforcement was not verified in this review.

## Sources

- https://github.com/Agent-Field/SWE-AF/tree/ef26ffbf61496387d7ba554e83799cb5385804d0
- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/go/internal/node/register.go
- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/go/internal/orch/build.go
- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/go/internal/coding/loop.go
