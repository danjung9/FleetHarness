# Primary deferrals

None for the notional prototype; NWP conformance, operational identity/release and real readiness benefit remain unverified, as detailed in plan.md. No check below has been executed.

# Acceptance inventory and planned evidence

Each canonical criterion appears once. Original wording and all provenance are preserved verbatim below; aliases are not additional criteria. Expected outcomes were fixed before implementation. Implemented denotes the synthetic scope. Source headings are traceability rather than new behavior. Human review covers semantic adequacy and documents.

## UC8-1

Original wording: The tool must support role-based access for the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO as releasing authority, with each role able to comment, return for revision, or approve and forward. Drafts must enforce NWP 1-03.1 CASREP formatting (report types such as INITIAL, UPDATE, CORRECT, and CASCOR, plus category and required fields), keep a full version history and audit trail of every comment and approval, and show at a glance where each report is in the routing chain. The prototype must use notional, unclassified data only.

Provenance: [{"kind": "requirement", "id": "UC8-1", "path": "challenge.requirements[0]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Synthetic CASREP workspace completes the named source obligation: all six actors, comments and return loop, revised immutable snapshots, five current-revision approvals, explicit local mock CO release, holder and audit visibility; INITIAL/UPDATE/CORRECT/CASCOR obey the disclosed invented grammar. Exact supplied messages and exports remain labeled synthetic. NWP conformance and operational authority remain unverified.

Capability checks: casrep-format, review-route, revision-conflicts. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## WFL-01

Original wording: Reject invalid state transitions and stale approvals.

Provenance: [{"kind": "recipe", "id": "WFL-01", "path": "recipe.acceptance[0]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Wrong-role, skipped-role, stale-revision and duplicate/released transitions are rejected without changing successful audit. Editing B after EV-001-07 invalidates that approval and sets DRAFT; release is blocked until all five reviewers approve the new revision.

Capability checks: review-route. Browser journeys: return-release, io-recovery.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## WFL-02

Original wording: Retain record lineage and conflicts.

Provenance: [{"kind": "recipe", "id": "WFL-02", "path": "recipe.acceptance[1]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: C and D branch from B and differ in repair. Display base 2026-10-13T18:00:00Z, left 2026-10-14T12:00:00Z and right 2026-10-15T12:00:00Z. Explicit left choice produces E with both parents, five retained revisions, no valid approvals and DRAFT; submit restarts at Division Officer.

Capability checks: revision-conflicts. Browser journeys: conflict-resolution.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## WFL-03

Original wording: Complete the owner-specific workflow.

Provenance: [{"kind": "recipe", "id": "WFL-03", "path": "recipe.acceptance[2]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Reviewer completes actual draft, submit, comment, return, revised save, resubmit, five approvals and explicit CO mock release, then downloads the saved message/audit package matching B.

Capability checks: review-route. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## DELIVERABLE8-1

Original wording: A working prototype that walks one mock CASREP from initial draft through every approval role to CO release, including at least one "returned for revision" loop. Teams should also submit a short demo video or live walkthrough and a one-page brief covering the role/permission model, how the tool would handle classification and integration with existing Navy messaging systems, and what it would take to field it.

Provenance: [{"kind": "deliverable", "id": "DELIVERABLE8-1", "path": "challenge.expectedDeliverables.lines[0]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Actual interactions walk mock INITIAL A through return to originator, corrected B, all five downstream reviewers and explicit CO mock release. Final RELEASED/NONE, two revisions, five current approvals and exact supplied synthetic export. Accessible live walkthrough guide and one-page fielding brief cover role permissions, classification handling, Navy messaging integration approach and fielding prerequisites; live execution remains a human review activity.

Capability checks: review-route. Browser journeys: return-release, documentation.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## DESC8-1

Original wording: Today a CASREP is drafted in one tool, emailed or walked around the ship for chop in another, marked up on paper or in redlines, and finally released as a message, with no single source of truth for where it stands or who is holding it.

Provenance: [{"kind": "description", "id": "DESC8-1", "path": "challenge.description[0:236]"}, {"kind": "description", "id": "SCOPE8-1", "path": "userScope.description[0:236]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: One workspace displays saved message, current revision, current holder, route and historical comments/approvals; full return-release path ends in a downloaded synthetic message/audit package, with no email or external release required for this local demonstration.

Capability checks: review-route. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## DESC8-2

Original wording: This slows reporting of equipment casualties that directly affect readiness and parts priority, and it buries the originating sailor in rework.

Provenance: [{"kind": "description", "id": "DESC8-2", "path": "challenge.description[237:380]"}, {"kind": "description", "id": "SCOPE8-2", "path": "userScope.description[237:380]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Fictional casualty impact and parts-priority narrative remain visible beside returned feedback; the sailor edits once and retains both versions. No measured readiness or time improvement is claimed.

Capability checks: review-route. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## DESC8-3

Original wording: This use case asks teams to build one tool where a CASREP is written, routed through the chain of command, commented on, revised, and released, all in one place.

Provenance: [{"kind": "description", "id": "DESC8-3", "path": "challenge.description[381:542]"}, {"kind": "description", "id": "SCOPE8-3", "path": "userScope.description[381:542]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: CASREP is actually written, submitted, commented on, returned, revised to B and routed through the named six-role chain in one workspace, ending in explicit local mock release and matching message/audit export.

Capability checks: review-route. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SUMMARY8-1

Original wording: Bring casualty-report drafting, comments, revisions and chain-of-command review into one tracked workflow.

Provenance: [{"kind": "summary", "id": "SUMMARY8-1", "path": "challenge.summary[0:106]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Drafting, comments, A/B revision history and complete chain-of-command decisions remain in one durable report workspace; return-release journey yields RELEASED/NONE and reload preserves all five valid approvals.

Capability checks: review-route. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SCOPE8-4

Original wording: Requirements

Provenance: [{"kind": "description", "id": "SCOPE8-4", "path": "userScope.description[544:556]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Requirements heading is preserved as source traceability; all child obligations map to six-role routing, four-type synthetic validation, history/audit, current holder and synthetic-only data checks.

Capability checks: Browser/document evidence only. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SCOPE8-5

Original wording: The tool must support role-based access for the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO as releasing authority, with each role able to comment, return for revision, or approve and forward.

Provenance: [{"kind": "description", "id": "SCOPE8-5", "path": "userScope.description[557:800]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: All six named roles have comment capability on unreleased content; only originator edits/submits, downstream current holder returns or approves/forwards, CO approves then explicitly mock-releases. Self-return/CO-forward restrictions and unauthorized actor are visible and rejected server-side. Role selection is labeled simulation.

Capability checks: review-route. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SCOPE8-6

Original wording: Drafts must enforce NWP 1-03.1 CASREP formatting (report types such as INITIAL, UPDATE, CORRECT, and CASCOR, plus category and required fields), keep a full version history and audit trail of every comment and approval, and show at a glance where each report is in the routing chain.

Provenance: [{"kind": "description", "id": "SCOPE8-6", "path": "userScope.description[801:1084]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Exact supplied INITIAL, UPDATE, CORRECT and CASCOR texts parse and render; missing equipment, invalid type/category/timestamp/marking are rejected. A/B history, every comment and approval and routing/current holder remain inspectable. Invented grammar is fully disclosed; actual NWP 1-03.1 conformance remains unverified.

Capability checks: casrep-format. Browser journeys: four-types, return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SCOPE8-7

Original wording: The prototype must use notional, unclassified data only.

Provenance: [{"kind": "description", "id": "SCOPE8-7", "path": "userScope.description[1085:1141]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Only exact fictional supplied samples and labeled synthetic edits are used; every screen and message/audit export says Synthetic, not validated against the real CASREP format. Prohibited marking test rejects the fabricated placeholder.

Capability checks: casrep-format. Browser journeys: return-release, validation-recovery.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SCOPE8-8

Original wording: Expected deliverables

Provenance: [{"kind": "description", "id": "SCOPE8-8", "path": "userScope.description[1143:1164]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Expected deliverables heading is preserved as traceability; child deliverables include actual six-role return/revision/mock-release journey, live walkthrough guide and one-page fielding brief, inspected through documentation journey.

Capability checks: Browser/document evidence only. Browser journeys: documentation, return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SCOPE8-9

Original wording: A working prototype that walks one mock CASREP from initial draft through every approval role to CO release, including at least one "returned for revision" loop.

Provenance: [{"kind": "description", "id": "SCOPE8-9", "path": "userScope.description[1165:1326]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Mock INITIAL A is saved/submitted, commented on and returned, revised to B, resubmitted, approved by Division Officer, Department Head, Engineer Officer/CHENG, XO and CO then explicitly mock-released. RELEASED/NONE, two revisions, five valid approvals, exact export and reload state are observable.

Capability checks: review-route. Browser journeys: return-release.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SCOPE8-10

Original wording: Teams should also submit a short demo video or live walkthrough and a one-page brief covering the role/permission model, how the tool would handle classification and integration with existing Navy messaging systems, and what it would take to field it.

Provenance: [{"kind": "description", "id": "SCOPE8-10", "path": "userScope.description[1327:1578]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Live walkthrough guide and one-page fielding brief describe all six role permissions, classification boundary, Navy messaging integration approach and fielding prerequisites; both accessible in UI and delivered as documents.

Capability checks: Browser/document evidence only. Browser journeys: documentation.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

## SCOPE8-11

Original wording: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8

Provenance: [{"kind": "description", "id": "SCOPE8-11", "path": "userScope.description[1580:1648]"}]

Disposition: implemented (planned synthetic scope).

Input: exact prepared messages, revisions and scenario commands in data/synthetic-data.json; no operational inputs.

Expected: Source is linked and quoted with original provenance intact.

Capability checks: Browser/document evidence only. Browser journeys: documentation.

Application evidence: domain.test.mjs, persistence.test.mjs and workflow.test.mjs as applicable; host capability evaluation, browser outcomes and human semantic review. Actual results belong in verification.md.

# Boundary and integration matrix

| Input / failure | Independently expected outcome | Planned check |
| --- | --- | --- |
| INITIAL returned for revision then CO release | Replay explicit actor actions in listed order. Each event specifies holder/status. Only five approvals on REV-001-B authorize local mock release; originator submission is not a reviewer approval. Preserve return comment and both snapshots. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Parse and render UPDATE | Parse exactly to expected.parsedFields, return no errors, render exact LF-terminated expected.renderedMessage. Linked report starts a fresh route; never inherit approvals. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Parse and render CORRECT | Parse exactly to expected.parsedFields, return no errors, render exact LF-terminated expected.renderedMessage. Linked report starts a fresh route; never inherit approvals. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Parse and render CASCOR | Parse exactly to expected.parsedFields, return no errors, render exact LF-terminated expected.renderedMessage. Linked report starts a fresh route; never inherit approvals. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Missing equipment | Reject progression; identify the field with the exact error; keep editable input and last saved state. Marking is a fictional invalid token, not classified content. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Unsupported type | Reject progression; identify the field with the exact error; keep editable input and last saved state. Marking is a fictional invalid token, not classified content. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Invalid category | Reject progression; identify the field with the exact error; keep editable input and last saved state. Marking is a fictional invalid token, not classified content. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Invalid timestamp | Reject progression; identify the field with the exact error; keep editable input and last saved state. Marking is a fictional invalid token, not classified content. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Prohibited marking | Reject progression; identify the field with the exact error; keep editable input and last saved state. Marking is a fictional invalid token, not classified content. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Wrong role | Reject without mutating saved content, holder, approvals or success audit. Append one separate rejected-attempt log entry; never treat it as an approval. No attempt timestamp is prescribed. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Skipped role | Reject without mutating saved content, holder, approvals or success audit. Append one separate rejected-attempt log entry; never treat it as an approval. No attempt timestamp is prescribed. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Duplicate submission | Reject without mutating saved content, holder, approvals or success audit. Append one separate rejected-attempt log entry; never treat it as an approval. No attempt timestamp is prescribed. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Premature release | Reject without mutating saved content, holder, approvals or success audit. Append one separate rejected-attempt log entry; never treat it as an approval. No attempt timestamp is prescribed. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Duplicate release | Reject without mutating saved content, holder, approvals or success audit. Append one separate rejected-attempt log entry; never treat it as an approval. No attempt timestamp is prescribed. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Stale approval | Reject without mutating saved content, holder, approvals or success audit. Append one separate rejected-attempt log entry; never treat it as an approval. No attempt timestamp is prescribed. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Originator return restriction | Reject without mutating saved content, holder, approvals or success audit. Append one separate rejected-attempt log entry; never treat it as an approval. No attempt timestamp is prescribed. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| CO forward restriction | Reject without mutating saved content, holder, approvals or success audit. Append one separate rejected-attempt log entry; never treat it as an approval. No attempt timestamp is prescribed. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Concurrent amendments and explicit resolution | Detect same-field conflict in field order. Preserve both branches; block review/release until originator explicitly resolves. Resolution has both parents and requires all five fresh reviews after resubmission. This case branches before release, not from a frozen released report. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Edit invalidates an earlier approval | Originator content edit resets routing and preserves historical approval as invalid for the new revision. CO release attempt fails. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Reload and restart after EV-001-04 | Restore the last durable state exactly, including comment and revision-bound approvals; do not replay actions or release on startup. Exact literal input.expected is frozen in supplied fixture. | persistence.test.mjs; io-recovery / reload browser checks |
| Reload and restart after EV-001-07 | Restore the last durable state exactly, including comment and revision-bound approvals; do not replay actions or release on startup. Exact literal input.expected is frozen in supplied fixture. | persistence.test.mjs; io-recovery / reload browser checks |
| Reload and restart after EV-001-12 | Restore the last durable state exactly, including comment and revision-bound approvals; do not replay actions or release on startup. Exact literal input.expected is frozen in supplied fixture. | persistence.test.mjs; io-recovery / reload browser checks |
| Failed save and recovery | Retain last durable state and unsaved draft on failure; show error, no partial success/download. Clear fault, explicitly save draft, then export saved draft successfully; draft export is not released output. Exact literal input.expected is frozen in supplied fixture. | persistence.test.mjs; io-recovery / reload browser checks |
| Failed export and recovery | Retain last durable state and unsaved draft on failure; show error, no partial success/download. Clear fault, explicitly save draft, then export saved draft successfully; draft export is not released output. Exact literal input.expected is frozen in supplied fixture. | persistence.test.mjs; io-recovery / reload browser checks |
| Instruction-like narrative stays inert | Preserve literal narrative as text in preview/export; do not execute markup, tools, scripts or embedded instructions. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |
| Released content is immutable | Keep released revision frozen; offer a new linked UPDATE, CORRECT or CASCOR draft, never alter released export. Exact literal input.expected is frozen in supplied fixture. | domain.test.mjs / workflow.test.mjs; corresponding frozen journey |

Additional application checks: parse empty/malformed object, CR/unknown/duplicate/out-of-order keys, missing LF, additional equals in narrative, leap year, repair before occurrence and CASCOR type constraints; whole response equality to public protocol. Workflow initial empty replay, event collisions, unsupported command, bad nested types, actor restrictions, every stage return and comment, stale base, approved-content edit, failure with no successful audit, source markup inertness. DAG replay in opposite orders, concurrent edit/delete and missing history preserve both heads/queue. Linked reports must reject unreleased predecessor and mismatched family; sequential INITIAL→UPDATE→CORRECT→CASCOR release yields closed family with retained original snapshots. Cancellation/expiry/supersession retain history.

Persistence tests restart real service using temporary storage, restore fixture prefixes at events 04/07/12, compare exact comments/approvals/audit and assert no new release. Inject local save/export faults; no partial success or download. Tests call real computation/service, never source-string assertions or toolkit self-tests. Browser task success includes reload and explicit branch choice at both widths. All test dependencies/data are declared runtime files; test modules are copied by host.

# Risks and human review requirements

Synthetic format is not validated against NWP 1-03.1. Judge checks semantic completeness of four named CASREP types, complete route, return loop, full history, actual named message/audit outputs, input transformation and live walkthrough/one-page brief. Actor simulation is not authentication; filesystem persistence is not encryption; local mock release is not a government connection or authorized release. No measured operational speed, readiness or parts-priority benefit. Human-approved classification/identity/retention/release integration is a fielding prerequisite. Owner approval before delivery/deployment is required. No operational action is attempted.

Runtime isolation, all three required capability scores at 1, meaningful Node tests, six frozen browser journeys at both widths, clean initial and recheck visual evidence and semantic review are distinct evidence categories. Toolkit fixture success is never application verification. No evidence is claimed during planning.
