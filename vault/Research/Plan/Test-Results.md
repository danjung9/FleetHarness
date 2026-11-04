---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Results of running the mvp branch test suites from a clean install, at commits f72c5dc and 0f175a8."
---

# Test results for mvp

## Update: commit 0f175a8, the latest on mvp

- [E] Clean copy on this Mac, Node v26.0.0, `npm ci` with install scripts.
- [E] `npm test`: exits 0, 78 of 78 pass. The compile step now succeeds.
- [E] `npm run test:harness`: exits 0, 39 of 39 pass.
- [E] `npx tsc --noEmit` at the root: exits 0, no errors.
- [E] All five type errors reported below are fixed at this commit.
- [E] `npm run test:desktop`: not finished when this was written. It was waiting on the Electron binary download.
- These are unit and integration tests with fake or scripted providers. No real model run, full challenge build or generated app has been exercised.

The rest of this note records the earlier commit f72c5dc.

## Bottom line

From a clean install, `npm test` stops at its compile step, so as committed it runs no tests. When the compile step is skipped, all 100 tests pass. These are unit and integration tests: no real model run, no packaged app and no smoke test was exercised here. The type errors may behave differently on the author's machine, so the first step is for them to confirm.

## How it was run

- [E] Clean copy of commit f72c5dc on this Mac, Node v26.0.0, using `npm ci --ignore-scripts`. The README asks for Node 22.19 or later. The Electron binary was not downloaded.
- Install scripts were skipped, so any test that needs the Electron binary or a native step was not exercised.

## Results

| Command | Result | Evidence |
| --- | --- | --- |
| `npm test` as committed | Fails before any test runs | [E] `tsc -p electron/tsconfig.json` exits 2 with 3 errors, and the script stops there because it uses `&&` |
| `node --test tests/*.test.mjs` after that compile, which still writes output | 62 of 62 pass | [E] |
| `npm run harness:build`, then `node --test dist-harness/tests/harness*.test.js` | Builds cleanly, 38 of 38 pass | [E] |
| `npx tsc --noEmit` at the root | Fails with 2 errors | [E] `src/api.ts` line 17 and `src/studio/api.ts` line 20 |

## The errors

- [E] `electron/codex-rpc.ts` line 40: deleting `OPENAI_API_KEY`, `CODEX_API_KEY` and `OPENAI_BASE_URL` from an object typed as having only `CODEX_HOME`.
- [E] `src/api.ts` line 17 and `src/studio/api.ts` line 20: the fallback API object does not match the `FleetAPI` type.
- [A] Because `npm run build` begins with `tsc &&`, the root errors should also stop `npm run build`, and so `npm run dist`. This was not run.

## Not exercised

`npm run test:desktop`, `npm run test:activity`, `npm run test:studio`, the packaged app, any real model session and any full build of a challenge.

## Next

[R] Ask danjung9 whether these errors reproduce on their machine. Then fix them first, so `npm test` is a real gate.
