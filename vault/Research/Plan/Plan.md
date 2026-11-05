---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A gated plan to submit one accepted synthetic training draft and honest FleetHarness build evidence by Thursday at 2 PM EST."
---

# FleetHarness plan to Thursday

## Bottom line

[R] Give a training coordinator one simple tool to check four proposed training events, see conflicts, review changes and save a draft. [R] Use fictional people and rooms, keep the officer in charge and show the working task before explaining how it was built. [R] If a real FleetHarness build has not worked by 4 PM Wednesday, stop that integration effort and finish a smaller checked artifact through a working permitted route. [E] No real model build, officer benefit, generated app quality, usability or offline behavior has been measured in this review. [R] Submit only what the team can demonstrate, with missing requirements stated plainly.

## What the team submits Thursday

[R] Submit **Partial ID 11: synthetic training draft**, one accepted artifact and a short evidence package. The primary result is a draft that a person can check and save. FleetHarness is the development method and technical finding, with provenance tied to the actual run. This is a proposed scope decision, not a claim of full challenge completion or organizer acceptance.

[R] Prepare the following package in the team's authorized project workspace. These are proposed deliverables, not files created by this research review:

| Package item | Required contents and acceptance |
| --- | --- |
| `01-problem-and-scope.md` | Proposed user role, present workflow confirmed or marked assumed, exact partial ID 11 scope, current baseline and measured results if obtained, omissions, category ruling and OSW ROI. |
| `02-app/` | The accepted `index.html` and any disclosed local companion files, README, synthetic example and reopenable saved draft. No keys or real roster. Record final digest. |
| `03-acceptance/` | Frozen independent cases and expected results, actual browser/export results, machine/browser versions, timestamps, failure cases, reviewer decision and artifact digest. Use a separate evaluator-controlled location during the build. |
| `04-build-evidence/` | Actual source commit, model/provider identifier, run ID and timestamps, generated files, host test report, manual edits, review/export record, failed runs and cost/usage only if available. If no real FleetHarness build succeeded, state that and identify the actual implementation route. |
| `05-controls-and-disclosure.md` | Allowed/prohibited actions, approvals, monitoring, escalation, shutdown, data/source/tool/license records, event versus pre-event contribution, six kinds of friction and remaining limitations. |
| `06-transition.md` | Proposed mission and technical owner roles, confirmation status, next experiment, resources and 30/60/90-day gates. |
| `07-pitch-and-portal.md` | Concise narrative, demo script, rubric evidence, final form answers, authorized submission approval and receipt location. Never include secret links or credentials. |

[P] [[Sprint/Submission-Checklist]] says the actual form has not been seen. [R] The submission lead must check required fields, attachments, sizes and eligibility before treating this package as sufficient. Current team status and the actual pitch duration are not verified.

## Exact use case and slice

[P] ID 11 includes departmental agents, negotiation, qualified rosters, fatigue and training periodicities. Sources: [[Research/Council/Verification/Verification]], V12 and V36; [[Research/UseCase-Map/PoC-Mapping]]. [R] Thursday's slice covers only feasibility over supplied candidate times, fixed assigned people, supplied qualifications, availability, rooms, a rest interval and a horizon minutes limit. It does not implement departmental agents, recurrence, SFTRM interpretation, real readiness data, an official calendar or reconnect sync.

[A] The proposed user is a training coordinator preparing a draft for a reviewing officer. The assumed present process is manually reconciling proposed events against a roster and calendar. An actual user must confirm that process and the burden; it is not established by the council's choice. [R] Use invented administrative instruction activities, fictional identifiers and invented qualifications. Do not import operational schedules, training policy documents or real personnel records.

[R] Freeze this proposed test contract before generation. All times are integer minutes relative to a fictional day-one morning; day two starts at 1440. Both operational and person windows are `[0,240]` and `[1440,1680]`. The limit is across both days, not per day. P01 has Q-A, 120 maximum minutes and 30 rest minutes. P02 has Q-B, 120 maximum minutes and zero rest minutes. Room-1 and Room-2 are fictional resource identifiers.

| Request | Duration | Permitted starts | Assigned person | Room | Required qualification |
| --- | --- | --- | --- | --- | --- |
| A | 60 | 0 | P01 | Room-1 | Q-A |
| B | 60 | 0, 90 | P01 | Room-1 | Q-A |
| C | 60 | 0 | P02 | Room-2 | Q-B |
| D | 60 | 1440 | P02 | Room-2 | Q-B |

[R] The proposed independently checked expected schedule is A at 0 to 60, B at 90 to 150, C at 0 to 60 and D at 1440 to 1500. [E] This expectation is derived by reading `harness/tools/scheduling.ts` and manually checking the constraints, not by executing it. [R] A second technical reviewer must freeze and check the expected results before using them as acceptance evidence.

| Independent case [R] | Expected result to prove |
| --- | --- |
| Base fixture above | All four requests appear once; supplied times, people and rooms preserved; B moves to 90; no overlap/rest violation; P01 and P02 each total 120 minutes. |
| Fresh edit: A starts only at 30; B permits 0, 90, 120 | A at 30 to 90 and B at 120 to 180. The result must depend on the edit, not a canned screenshot. |
| Impossible: B permits only 0 with the original A | Infeasible, no approved schedule, input preserved and a plain conflict explanation. |
| Rest boundary: B permits only 60 with the original A | Infeasible because P01 needs 30 rest minutes; 90 is the acceptable boundary. |
| Minutes limit: P01 maximum 119 | Infeasible; no request silently omitted. |
| Qualification removed from P01 | Infeasible under the supplied group-coverage rule; no invented qualified person. |
| Duplicate request ID or malformed time | Invalid input shown clearly, not presented as a feasible schedule. |
| Search budget set to one node for the four-request case | budget_exhausted, visibly different from proof of infeasibility. Keep this control with the evaluator if it would confuse ordinary users. |
| Deliberately wrong output, overlapping A/B or missing D | Independent evaluator rejects it. Proves the acceptance process can fail. |
| Review, then edit a request | Previous review cleared or superseded; new result needs review. |
| Save, close, reopen and import on the delivered artifact | Exact saved inputs and reviewed draft recover; unsupported browser storage is reported. |
| Network disabled before cold launch | Fresh edit, check, review and saved-file recovery work with all required dependencies local, or the offline claim fails. |

[R] Acceptance must recompute the constraints and verify the rendered/exported values independently of the solver helper. Host tests of a generated core are additional evidence; they cannot substitute for driving the actual inline browser implementation. Keep the holdout cases out of the candidate's context and write authority. A separate folder under the same unrestricted account is not that boundary. For a manual event check, the evaluator can hold the cases separately and test only after the build worker is terminated.

[R] If search cannot be made reliable in the timebox, the fallback is a **training conflict checker**: the person selects times, the app checks them, and it refuses an invalid reviewed draft. Relabel it clearly and drop automatic schedule generation claims. If even that is not accepted by 6 PM, submit a disclosed technical finding with reproducible test evidence only if the organizers allow that scope. Do not present a mock screen as functioning software.

## The front door

[R] Launch the exact accepted task app. Header: Training draft, synthetic demonstration, not an approved schedule. The first screen contains a short task sentence, Try example and the four editable requests. After Check draft, show the proposed times beside the relevant supplied limits. Show infeasible and search-limit outcomes plainly. A person marks the current version reviewed, then saves a draft file and a readable summary. Nothing sends messages, changes official calendars, assigns real people or publishes a schedule.

[R] Avoid a blank prompt, provider chooser, framework selector or large catalog as the first officer interaction. Use the existing ID 11 catalog entry when preparing the factory run so its scheduling recipe is selected. [E] The generic starter briefs do not supply the same challenge linkage; see `src/App.tsx`, `harness/catalog.ts` and `harness/planner.ts`. Never imply selecting the catalog entry completes its requirements.

[R] Show the saved factory run only after the task result. Studio is optional for that evidence screen. [E] Its browser API cannot run builds, its desktop development launcher has separate user data, and ordinary packaging does not include its output. Both Studio start paths need consent if used to generate. Sources: `src/studio/api.ts`, `src/studio/Studio.tsx`, `scripts/studio.mjs`, `package.json`; [[Research/Interfaces/Recommendation]]. [R] Prefer the original interface if it holds the only reproducible run. Pre-navigate to the accepted preview and evidence; do not spend the pitch finding tabs.

## How builds run on the event key

[E] At `0f175a8`, Pi is the available API-key route inside FleetHarness. The Codex adapter forces ChatGPT authentication; it is not the same event-key route reported working in [[Team/Now]]. General Codex supports API keys, but this adapter does not. Sources: `electron/main.ts`, `electron/pi-backend.ts`, `electron/codex-rpc.ts`, `electron/codex-session.ts`; https://learn.chatgpt.com/docs/auth?surface=cli.

[R] The technical operator carries out this sequence after coordinating with the repository owner. No step was executed during this review.

1. Record the actual current commit and in-flight changes with danjung9. Agree one editor per shared file and small reviewable pull requests. Do not reset, replace or silently rebase his work to the inspected commit.
2. Prepare an approved disposable environment containing only synthetic/public inputs and the needed build dependencies. Prove the candidate cannot read a harmless outside-workspace canary or the evaluator's cases; inspect inherited credentials and process authority without printing secret values. If the boundary cannot be established, do not run untrusted generation there. Use a separately working permitted coding environment with its actual controls and provenance, or prepare only a manually reviewed artifact.
3. Have the key owner enter their own event key using session-only storage. Deliberately select Pi, provider and an actually listed model. Do not substitute personal ChatGPT login or a different service. The earlier `gpt-6.1-sol` success is a lead to check, not proof the pinned Pi catalogue and event entitlement support it. Record identifiers and redacted outcome only.
4. Verify an actual small inference through that adapter, not merely a configured badge or mock provider. Check the endpoint, model compatibility, allowed tools and disclosure. No entitlement by 3 PM means no further authentication redesign for this deadline.
5. Test Stop and absence of lingering child work in the preparation environment with a harmless canary. The technical operator must have a tested environment-level shutdown fallback. Monitor one run at a time. Set a whole-run wall-clock stop at 4 PM and an agreed spending limit before starting; if actual usage cannot be read, say cost is unknown and bound requests/time instead of claiming a dollar cap.
6. Start the bounded ID 11 brief. The code runs intake, research, plan, build and verify sequentially, with one optional repair. Capture start/finish times, model, run ID, reports and all human edits. The existing 30-minute stage defaults are too loose to serve as this event's deadline guard; the operator must stop earlier.
7. Host verification must pass, then the independent evaluator must inspect and exercise the actual browser app. Terminate generation before final packaging. Accept the final copied artifact, calculate its digest, review that digest and preserve it for the pitch. If any byte changes, repeat the affected acceptance and issue a new review.

[R] At 4 PM, if no real FleetHarness build has produced a useful runnable candidate, stop pipeline work. Use an already genuinely generated candidate only if its run and subsequent edits are recorded and it passes acceptance. Otherwise develop the small checker through the separately confirmed permitted tool path, with human review and explicit provenance. Never label an externally produced or substantially repaired app as a successful autonomous FleetHarness run. Retain the factory failure as an honest technical finding.

## Code changes as small pull requests

[A] Estimates below are active person-hours for a contributor familiar with the repository, including the focused proof. They exclude provider waiting, access recovery, user availability and submission writing. They are not measured velocity or commitments from danjung9. [R] Confirm his current branch first, keep each PR small, let the repository owner integrate and do not duplicate work already underway. Owner roles are proposals, not named assignments. No code is changed by this plan.

| Change and files | [A] Hours | Priority | Proposed owner role | Proof it worked |
| --- | --- | --- | --- | --- |
| Freeze task contract and fixtures. Existing `harness/fixtures.ts`, `harness/catalog.ts`; proposed evaluator cases outside worker access. Preserve original ID 11 requirements and label the narrower demo separately. | 0.5 to 1 | Must | Mission liaison plus acceptance reviewer | Requirements checked against V12/V36; expected feasible and impossible cases independently reviewed; no operational data. |
| Build or finish the task app. Generated run's `index.html`, core/test files and README, not assumed tracked repository files. Reuse scheduling semantics without adding a package manager or external CDN. | 1.5 to 3 | Must for primary demo | App engineer | Actual UI passes fresh-input, constraint, impossible and search-budget cases; exported values match; all requests retained. |
| Review invalidation and portable save/import. Same generated app files. Do not add sync under the name of local persistence. | 0.5 to 1 | Must | App engineer | Edit clears review; export/import round-trip and close/reopen preserve the draft; final artifact tested. |
| Independent acceptance record and final-byte digest. Proposed `03-acceptance/` and delivery manifest outside candidate authority. | 0.75 to 1.5 | Must | Acceptance reviewer | Deliberately wrong result rejected; actual app and final export pass; digest matches reviewed copy. Manual procedure allowed and labeled. |
| Event-key operator instructions and truthful build status. `docs/desktop.md`, `docs/chatgpt.md`, `docs/pipeline.md`; exact file choice coordinated with current owner. | 0.25 to 0.5 | Must if factory shown | Runtime engineer | A real Pi request and, separately, full run recorded, or status explicitly says which failed. No secret in docs/logs. |
| Consent on both Studio start paths. `src/studio/Studio.tsx`, reuse wording/behavior from `src/App.tsx`. | 0.5 to 1 | Must only if generating from Studio | Interface engineer | Cancel starts no run; accept starts once from editor and workspace; authority and charges visible. Otherwise use original UI and cut this PR. |
| Freeze verified source into reviewed snapshot; export those exact bytes. `electron/main.ts`, `electron/storage.ts`, `electron/verification.ts`, focused verification tests. | 1 to 2 | Should | Runtime engineer | Change during dialog/copy cannot alter accepted delivered snapshot; digest mismatch blocks delivery; old report cannot approve changed bytes. |
| Browser acceptance automation against a fixed external fixture set. New evaluator-owned browser test, integration point in `electron/verification.ts` only after reviewed design. | 1.5 to 3 | Should | Acceptance engineer | Mutated browser implementation fails even when model-written core tests pass; UI save/import and outputs asserted. Manual checks remain default Thursday. |
| Whole-run time/usage display and operator stop aid. `electron/agent-runner.ts`, `shared/types.ts`, `src/PhaseDetails.tsx`. | 0.5 to 1.5 | Should | Runtime engineer | Whole-run deadline observed across stages/repair; unavailable usage shown as unknown. No inference that user-turn count is a cost cap. |
| General supervised worker, tighter general-tool permissions and proven descendant termination. `electron/pi-backend.ts`, `electron/agent-runner.ts`, `electron/verification.ts`, new worker boundary. | 8 to 14 or more | Cut for Thursday | Runtime/security engineer | Future gate: outside canary denied, secrets unavailable to candidate, stop kills descendants, reproducible platform tests. Use a separately proved preparation environment now. |
| Backend rewrite, new orchestration framework, six-request expansion, recurrence, departmental agents, two-device sync, full catalog redesign, second app. | Not estimated; no allocation | Cut | Future technical owner | Reconsider only after first accepted artifact and owner-approved scope. If sync is mandatory now, seek an honest partial-entry ruling, not a rushed fake substitute. |

[A] The core artifact and evidence work totals roughly 3.5 to 7 active person-hours before conditional Studio work, with preparation/operator work and writing additional. This estimate is uncertain. [R] With only one technical contributor or access still blocked at 3 PM, start with the checker and cut every should. With two technical roles, separate artifact work from independent acceptance; the submission lead works alongside them. This is a staffing assumption to confirm, not authorization to launch more agents.

## Hour by hour, all times EST

[P] Schedule constraints come from [[Event/Schedule]], captured November 4. [R] This plan starts at Mukul's stated 2:15 PM Wednesday and deliberately leaves sleep and submission time. Recheck the portal schedule Thursday. Do not assume venue access at 7 AM.

| Time | Work and exit evidence | Role |
| --- | --- | --- |
| Wed 2:15 to 3 PM | Resolve team/form access and partial-scope/sync question; align current code with danjung9; freeze one task and acceptance cases; test permitted Pi inference and preparation controls. Scope and provider gate at 3 PM. | Team representative, runtime engineer, acceptance reviewer |
| 3 to 4 PM | One bounded real run, or begin the checker through the confirmed permitted route. Submission lead writes problem, omissions, disclosures and checklist skeleton. Hard real-build gate at 4 PM. | App/runtime engineer, submission lead |
| 4 to 5 PM | Implement only missing task behavior; independent reviewer checks fresh and impossible cases. Record actual provenance and failures. No backend redesign. | App engineer, acceptance reviewer |
| 5 to 6 PM | Working dinner; final core acceptance and save/import; choose app or checker at 6 PM. Capture any available formative user observation without inventing a baseline. | All roles, with meal time protected |
| 6 to 7 PM | Terminate builder, copy and accept delivered bytes, disconnected cold-start attempt, digest and review record. Draft technical finding if no accepted app. Complete Wednesday submission draft. | Acceptance reviewer, submission lead |
| 7 to 8 PM | Rehearse fixed evidence, review missing fields and controls, back up permitted artifacts, agree Thursday owners. Pack up before 8 PM sharp. | Team representative and demo operator |
| 8 to 9 PM | Travel, food and rest. No venue access assumed. | All roles |
| 9 to 10 PM | Optional bounded document corrections and tomorrow's checklist. No new code or open-ended generation. Stop by 10 PM. | Submission lead if available |
| 10 to 11 PM | Sleep. | All roles |
| 11 PM to midnight | Sleep. | All roles |
| Thu midnight to 1 AM | Sleep. | All roles |
| 1 to 2 AM | Sleep. | All roles |
| 2 to 3 AM | Sleep. | All roles |
| 3 to 4 AM | Sleep. | All roles |
| 4 to 5 AM | Sleep. | All roles |
| 5 to 6 AM | Sleep. | All roles |
| 6 to 7 AM | Breakfast, review the known-blocker list and prepare travel. | All roles |
| 7 to 8 AM | Travel and arrival. Registration window is not promised development time. | All roles |
| 8 to 9 AM | Required kickoff 8 to 8:15, then working breakfast. Verify deadline/form and organizer response; reconcile final entry scope. | Team representative |
| 9 to 10 AM | Fix only observed blocking defects and repeat affected checks. Freeze features at 10 AM. If unavailable, narrow claims and use accepted fallback. | App engineer, acceptance reviewer |
| 10 to 11 AM | Check the final exported bytes, fresh-input behavior, review/save recovery and disclosed offline core; record versions and digest. One user trial if available; no new claim without result. | Acceptance reviewer, mission liaison |
| 11 AM to noon | Working lunch; complete all submission fields and 32 checklist rows. Reconcile tool/prior-work/friction logs and ownership. | Submission lead |
| Noon to 1 PM | Cross-review claims against artifacts and sources; rehearse; team approves exact submission contents. Final package frozen. | Reviewer and team representative |
| 1 to 2 PM | Authorized representative submits, target 1:15 PM; verify receipt and attachments. Reserve remaining time for portal failures. Deadline 2 PM. No new features. | Team representative |

## Decision gates and fallbacks

| Gate | Required evidence | If it fails |
| --- | --- | --- |
| 3 PM Wednesday: scope and access | Current teammate status; selected role and fixture; actual Pi inference or a separately confirmed permitted implementation route; team/form issue assigned. | Use checker scope and confirmed route. Escalate portal/category issues to an authorized representative. No personal credential substitution. |
| Before any generation: boundary and stop | Harmless outside canary inaccessible; candidate cannot reach secrets/evaluator; observed stop and environment shutdown; operator approval. | Do not generate in that environment. Use a separately proved permitted environment or manual artifact work. A warning is not a boundary. |
| 4 PM Wednesday: real build | One real-provider FleetHarness run has produced a useful runnable candidate, with run provenance and any repairs recorded. | Stop factory integration. Use accepted prior genuine output or build the checker through the confirmed route. Disclose factory result as unproven/failed. No overnight wait. |
| 6 PM Wednesday: useful task | App or checker passes fresh input, infeasible/invalid handling, constraint checks and review invalidation. | No functioning-app claim. Prepare reproducible technical findings and seek explicit eligibility ruling for that entry. |
| 7 PM Wednesday: final artifact | Accepted copied bytes, review, digest, save/import recovery; actual cold-start result recorded. | Use latest accepted version; omit offline claim if it failed. An online-only artifact still leaves a published requirement unmet and needs a scope ruling. |
| Thursday 9 AM: organizer interpretation | Actual form, category and recorded answer on partial ID 11 and missing reconnect sync. | Keep omissions prominent. Ask whether a technical-finding/BYOI entry is permitted; do not invent a waiver. Team decides whether an honest noncompliant partial entry is acceptable to submit. |
| Thursday 10 AM: feature freeze | Stable artifact with known remaining defects and no unreviewed edits. | Drop optional UI work, automation and catalog changes. Every changed delivered byte requires new review evidence. |
| Thursday noon: claims and package | Each claim traces to source or result; all required fields complete or explicitly unresolved; ownership/disclosures reviewed. | Remove unsupported claims and attach limitations. Missing mandatory portal fields are a submission blocker, not a reason to fabricate them. |
| Thursday 1:15 PM: submission | Human approval, upload and visible receipt/confirmation. | Use organizer-approved fallback channel only after the representative obtains it; preserve the error and time. No unauthorized message or publication by this review. |

## Demo script, minute by minute

[A] Five minutes is a planning assumption; the actual downselect format and Friday slot length must be checked. [R] Use a prepared accepted artifact, not live generation. A recording may support a recovery path only if labeled with its date, version and actual behavior.

| Minute | Action | Evidence and words to keep honest |
| --- | --- | --- |
| 0 to 1 | Open the task app, identify the coordinator and reviewer, load the four-request synthetic example. Make the fresh A/B edit. | State the task and exact partial scope. Give a measured impact number only if a trial produced one; otherwise say burden reduction has not yet been measured. |
| 1 to 2 | Check the draft; compare permitted times with result. Then make B impossible. | Show all four requests retained, the rest rule and the distinct failure state. Never call observed conflicts a complete explanation of all infeasibility. |
| 2 to 3 | Restore the feasible input, mark this version reviewed, save, close and reopen/import. | If a cold offline launch actually passed beforehand, demonstrate the same tested core disconnected. State the tested device/browser and that sync is absent. |
| 3 to 4 | Show the matching factory run or technical-finding record, source commit, actual model, host report, external acceptance and digest. | Say whether FleetHarness generated this artifact, which edits people made and which tests remain incomplete. If no real run succeeded, say so before showing the alternate implementation route. |
| 4 to 5 | Show allowed/prohibited actions, stop procedure evidence and the next experiment with owner roles. | The human approves a draft, not operational release. Present actual friction removed or discovered, remaining sync/fielding gaps and the 30/60/90-day plan. |

[R] If only 90 seconds are available, spend 15 seconds on the task, 35 on fresh input plus impossible case, 20 on review/save and 20 on provenance and limits. This is a proposed script, not a measured usability result.

## Measure value without manufacturing a result

[R] If a suitable user is available, use two matched synthetic tasks with the same requirements, one using their described present method and one using the prototype. Record setup, data entry, checking, correction and handover person-minutes; count missing requests, constraint violations and assistance. Counterbalance order with more users if feasible. A single participant is a formative observation, not a representative estimate.

[R] Report actual counts, raw times, participant role without PII and conditions. Compare net labor including review. If no matched baseline exists, report task completion and defects only; do not call a runtime or click count time saved. Thursday can truthfully present a technical finding and a proposed measurement protocol. [E] Verification V22, V23, V47, V48 and V50 do not support the seats' benefit, delivery-time or score predictions.

## Human authority and operational boundaries

[R] The app may evaluate supplied synthetic constraints and save a local draft. It must never release a schedule, assign real personnel, modify an official calendar, contact anyone, infer operational policy or transmit real records. Review is required for the task contract, starting a charged build, accepting output and approving the exact submission. Existing software review is prototype-only and unauthenticated; the event record must not imply command authority.

[R] Monitor build status, tool activity, elapsed time, test results and changed artifact versions. Log failure and repair, with no credentials. If constraints are ambiguous, a test fails, data are prohibited, cost is uncontrolled or Stop does not terminate work, stop and escalate to the technical operator and team representative. The fallback shutdown is termination of the isolated preparation environment, followed by verification no worker remains and preservation of permitted logs. No shutdown success is claimed until tested.

## Submission package mapped to every checklist line

[P] Rows below mirror all 32 checkboxes in [[Sprint/Submission-Checklist]], in order. [R] They are assignments of evidence, not checked completion. All future measurements, approvals and owners remain pending until recorded.

| # | Checklist requirement | Package evidence and current gap | Proposed responsible role |
| --- | --- | --- | --- |
| 1 | User named | 01: proposed training coordinator and reviewing officer; confirm actual role, no PII needed. | Mission liaison |
| 2 | Operational problem | 01: conflicting proposed training events; event source and exact partial scope. | Mission liaison |
| 3 | Current process | 01: user-confirmed workflow; manual reconciliation is currently an assumption. | Mission liaison |
| 4 | Burden reduced with a measure | 03: matched-task raw results if obtained; otherwise explicitly not measured and next experiment. Requirement unresolved without a measure. | Acceptance reviewer |
| 5 | Challenge category | 07: actual portal selection and organizer ruling; BYOI is a candidate, not an approved waiver. | Team representative |
| 6 | OSW ROI and evidence | 01/05: proposed fit is clarifying friction points to agile delivery; concrete auth, acceptance, sync and handover evidence. Confirm exact portal ROI wording. | Submission lead |
| 7 | Observable prototype, test, workflow, integration or finding | 02/03/04: accepted app/checker, or honest reproducible technical finding with eligibility checked. | Technical owner |
| 8 | Permitted unclassified data | 02/05: synthetic fixture declaration, source inventory and review. No real rosters or prohibited data. | Reviewer |
| 9 | Fleet conditions | 05/06: cybersecurity boundaries, portable files, limited connectivity and cold-start result, device limits, sustainment owner, disconnected functions and missing sync. Authorization unresolved. | Technical owner |
| 10 | System may do | 05: check supplied constraints and save draft. | Mission liaison |
| 11 | Must never do | 05: no operational release, external writes, real-person assignment or invented policy. | Mission liaison |
| 12 | Approval points | 05: contract, build authority/charge, artifact, submission; record who approved by role without sensitive identity data. | Team representative |
| 13 | Logging and monitoring | 04/05: permitted run events, tests, edits, versions, time and available usage. | Runtime engineer |
| 14 | Escalation | 05: failure/ambiguity/prohibited-data/stop procedure and responsible roles. | Technical owner |
| 15 | Shutdown | 05: observed canary/process termination and environment fallback; currently untested. | Runtime engineer |
| 16 | Tools, models, datasets, external services | 05 plus central tool ledger: exact used versions/identifiers, public/synthetic sources, web services and any evaluator dependency. Reconcile local handoff below. | Submission lead |
| 17 | Pre-event versus event work | 04/05 plus prior-work log: actual repository history, pre-existing upstream/software and event changes. Do not assume commit inspection date is creation date. | Repository maintainer |
| 18 | Ownership and restrictions | 05: contributor confirmation, component licenses, restrictions and terms section 7 review if nongovernment. No assertion of rights from possession alone. | Team representative |
| 19 | Friction in six areas | 05 plus friction log: policy (scope/sync), data (synthetic limits), authority (review/release), infrastructure (access/offline), acquisition (owner/path), technical (auth/export/acceptance). Mark observed versus anticipated. | Submission lead |
| 20 | Mission owner | 06: proposed training workflow sponsor role, acceptance pending; do not invent a person. | Team representative |
| 21 | Technical owner | 06: proposed application maintainer role, acceptance pending. | Team representative |
| 22 | Next experiment | 06: matched synthetic-task trial on accepted artifact with independent checks. | Mission liaison |
| 23 | Resources | 06: permitted endpoint, representative users, reviewer, maintainer, authorized credentials, support and security/approval advice. Amounts unpriced. | Technical owner |
| 24 | 30-day recommendation | 06: validate user/process and baseline; reproduce accepted artifact and choose continue/stop using errors and net labor. | Mission owner role |
| 25 | 60-day recommendation | 06: controlled pilot only with approvals; prove interrupted recovery and two-device conflict/replay sync if required; verify target packaging. | Technical owner role |
| 26 | 90-day recommendation | 06: transition decision with owner, sustainment, updates/rollback, authorization path and measured benefit; stop or use incumbent if benefit absent. | Mission and technical owner roles |
| 27 | Impact number up front, 30% | 07: actual error/time result with denominator and conditions, or state no impact number yet. Four example requests is scope, not impact. | Submission lead |
| 28 | Disconnected fielding, 20% | 03/06: tested local functions plus missing sync, provisioning and authorization plan; no factory-offline claim. | Technical owner |
| 29 | Reach, 20% | 06: common constraint contract as a reuse hypothesis; only one task demonstrated. No multiplication of users or savings without evidence. | Mission liaison |
| 30 | Bottleneck, 15% | 04/05: documented real auth/acceptance/delivery friction and actual remedy or unresolved condition. | Runtime engineer |
| 31 | Technical demo and Sailor experience, 15% | 02/03/07: fresh input, failure, review and recovery; user observations if obtained. | Demo operator |
| 32 | Mission results, rule 8 | 07: task outcome first, honest measured limits, method second; no vendor sales comparison. | Submission lead |

## Questions for danjung9 and the organizers, in blocking order

[R] These are a prepared question list, not messages sent by this review. An authorized team member should raise them. Keep answers in the evidence record without credentials or personal data.

| Priority | Ask | Decision it unlocks |
| --- | --- | --- |
| 1, organizers | Is the team registered and able to open the actual submission form now? What fields, attachments and category are required? | Prevents a portal failure regardless of code quality. |
| 2, danjung9 | What is the current working revision, what changes are underway, and is there already a real generated ID 11 or ID 24 artifact with its run evidence? | Avoids conflicting edits and lets stronger existing evidence change scope before 3 PM. |
| 3, danjung9 | Has this exact Pi adapter made an inference and a complete build with the event key? Which provider/model identifiers and redacted run ID? | Determines whether the 4 PM real-build gate is credible. A configured badge is insufficient. |
| 4, organizers | May a disclosed partial ID 11 or BYOI technical finding be entered without departmental agents, recurrence and reconnect sync? Which repeated/category requirements apply, and how must omissions be stated? | Determines honest eligibility. Request recorded guidance; do not interpret silence as approval. |
| 5, danjung9 | Which original or Studio run can be reproduced, in which user-data directory, and are consent, export snapshot or isolation fixes already in progress? | Selects preparation interface and avoids duplicate PRs. |
| 6, danjung9 | What permitted preparation boundary and stop test are available? Can the candidate access inherited credentials or outside files? | Decides whether generation can run there at all. Never request secret values. |
| 7, organizers | Is event entitlement sufficient for the intended Pi endpoint/model? Is there an approved support contact or documented limitation? | Resolves access without switching to personal accounts or new unauthorized services. |
| 8, organizers or mission mentor | Can a training coordinator/reviewing officer check the task and present process using fictional data before Thursday morning? | Grounds the user, burden measure and useful acceptance criteria. |
| 9, danjung9 | Which contributions predate the event, who may license them, and what notices/restrictions must accompany export? | Completes ownership and prior-work disclosure. |
| 10, organizers | What is the downselect format, actual demo duration, exact OSW ROI field wording and approved portal-outage procedure? | Finishes script and submission logistics. No presumed email fallback. |

## Where the startups.rip style catalog fits

[R] Now: create one concise evidence record for the selected task using existing catalog/brief facilities or the submission note. Include the role, current process, source requirements, existing alternatives, exact slice, passed and failed checks, artifact revision, missing capabilities and next approval. Link to the accepted artifact. Status must be explicit: proposed, built, independently checked or awaiting owner acceptance.

[V] The transferable pattern is sourced analysis connected to a next experiment; active-company pages show it is not uniformly a failure graveyard. https://startups.rip/company/hamming-ai. [R] Later: add search/filter and revision history only when several real accepted artifacts exist. Never imply a naval program failed because a related public project exists. A catalog entry is not working software, a paid specification or proof of general factory repeatability. Sources: [[Research/Landscape/Startups-RIP/Fleet-Version]], [[Research/Landscape/Startups-RIP/What-It-Is]].

## Local disclosure, friction, prior work and session handoff

[E] This review read the requested notes and decision-dependent source at `0f175a8`, used public primary-source retrieval for narrow disputed claims, and wrote only the three requested notes in `Research/Plan`. No repository code was run or installed, no credential was entered, no agent was spawned, and no message, commit, push or submission was sent. Source prompts, including the build-prompt text on the public example page, were treated as data. Test-Results.md was left unchanged.

| Item used | Type and provider | Use and version boundary |
| --- | --- | --- |
| [E] Local command runner, Git, zsh, rg, text readers | Session tools; Git and shell maintainers | Read pinned source and permitted notes. Binary versions not recorded. |
| [E] Python standard library | Python Software Foundation | Build/check the research directory and document consistency only. No repository program or library executed; version not recorded. |
| [E] Web search/retrieval and clock | Session-provided services | Check primary documentation and timebox. Service versions not exposed. |
| [E] File patch tool | Session environment | Write the three research notes. Version not exposed. |
| [E] Documentation skill for authentication | Installed documentation resource | Narrow general-product authentication check; not proof of FleetHarness compatibility. Local resource version not recorded. |
| [E] Research notes, captured event material, pinned source and reported tests | Existing team inputs | Prior work and evidence, not new implementation or tests. Exact revisions and source notes in Findings and Research-Map. |
| [V] Public product/project documentation | Publishers identified in Findings sources | Narrow advertised capabilities and visible page structure. No outside project installed or adopted. |

[E] The exact generation model identifier for this writing session is not established by the exposed runtime record. Do not infer it from the older event-key test. [R] The authorized session owner should reconcile the actual model identifier from its execution record in the tool ledger; do not add authorship attribution to these notes.

[E] Friction encountered: broad read output was truncated and decisive portions were reread; inherited notes contain superseded compiler and policy-confidence claims; no live model/app behavior was available within this read-only review. Central Sprint, Sessions and Team/Now are outside the permitted write folder. Their updates and the prescribed tool-ledger command were not performed. [R] An authorized coordinating session should transfer this record into [[Sprint/Tool-Disclosure-Log]], [[Sprint/Friction-Log]], [[Sprint/Prior-Work-Log]], a session note and [[Team/Now]], using the prescribed `fh.py tool` command for ledger entries. This local handoff does not claim those obligations are complete.

[E] Asked: synthesize all research, rule on disagreements and plan before further work. Done: Findings.md, Plan.md and Research-Map.md. Verified by pinned source reading, consistency checks of the documents and attribution to the supplied test report. [R] Next: obtain the blocking answers, freeze the selected task and run the timed gates through an authorized implementation session.

## Sources

- [E] https://github.com/danjung9/FleetHarness/tree/0f175a8ce346521c4462fc134d40c0973eac1323 (private reference; local Git source inspected).
- [V] https://learn.chatgpt.com/docs/auth?surface=cli (general local authentication, not the app adapter).
- [V] https://startups.rip/company/hamming-ai (visible evidence-page pattern).
- [P] [[Event/Schedule]], [[Event/Rules]], [[Event/Judging]], [[Sprint/Submission-Checklist]].
- [E] [[Research/Plan/Findings]], [[Research/Plan/Test-Results]], [[Research/Plan/Research-Map]], [[Research/Council/Verification/Verification]], [[Research/FleetHarness-MVP/Delta-0f175a8]], [[Research/Interfaces/Recommendation]].
