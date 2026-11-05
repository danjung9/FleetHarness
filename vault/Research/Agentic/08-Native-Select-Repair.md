---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Challenge 36 failed because malformed option markup survived a label-only repair; strengthen native-control repair guidance."
---

# Native select repair, challenge 36

## Bottom line

[E, R1/id36-paperless source and both browser trace sets] The local conflict choice was never an option in the parsed browser DOM: the generated HTML uses a closing tag where its opening tag should be. [E] The single repair changed its label but preserved the malformed tag, while Node tests assigned a value to a stub control and missed the defect. [R] Agentic-builder should make the small factory correction in `skills/fleet-ux/SKILL.md`: diagnose native controls from parsed DOM and raw markup before changing labels. [R] Preserve the frozen journeys and one-repair bound, then require a fresh benchmark receipt; this diagnosis is not a passing build.

## Exact cause and evidence

[E] Identity: round 1, challenge 36, `id36-paperless`, supplied factory baseline `d0f4c69`. Final report time is `2026-11-04T21:08:23.757Z`; source hash is `b137758027436fd973905b66c7dbf778ebbf34fc4fbbc58714e238b4f1d218e2`, contract hash is `0b4aa74c84c88429bbe95df7185eb7016ca3724434d070272945c8f875209845`. `final.json.report` equals the retained `test-report.json` exactly.

[E, generated `index.html:11`] The malformed token is `</option value="local">`. It closes the placeholder option and does not open a local option. The exact implementation correction would replace that token with `</option><option value="local">`. This note does not edit the generated artifact.

[E, baseline and final trace snapshots] The first full snapshot of `#resolution-choice` contains three OPTION elements, with values empty, peer and custom. The local label is a plain text child between them. Both `edit-conflict` and `delete-conflict`, at desktop and narrow sizes, request local at frozen step 12 and repeatedly fail option lookup before timing out. The selector resolves and the control becomes enabled. This is malformed application markup, not evidence of a selector mismatch, a stuck transaction or a browser value-versus-label incompatibility.

[E, `log-tail.txt`, `verification.md:44`, final source and traces] The repair inferred a label-matching problem from the served HTML, replaced the readable labels with local/peer/custom and added adjacent help. The closing tag remained malformed. Its two added tests in `ui.test.cjs:33` assign `.value = 'local'` directly to the stub constructed at line 7; that object accepts any string without a real option collection. Those tests exercise handlers, not HTML parsing or native selection.

[E, final report] The host did rerun verification after repair: 22/22 Node tests passed, but only 8/12 browser cases passed. The same four step-12 failures remained; UC36-2 and OFF-02 failed, three criteria passed and fifteen stayed unverified. Review and delivery remained queued. The artifact guide's pending-rerun text predates this final host receipt.

## Smallest factory fix and code seat

[R] **Code seat: agentic-builder**, as a separate bounded follow-up after its current verifier consolidation and review. This is a proposed allocation, not a claim that the runner has dispatched it. There is no need to change the native selection runner, increase timeouts or add retries.

| File | Small change [R] |
| --- | --- |
| `skills/fleet-ux/SKILL.md` | Extend the existing repair paragraph: on native-control failures, compare the frozen requested value with actual options in the captured DOM and inspect the corresponding HTML start/end tags. Source text containing a value does not establish an option. Repair malformed markup before changing labels; stub-based Node tests cannot establish native-control passage. Require the host browser rerun. |
| `tests/browser-verification.test.mjs` | Add a small synthetic regression pair: the malformed closing-tag fixture must fail local selection at both viewports; the correctly opened option with a readable label different from its value must pass the same selection and change-handler assertion. This protects the existing browser gate and rejects the label-only diagnosis. |

[E, `electron/pi-backend.ts:237` through `:250` at d0f4c69] The existing flow already returns host failures to one repair, reruns verification and blocks delivery on failure. [R] Keep that flow. The regression pair checks the gate; only a fresh real build can establish that the revised instruction improves autonomous repair.

## Closure and limits

[E] Read all eight failing trace archives across the two attempts. Each records the local selection request, option-not-found retries and malformed served markup. A Python standard-library HTML token check found only empty/peer/custom option start tags; an in-memory correction added local. No candidate code, repository test or browser was executed here.

[R] Main/QA runs the synthetic regression through the permitted browser runner and retains the failing fixture evidence and corrected fixture pass. Then rerun challenge 36 through the factory, without hand-editing the app or changing the frozen acceptance expectations. Require all twelve browser cases and meaningful Node checks, retain the original failure, and obtain the independent verdict. Fifteen deferred requirements remain a separate acceptance gap even if the dropdown repair succeeds. Human artifact acceptance and submission approval remain required.

[E] Searches of existing Agentic notes and QA notes found no earlier architecture note for this same malformed-option cause. The generated `verification.md` contains the incorrect label diagnosis, not an existing cross-challenge fix. At review, the supplied mvp revision was `1d9eeee`; Git comparison from d0f4c69 shows no changes to the relevant browser verifier, quality gate or pipeline files.

[E, final relay reread] LATEST.md advanced to Windows-installer `e68e90e`; LATEST-analysis.md now covers mvp `1d9eeee`. The Windows patch changes `tests/browser-verification.test.mjs`, raising the existing bad-recovery/export fixture's time allowances and adding failure diagnostics. It does not fix malformed generated options or change production selection. [R] Preserve that teammate change and serialize ownership of the test file before adding the regression pair. No mvp integration or Windows runtime result is inferred from this relay.

## Sources

- [E] [[Research/QA/Ten/Scoreboard]] and `Research/QA/Ten/R1/id36-paperless/{final.json,test-report.json,log-tail.txt,acceptance-plan.json,index.html,ui.test.cjs,verification.md}`.
- [E] Under that evidence directory, baseline `.quality-evidence/4f6bea891e7e-dcb0fb8e-560b-471c-9043-4b7a9fd6c14a/` and final `.quality-evidence/4f6bea891e7e-95726a67-9bcb-4db4-a746-28ceb086c4b6/`, all edit-conflict and delete-conflict desktop/narrow ZIP traces. Read `trace.trace` snapshots and served HTML resources as data.
- [E] Pinned local Git source: https://github.com/danjung9/FleetHarness/tree/d0f4c69, `electron/browser-verification.ts:78`, `electron/quality.ts:32`, `electron/pi-backend.ts:234`; current integration copies of `skills/fleet-ux/SKILL.md` and `tests/browser-verification.test.mjs`. No remote repository retrieval.
- [R] [[Ops/Directors/Directive-agentic]], [[Ops/Dev-Pattern]], [[Research/Agentic/Flow-Goals]].
