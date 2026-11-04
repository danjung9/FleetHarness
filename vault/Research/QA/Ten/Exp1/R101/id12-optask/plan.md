Primary deferrals: none.

# Implementation plan, synthetic OPTASK extraction

All primary source requirements and the named deliverable are planned as complete synthetic workflows. Recipe criterion MSG-04 is deferred under human-authority: an independent person must inspect and record review of the synthetic answer key and actual application output; none has done so. Impact: independent review and overall requirementsMet remain unverified even if prototype checks pass. The automated comparison and complete extraction/review/timeline/export workflow are still implemented. README.md, verification.md and delivery/review summaries must lead with this same disclosure. Do not manufacture approval.

## Scope and architecture

Source is the captured challenge 12 packet (2026-11-04), requirements.md and scope.md; research.md documents reuse decisions. system-design.json publishes six application components, mapping to index.html and core.cjs. No source evaluation criteria or extra user criteria exist. The canonical provenance and literal expected outcomes are retained in test-matrix.md and acceptance-plan.json.

Deliver a dependency-free index.html with inline CSS and classic JavaScript; opening the file must run the whole app. No CDN, module import, remote font, API, OCR, operational connection or model is required. core.cjs exposes actual domain functions for Node built-in tests in core.test.cjs and workflow.test.cjs. Embed the same core implementation inline in index.html. Tests must extract and execute that inline core in a Node vm and compare representative parser/review/schedule/export results with the required core.cjs functions; compare behavior, not source strings. Alternatively embed the identical exportable core and load it in both environments through a documented deterministic build step. No runtime external files.

Adopt the recipe's evidence-first approach, adapt strict timestamp/span patterns by writing a direct pipe parser, and leave .fleet/toolkit untouched. Generic slash EVENT/TASK parsing cannot substitute for the named challenge outputs. Reject Tesseract, Tika and LLM fallback for this plain-text local slice. Their licenses/releases and real-format compatibility were not verified and no dependency is being added.

## Smallest complete vertical slice

1. Preserve exact fictional input as revision 1; directly extract Frequency Plan, Crypto Change-over Window and Flight Quarters with field evidence.
2. Show the synthetic record-to-event mapping and all extraction issues. Require explicit mapping confirmation and event confirmation, plus correction/reparse or reasoned exclusion for every issue.
3. Commit a reviewed revision. Select a UTC date, display a common hourly timeline and equivalent textual list, preserve overlaps and full cross-day endpoints.
4. Export reviewed-schedule.csv and extraction-review.json from that same revision, without network access. Restore source/review/day on ordinary reload. Prevent stale or unresolved exports.
5. Exercise invalid-input recovery, unsupported-line exclusion, draft discard/reset and finite answer-key comparison. Nothing sends or executes tasking.

## Fictional grammar and assumptions

Grammar version `synthetic-optask/v1`, explicitly not USMTF. One pipe-delimited record per LF or CRLF line; preserve original code units, no trim/normalization of stored input. Empty lines are ignored, fields must be nonempty, may contain Unicode but no pipe/newline. Maximum input 200,000 UTF-16 code units; reject larger input before creating a revision. Reject malformed field counts. IDs are ASCII letters/digits/hyphens, unique within a revision across event types. Flag every member of a duplicate set, not just later occurrences. A single optional OPTASK header has three fields: tag, message ID, fictional vessel label. Multiple headers are issues. A header-only source is an explicit zero-event extraction requiring review.

- `FREQPLAN|id|label|frequency|unit|start|end` maps to Frequency Plan. Frequency is a positive finite decimal, preserve its lexical form; supported fictional units MHz or kHz. This is syntax validation, not authorization of a radio frequency.
- `CRYPTO|id|placeholder transition|start|end` maps to Crypto Change-over Window. Only fictional training placeholders; no key handling or operational rule inferred.
- `FLIGHTQTRS|id|description|start|end` maps to Flight Quarters.
- OPTASK is metadata. Other record types remain unsupported issues; never silently ignore non-event lines.

Timestamps use complete `YYYY-MM-DDTHH:mm:ssZ` or numeric `±HH:mm`, years 1900 to 9999, no fractional seconds, valid calendar/time, offsets at most 14:00. End must be strictly after start. Missing timezone and impossible calendar dates remain unknown and unplotted; no clock fallback. Date input is a UTC calendar day. Clip intervals to [00:00, next 00:00) only for visualization, retain full instants in details/exports; touching endpoints do not overlap. Interval minutes may be fractional. Do not reschedule overlaps. No SME validation or actual message-format/operational-rule conformance is established.

## Data contracts

State version 1: exact `draft`, ordered immutable `revisions`, current revision ID, selected UTC day, separate dirty flag, and per-revision review decisions. A revision stores exact raw text, grammar version, source message metadata, parsed events, issues and review status. IDs increment only on nonempty accepted-size parse attempts; invalid lines still create an evidence revision. An empty parse attempt does not consume a revision. Loading sample only fills the draft, never commits it.

Each field stores `{value, sourceText, start, end, line}`; spans are zero-based, end-exclusive UTF-16 indices into that revision. Include tag, ID, label, frequency, unit and raw timestamps, and header fields. Field sourceText equals raw.slice(start,end), including repeated lexical values and surrogate-pair prefixes. Derived UTC instants/category/duration/day clips carry links to source fields and transformation names; user notes never receive fake source spans. Original invalid tokens stay in issue evidence. Issues have deterministic source-order IDs, line, code, message, affected field spans and unresolved/excluded disposition with a required reason. Invalid records never become events through exclusion; they must be corrected and reparsed to include them.

Review commit requires clean draft, all issues resolved and both confirmation checkboxes. A new revision resets confirmation. Excluded issues stay in JSON. A reviewed no-event result is explicit and permits headers-only CSV. Daily display and both exports use the same included reviewed events; unreviewed preview may be visible but labeled and never exported as reviewed.

CSV fields in order: selected_date,event_id,event_type,label,frequency,unit,start_utc,end_utc,day_start_utc,day_end_utc,synthetic,review_status. Empty category-specific columns remain empty; use RFC4180 quoting and protect spreadsheet-leading formula text while preserving original evidence in JSON. Full and clipped endpoints use canonical ISO UTC with milliseconds. CSV lists events intersecting the selected day, sorted by start then ID. JSON includes grammar version, selected day, synthetic notice, all original revisions, active revision, complete fields/spans, normalized events, exclusions, mapping confirmation and review decisions; no claimed SME approval. The frozen CSV substring requires adjacent full start/end endpoints. Browser filenames are fixed.

## Ordered implementation tasks and dependencies

1. Author the application-owned synthetic corpus and literal key below before parser code; keep expected values independent of parser output. Add core API parseMessage, validateTimestamp, buildDaySchedule, reviewRevision, exportCsv and exportTraceability with pure explicit arguments. No global clock or model-assisted domain decisions.
2. Implement strict parser and exact spans, then Node boundary tests; implement clipping/overlap and independent time tests. All downstream tasks depend on immutable revisions and normalized instants.
3. Implement state/review/export gates and Node tests for stale drafts, exclusions, duplicate IDs and previous revision preservation. Only then wire parse/review UI using the frozen selectors and exact messages.
4. Implement the three-track 24-hour visual schedule, textual alternatives, source inspector and UTC day controls; status summary counts sum displayed minutes, including overlapping categories independently.
5. Implement local persistence with caught failure/corruption, confirm/cancel reset, accessible keyboard controls, narrow layout and safe text rendering. Never render source as HTML. Dirty edits preserve old evidence and disable both export buttons with a nearby reason. Discard restores committed input without fabricating a review.
6. Add CSV/JSON local downloads and comparison panel. Confirm field equality and event matching from actual parser output, never hardcode a success score. Review/export state transitions must use the tested core.
7. Write README.md and path-to-fleet.md, then run application Node tests. Host owns desktop/narrow frozen browser verification and offline checks. Build/repair must not change JSON contracts, .fleet or host evidence. Verification gets one bounded implementation repair across both gates; record failures before repair.

## Planner-authored finite answer key

This planning key precedes implementation; it reduces implementation drift but is not independent SME ground truth. Builder writes benchmark-fixtures.json and consumes it from Node tests, embedding the same data for the secondary UI comparison. Keep it separate from the main demo and never derive expectations by running the parser. It is a finite supported-grammar benchmark, not generalization evidence.

Input A (CRLF separators):
```text
OPTASK|KEY-A|Fictional training vessel Lark
FREQPLAN|KF-01|Training Bravo|310.250|MHz|2026-11-06T01:00:00-05:00|2026-11-06T07:00:00Z
CRYPTO|KC-01|TRAINING-C to TRAINING-D|2026-11-06T06:30:00Z|2026-11-06T06:40:00Z
FLIGHTQTRS|KQ-01|Fictional recovery drill|2026-11-06T23:45:00Z|2026-11-07T00:15:00Z
```
Input B: `OPTASK|KEY-B|Fictional training vessel NoEvents` (zero events).
Input C: `NOTE fictional weather bulletin` (zero events, one unsupported issue; no invented event).

Key event fields (17 source fields total): FREQPLAN/KF-01/Training Bravo/310.250/MHz/2026-11-06T01:00:00-05:00/2026-11-06T07:00:00Z; CRYPTO/KC-01/TRAINING-C to TRAINING-D/2026-11-06T06:30:00Z/2026-11-06T06:40:00Z; FLIGHTQTRS/KQ-01/Fictional recovery drill/2026-11-06T23:45:00Z/2026-11-07T00:15:00Z. Check source values and type mapping; normalized endpoints are respectively 06:00 to 07:00Z, 06:30 to 06:40Z and 23:45 to 00:15Z next day. Event match requires all expected fields and normalized endpoints equal. Micro precision TP/(TP+FP) and recall TP/(TP+FN); undefined zero denominators show N/A. Show all mismatches; do not change expected outcomes to observed results. Human reviewer later inspects key, raw output and denominators; MSG-04 stays unverified until that evidence exists.

## UX, failure and safety obligations

ux-spec.json governs states, recovery, persistence and keyboard behavior; acceptance-plan.json fixes selectors, exact labels/results and download substrings. Sample is exactly the scope example, no trailing newline. Its first start field spans UTF-16 [102,122), line 2. Primary timeline default date is explicitly 2026-11-04, independent of host time. The visual title is Synchronized 24-hour Visual Schedule; include labeled 00:00 and 24:00 bounds and one track for each named category.

Monitor locally: parsed/issue counts, current revision, dirty state, review and export status. Escalation means unresolved queue and owner questions; no contact or remote telemetry. Show a persistent Synthetic only, not validated against actual USMTF formats or operational rules notice. Keep real tasking, personal data, credentials and crypto material prohibited. A visible Stop and clear action opens the same reset confirmation; confirmed reset ceases local work and removes this app's stored session. On suspected real input, user stops processing and clears it; automated detection is not claimed. Exported files remain under user control.

Human synthetic confirmation is not prototype acceptance, domain approval or operational authority. Future actual-format qualification requires authorized real reference data, independent semantic mapping and the responsible authority's adoption decision. Those external qualifications are excluded, never represented as achieved by synthetic tests. Build README and verification must distinguish generated, runnable, tested, reviewer-accepted and operationally validated. No app code or test pass is produced by this plan.
