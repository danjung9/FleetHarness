---
type: review
status: needs-refresh
owner: mukul
updated: 2026-11-05
summary: "Submission wording needs reconciliation with the current factory and corrected QA evidence."
---

# Submission claim review

[E, November 5] Reviewed Submission/Draft, Disclosure and README against later candidate reviews, backend handoffs, benchmark receipts and the fresh runtime-owner report. The historical experiment remains evidence; it does not certify the current integration candidate.

| Claim or omission | Finding and correction |
| --- | --- |
| Closed-sandbox build in the headline | [E] This describes the dated 631849f experiment. The backend handoff removes execution containment, which the runtime owner reports is Mukul's choice. [R] Label the earlier boundary as historical and describe current execution access separately. Retain supported approval, monitoring and shutdown statements. |
| Current revision d0f4c69 and 96 pass / 20 fail | [E] Stale. Main reports mvp 16a6940; committed integration reached 8053707, with 29ac921 being merged. [R] Use the final selected commit and matching native receipt. Main says automatic QA used a stale checkout and its results are invalid pending repair. |
| Clock failure presented as an application defect | [E] The raw receipt remains, but later review identifies a key/brief mismatch. A distinct contradictory exhaustion explanation is a real defect. [R] Preserve counts with that interpretation and cite [[Research/QA/Acceptance/Review-Candidates]]. |
| Detached shutdown described as unmeasured | [E] A d0f4c69 fixture measured continued detached work after Stop. Fresh receipt 6b784ff0 now closes the bounded Pi shell/parent/detached-child case at clean 16a6940, with seven checks passing. [R] Present that scoped closure and the historical failure; do not generalize it to newer browser helpers, other engines, Quit or crash recovery. See [[Research/QA/GUI-16a6940/Detached-Stop-Review]]. |
| One partial ID 11 app stands in for factory completion | [E] R1 has no satisfactory challenge verdicts; all five Exp1 outputs were independently rejected. R3 ended on cleanup failures. [R] Retain the training app as historical evidence and report the final ten-challenge result separately. |
| Early tool and dependency inventory | [E] Integration adds browser helpers and more bundled skills. [R] Reconcile final packages, provenance and licenses against the ledgers; do not call unmerged components shipped. |

[E, main-session report] The last full native run was 588 of 596 unit checks and 84 of 84 harness checks at 0ad7b73. Later focused passes and fixes are not a full native rerun. [[Research/Backend-Audit/merge-dan]] identifies remaining native, browser and clean-package checks.

[E] No user trial, burden reduction, human acceptance or submission receipt was found. The draft correctly leaves these unclaimed. Eligibility, portal fields, contribution rights, named owners and submission authorization remain person-owned items. No raw receipt or submission file was changed by this review.

[R] Lead the final submission with one demonstrated outcome on the selected artifact. Distinguish automatic checks, independent challenge judgment and human acceptance, with each claim tied to the revision that establishes it.

## Complete line inventory for the overnight assignment

[E] Read every Submission Markdown document, including its local Sprint log, session note and hidden journal. The locations below are in the unchanged source documents. Recommendations and explicitly blank inputs are separated from factual defects; historical receipts are not rewritten.

| Location | Classification and required reconciliation |
| --- | --- |
| Submission/Draft.md:26 and 28; Submission/Disclosure.md:50 | Historical closed-profile experiment is supported by the cited run report. It is false as a description of the current full-access product. Keep the date/revision and add current policy; absence of containment is not a defect. |
| Submission/Draft.md:46; Submission/Disclosure.md:48; Submission/Sessions/2026-11-04-submission-package.md:19 | d0f4c69 and its 96/20 or 20-failure gate are obsolete current-state claims. The session note can retain them as dated history, but its proposed status update must not be copied as current. Bind release status to the actual final executed revision. |
| Submission/Draft.md:30 and 45; Submission/Disclosure.md:48; Submission/README.md:16; Submission/Sprint/Submission-Log.md:27; Submission/Sessions/2026-11-04-submission-package.md:12 and 19 | Raw CLOCK-DISPLAY failure remains in the receipt, but later QA establishes a key/brief mismatch rather than a product defect. Present that correction beside the raw count. Preserve the separate real exhaustion-wording defect. |
| Submission/Next-30-60-90.md:25 | The proposed gate treats clock-display and readable-export as defects to close. Later QA identifies both expectations as absent from the supplied brief. Reconcile scope before turning them into required fixes. Review-binding and guide checks remain separate obligations. |
| Submission/Draft.md:55 | Detached Pi Stop is no longer unmeasured: historical failure and clean 16a6940 bounded PASS both exist. Cite receipt 6b784ff0 and its limits. Codex, Quit, crash recovery, Windows and newer service/browser-helper behavior are not established by that Pi receipt. |
| Submission/Disclosure.md:19 and 21 | CLI 0.163.0 remains historical recorded use. Candidate 8053707 package.json incorporates @openai/codex 0.166.0 and exact dependency versions; distinguish that bundle from the old CLI. The grouped early inventory is not a complete final package inventory. Pi SDK 1.5.0 still matches the pinned package, so that version is not a defect. Reconcile bundled helpers/skills and provenance after the final merge. |
| Submission/Draft.md:72; Submission/Next-30-60-90.md:27 | Multiple real catalog generations now exist, so distinguish attempted cross-domain generation from satisfactory repeated outcomes. Zero satisfactory benchmark outcomes remains supported. The proposed second-domain sequence predates the ten-challenge mission and needs alignment, rather than claiming those attempts never happened. |
| Submission/Draft.md:53 | The 184-entry/149-tool-call counts and no-remaining-process statement are explicitly attributed to the historical build report. No linked raw process trace independently establishes that claim in this package. Retain the attribution and do not promote it to a general shutdown guarantee; use the scoped native Stop receipt for the latter case. |
| Submission/Disclosure.md:28; Submission/Draft.md:53 | Unknown token use remains supported for the original curated Run1 in its cited report. It must not describe all experiments: R1 and Exp1 benchmark rows now contain usage counts. Dollar cost and whole-event totals are not established by those per-round counts. |
| Submission/Draft.md:38,63,67; Submission/Next-30-60-90.md:29 | These capability and offline statements describe the frozen partial ID 11 HTML app. They cannot certify newly generated service/CLI apps or the current factory. Keep the artifact scope explicit; no final combined-runtime acceptance receipt is supplied here. |

### Explicitly unproven items, already labeled correctly

[E] Draft.md:15-22 and Next-30-60-90.md:15-21 leave user/problem confirmation, measured burden, team/terms, category disposition, rights split, owners/resources, final human acceptance and submission format/authorization blank. Draft.md:47 and 64-68 withhold benefit, government-device readiness, durable action history and fielding commitments. No supporting completion receipt was found; these are correctly declared gaps, not fabricated achievements. Do not replace them with invented names, approvals or savings.

### Claims checked without a new defect

[E] The cited acceptance JSON still contains 33 PASS, 1 FAIL, 14 NOT CHECKED, ending at 15:38:15 EST. Its recorded runtime is Node 26.0.0, Chrome 156.0.8078.80 and Playwright 1.64.1. The original generated test-report contains 22 passed, 0 failed, 0 skipped, exit 0. The later candidate review confirms 17 independent outcome cases for Pipeline-run1 and fresh offline import. These counts remain historical and do not certify the merged factory. The rubric weights match the captured Event/Judging note. The common six-item checklist is sourced to the captured requirements, not represented as a new portal ruling.

[E] No Submission file, historical receipt or product source was changed. Exact current merge/regression findings are recorded separately in [[Research/Backend-Audit/Merge-Parent-Review]] and [[Research/Backend-Audit/Merge-Evidence-Review]].
