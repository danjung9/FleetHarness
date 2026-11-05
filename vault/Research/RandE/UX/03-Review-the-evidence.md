---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan for expected-versus-actual evidence tied to the version being accepted."
---

# 03: Review the result against concrete checks

## Bottom line

[R] Show the reviewer what was tried, what should happen and what actually happened. [R] Keep generated-app acceptance separate from reviewing a training draft inside that app. [E] Current factory screens show aggregate tests and a free-text human review, not per-case acceptance records. [R] Thursday can use a clearly labeled manual checklist on the final artifact; automated enforcement needs a backend contract.

## User's problem

[A] A green test count does not tell an officer whether the app retained every request, handled a conflict or saved their work. “Approved” can also be mistaken for permission to issue an official schedule.

## Exactly what they see and click

[R] In the factory's existing Review view, add a compact table:

| Check | Expected | Observed | State |
| --- | --- | --- | --- |
| Four fictional requests | Each appears once | Reviewer records result | Not checked initially |
| Conflicting request | Draft refused, inputs retained | Reviewer records result | Not checked initially |
| Save and reopen | Same inputs and reviewed version | Reviewer records result | Not checked initially |

[R] Clicking Try this check opens the current preview and a short instruction; it does not mark the case passed. The reviewer selects Pass, Fail or Not checked and records the observation. Automated results and human observations have separate labels. Show artifact version, check time and missing coverage. A failed or unrun required check keeps the proposed Accept prototype control unavailable.

[R] Inside the training app, use the different label Mark this draft reviewed. Show the four request values, warnings and Edit links immediately before this action. It permits saving a reviewed synthetic draft only. A subsequent edit clears that record and displays Changed since review.

## How we would know it worked

[R] Deliberately supply wrong output and verify the reviewer rejects it. Change one byte of the accepted app and require fresh factory acceptance; edit a request and require fresh draft review. A participant must explain which approval saves a prototype and which reviews a data record. [R] Do not claim service enforcement if Thursday uses a manual procedure.

## Build size

[A] Small Thursday slice: 0.75 to 1.5 person-hours for task-review invalidation plus a manual final-artifact checklist carried in existing review notes. Medium later slice: 4 to 8 hours for structured cases, UI and backend enforcement. [R] Thursday rank 3; after-event rank 2.

## Backend needs

[E] shared/types.ts TestReport contains aggregate counts and sourceHash. electron/main.ts validates evidence before prototype approval and resets approval when requirements change. [R] Future acceptance needs case ID, fixture version, expected/actual, evidence origin, result and artifact hash, stored outside candidate write authority. The service must enforce required cases and version matching. The generated app separately needs input/result revision and review invalidation. No identity or command-approval system is assumed.

## Dan's frontend

[R] Yes, proposal for Dan. Extend the selected renderer's existing review component and the task app's review panel. Do not build a new dashboard. Relabel Studio's host test output to identify agent-authored tests; reserve independent acceptance for genuinely separate checks.

## Sources

- [E] 50fcaea: src/App.tsx Evidence, src/studio/Studio.tsx BuildWorkspace, src/workbench/BuildWorkspace.tsx, shared/types.ts and electron/main.ts.
- [V] Review and correction before submission: https://design-system.service.gov.uk/patterns/check-answers/
- [R] [[Research/Plan/Plan]], [[Research/Naval-User/Simplicity-Requirements]].

