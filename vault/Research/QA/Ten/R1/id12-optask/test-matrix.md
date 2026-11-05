# Acceptance and evidence matrix

Planning only, 2026-11-04. All cases below are proposed regression expectations, not SME ground truth. Every browser journey runs in fresh desktop and narrow contexts. No application or toolkit tests were run.

### UC12-1, deferred

Original requirement: A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline.

Provenance: requirement / UC12-1 / `challenge.requirements[0]`. Source method: human.

Expected outcome: Raw USMTF messages yield frequency plans, crypto change-over windows and flight quarters times on one consolidated visual timeline.

Deferral: No actual-format specification or SME-reviewed mapping is supplied. The implemented synthetic EVENT/TASK review and UTC timeline slice cannot establish USMTF extraction or domain category correctness.

Result: NOT RUN / unverified. Evidence: frozen acceptance-plan.json; future host test-report.json and host-provided screenshots/traces. Deferred criteria have no passing evidence.

### MSG-01, implemented

Original requirement: Every extracted field has exact source offsets.

Provenance: recipe / MSG-01 / `recipe.acceptance[0]`. Source method: automated.

Expected outcome: Every extracted field retains a half-open UTF-16 span whose slice equals its literal source text in the immutable original; the user can inspect source evidence and export it after explicit review.

Planned journeys: trace-review-export, draft-approval-boundary.

Result: NOT RUN / unverified. Evidence: frozen acceptance-plan.json; future host test-report.json and host-provided screenshots/traces. Deferred criteria have no passing evidence.

### MSG-02, implemented

Original requirement: Do not invent ambiguous timestamps.

Provenance: recipe / MSG-02 / `recipe.acceptance[1]`. Source method: automated.

Expected outcome: Empty text, missing timezone, invalid calendar dates and unsupported lines produce specific issues and no approved schedule or invented timestamps; correcting the source permits deliberate review and a valid schedule.

Planned journeys: invalid-source-recovery, draft-approval-boundary.

Result: NOT RUN / unverified. Evidence: frozen acceptance-plan.json; future host test-report.json and host-provided screenshots/traces. Deferred criteria have no passing evidence.

### MSG-03, implemented

Original requirement: Normalize time zones without shifting the event.

Provenance: recipe / MSG-03 / `recipe.acceptance[2]`. Source method: automated.

Expected outcome: 09:00Z and 04:00-05:00 normalize to 2026-11-04T09:00:00.000Z. A 23:30Z to 00:30Z interval remains 60 minutes, displays 23:30 to 24:00 on November 4 and 00:00 to 00:30 on November 5, and exports its original complete normalized interval.

Planned journeys: utc-day-boundary.

Result: NOT RUN / unverified. Evidence: frozen acceptance-plan.json; future host test-report.json and host-provided screenshots/traces. Deferred criteria have no passing evidence.

### MSG-04, deferred

Original requirement: Review output against an independent answer key.

Provenance: recipe / MSG-04 / `recipe.acceptance[3]`. Source method: human.

Expected outcome: Independent human review compares held-out synthetic formats and non-events against an independently authored answer key and reports event and field precision/recall, sample counts and errors.

Deferral: No independently authored held-out corpus, human reviewer, matching rules or agreed accuracy threshold is supplied. Planner-authored regression cases are protected from build drift but are not independent SME ground truth.

Result: NOT RUN / unverified. Evidence: frozen acceptance-plan.json; future host test-report.json and host-provided screenshots/traces. Deferred criteria have no passing evidence.

### MSG-05, deferred

Original requirement: Keep the timeline usable offline.

Provenance: recipe / MSG-05 / `recipe.acceptance[4]`. Source method: integration.

Expected outcome: With the browser disconnected, a locally available application parses synthetic messages, supports review and daily timeline use, and downloads the reviewed schedule.

Deferral: The self-contained local workflow and reviewed export are planned and exercised by trace-review-export, but the allowed declarative browser steps cannot disconnect the browser or prove network isolation. A witnessed disconnected end-to-end run is required; local packaging alone is only a partial demonstration.

Result: NOT RUN / unverified. Evidence: frozen acceptance-plan.json; future host test-report.json and host-provided screenshots/traces. Deferred criteria have no passing evidence.

### DELIVERABLE12-1, deferred

Original requirement: A tool that seamlessly converts mock USMTF raw text into a synchronized 24-hour visual schedule for watchstanders and shipboard leaders.

Provenance: deliverable / DELIVERABLE12-1 / `challenge.expectedDeliverables.lines[0]`. Source method: human.

Expected outcome: Mock USMTF text is seamlessly converted into a synchronized 24-hour visual schedule usable by watchstanders and shipboard leaders.

Deferral: No reviewed mock-USMTF mapping or owner assessment of synchronized/seamless behavior is supplied. The demonstrated UTC 24-hour synthetic timeline and manual category review remain a partial slice, not the complete deliverable.

Result: NOT RUN / unverified. Evidence: frozen acceptance-plan.json; future host test-report.json and host-provided screenshots/traces. Deferred criteria have no passing evidence.

## Application tests to implement

Tests must invoke the actual application core via core.cjs, never toolkit self-tests or duplicated implementation. Use Node built-in runner in core.test.cjs and consistency.test.cjs. The core adapter executes the tagged inline classic core script from index.html in a Node VM with no DOM; compare actual outputs from that same core in the browser journeys. Do not settle for source-string checks.

| Criterion / journey | Input and boundary | Independent expected result | Planned application test / evidence |
|---|---|---|---|
| MSG-01 / trace-review-export | Literal EVENT E1 in acceptance-plan; also TASK T1, emoji owner, empty field, mixed CRLF/LF | E1 id span [6,8); every raw field equals original.slice(start,end); source never normalized; Unicode offsets are UTF-16, delimiters excluded | core.test.cjs: fields for EVENT kind/id/start/end/owner/description and TASK kind/id/due/owner/description; retain missing-field zero-width spans and line evidence; host Node results |
| MSG-01 / draft-approval-boundary | Approve E1, edit Radio check to Changed draft, try approval/export; discard | Stale content cannot export; exact prior source and approval restored on deliberate discard | core.test.cjs state transitions and export guard; host browser download |
| MSG-02 / invalid-source-recovery | Empty and whitespace, missing timezone, February 30, unsupported text | Explicit issue, null invalid timestamps, no eligible reviewed records; valid retry succeeds | core.test.cjs strict validation; browser literal errors |
| MSG-02 | Duplicate IDs, missing required fields, slash in field, end before start, valid plus unsupported lines | All duplicates blocked; no silent record collapse, no approved export with unresolved issues, original draft retained; unsupported text not an event | core.test.cjs issue and eligibility checks |
| MSG-03 / utc-day-boundary | 09:00Z vs 04:00-05:00; X spans Nov 4 23:30 to Nov 5 00:30 | Equal epoch instants; 60-minute full duration; 30-minute segments on both UTC days; export retains full endpoints | core.test.cjs normalization, clipping and export; host browser |
| MSG-03 | Event ending exactly day start, starting at next midnight, zero duration, TASK at midnight, overlapping events | Half-open day excludes end-at-start and next-day start; zero interval flagged; TASK is a point in its UTC day; overlaps remain separate | core.test.cjs boundary tests |
| MSG-01/02/03 | Same literal browser cases executed through core.cjs and actual inline core in Node VM | Matching extracted fields, issues, instants, review eligibility, day segments and export records; no alternative test-only algorithm | consistency.test.cjs behavioral checks and host browser outcomes |
| MSG-05 deferred | Local index.html with browser network disconnected by human/approved future runner | Full paste→review→timeline→download still works, no remote resources required | Future witnessed offline evidence; unavailable in current declarative steps |
| MSG-04 deferred | Independent held-out formats and non-events, separate author and human reviewer | Report TP/FP/FN and precision/recall for events and fields with approved matching rules and thresholds | Future independently reviewed answer key; no present result |

## Risks and human review

USMTF format authority, event-type mapping, point/window meanings, operational timezone and overlap rules require SME review. User-selected categories are provisional synthetic annotations. Generic frequency/crypto/flight descriptions contain no actual parameters or cryptographic material. Independent accuracy thresholds and corpus ownership are unresolved. Offline isolation, browser/file-download support, readable layout, keyboard usability, and domain fit need witnessed review; browser checks establish specified interactions only. No CAC, device encryption, multi-user synchronization, operational connection, certification or deployment is established.

Host owns test-report.json, hashing, screenshots and traces. Future verification.md records supplemental results; missing browser runtime is a failure. All implemented Node/browser checks must pass; deferred criteria remain unverified and requirementsMet stays false. One shared bounded implementation repair may fix failures without changing frozen JSON expectations.

## Build-stage supplemental evidence

Application implementation now exists. `node --test core.test.cjs consistency.test.cjs` passed all 7 tests locally, with no failures or skips. See verification.md for scope and limits. MSG-01 is exercised by source-span and draft-boundary tests; MSG-02 by strict date, malformed-input, duplicate and approval tests; MSG-03 by timezone, full-interval and half-open-day tests. consistency.test.cjs exercises frozen source inputs through the actual inline core and Node adapter. These local checks supplement the planned matrix; they do not replace pending host browser evidence. UC12-1, MSG-04, MSG-05 and DELIVERABLE12-1 remain deferred and unverified.

## Verification-stage results, 2026-11-04

Supersedes build-stage test counts above: executed `node --test core.test.cjs consistency.test.cjs`, **12 passed, 0 failed, 0 skipped** after one bounded repair. Pre-repair adversarial failures and exact observations are preserved in verification.md. That document maps every canonical criterion to provenance, input, expected outcome, application test evidence and pending browser journeys. MSG-01/02/03 have passing local core evidence; every planned browser journey remains pending on desktop and narrow. UC12-1, MSG-04, MSG-05 and DELIVERABLE12-1 remain deferred/unverified; requirementsMet is false. No host-owned report, screenshots or traces were authored by this agent.
