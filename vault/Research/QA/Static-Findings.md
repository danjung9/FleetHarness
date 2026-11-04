---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Bounded static QA of both interfaces identifies review-state, preview, officer handoff and new-revision packaging risks."
---

# Static QA findings

## Bottom line

[E, later pinned diff] At `631849f638614735a89a555d487d6b3c777c52e3`, Studio and Workbench are removed and the original app gains a default catalog Home. Their interface-specific findings below are historical, not defects in a currently shipped alternate UI. The original start confirmation remains. Backend files are unchanged from `50fcaea`, so source/export/packaging concerns remain applicable. [R] Keep the revisions attached to every finding.

[E] Initial read-only inspection found branch `qa` clean at `0f175a8ce346521c4462fc134d40c0973eac1323` in `~/Documents/CDAO/fh-org/qa`. [E] During review the checkout advanced to `50fcaea1e86028503ae66bd2f17287093ad30cbe`; baseline findings below remain pinned to the earlier commit, followed by a separately labeled update. [E] Evidence below comes from that source and existing supplied screenshots, not a fresh application session. [E] No repository program, tests, application, installation, model request or reproduction was run for this review. [A] Runtime outcomes remain unverified, including all three generated pilot applications and a custom build.

[R] Prioritize fresh review state and an informed execution decision before an officer-led pilot. [R] Validate preview refresh and browser handoff before relying on them in a demonstration. [E] Existing approval gates and operational-readiness notices remain visible in source (`electron/main.ts:42-46,72-82`; `src/App.tsx:159`; `src/studio/Studio.tsx:181`). [A] These observations establish neither a successful real-model build nor that every generated application meets its brief.

[E] All repository paths below are relative to the pinned checkout above. [E] Screenshot names refer to `Research/FleetHarness-MVP/screens/` in this vault. [R] Severity is prioritization for a noncoding division officer, department head or yeoman-clerk, not a measured incident rating. [E] Earlier context is in [[Research/Interfaces/Officer-Walkthrough]], [[Research/FleetHarness-MVP/Officer-Test]], [[Research/FleetHarness-MVP/Delta-0f175a8]] and [[Research/Architecture/Findings]].

## 1. High: Studio carries review notes and the checkbox into a new run [E]

- [E] Source: `src/studio/Studio.tsx:82,152,180` keys `BuildWorkspace` only by project ID and initializes `feedback` and `checked` once. `electron/pi-backend.ts:76-80` changes the run ID and clears the saved report, approval and feedback for a new run. No corresponding local review-state reset appears in `BuildWorkspace`.
- [R] Trigger and reproduction: finish one synthetic run, enter review notes and check the inspection box. Start a new run from the same Studio workspace, stay there through completion, then reopen Review & delivery.
- [A] Expected versus actual: a new result should require fresh notes and a fresh inspection acknowledgement. Local old notes and the checkmark can remain and satisfy the frontend form conditions once the new report is ready. Evidence level: static inference.
- [E] This does not bypass backend verification or create approval automatically. `electron/main.ts:72-77` still requires a new explicit approval request and a passing, unchanged source revision.
- [A] Impact: a department head can submit a fresh approval using an acknowledgement and notes that describe the previous result.
- [R] Validate two runs with visibly different outputs; require an unchecked box and empty or clearly archived prior notes after the run ID changes.

## 2. High: Studio starts execution without the original's permission disclosure [E]

- [E] Source: Studio calls `api.startRun` directly after Generate software (`src/studio/Studio.tsx:74-80`) and from the workspace (`:163`). The original pauses in a start modal explaining local file editing, shell execution, provider context, usage and a fresh run folder (`src/App.tsx:253`). Studio's brief note describes stages and one repair, but omits that permission summary (`Studio.tsx:142`).
- [R] Trigger and reproduction: with an authorized preconfigured desktop connection, select pilot 12, 11 or 36, then press Generate software. Repeat Start a new run.
- [A] Expected versus actual: the officer should see and acknowledge what execution permits. Studio dispatches immediately, including when replacing the currently displayed run. Evidence level: static inference from the call path.
- [A] Impact: a task-focused officer can authorize local program execution and provider usage without seeing the scope presented by the other interface.
- [R] Validate the decision screen and dispatch boundary with a fixture provider. Require a clear scope, usage notice, cancel action and explicit run action; do not enter credentials for the officer.

## 3. Medium: Studio Refresh can leave the same application loaded [E]

- [E] Source: `src/studio/Studio.tsx:178` refreshes only the preview URL; the iframe key remains `p.runId`. `electron/preview.ts:10-12` returns the same cached URL for the same workspace. The original instead increments an iframe revision (`src/App.tsx:125,134,136`).
- [R] Trigger and reproduction: open a generated preview, change a visible value in the controlled fixture's `index.html` without changing the run ID, then press Studio Refresh.
- [A] Expected versus actual: Refresh should reload the document. The unchanged URL and key do not request iframe navigation, even though the success notice says Preview refreshed. Evidence level: static inference.
- [A] Impact: an officer reviewing a repaired timeline or schedule can judge stale output.
- [R] Validate with an obvious version marker. Confirm both that the iframe reloaded and that the displayed marker changed; also check whether reloading intentionally discards unsaved application edits.

## 4. Medium: original task shortcuts select a different recipe from the pilots [E]

- [E] Source: `shared/types.ts:62-77` supplies Message parsing, Scheduling and Offline workflow starters without a challenge ID. `src/App.tsx:115-117` offers them beside the Norfolk catalog. `harness/integration.ts:15` routes an ID-less input through `customPacket`, whose default recipe is `workflow` (`harness/planner.ts:18-20`). Catalog pilots 12, 11 and 36 select `messages`, `scheduling` and `offline` respectively (`harness/catalog.ts:90,134,138`).
- [R] Trigger and reproduction: create Scheduling from its shortcut, then create catalog challenge 11. Compare their phase skills and recipe. Repeat for message parsing versus 12 and offline workflow versus 36.
- [A] Expected versus actual: similarly named entry points suggest the same domain assistance. The shortcut receives the generic workflow recipe. This does not prove its generated app fails, but it changes the guidance without an explicit user choice. Evidence level: static inference.
- [A] Impact: an officer can unknowingly choose weaker task-specific guidance by taking the most obvious shortcut.
- [R] Validate the saved packet and visible phase plan for each pair; assign a domain recipe to shortcuts or state the difference plainly.

## 5. Medium: Studio's review checklist drops pilot-specific outcomes [E]

- [E] Source: `src/studio/brief.ts:22-25` puts source requirements in the Requirements section but populates Evaluation criteria only from the recipe. `Studio.tsx:180-181` shows `p.criteria` beside approval; it does not render the full saved requirements there.
- [E] Concrete omissions from that checklist: pilot 12's frequency-plan/change-over/flight-quarter fields and synchronized 24-hour display (`harness/catalog.ts:140`); pilot 11's editable weekly board and personnel loading view (`:136`); pilot 36's one-page path to fleet and packet-time baseline (`:92`). The recipe checklists contain other useful checks (`harness/recipes.ts:13-18,28-33,43-48`).
- [R] Trigger and reproduction: save each untouched Studio pilot brief, then compare its review-side Success looks like list with the original Requirements section.
- [A] Expected versus actual: approval should keep all scoped task outcomes visible. The checklist presents a narrower recipe list. This is a review-display gap, not evidence that the agent never receives source requirements; the packet retains them (`harness/planner.ts:14-16`). Evidence level: static inference.
- [A] Impact: the reviewer can miss a conspicuous task deliverable while checking every displayed item.
- [R] Validate a requirement-to-result checklist for each pilot, with unimplemented items explicitly marked.

## 6. Medium: original intake discards unsaved work on ordinary navigation [E]

- [E] Source: `src/App.tsx:95` holds form content in component state; `:117` changes its key when the template/catalog choice changes. The modal closes on Escape, its close button or an outside click (`:30-34`). No dirty-form confirmation or draft restoration appears in these paths.
- [R] Trigger and reproduction: type a custom problem, then inspect Scheduling or the Norfolk catalog and return. Separately type a custom brief, press Escape and reopen New challenge.
- [A] Expected versus actual: the draft should survive or the user should receive a discard choice. These paths unmount or replace the form and restore initial content. Evidence level: static inference.
- [A] Impact: a yeoman-clerk comparing templates can lose the wording of a task without choosing to discard it.
- [R] Validate recovery after each trigger, including an accidental outside click. Compare with Studio's explicit device draft behavior, rather than claiming either route has durable cross-device storage.

## 7. Medium: original browser briefs have no in-app desktop handoff [E]

- [E] Source: `src/api.ts:10,13,16-23` saves browser briefs to browser localStorage and rejects desktop-only actions. `electron/storage.ts:29-36` loads desktop state from its separate filesystem root. Original Settings is model configuration (`src/App.tsx:188-194`); its intake and brief screens provide no brief export/import control (`:94-120,247`). Studio provides JSON download/import (`Studio.tsx:142,186`).
- [R] Trigger and reproduction: save a custom brief in the original browser preview, follow the instruction to open desktop, then look for that brief or a transfer action.
- [A] Expected versus actual: the officer needs a usable continuation path. The browser does not share its saved brief with desktop and the original supplies no transfer control. Evidence level: static inference; no cross-environment session was run.
- [A] Impact: the first successful save can lead to manual re-entry and an apparent missing project.
- [R] Validate the full browser-to-desktop journey with synthetic text. Provide an explicit transfer action or begin the officer exercise in the prepared desktop environment.

## 8. Low: Studio's progress indicator conflicts with required-field completion [E]

- [E] Screenshot observation: `studio-2-new-challenge.png` shows check-circle symbols beside all six empty sections while reporting 0 of 6. Source `src/studio/Studio.tsx:134,142` counts Resources and Links toward the percentage although both are optional, and renders a check-circle for every section.
- [R] Trigger and reproduction: fill the title and four required sections of a custom brief, leave Resources and Links empty, then inspect progress and Save brief.
- [A] Expected versus actual: a valid brief should have an unambiguous ready state. It can be valid at 4 of 6, approximately 67%, while every row already has a check-shaped symbol. Evidence level: screenshot observation for empty symbols, static inference for the completed form.
- [A] Impact: an officer can spend time inventing optional resource/link content to reach 100%.
- [R] Validate required-field completion separately from optional enrichment and ask the user to explain whether the brief is ready.

## 9. Medium: original preview errors become a first-build empty state [E]

- [E] Source: `src/App.tsx:127` catches every `api.preview` rejection and sets `preview` to null without displaying the error. `:136` then shows Ready for your first build. The host can throw preview failures other than missing output (`electron/main.ts:64-66`; `electron/preview.ts:26-28`).
- [R] Trigger and reproduction: use a fixture API that rejects preview loading for an existing run, such as a controlled server-start failure, then open Preview or Reload preview.
- [A] Expected versus actual: a failed preview should identify a recoverable loading error. The UI instead implies no app has been built. Evidence level: static inference.
- [A] Impact: an officer can restart generation or assume work is missing when the failure concerns only displaying it.
- [R] Validate distinct no-output, load-failure and successfully-loaded states, preserving the error and a retry action.

## Revision update: 50fcaea

[E] The following six items reference only `50fcaea1e86028503ae66bd2f17287093ad30cbe`, read with pinned Git objects. The new commit adds Workbench, standalone packaging and a README-generation follow-up. [E] The original/Studio line-splitting and delivery-document newline literals are valid JavaScript newline escapes at both reviewed commits. Two draft findings misread escaped tool output and were removed after a source-byte check; they are not product defects.

### N1. High: Workbench also starts execution without a permission disclosure

- [E] `src/workbench/BuildWorkspace.tsx:30,33` calls `api.startRun` directly. The original retains a confirmation describing local shell commands, provider context and usage at `src/App.tsx:255`.
- [R] Reproduce with a local fixture: save a request, choose Create my tool and observe whether an informed confirmation precedes dispatch. Repeat after editing or creating a new version.
- [A] An officer can authorize program execution and provider use without the scope disclosure visible in the original. This is source-based inference; no click-through was executed.
- [R] Require a readable execution summary and cancel action before a live run. Verify selected provider/model and Stop, without asking QA to enter credentials. This extends baseline finding 2 to the new interface; it does not establish an automatic authorization bypass in the host.

### N2. High: executable smoke has download, signing and external-state effects

- [E] The smoke invokes packaging via `electron/main.ts:134-140`. `electron/package-worker.ts:32-37` allows a runtime download and requests macOS ad hoc signing. `scripts/smoke-executable.mjs:49-55` extracts the ZIP, verifies its local macOS signature and launches the result.
- [E] The wrapper chooses OS application data at `electron/executable.ts:29,73`, outside the smoke's temporary host profile. The smoke learns that path only at line 64 and removes it at line 82.
- [A] An assertion failure at smoke lines 57-63 can leave generated-app state outside the temporary tree. Runtime download endpoints, cache behavior and actual external writes remain unobserved.
- [R] Treat this as a separately approved packaging test, not part of a no-install fixture batch. Before running, define the runtime source and generated profile location; register cleanup before renderer assertions. Test a deliberate early failure using synthetic state only.

### N3. High: distribution and isolation need more acceptance evidence

- [E] `electron/executable.ts:33-50` configures renderer isolation, denied navigation/popups/permissions and an offline content policy. The new smoke checks absent host/Node globals and a counter's reload persistence (`scripts/smoke-executable.mjs:57-63`).
- [E] The smoke defaults to the development host; `FLEET_EXECUTABLE` selects an installed host at lines 24-25. It does not test every supported operating system, cold-start persistence, delivered-archive quarantine behavior or all denied capabilities.
- [R] Validate the packaged-host path, launch on each claimed platform/architecture, and harmless blocked requests, popups, frames, permissions and navigation in the generated wrapper. A locally created and extracted archive does not demonstrate the recipient's macOS approval experience.
- [A] Current static controls are useful but the existing smoke assertions do not prove every distribution or isolation claim. This is a coverage gap, not a claim that a particular boundary was bypassed.

### N4. Medium: browser Workbench can overwrite requests across tabs

- [E] `src/workbench/api.ts:7-19` loads cached state once and rewrites the complete state on save. Listeners at line 41 are local to that module instance; there is no cross-tab storage listener. Draft keys reuse challenge/project identity (`src/workbench/BriefEditor.tsx:9,17`).
- [R] Reproduce with two same-origin browser tabs opened before either saves: create different synthetic requests, save in each tab, then reload both. Separately edit the same challenge draft in both tabs.
- [A] The later save can overwrite the earlier tab's newly saved request or draft. A clerk can believe both saves succeeded and discover missing work later. Runtime reproduction is pending.
- [R] Pass requires both independently created requests to survive, and concurrent edits to reconcile or raise a visible conflict. Report this to the frontend owner; do not patch it from QA.

### N5. Medium: Workbench executable controls lack a complete tested path

- [E] Workbench smoke approves and exports source at `scripts/smoke-workbench.mjs:145-157`; executable smoke uses the original `.app-shell` (`scripts/smoke-executable.mjs:26-39`). Workbench's top download button checks busy state but not persisted packaging state (`src/workbench/BuildWorkspace.tsx:33`), while `src/ExecutableDownload.tsx:9-14` does check it.
- [R] Reproduce, only after packaging approval: start a download, reload Workbench during packaging and try the top action. Also exercise chooser cancel, successful download, failure/retry, quit/restart and duplicate clicks.
- [A] Reload can re-enable the top action; the host's delivery lock should reject the duplicate (`electron/main.ts:38-40`). This is a potentially confusing UI and missing end-to-end coverage, not evidence of concurrent packaging succeeding.
- [R] Pass requires one job, accurate status across reload and a clear recovery path. Source export success is not a standalone-download result.

### N6. Medium: standalone recipients do not receive the new app-specific guide

- [E] Staging includes only `index.html`, the trusted wrapper and package metadata (`electron/executable.ts:74-77`). The ZIP adds generic start instructions (`electron/package-worker.ts:43-52`). The new README is available via source export or host file inspection, rather than the standalone payload.
- [R] Give a first-time tester only the approved executable ZIP and ask them to perform the app's documented synthetic example, recover data and identify limitations. Compare what they can access with the generated README.
- [A] A recipient can receive an easy-to-launch app without its specific workflow guide or limitations. No recipient test has been performed.
- [R] Make the guide and limitations accessible in the app or explicitly deliver them as companion material. Verify this handoff after repair, because generated controls and instructions can change together.

## Unified-interface findings at 631849f

### U1. Medium: a visible card title is not searchable

- [E] `src/Home.tsx:35` searches catalog ID, formal title, summary and category, while line 65 displays a friendly title from line 15. The actual catalog text for ID 12 at `harness/catalog.ts:138` does not contain its visible phrase, Message to mission timeline.
- [R] Reproduce by pasting that displayed title into Home's Search challenges field. Pass requires the card to remain discoverable by its own visible title.
- [A] The card disappears because its displayed wording is absent from the search input. This is source-derived, not a runtime observation.
- [E] `scripts/smoke-home.mjs:21` checks a nonexistent search but does not check a successful search by visible title.

### U2. Medium: Home hides Stop while a build runs

- [E] `src/App.tsx:235` uses a Home-specific header branch without Stop; Stop is in the other branch at line 237. Reload defaults to Home at line 194. `src/Home.tsx:30` defaults to Discover, without a running-build summary or Stop action.
- [R] Start a delayed synthetic fixture, return Home or reload while it is active, and ask the operator to stop it. Pass requires a readily discoverable path and no false stopped claim.
- [A] Stop disappears until the operator returns to the running project's controls. The Agents running indicator remains (`src/App.tsx:222`), and My builds can reopen the project. This is a discoverability regression, not proof that termination fails.
- [E] Home smoke saves a draft but never starts it (`scripts/smoke-home.mjs:34`); desktop smoke starts/stops through the API at lines 80-81, so neither checks Stop discovery from Home.

### U3. Low: the accessible card name omits its visible title

- [E] `src/Home.tsx:63` sets the button's `aria-label` from the formal catalog title, overriding the friendly visible heading at line 65.
- [R] For ID 12, compare the visible title with the button's accessibility-tree name and try speech or label-based navigation using the visible wording. Pass requires the visible label to be included in the accessible name.
- [A] Users can be shown one label while assistive navigation identifies another. Rendered accessibility behavior has not been exercised here.
- [E] `scripts/smoke-home.mjs:30` locates a card by the formal accessible name, so this mismatch is outside its assertions.

## Related runtime findings from the runner

[E, report read after this static pass] [[Research/QA/Runner/Harness-Coverage]] reports 403/410 additional checks passing and seven failing verification/export expectations at `50fcaea`. These are separate reported executions, not tests performed for this note. They cover ambiguous source-hash serialization, comment-only files satisfying the Node test count, source changes during the export dialog and copy loop, replaced review evidence, incomplete export cleanup, and same-workspace symlinks omitted from delivery. [R] Keep those failures visible alongside the 128-pass baseline and reuse their reproducers. The export races previously identified by source inspection now have targeted-function evidence; native dialog behavior remains a separate GUI check.

## Sources and not verified

- [E] Pinned local source: `~/Documents/CDAO/fh-org/qa`, branch `qa`, commit `0f175a8ce346521c4462fc134d40c0973eac1323`; paths and functions cited per finding.
- [E] Revision-update source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe ; baseline source: https://github.com/danjung9/FleetHarness/tree/0f175a8ce346521c4462fc134d40c0973eac1323 . Both were read locally, not fetched from those URLs.
- [E] Existing screenshots visually inspected: `Research/FleetHarness-MVP/screens/studio-2-new-challenge.png` and `original-1-home.png`. The latter shows Ready, Queued, No run yet and Tests / Not run yet together; it supplies context for the original entry experience, not runtime proof of the findings above.
- [E] Required context read: `AGENTS.md`, [[Team/Now]], [[Reference/Open-Questions]], [[Research/00-Brief]], plus the earlier research named above.
- [A] Not verified: actual generated pilot behavior, browser-to-desktop transfer, fresh model inference, test execution, Stop termination, export contents and all reproduction outcomes. Existing reported test or smoke results do not substitute for those observations.
- [R] Keep this report with the runtime QA plan. Record any validation result against the same pinned revision or name the changed revision explicitly.
