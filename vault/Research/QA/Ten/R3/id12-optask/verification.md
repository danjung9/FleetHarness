# Primary deferrals

None in the frozen plan for the scoped synthetic demonstration. **Synthetic, not validated against the real format.** UC12-1's original USMTF requirement remains unverified for real formats. All named categories and the daily schedule are implemented as a labeled synthetic stand-in; no absence of a specification or expert is treated as an allowed deferral.

# Verification evidence, 2026-11-04

`requirementsMet`: **not established**. Prototype Node checks: **passed**. Prototype browser gate: **unverified / incomplete**, pending the host. This phase cannot pass its completion gate on Node evidence alone.

Generated: all six components and their mapped files in system-design.json exist. Runnable/tested: the standalone core and actual embedded HTML core execute in Node. Browser runnable status, reviewer acceptance and operational validation are not established. No host test-report.json, screenshots, traces or source hashes were supplied or written by this agent. Frozen acceptance-plan.json, ux-spec.json, answer-key.json, system-design.json and .fleet/ were preserved.

Executed `node --test core.test.cjs` against real application functions, including the actual inline core evaluated in a VM:

- Baseline: 17 tests passed, 0 failed, 0 skipped.
- Added adversarial fixtures before repair: 23 tests, 19 passed, 4 failed, 0 skipped. Both module and inline reserved-name tests threw `TypeError: groups[r.id].push is not a function` for ID `constructor`. Both finite-frequency tests failed `1 !== 0`: a 400-digit frequency became an event despite Number conversion yielding infinity.
- One bounded implementation repair: use own-property record-type lookup, a prototype-free duplicate-ID dictionary, and finite positive frequency validation in core.js and the embedded copy in index.html. No frozen expected outcome was changed.
- After repair: 23 tests passed. After adding the remaining calendar/benchmark boundary coverage: **27 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**; command exit 0. Final reported duration 102.946667 ms. No temporary test data files created.

The shared implementation repair allowance has been used. The host must execute both gates against this revision; this report does not assert future results.

# Criterion mapping

Original wording and packet provenance remain in test-matrix.md. All tests below are in core.test.cjs and run separately against core.js and the actual inline core from index.html. Passing functions do not verify rendered controls.

| Criterion | Input and expected outcome | Executed evidence / result | Browser or other evidence still required |
| --- | --- | --- | --- |
| UC12-1 | Planning key H yields Frequency plan HF 305.25 MHz 08:00 to 09:00, Crypto change-over HC 12:10 to 12:20, Flight quarters HA 23:50 to 00:10 UTC | Literal planning-key tests: 3 matched, no field/time/span discrepancies; passed | daily-schedule and source-trace at both widths; source requirement's actual USMTF conformance unverified |
| MSG-01 | Exact original UTF-16 slices for all fields, mixed CRLF/LF and emoji; F1 id [5,7), start [8,25) | Provenance and literal key tests passed in both code copies | source-trace, rendered highlight and field selection unverified |
| MSG-02 | Empty, unsupported, missing zones/fields, impossible calendars, duplicates, equal/reversed intervals never become confirmed events; revisions preserve source | Invalid-input, calendar, reserved-name, finite-value, input-size, dirty persistence and replay tests passed; issue-containing reviewed snapshot rejected | ambiguous-recovery, invalid-calendar-recovery and dirty-review unverified |
| MSG-03 | Equal UTC instants across zones; 60-minute midnight interval splits 30/30; exact midnight excluded next day; spanning interval clips to 1,440 minutes | Zone/day boundary and full-day tests passed; full interval retained | timezone-day, proportional bars and outside-day text unverified |
| MSG-04 | H expects/extracts/matches 3, FP/missed 0, all discrepancy counts 0; non-event subset yields no events and N/A metrics; mutations detected | Key/discrepancy tests passed; removed HA yields recall 2/3 and missed 1; added X yields precision 3/4 and FP 1 | held-out-comparison unverified; independent human comparison/review not performed. Planning-authored key is not SME ground truth |
| MSG-05 | Local parse/review/export retains source, spans, full intervals, review state and synthetic disclosure | Revision/export, restore and inline/module equality tests passed; no package dependencies | daily-schedule, source-trace, dirty-review, actual disconnected local-file session, persistence and download unverified |
| DELIVERABLE12-1 | Mock tasking text produces all three categories, reviewed daily schedule, reload and provenance export; pending edits cannot be approved/exported | Core parsing, projection, revisions, restore and export tests passed | daily-schedule, timezone-day, dirty-review at both widths; visual schedule and watchstander usefulness require review |

# README and workflow review

Read README.md and user-guide.md against the HTML controls and core. Sample input matches the load-sample literal; controls for inspection, review, day selection, export, revision history, comparison and storage recovery exist. Developer quick start `node --test core.test.cjs` was executed successfully. The self-contained HTML embeds code and its answer key; no runtime fetch or imports are used. Guides now report 27 tests and finite frequency validation.

The browser quick start and every browser walkthrough step remain unexercised here: loading the local HTML; sample loading; source highlighting/field selection; acknowledgement; actual rendered schedule; applied day selection; reload; dirty-draft recovery; downloaded file; comparison acknowledgement; unreadable-storage export/replacement. This source inspection is not a browser pass. Storage denial, corrupt-storage recovery prompts, session-only wording, disconnected execution, keyboard focus, accessibility, console errors and layout overflow also require browser/manual evidence.

The host owns all seven frozen journeys at desktop and narrow widths: daily-schedule, source-trace, ambiguous-recovery, timezone-day, held-out-comparison, dirty-review and invalid-calendar-recovery. None is marked passed here. Screenshot/trace evidence is unavailable. Missing browser execution is an unmet verification gate, not an accepted deferral.

# Evidence boundaries

No fleet fixture or toolkit calculation is counted as application verification. The invented FREQ/CRYPTO/FLIGHT mapping covers the three named synthetic outputs but establishes no actual USMTF revision mapping. Precision/recall refer only to the planning-authored synthetic key, visible to the builder; there is no independent SME ground truth or human acceptance record. No real messages, cryptographic material, operational systems or external services were accessed. OCR/handwriting, operational accuracy, government connectivity, device security and authority to operate remain unverified.
