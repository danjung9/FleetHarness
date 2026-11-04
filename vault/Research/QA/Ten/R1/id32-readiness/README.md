# Synthetic dependency review, user guide

## What this application does

This offline workspace helps analysts and leadership reviewers explore how five synthetic changes affect two dependency-timing targets: **Radar restoration** and **Watch qualification**. It calculates finish days and target margins, shows supporting source records, records a local advisory review and exports a text brief.

The scenario is illustrative. Timing results do not certify mission readiness, and no command, maintenance, scheduling or source-system action can be executed.

## Prerequisites and quick start

Use a modern browser with JavaScript enabled. Open **index.html** directly in the browser. No installation, server, internet connection or Node.js runtime is required to use the app. All styles, sample data and application code are embedded in that file.

1. Open **index.html**.
2. In **1. Set up the dependency review**, click **Load synthetic scenario**.
3. Click **Analyze**.
4. Read the results in **2. Review timing and evidence**.

If a previously saved session exists, the application attempts to restore it automatically. To start the walkthrough below, click **Load synthetic scenario**. If prompted, choose **Discard changes and load baseline** to replace the working copy, or **Cancel** to keep it.

## Walkthrough: reproduce the five-change scenario

Start from a freshly loaded scenario and leave **Local what-if repair duration (days)** at its initial value of **3**.

1. Click **Analyze**. Radar should show: `Radar restoration: finish day 9; deadline day 21; margin 12 days; WITHIN DEADLINE.` Its controlling path is **Parts → Repair → Radar test**. Watch finishes day **7**, with margin **14 days**.
2. Click **Apply next change**, then **Analyze** after each change. Compare the results with this table. The timeline records each change's previous and replacement value.

| Scenario state | Deadline day | Radar finish day | Radar margin, days | Watch finish day | Watch margin, days |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 21 | 9 | 12 | 7 | 14 |
| Radar casualty | 21 | 12 | 9 | 7 | 14 |
| Part delay | 21 | 23 | -2 | 7 | 14 |
| Maintenance backlog | 21 | 25 | -4 | 7 | 14 |
| Two qualified personnel detach | 21 | 25 | -4 | 24 | -3 |
| Mission schedule moves | 20 | 25 | -5 | 24 | -4 |

3. After the fifth change, the summary should read **2 timing risks; mission readiness is not assessed.** Both targets are **LATE**. **Apply next change** becomes unavailable and the page says **All five synthetic changes applied.**
4. Click **Inspect radar evidence** and **Inspect watch evidence**. Review the excerpts and source metadata before recording a review.
5. In **3. Record an advisory review**, enter `Check part date with synthetic planner.` in **Review note**.
6. Check **I acknowledge that this is advisory synthetic analysis and a human decision is required.**, then click **Record review**. The confirmation reads **Review recorded locally. No operational action was executed.**
7. Click **Save local session**. Reload the page. If browser storage is available, the page reports **Saved local session restored.** and restores the note and final results.
8. Click **Export advisory brief**. The download is named `synthetic-readiness-brief.txt` and includes `ADVISORY ONLY, Human decision required.`, results, citations, assumptions and the recorded review note.

All day values are whole elapsed days from **2026-11-04 at 00:00 UTC**, not working days. Target margin equals deadline minus finish. It is not upstream slack. **WITHIN DEADLINE** describes timing only, including a zero margin. The personnel-detachment event uses a made-up replacement-availability assumption rather than a staffing-readiness calculation.

## Inspect sources and interpret results

1. Analyze the current working model.
2. In **2. Review timing and evidence**, read each target's finish, deadline, margin, path and arithmetic explanation.
3. Click **Inspect radar evidence** or **Inspect watch evidence** to expand its source panel. Click again to collapse it; the working model and note remain in memory.
4. Check record IDs and revisions, exact excerpts, stable asset identity, observation and last-sync timestamps, excerpt offsets and model links.

Final radar evidence includes parts r2, casualty r1, maintenance r2, test r1 and schedule r2. Watch evidence includes manning r2, qualification r1 and schedule r2. Original source revisions remain in the local model. Source records are synthetic and read-only; scenario changes and what-if edits affect a local copy.

Source ages use the snapshot's simulated as-of time, not the current wall clock. No operational freshness threshold is approved. Considerations are ordered by lowest known target margin; that order is illustrative and has no approved operational priority meaning. Unknown targets are identified separately.

## Try a missing estimate or a local what-if

1. Load a fresh baseline for the expected numbers below.
2. Clear **Local what-if repair duration (days)** and click **Analyze**.
3. Radar shows **UNKNOWN**, with finish and margin unavailable, and **Lower-bound path only; no proven controlling path.** Watch still finishes day **7**, with margin **14 days**.
4. Enter **3** and click **Analyze**. Radar returns to finish day **9**, margin **12 days**.

Other nonnegative whole-number durations are supported. Local edits create synthetic what-if evidence records. A blank value means an unknown estimate; **0** means a known zero duration. Changing a calculated input clears current results and invalidates its review. Analyze and record a new acknowledgment-gated review before exporting again.

Applying later scenario changes can replace a what-if duration: the casualty sets repair duration to **6**, and the backlog sets it to **8**. Returning the field to **3** after those events does not reset parts availability, personnel availability or the deadline. Use **Load synthetic scenario** for a full baseline reset.

## Recover from an invalid graph

These examples are optional diagnostic controls, separate from the ordinary scenario workflow.

1. Click **Advanced model checks**.
2. Under **Synthetic model example**, select **Cycle between repair and radar**, then click **Analyze**. The page reports a dependency cycle and hides current results.
3. Select **Missing task reference** and Analyze. The diagnostic identifies `missing-task` referenced by `repair`.
4. Select **Valid model / Restore valid model**, then Analyze to recover the current scenario. This selection removes the diagnostic example; it does not undo applied events or duration edits.

## Supported inputs and validation

The user interface accepts the bundled synthetic scenario, its five ordered changes, a numeric repair-duration edit, a free-text **Review note**, the acknowledgment checkbox and the diagnostic model selections. It has no file import, CSV/JSON upload, arbitrary graph editor or operational-data entry workflow. There is no editable deadline field.

Repair durations must use nonnegative whole-number digits within JavaScript's safe-integer range. Leave the field blank for unknown. Negative, fractional and oversized values are invalid; cumulative finishes beyond the safe-integer range also block analysis. The app does not round estimates or reuse an older value after rejecting a draft. Native number controls may reject or clear unsupported text.

The application core also validates graph structure, unique tasks and dependencies, target existence, whole-number timing values, stable asset identities and source provenance. Cycles, dangling references, unresolved or conflicting sources, and missing or future-dated source timestamps block analysis. There is no source-conflict editor or timestamp repair screen; load the bundled baseline to recover from damaged saved data.

## Save, export, reset and reload

### Save a working session

1. Click **Save local session** after loading a scenario. Saving an unfinished working session does not require a review.
2. Check for **Local session saved on this device.**
3. Save again after later edits or a recorded review if you want those changes retained.

Saving stores one session in this browser's localStorage: the working model and records, event history, repair draft, note, acknowledgment, analysis and review context, and local action history. It replaces the previous saved session. Unsaved edits survive ordinary interactions within the open page but are lost on reload or closing it; the last successfully saved session is restored instead. There is no autosave, cross-browser transfer, cloud backup or reconnect sync.

Keep the same browser profile and file location. File-origin storage behavior varies by browser, and private browsing or browser cleanup may remove it. The app does not encrypt stored data. **Local review and action history** shows a local record of actions, not a trusted or tamper-resistant operational audit.

### Record and export a review

1. Analyze and inspect the current results.
2. Enter a **Review note** and check the advisory acknowledgment.
3. Click **Record review**. If the model differs from previously saved content and the page asks you to save first, click **Save local session**, then **Record review** again.
4. Click **Save local session** once more to retain the recorded review across reloads.
5. Click **Export advisory brief** to download the UTF-8 text brief.

Export requires a current valid analysis and its recorded review. Editing the note or acknowledgment invalidates the recorded review; analyzing again also requires another review. The exported brief is a readable report, not an importable session backup. Export does not save the browser session.

### Reset or remove data

1. Click **Load synthetic scenario** to replace the working model, note and local history with a fresh baseline.
2. If there are unsaved changes, choose **Discard changes and load baseline**, or **Cancel** to preserve them.
3. Click **Save local session** if you also want the new baseline to replace the previously stored session.

Resetting the working copy alone does not delete the previously saved session. There is no in-app delete-storage control; use the browser's site-data/storage controls to remove persisted data. There is no undo or individual-event rollback.

## Troubleshooting

| Symptom or message | What to do |
| --- | --- |
| **Analyze** or **Apply next change** is unavailable initially | Click **Load synthetic scenario** first. |
| Results disappear after an edit | Click **Analyze**. Prior results are intentionally unavailable until recalculation. |
| Radar is **UNKNOWN** | Supply the missing repair duration and Analyze. An unknown estimate must not be interpreted as safe. |
| Duration validation fails | Use whole-number digits such as `3`, or clear the field for unknown. |
| A cycle or missing-task error appears | Under **Advanced model checks**, select **Valid model / Restore valid model**, then Analyze. |
| Review acknowledgment error | Check the advisory acknowledgment and click **Record review** again. Your note remains. |
| Asked to save different committed content | Click **Save local session**, then **Record review**; save again to retain the review. |
| **Export advisory brief** is unavailable | Analyze the current model, acknowledge and record its review. Re-record after note changes. |
| **Storage unavailable. Draft remains in memory and is not saved.** | Keep the page open. Check browser storage permissions or quota. Export a reviewed brief if possible; unsaved session recovery after closing is unavailable. |
| Saved session is unavailable or invalid | Load a fresh synthetic scenario. Unsupported or damaged saved data cannot be repaired or imported through the interface. |
| A saved session does not return | Check that you saved, are using the same browser/profile/file location, and have not cleared site data. |
| No download is visible | Check browser download permissions and download history. Actual download behavior remains subject to host browser verification. |

Native controls support Tab navigation, button activation with Enter/Space, checkbox toggling with Space and selector navigation with arrow keys. The page includes visible focus styles and a narrow-screen layout; keyboard, accessibility and visual behavior still need browser verification and human review.

## Known limitations and unavailable integrations

This is a synthetic prototype with no approved capability-dependency model or SME-reviewed scenario. It omits shared-personnel constraints, competing parts and probabilistic reliability. It has no approved risk-ranking key, noise threshold, freshness policy or manual assembly-time baseline. Ten source criteria remain deferred, so full source requirements are not met.

There are no operational connectors, source writebacks, authenticated ingestion, CAC integration, source synchronization, reconnect transport, government-device installation approval or deployment. Local storage and action history do not provide encryption or trusted audit assurance. No operational response or command decision is automated. Local tests do not establish authority to operate or operational readiness.

See [path-to-fleet.md](path-to-fleet.md) for unresolved owners, integration dependencies and field-validation prerequisites.

## Developer tests, Node required only here

Using the browser app requires no Node installation. To run developer tests, use **Node.js 18 or later**, open a terminal in this folder, and run:

```sh
node --test *.test.cjs
```

No npm install or external packages are needed. The tests exercise the actual exported **core.cjs** and extract/execute the marked inline core from **index.html** in a Node VM. They cover scenario arithmetic, uncertainty, ties, delayed availability, graph failures, provenance, review/export consistency, saved-session validation and storage-adapter failures. They do not drive a browser or prove UI usability.

The verification run passed **26 tests**, with zero failures or skips. `adversarial.test.cjs` adds overflow, saved-input and review consistency, complete exported change history, and shipped controller-handler checks using a minimal DOM adapter. This adapter does not render the page or replace browser verification. Saved analyses inconsistent with the displayed duration or diagnostic model are rejected; a restored review inconsistent with its note or acknowledgment is cleared. One bounded repair was applied; the original failing output is retained in verification-initial.txt and the passing output in verification-node.txt. Desktop/narrow browser journeys, actual downloads, file-origin persistence, screenshots and human review remain pending in the available verification notes.

For source changes, keep the inline core between `APP_CORE_START` and `APP_CORE_END` consistent with **core.cjs**, then rerun the tests. Frozen acceptance and UX contracts must remain unchanged. See [verification.md](verification.md) for the evidence boundary and recorded results.
