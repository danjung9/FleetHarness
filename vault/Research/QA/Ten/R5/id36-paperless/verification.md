# Primary deferrals

These deferrals remain unverified. Local prototype checks do not establish operational outcomes. Synthetic workflow completion does not discharge these real-world dependencies. No missing specification or expert advice is used as a deferral reason.

### UC36-4

Original wording: Runs on government devices and existing low-code platforms where possible

real-system: Government-managed tablet/browser configuration and an owner-selected existing low-code platform are unavailable. Withheld action: Government-device compatibility certification and platform installation. Demonstrate the complete synthetic forms/tasking workflow on a local browser/tablet-sized interface; produce an exportable packet and a one-page transition checklist with platform/pilot steps explicitly awaiting owner action.


### EVAL36-3

Original wording: Time per packet against a manual baseline [baseline to be set with Fleet SME]

real-data: A measured, comparable manual packet baseline from Fleet SME trials is not supplied. Withheld action: Claiming measured operational time savings. Demonstrate extraction, validation, review, routing and records filing; produce a synthetic benchmark report with independently fixed input counts, caught errors, timing assumptions and calculated savings explicitly labeled estimates, not observed fleet benefit.


### EVAL36-5

Original wording: Ease of use judged by a Sailor panel

human-authority: An actual Sailor panel must provide its own usability judgment. Withheld action: Claiming Sailor-panel endorsement. Demonstrate the complete synthetic workflow and generate an unscored review worksheet with the exact panel/rubric categories and literal status “Awaiting human assessment”. No invented panel or judge rating.


### EVAL36-6

Original wording: Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.

human-authority: Official judges alone assign the official rubric scores. Withheld action: Assigning or implying official scores. Demonstrate the complete synthetic workflow and generate an unscored review worksheet with the exact panel/rubric categories and literal status “Awaiting human assessment”. No invented panel or judge rating.


### DELIVERABLE36-1

Original wording: Sailor hours returned to maintenance, training and watchstanding

real-data: Representative unit workload and observed before/after completion times are absent. Withheld action: Claiming Sailor hours actually returned. Demonstrate extraction, validation, review, routing and records filing; produce a synthetic benchmark report with independently fixed input counts, caught errors, timing assumptions and calculated savings explicitly labeled estimates, not observed fleet benefit.


### DELIVERABLE36-2

Original wording: Fewer errors and less rework

real-data: Observed unit error and rework rates for comparable packets are absent. Withheld action: Claiming measured operational error or rework reduction. Demonstrate extraction, validation, review, routing and records filing; produce a synthetic benchmark report with independently fixed input counts, caught errors, timing assumptions and calculated savings explicitly labeled estimates, not observed fleet benefit.


### DESC36-2

Original wording: High-value outcome to the fleet: Sailor hours move from paperwork and re-keying back to maintenance, training and watchstanding.

real-data: Observed unit workload and before/after task times are absent. Withheld action: Claiming actual redistribution of Sailor work hours. Demonstrate extraction, validation, review, routing and records filing; produce a synthetic benchmark report with independently fixed input counts, caught errors, timing assumptions and calculated savings explicitly labeled estimates, not observed fleet benefit.


### DESC36-11

Original wording: - Destination: Existing low-code / automation platform; pilot with one ship or expeditionary unit

real-system: No owner-selected low-code platform or authorized ship/expeditionary pilot environment is provided. Withheld action: Installing on an operational platform or running a unit pilot. Demonstrate the complete synthetic forms/tasking workflow on a local browser/tablet-sized interface; produce an exportable packet and a one-page transition checklist with platform/pilot steps explicitly awaiting owner action.


### DESC36-12

Original wording: - Next steps: 30d: owner selects the forms and workflows to pilot; 60d: build on the owner's platform; 90d: unit pilot; 180d: fleet release decision

human-authority: Platform owners and unit/release authorities must select the pilot and authorize pilot and fleet release decisions. Withheld action: Executing the 30/60/90/180-day transition or representing it as approved. Demonstrate the complete synthetic forms/tasking workflow on a local browser/tablet-sized interface; produce an exportable packet and a one-page transition checklist with platform/pilot steps explicitly awaiting owner action.


### DESC36-16

Original wording: The goal is to return Sailor hours to maintenance, training and readiness within EMCON and offline limits.

real-data: No observed maintenance/training/readiness hours or approved operational EMCON environment is supplied. Withheld action: Claiming actual returned hours or operational EMCON readiness. Demonstrate extraction, validation, review, routing and records filing; produce a synthetic benchmark report with independently fixed input counts, caught errors, timing assumptions and calculated savings explicitly labeled estimates, not observed fleet benefit.


### SCOPE36-25

Original wording: - Sailor hours returned to maintenance, training and watchstanding

real-data: Representative workload and measured manual/application timings are absent. Withheld action: Claiming actual Sailor hours returned. Demonstrate extraction, validation, review, routing and records filing; produce a synthetic benchmark report with independently fixed input counts, caught errors, timing assumptions and calculated savings explicitly labeled estimates, not observed fleet benefit.


### SCOPE36-26

Original wording: - Fewer errors and less rework

real-data: Comparable observed operational error and rework rates are absent. Withheld action: Claiming actual error or rework reduction. Demonstrate extraction, validation, review, routing and records filing; produce a synthetic benchmark report with independently fixed input counts, caught errors, timing assumptions and calculated savings explicitly labeled estimates, not observed fleet benefit.


# Verifier session, 2026-11-05

Verdict: **incomplete verification; requirementsMet=false**. Generated and runnable locally; 14 application tests pass, including the original unchanged 11 plus three new adversarial tests. Neither reviewer acceptance nor operational validation is established. Owner approval is required before delivery/deployment.

Executed `node --test *.test.mjs`: 14 passed, 0 failed, 0 skipped. Repeated in a temporary clean directory containing only the declared runtime allowlist and the three test files: 14 passed, exit 0; temporary directory removed. service.test.mjs starts the actual server, checks health/raw invocation/malformed JSON and serves shared modules; this also exercises the README quick start entrypoint. No dependency install is needed. No test-report.json or host reports were authored.

## Bounded repair and exploratory evidence

Source review found Save could clear a conflict without reviewing every head. public/app.js now rejects saves on conflicted records, rejects editing tombstones and prevents approval of deleted forms. Repeating task extraction now reprocesses saved reviewer decisions and clears stale status approval when the draft changes. In the actual browser, loaded the conflict scenario and pressed Save: observed “Resolve all competing heads before saving a new revision.” with last saved quantity 12 intact. Extracted tasking, selected TASK-TRAIN, entered synthetic reviewed owner/due/evidence, saved, and extracted again: 4 tasks, 3 verified and 1 needing review remained. These are development observations, not independent acceptance results.

Additional verifier-edge.test.mjs checks complete protocol envelopes for priority/instant/ID ties, completed transfers, stopped acknowledgements, malformed offsets/timestamps/priorities, conflict gate precedence, same-content revision approval invalidation, duplicate ancestry and tombstone replay. Original tests unchanged. Browser and service both import compute.mjs, which calls domain.mjs and lib/offline.js; no parallel evaluator-only algorithm exists.

This session recorded initial desktop and narrow visual reviews before repairs and fresh final-runtime rechecks at both widths. Actual images show readable desktop source/editor layout and narrow stacked controls, wrapped recovery text and task summary. No visual findings remain. Browser console reports only preview's service-worker registration block; reviewed interactions show no application exception. Captures and review ledger are host-owned under .browser-observations/ and visual-review.json.

## Remaining failures and evidence gaps

- **OFF-01 / UC36-1**: true disconnected shell reload was not exercised because fleet_browser blocks service workers. The Work offline control proves local computation mode only. Frozen reload journeys and both-width independent acceptance remain pending host execution.
- **OFF-02 / UC36-1 / UC36-3 / UC36-6**: transfer UI plans chunks and simulates acknowledgements, but does not persist actual received payload bytes, deduplicated receiver ranges or digest-validated transfer. The promised durable simulated receiver in plan.md is missing. Passing plan arithmetic does not satisfy that integration obligation.
- **OFF-04 / UC36-1**: IndexedDB writes complete before Saved, but whole-workspace writes lack the planned generation check or stale-tab coordination. Two tabs can overwrite newer work. Cross-tab safety, eviction, quota/transaction-abort recovery and device loss are not fully validated. The storage-failure button is a simulation.
- The linked error summary/focus restoration described in ux-spec.json is incomplete: field errors are text and only selected fields receive focus. Complete keyboard/screen-reader/contrast and physical-device touch validation was not performed.
- No authenticated transport, encrypted device/key design, real government endpoint or platform installation is present. No actual cloud/government synchronization endpoint was contacted. Synthetic grammar, dates, fields and schedules are not validated against real formats. All 12 primary deferrals above remain unverified.
- This session exercised import/extraction, form save/review/queue, conflict-save rejection and reviewed task decision/re-extraction. README downloads, complete three-form sequence, every recovery control and actual offline reload were not all repeated in this session. Earlier build observations are historical, not substituted for this verifier session.

These gaps prevent a full completion verdict even if the frozen browser journeys pass. Further integration work is required; do not weaken frozen contracts to match the prototype.

## Host capability evidence

The existing host-owned .quality-evidence/core-report.json reports status passed for eight exact evaluations, 32 synthetic planner-authored cases, one trial each, score 1.0 at threshold 1.0, no per-trial failures. Runtime v24.22.2, evaluated filesHash 861d3c0c6e2f9acafb4fb3316a9b5abafc9a0bc7f8fe6d5afa7b6ae32fb6d459. This is earlier host evidence; public/app.js changed in this verifier session, so a fresh host hash/core/browser run is required. Core modules remain unchanged. No sealed answer key was recreated. Clean-runtime local tests supplement, never replace, host evaluation.

Optional Impeccable engine was not run; bundled audit/critique/craft-floor/operate references were read. No project helpers were available or required. Supplied fixtures, input manifest, frozen plans, foundation files and system-design.json were preserved.

## Criterion-by-criterion evidence

“Core passed” below refers to existing host capability evidence and actual application tests, not complete source-requirement acceptance. All frozen journeys await host execution at desktop and narrow widths. Every deferred source obligation remains unverified regardless of its demonstrated synthetic output.

| Criterion | Disposition / verification status | Application evidence | Frozen browser journeys pending |
|---|---|---|---|
| UC36-1 | Partial evidence; browser/integration UNVERIFIED | reconciliation, transfers; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, conflict-review, transfer-resume, history-recovery |
| UC36-2 | Partial evidence; browser/integration UNVERIFIED | review; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, stale-review |
| UC36-3 | Partial evidence; browser/integration UNVERIFIED | review; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | conflict-review |
| UC36-4 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| UC36-5 | Partial evidence; browser/integration UNVERIFIED | estimates; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports, forms-offline |
| UC36-6 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, conflict-review, review-reports |
| OFF-01 | Partial evidence; browser/integration UNVERIFIED | reconciliation; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | conflict-review |
| OFF-02 | Partial evidence; browser/integration UNVERIFIED | reconciliation; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | conflict-review |
| OFF-03 | Partial evidence; browser/integration UNVERIFIED | reconciliation; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | conflict-review |
| OFF-04 | Partial evidence; browser/integration UNVERIFIED | transfers; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | transfer-resume |
| OFF-05 | Partial evidence; browser/integration UNVERIFIED | review; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, storage-recovery, stale-review |
| EVAL36-1 | Partial evidence; browser/integration UNVERIFIED | extraction, tasking; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records |
| EVAL36-2 | Partial evidence; browser/integration UNVERIFIED | validation; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | validation-recovery, tasking-records |
| EVAL36-3 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| EVAL36-4 | Partial evidence; browser/integration UNVERIFIED | reconciliation; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, conflict-review, history-recovery |
| EVAL36-5 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| EVAL36-6 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| DELIVERABLE36-1 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| DELIVERABLE36-2 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| DELIVERABLE36-3 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline |
| DESC36-1 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, conflict-review |
| DESC36-2 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| DESC36-3 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records |
| DESC36-4 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline |
| DESC36-5 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports |
| DESC36-6 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports |
| DESC36-7 | Partial evidence; browser/integration UNVERIFIED | extraction, validation; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, validation-recovery |
| DESC36-8 | Partial evidence; browser/integration UNVERIFIED | tasking, records; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | tasking-records, reset-recovery |
| DESC36-9 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports |
| DESC36-10 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports |
| DESC36-11 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| DESC36-12 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| DESC36-13 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports |
| DESC36-14 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records |
| DESC36-15 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, conflict-review |
| DESC36-16 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| SUMMARY36-1 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, conflict-review |
| SCOPE36-17 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports |
| SCOPE36-24 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports |
| SCOPE36-25 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| SCOPE36-26 | Deferred; UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline, tasking-records, review-reports |
| SCOPE36-27 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | forms-offline |
| SCOPE36-28 | Partial evidence; browser/integration UNVERIFIED | No computational capability; core.test.mjs, service.test.mjs, verifier-edge.test.mjs where applicable | review-reports |
