---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "How the FleetHarness proposal fits every captured event requirement and where evidence or decisions are missing."
---

# FleetHarness and the event requirements

## Bottom line

[P, Event/Rules, rule 3] An observable prototype, test, workflow, integration or technical finding can satisfy the event's build requirement; a pipeline is not excluded. [P, rule 2] The same submission must identify its user, current process and measurable burden reduction. [E, comparison with the README] The README supplies a development concept and promising test domains, but no concrete Fleet user, burden baseline or demonstrated result. [R] Submit a bounded development workflow through a useful application and measured user task, then show what part of creating it can be repeated. [A] The actual portal form and live category interpretation remain unverified.

## Scope and evidence

[E, source review on 2026-11-04] This review compares the local project README with [[Event/Rules]], [[Event/Judging]] and [[Sprint/Submission-Checklist]]. It does not certify compliance, inspect code or verify live portal changes. The checklist summarizes some terms requirements; the original terms were not reviewed for this seat.

[E, comparison method] An aligned intention is not completed compliance. A missing safeguard in the README is a specification gap, not evidence that an unbuilt system has already performed a prohibited act. No status below means an item has passed a live test.

## The twelve rules

| Rule | Fit in the README | Conflict, omission and required evidence |
| --- | --- | --- |
| 1. Align to an ROI | [P, README lines 17, 89 and 93] The plan aims to reduce development coordination and engineering effort. | [E] No OSW ROI is chosen or evidenced. [R] Use digital-workforce development and clarification of delivery friction if supported by observed results: skills practiced, tasks completed, barriers encountered and a recommended fix. Treat platform adoption as conditional on an actual packaging or deployment path. Do not claim all ROIs from general ambition. |
| 2. Solve a real problem | [P, lines 15 to 17, 23 and 73 to 75] Intake includes users and success criteria; candidate problems include parsing, scheduling and disconnected work. | [E] No actual role, present workflow, task frequency, baseline burden or measured improvement is stated. The factory's development customer and the resulting app's Fleet user are not distinguished. [R] Name roles, not personal details, and measure both benefits separately. |
| 3. Build, test, demonstrate | [P, lines 25 to 28 and 83 to 87] Runnable apps, tests and demonstrations are explicit intended outputs. | [E] The README alone provides no observable execution. [P, Rules] A workflow or technical finding can qualify; separate apps are not mandated by this rule. [R] Demonstrate one complete path and retain the inputs, actual outputs, failures and test evidence. Slides and generated folders do not prove the proposed behavior. |
| 4. Stay unclassified | [P, line 39] Real integrations depend on authorization; substitutes are labeled synthetic or sanitized. | [E] Sanitization is not a defined approval process, and authorization to connect is not necessarily authorization to disclose. [P, Rules] Restrictions also cover CUI, operationally sensitive information, PII, export-controlled and nonpublic government data unless vetted or approved. [R] Use invented personnel, messages and schedules, or suitable public inputs; apply the boundary to prompts, tools, logs, screenshots and exports. Do not use real operational traffic or merely remove names. |
| 5. Use authorized resources | [P, lines 24, 36 and 67] The plan favors existing tools and names candidates for evaluation. | [E] No authorized tool inventory, model list, dataset provenance or external-service disclosure is provided. Open-source availability does not establish suitability for every use or resolve license obligations. [R] Record tools actually used, versions, models, datasets, services, permissions and restrictions in the shared disclosure process. Candidate tools are not adopted dependencies. |
| 6. Preserve human authority | [P, lines 31 and 40] Humans control requirements, sensitive actions and readiness claims. | [E] The README does not enumerate permitted and prohibited actions, actual approval gates, monitoring, escalation or shutdown. [R] Define these for both the development agents and each generated application. Human control over building software does not automatically control the app's later actions. |
| 7. Disclose prior work | [P, lines 24, 29, 36 and 67] Reusing earlier software is intentional. | [E] There is no dated baseline separating pre-event code, the existing README, external components and work completed at the event. [R] Keep the original baseline, identify reused components and licenses, and list actual event changes and tests. Do not count upstream capabilities as event implementation. |
| 8. No sales pitches | [P, lines 35, 89 and 93] The plan emphasizes working results rather than appearance or repository count. | [E] A factory narrative without a mission result could still become a tool pitch. There is no evidence of an actual prohibited sales presentation. [R] Lead with the user's completed task and measured burden, then explain the development machinery only as needed. |
| 9. Design for Fleet conditions | [P, lines 11 and 75] Apps can have different deployment designs; one trial concerns offline changes and synchronization. | [E] Cybersecurity, portability, shipboard constraints, sustainment and the behavior of the other apps without connectivity are not specified. Offline editing does not establish safe reconciliation or offline AI. [R] Separate factory connectivity from app connectivity; name what works locally, what stops and what the user sees, and test an actual disconnection. |
| 10. Document friction | [P, lines 87 and 95] The plan includes limitations and a longer-term goal. | [E] A limitations report is not the required policy, data, authority, infrastructure, acquisition and technical barrier record. [R] Capture each actual barrier, its impact, the responsible function if known, the workaround and a proposed next step. Do not invent an organization or approval. |
| 11. Plan beyond Friday | [P, line 95] The long-term aim is field-testable software. | [E] No mission owner, technical owner, next experiment, required resources or 30/60/90-day recommendation is given. [R] Name accountable roles and mark acceptance as pending until confirmed; distinguish a transition proposal from a fielding commitment. |
| 12. Act professionally | [P, lines 31 and 40] Oversight and safeguards are intended. | [E] No behavior policy or execution boundaries are specified. [P, Rules] Unauthorized access, destructive testing and malicious activity are prohibited. [R] Demonstrate only in an isolated, authorized test setting; do not interpret the cybersecurity trial domain as permission to probe real systems. |

## The five judging criteria

| Criterion | Weight | What the README gives | What would make the case assessable |
| --- | --- | --- | --- |
| Warfighting and deckplate impact | [P] 30% | [P, lines 89 and 93] Less unnecessary human effort and engineering work are goals. | [E] Engineering productivity alone does not quantify a watchstander's burden. [R] Compare the same safe user task with the present method and the app: active minutes, corrections, omitted items and review effort. Label an event simulation as a simulation. |
| Speed to Fleet | [P] 20% | [P, lines 28, 75 and 84] Packaging and offline behavior are planned. | [E] No target environment, authorization path or sustained offline behavior is shown. [R] Demonstrate installation, local operation, disconnection and recovery on a stated device; state any cloud dependence and remaining fielding prerequisites. |
| Fleet scalability | [P] 20% | [P, lines 11, 29, 71 and 93] The process is intended to span different kinds of apps. | [E] A count of planned use cases or generated repositories is not demonstrated spread across ship classes, ratings or domains. [R] Show what transfers to a second task and what must be changed; keep the measured claim within the tested contexts. |
| Barrier removal | [P] 15% | [P, lines 15 to 17] Coordination across the development lifecycle is the proposed bottleneck. | [E] No bottleneck is timed or traced. [R] Record a specific eliminated handoff, repeated entry step or failed setup, plus what remains. Keep software-delivery barriers distinct from an officer's daily task burden. |
| Judges' discretion | [P] 15% | [P, lines 35 to 41] Technical function, testing and honest status are principles. | [E] The Sailor interface and an observable technical result are absent. [R] Show a clear task, understandable evidence, a visible failure and a safe human decision. Generality alone is not evidence of good experience. |

[E, arithmetic from Event/Judging] Impact and Speed to Fleet together account for 50% of the listed weights. [R] Prioritize a measured useful task and a believable operating environment before portfolio breadth. [A, Event/Judging] The local judging note treats a weighted-sum formula as an assumption; no score prediction is made here.

## The three challenge categories

| Category | Fit | What remains unresolved |
| --- | --- | --- |
| Naval Agentic AI | [P, Rules] This category concerns trustworthy, observable and governable agents for Navy missions. [E, README lines 26 and 31] Agent-assisted development and human control provide a plausible connection. | [E] The README lacks explicit allowed actions, prohibitions, approval, logs and stopping behavior. [A] Whether an agent that builds Navy applications meets the organizers' intended mission scope is not settled by the supplied category description. [R] Choose it only with a demonstrated governance model and an explicit mission link. |
| Bring Your Own Idea | [P, Rules] This category permits a broad range of problems with a clear warfighter connection. [E] A tool helping a defined Fleet role create useful software could fit. | [E] A generic developer platform has not yet established that link. [R] This is the clearest textual route if the team can show a concrete Fleet task, user and burden; confirm the live category choice rather than assuming acceptance. |
| Digital Challenge | [P, Rules] This category demonstrates, compares or improves tools already built by Sailors or warfighters, including consolidation and packaging. | [E] The README does not identify such an existing tool. Merely combining general open-source projects does not establish this category's stated basis. [A] There is a naming inconsistency involving FleetWorks in the local rules context, and the portal's six use-case labels differ from these three categories. Neither issue is resolved here. |

[P, Reference/Open-Questions] A Fleet-Ready Definition of Done is referenced in category material but has not been captured. [R] Do not declare compliance with it. Category names in a use-case listing should not be treated as a verified mapping to a submission category.

## Every submission checklist item

[E, comparison] The following is a coverage audit of the local [[Sprint/Submission-Checklist]], not a completed submission checklist. Intent means the README mentions a direction; missing means the required concrete content is absent. The original portal form has not been seen in the provided context.

| Group and item | README coverage and remaining action |
| --- | --- |
| Problem: user named | [E] Missing. Intake has a user field, but no role is selected. |
| Problem: operational problem stated | [E] Partial. Development delay and three trial topics are described; choose one concrete mission task. |
| Problem: current process | [E] Missing. Describe the actual steps being replaced, without inventing observations. |
| Problem: measured burden reduction | [E] Missing. Define the baseline, measure and comparison. |
| Problem: challenge category | [E] Missing. Select and confirm one. |
| Problem: OSW ROI with evidence | [E] Missing. Name the ROI and attach observed learning, adoption or barrier evidence. |
| Build: observable prototype, test, workflow, integration or finding | [E] Intent only, lines 25 to 28. Execute and retain evidence. |
| Build: acceptable unclassified data | [E] Conditional intent, line 39. Establish safe provenance and handling, including restricted categories beyond classification. |
| Build: Fleet conditions | [E] Partial intent, lines 11 and 75. Address cyber, portability, connectivity, shipboard limits, sustainment and disconnected behavior. |
| Authority: what it may do | [E] Missing. Enumerate actions for factory and apps. |
| Authority: what it must never do | [E] Missing. Enumerate explicit prohibitions. |
| Authority: human approval points | [E] Broad intent, lines 31 and 40. Define who approves what and when. |
| Authority: logging and monitoring | [E] Auditability is mentioned, line 40; an event record and monitoring procedure are missing. |
| Authority: escalation | [E] Missing. Define the failure or ambiguity triggers and accountable role. |
| Authority: shutdown | [E] Missing. Define and demonstrate stopping running work and preventing further actions. |
| Disclosure: tools, models, data and services | [E] Candidate names only, line 67. Maintain the actual-use inventory and shared disclosure log. |
| Disclosure: prior work versus event work | [E] Missing. Record the baseline and actual event changes. |
| Disclosure: contribution ownership and restrictions | [E] Missing. Document applicable ownership, licenses and restrictions; this checklist item is not resolved by calling a project open source. |
| Disclosure: policy, data, authority, infrastructure, acquisition and technical friction | [E] Missing as a structured record. Record observed barriers in the shared friction log. |
| Beyond Friday: mission owner | [E] Missing. Identify a role and verify that ownership is accepted. |
| Beyond Friday: technical owner | [E] Missing. Identify a role and verify that ownership is accepted. |
| Beyond Friday: next experiment | [E] Missing. State the next bounded test after the event. |
| Beyond Friday: required resources | [E] Missing. List the access, environment, people and approvals that experiment would require. |
| Beyond Friday: 30-day recommendation | [E] Missing. Supply an initial transition recommendation. |
| Beyond Friday: 60-day recommendation | [E] Missing. Supply the next validation recommendation and decision point. |
| Beyond Friday: 90-day recommendation | [E] Missing. Supply a bounded follow-on recommendation rather than claiming committed deployment. |
| Pitch: impact number, 30% | [E] Missing. Measure the burden before using a number. |
| Pitch: disconnected fielding path, 20% | [E] Partial intent. Show what actually runs disconnected and the remaining fielding work. |
| Pitch: reach across classes, ratings or domains, 20% | [E] Breadth is a goal, not evidence. Show transferable results without claiming universal coverage. |
| Pitch: bottleneck removed, 15% | [E] Coordination is the hypothesis. Identify a removed step or delay and its evidence. |
| Pitch: technical demonstration and Sailor experience, 15% | [E] Intent only. Demonstrate the complete user task and failure handling. |
| Pitch: mission results rather than vendor positioning | [E] Mission result missing. Lead with what the user can do and the evidence. |

## Does the team need an app, or can it submit a pipeline?

[P, Rules, rule 3] A pipeline implemented as an observable workflow is within the stated artifact types. [E, comparison] The supplied rules do not explicitly require a standalone app, three apps, all 34 use cases, a particular orchestrator or a new runtime. They also do not say that a promising README by itself satisfies the observable-build requirement.

[P, Rules, rules 1 and 2] A real user, current process, measurable burden and ROI alignment still apply to a pipeline. [E, interpretation] If the pipeline itself is the product, the team must name its user and measure that user's development burden, while explaining the Fleet mission connection. An engineering-time claim and a watchstander-time claim are different claims.

[R] Demonstrate one useful app from a defined task and make the factory's contribution visible through saved specifications, tests, review decisions and execution records. If time permits, repeat a meaningful part with a second task or changed requirement. This recommendation supports the README's repeatability claim; it is not a new event mandate or proof that the README's three-challenge plan is complete.

[A] The rules do not settle how judges will value a development platform relative to a direct Fleet app, whether the live form imposes extra fields, or whether a development agent qualifies for the intended Agentic AI category. [R] Ask the organizers those narrow questions through the team's authorized channel, without delaying the concrete user and measurement decisions.

## Sources

- [P] Project README: `~/Documents/CDAO/FleetHarness/README.md`, lines 1 to 95, read locally on 2026-11-04. Its web URL and commit were not independently checked.
- [P] [[Event/Rules]], local restatement of portal rules, read 2026-11-04.
- [P] [[Event/Judging]], local restatement of the five criteria and weights, read 2026-11-04.
- [P] [[Sprint/Submission-Checklist]], local checklist including terms-derived requirements, read 2026-11-04.
- [E] [[Reference/Open-Questions]], category, definition-of-done and submission-form gaps, read 2026-11-04.
- [E] No public web source was used. Full project and portal URLs were not verified. Local paths and note links identify the evidence used; no web URL is invented.
