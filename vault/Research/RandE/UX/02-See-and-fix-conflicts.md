---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan for a plain schedule comparison with visible constraint failures and direct correction."
---

# 02: See a conflict and correct its input

## Bottom line

[R] Put the proposed time beside the requested time, with the rule that caused a conflict. [R] Start with a readable table and add a small timeline only if it helps. [E] The scheduling helper returns feasible, infeasible or budget_exhausted; these need different messages. [A] This task display is more likely to prove deckplate value than another factory animation, but benefit is unmeasured.

## User's problem

[A] A coordinator cannot judge a plausible-looking calendar without knowing which people, rooms or limits were checked. A red banner with no route to fix the offending request adds work.

## Exactly what they see and click

[R] After Check draft, show this proposed rendering of the Plan fixture. Day-one minute 0 is displayed as 08:00 for illustration, not a real schedule.

| Event | Proposed start | Checked draft | Why |
| --- | --- | --- | --- |
| A | Day 1, 08:00 | Day 1, 08:00 to 09:00 | Fits supplied limits |
| B | Day 1, 08:00; also permits 09:30 | Day 1, 09:30 to 10:30 | Avoids A and leaves P01's supplied 30-minute rest interval |
| C | Day 1, 08:00 | Day 1, 08:00 to 09:00 | Different fictional person and room |
| D | Day 2, 08:00 | Day 2, 08:00 to 09:00 | Within P02's supplied total limit |

[R] Each row has Edit request and Show checked limits. An optional timeline uses text labels as well as color; the table remains available at zoom and by keyboard.

[R] If B only permits 08:00, show No draft fits these inputs and a link to Edit request B. Keep all four requests visible. If search runs out, say Check incomplete: search limit reached, with Ask technical support and Edit inputs. Never offer an override that silently drops rest, qualification or resource limits. These controls preserve the draft and do not publish anything.

## How we would know it worked

[R] Use the Plan's base, fresh-edit, impossible, rest-boundary and exhausted-search cases. Independently compare table, timeline and saved values. Ask four of five participants to identify and correct a conflict within two minutes without help. Test keyboard navigation, 200% zoom and non-color status. [A] Two minutes is a proposed target.

## Build size

[A] Medium: 1.5 to 3 person-hours for a bounded generated app using the existing scheduling semantics, table and correction links. Timeline adds 1 to 2 hours and is cut for Thursday if it delays checks. [R] Thursday rank 2; after-event rank 4 for refinement after user trials.

## Backend needs

[E] harness/tools/scheduling.ts uses fixed assigned people and explicit candidate starts. Successful results have no explanations; unsuccessful explanations are encountered conflicts, not a minimal proof. [R] Adapt results into stable request IDs, checked inputs and validated reasons. Compute the successful comparison from actual assignments and constraints, never invent an explanation. A harness helper is not automatically browser-callable; local task logic needs packaging and independent browser acceptance.

## Dan's frontend

[R] Yes, proposal for Dan in the generated task preview. No change to the factory graph is needed. Dan chooses table/timeline presentation; the backend owner supplies deterministic results and distinguishes invalid input from infeasibility.

## Sources

- [E] 50fcaea: harness/tools/scheduling.ts and the preview components identified in [[Research/RandE/UX/Evidence]].
- [V] Correctable errors with field links: https://design-system.service.gov.uk/components/error-summary/
- [R] [[Research/Plan/Plan]], [[Research/Naval-User/Simplicity-Requirements]].

