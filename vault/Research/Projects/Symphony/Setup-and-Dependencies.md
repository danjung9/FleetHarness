---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Symphony needs Codex App Server, a tracker and prepared repositories; alternative agents and disconnected operation need additional work."
---

# Setup and dependencies

## Bottom line

[E] The reference implementation is a local Elixir service that starts an external Codex process and reads a configured tracker. [V] Codex supports API-key authentication, so a personal ChatGPT subscription is not inherently required: https://developers.openai.com/codex/auth/. [A] Budget three to six engineer-hours for a first useful synthetic run on a Mac with accounts already available, including workflow adaptation and compatibility debugging. [R] Do not spend that time during this sprint unless another seat has already proved the integration and its human-control boundary.

## Required and optional pieces

[E] Repository observations in this note refer to commit `be10a1b79df723d6d7612b5651c8522704dafb2e`, read without running setup or installing anything.

| Piece | Requirement and purpose | Evidence |
| --- | --- | --- |
| Host | [E] Local bash, Git and a place to create issue directories; SSH only for optional remote workers. | `workspace.ex`, `codex/app_server.ex`, `ssh.ex`. |
| Source runtime | [E] Pinned Erlang 28 and Elixir 1.19.5 for OTP 28; Mix fetches and builds dependencies. Mise is the documented version manager. | `elixir/mise.toml`, `mix.exs`, `README.md`. |
| Libraries | [E] Req for HTTP, Jason for JSON, YamlElixir for workflow config, Solid for templates, Ecto for config schemas; Phoenix, LiveView and Bandit for observability. | `elixir/mix.exs`. |
| Coding agent | [E] A separately installed Codex CLI supporting the expected App Server messages, with authorized model access and credentials available on the worker. | `codex/app_server.ex`; `elixir/README.md`. |
| Model | [E] The sample command selects `gpt-5.5` with `xhigh` reasoning. The schema's plain `codex app-server` default leaves model choice to Codex configuration. No Symphony routing or model ensemble is implemented. | `elixir/WORKFLOW.md`, `config/schema.ex`. |
| Tracker | [E] Registry includes Linear, GitHub Issues, Jira Cloud, Asana and a memory adapter for development/tests. One configured tracker is selected per runtime. | `tracker.ex`, `elixir/README.md`. |
| Tracker account | [E] Linear needs a token and project slug; GitHub needs repository scope and a token for authenticated work; Jira/Asana need their provider credentials and project scope. | `elixir/README.md`, `github/adapter.ex`, `linear/adapter.ex`. |
| Target repository | [E] Workflow hook must populate a fresh workspace. Its own languages, package tools and test dependencies must also be installed or bootstrapped. | `workspace.ex`, `elixir/WORKFLOW.md`. |
| PR workflow | [E] Sample landing flow assumes authenticated `gh`, Git push rights, PR checks and repository-specific skills. Python supports its optional landing watcher. | `.codex/skills/land/SKILL.md`, read as data. |
| Containers | [E] Not required by local orchestration. Docker Compose is used for disposable SSH workers in the opt-in live E2E test if external SSH hosts are not provided. | `elixir/test/symphony_elixir/live_e2e_test.exs`, `elixir/README.md`. |
| Packaged executable | [E] Burrito release configuration targets Mac arm64/x86_64 and Linux arm64/x86_64. It packages the language runtime, not Codex, Git or tracker accounts. | `mix.exs`, `elixir/README.md`. |

[R] Use the GitHub Issues adapter if it removes a new account dependency, but rewrite the Linear-specific prompt and review states. [E] GitHub's documented active/terminal values are `open`/`closed`; the provided `Human Review` and `Merging` state machine is a Linear workflow and does not translate automatically (`elixir/README.md`, `elixir/WORKFLOW.md`).

## A setup sequence to review, not executed here

1. [R] Select and record a Symphony commit and compatible Codex version. Check real thread initialization before preparing several tickets. Do not assume latest CLI and this September reference agree.
2. [R] Have each account owner configure their own event-authorized credentials. Keep token values out of workflow files, notes and logs. Confirm model entitlement with a minimal authorized inference run.
3. [E] The documented source build is `mise install`, `mise exec -- mix setup`, then `mise exec -- mix build` from `elixir/`. `mix setup` fetches dependencies; it does not create tracker accounts or prepare the target app (`mix.exs`, `elixir/README.md`).
4. [R] Write a project-specific workflow: correct tracker scope, one synthetic ticket, concurrency one, a disposable workspace root, reviewed hooks, explicit sandbox/network policy, and no publishing or merging tools. Replace the sample Symphony clone URL and project slug.
5. [E] At this commit, startup also needs the long acknowledgment flag below, although the short README launch example omits it (`cli.ex`). [R] Only use it after reviewing the actual policy; the flag itself supplies no containment.

```text
mise exec -- ./bin/symphony /path/to/WORKFLOW.md \
  --i-understand-that-this-will-be-running-without-the-usual-guardrails
```

6. [R] Inspect the resulting files and run predetermined acceptance tests independently. Verify ticket handoff, evidence preservation, cancellation of child processes and behavior after restart before adding a second ticket.

## Mac time estimate

| Work | [A] Engineer-hours, assuming ordinary network access and existing account authorization |
| --- | --- |
| Runtime/dependencies or verified binary, Codex protocol check | 0.5 to 1.5 |
| Tracker setup and project-specific workflow/hooks | 0.5 to 1.5 |
| First ticket, independent validation and troubleshooting | 1 to 2 |
| Human gate and stop/restart proof | 0.5 to 1 |
| Total planning allowance | About 3 to 6 |

[A] A prepared developer with an already tested workflow might reach one agent turn in one to two hours. A cold setup with network restrictions, missing account authority or current protocol failures could take six to twelve hours or remain blocked. These are planning estimates, not measurements. [E] No installation, model call or timed first run was performed in this review.

## Models, CLIs and event services

| Option | Answer | What must change or be proven |
| --- | --- | --- |
| OpenAI event API key with Codex | [V] Supported authentication route in Codex. [E] Symphony delegates authentication to its child process rather than implementing account login. | [R] Use the authorized event profile and verify a supported model. [E] [[Team/Now]] records an existing successful event-key Codex run, but does not establish Symphony compatibility. Sources: https://developers.openai.com/codex/auth/ and `codex/app_server.ex`. |
| A different OpenAI model | [E] Change Codex config or `codex.command`; Symphony does not require the sample model string. | [R] Pick an actually entitled model and supported reasoning setting. Test streaming, tool use and completion semantics with that exact CLI/model pair. |
| Cursor Agent CLI | [E] No Cursor adapter is registered in the execution path. [V] Cursor documents headless output formats, which are a different interface: https://cursor.com/docs/cli/reference/output-format. | [R] Replace the `AppServer` execution boundary or build a wrapper implementing its RPC, tools, approvals, continuation, usage and cancellation contract. Changing only the executable name is insufficient. Running Codex from a terminal inside Cursor still uses Codex. |
| Grok | [E] No Grok runtime or model-provider integration was found in the inspected scheduler/runner/config paths. | [A] Keeping Codex might be possible through a genuinely compatible Responses provider; this was not verified for Grok. Otherwise add a coding runtime adapter, including local tools and stateful turns. A Grok subscription or chat interface alone is not evidence of this integration. |
| Gemini CLI | [V] Gemini CLI documents headless JSON/JSONL output and exit codes: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/headless.md. [E] Symphony expects Codex thread/turn RPC instead. | [R] Implement and test a Gemini runtime boundary or a protocol wrapper, including tracker-tool injection, approval handling and session reuse. Gemini availability does not supply that code. |
| Gemini model through Codex | [V] Current Codex documentation exposes custom-provider settings and requires a Responses wire protocol: https://developers.openai.com/codex/config-reference/. | [A] A compatible provider or bridge could retain Symphony's RPC surface, but model/tool compatibility and event entitlement remain unverified. This is not a confirmed integration with Gemini. |
| Google Antigravity VM as host | [E] Symphony can launch workers through SSH (`ssh.ex`, `workspace.ex`, `codex/app_server.ex`). | [A] The VM could host Symphony or a Codex worker if it permits the runtime, executable, filesystem access, credentials and required egress. Antigravity agent control is a separate integration, with no adapter found here. Event VM access, capabilities and authorization were not checked. |

[R] For any alternative runtime, normalize at least start, continue, completed, failed, needs-input, cancel and usage events; preserve workspace ownership and independently checked test results. Do not accept a successful process exit as proof of a correct application.

## Disconnected and air-gapped operation

[E] The default Linear workflow requires outbound tracker access and hosted Codex inference. Its bootstrap clone and dependency fetches also require network unless pre-staged. Cached workspace files do not make cloud inference work offline (`WORKFLOW.md`, `linear/client.ex`).

[E] A `memory` tracker exists, but reads issues from an Elixir application environment value and supplies no durable user-facing queue or ticket mutation service (`tracker/memory.ex`). [V] Codex configuration documents local Ollama/LM Studio provider selection: https://developers.openai.com/codex/config-reference/. [A] These are possible building blocks for a disconnected variant, not a demonstrated air-gapped Symphony system.

[R] A credible air-gap plan needs a local durable tracker, preloaded repository and package mirrors, a proven local inference runtime/model, local test tools, disabled external integrations and tested failure recovery. Account policy and software/model licenses still need checking. [R] For the event, keep the development harness connected and show that the generated app's chosen offline scenario works without either Symphony or a cloud model.

## Sources

- [V] Pinned setup documentation: https://github.com/openai/symphony/blob/be10a1b79df723d6d7612b5651c8522704dafb2e/elixir/README.md
- [V] Pinned dependencies: https://github.com/openai/symphony/blob/be10a1b79df723d6d7612b5651c8522704dafb2e/elixir/mix.exs
- [V] Codex authentication: https://developers.openai.com/codex/auth/
- [V] Codex protocol: https://developers.openai.com/codex/app-server/
- [V] Codex providers: https://developers.openai.com/codex/config-reference/
- [V] Cursor CLI: https://cursor.com/docs/cli/reference/output-format
- [V] Gemini CLI: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/headless.md
- [V] Approval compatibility report: https://github.com/openai/symphony/discussions/134
