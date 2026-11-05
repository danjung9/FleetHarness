---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A complete proposed use-case page for synthetic training calendar deconfliction, with no invented history, owners or test results."
---

# Use case 11: training calendar deconfliction

## Bottom line

[P] The event catalog asks for weekly shipboard training deconfliction against crew availability: [[UseCases/README]], ID 11. [R] This proposed demonstration would let a training officer inspect conflicts in a fictional calendar and review a draft alternative without writing code. [E] This file is a written mock page; no application, user trial, benchmark or government integration was built or run in this research seat. [R] The next decision is whether to approve this narrow synthetic experiment and assign reviewers.

## At a glance

| Field | Page value |
| --- | --- |
| User | [A] A training officer preparing a calendar for human review. Exact role and current workflow: Not verified. |
| Intended burden reduced | [R] Repeatedly finding and resolving conflicts by hand. Actual burden and hours saved: Not verified. |
| Demonstration scope | [R] Fictional administrative instruction events, generic groups, rooms and trainers. |
| Research status | [E] Catalog and public references read on 2026-11-04; see Sources. |
| Specification status | [E] Proposal in this note, not reviewed or approved. |
| Prototype status | [E] Not verified. No runnable artifact supplied by this seat. |
| Test status | [E] Not verified. No implementation tests executed. |
| User validation | [E] Not verified. No officer walkthrough conducted by this seat. |
| Operational readiness | [E] Not verified. No deployment authority, integration approval or field evidence supplied. |
| Mission owner | [A] Not verified; unassigned role. |
| Technical owner | [A] Not verified; unassigned role. |

## Executive brief

[P] The requested capability is calendar deconfliction, according to the event index. [R] First test whether a deterministic scheduler plus a clear conflict explanation helps a reviewer resolve a small synthetic problem. [R] Keep existing authoritative calendars outside the prototype and export a draft only after human review. [E] No time saving, solution correctness, offline performance or Fleet suitability has been demonstrated here. [R] Approve scope and acceptance criteria before authorizing implementation; require a fresh review before any real data, integration or external sharing.

## What happens today

[P] The catalog identifies the scheduling problem but does not establish an observed local workflow: [[UseCases/README]]. [E] Not verified: which calendar tools the intended officer uses, how long preparation takes, which constraints are mandatory, who can approve changes or how often conflicts occur. [R] Ask the mission owner to describe a permitted fictional example. Do not request a real roster, watchbill or unit schedule for this demonstration.

## Earlier attempts and why they stalled

| Attempt | Supported public finding | Applicability and limit |
| --- | --- | --- |
| C2RAM to UTRM | [V] GAO says the Marine Corps moved C2RAM toward a web platform called UTRM; development and implementation ceased in June 2021 after decisions not to fully fund, implement or support guidance: https://www.gao.gov/products/gao-19-233, recommendation 3 follow-up. | [R] Adjacent training-resource precedent. It motivates an ownership and sustainment gate. It does not establish a failed PB4T scheduling effort. |
| Earlier PB4T automatic scheduler | [E] Not verified. The named catalog and public search in this seat did not establish a specific predecessor, a shutdown or a reason it stalled. | [R] Leave this gap visible. Do not turn a missing search result into a claim that no prior system existed. |

[R] Current follow-through and changes after a historic report must be checked separately. Do not describe the entire current training enterprise as stalled on the basis of one discontinued effort.

## What exists today

| Option | Evidence | What still needs checking |
| --- | --- | --- |
| Navy training resources | [V] A Navy public resource page describes ATG toolbox materials including notional schedules and an ATG portal with TORIS/TFOM: https://www.surfpac.navy.mil/MISC/Modules-2/igpage/86/. | [E] Not verified: current user access, import/export interfaces, automatic deconfliction and suitability for this use case. No authenticated system was opened. |
| A scheduling engine to evaluate | [V] OR-Tools documentation includes employee and resource scheduling examples: https://developers.google.com/optimization/scheduling. | [E] Not verified: installation, chosen algorithm, local execution, performance or compatibility with the proposed interface. |
| Existing local process | [E] Not verified: the intended officer's spreadsheet, calendar or approval process. | [R] Measure that process before claiming improvement or proposing replacement. |

## Rebuild plan for now

1. [R] Agree a small set of hard constraints, preferences and reviewer decisions using the fictional fixture below. Stop if the actual task cannot be represented honestly without sensitive information.
2. [R] Evaluate a local scheduling engine against the fixture. Keep the runtime deterministic; a language model is optional for later explanation and cannot relax constraints.
3. [R] Add a page showing inputs, a draft calendar, unresolved conflicts and source rule IDs. Keep the proposed calendar visibly a draft.
4. [R] Run positive, impossible, malformed-input, cancellation and disconnected cases against an identified artifact. Attach actual outcomes, including failures.
5. [R] Conduct a permitted officer walkthrough. Compare matched tasks against a recorded baseline before any time-saved claim.
6. [R] Stop or narrow if an existing permitted tool already performs the task adequately, constraints remain disputed, or no mission owner accepts the review process.

## Technical specification, proposed and not verified

[R] Inputs: a versioned case containing fictional events, durations, allowed time windows, required generic groups/trainers, room eligibility, capacities, hard constraints and optional preferences. Accept only supplied synthetic fixtures for the initial demonstration. No real file upload or free-text operational details.

[R] Outputs: a draft event-to-time-and-room assignment; a separate list of unresolved conflicts or missing inputs; the case revision, solver identity, execution status, constraint checks and elapsed run time. Output must distinguish an internally checked feasible draft from a proven impossible case and from an unknown result caused by timeout or cancellation.

| Requirement ID | Proposed behavior [R] |
| --- | --- |
| C1 | A group, room or trainer cannot be booked in overlapping events. |
| C2 | An event must fit its duration, allowed window and eligible room capacity. |
| C3 | Hard constraints cannot be silently removed to improve a score or produce a full calendar. |
| C4 | Preferences can be relaxed only visibly; each changed preference is explained. |
| C5 | Missing or invalid fields produce a specific input error. A timeout produces Unknown, not Impossible. |
| C6 | Show a useful conflicting rule set when possible. Do not claim a minimal conflict explanation unless verified. |
| H1 | An officer can reject a draft, edit a preference and request a new draft. No approved calendar is automatically published. |
| H2 | Changing inputs or constraints marks the old draft, results and approval stale. Preserve their history. |
| O1 | The proposed packaged application runs locally after setup with network disabled. This must be demonstrated, including page assets and storage. |
| A1 | Record input and artifact revisions, run status, checks and draft review. No real identity or sensitive content enters demo logs. |
| S1 | Cancel stops a run and prevents export of a partial result as approved. Shutdown terminates the local service. |

[R] Proposed architecture: a local browser interface, input validator, scheduling engine, independent constraint checker and local revision/run store. The browser reads reviewed results from that run. No government system connection or hosted model is required for this narrow runtime design. [E] Implementation, persistence, audit integrity, package portability and offline operation: Not verified.

## Prototype preview: a fictional example

[R] Everything in the following tables is an invented fixture and proposed behavior. These are expected outcomes for future tests, not results from an application.

| Fictional input [R] | Requested start | Duration | Generic group | Trainer | Allowed room |
| --- | --- | --- | --- | --- | --- |
| Instruction A | 08:00 | 60 minutes | Group A | Trainer A | Room 1 |
| Instruction B | 08:00 | 60 minutes | Group B | Trainer A | Room 1 |
| Instruction C | 08:00 | 60 minutes | Group C | Trainer C | Room 2 |

[R] Synthetic fixture assumptions: all three events may start at 08:00 or 09:00 on Demo day 1; both rooms have enough capacity; requested start is a preference. Trainer A and Room 1 are shared by A and B. These are design choices, not facts about any command.

[R] The intended initial warning is that A and B request the same trainer and room at the same time. A proposed feasible draft is:

| Fictional expected draft [R] | Time | Room | Explanation |
| --- | --- | --- | --- |
| Instruction A | 08:00 to 09:00 | Room 1 | Retains its preferred start. |
| Instruction B | 09:00 to 10:00 | Room 1 | Moves one preference to avoid shared-resource overlap. |
| Instruction C | 08:00 to 09:00 | Room 2 | Uses separate group, trainer and room. |

[R] A and B could swap order; the reviewer should not infer a unique optimal answer. The planned display would show which preference changed and require acceptance before local draft export.

[R] Impossible variant: allow A and B to start only at 08:00, keep both mandatory and require the shared trainer and room. The intended behavior is to explain the conflict and produce no valid draft. The program must not invent an additional trainer, drop an event or quietly move a hard time constraint.

[E] Launch prototype: Not verified; no launch target. [E] Artifact revision: Not verified. [E] Installation instructions: Not verified. [R] Keep a launch control disabled until an actual artifact is attached.

## Test results

[E] Overall result: Not verified. No implementation was executed. The table below is an acceptance plan; it does not report passes.

| Planned test [R] | Expected observation [R] | Actual result [E] |
| --- | --- | --- |
| Shared-resource fixture | Checker confirms no room, trainer or group overlap; changed preference is visible. | Not verified, not run. |
| Impossible variant | No valid draft; conflicting hard constraints remain visible. | Not verified, not run. |
| Invalid duration or missing resource | Specific validation error before scheduling. | Not verified, not run. |
| Forced timeout | Unknown status with no false impossibility or success claim. | Not verified, not run. |
| Edit after review | Previous approval and results become stale. | Not verified, not run. |
| Disconnect network | Packaged page, scheduler and result review work locally. | Not verified, not run. |
| Cancel and shutdown | Run stops; no approved partial output; local process terminates. | Not verified, not run. |
| Officer walkthrough | Reviewer identifies the conflict, changed preference and unverified claims without code. | Not verified, not conducted. |

[R] Future evidence must name artifact revision, fixture revision, environment, command or user steps, expected and actual outcomes, duration and failures. Require the independent checker to evaluate returned assignments. Do not count agreement between two generated narratives as a software test.

[E] Time saved, solve time, error rate, retention of offline edits, user acceptance and operational validity: Not verified.

## Research questions for the reviewer

[R] Ask: Which constraints are mandatory? Is draft export useful? Which existing tool already covers this? What can be tested with public or invented data? Which role can accept a trial? [E] Embedded research chat: Not verified; no chat application supplied. [R] Any later chat must cite approved sources, expose uncertainty and remain unable to approve a build or alter a calendar.

## Human authority and safe use

[P] Rule 4 excludes classified, CUI, operationally sensitive, PII, export-controlled and nonpublic government data unless specifically vetted or approved: [[Event/Rules]]. [R] Do not enter real rosters, watchbills, unit training schedules, readiness states or personal availability. Do not aggregate public details into a sensitive picture of units, dependencies or shortfalls. Public availability does not make a combined operational picture appropriate for this page.

[R] Approval points: requirements, bounded build, draft review and each proposed external action. Prohibited actions: government system writes, calendar publication, messages, permission changes and unapproved data collection. Monitor inputs, constraints, artifact versions, runs and failures. Escalate unexplained outputs to the mission and technical owner roles, both currently unassigned. Cancel or shut down when scope, data or behavior departs from the approved experiment.

## Path to Fleet

| Gate | Proposed next experiment and resources [R] | Honest status |
| --- | --- | --- |
| Before Thursday 2:00 PM EST | Assign a reviewer and implement one synthetic flow, plus checker and actual run evidence. | [E] Build, reviewer and completion commitment Not verified. |
| 30 days | Confirm mission and technical owners; conduct permitted workflow interviews; record baseline, constraints and data review. Needs reviewer time and an approved local environment. | [A] People, resources, access and approvals Not verified. |
| 60 days | If authorized, compare against the baseline in a nonproduction setting; test local packaging, disconnection, support and permitted exchange formats. | [A] Trial site, integration interface and authorization path Not verified. |
| 90 days | Decide integrate, pilot, revise or stop using recorded evidence. Establish sustainment, security review and any required fielding approvals. | [A] Sponsor, funding, sustainment and deployment permission Not verified. |

[R] Success would mean fewer manual conflict-resolution steps without a hard-constraint violation, measured against a matched baseline and accepted by the designated reviewer. Targets, measurement method and acceptable burden reduction need owner agreement; no numeric benefit is claimed here.

## Sources

- [P] [[UseCases/README]], ID 11, read 2026-11-04.
- [P] [[Event/Rules]], especially rules 3, 4, 6, 9 and 11.
- [P] [[Event/Judging]].
- [P] /Users/mukul/Documents/CDAO/FleetHarness/README.md, read 2026-11-04.
- [V] https://www.gao.gov/products/gao-19-233, recommendation 3 follow-up; accessed 2026-11-04. Adjacent history only.
- [V] https://www.surfpac.navy.mil/MISC/Modules-2/igpage/86/, ATG resource description; accessed 2026-11-04. No authenticated portal accessed.
- [V] https://developers.google.com/optimization/scheduling, scheduling overview; accessed 2026-11-04. Candidate technology only.
