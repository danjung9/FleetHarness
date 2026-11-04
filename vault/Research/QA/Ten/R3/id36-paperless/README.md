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

All six remain unverified. Browser prototype checks cannot establish all source requirements met. No real-format or operational validation is claimed.

# Paperless Underway user guide

## What it does

Paperless Underway is a synthetic demonstration for expeditionary/underway Sailors and command staff who capture forms and review tasking without connectivity. It combines a training log, supply requisition, correspondence and a week of tasking into six named outputs. You correct candidates, save a revision, review it and route it to local recipient inboxes.

A separate reconnect simulator demonstrates competing edits, a competing deletion, reviewed reconciliation and acknowledged byte transfers. Everything runs on one device. **No real recipient, cloud service or government system receives anything.** Use synthetic data only; all examples are **synthetic, not validated against the real format**.

## Prerequisites and quick start

1. Open **index.html** directly in a current browser. No installation, server, internet connection or Node runtime is required to use the app.
2. Allow JavaScript and IndexedDB storage. Wait for **Opening local workspace…** to disappear and the buttons to become available.
3. Check that the header says **Offline, local routing only**. This describes the application's local workflow; it is not a network-connectivity detector.
4. Start with **Load synthetic packet** in **1. Capture & correct**.

Keep the same file location, browser profile and origin when returning. Local-file IndexedDB support depends on the browser; actual browser persistence and desktop/narrow behavior have not yet been verified. Private browsing, cleared storage or browser eviction can remove data. Export important demonstration work before closing or clearing storage.

The top links move between **1. Capture & correct**, **2. Review & route locally**, **3. Reconnect simulator** and **4. Evidence & handoff**. Use Tab to reach native controls, Enter/Space to activate buttons and the keyboard to select options. Keyboard and layout usability still await browser/manual review.

## Walkthrough: capture, correct, save and route

Use a fresh workspace for these literal results. If a workspace already exists, continue reviewing it or follow the reset guidance below; loading the sample does not replace an extracted draft.

1. Select **Load synthetic packet**, then **Extract candidates**. Expect **27/28 fields correct; 1 ambiguous owner needs review**. The included training image uses fixture-assisted extraction, not general OCR.
2. Read the image and expand **Read source text, citations & schedule**. Sources show IDs, demo-v1 revisions, synthetic timestamps, excerpts and locations. **Raw candidates and corrections** shows the original candidates separately from edits.
3. Read the clarification: **Supply Reviewer A owns Count filters.** In **Task 2 owner**, select **Supply Reviewer A**. The source's raw owner was ambiguous between Supply and Admin; it is intentionally not resolved automatically.
4. Select **Save packet** and wait for **Saved locally**. Then select **Validate** in **2. Review & route locally**. Expect **0 errors; ready for human review**.
5. Read the six saved output sections. Editing the candidate fields does not update these committed outputs until you save again.
6. Check **I reviewed the current saved forms, actions, status updates and filing manifest.** Select **Approve reviewed revision**, then **Route locally**.
7. Expect **Routed locally: 3 forms and 5 actions; remote delivery queued** and **Training: 1 | Supply: 1 | Admin: 1 | Actions: 5**. These are local inbox receipts. Repeating routing for the same revision does not add another receipt for that revision.
8. Select **Export packet** in **4. Evidence & handoff** to download the saved outputs and their source evidence.

Expected sample outputs:

| Output | Expected content |
| --- | --- |
| Training log | Damage-control drill, 2026-11-02, 60 minutes, Training Reviewer A |
| Supply requisition document | DEMO-0001, Filter cartridge, 4 EA, Supply Reviewer A |
| Routine correspondence package | Admin Reviewer A → Training Reviewer A; Weekly readiness summary; Submit the synthetic readiness summary for review. |
| Verified action list | The five actions listed below |
| Draft status updates | Draft: 0/5 actions complete; 5 awaiting role confirmation. |
| Records filing manifest | Eight entries: TRAIN-01 → TRAIN-DEMO, REQ-01 → SUPPLY-DEMO, CORR-01 → ADMIN-DEMO, TASK-01 to 05 → TASK-DEMO |

The five actions are:

| Action | Owner | Due |
| --- | --- | --- |
| Inspect locker | Training Reviewer A | 2026-11-02 |
| Count filters | Supply Reviewer A | 2026-11-03 |
| Draft readiness note | Admin Reviewer A | 2026-11-04 |
| Test radio | Training Reviewer A | 2026-11-05 |
| File weekly summary | Admin Reviewer A | 2026-11-06 |

The Thursday reminder is deduplicated by task ID, retaining another citation for Inspect locker. Correcting the ambiguous owner yields **Reviewed accuracy: 28/28; raw extraction: 27/28** against the synthetic planning key. Editing values away from that key can lower this score even when the edited values pass validation.

## Edit and recover from validation errors

1. Change a candidate field in **1. Capture & correct**. **Unsaved changes** means the draft differs from the saved revision, even though the app attempts to persist draft edits locally.
2. Choose **Save packet** to commit the draft or **Discard unsaved changes** to restore the last committed packet. Discard has no effect before the first save.
3. After saving, select **Validate** again. Validation checks saved content; it does not commit draft edits. Saving creates a new revision and invalidates prior approval.
4. Review the saved outputs, check the review confirmation again and select **Approve reviewed revision** before **Route locally**.

To reproduce the five-error recovery exercise:

1. After extraction, open **Fault simulation & recovery** in **3. Reconnect simulator**, select **Seed errors**, then **Save packet** and **Validate**.
2. Expect **5 errors: training date; requisition quantity; correspondence subject; task owner; filing class**. Routing is blocked.
3. Correct the fields as follows:

| Field | Corrected sample value |
| --- | --- |
| Training date (YYYY-MM-DD) | 2026-11-02 |
| Requisition quantity | 4 |
| Correspondence subject | Weekly readiness summary |
| Task 2 owner | Supply Reviewer A |
| Training filing class | TRAIN-DEMO |

4. Save and validate again, then review, approve and route. The sample reports zero remaining errors. The seeded-error count demonstrates this fixed exercise, not measured fleet error reduction.

## Resolve conflicts and simulate reconnect delivery

Begin with the saved, approved and locally routed five-action sample. Save or discard unfinished edits before simulating or resolving conflicts; simulated delivery also requires a clean reviewed revision.

1. In **3. Reconnect simulator**, select **Simulate concurrent edits & delete**, then **Reconnect (simulated)**.
2. Inspect **Replica A: Ready for review | Replica B: Needs supply check** and **Replica A: Inspect locker | Replica B: Deleted**. Remote routing pauses for review.
3. In **Reviewed correspondence subject**, choose **Write a reviewed subject**. Enter **Ready after supply check** in **Custom reviewed subject**.
4. In **Reviewed Inspect locker task**, choose **Keep Inspect locker**, then select **Resolve conflicts**. Expect **Resolved 2 conflicts; approval required** and **Training Reviewer A chose: Ready after supply check; kept Inspect locker**.
5. Resolution creates a saved revision referencing the reviewed heads. Return to **2. Review & route locally**, inspect its outputs, check the review confirmation, approve and route again.
6. Select **Sync records (simulated)**. Expect **Simulated replicas equal; 0 conflicts; 1 remote packet receipt**.
7. Select **Replay sync**. Expect **Replay unchanged: 1 remote packet receipt; no duplicate revisions**.

The subject can also be chosen directly from either replica. **Confirm deletion** is available for the task, but the reproducible walkthrough keeps it; deleted-task controls are disabled, and editing remaining tasks retains their task identities. Node regression coverage exercises the field reader; the browser deletion workflow remains unverified. Finish your conflict choices before reloading: unconfirmed subject/task choices are not stored as a reviewed decision. The confirmed decision is persisted with the workspace.

For missing-history recovery, select **Inject missing history** once under **Fault simulation & recovery**, then **Reconnect (simulated)**. The message requests missing parent rev-missing and retains the local queue. Select **Restore missing history**, then reconnect again. Expect **History restored; queued work retained**. These buttons inject a demonstration fault; they do not retrieve history from a server.

## Explore merge order and resumable transfers

These secondary tools are available without loading a packet.

1. Select **Open sync lab** in **3. Reconnect simulator**.
2. Select **Compare merge orders**. Expect **A into B equals B into A; 2 unresolved heads retained**. **Replay operations** reports **Replay unchanged: 3 revisions; 2 heads**.
3. Select **Load transfer fixture**. It starts a critical item at 0/1000 acknowledged bytes and a synthetic photo at 5000/10000.
4. Set **Link budget (bytes)** to **0** and select **Send chunk (simulated)**. Neither offset advances.
5. Set the budget to **2000**, check **Interrupt after send, before acknowledgement (simulation)** and send again. Offsets remain at 0 and 5000.
6. Uncheck that option and send again. Expect **2000 bytes acknowledged; critical 1000/1000; photo 6000/10000**. Critical bytes receive priority.
7. Reload at the same origin to check retained progress. Enter **4000** again in **Link budget (bytes)** and send. Expect photo 10000/10000 and **0 pending items**.

Only acknowledged bytes advance stored offsets. Budget and interruption controls themselves return to their initial values after reload. **Load transfer fixture** resets this transfer example to its starting offsets; export a recovery copy first if you want to retain the current example. This lab plans and simulates bytes; it does not upload a real photo.

## Supported inputs and validation

The UI loads only the bundled **demo-v1** synthetic packet. It has editable extracted fields, but no document upload, camera capture, paste/import or recovery-file import.

Text sources use an invented `TYPE|key=value|...` grammar. The core supports TRAIN, REQ, CORR, TASK and SCHEDULE, with type-specific required keys. For example, the included supply source is:

```text
REQ|id=REQ-01|number=DEMO-0001|item=Filter cartridge|quantity=4|unit=EA|destination=Supply Reviewer A
```

This describes fixture syntax, not a UI input box. Unknown types/keys, missing or duplicate keys, malformed delimiters and conflicting duplicate IDs are rejected by the parser. Image recognition is restricted to the included training fixture.

Saved packet validation requires:

- Actual calendar dates in YYYY-MM-DD format for the training date and task due dates.
- Positive whole-number training minutes and requisition quantity, without surrounding spaces or fractional values.
- Nonblank training event, requisition number/item, correspondence subject/body and task actions.
- Requisition unit **EA** and training filing class **TRAIN-DEMO**.
- Recognized synthetic roles for reviewers, destinations, correspondence sender/recipient and task owners: **Training Reviewer A**, **Supply Reviewer A** or **Admin Reviewer A**. Text role fields must match exactly; task owners use selects.

The filing schedule is invented. Its retention text is **Demo review only; no disposition authorized**. Validation does not establish official form compliance or records authority.

## Save, export, reload and reset

The app uses browser-local IndexedDB for sources, draft, committed revisions, approvals, audit, local receipts, replica histories, queue and acknowledged transfer offsets. A successful save waits for a storage transaction before showing **Saved locally**. Draft edits are stored separately and remain subject to the explicit Save/Discard boundary.

Reopening at the same origin is intended to restore that workspace, including saved conflict decisions. This behavior still needs the host's real browser verification; Node tests do not prove reload persistence. Unconfirmed review checkboxes, conflict-choice controls, link-budget settings and the interruption checkbox are not restored as committed decisions.

Download controls:

| Button | Filename | Contents |
| --- | --- | --- |
| Export packet | paperless-packet.json | Six committed outputs, sources, raw candidates, correction records and saved revision; requires a saved packet |
| Export audit | paperless-audit.json | Sources, audit entries, immutable history and local receipts |
| Export recovery copy | paperless-recovery.json | Current workspace, including draft and queued state |
| Export path to fleet | path-to-fleet.txt | Proposed sponsors, transition milestones and integration prerequisites |

**Export packet** uses committed content even when the editable draft has unsaved changes. Use **Export recovery copy** to retain that draft. Downloads are for inspection and retention; no automatic restore/import is implemented.

There is **no in-app reset or delete-workspace control**. To start from empty, export first, then use your browser's site-data/storage controls to remove this application's IndexedDB data and reopen the file. Browser steps and local-file storage isolation vary; avoid clearing unrelated sites. Clearing data permanently removes this local workspace, and this app cannot import the exports to reconstruct it.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| IndexedDB unavailable; buttons remain disabled | Enable JavaScript and persistent local storage, use a browser/profile that supports IndexedDB for local files and reopen. No saved state is claimed when storage cannot open. |
| A workspace already exists | Continue with its draft. Export before intentionally clearing browser storage for a fresh run. |
| Load the synthetic packet first / Extract a packet first | Use **Load synthetic packet**, then **Extract candidates**, before saving. |
| Save failed; draft retained | For the injected fault, retry **Save packet**: **Fail next save (simulation)** affects one save. For a real storage failure, export a recovery copy before closing and check storage permissions/capacity. |
| Draft persistence failed / Local operation failed | Keep the tab open, export recovery data and address storage availability before relying on reload. |
| Blocked: save or discard unsaved changes before routing | Choose **Save packet** or **Discard unsaved changes** first. |
| Blocked: fix validation errors before review | Correct the named fields, save and validate the saved revision again. |
| Blocked: review the current saved revision first | Inspect the saved outputs, check the confirmation and approve that revision. A previous approval cannot authorize a newly saved or resolved revision. |
| Resolve, approve and route the current revision first | Complete conflict review where applicable, then approve and route locally before syncing. |
| Missing parent rev-missing | In the intentional fault demonstration, use **Restore missing history**, then **Reconnect (simulated)**. The original queue remains retained. |
| Transfer does not advance | Load the fixture, use a positive integer budget and clear the interruption checkbox. Zero budget and interrupted acknowledgements deliberately preserve offsets. |
| Download does not appear | Check browser download permissions and its download list. Committed packet export also requires a saved packet. |

Status summaries can describe an earlier validation or action. After editing, use **Save packet** and **Validate** again and inspect current outputs before approving.

## Evidence, limitations and unavailable integrations

Select **Inspect evidence** in **4. Evidence & handoff** and expand **Detailed audit and retained history** to inspect recorded actions. The **Unscored Sailor panel worksheet, clarity, recovery, tablet fit** accepts local notes; it does not constitute panel endorsement or official scoring.

Observed packet elapsed time measures sample loading through first successful local routing on this device. The displayed **(20 - 8) × 10 / 60 = 2.00 hours** is a separate hypothetical estimate, not measured fleet savings. A Fleet SME baseline, operational error/rework data, Sailor panel judgment and official judging remain unavailable.

Other limits include:

- One fixed synthetic packet, fixture-assisted canvas image recognition and pending task statuses; no general OCR, real scans, arbitrary mail ingestion or action-completion workflow.
- No official DD 1348-1A, NAVPERS or SECNAV format validation, authoritative records schedule or disposition approval.
- One-device replica and recipient simulations; no authenticated transport, real receiver, cloud/government endpoint or low-code adapter.
- Synthetic actor labels rather than authenticated identity; no CAC integration or tamper-proof audit guarantee.
- Unencrypted IndexedDB, no validated device/key design, no guaranteed storage retention, backup restore, automatic updates or government-device compatibility evidence.
- No browser, physical-device restart, keyboard/usability or operational validation claimed from the Node suite.

See [verification.md](verification.md) for executed checks and pending verification, and [path-to-fleet.md](path-to-fleet.md) for sponsor/owner decisions and field-validation prerequisites. Prototype testing does not grant operational authorization.

## Developer tests, Node required separately

Using the application requires only the browser. Running developer tests requires a Node runtime with the built-in `node:test` runner; Node 18+ is recommended. No npm install or package dependency is needed.

From the delivered folder, run:

```sh
node --test core.test.cjs
```

The verification run passed **24 tests, with 0 failures and 0 skipped**, after one bounded repair. The pre-repair added regressions failed three checks; details are preserved in verification.md. Tests call actual functions in **core.cjs** and the actual inline core extracted from **index.html** through `node:vm`. They cover synthetic extraction and outputs, malformed input, five-error validation, revision review/routing gates, history rejection, concurrent edits/deletes, merge order, replay and acknowledgement boundaries. Additional regressions execute the actual UI field reader after a task deletion and conflict handlers with unfinished drafts using synthetic control/state adapters. A separate check parses both browser scripts.

The UI runs the inline core without importing core.cjs. Developers changing domain logic must keep both copies consistent and rerun the tests. Tests use only Node built-ins and create no mutable test-data files. They do not exercise real DOM interactions or IndexedDB. Desktop/narrow browser journeys, reload persistence and human usability review remain separate pending gates documented in verification.md.
