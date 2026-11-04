---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Trace of ticket intake, factory graphs, agent execution, verification, repair and human control at the pinned commit."
---

# How SuperPlane works

## Bottom line

[E] SuperPlane stores tasks and runs a graph of configured actions around external coding tools. [E] The implementation template actually creates a branch, invokes an agent, pushes changes and creates or updates a pull request. [E] Separate automations respond to check failures and review feedback. [R] Treat it as development coordination whose guarantees depend on configured checks, runner deployment and repository permissions.

## Scope of evidence

[E] All file paths below are relative to the supplied SuperPlane clone at commit `7d755d16b8ae836ecebf61639efc6266d74a4b0b`. Findings come from static source inspection, not an executed demonstration. References to a default mean a bundled template or explicit constant, not a verified configuration of a deployed account.

## Real end-to-end flow

| Stage | Input, processing and output | Code evidence |
| --- | --- | --- |
| Intake | [E] A GitHub issue label event or assignment event is filtered, then its title and body become a work order. The label route checks for `factory`; the assignment route checks the configured agent login in the bundled template. | `pkg/grpc/actions/factories/templates/github/issue-intake.canvas.yaml`; `pkg/components/factory/create_work_order.go` |
| Other intake | [E] Imported tracker items can become work orders with origin information and attachments. A separate scheduled automation can ask an agent to propose a task; it validates a JSON proposal before creating it. | `pkg/grpc/actions/factories/import_factory_intake_item.go`; `templates/github/scheduled-intake.canvas.yaml` under that same actions directory |
| Assess and refine | [E] Factory agent selection and planning assets support a refinement session, task context and tools. These do not prove that every imported ticket is suitable or has executable acceptance criteria. | `pkg/grpc/actions/factories/intake_agent.go`; `pkg/components/runner/planning_session_assets.go`; `analysis_protocol.js`; `pkg/public/runner_planning_session.go` |
| Dispatch | [E] The dispatch API resolves a work order and named line, records an actor, accepts model/thinking settings, and starts line steps inside a database transaction. | `pkg/grpc/actions/factories/dispatch_work_order.go` |
| Route work | [E] The event router reads outgoing graph edges by output channel, associates runs and queues target nodes. Node workers lock pending records and execute registered actions. PostgreSQL state and RabbitMQ messages coordinate the work. | `pkg/workers/event_router.go`; `node_queue_worker.go`; `node_executor.go` |
| Allocate execution | [E] Runner components create command/file payloads. The scheduler pairs pending tasks with runners; runners register and use a WebSocket control connection. Creating registration credentials alone does not provision a machine. | `pkg/components/runner/create_task.go`; `pkg/workers/runner_task_scheduler.go`; `pkg/public/runnerapi/`; `pkg/runners/README.md` |
| Prepare repository | [E] Generated checkout helpers clone the repository, select the default or requested branch, or check out a PR revision/head for verification and repairs. Workspace instructions, tools and resources are added around that checkout. | `pkg/components/runner/workspace_agent_resources.go`; `agent_task.go` |
| Implement | [E] The bundled graph uses one agent node with ordered prompt and Bash steps. It asks the agent to create a branch, implement, test and commit. Bash then stages remaining work, commits if needed, rejects a branch with no commits ahead of the base and pushes. | `pkg/grpc/actions/factories/templates/github/line-implementation.canvas.yaml` |
| Produce a PR | [E] A later prompt writes title and description files. Bash encodes those and the branch in a JSON result file. The graph records the branch artifact, finds an existing PR, creates or updates it using integration actions, then links it to the work order. | Same implementation YAML; `pkg/components/factory/add_pull_request.go`; `pkg/runners/agent/result_file.go` |
| Verify and repair | [E] PR events enter an automation that waits for selected checks. Passed, failed and timeout channels route separately. Failure requests exclusive repair access and launches a repair agent; a new push retriggers checks. | `pkg/grpc/actions/factories/pr_feedback_checks_template.go`; `pkg/integrations/github/` wait/check components |
| Review feedback | [E] Discussion automations handle PR comments, reviews and replies, locate the linked task/activity, check out the branch and invoke an agent to address feedback. | `pkg/grpc/actions/factories/pr_feedback_template.go`; `pr_feedback_graph.go` |
| Completion | [E] A PR closure automation handles merged/closed outcomes and updates linked work. There is also a feature-gated merge API that checks mergeability and allowed merge methods before calling source control. | `templates/github/pr-closure.canvas.yaml` under the actions directory; `merge_factory_pull_request.go` |

[E] The refinement protocol asks the agent to score clarity, complexity and verifiability on a one-to-three scale, and describes the headline confidence as derived from the weakest subscore. It permits a specification when clarity is at least two and asks for a plan plus unresolved questions through structured tools. This is a defined readiness rubric, not a measured probability of success. Evidence: `pkg/components/runner/analysis_protocol_review.md`, read as product data.

## How work is split

[E] The reusable unit is a work order dispatched onto a line of graph actions, rather than a fixed committee of specialist agents. The implementation template has one agent node, concurrency maximum five, containing sequential prompt/Bash steps. PR feedback, confidence assessment and visual evidence can run in separate automations. Evidence: implementation YAML, `factory_app_templates.go`, and `pr_feedback_template.go`.

[E] The agent tools include creating draft tasks, so decomposition can be requested. A tool for creating subtasks is not a guaranteed dependency-aware parallel build-and-merge planner. Evidence: `pkg/public/runner_global_tasks.go`, `pkg/components/runner/superplane_mcp/`, and the bundled implementation graph. [R] FleetHarness should explicitly define each independent task, its acceptance contract and merge order.

## What isolation means here

[E] `pkg/runners/agent/docker_executor.go` pulls the configured image, creates a task-named container, mounts task files and the result file, executes commands, and defers container removal. The inspected `docker run` construction does not add a network-deny policy, CPU/memory limits or a read-only root filesystem. This is container separation, not proof of a hardened hostile-code sandbox.

[E] `pkg/runners/agent/host_executor.go` also runs commands directly on the runner host. Its optional reset creates a fresh task home and later removes it. `task_workdir.go` otherwise starts from the process user's home. A fresh home does not restrict that user's access elsewhere. Ephemeral runner lifetime is described in `pkg/runners/README.md`; the strength of the surrounding VM boundary depends on provisioning outside this executor.

[E] `pkg/components/runner/codex/run.js` invokes Codex with the flag that bypasses its approvals and sandbox. Planning adds instructions and tools but uses the same argument builder. [R] Place execution inside a disposable environment with deliberately limited credentials; do not point a host runner at the team's normal Mac account and assume the CLI will ask before consequential actions.

## Testing, repair and limits

[E] The implementation prompt requests relevant tests, lint and builds, and honest reporting. Its fixed Bash stages check Git state and required output files, not a universal acceptance-test command. A successful agent process and a PR artifact therefore do not independently establish functional correctness. Evidence: implementation YAML.

[E] CI verification is a stronger separate mechanism when meaningful checks are configured. `pr_feedback_checks_template.go` branches on actual selected check status and timeout. `pr_feedback_template.go` defines three repair attempts by default, configurable from one to ten. `pkg/components/factory/pull_request_activity_access.go` records an error when exclusive repair access reaches its limit. `continue_factory_pull_request_fixes.go` provides an explicit continuation path.

[E] Merge-confidence automation asks an agent to score enabled categories such as risk, security, drift, performance and reversibility. Those are reasoned assessments, not proof from a scanner or functional test. Evidence: `templates/github/risk-score.canvas.yaml` and `factory_app_templates.go` in the actions directory. [R] Keep confidence scores visually distinct from executable tests and human authorization.

[E] A critical configuration detail appears in `pkg/integrations/github/components/checks/wait_for_pull_request_checks_eval.go`: an empty selected-name list selects no checks. With no timeout, pending checks or failures among that empty set, the evaluator returns passed, even if other unselected checks exist. Named checks that are missing remain pending until timeout. This is a static reading of the evaluation helper, not a reproduced deployment bug. [R] Explicitly configure required check names and test the no-check and missing-check cases before claiming verification.

## Human approval, monitoring and shutdown

[E] `pkg/components/approval/approval.go` implements real workflow pauses with user, group or role requirements, authorization checks, approval/rejection records and output channels. All configured requirements must complete; a rejection produces the rejection result. The implementation YAML inspected does not insert this component before its push or PR creation.

[V] The current product overview describes final diff review and merge as a person's decision: https://docs.superplane.com/get-started/overview/. [E] The code offers a merge API and integration primitives, so this statement should not be treated as an unavoidable security barrier. Repository branch protections, allowed tokens and configured approval nodes must enforce the desired policy.

[E] Runs retain activity, results and logs; the runner uploads retained log chunks before completion acknowledgment. A cancellation message cancels the execution context. Controlled shutdown allows a running task to stop, upload logs and acknowledge completion, with a second signal or a 30-second timeout ending the runner immediately. Evidence: `pkg/runners/README.md`, `pkg/runners/agent/agent.go`, and `pkg/runners/logspool/`.

[R] For event use, approve requirements before dispatch and require human review before merging or deployment. Prohibit live operational writes, unrestricted credentials and unattended outward messages. Escalate failed checks, ambiguous requirements and exhausted repair attempts to the technical owner. Demonstrate task cancellation and runner shutdown with synthetic work.

## Repository instructions as data

[E] The inspected implementation template contains prompts directing its future coding agent to read repository instructions and skills. Those strings were analyzed as product behavior and were not followed during this research. No malicious instruction attempt was identified in the inspected material; the full repository was not audited for prompt injection.

## Sources

- [E] Pinned source tree: commit `7d755d16b8ae836ecebf61639efc6266d74a4b0b`, paths identified above.
- [V] Public code baseline: https://github.com/superplanehq/superplane/tree/7d755d16b8ae836ecebf61639efc6266d74a4b0b
- [V] Product overview: https://docs.superplane.com/get-started/overview/
- [V] Agent tool interface: https://docs.superplane.com/integrations/agent-tools/
