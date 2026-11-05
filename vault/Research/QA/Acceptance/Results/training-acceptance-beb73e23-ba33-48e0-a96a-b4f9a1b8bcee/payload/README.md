# Synthetic training draft: user guide

## Purpose and intended users

Training draft helps a training coordinator inspect four synthetic practice sessions, edit their constraints, generate a feasible draft, review personnel loading and save or recover the work offline.

**Synthetic practice only, not an issued schedule.** The application keeps the assigned people, rooms and required qualifications fixed. It searches only the allowed start times; it does not select personnel or optimize a real roster.

## Prerequisites and quick start

You need a modern browser with JavaScript enabled. Open **index.html** directly in the browser. No installation, server, internet connection, account or Node runtime is required to use the application. All runtime code is inside that file.

On a first open, the four-session sample is already entered, with no generated result. If you have used the app before, it may restore your previous work instead. Browser storage for local files varies; keep downloaded snapshots for reliable portable recovery.

1. Open **index.html**.
2. Inspect **1. Prepare the requests** and **2. Check the supplied rules**.
3. Select **Generate draft** under **3. Inspect the draft**.
4. Read the assignment cards and both personnel totals before reviewing or saving.

Use Tab to move between controls and Enter or Space to activate buttons. After the first generation, leaving a changed field triggers another calculation. You can also select **Generate draft** explicitly.

## Workflow: edit and generate a draft

1. Under **1. Prepare the requests**, find the desired session. Edit **Duration (minutes)** or **Allowed starts (minutes)**. The person, room and required qualification appear above these fields and cannot be reassigned.
2. Under **2. Check the supplied rules**, edit **Operating windows** if needed.
3. For P01 or P02, edit **Supplied qualifications**, **Availability windows**, **Maximum minutes, both days** or **Minimum rest (minutes)**. These are synthetic problem inputs, not approved operational policy.
4. Select **Generate draft**, or Tab out of an edited field after an initial generation.
5. Read the outcome:

| Outcome | Meaning and next action |
| --- | --- |
| **Feasible draft, all 4 requests scheduled.** | All four assignments passed the supplied constraints and a separate complete-draft check. Inspect the intervals and personnel totals. |
| **Invalid input, correct the highlighted fields.** | A value has invalid syntax or range. Correct the field error and generate again. |
| **Infeasible, no permitted combination satisfies all constraints.** | The complete search found no fit among the supplied choices. Inspect the observed conflicts and edit the problem deliberately. |
| **Search limit reached, feasibility is unknown.** | Search stopped before establishing an answer. Increase the allowance or inspect the choices; this is not proof of infeasibility. |

Failures retain all four editable requests and suppress stale assignment results. Conflict explanations describe observed search conflicts, not a minimal set of causes. The application never silently relaxes a constraint.

## Walkthrough: reproduce the synthetic example

Start with the following values. If restored work differs, enter these values manually or import a previously saved baseline.

Both **Operating windows** and each person's **Availability windows** are `0-240;1440-1680`.

| Person | Supplied qualifications | Maximum minutes, both days | Minimum rest |
| --- | --- | --- | --- |
| P01 | Q-A | 120 | 30 |
| P02 | Q-B | 120 | 0 |

| Session | Duration | Allowed starts | Fixed person / room / qualification |
| --- | --- | --- | --- |
| A | 60 | 0 | P01 / Room-1 / Q-A |
| B | 60 | 0, 90 | P01 / Room-1 / Q-A |
| C | 60 | 0 | P02 / Room-2 / Q-B |
| D | 60 | 1440 | P02 / Room-2 / Q-B |

1. Select **Generate draft**. Expect the feasible status and these cards:

   | Session | Interval | Person | Room |
   | --- | --- | --- | --- |
   | A | 0 to 60 | P01 | Room-1 |
   | B | 90 to 150 | P01 | Room-1 |
   | C | 0 to 60 | P02 | Room-2 |
   | D | 1440 to 1500 | P02 | Room-2 |

   Both personnel totals should read **120 / 120 minutes across both days**.
2. Change session D's **Duration (minutes)** to `30`, then press Tab. Expect D at **1440 to 1470**, P02 at **90 / 120 minutes across both days**, and P01 still at **120 / 120**.
3. Select **Mark current draft reviewed**. Expect **Reviewed, current synthetic draft.**
4. Select **Save portable draft**. Keep the downloaded `synthetic-training-draft.json`.
5. Change D's duration to `45` and press Tab. Expect D at **1440 to 1485**, P02 at **105 / 120**, and review cleared.
6. Import the file saved in step 4 using the recovery workflow below. After replacement, expect D's duration back at `30`, interval **1440 to 1470**, and P02 total **90 / 120**. Review must be performed again.

## Workflow: review the current draft

1. Generate a feasible draft.
2. Inspect every assignment and both personnel loading totals.
3. Select **Mark current draft reviewed**.

Editing an input immediately clears review and hides the old results until calculation finishes. Selecting **Generate draft** also clears review. Restoring or importing data requires fresh review. Review is unavailable for invalid, infeasible or search-limited work. This marker records synthetic draft inspection; it does not grant operational authority or record external acceptance of the prototype.

## Workflow: save, export and survive reloads

1. Generate a result from valid inputs.
2. Under **4. Save and recover**, select **Save portable draft**.
3. Keep the downloaded **synthetic-training-draft.json**. Check that your browser actually completed the download.

Save exports exact structured inputs and the current draft, and attempts to store a local checkpoint. Infeasible and search-limited results can also be saved, with no complete assignments. Invalid or unfinished input cannot be exported as a valid snapshot. Review is not stored as trusted approval.

The app separately attempts to preserve unfinished field text on ordinary edits. On reload, it restores the saved checkpoint and then any retained unfinished work; valid generated work is checked again. Unsaved edits can therefore reappear without becoming the saved checkpoint. Saving a new portable draft updates that checkpoint. Browser storage is local to its browser context and may be unavailable, cleared or affected by moving the HTML file. No remote backup or synchronization exists.

## Workflow: import or recover a snapshot

1. Under **4. Save and recover**, choose **Import snapshot file (.json)** and select a saved file. File selection checks it automatically. Alternatively, paste its contents into **Or paste snapshot JSON** and select **Check import**.
2. Read the validation message. Failed imports leave current work intact.
3. In **Review replacement**, compare **Current work** and **Incoming snapshot**, including rules, durations, starts, assignments and totals.
4. If needed, select **Save current work** before replacing it. This is available only when the current work can be saved.
5. Select **Replace current work** to apply the incoming snapshot, or **Cancel** to keep current work.
6. Inspect the restored draft, review it again and select **Save portable draft** to make it your saved checkpoint.

Changing pasted JSON or current input fields invalidates the comparison preview; check the import again before replacement. Import validates the synthetic schema, fixed identities, assignments and totals. Imported infeasible or search-limited claims are recalculated. A saved review claim cannot bypass fresh review.

### Starting over

There is no Reset or Clear data button. Save current work first, then restore a baseline snapshot, manually enter the sample values above, or open the file in a fresh browser storage context. Reloading alone is not a reset because it attempts to restore work. Clearing browser site data may remove both the checkpoint and unfinished edits; export before doing so.

## Supported formats and validation

| Input | Format and limits |
| --- | --- |
| Time values | Nonnegative whole integer minutes from **Day 1 minute 0**. Day 2 starts at 1440. Decimal, negative, blank and unsafe integer values are rejected. |
| Duration | Positive whole minutes; each start plus duration must remain a safe integer. |
| Allowed starts | Nonempty comma-separated list, for example `0, 90`; at most 100 entries. Snapshots retain order and duplicates; search tries unique starts in ascending order. |
| Operating / availability windows | Nonempty semicolon-separated ranges, for example `0-240;1440-1680`; at most 100 ranges. End must exceed start. |
| Qualifications | Nonempty comma-separated tokens, for example `Q-A, Q-X`; at most 100 tokens, each at most 80 characters. Matching is literal and case-sensitive. |
| Budget / rest | Nonnegative whole minutes. Budget covers the entire supplied horizon, not a daily allowance. |
| Search allowance | **Evaluator settings** → **Search allowance (candidate attempts)**: 1 to 200000; default 50000. |
| Portable import | UTF-8 JSON, at most 1 MiB, `schemaVersion: 1`, `classification: "synthetic"`, with `inputs` and `draft`. Use app-exported snapshots; arbitrary calendars, CSV and spreadsheets are unsupported. |

Every full session must fit an operating window and the assigned person's availability. Intervals are half-open: an interval ending at 60 can touch one starting at 60 only if the person's rest rule also permits it. Shared rooms are exclusive. Qualifications must already appear among the supplied values. Only A to D and P01/P02 in their supplied order and fixed assignments are supported.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Duration error | Enter a positive whole number. For example, set B duration from `0` back to `60`, then generate again. |
| Baseline becomes infeasible | Restore B starts to `0, 90`, P01 rest to `30`, and both budgets to `120`. Check qualifications and windows against the walkthrough. |
| A session starts inside a window but fails | Its end must also fit. D at 1440 for 60 minutes needs a window ending at least at 1500. |
| Search limit reached | Open **Evaluator settings** and increase the allowance, for example from `1` to `50000`, then generate again. |
| Review or save button disabled | Finish editing and generate. Review requires a feasible draft; save requires valid inputs and a computed result. |
| Import failed | Use an unmodified app-exported synthetic JSON file under 1 MiB. Check JSON syntax, version and classification. Changed intervals or totals must satisfy all inputs. |
| Browser storage unavailable | Keep the portable download and import it next time. Local reload recovery cannot be relied on. |
| Download missing | Check the browser's downloads and local-file download permissions, then save again. The status indicates download initiation, not proof that a file reached disk. |
| Restored values differ from the saved checkpoint | Unfinished edits may have been restored on top of it. Import the portable checkpoint explicitly to recover its exact values. |

**Read limitations** opens scope disclosures. **Download user guide** downloads an earlier guide embedded in the delivered HTML; it does not read this updated README from disk.

## Known limitations and unavailable integrations

Omitted: recurrence; SFTRM interpretation; departmental negotiation and agents; real readiness data; qualification policy beyond supplied values; official-calendar writes; reconnect synchronization. Feasibility over supplied starts is not global optimization. Owner-approved fatigue and periodicity rules are required for operational use.

There is no weekly departmental optimization board, heatmap, automatic personnel selection, live roster, account system, calendar connection or update service. No people are contacted, no schedule is issued and no operational system is updated. Data must remain synthetic. No runtime packages are required; the supplied toolkit informed constraint semantics but is not a runtime dependency, and its version/license status remains unverified.

## Developer tests and verification

Using the browser app does **not** require Node. Running the development tests requires **Node.js 18 or newer** with its built-in test runner. From the delivered folder, run:

```sh
node --test core.test.cjs application.test.cjs packaging.test.cjs ui.test.cjs
```

No package installation is needed.

- **core.test.cjs** checks scheduling, exact sample intervals, independent interval/load checks, input validation, constraint boundaries and outcome distinctions.
- **application.test.cjs** checks snapshot round trips, rejected imports, nonfeasible claims and review-state behavior.
- **ui.test.cjs** executes the delivered inline UI listeners with a minimal DOM and storage adapter to check import/recovery, review invalidation, raw invalid edits and storage-failure messages. It does not exercise a real browser.
- **packaging.test.cjs** executes the actual embedded core, compares its behavior with `core.cjs`, parses classic scripts and checks selected external-dependency patterns.

The pure core in `core.cjs` is also embedded in the `application-core` script in `index.html`; changes must keep both implementations consistent. Node checks do not exercise real browser storage, downloads, file uploads, layout or accessibility.

The verification run in [verification.md](verification.md) reports **21 passed, 0 failed, 0 skipped**, including 144 adversarial scheduling combinations. Host browser journeys, visual inspection, actual offline close/reopen recovery and human acceptance remain pending. See [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites, owner responsibilities and unresolved operational dependencies.
