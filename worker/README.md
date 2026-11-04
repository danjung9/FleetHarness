# Hosted sandbox runtime

Build with `node scripts/build-worker.mjs`. Upload `dist-worker.tar.gz` to a fresh Vercel Sandbox and unpack it under `/vercel/sandbox/runtime`. The archive contains the compiled module tree, phase skills, toolkit sources, and a minimal pinned runtime package. `server/sandbox.ts` installs dependencies and Chromium before launching a detached process.

The generation worker runs as `node runtime/worker.mjs control/input.json`. `WorkerInput` in `types.ts` defines the input. The only model credential is a scoped, epoch-bound broker token; no account OpenAI key or application storage/deployment credentials enter this sandbox. The input file is consumed after reading.

Generated files live in `workspace/`. Worker-owned state lives in sibling `control/`:

- `progress.json` is the atomic polling response (`WorkerProgress`).
- `state.json` is the saved AppState.
- `checkpoint.json` points to the latest completed phase. The pointer contains both file digests and the generated-source digest.
- `checkpoints/<uuid>/checkpoint.json` holds `PipelineCheckpoint` metadata; `files.json` holds its immutable artifact bundle.
- `artifacts.json` and `report.json` appear when generation reaches review.

Artifact bundles are `{version,runId,epoch,createdAt,sourceHash,files:[{path,size,sha256,base64}]}`. Paths are sorted; the limits are 2,000 files, 10 MiB per file, and 20 MiB total decoded bytes. Symlinks, traversal, duplicate paths, noncanonical base64, and digest mismatches are rejected. Checkpoint metadata is bounded to 2 MiB. Source hashes use the existing desktop algorithm, including browser evidence but excluding `test-report.json`, `review.json`, and `DELIVERY.md`.

Creating `control/pause` or sending SIGTERM requests cancellation. Progress stays `pausing` until cancellation is acknowledged, then becomes `paused`. The orchestrator persists the immutable checkpoint and stops the sandbox, including child processes. Resume uses a fresh sandbox/epoch, restores the checkpoint bytes, preserves completed phases, and restarts the interrupted phase. A failed independent verification sets `retryVerification` so resume reruns the verification/repair phase even when the generation worker had reached review.

Hosted input sets `requireCheckpointAck`. Before starting the next phase, the worker waits for `control/checkpoint-ack.json` containing its checkpoint ID and metadata/files digests. The orchestrator writes this only after private storage and the database have persisted the checkpoint. A pause can interrupt this wait; an unavailable durable store times out safely after five minutes.

Generation-worker output is provisional: generated tools share its OS user. Final review requires a separate clean sandbox running `node runtime/verify.mjs control/verify-input.json`. `VerificationInput` in `verifier.ts` contains the server-held brief, run identity, source hash, packet hash, and frozen quality-contract hash. Restore the candidate artifacts into `workspace/` first. This sandbox has no broker token or account credentials.

The verifier runs generated Node tests through `sudo setpriv` as uid/gid 65534 with supplementary groups removed and `no_new_privs`. Workspace files are readable but not writable by that user. A preflight proves it cannot modify control files or runtime code. Browser journeys use Chromium's sandbox and the existing restricted local preview. Linux identity separation or browser setup failures block review.

On success, verification writes `verified-report.json`, `verified-artifacts.json`, and `verified-checkpoint.json`. Its only stdout line is `{version:1,status:"passed",runId,epoch,sourceHash,reportSha256,artifactsSha256,checkpointSha256}`; exit code is zero. The orchestrator checks those digests against downloaded bytes before persisting a trusted report. Failure emits a JSON error and exits nonzero.

Runtime setup and input staging use a separate lock and ready markers. Launches use a blocking process lock plus stored exit/stdout results, making duplicate workflow attempts replay the completed result without running agents or verification twice.

Run local checks with `node scripts/build-worker.mjs && node --test tests/hosted-worker.test.mjs`. The explicit infrastructure smoke `node --env-file=.env.local tests/hosted-worker-sandbox.mjs` creates and stops one staging Sandbox, uses deterministic artifacts, and makes no model calls.
