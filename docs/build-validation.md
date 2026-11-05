# Combined build validation

Run `npm run check` before handing off a change. The existing focused commands remain useful during development, but `npm test` alone does not check the frontend, harness TypeScript tests or foundation checksums.

The combined command runs these stages in order and stops at the first failure:

1. Frontend TypeScript checking.
2. Vite production build.
3. Electron TypeScript compilation.
4. Harness TypeScript compilation.
5. Foundation asset and computation checksum verification, without updating the registry.
6. Compiled harness tests.
7. All repository `.test.mjs` tests, including foundation tests and the offline factory benchmark.

Use the repository's supported Node environment, install dependencies with `npm ci`, and install Chromium with `npm run setup:browser` first. The checks reuse that installed dependency tree and browser; they never install or update the checkout's dependencies or call a model provider. Dependency tests install fixtures into temporary runtimes, and tests may use loopback servers and network-isolation probes. Existing platform-specific skips remain visible in the test logs. This command does not run desktop smoke tests, package a release, or measure live model output quality.

## Captured inputs and isolated outputs

Full checks that use the same installed dependency directory run one at a time, including private checkouts linked to that directory. An atomic lock in the user's temporary directory is keyed by the resolved dependency path. Waiting runs retain their own `result.json` with the owner's PID and artifact directory; they capture source only after acquiring the lock. The queue waits at most thirty minutes and responds to cancellation without starting stages. Stage deadlines start when each stage runs and are unchanged. The lock stays held through stage cleanup and final integrity checks, then is released on success, failure or handled cancellation. Custom fixture stages do not acquire it unless explicitly opted in, so repository tests can exercise the runner without deadlocking the enclosing full check.

Locks are never taken away from a live owner because it has run for a long time. An abandoned or malformed lock fails with its exact path instead of being deleted automatically: after a hard process kill, inspect the referenced run and ensure its stage descendants have stopped before removing that file and starting again. This avoids competing waiters deleting a new owner's lock. Direct `npm test`, focused test commands, older checker snapshots and checkouts with separate dependency installations are outside this coordination boundary. Serialization prevents overlapping cooperating checks; it does not establish the cause of prior browser timeouts or replace deterministic test design.

Keep retry-policy assertions separate from repeated browser rendering. The visual-completion tests exercise the three-retry bound with actual runtime-file edits and missing visual evidence, then separately complete one real browser review and confirm that a later source edit invalidates its captures and blocks verification. They retain the same phase deadline and host evidence checks. This avoids requiring four full browser review cycles merely to count retries; it does not establish a browser performance guarantee or justify relaxing a failing deadline.

Each invocation creates a unique `output/checks/check-*/workspace`. The snapshot includes tracked files and nonignored untracked additions, uses current working-file contents, preserves executable permissions, and respects tracked deletions. Git metadata, ignored build outputs and dependencies are not copied. Symlinked or special source files are rejected with a diagnostic. The complete repository layout is retained so tests can find templates, skills and fixtures.

File contents and inventory are checked again after capture. If source changes during capture, the check stops before building. Later edits to the original checkout do not alter the captured files. The final result explicitly checks whether the original checkout still matches the snapshot and whether any captured source was changed or added. New files under the known generated output roots (`dist`, `dist-electron`, `dist-harness`, `output`, `node_modules`) are expected.

The private workspace links the existing `node_modules`. Before any stage starts, an offline preflight checks that the captured `package.json` dependency declarations match the root entry in `package-lock.json`, and that installed package versions, resolved sources and integrity metadata match the captured lock. It checks the actual package directory inventory and each installed `package.json` version too. Missing required packages, surplus packages, missing or malformed locks and mismatched installations fail with an `npm ci` diagnostic before commands execute. Version 2 and 3 npm lockfiles are supported; linked packages are unsupported. Optional packages may be absent, including native packages for other platforms. Source and hidden locks are compared by package identity, since npm's hidden lock omits the root entry and packages not installed on this platform.

The report records dependency paths, both lockfile digests, installed package counts, omitted optional counts, a digest of installed package manifests and the Node runtime. The inventory and identity check runs again at completion; changed installed-lock or package-manifest bytes fail the result. Arbitrary dependency code modifications are not comprehensively hashed. Keep dependency installation stable during validation. This is validation of captured source against an existing installation, not a fresh dependency install or a hermetic build. Vite uses its runner config loader so configuration compilation does not write through the shared dependency link.

Builds and test discovery run in the private workspace. Shared `dist`, `dist-electron` and `dist-harness` remain untouched. Test file lists are expanded and recorded explicitly; an empty test inventory fails. Stages have bounded deadlines (three minutes for build/check steps, five for harness tests, twenty for repository tests). Cancellation and timeouts terminate the stage process group on POSIX, including escalation if the direct child exits first. Normal process exit also checks for surviving descendants in that group after a brief shutdown grace period, even when the parent returned zero or a descendant keeps output pipes open. A surviving group fails the stage and is terminated before another stage or the final source-integrity check can run. After termination escalates, output gets a final 250 ms to drain; the runner then closes any remaining local pipes so inherited handles cannot leave a timeout or cancellation stuck as running. Received output and the terminal failure or cancellation report are retained, and later stages stay unrun. Children that create a separate process group are outside this cleanup boundary and may survive local pipe closure. Windows cleanup is limited to the direct process.

## Reading a result

The command prints the artifact directory. It contains:

- `result.json`: scope, source hash, runtime/dependency provenance, lock ownership and queue timing when coordinated, exact stage commands, statuses, durations, exit codes and errors.
- `source-manifest.json`: relative file paths, SHA-256 hashes, sizes and permissions for captured source.
- One log per executed stage, retaining standard output and standard error.
- `workspace/`: the captured source and generated outputs used by the checks.

Only `status: "passed"` with `scope: "full-offline"` means all default stages passed and the checkout still matched the captured source at completion. `checksPassed: true` with a failed overall status means the commands passed but an integrity check failed, for example because the checkout changed. Cite the captured hash when discussing that result; do not describe it as validation of the newer checkout.

Failed or cancelled runs exit nonzero, retain their evidence, and leave later stages as `not_run`. Results are replaced atomically. A run interrupted before finalization may remain `running`; that is not a successful check. Failed stages are not retried automatically, and their timeouts or test assertions are not relaxed. Fix the cause and start a new invocation. Retained workspaces consume disk space; remove old `output/checks/check-*` directories when their evidence is no longer needed.
