---
type: research
status: ready-for-review
owner: mukul
updated: 2026-11-04
summary: "Active acceptance coverage for the unified Home/Flow app, with historical interface cases, fixed synthetic answers and a blocked GUI execution record."
---

# FleetHarness officer acceptance test plan

## Bottom line

[E] The latest source reviewed, `631849f`, consolidates the app into one Home/Flow interface; Studio and Workbench are removed. [E] The dedicated QA checkout remains at `50fcaea`, where compilation and all three historical UI builds pass, but the first fixture was blocked by sandbox loopback denial; see [[Research/QA/Results-50fcaea]]. [R] Use the active four-row matrix below for the retained app and preserve the older interface matrices only as history. [R] Test both the factory and the exact app it produces against fixed synthetic answers. [R] Record partial capability honestly and keep live generation dependent on the owner-configured event connection and permitted execution scope.

## Active target: unified interface at 631849f

[E, pinned Git diff] `631849f638614735a89a555d487d6b3c777c52e3` adds `src/Home.tsx`, makes Home the default, retains the original Flow/Preview/Review routes and start confirmation, replaces the engine select with radio choices, removes Studio/Workbench and their launch/build/smoke commands, and adds `scripts/smoke-home.mjs`. The diff in `electron/`, `harness/`, `skills/`, `shared/` and `package-lock.json` is empty from `50fcaea`. [R] Backend findings and domain answer keys therefore remain relevant; do not infer that frontend consolidation fixes them or that old build results validate new UI code.

| Active case | Entry and plain-language journey | Acceptance mapping |
| --- | --- | --- |
| U12 | Home, Challenge catalog, select message/timeline ID 12, review the prefilled brief, Save challenge, start through the confirmation, try the actual app and review. | [R] M1/M2 and [[Research/QA/Officer/12-Timeline-Golden]], then current approval/export gates. |
| U11 | Home, Scheduling, select ID 11, enter the invented constraints, save, start, inspect valid and conflicting schedules and return an incorrect draft. | [R] Keep the two-request S1 smoke separate from the four-request submission key in [[Research/QA/Officer/11-Training-Golden]]. |
| U36 | Home, Offline & edge, select ID 36, scope to synthetic forms and records, save, create, exercise recovery/conflicts and inspect claimed delivery. | [R] O1/O2/O3 plus [[Research/QA/Officer/36-Paperless-Golden]], with real transport and cold-launch claims checked separately. |
| UC | Home, New challenge or write your own brief, enter C and six criteria, save, reopen through My builds, start and check C1. | [R] Preserve validation, version-specific review and local-only delivery expectations. |

[R] Apply all three persona passes and applicable G01 through G23 gates to these four active rows. This replaces the 12 historical interface rows as the current execution matrix. Do not restore removed interfaces or count their absence as a regression against a superseded product choice. Preserve test input IDs so evidence remains traceable across revisions.

[R] New Home checks: search by the exact visible card title, select a card and verify its catalog ID survives, return from Home to a running build and locate Stop, resume through My builds, refresh into the default Home page, inspect empty-state recovery and operate the new model radio controls by keyboard. Existing headless results do not establish these behaviors. Alternate-profile data migration is not demonstrated; do not claim old Studio/Workbench browser or desktop data appears automatically in the retained app.

[E] The loopback denial is an execution-environment block, not a failure of Home. [R] Do not advance or modify `qa-lead` independently; ask the sole coordinator to allocate the next pinned revision. The commands at the end are the historical `50fcaea` batch, already attempted only as recorded. They must not be reused for the removed interfaces at `631849f`.

## Scope, ownership and evidence

- [E, main-session handoff] The coordination session owns the organization runner and will relay Dan's pushes. This QA assignment does not create another runner or pull loop. The current assignment is two notes, this plan and [[Research/QA/Static-Findings]].
- [E, later bridge handoff and local Git check] GUI execution now uses the dedicated, clean, detached checkout `~/Documents/CDAO/fh-org/qa-lead` at `50fcaea1e86028503ae66bd2f17287093ad30cbe`. The coordinator will keep it stable and advances it only on request. The moving `fh-org/qa` belongs to the runner. Its QA agents own catalog-wide harness coverage and pilot golden examples; this plan supplies GUI acceptance and independent review criteria without duplicating those jobs.
- [E, handoff] Dan owns `src/` and `studio/`. QA reports frontend defects and reproduction steps. It does not edit those directories or the rest of the QA repository under this assignment.
- [E] Source references below are relative to `~/Documents/CDAO/fh-org/qa`. The original/Studio matrix was designed against `0f175a8`; the revision update and execution proposal target `50fcaea`. After detecting the move, source reads use explicit Git objects. Source was read, not executed. Builds, browser launch, Electron launch, installation and model calls have not been performed in this review.
- [E, user handoff] Any separately launched `codex exec` worker must use `-p fleet-lock`; permitted worker models are `gpt-6.1-sol` and `gpt-6-astra`. The event profile is not a personal ChatGPT login. Two bounded source reviewers supported baseline and new-revision checks; no additional organization was started.
- [E, source] Browser mode can prepare briefs but cannot perform a real build, approve or export a generated application. Desktop is required for those stages (`src/api.ts`, `src/studio/api.ts`).
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

## Scenario matrix across both interfaces

[R] Execute every row in the appropriate desktop interface for end-to-end acceptance. Browser intake can be checked separately with no model. For each row, the division-officer persona prepares the request, the clerk persona exercises entry and recovery, and the department-head persona reviews the fixed answers and limitations. Those are three role passes per row, not a claim that three people have participated.

| ID and interface | Plain-language steps | Expected result and pass/fail criteria | Live model needed? |
| --- | --- | --- | --- |
| M-O, original, case 12 | Home, New challenge, Norfolk catalog, search OPTASK, choose ID 12. Read and adjust the brief to the synthetic grammar. Save, start through the confirmation, try M1/M2 in Preview, then review and export locally. | [R] Catalog ID remains 12; message recipe is selected; every fixed answer is correct in the actual browser app; warnings and source text remain visible; approval follows inspection. Fail on lost duplicates, invented dates, unchecked claims of USMTF support or mismatched export. | Intake: no. Scripted path: fixture. Authentic generation: yes. |
| M-S, Studio, case 12 | Discover, search OPTASK, Build this challenge. Edit the six-section brief, save, reopen, generate, open App preview, try M1/M2, then Review & delivery. | [R] Same oracle as M-O; saved sections survive; required outcomes are inspectable at review. A ready badge alone is insufficient. Record the current absence of a separate start-confirmation step. | Same distinction as M-O. |
| S-O, original, case 11 | Choose the catalog PB4T entry, not the generic Scheduling shortcut. Add the invented constraints and separate success criteria. Save, generate, inspect the resulting board using S1 through S5, approve only the bounded draft. | [R] Catalog ID 11 and scheduling tool path retained; a valid alternative is shown; infeasibility differs from incomplete search; no silent constraint relaxation. Mark recurrence and departmental negotiation unimplemented if absent. | Intake: no. Complete generated board: yes. Existing helper checks do not replace it. |
| S-S, Studio, case 11 | Discover, Scheduling, open the training entry, Build this challenge. Change one assumption, save, return through My builds, generate, test S1 through S5, inspect success criteria and decision. | [R] Same oracle as S-O; edited scope preserved; novice can see the conflict and explain the proposal. Fail if architecture progress is presented as validated schedule correctness. | Same distinction as S-O. |
| O-O, original, case 36 | Choose Paperless Underway from the catalog. Scope the brief to fictional local record capture, conflict review and recovery. Generate, enter O1, perform O2, inspect O3 where exposed, then review the limitations. | [R] ID 36 retained; both edits survive; restart recovery actually works in each claimed environment; no fabricated synchronization receipt. In-memory reconciliation alone is partial scope. | Intake: no. Generated persistence and conflict UI: yes. Actual sync needs an implemented test transport as well. |
| O-S, Studio, case 36 | Discover, Offline & edge, open Paperless Underway, prepare and save the brief. Generate, use App preview and Review & delivery; repeat recovery with the exported app. | [R] Same oracle as O-O; user distinguishes queued, saved, conflict and synchronized states. Fail on silent loss or automatic review of changed content. | Same distinction as O-O. |
| C-O, original, custom | New challenge, Custom problem. Enter C and type six ordinary newline-separated criteria. Save, revisit Brief, generate, then act as clerk and reviewer on C1. | [R] Six separate criteria survive. Custom recipe remains intentional. Generated records and approval match C1. Normal line splitting is present in the source; this is a regression check, not a confirmed defect. | Intake: no. Authentic custom app: yes. |
| C-S, Studio, custom | New challenge. Put C into Overview/Requirements, specify the local app as deliverable and the six checks as evaluation criteria. Save, reopen, generate, exercise C1 and review. | [R] All entered sections and six checks survive. Draft, saved brief, generated app and local export are distinguishable. Restarting generation must require a fresh inspection acknowledgment. | Intake: no. Authentic custom app: yes. |

[R] Do not substitute the scripted message fixture for a generated scheduler, record system or custom register. A fixture verifies plumbing and predetermined behavior; it cannot answer whether a model follows a new brief. For thorough model coverage, repeat the four briefs with each allowed event model that the actual Pi runtime lists and the event account permits. Record unsupported model identifiers; do not invent a mapping, switch to a personal account, or silently choose another model. Cross-interface repetition is still needed for UI acceptance even when the shared backend passes once.

## Shared control and failure checks

[R] Apply these to both interfaces unless stated. Fixture and simulation results remain separate from live-model results. Every unexecuted entry is currently `NOT RUN`.

| ID | Action | Pass criterion | Required execution |
| --- | --- | --- | --- |
| G01, empty and invalid intake | Save a blank title, short/empty description and empty criteria. Enter six ordinary lines, literal separators and repeated edits. | Field errors are understandable; no silent criteria loss; saving does not duplicate an existing brief. | Browser or desktop; no model. |
| G02, browser handoff | Save a browser brief, restart that browser context, transfer Studio JSON to an isolated desktop profile. Try returning to the original UI. | Browser limitations are explicit; Studio transfer preserves ID, text and criteria. Original automatic transfer is unsupported unless demonstrated. Separate storage must not look like data disappearance without explanation. | Browser plus desktop; no model. |
| G03, connection honesty | With a new empty app profile, try to start. Inspect engine and model choices. | Missing configuration blocks work with a useful next step. The UI must not imply that ChatGPT subscription login uses the event API key. | Desktop; no credential entry and no live inference. |
| G04, model and key handling | After owner configuration only, identify Pi and the permitted exact model. Owner chooses session-only storage for the initial live trial. Inspect only non-secret connection status. | A successful live response is tied to the intended provider/model. No secrets appear in screenshots, logs, briefs, exported artifacts or evidence. A configured badge is not proof of inference. | Owner action and separate live-stage approval. Never inspect actual credential file contents. |
| G05, start disclosure | Ask the operator what Generate/Start authorizes, then start a fixture run. | They can explain local file/command use, provider use and Stop before execution. Record original confirmation versus Studio immediate start. | Local fixture; cognitive check. |
| G06, progress and errors | Observe each phase; trigger the existing scripted repair and a failed result. | Active phase, failure, one repair attempt and final status are understandable. No false claim that research performed live browsing or that a generated component passed acceptance. | Phase and system-design fixtures. |
| G07, stop and quit | Stop during a slow provider response and a tool step; repeat at start preflight. Quit while active, then reopen. | No further model/tool action after confirmed shutdown; descendants terminate; workspace and stopped state survive. A stopped badge without process evidence is partial verification. Cancel during auth preflight must prevent a later start. | Existing fixture covers a subset. Preflight and descendant checks need a separately reviewed bounded harness; do not access unrelated processes or files. |
| G08, approval after new work | Inspect and approve a fixture, start another run of the same project, then return to review. Change the brief separately. | Old approval is invalidated; old notes cannot masquerade as inspection of the new version; checkbox resets. Distinguish backend gate from stale local form state. | Fixture plus manual UI; no live model needed. |
| G09, failed or absent tests | Present absent tests, zero tests, failed tests, skipped/todo tests and a timeout through controlled fixtures. | Approval/export blocked; visible reason. Positive TAP counts prove executed assertions only. | Existing unit evidence first; add targeted fixture only if a gap or change requires it. |
| G10, independent correctness | Supply a result with a wrong synthetic answer even when its generated tests pass. | Human/oracle review rejects it; actual preview behavior and exported app agree with M/S/O/C. | Live artifact or a clearly labeled mutation of a disposable fixture; new mutation harness needs review. |
| G11, preview operation | Load a generated form, submit, change a field, refresh, download if supported. | Form handlers work under the preview sandbox; Refresh actually reloads; new content is visible. Test original and Studio separately. | Desktop fixture/manual interaction. |
| G12, persistence and restart | Save a brief and a generated record, reload, quit, reopen, and reopen an export. | Each claimed persistence boundary retains exact synthetic data. Document origin changes and separate browser/desktop stores. | Fixture or generated app. No live model needed for the persistence check itself. |
| G13, evidence freshness | Change a disposable generated artifact after tests, then attempt approval/export. Also change it while the folder chooser is open. | Stale bytes cannot be delivered under the old hash and approval. Test the exported bytes, not only the workspace. | Original smoke covers the first condition; dialog-time race remains a new targeted test requiring a reviewed fixture. |
| G14, human delivery | With real review notes, approve only the prototype, choose a local destination, inspect the exported app and DELIVERY.md. Cancel the folder chooser once. | Cancel causes no delivery claim; successful export contains readable evidence and exact tested bytes; labels say local prototype delivery, not deployment or an official release. | Local fixture first; final acceptance repeats on real generated artifact. |
| G15, permissions and boundaries | Inspect tool activity and source-defined permissions; test only harmless synthetic canaries in a separately approved dedicated boundary. | No unsupported claim that instructions or a working directory form an OS sandbox. Permission limits and outside-file denial are demonstrated before claiming isolation. | Static now. Runtime boundary test requires an explicit isolated environment and reviewed commands. No reads of real outside files or credentials. |
| G16, accessibility | Keyboard-only intake, dialog, tab navigation, errors and Stop; check visible focus and labels at desktop minimum and narrow browser widths. | All essential actions reachable, no lost focus or hidden Stop, understandable error association and no essential horizontal clipping. | Browser/Electron fixture. Screen-reader behavior remains unverified until separately observed. |
| G17, repeated failure and concurrency | Double-click Start, switch project, try editing settings during active work, fail one of multiple fixture runs. | No duplicate run, per-project state remains correct, settings cannot change underneath a run, failure does not falsely finish another project. | Targeted fixture. Increase concurrency only to test the documented cap, not to generate unnecessary live calls. |
| G18, final artifact provenance | Record commit, brief version, engine/model, real versus scripted provider, run ID, checked source digest and reviewer decision. | A reviewer can match actual tested and delivered bytes. Exclude secrets, personal account information and prohibited data. | All stages; final run evidence only after execution. |

[E, source] Codex in this app requires ChatGPT sign-in and strips the standard OpenAI API-key variables; Pi is the event-key candidate (`electron/codex-rpc.ts`, `electron/codex-session.ts`, `electron/main.ts`). Pi's general tools have host permissions, and phase prompts are not an OS boundary (`electron/pi-backend.ts`, `harness/phases.ts`). [R] The initial approval request below is for local fixture/interface execution only. A live-generation proposal must name the actual permitted preparation environment and owner-configured provider before it runs. Token availability does not settle account authorization or filesystem containment.

## Revision update: 50fcaea

[E, `git diff 0f175a8..50fcaea`] The checkout advanced to `50fcaea1e86028503ae66bd2f17287093ad30cbe` during review. The delta changes 48 files, including backend execution, packaging, dependency declarations and a third interface, Workbench. The commit title's frontend label does not describe its full scope. [E] No code in the checkout was modified by this QA task. The coordinator was notified, and all subsequent comparisons use pinned Git objects.

[E, pinned source] `electron/pi-backend.ts` now requests a practical README after implementation, then asks verification/repair to keep it aligned with the app. This remains part of the build session, not a sixth named phase. `electron/main.ts`, `electron/executable.ts` and `electron/package-worker.ts` add approval-gated standalone packaging and a host-owned renderer wrapper. `package.json` adds `@electron/packager` 20.3.0 and `yazl` 3.3.1. `src/workbench/`, `workbench/index.html`, `vite.workbench.config.ts` and two new smoke scripts add the new interface and packaging tests. These dependencies and tests were inspected, not executed here.

[R] Retain all eight original/Studio scenarios above as regressions at `50fcaea`; old passing results do not establish their outcome after this change. Add the following four Workbench rows. Each repeats the three persona passes and the same independent answer key. There are now 12 interface/use-case rows, with 36 role passes before any model repetitions.

| ID | Plain-language steps in Workbench | Expected result and live-model boundary |
| --- | --- | --- |
| M-W, case 12 | Open the challenge catalog, search ID 12, choose Make this my challenge, edit and save the request, then Create my tool. Use Try your tool with M1/M2 and review each requirement. | [R] Same oracle as M-O/M-S, clear synthetic grammar scope, retained source/warning evidence. Intake needs no model; authentic generation does. |
| S-W, case 11 | Choose training case 11, enter the fixed practice constraints, save, create, try the board and review the valid and impossible cases. | [R] Same S1 through S5 outcomes; constraints visible without opening technical logs. No claim of validated recurring-training policy. Live model needed for generated board. |
| O-W, case 36 | Choose Paperless Underway, narrow to fictional records, save, create, try concurrent corrections and restart recovery, then inspect the delivery options. | [R] Same O1 through O3 outcomes; generated wrapper persistence and preview persistence checked independently. Live model needed for the actual app; network synchronization is still a separate implementation requirement. |
| C-W, custom | Describe a problem, enter C and its six outcomes, save, reopen through My tools, create and test C1. Edit a reviewed record and inspect its approval. | [R] Exact custom criteria retained; clear distinction between factory approval and record-level approval. Live model needed for actual custom software. |

[E, `src/workbench/BuildWorkspace.tsx`] Workbench has an explicit preview revision counter and displays the user's requirements at review. [R] Test these directly instead of carrying Studio's exact refresh behavior over to a different implementation. Also check review-state reset, creation confirmation, error recovery, keyboard focus and the ability to request another version after approval; do not assume the new surface fixes every older concern.

| Added gate | Concrete check | Pass condition and evidence limit |
| --- | --- | --- |
| G19, actual user guide | Follow README quick start and its sample steps against the exact generated app and exported version. Check named controls, expected outputs, saving, recovery and limitations after repair. | [R] Every claimed step works; unsupported behavior is explicit. A nonempty README or prompt asking for one is not evidence that its steps were exercised. |
| G20, executable contents | After separate packaging approval, inspect the staged payload and ZIP, launch the resulting app and compare fixed-oracle outputs to the approved source. | [R] Payload contains only intended app/wrapper files, with no agent sessions or credentials. App behavior matches checked bytes. Test the artifact on each claimed platform, not just the build host. |
| G21, executable lifecycle | Cancel before packaging, attempt duplicate download/restart during packaging, quit during packaging and reopen. | [R] No false delivered state; active job settles; interrupted packaging is visible and retryable. Demonstrate actual child termination, not just a state change. |
| G22, executable recovery | In the standalone app, save synthetic data, reload, quit, reopen and update to a newer version. | [R] Persistence and version compatibility match the guide; evidence distinguishes stable wrapper storage from random preview-origin storage. Existing smoke checks reload, not every cold-start/update case. |
| G23, download and signing behavior | Inspect whether packaging needs a runtime download and platform signing, and where packaged apps store state. | [R] Owner explicitly approves the concrete external/download/write scope before this suite runs. Do not run it as part of a no-install fixture batch. |

[E, runner report] G09's meaningful-test limitation and G13's source-export races now have failing targeted-function results in [[Research/QA/Runner/Harness-Coverage]]. [R] Reuse those reproductions and request fixes through the coordinator. A native GUI reproduction can add confidence about the interface, but it must not be counted as the first discovery or replace the existing failure. Release acceptance remains open while these evidence/delivery defects remain unresolved.

[E, `scripts/smoke-executable.mjs`, `electron/package-worker.ts`, `electron/executable.ts`] The executable smoke invokes real packaging, may download Electron, requests ad hoc signing on macOS, launches a generated native app and writes that app's data under the operating system's application-data directory. Therefore it is excluded from the first no-install proposal. [R] The new Workbench UI smoke can be considered separately after inspecting its scripted provider and launch path; it does not stand in for executable acceptance.

## Result record and regression cadence

[R] For each scenario retain: scenario ID, source commit, interface, app/browser version, dimensions, synthetic input revision, mode (static/fixture/live), exact steps, expected answer, observed answer, status, active time, waiting time, help count, relevant screenshot or sanitized output path, and defect ID. Keep model-authored tests separate from fixed-oracle acceptance. Report limitations explicitly and preserve failed evidence.

[R] Recheck the commit and clean status before executing an approved command. If the main session reports a new push, record both hashes and changed paths, let the sole coordinator update the QA checkout, and reassess affected scenarios. Do not pull under an active test or mix results from different revisions. Frontend changes go back to Dan with the smallest reproducible case; backend or harness changes go to the appropriate owner through the coordinator.

[R] Reuse the runner's reported 128-test gate at `50fcaea` rather than rerunning its unit/catalog coverage without a new concern. GUI tests must be run at this new revision because none is yet reported. Re-run related automation after a fix, then exercise the affected end-to-end path. Full live acceptance is complete only when every claimed pilot slice and custom brief passes in each claimed interface against the fixed answers, and each unsupported published requirement remains disclosed. More tokens can buy broader exploration, but they cannot replace an observed result.

## Sources

- [E] Pinned sources, read locally: https://github.com/danjung9/FleetHarness/tree/0f175a8ce346521c4462fc134d40c0973eac1323 and https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe
- [E] `package.json`, `scripts/studio.mjs`, `scripts/smoke-electron.mjs`, `scripts/smoke-studio.mjs`, `scripts/smoke-system-design.mjs`, `scripts/smoke-activity.mjs`, `scripts/smoke-phases.mjs`, `scripts/mock-provider.mjs`, `vite.studio.config.ts`, `electron/main.ts`, `electron/pi-backend.ts`, `electron/preview.ts`, `harness/fixtures.ts`, `harness/recipes.ts`, `harness/integration.ts`, `tests/harness-tools.test.ts` at that commit.
- [E] [[Research/Plan/Test-Results]], [[Research/Interfaces/Officer-Walkthrough]], [[Research/FleetHarness-MVP/Delta-0f175a8]], [[Research/QA/Static-Findings]] and the November 4 bridge assignment. The chief's [[Research/Plan/Plan]] remains a draft recommendation, not authority to execute.
- [P] Captured event requirements: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12 ; https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11 ; https://cdao.hackathon.maximus.com/event/norfolk/use-cases/36 . Their vault summaries were read; live portal contents were not refreshed for this plan.

## Historical commands reviewed for 50fcaea

[E] This is the concrete fixture-only batch presented to Mukul before his continuation instruction. Build commands and the first phase-fixture command were subsequently executed; remaining GUI commands were blocked at the loopback prerequisite. Exact outcomes are in [[Research/QA/Results-50fcaea]]. [R] This historical scope covers existing dependencies, build outputs, synthetic temporary state and local UI tests. It does not authorize installation, sign-in, real API calls, live-key entry, source edits, pulls, commits, publication, standalone packaging or retrying the stopped UI sandbox experiment. User approval does not override the environment's enforced sandbox.

[E] Package-declared versions include TypeScript 7.0.2, Vite 8.3.5, Electron 45.2.2 and Playwright 1.64.1. The moving QA checkout lacked Electron, but main supplied `qa-lead` with its own dependencies and installed runtime. A read-only path check confirmed its Electron executable, `path.txt`, TypeScript, Vite, Playwright, packager/yazl and local Chrome are present. [R] Check the binary before importing Electron; its loader can install if the binary disappears. Run commands sequentially and stop on failure. The clean environment prevents inheriting provider key variables; it is not a general filesystem sandbox. Do not capture real account screens.

First, verify the approved revision and build the existing source without installing anything:

```sh
cd ~/Documents/CDAO/fh-org/qa-lead
git status --short
git rev-parse HEAD
test -x node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p electron/tsconfig.json
env -i PATH="$PATH" TMPDIR=/private/tmp node node_modules/vite/bin/vite.js build
env -i PATH="$PATH" TMPDIR=/private/tmp node node_modules/vite/bin/vite.js build --config vite.studio.config.ts
env -i PATH="$PATH" TMPDIR=/private/tmp node node_modules/vite/bin/vite.js build --config vite.workbench.config.ts
```

[R] Confirm the hash is still `50fcaea1e86028503ae66bd2f17287093ad30cbe` and there are no unexpected source changes before building. Existing generated outputs are permitted by this execution proposal; tracked source remains untouched. If the coordinator updates the checkout, revise the approval target before executing changed scripts.

Next, run the existing local fixture suites that cover the new phase and UI checks:

```sh
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-phases.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-electron.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-studio.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-system-design.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-activity.mjs
env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-workbench.mjs
```

[E, script inspection] The UI scripts write captures under `output/playwright/`; fixture scripts create and remove their own temporary state. Studio/system-design/activity/Workbench require local Chrome, and all except activity require Electron for their desktop portion. The phase test uses Node and a local fixture. Workbench smoke exports source but does not package an executable. [R] A missing binary is a blocked result, not permission to download it. The original desktop smoke is repeated because backend guide generation and delivery UI changed since its reported `0f175a8` pass. The ChatGPT smoke is excluded because it starts the actual login protocol; executable smoke is excluded because it can download, sign and launch a packaged app outside the temporary host profile.

For manual intake and empty-account checks in the actual desktop app, create a new temporary profile in the same shell and launch one interface at a time:

```sh
qa_state=$(mktemp -d /private/tmp/fleetharness-qa.XXXXXX)
mkdir -p "$qa_state/pi" "$qa_state/original" "$qa_state/studio" "$qa_state/workbench" "$qa_state/codex"
env -i PATH="$PATH" TMPDIR=/private/tmp FLEET_USER_DATA="$qa_state/original" PI_CODING_AGENT_DIR="$qa_state/pi" CODEX_HOME="$qa_state/codex" node node_modules/electron/cli.js .
```

[R] Use the menus to quit the original app before the next command. Do not sign in or configure a provider during this empty-profile check. Then launch Studio using its existing launcher:

```sh
env -i PATH="$PATH" TMPDIR=/private/tmp FLEET_STUDIO_USER_DATA="$qa_state/studio" PI_CODING_AGENT_DIR="$qa_state/pi" CODEX_HOME="$qa_state/codex" node scripts/studio.mjs
```

[R] Quit Studio and end its launcher with Ctrl-C if needed. Workbench has the same empty-profile boundary:

```sh
env -i PATH="$PATH" TMPDIR=/private/tmp FLEET_WORKBENCH_USER_DATA="$qa_state/workbench" PI_CODING_AGENT_DIR="$qa_state/pi" CODEX_HOME="$qa_state/codex" node scripts/workbench.mjs
```

[R] Quit the application and end its launcher with Ctrl-C if needed; retain only synthetic evidence and record the temporary directory for deliberate cleanup. These launches support manual intake and connection-state checks. They do not provide a live model. G07/G13/G15's new lifecycle, export-race and containment harnesses, and the live M/S/O/C generation matrix, require a later concrete command review; they are not silently included in this first approval.
