---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Fixture-only GUI run at 631849f: all six team smoke scripts pass, and U1, U2 and U3 reproduce in the running app. No live model was used."
---

# GUI results at 631849f

## Bottom line

[E] All six team smoke scripts pass at `631849f` on the local fixture provider. [E] Findings U1, U2 and U3 reproduce in the running app. [E] Stop worked in the one case measured, with one model request in flight. [R] This covers app plumbing only. No live model ran, so no real build, generated app or user benefit is established by this note.

## How it ran

- [E] Throwaway clone at `~/Documents/CDAO/fh-org/gui-631849f`, detached at `631849f`, remote removed, dependencies copied from `fh-org/qa-lead` with matching lock files.
- [E] Run outside the Codex chat's sandbox, which blocks loopback listening. Every command ran under `env -i` with PATH, LANG, a scratch HOME and a scratch TMPDIR. No key, sign-in or installer was used. A scratch HOME limits accidental access; it is not an OS sandbox.
- [E] `smoke-chatgpt` starts and cancels a real Codex login flow under the scratch HOME with browser opening intercepted, as its report states. No sign-in completed.
- [E] Raw logs are in `~/Documents/CDAO/fh-org/gui-results`. Screenshots and the U1 to U3 record are in `Research/QA/GUI-631849f/`.

## Team scripts

| Command | Exit | What its report says [E] |
| --- | --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | 0 | Clean |
| `node node_modules/vite/bin/vite.js build` | 0 | Bundle written |
| `node node_modules/typescript/bin/tsc -p electron/tsconfig.json` | 0 | Clean |
| `node scripts/smoke-phases.mjs` | 0 | Five phases, exact tool selection, repair, one passing app test |
| `node scripts/smoke-home.mjs` | 0 | Home default, search and filters, catalog to brief to build, resume, persistence, no renderer errors |
| `node scripts/smoke-electron.mjs` | 0 | 18 requests, repair loop, review and export, persistence, preview isolation, stale evidence blocked, cancellation, missing credentials blocked |
| `node scripts/smoke-system-design.mjs` | 0 | Planning, live progress, repair, source references, stale design cleared, interrupted states |
| `node scripts/smoke-activity.mjs` | 0 | Paired tools, filters, keyboard, raw records, live scroll, interrupted run, long paths, safe text, empty state |
| `node scripts/smoke-chatgpt.mjs` | 0 | Login started and cancelled, authenticated renderer fixture, no renderer errors |

[E] These scripts assert what they were written to assert, on a canned provider. The seven runner failures in [[Research/QA/Acceptance-Reconcile-631849f]] remain open and are not touched by this run.

## Added checks, script `scripts/qa-u123.mjs` in the throwaway copy

| Case | Observed [E] | Result |
| --- | --- | --- |
| U1, search by visible title | Query `Message to mission timeline` returns 0 cards and shows No matching challenges, although a card with that exact heading is on screen | Reproduced |
| U2, Stop from Home | During a running fixture build Home has 0 Stop buttons. The same is true after reload, with the build still running. The only sign on Home is a small dot on the Agents rail item. Route to Stop: My builds, open the build, Stop run | Reproduced |
| U3, accessible name | Visible heading `Message to mission timeline`; accessible name `Start a brief: Electronic OPTASK (Operational Tasking) Message Parser & Timeline Visualizer`, which does not contain the heading | Reproduced |
| Consent before build | Dialog appears before Run Pi agents. It says agents can edit files and execute shell commands on this Mac, that the project folder is not an OS sandbox, that the provider receives the brief and tool context, and that charges may apply | Present through this path |
| Engine radios | Two radios: Codex ChatGPT subscription, checked by default; Pi Model providers | Observed |
| Stop | Status reached stopped in 3 ms after the click. One request had been made; none followed in the next 8 seconds | Pass for this case only |

[A] The Stop result does not cover a running agent shell command or child process, because the fixture run was stopped during its first model request. The earlier finding that Stop may not fully stop stays open until that case is measured.

## Next

- [R] Frontend cases U1, U2 and U3 go to Dan as reports. They are his files.
- [R] Measure Stop while an agent shell command with a child process is running.
- [R] A live build is a separate stage, recorded separately.
