---
type: log
status: active
owner: mukul
updated: 2026-11-04
summary: "Rule 5 ledger of every tool, model, dataset and external service used for Fleethacker."
---

# Tool ledger

Rule 5 requires disclosing tooling, models, datasets and external services [P]. Terms sections 5 to 8 also require identifying pre-existing material and following each tool's license [P]. Keep this current as things are used, and use it to write the disclosure in the submission.

To add a row, run: `python3 tools/fh.py tool "Name and version" "Type" "What it was used for" "Who provides it"`

## Used

Some entries are held back pending Mukul's review before they are shared here, so this copy is not yet the complete disclosure list.

| Item | Type | Used for | Provided by | First used |
| --- | --- | --- | --- | --- |
| Codex CLI 0.163.0 | Coding agent | Research seats, council seats, live chat with the main session | OpenAI, event key | 2026-11-04 |
| gpt-6.1-sol | Model | Research seats, Builder council seat, default for Codex | OpenAI, event key | 2026-11-04 |
| gpt-6-astra | Model | Officer and Judge council seats, verification, ruling draft | OpenAI, event key | 2026-11-04 |
| OpenAI hosted web search | External service | Web research through Codex | OpenAI, event key | 2026-11-04 |
| Sprint scripts: `tools/fh.py`, bridge, council runner | Local scripts in Python 3 | Context, content guard, vault checks, git hooks, session messaging, running seats | Written for this sprint | 2026-11-04 |
| Git and GitHub CLI | Developer tools | Local history, cloning repositories | GitHub, Mukul's account `divinedev111` | 2026-11-04 |
| Google Chrome | Browser | Portal and platform access | Google | 2026-11-04 |
| pdftotext | Local utility | Read the terms PDF | Open source | 2026-11-04 |
| Pi coding agent SDK 1.5.0 (@earendil-works/pi-coding-agent) | Coding agent SDK | Runs the planning, build and verification roles in the FleetHarness desktop app | Open source, added by teammate danjung9 | 2026-11-04 |
| Electron, React, Vite, TypeScript, Playwright, electron-builder | App framework and developer tools | FleetHarness desktop app, its build and its smoke tests | Open source, added by teammate danjung9 | 2026-11-04 |
| OpenAI Docs workflow | Local documentation skill | Read-only auth, credential storage, sandbox and app-server checks for the FleetHarness delta review | Local skill and official OpenAI documentation | 2026-11-04 |
| Codex collaboration tools | Local agent coordination | Two bounded source reviews supporting the QA plan, with a single organization runner owned by the main session | OpenAI, event profile | 2026-11-04 |
| FleetHarness synthetic QA acceptance pack 2026-11-04 | Synthetic test design data | Fixed message, scheduling, record-conflict and custom-register expectations in Research/QA/Test-Plan.md; not yet executed | Created for this sprint | 2026-11-04 |
| Command interface, version unavailable | tool | evidence reads | session runtime | 2026-11-04 |
| Patch interface, version unavailable | tool | document edits | session runtime | 2026-11-04 |
| Git 2.50.1 | tool | pinned source inspection | Git/Apple | 2026-11-04 |
| ripgrep 15.2.0 | tool | evidence search | ripgrep project | 2026-11-04 |
| Python 3.9.6 | tool | document/JSON validation | Python/Apple | 2026-11-04 |
| fh.py, repository version | script | attempted content guard | sprint tooling | 2026-11-04 |
| Synthetic officer examples, revision 1 | Synthetic acceptance dataset | Reused QA Officer examples for cases 11, 12 and 36 within the GUI acceptance matrix; execution pending | Created for this sprint | 2026-11-04 |
| Shell, patch and image interfaces, versions unexposed | tools | read, write and screenshot inspection | session runtime | 2026-11-04 |
| Web search/page reader, version unexposed | service | primary-source research | session web service | 2026-11-04 |
| Public product and design documentation, accessed November 4 | source collection | interaction research | publishers listed in [disclosure log](~/Documents/CDAO/Fleethacker-Vault/Research/RandE/UX/Sprint/Research-Log.md) | 2026-11-04 |
| Node.js v26.0.0 | JavaScript runtime | Builds and local synthetic QA scripts in the pinned qa-lead checkout | Node.js project, installed runtime | 2026-11-04 |
| UTC clock, version unavailable | Time service | Deadline check | Session runtime | 2026-11-04 |
| FleetHarness Stop-child fixture revision 1 | Synthetic test fixture | Prepared a bounded ordinary Pi shell and child shutdown check; syntax checked only in this QA assignment | Team-authored synthetic material | 2026-11-04 |
| macOS ps, installed system version | System diagnostic | Included in the prepared Stop fixture to inspect only recorded synthetic worker PIDs; not executed during preparation | Apple macOS | 2026-11-04 |
| Session clock, version unexposed | time service | dated review | session runtime. Shared-log handoff staged locally. | 2026-11-04 |
| Independent ID 11 browser acceptance variants revision 1 | Synthetic evaluation data | Prepared fixed extra scheduling cases before candidate inspection; browser execution belongs to main session | Created for this sprint | 2026-11-04 |
| Independent ID 11 browser checker revision 1 | QA tool | Prepared actual-page Chrome acceptance with fixed synthetic oracles, discovery limits, offline save/import and artifact receipts; only syntax and pure evaluator checks executed here | Created for this sprint | 2026-11-04 |
| Independent ID 11 browser checker revision 2 | QA tool | Added explicit adapters discovered from both candidate interfaces, retaining the frozen independent oracle and reporting unrepresentable cases | Created for this sprint | 2026-11-04 |
| zsh 5.9 and standard readers | shell | context reads | system distribution. | 2026-11-04 |
| Session execution/patch tools, versions unexposed | local operations | reads and notes | session environment. | 2026-11-04 |
| Node.js 26.0.0 | runtime | log comparison/tests | Node.js contributors. | 2026-11-04 |
| TypeScript 7.0.2 | compiler | Electron compilation | Microsoft. | 2026-11-04 |
| Patch and UTC clock interfaces, versions unavailable | local tools | documentation and timebox | session runtime. | 2026-11-04 |
| Codex CLI 0.166.0 | CLI | config parsing | OpenAI | 2026-11-04 |
| Pi SDK 1.5.0 | existing library | factory fixtures | Earendil Works | 2026-11-04 |
| Web search and [official documentation](https://developers.openai.com/codex/permissions/) | reference | profile format | OpenAI | 2026-11-04 |
| Local execution/patch tools | development | workspace edits | platform-provided | 2026-11-04 |
| Local shell and patch interfaces, versions unavailable | workspace tools | inspection and review records | session environment | 2026-11-04 |
| Playwright 1.64.1 | browser tests | existing regression suite | Microsoft | 2026-11-04 |
| otool, version unexposed | binary inspection | runtime dependencies | Apple | 2026-11-04 |
| Execution/patch tools, version unexposed | development | edits/checks | session platform | 2026-11-04 |
| [Permissions documentation](https://developers.openai.com/codex/permissions) | reference | profile syntax | OpenAI | 2026-11-04 |
| Node 26.0.0 | runtime/tests | synthetic fixtures | Node.js | 2026-11-04 |
| zsh 5.9 and local command/edit tools | tooling | changes/evidence | local runtime | 2026-11-04 |
| Python 3.9.6 queried; process inspection denied | tooling | environment checks | Apple | 2026-11-04 |
| Shell and patch interfaces, versions unavailable | workspace tools | evidence records | session environment | 2026-11-04 |
| FleetHarness detached Stop fixture rev1 | QA script | Prepared a bounded synthetic Pi detached-job Stop check using Node standard-library workers, PID identity, heartbeat observations and separate cleanup; runtime execution belongs to main | Team-owned local fixture | 2026-11-04 |
| FleetHarness Auto QA receipt d0f4c69 | Evidence dataset | Compared recurring test and GUI smoke results with pinned source and open findings; no fresh runtime execution by this review | Team QA runner | 2026-11-04 |
| Local shell/patch interfaces, versions unavailable | workspace tools | reads and journal | session environment | 2026-11-04 |
| Session clarification interface, version unexposed | coordination | requested host-side verification | session platform | 2026-11-04 |
| Runner scheduler audit probes revision 1 | Local diagnostic | Isolated in-memory checks of duplicate queueing, file-claim dispatch and review-return handling; no production runner execution | Sprint diagnostic using Python standard library | 2026-11-04 |
| System Perl, version unavailable | local editing attempt | blocked before execution | Apple. | 2026-11-04 |
| Round-1 ID 12 receipts | evidence dataset | judgment handoff | team benchmark. | 2026-11-04 |
| Codex 0.166.0 | local schema generator | verified usage and effort protocol fields | OpenAI | 2026-11-04 |
| Independent ID 11 Run2 browser adapter rev1 | QA adapter | Mapped actual Run2 form, visible results and two-step saved-file import to unchanged independent expectations; runtime receipt reviewed | Team-owned local QA | 2026-11-04 |
| Ten-challenge round 1 source and evidence pack | Evidence dataset | Read-only audit of ID 12, ID 11 and ID 36 code, generated tests and retained browser reports for semantic gaps and factory improvements | Team benchmark runner | 2026-11-04 |
| Round 1 synthetic receipts | evidence dataset | failure prioritization | team benchmark. | 2026-11-04 |
| Independent ID 11 browser checker revision 3 | QA tool | Distinguishes proven form limitations and out-of-brief summary expectations while preserving frozen evaluator and receipts; syntax and pure checks only here | Team-owned local QA | 2026-11-04 |
| macOS `/bin/ps`, system version unavailable | process inspection | native discovery attempted but sandbox denied | Apple. Existing tool versions and disclosure entries are recorded in the journal. | 2026-11-04 |
| Independent ID 11 Run2 browser adapter rev2 | QA adapter | Added explicit form-limitation and exact-brief scope reporting; preserved all 17 input mappings and frozen evaluator, with syntax and pure checks only | Team-owned local QA | 2026-11-04 |
| Workspace execution and apply_patch, session versions | Development tools | Local reads, edits and checks | OpenAI | 2026-11-04 |
| Round-1 synthetic artifacts | evidence dataset | QA coverage review | team benchmark. | 2026-11-04 |
| Ten-challenge round-one evidence pack complete 2026-11-04 | Synthetic source and QA dataset | Read all ten final card builds, generated tests, contracts and host reports for semantic gaps beyond the automatic bar; no candidate execution | Team-generated synthetic apps and main-owned benchmark | 2026-11-04 |
| Archived ID 12 R1 plan | Synthetic regression dataset | Reproduce generic-only bypass | Existing project QA evidence | 2026-11-04 |
| bsdtar 3.5.3 | archive extraction | exact-commit review copy | libarchive/Apple. Other tool disclosures are recorded in the journal. | 2026-11-04 |
| ID 16 synthetic artifacts | review dataset | app judgment | existing team benchmark. | 2026-11-04 |
| Round-101 synthetic receipts | evidence dataset | repair prioritization | team benchmark. | 2026-11-04 |
| System ps, version unavailable | diagnostic | denied process inspection | Apple. | 2026-11-04 |
| R101 synthetic receipts | evidence dataset | QA coverage review | team benchmark. | 2026-11-04 |
| Retained ID 37 artifacts | Synthetic review dataset | Diagnosis | Project benchmark. | 2026-11-04 |
| macOS pkill, version unverified | process utility | unsuccessful stop attempt | Apple. | 2026-11-04 |
| R101 synthetic benchmark records | evidence dataset | decision review | team. | 2026-11-04 |
| Codex TUI task tools, session version unspecified | Local task coordination | Inspect and coordinate existing Fleethacker Codex tasks under the user management instruction | OpenAI | 2026-11-04 |
| Detached Pi Stop fixture, pinned 0da7ce9 revision | QA tool | Reuse the measured detached-worker case with the integrated revision pin and current UI selectors; syntax and pure validation only here, native runtime owned by main | Team-created fixture, reusing the d0f4c69 regression | 2026-11-04 |
| R3 challenge 12 packet | synthetic benchmark evidence | failure diagnosis | project benchmark. | 2026-11-04 |
| R3 synthetic benchmark records | evidence dataset | engineering prioritization | project benchmark. | 2026-11-04 |
| Runner scheduler audit probes revision 2 | Local diagnostic | Reproduce conflict-retry ownership loss and verify a reviewable scheduler patch with synthetic queue state | Project-local Python tooling | 2026-11-04 |
| Apple adv_cmds ps source, main read 2026-11-04 | Public source reference | Read option parsing and environment rendering to diagnose the native process-sweep argument vector; no source compiled or executed | Apple Open Source Distributions on GitHub | 2026-11-04 |
| Round 3 cleanup receipts, first three completed builds | Evidence dataset | Read final status and verification summaries for ID 12, ID 36 and ID 11 alongside the running sweep source; distinguish cleanup confirmation failure from proven surviving work | Team benchmark runner, reported f662d81 plus scratch patches | 2026-11-04 |
| Detached Pi Stop fixture, pinned 16a6940 revision | QA tool | Prepared unchanged independent Stop regression at the corrected integrated source; syntax and pure validation only here | Team-created fixture | 2026-11-05 |
| Automatic QA reports and runner source, rechecked 2026-11-05 | Evidence dataset | Compared reported revision, retained checkout, reflog, smoke stack and ignored preparation return codes | Team runtime owner | 2026-11-05 |
| STOP-DETACHED-01 native receipt 6b784ff0 at 16a6940 | Evidence dataset | Independently verified bounded native shutdown, control and artifact hashes, identity, timing and cleanup separation | Existing runtime owner | 2026-11-05 |
| Overnight detached Pi Stop fixture revision 1 | QA tool | Removed the fixed commit and checkout pin, records actual clean revision/build identity, retains all measured Stop assertions | Team-created acceptance fixture | 2026-11-05 |
| Existing parallel QA reviewers, overnight source mapping | Review workflow | Read-only UI inventory and test evidence mapping for combined merge-dan; two existing event-key reviewers, no runtime or repository edits | Existing event-key review agents | 2026-11-05 |
| Collaboration task tools, session version unspecified | Local parallel review | One bounded read-only reviewer checks committed browser-helper merge for lost behavior while the coordinator audit proceeds | OpenAI | 2026-11-05 |
| Overnight desktop input and OAuth GUI checker revision 1 | QA tool | Prepared synthetic native input limits, key-field rejection and clearing, and real loopback login start/reopen/cancel; syntax and pure controls only here | Team-created QA fixture using installed Electron and Playwright | 2026-11-05 |
| Overnight browser storage recovery checker revision 1 | QA tool | Prepared five isolated local-preview storage cases with independent recovery controls and source/build identities; syntax and pure controls only here | Team-created QA fixture using installed Playwright and Chrome | 2026-11-05 |
| Judge evidence-binding probe revision 1 | Local diagnostic | Inject a synthetic late application change into the pinned production judge persistence function to check evidence identity | Project-local Node tooling | 2026-11-05 |
| Overnight native Stop restart Resume checker revision 1 | QA tool | Prepared real-UI Stop, full Electron restart and resumed implementation using owned phase-gated local provider and saved-artifact comparisons; pure validation only here | Team-created QA fixture reusing the repository synthetic provider | 2026-11-05 |
| Overnight GUI checker adapters revision 2 | QA tool | Adapted desktop key and OAuth controls, detached Stop and native Resume to the four Model connection tabs while retaining their substantive assertions | Team-created fixtures using installed Electron and Playwright | 2026-11-05 |
| Node.js built-in inspector and vm checker probes | QA diagnostic | Reproduced unsupported dynamic import in the OAuth interceptor and validated an import-free replacement with synthetic routing data; no app or network listener | Node.js built-in modules | 2026-11-05 |
| d6f8750 combined acceptance receipts | Synthetic QA dataset | Reviewed four native/browser receipts and screenshots to separate stale test adapters from a reproduced saved-state startup defect | Main-owned local acceptance execution | 2026-11-05 |
| Combined acceptance receipts at 3da8ad8 | Synthetic native and browser evidence dataset | Independently reviewed input, OAuth-control, browser recovery, detached Stop and full restart Resume receipts; retained scopes and remaining gaps | Event team runtime owner | 2026-11-05 |
| Native persisted-baseline Resume checker revision 1 | QA script | Prepared exact token.test.cjs baseline preservation through native Stop, full Electron restart and resumed verification progress; syntax and pure controls only here | Event team QA | 2026-11-05 |
| Native build review and source-delivery checker revision 1 | QA script | Prepared independent literal input/output checks through native preview, review gates, stale source denial, real source export and fresh offline exported-copy browser; native execution belongs to main | Event team QA | 2026-11-05 |

## Data and sources

| Source | Type | Used for | Notes |
| --- | --- | --- | --- |
| Event portal data and notifications | Event data | Vault notes, use case summaries | Snapshot in `Sources/raw/` |
| Event documents 2, 4 to 11 and 13 | Event documents | Vault notes | Document 6 not transcribed |
| Event document 12, first sheet | Event document | Team names only | The second sheet was not used |
| Public web sources | Public data | Everything under `Research/` | URLs are in each note |
| 34 submitted use cases | Event data | `UseCases/`, `Research/UseCase-Map/` | Written by participants |

No project code or test data exists yet. Add datasets here when they do, and mark synthetic data as synthetic.

## Studied, not run or included

Read for ideas only. Move a row to Used, and to [[Sprint/Prior-Work-Log]], if any of its code enters the project.

| Project | Commit read | License | Verdict so far |
| --- | --- | --- | --- |
| SWE-AF | ef26ffb | Apache License | Borrow ideas |
| SuperPlane | 7d755d1 | Apache 2.0 core, separate terms for `ee/` | Borrow ideas |
| OpenAI Symphony | be10a1b | Apache 2.0 | Borrow ideas |
| Aperant | 20250db | AGPL | Borrow ideas |

## On offer, not used yet

Google Antigravity, Gemini Enterprise, Agent Builder and Gemini Notebook; Cursor, Grok Build and Grok Bot; Ark, UDS and Zarf; Prometheus Forge. See [[Resources/Documents]].
