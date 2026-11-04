# Primary deferrals

All source wording is preserved in the full inventory in test-matrix.md. Deferred obligations remain unverified even if every synthetic check passes.

- **UC11-1**, Original wording: “The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.” **real-data:** Applicable SFTRM periodicities, approved fatigue policy, actual roster and training history cannot be supplied under the synthetic-only boundary. Withhold actual SFTRM assurance. Demonstrate every named behavior using deterministic simulated departmental agents and explicit synthetic rules, including recurrence.
- **SCH-04**, Original wording: “Preserve mandatory training periodicities.” **real-data:** Applicable owner-supplied recurrence rules and prior completion history are unavailable under this boundary. Withhold validation of actual mandated training. Demonstrate synthetic recurrence expansion, carry-in history, deadlines, missing-occurrence detection and carry-out obligations.
- **SCH-05**, Original wording: “Have an operator accept the proposed schedule.” **human-authority:** Only an authorized PB4T operator can actually accept the specific calendar. Withhold actual approval and release. Demonstrate editable review, numeric heatmaps, pending policy requests and local demonstration-only acceptance.

The interactive synthetic deliverable is implemented. These deferred obligations remain unverified; passing prototype checks cannot establish that all source requirements are met.

# PB4T synthetic weekly planning, user guide

## What it does and who it is for

PB4T coordinators and departmental representatives can explore how Engineering, Weapons, Combat Systems, Damage Control and Air proposals compete for personnel and resources. The app offers a seven-day board, deterministic departmental negotiation, constraint checks, personnel loading, editable allocations and a local demonstration review.

All people, rules and sample data are invented: **synthetic, not validated against the real format**. The app does not validate actual SFTRM compliance or record actual PB4T operator approval. Use synthetic inputs only.

## Prerequisites and quick start

1. Open `index.html` directly in a modern browser with JavaScript enabled. No install, server, internet connection, package manager or Node is required to use the app.
2. Scroll to **Sample scenarios · synthetic inputs only**.
3. Set **Scenario** to **Weekly departmental proposals**, then click **Load scenario**.
4. Click **Optimize schedule** at the top of the page.

Allow browser local storage to retain work and downloads to export it. Storage behavior for local files depends on the browser and its settings. On a fresh first open, the board has seven empty day sections and no accepted schedule. If local work exists, the app attempts to restore it.

All displayed times are **UTC**, for **2 to 8 November 2026**; they are not converted to your device's timezone. Use Tab to reach controls and Enter or Space for native button activation.

## Walkthrough: reproduce the weekly sample

1. Select **Weekly departmental proposals** and click **Load scenario**. Loading replaces the current saved scenario, so export work first if you want a copy. The preferred Engineering, Weapons and Combat Systems proposals all use Alex and Trainer at Monday 08:00, creating **3 conflicting proposal pairs**.
2. Click **Optimize schedule**. Expect **“Feasible, 6 of 6 required occurrences scheduled.”** The negotiated board is:

   | Occurrence | Drill | UTC time | Person | Resource |
   | --- | --- | --- | --- | --- |
   | ENG-1 | Engineering casualty control | Mon 08:00 to 09:00 | Alex | Trainer |
   | WPN-1 | Weapons exercise | Mon 10:00 to 11:00 | Blair | Range |
   | CS-1 | Combat Systems exercise | Mon 10:00 to 11:00 | Casey | Trainer |
   | DC-1 | Damage Control drill | Wed 08:00 to 09:00 | Blair | Trainer |
   | ENG-2 | Engineering casualty control | Thu 08:00 to 09:00 | Alex | Trainer |
   | AIR-1 | Flight quarters | Fri 08:00 to 09:00 | Casey | Flight deck |

3. Check the audit below **Weekly training board**: **0 personnel overlaps; 0 resource overlaps; 0 hard-constraint violations.** Weapons and Combat Systems run concurrently using different people and resources.
4. Under **Personnel loading**, expect Alex **120 planned + 60 prior = 180 / 180 min**; Blair and Casey each **120 planned + 0 prior = 120 / 120 min**. Shaded day cells contain planned work; every cell also shows a numeric value. Open **Roster, windows & synthetic policies** to inspect qualifications and inputs.
5. Under **Departmental negotiation**, read the retained and moved allocations. Open **Proposal decisions and competing constraints** for the actual candidate decisions and rejection reasons.
6. Under **Required training & deadlines**, expect six covered obligations and zero missed deadlines. Engineering's prior completion is Sun 1 Nov 09:00, its deadlines are Wed 4 Nov 09:00 and Sat 7 Nov 09:00, and its next external deadline is Tue 10 Nov 09:00.

The action called **Optimize schedule** returns the first feasible combination of supplied candidates within a bounded search. It does not establish global optimality.

## Change duration or search effort

1. In **Inputs & alternatives**, change **Engineering duration (minutes)** to `45`. The app marks the input draft **“Unsaved changes; save or discard before review.”** The saved board is separate from this draft.
2. Click **Save inputs**. This commits both input fields, revokes demonstration acceptance and clears the prior feasibility result. Both Engineering occurrences receive the new duration. The old board may remain visible; it is not a newly optimized result.
3. Click **Optimize schedule**. With the weekly sample and duration `45`, Alex's loading becomes **90 planned + 60 prior = 150 / 180 min**.
4. To abandon unsaved input edits instead, click **Discard input changes**. This restores committed field values; an acceptance that existed before typing is retained if you discard rather than save.
5. To explore search exhaustion, set **Search budget (nodes)** to `1`, click **Save inputs**, then **Optimize schedule**. Expect **“Search budget exhausted, feasibility unknown.”** Change it to `5000`, save and optimize to recover the weekly result.

The Engineering duration field does not change the special **Boundary drill** diagnostic occurrences.

## Edit and validate a board allocation

1. First optimize the weekly sample so a saved board exists.
2. Click a card's **Edit allocation**, or select **WPN-1 · Weapons exercise** under **Occurrence**.
3. Set **Allocation** to **Preferred proposal**. The comparison shows the current Blair / Mon 10:00 / Range allocation and selected Alex / Mon 08:00 / Trainer allocation.
4. Click **Save allocation**, then **Validate board**. Expect **“Invalid board: ENG-1 and WPN-1 overlap on Alex and Trainer.”** The saved edit revokes acceptance. Validation checks the board without moving other drills.
5. Select **Alternate proposal**, click **Save allocation**, then **Validate board**. Expect **“Valid board: 6 of 6 occurrences; 0 hard-constraint violations.”** Weapons returns to Blair at Monday 10:00 on Range.

Only the included candidate allocations can be selected. A drill without a second candidate reports **“No alternate supplied for this occurrence.”** There is no drag-and-drop, free-time editor or undo button. Selecting another allocation does not change the board until **Save allocation**. Re-running optimization searches the saved allowed candidates again and can replace manual selections.

## Record demonstration review and policy requests

1. Review the saved board, audit, personnel loading and deadlines. Save or discard any input draft and obtain a feasible result through optimization or board validation.
2. In **Review saved schedule**, check **I reviewed the saved board, personnel loading, deadlines and active policies.**
3. Click **Accept demonstration**. Expect **“Accepted for demonstration only; no actual PB4T operator approval.”** The local record references the saved revision.
4. To demonstrate a policy request, enter `Reduce rest to 0 minutes` in **Request a policy change (does not change active rules)** and click **Record policy request**. The active minimum rest stays at 60 minutes. Acceptance is revoked and blocked while the request is pending.
5. Click **Withdraw request**, review the board again, check the review box and click **Accept demonstration** to record a new demonstration review.

Saving inputs or allocations, optimizing, and recording or withdrawing a policy request revoke acceptance. Typing an unsaved input draft blocks acceptance until save or discard. Policy requests cannot approve or apply a constraint relaxation.

## Save, export, reload and start over

1. Use **Save inputs** to commit input edits and **Save allocation** to commit a selected board alternative. Loading, optimization, validation, recorded requests and review actions also write local state automatically.
2. Before exporting, save or discard input drafts. Click **Export saved review JSON** to download **`synthetic-pb4t-week.json`**. It contains the saved revision, synthetic disclosure, input data, assignments, candidate decisions, recurrence coverage, personnel loading and local review state. Export is allowed before acceptance and may contain an incomplete or invalid schedule; inspect its status.
3. Reload the same file in the same browser context to restore saved state. A separate unsaved duration/search draft is also stored as you type. On restoration the app checks the data and board. Malformed inputs are not restored into the page; a visible storage warning asks you to load a synthetic scenario. Invalid boards cannot retain acceptance. Browser storage or file-location changes may prevent restoration.
4. To start the sample again, select **Weekly departmental proposals** and click **Load scenario**. There is no dedicated Reset button. This replaces the current saved inputs, board and review record.
5. If an input draft is unsaved when loading, choose **Discard and load**, or **Save current draft and load**. The latter validates and saves the draft before immediately replacing it with the selected sample; it does **not** create a separate archive. Export first to retain a snapshot.

The app keeps one local working scenario, not a project library. Exports are review artifacts: there is no import or restore-from-export feature, server backup, synchronization or account. Text merely typed in the policy-request box is not stored until **Record policy request**. Browser data clearing can remove all local work.

## Supported input and validation

Users select included samples, enter two numeric input values, choose supplied allocations and enter a text policy request. There is no CSV, spreadsheet, naval-message or JSON-file import and no arbitrary roster, resource or policy editor.

| Input or check | Implemented rule |
| --- | --- |
| Engineering duration (minutes) | Positive whole number; `0`, blanks and fractional values are rejected. |
| Search budget (nodes) | Whole number from `1` to `200000`; weekly default `5000`. |
| Policy request | Nonempty text after trimming; recording changes no active rule. |
| Inventory | Recurrence policy and mandatory occurrences must be present; duplicate or unknown identities are rejected by core validation. |
| Allocation | Must be a supplied candidate with a qualified person, registered resource and matching duration. |
| Timing | Entire drill must fit personnel, resource, ship and drill windows, horizon, release and due deadline. Ending exactly at a deadline is allowed. |
| Shared constraints | No person or exclusive resource overlap; pairwise minimum rest and total supplied duty budget, including prior duty, are checked. |

The included/exported format is invented version-1 JSON. Times are integer minutes from `2026-11-02T00:00:00Z`; intervals include their start and exclude their end. Prior duty may precede the week. Engineering recurrence is anchored at three-day intervals; completing early does not move the next due date. This format is synthetic, not validated against the real format.

## Troubleshooting and diagnostic samples

For any diagnostic sample, select it under **Scenario**, click **Load scenario**, then **Optimize schedule**. To recover the complete demonstration, load **Weekly departmental proposals** again.

| Symptom or scenario | Meaning and next step |
| --- | --- |
| “Load a synthetic scenario first.” | Load a sample before optimization. |
| Duration validation error | Enter a positive whole number such as `60` and click **Save inputs**. Invalid text remains available for correction. |
| Unsaved changes block optimization, export or review | Click **Save inputs** or **Discard input changes**. Re-optimize after saving. |
| **Impossible shared allocation** | Exhaustive search finds no allocation for two drills requiring Alex and Trainer at the same time. A higher budget cannot create missing alternatives. |
| **Missing qualification** | WPN-1 candidates lack Fire Party Leader qualification. Reload the weekly sample. |
| **Unavailable personnel** | Engineering remains available; WPN-1 offers only Blair at Mon 10:00, outside Blair’s availability. Optimize shows “WPN-1: no candidate fits personnel availability.” Reload the weekly sample to recover. |
| **Rest one minute short** | The boundary case provides 59 minutes rest against a 60-minute minimum. |
| **Duty one minute over** | Total supplied Alex duty is 181 minutes against a 180-minute budget. |
| **Exact fatigue boundary** | Two drills are feasible with exactly 60 minutes rest and 180 minutes total duty including prior work. |
| **Missing recurrence policy** or **Missing mandatory occurrence** | Invalid input, not a feasible subset. The latter deliberately omits ENG-2. Reload the weekly sample. |
| Search budget exhausted | Feasibility is unknown. Increase **Search budget (nodes)** within its allowed range, save and retry. |
| Invalid edited board | Read **Validate board** feedback, select a permitted alternative and save and validate again. |
| Acceptance blocked | Resolve drafts and pending requests, validate or optimize a complete board, and check the review confirmation. |
| Local storage unavailable | Work continues in memory. Save or discard drafts and export before closing. Data may not survive reload. |
| Export does not appear | Check browser download permissions and download location; the expected filename is `synthetic-pb4t-week.json`. |

Read the dedicated board-validation message after edits; the general solve banner may describe a manually edited invalid board as infeasible. That banner alone does not mean an exhaustive search was performed. Malformed stored inputs show a storage warning and a fresh workspace; load a synthetic sample to continue. Loading replaces the previous local record.

## Known limitations and unavailable integrations

The agents are deterministic simulations, not LLM agents or deployed departmental services. The fixed UTC sample covers one week, one person per drill and exclusive resources of capacity one. There is no automatic personnel selection outside the provided candidates, qualification-expiry modeling, rolling fatigue policy, operational history feed, calendar integration, authoritative SFTRM source, identity, device-security guarantee or operational approval/release integration.

Budgets cover all supplied current and prior duty, rather than a daily rule. Search is bounded first-feasible search; bigger workloads, richer objectives and production solvers require separate evaluation and benchmarks. No package dependencies or network services are required. No production deployment or government-device authorization is established.

## Developer tests, Node required only here

Run from the delivered folder using **Node.js 18 or later**:

```sh
node --test core.test.cjs
```

No dependency installation is needed. `core.test.cjs` calls the actual functions exported by `core.cjs` and executes the marked inline application core from `index.html` through Node's VM. It checks the literal weekly answer key, independent interval and duty calculations, deadlines, failed and exhausted searches, boundary conditions, edits, review transitions and behavior consistency between both cores. These tests do not launch a browser or test the complete DOM workflow. Keep both delivered cores consistent when developing.

The latest verification run on 2026-11-04 passed **15 tests, 0 failed, 0 skipped** after repairing the unavailable-personnel sample to isolate the Weapons failure. Additional tests cover malformed temporal data, prior-duty rest, exclusive resources, operational windows, horizon crossing and cross-midnight intervals. A minimal Node DOM shim exercises the actual page startup, optimization and export handlers; it is not a browser. The supplied host browser report passed 14/16 executions; constraint-recovery failed at both widths because the old sample blocked Engineering before Weapons. The repaired source awaits a host rerun of all journeys. The added Node handler test checks the frozen recovery outcomes but does not establish browser success. Visual inspection, human review and operational validation remain unverified.

See [verification.md](verification.md) for verification notes and [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites and unresolved owners/integrations.
