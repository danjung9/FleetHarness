Primary deferrals: none.

# CASREP Command user guide

## What the application does

CASREP Command demonstrates drafting, command review, return for revision, competing-amendment reconciliation and simulated release of a fictional casualty report. It is for evaluators and prospective workflow users representing Sailor/LPO, Division Officer, Department Head, Engineer Officer/CHENG, XO and CO. One person can switch among these simulated roles.

**Use synthetic information only. Not validated against real CASREP format or operational rules. No message is transmitted.** Selecting a role does not authenticate an identity or establish release authority.

## Prerequisites and quick start

Use a modern browser with JavaScript enabled, local browser storage available and permission to download files. No install, server, account, internet connection or Node runtime is required to use the application.

1. Open [index.html](index.html) directly in your browser.
2. Select **Load fictional CASREP**. If a workspace already exists, the browser asks before replacing it and its history.
3. Look for **Saved locally**, status **Draft** and current holder **Sailor/LPO**.
4. Review **1. Draft the casualty report** and **Message preview**. Continue with the workflows below.

**Lifecycle and local data** is expanded initially under **4. Release package**. The page also contains **2. Command review**, **3. Competing amendment review**, **4. Release package**, **History & monitoring** and **Guidance**. Local-file storage behavior varies by browser; keep downloads of work you need to retain.

## Draft and save a report

1. Load the fictional sample. This is the app's starting point; there is no separate blank-report creation button.
2. Under **Simulation: acting role**, select **Sailor/LPO**.
3. Edit the labeled report fields. **Message preview** reflects entered content, including unfinished changes; it is not proof that those changes have been saved as a revision.
4. Select **Save draft**. A changed report creates a retained revision and returns routing to Sailor/LPO. Previous approvals become historical and must be obtained again.
5. To abandon edits since the last committed revision, select **Discard changes**. This does not delete earlier revisions.

Saving unchanged content does not create another revision. Validation errors preserve entered values so you can correct them and try again.

## Route, comment, return and release

1. Save or discard unfinished report edits. As **Sailor/LPO**, select **Submit to Division Officer**. Submission supplies the originator's approval.
2. Select **Division Officer** in **Simulation: acting role**. To comment, enter text in **Revision comment** and select **Add comment**. Comments do not invalidate approvals.
3. To return the report, the current holder enters **Reason for return** and selects **Return for revision**. Status becomes **Returned for revision**; the reason remains in history.
4. Select **Sailor/LPO**, revise the report and select **Save draft**, then **Submit to Division Officer** again.
5. Select **Division Officer** and **Approve and forward**. Repeat with **Department Head**, **Engineer Officer/CHENG** and **XO**, in that order. The current holder and routing board show progress.
6. When the holder is **CO**, select **CO**, check **I confirm this is a synthetic CO release only.**, then select **Simulate release**.
7. Expect **Simulated release, not transmitted** and a summary naming all six approving roles. The released snapshot is immutable within the application.

Only the current holder can make routing decisions. Before release, simulated roles can add comments to a clean report. A return needs a nonempty reason. Changed content requires fresh sequential approvals; switching directly to CO cannot bypass them.

## Review competing amendments

This is a local simulator, not synchronization with another device.

1. Before release, save or discard report edits and select **Sailor/LPO**.
2. Select **Simulate competing amendments**. Expect **Conflict: 2 competing amendments**.
3. Inspect **Proposal A** and **Proposal B**, including their full report values. A proposes restoration at `2026-11-05T20:00:00Z`; B proposes `Standby pump online; request fictional seal kit.` as the corrective action.
4. Review or edit **Chosen restoration estimate** and **Chosen corrective action**. Leave the main draft fields unchanged while resolving the conflict.
5. Select **Confirm reconciliation**. Expect **Resolved: both source amendments retained** and holder **Sailor/LPO**.
6. Submit again and complete the full review sequence. Reloading preserves the reconciled report and both source proposals when local storage succeeds.

Release is blocked while the conflict remains unresolved. The resolution creates a revision with both competing revisions as parents; it does not select a winner by device time.

## Reproducible synthetic walkthrough

Start with a fresh sample. Loading it over existing work replaces that workspace after confirmation.

1. Select **Load fictional CASREP**. Check these sample values:

   | Field | Sample value |
   | --- | --- |
   | Ship / hull | USS Example Harbor (DDG-998) |
   | Report serial | SYN-CASREP-0001 |
   | Report type / Casualty category | INITIAL / 3 |
   | Casualty time (UTC) | 2026-11-04T09:00:00Z |
   | Equipment | CHWP-2 |
   | Casualty description | CHWP-2 failed. |
   | Operational impact | Reduced cooling redundancy. |
   | Corrective action | Standby pump online. |
   | Maintenance JSN | SYN-998-0042 |
   | Restoration estimate (UTC or UNKNOWN) | 2026-11-05T18:00:00Z |

2. As Sailor/LPO submit. As Division Officer, add comment `Check cooling impact.` and return with reason `Specify the affected cooling loop`.
3. As Sailor/LPO, change **Casualty description** to `CHWP-2 failed. Auxiliary cooling loop B.` and select **Save draft**. Submit again.
4. Still acting as Sailor/LPO, simulate competing amendments. Confirm the proposed restoration and seal-kit corrective action using the reconciliation workflow above.
5. Submit again. Approve as Division Officer, Department Head, Engineer Officer/CHENG and XO. As CO, check the confirmation and simulate release.
6. Expect **Simulated release, not transmitted**, six current approvals, the retained Division Officer return and both retained proposals.
7. Download both release outputs. The message should contain the revised cooling-loop description, `2026-11-05T20:00:00Z`, the fictional seal-kit request and the synthetic-only banner. Its record, revision and digest should match the released snapshot in the history JSON. Generated revision numbers depend on the actions taken; no fixed revision number is required.

For a longer demonstration script, see [walkthrough.md](walkthrough.md) or select **Live walkthrough** under **Guidance**. **Fielding brief** opens the embedded guidance and **Print brief** invokes browser printing. A portable version is [fielding-brief.md](fielding-brief.md); print layout still needs human review.

## Linked amendments, cancellation and expiry

1. After simulated release, open **Lifecycle and local data** under **4. Release package**.
2. Select **Create linked amendment**. A new UPDATE draft is selected, linked to the original serial, with no inherited approvals. Expect **Draft, linked UPDATE** and **Original: simulated release retained**.
3. As Sailor/LPO, edit and save the linked draft. Route it through all six roles independently. You can change **Report type** to CORRECT or CASCOR if its required fields are supplied.
4. To cancel an unreleased draft, select **Cancel draft**, check **Cancel this draft and retain its history.**, then select **Confirm cancellation**. Expect **Cancelled draft, history retained**.
5. To expire an unreleased draft, enter **Synthetic expiry reason** and select **Confirm manual expiry** as Sailor/LPO. This is an explicit local marker, not an automatic Navy deadline.

Cancelled and expired drafts cannot continue routing or be edited. Original release snapshots remain retained. Within this demonstration, a released CORRECT marks the linked record superseded and a released CASCOR marks it closed. These are synthetic assumptions requiring operational review. There is no record-selection/history-restore control for reopening older records.

## Input formats and validation

All input is entered through fields; file import is unavailable.

| Input | Accepted values or rule |
| --- | --- |
| Report type | INITIAL, UPDATE, CORRECT, CASCOR |
| Casualty category | 2, 3, 4 |
| Required text | Ship / hull, Report serial, Equipment, Casualty description, Operational impact, Corrective action and Maintenance JSN must be nonempty |
| Casualty time (UTC) | Valid UTC timestamp exactly like `2026-11-04T09:00:00Z` |
| Restoration estimate (UTC or UNKNOWN) | Valid timestamp in the same format, or uppercase `UNKNOWN` |
| Related synthetic report | For UPDATE/CORRECT/CASCOR, a different existing report's serial or companion reference `SYN-CASREP-0000` |
| CASCOR closure | Valid Actual restoration time (UTC) and nonempty Closure narrative |
| Lengths | Up to 2,000 characters each for casualty, impact, corrective action and closure; 100 for other report fields |
| Revision capacity | Up to 5,000 retained revisions per workspace |

Dates without seconds, local dates, fractional seconds and timezone offsets are not accepted by the UTC validator. These checks demonstrate a fictional schema; they do not certify NWP formatting or JSN correctness.

## Save, reload, export and recover

Report-field edits are stored as an unfinished buffer when local storage is available. **Save draft** commits validated content to the version history. Records, approvals, comments, audit, simulated releases and the unfinished report buffer are intended to survive reload in the same browser storage context. A restored dirty buffer displays **Unsaved changes restored locally**. Comments and return-reason text that has not been submitted, and unconfirmed reconciliation-field edits, are not stored as unfinished buffers.

Under **4. Release package**, use:

| Button | Download and contents |
| --- | --- |
| Download synthetic CASREP message | `synthetic-casrep-message.txt`: selected report's frozen simulated release; requires release first |
| Download synthetic CASREP history | `synthetic-casrep-history.json`: workspace records, revisions, decisions, comments, audit and releases; available before release too |
| Download recovery workspace | `casrep-recovery.json`: workspace, current report buffer and raw persisted storage when readable |

Downloads are UTF-8 local files; they send nothing externally. History and recovery downloads may contain unfinished report content as well as committed history. The app cannot import or automatically restore these files.

If a storage write fails, do not assume the visible draft is durable. Download recovery before closing the tab. Unreadable or unsupported stored data blocks further writes and is left in place; download recovery before explicitly clearing it. Local storage is unencrypted and can be edited or removed through browser tools. Private browsing, storage quotas, moving the HTML file, changing browsers or clearing browser data may affect persistence.

## Stop or reset the demonstration

1. Select **Stop demonstration** to block domain changes and retain work. Downloads remain available. Avoid entering edits while stopped; they cannot be persisted.
2. Select **Resume demonstration** to continue deliberately.
3. To remove all workspace data, download any needed files first. Open **Lifecycle and local data**, select **Clear local workspace** and confirm the browser prompt. The page reloads with no report. Cancel the prompt to keep the workspace.

Reset deletes local reports, unfinished work and history. Loading another fictional sample also replaces the current workspace after confirmation. Neither action removes files already downloaded.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| Enter a casualty description. | Fill **Casualty description**, then **Save draft**. Other required-field errors work the same way. |
| UPDATE requires a related synthetic report. | Enter `SYN-CASREP-0000` for a standalone sample exercise, or the serial of another workspace record. |
| CASCOR requires a restoration time and closure narrative. | Supply **Actual restoration time (UTC)** and **Closure narrative**, then save. |
| Save or discard unsaved changes before a decision. | As Sailor/LPO, choose **Save draft** or **Discard changes** before routing, commenting or reconciling. |
| Only the current holder… / Release blocked: current holder is… | Match **Simulation: acting role** to the current holder and complete the route in order. |
| Release blocked: resolve competing amendments. | Reconcile both proposals as Sailor/LPO, then submit and obtain fresh approvals. |
| Confirm synthetic CO release first. | At the CO stage, check the release confirmation before **Simulate release**. |
| This record is immutable. Create a linked draft. | For a released report, use **Create linked amendment**. Cancelled/expired drafts remain locked. |
| Complete simulated release before downloading the message. | Finish the six-role review, or download history/recovery instead. |
| Not saved / Workspace could not be read | Download recovery before closing or resetting. Check browser storage permissions; corrupt/unsupported data requires explicit clearing before a new workspace can be saved. |
| Report disappears after reopening | Use the same browser and file location, check storage settings and retain exports. Automatic backup restoration is unavailable. |
| Demonstration stopped. Resume to continue. | Select **Resume demonstration**. |
| Revision limit reached | Export the workspace; start a fresh sample or clear local data only after retaining needed files. |

## Known limitations and integration boundaries

The app has no authenticated multiuser access, trusted signatures, secure audit service, real synchronization, receiver acknowledgements, official transmission, CAC integration, Navy messaging connector or Microsoft 365 connector. Local actor names, times and deterministic digests are not trusted authentication or signatures. No classified data handling, approved encryption, operational retention policy, deployment authorization or authority to operate is established.

Authoritative CASREP formatting, routing, JSN semantics and lifecycle rules need independent domain validation. There is no import, automatic restore, managed upgrade/migration or rollback facility. The amendment simulator does not connect to remote systems. Browser, keyboard, visual and operational validation remain separate from the core tests.

See [path-to-fleet.md](path-to-fleet.md) for unresolved owners, approved-device and hosting decisions, security work and field-validation prerequisites.

## Developer tests

Using the application needs only a browser. Running developer tests separately requires **Node.js 18 or later**; no packages or installation step are needed.

From the directory containing `index.html` and `casrep.test.cjs`, run:

```sh
node --test casrep.test.cjs
```

The tests extract the actual marked inline core from `index.html` and execute it with Node's built-in VM. They cover validation, routing and returns, dirty/stale approvals, immutable release snapshots, conflict merging and reconciliation, storage failure/reload with an injected memory adapter, linked lifecycle actions and stop/resume. They do not operate a browser or prove real browser storage behavior.

The verification run executed `node --test casrep.test.cjs`: 11 passed, 0 failed, 0 skipped. Coverage includes incomplete stored envelopes, dangling selections, routing replay and stale content binding. Host browser journeys and human review remain pending; no browser pass is claimed. See [verification.md](verification.md) for evidence and outstanding checks.
