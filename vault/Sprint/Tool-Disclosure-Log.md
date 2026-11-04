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
