# CASREP Command user guide

## What the application does

CASREP Command is a synthetic training prototype for report originators and reviewers: Sailor/LPO, Division Officer, Department Head, CHENG, XO and CO. It supports one local INITIAL report, a return-for-revision loop, ordered review, retained revision history, competing-amendment resolution and a downloadable simulated release.

Use invented equipment and casualty descriptions only. Persona selection simulates roles; it does not authenticate anyone. **Simulate release** records a local decision and sends no message. The application does not validate NWP formatting.

## Prerequisites and quick start

1. Open **index.html** directly in a modern browser with JavaScript enabled.
2. Allow local browser storage and downloads. No installation, server, internet connection, account or Node runtime is required to use the app.
3. On a fresh workspace, **Report workspace** starts empty with **Originator (Sailor/LPO)** selected. Enter synthetic text to begin; there is no sample-loader button or precommitted report.

Use the same browser profile and file location to return to your saved workspace. Local-file storage behavior varies by browser. The application contains its CSS and JavaScript inline and has no network dependencies.

## Create, save and submit a report

1. In **Report workspace**, leave **Acting persona · simulation** set to **Originator (Sailor/LPO)**.
2. Enter an **Equipment** name and **Casualty description**. **Demonstration category (optional; not NWP categories)** may be left blank. **Report type** is fixed to INITIAL.
3. Click **Save draft**. The status becomes **Saved revision 1** after storage succeeds.
4. Click **Submit for review**. In **Routing & decisions**, expect **Awaiting Division Officer, revision 1**.

Typing preserves an unfinished editor buffer when storage is available, but it does not create a committed revision. **Unsaved changes, save or discard before review.** means you must click **Save draft** or **Discard changes** before submitting or deciding. Discard restores the current committed content. Saving unchanged content adds no revision. Changing persona retains editor text.

## Review, comment, return and release

1. Read **Current holder** in **Routing & decisions**, then choose that role in **Acting persona · simulation**. Choosing a role alone does not advance the report.
2. Read the committed report in **Report workspace**. To record a standalone comment, enter text in **Review comment / return reason**, then click **Add comment**. This retains the current holder. Originator may also comment on its saved draft.
3. To request changes, enter a nonempty reason and click **Return for revision**. The report returns to Originator and the reason remains in history.
4. As **Originator (Sailor/LPO)**, correct the report, click **Save draft**, then **Submit for review**. Every content revision clears current approvals and restarts the route at Division Officer; old decisions remain in the audit.
5. For approval, choose **Division Officer** and click **Approve and forward**. Repeat in order as **Department Head**, **CHENG**, then **XO**. A comment is optional for approval.
6. Choose **CO** and click **Simulate release**. This succeeds only after fresh approvals for the current revision from all four preceding reviewers. CO does not use **Approve and forward**.
7. Click **Export synthetic report** to download the released snapshot and history. Released content cannot be saved over.

Originator can revise an unreleased report while it is under review, which also resets all current approvals. Only the current holder may comment or decide. Conflicts must be resolved before review continues.

## Reproducible synthetic walkthrough

Begin with an empty workspace. These invented values match the supplied application tests; there is no import step.

1. Enter **Training pump** in **Equipment** and **Pump unavailable** in **Casualty description**. Click **Save draft**. Expect **Saved revision 1**.
2. Click **Submit for review**, choose **Division Officer**, enter **Clarify repair status** in **Review comment / return reason**, and click **Return for revision**. Expect **Returned to Originator, revision 1**.
3. Choose **Originator (Sailor/LPO)**. Change **Casualty description** to **Pump unavailable; replacement requested**. Click **Save draft**. Expect **Saved revision 2** and **No current approvals, revision 2**.
4. Click **Submit for review**. Choose and approve in order: **Division Officer**, **Department Head**, **CHENG**, **XO**, clicking **Approve and forward** for each.
5. Choose **CO** and click **Simulate release**. Expect **Simulated release, revision 2**. Reload; the released state should remain when local storage is available.
6. Under **History & competing amendments**, **Original casualty** shows **Pump unavailable** and **First return reason** shows **Clarify repair status**. Expand **Full revisions and decision audit** for revision snapshots, parent links and decisions.
7. Click **Export synthetic report**. The suggested filename is `synthetic-casrep.txt`. Its contents include **SYNTHETIC, NOT AN OFFICIAL MESSAGE**, **Pump unavailable; replacement requested**, the original revision, the return reason and reviewer decisions.

These are expected outcomes, not a claim that browser checks have been executed. A separate [walkthrough script](demo-walkthrough.md) is also supplied.

## Resolve competing amendments

Use a separate empty training workspace for this example, since the previous walkthrough leaves a released report. A separate browser profile can isolate its local storage.

1. As Originator, save **Training pump** / **Pump unavailable** as revision 1. Save or discard any unfinished edits.
2. Under **History & competing amendments**, click **Review competing amendments** to open **Synthetic competing-edit simulation**.
3. Enter **Pump isolated locally** in **Amendment A** and **Replacement pump requested** in **Amendment B**. Click **Stage competing amendments**.
4. Expect **Conflict: 2 amendments require review**. Read both competing texts and **Both amendments start from revision 1**. The staged texts survive reload; the panel reopens automatically.
5. Enter **Pump isolated locally; replacement pump requested** in **Chosen resolution · review or combine both texts**. Click **Resolve amendments** as Originator.
6. Expect **Resolved: both amendments retained** and **Resolution includes both amendment parents**. Starting from revision 1 produces revision 4 with no current approvals. Both source texts remain in history, and the resolved description appears in the editor after reload.
7. Submit the resolved draft for a fresh review chain when ready.

Resolution requires nonempty text; it can combine or choose content after reviewing both sources. This is a local competing-edit simulation, not multi-device synchronization.

## Supported input and validation

The app accepts plain text through its fields. There is no file import, attachment upload or validated CASREP message parser.

| Input | Rules |
| --- | --- |
| Equipment | Required after trimming; up to 200 characters |
| Casualty description | Required after trimming; up to 2000 characters |
| Demonstration category | Optional; up to 200 characters; no official category set |
| Amendment A, Amendment B and chosen resolution | Required casualty text when staging/resolving; up to 2000 characters |
| Review comment / return reason | Nonempty for **Add comment** and **Return for revision**; optional for approval/release |
| Report type | INITIAL only |

Saving trims leading/trailing whitespace from report fields. Missing or invalid fields leave your entered text available for correction. Markup-like input is handled as text. Native labeled controls are provided with visible keyboard focus; use Tab to move between them and normal keyboard activation for buttons.

## Persistence, export, reset and recovery

The app uses an unencrypted localStorage record named `casrep-command-v1`. Successful saves and workflow transitions are committed before confirmation. Committed report text, revisions, audit, current decisions, staged conflicts and the unfinished equipment/casualty/category buffer survive reload when browser storage succeeds.

The active persona resets to Originator on reload. Unsubmitted **Review comment / return reason**, **Amendment A**, **Amendment B** and **Chosen resolution** entry text is not restored. Once a comment or amendment has been committed, its record remains in history.

1. For an official-looking training artifact only after simulated release, click **Export synthetic report**. It downloads `synthetic-casrep.txt` with the released snapshot, all revisions and audit. It is explicitly unofficial and not NWP validated.
2. Before release, or to retain unfinished editor content, click **Download working copy**. It downloads `synthetic-working-copy.txt` containing the current draft, revision history and audit. Its header says **WORKING COPY, NOT RELEASED**, even if downloaded after a simulated release.
3. Keep a downloaded copy before clearing browser data. Neither download is an importable backup, and the app cannot restore a workspace from it.
4. There is no in-app reset or new-report button. To start over in the same storage context, deliberately remove this app's `casrep-command-v1` localStorage entry using browser developer tools, then reload. Clearing broader browser site data may remove other data too. Alternatively, use a separate browser profile for another training workspace.

Moving/renaming the HTML file, switching profiles or private browsing may expose different storage or discard it. Avoid simultaneous editing in multiple tabs. Concurrent writes are rejected by generation checks rather than automatically merged.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| **Enter an equipment name.** / **Enter a casualty description.** | Supply nonblank text and click **Save draft** again. Other entered fields remain available. |
| **Save or discard your draft changes before review.** | Click **Save draft** to commit a revision, or **Discard changes** to restore committed text, then retry. |
| **Only the current holder can take this action.** | Read **Current holder**, select that persona and ensure the report is at the appropriate stage. |
| **Enter a return reason.** / **Enter a comment.** | Fill **Review comment / return reason** before returning or adding a comment. |
| **Release denied: current revision requires the complete review chain.** | Submit the saved revision and complete Division Officer, Department Head, CHENG and XO approvals before CO release. |
| **Resolve competing amendments before review.** | Review both staged texts and commit a chosen resolution as Originator. |
| **Export synthetic report** is disabled | Complete simulated CO release, or use **Download working copy** for an unfinished report. |
| **Released content is immutable; create a linked draft.** | The UI has no linked-draft creation control. Discard editor changes and export the release; use a separate training workspace for another report. |
| **Local save failed**, quota or storage-access errors | Keep the tab open and download a working copy of currently available work. Check browser storage permissions/capacity. Do not assume failed changes will survive reload. |
| **Another workspace changed this record.** | Download local work before reloading to load the other saved state. There is no automatic cross-tab reconciliation. |
| **Stored data is damaged or unsupported.** | Existing stored bytes are left untouched and writes are blocked. Preserve the raw storage entry using browser tools before any deliberate reset. The app cannot repair or import it; a working-copy download cannot recover unreadable stored history. |
| A download is missing | Check the browser's download permissions and download location. |

## Known limitations and integration boundaries

This prototype supports one local INITIAL report and a fixed notional route. It does not implement approved NWP formatting/categories, UPDATE/CORRECT/CASCOR semantics, operational cancellation, expiry or supersession. A linked-draft boundary exists in the tested core but has no user-facing creation workflow.

There is no real identity provider, authenticated access control, Navy messaging transport, Microsoft 365 connector, classified-source integration, central backup, synchronization, reimport, automatic migration or update/rollback control. Persona names are not authentication. Browser users can modify local storage and audit records. The deterministic FNV-1a digest is a content identifier, not a certified cryptographic signature. Storage is not encrypted by this application.

UC8-1 and DELIVERABLE8-1 remain deferred as complete source obligations. Human acceptance, authoritative domain review and operational validation remain pending. See [fielding-brief.md](fielding-brief.md) and [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites, unresolved ownership and integration work.

## Developer tests and verification notes

**Node is required only for developer tests, not for using the app.** Use a modern Node runtime with built-in `node:test` support, such as Node 18 or later. No package installation is needed.

1. Open a terminal in the folder containing `index.html` and `core.test.cjs`.
2. Run:

   ```sh
   node --test core.test.cjs
   ```

3. Inspect the test runner's pass/fail summary. Verification on 2026-11-04 with Node v26.0.0 recorded 15 passing tests, zero failures and zero skips.

`core.test.cjs` extracts and executes the actual marked core in `index.html`, which the browser handlers also use. Tests cover review/return/revision/export, invalid transitions, approval invalidation, all review actions with unsaved content, every route role, input boundaries, retained conflicts, merge errors and replay, reload persistence, storage failures, stale generations and immutable released content. Two tests execute the delivered inline UI handlers with a minimal document/storage adapter to check validation, draft preservation and storage-failure recovery; that adapter does not establish real browser behavior. Mutable filesystem test data uses OS temporary directories and is cleaned up.

See [build-checks.md](build-checks.md) and [test-matrix.md](test-matrix.md) for existing evidence. [verification.md](verification.md) maps current test evidence and unverified work to every criterion. Host browser journeys, downloads, desktop/narrow layout, keyboard behavior and visual checks remain unverified by browser execution. Node results do not establish browser usability, NWP compliance or operational readiness.
