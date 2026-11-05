# Transition workspace user guide

## Purpose and intended users

Transition workspace helps Sailor tool builders and transition coordinators prepare a fictional transition record. Describe a tool, document proposed fixes for eight known barriers, save a revision, review it and download a draft package or reusable fielding playbook.

Use synthetic information only. Saving a proposal does not verify evidence, resolve barriers or authorize fielding. This application does not package or run the absent owner-supplied tool.

## Prerequisites and quick start

Use a modern browser with JavaScript enabled. Local persistence uses browser localStorage; file downloads use Blob URLs. No installation, server, account, network connection or package dependencies are required. **Node is needed only for developer tests.**

1. Open [index.html](index.html) directly in your browser.
2. Read the synthetic-only notice and the storage message beneath it.
3. Click **Load synthetic example** to begin with a complete fictional draft, or enter your own fictional record in **1. Describe a fictional tool**.

If the browser reports session-only mode, export your saved work before closing or reloading. A saved revision in that mode exists in memory only.

## Walkthrough: save and export the synthetic example

For revision 1, begin in a browser context with no previously saved record for this file. Existing work is restored automatically; do not clear it just to repeat this walkthrough.

1. Click **Load synthetic example**. If work already exists, choose **Replace draft** to replace unfinished edits, or **Cancel** to retain them. The saved revision remains until you save again.
2. Check these sample values:

   | Field | Expected sample value |
   | --- | --- |
   | Fictional tool name | Synthetic Beach Log |
   | Tool version | 0.1 |
   | Primary task | Record fictional beach observations. |
   | Owner baseline evidence | Missing, actual owner application not supplied |
   | Other proposal fields | Unknown, not supplied; external owner review required. |

3. In **2. Plan a fix for each barrier**, leave the sample fixes unchanged. There are eight barriers; each has owner **Unassigned** and status **Unresolved**. The first fix is **Obtain source, version, license and baseline tests from the tool owner.**
4. In **3. Save and review**, click **Save record**. For a fresh record, the confirmation is **Saved revision 1: Synthetic Beach Log 0.1**, and the draft status becomes **Saved**. With existing saved work, the revision increases from its previous number.
5. Click **Review saved record**. The **Saved record review** section shows **Synthetic Beach Log 0.1**, **Synthetic draft, not authorized for fielding**, and **8 unresolved barriers**. It also shows the saved proposals and unverified evidence.
6. Click **Download draft package**. The browser requests `transition-package.md`, containing the saved identity, revision, proposals, evidence provenance, all eight barriers and a path-to-fleet summary.
7. Click **Download reusable playbook**. The browser requests `fielding-playbook.md`. It contains nine generic steps, beginning with **1. Obtain the owner application, version, license and baseline tests.**, plus the instruction **Do not install, publish or submit for authorization without the appropriate external approvals.**
8. Both download controls pause for a quarter second after each request to avoid duplicate requests and browser rate limiting. Check your browser's downloads. Open the Markdown files in a text editor or Markdown viewer. A “Download requested” message means the browser was asked to download; it does not confirm that a file was written.
9. Click **Back to edit** to return to the editor. Where storage is available, reloading restores both the draft and saved revision; click **Review saved record** again to reopen the review.

## Create or edit a fictional record

1. In **1. Describe a fictional tool**, enter **Fictional tool name**, **Tool version** and **Primary task**.
2. Choose **Owner baseline evidence**: **Missing, actual owner application not supplied** or **Synthetic reference only, unverified**.
3. Complete **Device proposal**, **Hosting proposal**, **Offline install proposal**, **Security evidence needed**, **Human approval and audit proposal**, **Update and rollback proposal**, and **Sustainment proposal**. Explicitly describe unknowns when facts are absent; entering text does not establish that a proposal is approved.
4. Optionally expand **Evidence references · unverified**. The original source reference is displayed above editable fields named **sourceId**, **revision**, **capturedOn**, **excerpt**, **pointer** and **purpose**. These accept text; dates, links and evidence authenticity are not verified. There are no controls to add or remove references or mark one accepted.
5. In **2. Plan a fix for each barrier**, enter a **Proposed fix** for every row. Optionally edit **Proposed owner (fictional; blank means Unassigned)**.
6. Click **Save record**, then **Review saved record**. Review **Saved evidence provenance**, the remaining barriers and the path summary before downloading.

The eight fixed barriers cover the missing owner application, unknown target device, unapproved hosting/signing, unknown authorization requirements, unassigned sustainment owner, absent calculation rules/answer key, undefined operational approval/audit, and unspecified disconnected transfer. Rows cannot be added, removed or marked resolved.

## Save revisions and recover unfinished edits

Edits are automatically kept as an unfinished draft when local storage works. **Save record** validates the draft, trims required text and commits a separate snapshot. Each successful save increments the revision, even if you save the same content again. The app retains the current saved snapshot, not a browsable revision history.

To resolve edits made after saving:

1. Change a field. The draft status becomes **Unsaved changes**; an open review is hidden.
2. If you click **Review saved record**, the app reports **Unsaved changes. Save or discard changes before review or export.**
3. Choose **Save record** to commit the edits, or **Discard changes** to replace the entire draft with the saved snapshot. Discard acts immediately; it has no extra confirmation.
4. Click **Review saved record** again. Downloads use the saved content only.

If nothing has been saved, **Discard changes** reports **No saved revision to restore. Save the current record first.** Review reports **Save a record before review or export.**

### Storage and reloads

The app stores one record workspace in versioned localStorage under `appyard.transition.v1`. Both unfinished edits and the saved snapshot survive reloads where that browser permits storage for the local file. Storage is browser/file-origin-specific, is not encrypted by this application and does not sync. Moving the HTML file, private browsing, browser policies, quota limits or clearing browser data can affect availability.

Read the storage message even when a saved-revision confirmation appears. If storage fails, the app can still save a snapshot in the current session and export it, but cannot promise recovery after reload. Markdown exports are handoff copies; there is no import or restore-from-export function.

### Reset unreadable storage

There is no general **Reset** or **Clear all** control. **Load synthetic example** replaces the draft after confirmation; it does not reset the saved revision counter.

If the app detects unreadable stored data (including missing or changed fixed barrier titles):

1. It retains that data without overwriting it and enters session-only mode.
2. Continue with fictional session work if desired, and export any useful saved content before closing.
3. To abandon the unreadable record, click **Reset stored record** and confirm **Delete the unreadable stored record? This cannot be undone.** Cancel to retain it.
4. After a successful reset, the app stores the current session workspace. It does not recover the unreadable record or automatically blank your current fields.

## Supported inputs and validation

Input is through text fields, textareas and the baseline select. There is no CSV, JSON, audio or file import.

| Input | Validation on Save record |
| --- | --- |
| Fictional tool name | Required, 1 to 120 characters after trimming |
| Tool version | Required, 1 to 40 characters after trimming; no semantic-version syntax required |
| Primary task and all seven proposal/note fields | Each required, 1 to 1000 characters after trimming |
| Each Proposed fix | Required, 1 to 1000 characters after trimming |
| Each proposed owner | Optional, at most 120 characters after trimming; blank becomes Unassigned |
| Evidence reference fields | Text; no date-format, length or authenticity validation is applied by the save validator |

Whitespace-only required values are rejected. The app displays the first validation error and focuses its field, preserving other entries. Correct it and click **Save record** again. All barriers remain **Unresolved**, and evidence remains unverified.

Downloads are UTF-8 Markdown. User text is escaped for HTML and selected Markdown characters, so raw downloaded text can contain entities or backslashes. No user-supplied HTML is executed in the application's review.

Native controls support Tab navigation and keyboard button activation, with visible focus styling. Validation focuses the first invalid field; review and return actions focus their headings. The layout includes stacking for narrow widths. The host previously passed both recovery journeys at desktop and narrow widths without horizontal overflow; the repaired export journey and assistive-technology checks remain pending.

## Troubleshooting

| Symptom or message | What to do |
| --- | --- |
| **Enter a fictional tool name.** | Fill Fictional tool name with non-whitespace text, then save again. Other fields remain intact. |
| **Enter a proposed fix for Owner application unavailable.** | Fill the Proposed fix in that barrier row, then save again. The same rule applies to all eight rows. |
| A field exceeds its character limit | Shorten it to the limit shown in the error and retry Save record. |
| **Unsaved changes. Save or discard changes before review or export.** | Commit edits with Save record, or deliberately restore the snapshot with Discard changes. |
| Storage unavailable/session-only warning | Keep the tab open and export a saved revision before closing. Browser settings may prevent local-file persistence. |
| Stored data is unreadable | Follow the conditional Reset stored record workflow above; unreadable content is not silently deleted. |
| No download appears | Check the browser's download permissions and downloads list, then retry. An application-reported download failure leaves the saved revision intact. |
| Sample button asks to replace work | Choose Replace draft only if you intend to replace unfinished edits; otherwise choose Cancel. |

## Known limitations and external prerequisites

This is a single-record synthetic planner. It has no actual owner-application baseline, MSI or GO/NO-GO calculations, AI/speech entry, operational identity or approval, tamper-evident audit history, disconnected-network transport, reconnect synchronization, approved hosting, signing or government-device installation. Proposed owners are fictional text, not accepted assignments. References are attribution, not verified security evidence.

Only the barrier-documentation and reusable-playbook slice is implemented. Fourteen full source criteria remain deferred. Packaging does not grant authorization to operate or install on government devices. Target platforms, applicable security checklist, independent SME answer key and accepting operational/sustainment owners remain external prerequisites. See [path-to-fleet.md](path-to-fleet.md) for field-validation gates and accountable roles still to be assigned.

Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%. No score is calculated or self-awarded.

## Developer tests and verification notes

Using the application requires only the browser. Running the developer tests separately requires **Node.js 18 or later**; no package installation is needed. From the folder containing the source, run:

```sh
node --test transition-core.test.cjs transition-download.test.cjs
```

The tests exercise the actual [transition-core.cjs](transition-core.cjs) and the core extracted from the `transition-core` inline script in [index.html](index.html). They cover validation boundaries, sample barriers, snapshot isolation, dirty-review guards, storage decoding/failure, document formatting, reusable steps and behavioral parity. They use Node built-ins and no mutable test-data files. The additional transition-download.test.cjs executes the delivered UI download handler with controlled browser APIs, exercising repeated cross-control requests, document bytes, cleanup, guard rejection and download-error retry. Real browser download events remain outside these Node checks.

For maintainers, keep the standalone core and embedded core consistent when editing. The HTML runs independently of the `.cjs` file. Core validation returns `{valid, errors: [{field, message}]}`; storage and document functions are also exposed for testing. Frozen plans, requirements and `.fleet/` inputs must remain unchanged.

The latest local repair run passed 22 tests with zero failures or skips; stdout is in verification-repair-node.txt. The supplied host report passed 19 Node tests and 4 of 6 browser runs, with the primary export journey failing at its eleventh rapid download at both widths. The repair spaces download requests by at least 250 ms. A host rerun of both gates is required before prototype review. Fourteen source requirements remain deferred and requirementsMet remains false. See [verification.md](verification.md) for evidence and limits. No third-party libraries were reused; license and reuse rights for the absent owner application remain unknown.
