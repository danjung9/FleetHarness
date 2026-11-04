---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Automatic QA at acee4fa on dev/reviewed: failures: smoke-electron, smoke-norfolk. Fixture provider only."
---

# Automatic QA at acee4fa

[E, automatic run, 17:56 to 18:02 EST] Team tests and GUI smoke scripts outside the agent sandbox, in a throwaway clone with a scratch HOME. Local fixture provider only, so this says nothing about a live model or a real build.

| Step | Exit | Seconds | Counts |
| --- | --- | --- | --- |
| typecheck | 0 | 1 |  |
| electron compile | 0 | 0 |  |
| web build | 0 | 2 |  |
| unit tests | 0 | 67 | tests 125, pass 125, fail 0 |
| harness compile | 0 | 0 |  |
| harness tests | 0 | 2 | tests 51, pass 51, fail 0 |
| smoke-activity | 0 | 14 |  |
| smoke-chatgpt | 0 | 13 |  |
| smoke-electron | 1 | 33 |  |
| smoke-home | 0 | 3 |  |
| smoke-journey | 0 | 14 |  |
| smoke-model-selector | 0 | 6 |  |
| smoke-norfolk | 1 | 13 |  |
| smoke-phases | 0 | 5 |  |
| smoke-quality | 0 | 2 |  |
| smoke-system-design | 0 | 29 |  |

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
