---
type: qa-review
status: source-repaired
owner: mukul
updated: 2026-11-05
summary: "Automatic reports label requested revisions without verifying checkout success; they do not establish native cleanup at the newer heads."
---

# Automatic QA revision mismatch

[E, later November 5 handoff] Main acknowledged the defect and marked the old reports NOT VALID. Current qa_loop.py now checks the targeted branch fetch, checks checkout success, and compares actual HEAD with the requested full SHA before proceeding. This repairs the demonstrated preparation defect in source. A new automatic-run receipt is still required; prior counts do not become valid for the newer commits. The separate independent native Stop receipt is reviewed in [[Research/QA/GUI-16a6940/Detached-Stop-Review]].

[E, read-only recheck on November 5] **Do not use Auto/16a6940.md or Auto/f5fec32.md to close native process cleanup.** Both report 125 unit passes, 51 harness passes and two smoke failures. The automatic runner does not verify its checkout, and the retained checkout and reported stack point to older source. Original reports are preserved.

| Evidence inspected | Observation |
| --- | --- |
| fh-org/qa-auto HEAD | 1d9eeee9edfd37ce03c852843f60c889f93e9884, tracked source clean; only .lock.seen is untracked. |
| Checkout reflog | Latest entry is November 4 at 16:17:17, moving from d0f4c69 to 1d9eeee. No subsequent checkout is recorded. |
| Commit objects in that clone | f5fec32 and 16a6940 are absent. tests/process-sweep.test.mjs is also absent. |
| Reported smoke-electron failure | Unscoped Norfolk catalog button lookup at line 34. This matches retained 1d9eeee source. |
| Exact 16a6940 smoke-electron source | Line 34 waits for the settings-saved toast; the catalog lookup is scoped to the dialog at line 37 and uses a runtime count. |
| qa_loop.py prepare | Fetch, checkout and clean return codes are discarded. A failed checkout does not stop builds or tests. |
| qa_loop.py report | The requested remote SHA is used as the report identity. No actual HEAD or build digest is retained. Successful per-step output is discarded. |

[A] The evidence points to tests rerunning the older checkout while reports acquire newer requested labels. This is enough to reject attribution of these results to the named newer commits. It does not reconstruct every historical process or change the raw counts.

[R] Main owns the runner repair: fail immediately on fetch or checkout errors; verify actual full HEAD equals the requested SHA and tracked source is clean before compiling; verify both again afterward; retain the commands, test file list and complete result summaries including skips. Record build digests and source tree. A native-discovery test skipped because ps is denied must remain unverified. Rebuild and rerun on the confirmed head after that repair.

[E, source review] f5fec32 corrects the diagnosed macOS user-selection flag to -U and adds a native marked/unmarked-worker check. Integrated 16a6940 adds bounded retry logic and persistent cleanup state. These are source changes, not closure evidence from the mislabeled reports. The unchanged independent GUI case is ready in [[Research/QA/GUI-16a6940/Detached-Stop-Review]].

[E] Sources: `~/.local/share/fleethacker-context/org/qa_loop.py:40-46,80-88,95-109`; qa_loop.json; local qa-auto HEAD, reflog, tracked status and commit-object checks; exact Git objects in FleetHarness; [[Research/QA/Auto/16a6940]] and [[Research/QA/Auto/f5fec32]]. No runner, checkout, product source or original receipt was modified or executed by this audit.
