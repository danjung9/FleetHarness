# Browser tooling merge

Merged 34f82b3 into a6d42c6 in the working tree. All six conflicted files were read on both sides and resolved. The index remains for the overseer to stage and commit. No git writes or frontend edits beyond the incoming merge were made.

## Integration

- Kept helper discovery, package self-tests, cross-phase reuse, tool failure results and screenshot image responses. The helper runner executes Node or Electron directly with full filesystem, network, worker and subprocess access. Removed its incoming OS sandbox and Node permission flags. Kept the project lead's separate tool policy.
- Every helper launch now uses runProcessEnvironment. Shell tools and build-engine launches retain their existing markers. Background servers and browsers are allowed. Stop and final completion still wait for the owning run sweep before publishing a terminal result.
- Helper runtime directories remain available to background descendants until confirmed process cleanup. Timeout, cancellation and output limits also close retained pipes so a detached descendant cannot keep a tool call waiting forever.
- Kept review iterations and durable review history. Approval still checks same-run cleanup, the validated source manifest and authoritative verification. Review receipts and previous-source copies use atomic host writes. Delivery exports the authoritative approval, including review history.
- Review checkpoints retain reviewer comments and the previous-source hash across Resume. Reference tests and helper tests never count as application tests or repair baselines. Startup refusal restores the previous reviewable build and saves the diagnostic; unconfirmed cleanup is never rolled back to a confirmed state.
- Kept API-key and ChatGPT sign-in, build preflight, plain errors, secret redaction, judge snapshot fixes, repair baselines and delivery gates. Helper results redact credentials in both text and structured output. Added plain-error mappings and reviewed the error inventory for the new modules.

## Verification observed

All three requested compiler commands passed:

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p electron/tsconfig.json
node node_modules/typescript/bin/tsc -p harness/tsconfig.json
```

Tests used synthetic fixtures, local transports and TMPDIR inside this clone. No live model calls were made.

| Checks | Result |
| --- | --- |
| Helper catalog, runtime, execution, review, plain errors and verification | 92 passed |
| Credential and protocol tests, including image results, API keys, token rotation and project lead restrictions | 24 passed |
| Pipeline orchestration, review iterations, retries, repair baselines and Resume | 22 passed |
| Selected process sweep tests, including deferred runtime-directory cleanup | 16 passed |
| Lifecycle and approval/delivery gates | 25 passed, 1 native test skipped |
| Real detached server cleanup on Stop/completion and retained-pipe regression | 3 passed |
| Harness | 84 passed |

The detached-server regressions spawn real processes and send real signals, but inject the PID registry. They do not prove native process discovery. Two additional tests in tests/helper-process-cleanup.test.mjs launch Chrome against a real self-hosted server and use the production process scanner. Both must run outside the sandbox:

```sh
node --experimental-test-module-mocks --test tests/helper-process-cleanup.test.mjs
```

Native ps and Chrome are blocked here. An initial selection also reached the native discovery test and complete build workflow: they failed with spawn EPERM and unconfirmed process cleanup. Two verifier-lifecycle cases could not reach their target because clean runtime evaluation cannot run from a temp directory beneath this clone's node_modules ancestor; one consequently reached its test deadline. These tests and the GUI smoke scripts require the overseer's native run. Their assertions and deadlines were retained. No full-suite pass is claimed.

## Assertion changes

No tests were deleted and no timeout was raised. The owner's full-access decision intentionally changes these expectations:

- tests/helper-execution.test.mjs: outside synthetic-file access now must succeed and persist writes; loopback access must connect; detached subprocesses and workers must actually run; bundled Electron must successfully execute a subprocess. The fixed-entrypoint argv, output, timeout, cancellation and credential assertions remain.
- tests/pi-backend.test.mjs: a background launch now must advance to review. The test still requires persisted Resume to refuse unconfirmed cleanup and launch no further sessions. A synthetic failed recovery probe makes that refusal deterministic on both native and restricted hosts.

Other assertions were adapted to the combined interface without dropping their checks:

- Phase tool arrays include both new helper tools and the existing marked shell wrapper.
- Review startup refusal checks the existing preflight's plain connection instruction. Previous-source mutation checks both the original diagnostic in the activity log and its plain public message.
- Review fixtures now include same-run cleanup and authoritative passing evidence. The failed-save test injects failure at saveProject, which atomically commits approval, instead of the replaced save call.
- Four incoming review workflow tests retain their real verification variants and add synthetic orchestration variants. Additional tests cover review-source integrity across Resume, cleanup-gated change requests and credential redaction.
- The plain-error inventory includes the new reviewed error producers and mappings; its mutation and unmapped-error assertions remain intact.

Frontend lines changed beyond the incoming merge in this batch: none. Previously merged API-key controls and preview changes remain.
