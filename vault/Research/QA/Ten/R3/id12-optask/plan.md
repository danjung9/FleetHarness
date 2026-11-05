# Primary deferrals

None for the complete scoped synthetic demonstration. All seven canonical criteria are planned as implemented prototype behaviors, not verified results. UC12-1 retains its original real-format wording; this plan demonstrates the complete named workflow using invented mock syntax only. Actual USMTF conformance, handwriting recognition and operational accuracy remain unestablished. No real connection or approval action is required by this slice, and none is attempted.

# Implementation plan

## Authority, scope and evidence boundary

Read requirements.md, scope.md, research.md, .fleet/README.md, .fleet/packet.json, .fleet/quality-contract.md and the four assigned local skills. Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12, packet captured 2026-11-04. The full source requirement and deliverable are preserved in test-matrix.md with canonical provenance. There are no packet evaluation criteria or additional user criteria. Research source register S1 to S8 retains revision hashes, exact excerpts and timestamp limitations; this plan introduces design choices rather than new external factual claims.

Use only synthetic text. Every screen, supplied sample, exported file and evidence document must state **Synthetic, not validated against the real format.** No real frequencies, keys, operational messages, credentials, personnel, network transport or deployment. Numeric frequency values and KEY-DEMO labels are invented tokens, not radio or cryptographic advice. The prototype may satisfy the planned synthetic checks while requirementsMet for real-format/operational suitability remains unestablished. Missing expert mapping is not a reason to omit named behavior.

The smallest complete slice is one local page: raw text → deterministic category extraction → exact-source inspection → issue correction through preserved revisions → explicit review and local save → synchronized 24-hour UTC schedule → reviewed JSON download. No model, OCR, chat, CDN, external dependency or service is required. Human evaluation of clarity and fit remains separate from machine journey execution.

## Architecture and file contract

system-design.json was published with fleet_system_design before these planning documents. Components are capture, category parser, source review, UTC schedule, local snapshot/export and synthetic-key comparison. The diagram maps application data flows, not factory stages.

Builder produces index.html with inline CSS and classic JS, core.js (classic universal script exposing OptaskCore in browsers and CommonJS exports in Node), core.test.cjs, answer-key.json, verification.md and user-guide.md. index.html contains the exact core implementation inline; it must run when opened alone, with no fetch/import or adjacent-file requirement. Include the answer-key data inline as well. Node tests must execute the actual inline core in a VM and the standalone core.js against identical input, compare complete outputs, and exercise real exported functions. A source-string comparison alone is insufficient verification. No edits to .fleet/ or frozen plans.

## Invented grammar: synthetic-optask/v1

This is an invented OPTASK-style mock syntax, not a mapping to any real USMTF revision. One record per LF or CRLF line; preserve original line endings. Blank lines are allowed. Exact uppercase tokens, no slash/newline within a field, no quoting/escaping. Terminal // is mandatory. Nonempty fields preserve original token text; do not trim original source. Identifiers match [A-Za-z][A-Za-z0-9_-]* and are unique within a revision. Treat every record in a duplicate-ID group as unresolved, not just the later record.

```
FREQ/id/start/end/owner/value/unit/description//
CRYPTO/id/start/end/owner/demoLabel/description//
FLIGHT/id/start/end/owner/description//
NOTE/text//
```

Reviewed category mapping: FREQ = Frequency plan; CRYPTO = Crypto change-over; FLIGHT = Flight quarters. FREQ value is a positive decimal literal and unit is kHz or MHz; this is lexical validation, not an operational range. CRYPTO accepts fictitious KEY-DEMO-* labels only, never real key material. NOTE is an intentional non-event with a source span and no warning; unknown types produce issues and no event. Generic EVENT/TASK are unsupported in this app to avoid pretending they meet all three named categories.

Timestamps use YYYY-MM-DDTHH:mmZ or YYYY-MM-DDTHH:mm±HH:mm. Reject impossible Gregorian dates, missing/invalid zones, offsets beyond ±14:00 (14 requires 00 minutes), missing fields, invalid delimiters and end <= start. Restrict years to 1900 to 2099 as a documented prototype bound. Validate local calendar fields before conversion; never permit Date rollover. Normalize to ISO UTC with seconds/milliseconds while retaining the source token. Never infer a year, date, zone or midnight rollover from system time. A valid interval may cross days; full duration is retained. Selected UTC day defaults to the fixture date 2026-11-04, not today.

The timeline uses half-open intervals [start,end) and day [00:00,next 00:00). Clip only for display. Show three named lanes, hour ticks from 00:00 to 24:00, proportionally positioned bars and an accessible textual list. Separate overlapping events visually without implying operational conflict resolution. A1 full interval is 60 minutes, with a 30-minute portion on each day. Exactly ending at midnight adds no bar on the next day. Out-of-day events are counted, never silently discarded.

## Primary fixture and literal answer key

The Load synthetic sample control sets the following exact draft (LF, no trailing newline); it does not overwrite a saved revision until Parse message:

```text
FREQ/F1/2026-11-04T08:00Z/2026-11-04T12:00Z/COMMS/251.5/MHz/Training net//
CRYPTO/C1/2026-11-04T09:30Z/2026-11-04T09:45Z/COMMS/KEY-DEMO-A/Change-over drill//
FLIGHT/A1/2026-11-04T23:30Z/2026-11-05T00:30Z/AIR/Deck rehearsal//
NOTE/Synthetic, not validated against the real format.//
```

Independent planning answer: F1 has owner COMMS, frequency value 251.5, unit MHz, description Training net, UTC interval 2026-11-04T08:00:00.000Z to 2026-11-04T12:00:00.000Z (240 minutes). C1 has owner COMMS, demoLabel KEY-DEMO-A, description Change-over drill, UTC 09:30 to 09:45 on 2026-11-04 (15 minutes). A1 has owner AIR, description Deck rehearsal, full UTC interval 2026-11-04T23:30:00.000Z to 2026-11-05T00:30:00.000Z (60 minutes). Day 04 shows F1 08:00 to 12:00, C1 09:30 to 09:45 and A1 23:30 to 24:00 with continues next day; day 05 shows A1 00:00 to 00:30 with continued from previous day, plus 2 outside-day events. NOTE contributes no event or warning.

Source-trace uses the single FREQ line without NOTE: id F1 spans [5,7), start spans [8,25), end [26,43), owner [44,49), value [50,55), unit [56,59), description [60,72); type FREQ spans [0,4). These zero-based end-exclusive UTF-16 offsets are planned independently of the parser. Inspect source exposes original and normalized values separately.

## Held-out synthetic set and pre-build answer key

Builder must transcribe these literal inputs and expectations to answer-key.json, including the disclosure, planning-origin metadata, source field values and literal offsets. Never generate expected records/spans using the parser being tested. This held-out set is separate from the UI training sample, though visible to the builder: it protects against implementation drift, not adversarial overfitting or SME truth. Do not train or tune a model; no model is used.

Dataset H, LF, no trailing newline:

```text
FREQ/HF/2026-11-04T10:00+02:00/2026-11-04T11:00+02:00/RADIO/305.25/MHz/Invented net//
CRYPTO/HC/2026-11-04T12:10Z/2026-11-04T12:20Z/RADIO/KEY-DEMO-H/Practice window//
FLIGHT/HA/2026-11-04T23:50Z/2026-11-05T00:10Z/AIR/Deck exercise//
NOTE/Synthetic, not validated against the real format.//
UNKNOWN/no scheduled activity//
```

Expected events exactly HF, HC, HA; no others. HF owner RADIO, frequency 305.25 MHz, description Invented net, UTC 08:00 to 09:00 on Nov 04, duration 60. HC owner RADIO, label KEY-DEMO-H, description Practice window, UTC 12:10 to 12:20 on Nov 04, duration 10. HA owner AIR, description Deck exercise, UTC 23:50 Nov 04 to 00:10 Nov 05, duration 20. HF type/id/start/end/owner/value/unit/description tokens have spans [0,4), [5,7), [8,30), [31,53), [54,59), [60,66), [67,70), [71,83). HC tokens: [86,92), [93,95), [96,113), [114,131), [132,137), [138,148), [149,164). HA tokens: [167,173), [174,176), [177,194), [195,212), [213,216), [217,230). These offsets must be checked against literal input during planning validation; if a transcription discrepancy exists, correct the planning key before freezing, never after observing application output. Two non-event lines (NOTE and UNKNOWN) yield zero events and exactly one unsupported-type warning on line 5. No fabricated times for either line.

Report event precision = matched expected events / extracted events, recall = matched / expected; match by ID, category and exact normalized start/end. Also compare all source fields, UTF-16 spans and timestamps, reporting discrepancy counts separately. H target: expected 3, extracted 3, matched 3, false positives 0, missed 0, precision 100%, recall 100%, all discrepancy counts 0. For a no-event-only subset, report both event metrics as N/A (no events), not fabricated 100%; event output must be empty, NOTE clean, UNKNOWN flagged. The benchmark panel runs actual application functions, not hardcoded success strings. Local acknowledgement records only that the synthetic comparison was reviewed. A real human must separately compare the key and output for MSG-04 review evidence; no SME approval is implied.

## State and data contracts

Core functions: parseMessage(raw, sourceId), normalizeTimestamp(token), projectDay(events, utcDay), compareAnswerKey(actual, key), buildExport(snapshot, utcDay). Functions are deterministic and receive dates explicitly. No clock-dependent extraction or scheduling. Return structured errors rather than throwing on user input.

A source revision contains {id, grammar, disclosure, raw, previousRevisionId}; input sourceId is revision-local, never a credential. A field contains {name, sourceText, span:{start,end}, normalizedValue}; span unit UTF-16, end exclusive, relative to that revision.raw. Include every extracted token, including type, id, owner and category-specific fields; derived categories and instants point to their originating field(s) and are labeled derived rather than claiming invented literal spans. A parsed record contains {id, category, fields, startUtc, endUtc, durationMinutes, reviewStatus, sourceId, lineSpan}; issues contain {code, line, sourceId, span or null, message}. Invalid records retain source fields and issues for inspection, but are separate from schedulable valid events. Do not count invalid records in extracted event summary. Input-level empty errors use null span.

Snapshot holds source history, current committed source ID, separate unsaved draft, parsed results, selected UTC day and reviewed revision ID. Review requires unchanged parsed source, zero unresolved issues and checked mapping/source acknowledgement. Parsing a changed draft saves a new revision, preserves old raw, replaces rather than appends extracted records, resets checkbox/review and blocks confirmed export. Parsing identical text must not accumulate duplicate events. Source edits preserve the committed snapshot but make it visibly stale. #confirm-review and #export stay activatable to explain the precise dirty-state error; do not silently export the old snapshot. Confirm review deliberately saves local review, never authorizes operations. Reload restores both committed state and separate dirty draft.

Export optask-YYYY-MM-DD.json is readable UTF-8 JSON with schemaVersion, grammar, disclosure, UTC day, raw source history, all extracted fields and exact spans, full intervals, clipped daily schedule, review state and issues (empty for reviewed export). Include all reviewed records, including outside-day ones, rather than silently dropping provenance. Use a local Blob download. Refuse export before review or while dirty. If storage fails, retain session work, state session-only and allow reviewed export. Invalid or incompatible saved JSON produces a clear recovery message and fresh workspace without overwriting unreadable bytes until explicit user replacement.

## UX and stable selectors

ux-spec.json defines screens/states/keyboard behavior. acceptance-plan.json is the authoritative declarative step contract. Primary buttons: #load-sample, #parse, #confirm-review, #show-day, #export. Source #source; review checkbox #reviewed; UTC date #day. Use #schedule-ID on each narrow textual schedule entry, #inspect-ID for source inspection, #field-select with semantic field names, #field-value/#field-span/#field-source/#field-normalized and #event-interval. #previous-source shows the immediately previous raw revision exactly. #parse-summary, #mapping-summary, #draft-status, #review-status, #validation-error and ordered #issue-N must expose the literal text frozen in journeys. Display diagnostic IDs/spans in the review panel, not as the primary schedule vocabulary.

Use native controls, labels, visible focus, polite live status and error focus. Narrow layout stacks panels and preserves a legible axis plus textual list; color is supplementary. No drag dependency or external fonts. Preserve input through day navigation, source inspection and comparison. Benchmark controls must not replace the user's message or schedule. Local-only storage and no operational use remain visible. Loading is short local work, with double submission guards.

## Ordered implementation tasks and dependencies

1. Transcribe invented grammar, sample and H key exactly; validate literals and span arithmetic against raw text, not a parser. Produce answer-key.json with provenance to this plan. No external dependency or toolkit test is an application test.
2. Implement core.js strict timestamp/token parser with revision-relative spans, structured issues and complete duplicate-group rejection. Adapt principles from the toolkit without modifying .fleet/. No upstream license/version claim or copied external dependency is needed.
3. Implement half-open UTC projection, full interval retention, comparison metrics and export serialization. Node tests use independent literal cases from this plan and boundary tests in test-matrix.md.
4. Build self-contained index.html with exact inline core and answer key. Implement source drafts/revisions, review gate and local snapshot restore before enabling confirmed schedule/export.
5. Render the full 24-hour axis and three categories with textual source-inspectable entries, then complete download and synthetic comparison review. Implement all frozen selectors and literal outcomes.
6. Run actual-core Node tests and inline-core behavioral equivalence. Host runs all frozen journeys at desktop and narrow widths in fresh contexts. No test result may rewrite the contracts. A suspected requirement error requires a new planning run.
7. Verification additionally exercises the opened local file with network disabled, localStorage failure, keyboard, narrow timeline, source highlight and downloaded provenance. The declarative DSL has no offline action; do not pretend its journey alone proves disconnection. Record evidence gaps honestly.
8. Write verification.md, user-guide.md and review summary starting with Primary deferrals: none for scoped synthetic workflow, followed immediately by real-format limitations. Separate generated, runnable, Node-tested, browser-tested, human-reviewed and operationally validated states. Use the single shared bounded repair only for implementation failures, preserving host evidence and frozen contracts.

## Risks and human review boundaries

Real USMTF variants, version mapping, operational time conventions, actual message accuracy and authorized domain review are missing. Future real-format assessment needs authorized representative data and independently reviewed mapping, not a synthetic pass. OCR/handwriting is out of this plain-text slice and untested. No real connector is simulated or implied. Browser file-origin persistence varies; session fallback and export are required. Visual clarity, source review usefulness and operational suitability need human review. The deterministic schedule is a visualization, not conflict resolution or engineering/command advice. No model-assisted explanation is used; any later addition must be visibly separate from deterministic fields and cannot supply missing dates or override source evidence.

## Planning completion status

Required five artifacts are planned/published only. No application code, application tests, browser checks, screenshots, human acceptance or operational validation has been produced or claimed. Host owns validation/freezing and later test-report.json, hashes, screenshots and traces. Every test-matrix result remains Not run until actual evidence exists.
