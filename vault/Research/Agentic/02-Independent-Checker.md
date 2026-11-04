---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Check actual browser and exported behavior with a separately owned oracle before human approval."
---

# A checker independent of the builder

## Bottom line

[R] Must: independently exercise the delivered application against frozen cases. A second agent session with write tools is useful review, but is not the acceptance authority. [R] Keep the existing verify session for defect discovery and one bounded repair; make a host-owned checker decide acceptance after the writer has stopped. Automating that checker is should for Thursday; a recorded independent manual check of final bytes is the smaller default.

## Current evidence

[E, local source at 50fcaea] `electron/verification.ts` launches real Node tests with a 120-second timeout and 2 MB output limit. It checks source hashes before and after, positive TAP counts, no failures/skips/todos and successful exit. These are useful development-test controls. It discovers candidate-owned test files and parses process output; it does not independently validate the user workflow or compare browser results with a frozen oracle.

[E, same source] The verify prompt in `pi-backend.ts` can change implementation, tests and README. The one repair session has the same capabilities. Tests of a separate core do not prove inline `index.html` uses that core correctly. Running generated Node tests on the controller host also gives candidate code the authority of that process; importing them into a new checker process under the same unrestricted account would not solve that problem.

## Smallest change and exact files

| File | Small proposed change [R] |
| --- | --- |
| New `electron/acceptance-checker.ts` | Run one fixed training-draft browser protocol against a frozen snapshot; produce structured observations outside the candidate origin. No model request. |
| New `tests/acceptance/training-draft.browser.mjs` | Evaluator-owned cases and independent assertions for the one supported workflow. Load expected data outside candidate access. |
| `electron/verification.ts` | Keep development-test report distinct. Execute generated Node tests only through a proved isolated test runner; never treat TAP as mission acceptance. |
| `electron/pi-backend.ts::execute` | Revoke writer tools, freeze candidate, run acceptance, and gate review on both evidence classes. Repair a mutable copy, then create a new snapshot and rerun mandatory cases. |
| `harness/phases.ts`, `skills/fleet-evidence/SKILL.md` | Name the agent step inspection/repair and the host step acceptance; preserve existing stage IDs. |
| New `tests/acceptance-checker.test.mjs`, existing `tests/pi-backend.test.mjs` | Prove fail-closed result handling, repair routing and stale-snapshot rejection. |

[R] Keep the checker's assertion logic, cases and report outside the generated browser. It drives ordinary controls and reads rendered/exported values through the browser automation boundary. It must not `import` candidate JavaScript into its trusted Node context. Use a fresh browser profile, no host IPC/preload, no personal sessions and denied network for the offline cases. Version the control mapping with the accepted app; a missing control fails the test instead of causing a model to improvise a different workflow.

[R] Recompute validity from the contract without importing `harness/tools/scheduling.ts` or the generated solver. Check exactly one result per request, supplied assignments, permitted start values, duration, room/person overlap, rest, qualification coverage and total minutes over the supplied horizon. For the frozen four-request example, compare the uniquely expected schedule; for future contracts with multiple valid schedules, compare constraints instead of arbitrarily requiring one ordering.

[R] Include the fresh edit, impossible instance, rest and minutes boundaries, missing qualification, duplicate ID, malformed time, exhausted search budget, review invalidation and save/reopen cases from the plan. A feasible answer that omits a request fails. Exhaustion is not infeasibility. Test the actual exported data, not only a status message. Include a deliberately broken inline implementation with a correct core file to prove the checker catches divergence.

## Repair and evidence contract

[R] Emit a controller-owned record containing run/attempt, contract/checker/snapshot hashes, per-case status, expected and actual public observations, timestamps, browser/runtime version, command or manual procedure, and explicit unverified items. Screenshots supplement assertions. They do not decide acceptance. Reject candidate stdout that pretends to be a result.

[R] Classify a failure before repair: application defect permits one implementation repair; changed contract, tampering, unavailable checker, environment failure, exhausted budget or incomplete shutdown requires human attention. Send the builder public case IDs, a concise failure description and permissible diagnostics. Do not reveal hidden expected values automatically. Preserve the first failure record and rerun all mandatory cases after repair. No new attempt or budget on retry.

## Proof to require

[R] Use three candidates: known valid, intentionally overlapping, and misleading inline UI with passing core tests. The latter two must fail. Add missing case, checker crash, forged candidate report, stale digest, expired budget and attempted canonical-test write cases. A checker that cannot reject a known bad result is unavailable, not green. Run the valid candidate from its final destination with network off, then save, close, reopen and import its draft.

[R] Thursday manual fallback: an independent evaluator records input, expected result, observed UI/export result, artifact digest, environment and reviewer decision. Test after build shutdown. Avoid calling this automated enforcement or treating the factory's green stage as that manual record.

## Risk and relationship to Dan's latest change

[E] Dan's `50fcaea` adds an Electron wrapper serving only `index.html` at `fleet-app://app/index.html`, with separate storage identity and a restrictive content policy. It also requires a user guide after implementation. [R] Check the guide against the final app. If the team delivers the ZIP, repeat storage, download/save and offline behavior on the extracted executable because its origin differs from browser file-open and preview. A browser-only pass cannot certify the new wrapper.

[A] Manual acceptance is roughly 0.75 to 1.5 hours for one small app, excluding fixes. A fixed browser driver is roughly 2 to 4 hours once the app controls and evaluator environment are stable. Playwright is already declared in the pinned project, but installation, browser availability and actual checker results are not verified here. Correlated human mistakes and incomplete case coverage remain risks; do not claim general correctness.

## Sources

[E, final relay reconciliation] `631849f` later consolidated the frontend. A pinned diff shows no changes from `50fcaea` in `electron/`, `harness/`, `skills/`, `shared/` or the dependency lock, so this design's backend file map remains applicable. Use the retained unified desktop path in [[Research/Agentic/Run-Readiness-50fcaea]]; do not restore removed Studio/Workbench interfaces. All implementation remains deferred pending allocation.

- [E] Local source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe, `electron/verification.ts`, `pi-backend.ts`, `executable.ts`, `package-worker.ts`, `harness/phases.ts`, `package.json`.
- [E] [[Research/Build-Patterns/Test-and-Repair-Loops]], [[Research/Build-Patterns/Specs-and-Acceptance-Tests]], [[Research/Plan/Plan]].
- [R] [[Research/Agentic/01-Protected-Acceptance]], [[Research/Agentic/04-Tested-Delivery]].
