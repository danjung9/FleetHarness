# Primary deferrals

None for the requested synthetic prototype. Real CASREP-format conformance, authenticated identities, official release, approved device installation and operational benefit remain unverified. Owner approval is required before delivery or deployment.

# CASREP Command user guide

CASREP Command is a local training workspace for an originating Sailor/LPO and five reviewing roles: Division Officer, Department Head, Engineer Officer/CHENG, XO and CO. It supports drafting, validation, comments, return for revision, immutable message versions, revision-bound approvals, explicit mock release and message/audit export.

**Synthetic, not validated against the real CASREP format.** No source data was attached. The prepared samples in [data/synthetic-data.json](data/synthetic-data.json) describe invented people, FS Lantern, a chilled-water pump casualty and fictional rules. The application embeds their input messages; it computes validation and review results. Do not enter real or classified information. Selecting an actor simulates a role; it does not authenticate a person.

## Start the application

The computer hosting the application needs **Node.js 22.19 or newer** and the complete application folder. Users need a modern browser with JavaScript and localStorage enabled. A browser-only user does not need Node on their own device, but this prototype is intended for a browser on the same computer as the local service.

No dependency installation is needed: the service uses Node built-ins. There are no model settings, model downloads, API keys or third-party packages to configure. From the application folder, run:

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

On Windows PowerShell:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
node server.mjs
```

Open **http://127.0.0.1:3000/**. Keep the terminal running; stop with **Ctrl+C**. Do not open public/index.html through file://: message validation and saves require the local service. If port 3000 is busy, choose another PORT and use that port in the browser URL. Keep the same browser origin when returning to an existing workspace.

Once Node and the application folder are present, normal use requires no internet connection. There is no remote synchronization, automatic update service or disconnected multi-device transport.

While the service acknowledges a load, validation, save, decision or export request, all form controls are temporarily disabled. Wait for the acknowledgement before editing the next message or return reason. Failed requests re-enable the form and retain your draft for an explicit retry.

## Find your way around

**Training workspace** contains sample setup and failure demonstrations. **Review route** lists the six stages, and **Act as (simulation)** selects the acting role. The saved-state strip shows **Status**, **Current holder**, **Revision**, **Revisions** and **Valid approvals**.

Use **Write the message** to edit and validate. Use **Review current revision** for decisions. **Message preview** shows a validated preview or committed message; validation alone does not save. **Versions and comments** retains saved snapshots and successful decisions. Expand **Rejected-attempt monitor and approval digests** for failed attempts and revision-bound approval metadata.

Buttons disable while a request is pending. Wait for the acknowledgement. **Unsaved changes** means the editor differs from the committed message; **Saved locally** follows a successful save. Save or deliberately discard changes before switching actors, reviewing or exporting.

## Walkthrough: draft, return, revise and mock-release

This reproduces the prepared INITIAL scenario for `SYN-CR-001`. Begin in an empty workspace. If you have existing work, export it first and follow the reset instructions below.

1. Select **Start INITIAL**. The **Message · fictional KEY=value grammar** editor fills with the fictional chilled-water pump casualty. Keep **Originator (Sailor/LPO)** selected in **Act as (simulation)**.
2. Select **Validate preview**, then **Save draft**. Expect status **DRAFT**, revision **REV-001-A** and **1** revision. Select **Submit**; the holder becomes **Division Officer**.
3. Select **Division Officer**. In **Comment or return reason**, enter `Identify spare seal location and transfer estimate.` Select **Add comment**.
4. Enter `Add spare seal location and transfer estimate.` in the same field and select **Return for revision**. Expect **RETURNED** and holder **Originator (Sailor/LPO)**. The feedback remains in **Versions and comments**.
5. Select **Originator (Sailor/LPO)**. Append the following text, including its leading space, to the end of the existing NARRATIVE line, before its newline:

   ```text
    Spare seal at fictional depot; transfer expected 2026-10-13T10:00:00Z.
   ```

6. Select **Save draft**, then **Submit**. Expect revision **REV-001-B**, **2** retained revisions and holder **Division Officer**.
7. Select each current holder in order: **Division Officer**, **Department Head**, **Engineer Officer/CHENG**, then **XO**. Each selects **Approve and forward**. Do not skip a stage. The next holder is displayed after each decision.
8. Select **CO**, then **CO approve**. Status becomes **APPROVED**. Select **Mock release** separately.
9. Expect status **RELEASED**, holder **NONE**, revision **REV-001-B**, **2** revisions and **5** valid approvals. The message retains the added spare-location sentence. Select **Export message and audit** to download `SYN-CR-001.synthetic.json`.
10. Reload the page using your browser. The saved release and approval count should remain. Inspect either snapshot through **Inspect immutable message** in **Versions and comments**.

The supplied scenario uses disclosed synthetic timestamps and matching default decision text; each decision still needs a separate action and permission check. A comment does not count as an approval. Saving revised content invalidates earlier approvals and restarts review. Released content cannot be edited through a save; use a linked report for later changes. Mock release sends nothing, and the export is not an official message release.

## Preview the four supplied message types

1. Save or **Discard changes** if an ordinary edit is unfinished.
2. Choose **INITIAL**, **UPDATE**, **CORRECT** or **CASCOR** in **Synthetic message type**.
3. Select **Load message**, then **Validate preview**. **Validated type** shows the selected type, and **Message preview** shows its canonical text. This does not save or route the sample.
4. Repeat for another type. Loaded sample previews may be replaced by another sample without saving. If you manually edit a sample, save or discard the edit before replacing it.

The prepared chain is INITIAL `SYN-CR-001` → UPDATE `SYN-CR-002` → CORRECT `SYN-CR-003` → CASCOR `SYN-CR-004`. The CASCOR sample uses `REPAIR=COMPLETE` and `STATUS=RESTORED`. Parser preview checks message content without requiring a released predecessor.

## Create and review a linked report

1. Complete mock release of the predecessor. As **Originator (Sailor/LPO)**, load its next supplied message through **Synthetic message type** and **Load message**.
2. Expand **Linked reports and lifecycle notices** and select **Create linked draft from editor**.
3. Select **Save draft** and **Submit**, then obtain the same five downstream reviews and CO mock release. Linked reports inherit no approvals.
4. Repeat for UPDATE, CORRECT and CASCOR in sequence. A linked draft requires a released predecessor, a new report ID, the correct RELATED ID and matching family, equipment and JSN. CASCOR closes the family only after its own mock release.

The lifecycle view lists retained linked report IDs; the interface does not provide a full report-list browser or a historical-report restore control. The current export contains the current report's revisions and audit, not a complete backup of the linked family.

For a local lifecycle notice:

1. Select **CO** and enter a reason in **Comment or return reason**.
2. Expand **Linked reports and lifecycle notices**, choose **supersession**, **cancellation** or **expiry** in **Local lifecycle notice**, and select **Record lifecycle notice**.
3. Inspect the retained notice below the controls. It does not delete or change the released snapshot, send a Navy message or enforce an operational expiry deadline.

## Resolve the prepared branch conflict

Scenario setup replaces the current demonstration workspace. Export useful work and finish or discard edits first.

1. Select **Load conflict scenario**, then **Compare branches** in **Branch comparison**.
2. Inspect field **repair**: base `2026-10-13T18:00:00Z`, left proposal `2026-10-14T12:00:00Z`, right proposal `2026-10-15T12:00:00Z`.
3. Select **Originator (Sailor/LPO)**. In **Reviewed repair estimate**, select **Use left proposal**, **Use right proposal** or **Enter another value**. For the last option, fill **Custom UTC repair estimate**.
4. Select **Resolve reviewed branches**. Choosing the left proposal produces revision **REV-001-E**, **5** retained revisions, **0** valid approvals, status **DRAFT** and resolved repair `2026-10-14T12:00:00Z`.
5. Select **Submit**. Holder becomes **Division Officer**, and all five downstream reviews must restart.

Both competing branch snapshots remain, and the resolution references both parents. This scenario demonstrates local conflict review; it is not an authenticated reconnect or replication adapter.

## Demonstrate failed save/export and recover

1. Export useful work, finish or discard edits, then select **Load first approval scenario**. Expect revision **REV-001-B**, status **IN_REVIEW**, holder **Department Head** and **1** valid approval.
2. As **Originator (Sailor/LPO)**, change the message's REPAIR line to `REPAIR=2026-10-14T12:00:00Z`.
3. In **Local fault demonstration**, select **Fail save**, then **Save draft**. Expect `save: simulated storage failure`, saved revision **REV-001-B** and **Unsaved changes**. The successful audit is unchanged.
4. Select **Fail export**, then **Export message and audit**. Expect `export: simulated export failure` and no download. The unsaved message remains in the editor.
5. Select **None**, then **Save draft**. Expect revision **REV-001-C**, status **DRAFT** and **0** valid approvals.
6. Select **Export message and audit** again. The committed draft can now be downloaded; its status remains DRAFT. Reload to inspect the saved revision.

The fault selector injects labeled local demonstration failures. Ordinary disk or network failures also stop an action and retain the editable buffer; they are not evidence that a production storage design has been validated.

## Input format and validation

The editor accepts UTF-8 text using the fictional grammar below. Each field occupies one line, in this order, followed by `END` and a final LF newline:

```text
MARKING, REPORT, FAMILY, TYPE, RELATED, UNIT, CATEGORY, EQUIPMENT,
CASUALTY, IMPACT, OCCURRED, REPAIR, STATUS, JSN, NARRATIVE
```

The line syntax is `KEY=value`; the list above is an order reference, not pasteable message text. Start with a loaded sample. All fifteen values are required. Unknown, duplicate or out-of-order keys, CR line endings, a missing END or missing terminal newline cause a grammar error. Missing known fields produce required-field errors. Values are preserved literally; subsequent equals signs are part of the value, and narrative markup or instructions are inert text.

- MARKING must exactly equal `Synthetic, not validated against the real CASREP format.`
- REPORT and FAMILY use `SYN-CR-NNN` and `SYN-FAM-NNN` with three digits.
- TYPE is INITIAL, UPDATE, CORRECT or CASCOR; CATEGORY is 2, 3 or 4. These categories have no asserted operational meaning.
- INITIAL uses RELATED=NONE. Recognized linked types require another report ID. Runtime linked creation separately checks the predecessor.
- OCCURRED is a real UTC timestamp in `YYYY-MM-DDTHH:mm:ssZ` format. REPAIR has the same format at or after OCCURRED; CASCOR instead requires COMPLETE.
- STATUS is DEGRADED or UNAVAILABLE; CASCOR requires RESTORED.

Unsupported types produce the reportType error without inferring a linked-type rule. Independent errors appear in canonical field order. Validation does not establish NWP compliance or detect real classified content. See [data/README.md](data/README.md) for fixture provenance and full assumptions. There is no message-file upload, CSV import or JSON-backup import control.

## Save, export, reset and preserve work

**Save draft** creates an immutable committed revision. The service serializes writes, checks the submitted base revision, fsyncs a temporary snapshot and renames it before acknowledging success. A stale edit is rejected rather than silently overwriting newer content.

**Export message and audit** downloads a JSON package with synthetic provenance, route/rule versions, committed message, current status, immutable revisions, successful events and valid approval IDs. Draft and released packages use the same filename pattern; check the status. Digest metadata and rejected attempts are visible in the monitor but are not included in this fixture-shaped export. Lifecycle notices and archived linked reports also require journal backup for preservation.

To reset the current demonstration:

1. Export anything you want to keep. **Discard changes** only discards unsaved editor text; it does not reset saved history.
2. Select **Start INITIAL**. If revisions exist, choose **Replace workspace** to replace them, or **Keep workspace** to cancel. Unsaved edits must first be saved or discarded.
3. Save the loaded INITIAL message when ready.

**Load first approval scenario** and **Load conflict scenario** directly replace the current scenario after the dirty-buffer check; they do not have the same separate reset confirmation. They are sample setup actions, not import or recovery from a backup.

Saved journals live in `path.join(os.tmpdir(), 'casrep-command-local')`, outside application source files. They survive ordinary service restarts, but OS temporary-directory cleanup can remove them. With the service stopped, separately back up this directory for longer retention. There is no automatic backup, retention policy or restore UI.

Browser localStorage keeps the workspace ID, message buffer and acting role. Unsaved message text survives an ordinary reload; the comment/reason field, fault selector and sample-preview state are not restored as durable user drafts. Tabs in the same browser origin share a workspace ID. Another browser profile or origin starts a separate namespace. Clearing browser storage loses the browser's link to its namespace without deleting server journals. Changing the service port changes the browser origin. Both localStorage and journal files are unencrypted.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Service unavailable | Keep the Node process running and use its assigned `127.0.0.1` URL. Check HOST/PORT and avoid file://. |
| `message: expected canonical KEY=value lines and END` | Compare with a loaded sample. Preserve field order, LF line endings, END and the terminal newline. |
| A required field or timestamp error | Correct that field without deleting the rest of the draft, then validate or save again. |
| Unsaved changes blocks an action | Select **Save draft** or **Discard changes** deliberately before switching/reviewing/exporting. |
| Role or current-holder error | Read **Current holder** and choose that role. Only Originator saves/submits; CO approves and mock-releases separately. |
| Release needs approvals | Submit the current saved revision and obtain all five reviewer approvals. Old-revision approvals do not count. |
| `revision: saved content changed; review both versions` | Copy your unsaved text somewhere safe, reload to inspect the committed version, compare deliberately and save a new revision. There is no automatic arbitrary stale-edit merge screen. |
| Storage/export failure | Clear a selected demonstration fault with **None**. For real storage failures, check disk space/access and retry. No failed export produces a partial download. |
| Broken journal | Preserve the file and seek developer assistance or restore a known backup with the service stopped. The service does not silently reset malformed data. |

**Show blocked-work notice** identifies the current holder locally. It does not send email or notify another user. **Open live walkthrough** and **Open fielding brief** reveal the built-in guides.

## Known limitations and fielding prerequisites

There is no identity provider, authenticated access control, Navy messaging channel, Microsoft 365 connector, classified-system connection, encryption/key management, managed installer, distributed writer support or real operational expiry policy. Local role checks protect the synthetic workflow but do not prove anyone's identity. The marking validator is not a classification boundary.

NWP 1-03.1 and OPNAVINST 4790.4 mappings require independent validation. No readiness or time benefit has been measured. Operational sponsor and sustainment owner are unresolved. Local exports do not establish release authority, installation approval or operational readiness. See [path-to-fleet.md](path-to-fleet.md) for field-validation owners, dependencies and success measures.

## Developer tests and verification

Using the browser and running tests are separate activities. Tests require the complete source folder and **Node.js 22.19+**, even if you ordinarily use a browser connected to someone else's local service. No npm installation is required.

```sh
node --test domain.test.mjs persistence.test.mjs validation-repair.test.mjs verifier-boundaries.test.mjs
```

The tests exercise actual `compute.mjs`, `casrep.mjs`, `store.mjs` and HTTP service behavior. Mutable test data uses OS temporary storage. The HTTP test starts/stops child Node services with ephemeral ports. The latest executed application suite passed **16 tests**. The host core report passed format, review-route and conflict evaluations at score **1**, across **16 synthetic cases**. These checks establish their bounded cases, not operational validity.

Desktop/narrow exploratory interaction and visual evidence, the bounded repair history and outstanding independent acceptance are described in [verification.md](verification.md). The verification session ran all 16 tests in the workspace and a clean temporary runtime, completed desktop/narrow initial visual reviews and fresh rechecks, observed local return/review/mock release and failed-save recovery, and opened both guides. These exploratory observations remain distinct from the host’s pending independent browser acceptance journeys.

The application reuses node-service foundation 1.0.0 and its offline DAG module; no new third-party dependency was added. [FOUNDATION.md](FOUNDATION.md) and foundation-lock.json record foundation version/hash provenance. Additional reviewer materials: [walkthrough.md](walkthrough.md) and [fielding-brief.md](fielding-brief.md).

Verification repair 2: `node --test domain.test.mjs persistence.test.mjs validation-repair.test.mjs verifier-boundaries.test.mjs ui-acknowledgement.test.mjs` passes 17 tests, including a pending-request UI regression. The latest independent report predates this UI repair: 16 Node tests and 3 capabilities passed, 9/12 browser journeys passed. Its three browser failures require a host rerun; no complete acceptance claim is made.
