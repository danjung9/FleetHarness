---
type: review
status: reviewed
owner: mukul
updated: 2026-11-05
summary: "Six bounded receipts pass at 4a57562; preview reload and persisted baselines are covered, while retained export drift and complete acceptance remain open."
---

[E] All six receipts pass within their stated scope at clean `4a57562ea232c08bbfda21f638f65d6b7cce5793`. The native preview reload reproduction now passes, and the special-filename test baseline survives full application restart and resumed verification. Complete acceptance of the actual Morning training brief is still pending. The delivered browser fixture is a synthetic TASK parser, with a deterministic local provider and judge.

[E] Review used retained observations, screenshots, source, hashes and process evidence. No application, browser, model or product test was run during this review. Source in `astra-test` subsequently advanced to `9c9334433d29d7a7a6f4467bf18e473d59031a14`, while all 59 frontend and 95 backend compiled files still match the 4a57562 receipts. These passes belong to 4a57562 and its recorded compiled bytes, not the newer source. Hash stability does not prove compilation provenance.

[E] Receipt paths below are relative to `Research/QA/Overnight/`. Earlier failures and original receipts remain unchanged; see [[Research/QA/Acceptance/Review-0666861]] and [[Research/QA/Acceptance/Review-3da8ad8]].

| Receipt | Result | What it establishes and its limit |
| --- | --- | --- |
| `desktop-inputs-5f562b1d-0d12-4c40-ba7c-b23c2e3d6266/result.json` | 15 PASS | Key-field controls, real OAuth callback start/reopen/cancel, rejected-input retries, exact limits and Unicode/CRLF renderer-reload retention. Key rejection uses an owned handler fixture; no production key acceptance or completed login. |
| `browser-recovery-2026-11-05T09-37-06-211Z-891a1930/receipt.json` | Five PASS | Interactive Home for absent storage, malformed JSON, wrong-shaped object, missing settings and wrong settings type. Manual-clear controls cannot upgrade an initial failure. Broader migration and preservation remain open. |
| `stop-detached-71093d6b-0143-4220-b38b-1898edf34806/result.json` | Seven checks PASS | Live owned shell, parent and detached child before native Stop; all three PIDs absent afterward, with stable heartbeats/provider activity across 8,011 ms before separate cleanup. This is the bounded Pi case, not Codex or service-startup cancellation. |
| `native-resume-da2f8a54-def4-4fcd-a9d4-4e20d1b4811d/result.json` | Five PASS | Actual Stop, complete process exit, same-profile restart, preserved run/workspace/completed artifacts and resumed implementation without earlier-phase reruns. Stops at verification; no full-verification claim from this receipt. |
| `native-baseline-resume-58247271-9f24-4902-83b4-a240e7e5ec39/result.json` | Five PASS | Six exact `token.test.cjs` samples survive Stop/full exit/restart and actual Resume testing. A forwarded verification request completes and writes a new `verification.md`; no earlier phase reruns. The next request is held and stopped, so completed resumed verification is not established. |
| `native-delivery-d3816438-bb7f-426d-afed-2446f19856d1/result.json` | Ten PASS | Complete native fixture build, evidence display, independent changed-input preview, review gates, stale approval/export refusals, exact restoration, real source export and fresh offline exported-copy behavior. Source export only; current retained Markdown drift is described below. |

[E] All six receipts have stable recorded identities and confirmed cleanup, with no hidden page/proxy errors. Current checker hashes match their corresponding receipts. Stop's seven retained control hashes and separate observation agree; its verdict precedes cleanup with over 49 seconds remaining before the synthetic workers' watchdog deadline. Both Resume receipts confirm complete process exit and a different owned process after restart. The baseline receipt closes its earlier selector-blocked path and the bounded special-filename persistence reproduction, not abrupt-crash recovery or every test filename.

[E] Native delivery has 36 complete observation/screenshot sets. All four native-preview inputs and all four different exported-copy inputs match independently written literal answers. Empty-input recovery and old-draft clearing pass. Fresh Chrome starts offline before its file URL opens, starts with no saved result or draft, has no native bridge, and retains its new result and draft after reload. No generated test result supplies those expected answers.

[E] The native Reload preview defect closes for this same-run browser case. Before and after reload, the origin is `http://127.0.0.1:55814`; the path token changes, while `audit training row 19` and its draft survive. `4a57562:electron/preview.ts:11-12,39-46` retains the previous port. This does not establish persistence across full application restart or the fallback when that port is unavailable.

[E] Review notes and acknowledgment are checked in five visible states. Stale approval leaves the project in review; stale export leaves it approved. Both show the explicit changed-after-verification denial, make zero folder-chooser calls and create no delivery directory. Exact original `index.html` bytes are restored only after each denial, then real UI approval/export succeeds. The sole chooser follows export restoration. The exported report and approval match the authoritative recorded run, source hash, report hash, review text and timestamp. These checks cover ordinary post-verification tampering, not the earlier mutation-during-publication race.

[E] Reversing only the delivery checker's two old/new Model-tab selector changes recovers the original failed receipt's checker hash. The literal answers, native reload action and persistence oracle are unchanged. This is a product fix with the same behavioral expectation, not a weakened check.

[E] The retained export currently has 157 files, of which 146 match the runtime manifest. Eleven Markdown files differ solely through range-dash replacement with " to ": the two `.fleet` contract guides, `skills/impeccable/UPSTREAM.md` and eight Impeccable reference files. Pinned originals or a unique inverse replacement recover every recorded hash. Application files and authoritative `test-report.json`/`review.json` remain exact. The recorded source hash is `898a925f6725929f8fd1e95043b5afb528fd841f5f4563edc87ae118d5c2e819`; current retained bytes hash to `943c49af4977554e0d06aa0bf4254ed99b8792a06b07921f062e5d7d07d1d756`. The runtime PASS is retained, but the present directory must not be described as the exact approved bundle. Review establishes the transformation, not which process performed it.

[R] Preserve the original receipt and record this artifact-integrity caveat. Retain future original delivery bytes in an immutable archive before Markdown normalization can change them; do not silently repair or replace historical evidence.

[E] The new judge-NOT acceptance gate is not covered. This run receives `SATISFACTORY` with zero judge gaps, and the gap checkbox never appears. `4a57562:src/ReviewFlow.tsx:50,80,108-112` and `electron/review.ts:21-26` implement the separate gate; its rejection, acceptance, changed-judgment invalidation and exported-gap record need a dedicated receipt. Unverified requirement coverage in this fixture is distinct from a judge-NOT result. Automated checkbox use is not a person's acceptance.

[E] The following table retains the F01-F25 numbering from [[Research/QA/Acceptance/Overnight]]. It summarizes measured scope and remaining work; repository test availability alone is not a new native result.

| ID | Measured scope in this batch | Remaining gap |
| --- | --- | --- |
| F01 Startup/recovery | Native startup and five browser saved-state cases. | Native bootstrap Retry/dismissal, other malformed shapes and preservation of recoverable data. |
| F02 Home/projects | Create/save/reopen the same project after restart. | Every example/filter/clear/empty-list path and repeated project switching. |
| F03 Navigation/dialogs | Settings, intake and journey navigation used. | Global search/no-match, every dialog's Escape/focus return and keyboard path. |
| F04 Norfolk catalog | No dedicated measurement. | Search/select/refresh/source switching and actual catalog availability. |
| F05 Brief editing | Custom fixture creation/save. | Every starter/field/link, later editing/invalidation and navigation during delayed file reads. |
| F06 Data inputs | Rejections/retries, exact limits, Unicode/CRLF renderer reload. | Full-restart durability, pending paste and useful output driven by changed supplied data. |
| F07 Runtime foundations | Complete browser fixture. | Actual service/CLI foundations, useful computation and fresh documented package launch. |
| F08 API-key connection | Masking, blank-submit lock, fixture rejection/clearing. | Production authentication, credential persistence/sign-out and authorized model access. |
| F09 ChatGPT sign-in | Actual callback start/reopen/cancel and tab locking. | Completed login, plan consent, account switching/refresh/disconnect and authenticated restart. |
| F10 Provider/model controls | Settings select the local provider and drive real SDK requests. | Top-bar selection, all locks/errors, OS credential persistence and external model access. |
| F11 Project lead | No dedicated conversation receipt. | Streaming/cancel, draft recovery, clarification, stale proposals and useful applied changes. |
| F12 Build/Stop | Complete fixture progression and bounded detached Pi Stop. | Codex Stop, Quit, data-preparation cancellation, resistant work, pending service preview and packaging cancellation. |
| F13 Resume | Implementation Resume plus preserved `token.test.cjs` baseline during resumed verification. | Completed resumed verification, failed-repair recovery, abrupt crash, checkpoint-error UX and authenticated recovery. |
| F14 Phase details | Preserved completed artifacts and coherent stage progression. | Every details/output/reload/Try app control after failures and revisions. |
| F15 App preview | Independent changed-input results and same-run native reload persistence. | Service/CLI handling, preview/folder-open failure recovery and broader persistence. |
| F16 Files | Direct artifact hashes support identity. | Person-facing browse/read/open-folder/retry paths; filesystem reads are not Files UI coverage. |
| F17 Activity | No dedicated control receipt. | Filters/expansion/live-follow/jump and late-error attribution after Resume/revision. |
| F18 Developer/design | No dedicated control receipt. | Mode persistence and diagram navigation, fit/pan/zoom/expand and keyboard access. |
| F19 Verification/evaluation | Full host verification, visible limitations and independent literal parser outputs. | Actual Morning training outcomes, judge-NOT handling, useful general repair and late-publication mutation regression. |
| F20 Visual review | Complete fixture includes prescribed capture/evidence generation. | Dedicated comparison/expand/retry/tamper interactions and a person's visual-quality judgment. |
| F21 Agent browser | Deterministic build exercises prescribed browser/capture calls. | Broader input/console/error paths and diagnosis/repair of an unseen defect; no live-model claim. |
| F22 Human review | Notes/ack gates, real approval and stale-source refusal. | Judge-NOT gap acceptance, actual human review, post-delivery change, useful new behavior and fresh iteration approval/history. |
| F23 Delivery | Real source export, bound report/review and fresh offline browser behavior. | Retained-bundle drift, standalone app/service/CLI packaging, new service packager/container route, cancel/retry and failure preservation. |
| F24 Connectors | No dedicated connector receipt. | Synthetic native connection/data selection, sample integrity, OS encryption/restart and owner-controlled interoperability. |
| F25 GenAI.mil | Tab participates in connection locking. | Connect/retry/countdown/unlock/replacement/clear/restart and authorized service access. |

[E] The later service packaging source is a new F07/F23 path, not exercised by this static-browser source-export receipt. Post-delivery iteration and the judge-NOT branch also remain separate. Intentional full host/network access for build agents is not a defect. Windows and hosted deployment need their own platform/branch evidence.

[R] Main owns the next complete native journey for the actual Morning training brief on a clean, freshly compiled selected revision. Retain its brief/input identity, independently check the defining outcome and changed inputs, inspect gaps, complete review and actual delivery, then repeat the checks in a fresh delivered copy. Exercise the runtime/package route the brief actually requires. A TASK-parser fixture or an earlier scheduling oracle must not silently substitute for that brief's requirements. No live calls were made or initiated by this review; the actual Morning training delivery journey remains pending.
