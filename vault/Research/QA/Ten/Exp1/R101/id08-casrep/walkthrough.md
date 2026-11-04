# Live walkthrough: draft, return, revise, reconcile, approve and export

Use only fictional data. Open index.html directly in a browser. No install, server or connectivity is required. Role selection is a simulation, not identity authentication.

1. Select **Load fictional CASREP**. Inspect USS Example Harbor, SYN-CASREP-0001, INITIAL, category 3, CHWP-2 casualty and the synthetic-format message preview. The state is **Saved locally**.
2. As **Sailor/LPO**, select **Submit to Division Officer**. Switch Simulation: acting role to **Division Officer**. Add comment “Check cooling impact.” Enter return reason “Specify the affected cooling loop” and select **Return for revision**.
3. Switch to **Sailor/LPO**. Change Casualty description to “CHWP-2 failed. Auxiliary cooling loop B.” Select **Save draft**, then submit again. Earlier approvals remain historical.
4. Select **Simulate competing amendments**. Inspect both full proposals: restoration at 20:00 UTC and a fictional seal-kit request. Try CO release: it must be blocked by the conflict. Return to Sailor/LPO, edit the chosen restoration and corrective action, and select **Confirm reconciliation**. Both parents remain retained; reload to inspect them.
5. As Sailor/LPO submit again. Switch to **Division Officer**, **Department Head**, **Engineer Officer/CHENG**, and **XO** in sequence and select **Approve and forward** at each step. As **CO**, check the confirmation and select **Simulate release**. Observe **Simulated release, not transmitted**, six current approvals and retained return history.
6. Download synthetic CASREP message and history. Confirm the same record, revision and digest appear in both. The history includes all revisions, comments, decisions and branches.
7. In Lifecycle and local data select **Create linked amendment**. Observe a new UPDATE linked to the released report. Select **Cancel draft**, check the cancellation confirmation and confirm. Original release remains retained.
8. Load a fresh fictional sample (confirm replacing the cancelled workspace) before these recovery examples. As Sailor/LPO, clear Casualty description and Save draft to see validation; correct it and save. Edit without saving, reload and observe **Unsaved changes restored locally**. Routing requires Save draft or Discard changes.

This is a script for a later human demonstration, not evidence of a completed presentation, browser test or video. Stop demonstration preserves local work and blocks mutations; Resume demonstration is deliberate. Nothing is transmitted.
