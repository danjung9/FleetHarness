# Fictional OPTASK extraction fixtures

**Synthetic, not validated against the real USMTF format.** No supplied data, operational records, actual unit identities, keys or external services were used. These fixtures were authored from the local requirements, scope and packet for the traceable document extraction workflow. The invented grammar is `SYN-OPTASK/1`; it is a mock USMTF-style demonstration, not an authoritative OPTASK mapping.

The workflow is raw formatted text → frequency plans, crypto change-over windows and flight quarters event times → evidence review → one ship's synchronized UTC 24-hour schedule → matching export. Source attribution: the supplied snapshot identifies https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12; that site was not accessed during preparation.

## Artifact and schema

`synthetic-data.json` has exactly these top-level properties: `classification` (string, always `synthetic`), `useCase` (string), `fields` (array of record field declarations), `records` (array), `scenarios` (array), and `limitations` (array of strings). Each field declaration has `name`, `type` and `description` strings. Every regular record contains every declared field, with the declared JSON type and no extra record fields. Raw messages that are semantically invalid still obey this outer fixture schema. Invalid scenario inputs may deliberately violate the input schema.

| Record field | JSON type | Meaning |
|---|---|---|
| caseId, messageId, title | string | Stable case ID, fictional message ID and descriptive title |
| provenance | object | Synthetic classification/disclaimer, grammar version, authoring method, purpose, acceptance IDs |
| selectedDate | string | Schedule calendar date `YYYY-MM-DD` in UTC |
| selectedShip | string | Exact fictional ship to display; do not discard other ships during extraction |
| displayTimezone | string | `UTC` for these fixtures |
| rawText | string | Exact multiline input, including original line endings and Unicode |
| lineCount | number | Physical line count; empty input is zero |
| expectedEvents | array | Independent authored field values and expected normalized results |
| expectedReviewFlags | array | Unresolved source spans with code and explanation |
| expectedNonEvents | array | Explicit remarks that must not become events |
| expectedTimelineOrder | array | Selected-ship visible event IDs in expected chronological order |
| expectedExport | object | Semantic export expectations, independent of JSON/CSV presentation |

An expected event has string `id`, `messageId`, `category`; object `fields`; object `evidence`; string `startUtc`; string-or-null `endUtc`; object `derivedFrom`; and array `visibleSegments`. `fields` holds all category fields as **original source strings**, including frequency. No binary floating point conversion is required to compare frequency literals. Category values are `frequency-plan`, `crypto-changeover`, `flight-quarters`.

Each `evidence` entry is `{text: string, start: number, end: number, line: number}`. Offsets are zero-based JavaScript UTF-16 code units, start-inclusive/end-exclusive, into the **unchanged** rawText. Lines are one-based, split on LF; CRLF retains its CR in the original. Empty-input evidence is the sole zero-length span at offset 0, line 0. Attribute values, including ID and ship, all have evidence; fixed category names derive from the source set token on the referenced line. Fixture/message identity and selection controls are metadata, not extracted source fields. The complete candidate line remains available using the line reference. Derived UTC instants reference `at`, `start` or `end` evidence through `derivedFrom`; timeline segments reference those instants and selectedDate.

Each segment has string `startUtc`, string-or-null `endUtc`, numeric `startMinute`, number-or-null `endMinute`, boolean `continuesBefore` and `continuesAfter`. Minutes are elapsed UTC minutes from selected-day midnight, in [0,1440]; point events have null end values and never acquire a duration. No pixel placement is prescribed.

A review flag has string `code`, string `reason` and an evidence object. A non-event has string `reason` and evidence. `expectedExport` names visible event IDs in timeline order, all extracted IDs in source order, unresolved codes in source order, date, ship, disclaimer and three boolean retention assertions. Export must include original text, source evidence, original and UTC times and unresolved items; these ID lists alone are not sufficient exported content.

## Invented raw message grammar

Each nonempty message starts with these three physical lines (CRLF and LF are both represented):

```text
SYN-OPTASK/1//
MSGID/COMPLETE//
NOTICE/SYNTHETIC-NOT-REAL-USMTF//
```

The MSGID value equals the record's messageId. Subsequent physical lines use slash-delimited sets terminated by `//`. There are no continuation lines, escaping or embedded slashes/newlines in values in version 1. Keys and set tokens are uppercase and case-sensitive. Values are nonempty and preserve spaces, punctuation and Unicode verbatim. These public fixtures use the following field order; they do not establish arbitrary-order or whitespace-tolerant parsing requirements:

```text
FREQ/ID=F01/SHIP=FSV LANTERN/LABEL=Training voice/NET=TRAIN-A/CHANNEL=C01/FREQUENCY=123.450/UNIT=MHz/START=2026-11-06T06:00:00Z/END=2026-11-06T12:00:00Z//
CRYPTO/ID=C01/SHIP=FSV LANTERN/LABEL=Fictional change-over/CHANGEOVER=DEMO-ONLY-C01/START=2026-11-06T08:15:00Z/END=2026-11-06T08:30:00Z//
FLIGHT/ID=Q01/SHIP=FSV LANTERN/LABEL=Flight quarters/AT=2026-11-06T09:00:00Z//
RMKS/Arbitrary inert prose containing frequency, crypto or flight quarters//
```

All displayed fields are required for their set. Frequency is a positive decimal literal in fictional MHz, with no claim about actual spectrum allocation. NET/CHANNEL distinguish fictional plan assignments. CHANGEOVER is a fictional schedule identifier, never a key or cryptographic algorithm. FLIGHT is a point event. FREQ and CRYPTO are positive-length intervals; no implied end, date, timezone or rollover is permitted. There is no default ship. Each event carries an explicit SHIP value.

Supported timestamp spelling in these fixtures is `YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DDTHH:mm:ss±HH:mm`, with an actual Gregorian date and explicit offset. Seconds are `00` in all valid examples. Named timezones, DST, leap seconds, compact military date-time groups and implicit dates are unmodeled. Conversion subtracts the numeric offset to preserve the instant. An impossible date is rejected rather than rolled into a later month.

Header, MSGID, NOTICE and RMKS lines are non-events. Unsupported sets produce `UNSUPPORTED_SET`, not inferred tasking. Instruction-like source text is inert, with no external action. Missing required fields produce `MISSING_FIELD`; a timestamp without a zone produces `MISSING_TIMEZONE`; impossible dates produce `INVALID_DATE`; end <= start produces `REVERSED_WINDOW` (the included example is strictly reversed). Empty input produces `EMPTY_INPUT`. Non-string rawText produces `INVALID_INPUT_TYPE` at scenario-input validation. These codes are fictional fixture expectations, not external standard error codes. The fixtures isolate failures; precedence when a single candidate has multiple faults is unspecified and requires a documented choice in planning.

No amendment semantics are invented. IDs are unique per message except the duplicate test: the first structurally valid occurrence remains, subsequent occurrences of that ID are unresolved `DUPLICATE_ID`, never silently merged or treated as updates. Identical labels with different IDs remain separate events, including simultaneous events. Cross-message deduplication is outside these single-message fixtures.

## Schedule and evidence assumptions

Extract valid records for every ship; filter the visible schedule by exact selectedShip. Use selectedDate in UTC and a half-open `[00:00, next 00:00)` day. Positive-length intervals intersecting that day are clipped for display; originals remain unchanged in exports. Point events exactly at day start are included, exactly at next day start excluded. Out-of-day events remain extracted. Chronological timeline order is original UTC start then lexicographic ID; extraction order remains source order. Keep overlapping categories/events visible; overlap is not a validation error. A user's local review is not operational authorization.

`complete` places an emoji and accented text before tasking so UTF-8 byte offsets, Unicode character counts and UTF-16 offsets cannot be confused. `repeated` uses CRLF and two identical labels on different lines; each must point to its own occurrence.

## Cases and scenario expectations

The JSON scenarios carry exact inputs and observable expectations and refer to their corresponding full answer keys in records. They include all three required kinds: typical, edge and invalid.

| Case | Coverage and fixed outcome |
|---|---|
| complete | Four extracted events across two fictional ships; selected FSV LANTERN order F01, C01, Q01. F01 spans minutes 360 to 720, C01 495 to 510, Q01 is minute 540. Other-ship Q02 remains extracted. No flags. |
| dense | Exactly 320 lines: three headers, 314 explicit RMKS non-events and three tasking lines at 43, 171, 309. F90 240 to 1200, C90 790 to 800, Q90 point 1125. Exactly three events, no flags. No performance has been measured. |
| boundaries | F02 starts the preceding day and clips to 0 to 90, continuesBefore=true. Q03 (+02:00) and Q04 (Z) both normalize to 00:00Z, minute 0, with separate IDs. C02 clips to 1430 to 1440, continuesAfter=true. Q05 at next midnight is extracted but not visible. Order F02,Q03,Q04,C02. |
| repeated | Two distinct point events at minutes 900 and 960; identical labels have different exact spans in CRLF text. |
| missing-zone | Q10 unresolved MISSING_TIMEZONE; no confirmed event or invented zone. |
| invalid-date | February 30 unresolved INVALID_DATE; no confirmed event. |
| reversed-window | Same-day 23:00 to 01:00 unresolved REVERSED_WINDOW; do not assume next day. |
| malformed-window | Frequency plan missing END unresolved MISSING_FIELD. |
| unsupported | AIRNOTE set unresolved UNSUPPORTED_SET; prose time must not become an event. |
| duplicate-id | First Q06 remains at 15:00Z; second Q06 occurrence flagged DUPLICATE_ID with its own source span. |
| empty | Empty string, zero lines, zero events, EMPTY_INPUT. |
| inert-text | Instruction-like RMKS has no effects; Q01 still extracted at 09:00Z. |
| recovery | Exact companion correction adds Z to Q10; minute 600, no flags. Preserve invalid draft until user correction, then replace stale extraction on rerun. |
| Non-string scenario | rawText=42 is deliberately outside input schema; reject INVALID_INPUT_TYPE without coercion. |

All sample frequencies, dates, identities, labels and change-over IDs are deterministic fictional values. Dates were chosen for reproducible UTC arithmetic, not to describe a real operation. Every record includes provenance; downstream UI, exports and documentation must retain the synthetic disclaimer. Embed the exact needed fixture raw strings and expected scenarios into the self-contained application sample bundle; do not fetch these local JSON files from the browser or replace validated examples with generic toolkit fixtures.

## Preparation checks and limits

Preparation parsed the persisted JSON and checked exact declared field sets/types for all 13 regular records, all three scenario kinds across 14 scenarios, and **413 evidence span slices** against original UTF-16 text, plus line references. It checked positive normalized interval lengths, segment minute bounds, the explicit midnight/equivalent-instant order and the dense fixture's 320 lines / 314 remark non-events. Expected field values were authored directly, before any application parser; UTC arithmetic and offsets were constructed mechanically from those authored values. Manual fixed minute expectations above provide a second readable arithmetic cross-check.

These are fixture consistency checks, not application tests, a parser benchmark, full semantic validation or proof of actual USMTF fidelity. No parser, application, planning contract, research or remote access was performed. Helpers were discovered; none were available or needed for file authoring and local structural checks. The host must validate and freeze both artifacts before research. Public fixtures are reusable examples, not sealed held-out evaluation; later independent evaluation must use separate authored cases with varied values and positions.

Uncertainty remains about official USMTF/OPTASK revisions, set mapping, operational time/ship/duplicate semantics, real frequency assignments, expert-reviewed completeness and offline runtime choices. No OCR, handwriting recognition, secret material, real integration or operational accuracy is established. Future owner/domain confirmation is needed for those claims; no approval is inferred. Delivery or deployment remains subject to owner approval in its later phase.
