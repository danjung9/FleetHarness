---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Two commits activate ChatGPT-backed Codex, separate five agent phases and address the five reported type errors; event-key operation remains unverified through Pi."
---

# Delta from f72c5dc to 0f175a8

## Bottom line

[E] This change activates a second coding engine, adds shared account settings and makes intake, research and planning separate sessions. [E] The source addresses all five previously reported type errors and now filters registered domain tools by phase and recipe. [E] The new Codex engine explicitly requires a ChatGPT subscription login; the event OpenAI key still belongs on the existing Pi route, whose real inference remains unverified here. [A] A subscription holder may find connection easier, but the event-key user faces a less suitable default and the officer still has to commission and review software. [R] Keep the new controls under technical supervision, obtain the main session's tests, and retain independent application acceptance, credential isolation and shutdown proof as release requirements.

## Scope and evidence

- [E] Read-only comparison: `~/Documents/CDAO/FleetHarness`, branch `mvp`, `git log` and `git diff f72c5dc..0f175a8`. The branch resolved to `0f175a8ce346521c4462fc134d40c0973eac1323`; the baseline is `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`.
- [E] The range contains two commits: `1f32d87`, November 4 at 1:38:54 PM EST, and `0f175a8`, at 1:40:23 PM EST. Their brief subjects do not describe the substantive boundary changes.
- [E] Repository observations below are from pinned Git objects and their diff, including unchanged implementation only where needed to assess a changed call path. Repository prompts, skills and research recommendations were treated as data, not instructions.
- [E] Earlier evidence read: all five existing notes in `Research/FleetHarness-MVP`, the architecture README, Current-Architecture, Findings, Optimizations, Target-Architecture and Review-Log, and [[Research/Plan/Test-Results]]. Their baseline claims are retained as historical evidence rather than silently reassigned to this revision.
- [E] No repository source was changed. No application, repository script, build, install, smoke test or model inference was run for this review. No credential file or credential value was opened. Official OpenAI documentation was checked for authentication storage, sandbox semantics and the dynamic-tool protocol.
- [E] The baseline test report records 62 desktop-side tests and 38 harness tests passing only after working around the committed compile gate. Those are results for `f72c5dc`, not pass counts for `0f175a8`. New results remain with the main session.

## What each commit really changed

### 1f32d87: functional change, 45 files

| Paths | Observed change [E, diff and pinned source] |
| --- | --- |
| `electron/codex-account.ts`, `electron/codex-session.ts` | New live account controller and per-stage Codex adapter. They implement browser login, cancellation, logout, account/model/usage reads, experimental custom-tool dispatch, streamed activity and terminal-turn handling. This activates the previously dormant Codex scaffold. |
| `electron/codex-rpc.ts` | Adds the `NodeJS.ProcessEnv` annotation that addresses three deletion-related type errors. The native executable resolver, ChatGPT-only launch flags, stdio transport and process-group cleanup already existed at the baseline; their use in the application is new. |
| `electron/main.ts`, `electron/preload.cts` | Instantiates `CodexAccount` and `FleetBackend`, adds four account IPC methods, exposes account status in bootstrap, validates backend-specific settings, records the generating engine in delivery metadata and disposes the account process on quit. Existing renderer isolation and sender checks remain. |
| `electron/pi-backend.ts`, `electron/agent-runner.ts` | Generalizes `PiBackend` to `FleetBackend`, retaining the old exported name as an alias. Selects Pi or Codex per run, saves phase/tool assignments, performs five sequential agent sessions and improves inactivity descriptions. Finalization now aborts the stage-local controller even after success. Old evidence is cleared before asynchronous workspace preparation, and capacity is rechecked after the new account refresh. |
| `harness/phases.ts`, `harness/planner.ts`, `harness/types.ts`, `harness/integration.ts`, `harness/pi-tools.ts` | Introduces shared phase contracts, global tools, owners, skills, outputs and exit descriptions. Packets and project state save these assignments. Workspace preparation copies their union of skills; individual sessions receive their allotted subset. Registry filtering replaces the prior all-domain-tool exposure. |
| `electron/system-design.ts`, `shared/types.ts` | Architecture tools are unavailable outside plan/build/verify. Projects can save `phasePlan` and `globalTools`; initial intake is queued rather than presumed finished. The seven visible stages remain, with human review and host delivery still distinct from agent work. |
| `skills/fleet-research/SKILL.md`, `skills/fleet-planning/SKILL.md` | Two new prompt resources, raising the documented skill count from twelve to fourteen. Research must distinguish supplied evidence from unchecked links, versions and licenses. Planning must publish architecture and map criteria to expected results. These documents do not add a browser, retrieval service or acceptance checker. |
| `src/ModelSettings.tsx`, `src/model-settings.css` | Shared settings form for both interfaces: engine, subscription sign-in or Pi provider/key, model selection, refresh, cancel, sign-out and usage windows. A fresh unconfigured form initially selects Codex. Existing configured Pi profiles retain their route. Account/engine changes are disabled during recorded active builds. |
| `src/PhaseDetails.tsx`, `src/phases.css`, `src/App.tsx`, `src/studio/Studio.tsx` | Displays each phase's role, skills, global/additional tools, inputs, outputs and completion description. The original inspector starts open. Studio adds and defaults to Build flow, with selectable stages. Older runs without saved assignments explicitly show proposed assignments for their next run. Engine names and connection controls become backend-neutral. |
| `src/api.ts`, `src/studio/api.ts` | Adds the four required account-method stubs to browser fallbacks, addressing their two reported interface errors. Browser execution remains unavailable. Editing briefs clears saved phase assignments as well as architecture. |
| `package.json`, `package-lock.json` | Pins `@openai/codex` 0.166.0 and its six optional native platform packages. Adds unpack configuration for native executables. Adds `test:flow`, `test:system-design` and `test:chatgpt`; no general deployment or browser-acceptance service is introduced. |
| `tests/codex.test.mjs`, `tests/pi-backend.test.mjs`, `tests/harness-integration.test.ts`, `tests/system-design.test.mjs` | Adds fake-RPC account/session/routing cases, five-phase expectations, exact tool/skill selection, phase ownership, stalled intake/research coverage, architecture-tool restrictions and Stop during preparation clearing prior approval/evidence. These are test definitions, not observed passing results here. |
| `scripts/smoke-chatgpt.mjs`, `scripts/smoke-phases.mjs` | New login-start/cancel and account-UI smoke coverage, plus real Pi SDK phase/tool-selection and bounded-repair coverage against the local scripted provider. The connected ChatGPT UI and Codex generation test remain synthetic. |
| `scripts/mock-provider.mjs`, `scripts/smoke-electron.mjs`, `scripts/smoke-studio.mjs`, `scripts/smoke-activity.mjs`, `scripts/smoke-system-design.mjs` | Updates fixtures/selectors for the phase and settings changes. Extends existing system-design smoke coverage to Studio desktop/mobile and stopped/failed component states. The duplicated Pi selection in two smoke scripts is redundant, not evidence of additional provider verification. |
| `README.md`, `PRODUCT.md`, `docs/desktop.md`, `docs/pipeline.md`, `docs/chatgpt.md`, `docs/agent-activity.md`, `docs/system-design.md`, `docs/software-factory-tools-research.md` | Updates phase descriptions and documents subscription setup, existing activity/design behavior, controls and proposed future integrations. New documentation does not mean every described capability was newly implemented. The factory-tools document explicitly mixes observations of the changing working tree with recommendations. |

### 0f175a8: three small follow-ups

- [E, `docs/desktop.md`] Corrects the ceiling description: Pi has a 40-model-turn limit; Codex's reported turns are user turns, not its internal model iterations. Both retain the stage deadline. This is an accuracy fix, not a newly implemented Codex request budget.
- [E, `scripts/smoke-chatgpt.mjs`] Scrolls to the top and waits for animation frames before viewport screenshots; switches away from full-page captures; adds explicit desktop/mobile captures of Studio controls. It does not add successful real sign-in or hosted generation.
- [E, `src/model-settings.css`] Increases the account heading and usage-number font sizes from 16 to 17 pixels. It does not change authentication, execution or authority.

## Phases, models and actual tool access

[E, `electron/pi-backend.ts:188`, `harness/phases.ts`] A normal run now has five fresh agent sessions instead of three; one repair makes six instead of four. Research and planning are no longer simultaneously active labels on one session. All stages use the selected run model. Pi still specifies medium thinking; this delta adds no reasoning-level selector, model-per-role setting or automatic backend fallback.

| Phase | Additional tools and guidance [E, `harness/phases.ts`] | Gate actually relevant to this change [E, backend] |
| --- | --- | --- |
| Intake | `fleet_get_challenge`, intake skill | Nonempty `scope.md`; original inputs remain unchanged. This is now an agent phase, not a human scope approval. |
| Research | `fleet_search_evidence`, research/evidence/domain skills | Nonempty `research.md` and preserved scope. Search covers supplied documents; no live web-research tool was added. |
| Plan | `fleet_system_design`, planning/evidence/domain skills | Planning documents and published architecture exist. Their factual and semantic adequacy is not automatically established. |
| Build | Recipe domain tools and `fleet_component_progress`, domain/evidence/delivery skills | Required artifacts/tests and component reports exist. |
| Verify and one repair | Recipe tools and component progress, evidence/domain skills | Host Node tests pass under the existing predicate. The model may still modify application tests. |
| Review | Human controls, evidence guidance | Existing passing report/source check and human notes. No agent session. |
| Deliver | Host export controls, delivery guidance | Existing approval/hash check before copying. No agent session. |

[E, `harness/pi-tools.ts`, `electron/pi-backend.ts:115`] Pi now gets exact allowed names and excludes generic `mcp__*` tools. Custom domain registrations are filtered, and architecture tools have stage guards. Every agent phase still inherits `read`, `write`, `edit` and `bash`. Restricting custom tools does not prevent a Pi shell from reading other files, implementing early, invoking a copied toolkit module or using the network.

[E, `electron/codex-session.ts:70`] Codex receives the selected custom tools but uses its native coding tools. The shared four-name global list is not passed as a native Codex tool allowlist. Its thread requests workspace-write, no approval escalation, disabled shell network access and disabled web search. [V] Official OpenAI documentation distinguishes sandbox restrictions from approval policy; `never` suppresses approval prompts rather than granting full access: https://learn.chatgpt.com/docs/sandboxing. [A] Actual native tool availability, read boundaries and enforcement on the event machine are not verified by this static review.

## Which earlier findings change

| Earlier finding | Delta assessment |
| --- | --- |
| Three errors in `electron/codex-rpc.ts` | [E] Source-level fix in `1f32d87`: `env` is explicitly `NodeJS.ProcessEnv`, so deleting the three optional credential/base-URL properties no longer targets an inferred object containing only `CODEX_HOME`. [A] Fresh compiler success remains for the main session to establish. |
| Errors in `src/api.ts` and `src/studio/api.ts` | [E] Both fallback objects now provide `connectChatGPT`, `cancelChatGPTLogin`, `disconnectChatGPT` and `refreshChatGPT`, matching the previously incomplete `FleetAPI` contract. [A] This addresses the reported cause; it does not certify the expanded tree has no other errors. |
| Codex is dormant scaffolding, What-Exists and Current-Architecture | [E] Superseded. Main now constructs its account controller, the package supplies the binary, IPC exposes login, and FleetBackend routes real stages through `createCodexSession`. |
| Three normal sessions, combined research/planning | [E] Superseded by five sequential sessions, six with repair. Architecture diagrams, role counts and arithmetic ceilings must change. |
| All seven domain tools exposed to every phase, Findings 8 | [E] Fixed for registered custom tools: phase/recipe filtering and tests replace the wildcard. Broad built-in file/shell authority remains. Starter routing still defaults to workflow when no challenge identity is present. |
| Host execution boundary, Findings 1 and 6 | [E] Partly changed for native Codex commands through requested sandbox/network settings. Pi and the independent host test runner retain their old authority. New file-based OAuth credentials add another sensitive local store. |
| Agent can influence its own evidence, Findings 2 and 5 | [E] Unchanged. `electron/verification.ts` is unchanged; no frozen external answer key or per-generated-app browser acceptance gate was added. Tests and test-matrix remain editable; inline UI/core consistency is still requested rather than established. |
| Source changes during export dialog, Findings 3 | [E] Unchanged. `electron/main.ts:81` checks before awaiting the directory dialog and later copies the live workspace. No immutable snapshot, export lock or final bundle digest was introduced. |
| Stop does not prove descendant termination, Findings 4 | [E] Partly improved: stage-local cancellation is finalized, prior evidence is cleared earlier, and the newly active Codex path has process-group termination. There is still no controller-confirmed descendant-exit barrier; Pi still runs in-process. |
| Setup burden and Studio disclosure, Findings 7 and Officer-Test | [E] Shared subscription controls reduce key entry for eligible subscription users but add an engine decision. Studio still starts directly without the original dashboard's confirmation. Technical acceptance and export work remain. |
| Long, unpriced run, Findings 9 | [E] More sessions, no whole-run budget. Five 30-minute stage ceilings total 150 minutes; repair raises that to 180, excluding other work. These are code-derived sums, not duration predictions. Codex's turn counter does not bound internal inference iterations. |
| Restart/history, offline and field readiness, Findings 5 and 10 | [E] No corresponding changes to `electron/storage.ts`, preview delivery or transport. New phase records help inspect assignments but do not add a run journal, durable clarification, browser recovery, signing proof or disconnected-use evidence. |

[R] Retire the dormant-Codex, combined-session and all-domain-tools statements when describing the new revision. Keep the acceptance, export, host-test, offline, setup and truthful-impact requirements from [[Research/FleetHarness-MVP/Reconcile]] and [[Research/Architecture/Optimizations]].

## Can it run on the event OpenAI key?

[E] **The source still offers an API-key route through Pi. The new Codex route deliberately rejects that route.** `electron/main.ts:114` rejects a nonempty key for Codex, requires provider `chatgpt` and a connected account, and saves `rememberKey: false`. `CodexRpc.launch` forces ChatGPT login and removes inherited `OPENAI_API_KEY`, `CODEX_API_KEY` and `OPENAI_BASE_URL`. `createCodexSession` rejects an API-key-only account. `tests/codex.test.mjs` explicitly covers that rejection with a fake RPC.

[R] For the authorized event account, select Pi, then the intended OpenAI provider/model, and let the key owner supply their own event key. Do not substitute personal ChatGPT sign-in to claim event-key operation. [A] Successful real inference is not verified: the selected model must exist in the pinned Pi catalog, the event account must permit it, and the endpoint/protocol must match. Earlier success with `gpt-6.1-sol` elsewhere does not establish those conditions in FleetHarness. The diff changes neither Pi's model catalog integration nor its endpoint configuration.

### API key handling

- [E, `src/ModelSettings.tsx`] The entered key exists temporarily in the renderer's password-field state and crosses the named `saveSettings` IPC call. Saving successfully clears that field; changing engines clears it too. It is inaccurate to say an entered API key never enters the renderer.
- [E, `electron/main.ts:121`] The main handler validates the input, trims it and calls `setRuntimeApiKey`. The application writes no entered key into project settings or bootstrap. Its session-only path does not explicitly persist a credential file; existing Pi auth/environment sources remain separate.
- [E, `electron/main.ts:123`] Remembered entry requires available `safeStorage` encryption and writes encrypted provider/key JSON to `<userData>/credentials.enc`, mode 0600. Startup decrypts this file and loads the runtime. Saving Pi settings with remembering disabled removes that file; no corresponding runtime-key revocation is shown.
- [E, `electron/main.ts:114`] Saving Codex settings returns before the Pi credential-file removal branch. Codex sign-out only logs out the Codex account. A previously remembered Pi key can therefore remain on disk and is loaded at next startup even when Codex is selected. [R] Keep retention and logout explanations separate for each credential store.
- [E, `electron/pi-backend.ts:30`] Pi runtime initialization still supplies no application-specific authentication/model path. The docs describe existing Pi credentials and inherited environment support. [A] Isolation from unrelated same-user credentials is not established.

### New ChatGPT credential store

[E, `electron/codex-account.ts`, `electron/codex-rpc.ts`] The app creates `<userData>/codex` with requested mode 0700, uses it as `CODEX_HOME`, and explicitly selects Codex's file credential store. It validates the browser destination as HTTPS on `auth.openai.com`, times out pending login after five minutes, and handles cancel/logout. The authorization URL and tokens are not included in the renderer's login response; the browser is opened by main.

[V] Official OpenAI authentication documentation describes the file store as plaintext `auth.json` under `CODEX_HOME`: https://learn.chatgpt.com/docs/auth. [E] The application adds no Electron safeStorage encryption to this OAuth store. [A] The expected sensitive file is therefore `<userData>/codex/auth.json`, separate from encrypted Pi storage; no actual file or token was inspected. The directory's permissions are a useful control, not encryption or protection from arbitrary code running as the same OS user.

[E, `CodexAccount.refresh`, `ModelSettings`] Bootstrap now returns the connected account's email, plan and usage windows to the interface. Tokens are excluded by the mapping. [R] Keep real account identifiers out of event screenshots and exports; synthetic account fixtures already exist. A visible model is marked configured from sign-in status, not a successful entitlement/inference check.

## The officer's first ten minutes

[A] Overall, the factory is more inspectable but the event-key officer's setup is harder. An eligible subscription user may connect more easily. No user study, elapsed-time comparison or first successful build was observed.

| Part of the visit | Difference from the baseline and implication |
| --- | --- |
| Connection | [E] The shared form initially chooses Codex for a blank profile and hides the API-key controls until Pi is selected. [A] Familiar browser sign-in helps a subscription holder, but sends an event-key user toward the wrong account type and adds a build-engine choice. |
| Understanding progress | [E] Five agent phases now correspond to actual separate sessions; owners, outputs and tools are visible, and older assignments are labeled accurately. [A] This helps a technical reviewer understand progress, but the default-open inspector and Studio flow tab expose more file/tool terminology before a useful task result. |
| Waiting and deciding | [E] Two more sequential sessions precede the same builder/verifier/review process. No time estimate, frozen expected-answer review or whole-run budget was added. [A] Additional handoffs may increase latency and spend; actual impact is unmeasured. |
| Accepting and using the result | [E] The officer still must inspect the generated app, tests, limitations and review notes, then export source. No ready officer task app, simpler task-specific first action or independent acceptance evidence was added by this range. |

[R] Have a technical owner configure the permitted Pi provider before the officer exercise. Lead with one prepared, independently accepted application. Keep phase/tool/account views available to its operator rather than making their details the officer's first task.

## New and remaining risks requiring review

### 1. High: another credential store and an unsuitable default for this event

[E] New subscription login persists OAuth credentials using a file store and displays account identity. Existing inherited Pi configuration and unredacted activity/error logging remain. The Codex child environment removes three OpenAI variables but otherwise spreads `process.env`; it is not a complete secret allowlist. Host verification is unchanged. [A] Same-user tools or generated tests could expose accessible credentials through files, tool results, logs or artifacts; no actual disclosure was observed.

[R] Before a live demo, prove the event-key Pi route with synthetic input, use disposable permitted execution context, inspect only synthetic credential canaries in a boundary test, and document each store's retention/logout behavior. Do not read real credentials to test a leak. Check prompt, activity, session and export boundaries independently.

### 2. High: Codex restrictions stop at the Codex execution boundary

[E, `electron/codex-session.ts:24`, `electron/pi-backend.ts:209`] Custom tools execute in Electron's host process; the final verifier launches its existing local Node child. The requested Codex shell sandbox does not wrap those host calls. Every agent phase has native coding authority, and there is no human approval of derived scope/plan before code execution.

[R] Describe the native Codex settings precisely, while retaining the separate host-tool/test containment finding. Do not claim the entire factory is sandboxed, or that its phase list is complete native-tool enforcement. Freeze external expected results outside agent-writable files and test the delivered UI.

### 3. High: Stop can settle before termination, and new preflight is outside the run

[E, `electron/codex-session.ts:95`, `electron/codex-rpc.ts:dispose`] Codex abort requests turn interruption and disposes its process. On POSIX, disposal sends process-group SIGTERM and schedules SIGKILL after one second; direct-child exit cancels that timer. No awaited process-tree exit acknowledgment is returned to FleetBackend. [A] A descendant that ignores SIGTERM can outlive a quickly exiting parent. This was not reproduced.

[E, `electron/pi-backend.ts:64`, `:232`] Codex account refresh happens before the active run is registered. `stop` returns immediately if that registration does not yet exist. Account/provider locks and quit draining also use the active map. [A] A stop request during refresh can therefore return without preventing a later start when refresh completes; the UI may not yet offer Stop. This new preflight needs a cancellation/reservation test, separate from stopping an already running stage.

[R] Reserve a cancellable start operation before refresh, retain that cancellation through registration, and confirm local workers/descendants exit before reporting shutdown complete. Have the test owner check start preflight, startup, shell work, host tests and quit with a synthetic heartbeat. Preserve an explicit escalation path when termination is incomplete.

### 4. High: more verification plumbing is still not independent acceptance

[E] New Codex routing and UI smoke coverage use scripted output, and `tests/codex.test.mjs` reaches review using a tiny fixture with a constant arithmetic assertion. That is appropriate plumbing coverage but cannot prove the generated application solves its brief. The agent can still change its tests; host verification, export timing and inline/core consistency are unchanged.

[R] Do not turn new smoke screenshots, model-list visibility or a passing routing fixture into a hosted-model, task-quality or readiness claim. Keep fixed external acceptance cases and the snapshot/export correction ahead of further platform expansion.

### 5. Medium: more sessions with an incomplete spend and request budget

[E] The five-minute idle and 30-minute absolute stage limits remain. Codex emits `turn_start` once per user turn, whereas its internal model/tool iterations occur within that turn (`electron/codex-session.ts:42`). The final commit corrects the docs accordingly. Account refresh before registration is outside the stage runner. Usage windows describe account allowance, not this run's token/cost totals.

[R] Record actual stage/request usage and a whole-run limit. Test cancellation during preflight and continuous activity as well as an idle stall. Do not reuse the old three-session ceilings or call 40 user turns a 40-inference cap.

### 6. Medium: a pinned experimental integration still needs live proof

[E] The app opts into experimental APIs and registers dynamic tools; it forwards text results only. [V] The official app-server reference identifies the dynamic-tool registration/callback flow as experimental: https://learn.chatgpt.com/docs/app-server. [A] The new fake-RPC tests do not establish native executable packaging, live account entitlement, actual tool protocol compatibility or complete sign-in. Current documentation is not a runtime test of pinned version 0.166.0.

[R] Have the main session attach exact-revision build/test results and separately report any owner-performed real run. Keep source-level fixes, scripted integration, login-start/cancel, completed login and real generation as separate evidence levels.

## New smoke and regression coverage, with limits

| Entry | What its definition exercises [E] | What it does not establish |
| --- | --- | --- |
| `npm run test:flow` | Existing runner/backend/SDK/verifier tests, now including five-phase backend cases | [E] Its explicit file list excludes the new Codex account/session suite and harness TypeScript tests. It is not a complete test command. |
| `npm test`, new `tests/codex.test.mjs` | Fake account login/cancel/logout, URL checks, API-key rejection, tool dispatch, failed/interrupted turns, cancellation, real child transport timeout/death, full factory routing with files/host tests | [E] The Codex inference transport is substituted. No owner subscription or event-key generation is validated. |
| `scripts/smoke-phases.mjs` | Actual Pi SDK against loopback scripted provider; checks exact tool lists at requests, all five phases and one repair | [E] No hosted model; this file has no new npm script and is not matched by `tests/*.test.mjs`. It requires a separate explicit run after compilation. |
| `npm run test:chatgpt` | Builds both renderers; starts/cancels actual bundled login through Electron with browser opening intercepted; synthetic connected/account usage and save/sign-out UI in both interfaces | [E] No completed user login and no hosted inference. Starting the real login RPC is distinct from a fully offline fake-RPC test. |
| `npm run test:system-design` | Exposes an existing smoke script through package scripts and extends Studio responsive/interrupted-state checks | [E] Its generated workflow uses the scripted provider; browser acceptance of arbitrary generated apps is still absent. |
| Existing desktop/Studio/activity smoke scripts | Updated names, settings selections, tab order and fixture state | [E] No fresh result was observed here; selectors/fixtures do not establish real-provider authentication. |
| Harness and system-design unit additions | Phase ownership, files for assigned skills, custom-tool filtering and architecture-tool stage guards | [E] They do not establish native Codex tools are exactly the displayed global list or prove an OS access boundary. |

[E] Documentation is uneven: `README.md` still directs the reader to Pi settings, and `PRODUCT.md` retains Pi-only wording for repair despite the activated second engine. Some new activity/design documentation explains baseline features. [R] Use the implementation and exact tested revision for claims, then align the short launch instructions.

## New items for the tool ledger, not added here

[E] These are disclosure candidates observed in the delta, not claims that this review installed or ran them. The central ledger already lists the review environment, Git, web research, local bridge/scripts, Pi and the main framework tools. [R] Reconcile actual use through the ledger owner's workflow after test and account evidence is available.

| Candidate | Type, provider and version evidence | Honest status |
| --- | --- | --- |
| `@openai/codex` 0.166.0 | [E] Coding engine/native app-server distribution, OpenAI; new direct dependency; lock declares Apache-2.0 | Added to product source. Installed, packaged and invoked status must come from the test owner. Distinguish it from the review environment's CLI version. |
| Six Codex platform packages | [E] `@openai/codex-darwin-arm64`, `-darwin-x64`, `-linux-arm64`, `-linux-x64`, `-win32-arm64`, `-win32-x64`, aliases of `@openai/codex` at corresponding `0.166.0-<platform>-<arch>` versions; all lock entries declare Apache-2.0 | Optional native artifacts. The diff adds seven non-root lock records total, including the parent. Do not claim all platforms were installed or tested. |
| ChatGPT browser authentication, account/usage and hosted Codex service | [E] New external-service paths in `CodexAccount`, `CodexRpc` and `createCodexSession`; provider OpenAI | Implemented. Login-start/cancel, complete owner login and inference require different execution records. No account identity, auth URL or credential belongs in the ledger. |
| Actual generation model and account source | [E] Product records provider/model and backend per run | [A] Not verified for this revision. `fixture-codex` is a test identifier, not a hosted model. Do not infer event-key billing from the engine's name. |
| New synthetic account/RPC/phase fixtures | [E] Team test data in `tests/codex.test.mjs`, `scripts/smoke-chatgpt.mjs`, `scripts/smoke-phases.mjs` and changed mock provider | Synthetic test material; distinguish scripted output from hosted output in any demonstration. |
| Research and planning prompt resources | [E] Team-authored `fleet-research` and `fleet-planning` skill files, versioned by `1f32d87` | Product guidance, not new trained models or enforcement services. Include in contribution/prior-work disclosure. |
| Broader factory-tools research candidates | [E] `docs/software-factory-tools-research.md` names Playwright CLI/MCP, axe-core, Tavily, Brave, Context7, Docker Sandboxes, OpenHands DockerWorkspace, Compose, Dagger, Testcontainers, Schemathesis, Semgrep, Trivy, Temporal, OpenTelemetry, Docling and fast-check, among existing recipe references | Design/research references only in this range. No associated new runtime integration or package adoption appears in this diff. Keep them out of Used unless actual evaluation or use is recorded. |
| Official documentation lookup workflow | [E] OpenAI Docs skill and public OpenAI auth/sandbox/app-server pages used for this review | Read-only research, not API inference or credential entry; record reuse rather than a new hosted-model run. |

## Session record and next verification

[E] Asked: review only the two-commit delta, reconcile earlier findings and write this note. Done: compared history/diffs, traced changed auth/model/phase/tool/test paths and checked relevant official documentation. Verified how: pinned source reads and cross-checking prior reports; tests and installation were deliberately left to the main session. Friction: several broad combined reads exceeded output limits and were narrowed. Prior work: teammate code at the two pinned revisions and the cited existing vault reviews; this review does not establish a pre-event contribution split.

[E] Document checks confirmed required frontmatter/sections, coverage of all 45 changed file paths and absence of em/en dash characters. These checks validate the report, not the application.

[R] Next evidence, in order: fresh compile/tests at `0f175a8`; owner-performed Pi event-key inference through review/export; independent task acceptance and exported-file offline use; synthetic credential-boundary checks; Stop during Codex preflight and actual local process work; then a measured noncoding-user exercise. Keep any failure or not-run status explicit.

## Sources

- [E] Private repository comparison reference, not fetched: https://github.com/danjung9/FleetHarness/compare/f72c5dc15aa6c34d2b9080c1c0b87742230cc16e...0f175a8ce346521c4462fc134d40c0973eac1323. Local Git objects, not a moving working tree, supplied the code evidence above.
- [E] [[Research/FleetHarness-MVP/README]], [[Research/FleetHarness-MVP/What-Exists]], [[Research/FleetHarness-MVP/Officer-Test]], [[Research/FleetHarness-MVP/Rules-Fit]], [[Research/FleetHarness-MVP/Reconcile]].
- [E] [[Research/Architecture/README]], [[Research/Architecture/Current-Architecture]], [[Research/Architecture/Findings]], [[Research/Architecture/Optimizations]], [[Research/Architecture/Target-Architecture]], [[Research/Architecture/Review-Log]], [[Research/Plan/Test-Results]].
- [E] Required context: [[Research/00-Brief]], [[Team/Now]], [[Reference/Open-Questions]].
- [V, opened November 4, 2026] Official OpenAI authentication and file credential storage: https://learn.chatgpt.com/docs/auth.
- [V, opened November 4, 2026] Official OpenAI sandbox/approval semantics: https://learn.chatgpt.com/docs/sandboxing.
- [V, opened November 4, 2026] Official OpenAI app-server dynamic tools: https://learn.chatgpt.com/docs/app-server.
