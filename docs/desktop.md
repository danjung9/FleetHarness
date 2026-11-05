# AppYard desktop

AppYard is an Electron application backed by **Codex 0.166.0 or Pi SDK 1.5.0**. It runs real model sessions with local coding tools; an idle workspace does not contain simulated agents or invented test results.

## Run the packaged app

On Apple Silicon, open release/mac-arm64/AppYard.app, or install from release/AppYard-0.1.0-arm64.dmg.

The local build is ad-hoc signed. It is not Apple Developer ID signed or notarized for public distribution.

1. Open **Model settings** and select a build engine. For subscription builds, choose **Codex · ChatGPT subscription**, sign in, select a model, and save. See [ChatGPT setup](chatgpt.md).
2. For Pi, supply an API key, or reuse existing Pi authentication in ~/.pi/agent/auth.json. Provider environment variables are supported when inherited by the app. Pi-compatible custom endpoints in ~/.pi/agent/models.json are also loaded.
3. Choose **New challenge** to import a Norfolk catalog entry, use a sample brief, or write a custom problem. Review the acceptance criteria. In **Data & inputs**, attach sample files or paste input records for the agents to use.
4. Choose **Start build**. Intake, research, planning, implementation and verification roles execute sequentially in a dedicated folder. Up to three challenges can run concurrently.
5. Inspect **Development**, **Agents**, and **Artifacts**. Reload the preview once the browser or service runtime is ready. CLI solutions provide a command-line engine and startup instructions.
6. Review **Evidence & delivery**, enter review notes, and approve the prototype. Browser solutions offer a standalone app download; CLI and service solutions offer **Export runnable package**. Source exports include requirements, test output, and your review.

Pi agents have local read, write, edit, and shell tools. A separate project folder is **not an operating-system sandbox**. Only start runs you trust. The selected provider receives requirements and model/tool context and may charge for usage. There is no deployment or publishing integration.

### Brief data and synthetic examples

**Data & inputs** is available when creating or editing a brief. Attach UTF-8 CSV, TSV, JSON, NDJSON, GeoJSON, TXT, Markdown, XML, YAML, or log files, or paste named text inputs. Each brief accepts up to ten inputs, 256 KB per input and 1 MB in total. Saved inputs survive reopening the project; remove an input to exclude it from the next build. Resource descriptions and reference links remain background context, not connected datasets or automatic network access.

When a build starts, AppYard copies supplied inputs into `inputs/` and writes `inputs/manifest.json`. Agents use those files for the workflow, implementation and tests. If no inputs were supplied, a dedicated **synthetic data agent** runs after scope discovery, within the intake phase, using the selected Codex or Pi model. It creates `data/synthetic-data.json` and `data/README.md` for this use case, with a field schema, fictional records, typical/edge/invalid scenarios, expected behavior and limitations. The host validates these artifacts before research and planning begin. Missing or invalid outputs receive one completion attempt; continued failure blocks the build.

The input copies and validated synthetic artifacts are checked for changes after agent handoffs. They are inspectable in **Files** and included in the source/evidence export. Generated examples must remain labeled as synthetic in the resulting app. This prepares local samples; it does not establish a live connection to an external service.

Run `npm run test:brief-data` to exercise file attachment, pasted-input drafts, persistence, removal, and both build paths in the desktop app using the local fixture provider.

## Current delivery contract

New builds declare a browser, CLI or service runtime with computational capabilities, testable source and documentation. Browser previews serve declared local assets on a separate loopback origin; service previews start the declared runtime from a clean temporary package. The browser frame has no desktop IPC bridge or Node integration. CLI solutions use the command line and have no visual preview.

### Standalone app downloads

After a build passes verification and you approve it, **Download executable** opens a save dialog and packages the verified application for the build machine's OS and processor. The ZIP contains a macOS `.app`, a Windows `.exe` with its supporting files, or a Linux executable with its supporting files, plus `START-HERE.txt`. Extract the whole ZIP before opening the app. The end user needs neither AppYard nor Node.js nor an AI account.

AppYard uses [Electron Packager](https://electron.github.io/packager/main/) with the same Electron version as its host. The first download may need network access to obtain the runtime; subsequent downloads reuse Electron's cache. Packaging runs separately with a ten-minute limit. Closing AppYard interrupts packaging; reopening shows a retry action. Editing requirements or starting another run clears the previous download state. Source fingerprints are checked before packaging and again before saving; source changes require a new verified build.

Browser profiles package the declared local delivery files and a host-controlled desktop wrapper. The wrapper serves only declared web assets and never executes generated code in its main process. AppYard credentials and sessions are excluded. CLI/service profiles use the runnable source export, with their declared dependencies and setup instructions. The wrapper preserves offline browser storage under a stable, project-specific application-data directory and disables renderer Node integration, external network requests, navigation, popups, and permissions. Preview data is separate from the standalone app's data.

macOS packages are ad-hoc signed, not Developer ID signed or notarized. Windows packages have no publisher signature. OS approval may therefore be required; this is a prototype distribution path. Cross-compilation, installers, automatic updates, and public-release signing are not provided. The executable smoke test has been run on macOS Apple Silicon; Windows and Linux need validation on their own build machines.

Run `npm run test:executable` to verify approval, save cancellation, packaging, ZIP extraction, standalone launch, local persistence, renderer isolation, concurrent-change protection, and stale-source rejection. To test the packaged AppYard host, run `FLEET_EXECUTABLE="/absolute/path/to/AppYard.app/Contents/MacOS/AppYard" node scripts/smoke-executable.mjs` after `npm run pack`. The fixture is independently tested and requires no model credentials.

After implementing the app, the build agent writes `README.md` in a dedicated follow-up step within the same session and time budget. This user guide explains quick start, the main workflows, a synthetic example with expected results, input formats, data persistence, troubleshooting, limitations, and developer test commands. Open `README.md` in **Artifacts / Files** or in the exported source folder. Verification and repair keep the guide aligned with the final application before the host records its source fingerprint. A missing or empty guide blocks completion.

The declared Node/Python CLI and service profiles are supported. Arbitrary runtime commands, production data connectors, distributed/offline transport, and operational readiness remain outside this release's verified scope. Domain toolkit calculations and synthetic fixtures are separate from generated-application tests.

The 34-entry catalog, recipe preparation, reusable skills, and seven domain tools come from harness/.

## Evidence and control

- All logs and badges reflect actual agent events and saved state.
- Each agent phase inherits global `read`, `write`, `edit`, `bash`, `fleet_helpers` and `fleet_run_helper` tools, then adds only its assigned phase tools. The helper tools let agents discover, test and run [project-local utilities](agent-helpers.md) through a separate sandbox. The `.fleet` packet records both levels and the skills allotted to each phase. Select a phase in **Build flow** to inspect the assignment, outputs and completion gate.
- Build, verification and repair agents receive [a host-managed browser](agent-browser.md) for opening the app, clicking/typing and inspecting screenshots with console errors. Both backends pass actual images to image-capable models. Reopening refreshes the preview from current source; stage completion or cancellation releases it. Development screenshots are separate from independent acceptance evidence.
- Browser/service stages require recorded initial visual reviews and fresh rechecks at desktop and narrow widths. Unresolved findings, missing reviews and screenshots of older app files block completion. **Review → Visual review** shows the images, observations and fixes; `visual-review.json` is exported with the evidence. Verification and repair repeat the loop in their own sessions. CLI solutions are exempt.
- Worker phases have no turn-count limit. Each phase has a 30-minute ceiling, including session setup and artifact completion. Five minutes without model, tool, retry, or compaction activity fails the stage with its last activity recorded. These time limits settle the host run even if Pi's prompt or abort promise never returns. The separate [project lead conversation](project-conversation.md) retains its own response budget.
- Missing or empty outputs get one targeted completion prompt per step within the same stage budget, including the post-implementation user guide. Requirements and packet integrity are checked after every agent handoff. A recovered provider retry can continue normally.
- AppYard executes generated tests independently using the Node runtime bundled with Electron.
- Core evaluation, the first complete user workflow and final verification each have a separate allowance of up to three repairs and fifteen active minutes. Repeated failures without semantic progress stop earlier. The primary workflow runs at both widths before remaining application interactions are completed.
- Test runs have a 120-second and 2 MB output limit.
- Empty suites, failures, skipped tests, and incomplete results block approval.
- Source fingerprints are checked at verification, review, and export.
- Review approves a prototype; operational validation remains explicitly unverified.
- Stopping or quitting retains files and waits for the stopped state to be saved. Completed, failed, and stopped runs release their concurrency slot; late session events cannot update a finished run.
- When a phase shows **Needs attention** or **Stopped**, choose **Resume intake**, **Resume research**, **Resume planning**, **Resume implementation**, or **Resume testing** in the phase panel or journey header. AppYard reopens the saved run and workspace, preserves completed phases, and starts a fresh agent session at the interrupted phase. The host validates the saved checkpoint and protected inputs before continuing. Resume preserves consumed functional repair attempts and time; independent verification must pass again. An unclean interruption consumes the pending repair time allowance because its elapsed work cannot be established. Resuming requires the desktop app and a connected model. **Start new build** remains available to begin from the current brief in a separate run folder. Older runs without a trusted checkpoint retain their outputs and require a new build.

Developer tests are agent-authored. New runs also require host-owned computational scoring, a clean runtime, and browser journeys when applicable. Passing proves the specified cases; it does not establish domain validity or operational correctness. See [computational solutions and evidence](solution-evaluation.md) for evaluator limits and the factory benchmark.

## Storage and credentials

On macOS the default application state is under ~/Library/Application Support/fleetharness/ (the exact path appears in Model settings). State writes use a temporary file and rename. Previous run folders and Pi JSONL sessions remain on disk.

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
    npm run dist

The desktop smoke test drives the actual Electron application with Playwright and a **local deterministic test provider**. It exercises the real Pi SDK, file tools, independent test failure/repair, preview isolation, review, export, and persistence. It does not validate the quality or authentication of a hosted model. A live provider smoke run requires your credentials.

`npm run test:flow` runs the progress and failure regression suite without credentials. Virtual-clock tests prove inactivity, absolute-deadline, optional turn-budget, and cancellation behavior even when a session ignores abort. Pipeline tests exercise each agent handoff, artifact completion, bounded repair, immutable inputs, persistence, concurrency, and restart isolation. Real Pi SDK tests use a loopback provider to recover a 503, run actual file tools and Node tests, and handle stalled or rejected requests. Subprocess tests verify timeout, cancellation at process handoff, excessive output, and source mutation. These are orchestration guarantees for the tested failure modes; they do not measure hosted-model output quality.

The dist command produces the Apple Silicon app, DMG, and ZIP in release/. The pack command makes an unpacked app. Apple signing/notarization credentials are required for a publicly trusted release.

## Integration references

- [Pi SDK](https://pi.dev/docs/latest/sdk)
- [Pi model and authentication configuration](https://pi.dev/docs/latest/models)
- [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox)

## Computational runtimes and evidence

New builds plan mandatory computational capabilities and an executable runtime alongside user interactions. The host checks the core before completing the app, installs declared locked dependencies into a fresh temporary package, and evaluates generated outputs with frozen host-owned checks. Browser journeys exercise the same delivered package. The evidence view shows dataset provenance, thresholds, scores and failures. Missing model configuration is a failure; no fake inference fallback is accepted.

Browser profiles can be downloaded as standalone apps. CLI and service profiles use **Export runnable package**; follow the included README to install dependencies and configure required environment variables on the destination machine. CLI solutions have no browser preview. Service previews start the declared loopback service in a disposable runtime.

See [solution evaluation](solution-evaluation.md) for supported runtimes, scorer limitations and reproducible factory benchmarks.
