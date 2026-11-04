---
type: review
status: complete
owner: mukul
updated: 2026-11-04
summary: "Three export failures have new source guards at d0f4c69; four remain open, and original reproduction-based closure is still pending."
---

# Verification and export at d0f4c69

[E, pinned source review] Reviewed clean `fh-org/gui-d0f4c69` at `d0f4c690d3f40ac260eb0a291dde75f0d55c4aa5` against `631849f`. No repository code, test, build, installation or candidate ran for this review. The baseline is [[Research/QA/Acceptance-Reconcile-631849f]] and the original reproduced cases are in [[Research/QA/Runner/Harness-Coverage]].

[E] **E1, E2 and E4 have new source guards. H1, V1, E3 and E5 remain open in source.** None receives runtime closure here. Main's separately reported 96 PASS / 20 FAIL gate does not identify the outcomes of these seven original scenarios; do not substitute its aggregate count for their reproductions.

| Finding | Source assessment at d0f4c69 | Required closure evidence |
| --- | --- | --- |
| H1, ambiguous digest encoding | [E] Open. `electron/storage.ts:81-89` still appends each path directly before its bytes without lengths or canonical record encoding. Evidence exclusions changed, but the encoding and version policy did not. | [R] Repeat the original `a` containing `bc` versus `ab` containing `c` collision and rename/add/delete/stability controls. A new digest format requires fresh verification and review, not relabeling old evidence. |
| V1, comment-only files counted as tests | [E] Open. `electron/verification.ts:8-13,20-26,58-59` still finds nonempty matching files and reads TAP aggregate counts. New quality runs require browser evidence through `shared/verification.ts:4-11`; legacy Node reports remain accepted. The extra browser gate does not repair the Node count. | [R] Repeat comment-only, executable-with-no-tests, genuine cases, skips/todos, spoofed output and runner errors. Report browser acceptance separately. |
| E1, mutation during destination dialog | [E] Guard added, repro unrun. `electron/main.ts:110-124` clones state and reserves delivery before the chooser. `electron/source-export.ts:19-26` rechecks the source afterward, before destination creation. | [R] Run the original pending native-dialog edit, cancellation and competing-action cases. `tests/source-export.test.mjs:37-41` tests pre-helper mutation, not that full IPC/dialog sequence. |
| E2, mutation during copy | [E] Guards added, repro unrun. `electron/source-export.ts:28-37` copies, then checks live source and destination against the verified digest; failure enters cleanup. This remains a live copy, with H1/E5 limitations. | [R] Repeat delayed-copy HTML mutation and destination corruption. New tests at `tests/source-export.test.mjs:44-61` cover some mutations, but do not replace the original reproducer. |
| E3, substituted review metadata | [E] Open. `electron/storage.ts:84` excludes `review.json`, `test-report.json` and `DELIVERY.md`. The helper copies sidecars and regenerates only DELIVERY.md. `electron/main.ts:102-107` writes review.json on approval but export does not rebuild it from trusted state. | [R] Replace review notes/hash and compare exported decision identity and notes to host state. Define the excluded test-report policy too. Hash checks alone cannot detect those substitutions. |
| E4, partial export after failure | [E] Cleanup added, repro unrun. Helper lines 27-41 remove the destination on copy, metadata, validation or cancellation failure. Main lines 137-147 restore prior state and remove a returned destination if state saving fails before commit. | [R] Inject first/later copy errors, metadata-write failure, state-save failure and cancellation. New tests cover some cleanup paths. A crash can still leave a final-looking destination; staging and final rename are not implemented. |
| E5, omitted internal symlink | [E] Open. `electron/storage.ts:63-72` silently skips symlinks; export uses that traversal. Source and destination hashes can agree while both omit a dependency. | [R] Repeat the actual same-workspace alias case and test the delivered app. The new destination-parent alias test at `tests/source-export.test.mjs:72-77` is a different scenario. Reject unsupported source links before approval or prove complete supported delivery. |

[R] Preserve original safety expectations when adapting reproducer entry points to the extracted export helper. Use “source remediation present, runtime closure pending” for E1/E2/E4. Continue the already selected manual final-copy control: stop writers, identify and independently exercise exact delivered files, then bind review to their manifest. That procedure does not establish automatic race protection.

## New browser gate and its limit

[E, source] `harness/quality-contract.ts:36-67,155-167` supports fill/select/click/check/press/reload, visible/value/text expectations and downloads. It has no file-input/import action. `shared/quality.ts:1-11` has the same vocabulary. `electron/browser-verification.ts:103-122` reads download content but does not retain it for later upload. Thus a planned reload/download journey cannot prove saving a changed draft and importing those exact bytes into a fresh offline context.

[R] Add a bounded host-owned retained-download/import action and fresh-context evidence if that claim is required. Until then, keep that check explicitly external or manual. `skills/fleet-evidence/SKILL.md` and `skills/fleet-delivery/SKILL.md` should require the real roundtrip; `skills/fleet-ux/SKILL.md` and `skills/fleet-scheduling/SKILL.md` should require consistent exhausted/invalid-state wording. The candidate comparison and concrete instruction changes are in [[Research/QA/Acceptance/Review-Candidates]]. No skill, host or repository code was changed by this review.
