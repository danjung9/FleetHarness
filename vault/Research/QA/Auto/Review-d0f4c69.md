---
type: review
status: complete
owner: mukul
updated: 2026-11-04
summary: "Automatic QA passes compilation and 167 reported tests; five smoke failures reflect stale test assumptions and leave later behavior untested."
---

# Automatic QA review at d0f4c69

[E, receipt and pinned source review] The [15:46 to 15:49 EST receipt](d0f4c69.md) reports successful type checking, Electron compilation, web build, 116 unit tests and 51 harness tests. Four GUI smoke scripts pass and five fail. This improves on main's earlier reported 96 PASS / 20 FAIL gate, but the cause of that difference is not established by this summary. No test, app, browser or worker ran for this review. Source references below use clean `fh-org/gui-d0f4c69` at `d0f4c690d3f40ac260eb0a291dde75f0d55c4aa5`.

| Failed smoke | Assessment | Work left after repairing the test |
| --- | --- | --- |
| Activity | [E] Inconsistent fixture: `scripts/smoke-activity.mjs:34` supplies running status and logs without a run ID. `src/App.tsx:95` shows start guidance when that ID is absent. Real Pi starts assign one at `electron/pi-backend.ts:78`. | [R] Give the synthetic run coherent identity, then verify inspector logs and the assertions after line 99. |
| Electron | [E] Stale selector at `scripts/smoke-electron.mjs:34` hardcodes catalog count 34. The current bundled catalog has 39; `src/App.tsx:154` displays its current length. | [R] Select the actual catalog control and rerun the build, review and export path that was never reached. |
| Home | [E] The test requires individually centered heading and mark at `scripts/smoke-home.mjs:22-29`. Three seeded projects select the returning layout, whose identity is deliberately left aligned (`src/Home.tsx:44`, `src/home.css:11`). The unreached exact example name at smoke line 37 is also obsolete. | [R] Assert the intended fresh/returning layouts separately and rerun navigation, example creation and saved-build search. This assertion does not demonstrate a failed officer task. |
| Model selector | [E] The unscoped Start build selector at `scripts/smoke-model-selector.mjs:83` matches both header and inspector guidance. | [R] Scope the intended control, then test the running-state lock and later assertions. No build started in this failed step. |
| System design | [E] The same ambiguity occurs at `scripts/smoke-system-design.mjs:28`. The captured draft states precede any start. | [R] Scope the action and rerun the generated design checks. Draft snapshots are not evidence of a generation failure. |

[E] All five executions failed and their downstream coverage remains open. Their failure points are explained by stale fixture, selector or layout assumptions; none alone demonstrates a product-task regression. [R] Correct tests against intended behavior and rerun, rather than deleting assertions or marking these scripts passed.

[E, scope correction] The receipt's fixture-only description is too broad. `scripts/smoke-chatgpt.mjs:27-37` intercepts browser opening, then initiates and cancels a real Codex login flow. Its authenticated UI portion is renderer-fixtured. The result does not establish completed sign-in or live inference. No authentication logs or credentials were inspected in this review.

[E, open-finding comparison] U1's original Home catalog-search surface was removed, so its reproduction is superseded by redesign, not runtime-verified fixed. U2's missing direct Stop on Home remains in `src/App.tsx:291`; recent builds now show Building and offer an opening shortcut. U3 has a source correction at `src/Home.tsx:58`: its accessible name includes the visible title. The failed Home smoke does not close U2 or prove the U3 runtime assertion.

[E] H1, V1, E3 and E5 remain open in source. New helper tests support E1/E2/E4's source guards, but the seven original independent reproductions have not been rerun here. The passing quality smoke proves a narrower quality-enabled browser gate, not repair of the Node test-count issue. See [[Research/QA/Acceptance-Reconcile-d0f4c69]]. Ordinary-child Stop evidence still belongs to `631849f`; detached-job evidence is a separate pending case. No complete product acceptance, credential containment or generated-app acceptance follows from this Auto pass.
