---
type: judgment
status: complete
owner: mukul
updated: 2026-11-04
summary: "Real sample extraction and timeline, but the required message format is replaced."
---

# Challenge 12, round 101

VERDICT: NOT
WHY: [E] It converts its invented input format into a schedule, but does not parse the USMTF message format the challenge requires.
FIX: [R] Make the factory's acceptance skill require independently checked synthetic examples in the requested input format before generation, and reject replacing that format with an easier invented one.

[E, source and three screenshots] The sample produces all three event types, overlaps and midnight crossings. [A] A Sailor could likely load, parse and review it unaided. Numbered steps help; lengthy evidence fields bury the schedule. No Sailor trial was observed.

[E, source] No canned schedule or dead button was identified. Parsing, review, downloads and reset have real handlers. The comparison score is calculated from a small fixed example set and clearly limited to it.

[E, README and acceptance plan] The guide candidly admits there is no actual USMTF parser. However, its claim of no primary deferrals and the report's passing original requirement conceal that central substitution.

[E, tests and receipts] Tests contain meaningful assertions, including changed inputs, corruption and deliberately wrong answers. Receipts report 31 tests and 12 browser runs passing; these exercise the invented format. Overall requirementsMet remains false.

[A] A judge would appreciate the finish but be disappointed by the missing parser.

[E] Reviewed `Ten/Exp1/R101/id12-optask`; the supplied path was absent. No fresh execution occurred.
