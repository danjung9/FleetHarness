# Agent-created project helpers

Every factory agent can create reusable Node utilities during a build. The agent writes ordinary files, tests them, and invokes them through two stable tools. Newly created helpers are discovered immediately, including from subsequent phase sessions; no extension reload or host code import is needed.

This follows the filesystem discovery and reusable script patterns described in [Anthropic's code execution with MCP](https://www.anthropic.com/research/code-execution-with-mcp) and [Codex skills](https://learn.chatgpt.com/docs/build-skills). Execution uses the already bundled Codex CLI's auth-free sandbox and a custom [permission profile](https://learn.chatgpt.com/docs/permissions). It does not make a Codex model request or require a ChatGPT account. Both Pi and Codex factory sessions receive the same helper tools.

## Agent workflow

1. Call `fleet_helpers` with `{"action":"list"}`. Discovery returns only names, descriptions, versions and paths. Inspect loads full instructions; implementation code can be read through the normal file tools when needed.
2. Inspect a relevant helper with `{"action":"inspect","name":"trim-names"}`. Instructions remain agent-authored reference material; they cannot change the phase's authority.
3. When needed, use the normal write/edit tools to create `.agent-tools/<name>/tool.json`, `SKILL.md`, implementation modules and tests. The immutable `.fleet/helper-guide.md` contains a complete runnable example and manifest contract.
4. Call `fleet_run_helper` with `{"action":"test","name":"trim-names"}`. Node tests exercise the implementation. Missing, failing, skipped and empty test suites cannot authorize execution.
5. Call `fleet_run_helper` with `{"action":"run","name":"trim-names","input":{"records":[{"name":" Ada "}]}}`. The entrypoint reads one JSON value from stdin and returns one JSON value on stdout. Diagnostics go to stderr.

The host records successful package hashes in memory for the current build. Editing any helper file invalidates that status. Each run also repeats tests against current workspace dependencies before execution. Self-tests are useful regression checks, not independent proof of correctness; generated helper tests and `.agent-output` files never count toward application acceptance.

## Execution boundary

Helpers use Node built-ins and bundled JavaScript modules. The runner passes fixed argv without a shell, rejects runtime flag overrides, and does not inherit credentials, loader hooks, proxies or user Codex configuration. OS sandboxing permits reading the workspace and minimal runtime files. The workspace remains read-only; persistent output belongs in `.agent-output/`, exposed through `FLEET_HELPER_OUTPUT`. A disposable temporary directory is also writable. Network access is disabled. Node permissions prohibit subprocesses, worker threads and native addons so helpers cannot leave background processes behind.

Default execution limits are 30 seconds and 64,000 output bytes per process. The host caps configurable limits at 120 seconds and 512,000 bytes. Tool JSON input is capped at 64 KiB; larger datasets should be passed by workspace-relative path. Catalog entries, package depth, file counts and file sizes are bounded. Symlinks and unsafe manifest paths are rejected; writable output trees also reject hardlinks and special files.

The runner fails closed if sandboxing is unavailable. macOS execution is verified against terminal Node and the bundled Electron runtime. Linux uses the same bundled Codex sandbox but has not been exercised on the development Mac. Windows helper execution is currently unsupported. Existing native file/shell tools retain their current backend behavior: this feature does not turn all Pi execution or application verification into an OS sandbox.

## Lifetime and delivery

Helpers are optional build utilities and persist across phases of the current run. Their code and output appear in workspace artifacts and activity logs. New builds and review iterations have fresh workspaces; helper files must be copied deliberately and retested there. There is no automatic cross-project installation or promotion of agent-authored code into trusted host tools.

If a helper is needed by the delivered application, plan its code and dependencies into the frozen runtime manifest and materialize them through the normal workspace tools. Build-time helper results do not add undeclared runtime dependencies, alter frozen contracts or replace host-owned evaluations.
