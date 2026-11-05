---
type: status
status: active
owner: mukul
updated: 2026-11-05
summary: "Ten-challenge benchmark, round 5 at f2e5422: 3 of 10 finished, 0 passed the automatic bar, 0 judged satisfactory."
---

# Ten-challenge benchmark, round 5

[P] Mukul's measure of success: real challenges built from the catalog card with no human help, start to finish, until satisfactory.

[E, automatic, code `f2e5422` plus scratch patch to block list proven, codex-rpc.ts: keep the block list, codex-session.ts: Mac block list, started 02:55, in progress EST] Live model `gpt-6.1-sol` on the event login, card text as-is, at most 3 at once.

**Automatic bar:** reached review alone; generated tests pass with none skipped; every planned browser journey passes; first open offline shows no page errors, no outside requests and a non-blank page. **Satisfactory:** that bar plus an independent judge's verdict, in `Research/QA/Officer/JUDGE-R<round>-<challenge>.md`.

| Challenge | Status | Min | Tests | Journeys | Criteria met / deferred / failed | Repair | Open errors | Tokens, uncached plus output | Bar | Judge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [[Research/QA/Ten/R5/id12-optask/final\|id12-optask]] | failed at build | 17 | - | 0/0 | 0 / 0 / 0 | yes | 0 | 434865 | FAIL | pending |
| [[Research/QA/Ten/R5/id36-paperless/final\|id36-paperless]] | failed at verify | 22.6 | - | 0/0 | 0 / 0 / 0 | yes | 0 | 652774 | FAIL | pending |
| [[Research/QA/Ten/R5/id11-training/final\|id11-training]] | failed at build | 24.6 | - | 0/0 | 0 / 0 / 0 | yes | 0 | 496238 | FAIL | pending |

## What failed

- [E] `id12-optask`: status failed, stage build. AppYard could not confirm that all build work stopped; use the operator shutdown procedure and ask the app maintainer for help before starting another build. Open: {"pageErrors": null, "external": null, "blank": false}. Details: `Research/QA/Ten/R5/id12-optask/log-tail.txt`
- [E] `id36-paperless`: status failed, stage verify. AppYard could not confirm that all build work stopped; use the operator shutdown procedure and ask the app maintainer for help before starting another build. Open: {"pageErrors": null, "external": null, "blank": false}. Details: `Research/QA/Ten/R5/id36-paperless/log-tail.txt`
- [E] `id11-training`: status failed, stage build. The app did not pass its checks; review the failed checks in the activity log before trying again. Open: {"pageErrors": null, "external": null, "blank": false}. Details: `Research/QA/Ten/R5/id11-training/log-tail.txt`
