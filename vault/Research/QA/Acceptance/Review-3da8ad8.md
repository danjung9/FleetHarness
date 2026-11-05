---
type: review
status: active
owner: mukul
updated: 2026-11-05
summary: "Four native/browser receipts hold within scope; remaining combined-app gaps and the next delivery and persisted-baseline checks."
---

# Combined receipt review at 3da8ad8

**[E] All four reported PASS results hold within their stated scope. No reviewed result needs to be downgraded.** The browser saved-state startup defect closes for the five tested cases. Detached Pi Stop and orderly application restart/Resume also pass their specific reproductions. These receipts do not establish complete acceptance of the combined app, completed sign-in, useful live-model output or delivery.

[E] Main executed the receipts on clean `3da8ad831b7794bd65232ab074e986e8adbb8272`, tree `d705c5cb4b6a57539ce0a91f4c0c9e407130f183`, in `fh-org/astra-test`. Review compared raw observations, checker assertions, screenshots, source, retained worker evidence and hashes. Native receipts' 59 frontend and 93 backend files match the inspected checkout; the browser receipt covers the same 59 frontend files. Before/after identities agree and checker hashes match. Retained dependency/runtime identities also match. This establishes which compiled bytes ran and stayed stable; derivation from source still depends on main's separate build receipt. No product code or native application was executed during this review.

## What the receipts actually establish

Paths below are relative to `Research/QA/Overnight/`. Original receipts are unchanged.

| Receipt | Confirmed result | Evidence and limits |
| --- | --- | --- |
| `desktop-inputs-eef69f85-cff0-4169-ac53-332704d6ae2e/result.json` | 15 PASS, zero FAIL/ERROR | Three key-field controls; actual OAuth loopback start/reopen/cancel; eight rejected input batches with valid retry; exact size/count boundaries; exact Unicode/CRLF after renderer reload. No renderer errors; cleanup PASS. Key rejection deliberately uses an owned IPC replacement. It does not prove production key acceptance/storage or model access. Reload keeps the main process alive. |
| `browser-recovery-2026-11-05T07-35-45-724Z-c1f7f00f/receipt.json` | Five initial-case PASS results | Absent storage, malformed JSON, `{}`, missing settings and string settings all mount interactive Home directly. Four manual-clear controls are separate and cannot upgrade an initial failure. No page errors or blocked requests; owned Chrome exits 0. The unchanged checker previously failed the latter three cases at d6f8750. |
| `stop-detached-d1fd10f4-8441-46c0-889c-df8e865257e8/result.json` | Seven checks PASS | Owned shell/parent/child live before Stop; parent and detached child each have eight advancing heartbeats. Distinct process groups and macOS `Ss` leaders prove the intended detachment despite unavailable numeric session identifiers. Stop completes in 979 ms after click completion, 1,021 ms including the click. All three PIDs are absent at both endpoints 8,017 ms apart; parent/child counts stay 11/15 and requests stay 1. Verdict precedes cleanup by 52 ms, with 48,729 ms left before worker watchdog expiry. Seven retained control hashes match. This is Pi with one ordinary parent and one detached child. |
| `native-resume-fbd2f890-5861-4158-b77a-9f1a43344da5/result.json` | Five PASS results | Held implementation request 8 is not forwarded and closes 17 ms after Stop starts. PID 26935 exits before PID 27164 launches, 915 ms later. Project/run/workspace/checkpoint identity and four completed artifact hashes survive. Resume forwards new implementation requests 9-11, finishes implementation and reaches held verification request 22 without repeating earlier phases. Final Stop closes that held request after 18 ms. It does not complete verification, approve or deliver. |

[E] The OAuth interceptor self-check resets before the real sign-in attempt. The native assertions require a real loopback HTTP 404 before cancellation, locked connection tabs, identical privately compared reopened URL, disconnected account state after cancellation and fresh-connection `ECONNREFUSED`. External browser opening is intercepted and no login completes. Evidence retains no authorization query or credential.

[E] Fix `212d1b1`, an ancestor of the measured commit, adds saved-state validation in `src/api.ts:18-27` before accessing settings. The original three startup failures now pass the identical checker. Closure is limited to those shapes; preservation of corrupt data and comprehensive migration remain unproven.

## Remaining coverage across the original 23 areas

[E] IDs retain [[Research/QA/Acceptance/Overnight]]'s original numbering. Its later Connectors and GenAI.mil additions are F24/F25. A listed repository test is available coverage, not a newly reviewed passing native receipt. Incidental navigation in the four receipts does not certify every control on a page.

| ID | What this batch adds | What remains unproven on the land target |
| --- | --- | --- |
| F01 Startup and recovery | Interactive native Home and five browser saved-state cases. | Native bootstrap failure/Retry/dismissal, other malformed project/settings shapes and recovery without losing recoverable data. |
| F02 Home and projects | Create/save synthetic projects; reopen the same saved project after full restart. | All example cards, filters/clear, empty list and repeated switching among projects. Reopening alone is not execution Resume. |
| F03 Navigation and dialogs | Settings tabs, intake, build milestones and recent-project navigation used successfully. | Global search shortcut/results/no-match; every dialog's Escape, focus return and keyboard path. |
| F04 Norfolk catalog | No new catalog-specific measurement. | Current search/select/refresh/source-switch journey and real catalog availability. |
| F05 Brief editing | Custom brief creation and save work in fixture journeys. | Every starter/field/link, later editing/invalidation and navigation during delayed file reading. |
| F06 Data inputs | Eight rejection/retry cases, exact limits, atomic batch rejection, Unicode/CRLF renderer reload. | Full application-restart durability of attached data; pending-paste behavior; generated output actually using changed supplied data. |
| F07 Runtime foundations | A browser fixture completes implementation. | Generated service/CLI selection, meaningful computation, package launch and documented startup from a fresh destination. |
| F08 API-key connection | Masked field, blank-submit lock, synthetic rejection/clearing and tab-change clearing. | Production authentication, real event-key model access, sign-out, account/billing context and persisted credential lifecycle. Account owner handles real credentials. |
| F09 ChatGPT sign-in | Actual callback listener start/reopen/cancel and tab locking. | Completed login, consent/usage behavior, switch/add/refresh/disconnect and restart with a real authorized account. |
| F10 Provider/model controls | Other providers configuration persists and drives real Pi SDK requests to a local fixture. | Top-bar selection, all locks/error paths, remembered-key OS persistence and external model access. |
| F11 Project lead | No new conversation-specific measurement. | Native streaming/cancel, draft recovery, clarification, stale/applied proposals and whether a proposed change solves the brief. |
| F12 Build and Stop | Real phase progression and bounded Pi shell/parent/detached-child Stop. | Codex engine Stop, Quit during work, data-preparation cancellation, resistant processes, pending service preview and packaging cancellation. Full host access is intentional. |
| F13 Resume | Actual orderly Stop, full restart, same run and artifacts, implementation completion without earlier phase reruns. | Resume verification with original persisted tests, sensitive-looking test filenames, failed-repair recovery, abrupt crash, checkpoint error UX and live auth. |
| F14 Phase details | Saved completed-phase artifacts and current stage remain coherent through Resume. | Every details/evidence/reload/Try app action, including current evidence after failure or revision. |
| F15 App preview | No complete independent input/output preview check in these receipts. | Changed inputs must change computed outputs; service/CLI handling, reload and folder-open error recovery. |
| F16 Files | Four saved phase files are hashed directly for identity. | Person-facing browse/read/open folder and read-failure retry. Direct filesystem inspection does not prove the Files UI. |
| F17 Activity | No dedicated activity-control receipt. | Filters, expansion, live-follow/jump and correct late-error attribution after Resume/revision. |
| F18 Developer/System design | No dedicated receipt. | Mode persistence and diagram navigation, fit/pan/zoom/expand, including keyboard operation. |
| F19 Verification and evaluation | Resume reaches verification; it intentionally stops there. | Full real host verification, useful independent app outputs, deferred/gap display, repair outcomes and no adoption of late untested source. Self-authored test counts and a fixture judge do not prove brief completion. |
| F20 Visual review | No completed visual-review receipt in this batch. | Desktop/narrow captures, source-current comparisons, image retry/tamper handling and a person's quality judgment. |
| F21 Agent browser | No completed browser-assisted repair measurement in this batch. | Actual input/click/image/console use and cleanup on the target, plus diagnosis and repair of an unseen defect by a live model. |
| F22 Human review | No completed review/approval/iteration receipt in this batch. | Notes/acknowledgment gates, stale-source refusal, run-specific history and a requested behavior actually changing in a freshly verified iteration. Automated acknowledgment cannot count as a person's acceptance. |
| F23 Delivery | No actual export/package receipt in this batch. | Real source/evidence export, fresh-copy behavior, stale-source export refusal, packaged app/service/CLI launch, cancel/retry and preservation after failed delivery. |
| F24 Connectors, added later | No connector-specific receipt independently reviewed here. | Synthetic OAuth/data-service native journey, approval/sample integrity, OS encryption/restart and owner-controlled live interoperability. |
| F25 GenAI.mil, added later | Its connection tab participates in OAuth locking. | Save/connect/retry/countdown/unlock/replacement/clear/restart and actual authorized service access. Tab presence is not connection coverage. |

## Earlier audit findings on this source

[E, source and test inspection] Commit `9a54042` is an ancestor of the measured target and changes all three paths in the earlier shared integration audit. Those old findings must not be described as unchanged defects at 3da8ad8. Their stronger closure conditions are still separate from these four receipts.

| Earlier finding | Current source and regression | Remaining native evidence |
| --- | --- | --- |
| Late untested source could acquire passing evidence. | `electron/independent-judge.ts:266-280` uses `writeVerifiedArtifact`; `electron/pi-backend.ts:966-973` retains and compares verified identity before finalization. `tests/independent-judge.test.mjs` rejects a late publication mutation; `tests/lifecycle.test.mjs` rejects a cleanup mutation. | Exact regression receipts on the land target and actual refusal of approval/export after source changes. A later ordinary tamper test does not itself reproduce the original publication race. |
| Stop could miss service preview before its first awaited save. | `electron/main.ts:232-240` reserves an abort controller before save and checks it before startup. `stopPreview` aborts it at line 131. The lifecycle test holds that save and asserts zero starts after Stop. | Target regression receipt; native service-startup/Stop coverage remains separate from the detached shell case. |
| Filename-based redaction corrupted persisted test baselines. | `electron/secrets.ts:39-41` treats filename keys as data while retaining value redaction. Secret and backend tests cover `token.test.cjs` and `tests/password.test.cjs`. | Actual generated test baseline, Stop, full app restart and Resume verification with such a filename. The passing implementation-Resume fixture has not yet created this persisted baseline. |

## Next checks

[E] The first new script is ready: `Research/QA/Overnight/qa-native-baseline-resume.mjs`, SHA256 `e53ee61b7a80af13690252ff3e4f1f092c7000dd6922118b02f69dafb1d1bcbf`. Source review, syntax and pure negative controls pass. Main received its path. It changes only literal fixture filename references from `parser.test.cjs` to `token.test.cjs`, records original/transformed hashes, and checks exact saved baseline bytes/hash maps before Stop, after full process exit, after restart and during resumed verification. It requires a newly written verification artifact without rerunning earlier phases, then stops. It does not complete verification or execute the preserved tests after that gate. No native result is claimed yet.

[R] The second script completes the build-to-source-delivery path with independent changed-input checks. It is still being prepared; final commands, hash and validation will be recorded before handoff. Main retains native execution.

[R] After those checks, prioritize the owner-controlled intended event-key/Codex build and Stop route, a concrete requested behavior change, and native service/CLI delivery. Retain the target's exact lifecycle/judge regression receipts rather than substituting a broad test count. Windows and hosted deployment remain separate platform/branch acceptance.
