# Codex goal experiment

This experiment sends the saved brief directly to Codex to build an application in one goal, alongside AppYard's staged pipeline.

## Try it

1. Run `npm run dev` or rebuild the desktop app. Restart an already-running app to load the updated Electron bridge.
2. Create a challenge, fill out its brief, and attach input data. Saving alone does not launch Codex.
3. Choose **Start Codex build** on Build. AppYard prepares a fresh workspace and starts bundled Codex in the background with filesystem and network access, without command approval prompts.
4. Follow messages, commands, file changes, and status directly in Build or Activity. Use **Stop Codex build** to end the worker and preserve its files.
5. Open the goal folder to inspect the generated application, `README.md` startup commands, and `verification.md` evidence.

Each launch uses the current saved brief and creates a separate folder. Earlier goal folders and existing pipeline results are preserved. An active goal blocks changes to the brief and competing builds for that project. Goals share AppYard's three-build capacity limit. Closing the app stops its headless workers; reopening reconciles interrupted runs before allowing new work.

## What is passed to Codex

- `brief.json`: the complete normalized input, including title, problem, input/output descriptions, criteria, resources, links, and attached text.
- `requirements.md`: a readable version of the brief.
- `inputs/manifest.json` and copied input files: original content and provenance, including whitespace and line endings.
- `source-challenge.json`: saved Norfolk source metadata when present.
- `GOAL.md`: completion criteria, verification expectations, scope, and handoff instructions.

Codex chooses the implementation using its configured tools. The goal calls for working workflows, meaningful checks, startup instructions, and explicit limitations. It does not receive a `.fleet` phase contract or AppYard pipeline tools.

## Headless execution and authentication

AppYard launches the bundled Codex 0.166.0 `app-server` over standard input/output. It creates a persistent thread, then sets an active native goal. The connection remains open to receive thread, turn, item, and goal notifications, which AppYard converts into bounded activity history and pushes through its existing desktop state channel. No Terminal window or `.command` launcher is created. The protocol follows the official [Codex app-server documentation](https://learn.chatgpt.com/docs/app-server).

The goal uses the user's existing Codex home (`CODEX_HOME`, or `~/.codex`), sign-in, and model selection. AppYard does not copy its separate model-account credentials into this session. Sign in to Codex before starting a goal. An explicit AppYard reasoning selection is captured at launch and checked against Codex's actual configured model; otherwise Codex keeps its default. Full access applies to this thread without changing global Codex settings.

A completed model turn does not by itself complete a goal. AppYard waits for the native goal completion status and the final turn, so progress and the final answer can stream across continued turns. Provider errors and unexpected process exits fail the build. Goals that need input or reach a usage limit show that they need attention. Interactive client requests end with a visible blocked state instead of waiting for a hidden prompt.

Stop pauses the goal, interrupts its active turn, and shuts down the worker. AppYard tracks run-owned child processes and confirms cleanup before releasing the project. If cleanup cannot be confirmed, further builds remain blocked until Stop or startup recovery succeeds.

## Files and results

Workspaces live at `<AppYard data directory>/codex-goals/<projectId>/<launchId>`. Every attempt preserves its files. The latest folder is linked from the project, and previous folders remain alongside it. These folders are separate from the pipeline's Data & storage cleanup.

AppYard saves recent activity and the latest status. **Completed** means Codex reported its goal complete. This experiment does not run AppYard's independent review gates or enable verified delivery; inspect the application and its recorded evidence when comparing results. Old **Opened in Terminal** records remain identified as legacy handoffs and are not claimed as tracked builds.

The desktop app is required. Browser preview can save a brief but cannot start the local worker.

## Validation

Focused tests cover workspace/input preservation, pushed progress, bounded/redacted streaming, cancellation during startup and execution, duplicate starts, process recovery, bridge compatibility, shared capacity, and app shutdown. Native tests use the bundled Codex executable with a local fake provider; they do not consume an account or claim application quality.

Run `npm run build`, followed by `node --test tests/codex-goal*.test.mjs` and `node scripts/smoke-codex-goal.mjs`. The Electron smoke uses a synthetic execution boundary to check live pushed activity, completion, failures, Stop, folder access, and responsive layout. `npm run check` provides the full repository validation in a private source snapshot.
