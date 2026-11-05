# Tasking review & daily schedule

## What this application does

This local prototype helps watchstanders and shipboard leaders evaluate a synthetic message-review workflow. Paste EVENT/TASK text, inspect each extracted field against its original source, assign categories, approve the records, and view a daily UTC schedule. You can download reviewed results with their source evidence.

Use synthetic data only. Actual USMTF parsing and operational accuracy are not established. Category choices are provisional reviewer annotations, not automatic interpretations of military messages.

## Prerequisites and quick start

Use a current browser with JavaScript enabled and support for local file downloads. Open [index.html](index.html) directly in the browser. No install, server, account, Node.js, or package dependencies are required to use the app. All styles and application code are inside that file.

1. Open `index.html`.
2. In **1. Capture message**, choose **Use synthetic sample**.
3. Choose **Parse message**, then follow the review steps below.

Work is held in memory only. Reloading or closing the page loses the session. Export reviewed results before leaving.

## Capture and review a message

1. In **Synthetic message text**, paste your synthetic records, or choose **Use synthetic sample**. Loading the sample replaces the draft text; it does not parse it automatically.
2. Choose **Parse message**. This commits a parsed source snapshot for the session and clears previous category choices and approval, even if you parse the same text again.
3. Read the issues in **2. Review extraction**. Correct any problems in **Synthetic message text**, then choose **Parse message** again. All issues must be resolved before any records can be approved.
4. For each record, choose **Inspect source evidence**. The **Source evidence** panel opens with **Original parsed source (read only)** and field evidence. Entries show the literal field, its `[start, end)` range, and the source slice at that range. Offsets count UTF-16 code units, with the ending position excluded.
5. Check the displayed **Normalized start (UTC)** or **Normalized due (UTC)** and, for events, the end timestamp.
6. Use each **Synthetic category for …** dropdown to select **Frequency plan**, **Crypto change-over**, **Flight quarters**, or **Other synthetic**. No category is inferred for you.
7. Choose **Approve valid records**. A successful approval reports **Reviewed: N records** (or **Reviewed: 1 record**) and displays the schedule.

Evidence and normalized values are read only. To correct an extracted value, edit the source and parse again. Changing a category clears approval; choose **Approve valid records** again after reviewing the new choice.

## View a daily schedule

1. In **3. Daily schedule**, set **UTC day**. The initial day is explicitly November 4, 2026; it is not today's date.
2. Choose **Show day** to apply the date. Changing the date field alone does not change the active schedule or export day.
3. Read the schedule rows and their bars against the 00:00 to 24:00 UTC axis. Overlapping records remain separate rows.

EVENT records appear as intervals clipped to the selected day. Their full duration and full normalized interval remain visible below the row. A cross-midnight event can appear on both days. An event ending exactly at midnight does not appear on the following day. TASK records appear as points, with **Point task, no duration**.

Date changes and evidence inspection preserve your source draft. While a draft differs from the parsed source, the prior reviewed schedule may remain visible, but export is blocked until you parse or discard the draft.

## Reproducible synthetic walkthrough

The **Use synthetic sample** button inserts exactly:

```text
EVENT/E1/2026-11-04T09:00Z/2026-11-04T10:00Z/TEAM/Radio check//
TASK/T1/2026-11-04T16:00Z/TEAM/Review briefing//
```

1. Choose **Use synthetic sample**, then **Parse message**. Expect **No extraction issues.** and two extracted records.
2. For E1, choose **Inspect source evidence**. Its identifier evidence reads `E1 | [6, 8) | E1`. Its normalized start is `2026-11-04T09:00:00.000Z`.
3. Set **Synthetic category for E1** to **Frequency plan** and **Synthetic category for T1** to **Other synthetic**.
4. Choose **Approve valid records**. Expect **Reviewed: 2 records**.
5. Set **UTC day** to `2026-11-04` and choose **Show day**. Expect these rows:

   ```text
   Frequency plan | Radio check | 09:00 to 10:00 UTC | Reviewed
   Other synthetic | Review briefing | 16:00 UTC | Reviewed
   ```

   E1 also shows **Full duration: 60 minutes**. T1 shows **Point task, no duration**.
6. Choose **Export reviewed schedule**. The suggested filename is `reviewed-schedule.json`. It contains the original source, both selected-day records, field offsets, normalized timestamps, your category choices, and daily segments.

## Supported input and validation

Paste plain text with one record per line using these exact, uppercase record types:

```text
EVENT/id/start/end/owner/description//
TASK/id/due/owner/description//
```

- Every field is required. Fields cannot contain slashes or newlines. Each record ends with `//`.
- LF and CRLF line endings are supported; embedded standalone carriage returns are rejected. Blank lines are ignored; entirely blank input produces **Enter synthetic message text.**
- The message limit is 200,000 UTF-16 code units. Some characters, including many emoji, use two code units.
- IDs must be unique across all EVENT and TASK records in the message.
- Timestamps use `YYYY-MM-DDTHH:mm`, optionally followed by `:ss` and one to three fractional second digits, then `Z` or a numeric offset such as `-05:00`. Examples: `2026-11-04T09:00Z`, `2026-11-04T04:00-05:00`, `2026-11-04T09:00:10.125Z`.
- Years 1900 to 9999 and valid calendar dates are required. Hours are 00 to 23; minutes and seconds are 00 to 59. Numeric offsets extend through ±14:00. UTC normalization may cross the input year boundary; intervals are compared as instants. Named zones, missing timezones, relative dates, and leap seconds are unsupported.
- EVENT end must be strictly later than start. TASK has one due instant and no inferred duration.

Unsupported nonblank lines, missing fields, invalid timestamps, duplicate IDs, and zero or reversed intervals block approval of the entire parsed message. Invalid dates remain unknown; the app does not substitute the current date. Source literals remain available separately from normalized UTC values.

## Save, export, reset, and recover

### Export reviewed results

1. Resolve all extraction issues, select every category, and approve.
2. Select a day containing reviewed records and choose **Show day**.
3. Choose **Export reviewed schedule**, then use your browser's download controls to locate the JSON file.

The download contains the complete parsed source text, but its `records` array contains only records intersecting the active selected day. Those records retain full timestamps as well as clipped daily segments. Export other days separately if needed. An empty day cannot export.

There is no separate Save button, draft export, or JSON import/restore feature. A download is an external record of the reviewed output; it cannot be reopened as a saved session in this app. Copy any unfinished draft to a text file yourself if you need to keep it.

### Recover from source edits

1. Edit **Synthetic message text**. If it differs from the parsed source, the app reports **Unsaved source changes. Parse changes or discard draft before approval or export.**
2. To keep the edits, choose **Parse message**, review the new extraction, select categories again, and approve again.
3. To abandon the edits, choose **Discard draft**. This restores the last parsed source and preserves its existing approval, if any. It does not undo category changes or restore an older parsed snapshot.

### Start over

Export or copy anything you want to keep, then reload the page to begin an empty session. There is no dedicated Reset button, automatic backup, local-storage persistence, or recovery after reload. Parsing new input replaces the previous snapshot without an undo history. An oversized parse failure preserves the draft and prior source evidence but clears approval and the reviewed schedule; shorten the draft and parse again, or discard it and explicitly approve again.

## Troubleshooting

| Message or symptom | What to do |
|---|---|
| **Enter synthetic message text.** | Paste a record or choose **Use synthetic sample**, then parse. |
| **Line …: unsupported message structure.** | Check uppercase EVENT/TASK, field count, ending `//`, and accidental slashes or extra text. |
| **… requires a valid timestamp with an explicit timezone.** | Check the calendar date and add `Z` or a numeric timezone offset. For example, February 30 and a timestamp without a zone are invalid. |
| Duplicate identifier or required-field issue | Give each record a unique ID and fill all required fields; parse again. |
| **end must be later than start.** | Correct the interval. If it crosses midnight, include the following date in its end timestamp. |
| **Choose a category for every record before approval.** | Select a category in every record's dropdown, then approve again. |
| **Approval unavailable while source changes are unsaved.** | Choose **Parse message** to commit edits or **Discard draft** to restore the parsed source. |
| **No reviewed records for this day.** | Confirm approval, check the UTC date, and choose **Show day**. |
| **Export reviewed schedule** is disabled | Read the explanation beneath the button. Resolve edits or issues, approve records, and select a day with reviewed records. |
| **Choose a valid UTC day.** | Enter a valid date and choose **Show day**. The last successfully applied day remains active after an invalid choice. |
| Download does not appear | Check the browser's download list and local-file download policy. The app uses a local Blob download; it has no alternative save service. |
| Work disappeared after reload | Session data is intentionally not retained. Use a previous download as a reference; automatic restoration is unavailable. |

Native controls support keyboard navigation: use Tab to move focus, Enter/Space to activate buttons, and the browser's usual dropdown/date controls. Enter in the message textarea inserts a newline. Manual keyboard and visual usability review remain pending.

## Known limitations and integration boundaries

This is a synthetic EVENT/TASK prototype. It does not support actual USMTF or OPTASK formats, scanned documents, handwriting, OCR, file ingestion, or model-assisted extraction. The requested operational event categories have no supplied SME-reviewed mapping. A user's approval means deliberate prototype review, not independent domain certification.

There is no backend, account, CAC integration, operational endpoint, multi-user synchronization, encryption service, or government-system connection. Full USMTF support, independent accuracy evaluation, and witnessed disconnected operation remain deferred. Although the app has no remote resources, that alone does not establish tested offline operation or suitability for an approved device.

See [verification.md](verification.md) for evidence and pending checks, and [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites and unresolved owners, approvals, and integrations.

## Developer tests

Node.js is required only for developer tests. Use a current Node.js release, preferably Node 22 or later, supporting `node:test` and `Object.hasOwn`. No package installation is needed. From the project directory, run:

```sh
node --test core.test.cjs consistency.test.cjs
```

`core.cjs` loads and executes the actual `application-core` script embedded in `index.html`; there is no separate test-only parser. `core.test.cjs` checks field offsets, Unicode and mixed line endings, strict dates, malformed input, duplicate IDs, review transitions, export guards, and UTC day boundaries. `consistency.test.cjs` compares behavior through the adapter and the inline core using frozen journey inputs. These are core tests, not browser interaction tests.

The verification-stage run of the command above passed all 12 tests with no failures or skips. Regression coverage includes rejected oversized parses, UTC year-boundary ordering, embedded carriage returns, selector identities, and the sample walkthrough’s literal rows and export contents. Browser journeys, screenshots, manual visual/keyboard review, reviewer acceptance, and operational validation remain pending as described in [verification.md](verification.md).

The parser and timestamp validation adapt concepts from supplied `.fleet/toolkit/messages.js` and `validation.js`. Upstream license/version evidence remains unresolved and should be resolved before external distribution. No external runtime package is required.
