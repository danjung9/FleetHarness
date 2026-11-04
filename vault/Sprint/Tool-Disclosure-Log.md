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
