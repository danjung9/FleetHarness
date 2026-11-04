# Berth notebook user guide

## What it does

Berth notebook helps bridge-team and qualified mooring reviewers assemble **synthetic** berth scenarios, arrange an illustrative ship layout, inspect saved inputs and record acknowledgement of a specific saved revision.

It is an intake and review prototype. Engineering assessment and operational approval are always unavailable. Use synthetic data only; a recorded review does not verify qualifications or authorize a mooring evolution.

## Prerequisites and quick start

1. Open [index.html](index.html) directly in a current browser with JavaScript enabled. No installation, server, account or network connection is required.
2. Start in **Assemble synthetic intake**. A new workspace shows **No saved scenario**.
3. Select **Load synthetic example** to populate an editable draft, or enter your own synthetic inputs using the workflow below.

Allow browser local storage if you want work to survive reloads. Storage policies for local files vary by browser. **Node is not needed to use the app**; it is needed only for developer tests.

## Create and save a scenario

1. Enter a **Scenario name**.
2. Select **Demo craft A** in **Craft**, **Demo pier 1** in **Pier**, and **Demo line A** in **Line type**. These are the only supported catalog entries.
3. Optionally enter synthetic source notes in **Raw observations**. These notes are retained as text; the app does not extract numbers from them.
4. Enter **Wind speed**, **Gust speed** and **Current speed**, with each adjacent unit set to **m/s**. Select **ebb** or **flood** in **Current phase**. Direction convention remains unconfirmed.
5. In **Illustrative draft layout**, drag the ship or enter **Ship horizontal position (%)** and **Ship vertical position (%)**. Coordinates describe drawing placement only.
6. Select **Save scenario**. Correct any errors and save again. A successful save shows **Saved: [scenario name]** in **Inspect committed inputs**, with the saved environment and layout.

Draft edits and saved content are separate. **Unsaved changes** means the saved review panel still describes the previous saved content. Saving changed content increments the revision and clears its review. Saving unchanged content retains its revision and recorded review.

## Inspect and record synthetic review

1. In **Inspect committed inputs**, check the saved scenario, environment, raw observations and **Saved illustrative layout**.
2. Read **Engineering assessment unavailable**, the unknown uncertainty explanation and the qualified engineering review requirement.
3. Under **Acknowledge synthetic review**, check the statement beginning **I have inspected these saved synthetic inputs and missing authority**.
4. Select **Record synthetic review**. The status identifies the saved revision and states **No operational approval.**

Review requires a complete saved scenario with no unsaved changes. The acknowledgement checkbox itself is not a recorded review; select the button to record it.

## Reproducible synthetic walkthrough

For the exact revision numbers below, start in a new workspace. To clear existing work deliberately, follow the reset instructions first.

1. Select **Load synthetic example**. It supplies:

   | Field | Sample value |
   | --- | --- |
   | Scenario name | Synthetic berth Alpha |
   | Craft / Pier / Line type | Demo craft A / Demo pier 1 / Demo line A |
   | Wind speed | 12 m/s |
   | Gust speed | 15 m/s |
   | Current speed / Current phase | 0.5 m/s / ebb |
   | Ship horizontal / vertical position | 50% / 50% |

   **Raw observations** contains: `Synthetic observations only. Wind 12 m/s; gust 15 m/s; current 0.5 m/s, ebb. Direction convention unconfirmed.`

2. Select **Save scenario** without changing the sample. Expect **Saved: Synthetic berth Alpha**, plus:

   ```text
   Synthetic berth Alpha | Demo craft A | Demo pier 1 | Demo line A
   Wind 12 m/s; gust 15 m/s; current 0.5 m/s; ebb. Direction convention unconfirmed.
   ```

3. Check the acknowledgement and select **Record synthetic review**. Expect **Synthetic review recorded for saved revision 1. No operational approval.**
4. Reload the same file in the same browser. When storage is available, the saved scenario and recorded review remain. The acknowledgement checkbox need not remain checked for the recorded review to persist.
5. Select **Export saved summary**. The downloaded `synthetic-scenario.txt` starts with **SYNTHETIC, UNVALIDATED, NOT FOR OPERATIONAL USE** and includes the saved inputs, layout coordinates, authority gaps and review scope.

## Revise, discard or replace a draft

1. After reviewing the sample, change **Wind speed** to `18`. Expect **Unsaved changes** and **Review blocked: save or discard unsaved changes.**
2. To abandon the edit, select **Discard changes**. Wind returns to `12` and the revision 1 review is restored. Before any first save, this button returns the draft to its initial empty state.
3. To keep the edit instead, select **Save scenario**. Starting from revision 1, expect **Saved revision 2 requires synthetic review.** Check the acknowledgement again and select **Record synthetic review**.
4. To replace an existing draft with the sample, select **Load synthetic example**, then **Replace draft with example**. Select **Keep current draft** to cancel. Replacement affects the draft; the saved scenario changes only after **Save scenario**.

Discard and replacement remove draft edits. Export captures only saved content, so save any valid draft you want to retain before exporting.

## Supported inputs and validation

| Input | Supported format or constraint |
| --- | --- |
| Scenario name | Required; 1 to 120 characters after trimming |
| Craft, Pier, Line type | The three named synthetic catalog entries only |
| Raw observations | Optional plain text, up to 2000 characters |
| Wind, Gust, Current speed | Required finite non-negative decimal text, such as `0`, `.5`, `12.5` or `12.`; surrounding whitespace is accepted |
| Speed units | `m/s` only; `knots (unsupported)` is rejected without conversion |
| Current phase | `ebb` or `flood`; neither establishes a direction vector |
| Ship positions | Decimal values from 0 through 100 inclusive; drawing percentages only |

Blank speeds, negative values, scientific notation such as `1e3`, comma decimals such as `0,5`, malformed values, `NaN`, `Infinity` and numeric overflow are rejected. Enter numbers separately from their unit selectors. Zero is valid and distinct from missing data.

These are structural checks, not physical operating limits. No gust-to-wind relationship, craft capability or safe environmental range is validated. Raw numeric strings remain alongside confirmed numbers in saved data and exports.

## Persistence, export and reset

Edits are automatically retained as a draft in versioned browser localStorage when available. **Save scenario** separately commits validated content; **Record synthetic review** records its acknowledgement. Draft, saved content and recorded review survive ordinary reloads when local storage works. The app holds one current scenario, not a revision-history browser.

Storage is local to the browser, unauthenticated and unencrypted. There is no synchronization. Moving the HTML file, changing browsers or clearing browser data may lose access to stored work.

To export:

1. Save a valid scenario.
2. Select **Export saved summary** in the review panel.
3. Keep `synthetic-scenario.txt` as a readable snapshot. Unsaved draft edits are excluded, even if export is available while the draft is dirty.

There is no import or restore-from-export feature; the text file is not a restorable workspace backup.

To reset:

1. Export saved content you want to keep.
2. Expand **Local storage & recovery**.
3. Select **Reset local workspace**, then **Delete local work**. This removes the draft, saved scenario and recorded review from the app's local storage when permitted.
4. Select **Keep work** instead to cancel.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Save reports a missing or invalid speed | Follow the error link, enter a decimal number and select **Save scenario** again. For example, clearing wind produces **Enter wind speed as a finite non-negative number.** Entering `0` corrects the missing-value error. Other draft values remain intact. |
| Unsupported unit error | Supply an explicitly provided m/s value and select **m/s**. The app cannot convert knots. |
| Review controls are disabled | Save a complete scenario, resolve edits with **Save scenario** or **Discard changes**, then check the acknowledgement. |
| Export is disabled | Save a valid scenario first. Review acknowledgement is not required for export. |
| Local storage warning | Work is held in memory only. Save valid content and export before closing. A visible “Saved” status identifies the in-memory committed snapshot; it does not override the storage warning. |
| Invalid local data on opening | The app rejects corrupt data instead of restoring a possibly false review. Use deliberate reset if you accept deleting the stored workspace. Rejected data is not recovered by reset. |
| Reset reports that browser data could not be removed | Only in-memory work was reset; persisted data may remain. Resolve browser storage permissions or clear this app's browser data through browser settings if appropriate. |
| Dragging is inconvenient | Use **Ship horizontal position (%)** and **Ship vertical position (%)**. Use Tab to reach controls and Space to toggle the checkbox. Enter in a single-line form field submits the form; Enter in **Raw observations** adds a line break. |

## Limitations and unavailable integrations

No authoritative NSTM revision, engineering equations and limits, signed reference cases, approved conversions, real craft definitions or uncertainty model were supplied. The app provides no force or MSI calculation, bollard-strain evaluation, safety margins, tug allocation, line sequencing, gust thresholds, NSTM compliance decision or approved Mooring Evolution Safety Sheet. The drawing has no physical scale or engineering geometry.

There are no live hydrographic feeds, AI services, backend, CAC/identity checks, qualification verification, government-system connections or multi-device synchronization. Recorded synthetic review is not an operational approval. Full UC10-1, PHY-01, PHY-02 and DELIVERABLE10-1 remain deferred.

See [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites and unresolved ownership, engineering, security and integration work.

## Developer tests, Node required

Using the app requires only a browser. To run the application core tests, install Node.js 18 or later, open a terminal in this directory and run:

```sh
node --test core.test.cjs
```

No package installation is required. `core.test.cjs` exercises `core.cjs` and the actual inline core extracted from `index.html` through Node VM. It checks validation, literal sample outputs, draft preservation, revision/review rules, persistence rejection, committed-only export, drawing boundaries and behavioral parity. Maintain both core copies together when changing application logic.

The verification-phase run on 2026-11-04 passed 25 tests with no failures or skips. Added adversarial cases cover every editable field, immutable committed snapshots, malformed stored envelopes, and inclusive text/layout boundaries. These Node tests execute the application core, including its inline copy; they do not exercise the rendered browser UI. Host browser journeys, screenshots, offline opening and human usability checks remain pending in [verification.md](verification.md). The browser completion gate has not passed. Reviewer acceptance and operational validation have not been established.
