# Verification evidence, 2026-11-04

Phase: verify; synthetic-only. Reviewed requirements.md, plan.md, packet acceptance/provenance, frozen acceptance-plan.json and ux-spec.json, system-design.json, core.cjs, inline implementation and handlers in index.html, both test suites, README.md and test-matrix.md. Frozen plans, architecture and .fleet files were not edited. No operational systems or external sources were accessed.

## Executed application checks

Command: `node --test core.test.cjs browser-core.test.cjs` (Node built-in test runner; actual application functions, no toolkit fixtures).

1. Initial suite: 13 passed, 0 failed, 0 skipped.
2. Added adversarial tests before repair: 15 total, 13 passed, 2 failed, 0 skipped. Failure evidence: `both actual cores reject inconsistent restored grant ownership and receipts` failed with `AssertionError: Missing expected exception` at browser-core.test.cjs:29. `both cores retain rejection receipts when authorization disappears before resolution` failed with `SyntaxError: "undefined" is not valid JSON` in core.cjs clone, invoked from resolve. These failures were reproduced locally, not inferred from source.
3. Single bounded repair: linked restored lease/resource/batch/decision/intent references; checked candidate scores against retained policy inputs and completed action receipts against their grant and validity interval. Added explicit resource identity to issued leases. Missing authorization snapshots now record null and an eligibility rejection instead of throwing. Applied the same core to core.cjs and script#governance-core in index.html.
4. Final rerun of the same command: **15 passed, 0 failed, 0 skipped, 0 canceled, 0 todo**, exit 0. Both added tests exercise the actual CommonJS and embedded implementations. No temporary data files were created.

The shared single repair allowance has been used. Initial failure details above are retained; frozen expectations were not changed. Host rerun of both gates is still required.

## Criterion mapping

Canonical provenance is packet.acceptance[0 to 2], respectively recipe.acceptance[0 to 2], IDs GOV-01 to 03. The packet has no further structured requirements, evaluation criteria, deliverables or user criteria. Narrative obligations remain separate below.

| Criterion | Input → expected outcome | Executed evidence and source spans | Browser/human status |
| --- | --- | --- | --- |
| GOV-01 | Missing ghost, authorization expiry t=100, heartbeat t=89 → distinct rejection, zero actions; explicit repair and fresh announcement permit one action. Future/malformed times and eligibility loss cannot execute. Absent authorization at resolution yields a rejection receipt. | core.test.cjs:5, :30, :34, :40; browser-core.test.cjs:37. Passed. Eligibility core.cjs:10; resolution :96; inline resolution index.html:111. | eligibility-recovery: desktop and narrow **unverified**. Cryptographic verification absent. |
| GOV-02 | Reverse sensor/repair arrival → sensor 60>40 in both; tie 60=60 → no lease; promotion → repair 80>60; general quarters → repair 70>60. Duplicate IDs/replay produce at most one action; lease valid at104, expired at105; invalid drafts do not change authority. Corrupt receipt/resource/batch/score/time links rejected. | core.test.cjs:13, :16, :19, :22, :26, :30, :43; browser-core.test.cjs:4 and :18. Passed. Restore links core.cjs:43; arbiter :96; executor :107. | reverse-contention, tie-recovery, condition-promotion: desktop and narrow **unverified**. |
| GOV-03 | Halt pending or granted work, including registered ghost → no future actions, active leases revoked, acknowledgements for all registered agents, completed history retained; serialized halt stays enforced. | core.test.cjs:46 and :50; browser-core.test.cjs:4. Passed. Reducer halt core.cjs:115; UI dispatch index.html:162. | halt-persistence: desktop and narrow **unverified**; GOV-03 original human review remains outstanding. |

## README and UI review boundary

Read the quick start and every sample walkthrough against actual handlers, control labels, core transitions and frozen literal outcomes. No dependency installation is needed; index.html remains self-contained with inline CSS and core. README developer command was executed successfully. Main examples have corresponding Node domain checks for contention, condition/promotion, eligibility, lease expiry and halt.

No assigned browser runtime or host report/screenshots/traces were available in this phase. Opening index.html, DOM interaction, sample walkthroughs as browser tasks, localStorage reload behavior, blocked-storage warnings, invalid-storage recovery UI, download contents, reset confirmation, keyboard/focus behavior, console errors and desktop/narrow overflow **were not exercised here**. Source review and VM parity are not browser verification. All five frozen journeys require host execution on both viewports (10 journey/viewport combinations). Missing browser execution means the completion gate is **not passed**. test-report.json, source hashing, screenshots and traces are harness-owned and were neither fabricated nor edited.

Tightened validation means old snapshots containing grants without resourceId will lock on restore. README now explains explicit new-session recovery. No migration or authenticated import is provided. Validation catches the tested inconsistencies; it does not authenticate user-editable storage or provide tamper-proof evidence.

## Status and remaining requirements

- Generated: all six architecture components have mapped implementation files; architecture filenames remain consistent.
- Runnable: dependency-free artifact provided; browser startup not executed by this agent.
- Node tested: 15 passing application checks, no skipped checks.
- Prototype checks passed: **not established**, pending host browser verification.
- requirementsMet: **false** for the broader source narrative. No canonical recipe criterion is deferred in the frozen contract, but none has complete browser/human acceptance yet.
- Reviewer accepted: unverified. Operationally validated: absent.

Unimplemented/unverified source obligations: real signed manifests and key issuance/revocation, continuous attestation/quarantine, approved operator authority matrix, distributed intent transport/leases and trusted time, authenticated promotions/escalation, physical halt/runtime adapters and independent acknowledgements, exact twelve-to-thirteen live onboarding, and measured cognitive-burden reduction. Synthetic scoring and local halt cannot establish those outcomes. Source provenance and exact narrative excerpt locators remain in research.md E1 to E6; no new documentary claims are introduced.
