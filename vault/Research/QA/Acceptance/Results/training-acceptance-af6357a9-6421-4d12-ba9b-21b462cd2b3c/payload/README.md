# Synthetic practice draft

A small local helper for a coordinator, naval officer or Sailor who does not code. Inspect four fictional administrative practice requests, find times that meet the supplied constraints, and keep a draft for human review. This is a partial ID 11 demonstration. It is not an issued schedule or an operational compliance tool.

## Open it

1. Double-click index.html to open it in a modern browser with JavaScript enabled.
2. Keep the SYNTHETIC DATA and DRAFT ONLY labels in view. Use only synthetic, unclassified inputs.
3. No installation, server, account or network is needed by the file. Browser operation has not been exercised in this environment; the exact manual checks are in [NOTES.md](NOTES.md).

## Inspect the supplied example

1. In **1. Inspect the four requests**, read A, B, C and D. Assigned people, rooms and required qualifications are fixed. Duration and allowed starts are editable. Enter whole minutes and comma-separated starts.
2. In **2. Inspect the result**, expect **Feasible draft** with A at 0 to 60, B at 90 to 150, C at 0 to 60 and D at 1440 to 1500. The computed totals are 120 minutes for each person over both days combined. Day 1 begins at 0; day 2 begins at 1440.
3. Expand **Inspect or edit synthetic constraints** to see the operating windows, each person's availability, supplied qualifications, combined maximum and rest gap. Changes define a different synthetic scenario. The helper never changes a limit, selects another person or invents a qualification on its own.
4. Inspect every draft time and both personnel totals. A **Selected start** menu can choose another listed start. The chosen draft is independently checked. A conflicting selection shows **Invalid input: selected draft needs correction** and keeps all four rows. **Find draft again** searches the current allowed starts again.
5. In **3. Review and keep your draft**, click **Mark current draft reviewed** only after inspection. Input edits, time selections, rerunning search, restoring the example and importing a file all clear review. Review is an acknowledgement on this page, never permission to issue a schedule.

## When it cannot find a draft

- **Infeasible over the allowed starts** means every listed choice has been ruled out under the current constraints. Read the conflicts, check for mistaken durations, choices or constraints, and ask the responsible coordinator to decide any correction. Keep every request and its assigned person and room. Do not treat a conflict as permission to relax a limit or invent a qualification. Search does not find the smallest conflict set.
- **Invalid input** names the field to correct. Whole numbers are required. Blank durations, negative minutes, fractions, duplicate starts and invalid window boundaries are rejected. An empty starts list is allowed but leaves no solution for that request. Errors and entered values remain visible until corrected.
- **Search limit reached** is inconclusive. It does not mean no solution exists. The evaluator can inspect or increase **Evaluator search allowance**, then rerun. The default is 50000 candidate attempts; the supported range is 1 to 200000. All requests remain present.

To reproduce infeasibility, change B's allowed starts from `0, 90` to `0`. To reproduce invalid input, leave B's duration blank. To reproduce exhaustion, restore B to `0, 90` and duration 60, then set the evaluator allowance to `1`. **Restore supplied example** asks before replacing changes.

## Save and reopen

1. Click **Save draft file**. Check that the browser actually saved synthetic-practice-draft.json. It contains the exact current inputs and draft, including an infeasible, invalid or inconclusive result. Store only synthetic data in this file.
2. Keep the JSON file and index.html, then close the page. There is no automatic storage or recovery of unsaved changes.
3. Reopen index.html. Under **Import draft file**, choose the saved JSON and confirm replacement of the current page state. Import validates the file and rechecks the result. A valid alternate selected draft is preserved exactly.
4. Inspect the recovered inputs and draft again. Imported review is always cleared. Unsupported, malformed, stale or inconsistent files produce an error and keep the current page state.

Only the app's version 1 `synthetic-practice-draft` JSON format is supported. This is portable file transfer, not reconnect synchronization. Download, file selection, confirmation dialogs, close/reopen recovery and offline browser behavior still require the manual checks in NOTES.md.

## What it does not do

No recurrence, SFTRM interpretation, departmental negotiation or agents, real readiness data, qualification policy beyond supplied values, official-calendar writes or reconnect sync. No contacting people, issuing schedules or operational-system updates. There is no identity check, durable review record, encryption, signature, audit service or authorization to operate. Close the page to stop using it. If a result is suspect, leave it unreviewed, keep the draft file and ask a responsible human to inspect it.

## Development files

Using the app requires only index.html. Rebuilding and tests require Node; the executed version was v26.0.0. No npm is used.

```text
node build.cjs
node --test core.test.cjs
```

Edit core.cjs or index.template.html, then rebuild index.html. The tests prove that the inline core bytes match core.cjs and exercise the actual calculation and portable-state functions. These Node checks do not establish browser behavior or independent acceptance. See [verification.md](verification.md) and [path-to-fleet.md](path-to-fleet.md).
