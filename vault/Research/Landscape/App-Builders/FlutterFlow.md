---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Additional comparator for visual mobile app building, exportable code and explicitly designed local storage."
---

# FlutterFlow

## Bottom line

[R] Include FlutterFlow because native mobile delivery and local data matter to FleetHarness's disconnected use case. [V] It generates Flutter projects that can be exported and run without FlutterFlow (https://docs.flutterflow.io/resources/projects/). [R] Borrow visual flow inspection and code handoff, while keeping UI generation distinct from working backend behavior. [A] A Navy deployment, complete offline sync solution and current platform breach were not verified.

## The first ten minutes

[E] Proposed documentation-based script, reviewed November 4, 2026; no live build was run. [A] The first ten minutes should target a reviewable screen flow, not promise a complete app with identity and sync.

1. [R] Minute 0 to 1: personally open FlutterFlow Designer through https://docs.flutterflow.io/designer/ and sign in if required.
2. [R] Minute 1 to 3: prompt for three mobile screens: fictional training requests, request detail and conflict review. Require visible unsent-change and connection status labels.
3. [R] Minute 3 to 5: inspect screen order, readable text and the relationship between the save and approve actions. Select an element and request one change.
4. [R] Minute 5 to 7: export the design to a FlutterFlow project. Record that exported design is not yet an implemented database or sync engine.
5. [R] Minute 7 to 9: inspect the action flow for Save. If a working action exists, exercise it in Test or Run mode. If not, label it unfinished rather than simulating success.
6. [R] Minute 9 to 10: identify the local-storage and authentication choices for the next increment. Save the project. Leave deployment and external connections unexecuted.

[V] Designer supports prompt-based UI generation and export into FlutterFlow, as PNGs, or as an agent prompt. The design export is distinct from full application source export (https://docs.flutterflow.io/designer/, https://docs.flutterflow.io/designer/export/).

## How it decides, asks and checks

[V] FlutterFlow's visual builder combines screens, state and action flows; its plan comparison lists visual logic, live debugging and paid testing features (https://docs.flutterflow.io/accounts-billing/plan-comparison/). [A] A mandatory requirements questionnaire was not verified. [R] Supply the flow and error cases rather than only a style description.

[V] The desktop AI Agent workflow documents reviewing a proposed change before applying it and then checking it visually. That workflow runs an account-specific external agent and sends relevant context to its provider (https://docs.flutterflow.io/concepts/ai-agent/). [R] Do not expose the officer to agent installation during the first experience; prepare the environment separately.

[R] Check the actual save action, app restart, denied permissions and data isolation. A successful Test Mode click does not establish behavior in an installed native app.

## Data, login and offline behavior

[V] Supported authentication choices include Firebase, Supabase and custom authentication (https://docs.flutterflow.io/integrations/authentication-types/). [R] Treat identity and data authorization as separate configurations. Test the backend with two synthetic users and keep private API credentials off the client.

[V] SQLite integration provides local storage and transactional operations, but the documentation explicitly excludes web-based apps (https://docs.flutterflow.io/integrations/database/sqlite/). [R] Use a native local-storage workflow for the disconnected experiment. Define duplicate handling, conflicts, deleted records, expired login and synchronization before claiming offline readiness. Local storage alone does not implement sync.

## Incidents and independent evaluation

[V] A first-person GitHub issue opened June 7, 2026 reports login working in legacy Test Mode but failing in the new mode due to a sandbox CORS failure. It includes reproduction steps. This is a bounded reliability report, not a confirmed platform compromise or general failure-rate study (https://github.com/FlutterFlow/flutterflow-issues/issues/7190).

[A] Targeted searches did not verify a FlutterFlow-specific public breach or a controlled independent security assessment of current generated apps. Search results for the unrelated Flutter gambling company were excluded. [R] Do not substitute an infrastructure compliance claim for a test of Firestore rules, Supabase policies or private API handling.

## Where it gets hard, export and price

[R] Budget engineering effort for action-flow complexity, custom code, plugin behavior, schema changes, native signing and synchronization. Assign ownership of exported code and decide whether later edits return to the visual project or continue in a code repository.

[V] FlutterFlow says a project contains generated Flutter code and runs as a normal Flutter app after export (https://docs.flutterflow.io/resources/projects/). [A] Completely offline builder authoring was not verified. [R] Verify the exported application's dependencies separately, including fonts, analytics, auth refresh and backend calls.

[V] Monthly list prices at retrieval are Free, Basic $39, Growth first seat $80 and Business first seat $150; the comparison lists paid local run and CLI, with GitHub push starting at Growth. AI generation quotas vary by plan (https://docs.flutterflow.io/accounts-billing/plan-comparison/). [A] Exact source-download entitlement should be confirmed before purchase. [R] Include backend, app-store and external-agent charges rather than pricing only the visual editor.

## Sources

- [V] Designer: https://docs.flutterflow.io/designer/
- [V] Design export: https://docs.flutterflow.io/designer/export/
- [V] Desktop agent: https://docs.flutterflow.io/concepts/ai-agent/
- [V] Authentication: https://docs.flutterflow.io/integrations/authentication-types/
- [V] SQLite: https://docs.flutterflow.io/integrations/database/sqlite/
- [V] Independent first-person reliability report: https://github.com/FlutterFlow/flutterflow-issues/issues/7190
- [V] Generated projects: https://docs.flutterflow.io/resources/projects/
- [V] Plans: https://docs.flutterflow.io/accounts-billing/plan-comparison/
