# Primary deferrals

## UC11-1

Original wording: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Actual qualified crew availability, duty and training-completion records are unavailable and prohibited by the synthetic-only boundary. Withhold operational SFTRM assurance; demonstrate complete synthetic departmental negotiation, collisions, alternate allocations, fatigue and due occurrence coverage.

Demonstrated stand-in: the exact prepared synthetic PB4T JSON format, five departmental agents, all four named training types, initial two collision entries, ENG-1 at 1980, six due/scheduled occurrences, numeric daily heatmaps, deadline/history recovery and local review. See syntheticCoverage and literal post-interaction assertions in `synthetic-pb4t`. This entire criterion remains deferred and unverified; no synthetic test satisfies the operational obligation.

## DESC11-1

Original wording: Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations.

real-data: Actual crew availability and ship operations are unavailable and prohibited. Withhold coordination against real crew/operations; demonstrate all four named fictional training types against explicit synthetic availability and operating windows.

Demonstrated stand-in: the exact prepared synthetic PB4T JSON format, five departmental agents, all four named training types, initial two collision entries, ENG-1 at 1980, six due/scheduled occurrences, numeric daily heatmaps, deadline/history recovery and local review. See syntheticCoverage and literal post-interaction assertions in `synthetic-pb4t`. This entire criterion remains deferred and unverified; no synthetic test satisfies the operational obligation.

## SCOPE11-6

Original wording: The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Actual training-completion records are unavailable and prohibited. Withhold operational SFTRM compliance assurance; demonstrate synthetic collisions, alternate allocations and every supplied fictional due occurrence.

Demonstrated stand-in: the exact prepared synthetic PB4T JSON format, five departmental agents, all four named training types, initial two collision entries, ENG-1 at 1980, six due/scheduled occurrences, numeric daily heatmaps, deadline/history recovery and local review. See syntheticCoverage and literal post-interaction assertions in `synthetic-pb4t`. This entire criterion remains deferred and unverified; no synthetic test satisfies the operational obligation.

# Bounded evaluator repair, 2026-11-05

Generated and locally runnable; local and clean-copy tests pass. **requirementsMet=false**. Source deferrals above and SCH-05 operator acceptance remain unverified. Owner delivery/deployment approval has not been given; no deployment was attempted. Frozen plans, requirements, supplied fixtures, architecture and foundation files are preserved. Original build tests are unchanged; coverage is added in `evaluator-repair.test.mjs`.

## Findings repaired

1. UC11-1 / DESC11-3 / SCOPE11-5: `lib/scheduling.js` now runs department-owned proposal/response handlers during bounded coordination. Rejected proposals receive actual violation objects; reservations retract on downstream failure before the owning handler counterproposes. `run` uses this implementation for every negotiation, retaining the exact frozen envelope. `negotiateWithTrace` collects actual pre-completion events from that same execution. `/api/exchanges` uses the normal worker and shared computation. The UI exposes its separate diagnostic run, including infeasible/exhausted termination and trace truncation. It does not invent a model conversation or alter committed board state.
2. UC11-1 / SCH-04 / SCOPE11-6: `prepareCadence` in `lib/pb4t.mjs` derives fictional interval obligations from cadence plus last completion and independent drill templates. The UI and `/api/cadence` use this same preparer; generated records then use the existing `compute` function. Both a deleted occurrence and its deleted drill are regenerated, including when the entire matching draft requirement disappears. Changed cadence/history and exact deadline boundaries affect coverage/feasibility. Missing or impossible coverage never silently relaxes a rule. The frozen explicit-obligation protocol remains intact; its descriptive reference interval has not been reinterpreted. The new preparation interface supplements it without claiming authoritative SFTRM behavior.
3. DELIVERABLE11-1: duty cells now use a continuous, documented scale against the supplied daily duty limit, with legend and visible numeric training/duty values. Real changed synthetic load inputs yield different ordered intensities for 0, 60 and 300 minutes. White/blue values and contrast switching are computed by the delivered client function.

## Executed evidence and boundaries

- `node --test *.test.mjs`: **21 passed, 0 failed, 0 skipped** (14 original plus seven new tests). Original complete-envelope oracle, fatigue/rest/availability/qualification boundaries, pairwise duty checks, HTTP worker transport, review/draft protection and startup readiness still pass. Added tests exercise actual application functions, live HTTP and delivered client event handlers; the client harness is not a layout/browser acceptance test.
- Clean copy: copied exactly `solution-contract.json.runtime.files` plus the six application test files to a fresh OS temporary directory, preserving inherited environment. All 21 tests passed, exit 0 on Node v26.0.0. Temporary directory removed. Tests launch the real service/worker, exercise health and invoke via existing service coverage, and invoke new cadence/exchange routes. `repair-test-output.txt` retains the clean-run output; `repair-runtime-hashes.json` records SHA-256 for every declared runtime file. These are local evidence, not host-owned reports.
- Existing host `test-report.json` is unchanged: 14 tests passed; 20/20 frozen browser journeys passed; clean package passed; required `pb4t-planning` / `pb4t-reference` exact capability scored 1 against threshold 1, one trial, no failing cases, synthetic dataset `pb4t-independent-synthetic-reference` version 1. Recorded runtime Node v24.22.2, files hash `57b4c3489b790e25506a9fcfb5487b04091a0811c1dbce42569da7d6463f1925`. **That report predates this repair** and is not final evidence for changed files. Host must rerun Node, capability, clean runtime and both-width browser gates. No new sealed capability result is claimed here.
- Source/caller review confirms UI normal requests go through `/api/invoke` → worker → `compute.mjs` → `lib/pb4t.mjs` → foundation scheduling code. Diagnostic trace invokes the same `run`; cadence preparation is shared between UI HTTP and tests. No test-only solver, fixture answer substitution, new runtime dependency or separate browser solver was introduced.
- `fleet_solve_schedule` independently illustrated a two-request resource/person conflict requiring retraction (B at 0 to 20, A at 30 to 50). This is a toolkit observation only, not application evidence.
- `fleet_browser` observed the actual primary Optimize flow at desktop and narrow widths, zero remaining collisions, ENG at 1980, and the actual 27-event trace with DC personnel/resource rejection, ENG retraction and counterproposal. The cadence example generated R-DC-C1 deadline 4440 and R-DC-C2 deadline 9480, then scheduled all six mandatory drills. Narrow impossible expired-qualification input reported infeasible; selecting/loading the ordinary sample and optimizing recovered. Console and error arrays were empty. These observations are exploratory and do not replace host assertions/traces.

## This session's visual review

Both initial reviews preceded source fixes. Both fresh rechecks use the final runtime files. No findings were recorded or remain open. Host owns the visual ledger and exported visual-review.json.

| Viewport | Initial capture | Final fresh recheck | Observed |
| --- | --- | --- | --- |
| Desktop | 2ab75c88-cd15-47d3-90de-41b077012ee1 | 27736e28-49bf-4145-ad39-b6035ca34729 | Readable seven-day board initially; final load table has legend, white zero, lighter 60-minute and darker 120-minute cells with numeric values. |
| Narrow | 010174e8-8bc4-4a12-87d9-032477a1c5d0 | 898101df-6417-45dd-b85a-0d8a9d5020a7 | Stacked controls/lanes initially; final actual exchange trace and constraint reasons wrap within 390px without clipped text. |

## Criterion mapping

Host baseline statuses below predate repair; local evidence does not upgrade a deferral or establish reviewer acceptance. Every implemented criterion awaits the final host rerun for the current runtime.

| Criterion | Current evidence / remaining status |
| --- | --- |
| UC11-1 | Unverified primary real-data deferral. Synthetic live collaboration and cadence generation now tested; no operational SFTRM assurance. |
| SCH-01 | Local pass: complete-envelope oracle and independent interval/resource/person checks; host baseline passed. |
| SCH-02 | Local pass: availability, qualification, exact rest, daily/weekly budgets and midnight splitting; host baseline passed. |
| SCH-03 | Local pass: exact infeasible/exhausted envelopes and new actual termination traces; host baseline passed. |
| SCH-04 | Local pass for explicit coverage plus new synthetic cadence/history expansion, deletions, changed cadence, multiple weekly occurrences, exact boundary and impossible coverage. SFTRM mapping remains unverified. |
| SCH-05 | Unverified human-authority dependency: actual PB4T operator acceptance; local revision review is a demonstration and realApproval stays false. |
| DELIVERABLE11-1 | Local pass: original board/edit/export tests and new ordered heat intensity test; desktop observed scale/legend. Final host rerun pending. |
| DESC11-1 | Unverified primary real-data deferral; all four named synthetic training types remain represented. |
| DESC11-2 | Local pass: exact initial personnel collision and zero remaining collisions; host baseline passed. |
| DESC11-3 | Local pass: actual departmental proposals, rejection reasons, reservation retraction and counterproposal trace, changed preferences and termination; host baseline summary checks passed. New behavior needs independent review. |
| SUMMARY11-1 | Local pass: shared windows, qualified crews, fatigue, complete feasible allocation or abstention; host baseline passed. |
| SCOPE11-4 | Local pass: schema, retained drafts and startup recovery tests; host baseline passed. |
| SCOPE11-5 | Local pass: same core plus department response handlers and UI trace; host baseline passed. |
| SCOPE11-6 | Unverified primary real-data deferral; collision alternatives and newly derived fictional cadence obligations tested, no real SFTRM claim. |
| SCOPE11-7 | Local pass: saved review/export boundaries; unchanged base export envelope retains original host byte expectations. Cadence exports additionally retain their independent rules. |
| SCOPE11-9 | Source attribution and visible synthetic provenance retained; host baseline passed. |

## Remaining limits and gates

The frozen protocol and capability cases establish only explicit obligations and final negotiation summaries. Independent acceptance coverage for the new cadence preparation and actual exchanges was absent from planning; new repair tests address the observed gaps but cannot change frozen expectations. Broader independent evaluations require a new planning run. Missing official rules is not a valid reason to omit the synthetic workflow; the labeled cadence model now demonstrates it. Authoritative SFTRM mapping and fatigue values remain unverified owner inputs.

The algorithm remains finite bounded feasibility search with fixed eligible crews and supplied candidate times, not global roster optimization or balancing. Cadence is fixed intervals anchored to one completion; it is not a calendar/SFTRM model or an ingestion of real completion records. There is no future-obligation derivation beyond the current horizon in this cadence supplement; legacy explicit future obligations remain supported. Too many generated obligations, invalid templates, unavailable coverage and exhausted search fail visibly. Trace storage is limited to 2,000 displayed events. Human usability/accessibility, production-scale performance, multi-user persistence, encryption and operational integration are not established. Owner approval is required before delivery/deployment.
