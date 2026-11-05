---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Symphony has substantive orchestration code and tests, but preview status and current protocol reports limit confidence."
---

# Claims versus evidence

## Bottom line

[E] Symphony contains a real scheduler, workspace manager, protocol client and test suite. [P] Its README calls it an engineering preview for trusted environments. [V] The project's April explanation says it is a reference implementation rather than a standalone product it plans to maintain: https://openai.com/index/open-source-codex-orchestration-symphony/. [R] Give it credit for concrete orchestration mechanics, while requiring separate proof of software correctness, human authority and current runtime compatibility.

## Claim audit

[E] Code observations below come from static reading at commit `be10a1b79df723d6d7612b5651c8522704dafb2e`. No tests were run.

| Claim or impression | What the evidence supports | Implication |
| --- | --- | --- |
| [P] Turns project work into autonomous implementation runs, root `README.md`. | [E] Implemented polling, claims, concurrency, per-issue tasks, workspace reuse and continuation (`orchestrator.ex`, `agent_runner.ex`). | [R] Useful execution infrastructure once issues and repositories are ready. |
| [P] Demo agents supply CI, feedback, analysis and videos, root `README.md`. | [E] `WORKFLOW.md` asks agents to collect validation and media. The runner does not automatically generate those artifacts or certify them. | [R] Require concrete files and independently reproduced results for each demo claim. |
| [P] Runs are isolated, root `README.md`. | [E] Separate directories with path checks and Codex sandbox settings; optional SSH. No automatic per-ticket container (`workspace.ex`, `codex/app_server.ex`). | [R] Say directory and configured sandbox isolation, not guaranteed security containment. |
| [V] Board dependencies allow parallel staged work, project explanation. | [E] Adapter routing recognizes blockers, but no built-in planner creates a decomposition or validates a whole DAG. | [R] Supply the tasks and dependency policy upstream. Source: https://openai.com/index/open-source-codex-orchestration-symphony/. |
| [P] Results are accepted before safe landing, demo description. | [E] Prompt defines `Human Review` to `Merging`; broad tracker tools do not authenticate the transition as human. | [R] Enforce approval using permissions and external checks. |
| [P] Safer omitted-policy defaults, `elixir/README.md`. | [E] Config defaults reject approval categories and use workspace-write. The shipped sample instead selects `never` and network access. | [R] Audit effective workflow settings, not just documentation defaults. |
| [P] Failure recovery keeps work moving, implementation README. | [E] Backoff, stall detection and workspace reuse exist. Every `turn/completed` currently returns success regardless of embedded status. | [R] Protocol conformance is a prerequisite to trusting recovery. |
| [V] Large internal PR-throughput gains, project explanation. | [E] No inspected artifact establishes comparable FleetHarness results, mission correctness or saved watchstander time. | [R] Do not use vendor productivity figures as this team's evidence. Source: https://openai.com/index/open-source-codex-orchestration-symphony/. |

## Maturity and activity as of November 4, 2026

[E] Local HEAD is `be10a1b`, dated September 15, 2026, and `mix.exs` identifies version `0.0.3`. The clone's visible log contains only one commit. [V] The releases page lists v0.0.1 in July, v0.0.2 on July 24, v0.0.3 on September 15 and a September 15 nightly at `be10a1b`: https://github.com/openai/symphony/releases. [R] This is evidence of iterative releases through September, not proof of an ongoing support commitment.

[V] The public Issues page displayed zero open issues and no results during this review: https://github.com/openai/symphony/issues. [V] The repository UI restricts PR creation to collaborators, and user reports remain in Discussions: https://github.com/openai/symphony/discussions. [R] Zero listed issues should not be interpreted as zero defects or an open community maintenance process.

## Important current reports

| Report, date | Evidence and limitation | Decision relevance |
| --- | --- | --- |
| Failed completion status, October 16 | [V] Discussion 133 reports repeated rejected model turns, tracker rate limiting and a proposed fork fix against `be10a1b`: https://github.com/openai/symphony/discussions/133. [E] The unconditional `turn/completed` success branch is present in `codex/app_server.ex`. | [R] Highest priority compatibility fix. Static corroboration is strong; runtime impact was not reproduced here. |
| Default approval object rejected, October 26 | [V] Discussion 134 reports `thread/start` failures with Codex 0.164.0 and 0.165.0-alpha.1 when Symphony supplies its default policy: https://github.com/openai/symphony/discussions/134. | [R] Pin and test the exact CLI. The report says an `on-request` workaround changes safety semantics; do not silently replace policy. |
| Cancellation can leave child alive, September 15 | [V] Discussion 126 describes a synthetic hung process surviving cancellation and a fork fix, based on v0.0.2: https://github.com/openai/symphony/discussions/126. | [R] Verify process shutdown on the selected commit and platform. This report is not proof that every cancellation on HEAD fails. |
| Missing current rate-limit telemetry, October 6 | [V] Discussion 131 reports camelCase snapshots not recognized at this exact commit with Codex 0.160.0: https://github.com/openai/symphony/discussions/131. | [R] Do not depend on dashboard quota visibility as a spending control. |

## What tests are actually present

[E] `elixir/test/symphony_elixir/` includes core scheduling, config/workspace, fake app-server, tracker adapters, SSH, dynamic tools, status snapshots, observability and logging tests. Sampled tests explicitly cover workspace reuse, symlink/path behavior, state refresh, stalled workers, input-required blocking and token accounting (`workspace_and_config_test.exs`, `orchestrator_status_test.exs`, `app_server_test.exs`, `github_adapter_test.exs`, `ssh_test.exs`).

[E] `.github/workflows/make-all.yml` runs `make all` on Ubuntu pushes/PRs. The Makefile performs dependency setup, build, formatting, strict lint, coverage and Dialyzer. `mix.exs` sets a 100% coverage threshold but excludes much of the core runtime, including orchestrator, agent runner, app-server, workspace, CLI and tracker clients. [R] That threshold must not be presented as 100% coverage of the actual orchestration system.

[E] Real Linear/Codex E2E tests are opt-in with `SYMPHONY_RUN_LIVE_E2E=1`. They include local and SSH worker scenarios, creating temporary tracker resources and verifying a result file, issue comment and closure (`live_e2e_test.exs`, `elixir/README.md`). Docker workers are used for SSH if hosts are not supplied. Provider-specific live tests are also listed. [R] A successful plumbing test would still not prove FleetHarness acceptance criteria, but it is the minimum useful integration proof.

[E] A short README launch example omits the mandatory acknowledgment flag enforced in `cli.ex`. [R] Include that mismatch in setup estimates. [E] No local test count, pass rate, latest CI result, security audit or throughput benchmark was independently verified.

## Independent experience and its limits

[V] A May 1 hands-on account reports one rate-limiting ticket producing a draft PR in eleven minutes, followed by human correction of a test. The author says well-scoped work benefited while ambiguous tickets fared worse; the page also markets consulting services. This is a self-reported small sample without a reproduced public experiment: https://www.mejba.me/blog/openai-symphony-agent-orchestrator-harness. [R] Use it to generate evaluation questions, not a performance guarantee.

[V] A May 18 Laracasts instructor describes building a different orchestrator after finding the single-workflow design and lack of Claude support limiting. Only the public page and transcript excerpt were inspected: https://laracasts.com/series/the-ralph-wiggum-technique/episodes/16. [R] This is useful firsthand design feedback, not a benchmark of the September code.

[R] Current bug reports with payloads and pinned source are stronger evidence for integration decisions than general launch coverage. No independent naval-user evaluation, air-gap test, controlled productivity study or production support commitment was verified.

## Sources

- [V] Pinned code: https://github.com/openai/symphony/tree/be10a1b79df723d6d7612b5651c8522704dafb2e
- [V] Project explanation: https://openai.com/index/open-source-codex-orchestration-symphony/
- [V] Releases: https://github.com/openai/symphony/releases
- [V] Issues: https://github.com/openai/symphony/issues
- [V] Discussions: https://github.com/openai/symphony/discussions
- [V] Failed turns: https://github.com/openai/symphony/discussions/133
- [V] Approval schema: https://github.com/openai/symphony/discussions/134
- [V] Cancellation: https://github.com/openai/symphony/discussions/126
- [V] Rate-limit telemetry: https://github.com/openai/symphony/discussions/131
- [V] Firsthand review: https://www.mejba.me/blog/openai-symphony-agent-orchestrator-harness
- [V] Instructor experience: https://laracasts.com/series/the-ralph-wiggum-technique/episodes/16
