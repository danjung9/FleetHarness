---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Five bounded workflows offer the strongest balance of observable value, deadline feasibility and honest validation."
---

# Top candidates for an officer-facing demonstration

## Bottom line

[R] Start with ID 24, then ID 11, then one narrow ID 36 workflow if the team can support three experiments. [R] Keep IDs 14 and 18 as strong alternatives when a readiness or cyber subject matter expert can own the acceptance scenario. [A] This shortlist favors understandable task outcomes, synthetic inputs, local execution and evidence that can be collected before the November 5, 2:00 PM EST submission deadline stated in [[Research/00-Brief]]. [R] Treat the five as choices, not a commitment to build five applications by that deadline.

## Selection basis

[P] Impact and Speed to Fleet together account for half the judging weight in [[Event/Judging]]. [A] A naval officer is more likely to assess value from a completed familiar task than from generated repository counts; that user preference has not been interviewed or measured here. [R] Demonstrate the original burden, the assisted task, the human decision and a measured result. [R] Use synthetic data throughout, with an answer key prepared independently of the implementation.

[A] These recommendations assume a small team can implement a bounded local application with its current tools. [E] This review did not run the applications, obtain new datasets or interview owners. [R] Freeze a candidate only when someone can state the correct outcome, supply safe examples and review the result before submission. [A] A named resource in a participant proposal is not proof of available access.

| Priority | Candidate | Officer-visible result | Minimum finishable scope | Why selected |
| --- | --- | --- | --- | --- |
| [R] 1 | [P] ID 24, command-specific task/event extraction | [R] See what the command owes, when and which role should coordinate it, beside the source text | [R] One command, invented traffic, typed extraction schema, review and export; no live routing | [A] Narrow measurable burden, no enterprise connector prerequisite, reusable parsing template |
| [R] 2 | [P] ID 11, PB4T training deconfliction | [R] See a feasible training week or a precise reason no feasible week exists | [R] Small synthetic roster and three department proposal interfaces, shared hard-constraint solver and human-approved calendar | [A] Clear correctness checks, a distinct software engine and readily visible personnel conflicts |
| [R] 3 | [P] ID 36, Paperless Underway | [R] Complete a form without connectivity and see it safely reach a receiver after reconnection | [R] One selected form, typed entry, validation, local review, durable save and retry-safe transfer | [A] Broad administrative reuse, tangible fewer re-entry steps and direct DDIL evidence |
| [R] 4 | [P] ID 14, readiness consequence assistant | [R] See which dependency controls the outcome, how much mission margin remains and what is unknown | [R] One small synthetic dependency graph, deterministic timing, source-linked explanation, human review and stop | [A] Strong command relevance and explicit baseline/authority requirements, but higher model-validation burden |
| [R] 5 | [P] ID 18, cyber watchstander handoff | [R] Turn one alert into a reviewed evidence-linked handoff another watchstander can use | [R] One synthetic endpoint incident, local playbook, correlated timeline, uncertainty and exportable approved summary | [A] Bounded workflow, no live operational network needed, measurable completeness and review burden |

## 1. ID 24: Make missed tasking visible

[P] The submission requires extraction of command-specific tasks, events and correspondence, plus the correct coordinating command role; response drafting and calendar conflict checks are optional. [R] Put source text and candidate action rows on the same screen, with command, due time, role and evidence span visible. [R] Let the officer reject an item, correct the role and approve the action list; do not send messages or assign real personnel.

[R] Build a corpus with multiple commands, ambiguous dates, a cancellation, a repeated message and a negative example with no task. [R] Measure correctly retained required tasks, false assignments, time to verified action list and corrections per message against manual review. [R] Include an unseen variant so a scripted example cannot masquerade as general extraction.

[A] The main failure is a plausible-looking missed task or incorrect recipient. [R] Show unresolved items explicitly and require human review. [R] Use ID 12 as a format-specific alternative if an owner prefers an OPTASK timeline and can supply safe format examples. [A] A successful ID 24 task list alone does not satisfy ID 12's frequency/changeover/timeline requirements.

## 2. ID 11: A schedule that admits when it cannot work

[P] The submission names operating windows, qualified personnel, fatigue policies, training periodicities and departmental negotiation. [R] Use invented role-holders and synthetic policy values until the relevant policy interpretation is verified. [R] Show the existing conflict, a proposed correction and the constraints that justify it; keep the officer responsible for accepting the calendar.

[R] Test a feasible week, a deliberately impossible week, an unavailable qualified watchstander and a late window change. [R] Verify every hard constraint independently and report unscheduled requirements. [R] Compare collisions, unmet periodicities, planning time and manual edits with a human-produced baseline. [A] Simple departmental proposal components are feasible in a narrow prototype; a full autonomous negotiation system may exceed the deadline.

[A] The main failure is a calendar that looks balanced while silently relaxing a hard rule. [R] Require an explicit explanation for infeasibility and human authorization for changes to preferences. [R] Drop optional interfaces before dropping correctness checks.

## 3. ID 36: Finish one paperwork loop while disconnected

[P] The submission offers forms/documents and tasking/records tracks. [R] Select a single form with known public format rules; use invented field values and role labels. [R] Demonstrate typed capture first and disclose that this omits handwriting extraction in Track A. [R] Show validation, human review, saved state, queued transfer, receiver acknowledgement and an inspectable audit history.

[R] Close and reopen the application offline, reconnect twice, lose an acknowledgement and create a conflicting edit. [R] Verify that work survives, the receiver accepts one transaction and conflicting versions remain available for review. [R] Compare repeated data entry, completion time and correction count to the manual workflow.

[A] The main failure is silent data loss or duplicated submission after retry. [R] Prove durable save and idempotency before adding AI intake. [R] Use ID 45 as the next reusable module for large files and scarce bandwidth. [A] A local web prototype does not establish government-device installation or low-code platform compatibility.

## 4. ID 14: Explain the controlling constraint

[P] The full submission distinguishes the current constraint, upstream slack, mission margin, future readiness risk and missing information. [R] Create one invented maintenance-to-part-to-qualified-team-to-mission dependency graph with checked arithmetic. [R] Show a part delay that consumes slack without changing mission readiness, then a delay that changes the controlling path. [R] Let the officer inspect assumptions and reject a proposed option.

[R] Measure time to identify the controlling constraint and correctness against an independently calculated answer key, then compare to manual review. [R] Include stale data, a missing duration and two competing paths. [R] Keep timing deterministic; any generated explanation must cite the computed values and avoid unsupported causal claims.

[A] The main failure is a compelling but invalid mission model. [R] Proceed only if an owner can validate the toy model's intended lesson and assess its utility. [R] Describe ID 32 as a related future application, not a second solved case; it adds a multi-change readiness scenario and mission-capability mapping. [P] ID 14 forbids operational orders, personnel direction, maintenance authorization, tasking alteration and authoritative-record changes.

## 5. ID 18: A handoff the next watch can verify

[P] The submission describes one suspected-endpoint-compromise workflow, a supplied response playbook, evidence gaps, analyst review and export. [R] Use synthetic logs and a local playbook to build a traceable incident timeline and a draft handoff. [R] Make the reviewed disposition and the analyst's edits visible, with no autonomous remediation.

[R] Seed one misleading alert, missing endpoint evidence and inconsistent timestamps. [R] Compare time to approved handoff, evidence completeness, unsupported statements and analyst edits to manual triage of the same inputs. [R] Reset between manual and assisted trials and disclose learning effects if the same reviewer sees both.

[A] The main failure is an apparently complete summary that suppresses a material gap. [R] Require citations and explicit unknowns. [P] The submission names Legion as a resource. [A] Its availability and offline capabilities are not verified. [R] If using a substitute local workflow, disclose that substitution and show the required outcome; do not claim the named integration works.

## Avoid or defer for the first demonstration

| Cases | Reason | A bounded alternative |
| --- | --- | --- |
| [P] 43 | [P] Its source requirements are described as classified. [R] Rule 4 excludes those materials from this work. [A] A generic surrogate would not validate the actual requirements process or export fidelity. | [R] Defer. If selected later, build only a wholly invented unclassified lifecycle demonstration; never access or import the classified workbooks or derive examples from them. |
| [P] 13, 40, 44 | [A] Multiple authoritative feeds, enterprise identity or backend integration dominate end-to-end risk. | [R] Use explicit synthetic adapters and cached snapshots, and mark every enterprise integration unverified. |
| [P] 25 | [P] Requests two compliance scanners, PKI libraries on two operating systems and approved status. [A] That scope and authority cannot be established by a local coding demonstration. | [R] Evaluate one read-only check on synthetic configurations without claiming approval or benchmark completeness. |
| [P] 9, 16, 23 | [A] A governance dashboard is easy to mistake for enforced authority. [P] ID 23 additionally sets strict latency, hardware-control and cognitive-offload targets. | [R] Demonstrate one independently enforced deny/stop boundary on inert agents; defer broad shipboard governance claims. |
| [P] 10, 17, 21, 33 | [A] Safety-related formulas, craft limits or procedural sequencing need trustworthy reference content and domain review. | [R] Use independently checked surrogates, show calculations/citations, retain human authority and avoid readiness or safety claims. |
| [P] 35 | [A] A remediation demonstration needs a controlled range, approval gates and verified rollback. | [R] Prefer ID 18's read-only evidence-to-handoff loop for the first cyber demonstration. |
| [P] 15, 41, 42 | [P] Their submissions specify shared notebook or Navy M365/Flank Speed environments. [A] Tenant availability and allowed integrations are unverified. | [R] Move ID 41 onto the shortlist if the authorized tenant and on-site owner are available; retain synthetic tickets and approved internal notifications only. |
| [P] 20, 34, 39 | [A] Source availability, freshness, identity/applicability and access can overwhelm a short demonstration. [P] ID 34 is conditional and lists no confirmed transition owner in its submitted text. | [R] Use frozen public or synthetic evidence with answer keys; make no live-intelligence or JLLIS-connection claim. |
| [P] 37 | [P] Needs the existing app and an authorizing-official or hosting representative. [A] Those are outside a generic code-generation workflow. | [R] Choose only when those assets are actually available; document packaging evidence and unresolved approval decisions. |
| [P] 22 | [P] Requires handwriting, token confidence, automatic template choice and semantic mapping. [A] A few clean scans could conceal substantial generalization risk. | [R] Add as a measured extension to ID 36 after the underlying form loop works. |
| [P] 19 | [P] Specifies Gemini Enterprise and numeric risk inference. [A] Platform access and an accepted scoring rubric are unverified. | [R] Establish the rubric and review process before automating scoring. |

## Sensible substitutes and stop conditions

[R] Use ID 48 as a low-complexity substitute if the authoritative DSG can be obtained and a leader can review it: preserve its seven elements and complete it with AI and networking turned off. [A] Its value depends on decision quality and usability, so form completion alone is weak evidence. [R] Use ID 46 as a second fallback for easy local search, with entirely synthetic catalog ownership and no real contact details. [A] Its mission value is less direct unless an officer demonstrates that it prevents duplicate work.

[R] Stop expanding scope when the remaining work is a new enterprise approval, unavailable doctrine, an unverified safety formula or a new data classification question. [R] Finish the accepted local workflow, document the blocker and nominate an owner for the next controlled experiment. [R] If the first build cannot produce a correctly reviewed outcome, fix that before starting the next case.

## Evidence to carry into judging and transition

[R] For the selected case, keep safe fixtures, expected answers, exact test steps, saved outputs, observed failures, disconnected evidence and a short manual-versus-assisted comparison. [R] Report sample size, scenario order and reviewer role; avoid generalizing a single rehearsal into Fleet-wide hours saved. [R] Record human approval, forbidden actions, monitoring, escalation and shutdown, as required by [[Event/Rules]].

[R] A 30-day step should confirm the mission owner, workflow and baseline; a 60-day step should test authorized representative inputs on the intended platform; a 90-day step should run a controlled user evaluation with agreed success and stop criteria. [A] These are proposed milestones, not approved commitments. [R] Name mission and technical owner roles before submission and leave actual ownership unverified until accepted.

## Sources

- [E] Read all 36 Markdown notes in `UseCases/`, including its index and categories, and all 34 records' submitted description, requirements and resources in `Sources/raw/events_norfolk_combined.json`, key `use_cases`, on 2026-11-04. The `theme` key was excluded. Paths are relative to `~/Documents/CDAO/Fleethacker-Vault`.
- [P] Participant proposals and capture counts: the above raw records, cross-checked against [[UseCases/README]]. A proposal describes requested behavior, not a demonstrated capability.
- [P] Project scope and three proposed experiments: `~/Documents/CDAO/FleetHarness/README.md`, read on 2026-11-04.
- [P] Constraints and scoring: [[Event/Rules]], [[Event/Judging]] and [[Research/00-Brief]].
- [P] Full URL supplied by use case 48 for its document locator: https://cdao.hackathon.maximus.com/event/norfolk/documents. Not opened; no live portal or external verification was performed.
