---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Recommend a small stateful controller with one worker and one fully evidenced offline-capable application by downselect."
---

# Build options

## Bottom line

[R] Choose option 2 with option 1 as the fallback, and make one complete officer journey work before expanding. [R] Build a small stateful controller around the already available coding capability, with independent tests, real Stop and an offline-capable output application. [P] The downselect deadline is Thursday, November 5 at 2:00 PM EST, stated in [[Research/00-Brief]]. [A] The delivery estimates below assume two available implementers, one domain reviewer, working model access and a usable Mac runtime; those conditions are not verified.

## Three concrete choices

| Option | Concrete stack and behavior | Plausible by Thursday 2:00 PM EST | Main risk |
| --- | --- | --- | --- |
| [R] 1. Guided build workbench, smallest | Local Flask or equivalent web form, approved JSON spec, one supervised coding CLI invocation, external test script, HTML evidence report, manual packaging | [A] One repeatable build on a fixed template with spec approval, test evidence and a working offline output app. A developer may still operate the worker | [R] A form around manual work can be mistaken for autonomous orchestration; label manual steps |
| [R] 2. Bounded factory, recommended | Same local UI plus SQLite job state, append-only controller events, one worker adapter, disposable sandbox, trusted test runner, two-repair cap and artifact-bound approval | [A] One complete generated feature, one deliberate failure/repair, one stopped job and an exported app tested offline. A second task is conditional on the first being complete | [R] Worker isolation, secret handling and reliable cancellation can consume the schedule |
| [R] 3. Platform factory, largest | Durable workflow service, isolated worker pool, reusable component catalog, multiple model backends, local inference and Zarf/UDS deployment integration | [A] At most a thin workflow demonstration or deployment spike. A reliable general factory across three disparate applications is not a credible commitment without existing proven code | [R] Integration, licensing, cluster setup and distributed state overwhelm available validation time |

[R] The stack names above are implementation proposals. This research neither installed them nor confirmed their compatibility. [R] Keep each generated app independently runnable rather than forcing it to depend on the orchestration platform.

## Why option 2 earns its extra scope

[R] The important increment over option 1 is controller authority: no worker can approve its own output, change canonical tests, continue indefinitely or export an untested revision. [R] Keep one worker and one job at a time for the initial Mac demo. [R] Use a fixed application template so the experiment tests requirements-to-verified-change instead of spending the deadline generating boilerplate.

[V] The coding CLI's official documentation describes `codex exec --json` for a stream of machine-readable execution events and schema-constrained final output: https://developers.openai.com/codex/noninteractive/. [R] Use a subprocess adapter only after confirming that the installed version exposes the required signals. [R] Do not equate a successful model turn with successful acceptance tests.

[V] Agentless reported useful historical repair results using localization, repair and validation without a complex action-planning agent: https://arxiv.org/abs/2407.01489. [R] This supports keeping the initial workflow understandable, but does not prove option 2 will work locally.

## Proposed vertical slice

[R] Begin with a synthetic training-reservation checker: upload a CSV, identify conflicting resource intervals, show row references and export findings. [R] It has an objective oracle, a useful failure case and no need for an LLM during ordinary application use. [P] The project README proposes training schedule deconfliction as one of its initial proof areas. [R] Label conflict detection as a subset; it does not demonstrate automatic schedule generation under all constraints.

[R] Make generation observable with a new approved behavior, such as treating end-equals-start as nonconflicting, or rejecting missing timezone offsets. Show the original failing acceptance case, generated source change, trusted rerun and changed artifact identity. [R] A prebuilt application alone does not prove the factory generated a solution.

[R] For the second challenge, choose synthetic message extraction with source spans and unresolved-date handling. [R] Only attempt full offline synchronization after local persistence and a defined conflict policy exist. A disconnected edit that survives restart does not establish reliable multi-device synchronization.

## Work plan and cutoff decisions

[A] The schedule below is an effort allocation proposal for November 4 to 5, not a record of completed work.

| Time, EST | Work and evidence | Cut if late |
| --- | --- | --- |
| [R] Wednesday before 1:00 PM | Confirm owners, laptop/runtime, access and one synthetic contract; establish expected results | [R] Drop optional model/provider integrations |
| [R] Wednesday 1:00 to 4:00 PM | One isolated worker, trusted test runner and persisted job state | [R] If no complete supervised run, use option 1 |
| [R] Wednesday 4:00 to 7:00 PM | Contract approval, review cards, Stop and evidence export; first offline app start | [R] Drop second use case and catalog UI |
| [R] Thursday 8:00 to 10:00 AM | Failure/repair run, boundary checks, restart recovery and clean offline install | [R] Freeze architecture; document unresolved gaps |
| [R] Thursday 10:00 AM to noon | Non-coder walkthrough, repeated clean run and packaged evidence | [R] No new features or new dependencies |
| [R] Thursday noon to 1:00 PM | Freeze tested artifact, limitations, logs and submission material | [R] Remove any claim whose evidence is incomplete |
| [R] Thursday 1:00 to 2:00 PM | Human-owned submission and contingency buffer | [R] Do not use submission time for feature development |

## Minimum acceptance for the factory

- [R] A non-coder can inspect and approve examples before Start.
- [R] Unapproved requirements cannot execute; changed requirements invalidate earlier approval.
- [R] A controller-owned test fails, the agent repairs the implementation and the same protected test passes.
- [R] A failing mandatory check blocks release even if the agent reports success.
- [R] Stop ends the worker and child processes within the declared threshold, with evidence and no automatic restart.
- [R] Each accepted artifact includes tests, dependency/license inventory, setup steps and known limits.
- [R] The resulting app runs its promised workflow with external networking denied; an unavailable cloud build function is labeled unavailable.

[R] Use status words precisely: generated, runnable, acceptance-tested, human-reviewed, offline-installed and target-validated. [R] Do not substitute one for another or claim operational authorization.

## Judging and transition

[P] Impact and Speed to Fleet together account for 50% of the rubric, per [[Event/Judging]]. [R] Lead with an observed reduction in review steps or time using matched synthetic tasks; if no baseline was measured, report raw task time and steps without claiming savings. [R] Support scalability by showing a second contract passing through the same controller, not by counting empty repositories.

[R] For 30 days, name a mission owner and technical owner, validate a narrow workflow with approved synthetic/public examples, and measure officer and engineer effort. [R] For 60 days, harden isolation, identity, dependency review, backup and target packaging. [R] For 90 days, conduct an authorized target-environment experiment with explicit acceptance and sustainment responsibilities. [A] No owners, target access or operational approval were established in this seat's research.

## Sources

- [P] [[Research/00-Brief]], [[Event/Rules]] and [[Event/Judging]].
- [P] `~/Documents/CDAO/FleetHarness/README.md`, read November 4.
- [V] https://developers.openai.com/codex/noninteractive/
- [V] https://arxiv.org/abs/2407.01489
