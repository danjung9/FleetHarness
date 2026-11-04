---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Ranked architecture risks, preserving existing safeguards and distinguishing source findings from unexecuted reproductions."
---

# Architecture findings

## Bottom line

[E] The implementation already checks real process results, protects original requirements against persistent edits, isolates previews and requires human review before normal export. [E] Its largest gap is that the coding agent controls both the candidate and the tests while retaining ordinary host tool access. [E] Export also has a specific interval between checking the source and copying it during which files can change. [R] Address these boundaries and officer usability with small changes to the existing application.

## How to read the findings

[E] Evidence is static inspection of FleetHarness `mvp` at `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`, November 4, 2026. No program, test, exploit or reproduction below was run. [E] A cited test is a test definition, not today's passing result. [A] Predicted runtime outcomes are explicitly identified. [R] Reproductions are for the test seat in disposable, team-owned environments with synthetic canaries and no real credentials.

[E] During final checking the clone advanced to `0f175a8`. Its phase-specific tool filtering partly addresses finding 8, and its five-session flow supersedes the baseline count in finding 9. The test runner, preview and storage files are unchanged, and the export check/copy sequence is unchanged. [R] Read the limited comparison in [[Research/Architecture/Current-Architecture]] before applying fixes to the newer revision. The new account/session adapter was not fully audited.

## 1. High: the workspace is not an execution boundary

[E] `electron/pi-backend.ts:101` creates sessions in the application process and grants built-in `read`, `write`, `edit` and `bash` tools at line 112. The system prompt at line 105 explicitly describes a directory rather than an OS sandbox. No application-side path restriction wraps these built-ins. `electron/verification.ts:26` launches generated test code with ordinary process privileges; changing HOME and filtering environment variables does not restrict filesystem or network access.

[A] An agent or generated test can potentially read unrelated files, modify another run or controller state, access inherited credentials, or contact outside services according to the user's OS permissions. Exact SDK command environment and host permissions were not inspected. `allowModelNetwork: false` in runtime creation is not evidence of a host-tool network firewall; the SDK test configuration uses that option alongside a provider endpoint (`tests/pi-sdk.test.mjs:28`).

[R] Reproduce with a harmless file outside the run, an escaping symlink, an out-of-directory write and a controlled network listener. Exercise both coding tools and generated tests; do not use actual secret paths. Record deny/allow results separately. This matters to rules 4 and 6 and to the credibility of any isolation claim.

## 2. High: independently executing agent-written tests does not make the acceptance decision independent

[E] The build, verify and repair sessions all retain write/edit/bash. The verifier is explicitly allowed to improve tests and fix source (`electron/pi-backend.ts:175,177`); repair is only instructed not to weaken tests at line 186. `checkInputs`, lines 161 to 166, protects requirements, packet contents and published system design, not application tests or the agent-written test-matrix.md.

[E] `electron/verification.ts:7,60` rejects missing/zero-byte test files, excludes `.fleet` tests, and requires positive passing counts with no failures or skips. It does not require an acceptance ID, application import, browser action or meaningful assertion. `tests/runtime.test.mjs:47` itself defines a constant equality test as a passing runner fixture. That is sensible runner coverage, but also illustrates why the runner cannot judge semantic coverage.

[A] A broken app accompanied by one constant assertion can satisfy the current pass predicate. An assertion-free named test is another likely case. A nonempty file containing no registered tests may receive a file-level Node test result; this specific behavior was not verified. Empty directories and truly zero-byte files are already rejected and should not be described as passing.

[R] Reproduce by keeping a deliberately broken UI and core, replacing the application suite with a constant assertion, and asking the controller to verify. Separately have a repair fixture delete a meaningful failing check and retain a trivial passing one. A correct future gate must fail the unchanged external acceptance case and report the altered test contract. Hashes establish which bytes passed, not whether the questions were useful.

## 3. High: export checks the source before an asynchronous dialog, then copies unchecked bytes

[E] `electron/main.ts:79` calls assertVerified and checks approval. Line 81 waits for the folder dialog. Lines 87 to 98 copy current workspace files and write a delivery statement without rechecking the original run ID, approval or destination digest. `requireIdle` checks current activity once; it is not an export transaction lock.

[A] Editing index.html while the dialog is open can export bytes that differ from the verified source while still presenting the earlier passing report. A concurrent new run or requirements update is another lifecycle race, although the exact UI route for that concurrency was not reproduced. External file changes alone are enough to exercise the core risk.

[R] Extend `scripts/smoke-electron.mjs:65` so its mocked dialog waits on a latch. Alter a synthetic source file after the dialog opens, then release the latch. Compare exported bytes with the approved digest. The fixed behavior must reject or copy an already frozen verified snapshot. Rechecking only before a long copy still leaves a smaller race; verify the final staged bundle before marking it delivered.

## 4. High: Stop settles application state without proving all agent work has terminated

[E] `electron/agent-runner.ts:41` calls session.abort without awaiting it, then dispose; line 93 races work against interruption. This deliberately keeps the UI responsive when the SDK hangs. `PiBackend.stop`, lines 203 to 205, waits for run finalization, not a recorded list of child processes. Late events are suppressed. No Pi-worker PID or process-tree registry is present in this path.

[E] The test runner is stronger: `verification.ts:30` kills the POSIX process group, including on normal completion, and bounds runtime/output. Cancellation resolves a race before child close is necessarily observed; Windows uses child.kill rather than a process group. `tests/verification.test.mjs:17` explicitly waits for the root child's exit, but does not test detached descendants. The unused `codex-rpc.ts` cleanup is not part of Pi shutdown.

[A] A tool that ignores cancellation or launches a detached child could continue after the project reads Stopped. Whether the installed SDK terminates ordinary bash descendants is unverified. No claim that every Stop fails is justified. The existing mocked abort tests and stalled-provider tests cover useful cases, not complete process termination.

[R] Use a synthetic tool job that writes a heartbeat from a child, then Stop during startup, model streaming, tool execution and controller verification. Assert no further writes, no queued dispatch and no surviving child after a proposed five-second deadline. Repeat on application quit and crash. Expose Stop requested, Stopping, Stopped and Stop incomplete separately. An already submitted provider request may finish remotely even after local work stops.

## 5. High for the demo: browser behavior and disconnected delivery are requested, not enforced by the release gate

[E] `pi-backend.ts:172,175` requests self-contained HTML, separate testable core and consistency between them. The default verifier executes Node files, not the generated UI. `scripts/mock-provider.mjs:18,37` even contains separate HTML/core implementations in its intentional fixture. Existing desktop smoke scripts exercise that predetermined fixture, not every generated app.

[E] Preview CSP is supplied as an HTTP header by `electron/preview.ts:22`; `main.ts:87` copies source files without adding that header to the exported index.html. Export instructions always say to open index.html. The gate does not establish that every generated file is independent of networks, imports, server APIs or browser-origin differences.

[A] Core tests can pass while a button, inline parser, save operation or export is broken. An exported app can also have different network permissions and storage behavior from its preview. Preview origins receive random ports after restart, so localStorage recovery in the desktop preview is not assured (`preview.ts:26`).

[R] Deliberately break only the inline UI logic while keeping core tests passing. Then cold-open the actual exported file in the supported browser with networking disabled and model endpoints unavailable; load a fresh synthetic input, validate, edit, save, close, reopen and export. Assert output contents and restored data. Test normal and malformed input. Scope any offline claim to the functions and browser actually exercised, supporting rule 9 and Speed to Fleet.

## 6. Medium to high: credential storage is considered, but tool access and logs remain exposure paths

[E] `main.ts:102` validates settings; keys use setRuntimeApiKey, optional safeStorage encryption and mode 0600. Bootstrap contains no key. `src/App.tsx:186,193` and `src/studio/Studio.tsx:173,176` necessarily hold an entered password-field value until save clears it. It is inaccurate to say a key never enters the renderer. No real credentials were opened in this review.

[E] Runtime initialization supplies no app-specific authPath or modelsPath (`pi-backend.ts:24`); `docs/desktop.md` describes reusing existing Pi credentials and environment configuration. Tool-start arguments, tool results and provider error strings are logged without a redaction step (`pi-backend.ts:122,127,130`). Export copies every regular artifact except the small ignored set in `storage.ts:61`; no allowlist or secret scan is present. The credential file is outside the workspace and is not normally exported.

[A] Unexpected file reads or echoed environment data can therefore enter sessions, UI activity or generated artifacts. Encryption at rest does not stop a same-user tool from reading other accessible secrets. This review establishes possible paths, not an observed key leak.

[R] Inject only a synthetic credential canary into a controlled test runtime and tool result. Check UI, persisted logs, session transcripts and export independently. Require explicit technical-owner configuration of the event provider, app-scoped auth where supported, redaction before log persistence, and an export manifest that excludes unneeded artifacts. Validate the exact Pi SDK configuration before promising auth isolation.

## 7. Medium: the officer's first successful build still depends on infrastructure choices

[E] Default settings are empty (`storage.ts:36`). The main action routes an unconfigured user to provider/model/key setup (`src/App.tsx:241`); Studio exposes Connect Pi and blocks generation until connected (`Studio.tsx:62,135`). Its first screen is already a challenge directory, not a credential form, but setup still interrupts the journey. Studio starts directly; it lacks the original dashboard's explicit pre-run host-access disclosure.

[E] The evidence view asks the person to inspect agent-written tests and enter free-text notes. The controller does not enforce a criterion-by-criterion expected/observed result mapping (`main.ts:70`, `src/App.tsx:146`). There is a human start action and final approval, but no separately approved derived scope or plan.

[R] Reproduce with a fresh synthetic profile and a non-coder: select a problem, explain intended input/output, approve examples, build, identify one deliberate wrong output and stop. Count infrastructure choices and requests for help. A technical owner should configure the provider beforehand; the officer should see task, approved examples, progress, results and the decision still needed. These are recommendations from [[Research/Naval-User/Simplicity-Requirements]], not measured user-study results.

## 8. Medium: starter routing and broad context reduce the value of existing recipes

[E] The three `starters` in `shared/types.ts` have no challengeId. `storage.ts:36` uses them for a new profile. `harness/integration.ts:15` sends any project without challengeId through `customPacket`; `harness/planner.ts:25` defaults that packet to the workflow recipe. Thus the original parser and scheduler starters do not automatically receive their corresponding domain-specific selected skills. Catalog imports do carry challengeId (`harness/catalog.ts:166`).

[E] `harness/pi-tools.ts:5` registers every domain tool regardless of the selected recipe, and `integration.ts:21` copies every fixture/schema/module. `src/studio/brief.ts:34` places the brief in both prose and a JSON suffix, then backend preparation duplicates the description into its packet. Disk duplication alone is not token consumption; it becomes token consumption when read into context.

[R] Reproduce by comparing a fresh parser starter's packet with catalog challenge 12, and a scheduling starter with challenge 11. Inspect selected skills and exposed tool schemas. Give custom templates an explicit recipe identity without falsely assigning official provenance; filter context/tools by recipe and stage. Measure actual request tokens before claiming savings.

## 9. Medium: bounded stages can still consume a long, unpriced run

[E] Three or four fresh sessions use the same model and medium thinking. Each has 40 turns and 30 minutes; up to three projects may overlap. There is no total run deadline, token budget or aggregate usage meter in `pi-backend.ts`, `agent-runner.ts` or `shared/types.ts`. Provider retry and compaction can add work. The verifier prompt requests tests before the mandatory host run.

[A] Long plans, repeated reads, separate inline/core logic and a full verification conversation may dominate latency and spend, but no allocation was measured. A stopped/restarted run repeats planning from current requirements rather than using its previous conversation.

[R] Use the same approved synthetic fixture for baseline and changed runs; record stage duration, prompt/turn counts, token/cache usage where reported, completion retries and accepted outcome. Count failures and stopped runs. Apply a whole-run budget and one-run demo default before experimenting with fewer model roles or parallel agents.

## 10. Medium: restart is conservative, but history and interruption evidence are incomplete

[E] `storage.ts:38` marks saved running jobs stopped on startup; it does not resume them. `storage.ts:51` uses serialized write/rename. Corrupt state is reported and retained, covered by `tests/runtime.test.mjs:21`. These are useful choices.

[E] A new run replaces the project's latest status/report/log references (`pi-backend.ts:65`). Older workspace/session files remain without an application-level run index. Logs are capped at 600 entries and streamed events call notify without saving immediately (`pi-backend.ts:30`). No append-only controller journal, backup snapshot, PID reconciliation or preview-state migration is implemented.

[A] A hard crash can lose recent UI activity, leave surviving external processes, or expose only stale state. Atomic rename reduces partial-file risk but does not prove recovery of every acknowledged action after power loss. Browser-origin changes can make preview edits inaccessible without actually deleting them.

[R] Interrupt at setup, source generation, test completion, review and export using synthetic state. Restart and compare saved requirements, source digest, verdict and child-process liveness. Add a small per-run metadata record and recovery message before considering database replacement or automatic resume.

## Electron security settings worth preserving

[E] `main.ts:21,122` already has main-frame sender checks, context isolation, sandboxing, no Node integration, no webviews, blocked navigation/new windows and denied permission requests. `preload.cts` exposes a narrow API. `storage.ts:73` resolves real paths for artifact access; artifact enumeration skips symlinks. Preview uses a separate origin, random route, no-store and restrictive CSP. These findings do not support a claim that the renderer simply exposes Node to generated HTML.

[E] `package.json` sets ad-hoc macOS signing and hardenedRuntime false; `docs/desktop.md` identifies the local distribution limitation. Packaged security, Electron binary behavior, code signing and notarization were not validated. [R] Keep release hardening as a distinct post-demo task; do not weaken existing renderer settings to make an app preview work.

## Sources

- [E] Local implementation and test definitions cited above. Private repository reference, not fetched: https://github.com/danjung9/FleetHarness/tree/f72c5dc15aa6c34d2b9080c1c0b87742230cc16e
- [P] [[Event/Rules]], especially rules 4, 6 and 9; [[Event/Judging]].
- [E] Team research used as design evidence: [[Research/Build-Patterns/Security]], [[Research/Build-Patterns/Specs-and-Acceptance-Tests]], [[Research/Build-Patterns/Human-Review-UX]], [[Research/Naval-User/Simplicity-Requirements]].
