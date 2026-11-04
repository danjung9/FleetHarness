# Field Workspace · third UI version

FleetHarness V3 is designed for frontline personnel and soldiers who need a software tool for a problem in their own work. The main path is **describe the problem → create a tool → try it → review and download**. Agent logs, code, architecture, and build-stage details remain available in a secondary Technical details view.

## Open V3

```sh
npm run workbench
```

This launches the existing Electron backend with the V3 renderer and its own application-data directory. Connect through Connection & workspace, or ask your technical support team to configure it. Choose a source challenge or describe a new problem, save the request, and select Create my tool.

For browser-only planning:

```sh
npm run workbench:web
```

Open [the local field workspace](http://127.0.0.1:5176/workbench/index.html). The root URL redirects to this V3 entry. Browsing, requests, draft restoration, and request downloads work in the browser. Tool creation and local artifact access require desktop. A downloaded request can be imported in Connection & workspace.

## Separation from the existing interfaces

| Resource | V3 location |
| --- | --- |
| Renderer | `src/workbench/` |
| Entry | `workbench/index.html` |
| Vite configuration | `vite.workbench.config.ts` |
| Production bundle | `dist-workbench/` |
| Browser saved requests | `fleetharness-workbench-v1` |
| Browser draft keys | `fleetharness-workbench-draft-*` |
| Desktop data directory | `FleetHarness Workbench` under the OS application-data directory |
| Data-directory override | `FLEET_WORKBENCH_USER_DATA` |

The original `dev`, `build`, and `studio` commands keep their existing behavior. V3 reads shared backend contracts and components without replacing the existing renderers, CSS, catalog, or global product/design records. A separate [product record](workbench/PRODUCT.md) captures the confirmed frontline audience; the [direction](workbench-direction.md) and scoped design records describe this interface.

## Build and verification

```sh
npm run build:workbench
npm run test:workbench
```

The smoke check uses temporary browser and desktop state plus a deterministic local model fixture. It verifies catalog filtering, mobile drill-in, draft restoration, creating and editing requests, storage separation, keyboard interaction, model connection, actual agent/tool orchestration, a failed test followed by repair, independent verification, a functioning isolated preview, source inspection, system design, the human approval gate, and source/evidence export. Screenshots are written under `output/playwright/workbench/`.

The shared standalone-app download component is exposed after approval. V3's smoke check covers source/evidence export; executable packaging is exercised by the separate shared backend tests. Hosted provider authentication, live model output quality, and operational readiness are outside the V3 UI test's claims.

No generated or passing result is preloaded into the browser catalog. The test fixture is explicitly labeled as such. Both prototype limitations and user approval remain visible in the review flow.
