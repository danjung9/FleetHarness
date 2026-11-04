Primary deferrals, external portions remain unverified:

| ID | Basis | Concrete dependency, impact and synthetic demonstration |
| --- | --- | --- |
| UC36-4 | real-systems | Authorized government device/browser policy and owner-selected low-code runtime are required to establish actual compatibility. Synthetic desktop/narrow workflow, reload and exports are demonstrated; they cannot certify those systems. |
| EVAL36-3 | human-authority | A Fleet SME must authorize the official manual baseline; synthetic elapsed timing, assumed 1200-second comparison and arithmetic cannot establish that authorized comparison. |
| EVAL36-5 | human-authority | An actual Sailor panel must judge usability. Complete task flows and an unscored panel worksheet are demonstrated; software cannot supply panel judgment. |
| EVAL36-6 | human-authority | Official judges must assign the rubric scores. A worksheet with exact categories/weights and blank scores is demonstrated; it cannot confer official scores. |
| DELIVERABLE36-1 | real-data | Observed unit workload and time-use data are needed to establish hours actually returned. Measured prototype timing and fictional 20-packet illustrative savings cannot establish realized benefit. |
| DELIVERABLE36-2 | real-data | Comparable unit baseline and follow-up error/rework observations are needed to establish actual reductions. Four seeded issues caught/corrected demonstrate synthetic prevention, not operational improvement. |

# Acceptance and evidence matrix

All inputs are the DEMO-7 packet specified in plan.md; journey-specific mutations are frozen in acceptance-plan.json. Expected outcomes below were set during planning, not derived from implementation. These synthetic answer keys are not independent SME ground truth.

Every planned browser journey runs fresh on desktop and narrow viewports. Result/evidence for every implemented row: not run; future host-owned test-report.json criterion/journey entries and screenshot/trace paths. Deferred rows remain unverified even if their synthetic demonstrations pass. No test is claimed passed here.

| Canonical ID and original requirement | Preserved packet provenance | Independent expected outcome | Planned browser evidence | Current result |
| --- | --- | --- | --- | --- |
| UC36-1: Offline-first with clean sync | requirement UC36-1 at `challenge.requirements[0]` | All three synthetic forms and tasking outputs are saved offline, survive reload, route locally after review, and reach an acknowledged local demo replica after explicit conflict resolution. No real sync is claimed. | forms-route, tasking-records, conflict-review, save-recovery | Planned; not run |
| UC36-2: Human review before anything is submitted | requirement UC36-2 at `challenge.requirements[1]` | Invalid, unsaved, conflicted and changed revisions cannot route; explicit review of the saved current revision precedes each local route. A changed approved duration requires renewed review. | validation-recovery, conflict-review | Planned; not run |
| UC36-3: Audit trail | requirement UC36-3 at `challenge.requirements[2]` | Audit export and review/routing ledger retain source-linked immutable revision actions, Training Reviewer decisions, reasons and local routing/receipt states. | evaluation-exports, conflict-review | Planned; not run |
| UC36-4: Runs on government devices and existing low-code platforms where possible | requirement UC36-4 at `challenge.requirements[3]` | Authorized government device/browser policy and owner-selected low-code runtime are required to establish actual compatibility. Synthetic desktop/narrow workflow, reload and exports are demonstrated; they cannot certify those systems. | External deferral; synthetic evidence in evaluation-exports / forms-route | Unverified external dependency |
| UC36-5: Synthetic data only; no personal information | requirement UC36-5 at `challenge.requirements[4]` | The application and exports use fictional DEMO records, no personal information, and visible synthetic/nonoperational labels; pause blocks routing and acknowledgement. | safety-stop, forms-route, evaluation-exports | Planned; not run |
| UC36-6: Fleet-Ready Definition of Done (all solutions): runs offline; keeps humans in authority; cites sources; logs auditable actions; syncs on reconnect; includes a one-page path to fleet. | requirement UC36-6 at `challenge.requirements[5]` | Labeled synthetic workflow operates from the local file offline with citations, reviewed routing, inspectable audit, simulated reconnect and a downloadable one-page path to fleet. This is not operational Fleet-Ready certification. | forms-route, tasking-records, conflict-review, evaluation-exports | Planned; not run |
| OFF-01: Replaying an operation has no duplicate effect. | recipe OFF-01 at `recipe.acceptance[0]` | Replaying immutable operations adds zero revisions and zero duplicate routing effects. | replay-converge | Planned; not run |
| OFF-02: Concurrent edits and deletes remain visible. | recipe OFF-02 at `recipe.acceptance[1]` | Concurrent edit/edit values 45 and 50 and edit/delete heads remain visible until a reasoned reviewer choice creates a new revision referencing every reviewed head. | replay-converge, conflict-review | Planned; not run |
| OFF-03: Converge independent of delivery order. | recipe OFF-03 at `recipe.acceptance[2]` | Opposite delivery orders yield identical canonical record state with both concurrent heads preserved. Missing history preserves the queue until restored. | replay-converge, missing-history | Planned; not run |
| OFF-04: Resume transfers within a bounded link budget. | recipe OFF-04 at `recipe.acceptance[3]` | Zero budget retains work; send without acknowledgement leaves image at 6144 bytes; acknowledged 4096-byte budget sends critical 1024 and image 3072, reaching 9216; next 3072 completes 12288 after reload. | transfer-resume | Planned; not run |
| OFF-05: Persist across device restart and review before routing. | recipe OFF-05 at `recipe.acceptance[4]` | Saved edits and acknowledged offsets survive browser reload offline; reconnect conflicts require explicit choice and renewed review before routing, with reviewer decision exported. Physical restart, eviction and device loss remain unverified. | forms-route, save-recovery, conflict-review, transfer-resume | Planned; not run |
| EVAL36-1: Extraction accuracy against an answer key | evaluation EVAL36-1 at `challenge.evaluationCriteria[0]`; user USER36-1 at `userScope.criteria[0]` | Against the planner-defined 20-field synthetic answer key, raw extraction is 16/20 (80%); after source-based correction reviewed accuracy is 20/20 (100%). No general OCR or real-data accuracy is claimed. | evaluation-exports, tasking-records | Planned; not run |
| EVAL36-2: Errors caught before submission | evaluation EVAL36-2 at `challenge.evaluationCriteria[1]`; user USER36-2 at `userScope.criteria[1]` | All four seeded issues (ambiguous duration, negative quantity, missing subject, conflicting task due date) block routing, survive correction, and result in 4 caught, 4 corrected and 0 unresolved before approval. | validation-recovery, evaluation-exports | Planned; not run |
| EVAL36-3: Time per packet against a manual baseline [baseline to be set with Fleet SME] | evaluation EVAL36-3 at `challenge.evaluationCriteria[2]`; user USER36-3 at `userScope.criteria[2]` | A Fleet SME must authorize the official manual baseline; synthetic elapsed timing, assumed 1200-second comparison and arithmetic cannot establish that authorized comparison. | External deferral; synthetic evidence in evaluation-exports / forms-route | Unverified external dependency |
| EVAL36-4: Complete offline operation and conflict-free sync | evaluation EVAL36-4 at `challenge.evaluationCriteria[3]`; user USER36-4 at `userScope.criteria[3]` | Both synthetic tracks complete offline, survive reload, resolve competing heads explicitly and acknowledge the reviewed local packet on simulated reconnect without duplicate effects. No operational transport is implied. | forms-route, tasking-records, conflict-review, replay-converge | Planned; not run |
| EVAL36-5: Ease of use judged by a Sailor panel | evaluation EVAL36-5 at `challenge.evaluationCriteria[4]`; user USER36-5 at `userScope.criteria[4]` | An actual Sailor panel must judge usability. Complete task flows and an unscored panel worksheet are demonstrated; software cannot supply panel judgment. | External deferral; synthetic evidence in evaluation-exports / forms-route | Unverified external dependency |
| EVAL36-6: Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%. | evaluation EVAL36-6 at `challenge.evaluationCriteria[5]`; user USER36-6 at `userScope.criteria[5]` | Official judges must assign the rubric scores. A worksheet with exact categories/weights and blank scores is demonstrated; it cannot confer official scores. | External deferral; synthetic evidence in evaluation-exports / forms-route | Unverified external dependency |
| DELIVERABLE36-1: Sailor hours returned to maintenance, training and watchstanding | deliverable DELIVERABLE36-1 at `challenge.expectedDeliverables.lines[0]` | Observed unit workload and time-use data are needed to establish hours actually returned. Measured prototype timing and fictional 20-packet illustrative savings cannot establish realized benefit. | External deferral; synthetic evidence in evaluation-exports / forms-route | Unverified external dependency |
| DELIVERABLE36-2: Fewer errors and less rework | deliverable DELIVERABLE36-2 at `challenge.expectedDeliverables.lines[1]` | Comparable unit baseline and follow-up error/rework observations are needed to establish actual reductions. Four seeded issues caught/corrected demonstrate synthetic prevention, not operational improvement. | External deferral; synthetic evidence in evaluation-exports / forms-route | Unverified external dependency |
| DELIVERABLE36-3: Forms completed and routed without connectivity | deliverable DELIVERABLE36-3 at `challenge.expectedDeliverables.lines[2]` | Completed training log, supply requisition and routine correspondence/routing cover sheet are downloadable and routed to a named local demo queue while offline, clearly pending sync. | forms-route | Planned; not run |

## Application Node checks paired with browser journeys

Write core.test.cjs using node:test and actual exported core.cjs functions. No toolkit self-test, repeated implementation assertion or source-string check substitutes for these checks.

| Input/boundary | Literal expected invariant | Browser pairing |
| --- | --- | --- |
| Frozen 20-field key, raw candidates and corrected packet | 16/20 raw and 20/20 reviewed; missing/wrong values count as failures; wrong owner/date/class must not score correct | evaluation-exports, tasking-records |
| Duration 0, fractional, blank; quantity -2/0; invalid ISO date; subject blank; absent attachment/ref | Findings block review/route without content loss; corrected 45,6,subject and references pass | validation-recovery |
| Five emails and one document with duplicate/conflicting pump deadline | Exactly two actions, both pump citations retained; deadline unresolved until chosen; statuses use verified values only | tasking-records |
| Closure 2026-10-18, leap-date boundary, unknown class | Retain through 2027-10-18; calendar addition defined as 365 days; unknown class Needs records review and no automatic disposal | tasking-records |
| Same revision replayed twice; route command retried twice | Canonical state unchanged; one business route per revision/destination | replay-converge |
| Sibling edits, sibling edit/delete, opposite delivery order | Both heads survive; canonical states identical; resolution parents include every current head | replay-converge, conflict-review |
| Missing/cross-record parent, cycle, ID/content collision, new head during review | Reject malformed history without queue mutation; changed head set invalidates pending resolution | missing-history, conflict-review |
| Budget 0,-1,fraction; invalid offsets; 6144 of 12288 plus critical 1024; interrupted ack | Reject invalid inputs; zero retains work; 4096 budget gives critical1024/image3072; no ack no offset advance; next3072 completes; duplicate ack no double count | transfer-resume |
| Approval snapshot then edit, unsaved edit, reject with reason | Block route on stale/unsaved approval; preserve rejection and content; require exact-revision reapproval | validation-recovery |
| Elapsed 60, 1200, 1800 seconds; assumed1200 and volume20 | Illustrative hours 6.333333…, 0, -3.333333…; do not clamp negatives; monotonic elapsed and explicit pause disclosure | evaluation-exports |
| Pause and resumed simulation | No routing/receipt mutations while paused, retained state on resume | safety-stop |

## Risks and human review

IndexedDB transaction rollback, quota denial, cleared/evicted storage, file-origin browser policy and cross-tab races need honest limits. Browser reload is persistence evidence within that runtime, not physical restart, encryption or government-device approval. No browser tool or screenshot is available during planning. Host owns browser evidence and source hashes; do not edit .fleet/, frozen contracts or host reports. A missing browser runtime is a failure. One bounded implementation repair preserves initial failure evidence and cannot change expectations.

Reviewers must assess source completeness, usability, records classifications, actual format rules, identity, encryption/key lifecycle, retention, transport receipts and operational monitoring. Official panel/judges and actual workload observations remain external. README.md, verification.md and delivery/review summaries must begin with the six-row primary deferral disclosure above. Keep requirementsMet separate from prototype check status; passing the scoped prototype cannot satisfy all source requirements.

## Build application evidence (host browser evidence pending)

`node --test core.test.cjs`: 21 passed, 0 failed, 0 skipped locally. Actual core.cjs and the inline application core both receive the test vectors. Node checks do not execute IndexedDB or DOM workflows; the planned browser result rows above remain not run. See verification.md.

| Criterion | Actual application check / input and expected result | Result / evidence |
| --- | --- | --- |
| UC36-1 | Concurrent heads and reviewed local routing; only explicit acknowledgement changes receipt state | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| UC36-2 | Unsaved and changed approval snapshots block route; exact reviewed revision permits one route | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| UC36-3 | Resolution decision retains reviewed heads, actor and reason; browser audit download pending | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| UC36-4 | Authorized government device and low-code platform unavailable; synthetic UI only | External portion unverified; synthetic checks only; core.test.cjs / verification.md |
| UC36-5 | Synthetic embedded fixtures only; pause blocks route/receipts; browser boundary assertions pending | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| UC36-6 | Synthetic end-to-end UI and path exported; core review/reconcile checks pass, full browser journey pending | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| OFF-01 | Operation replay yields identical canonical result; route twice creates one business route | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| OFF-02 | Sibling edit/edit and edit/delete both retain two heads; resolution references both | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| OFF-03 | Opposite merge orders agree; missing parent errors retain original queue | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| OFF-04 | 0-byte budget retains work, 4096 allocates1024+3072, duplicate acknowledgement adds no bytes, next3072 completes | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| OFF-05 | Review invalidation tested; real IndexedDB reload/restart and offset persistence require browser/device verification | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| EVAL36-1 | Raw16/20, corrected20/20; changing owner reduces score to19 | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| EVAL36-2 | Four invalid seed fields are rejected; invalid dates, missing attachments and nonwhole durations rejected | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| EVAL36-3 | Elapsed60/1200/1800 against assumed1200 computes6.333/0/-3.333 illustrative hours; SME baseline unavailable | External portion unverified; synthetic checks only; core.test.cjs / verification.md |
| EVAL36-4 | Conflict resolution, replay and guards pass; complete offline browser journey pending | Core checks passed where described; browser pending; core.test.cjs / verification.md |
| EVAL36-5 | Sailor panel unavailable; unscored worksheet implemented, download browser check pending | External portion unverified; synthetic checks only; core.test.cjs / verification.md |
| EVAL36-6 | Official judges unavailable; blank exact-weight worksheet implemented, browser check pending | External portion unverified; synthetic checks only; core.test.cjs / verification.md |
| DELIVERABLE36-1 | Illustrative arithmetic tested; actual unit workload/time-use data unavailable | External portion unverified; synthetic checks only; core.test.cjs / verification.md |
| DELIVERABLE36-2 | Seeded errors rejected; actual comparative error/rework observations unavailable | External portion unverified; synthetic checks only; core.test.cjs / verification.md |
| DELIVERABLE36-3 | Synthetic form summaries, reviewed local route and named exports implemented; browser completion pending | Core checks passed where described; browser pending; core.test.cjs / verification.md |

## Verification-phase adversarial evidence

Executed node --test core.test.cjs: 21 passed, 0 failed, 0 skipped after one bounded repair. Initial extended run: 15 passed / 6 failed across module and inline core. Added whitespace-only required-field rejection (UC36-2/EVAL36-2), unfinished draft preservation during resolution (OFF-02/UC36-2), and atomic whole-byte receipt validation (OFF-04). See verification.md for preserved failures, repair, every-criterion mapping and unverified browser gate. No desktop/narrow result is claimed.

## Superseding host-failure repair evidence

The original host report now exists: 21 Node passes; 14/20 browser journey executions passed. forms-route, conflict-review and replay-converge failed at desktop and narrow due to reverted correction values. Other seven journeys passed both sizes. Prior not-run statements above describe earlier phases. verification.md maps every criterion to the actual host journey evidence and remaining deferrals. The bounded shared UI transaction-lock repair passes 23 application tests (core.test.cjs plus ui.test.cjs), zero skips; browser rerun remains pending for every journey. Host report/screenshots/traces are preserved. requirementsMet: false.
