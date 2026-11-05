---
type: research
status: complete
owner: mukul
updated: 2026-11-04
summary: "Challenge 32 is an honest timing demonstration that misses the leadership decision."
---

# Challenge 32, round 1 judgment

VERDICT: NOT
WHY: [E, index.html] The app calculates two completion dates but does not connect them to mission capabilities or explain a useful first action for leadership.
FIX: [R] Make the factory's planning skill require an independent synthetic acceptance case that completes the original leadership decision, and reject plans that defer that outcome.

[E, screenshots and README.md] The numbered steps are clear. [A] A Sailor could follow the timing exercise unaided, but cannot complete the required readiness assessment. An event judge would likely appreciate the presentation and be disappointed by the missing decision support.

[E, index.html] After five changes, radar finishes five days late and watch qualification four days late. Both receive generic advice to confirm dates and estimates. Ordering lateness does not explain which corrective action should come first.

[E, source and guide] Calculations and button handlers are real; no dummy control was found. The five scripted changes are labeled synthetic. Missing capability assessment, staffing constraints and reconnect sync are openly disclosed.

[E, test sources and receipts] Tests contain real assertions against module and inline code, including invalid inputs and recovery. The report records 26 tests and 12 browser passes, but ten criteria remain unverified and requirementsMet is false. Browser export checks only a filename and warning fragment. No fresh browser run or Sailor trial occurred here.
