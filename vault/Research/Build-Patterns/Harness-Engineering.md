---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A small controller, independent evidence and enforced limits matter more than a large agent graph."
---

# Harness engineering

## Bottom line

[R] Build a controller that turns an approved need into a bounded job, then returns an application and evidence a person can inspect. [R] Its most important parts are fixed acceptance criteria, isolated execution, trustworthy test results and real stop controls. [V] OpenAI describes successful internal development with agent-written code, but its reported time saving is an estimate from one internal project, not a controlled result for non-coders: https://openai.com/index/harness-engineering/. [A] Whether FleetHarness reduces a naval officer's total effort remains unverified.

## What a harness is

[R] Use this working definition: a harness is the software surrounding a model that supplies context, tools, execution boundaries, durable state, feedback and termination rules. [R] A model proposes actions; the harness decides which actions can execute and which evidence changes the job's status. [P] The project README describes FleetHarness as a development system whose resulting applications can have different architectures, read at `~/Documents/CDAO/FleetHarness/README.md` on November 4.

## Parts in priority order

| Part | Proposed implementation | Failure it prevents |
| --- | --- | --- |
| [R] Approved contract | Versioned need, examples, exclusions and acceptance IDs | Building an attractive answer to the wrong problem |
| [R] Trusted controller | Explicit state transitions and server-side permissions | An agent declaring itself approved or released |
| [R] Work executor | One disposable workspace and constrained process tree per job | Host modification and contamination between jobs |
| [R] Evidence runner | Controller-owned tests, structured results and browser traces | Treating an agent's success claim as a test result |
| [R] Durable record | Append-only controller events and artifact hashes | Lost context, stale approvals and unrepeatable demos |
| [R] Resource budget | Wall time, attempts, model usage, process and disk limits | An endless repair loop consuming the laptop |
| [R] Human controls | Approve contract, review output, reject, pause and stop | Unclear authority and unsafe promotion |
| [R] Packager | Known dependencies, licenses, install steps and offline checks | A runnable development server that cannot travel |

[R] Keep the controller, policy, canonical tests and approval store outside the agent's writable directory. [R] Run generated code under the same restrictions as other untrusted code. [R] An agent may propose a new test or policy change as an artifact, but the controller must not apply it automatically.

## Evidence from engineering practice

[V] OpenAI's February 11, 2026 account says its team shifted effort toward environment design, repository documentation and mechanical architecture checks. It reports that a large instruction file failed through context pressure and stale guidance, and instead uses a short map to maintained documents. It explicitly leaves long-term architectural coherence unresolved. Source: https://openai.com/index/harness-engineering/.

[V] Anthropic's November 26, 2025 engineering account identifies premature completion, broken handoffs and missing end-to-end testing. Its proposed harness uses initialization, a persistent feature list, progress records and incremental work. It is a vendor engineering experience focused on web applications, not a comparative demonstration that many agents are better: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents.

[R] Borrow the short map, reproducible start command and visible feature evidence. [R] Do not copy an internal team's merge policy into an officer-facing tool. [R] Freeze a narrow stack for the hackathon and change the environment when failures repeat, instead of adding more prompt text.

## Concrete architecture

[R] Proposed job flow:

```text
Need form -> draft contract -> human approval
                                  |
                                  v
                         bounded build worker
                                  |
                                  v
                   trusted test runner -> repair budget
                                  |
                                  v
                    evidence review -> approved package
```

[R] Store the following artifacts under a job identifier in the future application. These are proposed paths, not files created by this research.

```text
contract/spec.json           controller-owned approved need
contract/acceptance.json     human-readable checks and expected results
workspace/                  agent-writable source and local tests
evidence/events.jsonl       controller-owned event record
evidence/results.json       checks, exit codes and artifact hashes
release/manifest.json       approved output and dependency identities
```

[R] Bind each approval to the contract hash, source revision and relevant artifact digest. [R] A new requirement invalidates implementation approval; changed code invalidates test evidence and release approval. [R] Record the model identifier and harness version so a later result can be compared honestly.

## How to evaluate the factory itself

[R] Measure need-to-accepted-artifact time, officer review minutes, engineer intervention minutes, accepted jobs divided by all attempted jobs, repair attempts, and cost per accepted job. [R] Include rejected and stopped jobs in the denominator. [R] Compare against a manual baseline on matched synthetic tasks, with the same acceptance criteria.

[R] Evaluate the application and the factory separately: a correct scheduler does not prove general code generation, and a successful code-generation run does not prove the generated scheduler is valid. [A] No local build, benchmark or non-coder usability study was performed for this research.

## Sources

- [V] https://openai.com/index/harness-engineering/ (February 11, 2026; opened November 4).
- [V] https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents (November 26, 2025; opened November 4).
- [P] `~/Documents/CDAO/FleetHarness/README.md`, read November 4; [[Event/Rules]] and [[Event/Judging]].
