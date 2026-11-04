---
type: review
status: complete
owner: mukul
updated: 2026-11-04
summary: "Challenge 12 fails its primary task despite useful generic parsing tests."
---

# Challenge 12, round 1

VERDICT: NOT
WHY: [E] The app requires manual categorization of generic EVENT/TASK records instead of extracting the three requested event types from mock USMTF.
FIX: [R] Make the factory's acceptance skill require a test of the original primary task with independently checked synthetic mock-USMTF examples covering every requested event type, and reject completion when that task is deferred.

[E, index.html and three screenshots] The numbered workflow looks approachable, but a Sailor cannot perform the required task with its sample: it contains a radio check and briefing, no crypto window or flight event, and no frequency values. Journey captures show generic timelines; the three requested screenshots show none.

[E, README.md and verification.md] Omissions are candid: no USMTF support, manual category choices, session loss on reload, and no import to restore exports.

[E, source and test-report.json] No canned results or dead controls found in inspected code. Tests contain real assertions against application logic, covering invalid inputs, midnight boundaries and approval/export safeguards. The receipt reports 12 tests and eight browser journeys passing. The consistency test compares the same implementation with itself; it is not independent correctness evidence. Both original challenge criteria remain unverified and requirementsMet is false.

[A] A judge would likely be disappointed: competent supporting mechanics leave the central workload unsolved.

[E] Evidence review only; no fresh browser run or Sailor trial.

