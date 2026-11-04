---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Symphony fits the build-worker layer, while FleetHarness still needs intake, acceptance evidence, human gates and packaging."
---

# FleetHarness fit

## Bottom line

[R] Borrow the issue-to-workspace execution pattern and evidence trail, while keeping this sprint's implementation simpler than the full Symphony daemon. [E] The strongest fit is FleetHarness step 4, with partial support for repeated execution in step 5. [P] FleetHarness also requires requirements, research, executable acceptance tests, packaging and reuse, as stated in `~/Documents/CDAO/FleetHarness/README.md`. [R] Spend the remaining time proving one officer-relevant workflow works and showing exactly where a person approves it.

## Mapping to all seven pipeline steps

[E] Evidence refers to the Symphony clone at commit `be10a1b79df723d6d7612b5651c8522704dafb2e`. [P] Step names below come from the FleetHarness README.

| FleetHarness step | What Symphony supplies | What FleetHarness must add | Fit |
| --- | --- | --- | --- |
| 1. Ingest a use case | [E] Reads normalized tracker title, description, labels, state, priority and blockers. `tracker.ex`, `tracker/issue.ex`, `prompt_builder.ex`. | [R] Officer-facing intake for user, problem, current burden, approved data, constraints, success criteria and human signoff. No parser for the event use-case catalog was identified. | [R] Partial transport only. |
| 2. Research existing solutions | [E] A ticket can ask an agent to investigate; the runtime treats it like any other ticket. `agent_runner.ex`. | [R] Source discovery, verified licenses, evidence labels, dependency decisions and a reviewable research artifact. | [R] No dedicated research stage. |
| 3. Plan the implementation | [E] Sample prompt asks the agent to create a hierarchical plan and acceptance checklist in a persistent issue comment. `elixir/WORKFLOW.md`. | [R] Approved specification, system design, explicit task decomposition and executable acceptance fixtures before implementation. Prompted checkboxes are insufficient. | [R] Partial, agent-mediated. |
| 4. Build the application | [E] Dispatches one worker per issue in its own directory with Codex, hooks, capacity limits and optional SSH. `orchestrator.ex`, `workspace.ex`, `codex/app_server.ex`. | [R] Safe runtime boundaries, app-specific dependencies and templates, bounded budgets, and controlled integration authority. | [R] Strongest fit, with hardening. |
| 5. Test and repair | [E] Prompt asks for tests/CI repair; runtime retries crashes and stalls and continues active tickets. `WORKFLOW.md`, `agent_runner.ex`, `orchestrator.ex`. | [R] Independent acceptance runner with captured commands, inputs, expected/actual outputs and failure status. Fix protocol completion handling and bound total retries. | [R] Partial, not an independent verifier. |
| 6. Package and demonstrate | [E] Sample workflow can request validation media and PR handoff. Burrito packages Symphony itself, not each generated app. `WORKFLOW.md`, `mix.exs`. | [R] App install/run command, deterministic demo, test evidence, known limitations, offline proof and explicit release approval. | [R] Mostly external. |
| 7. Reuse what works | [E] Workflow prompts/hooks can be versioned and copied; repositories persist reusable code. No component registry or promotion test was identified in the inspected implementation. | [R] Promote components only after repeatable validation; record API, provenance, license, versions and applicable use cases. | [R] Pattern reuse, no managed library. |

## What to borrow now

1. [R] A versioned work contract containing the task, acceptance fixtures, allowed actions, prohibited actions, deadline and required artifacts. Keep human approval policy outside editable task prose.
2. [R] One disposable working directory per build attempt, with its input revision recorded. Preserve the final artifact and evidence before cleanup.
3. [R] Explicit states such as approved specification, building, acceptance failed, ready for human review and accepted. Only a person can authorize publishing or declare operational readiness.
4. [R] A work record with attempted tests, observed failures, repair attempts, commit or content hash, and known limitations. Separate generated, runnable, tested and operationally validated status.
5. [R] A narrow worker limit plus a hard elapsed-time and retry budget. Start with one worker for the demo; concurrency is not the outcome judges need to see.

## A decisive sprint path

[P] FleetHarness names three deliberately different initial challenges: message parsing, schedule deconfliction and an offline-first workflow. [R] Choose one for a complete visible demonstration before expanding the pipeline. For message parsing, show a synthetic input, extracted tasks with source references, a malformed-input case and an independently checked expected output. For scheduling, show a feasible case and an infeasible case. For offline work, disconnect the app and prove restart/synchronization behavior without a model call.

[R] Build through the confirmed event-key Codex path, with a human reviewing requirements and acceptance fixtures first. Keep generated application behavior local when that suits the chosen problem. Make tests and the evidence view the center of the demonstration. [R] A technical owner should own the worker and test runner; a mission owner should approve the problem and the practical success measure. The actual people filling these roles were not established by this review.

[R] Change the Symphony decision only after a short proof shows correct completion-status handling, bounded repair, preserved evidence, restricted tracker writes, a human-only publishing decision and full worker shutdown. Otherwise continue borrowing concepts without adopting its dependencies. [A] A two-hour decision window leaves most of the roughly 27-hour sprint available for the use-case application.

## Human authority required for this team

[P] Event rule 6 requires approval points, prohibited actions, monitoring, escalation and shutdown, summarized in [[Event/Rules]]. [E] Symphony's sample offers a prompt-defined review handoff and runtime visibility, but no independent human identity check on the merge state (`WORKFLOW.md`, tracker tools, `orchestrator.ex`).

| Control | [R] FleetHarness implementation requirement |
| --- | --- |
| Approval points | Person approves requirements and allowed data; person reviews test evidence; person authorizes any push, deployment or publication. |
| Prohibited actions | No real operational action, restricted data, credential entry, unapproved external writes or autonomous readiness claims. |
| Monitoring | Show task state, workspace identity, tests attempted, failures, time/spend and worker/process status. |
| Escalation | Pause on missing authority, ambiguous acceptance criteria or exhausted repair budget; show the specific human action needed. |
| Shutdown | Stop dispatch, terminate worker processes, verify descendants are gone and revoke outside-service authority if needed. A cleared dashboard row is insufficient evidence. |

## License and event terms

[E] `LICENSE` is Apache License 2.0 and `NOTICE` identifies upstream copyright. [V] Apache-2.0 permits use, modification and redistribution subject to its conditions, including preserving license/notices and marking modified files when distributing. It provides limited patent rights and no general trademark permission or warranty: https://www.apache.org/licenses/LICENSE-2.0. [R] Keep an upstream dependency record separate from the team's new work; retain required notices if any code is copied or distributed.

| Rule or term | Event requirement [P] | Application to Symphony [R] |
| --- | --- | --- |
| Rule 5 | Authorized resources may be used; disclose tools, models, datasets and external services. | List Symphony and commit, Codex and actual model, tracker, hosting, source repository, CI and any synthetic dataset. Open-source availability does not itself approve an account, endpoint or data transfer. |
| Rule 7 | Distinguish prior work from work done at the event. | Record the existing repository, workflow and any borrowed code before implementation. Claim only the team's new adaptation, tests and demonstrated use-case results. |
| Terms section 5 | Respect third-party IP/licenses and identify pre-existing material; participation does not transfer its ownership. | Preserve Apache provenance and license terms. Do not present the upstream orchestrator as newly built by the team. |
| Terms section 6 | Government participants need applicable approvals; new work has government unlimited-rights treatment, with prior material separately identified. | Identify borrowed Symphony separately from new code, tests and documents. Confirm participant status and agency authority with the responsible person. |
| Terms section 7 | Non-government participants need relevant authorization and grant a broad government-purpose license for new work, with identified exclusions. | Record ownership and third-party restrictions in the submission. Do not promise rights to upstream dependencies beyond their licenses. |
| Terms section 8 | Each tool keeps its own license; event access does not create lasting rights. | Apache source rights do not supply enduring model credits, tracker subscriptions, VM access or API entitlements. Document a post-event account and hosting plan. |

[P] The event interpretation above follows [[Event/Rules]] and the v1.1 summary in [[Event/Terms]]. [E] The signed terms, full PDF and live portal were not independently rechecked for this seat. [R] Confirm any ownership or participant-status question before submission; do not infer it from the software license. [E] Dependency and model-weight licenses were not audited, so the Apache label is not a complete bill of materials review.

## Fit to judging and transition

| Criterion | Weight [P] | [R] Evidence this seat recommends |
| --- | --- | --- |
| Warfighting and deckplate impact | 30% | Show burden removed for a named user through a real synthetic workflow; ticket throughput alone is not mission value. |
| Speed to Fleet | 20% | Demonstrate the application offline. Explain clearly that connected development services are separate from deployed runtime needs. |
| Fleet scalability | 20% | Reuse the acceptance process on a second distinct problem only after the first is proven. |
| Barrier removal | 15% | Record actual account, policy, data and compatibility barriers with specific next actions. |
| Judges' discretion | 15% | Provide a simple officer-facing interaction and reproducible evidence instead of an engineering dashboard as the main experience. |

[P] Weights come from [[Event/Judging]]. [R] For a 30-day follow-up, validate the chosen workflow with a mission owner and improve acceptance fixtures. At 60 days, evaluate a hardened worker supervisor and disconnected deployment under approved conditions. At 90 days, assess reuse across another domain and assign sustainment ownership. [A] Resources would include a technical owner, mission-owner review time, an approved test environment and authorized inference/hosting access; their availability is not verified.

## Sources

- [P] Local FleetHarness requirements: `~/Documents/CDAO/FleetHarness/README.md`.
- [P] Event constraints: [[Event/Rules]], [[Event/Judging]], [[Event/Terms]].
- [V] Pinned Symphony implementation: https://github.com/openai/symphony/tree/be10a1b79df723d6d7612b5651c8522704dafb2e
- [V] License: https://github.com/openai/symphony/blob/be10a1b79df723d6d7612b5651c8522704dafb2e/LICENSE
- [V] Apache license text: https://www.apache.org/licenses/LICENSE-2.0
- [V] Protocol failure report: https://github.com/openai/symphony/discussions/133
- [V] Shutdown report: https://github.com/openai/symphony/discussions/126
