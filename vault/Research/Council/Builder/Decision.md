---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Build one local training schedule review tool, prove its limits, and defer the software factory."
---

# Build one training planner by downselect

## 1. Bottom line

[R] Build FleetHarness as a tool that finds double bookings in training requests, proposes a draft schedule, and lets the training officer review and print it without internet access.

## 2. User and job

[R] The one user is a ship's training officer preparing the next weekly Planning Board for Training (PB4T) draft. The one job is reconciling competing departmental training requests before taking a proposed calendar to human review. The prototype assists preparation; it does not issue training orders, certify readiness, or replace the command's approval process.

[P] Use case 11 describes weekly planning conflicts between departmental requirements, personnel availability and ship operations. Its full submission asks for departmental agents, qualification and fatigue constraints, alternate allocations and mandated periodicities. [E] I checked those requirements in the captured source record, rather than relying only on the research summary: `Sources/raw/events_norfolk_combined.json`, `use_cases` record with `id` 11. See [[UseCases/11-pb4t-planning-board-for-training-autonomous-deconfliction-ag]].

[A] The working account of today's task is that departments bring proposed events, the training officer compares people, resources and windows, and participants negotiate revisions. The actual spreadsheet, meeting sequence, approval chain, preparation time and frequency of collisions at a specific command are not verified. [R] Before coding, ask an available training officer or chief to walk through an entirely invented example. Record what they confirm. If no appropriate person is available, describe this as a synthetic scheduling experiment based on the submitted problem.

[R] Measure the whole preparation task, including the work shifted onto other people:

| Measure | Method |
| --- | --- |
| [R] Active person-minutes | Time input preparation, manual checking, corrections, review and export for both a manual reference method and the app. Sum across participants. Record waiting time separately. |
| [R] Correctness | Independently check that every required event appears once, every assignment is permitted, and no declared hard constraint is violated. A quicker invalid calendar fails. |
| [R] Correction burden | Count manual moves, repeated field entry, missed collisions, help requests and rejected suggestions. Include input conversion. |
| [R] Recovery | Record whether an acknowledged save survives closing and restarting the application while disconnected. |
| [R] Engineering burden | Separately record development, setup and repair time. Do not call developer time saved deckplate time saved. |

[R] Use matched synthetic scenarios with different labels and the same difficulty. Reverse manual/app order between participants where possible; disclose actual sample size, reviewer background and practice effects. If the person's current method is unavailable, call the comparison a manual grid exercise, not their current workflow. Report raw observations and failures. Net active time removed equals manual preparation plus review, minus assisted preparation, review and reconciliation. Record one-time setup and orientation separately. [E] No baseline or saving was measured for this decision. [R] Do not annualize a rehearsal or invent hours returned to the Fleet.

[R] Choose this over message extraction because the small scheduling problem has explicit, checkable answers and can use a deterministic local engine. A realistic message extractor would add ambiguous interpretation, routing rules and extraction-quality evaluation; a cloud extractor would also add a disconnected-runtime problem. [P] Those extraction requirements are present in ID 24's source record. [A] This is a delivery-risk judgment, not a finding that scheduling has greater Fleet value.

## 3. The first 60 seconds

[R] These are proposed screens and timing targets, not an existing interface or measured usability result. Implement them as states of one local page. A technical teammate launches the packaged app before the officer sits down; installation time is measured separately.

| Elapsed time | Exactly what appears | Exactly what the officer does |
| --- | --- | --- |
| [R] 0 to 10 seconds | **Training draft**. Persistent notice: **Synthetic demonstration. Local draft only. No government connection.** One button: **Try sample week**. Small text states the six-request limit. | Selects **Try sample week**. No sign-in, blank chat prompt, model selection or framework choice. |
| [R] 10 to 25 seconds | **Check requests**. Six rows grouped by Engineering, Weapons and Combat Systems. Columns show event, proposed time, allowed alternatives, room and fictional role/group requirements. Two rows are flagged because they need Role A and Room 1 at the same time. | Opens the flagged pair. Reads the two row IDs and the shared-resource explanation. Confirms the supplied rules for this demonstration. |
| [R] 25 to 40 seconds | **Find a draft**. The existing conflict remains visible while the app computes. The result is a table showing every event, its proposed placement and any move from the requested time. | Selects **Find draft**. Sees one conflicting event move to an explicitly allowed later placement. |
| [R] 40 to 50 seconds | **Why this works** beside the moved row. It shows the original request IDs, the allowed alternative and results of the independent constraint check. It states that Navy policy compliance has not been validated. | Opens the moved row and checks the reason against the original request. |
| [R] 50 to 60 seconds | **Review draft**. Buttons: **Return to requests**, **Mark reviewed for demo**, **Export CSV**, **Print draft**. Export stays disabled until the displayed revision has passed checks and has been reviewed. | Marks this revision reviewed and exports its local CSV. The output is headed **Draft for human review**. Nothing is transmitted. |

[R] The rest of the demonstration takes about two more minutes: select the impossible fixture, see both conflicting requests retained with no valid draft; then cold-start with external networking disabled, change an allowed placement, save, restart and recover it. Show that changing an input invalidates earlier results and review. Do not spend the first minute watching code generation.

## 4. Scope

[R] Demonstrate exactly one case: **ID 11, PB4T (Planning Board for Training) Autonomous Deconfliction Agent**, as a deliberately limited scheduling slice. [P] The name and full requirements were checked against the raw record. [R] Label it **Partial use case 11: synthetic training deconfliction** everywhere coverage is stated. Do not claim the full submitted case is complete.

| Part | Thursday commitment and disclosure |
| --- | --- |
| [R] Data | Six wholly invented instruction events in a fictional week, three departmental labels, two rooms and generic roles/groups. No real names, unit, watchbill, qualification roster, availability, readiness or training posture. Include feasible, impossible and malformed variants with a provenance manifest. |
| [R] Input surface | Select bundled fixtures and edit existing rows through bounded fields. At most six events and four explicit allowed time/room placements per event. Reject unsupported size and malformed or duplicate IDs. No arbitrary document upload, OCR, calendar connector or natural-language policy ingestion. |
| [R] Real computation | Detect shared room, group and role collisions. Assign every mandatory event exactly once within its allowed placements and supplied unavailable windows. Find the first valid complete assignment using a fixed order. Do not claim optimality. |
| [R] Bounded search | Enumerate at most 4^6 = 4,096 complete assignments, with early rejection of invalid combinations. Exhaustion can establish impossibility only within this finite supplied model. A timeout, stop or incomplete search returns **No answer obtained**, never **Impossible**. |
| [R] Explanation | Identify the source rows and rule IDs for detected conflicts and explain changed placements. For the deliberately impossible two-event fixture, show the shared-resource contradiction. For other unsatisfied cases, show search exhaustion and observed blockers; do not promise a minimal conflicting subset. |
| [R] Independent checking | A separate checker validates any proposed assignment against the input contract. The checker must not call the searcher's validity helper. A human reviews the fixtures and expected outcomes before implementation. |
| [R] Local workflow | Durable save, original input retained, revision history, stale-review invalidation, explicit review, local CSV export and browser print. Record runs, failures and review actions against input and application versions. |
| [R] Qualification and fatigue | Generic eligible-role labels and a supplied minimum-gap rule are executable demonstration constraints. Display their invented provenance. They are not verified Navy qualification or fatigue policy. |
| [R] Deliberately absent | Autonomous departmental agents and negotiation, authoritative rosters, SFTRM periodicity compliance, real operational windows, authentication, enterprise integration, shared editing and synchronization. These are omissions, not completed integrations behind a simulated badge. |

[R] Do not build fake agent conversations, a fake TORIS connector or a fake approved calendar. The department labels organize requests; they are not three agents. The review action records a local demo decision; it does not authenticate an officer or confer command authority. Use **Not implemented** for omitted integrations. Use **Not verified** for field suitability and user benefit.

[R] Keep the acceptance set small but consequential:

1. [R] A feasible conflicting input produces a complete valid alternative; a held-out variant changes the collision and cannot pass through a hard-coded answer.
2. [R] An impossible pair remains impossible: no dropped event, invented room, unqualified substitute or silently relaxed window.
3. [R] Adjacent intervals follow the approved boundary rule; an overlap and the supplied minimum-gap violation are rejected.
4. [R] Missing fields, invalid durations, duplicate IDs and out-of-scope inputs produce specific errors. Instruction-like event text remains inert and is safely rendered.
5. [R] A deliberately corrupted solver output fails the independent checker and cannot become a reviewed export.
6. [R] An input edit invalidates the prior draft/review; acknowledged saves survive restart; interrupted work is never shown as reviewed.
7. [R] The declared workflow cold-starts and completes with external networking disabled, and a second person can replay the bundle.

[E] None of these application checks has been executed by this research. [R] Status must remain proposed until actual evidence is attached to an identified artifact.

## 5. Disconnected

[R] Promise **single-laptop offline operation after local setup**. Do not promise disconnected fleet installation, two-device collaboration or offline software generation.

| Function | No external network |
| --- | --- |
| [R] Open UI, choose fixtures, edit bounded inputs | Works if the installed local runtime and assets are present. |
| [R] Check conflicts, generate a bounded draft, inspect reasons | Works locally; no language model is called. |
| [R] Save, close, reopen, review, export CSV | Works against the local store. Files remain on this laptop. |
| [R] Print draft | Browser print/save-to-file can work locally; a remote printer is not promised. |
| [R] Fresh authoritative data, shared approval, shore delivery | Does not work; no connector or transport is implemented. |
| [R] Synchronization after reconnect | Not implemented. Reconnection does not publish or overwrite anything. |
| [R] Coding, web research and model-assisted repairs | The confirmed event coding path requires connectivity. No offline model or cached full development environment is promised. |

[R] Put HTML, JavaScript, styles and fixtures in the bundle. Use no CDN, web fonts, analytics, remote identity, license check or model endpoint at runtime. Stage the documented Python prerequisite before the disconnect test. Start a fresh process in a new directory and browser session with Wi-Fi, Ethernet and other external routes disabled, leaving loopback available. Inspect requests and exercise edit/save/restart/export. If only the original development laptop is tested, report exactly that; a new folder does not establish a clean machine or government-device install.

[R] Keep a second offline copy of source, fixtures, launch instructions, checksums and evidence. The technical owner should record runtime/OS prerequisites and backup/restore steps. A source archive is not a self-contained installer. Device permissions, storage protection, software approval, patching and sustainment remain transition work.

[E] The raw ID 36 requirements contain a Fleet-ready checklist described there as applying to all solutions, including reconnect synchronization. [[Reference/Open-Questions]] still lists the authoritative event-wide definition as unresolved. [R] Have the submission lead obtain an organizer interpretation early. Do not quietly equate CSV export with synchronization. If that checklist governs every entry, this proposal has an explicit gap and must be rescoped before claiming compliance.

## 6. How it gets built

[R] Use the already confirmed event coding access as a development tool, with a person operating it. Build a small Python service bound to `127.0.0.1`, local SQLite storage, plain HTML/JavaScript and a deterministic search module. Use the installed Python standard library for the demo server, CSV, JSON and tests. Avoid React scaffolding, a package manager, cloud deployment and a new solver dependency for this finite problem. Keep the code compatible with the checked interpreter.

[E] A local interpreter check during this decision returned Python 3.9.6 and an available SQLite module, version 3.51.0. This verifies those prerequisites on this laptop only. [V] Python documents SQLite as a local database without a separate server; it also explicitly limits `http.server` to a basic server unsuitable for production. [R] Use that server only for this synthetic, loopback demonstration. Source: [SQLite module documentation](https://docs.python.org/3/library/sqlite3.html) and [HTTP server documentation](https://docs.python.org/3/library/http.server.html).

[R] Build the solver first through a command-line input/output contract, and then connect the same function to the page. Let the second implementer own the checker, holdout fixtures and persistence/export tests. Do not spend the sprint writing an adapter that drives a coding process from the officer's browser. One developer can copy a bounded approved task into the existing coding session, inspect the diff, and run the fixed checks.

| Event tool | Decision |
| --- | --- |
| [R] Codex on the event key | Use for implementation and repair through the current working path. Record the actual model ID, use, failures and elapsed effort. Stop after two unsuccessful repair attempts on the same issue and simplify with the technical reviewer. No custom API integration is needed. |
| [R] Google environment, Gemini, Cursor, Grok and Ark | Keep outside the critical path. A newly working account is not a reason to rewrite the app. The present access evidence is in [[Research/00-Brief]] and [[Team/Now]]. |
| [R] UDS and Zarf | Later packaging experiment if an actual target and owner need them. Do not install a cluster to prove this local scheduling task. |
| [R] If only Codex access works | The whole proposed app and demonstration still fit this architecture. If access later fails, preserve the last working artifact and continue manual repairs and documentation; remove claims that cannot be completed. |

[R] Borrow design ideas from the four projects, without importing their code or installing their engines:

| Project | Borrow now | Skip now and source check |
| --- | --- | --- |
| [R] SWE-AF | A bounded issue with allowed files, explicit acceptance criteria, a separate change workspace, limited repair and a retained failure record. | [V] Its public README describes an issue/worktree/review loop. [R] Skip the orchestrator, runtime routing and automated merge/PR machinery. [Source](https://github.com/Agent-Field/SWE-AF). See [[Research/Projects/SWE-AF/FleetHarness-Fit]]. |
| [R] SuperPlane | One work record containing approved requirements, current state, actual test output, artifact identity and final human decision. Plain files suffice. | [V] The single-VM installation guide requires Linux, Docker Compose, infrastructure access and network setup. [R] Skip that installation and its repository/integration services. [Source](https://docs.superplane.com/self-hosting/single-vm/). See [[Research/Projects/SuperPlane/FleetHarness-Fit]]. |
| [R] Symphony | One task at a time, a known workspace, bounded attempts and preserved evidence before cleanup. | [V] The pinned README describes an engineering preview and an Elixir reference implementation. [R] Skip the daemon, issue tracker and worker-protocol integration. [Pinned source](https://raw.githubusercontent.com/openai/symphony/be10a1b79df723d6d7612b5651c8522704dafb2e/README.md). See [[Research/Projects/Symphony/FleetHarness-Fit]]. |
| [R] Aperant | A versioned specification, explicit subtasks and visible separation of code completion from human acceptance. | [V] The inspected revision has an AGPLv3 license; the current repository describes a desktop coding framework. [R] Skip desktop integration and copied source/prompts. No detailed license interpretation is needed to borrow general process ideas. [Pinned license](https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/LICENSE), [project](https://github.com/AndyMik90/Aperant). See [[Research/Projects/Aperant/FleetHarness-Fit]]. |

[E] Primary-source checks support these limited statements. They do not reproduce the draft research's code-level defect reports or show any platform running on the event account. A pinned SWE-AF README retrieval failed; its current public README was readable. [R] The rejection of integration rests on unnecessary setup and missing mission work, not on assuming those projects are broken.

[R] Human controls must be concrete:

| Control | Implementation and demonstration |
| --- | --- |
| [R] May do | Read bundled synthetic fixtures, propose/check schedules, save local drafts and export the specifically reviewed revision. |
| [R] Must never do | Read real operational sources, issue orders, alter authoritative records, change hard constraints silently, transmit data, publish code or claim deployment approval. Supply no connector or runtime credential for these actions. |
| [R] Approval | A domain reviewer approves the example rules before implementation. The technical reviewer approves changes to the checker. The operator reviews a checked draft before local export. Input changes invalidate review. External publication remains a separate human action. |
| [R] Monitoring | Show current input revision, computation/check status and local save/review state. Retain timestamps, rule IDs, tests, failures and artifact identity. Do not call a local audit record tamper-proof. |
| [R] Escalation | Missing/contradictory rules, invalid output or exhausted repair attempts stop promotion. The app names the problem and asks for input correction or technical review. No automatic hard-rule relaxation. |
| [R] Shutdown | The launcher documents how the operator terminates the local service. Demonstrate process termination, loss of the listening port and preserved acknowledged saves. Stop the development coding session separately with its existing controls. An incomplete run cannot acquire a reviewed export. |

[R] No runtime agent is necessary for this product. Entering a general innovation category is more honest than dressing a deterministic solver as autonomous negotiation.

## 7. README pipeline and use case catalog

[P] The project README proposes a development pipeline, allows different application architectures, makes the portfolio dashboard optional and selects three distinct proof areas. [E] Reading it does not establish that any stage is implemented; `rg --files` in the project returned only `README.md` during this review. [R] Explicitly amend the downselect promise rather than presenting one application as fulfillment of all three experiments.

| Element | Decision |
| --- | --- |
| [R] README process: clarify, research, specify, build, test/repair, package | **In as the team's supervised work method.** Preserve approved requirements, component decisions, test commands/results and the delivered revision for this one app. |
| [R] General automated software factory | **Later.** One hand-built app supports a useful workflow experiment; it does not prove automatic or repeated use-case-to-app generation. Do not imply otherwise. |
| [R] Three different initial applications | **Later.** Message extraction and a separate offline synchronization app receive no Thursday engineering allocation. Offline use is a property of the training tool, not completion of ID 36 or ID 45. |
| [R] All 34 applications or generated repositories | **Out of the downselect promise.** [E] The captured raw inventory does contain 34 records. That count does not establish feasibility or coverage. |
| [R] One readable case/evidence page | **In, using the submission brief and a simple local link.** Show user, source, limits, launch steps, actual tests and next decision. Avoid a second content management product. |
| [R] A startups.rip style catalog of 34 researched pages | **Later.** No catalog search, research chat, autonomous report generation or repeated page templates before the core works. |

[V] The public Preflight page on startups.rip exposes a structured report, section navigation and sources: [observed page](https://startups.rip/company/preflight). [R] Borrow the readable decision packet. Do not copy a failure narrative, assert that existing Navy systems failed, or suggest that a report proves working software. The broader pattern research is in [[Research/Landscape/Startups-RIP/README]].

[R] I agree with making the officer's experience more specific and simpler. I would change the object of that effort: make the officer's training preparation simpler before making software creation self-service. No comparison trial establishes that C3, Maven or Lovable cannot support this task. [[Research/Landscape/Defense-Platforms/Comparison]] leaves several exact deployment capabilities unverified. The Thursday claim should concern the task we demonstrate, not superiority over those platforms.

## 8. Plan

[A] Assume two technical implementers and one part-time domain/submission lead, with roles accepted before noon Wednesday. These are staffing assumptions, not people already assigned. Start at noon November 4, leaving 26 calendar hours. [P] The venue closes at 8 PM and Thursday has an 8 AM kickoff; the portal cutoff is 2 PM Thursday, per [[Event/Schedule]].

[A] Budget about 20 technical person-hours: contract/fixtures/checker 3, bounded solver 3, UI 4, persistence/review/export 3, integration/offline/package 4, defect reserve 3. This is roughly twice a naive nine-to-ten-hour coding estimate. It requires about ten focused hours from each technical implementer; it is tight after meals and handoffs. The submission lead separately owns interviews, portal requirements, evidence wording and submission preparation. Do not allocate an overnight development shift.

[R] Proposed schedule, all times EST. A is the main implementer, B is the independent checker/integration implementer, and C is the domain/submission lead. These are people/work assignments, not a multi-agent run.

| Time | A and B | C, gates and cuts |
| --- | --- | --- |
| [R] Wed 12 to 1 PM | Agree six-event contract; A creates input/output skeleton, B writes independent answer keys. | Confirm user walkthrough, available people, team submission access, actual form/category and the Fleet-ready checklist's authority. No new service setup. |
| [R] 1 to 2 PM | A implements collision detection; B builds independent assertions and malformed fixtures. | Record current-process uncertainty and manual reference task. Draft problem statement. |
| [R] 2 to 3 PM | A implements finite search; B tests complete, invalid and impossible outputs. | Gather safe feedback on the review flow. Gate: command-line feasible and impossible cases must work by 3 PM. |
| [R] 3 to 4 PM | A serves the local page; B connects durable input/revision storage and validates restart behavior. | Draft scope, data provenance and explicit omissions. Cut a custom evidence viewer; link raw results. |
| [R] 4 to 5 PM | Wire edit/check/find-draft/review/export to the same core. Pair on integration defects. | Try the first 60 seconds. By 5 PM require an end-to-end local draft and CSV, not separate components. |
| [R] 5 to 6 PM | Eat in turns. Test input edits, stale review, bad output blocking and persistence. | Prepare manual/app comparison and disclosure entries. Cut general input editing down to supplied dropdowns if needed. |
| [R] 6 to 7 PM | Disable external network; cold-start and replay; test service shutdown and retained state. | Collect actual timings and correction counts if reviewers are available. Record failures as well as successes. At 6 PM, apply the reduced-scope fallback below if the solver is still unreliable. |
| [R] 7 to 8 PM | Freeze a runnable checkpoint; copy bundle/evidence locally and rehearse restart. | Finish a submission draft and make the departure handoff. Leave by the 8 PM venue closure. |
| [R] 8 to 9 PM | Travel, food and decompression. No critical integration work. | No venue access assumed. |
| [R] 9 to 10 PM | Optional off-site review of already saved instructions, maximum one hour. No new dependency or architecture. | Edit submission wording from existing evidence. This hour is expendable if travel/access makes it impractical. |
| [R] 10 to 11 PM | Stop work and wind down. | Confirm Thursday responsibilities. |
| [R] 11 PM to midnight | Sleep. | Sleep. |
| [R] Thu midnight to 1 AM | Sleep. | Sleep. |
| [R] 1 to 2 AM | Sleep. | Sleep. |
| [R] 2 to 3 AM | Sleep. | Sleep. |
| [R] 3 to 4 AM | Sleep. | Sleep. |
| [R] 4 to 5 AM | Sleep. | Sleep. |
| [R] 5 to 6 AM | Sleep. | Sleep. |
| [R] 6 to 7 AM | Sleep. | Sleep. |
| [R] 7 to 8 AM | Breakfast and travel. No assumed early development access. | Recheck logistics. |
| [R] 8 to 9 AM | Attend kickoff; restart exact bundle and run smoke checks afterward. | Recheck portal fields/deadline and submission draft. |
| [R] 9 to 10 AM | B or a second operator replays setup offline; A fixes only blocking defects. | Complete manual/app measurements or record that burden reduction is unverified. |
| [R] 10 to 11 AM | Run final holdouts, save/restart, invalid-output and boundary checks. Freeze behavior at 11 AM. | Write the result, actual sample size, limitations, ownership gaps and 30/60/90-day plan. |
| [R] 11 AM to noon | Package the exact tested source, fixtures, prerequisites, run instructions, evidence and checksums. Eat in turns. | Complete tools/models/data/services, prior work, friction, rights/restrictions and all submission text. |
| [R] Noon to 1 PM | Rehearse the frozen artifact and prepare a local backup recording. No features. | Team reviews every claim against evidence and completes actual portal fields. Have the authorized team member target submission by 1 PM. |
| [R] 1 to 2 PM | Preserve the runnable version; resolve only submission or critical demo blockers. | Submission lead verifies receipt and retains permitted confirmation. Reserve the full hour for portal trouble. Deadline is 2 PM, not a feature target. |

[R] Cut in this order: custom evidence viewer, breadth of editing, elaborate calendar layout if someone starts one, and any effort to optimize the number of moved events. The baseline table and first valid assignment are enough. Do not begin a second case with spare time; replay and measure the first.

[R] Hard fallback: if the solver is unreliable at 6 PM Wednesday, ship the same tool as **training conflict review**. It detects conflicts, permits manual selection of an allowed alternative, reruns the checker, saves and exports a reviewed draft. State that automatic alternative generation was removed. This preserves a complete useful workflow while lowering the claimed scope and expected score. If checking, persistence or reviewed export is still unreliable Thursday at 10 AM, drop the broken promise and report the verified technical finding; do not replace missing behavior with a canned successful result.

[R] With only one implementer, use that reduced scope from the start. Never cut the independent correctness check, synthetic-data boundary, failure disclosure, local-save test, sleep or submission window to protect an automation claim.

## 9. Scoring and submission gaps

[P] The five weights and 0-to-100 criterion scale come from [[Event/Judging]]. [A] Estimates below assume the bounded solver version works and the stated evidence is collected. They are engineering judgment, not judge forecasts, with at least 15 points of uncertainty per criterion. They deliberately discount synthetic-only validation and partial case coverage.

| Criterion | Weight [P] | Estimate [A] | Evidence to earn it and remaining weakness |
| --- | --- | --- | --- |
| Warfighting and deckplate impact | 30% | [A] 55/100 | [R] A named preparation task with raw manual/app observations and no invalid schedules. [A] No validated recurring hours saved; a tiny fixture is weak evidence of operational impact. |
| Speed to Fleet | 20% | [A] 65/100 | [R] Cold start and complete task offline with an explicit prerequisite list. [A] Government-device install, cybersecurity review and sustainment are unresolved. |
| Fleet scalability | 20% | [A] 50/100 | [R] Show configuration and a held-out input, plus understandable exports. [A] Six-event limits, no authentic policy model and no second command or class trial constrain reach. |
| Barrier removal | 15% | [A] 60/100 | [R] Measure fewer manual conflict checks and repeat entries; document access/integration barriers. [A] The authoritative calendar handoff remains manual. |
| Judges' discretion | 15% | [A] 75/100 | [R] A working review flow, a credible impossible case and honest offline evidence. [A] Innovation is chiefly the constrained user experience and evidence, not a novel algorithm or agent platform. |

[A] Using the weighted-sum interpretation, the illustrative total is about 60/100. The event note itself marks that aggregation formula as an assumption. [R] Prefer a defensible result at this level to unsupported scores in the eighties. The fallback loses automatic scheduling and should be rescored downward after seeing what actually works.

[E] This is still a decision note, so no build or submission checkbox is complete because of it. [R] Close the following gaps against [[Sprint/Submission-Checklist]]:

| Checklist area | Gap and action before submission |
| --- | --- |
| [R] User, problem, present process, burden | Persona and task proposed; obtain a permitted walkthrough and actual observations. If unavailable, disclose a synthetic reference process and unmeasured benefit. |
| [R] Category and OSW ROI | Propose **Bring Your Own Idea**, with **Clarifying friction points to agile delivery** as primary ROI, supported by the blocker log and reproducible delivery evidence. Confirm how the portal maps the conflicting category lists. Avoid claiming the Naval Agentic AI category's multi-agent requirements are met. |
| [R] Observable build and permitted data | Must attach runnable artifact, exact revision, real test outputs and fixture manifest. Synthetic-only label must survive screenshots, exports and the recording. |
| [R] Human authority | Must demonstrate the controls in section 6, including export review, failed-result blocking and shutdown. No authenticated role separation is claimed. |
| [R] Fleet conditions | Need actual offline/restart evidence and prerequisite inventory. Identity, device protection, installation authority, patching and shared-data handling stay explicit transition gaps. Resolve whether reconnect sync is universally mandatory. |
| [R] Disclosure and prior work | Merge tools, actual model IDs, datasets, services, prior research and borrowed design patterns into central logs. Identify any copied code and its license separately. This plan adopts no upstream engine. |
| [R] Contribution rights | Submission lead confirms contributor ownership, employer/government restrictions and third-party notices against governing terms. No approvals or rights are established by this note. |
| [R] Beyond Friday | Obtain actual accepting mission and technical owners. Until then, mark **unassigned** beside the proposed training-officer mission role and maintainer technical role. Include next experiment, resources and conditional milestones below. |
| [R] Actual submission | The form has not been verified for this decision. Confirm team access, required fields, attachments, presentation limits and receipt process early; do not discover them at 1:55 PM. |

[R] Proposed transition: at 30 days, the accepting mission owner validates a safe task model, the real approval chain, baseline burden and whether an existing tool already solves it. At 60 days, the technical owner tests representative authorized rules, packaging, storage/security, backup and export compatibility in an approved nonproduction environment. At 90 days, decide pilot, integrate, revise or stop from observed user benefit, correctness and sustainment cost. No milestone is a deployment promise.

[R] Next experiment is a matched manual/app trial on owner-approved synthetic schedules, including contradictions and a realistic handoff. Required resources are domain-review time, a maintainer, a permitted test device, reviewed public policy references, an approved evaluation environment and a confirmed installation/authorization path. [A] Those owners, resources and permissions are not confirmed here.

## 10. What I would have to be wrong about

| Evidence that would flip the recommendation | Consequence |
| --- | --- |
| [R] A real training officer shows that data preparation and policy reconciliation dominate the job, and this bounded input model does not reduce total work or cannot produce a usable PB4T handoff. | Withdraw the training-planner claim. Do not treat a faster solver as a solved user problem. |
| [R] An available, authorized incumbent completes the same task, impossible case and offline/export checks with equal or lower total effort. | Reuse/evaluate that tool and contribute fixtures and evidence rather than a redundant application. |
| [R] Organizers require full case-11 compliance, mandatory runtime agents, authoritative periodicities or universal reconnect synchronization for eligibility, rather than allowing an explicitly partial observable prototype. | This scope is inadequate. Resolve the requirement at noon Wednesday and change the entry/scope then. Do not add an untested negotiation or sync facade Thursday. |
| [R] A teammate already has a permitted message extractor or other app passing meaningful independent tests, with a reviewing mission user and a reproducible offline path. | An existing proven workflow has lower completion risk than starting this scheduler. Require a run and evidence, not a feature list. |
| [R] An already available factory completes an approved task, a real failing-test repair, independent acceptance, human handoff and cancellation in under an hour without taking implementers from the app. | The orchestration integration cost assumption is wrong. Reuse it behind the same one-app scope; factory generality still needs a separate trial. |
| [R] Two technical people are unavailable, or the first executable feasible/impossible/checker gate fails at 3 PM. | Move immediately to the conflict-review fallback. Do not retain the full promise on the strength of expected coding speed. |

[A] The most vulnerable assumption is that the small synthetic training model resembles a job worth doing. The most dangerous schedule assumption is that UI, persistence, evidence and packaging are negligible once a solver works. [R] Resolve the first with a user and budget the second explicitly.

## 11. Claims relied on

[E] Verification was performed on November 4, 2026. Public pages are primary project/documentation sources, not independent performance studies. Event notes are captured summaries; the live portal was not revisited. Paths below are relative to `/Users/mukul/Documents/CDAO/Fleethacker-Vault` unless absolute.

| # | Claim and status | Source note and underlying URL or file | What the verifier should test |
| --- | --- | --- | --- |
| 1 | [P] Submission is due Thursday November 5 at 2 PM EST; the venue closes at 8 PM. | [[Event/Schedule]]; `Event/Schedule.md`, schedule capture dated 2026-11-04. | Current portal schedule, closure and required submission path. |
| 2 | [P] Impact and speed together receive half the rubric; scalability, barrier removal and discretion remain separate criteria. | [[Event/Judging]]; `Event/Judging.md`, five-row weight table. | Current criterion names, weights, scale and aggregation. |
| 3 | [P] Rules require an observable result, a named user/burden, permitted data, human authority and a transition plan; Bring Your Own Idea is a listed category. | [[Event/Rules]], [[Sprint/Submission-Checklist]]; `Event/Rules.md`, rules 2, 3, 4, 6, 9, 11 and categories. | Governing rules and actual form; especially partial-prototype eligibility and category mapping. |
| 4 | [P] Full ID 11 is substantially larger than a conflict checker: agents, shared constraints, alternatives and periodicities are requested. | [[UseCases/11-pb4t-planning-board-for-training-autonomous-deconfliction-ag]], [[Research/UseCase-Map/PoC-Mapping]]; `Sources/raw/events_norfolk_combined.json`, `use_cases[id=11]`, name/description/requirements. | Compare the raw source to every coverage claim. Source record was directly checked in this review. |
| 5 | [E] The captured inventory has 34 use cases; the local project's visible file listing contains only a README, which proposes three proof areas and makes a dashboard optional. | [[Research/FleetHarness/README]]; raw `use_cases` array count; `/Users/mukul/Documents/CDAO/FleetHarness/README.md`; read-only `rg --files` observation. | Inventory currency and whether teammates have since produced implementation elsewhere. A file listing is not a history audit. |
| 6 | [E, prior session evidence] Event-key coding access is the one confirmed working tool path in the brief/current status; other event access is not established there. | [[Research/00-Brief]], [[Team/Now]]; `Research/00-Brief.md`, fixed facts; `Team/Now.md`, blocking/status entries. | Current team access and approved execution path. Not freshly authenticated by this review. [[Resources/Documents]] contains an older pending-login status. |
| 7 | [E/V] This laptop has Python and SQLite available; their documentation supports a small local data/server prototype, with a production limitation on the proposed HTTP server. | [[Research/Build-Patterns/Build-Options]]; local interpreter/module check in this review; https://docs.python.org/3/library/sqlite3.html and https://docs.python.org/3/library/http.server.html. | Launch from the final bundle on the stated machine, persist/recover data and work offline. Availability is not an application test. |
| 8 | [V/R] The named orchestration projects provide useful engineering patterns but add setup that this one app does not require. Their event compatibility is not proven here. | [[Research/Projects/SWE-AF/FleetHarness-Fit]], [[Research/Projects/SuperPlane/FleetHarness-Fit]], [[Research/Projects/Symphony/FleetHarness-Fit]], [[Research/Projects/Aperant/FleetHarness-Fit]]; https://github.com/Agent-Field/SWE-AF; https://docs.superplane.com/self-hosting/single-vm/; https://raw.githubusercontent.com/openai/symphony/be10a1b79df723d6d7612b5651c8522704dafb2e/README.md; https://github.com/AndyMik90/Aperant. | Check primary setup paths, then demand a timed local proof if proposing adoption. This recommendation does not depend on unreplicated defect reports. |
| 9 | [V/R] The observed startups.rip report structure can inform one readable case packet; it does not establish that a catalog or generated specification proves a working application. | [[Research/Landscape/Startups-RIP/README]], [[Research/Landscape/Startups-RIP/Anatomy-of-a-Report]]; https://startups.rip/company/preflight. | Inspect the report/navigation/source structure and separate it from runtime evidence. The proposed Fleet page is a design inference. |
| 10 | [A] Two implementers can finish the bounded local workflow in about 20 technical person-hours, and the intended user will find it worth reviewing; neither delivery speed nor task savings has been demonstrated. | [[Research/Build-Patterns/Build-Options]], [[Research/Naval-User/Workflows]], [[Research/Naval-User/Simplicity-Requirements]]; those Markdown files and this note's sections 2, 4 and 8. | Confirm people, pass the 3 PM/5 PM gates, obtain a user walkthrough, and measure total burden. Reject the estimate if those observations fail. |

### Local research log and session handoff

[E] Asked: choose one deadline-sized product and demonstration, examine the required research from a build-feasibility angle, and write this decision. Done: this note, with one recommended app, exact limits, a finite correctness contract, staffing/cut gates, a complete calendar plan and ten verifiable dependencies. This is research, not application implementation.

[E] Tools used: local shell file search/read, Python standard-library JSON inspection and interpreter/module checks, public web retrieval/search-in-page, a clock and local Markdown editing. No repository software was executed or installed. No application tests, model/runtime benchmarks, sign-in, credential handling, commits, pushes or external publication were performed. No sub-agents were used.

[E] After the tool-ledger instruction arrived, the prescribed `fh.py tool` command was attempted for Python 3.9.6. It failed with `PermissionError` when writing `Sprint/Tool-Disclosure-Log.md`, outside the writable workspace. No approval escalation is available in this session. [R] The coordinator should register or reconcile these entries using the prescribed command in an authorized context:

| Name/version | Type | Use | Provider |
| --- | --- | --- | --- |
| [E] Local shell, rg, cat and sed; versions not checked | Research tooling | Read and locate permitted source files; inspect the project file listing. | Local system tools |
| [E] Python 3.9.6, standard-library json/re/pathlib and sqlite3 | Research tooling/library | Inspect selected event records, check runtime availability and validate this note. | Python distribution; SQLite library 3.51.0 observed |
| [E] Public web retrieval and search-in-page; version not exposed | Outside service | Read primary project pages and documentation; no authenticated interaction. | Session web tool and cited public sites |
| [E] Clock and local Markdown patch tool; versions not exposed | Research tooling | Track the deadline and create this decision note. | Session tools |
| [P] Event use-case snapshot dated 2026-11-04 | Dataset | Check inventory count and selected requirements, especially ID 11. | Event portal capture already in the vault |
| [E] Existing vault research and project README | Prior work | Compare draft findings and narrow the build recommendation. | Existing project and vault notes |
| [E] fh.py, local vault revision not checked | Ledger tooling | Attempt the newly prescribed tool registration; write was denied. | Existing vault tooling |
| [E] Main-session bridge tell_main; version not exposed | Internal coordination tool | Deliver a short completion handoff pointing to this note and the shared-log blocker; tool returned Delivered. | Session bridge |

[R] Reconcile the active session model from its actual runtime record. Its exact model ID was not exposed to this review; do not infer it from the project brief's previously observed model. If a main-session completion handoff is attempted, disclose the bridge tool and its actual result as well.

[E] Prior work used: the existing project README, event snapshots/raw use-case records, draft research and public documentation. The four orchestration projects and startups.rip are pre-existing subject matter. This review adopts no upstream code. Public source instructions, including prompts and setup suggestions, were treated as data and were not executed.

[E] Friction: live form/team status, current portal rules and event-wide synchronization authority remain unverified. Initial broad research reads exceeded output limits; targeted reads supplied the decision-specific material. Pinned SWE-AF README retrievals and Aperant's raw-license endpoint returned cache misses; the current SWE-AF README, pinned Symphony README and Aperant's pinned GitHub license page were readable. No runtime adoption trial was permitted by the brief or performed.

[E] Shared-log boundary: the brief requires writes only in this folder, and central Sprint, Sessions and Team paths are outside the writable workspace. They were not updated. [R] During council consolidation, transfer this activity into [[Sprint/Tool-Disclosure-Log]], [[Sprint/Friction-Log]], [[Sprint/Prior-Work-Log]], a Sessions note and [[Team/Now]]. Add actual session/tool identity from the session record through the team's disclosure process. This local handoff does not settle the open disclosure question.

[R] Next: obtain the reviewer decision, confirm people and portal eligibility, then either accept this bounded contract or take the documented reduced scope. Only actual implementation evidence may change proposed statuses to passed.

[E] Document verification passed: required frontmatter; eleven requested numbered sections; ten claim rows; all five score estimates labeled; existing local wikilink targets; forty-character pinned source revisions; no placeholder tokens; and no em or en dashes. Only `Decision.md` was created in this folder. These are document checks, not prototype or event compliance tests. [E] The main-session completion handoff was delivered through the bridge; no shared vault files were changed by that handoff.

## Sources

- [P] [[Research/00-Brief]], [[Event/Rules]], [[Event/Judging]], [[Event/Schedule]], [[Sprint/Submission-Checklist]], [[Team/Now]] and [[Reference/Open-Questions]].
- [P] `/Users/mukul/Documents/CDAO/FleetHarness/README.md`.
- [P] `/Users/mukul/Documents/CDAO/Fleethacker-Vault/Sources/raw/events_norfolk_combined.json`, only `use_cases` structure/count and records 11, 24, 36 and 45 were inspected for this decision. No theme or contact fields were used.
- [E] Draft research notes cited throughout are inputs and interpretation, not independent verification of the applications they propose.
- [V] https://docs.python.org/3/library/sqlite3.html
- [V] https://docs.python.org/3/library/http.server.html
- [V] https://github.com/Agent-Field/SWE-AF
- [V] https://docs.superplane.com/self-hosting/single-vm/
- [V] https://raw.githubusercontent.com/openai/symphony/be10a1b79df723d6d7612b5651c8522704dafb2e/README.md
- [V] https://github.com/AndyMik90/Aperant
- [V] https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/LICENSE
- [V] https://startups.rip/company/preflight
