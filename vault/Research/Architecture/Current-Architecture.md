---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "The existing Electron controller runs three sequential Pi sessions, verifies generated tests and gates local export on human review."
---

# Current architecture

## Bottom line

[E] FleetHarness already has a compact implementation: two React interfaces share one Electron controller, Pi backend, recipe library and delivery path. [E] One successful build normally creates three model sessions, with a fourth for one repair after failed automated verification. [E] Previews have a meaningful browser boundary, while coding tools and generated Node tests run with host process authority. [R] Keep this structure and strengthen its execution and evidence boundaries before expanding the number of agents.

## Evidence scope

[E] All code observations refer to `~/Documents/CDAO/FleetHarness`, branch `mvp`, commit `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`, inspected November 4, 2026. Relative paths below are inside that clone. Git reported a clean working tree during inspection. [E] No runtime was launched or measured. Counts and limits below come from source, not timing experiments; estimates are marked [A].

[E] Version notice: at the final source check, about 1:46 PM EST, the clone had advanced to `0f175a8ce346521c4462fc134d40c0973eac1323`. The main review remains pinned to the requested `f72c5dc`. The limited late-change comparison below identifies material overlap; do not apply the three-session count to the newer revision.

## Components and process boundaries

| Component | Observed responsibility and boundary |
| --- | --- |
| [E] Original renderer, `src/App.tsx`, `src/api.ts` | Challenge intake, flow/design views, preview, activity, settings, evidence and export. The browser-only fallback saves draft state in localStorage and cannot run agents. |
| [E] Alternate renderer, `src/studio/Studio.tsx`, `src/studio/api.ts`, `src/studio/brief.ts` | Catalog-first Studio and structured brief editor. Uses the same desktop API. Browser drafts and Studio desktop storage are separate from the original dashboard. |
| [E] Preload, `electron/preload.cts:3` | Exposes named IPC methods rather than arbitrary IPC or Node access. |
| [E] Electron main, `electron/main.ts:21` | Checks the sender and main frame, validates requests, owns Store and PiBackend, handles credentials, preview, approval, export and shutdown. |
| [E] Pi orchestration, `electron/pi-backend.ts:94`, `electron/agent-runner.ts:9` | Pi SDK sessions execute in the main Node process. There is no separate FleetHarness agent-worker process. SDK tools may create subprocesses; their internals were not audited. |
| [E] Domain layer, `harness/catalog.ts`, `recipes.ts`, `planner.ts`, `integration.ts` | Captured catalog, ten recipe families, stage prompts, selected skills, synthetic fixtures and reusable calculation modules. |
| [E] Domain tools, `harness/pi-tools.ts`, `tool-registry.ts`, `tools/` | Seven registered tools: catalog lookup and six deterministic domain operations. They validate inputs; they do not provide operational connectors. All seven are registered for every session. |
| [E] Verification, `electron/verification.ts:14` | Starts a separate Electron executable in Node mode to execute discovered application tests. Uses a restricted environment-variable set, but no OS filesystem or network sandbox. |
| [E] Preview, `electron/preview.ts:10` | Creates a loopback HTTP server for each workspace, serving only index.html at a random token path. CSP blocks network connections. An iframe displays it without the preload bridge. |
| [E] Persistence, `electron/storage.ts:24` | Serializes application state through a queued temporary-file/rename operation. Requirements, generated files and SDK sessions live on disk. |
| [E] CLI, `harness/cli.ts`, `evaluate.ts` | Separate catalog/packet/tool entry point. Its eleven-check deterministic demo evaluates toolkit fixtures, not generated apps or model quality. |

[E] Plain text diagram, based on the imports and calls above:

```text
Officer
  |
  v
React dashboard OR Studio renderer (no Node integration)
  | named preload methods / IPC             ^ state notifications
  v                                        |
Electron main process ---------------------+
  | Store + PiBackend + ModelRuntime + local domain tools
  |
  +--> selected model provider (brief, tool context, responses)
  |
  +--> Pi session: plan -> build -> verify -> [optional repair]
  |      | read / write / edit / bash, ordinary host permissions
  |      v
  |    userData/workspaces/projectId/runId/
  |
  +--> generated Node tests (separate host child/process group)
  |      -> TAP + exit code + source hash -> report in Store
  |
  +--> loopback preview server -> separate-origin sandboxed iframe
  |
  +--> human approval -> hash check -> folder dialog -> file copy
                                             |
                                             v
                               exported app + tests + evidence
```

[E] `electron/main.ts:122` enables context isolation and the renderer sandbox and disables Node integration and webviews. Navigation, new windows and permission requests are denied at lines 124 to 127. [E] These settings do not constrain Pi's host-side tools or the Node verification child. [E] `electron/codex-rpc.ts` is present but has no importer in the inspected execution path; main constructs PiBackend. Its process-group cleanup must not be credited to Pi runs.

## One build, start to finish

1. [E] Intake saves a validated title, description and 1 to 30 criteria through `main.ts:48` and `storage.ts:8`. The original dashboard has a start disclosure at `src/App.tsx:258`; Studio calls start directly from its editor/workspace at `src/studio/Studio.tsx:76,152`. There is no separate persisted approval of the agent's derived plan before implementation.
2. [E] `PiBackend.start`, lines 53 to 86, rejects duplicate starts and more than three active projects. It resolves one configured provider/model for the whole run, allocates a UUID and a new workspace, clears current report/approval, and writes requirements.md.
3. [E] `prepareFleetWorkspace`, `harness/integration.ts:14`, writes `.fleet/packet.json`, fixtures, tool schemas, six toolkit modules, selected skill files, README and manifest. The copied module names are `validation`, `messages`, `scheduling`, `offline`, `evidence` and `readiness`. The controller retains the packet digest and original requirements text in memory.
4. [E] Research and planning become active together, but one planning session performs both (`pi-backend.ts:170`). It must publish the application system design and write scope.md, research.md, plan.md and test-matrix.md. The design tool validates structure and records component filenames, not application correctness.
5. [E] A fresh build session reads the plan and implements index.html, core logic, tests, README and path-to-fleet.md. Component progress is agent-reported and requires nonempty mapped files (`system-design.ts:57`). It is deliberately distinct from verified behavior.
6. [E] A fresh verification session can inspect and edit both source and tests. It writes verification.md. After each session, input-integrity and required-artifact checks run; missing outputs get one additional prompt in that same session (`pi-backend.ts:135`).
7. [E] The controller discovers nonempty test/spec files outside `.fleet`, runs Node's test runner, gathers TAP and exit status, and checks source hashes before and after execution (`verification.ts:19`). A pass requires positive equal total/passed counts, zero failed/skipped/todo, and exit zero.
8. [E] A failed report triggers one new repair session, then one more controller test run (`pi-backend.ts:182`). A thrown setup/integrity error takes the failure path instead of automatically receiving repair. A second failing report blocks normal advancement to review.
9. [E] The person tries the preview, enters a review note and approves. `main.ts:40,70` requires an idle project, passing report and matching source hash. Approval writes review.json with a prototype-only scope. Export checks those conditions and approval again, asks for a destination, copies artifacts and adds DELIVERY.md. See the check/copy timing risk in [[Research/Architecture/Findings]].

## Model sessions, context and repeated work

| Session | Initial context and requested reads | Output / repetition |
| --- | --- | --- |
| [E] 1, plan | Pi base prompt, FleetHarness boundary text, all registered tool definitions, selected skill paths, packet pointer/unknowns, intake + research + plan prompts, system-design instruction; reads requirements and selected context. | Four planning documents and design. Research is not another session. |
| [E] 2, build | New conversation, same model and medium thinking, common context and skills, intake + build prompts; reads requirements, research, plan and design. | App, core, tests, delivery notes and progress calls. Earlier planning conversation is not resumed. |
| [E] 3, verify | New conversation and common context; intake + verify prompts; requested inspection of requirements, plan, source and tests. | May revise implementation and tests; writes verification.md. Domain guidance also asks it to run tests, before the controller runs them again. |
| [E] 4, repair, conditional | Another new conversation, common context and verify-stage prompt, failed test-report.json plus repair instructions. | Repairs, updates evidence and repeats required-output checks, followed by a second controller test run. |

[E] `SessionManager.create` is called per role (`pi-backend.ts:113`). The application supplies file references and instructions, not the previous role's full conversation. Exact SDK-expanded prompts, skill loading volume, caching behavior and actual files read are not measured. [E] Skills are selected, but tool schemas and toolkit fixture packaging are not filtered to the recipe: `createFleetTools()` maps the entire registry and preparation writes all fixtures/modules.

[E] Normal successful control flow has 3 sessions and 3 initial `session.prompt` calls; artifact completion can increase prompt calls to 6 without adding sessions. A repair path has 4 sessions and 4 to 8 prompt calls. These are not counts of model API requests: one prompt may contain many turns, tool calls, retries and compaction work.

[E] Per run, stages and controller verification run sequentially. Up to three different project runs can overlap (`pi-backend.ts:55`). There is no file-level parallel coding DAG in this implementation. SDK-internal parallel tool scheduling was not inspected. [E] Frontend progress updates and disk saves can overlap with asynchronous model work; the main process also executes synchronous domain calculations.

## Where time and tokens go

| Work | Code-derived fact | Estimate or measurement gap |
| --- | --- | --- |
| [E] Model work | Each session allows 40 turns, 30 minutes, 5 minutes inactivity; completion prompts share that budget (`agent-runner.ts:5`). SDK retry is enabled with maxRetries 2 and compaction enabled (`pi-backend.ts:100`). | [A] Generation and rereading files are likely the largest elapsed-time and token costs. No share or dollar amount is measured. |
| [E] Nominal ceilings | Three sessions permit up to 120 turns and 90 minutes of session deadlines; repair makes 160 turns and 120 minutes. One/two controller test runs each have a 120-second timeout and 2 MB output limit. | [A] These are arithmetic ceilings for those bounded sections, not an end-to-end SLA. Setup, hashing, persistence and event-loop delays are not covered by one total run deadline. |
| [E] Repeated context | Common prompts, skills and tool descriptions recur in every fresh session. Requirements and plan are read repeatedly. Studio embeds both prose and JSON copies of its brief (`src/studio/brief.ts:34`). | [A] Removing redundant context should reduce input tokens; the percentage needs a recorded request comparison. Provider caching cannot be assumed. |
| [E] Repeated generation | Planning produces several overlapping documents. Builder creates inline browser logic plus testable core; verifier is asked to keep them consistent. Missing artifacts and component progress can trigger completion prompts. | [A] Fewer deterministic packaging tasks left to the model should reduce avoidable turns without removing review. |
| [E] Repeated execution | Agent-side tests may precede the mandatory controller test run. Repair repeats inspection and controller verification. Source hashing rereads artifacts at tests, approval and export. | [A] Hashing is a required integrity cost; cache only immutable snapshots. No filesystem bottleneck was measured. |
| [E] Instrumentation | Reports record test duration; activity has timestamps. The application has no aggregate model token, cache, cost or per-stage duration fields (`shared/types.ts`, `pi-backend.ts:117`). | [E] Runtime, token totals, cost, throughput and savings cannot be reported from this review. |

## Persistence and recovery

[E] Under Electron userData, state.json contains projects, latest run status, settings identifiers, report and bounded activity history. `storage.ts:51` queues writes to state.json.tmp followed by rename. Credentials, if remembered, use safeStorage encryption in credentials.enc, mode 0600 (`main.ts:107`). Keys are not added to the bootstrap payload; entry temporarily passes through the renderer password field and IPC.

[E] Workspaces use `workspaces/<projectId>/<runId>`. SDK sessions are directed to `sessions/<projectId>`; selected resources also use the `pi` directory (`pi-backend.ts:102,113`). Requirements and generated evidence remain in old run folders, but the project record is reset for a new run. Activity is capped at 600 entries, with truncated individual payloads; not every streamed event immediately saves state.

[E] On restart, persisted running projects become stopped, with instructions to start fresh (`storage.ts:38`). Corrupt JSON causes an error instead of silently resetting data. No automatic session resume, backup recovery or old-run browser is implemented in the inspected controller. [E] Preview ports are assigned dynamically and only cached in memory, so a restart can give the same workspace a new browser origin (`preview.ts:26`). [A] Origin-scoped app storage can consequently appear lost; test that separately from the delivered app's persistence.

## Late changes, limited comparison only

[E] A read-only Git comparison of `f72c5dc` with `0f175a8` found two intervening commits and 45 changed files. The targeted comparison covered `electron/pi-backend.ts`, `main.ts`, `agent-runner.ts`, `harness/integration.ts`, `pi-tools.ts` and the new `harness/phases.ts`. This was not a second full audit, and none of the newer code was executed.

| Change observed at 0f175a8 | Effect on the baseline assessment |
| --- | --- |
| [E] Separate intake and research sessions precede plan, build and verify in `pi-backend.ts`. | [E] Five normal sessions, six with repair; 5 to 10 or 6 to 12 explicit prompt calls including possible artifact completion. For Pi, nominal session ceilings become 200/240 turns and 150/180 minutes, excluding controller tests and other overhead. Actual use remains unmeasured. |
| [E] `harness/phases.ts` defines per-phase skills/tools and `createFleetTools(names)` filters registration. | [E] Broad domain-tool registration in finding 8 is partly addressed. Global read/write/edit/bash remain inherited by all agent phases, so this is not workspace isolation. |
| [E] PiBackend becomes FleetBackend with a Pi compatibility export and a second session adapter; `main.ts` adds account handlers. | [E] The old statement that codex-rpc is unused applies only to f72c5dc. The new subscription/account path was not audited or used. The event-key Pi route remains the target of this review's recommendations. |
| [E] `agent-runner.ts` aborts its stage signal in finally and improves last-activity tracking. | [E] This improves cancellation propagation, but the inspected Pi path still creates its SDK session in process. Full termination needs new evidence, and conclusions about Pi must not be generalized to the new adapter. |
| [E] `storage.ts`, `verification.ts`, `preview.ts` and `src/studio/brief.ts` have no diff between these revisions; the export copy sequence in main is unchanged apart from the engine label. | [E] The mutable-test gate, delivered-browser proof gap, duplicate brief and check-before-dialog export observations remain directly relevant. |

[R] Reuse the new phase contract and adapter seams. Benchmark the added sessions before proposing consolidation; preserve the visible logical phases even if a later measured optimization groups their model work. See concrete overlap in [[Research/Architecture/Target-Architecture]].

## Sources

- [E] Local code and line references above, read November 4, 2026; private repository reference, not fetched: https://github.com/danjung9/FleetHarness/tree/f72c5dc15aa6c34d2b9080c1c0b87742230cc16e
- [E] Test definitions cross-checked: `tests/pi-backend.test.mjs`, `tests/pi-sdk.test.mjs`, `tests/agent-runner.test.mjs`, `tests/runtime.test.mjs`, `tests/verification.test.mjs`, `tests/harness-integration.test.ts`.
- [E] Intended behavior cross-checked: `docs/desktop.md`, `docs/pipeline.md`, `docs/studio.md`, `scripts/studio.mjs`, `scripts/mock-provider.mjs`.
- [P] [[Event/Judging]], [[Event/Rules]].
- [E] Limited late-change reference, not fetched: https://github.com/danjung9/FleetHarness/tree/0f175a8ce346521c4462fc134d40c0973eac1323
