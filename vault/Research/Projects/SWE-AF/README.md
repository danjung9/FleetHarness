---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Borrow SWE-AF's worktree and repair patterns, but do not adopt its full stack for this deadline."
---

# SWE-AF project scout

## Bottom line

[R] **Borrow from it. Do not make it FleetHarness's orchestration dependency with about 27 hours left.** [E] SWE-AF is developer infrastructure that turns a software goal and repository into plans, code branches, verification reports and optionally GitHub pull requests, as traced in `go/internal/orch/build.go` at `ef26ffb`. [E] It has substantial orchestration code, but the installed default now enables a binary coding engine and hides the classic build endpoints (`go/agentfield-package.yaml`, `go/internal/node/register.go`). [R] Use its issue contract, isolated Git worktrees and bounded repair pattern while retaining the team's already working coding path and human review.

## What it solves and who it is for

[E] The classic pipeline coordinates the engineering work around a coding agent: product requirements, architecture review, dependency scheduling, implementation, review, merge and verification (`go/internal/orch/plan.go`, `go/internal/dag/executor.go`). [R] Its natural user is an engineer or technical lead who can configure model runtimes, repository access, tests and infrastructure. It needs a separate officer-facing requirements and approval interface for FleetHarness.

[E] SWE-AF is a build-time system, not a mandatory runtime for the application it generates. The orchestrator calls agent CLIs in a target repository; it does not force generated applications to depend on AgentField (`go/internal/roles/coding/coding.go`). [R] Keep the distinction between a connected software factory and an application demonstrated offline.

## The decision

- [R] Borrow the structured issue fields, explicit dependency graph, worktree-per-issue pattern, deterministic merges, failure evidence and bounded retries.
- [R] Keep acceptance tests under team control. Require recorded test commands, exit codes and scenario outputs before a human marks a solution tested.
- [R] Avoid the default installer during this sprint. The Go engine default, hidden classic API surface, provider setup mismatch and Python CI defect add uncertainty without solving the officer interface.
- [R] If the team still evaluates integration, limit the experiment to one synthetic, fully specified issue through classic `implement_issue`, with PR creation disabled, one issue at a time and an external time limit. This research did not authorize or conduct that run.

## What would change the verdict

[R] Consider adopting classic `implement_issue` only after an authorized trial produces a useful branch on the event OpenAI key, passes team-owned tests, visibly stops on rejection or cancellation, and preserves evidence. [A] A reasonable decision threshold is two successful small issues, including one injected test failure repaired correctly, within two hours of setup and a team-approved spend limit. [R] Adopt the full factory only when a repeatable trial beats the current workflow on elapsed time and human intervention, with required approvals and independent final checks enforced.

## Notes

| Note | Purpose |
| --- | --- |
| [[Research/Projects/SWE-AF/How-It-Works]] | [E] Code trace, modes, isolation, repair and human authority. |
| [[Research/Projects/SWE-AF/Setup-and-Dependencies]] | [E/A] Runtime compatibility, setup, Mac estimate and disconnected operation. |
| [[Research/Projects/SWE-AF/Claims-vs-Evidence]] | [E/V] Claims, tests, open issues, limitations and research record. |
| [[Research/Projects/SWE-AF/FleetHarness-Fit]] | [P/R] Seven-step mapping, judging fit, license and event obligations. |

## Scope and confidence

[E] This is a static review of the supplied read-only clone at `ef26ffbf61496387d7ba554e83799cb5385804d0`, plus public web research on 2026-11-04. No repository code, tests, installer, binary or service was executed. [E] Public issue pages are crawler snapshots, so their counts and open status may lag. [R] Treat capabilities supported by code as implemented paths, not proof of a working run on this Mac or the event key.

## Sources

- https://github.com/Agent-Field/SWE-AF/tree/ef26ffbf61496387d7ba554e83799cb5385804d0
- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/go/internal/node/register.go
- https://github.com/Agent-Field/SWE-AF/issues
