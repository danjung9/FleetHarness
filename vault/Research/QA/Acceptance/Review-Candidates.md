---
type: review
status: active
owner: mukul
updated: 2026-11-04
summary: "Pipeline leads on observed coverage; the clock failure is a brief/key mismatch and the CLI import failure came from the checker."
---

# Candidate review

[R] **Pipeline-run1 leads provisionally.** [E, browser receipts] It passed all 17 frozen numeric/outcome cases, displayed totals, review invalidation and fresh offline save/import. CLI-route passed 13 numeric/outcome cases; its form cannot express four exact variants. The receipts contain 33 and 27 passing checks, including infrastructure, not that many user journeys. Neither is human accepted. [Pipeline receipt](Results/training-acceptance-edf3150f-4563-4059-b9c0-6ecca70e64ac/result.json); [CLI receipt](Results/training-acceptance-aaa1585f-8701-485b-861e-d2cc2ff42f8a/result.json).

| Reported failure | Assessment |
| --- | --- |
| Pipeline CLOCK-DISPLAY | [E] The page shows zero as midnight; the frozen key says 0800. The actual brief and eight delivered criteria specify integer minutes and day-one zero, with no 0800 requirement. [R] **The key overreaches this brief. This is a contract mismatch, not a demonstrated build defect.** Preserve the raw failure and key; openly reconcile the clock convention before the officer walkthrough. |
| CLI OFFLINE-FRESH-IMPORT | [E] **Checker artifact.** The checker dismissed the valid import confirmation, leaving G01 through the app's cancel path. The downloaded G02 was correct. QA fixed delegation and requested a rerun; successful recovery remains pending. The tampered-file test correctly rejected inconsistent input/result and retained the unchanged original. |

[E, Pipeline G10 DOM] One actual clarity defect remains: the exhausted headline says no complete draft and unknown feasibility, while Constraint observations says “No conflicts in the complete current draft.” Both apps lack a separate readable-summary export; that is an acceptance-key extension absent from the supplied brief, not a portable-JSON failure.

[R] Next-build instruction changes at `d0f4c69`:

- `skills/fleet-ux/SKILL.md` and `skills/fleet-scheduling/SKILL.md`: require headline, explanation, totals and review state to agree. Exhaustion means unknown feasibility; never describe an absent draft as complete.
- `skills/fleet-planning/SKILL.md` and `skills/fleet-evidence/SKILL.md`: trace clock/export expectations to supplied criteria and flag key/brief conflicts before freezing plans. Keep the independent numeric oracle.
- `harness/quality-contract.ts`: add retained-download import and fresh offline context actions, with corresponding host support. Its current reload/download vocabulary cannot prove file reimport. In `skills/fleet-delivery/SKILL.md`, require the actual saved-file roundtrip and honest limits. Request a readable summary explicitly if desired; prompts alone cannot add a missing host action.

[R] **For Mukul's morning:** judge conflict/exhaustion wording; reconcile clock and summary scope; follow the actual guide and fresh-file recovery; inspect review clearing and tampered-file rejection; decide whether the four untested CLI variants matter to the chosen scope; accept or reject the exact final digest. These remain judgments to perform, not waived checks or measured usability.
