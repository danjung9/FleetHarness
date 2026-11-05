# Primary deferrals

## UC11-1

Original wording: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Applicable actual SFTRM rules, policy revisions and actual completion history are absent within the synthetic-only boundary. Withhold actual SFTRM compliance; demonstrate all named agents, constraints, collisions, alternate allocations and complete fictional recurrence. Withheld action: operational validation/certification. Demonstrated stand-in: complete fictional-pb4t-1 package transformed into negotiated weekly allocations, collision explanations, all due deadlines and personnel loading. Literal outputs are frozen in synthetic-week and shifted-negotiation; actual source wording is unchanged.

## DESC11-1

Original wording: Weekly PB4T meetings struggle to coordinate competing departmental training requirements (Damage Control drills, Combat Systems exercises, engineering casualty controls, flight quarters) against real crew availability and ship operations.

real-data: Actual crew availability and ship operations are unavailable and outside the synthetic-only boundary. Withhold validation against real crew and operations; demonstrate all four named drill families against fictional roster and operations. Withheld action: operational validation/certification. Demonstrated stand-in: complete fictional-pb4t-1 package transformed into negotiated weekly allocations, collision explanations, all due deadlines and personnel loading. Literal outputs are frozen in synthetic-week and shifted-negotiation; actual source wording is unchanged.

## SCOPE11-6

Original wording: The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

real-data: Applicable actual SFTRM register and completion history are absent. Withhold actual mandated-periodicity certification; demonstrate collisions, alternate allocations and all seven fictional due occurrences. Withheld action: operational validation/certification. Demonstrated stand-in: complete fictional-pb4t-1 package transformed into negotiated weekly allocations, collision explanations, all due deadlines and personnel loading. Literal outputs are frozen in synthetic-week and shifted-negotiation; actual source wording is unchanged.

# PB4T synthetic weekly planner

For PB4T coordinators and departmental representatives exploring a fictional training week. Engineering, Combat Systems, Weapons, Damage Control and Flight Operations propose ordered alternatives; a shared bounded solver enforces declared constraints and returns the first complete feasible allocation.

**Synthetic, not validated against the real format. No operational use or actual SFTRM compliance.** Sponsor, sustainment owner, real policy and operator acceptance remain unresolved. Owner approval is required before delivery or deployment. This guide describes the local prototype, not an authorized fleet system.

## Start locally

Prerequisite: Node.js 22.19 or later, a modern browser and a local terminal. No npm dependencies, installation step, models, API keys or network services are required.

```sh
node server.mjs
```

Open the printed `http://127.0.0.1:3000/` address. If that port is occupied, use `PORT=3100 node server.mjs`. The host assigns its own loopback port for review. Stop the server with Ctrl+C. The browser needs the running local service; opening HTML through file:// is unsupported. After Node is installed the application works without an internet connection. All assets and sample inputs are local.

## Reproduce the synthetic week

1. Select **Baseline week** under **Synthetic package**, then **Load sample**. If replacing an existing package, deliberately click **Confirm replacement**. This clears that package's previous proposal and review.
2. Inspect departmental proposal cards, required EOOW / TAO / FPL roles, **Candidates & resources**, and the displayed fictional policy. Times use fixed UTC−05:00, including across midnight.
3. Click **Optimize schedule**. A short cancellable phase precedes the calculation. The first feasible baseline assigns D1 Mon08 P1/P2, D2 Mon10 P1, D3 Mon08 P3, D4 Mon10 P2, D5 Mon10 P4/P5, D6 Thu08 P2 and D7 Sun08 P2.
4. Inspect the seven-day board, original three collisions, computed departmental counterproposals, seven of seven due occurrences and numeric loading. Baseline totals are 540 training person-minutes; P2 has 240 minutes.
5. Select **Shifted operations**, load and confirm replacement, then optimize again. Combat Systems D2 changes to P3 Mon08; Weapons D3 moves to Mon10. P1 has 60 minutes and P3 has 120. These are fictional fixture results, not operational recommendations.

## Edit, recover and review

Change **Duration (minutes)** or **Preferred start** on a card. The input buffer is visibly unsaved and simulated review clears immediately. **Save input** validates and commits a new revision. **Discard changes** restores the saved package. Saving does not generate a new calendar; click **Optimize schedule** after saving. Review is disabled until the saved revision has a current feasible result and the inspection checkbox is checked.

For a reproducible recovery, set D1 duration to 0 and click Save input: `D1 duration must be a positive integer.` The prior board stays intact. Restore 60, save and optimize. Set **Search budget** to 0, save and optimize to see exhaustion with zero attempts; infeasibility has not been established. Restore 10000 and regenerate. **Tiny impossible case** instead proves infeasibility over its supplied candidates.

D7's **Replace all candidates with one start** field plus **Apply single start** replaces candidateStarts, preferredStart and the execution window. Set it to `2026-11-15T12:00:00-05:00`, apply, save and optimize to expose the missed deadline; restore `2026-11-15T08:00:00-05:00` to recover. No hard constraints are relaxed.

**Cancel** aborts/discards pending generation and preserves the previous valid draft. Previous boards are labeled stale after saved inputs change or a generation fails. Their old coverage does not establish current feasibility. Inspect the current status and unmet list before review.

Check **I have inspected the exact saved synthetic proposal**, then **Record simulated review**. This records a browser-local simulation tied to that revision; it is not actual operator acceptance or authority to publish. **Export synthetic draft** downloads `synthetic-pb4t-draft.json`, including provenance, fictional policy version, saved package, prior feasible result, saved/result/review revision numbers and stale flag.

## Input, storage and interface

The invented `fictional-pb4t-1` JSON package includes metadata, departments, qualification catalog, dated qualified roster, resource availability/capacities, operational restrictions, policy, recurrence requirements/history, fixed duties, explicit drill candidates/roles/demands, ordering and search budget. **Full fictional package / import** allows editing all fields. **Apply JSON to input buffer** stages an import; Save input validates it before replacing saved input. Malformed imports preserve the saved package and previous valid board. Synthetic fixtures are embedded in HTML without answer keys; no local data-file fetch occurs.

All policy values are explicit; missing values do not receive defaults. Candidates must align to the declared resolution. The entire execution must fit availability, qualification validity, horizon and one allowed window. Intervals are half open. Qualification expiry and deadline completion equality pass. Separate duties observe minimum rest, even across the horizon boundary. Duty minutes split at fixed-offset midnight and clip to the horizon for horizon totals. All due fictional occurrences, including overdue occurrences, are reported. Proposed schedules never update completion history.

The shared JSON service accepts `POST /api/invoke` with `{"action":"report","package":{...}}` or action `allocate`; `GET /health` returns status ok. Domain results are HTTP 200 with feasible, infeasible, exhausted or invalid_input status. Validation returns `INVALID_PACKAGE`; malformed transport JSON returns HTTP 400 with `INVALID_JSON`. Search has no database or side effects. `compute.mjs` is the same implementation used by HTTP and tests.

Saved and unsaved input, last feasible board and simulated review persist in localStorage for this browser origin. A changed port is a different storage origin. Browser storage is local and has no authentication, encryption guarantee, synchronization or backup. Export before clearing browser data. Storage failures show a warning; keep the tab open and export. Loading and confirming another sample is the reset/replacement operation. Exported envelopes are review artifacts; to re-import input, copy their `package` into the full package editor.

## Troubleshooting and limits

If the service is unavailable, restart `node server.mjs` at the same port and retry Optimize schedule. No canned fallback is returned. If the search exhausts, inspect candidate counts and budget; increasing the budget allows further enumeration but does not establish infeasibility until enumeration finishes. Observed rejected candidates are explanations, not a minimal conflict proof. Large Cartesian candidate domains may be slow despite a bounded attempt budget; there is no global optimization or large-fleet performance claim.

No real SFTRM register, fatigue approval, actual crew ingestion, calendar publication, messaging, ship connection, identity or government-device authorization is implemented. The full package editor may display technical validation as a general package error; duration has a specific inline message. The optional Impeccable engine was not run; local guidance and actual browser observations were used.

## Developer checks and evidence

Using the UI needs a browser and running service; running tests separately needs Node 22.19+:

```sh
node --test scheduling.test.mjs
```

The 30 local tests exercise the real shared core and HTTP transport: complete baseline/shifted report objects, supplied computational scenarios, invalid JSON/packages, fatigue/expiry boundaries, recurrence, resource aggregation, role distinctness, bounded search and cancellation. The interaction scenario also has browser observations; its Node test establishes only computation, not localStorage/review behavior.

See [verification.md](verification.md) for observed development evidence and pending host gates, and [path-to-fleet.md](path-to-fleet.md) for owner responsibilities and field-validation prerequisites. Host clean-runtime evaluation, frozen browser journeys and human review remain distinct from these local checks.
