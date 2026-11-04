---
type: qa-review
status: blocked-native-verification
owner: mukul
updated: 2026-11-04
summary: "Three R3 builds fail cleanup; source review identifies a likely macOS ps option-mode defect, while native Stop closure remains pending."
---

# Detached Pi Stop regression at 0da7ce9

[E] **The defect remains open pending a native rerun.** The earlier d0f4c69 receipt proves that the detached child continued working after Stop. The new integrated source addresses that mechanism, but source and injected-discovery tests do not establish native macOS shutdown. Main owns execution; this preparation launched no app, provider, worker or process scanner.

## Live R3 blocker

[E, R3 receipts reviewed after the pinned fixture handoff] The first three completed builds at reported f662d81 plus scratch patches all fail during final cleanup, after their verify stage completed. ID 12 reports 27 passing tests and 14 passing journeys; ID 36 reports 24 and 14; ID 11 reports 15 and 16. Their final.json files all retain the same generic cleanup warning and status failed. These are real factory failures, not candidate test failures, and not proof that a process survived.

[E] `~/fhten/app/electron/process-sweep.ts` is byte-identical to the reviewed 0da7ce9 sweep, SHA-256 `43ebf41d731bb8cac977b84bd6017b79e8454d8cf78e52c3c58a77fae60e3626`. The compiled process-sweep.js contains the same scanner argument vector and failure paths. The running app is a source copy without a Git directory; its reported head comes from the benchmark receipt. No process environment or credential content was inspected.

[E/V, source evidence] The scanner begins its argument vector with `ww` or `eww`, then `-u`, a numeric user ID, and `-o`. Apple's ps source changes to legacy option mode when the first argument lacks a leading hyphen. In that mode `-u` selects a display format and does not consume a user ID. A remaining numeric token becomes a PID request, and a following `-o` can trigger illegal-argument failure. The local ps manual also distinguishes modern and legacy `-u` behavior. [Apple ps.c](https://github.com/apple-oss-distributions/adv_cmds/blob/main/ps/ps.c), specifically PS_ARGS, case u, trailing-argument processing and kludge_oldps_options; local `/usr/share/man/man1/ps.1:628-639`.

[A] **Likely cause: mixed legacy and modern ps options make native inspection fail.** This source-based diagnosis explains why injected-discovery and parser tests miss the problem. It has not been reproduced against the installed binary here. No ps command was invoked, including any environment expansion.

[E] The current finalizer catches every sweep exception and replaces it with one generic warning. Inspection errors, invalid identities, surviving owned PIDs and failure to obtain two empty snapshots become indistinguishable in the final receipts. The raw R3 receipts therefore cannot establish the specific cause or clear the original detached-child defect.

[R] The runtime owner should keep new benchmark launches paused until owned cleanup is confirmed. The implementation owner should use one explicit macOS option mode, for example `-ww` with optional `-E` and `-U <uid>`, and validate both argument vectors through the native launcher. First verify option parsing with environment expansion omitted and all output discarded, retaining only status codes. Preserve the original FAILs. Do not dump command lines or environments to diagnose the issue.

[R] Preserve a safe structured cleanup reason such as inspection-command-failed, snapshot-unstable, survivor-present or not-quiescent. Retain allowed numeric exit/signal/timing data and verified owned PID identities only; do not propagate raw execFile errors, stdout or stderr. Add an argument-vector regression plus a native synthetic ownership check that finds the marked detached worker and leaves an unrelated synthetic worker alone. Then run the unchanged GUI Stop expectations on the exact newly integrated revision. Neither bypassing the sweep nor changing cleanup failure to review is an acceptable repair.

[E] Receipts: `Research/QA/Ten/R3/id12-optask/final.json`, `Research/QA/Ten/R3/id36-paperless/final.json`, `Research/QA/Ten/R3/id11-training/final.json`, their log-tail.txt files, and [[Research/QA/Ten/Round-3]]. Existing pinned fixture below remains a regression deliverable; a corrected product revision needs its own explicit pin before execution.

## Source review

- [E, Git objects in FleetHarness] The implementation is c4f6ac9b907d453da1f13f7ce234f4eb46b86594. Commit c6ce52d9fcf2f5194263958683124d3a66617d06 fixes its negative test: record signal attempts and assert outside the callback, because production catches callback exceptions. It also checks lost ownership. Both are ancestors of 0da7ce9cbd34c25175ef02eafafeda5cd983f866; process-sweep.ts is unchanged between c6ce52d and that pin.
- [E, electron/process-sweep.ts] Each run has a random environment marker in asynchronous run scope. Discovery matches the inherited marker even after reparenting or a changed working directory. Before each signal it rechecks marker ownership and start identity. Cleanup sends TERM, escalates to KILL, and requires two empty scans. Inspection failure or unresolved survivors reject cleanup. It signals individual PIDs, not whole groups.
- [E, electron/pi-backend.ts:51,120,143,281] Pi's bash spawn hook applies the marker. The finalizer awaits the sweep before reporting stopped or review, and publishes failed with an operator warning if cleanup cannot be confirmed. stop aborts and awaits run completion. Codex, browser verification and generated-test launches also receive markers, but this fixture measures only Pi.
- [E, tests/process-sweep.test.mjs] Tests use actual detached workers with injected discovery, plus synthetic macOS parser rows and fake engine sessions. These exercise ownership and completion ordering without proving native discovery on this Mac. No repository tests were run in this preparation.
- [E/A] This is cleanup, not a containment boundary. A process that clears the inherited marker is outside its discovery mechanism. Native macOS discovery reads current-user process arguments and environments into memory; source strips arguments before matching and suppresses raw inspection errors, but this test does not establish protection against all memory disclosure or marker spoofing. PID revalidation and signalling remain separate operations. Windows, other engines and adversarial workers remain outside the claim.

## Exact fixture and command

[E] [qa-stop-detached.mjs](qa-stop-detached.mjs) requires a clean checkout at `~/Documents/CDAO/fh-org/gui-0da7ce9`, full HEAD `0da7ce9cbd34c25175ef02eafafeda5cd983f866`. Expected source tree is `11ad42b156e3223aadf260e8144d2742f8cb7880`. The persistent qa-lead clone remains unchanged at 631849f.

[R] Main should prepare that dedicated checkout, use its existing authorized dependency/build environment, and retain a successful build receipt for this exact HEAD with no source patches. Rebuild both frontend and Electron outputs. The source's build sequence is TypeScript, Vite, then Electron TypeScript; installed executable equivalents are:

```sh
cd ~/Documents/CDAO/fh-org/gui-0da7ce9
node node_modules/typescript/bin/tsc
node node_modules/vite/bin/vite.js build
node node_modules/typescript/bin/tsc -p electron/tsconfig.json
```

[R] Stop if any build command fails. These are commands for the existing runtime owner, not execution performed here. Do not install dependencies or silently advance the pin to make the test run. With that build receipt, run:

```sh
node ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-0da7ce9/qa-stop-detached.mjs ~/Documents/CDAO/fh-org/gui-0da7ce9 ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-0da7ce9
```

[E] The fixture retains the previous environment allowlist and temporary app/model state. Its Electron environment contains no HOME, CODEX_HOME or inherited provider credential. The local scripted provider requires no real inference, account sign-in or entered credential. Native process inspection belongs to the separately authorized runtime owner; a denied inspection is ERROR, not a reason to bypass a restriction.

## What changed in the checker

[E] Only the checkout/revision pin and five UI selectors changed from the executed d0f4c69 fixture:

| Control | 0da7ce9 source mapping |
| --- | --- |
| Open settings | Settings button, src/App.tsx:247 |
| Build view ready | Build phases heading, src/BuildFlow.tsx:93 |
| Start | Start build in Challenge journey region, src/JourneyHeader.tsx:16,27,36 |
| Confirm | Start automatic build in Start build dialog, src/App.tsx:281 |
| Stop | Stop build in Challenge journey region, src/JourneyHeader.tsx:19,36 |

[E] Reversing those replacements restores the baseline script byte for byte. No worker, outcome, timing, identity, provider, observation or cleanup assertion changed. The baseline receipt and script remain untouched. New script SHA-256: `3d8140f954b98d8d8a8a6a470d3f332f126a8e1d4d8ec756c4a15771e8fbfcdb`. Baseline script SHA-256: `d517a44dcb0c4dbb4696bdb2eebc83d3a7b65ac8b3eb285f2fad218722f125d5`.

[E] Main-script syntax, generated-worker syntax and all existing pure verdict/identity controls pass. Generated child SHA-256 is `55542fe28668e0d865f4e8abfb54db4b74941ab6d2ae746ef5158cd9b1565fe8`; parent is `545e9e52c6a3a20cc1bd5cc2b1251c532892996395af61d73f56c9a4ae84b788`. Validation runs before runtime initialization and creates no runtime output.

## Evidence needed to close this case

1. [R] Match full commit, source tree, clean tracked state, executed script digest and the separately rebuilt frontend/backend artifacts. Check retained control-file digests and agreement between observation.json and result.json.
2. [R] Confirm three owned live PIDs before Stop, separate child group/session and advancing parent/child heartbeats. A setup or selector error is not a Stop result.
3. [R] Require all seven unchanged checks: stopped within ten seconds; all three PIDs absent at both observation endpoints after the two-second settling period; both heartbeat counts stable over eight seconds; no new provider requests; stopped state at both endpoints.
4. [R] Require the verdict to precede separate cleanup and all observation to precede the independent worker deadline by at least five seconds. There must be no early cleanup marker or worker self-exit explaining success. Separate cleanup must also pass.
5. [R] Close only this bounded Pi shell, ordinary parent and detached-child case if that evidence passes. A stopped badge alone, injected discovery, unit counts or successful fixture cleanup cannot close it. Post-click status timing is not exact descendant termination latency.

[E] Baseline and detailed fixture semantics: [[Research/QA/GUI-d0f4c69/Detached-Stop-Runbook]]. Runtime receipt and final closure judgment are pending.

[E, handoff status] The native execution request received no answer within the bridge's ten-minute wait. The later R3 diagnosis was delivered separately with a request to relay it to the implementation owner. No new runtime receipt was returned. Preparation and source diagnosis are complete; the remaining dependency is a corrected integrated revision, matching build receipt and native owned-worker evidence from the existing runtime owner. No new approval is being requested from Mukul.
