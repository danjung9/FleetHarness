---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Model routes, infrastructure, Mac setup estimates and the limits of disconnected operation."
---

# Setup and dependencies

## Bottom line

[E] An OpenAI API key with a Codex runner is supported in the inspected code. [E] A working factory also needs a server, durable storage, runner compute and repository access. [A] Allow 4 to 8 focused engineering hours for a first self-hosted Mac-assisted ticket-to-PR run if permissions and internet access are already available. [R] Do not confuse opening the board with proving a complete build, failed test, repair and review cycle.

## Model and agent compatibility

[E] Evidence in this table is static inspection of the pinned commit, not provider access testing. Model IDs in source are configuration defaults or fixtures, not proof of current availability on the event account.

| Choice | What exists | What the team must supply or change |
| --- | --- | --- |
| OpenAI API key plus Codex | [E] `pkg/components/runner/codex/component.go`, `spec.go` and `run.js` implement a dedicated runner. The wrapper accepts an OpenAI API key or Codex API key, launches Codex, reads JSON events/session data, and supports an alternate API base URL. | [R] Install the Codex CLI on the runner, connect the authorized event key through secret configuration, select an actually permitted model and test it. No personal subscription is required for this API-key route. |
| Existing confirmed event model | [P] The brief confirms only Codex on the event OpenAI key. [E] `provider_agent_models.go` defaults OpenAI onboarding to a `gpt-5` identifier. | [R] Explicitly select the verified event model instead of trusting this default. [A] Catalog filtering or model configuration may need adjustment if that model is not exposed. No live check was performed. |
| Claude Code | [E] The bundled implementation YAML initially references the Claude runner; factory materialization can choose a different harness. `pkg/components/runner/claude/` exists. | [R] Use only if separately authorized Anthropic access is available. The Claude name in a template does not make Anthropic mandatory for an OpenAI-configured factory. |
| Grok through OpenRouter | [E] `pkg/components/runner/openrouter/` launches OpenCode, configures the selected model and normalizes provider IDs. Its tests include xAI model identifiers. | [R] Supply OpenRouter access and select a model enabled for that account. A Grok web subscription or event xAI entitlement does not establish OpenRouter API access. |
| Direct xAI API | [E] No dedicated xAI runner was found in the inspected runner/provider paths. Custom-provider configuration exists in `pkg/integrations/customllm/` and the OpenRouter runner wrapper. | [A] A supported compatible custom endpoint may work after configuring API type, base URL, model metadata and credentials. Direct event-key compatibility and streaming/tool behavior are not verified. |
| Gemini | [E] The OpenRouter runner has Gemini usage/model fixtures and generic selected-model support. No dedicated Gemini CLI runner or `GEMINI_API_KEY` path was found in the targeted runner search. | [R] Use Gemini through the configured OpenRouter route if authorized. [A] Direct Google API or Gemini CLI use would need a compatible custom-provider setup or a new adapter, including authentication, tool calls, results and usage handling. |
| Cursor | [E] `pkg/integrations/cursor/launch_agent.go`, `client.go` and `launch_agent_monitor.go` launch and monitor Cursor remote agents through `api.cursor.com`. This is a separate workflow component, not the built-in Codex factory runner. | [R] Supply a Cursor API credential and repository access. [A] Replacing the factory's runner node needs an adapted graph and equivalent completion, artifact and failure mapping. A Cursor editor login alone is unverified for this API. |
| Google Antigravity VM | [E] No Antigravity adapter was found in the inspected runner/integration paths or targeted public repository search. | [A] It may host a runner if the assigned VM permits installation, outbound WebSockets, repository/model access and adequate resources. An existing VM does not establish permission to install this stack. Using Antigravity itself as the coding agent requires an adapter or custom script and result protocol. Event access, privileges and compatibility are not verified. |
| Local model | [E] `pkg/components/runner/openrouter/run.js` supports a custom provider base URL, key, API type and SDK package; `pkg/integrations/customllm/` configures providers. | [A] A local compatible server could replace internet inference, provided its model handles the required coding/tools protocol. This is an integration path, not a demonstrated offline factory. |

[V] Public BYOK documentation lists Claude, OpenAI and OpenRouter and distinguishes API-key billing from subscription use: https://docs.superplane.com/billing/bring-your-own-key/. [R] Have the credential owner configure access; do not copy keys into notes, prompts, screenshots or generated repositories.

## Required infrastructure

| Layer | Observed requirement or option |
| --- | --- |
| Application | [E] Go backend, React/TypeScript frontend, REST/gRPC APIs and worker processes. Source declares Go 1.27.3 and frontend Node at least 22.22.0. Evidence: `go.mod`, `web_src/package.json`, `Dockerfile`. |
| State and messaging | [E] The single-host release template uses PostgreSQL 17.5 and RabbitMQ, with persistent volumes. Evidence: `release/superplane-single-host-tarball/templates/docker-compose.yml`. |
| Storage and ingress | [E] The same template mounts local blob and runner-log storage and uses Caddy for ingress. Filesystem and cloud blob-store implementations exist under `pkg/blob/`. |
| Runner compute | [E] The release template starts Fleet Manager with access to the Docker socket. Its implementation is an external image, not fully inspected here. Direct runner registration is also supported. Evidence: Compose template and `pkg/runners/README.md`. |
| Runner tools | [E] `release/runner/Dockerfile` provides Node 22, Python and the Claude Code, OpenCode and Codex CLIs. Bash, Git and repository-specific test/build dependencies are also needed for the bundled steps. The CLI wrappers check for installed tools. |
| Source control | [E] The GitHub factory path needs API/webhook authorization, checkout and push permissions; equivalent Bitbucket templates exist. Evidence: GitHub implementation YAML, `workspace_agent_resources.go` and `factory_app_templates.go`. |
| Accounts | [R] For a first OpenAI run: a self-host owner account, an authorized GitHub integration, approved model access and a runner operator. A cloud-hosted alternative adds a SuperPlane account and service terms. SMTP and optional monitoring integrations are not intrinsic to the minimum local workflow. |

[V] Official single-VM installation targets Linux with Docker Compose v2, controlled DNS, inbound ports 80/443 and outbound image/release downloads. It recommends reserving 2 vCPUs, 8 GB RAM and 30 GB disk per concurrent runner, excluding core services; the default fleet can grow to five. Source: https://docs.superplane.com/self-hosting/single-vm/.

[R] Limit evaluation to one runner. [A] A Mac with 16 GB total memory may be tight once a Linux VM, server containers, browser and build tools share it. A 24 to 32 GB Mac or separate Linux host offers more headroom; this is an estimate, not a measured minimum.

## Safe setup sequence for a later authorized evaluation

1. [R] Use a synthetic repository with a small bug and an existing deterministic test. Define acceptance criteria and the human merge owner first.
2. [R] Choose a pinned community release. Use the documented Linux VM path from the Mac, or a disposable contributor environment. Preserve upstream license files. Do not run the supplied research clone.
3. [R] Start database, messaging, application and storage; complete owner setup. Restrict runner capacity and configure only the selected model and repository integrations.
4. [R] Verify server health, runner registration and a harmless command task before invoking a model. Then check one model request without exposing credentials.
5. [R] Dispatch one task, observe branch and PR artifacts, deliberately show a failing check, require a passing repaired result and inspect the final diff. Exercise cancellation before any merge.
6. [R] Record actual time, cost, tests, failures and upstream material. Keep push, PR creation and merge within explicit team authorization.

## Mac time estimate

| Milestone | [A] Focused hours, with accounts and permissions ready |
| --- | --- |
| Hosted workspace and connected repository | 0.5 to 1.5 |
| First hosted task through check results and human review | 1 to 3 total |
| Linux VM/containers, server and owner setup from a Mac | 1 to 3 |
| Model integration, repository integration and runner | 1 to 2 additional |
| First self-hosted task, failure/repair proof and review | 1 to 3 additional, about 4 to 8 total including troubleshooting |
| New Cursor/Antigravity adapter or fully offline configuration | Not responsibly bounded inside this sprint without a proof; reserve a separate experiment. |

[A] Estimates assume reliable downloads, Docker already usable, no account provisioning delay and an engineer familiar with containers. Apple Silicon image/runner compatibility was not tested. [V] The vendor quickstart's short setup claim concerns creating and connecting a workspace, not this entire proof: https://docs.superplane.com/get-started/quickstart/.

## Disconnected and air-gapped operation

[E] Local database, messaging and filesystem storage make a locally hosted control plane possible. The normal factory still uses remote source-control APIs/webhooks, model APIs and image pulls. `docker_executor.go` explicitly calls `docker pull` before running a task. Local hosting therefore does not establish disconnected execution.

[A] On loss of connectivity, a local UI/state service may remain usable while external tasks fail or wait according to their integration logic. Reliable recovery, idempotency after outages and offline queue replay were not tested. The runner has log spooling and acknowledgment logic, but that alone is not an end-to-end disconnected guarantee.

[R] An air-gap experiment would need mirrored images/packages/browser assets, a preloaded code repository, local model serving, local CI, internal certificates/identity and replacement or disabling of remote integration, catalog, update and telemetry calls. Avoid the unconditional pull path or supply an internal registry. Audit actual network traffic. [A] Custom-provider code makes this plausible engineering work, but no ready air-gap profile or successful air-gap run was verified.

[R] Keep factory connectivity separate from application connectivity. A cloud coding tool can produce an application that runs disconnected; FleetHarness must prove that with its own outage-and-resync tests.

## Sources

- [E] Supplied read-only clone at commit `7d755d16b8ae836ecebf61639efc6266d74a4b0b`, named paths above.
- [V] https://github.com/superplanehq/superplane/tree/7d755d16b8ae836ecebf61639efc6266d74a4b0b
- [V] https://docs.superplane.com/billing/bring-your-own-key/
- [V] https://docs.superplane.com/self-hosting/single-vm/
- [V] https://docs.superplane.com/get-started/quickstart/
- [V] https://docs.superplane.com/self-hosting/overview/
