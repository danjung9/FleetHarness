---
type: research
status: blocked
owner: mukul
updated: 2026-11-04
summary: "Three interface builds pass at 50fcaea; local fixture and GUI execution are blocked by the sandbox's loopback-listen restriction."
---

# QA results at 50fcaea

## Bottom line

[E] Type checking, Electron compilation and all three interface production builds pass in the dedicated QA checkout. [E] The first local fixture could not start; a minimal diagnostic confirmed the sandbox rejects binding `127.0.0.1` with `EPERM`. [E] GUI smoke tests were not reached, and no live provider, sign-in, installation or executable packaging was attempted. [R] Keep GUI acceptance blocked and retain the runner's seven separate verification/export failures as open defects. [R] A successful build is useful evidence but does not establish a working officer application.

## Boundary and provenance

- [E] Checkout: `~/Documents/CDAO/fh-org/qa-lead`, detached at `50fcaea1e86028503ae66bd2f17287093ad30cbe`. Git status was clean before and after the recorded build/fixture attempt. The moving `fh-org/qa` was not used for execution.
- [E, conversation] After reviewing the concrete fixture-only proposal in [[Research/QA/Test-Plan]], the user directed this session to continue. Execution was limited to that proposed local batch. No sandbox elevation was requested or attempted.
- [E] Runtime reports Node `v26.0.0`; builds report Vite `8.3.5`. Dependencies and the existing Electron binary were already present. No dependency installation was needed or performed.
- [E] All commands below ran from `qa-lead`. Clean-environment commands supplied only PATH and TMPDIR. No credential values were read, entered or printed.

## Direct results

| Check | Observed result [E] | Status |
| --- | --- | --- |
| `git rev-parse HEAD` and `git status --short` | Expected full commit; no tracked or untracked changes reported | PASS |
| `test -x node_modules/electron/dist/Electron.app/Contents/MacOS/Electron` | Existing binary is executable | PASS, availability only |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0 | PASS |
| `node node_modules/typescript/bin/tsc -p electron/tsconfig.json` | Exit 0 | PASS |
| `env -i PATH="$PATH" TMPDIR=/private/tmp node node_modules/vite/bin/vite.js build` | Exit 0; original interface bundle written to `dist/` | PASS |
| Same Vite command with `--config vite.studio.config.ts` | Exit 0; Studio bundle written to `dist-studio/` | PASS |
| Same Vite command with `--config vite.workbench.config.ts` | Exit 0; Workbench bundle written to `dist-workbench/` | PASS |
| `env -i PATH="$PATH" TMPDIR=/private/tmp node scripts/smoke-phases.mjs` | Exit 13; unsettled top-level await at `startFixtureProvider()` on line 9 | BLOCKED before phase execution |
| Minimal loopback-listen diagnostic | Exit 1; error code `EPERM`, operation `listen`, address `127.0.0.1` | BLOCKED by environment |
| Original desktop, Studio, system-design, activity and Workbench smoke scripts | Not started after the shared local-server prerequisite failed | BLOCKED, not failed application assertions |
| Manual app journeys, live M/S/O/C generation, login and standalone packaging | Not run | NOT RUN |

[E] Exact minimal diagnostic, run once to distinguish the environment failure from a product assertion:

```sh
env -i PATH="$PATH" TMPDIR=/private/tmp node --input-type=module -e 'import {createServer} from "node:http"; const server=createServer(); server.on("error", error => { console.log(JSON.stringify({event:"loopback-listen-error",code:error.code,message:error.message})); process.exitCode=1; }); server.listen(0,"127.0.0.1",() => { console.log(JSON.stringify({event:"loopback-listening"})); server.close(); });'
```

```text
{"event":"loopback-listen-error","code":"EPERM","message":"listen EPERM: operation not permitted 127.0.0.1"}
```

[E, script inspection] `scripts/mock-provider.mjs` waits for `server.listen(0, '127.0.0.1', ...)`. The phase smoke creates a temporary root before awaiting that provider and enters its cleanup block only afterward. [A] A startup failure may leave an empty synthetic temporary directory; the failed run did not expose its exact path, so no guessed directory was deleted. [R] Improve fixture startup error propagation and place cleanup around provider initialization in a future test-harness change.

## Other QA evidence, attributed separately

- [E, main runner report read] The standard gate reports 128 passed, zero failed at this revision. It is not an additional test run by this assignment.
- [E, [[Research/QA/Runner/Harness-Coverage]]] The expanded runner scenarios report 403/410 passing and seven failing verification/export expectations. Those failures remain open. Do not combine overlapping baseline counts or summarize the product as all tests passing.
- [E] [[Research/QA/Static-Findings]] contains nine baseline source findings and six new-revision risks/coverage gaps. All runtime reproductions in that note remain unverified unless another explicitly cited report supplies them.
- [E] [[Research/QA/Officer/README]] maps its three golden-example notes to the main acceptance matrix. No generated app has been accepted against those examples here.

## Next permitted work

[R] Keep the source checkout pinned and preserve these results. Continue source review and coordination on the already identified defects. A different execution boundary must be explicitly authorized and permitted by the environment before attempting blocked GUI work; do not retry through another tool or agent to evade this sandbox restriction. Live-model generation also still requires the owner-configured event connection and its separate execution scope. No additional user approval is needed merely to read fixes, review evidence or update this report.

## Sources

- [E] Direct command output from the dedicated QA checkout on November 4, 2026.
- [E] Pinned source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe
- [E] [[Research/QA/Test-Plan]], [[Research/QA/Static-Findings]], [[Research/QA/Runner/Harness-Coverage]], [[Research/QA/Officer/README]].
