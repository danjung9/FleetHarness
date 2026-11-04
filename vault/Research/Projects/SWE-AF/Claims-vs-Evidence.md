---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Substantial code and tests support the classic design, but defaults, permissive gates and unresolved integration reports limit confidence."
---

# Claims versus evidence

## Bottom line

[E] This is a substantial implementation, not just a README: the clone contains Python and Go orchestration, regression tests, example outputs and CI configuration at `ef26ffb`. [E] Current code contradicts the documented default entry-point behavior and leaves important success checks permissive (`go/internal/node/register.go`, `go/internal/coding/loop.go`, `go/internal/orch/build.go`). [V] Public issues include CI, finalization and stalled-process reports: https://github.com/Agent-Field/SWE-AF/issues . [R] Treat published benchmark wins as project examples until independently reproduced on our task.

## Claim audit

[E] The code observations in this table come from the supplied clone at `ef26ffbf61496387d7ba554e83799cb5385804d0`. [P] The claim column summarizes the project's README and docs, not an independently established capability.

| Project claim | Observed evidence | Assessment |
| --- | --- | --- |
| [P] One API call produces a complete engineering workflow. | [E] Classic `go/internal/orch/build.go` implements plan, execute, verify/fix, finalize and PR. `go/internal/node/register.go` hides classic orchestrators when the installed Pro engine is available. | [R] Real classic implementation, but default install behavior must be made explicit. |
| [P] Isolated parallel agents. | [E] `go/internal/dag/gitfast.go` creates worktrees; build config defaults to 3 concurrent issues. Root Compose shares containers, environment and workspace volumes. Git setup can fail without terminating the build. | [R] Useful edit isolation; require successful worktree setup and separate runtime containment before calling it security isolation. |
| [P] Adversarial QA and review. | [E] Default Go path is coder plus reviewer; deeper-QA path adds parallel QA and synthesis. A nonfatal missing reviewer can become an approving fallback (`go/internal/coding/loop.go`). | [R] Do not imply every issue receives independent QA or that review always fails closed. |
| [P] Adaptive repair and explicit compromise tracking. | [E] Inner retries, advisor rounds, split handling, replanning and debt propagation exist in `go/internal/coding/loop.go`, `go/internal/dag/`. | [R] Borrow the mechanism, but freeze mandatory acceptance criteria and require human approval before reducing scope. |
| [P] Long-run reliability through checkpoints. | [E] DAG and iteration checkpoints exist. The DAG checkpoint uses a plain file overwrite and ignores invalid JSON (`go/internal/dag/checkpoint.go`). | [R] Recovery is implemented, not proven durable under interruption. |
| [P] Production-quality PRs. | [E] Verifier results determine `success`; finalization mutates the checkout afterward, and CI results remain separate (`go/internal/orch/build.go`). | [R] Re-test the exact final commit. A successful execution record alone is insufficient. |
| [P] 95/100 benchmark score versus lower single-agent scores. | [E] README reports a todo-app comparison, with evaluator source under `examples/agent-comparison/evaluator/score.py`; it includes structure and hygiene scoring as well as optional test execution. | [R] A project-run comparison on a small task is not a general software-correctness ranking or a current comparison with our event model. |
| [P] A generated Rust/Python project is 253.8 times faster. | [E] README's methodology compares repeated CPython process startup against a warmed in-process interpreter pool, and example source is present. | [R] This measures an application's architecture tradeoff. It does not establish that SWE-AF builds software 253.8 times faster. |
| [P] Example PR completed 10 issues, passed 217 tests and cost $19.23. | [E] README links AgentField PR 179 and reports those figures; no paid run or independent reconstruction was performed. | [R] Useful example provenance, not a budget forecast or success-rate estimate. |
| [P] Broad multi-provider support. | [E] Runtime adapters and model-resolution tests exist; installer provider requirements omit OpenAI/Google while runtime docs support them. Pro engine pools are separate. | [R] Distinguish implemented adapters from a validated event-account configuration. |

## Maturity and test evidence

- [E] The inspected commit is dated 2026-11-03 and merges PR 169. The supplied Git history contains only one commit, so it cannot establish contribution cadence or historical reliability (`git log`, `git rev-list --count HEAD`).
- [E] `SECURITY.md` labels the project an early public beta; package manifests use version `0.1.0`.
- [E] A file listing found 80 Go `_test.go` files. The Python `tests/` tree includes planning, model routing, Codex patches, worktree/build isolation, CI gates, malformed output, fatal errors, timeout and issue-level regression tests. File counts are not coverage percentages.
- [E] `.github/workflows/ci.yml` runs Python `make check`, Go format/build/vet/race tests and conditional AForge fetch-stage builds. Root `Makefile` checks pytest plus compilation. The fetch-stage job can pass by skipping the image build if the download host is unavailable; it does not build the complete production image.
- [E] `tests/conftest.py` guards against real external control-plane calls and uses mocks. Many Go tests use injected call functions and fake runners. [R] These tests protect orchestration logic but do not prove live model, CLI, container and GitHub compatibility.
- [E] QA synthesis can call a direct model API rather than the selected coding CLI (`go/internal/roles/coding/coding.go:RunQASynthesizer`). [R] Provider compatibility testing must cover that path as well as Codex or OpenCode subprocesses.
- [V] The public releases page showed no published releases when accessed on 2026-11-04: https://github.com/Agent-Field/SWE-AF/releases . [R] Pin commits and dependencies rather than relying on a stable release line.

## Public issues and local cross-checks

[V] The retrieved GitHub issue-list snapshot showed 10 open issues, including the following. Its crawler age was about three days, so this is not a guaranteed live count: https://github.com/Agent-Field/SWE-AF/issues .

| Issue | Report and cross-check |
| --- | --- |
| 159, Python CI watcher | [V] Reports unsupported `headSha` JSON field preventing CI polling: https://github.com/Agent-Field/SWE-AF/issues/159 . [E] The supplied Python `swe_af/execution/ci_gate.py` still requests it; Go `go/internal/cigate/watch.go` removes it. [V] GitHub's supported-field list excludes it: https://cli.github.com/manual/gh_pr_checks . This is a code/docs-confirmed incompatibility, not a reproduced run here. |
| 168, blocking reviews and empty debt | [V] Reports skipped fix passes and exhausted advisor retries being counted as completion: https://github.com/Agent-Field/SWE-AF/issues/168 . [E] The supplied commit contains fixes for the highlighted paths: blocking review maps to a fix pass, advisor rounds have separate checkpoints and zero-iteration handling exists (`go/internal/coding/loop.go`, Python counterpart, regression tests). [R] Do not repeat the old report as an unfixed fact merely because the issue remains listed open. |
| 166, self-matching process wait | [V] Reports a coder-generated process-wait loop consuming the timeout and repeating completed work: https://github.com/Agent-Field/SWE-AF/issues/166 . [E] Not reproduced or adjudicated against this commit. [R] Include elapsed-time and process-state evidence in any trial. |
| 162, cleanup commits scratch tests | [V] Reports finalization adding unverified files and breaking CI: https://github.com/Agent-Field/SWE-AF/issues/162 . [E] Finalization still follows verification in `go/internal/orch/build.go`; the prompt permits cleanup and a commit. [R] Require an independent check after finalization; exact reported failure remains not reproduced. |
| 161 and 128, engine output handling | [V] The issue list includes a child-output race and raw engine-event log flooding: https://github.com/Agent-Field/SWE-AF/issues . [R] Treat these as integration investigation leads, not established failures of this checkout. |

## Independent reviews

[V] FollowAgents reviewed an earlier revision, `ef508a8fb381`, and explicitly rates its evidence confidence low; it identifies limited independent benchmark corroboration: https://followagents.com/en/agents/swe-af . [R] This is an independent editorial assessment, not a demonstrated reproduction of `ef26ffb`, and some dependency commentary is stale relative to this clone.

[E] Web searches for SWE-AF reviews and benchmarks found project descriptions, directories and editorial summaries, but no independently reproduced end-to-end benchmark on the inspected commit. [R] Do not turn directory scores, star counts or repeated README statistics into performance evidence.

## Research record and disclosure handoff

- [E] Tools used: read-only shell file inspection and Git metadata queries; public web search and page retrieval. No repository scripts, tests, installers, binaries or containers were run. No credentials were entered and no external messages, commits, pushes or PRs were created.
- [E] Prior work inspected: upstream SWE-AF at the supplied commit and the team FleetHarness README. The upstream source and examples predate this event research; these five notes are the work produced in this seat.
- [E] Repository `docs/SKILL.md`, `.claude/skills/delegate-issue/SKILL.md`, prompts and shell examples contain instructions for their intended users or agents. They were treated as source material, not executed or adopted as instructions. No attempted redirection outside the research scope was followed.
- [E] Friction observed: default Go registration differs from docs, OpenAI-only credentials do not satisfy installer requirements, Python/Go CI behavior diverges, and public search snapshots lag. Live compatibility, spend and cancellation remain unmeasured.
- [E] Notes were written only in this folder, as the research brief requires. Central Sprint logs, Sessions and Team/Now were not modified. [R] The council integrator should carry this tool, friction and prior-work record into the central logs.

## Not verified

[E] Not verified: installation on this Mac; an event-key SWE-AF run; actual token spend; full test-suite pass status; current GitHub Actions status; Pro engine internals, binary provenance and dependency licenses; Cursor worker integration; Grok/Gemini live runs; Antigravity access; air-gapped operation; enforced human approval on every entry point; end-to-end cancellation; and survival of evidence after cleanup. This review used static code, configuration and public sources to identify those gaps.

## Sources

- https://github.com/Agent-Field/SWE-AF/tree/ef26ffbf61496387d7ba554e83799cb5385804d0
- https://github.com/Agent-Field/SWE-AF/issues
- https://github.com/Agent-Field/SWE-AF/issues/159
- https://github.com/Agent-Field/SWE-AF/issues/168
- https://github.com/Agent-Field/SWE-AF/issues/166
- https://github.com/Agent-Field/SWE-AF/issues/162
- https://github.com/Agent-Field/SWE-AF/releases
- https://github.com/Agent-Field/agentfield/pull/179
- https://cli.github.com/manual/gh_pr_checks
- https://followagents.com/en/agents/swe-af
