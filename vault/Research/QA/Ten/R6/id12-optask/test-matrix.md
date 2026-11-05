# Primary deferrals

None. Every canonical criterion, including UC12-1, is implemented within the authorized synthetic-only prototype scope. All mandatory computational capabilities remain required and evaluated. The complete mock USMTF-style workflow covers every named extraction category, exact evidence, consolidated 24-hour timeline, recovery and reviewed export. Synthetic; not validated against the real USMTF format. Actual-format validation and operational accuracy remain unverified evidence limits; they do not defer extraction functionality or change the original source wording. Owner approval of a concrete revision is required before delivery/deployment.

# Acceptance inventory and independent checks

This document is a frozen prebuild mapping, not a test report. Canonical IDs occur once in acceptance-plan.json; merged alias provenance remains below. No source requirement is rewritten. Record actual results later in verification.md. All implemented checks must pass, while actual USMTF validation remains unverified. Scope heading/source-line entries carry context, not invented domain features.

### UC12-1, implemented

Original: A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline.

Provenance: [{"kind": "requirement", "id": "UC12-1", "path": "challenge.requirements[0]"}, {"kind": "description", "id": "SCOPE12-4", "path": "userScope.description[218:418]"}].

Independent expected outcome: Under the authorized synthetic-only boundary, the complete SYN-OPTASK/1 mock USMTF-style workflow extracts frequency plans, crypto change-over windows and flight quarters event times with exact source evidence and plots them on a consolidated visual timeline. Nominal input yields 4 events, 3 selected: FP-01 at 06:00 to 10:00, CW-01 at 08:00 to 08:15 and FQ-01 at 08:00 to 09:00 UTC. All three categories share a 00:00 to 24:00 UTC axis. Dense, overlapping, overnight, invalid and recovery inputs are evaluated. Synthetic; not validated against the real USMTF format. Actual-format and operational accuracy remain unverified evidence limits, not deferred core functionality.

Inputs: SYN-NOMINAL, SYN-DENSE, SYN-OVERNIGHT and all supplied synthetic scenarios. Evidence: required capabilities extract-evidence and time-selection; browser journeys synthetic-primary, dense-ship and overnight. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host execution. Source wording and provenance above are preserved; no operational or real-format validation is claimed.

### MSG-01, implemented

Original: Every extracted field has exact source offsets.

Provenance: [{"kind": "recipe", "id": "MSG-01", "path": "recipe.acceptance[0]"}].

Independent expected outcome: Every emitted field, category and message identity has exact UTF-16 evidence including Unicode/CRLF; nominal frequency slice [232,237) equals 312.5.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities extract-evidence; browser journeys synthetic-primary. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### MSG-02, implemented

Original: Do not invent ambiguous timestamps.

Provenance: [{"kind": "recipe", "id": "MSG-02", "path": "recipe.acceptance[1]"}].

Independent expected outcome: Missing zone, impossible date, unsupported/malformed sets, empty draft and duplicates quarantine affected text, preserve original input and never infer timestamps; valid unrelated events survive.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities extract-evidence; browser journeys recover-source, recover-unsaved. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### MSG-03, implemented

Original: Normalize time zones without shifting the event.

Provenance: [{"kind": "recipe", "id": "MSG-03", "path": "recipe.acceptance[2]"}].

Independent expected outcome: Equivalent explicit offsets give identical UTC instants; overnight clipping is 0 to 30 and 1425 to 1440 minutes with full source endpoints retained and boundary-only events excluded.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities time-selection; browser journeys overnight. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### MSG-04, implemented

Original: Review output against an independent answer key.

Provenance: [{"kind": "recipe", "id": "MSG-04", "path": "recipe.acceptance[3]"}].

Independent expected outcome: Independent prebuild synthetic tuples, negatives and non-events achieve exact response score 1 and event precision/recall 1; no SME ground truth or real-format accuracy claimed.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities extract-evidence; browser journeys synthetic-primary. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### MSG-05, implemented

Original: Keep the timeline usable offline.

Provenance: [{"kind": "recipe", "id": "MSG-05", "path": "recipe.acceptance[4]"}].

Independent expected outcome: After initial cache activation, browser network disconnection still allows a newly edited raw message to be parsed through the identical core and reviewed JSON exported. An explicit offline-route journey plus actual browser disconnection check is required.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities review-export; browser journeys offline-primary. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### DELIVERABLE12-1, implemented

Original: A tool that seamlessly converts mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders.

Provenance: [{"kind": "deliverable", "id": "DELIVERABLE12-1", "path": "challenge.expectedDeliverables.lines[0]"}, {"kind": "description", "id": "SCOPE12-6", "path": "userScope.description[442:578]"}].

Independent expected outcome: Mock USMTF-style text transforms into a synchronized 00:00 to 24:00 UTC schedule for selected fictional ship with readable overlapping lanes, exact source review, saved draft and consistent reviewed JSON.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities time-selection, review-export; browser journeys synthetic-primary, overnight. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### DESC12-1, implemented

Original: Warfare commanders disseminate operational orders via dense, formatted telecommunication messages.

Provenance: [{"kind": "description", "id": "DESC12-1", "path": "challenge.description[0:98]"}, {"kind": "description", "id": "SCOPE12-1", "path": "userScope.description[0:98]"}].

Independent expected outcome: Dense synthetic commander-style messages retain headers, identity and domain sets through extraction and reviewed local export. Contextual dissemination is represented as preserved message input; no operational order is sent.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities extract-evidence; browser journeys dense-ship. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### DESC12-2, implemented

Original: Watchstanders must parse hundreds of lines of text to determine when their ship is scheduled for events.

Provenance: [{"kind": "description", "id": "DESC12-2", "path": "challenge.description[99:203]"}, {"kind": "description", "id": "SCOPE12-2", "path": "userScope.description[99:203]"}].

Independent expected outcome: 320-line SYN-DENSE extracts exactly 4 events and 3 for AURORA; selecting LANTERN yields only FQ-02 15:00 to 15:45 UTC without deleting other ship evidence.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities extract-evidence, time-selection; browser journeys dense-ship. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### SUMMARY12-1, implemented

Original: Turn synthetic formatted tasking messages into traceable events and a consolidated daily timeline.

Provenance: [{"kind": "summary", "id": "SUMMARY12-1", "path": "challenge.summary[0:98]"}].

Independent expected outcome: Complete synthetic raw text → traceable three-category events → ship/day timeline → deliberate reviewed draft export, with errors corrected by reparse.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities extract-evidence, time-selection, review-export; browser journeys synthetic-primary, recover-source. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### SCOPE12-3, implemented

Original: Requirements

Provenance: [{"kind": "description", "id": "SCOPE12-3", "path": "userScope.description[205:217]"}].

Independent expected outcome: Requirements heading retained as context and traced to the full synthetic extraction workflow; no additional operational obligation invented.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities extract-evidence; browser journeys synthetic-primary. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### SCOPE12-5, implemented

Original: Expected deliverables

Provenance: [{"kind": "description", "id": "SCOPE12-5", "path": "userScope.description[420:441]"}].

Independent expected outcome: Expected deliverables heading retained as context and traced to the working synthetic 24-hour schedule and reviewed export.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities review-export; browser journeys synthetic-primary. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

### SCOPE12-7, implemented

Original: Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12

Provenance: [{"kind": "description", "id": "SCOPE12-7", "path": "userScope.description[580:649]"}].

Independent expected outcome: Visible source attribution links exactly to the supplied Challenge 12 URL; synthetic provenance remains visible on UI and download.

Inputs: Prepared SYN-OPTASK/1 fixture inputs and distinct planning evaluation inputs; relevant boundaries below. Evidence: capabilities review-export; browser journeys synthetic-primary. Node: domain.test.mjs and workflow.test.mjs. Status remains planned until host executes checks; human source/UX review supplements automated evidence.

## Domain test matrix

| Input | Independently fixed expected outcome | Planned application evidence |
| --- | --- | --- |
| SYN-NOMINAL | 4 extracted, 3 selected; frequency 312.5 MHz at 360 to 600, crypto 480 to 495, flight 480 to 540; LANTERN excluded | domain.test.mjs complete event/issue/evidence objects; synthetic-primary |
| SYN-OTHER-SHIP / SYN-DENSE | LANTERN selects only FQ-02 900 to 945; dense 320 lines yields 4 events, 3 for AURORA | domain.test.mjs; dense-ship |
| All evidence in all prepared cases | rawText.slice(start,end) equals text, exact one-based lines; category and message ID evidence included | domain.test.mjs includes literal expected objects plus independent slice invariants |
| SYN-UNICODE | CRLF and astral Unicode offsets unchanged; 12:00-04:00 → 16:00Z, 960 to 990; inert REMARK has no action | domain.test.mjs and UI source review |
| SYN-ZULU / SYN-OFFSET | Both normalize to 08:00 to 09:00 UTC, 480 to 540 | domain.test.mjs complete response equality |
| SYN-OVERNIGHT | 5 extracted, 3 selected; clips 0 to 30 and 1425 to 1440; FQ-START 0 to 20; endpoints unchanged | domain.test.mjs; overnight |
| EMPTY, MISSING-ZONE, BAD-DATE | Zero events; literal EMPTY_INPUT, MISSING_TIMEZONE, INVALID_DATE; no inferred date/zone | domain.test.mjs; recover-source, recover-unsaved |
| INCOMPLETE, UNKNOWN, MALFORMED | Zero events; MISSING_FIELD, UNSUPPORTED_SET, MALFORMED_SET and exact supplied message/span | domain.test.mjs; UI issue panel |
| REVERSED, POINT | Zero events; NONPOSITIVE_INTERVAL, no guessed rollover/duration | domain.test.mjs |
| DUP-RECORD, DUP-MESSAGE | All colliding records/blocks quarantined, one first-occurrence issue, no winning duplicate | domain.test.mjs |
| SYN-MIXED | Valid FQ-01 survives unsupported FREQSHIFT; 1 event and 1 visible issue, review blocked | domain.test.mjs; workflow.test.mjs |
| Novel protocol boundaries | Wrong field types/null/extra keys, invalid action/day/grammar, negative/zero frequency, unsupported unit, extra/missing fields, malformed headers; first error follows public precedence | domain.test.mjs full literal envelopes and ordered issues |
| Saved/unsaved revisions | Save nominal, edit invalid source, review unavailable; Discard restores saved nominal; reload recomputes correct 4/3 counts | workflow.test.mjs plus recover-unsaved and synthetic-primary |
| Reviewed JSON | Saved issue-free current revision exports reviewed-draft; full originalText/evidence/selected events agree; source/selection edit revokes review; issues never acknowledged into validity | review-export-cases; workflow.test.mjs; synthetic-primary |
| Offline route | Worker controlled, network bypassed; NEW raw label OFFLINE-NET parses and exports, identical shared module | offline-primary at both widths; additional real-disconnection check below |

## Evaluation, integration and independent evidence

- extract-evidence-cases: 5 new inputs; time-selection-cases: 5; review-export-cases: 5. Synthetic planner-authored tuples, hand-calculated UTC/clipping, explicit issue judgments and source-location arithmetic; exact complete-response equality, threshold 1, baseline 0, trials 1. Host seals answer pairs; public solution invocation contains every implementable rule. Do not recreate sealed answers during build/repair.
- Supplied answer key and added planner cases are independent of application output, not independent SME truth. Measure event precision/recall 1 on all 18 supplied scenarios and 100% evidence/time equality; show numerator/denominator and failures in verification.md. Empty-output baseline misses every positive event; no-event cases must not inflate recall.
- All six frozen browser journeys run in fresh desktop and narrow contexts. Samples, saves, source views, recovery, downloads and literal results are interactive requirements. Native keyboard focus, short-window legibility, overlaps, no page overflow and local error feedback also need screenshot review.
- MSG-05 requires actual browser network disconnection after prepare/activation. Use a host-capable browser context offline setting or disconnect its network externally, then paste a distinct valid message, parse and export. Confirm no remote request, identical semantic export, offline reload when cached, and recovery when cache unavailable. Declarative schema has no network-toggle step: the control only establishes offline code-path behavior. Record real disconnection evidence separately; missing evidence is an unverified integration check, never a pass.
- Inject localStorage denial/quota, unavailable service worker, worker activation failure and transient transport failure in development/integration checks. Draft remains available, no stale reviewed export; explicit retry works. No executable scripts are embedded in acceptance-plan steps.
- During each build/verification phase perform mandatory fleet_browser/fleet_visual_review desktop+narrow initial captures and fresh rechecks; host owns evidence. Toolkit self-tests, helper self-tests and source-string checks cannot replace application tests.

## Human review and operational limits

Review every named output, raw mock format and end-to-end transformation against source wording. UI, sample provenance, exports, evidence and guide must say: Synthetic; not validated against the real USMTF format. Assess complete workflow rather than generic EVENT/TASK success. Representative actual messages, reviewed real-format mapping and operational accuracy are absent; Actual USMTF validation remains unverified. Owner must approve concrete revision before delivery/deployment; no live dissemination, system integration, authority to operate or military/crypto decision is established. Keep local error counts, source-review escalation, app-scoped clear/reset and host shutdown instructions visible in guide/review. No primary deferral may disappear behind passing totals. Changes to frozen expectations require a new planning run.
