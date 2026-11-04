---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Bounded static QA of both interfaces identifies criteria formatting, review-state, preview and officer handoff defects."
---

# Static QA findings

## Verdict and evidence boundary

[E] Read-only inspection found branch `qa` clean at `0f175a8ce346521c4462fc134d40c0973eac1323` in `~/Documents/CDAO/fh-org/qa`. [E] Evidence below comes from that source and existing supplied screenshots, not a fresh application session. [E] No repository program, tests, application, installation, model request or reproduction was run for this review. [A] Runtime outcomes remain unverified, including all three generated pilot applications and a custom build.

[R] Prioritize criteria entry and fresh review state before an officer-led pilot. [R] Validate preview refresh and browser handoff before relying on them in a demonstration. [E] Existing approval gates and operational-readiness notices remain visible in source (`electron/main.ts:42-46,72-82`; `src/App.tsx:159`; `src/studio/Studio.tsx:181`). [A] These observations establish neither a successful real-model build nor that every generated application meets its brief.

[E] All repository paths below are relative to the pinned checkout above. [E] Screenshot names refer to `Research/FleetHarness-MVP/screens/` in this vault. [R] Severity is prioritization for a noncoding division officer, department head or yeoman-clerk, not a measured incident rating. [E] Earlier context is in [[Research/Interfaces/Officer-Walkthrough]], [[Research/FleetHarness-MVP/Officer-Test]], [[Research/FleetHarness-MVP/Delta-0f175a8]] and [[Research/Architecture/Findings]].

## 1. High: original criteria use literal backslash tokens [E]

- [E] Source: `src/App.tsx`, `RequirementsForm`, lines 95 and 100, uses `criteria.join('\\n')` and `criteria.split('\\n')`. Those string literals represent a backslash followed by `n`, rather than a line break.
- [R] Trigger and reproduction: open a catalog pilot or starter in New challenge. Inspect the prefilled criteria, then replace them with three short criteria separated using Enter. Save and inspect the criteria count and review list.
- [A] Expected versus actual: one entered line should produce one criterion. Prefilled criteria should display separate lines. The code instead displays literal `\n` separators for seeded entries, and treats ordinary typed line breaks as part of one criterion. Untouched seeded entries still split back into multiple criteria; this is not wholesale loss of seeded criteria.
- [A] Impact: the officer's three acceptance decisions become one item, with misleading counts and poorer review traceability. A sufficiently long combined item can also hit the per-criterion limit (`electron/storage.ts:14`). Evidence level: static inference, not reproduced.
- [R] Validate both untouched seeded criteria and three typed lines, including editing one seeded criterion. Assert the saved array and visible list, not merely a successful save.

## 2. High: Studio carries review notes and the checkbox into a new run [E]

- [E] Source: `src/studio/Studio.tsx:82,152,180` keys `BuildWorkspace` only by project ID and initializes `feedback` and `checked` once. `electron/pi-backend.ts:76-80` changes the run ID and clears the saved report, approval and feedback for a new run. No corresponding local review-state reset appears in `BuildWorkspace`.
- [R] Trigger and reproduction: finish one synthetic run, enter review notes and check the inspection box. Start a new run from the same Studio workspace, stay there through completion, then reopen Review & delivery.
- [A] Expected versus actual: a new result should require fresh notes and a fresh inspection acknowledgement. Local old notes and the checkmark can remain and satisfy the frontend form conditions once the new report is ready. Evidence level: static inference.
- [E] This does not bypass backend verification or create approval automatically. `electron/main.ts:72-77` still requires a new explicit approval request and a passing, unchanged source revision.
- [A] Impact: a department head can submit a fresh approval using an acknowledgement and notes that describe the previous result.
- [R] Validate two runs with visibly different outputs; require an unchecked box and empty or clearly archived prior notes after the run ID changes.

## 3. High: Studio starts execution without the original's permission disclosure [E]

- [E] Source: Studio calls `api.startRun` directly after Generate software (`src/studio/Studio.tsx:74-80`) and from the workspace (`:163`). The original pauses in a start modal explaining local file editing, shell execution, provider context, usage and a fresh run folder (`src/App.tsx:253`). Studio's brief note describes stages and one repair, but omits that permission summary (`Studio.tsx:142`).
- [R] Trigger and reproduction: with an authorized preconfigured desktop connection, select pilot 12, 11 or 36, then press Generate software. Repeat Start a new run.
- [A] Expected versus actual: the officer should see and acknowledge what execution permits. Studio dispatches immediately, including when replacing the currently displayed run. Evidence level: static inference from the call path.
- [A] Impact: a task-focused officer can authorize local program execution and provider usage without seeing the scope presented by the other interface.
- [R] Validate the decision screen and dispatch boundary with a fixture provider. Require a clear scope, usage notice, cancel action and explicit run action; do not enter credentials for the officer.

## 4. Medium: Studio Refresh can leave the same application loaded [E]

- [E] Source: `src/studio/Studio.tsx:178` refreshes only the preview URL; the iframe key remains `p.runId`. `electron/preview.ts:10-12` returns the same cached URL for the same workspace. The original instead increments an iframe revision (`src/App.tsx:125,134,136`).
- [R] Trigger and reproduction: open a generated preview, change a visible value in the controlled fixture's `index.html` without changing the run ID, then press Studio Refresh.
- [A] Expected versus actual: Refresh should reload the document. The unchanged URL and key do not request iframe navigation, even though the success notice says Preview refreshed. Evidence level: static inference.
- [A] Impact: an officer reviewing a repaired timeline or schedule can judge stale output.
- [R] Validate with an obvious version marker. Confirm both that the iframe reloaded and that the displayed marker changed; also check whether reloading intentionally discards unsaved application edits.

## 5. Medium: original task shortcuts select a different recipe from the pilots [E]

- [E] Source: `shared/types.ts:62-77` supplies Message parsing, Scheduling and Offline workflow starters without a challenge ID. `src/App.tsx:115-117` offers them beside the Norfolk catalog. `harness/integration.ts:15` routes an ID-less input through `customPacket`, whose default recipe is `workflow` (`harness/planner.ts:18-20`). Catalog pilots 12, 11 and 36 select `messages`, `scheduling` and `offline` respectively (`harness/catalog.ts:90,134,138`).
- [R] Trigger and reproduction: create Scheduling from its shortcut, then create catalog challenge 11. Compare their phase skills and recipe. Repeat for message parsing versus 12 and offline workflow versus 36.
- [A] Expected versus actual: similarly named entry points suggest the same domain assistance. The shortcut receives the generic workflow recipe. This does not prove its generated app fails, but it changes the guidance without an explicit user choice. Evidence level: static inference.
- [A] Impact: an officer can unknowingly choose weaker task-specific guidance by taking the most obvious shortcut.
- [R] Validate the saved packet and visible phase plan for each pair; assign a domain recipe to shortcuts or state the difference plainly.

## 6. Medium: Studio's review checklist drops pilot-specific outcomes [E]

- [E] Source: `src/studio/brief.ts:22-25` puts source requirements in the Requirements section but populates Evaluation criteria only from the recipe. `Studio.tsx:180-181` shows `p.criteria` beside approval; it does not render the full saved requirements there.
- [E] Concrete omissions from that checklist: pilot 12's frequency-plan/change-over/flight-quarter fields and synchronized 24-hour display (`harness/catalog.ts:140`); pilot 11's editable weekly board and personnel loading view (`:136`); pilot 36's one-page path to fleet and packet-time baseline (`:92`). The recipe checklists contain other useful checks (`harness/recipes.ts:13-18,28-33,43-48`).
- [R] Trigger and reproduction: save each untouched Studio pilot brief, then compare its review-side Success looks like list with the original Requirements section.
- [A] Expected versus actual: approval should keep all scoped task outcomes visible. The checklist presents a narrower recipe list. This is a review-display gap, not evidence that the agent never receives source requirements; the packet retains them (`harness/planner.ts:14-16`). Evidence level: static inference.
- [A] Impact: the reviewer can miss a conspicuous task deliverable while checking every displayed item.
- [R] Validate a requirement-to-result checklist for each pilot, with unimplemented items explicitly marked.

## 7. Medium: original intake discards unsaved work on ordinary navigation [E]

- [E] Source: `src/App.tsx:95` holds form content in component state; `:117` changes its key when the template/catalog choice changes. The modal closes on Escape, its close button or an outside click (`:30-34`). No dirty-form confirmation or draft restoration appears in these paths.
- [R] Trigger and reproduction: type a custom problem, then inspect Scheduling or the Norfolk catalog and return. Separately type a custom brief, press Escape and reopen New challenge.
- [A] Expected versus actual: the draft should survive or the user should receive a discard choice. These paths unmount or replace the form and restore initial content. Evidence level: static inference.
- [A] Impact: a yeoman-clerk comparing templates can lose the wording of a task without choosing to discard it.
- [R] Validate recovery after each trigger, including an accidental outside click. Compare with Studio's explicit device draft behavior, rather than claiming either route has durable cross-device storage.

## 8. Medium: original browser briefs have no in-app desktop handoff [E]

- [E] Source: `src/api.ts:10,13,16-23` saves browser briefs to browser localStorage and rejects desktop-only actions. `electron/storage.ts:29-36` loads desktop state from its separate filesystem root. Original Settings is model configuration (`src/App.tsx:188-194`); its intake and brief screens provide no brief export/import control (`:94-120,247`). Studio provides JSON download/import (`Studio.tsx:142,186`).
- [R] Trigger and reproduction: save a custom brief in the original browser preview, follow the instruction to open desktop, then look for that brief or a transfer action.
- [A] Expected versus actual: the officer needs a usable continuation path. The browser does not share its saved brief with desktop and the original supplies no transfer control. Evidence level: static inference; no cross-environment session was run.
- [A] Impact: the first successful save can lead to manual re-entry and an apparent missing project.
- [R] Validate the full browser-to-desktop journey with synthetic text. Provide an explicit transfer action or begin the officer exercise in the prepared desktop environment.

## 9. Low: Studio's progress indicator conflicts with required-field completion [E]

- [E] Screenshot observation: `studio-2-new-challenge.png` shows check-circle symbols beside all six empty sections while reporting 0 of 6. Source `src/studio/Studio.tsx:134,142` counts Resources and Links toward the percentage although both are optional, and renders a check-circle for every section.
- [R] Trigger and reproduction: fill the title and four required sections of a custom brief, leave Resources and Links empty, then inspect progress and Save brief.
- [A] Expected versus actual: a valid brief should have an unambiguous ready state. It can be valid at 4 of 6, approximately 67%, while every row already has a check-shaped symbol. Evidence level: screenshot observation for empty symbols, static inference for the completed form.
- [A] Impact: an officer can spend time inventing optional resource/link content to reach 100%.
- [R] Validate required-field completion separately from optional enrichment and ask the user to explain whether the brief is ready.

## 10. Medium: original preview errors become a first-build empty state [E]

- [E] Source: `src/App.tsx:127` catches every `api.preview` rejection and sets `preview` to null without displaying the error. `:136` then shows Ready for your first build. The host can throw preview failures other than missing output (`electron/main.ts:64-66`; `electron/preview.ts:26-28`).
- [R] Trigger and reproduction: use a fixture API that rejects preview loading for an existing run, such as a controlled server-start failure, then open Preview or Reload preview.
- [A] Expected versus actual: a failed preview should identify a recoverable loading error. The UI instead implies no app has been built. Evidence level: static inference.
- [A] Impact: an officer can restart generation or assume work is missing when the failure concerns only displaying it.
- [R] Validate distinct no-output, load-failure and successfully-loaded states, preserving the error and a retry action.

## 11. Medium: exported delivery instructions use literal backslash-n separators [E]

- [E] Source: `electron/main.ts:94-100` builds `DELIVERY.md` with `.join('\\n')`. This is the same literal-token issue as finding 1, in a separate delivery path. The host writes that file after copying workspace artifacts.
- [R] Trigger and reproduction: approve and export an authorized synthetic fixture through either interface, then open the actual exported `DELIVERY.md` in a plain text editor and Markdown viewer.
- [A] Expected versus actual: install/run instructions, evidence counts, review notes and readiness limits should be readable paragraphs. The host's separators produce visible `\n` text rather than line breaks. Evidence level: static inference; no package was exported here.
- [A] Impact: the officer or receiving clerk gets a poorly formatted handoff document at the point where clear run instructions and limitations matter.
- [R] Validate actual newline bytes and rendered instructions in the exported file, alongside opening the exported application. Do not infer offline application correctness from this formatting check.

## Sources and not verified

- [E] Pinned local source: `~/Documents/CDAO/fh-org/qa`, branch `qa`, commit `0f175a8ce346521c4462fc134d40c0973eac1323`; paths and functions cited per finding.
- [E] Existing screenshots visually inspected: `Research/FleetHarness-MVP/screens/studio-2-new-challenge.png` and `original-1-home.png`. The latter shows Ready, Queued, No run yet and Tests / Not run yet together; it supplies context for the original entry experience, not runtime proof of the findings above.
- [E] Required context read: `AGENTS.md`, [[Team/Now]], [[Reference/Open-Questions]], [[Research/00-Brief]], plus the earlier research named above.
- [A] Not verified: actual generated pilot behavior, browser-to-desktop transfer, fresh model inference, test execution, Stop termination, export contents and all reproduction outcomes. Existing reported test or smoke results do not substitute for those observations.
- [R] Keep this report with the runtime QA plan. Record any validation result against the same pinned revision or name the changed revision explicitly.
