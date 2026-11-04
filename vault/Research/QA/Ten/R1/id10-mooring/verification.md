# Verification record, 2026-11-04

The local Node gate passes. The browser gate is unverified and the completion gate has not passed: no host-owned test-report.json, screenshots or traces were available to inspect. No browser runtime/tool is assigned to this phase. Node execution cannot establish rendered task completion. `requirementsMet: false` independently of any future prototype-check result.

## Executed checks and bounded repair

Executed `node --test core.test.cjs` in the workspace. Baseline: 17 passed, 0 failed, 0 skipped. After adding adversarial coverage: **25 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**, exit code 0. Evidence: actual application cases in core.test.cjs and the command output in this verification session; the harness will independently rerun them and retain its own report. No synthetic test data files were created.

Twelve behavioral fixture groups run against each of core.cjs and the actual application-core script extracted from index.html and executed in Node VM; one additional test compares the resulting behavioral outcomes. Fixtures call actual validation, save, discard, review, serialization, restoration and export functions. They are application checks, not toolkit fixtures or engineering reference validation. VM execution is not browser execution.

Added checks establish that every editable field blocks review while dirty, dirty exports stay committed, valid changes clear recorded review and increment revision without mutating prior state, malformed/missing persisted fields and impossible review associations are rejected, and exact inclusive name/observation/position boundaries retain raw numeric strings beside confirmed values. Existing cases cover blank versus zero, malformed/nonfinite/overflow input, unsupported units/catalogs, invalid-save preservation, unchanged-save idempotence, discard, saved/draft round trips and literal sample summaries.

No failure was observed in either local Node run. No implementation repair was made; only application-test coverage and documentation changed. The shared bounded implementation repair was not consumed. No browser failure evidence was available to repair. acceptance-plan.json, ux-spec.json, system-design.json and .fleet/ were not edited. Host-owned test-report.json, source hashes and browser artifacts were neither created nor modified.

Additional executed checks: Node vm.Script parsed both inline scripts successfully; all files mapped by the six architecture components exist. These are syntax/file-consistency checks, not browser acceptance. Source review found UI actions call the tested inline core; user-provided summaries use textContent; the page has inline CSS/SVG/scripts and no external asset or fetch dependency. Static inspection does not prove disconnected execution, DOM safety or responsive rendering.

## Criterion evidence

Provenance is the supplied .fleet/packet.json schemaVersion 1, challenge capturedOn 2026-11-04, source https://cdao.hackathon.maximus.com/event/norfolk/use-cases/10. Upstream revision/publication time are unknown and the URL was not fetched. Exact source excerpts and JSON locators are retained in research.md S1 to S4 and test-matrix.md. Frozen expectations are planner-defined synthetic outcomes, not independently signed SME ground truth.

| Criterion / source locator | Input and expected outcome | Application evidence | Result and gap |
| --- | --- | --- | --- |
| UC10-1 / challenge.requirements[0] | Approved berth scenario should produce NSTM geometry/strain evaluation, optimized tug assistance, sequencing and threshold warnings with a canvas. No approved numerical expectations supplied. | Node drawing boundary and committed-layout checks cover only synthetic intake. index.html has an illustrative layout; pointer interaction was inspected in source only. | Deferred, unverified. Equations, NSTM revision/limits, optimization basis and thresholds absent. |
| PHY-01 / recipe.acceptance[0] | Independent signed reference cases and below/at/above engineering-limit outputs must match approved tolerances. | No authoritative corpus or calculation exists. Application structural fixtures are not a substitute. | Deferred, unverified. No engineering calculation result is claimed. |
| PHY-02 / recipe.acceptance[1] | Missing/inconsistent inputs rejected; approved unit conversions, physical limits and craft configurations respected. | Passing speed-format, unit/catalog rejection, invalid-save preservation, exact text/drawing bounds and raw/confirmed-value tests in core.test.cjs. | Deferred full criterion, unverified. Structural slice passes locally; conversions and physical domains lack authority. Drawing/text limits are not engineering limits. |
| PHY-03 / recipe.acceptance[2] | Save Alpha, display unavailable assessment/unknown uncertainty/qualified-review requirement, acknowledge the exact committed revision; blank wind recovers to zero; edit/discard/save cannot reuse stale review. | Passing authority, review lifecycle, every-editable-field blocking, changed-content immutability, codec, export and inline/core parity tests. Frozen journeys: review-synthetic, recover-missing, recover-stale-review. | Implemented synthetic behavior has passing local core checks; browser and human criterion remain unverified. No qualification or operational approval is established. |
| DELIVERABLE10-1 / challenge.expectedDeliverables.lines[0] | Approved safety sheet/layout with traceable rationale/margins, walkthrough and fielding brief. | README walkthrough and path-to-fleet.md exist; Node export test confirms synthetic marking, committed content and review scope. | Deferred, unverified. No approved sheet, rationale/margin model or approval process. Actual browser download remains untested. |

## Frozen browser journeys

| Journey | Desktop | Narrow | Required evidence |
| --- | --- | --- | --- |
| review-synthetic | NOT RUN | NOT RUN | Rendered literal sample/authority/review outcomes, reload persistence and synthetic-scenario.txt download; host report, screenshots and trace. |
| recover-missing | NOT RUN | NOT RUN | Missing-wind error, preserved name, unavailable review, recovery to zero and explicit revision 1 review; host artifacts. |
| recover-stale-review | NOT RUN | NOT RUN | Dirty-state review block, discard to reviewed revision 1, changed save and fresh revision 2 review; host artifacts. |

No browser console, overflow, screenshot, visual-inspection or download result is claimed. All implemented journeys must pass on both viewports before prototype review. Missing browser evidence prevents a verification pass.

## README and remaining manual checks

Checked the guide against controls, IDs, event handlers and core outcomes. Sample name, 12/15/0.5 m/s values, ebb, 50/50 display positions, raw observations, statuses, filename, save/discard/review behavior and replacement/reset labels match the delivered source. Quick start requires only opening index.html; Node is required only for tests, and the documented test command was executed successfully. README now records 25 passing local tests and the pending browser gate.

Guide steps not exercised in a real browser: opening index.html directly while disconnected; sample loading and manual entry; drag and numeric position editing; Enter submission, Tab order, Space checkbox, focus/error links and live announcements; review controls and replacement confirmation/cancellation; actual file download; reload durability; localStorage unavailable/corrupt-data warnings and deliberate reset, including failure to remove stored data. Pure core equivalents were tested where listed above, but adapter and rendered behavior remain unverified. Narrow readability/overflow, visible focus, pointer/touch behavior, screen-reader usability and broader accessibility need browser/human assessment.

No scheduling, synchronization, replay transport or merge-conflict subsystem exists in this recipe; no infeasible-schedule or transport test is applicable. Applicable stale-review and restored-revision invariants were tested. Physical boundary cases, uncertainty estimates and safe/unsafe decisions cannot be tested without authoritative inputs; none was invented.

## Delivery state

Generated: self-contained index.html, core.cjs, core.test.cjs and documentation; all six architecture components have their mapped files. Runnable: dependency-free browser target by source inspection; direct-file browser run unverified. Tested: Node core checks pass as recorded above. Browser-tested: not established. Reviewer-accepted: not established. Operationally validated: not established.

Deferred criteria remain unverified regardless of future browser passes. Local testing does not establish engineering safety, reviewer qualification, CAC, encryption, authority to operate, live feeds or government-system integration. Synthetic acknowledgement cannot authorize a mooring evolution.
