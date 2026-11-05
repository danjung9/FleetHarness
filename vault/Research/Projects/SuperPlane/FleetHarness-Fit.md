---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Seven-step mapping and a decisive borrow recommendation for the remaining 27-hour sprint."
---

# FleetHarness fit

## Bottom line

[R] **Borrow SuperPlane's task and verification design; defer installing the full platform.** [E] Its strongest fit is coordinating code changes, checks, repairs and review in an existing repository. [P] FleetHarness also needs use-case interpretation, reusable-solution research, acceptance criteria and a runnable demonstration, according to its README. [R] Prove those missing parts on one representative problem before investing in factory infrastructure.

## Mapping to all seven FleetHarness steps

[P] Step names and required outcomes below come from `~/Documents/CDAO/FleetHarness/README.md`. [E] Code paths refer to the supplied SuperPlane clone at `7d755d16b8ae836ecebf61639efc6266d74a4b0b`. [R] Fit ratings assess what the inspected implementation supplies, not what could eventually be scripted.

| FleetHarness step | SuperPlane support | Gap and decision |
| --- | --- | --- |
| 1. Ingest a use case | [E] Issue/tracker intake creates durable work orders with description, source and attachments. `pkg/grpc/actions/factories/import_factory_intake_item.go`; `templates/github/issue-intake.canvas.yaml` in that directory. | [R] Partial fit. Add a naval-user intake form capturing user, present burden, input/output examples, constraints, permitted actions and measurable success. Importing prose does not validate requirements. |
| 2. Research existing solutions | [E] General runner Bash/Python/JavaScript actions and agents can perform configured work; integrations can fetch external context. `pkg/components/runner/run_bash.go`, `run_python.go`, `run_javascript.go`. | [R] Weak default fit. No dedicated reusable-solution scouting and evidence-quality stage was found in the inspected factory templates. Build a short public-source research artifact with license and reuse decisions. |
| 3. Plan the implementation | [E] Refinement/planning sessions, task spec context, configurable prompts, checks and draft-task tools exist. `planning_session_assets.go`, `analysis_protocol.js`, `intake_agent.go`, implementation YAML. | [R] Partial fit. Require a human-approved specification and executable acceptance tests. Agent confidence is advice, not requirements sign-off. |
| 4. Build the application | [E] Strong implementation machinery: clone, agent, branch, commit/push, PR and artifacts; dedicated Codex runner and other harnesses. `line-implementation.canvas.yaml`; `workspace_agent_resources.go`; `pkg/components/runner/codex/`. | [R] Strong fit once a repository and infrastructure exist. FleetHarness still defines environment isolation, repository permissions, allowed dependencies and application architecture. |
| 5. Test and repair | [E] Selected CI checks can fail into bounded repair, while review feedback launches follow-up work. `pr_feedback_checks_template.go`, `pr_feedback_template.go`, `pull_request_activity_access.go`. | [R] Strong coordination fit, partial quality coverage. Supply meaningful domain tests and independent results. Test feasible and infeasible schedules, malformed messages, and offline synchronization conflicts. |
| 6. Package and demonstrate | [E] Branch/PR artifacts, logs and visual-evidence automation exist. `pkg/components/factory/add_work_order_artifact.go`; `templates/github/visual-evidence.canvas.yaml`. | [R] Partial fit. A PR or screenshot is not a runnable package. Add setup instructions, fixture data, a reproducible launch command, test results, known limits and a demonstrated application. |
| 7. Reuse what works | [E] Reusable workflow templates, integrations, tools, skills and context repositories exist. `factory_app_templates.go`; `workspace_agent_resources.go`. | [R] Partial fit. This reuses development process. FleetHarness still needs a proven-component catalog with interfaces, licenses, test evidence and explicit applicability to later use cases. |

## Why borrow with 27 hours left

[P] The brief confirms event-key Codex access and leaves Google, Cursor, Grok and Ark access unconfirmed. [E] SuperPlane's native Codex route means model incompatibility is not the main objection. The installation adds database, broker, storage, application, repository integration, runners and credentials before domain work starts. Evidence: release Compose template and runner code.

[A] The 4 to 8 hour self-hosted first-run estimate consumes about 15% to 30% of a 27-hour window, before developing a novel use-case application. [R] That is a poor deadline trade unless the installation is already working or someone can prove the full loop quickly.

[P] [[Event/Judging]] weights impact at 30%, Speed to Fleet at 20%, scalability at 20%, barrier removal at 15% and execution/user experience at 15%. [R] Demonstrating saved effort and a usable disconnected application will support this scoring better than showing an unvalidated factory board. [A] A factory could eventually improve scalability, but the event needs evidence of its benefit, not a count of generated repositories.

## Borrow these concrete ideas

| Idea | Minimal FleetHarness expression |
| --- | --- |
| Durable task record | [R] One record containing use-case source, approved spec, owner, acceptance commands, current status, branch, test artifacts, failures and decision. |
| Explicit states | [R] Separate specified, generated, runnable, tested, reviewed and packaged. Permit transitions only when the corresponding evidence exists. |
| Isolated implementation | [R] One disposable checkout/container per task, only synthetic/public data, and least-privilege credentials. Verify the boundary instead of equating a directory with a sandbox. |
| Independent verification | [R] Run fixed acceptance commands outside the coding conversation. Retain exit codes, logs and fixture versions. Have a person review changes to acceptance tests. |
| Bounded repair | [R] Return exact failures to the agent for at most three attempts, then stop and escalate. Never respond to a failure by silently weakening the test. |
| Final authority | [R] Require human approval for requirements, material scope changes, external actions, merge/deploy and readiness claims. Provide a visible stop action. |
| Reuse record | [R] Store each borrowed component's origin, commit, license, interfaces and test evidence. Keep event-created work separately identifiable. |

## A concrete 27-hour allocation

[A] The following is a proposed allocation, not an observed team schedule. [R] Keep orchestration lightweight and use the already confirmed tool unless the reversal proof passes.

| Time | Outcome |
| --- | --- |
| Hours 0 to 2 | [R] Select one narrow synthetic use case with a domain reviewer. Approve input/output examples, measurable acceptance criteria and prohibited actions. |
| Hours 2 to 6 | [R] Create executable fixtures/tests and a runnable skeleton. Confirm one clean setup on another machine or disposable environment. |
| Hours 6 to 15 | [R] Implement with an isolated coding environment; run independent checks and bounded repairs. Record actual failures and time spent. |
| Hours 15 to 21 | [R] Demonstrate the user flow and disconnection behavior appropriate to that application. Harden the failure path and collect reproducible evidence. |
| Hours 21 to 25 | [R] Package setup, demo data, tests, limitations, human controls and required disclosures. Produce the submission around measured benefit. |
| Hours 25 to 27 | [R] Rehearse the exact demo and preserve deadline buffer. Add another use case only if it uses proven components and does not threaten the first. |

## What changes the verdict

[R] Switch to **use it** if an authorized, already available instance completes a two-hour proof: same event model, synthetic repo, bounded task, actual failing acceptance test, repaired passing test, visible logs/artifacts, human merge boundary and demonstrated cancellation. Require a technical owner to operate it without taking the domain team away from the demo.

[R] Keep **borrow from it** if that proof reveals useful patterns but significant setup or policy work. Switch to **skip it entirely for this event** if using it requires enterprise code rights, unapproved infrastructure, credential sharing, uncertain event access or an adapter project. Reassess after the event with a measured multi-task trial rather than a feature comparison.

## Required human controls

[P] Rule 6 requires approval points, prohibited actions, monitoring, escalation and shutdown in [[Event/Rules]]. [R] Give the domain reviewer approval of requirements and claims, and the technical owner control over execution, secrets, test changes and deployment. Keep all inputs public or synthetic. Pause when authority or data classification is uncertain. Record attempts and failed checks, then stop the runner on cancellation or exhausted retries.

[P] Rules 5, 7 and 10 require disclosure of tools/services, separation of prior work and documentation of friction. [R] The local disclosure handoff in [[Research/Projects/SuperPlane/README]] captures this research; any later adoption must add the actual model, hosting, CI, credential boundaries and reused source baseline.

## Sources

- [P] FleetHarness seven-step requirements: `~/Documents/CDAO/FleetHarness/README.md`.
- [P] [[Research/00-Brief]], [[Event/Rules]], [[Event/Judging]], [[Event/Terms]].
- [E] Supplied SuperPlane clone, commit `7d755d16b8ae836ecebf61639efc6266d74a4b0b`, paths named above.
- [V] https://github.com/superplanehq/superplane/tree/7d755d16b8ae836ecebf61639efc6266d74a4b0b
- [V] https://docs.superplane.com/get-started/overview/
- [V] https://docs.superplane.com/self-hosting/single-vm/
