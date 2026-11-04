# FleetHarness Studio

A separate Startups.RIP-inspired interface: browse Norfolk challenges, create a new challenge, edit saved briefs, and run the existing Pi software-factory workflow.

## Open Studio

- `npm run studio` launches the Electron Studio with the real backend. Connect a provider in Pi settings, choose a challenge or create one, then generate software.
- `npm run studio:web` serves the browser preview at http://127.0.0.1:5174/studio/index.html. This supports the directory, bookmarks, drafts, and saved-brief editing. Agent execution, files, review, and delivery require Electron.
- `npm run build:studio` builds only the alternate renderer into `dist-studio/`. The main app's `dist/` output and entry are untouched.
- `npm run test:studio` runs browser and Electron integration checks against a local fixture model. It uses installed Chrome by default; `FLEET_BROWSER_CHANNEL` selects another installed Playwright browser channel. No live model credits are used.

The desktop launcher serves on port 5175, or the next available port, so the browser preview can remain open alongside it. The original app still uses its existing commands.

## Independence

Studio adds `studio/index.html`, `src/studio/`, `vite.studio.config.ts`, and `scripts/studio.mjs`. It uses the original Electron main process and preload bridge without modifying them. The catalog, recipes, skills, domain tools, verification, approval, and delivery implementation are shared.

Desktop state lives in a separate `FleetHarness Studio` directory under the platform's application-data directory (on macOS, `~/Library/Application Support/FleetHarness Studio`). Override it with `FLEET_STUDIO_USER_DATA`. Browser state uses `fleetharness-studio-preview-v1`, with separate `studio-draft-*` and `studio-bookmarks` keys. The original app's saved data is never migrated or overwritten.

## Briefs and builds

The editor captures overview, requirements, expected deliverable, evaluation criteria, resources, and links. All six sections reach the same backend: the context is serialized into `Project.description`, and each evaluation line becomes a `Project.criteria` entry. A versioned JSON suffix preserves exact editable sections without changing the backend's schema. The compiled description must fit its existing 16,000-character limit.

Catalog entries retain `challengeId`, so the backend selects the existing domain recipe, skills, and tools. Custom challenges use the existing provisional workflow recipe. Source requirements remain separate from the user's chosen scope. Suggested deliverables and evaluation criteria are labeled as FleetHarness suggestions; they are not presented as official judging criteria.

The catalog uses the repository's 34 captured Norfolk entries. The live source requires sign-in. Resources listed on each challenge are required inputs, not supplied datasets. Reference libraries are candidates, not verified integrations.

`My builds` reopens or edits saved challenges. Editing a running build is blocked. Editing a completed brief resets its verification status; a new run gets a new workspace. The original run's files remain on disk.

Browser briefs can be downloaded as JSON and imported in Studio's Pi settings. Browser storage and desktop storage are intentionally separate. External links open in a browser tab in web mode. Electron preserves the existing navigation restrictions and offers link copying.

## Generation scope

The shared backend produces self-contained browser prototypes using synthetic data, actual source files, Node tests, an independent test run, one repair attempt, human review, and export. It does not automatically provide production integrations or establish operational readiness across all 34 use cases. A live provider must be connected for real model generation; the integration test uses an explicitly labeled local fixture.
