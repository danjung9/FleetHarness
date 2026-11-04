# FleetHarness desktop

FleetHarness is an Electron application backed by **Pi SDK 1.5.0**. It runs real model sessions with local coding tools; an idle workspace does not contain simulated agents or invented test results.

## Run the packaged app

On Apple Silicon, open release/mac-arm64/FleetHarness.app, or install from release/FleetHarness-0.1.0-arm64.dmg.

The local build is ad-hoc signed. It is not Apple Developer ID signed or notarized for public distribution.

1. Open **Pi settings** and choose a provider and model.
2. Supply an API key, or reuse existing Pi authentication in ~/.pi/agent/auth.json. Provider environment variables are supported when inherited by the app. Pi-compatible custom endpoints in ~/.pi/agent/models.json are also loaded.
3. Choose **New challenge** to import one of the 34 Norfolk catalog entries, use a sample brief, or write a custom problem. Review the acceptance criteria.
4. Choose **Start build**. Pi planning, implementation, and verification roles execute sequentially in a dedicated folder. Up to three challenges can run concurrently.
5. Inspect **Development**, **Pi sessions**, and **Artifacts**. Reload the preview after the agent has written index.html.
6. Review **Evidence & delivery**, enter review notes, and approve the prototype. Export copies source, requirements, test output, and your review into a new destination folder.

Pi agents have local read, write, edit, and shell tools. A separate project folder is **not an operating-system sandbox**. Only start runs you trust. The selected provider receives requirements and model/tool context and may charge for usage. There is no deployment or publishing integration.

## Current delivery contract

The first release targets a dependency-free, self-contained index.html application, testable source, Node test files, and documentation. The preview uses a separate loopback origin for each run, supports its own browser storage, and blocks network requests through a content policy. It has no desktop IPC bridge or Node integration.

Native backends, arbitrary framework dev servers, production data connectors, distributed/offline transport, and operational readiness are outside this release's verified scope. Domain toolkit calculations and synthetic fixtures are separate from generated-application tests.

The 34-entry catalog, recipe preparation, reusable skills, and seven domain tools come from harness/.

## Evidence and control

- All logs and badges reflect actual Pi events and saved state.
- Pi receives selected domain skills and tools from the prepared .fleet packet.
- Each role has a 40-turn and 15-minute ceiling.
- FleetHarness executes generated tests independently using the Node runtime bundled with Electron.
- A failed test run gets one Pi repair attempt and one repeat execution.
- Test runs have a 120-second and 2 MB output limit.
- Empty suites, failures, skipped tests, and incomplete results block approval.
- Source fingerprints are checked at verification, review, and export.
- Review approves a prototype; operational validation remains explicitly unverified.
- Stopping or quitting retains files. Restarting creates a new run directory; it does not resume the previous conversation.

Tests are agent-authored and must be reviewed for meaningful coverage. Passing them does not prove acceptance criteria or operational correctness.

## Storage and credentials

On macOS the default application state is under ~/Library/Application Support/fleetharness/ (the exact path appears in Pi settings). State writes use a temporary file and rename. Previous run folders and Pi JSONL sessions remain on disk.

An entered key is held in memory unless **Remember this key** is selected. Remembered keys use Electron safeStorage encryption and a private file; API keys are never included in the bootstrap payload sent to the UI. Existing Pi credentials remain managed by Pi. Disabling remembered storage removes FleetHarness's encrypted key file but keeps the current in-memory key until the app exits.

No credentials are included in delivery exports. The app does not reset corrupt state automatically.

## Development

Use Node.js 22.19 or newer for Pi SDK compatibility; the packaged app has its own Node 24 runtime.

    npm ci
    npm run dev

Useful commands:

    npm run build
    npm test
    npm run test:harness
    npm run test:desktop
    npm run dist

The desktop smoke test drives the actual Electron application with Playwright and a **local deterministic test provider**. It exercises the real Pi SDK, file tools, independent test failure/repair, preview isolation, review, export, and persistence. It does not validate the quality or authentication of a hosted model. A live provider smoke run requires your credentials.

The dist command produces the Apple Silicon app, DMG, and ZIP in release/. The pack command makes an unpacked app. Apple signing/notarization credentials are required for a publicly trusted release.

## Integration references

- [Pi SDK](https://pi.dev/docs/latest/sdk)
- [Pi model and authentication configuration](https://pi.dev/docs/latest/models)
- [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox)
