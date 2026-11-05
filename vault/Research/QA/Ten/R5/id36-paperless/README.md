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


# Paperless Underway

A local synthetic workspace for Sailor form drafters, task coordinators and records reviewers. All examples are synthetic, not validated against the real format. Owner approval is required before delivery or deployment.

## Start

Requires Node.js 22.19 or newer to run the loopback service and developer tests. No `npm install` step is needed: the declared runtime has no third-party dependencies. No model settings, model download, API keys or other credentials are required. End users access the browser interface; whoever starts the local service needs Node. Use a modern browser with IndexedDB; service workers need localhost/loopback secure-context support.

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

Open http://127.0.0.1:3000/. Do not open index.html through file://. The first load requires the local service. When the page reports Offline shell prepared, the service worker has cached the shell and shared core. Work offline disables API use; the exact same core runs locally. Browser storage and cache may be evicted. The development preview blocks service workers, so true disconnected reload is not verified by preview observations.

## Capture and review forms

1. Select **Import synthetic sources**, then **Work offline** and **Extract forms**. Sources are embedded in the page; no fixture files are fetched. Reimport starts a new synthetic workspace, so export existing work first.
2. In TRAIN-01, inspect source region R4. The glyphs are 6O, with alternatives 60 and 6O. Enter **60** in **Duration in minutes**, then **Save form**. This constrained SVG transcription is not OCR.
3. Check **I reviewed the current saved revision**, select **Approve form**, then **Queue offline**. Approval binds the committed revision. An edit requires a new save and approval.
4. Use **Current record** to review REQ-01 (quantity 12; document date from capture context 2026-10-26) and CORR-01 (Training completion summary, enclosure ART-ENC). Review and queue each. The workspace shows **3 forms queued offline**. Dirty edits require save or discard before switching.
5. Select **File records**. Expected dates: TRAIN-01 2027-10-26, REQ-01 2028-10-25, CORR-01 2027-04-25. Filing dates use invented calendar-day rules; no automatic disposal. Select **Export packet** for the forms, source data, history, audit and outbox.

## Tasking and records

1. Select **Extract tasking**. Seven supplied messages and one text attachment yield four tasks: two verified and two needing review. The supply action is completed; the briefing action is cancelled.
2. Read full numbered source messages under **All imported source documents**. Unmarked owner/due contradictions stay visible and are excluded from status claims. Hostile text is inert data.
3. Review the verified status draft, check its review box, and select **Approve verified draft**. This approves a local draft only.
4. For unresolved actions, expand **Resolve a task with source evidence**, enter reviewed owner, zoned ISO due timestamp and supporting decision, then **Save reviewed task decision**. The amended sources are reprocessed through the shared core and require a fresh draft review.
5. **File records** produces TASK-SUPPLY 2027-01-28 and TASK-BRIEF 2027-01-29; unresolved/open actions remain hold. **Export actions** retains citations and decisions.

## Reconnect and recovery

1. **Load synthetic conflict scenario** shows quantity 14, quantity 16 and deletion. Choose a result only after reviewing all heads, check the review box, and select **Resolve conflict**. A new operation references every reviewed head; clocks never choose the winner.
2. Review the resulting current form, approve it, and queue it. **Reconnect simulator**, then **Synchronize now**, changes it to routed-local-simulation. Repeating synchronization adds no duplicate routed event. No external endpoint is contacted.
3. **Load transfer scenario**, enter a byte budget of 1024, check **Simulate receiver acknowledgement**, then **Plan transfer / simulate acknowledgement**. Expected acknowledged offsets: ART-REQ 174/174; ART-PHOTO 2898/4096. **Lose next acknowledgement** preserves offsets; **Stop sync** preserves work, and **Resume sync** allows continuation. Without the acknowledgement checkbox, planning advances nothing.
4. Recovery simulation controls can remove/restore an enclosure, interrupt storage or load/supply missing ancestry. Failed saves retain the visible draft and prior committed quantity. Correct validation errors and retry; **Restore storage** turns off the simulated failure.

## Reports, export and reset

**Generate review report** runs six independent planted-error checks against the shared core and computes the fixture's estimate: (24 − 9) × 8 = 120 minutes = 2 hours, with 7/7 planted errors caught. Timings are assumptions, not observations. Panel/rubric scores stay unassigned. Export the review worksheet, path to fleet and source requirements from **Review & handoff**. Reset requires a deliberate delete confirmation; Cancel or Escape retains work. Export before reset. JSON exports are readable backups; importing exported packets is not implemented.

## Formats and persistence

No input files were attached during intake. The prepared examples are `data/synthetic-data.json`, documented in `data/README.md`, and embedded exactly in `public/index.html`. The UI has no file-upload or arbitrary-document import control. It uses the supplied synthetic SVG text regions, line-labeled forms, constrained Task/Amends/Updates/Forward-of/Attachment messages, immutable revisions and byte-offset fixtures. API callers POST a raw JSON action to /api/invoke; supported actions are reconcile, plan, extract, validate, classify, workflow, benchmark and tasks. The public invocation protocol is in solution-contract.json. No arbitrary SVG is executed. Strings are rendered as text.

Validation rejects impossible calendar dates such as 2026-02-30, blank required values and missing referenced enclosures. Training duration must be an integer from 1 to 480 minutes, with a date, topic, participant list and reviewer. Requisition quantity must be an integer from 1 to 9999; Unit must be EA or BOX, Priority critical or routine, and identifiers/destination are required. Correspondence requires a known reference, present enclosures and the ordered ADMIN-DRAFTER > ADMIN-REVIEWER > ADMIN-APPROVER route. Errors preserve the entered draft; correct the fields and select Save form again. Approval and queuing are separate deliberate actions.

Saved records, selected record, draft edits, decisions, audit and acknowledged offsets are designed to survive an ordinary reload in the **same browser profile and origin**. Keep the same hostname and PORT: a different port creates a different browser workspace. Private browsing, cleared site data, storage eviction or a different device will not restore the workspace. The shell must be cached, or the local service must still be running, for reload to display the application.

IndexedDB stores an atomic workspace snapshot containing source assets, forms, graph, exact-revision decisions, audit, outbox and acknowledged offsets. Draft autosaves are separate from committed form fields and remain labeled Unsaved changes until Save form completes. Plain IndexedDB is not encrypted and actor labels are not authenticated identities. Device loss, eviction and multi-tab editing are not production-supported. Keep a single workspace tab and export regularly.

If startup fails, check Node version and whether the assigned loopback port is free. If offline cache is unconfirmed, keep the service running for reload. If storage is unavailable, keep the page open, export, then restore browser storage permissions and retry. The app does not silently claim a failed write succeeded.

## Export files

| Button | Download | Contents |
|---|---|---|
| Export packet | synthetic-packet.json | Forms, available source assets, filing results, operation graph, conflict history, audit, outbox and transfer offsets |
| Export actions | synthetic-actions.json | Tasks, citations, status draft, reviewer decisions and approved-draft text where present |
| Export review worksheet | synthetic-review.txt | Generated estimate, primary deferrals and unassigned human assessment |
| Export path to fleet | path-to-fleet.md | Owner handoff and field prerequisites |
| Export source requirements | source-requirements.txt | Supplied use-case requirements and source URL |

Generate the relevant results before exporting them. Exports are snapshots; later edits do not update an earlier download. Dirty form edits are separate from committed fields and are **not included in Export packet**: save them first. Downloaded JSON cannot currently be imported back into this UI. For reset, select Reset workspace, then either Cancel reset or Delete local workspace. Deletion clears workspace data in IndexedDB; it does not uninstall the cached application.

## Troubleshooting

| What you see | What to do |
|---|---|
| Empty local workspace | Import synthetic sources, then Extract forms or Extract tasking. |
| Duration is ambiguous | Inspect R4 and enter the reviewed numeric duration; the example uses 60. |
| Approval is required for this revision | Save edits, review the current saved revision, Approve form, then Queue offline. |
| Save failed: storage unavailable. | For the simulation select Restore storage and retry Save form. For real browser storage failure, keep the tab open, preserve entered values and restore storage access before retrying. |
| Enclosure ART-ENC is missing. | Select Restore enclosure, then Save form. |
| Missing history | Select Supply missing history, then Synchronize now; pending operations are retained. |
| Offsets do not advance | Check the acknowledgement box, use a positive budget and Resume sync; a lost acknowledgement intentionally retains offsets. |
| Offline shell unavailable / not confirmed | Keep the local service running for reload. Check browser service-worker support; preview blocks registration. |
| Apparently missing saved work | Check hostname, port and browser profile; do not reset or reimport until checking these. |

## Developer checks and limitations

```sh
node --test *.test.mjs
```

Eleven local tests passed during build. These test actual shared code and the HTTP adapter, including full response envelopes and novel boundary inputs. Toolkit calculations are reference checks only. The host-owned core report passed all eight evaluations (32 synthetic cases, case pass rate 1.0 against threshold 1.0). Independent browser acceptance and operational validation remain separate; do not treat exploratory browser observations as those acceptance results. No real OCR, authenticated transport, device encryption, government endpoint, government device certification, measured SME baseline, official score, Sailor-panel assessment or operational release is claimed. The dependency-free node-service/offline foundation version 1.0.0 is reused as recorded in FOUNDATION.md and foundation-lock.json; no new third-party dependencies.

See [verification.md](verification.md) for evidence limits and [path-to-fleet.md](path-to-fleet.md) for sponsor, deployment and field validation prerequisites.

## Verifier status

Fourteen tests pass locally and in an isolated copy of the declared runtime. Independent host browser journeys remain pending. Verification is incomplete: true disconnected reload, stale-tab protection and durable receiver payload/deduplication are unverified or missing. Read verification.md before review. Saving a conflicted record requires resolving all heads first; deleted forms cannot be approved. Repeating Extract tasking preserves saved reviewer decisions. Owner approval remains required before delivery/deployment.
