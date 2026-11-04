---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan for prefilled task questions and a plain review of scope before a build starts."
---

# 05: Check a short brief before creating a tool

## Bottom line

[R] Ask about the job, its inputs and what a good result looks like. [E] Field Workspace already reduces intake to a short request, so do not recreate that work as a wizard. [R] Add a useful synthetic starting point and a compact scope check before creation. [R] Keep optional detail available without making it look mandatory.

## User's problem

[A] A noncoding sponsor knows the work but may not know how to write software requirements, choose architecture or describe a deliverable. Repeated long-form sections can prevent a usable request from being saved.

## Exactly what they see and click

[R] Choose the existing training challenge, then Use synthetic example brief. Show editable answers in three groups on one page:

| Prompt | Proposed prefilled answer |
| --- | --- |
| What are you trying to do? | Prepare a draft from four fictional training requests. |
| What information and limits apply? | Supplied people, rooms, qualifications, permitted times and rest limits; no real personnel data. |
| How will you check it? | Keep every request, identify conflicts, review changes and reopen a saved draft. |

[R] Each group has Change. A short diagram shows Requests > Check constraints > Person reviews > Save draft, with an equivalent text list. Additional detail is collapsed. Next opens Check this request: input, output, limits, responsible reviewer role and acceptance checks. Selecting Edit returns to that exact field with the draft retained.

[R] Before Create tool, show what the worker may do, what leaves the device, whether usage may be charged, and what Stop can currently guarantee. Permit Cancel without starting anything. Approval here authorizes creation within the shown scope, not publication or official use. Configure access through the authorized technical operator; nobody enters another person's credentials.

## How we would know it worked

[R] Four of five participants save a complete request in three minutes and correct one wrong assumption. They can identify prohibited actions and the human review point. Cancel starts zero runs; confirm starts exactly one. Reopen after interruption and compare the saved answers. [A] Targets are proposed, not observed.

## Build size

[A] Small: 1 to 2 hours for a prefilled short brief and scope/consent view using existing fields. A full adaptive interview or new multi-page wizard is deferred. [R] Thursday rank 6, only if demonstrating creation; after-event rank 5.

## Backend needs

[R] Reuse NewProject title, description, criteria and challengeId. Preserve the ID 11 linkage and original source requirements while labeling the narrower example scope. Persist the displayed brief before start; do not silently transform it after confirmation. Enforced consent tokens or a true pause after model planning would require additional backend work and are not claimed for this slice.

## Dan's frontend

[R] Yes, proposal for Dan in the selected BriefEditor and start control. Reuse the original start disclosure; cover both Studio start paths if Studio is chosen. Workbench's existing short form is the starting point, not an invitation to restyle it.

## Sources

- [E] 50fcaea: src/studio/brief.ts, src/studio/Studio.tsx, src/App.tsx, src/workbench/BriefEditor.tsx and shared/types.ts.
- [V] Plan review: https://docs.lovable.dev/features/plan-mode and https://docs.replit.com/features/agent/plan-mode
- [V] Diagram of roles and work: https://learn.microsoft.com/en-us/power-apps/maker/plan-designer/process-diagram
- [V] Correct before confirming: https://design-system.service.gov.uk/patterns/check-answers/

