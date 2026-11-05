---
type: review
status: rerun-ready
owner: mukul
updated: 2026-11-05
summary: "One confirmed browser recovery defect; three native checks need updated Settings selectors and the OAuth interceptor needs repair."
---

# Combined receipt review at d6f8750

[E] Reviewed main's four receipts from clean `d6f8750c2ae6072c5f70bb75bb4c138c2cada8ff`, tree `87fbe943b102f371a2e8fba0abdf1877f137b112`, in `fh-org/astra-test`. One product defect is reproduced: valid JSON with an invalid saved-state shape prevents browser-preview startup. The native Stop and Resume runs never reached a provider request. Their ERROR results do not establish a shutdown or recovery failure.

[E] Original receipts and screenshots remain unchanged. Three scripts were corrected; the browser recovery checker remains unchanged because it exposed a real failure. No product code, application, native test or model was executed during this review. Validation here used source inspection, receipt/hash comparison and synthetic checks of the checker itself.

## Receipt classifications

All receipt paths below are relative to `Research/QA/Overnight/`.

| Receipt | Observed result | Classification and retained evidence |
| --- | --- | --- |
| `desktop-inputs-3a1173d0-54c0-4c5f-842e-af49954ff55c/result.json` | ERROR overall; 11 PASS and four ERROR rows | First three key-control cases depend on the removed Codex radio and the now separate API key tab. OAuth reached the actual button, but the owned browser-opening interceptor failed. All eight input rejection/retry cases, both exact limit cases and Unicode/CRLF renderer-reload retention passed. Cleanup PASS; no page errors. This is not a failed data-input suite. |
| `browser-recovery-2026-11-05T07-21-45-924Z-d2b4af3b/receipt.json` | Two PASS, three FAIL | Absent storage and malformed JSON recover. `{}`, missing settings and string settings cause blank startup with TypeErrors and no recovery control. Manual clearing restores interactive Home in every applicable control. Product defect; no checker expectation changed. Browser exit 0, no setup errors, no blocked requests and no artifact drift. |
| `stop-detached-eff9bf78-b7a8-4c29-b5a7-830ec7823faa/result.json` | ERROR before build | Timed out at the removed `Pi Model providers` radio. Zero provider requests; no worker command or Stop observation. Cleanup PASS. All seven Stop assertions remain unexecuted on this combined target. |
| `native-resume-43eaef24-69bd-4fc9-bcad-a5b1e4073caf/result.json` | ERROR in initial setup | Same obsolete Pi radio. Zero provider requests, no held implementation, no Stop/restart/Resume measurement. Cleanup PASS and no renderer/proxy errors. |

[E] Source identities are unchanged within all four receipts. The browser's 59 recorded built files match the inspected copy. Desktop and Resume record matching before/after manifests; all 148 recorded frontend/backend file hashes still match. Four later connector-account test helper outputs exist in `dist-electron/connector-account-tests/`; they are additional files, not changed recorded application bytes. This receipt review does not infer source-to-build provenance from hashes alone.

## Confirmed product defect

**P2: corrupt saved-state shape leaves browser preview blank without usable recovery.**

[E, receipt and pinned source] `src/api.ts:15` treats any truthy parseable JSON as `AppState`. At `src/api.ts:16`, it reads and assigns `browserState.settings.developerMode` without validating `settings`. Both `{}` and `{"version":1,"projects":[]}` produce `Cannot read properties of undefined (reading 'developerMode')`. A string-valued settings field produces `Cannot create property 'developerMode' on string`. These failures happen during module initialization, before the bootstrap catch at `src/App.tsx:219` and Retry rendering at line 272 can help.

[E] The browser receipt captures the TypeErrors, absent application shell and absent recovery control. Screenshots show a blank screen. Clean storage and malformed JSON are positive controls; separately clearing the invalid record and reloading restores Home and its New challenge dialog. That excludes a generally broken build or stale discovery selector as the cause. Manual clearing is a diagnostic action, not an in-app recovery feature.

[R] Validate or migrate the saved state before reading it: at minimum require an object, valid settings object and valid project collection. Handle invalid saved data through a usable fallback/recovery path, preserving valid recoverable content where possible. Add the existing five browser cases as a regression. A native rerun of this unchanged checker should close the defect only after repair. Scope is browser-preview saved-state recovery; this is not a claim of live user data loss or an Electron persistence failure.

[E] Sent this defect through the bridge with `src/api.ts:15-16` and `src/App.tsx:219/272`. The prior shared integration findings remain separate acceptance items; these four receipts do not close or reproduce them.

## Checker repairs

[E] `src/ModelSettings.tsx:49-55` now exposes a Model connection tablist: ChatGPT, API key, GenAI.mil and Other providers. The key field is conditional on API key at line 82; Pi controls are under Other providers. Updated desktop tests select the relevant tab explicitly. Stop and Resume select Other providers and scope provider/model/save controls to that panel. Stop explicitly selects its fixture model. Later Home, intake, Start/Stop and Resume controls were checked against current source.

[E] The executed desktop checker at hash `d55941bed70130e7d53223e069fcac49ec3c1c05a8e4b038bcdc77ffcbef23ea`, line 179, dynamically imported `node:crypto` from a function injected through Electron's inspector evaluation. A pure Node inspector/eval reproduction throws `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`. Installed Playwright source confirms Electron evaluation uses its Node inspector context. In the actual receipt, the screenshot displays the browser-opening failure that `electron/codex-account.ts:152-158` emits when the injected opener throws. This is a checker defect; the receipt establishes no completed sign-in or external-browser failure.

[E] Replaced that interceptor with an import-free function. Exact URL equality remains checked privately in memory; only protocol, host, path, loopback origin and diagnostic flags enter evidence. A synthetic self-check now runs inside the actual Electron evaluation context before initiating sign-in, then resets its metadata. Failure of this self-check is setup ERROR, not a product FAIL. All four tabs must lock while connecting; reopening must preserve the same login URL; cancellation still requires disconnected state and connection refusal from a fresh loopback connection. Authentication acceptance remains unmeasured until a corrected native run, and completed login remains outside this fixture's scope.

[E] Detached Stop's worker programs, seven verdict conditions, process-identity checks, deadlines and observation/cleanup ordering are unchanged. Native Resume's gates, restart/identity/artifact assertions and completion scope are unchanged. Browser recovery's expectation and script bytes are unchanged. Passing checks were not removed or weakened.

## Rerun files

Use the same four commands in [[Research/QA/Acceptance/Overnight]]. Each accepts the supplied clean compiled checkout without a fixed commit. Main owns execution.

| Script | SHA256 after repair |
| --- | --- |
| `qa-desktop-inputs.mjs` | `f64745abf6dcfe38b547fb44742b7b9f207ad16d5767326bd33f288c7858e457` |
| `qa-stop-detached.mjs` | `0430c87236d9e6e768e954a5c30784e21b373870853fcfd57eeef09798b5327e` |
| `qa-native-resume.mjs` | `0d30239375513bcf547e295af76d87d79822f3be7eee476a7fd6aea0de960be8` |
| `qa-browser-recovery.mjs` | `0230ed2faf8e3ab463d653bfc626a95a72b614f7387ffaa9fc95a9ad90295333` |

[E] All four scripts pass syntax and their pure controls. A separate source review checked the updated desktop selectors and interceptor. During review, the test clone advanced to `d631e9f`, a smoke-fixture/teardown change. The cited `src/api.ts`, `src/ModelSettings.tsx` and `electron/codex-account.ts` are unchanged from d6f8750. These observed verdicts remain attributed to d6f8750. A new run must record its actual revision and build; source inspection alone does not transfer a runtime result.

[R] Rerun the three repaired native scripts. Rerun browser recovery after the product fix; without it, its three FAILs should remain. Send the new receipts for independent review. No combined-app acceptance is claimed from this partial batch.
