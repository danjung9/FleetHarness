# Verification evidence, 2026-11-04

Primary deferrals: none. **MSG-04 remains deferred/unverified** pending an independent person's recorded inspection of the planner-authored synthetic answer key and actual output (human-authority). Automated scores cannot provide that review. `requirementsMet` is **false**; prototype browser checks are **unverified**, separately from the passing Node checks.

## Executed checks and bounded repair

Read requirements.md, plan.md, .fleet/packet.json, .fleet/quality-contract.md, the three assigned skills, acceptance-plan.json, ux-spec.json, system-design.json, README.md, test-matrix.md, application source and tests. Preserved both frozen plans, system-design.json and .fleet/. No operational systems, real data, network sources or credentials were accessed.

Commands actually executed in this verification phase:

1. `node --test core.test.cjs workflow.test.cjs`: 21 passed, 0 failed, 0 skipped.
2. Added application tests in adversarial.test.cjs; `node --test adversarial.test.cjs`: 6 passed, 4 failed, 0 skipped. This original failure is retained below; it is not replaced by the repaired result.
3. One bounded implementation repair in core.cjs, then `node build.cjs` to rebuild the self-contained index.html.
4. `node --test core.test.cjs workflow.test.cjs adversarial.test.cjs`: **31 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo**; exit code 0.

Tests execute actual application functions from core.cjs and the actual embedded core extracted from index.html in a Node VM. No toolkit calculation is counted as application evidence. No browser DOM or visual rendering is exercised by these tests. No temporary test data was created.

### Preserved pre-repair failure evidence

The initial adversarial run exited 1 (10 tests; 6 passed; 4 failed):

- `module: prototype property names are unsupported records, never events` and its inline counterpart failed with `AssertionError: constructor`, actual event count **1**, expected **0**.
- `module: restored evidence rejects changed issue spans, headers and grammar` and its inline counterpart failed with `AssertionError: Missing expected exception` when an issue source span was altered in persisted state.

The parser's type lookup inherited Object prototype properties. The repair uses a prototype-free mapping so constructor, toString, __proto__ and hasOwnProperty become unsupported issues. Restoration previously compared records/events but omitted issue evidence and headers. It now checks original issue fields, spans, line, code, reasons and message, headers, grammar and offset unit against a fresh parse of the preserved source. Both fixes run in the shared module and rebuilt embedded core. These are corruption checks, not authenticated storage or protection against deliberate rewriting of the complete session.

The same single bounded repair allowance has now been consumed. The host must rerun Node and browser gates on this revision; no second repair is claimed or authorized here.

## Criterion evidence

Canonical IDs/provenance: unchanged .fleet/packet.json captured 2026-11-04, challenge.requirements[0], challenge.expectedDeliverables.lines[0], and recipe.acceptance[0 to 4]. Inputs and literal outcomes remain in test-matrix.md and the frozen acceptance-plan.json.

| Criterion | Actual application input and expected outcome | Executed evidence | Remaining status |
| --- | --- | --- | --- |
| UC12-1 | Fictional sample directly yields Frequency Plan, Crypto Change-over Window and Flight Quarters; reasoned non-event exclusion; actual finite key comparison | core.test.cjs three-category and key tests; workflow.test.cjs exclusion/review tests; all pass | daily-schedule, exclude-non-event, answer-key browser journeys pending; human task-fit and real-format validation absent |
| MSG-01 | Sample start UTF-16 [102,122), line 2; mixed CRLF/LF and surrogate-pair text slice exactly; corrupted restored spans rejected | core.test.cjs field evidence tests and adversarial.test.cjs restored evidence tests, module and inline; pass | Browser evidence inspector and actual JSON download pending |
| MSG-02 | Empty, missing timezone, impossible date, unsupported lines/tags and duplicate IDs remain errors, never guessed events; stale exports denied; failed oversized reparse preserves history | core.test.cjs validation; workflow.test.cjs revisions/gates; adversarial.test.cjs unsupported tags and 200,000/200,001 boundaries; pass | invalid-recovery, exclude-non-event, stale-review browser journeys pending |
| MSG-03 | 01:00 -05:00 equals 06:00Z; 60-minute interval clips 30/30; midnight endpoint excludes following day; 30 seconds remains 0.5 minute | core.test.cjs clipping/offset tests; adversarial.test.cjs midnight test; workflow.test.cjs CSV full endpoints; pass | utc-boundary and daily-schedule browser journeys pending |
| MSG-04 | Independent person reviews the key, actual output and denominators | Automated key tests pass 3/3 events and 17/17 fields; wrong fields, missed/extra events and zero denominators tested | **Deferred/unverified**; human review not performed; finite scores do not satisfy criterion |
| MSG-05 | Embedded logic parses/reviews/exports without external dependencies; stored draft/review/day round-trip | Embedded/module parity and workflow persistence tests pass; README quick-start source inspection completed | **Offline integration unverified**: disconnected browser, local-file reload and downloads not exercised |
| DELIVERABLE12-1 | Sample UTC day has 3 events, 165 summed minutes, 15-minute overlap; following day has 1 event, 30 minutes; matching CSV/JSON | core.test.cjs schedule tests and workflow.test.cjs export tests pass | Daily visual schedule, readable tracks, responsive layout and complete workflow pending host desktop/narrow runs |

## Guide and UI consistency

Inspected README controls, sample, evidence range, review gates, date application, filenames, comparison scores, persistence warning and reset steps against index.template.html handlers and the tested core embedded in index.html. Guide labels and named outputs match source. Updated developer commands to include adversarial.test.cjs, recorded the actual verification result and described strengthened corrupt-session handling. system-design.json's six components and mapped filenames remain consistent and unchanged.

Guide quick-start browser opening and walkthrough were **not exercised in a browser**. Inspection plus Node checks do not demonstrate that users can complete the UI. In particular the following still need evidence: file opening with JavaScript, evidence-inspector focus, checkbox/issue editing, deliberate review, applied date control, actual downloads and retry, reload restoration, keyboard-only operation, reset/cancel focus and clear, storage denial/quota UI, disconnected operation, console errors, responsive overflow and readable timeline tracks. The guide's caveats remain explicit.

## Host evidence and completion boundary

No browser tool or host browser report was available in this phase. All six frozen journeys (daily-schedule, utc-boundary, invalid-recovery, exclude-non-event, stale-review, answer-key) must run at **desktop and narrow** sizes. Screenshots, traces, console checks and layout results are absent. Browser gate is unverified and the verification completion gate is **not satisfied**. An additional network-disabled browser workflow is required for MSG-05; ordinary online journeys alone do not prove it.

The host owns test-report.json, screenshots, traces and source hashing. None existed in the inspected workspace; none was fabricated or edited. This document records agent-executed Node evidence only. Host-owned required outputs await the harness runner.

Generated: all six mapped components and self-contained page exist. Runnable domain code: exercised under Node; browser launch pending. Tested: 31 Node tests pass, no skips. Browser verified: no. Reviewer accepted: no. Operationally validated: no. Actual USMTF/SME mapping, handwriting/OCR, security authorization and government-system integration remain outside demonstrated evidence. Human local confirmation is not independent review or operational approval.
