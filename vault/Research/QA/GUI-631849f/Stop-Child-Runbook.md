---
type: test-plan
status: ready
owner: mukul
updated: 2026-11-04
summary: "Bounded synthetic Stop test for a Pi shell command and its child; syntax checked, not executed here."
---

# Stop during a shell command

[E] Main requested this script for its independently authorized throwaway GUI environment. The script is [qa-stop-child.mjs](qa-stop-child.mjs). Only source review and syntax checks of the harness and both generated worker programs have run here. No GUI, fixture server, agent command or worker was started by this preparation.

[R] Run against the existing compiled `631849f638614735a89a555d487d6b3c777c52e3` checkout with its installed dependencies. The script checks the exact commit and clean tracked source, uses the existing Electron binary directly, and does not install, rebuild, change tracked source, sign in, contact a model provider or enter a credential. A local provider uses a synthetic placeholder solely for SDK compatibility. The independent build receipt is [[Research/QA/Results-631849f-GUI]].

```sh
node ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-631849f/qa-stop-child.mjs ~/Documents/CDAO/fh-org/gui-631849f ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-631849f
```

[R] Use only an environment already permitted to launch this application and bind loopback. An EPERM or other environment failure is an ERROR, not a product failure or reason to retry outside a restriction. This script does not confer broader execution approval.

## What it measures

1. [E, script] Configure the synthetic Pi provider through the real settings UI, create the Paperless brief, and confirm Start through Run Pi agents.
2. [E, script] Emit one `bash` call. Verify its advertised schema accepts `command`. The command launches a Node parent and one ordinary, non-detached Node child. Each writes its PID, identity nonce and heartbeat only in a unique temporary control directory. Both must make progress before Stop is clicked.
3. [E, script] Click the actual Stop run button. Record the action start and completion separately. Measure status polling from click completion, allow two seconds to settle, then observe for eight seconds. Require stopped state within ten seconds, no further provider requests, no heartbeat progress during observation, and both worker PIDs absent at its beginning and end.
4. [E, script] Record the verdict before any cleanup marker is created. The workers have a separate 60-second watchdog, and the harness rejects an observation near that deadline. Its own maximum duration is 90 seconds.
5. [E, script] After measurement, create the private cleanup marker, inspect only the recorded worker PIDs and close the Electron process owned by this harness. A five-second close fallback signals only that owned Electron handle. There is no global process kill or change to HOME or CODEX_HOME. A partial startup or unconfirmed cleanup retains the temporary root and cannot return success.

## Receipt and interpretation

[E, script] A unique `stop-child-<nonce>/` directory retains `result.json`, `before-stop.png` and `after-observation.png` when those stages are reached. The JSON includes source commit/tree, tracked-source status, script digest, frontend/backend build-file hashes, Electron binary hash, selected installed package versions/hashes, timestamps, heartbeat counts, owned-PID process states and provider-request metadata. It does not retain request headers, credentials or prompt bodies. Build hashes identify executed bytes; their derivation from source still depends on the independent build receipt, and dependency package metadata does not attest every installed file.

[R] Exit 0 means the bounded Stop checks and cleanup both passed. Exit 1 means a measured Stop check failed. Exit 2 means the setup or harness failed, evidence was inconclusive, or a passing Stop observation had unconfirmed cleanup. Read `stopVerdict`, `checks` and `cleanupOutcome` separately: cleanup must never turn failed Stop into PASS. Preserve errors and failed screenshots.

[R] A PID that persists with increasing heartbeats demonstrates continuing execution. A persistent PID with stable heartbeats can be a zombie or an identity race; inspect the recorded process state before calling it live work. This strict test still withholds PASS until both PIDs are absent. It covers an ordinary Pi shell command and direct child only, not detached descendants, signal-resistant programs, Codex, preflight cancellation, application Quit, packaging, or containment of arbitrary model actions.

[E, installed SDK source inspection] `@earendil-works/pi-coding-agent` 1.5.0, `dist/core/tools/bash.js`, defines a required string `command` and optional `timeout`, with no default timeout. Its cancellation path calls `killProcessTree` on the shell. This source finding motivates the execution check; it does not prove the application wires Stop to that cancellation path.
