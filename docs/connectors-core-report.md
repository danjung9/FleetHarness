# Connector integration handoff

Implemented the real screen-to-adapter flow: browser sign-in, displayed codes, plain questions with secret fields, cancellation, choose, real fetch, sanitize, preview and Use this. Connection metadata survives restart without exposing credentials. Disconnect removes metadata, encrypted secrets and snapshots. All seven cards still work with samples and no setup. Missing account registration shows the administrator message. The data-service card accepts an address or documentation link. The adapter interface is unchanged.

The desktop host registers the merged account and service adapters with explicit host configuration. Microsoft registrations remain separate per cloud. Provider errors are restricted to their public messages. Account replacement finishes revocation before the next sign-in. Quit waits for pending connection work and writes while retaining the existing build and delivery shutdown path.

Fixed the no-connector checkpoint mismatch by omitting connectedContextHash entirely when no data is selected. Such builds skip connector preparation and context checks. The existing repair-history test now also explicitly asserts the field is absent. The Codex functional fixture gets the same 60-second outer scheduling allowance as other functional tests; every result assertion and production deadline is unchanged. The native timeout closure still needs the overseer's rerun.

Portion matching is case-sensitive. The regression test passes file(s), (c) 2024 and other ordinary lowercase parentheses alongside the existing synthetic banner and still requires exactly one excluded item.

The smoke script now drives sample cards, a real data-service adapter with an ephemeral fake key, Google and Microsoft sign-in against local fake servers, cancellation, real Electron restart, token refresh, native encrypted storage, a fixture-model build and disconnect. It checks the exact workspace context and scans saved state, logs and workspace for distinctive fake credentials. It does not print those values or read any file named auth.json. The fake endpoint seam requires an unpackaged app, NODE_ENV=test and APPYARD_CONNECTOR_TEST_MODE=1. A packaged app ignores it, including malformed endpoint configuration; the core test proves that branch. Saved settings cannot enable it.

The event's synthetic build boundary remains enforced. Real previews can be saved locally but cannot enter an event build. The explicitly configured local fixture servers supply synthetic records through real adapters so the smoke can exercise that full path without a real account or live model call. Real provider registration and tenant access remain unproven.

## Observed checks in this batch

| Check | Result |
| --- | --- |
| Frontend TypeScript, direct tsc --noEmit | Passed |
| Electron TypeScript, direct tsc -p electron/tsconfig.json | Passed |
| Harness TypeScript, direct tsc -p harness/tsconfig.json --noEmit | Passed |
| Vite production build | Passed; existing bundle-size advisory |
| tests/connectors-core.test.mjs | 26 passed, zero failed or skipped |
| tests/connectors-accounts.test.mjs and tests/connectors-data-service.test.mjs | 95 passed, zero failed or skipped |
| Reported Pi combined prerequisite regression | 1 passed, including strict saved-checkpoint equality and the added absent-field assertion |
| Reported Codex functional test | Failed here: sandbox-exec denied startup; native process cleanup could not be confirmed |
| scripts/smoke-connectors.mjs syntax | Passed |
| git diff --check | Passed |

The Codex failure was an actual attempted run, not a passing result: it reported sandbox_apply: Operation not permitted and failed the unchanged expected-review assertion. Native Electron smoke, Chrome, system-browser sign-in, safeStorage, ps, sandbox-exec success and the full suite could not be verified in this sandbox. The overseer must run them outside it. No real account, external data service or live model was called.

Core integration tests use production adapters, actual local HTTP, real authorization callbacks, token refresh, filesystem and sanitization. They replace native safeStorage with authenticated Node encryption and the OS browser opener with local HTTP navigation. They are not proof of those replaced production boundaries. The Pi regression uses the existing injected process scanner and synthetic orchestration fixture, so it proves checkpoint persistence, not native process cleanup.

No result assertion was removed or relaxed. The IPC assertion now requires exactly eight named routes, reflecting the added connect/progress/answer contract. The smoke now requires enabled Connect buttons under its explicit fake-provider configuration instead of the old disabled-account behavior. Its existing sample, build, context, native encryption and removal assertions remain, with additional sign-in, restart, refresh and leak assertions.

## Every existing frontend line changed

No existing rail or brief hook changed in this batch. No line changed in src/App.tsx, studio/, index.html or teammate-owned styles. Only the two core-owned files changed. The exact old and new lines, including all removed text, are in [connectors-frontend-lines.md](connectors-frontend-lines.md).

| File | Current changed or added lines |
| --- | --- |
| src/Connectors.tsx | 1-2, 7-11, 38-41, 43-72, 76-79, 82-87, 90-91, 96-100, 102, 104, 107-108, 110-119, 122, 124-125, 128, 149 |
| src/connectors.css | 26-29 |

All changes remain in the working tree. No commit, repository metadata write, push or sibling-clone edit was made. The local session record in Sprint/connectors-core.md records the tool use and guard friction because vault writes and its helper are denied.

COMMIT: Wire real connector flows and fix empty connector checkpoints
