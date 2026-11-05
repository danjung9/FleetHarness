---
type: status
status: active
owner: mukul
updated: 2026-11-05
summary: "Ten-challenge benchmark, round 6 at 5f4eb39: 10 of 10 finished, 0 passed the automatic bar, 0 judged satisfactory."
---

# Ten-challenge benchmark, round 6

[P] Mukul's measure of success: real challenges built from the catalog card with no human help, start to finish, until satisfactory.

[E, automatic, code `5f4eb39` plus scratch patch to block list proven, codex-rpc.ts: keep the block list, codex-session.ts: Mac block list, started 03:39, finished 04:39 EST] Live model `gpt-6.1-sol` on the event login, card text as-is, at most 3 at once.

**Automatic bar:** reached review alone; generated tests pass with none skipped; every planned browser journey passes; first open offline shows no page errors, no outside requests and a non-blank page. **Satisfactory:** that bar plus an independent judge's verdict, in `Research/QA/Officer/JUDGE-R<round>-<challenge>.md`.

| Challenge | Status | Min | Tests | Journeys | Criteria met / deferred / failed | Repair | Open errors | Tokens, uncached plus output | Bar | Judge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [[Research/QA/Ten/R6/id36-paperless/final\|id36-paperless]] | failed at build | 24.6 | - | 0/0 | 0 / 0 / 0 | yes | 0 | 487786 | FAIL | pending |
| [[Research/QA/Ten/R6/id12-optask/final\|id12-optask]] | failed at verify | 29.5 | 26/26 | 12/12 | 11 / 2 / 0 | yes | 0 | 779119 | FAIL | NOT |
| [[Research/QA/Ten/R6/id20-contact-brief/final\|id20-contact-brief]] | failed | 0.2 | - | 0/0 | 0 / 0 / 0 | no | 0 | 0 | FAIL | pending |
| [[Research/QA/Ten/R6/id11-training/final\|id11-training]] | failed at verify | 30.4 | 40/40 | 10/10 | 11 / 5 / 0 | yes | 0 | 802992 | FAIL | NOT |
| [[Research/QA/Ten/R6/id35-cyber-defender/final\|id35-cyber-defender]] | failed | None | - | 0/0 | 0 / 0 / 0 | no | 0 | 0 | FAIL | pending |
| [[Research/QA/Ten/R6/id32-readiness/final\|id32-readiness]] | failed | 0.5 | - | 0/0 | 0 / 0 / 0 | no | 0 | 0 | FAIL | pending |
| [[Research/QA/Ten/R6/id10-mooring/final\|id10-mooring]] | failed | None | - | 0/0 | 0 / 0 / 0 | no | 0 | 0 | FAIL | pending |
| [[Research/QA/Ten/R6/id16-mordecai/final\|id16-mordecai]] | failed | 0.5 | - | 0/0 | 0 / 0 / 0 | no | 0 | 0 | FAIL | pending |
| [[Research/QA/Ten/R6/id37-fielding/final\|id37-fielding]] | failed | None | - | 0/0 | 0 / 0 / 0 | no | 0 | 0 | FAIL | pending |
| [[Research/QA/Ten/R6/id08-casrep/final\|id08-casrep]] | failed at verify | 29.6 | 17/17 | 12/12 | 9 / 8 / 0 | yes | 0 | 733449 | FAIL | pending |

## What failed

- [E] `id36-paperless`: status failed, stage build. The app did not pass its checks; review the failed checks in the activity log before trying again. Open: {"pageErrors": null, "external": null, "blank": false}. Details: `Research/QA/Ten/R6/id36-paperless/log-tail.txt`
- [E] `id12-optask`: status failed, stage verify. The app did not pass its checks; review the failed checks in the activity log before trying again. Open: {"pageErrors": null, "external": null, "blank": false}. Details: `Research/QA/Ten/R6/id12-optask/log-tail.txt`
- [E] `id20-contact-brief`: status failed. The build service is not connected; connect it in Model settings and try again. Open: {"pageErrors": null, "external": null, "blank": null}. Details: `Research/QA/Ten/R6/id20-contact-brief/log-tail.txt`
- [E] `id11-training`: status failed, stage verify. The app did not pass its checks; review the failed checks in the activity log before trying again. Open: {"pageErrors": null, "external": null, "blank": false}. Details: `Research/QA/Ten/R6/id11-training/log-tail.txt`
- [E] `id35-cyber-defender`: status failed. Could not start through the UI: TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Home/ })
    - locator resolved to <button class="" aria-label="Home - challe Open: {"pageErrors": null, "external": null, "blank": null}. Details: `Research/QA/Ten/R6/id35-cyber-defender/log-tail.txt`
- [E] `id32-readiness`: status failed. The build service is not connected; connect it in Model settings and try again. Open: {"pageErrors": null, "external": null, "blank": null}. Details: `Research/QA/Ten/R6/id32-readiness/log-tail.txt`
- [E] `id10-mooring`: status failed. Could not start through the UI: TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Home/ })
    - locator resolved to <button class="" aria-label="Home - challe Open: {"pageErrors": null, "external": null, "blank": null}. Details: `Research/QA/Ten/R6/id10-mooring/log-tail.txt`
- [E] `id16-mordecai`: status failed. The build service is not connected; connect it in Model settings and try again. Open: {"pageErrors": null, "external": null, "blank": null}. Details: `Research/QA/Ten/R6/id16-mordecai/log-tail.txt`
- [E] `id37-fielding`: status failed. Could not start through the UI: TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Home/ })
    - locator resolved to <button class="" aria-label="Home - challe Open: {"pageErrors": null, "external": null, "blank": null}. Details: `Research/QA/Ten/R6/id37-fielding/log-tail.txt`
- [E] `id08-casrep`: status failed, stage verify. The app did not pass its checks; review the failed checks in the activity log before trying again. Open: {"pageErrors": null, "external": null, "blank": false}. Details: `Research/QA/Ten/R6/id08-casrep/log-tail.txt`
