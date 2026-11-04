---
type: memo
status: active
owner: mukul
updated: 2026-11-04
summary: "Narrow QA, correct false findings and require artifact evidence."
---

# Quality decisions

[R] Keep four-request partial ID 11 and the 3 PM access, 4 PM real-build and 6 PM accepted-artifact gates. Defer the 36-role-pass matrix, other pilots and connectors. Protect Dan's frontend.

[E, final relay and gate] At 631849f, Dan consolidated one Home-to-Flow interface; 128 tests reportedly pass. Retire Studio/Workbench checks. Test-Plan's earlier fixture smoke lacks revision/log provenance. Live generation, shutdown and delivered-app acceptance remain unverified here.

[R] Give qa-runner one evidence reconciliation and runtime handoff; qa-officer one independent ID 11 contract check. The main QA lead owns runtime acceptance; the organization runner supplies launches outside restricted seats. No duplicate runners or live builds.

[E, pinned source character inspection] Static-Findings 1 and 11 misread normal newline escapes at both revisions. Return those findings for correction. Engineering should remove its newline repair unless reproduction establishes another defect. The source-export race remains separate; executable packaging has additional checks. Evidence: [[Ops/Directors/Sprint/Quality-Meeting-7]].

[R] Require the new Home smoke, consent, Stop, fresh review, guide accuracy and final-copy recovery evidence. Packaging alone proves neither offline use nor saved-data recovery. Stop the builder before independent acceptance and record final digests.

[E, feed-7] No QA QUESTIONS were supplied. Execution approval remains with the overseer; manual final-copy acceptance is allowed and must be labeled manual.
