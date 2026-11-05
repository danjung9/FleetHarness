# Primary deferrals

None. All outcomes below are planned synthetic behaviors and remain unverified until executed. Actual USMTF conformance and operational validation remain unestablished; no deployment or dissemination occurs.

# Acceptance and provenance inventory

Original wording and every source provenance entry are retained below. Canonical IDs occur once; aliases remain provenance only. The source supplies no evaluation criteria; thresholds below are planner-proposed synthetic measures, not user-confirmed operational standards.

## UC12-1

Original: A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline.

Provenance: [{"kind": "requirement", "id": "UC12-1", "path": "challenge.requirements[0]"}, {"kind": "description", "id": "SCOPE12-4", "path": "userScope.description[218:418]"}]

Disposition: implemented (planned, not verified). Expected: Under the declared synthetic assumptions, raw SYN-OPTASK/1 yields complete category fields and a consolidated timeline: complete gives F01 06:00 to 12:00, C01 08:15 to 08:30 and Q01 09:00 UTC for FSV LANTERN; other-ship Q02 stays extracted. Actual USMTF conformance remains unestablished.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys complete-schedule, boundary-schedule, fresh-review-export. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## MSG-01

Original: Every extracted field has exact source offsets.

Provenance: [{"kind": "recipe", "id": "MSG-01", "path": "recipe.acceptance[0]"}]

Disposition: implemented (planned, not verified). Expected: Every extracted source field has exact UTF-16 start/end and one-based line into unchanged rawText, including Unicode and repeated CRLF labels; complete frequency 123.450 slices 201 to 208 on line 5.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys complete-schedule. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## MSG-02

Original: Do not invent ambiguous timestamps.

Provenance: [{"kind": "recipe", "id": "MSG-02", "path": "recipe.acceptance[1]"}]

Disposition: implemented (planned, not verified). Expected: Missing zones, invalid Gregorian dates, unsupported sets, duplicates, reversed/missing windows and empty input yield explicit unresolved flags and no invented events; corrected Q10 is exactly 10:00 UTC.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys recover-time, recover-empty. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## MSG-03

Original: Normalize time zones without shifting the event.

Provenance: [{"kind": "recipe", "id": "MSG-03", "path": "recipe.acceptance[2]"}]

Disposition: implemented (planned, not verified). Expected: F02 clips to 0 to 90 minutes with prior-day continuation; Q03 and Q04 normalize to midnight; C02 clips to 1430 to 1440 with next-day continuation; next-midnight Q05 is excluded.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys boundary-schedule. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## MSG-04

Original: Review output against an independent answer key.

Provenance: [{"kind": "recipe", "id": "MSG-04", "path": "recipe.acceptance[3]"}]

Disposition: implemented (planned, not verified). Expected: Host exact evaluations compare complete independent authored responses at threshold 1; application tests measure exact per-category precision/recall 1 and validate every evidence slice on preserved fixtures. Synthetic answers are not independent SME truth.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys fresh-review-export. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## MSG-05

Original: Keep the timeline usable offline.

Provenance: [{"kind": "recipe", "id": "MSG-05", "path": "recipe.acceptance[4]"}]

Disposition: implemented (planned, not verified). Expected: With external networking unavailable but loopback local service running, a fresh nonpreset message parses, can be reviewed and exports complete JSON. No remote assets or APIs. Service shutdown shows recovery error; browser-only parsing after shutdown is not provided.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys fresh-review-export. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## DELIVERABLE12-1

Original: A tool that seamlessly converts mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders.

Provenance: [{"kind": "deliverable", "id": "DELIVERABLE12-1", "path": "challenge.expectedDeliverables.lines[0]"}, {"kind": "description", "id": "SCOPE12-6", "path": "userScope.description[442:578]"}]

Disposition: implemented (planned, not verified). Expected: Mock SYN-OPTASK/1 raw text becomes one synchronized 00:00 to 24:00 UTC visual schedule and equivalent accessible agenda with frequency plans, crypto windows and point flight quarters; reviewed local JSON contains complete source, evidence, times and unresolved items.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys complete-schedule, boundary-schedule, fresh-review-export. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## DESC12-1

Original: Warfare commanders disseminate operational orders via dense, formatted telecommunication messages.

Provenance: [{"kind": "description", "id": "DESC12-1", "path": "challenge.description[0:98]"}, {"kind": "description", "id": "SCOPE12-1", "path": "userScope.description[0:98]"}]

Disposition: implemented (planned, not verified). Expected: Dense fictional formatted telecommunication text is accepted intact without executing embedded instructions. This source span supplies context, not a requested transmission integration; no actual dissemination is performed.

Input: 320-line dense fixture. Evidence: journeys dense-schedule. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## DESC12-2

Original: Watchstanders must parse hundreds of lines of text to determine when their ship is scheduled for events.

Provenance: [{"kind": "description", "id": "DESC12-2", "path": "challenge.description[99:203]"}, {"kind": "description", "id": "SCOPE12-2", "path": "userScope.description[99:203]"}]

Disposition: implemented (planned, not verified). Expected: The supplied 320-line dense message yields exactly three events for FSV LANTERN in order F90,C90,Q90, at minutes 240 to 1200,790 to 800,1125; no prose becomes an event.

Input: 320-line dense fixture. Evidence: journeys dense-schedule. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## SUMMARY12-1

Original: Turn synthetic formatted tasking messages into traceable events and a consolidated daily timeline.

Provenance: [{"kind": "summary", "id": "SUMMARY12-1", "path": "challenge.summary[0:98]"}]

Disposition: implemented (planned, not verified). Expected: Synthetic raw tasking produces traceable typed events, daily timeline, deliberate local review and complete consistent download.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys complete-schedule, fresh-review-export. Required capability optask-workflow / optask-independent exact evaluation; extraction.test.mjs and protocol.test.mjs call actual compute backend.

## SCOPE12-3

Original: Requirements

Provenance: [{"kind": "description", "id": "SCOPE12-3", "path": "userScope.description[205:217]"}]

Disposition: implemented (planned, not verified). Expected: Requirements grouping is retained in documentation and connected to UC12-1 all-category extraction; contextual heading adds no separate operational action.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys complete-schedule. Literal browser/documentation review of contextual grouping or attribution.

## SCOPE12-5

Original: Expected deliverables

Provenance: [{"kind": "description", "id": "SCOPE12-5", "path": "userScope.description[420:441]"}]

Disposition: implemented (planned, not verified). Expected: Expected deliverables grouping is retained in documentation and connected to DELIVERABLE12-1 complete mock schedule and export.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys fresh-review-export. Literal browser/documentation review of contextual grouping or attribution.

## SCOPE12-7

Original: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12

Provenance: [{"kind": "description", "id": "SCOPE12-7", "path": "userScope.description[580:649]"}]

Disposition: implemented (planned, not verified). Expected: The application displays exactly Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12 and the synthetic/nonvalidated disclaimer; guide and export retain the disclaimer.

Input: Preserved complete/boundaries/missing-zone/recovery fixtures and new user-entered message as applicable. Evidence: journeys complete-schedule. Literal browser/documentation review of contextual grouping or attribution.

# Test design and independent references

| Check | Input | Complete expected outcome | Evidence |
|---|---|---|---|
| All categories | complete | Four extracted; FSV LANTERN visible F01,C01,Q01; frequency 123.450 MHz / TRAIN-A / C01 360 to 720; crypto DEMO-ONLY-C01 495 to 510; flight Q01 minute 540; Q02 other ship retained; 0 flags | extraction.test.mjs compares all events against preserved expectedEvents; complete-schedule |
| Dense | dense 320 lines | F90 240 to 1200, C90 790 to 800, Q90 1125; exactly 3 events; 314 RMKS non-events; order F90,C90,Q90; no flags | extraction.test.mjs, dense-schedule; elapsed measurement <2s target recorded separately |
| Midnight/offset | boundaries | F02 clipped 0 to 90 continuesBefore; Q03/Q04 equal UTC instant 0; C02 clipped 1430 to 1440 continuesAfter; Q05 next midnight excluded | extraction.test.mjs, boundary-schedule |
| Repeated and Unicode | repeated, complete plus mixed CRLF/LF | Every fields/evidence pair slices to original token at its own line; repeated labels retain distinct offsets; CRLF index counts CR | extraction.test.mjs; literal complete frequency 201 to 208 |
| Abstention | missing-zone, invalid-date, reversed-window, malformed-window, unsupported, empty | No confirmed events, respective MISSING_TIMEZONE, INVALID_DATE, REVERSED_WINDOW, MISSING_FIELD, UNSUPPORTED_SET, EMPTY_INPUT; correction Q10 minute 600 | protocol.test.mjs full envelopes; recover-time, recover-empty |
| Duplicates and inert prose | duplicate-id, inert-text | First Q06 retained, second source line DUPLICATE_ID; RMKS instruction inert; Q01 minute 540 only | extraction.test.mjs, no outbound HTTP requests |
| Protocol validation | non-string rawText; invalid action; impossible selection date; unreviewed export; simultaneous faults | Exact error/null result envelopes in declared precedence; no partial invented output | protocol.test.mjs and sealed exact evaluator |
| New user input and changed constraint | fresh-review-export enters FSV SPARROW raw text, March 4 then March 5 | U7 12:15 UTC/minute 735 appears on March 4, none on March 5; review invalidated on edit; complete independent download bytes fixed in journey | primary journey at both widths |
| Full export | fresh-review-export | Entire UTF-8 pretty JSON result, newline, reviewed=true, original source, all field evidence, UTC/point segment and synthetic disclaimer; local synthetic-schedule.json file | Full-content expectDownload (not merely filename/fragment); protocol/service tests compare full object |
| Unresolved export | parse unsupported + valid line, acknowledge and export | Flags remain in full reviewed result; invalid source never becomes confirmed event | protocol.test.mjs and service.test.mjs |
| Persistence and review | review fresh message then reload; change date/raw | Exact reviewed snapshot restored; changed draft requires parse/review; unavailable storage warns but retains memory | fresh-review-export; additional browser development interaction |
| External-network offline | deny external hosts, allow loopback only; enter new raw message | Fresh extraction, review and same full download without remote assets/API; record denied-request log/network configuration | service.test.mjs verifies no external access plus browser development integration run; host fresh-review-export covers interaction, not network isolation |
| Service shutdown/restart | stop loopback service after draft edit, parse, restart/retry | Visible Local service unavailable. Start the local service and try again.; draft retained; stale review disabled; retry succeeds | development integration browser evidence; not expressible by allowed declarative steps |
| Destructive change | edit draft then load sample/clear | Explicit discard or cancel; cancel retains exact draft; discard deliberate | development browser check, report evidence in verification.md |

Every mandatory computational behavior is part of the single optask-workflow capability. Sealed evaluator uses new raw values beyond samples, changed day and ship constraints that change the result, explicit invalid/impossible inputs and complete reviewed export. Expected semantics are independently authored; offset/UTC arithmetic is mechanically checked from those authored values without candidate code. Full exact response threshold 1; baseline always-empty prediction 0; one deterministic trial. Per-category event precision/recall and all evidence/time projections must equal 1 on declared synthetic examples. No optimization or predictive model is requested. No answer key belongs in implementation source.

# Risks and evidence boundaries

No tests were executed and no UI exists in planning. Host executes frozen journeys at desktop and narrow widths and exact capabilities from clean allowlisted runtime. Build/verify must use host browser captures and visual review initial/recheck at both widths, even for a clean initial image; no handwritten visual-review.json. Application tests named *.test.mjs must use only copied runtime modules/data and actual shared compute. Foundation/toolkit self-tests cannot count as application verification. Frozen contracts cannot change during build/repair; report contradictions for a new planning run. Repair uses only the host's existing shared budget.

Human review must assess grammar fidelity, named outputs and complete transformation, timeline clarity, keyboard/contrast and operational fit. Source descriptions are contextual and do not authorize external dissemination. Actual USMTF format mapping and real-data correctness are unverified. Delivery/deployment require owner approval; local review is not that approval. Guide, verification and review summary start Primary deferrals: None and retain all validation limits. Monitor local unresolved/error counts, escalate unknown semantics, never infer tasking, and allow clear/cancel plus host Stop. No telemetry, secret handling or external systems.
