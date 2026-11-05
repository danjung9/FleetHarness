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

# Calendar repair verification, 5 November 2026

Generated: yes. Runnable: locally verified. Tested: **40 Node tests passed** in workspace and fresh declared-runtime copy; **2 real browser regression cases passed**, at 1280×800 and 390×844. Reviewer-accepted: no. Operationally validated: no. **requirementsMet: false**. Host capability/clean-package/frozen browser reruns for this revision remain pending. Owner approval is required before delivery/deployment; neither occurred.

## Current independent findings

- **DELIVERABLE11-1, repaired:** hardcoded Monday labels replaced by shared `calendarDays(input)` deriving UTC weekdays and ISO dates from weekStart and horizon. Both board columns and heatmap headers use those dates; horizon day offsets match backend daily load bins. Allocation descriptions retain their actual UTC weekdays. Non-Monday starts remain supported.
- **UC11-1 / SCOPE11-6 / SCH-04, unverified:** no owner-reviewed SFTRM rule specification or independently reviewed synthetic examples were supplied. Fixed-window recurrence is unchanged and visibly fictional. It cannot establish the mandate. A missing specification is not authority to defer defining behavior; this remains a planning defect needing a new planning run, not an expectation rewrite during repair.
- **SCH-05, unverified:** no authorized operator is present for a supervised trial. No acceptance record was fabricated. A future operator trial must review the tested revision's allocations, loading, unresolved obligations and edit recovery and record the actual verdict. Local acknowledgment remains separate.

## Current checks

`node --test *.test.mjs`: 40 pass, 0 fail/skip. Original tests unchanged. New `calendar.test.mjs` adds actual UI helper/computation coverage for Wednesday allocation/load alignment and negative/partial/year-crossing horizons. A fresh temporary directory containing exactly declared runtime.files plus all five Node test files passed the same 40 tests, including HTTP health, invocation and worker checks; the directory was removed.

`calendar.browser.cjs`: 2 pass, 0 fail/skip. Both widths load baseline, set 2026-11-11, optimize, assert all seven exact weekday/date headings on board and heatmap, assert Wednesday DC and Thursday Engineering allocation locations and numeric P1 cells, induce an overlapping Engineering edit, assert blocked review, and optimize to recover. Browser page-error arrays empty. The UI still calls POST /api/invoke → server worker → compute/domain, the same core as host invocation.

The first direct browser launch failed in both cases with Chrome SIGABRT/EPERM before page creation. That failed execution is retained here. Retrying unchanged application/test code through the phase-authorized helper succeeded. `.agent-tools/calendar-browser` uses an already provisioned Playwright and browser and preserves inherited process environment; its own two input-validation tests are tool checks, not application evidence. No dependency was added to the application. Optional Impeccable engine not run; references read directly.

Current source SHA-256: public/app.js `eb2854c91ecd01e8b4cc5bd08bb22f236ff298c6553e962635ee1a0e20c95e00`; calendar.test.mjs `a11e860051f059a7ee79903731dbaa30df0d7b39c1a147599bf4048f11ca80b8`; calendar.browser.cjs `8c620d0e207c36263adc2966a4c9bd003767a389de440016f96e12f6b2390d52`. No current host capability scores or aggregate runtime hash claimed; prior scores below describe the earlier revision only. Preserved fixtures, foundation manifests, architecture and frozen contracts unchanged.

## Current visual review evidence

Session development observations: `.browser-observations/c676ea68-810a-429b-87d6-6f303a620988/`. Both initial reviews preceded edits. Desktop initial `4162a0ee-e5c6-4379-95a4-63e83352630b`; narrow initial `57b1b135-f615-4221-8b12-9d022581908a`. Fresh final-runtime desktop recheck `390aeac8-fbe8-40e4-91f0-d0ddf8c857cb` visibly shows all seven dates Wednesday through Tuesday with correctly placed drills. Narrow recheck `676b6748-e34a-4668-9a32-55eebe23b08b` shows stacked native controls, feasible status and matching Wednesday dated section/allocation. Both reviews recorded with fleet_visual_review; zero open findings. These are agent visual observations, separate from independent host browser assertions and human acceptance. Host owns test-report.json and visual-review.json; neither edited.

The criterion map below remains applicable, with DELIVERABLE11-1 additionally supported by these calendar and browser regression checks. All source-level unverified requirements remain unverified regardless of passing prototype totals.

# Previous repair verification, 5 November 2026

Generated: yes. Runnable: locally verified. Tested: 38 application tests passed, zero failed/skipped, both workspace and clean declared runtime. Reviewer-accepted: no. Operationally validated: no. **requirementsMet: false**. Owner approval remains required before delivery or deployment; neither action was performed.

## Independent evaluator gap disposition

- **UC11-1 / SCOPE11-6 / SCH-04, SFTRM periodicity:** unverified. No releasable owner-reviewed mandates or independently reviewed examples were supplied, and this synthetic-only repair has no authorized owner contact. No rules were invented as SFTRM facts. Existing fixed-window recurrence remains synthetic; guided period/anchor changes now expand all linked occurrences and tests confirm complete seven-day due coverage, including unresolved weekend operations. Actual SFTRM compliance is not established. Planning defect: if the frozen deferral treats lack of a specification as sufficient dependency, that is invalid under the quality contract; a new planning run must resolve the defining mandate and semantics, rather than editing frozen expectations during repair.
- **UC11-1 / SCOPE11-5 / DESC11-3, collaborative agents:** repaired within the fixed public protocol. DepartmentAgent owns a request's candidate iterator, checks ownership and receives coordinator rejection/backtracking feedback; negotiate coordinates constraints and convergence/escalation. Candidate order and exact wire output remain unchanged. These are deterministic department policies, not model conversations. proposalRule prose is descriptive; arbitrary executable policy text is unsupported. New tests inspect feedback, changed operational blackouts, counterproposals and unresolved escalation.
- **DESC11-1 / DELIVERABLE11-1, usable authoring:** guided forms added for week date, drills, crew/qualifications, availability/prior duty, resources, operations/blackouts and fictional rules. New drill/rule/agent relationships are maintained automatically. Calendar fields eliminate manual minute conversion. A real browser journey created a sixth synthetic drill and deconflicted it to Tuesday 14:00, without editing JSON. Form validation/recovery exercised. This does not establish real crew/calendar coordination.
- **DELIVERABLE11-1 / SCOPE11-8, heatmap:** repaired with four distinct CSS bands and exact numeric values; legend states 0 / 1 to 60 / 61 to 120 / 121+ minutes. New boundary assertions distinguish zero, 60, 120 and 240. SCOPE11-8 is the evaluator's source alias; frozen canonical IDs are preserved.
- **SCH-05, actual operator acceptance:** unverified. No authorized PB4T operator trial occurred; browser-local acknowledgment remains explicitly separate from operator acceptance and deployment authorization. A future trial must review allocations, load, unresolved outcomes and recovery and record the operator's actual verdict.

## Executed checks and provenance

`node --test *.test.mjs`: 38 passed. Original domain.test.mjs and transport.test.mjs were not changed or skipped; verifier.test.mjs retained. New repair.test.mjs contains six tests: changed-input departmental feedback/escalation, ownership and executable proposal progression, guided new week/drill links and deconfliction, regenerated daily occurrence coverage, heatmap band boundaries, and availability failure/recovery. Tests call actual application functions and the HTTP worker transport.

A fresh OS temporary directory received exactly solution-contract.json runtime.files plus the four application test files. The same 38 tests passed there after the final source changes (zero dependencies). transport.test.mjs starts the actual service on an ephemeral loopback port and checks health, invocation and malformed JSON; worker equivalence is also covered. Temporary directory removed. This is local clean-runtime evidence, separate from the host clean-package gate.

UI call path: public/app.js → POST /api/invoke → server.mjs → compute.mjs worker → domain.mjs run/negotiate. Host invocation and UI use the same computation. No client-side scheduling implementation was added. lib/scheduling.js remains foundation provenance; domain.mjs enforces the PB4T-specific rules.

Existing host test-report.json predates this repair. Its synthetic pb4t-planner-reference v1 evaluations scored 1.0 at threshold 1.0, one trial per case, no per-trial failures, for allocation, status, fatigue, recurrence, loading and collision groups. Its filesHash c2820a53bd4f3a7ef89d6840ef665feb77185d3ce233858853c470944a06b5a6 is **not the repaired revision**. New host capability scores, frozen desktop/narrow journey results and aggregate runtime hash are pending the host rerun. No host evidence or frozen plan was authored or edited.

Previous repair changed-file SHA-256 (historical evidence, superseded above):

| File | Hash |
| --- | --- |
| domain.mjs | c7c488c929341396604edc20a18fba03e849b1db986aef4d99a448ec2b44dd17 |
| public/app.js | 9ef6af7014cde259305a7f36495b7b72d0299435e69ee518c6507bd660ab3594 |
| public/index.html | 285999f4972468c8eb62bf9d734271ea078defe54ae37f8f1987ce403b5436ee |
| public/styles.css | 0d46b63779cacf261c080d9b1c2cca4211bba74439b8dd239eee6ed0d9c84405 |

fleet_helpers returned no helpers. Optional Impeccable engine was not run; assigned references were read directly. A fleet_solve_schedule duty-budget check returned infeasible as expected; it is a tool observation, not application verification. Intake fixtures and data provenance remain unchanged and visibly synthetic.

## Browser and visual evidence

Exploratory observations: `.browser-observations/47d71d72-a3a1-4089-9b19-e55e819b229c/`. These are development observations, not independent host acceptance. Browser created a new week beginning 2026-11-16 and an additional synthetic fire drill; output was **Feasible synthetic draft, 6 drills; 0 remaining collisions**, with the new drill Tuesday 14:00 to 15:00 and 540 person-minutes. A second run induced a reversed candidate interval, observed **Drill candidates: end must follow start.**, retained the invalid value, corrected it and obtained a six-drill feasible result (capture 2a0e8012-b962-429d-ae0d-507ee5bf8565). Observed browser error arrays were empty.

Both initial reviews preceded fixes. The two authoring findings were explicitly resolved against changed runtime captures; final current-runtime rechecks have zero open findings. Host owns visual-review.json.

| Width | Initial | Resolution recheck | Final recheck |
| --- | --- | --- | --- |
| Desktop | 01747553-ed8b-4b55-a83f-fcc8eb3eb65b | 7133e4ca-d715-4298-b215-726f56367ffe | 60bf4ab9-5855-4118-8105-091585803c3a |
| Narrow | 1b91b052-82b5-4777-92a1-377f4c272dc5 | 012f115b-b331-47a3-83d7-dcd1186f6f2f | 4de423b1-353c-4821-bbf1-01f24b960dc5 |

Images inspected show the synthetic warning, readable controls, native UTC calendars, desktop role groups, stacked narrow intervals and distinct loading colors. Agent visual judgments do not establish accessibility certification or operator acceptance.

## Criterion evidence map

| Canonical ID | Current evidence / limit |
| --- | --- |
| UC11-1 | Unverified real mandate; repaired synthetic departmental feedback, constraints and recurrence covered by domain/repair tests and browser. |
| SCH-01 | Local tests pass explicit constraints, staffing, intervals, prior duty and budget boundaries. |
| SCH-02 | Local tests pass baseline feasible, impossible and budget-exhausted outcomes. |
| SCH-03 | Local tests and real browser cover collisions, alternatives and unresolved escalation. |
| SCH-04 | Synthetic recurrence tests pass history, carry-in, due/future and regenerated daily coverage; actual SFTRM mandate unverified. |
| SCH-05 | Actual operator acceptance unverified; local acknowledgment is software state only. |
| DELIVERABLE11-1 | Guided new-drill workflow, board, shared coordinator and graduated heatmap locally checked; new host journeys pending. |
| DESC11-1 | Real crew/operations unverified; synthetic authoring and deconfliction observed. |
| DESC11-2 | Synthetic collision and alternate allocations pass tests. |
| DESC11-3 | Department-owned iterators, feedback and shared negotiation tested; no external departmental agents. |
| SUMMARY11-1 | Synthetic integrated weekly workflow observed; operational usefulness unverified. |
| SCOPE11-4 | Preserved Requirements text and named drill outputs in browser; host literal journey pending rerun. |
| SCOPE11-5 | Shared constraint and synthetic staffing/fatigue checks pass; departmental coordination repaired. |
| SCOPE11-6 | Actual SFTRM compliance unverified; synthetic complete occurrence coverage demonstrated. |
| SCOPE11-7 | Preserved expected deliverables text, interactive board and evidence; host rerun pending. |
| SCOPE11-9 | Source attribution and synthetic boundary preserved; host rerun pending. |

## Remaining limits and retained failure evidence

All gates cannot be declared complete until the host reruns capability evaluations, clean package and frozen browser journeys against this revision. Actual SFTRM rules and operator acceptance remain unverified. Fixed-window requiredCount=1 and finite candidate backtracking remain deliberate frozen protocol limits, not general SFTRM semantics or global optimization. Guided drill editor selects one shared resource; advanced JSON supports multiple resources and policy/history details. Unapplied form values require Apply before closing; a browser warning guards forced reload, while staged drafts persist. No real systems, safety validation or operational publishing exist.

Prior session evidence remains in host records: independent judge verdict NOT with the five gaps supplied for this repair; a prior smoke harness using node --input-type=module failed worker launch due to its inherited flag, then a file-based retry passed. These failures are not erased by local repair checks. No new application test failed during this repair. Protected plans, requirements, foundation manifests, system-design.json, supplied data and original tests were preserved.
