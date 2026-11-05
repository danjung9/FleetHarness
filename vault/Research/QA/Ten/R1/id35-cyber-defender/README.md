# Watchdesk user guide

Watchdesk is an offline workbench for cyber/IT analysts and training reviewers. It explains synthetic configuration evidence, prepares a proposed change, records a review of its exact revision and exports an analyst handoff. Findings include asset and control citations, uncertainty and next steps.

Use synthetic data only. The example control is planning-defined training content, not an official STIG. Review records do not authorize execution, and the application never scans a network or changes a device.

## Prerequisites and quick start

1. Open [index.html](index.html) directly in a modern browser with JavaScript enabled.
2. Allow local downloads if you want to export a handoff. Browser storage must be available for work to survive reloads.
3. Start with **Load synthetic sample**, then **Analyze evidence**.

No installation, server, internet connection, package manager or Node runtime is required to use the application. Everything needed by the app is inline in `index.html`. Local-file storage behavior varies by browser; check the storage message at the top of the workbench.

The page has three main sections: **Evidence workbench**, **Proposal and review**, and **Analyst handoff**. The header links jump to each section. Native fields and buttons can be reached with Tab; activate buttons with Enter or Space.

## Walkthrough: investigate, review and export the sample

This walkthrough uses the built-in `SYN-SEED-1` sample. If a previous proposal is present, export it first if needed, click **Load synthetic sample**, then deliberately choose **Discard and load sample**.

1. In **Evidence workbench**, click **Load synthetic sample**. The **Synthetic evidence JSON** field contains two `training-service` assets captured at `2026-11-01T12:00:00Z`: LAB-A has `auditEnabled: false`, and LAB-B has `auditEnabled: true`.
2. Click **Analyze evidence**. Under **Configuration explanations**, expect **1 finding; 1 benign; 0 insufficient evidence.** The individual results are:

   - **LAB-A: Finding, auditEnabled=false; SYN-AUDIT r1 requires true.**
   - **LAB-B: No finding, auditEnabled=true matches SYN-AUDIT r1.**

3. Expand **Sources, uncertainty & next step** under LAB-A. Its citation identifies `CFG-A r1`, the source timestamp, the exact excerpt `auditEnabled=false`, and `SYN-AUDIT r1`. The control excerpt is **For training-service assets, auditEnabled must be true.** Source pointers and excerpt offsets are also shown.
4. Click **Create proposal**. In **Proposal and review**, expect **LAB-A: auditEnabled false → true** and revision **1**. Read **Prerequisites**, **Verification plan**, **Rollback plan** and **Impact**. These are instructions for future authorized lab work, not actions performed by Watchdesk.
5. Leave **Rationale** unchanged for this first walkthrough. Enter `Training Reviewer` in **Synthetic reviewer label**, then click **Review for handoff**. Expect **Reviewed for handoff, revision 1; no execution authority.**
6. In **Analyst handoff**, confirm **Not executed / not verified**, then click **Export handoff**. The suggested filename is `synthetic-cyber-handoff.json`. Use your browser's download list or prompt to locate the file.
7. When local storage is available, reload the same page in the same browser. The analysis, reviewer label and reviewed revision should restore. Storage or browser restrictions can prevent this; a downloaded handoff is your portable record.

The JSON export retains the accepted bundle and raw source, baseline, all analysis results, committed proposal, proposal digest, current review, review history, local event journal, uncertainties, impact and next actions. It explicitly records `executionStatus: "not executed"`, `verificationStatus: "not verified"` and `rollbackStatus: "not executed"`.

## Analyze your own synthetic evidence

1. Paste a version 1 bundle into **Synthetic evidence JSON**, using the loaded sample as a template. There is no file-upload control.
2. Click **Analyze evidence**. If a proposal already exists, choose **Keep current work** to cancel, or **Discard and analyze evidence** to replace it. Export important work before replacing it.
3. Read the summary and each asset's explanation. Expand **Sources, uncertainty & next step** for provenance and gaps.
4. Click **Create proposal** when there is a supported finding. The app creates one proposal for the first finding in input order; it does not provide a finding picker or batch proposals. Clicking it again keeps the existing proposal.

Editing the evidence field does not update accepted results automatically. **Last valid analysis, current evidence draft has not been accepted.** identifies results from the previous accepted input. A malformed replacement leaves that prior analysis available unless you already confirmed discarding its proposal context. Proposals and handoffs use accepted evidence, not an unanalyzed text draft.

### Supported format and validation

Input must be JSON with this structure; this smaller synthetic example produces **1 finding; 0 benign; 0 insufficient evidence.**:

```json
{
  "schemaVersion": 1,
  "synthetic": true,
  "bundleId": "SYN-EXAMPLE",
  "capturedAt": "2026-11-01T12:00:00Z",
  "assets": [
    {
      "assetId": "LAB-A",
      "type": "training-service",
      "evidenceId": "CFG-A",
      "revision": "r1",
      "sourceTimestamp": "2026-11-01T12:00:00Z",
      "controlId": "SYN-AUDIT",
      "controlRevision": "r1",
      "excerpt": "auditEnabled=false",
      "auditEnabled": false
    }
  ]
}
```

Validation rules:

- Top-level fields are exactly `schemaVersion`, `synthetic`, `bundleId`, `capturedAt` and `assets`. Version must be `1`, and synthetic must be Boolean `true`.
- Assets require the fields shown above except `auditEnabled`, which can be omitted or set to `null` for unknown. Its known values must be Boolean `true` or `false`; strings such as `"false"` are rejected. Extra fields are rejected at both levels.
- Bundle, asset, evidence, revision and control identifiers start with a letter and contain only letters, digits, underscores or hyphens, with 1 to 80 characters. Asset IDs must be unique within the bundle; evidence IDs must also be unique. Asset type must be a nonempty string.
- Timestamps must be valid UTC ISO timestamps with seconds and optional three-digit milliseconds, such as `2026-11-01T12:00:00Z` or `2026-11-01T12:00:00.123Z`.
- `excerpt` must exactly match `auditEnabled=true`, `auditEnabled=false` or, for null/missing values, `auditEnabled=unknown`. Excerpts are limited to 1000 characters.
- The bundle must contain 1 to 20 assets and be at most 65536 UTF-8 bytes, including whitespace.

Only `type: "training-service"`, `controlId: "SYN-AUDIT"` and `controlRevision: "r1"` support a finding or benign result. The fixed analysis date is `2026-11-04T00:00:00Z`; asset and bundle timestamps must fall within the preceding 30 days, inclusive. Future, stale or unsupported evidence yields **Insufficient evidence**. These are demonstration rules, not operational policy, and they do not advance with today's date.

To try an unknown case, use the smaller example above with `auditEnabled: null` and `excerpt: "auditEnabled=unknown"`. Expect **0 findings; 0 benign; 1 insufficient evidence.** No proposal can be created from that result. Load and analyze the built-in sample to recover to a supported finding.

## Edit, save, discard or reject a proposal

The asset, before/after setting and instructions are read-only. **Rationale** is the editable proposal content.

1. Change **Rationale**. The app displays **Unsaved changes, review unavailable.** Review is suspended and export is disabled. The draft is locally stored when storage is available, but it is not committed proposal content.
2. Choose **Save proposal** to commit a nonempty rationale. A changed draft increments the revision and invalidates the previous review. Saving identical content does not increment the revision.
3. Alternatively, choose **Discard changes** to restore the committed rationale and its previous review. This does not delete the whole proposal.
4. Enter a **Synthetic reviewer label** and click **Review for handoff** to review the committed revision. Clicking review with unsaved changes reports **Save or discard draft changes before review.**
5. Use **Reject proposal** to record a rejection instead. Export stays unavailable until a later explicit review of clean committed content.

For example, after reviewing revision 1, change the rationale to `Review local logging gaps before any lab change.` and save it. Expect **Review required, revision 2; previous review invalidated.** Review again to enable export for revision 2.

**Committed proposal digest** shows the SHA-256 digest of the saved proposal, including its revision and evidence. It binds content but provides no signature, authenticated identity or execution permission. Changing the reviewer field alone does not replace a recorded decision; click a decision button to record a new one.

## Storage, export and starting over

Ordinary input and workflow transitions automatically attempt to save in localStorage under `synthetic-cyber-workbench-v1`. **Save proposal** specifically commits the proposal draft; it is separate from automatic draft storage.

When storage works, the evidence draft, last accepted analysis, committed and draft proposal, reviewer label, review history and event journal survive reloads. A restored review is checked against the committed proposal ID, revision and digest. Use the same browser and file location; copying the HTML elsewhere or changing browser/profile may use different storage. Browser data clearing can remove saved work.

Storage is local, mutable and unencrypted. There is no cloud backup, cross-tab merge or synchronization. **Local storage unavailable, export before closing.** means the app is operating in memory. Keep the page open until important work is captured. Only a clean reviewed proposal can be exported; there is no unfinished-draft export, and downloaded handoffs cannot be imported to resume a session.

To export:

1. Save or discard proposal edits and review the committed revision.
2. Click **Export handoff** in **Analyst handoff**.
3. Check that the browser actually saved `synthetic-cyber-handoff.json`. The app's **Handoff download prepared** message confirms preparation, not that the browser completed the download.

To start another investigation:

1. Export the current handoff first if you need it.
2. Click **Load synthetic sample**. When prompted, select **Discard and load sample**, or **Keep current work** to cancel.
3. Click **Analyze evidence** for the new sample.

There is no separate reset or clear-all button. With an existing proposal, confirmed replacement discards its current analysis, draft, proposal and review while retaining local events. Without an existing proposal, loading the sample replaces the evidence text; previous results remain until you analyze it. **Local event journal** displays the latest 12 events, while export includes the full retained journal. Old proposal content is not a restorable version archive.

If saved data is corrupt, the app reports a recovery warning and leaves that stored data untouched until deliberate discard. **Keep current work** cancels replacement; it cannot repair or restore corrupt content. Choose **Discard and load sample** only when you are ready to replace the unusable stored session.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| **Enter valid synthetic evidence JSON.** | Correct JSON syntax, including quotes and commas, or click **Load synthetic sample**. The invalid text is preserved for correction. |
| Version, asset-count or timestamp error | Use version 1, synthetic=true, 1 to 20 assets and valid UTC timestamps. Review the format above. |
| ID, field or Boolean validation error | Remove extra fields, provide required fields, make asset/evidence IDs unique and use Boolean values rather than quoted strings. |
| **The evidence excerpt must match auditEnabled exactly.** | Match the excerpt to the value, including lowercase spelling and no added spaces. Use `auditEnabled=unknown` for null or missing values. |
| **A supported finding is required to create a proposal.** | Analyze the sample or supported evidence with a finding. Benign and insufficient-evidence results cannot generate proposals. |
| **Enter a rationale before saving.** | Add non-whitespace text to **Rationale**, or use **Discard changes**. |
| **Enter a synthetic reviewer label.** | Fill **Synthetic reviewer label**, then click the decision button again. |
| Export is disabled | Create a proposal, save or discard edits, then click **Review for handoff**. A rejected or dirty proposal cannot be exported. |
| Export fails or no file appears | Keep the page open, check browser download permissions and its download list, then retry **Export handoff**. An application export failure preserves the working state. |
| Work does not survive reload | Check the storage status. Local-file, private-browsing or quota restrictions can prevent saving. Use a browser context that allows local storage and export important reviewed work before closing. |
| **Stored work could not be restored.** | The app cannot repair the stored session. Deliberately discard and load the sample to start again, or leave the stored data untouched. |

## Limitations and unavailable integrations

The baseline and answer key are synthetic training examples, not independently approved STIG content. Findings do not establish exploitation, complete policy evaluation or compliance. Mission impact and applicability require owner review.

There is no live scanner, patcher, execution adapter, isolated range, identity administration, CAC/PKI, authenticated reviewer, operational network connection, reconnect synchronization or tamper-resistant audit service. Rollback and verification are written plans only. The app cannot demonstrate successful remediation, failed rollback or partial remediation on a device. OpenSCAP and OPA are not integrated.

Only the synthetic evidence-explanation slice is implemented for the planned acceptance scope. Broad source requirements remain deferred. No measured time savings, reduced analyst hours, operational readiness or authorization to operate is established. See [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites, unresolved owners and integration work.

## Developer tests

Node.js 18 or newer is required only for developer tests. It is not required to open or use the application. No package installation is needed.

From this directory, run:

```sh
node --test core.test.cjs
```

`core.test.cjs` uses Node's built-in test runner and assertions. It exercises the actual functions in `core.cjs` and the marked inline core extracted from `index.html` in a Node VM, using the same behavioral vectors for both. Coverage includes classification/citations, validation and boundaries, freshness, SHA-256, draft/review transitions, restored state, denied/corrupt storage and exported handoff content. Keep the CommonJS and inline core consistent when changing application code.

The verification-phase run passed **22 tests, with zero failures or skips**, including a regression check for mismatched proposal identity in a stored review. Node tests do not establish rendered browser workflows, actual browser storage/download behavior, accessibility or operational validation. Browser journeys and human review remain pending. See [verification.md](verification.md) for the verification record and its limits.
