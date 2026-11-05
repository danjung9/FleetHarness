
## 17:48 report

Seven findings remain after reviewing the five specified sibling revisions. Product code is unchanged.

1. **P1: Pi tools escape the run workspace.** [pi-backend.ts:143](~/Documents/CDAO/fh-org/astra-a1/electron/pi-backend.ts:143)  
   The real SDK shell overwrote a synthetic file outside its workspace. The process marker provides cleanup, not containment. **Fix:** run all Pi filesystem and shell tools inside a restricted worker; preflight that actual boundary and refuse startup if unavailable.

2. **P1: Approval follows symlinks outside the workspace.** [main.ts:108](~/Documents/CDAO/fh-org/astra-a1/electron/main.ts:108)  
   A generated `review.json` symlink caused approval to overwrite an external synthetic canary. Reproduced against local code and all five sibling versions. **Fix:** write host receipts through exclusive temporary files and atomic rename without following destination links. Apply this to backend test-report writes too.

3. **P1: Restart claims stopped while workers continue.** [storage.ts:41](~/Documents/CDAO/fh-org/astra-a1/electron/storage.ts:41)  
   A real orphaned worker kept writing after `Store.init()` changed its saved run to stopped. The process marker is not persisted, and the restarted backend cannot stop that worker. **Fix:** persist ownership before launch, reconcile workers during startup, and block new work until cleanup is confirmed.

4. **P1: Failed cleanup still permits approval.** [main.ts:57](~/Documents/CDAO/fh-org/astra-a1/electron/main.ts:57)  
   Injecting cleanup rejection into the real finish path produced a failed run, but its retained passing report still authorized approval. Reproduced across all six main.ts versions. **Fix:** require successful review-state completion and confirmed cleanup for the same run ID at every approval and delivery gate.

5. **P1: Concurrent app instances lose saved challenges.** [main.ts:19](~/Documents/CDAO/fh-org/astra-a1/electron/main.ts:19), [storage.ts:53](~/Documents/CDAO/fh-org/astra-a1/electron/storage.ts:53)  
   Two real Store instances sharing one root reproduced a stale save deleting a newly saved challenge. There is no exclusive app/workspace lock; run counts are also independent. **Fix:** acquire exclusive ownership before loading state, reject the second owner, and focus the existing window.

6. **P2: Stop ignores delivery.** [main.ts:92](~/Documents/CDAO/fh-org/astra-a1/electron/main.ts:92)  
   With a controlled packager, the production Stop handler returned without aborting delivery; the download was subsequently saved and status became delivered. **Fix:** abort the matching `deliveries` controller and await its completion alongside backend Stop.

7. **P2: Failed approval remains approved in memory.** [main.ts:106](~/Documents/CDAO/fh-org/astra-a1/electron/main.ts:106)  
   Making `review.json` a directory caused a real `EISDIR` rejection, but `approvedAt` and approved status remained committed. **Fix:** reserve the project during approval, persist safely before committing approval, and restore prior state on failure.

[Full report](~/Documents/CDAO/fh-org/astra-a1/audit/lifecycle/report.md) and [reproduction tests](~/Documents/CDAO/fh-org/astra-a1/audit/lifecycle/regressions.test.mjs) include exact fixes and substitution limits. The proofs produce 17 expected failures across these seven defects; two harness controls pass. Compilation passes. Selected existing tests: 42 passed, two blocked by sandbox restrictions.

Could not run native `ps` discovery, `sandbox-exec` verification, Chrome journeys, Electron GUI restart, native packaging, or the full integrated suite. No live model calls were made.

VERDICT: NOT DONE
