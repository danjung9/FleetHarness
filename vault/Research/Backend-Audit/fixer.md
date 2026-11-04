
## 17:48 report

Resolved both conflicts, preserving sandbox enforcement, process tracking, retry/resume guards and bounded repairs. Fixed judge final-message selection and unified inference metrics, including interrupted and resumed attempts.

Kept all assertions. Updated fixtures for completed messages and custom `bash` registration; increased the hanging-test deadline to 1.5 seconds.

Both TypeScript checks pass. Affected tests: **202 passed, 13 failed** at Chrome startup or native sandbox/process-cleanup boundaries. The separate real `ps` check hit `EPERM`. Native success remains for the overseer to verify.

No frontend or Git metadata changes. Resolved files need overseer staging. [Detailed handoff](~/Documents/CDAO/fh-org/integrator/.tmp/Sprint/backend-merge-handoff.md).

COMMIT: Merge guarded recovery with sandbox verification and fix judge accounting
