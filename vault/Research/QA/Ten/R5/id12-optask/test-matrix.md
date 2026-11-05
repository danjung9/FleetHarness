# Primary deferrals

- **UC12-1**, “A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline.” **real-data:** authorized authentic USMTF messages with validated event/field answers are absent, and this run is synthetic-only. Withhold real-format accuracy/conformance claims. Demonstrate the entire named transformation using the exact invented mock OPTASK fixtures: frequency plans, crypto change-over windows, flight quarters event times and consolidated visual timeline. All other canonical criteria are planned as implemented within their explicit synthetic scope; no real transmission or approval is asserted.

This formalizes the real-format boundary already recorded in scope/research; it does not defer any synthetic core behavior for lack of a specification or expert. The deferred criterion remains unverified even if every prototype check passes. Verification, README/user guide and review summary must repeat this section first. Owner approval is required before delivery/deployment; this planning handoff does neither.

# Acceptance inventory and planned evidence

Every row is **planned, not run**. Source requirements are retained verbatim; provenance aliases do not become extra criteria. The host freezes literal outcomes before building.

## UC12-1

Original: A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline.

Provenance: [{"kind": "requirement", "id": "UC12-1", "path": "challenge.requirements[0]"}, {"kind": "description", "id": "SCOPE12-4", "path": "userScope.description[218:418]"}].

Disposition: deferred. Expected: Real USMTF raw text extraction of every named category into a consolidated timeline remains unverified. The complete synthetic three-category transformation is demonstrated, not counted as real-format validation.

Input and checks: S01/S02 and authentic USMTF comparison unavailable; syntheticCoverage dense-day/combined-day exercises every named output.

Result: unverified (real-data dependency); synthetic demonstration still must pass. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## MSG-01

Original: Every extracted field has exact source offsets.

Provenance: [{"kind": "recipe", "id": "MSG-01", "path": "recipe.acceptance[0]"}].

Disposition: implemented. Expected: All event values and header values have original UTF-16 source slices. FP-A MHZ evidence is 123.450 at [20420,20427) in DOC-DENSE; evidence selection exposes it.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys dense-day; capabilities extract.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## MSG-02

Original: Do not invent ambiguous timestamps.

Provenance: [{"kind": "recipe", "id": "MSG-02", "path": "recipe.acceptance[1]"}].

Disposition: implemented. Expected: S06 to S12 retain input and emit the keyed diagnostic; no missing zone, impossible date, missing end or reversed interval becomes a timestamp. Correcting S07 yields CW-R at 10:00 to 10:15Z. Dirty drafts cannot be saved as reviewed.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys recover-zone, recover-empty, revision-choice; capabilities extract, review.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## MSG-03

Original: Normalize time zones without shifting the event.

Provenance: [{"kind": "recipe", "id": "MSG-03", "path": "recipe.acceptance[2]"}].

Disposition: implemented. Expected: S02 retains eight events, seven visible: FP-B clips 0 to 60 with duration 120, FQ-C clips 1420 to 1440 with duration 45; equivalent offsets retain the same instants. Midnight point is visible; interval ending at midnight is not.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys combined-day; capabilities timeline.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## MSG-04

Original: Review output against an independent answer key.

Provenance: [{"kind": "recipe", "id": "MSG-04", "path": "recipe.acceptance[3]"}].

Disposition: implemented. Expected: Host exact comparison of independently fixed synthetic cases has score 1, with event/field precision and recall 1 on the declared case denominator, including REMARK negatives. Public data is not a secret holdout or SME validation.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys dense-day, combined-day; capabilities extract.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## MSG-05

Original: Keep the timeline usable offline.

Provenance: [{"kind": "recipe", "id": "MSG-05", "path": "recipe.acceptance[4]"}].

Disposition: implemented. Expected: With external requests blocked and the loopback service available, a new raw message parses to CW-R and exports its saved reviewed schedule with original sources and disclosure. Service shutdown explicitly prevents new parsing.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys local-only; capabilities browser interaction evidence.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## DELIVERABLE12-1

Original: A tool that seamlessly converts mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders.

Provenance: [{"kind": "deliverable", "id": "DELIVERABLE12-1", "path": "challenge.expectedDeliverables.lines[0]"}, {"kind": "description", "id": "SCOPE12-6", "path": "userScope.description[442:578]"}].

Disposition: implemented. Expected: Mock OPTASK raw text becomes a synchronized 00:00 to 24:00 UTC visual schedule with all three named categories; review, evidence and labeled export work at both widths. S01 has four events and S02 eight (seven visible).

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys dense-day, combined-day, revision-choice; capabilities extract, timeline, review.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## DESC12-1

Original: Warfare commanders disseminate operational orders via dense, formatted telecommunication messages.

Provenance: [{"kind": "description", "id": "DESC12-1", "path": "challenge.description[0:98]"}, {"kind": "description", "id": "SCOPE12-1", "path": "userScope.description[0:98]"}].

Disposition: implemented. Expected: Dense fictional commander-style formatted tasking is accepted as preserved raw text, with inert narrative lines and source evidence; no actual dissemination is claimed.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys dense-day; capabilities extract.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## DESC12-2

Original: Watchstanders must parse hundreds of lines of text to determine when their ship is scheduled for events.

Provenance: [{"kind": "description", "id": "DESC12-2", "path": "challenge.description[99:203]"}, {"kind": "description", "id": "SCOPE12-2", "path": "userScope.description[99:203]"}].

Disposition: implemented. Expected: The exact 216-line DOC-DENSE yields four keyed events; all 207 REMARK lines are excluded. The fictional ship and explicit UTC day are visible.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys dense-day; capabilities extract.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## SUMMARY12-1

Original: Turn synthetic formatted tasking messages into traceable events and a consolidated daily timeline.

Provenance: [{"kind": "summary", "id": "SUMMARY12-1", "path": "challenge.summary[0:98]"}].

Disposition: implemented. Expected: Synthetic raw formatted messages transform into traceable category events and a single daily timeline, then a deliberately saved review/export with provenance.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys dense-day, recover-zone; capabilities extract, timeline, review.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## SCOPE12-3

Original: Requirements

Provenance: [{"kind": "description", "id": "SCOPE12-3", "path": "userScope.description[205:217]"}].

Disposition: implemented. Expected: The Requirements section remains associated with UC12-1 and its complete synthetic three-category workflow; it creates no extra invented behavior.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys source-info, dense-day; capabilities extract.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## SCOPE12-5

Original: Expected deliverables

Provenance: [{"kind": "description", "id": "SCOPE12-5", "path": "userScope.description[420:441]"}].

Disposition: implemented. Expected: Expected deliverables remains associated with DELIVERABLE12-1 and its synchronized 24-hour schedule.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys source-info, dense-day; capabilities timeline.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

## SCOPE12-7

Original: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12

Provenance: [{"kind": "description", "id": "SCOPE12-7", "path": "userScope.description[580:649]"}].

Disposition: implemented. Expected: The exact source attribution is visible in About and preserved in documentation.

Input and checks: Exact intake scenarios and relevant boundary inputs; journeys source-info; capabilities browser interaction evidence.

Result: planned; no application tests run. Evidence: future test-report.json per-criterion/journey entries, screenshots/traces and .quality-evidence/core-report.json; Node tests identified below.

# Application Node checks and independent evidence

| Test file / actual shared entrypoint | Input | Independent expected outcome | Result / future evidence |
| --- | --- | --- | --- |
| extraction.test.mjs / compute.mjs | All five exact records, all S01 to S12 inputs and correctedRawText | Four dense, eight combined, three variation, two boundary events; S05 dedup gives five candidates and two revision reviews. S06 unsupported; S07 missing zone; S08 invalid date; S09 missing end; S10 reversed interval; S11 bad MHz; S12 empty. Every correction gives CW-R 600 to 615. | Planned / Node TAP and host core report |
| extraction.test.mjs / compute.mjs | Unicode, LF/CRLF mixture, no final newline, every original event/header value | Half-open UTF-16 slices equal their exact field occurrences; DOC-DENSE MHZ [20420,20427), display-zone value [120,121); source identity links intact. | Planned / Node TAP |
| extraction.test.mjs / compute.mjs | 207 dense REMARKs including instructions, keyword/timestamp prose, unsupported WEATHER | Zero false-positive events; 216 source lines; only four keyed events. Code/data text never executes. | Planned / Node TAP; literal dense UI |
| timeline.test.mjs / compute.mjs | S02 to S04, explicit ±05:30/−04:00, ±14:00, impossible offset, Gregorian leap days and equal/reversed ends | Exact independently keyed UTC instants, durations and clipping; invalid dates/offsets abstain, midnight is half-open; no inferred rollover. | Planned / TAP and exact host evaluations |
| review.test.mjs / compute.mjs | Duplicated text/identity, changed identity contents, local duplicate event IDs, all revision order permutations | Identical document once; conflicting document suppressed with DOCUMENT_ID_CONFLICT; duplicate local events suppressed with DUPLICATE_ID; revision candidates never auto-replaced. Fully specified one-include decisions resolve alternatives. | Planned / TAP, review-cases, revision-choice |
| review.test.mjs / compute.mjs | Unknown fields, nulls, malformed types, invalid decision references, multiple simultaneous defects | Full literal error envelopes and specified precedence; no partial result leaks; request mutation absent. | Planned / TAP |
| transport.test.mjs / real loopback service | Invoke protocol, health, service unavailable; outbound network blocked while local remains | Raw result shape is unchanged; health succeeds; fresh parse/export succeeds without external access; stop service produces explicit recovery. Mutable temporary files only outside runtime. | Planned / integration log; local-only journey does not independently prove OS disconnection |
| Browser host journeys / real UI | Frozen seven journeys at desktop and narrow widths | All literal output, evidence selection, review, revision comparison, dirty-draft save/discard, reload and export expectations pass. | Planned / host test-report.json, screenshots/traces |

Node tests must import actual application compute and assert complete response objects, not reproduce implementation algorithms. Cases must cover valid sibling survival after invalid lines, body key order/extra fields, zero and nonnumeric frequency, point versus zero-length interval, header defects, unknown ships, selected-day changes and ambiguous timestamps. No test may import sealed evaluation-plan.json or .fleet modules. Runtime allowlist includes exact intake data for tests; UI embeds input-only samples and never fetches that JSON. Exports must include disclosure, input sources, field/header evidence, decisions, out-of-day/excluded events and UTC output. Saved snapshot cannot silently change when draft changes.

Host exact evaluations have threshold 1, trials 1, empty-output baseline 0. Report event and original-field precision/recall separately with counts for all declared keys, plus false positives across inert lines. Public intake data and DOC-VARIATION are known fixtures. Planner-authored three-category, mixed-newline and non-event holdout expectations are fixed before build and sealed; no SME independence is implied. A numeric metric alone cannot prove actual USMTF fidelity. Independent human judgment must inspect all named outputs and complete raw-text-to-timeline transformation, not merely parser structure or sample presets.

# Risks and operational review

Primary real-format UC12-1 remains unverified. No authentic dataset, approved real-format mapping, real orders dissemination, operational approval, identity integration or cryptographic action is established. Preserve synthetic labels in UI, examples, exports, README, verification and review summary. Owner must approve the tested revision before delivery or deployment. Domain review needs actual authorized messages, reviewed mappings, representative answer keys, real timezone/revision policy and operational-use authority before real use. No scans are supplied; handwriting/OCR is unestablished and outside this text-only build. Foundation redistribution licensing evidence remains unverified per research.

The local-offline contract requires the service; a disconnected local service is a failure for new parsing. The declarative browser runner cannot toggle OS network: enforce same-origin CSP in local-only mode and record actual outbound-blocked integration evidence in verification.md. Never describe checking the mode checkbox alone as network-disconnection proof. Review console/errors and storage-failure recovery. Desktop/narrow initial visual reviews and fresh rechecks must use the current runtime captures in each build/verify session. Host evidence files are host-owned; no planning or implementation code writes them. Repairs must preserve frozen contracts and stay inside the shared budget.

# Build result addendum

Planning expectations above remain unchanged. Actual application tests are `core.test.mjs` and `transport.test.mjs` (consolidating the planned parser/timeline/review files). Local command `node --test core.test.mjs transport.test.mjs` passes 16/16 tests. Full fixture event/evidence comparisons cover MSG-01/02/03 and the computational portion of MSG-04, DELIVERABLE12-1, DESC12-1/2, SUMMARY12-1 and SCOPE12-3/5. UC12-1 remains deferred/unverified. MSG-05 has local HTTP/CSP/shutdown checks but OS network disconnection remains unverified. SCOPE12-7 attribution is implemented in About and README. Every row still awaits the host's clean-runtime capability and frozen browser evidence; local passing tests do not substitute for it. See verification.md for denominators, actual exploratory browser observations, visual findings/resolutions and unverified checks.
