Follow-up to the eight failures reported on the committed integration batch, 2026-11-05. Base HEAD: 48b6429. No Git writes, frontend changes, live model calls or writes outside this clone.

The judge snapshot now includes every file in the validated solution runtime manifest. That includes service entrypoints, public/index.html, package.json, foundation-lock.json, FOUNDATION.md and example data. The prompt directs the judge to the declared runtime instead of requiring a root index.html. The scripted workflow judge reads the same manifest. Regression tests materialize both service foundations and a CLI, read their actual delivered bytes through judge_read, and retain the restrictions on builder context and answer keys.

The developer-state failure was a scratch-directory collision. verifyWorkspace overwrote the clean runtime's TMPDIR with its package directory. The generated test wrote developer-initialized into the reviewed source tree. The source-change check then threw, and verifyApplication retained its initial null-exit-code report. That null did not establish that a process had been killed. Verification now preserves the clean runtime's HOME and temporary directories. A real Node regression verifies successful tests, scratch writes outside the package and unchanged source files.

Unconfirmed verification shutdown was also being caught as an ordinary package failure. That could launch a repair and another verification instead of retaining the unsafe writer checkpoint. VerificationShutdownError now propagates through clean verification. Fault-injection tests cover preparation, verifier execution and runtime closure. Those tests prove propagation, not native process discovery.

Repeated redaction was a substantial synchronous cost in the workflow. Each object key and string leaf rescanned the entire process environment and rebuilt credential encodings. A single synchronous document traversal now shares one credential snapshot and its encodings. Subsequent saves discover newly configured keys; previously registered keys remain redacted. Credential and header handling stays covered by the original assertions.

Measured locally with synthetic data:

- The unchanged fake-engine judge workflow completed in 2,306 ms before this change and 858 ms afterward. A later focused run completed it in 891 ms. Its eight-second subprocess deadline remains unchanged.
- Four concurrent copies of the original workflow completed in 3,070 to 3,160 ms each, with normal exits. This did not reproduce an indefinite wait.
- Three redactions of a synthetic report took 830 ms before and 13 ms after, with deep-equal output.
- The browser fixture's empty locked npm install exited normally in 409 ms. This does not establish native browser or process-sweep timing.

Coverage of the reported failures:

| Reported failure | Change and remaining native check |
| --- | --- |
| Codex full workflow timed out | Removed repeated environment scanning from every persisted document. The 15-second test deadline is unchanged. The full Chrome and real-process workflow needs the outside rerun. |
| Browser staging timed out | The outer deadline is now 60 seconds. This fixture performs three separate installs, three confirmed cleanups, a browser pass with its own 20-second deadline, and staging. The former 30-second outer limit did not cover that combined allowance. No production deadline changed. Native timing still needs confirmation. |
| Fake-engine judge child returned null | Its eight-second spawnSync timeout could kill the child. The original test now passes with status zero after the redaction fix, with both repairs and all historical gaps still asserted. |
| Missing verifier close receipt timed out | Fatal shutdown errors now escape the package-report catch and block repair or resume. The ten-second fixture deadline is unchanged. The exact native fixture needs the outside rerun. |
| Service foundation could not reach review | Manifest-based judge inputs and runtime-aware instructions replace the root-index assumption. Both foundation snapshot regressions pass. Browser-to-review integration still needs the outside rerun. |
| Pi SDK workflow timed out | The same redaction hot path affects saved state and session entries throughout this workflow. Its 30-second deadline is unchanged. The exact native workflow needs the outside rerun. |
| Developer setup returned null | Runtime scratch directories are preserved, so temporary initialization no longer changes the source hash. The real Node scratch regression passes. The complete clean-package test needs the outside rerun. |
| Recovered preview package remained | Preview tests now await the close promise before checking process exit and package removal. The previous three-second polling window could expire while the required process sweep was still running. The 15-second outer deadline and all cleanup assertions remain. Native cleanup needs the outside rerun. |

Test adaptations are explicit. The only changed assertion is in tests/executable.test.mjs: the generated response must have no Content-Security-Policy header, replacing the obsolete script-src restriction removed with the product sandbox. All other existing assertions remain. The scripted judge now reads all declared runtime files instead of unconditionally reading index.html. Preview tests await the existing asynchronous cleanup contract, including cancellation during startup. The quality test adds its report to assertion diagnostics. Two plain-error inventory signatures were refreshed after reviewing the verifier environment change and the additional existing Missing judge input guard; mapping and mutation checks still pass.

Observed verification: 76 focused judge, verification, secret-redaction and cleanup tests passed; 16 plain-error tests passed; 10 targeted backend retry, repair and resume tests passed; 84 of 84 harness tests passed. The root noEmit check and both electron and harness TypeScript builds passed. git diff --check passed. There were no dependency-install blockers.

The complete native suite was not run here. This sandbox blocks ps and Chrome. Clean solution-runtime packages also cannot use the writable checkout's temporary directory because its node_modules ancestor is deliberately rejected. No passing injected-scanner or mocked-browser result is offered as proof of those production paths. The overseer must rerun the eight original cases and the full native suite. There are no frontend line changes in this follow-up.
