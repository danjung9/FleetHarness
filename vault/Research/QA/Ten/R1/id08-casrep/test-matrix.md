# Acceptance and test matrix

Planning baseline, 2026-11-04. Every result below is NOT RUN / unverified. Host-owned test-report.json and browser screenshots/traces will hold later evidence; Node results and verification.md supplement that evidence. No application exists in this phase. Tests must call the actual inline application core. Frozen outcomes are independent of later implementation output, not SME certification.

Source: packet schemaVersion 1, challenge 8, captured 2026-11-04; URL https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8. Publication/revision times beyond the packet capture are unknown. Exact source strings and JSON paths follow; paths identify excerpts without inventing source offsets. No evaluation criteria or additional user criteria were supplied.

## UC8-1

Original requirement (exact supplied packet excerpt):

> The tool must support role-based access for the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO as releasing authority, with each role able to comment, return for revision, or approve and forward. Drafts must enforce NWP 1-03.1 CASREP formatting (report types such as INITIAL, UPDATE, CORRECT, and CASCOR, plus category and required fields), keep a full version history and audit trail of every comment and approval, and show at a glance where each report is in the routing chain. The prototype must use notional, unclassified data only.

Provenance: [{"kind": "requirement", "id": "UC8-1", "path": "challenge.requirements[0]"}]. Packet method: human.

Input/scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

Independent expected outcome: All six source roles enforce approved comment, return, approval and release permissions; INITIAL, UPDATE, CORRECT and CASCOR reports enforce the applicable approved NWP 1-03.1 category, required-field and message-format rules; every revision, comment and approval remains auditable with current routing visible, using notional unclassified data only.

Disposition: deferred. Browser journeys: none, full criterion deferred.

Result: NOT RUN; deferred/unverified.

Evidence location: future host test-report.json criterion entry, journey screenshots/traces where implemented; verification.md and actual-core Node test output. No current pass evidence.

Deferral reason: Only a synthetic INITIAL workflow is planned. Approved NWP edition, required fields/categories, all report-type semantics and routing rules are missing; local persona selection is not authenticated access control. No compliance claim. The demonstrated subset is checked under WFL-01/02/03; full source coverage remains unverified.

## WFL-01

Original requirement (exact supplied packet excerpt):

> Reject invalid state transitions and stale approvals.

Provenance: [{"kind": "recipe", "id": "WFL-01", "path": "recipe.acceptance[0]"}]. Packet method: integration.

Input/scenario: Revise a record after approval and verify it cannot be released with the previous decision.

Independent expected outcome: An early or out-of-order release is denied without advancing state. Changing an approved revision removes every current approval, restarts review, and prevents release using the old decision. The corrected revision can complete fresh review and simulated CO release. Unsaved edits cannot be submitted or approved without deliberate save or discard.

Disposition: implemented. Browser journeys: stale-approval, recover-draft.

Result: NOT RUN; planned implementation, browser and Node checks pending; human acceptance separate.

Evidence location: future host test-report.json criterion entry, journey screenshots/traces where implemented; verification.md and actual-core Node test output. No current pass evidence.

## WFL-02

Original requirement (exact supplied packet excerpt):

> Retain record lineage and conflicts.

Provenance: [{"kind": "recipe", "id": "WFL-02", "path": "recipe.acceptance[1]"}]. Packet method: automated.

Input/scenario: Submit competing amendments and verify both source revisions are recoverable.

Independent expected outcome: Two amendments from revision 1 remain separately readable across reload, with their common base visible. Explicit resolution stores the chosen combined text with both amendment heads as parents; both source contents survive reload and no prior approval carries into revision 4.

Disposition: implemented. Browser journeys: resolve-amendments.

Result: NOT RUN; planned implementation, browser and Node checks pending; human acceptance separate.

Evidence location: future host test-report.json criterion entry, journey screenshots/traces where implemented; verification.md and actual-core Node test output. No current pass evidence.

## WFL-03

Original requirement (exact supplied packet excerpt):

> Complete the owner-specific workflow.

Provenance: [{"kind": "recipe", "id": "WFL-03", "path": "recipe.acceptance[2]"}]. Packet method: human.

Input/scenario: Have a reviewer perform the full intake, review, return-for-edit and export journey.

Independent expected outcome: A reviewer can create an INITIAL synthetic report, return revision 1 with a retained reason, save revision 2, complete Division Officer, Department Head, CHENG, XO and CO review, reload the simulated released state and download the corrected content with traceable revision and review history. Human workflow acceptance remains separately pending.

Disposition: implemented. Browser journeys: review-return-release, recover-draft.

Result: NOT RUN; planned implementation, browser and Node checks pending; human acceptance separate.

Evidence location: future host test-report.json criterion entry, journey screenshots/traces where implemented; verification.md and actual-core Node test output. No current pass evidence.

## DELIVERABLE8-1

Original requirement (exact supplied packet excerpt):

> A working prototype that walks one mock CASREP from initial draft through every approval role to CO release, including at least one "returned for revision" loop. Teams should also submit a short demo video or live walkthrough and a one-page brief covering the role/permission model, how the tool would handle classification and integration with existing Navy messaging systems, and what it would take to field it.

Provenance: [{"kind": "deliverable", "id": "DELIVERABLE8-1", "path": "challenge.expectedDeliverables.lines[0]"}]. Packet method: human.

Input/scenario: Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

Independent expected outcome: One mock CASREP completes every approval role through CO release including a return-for-revision loop, accompanied by a short demo video or delivered live walkthrough and a one-page brief explaining permissions, classification handling, Navy messaging integration and fielding prerequisites.

Disposition: deferred. Browser journeys: none, full criterion deferred.

Result: NOT RUN; deferred/unverified.

Evidence location: future host test-report.json criterion entry, journey screenshots/traces where implemented; verification.md and actual-core Node test output. No current pass evidence.

Deferral reason: The build will supply a synthetic all-role simulated-release workflow, walkthrough script and one-page fielding brief, but no human-delivered walkthrough/video, acceptance of that brief or authorized formal CO release is available in this unattended local phase. The entire source deliverable remains unverified rather than equating a script/download with its completion.

## Application test inputs and boundaries

| Planned actual-core Node case | Input | Literal expected outcome / invariant | Browser pair | Result |
| --- | --- | --- | --- | --- |
| invalid transition and wrong role | CO release on draft; Department Head approves while Division holds | Denied; holder, revision and current approvals unchanged | stale-approval | NOT RUN |
| stale approval | Division approves revision 1, Originator saves changed casualty | revision 2 Draft, zero current approvals; historic revision-1 decision retained; CO release denied until renewed complete chain | stale-approval | NOT RUN |
| unsaved boundary | saved casualty plus changed buffer, attempt submit/approve/return/release | all denied without data loss; Discard restores exact committed content; Save creates a new revision and resets approvals | recover-draft | NOT RUN |
| complete route/export | Pump unavailable, return Clarify repair status, corrected Pump unavailable; replacement requested | export contains both revision texts, return reason, five reviewer decisions and synthetic notice; released revision 2 immutable | review-return-release | NOT RUN |
| required fields and boundaries | empty/whitespace equipment or casualty; lengths 200/201 and 2000/2001 | empty or over-limit rejected; exact limits accepted, draft preserved | recover-draft plus Node | NOT RUN |
| full return enforcement | blank reason, valid reason by current reviewer | blank denied; valid returns to Originator with retained reason; resubmit starts Division | review-return-release | NOT RUN |
| graph conflict and resolution | common base plus two amendment heads | two source values retained; resolution parents equal both head IDs; one resulting head; no inherited approvals | resolve-amendments | NOT RUN |
| replay and order | merge A then B, B then A, repeated identical revisions | same revision set and heads; no duplicates; timestamps never select a winner | resolve-amendments plus Node | NOT RUN |
| graph invalidity | missing parent, cross-record parent, cycle, duplicate ID with changed content | descriptive rejection; original graph and pending input unchanged | Node; browser resolution covers valid recovery | NOT RUN |
| edit versus delete | same-base edit and null tombstone | unresolved two-head conflict; no silent deletion; explicit new resolution references both | Node; no operational cancellation claim | NOT RUN |
| local save atomicity | injected quota/security write error | no Saved confirmation or transition committed; draft retained | Node; reload journey proves normal persistence | NOT RUN |
| damaged storage and concurrency | malformed/unknown schema; stale generation | existing bytes not overwritten; clear recovery error; stale local draft retained | Node | NOT RUN |
| lifecycle boundaries | edit released snapshot, link new draft to release, invalid self-supersession | released mutation denied; new linked draft has no approvals; self-link rejected; technical deletion is not official cancellation | Node | NOT RUN |
| UI/core consistency | extract actual marked inline core with vm; drive same action sequence used by handlers | pure functions yield exact revision counts, denial strings and snapshot content; browser handler outcomes satisfy frozen journeys | all journeys | NOT RUN |
| synthetic markup | casualty contains angle brackets and script-like text | literal text round-trips without executing markup; exported content preserved | Node; human review of rendering pending | NOT RUN |

No upload byte offsets, acknowledgements or reconnect transport are implemented: transfer planning was rejected for this local slice. Real synchronization, encryption and authenticated roles remain unverified operational work, not skipped tests claimed as passes. The competing-edit panel is explicitly simulated and does not establish multi-device operation.

## Risks and review gates

UC8-1 and DELIVERABLE8-1 remain deferred even if every prototype journey passes. Full NWP rules, four report-type semantics, approved role routing, official release channels, identity, classification design, operational retention and human deliverable review are missing. A human must review the proposed notional all-approval-reset policy and the clarity of conflict review. Browser assertions establish specified interactions only, not full usability/accessibility. Node tests cannot substitute for missing browser runtime.

Host freezes acceptance-plan.json and ux-spec.json before build. Build/repair must not weaken or edit them. Record suspected requirement errors for new planning. Host owns hashes/test-report.json/screenshots/traces; verifier owns verification.md and one bounded implementation repair. Report generated, runnable, tested, reviewer-accepted and operationally validated separately. Current state: planning generated only.

## Build-phase evidence update · 2026-11-04

The planning baseline above is retained. Application source now exists. `node --test core.test.cjs` passed 10 actual-core tests with no failures/skips; see build-checks.md for case mapping. WFL-01 has Node transition, unsaved-boundary and stale-approval evidence; WFL-02 has Node lineage, replay, invalid graph and durable resolution evidence; WFL-03 has Node full return/revise/review/export evidence. Their frozen browser journeys and human acceptance are still pending, so no complete criterion pass is claimed. UC8-1 and DELIVERABLE8-1 remain deferred/unverified. Bounds, storage/concurrency, lifecycle immutability and markup round-trip were tested in Node. UI escaping uses native textContent/value but browser execution is unverified. Host-owned test-report.json and screenshots/traces remain the required browser evidence locations.

## Verification-phase evidence update · 2026-11-04

This update supersedes the baseline NOT RUN statements for Node checks only. `node --test core.test.cjs` on Node v26.0.0 passed **15 tests, 0 failures, 0 skips, 0 todos**. See verification.md for every test's input, expected outcome, application source location, result and criterion mapping. Five added tests exercise all dirty review-action boundaries, all route roles, additional field/type/conflict boundaries and the delivered inline handlers with a minimal Node document/storage adapter. The adapter is not a browser.

WFL-01 has passing Node evidence from tests 2, 3 and 10 to 15; WFL-02 from tests 5 to 9 and 13; WFL-03 from tests 1, 2, 8 and 10 to 15. Their planned browser journeys remain unverified at both viewport sizes; no complete criterion pass is claimed. UC8-1 and DELIVERABLE8-1 remain deferred/unverified for their original reasons. All planned negative/boundary core cases have local passing evidence, not browser or operational certification. Real markup rendering and UI/core consistency in a rendered browser still require host execution.

No host test-report.json, screenshots or traces were available or authored. The verifier did not edit frozen plans, application implementation or system-design.json. No implementation repair was needed for executed checks. Browser completion gate is unmet; requirementsMet is false. Human acceptance and operational validation remain pending.
