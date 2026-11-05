# Primary deferrals

None for the scoped synthetic demonstration. **Synthetic, not validated against the real format.** Actual USMTF conformance and operational accuracy remain unverified.

# OPTASK message → daily schedule: user guide

## What this application does

This prototype lets watchstanders and shipboard leaders evaluate a synthetic tasking-message workflow: extract frequency plans, crypto change-over windows and flight quarters, inspect their source text, review the extraction, and export a synchronized UTC daily schedule.

Use invented text only. Sample frequencies and KEY-DEMO labels are fictitious. Review in this app confirms a synthetic demonstration; it does not authorize operational activity.

## Prerequisites and quick start

1. Open [index.html](index.html) directly in a modern browser with JavaScript enabled.
2. Choose **Load synthetic sample** in **Message workspace**.
3. Choose **Parse message**, inspect the results, then follow the review steps below.

No installation, server, network connection or Node runtime is required to use the app. The HTML file contains its code, styles and sample answer key. Browser storage and download permissions affect whether work survives closing the browser and whether exports can be saved.

## Walkthrough: extract, inspect and review the sample

1. Choose **Load synthetic sample**. This replaces the current draft, so copy any draft you want to keep first. It preserves previously parsed revisions.
2. **Raw synthetic message** will contain this exact synthetic example:

   ```text
   FREQ/F1/2026-11-04T08:00Z/2026-11-04T12:00Z/COMMS/251.5/MHz/Training net//
   CRYPTO/C1/2026-11-04T09:30Z/2026-11-04T09:45Z/COMMS/KEY-DEMO-A/Change-over drill//
   FLIGHT/A1/2026-11-04T23:30Z/2026-11-05T00:30Z/AIR/Deck rehearsal//
   NOTE/Synthetic, not validated against the real format.//
   ```

3. Choose **Parse message**. Expect **3 events extracted; 0 issues; review required.** Parsing saves a source revision locally where storage is available, but does not approve it or populate a reviewed schedule yet.
4. In **Extraction and source review**, choose **Inspect source** beside Frequency plan F1. Select `id` in **Source field**. Expect Value and Original to show `F1`, with Offset `UTF-16 [5, 7)`.
5. Select `start`. Expect Original `2026-11-04T08:00Z`, Offset `UTF-16 [8, 25)`, and Normalized `2026-11-04T08:00:00.000Z`. The source excerpt highlights the selected token. Offsets start at zero and exclude the end position; they count UTF-16 units rather than bytes.
6. Inspect the other records and their full intervals. Check **I checked the source, category mapping and extracted times. This confirms only the synthetic demonstration.**
7. Choose **Confirm review and save**. With working browser storage, expect **Reviewed and saved locally: 3 events.** If storage is unavailable, the status says the review is saved only for this session.
8. Set **UTC day** to `2026-11-04` and choose **Show day**. This also makes the walkthrough reproducible if an earlier session restored another date.

Expected November 4 schedule:

| Category / ID | Displayed UTC interval | Detail |
| --- | --- | --- |
| Frequency plan / F1 | 08:00 to 12:00 | 251.5 MHz · Training net |
| Crypto change-over / C1 | 09:30 to 09:45 | KEY-DEMO-A · Change-over drill |
| Flight quarters / A1 | 23:30 to 24:00 | continues next day · Deck rehearsal |

The three lanes share a 00:00 to 24:00 axis. Text below the bars gives the category, ID, times and description. Color is supplementary. To inspect a full interval, use **Inspect source** in the extraction panel; the timeline bars themselves are not inspection buttons.

## View another day and export

1. Set **UTC day** to `2026-11-05`, then choose **Show day**.
2. Expect A1 at **00:00 to 00:30 UTC**, marked **continued from previous day**, and **2 reviewed events outside this UTC day.** A1's full interval remains November 4 at 23:30 through November 5 at 00:30: 60 minutes total.
3. To export the November 4 view, set **UTC day** back to `2026-11-04` and choose **Show day**.
4. Choose **Export reviewed schedule**. The browser downloads `optask-2026-11-04.json`; the date in the filename follows the applied schedule day.

The UTF-8 JSON export includes the synthetic disclosure, source revision history, all reviewed events and exact field spans, full normalized UTC intervals, and the selected day's clipped schedule. Events outside the selected day remain in the export. An event ending exactly at midnight does not appear on the following day.

Export requires a reviewed parsed source with no unresolved issues or source edits. There is no export-import or workspace restore-from-file control; keep exported JSON as a readable record, not an automatically restorable backup.

## Correct a message and preserve its source history

1. Edit **Raw synthetic message**. For example, replace `Training net` with `Updated drill`.
2. Expect **Unsaved source changes; parse before review or export.** This means the draft differs from the parsed revision, even though the browser normally stores the draft for reload recovery. The previous reviewed schedule may remain visible with a stale-source warning.
3. Choose **Parse message** to commit the correction as a new revision. Review resets. Merely parsing identical text also resets review, but does not add another source revision.
4. Correct every listed issue before reviewing. Invalid recognized records remain available for source inspection; unsupported lines have issues but no extracted event.
5. Inspect and acknowledge the corrected extraction, then choose **Confirm review and save** again. The sample F1 schedule now ends with `Updated drill`.
6. Expand **Source revision history** and individual revision entries to inspect earlier raw text. **Previous committed source** shows the immediately preceding revision.

Choose **Discard source edits** to restore the latest parsed source in the textarea. Before the first parse, it restores an empty draft. It does not undo an already parsed revision or delete history, and it has no confirmation dialog.

## Compare against the synthetic answer key

1. In **Synthetic answer-key review**, choose **Run synthetic comparison**. This does not replace your message or schedule.
2. Expect **Expected 3; extracted 3; matched 3; false positives 0; missed 0.** Event precision and recall should both be 100%, with zero field, time and span discrepancies.
3. Expect **2 non-event lines; 0 extracted events; 1 unsupported-line warning.** The comparison input deliberately includes a NOTE and an UNKNOWN line.
4. Expand **Inspect held-out input, expected key and actual output** to examine the evidence. This separate key was authored during planning and is included in `answer-key.json`; it is not SME ground truth.
5. Check **I reviewed this synthetic comparison.**, then choose **Save comparison review**. Expect **Synthetic comparison reviewed locally.**

The acknowledgement persists where storage works. After reload, run the comparison again to show its results. This acknowledgement does not constitute independent human evaluation or real-format validation.

## Supported input and validation

Paste plain text into **Raw synthetic message** using the invented, case-sensitive `synthetic-optask/v1` grammar:

```text
FREQ/id/start/end/owner/value/unit/description//
CRYPTO/id/start/end/owner/demoLabel/description//
FLIGHT/id/start/end/owner/description//
NOTE/text//
```

The same rules are available under **Invented grammar and input rules**.

- Use one record per LF or CRLF line. Blank lines are allowed. Every record needs its final `//`; fields must be nonempty and cannot contain slashes or newlines. There is no quoting or escaping.
- Event IDs begin with a letter and contain only letters, digits, underscores or hyphens. Duplicate event IDs make every record in that duplicate group unresolved.
- Timestamps require `YYYY-MM-DDTHH:mmZ` or `YYYY-MM-DDTHH:mm±HH:mm`, with years 1900 to 2099 and real calendar dates. Seconds, relative dates such as “tomorrow,” and timestamps without zones are unsupported. Offsets cannot exceed ±14:00.
- End must be after start. Cross-midnight intervals need an explicit next-day end date. The app never guesses missing dates or zones. All schedule times are displayed in UTC.
- FREQ accepts a finite positive decimal literal such as `251.5`, with the exact unit `kHz` or `MHz`. These are synthetic lexical checks, not operational frequency validation.
- CRYPTO accepts `KEY-DEMO-` followed by letters, digits, underscores or hyphens. Never enter real cryptographic material.
- NOTE produces no event. Unknown record types create issues. Generic EVENT/TASK records are unsupported.
- Input is limited to 200,000 UTF-16 units. Oversized input produces an issue and no extraction.

## Local saves, reloads and storage recovery

There is no separate Save draft button. Edits, parsed revisions, review confirmation, applied schedule day and comparison acknowledgement are normally saved automatically in this browser's localStorage. Reload restores the latest parsed source and any separate unfinished draft without approving that draft. Source inspection, day navigation and comparison preserve your draft.

Storage is local to the browser and file context, with no server synchronization or encryption guarantee. Moving the file, switching browsers, private browsing or clearing site data can affect availability. When the app says **Saved only for this session; export to keep a copy.**, export reviewed work before closing. Copy unreviewed raw text separately if it cannot yet be exported.

For **Saved workspace is unreadable**:

1. Expand **Storage recovery**.
2. Choose **Export unreadable saved bytes** to preserve the original data as `unreadable-optask-workspace.json`.
3. The app starts a fresh in-memory workspace and preserves the unreadable stored bytes. Load or paste synthetic text and review it as needed.
4. Choose **Replace saved workspace** only when ready to overwrite the saved bytes with the current workspace, then confirm the browser prompt.

**Replace saved workspace** saves the current workspace; it is not a reset-to-empty button. There is no in-app clear-all-history control. If you need a completely fresh workspace, first preserve any needed output, then use your browser's storage/site-data tools to remove the `synthetic-optask-v1` localStorage entry for this file context and reload. Browser interfaces vary, and broad storage clearing can delete other data.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| **Enter synthetic message text.** | Load the sample or enter a nonempty message, then parse. |
| A line's start or end **requires an explicit timezone** | Add the intended synthetic `Z` or numeric offset; reparse and review. |
| **not a valid calendar timestamp** | Correct the date, time or offset; for example, February 30 is invalid. |
| **unsupported record type** or incorrect fields | Use the exact uppercase grammar and final `//`; correct or remove unsupported lines, then reparse. |
| **Resolve all issues before review.** | Fix all listed issues, including duplicates. Valid records in mixed input do not permit partial approval. |
| **Parse the edited source before review.** | Parse the draft, inspect it, check the acknowledgement and confirm review. |
| **Parse and review the edited source before export.** | Complete that same review sequence before exporting. |
| Review acknowledgement requested | Check the source and mapping checkbox, then choose **Confirm review and save**. |
| No events on the selected day | Confirm review, check **UTC day**, choose **Show day**, and read the outside-day count. |
| **Choose a valid UTC day.** | Enter a complete valid date and choose **Show day**. |
| Export does not appear | Check the app's validation message, then browser download permissions and downloads list. |
| **No unreadable saved bytes to export.** | The recovery download is available only when saved data was rejected on load. Use the normal reviewed schedule export otherwise. |
| Work is missing after reload | Check for a session-only or unreadable-storage message and that you opened the same file in the same browser context. No server copy or automatic import is available. |

Controls use native keyboard interaction: Tab to move focus, Space for checkboxes, and Enter/Space for buttons. Focus indicators and textual schedule entries are implemented; browser accessibility and narrow-layout checks remain pending.

## Known limitations and unavailable integrations

This is an invented plain-text demonstration, not a full USMTF parser or operational scheduling tool. It has no OCR, handwriting recognition, PDF/image upload, LLM extraction, live message feed, authentication, government-system connection, multi-user synchronization or conflict resolution. Overlapping events are drawn on separate rows without resolving conflicts. No installation approval, secure-storage certification or authority to operate is supplied.

Browser journeys, disconnected-runtime behavior, file-origin persistence/downloads, visual layout and independent human review have not been verified in the recorded build evidence. See [verification.md](verification.md) for verification notes and [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites, unresolved ownership and integration dependencies.

## Developer tests, Node required only here

Using the app requires only a browser. Running its developer tests requires a modern Node.js runtime supporting `node:test`, `node:assert/strict` and `Array.prototype.at` (Node 18 or later). No package installation is needed.

From the application directory, run:

```sh
node --test core.test.cjs
```

`core.test.cjs` exercises `core.js` and the actual inline core extracted from `index.html`, using `answer-key.json`. Coverage includes source offsets, mixed line endings and emoji, invalid input, duplicate IDs, timezone normalization, midnight boundaries, revision/review/export gates, corrupt snapshot rejection, comparison discrepancies and complete inline/module behavioral equivalence. Tests do not create mutable files.

The verification-phase run passed 27 tests, with zero failures, cancellations or skips. Added cases cover reserved object names, numeric overflow, multi-day clipping, repeated parsing, corrupted reviewed snapshots, calendar bounds and missing/spurious benchmark events. Those Node results do not establish browser workflow success. Keep the inline core consistent with `core.js` and rerun verification after application changes. The frozen browser contracts are `acceptance-plan.json` and `ux-spec.json`; the host runs those journeys separately.
