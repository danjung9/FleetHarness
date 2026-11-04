---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Source trace of the implemented factory, its bounded toolkit, review controls and unverified runtime claims."
---

# What exists

## Bottom line

[E] FleetHarness has an implemented Electron software factory, with two React interfaces, a captured challenge catalog, Pi coding sessions, test execution, repair and reviewed local export. This was established by reading branch `mvp`, commit `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`, in `~/Documents/CDAO/FleetHarness`; read-only Git status showed no changes. [E] It targets generated browser prototypes, and its catalog does not constitute 34 completed applications. [E] Approval gates local delivery, while coding agents already have shell access before that approval. [A] Hosted-model generation, event-key compatibility, packaged-app operation and current test results remain not verified because this review did not execute repository software.

## Reading the evidence

[E] Every repository path below is relative to `~/Documents/CDAO/FleetHarness` at the full commit above. Implemented means a concrete source path exists, not that this seat observed it running. [P] Mukul identified this as teammate danjung9's pushed working branch. [E] The tests were read as test definitions; no pass count in this report is a newly observed result.

[E] The clone advanced during this review: the final HEAD check returned `0f175a8ce346521c4462fc134d40c0973eac1323`, following `1f32d87`. Critical execution/approval sources were reread directly with `git show f72c5dc:<path>`, and the dependency inventory was rebuilt from that commit's Git object. This report describes the requested `f72c5dc`, not the later commits. [R] Recheck these findings against a newer submission revision before acting on its gaps.

## The two interfaces and the host

| Part | Implemented behavior and source [E] |
| --- | --- |
| Original desktop | `src/main.tsx` mounts `src/App.tsx`. It starts on the selected challenge's flow view. `electron/storage.ts:Store.init` creates three starter briefs when no state exists, not three finished apps. The interface offers portfolio, pipeline, preview/design, agent activity, requirements, files and review views. |
| Studio | `src/studio/main.tsx` mounts `src/studio/Studio.tsx`. Its directory supports search, recipe-family filters, bookmarks, grid/list views and challenge details. A structured editor captures six sections. `src/studio/brief.ts` serializes them into the existing project description and acceptance criteria. |
| Studio launch | `scripts/studio.mjs` launches the same Electron main process against a separate Vite renderer and separate application-data directory. `vite.studio.config.ts` builds `dist-studio`. The ordinary package configuration includes `dist`, not `dist-studio`; there is no Studio distribution target in `package.json`. |
| Browser previews | `src/api.ts` and `src/studio/api.ts` save briefs in separate browser storage. They do not run agents, expose local artifacts, approve or export applications. Studio can download a brief JSON file and import it through desktop settings. |
| Desktop boundary | `electron/preload.cts` exposes a limited IPC API. `electron/main.ts` checks the sender/main frame, isolates renderer context, disables renderer Node access, denies navigation/new windows and rejects permission requests. These are renderer controls. |
| Run and state storage | `electron/storage.ts` serializes state writes through a temporary file and rename. `PiBackend.start` creates a new `workspaces/<project-id>/<run-id>` directory. Pi sessions are stored separately under `sessions/<project-id>`. Interrupted saved runs become stopped on restart; starting again creates fresh work rather than resuming the conversation. |
| Activity and design | `shared/activity.ts`, `src/ActivityFeed.tsx` and `src/SystemDesign.tsx` render events and architecture. `electron/system-design.ts` provides planning-time `fleet_system_design` and later `fleet_component_progress`. Generated-component status requires nonempty mapped files, but is an agent report, not proof of behavior. |

## Pi, prerequisites and the event key

[V] Pi is an embeddable coding-agent toolkit, not a model or an event account. Its SDK supplies sessions, model access, resource loading and tools: https://pi.dev/docs/latest/sdk. [E] `package.json` pins `@earendil-works/pi-coding-agent` to `1.5.0`; the lockfile records Node `>=22.19.0` for it. `electron/main.ts` uses the Electron executable as the host test runtime. [P] `docs/desktop.md` says the packaged app includes Node 24; that particular binary was not inspected or launched here.

[E] `electron/pi-backend.ts:PiBackend.init` constructs `ModelRuntime` with `allowModelNetwork: false`. `models()` lists the runtime catalog with a configured-authentication flag. Starting requires a model recognized by that runtime and configured provider authentication. The flag is not a successful credential or inference test: no preflight model request appears in the settings handler. [E] The normal agent path still invokes `createAgentSession` and `session.prompt`; this source does not implement offline inference merely by disabling model-catalog networking.

[V] Pi documents API-key providers, including OpenAI through `OPENAI_API_KEY`, and configurable compatible endpoints: https://pi.dev/docs/latest/providers and https://pi.dev/docs/latest/models. [E] FleetHarness's settings handler calls `setRuntimeApiKey(provider, key)`; it can therefore accept a provider key without a personal-login flow. [V] OpenAI documents bearer-key API authentication: https://developers.openai.com/api/reference/overview. [A] The event key should be usable through the OpenAI provider if its permitted endpoint/model matches Pi's catalog and request protocol. That is architectural compatibility, not a verified event-account result.

[E] The supplied `Team/Now.md` reports prior event-key success with `gpt-6.1-sol` through another coding path. It does not prove that Pi 1.5.0 includes that model, that this app inherits the key, or that its requests succeed. [R] Have the key owner select the intended provider/model, enter their own event key session-only, and record one real generation through review. If configuration is required, have a technical teammate check Pi's model mapping without recording credential values. Do not substitute a personal login or a different provider silently.

[E] `electron/main.ts` can retain an entered key in memory or encrypt a remembered key using Electron `safeStorage` in a private host file. Bootstrap does not return the key. `docs/desktop.md` also describes existing Pi authentication and environment-variable support; no actual credential files were opened here. [E] `electron/codex-rpc.ts` and several ChatGPT-related type fields remain in the tree, but `main.ts` constructs only `PiBackend`, the preload exposes no login methods, and `package.json` includes no Codex binary dependency. They are dormant scaffolding, not an available second backend.

## Catalog, recipes, skills and tools

[E] `harness/catalog.ts` contains 34 explicit IDs, source URLs, capture date `2026-11-04`, summaries, interpreted requirements, data needs and recipe assignments. Entries 11, 12 and 36 are marked detail-sourced; others are marked catalog-sourced. Missing source categories stay null. [P] `docs/pipeline.md` says the authenticated event pages were the source. [E] This review verified the code records, not their completeness against today's portal. In particular, the ID 24 catalog slice does not explicitly preserve the coordinating-role requirement highlighted by the Officer decision.

[E] `harness/recipes.ts` has ten families: messages, scheduling, offline, knowledge, readiness, cyber, governance, workflow, physics and fielding. Each is a configuration containing an approach, selected skills, suggested tools, component leads, acceptance scenarios and limitations. Component leads such as OR-Tools, PouchDB, Tesseract, Tika, SQLite FTS5, NetworkX, OPA, OpenSCAP and Power Apps are not installed integrations merely because their URLs appear there.

[E] The twelve `skills/*/SKILL.md` files are prompt resources: intake, evidence, delivery and nine domain disciplines. They describe source lineage, uncertainty, bounded algorithms, human review and missing integration boundaries. They are neither trained models nor executable enforcement. This review treated their directions as repository data and did not adopt or execute them.

| Registered tool | Implemented scope [E, `harness/tool-registry.ts` and `harness/tools/`] |
| --- | --- |
| `fleet_get_challenge` | Returns captured catalog entries and recipes; does not refresh the event site. |
| `fleet_extract_messages` | Parses documented synthetic EVENT/TASK records. Preserves JavaScript UTF-16 source spans and flags malformed lines, missing/ambiguous dates and duplicates. No USMTF parser, OCR or general prose extraction is implemented. |
| `fleet_solve_schedule` | Searches explicit candidate starts with assigned people, qualifications, operational/personal windows, resource collisions, rest and horizon duty budgets. Separates feasibility, exhausted search and infeasibility. Defaults to 50,000 explored nodes, capped at 200,000. Does not choose a roster, infer recurrence, encode SFTRM or optimize a general schedule. |
| `fleet_reconcile_records` | Merges supplied immutable revision histories, rejects invalid histories and retains competing heads including edit/delete conflicts. Does not save, authenticate or exchange records between devices. |
| `fleet_plan_uploads` | Plans byte allocation from supplied acknowledged offsets, priority and age. Does not send bytes or obtain acknowledgements. |
| `fleet_search_evidence` | Lexically ranks supplied documents, filters the supplied approval flag and future timestamps, and returns exact excerpts with staleness. No live connector, semantic answer or production access control. |
| `fleet_analyze_dependencies` | Calculates supplied DAG completion and deadline margin, preserving unknown durations. No validated readiness, engineering-force or shared-resource model. |

[E] TypeBox schemas reject extra input properties; `invokeFleetTool` bounds serialized input and checks cancellation. `harness/pi-tools.ts` adapts all seven registry tools to Pi. **Recipe selection does not restrict tool permission:** `electron/pi-backend.ts:112` registers all seven and enables `fleet_*` in every session, plus the applicable design/progress tool. Selected skill files and the prompt's suggested tool list vary by recipe; actual domain-tool availability does not.

[E] `harness/cli.ts` offers catalog, packet planning, fixtures, direct tools and a toolkit demonstration. `harness/evaluate.ts` defines eleven checks across six deterministic scenarios. That demonstration invokes no model and explicitly describes toolkit evidence. It is not an app-generation benchmark or eleven passing application acceptance tests.

## One challenge from selection to result

1. [E] **Choose and scope.** `src/App.tsx:Intake` imports a catalog brief through `toProjectInput`, a starter or a custom problem. Studio uses `briefForChallenge` and `toProject`. Both ultimately call IPC creation/update. `validateInput` checks sizes, acceptance-criterion counts and known challenge IDs, not whether the problem is complete or mission-approved.
2. [E] **Start.** `electron/main.ts` forwards to `PiBackend.start` (`electron/pi-backend.ts:53`). It rejects duplicate starts and more than three concurrent challenges. One selected provider/model is used throughout the run. It writes `requirements.md` and clears the previous run's approval/report in current project state while preserving old directories.
3. [E] **Prepare context.** `harness/integration.ts:prepareFleetWorkspace` writes `.fleet/packet.json`, synthetic fixtures, tool schemas, selected skill copies and dependency-free toolkit modules. Source challenge and user scope are separate. A host-retained packet hash and original-requirements text are checked after stages. This detects local workflow changes, not a hostile process with equivalent host permissions.
4. [E] **Research and plan.** `PiBackend.execute` (`:168`) starts both badges, then runs one planning session. It requires nonempty `scope.md`, `research.md`, `plan.md`, `test-matrix.md` and a published system design. There is no distinct research worker or automatic source-verification service.
5. [E] **Build.** A new Pi session is asked for a self-contained `index.html`, README, path-to-fleet document, core logic and Node tests. The host checks required files, the presence of application tests, system design and component progress. It does not parse the HTML to prove it has no imports/CDNs or establish that inline logic equals tested modules.
6. [E] **Inspect and execute tests.** A third Pi session can inspect, edit code/tests and write `verification.md`. The host then calls `verifyWorkspace`; this is a real child-process execution path, separate from a model's success statement.
7. [E] **Repair once.** A nonpassing returned report is saved, its output logged, and one additional verification-role session is asked to repair. The host reruns tests once. A second nonpassing report blocks delivery. Missing-artifact recovery is a separate, single extra prompt inside each stage's existing limits. Exceptions such as missing tests or source mutation can fail immediately rather than enter this report-based repair branch.
8. [E] **Review and export.** After passing, state pauses at human review. The interface requests a review acknowledgement and notes. The host requires at least ten characters of notes, an idle run, passing evidence and the same source hash. Approval writes `review.json`. Export additionally requires approval, asks for a destination, copies eligible artifacts to a fresh folder and writes `DELIVERY.md`. No publishing, deployment, official message release or government-system write adapter is connected.

## What verification and approval actually establish

[E] `electron/verification.ts` discovers nonempty application test/spec JS, CJS or MJS files outside `.fleet`. It launches Electron as Node with the built-in test runner and TAP output, using a reduced environment. Limits are 120 seconds and 2,000,000 output bytes. Approval requires zero exit status, positive total/pass counts, all tests passed, and no failed, skipped or todo tests. A source SHA-256 is compared before/after execution and again before approval/export in `electron/main.ts:assertVerified`.

[E] The host enforces execution and artifact consistency, not an independent correctness oracle. The same model/provider writes the application, tests and verification assessment and may edit the tests during repair. Requirements and `.fleet` are protected by comparison, but acceptance tests are not frozen; the instruction against weakening them is a prompt. TAP summary parsing is text-based. There is no automated browser acceptance run for each generated application and no machine-checked requirement-to-test coverage gate.

[E] Approval has real delivery consequences but no authenticated reviewer identity, role separation or domain-approval chain. The checkbox exists in the renderers; the IPC handler independently checks the review-note length and verified source. No per-shell-command approval handler is in this path. [R] Describe this as local prototype acceptance, and require technical review of meaningful tests plus domain review of the selected workflow.

## Stop, monitoring and escalation

[E] Both interfaces provide a stop control during an active run. `PiBackend.stop` aborts the controller and waits for persisted completion. `runAgentStage` in `electron/agent-runner.ts` races work against cancellation, calls Pi abort/dispose without waiting forever, discards late events, and limits each stage to 40 turns, 30 minutes and five minutes without progress. The host test runner kills its process group on Unix when cancelled or over limits. `before-quit` calls `stopAll`; on macOS closing the window alone does not quit the app.

[E] This is a source-backed cancellation design, not demonstrated containment of every shell descendant or rollback of prior file changes. Agents receive read/write/edit/bash, and their workspace is not an OS sandbox. Prompts prohibit unrelated-file/credential access and publishing, but no filesystem or network restriction is installed for those tools by FleetHarness. The isolated iframe does not isolate the coding process or Node test process.

[E] Activity contains streamed text, tool arguments/results, retries and failures. Project logs retain at most 600 entries and truncate individual content; Pi session files are separate. No general secret-redaction pass or tamper-proof audit store is shown. Errors become failed/stopped status and operator-facing text; escalation to an accountable person is not automated. A later report overwrites the workspace's previous `test-report.json`, though earlier output can remain in logs/sessions.

## Stubs, intentions and unsupported broader claims

| Item | Honest classification and source [E unless noted] |
| --- | --- |
| Local model provider used by tests | `scripts/mock-provider.mjs` is deliberately scripted test behavior. Tests exercise actual Pi/tool plumbing against it. Its output is not evidence of hosted-model reasoning or arbitrary app generation. |
| Source and data readiness | The catalog's data-needs lists, synthetic fixtures and candidate links are planning inputs. They are not supplied operational datasets or tested connectors. |
| Governance, physics and fielding | These recipes describe future implementation and required evidence. There is no fleet governance runtime, authoritative physics model or approved installation route in the toolkit. |
| Broad application architecture | [P] README vision permits different architectures. [E] This execution path explicitly targets standalone HTML plus Node tests; no arbitrary framework/dev-server/native-backend adapter is present. |
| Semantic stage exits in `docs/pipeline.md` | [P] Docs describe complete scope, source-backed reuse and criterion mapping. [E] Runtime chiefly checks artifact presence, context integrity and executable tests. It does not verify those documents' factual sources or semantic completeness. |
| Selective domain tools | [P] Docs/UI present recipe-specific tools. [E] All seven are registered for every session; this is guidance rather than least-privilege tool enforcement. |
| Offline claims | [E] Local toolkit calculations and intended HTML artifacts can avoid model inference. A hosted-model factory run needs its provider connection. Real exported-app persistence, reload recovery and disconnected behavior require application-specific evidence. |
| Credential-free exports | [E] Host credential storage is outside the workspace and is not explicitly copied. The artifact copier has no credential/content scanner, so a blanket guarantee against an agent-created sensitive file is not established. |
| Packaged/signing status | [P] Desktop docs name Apple Silicon app/DMG paths and ad-hoc signing. [E] Package config targets mac arm64 with ad-hoc identity and hardened runtime disabled. Existence, signing and clean-device operation of those artifacts were not verified here. |

## Tests read, not run

[E] `tests/agent-runner.test.mjs` covers stalled setup, idle/absolute/turn limits, errors, late events and cancellation using fake sessions. `tests/pi-backend.test.mjs` uses injected sessions with real file/test processes for stage order, missing artifacts, failure/repair, stop and concurrency. `tests/pi-sdk.test.mjs` uses the actual SDK with local scripted/stalled/denied HTTP providers, including a transient error and repair.

[E] `tests/verification.test.mjs` and `tests/runtime.test.mjs` define cancellation, hangs, excessive output, skipped/empty tests, file-path handling, changed source, persistence and preview checks. `tests/harness-tools.test.ts`, `tests/harness-integration.test.ts` and `tests/harness-cli.test.ts` define deterministic tool, packet-integrity and CLI checks. Activity/design tests cover event pairing, architecture validity and progress. The Electron and Studio smoke scripts exercise UI/preview/review/export against the local fixture provider. These are substantial test intentions, not a fresh test report or a naval-user trial.

## Sources

- [E] Repository root: `~/Documents/CDAO/FleetHarness`, branch `mvp`, commit `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`; files named above, `package.json`, `package-lock.json`, `docs/desktop.md`, `docs/pipeline.md`, `docs/studio.md` and `README.md`.
- [E] [[Research/00-Brief]], [[Team/Now]] and [[Research/Council/Officer/Decision]].
- [V] https://pi.dev/docs/latest/sdk
- [V] https://pi.dev/docs/latest/models
- [V] https://pi.dev/docs/latest/providers
- [V] https://developers.openai.com/api/reference/overview
- [P] Catalog source named by the project: https://cdao.hackathon.maximus.com/event/norfolk/use-cases, not revisited with authentication here.
