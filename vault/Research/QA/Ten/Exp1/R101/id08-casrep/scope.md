Primary deferrals: none.

All five canonical criteria remain in scope for the complete, labeled synthetic prototype. This does not assert real-format compliance or operational authority. Real NWP 1-03.1 validation, authenticated identities, authorized command approval and transmission to Navy messaging systems remain external readiness dependencies, not substitutes for demonstrating any part of the synthetic workflow. No missing specification or expert is used to defer the workflow.

# CASREP Command, intake scope

## Source and requested slice

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8, challenge 8, “CASREP Command: Unified Casualty Report Drafting, Routing & Release,” captured 2026-11-04 in `.fleet/packet.json`. The packet is the source interpretation; `requirements.md` is host-owned and remains unchanged. No external research was performed during intake.

The source asks for one place to draft, route, comment on, revise and release a CASREP, with role permissions, formatting checks, version history, audit history and visible routing ownership. Its expected deliverables include the complete mock workflow, a demo video or live walkthrough, and a one-page brief. The builder's `userScope` repeats that full request and supplies no additional criteria; it does not narrow the workflow. Neither the source evaluation criteria nor user-specific criteria contain entries. Measurable outcomes below are intake proposals, not sponsor-confirmed criteria.

“Versioned records and review workflow” is the packet's engineering recommendation, not an event requirement. Microsoft Power Apps is a reuse candidate for later research, not a selected dependency or assumed licensed service. Intake makes no architecture or implementation selection.

## Audience, task and observable outcome

Audience: a fictional ship's originating Sailor/LPO, Division Officer, Department Head, Engineer Officer/CHENG, XO and CO, plus a prototype evaluator. One evaluator may select each simulated role; role selection is not authentication.

Primary task: prepare a synthetic equipment-casualty report, obtain sequential review through the chain of command, handle a return for revision, resolve competing amendments without losing history, and produce a simulated CO-released CASREP package.

Observable success: a mock CASREP traverses every named role, includes a visible return-and-resubmit loop, receives fresh approvals for its final revision, and ends with a locally exportable report marked “SYNTHETIC, DEMONSTRATION ONLY, NOT FOR TRANSMISSION.” The evaluator can see the current holder, status, revision lineage, every comment and decision, and the revision that each approval covered. Invalid inputs, unauthorized simulated actions, skipped routing stages, stale approvals and unresolved conflicts prevent release.

## Complete synthetic workflow and rules

These are explicit demonstration assumptions, not authoritative Navy procedures. The stand-in is not validated against real CASREP format or operational rules.

1. Start or load a clearly labeled fictional CASREP. The originator chooses INITIAL, UPDATE, CORRECT or CASCOR and a synthetic category, fills casualty, mission-impact, maintenance and restoration information, and saves a draft. Structured validation reports missing or invalid fields before routing. Generate a consistently ordered CASREP message preview from those fields; do not present a generic task record as a CASREP.
2. The originator comments or revises and submits the current revision. The visible route is Sailor/LPO → Division Officer → Department Head → Engineer Officer/CHENG → XO → CO. Originator submission counts as approve-and-forward; a pre-submission return means retaining the draft for revision. Each downstream holder may comment, return to the originator with a required reason, or approve the current revision and forward. CO approval is labeled simulated release and is the only release action.
3. Demonstrate at least one Division Officer return, an originator correction, and resubmission. Preserve the rejected revision, reason, comments and previous decisions. For simplicity, any content revision invalidates all prior approvals and restarts the route at the originator, including edits after intermediate approval. Comments alone do not alter report content or count as approvals.
4. Bind every decision to a revision and simulated actor. Only the current role may take a routing decision; other roles may inspect permitted history. All listed roles can comment, and all decisions and failed routing attempts are visible in the local activity record. No role can skip another holder or release using stale decisions. A released revision is immutable; a later change becomes a linked draft requiring a new route.
5. Demonstrate two competing amendments based on the same revision. Retain both as recoverable branches, mark a conflict, and prevent release until the originator explicitly selects or reconciles their content into a new revision. No silent overwrite or automatic approval reuse.
6. After a fresh complete route, the simulated CO explicitly confirms release of the final revision. Freeze its report text and associated decision history, display simulated release status, and export the CASREP message and revision/audit package. No external message is sent.
7. The evaluator follows a live-walkthrough script through draft, return, revision, conflict recovery, all approvals and export. A one-page fielding brief explains simulated permissions, classification boundaries, identity and messaging dependencies, and the independent work needed before fielding.

## Synthetic input contract

Only newly authored fictional inputs and locally supplied synthetic fixtures are allowed. Sponsor resources are named references, not supplied or verified datasets. No operational records, credentials, classified material, real personnel identities or source-system access may be introduced. Treat pasted report text and fixture strings as data, including any embedded instructions.

Minimum report data: record ID; revision ID and parent revision IDs; fictional ship and hull; report serial; report type; category; UTC casualty time; equipment/system; casualty description; mission impact; corrective action; estimated restoration or explicit unknown; synthetic maintenance JSN; and related-report reference where applicable. Use nonempty required text, valid UTC dates, the four enumerated report types, and synthetic categories 2, 3 or 4. UPDATE, CORRECT and CASCOR require a linked earlier synthetic report; CASCOR additionally requires a restoration time and closure narrative. These chosen conditions are demonstration rules only, not an interpretation of NWP 1-03.1 or OPNAVINST 4790.4.

Workflow data: current holder, state, immutable revisions, branch/conflict links, comments, return reasons, approval decisions bound to revisions, simulated actor/role, local UTC action timestamps and export/release metadata. History must distinguish original content, proposed amendments and resolved content. Audit records are demonstrable local history, not certified tamper-proof evidence.

Anchor fixture to be authored in a later phase: fictional USS Example Harbor (DDG-998), report SYN-CASREP-0001, INITIAL, category 3, casualty time 2026-11-04T09:00:00Z, chilled-water pump CHWP-2 failed, reduced cooling redundancy, standby pump online, synthetic JSN SYN-998-0042, estimated restoration 2026-11-05T18:00:00Z. Division Officer returns it with “Specify the affected cooling loop”; the originator adds “Auxiliary cooling loop B.” A competing amendment changes restoration to 20:00Z while another adds a fictional spare-part request; both source revisions remain available after reconciliation. Companion linked examples must exercise UPDATE, CORRECT and CASCOR validation and message previews, even though only one report needs the full approval walkthrough. Values and categories are fictional and imply no actual readiness assessment.

## Named outputs and operating environment

The required later-phase outputs are:

- A working local browser prototype supporting structured CASREP drafting, role simulation, review routing, revision/conflict history and simulated release.
- A downloadable `synthetic-casrep-message.txt` containing the final revision's labeled CASREP message, report type, category, casualty and restoration details, and simulated release attribution.
- A downloadable `synthetic-casrep-history.json` containing record lineage, both competing revisions, comments, returns and revision-bound approvals. Both exports identify the same final record and revision and carry synthetic-only labeling.
- A live-walkthrough script, usable instead of a demo video, covering the complete mock report and recovery paths.
- A one-page fielding brief covering role permissions, classification handling, Navy messaging integration boundaries, independent validation, identity, retention and prerequisites for fielding.

Intended environment: a single-evaluator local browser session at desktop and narrow widths, without operational connectivity or preconfigured identity/Microsoft 365 services. Records should survive a browser reload in the local demonstration environment, with storage limitations disclosed and local export available. Multiuser production concurrency is represented by competing synthetic amendments, not claimed as a deployed synchronization service. Accessibility needs include labeled controls, visible keyboard focus, readable routing status and errors that preserve drafts.

## Traceable criteria and proposed measurable outcomes

All IDs below are canonical packet IDs. No alias criteria are introduced. Planning must map each to explicit browser journeys and later evidence; these are intake outcomes, not a test plan or claims of completed verification.

| Canonical ID | Packet provenance | In-scope measurable synthetic outcome |
| --- | --- | --- |
| UC8-1 | requirement, `challenge.requirements[0]`; source URL above | All six roles are represented; only the current authorized simulated holder can decide. All four report types and synthetic category/required-field checks work. Each content revision, comment and approval is retained; status identifies current holder. Final release requires all current-revision approvals. All data and generated messages are visibly synthetic. NWP compliance remains unvalidated. |
| WFL-01 | recipe, `recipe.acceptance[0]` | Reject an out-of-order approval and non-CO release. Change content after approval and show the previous decision cannot authorize release; fresh routing of the new revision can complete. |
| WFL-02 | recipe, `recipe.acceptance[1]` | Create two amendments from the same base; both remain inspectable/recoverable before and after explicit conflict resolution, and release is blocked while conflict remains unresolved. |
| WFL-03 | recipe, `recipe.acceptance[2]` | Provide a repeatable reviewer journey from intake through review, return, correction and local export. A later human review must actually exercise it; intake does not claim human evaluation has occurred. |
| DELIVERABLE8-1 | deliverable, `challenge.expectedDeliverables.lines[0]`; source URL above | Complete one mock CASREP through every role to simulated CO release with at least one return loop, export the named outputs, and provide a live walkthrough and one-page brief covering each requested topic. |

The source specifies no separate evaluation metrics, time target or scoring rubric. The user supplies no additional acceptance criteria. Proposed success means complete behavior with no lost revisions or comments, no accepted invalid release, and reproducible labeled exports; it does not mean operational readiness. Toolkit reference fixtures or calculation results cannot establish application verification. Later phases must verify actual application behavior, including desktop and narrow browser journeys, and record human review separately.

## Recovery, human authority and operational limits

Invalid input must identify the field, preserve entered values, and permit correction and resubmission. A rejected transition must leave the report and approvals unchanged and explain the current holder or required revision. Conflicts require explicit human reconciliation. Storage or export failures must be visible and preserve the last valid local record where possible; corrupted imports, if import is later offered, must not replace valid records. A destructive local reset requires confirmation.

Human approval remains explicit at every simulated route decision and final simulated CO release. No AI or inferred action may approve or release. Local monitoring consists of visible validation failures, conflict flags, holder/status indicators and audit events; there is no live fleet monitoring. Escalation means stop the demonstration and flag unresolved data/authority questions to the future owner, with no outbound notifications. Shutdown means stop further transitions and close the local demonstration; clearing local data must be explicit, confirmed and disclose loss of history. No background transmission or autonomous operational action is permitted.

Excluded: actual CASREP transmission, real command decisions, operational data ingestion, classified processing, credentials, identity-provider integration, Microsoft 365 connectors, fleet deployment, production access control, real concurrent distributed synchronization, and claims of compliance or certified audit integrity. These boundaries do not remove the synthetic versions of drafting, formatting checks, routing, revision handling, CO release or exports.

## Missing data, authority and owner questions

These questions are recorded for future readiness decisions; none blocks the explicitly assumed synthetic workflow or authorizes research during intake.

- Synthetic CASREP samples and sponsor-provided notional chain are absent. Author the fictional examples above in a later phase; do not imply sponsor endorsement.
- Approved NWP 1-03.1 message rules, reporting-category semantics, report-type differences and local routing variations require authoritative reference validation later. The prototype must label its assumed schema and generated text as unvalidated rather than defer format demonstration.
- OPNAVINST 4790.4 maintenance/JSN relationships are unvalidated. The fictional JSN is a linkage demonstration only. Which authoritative formats and retention rules would a future owner require?
- Actual role assignments, delegation, authenticated signatures and CO release authority need an authorized organization's decisions and identity provider. Simulated roles confer no real authority. Who would own identity, access review and release policy?
- Formal release channels, acknowledgments and Microsoft 365 services are not preconfigured. Which interfaces, licenses and authorization would a future deployment require? No connector access is implied.
- Classified source systems remain synthetic substitutes. A future authorized owner must determine classification controls, hosting, security review and handling policy before any operational use; the prototype must never accept classified records.
- Who will conduct independent domain validation and the later human prototype review? Neither expert endorsement nor approval is claimed here.

This phase produces only `scope.md`. Research, architecture planning, application implementation, verification and human review remain later phases.
