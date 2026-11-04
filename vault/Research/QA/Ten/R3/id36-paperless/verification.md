# Primary deferrals

- **UC36-4, Runs on government devices and existing low-code platforms where possible**
  real-system: Authorized government devices and the owner low-code runtime are unavailable; withhold compatibility/deployment claims. Demonstrate the complete local browser workflow and a platform-transition checklist.
- **EVAL36-3, Time per packet against a manual baseline [baseline to be set with Fleet SME]**
  real-data: A Fleet-SME-established manual timing baseline is unavailable; withhold fleet timing comparison. Record observed synthetic elapsed time and a separately invented 20-minute baseline.
- **EVAL36-5, Ease of use judged by a Sailor panel**
  human-authority: A Sailor panel must supply its own usability judgment; withhold endorsement. Demonstrate both tracks and provide an unscored panel worksheet.
- **EVAL36-6, Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.**
  human-authority: Official judges must issue official rubric scores; withhold scoring. Display the five original weights with every score unassessed.
- **DELIVERABLE36-1, Sailor hours returned to maintenance, training and watchstanding**
  real-data: Observed operational workload and independently measured manual/assisted timings are unavailable; withhold actual hours-returned claims. Show an invented 20 versus 8 minute, 10-packet estimate of 2.00 hours.
- **DELIVERABLE36-2, Fewer errors and less rework**
  real-data: Matched operational error and rework observations are unavailable; withhold actual fleet error-reduction claims. Detect and correct five seeded synthetic errors before local routing.

All six remain unverified. Browser prototype checks cannot establish all source requirements met. The same up-front inventory is required in verification.md, README.md and the review summary. No real-format or operational validation is claimed.

# Verification, bounded repair

## Results and evidence boundary

Executed in this verify phase: `node --test core.test.cjs`. Initial existing suite: **20 passed, 0 failed, 0 skipped**. Added adversarial regressions before repair: **20 passed, 3 failed, 0 skipped**. After one bounded implementation repair and additional draft-preservation coverage: **24 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo** (Node test runner exit 0).

The final application tests call core.cjs and the delivered inline core through node:vm. Two additional behavioral tests execute the actual UI field-reader function and registered conflict handlers extracted from index.html with synthetic controls/state. Those isolated UI-function tests do not exercise a DOM, rendered layout, IndexedDB or a browser workflow. Script parsing and cross-copy comparisons are supplementary checks, not acceptance evidence by themselves.

**Browser verification is unverified; the completion gate has not passed.** No browser runtime/tool or host browser evidence is available in this phase. All seven frozen journeys still require host execution at desktop and narrow viewports (14 executions), including console and overflow checks. No screenshots or traces were produced or inspected. test-report.json, browser captures and host source hashing are harness-owned and have not been written or substituted here. Missing browser execution cannot be treated as a Node-only pass.

`requirementsMet: false`, six frozen deferrals remain unverified, independent of prototype test results. Generated: yes. Runnable core: demonstrated by Node execution. Browser runnable: unverified. Node-tested: yes. Browser-tested: no. Reviewer-accepted: no. Operationally validated: no.

## Preserved failure evidence and single repair

The pre-repair regression run exited 1 with these failures:

- `module: unsaved edits block simulated delivery and retain queue`: Missing expected exception. Sync accepted a dirty draft while sending the prior approved revision.
- `browser inline: unsaved edits block simulated delivery and retain queue`: same missing exception in the actual inline core.
- `actual UI field reader retains task identity after reviewed deletion`: expected `task-2-action`, observed `task-1-action`. Removing TASK-01 shifted array positions while rendered fields stayed keyed by task ID.

Repair: sync now applies the current review/validation/dirty boundary before touching replicas or queue, in both core copies. Field reads use stable task IDs; controls for deleted tasks are disabled. Conflict simulation and confirmation require deliberate save/discard before replacing an unfinished draft. Regression tests verify rejection leaves state unchanged and read the correct remaining task controls. This uses the single bounded repair; no frozen expectations were changed. The host must rerun both Node and browser gates for this source revision.

## Criterion mapping

Every row retains its frozen disposition. “Node pass” means only the listed behavior passed in core.test.cjs; implemented criteria remain unverified as complete browser tasks. Inputs and literal expected outcomes, original source wording and provenance are retained per criterion in test-matrix.md and acceptance-plan.json. Deferred dependency reasons were inspected: device/platform access, operational measurements and actual panel/judging judgments are genuine dependencies; no missing expert was used to defer the defining synthetic workflow.

| Criterion | Application evidence executed | Frozen host journeys | Current result |
| --- | --- | --- | --- |
| UC36-1 | core.test.cjs: routing gates; simulated sync upsert/replay; queue retention | packet-offline, reconnect-review, storage-history-recovery | Listed Node checks pass; browser unverified |
| UC36-2 | core.test.cjs: approval binds saved revision; unsaved delivery rejection; conflict draft guards | packet-offline, validation-recovery, reconnect-review | Listed Node checks pass; browser unverified |
| UC36-3 | core.test.cjs: source-linked routing audit fields; reviewed merge history (partial audit coverage) | evidence-review, reconnect-review | Listed Node checks pass; browser unverified |
| UC36-4 | No evidence establishes deferred outcome. real-system: Authorized government devices and the owner low-code runtime are unavailable; withhold compatibility/deployment claims. Demonstrate the complete local browser workflow and a platform-transition checklist. | None for deferred criterion | Unverified deferral |
| UC36-5 | core.test.cjs: synthetic sources and named outputs (rendered/export disclosure awaits browser) | packet-offline, evidence-review | Listed Node checks pass; browser unverified |
| UC36-6 | core.test.cjs: source citations; review/routing; simulated sync (path download awaits browser) | packet-offline, reconnect-review, evidence-review | Listed Node checks pass; browser unverified |
| OFF-01 | core.test.cjs: merge replay; idempotent routing and simulated sync upsert | merge-order, reconnect-review | Listed Node checks pass; browser unverified |
| OFF-02 | core.test.cjs: concurrent edit/delete, concurrent tombstones, reviewed resolution; UI field reader after deletion | reconnect-review | Listed Node checks pass; browser unverified |
| OFF-03 | core.test.cjs: opposite merge orders and canonical result comparison | merge-order | Listed Node checks pass; browser unverified |
| OFF-04 | core.test.cjs: zero budget, priority, interruption before acknowledgement, resume, duplicate/noncontiguous/oversize acknowledgement | transfer-resume | Listed Node checks pass; browser unverified |
| OFF-05 | core.test.cjs: review gates and unsaved draft guards only; real persistence requires browser | packet-offline, reconnect-review, storage-history-recovery | Listed Node checks pass; browser unverified |
| EVAL36-1 | core.test.cjs: 27/28 raw and 28/28 corrected accuracy; duplicate citations and ambiguity; named outputs | packet-offline, evidence-review | Listed Node checks pass; browser unverified |
| EVAL36-2 | core.test.cjs: five literal seeded findings, corrected packet, invalid dates/quantities/roles | validation-recovery | Listed Node checks pass; browser unverified |
| EVAL36-3 | No evidence establishes deferred outcome. real-data: A Fleet-SME-established manual timing baseline is unavailable; withhold fleet timing comparison. Record observed synthetic elapsed time and a separately invented 20-minute baseline. | None for deferred criterion | Unverified deferral |
| EVAL36-4 | core.test.cjs: merge/replay and dirty delivery gates; full offline workflow requires browser | packet-offline, reconnect-review, transfer-resume | Listed Node checks pass; browser unverified |
| EVAL36-5 | No evidence establishes deferred outcome. human-authority: A Sailor panel must supply its own usability judgment; withhold endorsement. Demonstrate both tracks and provide an unscored panel worksheet. | None for deferred criterion | Unverified deferral |
| EVAL36-6 | No evidence establishes deferred outcome. human-authority: Official judges must issue official rubric scores; withhold scoring. Display the five original weights with every score unassessed. | None for deferred criterion | Unverified deferral |
| DELIVERABLE36-1 | No evidence establishes deferred outcome. real-data: Observed operational workload and independently measured manual/assisted timings are unavailable; withhold actual hours-returned claims. Show an invented 20 versus 8 minute, 10-packet estimate of 2.00 hours. | None for deferred criterion | Unverified deferral |
| DELIVERABLE36-2 | No evidence establishes deferred outcome. real-data: Matched operational error and rework observations are unavailable; withhold actual fleet error-reduction claims. Detect and correct five seeded synthetic errors before local routing. | None for deferred criterion | Unverified deferral |
| DELIVERABLE36-3 | core.test.cjs: three form outputs and five-action routing logic; actual local inbox workflow requires browser | packet-offline, evidence-review | Listed Node checks pass; browser unverified |

## Browser and guide checks outstanding

- packet-offline: actual extraction/correction controls, saved state after IndexedDB transaction, reload, review gate, six rendered outputs, local inboxes and packet download.
- validation-recovery: all five visible errors, corrections, unsaved and changed-revision routing blocks and recovery.
- reconnect-review: competing versions, explicit custom subject/task choice, reviewed merge persistence, reapproval, delivery and replay after reload.
- merge-order: rendered results from both merge orders and replay.
- transfer-resume: real controls and persisted acknowledged offsets across reload, interrupted/zero-budget recovery and completion.
- storage-history-recovery: actual save failure/retry and missing-history recovery without losing local work.
- evidence-review: rendered citations, audit, metrics, rubric and audit/path downloads.

README quick start and sample walkthrough were compared to the delivered controls, handlers, source fixtures and frozen literal outcomes. The guide now documents stable task editing after deletion and unsaved-draft guards. Direct file launch, local-file IndexedDB availability, every click/reload/download instruction, storage clearing, keyboard behavior, narrow layout, screen-reader announcements and physical device restart were not exercised. These guide steps remain unverified. Node VM execution is not a replacement for them.

## Domain inspection and limitations

Source citations retain source ID, demo-v1 revision, synthetic timestamp, exact excerpt and offsets or image region. They describe invented fixtures, not facts retrieved from the challenge website. The frozen 28-field key is separately planned, not independent SME ground truth. Both tracks and all six named outputs exist; image recognition is fixture-assisted, not general OCR. Filing classifications and retention are invented. UI/sample/export disclosure is explicit: **synthetic, not validated against the real format**.

fleet_reconcile_records was called with a common root, an edit and a concurrent tombstone: it returned three operations and two preserved conflicting heads. fleet_plan_uploads was called with the frozen 2000-byte fixture: it planned critical offset 0/1000 bytes then photo offset 5000/1000 bytes. These are reference calculations only. Application merge and transfer evidence comes from the actual functions in the Node suite; actual acknowledged-byte durability remains a browser gate.

Source inspection found inline assets, classic scripts, no external dependency or endpoint call, an IndexedDB whole-workspace snapshot adapter and explicit local receipt/replica simulations. Persist-before-save acknowledgement is implemented but real storage transactions, abort recovery and eviction resistance are unverified. The primary task remains restricted to the bundled packet; recovery exports have no import. UI statuses may describe earlier validation until Save/Validate is repeated. Unconfirmed conflict choices and review checkboxes are not persisted as decisions.

No authenticated transport, receiver, government-device/low-code runtime, CAC identity, validated device encryption, official form compliance, authoritative records disposition, real data accuracy, measured fleet timing/error reduction, Sailor panel judgment or official rubric scores are demonstrated. IndexedDB is unencrypted. Physical restart and independent operational review remain unverified. requirementsMet remains false even if the host later passes all synthetic prototype journeys.

## Architecture and integrity

system-design.json and the frozen acceptance-plan.json/ux-spec.json were preserved. All six mapped components have existing implementation files. Affected components were reported building during verification and generated after repair/inspection. Generated reports implementation existence, not acceptance or correctness. No .fleet files or host evidence were edited. No mutable test-data files or dependencies were created.
