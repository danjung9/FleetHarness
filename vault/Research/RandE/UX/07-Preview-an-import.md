---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan for a bounded synthetic CSV import with visible mapping, errors and correction."
---

# 07: Preview imported rows before using them

## Bottom line

[R] Let a user reuse a simple input table without retyping each request. [R] Show the rows and field mapping before accepting the import. [E] Studio currently imports brief JSON, which is different from importing a training dataset. [R] Defer general data import until the four-request task and save/reopen path are reliable.

## User's problem

[A] Re-entering the same event, duration, person and room in another tool may erase the time saving. Automatic guessing of columns or times can create quiet errors.

## Exactly what they see and click

[R] In the task app, click Load example file or Import synthetic CSV. The event version accepts only a small documented template and fictional IDs. The next screen shows File preview, row count and Not yet applied.

| File column | Use as | Sample value |
| --- | --- | --- |
| event_id | Request ID | A |
| duration_minutes | Duration in minutes | 60 |
| person_id | Assigned fictional person | P01 |
| room_id | Fictional room | Room-1 |

[R] The user selects mappings from named options and sees a separate explicit rule for day/time units. Click Check rows. Missing or duplicate IDs and malformed durations get row-specific messages and Edit mapping links. Apply import becomes available only when all required values are valid. Show how many records will be added or replaced and retain the previous draft. Do not silently discard an invalid row.

[R] Keep allowed candidate times, qualification and rest-limit tables explicit. Never infer Navy policy or a person's qualification from the filename. A later connector would need its own authorization and review; no live connector is part of this card.

## How we would know it worked

[R] Import a synthetic file with reordered columns, one duplicate ID, a blank duration and a malformed time. All errors appear beside the correct rows. Valid import preserves values and provenance, re-import does not silently duplicate accepted records, and cancelling changes nothing. Compare manual-entry plus review time with import plus review time.

## Build size

[A] Medium: 4 to 8 person-hours for one bounded CSV schema, preview, validation and duplicate handling. General spreadsheets, PDFs, OCR and external connectors are excluded. [R] Thursday rank 7, defer; after-event rank 7, advance earlier only if users demonstrate repeated entry is the main burden.

## Backend needs

[R] A schema/version, parser, row limits, stable IDs, explicit time semantics, validation errors with row/column locations, source digest and atomic apply. Keep the raw synthetic input locally. Validate formula-like fields before spreadsheet export. No model call is needed. Unknown or restricted real data must not be routed to a provider.

## Dan's frontend

[R] Yes, proposal for Dan in the generated app's input area. This is not a replacement for Studio's brief import. Backend owns parsing and validation; Dan owns the mapping preview and correction flow.

## Sources

- [E] 50fcaea: src/studio/Studio.tsx Settings imports structured brief JSON; harness/tools/scheduling.ts defines required scheduling inputs.
- [V] Review before applying: https://design-system.service.gov.uk/patterns/check-answers/
- [V] Field-specific errors: https://design-system.service.gov.uk/components/error-summary/
- [R] [[Research/Naval-User/Simplicity-Requirements]], especially U3 and U7.

