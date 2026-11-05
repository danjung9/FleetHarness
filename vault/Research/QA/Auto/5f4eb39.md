---
type: research
status: active
owner: mukul
updated: 2026-11-05
summary: "Automatic QA at 5f4eb39 on dev/reviewed: failures: unit tests, smoke-electron. Fixture provider only."
---

# Automatic QA at 5f4eb39

[E, automatic run, 03:39 to 03:53 EST] Team tests and GUI smoke scripts outside the agent sandbox, in a throwaway clone with a scratch HOME. Local fixture provider only, so this says nothing about a live model or a real build.

| Step | Exit | Seconds | Counts |
| --- | --- | --- | --- |
| typecheck | 0 | 1 |  |
| electron compile | 0 | 0 |  |
| web build | 0 | 1 |  |
| unit tests | 1 | 586 | tests 971, pass 964, fail 6 |
| harness compile | 0 | 0 |  |
| harness tests | 0 | 2 | tests 94, pass 94, fail 0 |
| smoke-activity | 0 | 13 |  |
| smoke-brief-data | 0 | 27 |  |
| smoke-chatgpt | 0 | 4 |  |
| smoke-connectors | 0 | 16 |  |
| smoke-conversation | 0 | 20 |  |
| smoke-electron | 1 | 43 |  |
| smoke-home | 0 | 2 |  |
| smoke-journey | 0 | 45 |  |
| smoke-model-selector | 0 | 5 |  |
| smoke-norfolk | 0 | 3 |  |
| smoke-phases | 0 | 11 |  |
| smoke-quality | 0 | 3 |  |
| smoke-resume | 0 | 2 |  |
| smoke-system-design | 0 | 63 |  |
| smoke-visual-review | 0 | 4 |  |

## unit tests

- combined prerequisite: an unconfirmed verifier shutdown blocks retry and persisted resume
- local cache lookup uses the exact release filename under the mirror hash
- missing local runtime and failed download return one actionable sentence
- passing core tests cannot hide a wrong rendered result
- real packager produces an offline zip from development runtime
- real packager produces an offline zip from distributed resources
- review regression: timeout retry waits for the old prompt and abort before verifying actual files

```text
ext":"Starting Pi build agent. Skills: fleet-workflows, fleet-offline, fleet-ux, fleet-evidence, fleet-delivery, ponytail, impeccable. Global tools: read, write, edit, bash, fleet_helpers, fleet_run_helper. Phase tools: fleet_reconcile_records, fleet_search_evidence, fleet_component_progress, fleet_browser, fleet_visual_review."},{"id":"55886bbf-8590-44ff-9e27-d5071daffba1","time":"2026-11-05T08:40:57.614Z","stage":"build","kind":"error","text":"Error: Pi build agent made no progress for 0.1 seconds while checking stage artifacts. Inspect the saved activity and start a new run.\n    at fail (file://~/Documents/CDAO/fh-org/qa-auto/dist-electron/electron/agent-runner.js:53:19)\n    at Timeout.<anonymous> (file://~/Documents/CDAO/fh-org/qa-auto/dist-electron/electron/agent-runner.js:61:38)\n    at listOnTimeout (node:internal/timers:605:17)\n    at process.processTimers (node:internal/timers:541:7)"}]}
  
  'failed' !== 'review'
  
      at Object.assertSettled (file://~/Documents/CDAO/fh-org/qa-auto/tests/pi-backend.test.mjs:165:12)
      at TestContext.<anonymous> (file://~/Documents/CDAO/fh-org/qa-auto/tests/pi-backend.test.mjs:496:55)
      at async Test.run (node:internal/test_runner/test:1208:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:831:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 'failed',
    expected: 'review',
    operator: 'strictEqual',
    diff: 'simple'
  }

```

## smoke-electron


```text
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('iframe[title="Generated application preview"]').contentFrame().getByRole('button', { name: 'Parse message' })

    at ~/Documents/CDAO/fh-org/qa-auto/scripts/smoke-electron.mjs:78:58 {
  log: [
    `  - waiting for locator('iframe[title="Generated application preview"]').contentFrame().getByRole('button', { name: 'Parse message' })`
  ],
  name: 'TimeoutError'
}

Node.js v26.0.0

```
