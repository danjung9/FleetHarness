---
type: review
status: complete
owner: mukul
updated: 2026-11-04
summary: "Usable lookup misses required source guarantees."
---

# Challenge 20, round 1 judgment

VERDICT: NOT
WHY: [E] The sample retrieves preset flag evidence but cannot produce the requested brief with every factual claim linked to an immutable source.
FIX: [R] Make the factory's acceptance skill require an independently checked, complete synthetic version of the original task before allowing success, including source support for every displayed fact and rejection of changed evidence.

[A, screenshots and receipts] A Sailor could select either example and inspect its flag source without help. Layouts are readable. That completes the demonstration, not the primary task.

[E, index.html and README.md] Four identities and their flag values are predefined. AIS and sanctions records contain no usable facts; destination and sanctions stay UNKNOWN. Displayed IMO/MMSI identifiers have no supporting citation. Source text is editable, and printing hides citation buttons and source inspection. One-page print fit is unverified.

[E, source and receipts] Buttons have real handlers; no inert control was identified. It labels synthetic data, absent live sources, missing fields and lack of immutable storage. These are disclosed canned records, not fabricated research.

[E, app.test.cjs and test-report.json] Ten substantive tests exercise delivered logic, including broken citations, conflicts and stale evidence. Eight recorded browser runs pass, but both original requirements remain unverified. No fresh execution or Sailor trial occurred here.

[A, judge assessment] Clear presentation and honest limits deserve credit; the missing central capability would disappoint.
