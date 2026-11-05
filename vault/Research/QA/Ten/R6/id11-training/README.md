# Primary deferrals

## UC11-1

> The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Approved SFTRM rules, fatigue policy and training history are unavailable; withhold real SFTRM compliance and operational readiness. Demonstrate complete fictional agent negotiation, collisions, alternatives and recurrence.

## DESC11-1

> Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations.

real-data: Real crew availability and ship operations are unavailable under the synthetic-only boundary; withhold real calendar coordination. Demonstrate all named drill families and computed allocations with fictional personnel and operations.

## SCOPE11-6

> The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Approved SFTRM mandates and completion history are unavailable; withhold actual compliance certification. Demonstrate collision resolution, alternatives and every fictional due occurrence including impossible obligations.

SCH-05 is a recipe-only human-authority deferral: actual PB4T operator acceptance remains unverified. A local evidence-reviewed synthetic acknowledgment is demonstrated. No expected deliverable is deferred.

# PB4T weekly planning, user guide

## Purpose and audience

This local application helps PB4T coordinators and departmental training leads explore a fictional weekly drill calendar. Engineering, Weapons, Combat Systems, Damage Control and Flight Operations agents propose candidate allocations; the shared core checks qualifications, availability, exclusive resources, operational windows, fatigue limits and recurring obligations. The interface shows a weekly board, candidate decisions, loading heatmap and recurrence coverage.

**Synthetic, not validated against the real format. No SFTRM compliance or operational approval.** All prepared names, records and policy values are fictional. Keep this prototype synthetic-only.

## Prerequisites and startup

The person hosting the app needs **Node.js 22.19 or newer** and the complete source folder. Users need a modern browser and access to that running local service. No npm dependency installation, model, model settings, API key or external service is required. The application uses the standard Node libraries and browser APIs; it does not perform model inference.

In a terminal, change into the application folder, then run:

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

Open **http://127.0.0.1:3000/**. Use the numeric loopback address. Keep the terminal running while using the app; press Ctrl+C to stop the service. If port 3000 is occupied, use `PORT=3001` and open http://127.0.0.1:3001/. A different port has separate browser storage.

For Windows PowerShell:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
node server.mjs
```

With Node and the source already present, the app can run offline. Opening an HTML file through `file://` does not start the required computation service. There is no public hosting setup or government-device installation approval.

## Plan a week: reproducible synthetic walkthrough

The examples come from the preserved [synthetic fixture file](data/synthetic-data.json). The HTML embeds its 22 scenario inputs; the solver does not read their hand-keyed expected answers. The baseline week starts **Monday, 9 November 2026, 00:00 UTC**, using unapproved policy **FICTIONAL-PB4T-1**.

1. Click **Load synthetic baseline**. If a previous edit blocks loading, click **Discard draft** first. Loading replaces the current saved input/result with the example.
2. Inspect the policy line and **PB4T input and draft recovery**. Click **Optimize schedule**. While calculating, duplicate actions are disabled and **Cancel** is available.
3. Expect **Feasible synthetic draft, 5 drills; 0 remaining collisions.** The initial collision summary identifies DC-1/ENG-1 sharing P1/R1 and CS-1/WPN-1 sharing P3/R2.
4. Inspect **Weekly schedule**. The expected allocations are:

| Drill | UTC time | Crew | Resource |
| --- | --- | --- | --- |
| DC-1, Damage Control drills | Mon 09:00 to 10:00 | P1 | R1 |
| ENG-1, engineering casualty controls | Tue 09:00 to 10:00 | P1, P2 | R1 |
| CS-1, Combat Systems exercises | Mon 11:00 to 12:00 | P3 | R2 |
| WPN-1, Weapons exercise | Tue 11:00 to 12:00 | P3 | R2 |
| FLT-1, flight quarters | Wed 09:00 to 10:30 | P4, P5 | R3 |

5. Under **Departmental negotiation**, Engineering moves from minute 540 to 1980; Weapons moves from 660 to 2100. Expand **Candidate trace and rejection reasons** to inspect tested candidates. A locally accepted candidate can later be backtracked; final board assignments identify the agreement.
6. Under **Personnel loading**, expect P1/P2/P3/P4/P5/P6 drill totals of **120/60/120/90/90/0 minutes**, totaling **480 person-minutes**. Daily cells exclude prior duty; **Prior duty** and **Total duty** are separate columns. On a narrow screen, scroll the table horizontally.
7. Under **Training periodicities**, expect **5 satisfied; 0 unmet; 0 pending-future**. Each baseline occurrence has deadline minute 10080. These are fictional periodicities, not validated SFTRM mandates.

Optimize chooses the **first complete feasible roster** in the declared candidate order. It does not minimize workload or establish a globally optimal schedule.

## Edit and check the board

1. In the ENG-1 card, change **Start minute** from `1980` to `540`. Start values are integer minutes from weekStart; they are not clock strings. To change staff, enter comma-separated known IDs in **Crew IDs (role order)**.
2. Click that card's **Apply edit**. This stores the board change locally and marks derived evidence stale; review and export are blocked. Apply edit alone does not establish feasibility.
3. Click **Check board**. For this example, expect **Invalid board: DC-1 / ENG-1 share P1 and R1. Review blocked.** Check board uses the current applied board and recomputes constraints, loading and coverage without searching for alternatives.
4. Click **Optimize schedule** to return to the input proposal candidates and regenerate the complete baseline solution. To retain a valid manual placement, use **Check board** instead; Optimize may select a different candidate. To change candidate choices, use **Plan without JSON → Drill requests → Edit selected**, or the advanced PB4T JSON editor.

All controls work with Tab and keyboard activation; editing does not require dragging. Apply an edit before checking it. Unapplied field text is not an exported or saved allocation and may be replaced by rendering/reload.

## Load scenarios and inspect recurrence or failure

1. Choose **Recurrence carry-in history and impossible due window** in **Example scenario**, then click **Load scenario** and **Optimize schedule**.
2. Expect O-CS-1-0 at deadline 2880 to be **satisfied-by-history**, O-CS-1-1 at 7200 **satisfied-by-schedule**, and O-CS-1-2 at 11520 **pending-future**. The due drill CS-B starts at 3540. The scenario title includes “impossible”; this variant is feasible because the unavailable proposal is future-due.
3. Load **Due recurrence with no operational window** and optimize. Expect an infeasible result with occurrence 1 **unmet**, occurrence 0 credited to history and occurrence 2 still future-due. Review stays blocked.
4. Load **Tiny budget on known feasible week** and optimize. Expect **Search budget exhausted, feasibility unknown; review blocked.** The budget did not establish infeasibility. Load the baseline again to recover a known complete allocation.

A valid but infeasible or budget-exhausted result returns no partial allocations. Its unresolved coverage and trace remain available for inspection and export when current.

## Edit, save and recover PB4T input

1. Expand **PB4T input and draft recovery** and edit **PB4T JSON input**. Start from a prepared example to retain the complete required structure.
2. Click **Save draft** to validate and save the input locally. This clears previous board/evidence; it does not mean a feasible schedule was found. Click **Optimize schedule** to calculate a result. Optimize also commits successfully validated input when returning a scheduling result.
3. Invalid input remains in the editor for correction and preserves the prior valid input/result. For example, replace the editor with `{}` and click **Optimize schedule**: expect `INVALID_SCHEMA: Complete PB4T metadata, policy and arrays are required.`
4. Correct the input and retry, or click **Discard draft** to restore the saved input and last computed assignments. To reset to the original sample, discard unfinished changes if necessary, then click **Load synthetic baseline**.

Before switching scenarios while dirty, explicitly choose **Save draft** or **Discard draft**. Changing input or board fields revokes local acknowledgment and blocks review/export until current evidence is computed. **Cancel** aborts the current computation; the prior result is retained, with review blocked until recovery/recomputation.

## Plan a new synthetic week without JSON

1. Load the synthetic baseline. In **Plan without JSON**, choose a week-start date and **Set week start**. Any weekday is supported; board and heatmap headings show the actual UTC weekday and date across the supplied horizon. All dates and times use UTC.
2. Choose **Drill requests**, then **Add new**. Enter a drill family, department and priority. Choose qualified roles and a shared resource. Add candidate start/end times with the calendar controls; every candidate must have the same duration.
3. Choose **Apply planning changes**, then **Optimize schedule**. A new drill receives a generated ID, departmental ownership, a linked fictional weekly rule and occurrence automatically. No manual references or minute offsets are needed.
4. For a sixth fire-party drill, leave Monday 09:00 to 10:00 as its first candidate and set the second to Tuesday 14:00 to 15:00. The baseline crew/resource conflict causes a counterproposal; the result contains six drills with zero collisions and the new drill Tuesday 14:00.
5. Select **Roster and availability**, **Shared resources**, or **Operations and blackouts** to edit people, qualifications, availability, prior duty, capacity-one resource availability and operational intervals. People and resources can be added. Record IDs remain stable.
6. Select **Fictional training rules** to edit family, period and anchor. Changing period/anchor regenerates linked occurrences from the first drill template, retains its relative time/crew preferences, and clears previous linked assignments and completion history. Review this warning before applying. The 24-request limit still applies; impossible operations stay unresolved.

Apply commits form values into the local input draft; Save draft or Optimize validates the full PB4T object. Invalid intervals retain entered form values and show a correction message. Unapplied form changes block loading, computing and saving until **Apply planning changes** or deliberate **Discard draft**. A reload warning protects unapplied forms, but those form controls are not independently restored after a forced reload; apply them before closing. Staged input persists through LocalStorage.

The guided request editor selects one shared resource per drill; the advanced JSON editor supports multiple resource IDs and synthetic history/policy details. Forms edit supplied fictional fixed-window rules, never infer real SFTRM mandates. Personnel loading bands are 0, 1 to 60, 61 to 120 and 121+ minutes, with exact numbers and a visible legend.

## Review, export and persistence

1. Produce a current feasible result and inspect allocations, negotiation, loading and coverage.
2. Check **I reviewed allocations, negotiation, loading and coverage.**
3. Click **Acknowledge synthetic draft**. Expect **Synthetic draft acknowledged locally. Operational approval: none.** This is a browser-local record, not owner acceptance, delivery authorization or operational publishing.
4. Click **Export draft** to download `pb4t-draft.json`. The file contains the synthetic warning, policy, input, result and review status. Export requires current derived results; acknowledgment is not required. Current infeasible outcomes can also be exported for diagnosis.

Input, the last computed response, applied board edits, unfinished JSON editor text and acknowledgment are stored automatically in **LocalStorage**. Reload retains them at the same browser origin/port; acknowledgment is invalidated by subsequent changes. There is no server-side persistence, account, encryption, synchronization or multi-user conflict handling. Browser clearing/private-mode restrictions can remove or prevent storage.

There is no file-upload or full-export import control. To recover input from an exported file, open it in a text editor, copy only its `input` object into **PB4T JSON input**, save and recompute. This does not restore exported manual board edits or acknowledgment. To delete all local application data, clear this site's browser storage; there is no in-app delete-all button.

## Supported format and validation

The editor accepts a **PB4T JSON object**, not the entire fixture envelope, export envelope, CSV or calendar file. See the detailed [synthetic grammar](data/README.md). Required sections include metadata, explicit policy, agents, personnel, resources, operations, requests, trainingRules, trainingHistory, search and initialAssignments. The API receives `{ "action": "solve", "data": <PB4T object> }`; the UI adds this wrapper automatically.

Time uses half-open integer UTC minute intervals `[start,end)` relative to weekStart; end must exceed start. Each candidate window is exactly one drill duration. Roles require distinct people with exact qualifications. Resources have capacity one. Fatigue includes prior duty, per-day and rolling 24-hour limits and rest between duty intervals. Recurrence supports fixed windows only, window length equal to period and requiredCount=1. There are no inferred policy defaults.

Limits: **24 requests, 200 personnel, 100 candidate windows per request, 10080-minute horizon**. IDs must be unique, references must exist and request ownership/occurrence links must agree. Empty/incomplete input, null or wrong types, reversed intervals and missing fatigue values are rejected. A lack of available qualified personnel in otherwise valid input is a scheduling infeasibility.

## Troubleshooting

| Symptom | Recovery |
| --- | --- |
| Cannot connect or fetch fails | Start the local service and use `http://127.0.0.1:3000/` (or the configured port). |
| Address already in use | Stop the existing process or choose another PORT. Its LocalStorage will be separate. |
| INVALID_SCHEMA | Correct JSON structure/types and supply every required policy/array field; reload an example if needed. |
| DUPLICATE_ID / INVALID_REFERENCE | Remove duplicate identities or correct IDs to known entities. |
| INVALID_INTERVAL / INVALID_LINK | Correct interval endpoints or matching agent/rule/occurrence relationships. |
| Infeasible | Inspect rejected candidates and unmet coverage. Deliberately revise fictional input; constraints are never silently relaxed. |
| Budget exhausted | Increase `search.maxCandidateChecks` in synthetic input or reduce the search space, then recompute. Feasibility remains unknown until resolved. |
| Review/export disabled | Resolve unsaved/stale changes and finish computation. Acknowledgment additionally requires a feasible result and the evidence checkbox. |
| Local storage unavailable | Keep the page open, finish a current result and export it; browser reload persistence cannot be relied on. |

## Known limitations and integrations

This synthetic grammar and fatigue policy are unapproved. The app cannot certify real SFTRM compliance, training quality, fatigue safety or operational readiness. No real ship/calendar/crew/history feeds, CAC, government-system connection, external departmental messages or publishing are implemented. Agents are deterministic software proposal policies, not live conversations or models. Qualification expiry, general wider candidate windows, multi-capacity resources, real watch rotations, broader recurrence grammars and globally optimal staffing are unsupported. Larger search spaces require separate benchmark and solver evaluation.

The dependency-free node-service foundation is version 1.0.0, pinned in foundation-lock.json. Owner approval of a specific reviewed revision remains required before delivery/deployment. See [field-validation prerequisites](path-to-fleet.md).

## Developer tests and evidence

Using the browser does not require running tests. Developers need Node.js 22.19+ to run these test files from the source folder; no test packages need installation:

```sh
node --test *.test.mjs
```

`domain.test.mjs` exercises the actual shared computation and prepared scenarios, complete protocol responses and boundary cases. `transport.test.mjs` starts an ephemeral loopback service to test the real HTTP/worker path and malformed JSON handling. A separately running server is unnecessary for tests.

The verifier ran 40 application tests successfully, including adversarial, worker-consistency and calendar boundary checks. All 40 also passed in a temporary runtime copied from the declared deployment allowlist plus application tests. The host-owned core report records all six evaluation groups passed at score 1.0 on synthetic cases. Exploratory desktop/narrow visual checks and recovery interactions are development observations; independent final browser acceptance and human operational review remain separate. See [verification notes](verification.md) and [path to fleet](path-to-fleet.md).

## Repair verification boundary

The repair adds department-owned proposal iterators and a shared feedback coordinator. Their executable policy follows the frozen protocol: listed candidate windows, preferred qualified crew, then qualified IDs. The prose proposalRule is descriptive data, never evaluated as code; free-form policy programming is unsupported. Rejection feedback advances a department to its next proposal; backtracking reopens earlier decisions without relaxing constraints. Final assignments determine agreement; accepted intermediate candidates may be backtracked.

All 40 application tests passed locally and in a clean copy of the declared runtime after repair, including six new repair tests. Host capability evaluations and frozen browser journeys need a fresh host run for the changed revision. Actual operator trial, owner acceptance and SFTRM validation remain unverified. No delivery/deployment was performed. See verification.md for evidence and unresolved review gaps.


## Calendar regression

`calendar.test.mjs` covers Wednesday starts, horizon alignment and year boundaries. `calendar.browser.cjs` exercises the real UI and shared service at 1280px and 390px: Wednesday-start headings, dated allocations, exact heatmap values, collision blocking and recomputation recovery. Run it with an existing Playwright installation and browser (no runtime dependency added):

```sh
NODE_PATH=/path/to/node_modules BROWSER_EXECUTABLE=/path/to/chromium node --test calendar.browser.cjs
```

Both browser cases passed in this verifier session. These development tests supplement the frozen host journeys; they do not establish SFTRM compliance or operator acceptance.
