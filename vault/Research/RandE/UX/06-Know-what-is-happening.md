---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan for truthful progress, explicit stop acknowledgment and a recovery handoff."
---

# 06: Know what is happening and stop safely

## Bottom line

[R] Show the current activity, last update and next human action in one place. [E] Field Workspace already provides plain stages and a Stop control, while the original has structured activity details. [R] Improve their truthfulness and recovery behavior rather than add another progress graph. [R] Show Stop requested until the backend establishes what actually stopped.

## User's problem

[A] During a long build the officer does not know whether to wait, intervene or start again. A frozen animation or raw tool log does not answer that. An optimistic stopped message can misrepresent continuing work.

## Exactly what they see and click

[R] The existing next-action panel shows Creating your tool, Current step: checking the draft app, Last update: [actual timestamp], and Stop creation. Show completion of steps as events, not a percentage of time. Elapsed time may be shown; completion time and cost remain Unknown unless measured.

[R] Clicking Stop changes the panel to Stop requested. Keep the draft visible and disable new creation while stopping. After confirmed termination, show Creation stopped; saved files retained and offer View saved request or Create a new version. Do not call a fresh run Resume.

[R] If termination cannot be confirmed, show Stop not confirmed and a local help panel instructing the user to stop interacting and contact the designated technical operator. Show the run identifier and a sanitized issue summary for local saving. The operator uses the rehearsed environment-level shutdown procedure. No automated message is sent.

[R] In browser planning mode, state Creation requires the desktop workspace and expose Download request. “Connected” means configured only unless a real request has succeeded; add Connection not tested where appropriate.

## How we would know it worked

[R] Trace start, delayed activity, provider failure, stop request, termination and restart. A technical observer checks for continuing descendant work and outbound activity after the claimed stop. User inputs survive. Four of five participants find Stop within ten seconds and distinguish pending from confirmed shutdown. [A] Ten seconds is a proposed target; all checks are not run here.

## Build size

[A] Small: 1 to 2 hours for honest state wording, existing-log timestamps and a local recovery panel. Medium: another 2 to 4 hours for structured termination acknowledgment if the backend lacks it; proving process containment may take longer. [R] Thursday rank 5, mandatory before live creation if shutdown cannot otherwise be demonstrated; after-event rank 3.

## Backend needs

[R] Reuse status, stages, logs, runId and stopRun. Add explicit stopping/termination outcome and last activity only if existing events cannot establish them. The current RunStatus union has no stopping state. UI wording cannot substitute for process supervision. Connection testing must be deliberate and bounded, not a hidden inference call on page load.

## Dan's frontend

[R] Yes, proposal for Dan in the selected renderer's existing status and Stop area. Reuse ActivityFeed for optional detail. Backend owner defines acknowledgment and escalation behavior before the UI claims shutdown.

## Sources

- [E] 50fcaea: shared/types.ts, src/App.tsx, src/ActivityFeed.tsx, src/studio/Studio.tsx and src/workbench/BuildWorkspace.tsx.
- [V] Text status and separate navigation: https://designsystem.digital.gov/components/step-indicator/
- [R] [[Research/Naval-User/Simplicity-Requirements]], [[Research/Plan/Plan]].

