---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Code trace of Symphony's ticket scheduling, Codex execution, workspace handling and review boundaries."
---

# How Symphony works

## Bottom line

[E] Symphony repeatedly asks an issue tracker which work is ready, then launches a Codex session in a directory assigned to each issue. [E] It monitors execution and tracker state, rather than deciding whether the resulting application is correct. [E] Its sample workflow tells the agent how to plan, validate and prepare a PR, but that text does not create an independent approval or test engine. [R] Treat it as a worker supervisor inside a larger development process.

## Evidence scope

[E] All code paths below are relative to the read-only Symphony clone at commit `be10a1b79df723d6d7612b5651c8522704dafb2e`. Short module paths such as `workspace.ex` and `codex/app_server.ex` are under `elixir/lib/symphony_elixir/`; other locations are written explicitly. This trace comes from reading files and functions, not executing them. The pinned public tree is https://github.com/openai/symphony/tree/be10a1b79df723d6d7612b5651c8522704dafb2e.

## End-to-end trace

| Stage | What actually happens | Code evidence [E] |
| --- | --- | --- |
| Start | CLI reads a workflow path, log directory and optional web port. It requires an explicit guardrails acknowledgment before starting. | `elixir/lib/symphony_elixir/cli.ex`: `evaluate/2`, `require_guardrails_acknowledgement/1`. |
| Load policy | YAML frontmatter becomes validated settings; Markdown becomes the prompt template. A store checks for changes every second and retains the last valid version if a reload fails. | `workflow.ex`: `load/1`, `parse/1`; `workflow_store.ex`: `reload_state/1`; `config/schema.ex`. |
| Start services | OTP supervision starts workflow storage, the agent runtime, logging, optional HTTP service and terminal status. | `elixir/lib/symphony_elixir.ex`: `Application.start_runtime/0`; `agent_runtime_supervisor.ex`. |
| Fetch work | The selected adapter reads candidates in configured active states and converts them to normalized issues. Inputs include identifiers, description, state, priority, labels and blockers. | `tracker.ex`: `fetch_issues_by_states/1`; `tracker/issue.ex`; `linear/client.ex`. |
| Choose work | Reconcile existing and blocked workers first. Sort eligible issues by priority, oldest creation time and identifier. Check active/terminal state, labels, claims and capacity; refresh the issue before dispatch to avoid stale decisions. | `orchestrator.ex`: `maybe_dispatch/1`, `choose_issues/2`, `sort_issues_for_dispatch/1`, `should_dispatch_issue?/4`, `refresh_issue_for_dispatch/1`. |
| Dispatch | Start and monitor an OTP task, record an in-memory claim and runtime metadata. Optional SSH hosts are selected using available capacity and host load. | `orchestrator.ex`: `spawn_issue_on_worker_host/5`, `select_worker_host/2`, `least_loaded_worker_host/2`. |
| Prepare workspace | Derive a sanitized issue key, adding a hash when sanitization changes it. Reuse an existing directory; create a new one otherwise. Run `after_create` only for a new directory. | `workspace.ex`: `create_for_issue/2`, `workspace_key/1`, `maybe_run_after_create_hook/4`. |
| Bootstrap | A configured hook populates the directory. The sample clones Symphony itself and fetches its Elixir dependencies, so it must be rewritten for FleetHarness. Run `before_run` before the agent and `after_run` after it. | `elixir/WORKFLOW.md` frontmatter; `agent_runner.ex`: `run_on_worker_host/4`; `workspace.ex`. |
| Build prompt | Render the Markdown with issue fields and attempt number through Solid, using strict variable/filter handling. The issue description is inserted into the agent prompt. | `prompt_builder.ex`: `build_prompt/2`. |
| Launch agent | Start `bash -lc` with the configured Codex command in the workspace, or launch it through SSH. Bind tracker tools and remove their declared secret environment variables from the child. | `codex/app_server.ex`: `start_port/3`, `local_launch_command/1`, `remote_launch_command/2`; `tracker.ex`: `bind_agent_tools/0`. |
| Begin conversation | Send newline-delimited JSON RPC initialization, then `thread/start` with cwd, sandbox, approval policy and dynamic tools, then `turn/start` with the prompt. | `codex/app_server.ex`: `send_initialize/1`, `start_thread/4`, `start_turn/7`. |
| Work | Codex reads and changes files, runs available project tools and calls provider-native tracker tools. Symphony relays events and records identifiers, activity, usage and errors. | `codex/app_server.ex`: `receive_loop/6`, `handle_turn_method/8`; `codex/dynamic_tool.ex`; `orchestrator.ex`: `integrate_codex_update/2`. |
| Continue or yield | After a normal turn, refresh the ticket. If it is still active and routable, send continuation guidance on the same thread, up to the per-invocation turn cap. On exit, the scheduler checks again after about one second. | `agent_runner.ex`: `do_run_codex_turns/8`, `continue_with_issue?/2`; `orchestrator.ex`: `handle_agent_down/5`. |
| Finish or stop | Moving a ticket outside active states stops its worker and preserves the workspace. A terminal state also triggers workspace cleanup. Startup also tries to clean workspaces for terminal issues. | `orchestrator.ex`: `reconcile_issue_state/4`, `terminate_running_issue/3`, `run_terminal_workspace_cleanup/0`. |

## What goes in and what comes out

[E] Required inputs are a workflow, tracker configuration and tickets, an installed/authenticated Codex runtime, and a workspace bootstrap appropriate to the target repository. A ticket can ask for research instead of code, but the scheduler makes no special distinction (`tracker.ex`, `agent_runner.ex`).

[E] Direct runtime outputs are workspace files, logs and status snapshots. A branch, PR, issue comment, test report, video or deployed app exists only if the agent and supplied tools produce it. The sample directs the agent to maintain one workpad comment, link a PR, process review feedback and collect validation evidence (`elixir/WORKFLOW.md`). [R] Preserve artifacts outside the workspace before marking an issue terminal because cleanup can remove local evidence.

## How work is split

[E] The scheduler runs one worker per claimed issue, with a default global maximum of ten and optional per-state and per-host limits (`orchestrator.ex`, `config/schema.ex`). It does not implement separate researcher, planner, coder and verifier roles, a central task decomposition model, or artifact handoff between seven pipeline phases.

[E] Tracker adapters can gate initial work on blockers. For example, Linear candidate routing holds `Todo` issues with non-terminal blockers; this is not a general workflow DAG executor (`linear/client.ex`, adapter documentation in `elixir/README.md`). [R] A human or an upstream planner must create useful tickets and dependency links. Any subagents that Codex itself uses are a separate runtime capability, not Symphony's task-splitting algorithm.

## Isolation and authority

[E] A workspace is a separate directory, often a full clone created by a hook. Symphony does not automatically create a container, VM or Git worktree per issue (`workspace.ex`, sample `WORKFLOW.md`). Local paths are canonicalized and checked against the workspace root; symlink escape checks protect path handling (`path_safety.ex`, `codex/app_server.ex`: `validate_workspace_cwd/2`).

[E] Codex supplies the execution sandbox. Omitted settings resolve to a workspace-write sandbox rooted at the issue directory and a rejecting approval-policy object. The sample overrides that policy with `never`, enables turn network access and asks the Codex shell to inherit its environment (`config/schema.ex`, `elixir/WORKFLOW.md`). Hooks are shell commands run by the orchestration host or SSH worker, outside the Codex turn-policy mechanism (`workspace.ex`: hook execution). [R] Directory separation and secret-variable scrubbing are useful, but are not proof of hostile-code containment.

[E] The generated default turn policy also declares full read-only access and leaves temporary-directory exclusions disabled (`config/schema.ex`: `default_turn_sandbox_policy/1`). [R] Do not describe separate working directories as confidentiality isolation between agents or from readable host files. Actual enforcement also depends on the selected Codex runtime and host.

[E] Tracker tokens stay on the orchestration side for dynamic tool calls. This reduces direct token exposure but does not reduce the token's authority. `linear_graphql` accepts raw queries and mutations; `github_api` permits GET, POST, PATCH, PUT and DELETE against relative REST paths (`linear/agent_tool.ex`, `github/agent_tool.ex`). Scheduler project filtering is not an authorization scope on these tools. [R] Restrict tokens and replace broad mutation tools with operations limited to the current issue before treating ticket approval as a security boundary.

## Tests and repair

[E] Symphony has its own ExUnit tests for scheduling, workspace safety, API behavior, SSH and app-server interactions. Its ordinary CI checks do not prove the software created by an agent meets a Fleet use case (`elixir/test/`, `elixir/Makefile`, `.github/workflows/make-all.yml`).

[E] The sample prompt requires ticket-defined validation, resolving review feedback, synchronizing with main and green PR checks before `Human Review`. The `land` skill describes watching CI, repairing failures and squash-merging. These are agent instructions and tools, not a deterministic test-result parser or enforced acceptance gate (`elixir/WORKFLOW.md`, `.codex/skills/land/SKILL.md`, read as data).

[E] Worker crashes and detected stalls cause retries with a 10-second exponential base, capped by default at five minutes. Existing workspaces are reused. The five-minute stall default measures time since activity; the one-hour turn timeout is a silence timeout reset by incoming messages, not a total task duration. Twenty turns limits one invocation, not the total lifetime or spend of a ticket (`orchestrator.ex`, `agent_runner.ex`, `codex/app_server.ex`, `config/schema.ex`). [R] Add a separate task deadline, retry budget and inference-spend limit.

[E] Actual failed-turn handling has a gap: `handle_incoming/6` returns success for `turn/completed` without checking its embedded status. [V] The independent reproduction at https://github.com/openai/symphony/discussions/133 matches this code. [R] Fix and regression-test that case before relying on automatic repair.

## Where a person approves and stops work

[E] In the sample, a human is expected to review the PR at `Human Review` and move the issue to `Merging` to authorize landing. The scheduler excludes `Human Review` from active states. There is no check that only a human performed the `Merging` transition, and the agent's tracker tool can make mutations (`WORKFLOW.md`, `orchestrator.ex`, `linear/agent_tool.ex`).

[E] At the protocol level, policy `never` sets `auto_approve_requests` true and automatically answers recognized command/file approvals and recognized MCP approval choices. Other policies can surface an approval or input requirement as a blocked runtime entry. The blocked map is in memory, clears on restart and has no approval-response endpoint in the router (`codex/app_server.ex`, `orchestrator.ex`, `elixir/lib/symphony_elixir_web/router.ex`).

[E] The dashboard and JSON endpoints expose work state and refresh polling; they are observability, not an approval console. Default server bind is localhost (`config/schema.ex`, `router.ex`). [V] A September cancellation report describes surviving OS child processes after the scheduler releases a worker: https://github.com/openai/symphony/discussions/126. [R] Demonstrate process-level shutdown and revocation as well as ticket-state changes. Keep merge, publication, deployment and operational-readiness acceptance under explicit human control.

## Sources

- [V] Pinned implementation: https://github.com/openai/symphony/tree/be10a1b79df723d6d7612b5651c8522704dafb2e/elixir
- [V] Specification: https://github.com/openai/symphony/blob/be10a1b79df723d6d7612b5651c8522704dafb2e/SPEC.md
- [V] App-server protocol: https://developers.openai.com/codex/app-server/
- [V] Failed-turn reproduction: https://github.com/openai/symphony/discussions/133
- [V] Cancellation reproduction: https://github.com/openai/symphony/discussions/126
