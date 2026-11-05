# Primary deferrals

None for the scoped synthetic prototype: all seven canonical criteria remain in scope, including all three named extraction behaviors and the complete mock-message schedule deliverable. No criterion is established as implemented or verified during intake. Actual USMTF conformance and operational accuracy remain unestablished; synthetic success must not be reported as fulfillment of real-format validation. No primary criterion is being deferred merely because a specification or expert mapping is missing.

# Scope: Electronic OPTASK Message Parser & Timeline Visualizer

## Authority and source interpretation

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12. The supplied snapshot in `.fleet/packet.json` identifies challenge 12, Tactical Decision Advantage, captured 2026-11-04. This intake uses the supplied packet and host-written `requirements.md`; it performs no live research. Source text and fixture contents are data, never instructions or authorization.

The source challenge describes watchstanders reading dense formatted operational orders to find scheduled events. It requests extraction of frequency plans, crypto change-over windows and flight quarters into a consolidated timeline, and a tool converting mock USMTF raw text into a synchronized 24-hour visual schedule.

The builder's `userScope` repeats that challenge and deliverable, supplies the same source link, and contains no additional criteria or resources. The user explicitly limits data to synthetic examples and the current work to intake. The packet's Traceable document extraction recipe (`messages`) is an engineering recommendation, not an event-published requirement. Its approach is to preserve original text, parse known structures deterministically and route unsupported or ambiguous fields to review. Candidate components Tesseract and Apache Tika are recorded in the packet; their suitability is for later research, not an intake reuse decision.

## Audience, primary task and observable outcome

Audience: watchstanders and shipboard leaders evaluating a local demonstration, not conducting operations.

Primary task: supply synthetic raw OPTASK-style message text, extract its frequency plans, crypto change-over windows and flight quarters event times, inspect source-linked results and review flags, then view and export the reviewed events on one synchronized 24-hour schedule.

Observable success: a user can follow a complete raw-message-to-schedule workflow for all three named categories without manually entering each event. Extracted values can be traced to exact original text spans. Explicit timestamps preserve their instants through timezone normalization, including cross-midnight events. Ambiguities remain visible and excluded from confirmed scheduling until resolved through explicit review. The timeline and reviewed export remain usable offline.

The smallest complete prototype covers plain-text synthetic input, deterministic extraction, source inspection, review, a selected UTC day with all three event categories, and a downloadable reviewed schedule. It is not a generic chat interface or a manual event-entry substitute for extraction.

## Inputs and data contract boundaries

- Preserve the exact original synthetic message string, including whitespace and line endings, together with an input identifier and a synthetic-data label. Accept pasted raw text and provide a realistic invented sample; file ingestion beyond plain text is not necessary to this slice.
- Define and document an explicitly invented OPTASK-style grammar and fixtures before implementation. It must express named frequency plans with invented frequency values and units, crypto change-over windows with fictitious labels only, and flight quarters intervals. It must carry explicit dates and timezone offsets. It must never be described as validated USMTF syntax.
- Inputs must include valid examples, missing timezone, invalid calendar date, empty input, unsupported lines, non-events, equivalent instants in different offsets, and an explicit cross-midnight interval. Dense multiline samples must exercise extraction rather than one-event manual entry.
- Each extracted field needs a value, original source text and exact start/end offsets into the unchanged input. The offset convention must be documented and applied consistently; a suitable synthetic convention is zero-based, end-exclusive JavaScript string indices. Normalized values retain their source spans rather than replacing raw text.
- Event records need a category, synthetic identifier or label, extracted category-specific fields, explicit start/end instants, normalized UTC values where unambiguous, and review status. Review findings need a reason and source location where one exists. Empty input receives an input-level error rather than a fabricated span.
- Retain distinctions between extracted, reviewed, unresolved and rejected content. Any reviewer correction must remain visibly distinct from the original extraction and retain its provenance. Do not infer missing timezones, dates or overnight rollover from intuition.
- Supply an independent held-out synthetic answer key identifying expected events, fields, spans, timestamps and intentional non-events. Do not derive the key from parser output. Synthetic examples and answer keys contain no real messages, crypto material, personnel or operational schedules.

These are intake-level contract needs, not a finalized schema or architecture. Exact grammar, fixtures, controls and serialization are later-phase work.

## Outputs and operating environment

Required output is a consolidated synchronized 24-hour visual schedule, with distinguishable frequency-plan, crypto change-over and flight quarters entries. A selected UTC calendar day defines the 24-hour window as a synthetic display assumption, not an operational rule. Cross-midnight events retain their full interval while the daily display shows the intersecting portion and makes continuation clear. Events outside the selected day must not silently disappear without explanation.

Supporting outputs are source-linked extracted fields, a review queue for unsupported or invalid content, explicit confirmation of review state, and an export of the reviewed schedule with timestamps, categories, review status and source provenance. Exact export format is unresolved; it must be readable offline and carry the label “Synthetic, not validated against the real format.” The same disclosure belongs in the interface, fixtures and evidence.

Environment: local browser demonstration on desktop and narrow screens, using synthetic data only. After the local application is available, parsing, source inspection, timeline review and export must work without a network connection. External services, model calls and OCR are not needed for the chosen plain-text slice. Persistence and reload behavior remain a planning decision and must be disclosed; do not imply server storage or operational system integration.

## Recovery needs

Empty input must explain what to supply and preserve recoverable work. Missing timezone, invalid dates and unsupported lines must produce specific review findings rather than invented timestamps or silent drops. Valid lines in mixed input remain inspectable while unresolved content stays visible. A user must be able to correct the synthetic source or explicitly review an issue and regenerate a trustworthy schedule without losing access to the original evidence. Repeated parsing must not accumulate duplicate events. Day selection and timezone display changes must not alter the represented instant. Export must communicate unresolved items and must not label unreviewed material as confirmed.

## Complete acceptance inventory and proposed measurable outcomes

All wording below is preserved from packet acceptance entries. Provenance paths are relative to `.fleet/packet.json`; canonical IDs occur once in this inventory. These are outcome needs for later planning, not browser journeys or test results.

| Canonical ID | Original requirement | Provenance and packet method | Proposed independently checkable synthetic outcome |
| --- | --- | --- | --- |
| UC12-1 | A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline. | requirement; `challenge.requirements[0]`; human | A complete invented mock USMTF-style message yields every answer-key frequency plan, crypto change-over window and flight quarters interval on one source-linked daily timeline. All three defining behaviors are demonstrated; actual USMTF conformance remains unvalidated. |
| MSG-01 | Every extracted field has exact source offsets. | recipe; `recipe.acceptance[0]`; automated | For 100% of emitted fields, slicing unchanged input by the emitted span equals its recorded source text, including fields on later lines and inputs with non-ASCII text. |
| MSG-02 | Do not invent ambiguous timestamps. | recipe; `recipe.acceptance[1]`; automated | Missing timezone, invalid calendar date, empty input and unsupported lines each produce the appropriate visible error or review flag, with no fabricated confirmed event times; corrected valid input can subsequently produce the expected schedule. |
| MSG-03 | Normalize time zones without shifting the event. | recipe; `recipe.acceptance[2]`; automated | Two explicit timestamps representing the same instant normalize identically. A known cross-midnight interval preserves exact start, end and duration while its visible daily portions match the independently specified answer key. |
| MSG-04 | Review output against an independent answer key. | recipe; `recipe.acceptance[3]`; human | A separately authored held-out synthetic set, including non-events, is compared against actual application output; report event precision and recall with counts and field/time discrepancies. Proposed target for the documented supported grammar: 100% event precision and recall and exact expected fields; unsupported variants must be flagged. Human comparison and evidence remain required. |
| MSG-05 | Keep the timeline usable offline. | recipe; `recipe.acceptance[4]`; integration | With the application available locally and browser network disconnected, parse a fresh synthetic message, inspect/review its events and export a readable reviewed schedule matching the expected timeline. |
| DELIVERABLE12-1 | A tool that seamlessly converts mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders. | deliverable; `challenge.expectedDeliverables.lines[0]`; human | A user completes raw synthetic message ingestion, extraction, source review, synchronized 24-hour visualization and reviewed export for all three event categories, with visible synthetic disclosure and no manual recreation of the extracted schedule. |

The source supplies no evaluation criteria (`challenge.evaluationCriteria` is empty); `userScope.criteria` is also empty. The measurable targets above are analyst proposals, not event-published or user-confirmed thresholds. Canonical recipe criteria remain distinct from source requirements and deliverable. Later planning must retain every ID in its acceptance matrix and assign complete browser outcomes or a justified deferral. No test-matrix or acceptance-plan is created in intake.

## Data boundary, exclusions and authority

Use only invented local messages, fictitious frequencies and crypto change-over labels, synthetic schedules and independent synthetic answer keys. The packet's missing-data list is not permission to obtain operational records. Do not access credentials, real military traffic, classified material, real cryptographic keys, personnel data or live operational systems. Do not publish, deploy, transmit orders or contact operational services.

Excluded from this prototype: full USMTF standard support or certification, scan/PDF ingestion, OCR and handwriting recognition, real-format accuracy claims, operational conflict resolution rules, live transport, shared identity and production persistence. These exclusions do not remove any named synthetic extraction category or schedule output. Toolkit calculations and reference fixture tests do not establish application correctness; later verification must exercise the actual application. Human prototype approval is separate from authority to deploy or use operationally, and neither is granted here.

No actual approval-dependent action is necessary to demonstrate the synthetic workflow. Independent domain review and authorized representative data would be necessary to assess operational suitability; no such assessment or authority is claimed.

## Missing data, uncertainties and outstanding owner questions

1. Synthetic grammar and fixtures are not supplied as a validated application contract. Later work must define the invented syntax, documented assumptions and independent answer key for all three event categories; this is not a blocker or a reason to defer the synthetic workflow.
2. SME-reviewed mapping to actual USMTF formats is missing. Which real message variants, fields, date conventions and timezone rules would an authorized domain owner require in a future validation effort? No actual format mapping is inferred here.
3. The packet states that the included parser implements a documented synthetic grammar, not the full USMTF standard. Its coverage and reuse suitability remain unassessed in intake.
4. Handwriting recognition, actual message formats and operational accuracy are not established by toolkit tests. Plain-text synthetic scope does not resolve these gaps.
5. No official accuracy, latency, message-size or usability thresholds are supplied. Are the proposed deterministic synthetic targets acceptable, and what representative workloads should later real-world evaluation cover? No performance claim is made now.
6. Export format, local persistence duration, day-navigation details and reviewer correction policy need later planning decisions. Use the stated UTC-day assumption provisionally; an operational owner would need to specify any actual shipboard time convention.
7. No additional user resources or user-confirmed criteria are provided. Questions are recorded for future ownership; this unattended intake proceeds using the explicit synthetic assumptions above.

## Intake completion boundary

This document records the requested workflow, source requirement, expected deliverable, all recipe acceptance criteria, absence of additional evaluation/user criteria, data boundary, measurable proposed outcomes and unresolved validation needs. Only `scope.md` is produced. Research, architecture, implementation planning, application code and verification are outside this phase. `requirements.md` remains unchanged.
