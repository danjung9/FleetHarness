---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Synthetic message-to-timeline answer key covering three published event types, source spans, midnight and uncertain input."
---

# ID 12: synthetic message timeline answer key

## Bottom line

[R] A watchstander should see three supplied time windows on one timeline and trace each back to the message. This entirely synthetic example covers the three categories named in the published challenge, including an overnight interval and an explicit timezone conversion. [E] The included code reads an invented EVENT/TASK format, not actual USMTF. [R] Passing these examples proves a small synthetic message-to-timeline demonstration; actual USMTF parsing remains unverified. No frequency assignment, cryptographic material, ship, real person or unit appears in the input.

## Published need and coverage

[P] The captured ID 12 text calls for raw USMTF input, extraction of frequency plans, crypto changeover windows and flight quarters times, and a consolidated visual timeline. It provides no grammar, sample message, timezone default, cancellation rule or answer key.

| Published need [P] | Coverage in this synthetic example [R] | Limit |
| --- | --- | --- |
| Raw USMTF parsing | Not tested | The following slash-delimited grammar is invented and must be labeled as such |
| Frequency plans | Preserve the supplied plan/channel labels and their window | FREQ-SYN-A is a dummy label, not a frequency; numeric frequencies, units and actual plan structure are not tested |
| Crypto changeover windows | Preserve one supplied window | No cryptographic key, procedure or real changeover schedule is supplied |
| Flight quarters times | Preserve one supplied window | No real flight operation, aircraft or ship is represented |
| Consolidated visual timeline | Order all three windows by their actual UTC instant; show the midnight boundary | A list alone does not demonstrate the visual requirement |

[E] At `50fcaea`, `harness/tools/messages.ts` returns generic EVENT or TASK items, exact original source spans and review reasons. It does not return dedicated frequency-plan or crypto fields and does not draw a timeline. [R] The generated app must retain the event category and dummy plan/channel text visibly, whether in structured fields or the original description. Rendering these windows is a separate app check. Exact source references are a project acceptance choice in `harness/recipes.ts`, not an invented USMTF rule.

[R] Coordination: attach this key to the M family in [[Research/QA/Test-Plan]], historically M-O/M-S/M-W at `50fcaea`. The final relay's unified UI at `631849f` needs updated navigation, as recorded in [[Research/QA/Officer/README]]; the domain helper is unchanged. This key adds the three published categories and explicit midnight/source-span answers. Reuse M2 boundary coverage with these exact variants; do not create a second interface test plan or drop M1's TASK, accented-text or inert-input checks.

## Synthetic input and agreed interpretation

[A, synthetic fixture] An invented watch role, SYN-ROLE-01, reads a demonstration message with three labeled windows. All dates are fictional test dates. The labels describe the published categories without carrying operational content.

[R, synthetic contract] Use source ID `SYN-MSG-12-A`. Each line follows `EVENT/id/start/end/owner/description//`. Slashes are separators. Timestamps require an explicit timezone. The source text uses one LF newline between lines, no leading spaces and no final newline, for a total of 314 characters. The following block is the complete synthetic input. Its order is deliberately different from timeline order.

```text
EVENT/FQ-01/2032-04-16T00:10Z/2032-04-16T00:40Z/SYN-ROLE-01/SYNTHETIC flight quarters window//
EVENT/FP-01/2032-04-15T23:40Z/2032-04-16T00:20Z/SYN-ROLE-01/SYNTHETIC frequency plan PLAN-A channel FREQ-SYN-A//
EVENT/CO-01/2032-04-16T00:55+01:00/2032-04-16T01:05+01:00/SYN-ROLE-01/SYNTHETIC crypto changeover window//
```

## 12-G01: exact base answer

[R] Exactly three events must be extracted. Each has kind EVENT, owner SYN-ROLE-01, source ID SYN-MSG-12-A and no due-date field value (`due = null`). There are zero warnings, zero item review reasons and `needsReview = false` for parser ambiguity. That flag does not mean a human has approved anything.

| Timeline order | ID | Category and preserved data | UTC start | UTC end | Duration |
| --- | --- | --- | --- | --- | --- |
| 1 | FP-01 | Frequency plan; PLAN-A; FREQ-SYN-A | 2032-04-15T23:40:00.000Z | 2032-04-16T00:20:00.000Z | 40 minutes |
| 2 | CO-01 | Crypto changeover window | 2032-04-15T23:55:00.000Z | 2032-04-16T00:05:00.000Z | 10 minutes |
| 3 | FQ-01 | Flight quarters window | 2032-04-16T00:10:00.000Z | 2032-04-16T00:40:00.000Z | 30 minutes |

[R] Preserve the exact description text from each source line. The parser may retain source order FQ-01, FP-01, CO-01; the visual timeline must place FP-01 first, CO-01 second and FQ-01 third by start instant. Display UTC or an explicitly labeled equivalent timezone. With UTC selected, both dates must be visible. A 24-hour view may split the overnight bars at midnight, but must preserve one underlying event per ID and expose both days.

[E, independent time arithmetic] The crypto timestamps are one hour ahead of UTC, so subtract one hour to obtain 2355 on April 15 through 0005 on April 16. At midnight, FP-01 and CO-01 are active; FQ-01 has not begun. FP-01 overlaps CO-01 for 10 minutes and FQ-01 for 10 minutes. [R] Preserve these overlaps. This parser must not reschedule, suppress or declare an operational conflict between them.

## Exact source references for the checker

[R] Index from zero and treat each span as `[start,end)`, with `end` excluded. Offsets refer to the original input, not the normalized UTC string. All characters here are ASCII, so the project's UTF-16 indexing and character indexing agree. The line spans include their final `//`, but exclude the newline.

| ID | Source line | Entire line span | kind | id | start | end | owner | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQ-01 | 1 | [0,94) | [0,5) | [6,11) | [12,29) | [30,47) | [48,59) | [60,92) |
| FP-01 | 2 | [95,207) | [95,100) | [101,106) | [107,124) | [125,142) | [143,154) | [155,205) |
| CO-01 | 3 | [208,314) | [208,213) | [214,219) | [220,242) | [243,265) | [266,277) | [278,312) |

[R] Each emitted field's source text must equal the original input sliced at that span. In particular, CO-01's start source is `2032-04-16T00:55+01:00`, while its normalized start is `2032-04-15T23:55:00.000Z`. Those are different strings describing the same instant. Clicking or inspecting a source reference must identify the corresponding original line, not a newly generated paraphrase.

## Changed inputs and exact expected outcomes

[R] Reset to 12-G01 before each row. Expected reason wording may differ, but the stated meaning, counts, original input retention and normalized values must match. Parser results and an approved/displayable timeline are separate: malformed records remain available for review and must not masquerade as valid bars.

| Case | Exact synthetic edit | Required answer |
| --- | --- | --- |
| 12-G02, missing timezone | In FQ-01 only, replace start with `2032-04-16T00:10` | 3 extracted items, 0 unsupported-line warnings, FQ-01.start = null, FQ-01.end remains 2032-04-16T00:40:00.000Z. Exactly one invalid-start reason for FQ-01, needsReview = true. No inferred UTC or local zone. Only the two fully valid windows are eligible for the timeline. |
| 12-G03, impossible date | Replace FQ-01 start with `2032-04-31T00:10Z` | Same counts and null-start outcome as G02. Preserve the supplied April 31 text for correction; never roll it into May 1. |
| 12-G04, backwards interval | Replace FQ-01 end with `2032-04-16T00:05Z` | 3 items, 0 warnings, one FQ-01 reason that end must follow start, needsReview = true. Retain normalized start 00:10Z and end 00:05Z for review; do not swap them, add a day or draw a valid FQ-01 interval. |
| 12-G05, duplicate identifier | Append one LF followed by an exact copy of source line 1 | 4 extracted items, 0 unsupported-line warnings, needsReview = true. Both FQ-01 source records remain, the appended record has a duplicate-ID reason, and there is no automatic deduplication or supersession. Do not present the duplicate as an additional approved event. |
| 12-G06, non-event line | Append one LF followed by `NOTE/SYNTHETIC training example only//` | 3 events unchanged, 1 unsupported-line warning at line 4, needsReview = true. The note is preserved as source/warning text and creates 0 events. |
| 12-G07, empty input | Replace source text with the empty string; keep source ID | 0 items, 0 warnings; the helper's needsReview = false. The app clearly says no events were extracted and draws no bars. An empty result is not successful coverage of the challenge. |
| 12-G08, fresh change | FP-01 start = `2032-04-15T23:30Z`; end = `2032-04-16T00:10Z` | 3 valid events, 0 warnings/reasons. FP-01 is now 23:30 to 00:10 UTC, still 40 minutes; other events unchanged. Its overlap with FQ-01 is now 0 minutes under end-exclusive intervals. |
| 12-G09, Windows newlines | Replace each of the two LF separators with CRLF | Same three events and instants, zero warnings/reasons. Source length = 316. Entire-line spans become [0,94), [96,208), [210,316); add 1 to every line-2 field offset and 2 to every line-3 field offset. |

## Prove the checker can reject a plausible wrong timeline

| Deliberately wrong synthetic output [R] | Exact rejection reason |
| --- | --- |
| CO-01 plotted at 0055 to 0105 UTC on April 16 | It failed to apply the supplied +01:00 offset |
| FP-01 shortened to end at midnight | It lost 20 minutes and the next-day portion of the source window |
| FQ-01 displayed first because it is the first source line | Source order was mistaken for chronological order |
| PLAN-A or FREQ-SYN-A omitted from the result | A frequency-plan source value was lost even if the time bar looks right |
| G02 gets a valid 0010 UTC start automatically | The input lacks a timezone; the app invented one |
| A result labeled as tested USMTF support | None of these inputs is actual USMTF |

## Human review and what remains thin

[R] The watchstander may inspect and save a synthetic draft timeline. Uncertain input goes to a human for correction while the source remains visible. Review applies to the current input version and is cleared by a source edit. Nothing tunes equipment, changes crypto, launches an evolution, releases orders, or writes an official calendar. Stop processing if prohibited data appear or traceability fails; the reviewer takes the unresolved item to the task owner. Use the main QA work for actual offline/export/review tests rather than treating source inspection as execution evidence.

[A] Actual USMTF field mappings, message versions, amendments, cancellations, ship-address selection, frequency units and time defaults are not established by the published description. An expert must supply an approved synthetic mapping and ground truth before a real-format claim can be judged. The 24-hour presentation, exact offsets and ambiguity behavior are explicit project/test choices. No OCR, numeric frequency validation or operational usability is established here. All generated-app outcomes remain NOT RUN.

## Sources

- [P] https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12. Read the existing capture's ID 12 description and requirements in `Sources/raw/events_norfolk_combined.json`; no live portal recheck.
- [P] [[UseCases/12-electronic-optask-operational-tasking-message-parser-timelin]].
- [E] https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/tools/messages.ts and https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/tools/validation.ts. Read locally, not executed.
- [E] https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/catalog.ts and https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/recipes.ts. Project-specific pilot and recipe checks, not additional published USMTF rules.
- [E] [[Research/Plan/Plan]], [[Research/QA/Static-Findings]], [[Research/QA/Officer/README]].
