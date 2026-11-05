Primary deferrals: none. This synthetic demonstration does not establish real crew readiness, SFTRM conformance, official formats, actual human prototype acceptance or operational authorization.

# PB4T synthetic training board

## Purpose and audience

This offline prototype helps training coordinators and departmental representatives explore a fictional Planning Board for Training week. Engineering, Combat Systems, Damage Control, Flight Operations and Weapons participants submit deterministic proposals to a shared constraint engine. The board shows allocations, rejected proposals, crew loading, required occurrences and a revision-specific synthetic review record.

Use fictional data only. **Optimize schedule** searches a finite set of candidates for feasibility; it does not establish a globally optimal or operationally safe schedule.

## Prerequisites and quick start

Use a modern browser with JavaScript enabled. Open [index.html](index.html) directly from the delivered folder. No installation, server, account, network connection or Node runtime is required to use the application. Browser-local storage and downloads must be permitted for persistence and export.

1. Under **1. Prepare the fictional week**, choose **Weekly baseline** in **Synthetic scenario**.
2. Click **Load synthetic sample**.
3. Leave **Search node budget** at `50000` and click **Optimize schedule**.
4. Read the board and reports below. Use the top **Workspace**, **Weekly board** and **Reports & review** links to move between sections.

If replacing accepted work or unsaved changes, the app asks **Replace saved work and drafts?** Choose **Confirm replacement** to proceed or **Cancel** to keep the workspace. Replacing an ordinary unaccepted result may occur without confirmation.

## Reproducible baseline walkthrough

Start with **Weekly baseline**, load it and optimize as above. The initial proposals conflict because Engineering and Damage Control both request C01 and Training Room on Monday at 08:00.

The expected feasible board is:

| Drill | Date and time, November 2026 | Assigned person | Resource |
| --- | --- | --- | --- |
| Engineering casualty control | Mon 09, 08:00 to 10:00 | C01 Avery Vale | Training Room |
| Combat Systems exercise | Mon 09, 10:00 to 11:00 | C03 Casey North | Training Room |
| Damage Control drill | Mon 09, 11:00 to 13:00 | C04 Riley Marsh | Training Room |
| Flight quarters | Mon 09, 13:00 to 14:00 | C06 Taylor Finch | Flight Deck |
| Weapons drill | Tue 10, 09:00 to 10:00 | C02 Morgan Reed | Training Room |

The **Departmental Negotiation Log** explains Damage Control's rejected original proposal and accepted alternative. The **Conflict and Resolution Report** reports zero personnel, resource, availability, qualification and fatigue violations. **Periodicity Coverage Report** shows `SYN-P1: 5 required; 5 covered; 0 overdue; 0 uncovered.`

The **Personnel Loading Heatmap** includes daily values and weekly totals: C01 2h, C02 1h, C03 1h, C04 2h, C05 0h and C06 1h. These are expected synthetic results, supported by application-core tests; browser verification remains pending.

## Edit, validate and recover an allocation

1. Generate the baseline board.
2. Under **Edit an allocation**, choose `DC-1` in **Occurrence**, C01 in **Assigned person**, and `2026-11-09T08:00` in **Start time**.
3. Click **Preview edit** to compare the saved 11:00/C04 allocation with the draft 08:00/C01 allocation. A draft blocks acceptance.
4. Click **Save edit**, then **Validate board**. Validation reports `DC-1 conflicts with ENG-1: C01 and Training Room.` Saving alone does not establish feasibility.
5. Set **Start time** to `2026-11-09T11:00` and **Assigned person** to C04. Click **Save edit**, then **Validate board** again.
6. Review the corrected revision before accepting it.

**Discard draft** restores the saved allocation. Save or discard an allocation draft before changing the selected occurrence. Each saved allocation edit creates a new board revision, clears review confirmation and invalidates earlier acceptance. Saving retains the drill duration and resource; neither is editable here.

## Correct crew qualifications or availability

1. Choose **Missing EOOW qualification**, then **Load synthetic sample** and **Optimize schedule**. Engineering cannot obtain a qualified EOOW assignment.
2. Under **Roster, availability and qualifications**, select C01 in **Person**.
3. Enter `EOOW, Fire Party Leader` in **Qualifications (comma-separated)**. Keep the displayed availability unchanged.
4. Click **Save crew**, then **Optimize schedule**. The baseline five occurrences can now be covered.

To try availability recovery:

1. Load **Unavailable flight crew** and optimize; Flight has no available crew in its allowed window.
2. Select C06 in **Person**. Set **Available from** to `2026-11-09T13:00` and **Available until** to `2026-11-09T14:00`.
3. Click **Save crew**, then **Optimize schedule**.

Unsaved crew changes must be saved before selecting another person; switching is blocked with a recovery message. Saving a different editor preserves those changes and continues to block acceptance until all editors are saved.

The crew editor displays the person's first availability window. Saving a different interval replaces that person's availability list with that one interval; it does not append a recurring window. Clearing both availability fields leaves existing windows unchanged. Save crew changes before selecting another person. Each editor tracks its own unsaved state.

## Inspect recurrence and record completion history

1. Load **Two-day DC recurrence** and optimize.
2. Inspect **Periodicity Coverage Report**: eight required occurrences are covered, including DC on 09, 11, 13 and 16 November.
3. Note that DC-4 on 16 November remains required even though it falls outside the displayed 09 to 15 November week. Its deadline is 17 November 00:00.

For overdue-history recovery:

1. Load **Overdue completion history** and optimize. Six occurrences are required; five are covered and DC-0 is overdue. Acceptance is blocked.
2. Under **Policy, operations and completion history**, enter `DC-0` in **Completed occurrence** and `2026-11-07T11:00` in **Fictional completion time**.
3. Click **Save history**, then **Optimize schedule**. Coverage becomes six required and six covered.

Completion history records fictional past work; it does not schedule an overdue drill retroactively. Recurrence templates and deadlines come from the supplied examples and are not editable through the UI.

## Demonstrate an explicit policy change

1. Load **Fatigue boundary** and optimize. C01 has 2.5h prior duty plus 2h Engineering duty, exceeding the fictional 4h daily limit.
2. Click **Request daily limit 4.5h**. This records an unapplied request; it does not change the constraint.
3. Enter `4.5` in **Daily duty limit (hours)** and `Synthetic boundary demonstration` in **Policy change reason**.
4. Click **Save policy**. The version changes from SYN-P1 to SYN-P2, and earlier validation/review becomes invalid.
5. Click **Optimize schedule**. C01's counted duty is 4.5h against the new 4.5h daily limit.

This is a synthetic policy-edit demonstration, not operational approval. Weekly and duty-block rules remain fixed in the application.

## Review, accept and export

1. Finish saving changes and obtain a valid complete board using **Optimize schedule** or **Validate board**.
2. Review **Departmental Negotiation Log**, **Conflict and Resolution Report**, **Periodicity Coverage Report**, **Personnel Loading Heatmap**, and any policy-change request.
3. Under **Synthetic Schedule Review Record and Export**, enter a **Reviewer alias**, such as `Alex Demo`.
4. Check **I reviewed the board, coverage, loads and all policy changes. This is synthetic acceptance only.**
5. Click **Accept synthetic schedule**. For the first baseline revision, the status becomes `Accepted synthetic revision 1 by Alex Demo. Not authorization to execute drills.`
6. Click **Export review** to download `pb4t-synthetic-review.txt`.

The readable text export includes committed assignments, displayed reports, counted duty, policy, search status and review state. Export is also available before acceptance; check its status before sharing it. It is a report, not an importable workspace backup. There is no import or restore-from-export control, and unfinished draft values are not a complete part of the exported report.

## Input formats and validation

| Input | Supported format and checks |
| --- | --- |
| Search node budget | Integer from 1 to 200000; default 50000. |
| Date/time fields | Native browser date/time controls, such as `2026-11-09T13:00`; displayed formatting depends on the browser. Use the fictional ship clock, without timezone conversion. |
| Qualifications | Comma-separated exact role names, such as `EOOW, Fire Party Leader`. Matching is case-sensitive. |
| Availability | Both endpoints together, with the end after the start. A saved changed interval replaces existing availability. |
| Daily duty limit | Positive numeric hours up to 24; the field provides 0.5h steps. A nonblank policy-change reason is required. Zero is rejected. |
| Completion history | An existing occurrence ID and a time within its release/deadline interval. |
| Board edit | An existing occurrence/person and a valid start time. Full constraint checks run separately through **Validate board**. |
| Synthetic acceptance | A valid complete board, no pending input/allocation changes, a nonblank reviewer alias and checked review confirmation. |

The clock epoch is 09 November 2026 00:00. Sample training windows are weekdays 08:00 to 17:00, with an explicit next-Monday extension for boundary work. Flight Deck opens at 13:00 on the first Monday. Intervals may touch without overlapping. The fictional default daily limit is 4h and weekly limit is 12h. Work separated by less than 12h merges into a duty block whose span may not exceed 8h. Prior duty counts toward loading. None of these values encodes real SFTRM or approved fatigue policy.

## Saving, reloads, reset and recovery

The app uses browser localStorage for the workspace, committed assignments, reports and review record when save/search/review actions occur. Allocation and input drafts are also stored when their fields change and restored on reload when storage is available. Reviewer alias and search budget are captured with persistence actions; typing in those two fields alone does not trigger a save. The review checkbox is not restored as checked.

During a search, input, save, replacement and acceptance controls are disabled so the search cannot commit against changing inputs. **Stop search** stays available and restores controls without committing the interrupted result.

Keep using the same browser profile and file location. Persistence for directly opened local files depends on browser behavior; moving the file, clearing browser data or using private browsing can affect it. There is no server sync or multi-user storage.

For allocation drafts, use **Save edit** or **Discard draft**. Other editors have their own **Save crew**, **Save policy** and **Save history** buttons and no general discard-input button. Reload can restore those unfinished inputs, so it is not a reliable way to discard them. Correct and save the relevant editor, or deliberately replace the workspace with a sample. Saving one editor preserves the pending state of the other editors. All pending editors must be saved before search or acceptance.

To clear everything, click **Reset workspace**, then **Confirm replacement**. **Cancel** keeps the work. Reset removes the browser-local workspace and reloads the page; there is no undo. Export useful committed results first.

If the app reports unavailable storage, use **Export review** before closing and do not rely on reload persistence. If stored work cannot be restored, use the explicit reset flow or load a fresh synthetic sample. Export cannot recreate a lost workspace.

## Troubleshooting

| Message or symptom | Next action |
| --- | --- |
| Load a synthetic sample first | Select a scenario and click **Load synthetic sample**. |
| Search node budget must be an integer from 1 to 200000 | Enter `50000` and retry. `0` is invalid. |
| Search exhausted, feasibility unresolved | Increase the budget within the allowed range or revise inputs. Budget `1` demonstrates this state; exhaustion does not prove infeasibility. |
| Infeasible over supplied candidates | Read the occurrence-specific reason. Correct crew/history/policy where supported. **Impossible DC deadline** intentionally has no solution; its deadline has no UI editor, so select another sample to continue. |
| Save or discard the draft before searching/accepting | Finish the relevant editor save. Use **Discard draft** for allocation changes, or confirm replacement with a sample for a fresh start. |
| A valid complete schedule is required before acceptance | Correct conflicts or overdue history and regenerate/validate before reviewing. |
| Acceptance asks for an alias or confirmation | Enter **Reviewer alias** and check the review statement again after the latest revision. |
| Availability end must be after its start | Supply both endpoints and make the end later than the start. |
| Old board remains after a failed search | A previous board may be retained. Consult current search/review status; retained rows alone do not mean the latest search succeeded. |
| Need to interrupt a search | Click **Stop search** while active. It discards the uncommitted search result and preserves inputs and the previous board. |
| Export does not appear | Check the browser's download permissions and download list. The expected filename is `pb4t-synthetic-review.txt`. |

## Known limitations and unavailable integrations

This is a small, dependency-free demonstration with explicit candidate rankings and deterministic simulated departmental participants. It has no model service, global objective, production-scale benchmark or automatic selection across all possible crew/time allocations. Re-running optimization creates another revision and requires another review.

The UI edits crew qualifications, one availability interval, daily duty policy, completion history and allocation start/person. It cannot create drills or people, edit resources, change durations, define arbitrary calendars/recurrence, or import files. Those changes require developer edits to the inline fixture/core. Some report text is tailored to the supplied scenarios; do not treat it as a general operational audit.

There is no DST handling, real SFTRM integration, official-format validation, roster feed, CAC/identity verification, digital signature, secure managed retention, server sync, government-system connection, drill execution or distribution. Reviewer aliases are unverified text. Local synthetic acceptance is distinct from human prototype approval and operational authority.

## Developer tests and verification status

Node is needed only to run developer tests. Use a current Node release supporting `node:test`; the recorded local run used Node 26.0.0. No package installation is required. From the delivered folder run:

```sh
node --test domain.test.cjs
```

The 20 tests extract and execute the actual inline `PB4TCore` from `index.html` in a Node VM. They cover the expected baseline, independent overlap/load checks, alternative crew, qualifications and availability, exhausted versus infeasible search, recurrence/history, fatigue boundaries and allocation validation. The verification run on 2026-11-04 passed all 20 with zero failures, cancellations, skips or TODOs on Node v26.0.0. Added adversarial cases cover malformed mandatory inputs, duplicate allocations, resource substitution, exact duty/rest boundaries and an independent allocation oracle across feasible scenarios. Five tests execute the real inline controller through a minimal DOM/storage adapter to check draft preservation, search cancellation, acceptance and reload state. This adapter does not establish browser behavior, real localStorage availability, layout or downloads. Two added regressions failed before the single bounded repair; see verification.md for preserved failure details.

Browser journeys, screenshots, narrow layout, keyboard/visual accessibility and human acceptance remain unverified in the available evidence. See [verification.md](verification.md) for verification notes and [path-to-fleet.md](path-to-fleet.md) for policy-owner, security and field-validation prerequisites.
