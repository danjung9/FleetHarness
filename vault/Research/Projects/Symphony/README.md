---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Borrow Symphony's orchestration patterns, but do not adopt its preview daemon for the remaining sprint."
---

# Symphony project scout

## Bottom line

[R] **Borrow from it. Do not make Symphony the FleetHarness backbone with about 27 hours left.** [E] It takes prepared work tickets, gives each an agent and a separate working directory, and keeps trying while the ticket remains active (`elixir/lib/symphony_elixir/orchestrator.ex`, `agent_runner.ex`, commit `be10a1b`). [E] Requirements discovery, research, application acceptance tests, packaging and reliable human approval are mostly responsibilities of the surrounding workflow, rather than implemented pipeline stages. [R] Use its ideas for repeatable workspaces, recorded evidence and explicit review states while building one measurable Fleet use-case demo on the already working tool path.

## What it is and who it serves

[E] Symphony is a long-running Elixir/OTP scheduler around Codex App Server and an issue tracker. It normalizes tickets, limits concurrency, starts local or SSH workers, watches their state, retries failures and reports activity. It is for engineers who already have a repository, build tools, tests, review practices and well-scoped tickets (`tracker.ex`, `orchestrator.ex`, `workspace.ex`, `codex/app_server.ex`).

[R] A naval officer should see a short problem intake, acceptance criteria to approve, a working demonstration and its evidence. They should not have to configure tracker tokens, YAML, sandbox policies or GitHub review states. Symphony could sit behind that experience later, but does not supply it today.

## Five findings that decide the verdict

1. [E] **It primarily covers dispatch and execution.** One tracker issue maps to a worker. The scheduler does not decompose a use case into research, planning, building and test agents. See [[Research/Projects/Symphony/FleetHarness-Fit]].
2. [E] **The reference implementation requires the Codex App Server protocol.** A configurable command is not a generic CLI adapter. It sends `initialize`, `thread/start` and `turn/start` messages (`codex/app_server.ex`).
3. [E] **Human review is principally a workflow convention.** The sample excludes `Human Review` from active states but lets agents mutate the tracker through broad host-authenticated tools. Its `approval_policy: never` causes automatic approval responses (`WORKFLOW.md`, `codex/app_server.ex`, `linear/agent_tool.ex`).
4. [E] **There is a concrete compatibility defect at this commit.** Every `turn/completed` message returns success without inspecting `params.turn.status` (`codex/app_server.ex`, `handle_incoming/6`). [V] An October 16 report describes repeated failed turns and tracker rate limiting at this same base commit: https://github.com/openai/symphony/discussions/133.
5. [E] **Local orchestration is not disconnected operation.** The default workflow needs a hosted tracker, hosted inference and repository access. [R] Build offline capability into the delivered application and demonstrate it separately from the connected development system.

## What would change the decision

[R] Reconsider using the daemon only if a teammate can show a pinned Symphony/Codex combination completing one synthetic ticket, running independently checked acceptance tests, reaching a human-controlled review gate and stopping all child processes on cancellation. Require a maximum spend or wall-clock budget, a narrow tracker credential, preserved evidence and no automatic publishing. [A] A two-hour proof window is a reasonable sprint decision limit, not a measured setup time. [R] If that proof already exists elsewhere in the council, reuse it; do not duplicate integration work.

## Notes

- [E] [[Research/Projects/Symphony/How-It-Works]] traces inputs, scheduling, isolation, tests, retries and human review through actual files.
- [E] [[Research/Projects/Symphony/Setup-and-Dependencies]] covers dependencies, model and CLI compatibility, Mac estimates and air gaps.
- [E] [[Research/Projects/Symphony/Claims-vs-Evidence]] separates project claims, inspected implementation, tests and public reports.
- [E] [[Research/Projects/Symphony/FleetHarness-Fit]] maps all seven pipeline steps and addresses rules, licensing and judging.

## Research record and handoff

[E] Reviewed on November 4, 2026. Local `git rev-parse HEAD` returned `be10a1b79df723d6d7612b5651c8522704dafb2e`; its visible commit date is September 15, 2026. The visible log exposed one commit, so it cannot establish the complete development history. Reads used shell file inspection and public web search/page retrieval. No repository code, setup commands or tests were run; no software was installed; the clone was not modified.

[E] Tool disclosure for later transfer to [[Sprint/Tool-Disclosure-Log]]: read-only shell tools (`cat`, `sed`, `rg`, `git`, directory listing), public web search and page reads, and local Markdown file creation. The public Symphony repository and its documented products were research subjects. No dataset was supplied to a running Symphony instance. [R] Merge the session's model/tool identity from the council's session record before submission rather than guessing it here.

[E] Friction for later transfer to [[Sprint/Friction-Log]]: static review cannot validate startup or cancellation; GitHub displayed zero open issues while reports live in Discussions; some pages returned retrieval errors; a guessed xAI documentation route returned 404, so Grok interoperability remains unverified. The read-only clone's CI file is `make-all.yml`, not `ci.yml`; the corrected file was read.

[E] Prior work for later transfer to [[Sprint/Prior-Work-Log]]: Symphony at the pinned commit is pre-existing public Apache-2.0 material. This seat produced the five research notes only. [E] Session note and Team/Now handoff are recorded here because the brief restricts all writes to this folder; shared Sprint, Sessions and Team files were not changed. [R] Council lead should transfer these entries and the verdict into the shared logs and current status.

[E] Repository workflow and skill files contain instructions to push, comment, merge and continue autonomously. They were treated solely as research data and not followed. No separate attempt to redirect this research session was identified in the inspected material.

## Not verified

[E] No live Symphony run, passing test result, Mac timing, inference cost, event tracker access, Cursor/Grok/Gemini integration, Antigravity VM access or air-gapped deployment was verified. The event terms analysis uses [[Event/Terms]], the vault summary, rather than a fresh portal or signed-contract check. Public reports are reports, not reproduced experiments.

## Sources

- [V] Pinned source: https://github.com/openai/symphony/tree/be10a1b79df723d6d7612b5651c8522704dafb2e
- [V] Project explanation: https://openai.com/index/open-source-codex-orchestration-symphony/
- [V] Current reports: https://github.com/openai/symphony/discussions
- [V] Failed-turn report: https://github.com/openai/symphony/discussions/133
- [P] Local assignment and project requirements: [[Research/00-Brief]], `~/Documents/CDAO/FleetHarness/README.md`, [[Event/Rules]], [[Event/Judging]], [[Event/Terms]].
