---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Implementation supports the factory concept, while operational performance, offline readiness and license scope need qualification."
---

# Claims versus evidence

## Bottom line

[E] The factory is implemented in code, including Git changes, PR creation, configured checks and bounded repairs. [E] A substantial test suite is present, but no tests or workflows were executed in this research. [V] Version 1.0.0 was released on October 27, 2026: https://github.com/superplanehq/superplane/releases/tag/v1.0.0. [R] Treat maturity as active development with a recent stable milestone, not independently established reliability or Fleet readiness.

## Evidence boundary

[E] Code observations refer to the supplied clone at `7d755d16b8ae836ecebf61639efc6266d74a4b0b`. `git rev-parse HEAD` confirmed the full hash. `git log` showed a November 4, 2026 change fixing task ownership on start. Source inspection was read-only; repository instructions and embedded prompts were treated as data.

[P] Local `README.md` positions the project as a factory that evaluates backlog work, coordinates coding agents and returns verified changes for review. [R] The table distinguishes those claims from mechanisms actually inspected.

| Claim or implication | Evidence | Assessment |
| --- | --- | --- |
| Ticket to PR | [E] Implementation YAML invokes an agent, commits/pushes, constructs result JSON and creates or updates a GitHub PR. | [R] Substantive support in code. Runtime success remains unverified. |
| Automatic readiness and planning | [E] Intake, refinement, planning-session and task-check code exist. Scheduled intake validates structured proposals. Evidence: `intake_agent.go`, `planning_session_assets.go`, `analysis_protocol.js` and scheduled intake YAML. | [R] Useful preparation machinery. It does not establish calibrated confidence scores or correct naval requirements. |
| Verified results | [E] Implementation testing guidance is a prompt. Independent CI status observation is implemented separately in `pr_feedback_checks_template.go`. Merge-confidence scores are agent assessments in risk-score YAML. | [R] Trust named test executions and captured results. Do not treat a score or agent exit code as acceptance. |
| Failed checks are repaired | [E] `pr_feedback_checks_template.go` routes failed checks to repair. `pr_feedback_template.go` defaults repairs to three attempts, allows one to ten, and provides a pause path. | [R] A concrete bounded feedback loop exists. It still depends on informative checks and an effective coding agent. |
| Agents are isolated | [E] Both Docker and direct host executors exist. Optional host home reset removes leftovers; Codex's normal wrapper bypasses its internal sandbox and approvals. | [R] Isolation is deployment-dependent. No penetration test or adversarial isolation validation was performed. |
| Humans retain authority | [E] `approval.go` checks authorized users/groups/roles, records decisions and pauses execution. The default implementation graph pushes and creates a PR without such a pause. | [R] Real approval capability, but configure it at the desired action boundary and enforce source-control policy. |
| Choose your model | [E] Dedicated Claude/Codex paths, OpenRouter/OpenCode and custom-provider plumbing exist. Cursor remote agents are a distinct integration. | [R] Broad routes, with adapter and account differences. No evidence that every event entitlement is interchangeable. |
| Self-hosting means offline | [E] Server state can be local, but standard GitHub/model calls and runner image pulls remain external. | [R] Unsupported implication. A disconnected build system requires additional engineering. |
| Apache 2.0 | [E] Root `LICENSE` and `NOTICE` identify Apache 2.0 and explicitly exclude `ee/`; that subtree has a restrictive license. | [R] Accurate for the community core, incomplete for the whole repository. |
| Large integration catalog means seven-step coverage | [E] Integrations and workflow primitives exist, but bundled factory steps focus on existing engineering tasks. | [R] Connecting services does not create domain acceptance criteria, a deployment package or a naval user experience. |

[E] A concrete verification edge case: `pkg/integrations/github/components/checks/wait_for_pull_request_checks_eval.go` selects no checks when selected names are empty and can return passed for that empty set before timeout. Missing explicitly named checks stay pending. [R] Verify required-check configuration and fail closed on absent evidence; the presence of a green workflow alone is insufficient.

## Tests present and what they establish

[E] A file inventory using `rg --files` counted 1,591 paths ending in `_test.go`. This is a count of test files, not test cases, passing checks or coverage. Examples directly relevant to this decision include:

- [E] `pkg/components/runner/codex/run_test.go` and `run_linux_test.go`: API-key argument/environment handling, sandbox-bypass argument behavior and process cancellation tests.
- [E] `pkg/runners/agent/docker_executor_test.go`, `host_executor_test.go`, `execution_timeout_test.go`, and `task_workdir_test.go`: execution and workspace behavior.
- [E] `pkg/grpc/actions/factories/pr_feedback_checks_template_test.go`, `pr_feedback_graph_test.go` and `continue_factory_pull_request_fixes_test.go`: generated feedback graphs and continuation behavior.
- [E] `pkg/components/approval/approval_test.go` and `test/e2e/approvals_test.go`: approval component and UI workflow tests.
- [E] `test/e2e/factories_test.go`, `test/e2e/runners/`, and `pkg/mcpserver/*_test.go`: factory, runner and agent-tool surfaces.

[E] `.semaphore/semaphore.yml` defines lint, sharded backend unit and E2E tests, release/image/sharding checks, frontend tests, security and license jobs. `web_src/package.json` uses Bun for its test scripts and contains browser/testing dependencies. [R] These are meaningful maturity signals, but neither current CI results nor test effectiveness were verified.

## Activity and unresolved issues, checked November 4

[V] The live issue index showed roughly 150 open issues, with November 2 and 3 entries, and the repository organization page showed an update on November 4. Counts varied across cached pages and should not be used as a reliability metric. Sources: https://github.com/superplanehq/superplane/issues and https://github.com/superplanehq.

[V] Issue 9186 was open when read. It reports that factory feedback/check-repair commits can omit required DCO sign-offs and block a PR. The report includes a Codex subscription run and explains a Git-wrapper bypass mechanism. This is an issue reporter's finding, not a reproduced failure here: https://github.com/superplanehq/superplane/issues/9186.

[V] The issue index also listed permission-cache invalidation (9126), client-supplied account-header forwarding (9125), external calls inside database transactions (9116), event durability and UI/worker performance concerns. Individual pages for 9125, 9126 and 9116 failed to load through the research browser, so their bodies, present status and exploitability were not verified. Do not treat their titles as proven vulnerabilities. Source: https://github.com/superplanehq/superplane/issues.

[V] Search initially returned a stale release listing centered on July's v0.30.0. The direct release page establishes the later October 27 v1.0.0 release at source commit `31a05b6`, distinct from the November 4 research checkout: https://github.com/superplanehq/superplane/releases/tag/v1.0.0. [R] Pin application, runner and Fleet Manager versions together when testing; do not assume current-main observations all apply to that release artifact.

## Independent coverage and its limits

[V] Hacker News launch discussion mainly contains the founders' introduction and a question about future integrations. It is useful historical evidence for the DevOps-control-plane origin, not independent evaluation of today's coding factory: https://news.ycombinator.com/item?id=46793814.

[V] New Runtime's November 2 report describes the launch and explicitly notes that the vendor's reported internal automation share lacks independent validation or a human-effort baseline. It does not supply a controlled performance test: https://newruntime.com/posts/superplane-1-0-launches-as-an-open-source-14c409/.

[V] VibeTested's search-indexed listing said its hands-on test was still pending. Direct retrieval failed, so pricing and claims there were not independently confirmed: https://www.vibetested.app/tools/superplane/.

[V] A public comparative note flags the separate enterprise license and young product surface, but identifies itself as generated research rather than a hands-on trial. Its older release cautions are partly superseded by v1.0.0. It cannot validate completion rate or security: https://2fblog.tomrochette.com/agents/software-factory/superplane/.

[R] No credible hands-on independent benchmark was verified for task completion, cost per accepted PR, human review burden, naval use cases, Mac setup or DDIL operation. Search effort covered official docs, GitHub issues/releases, Hacker News, independent launch coverage and review listings. Do not translate social popularity into deployment confidence.

## License and event obligations

[E] `LICENSE` contains Apache License 2.0; `NOTICE` explicitly excludes `ee/`. `ee/LICENSE` requires agreement with vendor terms and a valid enterprise license for self-hosted use, while describing a development/testing exception and vendor ownership of modifications to that material. It also limits distribution. [R] Do not borrow enterprise code for a government deliverable without resolving rights first.

[V] Apache 2.0 grants reuse and modification rights, with conditions including supplying the license, retaining applicable notices, marking modified files and carrying required NOTICE content. It includes a patent grant with conditions and does not grant trademark rights. It does not require publishing all application source: https://www.apache.org/licenses/LICENSE-2.0.

[V] The official hosting overview says its Kubernetes cloud installation requires an Enterprise license; the single-VM guide offers Community selection. That is an edition/deployment restriction to check before choosing the cloud path: https://docs.superplane.com/self-hosting/overview/ and https://docs.superplane.com/self-hosting/single-vm/.

| Event provision | Consequence for this project |
| --- | --- |
| Rule 5 | [P] Disclose tools, models, datasets and external services under [[Event/Rules]]. [R] If adopted, list the pinned community engine, runner/CLI, model/provider, GitHub, CI, registry and hosting. A license does not itself authorize a data transfer or event account. |
| Rule 7 | [P] Separate prior work from event contributions under [[Event/Rules]]. [R] Record the entire upstream engine and existing templates as prior work. Attribute only new FleetHarness specifications, integration changes and validated demonstrations to event work. |
| Terms 5 | [P] [[Event/Terms]] says identify pre-existing material and respect its licenses; participation does not transfer upstream ownership. [R] Preserve Apache notices and record the exact baseline. |
| Terms 6 | [P] The local summary says government participants need approvals and new work carries government unlimited rights, with pre-existing work identified separately. [R] Keep upstream and event-created files distinguishable; do not promise ownership of upstream or enterprise material. Participant status is not confirmed here. |
| Terms 7 | [P] For non-government participants, the summary describes employer authorization and broad government rights for new work, with separately identified proprietary restrictions. [R] Document ownership and exclusions in the submission. |
| Terms 8 | [P] Each tool keeps its own license; event access creates no lasting rights. [R] Recheck ongoing model/hosting access and enterprise restrictions before a transition proposal. |

[E] Legal conclusions here use the requested event summary and published license texts; the underlying signed event PDF was not independently inspected. [R] Confirm the applicable participant category and rights record with the team before submitting. This is a concrete rights-identification task, not a reason to delay reading or borrowing unencumbered design ideas.

## Sources

- [E] Pinned clone, commit `7d755d16b8ae836ecebf61639efc6266d74a4b0b`, paths named above.
- [V] https://github.com/superplanehq/superplane/tree/7d755d16b8ae836ecebf61639efc6266d74a4b0b
- [V] https://github.com/superplanehq/superplane/issues
- [V] https://github.com/superplanehq/superplane/issues/9186
- [V] https://github.com/superplanehq/superplane/releases/tag/v1.0.0
- [V] https://github.com/superplanehq
- [V] https://www.apache.org/licenses/LICENSE-2.0
- [V] https://docs.superplane.com/self-hosting/overview/
- [V] https://docs.superplane.com/self-hosting/single-vm/
- [V] https://news.ycombinator.com/item?id=46793814
- [V] https://newruntime.com/posts/superplane-1-0-launches-as-an-open-source-14c409/
- [V] https://www.vibetested.app/tools/superplane/
- [V] https://2fblog.tomrochette.com/agents/software-factory/superplane/
- [P] Local event summaries: [[Event/Rules]], [[Event/Terms]], [[Event/Judging]].
