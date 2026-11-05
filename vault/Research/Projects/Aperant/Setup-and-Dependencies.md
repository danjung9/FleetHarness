---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "The inspected engine supports multiple model APIs, but setup and disconnected operation remain untested."
---

# Setup and dependencies

## Bottom line

[E] The inspected source can resolve OpenAI, Google, and xAI model accounts directly, despite README requirements centered on Claude (`ai/providers/factory.ts`, `agent/agent-manager.ts`). [A] Budget 3 to 6 engineering hours for a first small source-based Mac build using a supported API account, with a full day possible if authentication or native modules fail. [E] Cloud models, default documentation lookup, web search, browsing, and optional integrations make the default workflow connected (`ai/mcp/registry.ts`, `ai/tools/providers/index.ts`). [R] Do not describe local storage or Ollama support as proof of an air-gapped working system.

## Scope

[E] All code observations are direct reads of `20250db`; `ai/` means `apps/desktop/src/main/ai/`. The following is a proposed setup path, not an executed installation. [E] The research brief prohibits installing or running code from the clone.

## Model and client compatibility

| Option | What the code actually supports | What would have to change or be checked |
| --- | --- | --- |
| OpenAI API key and Codex models | [E] `ai/providers/factory.ts` uses the OpenAI adapter. Model IDs containing `codex` use the Responses API; ordinary IDs use Chat Completions. `src/shared/constants/models.ts` lists GPT-5.3 Codex, GPT-5.2 Codex, and GPT-5.1 Codex Mini. | [R] Configure an OpenAI API-key account and an accessible model; validate tool use, structured outputs, and test execution on a synthetic task. [A] The event key's access to these catalog entries is not verified. |
| The already working event Codex tool | [P] `Research/00-Brief.md` says it works on the event key. [E] Aperant's main worker uses its own API agent loop, rather than invoking that tool. | [R] Do not assume access transfers automatically. For the confirmed `gpt-6.1-sol` model, inspect and likely update `src/shared/constants/models.ts`, equivalents, context metadata, and provider options, then test. To use Codex CLI itself as the worker, implement a subprocess adapter for task input, events, cancellation, errors, and results. |
| Codex subscription login | [E] `ai/auth/codex-oauth.ts`, `ai/auth/resolver.ts`, and `ai/providers/oauth-fetch.ts` implement a separate PKCE/token-file route to a subscription endpoint. | [R] Prefer the authorized API-key route for this event. [A] Current subscription entitlement, endpoint support, and applicable service terms were not verified. No login was attempted. |
| Claude | [P] The project README requires Claude Pro/Max and Claude Code CLI. [E] The API engine supports Anthropic API keys and an OAuth path; terminal features retain Claude CLI integration. | [R] Distinguish the stable downloadable app's documented setup from the newer source engine. [A] A subscription's current permission to use this third-party OAuth implementation is not verified. |
| Cursor | [E] The inspected `SupportedProvider` factory has no Cursor adapter. | [R] Cursor can be a human's editor, but a Cursor subscription is not a provider key for this engine. Using its agent as the worker needs an adapter and approval of its authentication and execution contract. [A] No Cursor runtime integration was verified. |
| Grok | [E] `createXai` is wired in `factory.ts`; `models.ts` includes Grok 4, Grok 3, and Grok 3 Mini presets. | [R] Supply a separately authorized xAI API account and confirm accessible model IDs and tool behavior. [A] Event Grok access does not establish API entitlement. |
| Gemini | [E] `createGoogleGenerativeAI` is wired in `factory.ts`; `models.ts` lists Gemini 2.5 Pro/Flash/Flash Lite and a legacy 2.0 entry. | [R] Supply an authorized Google model API key and check model availability. The inspected factory does not provide a Vertex AI or VM-identity adapter. Such access may require a new adapter and auth resolution. |
| Google Antigravity VM | [E] No Antigravity adapter was found in the inspected provider factory or model catalog. [A] Event VM access and its installed capabilities are not confirmed in the brief. | [R] Treat the VM as a possible host, not a model account. Confirm OS, GUI availability, Git and build tools, egress, and authorized API credentials. Running the Electron UI on a headless VM needs a desktop/display solution or a new headless entry point. Using Antigravity's own agent requires a worker adapter. |
| Ollama/local model | [E] `factory.ts` has an OpenAI-compatible Ollama provider that appends `/v1`, with a localhost default. | [R] Preload a capable tool-calling model and separately configure local embeddings or disable embedding features. Validate schema compliance, context size, and actual coding quality. [A] No local-model run or hardware sizing was performed. |

[E] Additional factory cases include Azure, Bedrock, Mistral, Groq, OpenRouter, and ZAI. Their presence is implementation evidence, not proof of working accounts, current model access, or production reliability. Evidence: `ai/providers/factory.ts`.

[E] `worker.ts`, `runSingleSession`, uses the queue-resolved base model ID for sessions. It does not independently resolve a fresh model for each phase in that function, although the UI and constants contain phase model presets. [R] If mixing providers by phase matters, trace and test account routing rather than relying on configuration labels.

## Mac prerequisites

| Component | Requirement and evidence |
| --- | --- |
| App runtime | [E] Electron 40, React 19, TypeScript, Vercel AI SDK 6, and XState are declared in `apps/desktop/package.json`. These are Aperant's dependencies, not a mandatory runtime for its generated applications. |
| Source build tools | [E] Root and desktop package files require Node.js 24+ and npm 10+. `CONTRIBUTING.md` also requires Git and CMake. |
| Native compilation | [E] `apps/desktop/scripts/postinstall.cjs` rebuilds native modules for Electron and points Mac users to Xcode command-line tools when compilation fails. `node-pty` and libSQL add native packaging concerns. |
| Project state | [E] Tasks operate on a Git repository and a base branch, normally `main`. Evidence: `agent-manager.ts` and `ai/worktree/worktree-manager.ts`. [R] Use a disposable synthetic repository with an initial commit and no configured publishing credentials. |
| Model account | [E] `agent-manager.ts` accepts a valid legacy profile or any configured provider account. [R] The owner should enter their own authorized key in Settings; do not share it or put it in notes. |
| Containers | [E] The traced agent path does not require Docker and does not launch a container. [R] Add a separate container or VM boundary before trusting generated shell commands with valuable host files. |
| Target application tools | [A] Python, browser binaries, databases, solvers, or Docker may be needed by the particular generated application. They are not universally supplied by Aperant. |

## External service inventory

[E] Model API traffic is sent through the selected provider adapter. `ai/mcp/registry.ts` enables Context7 documentation lookup by default through `npx` and a package fetched with an unpinned latest tag. Missing MCP initialization is logged as nonfatal in `worker.ts`.

[E] The default search factory selects Serper, not Tavily, despite the `WebSearch` tool comment naming Tavily. The same factory selects Jina for URL-to-text browsing. Evidence: `ai/tools/providers/index.ts`. [E] That factory comments that search uses an embedded credential; no credential value was copied or tested. [R] Provision an authorized team-owned service account or disable search, and pin or remove external helper packages before any controlled deployment.

[E] Optional connections include Linear, a Graphiti memory sidecar, browser or Electron automation MCP servers, Git hosting integrations, and Sentry diagnostics. Evidence: `ai/mcp/registry.ts`, `agent-manager.ts`, `src/main/sentry.ts`, and desktop dependencies. [E] Local memory can use `memory.db`; `ai/memory/db.ts` optionally adds Turso synchronization when explicitly given remote settings. A cloud database is not required for the local database path.

[E] `src/main/sentry.ts` enables configured production diagnostics unless the saved setting disables it; a source build without a DSN has reporting disabled. [R] Include model endpoints, search, browsing, MCP helpers, hosting actions, optional memory services, update checks, and diagnostics in an actual tool disclosure. The presence of optional integrations does not authorize using them.

## Proposed first-run sequence and time estimate

[R] Use a separate writable checkout if a runtime experiment is later authorized. Do not install into the read-only research clone. Review lifecycle scripts first, then follow the documented `npm run install:all` and `npm run dev` path. Those commands were read, not run.

| Work | Estimate |
| --- | --- |
| [A] Install or align Node, npm, CMake, Git, and Mac command-line build tools | 0.5 to 1.5 hours |
| [A] Install dependencies, rebuild native modules, and launch UI | 0.5 to 1 hour |
| [A] Configure one authorized API-key account and a supported model | 0.25 to 0.75 hours |
| [A] Run and inspect one tiny synthetic task with a deliberately failing test | 1 to 2 hours |
| [A] Allow for catalog, auth, or environment adjustments | 0.75 hour |
| [A] Planning budget for first working run | About 3 to 6 engineering hours; reserve 8 or more if a blocker appears |

[A] These estimates assume an experienced Mac developer, working internet, account entitlement, and no source defect requiring a major repair. A packaged app might launch in under an hour, but that would not establish that the inspected source engine works with the event key. No cost or rate estimate is established without a run.

[R] Before a trial, disable `pushNewBranches`, use a local base branch, disable unnecessary external services, enforce the plan gate, and replace project-root fallback with a hard failure. Confirm that the provider base URL matches the event key's authorized endpoint rather than assuming a standard public endpoint. Add a small independent acceptance runner and keep its raw exit status. These are concrete checks and fixes suggested by the traced code, not a completed setup.

## Disconnected and air-gapped use

[E] Local files, Git history, worktrees, and local libSQL storage do not intrinsically need a cloud service. `createOrGetWorktree` attempts a fetch but treats failure as nonfatal, and a local Ollama provider exists. This supports a possible local configuration, not a demonstrated disconnected build.

[E] Default model accounts need remote inference; web research, Jina browsing, Context7, unprepared `npx` dependencies, hosting actions, and optional remote memory also need connectivity. Source installation and browser acquisition need preloaded artifacts when offline.

[R] An air-gap experiment would need all packages, native binaries, prompts, test tools, application dependencies, model weights, and optional embeddings pre-staged; external integrations and diagnostics disabled; a local model selected; and outbound attempts blocked and observed. Remove or vendor default helper downloads. Test the full spec, code, test, repair, restart, and review sequence under an actual network block.

[A] Adequate local-model capability, Mac memory requirements, a complete offline configuration, and network silence are not verified. [R] A generated application can still be designed to run offline even when Aperant is used online to build it. Keep build-time connectivity separate from the resulting product's runtime requirements.

## Sources

- [V] Dependency declarations: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/apps/desktop/package.json
- [V] Provider factory: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/apps/desktop/src/main/ai/providers/factory.ts
- [V] Model catalog: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/apps/desktop/src/shared/constants/models.ts
- [V] Development setup: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/CONTRIBUTING.md
- [V] Desktop-only guide: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/guides/CLI-USAGE.md
- [P] Confirmed event access: `Research/00-Brief.md` and `Team/Now.md`.
