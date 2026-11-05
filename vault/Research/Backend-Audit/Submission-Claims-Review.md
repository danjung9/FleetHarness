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
