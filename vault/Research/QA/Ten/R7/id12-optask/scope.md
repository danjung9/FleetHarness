# Primary deferrals

None within the explicitly synthetic prototype scope. No criterion is declared satisfied at intake. Missing USMTF specifications or SME mapping are unresolved validation gaps, not valid deferral dependencies. The whole named mock workflow must still be demonstrated; synthetic results cannot satisfy a claim of actual USMTF conformance or operational readiness. No real integration, dissemination or approval is attempted.

If later planning identifies a genuine primary deferral, retain its canonical ID and original wording, use a concrete `real-system:`, `real-data:` or `human-authority:` dependency, name the withheld action and synthetic demonstration, and keep disposition deferred with empty `journeyIds`. Add source-linked `syntheticCoverage` with explicit assumptions, exact source output phrases and primary journey literal result assertions. Missing specifications or experts must not be relabeled as approval authority.

## Source and requested slice

Audience: watchstanders and shipboard leaders reviewing fictional ship tasking. Primary task: paste raw mock OPTASK text, extract frequency plans, crypto change-over windows and flight quarters event times, inspect traceable results, and review/export one synchronized 24-hour schedule.

The source interpretation is `.fleet/packet.json` challenge 12, category Tactical Decision Advantage, captured 2026-11-04, from https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12. The userScope repeats the source requirement and deliverable; it supplies no narrower criteria, input files or output specification. `requirements.md` remains authoritative and unchanged. “Traceable document extraction” is an engineering recipe recommendation, not an event requirement. This scope uses the supplied snapshot; no remote records or research were accessed.

Observable prototype success: all three named output classes emerge from raw text into a dated, timezone-normalized daily timeline, with exact source evidence, explicit uncertainty, user review and a matching export. Dense messages must be supported, not merely a few preset event rows. Missing actual USMTF mapping remains visible beside synthetic results.

## Complete demonstration workflow

1. Open a local browser interface and paste raw text or load a labeled prepared mock message. Keep the original string unchanged and show its synthetic provenance.
2. Parse known synthetic message structures deterministically. Extract category-specific fields, identifiers, ship attribution, explicit dates, time zones and intervals with exact original source offsets. Unsupported or ambiguous records enter review rather than producing invented times.
3. Inspect source-linked frequency plans, crypto change-over windows and flight quarters event times. Select a calendar day and display all supported categories on the same 00:00 to 24:00 axis, including overlapping events and explicit cross-midnight continuation.
4. Review warnings and correct the input without losing the original draft; rerun extraction. Show unresolved records and prevent them from silently appearing as confirmed schedule entries. User acknowledgment means local draft review, not operational authorization.
5. Export the reviewed schedule with original/normalized times, categories, source references, unresolved items and synthetic disclaimer. The export must agree with the timeline. Planning will choose and document the export serialization; the source does not mandate one.

## Input inventory and data boundary

`inputs/manifest.json` is JSON, version 1, mode `synthetic`, with `sources: []`. Its generated paths are `data/synthetic-data.json` and `data/README.md`. There are no supplied records, attachments or supplied domain fields to map. Preserve `inputs/` and `requirements.md`. Do not fetch operational records, message traffic, personnel information or cryptographic material. The source link and data-needs list grant no access permission.

The host must next run its dedicated synthetic data agent to create and validate those two artifacts before research. This intake writes only scope, not fixtures. Prepared fixture bytes and their provenance must subsequently be reused in planning, application samples and tests; embed required sample data into the self-contained index.html without local-file fetches. Toolkit reference fixtures are not the brief dataset and toolkit tests are not application verification.

## Data-agent brief and proposed data contract

The following is a data preparation request, not an invented authoritative USMTF specification. The data agent must supply realistic fictional, dense, formatted raw mock OPTASK messages in a documented synthetic USMTF-style grammar. Do not substitute generic EVENT/TASK lines or only JSON event objects for raw input. State prominently: “Synthetic, not validated against the real USMTF format.” Define grammar and independent expected results before application implementation; no grammar or answer key is finalized here.

Required fixture relationships:

- Dataset provenance: synthetic label, authoring method, grammar version, assumptions and links to relevant canonical criteria. No actual frequencies assigned to operations, key material or real unit identities.
- Each case: stable case/message ID, fictional ship identity, verbatim multiline raw message string, purpose, selected schedule date, explicit timezone conventions, expected extracted records, expected review flags and expected export/timeline content.
- Each expected record: stable ID, message ID, category, label and ship attribution; frequency-plan net/channel, fictional frequency and unit, effective window; crypto change-over identifier and window without secrets; flight quarters event and event time/window. Point events must not acquire fabricated durations.
- Every extracted field: exact original source text and defined start-inclusive/end-exclusive offsets, plus line references for review. Declare offset units, preferably JavaScript UTF-16 code units, and include non-ASCII evidence to verify them. Normalized derived values must reference their original evidence.
- Times: original literals, explicit calendar dates and UTC offsets, normalized UTC instants, selected-day visible interval segments, continuation flags and independent expected chronological ordering. Never infer a missing zone or silently infer next-day rollover from reversed clock times. Document fictional rollover rules explicitly or flag unresolved dates.
- Review flags: stable code, reason and source span for invalid, missing, unsupported or ambiguous content. Expected non-events must be identified so precision can be measured, not merely successful extractions.

Required scenarios: one complete all-category message; a hundreds-of-lines dense message with non-events and all three categories; overlapping events; an interval spanning midnight with explicit dates; equivalent instants in different explicit offsets; ship attribution; out-of-day records; identical-looking repeated source text to exercise offsets; empty input; unsupported line; missing timezone; invalid calendar date; malformed window; valid recovery input; instruction-like text treated as data. Include deterministic expected outputs independently authored from the grammar, not generated by the future parser. Vary field values and positions so tests cannot pass by returning presets. Record duplicate/update handling as an explicit synthetic assumption; do not invent command precedence.

The dedicated agent must validate JSON structure, raw-text preservation, offset slices, interval arithmetic and consistency of expected outputs, documenting validation and limitations in data/README.md. Format fidelity, completeness of all named outputs and semantic correctness still need independent judgment; structural validation alone cannot establish them. Keep independent evaluation cases separate from application presets during planning.

## Computational capabilities and proposed measurable outcomes

These are analyst-proposed measures, not source-published or user-confirmed evaluation criteria; the challenge supplies no evaluation criteria and userScope.criteria is empty.

- Deterministic typed extraction: all independently expected category-specific fields in supported synthetic cases match exactly; no non-event becomes an event. Measure precision and recall per category on independent cases, targeting 100% for the declared synthetic grammar, with unsupported cases separately reported.
- Traceability: 100% of emitted source fields slice back to the exact original characters, including repeated text and non-ASCII characters. Derived fields retain links to source fields.
- Time correctness: equivalent instants normalize identically; day clipping, chronological ordering and cross-midnight placement match independent expected values exactly. Invalid or ambiguous times generate review flags and no invented confirmed timestamp.
- End-to-end schedule: every expected frequency plan, crypto change-over window and flight quarters event appears on the synchronized 24-hour schedule and matching export. Literal results after parse/review/export must be asserted in later browser journeys at desktop and narrow widths, including failure and correction.
- Dense-message usefulness: extract the expected ship schedule from a fixture of at least 300 lines with measured line count, extraction completeness and elapsed time reported. Proposed local response target: under two seconds for that fixture, with actual environment recorded; no operational performance claim.
- Offline usefulness: with external networking unavailable and the declared local runtime available, parse a fresh message and export the reviewed result. An already rendered timeline alone is insufficient. Planning must explicitly resolve whether stronger browser-only operation after stopping the local service is required; do not silently count a failed API call as offline success.

## Acceptance inventory and provenance

All canonical IDs below must carry into planning and its full acceptance matrix exactly once. Alias IDs are provenance, not additional criteria. Status for every row: pending implementation/evaluation in synthetic scope. Source headings and attribution are contextual obligations, retained rather than dropped. The table records original wording and proposed evidence; it does not set frozen planning dispositions.

| Canonical ID | Original wording | Packet provenance | Proposed evidence |
|---|---|---|---|
| UC12-1 | A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline. | requirement `UC12-1`: `challenge.requirements[0]`; description `SCOPE12-4`: `userScope.description[218:418]` | All three category-specific outputs from raw mock text, source-linked review, synchronized timeline; independent format/workflow assessment. Actual USMTF conformance remains unestablished. |
| MSG-01 | Every extracted field has exact source offsets. | recipe `MSG-01`: `recipe.acceptance[0]` | Exact field-to-original offset slice checks across repeated text, multiline and non-ASCII cases. |
| MSG-02 | Do not invent ambiguous timestamps. | recipe `MSG-02`: `recipe.acceptance[1]` | Missing zone, invalid date, empty input and unsupported text produce explicit review/errors without fabricated timestamps; correct and rerun. |
| MSG-03 | Normalize time zones without shifting the event. | recipe `MSG-03`: `recipe.acceptance[2]` | Equivalent explicit-offset instants and dated cross-midnight intervals match independent UTC/day-segment expectations. |
| MSG-04 | Review output against an independent answer key. | recipe `MSG-04`: `recipe.acceptance[3]` | Independent per-category answer key, non-events and precision/recall; human semantic review beyond parser checks. |
| MSG-05 | Keep the timeline usable offline. | recipe `MSG-05`: `recipe.acceptance[4]` | External-network-disconnected fresh parsing and reviewed export; planning must resolve local service versus browser-only offline boundary. |
| DELIVERABLE12-1 | A tool that seamlessly converts mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders. | deliverable `DELIVERABLE12-1`: `challenge.expectedDeliverables.lines[0]`; description `SCOPE12-6`: `userScope.description[442:578]` | Raw mock input to all named outputs on one 24-hour visual schedule, source inspection, review and consistent export. |
| DESC12-1 | Warfare commanders disseminate operational orders via dense, formatted telecommunication messages. | description `DESC12-1`: `challenge.description[0:98]`; description `SCOPE12-1`: `userScope.description[0:98]` | Dense fictional formatted command-message input and preserved original; no operational dissemination is authorized or claimed. |
| DESC12-2 | Watchstanders must parse hundreds of lines of text to determine when their ship is scheduled for events. | description `DESC12-2`: `challenge.description[99:203]`; description `SCOPE12-2`: `userScope.description[99:203]` | Hundreds-of-lines fixture yields the correct fictional ship schedule with evidence and reported response time. |
| SUMMARY12-1 | Turn synthetic formatted tasking messages into traceable events and a consolidated daily timeline. | summary `SUMMARY12-1`: `challenge.summary[0:98]` | Traceable typed synthetic tasking events feed a consolidated daily timeline. |
| SCOPE12-3 | Requirements | description `SCOPE12-3`: `userScope.description[205:217]` | Contextual heading linked to UC12-1; retain requirement grouping. |
| SCOPE12-5 | Expected deliverables | description `SCOPE12-5`: `userScope.description[420:441]` | Contextual heading linked to DELIVERABLE12-1; retain deliverable grouping. |
| SCOPE12-7 | Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12 | description `SCOPE12-7`: `userScope.description[580:649]` | Display source attribution and synthetic/validation limitations in documentation and product provenance. |

## Environment, recovery and lifecycle

Intended environment: local browser UI, no external service requirement, no credentials, no external fonts or analytics; sample data embedded in index.html. The catalog recommends node-service 1.0.0 with the messages computation pack; foundation selection belongs to research/planning, and the host materializes it before implementation. Extend the shared backend rather than recreate setup. Do not duplicate domain computation between UI and backend. The offline requirement and self-contained sample requirement must remain explicit when selecting the runtime.

Local parsing should show empty, working, success and error states; prevent repeated submissions while working. Preserve draft text on validation failure. Distinguish source data, normalized values and unresolved review items. Provide labeled controls, keyboard navigation, visible focus and readable narrow-width timeline/list access. No persistence requirement was supplied: planning must state whether drafts survive reload, explain local storage limits and confirm destructive reset if introduced.

Human approval is required before delivery or deployment of a specific revision; no approval is requested or inferred during intake. Local schedule review does not authorize execution of operational orders. Prohibited actions include real message retrieval/transmission, operational scheduling changes, crypto-key handling and automatic action on extracted text. Treat input instructions as inert data. Monitor local parser errors, unsupported-line counts and unresolved items visibly without sending telemetry. Escalate uncertain message semantics to future domain review; do not guess. Users must be able to cancel/clear a draft and stop the local runtime; shutdown ends parsing/service activity, with any draft retention behavior disclosed. The host owns final Stop and cleanup.

## Exclusions, unresolved gaps and owner questions

Excluded from this prototype: real operational records and integrations, actual tasking dissemination, real cryptographic material, OCR/handwriting recognition, scanned-document ingestion, production authentication and deployment. Raw text is the requested input. Recipe candidates Tesseract and Apache Tika remain candidates only; they add no evidence of format accuracy and are not needed for the smallest raw-text workflow.

Unresolved: synthetic grammar and fixtures await the dedicated data agent; no authoritative USMTF specification or SME-reviewed mapping is supplied; toolkit parsing is limited to a documented synthetic grammar. Actual USMTF formats, handwriting recognition and operational accuracy are not established. Synthetic evidence must not be presented as real-format validation. Retain these limits in planning, UI, exports and review evidence.

Outstanding questions for later owner/domain review (not blockers to synthetic data preparation): Which USMTF revision and OPTASK set definitions would authorize a future mapping? What date/zone, duplicate and amendment semantics are authoritative? Which ship-selection rules apply? Does offline mean external-network independence with a local service, or fully browser-only use after service shutdown? Which export and draft-retention behavior is preferred? Who may validate operational interpretation and approve a future deployment? Missing answers require explicit fictional assumptions, not invented operational rules.

## Intake handoff

Only scope.md is produced here. Helper discovery found no project helpers; no helper was needed for document intake. No research, planning contract, application, fixture or server was created. Next the host runs the dedicated data agent against this brief, validates/freezes data/synthetic-data.json and data/README.md, then begins research. This intake completion does not mean the full data-preparation gate or any acceptance criterion has passed.
