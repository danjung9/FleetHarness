# Training Draft user guide

Training Draft helps a training coordinator inspect four synthetic administrative practice sessions across two days. It finds a feasible combination of listed start times, checks a person-selected draft, explains conflicts, displays personnel loading, and supports local JSON save/import.

**Synthetic data only. This is a draft, not an issued schedule or an operational compliance tool.** The example rest and duty limits are demonstration inputs, not approved fleet policy.

## Prerequisites and quick start

1. Open [index.html](index.html) directly in a current desktop browser with JavaScript enabled.
2. The built-in sample loads and calculates automatically. Start with **Session proposals**, **Two-day board** and **Personnel loading**.
3. Keep your changes by using **Save JSON** before reloading or closing the tab.

No install, server, package dependencies, internet connection or adjacent application files are required to use the self-contained HTML. **Node is needed only for developer tests.** Desktop Chromium is the intended initial validation target; actual browser compatibility, downloads and offline close/reopen behavior still need browser verification.

## Edit inputs and generate a draft

1. In **Session proposals**, edit a row’s **Minutes**, **Allowed starts**, **Person**, **Room** or **Qualification**. Enter allowed starts as comma-separated integers, such as `0, 90`.
2. Leave the field to commit the value and recompute. While typing, **Edit pending** clears review and labels the displayed board as a previous reference. Save and generation are disabled until the field is committed.
3. For roster or window changes, find **Exact input / Roster & windows** and edit **Synthetic input JSON**. This includes each person’s qualifications, availability, `maxMinutes` and `restMinutes`, as well as `operatingWindows`. JSON edits recompute immediately.
4. Read the outcome and **Constraint observations**. Invalid text stays in the JSON editor with an error explaining what to correct. When input is invalid, proposal rows and constraint summaries show the last valid input as a reference; there is no current scheduled draft.
5. Click **Generate draft** whenever you want to search again from the current inputs. It clears any review and replaces a person-selected draft with the first complete feasible choice found by the search.

The solver selects start times only. It never changes the entered assignments, removes a request, invents qualifications or relaxes limits. You may explicitly edit assignments yourself.

### Understand the result

| Outcome | Meaning and next action |
| --- | --- |
| **Feasible draft** | All four sessions meet the supplied constraints. Inspect the board and whole-horizon loads before reviewing. |
| **Infeasible with these choices** | Automatic search exhausted the listed combinations, or a person-selected draft conflicts. Inspect the observations and edit the inputs or selected starts. A manual conflict does not prove all combinations impossible. |
| **Invalid input** | Correct the retained JSON or offending field value before scheduling. |
| **Search limit reached; feasibility unknown** | The candidate-attempt allowance ran out. This does not prove infeasibility. |

**Personnel loading** distinguishes proposed minutes from scheduled minutes. When no complete draft exists, scheduled loading says **No complete draft**. Duty caps apply across both days together and do not reset daily. Search explanations are observed conflicts, not a minimal set proving which constraints must change.

## Check a person-selected start

1. Begin with a complete feasible draft.
2. In **Session proposals**, choose a listed **Draft start** for a request. Arbitrary times outside **Allowed starts** are not supported.
3. The application checks the entire selected draft and clears review. A conflicting choice remains selected, while the scheduled board becomes unresolved.
4. Choose a different allowed start to correct the conflict, or click **Generate draft** to return to automatic search.

To offer another start, first add it to **Allowed starts**. If automatic search has no complete draft, correct inputs or choices and generate one before using the manual start selectors.

## Review the current draft

1. Inspect every session in **Two-day board**, the totals in **Personnel loading**, and **Supplied constraints**.
2. In **Current-draft review**, enter a **Synthetic reviewer label**, such as `Demo coordinator`.
3. Click **Mark draft reviewed**. The mark records the label and a local timestamp. The button requires a nonempty label and a feasible draft.
4. Review again after any input, result or reviewer-label edit, regeneration, reset or import. Changing a value and then reverting it does not restore the old review.

This is an unauthenticated local acknowledgment. It does not establish identity, issuing authority, operational approval or approval of the application’s source revision.

## Reproducible synthetic walkthrough

1. Click **Reset sample**. This replaces unsaved changes with the built-in inputs.
2. Confirm the default requests and computed starts below. Every request lasts 60 minutes.

| Request | Person / room | Required qualification | Allowed starts | Expected start to end | Board time |
| --- | --- | --- | --- | --- | --- |
| A | P01 / Room-1 | Q-A | 0 | 0 to 60 | D1 00:00 → D1 01:00 |
| B | P01 / Room-1 | Q-A | 0, 90 | 90 to 150 | D1 01:30 → D1 02:30 |
| C | P02 / Room-2 | Q-B | 0 | 0 to 60 | D1 00:00 → D1 01:00 |
| D | P02 / Room-2 | Q-B | 1440 | 1440 to 1500 | D2 00:00 → D2 01:00 |

Operating windows and both people’s availability are `[0,240]` and `[1440,1680]`. P01 holds Q-A and requires 30 minutes of rest; P02 holds Q-B and requires zero rest. Each has a 120-minute whole-horizon cap. Expect **Feasible draft** and **120 scheduled minutes** for each person. B starts at 90 because A ends at 60 and P01 needs 30 minutes of rest. A and C can overlap because their people and rooms differ.

3. Change D **Minutes** to `30` and leave the field. Expect D to end at minute 1470, displayed as D2 00:30. P02 becomes 90 scheduled minutes; P01 remains 120.
4. Click **Reset sample**, then set B **Allowed starts** to `0` and leave the field. Expect **Infeasible with these choices**, conflict observations and all four proposal rows retained.
5. Reset again. Choose B **Draft start** `0` to see a person-selected conflict, then `90` to restore feasibility.
6. Reset. Open **Evaluator search allowance**, set **Maximum candidate attempts (1 to 200000)** to `1`, and leave the field. Expect **Search limit reached; feasibility unknown**. Reset restores the default allowance of 50000.
7. From the reset sample, enter `0` for A **Minutes** and leave the field. Expect **Invalid input** with a `requests[0].duration` error. Correct `duration` to `60` in **Synthetic input JSON**, or click **Reset sample**.

## Save, export, reset and recover

**Save JSON** is the implemented export. There is no separate calendar, CSV or PDF export.

1. Finish any pending field edit, then click **Save JSON**. The application requests a download named `synthetic-training-draft.json`; your browser may prompt for a location or rename repeated downloads. Retain the downloaded file.
2. To recover after closing or reloading, reopen index.html and choose the saved file through **Import JSON**.
3. Import validates the snapshot and its result before replacing the workspace. Valid person-selected starts are preserved. A saved review becomes historical metadata; a fresh current-draft review is required.
4. If import is rejected, read the message. The existing workspace is retained. Canceling the file picker makes no change.
5. Click **Reset sample** to return to the built-in inputs and draft. Save first if you need to retain your current work.

**Edits do not survive reloads automatically.** The app has no autosave, localStorage, server persistence or reconnect sync. Reloading starts from the sample; restore changes by importing a previously saved file. Nothing is durably saved until you retain the download.

Snapshots preserve raw input text, input values and ordering, and the computed or selected result. Infeasible, exhausted and invalid-input states can also be saved within the size limit. Exact recovery concerns that content, not whitespace in the outer snapshot file. Core file-format recovery is tested; actual browser save/close/reopen/import remains unverified, as recorded in [verification.md](verification.md).

## Supported input formats and validation

There are two different JSON formats:

| Location | Accepted format |
| --- | --- |
| **Synthetic input JSON** | The editable scheduling input shown by **Reset sample**. |
| **Import JSON** | A versioned application snapshot produced by **Save JSON**, including input text and draft result. A raw scheduling input file is not a snapshot. |

The scheduling input requires `schemaVersion: 1`, `epoch`, `operatingWindows`, `people`, `requests` and `maxNodes`. The epoch has a nonempty `label` and `day2Minute: 1440`. Person fields are `id`, `qualifications`, `availability`, `maxMinutes` and `restMinutes`. Request fields are `id`, `duration`, `allowedStarts`, `personId`, `roomId` and `requiredQualification`. Use the built-in JSON as the complete example; missing and unknown fields are rejected.

Validation rules:

- Retain exactly the unique person IDs P01/P02 and request IDs A/B/C/D. Each request has one existing assigned person, one nonempty room ID and one nonempty required qualification. Qualification coverage uses exact string membership.
- Minutes must be integers within 0 to 2880. Durations must be positive, and each candidate start plus duration must be at most 2880. Rest and whole-horizon duty caps may be zero.
- Windows are `[start,end]` arrays with start less than end. Each complete session must fit within a single operating window and a single person-availability window; adjacent windows are not merged.
- Intervals are half-open: `[start,end)`. Adjacent room use is permitted, but each person’s explicit rest gap still applies between every pair of sessions.
- Each request needs 1 to 100 distinct candidate starts. Duplicate candidates and duplicate qualifications are rejected. Qualification and window lists have at most 100 entries; nonempty text fields have at most 200 characters.
- Empty qualification, availability or operating-window lists are structurally valid but can make scheduling infeasible. A missing qualification is a constraint failure, not an instruction to invent one.
- `maxNodes` must be an integer from 1 to 200000; its default is 50000. It counts attempted candidate choices, not elapsed time.

Snapshots require version 1 and kind `synthetic-training-draft`, with `inputText`, `inputs`, `result` and `draftReview`. Save/import is capped at **1 MiB**. Saved search results are recomputed for consistency; manual results are checked against their exact selected starts. Unsupported versions, inconsistent results and malformed files are rejected. These checks do not authenticate a file or reviewer. Spreadsheet, calendar and remote-service imports are unavailable.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| **Edit pending**, with save/generation disabled | Leave the edited table or evaluator field to commit it. |
| Proposal rows are disabled | Correct the retained **Synthetic input JSON**. The rows are last-valid references while input is invalid. |
| JSON parse error | Check quotes, commas and brackets. Use JSON syntax, not comments or trailing commas. **Reset sample** restores a valid example. |
| Qualification, availability, rest, room or duty conflict | Compare **Constraint observations** with the entered rules. Correct synthetic inputs or offer valid candidate starts; the application does not relax constraints. |
| **Search limit reached; feasibility unknown** | Increase the allowance within the evaluator’s limit or revise the listed choices. Exhaustion is not proof that no solution exists. |
| Review button is disabled | Obtain a complete feasible draft and enter a nonempty **Synthetic reviewer label**. Finish pending edits first. |
| **Import rejected** | Select an unchanged app-generated snapshot of the supported version, no larger than 1 MiB. Raw input JSON belongs in the editor. Your current workspace remains intact. |
| Save fails or no download appears | Check the message and browser download permissions. An oversized snapshot must be shortened before saving. Verify the file exists before closing. |
| Work disappeared after reload | Import your last saved snapshot. There is no automatic recovery for unsaved edits. |

## Known limitations and unavailable integrations

The search is deterministic, synchronous bounded backtracking in the entered request/candidate order. It finds feasibility over listed starts; it does not globally optimize a roster or select personnel automatically. There is no interactive Stop control. Worst-case browser responsiveness remains unverified. Rooms have exclusive use but no separate availability registry. The board covers two days, not a complete weekly planning process.

Unimplemented features include:

- Recurrence and SFTRM interpretation.
- Departmental negotiation/agents.
- Real readiness data.
- Qualification policy beyond supplied values.
- Official-calendar writes.
- Reconnect sync.

No backend, operational-system connection, identity/CAC service, authenticated review, automatic persistence or deployment mechanism is included. Local JSON transfer is not synchronization. Human acceptance, operational policy correctness, government-device approval, security authorization and operational readiness remain separate work. See [path-to-fleet.md](path-to-fleet.md) for unresolved owners and field-validation prerequisites.

## Developer tests, Node required

Using the browser app does not require Node. To run developer tests, open a terminal in this workspace and use Node with the built-in test runner, `node:assert`, `TextEncoder` and `Object.hasOwn`. Node 20+ is recommended; the recorded development run used Node v26.0.0. No dependency installation is needed.

```sh
node --test *.test.cjs
```

| Test file | What it exercises |
| --- | --- |
| `core.test.cjs` | Actual app-core.js calculations, independently checked interval pairs and totals, constraints, invalid input, immutable inputs and search-budget boundaries. |
| `state.test.cjs` | Review invalidation, manual starts, exact snapshot recovery and tampered-file rejection. Mutable test files use OS temporary directories with cleanup. |
| `controller.test.cjs` | Actual inline controller with a minimal DOM adapter: row edits, status changes, review invalidation, manual conflicts, reset and import. This is not a browser test. |
| `packaging.test.cjs` | Byte equality between app-core.js and the marked inline core, classic-script syntax, actual inline calculations in a Node VM, and static packaging/disclosure checks. |

Keep the core in app-core.js and its inline copy in index.html identical when developing. VM and static checks do not exercise browser layout, DOM events, accessibility, downloads or file-picker behavior.

The verification-phase run passed **22 tests, with 0 failures and 0 skips** on Node v26.0.0. The first verification run exposed an incorrectly constructed new test fixture; the corrected fixture and preserved failure are documented in verification.md. Real browser checks, the independent harness report and human source review remain pending. See [verification.md](verification.md) for evidence, earlier failure history and unverified checks, and [test-matrix.md](test-matrix.md) for the browser and human procedures.
