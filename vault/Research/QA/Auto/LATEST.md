---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Automatic QA at 0da7ce9 on dev/reviewed: failures: unit tests, smoke-electron, smoke-norfolk. Fixture provider only."
---

# Automatic QA at 0da7ce9

[E, automatic run, 17:26 to 17:33 EST] Team tests and GUI smoke scripts outside the agent sandbox, in a throwaway clone with a scratch HOME. Local fixture provider only, so this says nothing about a live model or a real build.

| Step | Exit | Seconds | Counts |
| --- | --- | --- | --- |
| typecheck | 0 | 1 |  |
| electron compile | 0 | 0 |  |
| web build | 0 | 2 |  |
| unit tests | 1 | 96 | tests 125, pass 124, fail 0 |
| harness compile | 0 | 1 |  |
| harness tests | 0 | 3 | tests 51, pass 51, fail 0 |
| smoke-activity | 0 | 14 |  |
| smoke-chatgpt | 0 | 16 |  |
| smoke-electron | 1 | 36 |  |
| smoke-home | 0 | 6 |  |
| smoke-journey | 0 | 19 |  |
| smoke-model-selector | 0 | 10 |  |
| smoke-norfolk | 1 | 16 |  |
| smoke-phases | 0 | 13 |  |
| smoke-quality | 0 | 3 |  |
| smoke-system-design | 0 | 35 |  |

## unit tests

- independent test failure gets exactly one repair and advances after re-verification

```text
pying cleans the incomplete bundle and preserves earlier exports (36.898792ms)
✔ export destinations inside the workspace are rejected through symlink aliases (79.790042ms)
✔ architecture and component tools are unavailable outside their assigned phases (2.815167ms)
✔ architecture rejects duplicate IDs, missing connection endpoints, unsafe files and excessive diagrams (1.401583ms)
✔ live design progress persists, requires source, and never changes verification hashes (100.626208ms)
✔ cancelled stages cannot publish and symlinked sources cannot claim completion (32.245375ms)
✔ cancellation at process handoff is observed and terminates the child (53.864667ms)
✔ already cancelled verification never launches a process (4.332375ms)
✔ a hanging test produces bounded failure evidence and is killed (164.778667ms)
✔ unbounded test output cannot hold the runner or count as success (322.525875ms)
✔ source mutation during verification blocks review even when tests pass (345.022333ms)
✔ spawn errors settle with a useful failure (14.761125ms)
✔ toolkit checks and empty files cannot replace application tests (20.901708ms)
✔ test filenames containing spaces are passed as single paths (535.830958ms)
ℹ tests 125
ℹ suites 0
ℹ pass 124
ℹ fail 0
ℹ cancelled 1
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 95656.1785

✖ failing tests:

test at tests/pi-backend.test.mjs:183:3
✖ independent test failure gets exactly one repair and advances after re-verification (10227.107125ms)
  'test timed out after 10000ms'

```

## smoke-electron


```text
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Norfolk catalog · 34' })

    at ~/Documents/CDAO/fh-org/qa-auto/scripts/smoke-electron.mjs:34:64 {
  log: [
    "  - waiting for getByRole('button', { name: 'Norfolk catalog · 34' })"
  ],
  name: 'TimeoutError'
}

Node.js v26.0.0

```

## smoke-norfolk


```text
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

locator.waitFor: Timeout 10000ms exceeded.
Call log:
  - waiting for getByRole('heading', { name: 'Build flow', exact: true }) to be visible

    at ~/Documents/CDAO/fh-org/qa-auto/scripts/smoke-norfolk.mjs:45:66 {
  log: [
    "  - waiting for getByRole('heading', { name: 'Build flow', exact: true }) to be visible"
  ],
  name: 'TimeoutError'
}

Node.js v26.0.0

```
