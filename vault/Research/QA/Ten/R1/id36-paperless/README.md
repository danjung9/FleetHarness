# Paperless Underway user guide

## Purpose and intended users

Paperless Underway lets Sailors and fictional reviewers evaluate one synthetic training log: enter and validate fields, save locally, reconcile simulated peer changes, resolve conflicts, review the saved result, and queue simulated routing.

All peer changes, connections, reviewers and receipts are fictional and run on your device. No record is delivered externally. Use synthetic information only; do not enter personal or operational information.

## Prerequisites and quick start

1. Open `index.html` directly in a modern browser with JavaScript and IndexedDB enabled. No install, server, internet connection or Node runtime is required to use the app.
2. Use one browser tab. Wait for **Opening local records** to finish before starting.
3. The **Training log workspace** opens with **Your training log**, **Saved record**, **Competing changes**, **Review & simulated routing**, and **Simulated reconnect** sections. On a narrow screen, scroll to reach the later sections.
4. Start with **Load synthetic sample**, or enter fictional details yourself.

Direct-file IndexedDB support depends on the browser and its privacy policies. A storage error means the application cannot promise persistence. There is no fallback storage mode.

Use Tab to move between native controls; activate buttons with Enter or Space. Loading and save operations temporarily disable controls.

## Walkthrough: capture, review and simulated routing

For the exact results below, start with an empty workspace. If you have an existing log, export it before clearing storage as described under **Resetting data**.

1. Select **Load synthetic sample**. The form contains:

   | Field | Synthetic value |
   | --- | --- |
   | Activity | Damage control drill |
   | Training date | 2026-11-01 |
   | Duration (minutes) | 60 |

   This fills a draft; it does not save a revision or approve it.
2. Select **Save locally**. Wait for **Saved locally**. Under **Saved record**, the expected summary is:

   `Damage control drill | 2026-11-01 | 60 minutes | Unit Example`

3. Reload the page in the same browser and file location. When browser storage is available, the committed fields and history are restored. A freshly opened page displays **Offline, local work only**; this is an application mode label, not an internet connectivity test.
4. Select **Review saved revision**. Inspect the displayed summary, then check **I reviewed this saved revision**.
5. Select **Approve saved revision**. The expected status is **Approved by Reviewer Example**.
6. Select **Queue simulated routing**. The expected status is **Queued for simulated routing**.
7. Select **Simulate reconnect**. The expected result is **Simulated receipt recorded; no external delivery**. The reviewer note says **Reviewer Example approved the routed revision**.

Reconnect never approves a log. Changing the saved content requires another deliberate review before that new revision can be queued.

## Edit a log or discard a draft

1. Change **Activity**, **Training date**, or **Duration (minutes)**. The form shows **Unsaved changes**.
2. Select **Save locally** to validate and create a new saved revision. This clears the previous approval for the current log.
3. Alternatively, select **Discard changes** to remove the draft and reopen the committed content when the log has one current saved value. During a conflict, discard restores the local competing value so you can confirm a local or peer resolution. Discarding does not undo a saved revision, conflict decision or receipt.
4. Before routing changed content, repeat **Review saved revision**, the review checkbox, and **Approve saved revision**.

Selecting **Load synthetic sample** replaces the form fields with sample values. Save wanted edits before loading the sample. The sample button does not reset history.

## Resolve competing edits or a deletion

Run this example from a fresh workspace so the peer fixture branches from the expected sample:

1. Load the synthetic sample and select **Save locally**.
2. Change **Activity** to `Pump drill` and select **Save locally** again.
3. Under **Simulated reconnect**, open **Simulation tools** if collapsed.
4. Select **Concurrent peer edit**. **Competing changes** shows the local Pump drill and peer First aid drill with their date, duration and unit. Alternatively, **Concurrent peer deletion** shows **Deleted by Peer Example** beside the local edit.
5. Under **Value to keep**, choose one of:
   - **local** to retain Pump drill.
   - **peer** to retain the peer change or deletion.
   - **custom** to enter the result in the existing training-log fields. Custom content must pass the normal validation rules.
6. Select **Confirm resolution**. For the local choice, the expected result is **Conflict resolved: Pump drill**, with **Reviewer Example chose the local value; both heads retained as parents**.
7. Review and approve the resulting saved log before queuing it. A deleted result cannot be reviewed or routed as a valid log.

Ordinary saving and routing are blocked while a conflict remains. Make the choice before editing fields if keeping local or peer content. If a separate unsaved draft blocks confirmation, preserve wanted text first; a custom resolution uses the entered fields. Conflicting revisions remain in history after resolution.

Peer fixtures always branch from the first saved revision. They do not represent another device or a live connection. Use one peer scenario per fresh workspace for a simple two-value demonstration.

## Try replay and delivery-order checks

### Replay a peer update

1. In an empty workspace, load and save the sample without making another local edit.
2. Select **Apply / replay peer update** under **Simulation tools**. The saved summary becomes `First aid drill | 2026-11-01 | 60 minutes | Unit Example`, with **2 revisions** and **1 peer change applied**.
3. Select the same button again. The counts stay unchanged and the status becomes **Already present; no changes**. The same immutable operation is replayed without another domain history entry.

### Compare delivery orders

1. Select **Compare delivery orders**. No saved log is required.
2. Both summaries should read **Pump drill + First aid drill, 2 unresolved heads**.
3. The comparison should report **Identical canonical state in both delivery orders**.

The comparison uses separate synthetic records and leaves your log and draft untouched.

## Supported inputs and validation

| Input | Accepted format and rule |
| --- | --- |
| Activity | Nonblank text, at most 120 characters; surrounding whitespace is trimmed when saved. |
| Training date | A real Gregorian date in `YYYY-MM-DD` form. The native date picker may display a localized format. The date is not compared with today's date. |
| Duration (minutes) | A whole number from 1 through 1440. Blank, zero, negative and fractional values are rejected. |
| Unit and source | Fixed to Unit Example and synthetic-log-v1; there are no editable fields for them. |

For a recovery example, load the sample, enter `0` for **Duration (minutes)**, and select **Save locally**. Expect **Duration must be a whole number from 1 to 1440 minutes.** and **Not saved**, with the activity retained. Change the duration to `90` and save; review then shows `Damage control drill | 2026-11-01 | 90 minutes | Unit Example`.

There is no file upload or import. Export is UTF-8 JSON. Free-text validation cannot prevent someone from entering personal information; users must observe the synthetic-only boundary.

## Save, persistence, export and recovery

### Local storage

A successful **Save locally** commits revisions, pending operations, approval state and history together in IndexedDB before acknowledging the save. Draft edits are also written locally as you type, but **Unsaved changes** means those fields are not a committed, reviewable revision.

Successful local writes are intended to survive ordinary reloads in the same browser storage context. This is not a guarantee against browser eviction, clearing storage, private-session closure, device loss or device restart. Moving the file, using another browser/profile, or changing browser policies may change storage availability. Storage is unencrypted. Ordinary review and simulation actions preserve unfinished fields.

### Export history

1. Under **Saved record**, expand **Action history & export**.
2. Inspect the sequence of local actions and fictional actors.
3. Select **Export synthetic history** to download `synthetic-training-history.json`.

The JSON includes the local workspace, history, revision references, decisions and source warning. Export is an inspectable snapshot; the application has no import/restore control. After reload, inspect history/export for prior queue and receipt actions: the immediate routing and connection messages are not fully restored from storage.

### Resetting data

There is no in-app reset button. To start over:

1. Export wanted history first and close other app tabs.
2. Use your browser's site-storage or developer storage controls to delete this app's IndexedDB database, `paperless-underway-v1`. Procedures vary by browser; avoid clearing unrelated sites.
3. Reload `index.html` to open an empty workspace.

Clearing storage permanently removes the local log, drafts and history. The exported file cannot be imported back through this app.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| **Local storage unavailable** | Keep the page open. Enable browser storage, check privacy/quota restrictions, close competing tabs, then select **Retry local storage**. Retained in-memory fields are not proof of a successful write. |
| **Review the saved revision before routing.** | Select **Review saved revision**, inspect it, check the confirmation, and select **Approve saved revision**. |
| **Save or discard changes before routing.** | Explicitly save or discard the draft. A newly saved revision needs another approval. |
| **Resolve the conflict before routing.** | Inspect both competing values and use **Value to keep** and **Confirm resolution**. |
| Approval asks to open and confirm the saved revision | Open review again and check **I reviewed this saved revision** before approving. |
| Peer tool asks to save the sample | Load and save a synthetic log before applying a peer fixture. |
| No valid log after choosing peer deletion | The deletion was retained. Enter and save a new valid synthetic log if continuing. |
| Export does not download | Check the browser's download permissions. There is no server-side copy. |
| History limit or malformed-history error | Preserve/export current information. There is no history-fetch, pruning or repair interface; developer investigation is required. |

## Known limitations and unavailable integrations

This prototype supports one purpose-made synthetic log, not an official Navy form or multi-record system. It does not implement handwriting/OCR extraction, requisitions, correspondence packages, tasking extraction, attachments, priority byte transfers, actual cloud synchronization, authenticated users or recipients, government endpoints, or external routing.

Fictional actor names are not authentication. Local history is not tamper-resistant or governed by an approved retention policy. Plain IndexedDB does not establish device encryption, secure backups or operational durability. Concurrent tabs, automatic updates, migrations and rollback are unsupported. The reconciler bounds combined input history to 5,000 revisions and each revision to 100 parents; it does not prune history automatically.

Official form accuracy, time savings, reduced rework, Sailor-panel acceptance and government-device compatibility have not been established. Fifteen source criteria remain deferred. See [path-to-fleet.md](path-to-fleet.md) for owners and field-validation prerequisites.

## Developer tests and verification

Using the application requires only a browser. Running developer tests separately requires Node with `node:test`, `node:assert`, and `structuredClone`; Node 20 or newer is recommended. No npm install or third-party packages are needed.

From the delivered project directory, run:

```sh
node --test *.test.cjs
```

`core.test.cjs` exercises `core.cjs` and executes the actual inline domain core from `index.html` in a Node VM. It checks validation, replay, delivery order, edit/delete conflicts, resolution parents, malformed history, review gates, and queue/receipt idempotence. `storage.test.cjs` exercises the actual transaction adapter with injected completion, abort and denial outcomes. It does not run a real browser IndexedDB instance.

The repair verification run passed 22 Node tests with no skips. `ui.test.cjs` executes the actual inline UI handlers using a minimal DOM and transaction adapter, covering discard-and-resolve recovery and preservation of drafts during peer merges. It does not render a browser. The supplied host run passed 8 of 12 browser cases; both conflict journeys failed at option selection on desktop and narrow viewports. The option labels now match the frozen selection values, with explanatory text beside the control. A host rerun is pending; Node results do not establish repaired browser passage. See [verification.md](verification.md) for verification notes, failure history and outstanding checks.
