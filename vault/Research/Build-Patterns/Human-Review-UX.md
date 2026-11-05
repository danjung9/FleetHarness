---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Give the officer a behavior contract, evidence cards and effective authority over scope, release and shutdown."
---

# Human review UX

## Bottom line

[R] The officer should approve a behavior contract and observed results without having to interpret source code. [R] Technical review still needs a named engineer, especially for dependencies, isolation and release readiness. [P] Rule 6 requires approval points, prohibited actions, monitoring, escalation and shutdown, per [[Event/Rules]]. [R] Make those controls visible in the main workflow and enforce them in the controller.

## The simplest officer journey

1. [R] Describe the need: task, user, current burden and an approved synthetic example.
2. [R] Confirm behavior: review a short list of examples, exclusions and failure outcomes. Resolve consequential ambiguity before building.
3. [R] Start a bounded build: see the current task, allowed actions, time/usage cap and persistent Stop control.
4. [R] Try the result: run the synthetic example in a separate preview and compare expected with observed output.
5. [R] Decide: accept the behavior, request a specific change or reject the candidate. A technical owner separately reviews packaging and security.
6. [R] Approve release: see the tested artifact identity, limitations and target. Export only that approved version.

[R] Keep ordinary screens to one decision at a time. Use plain states such as Needs your decision, Building, Checking, Needs repair, Ready to review and Stopped. [R] Show a failed or unverified check explicitly; do not collapse it into a single optimistic percentage.

## Rule 6 mapped to controls and evidence

| Required element | Proposed UX | Enforced behavior | Demonstration |
| --- | --- | --- | --- |
| [P] Human approval points | [R] Approve examples; approve new access; approve tested export | [R] Server checks approval against contract/source/artifact hashes | [R] Change a requirement and show prior approval invalidated |
| [P] Prohibited actions | [R] Allowed actions summary beside Start | [R] Deny real-system writes, secret reads, host changes and unsanctioned external actions | [R] Synthetic denied-action test |
| [P] Monitoring | [R] Current activity, elapsed time, attempts, spend or unknown spend, test outcomes | [R] Controller records action start/finish and exit state | [R] Open a test result and its underlying evidence |
| [P] Escalation | [R] Needs technical review with a concrete reason | [R] Pause on new dependency/access, repeated failure or policy violation | [R] Show a missing dependency leading to an actionable handoff |
| [P] Shutdown | [R] Persistent Stop button, visible stopping state and completion acknowledgment | [R] Revoke dispatch, kill descendants/containers, block export and verify termination | [R] Stop a long-running test and show no worker remains |

[P] The requirement names come from [[Event/Rules]]; the UI and enforcement details are recommendations, not event-prescribed implementations.

## A review card a non-coder can use

[R] Proposed synthetic card:

```text
Check AC-02: adjacent reservations
You approved: 10:00 may follow 09:00 to 10:00 on the same resource.
Observed: no conflict. Source file unchanged.
Evidence: input rows, output rows, browser trace, file hash comparison.
Status: passed on candidate <artifact identity>.
Limit: does not check personnel qualifications in this version.
Actions: try this example | ask for a change | reject
```

[R] If evidence is unavailable, display Not verified. If one mandatory check fails, disable release. [R] Show source references for extraction and constraint explanations for scheduling so the reviewer can verify the reason, not only the answer.

[V] Agent-evaluation guidance recommends checking outcomes rather than relying only on an agent's stated actions, and combining appropriate grader types: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents. [R] Keep the final status under controller control and link each claim to raw results.

## Approval is scoped and expires on change

[R] Approving a need does not authorize every action needed to implement it. [R] Approval to build locally does not authorize sending email, modifying real systems, publishing or deploying. [R] Ask for additional authority only with a concrete action, destination, data involved, expected consequence and bounded duration.

[R] Preserve a record of who approved which version and why, under an appropriate identity mechanism for the eventual environment. [R] For the event's synthetic demo, label role-based controls as a prototype unless identity enforcement has actually been built. [A] No mission owner, technical owner or production identity setup has been assigned by this research.

## Pause, stop and recovery

[R] Pause prevents new work and waits only for a bounded safe checkpoint. Stop immediately begins process termination, cancels pending work and quarantines incomplete output. [R] Distinguish Stop requested from Stopped; show remaining active work if termination fails. [R] Target Stop acknowledgment within one second and local worker termination within five seconds, as proposed acceptance thresholds to test.

[R] On restart, recover the controller ledger but leave interrupted jobs stopped. Require a person to choose a new bounded run. [R] Offer the last accepted artifact without claiming that rollback reverses completed external effects.

## Quick usability experiment

[R] Ask a non-coder to approve a requirement, identify a wrong expected result, reject an invented timestamp, stop a job and explain what can happen after release. Record time, misinterpretations and requests for engineer help. [R] Include a plausible but wrong result so the experiment measures judgment, not just successful clicking. [A] No such usability experiment was conducted here.

## Sources

- [P] [[Event/Rules]], rule 6; project README at `/Users/mukul/Documents/CDAO/FleetHarness/README.md`.
- [V] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
