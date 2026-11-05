---
type: test-plan
status: complete
owner: mukul
updated: 2026-11-04
summary: "The detached Pi child survives Stop at d0f4c69; measured failure precedes separate successful fixture cleanup."
---

# Stop with a detached background worker

[E, independently reviewed runtime receipt] **STOP-DETACHED-01 fails at d0f4c69.** [Receipt 5903f0de](stop-detached-5903f0de-d2df-43a9-953f-11dd99176176/result.json), 16:08:28 to 16:08:42 EST, proves that an owned detached child kept running after the actual Stop button while the app remained stopped. Separate cleanup passed. This measured outcome supersedes preparation-only status below; it does not establish other engines or shutdown paths.

| Observation before separate cleanup | Result |
| --- | --- |
| Detachment | Shell 32168 and child 32171 are distinct observed session leaders and process-group leaders; parent 32169 shares the shell group. macOS sess fields are zero, so leader flags provide the session proof. |
| Shell and ordinary parent | Both absent at observation start and end; parent heartbeat count remains 9. |
| Detached child | Same PID, start time, command digest and group remain present; PPID becomes 1. Heartbeats advance from 28 to 106 over approximately eight seconds. This is active work, not a zombie-only observation. |
| App and provider | App reports stopped at both endpoints. Provider requests remain one. |
| Watchdog and cleanup order | Observation ends about 49 seconds before the worker deadline. FAIL is recorded before the cleanup marker; subsequent cleanup confirms all three PIDs absent. |

[E] Executed script SHA-256 `d517a44dcb0c4dbb4696bdb2eebc83d3a7b65ac8b3eb285f2fad218722f125d5` matches the reviewed script. The 24 ms click duration and 11 ms post-click status observation are not descendant termination latency. [R] Keep this failure open until the same owned detached-worker case passes after a runtime fix. A stopped badge and the earlier ordinary-child pass do not establish complete shutdown.

[E, receipt cross-check] Every shared field in observation.json matches result.json; all eight retained control-file hashes match. The child keeps its pre-Stop PID, start time, command digest and process group throughout observation. FAIL was recorded 46 ms before cleanup began, and the child's exit record says cleanup. Its watchdog still had 49.076 seconds remaining at observation end. This confirms the measured failure independently of later fixture removal.

[E, preparation] [qa-stop-detached.mjs](qa-stop-detached.mjs) extends [[Research/QA/GUI-631849f/Stop-Child-Runbook]]. Only source review, syntax and pure validation ran here. No app, fixture provider, Pi command or worker was executed. Main owns review and any execution in its independently authorized GUI environment.

[R] After review and a separate matching build receipt, main may use:

```sh
node ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-d0f4c69/qa-stop-detached.mjs ~/Documents/CDAO/fh-org/gui-d0f4c69 ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-d0f4c69
```

[E, script] Preflight requires that exact checkout argument, HEAD `d0f4c690d3f40ac260eb0a291dde75f0d55c4aa5`, clean tracked source, existing frontend/backend outputs and installed dependencies. It resolves Electron through `node_modules/electron/path.txt`, checks the executable and never imports its auto-installing loader. It does not install, rebuild, edit the repo, sign in or request live model inference. Normal app startup initializes the host's isolated Codex account/model discovery under the temporary app-state directory (`electron/main.ts:237-239`); this is not a Codex build or login test. Build hashes identify executed bytes; a separate build receipt must establish their derivation from the pin. Package metadata does not attest every dependency file.

## Controlled case

1. [E, script] Launch Electron with only PATH, LANG, TMPDIR, FLEET_USER_DATA and PI_CODING_AGENT_DIR in its supplied environment. App/model state and worker files use a unique temporary root. There is no HOME or CODEX_HOME override, inherited provider key or entered credential. The loopback scripted provider uses a synthetic SDK placeholder and retains request timestamps/tool names only, never headers or prompt bodies.
2. [E, script] Configure the fixture through real Pi settings, create the Paperless Underway brief and confirm Run Pi agents. The fixture validates the advertised bash schema and emits one actual Pi bash call. The command passes its real shell PID through `$$`. Trailing shell commands keep the shell waiting instead of replacing itself with Node.
3. [E, script] The ordinary Node parent spawns one Node child with `detached: true`, ignored stdio and `unref`. The parent stays active on a heartbeat interval. Both workers write nonce/PID records and advance heartbeats. Parent exit does not kill its child. Each worker independently checks the nonce-matched cleanup marker and absolute deadline, with a referenced self-watchdog capped at 60 seconds. The child does not depend on the harness or Electron remaining alive.
4. [E, script] Before Stop, require running project state and advancing heartbeats. Require shell and parent to share a process group, and require the child to lead a different group. Compare usable session identifiers. If macOS returns zero for every sess field, instead require both distinct shell and child PIDs to have the documented session-leader flag in ps stat; the zero fields themselves establish nothing. Inspect only the three recorded PIDs. Retain PID, PPID, PGID, raw session, start time, process state, command digest and the detachment proof used. Inspect command text only to validate the private nonce and exact generated-script path, then discard it. No process environment is read. Continuing identity excludes PPID because reparenting can change it.
5. [E, script] Click the actual header Stop run button. Record click start/completion, allow two seconds to settle and observe for eight seconds. Require stopped state observed within ten seconds, no new provider requests, stable heartbeats and all three PIDs absent at the observation endpoints. This is bounded endpoint observation, not continuous kernel monitoring or exact termination latency.
6. [E, script] Finish at least five seconds before the worker deadline. Any worker self-exit record, early cleanup marker, unavailable process inspection or changed identity prevents a Stop PASS. Every present PID sampled after initial identity capture must still match that identity. A reused PID makes evidence inconclusive rather than establishing Stop failure. Save stopVerdict and observation.json before cleanup or closing Electron.
7. [E, script] Separately record cleanup time and create its marker. Wait for cooperative exit; fallback signals require a currently matching identity captured before Stop. Only the detached child's proven leader identity permits negative-PID group SIGKILL. Reused or unverifiable PIDs are skipped. Unconfirmed cleanup retains the temporary root and cannot return overall PASS. Identity checking and signalling are not atomic kernel operations; these checks reduce reuse risk without claiming race-free handles.
8. [E, script] A 90-second harness watchdog marks emergency cleanup, signals only its owned Electron handle, records ERROR and retains the temporary root. Worker deadlines remain independent even if the harness is killed before finally. Normal app close has a five-second fallback against only that owned Electron handle. Scheduling and timer handling can delay exit; suspended or unscheduled processes cannot provide a strict real-time guarantee.

## Source and system checks

[E, pinned source] Home's h1 is AppYard. Its example label is `Start a brief: Paperless. Even underway.. Paperless Underway`, derived from `src/Home.tsx:11,58`. Start build and Stop run are scoped to `header.topbar`, using `src/App.tsx:285-311`, to avoid the second Start build in stage details. Pi settings controls remain at `src/ModelSettings.tsx:42-72`. These selectors are source checked and remain runtime unverified.

[E, installed SDK source] In the supplied checkout, `node_modules/@earendil-works/pi-coding-agent/dist/core/tools/bash.js:63-80,94-99` launches a detached POSIX shell and calls killProcessTree on abort. `dist/utils/shell.js:189-233` sends macOS group SIGSTOP, then POSIX group SIGKILL, with a single-PID fallback. This path does not enumerate a newly detached child's separate group/session. That motivates the case; it is not a runtime finding. The receipt hashes both installed source files and package metadata.

[E, system documentation] `/usr/share/man/man1/ps.1:499-520` identifies pgid as process group number and sess as session ID. Lines 292-296 describe lstart. The script uses sess on macOS and sid on Linux; Linux behavior is unverified here. `/bin/ps -L` was sandbox denied during preparation. This was not bypassed. Runtime owned-PID inspection must be permitted or the fixture returns ERROR. Command inspection uses `-ww` to avoid truncating nonce/path.

## Receipt and interpretation

[E, script] Each run retains `stop-detached-<nonce>/result.json`, observation.json and screenshots when reached. Control-evidence retains generated worker sources, PID records, heartbeats, self-exit records and the separate cleanup marker with per-file hashes. The receipt includes commit/tree, tracked status, script/command digests, Electron binary digest, frontend/backend build manifests, selected package versions/hashes and installed SDK Stop-source hashes. Successful cleanup removes temporary app/model state; incomplete cleanup retains the temporary root.

[R] Read stopVerdict, checks, detachedHeartbeatAdvanced, detachedIdentityStillPresent and cleanupOutcome separately. Increasing child heartbeats plus the same owned identity demonstrate surviving work. A persistent PID with stable heartbeats may be stalled or a zombie. A zombie-only result leaves strict shutdown closure open and does not establish ongoing work. Cleanup may remove a fixture that survived Stop; it must never turn Stop FAIL into PASS.

[E, script] Exit 0 requires measured Stop PASS and confirmed cleanup. Exit 1 means a measured Stop FAIL. Exit 2 means setup/harness/inconclusive evidence or an otherwise passing observation with unconfirmed cleanup. A later screenshot failure may make the overall result ERROR while preserving the already recorded Stop verdict. An EPERM, selector mismatch or missing detachment proof is ERROR, not a product failure or reason to bypass a restriction.

[R] Scope is one active Pi shell/parent plus one detached child. It does not cover Windows, Codex, Quit, signal-resistant workers, arbitrary grandchildren, packaging, general containment or candidate-app correctness. The ordinary-child PASS at 631849f does not establish this case at d0f4c69.

## Preparation checks and handoff

[E, preparation] The main script and both generated worker module syntax checks passed, along with pure verdict/identity checks:

```sh
node --check ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-d0f4c69/qa-stop-detached.mjs
node ~/Documents/CDAO/Fleethacker-Vault/Research/QA/GUI-d0f4c69/qa-stop-detached.mjs --validate-only
```

[E, validation] The validation branch runs before runtime directory creation. It reads static worker templates, rejects interpolation, parses them through Node syntax checking on stdin and tests pure functions with synthetic objects. It creates no workers, server, app or output and imports no repo modules. Cases cover absent/stable processes, a surviving child, new provider requests, missing stopped state and changed PID start identity. Successful syntax does not establish process-group or Stop behavior.

[E, first runtime receipt] [Attempt ebe23f63](stop-detached-ebe23f63-cdcb-48ec-8488-16be06fd4218/result.json), 16:04:22 to 16:04:27 EST, reached three active owned processes but failed the harness's session comparison before clicking Stop. All sess fields were zero. Shell PID/group 27681 and child PID/group 27683 both had stat Ss; parent 27682 remained in group 27681. Separate cleanup passed. This is an invalidated setup attempt, not a product Stop result.

[E, corrected preparation] Local ps documentation at `/usr/share/man/man1/ps.1:374-375` defines the lowercase s flag as session leader. The revised precondition requires those positive flags on distinct owned PIDs, together with different process groups, when macOS sess fields are all zero. Pure controls accept this captured shape and reject the same group or either missing leader flag; Linux still requires distinct valid session identifiers. Stop, timing, heartbeat and cleanup expectations are unchanged. A fresh runtime receipt is required.

[E, handoff] The fixture deliverable consists of this runbook and qa-stop-detached.mjs. Central tool, friction, prior-work and session logs are maintained separately. Reused work: the prior child fixture/runbook, current vault rules, pinned UI and installed SDK source. Preparation used shell, Git/text readers, file/patch tooling, Python text transformation and Node syntax/pure checks. Process inspection was denied during preparation; no runtime result is claimed.
