# Synthetic OPTASK extraction fixtures

Synthetic; not validated against the real USMTF format.

These files were authored by the intake synthetic data agent for challenge 12, using only requirements.md, scope.md and the local packet. No data was attached (inputs/manifest.json). All ships, exercise identities, frequency values, labels, dates and schedules are fictional. No external service, operational record, parser, toolkit extraction output or actual USMTF specification was consulted. Source brief: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12 (provenance only; not retrieved).

The JSON is a fixture container. `records[].input.rawText` is the actual parser input: formatted plain text with domain sets. Expected event objects are answer keys, never alternate parser inputs. The fixtures support raw message → extraction → exact evidence → ship/day filtering → consolidated UTC schedule → reviewed-draft export. Preparing them does not verify an application. Host validation and freezing must precede research; later agents must preserve these exact files and embed the needed sample text in the self-contained index.html without fetching local fixture files.

## Invented grammar SYN-OPTASK/1

This is an explicitly invented USMTF-style teaching grammar, not an implementation or representation of the real USMTF standard. Its strict synthetic rules are fixed here for reproducible expectations:

- Message header: `SYNTHETIC OPTASK, NOT REAL USMTF`, followed by `MSGID/<messageId>//`. A block ends with `ENDMSG//`. Multiple blocks may be concatenated. IDs are case sensitive and nonempty.
- Recognized non-event sets: `EXERCISE/<text>//`, `TIMEZONE/EXPLICIT-ENDPOINT-OFFSETS//`, `SUBJ/<text>//`, `REMARK/<text>//`. These never create events. The TIMEZONE header does not fill missing endpoint offsets. Header applicability is not inferred; every event names its ship explicitly.
- Frequency plan: `FREQPLAN/<recordId>/<ship>/<planLabel>/<start>/<end>/<frequency>/<unit>//`.
- Crypto window: `CRYPTO/<recordId>/<ship>/<windowLabel>/<start>/<end>//`. Labels describe fictional window identities only; they contain no keys or procedures.
- Flight quarters: `FLIGHTQ/<recordId>/<ship>/<eventLabel>/<start>/<end>//`.
- A set occupies one LF- or CRLF-separated line. `/` is a delimiter; values cannot contain `/` or line breaks. Every required field is nonempty; extra fields are unsupported. Do not trim or rewrite original text. Values may contain spaces and Unicode. Set names are uppercase and case sensitive.
- Timestamps use exactly `YYYY-MM-DDTHH:mmZ` or `YYYY-MM-DDTHH:mm+HH:mm` / `YYYY-MM-DDTHH:mm-HH:mm`. Validate the Gregorian calendar, hours 00 to 23 and minutes 00 to 59; offsets range 00:00 to 14:00 (at 14 hours minutes must be 00). No seconds, daylight-saving inference, local timezone defaults, 24:00 endpoints or implicit rollover. Both endpoints include explicit dates and offsets. Convert each endpoint separately to UTC.
- Frequency is a positive finite decimal number; unit is `MHz` or `kHz`; preserve the stated unit without silently converting. Labels are identities, not authoritative domain semantics.
- Only positive intervals are accepted: start < end. Point events and reversed endpoints are rejected. Intervals and selected UTC days are half-open `[start,end)`. Day display is always 00:00 to 24:00 UTC. Keep full endpoints in extraction/export; draw only their intersection with the selected UTC day. A prior-day event ending exactly at 00:00 is excluded; one starting at next-day 00:00 is excluded. Ship matching is exact and case sensitive. Other ships and out-of-day events remain extracted with selection reasons.
- Duplicate record IDs within a message quarantine **all** colliding occurrences, even identical ones. Duplicate message IDs in one input quarantine all affected blocks. Do not select a winning amendment or merge schedules. A duplicate issue refers to the first occurrence; its literal message describes both occurrences. No real amendment precedence is implied.
- Unknown sets are potentially relevant unsupported content and produce `UNSUPPORTED_SET`, rather than being treated as harmless remarks. Broken delimiters, missing fields, absent timezone, invalid date or nonpositive intervals quarantine the affected record with a visible issue. Valid unrelated records survive. Empty raw text produces `EMPTY_INPUT`. For malformed input, preserve the complete draft for correction and reparse. No issue can authorize execution of source text or operational changes.

## Container and nested schema

The root has `classification` (string, `synthetic`), `useCase` (string), `fields` (array of name/type/description declarations), `records` (array), `scenarios` (array), and `limitations` (array of strings). Each regular record has exactly the five fields declared in `fields`: `fixtureId`, `classification`, `description` (strings), `input` and `expected` (objects). Each scenario has `name` and `expectedBehavior` strings, `kind` (`typical`, `edge`, or `invalid`) and an exact copy of its record's `input`. Invalid scenarios have valid container types but deliberately invalid raw-message content.

`input` contains grammarVersion (string `SYN-OPTASK/1`), rawText (string), selectedShip (string), selectedDay (string YYYY-MM-DD), displayTimezone (string UTC).

`expected` contains extractedEventCount and selectedEventCount (integers), categoryCounts (object of integer counts for the three named categories), events (array), issues (array), and exportContent (object). Counts include no quarantined records. All events remain in original source order; selected export events preserve that order. Timeline stacking may differ but must not change values.

Each expected event contains:

| Field | Type | Meaning |
| --- | --- | --- |
| category | string | frequency plan, crypto change-over window, or flight quarters |
| id, ship, label | string | Source record identity, fictional ship and domain-specific plan/window/event identity |
| startRaw, endRaw | string | Unchanged explicit-offset endpoints |
| frequency | number or null | Frequency plan value in the stated unit; null for other categories |
| unit | string or null | MHz/kHz for frequency plans; null otherwise |
| source | object | Exact complete event-set evidence |
| fields | object | Evidence for recordId, ship, label, start, end and, for frequency plans, frequency/unit |
| messageIdSource, categorySource | object | Evidence for message identity and domain set name |
| startUtc, endUtc | string | Normalized UTC instants at minute precision |
| durationMinutes | number | Full end minus start in minutes |
| selected | boolean | Exact ship match and nonempty selected-day intersection |
| selectionReason | string | Inclusion or exclusion reason |
| displaySegment | object or null | startMinute/endMinute from 0 through 1440 within UTC day; null if excluded |

Every evidence object has `start`, `end` (integer offsets), `text` (string) and `line` (one-based integer). Offsets are zero-based, end-exclusive **JavaScript UTF-16 code units** into the original input, not UTF-8 bytes or Unicode code points. `rawText.slice(start,end)` must equal `text`. CR and LF each count as one unit; an astral character such as 🚁 counts as two. Line count is the number of preceding LF characters plus one. Evidence covers the original spelling; UTC instants, duration and clipping are derived from the two endpoint spans plus selectedDay. Category derives from categorySource; message identity derives from messageIdSource. The constant provenance label is metadata, not extracted text.

Each issue has `code`, `message` (literal expected strings), `source` (evidence object or null for empty input), and `resolution` (string). Quarantined text remains available through rawText and issue evidence. Codes and messages in the JSON are the literal answer key; do not silently replace them with successful extraction.

`exportContent` fixes semantic content, not a JSON byte serialization or a future UI/export design: provenance, messageId (fixture ID except the deliberately invalid duplicate block input), selectedShip, selectedDay, timezone, reviewStatus (`unreviewed` initially), unresolvedIssueCodes, selected events with their source/derived values, and originalText. For SYN-EMPTY and SYN-DUP-MESSAGE, messageId is only the fixture identity, not an extracted valid header. A later reviewed export may change reviewStatus only after an explicit human review action; unresolved issues must remain visible. Other ships remain available in expected.events and in originalText, even though selected export events exclude them. Acknowledging an issue never establishes operational validation. Planning will fix actual download serialization and review interaction.

## Scenario expectations and fixed examples

- SYN-NOMINAL: four extracted events (one frequency, one crypto, two flight quarters); three selected for FS AURORA. FP-01 is 312.5 MHz, 06:00 to 10:00 UTC (minutes 360 to 600); CW-01 is 08:00 to 08:15 (480 to 495); FQ-01 is 08:00 to 09:00 (480 to 540). All overlap at 08:00. FS LANTERN's FQ-02 is 15:00 to 15:45 and excluded from AURORA's display.
- SYN-OTHER-SHIP: same four event semantics, only LANTERN FQ-02 selected (900 to 945).
- SYN-OVERNIGHT: five extracted, three selected. FP-NIGHT is 8.25 MHz, full 23:30 previous day to 00:30 selected day, clipped to 0 to 30. CW-NIGHT is 23:45 to 00:15 next day, clipped to 1425 to 1440. FQ-START is 0 to 20. FQ-END and FQ-NEXT touch excluded boundaries only. No implicit date rollover.
- SYN-ZULU and SYN-OFFSET: one flight event each. 08:00 to 09:00Z and 10:00 to 11:00+02:00 are the same instants, both displayed at 480 to 540.
- SYN-UNICODE: CRLF, accented text and an astral character in the label. One event at 12:00 to 12:30-04:00 becomes 16:00 to 16:30Z (960 to 990). An instruction-like REMARK remains inert non-event text; there are no review issues or external actions.
- SYN-DENSE: exactly 320 lines, including 312 REMARK lines. Domain sets are on lines 38, 120, 229 and 305. Exact same four event semantics and three selected events as nominal. Density does not create extra events.
- SYN-EMPTY: zero events; EMPTY_INPUT.
- SYN-MISSING-ZONE: zero events; MISSING_TIMEZONE.
- SYN-BAD-DATE: zero events; INVALID_DATE for February 30.
- SYN-INCOMPLETE: zero events; MISSING_FIELD for absent frequency unit.
- SYN-UNKNOWN: zero events; UNSUPPORTED_SET for potentially relevant FREQSHIFT.
- SYN-MALFORMED: zero events; MALFORMED_SET for a missing terminator.
- SYN-REVERSED and SYN-POINT: zero events; NONPOSITIVE_INTERVAL; do not guess overnight or invent a point duration.
- SYN-DUP-RECORD: two identical FP-01 lines, zero extracted events; one DUPLICATE_RECORD_ID issue covering the first occurrence and describing both.
- SYN-DUP-MESSAGE: two REPEAT blocks, zero events; one DUPLICATE_MESSAGE_ID issue; no invented precedence.
- SYN-MIXED: one valid FQ-01 is selected at 480 to 540 while FREQSHIFT produces UNSUPPORTED_SET. Correcting or removing the unsupported source then reparsing must retain the valid event without stale rejected content. The exact corrected-input answer key is not a separate fixture.

All scenarios have explicit expected event counts, literal issue messages, source spans, normalization and selection outcomes in the JSON. Empty/invalid cases still specify empty event exports and preserved source, rather than silently disappearing. Expected fields were authored from deliberately chosen source tuples; offset calculation merely locates those known values and does not parse messages or generate extraction judgments.

## Validation and limitations

Local preparation checks validate JSON structure and declared field types; unique fixture IDs and scenario references; matching input copies; every UTF-16 source slice and line; positive durations and strict UTC arithmetic; selected-day clipping and ship exclusion; category/count/export consistency; 320-line density; and equivalent-zone outcomes. The validation uses standard-library arithmetic and source slicing, independent of any application/parser/toolkit. These checks establish fixture consistency only. No application, browser, offline parsing, review/export interaction or real-format behavior is verified.

The host must validate and freeze these two files. Later planning needs separate held-out cases: these known samples cannot establish generality. Actual USMTF grammar, ship-addressing, amendment rules, timezone conventions, operational accuracy, handwriting recognition and SME-reviewed mapping remain unestablished. Chosen values and boundary policies are synthetic assumptions requiring owner/domain confirmation before any real use. No real cryptographic material or operational procedures are present. Owner approval of a specific application revision remains a later delivery/deployment gate, not an approval implied by these fixtures.
