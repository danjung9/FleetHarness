---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Pinned source and screenshot observations, public design patterns and limits behind the UX proposals."
---

# What the interfaces and public tools show

## Bottom line

[R] Extend the task-oriented work already present at 50fcaea rather than commission another frontend. [E] The original and Studio still require a technical handoff to create software, while the newer Field Workspace already moves technical details behind the task. [R] The next useful visual is the officer's actual result, with conflicts, review and recovery. [A] None of the inspected products has been tested head to head for this user's task.

## Evidence boundary

[E] Read Git objects at 50fcaea1e86028503ae66bd2f17287093ad30cbe in ~/Documents/CDAO/FleetHarness. Local HEAD and mvp still point to 0f175a8; no checkout, fetch, install or application execution occurred. All source paths below refer to 50fcaea. Source inspection establishes implemented branches and labels, not successful runtime behavior.

[E] Inspected all seven supplied PNGs in Research/FleetHarness-MVP/screens with the image viewer. They show browser previews, including unavailable build controls. Research/Interfaces associates them with 0f175a8; they are not fresh screenshots of 50fcaea. Read the interface comparison, walkthrough and recommendation, the Plan and Findings notes, and Simplicity-Requirements.

[E] Research/Plan/Test-Results reports 78/78 main tests, 39/39 harness tests and root type checking passing at 0f175a8, with fake/scripted providers. The assigned reports directory was empty initially. At the final recheck, reports/mvp-gate.md reported a PASS at 50fcaea, timestamp 14:34:58, with 128 passed and zero failed. The short gate summary does not enumerate commands or provide desktop, live-provider, packaging or user-session results. No tests were run in this review.

[E] Both relay/LATEST.md and relay/LATEST-analysis.md became available before completion and were read. They confirm Workbench V3, executable delivery, separate storage, and app-before-guide prompt ordering at 50fcaea. The recommendations preserve those changes. Ops/Directors/Directive-rande.md was still absent. The 14:34:39 feed reports the runner's mvp moved to 50fcaea; that is separate from the earlier local checkout observation.

## What an officer encounters

| Surface | Source or screenshot observation [E] | Consequence to investigate [A] |
| --- | --- | --- |
| Original first screen | original-1-home.png shows an unbuilt starter called Ready, a seven-stage graph, queued work, tool names and files. src/App.tsx initializes the factory view. | A user can confuse a saved request with a usable tool. A pipeline diagram does not show how their training draft will change. |
| Original intake | original-2-new-challenge.png and RequirementsForm show three fields. Catalog selection supplies challengeId; generic starters do not. | Shorter intake is useful, but unprompted acceptance criteria still demand specification-writing skill. |
| Studio discovery | studio-1-home.png shows task cards, filters and search. Most of the first viewport is introductory text. The training task has a friendly title. | Easier recognition, but a collection of challenges can look like a library of finished applications. |
| Studio intake | studio-2-new-challenge.png and BriefEditor show title plus six sections, two optional. The meter counts all six. Autosave and brief transfer exist. | Requiring users to interpret deliverables and evaluation adds writing burden. A partial completeness meter can overstate missing work. |
| Saved work and setup | studio-3-my-builds.png is empty; both settings PNGs show browser-only controls. The two API modules use separate browser storage keys. | Switching interfaces can look like lost work. Account and provider decisions interrupt the officer's task. |
| Execution | App.tsx has a run disclosure and confirmation. Studio.tsx calls startRun directly from both brief submission and BuildWorkspace. Both display Stop. | Preserve the original's informed start decision when borrowing Studio's simpler task language. A stop button alone does not establish shutdown. |
| Evidence | Both show aggregate test counts, criteria and review notes. Studio uses the label Independent test output. App.tsx explains agent-written tests. | Host execution is different from independently chosen acceptance cases. Show which requirement actually passed. |
| Delivery | ExecutableDownload.tsx is used by both interfaces. electron/main.ts implements executable packaging and source/evidence export. | Earlier recommendations to add a standalone download are superseded. Improve clarity and test the existing path. Packaging is not proof of offline data recovery or approval to deploy. |

## The teammate change that alters the recommendation

[E] 50fcaea contains src/workbench/, a third renderer documented in docs/workbench.md. BuildWorkspace.tsx has Your request, Try your tool, Review & download, and Technical details. Completed runs initially select the preview. BriefEditor.tsx keeps a short request form with draft restoration; browser users can download a request. Field Workspace has separate storage.

[R] Do not propose a new officer mode, new third interface, or moving code/logs into Technical details as wholly new work. Cards 01, 05 and 06 extend this existing direction. Dan should choose the renderer containing the rehearsed, accepted run. The original and Studio remain the main comparison requested here; Workbench received a targeted overlap check, not a full visual or runtime review.

[E] In Workbench, the start control directly calls startRun. Its Stop success notice says creation stopped after the API call. [R] Reconcile consent and confirmed-stop wording with the backend owner before relying on those statements. Do not equate receipt of a request with observed child-process termination.

[E] The executable path has source checks before staging and again after packaging, plus an abort controller. The separate source/evidence export still checks before a folder dialog and then copies the workspace. [R] Keep these paths distinct in any evidence-integrity discussion. A package download does not transfer the generated app's current user records.

## Public patterns worth borrowing

[V] Sources below are public primary documentation opened November 4, 2026. They establish documented product behavior or design guidance. No vendor account, example deployment or benchmark was used. “Best” here means a useful pattern for the proposed job, not a verified product ranking.

| Source | Documented pattern [V] | FleetHarness proposal and limit [R] |
| --- | --- | --- |
| Lovable plan mode, https://docs.lovable.dev/features/plan-mode | Presents an editable plan for review before implementation. | A compact, task-language brief review. Do not introduce another conversational mode selector for the officer. |
| Lovable preview toolbar, https://docs.lovable.dev/features/preview-toolbar | Select a page element, change text, annotate or comment in context. This replaces its older separate visual editor. | Card 08: point at a confusing result and request a change. Requires version binding and preview isolation, so defer. |
| Replit plan mode, https://docs.replit.com/features/agent/plan-mode | A proposed task can be revised, cancelled or approved for building. | Make the consequential transition explicit. Borrow the interaction, not the product's infrastructure vocabulary. |
| Replit version control, https://docs.replit.com/replit-workspace/workspace-features/version-control | Describes automatic checkpoints with a visual timeline and restoration. | Card 09: compare named versions before choosing one. FleetHarness does not gain checkpoint behavior merely by preserving run folders. |
| Bolt quickstart, https://support.bolt.new/building/quickstart | Uses a worked example, an element selector and previewing an earlier version before restoring it. | Examples reduce blank-page work. Restoration should preserve the current version and state its data scope. No speed or cost claim is adopted. |
| Power Apps process diagrams, https://learn.microsoft.com/en-us/power-apps/maker/plan-designer/process-diagram | Shows process stages and expandable steps, decisions and responsible roles; permits natural-language or manual revision. | Use a small diagram of the user's work: inputs, check, person reviews, saved draft. A larger agent graph is not a replacement for this. |
| AppSheet offline guidance, https://support.google.com/appsheet/answer/10107724?hl=en | Documents local caching, initial online provisioning and configurable sync; warns about stale changes during prolonged disconnection. Browser behavior has additional limits. | Card 04: state what is saved where and test cold launch separately from a warm offline tab. Do not adopt AppSheet or claim its offline behavior transfers to FleetHarness. |
| GOV.UK check answers, https://design-system.service.gov.uk/patterns/check-answers/ | Provides a review page before submission with routes to correct answers. | Cards 03 and 05: show the exact version and an Edit action before accepting it. |
| GOV.UK error summary, https://design-system.service.gov.uk/components/error-summary/ | Pairs an error summary with field errors and focus/link behavior. | Card 02 and all forms: name the offending input and take the user to it. |
| USWDS step indicator, https://designsystem.digital.gov/components/step-indicator/ | Uses short stages for a linear multi-page sequence, separate navigation and text status. | Use only when intake actually needs multiple screens. Do not turn build stages into invented time percentages. |

[R] Keep Dan's existing visual system. Borrow interaction patterns rather than copying a vendor's styling, installing its library or importing proprietary implementation. Avoid adding cloud publishing, general chat, a drag-and-drop workflow canvas or extra catalogs before task acceptance.

## Sources

- [E] Local Git provenance, private link not fetched: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe
- [E] src/App.tsx; src/studio/Studio.tsx; src/studio/brief.ts; both API modules; shared ModelSettings, ActivityFeed, SystemDesign and PhaseDetails; shared/types.ts; electron/main.ts; electron/executable.ts; harness/tools/scheduling.ts; targeted Workbench files above.
- [E] Screenshot filenames: original-1-home.png, original-2-new-challenge.png, original-3-settings.png, studio-1-home.png, studio-2-new-challenge.png, studio-3-my-builds.png, studio-4-settings.png.
- [E] Final coordination sources: ~/.local/share/fleethacker-context/org/relay/LATEST.md, relay/LATEST-analysis.md, reports/mvp-gate.md, reports/feed-7.md and reports/snapshot-7.md.
- [E] [[Research/Interfaces/README]], [[Research/Interfaces/Side-by-Side]], [[Research/Interfaces/Officer-Walkthrough]], [[Research/Interfaces/Recommendation]], [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Test-Results]].
- [R] [[Research/Naval-User/Simplicity-Requirements]].
- [V] Full public URLs are in the pattern table.

