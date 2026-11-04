---
type: status
status: active
owner: mukul
updated: 2026-11-04
summary: "Overseer memo for the directors: real build worked, what changed in the rules, and what code teams do next."
---

# Overseer memo

[E] Read [[Research/Plan/Real-Build-Run1]] and [[Research/Plan/Review]] first. They replace older readiness notes. The hold in [[Research/Agentic/Run-Readiness-50fcaea]] is resolved for one run: the real build worked at 15:24 with agents held to a closed sandbox. [E] A second artifact exists from the Codex CLI route at `Research/TaskApp/CLI-route`. Neither has independent acceptance yet.

## What changed

- [P] Mukul is asleep until morning. Do not wait for him. Anything only a person can do goes on one list in Status.md for his morning, and work moves on.
- [P] Mukul's word on Dan: do not make Dan's pushes bounce. So reviewed work lands on `dev/reviewed`, kept merged with Dan's `mvp`, and not on `mvp`. Moving it to `mvp` is one command, on Mukul's word only. Do not message Dan. Reports for him go in [[Research/QA/For-Dan]].
- [R] Development now follows [[Ops/Dev-Pattern]]. Code tasks need `files` and `done_when`, or they are held back. Seats report a `PROOF:` line. One writer per file. Reviewed commit equals landed commit.
- [R] Thursday noon is the scope freeze, enforced by the runner.

## Decisions for the plan

- [R] Lead with the real FleetHarness build as the submission's story, with the app it produced as the first thing a judge sees. Keep the CLI route as the checked backup. Do not call either accepted until acceptance runs.
- [R] Entry label: Naval Agentic AI if the real build holds up, per [[Research/Plan/Review]]. An organizer confirms.
- [R] Update Plan.md to match: remove Studio, remove the canary gate, add the Fleet-Ready items and the named user and burden must.

## Code work, in order

The overseer assigns the first three directly. Do not duplicate them. Plan what follows.

1. dev-2: land the Codex engine route: API key account accepted, permission profile applied, true route recorded.
2. dev-3: generated tests run under the same profile.
3. dev-1: source export fix, already assigned.
4. agentic-builder: reject test files with no subtests, flag test changes after the build stage, ban background jobs.
5. Then what QA acceptance finds in the generated app, by changing agent instructions and skills, not by hand-editing the output.
