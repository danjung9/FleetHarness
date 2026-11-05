---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Judge-focused recommendation for one offline PB4T draft planner, with measured task evidence and explicit limits."
---

# FleetHarness downselect decision

## 1. Bottom line

[R] Build a tool that helps the training officer fit next week's training around available people and time, shows what cannot fit, and saves a draft for review without an internet connection.

## 2. User and job

[R] The user is the ship's training officer preparing one weekly draft for the Planning Board for Training (PB4T). The job is to reconcile departmental training requests into a reviewable schedule, or identify the requirements that cannot fit. Call the product **FleetHarness: training draft**. Keep the chief and departmental planners involved in validating inputs, without giving them a second product to learn.

[P] ID 11's submitter describes weekly planning meetings with competing departmental requests and double-booked people. [V, historical official reference] OPNAVINST 3120.32D, dated July 16, 2012, sections 8.6 and 8.7, assigns training coordination and consolidation responsibilities to the training officer. This supports the role, not current command-specific procedures. An official search extract was available; the full PDF returned 403: https://www.med.navy.mil/Portals/62/Documents/NMFA/NMCPHC/root/Field%20Activities/Pages/NEPMU6/Operational%20Support/Environmental%20Health/OPNAVINST-3120-32.pdf.

[A] Working baseline: departmental planners provide requests; the training officer puts them on a calendar, checks availability and requirements, negotiates changes, and prepares a draft for leadership review. A spreadsheet or paper grid is the proposed event comparator. The actual tools, meeting frequency, approval chain and labor at a participating command have not been observed. [R] Obtain a short walkthrough using invented examples before treating that baseline as representative.

[R] Choose this over ID 24 message extraction because the correctness of a small schedule can be checked independently, and the whole task can run without inference. Choose it over an offline forms-and-sync application because that would add reconciliation and routing work before proving a useful result. [A] Those are deadline judgments, not evidence that scheduling has greater Fleet-wide value. The case shortlist's preference for ID 24 and the build-pattern note's preference for a factory are reasonable alternatives; they do not settle this judge-focused choice.

[P] Impact and Speed to Fleet carry 50% of the rubric together. [R] Spend the submission's first minute on the officer's completed task. A skeptical judge can assess an altered input, a checked result and a preserved draft. They cannot infer deckplate benefit from a count of generated repositories. [R] Narrow Mukul's framing from a simpler platform to a simpler recurring job. Do not claim C3, Maven or Lovable cannot do this; no comparative product trial supports that claim.

**Measure the burden honestly**

[R] Prepare two matched synthetic packets, each containing a normal week and a late-change problem. Freeze their rules and independently checked answers before implementation. Aim for two available reviewers to try both methods in opposite order on different packets. Record actual participation; a teammate acting a role is a developer trial, not a Sailor study. If no domain reviewer is available, explicitly lower the claim to a synthetic task experiment.

[R] Start timing when the same complete inputs reach the planner. Stop when the draft passes independent checks and is ready for human review. Count active minutes for input preparation, planning, checking, corrections and transfer across everyone involved. Record waiting separately. Include conversion work if the app requires a special input format; do not give the app clean data while forcing the baseline user to clean it.

[R] Report net person-minutes saved as manual preparation + planning + review + corrections + transfer, minus the same assisted activities. Report setup/training separately, alongside raw trial times, input size, participant roles, violations, unmet requirements, manual edits and failed attempts. A faster invalid schedule is a failure. Do not annualize savings without observed task frequency, or borrow a Navy-wide administrative-hours figure. [E] No baseline, time saving or user result was measured by this research.

[R] Submission wording after measurement: report the observed manual and assisted times on the stated synthetic trials, then the constraint-check result and limitation. If the assisted method loses, report that result. If no valid comparison completes, report task time and errors only, with savings unmeasured. The first-60-seconds design below is a demonstration target, not a burden measurement.

## 3. The first 60 seconds

[R] Use the same local application that will be handed over. Start it with external networking disabled. The following timings are proposed choreography, not achieved performance.

| Time | Screen and what the officer sees | What the officer does |
| --- | --- | --- |
| [R] 0 to 10 seconds | **This week's training draft.** A persistent Synthetic example banner, local-only status, last saved revision, and one primary button, Open example week. No catalog search or model picker. | Opens the supplied example. |
| [R] 10 to 20 seconds | **Requests to reconcile.** Six fictional events from Engineering, Weapons and Combat Systems, three department tabs, requested times and two highlighted conflicts. A short rules panel distinguishes mandatory limits from preferred times. Each conflict opens its input rows. | Opens the shared-trainer conflict and presses Find a draft. |
| [R] 20 to 40 seconds | **Proposed week.** Original requests beside the computed calendar, changes listed in plain text, each required event accounted for, and checks against the loaded rules. Example explanation: Instruction B moved because Trainer 02 was already booked. Stop remains visible while solving. | Inspects the moved event and its reason; accepts or rejects that proposed change. |
| [R] 40 to 60 seconds | **Save for board review.** The exact draft revision, changed preferences and any unresolved items. The action is Save reviewed draft and export, not Issue orders. A visible local-save receipt and readable CSV/print view follow. | Confirms review and exports the draft. No calendar is published or message sent. |

[R] Immediately afterward, let the judge remove the only qualified trainer from the permitted windows. The application must either find another valid assignment or explain that this fixture has no valid schedule. Show that it never invents a qualification or drops mandatory training. Close and reopen the app to recover the reviewed version. These are live tests, not prerecorded answers.

## 4. Scope

[R] **Only ID 11, PB4T (Planning Board for Training) Autonomous Deconfliction Agent, is in the demo, as a disclosed subset.** [P] The original submission requires departmental agents, shared operating windows, qualified personnel, fatigue constraints, alternate allocations and SFTRM periodicities. It is stronger than a room-overlap checker. Source: [[UseCases/11-pb4t-planning-board-for-training-autonomous-deconfliction-ag]] and the original capture's `use_cases[id=11].requirements`.

[R] Use one invented five-day week, six administrative instruction events, twelve fictional role-holder IDs, three departments and two rooms. Times, qualification labels, availability, rest limits, last-completed dates and recurrence intervals are invented fixture values. Use generic instruction names rather than actual combat drills. These counts bound the engineering experiment; they are not a claim about a ship's size, workload or capabilities. Support editable synthetic fields and a documented CSV/JSON fixture schema, not unrestricted operational-document upload.

| Part | Thursday implementation target [R] | Disclosure [R] |
| --- | --- | --- |
| Scheduling | Real local assignment search across allowed windows, eligible people and rooms. Every required event gets an assignment or the run cannot be accepted as complete. Prefer fewer changes to requested times. | Feasible under the loaded synthetic rules. Optimal only when the solver proves it. |
| Constraints | Real checks for overlapping people/rooms, eligibility, duration/window fit, supplied rest exclusions and supplied recurrence deadlines using prior completion dates. | Synthetic fatigue and recurrence policies. No claim of current SFTRM compliance, complete fatigue modeling or training readiness. |
| Department interaction | Three small deterministic proposal functions rank permitted slots; the shared solver reconciles them. Show each department's preferences and concessions. | Simplified departmental proposals, not autonomous negotiation agents or validated department behavior. The full multi-agent requirement remains unmet. |
| Review and persistence | Real input validation, source row/rule links, revision history, review invalidation after changes, local save, restart recovery and CSV/print export. | Reviewed draft only. Export is not acceptance by an authoritative calendar or completion of training. |
| Integration and identity | No government connector. Synthetic reviewer-role selection on one demonstration device. | Identity is simulated. No CAC, enterprise access control, TORIS connection, live personnel data or verified import into a Navy system. |
| Evidence | Independently executed constraint checker, fixed fixtures, holdout changes, raw timing sheet and package manifest. | Results remain Not run until actually executed on the named artifact. A screenshot never changes that status. |

[R] ID 24, **Automated Message Traffic Task & Event Extraction**, is later. ID 36, **Paperless Underway**, and ID 45, **Detecting and triaging for disconnected and low data fidelity environment.**, are out of this submission. Local persistence does not solve either of their synchronization requirements. No second use case earns coverage credit from a shared component.

**Human authority built into the workflow**

| Control | Required behavior [R] |
| --- | --- |
| Permitted | Read supplied synthetic inputs, compute candidates, explain conflicts, save drafts and export locally. |
| Prohibited | Send tasking, publish schedules, write government records, infer qualifications, mark training complete, or relax hard rules automatically. |
| Approval | Human accepts the input/rule revision and reviews the resulting draft. Any edit invalidates the prior review. The application has no external release action. |
| Monitoring | Store input, rule and app revisions; solver state; checks; changes; review decisions and timestamps. Label the local audit record as ordinary prototype logging, not tamper-proof evidence. |
| Escalation | Invalid inputs, infeasibility or unclear rules go to the training reviewer; crashes and corrupted state go to the technical owner. Neither role is confirmed yet. Preserve the last saved draft. |
| Shutdown | Stop cancels the active solver process, leaves an interrupted result unapproved, and preserves saved work. The technical owner can close the local service. No run resumes automatically after restart. |

[R] Acceptance must include a feasible week, a known impossible week, missing eligibility, a rest-boundary conflict, a recurrence-boundary failure, adjacent nonoverlapping events, invalid input, forced timeout, stopped computation, stale review after edit, and saved-state recovery. A separate checker recomputes validity from inputs and output assignments rather than trusting solver success text. A team reviewer controls the expected answers. Mutate one output to contain an overlap and prove that the checker rejects it.

## 5. Disconnected

| Function | With no external network [R] |
| --- | --- |
| Open new synthetic inputs, edit, solve, check, review and export | Works after installation, with assets and solver dependencies local. Requires a tested local runtime; no model call is part of the user task. |
| Save, quit, reopen and recover | Works from a local database; verify the latest acknowledged save, draft revision and review state. |
| Read instructions and evidence | Works from packaged local files, with an explicit source capture date. |
| Fresh cloud research, cloud coding assistance and dependency downloads | Unavailable. Development and future updates need connectivity unless separately provisioned. |
| Live source updates, remote approvals, multi-device reconciliation and automatic reconnect sync | Not implemented. Show Local draft only. Reconnection does not automatically publish or merge anything. |

[R] Prove cold start, a fresh input change, solving, save, restart and export with Wi-Fi and other external routes disabled. Check app/service traffic for unintended remote requests. Repeat from a clean user environment on a second available laptop with the recorded prerequisites. A launch on the original developer laptop proves less than a clean install. Report the exact tested OS/architecture; do not claim government-device compatibility or shipboard authorization.

[P] The raw descriptions for IDs 36 and 37 include a completion definition described as applying to all solutions, including reconnect sync. The captured main rules require consideration of disconnected conditions but do not repeat that universal checklist. [E] The scope and authority of the repeated completion definition remain unresolved. [R] The team lead must clarify this with organizers during the first hour. If automatic sync is mandatory for this entry, the present no-sync scope is incomplete: revise the contract and cut optional presentation work to add and test a single reviewed-version transfer, or explicitly submit a limited prototype. Do not silently rename CSV export synchronization. A required full offline sync workflow would invalidate this deadline estimate.

## 6. How it gets built

[R] Use a small local Python application with a simple HTML interface, SQLite persistence and OR-Tools CP-SAT behind a narrow solver function. Bundle all page assets locally. Keep explanations deterministic and tied to input/rule IDs. Run the solver in a cancellable process with a time limit. Maintain distinct feasible, proven infeasible, invalid, timed out and stopped states. A timeout must never become an impossibility claim.

[V] OR-Tools documents employee scheduling with CP-SAT and separates feasible, optimal, infeasible, invalid and unknown results. This establishes a suitable engineering primitive, not Navy-policy correctness or local installation success: https://developers.google.com/optimization/scheduling/employee_scheduling and https://developers.google.com/optimization/cp/cp_solver.

[R] Preflight the exact package on the team laptop in the first hour, pin dependencies and record versions. If native package setup fails within that hour, use a bounded exhaustive search for the same six-event instance, with all candidate slots explicit and the same independent checker. Exhaustion can establish infeasibility only within that declared finite model; a time limit means unknown. This fallback keeps the product and test contract, while reducing scale claims.

[P, reported session evidence] [[Research/00-Brief]] and the later [[Team/Now]] report event-key Codex working. [[Resources/Documents]] still says login pending, so it is stale on that point. No other event tool is confirmed for this team by the supplied context. [R] Use Codex as the supervised development tool. If only Codex access works, the complete proposed runtime and demo remain unchanged. Download no local language model and build no second provider adapter.

[R] Do not put Google team access, Antigravity, Gemini, Cursor, Grok, Ark, UDS or Zarf on the critical path. Revisit an event packaging platform after the downselect only if a technical owner already has a working target. The local package should include source, pinned dependencies, local assets, fixtures, tests, notices, launch/stop/backup instructions, actual evidence and known limits. No event key belongs in it.

| Project | Borrow now [R] | Skip now [R] | Primary source checked [V] |
| --- | --- | --- | --- |
| SWE-AF | Small task contract, separate change workspace, recorded failures and bounded repair. | Full fleet of workers, automatic PR creation and new runtime integration. | The public README describes per-issue worktrees and coding/review loops: https://github.com/Agent-Field/SWE-AF. |
| SuperPlane | Explicit task states, test artifacts attached to the result, failed checks returned with context, human review. | Server deployment and external repository/tracker integrations. | Its documentation describes ticket-to-implementation-to-verification workflow: https://docs.superplane.com/get-started/overview/. Its VM guide adds host and network prerequisites: https://docs.superplane.com/self-hosting/single-vm/. |
| Symphony | One work directory per approved task, versioned workflow instructions, observable run state and stop conditions. | Continuous tracker polling, daemon adoption and automated ticket writes. | The service specification describes a tracker-driven coding runner: https://raw.githubusercontent.com/openai/symphony/main/SPEC.md. |
| Aperant | Visible plan, implementation and human-review states, with the draft requirements retained. | Desktop engine integration, autonomous merge and framework migration. | Its public README describes a repository-centered desktop workbench with task progress: https://github.com/AndyMik90/Aperant. |

[R] Borrow these design ideas without copying their engines or prompts. Record them as prior design references; record actual code dependencies and notices separately. [E] The four project research folders were read. Their static-code defect reports were not independently reproduced and are not needed for this decision. [A] Even flawless orchestration would leave the task model, user interface, acceptance evidence and submission to build.

[R] Use human-supervised coding tasks and an ordinary test command, with at most two unsuccessful repair attempts before a human revises the implementation plan. Preserve the approved requirements and independent tests. No new factory-control interface is required. This deliberately narrows [[Research/Build-Patterns/Build-Options]] option 2: its controller is a future product experiment, while this deadline needs the finished user task.

## 7. Relationship to the README and a use case catalog

| Item | Decision | Why |
| --- | --- | --- |
| README's requirements, reuse research, implementation, tests, repair and packaging | [R] **In as the team's process.** Preserve the approved specification, test evidence and actual work record for this application. | [P] These are the README's stated principles. Human operation of the process must be disclosed. |
| General software factory that an officer operates | [R] **Later.** | [A] A convincing factory needs its own comparison of engineering and officer effort across distinct tasks. One correct app does not prove that. |
| README's three initial experiments | [R] **Narrow explicitly for Thursday.** Retain training scheduling and local offline use; defer message parsing and reliable synchronization. | [P] The README proposes three trials, not 34 completed apps by Thursday. This recommendation changes the initial trial scope; it does not pretend to fulfill it. |
| Coverage of all 34 cases | [R] **Out of the downselect claim.** | [A] Planned breadth gives no evidence of working coverage or Fleet scalability. |
| One startups.rip-style case page | [R] **In as supporting evidence, after the app works.** A static page links problem, alternatives, tested artifact, limitations and next owner decision. | [V] The inspected Humanloop page separates research, sources and a build proposal: https://startups.rip/company/humanloop. This pattern is useful; its report is not proof of our software. |
| A catalog with 34 deep reports, chat, generated specifications and launch buttons | [R] **Later.** | [A] It competes with testing and submission time. Unbuilt entries can confuse judges about what exists. |

[R] The opening screen is the training task. Put the single evidence page behind About this experiment. Do not require an officer who already knows the job to browse a software catalog first. Do not create a story that earlier Navy projects failed without primary evidence. Adjacent procurement or sustainment history cannot establish a failed PB4T predecessor.

## 8. Plan

[A] Staffing assumption: two implementers and one team lead who owns domain review, evidence and submission, with short access to a training reviewer. These are roles to allocate, not confirmed people. With two people, merge the lead and UI role and cut the evidence-page polish immediately. [R] Project code belongs under `/Users/mukul/Documents/CDAO/Fleethacker-Work`; this research does not change the existing README repository.

[P] The captured schedule sets Thursday, November 5 at 2:00 PM EST for portal submission and Wednesday venue closure at 8:00 PM. [R] Use the schedule below from Wednesday noon. Before noon, lock the task and assign the three roles. Protect sleep and submission time. Each row is a proposed allocation, not completed work.

| EST hour | Implementer 1 | Implementer 2 | Lead/reviewer and completion gate |
| --- | --- | --- | --- |
| [R] Wed 12:00 to 13:00 | Prove solver install or select bounded-search fallback. | Build local page and import schema. | Resolve portal team/submission access; inspect actual fields, allowed attachments, category and sync requirement. Conduct fictional workflow walkthrough; freeze inputs and expected answers. |
| [R] 13:00 to 14:00 | Assignment model and qualification/window checks. | Editable synthetic requests and three department views. | Record fair manual baseline; identify accepted owner roles or mark pending. |
| [R] 14:00 to 15:00 | Rest exclusions, recurrence deadlines and independent checker. | Side-by-side request/result view and rule links. | Review oracle independently. Gate: one feasible and one impossible fixture compute correctly. |
| [R] 15:00 to 16:00 | Test late changes and preserve unknown/timeout states. | Local save, revisions, review invalidation and export. | Write problem, scope, exclusions, ROI and human-authority submission sections. |
| [R] 16:00 to 17:00 | Fix failures; cancellable solver process. | Connect full user flow; show saved/exported state. | Test unchanged holdouts. Gate: complete local request-to-reviewed-export flow, or invoke cuts below. |
| [R] 17:00 to 18:00 | Dinner break, then first offline cold start. | Dinner break, then readable conflict explanations. | Run first assisted trial with the matched packet; record errors and total labor. |
| [R] 18:00 to 19:00 | Package dependencies and smoke tests. | Second-laptop setup, restart and export checks. | Reconcile measured results; draft the one-page path to Fleet and disclosures. |
| [R] 19:00 to 20:00 | Last critical fixes and clean rerun. | Save tested package and local instructions. | Record a short factual demo and limitations; leave before the 8:00 PM closure. Gate: recoverable working baseline exists. |
| [R] 20:00 to 21:00 | Travel and rest. | Travel and rest. | Travel and rest. No venue dependency. |
| [R] 21:00 to 22:00 | Optional offline review of saved evidence; no required feature work. | Same. | Up to one hour of submission editing from saved materials, then stop. |
| [R] 22:00 to 23:00 | Sleep. | Sleep. | Sleep. |
| [R] 23:00 to Thu 00:00 | Sleep. | Sleep. | Sleep. |
| [R] Thu 00:00 to 01:00 | Sleep. | Sleep. | Sleep. |
| [R] 01:00 to 02:00 | Sleep. | Sleep. | Sleep. |
| [R] 02:00 to 03:00 | Sleep. | Sleep. | Sleep. |
| [R] 03:00 to 04:00 | Sleep. | Sleep. | Sleep. |
| [R] 04:00 to 05:00 | Sleep. | Sleep. | Sleep. |
| [R] 05:00 to 06:00 | Sleep. | Sleep. | Sleep. |
| [R] 06:00 to 07:00 | Breakfast and personal time. | Same. | Same. |
| [R] 07:00 to 08:00 | Travel and setup. | Same. | Verify portal access remains available. |
| [R] 08:00 to 09:00 | Attend 8:00 kickoff; reproduce saved baseline. | Resume second-device checks after kickoff. | Working breakfast; second reviewer walkthrough if available. |
| [R] 09:00 to 10:00 | Only correctness, recovery and stop fixes. | Apply usability corrections; rerun affected checks. | Complete matched trials, inspect raw results and qualify every impact claim. |
| [R] 10:00 to 11:00 | Freeze feature set and tested artifact. | Freeze interface; check package and evidence links. | Finalize submission narrative, category, ROI, limitations, rights/disclosures and owner status. |
| [R] 11:00 to 12:00 | Reproduce the exact demo once after freeze. | Check video, readable export and fallback recording. | Working lunch; independent checklist review. Recording length follows the actual form, not an assumed pitch slot. |
| [R] 12:00 to 13:00 | Support only release-blocking defects. | Verify final source/package/evidence identities match. | Assemble and preview all submission fields and attachments. Obtain team approval of the concrete submission. |
| [R] 13:00 to 14:00 | Keep the tested package available. | Stand by for upload/access failures. | Human submits by 13:15, verifies receipt and attachment access, retains confirmation, and uses remaining time as buffer. Deadline is 14:00. |

[R] Cut in this order: catalog/evidence-page styling; animation and drag-and-drop; alternate optimized schedules; extra data adapters; second-device portability claims if that test cannot finish. Retain the working six-event model, imported synthetic data, hard-constraint checks, a known impossible case, review, local save/restart and usable export. If alternate optimization is cut, return one checked feasible result and do not call it optimal.

[R] At Wednesday 16:00, if automatic assignment still does not work, freeze a smaller **training draft checker** that validates a human-arranged schedule and explains conflicts. This is an emergency reduction of the same job, with lower claimed impact and no automatic-deconfliction claim. If a required correctness or recovery check still fails Thursday morning, remove the affected claim and show the failure. Do not use the submission buffer to begin a new platform or use case.

## 9. Scoring

[A] Estimates below are conditional on delivering the scope, completing a fair synthetic comparison and retaining the evidence. They are subjective estimates on the event's 0 to 100 scale, not judge scores or a prediction of downselection. Allow at least 15 points of uncertainty in either direction for each. No published pass threshold or downselect-specific score aggregation was verified.

| Criterion | Weight [P] | Estimate [A] | Evidence that earns it [R] | Why a skeptical judge deducts points [A] |
| --- | --- | --- | --- | --- |
| Warfighting and deckplate impact | 30% | 75 | Measured preparation/review labor on matched cases, with no hidden constraint violations; reviewer explains why the job matters. | Synthetic workload and small sample; no demonstrated command-wide or readiness benefit. Without a domain reviewer or fair baseline, roughly 45 is more defensible. |
| Speed to Fleet | 20% | 70 | Offline cold start, new computation, restart recovery, local package and a second-person setup record. | No government endpoint approval, production identity, live data path or accepted host. Local execution does not establish rapid authorization. |
| Fleet scalability | 20% | 65 | Same schema/checker handles a second synthetic configuration with changed people, rooms and requirements, without code changes. | Configuration reuse is limited evidence. No other ship class or rating has validated it; small-instance performance is not Fleet-scale performance. |
| Barrier removal | 15% | 60 | Imported requests, computed conflict checks and usable export reduce measured reconciliation steps. Document conversion and remaining handoffs. | Data gathering, authoritative-system entry, command approval and sustainment remain. Another unsupported tracker could add burden. |
| Judges' discretion | 15% | 80 | Clear first minute, live changed input, credible infeasibility, visible human review, preserved work and candid limits. | Scheduling is established technology; innovation rests on task fit and evidence. A pretty calendar with staged answers loses this score. |

[A] Assuming the ordinary weighted-sum interpretation, these estimates produce 70.5/100. The capture provides weights but does not explicitly state the aggregation formula. Treat this as a prioritization aid, not a likely winning score. Its main weakness is unproven adoption and transition, not insufficient numbers of agents.

**Submission checklist gaps at the time of this note**

[E] This note is a decision proposal, not a working prototype or completed submission. The following maps [[Sprint/Submission-Checklist]] to required evidence and remaining gaps.

| Checklist area | Present in this proposal | Must be closed or disclosed before submission [R] |
| --- | --- | --- |
| User, problem, process and measured burden | [R] One role/job and a measurement protocol. | Validate the current workflow; attach real trial results or state savings unmeasured. |
| Category and ROI | [R] Propose Bring Your Own Idea under the three-category rules. Map to Clarifying Friction Points to Agile Delivery, with observed dependency, data and fielding barriers and actions. | Confirm the actual form's category mapping. Six use-case categories differ from the three rules categories. Do not force a non-agent scheduler into Naval Agentic AI for branding. |
| Observable build and permitted data | [R] Local planner and entirely synthetic fixture manifest. | Actual artifact, source version, executed checks, demo and provenance review. No restricted data in prompts, logs, screenshots or exports. |
| Fleet conditions | [R] Local runtime, packaging/recovery plan and explicit integration limits. | Offline test, resource observations, target OS, dependency inventory, backup/restore instructions, support owner and unresolved security/host requirements. Clarify universal sync language. |
| Human authority | [R] All six controls appear in section 4. | Demonstrate stale-review rejection and real stop; label synthetic identity. Rule 6 is not satisfied by a decorative approval button. |
| Tools, models, datasets and services | [R] Disclosure plan separates evaluated tools from actual dependencies. | Record actual model IDs, versions, services and data sources in the tool ledger. [P] Mukul's updated instructions settle the format: use `python3 tools/fh.py tool NAME TYPE USE PROVIDER`. Do not infer that research logs alone complete it. |
| Prior work, ownership and restrictions | [R] Existing README, research and upstream references are separate from proposed new application work. | List actual reused code, dependency licenses/notices and event changes. Team members must confirm contribution ownership and applicable restrictions against the governing terms. |
| Friction | [E] Live-form access, tool-status inconsistency, policy validation and sync applicability remain open. | Transfer observed barriers to the central log, identify responsible roles where known, and state next actions without inventing commitments. |
| Beyond Friday | [R] Proposed role owners and 30/60/90-day gates below. | Secure actual mission and technical owner acceptance. Pending roles are an honest gap, not completion of the owner requirement. |
| Pitch and delivery | [R] One measured task, offline proof, configurable reuse, removed steps and clear UX address all five criteria. | Put the measured result up front only when it exists; use mission results, verify all form fields and submit on time. |

[R] Proposed mission owner: a participating command's training officer who agrees to evaluate the workflow. Proposed technical owner: a FleetHarness maintainer who agrees to own packaging, defects and handoff. Both remain unconfirmed. The next experiment is a supervised comparison of matched fictional planning tasks with representative users and their existing method. Resources are reviewer time, a permitted laptop, approved public/synthetic rules, a maintainer and a host/security representative to assess an eventual installation path.

| Horizon | Recommendation and decision gate [R] |
| --- | --- |
| 30 days | Confirm both owners, document the real current process, review policy applicability and repeat the burden experiment. Stop if net labor or correctness does not improve. |
| 60 days | If useful, harden the chosen package and data boundary; validate complete rules, identity, backup, supported hardware and a permitted exchange format in an approved test setting. Obtain the responsible authority's pilot decision. |
| 90 days | Only with approval, conduct a limited pilot, measure support and review burden, demonstrate handover and rollback, and decide sustain, integrate, revise or stop. This is not a promised Fleet deployment. |

[A] A judge comparing many teams is likely to doubt three untested apps, fabricated savings, an undisclosed canned result, a cloud-only workflow labeled offline, or a missing owner. [P] The captured rules require observable work, truthful prior-work disclosure, human authority and a transition plan, and prohibit restricted data and unauthorized actions. [R] Treat those as submission risks to address, while avoiding invented claims that a particular score or gap automatically disqualifies a team.

## 10. What I would have to be wrong about

| Evidence that would flip the recommendation | Resulting decision [R] |
| --- | --- |
| [A] A training officer demonstrates that requested inputs cannot be assembled without more work than the app saves, or that approved existing tooling already resolves the same cases with equal or lower total effort. | Stop building a new planner; adapt the existing workflow or focus on the demonstrated input bottleneck. Do not preserve the product to defend the pitch. |
| [A] The apparent scheduling burden turns out to be missing people, disputed priorities or approval delay, and a constraint model produces no useful change in the observed task. | Prefer the problem with an observed, removable burden. No claim that software supplies missing personnel or changes authority. |
| [A] The organizer requires complete ID 11 conformance, autonomous departmental agents, validated SFTRM rules or full reconnect synchronization for downselect, and will not accept the disclosed subset. | This scope is insufficient. Obtain the rules/assets and revise the plan, or choose a permitted narrower category before further implementation. |
| [A] An already running FleetHarness factory produces two genuinely distinct applications with independent checks, enforced human gates and measured engineering savings within the first hour. | Reassess the factory as the primary entry. The decisive evidence is working results and user value, not a newly found orchestration README. |
| [A] No one can own the constraint oracle today, while a message-task reviewer already has a safe labeled corpus and a running extraction prototype that passes unseen cases locally. | Flip to ID 24, because its evidence and review capacity would then be stronger. No such head start was verified here. |
| [A] On matched trials the planner misses a hard constraint, loses saved work, or has no net benefit after review/conversion effort. | Remove the impact claim, repair only within the cutoffs, and use the limited checker fallback or report the failed experiment. |
| [A] Official downselect instructions give primary credit to broad software-generation capability or require a different artifact than the captured rubric/checklist implies. | Reweight the decision using those actual instructions. The present recommendation depends on the captured mission-focused rubric. |

## 11. Claims relied on

[E] Sources were checked on November 4, 2026. The original raw event capture was read selectively for rules, judging, relevant use cases and schedule. It is stronger evidence than the draft research summaries, but remains a captured version. The live portal returned no readable content. File paths below are relative to `/Users/mukul/Documents/CDAO/Fleethacker-Vault` unless absolute. These are the ten load-bearing claims, including their limits.

| # | Claim | Source note | Primary URL or file and verifier's test |
| --- | --- | --- | --- |
| 1 | [P] The rubric weights are impact 30, Speed to Fleet 20, scalability 20, barriers 15 and discretion 15; disconnected fielding is explicit in Speed to Fleet. | [[Event/Judging]] | `Sources/raw/events_norfolk_combined.json`, `judging_criteria`, five required records. Compare names, weights and descriptions with the current portal: https://cdao.hackathon.maximus.com/event/norfolk. Weighted aggregation remains [A]. |
| 2 | [P] A named user, present process, measurable burden, observable artifact, data restrictions, human controls and transition plan matter; the rules allow Bring Your Own Idea. They do not require every entry to run an LLM. | [[Event/Rules]], [[Sprint/Submission-Checklist]] | Same capture, `event.rules`, rules 2 to 6, 8 to 11 and category definitions. Check the live form for additional requirements. The checklist is a local interpretation, not the form itself. |
| 3 | [P] Portal downselect is Thursday, November 5 at 2:00 PM EST; the venue closes Wednesday at 8:00 PM. | [[Event/Schedule]], [[Research/00-Brief]] | Same capture, `schedule[id=37]` and `schedule[id=30]`. Item 37 has `2026-11-05T19:00:00Z` and states portal submission. `event.project_submission_deadline` is null, so it cannot independently confirm the deadline. |
| 4 | [P] ID 11 asks for qualified-personnel, window, fatigue and periodicity constraints, alternative schedules and collaborative departmental agents; it reports double-booking as a problem. | [[UseCases/11-pb4t-planning-board-for-training-autonomous-deconfliction-ag]], [[Research/UseCase-Map/PoC-Mapping]] | Same capture, `use_cases[id=11].description` and `.requirements`. Check exact wording and whether a subset is acceptable. Submitter testimony is not measured prevalence or proof of savings. |
| 5 | [V] Constraint scheduling has an established implementation route, and a timed-out search is not proof of infeasibility. | [[Research/Build-Patterns/Reuse-Research]] | https://developers.google.com/optimization/scheduling/employee_scheduling and https://developers.google.com/optimization/cp/cp_solver, especially return values. Verify local packaging, behavior and independent fixture answers; no runtime was tested here. |
| 6 | [P, reported observation] The confirmed event coding path is Codex; the supplied context does not confirm the other tools or a working FleetHarness implementation. | [[Team/Now]], [[Research/00-Brief]], [[Resources/Documents]] | Those exact files and `/Users/mukul/Documents/CDAO/FleetHarness/README.md`. Recheck actual access and existing artifacts with the team. The older resource status conflicts with the later session report. No credential was inspected. |
| 7 | [P] The README describes a development system with three distinct initial trials, independent app architectures and an optional dashboard; it does not promise 34 completed apps by Thursday. | [[Research/FleetHarness/What-It-Means]] | `/Users/mukul/Documents/CDAO/FleetHarness/README.md`, Overview, Initial Proof of Concept, Deliverables and Success Criteria. Compare this recommendation's explicit cuts against those sections. |
| 8 | [V] The four candidate projects offer development orchestration/workbench patterns; adopting one does not itself supply the PB4T acceptance model. The latter is an inference [A]. | [[Research/Projects/SWE-AF/FleetHarness-Fit]], [[Research/Projects/SuperPlane/FleetHarness-Fit]], [[Research/Projects/Symphony/FleetHarness-Fit]], [[Research/Projects/Aperant/FleetHarness-Fit]] | https://github.com/Agent-Field/SWE-AF; https://docs.superplane.com/get-started/overview/; https://raw.githubusercontent.com/openai/symphony/main/SPEC.md; https://github.com/AndyMik90/Aperant. Test any already running candidate against the same task before claiming adoption saves time. No defect allegation is necessary to this claim. |
| 9 | [P] A working offline prototype can still lack a permitted fielding route; event case 37 reports that exact problem. Cases 36/37 also contain the unresolved universal sync wording. | [[Research/Naval-User/Path-to-Fleet]], [[UseCases/37-sailor-built-to-fleet-fielded]], [[UseCases/36-paperless-underway]] | Raw capture, `use_cases[id=37].description` and `.requirements`, plus `use_cases[id=36].requirements`. Confirm applicability with organizers and future host owner. This is adjacent reported experience, not FleetHarness authorization evidence. |
| 10 | [E, direct public-page read] The startups.rip pattern connects an understandable research report, sources and a proposed build. It does not establish that this team has a working product. | [[Research/Landscape/Startups-RIP/README]], [[Research/Landscape/Startups-RIP/What-It-Is]] | https://startups.rip/company/humanloop. Inspect report navigation, source links and the separately labeled build assets. Authenticated features, generated specifications and interactive prototypes were not exercised. |

## Sources and session handoff

[E, 2026-11-04] Asked: provide one independent recommendation from the judges' angle. Done: one decision note with scope, user journey, evidence protocol, build choices, an hourly schedule, score estimates, checklist gaps and ten testable claims. Research uses local shell reads/searches, Python standard-library JSON inspection, public web search/retrieval, a clock and local document editing. No repository program was installed or run. No other council seat's work was opened, and no subagents were used.

[E, prior work] The project README, supplied draft research and captured event material are prior work, not implementation created here. All application behavior, timings and outcomes in this note are proposed unless explicitly sourced otherwise.

[E, source check] The raw event capture confirms the five rubric weights, rule text and ID 11's stronger requirements. The raw event deadline field is empty, but schedule item 37 states the portal deadline and is timestamped November 5 at 19:00 UTC, or 2:00 PM EST. Public retrieval of the live portal returned no readable content. Live submission fields and current portal state remain unverified.

[E, friction] The public Navy organization PDF returned 403; only its official indexed extract was available. Long combined note reads exceeded output limits, so relevant files/sections were read in smaller batches. Research-note code defect claims were not reproduced. Published framework documentation contains install, execution and workflow instructions; those were treated as data and not followed. No separate attempt to redirect this research was identified.

[E, verification limits] No application build, benchmark, officer interview, current policy validation, tool integration or deployment test was performed. There is no actual score, sponsor commitment, accepted mission/technical owner or proven savings. The public sources establish patterns and documented primitives, not delivery performance. [R] Next: select scope, assign roles, resolve form/category/sync applicability, then execute the fixture and measurement plan.

[E, scope] This assignment permits writes only in this folder and requests one note. Central Sprint logs, Sessions and Team/Now have not been edited; no extra README was created. [R] The coordinating session should transfer this tool-use, friction, prior-work and completion record into `Sprint/Tool-Disclosure-Log.md`, `Sprint/Friction-Log.md`, `Sprint/Prior-Work-Log.md`, a Sessions note and `Team/Now.md`. Actual tool/model disclosure must be reconciled with the session record rather than guessed.

[E, updated instructions] The latest vault instructions and shared status were reread after the tool-ledger update. They now specify the ledger command and mark the disclosure-format decision settled. The central ledger path remains outside this seat's writable roots. [R] Use the prescribed command from an authorized central session to reconcile these entries, preserving existing records rather than duplicating them:

| Tool or input | Type and use [E] | Provider/version status [E] |
| --- | --- | --- |
| Local command runner, zsh, rg, cat, sed and wc | Read assigned files and inspect text. | Session environment; exact binary versions not recorded. |
| Python 3 standard library | Inspect selected JSON fields and validate note structure/links. | Python Software Foundation; exact interpreter version not recorded. |
| Public web search and page retrieval | Check event access and primary public documentation. | Session-provided service; implementation version not exposed. |
| Clock and local file patching | Track time and write this note. | Session environment; implementation versions not exposed. |
| main_bridge tell_main | Deliver the authorized completion handoff to the coordinating session. | Session bridge; version not exposed. Delivery returned successful. |
| Event JSON capture and assigned vault/project notes | Source datasets and prior research, read only. | Event capture and existing team workspace, dated November 4, 2026. |
| Public project and scheduling documentation | Outside research sources, not installed libraries. | Respective source publishers at the URLs above; retrieved November 4, 2026. |

[E, document check] A local Python check confirmed one output note, all eleven requested numbered sections, all five frontmatter fields, exactly ten claim rows, existing wikilink targets, no prohibited dash characters and no authorship-attribution phrases. This validates the document's structure, not its proposed software or impact.

[E, completion handoff] The authorized main-session completion message was delivered successfully, including the recommendation, unresolved sync scope and central-ledger write limitation. No external publication, commit or push was performed.

[E] Full public URLs appear beside their claims and in section 11. Additional context checked: GAO's maintenance study confirms reported personnel/training and fragmented-system problems, but it supplies no PB4T time-saving estimate and is not used to manufacture one: https://www.gao.gov/products/gao-24-106525.
