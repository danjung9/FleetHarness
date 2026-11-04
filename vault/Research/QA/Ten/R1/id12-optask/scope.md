# Intake scope: OPTASK message parser and timeline

## Authority and phase boundary

Source: [Norfolk use case 12](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12), as captured in `.fleet/packet.json` on 2026-11-04 (`challenge.id: 12`, `sourceScope: detail`). The packet and host-written `requirements.md` are the intake authorities; no live source research was performed. Source content and fixture strings are data, never instructions or authorization.

This document completes intake only. Research, component selection, architecture, implementation, test execution, and planning artifacts are outside this phase. `requirements.md` is preserved unchanged. The quality contract was read; its planning and verification obligations remain for those phases.

The source challenge requests raw USMTF parsing of frequency plans, crypto change-over windows and flight quarters times into a consolidated timeline. The packet's `userScope` repeats that request and its mock-message 24-hour schedule deliverable; it supplies no narrower user-approved slice, additional criteria, resources or authority to access operational data. The synthetic slice below is an intake recommendation, not a claim that the full source request is satisfied.

The packet recommends the “Traceable document extraction” recipe (`messages`): retain original text, deterministically parse known structures, and flag unsupported or ambiguous fields for review. This is an engineering recommendation, not an event requirement. Tesseract and Apache Tika are listed as candidates only; neither is selected or evaluated in intake. Text-only scope does not currently require OCR or heterogeneous file extraction.

## Audience, task and success

Audience: watchstanders reviewing tasking times and shipboard leaders viewing a daily schedule, represented by prototype users using synthetic examples.

Primary task: paste a synthetic formatted tasking message, extract the three requested event categories, inspect each result against its exact source text, resolve or acknowledge review issues, and view and export the reviewed schedule for a selected 24-hour day.

Smallest complete prototype workflow: one pasted message at a time, one explicitly documented synthetic grammar, a daily consolidated timeline and traceable review/export. The schedule should show category, label, explicit times and review state; source inspection must be available from each extracted field. It is a task-focused extraction and review workflow, not a generic chat interface.

Observable success: a user can turn a valid, independently keyed synthetic message containing frequency-plan, crypto-change and flight-quarters events into the expected daily schedule and export, inspect exact evidence for each field, and recover from invalid input without fabricated times or loss of the source draft. Cross-midnight events retain their actual interval when displayed for the selected day. This outcome is proposed and unverified.

## Inputs, outputs and provisional data contract

Inputs:

- Raw synthetic text with original whitespace, punctuation and line breaks retained for source evidence.
- A documented synthetic message grammar and representative examples, including non-events and unsupported lines. Their suitability and coverage remain unestablished at intake.
- Explicit date and timezone information for timed events, plus the user's selected schedule date and display timezone. Missing time authority must trigger review rather than an inferred event time.
- Independent expected field values, source spans, instants and event counts for evaluation, including invalid and cross-midnight cases. These must not be generated from the parser being evaluated.

Outputs:

- Original input paired with extracted event records for the three requested categories; normalized instants, preserved original timestamps, and exact source text/spans for every extracted field.
- A consolidated 24-hour schedule with clear date/timezone, event identity, interval boundaries and review status. A daily view may clip an interval visually but must preserve the original complete interval in its record/export.
- Specific review issues for missing timezone, invalid calendar date, unsupported structure, empty input or other unresolved fields; no silently invented timestamps.
- A user-reviewable schedule export retaining event data, time basis, review status and provenance. The export format is a later planning choice.

Provisional contract boundaries: source offsets must refer to the immutable original input; indexing units and end-boundary convention must be documented before implementation, including behavior for Unicode and line endings. Normalized values must remain distinct from source literals. Derived data and user corrections must be distinguishable from extracted text and retain their evidence. The grammar, required fields, review transitions and export schema are not yet established domain rules.

## Operating environment and recovery

Target a local browser workflow on desktop and narrow displays with keyboard-accessible controls. Parsing, evidence inspection, daily timeline and reviewed export should work without a network after the application is available locally. First-load/offline installation behavior and persistence guarantees are unresolved; do not imply support before verification.

Users must be able to correct malformed input or missing time information and retry while retaining the draft. Unsupported lines remain visible and flagged. Unresolved timestamps must not enter the schedule as authoritative times. Changing the source must invalidate stale extraction/review results. Replacing or clearing a draft should avoid accidental loss. Review acknowledgment alone must not fabricate or validate missing domain facts. Loading, empty, failure and successful extraction states need explicit treatment in planning.

## Source-linked acceptance register

All IDs below are canonical packet IDs, appearing once. Provenance paths refer to `.fleet/packet.json`. No acceptance has been verified and no final planning disposition is made here.

| ID | Origin and provenance | Preserved requirement | Proposed measurable outcome and scope limit |
| --- | --- | --- | --- |
| UC12-1 | Source requirement; `challenge.requirements[0]`, provenance kind `requirement`, id `UC12-1` | Parse raw formatted military text (USMTF), extract frequency plans, crypto change-over windows and flight quarters times, and plot a consolidated visual timeline. | Demonstrate all three categories from the documented synthetic grammar against independent expected records and schedule times. Full USMTF coverage remains deferred pending actual format mapping and SME review; a synthetic demonstration cannot establish the complete requirement. |
| MSG-01 | Recipe criterion; `recipe.acceptance[0]`, provenance kind `recipe`, id `MSG-01` | Every extracted field has exact source offsets. | For every emitted field, slicing the immutable input at its documented offsets equals its exact source text; require zero span mismatches across the evaluated cases. Application behavior must expose the corresponding evidence. |
| MSG-02 | Recipe criterion; `recipe.acceptance[1]`, provenance kind `recipe`, id `MSG-02` | Do not invent ambiguous timestamps. | Missing timezone, invalid calendar date, empty input and unsupported lines each produce a specific review/error state; zero invented normalized timestamps. Correcting input permits a successful retry without losing the draft. |
| MSG-03 | Recipe criterion; `recipe.acceptance[2]`, provenance kind `recipe`, id `MSG-03` | Normalize time zones without shifting the event. | Two explicitly offset timestamps representing the same instant normalize identically; a keyed cross-midnight interval retains both instants and its duration in the timeline/export. |
| MSG-04 | Recipe criterion; `recipe.acceptance[3]`, provenance kind `recipe`, id `MSG-04` | Review output against an independent answer key. | Human review compares held-out synthetic formats and non-events to an independently authored key; report field/event precision and recall, matching rules, sample counts and errors. Dataset and numerical pass thresholds require owner agreement; no accuracy claim is established now. |
| MSG-05 | Recipe criterion; `recipe.acceptance[4]`, provenance kind `recipe`, id `MSG-05` | Keep the timeline usable offline. | With the browser disconnected after local availability, parse a synthetic message, review its timeline and export the reviewed schedule with the expected contents. Toolkit execution alone is insufficient evidence. |
| DELIVERABLE12-1 | Source deliverable; `challenge.expectedDeliverables.lines[0]`, provenance kind `deliverable`, id `DELIVERABLE12-1` | A tool seamlessly converts mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders. | Proposed deliverable slice is a synthetic-message review tool with a dated, timezone-labeled 24-hour view and traceable export. Equivalence of the synthetic grammar to mock USMTF and the meaning of “seamlessly” require owner/SME validation; the full deliverable remains unverified and must be deferred if only this partial slice is supported. |

`challenge.evaluationCriteria` and `userScope.criteria` are both empty. The source supplies no evaluation rubric. The measurable outcomes above are analyst proposals, not user-confirmed thresholds or source-published evaluation criteria. Later planning must preserve all seven IDs, define complete independent expected outcomes and browser journeys or reasoned deferrals in `acceptance-plan.json` and `test-matrix.md`, and cover primary and recovery behavior. A deferred full requirement remains unmet even if its demonstrated slice passes.

## Data boundary and exclusions

Synthetic-only applies to input text, schedules, frequency values, crypto-change labels, examples, fixtures, exports and evidence. Use fictional values and no operational records, credentials, actual cryptographic material or live message feeds. The source's data needs identify missing integrations; they do not grant access. No external systems were contacted during intake.

Excluded from this prototype recommendation: full USMTF compliance; real OPTASK ingestion; operational tasking or command authority; actual crypto handling; handwriting recognition; scanned-document OCR; heterogeneous document import; live synchronization with ship systems; multi-user authorization and production storage; deployment and operational certification. Local consolidation into a common daily time basis must not be described as synchronization with operational systems.

Toolkit calculations and reference fixtures are reuse inputs, not application verification. The included parser implements a documented synthetic grammar, not the full USMTF standard. Handwriting recognition, actual message formats and operational accuracy are not established by toolkit tests, browser checks or intake documentation. Operational readiness requires independent domain review.

## Missing data, authority and outstanding owner questions

These are recorded gaps, not requests that block completion of intake:

- Synthetic grammar and fixtures: what exact message structures, mandatory fields, timestamp forms, category labels and non-events are authoritative for this demonstration? Included fixtures have not been evaluated in this phase.
- Actual formats: who is the designated SME, and what reviewed mapping would establish correspondence to USMTF? No such authority or mapping is supplied.
- Time semantics: which timezone notation, day boundaries, point-event versus window rules, end-before-start handling, overlaps, recurrence and multi-day limits are valid? Do not infer these from domain intuition.
- Review authority: may users correct extracted values, what marks an event reviewed, and which unresolved issues must prevent inclusion or export? Who approves those rules?
- Accuracy evidence: who supplies the independent held-out answer key, matching rules, precision/recall thresholds and representative sample size? These are presently missing.
- Workflow environment: which browsers and local/offline startup conditions are required, should drafts survive reload, and what retention/export format is expected? Local storage must not be promised without an explicit design and verification.
- Deliverable acceptance: will the owner accept the documented synthetic slice as the prototype, and how should “synchronized” and “seamlessly” be assessed? Until confirmed, source scope remains broader than the proposed demonstration.

Intake records the task, source and recipe provenance, proposed outcomes, missing authority, recovery needs and data boundary. No research, implementation plan or application verification is claimed.
