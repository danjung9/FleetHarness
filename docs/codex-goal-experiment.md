# Codex goal experiment

This branch tests whether handing the initial brief directly to Codex produces a better application than the staged AppYard pipeline.

## Try it

1. Run `npm run dev` on macOS, or rebuild the desktop app. Restart an already-running app so it loads the new Electron bridge.
2. Choose **New challenge**, fill out the brief and attach any input data.
3. Click **Save & open Codex**. AppYard saves the challenge, prepares a fresh workspace and opens a visible Terminal session with an active Codex goal.
4. Follow progress in Terminal. Codex may ask you to sign in or trust the new workspace. Its goal covers implementation, meaningful tests, repairs and a runnable local handoff.
5. Use **Open goal folder** in AppYard to inspect the generated files, `README.md` startup commands and `verification.md` evidence.

For a saved challenge, use **Open Codex goal** on Build, or edit its brief and select **Save & open Codex**. Each new launch starts from the current saved brief in a separate folder. Existing pipeline build files remain intact. The original pipeline controls remain available for comparison and still use AppYard's configured model.

## What is passed to Codex

- `brief.json`: the full normalized initial input, including title, problem, input/output descriptions, criteria, resources, links and attached text.
- `requirements.md`: a readable rendering of the same brief.
- `inputs/manifest.json` and copied input files: original content and provenance, including whitespace and line endings.
- `source-challenge.json`: saved Norfolk source metadata when present.
- `GOAL.md`: completion criteria, verification expectations, scope and handoff instructions.

No `.fleet` phase contract, pipeline plan, foundation or factory tools are injected. Codex chooses its implementation from the brief and its own configured tools. The goal requires a working application, actual checks, startup instructions and explicit remaining limitations.

## CLI and goal behavior

The launcher uses the app's bundled Codex 0.166.0 binary, so it does not depend on a working global `codex` installation. It uses the native CLI's existing Codex home, authentication and model preferences, independently of AppYard's model settings. The same home is used to create and resume the session. AppYard does not copy its account credentials into the launcher.

The local app-server creates a persistent thread and goal without making a model request. It saves the goal paused, unloads the empty thread, and activates the unloaded goal. Terminal then runs `codex --no-daemon --enable goals --sandbox workspace-write --ask-for-approval on-request --cd <workspace> resume <threadId>`. Resuming starts goal pursuit automatically.

Passing `/goal ...` as a positional CLI startup prompt is insufficient: in the bundled version it is treated as message text. The launcher instead uses `thread/goal/set` and checks the persisted objective/status. The contract is covered by an offline test against the bundled binary and a loopback provider. See the official [Goals guide](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex) for the user-facing lifecycle.

Use `/goal` inside Terminal to inspect the goal or `/goal pause` to pause it. Terminal owns execution; closing AppYard does not stop the CLI.

## Files and results

Workspaces live at `<AppYard data directory>/codex-goals/<projectId>/<launchId>`. Every attempt preserves its files, including failed handoffs. The latest folder is linked from the project; previous folders remain alongside it. `Open Codex.command` resumes the saved session if Terminal must be reopened. These folders are separate from the pipeline's Data & storage cleanup.

**Opened in Terminal** means the OS accepted the handoff. It does not establish that Codex is authenticated, running successfully, or finished. AppYard does not stream CLI activity, count its tokens, collect its result, run independent review gates, or enable verified delivery for this experiment. Inspect the application and its evidence in the goal folder when comparing results.

The branch currently supports macOS Terminal. The browser preview cannot launch the CLI. Failed launch preparation or opening is reported without discarding the saved challenge, and the project offers a retry.

## Validation

`npm run check` runs the repository validation in a private source snapshot. Focused coverage is in `tests/codex-goal.test.mjs`, `tests/codex-goal-thread.test.mjs`, and `tests/codex-goal-compatibility.test.mjs` for input preservation, shell quoting, recovery, duplicate launches, bridge compatibility and real persistent goal activation.

After `npm run build`, run `node scripts/smoke-codex-goal.mjs` for the Electron intake, failed-handoff recovery, retry and folder controls. It replaces only the external handoff with a fixture and never opens a real Terminal or calls a model. Existing pipeline UI smokes use the same test-only handoff boundary when submitting briefs.
