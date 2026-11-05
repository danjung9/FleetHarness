---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A proposed officer-facing version of the pipeline, with plain decisions, visible evidence and separate technical authority."
---

# FleetHarness driven by a noncoding officer

## Bottom line

[P, project README lines 23 to 31] The proposed pipeline already includes requirements, building, testing and human review. [E, close reading] It does not identify the officer as its operator or specify an interface for someone who does not code. [R] Let the officer describe a task, review worked examples, approve a bounded plan and inspect a running result; let technical support own execution mechanisms and technical access. [R] Hide implementation machinery from the main task flow while keeping data handling, uncertainty, failures, approval and stopping visible. [A] This is an interface proposal for the stated research direction, not a validated account of how a particular officer works.

## What changes in the product promise

[P, README lines 11, 25 and 67] The README describes a development system with specifications, tests, coding tools and an orchestrator. [R] For an officer, the first promise should be a reviewed tool for a defined task, supported by evidence they can understand. The officer should not have to assemble a development stack, select libraries or decide whether a container was configured correctly.

[R] Keep the same underlying seven stages, but represent them as a small number of task decisions. Ask for a decision only when it changes the task, allowed data, authority, cost or result. Make the expected answer visible through examples before implementation begins.

[A] This proposal assumes an officer is sponsoring or shaping a small tool with access to a technical reviewer. It does not assume the officer has authority to approve network access, waive data restrictions, authorize operational use or maintain software. [R] If no technical owner is available, restrict the proof to a bounded demonstration rather than implying self-service fielding.

## The seven stages from the officer's seat

| README stage | What the officer sees and does | What stays behind the main flow | Visible evidence and decision |
| --- | --- | --- | --- |
| 1. Ingest a use case | [R] Start with a task such as making a draft training schedule from invented resources. Describe the present steps, who uses the result, important limits and what must never happen. Supply a permitted sample and correct a plain-language summary. | [R] Hide prompt templates, internal schemas, storage plumbing and parsing configuration. The officer should not need to write a technical specification. | [R] Show the proposed task, inputs, outputs, exclusions, source and data destinations. Ask the officer to confirm intent; require separate review of any uncertain data boundary. Do not request operational documents simply to make the example realistic. |
| 2. Research existing solutions | [R] See the recommended route in task terms: what it can do, important limits, connection needs and any unresolved issue. Answer a domain question only when it changes behavior. | [R] Hide repository searches, framework comparisons and dependency details behind an optional technical view. Selecting among SWE-AF, SuperPlane, OpenAI Symphony and Aperant should not be a required officer action. | [R] Show whether a dependency requires network access, sends data elsewhere, adds a restriction or changes the approved scope. A technical reviewer evaluates suitability and permissions. Pause when that review is unavailable. |
| 3. Plan the implementation | [R] Review worked examples of input and expected output, including an impossible or ambiguous request. Mark an example correct or explain what must change. Approve the bounded task and acceptance criteria. | [R] Hide architecture diagrams, task decomposition, test syntax and engine configuration from the required flow. Keep technical details available to the technical owner. | [R] Show exact success checks, exclusions, what remains manual, the proposed execution limit and each approval gate. Lock the agreed criteria to this version. The officer approves intended behavior; technical approval remains separate. |
| 4. Build the application | [R] Start the approved build or ask the technical owner to start it. See a short factual progress record, a pause state and a stop control. Answer only genuine scope questions. | [R] Hide code editing, command output, package installation and agent coordination from normal interaction. Technical failures should be translated into an understandable blocker and next action. | [R] Show what stage actually ran, whether the run is active, the current resource limit and any permission request. Keep work in the authorized test environment. A new external connection or deployment requires separate approval. |
| 5. Test and repair | [R] Try the draft app with the agreed examples. Compare expected and observed results, inspect source evidence and identify domain mistakes. Choose whether a changed requirement is acceptable. | [R] Hide stack traces, test-runner syntax and code patches behind the technical view. Automatic repair can proceed only within the accepted scope and configured limits. | [R] Show tests run, failures, skipped checks and untested behavior. Never silently weaken a test or change an accepted constraint to produce a pass. Stop and escalate when repair exceeds limits or needs a new decision. |
| 6. Package and demonstrate | [R] Open the demo, complete the task and follow a short replay procedure. Review what works, what failed and what is still unverified. Decide whether the demonstrated task meets the agreed need. | [R] Hide image builds, dependency manifests and installer internals from the task view, while supplying them to the technical owner in the handoff. | [R] Show version, environment, data source, results, connection requirements and limitations. Approval of a demo does not authorize operational deployment. Export, installation on a new system and operational use are distinct decisions. |
| 7. Reuse what works | [R] See a tested prior pattern suggested for a later task, with its known limits. Confirm the new task's differences and review new examples. | [R] Hide internal component catalog mechanics and version resolution. Do not require the officer to judge a software library's trustworthiness. | [R] Show which behavior was demonstrated before and which assumptions changed. Recheck the new task and obtain the needed approvals. Prior acceptance is not automatic acceptance for a new mission or environment. |

## Keep authority understandable

| Decision | Proposed responsible role | What the officer should see |
| --- | --- | --- |
| Task meaning and desired output | [R] Domain user or task sponsor | [R] Examples, required constraints, exclusions and a clear confirmation of the agreed task. |
| Data admissibility and new external connections | [R] The appropriately authorized data or system owner, with technical support | [R] What data would move, where it would go, why it is needed and a pause until authority is established. The sponsor's interest is not proof of authorization. |
| Execution permissions and isolation | [R] Technical owner within the authorized environment | [R] A plain boundary: what the build may change, what it cannot touch and how to stop it. |
| Acceptance of demonstrated behavior | [R] Domain user for correctness, technical reviewer for recorded execution evidence | [R] Expected versus actual results, failures and limitations for the exact tested version. |
| Operational installation or readiness claim | [R] The responsible mission and technical authorities | [R] The proposed use, unresolved prerequisites and explicit approval status. A successful test should never silently turn this status into operational approval. |

[A] These are role assignments to propose, not named people or accepted responsibilities. [R] Record who actually holds each authority before enabling the related action. If authority is unknown, pause that action and show what is missing.

## What must be hidden, and what must stay visible

[R] Keep implementation choices off the main path: repository structure, source-control commands, container configuration, package managers, framework names, model tuning, test syntax and raw tool chatter. Keep a technical detail view and an evidence bundle for the maintainer. Hiding machinery should reduce the officer's work, rather than transfer technical risk to them through an unexplained approval button.

[R] Always show the intended task, accepted inputs, destination of data, functions requiring a connection, output provenance, uncertainty, failed and unrun checks, current approval state, active automation and the stop control. Keep limitations alongside the result they qualify. A simplified interface must not make an unverified output look accepted.

[R] Translate technical errors into three useful facts: what could not be completed, which result is therefore unavailable or uncertain, and who can take the next action. A failed dependency installation should produce a paused build with a technical-owner action, not a completed-looking app.

## How the three proof topics look to the officer

### Message parsing

[P, README line 73] The proposed output includes structured tasks, events and source references. [R] Use invented exercise messages. Show the source passage beside each extracted item; mark uncertain or missing fields and let the officer correct a draft. Preserve the difference between a source statement and a model inference. Producing a draft must not send a message, create an operational order or update a live system.

[R] A useful acceptance example includes an explicit task with a known source reference and a message with no clear deadline. The app should leave the unknown deadline unresolved rather than invent one. Compare review and correction effort with the chosen baseline; do not count only extraction speed.

### Training schedule deconfliction

[P, README line 74] Schedules must obey personnel, time and resource constraints and detect infeasible cases. [R] Present limits as plain editable statements, using invented roles and resources. Show a draft schedule with the reason for each conflict. If no valid schedule exists, explain the conflicting constraints and ask which may be changed; never silently relax an approved constraint.

[R] The officer approves the draft task result. Sending it to actual personnel or changing a system of record is a separate, authorized action outside the proposed synthetic proof. Measure the effort to obtain a usable, constraint-compliant schedule, including corrections.

### Offline workflow

[P, README line 75] The trial requires disconnected changes and reliable later synchronization. [E] The README does not name the underlying record or user task. [R] Choose one, for example editing an invented training-plan draft, and show connection state, locally saved work and pending exchanges. When another copy contains conflicting edits, show both values and ask for resolution under an agreed policy.

[R] Demonstrate disconnection, local edits, reconnection, a conflict and a repeated sync without duplicated or lost records. Show which AI or research functions remain unavailable offline. Do not claim the factory builds apps offline because an output app can save a draft without a connection.

## A small officer-facing evidence card

[R] Each demonstrated result should carry a compact record with these fields. This is a proposed display, not a report of completed tests:

- [R] Task and intended user role.
- [R] Version of the app and agreed criteria.
- [R] Data source and permitted handling boundary.
- [R] Expected result and observed result for each agreed scenario.
- [R] Checks passed, failed, skipped and not yet attempted.
- [R] Connection requirements and behavior when disconnected.
- [R] Human review needed and current approval state.
- [R] Known limitations, next accountable role and stop or disable action.

[R] Display status as evidence-specific stages such as generated, starts in the stated environment, passed named checks and reviewed for the stated task. Reserve operational-validation claims for appropriate evidence and authority. Do not replace these distinctions with one success badge or an unexplained percentage.

## What must be tested with an officer

[A] The proposed flow has not been tried with a naval officer. There is no user interview, usability trial or measured burden result behind it. [R] Test whether the officer can state the task, correct an expected result, recognize a failed check, identify cloud dependence and stop a run without technical coaching. Record hesitation, mistaken approvals and unnecessary decisions as evidence for revision. Do not claim that fewer screens alone proves simpler use.

## Sources

- [P] Project README: `/Users/mukul/Documents/CDAO/FleetHarness/README.md`, especially lines 23 to 41 and 71 to 87, read locally on 2026-11-04. No implementation, web URL or private page was verified.
- [P] [[Research/00-Brief]], the direction to make the product more specific and simpler for a naval officer.
- [P] [[Event/Rules]], especially rules 2, 4, 6 and 9; [[Event/Judging]], user burden and Fleet-condition criteria.
- [E] The local event snapshots do not supply full portal URLs. Those URLs and all user-validation claims remain unverified. No public web source was used or full web URL invented.
