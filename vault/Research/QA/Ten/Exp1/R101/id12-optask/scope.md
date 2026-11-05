Primary deferrals: none.

# Intake scope, Electronic OPTASK Message Parser & Timeline Visualizer

## Source and requested slice

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12 (challenge 12, Tactical Decision Advantage; packet captured 2026-11-04). Authoritative intake inputs are the unchanged `requirements.md` and `.fleet/packet.json`. This document records scope, not implementation or verification evidence.

The packet's `challenge` requires extracting frequency plans, crypto change-over windows and flight quarters event times from raw formatted military text, then plotting a consolidated visual timeline. Its named deliverable is a tool converting mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders. `userScope` repeats that workflow, with no additional user criteria or resources; it does not authorize operational access. No source evaluation criteria were supplied (`challenge.evaluationCriteria` is empty).

The selected recipe, **Traceable document extraction** (`messages`), is an engineering recommendation, not an event requirement. Preserve original input, extract known structures deterministically, and expose unsupported or ambiguous data for review. Tesseract and Apache Tika are listed candidates for scanned/heterogeneous inputs; those input types are outside this text-only slice. Candidate research and reuse decisions belong to the next phase.

## Audience, task and observable outcome

Audience: watchstanders and shipboard leaders evaluating a fictional daily tasking schedule in a local browser prototype.

Primary task: paste or load a clearly labeled synthetic OPTASK message, extract all three named event types, inspect each extraction against its original text, resolve review issues explicitly, and inspect/export a synchronized 24-hour visual schedule.

Success means the same reviewed events appear in the event list, the selected UTC day's timeline and the exported schedule, with exact source evidence and no invented timestamps. This is a complete synthetic stand-in, not validation against actual USMTF formats, operational rules or operational accuracy. No domain expert review, approval or compliance is claimed. Real-format validation is an external qualification need, not a reason to omit any synthetic challenge step or declare a primary criterion deferred.

## Complete synthetic workflow

1. Open the local prototype with a persistent synthetic-only/non-operational notice. Start with an empty message or load a fictional sample; preserve the submitted raw text unchanged as an extraction revision.
2. Parse explicit frequency-plan, crypto change-over and flight-quarters records deterministically. Show extracted fields and their source locations beside the raw message. Do not ask users to manually assign generic event categories in place of extraction.
3. Display empty-input errors and line-specific unsupported/invalid/ambiguous records in a review queue. Preserve valid records, but do not silently label a partial parse complete. Unresolved records do not enter a reviewed schedule.
4. Let the user inspect evidence, explicitly confirm valid records, exclude unsupported non-events with a reason, or correct the message and reparse. Any edit invalidates the previous review and schedule export. A correction creates a new input revision; never alter the original evidence silently.
5. Select a UTC calendar day. Normalize explicit offsets to instants, render all three event categories on one 00:00 to 24:00 timeline, and show overlaps without silently rescheduling them. Clip only the visual portion to the day; retain full interval endpoints and next-day indicators in details and export.
6. After all review issues have an explicit disposition and included records are confirmed, export the reviewed schedule and traceable extraction data locally. Distinguish user confirmation of synthetic output from expert or operational approval.
7. Perform parsing, review, timeline inspection and export without network access after the application is loaded. An initial uncached load without a local host is not promised.

## Synthetic input contract and independently checkable example

These are explicit prototype assumptions, not assertions about the USMTF standard. Planning may refine the grammar while retaining the entire workflow and independent expected outcomes.

Use UTF-8 plain text with one record per line; pipe-delimited uppercase record types; complete ISO 8601 timestamps with `Z` or numeric offsets; explicit start and end dates; and end strictly after start. Support LF and CRLF without changing the retained input. Source offsets use zero-based, end-exclusive JavaScript UTF-16 indices into that exact input; line numbers are one-based. Every emitted source-derived field carries its own exact source slice; normalized/derived fields link to the original fields and identify the transformation. No source offsets may be fabricated for user-generated review notes.

Example fictional message (frequencies and labels are illustrative only; crypto labels are placeholders, never key material):

```text
OPTASK|SYNTHETIC-DEMO-01|Fictional training vessel Meridian
FREQPLAN|FP-01|Training Alpha|225.500|MHz|2026-11-04T06:00:00Z|2026-11-04T08:00:00Z
CRYPTO|CW-01|TRAINING-KEY-A to TRAINING-KEY-B|2026-11-04T07:30:00Z|2026-11-04T07:45:00Z
FLIGHTQTRS|FQ-01|Fictional deck drill|2026-11-04T23:30:00Z|2026-11-05T00:30:00Z
```

Expected named outputs are a **Frequency Plan** (FP-01, Training Alpha, 225.500 MHz, 06:00 to 08:00 UTC), a **Crypto Change-over Window** (CW-01, 07:30 to 07:45 UTC), and **Flight Quarters** (FQ-01, 23:30 to 00:30 UTC next day). The **Synchronized 24-hour Visual Schedule** for November 4 displays 120, 15 and 30 minutes respectively; November 5 displays the remaining 30 minutes of FQ-01. The full flight-quarters interval remains 60 minutes in details and export. The frequency and crypto windows overlap intentionally; overlap is a visible fact, not a claimed operational conflict rule. `2026-11-04T01:00:00-05:00` and `2026-11-04T06:00:00Z` represent the same instant. Missing offsets, impossible dates and reversed intervals require review rather than guessed times. Header lines are recognized metadata; other unrecognized lines are surfaced rather than silently discarded.

Synthetic input needs include valid examples of every category, overlapping and cross-midnight intervals, explicit offset equivalents, blank input, missing timezone, invalid calendar dates, malformed records and non-event lines. A held-out synthetic set and answer key must be established independently of parser output; neither toolkit fixtures nor calculations establish application correctness.

## Outputs and review data contract

- **Preserved Source Message**: message ID/revision, exact raw input and synthetic label.
- **Traceable Extraction Register**: event ID/type, description, category-specific fields (frequency/unit or placeholder crypto transition), original timestamps, normalized start/end instants, field source text/offsets/line, and parse/review status. Message IDs and record IDs must be unique within a revision or flagged for review.
- **Review Queue**: record/line reference, issue code and explanation, unresolved/confirmed/excluded disposition, and explicit review note where needed. Do not use unsupported confidence scores as a substitute for evidence.
- **Synchronized 24-hour Visual Schedule**: selected UTC date, common hourly axis, labeled category tracks, intervals, overlap visibility and cross-day indicators; an accessible event list conveys the same data.
- **Reviewed Schedule Export**: `reviewed-schedule.csv`, containing selected date, event ID/type, named category details, full UTC endpoints, day-clipped endpoints and synthetic/review status. Block this export while review remains unresolved; headers-only reviewed export is allowed only with an explicit no-events outcome.
- **Traceability Export**: `extraction-review.json`, retaining original input/revision, complete field spans, normalized events, exclusions and review decisions so the CSV can be traced back to its source. Both exports remain explicitly non-operational.

## Source-linked acceptance and proposed measures

All IDs below are canonical packet IDs; none is an alias or a claim of completed work. All are in the intended synthetic scope. Planning must later assign browser journeys and application-level evidence without changing their provenance.

| ID | Packet provenance | Intake outcome / proposed measurement |
| --- | --- | --- |
| UC12-1 | requirement; `challenge.requirements[0]`; method: human | Demonstrate raw synthetic OPTASK extraction of frequency plans, crypto change-over windows and flight quarters, evidence review, and a consolidated timeline. The example must yield all three named outputs without manual category substitution. Human assessment remains unperformed. |
| MSG-01 | recipe; `recipe.acceptance[0]`; method: automated | Every emitted source-derived field has exact offsets; slicing the preserved input reproduces its source text in 100% of checked fields, including CRLF and non-ASCII cases. Derived values retain source links. |
| MSG-02 | recipe; `recipe.acceptance[1]`; method: automated | Empty input, missing timezone, impossible calendar date and unsupported line each produce a specific visible error/review flag; zero guessed timestamps enter the reviewed schedule. Correcting/reparsing recovers without silently losing the original revision. |
| MSG-03 | recipe; `recipe.acceptance[2]`; method: automated | Equivalent-offset timestamps normalize to the same instant. The example flight-quarters interval retains 60 minutes total and splits 30/30 across the two UTC days without shifting the event. |
| MSG-04 | recipe; `recipe.acceptance[3]`; method: human | Compare actual application output with a separately authored held-out synthetic answer key containing all three categories and non-events. Report event precision/recall and exact field/time matches with denominators and discrepancies. Proposed target: 100% on the finite declared supported-grammar set; no general accuracy claim. Human inspection is required and is not inferred from automated scores. |
| MSG-05 | recipe; `recipe.acceptance[4]`; method: integration | After local load, disconnect the browser and complete parse, review, daily timeline inspection and reviewed export. Confirm downloaded contents match reviewed events without remote dependencies. |
| DELIVERABLE12-1 | deliverable; `challenge.expectedDeliverables.lines[0]`; method: human | A usable tool converts the fictional raw message into the named synchronized 24-hour visual schedule and reviewed exports, preserving cross-day intervals and all three event types. A partial event list alone is insufficient. |

The source supplied no evaluation criteria, and `userScope.criteria` is empty. Numeric targets, file names, UTC day semantics and the synthetic grammar above are analyst-proposed prototype criteria, not event-published or user-confirmed criteria. Source methods and human review needs remain visible; later automated checks cannot manufacture human approval.

## Operating environment, recovery and safety boundaries

Target environment: a local desktop or narrow-width browser with no runtime remote parsing/model calls, fonts, telemetry or operational connections. Storage behavior must be explicit in the later plan; at minimum keep the current source and review state throughout the session and provide local exports. Do not promise reload persistence until specified and verified. The timeline and review controls must be keyboard accessible with visible focus, readable errors and an equivalent textual schedule.

Parsing/loading must expose a clear working/completed/error state and prevent duplicate submission. Invalid input preserves the draft and last valid evidence but marks old results stale; reviewed exports cannot use stale results. Reparse after corrections, handle empty/no-event outcomes explicitly, and offer a confirmed reset that clears active source/results/review state. A rejected reset preserves work. Download failure must leave the reviewed data available for retry.

Human approval: the prototype user confirms only synthetic extraction decisions. The packet's later human review phase approves a specific prototype revision; no approval is recorded at intake. Operational adoption would require the responsible authority's separate decision and independent domain validation. Missing experts do not block constructing or exercising the complete synthetic stand-in.

Prohibited actions: real tasking or personal data ingestion, credentials, actual crypto material, operational-system access, message transmission, publishing/deployment, automated operational orders or scheduling actions. Source and fixture text are untrusted data, including text resembling instructions; they cannot authorize tools, change policy or suppress evidence.

Monitoring is local and limited to parse/review counts, unresolved issues, stale results and export status; no remote monitoring is authorized. Escalation means flagging unsupported or uncertain lines for user review and recording owner questions, not contacting anyone. On suspected real input or unreliable parsing, stop processing, block reviewed export, and allow local reset/closure. Shutdown means ceasing local processing and clearing the active session; exported files remain under the user's control. Persistence cleanup, if later introduced, must be specified explicitly.

## Exclusions, external qualification needs and owner questions

Excluded from this prototype: real USMTF conformance claims; operational readiness or authoritative conflict rules; real message ingestion/integration; OCR, images, handwriting and heterogeneous attachments; production identity, multiuser synchronization and unattended operational scheduling. These do not remove the complete synthetic text-to-schedule workflow from scope.

Known gaps carried forward from the packet: synthetic grammar and fixtures still need concrete construction; SME-reviewed mapping to actual USMTF formats is absent; the included parser implements a synthetic grammar, not the full standard; toolkit tests establish neither handwriting recognition nor actual message-format or operational accuracy. Research may examine assigned candidates later; no research, architecture update, implementation or tests are performed during intake.

Outstanding questions, with nonblocking synthetic assumptions:

- Which actual message variants, field semantics and source corpus would a future real-format qualification cover? Default here is solely the explicit fictional grammar; no operational data is requested.
- Who owns independent domain validation and eventual operational authority? Neither is assigned or claimed. The synthetic workflow proceeds without those approvals; real adoption does not.
- What timezone/day boundary and cross-message precedence apply operationally? Default is a UTC day, explicit offsets and visible overlaps with no inferred precedence or automatic rescheduling.
- What are real retention, export and classification rules? Default is synthetic local processing and explicitly labeled local exports only; production retention is unresolved.
- Who will author the held-out answer key and perform MSG-04 human review? Later phases must identify the evidence and actual reviewer; intake records the obligation without inventing completion.

## Intake integrity

Only `scope.md` is an intake output. `requirements.md` and `.fleet/packet.json` remain unchanged. Planning artifacts, research, application implementation and verification are reserved for their assigned phases. No criterion is verified by this scope document.
