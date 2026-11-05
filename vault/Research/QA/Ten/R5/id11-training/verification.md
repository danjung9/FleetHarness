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

# Build verification record

Synthetic fixture provenance: exact prepared inputs from data/synthetic-data.json, classification synthetic, invented fictional-pb4t-1 grammar; not validated against the real format. No supplied real data or external services were used. Fixture and frozen contract files were preserved.

Local command `node --test scheduling.test.mjs`: 30 tests passed, zero failures/skips (Node 26.0.0 in this build workspace; declared minimum 22.19). Tests import actual compute.mjs and the real HTTP server. Complete report comparisons cover all protocol fields and ordered arrays for baseline and shifted operations. Additional tests cover all20 scenario computational inputs, mandatory/optional missing occurrences, malformed inputs at zero budget, exact expiry/rest/duty limits, aggregate capacity, Cartesian roles, cross-midnight clipping, empty inputs, cancellation and HTTP malformed JSON. Independent interval/person/resource checks inspect returned solutions rather than reuse candidateReason.

A host fleet_solve_schedule example independently illustrated a 60-minute rest boundary for two relative-minute assignments. That is tool behavior only and is not application acceptance evidence.

Exploratory fleet_browser development observations exercised load/generate, invalid duration/correction, review/edit/save invalidation, cancellation and shifted-operation replacement. Actual screenshots and console observations are under .browser-observations/. These are development evidence, not host independent acceptance. Desktop and narrow initial visual reviews found a secondary-button hover contrast defect; the source now uses a light hover background with dark text. A later desktop review found a stale instruction asking for generation after success; app.js now displays the ready-for-review action. Final fresh desktop and narrow rechecks were recorded against the latest runtime, with zero open findings. The host owns visual-review.json. Final desktop capture: 61c30708-2104-4a46-956a-4b756c2d113b; final narrow capture: b4fa9ab2-5659-4f80-8a92-ee6398c63230.

Host-owned clean-runtime core evaluation and frozen browser-journey execution are pending. This session has no exposed core evaluation tool; no .quality-evidence/core-report.json has been authored or claimed. The host must produce that report against the frozen evaluations before the computational completion gate can be declared passed. No test-report.json, runtime hash, approval or reviewer signature has been invented. Human operator acceptance, delivery/deployment approval and operational validation have not occurred. requirementsMet remains false because declared deferrals remain unverified.

No dependencies were added: the versioned node-service 1.0.0 foundation and its validation/scheduling modules are extended, with provenance preserved in FOUNDATION.md and foundation-lock.json. No model inference or external endpoint is required. Optional Impeccable engine was not run. No live-source retrieval is claimed.

Frozen test-matrix.md was briefly edited as evidence notes, then restored byte-for-byte; fleet_browser accepted the restored frozen plan. Build results live here, not in the frozen planning files.

## Core evaluation repair diagnosis, ordering inconsistency

The independent host report is failed and remains authoritative failure evidence; it has not been edited. Runtime filesHash: 78b4edbd4cf9af72031d5a119bee59c19dde255fb458d5e13e9eab8aca31a6be, Node v24.22.2. allocation-reference passed all cases (score 1, threshold 1); audit-reference scored 0.5 against threshold 1. Its shifted-operations case reports the first mismatch at `$.baselineOperationalViolations[0]`.

The public frozen invocation explicitly states: “Operational violation strings order by request then operationalWindows input order.” Shifted input request order is D1,D2,D3,D4,D5,D6,D7; D3 violates OP2 and D5 violates OP1. Therefore the protocol specifies `["D3:OP2","D5:OP1"]`, which is what the actual shared runtime returns. The supplied data-agent fixture's expected array instead is `["D5:OP1","D3:OP2"]`, consistent with window-first ordering. The host report does not expose its expected value; its reported mismatch is consistent with this supplied-key inconsistency. The original complete-response application test independently asserts request-first ordering and passes.

No runtime change can satisfy both contradictory orders. Changing runtime ordering to mirror the supplied fixture key would violate the frozen public protocol and fail the unchanged original test. No runtime, contract, fixture, test expectation or host evidence has been changed in this repair diagnosis. The 30 original local tests were rerun unchanged and passed. The independent core gate remains failed; no repaired pass is claimed. A new planning run must reconcile evaluation ordering with the public protocol before a consistent runtime repair can be made. This is a planning/evaluation inconsistency, not authorization to weaken either expectation during repair.

Current actual SFTRM/real-data and operator-approval deferrals remain unchanged. Owner approval, delivery and deployment remain withheld. Fresh desktop/narrow browser observations were collected during this diagnosis; visual review cannot establish a computational pass.
