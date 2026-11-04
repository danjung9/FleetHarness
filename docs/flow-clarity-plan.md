# Clearer progression through AppYard

Approved plan and implementation record · November 4, 2026.

The agreed direction is an automatic build with clear human checkpoints. Users should always know where they are, what AppYard is doing, whether they need to act, and what happens next.

## Implemented

The compact Brief → Build → Review → Deliver header replaces the duplicated journey links in the rail. Home rows use the same journey state to explain where opening a saved build will lead. Build now shows five ordered automatic phases beside the selected phase's outputs, with activity, configuration, and system design available on demand. Starting a build stays in Build; Preview opens the generated app directly.

Review retains notes and acknowledgement per project and run, including after a renderer reload. Approval opens a separate Deliver workspace with app download as its primary action and source/evidence export as a secondary action. Saved outcomes are reported separately. Editing a brief resets the journey and marks retained outputs as belonging to the previous build.

The implementation is in `shared/journey.ts`, `src/JourneyHeader.tsx`, `src/BuildFlow.tsx`, and `src/ReviewFlow.tsx`, integrated through `src/App.tsx`. Existing backend execution, verification, and approval rules remain in force. The planning evidence below records the interface before these changes.

Validation completed:

- `npm run build` passed.
- 28 targeted tests passed across journey state, verification, activity, and system design.
- `node scripts/smoke-journey.mjs` passed with an isolated local provider fixture: automatic build and repair, review notes across navigation and reload, approval to delivery, source export, and resetting approval after a brief edit. It verified four milestones, four utility links, no outer overflow at 1120×720, and no renderer errors.
- `node scripts/smoke-activity.mjs` passed for collapsed phase activity, keyboard disclosure, filtering, tool pairing, streaming, interruption, and safe rendering.
- `node scripts/smoke-quality.mjs` passed for failed/missing browser evidence blocking approval and explicit unverified requirements.

Desktop layouts were inspected at 1512×982 and 1120×720. Implementation captures are in `output/flow-implementation/` and `output/playwright/journey-*.png`. The end-to-end check used synthetic local content and exported source; it did not call a live model or package a standalone app.

## Recommended journey

**Brief → Build → Review → Deliver**

These are persistent, numbered milestones beneath the challenge title. They describe the user's journey. The five automatic phases belong inside Build: **Understand brief → Research → Plan → Implement → Test**. Existing backend stage IDs and automatic execution remain intact.

| Milestone | User's question | Main content | Primary action / handoff |
| --- | --- | --- | --- |
| 1. Brief | What are we making? | Editable problem, intended result, criteria, optional resources; model readiness | Save brief → Start build. If needed, Connect model, then return here. |
| 2. Build | What is happening, and do I need to do anything? | Ordered phases, active work, latest meaningful update, completed outputs | “Working automatically. Your review comes next.” Completion exposes Review build. |
| 3. Review | Does this solve the problem well enough to deliver? | Try app, inspect checks and limitations, record review | Approve prototype, with unmet conditions explained beside it. |
| 4. Deliver | How do I get the result? | App download, source/evidence export, saved destinations | Download app; Export source & evidence is secondary. |

Starting work still uses the existing pre-run confirmation. No approval pauses are added between the automatic phases. Approval remains scoped to prototype delivery.

## Why the current journey feels disconnected

1. The rail offers Flow, Preview, Agents, Review, Brief and Files, while Flow presents seven stages. Users must infer how these two structures relate.
2. Starting a build navigates to Preview, which opens System design during a run. The selected navigation label and visible content describe different things.
3. The graph reads left-to-right across the first row and right-to-left across the second. Its seven-step completion count mixes agent work with human approval and delivery.
4. The selected stage can remain on an earlier phase as execution advances. “What I am inspecting” and “what is running” need distinct treatments.
5. Many stage actions open a generic preview or file list rather than the output of that phase.
6. Approval and delivery share a screen and several competing actions. Review drafts currently live in component state and can disappear when navigating to Preview and back.

Items 1–3 are supported by the captured interface below. Items 4–6 were checked in the implementation; a completed live run was not exercised during this planning review.

## Interaction and layout

### One persistent progress header

Keep the current dark desktop shell, rail, typography and brand treatment. Add the four milestones and a compact status sentence beneath the challenge title. Use the same source of state for the header, Home's next-action label, and the destination when opening a challenge.

Example during execution:

> Build · Planning your app · Phase 3 of 5  
> AppYard is preparing the implementation plan. Implementation starts automatically.  
> View plan · View activity

Example at the human handoff:

> Ready for your review  
> Automated checks passed. Try the app and review the evidence before approving delivery.  
> Review build

Use phase counts as position, not a time estimate or invented percentage. Keep Stop build available as a secondary control. Only show an output link once the artifact exists.

Milestones own progression. The rail retains Home and supporting tools such as Preview, Activity and Files, with Settings at the bottom. Move the existing Brief and Review destinations into their milestones and replace the separate Flow destination with Build. Avoid maintaining two competing sets of progress navigation.

### A straight build sequence

Replace the snake graph with a vertical ordered phase list and adjacent detail area. This preserves reading order at both supported desktop sizes and leaves room for useful explanations. Each phase shows:

- A plain-language title, status and owner: AppYard or You.
- What it does, in one sentence.
- Its actual output, linked directly when available.
- What follows automatically, or what human action is required.

Keep current execution visibly marked even when the user inspects an earlier phase. Offer Back to current phase. Live updates must not move focus or replace an artifact the user is reading.

Keep model details, tools, skills and raw logs under disclosures. System design is an output of planning, reachable from the Plan phase. Preview is an output of implementation, reachable as soon as it exists. Neither becomes an unexpected default destination after starting a run.

Show automatic repair within Test: “Fixing failed checks · attempt 1 of 1.” It does not restart the human journey or imply another approval gate.

### Deliberate review and delivery

Review presents three ordered tasks in one workspace: try the app; inspect checks and limitations; write notes and approve. The preview and evidence remain easy to switch between, with notes retained per project and run. Manual acknowledgement represents the user's review; simply visiting a tab does not certify completion.

Preserve existing approval rules: passing applicable checks, explicit acknowledgement, and at least 10 characters of notes. Explain missing conditions beside the action. Deferred or unverified requirements remain visible after prototype approval.

Successful approval opens Deliver because it follows an explicit user action. Automatic verification completion updates the header and announces readiness without forcibly navigating away from the user's current work.

Delivery shows two understandable outputs: **Download app** and **Export source & evidence**. Keep packaging progress, failure recovery and saved destinations visible. A source export does not imply the standalone app was downloaded; either output can satisfy the existing delivered status.

## State and recovery rules

| Condition | Milestone and guidance | Next action |
| --- | --- | --- |
| New saved brief | Brief · Ready to build | Start build |
| Model unavailable | Brief · Connect a model to build | Connect model; return to this challenge afterward |
| Browser preview | Explain desktop execution and browser-local storage | Desktop setup; do not imply the brief transfers automatically |
| Running | Build · Name the actual active phase | Inspect output or activity; automatic progression |
| Earlier phase selected | Build remains current; inspected phase has separate selection | Back to current phase |
| Repair underway | Build / Test · One automatic repair attempt | View failed checks |
| Failed or stopped | Build · Explain the recorded reason and preserved artifacts | Inspect issue, then Start new build |
| Verification passed, approval pending | Review · Your review is needed | Review build; Approve prototype within Review |
| Approved | Deliver · Ready to download | Download app |
| Packaging | Deliver · Preparing app download | Progress; suppress duplicate submission |
| Packaging failed | Deliver · Approval retained | Retry app download |
| Source exported only | Deliver complete · Source & evidence exported | Download app remains available |
| App downloaded | Deliver complete · App saved to the recorded destination | Export source & evidence remains available |
| Brief edited after a run | Brief · Changed since the previous build | Start new build; mark accessible old output as Previous build |

Use “Start new build,” not “Resume” or “Retry phase”: the backend starts fresh from the current brief in a new folder. Preserve prior-run folders. After a brief edit, draft status takes precedence over retained workspace/run identifiers and stage completion. Old review notes must not silently become approval notes for a new run.

Cancelling a save dialog leaves delivery incomplete unless an earlier delivery already succeeded. A failed app package can coexist with a successful source export. Integrity failures block approval/delivery and explain that a new build is needed.

## Implementation order

1. **Unify state and navigation.** Add a pure journey-state resolver and shared progress header. Reuse it for challenge opening, next actions and Home labels. Stay on Build after starting; return from model setup to the pending challenge. Distinguish viewed milestone from current milestone.
2. **Clarify automatic work.** Replace the snake graph with ordered phases, contextual descriptions and direct artifact destinations. Preserve the existing phase contracts and backend progression. Add explicit current-phase and repair treatments.
3. **Complete the human handoffs.** Separate Review and Deliver presentation; retain review drafts per run; make approval requirements and delivery outcomes explicit. Add stale-output labels and failure recovery.

Primary implementation areas: `src/App.tsx` for shell/navigation and milestone surfaces; `src/Home.tsx` for continuation labels; `src/PhaseDetails.tsx` for phase explanations; `src/ExecutableDownload.tsx` for delivery copy/states; shared types and phase contracts for derived state and output mapping. An Open saved folder affordance beyond the current export-time reveal would need a narrow desktop API addition; do not promise it before implementing it.

## Acceptance checks

- A new user can identify the current milestone, who acts next, and the next action from any challenge view.
- One pre-run confirmation starts all five automatic phases; no additional manual gates appear.
- Inspecting Research while Implementation runs keeps both inspected and current phase clear, without focus theft.
- Completion announces Ready for your review; failures never suggest approval is available.
- Review notes and acknowledgement survive Preview/evidence navigation, but do not transfer to a different run.
- Existing review checks remain enforced; blockers have readable reasons rather than unexplained disabled buttons.
- A changed brief labels old preview/files as previous output, and starts a fresh run when requested.
- Source-only export, app-only download, both, cancellation, and packaging failure each report the actual saved outcome.
- Verify at 1512×982 and 1120×720, including keyboard-only navigation, visible focus, milestone semantics and restrained live announcements. Do not rely on color alone.

## Captured evidence and limits

The browser captures use the current development source at 1280×720. The running desktop capture shows the user's existing app, which may be built from an earlier source state. These are interface observations, not an end-to-end build verification. The browser preview cannot execute agents, approve a run or deliver files. Successful review and delivery behavior was inspected in code, not captured live. No accessibility-compliance claim is made; keyboard and screen-reader behavior need implementation testing.

1. **Home — clear entry, weak continuation cues.** Saved briefs have status badges but no task-specific next-action label. Current screenshot retained for context.

![Home](../output/flow-plan-2026-11-04/01-home.png)

2. **Brief — understandable form, weak onward handoff.** Saving is distinct from starting; the next step is mostly conveyed by toolbar controls. At the captured viewport the save action sits below the initial fold. Field labels are visible; keyboard and error behavior were not tested.

![Brief](../output/flow-plan-2026-11-04/05-brief.png)

3. **Build — sequence and ownership need clarification.** Numbered stages and written status labels help. The direction reverses on the second row, and agent work shares the same progress count as human review and delivery. Small muted labels and thin arrows merit contrast testing.

![Build flow](../output/flow-plan-2026-11-04/04-build-flow.png)

4. **Running view — orientation is weak.** Preview is selected while System design is displayed. The empty state explains that an output will arrive, but provides no persistent full-journey location. It is a valid captured waiting state, not evidence that planning completed.

![Running desktop view](../output/flow-plan-2026-11-04/03-running-preview.png)

5. **Review — unavailable state is honest; completed handoff unverified visually.** The screen explains when test evidence appears, but lacks a persistent journey and return-to-current-step cue. Successful review and delivery could not be exercised in browser preview.

![Review before verification](../output/flow-plan-2026-11-04/06-review-empty.png)

6. **Deliver — code review only.** Approval, download and export coexist in the current Evidence component. The recommendation to separate their presentation is grounded in that implementation; no successful delivery screenshot was captured.

