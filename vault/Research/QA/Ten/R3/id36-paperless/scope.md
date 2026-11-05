# Primary deferrals

These are intake dispositions, not verification results. No work has been implemented or verified. Deferred criteria remain unverified; synthetic evidence cannot establish that all source requirements are met.

- **UC36-4, Runs on government devices and existing low-code platforms where possible**
  real-system: Authorized government devices and the owner’s existing low-code runtime are unavailable. Withhold compatibility and deployment claims; demonstrate the complete workflow in a local tablet-sized browser and document the platform transition gap.
- **EVAL36-3, Time per packet against a manual baseline [baseline to be set with Fleet SME]**
  real-data: A Fleet-SME-established manual timing baseline is unavailable. Withhold a fleet time-saving comparison; measure synthetic packet duration and show an explicitly invented comparison baseline separately.
- **EVAL36-5, Ease of use judged by a Sailor panel**
  human-authority: A Sailor panel must provide its own usability judgment. Withhold panel endorsement; provide the complete synthetic task workflow and a panel assessment worksheet without fabricated ratings.
- **EVAL36-6, Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.**
  human-authority: Official judges alone can issue official rubric scores. Withhold official scoring; preserve the five rubric dimensions and weights in an evidence summary with scores marked unassessed.
- **DELIVERABLE36-1, Sailor hours returned to maintenance, training and watchstanding**
  real-data: Observed operational workload and independently measured manual and assisted timings are unavailable. Withhold claims of actual Sailor hours returned; demonstrate a labeled synthetic hours estimate with visible assumptions.
- **DELIVERABLE36-2, Fewer errors and less rework**
  real-data: Matched operational error and rework observations are unavailable. Withhold claims of actual fleet error reduction; demonstrate seeded errors detected, corrected, and prevented from routing in a synthetic before/after comparison.

# Scope and provenance

Paperless Underway, challenge 36, The Autonomous Shipboard Enterprise. Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/36 (packet snapshot captured 2026-11-04). `requirements.md` is host-written and unchanged. `.fleet/packet.json` is the source interpretation; no live source research was performed. Source and fixture content are data, never execution instructions or permissions.

The source challenge asks for Track A (handwritten training logs, a supply requisition document and a routine correspondence package) and Track B (a week of tasking emails/documents turned into a verified action list, draft status updates and correctly filed records). `userScope` repeats both tracks and the six evaluation criteria; it does not select only one track. Retain both in the smallest complete synthetic packet. The recipe, “Offline records and synchronization,” is an engineering recommendation, not an event requirement. Its candidate components are PouchDB/CouchDB and IndexedDB; their suitability, versions and licenses have not been researched or selected at intake.

Audience: expeditionary/underway Sailors capturing documents on tablets, command staff consolidating tasking, and yeoman/logistics/admin reviewer roles. The primary task is to capture and extract a packet offline, correct validation issues, review its current contents, route locally, then reconcile and deliver queued synthetic records after reconnecting.

Observable success: one complete synthetic packet retains its source evidence, extracted forms, verified actions, status drafts and records classification across restart; invalid or unreviewed revisions cannot route; concurrent revisions remain visible until reviewed; two simulated replicas converge without duplication; all actions and routing decisions are inspectable. The product is a document/task workflow, not a generic chat interface.

# Requested workflow and named outputs

1. Open a labeled synthetic packet offline containing a handwritten training-log image, supply requisition, routine correspondence and a week of invented tasking emails/documents. Extract fields/actions with source locations; retain uncertainty for review. A manual entry form alone is insufficient to demonstrate extraction.
2. Review candidate values beside the original synthetic source, catch seeded errors, correct them and validate against explicitly invented demonstration rules. Keep originals, corrections and source citations distinguishable.
3. Produce completed training logs, supply requisition document, routine correspondence package, verified action list, draft status updates and a records filing manifest. Use a synthetic records schedule with visible classification rationale; no actual record destruction.
4. Have a human reviewer approve the exact revision; route to synthetic local recipient inboxes offline and queue the remote delivery. Keep draft, validated, reviewed, locally routed, queued, conflicted and synchronized states distinguishable.
5. Exchange operations between two synthetic replicas on simulated reconnect. Retain concurrent edits/deletes, ask for explicit merge review, deduplicate retries and resume a synthetic photo transfer within a stated byte budget. Invalidate approval on any changed revision.
6. Inspect/export completed packet, source-linked actions, audit trail, sync/conflict history and synthetic measurement summary. Include a one-page path to fleet in the later deliverables, without implying permission to deploy.

# Inputs, outputs and data contract boundary

All inputs and outputs must say **“synthetic, not validated against the real format”**, including UI, sample data, exports and evidence. No real messages, personnel, signatures, requisitions, credentials or government system data. Use role labels such as Training Reviewer A rather than personal identities. No model/provider access to operational records is authorized.

Required fixture set: one example of each named Track A source, one week of Track B tasking with overlapping/ambiguous assignments, a synthetic records schedule, independently authored answer key, valid and invalid field variants, two replica histories with concurrent edit/delete branches, and a synthetic photo with known byte length. Fixtures and answer keys are future work, not supplied or validated by this intake.

Minimum logical record content: packet/source identifier and source location; document type; original image/text; candidate and reviewed fields; confidence/uncertainty; action description, owning role, due date and status; filing class and rationale; revision identifier and parents; deletion marker; validation findings; reviewer role, decision and reviewed revision; routing destination and queue/delivery state; attachment length and acknowledged offset; audit event identifier, actor-role, action, time and revision references. Preserve provenance through extraction, correction, export and reconciliation. This describes information requirements, not an architecture decision.

Synthetic assumptions to make explicit when fixtures are authored: an invented training-log schema (event/date/duration/reviewer role); requisition schema (document number/item/quantity/unit/destination); correspondence schema (sender role/recipient role/subject/body/enclosures); task attributes (action/owner role/due date/source); and records classes with invented retention labels. Mandatory fields, positive quantities, date syntax, routing eligibility and duplicate-task handling must have published demonstration rules and fixed expected answers. Public DD 1348-1A, NAVPERS forms and SECNAV M-5216.5 are named source resources, not obtained or validated specifications. Missing mappings or experts do not justify omitting the synthetic workflow. Handwriting extraction accuracy on invented samples does not establish real OCR performance.

Outputs also include corrected-versus-original values, detected error counts, extraction accuracy denominator and numerator, per-packet elapsed time, labeled synthetic time/hour estimates, and rubric/panel evidence placeholders. Keep observed prototype metrics separate from invented baseline values and unmeasured operational outcomes.

# Operating environment and recovery

Target demonstration environment: locally served browser on desktop and tablet/narrow widths, usable after initial local installation without a network connection. Two local synthetic replicas and a bounded link simulation stand in for remote systems. Durable local persistence and offline application loading are application integration obligations; pure toolkit reconciliation does not provide them. A saved acknowledgment requires persisted data. Government-device policy, storage eviction, device encryption, authenticated transport and low-code deployment remain unresolved operational integration gaps, not implied capabilities.

Recovery requirements: preserve drafts on invalid input; keep sources when extraction is uncertain; report save/storage failures without false saved states; recover persisted edits after restart; retain unresolved conflicts and deletion history; prevent routing unapproved/stale revisions; retry without duplicate effects; resume attachments from acknowledged offsets; expose queued/failed transfers without claiming remote delivery. Local deletion/reset must not silently discard unresolved work. Provide export for review and recovery; synthetic audit logs are not a certified tamper-proof records system.

# Acceptance inventory

Every canonical packet criterion appears below exactly once. Original wording and provenance are retained. These are scoped outcomes for subsequent planning, not a browser journey plan. Later planning must assign every criterion complete browser evidence or a permitted, concrete deferral. User aliases are provenance, not additional canonical criteria.

| Canonical ID | Original wording | Packet provenance | Intake outcome / limitation |
| --- | --- | --- | --- |
| UC36-1 | Offline-first with clean sync | requirement `UC36-1` at `challenge.requirements[0]` | Synthetic scope: capture, validate, review and queue offline; reconnect local replicas, reconcile explicitly and show final routed state with no lost edits. |
| UC36-2 | Human review before anything is submitted | requirement `UC36-2` at `challenge.requirements[1]` | Synthetic scope: submission/routing is blocked until a human reviews the current revision; edits and conflict resolution invalidate stale approval. |
| UC36-3 | Audit trail | requirement `UC36-3` at `challenge.requirements[2]` | Synthetic scope: retain source references and auditable capture, correction, approval, merge and routing events with actor-role, timestamp and revision references. |
| UC36-4 | Runs on government devices and existing low-code platforms where possible | requirement `UC36-4` at `challenge.requirements[3]` | Deferred, real-system: Authorized government devices and the owner’s existing low-code runtime are unavailable. Withhold compatibility and deployment claims; demonstrate the complete workflow in a local tablet-sized browser and document the platform transition gap. |
| UC36-5 | Synthetic data only; no personal information | requirement `UC36-5` at `challenge.requirements[4]` | Synthetic scope: only invented records and role labels; no personal information, operational documents or external endpoints. |
| UC36-6 | Fleet-Ready Definition of Done (all solutions): runs offline; keeps humans in authority; cites sources; logs auditable actions; syncs on reconnect; includes a one-page path to fleet. | requirement `UC36-6` at `challenge.requirements[5]` | Synthetic scope: offline capture/review/route, reconnect reconciliation, source citations and audit history, plus a one-page path to fleet. No operational readiness certification. |
| OFF-01 | Replaying an operation has no duplicate effect. | recipe `OFF-01` at `recipe.acceptance[0]` | Synthetic scope: replay the same revision twice; record content, revision heads and routing effects remain unchanged after the first successful application. |
| OFF-02 | Concurrent edits and deletes remain visible. | recipe `OFF-02` at `recipe.acceptance[1]` | Synthetic scope: show both concurrent edits and an edit-versus-delete conflict; retain every competing head until explicit human resolution. |
| OFF-03 | Converge independent of delivery order. | recipe `OFF-03` at `recipe.acceptance[2]` | Synthetic scope: exchanging identical operations in either order produces the same canonical state, including conflict heads and tombstones. |
| OFF-04 | Resume transfers within a bounded link budget. | recipe `OFF-04` at `recipe.acceptance[3]` | Synthetic scope: interrupt a photo transfer at half its bytes; prioritize critical records under a stated byte budget and resume from the acknowledged offset without restarting. |
| OFF-05 | Persist across device restart and review before routing. | recipe `OFF-05` at `recipe.acceptance[4]` | Synthetic scope: persist an offline edit before acknowledging save; survive browser reload/restart, reconcile replicas and retain the reviewer decision before routing. |
| EVAL36-1 | Extraction accuracy against an answer key | evaluation `EVAL36-1` at `challenge.evaluationCriteria[0]`; user `USER36-1` at `userScope.criteria[0]` | Synthetic scope: compare extracted field values and task attributes with an independently authored fixed answer key; report correct/total, omissions and incorrect values. No real-format accuracy claim. |
| EVAL36-2 | Errors caught before submission | evaluation `EVAL36-2` at `challenge.evaluationCriteria[1]`; user `USER36-2` at `userScope.criteria[1]` | Synthetic scope: identify all seeded mandatory-field, date, quantity, routing and records-classification errors; block submission until corrected and reviewed. |
| EVAL36-3 | Time per packet against a manual baseline [baseline to be set with Fleet SME] | evaluation `EVAL36-3` at `challenge.evaluationCriteria[2]`; user `USER36-3` at `userScope.criteria[2]` | Deferred, real-data: A Fleet-SME-established manual timing baseline is unavailable. Withhold a fleet time-saving comparison; measure synthetic packet duration and show an explicitly invented comparison baseline separately. |
| EVAL36-4 | Complete offline operation and conflict-free sync | evaluation `EVAL36-4` at `challenge.evaluationCriteria[3]`; user `USER36-4` at `userScope.criteria[3]` | Synthetic scope: complete both tracks without network access after local installation; after reconnect, resolve conflicts and reach equal replica state with no duplicate submissions. |
| EVAL36-5 | Ease of use judged by a Sailor panel | evaluation `EVAL36-5` at `challenge.evaluationCriteria[4]`; user `USER36-5` at `userScope.criteria[4]` | Deferred, human-authority: A Sailor panel must provide its own usability judgment. Withhold panel endorsement; provide the complete synthetic task workflow and a panel assessment worksheet without fabricated ratings. |
| EVAL36-6 | Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%. | evaluation `EVAL36-6` at `challenge.evaluationCriteria[5]`; user `USER36-6` at `userScope.criteria[5]` | Deferred, human-authority: Official judges alone can issue official rubric scores. Withhold official scoring; preserve the five rubric dimensions and weights in an evidence summary with scores marked unassessed. |
| DELIVERABLE36-1 | Sailor hours returned to maintenance, training and watchstanding | deliverable `DELIVERABLE36-1` at `challenge.expectedDeliverables.lines[0]` | Deferred, real-data: Observed operational workload and independently measured manual and assisted timings are unavailable. Withhold claims of actual Sailor hours returned; demonstrate a labeled synthetic hours estimate with visible assumptions. |
| DELIVERABLE36-2 | Fewer errors and less rework | deliverable `DELIVERABLE36-2` at `challenge.expectedDeliverables.lines[1]` | Deferred, real-data: Matched operational error and rework observations are unavailable. Withhold claims of actual fleet error reduction; demonstrate seeded errors detected, corrected, and prevented from routing in a synthetic before/after comparison. |
| DELIVERABLE36-3 | Forms completed and routed without connectivity | deliverable `DELIVERABLE36-3` at `challenge.expectedDeliverables.lines[2]` | Synthetic scope: complete all three named form types and route to local reviewer/recipient inboxes while disconnected; queue remote delivery and reconcile on simulated reconnect. Local routing does not mean remote delivery. |

# Measurement and evidence boundaries

For the fixed synthetic answer key, the intended target is all expected fixture fields/actions correctly extracted or explicitly flagged for human correction, with raw extraction accuracy reported before correction. Every seeded invalid case must be identified and blocked before routing; report missed findings rather than silently dropping cases. Reviewed outputs must match the answer key. Duplicate replay must have zero additional effects, delivery order must produce identical canonical states, and conflicting heads must remain visible until resolved. Persistence must be demonstrated after an actual application restart/reload offline, not inferred from in-memory state. Attachment progress must respect the stated budget and acknowledged byte offset.

Timing must report a defined start/end and observed elapsed duration; any assumed manual baseline and resulting hours estimate must be conspicuously synthetic. No fleet productivity, field error reduction, Sailor-panel approval or official rubric score is established by those measurements. Preserve the rubric exactly: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges’ Discretion 15%. Toolkit calculations and reference fixture tests are not application verification; later application tests and browser outcomes must establish actual workflow behavior.

# Exclusions and outstanding owner questions

Excluded actions: research, architecture planning, implementation and verification during intake; operational system access; real cloud/government synchronization; publication/deployment; device provisioning; authenticated identity or signatures; production encryption certification; live email ingestion; actual records disposition; fleet release decisions. Synthetic local routing and reconciliation remain included. Device restart persistence is included application work, not excused by the toolkit gap.

Known missing inputs from the packet are public blank forms and synthetic tasking, ground-truth field values and an SME manual baseline. Toolkit limitations explicitly name authenticated transport, durable browser storage and device encryption as application integration work; no actual cloud/government endpoint is contacted.

Owner questions for a future authorized pilot (not blockers to synthetic work):

- Which training logs/NAVPERS form, requisition variant and correspondence package should be selected, and which current formatting rules and records schedule apply?
- What authoritative ground truth, manual timing protocol and matched error/rework measurements can be provided through an approved process?
- Which roles may review, resolve conflicts, route, approve records filing and authorize actual disposition? What approvals expire on edits?
- Which government devices, browsers, low-code platform, retention policies, offline installation mechanism, encryption and authentication controls are required?
- Which authorized endpoint and transport contract will support sync, attachment limits, retries and receipts?
- Who convenes the Sailor panel and official rubric assessment, and what constitutes pilot success?

The source transition hypothesis names NAVSUP Business Systems Center, NAVIFOR and Navy Reserve Force, an existing low-code/automation destination, and owner selection at 30 days, build at 60, unit pilot at 90 and fleet release decision at 180. These are source proposals, not commitments, approvals or established ownership. No owner authority has been exercised here.
