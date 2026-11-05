---
type: review
status: active
owner: mukul
updated: 2026-11-04
summary: "All ten round-one challenge audits: real partial implementations, specific verification gaps and factory changes."
---

# Ten-challenge QA notes

[E, inspected [[Research/QA/Ten/Scoreboard]]] Round 1 at d0f4c69 plus the disclosed scratch patch has ten finished entries, nine automatic passes and zero satisfactory verdicts. All ten entries are reviewed below. Main owns the runner; independent officer judges own satisfactory decisions. These audits read code, generated tests and retained reports without executing or editing candidates.

[E] The inspected apps contain real calculations or state transitions and meaningful negative assertions. The main gap is between the selected prototype workflow and the full card outcome. Detailed evidence, source lines, identities and earlier findings are retained in [[Research/QA/Ten/QA-Lead-Evidence-R1]].

| Finished challenge | Finding beyond the automatic bar | Factory change |
| --- | --- | --- |
| ID 12, OPTASK | [E] Real parser/review/export, but defining message extraction and deliverable criteria remain deferred; the custom EVENT/TASK grammar does not establish the requested mock USMTF transformation. | [R] Freeze a concrete primary message-to-output case and check every claimed field span. |
| ID 36, paperless | [E] The local conflict option is absent because its value is on a closing HTML tag; generic DOM tests accept arbitrary values and bypass the native failure. Real merge logic exists; browser verification correctly fails. | [R] Repair the native option, retain the four failing journeys and diagnose actual DOM before blaming the runner. |
| ID 11, training | [E] Real bounded search, but a frozen assertion rewards the false claim that every candidate is unavailable; defining card behaviors remain deferred. [A] Same-revision acceptance/content binding also has an untested source gap. | [R] Independently validate explanation semantics, version incorrect contracts openly and bind review to exact content. |
| ID 08, CASREP | [E] Real revision/routing/release guards and negative tests; only synthetic INITIAL reports are supported, with required formatting and broader report types deferred. | [R] Require card-specific report fixtures and distinguish workflow success from full report capability. |
| ID 20, contact brief | [E] Real lookup/freshness/citation logic over consistent inline fixtures; ingestion remains deferred. [A] Stored fact values are not validated against their cited text, and the matching negative test is absent. | [R] Test contradictory stored span values and an unseen synthetic ingested snapshot before claiming grounding. |
| ID 35, Cyber Defender | [E] Real Boolean-control findings and review binding; 17/18 criteria deferred. Proposal creation selects only the first finding despite multi-asset input, and export assertions check fragments. | [R] Add second-finding selection, reordered/multiple/benign inputs and complete downloaded-record assertions. |
| ID 10, mooring | [E] Real scenario validation, layout and revision review; engineering calculations and planning outputs explicitly remain unavailable. Its 25 checks are 12 cases on two core copies plus parity. | [R] Keep engineering scope incomplete until supported reference cases exist; verify native dragging and exported values. |
| ID 32, readiness | [E] Real DAG arithmetic and unknown propagation; five scripted changes plus timing margins do not establish readiness-risk/noise ranking or differentiated first actions. Ten criteria remain deferred. | [R] Require independent risk/noise/action cases and complete exported results/citations. |
| ID 16, MORDECAI | [E] Real local arbitration/halt simulator, but host requirementsMet is true after three recipe checks while narrative obligations remain omitted. Acknowledgements are generated local records, not worker responses. | [R] Include narrative obligations in completion accounting and test synthetic 12-to-13 onboarding; keep simulation and runtime guarantees separate. |
| ID 37, fielding | [E] Real draft/save/review/export template, with fourteen criteria deferred; no fieldable owner tool. Final browser repair passes. Eighteen repeated downloads test substrings, while edited exported content lacks a browser assertion. | [R] Capture each file once, assert all expected content and an edited sentinel; retain missing owner-tool/device/authority dependencies as incomplete. |

[R] Make these shared factory changes:

1. In intake/planning and `harness/quality-contract.ts`, trace every defining card obligation, including prose-only requirements. A recipe pass or self-selected deferral cannot establish full task completion. ID 16 needs this even though its structured contract has no deferred rows.
2. Freeze independently reasoned outcomes and negative explanations, then test changed inputs, permutations, multiple records and boundaries. Retain failing evidence and an explicit contract revision when an expectation is wrong. No operational authority or physical constants should be invented to fill a dependency.
3. Exercise native controls and complete workflow results. Handler tests and module/inline parity are useful but cannot establish select-option availability, dragging or actual save/import. Capture each download once and assert complete current values, identities and citations, including changed user input; repeated downloads for separate substrings add browser-policy friction without stronger content coverage.
4. Keep UI finding selection, source citations, review binding and execution states testable. Require a reachable handoff for each reported finding; proposed remediation and local simulated acknowledgements must remain distinct from executed and measured outcomes.

[E, coordinator statement about the 16:24 benchmark changes] Exact output is retained at `~/fhten/frozen/R<round>/<challenge>` and first-open uses that copy. Vault Markdown is a reading copy and may differ. Earlier round-one manifest differences remain a stated limit, not an active cleanup request. Further QA focuses on findings that change build outcomes. The new STOP-file and 3.5-hour driver cancellation applies from round two; it does not establish shutdown behavior of the older round-one driver or fix the separate measured Pi detached-child defect.

[E] The separate as-is ID 12 run with 25 tests and the one-sentence build are not the benchmark's ID 12 entry above, which has 12 tests. Their automatic counts are not imported into this audit.
