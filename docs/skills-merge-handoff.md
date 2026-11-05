# Skills and visual review merge

Resolved the 13 conflicted files for HEAD 8053707 and incoming 29ac921 after reading both sides, the incoming commit, documentation and tests. Conflict markers are gone. The Git index is intentionally untouched; the overseer must stage and commit the resolved working tree.

## Combined behavior

- Kept Ponytail, Impeccable, nested skill assets and executable permissions, runtime-specific skill routing, visual review, the image viewer and phase resume controls. Worker stages have no default turn-count cap; explicit limits, inactivity deadlines and total deadlines remain. Project lead tool limits remain separate.
- Resume uses the existing guarded backend path with the new private checkpoint. It preserves the run and workspace, failed-attempt metrics, original build-test baseline, frozen contracts and answer key, clarification answers, review source and visual findings. Admission refuses unconfirmed writers or cleanup. Refused or cancelled admission preserves the saved project and files. Resume spends the remaining shared two-repair budget, including retries; it cannot reset that budget.
- Private checkpoints and browser captures use atomic host writes. Frozen answer-key recovery validates exact saved bodies before resealing. A source edit during final answer-key restoration cannot acquire a new passing report hash. Application tests exclude toolkit and browser-observation directories.
- Host capability checks, developer tests, browser journeys and required visual comparisons precede the independent judge. Version 3 reports require the visual gate for browser/service apps. Approval still requires authoritative evidence and confirmed cleanup for the same run. CLI and service judge snapshots and delivery use the validated manifest without requiring root index.html. Requirements completion still requires both contract evidence and prose coverage.
- Agents, generated services, tests and browsers retain full access with no OS sandbox. Browser launch and the skill launcher retain the process marker. New tests exercise real detached fixture processes and signals through Stop and completion, including failed browser teardown. They inject discovery and browser transport, so they do not prove native ps or Chrome behavior. The existing native helper-process-cleanup tests remain.
- API-key and ChatGPT sign-in, preflight, plain errors, redaction, retry, cleanup gates and original delivery protections remain. No frontend file was edited during conflict resolution. Incoming frontend changes and earlier API-key/preview changes remain.

## Prompt growth

Measured against 8053707 using recipe 12, phase prompts and assigned skill entries, with common paths normalized. Codex includes skill bodies; Pi initially includes the SDK-formatted skill descriptions and paths. These are added characters, not measured model usage:

| Phase | Codex | Pi initial |
| --- | ---: | ---: |
| Intake | 0 | 0 |
| Research | 4,944 | 671 |
| Planning | 12,472 | 1,031 |
| Build | 14,538 | 3,097 |
| Verify | 14,525 | 3,084 |

For Codex, the initial increase across these phases is 46,479 characters, approximately 11.6k tokens at a rough four characters per token. Build and verify each add about 3.6k tokens. This excludes repeated prompts, repairs, caching and images. Pi subsequently reads skill bodies and references on demand. The recommended Impeccable planning references total 7,688 characters, build references 9,633, and verification audit plus critique references 54,401, approximately 13.6k tokens for that last optional read. The two skill directories contain 73 files and 2,239,167 bytes; those bytes are copied into the packet, not all inserted into each prompt.

## Verification receipts

All three requested commands passed:

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p electron/tsconfig.json
node node_modules/typescript/bin/tsc -p harness/tsconfig.json
```

Tests used synthetic data, local fixture providers and TMPDIR inside this clone. No live model calls were made. Each row is a separate receipt; selected backend groups can overlap.

| Checks actually run | Result | Local receipt |
| --- | ---: | --- |
| Activity, agent runner, clarifications, journey, resume, visual ledger and image IPC | 91 passed | .tmp/skills-pure-final.log |
| Preflight and plain errors | 57 passed | .tmp/skills-errors-final.log |
| Codex credentials, full-access config, transport, rotation, images and project lead limits | 26 passed | .tmp/skills-codex.log |
| Real Pi SDK image transport against loopback fixture | 1 passed | .tmp/skills-pi-image.log |
| Independent judge, including v2/v3 runtime manifests | 33 passed | .tmp/skills-judge.log |
| Selected quality and authoritative delivery gates | 11 passed | .tmp/skills-quality.log |
| Selected executable packaging controls | 8 passed | .tmp/skills-executable.log |
| Selected storage/restart checks | 14 passed | .tmp/skills-runtime.log |
| Direct verifier, process limits, registered evidence and application test selection | 35 passed | .tmp/skills-verification-final.log |
| Runnable browser lifecycle checks, including two marker/sweep regressions | 5 passed | .tmp/skills-browser2.log |
| Guarded resume, metrics and baseline workflows | 14 passed | .tmp/skills-backend2.log |
| Additional refusal, retry and writer guards | 27 passed | .tmp/skills-guards.log |
| Synthetic variants of incoming private-checkpoint recovery workflows | 15 passed | .tmp/skills-recovery.log |
| Legacy admission leaves restored answers unchanged | 1 passed | .tmp/skills-legacy-resume.log |
| Synthetic visual completion and final source-binding gates | 6 passed | .tmp/skills-visual-gates.log |
| Harness, including skill packaging and marker forwarding | 93 passed | .tmp/skills-harness-final.log |

An initial harness run passed 93/94; its special-file test could not spawn mkfifo (EPERM). The final harness selection excludes only that test. An initial verifier run exposed missing browser-observation exclusion; the production filter was corrected and all 35 selected cases then passed. Initial fixture and resume-expectation integration failures were corrected and rerun as shown above. This is not a full-suite native pass.

## Test reconciliation

Every test from both branches remains. No failing condition was removed to obtain a pass. Incompatible expectations were reconciled as follows:

- Resume refusal checks now assert the complete saved project is unchanged and inspect the returned error cause for the original diagnostic. The two preflight Stop cases preserve the prior status because cancellation happens before admitting a resumed writer. They still assert zero inference, no late inference and a released slot.
- Incoming positive Stop/resume fixtures now settle their writer on abort. Unsettled writers still have separate negative tests that require refusal. Restart fixtures supply a run marker and assert confirmed recovery before expecting stopped status; markerless recovery still fails closed.
- Incoming resume cannot grant a fresh repair allowance. Its repair case interrupts the first attempt and requires exactly two total attempts after recovery. A completed verifier followed by final-save failure reruns host checks without adding another fixing agent. Original output, evidence and session-count assertions remain with these combined semantics.
- Workflow expectations now require version 3 visual evidence. CLI routing has zero browser journeys; browser workflows retain four journeys plus eight visual captures and complete initial/recheck sessions. Existing native variants remain; explicitly named synthetic variants exercise orchestration without claiming browser execution.
- Incoming diagnostics are checked in the raw log or error cause where the existing plain-error boundary intentionally changes displayed text. The plain-error inventory was refreshed after reviewing the new producers and mappings. Existing error-coverage assertions remain.
- Kept HEAD's existing 60-second functional test allowance. Adopted incoming fixture stage allowances of 10-second idle and 25-second total for larger skill packets and visual work, plus its 2-second idle/10-second total stalled-stage fixture. The clarification fixture uses 1/1.5-second stage limits and waits 1.8 seconds, still exceeding both. Dedicated short watchdog and unconfirmed-writer tests retain their explicit limits. Production deadlines were not raised.
- The new Pi image test uses fixture-credentials.json for its synthetic credential store so it never accesses a file named auth.json. Its transport assertions are unchanged. Browser sweep, launcher marker, v3 approval and legacy admission assertions were added.

## Outside-sandbox checks still required

Native ps discovery, Chrome/Electron browser execution, GUI smoke tests and complete real factory workflows could not be validated here. Clean runtime/package checks also reject this clone-local temporary directory because an ancestor contains node_modules; that production safeguard was retained. The FIFO skill-file test needs a host that permits mkfifo. Native API sign-in and hosted-model reasoning were not exercised. No missing dependencies were encountered.

Run the full unit and harness suites and the native browser/helper cleanup regressions outside this sandbox. Fixture scanners, browsers and verification reports establish only their stated orchestration checks. No files outside this clone were changed and no Git write command was run.
