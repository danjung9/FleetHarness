---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Aperant provides useful middle-pipeline patterns but leaves mission acceptance, deployment, and governance to FleetHarness."
---

# FleetHarness fit and event obligations

## Bottom line

[R] Borrow Aperant's task artifacts and workflow ideas, and keep the sprint's execution engine small. [E] The inspected implementation is strongest in specification, code orchestration, and review bookkeeping, with weaker guarantees for independent tests and enforced approval (`ai/orchestration/`, `agent/agent-manager.ts`, and task handlers at `20250db`). [P] FleetHarness's README requires working applications, measurable acceptance, human authority, and reproducible demonstrations. [R] With about 27 hours remaining, fixing and integrating a large desktop engine would consume time better spent proving those outcomes on synthetic mission tasks.

## Seven-step mapping

[P] Step names and intended outcomes come from `/Users/mukul/Documents/CDAO/FleetHarness/README.md`. [E] Code evidence below is from direct inspection of `20250db`; `ai/` abbreviates `apps/desktop/src/main/ai/`.

| FleetHarness step | Aperant coverage | What FleetHarness still needs | Decision |
| --- | --- | --- | --- |
| 1. Ingest a use case | [E] `agent/agent-manager.ts`, `startSpecCreation`, accepts free text, project path, metadata, and file context; spec discovery and gathering create context and requirements artifacts. | [R] Officer-facing questions for user, burden, allowed data, inputs, outputs, constraints, ownership, and measurable success; explicit approval of the resulting requirements. | [R] Borrow the artifact structure; build a simpler mission intake. |
| 2. Research existing solutions | [E] Complex spec routing includes `spec_researcher`; web tools and Context7 can retrieve external material. Simpler routes can skip research. | [R] Make reuse and license research explicit for every use case; record URLs, revisions, alternatives, and why the chosen component fits. Prevent retrieved content from changing authority. | [R] Borrow the research artifact, with required evidence and review. |
| 3. Plan the implementation | [E] Spec writing, critique, schema-validated `implementation_plan.json`, phase/subtask entries, and retry feedback exist in `ai/orchestration/spec-orchestrator.ts`. | [R] Freeze approved acceptance cases, include negative and boundary cases, and implement a gate that actually blocks coding. Schema-valid plans do not prove requirements are satisfied. | [R] Borrow plan validation; write independent executable acceptance tests. |
| 4. Build the application | [E] Provider-backed coder sessions execute local tools; `ai/worktree/worktree-manager.ts` separates tasks into branches and directories. | [R] Fail closed on isolation failure, prevent automatic publication, use a constrained execution environment, and integrate the confirmed model/tool access. | [R] Borrow worktree patterns; skip engine integration this sprint. |
| 5. Test and repair | [E] Reviewer/fixer prompts and loops exist. Normal build QA accepts report text; subtask completion can be inferred from a limit-ended session. | [R] Run the frozen acceptance suite outside the model's report-writing path, preserve exit codes, impose time and cost limits, and keep failures visible. | [R] Borrow bounded retries and escalation; replace the success gate. |
| 6. Package and demonstrate | [E] The merge path applies/stages code; reports and changelog generation exist. Electron package scripts package Aperant itself. | [R] Produce setup instructions, dependency pins, synthetic inputs, launch commands, test evidence, limitations, and a fresh-checkout demonstration for each generated application. | [R] Build the delivery contract explicitly. |
| 7. Reuse what works | [E] Local memory, discoveries, gotchas, and optional cross-session retrieval exist under `ai/memory/` and `ai/tools/auto-claude/`. | [R] Maintain tested, versioned components with licenses and known limitations. Memory text is not a verified reusable software library. | [R] Borrow discovery records; create a small proven-component catalog. |

## Fit to the three proposed demonstrations

| FleetHarness proof of concept | Role Aperant could play | Required evidence beyond generated code |
| --- | --- | --- |
| [P] Operational-message parsing | [A] Could generate an application and parser tests through its ordinary coding flow. | [R] Public or synthetic messages, expected structured outputs, source references, ambiguity handling, and rejection cases. No sensitive message corpus. |
| [P] Training schedule deconfliction | [A] Could scaffold a solver-backed application, but no inspected orchestration path provides a domain scheduling solver itself. | [R] Independently checked hard constraints, an infeasible case, and a small known-correct schedule. Use synthetic people and resources. |
| [P] Offline-first workflow | [A] Could write synchronization code online; this says nothing about resulting offline correctness. | [R] Disconnect the application, edit locally, restart it, reconnect, and demonstrate conflict handling and durable synchronization. |

## License and prior work

[E] The root `LICENSE` contains GNU Affero General Public License version 3, and both package manifests identify AGPL-3.0. The README mentions a possible commercial license, but no commercial agreement was inspected. [R] Use the actual license file rather than the README's simplified explanation.

[E] `LICENSE` section 2 permits running the unmodified program and says output is covered only when its content constitutes a covered work. [R] Do not label every independently generated application AGPL merely because Aperant helped build it. Review generated files for copied Aperant code, templates, prompts, or other third-party material.

[E] License sections 4 to 6 require preservation of notices and impose conditions when conveying copies or modified versions, including corresponding source for covered object-code distributions. Section 5 applies AGPL to the covered modified work as a whole; its aggregate provision distinguishes separate independent works. [R] Copying engine modules into FleetHarness needs a compatibility and distribution decision. Reimplementing general workflow ideas should still be documented as design prior work, but is different from copying source.

[E] Section 13 requires a modified network-interactive version to offer its corresponding source to remote users. [R] A team-hosted modified Aperant service needs a source-offer plan; do not rely on a local-only development arrangement to justify a later hosted deployment. [A] The exact combined-work boundary for a proposed FleetHarness integration has not been legally reviewed.

## Rules 5 and 7, terms sections 5 to 8

[P] These interpretations use the local event summaries in `Event/Rules.md` and `Event/Terms.md`, read on 2026-11-04. The portal and full signed terms govern; they were not rechecked for this seat. [R] Treat this as an engineering compliance map, with ownership decisions retained by the team.

| Requirement | Consequence for using Aperant |
| --- | --- |
| [P] Rule 5: authorized resources and tool disclosure | [R] Record Aperant revision/license, actual model and account type, datasets, model endpoint, web search/browsing, MCP helpers, optional diagnostics/memory, and hosting actions. A sponsor account or bundled credential does not by itself establish authority for every service. |
| [P] Rule 7: distinguish prior work | [R] Identify Aperant and any copied modules/prompts before use; list event-created adapters, tests, UX, and fixes separately. Do not present an imported software factory as an event-built capability. |
| [P] Terms section 5: preserve third-party IP and identify pre-existing material | [R] Keep the AGPL license and notices, exact revision, provenance, and a list of reused material. The event does not transfer upstream ownership to the team. |
| [P] Terms section 6: government participant work and unlimited rights | [R] Confirm participant status and approvals. Identify pre-existing AGPL material separately; do not represent third-party source as wholly government-created work. Deliver event-created work and its rights with the required records. |
| [P] Terms section 7: non-government participant rights and government license | [R] Confirm employer authorization where applicable and document ownership/restrictions. The grant for new work does not erase upstream license obligations or undisclosed third-party restrictions. |
| [P] Terms section 8: each tool's own license; event access creates no lasting rights | [R] Preserve AGPL obligations and separately check model/service terms. Plan for event credentials to expire. An unverified commercial-license offer is not permission to distribute a closed derivative. |

[R] AGPL and the event's government-rights language are not automatically incompatible. The practical requirement is accurate separation of existing licensed material and event-created work, plus a delivery and source-compliance plan. Do not claim the team can relicense upstream Aperant code under unlimited rights simply because new work is submitted at the event.

## Human authority and Fleet conditions

[P] Rule 6 requires approval points, prohibited actions, monitoring, escalation, and shutdown. Rule 9 requires consideration of limited connectivity and sustainment. [E] Aperant has useful review and stop states, but code observations show incomplete pre-code approval, automatic branch publication defaults, host-shell execution, and project-root fallback. [R] Those are deployment and demo constraints, not cosmetic gaps.

[R] Define the permitted agent scope as changes to one disposable synthetic project. Prohibit sensitive data access, publication, credential handling for others, and operational-system actions. Require human approval of requirements and final integration, show test and tool logs, escalate repeated failures, and expose a stop control that terminates the execution environment.

[P] `Event/Judging.md` assigns 30% to mission impact and 20% to speed to Fleet, including disconnected edge conditions. [R] Demonstrate a measurable burden reduction and an application that still works when disconnected. An orchestration dashboard or a count of generated repositories does not establish either outcome.

## Sprint recommendation and next experiment

[R] Adopt no Aperant runtime dependency for the current submission. Use its structure as a design reference: requirements artifact, approved plan, isolated task workspace, executable acceptance run, bounded repair, human integration review, and a reproducible demo bundle. Keep the number of use cases small enough to validate honestly.

[R] If a separate engineer can perform an authorized trial without taking time from the mission demo, cap it at one hour to prove API authentication and one tiny task. Stop on native-install, auth, or routing blockers. The trial must use a disposable repository, publication disabled, no sensitive data, and a test that first fails. Do not call the package adopted until the reversal conditions in [[Research/Projects/Aperant/README]] are met.

[R] For follow-on work, name a mission owner and technical owner before adoption. In 30 days, compare the current minimal harness with a controlled Aperant trial on the same three synthetic tasks. In 60 days, test isolation, approvals, licensing delivery, and disconnected build options. In 90 days, consider a pilot only after owner-approved acceptance and a sustainment plan. [A] Owners and resources have not been assigned in this assessment.

## Sources

- [P] FleetHarness pipeline: `/Users/mukul/Documents/CDAO/FleetHarness/README.md`.
- [P] Event requirements: [[Event/Rules]], [[Event/Terms]], [[Event/Judging]], and [[Research/00-Brief]].
- [V] Source at inspected revision: https://github.com/AndyMik90/Aperant/tree/20250db069a849ab001ac6ab9e3e9779886ab9e2
- [V] License file: https://github.com/AndyMik90/Aperant/blob/20250db069a849ab001ac6ab9e3e9779886ab9e2/LICENSE
- [V] Project license and product claims: https://github.com/AndyMik90/Aperant
