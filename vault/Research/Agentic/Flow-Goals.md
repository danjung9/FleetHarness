---
type: plan
status: active
owner: mukul
updated: 2026-11-04
summary: "What the development team is working on: a one-shot agent flow, measured by ten real challenges built with no human help."
---

# Agent flow goals

## The order

[P] Mukul, 2026-11-04: the development team works on the agent flow. The backend must fully work, be very intuitive, and be better and more efficient than today. It must be one-shot, with everything tested and ready to go. Ten challenges tested from start to finish until satisfactory is how success is measured.

## The measure

[E] [[Research/QA/Ten/Scoreboard]] is the score. A loop builds ten catalog challenges, one per recipe, from the card with no brief written for them, on the latest `dev/reviewed`, using a live model, then does it again on the next commit. A challenge counts when it reached review alone, its tests and every planned browser journey pass, it opens offline with no errors, and an independent judge calls it satisfactory. The goal is ten of ten. A failure there outranks everything else on your list.

## Baseline to beat

[E, real builds at `631849f` and `d0f4c69`, curated brief, one at a time]

| Measure | Now | Target |
| --- | --- | --- |
| Time to review | 13 minutes | Under 8, with no loss of evidence |
| Tokens, uncached plus output | About 295,000 | Under 200,000 |
| Gross input tokens | About 1.8 million | Well down: five fresh sessions each reread long notes |
| A failed stage | Whole build restarts from zero, one repair attempt | Retries itself, then resumes from the last good stage |
| Time and tokens per stage | Not recorded | In the project record and the report |
| Starting a build | Choose engine and model first | One press when a model is connected |
| Failure messages | Internal wording | What happened and what to do next, in plain words |

Where the time goes: build 4 to 6 minutes, plan 3 to 4, verify 1.5 to 2.5, research 1.3 to 1.8, intake about 1. Long notes are a cost: scope, research, plan, test matrix, README and verification notes run 12 to 21 KB each, and every later session rereads them. No reasoning effort is set per stage.

## Rules of the work

- [R] Prove with real builds. Seats cannot run them, so the benchmark does, and its results are your evidence. Do not claim faster or better until the scoreboard shows it.
- [R] Quality must not fall to buy speed. The same journeys, the same independent checks.
- [R] Fix the factory, not one app. A judge's complaint about a generated app becomes a change to agent prompts, skills or the host.
- [R] Dan's frontend stays his. If the flow needs a new control, keep it small and additive with a `FRONTEND:` line. Plain-language wording he should show goes in the report for [[Research/QA/For-Dan]].
