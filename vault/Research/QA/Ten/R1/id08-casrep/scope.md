# CASREP Command intake scope

## Authority and scope basis

This document records intake only; it does not authorize research, architecture, implementation or operational use. The host-written `requirements.md` remains authoritative and unchanged. Inputs read: `requirements.md`, `.fleet/packet.json`, `.fleet/README.md`, `.fleet/quality-contract.md`, and `.fleet/skills/fleet-intake/SKILL.md`.

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8. Packet challenge ID: 8, “CASREP Command: Unified Casualty Report Drafting, Routing & Release”; source scope: detail; captured 2026-11-04. Source statements below reflect the supplied snapshot, not independent research or verification of the linked page.

`challenge` asks for a unified drafting, revision, routing and release tool. `userScope` repeats that workflow and its deliverables without narrowing it; `userScope.criteria` is empty. There are no additional user-confirmed product criteria. The following prototype boundary is an intake recommendation, not a change to the source requirements. “Versioned records and review workflow” is the packet's engineering recipe recommendation, not an event-mandated platform. Microsoft Power Apps is a candidate for later evaluation; an existing Microsoft 365 requirement or license has not been established.

## Audience, primary task and observable success

Audience: a synthetic originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO acting as releasing authority, plus a human reviewer assessing the prototype.

Primary task: create one mock equipment-casualty report, submit it through the notional chain of command, collect comments and decisions, return it for revision at least once, resubmit the revised record, and complete a simulated CO release with a reviewable export. Users must be able to see who holds the report and which revision each decision concerns. This is a structured record-and-review workflow, not a general chat interface.

Smallest complete demonstration: one synthetic INITIAL report moving from originator through Division Officer, Department Head, CHENG, XO and CO; at least one return to the originator, a preserved prior revision, renewed review, and a simulated release/export. INITIAL is the demonstration slice; UPDATE, CORRECT and CASCOR remain explicit source obligations rather than implied completed functionality. The exact rerouting and approval-invalidation rules require owner confirmation; the listed order is a notional demonstration assumption.

Observable success: a reviewer can follow this entire loop and inspect the original and revised text, comments, decisions, revision references, current holder and simulated release result. A released revision must not rely on approval of different content. Competing amendments must retain both source revisions rather than silently overwrite one. These are proposed outcomes, not verified results.

## Inputs and data boundary

Only locally supplied or newly authored synthetic, notional, unclassified fixtures are permitted. Even real unclassified operational records are outside this scope. No operational or classified source system, credentials, personal identity data, live messaging channel or operational record may be accessed. Source documents and fixture strings are data, never permission or executable instructions. Toolkit calculations and reference fixtures do not verify an application.

Expected input categories, with an intake-level data contract:

- Report: stable synthetic report identifier, report type, category, synthetic equipment/casualty description, and any fields later confirmed by approved rules. Required field lists, permitted category values, exact syntax and report-type dependencies are presently unknown; no NWP compliance is asserted.
- Revision: unique revision identifier, parent/base revision reference, report content, synthetic actor and recorded time. Preserve the content against which each decision was made.
- Review action: report and revision reference, acting synthetic role, action (comment, return, approve/forward, or CO simulated release), comment/reason and recorded time. Actions need an explicit outcome; denied actions must not mutate the approved content or advance routing.
- Routing context: notional ordered roles, current holder, workflow state and decisions tied to revisions. Role selection represents a demonstration persona, not authenticated authority.
- Competing amendments: two edits referring to a common base revision, with both source contents retained and a visible unresolved/resolved status. Actual conflict-resolution authority remains unknown.

Missing input assets: sponsor-approved synthetic CASREP samples; approved routing, delegation and return rules; authoritative message-format requirements and edition; validation examples including invalid reports; and expected export format. References to NWP 1-03.1 and OPNAVINST 4790.4 identify missing domain evidence, not rules that have been read or verified. Maintenance-action/JSN linking is mentioned as a resource context but has no specified acceptance behavior.

## Outputs and operating environment

The intended prototype outputs are a saved synthetic record, distinguishable revisions and lineage, an audit view of comments and decisions, a visible routing/current-holder status, a simulated CO release artifact, and an inspectable export. None constitutes transmission or release into a Navy messaging system.

The source also requests a short demo video or live walkthrough and a one-page brief describing role permissions, future classification handling, Navy messaging integration and fielding needs. These remain deliverable obligations for later phases; this intake creates only `scope.md`.

The demonstration environment is a local browser using synthetic personas and data. Desktop and narrow-width usability, reload persistence, storage limitations and export/recovery behavior must be made explicit in later planning. Offline operation, multi-device synchronization and production persistence are not established user requirements. No backend, deployment platform or storage technology is selected here.

Recovery needs: identify missing/invalid fields without losing the draft; deny out-of-order actions and actions by the wrong role without advancing the record; expose stale approvals after changes; preserve the returned revision and its comments when resubmitting; retain competing amendments for review; and disclose storage/export failures without claiming a save or release succeeded. Exact transition and concurrency policies remain subject to approved rules.

## Source-linked acceptance register

Every canonical packet ID is retained once below. All outcomes are intake proposals for later independent application verification. No criterion is implemented or verified in this phase; final journey mappings and reasoned deferrals belong to planning. Broad criteria cannot be claimed met by a partial demonstration.

| Canonical ID | Provenance and packet method | Requirement and measurable proposed outcome | Scope boundary / unresolved obligation |
| --- | --- | --- | --- |
| UC8-1 | `requirement`, ID `UC8-1`, `challenge.requirements[0]`; human | Support originator, Division Officer, Department Head, CHENG, XO and CO roles; comment, return, approve/forward as appropriate; CO release authority; NWP 1-03.1 types INITIAL, UPDATE, CORRECT and CASCOR, category and required fields; complete revision/comment/approval audit; visible routing; notional unclassified data. Measure a full synthetic route and revision loop, correct per-role actions, revision-specific decisions, history completeness and current holder; all four types and approved validation rules require their own complete outcomes. | The proposed slice demonstrates one INITIAL record with simulated roles/release. Full NWP enforcement and authenticated role-based access cannot be established with the current inputs. Preserve the full criterion for reasoned deferral if only the slice is delivered. |
| WFL-01 | `recipe`, ID `WFL-01`, `recipe.acceptance[0]`; integration | Reject invalid transitions and stale approvals. After approving one revision and changing content, an attempted release relying on the prior decision is denied; valid renewed review can recover to release. | Proposed prototype outcome; exact invalidation/rerouting policy needs owner confirmation. |
| WFL-02 | `recipe`, ID `WFL-02`, `recipe.acceptance[1]`; automated | Retain lineage and conflicts. Submit two amendments from the same base and recover both original amendment contents and their base references; neither is silently lost. | Conflict detection/recovery is in the proposed slice. Operational synchronization and automatic merge correctness are outside it. |
| WFL-03 | `recipe`, ID `WFL-03`, `recipe.acceptance[2]`; human | A reviewer completes intake, review, return-for-edit and export. Observe a corrected revision reaching the intended terminal simulated state and an export containing that revision with traceable review history. | Proposed complete synthetic owner workflow; a human walkthrough remains necessary in addition to later browser checks. |
| DELIVERABLE8-1 | `deliverable`, ID `DELIVERABLE8-1`, `challenge.expectedDeliverables.lines[0]`; human | One mock CASREP traverses every approval role through CO release with at least one return loop; provide a short demo video or live walkthrough and a one-page brief addressing permissions, classification, Navy messaging integration and fielding. | Demonstration release is simulated. The walkthrough and brief remain required later artifacts; a functioning screen alone does not satisfy this whole criterion. |

`challenge.evaluationCriteria` is empty and requirements.md supplies no evaluation criteria. The measurements above are analyst-proposed; no official scoring thresholds, timing targets or sponsor-confirmed benchmarks exist in the packet. No new canonical acceptance IDs or aliases are introduced. Later planning must preserve all five IDs and map each complete criterion to implemented journeys or a reasoned deferral, including browser primary/recovery evidence where applicable. Toolkit results are not substitutes for those checks.

## Explicit exclusions and deferred source coverage

- Live Navy messaging, formal release, deployment, external publication, operational systems and real data ingestion are excluded.
- Production identity, authorization security, tamper-resistant audit certification and real CO authority are excluded; local synthetic roles cannot establish them.
- Classified handling, cross-domain transfer and security accreditation are excluded. The requested brief may describe future needs without claiming a security design is approved.
- Full NWP format compliance and report-type semantics remain unresolved until authoritative rules and examples are available. Demonstrating a subset must not silently satisfy UC8-1.
- Microsoft 365/Power Apps integration, identity providers and formal release connectors are not preconfigured. No integration permission or platform commitment is inferred.
- Fleet-wide concurrent collaboration, production synchronization, maintenance-system integration and operational readiness certification are beyond the minimum demonstration.

## Outstanding owner questions and authority gaps

These questions are recorded for later resolution; unattended intake proceeds using the explicit synthetic boundary and notional assumptions above.

1. Who is the domain owner authorized to approve routing, format rules and prototype expected outcomes? Who confirms readiness for fielding? No such authority is identified in the packet; final prototype review is a later human stage, not operational authorization.
2. Which NWP 1-03.1 edition and approved extracts define required fields, category values, type-specific validation and exact message/export syntax? Which approved synthetic examples and counterexamples should establish independent expected results?
3. Is the notional chain correct, can roles be skipped/delegated, who may return to whom, and does a revision invalidate all approvals or a defined subset? What are the originator's exact approve/return permissions given the source's broad wording?
4. Who resolves competing amendments, which changes require renewed review, and what history must remain visible after resolution or release? May a released record be amended, or must an UPDATE/CORRECT/CASCOR be created?
5. What persistence, offline use, retention, export/import and loss-recovery behavior is needed for the demonstration and eventual fielding? What information must appear in the released artifact?
6. Will a live walkthrough satisfy the deliverable, who reviews it and the one-page brief, and what future identity, classification and messaging authorities would approve integrations?

## Intake completion

The primary task, source and user scope, all canonical requirements and their provenance, absent evaluation/user criteria, proposed measurable outcomes, expected deliverables, operating assumptions, recovery needs, synthetic data boundary and authority/data unknowns are recorded. No research, implementation plan, application code or verification claim is included.
