---
type: research
status: complete
owner: mukul
updated: 2026-11-04
summary: "All 34 catalog entries exercised at 50fcaea; 410 additional checks found seven failing verification/export scenarios."
---

# Harness coverage

[E, local Node execution] Final tested source: `50fcaea1e86028503ae66bd2f17287093ad30cbe`, Node `v26.0.0`, TypeScript 7.0.2, macOS arm64. All 34 entries produce complete packets, valid desktop inputs, existing skills and resolvable phase tools. All entries materialize and preserve their source requirements, execute selected toolkit tools and reject changed packet contents. This establishes a usable harness handoff, not 34 completed Sailor applications.

[E, local runs] New scenarios: **403/410 pass, 7 fail**. Existing harness baseline: **39/39 pass**. Combined: **442/449 pass, 7 fail**. The failures are deliberate assertions of expected safe behavior against actual application functions. They are reported below and not fixed.

## Revision and teammate handoff

[E] The clone initially resolved to 0f175a8 and both relay files were missing. The runner then updated the clone to 50fcaea and supplied both relay files. They were read after arrival and again before completion. All final compilation and reported runs were repeated on 50fcaea. The new practical README guidance, delivery skill, delivery/start locks and executable module are retained. Source hashes and final clean tracked-source check are in [source-provenance.json](source-provenance.json).

[E] The QA directive was absent. The existing [mvp-gate.md](~/.local/share/fleethacker-context/org/reports/mvp-gate.md) reports 128 passed and no failures at this revision. That is a teammate report, not 128 additional tests run here. The older vault Test-Results note is historical. No application source, tracked test, frontend, dependency manifest or lockfile was edited. No install, live provider call, browser, Electron launch, commit, push or external message occurred.

## Exact commands and counts

[E] Run from `~/Documents/CDAO/fh-org/qa`. Compiler output is redirected to results so application-owned build files stay untouched. Copying skills preserves the CLI's two-directories-up resource layout after that relocation.

```sh
mkdir -p qa-scenarios qa-results/tmp
node node_modules/typescript/bin/tsc -p harness/tsconfig.json --outDir qa-results/build-harness
node node_modules/typescript/bin/tsc -p electron/tsconfig.json --outDir qa-results/build-electron
node --input-type=module -e 'import {cp} from "node:fs/promises"; await cp("skills", "qa-results/skills", {recursive:true});'
TMPDIR="$PWD/qa-results/tmp" node --test qa-results/build-harness/tests/harness*.test.js > qa-results/baseline-harness.log 2>&1
node qa-scenarios/catalog-coverage.mjs > qa-results/catalog-coverage.log 2>&1
node qa-scenarios/domain-edges.mjs > qa-results/domain-edges.log 2>&1
node qa-scenarios/verification-export-edges.mjs > qa-results/verification-export-edges.log 2>&1
node qa-scenarios/executable-edges.mjs > qa-results/executable-edges.log 2>&1
git rev-parse HEAD > qa-results/revision.txt
git diff --exit-code HEAD -- harness electron shared skills package.json > qa-results/tracked-source-diff.log
node qa-scenarios/write-report.mjs
```

| Run | Checks | Pass | Fail | Exit | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| Isolated harness compilation | Compile | Yes | 0 | 0 | Reproducible command above |
| Isolated Electron compilation | Compile | Yes | 0 | 0 | Reproducible command above |
| Existing harness suite | 39 | 39 | 0 | 0 | [Log](baseline-harness.log) |
| All-entry coverage | 273 | 273 | 0 | 0 | [JSON](catalog-coverage.json), [log](catalog-coverage.log) |
| Domain and packet edge cases | 94 | 94 | 0 | 0 | [JSON](domain-edges.json), [log](domain-edges.log) |
| Verification and source export | 32 | 25 | 7 | 1 | [JSON](verification-export-edges.json), [log](verification-export-edges.log) |
| Standalone staging and save | 11 | 11 | 0 | 0 | [JSON](executable-edges.json), [log](executable-edges.log) |

[E] Counts are scenario checks, not assertion counts. Catalog count is one membership check plus eight checks for each of 34 entries. Domain count includes 80 deterministic independently enumerated scheduling fixtures (seed 20261104), 12 Plan.md ID11 cases, one packet-tamper check and one toolkit-demo check containing eleven expected outcomes. Verification/export count includes seven failing safety expectations. No failed run is described as passing.

[E] Earlier setup attempts are excluded from final counts. A relocated CLI baseline first passed 38/39 because qa-results/skills was missing; the retained [initial log](baseline-relocated-missing-skills.log) shows ENOENT. Copying skill resources made all 39 pass. The first export stub attempted the removed TypeScript JavaScript API, then lacked bootstrap/readArtifact and delivery-lock bindings; these were QA harness errors corrected in qa-scenarios only. Final export results use functions extracted verbatim from the fresh compiled main.js, with actual storage/verification helpers. Dialog, folder-reveal, store and file-copy hooks are local stubs. Sender-frame checks and native dialogs are outside this test.

## Real failures and reproduction

[E] Reproduce every row with `node qa-scenarios/verification-export-edges.mjs`. It exits 1 while bugs remain, records each assertion and captures supporting values. The script creates only synthetic workspaces under qa-results/tmp and removes them after recording evidence. Expected versus actual behavior follows. Severity is a QA assessment [R], not a runtime measurement.

| ID and priority [R] | Application file and line | Exact case | Expected | Observed [E] |
| --- | --- | --- | --- | --- |
| BUG-H1, high | [electron/storage.ts:89](../electron/storage.ts#L89) | [Scenario:75](../qa-scenarios/verification-export-edges.mjs#L75) creates a file a containing bc and a second tree with ab containing c, alongside identical index.html and tests. | Different source trees yield different source digests. | Both yield 090aab95e98e13c1df8f92176bd46e275aaa4c32fcee00a13b07b7b49b3cfc76. Paths and bodies are concatenated without lengths or separators. This is ambiguous serialization, not a cryptographic SHA-256 collision. |
| BUG-V1, high | [electron/verification.ts:8](../electron/verification.ts#L8) and [line 60](../electron/verification.ts#L60) | [Scenario:26](../qa-scenarios/verification-export-edges.mjs#L26) writes a nonempty comment-only app.test.cjs and runs verifyWorkspace. | A file with no application tests does not satisfy the test gate. | Node counts the file itself as one passing test; total=1, passed=1 and reportPassed=true. This does not claim arbitrary meaningful assertions can be proven automatically. |
| BUG-E1, high | [electron/main.ts:92](../electron/main.ts#L92), [line 94](../electron/main.ts#L94), [line 100](../electron/main.ts#L100) | [Scenario:135](../qa-scenarios/verification-export-edges.mjs#L135) approves Version A, appends unreviewed HTML while the folder dialog is pending, then returns its destination. | Block changed bytes or export the approved snapshot. | Changed HTML is copied and status becomes delivered; exported hash differs from report.sourceHash. The source check runs only before the awaited dialog. |
| BUG-E2, high | [electron/main.ts:100](../electron/main.ts#L100) through copyFile at line 103 | [Scenario:145](../qa-scenarios/verification-export-edges.mjs#L145) changes index.html after the first real copy call, before its turn in the copy loop. | Reject a mixed revision or export a stable snapshot. | Copied bytes differ from the approved digest and status still becomes delivered. This is the second mutation window of the same missing source-export snapshot. |
| BUG-E3, medium | [electron/storage.ts:87](../electron/storage.ts#L87), [electron/main.ts:100](../electron/main.ts#L100) | [Scenario:156](../qa-scenarios/verification-export-edges.mjs#L156) replaces review.json after genuine synthetic approval with a wrong sourceHash and replacement feedback. | Preserve or regenerate the host's actual review evidence. | Export succeeds and copies the replacement review verbatim. Host project state remains approved; the exported evidence contradicts it. No real reviewer identity or approval was invented. |
| BUG-E4, medium | [electron/main.ts:99](../electron/main.ts#L99) and line 103 | [Scenario:164](../qa-scenarios/verification-export-edges.mjs#L164) injects a local copyFile rejection after destination creation. | Failure leaves no apparent delivery bundle. | Error propagates and status correctly remains approved, but a FleetHarness destination folder remains without cleanup. With a later copy failure, already copied files would also remain. |
| BUG-E5, medium | [electron/storage.ts:69](../electron/storage.ts#L69), [electron/main.ts:100](../electron/main.ts#L100) | [Scenario:170](../qa-scenarios/verification-export-edges.mjs#L170) creates core.cjs, same-workspace alias.cjs symlink, and a test requiring that alias; verifies, approves, exports, then verifies the exported copy. | Reject unsupported dependencies before approval/export, or preserve a runnable reviewed package. | Workspace test passes 1/1; alias is silently omitted; exported test fails 0/1 while the host reports delivered. The source digest also excludes the link. |

[E] A clean export does preserve the reviewed hash and reruns 1/1 tests from the copied directory. Unapproved exports, active-run approval, changed source before approval/export, short review notes, inside-workspace destinations and cancellation are rejected or handled correctly. Verification correctly rejects failing/skipped/todo tests, nonzero exits, stdout TAP spoof plus nonzero exit, absent tests, ordinary source mutation, timeout and output overflow; test names with spaces/punctuation work. Path traversal and links escaping the workspace are rejected by safeFile. The seven failures therefore concern uncovered boundaries, not universal gate failure.

## All 34 catalog entries

[E] Every row passed the same eight checks: valid serializable packet and desktop input; criterion traceability; all phase skill/tool resolution; disk materialization; idempotency and retained-hash integrity; domain tool execution through registry and Pi adapter plus invalid-input rejection; executable copied toolkit; and rejection of changed source context. Recipe distribution: cyber 3, fielding 1, governance 3, knowledge 7, messages 3, offline 3, physics 2, readiness 5, scheduling 1, workflow 6.

[E] Skill counts below include the union across all seven phase contracts. Tools are the recipe's domain tools; every entry additionally has the appropriate intake/research/system-design/progress tools and agent phases inherit read/write/edit/bash. Empty domain-tool lists are explicit recipe limits, not missing references. Every shared source requirement remains a human acceptance item; a packet pass does not mark it implemented. Per-row requirements, limitations, full skill names and tools are recorded in catalog-coverage.json. SourceScope is detail only for ID36; the other 33 are catalog summaries. Source content was not revalidated against the live event site.

| ID | Recipe | Skills | Domain tools (fleet_ prefix omitted) | Checks | Sailor-facing limit observed in supplied toolkit [E] |
| --- | --- | ---: | --- | --- | --- |
| 40 | workflow | 7 | reconcile_records, search_evidence | 8/8 | Release authority, PKI, subscriptions and acknowledgement need application integration. |
| 24 | messages | 6 | extract_messages, search_evidence | 8/8 | Included parser accepts synthetic EVENT/TASK grammar; held-out real-format extraction is not established. |
| 35 | cyber | 6 | search_evidence | 8/8 | Evidence search only; isolated-lab scan, reversible remediation and policy controls are absent. |
| 15 | knowledge | 6 | search_evidence | 8/8 | Local lexical retrieval does not supply a shared workspace or access enforcement. |
| 17 | physics | 6 | None | 8/8 | No approved MSI formula, craft limits or engineering calculator is supplied. |
| 25 | cyber | 6 | search_evidence | 8/8 | No CAC/PKI implementation or cloud-policy evaluator is supplied. |
| 42 | workflow | 7 | reconcile_records, search_evidence | 8/8 | Record reconciliation does not implement Navy Week planning, resource deconfliction or closeout. |
| 44 | offline | 6 | reconcile_records, plan_uploads | 8/8 | No durable parts/work-order store, photo capture, device encryption or sync transport is supplied. |
| 14 | readiness | 6 | analyze_dependencies, search_evidence | 8/8 | DAG arithmetic is not a validated mission-margin model; owner-supplied relationships remain necessary. |
| 18 | cyber | 6 | search_evidence | 8/8 | No alert correlation or incident workflow is supplied beyond evidence search. |
| 22 | messages | 6 | extract_messages, search_evidence | 8/8 | No OCR or image coordinates; text offsets cannot prove handwritten-scan extraction. |
| 32 | readiness | 6 | analyze_dependencies, search_evidence | 8/8 | No event ingestion, asset reconciliation or persisted last-synced readiness view is supplied. |
| 39 | knowledge | 6 | search_evidence | 8/8 | No JLLIS connector, applicability judgment or review-feedback workflow is supplied. |
| 34 | knowledge | 6 | search_evidence | 8/8 | No reporting ingestion, temporal change/anomaly detector or confirmed transition owner is supplied. |
| 16 | governance | 6 | None | 8/8 | No registration, leases, arbitration or operator-halt runtime is supplied. |
| 46 | knowledge | 6 | search_evidence | 8/8 | No authoritative directory connector or access/release-control enforcement is supplied. |
| 41 | workflow | 7 | reconcile_records, search_evidence | 8/8 | No Microsoft 365 tenant connector, queue router or document preparation workflow is supplied. |
| 36 | offline | 6 | reconcile_records, plan_uploads | 8/8 | Revision math and transfer planning do not supply forms, persistence, review routing or measured packet-time benefit. |
| 19 | readiness | 6 | analyze_dependencies, search_evidence | 8/8 | No risk extraction or scoring rubric implementation; DAG analysis alone is not a risk register. |
| 37 | fielding | 5 | None | 8/8 | Requires an owner-supplied working app and device acceptance; packaging is not fielding authorization. |
| 33 | knowledge | 6 | search_evidence | 8/8 | No authenticated policy checks, contradiction resolution or action audit implementation is supplied. |
| 13 | readiness | 6 | analyze_dependencies, search_evidence | 8/8 | No equipment-alias matching or source-snapshot reconciliation is supplied. |
| 23 | governance | 6 | None | 8/8 | No zero-trust orchestration, telemetry-trust validation or conflict arbitration runtime is supplied. |
| 43 | workflow | 7 | reconcile_records, search_evidence | 8/8 | Synthetic record math only; authoritative lifecycle, role checks and release remain application work. |
| 48 | workflow | 7 | reconcile_records, search_evidence | 8/8 | No DSG implementation or printable non-AI decision workflow is supplied. |
| 9 | governance | 6 | None | 8/8 | No multi-agent simulator or combined-behavior evaluator is supplied. |
| 8 | workflow | 7 | reconcile_records, search_evidence | 8/8 | No CASREP message formatting, reviewer routing or formal release adapter is supplied. |
| 10 | physics | 6 | None | 8/8 | No engineering equations, unit/limit validation or tug/mooring calculator is supplied. |
| 11 | scheduling | 6 | solve_schedule | 8/8 | Fixed people and explicit starts only; no departmental negotiation, recurrence expansion or weekly-board UI. |
| 12 | messages | 6 | extract_messages, search_evidence | 8/8 | No USMTF field mapping or frequency/change-over/flight-quarter parsing in the included synthetic grammar. |
| 20 | knowledge | 6 | search_evidence | 8/8 | No vessel registry connector or identifier disambiguation implementation is supplied. |
| 21 | knowledge | 6 | search_evidence | 8/8 | No voice ingestion, five-second response guarantee, identity binding or tamper-evident logging is supplied. |
| 26 | readiness | 6 | analyze_dependencies, search_evidence | 8/8 | No technical-reference/parts connector, alternatives engine or durable last-synced view is supplied. |
| 45 | offline | 6 | reconcile_records, plan_uploads | 8/8 | Byte allocation works as a calculation; no actual resumable upload, acknowledgement or cloud-freshness service. |

[E] No recipe claims to supply a full application. Six entries in governance (3), physics (2) and fielding (1) have no domain runtime tools. Those six still have valid general pipeline tools and selected skills. The three synthetic pilot IDs are 11, 12 and 36. Four catalog categories are null (40, 39, 19 and 45); null means the source category was absent, not that a category was inferred. See the exact machine-readable counts rather than treating these metadata gaps as implementation failures.

## Human authority and unverified boundaries

[E] review is owned by a human and deliver by the host in all 34 contracts. Source criteria, uncertainty, synthetic-only policy and recipe limitations survive preparation. The delivery guide requires source-bound review and describes deployment approval as unresolved. The new standalone module passed allowlist staging, approval/hash/status checks, missing/empty/oversized HTML rejection, title escaping, inside-workspace save and symlink guard, archive copy cleanup and pre-cancelled worker checks. Packaging was not invoked.

[R] Escalate the hash and source-export failures to the QA lead before treating a delivered source bundle as the reviewed revision. Keep human approval of the final bytes, monitor test and copy failures, prohibit operational release or real-data ingestion, and stop progression on mismatched digests. No messages were sent and no product fix was attempted.

[E] Not verified: generated app correctness for any catalog entry, README accuracy against an actual generated interface, independent browser acceptance, all three UI journeys, request import/consent controls, cold launch, persistence/recovery, network-disconnected behavior, live provider/authentication, OS-level isolation, descendant-process shutdown, actual ZIP packaging, platform signing or government authorization. The local worker pre-cancel check does not prove complete shutdown. The source-export failures do not by themselves establish equivalent failures in the separate executable packaging route.

## Local disclosure and session handoff

[E] Asked: exercise every catalog entry plus verification/export without a model or browser. Done: four standalone scenario suites, reusable local IPC harness, JSON/log evidence, isolated builds and this report. Verified: commands and counts above, actual current revision, tracked source unchanged and relay reread. Next: QA lead reviews the six root issues represented by seven failing scenarios, assigns fixes and reruns these checks; independent browser/live-model and packaged cold-launch work remain separate.

[E] Existing work reused: FleetHarness 0.1.0 source at the recorded commit, 34-entry catalog, ten recipes, fourteen skill documents, seven deterministic tool definitions, synthetic fixtures, proposed Plan.md training contract, historical test notes and latest relay/gate. No outside dataset or service was introduced. Existing prompts and skill files were test data, not new instructions to execute unrelated work.

| Tool or input | Version | Type and provider | Use |
| --- | --- | --- | --- |
| Node.js and standard assert/fs/path/url/crypto/vm/child_process APIs | 26.0.0 | Runtime, Node.js contributors | Execute scenarios, compile function extraction, child tests and evidence files |
| TypeScript compiler | 7.0.2 | Compiler, Microsoft | Build source into qa-results only |
| typebox | 1.3.27 | Existing schema validator, TypeBox project | Exercise actual tool boundary schemas through existing harness |
| Git | 2.50.1 (Apple Git-155) | Source inspection, Git contributors and Apple distribution | Record revision and assert tracked source unchanged |
| ripgrep | 15.2.0 | Search, ripgrep contributors | Find relevant source and instructions |
| zsh | 5.9 | Shell, zsh contributors | Run local commands |
| Python standard pathlib | 3.9.6 | Reader, Python Software Foundation | Initial required-context reads only |
| Command/file patch tools | Version not exposed | Session environment | Local execution and scenario/report writes |
| Session model | Exact identifier not exposed | Session runtime | QA work; record actual identifier from authorized execution metadata |

[E] Central Sprint logs, Sessions note and Team/Now are outside the allowed write folder. The prescribed vault fh.py tool command and central updates were not run because they write outside this assignment. This section is the local tool/friction/prior-work/session handoff for an authorized coordinating session to transfer. No central logging is claimed. Friction: initial stale checkout and missing relay, automatic source update during work, Apple tooling's blocked temporary cache warnings, compiler-output relocation requiring local skills, temporary QA IPC-stub errors, a report-template escaping error corrected locally, and blocked synchronous Git spawning from Node (replaced with the shell revision/diff commands recorded above). All final scenario files and evidence live only in the two permitted subdirectories.
