---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Use desktop Studio for the demo entry after closing run-consent and evidence gaps, retain the original as a fallback, and defer full consolidation."
---

# Recommendation for Thursday

## Bottom line

[R] Make desktop Studio the demo's front door, conditional on a successful rehearsal and an explicit confirmation before a build starts. [R] Keep the original as a technical fallback through Thursday, November 5, 2:00 PM EST; do not merge the two applications or migrate their stores during the sprint. [R] Borrow the original's start disclosure, activity viewer and evidence wording. [R] Show one useful generated application early, then show how its exact requirements, tests and review led to it. [E] The code supports that route, but this static review does not establish a successful live-provider run or an independently accepted application.

## Why this choice

[E] Studio begins with problem discovery and a contextual brief; the original begins inside an agent workflow (`src/studio/Studio.tsx:90`, `:123`, `:128`; `src/App.tsx:198`). [A] That makes Studio easier for an officer sponsoring a small software task, although the first-ten-minute comparison still requires a user trial. [E] Both use the same desktop workflow and review/export handlers, so choosing Studio does not require a new engine (`electron/main.ts`; `electron/pi-backend.ts`).

[P] Impact carries 30% of judging, speed to Fleet 20%, scalability 20%, barrier removal 15% and judges' discretion 15%, as summarized in [[Event/Judging]]. [R] Spend time on the useful task, its checks and its offline behavior before more catalog polish. [A] A more inviting interface may improve the user experience score, but neither a catalog count nor an animated design diagram demonstrates operational value or Fleet scalability.

[E] `docs/studio-direction.md` describes the Startups.RIP visual reference. [R] Keep its readable problem directory and detail-to-brief flow. Reduce the oversized introductory area enough to expose one complete task card and its next action in the first viewport. [R] The borrowed pattern should help the officer find a concrete task; no additional visual redesign is necessary for Thursday.

## Decision about the two interfaces

| Horizon | Decision [R] | Reason and condition |
| --- | --- | --- |
| Before submission | Keep both code paths. Rehearse and present one desktop Studio workspace. Keep the original available to the technical operator, without switching interfaces mid-story. | [E] They have separate project stores and launch paths. A mid-demo switch does not open the same saved run automatically (`scripts/studio.mjs`; `src/api.ts`; `src/studio/api.ts`). |
| Immediate borrowing | Bring the original's run confirmation into Studio. Use its explicit agent-authored-test caveat. Reuse ActivityFeed if time remains. | [E] Studio currently calls startRun directly and renders raw logs, while the original already solves these presentation needs (`src/App.tsx:253`, `:37`; `src/studio/Studio.tsx:79`, `:177`). |
| After the event, if continued | Converge on one officer-facing Studio with an expandable technical workspace. Share consent and review components first. Retire the duplicate original renderer only after migration/export behavior and regression checks are accepted. | [E] Shared ModelSettings, PhaseDetails and SystemDesign already provide a workable component boundary. [R] Preserve old work and run evidence through any migration; do not point two active applications at one Store as a shortcut. |

## Prioritized work

[E] File paths below are relative to `/Users/mukul/Documents/CDAO/FleetHarness`, reviewed at `0f175a8ce346521c4462fc134d40c0973eac1323`. [A] Hours are rough active engineering/review effort for someone familiar with the code, including the listed focused check. They exclude model waiting, account recovery and unrelated defects. They are not commitments by danjung9. [R] Reconcile each item against his current changes before editing; no source change was made by this review.

| Tag and change | Specific files and bounded action [R] | Done means [R] | Estimate [A] |
| --- | --- | --- | --- |
| **must**, prepare the actual desktop demo | `scripts/studio.mjs`, `src/ModelSettings.tsx`, `docs/studio.md`: rehearse Studio in its own existing data root with the owner-configured event provider. Update launch/setup wording to reflect both available engines and the chosen event route. Select one catalog challenge, not the generic starter. | Owner demonstrates the connection in Studio without exposing credentials; the selected challenge ID, model/backend and saved run are known. The officer never has to choose an account or enter a key during the demo. If the approved route fails, use the tested fallback rather than switching to an unapproved personal login. | 0.5 to 1 hour |
| **must**, confirm each build and rerun | `src/studio/Studio.tsx:74`, `:163`; extract the existing disclosure from `src/App.tsx:253` into a small shared component if that reduces duplication. Route both editor Generate software and workspace start/rerun through it. | Before execution, the user sees the chosen brief, permitted synthetic inputs, what local files/programs may be touched, provider use and applicable usage limits. Cancel starts no run; confirmation starts exactly one. It states that the build cannot authorize deployment or message release. Keep Stop visible. | 1 to 2 hours |
| **must**, make the selected brief understandable | `src/studio/Studio.tsx:123`, `:142`, `:181`; `src/studio/brief.ts`: prepare the chosen catalog brief with a small synthetic example, expected output, one forbidden action and explicit limitations. Add a concise permitted-data notice before entry. Collapse technical crew/tool detail by default while leaving it inspectable. | Officer can explain input, output, success checks, prohibited actions and who decides to approve. Optional fields do not look compulsory. No real records are needed to try the example. | 0.5 to 1.5 hours |
| **must**, give the reviewer independent expected results | `src/studio/Studio.tsx:180`; generated app's existing evidence files; shared backend only if needed. Add a compact review view or linked evidence sheet for a fixed valid case, conflict/ambiguity case and bad-input case. Expected answers are human-owned and outside the agent-writable run. | The actual delivered logic is checked against those answers. Display expected, actual, pass/fail and run/artifact identity, plus what was not tested. Say the host ran agent-authored tests; do not imply independent test authorship. A failed or unrun case is not green. | 2 to 4 hours |
| **must**, preserve the approved delivery revision | `electron/main.ts:80`, `electron/storage.ts:sourceHash`; `scripts/smoke-electron.mjs` and/or `scripts/smoke-studio.mjs`: coordinate with the architecture owner on copying a verified snapshot or verifying the copied destination before marking delivered. | A file change during the folder dialog or copy cannot produce an unverified package marked Delivered. The export manifest identifies the approved run and checked content. Do not duplicate work if this is already fixed on the teammate's new revision. | 1 to 2 hours |
| **must**, rehearse one complete result and stop path | `scripts/smoke-studio.mjs`, shared runtime checks, `docs/studio.md`, plus the selected exported app. Extend only the checks needed for consent, rejection and delivery changes; record an actual permitted-provider rehearsal separately from fixture tests. | In Studio: save, build or open the clearly identified earlier run, inspect output, review, approve and export. Demonstrate Stop and preserved work on a separate run. Open the export offline on fresh synthetic input. Record failures and gaps. If Stop fails, the operator closes the desktop process, retains the local record and escalates to the agreed technical owner before another run. | 1.5 to 2.5 hours |
| **should**, reuse readable activity | `src/studio/Studio.tsx:177`, `src/ActivityFeed.tsx`, `shared/activity.ts`; include scoped shared CSS. Replace raw record rendering with the existing paired activity component, keeping raw records expandable. | Failed and interrupted actions are easy to distinguish; long records do not dominate the main task; existing activity checks plus a Studio integration check cover rendering. | 1 to 2 hours |
| **should**, reduce choice and wording friction | `src/studio/Studio.tsx`, `src/studio/studio.css`, `src/studio/brief.ts`: shorten the hero; explain bookmarks versus saved briefs; label build states plainly; explain that local export is a prototype handoff. Offer technical details after the main task. | At 1440 by 900, the selected task and next action are easy to see. A noncoding reviewer can find their saved brief and explain what approval/export do. | 0.5 to 1.5 hours |
| **should**, make optional progress honest | `src/studio/Studio.tsx:134`, `:142`: track required sections separately or clearly label the six-section meter as completeness including optional material. Avoid a checked-looking symbol for empty sections. | A valid brief with optional fields blank appears ready to save/build, while actual missing requirements remain clear. | 0.25 to 0.5 hour |
| **cut**, full UI merge and store migration | `src/App.tsx`, `src/studio/Studio.tsx`, both API modules, `electron/storage.ts`: defer. | Thursday stays on one rehearsed route. No data conversion or automatic original/Studio synchronization is introduced under deadline. | 6 to 12+ hours if attempted; 0 hours allocated |
| **cut**, new distribution and broader catalog work | `package.json`, `vite.studio.config.ts`, `scripts/studio.mjs`, `harness/catalog.ts`: defer a Studio installer, new engine integration, new challenge families and cosmetic redesign. | The known local launch and one measured result remain the demo scope. Catalog entries are described as starting points. | 4 to 10+ hours if attempted; 0 hours allocated |

[A] The six must items total approximately 6.5 to 13 active hours if none is already complete; shared architecture fixes and existing accepted evidence can reduce that. [R] Use a single owner for the shared backend change and avoid overlapping edits to the large Studio.tsx file. Select one should item only after the must evidence is complete. [R] Freeze feature changes by Thursday 10:00 AM EST and reserve the remaining four hours for rehearsal, recording, submission preparation and human review. [P] The stated portal deadline is Thursday, November 5, 2:00 PM EST.

## Coordinate with the active teammate

[R] Hand danjung9 this short list and ask which fixes are already under way before any implementation branch is created. Compare against his new revision, then give each file one editor at a time. Prefer small component extraction or localized changes over reformatting App.tsx or Studio.tsx. [R] Keep the source-hash/export change in the shared backend workstream and the consent/readability changes in the UI workstream; both must be tested together on the selected demo revision. [E] No message was sent, no branch created and no code edited during this seat's review.

## Demo sequence

1. [R] Open desktop Studio at the selected task or saved brief. Show the fictional inputs and the officer's desired result. Spend only enough time in discovery to establish why this task was chosen.
2. [R] Show the accepted generated application early. Change one input and show one valid result and one rejected or unresolved case. If it is an earlier run, say so and show its identity.
3. [R] Return to that run's brief and evidence. Show expected versus actual results, limitations and the exact approval scope. Distinguish a host-run test from a human-owned acceptance check.
4. [R] Demonstrate explicit approval and local export. Show the exported app working offline only if that exact workflow has been tested. Connected generation and disconnected use are separate claims.
5. [R] Keep technical workflow, raw files and diagrams available for judge questions. Demonstrate stop/recovery separately rather than abandoning the main useful-task story halfway through.

## What would change the recommendation

- [R] Use the original as the factory front door if Studio cannot complete the consent and selected-run rehearsal by the feature freeze. It already has the start disclosure and the clearer activity viewer. Do not claim this means its first screen is officer-friendly.
- [R] Use the interface that has the reproducible, independently checked run if approved provider setup or a required feature works reliably only there. Separate storage means this is an evidence decision, not a theme toggle.
- [R] Prefer the original's compact intake pattern if noncoding participants consistently finish a custom brief with fewer interventions there, while understanding scope and approval equally well. Do not decide from visual preference alone.
- [R] Open directly in the generated task application if the demo audience is evaluating on-duty task use rather than sponsoring software creation. Keep Studio as the explanation of how it was built.
- [R] Reconsider any live-build demonstration if cancellation, evidence integrity or the approved provider path fails. Use a clearly labeled previously generated, independently checked artifact, or disclose that no accepted artifact is ready. Never relabel a fixture as a live model result.

## Not verified

[E] No app, tests, install or model connection was run for this comparison. Hosted-model quality, current account availability, real-user comprehension, actual run duration/cost, the exported app's offline behavior and desktop packaging were not verified. [A] Proposed effort and current overlap with danjung9's uncommitted or other-checkout work remain estimates. [R] Retain these limits in the submission until replaced by recorded evidence.

## Sources

- [E] Pinned code reference, not fetched: https://github.com/danjung9/FleetHarness/tree/0f175a8ce346521c4462fc134d40c0973eac1323
- [E] Exact repository paths and functions in [[Research/Interfaces/Side-by-Side]]; hypothetical user path in [[Research/Interfaces/Officer-Walkthrough]].
- [E] Earlier findings rechecked where used: [[Research/Architecture/README]], [[Research/FleetHarness-MVP/Reconcile]], [[Research/Landscape/Startups-RIP/Fleet-Version]], [[Research/Naval-User/Simplicity-Requirements]].
- [P] [[Event/Judging]] and [[Research/00-Brief]].
