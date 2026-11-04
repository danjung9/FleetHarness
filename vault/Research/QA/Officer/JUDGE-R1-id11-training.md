---
type: judgment
status: complete
owner: mukul
updated: 2026-11-04
summary: "Challenge 11 sample works within a scope that omits the central task."
---

VERDICT: NOT
WHY: It moves two sample drills but omits departmental negotiation, mandatory training recurrence and schedule optimization, so a Sailor cannot complete the requested weekly planning task.
FIX: [R] Make the factory's acceptance skill require an independently checked synthetic demonstration of the original primary task before passing a build, with no deferral of defining requirements.

[A, screenshots and README] A Sailor could likely load and run the sample without help: two clear buttons produce readable times and personnel loads. Editing requires minute offsets and person IDs. Only two Monday drills exist; users cannot add requests or change the week. The narrow view requires substantial scrolling.

[E, index.html, README and verification.md] Omissions are candidly disclosed, including absent departmental agents, recurrence and optimization. Local acceptance is clearly distinguished from operational approval. Export works through implemented download handlers, but there is no import recovery. No canned solution or unwired button was found in source.

[E, test source and report] Tests exercise the delivered scheduling logic, including 216 independently enumerated cases; the receipt reports 15 tests and 16 browser journey runs passing. However, one test requires a false explanation: Alex is unavailable at every candidate, although 09:00 fits his availability and fails because of a collision. The acceptance plan defers the central requirements; requirementsMet is false.

[A] A judge would likely be disappointed by the gap between the polished demonstration and the challenge.

[E] Source, receipts and three screenshots reviewed; no fresh browser run or Sailor trial.
