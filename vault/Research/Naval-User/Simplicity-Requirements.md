---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Evidence-linked, testable usability and resilience targets for the officer-facing intake and generated applications."
---

# What simple must mean

## Bottom line

[R] Simple means an officer can reach a useful, reviewable result with little setup, preserve work through an interruption and understand what still requires approval. [V] Survey evidence establishes admin frustration and constrained attention, while maintenance evidence establishes repeated entry and reconciliation (S1 to S3). [R] Translate those findings into measured completion, correction and recovery targets. [A] Every numeric target below is a proposed acceptance criterion, not a Navy standard or a result already achieved. [R] Test the officer-facing intake separately from the applications FleetHarness generates.

## Evidence versus inference

| Basis | What the evidence supports | Design inference [R] |
| --- | --- | --- |
| [V] SWO survey reporting identifies dissatisfaction with administrative requirements (S1). | There is documented user friction. | Minimize repeated input and measure net labor across author and reviewer. |
| [V] GAO's 2020 officer survey found inadequate sleep was common (S2). | Attention and fatigue matter to usability. | Keep the task visible, preserve interrupted work and provide clear recovery. |
| [V] GAO documents fragmented maintenance software and repeated reconciliation (S3). | Another isolated record store can add burden. | Reuse existing inputs and provide a usable handover/export, with ownership explicit. |
| [V] Navy routing guidance names signature and release authorities (S4). | Drafting and release have accountable owners. | Make draft, reviewed, approved and released visibly different states. |
| [P] Event rule 9 and cases 36 and 37 require disconnected operation or fielding evidence. | Resilience is part of the event requirement. | Test a cold start without connectivity, persistence and conflict recovery. |
| [V] The iLoc team lead reports successful offline browser tools built near users (S5). | A publicly documented precedent exists. | Consider a small local package. This is not evidence it will be authorized on every endpoint. |

## Officer-facing FleetHarness intake

[P] The project README describes a software development pipeline, with human review and applications that may have different architectures. [R] The user-facing flow should ask about the work, demonstrate behavior and capture acceptance decisions. Technical owners should handle infrastructure selection behind that flow.

| ID | Proposed requirement [R] | Reproducible acceptance check [R] |
| --- | --- | --- |
| I1 | Describe a need in at most 3 minutes using role, task, synthetic input, desired output, reviewer and connectivity needs. | Five representative users each complete the intake without explaining a framework, agent, database or programming language. At least four finish within 3 minutes without help. Treat five users as a formative screen, not a representative survey. |
| I2 | Provide a supplied synthetic example and editable task template. No blank prompt is required. | A user opens the template, selects a sample and corrects an incorrect assumption without entering code. |
| I3 | Show a plain-language specification before building. | User can identify the input, output, prohibited actions, approval role and pass/fail criteria on one screen. All five must be visible or directly expandable. |
| I4 | Show honest progress and evidence. | Labels distinguish specified, building, runnable, tested and pilot-approved. A failed test prevents a tested claim. Pilot approval requires an actual approval reference, which the event demo lacks. |
| I5 | Permit cancellation and recovery. | Cancel a synthetic build; show what stopped, preserve accepted requirements and expose any failure to stop a running job. No queued publication or external action proceeds after cancellation. |

[A] A first working application within minutes is not established by this research. [R] Avoid confusing quick intake or first preview with a tested and authorized capability.

## Generated application's first-result and review requirements

| ID | Proposed requirement [R] | Reproducible acceptance check [R] |
| --- | --- | --- |
| U1 | First useful result within 5 minutes of first launch, including sample loading. | Four of five first-time users reach a source-backed draft action list, a validated form or a feasible schedule. A decorative dashboard does not count. Record setup time separately if installation is required. |
| U2 | At most 10 minutes of orientation and no coding. | After a short guide, users complete the main task and recover from one error without developer intervention. Record every request for help. |
| U3 | Reuse a supplied input rather than retype it. | Import a synthetic text/CSV/PDF fixture supported by the selected app; retain the original; export approved fields. Count manual re-entry of each repeated field. |
| U4 | Show progress within 1 second and permit cancellation of long processing. | Run a fixed synthetic fixture on a recorded test machine. No unresponsive wait is allowed. A long-running task displays its state and preserves inputs if cancelled. |
| U5 | Make evidence available beside a proposed result. | Every extracted action and deadline has a source identifier and source span. Missing, ambiguous or conflicting values remain marked for review. Unsupported fields are not fabricated. |
| U6 | Make approval and correction explicit. | Reviewers can accept, edit, reject or return an item. Editing an approved record invalidates its prior approval or creates a new version requiring review. |
| U7 | Remove work after review costs. | On matched synthetic tasks, target at least 30% lower median total active person-minutes with no increase in missed required items or critical errors. Include preparation, review and reconciliation. This target is a hypothesis. |
| U8 | Give a reason for an impossible schedule. | Supply a contradictory synthetic case. App returns infeasible and identifies conflicting inputs rather than silently dropping a hard constraint or publishing a calendar. |
| U9 | Preserve a usable output outside the app. | Export the selected workflow's CSV, printable document or approved interchange format; a second user verifies it without an account on the prototype service. Export does not mean official submission. |

[R] Report extraction precision and recall on a fixed labeled set, alongside review time and critical misses. Do not promote a high overall accuracy percentage that hides missed mandatory actions. [R] Validate solver constraints deterministically; a language model's plausible calendar is not a constraint check. [A] No accuracy, speed or labor-reduction target has been tested in this seat's research.

## Disconnected and interrupted behavior

| ID | Proposed requirement [R] | Reproducible acceptance check [R] |
| --- | --- | --- |
| D1 | Complete the declared offline core with every runtime dependency local. | After permitted installation and provisioning, cold-start with all network interfaces disabled and model endpoints unavailable. Load a fresh synthetic input, edit, validate, save, close and reopen. Declare precisely which functions pass. |
| D2 | Preserve acknowledged saves. | Create 100 synthetic edits, terminate and restart the app at varied points. Recover every edit for which the app displayed saved. Work not acknowledged as saved must be identified honestly. |
| D3 | Distinguish saved locally, pending upload, synchronized and conflict. | Observe each state during a simulated outage and reconnect. A green synchronized state requires a server acknowledgment. |
| D4 | Synchronize without duplicates or silent overwrite. | Two fictional users edit the same record while disconnected. Reconnect, repeat upload three times and interrupt once. Preserve both conflicting versions for review and create no duplicate accepted transaction. |
| D5 | Stop outbound activity on explicit command. | Pause synchronization while the test network is available; inspect outbound traffic and retry logs for zero attempted transmissions, including telemetry and model calls. Repeat with the network disabled. Resume only through the authorized control. |
| D6 | Expose stale information. | Display source version, last successful update and pending changes offline. A synthetic expired reference produces a visible warning rather than a current-status claim. |
| D7 | Remain useful when optional inference is unavailable. | Disable the model service. Existing reviewed records, manual entry, validation and export remain available. Unsupported new inference reports unavailable and preserves the input. |

[R] Distinguish single-device offline mode from a local server without shore connectivity. A demonstration of the second does not prove the first. [A] The proposed 100-edit and retry tests are engineering fixtures, unrelated to a real unit's workload or communications pattern.

## Control, accessibility and support

| ID | Proposed requirement [R] | Reproducible acceptance check [R] |
| --- | --- | --- |
| C1 | Use only public blank materials or wholly synthetic fixtures for this event. | Fixture manifest identifies provenance and fictional status. No real messages, rosters, casualty status or personal records are included. A data notice cannot itself guarantee detection of prohibited information. |
| C2 | Keep consequential external actions behind the proper human authority. | Drafting cannot send messages, mark maintenance complete, approve funds or publish a schedule. In a future authorized integration, a reviewer sees the exact changed version before committing. |
| C3 | Record who reviewed which version and what changed. | Synthetic audit trail contains role, action, record/version and timestamp; viewers can reconstruct a correction and return. Mock event roles are clearly labeled and are not represented as CAC authentication. |
| C4 | Provide a stop control and escalation path. | A user can stop processing/sync, retain a local draft and read what to do next. A technical owner can disable the service and restore the last tested package in an isolated rehearsal. |
| C5 | Support keyboard use, readable text and status beyond color. | Complete the principal flow without a mouse; use 200% browser zoom; identify every status through text. Treat this as an initial usability check, not a formal accessibility certification. |
| C6 | Support handover to a new maintainer. | A second technical person follows the package instructions to build, launch, test and roll back in a clean authorized test environment. Record dependencies and failures. |
| C7 | Enforce approval permissions in the service as well as the screen. | A synthetic originator cannot approve or release their own package through a direct request when the configured rules require another role. An unauthorized user cannot read another role's restricted test records. Document that these checks do not establish production identity integration. |

## Evidence sheet for the demonstration

[R] Record application version, fixture version, hardware and browser, setup time, number of users and cases, task completion, active preparation/review minutes, errors, offline functions, recovery results and known failures. Report every criterion as passed, failed or not run. [R] Show a live network-disconnected task and a correction during the demo. [P] This directly supports the impact, speed-to-Fleet and barrier-removal criteria in [[Event/Judging]].

## Sources

- [V] S1, USNI News, June 19, 2023, survey reporting: https://news.usni.org/2023/06/19/surface-warfare-tackles-persistent-problems-as-more-than-half-of-jos-say-they-dont-want-command
- [V] S2, GAO-21-366, May 2021: https://www.gao.gov/products/gao-21-366
- [V] S3, GAO-24-106525, September 2024: https://www.gao.gov/assets/880/872778.pdf
- [V] S4, NETCSTAFFINST 5216.1H, January 27, 2025: https://www.netc.navy.mil/Portals/46/NETC/staff%20inst/52161H.pdf
- [V] S5, War on the Rocks, firsthand development account, February 27, 2020: https://warontherocks.com/fixing-the-navys-software/
- [P] Local project README, read November 4, 2026, at `/Users/mukul/Documents/CDAO/FleetHarness/README.md`; [[Event/Rules]], [[Event/Judging]], [[UseCases/36-paperless-underway]], [[UseCases/37-sailor-built-to-fleet-fielded]].
