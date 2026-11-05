Working tree handoff, 2026-11-04. Base HEAD is 6daccd8, containing 62d26bf and the project lead from a45d62e. Incoming MERGE_HEAD is 72fe63b. All working-tree conflict markers are resolved. The Git index remains unmerged because staging and committing belong to the overseer. No Git writes, live model calls, reads of files named auth.json, or changes outside this clone were made.

The app-owned ChatGPT OAuth registration, consent, account selection, refresh and revocation remain intact. API-key login is additive and uses the existing settings password state and a sign-in button. The installed 0.166.0 binary generated its app-server schemas into `.tmp/merge-key/schema`; `account/login/start` takes `{type: "apiKey", apiKey}` and returns `{type: "apiKey"}`. Native account storage handles the key, while an atomic `connection.json` records only the selected route. The native provider handles API-key builds, and the existing explicit bearer-token provider handles ChatGPT builds. There is no `forced_login_method`. Distinctive synthetic-key tests cover the protocol, renderer clearing, failure echoes, logout, persistence, export and account races.

Start and Resume share connection, model, browser and disk preflight, with a bounded refusal deadline. Public errors are plain instructions; original redacted diagnostics remain in the activity log. The missing-sandbox preflight and its error mapping were removed.

Build threads use `danger-full-access`, enabled network and live web search. The old named `fleet-build` profile is replaced in existing app homes. `electron/generated-sandbox.ts` and `scripts/smoke-sandbox.mjs` are deleted. Generated tests, runtimes, services, previews and evaluators launch directly. Preview CSP, iframe restrictions, browser network blocking and renderer sandbox assertions were removed to match that behavior. The project lead's separate tool restrictions and the independent judge's evidence-only access remain.

Process markers and sweeps, confirmed cleanup before terminal status, approval/delivery gates, atomic host writes, validated manifests, authoritative evidence, repair baselines, frozen contracts and answers, prose coverage, judge retry and guarded Resume remain. Host capability evaluation still precedes the judge. `requirementsMet` still requires both capability evidence and complete coverage. Core host evaluation no longer consumes the model inactivity budget; its execution limits, stage deadline and cancellation remain active.

Secret handling was brought from b01e485 in `../astra-a2`: `secrets.ts`, `session-logs.ts`, `delivery-secrets.ts`, the runtime credential-registration helper and tests. Wiring covers activity, tool metadata, streamed messages, IPC, persisted state, session diagnostics, reports, source export and executable staging. Delivery scans the validated bytes and finished bundle. No Pi containment, OS-sandbox or workspace-path module was imported. Evaluator redaction retains the teammate's existing `[redacted]` evidence format.

Reported native defects addressed:

| Failure | Change and evidence |
| --- | --- |
| Bundled transport cleanup raised ENOTEMPTY | RPC disposal waits for child close; rotation and test cleanup await disposal. Both real-binary/local-server transport regressions pass. |
| Invalid seatbelt host syntax broke services, foundations, previews and evaluation | Removed the generated OS-sandbox launcher entirely. Native service/foundation/browser rerun remains with the overseer. |
| Homebrew pip used the system interpreter after venv creation | Direct launch preserves the venv executable path instead of resolving its symlink to system Python. Native pip regression remains with the overseer. |
| Host evaluation falsely tripped model inactivity | Bounded host work suspends only the model inactivity timer. New tests prove continuation and enforcement of the total deadline. |
| Missing verifier close receipt was hidden by an earlier runtime failure | Cleanup errors propagate from core evaluation. The regression now withholds only the verifier close receipt, because core evaluation precedes verification. Its shutdown and Resume assertions are unchanged. Native rerun remains required. |
| Closing a starting preview rejected with AbortError | Expected startup cancellation resolves to no preview; unconfirmed shutdown errors still propagate. Native service test remains required. |
| Redaction wrapper lost IPC AbortError identity | Redacted IPC errors retain their name; delivery cancellation lifecycle tests pass. |

Observed validation:

| Command or selected group | Result |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `node node_modules/typescript/bin/tsc -p electron/tsconfig.json` | Passed |
| `node node_modules/typescript/bin/tsc -p harness/tsconfig.json` | Passed |
| Harness tests | 84 passed |
| Focused verification, preflight, plain errors, OAuth, key login, secrets, agent runner, conversation, lifecycle and export | 227 passed, 1 native-ps skip |
| Activity, brief data, downloads, clarification, benchmark admission, judge, journey, Norfolk, repair baseline, fixture contracts, solution contracts and architecture | 101 passed |
| Codex, excluding the full factory workflow | 20 passed, including both bundled binary transport regressions |
| Runtime, excluding Chrome journeys | 12 passed |
| Process sweep, excluding native discovery | 20 passed; injected discovery is not proof of native ps |
| Executable staging, excluding generated-runtime/browser integration | 8 passed |
| Evaluator algorithms and diagnostics, excluding generated-runtime execution | 10 passed |
| Combined coverage and capability requirement | 1 passed |
| Selected Pi orchestration, retries and Resume | Initially 21 passed and 1 old public-error assertion failed; that assertion and four related clarification/data checks now pass, 5 of 5 |
| Final secret/error regression after redaction fixes | 24 passed |
| Final report-write/cleanup regression | 4 passed |
| Foundation integrity | 19 pinned files across 2 foundations verified |
| Declared dependency presence | No missing dependencies |

Counts across rows overlap and are not a full-suite total. TAP receipts are in `.tmp/merge-key`. Early failures from obsolete public-error assertions were corrected without dropping their diagnostic checks. A full Codex workflow attempt failed at unavailable process inspection. A benchmark attempt failed to prepare clean runtimes under this clone's `node_modules` ancestor. Those environmental failures were not retried or hidden.

This sandbox cannot run native `ps`, Chrome or `sandbox-exec`. The last is no longer a product dependency. Clean generated-package execution also cannot be validated here: every writable temporary directory is below the repository's `node_modules`, which the reproducibility check correctly rejects. Therefore no passing claim is made for the full Pi SDK flow, complete service/foundation/evaluator workflows, native preview cleanup, Python dependency installation, native process discovery/restart reconciliation, browser journeys, executable runtime integration, or the full suite. No hosted inference or ten-challenge live benchmark was run.

Intentional test deletions and rewrites for removal of execution restrictions:

| File | Exact affected test or assertion |
| --- | --- |
| `tests/preflight.test.mjs` | Deleted `missing sandbox probe fails closed and never guesses that Pi is isolated`; `sandbox readiness opens and disposes the existing Codex route without prompting`; `a late sandbox startup after cancellation is disposed without a model call`; `verification startup probe uses native containment, a private home and no inference`; `verification probe refuses a process that exits without the readiness marker`; `verification probe kills a hanging startup when the shared deadline expires`. Shared refusal, deadline, concurrent Start/Resume and cancellation tests retain their assertions and use browser readiness where they formerly used sandbox readiness. |
| `tests/verification.test.mjs` | Deleted `a rejected nested macOS sandbox explains the required host-side verification`. Rewrote production-default launch, startup failure, startup timeout, startup output overflow, zero-exit-without-Node, spawn error and packaged Electron launch expectations to direct execution. Removed only sandbox/profile/unsandboxed-fallback text and policy assertions. Single execution, readiness, registered tests, limits, process termination, source integrity and no false pass assertions remain. |
| `tests/merged-rules.test.mjs` | Deleted `service sandbox policy permits only its assigned loopback endpoint`. Replaced the old native sandbox/marker case with `native generated runtime has host and network access while retaining its run marker and cleanup`. It reads a synthetic sibling sentinel, reaches a separate local HTTP endpoint, checks the actual marker and runs native cleanup. |
| `tests/codex.test.mjs` | Replaced the restrictive named-profile test with full-access configuration and actual binary config parsing. Builder streaming expects full access, enabled network and live web search. Builder tool-search absence is no longer required; project lead tool limits remain asserted against real model-request payloads. |
| `tests/browser-verification.test.mjs` | Native-form and console/runtime/overflow cases now require requests to reach another local origin. Removed the expectation that form navigation fails specifically because CSP blocked it. The destination's missing required controls still fail the journey. Console, runtime and overflow failure assertions remain. |
| `tests/runtime.test.mjs` | Preview origin/token and declared-static-resource tests now assert no CSP header instead of restricted script/connect policies. Token routes, unique origins, allowlists, traversal and symlink checks remain. |
| `tests/executable.test.mjs` | Browser wrapper expects `webPreferences.sandbox === false`; other wrapper and packaging assertions remain. |
| `tests/plain-errors.test.mjs` | Removed the obsolete sandbox-unavailable mapping case. Inventory signatures were refreshed after reviewing merged producers and their mappings; unknown-error mutation checks remain. |
| `scripts/smoke-sandbox.mjs` | Deleted the sandbox smoke script, including its containment expectations. |

Other legitimate merge adaptations, with original outcome checks retained: raw-error assertions in Pi, judge, lifecycle and metrics tests now inspect the activity log and also check the plain public error. Existing preflight fixtures now advertise valid backend/provider metadata. Codex test homes use actual temporary folders because startup now atomically writes config. Transport tests await disposal before deleting their folders. The three integration-branch OAuth scenarios now exercise the teammate's app-owned callback flow and safe snapshot, replacing obsolete app-server login events and rate-limit fields. Their scenario names remain in `chatgpt-account.test.mjs`. The verifier-close fault fixture targets verification rather than every earlier core-runtime child. No outcome assertion was weakened to make these tests pass.

Every frontend change beyond HEAD is captured verbatim in `docs/backend-integration-frontend.patch`. Only these new-version source lines differ:

| File and lines | Change |
| --- | --- |
| `src/App.tsx:141` | Removed preview iframe sandbox attribute. |
| `src/App.tsx:142` | Preview label no longer claims isolation. |
| `src/App.tsx:230` | A configured account may start with automatic model selection. |
| `src/App.tsx:240` | Settings return navigation recognizes automatic selection. |
| `src/App.tsx:307` | Automatic-selection label, actual host/network permissions, Stop disclosure and both billing routes. |
| `src/ModelSettings.tsx:20,21` | Detect API-key connection and allow model selection for that route. |
| `src/ModelSettings.tsx:47` | Build-engine description includes both sign-in methods. |
| `src/ModelSettings.tsx:54,55` | Account title and billing explanation cover both routes. |
| `src/ModelSettings.tsx:63` | Show API-key connection state. |
| `src/ModelSettings.tsx:71` | Allow switching from API key to ChatGPT. |
| `src/ModelSettings.tsx:72` | ChatGPT usage control applies only to ChatGPT. |
| `src/ModelSettings.tsx:73` | Sign-out message identifies the actual route. |
| `src/ModelSettings.tsx:78` | Password field and API-key sign-in button; clear input before submitting. |
| `src/ModelSettings.tsx:79` | Explain local sign-in storage and credential exclusion. |
| `src/ModelSettings.tsx:86` | Model availability describes the connected account. |

No `studio/`, `index.html` or CSS lines changed.
