---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "SWE-AF best matches build and repair, while FleetHarness must own officer requirements, approvals, evidence and reusable deliverables."
---

# FleetHarness fit

## Bottom line

[R] Borrow SWE-AF's implementation and repair patterns while FleetHarness owns requirements, acceptance evidence and human decisions. [E] The classic code is strongest in scheduling coding work, worktree management and bounded repair (`go/internal/dag/`, `go/internal/coding/`). [E] It does not provide a dedicated officer intake flow, a systematic reuse-research stage or a proven component catalog in the inspected orchestration. [P] The event rewards impact and disconnected fieldability, so an elaborate connected development factory alone does not establish a strong entry ([[Event/Judging]]).

## Mapping to the seven pipeline steps

[P] Step names and intended outcomes come from `~/Documents/CDAO/FleetHarness/README.md`, read on 2026-11-04. [E] Code observations refer to SWE-AF commit `ef26ffbf61496387d7ba554e83799cb5385804d0` and the classic path with Pro disabled.

| FleetHarness step | SWE-AF implementation | Fit and remaining work |
| --- | --- | --- |
| 1. Ingest a use case | [E] Goal, additional context, repository and config enter `go/internal/orch/build.go`; PM produces a PRD. Optional ask-user/environment discovery uses HAX (`go/internal/orch/plan.go`, `go/internal/roles/planning/`). | [R] Partial. Add plain-language intake for user, burden, data classification, inputs/outputs, constraints and human-owned success criteria. Make approval mandatory before build. |
| 2. Research existing solutions | [E] Architect can inspect repositories and use harness tools, but `Plan` has no explicit research stage or reusable-source evaluation artifact. Optional web search is delegated to OpenCode (`swe_af/tools/web_search.py`). | [R] Weak. FleetHarness needs explicit alternatives, source URLs, licenses, reuse decisions and security constraints before implementation. |
| 3. Plan the implementation | [E] PM, architect, tech lead, sprint planner, issue writers, dependency levels and file-conflict checks are implemented (`go/internal/orch/plan.go`, `go/internal/dagutil/dagutil.go`). | [R] Strong structural match. Text acceptance criteria and testing guidance do not guarantee executable acceptance tests exist before coding. Have the team supply and lock critical fixtures and expected results. |
| 4. Build the application | [E] Per-issue worktrees, bounded concurrency, runtime/model routing and deterministic Git are implemented (`go/internal/dag/`, `go/internal/roles/coding/coding.go`). `implement_issue` offers a smaller integration contract. | [R] Strongest match. Require successful workspace isolation and constrain shell/network access. Keep the current working Codex path unless a small authorized trial proves this saves time. |
| 5. Test and repair | [E] Coder/reviewer loop, optional QA/synthesizer, advisor, integration tester, PRD verifier and generated fixes are present (`go/internal/coding/loop.go`, `go/internal/orch/build.go`). | [R] Strong mechanism, incomplete assurance. Independently run tests on the final commit; fail on unavailable review, unmet required criteria or CI errors. Preserve original requirements through scope changes. |
| 6. Package and demonstrate | [E] Finalizer, commits, structured result, optional PR and CI evidence exist (`go/internal/roles/gitops/finalize.go`, `go/internal/orch/build.go`). | [R] Partial. Add installation instructions, immutable test evidence, demo fixtures, known limitations and network-off demonstration. Finalizer cleanup can remove evidence and alter the verified tree. |
| 7. Reuse what works | [E] Multi-repository manifests and optional build-scoped shared learning help subsequent issues; default learning is off (`go/internal/config/buildconfig.go`, `go/internal/coding/memory.go`). | [R] Weak across use cases. Add a small catalog of validated adapters/components with versions, licenses, interfaces and tests. Build-scoped memory is not a proven cross-project reuse registry. |

## Event rules and judging

| Obligation | Consequence for a SWE-AF-based entry |
| --- | --- |
| [P] Rule 5, authorized resources and disclosure | [R] List SWE-AF and commit, AgentField, actual agent CLI and model IDs, model provider, datasets, search service, GitHub, containers and optional HAX/Furrow/Pro services used. Distinguish evaluated from actually used. Open-source licensing does not itself confirm event account authorization. |
| [P] Rule 7, prior work | [R] Identify upstream orchestration and examples as pre-existing. Claim event credit for FleetHarness intake, approvals, fixtures, integrations and measured results actually produced during the event. Record borrowed source separately with upstream paths and commit. |
| [P] Rule 6, human authority | [R] Require acceptance of requirements and design, an explicit external-action gate, visible prohibited actions, escalation on failed checks, a monitored activity trail and a tested stop mechanism. Built-in optional plan approval does not satisfy all of these by itself. |
| [P] Rules 4 and 9, permitted data and Fleet conditions | [R] Use synthetic/public inputs only and demonstrate the delivered application's disconnected operation. Keep restricted inputs out of model APIs, traces, workspace mirrors and PRs. |
| [P] Impact 30%, speed to Fleet 20% | [R] Show one officer workflow with measured steps/time removed and a runnable offline result. A faster code-generation claim is not the same as time returned to a watchstander. |
| [P] Scalability 20%, barrier removal 15%, discretion 15% | [R] Reuse the same evidence-producing workflow on two or three distinct challenge types, document infrastructure and approval barriers, and show honest failure status. Avoid a dashboard that merely counts generated repositories. |

[P] Event requirements above summarize [[Event/Rules]] and [[Event/Judging]], which state that the portal remains authoritative. [R] The logs embedded in [[Research/Projects/SWE-AF/Claims-vs-Evidence]] are ready for the council integrator to transfer into Sprint records.

## License and terms sections 5 to 8

[E] The inspected repository's root `LICENSE` is Apache-2.0 and identifies AgentField Contributors. [V] Apache-2.0 permits use, modification and redistribution, subject to license/notice retention and marking modified files; it includes a conditional patent grant, no general trademark grant and warranty/liability limitations: https://www.apache.org/licenses/LICENSE-2.0 . [R] Preserve the license and applicable attribution notices, identify changed files and review any dependency or bundled binary terms before distribution. Using the orchestration does not establish ownership or clearance of every generated output or dependency.

| Terms section | Application |
| --- | --- |
| 5, pre-existing IP | [P] The event summary requires respecting third-party licenses and identifying pre-existing material; participation does not transfer ownership of it ([[Event/Terms]]). [R] Record SWE-AF commit and copied paths before use. Include Apache notices if source is copied or redistributed. |
| 6, government participants | [P] New work receives the government rights stated in the event terms, with pre-existing material separately identified ([[Event/Terms]]). [R] Describe upstream SWE-AF as third-party Apache-licensed material; do not claim to transfer new ownership in it. Obtain applicable agency approvals. |
| 7, non-government participants | [P] The summary describes a broad government-purpose license to new work and requires ownership/restriction disclosure ([[Event/Terms]]). [R] Identify employer-owned contributions and upstream material separately; do not promise rights beyond those actually held. |
| 8, software licenses | [P] Each tool remains subject to its own license and event access creates no lasting rights ([[Event/Terms]]). [R] Treat model API access, coding CLIs, Docker distribution and hosted review/search services as separate dependencies. Keep a sustainable post-event route. |

[E] This review read the vault's `Event/Terms.md` summary of terms v1.1 rather than the governing signed PDF. [R] Have the responsible team member verify submission wording against the governing terms and their participant category. [E] Pro is shipped as prebuilt binaries with wrapper source; its internal source and binary-specific provenance were not verified. [R] Keep it disabled and do not present the classic source review as an audit of those binaries.

## Practical plan for the remaining time

1. [R] Keep a thin FleetHarness flow: officer approves problem and expected outcomes, developer starts one bounded coding task, tests run independently, human approves the demo result.
2. [R] Borrow SWE-AF's issue schema, branch/worktree isolation and explicit failure/debt states. Preserve original criteria and logs outside agent cleanup paths.
3. [R] Build one complete synthetic workflow first, then reuse the process on a distinct case. For message parsing, check source references and ambiguous inputs; for scheduling, check infeasible constraints; for offline sync, test conflicting changes and reconnection.
4. [R] Use a short classic `implement_issue` experiment only if another team member can own setup without delaying those demonstrations. Stop the experiment if registration, credentials or basic tests are still unresolved at the two-hour decision point.

## Sources

- https://github.com/Agent-Field/SWE-AF/tree/ef26ffbf61496387d7ba554e83799cb5385804d0
- https://github.com/Agent-Field/SWE-AF/blob/ef26ffbf61496387d7ba554e83799cb5385804d0/LICENSE
- https://www.apache.org/licenses/LICENSE-2.0

[E] Local event sources read: `~/Documents/CDAO/Fleethacker-Vault/Event/Rules.md`, `Event/Judging.md`, `Event/Terms.md`; project source: `~/Documents/CDAO/FleetHarness/README.md`. Event notes point to the authoritative portal and governing terms.
