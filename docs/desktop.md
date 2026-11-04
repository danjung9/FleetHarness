# AppYard desktop

AppYard is an Electron application backed by **Codex 0.166.0 or Pi SDK 1.5.0**. It runs real model sessions with local coding tools; an idle workspace does not contain simulated agents or invented test results.

## Run the packaged app

On Apple Silicon, open release/mac-arm64/AppYard.app, or install from release/AppYard-0.1.0-arm64.dmg.

The local build is ad-hoc signed. It is not Apple Developer ID signed or notarized for public distribution.

1. Open **Model settings** and select a build engine. For subscription builds, choose **Codex · ChatGPT subscription**, sign in, select a model, and save. See [ChatGPT setup](chatgpt.md).
2. For Pi, supply an API key, or reuse existing Pi authentication in ~/.pi/agent/auth.json. Provider environment variables are supported when inherited by the app. Pi-compatible custom endpoints in ~/.pi/agent/models.json are also loaded.
3. Choose **New challenge** to import one of the 34 Norfolk catalog entries, use a sample brief, or write a custom problem. Review the acceptance criteria.
4. Choose **Start build**. Intake, research, planning, implementation and verification roles execute sequentially in a dedicated folder. Up to three challenges can run concurrently.
5. Inspect **Development**, **Agents**, and **Artifacts**. Reload the preview after the agent has written index.html.
6. Review **Evidence & delivery**, enter review notes, and approve the prototype. Choose **Download executable** for a standalone app, or **Export app & evidence** to copy source, requirements, test output, and your review into a new destination folder.

Pi agents have local read, write, edit, and shell tools. A separate project folder is **not an operating-system sandbox**. Only start runs you trust. The selected provider receives requirements and model/tool context and may charge for usage. There is no deployment or publishing integration.

## Current delivery contract

The first release targets a dependency-free, self-contained index.html application, testable source, Node test files, and documentation. The preview uses a separate loopback origin for each run, supports its own browser storage, and blocks network requests through a content policy. It has no desktop IPC bridge or Node integration.

### Standalone app downloads

After a build passes verification and you approve it, **Download executable** opens a save dialog and packages the verified application for the build machine's OS and processor. The ZIP contains a macOS `.app`, a Windows `.exe` with its supporting files, or a Linux executable with its supporting files, plus `START-HERE.txt`. Extract the whole ZIP before opening the app. The end user needs neither AppYard nor Node.js nor an AI account.

AppYard uses [Electron Packager](https://electron.github.io/packager/main/) with the same Electron version as its host. The first download may need network access to obtain the runtime; subsequent downloads reuse Electron's cache. Packaging runs separately with a ten-minute limit. Closing AppYard interrupts packaging; reopening shows a retry action. Editing requirements or starting another run clears the previous download state. Source fingerprints are checked before packaging and again before saving; source changes require a new verified build.

Only the self-contained `index.html` and a host-controlled desktop wrapper enter the application. Agent scripts, dependencies, test files, sessions, and AppYard credentials are excluded. The wrapper preserves offline browser storage under a stable, project-specific application-data directory and disables Node integration, external requests, navigation, popups, and permissions. Preview data is separate from the standalone app's data.

macOS packages are ad-hoc signed, not Developer ID signed or notarized. Windows packages have no publisher signature. OS approval may therefore be required; this is a prototype distribution path. Cross-compilation, installers, automatic updates, and public-release signing are not provided. The executable smoke test has been run on macOS Apple Silicon; Windows and Linux need validation on their own build machines.

Run `npm run test:executable` to verify approval, save cancellation, packaging, ZIP extraction, standalone launch, local persistence, renderer isolation, concurrent-change protection, and stale-source rejection. To test the packaged AppYard host, run `FLEET_EXECUTABLE="/absolute/path/to/AppYard.app/Contents/MacOS/AppYard" node scripts/smoke-executable.mjs` after `npm run pack`. The fixture is independently tested and requires no model credentials.

After implementing the app, the build agent writes `README.md` in a dedicated follow-up step within the same session and time/turn budget. This user guide explains quick start, the main workflows, a synthetic example with expected results, input formats, data persistence, troubleshooting, limitations, and developer test commands. Open `README.md` in **Artifacts / Files** or in the exported source folder. Verification and repair keep the guide aligned with the final application before the host records its source fingerprint. A missing or empty guide blocks completion.

Native backends, arbitrary framework dev servers, production data connectors, distributed/offline transport, and operational readiness are outside this release's verified scope. Domain toolkit calculations and synthetic fixtures are separate from generated-application tests.

The 34-entry catalog, recipe preparation, reusable skills, and seven domain tools come from harness/.

## Evidence and control

- **Whole-build time limit (minutes)** in Model settings sets one allowance for the next build: 1–180 whole minutes, default 60. The start dialog confirms it; **Time & usage** in the run header shows remaining time, phase durations, observed responses, prompt submissions and available token/cost observations. Existing workspaces without this setting use 60; older runs retain unknown usage.
- The allowance begins before asynchronous account/session setup and includes every generation phase, README follow-up, artifact completion, retries, compaction, host verification and the one repair. A monotonic deadline is shared across them; activity and phase changes cannot renew it. The settings snapshot is fixed for that build. Up to three runs remain supported, each with its own allowance.
- Expiry stops further AppYard model dispatch, aborts active sessions and host checks, preserves artifacts and available usage, and releases the run slot with **Time budget exhausted**. Local cancellation cannot guarantee an upstream provider immediately stops an already accepted request. Process/browser cleanup may take a bounded grace period after expiry; state-save failure is reported rather than holding the slot indefinitely.
- Automatic time stops when the verified build reaches human review. Review time, source export and a separately requested executable package do not consume or restart the build allowance. Packaging retains its own ten-minute limit. A new build gets a new run ID and allowance; previous folders and summaries remain available. There is no desktop Resume feature.
- Tokens and money are **observational, not caps**. Pi exposes some assistant/compaction usage, with hidden retries or canceled responses potentially missing. Its response count is a lower bound, not all network attempts. Codex exposes cumulative thread tokens but no complete public request count or per-run subscription dollar cost. Missing values display **Unavailable**; partial totals never claim full coverage. Provider-reported and catalog-estimated costs retain their provenance; cached and reasoning fields are not added twice. See [verified provider capabilities and accounting](run-budget-provider-notes.md).
- All logs and badges reflect actual agent events and saved state.
- Each agent phase inherits global `read`, `write`, `edit` and `bash` tools, then adds only its assigned phase tools. The `.fleet` packet records both levels and the skills allotted to each phase. Select a phase in **Build flow** to inspect the assignment, outputs and completion gate.
- Each role has a 30-minute ceiling, including session setup and artifact completion. Pi also has a 40-model-turn ceiling; Codex reports user turns rather than its internal model iterations. Five minutes without model, tool, retry, or compaction activity fails the stage with its last activity recorded. These limits settle the host run even if Pi's prompt or abort promise never returns.
- Missing or empty outputs get one targeted completion prompt per step within the same stage budget, including the post-implementation user guide. Requirements and packet integrity are checked after every agent handoff. A recovered provider retry can continue normally.
- AppYard executes generated tests independently using the Node runtime bundled with Electron.
- A failed test run gets one repair attempt and one repeat execution.
- Test runs have a 120-second and 2 MB output limit.
- Empty suites, failures, skipped tests, and incomplete results block approval.
- Source fingerprints are checked at verification, review, and export.
- Review approves a prototype; operational validation remains explicitly unverified.
- Stopping or quitting retains files and saves the stopped state with bounded cleanup. Completed, failed, and stopped runs release their concurrency slot; late session events cannot update a finished run. Restarting creates a new run directory; it does not resume the previous conversation.

Tests are agent-authored and must be reviewed for meaningful coverage. Passing them does not prove acceptance criteria or operational correctness.

## Storage and credentials

On macOS the default application state is under ~/Library/Application Support/fleetharness/ (the exact path appears in Model settings). State writes use a temporary file and rename. Previous run folders and Pi JSONL sessions remain on disk.

Each new run also writes `run-summary.json` beside its artifacts, mirrored in application state. It includes the immutable allowance/deadline, terminal reason, measured phase durations, submitted prompts, usage observations and coverage limitations. Checkpoints occur at workflow boundaries and every five seconds while active; finalization saves the latest available totals. An interrupted app reopens that run as stopped, retains its last measured elapsed time and usage, and marks the summary interrupted/partial. It does not fabricate usage during downtime or grant a new allowance to that run. Mutable summary files are excluded from source fingerprints so telemetry cannot invalidate verified application code.

An entered key is held in memory unless **Remember this key** is selected. Remembered keys use Electron safeStorage encryption and a private file; API keys are never included in the bootstrap payload sent to the UI. Existing Pi credentials remain managed by Pi. Disabling remembered storage removes AppYard's encrypted key file but keeps the current in-memory key until the app exits.

No credentials are included in delivery exports. The app does not reset corrupt state automatically.

## Development

### Compact dashboard

The original dashboard uses an 84px icon rail with short labels: Home, Flow, Preview, Agents, Review, Brief, and Files. Search and new-challenge controls sit beside the primary build action. Icons have accessible names and hover/focus tooltips; Escape dismisses a tooltip.

Challenge descriptions expand under **Challenge brief**. Select a flow stage, or use the panel icon, to inspect its owner, output, criteria, and activity. The Preview toolbar toggles activity and the review checklist independently. Test output expands on demand and opens automatically when verification fails. Approval, export, execution permissions, and readiness limitations remain explicit.

The original dashboard is the sole AppYard interface.

Use Node.js 22.19 or newer for Pi SDK compatibility; the packaged app has its own Node 24 runtime.

    npm ci
    npm run dev

Useful commands:

    npm run build
    npm test
    npm run test:flow
    npm run test:harness
    npm run test:desktop
    npm run test:budgets
    npm run test:budgets:ui
    npm run dist

The desktop smoke test drives the actual Electron application with Playwright and a **local deterministic test provider**. It exercises the real Pi SDK, file tools, independent test failure/repair, preview isolation, review, export, and persistence. It does not validate the quality or authentication of a hosted model. A live provider smoke run requires your credentials.

`npm run test:flow` runs the progress and failure regression suite without credentials. Virtual-clock tests prove inactivity, absolute-deadline, turn-budget, and cancellation behavior even when a session ignores abort. Pipeline tests exercise each agent handoff, artifact completion, bounded repair, immutable inputs, persistence, concurrency, and restart isolation. Real Pi SDK tests use a loopback provider to recover a 503, run actual file tools and Node tests, and handle stalled or rejected requests. Subprocess tests verify timeout, cancellation at process handoff, excessive output, and source mutation. These are orchestration guarantees for the tested failure modes; they do not measure hosted-model output quality.

The dist command produces the Apple Silicon app, DMG, and ZIP in release/. The pack command makes an unpacked app. Apple signing/notarization credentials are required for a publicly trusted release.

## Integration references

- [Pi SDK](https://pi.dev/docs/latest/sdk)
- [Pi model and authentication configuration](https://pi.dev/docs/latest/models)
- [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox)
