---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Bind acceptance, human review, source export and executable packaging to one frozen payload identity."
---

# Deliver exactly what was tested

## Bottom line

[R] Must: acceptance and human approval identify the final delivered bytes. The smallest Thursday procedure stops generation, copies the candidate, tests that final copy and records its digest. [R] Should: automate a snapshot and shared delivery gate for both source export and executable download. Preserve Dan's new allowlisted wrapper packaging, and test the extracted executable separately if it is part of the submission.

## Current evidence

[E, final directive read] [[Ops/Directors/Directive-agentic]] selects manual final-copy acceptance and defers snapshot implementation. Queued source-export work belongs to development, not this assignment. [R] The file map below is coordination guidance for later review, not permission to edit Dan's delivery implementation.

[E, local source at 50fcaea] `main.ts::assertVerified` checks the live workspace hash before approval and source export. Source export then waits for a folder dialog and copies the live workspace without a delivery lock or final payload comparison. `review.json` stores a source hash; `Project.approvedAt` is only a timestamp, and the host does not retain a separately immutable approved snapshot.

[E] `storage.ts::sourceHash` hashes sorted paths followed by file bytes, excluding `test-report.json`, `review.json` and `DELIVERY.md`. `listArtifacts` excludes symlinks and several directory names. That is useful revision checking but does not define a complete delivery manifest; source export can copy files excluded from the source hash.

[E] The new executable route is stronger in several ways: it locks deliveries, checks source before/after staging and after packaging, copies only `index.html`, supplies a trusted wrapper, compares staged HTML against current HTML and saves via temporary file/rename. It still stages from a live workspace and has no independent acceptance identity for the wrapper or resulting archive. Do not describe it as having the same unchecked-copy behavior as source export.

## Smallest change and exact files

| File | Small proposed change [R] |
| --- | --- |
| New `electron/snapshot.ts` | Freeze an allowlisted regular-file payload after writer termination, create a canonical per-file manifest and return an immutable snapshot ID. Reject path escapes, links and unsupported entries. |
| `electron/storage.ts`, `shared/types.ts` | Persist snapshot ID/hash, acceptance identity, approval binding and delivery receipt as optional fields. Keep old reports readable but not implicitly accepted. |
| `electron/pi-backend.ts::execute`, `electron/verification.ts` | Verify the frozen snapshot, or copy then rerun checks against it. Any repair creates a new candidate and new snapshot. |
| `electron/main.ts::assertVerified`, approve/export/preview handlers | Approve the accepted snapshot; preview it for review; lock all delivery operations before awaiting dialogs and recheck the operation token before saving. |
| `electron/executable.ts::assertExecutableSource`, `stageExecutable`, `saveExecutable` | Accept the reviewed snapshot object, not a mutable project workspace. Preserve allowlisted HTML and trusted wrapper. Verify archive digest after saving. |
| `electron/package-worker.ts` | Return packaging receipt with input manifest, wrapper/runtime identities and archive digest. Do not let untrusted payload set packaging options. |
| `skills/fleet-delivery/SKILL.md` | Explain acceptance and delivery identities and that packaging/offline checks are separate evidence. |
| New `tests/snapshot.test.mjs`, existing `tests/runtime.test.mjs`, `tests/executable.test.mjs` | Race, manifest, stale approval, archive-copy and recovery proof. |

## Identity and transaction

[R] Define a canonical manifest as a schema-versioned array sorted by normalized relative path, each entry containing path, byte length and SHA-256 of bytes. Hash the deterministic serialization, with unambiguous fields. Explicitly list payload files. Metadata such as review and receipt is host-owned outside the payload; do not exclude a file from integrity checking while permitting it to become executable input. Reject unexpected payload files instead of silently relying on a directory ignore list.

[R] Freeze only after note 03 proves all candidate writers stopped and note 05 denies access to the snapshot store. A read-only bit or a new folder under an unrestricted worker account is not immutability. Copy to a new staging directory, verify complete manifest, run development and independent acceptance on that snapshot, then record its identity. Never run arbitrary generated Node tests with write access to the trusted snapshot or acceptance store.

[R] Bind approval to `(runId, contractHash, checkerHash, payloadHash, acceptanceRecordHash)`. Updating requirements, source, guide, tests or acceptance criteria invalidates the relevant identity and approval. Guide edits belong before freeze. Review notes can be appended as host metadata without changing the accepted payload. For Thursday, keep reviewer identity as the actual local human review record; do not invent authenticated command approval or signatures.

[R] Source export holds one operation lock across dialog, staging, digest comparison and final rename. Cancel or Stop deletes incomplete staging and never marks delivered. The destination receipt lists the full manifest and approval identity. Export always reads the frozen snapshot even if the old workspace is changed or a new run starts later. Recompute the destination manifest before publishing its ready state. The lock also prevents source export and executable download racing each other.

[R] Executable delivery has three identities: accepted HTML payload, trusted wrapper/runtime build, and produced archive. The archive cannot have the same digest as its HTML input. Record all three. Extract the produced archive, verify the embedded HTML digest, exercise the wrapper's origin/storage/save behavior, then hash and deliver that exact archive. Do not repackage after testing without repeating the archive-level checks. The stable app ID introduced by Dan remains unchanged.

## Proof to require

[R] Mutate the live workspace while a save dialog is open and while a copy is deliberately delayed: delivery must still match the accepted snapshot or fail. Try extra file, symlink, changed guide, excluded-metadata substitution, stale report, simultaneous exports and cancellation just before rename. Verify no mismatched ready state and no half-delivered artifact. Crash after staging and after rename but before state save; recovery verifies the receipt instead of assuming success.

[R] For executable delivery, tamper with staged HTML and archive bytes, and reject the mismatches. Independently open the exact extracted build offline with a fresh profile, run the accepted workflow, save, close and reopen. Browser-file acceptance and wrapper acceptance are separate rows. `START-HERE.txt` offline wording must reflect observed evidence, not packaging success alone.

## Risk and relationship to Dan's latest change

[R] This is the highest-overlap design with `50fcaea`: coordinate edits to `main.ts`, `executable.ts`, `package-worker.ts` and `storage.ts` as one small reviewed sequence. Reuse `deliveries`, `stageExecutable`, atomic archive saving, allowlisted packaging and interrupted-package recovery. Do not redesign the new download UI or Workbench.

[A] Snapshot plus source-export gate is roughly 2 to 4 hours; executable provenance and extracted-package checks add roughly 1 to 2 hours when packaging already works. These estimates exclude worker containment and failed downloads. Manual final-copy acceptance is must even if these should changes are cut. Hashes prove byte identity, not domain correctness, human authority or installation approval.

## Sources

[E, final relay reconciliation] `631849f` later consolidated the frontend. A pinned diff shows no changes from `50fcaea` in `electron/`, `harness/`, `skills/`, `shared/` or the dependency lock, so this design's backend file map remains applicable. Use the retained unified desktop path in [[Research/Agentic/Run-Readiness-50fcaea]]; do not restore removed Studio/Workbench interfaces. All implementation remains deferred pending allocation.

- [E] Local source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe, `electron/main.ts`, `storage.ts`, `executable.ts`, `package-worker.ts`, `tests/executable.test.mjs`.
- [E] [[Research/Architecture/Target-Architecture]], [[Research/Plan/Plan]], [[Research/Build-Patterns/Isolated-Execution]].
- [R] [[Research/Agentic/01-Protected-Acceptance]], [[Research/Agentic/02-Independent-Checker]], [[Research/Agentic/03-Stop-and-Supervision]].
