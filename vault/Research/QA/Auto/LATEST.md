---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Automatic QA at d0f4c69 on dev/reviewed: failures: smoke-activity, smoke-electron, smoke-home, smoke-model-selector, smoke-system-design. Fixture provider only."
---

# Automatic QA at d0f4c69

[E, automatic run, 15:46 to 15:49 EST] Team tests and GUI smoke scripts outside the agent sandbox, in a throwaway clone with a scratch HOME. Local fixture provider only, so this says nothing about a live model or a real build.

| Step | Exit | Seconds | Counts |
| --- | --- | --- | --- |
| typecheck | 0 | 1 |  |
| electron compile | 0 | 0 |  |
| web build | 0 | 1 |  |
| unit tests | 0 | 90 | tests 116, pass 116, fail 0 |
| harness compile | 0 | 0 |  |
| harness tests | 0 | 2 | tests 51, pass 51, fail 0 |
| smoke-activity | 1 | 12 |  |
| smoke-chatgpt | 0 | 15 |  |
| smoke-electron | 1 | 33 |  |
| smoke-home | 1 | 2 |  |
| smoke-model-selector | 1 | 4 |  |
| smoke-norfolk | 0 | 4 |  |
| smoke-phases | 0 | 6 |  |
| smoke-quality | 0 | 2 |  |
| smoke-system-design | 1 | 2 |  |

## smoke-activity


```text
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

locator.waitFor: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.inspector .activity-feed') to be visible

    at ~/Documents/CDAO/fh-org/qa-auto/scripts/smoke-activity.mjs:99:51 {
  log: [
    "  - waiting for locator('.inspector .activity-feed') to be visible"
  ],
  name: 'TimeoutError'
}

Node.js v26.0.0

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

## smoke-home


```text
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

false !== true

    at file://~/Documents/CDAO/fh-org/qa-auto/scripts/smoke-home.mjs:29:10 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v26.0.0

```

## smoke-model-selector


```text
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

locator.click: Error: strict mode violation: getByRole('button', { name: 'Start build', exact: true }) resolved to 2 elements:
    1) <button class="primary">…</button> aka locator('header').getByRole('button', { name: 'Start build' })
    2) <button class="primary">…</button> aka getByRole('complementary', { name: 'Stage details' }).getByRole('button', { name: 'Start build' })

Call log:
  - waiting for getByRole('button', { name: 'Start build', exact: true })

    at ~/Documents/CDAO/fh-org/qa-auto/scripts/smoke-model-selector.mjs:83:72 {
  log: [
    "  - waiting for getByRole('button', { name: 'Start build', exact: true })"
  ]
}

Node.js v26.0.0

```

## smoke-system-design


```text
{
  projects: [
    { status: 'draft', error: undefined, progress: undefined },
    { status: 'draft', error: undefined, progress: undefined },
    { status: 'draft', error: undefined, progress: undefined }
  ],
  snapshots: [ { status: 'draft', progress: undefined, report: undefined } ]
}
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

locator.click: Error: strict mode violation: getByRole('button', { name: 'Start build', exact: true }) resolved to 2 elements:
    1) <button class="primary">…</button> aka locator('header').getByRole('button', { name: 'Start build' })
    2) <button class="primary">…</button> aka getByRole('complementary', { name: 'Stage details' }).getByRole('button', { name: 'Start build' })

Call log:
  - waiting for getByRole('button', { name: 'Start build', exact: true })

    at ~/Documents/CDAO/fh-org/qa-auto/scripts/smoke-system-design.mjs:28:72 {
  log: [
    "  - waiting for getByRole('button', { name: 'Start build', exact: true })"
  ]
}

Node.js v26.0.0

```
