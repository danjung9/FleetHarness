---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan to lead with one accepted synthetic task and a clear next action."
---

# 01: Open a useful task and try an example

## Bottom line

[R] Open the accepted training-draft app with Try example as the main action. [R] Let the officer change a request and see a result before navigating factory details. [E] Field Workspace already has Try your tool and hides technical details. [R] Extend that route rather than build another home screen.

## User's problem

[A] A noncoding training coordinator wants to find a conflict, not choose a provider or understand an agent pipeline. The proposed role and its current burden still need user confirmation. [E] Both original interfaces lead through creation; the supplied screenshots contain no working generated task.

## Exactly what they see and click

[R] In the prepared app, show this compact first view using Dan's existing styles:

| Visible element | Proposed content or action |
| --- | --- |
| Heading | Training draft |
| Status | Synthetic example. Not an approved schedule. |
| One sentence | Check four proposed events against the supplied people, rooms and times. |
| Main button | Try example |
| Secondary action | Open saved draft |
| Editable area after Try example | Four requests A to D, fictional P01/P02 and Room-1/Room-2, with permitted starts and supplied limits |
| Next button | Check draft |

[R] Clicking Try example loads data without starting generation. The person edits one permitted start and clicks Check draft, then uses card 02. If no accepted artifact exists, say No checked example available; do not show a fabricated passing result. Keep a small View build evidence route for the demonstrator. For creation, retain the ID 11 catalog linkage and label the limited scope.

## How we would know it worked

[R] Four of five first-time participants reach a checked result within five minutes without coding or account setup, then correctly explain that it is a synthetic draft. Record setup and facilitator help separately. [A] This target comes from Simplicity-Requirements, not measured performance. A fresh input must change the result; a prefilled screenshot fails.

## Build size

[A] Small: 0.5 to 1 person-hour to add sample loading and a clear entry to an existing functional artifact, including a focused check. Building the missing task itself is separate, estimated under card 02. [R] Thursday rank 1; after-event rank 6 for extending the pattern to a second validated job.

## Backend needs

[R] An accepted artifact, versioned synthetic fixture and stable launch/preview target. Reuse FleetAPI.preview for factory preview. The standalone task's sample loading should be local and require no model call. A catalog title alone is not a usable artifact.

## Dan's frontend

[R] Yes, proposal for Dan. Primary work is in the generated app's entry view. An optional launch link belongs in the selected renderer's existing preview. Coordinate artifact ownership with Dan; no src/, CSS or generated app was edited here.

## Sources

- [E] 50fcaea: src/App.tsx, src/studio/Studio.tsx, src/workbench/BuildWorkspace.tsx; screenshots summarized in [[Research/RandE/UX/Evidence]].
- [V] Worked-example pattern: https://support.bolt.new/building/quickstart
- [R] [[Research/Plan/Plan]], [[Research/Naval-User/Simplicity-Requirements]].

