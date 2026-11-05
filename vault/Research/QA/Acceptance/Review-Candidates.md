---
type: review
status: active
owner: mukul
updated: 2026-11-04
summary: "Run1 leads the three candidates on verified coverage; Run2 removes the exhaustion wording defect but leaves four exact cases unexercised."
---

# Candidate review

[R] **Pipeline-run1 remains the provisional leader among all three on independently verified behavioral coverage.** [E, browser receipts] All three pass review clearing and actual saved-file recovery in a fresh offline context. Run1 exercises all 17 frozen outcome cases; the other two exercise 13 each, with different gaps. No officer usability ranking or human acceptance is established. Passing-check totals also include infrastructure and are not counts of user journeys.

| Candidate | Independent outcome cases passed | Exact cases unavailable through the inspected form |
| --- | --- | --- |
| [Pipeline-run1](Results/training-acceptance-edf3150f-4563-4059-b9c0-6ecca70e64ac/result.json) | [E] 17 of 17 | None of the frozen cases; its JSON editor supports all 17. |
| [Pipeline-run2](Results/training-acceptance-beb73e23-ba33-48e0-a96a-b4f9a1b8bcee/result.json) | [E] 13 of 17 | G07 empty qualifications, G08 duplicate IDs, G09 quoted numeric starts, V14 reassigned room. G11 availability-window removal passes. |
| [CLI-route, corrected rerun](Results/training-acceptance-af6357a9-6421-4d12-ba9b-21b462cd2b3c/result.json) | [E] 13 of 17 | G08 duplicate IDs, G09 quoted numeric starts, G11 availability-window removal, V14 reassigned room. G07 empty qualifications passes. |

[E] The form gaps are UI LIMITATION findings; these exact cases through each candidate's portable-import boundary remain untested. Run2 and CLI therefore lack independent coverage of the two frozen invalid-input cases. V14 is an additional fixed-room scope variation, not an established brief violation.

[E, original receipts and later correction] The supplied Pipeline snapshot remains 33 PASS, one FAIL and 14 NOT CHECKED. The supplied CLI snapshot remains 27 PASS, one FAIL and 18 NOT CHECKED. The later corrected CLI run is 28 PASS, zero FAIL and 18 NOT CHECKED. Complete candidate payload file lists and digests match between the two CLI runs; the correction changed the checker, not the app. Neither original FAIL demonstrates a product defect, for the separate reasons below.

| Reported failure | Assessment |
| --- | --- |
| Pipeline CLOCK-DISPLAY | [E] The page shows zero as midnight; the frozen key says 0800. The actual brief and eight delivered criteria specify integer minutes and day-one zero, with no 0800 requirement. [R] **The key overreaches this brief. This is a contract mismatch, not a demonstrated build defect.** Preserve the raw failure and key; openly reconcile the clock convention before the officer walkthrough. |
| CLI OFFLINE-FRESH-IMPORT | [E] **Checker artifact, corrected rerun passes.** The earlier checker dismissed the valid import confirmation, leaving G01. The rerun records acceptance and restores saved G02 offline, with review cleared and identical saved/re-exported bytes. Candidate bytes are unchanged. Keep the [invalidated attempt](Results/training-acceptance-aaa1585f-8701-485b-861e-d2cc2ff42f8a/result.json). Tampered input/result is correctly rejected while retaining the unchanged original. |

[E, Pipeline G10 DOM] One actual clarity defect remains: the exhausted headline says no complete draft and unknown feasibility, while Constraint observations says “No conflicts in the complete current draft.” Both apps lack a separate readable-summary export; that is an acceptance-key extension absent from the supplied brief, not a portable-JSON failure.

[E, reporting clarification] CLI G08/G09/G11/V14 are **UI LIMITATION** findings for the inspected form: fixed IDs, integer parsing, no availability-window removal control and fixed room assignment. Portable import exists; these exact import variants remain untested. V14 also goes beyond the supplied fixed-room brief. Separate readable-summary export is **OUT OF BRIEF** for both candidates. Receipt revision 3 records those distinctions; existing receipts and counts above are preserved, and no new browser run is claimed.

[E, subsequent Run2 receipt] **Run1's exhaustion wording defect did not survive in the observed Run2 G10 case.** Run2 reports unknown feasibility, no accepted assignments and guidance to increase the allowance or inspect starts, without the contradictory complete-draft claim. Its independent receipt is 28 PASS, zero FAIL and 18 NOT CHECKED under the earlier reporting format. The adapter is ready as `--adapter pipeline-run2`; see [[Research/QA/Acceptance/Review-Run2]]. The app's own 21 Node tests and 22 browser checks remain separate evidence. Its three deferred requirements and `requirementsMet: false` remain unresolved. The current mission is ten catalog challenges; this partial ID 11 comparison does not downselect that benchmark.

[R] Next-build instruction changes at `d0f4c69`:

- `skills/fleet-ux/SKILL.md` and `skills/fleet-scheduling/SKILL.md`: fix the Pipeline exhaustion explanation and require headline, explanation, accepted assignments and review state to agree. Add a visible G10 regression that expects unknown feasibility, no complete draft and no claim that a complete draft has no conflicts.
- `skills/fleet-planning/SKILL.md` and `skills/fleet-evidence/SKILL.md`: trace clock/export expectations to supplied criteria and flag key/brief conflicts before freezing plans. Keep the independent numeric oracle and preserve the existing key; any future contract revision must disclose the changed scope. Do not force 0800 or a separate summary into this app to satisfy unstated requirements.
- `harness/quality-contract.ts`: add retained-download import and fresh offline context actions, with corresponding host support. Its current reload/download vocabulary cannot prove file reimport. In `skills/fleet-delivery/SKILL.md`, require actual downloaded bytes, explicit import-confirmation evidence and comparison of all inputs, assignments, totals and cleared review before recomputing.
- Candidate verification instructions: document fixed CLI controls and exercise exact malformed inputs through its real portable-import boundary. G08/G09 cannot be validated by coercing them through integer or fixed-ID form fields. Preserve the valid draft on rejection, and keep V14's reassigned room identified as additional evaluation scope.
- Run2 follow-up: exercise G07/G08/G09 through its exposed JSON/file import and explicitly reconcile its accepted input domain with the unchanged oracle. Align the embedded Download user guide with the delivered README; their developer test commands currently differ. Preserve the correct exhaustion wording and its regression evidence.

[R] **For Mukul's morning:** judge conflict/exhaustion wording; reconcile clock and summary scope; follow the actual guide and fresh-file recovery; inspect review clearing and tampered-file rejection; decide whether the four CLI form limitations and untested corresponding import paths matter to the chosen scope; accept or reject the exact final digest. These remain judgments to perform, not waived checks or measured usability.
