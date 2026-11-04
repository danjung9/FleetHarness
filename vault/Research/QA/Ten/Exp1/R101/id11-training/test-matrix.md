Primary deferrals: none. Synthetic application only; operational requirements remain unestablished.

# Current verification result, 2026-11-04

This section supersedes historical planning/build statuses retained below. `node --test domain.test.cjs` on Node v26.0.0: **20 passed, 0 failed, 0 skipped** after the one bounded repair. Initial added regressions produced 12 passed / 2 failed; failure details are preserved in verification.md. All browser journeys on desktop and narrow remain UNVERIFIED; test-report.json and screenshots/traces belong to the host and were not created by the agent. requirementsMet: false.

| Criterion | Actual input / expected outcome | Application evidence / current result | Planned browser evidence |
| --- | --- | --- | --- |
| UC11-1 | Five fictional participants with conflicting C01/room proposals; DC moves to C04 at 660; all mandatory work retained | domain.test.cjs baseline and final multi-fixture independent oracle PASS | weekly-resolution, qualification-recovery, availability-recovery, recurrence-coverage, overdue-recovery, fatigue-policy: pending |
| SCH-01 | Pairwise people/resource exclusivity, half-open endpoints, duplicate IDs/resource substitution, conflicting then corrected edit | domain.test.cjs baseline, collision, touching, duplicate/resource and independent oracle tests PASS | weekly-resolution, edit-review: pending |
| SCH-02 | Missing/expired qualification, unavailable crew, resource closures, alternate crew, distinct count; daily240/241 weekly720/721 block480/481 gap719/720/721; prior duty and week boundaries | domain.test.cjs qualification, resource/role, fatigue and independent oracle tests PASS | qualification-recovery, availability-recovery, fatigue-policy: pending |
| SCH-03 | Impossible DC deadline/infeasible, budget1/exhausted, malformed input/invalid, cancellation/no commit and recovery | domain.test.cjs search, 16 malformed mutations and actual-controller stop/lock test PASS | search-recovery, invalid-and-stop: pending |
| SCH-04 | Exact eight occurrence IDs and boundary DC-4; omitted work uncovered; due equality passes/+1 fails; overdue history explicit | domain.test.cjs recurrence/history, due-boundary and independent oracle tests PASS | recurrence-coverage, overdue-recovery: pending |
| SCH-05 | Accepted exact revision persists through adapter reload; unsaved editors/draft block review; corrected revision3 requires confirmation; save does not erase other drafts | domain.test.cjs five actual-controller adapter tests and core edit test PASS; browser storage and human review unverified | review-export, edit-review, fatigue-policy: pending |
| DELIVERABLE11-1 | Baseline exact allocation text and six crew totals120/60/60/120/0/60min; rendered reports and accepted text download | Core boardText/loads and independent totals PASS; actual download/rendered workflow unverified | weekly-resolution, review-export, edit-review: pending |

Evidence location: domain.test.cjs (actual inline application functions and controller handlers), verification.md (executed results, preserved failures, criterion mapping and limitations). A minimal DOM/storage adapter is supporting Node evidence and cannot substitute for the frozen browser journeys. README guide steps, real download, keyboard/visual review and desktop/narrow screenshots remain unverified.

# Historical planning and build matrix

Primary deferrals: none. Every canonical criterion remains in scope for a complete synthetic demonstration. Operational validation, real SFTRM/format conformance and actual human approval are unestablished. README.md, verification.md and delivery/review summaries must lead with the same disclosure; no synthetic interaction constitutes operational acceptance.

# Frozen acceptance and evidence matrix

All results below are NOT RUN, planning only. acceptance-plan.json contains ten declarative journeys with literal outcomes; ux-spec.json defines states/persistence/recovery/keyboard behavior. The host runs each in fresh desktop and narrow contexts. Inputs/expected values are defined before implementation from scope's synthetic assumptions and the planner's explicit fixture rules in plan.md, not copied from subsequent application behavior. This is independent of build drift, not SME ground truth. Source provenance follows each canonical criterion below; no alias IDs, extra evaluation criteria or user criteria are invented. Packet challenge.evaluationCriteria and userScope.criteria are empty.

### UC11-1, implemented synthetic disposition

Original criterion: The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

Provenance: requirement `UC11-1` at `challenge.requirements[0]`. Packet method: human.

Independent expected outcome: The complete labeled synthetic PB4T workflow uses Engineering, Weapons, Combat Systems, Damage Control and Flight Operations Agents to propose, reject and accept allocations against shared crew, resources, operational windows, synthetic fatigue and explicit mandatory occurrences. The baseline resolves the C01/Training Room collision by moving Damage Control to Mon 11:00 C04; all five required drills are covered. Repeated, cross-week and overdue occurrences are visible. Real SFTRM, formats and operational rules remain unvalidated.

Browser journeys: weekly-resolution, qualification-recovery, availability-recovery, recurrence-coverage, overdue-recovery, fatigue-policy. Result: NOT RUN (planning). Evidence planned: host `test-report.json`, desktop/narrow screenshots and traces for those journeys; `domain.test.cjs` results recorded in `verification.md`.

### SCH-01, implemented synthetic disposition

Original criterion: No personnel or shared-resource double booking.

Provenance: recipe `SCH-01` at `recipe.acceptance[0]`. Packet method: automated.

Independent expected outcome: The baseline retains all five drills with zero personnel or resource interval overlaps and explicitly reports the resolved Damage Control collision. A conflicting board edit is rejected on validation and corrected without losing the occurrence.

Browser journeys: weekly-resolution, edit-review. Result: NOT RUN (planning). Evidence planned: host `test-report.json`, desktop/narrow screenshots and traces for those journeys; `domain.test.cjs` results recorded in `verification.md`.

### SCH-02, implemented synthetic disposition

Original criterion: Honor availability, qualifications, rest and duty budgets.

Provenance: recipe `SCH-02` at `recipe.acceptance[1]`. Packet method: automated.

Independent expected outcome: Assignments meet explicit qualifications, crew/resource/ship availability, distinct role counts, daily/weekly duty and synthetic block/rest limits including prior duty. Missing EOOW and unavailable flight crew block acceptance until corrected. A 4.5h daily load fails a 4h limit and passes only after a deliberate versioned synthetic policy edit to 4.5h; hard constraints never relax automatically.

Browser journeys: qualification-recovery, availability-recovery, fatigue-policy. Result: NOT RUN (planning). Evidence planned: host `test-report.json`, desktop/narrow screenshots and traces for those journeys; `domain.test.cjs` results recorded in `verification.md`.

### SCH-03, implemented synthetic disposition

Original criterion: Distinguish infeasible input from exhausted search.

Provenance: recipe `SCH-03` at `recipe.acceptance[2]`. Packet method: automated.

Independent expected outcome: An impossible DC deadline is reported infeasible over supplied candidates, a node budget of 1 reports search exhausted with feasibility unresolved, and budget 0 is invalid input. None authorizes acceptance. Correction to budget 50000 yields all five baseline occurrences; stopping preserves inputs without accepting a new schedule.

Browser journeys: search-recovery, invalid-and-stop. Result: NOT RUN (planning). Evidence planned: host `test-report.json`, desktop/narrow screenshots and traces for those journeys; `domain.test.cjs` results recorded in `verification.md`.

### SCH-04, implemented synthetic disposition

Original criterion: Preserve mandatory training periodicities.

Provenance: recipe `SCH-04` at `recipe.acceptance[3]`. Packet method: integration.

Independent expected outcome: Synthetic recurrence and explicit history expand into stable required occurrences: baseline five weekly drills; two-day DC fixture eight total with four DC deadlines, including DC-4 on 16 Nov due 17 Nov 00:00 beyond the displayed week. An overdue DC-0 remains uncovered and blocks acceptance until explicit fictional completion history is recorded. No real SFTRM integration or certification is claimed.

Browser journeys: recurrence-coverage, overdue-recovery. Result: NOT RUN (planning). Evidence planned: host `test-report.json`, desktop/narrow screenshots and traces for those journeys; `domain.test.cjs` results recorded in `verification.md`.

### SCH-05, implemented synthetic disposition

Original criterion: Have an operator accept the proposed schedule.

Provenance: recipe `SCH-05` at `recipe.acceptance[4]`. Packet method: human.

Independent expected outcome: The operator reviews an editable board, load heatmap, conflicts and every explicit relaxation request, then deliberately records synthetic acceptance of a valid complete revision with reviewer alias. Acceptance persists across reload; an unsaved conflicting draft blocks acceptance, committed edits invalidate the old review, and only a revalidated revision can be accepted. This interaction is not actual human prototype acceptance or operational authority.

Browser journeys: review-export, edit-review, fatigue-policy. Result: NOT RUN (planning). Evidence planned: host `test-report.json`, desktop/narrow screenshots and traces for those journeys; `domain.test.cjs` results recorded in `verification.md`.

### DELIVERABLE11-1, implemented synthetic disposition

Original criterion: An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

Provenance: deliverable `DELIVERABLE11-1` at `challenge.expectedDeliverables.lines[0]`. Packet method: human.

Independent expected outcome: A self-contained interactive Weekly PB4T Schedule Board provides one-click Optimize schedule, five departmental negotiation records, Conflict and Resolution Report, Periodicity Coverage Report, Personnel Loading Heatmap and Synthetic Schedule Review Record and Export. The literal baseline assignments yield weekly loads C01=2h, C02=1h, C03=1h, C04=2h, C05=0h, C06=1h; a readable download contains the same accepted revision, assignments, loads and synthetic warning. Optimization denotes bounded feasibility, with no global optimality claim.

Browser journeys: weekly-resolution, review-export, edit-review. Result: NOT RUN (planning). Evidence planned: host `test-report.json`, desktop/narrow screenshots and traces for those journeys; `domain.test.cjs` results recorded in `verification.md`.

## Per-criterion inputs and application checks

Every listed test must call actual application PB4TCore functions extracted from the inline script in index.html. File: domain.test.cjs, Node built-in test runner. Status for every row: planned/unverified. Evidence location: Node results in verification.md and host test-report.json; host browser evidence under each journey ID. Toolkit self-tests/reference fixtures, model statements and source-string checks are not evidence.

| Criterion | Inputs | Independent expected outcome and Node coverage | Browser evidence |
| --- | --- | --- | --- |
| UC11-1 | Six fictional crew, five agents/drill families, conflicting baseline requests, versioned synthetic policies/history | Five actual proposal/response records; DC's initial C01 and Training Room proposal rejected; alternative C04 11:00 accepted. Five weekly occurrences all assigned. Assert participant ownership and original/rejected/alternative/final transitions, qualified crew enumeration, resource calendars and full recurrence coverage. | weekly-resolution; qualification-recovery; availability-recovery; recurrence-coverage; overdue-recovery; fatigue-policy |
| SCH-01 | Baseline; manually conflicting DC edit; touching half-open intervals | Independently enumerate every unordered interval pair; no shared-person or shared-resource overlap in feasible output. Baseline original proposals collide in both ways. Two intervals [480,600) and [600,660) may share resource, but [480,601) and [600,660) collide. Distinct resources still collide if same person; distinct people still collide if same resource. Saved conflicting board fails validation until corrected. | weekly-resolution; edit-review |
| SCH-02 | Missing EOOW for C01/C05; unavailable C06; two-role distinct-person demand; Flight Deck Monday 08:00; prior-duty overload and fatigue boundaries | No candidate can invent EOOW; restoring C01 works. C06 unavailable fails; availability restored passes. Two roles cannot be filled by the same person even when qualified for both. Qualification expiration inside occurrence fails. Flight Deck before13:00 fails even if crew and general operations available. Full interval must be contained in person/resource/operations windows. Daily 240min passes, 241 fails; weekly720 passes,721 fails. Block span480 passes,481 fails; gap719 merges blocks and may fail span,720 splits blocks,721 splits. Verify prior-week duty changes first-block validation and prior duty counts in correct day/week. Cross-midnight daily splitting is checked. 270min duty fails240 and passes only an explicit270 policy version. | qualification-recovery; availability-recovery; fatigue-policy |
| SCH-03 | Impossible DC120min before09:00 after08:00; full baseline budget1/50000; malformed/zero budget; canceled search | Exhaustive impossible case is infeasible, partial search budget1 is budget_exhausted, budget0 invalid_input; neither emits a valid/reviewable complete result. Baseline budget50000 feasible. Stopped search returns stopped, preserves draft and previous valid result, never commits partial assignments. Candidate set exhaustion is not a claim about all possible schedules. | search-recovery; invalid-and-stop |
| SCH-04 | Weekly five families; four two-day DC cycles/history; overdue DC-0; next-week extension | Independently enumerate occurrence IDs/deadlines, compare exact set not just counts. Baseline5; repeated DC4 plus other4=8. DC-4 release15 Nov00:00, due17 Nov00:00, assigned16 Nov11:00 retained beyond week. End exactly at deadline passes; end+1 fails. Missing occurrence cannot pass. Old overdue DC-0 remains visible until explicit completion07Nov11:00; history covers it without fabricating an assignment. Missing/invalid history is error or uncovered, never inferred. Repeated expansion deterministic and no duplicate IDs. | recurrence-coverage; overdue-recovery |
| SCH-05 | Alias Alex Demo; valid revision1; unsaved DC conflict; saved revisions2/3; relaxation request4→4.5h | Acceptance binds exact input/board/policy revision, and fails for invalid/incomplete/exhausted/stopped/stale result. Unsaved draft blocks acceptance. Saving edit invalidates previous review; conflict blocks; correction and full validation permits acceptance of revision3. Reload restores accepted revision1 when unchanged. Request alone does not alter policy; explicit save with reason creates new version and invalidates review. Export cannot label a pending revision accepted. | review-export; edit-review; fatigue-policy |
| DELIVERABLE11-1 | Baseline witness and reviewed revision | Actual result totals recomputed independently: C01=120,C02=60,C03=60,C04=120,C05=0,C06=60min. Per-day heatmap totals sum to weekly, budget denominators visible, zero-load crew retained. All named reports and export refer to same revision and assignments. Export includes six named outputs, policy, occurrences, warning, search/review state. Opening index.html uses no external dependency. | weekly-resolution; review-export; edit-review |

## Additional boundary and UX verification

Node cases: duplicate IDs, unknown crew/resource, negative duration, noninteger times/budget, end before start, empty mandatory dataset, malformed recurrence and missing policy fail specifically without partial state mutation. Inputs are not mutated during solving. Permuting input arrays preserves stable ID ordering; candidate ordering is deterministic. Test alternative qualified crew search rather than only fixed-person starts. Test impossible combined resource/person allocation after individually valid candidates. At search limits, do not replace budget_exhausted with infeasible. Test weekly budget boundaries including prior duty; no double-counted actual duty from merged idle spans. Check report/load/export projections using actual generated snapshots and literal witness values.

Browser journeys use stable IDs chosen in planning, not text-position selectors. Each interacts and asserts exact text or readable download. Recovery journeys induce failures then correct them; review-export includes reload and download boundaries. UI/core consistency comes from executing the actual inline domain script in Node, then exercising the same calculations through the real browser board and exports. Do not create a second untested browser solver or verify by matching source strings.

Additional human review (unverified until recorded): keyboard Tab order/visible focus, error-summary focus and live status announcements; readable heatmap without relying on color; all report headings; clear disabled-action reasons; desktop and narrow readability; draft preservation when switching sections; explicit Save/Discard; sample replacement/reset confirmation; corrupt/unavailable localStorage recovery; no outgoing requests; visible search budget/progress, cancel and bounded stop responsiveness. Host screenshots/traces support only specified interactions, not comprehensive usability/accessibility or production performance. No dedicated browser inspection has been performed during planning.

## Evidence handling, risks and operational review

Generated: planning artifacts only. Runnable application: not built. Node tests: not run. Browser/visual/manual checks: not run. Reviewer accepted: not established. Operationally validated: not established. Do not edit .fleet/, frozen contracts or host evidence. Preserve failed runs. Missing browser runtime is a failed verification gate; Node results cannot substitute for it. A suspected frozen-requirement error requires a new planning run, not weakening expected values in repair.

All implemented Node and browser checks must pass before prototype review. One shared bounded repair attempt covers Node/browser failures, then the host reruns both gates. verification.md must name failures, skips and unverified checks separately and identify evidence paths from actual returned reports; never fabricate screenshots or hashes.

Human policy owners must assess actual role currency, watches/prior duty, fatigue/block semantics, SFTRM applicability/version/history/grace/deadlines, priority objectives, scale, retention/security, official formats and acceptance authority. No real data acquisition or operational integration is authorized. Current rules are fictional assumptions. Explicit synthetic acceptance exercises the interface only; a real reviewer must separately judge source fitness and usability. Local feasibility does not establish a globally optimal roster or safe drill execution. Prohibited actions, monitoring, escalation by local report, and Stop behavior remain visible in plan.md and the application.

## Build-phase application evidence (2026-11-04)

`node --test domain.test.cjs` on Node 26.0.0: 9 passed, 0 failed, 0 skipped. Actual inline core executed from index.html. Browser journeys remain planned/unverified until the host runs them; no toolkit result substitutes for those journeys.

| Criterion | Actual application test inputs and expected outcome | Build result / evidence |
| --- | --- | --- |
| UC11-1 | Baseline ranked proposals: five participants, rejected DC collision, alternate C04 at 11:00; all mandatory allocations | Core passed; domain.test.cjs first test. UI journeys pending. |
| SCH-01 | Baseline independent pair oracle; edit DC to 08:00 C01 then restore 11:00 C04 | Core passed; baseline and edit tests. Browser board pending. |
| SCH-02 | Missing EOOW, unavailable C06, expired qualification, role count, alternate C05, resource closure, daily/prior duty, exact 12h gap and weekly budget | Core passed; qualification, fatigue and boundary tests. Policy UI pending. |
| SCH-03 | Impossible deadline, budget 1 and budget 0 | Core returns infeasible, budget_exhausted and invalid_input respectively; search status test. Stop UI pending. |
| SCH-04 | Two-day DC, boundary DC-4 and missing/explicit DC-0 history | Core passed; 8 occurrences and 6/5→6/6 history coverage. Browser export pending. |
| SCH-05 | Conflicting committed allocation invalidates feasibility; corrected allocation audits clean | Core validation passed. Review alias, confirmation, revision persistence and deliberate acceptance require host journeys, currently unverified. |
| DELIVERABLE11-1 | Actual board text and counted duty from baseline core | Core passed; exact assignment string and hours test. All named browser reports, download and narrow layout pending. |

See verification.md for full limitations. No human acceptance or operational validation has been recorded.
