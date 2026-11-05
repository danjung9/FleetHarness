---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Questions left open by the README, ordered by the decisions needed to start useful work."
---

# Gaps and questions

## Bottom line

[E, close reading of the project README] The immediate blocker is the missing product user: the README describes a development system without saying whether an officer or engineer operates it. [E] It names three trial challenges but does not select a concrete task, define accepted outputs or set a deadline-sized scope. [R] Resolve the user, task, safe inputs, success checks and authority boundary before selecting orchestration software. [R] Then settle execution, failure handling and evidence, followed by submission and transition details. [E] The questions below are gaps in the text, not claims that the team has never discussed them elsewhere.

## Before implementation

### 1. Who operates FleetHarness, and who uses the app it produces?

[P, README lines 11, 23, 31 and 93] The text calls FleetHarness a development system, requires users in intake and reserves decisions to human reviewers, but names none of these roles. [R] Decide whether the primary operator is a noncoding officer, a Sailor-builder with technical support or an engineer. Name the output app's user separately. Define who provides domain answers and who reviews technical execution.

[R] Required answer: a short role-and-task statement for both the factory and its first output, plus the boundary between their responsibilities. This blocks the interface, workflow, measurements and approval design. No personal identity is needed.

### 2. What exact task will the first proof complete?

[P, lines 73 to 75] Parsing, scheduling and disconnected work are selected as trial topics. [E] No message format, scheduling task or editable offline record is specified. [R] Choose a safe representative task with an input, an expected useful output and the next action the user takes. Explain why it matters; do not substitute a broad domain name for a task.

[R] Required answer: one end-to-end scenario using invented or suitable public inputs, with a clear user decision at the end. This blocks meaningful implementation and demonstration.

### 3. How much of the three-challenge plan is actually due at downselect?

[P, lines 71 to 77] The README's initial plan is three different challenges. [P, Research/00-Brief] Downselect is November 5, 2026, at 2:00 PM EST. [E] The README does not allocate work to that deadline or define minimum depth per challenge.

[R] Decide whether all three will be demonstrated by downselect, whether one is complete and others are later experiments, or whether the initial plan is being explicitly narrowed. Decide whether these are separate apps or three capabilities demonstrated in a coherent workflow. Do not silently describe an incomplete three-challenge plan as fulfilled.

[R] Required answer: an ordered scope with a completion test and fallback for each retained challenge. This blocks scheduling the work, but does not require a portfolio dashboard.

### 4. Which inputs can be used, and where may they go?

[P, line 39] The plan permits approved real connections and labeled substitutes. [E] It does not identify a dataset, provenance review, approved system or handling boundary. [R] Choose the actual synthetic fixtures or suitable public inputs; define what can reach a model service, command, log and exported artifact. Decide how source documents are treated as untrusted data rather than execution instructions.

[R] Required answer: a small allowed-input set and data-flow boundary, including rejected inputs. This blocks ingest, external calls and test setup. Calling material sanitized is not an answer to the event's restricted-data rules.

### 5. What counts as a correct result, and who checks the expected answer?

[P, lines 25, 27 and 37] Tests and measurable acceptance criteria are central. [E] The README supplies no examples, thresholds or owner for expected answers. [R] Agree on expected outputs and unacceptable failures before asking an agent to implement or repair them. Decide who verifies that a generated test checks the task rather than merely agreeing with generated code.

[R] Required answer: a few human-reviewed fixtures with explicit pass/fail conditions. For parsing, include an ambiguous or missing field. For scheduling, include a provably conflicting request. For synchronization, include conflicting edits and a repeated exchange. These are proposed test choices, not known event requirements.

### 6. What may the system do, and which actions require whose approval?

[P, lines 31 and 40] Human authority is promised, but the sensitive-action boundary and reviewer roles are unspecified. [R] Define permitted actions, prohibited actions, approval gates, visible activity records, escalation triggers and shutdown. Cover the factory and the generated app separately. Distinguish an officer approving the task from a technical authority approving access or deployment.

[R] Required answer: an explicit permission table and a demonstrated pause-and-stop path. This blocks giving agents tools or making real connections. Approval to build does not imply approval to publish or deploy.

### 7. What is the current method, and what burden is being reduced?

[P, lines 15 to 17, 89 and 93] The proposal claims development friction and seeks less human effort. [E] It supplies no observed baseline or measurement protocol. [R] Decide whether the primary comparison measures app-building effort, the officer's task effort or both. Include review, corrections, setup and failed attempts in the relevant effort measure.

[R] Required answer: the same defined task performed by a stated comparison method, with a recorded measure and quality checks. If only a synthetic event trial is possible, label it as such. This blocks defensible success claims even if coding can begin.

## Before execution and integration

### 8. What must work without a connection, in the factory and in the app?

[P, lines 11 and 75] The resulting apps may differ, and one trial concerns disconnected edits and synchronization. [E] The README does not promise offline generation, identify a target device or describe conflict resolution. [R] Specify the app task that stays available, functions that stop, local storage, pending-work display and the reconciliation rule. Separately state the factory's dependence on network and model services.

[R] Required answer: a connectivity table and a disconnect/reconnect scenario with expected results. This blocks architecture choices and claims about Fleet fielding.

### 9. Which existing coordinator is worth adopting, and what is the minimum needed?

[P, line 67] Four projects are candidates; hands-on performance is the intended selection basis. [E] None is selected and no comparison procedure is defined. [R] Establish the smallest required coordination loop, permitted dependencies, startup effort, stop behavior and evidence outputs. Verify project identity and license before adoption. Use the same safe test task to compare candidates; do not make the officer choose among frameworks.

[R] Required answer: one selected approach with a short observed rationale, or an explicit minimal implementation choice. This is a tool decision after the user, scope and authority decisions, not a prerequisite to defining them.

### 10. What does isolation actually prevent?

[P, lines 26 and 67] Workspaces and containers are proposed. [E] Host access, file boundaries, network reach, credentials and allowed commands are not specified. [R] Define containment and resource limits in technical terms that can be checked. Define what happens if a build needs a new dependency or permission.

[R] Required answer: a bounded execution environment with a technical owner and evidence of its limits. Separate folders alone do not answer this question.

### 11. When does repair stop, and what cannot be changed during repair?

[P, line 27] The plan iterates on failures. [E] It gives no retry, time or spending bound and does not protect accepted criteria from silent alteration. [R] Set a run limit, preserve approved requirements and tests, and pause when a failure needs a scope or authority change. Require renewed review for any changed expected result.

[R] Required answer: a repair policy with a visible failed state, an escalation path and a stop control. Do not treat an exhausted run as a pass.

### 12. What is saved so another person can reproduce and review the result?

[P, lines 28, 41 and 83 to 87] The README calls for runnable code, tests, a reproducible demo and honest status. [E] It specifies no artifact format, version record, target environment or status authority. [R] Decide which inputs, versions, commands, observed outputs and limitations are retained; define the reproduction test and who can advance a status.

[R] Required answer: a complete evidence bundle and a replay procedure from a clean stated environment. Decide whether reproducibility means repeating observed app behavior, repeating the development workflow or reproducing identical generated code. These are different claims.

### 13. What may be reused, under what license, and with which evidence?

[P, lines 24, 29 and 36] Reuse is deliberate. [E] No provenance, license-review method, trust threshold, versioning or maintenance policy is defined. [R] Establish when a component is a candidate, tested for this case or suitable for another case; preserve restrictions and known failures. Identify who handles updates and regressions.

[R] Required answer: a small provenance and status record for each reused component. Do not infer suitability for new tasks from one successful demonstration.

## Before submission and transition

### 14. How will repeated use of the process be demonstrated?

[P, lines 89 and 93] Repetition across different challenges and less engineering effort define success. [E] The number of trials, comparison basis and acceptable human intervention are unspecified. [R] Decide what must remain the same between trials, what may be task-specific and what evidence distinguishes reuse from hand-built demos. Record total human intervention and meaningful failures, not only successful generated outputs.

[R] Required answer: a modest, testable claim matched to the available runs. A second run of the same app can demonstrate repeat execution, but not by itself generalization across different problems.

### 15. What is the submission's category, ROI and primary claim?

[E, comparison with Event/Rules and Event/Judging] The README does not choose these or explain whether the factory or an app leads the submission. [R] Choose the artifact being judged, tie it to a named user and measured burden, select a supported category and ROI, and distinguish mission results from engineering-productivity results.

[R] Required answer: a concise submission claim with its evidence and limitations. Confirm the actual portal fields, category interpretation and missing definition of done through an authorized team channel; no outside message was sent for this research.

### 16. Who owns the next experiment, and what must happen after the event?

[P, line 95] The longer-term aim is field-testable software. [E] Owners, sustainment, resources and 30/60/90-day recommendations are absent. [R] Identify proposed mission and technical owners, confirm acceptance separately, and specify the next safe test, needed approvals, environment and resources. Keep proposed transition milestones distinct from promised deployments.

[R] Required answer: the complete beyond-Friday portion of [[Sprint/Submission-Checklist]], with unconfirmed ownership marked pending.

### 17. Is 34 still the right inventory, and is portfolio tracking needed now?

[P, lines 7 and 89] The README names 34 use cases and makes a dashboard optional. [E] This seat did not count a live use-case inventory. [R] Verify the count before claiming coverage; defer dashboard work unless needed to show the chosen proof. A changing inventory need not block the first well-defined task.

## Questions the README already answers

- [P, line 11] It does not require every output app to share a runtime.
- [P, lines 24 and 36] It favors suitable reuse before rebuilding.
- [P, line 38] It does not require a language model to be the engine for every task.
- [P, lines 71 to 75] It already names three initial trial topics; the gap is their concrete scope and acceptance, not the absence of any topics.
- [P, line 89] A dashboard is optional and repository count is not the success measure.
- [P, lines 31 and 40] Human authority is part of the plan; the missing decision is how to enforce it.

## Sources

- [P] Project README: `~/Documents/CDAO/FleetHarness/README.md`, lines 1 to 95, read locally on 2026-11-04; project web URL and repository history not checked.
- [P] [[Research/00-Brief]], deadline and assignment scope.
- [P] [[Event/Rules]], [[Event/Judging]] and [[Sprint/Submission-Checklist]], local event snapshots read 2026-11-04.
- [E] [[Reference/Open-Questions]], unresolved portal and category context. Full portal URLs were not supplied in the allowed files and were not verified. No public web source was used or full web URL invented.
