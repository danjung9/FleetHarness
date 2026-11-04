---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Automatic QA at 6228623 on dev/reviewed: failures: unit tests, smoke-electron, smoke-norfolk. Fixture provider only."
---

# Automatic QA at 6228623

[E, automatic run, 18:16 to 18:23 EST] Team tests and GUI smoke scripts outside the agent sandbox, in a throwaway clone with a scratch HOME. Local fixture provider only, so this says nothing about a live model or a real build.

| Step | Exit | Seconds | Counts |
| --- | --- | --- | --- |
| typecheck | 0 | 1 |  |
| electron compile | 0 | 0 |  |
| web build | 0 | 2 |  |
| unit tests | 1 | 97 | tests 125, pass 124, fail 0 |
| harness compile | 0 | 0 |  |
| harness tests | 0 | 2 | tests 51, pass 51, fail 0 |
| smoke-activity | 0 | 13 |  |
| smoke-chatgpt | 0 | 20 |  |
| smoke-electron | 1 | 36 |  |
| smoke-home | 0 | 7 |  |
| smoke-journey | 0 | 22 |  |
| smoke-model-selector | 0 | 6 |  |
| smoke-norfolk | 1 | 13 |  |
| smoke-phases | 0 | 9 |  |
| smoke-quality | 0 | 2 |  |
| smoke-system-design | 0 | 30 |  |

## unit tests

- builds accept optional criteria and hand resources and links to agents

```text
ation during copying cleans the incomplete bundle and preserves earlier exports (28.52775ms)
✔ export destinations inside the workspace are rejected through symlink aliases (108.161292ms)
✔ architecture and component tools are unavailable outside their assigned phases (4.328375ms)
✔ architecture rejects duplicate IDs, missing connection endpoints, unsafe files and excessive diagrams (5.147125ms)
✔ live design progress persists, requires source, and never changes verification hashes (347.7565ms)
✔ cancelled stages cannot publish and symlinked sources cannot claim completion (41.354583ms)
✔ cancellation at process handoff is observed and terminates the child (64.468417ms)
✔ already cancelled verification never launches a process (40.120458ms)
✔ a hanging test produces bounded failure evidence and is killed (207.358625ms)
✔ unbounded test output cannot hold the runner or count as success (784.414333ms)
✔ source mutation during verification blocks review even when tests pass (699.433625ms)
✔ spawn errors settle with a useful failure (8.565166ms)
✔ toolkit checks and empty files cannot replace application tests (6.368334ms)
✔ test filenames containing spaces are passed as single paths (910.449167ms)
ℹ tests 125
ℹ suites 0
ℹ pass 124
ℹ fail 0
ℹ cancelled 1
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 96744.320667

✖ failing tests:

test at tests/pi-backend.test.mjs:82:1
✖ builds accept optional criteria and hand resources and links to agents (10493.145625ms)
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
