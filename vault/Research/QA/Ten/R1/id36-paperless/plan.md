# Paperless Underway implementation plan

Planning date: 2026-11-04. This phase creates contracts only; application code and tests are not implemented or executed. Read requirements.md, scope.md, research.md, packet, quality contract and all four assigned skills. system-design.json is published through fleet_system_design. acceptance-plan.json and ux-spec.json are ready for host validation and freezing. They must not change during build or repair.

## Scope and smallest complete workflow

A Sailor enters one synthetic training log, corrects invalid input, saves locally, reloads offline, reconciles with a labeled simulated second replica, explicitly chooses between competing edits or an edit and deletion, reviews the saved result and queues simulated routing. The next simulated reconnect records a synthetic receipt only for an already approved queue item. Reconnect alone never approves or submits a new record. A receipt explicitly says there was no external delivery.

The default view is a readable form with Save locally and a visible current status. Conflict review and saved-content approval are adjacent panels, not raw JSON. Secondary expandable Simulation tools contain peer update, concurrent edit/delete and delivery-order controls. Action history/export is secondary. No OCR, model inference, official form compliance, actual routing, attachment transfer, production replication or government integration enters this slice. Both broad source tracks remain deferred where not covered. Full source wording and all provenance aliases are retained in test-matrix.md, with one canonical JSON criterion per packet ID.

Five criteria are planned implemented: UC36-2, UC36-5, OFF-01, OFF-02 and OFF-03. The other fifteen remain deferred/unverified. A synthetic audit trail and validation are still built as supporting workflow behavior; they do not satisfy the broader audit assurance or official-domain evaluation. Passing all prototype checks will not establish requirementsMet.

## Files and dependencies

- index.html: entire runnable app, inline CSS and classic JavaScript, native controls and embedded core; open directly without server, network, modules, external scripts, fonts, CDNs or fetch.
- core.cjs: exact testable application domain API exported for Node. Embed its browser-compatible core body in index.html; no runtime external file dependency.
- core.test.cjs: Node built-in tests against actual core plus execution of the actual inline core through node:vm for behavior consistency.
- storage.test.cjs: tests against the actual injectable persistence transaction adapter, including abort behavior. Browser reload journey verifies real UI persistence independently.
- README.md and path-to-fleet.md: describe actual operation, limitations, evidence status and one-page owner transition path. Future verification.md records performed checks; host owns test-report.json and images/traces.

IndexedDB is selected for transactional local storage. No localStorage fallback may silently weaken commit semantics. Show an actionable storage-unavailable error and preserve the draft in memory if opening/committing fails. Plain IndexedDB is not encryption. Direct-file browser storage support varies; unsupported operation is a failure to record, never a reason to fake Saved locally. Target supported desktop browsers for the prototype; no government-device claim.

Research evaluated PouchDB/CouchDB as the established replication candidate. It is deferred because release/license, semantics, supported adapters and an authorized receiver are missing. The custom revision graph here is a bounded synthetic simulator, not a replacement production replication protocol. Build may use assigned reconciliation tools as references; tool output is never application verification. Do not modify .fleet or bundle its runtime as an external dependency.

## Domain contract

Training-log schema v1 is purpose-made, not NAVPERS: recordId log-example, activity (trimmed 1 to 120 characters), date (valid Gregorian YYYY-MM-DD), durationMinutes (integer 1 to 1440), unit fixed to Unit Example and sourceRef fixed to synthetic-log-v1. Date is not checked against the current clock. Load synthetic sample fills Damage control drill, 2026-11-01, 60 minutes; it is a draft and creates no revision. No personal-name or personnel-ID inputs exist. Fictional actors are Local Example, Peer Example and Reviewer Example. The visible data warning and source reference have the literal text frozen in the journeys. Free text cannot guarantee personal-data prevention; users must obey the synthetic-only boundary.

Revision: {id, recordId, parents, actor, value}. value is a canonical JSON string of the training-log fields or null for deletion. Operation IDs are immutable unique IDs; parents are sorted/deduplicated revision IDs. Canonical serialization uses a fixed field order; canonical graph sorts by operation ID and heads by ID. No clocks decide winners. Validate missing parents, cross-record parents, cycles and ID/content collisions before any commit. Reject malformed inputs atomically, retain the original local queue and ask for missing history. Bound histories to the documented supported limits; refuse excessive data rather than prune unresolved heads.

Core functions should expose validateLog, canonicalizeLog, reconcile, getHeads, resolveHeads, reviewRevision, enqueueRoute and applySimulatedReceipt with explicit inputs/outputs and no DOM/storage access. Reconcile is idempotent and order independent; domain audit entries for an operation are deduplicated. A resolution creates a fresh operation referencing every reviewed head with the selected local/peer/custom value; it records the choice and fictional reviewer. Deleted records cannot be routed. A reviewer can inspect both full values before confirming; a custom result must pass the same validation. Local edits while conflicted must not implicitly resolve the graph.

Persistence envelope: schemaVersion, recordId, revisions, pendingOperations, review {revisionId, actor, decision}, routeQueue keyed by revisionId, receipts keyed by revisionId, audit and saved form. A separate draft contains fields, dirty flag and base revision reference. Revisions, queue, approval invalidation and audit commit in one IndexedDB readwrite transaction. Only transaction completion permits Saved locally. Errors keep the draft and previous envelope. Do not overwrite a dirty draft when opening review or simulating reconnect. Explicit Save or Discard is required to review/route committed content that differs from the draft. Save creates a new revision and invalidates older approval. Review confirmation resets when the reviewed revision changes. Reload restores committed content, queue and decisions; if a dirty draft exists restore it with Unsaved changes status.

Audit records contain event ID, sequence, action, fictional actor, record/revision references and decision details. Timestamps are informational only. At minimum capture save, validation failure, merge, resolution with all parents, approval, enqueue and simulated receipt. Read-only history remains inspectable after reload; export a synthetic JSON snapshot with provenance and an unencrypted/local-only warning. Audit integrity/authentication is deferred. A retry can show a transient Already present status without adding a second domain audit event.

## Deterministic simulation fixtures

Peer update is a child of the saved root changing activity to First aid drill. Its button always replays the exact same immutable revision; subsequent presses never generate new IDs. Concurrent peer edit and concurrent peer delete branch from the saved sample root even after a local Pump drill edit; the delete has null value. Preserve the original root to construct these fixtures reliably. Buttons explain when a prerequisite sample/root is missing.

The delivery-order comparison uses a separate purpose-made root and two children, Pump drill and First aid drill. Execute the real reconciler in both directions and compare full canonical states, not only counts or fixture text. Show both summaries and Identical canonical state in both delivery orders only after equality. This secondary demonstration must not overwrite the user's log or draft. Browser journeys each start in a fresh context; no journey depends on another journey's state.

## Ordered tasks and exit conditions

1. Implement the dependency-free pure core and synthetic fixtures. Add Node boundary/graph/review tests described in test-matrix.md. Preserve tombstones and all-head resolution; error cases are atomic.
2. Implement IndexedDB schema/open/transaction/reload and injectable failure paths. Commit before acknowledging. Keep errors actionable and draft content intact. Export the actual adapter for Node testing without requiring the browser at module import.
3. Build the form shell and source/data notices with exact frozen selectors and literals. Validate blank activity, invalid date and duration without losing entered values. Use aria-describedby and focus the first error.
4. Wire all mutation paths to the shared core and atomic persistence. Add saved summary, review panel, dirty-content Save/Discard guard, current-revision approval and idempotent route queue.
5. Add simulated peer reconnect, replay, edit/delete conflicts, explicit local/peer/custom resolution and inspectable decision history. Buttons are labeled as simulation. Do not auto-route unapproved content or claim receiver authentication.
6. Add simulated receipt, source/audit export and secondary order comparison. Provide labels/status prerequisites rather than controls that silently do nothing. Check narrow layout and keyboard focus using host evidence when available.
7. Complete README and the one-page path to fleet: owner selection at 30 days, owner-platform build at 60, unit pilot at 90 and fleet release decision at 180 are source hypotheses, not promises. Name all missing policy, data, license, device and integration dependencies.
8. Run Node tests in the build/verification phase and hand off to the host for every frozen journey at desktop/narrow widths. Record generated, runnable, tested, reviewer accepted and operationally validated separately. If either gate fails, one shared bounded repair fixes implementation only. Preserve failed evidence and frozen expectations.

## Failure and evidence boundaries

Empty/loading/error/success, keyboard, persistence and recovery behaviors are specified in ux-spec.json. Native review/route buttons may remain actionable to produce the literal blocking messages in the journeys; explain prerequisites visibly. Pending transactions disable duplicate actions. A failed save cannot create a queue item. A merge error cannot drop pending work. Conflict resolution cannot reuse an old approval. Unsaved drafts survive ordinary panel changes and simulation actions. No destructive reset is required; any optional reset must require explicit confirmation and never be triggered on reconnect.

Domain calculations are deterministic validation and graph operations. There is no model-assisted explanation in this slice; future generated text must remain a labeled draft with source citations and human review, outside merge, validation and authorization decisions. Ground truth, official equations/rules, baseline timing and field authority are missing and must not be invented.

Synthetic rule outcomes are planner-established expectations, protected from implementation drift, not independent SME findings. Host browser evidence establishes specified interactions only. Real device encryption, offline provisioning/restart, quota/eviction policy, retention, recipient authority, authenticated transport and operational safety need owner/human review. No deployment, publishing, credential access or operational contact is authorized.
