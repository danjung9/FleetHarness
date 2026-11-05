---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Classic SWE-AF supports Codex in code, but setup defaults and external dependencies require a bounded integration trial."
---

# Setup and dependencies

## Bottom line

[E] A classic node needs AgentField, Git, a coding harness CLI and credentials for that harness's model provider (`go/internal/node/`, `go/internal/runtimex/providers.go`). [E] OpenAI API-key use through Codex is implemented, although the default installer requires a different provider-key category (`go/internal/config/resolve.go`, `go/agentfield-package.yaml`). [A] Allow 3 to 6 engineer-hours for a first small tested run on a Mac with the working event key, including compatibility fixes and one repair attempt. [R] Spend at most two hours establishing a useful issue-level trial before returning to the known working path.

## Compatibility matrix

[E] Code evidence in this note is from commit `ef26ffbf61496387d7ba554e83799cb5385804d0`; no compatibility run was performed.

| Tool or model route | Answer | What would have to change |
| --- | --- | --- |
| OpenAI key plus Codex | [E] Yes, as an implemented classic runtime. Both implementations normalize `codex`; Go resolves API-key defaults and Python includes a Codex CLI patch. `Dockerfile` installs the CLI and supports API-key auth. | [R] Disable Pro with `SWE_PRO_ENGINE=0`; explicitly choose runtime `codex`, auth mode `api_key` and a model confirmed available on the event key. Run manually or fix the install manifest's required provider options, which omit `OPENAI_API_KEY`. Set the default model for all roles so stale built-in names do not select unavailable models. |
| Cursor | [E] No native Cursor runtime is listed in `swe_af/runtime/providers.py` or `go/internal/runtimex/providers.go`. | [R] Cursor can be the caller of HTTP endpoints. To use its agent as a worker, implement an AgentField harness adapter covering CLI invocation, structured output, tools, timeouts and permissions, or an external issue executor through `execute_fn_target`. Cursor subscription access alone does not establish model API access. |
| Grok / xAI | [E] No dedicated Grok runtime was found in the runtime maps. [V] OpenCode documents xAI support: https://opencode.ai/docs/providers | [A] Likely usable as a model behind `open_code`, with an authorized xAI provider configuration and supported model ID. [R] Pin the installed OpenCode version, set every role model and verify tool use plus schema handling. Do not treat a browser chat entitlement as a tested SWE-AF integration. |
| Gemini | [E] `docs/deployment.md` documents `GOOGLE_API_KEY`; the architecture uses a generic OpenCode provider rather than a native Gemini CLI runtime. [V] OpenCode documents Google model support: https://opencode.ai/docs/models/ | [A] Likely usable through `open_code` with Google credentials and a verified `google/<model>` identifier. [R] Set runtime and role models explicitly and verify structured results. There is no demonstrated Gemini run in this review. |
| Google Antigravity VM | [E] No Antigravity integration was found in the inspected runtime maps or searched project docs. | [A] A suitably provisioned Linux VM could host the control plane, classic node, Git and selected harness. [R] Confirm permission to install software, CPU/RAM/disk, outbound model access, callbacks and persistence. Antigravity's bundled agent or account is not automatically a headless harness API or a Gemini API credential. Event VM access and its restrictions remain not verified. |
| Claude Code | [E] Native `claude_code` runtime; Python pins `claude-agent-sdk==0.1.20`; Go routes through the AgentField harness (`pyproject.toml`, `go/internal/runtimex/providers.go`). | [R] Requires authorized Claude credentials and the matching CLI/runtime. The team's event OpenAI key does not supply this access. |
| AForge / OpenCode | [E] Both are runtime options in Python and Go. OpenRouter auto-selection chooses AForge; only-Infron main-path auto-selection chooses OpenCode (`go/internal/config/resolve.go`). | [R] Install the selected CLI, provide its provider credentials and pin models explicitly. Avoid assuming a newly added key leaves model routing unchanged. |
| Command Code | [E] Python supports `command_code`; Go rejects it. `Dockerfile` installs pinned Command Code and Node 22. | [R] Use the Python node or implement a Go adapter. It is unnecessary for the event OpenAI/Codex route. |

[E] Go's inspected Codex model defaults are `gpt-5.3-codex` for API-key mode and `gpt-5.5` for account auth (`go/internal/config/resolve.go`). [R] These are repository configuration facts, not confirmation that those models are available today on our event account. [P] The research brief says the event OpenAI key with Codex is the only confirmed working team path; other event tools remain unconfirmed.

[E] Not every role goes through the coding CLI: Go's QA synthesizer uses a direct model API through `Deps.AI.AI`, with deterministic fallback and separate fatal-error handling (`go/internal/roles/coding/coding.go:RunQASynthesizer`, `go/internal/node/node.go:resolveAIConfig`). [R] A successful Codex invocation alone is insufficient to certify the deeper-QA route; validate the direct API's provider, model mapping and permissions too. [A] An OpenAI-only configuration may support both paths, but this was not tested on the event key.

## Dependency inventory

| Component | Requirement and consequence |
| --- | --- |
| Classic Go node | [E] `go/go.mod` declares Go 1.21 and AgentField Go SDK `v0.1.130`; CI uses Go 1.23. Building requires module downloads. Git, the chosen harness CLI and AgentField control plane remain runtime dependencies. |
| Classic Python node | [E] `pyproject.toml` requires Python 3.12+, `agentfield>=0.1.145`, Pydantic 2+, pinned Claude SDK 0.1.20, `hax-sdk>=0.2.4` and dotenv. A minimum-version SDK constraint is not a fully frozen dependency environment. |
| Control plane | [E] Nodes call the AgentField service, normally port 8080; callback reachability must work. Root Compose uses `agentfield/control-plane:latest`, local storage and a persistent data volume (`docker-compose.yml`). [R] Pin the image digest for a repeatable demo. |
| Containers | [E] Not mandatory for a native run. Root Compose builds Python planner and fast services, control plane and an ephemeral Postgres 16 database. The Go Compose file adds Go nodes to the existing stack rather than replacing it (`docker-compose.go.yml`). |
| Build image | [E] Root `Dockerfile` downloads AForge with checksum verification, installs Node 22, OpenCode, Codex, Command Code, GitHub CLI and Python dependencies. Several downloads are floating. A full image needs internet during construction. |
| Target application | [E] The factory does not preinstall every application's compiler, browser, database or system library. The target's test and build dependencies must be available for the agent's shell commands (`go/internal/roles/coding/coding.go`). |
| Database | [E] Compose supplies one disposable Postgres service for build-time integration tests. Comments explicitly warn that database-dependent builds should run one at a time because the database is shared (`docker-compose.yml`). It is not a per-agent isolated database. |
| GitHub | [E] Public clone/local work does not inherently need a GitHub account. Private cloning, pushing, PR creation and GitHub Actions inspection require appropriate access and usually `GH_TOKEN` plus `gh` (`docs/deployment.md`, PR and CI code). |
| Human review service | [E] Optional HAX service and key are required for the built-in plan approval flow, with callback configuration and optional reviewer identity (`go/internal/orch/approval_gate.go`, `go/internal/hitl/`). [R] An external FleetHarness approval screen can instead gate explicit plan/execute calls. |
| Search | [E] Optional OpenCode search is enabled by `OPENCODE_ENABLE_EXA=1` and `EXA_API_KEY`; project code adds a prompt guardrail, not a separate research pipeline (`swe_af/tools/web_search.py`). |
| Pro engine | [E] Platform binaries are checked into `go/bin/swe-pro-*`; the manifest defaults the engine on. Its wrapper has separate model-pool and cost options (`go/internal/pro/adapter.go`). [R] Keep it off for an OpenAI-only classic evaluation; model selection for classic roles does not replace its internal model pools. |

## Proposed first-run procedure, not executed

1. [R] Work in a new writable code checkout outside the research vault. Pin `ef26ffb`, select one implementation and document the control-plane and CLI versions.
2. [R] Prefer the native classic Go node if Go and Codex are already available; use a disposable container if target dependencies or shell access need containment. Do not start the entire Python-plus-Go Compose stack just to test one issue.
3. [R] Have the credential owner provide the event key through an approved secret mechanism. Set `SWE_DEFAULT_RUNTIME=codex`, `SWE_CODEX_AUTH_MODE=api_key`, `SWE_PRO_ENGINE=0`, `SWE_FURROW_ENABLED=0` and a confirmed model via `SWE_DEFAULT_MODEL`. Do not copy the host's personal auth directory into a shared container.
4. [R] Start a pinned local AgentField control plane and classic node; check health, registration and callback URLs. Confirm `implement_issue` actually appears before spending model tokens.
5. [R] Use a tiny committed repository with synthetic fixtures and explicit expected outputs. Call `swe-planner.implement_issue`, set `enable_github_pr=false`, keep one issue in flight and apply an external wall-clock/spend limit. Do not supply GitHub write credentials.
6. [R] Inspect returned branch and diff; independently run the specified tests. Deliberately include a failing acceptance case in a subsequent authorized trial and demonstrate repair or honest failure. Verify cancellation stops child work, not just the dashboard status.

## Mac estimate

| Work | Estimate |
| --- | --- |
| Prerequisites, pinned control plane and classic node | [A] 0.5 to 1.5 hours if Git, Codex and a package manager already work. |
| Provider setup, model override and endpoint troubleshooting | [A] 0.5 to 1.5 hours, especially because OpenAI-only install defaults do not align. |
| Small issue, independent tests and one failure/repair trial | [A] 1 to 2 hours. |
| Integration contingency | [A] 1 hour. |
| First useful tested result | [A] About 3 to 6 engineer-hours. This is a planning estimate, not measured time; missing Docker, toolchains, API permissions or callbacks can exceed it. |

## Disconnected and air-gapped operation

[E] The control plane and node can be local, but the documented model routes call external APIs; remote cloning, GitHub checks, search and initial package/image downloads add network dependencies (`Dockerfile`, runtime and CI code). [R] Do not describe the stock configuration as air-gapped or disconnected-capable.

[V] OpenCode supports local models and custom provider endpoints: https://opencode.ai/docs/providers . [A] A fully local model route could make a classic build disconnected after all dependencies, source, model weights and test fixtures are staged. [R] This requires a local tool-capable model server, model/schema compatibility validation, local control plane and approval UI, disabled external search/PR/CI, offline package mirrors and network-denial testing. No such SWE-AF deployment was verified.

[R] Treat the generated application separately. Demonstrate its offline behavior using local fixtures and an actual network-off test, even if the software factory used a hosted model during development.

## Sources

- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/pyproject.toml
- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/go/go.mod
- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/go/agentfield-package.yaml
- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/Dockerfile
- https://opencode.ai/docs/providers
- https://opencode.ai/docs/models/
