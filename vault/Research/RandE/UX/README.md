---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Nine ranked proposals for Dan, grounded in 50fcaea, supplied screenshots and public product documentation."
---

# FleetHarness UX proposals for Thursday and after

## Bottom line

[R] For Thursday, put one accepted synthetic training-draft tool in the officer's hands: Try example, Check draft, correct a conflict, review and save. [E] At 50fcaea, Field Workspace already has a task-first path and the original interfaces already expose standalone application download. [R] Build on those changes rather than redesign the frontend. [A] The benefits, build estimates and user targets here are hypotheses; no new runtime or user test was performed.

## Decision for Dan

[R] All visual ideas below are proposals for Dan, who owns the frontend. No code or CSS was changed. Select the existing interface that contains the accepted, rehearsed run; do not migrate stores or merge renderers before submission. Open the actual task app first, with factory evidence available afterward. Use Field Workspace only after its actual route is rehearsed; its existence is not test evidence.

[R] The proposed user is a training coordinator preparing a draft and a reviewer checking it. This follows [[Research/Plan/Plan]]; it is a proposed partial ID 11 demonstration, not a claim of full challenge completion, organizer approval or proven user demand. A sponsor creating software and a Sailor using that software have different tasks. Cards 01 to 04 primarily improve the task and its acceptance; 05 to 09 address creation, recovery and later expansion.

## Rank for Thursday, November 5, 2 PM EST

[P] [[Event/Judging]] weights impact 30%, speed to Fleet 20%, scalability 20%, barrier removal 15%, and judges' discretion 15%. [R] Prioritize direct task evidence and recoverable use because impact plus speed represent half the weight. Then consider dependencies, review capacity and deadline risk.

[A] H/M/L below rate the proposal's potential contribution if demonstrated: H directly supports the criterion, M enables it, L has limited near-term evidence. They are not predicted judge scores, measured gains or an additive scoring formula. Scalability needs replication evidence; a reusable-looking screen alone does not establish it. Build sizes are active person-hours including focused technical checks, assuming familiarity with the code and an available accepted build route.

| Rank | Idea card | Thursday choice | Impact 30 | Speed 20 | Scale 20 | Barriers 15 | Discretion 15 | Estimated size [A] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [01: Try a task](01-Try-a-task.md) | Core. Makes the useful result discoverable; reuse Workbench's preview path. | H | M | M | H | H | 0.5 to 1 h |
| 2 | [02: See and fix conflicts](02-See-and-fix-conflicts.md) | Core. Table and direct correction before a timeline. | H | M | M | H | H | 1.5 to 3 h; timeline extra |
| 3 | [03: Review the evidence](03-Review-the-evidence.md) | Core. Manual final-artifact checklist and task-review invalidation; defer structured service gate. | H | M | M | M | H | 0.75 to 1.5 h |
| 4 | [04: Save and reopen](04-Save-and-reopen.md) | Core. Prove the delivered app and draft-data round trip. | M | H | M | H | H | 1 to 2 h |
| 5 | [06: Know what is happening](06-Know-what-is-happening.md) | Conditional gate for live creation. Truthful Stop and recovery before any extra animation. | M | M | M | M | H | 1 to 2 h UI; backend extra |
| 6 | [05: Check a short brief](05-Check-a-short-brief.md) | Conditional for creation demo. Use prefilled existing intake; reuse start disclosure. | M | L | M | H | M | 1 to 2 h |
| 7 | [07: Preview an import](07-Preview-an-import.md) | Defer. Removes re-entry but expands the validation surface. | H | L | M | H | M | 4 to 8 h |
| 8 | [09: Compare versions](09-Compare-and-recover-versions.md) | Defer. Valuable recovery needs a version contract, not just a new tab. | M | M | H | M | M | 6 to 12 h |
| 9 | [08: Point to a change](08-Point-to-a-change.md) | Cut. Attractive interaction, but depends on versioning and isolated preview targeting. | M | L | M | M | H | 8 to 16 h |

[R] Core scope is cards 01 to 04 together, with a table, a prepared synthetic example, manual acceptance evidence and portable draft data. [A] Their estimates total 3.75 to 7.5 active person-hours for the bounded slices. Add 1 to 2 hours for formative user sessions and rehearsal, plus provider/setup and unrelated failures. These overlap the existing Plan's artifact work; they are not a second additive project or a commitment from Dan.

[R] If a checked artifact already implements a card, verify and record it instead of rewriting it. If effort exceeds the timebox, remove the timeline, general import and factory polish. Do not remove correctness, explicit review or saved-draft recovery to preserve an animation. Use the Plan's conflict-checker fallback if automatic scheduling is not accepted. Freeze optional frontend changes by Thursday 10 AM, as proposed in the existing interface recommendation, leaving time for evidence and submission.

[R] Cards 05 and 06 become prerequisites if the demo includes creating a tool. Otherwise show a clearly identified earlier accepted build and its evidence. A manual stop procedure and checklist must be described as manual; no software-enforcement claim follows.

## Rank after the deadline

[R] Revalidate these priorities with actual users and failure evidence. This order assumes the Thursday core exists; it is a hardening and expansion sequence, not a recommendation to implement every idea.

| Rank | Card | Next investment and evidence needed |
| --- | --- | --- |
| 1 | [04: Save and reopen](04-Save-and-reopen.md) | Prove interruption recovery and precise offline capabilities on intended endpoints. Future synchronization remains a separate scope. |
| 2 | [03: Review the evidence](03-Review-the-evidence.md) | Add structured, independently owned cases and service-enforced version binding. Identity/authority integration needs its own approved scope. |
| 3 | [06: Know what is happening](06-Know-what-is-happening.md) | Prove stop acknowledgment, recovery and operator shutdown across failures. |
| 4 | [02: See and fix conflicts](02-See-and-fix-conflicts.md) | Refine explanations and visual comparison from observed correction errors; add a timeline only if it helps. |
| 5 | [05: Check a short brief](05-Check-a-short-brief.md) | Test whether prefilled task questions outperform the existing short request form. |
| 6 | [01: Try a task](01-Try-a-task.md) | Add a second validated job only after the first demonstrates net burden reduction. |
| 7 | [07: Preview an import](07-Preview-an-import.md) | Advance earlier if measured repeated entry dominates the job; start with one public/synthetic schema. |
| 8 | [09: Compare versions](09-Compare-and-recover-versions.md) | Provide immutable history and data-compatible recovery before richer change interactions. |
| 9 | [08: Point to a change](08-Point-to-a-change.md) | Trial selection-based change requests after version recovery and review are dependable. |

## Evidence to show judges

[R] Use [the test protocol](Test-Protocol.md) and report failures as well as passes.

| Judging criterion [P] | Demonstration evidence [R] |
| --- | --- |
| Impact, 30% | Same synthetic task with and without the tool. Count active preparation, correction and review time plus critical errors. Report raw observations; no invented hours saved. |
| Speed to Fleet, 20% | Reopen the exact delivered artifact without network, edit a fresh case and recover saved data. Separately document setup and remaining authorization/deployment work. |
| Scalability, 20% | Show the schema, reusable task pattern and maintainer instructions. Claim only the cases/endpoints actually tried; do not claim fleet-wide use from a catalog count. |
| Barrier removal, 15% | Count repeated fields and help requests. Show a recoverable draft; measure import only if card 07 is actually built. |
| Judges' discretion, 15% | A readable result, keyboard path, correction, honest limits and human review tied to evidence. |

## Shared interaction requirements for Dan

[R] Retain his existing visual language. Every primary action needs a visible text label, keyboard access and a predictable focus destination. Status needs text as well as color. Test the main path at 200% zoom; keep the table available when a timeline is shown. An error should explain what happened, preserve inputs and point to the field to correct.

[R] Keep synthetic-data status, allowed/prohibited actions, the actual human review point, monitoring, escalation and shutdown visible at the relevant step. The event task cannot send messages, publish a schedule or modify official systems. Do not add a role badge that implies real identity or approval authority.

[R] Treat provider setup as a technical-owner task without hiding its effect: creation may use a network service, the provider receives the disclosed context, and charges or allowance use may apply. A prepared task app should not need a model account to edit and validate its supplied local data.

## Read next and unresolved evidence

- [E] [Evidence](Evidence.md) compares both requested interfaces, seven screenshots and the new Workbench overlap, with full public sources.
- [R] [Test protocol](Test-Protocol.md) defines the proposed formative session and failure checks.
- [E] [Local research log](Sprint/Research-Log.md) stages tool, friction and prior-work disclosure for central transcription.
- [E] [Session handoff](Sessions/2026-11-04-ux-ideas.md) records asked, done, verification and next actions.

[E] Relay files and reports appeared at the final recheck and were read. The gate summary reports 128 passed, zero failed at 50fcaea; it supplies no desktop, live-provider, packaging or usability result. The director directive remains absent. Actual users, accepted generated artifact, offline reliability and build estimates are not verified. Final coordination details are in the session handoff; Dan's work outside the inspected snapshot remains unknown.

## Sources

- [P] [[Event/Judging]], [[Research/00-Brief]]; deadline in [[Research/Plan/Plan]].
- [E] Pinned code, local read only: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe
- [E] [[Research/Plan/Test-Results]], [[Research/Interfaces/Recommendation]].
- [R] [[Research/Naval-User/Simplicity-Requirements]].
- [V] Product and design documentation URLs are in [Evidence](Evidence.md) and each card; documented patterns are not comparative usability evidence.

