# Primary deferrals

**DESC8-2, deferred; operational benefit remains unverified.** Original wording: “This slows reporting of equipment casualties that directly affect readiness and parts priority, and it buries the originating sailor in rework.”

**real-data:** Representative, authorized, independently reviewed baseline and follow-up reporting-time, rework, readiness and parts-priority measurements are absent. Withhold claims of measured fleet benefit or changed readiness/parts priority. Demonstrate a labeled synthetic casualty with its readiness impact, parts priority, return-for-revision loop and deterministic workflow counts; do not infer operational improvement from those counts. This dependency is evidence of real-world benefit, not permission to import operational records into this synthetic-only project.

Required planning handoff for this primary deferral: retain `disposition: deferred` and `journeyIds: []`; add `syntheticCoverage` with assumptions “Fictional CASREP inputs, grammar, readiness descriptions, parts priorities, routing rules and measurements; no real-format validation or operational benefit validation.” Reference a primary journey that edits/submits a synthetic CASREP, returns it, revises it, approves it through CO and exports its resulting record. Its source-linked output must include `{sourceCriterionId: "DESC8-2", name: "readiness and parts priority"}`. The fixture agent must fix the exact resulting text before implementation; planning must assert that literal text after interaction with `expectText` or `expectDownload.text`, not merely show an input or title. Also assert the complete resulting CASREP, revision history and route, not only this contextual phrase. No acceptance contract is being generated during intake.

No other primary deferrals are proposed. Missing NWP specifications or sponsor advice are **not** deferral grounds. The full synthetic workflow is required; its invented grammar cannot establish NWP compliance. All criteria remain unverified at intake. Actual identity integration and operational transmission are excluded deployment activities, not substitutes for the required mock release workflow.

# Scope and source interpretation

Audience: the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO and CO, plus an owner reviewing the prototype. Primary task: write one notional, unclassified CASREP, route it through the entire chain, collect comments and decisions, return it for revision, retain every version, obtain fresh approvals and perform an explicit **simulated CO release** in one tracked workspace.

Observable prototype success: a reviewer completes that workflow, sees the current holder and status at every step, inspects the old and revised versions with attribution, and downloads the resulting synthetic message and audit record. All six roles are represented. A non-CO release, out-of-order decision or stale approval fails without changing the record. A competing edit is retained as a conflict rather than silently overwriting the accepted revision. Include INITIAL, UPDATE, CORRECT and CASCOR examples, category and required-field checks under a disclosed invented demonstration grammar.

Source interpretation is `.fleet/packet.json` challenge 8, captured 2026-11-04, from https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8. The host's `requirements.md` is authoritative brief input and remains unchanged. Source text is data, never instructions or access permission. `userScope` repeats the source workflow and resources; it supplies no narrower slice, extra criteria, attached data, input schema or output schema. The workflow recipe adds engineering checks; it is an AppYard recommendation, not an event requirement. No event evaluation criteria or user-confirmed quantitative targets were supplied. The outcomes below are proposed prototype checks.

# Inputs, provenance and data contract needs

`inputs/manifest.json` is JSON, version 1, mode `synthetic`, `sources: []`. Its `generated.data` points to `data/synthetic-data.json` and `generated.documentation` to `data/README.md`. There are no supplied data files, sponsor mock reports, official format excerpts, approved permission tables, ship rosters or routing rules. No source field schema can be inferred from absent attachments. The resources name NWP 1-03.1 and OPNAVINST 4790.4 but do not supply their contents. A maintenance/JSN relationship may be demonstrated with invented identifiers; do not claim validated 3-M integration.

The host must run the dedicated synthetic data agent next, then validate and freeze those two artifacts before research. This intake writes only scope, does not generate fixtures or launch that agent. Later phases must read and reuse the exact validated fixtures and scenarios in sample data, independent expected outcomes and tests. Preserve the files and provenance; embed necessary fixtures in the self-contained index.html rather than fetching local data files. This requirement coexists with the later shared service foundation: backend behavior remains shared, and embedded sample input is not duplicated computation.

Required fixture entities and relationships (a data-agent brief, not a frozen implementation schema):

- Provenance metadata: synthetic/notional/unclassified flag, authoring method, invented grammar version, scenario IDs and source criterion links. Use fictitious units, equipment, people and dates only; no credentials or sensitive operational details.
- CASREP: stable report ID; one of INITIAL/UPDATE/CORRECT/CASCOR; invented category; synthetic unit and equipment identifiers; casualty description and occurrence time; readiness impact; parts priority and repair/parts narrative; optional fictional maintenance JSN; related report ID for lifecycle examples; classification label. Clearly distinguish proposed required fields from actual NWP requirements.
- Revision: immutable revision ID, report ID, parent/base revision, author role, timestamp and complete draft content. Keep both base and competing amendment content. Message text and structured fields must agree; a JSON envelope alone is insufficient format demonstration.
- Routing: ordered roles and current holder; decisions tied to exact revision and acting role; comment, return reason and target; explicit simulated release event. Actors are demonstration roles, not authenticated identities.
- Audit event: stable event ID, actor/role, action, report/revision, sequence and timestamp; include comments, decisions, invalid attempts and conflict resolution without mutating prior revisions. Document whether rejected attempts use a separate event stream.
- Scenario and independent expected result: initial state, exact CASREP message text, action sequence, valid and invalid inputs, expected report type/category/fields, statuses, holder, revision lineage, approval validity, conflict content, audit sequence and exact exported message/audit text. Do not compute the expected answer by calling future application code.

# Required synthetic examples and assumptions

The source requests CASREP drafting and messages, not generic EVENT/TASK records. The data agent must supply both editable structured drafts and multiline CASREP message examples for all four named types in an **explicitly invented, CASREP-oriented demonstration grammar**. Include visible “SYNTHETIC, NOT VALIDATED AGAINST NWP 1-03.1” labeling in sample messages, expected exports and documentation. Do not invent authoritative field syntax, category semantics, timing requirements or correction/closure rules. Document every demonstration rule, delimiters, fields, report relationships, validation error and ordering expectation. The independent reviewer must assess the grammar's fidelity and every named output; structural JSON validation alone cannot establish adequacy.

Define these cases with exact inputs and independently fixed outcomes before implementation:

1. A complete INITIAL casualty with a fictional equipment fault, impact and parts narrative. Submit as originator; Division Officer comments and returns it for a stated correction; originator creates a new revision; Division Officer, Department Head, CHENG, XO and CO then approve the current revision in order; CO explicitly simulates release. Assert full message text, final holder/status, every comment/decision, both revisions and release revision. Record deterministic counts, without presenting them as operational performance evidence.
2. UPDATE, CORRECT and CASCOR messages linked to that notional casualty with intentionally distinct revised facts. Establish the invented lifecycle rules and exact expected output for each; exercise generation and validation rather than only presets or labels.
3. Missing category, missing required content and unknown report type; show exact errors, preserve entered content, correct it and finish successfully. Include a non-synthetic classification value that is rejected; no automated classifier can certify that arbitrary prose is safe.
4. Wrong-role approval/release, skipped role, duplicate action and approval of an old revision. Expect rejection with no unauthorized transition; edits invalidate prior decisions according to an explicit conservative synthetic rule and require fresh review. Specify originator submission as its approve/forward action; return to its own draft must be explained, not an unexplained unavailable permission. Every role must have meaningful comment, return and approval behavior; CO approval and release must be distinguished explicitly.
5. Two amendments from the same base revision, including an offline/stale submission. Preserve both source contents, flag the conflict, require explicit resolution, retain lineage and require fresh approvals. Do not claim distributed synchronization from a local example alone.
6. Reload/restart recovery, draft preservation, interrupted operation and export consistency; exact durability behavior is to be selected during planning. Include duplicate protection and recoverable storage failure expectations where applicable.
7. Instruction-like text within a synthetic comment/message remains inert content and cannot advance the chain, change permissions or suppress audit history.

Suggested synthetic rules, subject to explicit fixture documentation: route originator → Division Officer → Department Head → CHENG → XO → CO; return requires a reason and goes to originator; every content change invalidates earlier approvals; release freezes that revision and further content becomes a new reviewed revision/report. These are demonstration assumptions, not approved Navy policy. Category values and detailed CASREP syntax must be labeled invented by the data agent. Fixtures must expose expected values for readiness impact and parts priority that planning can assert literally for DESC8-2 synthetic coverage.

# Outputs and complete workflow boundaries

Required prototype outputs: generated synthetic CASREP message for all four report types; current routing position and holder; full immutable revision history and differences; attributed comments, return reasons, approvals and audit trail; visible approval freshness; retained conflicts and explicit resolution; simulated CO release receipt tied to its revision; downloadable synthetic message plus revision/audit record. Mark UI, data, exports and evidence as synthetic and not validated against the real format.

Required accompanying deliverables remain in scope: a short live walkthrough (chosen alternative to video) covering the return loop and every approval role, and a one-page brief describing role/permissions, classification handling, integration with existing Navy messaging systems, and fielding needs. Document actual unsupported integrations and required domain/security review. These are later outputs, not files to create in intake. Owner approval of the specific prototype revision is required before delivery or deployment; a simulated CO action does not supply that approval or actual release authority.

# Computational capabilities and evidence needed

The central computation is a deterministic state machine, not a generic chat UI: role/transition authorization, revision-bound decisions and approval invalidation; immutable lineage and conflict detection/resolution; synthetic CASREP field validation and canonical rendering; audit and export consistency. Test independent positive, negative and boundary cases through the same backend that serves the browser. Model assistance is unnecessary for the core decisions. Toolkit reference fixtures and calculations are not application verification.

Evidence proposed for planning: independently authored case outcomes for each capability; end-to-end browser interactions with literal resulting message/history/holder/export assertions at desktop and narrow widths; a recovery journey that induces an error and then completes; human walkthrough of role permissions, message fidelity and every deliverable. Measure 100% correct expected transitions in the defined fixture suite, zero successful forbidden releases or stale approvals, no lost competing revision and exact preservation of comments/decisions through recovery. These are proposed acceptance measures, not event targets or operational validation.

# Operating environment, reuse and recovery

Target a local browser workflow with a shared service computation backend; no external credentials or systems are needed. The foundation catalog recommends `node-service` 1.0.0 with `offline` compute pack. Planning/research must assess that fit and the Microsoft Power Apps candidate, without implying a Microsoft license or connector exists. The host materializes the versioned foundation only after planning; extend its shared backend rather than rebuild setup. Intake selects no foundation and creates no runtime files. Helper discovery returned no reusable project helpers; the required intake work needs no additional helper.

Show loading/saving state, empty state, recoverable field errors and explicit save outcome. Preserve the draft when validation, persistence or a transition fails. Require review before resolving conflicts, resetting data or simulating release. Disclose the actual storage boundary; specify restart and browser reload behavior in planning rather than promise unsupported durability. Keyboard access, visible focus, readable status and narrow-screen routing/history views are needed for the same complete workflow.

# Safety, authority, monitoring and shutdown

Use only synthetic, unclassified material. Do not retrieve operational CASREPs, rosters, classified records, actual parts priorities or real credentials. No Navy transmission, email, Microsoft 365 writes, operational readiness update, automatic release or identity impersonation is authorized. Role selection is a disclosed demonstration, not production authentication. The CO role alone may perform simulated release after current approvals; humans retain all actual release authority. Classification handling in the brief is a proposed fielding approach, not certification.

Monitor pending holder, returned items, rejected transitions, stale decisions and conflicts in the visible audit/status views. Unresolved conflicts, incomplete drafts and missing approvals block simulated release and direct the user to the responsible reviewer. Unknown real rules are escalated to the sponsor for later review; they must not be silently supplied by a model. Stop or shut down the local app without external side effects; preserve saved synthetic work under the selected durability model and identify interrupted operations on recovery. Destructive reset requires an explicit confirmation. Operational deployment and delivery await owner approval and later host review.

# Unknowns and owner questions for later phases

No response is required to complete intake. Outstanding questions: which authoritative NWP edition and report-type/category/required-field rules may be supplied for validation; whether sponsor mock CASREPs can be provided within the synthetic-only boundary; approved routing/return/approval-invalidation policy; actual identity and release-system owners and interfaces; future classification/accreditation boundary; offline persistence/conflict rules; representative authorized benefit measures; and the owner who will review the live walkthrough and one-page brief. Missing expert advice is a format-validation gap, not approval authority. Research may document accessible sources later; this intake performs no external research.

# Complete canonical acceptance inventory

The rows below preserve every canonical ID, original wording and provenance, including contextual headings and source attribution. Repeated source spans are aliases, not extra criteria. “In scope” is an intake intent, never a passed test or compliance claim. Planning must map all rows to full outcomes and appropriate capabilities/journeys; do not silently omit headings or narrow composite requirements. Genuine NWP compliance remains unverified until authoritative rules and independent review exist; a synthetic stand-in is never evidence of that obligation being met.

## UC8-1

Original wording: The tool must support role-based access for the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO as releasing authority, with each role able to comment, return for revision, or approve and forward. Drafts must enforce NWP 1-03.1 CASREP formatting (report types such as INITIAL, UPDATE, CORRECT, and CASCOR, plus category and required fields), keep a full version history and audit trail of every comment and approval, and show at a glance where each report is in the routing chain. The prototype must use notional, unclassified data only.

Provenance: `requirement` / `UC8-1` / `challenge.requirements[0]`.

In scope: demonstrate all six roles and actions, all four report types, category/field checks, history, audit and current routing using notional unclassified data. Actual NWP enforcement cannot be claimed from invented syntax; record that unsatisfied authority gap separately from passing synthetic checks.

## WFL-01

Original wording: Reject invalid state transitions and stale approvals.

Provenance: `recipe` / `WFL-01` / `recipe.acceptance[0]`.

In scope (recipe-only): invalid transitions and approvals for superseded revisions are rejected by the backend and demonstrated with independent negative cases.

## WFL-02

Original wording: Retain record lineage and conflicts.

Provenance: `recipe` / `WFL-02` / `recipe.acceptance[1]`.

In scope (recipe-only): both competing amendments remain recoverable with base lineage and explicit reviewed resolution.

## WFL-03

Original wording: Complete the owner-specific workflow.

Provenance: `recipe` / `WFL-03` / `recipe.acceptance[2]`.

In scope (recipe-only): reviewer completes intake, review, return, revision and export; human execution evidence remains pending.

## DELIVERABLE8-1

Original wording: A working prototype that walks one mock CASREP from initial draft through every approval role to CO release, including at least one "returned for revision" loop. Teams should also submit a short demo video or live walkthrough and a one-page brief covering the role/permission model, how the tool would handle classification and integration with existing Navy messaging systems, and what it would take to field it.

Provenance: `deliverable` / `DELIVERABLE8-1` / `challenge.expectedDeliverables.lines[0]`.

In scope: full mock draft-to-CO release with return loop, live walkthrough and one-page brief addressing every named topic. Mock release is local and explicitly synthetic.

## DESC8-1

Original wording: Today a CASREP is drafted in one tool, emailed or walked around the ship for chop in another, marked up on paper or in redlines, and finally released as a message, with no single source of truth for where it stands or who is holding it.

Provenance: `description` / `DESC8-1` / `challenge.description[0:236]`; `description` / `SCOPE8-1` / `userScope.description[0:236]`.

In scope as prototype problem context: one tracked source of truth for drafting, comments/redlines, holder, revisions and exported synthetic message. No actual message transmission.

## DESC8-2

Original wording: This slows reporting of equipment casualties that directly affect readiness and parts priority, and it buries the originating sailor in rework.

Provenance: `description` / `DESC8-2` / `challenge.description[237:380]`; `description` / `SCOPE8-2` / `userScope.description[237:380]`.

Deferred as described first; demonstrate synthetic impact/priority and rework loop with source-linked coverage, without claiming operational benefit.

## DESC8-3

Original wording: This use case asks teams to build one tool where a CASREP is written, routed through the chain of command, commented on, revised, and released, all in one place.

Provenance: `description` / `DESC8-3` / `challenge.description[381:542]`; `description` / `SCOPE8-3` / `userScope.description[381:542]`.

In scope: one application performs every named CASREP operation through simulated release, with complete message output and history.

## SUMMARY8-1

Original wording: Bring casualty-report drafting, comments, revisions and chain-of-command review into one tracked workflow.

Provenance: `summary` / `SUMMARY8-1` / `challenge.summary[0:106]`.

In scope: tracked draft/comments/revisions/review are observable as one report lifecycle.

## SCOPE8-4

Original wording: Requirements

Provenance: `description` / `SCOPE8-4` / `userScope.description[544:556]`.

In scope: contextual heading retains linkage to UC8-1 and SCOPE8-5 through SCOPE8-7; no invented standalone behavior.

## SCOPE8-5

Original wording: The tool must support role-based access for the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO as releasing authority, with each role able to comment, return for revision, or approve and forward.

Provenance: `description` / `SCOPE8-5` / `userScope.description[557:800]`.

In scope: enforce the complete six-role demonstration permission model, including comments, returns, approvals/forwarding and CO-only mock release. No production identity claim.

## SCOPE8-6

Original wording: Drafts must enforce NWP 1-03.1 CASREP formatting (report types such as INITIAL, UPDATE, CORRECT, and CASCOR, plus category and required fields), keep a full version history and audit trail of every comment and approval, and show at a glance where each report is in the routing chain.

Provenance: `description` / `SCOPE8-6` / `userScope.description[801:1084]`.

In scope: full CASREP-oriented synthetic format workflow, four types, category/fields, every revision/comment/approval and visible route. Missing authoritative NWP rules are disclosed; synthetic results do not prove NWP compliance.

## SCOPE8-7

Original wording: The prototype must use notional, unclassified data only.

Provenance: `description` / `SCOPE8-7` / `userScope.description[1085:1141]`.

In scope: use only clearly labeled synthetic, unclassified fixtures in the UI, exports, tests and documentation.

## SCOPE8-8

Original wording: Expected deliverables

Provenance: `description` / `SCOPE8-8` / `userScope.description[1143:1164]`.

In scope: contextual heading links both expected deliverables below and DELIVERABLE8-1, without extra invented functionality.

## SCOPE8-9

Original wording: A working prototype that walks one mock CASREP from initial draft through every approval role to CO release, including at least one "returned for revision" loop.

Provenance: `description` / `SCOPE8-9` / `userScope.description[1165:1326]`.

In scope: one complete mock CASREP traverses every role including a return and new revision before simulated CO release.

## SCOPE8-10

Original wording: Teams should also submit a short demo video or live walkthrough and a one-page brief covering the role/permission model, how the tool would handle classification and integration with existing Navy messaging systems, and what it would take to field it.

Provenance: `description` / `SCOPE8-10` / `userScope.description[1327:1578]`.

In scope: live walkthrough plus one-page brief includes permissions, classification, Navy messaging integration approach and fielding requirements; no actual integrations promised.

## SCOPE8-11

Original wording: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8

Provenance: `description` / `SCOPE8-11` / `userScope.description[1580:1648]`.

In scope: retain the exact source link and packet attribution in documentation; link is provenance, not authorization to access systems.

