---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Current Home/Flow acceptance plan with fixed synthetic answers, delivery checks and an explicit runtime evidence boundary."
---

# FleetHarness officer acceptance test plan

## Bottom line

[E] The latest source reviewed, `631849f`, consolidates the app into one Home/Flow interface; Studio and Workbench are removed. [E] Compilation and all three historical UI builds passed at `50fcaea`, but the first fixture was blocked by sandbox loopback denial; see [[Research/QA/Results-50fcaea]]. [E] Main subsequently advanced the dedicated QA checkout to clean, detached `631849f`; local GUI work remains stopped. [R] Use the active four-row matrix below and check the exact delivered app against fixed synthetic answers. [R] Record partial capability honestly and keep live generation dependent on the owner-configured event connection and permitted execution scope.

## Active target: unified interface at 631849f

[E, pinned Git diff] `631849f638614735a89a555d487d6b3c777c52e3` adds `src/Home.tsx`, makes Home the default, retains the original Flow/Preview/Review routes and start confirmation, replaces the engine select with radio choices, removes Studio/Workbench and their launch/build/smoke commands, and adds `scripts/smoke-home.mjs`. The diff in `electron/`, `harness/`, `skills/`, `shared/` and `package-lock.json` is empty from `50fcaea`. [R] Backend findings and domain answer keys therefore remain relevant; do not infer that frontend consolidation fixes them or that old build results validate new UI code.

| Active case | Entry and plain-language journey | Acceptance mapping |
| --- | --- | --- |
| U12 | Home, Challenge catalog, select message/timeline ID 12, review the prefilled brief, Save challenge, start through the confirmation, try the actual app and review. | [R] M1/M2 and [[Research/QA/Officer/12-Timeline-Golden]], then current approval/export gates. |
| U11 | Home, Scheduling, select ID 11, enter the invented constraints, save, start, inspect valid and conflicting schedules and return an incorrect draft. | [R] Keep the two-request S1 smoke separate from the four-request submission key in [[Research/QA/Officer/11-Training-Golden]]. |
| U36 | Home, Offline & edge, select ID 36, scope to synthetic forms and records, save, create, exercise recovery/conflicts and inspect claimed delivery. | [R] O1/O2/O3 plus [[Research/QA/Officer/36-Paperless-Golden]], with real transport and cold-launch claims checked separately. |
| UC | Home, New challenge or write your own brief, enter C and six criteria, save, reopen through My builds, start and check C1. | [R] Preserve validation, version-specific review and local-only delivery expectations. |

[R] Apply all three persona passes and applicable G01 through G23 gates to these four active rows. This replaces the superseded three-interface matrix. Do not restore removed interfaces or count their absence as a regression against a superseded product choice. Preserve test input IDs so evidence remains traceable across revisions.

[R] New Home checks: search by the exact visible card title, select a card and verify its catalog ID survives, return from Home to a running build and locate Stop, resume through My builds, refresh into the default Home page, inspect empty-state recovery and operate the new model radio controls by keyboard. Existing headless results do not establish these behaviors. Alternate-profile data migration is not demonstrated; do not claim old Studio/Workbench browser or desktop data appears automatically in the retained app.

[E] The loopback denial is an execution-environment block, not a failure of Home. Main has advanced `qa-lead` to `631849f`, removed stale alternate output folders and independently assigned itself a fixture-only GUI pass. [R] Do not advance or modify the checkout independently. Rebuild current source before any later permitted app launch; old output is not proof of the new UI. Current test entry points are listed at the end. Review main's actual GUI receipt when available; do not convert a planned run into a pass. Historical commands and results remain in [[Research/QA/Results-50fcaea]].

## Scope, ownership and evidence

- [E, main-session handoff] The coordination session owns the organization runner and will relay Dan's pushes. This QA assignment does not create another runner or pull loop. The current assignment is two notes, this plan and [[Research/QA/Static-Findings]].
- [E, later bridge handoff and local Git check] The dedicated checkout is `~/Documents/CDAO/fh-org/qa-lead`, now clean and detached at `631849f638614735a89a555d487d6b3c777c52e3` after main advanced it. The coordinator will keep it stable and advances it only on request. The moving `fh-org/qa` belongs to the runner. Its QA agents own catalog-wide harness coverage and pilot golden examples; this plan supplies GUI acceptance and independent review criteria without duplicating those jobs.
- [E, handoff] Dan owns `src/` and `studio/`. QA reports frontend defects and reproduction steps. It does not edit those directories or the rest of the QA repository under this assignment.
- [E] Source references below are relative to `~/Documents/CDAO/fh-org/qa`. The initial matrix covered `0f175a8` and `50fcaea`; this active plan is rebased to `631849f`. Reads use explicit Git objects. Historical builds and the blocked fixture attempt are recorded in [[Research/QA/Results-50fcaea]]. No live model, login, installation or packaging was performed by this QA assignment.
- [E, user handoff] Any separately launched `codex exec` worker must use `-p fleet-lock`; permitted worker models are `gpt-6.1-sol` and `gpt-6-astra`. The event profile is not a personal ChatGPT login. Bounded source reviews supported baseline, new-revision and acceptance checks; no additional organization was started.
- [E, source] Browser mode can prepare briefs but cannot perform a real build, approve or export a generated application. Desktop is required for those stages (`src/api.ts`). The retained browser UI has no built-in brief transfer to desktop.
- [R] Use only invented identifiers, tasks and administrative records. Do not use message traffic, real rosters, account screens containing personal information, operational data, actual forms completed for people, or external mailboxes. The examples below are proposed test inputs, not real naval procedures or policy.

| Existing evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| [E, recorded in [[Research/Plan/Test-Results]]] At `0f175a8`, 78/78 app tests, 39/39 harness tests and root type checking pass. | A reported successful compile and the assertions in the unit/integration suites. The five earlier type errors are superseded. | A live provider build, correctness of a generated UI, or a useful officer workflow. Do not add the old 100-test count to the new count. |
| [E, runner report read at `~/.local/share/fleethacker-context/org/reports/mvp-gate.md`] At `50fcaea`, the 14:34:58 gate reports 128 passed, zero failed. Main attributes it to type checking, app tests and harness tests under the lock. | A newer reported headless gate. | GUI or live-model acceptance. Main explicitly reports no GUI smoke at this revision. |
| [E, subsequently read [[Research/QA/Runner/Harness-Coverage]]] Additional targeted scenarios report 403/410 passing and seven verification/export failures at `50fcaea`. | Broader reported boundary tests, including source-digest ambiguity, comment-only test acceptance, two export mutation windows, altered review evidence, partial export cleanup and omitted same-workspace symlinks. | A universally passing QA result. The earlier 128-pass gate covers different tests; do not add overlapping baseline counts or suppress these failures. |
| [E, bridge response, November 4] Desktop smoke passed outside the sandbox with a local fixture and 16 scripted requests. | The main session reports that one existing scripted desktop journey passed. | Independent rerun here, live inference, or all pilot use cases. The Test-Results note still says the desktop test was waiting for Electron, so its written record lags the bridge report. |
| [E] Seven supplied browser screenshots and [[Research/Interfaces/Officer-Walkthrough]]. | Visible initial states and a source-based cognitive walkthrough. | Measured user behavior, desktop continuation, accessibility completion or generated-app behavior. |
| [E] [[Research/QA/Static-Findings]] and [[Research/FleetHarness-MVP/Delta-0f175a8]]. | Reproducible source concerns to prioritize. | Runtime reproduction unless a later result explicitly records one. |

[R] Preserve these provenance distinctions in the eventual results. A planned check starts as `NOT RUN`; a missing dependency, approval or feature is `BLOCKED` or `UNSUPPORTED`, not `PASS`. Use `FAIL` for an exercised expectation that is not met. Fixture success must stay labeled `FIXTURE`.

## Personas and the first ten minutes

[A] These are role-based test personas, not interviewed people or findings about all naval officers. [R] One facilitator may perform a cognitive walkthrough now; measured usability requires a real consenting participant later, using synthetic material and anonymous role labels.

| Persona | Immediate job | What they must be able to decide | Proposed ten-minute observation |
| --- | --- | --- | --- |
| [A] Division officer who does not code | Turn a small administrative or training need into a checkable draft. | Is this the right task? What input is needed? What is running? Where is Stop? What result requires correction? | [R] Find a pilot, edit one assumption, save the brief, explain where it is stored, locate Stop and identify the next required human decision. Count requests for technical help. |
| [A] Department head | Review constraints and accept or return a prototype result. | Are all requested outcomes supported by evidence? Which limitations remain? Does approval authorize only local prototype delivery? | [R] Inspect one known-good and one deliberately wrong result, return the wrong one and explain why automated green checks alone are insufficient. |
| [A] Yeoman or clerk | Enter synthetic records, correct errors and preserve work. | Was the record saved? Can it be recovered? Are conflicts visible? Has anything actually been submitted or synchronized? | [R] Enter a record, make a correction, close and reopen the relevant view, and distinguish a saved brief, bookmark, generated app and local export. |

[R] Proposed usability pass: complete the role's tasks in ten active minutes, with at most one brief navigation hint and no need to write code or run terminal commands. This is a proposed threshold, not an event rule or measured result. Report setup and generation wait separately; do not claim that a full build fits ten minutes. [R] If a technical operator preconfigures the model, report that preparation time and describe the test as a prepared-desktop session.

[R] Observe errors, backtracking, assistance, unanswered questions and the participant's explanation of approval. Do not infer understanding from a checkbox. Reuse the same prepared task and screen size for both interfaces, vary interface order where possible, and do not claim comparative statistics from one participant.

## Synthetic acceptance inputs and fixed expected answers

[R] Freeze these inputs and expected answers before generation. They are a human-defined answer key separate from model-authored tests. An app can pass this limited slice while remaining incomplete against the published challenge. [E] The deterministic helpers already present are described in `harness/fixtures.ts`, `harness/tools/messages.ts`, `harness/tools/scheduling.ts`, `harness/tools/offline.ts` and `tests/harness-tools.test.ts`; reading those tests does not execute them.

[E, coordination read] [[Research/QA/Officer/README]] maps its finalized golden examples into this plan. [R] Reuse [[Research/QA/Officer/11-Training-Golden]] for the four-request submission case, [[Research/QA/Officer/12-Timeline-Golden]] for source-span and cross-midnight variants, and [[Research/QA/Officer/36-Paperless-Golden]] for concrete form/conflict values. The two-request S1 below remains a separate small smoke input; never apply the four-request expected output to it. Execute overlapping boundaries once per relevant input/interface and cite both mappings rather than inflating counts. These shared answer keys are visible to builders, so do not call them secret holdouts.

### M: use case 12, synthetic message review

[P] The published challenge asks for raw USMTF interpretation and a timeline of operational message content; see [[UseCases/12-electronic-optask-operational-tasking-message-parser-timelin]]. [E] The current helper implements a documented synthetic `EVENT`/`TASK` grammar, not a general USMTF parser. [R] Use only the following invented administrative practice records and label the demonstration accordingly.

```text
EVENT/E-01/2026-11-04T09:00Z/2026-11-04T10:00Z/TEAM-A/Practice briefing//
TASK/T-01/2026-11-04T16:00Z/TEAM-B/Review practice log//
TASK/T-02/tomorrow/TEAM-A/Confirm date with reviewer//
TASK/T-01/2026-11-04T17:00Z/TEAM-B/Duplicate identifier for review//
UNSUPPORTED PRACTICE LINE
```

[R] Expected M1: retain four parsed records and the unsupported source line as a visible warning. E-01 spans 09:00 to 10:00 UTC; the first T-01 is due at 16:00 UTC. T-02 has an unresolved due time and needs review. The duplicate T-01 is retained and flagged, not silently overwritten. Every extracted value can be traced to its exact source text. Unknown time must not be placed on a precise timeline.

[R] M2 mutations: empty input yields no invented events; an end before a start is flagged; `2026-11-04T23:30-05:00` normalizes to `2026-11-05T04:30:00.000Z`; a date without a timezone requires review. Include ordinary accented text to check source highlighting. Keep an instruction-like sentence in an unsupported input line as inert text; it must not cause file access, tool use or external action. Do not test with real credential names or secret-bearing paths.

### S: use case 11, bounded training draft

[P] The published request includes departmental negotiation, personnel constraints, fatigue and recurring training; see [[UseCases/11-pb4t-planning-board-for-training-autonomous-deconfliction-ag]]. [E] The current helper searches supplied candidate times for feasibility; it does not supply real SFTRM policy, recurrence rules or a complete departmental negotiation system. [R] All limits below are invented test constraints, not a safety policy.

| Input [R] | Fixed value |
| --- | --- |
| Practice window | 08:00 to 17:00, one synthetic day; minutes 480 to 1020 |
| PERSON-A | Qualification `instructor`; available throughout; maximum assigned duration 120 minutes; at least 30 minutes between assignments |
| PERSON-B | Qualification `observer`; available throughout; maximum assigned duration 240 minutes |
| PRACTICE-A | 60 minutes; PERSON-A; ROOM-A; instructor required; starts permitted at 09:00, 10:00 or 10:30 |
| PRACTICE-B | 60 minutes; PERSON-A and PERSON-B; ROOM-A; both qualifications required; same candidate starts |

[R] Expected S1: both requests scheduled, no room or person overlap, at least 30 minutes between PERSON-A's assignments, exactly 120 minutes assigned to PERSON-A, and no invented start times. Either ordering is acceptable. A valid example is 09:00 to 10:00 and 10:30 to 11:30; do not demand that exact ordering from a solver with multiple correct answers.

[R] S2: restrict both requests to 09:00; expect no complete feasible allocation and a visible shared-resource/person conflict. S3: set PERSON-A's maximum to 119 minutes; expect infeasible, then restore 120 and expect feasible. S4: require a missing qualification or place a request outside the practice window; expect rejection or an explained infeasible result, never silent relaxation. S5: where the helper's search limit is exposed to a technical tester, set `maxNodes: 1`; expect `budget_exhausted`, distinct from proven infeasibility. If the app hides that setting, check the helper separately and mark UI coverage unverified.

[R] The officer must be able to inspect the draft and return it for correction. Approval cannot turn omitted recurrence or policy validation into completed challenge requirements.

### O: use case 36, local record and conflict review

[P] The published challenge includes offline capture, clean synchronization, human review and an audit trail; see [[UseCases/36-paperless-underway]]. [E] Current helpers reconcile revision records and plan bounded uploads. They do not constitute durable browser storage, authenticated transport or a real government-system connector.

[R] O1: create fictional FORM-1 with revision R0, value `Draft`, actor DEVICE-A. Make RA with parent R0 and value `Local correction`; independently make RB with parent R0 and value `Remote correction`. Expected: one record, two competing heads, visible conflict and both values preserved. Replay operations and reverse delivery order; the canonical result must not gain duplicate records or lose history. A reviewer-created RC with parents RA and RB may resolve the conflict; the decision and both parents remain traceable. Concurrent edit versus delete must also remain a conflict until reviewed.

[R] O2: save a local draft, reload, close the app, reopen and recover the same record. Test this in the generated preview and the delivered app separately. [E, `electron/preview.ts`] Preview uses a newly allocated loopback origin; persistence across an application restart cannot be inferred from a successful reload on the same origin. [R] Simulate disconnection within the test context, never by changing the Mac's network configuration. If cold offline opening or persistence is absent, mark it failed or unsupported and narrow the demonstration claim.

[R] O3: a priority-5 record has 400 bytes remaining; a priority-1 image is 10,000 bytes total with 2,000 bytes acknowledged; link budget is 1,000 bytes. Expected upload plan: 400 bytes of the record, then 600 image bytes beginning at offset 2,000. The image remains pending. A plan is not an actual transfer acknowledgment. Without an implemented two-replica transport, report synchronization as unsupported rather than passing an in-memory merge as network sync.

[R] Human approval must precede any claimed submission. No external service is contacted in this test.

### C: custom brief, practice action register

[R] Enter this original synthetic brief, with no catalog challenge selected:

> Build a local practice action register for a fictional office. A clerk records a task ID, plain-language description, role label, due date and status. A reviewer checks it before a local export. Use no external email or account connection. Seed A-01, check practice supplies, CLERK-A, 2026-11-06, Draft; and A-02, review practice agenda, REVIEWER-A, 2026-11-07, Draft.

[R] Enter these as six separate success criteria: (1) both rows remain after reload; (2) a blank description is rejected; (3) a duplicate ID is rejected without overwriting a row; (4) Draft can move to Ready for review, and a reviewer can return it with a note; (5) changing a reviewed task clears that task's approval; (6) local export preserves exactly the reviewed current rows and displays that nothing was sent externally.

[R] Expected C1: exactly two seeded records, visible validation errors, recoverable notes and version-specific review. Test editing A-01 after approval; it must require new review. This is acceptance for a generated custom app, not a claim that the factory's own approval system supplies these business rules. [E] A custom brief defaults to the generic workflow recipe (`harness/integration.ts`).

## Execution mapping

[R] Run U12, U11, U36 and UC from the active matrix through the retained desktop app. In each journey the division-officer persona prepares the request, the clerk persona exercises data entry/recovery, and the department-head persona checks the fixed answers and limitations. These are three role passes per journey, not evidence that three people participated.

[R] Intake and empty-account checks need no live model. The existing scripted provider can check factory plumbing and its predetermined message example. It cannot stand in for an authentically generated scheduler, record system or custom register. A live acceptance run needs the owner-configured permitted model and the separate preparation gate. Record unsupported model identifiers rather than silently changing models or switching to a personal account.

[R] Input families remain M/S/O/C. Linked older golden notes may refer to M-O/S-O/O-O/C-O; map those to U12/U11/U36/UC respectively. The removed Studio/Workbench variants are retired. Preserve exact input revision and avoid double-counting shared boundary cases.

## Shared control and failure checks

[R] Apply these to the retained Home/Flow interface unless stated. Fixture and simulation results remain separate from live-model results. Every unexecuted entry is currently `NOT RUN`.

| ID | Action | Pass criterion | Required execution |
| --- | --- | --- | --- |
| G01, empty and invalid intake | Save a blank title, short/empty description and empty criteria. Enter six ordinary lines, literal separators and repeated edits. | Field errors are understandable; no silent criteria loss; saving does not duplicate an existing brief. | Browser or desktop; no model. |
| G02, browser handoff | Save a browser brief, restart that browser context and inspect the stated desktop continuation path. Open an isolated desktop profile separately. | Browser limitations and separate storage are explicit. Automatic transfer is unsupported at this revision. A saved browser brief must not be presented as already available in desktop; record the actual manual handoff burden. | Browser plus desktop; no model. |
| G03, connection honesty | With a new empty app profile, try to start. Inspect engine and model choices. | Missing configuration blocks work with a useful next step. The UI must not imply that ChatGPT subscription login uses the event API key. | Desktop; no credential entry and no live inference. |
| G04, model and key handling | After owner configuration only, identify Pi and the permitted exact model. Owner chooses session-only storage for the initial live trial. Inspect only non-secret connection status. | A successful live response is tied to the intended provider/model. No secrets appear in screenshots, logs, briefs, exported artifacts or evidence. A configured badge is not proof of inference. | Owner action and separate live-stage approval. Never inspect actual credential file contents. |
| G05, start disclosure | Ask the operator what Generate/Start authorizes, then start a fixture run. | They can explain local file/command use, provider use and Stop before execution. Verify the retained start-confirmation dialog, including cancellation before dispatch. | Local fixture; cognitive check. |
| G06, progress and errors | Observe each phase; trigger the existing scripted repair and a failed result. | Active phase, failure, one repair attempt and final status are understandable. No false claim that research performed live browsing or that a generated component passed acceptance. | Phase and system-design fixtures. |
| G07, stop and quit | Stop during a slow provider response and a tool step; repeat at start preflight. Quit while active, then reopen. | No further model/tool action after confirmed shutdown; descendants terminate; workspace and stopped state survive. A stopped badge without process evidence is partial verification. Cancel during auth preflight must prevent a later start. | Existing fixture covers a subset. Preflight and descendant checks need a separately reviewed bounded harness; do not access unrelated processes or files. |
| G08, approval after new work | Inspect and approve a fixture, start another run of the same project, then return to review. Change the brief separately. | Old approval is invalidated; old notes cannot masquerade as inspection of the new version; checkbox resets. Distinguish backend gate from stale local form state. | Fixture plus manual UI; no live model needed. |
| G09, failed or absent tests | Present absent tests, zero tests, failed tests, skipped/todo tests and a timeout through controlled fixtures. | Approval/export blocked; visible reason. Positive TAP counts prove executed assertions only. | Existing unit evidence first; add targeted fixture only if a gap or change requires it. |
| G10, independent correctness | Supply a result with a wrong synthetic answer even when its generated tests pass. | Human/oracle review rejects it; actual preview behavior and exported app agree with M/S/O/C. | Live artifact or a clearly labeled mutation of a disposable fixture; new mutation harness needs review. |
| G11, preview operation | Load a generated form, submit, change a field, refresh, download if supported. | Form handlers work under the preview sandbox; Refresh actually reloads; new content is visible. Check the retained iframe revision and current loading/error states. | Desktop fixture/manual interaction. |
| G12, persistence and restart | Save a brief and a generated record, reload, quit, reopen, and reopen an export. | Each claimed persistence boundary retains exact synthetic data. Document origin changes and separate browser/desktop stores. | Fixture or generated app. No live model needed for the persistence check itself. |
| G13, evidence freshness | Change a disposable generated artifact after tests, then attempt approval/export. Also change it while the folder chooser is open. | Stale bytes cannot be delivered under the old hash and approval. Test the exported bytes, not only the workspace. | Original smoke covers the first condition; dialog-time race remains a new targeted test requiring a reviewed fixture. |
| G14, human delivery | With real review notes, approve only the prototype, choose a local destination, inspect the exported app and DELIVERY.md. Cancel the folder chooser once. | Cancel causes no delivery claim; successful export contains readable evidence and exact tested bytes; labels say local prototype delivery, not deployment or an official release. | Local fixture first; final acceptance repeats on real generated artifact. |
| G15, permissions and boundaries | Inspect tool activity and source-defined permissions; test only harmless synthetic canaries in a separately approved dedicated boundary. | No unsupported claim that instructions or a working directory form an OS sandbox. Permission limits and outside-file denial are demonstrated before claiming isolation. | Static now. Runtime boundary test requires an explicit isolated environment and reviewed commands. No reads of real outside files or credentials. |
| G16, accessibility | Keyboard-only intake, dialog, tab navigation, errors and Stop; check visible focus and labels at desktop minimum and narrow browser widths. | All essential actions reachable, no lost focus or hidden Stop, understandable error association and no essential horizontal clipping. | Browser/Electron fixture. Screen-reader behavior remains unverified until separately observed. |
| G17, repeated failure and concurrency | Double-click Start, switch project, try editing settings during active work, fail one of multiple fixture runs. | No duplicate run, per-project state remains correct, settings cannot change underneath a run, failure does not falsely finish another project. | Targeted fixture. Increase concurrency only to test the documented cap, not to generate unnecessary live calls. |
| G18, final artifact provenance | Record commit, brief version, engine/model, real versus scripted provider, run ID, checked source digest and reviewer decision. | A reviewer can match actual tested and delivered bytes. Exclude secrets, personal account information and prohibited data. | All stages; final run evidence only after execution. |

[E, source] Codex in this app requires ChatGPT sign-in and strips the standard OpenAI API-key variables; Pi is the event-key candidate (`electron/codex-rpc.ts`, `electron/codex-session.ts`, `electron/main.ts`). Pi's general tools have host permissions, and phase prompts are not an OS boundary (`electron/pi-backend.ts`, `harness/phases.ts`). [R] The initial approval request below is for local fixture/interface execution only. A live-generation proposal must name the actual permitted preparation environment and owner-configured provider before it runs. Token availability does not settle account authorization or filesystem containment.

## Guide and standalone delivery checks

[E] The backend retained at `631849f` includes `50fcaea`'s practical README follow-up and approval-gated executable packaging. The README follow-up is part of the existing build session, not a sixth named phase. Source export and executable download have different controls and need separate evidence.

| Added gate | Concrete check | Pass condition and evidence limit |
| --- | --- | --- |
| G19, actual user guide | Follow README quick start and its sample steps against the exact generated app and exported version. Check named controls, expected outputs, saving, recovery and limitations after repair. | [R] Every claimed step works; unsupported behavior is explicit. A nonempty README or prompt asking for one is not evidence that its steps were exercised. |
| G20, executable contents | After separate packaging approval, inspect the staged payload and ZIP, launch the resulting app and compare fixed-oracle outputs to the approved source. | [R] Payload contains only intended app/wrapper files, with no agent sessions or credentials. App behavior matches checked bytes. Test the artifact on each claimed platform, not just the build host. |
| G21, executable lifecycle | Cancel before packaging, attempt duplicate download/restart during packaging, quit during packaging and reopen. | [R] No false delivered state; active job settles; interrupted packaging is visible and retryable. Demonstrate actual child termination, not just a state change. |
| G22, executable recovery | In the standalone app, save synthetic data, reload, quit, reopen and update to a newer version. | [R] Persistence and version compatibility match the guide; evidence distinguishes stable wrapper storage from random preview-origin storage. Existing smoke checks reload, not every cold-start/update case. |
| G23, download and signing behavior | Inspect whether packaging needs a runtime download and platform signing, and where packaged apps store state. | [R] Owner explicitly approves the concrete external/download/write scope before this suite runs. Do not run it as part of a no-install fixture batch. |

[E, runner report] G09's meaningful-test limitation and G13's source-export races have failing targeted-function results in [[Research/QA/Runner/Harness-Coverage]]. [R] Reuse those reproductions and request fixes through the coordinator. The reconciliation and concrete closure criteria are in [[Research/QA/Acceptance-Reconcile-631849f]]. A native GUI check adds evidence but does not replace those failures.

[E, script inspection] Executable smoke performs real packaging, can download Electron, requests ad hoc signing on macOS, launches the generated native app and writes its operating-system application profile. It remains outside the fixture-only scope. No packaged acceptance result is inferred from source staging or a passing development test.

## Result record and regression cadence

[R] For each scenario retain: scenario ID, source commit, interface, app/browser version, dimensions, synthetic input revision, mode (static/fixture/live), exact steps, expected answer, observed answer, status, active time, waiting time, help count, relevant screenshot or sanitized output path, and defect ID. Keep model-authored tests separate from fixed-oracle acceptance. Report limitations explicitly and preserve failed evidence.

[R] Recheck the commit and clean status before executing an approved command. If the main session reports a new push, record both hashes and changed paths, let the sole coordinator update the QA checkout, and reassess affected scenarios. Do not pull under an active test or mix results from different revisions. Frontend changes go back to Dan with the smallest reproducible case; backend or harness changes go to the appropriate owner through the coordinator.

[R] Reuse the runner's reported 128-test gate at `50fcaea` rather than rerunning its unit/catalog coverage without a new concern. GUI tests must be run at this new revision because none is yet reported. Re-run related automation after a fix, then exercise the affected end-to-end path. Full live acceptance is complete only when every claimed pilot slice and custom brief passes in each claimed interface against the fixed answers, and each unsupported published requirement remains disclosed. More tokens can buy broader exploration, but they cannot replace an observed result.

## Sources

- [E] Pinned sources, read locally: https://github.com/danjung9/FleetHarness/tree/0f175a8ce346521c4462fc134d40c0973eac1323 and https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe
- [E] `package.json`, `src/Home.tsx`, `scripts/smoke-home.mjs`, `scripts/smoke-electron.mjs`, `scripts/smoke-system-design.mjs`, `scripts/smoke-activity.mjs`, `scripts/smoke-phases.mjs`, `scripts/mock-provider.mjs`, `electron/main.ts`, `electron/pi-backend.ts`, `electron/preview.ts`, `harness/fixtures.ts`, `harness/recipes.ts`, `harness/integration.ts`, `tests/harness-tools.test.ts` at the cited commits.
- [E] [[Research/Plan/Test-Results]], [[Research/Interfaces/Officer-Walkthrough]], [[Research/FleetHarness-MVP/Delta-0f175a8]], [[Research/QA/Static-Findings]] and the November 4 bridge assignment. The chief's [[Research/Plan/Plan]] remains a draft recommendation, not authority to execute.
- [P] Captured event requirements: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12 ; https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11 ; https://cdao.hackathon.maximus.com/event/norfolk/use-cases/36 . Their vault summaries were read; live portal contents were not refreshed for this plan.

## Current test entry points at 631849f

[E] The first local batch at `50fcaea` passed compilation/builds and stopped when the fixture could not bind loopback. Main has explicitly assigned itself an independent fixture-only GUI pass at `631849f`; this chat is not retrying that blocked route. [R] The following command map documents current scripts for result attribution and future permitted execution, not a request to bypass sandbox restrictions. No installation, login, live key, source changes or executable packaging is included.

[R] Verify the pinned source and existing binary before any separately permitted run. Stop on an unexpected revision, missing runtime or failed build. Do not import the Electron package merely to test availability: its loader can install a missing runtime.

```sh
cd ~/Documents/CDAO/fh-org/qa-lead
git status --short
git rev-parse HEAD
test -x node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p electron/tsconfig.json
env -i PATH="$PATH" TMPDIR=/private/tmp node node_modules/vite/bin/vite.js build
```

[R] Required source hash: `631849f638614735a89a555d487d6b3c777c52e3`. The current source scripts are:

```sh
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-phases.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-home.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-electron.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-system-design.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-activity.mjs
```

[E] Home smoke has no npm alias, so it must be named explicitly. Electron smoke now selects the Pi radio, and system-design smoke navigates Home to Flow and returns to Preview after reload. UI captures go under `output/playwright/`; the scripts use synthetic temporary profiles. [R] Retain raw result receipts and source hashes, classify environment failures separately, and do not automatically retry blocked launches. The raw smoke output alone does not cover the Home title-search/Stop/accessibility findings or independent pilot acceptance.

[R] Keep `smoke-chatgpt.mjs` and `smoke-executable.mjs` outside this batch. The former starts the actual login protocol; the latter has download/signing/native-launch effects. New lifecycle, export-race and containment harnesses require concrete review. Live M/S/O/C generation requires its separate owner-approved preparation boundary and event connection. These are outstanding evidence gates, not silently granted permission.
