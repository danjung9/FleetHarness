---
type: status
status: active
owner: mukul
updated: 2026-11-05
summary: "Ten-challenge benchmark, round 7 at 4a57562: 3 of 10 finished, 0 passed the automatic bar, 0 judged satisfactory."
---

# Ten-challenge benchmark, round 7

[P] Mukul's measure of success: real challenges built from the catalog card with no human help, start to finish, until satisfactory.

[E, automatic, code `4a57562` plus scratch patch to block list proven, codex-rpc.ts: keep the block list, codex-session.ts: Mac block list, started 04:39, in progress EST] Live model `gpt-6.1-sol` on the event login, card text as-is, at most 3 at once.

**Automatic bar:** reached review alone; generated tests pass with none skipped; every planned browser journey passes; first open offline shows no page errors, no outside requests and a non-blank page. **Satisfactory:** that bar plus an independent judge's verdict, in `Research/QA/Officer/JUDGE-R<round>-<challenge>.md`.

| Challenge | Status | Min | Tests | Journeys | Criteria met / deferred / failed | Repair | Open errors | Tokens, uncached plus output | Bar | Judge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [[Research/QA/Ten/R7/id36-paperless/final\|id36-paperless]] | failed at plan | 23.9 | - | 0/0 | 0 / 0 / 0 | no | 0 | 357043 | FAIL | pending |
| [[Research/QA/Ten/R7/id12-optask/final\|id12-optask]] | failed at verify | 31.6 | - | 0/0 | 0 / 0 / 0 | yes | 0 | 717993 | FAIL | pending |
| [[Research/QA/Ten/R7/id08-casrep/final\|id08-casrep]] | failed at plan | 21.5 | - | 0/0 | 0 / 0 / 0 | yes | 0 | 331865 | FAIL | pending |

## What failed

- [E] `id36-paperless`: status failed, stage plan. The build stopped because it took too long; check the saved work and try again. Open: {"pageErrors": null, "external": null, "blank": null}. Details: `Research/QA/Ten/R7/id36-paperless/log-tail.txt`
- [E] `id12-optask`: status failed, stage verify. The build stopped because it took too long; check the saved work and try again. Open: {"pageErrors": null, "external": null, "blank": false}. Details: `Research/QA/Ten/R7/id12-optask/log-tail.txt`
- [E] `id08-casrep`: status failed, stage plan. The build did not produce all the required files; check the saved work and try again. Open: {"pageErrors": null, "external": null, "blank": null}. Details: `Research/QA/Ten/R7/id08-casrep/log-tail.txt`
