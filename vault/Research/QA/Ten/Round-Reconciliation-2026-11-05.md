---
type: review
status: active
owner: mukul
updated: 2026-11-05
summary: "Saved benchmark rows reconcile with raw results, except a false Round 2 completion count, one stale verdict and experiment evidence links."
---

# Benchmark receipt reconciliation

[E, November 5 01:37 EST] Read-only comparison of every saved round currently present in fhten and fhexp. No benchmark, model, browser or product program was launched. The current merge has not produced a new round in these locations.

| Round | Board rows | Raw final receipts | Reached review | Automatic passes | Independently satisfactory |
| --- | --- | --- | --- | --- | --- |
| R1 | 10 | 10 | 9 | 9 | 0 |
| R2 | 10 placeholders | 0 | 0 | 0 | 0 |
| R3 | 3 | 3 | 0 | 0 | 0 |
| Exp1 R101 | 5 | 5 | 5 | 5 | 0 |

## Findings requiring reporting corrections

1. [E] Research/QA/Ten/Round-2.md:6 says 10 of 10 finished. Lines 19 through 28 and all ten entries of ~/fhten/r2.rows.json instead say not finished; ~/fhten/r2 contains no *.final.json receipts. The driver failed before producing a build result. Current ~/fhten/tools/ten.py:144 calculates this headline using len(rows), which includes placeholders. [R] Count terminal results with receipts and retain the infrastructure failure. Do not claim ten completed builds.
2. [E] Research/QA/Ten/Exp1/Scoreboard.md:23 and Round-101.md:23 leave id20-contact-brief pending. Research/QA/Officer/JUDGE-R101-id20-contact-brief.md:11 records VERDICT: NOT. All five experiment entries now have NOT judgments; the zero satisfactory total remains correct. [R] Regenerate the row verdict from the completed judgment.
3. [E] Research/QA/Ten/Exp1/Scoreboard.md:19 through 23 and Round-101.md:19 through 23 link to Research/QA/Ten/R101. The artifacts are under Research/QA/Ten/Exp1/R101. All five links therefore miss the saved evidence. Current ~/fhten/tools/ten.py:151 hard-codes the non-experiment namespace. [R] Use the actual round root when rendering evidence links. This is the same namespace defect already recorded in the November 4 audit, still present.

## What matched and what remains limited

[E] Compared each table's status and failed stage, minutes, generated-test totals, journey totals, criteria counts, repair flag, first-open errors, saved token count and automatic-bar value to its aggregate rows. For all 18 final receipts, compared status, time, tests, journeys and criteria to the raw final JSON. Recomputed the automatic predicate from raw final and first-open evidence. First-open JSON agrees with the saved row. Compared completed independent VERDICT lines to the board. No additional discrepancy was found in these fields.

[E] R3's three raw finals fail process cleanup despite passing their generated checks. Its progress.jsonl ends with three stop requests and four queued challenges. Those seven have no final receipt here. Stop requests are not proof of cleanup and are not completed build outcomes. Research/QA/Ten/Round-3.md:6 correctly reports three of ten finished.

[E] The token column agrees with the saved aggregate values; this pass did not recompute usage from model session logs. The earlier R1 copied-artifact identity limitations remain in [[Research/QA/Ten-Benchmark-Audit]]. Exp1's earlier 324-entry raw manifest check is retained there. This reconciliation does not turn an automatic pass into a satisfactory verdict or certify the new merged factory.

## Inspected aggregate identities

| File | SHA-256 |
| --- | --- |
| ~/fhten/r1.rows.json | 38f497d9a874c79497f2129101f1e2993a015e773beb978b20cd591fd004dcf2 |
| ~/fhten/r2.rows.json | 43d522529c71a4298a2dbd8615184a13145de3f3473068712c1aebc28da7878e |
| ~/fhten/r3.rows.json | e5417d42ba805490ec5625cad50a091b4f32429ba1f3fe1770fd212f003cda6b |
| ~/fhexp/r101.rows.json | fc9c42a291468eac65cf09c42f8ba4054e80d63a327fcaa571b5d9015649681e |
| ~/fhten/tools/ten.py | fbce3fbbc51694151f1809dba38207c7f21a6beff03f55719724aca2ae62bcc5 |

[R] On each new round completion, reconcile its actual final receipts, first-open evidence and independent verdicts before presenting its scoreboard as current. Runtime ownership and artifact generation remain with main. Existing boards and raw receipts were left unchanged.
