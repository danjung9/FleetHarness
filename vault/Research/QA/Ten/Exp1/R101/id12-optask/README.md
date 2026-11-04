# OPTASK schedule studio, user guide

Primary deferrals: none. **MSG-04 remains deferred and unverified:** an independent person must inspect the synthetic answer key and actual output. Automated comparison does not supply that review; overall requirementsMet is not established.

## What this application does

This local training prototype helps watchstanders and shipboard leaders turn fictional message text into a daily UTC schedule. It extracts **Frequency Plan**, **Crypto Change-over Window** and **Flight Quarters**, shows original field evidence, requires deliberate review, and exports the reviewed results.

**Synthetic only, not validated against actual USMTF formats or operational rules.** Do not enter real tasking, personal data, credentials or crypto material. Local review confirmation is not operational approval.

## Prerequisites and quick start

1. Open [index.html](index.html) in a modern browser with JavaScript enabled. No install, server, account, Node runtime or network connection is required to use the app.
2. Allow browser downloads if you want exports. Local storage must be available for work to survive reloads; some browsers restrict storage for local files.
3. Start with **Load synthetic sample** in **Message and extraction**.

The whole application is embedded in `index.html`. It does not load remote scripts, fonts or services. Actual disconnected-browser behavior still awaits host verification.

## Walkthrough: make the synthetic sample schedule

For the exact revision numbers below, start with an empty session. If necessary, choose **Reset session**, then **Clear session**; this deletes existing local work.

1. Choose **Load synthetic sample**. The **Synthetic OPTASK message** field receives this text:

   ```text
   OPTASK|SYNTHETIC-DEMO-01|Fictional training vessel Meridian
   FREQPLAN|FP-01|Training Alpha|225.500|MHz|2026-11-04T06:00:00Z|2026-11-04T08:00:00Z
   CRYPTO|CW-01|TRAINING-KEY-A to TRAINING-KEY-B|2026-11-04T07:30:00Z|2026-11-04T07:45:00Z
   FLIGHTQTRS|FQ-01|Fictional deck drill|2026-11-04T23:30:00Z|2026-11-05T00:30:00Z
   ```

2. Choose **Parse message**. Expected result: `3 events extracted; 0 issues. Review required.`
3. In **Review extraction**, use **View source** beside FP-01's `start` field. The inspector shows `2026-11-04T06:00:00Z` and `UTF-16 [102, 122); line 2`. Ranges are zero-based, end-exclusive positions in the preserved revision.
4. Inspect the other events and the fictional type mapping. Check **I reviewed the synthetic record-to-event mapping.** and **I reviewed all events, source evidence and exclusions.** Choose **Confirm reviewed revision**. Expected status: `Reviewed synthetic revision 1.`
5. In **Synchronized 24-hour Visual Schedule**, set **UTC schedule day** to `2026-11-04` and choose **Show day**. Expected summary: `2026-11-04 UTC · 3 events · 165 displayed minutes`.

   | Event | Category and detail | Displayed UTC interval | Minutes |
   | --- | --- | --- | --- |
   | FP-01 | Frequency Plan · Training Alpha · 225.500 MHz | 06:00 to 08:00 | 120 |
   | CW-01 | Crypto Change-over Window · TRAINING-KEY-A to TRAINING-KEY-B | 07:30 to 07:45 | 15 |
   | FQ-01 | Flight Quarters · Fictional deck drill | 23:30 to 24:00, continues next day | 30 |

   FP-01 and CW-01 overlap for 15 minutes. Displayed minutes sum each event's duration, so overlapping minutes count for both events.

6. Set **UTC schedule day** to `2026-11-05` and choose **Show day**. Expected summary: `2026-11-05 UTC · 1 event · 30 displayed minutes`. FQ-01 appears at 00:00 to 00:30, continued from the previous day. Its full interval remains 60 minutes.
7. Return to `2026-11-04` with **Show day** before exporting if you want the three-event CSV.

The visual schedule uses a common 00:00 to 24:00 axis and three category tracks. The text list underneath gives times and full intervals. On narrow screens, scroll inside the timeline horizontally. Native controls support keyboard navigation; browser keyboard, focus and layout checks remain pending.

## Parse and review your own fictional text

1. Paste supported records into **Synthetic OPTASK message**. Loading the sample replaces the current draft, so preserve anything you need first.
2. Choose **Parse message**. Each accepted nonempty parse creates a new source revision with fresh review choices, even if its records contain issues. Empty or oversized input is rejected without creating a revision.
3. Inspect extracted fields with **View source**. For issues, use **Inspect original line**. Expand **Preserved revisions** to read previous source text.
4. Resolve every issue using either correction or exclusion:
   - To include a repaired event, edit the source and choose **Parse message** again. Previous revisions remain in history.
   - To omit the invalid or unsupported record, enter a **Reason to exclude record** and choose **Exclude record**. A nonempty reason is required. Exclusion never converts an invalid record into an event.
5. Review the mapping, events and exclusions, check both review boxes, then choose **Confirm reviewed revision**.

A header-only revision, or one whose invalid records have all been explicitly excluded, can be reviewed with zero events. Its schedule says **No events for this day.** Committed review choices and exclusions cannot be edited in place; parse a new revision to make another review decision.

## Choose a day and export

1. Enter a date in **UTC schedule day**, then choose **Show day**. Merely changing the field does not apply or save the new day.
2. Read the schedule and overlap summary. Times are normalized to UTC. Cross-day events are clipped for the displayed day while their full endpoints remain available. Overlaps are shown without moving events.
3. After confirming review, choose an export:

   | Button | Download | Contents |
   | --- | --- | --- |
   | **Export reviewed CSV** | `reviewed-schedule.csv` | Reviewed events intersecting the applied UTC day, sorted by full start time then ID; full and clipped UTC endpoints, category details, synthetic and review markers. |
   | **Export traceability JSON** | `extraction-review.json` | All preserved source revisions, field spans, valid events, issues and exclusions, review decisions, active revision and selected day's schedule. |

CSV uses quoting for commas, quotes and line breaks and prefixes formula-like text with an apostrophe. JSON retains original evidence. A zero-event CSV contains only its header.

Exports are blocked until review is confirmed and whenever source changes are unsaved. The reason appears beside the export controls. Downloads are created locally; the app cannot confirm where the browser saves them. There is no file import or JSON restore control. Exports are records for inspection, not a complete restorable session backup; an unparsed source draft is not included in them.

## Save, recover and reset work

There is no separate **Save** button. These are distinct steps:

- Editing saves the draft locally when storage is available.
- **Parse message** preserves the source in a new extraction revision.
- **Confirm reviewed revision** commits the local review decision.
- **Show day** applies and stores the selected UTC day.

Draft text, preserved revisions, review choices and applied day normally survive reloads in the same browser/local-file context. Work is not synchronized between browsers or devices. Moving the file, clearing browser data, private browsing or unavailable storage can prevent restoration. A storage warning means persistence is not promised; keep needed fictional source separately and export reviewed results before closing.

To recover from source edits:

1. Read the stale-source warning. The previous extraction remains visible, but review and exports are blocked.
2. Choose **Parse message** to create and review a new revision, or **Discard changes** to restore the active revision's source and prior review.

To clear work:

1. In **Local session**, choose **Reset session** or **Stop and clear**.
2. Choose **Cancel** to preserve work, or **Clear session** to remove active work and this app's stored session. Other applications' storage is not cleared.
3. Manage downloaded files separately; reset does not delete them.

If you suspect real input, stop and clear the session. Automatic sensitive-data detection is not implemented.

## Run the synthetic comparison

1. In **Synthetic comparison**, choose **Run synthetic comparison**. This uses the embedded planner-authored key, separately from your draft.
2. Expected results for the supplied fixtures are 3 expected events, 3 extracted events, 3 matched events, 0 false positives and 0 missed events. Expected scores are 100% precision (3/3), 100% recall (3/3) and 100% exact fields (17/17).
3. Inspect discrepancies if any are listed. The fixtures contain three supported events and two zero-event messages. The results measure those finite examples only.

Independent human review remains pending. These scores do not establish general accuracy, actual-format compliance or operational suitability.

## Supported input and validation

The application implements the fictional `synthetic-optask/v1` grammar, with one pipe-delimited record per line:

```text
OPTASK|message-id|fictional vessel
FREQPLAN|id|label|frequency|unit|start|end
CRYPTO|id|training placeholder transition|start|end
FLIGHTQTRS|id|description|start|end
```

- Tags and units are case-sensitive. OPTASK is optional metadata; multiple headers require review.
- Fields must be nonempty and cannot contain pipes or newlines. Unicode text is supported. Blank lines are ignored; LF and CRLF separators are supported by the parser. Source evidence refers to text captured from the entry field, not an uploaded original file.
- IDs use ASCII letters, digits and hyphens. Duplicate IDs across event types invalidate every matching event record.
- Frequency is a positive finite decimal, with unit exactly `MHz` or `kHz`. This validates syntax, not permission to use a frequency.
- Timestamps require `YYYY-MM-DDTHH:mm:ssZ` or a numeric offset such as `2026-11-04T01:00:00-05:00`. That example equals `2026-11-04T06:00:00Z`.
- Years must be 1900 to 9999. Dates and times must be valid; timezone offsets cannot exceed ±14:00. Fractional seconds, missing timezones and relative dates are unsupported. End must be later than start. Unknown dates are never replaced with the system clock.
- Maximum input is 200,000 UTF-16 code units. Unsupported types, malformed records and invalid fields remain review issues; they are not silently scheduled. Generic slash-delimited EVENT/TASK toolkit records are not supported by this application.

## Troubleshooting

| Symptom or message | What to do |
| --- | --- |
| **Enter a synthetic OPTASK message.** | Paste fictional records or choose **Load synthetic sample**, then parse. |
| Missing timezone or invalid date | Supply a valid full timestamp with seconds and `Z` or numeric offset; correct the source and parse again. |
| Unsupported record type or incorrect field count | Match the grammar above, or give a reason and explicitly exclude the record. |
| **Resolve all issues and confirm the mapping and events before review.** | Correct/reparse or exclude every issue, then check both review boxes. |
| **Parse or discard source changes before review.** | Parse the changed draft or choose **Discard changes**. |
| Export controls unavailable | Read the reason beside them. Resolve issues, confirm review, and parse or discard source edits. |
| **No events for this day.** | Choose a UTC day that intersects a valid event and press **Show day**. A reviewed zero-event revision legitimately has no schedule entries. |
| **Session only: local storage unavailable.** | Storage access failed or the saved session could not be read/validated. Keep needed source separately; export reviewed work before closing. |
| Download failure or no saved file | Check browser download permissions and its downloads list, then retry. Reviewed data is retained. |

## Limitations and unavailable integrations

This is a text-only synthetic prototype. It provides no actual USMTF parser or SME-validated operational mapping, file upload/import, OCR, scan or handwriting recognition, automatic ambiguity resolution, operational crypto/key handling, scheduling optimization, collaborative editing or server backup.

There is no government-system connection, CAC/identity integration, approved secure records repository, device installation approval or authority to operate. Retention rules and operational accuracy are unresolved. Browser storage is local and is not an approved protected data store. Human acceptance and operational validation have not occurred.

See [verification.md](verification.md) for evidence boundaries and [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites and unresolved owners/integrations.

## Developer tests and packaging

**Using the app does not require Node.** Developers need Node.js with `node:test` support (Node 18+). No package installation is required. From this directory, run:

```sh
node --test core.test.cjs workflow.test.cjs adversarial.test.cjs
```

The tests exercise actual application functions: parsing, source offsets, validation, review/export gates, UTC clipping, overlap, CSV/JSON output, persistence round trips and the finite comparison key. They also execute the core embedded in `index.html` in a Node VM and compare its behavior with `core.cjs`. A VM test does not exercise browser controls or layout.

For development after changing application source, rebuild the self-contained page, then test:

```sh
node build.cjs
node --test core.test.cjs workflow.test.cjs adversarial.test.cjs
```

`build.cjs` embeds `core.cjs` and `benchmark-fixtures.json` into `index.template.html`, writing `index.html`. Rebuilding changes the delivered application and requires verification again. Browser users do not need to run this command.

Verification evidence (2026-11-04): **31 tests passed, 0 failed, 0 skipped** after the single bounded repair. Adversarial tests cover inherited-property event tags, altered stored evidence, input size limits, midnight endpoints and missing/extra benchmark events. Restoring a session with altered issue/header evidence or grammar now reports a storage warning and continues session-only. Desktop/narrow browser journeys, keyboard/layout checks, actual downloads/reload and disconnected-browser operation remain pending host verification. Independent review and operational validation remain unverified.
