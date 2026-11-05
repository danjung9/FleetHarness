---
type: qa-review
status: complete
owner: mukul
updated: 2026-11-05
summary: "Independent receipt review passes the unchanged detached Pi Stop case at clean 16a6940; broader shutdown paths remain outside this result."
---

# Detached Pi Stop at 16a6940

[E, independently reviewed November 5] **STOP-DETACHED-01 passes at clean 16a6940.** [Receipt 6b784ff0](stop-detached-6b784ff0-7732-4894-beec-6314ba3d6a5d/result.json) ran 01:04:42 to 01:05:02 EST using the unchanged script digest below. This closes the original bounded Pi shell, parent and detached-child reproduction on this revision. The earlier d0f4c69 failure remains valid historical evidence.

| Independent receipt check | Result |
| --- | --- |
| Before Stop | Shell 42055 and child 42064 are distinct session/group leaders; parent 42056 shares the shell group. All three are live and owned. Both worker heartbeats were advancing. |
| Observation | All three PIDs absent at both endpoints. Parent count stays 9 and child count stays 11 across 8.003 seconds, after a 2.001-second settling period. |
| App/provider | Stopped at both endpoints; provider requests remain one. All seven unchanged checks pass. |
| Watchdog exclusion | Observation ends 49.110 seconds before the independent worker deadline. No worker self-exit record is present. |
| Cleanup separation | PASS is recorded 46 ms before cleanup begins. Cleanup also passes, with no fallback signals recorded. |
| Identity and bytes | Full commit/tree and clean tracked source match. Script digest matches; all seven control-file hashes match. All shared observation.json fields equal result.json. Retained 59 frontend and 49 backend artifact hashes match the executed manifests. |

[E] The 643 ms value is the post-click stopped-status observation, not exact process termination latency. The dedicated GUI checkout currently matches the receipt's clean full HEAD. Main, the runtime owner, reports the matching rebuild; retained compiled sweep code contains the corrected -U flag. Artifact equality is established, while full dependency/build reproducibility is not separately claimed.

[R] Stop this bounded fixture investigation and proceed to acceptance of the combined application, as directed by main. The source review and preparation record below are historical; they do not override the measured PASS above. Codex, Quit, crash recovery, Windows and general containment remain separate scopes.

[E, historical preparation before the receipt above] The macOS option defect was corrected in source; native Stop was then pending. Commit f5fec32 switches user selection to -U, which works with the existing legacy option mode. Later integrated changes retry inconclusive inspection, reset the consecutive-empty count after errors, and persist per-run cleanup state. The native marked/unmarked-worker test is present. [[Research/QA/Auto/Review-16a6940]] explains why the available automatic reports cannot establish that test ran on this source.

[E, exact Git source] The target is 16a694080508ebae19384f05fda8279b5a5feb96, tree 1ca33b56fb6ca9f799fa40dc4166c9a1dc6342f6, currently available locally as origin/mvp and origin/dev/reviewed. The QA clone remains untouched at 631849f. Source availability does not authorize advancing any other session's active checkout.

[E] [qa-stop-detached.mjs](qa-stop-detached.mjs) changes only the commit and checkout path from the prepared 0da7ce9 fixture. All workers, UI selectors, seven shutdown checks, timing, identity checks, watchdog exclusions and separate cleanup remain unchanged. Relevant Home, model settings, journey header and build-view source files are unchanged between those pins. The real Stop control remains Stop build in the Challenge journey region.

[E] Main-script syntax, both generated-worker syntax checks and all existing pure controls pass. Script SHA-256: `53f5cd33f3f92150054920527a1cf076517b4237612377050bf18cfeeb22f765`. Generated child and parent hashes remain `55542fe28668e0d865f4e8abfb54db4b74941ab6d2ae746ef5158cd9b1565fe8` and `545e9e52c6a3a20cc1bd5cc2b1251c532892996395af61d73f56c9a4ae84b788`. No native process inspection, app, server or worker ran during preparation.

## Runtime handoff

[R] The existing runtime owner should prepare a separate clean `fh-org/gui-16a6940` checkout and retain the actual full HEAD, tree and clean tracked status. Rebuild frontend and Electron outputs with existing dependencies and record each exit code. Stop on any preparation failure. The fixture records executed artifact digests but relies on that separate matching build receipt for source derivation.

```sh
cd ~/Documents/CDAO/fh-org/gui-16a6940
node node_modules/typescript/bin/tsc
node node_modules/vite/bin/vite.js build
node node_modules/typescript/bin/tsc -p electron/tsconfig.json
```

[R] After all three commands succeed on the verified pin, the exact independent check is:

```sh
node ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-16a6940/qa-stop-detached.mjs ~/Documents/CDAO/fh-org/gui-16a6940 ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-16a6940
```

[E/R] Preserve the existing isolated app environment and synthetic provider. No login or real model call is needed. A denied native operation is an execution blocker, not a reason to bypass restrictions. Return the build receipt, result.json, observation.json and retained control evidence. A driver stopped line is not owned-process evidence.

## Unchanged acceptance

[R] Require live, identified shell and parent plus a separately detached child before the click, with advancing heartbeats. After the actual Stop click, all three PIDs must be absent at both observation endpoints, both heartbeats stable, no new provider requests, and stopped status maintained. Keep the two-second settling period, eight-second observation and ten-second stopped-state deadline. The verdict must precede cleanup and worker watchdogs; cleanup must independently pass.

[E/A] Product inspection now permits longer individual scans and retries. Those changes do not alter the independent timing expectations. A slow or inconclusive receipt must retain its actual result. The configured sweep budget is not itself a measured maximum shutdown time.

[R] Close only the bounded Pi detached-child case after independently checking identities, timing, all seven checks, control-file digests and observation/final agreement. Codex, Quit, crash recovery, Windows, marker removal and broader containment require separate evidence. Existing detailed semantics and the original failure remain in [[Research/QA/GUI-d0f4c69/Detached-Stop-Runbook]].
