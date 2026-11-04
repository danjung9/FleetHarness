---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Keep the working architecture and prioritize trustworthy checks, controlled execution and a simple offline officer demonstration."
---

# Architecture review

## Bottom line

[R] Improve the existing Electron/Pi application rather than replace it. [E] It already contains useful preview isolation, real test execution, bounded repair, source checks and human approval. [R] For Thursday, prove one useful officer workflow and strengthen the places where the agent can currently influence its own evidence or reach the host. [E] This is a static review of `mvp` at `f72c5dc`; no software or tests were run and no timing or token savings were measured.

[E] The clone advanced to `0f175a8` during final checking. A limited comparison records its five-session flow, phase-specific tools and new engine adapter in Current-Architecture. The main findings remain pinned to the requested commit; several context improvements now overlap with work already integrated.

## Top five changes, in plain language

1. [R] **Agree on what success looks like before building.** Give the officer a few synthetic examples with expected answers. Have a separate checker test the actual app against those examples. The coding agent must not be able to change the answer key.
2. [R] **Deliver exactly what was tested and approved.** Freeze the checked app and export that copy. The current export checks files before opening the folder dialog, leaving a gap if files change while it is open.
3. [R] **Limit what a build can touch, and make Stop verifiable.** For the browser demo, allow only scoped file and calculation tools. Supervise the model session in a process the controller can terminate. Prove local work stops; otherwise demonstrate a previously generated, checked app and disclose the limitation.
4. [R] **Start with the officer's task.** A technical owner configures the event provider beforehand. The officer sees a task, examples, progress and results, with no provider, model or key choices on the first screen.
5. [R] **Demonstrate the delivered app with the network off.** Open the exported file, use new synthetic input, save, close, reopen and export the result. Connected software generation and disconnected app use are separate promises.

## Notes

| Note | What it answers |
| --- | --- |
| [[Research/Architecture/Current-Architecture]] | [E] Components, process boundaries, storage and complete run flow; three normal model sessions, four with repair; repeated context and code-derived limits. |
| [[Research/Architecture/Findings]] | [E/A] Ten ranked findings with source locations, existing safeguards and proposed reproductions. |
| [[Research/Architecture/Optimizations]] | [R/A] Must, should and cut changes, files, effort ranges, regression risk, judging/rule links and proof steps. |
| [[Research/Architecture/Target-Architecture]] | [R] Small Thursday design, deadline fallback, later design and likely overlap with danjung9's UI/system-design work. |
| [[Research/Architecture/Review-Log]] | [E] Scope, tool/prior-work/friction handoff and local session record. |

## Other findings worth using

[E] Research and planning share one model session; build and verification use fresh sessions, and repair adds another. [E] Requirements and recipe packets are checked for changes, but agent-written application tests are editable. [E] The original parser and scheduler starters select the generic workflow recipe because they lack a source/recipe identity; catalog imports select the domain recipe correctly. [R] Fix routing, trim repeated context and record actual token usage before adding more agents or changing models.

## Not verified

[E] Runtime speed, token cost, hosted-model quality, actual test results, SDK subprocess termination, host access exploits, exported offline behavior, packaging/signing and officer usability were not measured. [A] Exact conflicts with work in another checkout and availability of the proposed browser/worker setup remain unknown. [R] Reconcile proposed reproductions with the separate test seat, and retain a 3 to 4 hour integration/submission buffer before Thursday 2:00 PM EST.

## Sources

- [E] Baseline repository reference, not fetched: https://github.com/danjung9/FleetHarness/tree/f72c5dc15aa6c34d2b9080c1c0b87742230cc16e
- [P] [[Research/00-Brief]], [[Event/Judging]], [[Event/Rules]].
- [E] [[Research/Naval-User/Simplicity-Requirements]] and the build-pattern/project-fit notes cited in the detailed documents.
