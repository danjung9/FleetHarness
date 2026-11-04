---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Use bounded, evidence-driven repair and escalate failures that do not improve."
---

# Test and repair loops

## Bottom line

[R] Let the agent repair code against fixed tests for a small, explicit budget. [R] Stop when the failure repeats, the test contract changes, authority is exceeded or the budget runs out. [V] Published research shows useful automated repair, but also large unresolved fractions and misleading benchmarks: https://arxiv.org/abs/2407.01489 and https://openai.com/index/separating-signal-from-noise-coding-evaluations/. [A] No FleetHarness repair success rate has been measured here.

## What the measured evidence supports

| Evidence | Reported result | Scope and limitation | Design implication |
| --- | --- | --- | --- |
| [V] SWE-agent, 2024 | 12.5% pass@1 on SWE-bench and 87.7% on HumanEvalFix | Different tasks and benchmark sizes; historical models; authors' evaluation, not our reproduction. https://arxiv.org/abs/2405.15793 | [R] Tool interfaces and task scope matter; a function benchmark does not establish repository reliability |
| [V] Agentless, 2024 revision | 96 of 300 SWE-bench Lite tasks resolved, 32%; reported mean cost $0.70 per task | Historical model, scaffold and prices; authors also identified defective tasks. https://arxiv.org/abs/2407.01489 | [R] Start with localize, repair and validate before adding orchestration |
| [V] EvalPlus, 2023 | 80 times more tests exposed incorrect code previously counted as passing | Small programming tasks, not whole applications. https://arxiv.org/abs/2305.01210 | [R] A passing test suite is conditional evidence, not correctness |
| [V] METR randomized trial, 2025 | 16 experienced maintainers completed 246 tasks; AI access increased time by 19% | Familiar mature repositories and early-2025 tools; does not estimate current non-coder productivity. https://metr.org/Early_2025_AI_Experienced_OS_Devs_Study-paper.pdf | [R] Count review and repair labor, not generated lines |
| [V] METR update, February 24, 2026 | Later raw estimates suggested speedup, but investigators considered selection and time reporting serious validity problems | Not a clean current replacement estimate. https://metr.org/blog/2026-02-24-uplift-update/ | [R] Avoid extrapolating either universal slowdown or universal acceleration |
| [V] OpenAI audit, July 8, 2026 | Estimated about 30% of SWE-Bench Pro tasks were broken | Benchmark audit by a model vendor; not a measurement of FleetHarness. https://openai.com/index/separating-signal-from-noise-coding-evaluations/ | [R] Investigate the oracle when repeated failures look inconsistent |

[R] These results do not form a performance ranking: they use different tasks, models, scaffolds and years. [R] Quote them as evidence about failure mechanisms and baseline design, not as today's promised success rate.

## Recent local-model recovery evidence

[V] An October 31, 2026 preprint tests a single answer, one verification-triggered redraw and one diagnostic repair on 72 tasks using two locally served small models. Reported success moves from 51.4% to 59.7% with redraw and 52.8% with repair for one model, and from 55.6% to 62.5% and 63.9% for the other. None of four paired contrasts is significant after correction. The public gate falsely accepts 25 candidates for one model and 11 for the other: https://arxiv.org/abs/2611.00707.

[A] This is an abstract-level review of one sampling block per model, not an independent reproduction or proof that redraw and repair are equivalent. [R] It reinforces two design questions: whether a failed candidate benefits more from a fresh attempt or a diagnosis, and whether the gate can detect the error at all. [R] Budget recovery and strengthen the oracle before assuming more loops will help.

## Proposed controller loop

[R] Use one initial build plus at most two repair attempts per approved feature. Set a 20-minute wall-clock limit for the entire feature, including tests, and a 120-second limit for each ordinary test command. [A] These are initial product budgets to tune on the laptop, not research-derived optimal values. [R] Preapprove a model usage cap before starting; if price accounting is unavailable, enforce a conservative request/token budget and display monetary cost as unknown.

```text
1. Confirm approved contract, policy and test hashes.
2. Run the baseline checks and record existing failures.
3. Build one feature in its isolated workspace.
4. Run controller-owned checks in a clean test environment.
5. If all mandatory checks pass, request human evidence review.
6. Otherwise classify the failure and provide a compact repair packet.
7. Stop or repair only while authority and all budgets remain valid.
8. Re-run relevant checks and regressions after every code change.
```

[R] A repair packet should include the acceptance ID, reproduction command, exit code, concise relevant output, input fixture and current source hash. [R] Preserve full logs as redacted artifacts, but do not flood the next context window with them. [R] The agent's diagnosis is a proposal; the harness's check result determines state.

## Where loops stall

| Failure | Observable signal | Required next action |
| --- | --- | --- |
| [R] Wrong requirement | Human rejects expected output | Stop for contract revision; do not optimize the old tests |
| [R] Broken environment | Missing binary, failed dependency resolution, unavailable port | Escalate to technical owner; do not rewrite application logic |
| [R] Repeated ineffective patch | Same normalized failure signature twice without a new passing acceptance check | Stop with diagnosis and last known good artifact |
| [R] Oscillation | A fix repeatedly breaks a previously passing case | Reduce scope or redesign; preserve all regressions |
| [R] Flaky test | Identical source and fixture alternate pass/fail | Mark unstable; reproduce before crediting a repair |
| [R] Oracle tampering | Changed canonical test, expected result, runner or policy hash | Terminate worker and quarantine candidate |
| [R] Cosmetic success | UI says done but stored/exported data is wrong | Fail using independent state assertions |
| [R] Missing authority | Agent requests a new dependency, host access or external write | Pause for scoped review; never widen access automatically |

[V] Anthropic reports agents marking features complete without adequate end-to-end testing, and uses browser testing and persistent progress to address it: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents. [R] Browser evidence should supplement tests, since a screenshot does not establish backend correctness.

## Reliability measures and stopping evidence

[V] Agent-evaluation guidance distinguishes finding at least one successful attempt, pass@k, from succeeding on every repeat, pass^k. The latter exposes inconsistency concealed by repeated retries: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents.

[R] Report first-attempt success, accepted success within budget, median repair count, total spend and human intervention separately. [R] Run three fresh-workspace trials of the chosen demonstration when time permits, and display all three outcomes. [R] Do not claim statistical reliability from three trials.

[R] Stop must revoke new tool dispatch, terminate the worker and descendants, stop associated containers, and prevent packaging. [R] Log the last completed action, remaining processes and any action already sent externally. [R] A killed local process cannot undo an already completed external action, which is why outward actions need separate approval.

## Sources

- [V] https://arxiv.org/abs/2405.15793
- [V] https://arxiv.org/abs/2407.01489
- [V] https://arxiv.org/abs/2305.01210
- [V] https://metr.org/Early_2025_AI_Experienced_OS_Devs_Study-paper.pdf
- [V] https://metr.org/blog/2026-02-24-uplift-update/
- [V] https://openai.com/index/separating-signal-from-noise-coding-evaluations/
- [V] https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- [V] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- [V] https://arxiv.org/abs/2611.00707 (October 31, 2026 preprint; abstract-level review).
