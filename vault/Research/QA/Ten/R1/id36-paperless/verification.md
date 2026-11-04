# Verification, 2026-11-04

Generated: all six architecture components have mapped source files. Runnable: self-contained index.html; no external script dependencies. Tested locally: **22 Node tests passed, 0 failed, 0 skipped**, using `node --test *.test.cjs`. Browser verification: **host baseline 8/12 passed; repaired revision awaiting host rerun**; the completion gate is not satisfied by this local run. Reviewer acceptance and operational validation: unverified. **requirementsMet: false** (15 deferred criteria).

## Executed evidence and bounded repair

Initial verification baseline: all 18 existing tests passed. Added two tests executing actual index.html UI handlers in a Node VM with minimal DOM and transaction adapters. The discard recovery test failed with actual activity `''` versus expected `Pump drill`: discard rendered no saved single head during a conflict, leaving dirty fields and blocking confirmation. The single implementation repair restores the local competing value after discarding. A subsequent run exposed the test adapter's numeric input values (real DOM inputs coerce to strings); corrected that adapter behavior without changing expectations. Earlier full run: 20/20 passed, no skips. Existing build history recorded a separate cross-realm assertion correction (16 pass / 2 fail, then 18 pass); this was test comparison normalization, not browser evidence.

core.test.cjs executes both core.cjs and the actual inline application core: date/duration boundaries, replay idempotence, opposite merge orders, edit/delete conflicts, all-head resolution, missing/cross-record parents, cycles, collisions, queue preservation, dirty/exact-revision review gates and receipt idempotence. storage.test.cjs executes the actual persistence adapter with completion, abort and denial fixtures. ui.test.cjs executes actual discard, resolve and peer handlers; it checks retained drafts and committed envelopes. These are application tests with synthetic adapters, not real browser workflows.

The fleet reconciliation reference fixture retained concurrent edit and tombstone heads. It is calculation evidence only. OFF-04 transfer budgeting, resume offsets and interrupted acknowledgements remain unimplemented/unverified; no tool calculation is counted as application evidence.

## Criterion mapping

The frozen plan supplies exact expectations and journey steps; test-matrix.md retains inputs, provenance and expected outcomes. Node support below does not establish browser passage.

| Criterion | Local evidence / remaining requirement | Status |
| --- | --- | --- |
| UC36-1 | Local IndexedDB save/reload and simulated reconnect are planned, but authenticated transport, offline provisioning and operational clean sync are absent. | Deferred; UNVERIFIED |
| UC36-2 | core.test.cjs review/dirty/current-revision gates; ui.test.cjs discard recovery; host journeys: review-route, validation-recovery, edit-conflict | Node support PASS; see host baseline status below |
| UC36-3 | A persisted synthetic action history is planned; authenticated attribution, tamper resistance and owner-defined audit retention are absent. A partial local history does not establish the broad source audit requirement. | Deferred; UNVERIFIED |
| UC36-4 | No designated government device, browser policy or existing low-code target is supplied; compatibility and security need authorized platform evaluation. | Deferred; UNVERIFIED |
| UC36-5 | Synthetic fixture and source review only; visible warning passed in host baseline; host journeys: delivery-order, review-route | Node support PASS; see host baseline status below |
| UC36-6 | The slice includes local offline entry, human review, a source label, local history and a path-to-fleet document; real synchronization and fleet-ready deployment remain unverified. | Deferred; UNVERIFIED |
| OFF-01 | core.test.cjs full-state replay equality; host journeys: replay | Node support PASS; see host baseline status below |
| OFF-02 | core.test.cjs edit/delete and all-parent resolution; ui.test.cjs discard recovery; host journeys: edit-conflict, delete-conflict | Node support PASS; see host baseline status below |
| OFF-03 | core.test.cjs opposite order and canonical graph equality; host journeys: delivery-order | Node support PASS; see host baseline status below |
| OFF-04 | Attachment transfer is outside the minimum slice. No interrupted-photo receiver, acknowledged byte offsets or bounded-link transport is implemented; merge logic is insufficient. | Deferred; UNVERIFIED |
| OFF-05 | Browser reload persistence and review are planned, but actual device restart, eviction resilience and durable device storage require integration evidence beyond a reload. | Deferred; UNVERIFIED |
| EVAL36-1 | No supplied scans, extraction implementation or independently approved answer key; manual synthetic entry is not extraction accuracy. | Deferred; UNVERIFIED |
| EVAL36-2 | Synthetic validation catches a zero-minute log before review; official form rules, seeded domain errors and SME-approved coverage are missing, so the full evaluation is deferred. | Deferred; UNVERIFIED |
| EVAL36-3 | No SME manual baseline, equivalent packet workload or timing protocol is supplied; do not invent savings. | Deferred; UNVERIFIED |
| EVAL36-4 | Simulated peer reconciliation is only a slice; complete offline provisioning, durable device operation and authenticated reconnect are not implemented. | Deferred; UNVERIFIED |
| EVAL36-5 | No Sailor panel or approved usability protocol is available. Browser assertions cannot establish panel acceptance. | Deferred; UNVERIFIED |
| EVAL36-6 | Official judges must apply Warfighting 30%, Speed to Fleet 20%, Scalability 20%, Barrier Removal 15%, Judges’ Discretion 15%; no self-score is evidence. | Deferred; UNVERIFIED |
| DELIVERABLE36-1 | Hours returned require representative fleet workloads and an SME baseline; neither is supplied. | Deferred; UNVERIFIED |
| DELIVERABLE36-2 | Reduced errors and rework require a measured comparison with an approved baseline; synthetic rule demonstrations do not establish improvement. | Deferred; UNVERIFIED |
| DELIVERABLE36-3 | The form can be queued locally for simulated routing. Actual disconnected routing, recipient authority and authoritative receipt semantics are unspecified and absent. | Deferred; UNVERIFIED |

## Pending host and manual evidence

The supplied host report (2026-11-04T21:06:52.199Z) passed review-route, validation-recovery, replay and delivery-order at both viewport sizes. It failed edit-conflict and delete-conflict at step 12 on both sizes. The preserved report therefore records UC36-5, OFF-01 and OFF-03 passed; UC36-2 and OFF-02 failed; all 15 deferred criteria unverified. These are baseline results, not claims for the repaired source. All six journeys require a host rerun before the completion gate is satisfied.

Failure screenshots and traces are retained under `.quality-evidence/4f6bea891e7e-dcb0fb8e-560b-471c-9043-4b7a9fd6c14a/`, named `<journey>-<viewport>.png` and `.zip`. Inspected the edit-conflict desktop trace: selectOption receives valueOrLabel local, resolves an enabled select, then repeatedly reports “did not find some options”. Its captured HTML has option value local with visible label Keep local value. This supports a runner option-matching incompatibility, rather than a stuck lock. Within this requested bounded retry, the implementation now exposes exact local/peer/custom option labels and adjacent human-readable explanations. No runner, frozen expectation, or existing test was weakened. Core source is unchanged and its inline copy remains consistent.

Added actual UI handler tests for both concurrent edit and delete: rejected routing preserves the visible conflict and enabled selector; deliberate local resolution followed by review/approval queues the approved revision. Final local run: 22 passed, zero failures/skips. These adapter tests do not verify native select interaction. Browser screenshots were supplied by the host; no new screenshots or rendered visual inspection are claimed. test-report.json and all host artifacts are unchanged.

README controls, labels, sample inputs and expected summaries were checked against application source; its Node quick-start test command was executed. Opening the file in a real browser, its end-to-end walkthroughs, download, browser storage reset, storage retry and direct-file IndexedDB compatibility could not be exercised here. The new conflict-discard recovery has Node handler coverage but no frozen browser journey covering that extra interaction.

Unverified beyond the prototype: device restart, eviction/backup, encryption, authenticated identity/transport, receiver acknowledgements, real routing, platform compatibility, official form values and extraction, SME baseline and error/time comparisons, Sailor-panel review, judging and fleet authorization. No operational endpoint was contacted. Frozen acceptance-plan.json, ux-spec.json, system-design.json and .fleet inputs were preserved. No temporary test data files were created.
