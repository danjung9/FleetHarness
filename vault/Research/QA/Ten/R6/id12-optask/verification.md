# Primary deferrals

None declared in the frozen plan. Two primary outcomes remain unmet, not validly deferred:

- **UC12-1:** “A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline.”
- **DELIVERABLE12-1:** “A tool that seamlessly converts mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders.”

The stand-in demonstrates all three named categories using invented SYN-OPTASK/1. It does not establish the requested input format. No authorized synthetic USMTF subset or domain-reviewed mapping was supplied. The frozen invocation explicitly requires the invented banner/grammar and literal rejection rules. This is a planning defect requiring a new planning run and reviewed format mapping, not an allowed real-system/data/authority deferral. No reviewer approval or domain validation is fabricated. Synthetic; not validated against the real USMTF format.

# Current format-finding repair, 2026-11-05

**requirementsMet: false. Finding unresolved.** Source inspection confirms the evaluator's finding. The frozen public invocation requires only SYN-OPTASK/1, including its banner and custom sets. Supplied intake documentation explicitly says no actual USMTF specification was consulted. Inventing another mapping or labeling builder-authored fixtures independently reviewed would not satisfy the requested fix. This is a planning defect, not an authorized deferral; a new planning run must establish the documented subset, reviewed mapping and held-out expectations before revising the protocol. No runtime behavior or original tests were changed.

Added `format-boundary.test.mjs`: actual HTTP invocations reject five undeclared/missing grammar versions with the complete literal error envelope. This is negative boundary evidence only, not format-conformance coverage. Original 25 tests rerun unchanged: 25 passed. Fresh temporary runtime copied from the declared runtime.files plus original tests and the additional test: **26 passed, zero failed/skipped**, recorded in `repair-evidence/format-boundary-clean-runtime.tap`; temporary runtime removed. Existing host capability results and frozen browser journey reports below are prior evidence, not newly executed host evaluations. Host rerun remains required.

This session completed its own visual loop: desktop initial `4587bbe8-4b49-481b-a840-72cd67fe964a`, narrow initial `258b7e01-2db7-4cf6-a698-43977d4155b7`, desktop fresh recheck `ed0d9ff5-4c94-420b-8145-112a8e6a71c4`, narrow fresh recheck `06baf66c-c7dc-494c-9961-af416053cf7a`. Actual images inspected and reviews recorded through fleet_visual_review with no findings. Loaded nominal sample, parsed, saved, declared review by keyboard and confirmed review; the observed download control enabled and status became Reviewed draft · synthetic only. No console/page errors observed. No runtime changes occurred between captures. These are development observations, not independent acceptance assertions. Original criterion map below remains applicable; UC12-1 and DELIVERABLE12-1 remain unmet. Owner approval and operational validation remain unverified.

# Prior bounded repair evidence, 2026-11-05

**requirementsMet: false.** The format finding remains open. The MSG-05 disconnected integration evidence gap is addressed locally. No runtime implementation or original test was changed. Owner approval, delivery and operational validation remain unverified; no deployment attempted.

## Executed evidence

- Original `node --test domain.test.mjs workflow.test.mjs verifier.test.mjs`: **25 passed, 0 failed/skipped**. Repeated in a fresh temporary directory containing exactly runtime.files plus those three test files: **25 passed**. Output: `repair-evidence/clean-runtime.tap`. Temporary directory removed; inherited environment preserved.
- Added `tests/offline.integration.mjs`: **2 passed, 0 failed/skipped**, desktop 1280×800 and narrow 390×844. Actual application UI and service worker, with Chromium networking disabled using `context.setOffline(true)`. Asserted navigator offline and failure of an uncached health fetch. No X-Offline-Route header/button used. Output: `repair-evidence/offline-run.json`, `repair-evidence/offline.tap`.
- Browser test activates cache online, saves nominal input, disconnects and reloads, induces empty-input error, supplies a new three-category message, parses, saves, reloads again offline, reviews and downloads. Assertions check all event IDs/categories/UTC endpoints/frequency/unit/durations/day segments, exact original LF text, synthetic provenance, saved message identity, issue-free reviewed status and every source evidence slice. Flight quarters clips 23:45 to 00:15 to 23:45 to 24:00 while retaining full endpoints/duration. Page errors: none.
- Application integration screenshots, traces and captured download JSON: `repair-evidence/desktop-schedule.png`, `narrow-schedule.png`, `desktop-trace.zip`, `narrow-trace.zip`, `desktop-download.json`, `narrow-download.json`. These are agent-run application evidence, distinct from host acceptance assertions and helper self-tests.

Direct shell Chromium launch failed due to macOS bootstrap permission denial; retained in `repair-evidence/browser-launch-failure.tap`. The tested `offline-browser` project helper ran the same application test with inherited environment and provisioned browser successfully. Its two configuration self-tests are not application acceptance. Initial new-test diagnostics exposed textarea CRLF normalization and duplicate test cleanup. The additional browser case uses LF input because native textarea values normalize CRLF; original frozen tests/expectations remain unchanged. Exact pasted file byte preservation is not established. Original core CRLF/Unicode tests remain passing.

## Host evidence and runtime identity

Existing host-owned `test-report.json` records 25/25 Node tests and 12/12 browser executions passing (six frozen journeys at both widths), while requirementsMet remains false. Its independent judge identifies the two unresolved findings that prompted this session. It is preserved, not rewritten to claim the new integration result.

Existing `.quality-evidence/core-report.json` records all three required capabilities passed: extract-evidence-cases 5/5, time-selection-cases 5/5, review-export-cases 5/5; score/threshold 1 for every case, no trial failures. Node v24.22.2; runtime filesHash `ad5629113311aeab535bda9f8e58e798e587c0fde9731070c2c42d806c6c8900`. Synthetic planner cases are not SME ground truth. No host evaluator is available to invoke in this phase's tool set; host retains ownership of final hashes and gates.

UI calls `/api/invoke` → server.mjs → compute.mjs → public/domain.mjs. Worker imports that same domain core for disconnected POST requests. Runtime files, architecture, foundation manifests, supplied fixtures, requirements and frozen contracts were not edited. Samples remain embedded in public/index.html. No second parser or hardcoded schedule was added.

## Current-session visual review

Both initial reviews preceded further work. Actual images inspected using fleet_browser and local image viewing. Desktop initial `7afb22ef-4f5c-464b-bf8b-af1b0110d8ad`; narrow initial `73b15963-6b27-468f-9ea0-df4a41ab3ad0`. Clear synthetic labels, readable draft controls, wrapped narrow source link, no visible page overflow. Main host preview journey loaded nominal sample, parsed, saved and used keyboard Space to declare review, then confirmed reviewed draft; no page errors.

Fresh desktop recheck `eaa99fb0-c5f1-4308-a15f-aa481caa0b66` shows enabled download and reviewed synthetic status. Narrow recheck `fb4ea973-ca38-4193-b498-9736484ae4f4` shows readable stacked crypto/flight outputs and field buttons with wrapped times. Both recorded through fleet_visual_review; no findings and zero unresolved ledger findings. Runtime files remained unchanged throughout. Host owns visual-review.json. Agent visual judgments are not independent human review or a complete accessibility audit. Optional Impeccable engine was not run; assigned references read directly.

## Criterion map

| ID | Current evidence and limits |
| --- | --- |
| UC12-1 | **Unmet** input format; three-category invented-grammar workflow passes only its scoped checks. New planning run needed. |
| MSG-01 | Pass for synthetic grammar: original exact complete fixture responses, Unicode/CRLF HTTP source slices, added downloaded source slices. |
| MSG-02 | Pass: invalid/missing dates/zones, empty/unsupported input and duplicate quarantine; disconnected empty-input recovery added. |
| MSG-03 | Pass: equivalent zones and overnight core cases; disconnected downloaded 23:45 to 24:00 day clipping with original full interval. |
| MSG-04 | Host synthetic held-out checks pass; real-format independent domain answer key remains unverified. |
| MSG-05 | **Additional local integration pass** at both widths with actual network disconnection, two reloads, new computation, saved review and download assertions. Existing host report predates this evidence. |
| DELIVERABLE12-1 | **Unmet** mock USMTF format fidelity; synchronized 24-hour synthetic schedule demonstrated. |
| DESC12-1 | Dense synthetic formatted traffic tested; operational order formats/dissemination unverified. |
| DESC12-2 | SYN-DENSE 320-line fixture, ship filtering and host dense journey pass within synthetic scope. |
| SUMMARY12-1 | Synthetic traceable events/timeline pass core, host journeys and new offline integration. |
| SCOPE12-3 | Source requirement grouping; full source obligations remain incomplete because UC12-1 is unmet. |
| SCOPE12-5 | Deliverable grouping; full delivery outcome remains incomplete because DELIVERABLE12-1 is unmet. |
| SCOPE12-7 | Visible original source attribution observed; attribution is not evidence of USMTF conformance. |

All six components have mapped files and are reported generated; this means implementation exists, not all requirements are verified. Generated/runnable/tested synthetic prototype: yes. Reviewer-accepted: no recorded approval. Operationally validated: no. No OCR, real crypto material, government connection or authority to operate established.
