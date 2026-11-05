---
type: review
status: changes-requested
owner: mukul
updated: 2026-11-05
summary: "Two integration regressions remain in committed 8053707; intentional full-access changes and unfinished incoming work are excluded."
---

# Parent comparison at 8053707

[E] Reviewed exact commit 80537076a7443480acfcc5b9745ca245ccd8c61d against the local origin/mvp pin acee4fa837c7e61cecfd1a853dc5f3e89af36acb and actual merged Dan frontier 34f82b335735cd6972b1b98ed62b095c6b616d71. The MVP pin is an ancestor. The Dan frontier is the second parent and the merge base with incoming 29ac921. The local origin/dan/backend-improvements pin 01631de89ef1dac2aef3a3e5b9ad726e80c0f6cc is an older included ancestor. References were read locally; no remote fetch occurred.

[E] Current 29ac921 conflict resolution is separate work in progress. Its browser tools, visual review, checkpoint, clarification and skill additions are not counted as committed losses. No test files were deleted in either compared delta. Intentional access-policy changes are not defects.

## P1: Stop can miss a service preview during startup

[E, pinned source] electron/main.ts:208 marks previewing, then awaits store.save before previews.url at line 209. The controller does not exist until electron/solution-preview.ts:24. Stop at main.ts:191-194 calls stopPreview, which sees an empty preview controller registry, sweeps, marks cleanup confirmed and removes previewing at lines 122-126. When the suspended preview continues, it can still enter url and launch the generated service at solution-preview.ts:55. Further Stop skips preview cleanup because the set entry was removed; backend.stop has no active build and sees confirmed cleanup at pi-backend.ts:789-792.

[R] A deterministic regression can hold the first preview save, request Stop, then release startup while controlling the service-launch promise. Require cancellation to survive that ordering and no runtime to start after the acknowledged stop. Reserve and cancel the pending preview operation before the first awaited persistence step. The source interleaving was not executed here.

[E] MVP acee4fa preview.ts:10-30 served index.html using a static HTTP server. Executable service previews make this an added shutdown gap. Existing solution-preview tests begin url before testing cancellation, so they do not cover this earlier IPC boundary. This does not reopen the separately passed bounded Pi Stop fixture at 16a6940.

## P2: filename-based redaction corrupts persisted Resume baselines

[E, pinned source] electron/test-baseline.ts:11-16 maps filenames to original test hashes and base64 bytes. electron/storage.ts:82 applies redactValue to all persisted state. electron/secrets.ts:3 and 38-39 replace string values whenever their object key contains token, password, secret or similar names. A valid synthetic file named token.test.cjs or tests/password.test.cjs therefore has its baseline hash and bytes persisted as [REDACTED]. After restart, unchanged tests fail assertTestBaseline at test-baseline.ts:25-28 and Resume at pi-backend.ts:321-327. MVP acee4fa storage.ts:54-59 preserved those values.

[R] Add a persisted save/reload/Resume regression using those harmless filenames. Preserve structural integrity fields and retained test identity while continuing to redact actual configured credentials and sensitive diagnostic fields. Do not disable credential redaction globally. This deterministic source path was not executed here.

## Behaviors and assertions retained

[E] Dan-side comparison retained helper discovery, self-test authorization, cross-phase reuse, dependency retesting, failure results, image responses, review history and prior-source checks, supplied-data integrity, conversation cancellation and Resume review context. ReviewFlow, BuildFlow, JourneyHeader, ProjectConversation, clarification implementation/tests, brief-data and helper-catalog tests, and conversation/data smoke scripts are unchanged between the Dan frontier and the reviewed merge.

[E] MVP-side review checked approval and delivery binding, registered-test parsing, repair and Resume bounds, startup reconciliation, Stop/finalization, API-key routing and redaction. No additional loss was established beyond the two findings above and the already reported [[Research/Backend-Audit/Merge-Evidence-Review]].

[E] Documented assertion changes include allowed full-access and background helper behavior, public versus logged errors, stronger failed-cleanup restart states, two bounded repair attempts, preserved original tests during repairs, and wider workflow-wrapper deadlines. Targeted cancellation limits remain. Those intentional changes are excluded from findings.

[E] This was source/assertion review only. No build, GUI, model, native process scan, test execution, working-tree edit or Git mutation occurred. Carry corrections into the final integrated pin before treating later native tests as closure.
