---
type: status
status: active
owner: mukul
updated: 2026-11-04
summary: "Ten-challenge benchmark, round 1 at d0f4c69: 10 of 10 finished, 9 passed the automatic bar, 0 judged satisfactory."
---

# Ten-challenge benchmark, round 1

[P] Mukul's measure of success: real challenges built from the catalog card with no human help, start to finish, until satisfactory.

[E, automatic, code `d0f4c69` plus scratch patch to electron/codex-account.ts, electron/codex-rpc.ts, electron/codex-session.ts, verification.ts, started 15:55, in progress EST] Live model `gpt-6.1-sol` on the event login, card text as-is, at most 3 at once.

**Automatic bar:** reached review alone; generated tests pass with none skipped; every planned browser journey passes; first open offline shows no page errors, no outside requests and a non-blank page. **Satisfactory:** that bar plus an independent judge's verdict, in `Research/QA/Officer/JUDGE-R<round>-<challenge>.md`.

| Challenge | Status | Min | Tests | Journeys | Criteria met / deferred / failed | Repair | Open errors | Tokens, uncached plus output | Bar | Judge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [[Research/QA/Ten/R1/id12-optask/final\|id12-optask]] | review | 9.7 | 12/12 | 8/8 | 3 / 4 / 0 | yes | 0 | 232070 | pass | unsatisfactory |
| [[Research/QA/Ten/R1/id36-paperless/final\|id36-paperless]] | failed at verify | 13.2 | 22/22 | 8/12 | 3 / 15 / 2 | yes | 0 | 311374 | FAIL | pending |
| [[Research/QA/Ten/R1/id11-training/final\|id11-training]] | review | 14.1 | 15/15 | 16/16 | 3 / 4 / 0 | no | 0 | 285944 | pass | NOT |
| [[Research/QA/Ten/R1/id08-casrep/final\|id08-casrep]] | review | 11.3 | 15/15 | 8/8 | 3 / 2 / 0 | yes | 0 | 252079 | pass | NOT |
| [[Research/QA/Ten/R1/id20-contact-brief/final\|id20-contact-brief]] | review | 9 | 10/10 | 8/8 | 2 / 3 / 0 | yes | 0 | 219044 | pass | NOT |
| [[Research/QA/Ten/R1/id35-cyber-defender/final\|id35-cyber-defender]] | review | 12.3 | 22/22 | 8/8 | 1 / 17 / 0 | no | 0 | 274149 | pass | NOT |
| [[Research/QA/Ten/R1/id10-mooring/final\|id10-mooring]] | review | 10.7 | 25/25 | 6/6 | 1 / 4 / 0 | no | 0 | 247159 | pass | NOT |
| [[Research/QA/Ten/R1/id32-readiness/final\|id32-readiness]] | review | 12.5 | 26/26 | 12/12 | 7 / 10 / 0 | no | 0 | 291009 | pass | NOT |
| [[Research/QA/Ten/R1/id16-mordecai/final\|id16-mordecai]] | review | 11.4 | 15/15 | 10/10 | 3 / 0 / 0 | no | 0 | 261649 | pass | pending |
| [[Research/QA/Ten/R1/id37-fielding/final\|id37-fielding]] | review | 12.2 | 22/22 | 6/6 | 2 / 14 / 0 | yes | 0 | 314900 | pass | pending |

## What failed

- [E] `id36-paperless`: status failed, stage verify. Verification did not pass. Inspect the actual test output; delivery remains blocked. Open: {"pageErrors": [], "external": [], "blank": false}. Details: `Research/QA/Ten/R1/id36-paperless/log-tail.txt`
