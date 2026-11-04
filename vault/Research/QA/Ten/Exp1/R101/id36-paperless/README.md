Primary deferrals, external portions remain unverified:

| ID | Basis | Concrete dependency, impact and synthetic demonstration |
| --- | --- | --- |
| UC36-4 | real-systems | Authorized government device/browser policy and owner-selected low-code runtime are required to establish actual compatibility. Synthetic desktop/narrow workflow, reload and exports are implemented as synthetic demonstrations; they cannot certify those systems. |
| EVAL36-3 | human-authority | A Fleet SME must authorize the official manual baseline; synthetic elapsed timing, assumed 1200-second comparison and arithmetic cannot establish that authorized comparison. |
| EVAL36-5 | human-authority | An actual Sailor panel must judge usability. Complete task flows and an unscored panel worksheet are implemented as synthetic demonstrations; software cannot supply panel judgment. |
| EVAL36-6 | human-authority | Official judges must assign the rubric scores. A worksheet with exact categories/weights and blank scores is demonstrated; it cannot confer official scores. |
| DELIVERABLE36-1 | real-data | Observed unit workload and time-use data are needed to establish hours actually returned. Measured prototype timing and fictional 20-packet illustrative savings cannot establish realized benefit. |
| DELIVERABLE36-2 | real-data | Comparable unit baseline and follow-up error/rework observations are needed to establish actual reductions. Four seeded issues caught/corrected demonstrate synthetic prevention, not operational improvement. |

# Paperless Underway, user guide

## What it does

Paperless Underway is a synthetic offline workspace for expeditionary-unit training, supply and command clerks, with a fictional **Training Reviewer** role. It turns embedded sample sources into a training log, supply requisition, routine correspondence package and two consolidated actions. Users correct the candidates, validate the saved packet, approve its exact revision and route it to **Demo Administration Desk**.

The application also provides draft statuses, a fictional records-filing schedule, downloadable evidence, conflict review and a priority-transfer simulator. Both replicas and their acknowledgements live locally in the browser. Nothing is sent to an actual recipient or endpoint.

Use fictional data only. The persistent banner reads **SYNTHETIC, NOT FOR OPERATIONAL USE**.

## Prerequisites and quick start

You need a modern browser with JavaScript, IndexedDB storage and downloads enabled. No installation, server, internet connection, account or Node runtime is required to use the application.

1. Open [index.html](index.html) directly in your browser.
2. Wait for **Local storage ready** near the top. Buttons and editable fields are disabled while storage opens or a local operation runs. Wait until they re-enable before entering the next correction; this prevents a pending transaction from overwriting an edit.
3. Use one browser tab for this workspace. File-origin storage permissions vary by browser; if storage cannot open, follow the troubleshooting section below.
4. Click **Load synthetic packet**, then **Extract source candidates**.

The navigation links jump between **Packet and source review**, **Tasking and records**, **Review and local routing**, **Reconnect simulator**, **Priority transfer simulator**, and **Evidence and named outputs**. Native controls support Tab navigation and keyboard activation, with visible focus styling.

## Walkthrough: correct, save, review and route the sample

This walkthrough starts from a newly loaded DEMO-7 workspace. Loading again prompts before replacing existing work; export anything you want to keep first.

1. Click **Load synthetic packet**. Leave **Connection simulation** on **Offline, local work only**.
2. In **1. Packet and source review**, click **Extract source candidates**. Expand the source evidence to read the embedded transcription and correction notes. The training image is a fictional illustration, not an uploaded scan being recognized.
3. Click **Validate packet** in **3. Review and local routing** to inspect the seeded findings. The initial duration is ambiguous, the quantity is negative, the subject is missing and the pump deadline conflicts. These prevent review and routing.
4. Make these four corrections:

   | Field | Enter or select | Source basis |
   | --- | --- | --- |
   | **Training duration (minutes)** | `45` | SCAN-TL-017, Note 1 |
   | **Requisition quantity** | `6` | REQ-SOURCE-042, correction note |
   | **Correspondence subject** | `October training completion` | COR-SOURCE-008, subject note |
   | **Inspect training pump, agreed due date** | **2026-10-16, MAIL-DEMO-01** | Review both MAIL-DEMO-01 and MAIL-DEMO-03 |

5. Click **Save packet**. Wait for **Saved locally**, then click **Validate packet**. Expect **Ready for review**.
6. Compare the sources and saved summaries. Expected values include:

   - `TL-DEMO-017 | Damage-control drill | 2026-10-13 | 45 minutes | 8 participants`
   - `REQ-DEMO-042 | DEMO-FILTER-01 | Training pump filter | 6 EA | DEMO-7 stores | routine`
   - `COR-DEMO-008 | DEMO-7 | Demo Administration Desk | October training completion | TL-DEMO-017`

7. Check **I reviewed the saved forms, actions and source evidence as Training Reviewer.** Click **Approve current revision**. Expect **Approved current revision by Training Reviewer**.
8. Click **Route locally**. Expect **Routed locally, pending sync**. This is a local queue entry, not an external submission.
9. In **Evidence and named outputs**, click **Completed training log**, **Supply requisition** and **Routine correspondence** to download the named outputs. The correspondence export includes a **Routing cover sheet**.
10. Reload the same file in the same browser profile to exercise restoration of saved work. The host verified reload in the save-recovery and transfer-resume journeys at both viewport sizes. The full forms-route journey failed before reload in the original run and awaits a rerun after repair.

Editing after approval makes the draft unsaved. Save, validate and approve again before routing changed content. Even saving unchanged content creates a new revision requiring review.

## Workflow: tasking, status drafts and records

1. Complete the corrected, saved and approved sample above. In **2. Tasking and records**, inspect **2 actions; 1 duplicate consolidated**. The duplicate pump action retains both email citations.
2. Confirm the actions:

   | Action | Owner | Due | Status |
   | --- | --- | --- | --- |
   | Inspect training pump | Maintenance Desk | 2026-10-16 | Open |
   | Reconcile drill attendance | Training Desk | 2026-10-17 | Open |

3. If you edit the action or owner fields, save, validate and approve the packet again. Changing an answer also changes its fixture accuracy score.
4. Click **Generate draft statuses**. The pump draft should read `Inspect training pump, Open; Maintenance Desk; due 2026-10-16; sources MAIL-DEMO-01 paragraph 1, MAIL-DEMO-03 paragraph 1`.
5. Leave **Fictional closure date** at `2026-10-18`, then click **File records using synthetic schedule**. Expect **Closed 2026-10-18; retain through 2027-10-18; no automatic disposal**. The fictional classes are TRAIN-DEMO, SUP-DEMO, CORR-DEMO and TASK-DEMO; they are not an official records schedule.
6. Download **Verified action list**, **Draft status updates** and **Records filing manifest** from **Evidence and named outputs**. Filing must run before exporting the manifest.

## Workflow: return work for correction

1. In **Review and local routing**, enter a reason in **Reason for returning to clerk**.
2. Click **Return for correction**. Content remains; approval is removed and the reason is recorded.
3. Correct the fields, click **Save packet**, then **Validate packet**. Review the saved content, check the confirmation and click **Approve current revision** before routing again.

## Workflow: reconnect and resolve a conflict

Use a saved, corrected packet for these scenarios. Start each diagnostic scenario from a fresh sample if you want to avoid combining histories.

1. Under **Diagnostic scenarios, synthetic only**, click **Stage concurrent delete** or **Stage concurrent edit to 50 minutes**.
2. Set **Connection simulation** to **Demo reconnect, two local replicas**. Click **Reconcile demo replicas**.
3. Inspect the local value and the competing demo value or deletion. Conflicts block routing and invalidate approval.
4. In **Chosen result**, select **Keep local packet** for the delete example. Alternatively choose **Custom training duration** and enter `45` in **Custom duration in minutes**.
5. If you edited fields after saving, use **Save packet** or **Discard unsaved changes** before resolving. Resolution blocks unfinished drafts so your corrections are retained. Enter a reason, such as `Retain reviewed training evidence`, in **Reason for this decision**. Click **Resolve conflict**. Expect **Resolved, both heads retained in history; new revision needs review**. The resolution creates the new revision itself; another Save packet click is unnecessary.
6. Click **Validate packet**, check the review confirmation, click **Approve current revision**, then **Route locally**.
7. Click **Acknowledge packet in demo replica**. Expect **Acknowledged by demo replica**. This requires the demo-reconnect selection and a current approved, locally routed revision.
8. Download **Conflict resolution report**, **Review / routing ledger** or **Audit export** for the decision and routing history.

**Use demo replica (may delete)** can select a deletion, leaving no committed packet to route. There is no undo or history-restore control; export evidence before experimenting and load a fresh sample to restart. Conflict messages are diagnostic displays and may remain visible after resolution; use the resolution status and current review status to follow progress.

Other diagnostic actions:

- **Compare delivery orders** compares a synthetic pair in opposite orders and reports whether both heads survive with identical canonical records.
- **Replay operations** replays immutable operations and reports added revisions and duplicate routing effects.
- **Stage missing history**, then **Reconcile demo replicas**, produces a missing-parent error without dropping queued work. Click **Request demo history**, then reconcile again. Restoring history can still expose a conflict; it is not automatic approval.
- **Pause simulation** blocks routing and acknowledgements while retaining work. **Resume simulation** resumes only the local simulation. Pauses do not stop the elapsed-time calculation.

## Workflow: resume a bounded transfer

This simulator calculates byte progress; it does not upload an image to a server.

1. Load a fresh synthetic packet and go to **Priority transfer simulator**. The image starts at **6144 / 12288 bytes acknowledged**; the critical record starts at **0 / 1024**.
2. Enter `0` in **Connection byte budget (whole bytes)** and click **Plan transfer**. Expect **0 bytes planned; pending work retained**.
3. Enter `4096` and click **Plan transfer**. Expect **Critical record: 1024 bytes; training image: 3072 bytes from offset 6144**.
4. Click **Send then interrupt before acknowledgement**. The image stays at **6144 / 12288** because sending alone does not advance acknowledged progress.
5. Click **Retry and acknowledge locally**. Expect the critical record at **1024 / 1024** and image at **9216 / 12288**.
6. Reload to exercise saved-offset restoration. Enter `3072`, click **Plan transfer**, then **Retry and acknowledge locally**. Expect **12288 / 12288** for the image.
7. Download **Transfer progress and receipts**.

## Workflow: inspect evaluation evidence

1. After correcting and reviewing the sample, open **Evidence and named outputs**.
2. Expect **Raw fixture accuracy: 16 / 20 (80%)**, **Reviewed fixture accuracy: 20 / 20 (100%)**, and **4 seeded issues caught; 4 corrected; 0 unresolved**. These compare the fictional fields to the embedded answer key; reviewed accuracy reflects current field values, not an independent expert assessment.
3. Download **Synthetic evaluation report** for the scores and timing. Timing uses the elapsed wall-clock interval from loading to the first approved local route, including pauses. The 1200-second manual baseline and 20 packets/week are assumptions; calculated savings may be negative.
4. Download **Sailor panel worksheet** or **Official rubric worksheet** for blank human-review worksheets. The app does not assign panel or official scores.
5. Download **One-page path to fleet** for the transition prerequisites, or read [path-to-fleet.md](path-to-fleet.md).

## Supported inputs and validation

The application has embedded sources: one training transcription and illustration, a requisition, correspondence, five fictional emails and one document. Extraction parses bounded labeled fields and task lines of the form `TASK | action | owner | YYYY-MM-DD`. There is no source upload, source-text editor, file importer or live email connection.

Editable forms use text fields, a correspondence body text area, a deadline select and a closure-date control. Validation includes:

- Positive whole numbers for training duration, participant count and requisition quantity. Blank, zero, negative and fractional values fail.
- Valid calendar dates in `YYYY-MM-DD` form for training, correspondence and tasks.
- A nonblank correspondence subject and body, sender, recipient, reference and attachment reference. Whitespace-only required fields fail.
- Required requisition fields and an action, owner and valid deadline for every task.
- Nonnegative whole-byte transfer budgets; negative and fractional budgets fail. A blank budget is currently treated as zero.

These are synthetic application rules. Reference and stock fields are not checked against authoritative catalogs or document stores, and an attachment reference does not upload or verify a file. Correcting a field does not itself make the saved revision valid: save and validate before review.

## Saving, exports, reset and recovery

IndexedDB is intended to retain drafts, committed revisions, approvals, routing entries, audit history, transfer plans and acknowledged offsets in the current browser profile. Draft edits are stored separately from committed content; **Saved locally** describes a deliberate committed save. Wait for local operations to complete before closing the page. Persistence is subject to browser policy, clearing data and eviction; it is not a backup or a guarantee across devices.

1. Use **Save packet** to commit the draft. A successful save removes prior approval.
2. Use **Discard unsaved changes** to return to the last committed packet, if one exists. It does not reset the entire workspace.
3. Use **Export draft backup** before leaving with unfinished work. It downloads `synthetic-draft-backup.json`; there is no import or restore control for that file.
4. Use **Load synthetic packet** to reset the workspace, including its history and transfer progress. Confirm replacement only after exporting anything you need. There is no separate Reset button or undo.
5. On a failed save, keep the page open, export the draft and click **Retry save**. Under diagnostics, **Fail next packet save** can exercise the simulated failure: change a field, save, observe **Save failed, draft retained; retry or export before leaving**, then retry.

Completed training, supply, correspondence, action, status and manifest exports require the current saved approval and no unsaved changes. Other reports can be downloaded separately. Downloads are UTF-8 plaintext `.txt` reports; **Audit export** and the draft backup are JSON. Exports carry synthetic labels and source information. They are not signed, encrypted or automatically restored into the app.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Controls stay disabled or storage is unavailable | Read the message near **Connection simulation**. Enable JavaScript and browser storage for local files, use an ordinary browser profile that allows IndexedDB, and reopen the file. There is no server fallback. |
| **Load synthetic packet first** or **Extract candidates first** | Load the sample, then extract before editing, saving or validating. |
| **Candidates already extracted** | Your corrections are retained. Continue editing; use the confirmed load action only if you want to replace the workspace. |
| Validation findings persist | Correct the referenced fields, save and validate again. Error messages link to relevant controls. |
| **Unsaved changes, save or discard before review** | Commit with **Save packet** or use **Discard unsaved changes**, then validate and review the resulting content. |
| **Blocked, current revision needs review** | Check the confirmation and approve the current saved revision. Earlier approvals do not cover new saves or resolutions. |
| **Simulation paused** | Click **Resume simulation** before routing or acknowledging. |
| Acknowledgement fails | Select demo reconnect, resolve conflicts, save/review any changed content and route the current revision locally first. |
| **Another tab changed this workspace** | Export your draft, close the other tab and reload before continuing. Do not expect tabs to merge automatically. |
| Download is blocked or nothing appears | Allow browser downloads, check the downloads folder and read the workspace message near the top for an export prerequisite error. |
| Work is missing after reopening | Use the same file location and browser profile. Moving the file, clearing browser data or storage eviction may make old data unavailable. There is no built-in restore from exports. |

## Known limitations and unavailable integrations

This is a local synthetic prototype. It does not implement general handwriting OCR, official DD/NAVPERS/correspondence compliance, actual records policy, authenticated users, signatures, device encryption, tamper-proof audit, real email routing, cloud synchronization or government-system integration. The local role label **Training Reviewer** is not authentication. Planned chunks and simulated receipts are not network transport or proof of an external durable receiver.

Government-device and low-code-platform compatibility, physical restart/eviction resilience, real browser storage failure handling, actual cross-tab concurrency, accessibility and usability require further validation. PouchDB/CouchDB is a researched future option, not an installed dependency. Long-running history management and operational retention are unresolved.

## Developer tests, separate from using the app

Node is required only for developer checks. Use Node 18 or later with `node:test`; no package installation is needed. From the application directory, run:

```sh
node --test core.test.cjs ui.test.cjs
```

The recorded implementation run passed **23 tests, 0 failures, 0 skipped**. The tests call the actual [core.cjs](core.cjs) functions and the actual marked inline core extracted from index.html in a Node VM, using shared behavioral vectors. Coverage includes fixture extraction/accuracy, validation boundaries, stale approvals, route replay, concurrent edits/deletes, resolution parents, malformed history, bounded transfers, duplicate acknowledgements, atomic rejection of invalid receipt batches, whitespace-only fields, preservation of unfinished conflict drafts and retention/arithmetic.

The two ui.test.cjs tests execute the actual inline UI script with a minimal DOM fixture and controlled persistence promises, covering transaction locks, subsequent corrections and error recovery. They do not establish real IndexedDB or browser behavior. The original host browser run passed 14 of 20 journey executions; forms-route, conflict-review and replay-converge failed at both sizes. After the bounded transaction-lock repair, the full browser rerun remains pending. Prototype checks are incomplete and requirementsMet is false. See [verification.md](verification.md) for verification notes and [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites and unresolved owners.
