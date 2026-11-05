---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Borrow Aperant's workflow patterns, but do not adopt its desktop engine for this sprint."
---

# Aperant project scout

## Bottom line

[R] **Borrow from it. Skip integrating it during the remaining 27 hours.** [E] Aperant is a desktop development workbench that turns a task description and a Git repository into specifications, code changes, and an AI review, as traced at commit `20250db` in `apps/desktop/src/main/agent/agent-manager.ts` and `ai/agent/worker.ts`. [E] Its actual code supports several model APIs, but its standard build can mistake session completion for subtask completion and can bypass QA on an already completed plan (`ai/orchestration/subtask-iterator.ts`, `build-orchestrator.ts`). [R] FleetHarness should borrow the artifact structure and visible review states while keeping executable acceptance tests, approval enforcement, and execution isolation under team control.

## Read these notes

| Note | What it answers |
| --- | --- |
| [[Research/Projects/Aperant/How-It-Works]] | [E] Code trace, work splitting, isolation, testing, repair, and approval boundaries. |
| [[Research/Projects/Aperant/Setup-and-Dependencies]] | [E/A] Providers, services, Mac setup estimate, and disconnected operation. |
| [[Research/Projects/Aperant/Claims-vs-Evidence]] | [E/V] Maturity, public issues, independent commentary, and limitations of this inspection. |
| [[Research/Projects/Aperant/FleetHarness-Fit]] | [R] Seven-step mapping, event obligations, and sprint decision. |

## What it solves and who it is for

[E] The code provides a Kanban-style development workflow around existing local Git projects: task creation, project analysis, specification generation, coding, QA, human review, and integration. Evidence: `apps/desktop/src/main/agent/agent-manager.ts`, `src/shared/state-machines/task-machine.ts`, and `src/main/ipc-handlers/task/worktree-handlers.ts`, all at `20250db`.

[R] Treat it as a tool for a developer who can inspect diffs, start an application, diagnose account problems, and judge tests. It is not yet the simple naval-officer intake and mission-validation experience FleetHarness needs. [E] Its starting point is a software repository and a free-text task, rather than a naval use-case schema (`AgentManager.startSpecCreation`).

## Decision and reversal conditions

[R] Reimplement the general patterns of a versioned specification, explicit subtasks, bounded repair, visible approval states, and per-task Git worktrees. Copying source or prompts would require tracking AGPL obligations; borrowing general workflow ideas avoids turning the sprint into an engine migration.

[R] Spend the sprint proving one synthetic mission workflow with the already confirmed event coding tool, then repeat it on a different problem. Set requirements and executable acceptance tests before coding. Keep generated, runnable, tested, and operationally validated as distinct statuses.

[R] Reconsider adoption only after an authorized engineer demonstrates all of the following on a disposable repository: the event API key completes a small build; an intentionally failing acceptance test prevents success; the plan gate prevents coding; failed worktree creation stops execution; no branch publishes without approval; and a fresh checkout reproduces the result. Require a license decision before embedding or distributing engine code. A new 3.0 release would need its own inspection rather than inheriting this verdict.

## Inspection scope and session record

[E] Inspected the supplied read-only clone at `/private/tmp/claude-501/-Users-mukul-Documents-CDAO/9689cc99-a233-4d19-b7d4-0952c97d9106/scratchpad/fleethacker/repos/Aperant`. `git rev-parse HEAD` returned `20250db069a849ab001ac6ab9e3e9779886ab9e2`; the checkout is shallow. Code paths in these notes are relative to that repository unless specified otherwise. For compact references, `ai/` means `apps/desktop/src/main/ai/`.

[E] Used read-only shell inspection (`rg`, `cat`, `sed`, file listing, Git metadata) and public web search/open on 2026-11-04. No repository code, installation scripts, builds, or tests were executed. No account was connected and no outward message, commit, or push was made.

[E] Tool disclosure handoff: public GitHub pages, the project website, and a public independent research profile were consulted. No model was invoked through Aperant. [R] Transfer this activity to `Sprint/Tool-Disclosure-Log` during council consolidation.

[E] Prior-work handoff: Aperant and all inspected source at `20250db` predate this research. The work produced here is the five assessment notes. [R] Identify any later copied source or prompts, exact revision, license, and event-created changes in `Sprint/Prior-Work-Log`.

[E] Friction handoff: no runtime trial was permitted by the research brief; the clone is shallow; README requirements differ from provider code; public pages disagree on issue counts; the GNU license website timed out, so license analysis uses the checkout's `LICENSE`. [R] Record adoption-relevant barriers in `Sprint/Friction-Log`.

[E] Session closeout is recorded here because the assignment requires all writes to remain in this folder. Central `Team/Now.md`, `Sessions/`, and `Sprint/` notes were not edited. [R] Council consolidation should update those records with this verdict and the unresolved validation work.

[E] A local standard-library validation checked all five notes for required frontmatter, Bottom line and Sources sections, existing local note links, and absence of prohibited dash characters. This checks the research documents only; it does not validate Aperant.

## Sources

- [E] Supplied local clone and read-only metadata at the full revision above.
- [V] Project: https://github.com/AndyMik90/Aperant
- [V] Public source at inspected revision: https://github.com/AndyMik90/Aperant/tree/20250db069a849ab001ac6ab9e3e9779886ab9e2
- [V] Product claims: https://aperant.com/
- [P] Assigned local sources: `Research/00-Brief.md`, `Event/Rules.md`, `Event/Judging.md`, `Event/Terms.md`, and `/Users/mukul/Documents/CDAO/FleetHarness/README.md`.
