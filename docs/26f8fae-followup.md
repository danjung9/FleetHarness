# Native failures and audit follow-up

Changes follow the overseer's native receipt for 26f8fae: 756/768 unit tests, nine failures, three cancellations, and 94/94 harness tests. The native suite has not been rerun in this sandbox.

## Fixes

- Process cleanup retains observed PID/start identities even if a browser clears its environment or becomes a zombie. macOS snapshots now include parent PIDs, so browser descendants without their own marker are discovered through an owned parent. Children are stopped before parents, allowing reaping. Zombies must disappear before cleanup is confirmed. Concurrent rechecks share an in-flight native snapshot instead of launching three complete ps scans per renderer. Ownership and start identity are still checked before signals; no process groups or unverified saved PIDs are signalled. The default cleanup grace is now one second with a further ten-second kill/settlement window, previously 0.4 plus five seconds. Native closure of the two browser-helper failures remains for the overseer.
- Browser startup no longer inherits the test fixture's 1.5-second interaction deadline. Production startup has a shared 30-second budget. Production interactions now default to ten seconds, previously five; observations have a separate ten-second default, previously capped at two seconds for DOM inspection and three for screenshots. Existing cancellation and overall deadlines remain.
- The two CLI workflows used a browser brief, removed its journeys and retained a primary deferral pointing at parse-task. That fails frozen-contract validation. For Codex, the failed session then triggers its conservative writer-shutdown refusal. Both now use a CLI-specific synthetic brief and the same CLI fixture builder, mapping every implemented explicit and prose obligation to the required capability. Recipe deferrals remain unverified. A new contract test exercises the actual shared fixture through production parsing. Browser deferral coverage is unchanged.
- The unconfirmed-verifier test previously launched multiple real browser reviews before reaching its withheld close receipt. It now uses the explicit synthetic browser fixture and skips the unrelated core evaluation. The actual verifier process, missing close acknowledgement, unsafe writer state and persisted Resume refusal assertions remain.
- The fake-engine workflow's null exit status came from its spawnSync eight-second timeout. It now uses asynchronous spawn, the test's cancellation signal and a 20-second whole-test deadline, retaining the required zero exit status and every workflow assertion. The complete production-function workflow exits locally in about one second. Manifest reads now run in bounded batches of 16, retaining path, symlink, file-size and regular-file checks and deterministic hashing order. This reduces repeated serial filesystem work for the expanded skill packet.

## Audit closure

Judge publication now advances the verified identity only by the exact bytes of judge.json. Restoring evaluation-plan.json follows the same rule. Both compare against the expected resulting manifest instead of accepting a fresh hash of arbitrary current bytes. Application verification derives its final hash from the same snapshot whose application portion passed its unchanged-source check. After process cleanup and the final atomic report write, the backend checks the verified identity again before creating authoritative evidence. A difference fails the run and leaves approval blocked.

The documented audit interleaving is retained as an actual-module regression: a synthetic core.cjs mutation immediately after the judge file is atomically published must reject, publish no passing report and perform no repair or additional verification. A second regression changes source during final cleanup and requires failed status, unchanged report identity, absent authoritative evidence and refused approval. The original standalone probe under Fleethacker-Work was unreadable under this sandbox profile; its documented reproduction was recreated in the repository.

Preview admission registers a cancellation controller before the first awaited state save. Stop cancels it synchronously. A suspended or superseded startup cannot launch afterward. The new IPC regression holds that save, completes Stop, then releases startup and requires zero runtime starts.

Redaction distinguishes filename keys from credential field names. It preserves token.test.cjs and tests/password.test.cjs hashes and encoded baseline bytes while still redacting configured credential values and ordinary credential fields. New tests cover both redaction and complete save/reload/Resume with those original test files.

## Test changes and limits

No existing assertion was weakened or deleted. No execution sandbox was reintroduced. Every existing native test remains.

| Test change | Reason |
| --- | --- |
| Codex browser/CLI workflow outer deadline: 30 to 90 seconds | Full visual review now adds repeated browser startup and capture work; production startup and manifest handling were also fixed. |
| Pi SDK successful workflow outer deadline: 45 to 90 seconds; fixture stage idle/total: 10/20 to 30/60 seconds | The positive workflow includes a 503 retry, real file tools, build/verify/repair visual loops and independent checks. Explicit stalled-provider watchdog tests retain their short limits. Production stage deadlines are unchanged. |
| Fake-engine child: removed hidden synchronous eight-second kill; whole test 10 to 20 seconds | Preserve cancellation and let the expanded multi-phase filesystem workflow exit normally. Exit status must still equal zero. |
| Runtime malformed-output test: normal invocations 150 to 1,000 ms, outer test 5 to 10 seconds | Cold Node startup on the loaded native host was killed before emitting the expected malformed JSON. The deliberately hung invocation still has 150 ms. Every specific error assertion remains. Production invocation default remains 15 seconds. |
| Unconfirmed-verifier fixture | Explicit synthetic browser and core-check bypass isolate the real verifier shutdown boundary. This is not evidence of native browser/core execution. |
| CLI fixture input | Uses a command-line brief with complete capability mappings rather than dangling browser evidence. All workflow assertions remain. |
| Plain-error inventory | Reviewed new identity-change diagnostics, added a plain changed-source mapping, and refreshed source signatures. Coverage checks remain intact. |

Additional regressions cover markerless browser descendants, unreaped zombies, child-before-parent shutdown, startup versus interaction budgets, evidence publication, final cleanup, preview cancellation and credential-like baseline filenames. No frontend lines changed.

## Results observed here

All three requested type checks passed:

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p electron/tsconfig.json
node node_modules/typescript/bin/tsc -p harness/tsconfig.json
```

196 selected tests passed:

| Selection | Passed | Receipt |
| --- | ---: | --- |
| Process sweep and both engine cleanup paths, excluding native discovery/recovery | 22 | .tmp/followup-process-final.log |
| Detached helper server/pipe cleanup | 3 | .tmp/followup-helper-cleanup.log |
| Runnable browser lifecycle/startup checks | 6 | .tmp/followup-browser-final.log |
| Independent judge and secret redaction suites | 44 | .tmp/followup-evidence2.log |
| Lifecycle and approval, excluding native orphan discovery | 27 | .tmp/followup-lifecycle2.log |
| Baseline resume, legacy admission and synthetic visual/evidence gates | 8 | .tmp/followup-backend.log |
| CLI contract and selected quality/approval gates | 8 | .tmp/followup-quality.log |
| Plain errors | 16 | .tmp/followup-plain-final.log |
| Codex credentials/protocol/transport, excluding complete native workflows | 26 | .tmp/followup-codex.log |
| Pi SDK image transport against a local fixture | 1 | .tmp/followup-pi-image.log |
| Direct verifier, excluding clean-package startup | 35 | .tmp/followup-verification.log |

The first redaction-suite run exposed an interaction between final source validation and an untrusted report symlink. Finalization now atomically replaces the report mirror before checking source, and the unchanged canary assertions pass. The first CLI reproduction confirmed the dangling syntheticCoverage journey; its corrected contract passes the new production-parser check.

Native ps, Chrome/Electron, the complete engine workflows and runtime JSON/error cases still require the overseer. Clean-runtime execution refuses clone-local temporary directories with an ancestor node_modules, and other temporary roots are not writable here. Fixtures that replace discovery or rendering do not prove those paths. No full native pass is claimed. No live model calls, Git writes or files outside this clone were used or changed.
