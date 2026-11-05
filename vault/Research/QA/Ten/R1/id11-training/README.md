# Synthetic PB4T weekly planner

## What it does

This offline application helps PB4T training coordinators and departmental reviewers explore a small synthetic training week. It compares competing drill requests, finds a complete feasible allocation using explicit candidate times, audits the result, shows personnel loading and records revision-specific local review.

The single page contains **1. Inputs & constraints**, **2. Compare & deconflict**, **3. Audit & personnel loading** and **4. Local proposal review**. Use synthetic data only. The supplied rest and duty values are demonstration inputs, not approved fatigue policy.

## Prerequisites and quick start

You need a modern browser that supports JavaScript and native dialogs. Browser downloads are needed for export; local storage is needed to retain work between sessions. No installation, server, account, network connection or package dependencies are required. **Node is not required to use the app.**

1. Open [index.html](index.html) directly in your browser, for example by double-clicking the file.
2. Select **Load synthetic week**. If an existing workspace is present, export anything you want to keep before confirming replacement.
3. Select **Find feasible schedule** to calculate the supplied example.

The displayed week is fixed to 2 to 8 November 2026, in UTC. Nothing is sent to another system.

## Walkthrough: resolve the sample collision

Start with the unchanged synthetic week. If necessary, select **Load synthetic week**, then **Replace with synthetic week** to reset existing work.

1. Inspect **Inputs & constraints**. Both Damage Control and Engineering last 60 minutes, originally start at minute `540` (Monday 09:00), and use Alex and Room A. Damage Control has candidate `540`; Engineering has candidates `540, 630`.
2. Confirm that **Compare & deconflict** reads **1 personnel collision; 1 resource collision.** Alex has qualifications `EOOW, FPL`, availability from `540` to `1020`, minimum rest `30`, and weekly duty budget `120`. Bea has qualification `TAO` and is unassigned.
3. Select **Find feasible schedule**. The result should read **Feasible: all 2 requests scheduled.** Requested values remain visible beside the allocations.
4. Compare the resulting board with the following expected output:

   | Request | Allocation | Personnel | Resource |
   | --- | --- | --- | --- |
   | Damage Control | Mon 09:00 to 10:00 UTC | Alex | Room A |
   | Engineering | Mon 10:30 to 11:30 UTC | Alex | Room A |

5. Inspect **Audit & personnel loading**. Expect **0 personnel overlaps; 0 resource overlaps; 0 constraint violations.** Alex shows **120 / 120 minutes (100%)** and a minimum gap of 30 minutes; Bea shows **0 / 120 minutes (0%)**. Shading represents the same numeric loading. Other days read **No drills**.
6. In **Local proposal review**, select **Review board and personnel loads**, then **Accept local proposal**. For this freshly loaded example, expect **Locally accepted revision 1; not operational approval.**
7. Select **Export proposal** to download `pb4t-proposal.json`.

These are reproducible expected results from the sample and application tests. Browser execution and visual checks remain pending; see [verification.md](verification.md).

## Edit inputs and recalculate

1. Find the request or person under **Inputs & constraints**. The board's **Edit Engineering candidates** button focuses Engineering's candidate field; it does not move a drill directly.
2. Change a labeled field, such as **Candidate starts (comma-separated minutes)**, **Exact assigned people (IDs)**, **Qualifications**, or **Minimum rest (minutes)**. The top status identifies **Unsaved changes**. The board continues to represent saved inputs until you save.
3. Select **Save inputs**. Validation errors preserve entered values and focus the relevant field or error message. Correct the error and save again, or select **Discard changes** to restore the saved inputs.
4. Select **Find feasible schedule**. Save or discard changes before searching. The application briefly reports **Finding feasible schedule** and prevents duplicate save/search submissions.
5. Review the new board and loading. A changed save creates a new revision and clears the current proposal; an unchanged save keeps the revision. A failed search exposes no partial proposal for acceptance.

For a reproducible recovery exercise:

1. Starting from the sample, set Engineering's **Candidate starts (comma-separated minutes)** to `540`.
2. Select **Save inputs**, then **Find feasible schedule**. Expect **Infeasible: no complete schedule within supplied candidates.** and **No current proposal to review.**
3. Restore `540, 630`, save and search again. Expect both requests to be scheduled at the walkthrough times.

## Review and export

1. Obtain a complete feasible proposal and inspect the original/requested values, proposed values, audit and personnel loading.
2. Select **Review board and personnel loads**, then **Accept local proposal**. Without the checkbox, the app explains what to review. With unfinished edits, it reports **Save or discard unsaved changes before review.**
3. After changing and saving inputs, calculate and review a new proposal. Previous acceptance appears under **Historical local acceptance**; it cannot approve the changed revision.
4. Select **Export proposal** for the current audited proposal. Unsaved edits must be saved or discarded first. The UTF-8 JSON download, `pb4t-proposal.json`, contains synthetic classification, revision, saved inputs, assignments, audit and a local-acceptance indicator. You may export an unaccepted feasible proposal; local acceptance is a separate step.
5. Select **Export work** at any time to download `pb4t-work.json`, a snapshot containing the workspace, draft and last acceptance where present.

Exports are records for inspection. **There is no file import or restore-from-export control.** Local acceptance is neither authorized operator signoff nor operational approval.

## Save, reload, reset and recover

1. Use **Save inputs** to commit valid edits explicitly. Draft edits are stored separately as you type, where browser storage is available. An autosaved draft is still unsaved relative to the committed planning revision.
2. Reload the same page in the same browser/profile to resume saved inputs, unfinished draft, current proposal and valid local review where local storage works. The storage key is `pb4t-synthetic-v1`. The app does not synchronize between devices or browsers.
3. To undo unfinished edits, select **Discard changes**. This restores committed inputs; it does not recover an older committed revision.
4. To reset, export work first if needed, select **Load synthetic week**, then **Replace with synthetic week**. This replaces inputs, drafts and local acceptance history with the sample at revision 1. **Cancel** or Escape dismisses the confirmation without replacement. There is no separate empty-workspace reset button.
5. If the app reports **Work is not saved on this device**, keep the page open and use **Export work**. Changes remain in memory, but may be lost when the page closes. Storage behavior for directly opened files varies by browser; private browsing, cleared site data, browser restrictions or moving the file may affect persistence.
6. An invalid stored workspace is rejected rather than treated as accepted data. The app offers explicit sample replacement. It has no automated repair or import recovery for rejected stored records; an export from the current page does not recover unreadable stored content.

## Input formats and validation

All times are integer minute offsets from **2026-11-02 00:00 UTC**. For example, `540` is Monday 09:00, `600` is 10:00, `630` is 10:30, and `1020` is 17:00. Do not type clock strings into minute fields.

| Field | Supported input |
| --- | --- |
| **Duration (minutes)** | Integer from 1 to 480 |
| **Candidate starts (comma-separated minutes)** | 1 to 20 distinct integers, such as `540, 630`; each full drill must end by minute 10080 |
| **Exact assigned people (IDs)** | At least one known ID: `alex`, `bea`, or `alex, bea` |
| **Required qualifications** / **Qualifications** | Distinct comma-separated strings, such as `EOOW, FPL`; each request needs at least one required qualification. Strings are case-sensitive. A person's qualification list may be empty. |
| **Exclusive resources (IDs)** | Known ID `room-a`; an empty field means no shared resource. Resources are exclusive, capacity one. |
| **Availability start/end (minutes from epoch)** | Integer start from 0 to 10079, end from 1 to 10080, with start strictly before end |
| **Minimum rest (minutes)** | Integer from 0 to 10080 |
| **Duty budget (minutes across supplied week)** | Integer from 0 to 10080; applies to the entire supplied horizon, not each day |
| **Operating windows (start to end, comma separated)** | For example `540:1020` or `540 to 1020`; separate multiple windows with commas. Use a colon or the shown en dash, not an ordinary hyphen. |
| **Search budget (candidate attempts, 1 to 200000)** | Integer from 1 to 200000; default `1000` |

Each interval must fit wholly inside one operating window and every assigned person's availability. Adjacent windows are not merged. Intervals that touch do not overlap, but shared personnel still need the specified rest; back-to-back assignments require zero rest.

Every supplied request must be scheduled. Required qualifications may be covered across the exact assigned people; an unassigned person cannot supply a qualification. The solver does not select different personnel for you. A zero duty budget prevents positive assigned duty. Blank or fractional numeric values, unknown IDs, duplicate list entries and out-of-week intervals are invalid.

The core supports up to 12 requests and 50 people, but this UI edits the supplied two requests and two-person roster. It has no controls to add/delete requests, people or resources, change the week, or import a different dataset. The core accounts for supplied immutable prior commitments; the sample has none, and the UI has no control to add them.

## Troubleshooting

| Message or situation | What to do |
| --- | --- |
| **Engineering duration must be an integer from 1 to 480 minutes.** | Enter `60` to restore the sample, then select **Save inputs**. Other entered fields are preserved. |
| **Infeasible: no complete schedule within supplied candidates.** | Inspect the constraint detail. Edit candidate times or explicit constraints deliberately, then save and search. This result concerns only the supplied finite candidate set. |
| **Search limit reached: feasibility is unknown.** | Increase **Search budget (candidate attempts, 1 to 200000)**, save and retry. The sample recovers from budget `1` when restored to `1000`. Exhaustion does not prove impossibility. |
| Missing `FPL` | In Alex's **Qualifications**, restore `EOOW, FPL`, save and search. The sample Engineering request requires `FPL`. |
| Alex unavailable, insufficient rest or duty budget | Restore sample availability end `1020`, minimum rest `30`, and duty budget `120`, then save and search. Values `600`, `31`, and `119`, respectively, prevent the planned complete allocation. |
| Availability diagnostic seems broader than one candidate | Engineering at `540` can individually fit an availability ending at `600`, but collides with Damage Control; its later candidate is unavailable. Read the accompanying search detail for this distinction. |
| Review or export rejected | Save or discard edits, obtain a current feasible proposal, and for acceptance select **Review board and personnel loads**. Historical acceptance cannot substitute for a current proposal. |
| Storage warning or missing work after reload | Check browser/profile and local-file storage restrictions. Keep current work open and export it. There is no cloud backup or import recovery. |
| Download not found | Check the browser's downloads list, chosen download folder and download permissions. Exported filenames are `pb4t-proposal.json` and `pb4t-work.json`. |

Constraint explanations describe observed conflicts; they are not a minimal proof of the cause. No hard constraint is automatically relaxed.

## Limitations and unavailable integrations

The search finds the first feasible allocation over fixed personnel and explicit candidates. It does not optimize an objective, guarantee a globally optimal roster, negotiate through departmental agents, or automatically choose alternate personnel. Maximum-size responsiveness has not been benchmarked.

There is no SFTRM recurrence engine, mandated-occurrence expansion, completion history, qualification expiry verification, distinct-billet/headcount enforcement, resource capacity above one, resource calendars, rolling/daily fatigue accounting or duty carry-in before the epoch. A feasible result does not establish training-policy compliance.

There are no live roster/calendar/ship-system connections, CAC or identity integration, shared server storage, collaboration, application encryption, signed installation or automatic updates. Browser storage and exported files are device-local records. Actual operator acceptance, security authorization and operational readiness remain unresolved.

See [path-to-fleet.md](path-to-fleet.md) for owner assignments, approved-policy dependencies and field-validation prerequisites. See [verification.md](verification.md) for test evidence and outstanding browser and human checks.

## Developer tests

These instructions are separate from using the browser app. Developer tests require Node with the built-in `node:test`, `node:assert/strict` and `node:vm` modules; Node 18+ is recommended. The recorded local execution used Node v26.0.0. No package installation is needed.

1. Open a terminal in this application directory.
2. Run:

   ```sh
   node --test scheduler.test.cjs
   ```

3. Check the runner's pass/fail summary. The verification run recorded **15 passed, 0 failed, 0 skipped**. This includes 216 finite models checked against an independent exhaustive oracle, forced backtracking, immutable-commitment boundaries and restored-draft/stale-proposal replay guards. Earlier build failure evidence is preserved in [verification.md](verification.md).

`scheduler-core.cjs` reads and executes the actual designated inline `PB4TCore` script from `index.html`; tests use the same core as the browser rather than a copied solver. Coverage includes sample times and loading, collision/availability/qualification/rest/duty boundaries, prior commitments, infeasible versus exhausted search, forged-result rejection, validation, storage records and revision guards.

Node tests do not establish that browser controls, reload persistence, downloads, keyboard behavior or desktop/narrow layouts work. Those host browser checks and human review remain pending. Toolkit calculations are reference evidence only, not application verification.
