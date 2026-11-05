# Primary deferrals

**DESC8-2, deferred and unverified.** Original wording: “This slows reporting of equipment casualties that directly affect readiness and parts priority, and it buries the originating sailor in rework.”

**real-data:** No representative authorized baseline/follow-up reporting-time, rework, readiness or parts-priority measurements exist. Withhold measured fleet-benefit claims. Demonstrate the complete SC-01 synthetic casualty workflow, contextual readiness/priority result and deterministic counts; these do not measure operational improvement. `syntheticCoverage` references `synthetic-primary`, quotes “readiness and parts priority” from DESC8-2 and asserts the exact resulting value after release, alongside complete message and audit downloads. This evidence gap does not authorize importing real operational data.

No other primary deferrals are selected. Missing NWP text, sponsor samples and approved rules do not justify deferring the synthetic implementation. UC8-1 and SCOPE8-6 retain their original NWP obligation: the full invented CASREP grammar is a stand-in, and **real-format compliance remains unverified**, even if every prototype check passes. Implemented dispositions describe the synthetic scope; they do not establish that all source requirements are met. No actual authenticated identity, classified processing, Navy messaging, Microsoft 365 integration or official transmission is claimed. Owner approval is required before delivery/deployment; simulated CO release is not that approval.

# Acceptance inventory and evidence plan

Every row preserves the packet's canonical criterion and complete provenance; source aliases are not extra criteria. Expected outcomes are fixed before code. All checks below are PLANNED/UNVERIFIED. Fixture preparation and toolkit self-tests do not count as application evidence. Application Node tests must import actual shared backend functions and compare complete outputs; host browser checks run every journey fresh at desktop and narrow widths.

## UC8-1, implemented

Original requirement: The tool must support role-based access for the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO as releasing authority, with each role able to comment, return for revision, or approve and forward. Drafts must enforce NWP 1-03.1 CASREP formatting (report types such as INITIAL, UPDATE, CORRECT, and CASCOR, plus category and required fields), keep a full version history and audit trail of every comment and approval, and show at a glance where each report is in the routing chain. The prototype must use notional, unclassified data only.

Provenance: [{"kind": "requirement", "id": "UC8-1", "path": "challenge.requirements[0]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. All four report types, required fields, category, linked lifecycle prerequisites and all six roles are exercised under the disclosed invented SYN-CASREP-1 grammar. NWP 1-03.1 compliance is not established; this implemented synthetic stand-in cannot satisfy the real-format obligation, which remains unverified in review.

Typed capability evidence: casrep-format, review-route, revision-lineage. Planned browser journeys: synthetic-primary, linked-types, recover-validation, recover-conflict.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## WFL-01, implemented

Original requirement: Reject invalid state transitions and stale approvals.

Provenance: [{"kind": "recipe", "id": "WFL-01", "path": "recipe.acceptance[0]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: Wrong holder, stale revision, duplicate approval, non-CO release and missing confirmation fail without altering accepted state. Editing after approvals resets DRAFT and requires six fresh decisions; tests verify retained invalid approvals.

Typed capability evidence: review-route. Planned browser journeys: recover-validation, synthetic-primary.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## WFL-02, implemented

Original requirement: Retain record lineage and conflicts.

Provenance: [{"kind": "recipe", "id": "WFL-02", "path": "recipe.acceptance[1]"}]

Input: SC-21 sibling edits and confirmed merge; novel sibling/unknown-parent inputs; disconnected-copy UI.

Literal expected outcome: Competing full snapshots survive reconciliation; unresolved heads block review/release; explicit confirmed merge retains all heads and requires fresh decisions. Missing history/collisions fail without losing queued revisions.

Typed capability evidence: revision-lineage. Planned browser journeys: recover-conflict.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## WFL-03, implemented

Original requirement: Complete the owner-specific workflow.

Provenance: [{"kind": "recipe", "id": "WFL-03", "path": "recipe.acceptance[2]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. A reviewer performs the live walkthrough; one-page brief is available as printable HTML.

Typed capability evidence: review-route. Planned browser journeys: synthetic-primary, recover-storage.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## DELIVERABLE8-1, implemented

Original requirement: A working prototype that walks one mock CASREP from initial draft through every approval role to CO release, including at least one "returned for revision" loop. Teams should also submit a short demo video or live walkthrough and a one-page brief covering the role/permission model, how the tool would handle classification and integration with existing Navy messaging systems, and what it would take to field it.

Provenance: [{"kind": "deliverable", "id": "DELIVERABLE8-1", "path": "challenge.expectedDeliverables.lines[0]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. A reviewer performs the live walkthrough; one-page brief is available as printable HTML.

Typed capability evidence: review-route. Planned browser journeys: synthetic-primary, recover-storage, review-material.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## DESC8-1, implemented

Original requirement: Today a CASREP is drafted in one tool, emailed or walked around the ship for chop in another, marked up on paper or in redlines, and finally released as a message, with no single source of truth for where it stands or who is holding it.

Provenance: [{"kind": "description", "id": "DESC8-1", "path": "challenge.description[0:236]"}, {"kind": "description", "id": "SCOPE8-1", "path": "userScope.description[0:236]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. Current holder, saved state and review decisions remain visible through reload; no external email or paper handoff is required for the demonstration.

Typed capability evidence: review-route. Planned browser journeys: synthetic-primary.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## DESC8-2, deferred

Original requirement: This slows reporting of equipment casualties that directly affect readiness and parts priority, and it buries the originating sailor in rework.

Provenance: [{"kind": "description", "id": "DESC8-2", "path": "challenge.description[237:380]"}, {"kind": "description", "id": "SCOPE8-2", "path": "userScope.description[237:380]"}]

Input: SC-01 synthetic readiness/priority context and complete return/revision/release sequence; no real baseline or follow-up data.

Literal expected outcome: Measured reporting-time, rework, readiness and parts-priority improvement remains unverified; the full synthetic workflow produces the fixed readiness/priority result and exports.

Typed capability evidence: none; documentary/browser or explicitly deferred evidence. Planned browser journeys: syntheticCoverage: synthetic-primary; criterion itself remains deferred.

Reason: real-data: Representative authorized baseline and follow-up reporting-time, rework, readiness and parts-priority measurements are absent. Withhold measured fleet-benefit claims; demonstrate the complete synthetic return/revision/release workflow and fixed readiness and parts priority context.

Synthetic output asserted after interaction: “readiness and parts priority: Training cooling capacity reduced; backup pump supports one training loop. | DEMO-URGENT”. Also compare complete CASREP, route, history and all export bytes. Source output name: readiness and parts priority. Real benefit remains unverified regardless of prototype checks.

## DESC8-3, implemented

Original requirement: This use case asks teams to build one tool where a CASREP is written, routed through the chain of command, commented on, revised, and released, all in one place.

Provenance: [{"kind": "description", "id": "DESC8-3", "path": "challenge.description[381:542]"}, {"kind": "description", "id": "SCOPE8-3", "path": "userScope.description[381:542]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. Current holder, saved state and review decisions remain visible through reload; no external email or paper handoff is required for the demonstration.

Typed capability evidence: review-route. Planned browser journeys: synthetic-primary.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## SUMMARY8-1, implemented

Original requirement: Bring casualty-report drafting, comments, revisions and chain-of-command review into one tracked workflow.

Provenance: [{"kind": "summary", "id": "SUMMARY8-1", "path": "challenge.summary[0:106]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. Current holder, saved state and review decisions remain visible through reload; no external email or paper handoff is required for the demonstration.

Typed capability evidence: review-route. Planned browser journeys: synthetic-primary.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## SCOPE8-4, implemented

Original requirement: Requirements

Provenance: [{"kind": "description", "id": "SCOPE8-4", "path": "userScope.description[544:556]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: The Requirements heading is retained as provenance for the complete role, format, audit, route and synthetic-data obligations, with no separate behavior invented for the heading.

Typed capability evidence: casrep-format, review-route. Planned browser journeys: synthetic-primary.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## SCOPE8-5, implemented

Original requirement: The tool must support role-based access for the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO as releasing authority, with each role able to comment, return for revision, or approve and forward.

Provenance: [{"kind": "description", "id": "SCOPE8-5", "path": "userScope.description[557:800]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. SC-24 independently exercises comment, return and forward for all six roles, including Originator withdrawal and separate CO release.

Typed capability evidence: review-route. Planned browser journeys: synthetic-primary.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## SCOPE8-6, implemented

Original requirement: Drafts must enforce NWP 1-03.1 CASREP formatting (report types such as INITIAL, UPDATE, CORRECT, and CASCOR, plus category and required fields), keep a full version history and audit trail of every comment and approval, and show at a glance where each report is in the routing chain.

Provenance: [{"kind": "description", "id": "SCOPE8-6", "path": "userScope.description[801:1084]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. All four report types, required fields, category, linked lifecycle prerequisites and all six roles are exercised under the disclosed invented SYN-CASREP-1 grammar. NWP 1-03.1 compliance is not established; this implemented synthetic stand-in cannot satisfy the real-format obligation, which remains unverified in review.

Typed capability evidence: casrep-format, review-route, revision-lineage. Planned browser journeys: synthetic-primary, linked-types, recover-validation, recover-conflict.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## SCOPE8-7, implemented

Original requirement: The prototype must use notional, unclassified data only.

Provenance: [{"kind": "description", "id": "SCOPE8-7", "path": "userScope.description[1085:1141]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: Only notional synthetic samples are supplied; invalid handling labels are rejected and all pages/messages/exports visibly disclaim operational format validation. Text is inert, and role switching is disclosed as demonstration identity.

Typed capability evidence: casrep-format. Planned browser journeys: recover-validation, synthetic-primary.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## SCOPE8-8, implemented

Original requirement: Expected deliverables

Provenance: [{"kind": "description", "id": "SCOPE8-8", "path": "userScope.description[1143:1164]"}]

Input: Open printable brief/live walkthrough and inspect source/provenance; execute SC-01.

Literal expected outcome: Deliver a working full mock return/revise/release flow, an executable live walkthrough and a printable one-page brief covering role permissions, classification, Navy messaging integration, fielding prerequisites and owner approval.

Typed capability evidence: none; documentary/browser or explicitly deferred evidence. Planned browser journeys: review-material, synthetic-primary.

Application check: browser review-material plus human inspection/print of brief.html and walkthrough.html. No live-human acceptance claimed.

## SCOPE8-9, implemented

Original requirement: A working prototype that walks one mock CASREP from initial draft through every approval role to CO release, including at least one "returned for revision" loop.

Provenance: [{"kind": "description", "id": "SCOPE8-9", "path": "userScope.description[1165:1326]"}]

Input: SC-01 to 25 as applicable; complete mock draft, all six role decisions, return/revision, invalid/stale attempts, linked message types and nonpreset user content.

Literal expected outcome: One tracked synthetic CASREP workspace produces the complete SC-01 canonical message, preserved R1/R2 history, twelve accepted audit events, one comment, one return, six current-revision decisions, exact exports and a separate confirmed CO simulated release with no transmission. A reviewer performs the live walkthrough; one-page brief is available as printable HTML.

Typed capability evidence: review-route. Planned browser journeys: synthetic-primary, recover-storage.

Application checks: format.test.mjs, workflow.test.mjs, lineage.test.mjs, persistence.test.mjs, narrowed by the fixture/negative-case inventory below. Human semantic/format review remains separate from passing code.

## SCOPE8-10, implemented

Original requirement: Teams should also submit a short demo video or live walkthrough and a one-page brief covering the role/permission model, how the tool would handle classification and integration with existing Navy messaging systems, and what it would take to field it.

Provenance: [{"kind": "description", "id": "SCOPE8-10", "path": "userScope.description[1327:1578]"}]

Input: Open printable brief/live walkthrough and inspect source/provenance; execute SC-01.

Literal expected outcome: Deliver a working full mock return/revise/release flow, an executable live walkthrough and a printable one-page brief covering role permissions, classification, Navy messaging integration, fielding prerequisites and owner approval.

Typed capability evidence: none; documentary/browser or explicitly deferred evidence. Planned browser journeys: review-material, synthetic-primary.

Application check: browser review-material plus human inspection/print of brief.html and walkthrough.html. No live-human acceptance claimed.

## SCOPE8-11, implemented

Original requirement: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8

Provenance: [{"kind": "description", "id": "SCOPE8-11", "path": "userScope.description[1580:1648]"}]

Input: Open printable brief/live walkthrough and inspect source/provenance; execute SC-01.

Literal expected outcome: Retain exact source URL and capture date in the UI and documentation; no claim of live retrieval, source-format validation or operational integration.

Typed capability evidence: none; documentary/browser or explicitly deferred evidence. Planned browser journeys: review-material.

Application check: browser review-material plus human inspection/print of brief.html and walkthrough.html. No live-human acceptance claimed.

# Domain and boundary case inventory

| Inputs | Independently fixed outcome | Application evidence |
| --- | --- | --- |
| SC-01 twelve individual operations | RELEASED/None, R2 frozen, R1 retained, one repairNarrative difference, 12 accepted events, 6 valid R2 decisions, R1 submission invalid; exact 3 exports | workflow.test.mjs; synthetic-primary; byte-for-byte export comparison |
| SC-02 UPDATE, SC-03 CORRECT, SC-04 CASCOR with released INITIAL receipt | Exact complete distinct fixture messages; own DRAFT/Originator, no automatic approval/release | format.test.mjs; linked-types |
| SC-05 no optional JSN | Canonical MAINTENANCE_JSN: NONE, no required-field error | format.test.mjs; new-user-report |
| SC-06 to 10 missing category/narrative, unknown type/category, forbidden handling | Exact fixture error, unchanged accepted state, draft preserved, corrected input can submit | format.test.mjs; recover-validation |
| SC-11 to 13 wrong/skipped holder and non-CO release | Exact authority error, accepted count/holder unchanged, one rejection | workflow.test.mjs; recover-validation |
| SC-14 stale R1 approval on R2 | Approval revision is stale. before holder error, no accepted mutation | workflow.test.mjs; route-reference |
| SC-15 incomplete CO route | Current revision requires all route approvals before release. | workflow.test.mjs; route-reference |
| SC-16 empty return reason | Return reason is required.; current route retained | workflow.test.mjs |
| SC-17 unconfirmed CO release | Confirm simulated release.; READY_FOR_RELEASE preserved | workflow.test.mjs; route-reference |
| SC-18 edit released revision | Released revision is frozen; create a linked report.; exact accepted state preserved | workflow.test.mjs |
| SC-19 exact operation replay/new duplicate decision | Retry adds zero events; new duplicate reports Role already approved this revision. | workflow.test.mjs; route-reference |
| SC-20 edit after approvals | DRAFT/Originator R3, all old decisions retained invalid, no valid R3 decision | workflow.test.mjs; route-reference |
| SC-21 two branches and selected merge | Both complete branches preserved, CONFLICT blocks review, R4 has both parents, 5 revisions retained, fresh submission needed | lineage.test.mjs; recover-conflict; lineage-reference |
| SC-22 instruction-like comment | Stored inertly as COMMENT; no route jump, release or audit deletion | workflow.test.mjs and rendered-text inspection |
| SC-23 commit/reload/restart/precommit failure/retry | R2 and count 5 survive; failed R3 save preserves pending text/count 5; retry commits one new revision/count 6 | persistence.test.mjs; recover-storage (UI uses root/R2 equivalent) |
| SC-24 six roles × independent comment/return/forward alternatives | Each action adds one accepted event; comments do not move holder, returns invalidate; CO approval separate from release | workflow.test.mjs; human live walkthrough |
| SC-25 exports before/after reload/restart | Same full message, audit and revision/audit bytes; no audit event from export | persistence.test.mjs; synthetic-primary |
| Nonpreset editable draft/type/link/actor/merge choices | Declared canonical output, changed constraints change result, invalid/impossible cases abstain/reject | all 3 exact host evaluations; new-user-report proves interface input |
| Mixed invalid fields and stale/wrong-holder decision | Classification/type/required precedence as public protocol; stale before holder, duplicate decision before holder | format.test.mjs; workflow.test.mjs |
| CR/LF/delimiter, invalid calendar date, malformed types, unknown request, limit+1 | Ordered semantic errors or Invalid request. exactly; no partial mutation | format.test.mjs; workflow.test.mjs |
| Missing/cross-report/cyclic parents and ID/content collisions | Explicit error, unchanged original queue; never silently pick a head | lineage.test.mjs with actual offline adapter |
| Same revisions merged in opposite order; identical replay | Same retained graph/head set and selected merge content; insertion-ordered audit is compared separately | lineage.test.mjs |
| Browser draft differs from approved content | Deliberate Save or Discard required before action/record switch; revision edit invalidates approvals | workflow.test.mjs plus interactive browser review |
| Storage CAS conflict and interrupted acknowledgement | Old checkpoint preserved; reload/review required; same operation retry adds no duplicate | persistence.test.mjs with actual store and restarted service |

# Metrics, baselines and evidence limits

Exact host evaluations format-reference, route-reference and lineage-reference each use threshold 1.0, baseline 0, one trial; complete response shape and array order must match. No optimization metric applies. Cases were independently fixed by the planner from explicit synthetic grammar/route rules before candidate code. They are bounded synthetic cases, not sponsor-reviewed NWP or operational truth. Tests must never import evaluation-plan.json or look up answers by scenario ID. Supplied fixture oracles may be imported for application tests; runtime domain logic must derive outputs.

# Human and operational review

Human reviewers must inspect every named output, complete report transformations and format fidelity against the card, not parser success alone. Check one-page print layout and actually execute the live walkthrough. Check desktop/narrow visual captures, native labels/keyboard/focus, saved/unsaved boundary, readable merge choices and visible synthetic provenance. Host-recorded initial/recheck reviews at both widths are mandatory in each build/verification session. No visual review was attempted during planning.

Original NWP formatting, approved Navy routing, classifications, 3-M/JSN meaning, identity, real messaging integration, durability/retention/encryption and operational benefit remain unvalidated. Source names NWP 1-03.1 and OPNAVINST 4790.4 but supplies no authoritative content; invented synthetic rules do not establish compliance. DESC8-2 remains deferred even when all prototype tests pass. No fielding/deployment/official release without authorized owner approval and separate integration/security/domain evidence. Prohibited actions, monitoring, escalation and shutdown are specified in plan.md and must appear in brief/user guidance. Do not send messages to obtain review automatically.

Later phases record actual results in verification.md and host-owned reports, preserving failures and bounded repair evidence. Never edit this inventory or frozen expectations to make a failed check pass. If a frozen expectation is defective, record it for a new planning run. Passing totals cannot establish requirementsMet, reviewer acceptance or operational validation.
