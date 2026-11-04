# Live system design

Every new build asks the planning agent to publish the application architecture early through `fleet_system_design`. The tool validates 1–12 major components, their source files, and up to 24 directed, labeled connections. It saves `system-design.json` in the run workspace and publishes the same definition to the UI. Components describe the application being built, rather than AppYard's build pipeline.

The implementation and verification agents call `fleet_component_progress` as they work. Each update is broadcast through the existing application state subscription and persisted locally. Statuses are **Planned**, **Building**, **Generated**, and **Blocked**. Interrupted work displays **Stopped** or **Blocked**, depending on the run outcome. A new run or an edited brief clears the old design.

**Generated** means the agent reports implementation and every mapped source file exists and is nonempty. It does not certify functionality. Independent test results remain application-wide, and human review remains required. Repair can move a generated component back to Building. Component progress is stored outside the source workspace so updates cannot invalidate verification hashes. The architecture file itself is included in those hashes and the exported source bundle.

In the desktop app, **System design** is available in Flow and beside App preview; new builds open the diagram automatically. Select a component to inspect its responsibility, current progress, source filenames, and labeled connections. Wide diagrams scroll within their panel. Earlier saved runs without a design show an explanatory empty state.

Planning must publish a valid design before advancing. Build and verification stages require component completion reports, with the existing single completion attempt used for missing reports. These reports are model-authored; files existing is a necessary check, not proof of implementation quality. The planner should name simulated integrations explicitly and keep diagrams focused on roughly 3–8 components.

Run `npm test` for validation, persistence, cancellation, and source-integrity checks. Run `npm run test:system-design` for the deterministic local-provider workflow, live UI transitions, repair, reload, stale-design clearing, interrupted states, and default/minimum desktop sizes. The fixture does not call a hosted model or establish hosted-model output quality.
