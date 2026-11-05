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

# PB4T weekly planner

## What it does

This local application helps PB4T coordinators and departmental training planners explore a **synthetic weekly training schedule**. It shows competing departmental proposals, finds a complete allocation under explicit constraints, and displays collisions, departmental counterproposals, due obligations and personnel loading. You can edit allocations, record local demonstration review and download the saved result.

All supplied people, qualifications, watches, operating windows and policies are fictional. The invented format is **not validated against real records, real format, or SFTRM**. The departmental agents are deterministic proposal logic coordinated by bounded search; no language model is used. Actual operator acceptance (SCH-05) remains outstanding in addition to the primary deferrals above.

## Prerequisites and startup

To use the app, you need the complete application folder, **Node.js 22.19 or newer** on the machine hosting the local service, and a modern browser. Node is also required separately for developer tests. There are no third-party dependencies to install: **do not run an installation step**. No model settings, API keys, credentials or environment secrets are required.

From the application folder, run this command in macOS/Linux:

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

On Windows PowerShell:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
node server.mjs
```

Open **http://127.0.0.1:3000/** and leave the terminal process running. Stop it with **Ctrl+C**. `npm start` is also supported and runs `node server.mjs`; without environment overrides the default address is the same.

The service serves `public/index.html` and performs calculations through `POST /api/invoke`, using the same `compute.mjs` core as host evaluation. Opening the HTML with `file://` is unsupported. Once Node and the files are provisioned, local operation needs no internet connection. The source attribution is not an integration.

## Walkthrough: coordinate the prepared week

1. In **Coordinate the week**, select **weekly-conflicts** under **Sample** and click **Load sample**. A fresh browser loads it automatically; previously saved work may be restored instead. The JSON editor and Apply input stay disabled while startup loads or restores the board, then become available; wait for the loading status to finish before entering a new record. Loading this sample deliberately resets the current example. If input or allocation edits are unfinished, loading any sample (including the same sample) requires **Discard and load sample**; **Keep draft** preserves the unfinished work.
2. Confirm the week begins **2026-11-09**, in UTC. The proposals show **2 initial collisions → 2 remaining; 2 hard violations.** DC-1 and ENG-1 share P1 and ROOM at minutes 540 to 660. These are two collision entries for one overlapping drill pair.
3. Click **Optimize schedule**. Wait for **Feasible draft; pending local review.** The summary becomes **2 initial collisions → 0 remaining; 0 hard violations.**
4. Read the weekly lanes and **Department negotiation**. Engineering counterproposes ENG-1 at 1980 to 2100; Weapons and Combat Systems retain their proposals. All six drills remain scheduled as shown below.
5. Read **Training obligations**: 6 due, 6 scheduled within deadline, 0 missed and 0 historically overdue. The SFTRM compliance caveat remains visible.
6. Read **Personnel loading**. Each daily cell shows training / duty minutes, Monday through Sunday. P1 has 360 training minutes; P5 has 120 training and 180 weekly duty minutes, including a 60-minute watch. Totals are **1320 personnel training minutes** and **1380 weekly duty minutes**. These are personnel sums, not the 720 elapsed drill minutes.

| Drill | Start to end minutes | UTC day/time | Crew | Resource |
| --- | --- | --- | --- | --- |
| DC-1 | 540 to 660 | Monday 09:00 to 11:00 | P1/P2 | ROOM |
| ENG-1 | 1980 to 2100 | Tuesday 09:00 to 11:00 | P1/P3 | ROOM |
| WPN-1 | 780 to 900 | Monday 13:00 to 15:00 | P4 | RANGE |
| CS-1 | 2220 to 2340 | Tuesday 13:00 to 15:00 | P5/P6 | ROOM |
| AIR-1 | 3420 to 3540 | Wednesday 09:00 to 11:00 | P2/P7 | DECK |
| DC-2 | 6300 to 6420 | Friday 09:00 to 11:00 | P1/P2 | ROOM |

The exact prepared input records come from [data/synthetic-data.json](data/synthetic-data.json) and are embedded in the page; there is no local-file data fetch. The file is a container: only an individual object from `records` is a scheduling input. Its scenario `expected` objects are reference answers, never input to the solver. See the [fixture guide](data/README.md) for invented rules and provenance.

## Edit and revalidate an allocation

1. After optimizing the base example, click **Edit ENG-1**. **Edit allocation** shows the saved interval and crew.
2. Change **Start minute** to `540`. **Personnel IDs, separated by /** can also be edited, for example `P1/P3`. Leave the crew unchanged for this demonstration.
3. Click **Save edit**. Expect **Edit rejected: P1 and ROOM overlap DC-1. Last valid board retained.** The prior 1980 to 2100 allocation stays on the board; the candidate remains visible for correction. Review is cleared and this attempted save increments the revision.
4. Correct the candidate and click **Save edit**, or click **Discard edit** to close it and retain the saved allocation. Save/discard the current edit before selecting another drill.

Manual edits validate the complete allocation without silently rescheduling other drills. Unsaved or rejected edits block local review and export. A successful edit shows a feasible pending-review draft; its negotiation section is empty because validation does not run negotiation again.

## Enter your own synthetic proposals and policy

1. Go to **Proposals and fictional policy**. Edit or paste one complete input record into **Synthetic PB4T record**. Start from the loaded record to preserve required fields. Use synthetic data only.
2. Click **Apply input**. This inspects the preferred proposals; it does not search for alternatives. Invalid text stays in the editor and the prior board is retained. Applied conflicting proposals may also retain the previous board while diagnostics describe the new input.
3. Click **Optimize schedule** to search the applied candidates. A complete feasible result replaces the board. Invalid, infeasible and exhausted results do not replace the last board.
4. Use **Discard input changes** to restore the input associated with the retained board. Review/export stay blocked whenever the applied input differs from that board, even if the old board is feasible. Optimize the applied input or discard it before continuing.

Selecting a different sample while work is unfinished offers **Discard and load sample** or **Keep draft**. Reloading the same sample is an intentional reset of that sample, so use it only after saving anything you want to keep.

### Supported format and validation

The editor accepts invented-format **JSON schemaVersion 1**, not CSV, spreadsheets, official Navy messages, natural-language requests, the whole fixture container or exported result snapshots. All defined fields are required; unknown fields and null/default substitutions are rejected. The [fixture guide](data/README.md) describes nested fields; [solution-contract.json](solution-contract.json) defines the exact public invocation protocol.

A record contains the week, departments, personnel qualifications and availability, capacity-one resources, operational windows, fixed duties, explicit fictional policy, mandatory drills, recurrence requirements, search configuration and descriptive review metadata. IDs and references are case-sensitive. IDs must use ASCII letters, digits, `_` or `-`, with a maximum of 80 characters. Duplicate IDs/set entries and unresolved references are rejected.

Time values are integer minutes relative to a UTC Monday midnight epoch. The week is 10080 minutes; displayed day/time never converts to the browser's local timezone. Intervals are half-open: an end can equal a window or qualification boundary. Qualifications must cover the whole drill, with a different qualified eligible person for every required role slot. Resources are exclusive. Ship, personnel and resource availability must each contain the entire drill.

Training and watches both count toward explicit daily and weekly duty limits. Daily totals split at UTC midnight; weekly totals clip to the week. Rest applies between every pair of distinct duties, including supplied history. Inconsistent fixed history is rejected before searching.

Every due occurrence needs a matching mandatory drill ID and deadline. Explicit occurrence lists are authoritative: `referenceIntervalMinutes` does **not** generate extra occurrences or encode SFTRM rules. Historical overdue and future obligations are reported separately; historical warnings can remain even when this week's allocation is feasible.

Limits include **100000 UTF-8 bytes per request, 24 drills, 200 personnel, 40 departments/resources/requirements, 100 candidate starts per drill, 200 occurrences, 200 fixed duties and 200000 search nodes**. The service has a 10-second computation deadline. Search can stop at its node budget before proving infeasibility.

For programmatic use, send JSON `{action, record}` to `/api/invoke`, with action `inspect` or `negotiate`. Action `validate` additionally requires the complete `allocations` array. Responses use `{status,error,result}`; domain outcomes include `feasible`, `conflicts`, `infeasible`, `search-exhausted` and `invalid-input`. Inspect/validate never search. See the protocol for complete response fields and ordering.

## Save, review, export and reload

1. Apply/optimize or discard unfinished input, and save/discard any allocation edit. The draft must be feasible and correspond to the applied input.
2. Under **Local review and export**, check **I reviewed this synthetic revision for local demonstration.** and click **Save local review**. The revision becomes locally reviewed; `realApproval` always remains false. Changes clear local review and require a fresh check.
3. Click **Export draft** to download **pb4t-draft.json**. Export is available for a saved feasible draft even before local review. It contains provenance, fixture ID, revision, review state, policy and the complete computed result. It does not transmit externally and is not an operational approval.
4. Reload in the **same browser and origin** to restore local work. Raw input, committed record/result, revision/review and unfinished allocation fields are kept in browser localStorage (`pb4t-v1`). The committed allocation is revalidated during restoration.

Storage is unencrypted and synthetic-only. There is no server database, account, shared editing or synchronization. Changing the port, browser profile or device uses different local storage; private browsing and site-data clearing can remove it. A storage error is shown under local review; keep the page open and export a valid draft.

**Export is a result snapshot, not a full backup or round-trip input file.** It does not include the complete original roster/input record, and there is no snapshot import control. To retain reusable input independently, copy the **Synthetic PB4T record** text into your own JSON file. Clear this origin's site storage in browser settings to remove stored work completely; Reset sample replaces the working example rather than deleting storage.

## Cancel, reset and recover

1. To prepare without immediately running, click **Prepare negotiation**. This stages the action only; **Optimize schedule** starts computation.
2. Click **Cancel search** to cancel a prepared or active operation. The app reports **Cancelled; last valid board retained.** Active requests use cancellation and stale responses cannot replace the board.
3. Click **Reset sample** to open confirmation. **Cancel reset** preserves work; **Confirm reset** restores the original weekly-conflicts proposals, pending revision 1. Optimize again to remove the original collisions.
4. Press **Escape** to dismiss the reset or sample-replacement confirmation without discarding work. Escape does not discard allocation edits; use **Discard edit**.

Use Tab to move between native controls and Enter/Space where appropriate to activate them. Focus outlines show the active control. On a narrow display, days stack vertically; the personnel table can scroll horizontally in its labeled region.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Page or computation unavailable | Keep `node server.mjs` running and open its exact `http://127.0.0.1:PORT/` address. `file://`, `localhost` aliases and cross-origin computation are unsupported. |
| Port 3000 is occupied | Use `HOST=127.0.0.1 PORT=3001 node server.mjs` and open http://127.0.0.1:3001/. Saved work on port 3000 will not appear on the new origin. |
| **Malformed JSON.** | Correct JSON syntax in the editor and apply again, or deliberately load/reset the sample. The entered text and last board are retained. |
| **Invalid input schema.**, unknown ID, missing policy or recurrence error | Start with a complete record; check required fields, types, exact policy strings, unique IDs, references and one drill per due occurrence. No fields are inferred. |
| **Fixed duties violate fatigue policy.** | Correct inconsistent synthetic watch/history or policy inputs explicitly. Search cannot repair immutable history. |
| **Infeasible: no complete allocation under supplied constraints.** | Inspect qualifications, availability, allowed starts, resources, deadlines and duty limits. `impossible-expired-eoow` demonstrates this outcome. Do not interpret a retained old board as a solution for the failed input. |
| **Search exhausted; infeasibility is not established.** | `feasible-zero-budget` deliberately permits zero search attempts. Increase `search.maxNodes` explicitly within its limit, apply and optimize, or load weekly-conflicts to recover. |
| Review/export is disabled | Resolve unsaved input or allocation edits, wait/cancel an active request, and make the applied input match a saved feasible board. Check the explanation beneath the review actions. |
| Request timed out or service is busy | Retry after active work stops or reduce the candidate domain. The previous board remains available; no partial schedule is approved. |
| Historical overdue warning | Escalate to the coordinator. Scheduling this week's drills does not erase an overdue historical occurrence or establish compliance. |

## Known limitations and integration boundaries

Search returns the first complete feasible allocation over the explicit finite candidates. Zero collisions attain the declared nonnegative collision lower bound; this does not establish a globally optimal roster, balanced staffing or minimal changes. Candidate enumeration can be expensive and has no production-scale benchmark.

The app models one completion timestamp per requirement and explicitly supplied occurrences/history. It does not model partial training credit, transit/setup time, resources with capacity above one, or automatic SFTRM recurrence expansion. Fatigue values are fictional assumptions requiring owner approval before any operational use.

No real roster, training-history, watch, ship-operations or calendar integration exists. There is no CAC login, operational identity, encrypted browser storage, audit service, multi-user persistence or government-device installation authorization. Local review is not actual PB4T operator acceptance. Delivery/deployment needs owner approval. Foundation node-service 1.0.0 and its scheduling pack are retained; no third-party dependencies were added. Redistribution licensing remains unresolved as recorded in research.md.

## Developer tests and verification

Using the app requires a running local Node service plus a browser. **Developer tests additionally run Node's test runner** from the source folder; they do not need you to start the service manually:

```sh
node --test domain.test.mjs service.test.mjs review-state.test.mjs draft-preservation.test.mjs startup-readiness.test.mjs
```

Or run all delivered test files:

```sh
node --test *.test.mjs
```

`domain.test.mjs` calls the actual core and covers complete results, invalid/impossible/exhausted inputs, qualifications, boundaries and independent allocation/loading checks. `service.test.mjs` starts an ephemeral HTTP service and tests its worker/protocol. `review-state.test.mjs` exercises actual client event handlers with a minimal DOM harness and the real core; it is not a native browser test.

Repair verification passed **14 tests**, including the startup regression with a delayed initial response and the two draft-preservation regressions. The same 14 passed in a fresh temporary copy of the declared runtime. `startup-readiness.test.mjs` exercises the delivered client handlers and real computation with a minimal DOM; native browser behavior is a separate gate. The latest independent report predates this repair: 13 Node tests and the required capability passed, while 17/20 browser journeys passed. Its three narrow-screen failures were traced to initial sample loading replacing newly entered input. After the startup gate repair, exploratory browser runs observed all expected outputs in those three flows. Fresh desktop and narrow visual reviews and rechecks found no visible defects. The host must rerun independent acceptance against the repaired runtime. Planning coverage for recurrence expansion and collaborative agents remains unconfirmed and needs a new planning run; explicit obligations and post-search counterproposals do not establish those complete behaviors. No operational validation or owner acceptance is implied.

Read [verification.md](verification.md) for evidence and remaining checks, and [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites, unresolved ownership/integrations and approval work.

## Synthetic cadence preparation and exchange diagnostics

The original explicit-obligation protocol is preserved: `referenceIntervalMinutes` alone remains descriptive. To derive obligations independently of the draft, open **Training obligations → Synthetic cadence rules**, choose **Prepare fictional cadence example**, edit the JSON and choose **Expand and save rules**, then **Apply input** and **Optimize schedule**. The example uses a fictional 5,040-minute cadence and the preserved sample's candidate starts. No SFTRM mapping is supplied or implied.

Each rule contains `requirementId`, positive integer `cadenceMinutes`, nonpositive `lastCompletionMinute`, and a complete independent drill `template` in the existing invented drill format. Deadlines equal last completion plus n times cadence through minute 10,080 inclusive. Release is the preceding cadence boundary. One mandatory drill is generated for every nonnegative deadline, with ID `<requirementId>-C<n>`. Older deadlines are retained as historical obligations. An obligation due at minute zero remains due and normally cannot fit positive-duration training in the current week. Allowed starts remain explicit owner inputs; candidates that cannot cover an obligation yield infeasible rather than silently deleting that obligation. Limits remain 24 weekly drills and 200 generated obligations per rule.

Saved cadence rules regenerate obligations before subsequent inspection and negotiation, even if the submitted draft removes both occurrence and drill. The saved editor shows that regeneration. Independent templates live with browser-local draft state and are included in cadence-enabled exports. Loading a sample deliberately clears active cadence rules. Ordinary supplied samples and frozen protocol/export outputs retain their original exact structure. Authoritative fatigue policy, SFTRM mapping and real completion-history review remain owner tasks.

Open **Department negotiation → Actual proposal exchanges → Run exchange trace** to inspect a separate diagnostic computation through the same backend. Deterministic department-owned proposal handlers receive rejection reasons or reservation responses; they issue counterproposals after rejection/retraction, and the coordinator retracts reservations when a later department cannot fit. The prepared sample produces 27 events, including DC rejection for shared personnel/room, ENG retraction and a counterproposal at minute 1,980. Failure runs terminate explicitly. This view does not commit a board. It displays at most the first 2,000 events and discloses truncation.

Personnel duty cells use one continuous blue scale relative to the supplied daily duty limit: HSL hue 207°, saturation 55%, lightness `100 − 65 × min(1, dutyMinutes / dailyLimit)` percent. Zero is white; the legend marks 0%, 25%, 50% and 100%. Values at or above the limit saturate, while numeric training / duty minutes remain visible. This scale shows duty magnitude, not operational fatigue risk. If a zero limit is supplied, any positive duty uses the saturated color and is independently rejected by constraint validation.

## Repair verification

Run `node --test *.test.mjs`. All 14 original tests are preserved; seven added tests cover live agent exchanges, changed preferences, backtracking, impossible/exhausted termination, recurrence generation and omissions, changed cadence/history/deadlines, ordered computed heat intensities, actual HTTP routes and the delivered client workflow. The local and clean-copy runs pass 21/21. These results do not replace final host capability/browser checks or human acceptance. See verification.md for criterion status and limitations. No owner delivery/deployment approval has been recorded.
