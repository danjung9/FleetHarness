---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Build one offline message review tool for a duty officer, with source-linked tasks and explicit unresolved items."
---

# FleetHarness decision from the watch

## Bottom line

[R] Build a tool that turns routine messages into a short list of what our command needs to do, when, and which officer should handle it, with the original words beside each item and anything uncertain left for review.

## User and job

[R] The product is **FleetHarness: Messages to actions**, a finished local application for one job: prepare a checked administrative action list for the next duty officer. [A] The initial user is a ship's command duty officer on overnight in-port duty, reviewing routine administrative traffic before relief. That exact assignment of message review to this billet has not been confirmed with a user. It is the first hypothesis to test, not a claim about every command.

[P] ID 24 describes manual reading that misses command tasks, events and required correspondence. Its original requirements ask for command relevance and the coordinating command role; response drafting and calendar checks are optional. The raw submission confirms the summary in [[UseCases/24-automated-message-traffic-task-event-extraction]]. [A] Our baseline reconstruction is: read incoming messages, determine applicability, copy action and date into a list, identify the coordinating role, then check amendments before handover. The actual software used, frequency, approval chain and time spent are not verified. Do not describe Excel or email as the universal system of record.

[R] Choose this job because a reviewer can inspect the source and the result together, correct a mistake, and leave with something usable. Do not ask the person on watch to describe an application, approve a software specification, choose among 34 problems, or wait for code generation. The officer sees messages and a handover list. Engineers operate the development process before the watch begins.

[V] GAO's 2021 report documents inadequate sleep in its 2020 officer survey. It supports designing for limited attention, not a claim about this officer's current workload or minutes saved: https://www.gao.gov/products/gao-21-366. [R] Reject the earlier research's allowance for a ten-minute orientation. This assignment's acceptance test is a useful result in 90 seconds with no training, no jargon and no configuration screen.

[R] Measure burden with two matched, entirely synthetic message packs and an independently prepared answer key. Seek three first-time noncoding reviewers; record actual participation and role categories without personal details. Reverse manual/app order across reviewers and change the pack to reduce learning effects. Include a straightforward message, another command's task, an amendment and unresolved wording in both packs. Record:

- [R] Active person-minutes for preparation, review, correction, export and downstream reconciliation, summed across everyone involved. Record installation, input conversion and any coaching separately, and include them in the total cost of use.
- [R] Missed required actions, wrong command or role, invented deadlines, unresolved items mistakenly treated as settled, and duplicated actions. Report extraction results and the final human-reviewed result separately.
- [R] Time to the first correctly checked action and time to a usable complete list. The 90-second trial tests one small scenario, not the processing of a full watch's traffic.
- [R] Net person-minutes removed = manual total minus assisted total, including new work imposed on someone else. Report raw times, sample size, errors and assistance before any median. Do not extrapolate annual or Fleet-wide savings without observed frequency and representative users.

[A] No baseline, user trial or savings has been measured for this recommendation. [R] If only teammates are available, label it an internal synthetic trial. If measured savings are zero or negative, report that result and the remaining bottleneck.

## The first 60 seconds

[R] The following is a proposed timed interaction, not an observed result. A technical teammate has already installed the package and supplied a desktop shortcut. Cold launch is timed; installation is a separate measured prerequisite. The demo clock and command are fictional. The officer never chooses a model, framework, parser setting or agent.

| Time | Screen and exact visible content | What the officer does |
| --- | --- | --- |
| [R] 0 to 8 seconds | **Messages to actions**. Persistent line: **Synthetic example. This computer only. Nothing sent.** Fixed header: **Demo Command A**. One large button: **Open example messages**. A secondary **Open demo text file** supports a new synthetic file. | Opens the shortcut and presses **Open example messages**. This loads six raw messages and runs the parser now; it does not load precomputed answers. |
| [R] 8 to 20 seconds | **Check these items**. Each card shows the proposed action, original due wording with explicit UTC when available, proposed coordinating role, and the supporting sentence. A visible strip accounts for all six messages: **To check**, **Needs reading**, **Duplicate**, **Updated by another message**. | Opens the first action. No chat prompt, catalog or build progress appears. |
| [R] 20 to 35 seconds | The action and the highlighted original sentence remain side by side. For an amendment, both versions are visible with their message IDs. Buttons: **Keep**, **Change**, **Not our task**. A role inferred from the demo routing rule says **Suggested role**, with the rule available beside it. | Checks the evidence, confirms the suggested role or changes it, and presses **Keep**. The label becomes **Checked by you**, never **Order issued**. |
| [R] 35 to 50 seconds | Next card: **Date needs checking**. The original phrase is **next Friday**, without an adequate reference date. There is no guessed date. Buttons: **Leave for follow-up** and **Enter checked date**. Any user-entered date is labeled as a human addition. | Presses **Leave for follow-up**. The item remains prominently unresolved rather than blocking all useful work or disappearing. |
| [R] 50 to 60 seconds | **Handover draft**. Separate lists: **Checked items** and **Still needs checking**, with source references and outstanding message count. Button: **Save handover**. Only after durable save does the page say **Saved on this computer. Nothing sent.** | Saves the draft. A draft with unresolved items keeps that warning on screen and in every exported copy. |

[R] During seconds 60 to 90, close and reopen the app, recover the same draft, and use **Download handover** to save a readable local file. It contains the checked items and unresolved work together. This first-minute outcome is a recoverable review checkpoint, not a claim that all six messages have been checked. No send, release, task-complete, official-approval or calendar-update control exists. A source message remains accessible even when a proposed extraction is rejected.

[R] The six-message demonstration pack contains: an explicit correspondence request to Command A; its explicit dated amendment; an event for A; a task for Command B; A's ambiguous-date task; and an exact duplicate of the event. Its expected dispositions are human-authored. A separate evaluation pack adds ordinary non-task prose and unsupported phrasing. Never imply that a message with no recognized pattern contains no task.

[R] A first-time reviewer must identify the applicable action, its evidence, the unresolved date and the fact that nothing was sent within 90 seconds without help. If the reviewer needs an explanation of agents, configuration, confidence scores or the meaning of a green status, the design fails this test.

## Scope

[R] **One demo use case: ID 24, Automated Message Traffic Task & Event Extraction.** Claim a bounded synthetic implementation of its extraction and coordinating-role requirements. Do not claim complete coverage of real naval traffic. [P] Its original submission names no mandatory platform or supplied dataset; see the raw record identified in claim C01.

| Part | Thursday implementation commitment [R] | Disclosure beside the result [R] |
| --- | --- | --- |
| Input | Read locally supplied UTF-8 synthetic message files. Keep original text, message ID, version and line references. Recognize a small documented set of task, event and correspondence patterns. | **Synthetic traffic. Supported wording only.** No operational export format or mailbox connector is validated. |
| Command relevance | Match explicit fictional recipients; keep other-command and ambiguous material visible for review. Preconfigure Command A for the demo. | A real command profile and its maintenance process are not implemented. No configuration work is passed to the watchstander. |
| Extraction | Compute action candidates and explicit dates from input text at runtime. Leave unsupported sentences, relative dates without sufficient context and conflicting instructions unresolved. | **Needs reading** means the app cannot settle it. No percentage-confidence claim. No general-language understanding claim. |
| Coordinating role | Use an explicit role named in the source, or a small developer-supplied fictional routing table whose suggestion the user checks. | **Suggested role, demo rule**. It is not a verified command responsibility matrix or a named person's assignment. |
| Amendments and duplicates | Detect exact repeated IDs/content. Link an amendment or cancellation only when its reference and version ordering are explicit. Conflicting same-ID content remains visible. | No fuzzy reconciliation or authoritative message-status claim. A changed source invalidates the affected checked item. |
| Review and output | Keep, correct or reject candidates; save the source, original suggestion, correction and review history; export a readable handover with unresolved items included. | Local human review is real. Official release, authenticated command approval and downstream receipt are absent. |
| Persistence | Store committed drafts and an append-only application history locally; reopen after restart. | The history is inspectable, not a claim of tamper-proof audit or CAC identity. |
| Integrations and intelligence | None. No live feeds, LLM inference, remote routing, mailbox polling, calendar writes or government-system connection. | Show **Nothing sent** throughout. Do not animate fake integration progress. |

[R] Real means functioning behavior to implement and demonstrate, not behavior already built in this research. Stubbed means the fictional traffic, command profile, role-routing policy and role label. Do not stub the parser, persistence, source links or export and then present them as working. There is no simulated cloud connection to sell as an integration.

[R] Use at least 20 synthetic messages for acceptance, including a smaller held-out pack written by the test lead after the parser's supported patterns are frozen. Permit independently authored variants, not just edits to a displayed fixture ID. Include reordered sentences, multiple recipients, negation, a missing date, explicit time offsets, conflicting amendments, an orphan cancellation, duplicate IDs, no-task text and inert instruction-like text. No real unit names, rosters, readiness data, procedures, operational timings or personal records enter the pack. A manifest identifies every fixture as invented.

[R] Release checks: every input message is accounted for; every proposed fact has a source span or is explicitly labeled as a suggestion/human addition; no unresolved field silently becomes fact; changed sources invalidate affected reviews; duplicate input does not duplicate accepted work; saved work survives restart; the exported content matches the reviewed version; and the principal task works with external networking disabled. Finding one action does not complete a message: unmatched paragraphs and additional clauses stay visible, and only the reviewer can mark the message checked or non-actionable. Include a mixed message with one recognized action and one unsupported action in the held-out tests. Report errors on holdouts even if they are repaired before the final run. A passing finite corpus is not broad extraction validation.

[R] IDs 11 and 12 are out of this demo. A task list is neither a training solver nor an OPTASK timeline. ID 36 is later: it adds forms/records work and clean synchronization, which local saving does not establish. ID 46 is later: an event case directory is not a maintained Navy-wide discovery service. Do not count any of these as additional solved cases.

## Disconnected

[R] The entire selected task should work on one prepared computer without any external network: cold launch, import a new synthetic file, compute candidates, inspect original sources, correct items, save, reopen and export. Package all scripts, styles and fonts locally. No remote identity check, telemetry, content delivery network or model call belongs in the runtime.

[R] Nothing new arrives automatically while disconnected. The tool cannot fetch fresh messages, check the current authoritative status of a message, notify another officer, obtain remote approval, publish a calendar or synchronize two devices. Show the loaded file's capture/import time and distinguish it from the source's stated date. A laptop clock is not proof of source freshness. Reconnection triggers no outbound action.

[R] The offline demonstration must start with Wi-Fi and other external interfaces disabled, not merely turn them off after opening a cached page. Import a previously unopened synthetic file, edit, save, terminate the local process, relaunch and compare the recovered/exported record with the expected content. Record the test machine, runtime versions, artifact digest, network-denial method and observed requests. A second clean profile checks that the package does not depend on the developer's browser cache. Claim a second-machine install only if actually performed.

[A] This is a proposed local prototype on a prepared event laptop. Government-device installation, approved storage, identity, backup, security review, sustainment and afloat compatibility are not verified. [R] If the package needs preinstalled Python and a browser, list those prerequisites and test them. Do not call that a complete air-gap installer or a fielded capability.

[P] ID 36's raw requirements include reconnect synchronization in a shared completion checklist. Its event-wide authority is unresolved in [[Research/UseCase-Map/README]] and [[Reference/Open-Questions]]. [R] Ask the organizer whether this is mandatory for an ID 24 downselect entry. If it is, this no-sync scope has a stated compliance gap; do not silently award it a Fleet-ready label.

## How it gets built

[R] Use the confirmed event coding access under an engineer's supervision to build a small local app: Python 3 with SQLite, a loopback-only service, and plain HTML/CSS/JavaScript. Keep extraction and validation deterministic. The officer opens a prepared shortcut; the engineer owns launch, storage location and updates. No new orchestration platform, frontend framework, model download or cluster is needed for this proposed slice.

[V] Python documents SQLite as a disk-backed database without a separate database server; its module must still be present in the chosen Python distribution: https://docs.python.org/3/library/sqlite3.html. [V] Its built-in HTTP server supplies basic serving functions and is explicitly unsuitable for production: https://docs.python.org/3/library/http.server.html. [R] A loopback demonstration can use that small stack with fixed routes, bounded input, escaped text and write-request checks. Treat production hosting as later engineering work, not a property of the demo server.

[R] Separate the parser, source-linked review record, storage and export. Use durable database transactions; acknowledge **Saved** only after a successful commit, and preserve unsaved input on failure. Keep the approved answer key outside the coding worker's writable area. The test lead checks observable outputs independently. Record one real failed test, the code repair and the same test passing on the released revision; never manufacture a success history.

[R] Use one supervised coding worker at a time, with an engineer approving requirements and changes to expected answers. Give a feature one initial attempt plus at most two repair attempts before human diagnosis. Preserve code, failures and test evidence before cleanup. Keep outbound publishing and deployment under human authority. The application does not expose this machinery to its user.

| Event tool | Decision [R] |
| --- | --- |
| Codex on the event key | Use for development with the already working access. Record the actual model/version and tool use in the team's disclosure. Never put the key in the app, fixtures, screenshots or handover. |
| Google environment and Gemini tools | Skip as dependencies for Thursday. Use only for an optional, separately authorized comparison after the local app works. |
| Cursor and Grok tools | Skip new setup or provider adapters. No feature depends on them. |
| Ark, UDS and Zarf | Later packaging evaluation with a technical host owner. Do not spend the first day installing a platform for this single-device demo. |
| Prometheus Forge | Potential later host/builder comparison. Its access and fit do not decide this build. |

[E] The brief and newer [[Team/Now]] report that event-key Codex works; the older [[Resources/Documents]] still says login pending. The newer status takes precedence as a dated team report, not a fresh access test by this seat. [A] Other tool access is unconfirmed here. [R] If only Codex works, deliver exactly this scope. If coding access later fails, preserve the last tested app and continue manual fixes; there is no runtime inference dependency to fail during the demo.

| Project | What to borrow [R] | What to skip [R] | Source check and limit |
| --- | --- | --- | --- |
| SWE-AF | One task contract, separate work area, bounded repair, retained failure evidence. | Full autonomous planning fleet, installer, automatic PR/push, provider migration. | [V] The public README documents per-issue worktrees and iteration limits: https://github.com/Agent-Field/SWE-AF. [E] The pinned README fetch failed; no local run verified. Source note: [[Research/Projects/SWE-AF/FleetHarness-Fit]]. |
| SuperPlane | A durable task record, independent check results, visible failed/reviewed states. | Full server/runner/integration setup and a factory dashboard for the officer. | [V, vendor documentation] The current overview describes ticket intake, coding, check feedback and human review: https://docs.superplane.com/get-started/overview/. [A] Local operation remains untested. Source note: [[Research/Projects/SuperPlane/FleetHarness-Fit]]. |
| Symphony | Versioned work instructions, one work area per issue, explicit handoff and stop boundaries. | Tracker integration, long-running dispatcher, remote workers and automated landing. | [V] The pinned specification defines a tracker-driven scheduler and does not mandate one strong sandbox/approval policy: https://raw.githubusercontent.com/openai/symphony/be10a1b79df723d6d7612b5651c8522704dafb2e/SPEC.md. Source note: [[Research/Projects/Symphony/FleetHarness-Fit]]. |
| Aperant | Short specification, separate candidate/reviewed states and inspectable changes. | Desktop engine, memory system, self-validating success claims and copied engine code. | [V, project claim] The pinned README describes a development workbench and worktrees, and labels the project AGPL-3.0: https://raw.githubusercontent.com/AndyMik90/Aperant/20250db069a849ab001ac6ab9e3e9779886ab9e2/README.md. [E] Its pinned LICENSE fetch failed. Source note: [[Research/Projects/Aperant/FleetHarness-Fit]]. |

[R] Borrow general process ideas, not source modules or prompts. Record them as design prior work. This recommendation does not depend on the draft research's specific defect reports being correct, nor claim these projects cannot work. Their integration is unnecessary to the selected user job. Any later source reuse needs exact revision, license and notice review.

[R] Human authority in the application: it may propose and store local drafts; it must never transmit messages, assign real personnel, issue orders, alter authoritative records or mark a duty complete. The user checks a particular item/version, and a source change reopens that review. The local history records original, proposal, edit, status and time under an explicitly simulated role. **Stop reading** cancels any active import, preserves saved work and returns to original messages; no queued action restarts automatically. A technical owner can stop the local service. On unresolved meaning, preserve the source and use the existing human reporting chain; on a software failure, return to manual reading and the designated technical owner. Actual owner acceptance remains pending.

## How it relates to the README pipeline and a use case catalog

[P] The README explicitly calls FleetHarness a development system, permits separate application runtimes, proposes three different proof areas and makes a dashboard optional. It does not promise that all 34 applications will be finished by Thursday. Source: `~/Documents/CDAO/FleetHarness/README.md`, read directly. [R] Revise the downselect claim openly: one tested user workflow and its development evidence. This does not establish the README's general factory or its three-domain repeatability claim.

| Element | In, out or later | Exact Thursday treatment [R] |
| --- | --- | --- |
| Requirements, reuse decision, acceptance tests, implementation, repair and packaging | **In**, as the team's supervised method | Keep one source-linked requirement card, test corpus, actual results and runnable artifact. Most coordination is performed by people and files; disclose that. |
| Officer-driven application generation | **Out** | No build button, free-text app request, agent graph or specification approval during the watch. Later user sponsorship is a different job. |
| Automatic pipeline spanning 34 cases | **Later** | Do not build or claim a generalized orchestrator by downselect. Test reuse on a second distinct task only after this task's user evidence exists. |
| README's scheduling experiment | **Later** | No collision checker disguised as the full scheduling problem. |
| README's disconnected edits plus synchronization experiment | **Later** | Local durability is in this app; cross-device/shore reconciliation is absent. |
| One readable case/evidence page | **In**, as submission material | One page for ID 24: user, source requirement, present method, chosen scope, runnable version, actual test outcomes, limitations, owners and next experiment. It can be static. It is not the officer's home screen. |
| startups.rip style 34-page catalog, research chat and rebuild generator | **Later** | No catalog construction or stub-page quota before submission. Existing research remains reference material for the team. |

[V] The inspected startups.rip page provides a navigable report with sources and a separate build-plan availability indicator; it also marks its example company active: https://startups.rip/company/hamming-ai. [R] Borrow the evidence-to-next-experiment page structure. Do not borrow a mandatory failure story or treat a report as runnable software. A watchstander with 90 seconds should land in the task, not in a report about the task.

[R] I agree with Mukul's demand for specificity and simplicity, but would drop the idea of demonstrating a smaller general platform at downselect. The promise is one checked handover from messages already on the computer. No evidence reviewed here establishes that C3, Maven, Lovable or another incumbent cannot provide that workflow. Compete on the observed task, and reuse an incumbent if it passes the same tests with less total effort.

## Plan

[A] This plan assumes three available teammates: one interface implementer, one parser/storage implementer, and one product/test/submission lead. Roles are not confirmed people. A naval reviewer is requested briefly, not counted as full-time staff. With two teammates, combine interface and integration and take the cuts below immediately. [P] The captured schedule gives Thursday, November 5 at 2:00 PM EST for portal submission and an 8:00 PM venue closure; the raw schedule corroborates [[Event/Schedule]].

[R] All times below are EST. Start the decision/owner check now, then hold the submission deadline fixed. The team lead owns portal/team access from the first hour, because [[Team/Now]] last reported no portal team and the actual submission form is still unverified. Only a human authorized by Mukul submits, publishes, pushes or contacts an organizer; prepare the concrete materials before that action.

| Time | Work and exit evidence [R] |
| --- | --- |
| Wed now to noon | Confirm the one-job scope and teammate roles. Ask an available duty officer whether the proposed review job is real. Start portal/team and mandatory-sync clarification through the authorized team representative. |
| Noon to 1 PM | Test lead freezes synthetic examples, answer key and supported language; engineers choose the prepared local runtime and sketch the three views. Capture a manual baseline and verify submission fields if accessible. |
| 1 to 2 PM | Parser implementer produces source-linked candidates; interface implementer displays original text and action cards. Lead writes the problem, scope and disclosure sections of the submission. |
| 2 to 3 PM | Join input, review and local handover output for one new message file. If this path does not work, cut optional rendering and all pipeline presentation. |
| 3 to 4 PM | Add command filtering, explicit coordinating-role suggestions and unresolved fields. Test lead runs held-out phrasing and the first uncoached 90-second trial. |
| 4 to 5 PM | Fix the most costly user confusion; implement explicit amendment/duplicate handling and review invalidation. Do not add another use case. |
| 5 to 6 PM | Add durable save/reopen and readable export with unresolved items. Stagger dinner breaks. Lead records access, data and authority barriers. |
| 6 to 7 PM | Run the full acceptance pack, shutdown and cold-start offline checks. Preserve failures. Run matched manual/app tasks if a suitable reviewer is available. |
| 7 to 8 PM | Package a working checkpoint and evidence. Rehearse once. Confirm tomorrow's owner and submission plan. Save local backups and leave before the venue closes. |
| 8 to 9 PM | Travel and meal. No required venue or infrastructure work. |
| 9 to 10 PM | Optional offline review of submission wording and recorded defects; no new dependencies. Stop work at 10. The plan must still succeed if this optional hour is unused. |
| 10 to 11 PM | Sleep. |
| 11 PM to midnight | Sleep. |
| Thu midnight to 1 AM | Sleep. |
| 1 to 2 AM | Sleep. |
| 2 to 3 AM | Sleep. |
| 3 to 4 AM | Sleep. |
| 4 to 5 AM | Sleep. |
| 5 to 6 AM | Sleep. |
| 6 to 7 AM | Breakfast and travel preparation. No critical-path implementation. |
| 7 to 8 AM | Return and setup during the published check-in window if admitted. Recheck the local package. Keep a portable copy; do not assume early development access is guaranteed. |
| 8 to 9 AM | Attend the 8:00 to 8:15 kickoff. Reconfirm deadline/category/form. Fix only blockers identified in the previous tests. |
| 9 to 10 AM | Run a fresh-profile offline replay and final no-coaching trial. Finish the matched comparison. Freeze behavior and fixtures by 10. |
| 10 to 11 AM | Produce final evidence on the exact release artifact: correctness, durability, offline behavior, observed timing, unresolved failures. Write the one-page case/evidence page. |
| 11 AM to noon | Finish submission: scope, tools/models/data, prior work, ownership/restrictions, friction, human controls, transition plan and measured result. Take lunch in shifts. |
| Noon to 1 PM | Review claims against evidence and actual portal fields. Rehearse the 90-second workflow and a short explanation of limitations. Remove unsupported claims. Human approval of the final submission package. |
| 1 to 2 PM | Authorized human submits, targeting 1:15 PM, verifies receipt and retains confirmation without secrets. Use the remaining time for submission trouble only. The hard deadline is 2:00 PM. |

[R] Cut in this order: optional evening work; ornamental layout and CSV export; the development-story recording; all automatic suggestions for unsupported wording, retaining manual source-linked capture. Keep readable handover export, command relevance, uncertainty, role review, persistence and the offline demonstration. Do not cut time for submission, sleep, truthful limitations or human review.

[R] If automatic extraction is still unreliable at Wednesday 5 PM, reduce supported input patterns explicitly and keep unsupported messages in **Needs reading**. If nearly all work becomes manual, the product hypothesis has failed; submit a bounded negative finding with observed evidence rather than claim a successful extractor. If reliable saving/reopening is absent by Thursday 10 AM, remove the offline workflow claim and disclose the failed check. Do not spend the final four hours adding a sync engine, local model or second app.

## Scoring

[P] The five weights and 0 to 100 criterion scale are corroborated in the raw `judging_criteria` array, not just the draft research. [A] These estimates assume the selected slice and trials are actually completed. They are judgments with roughly 15 points of uncertainty each, not judge scores or proof of compliance. The narrow scope deliberately accepts a weaker breadth claim.

| Criterion | Weight [P] | Estimate [A] | Evidence needed and deduction [R] |
| --- | --- | --- | --- |
| Warfighting and deckplate impact | 30% | 75/100 | Correct action list plus measured net review burden. Deduct for synthetic traffic, limited grammar and no representative Fleet baseline. |
| Speed to Fleet | 20% | 65/100 | Cold-start local use, preserved work, explicit runtime prerequisites. Deduct for no target-device approval, production hardening or verified fielding owner. |
| Fleet scalability | 20% | 60/100 | A different synthetic command/wording pack exercises the same parser and review record in testing. Deduct for no cross-class deployment, maintained role policies or second domain. |
| Barrier removal | 15% | 70/100 | Observe copied fields and handoffs removed after including input preparation and export/reconciliation. Deduct for the remaining manual import and system-of-record handoff. |
| Judges' discretion | 15% | 80/100 | Uncoached 90-second task, a visible ambiguous input, actual offline restart and inspectable evidence. Deduct for modest novelty and limited format coverage. |

[A] A weighted-sum estimate would be 70/100; the event's exact aggregation formula is not confirmed. This arithmetic is a planning aid, not a reason to announce a score. [R] If the user and offline trials do not run, lower the claims and estimates rather than use the table as results.

[R] Enter **Bring Your Own Idea** if those are the live challenge choices, with ID 24 as the selected use case. If the form instead uses the six use-case families, select the family assigned to ID 24, **The Autonomous Shipboard Enterprise**. Confirm the field meanings; do not claim an organizer ruling. The primary proposed OSW ROI is clarifying friction in agile delivery: provide an actual barrier log, workaround and next responsible role. Add digital-workforce development only with documented work/skills evidence. No runtime agent is needed to demonstrate this job.

[E] The following covers the groups in [[Sprint/Submission-Checklist]]. This research supplies a recommendation, not completed submission evidence.

| Checklist group | Prepared in this decision | Still missing before submission [R] |
| --- | --- | --- |
| User, problem, present method, burden | [R] Role/job, source-backed problem, explicit workflow hypothesis and measurement protocol. | Actual role validation, observed method and measured result. If unavailable, say so. |
| Challenge category and ROI | [R] Proposed selections above. | Actual form, category interpretation and evidence for the selected ROI. |
| Observable build, permitted data and Fleet conditions | [R] Narrow app, synthetic manifest, offline/portability checks and deployment limits. | Working artifact, executed results, data inspection, dependency inventory, host prerequisites and support/security plan. |
| Human authority | [R] Allowed/prohibited actions, version-specific review, history, escalation and shutdown specified. | Demonstrate the controls and record actual accepted owner roles. A simulated role is not authentication. |
| Tool/model/dataset/service disclosure | [R] Planned tool boundary and local research log below. | Actual versions, model IDs, services used, data manifest and centralized disclosure. Resolve [[Reference/Open-Questions]] item 2. |
| Prior work, contribution ownership and restrictions | [R] Separate existing README/research/design precedents from future event code. | Dated baseline, actual copied dependencies and notices, contribution ownership and applicable restrictions. Governing terms have not been reverified here. |
| Friction | [R] Known access, format, user-validation, sync and device-authority gaps identified. | Log actual barriers and responsible function where known, without inventing an owner or clearance. |
| Beyond Friday | [R] Proposed roles and experiments below. | Accepted mission and technical owners, resource commitments and reviewed one-page transition plan. |
| Pitch against all five criteria | [R] One task, disconnected demonstration, bounded reuse and explicit bottleneck. | An observed impact number, runnable demo, actual scope and evidence. If only task time is measured, use that and say savings are unverified. |

[R] Proposed mission owner: the command duty/watch organization responsible for administrative message review, with a designated duty officer validating the task. Proposed technical owner: the team's designated app maintainer initially, followed by an accepting host organization before any pilot. [A] Neither responsibility is assigned or accepted by this recommendation. Do not substitute a named organization from another use case's transition hypothesis for a commitment to this project.

[R] At 30 days, validate the exact role, current process and supported message language with representative users using approved examples; compare against the easiest accessible incumbent. At 60 days, if the task has value, harden the chosen runtime and test the permitted import/export, identity, backup, updates and disconnected behavior on an authorized nonproduction device. At 90 days, conduct only an approved limited pilot, measure corrections and net labor, test handover to a second maintainer, then decide continue, integrate or stop. These are proposed gates, not promised Fleet installation dates. Required resources are reviewer time, a maintainer, an authorized test host, reviewed inputs/format documentation and a host/security/records owner.

## What I would have to be wrong about

| Evidence that would change the decision | Resulting change [R] |
| --- | --- |
| [A] A duty officer demonstrates that reviewing these messages is outside this role's job, or that no usable local input reaches the watch. | Select the actual action coordinator only if that person's job fits the 90-second task; otherwise reject this watch-centered product recommendation. Do not invent an intake feed. |
| [A] Matched trials show that mandatory source checking and import/export cost as much time as the existing method, or that the app increases missed actions. | Stop claiming burden reduction. Prefer the existing method until a specific error or extra step can be removed. |
| [A] Independently authored message variants leave most work unresolved, or plausible wrong dates/roles are accepted despite source display. | Reject this bounded parser as the demo's value claim. Do not solve it by hiding unresolved text or adding untested runtime AI. |
| [A] An already available, permitted tool completes the same task with lower net effort, equal or better error results and the needed disconnected behavior. | Reuse it; redirect FleetHarness to the missing adapter, evidence or packaging work. No unsupported platform differentiation survives that test. |
| [A] The organizers confirm that downselect requires the complete three-domain factory, an operational agent runtime, or reconnect synchronization for ID 24. | Re-scope explicitly to the actual requirement. The present recommendation would be incomplete; no catalog or local-save demo substitutes for that missing requirement. |
| [A] A teammate already has a working, authorized factory that completes a new bounded task with independent tests and human control without delaying the user trial. | Use that factory behind the same officer interface. This changes the implementation choice, not the watchstander's job. |
| [A] The intended host blocks the local runtime/storage and no approved equivalent is available, or no mission/technical owner will accept sustainment. | Withdraw the fast-fielding claim. Prefer an accepted host or another already owned workflow before proceeding toward a pilot. |

## Claims relied on

[E] The ten entries below distinguish source-backed constraints from hypotheses. Public sources were checked on November 4, 2026. The local event capture is dated evidence, not a fresh authenticated portal view. Full local paths are supplied where live verification was unavailable.

| ID | Claim and status | Source note | Source URL or file and verifier test |
| --- | --- | --- | --- |
| C01 | [P] ID 24 requires command-specific tasks/events/correspondence and a coordinating role; responses and calendar checks are optional. | [[UseCases/24-automated-message-traffic-task-event-extraction]]; [[Research/UseCase-Map/Top-Candidates]]. | `~/Documents/CDAO/Fleethacker-Vault/Sources/raw/events_norfolk_combined.json`, `use_cases` entry with `id=24`, fields `description`, `requirements`, `resources`. [E] Read directly. Check these fields, not unrelated portal/account data. |
| C02 | [P] Downselect is Thursday November 5 at 2 PM EST and the venue closes at 8 PM. | [[Event/Schedule]]. | Same raw file, `schedule`, submission entry at `2026-11-05T19:00:00Z` and evening collaboration descriptions. [E] Checked directly against the note. Public portal returned no readable content: https://cdao.hackathon.maximus.com/event/norfolk. |
| C03 | [P] The rubric weights are 30/20/20/15/15, with impact and disconnected fieldability accounting for half. | [[Event/Judging]]. | Same raw file, `judging_criteria`, names, descriptions, weights and maximum scores. [E] Directly cross-checked. Exact final aggregation remains [A]. |
| C04 | [P] Human control, permitted data, observable work, disclosure, friction and transition evidence are required. | [[Event/Rules]]; [[Sprint/Submission-Checklist]]. | `~/Documents/CDAO/Fleethacker-Vault/Event/Rules.md`, rules 2 to 11, and `~/Documents/CDAO/Fleethacker-Vault/Sprint/Submission-Checklist.md`. [E] Local summaries read; live rules/form and signed terms not independently verified. |
| C05 | [P] The README allows an app runtime independent of the factory and prefers tests and honest status; its three proof areas remain broader than this proposal. | [[Research/FleetHarness/What-It-Means]]. | `~/Documents/CDAO/FleetHarness/README.md`, Overview, Core Principles, Initial Proof of Concept and Success Criteria. [E] Read directly. Check that this note openly narrows, rather than claims to fulfill, the full proposal. |
| C06 | [E] Newer team status reports working event-key Codex, while other access is unconfirmed; no additional provider is needed by the proposed app. | [[Research/00-Brief]]; [[Team/Now]]; [[Resources/Documents]]. | `~/Documents/CDAO/Fleethacker-Vault/Team/Now.md` and `~/Documents/CDAO/Fleethacker-Vault/Research/00-Brief.md`. [E] Compared directly with the stale pending-login entry in Resources/Documents. [A] Availability for the next build still needs a teammate's check without exposing credentials. |
| C07 | [V] Published officer-fatigue evidence justifies an attention-constrained design; it does not establish message-review savings. | [[Research/Naval-User/Users]]; [[Research/Naval-User/Simplicity-Requirements]]. | https://www.gao.gov/products/gao-21-366, Highlights and survey methodology. [E] Primary GAO page opened. Verify the study date/population before making any current or task-specific claim. |
| C08 | [V] A disk-backed local store and local server are available building blocks; [A] this particular app can complete useful extraction/review offline without inference. | [[Research/Naval-User/Environment]]; [[Research/Build-Patterns/Offline-Local-Models]]. | https://docs.python.org/3/library/sqlite3.html and https://docs.python.org/3/library/http.server.html. [E] Official docs checked, including optional SQLite availability and the production-server limitation. [R] The decisive verification is the fresh-input, cold-start, save/restart/export test, not these docs alone. |
| C09 | [P] A saved local action list does not fulfill ID 36's synchronization and records requirements, or ID 11's scheduling requirements. | [[Research/UseCase-Map/PoC-Mapping]]. | Raw file above, `use_cases` entries `id=36` and `id=11`, descriptions and requirements. [E] Both originals read. [A] Event-wide applicability of the repeated completion checklist still needs confirmation. |
| C10 | [A] The duty officer can use this source-linked review flow without training, and it removes more work than its input preparation and review add. This is the central unproven product claim. | [[Research/Naval-User/Workflows]]; [[Research/FleetHarness/Officer-Reframe]]. | Those files under `~/Documents/CDAO/Fleethacker-Vault/Research/`, plus this note's User and job and First 60 seconds protocols. [E] No interview or trial was conducted. [R] Try independently authored packs with first-time reviewers and publish all timing, error and coaching results. |

### Local work and handoff record

[E] Asked: give one naval-officer recommendation with an exact demo scope, first-minute journey, build plan, schedule, scoring, reversal evidence and ten testable claims. Done: this decision note only. The specific request for one note takes precedence over the brief's generic index-note format.

[E] Tools used: local shell reads/searches, Python standard-library parsing of selected event-capture fields, public web retrieval/find, clock, local Markdown editing, document validation and the authorized main-session completion bridge. The completion handoff was delivered. No repository software was installed or executed; no app was built or tested. No other council decision was read and no sub-agents were used. Existing project/research notes and public product documentation are prior work; the new contribution is this scoped decision and test plan.

[E] Friction: the public portal returned no readable content; pinned SWE-AF README requests and the pinned Aperant LICENSE request returned cache misses. Current SWE-AF documentation and pinned Aperant README were readable, but neither establishes a local integration result. Team access notes disagree in age. User workflow, staffing, actual tool availability, portal fields, governing terms, mandatory-sync interpretation and deployment authority remain unverified.

[E] Source text was treated as data. Public repositories included installation, agent-execution and publishing guidance; none was followed. No additional instruction-redirection attempt was identified. The raw capture review printed only selected use-case narrative, judging and schedule fields plus structural key names, not account, credential, roster or theme contents.

[E] This assignment confines writes to the current folder. Central Sprint logs, Sessions and Team/Now were not changed. [R] The authorized coordinator should transfer this local tool/prior-work/friction record to those logs, record the session outcome, and update Team/Now. This is a handoff request, not a claim that centralized records are complete.

[E] The updated workspace instructions require new tools to be entered through `python3 ~/Documents/CDAO/Fleethacker-Vault/tools/fh.py tool`. Its central ledger destination is outside this session's writable roots, so that write was not attempted. [R] The coordinator should enter the actual research tooling and available version/model metadata with that command, distinguishing source documents evaluated from software actually run. Public project pages were read, not installed or adopted.

[E] Document validation confirmed the required frontmatter, all eleven requested sections, ten distinct claim IDs, existing local note links and absence of em/en dash characters. Only Decision.md was created in this folder. These are document checks, not software or usability results.

[R] Next: verify the role and portal requirements, select owners, build the one workflow, execute the stated tests and replace proposed outcomes with actual evidence before submission.

## Sources

[E] The claim ledger supplies the decisive local files and primary URLs. Additional checked public sources support the limited design-borrowing discussion, not claims of successful integrations:

- [V] https://github.com/Agent-Field/SWE-AF
- [V] https://docs.superplane.com/get-started/overview/
- [V] https://raw.githubusercontent.com/openai/symphony/be10a1b79df723d6d7612b5651c8522704dafb2e/README.md
- [V] https://raw.githubusercontent.com/openai/symphony/be10a1b79df723d6d7612b5651c8522704dafb2e/SPEC.md
- [V] https://raw.githubusercontent.com/AndyMik90/Aperant/20250db069a849ab001ac6ab9e3e9779886ab9e2/README.md
- [V] https://startups.rip/company/hamming-ai
- [V] https://www.gao.gov/products/gao-21-366
- [V] https://docs.python.org/3/library/sqlite3.html
- [V] https://docs.python.org/3/library/http.server.html
- [E] Context checked but not used as task-specific burden proof: https://www.gao.gov/products/gao-24-106525.
