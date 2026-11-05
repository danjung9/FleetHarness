# Acceptance and evidence matrix

Verification update, 2026-11-04. The application is implemented; 15 actual-application Node tests pass locally. All frozen browser journeys remain NOT RUN in this phase. Literal arithmetic and frozen outcomes were defined independently before implementation, but are not independent SME ground truth. Toolkit/reference examples are not application verification.

Source: `.fleet/packet.json`, capture date 2026-11-04; upstream timestamp/revision unknown. Research source P is SHA-256 `f25a5f20d452edfbc302d6092e1e77a06258b5bbf1fa5ee1ecc88f7b09f5008e`; its exact excerpt provenance remains in research.md. The following canonical requirements are copied verbatim from packet.acceptance. No event evaluation criteria or separate user criteria were supplied.

## UC11-1

**Original requirement:** The tool must deploy collaborative departmental agents (Engineering Agent, Weapons Agent, Combat Systems Agent, etc.) that negotiate drill schedules against shared constraints: ship operational windows, qualified personnel rosters (e.g., Fire Party Leader, EOOW, TAO), and fatigue policies. The multi-agent solver identifies personnel collisions, proposes alternate schedule allocations, and ensures all SFTRM-mandated training periodicities are satisfied.

**Packet method:** human. **Original scenario:** Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

**Provenance:** requirement / UC11-1 / `.fleet/packet.json#/challenge.requirements[0]`.

**Disposition:** deferred.

**Independent expected outcome:** Collaborative departmental agents negotiate schedules under operational windows, qualified rosters and owner-approved fatigue rules, identify collisions, propose alternate allocations and ensure every applicable SFTRM periodicity is satisfied.

**Input:** Future: owner-approved policy, actual collaborating departmental agents, applicable SFTRM rule set and completion history. Demonstration only: the two conflicting requests in plan.md.

**Application test / planned browser journey:** No complete application test planned for the full criterion. Slice covered by resolve-collision and domain tests N1 to N8; these do not verify the full source requirement.

**Result:** DEFERRED / UNVERIFIED, The slice demonstrates deterministic feasibility for synthetic departmental requests only. No collaborating agents, authoritative fatigue policy, SFTRM rules or completion history are supplied. Full source requirement remains unverified.

**Evidence location:** Planned Node cases in `scheduler.test.cjs`; frozen steps in `acceptance-plan.json`. Actual results will be in host-owned `test-report.json` with host-reported screenshot/trace paths; supplementary checks in `verification.md`. Local execution is recorded in `verification.md`; host browser evidence is pending. Deferred human/integration evidence is not supplied.

## SCH-01

**Original requirement:** No personnel or shared-resource double booking.

**Packet method:** automated. **Original scenario:** Schedule requests sharing a person and room; independently verify all interval pairs.

**Provenance:** recipe / SCH-01 / `.fleet/packet.json#/recipe.acceptance[0]`.

**Disposition:** implemented.

**Independent expected outcome:** Every complete proposal has zero overlapping interval pairs sharing personnel or an exclusive resource. In the planned two-request example, Damage Control occupies Monday 09:00 to 10:00 UTC and Engineering moves from 09:00 to 10:30 to 11:30 UTC; both use Alex and Room A without overlap. Proposal edits invalidate prior review.

**Input:** Alex and Room A shared by Damage Control [540,600) and original Engineering [540,600); Engineering candidates 540/630, duration 60, rest30.

**Application test / planned browser journey:** Browser resolve-collision and review-revision; Node N1, N2, N6, N7, N9, N10 against actual application functions.

**Result:** Local application Node checks PASS; browser outcome UNVERIFIED pending the host. See `verification.md` for the preserved initial diagnostic failure, correction and build 12/12 and verification 15/15 results.

**Evidence location:** Planned Node cases in `scheduler.test.cjs`; frozen steps in `acceptance-plan.json`. Actual results will be in host-owned `test-report.json` with host-reported screenshot/trace paths; supplementary checks in `verification.md`. Local execution is recorded in `verification.md`; host browser evidence is pending. Deferred human/integration evidence is not supplied.

## SCH-02

**Original requirement:** Honor availability, qualifications, rest and duty budgets.

**Packet method:** automated. **Original scenario:** Include a missing qualification, unavailable window and fatigue-boundary case.

**Provenance:** recipe / SCH-02 / `.fleet/packet.json#/recipe.acceptance[1]`.

**Disposition:** implemented.

**Independent expected outcome:** Within explicit synthetic inputs, every assigned interval is contained in a ship operating window and every assigned person availability window, all required qualifications are covered by assigned people, every same-person pair satisfies supplied rest and total horizon duty does not exceed budget. Missing FPL, availability ending at minute 600, rest 31 and duty budget 119 prevent the two-request proposal; restoring availability to 1020, rest 30 and budget 120 yields both requests and exactly 120 duty minutes. These are demonstration values, not approved policy.

**Input:** Assigned Alex qualifications EOOW/FPL, availability [540,1020), operating [540,1020), rest30 and budget120. Negative variants remove FPL, set availability end600, rest31, budget119. Existing duty intervals tested separately.

**Application test / planned browser journey:** Browser recover-qualification, recover-availability, recover-fatigue; Node N1 to N7 and N11 against actual application functions.

**Result:** Local application Node checks PASS; browser outcome UNVERIFIED pending the host. See `verification.md` for the preserved initial diagnostic failure, correction and build 12/12 and verification 15/15 results.

**Evidence location:** Planned Node cases in `scheduler.test.cjs`; frozen steps in `acceptance-plan.json`. Actual results will be in host-owned `test-report.json` with host-reported screenshot/trace paths; supplementary checks in `verification.md`. Local execution is recorded in `verification.md`; host browser evidence is pending. Deferred human/integration evidence is not supplied.

## SCH-03

**Original requirement:** Distinguish infeasible input from exhausted search.

**Packet method:** automated. **Original scenario:** Run an impossible case and a deliberately tiny search budget; expect different statuses.

**Provenance:** recipe / SCH-03 / `.fleet/packet.json#/recipe.acceptance[2]`.

**Disposition:** implemented.

**Independent expected outcome:** An exhaustive search of the impossible two-request candidate set reports Infeasible: no complete schedule within supplied candidates. A one-node budget reports Search limit reached: feasibility is unknown. Neither exposes an approvable partial proposal. Invalid duration is rejected as validation, separate from either solver result. Correcting inputs or increasing budget recovers a complete feasible proposal.

**Input:** Same fixture with search budget1; exhaustive budget1000 with Engineering candidate540 only; malformed duration0. Correct by budget1000, candidates540/630 and duration60 respectively.

**Application test / planned browser journey:** Browser recover-exhaustion, recover-impossible, recover-invalid; actual tests N5, N9, validation N10/N11 and V3 (planned case numbering differs from test titles).

**Result:** Local application Node checks PASS; browser outcome UNVERIFIED pending the host. See `verification.md` for the preserved initial diagnostic failure, correction and build 12/12 and verification 15/15 results.

**Evidence location:** Planned Node cases in `scheduler.test.cjs`; frozen steps in `acceptance-plan.json`. Actual results will be in host-owned `test-report.json` with host-reported screenshot/trace paths; supplementary checks in `verification.md`. Local execution is recorded in `verification.md`; host browser evidence is pending. Deferred human/integration evidence is not supplied.

## SCH-04

**Original requirement:** Preserve mandatory training periodicities.

**Packet method:** integration. **Original scenario:** Expand the owner-supplied recurrence rules into occurrences and verify every deadline.

**Provenance:** recipe / SCH-04 / `.fleet/packet.json#/recipe.acceptance[3]`.

**Disposition:** deferred.

**Independent expected outcome:** Expand every applicable owner-supplied mandatory recurrence rule into uniquely identified occurrences and due windows, accounting for completion history and horizon boundaries; every mandated occurrence is scheduled by its deadline with no omissions.

**Input:** Future: authoritative recurring rules, unique occurrence expansion, completion history and due windows crossing a horizon boundary.

**Application test / planned browser journey:** No completeness test is possible without supplied rules; do not replace it with an occurrence-count test over the two hand-entered requests.

**Result:** DEFERRED / UNVERIFIED, Owner-approved periodicity rules, applicability and completion history are missing. Two explicit synthetic occurrences do not establish recurrence completeness or SFTRM compliance. No mandatory-compliance indicator will be shown.

**Evidence location:** Planned Node cases in `scheduler.test.cjs`; frozen steps in `acceptance-plan.json`. Actual results will be in host-owned `test-report.json` with host-reported screenshot/trace paths; supplementary checks in `verification.md`. Local execution is recorded in `verification.md`; host browser evidence is pending. Deferred human/integration evidence is not supplied.

## SCH-05

**Original requirement:** Have an operator accept the proposed schedule.

**Packet method:** human. **Original scenario:** Review the editable board, personnel load and every constraint relaxation request.

**Provenance:** recipe / SCH-05 / `.fleet/packet.json#/recipe.acceptance[4]`.

**Disposition:** deferred.

**Independent expected outcome:** An authorized PB4T operator reviews the editable proposal, personnel loading and every requested constraint change and explicitly accepts that exact validated schedule; any changed input requires renewed review.

**Input:** Demonstration: inspect zero-audit proposal and numeric loads, accept revision1, edit unsaved then save impossible revision2, repair and accept revision3. Future: authorized human operator review.

**Application test / planned browser journey:** No automated test can establish real operator acceptance. Browser review-revision and Node N9 demonstrate local interaction/stale-review guards only.

**Result:** DEFERRED / UNVERIFIED, Local revision-bound acceptance and edit protection are demonstrated, but automated interaction cannot establish actual operator acceptance. No authorized operator or human acceptance evidence is supplied. Hard constraints are never relaxed automatically.

**Evidence location:** Planned Node cases in `scheduler.test.cjs`; frozen steps in `acceptance-plan.json`. Actual results will be in host-owned `test-report.json` with host-reported screenshot/trace paths; supplementary checks in `verification.md`. Local execution is recorded in `verification.md`; host browser evidence is pending. Deferred human/integration evidence is not supplied.

## DELIVERABLE11-1

**Original requirement:** An interactive weekly schedule board showing automated conflict resolution across departments with one-click schedule optimization and personnel loading heatmaps.

**Packet method:** human. **Original scenario:** Define the complete independent expected outcome in acceptance-plan.json and test-matrix.md. Implement and exercise it in a browser journey, or explicitly defer it with a reason; a partial demonstration does not establish the full requirement.

**Provenance:** deliverable / DELIVERABLE11-1 / `.fleet/packet.json#/challenge.expectedDeliverables.lines[0]`.

**Disposition:** deferred.

**Independent expected outcome:** An interactive weekly board automatically resolves cross-department conflicts, provides one-click schedule optimization under an agreed objective, and displays correct personnel loading heatmaps.

**Input:** Demonstration: two departments originally at09:00, exclusive room/person, first-feasible 10:30 alternative, Alex120/120 and Bea0/120. Future: agreed optimization objective and quality evidence.

**Application test / planned browser journey:** Browser resolve-collision and review-revision, Node N7/N10 demonstrate board/load/feasibility slice only; no optimization test or optimality claim.

**Result:** DEFERRED / UNVERIFIED, The prototype supplies a weekly editable board, conflict comparison, one-action feasible allocation and numeric heatmap. Bounded first-feasible search has no optimization objective or optimality guarantee; the full deliverable remains unverified pending owner definition and implementation of optimization.

**Evidence location:** Planned Node cases in `scheduler.test.cjs`; frozen steps in `acceptance-plan.json`. Actual results will be in host-owned `test-report.json` with host-reported screenshot/trace paths; supplementary checks in `verification.md`. Local execution is recorded in `verification.md`; host browser evidence is pending. Deferred human/integration evidence is not supplied.

## Domain test expectations and implemented evidence

All tests call actual exported application functions from the delivered inline core via scheduler-core.cjs. The independent validator must use interval-pair and totals checks rather than calling the search predicate. Use manually established values below; do not compute expected output by reusing the function under test.

| Case | Input and independent expected outcome | Planned function / evidence |
| --- | --- | --- |
| N1, baseline | Planned sample yields dc540 to 600, eng630 to 690, all 2 IDs exactly once, zero overlaps, Alex120, Bea0, minimum gap30. | findSchedule, auditSchedule, computeLoads; scheduler.test.cjs |
| N2, overlap boundaries | With rest0, same person/resource [540,600) and [600,660) are permitted. Shift second start599: infeasible. Distinct people sharing room still conflict; shared person with different rooms still conflicts. With no shared entities intervals may overlap. | findSchedule and auditSchedule |
| N3, windows | An interval ending exactly at availability/operating endpoint is valid; exceed by1 or start1 before window is invalid/infeasible. Operating window restriction is checked even when person is available. Adjacent [540,570),[570,600) do not contain a 60-minute interval as a single window. Availability of every assigned person must fit. | findSchedule and auditSchedule |
| N4, qualification coverage | Remove FPL from Alex: no feasible Engineering request. A qualified unassigned Bea cannot lend a qualification. Multiple assigned people can cover a union; require all strings, not any one. Unknown person/resource and empty assigned-person list are validation errors. | validateInputs, findSchedule, auditSchedule |
| N5, rest and duty | Rest30 permits 600 to630; rest31 forbids it. Rest applies to every same-person pair, including nonadjacent input order. Duty120 passes;119 fails; zero budget forbids positive duty. Compare by person, not global or daily budget. | findSchedule and auditSchedule |
| N6, prior commitments | Add Alex prior interval [480,510), rest30, availability extended to480, operating extended to480: 09:00 start satisfies rest boundary, total duty150 requires budget150. End511 violates start540 rest30. Existing Room A [630,660) prevents eng630 even without shared person. No commitments are dropped to find feasibility. | findSchedule, auditSchedule, computeLoads |
| N7, adversarial audit | Feed intentionally forged results: overlapping intervals, unknown/missing/duplicate request, unlisted candidate, wrong duration, omitted qualification, out-of-window assignment and excess duty. Each must report at least the corresponding violation; none may be reviewable. Zero violation only for a complete genuine sample. | auditSchedule independently of search |
| N8, bounded search | Candidate budget1 exhausts before complete sample; no assignments exposed. Budget1000 on eng540 only exhaustively proves no complete feasible supplied allocation. Budget1000 on original fixture finds expected result. Malformed duration is validation, not infeasibility. No result falsely claims optimality. | validateInputs and findSchedule |
| N9, revision guard | Accept rev1, edit draft, attempt accept: reject unsaved changes. Discard restores rev1. Changed save rev2 clears current/acknowledgement and retains historical rev1; failed solve cannot approve history. Repair save rev3 requires fresh solve/review. Unchanged save does not increment. Invalid save preserves committed data. | actual state transition functions; browser review-revision |
| N10, core/UI consistency | Node adapter executes the designated actual inline classic core; tests N1 to N8 exercise it. Browser resolve-collision asserts identical literal times, zero violations and numeric loads through actual UI. No mirrored copy, source-string equality or tool self-test counts. | scheduler-core.cjs + scheduler.test.cjs + host browser evidence |
| N11, contract limits | Reject duplicate IDs, invalid numeric strings, fractional/negative/NaN endpoints, reversed windows, empty required requests, out-of-horizon end, unsupported resource capacity and limits exceeded. Permit exact maximum supported sizes and integer endpoints. Corrupt stored data must not silently become accepted data. | validateInputs and storage/state functions |

## Browser evidence coverage and risks

Each of the eight frozen journeys starts with an empty fresh browser context at desktop and narrow widths. The fixture loader commits revision1. review-revision includes reload within that same context and a real download. All journeys interact and assert literal task outcomes. No journey may depend on a previous journey or external source. Advanced diagnostic controls are disclosed as synthetic inputs and remain secondary to the weekly board.

Keyboard navigation, focus after errors, replace/cancel behavior, unsaved-draft reload, storage unavailable/quota/corruption, live statuses, meaningful heatmap contrast, resize readability and export of historical versus current content need additional implementation checks and human review. Do not claim these passed merely from domain tests or unspecified browser assertions. Browser evidence covers only frozen interactions. App responsiveness at the bounded maximum has not been benchmarked. Missing browser runtime is a verification failure.

## Operational requirements and human review still needed

- Owner-approved fatigue/rest/duty rules with revisions, effective dates, accounting horizon and existing/prior-duty semantics; synthetic30/120 values are not policy.
- Authoritative SFTRM recurrence applicability, historical completion, due dates, carryover and missed-deadline treatment; every mandated occurrence must be independently enumerated.
- Qualification expiry and distinct staffing billets/headcounts; union string coverage is a limited model. Resource capacity, availability and actual ship operational windows need owner review.
- Optimization objective, acceptable quality bound, collaborative departmental negotiation semantics, representative scale and CP-SAT version/license/runtime/benchmark evaluation for any future adoption.
- Authorized operator identity and actual proposal-specific human signoff after reviewing board, loads and proposed constraint changes. Local checkbox/button evidence does not satisfy SCH-05.
- Production persistence, authentication, audit/retention and any operational integration require separate scope and approval. No live-system or credential access is part of this delivery.

Generated planning documents are distinct from a runnable application, application tests, reviewer acceptance and operational validation. All latter stages are absent at planning handoff. Host freezes both JSON plans; builder/repair cannot change expectations to observed output, weaken dispositions or overwrite host evidence. All implemented Node and browser checks must pass before prototype review; deferred requirements remain unverified regardless.

## Build evidence cross-reference

The case numbers in the table above describe planned expectations; implementation test titles group some cases differently. Exact cases are in `scheduler.test.cjs`: baseline N1, collision/forgery N2 and N8, qualification/windows N3, fatigue N4, bounded search N5, prior commitments N6, alternate assignments N7, revision/store N9 and N11, validation N10/N11, and supplemental one-minute/window/prior-rest boundaries. All 15 tests passed locally, including verifier V1 (216 exhaustive models), V2 (backtracking and prior-commitment rest/collisions), and V3 (restored draft and stale proposal replay). UI wiring still requires the frozen browser journeys. No deferred criterion changed disposition.


## Verification additions

V1 supplies 216 combinations of rest (0/30/31), duty (119/120/121), availability end (600/689/690), shared/different personnel and resource, and present/missing qualification. Expected: exhaustive independent enumeration and actual application agree on feasibility, with all feasible returned intervals independently valid (SCH-01, SCH-02). V2 forces an earlier allocation to backtrack, expects Damage Control 630 and Engineering 540 after four candidate attempts, rejects overlapping prior commitments, permits a 30-minute rest gap and rejects 29 (SCH-01, SCH-02). V3 serializes an unfinished draft, rejects solve/accept until deliberate recovery, and rejects a replayed older proposal at a newer revision (SCH-01 revision guard, SCH-03 failure/recovery slice; does not satisfy SCH-05 human acceptance). All PASS locally; evidence: `scheduler.test.cjs` V1 to V3 and `verification.md`. No skipped Node checks. Browser gate remains unverified, and `requirementsMet` remains false.
