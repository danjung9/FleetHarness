# Synthetic OPTASK extraction fixtures

All records are fictional, deterministic data created during intake for challenge 12. No supplied data existed (`inputs/manifest.json` has no sources). No external services, operational records, actual message standard or toolkit fixtures were used. These examples are **synthetic, not validated against the real USMTF format**. They support frequency plans, crypto change-over windows, flight quarters event times, exact source evidence and a consolidated daily schedule. They do not authorize any radio, cryptographic, flight or tasking action.

Source brief attribution: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12 (attribution only; not retrieved in this session).

## Container schema

`synthetic-data.json` has the assigned top-level `classification`, `useCase`, `fields`, `records`, `scenarios`, `limitations` structure. `fields` defines every regular record's name, JSON type and meaning. Records contain no additional fields. Every regular document is valid under the invented grammar; malformed inputs occur only in scenarios. IDs are case sensitive. No values use random seeds, current-clock dates or real identities.

Each record has string `documentId`, `purpose`, `classification`, `messageId`, `shipId`, `selectedDay`, `displayZone`, `rawText`; numeric integer `revision`; array `scenarioIds`; object `expected`. `purpose` is `sample` or `evaluation-candidate`. Each scenario has `name` (string), `kind` (`typical`, `edge`, `invalid`), `input` (object), `expectedBehavior` (string). `input.scenarioId` is its stable ID; `documentIds` references records in order, allowing repeated references for duplicate testing. Inputs can additionally contain literal `rawText`, `correctedRawText`, `expectedCode`, `expectedReviewLine`, `expectedEvents`. Scenario metadata is an answer key, never part of a raw message.

`expected` contains:

- `headerFields`: messageId, shipId, revision, selectedDay, displayZone mapped to source spans.
- `events`: complete answer records, in original document line order; not parser-generated output.
- `eventCount`: number of valid event candidates, not number approved by a reviewer.
- `reviewItems`: array, empty for valid standalone records; revision combination and invalid scenarios explicitly add review expectations.
- `excludedLines`: one-based REMARK line numbers, which must never yield events.
- `sourceLineCount`: logical line count, ignoring the empty split fragment after the final LF.

Each event has string `eventId`, `documentId`, `category`, `messageId`, `shipId`, `kind`, `reviewStatus`; numeric `revision`, `durationMinutes`; objects `originalFields`, `normalized`, `selectedDay`, `source`. `originalFields` maps literal field keys to strings. `normalized` contains string `startUtc`, nullable string `endUtc`, nullable number `frequencyMHz` (only frequency plans). UTC strings include seconds. `kind` is `interval` or `point`. `reviewStatus` starts `unreviewed` even for well-formed events: successful parsing is not human approval.

Event `selectedDay` contains numeric `startMinute`, `endMinute`, boolean `visible`, nullable numeric `clippedStartMinute`, `clippedEndMinute`. Positions are minutes relative to selected UTC midnight; unclipped positions may be negative or exceed 1440. Points have equal start/end and zero duration; that does not imply a zero-length interval. `source` contains one-based integer `line`, `range` for the entire event line excluding LF, and `fields`. `fields.category` and each literal original field key have a source span. Identity and day source spans are in `headerFields`, shared by events in the document; derived values such as duration and normalized UTC inherit their original timestamp evidence rather than pretending to appear literally in the source.

A span is `{start:number,end:number,text:string}`. Offsets are **zero-based UTF-16 code units, half-open [start,end)** in the decoded original `rawText`, matching JavaScript `String.slice`. They are neither UTF-8 bytes nor Python Unicode code-point positions. `text` must equal that exact slice. LF is one unit. Preserve all whitespace and final LF. DOC-DENSE deliberately has `café`, BMP `⚓` and non-BMP `🧭` symbols in a remark to exercise Unicode handling; its source ranges are still explicitly UTF-16. Do not normalize Unicode or line endings before slicing. JSON escapes decode to the original characters.

## Invented mock USMTF/OPTASK grammar v1

This is an invented, bounded military-message-style fixture grammar. Its superficial message delimiters do not imply conformity with an actual USMTF specification. It deliberately uses the three requested domain structures rather than generic EVENT/TASK lines.

Every line ends LF; fields use single `/`, record terminator is `//`, no escaping, embedded slash, or multiline field values. Required header order:

```text
SYNTHETIC / NOT VALIDATED AGAINST REAL USMTF
MSGID/OPTASK/<message-id>/REV=<positive integer>//
UNIT/<fictional ship-id>//
DAY/<YYYY-MM-DD>/ZONE=Z//
```

Then zero or more REMARK and event lines, ending `ENDMSG//`. Header IDs use uppercase letters, digits and hyphens. Line keywords/keys are uppercase and case sensitive. No padding is required or present. This dataset only establishes this exact grammar; accepting extra layouts must be explicitly specified later.

```text
REMARK/<arbitrary inert prose without slash delimiters>//
FREQPLAN/ID=<id>/PLAN=<plan>/NET=<net>/MHZ=<decimal>/UNIT=MHz/START=<timestamp>/END=<timestamp>//
CRYPTO/ID=<id>/REF=<dummy-reference>/START=<timestamp>/END=<timestamp>//
FLIGHTQ/ID=<id>/CONTEXT=<fictional deck>/START=<timestamp>[/END=<timestamp>]//
```

Square brackets above denote optional END, not literal characters. Event keys occur in shown order. Frequency MHz must be a positive finite decimal; do not invent a real radio band validation rule. `REF` is a dummy change-over reference, never a key, algorithm or cryptographic instruction. Ship context comes from UNIT; FLIGHTQ adds a fictional deck context. All IDs are scoped by source document/revision; identical local event IDs in different revisions remain distinguishable.

Timestamp syntax is `YYYY-MM-DDTHH:mmZ` or `YYYY-MM-DDTHH:mm±HH:mm`, with Gregorian calendar validation, hour 00 to 23, minute 00 to 59 and explicit fixed offsets up to ±14:00. No seconds, leap seconds, local timezone names or DST inference. Header ZONE declares display only and must not fill a missing timestamp zone. Interval END must be strictly after START. Both dates must be explicit: never infer rollover. FLIGHTQ with no END is a point; FREQPLAN/CRYPTO with no END is incomplete. Unsupported nonempty lines are review items, not invented events. REMARK lines are inert non-events even when they contain times, category names or apparent instructions.

## Time, review and aggregation assumptions

All records use UTC day 2026-11-05, `[2026-11-05T00:00Z,2026-11-06T00:00Z)`, 1440 minutes. Normalize fixed offsets by subtracting the offset, keeping the same instant. Duration is elapsed minutes between explicit instants. Intervals intersect the day only if start < day end and end > day start. Points are visible iff day start <= point < day end. Clip only display segments; retain actual dates, duration and out-of-day events in evidence/export. No conflict doctrine is inferred from legitimate overlapping categories.

Document event arrays follow source order. A consolidated schedule sorts by UTC start, then documentId, then source line; invalid items have no invented sortable time. Filter ship by exact fictional UNIT. Deduplicate only identical document identity **and unchanged raw text**. Repeated event text in different documents remains independently sourced. Different content under the same document ID requires an identity/content review rather than silent replacement. Revision number alone does not authorize supersession; conflicting same-message/event IDs across revisions remain candidate rows with `REVISION_REVIEW`. Explicit human resolution preserves originals and distinguishes reviewer edits from parsed values.

Review diagnostics here are fictional deterministic labels, not actual USMTF errors. Invalid event lines produce no confirmed event; preserve their source and a review diagnostic. Valid sibling lines may remain unreviewed candidates. Empty/failed input must not imply a verified empty day. Corrected messages are new parses with fresh source spans; keep the original invalid draft available for inspection. Exports should disclose unresolved review items, original and normalized times, document/field spans and synthetic provenance. These are fixture expectations, not implementation design or application verification.

## Scenario answer key and relationships

| ID | Kind | Expected result |
| --- | --- | --- |
| S01 | typical | DOC-DENSE: 216 lines, four events (one frequency, one crypto, two flight); 207 REMARK exclusions, overlap at 06:10Z, point at 18:30Z. |
| S02 | typical | DOC-DENSE + DOC-SUPPLEMENT: eight events, seven intersect day; CW-A/CW-B equivalent 06:00Z instants; previous-day and next-day clipping without altered durations. |
| S03 | typical | DOC-VARIATION: three events for a different fictional ship; +05:30 and -04:00 offset arithmetic and nonchronological source order. |
| S04 | edge | DOC-BOUNDARY: previous interval ending at 00:00 excluded from daily axis; point exactly 00:00 included. |
| S05 | edge | Duplicate dense source counted once; revision retained separately: five candidate events, conflicting FQ-B times require review on both versions. |
| S06 | edge | Unsupported WEATHER line: zero events, UNSUPPORTED_LINE line 5. |
| S07 | invalid | Missing event zone: MISSING_ZONE, no header-zone fallback. |
| S08 | invalid | February 30: INVALID_DATE, no date rollover. |
| S09 | invalid | Crypto interval lacks END: MISSING_END, never a point. |
| S10 | invalid | Explicit end before start: END_BEFORE_START, no rollover inference. |
| S11 | invalid | Nonnumeric MHz: INVALID_FREQUENCY. |
| S12 | invalid | Empty input: EMPTY_INPUT, preserve draft/recovery path. |

S07 to S11 identify offending line 5; S12 has no offending line. Each includes correctedRawText producing one crypto CW-R interval 10:00 to 10:15Z, 600 to 615 minutes, duration 15; it remains unreviewed. S11 intentionally corrects to a crypto message, demonstrating replacement/reparse rather than a numeric coercion. Regular-record expected arrays contain all 14 events across five documents. Minute positions, clipping, exact field literals and UTC results are specified there, with prose scenario summaries as a second check. No message text can execute external instructions or suppress synthetic warnings.

DOC-VARIATION is an independent evaluation *candidate*, not a secret held-out set: it is visible in this intake package and must not be described as sealed. Later planning must establish genuinely independent held-out variations and seal evaluation answers before implementation. Measure field/event precision and recall against explicit expected events and REMARK negatives, naming the evaluated denominator. Public fixtures alone cannot establish generalization.

## Validation and handoff

Data preparation checked exact record field/type matching, unique IDs, scenario references, all three categories, 216-line dense input, source slices in UTF-16, event/header literals, calendar-valid regular timestamps, UTC conversions, elapsed durations and daily positions/clipping. Explicit event specifications were authored before any application/parser implementation; fixture construction only laid out source text and attached evidence. Python standard-library datetime arithmetic supplied independent normalization. No application or toolkit parser was run. These checks do not establish real-format fidelity, semantic adequacy or operational accuracy; owner/domain review remains necessary.

The host must independently validate and freeze both files before research. Preserve them unchanged afterward; downstream planning, samples and tests must reuse these exact records/scenarios. Embed necessary sample content in the self-contained index.html as directed by scope; do not fetch local fixture files from the browser. Reuse the shared computation backend selected later. This session does not select architecture, implement the app, deliver or deploy it. Owner approval is required before delivery/deployment.

Remaining uncertainties: real USMTF mapping, real message-family/revision rules, operational timezone/day policy, authentic frequency/crypto validation, real data quality and benchmark thresholds. All demonstration choices above require confirmation before being applied beyond this fictional workflow. No personnel, keys, real ships or authoritative operational rules are represented.
