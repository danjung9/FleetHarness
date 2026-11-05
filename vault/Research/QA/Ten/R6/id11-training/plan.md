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

# Application and runtime

Use node-service 1.0.0 and scheduling pack; host copies all foundation files after planning. Do not recreate setup. Node 22.19+ standard library, no external dependencies, model or credentials. Preserve foundation-lock.json. Shared compute.mjs/domain.mjs handles API, browser and Node tests; never duplicate calculation in client. Extend bounded search rather than use unchanged toolkit ordering/counters. lib/scheduling.js remains included as foundation computation; adapt its implementation or reuse its checks under domain.mjs for the richer candidate model. The mandatory capabilities and public protocol in solution-contract.json are authoritative. No production authentication or operational integration is represented.

The smallest complete slice loads the exact prepared baseline, computes initial collisions, runs five departmental proposal policies through shared hard constraints, emits counterproposals, renders a complete weekly board, numeric personnel/day heatmap and due-occurrence report, supports edits and recovery, and permits only a deliberate local acknowledgment. Engineering/Weapons/Combat Systems agents are independent request owners with a deterministic propose/reject/counterpropose protocol, not decorative labels or live communications. Damage Control and Flight Operations agents participate too. Objective: first complete feasible roster over explicit finite candidates. The Optimize schedule control must disclose that objective and its budget; no global-optimality assertion.

# Data and synthetic answer basis

Use inputs/manifest.json (no attached sources), data/synthetic-data.json and data/README.md unchanged. Their earlier pending status in scope is superseded by the now prepared files. Embed baseline and all 22 scenario INPUT objects (not expected answers) in public/index.html, the selected foundation's index.html location. No browser fetch of local fixture files; HTML is self-contained for fixture data, computation still requires the local API. No root index.html duplicate needed. Exclude answer fields/prose from runtime computations. Preserved data artifacts may be packaged as provenance, never imported as answer logic. Toolkit examples are not application fixtures.

PB4T JSON is the requested domain input: roster qualifications, named department proposals and shared policy, rather than a generic task format. Grammar and every time/fatigue/recurrence assumption are fixed in the public invocation protocol and supplied data README. Half-open UTC minutes and the explicitly unapproved FICTIONAL-PB4T-1 values are synthetic, not validated against the real format. The UI, exports, user guide and evidence must say that. No approved SFTRM frequency is inferred.

The preimplementation independent baseline key is DC-1 [540,600) P1/R1; ENG-1 [1980,2040) P1,P2/R1; CS-1 [660,720) P3/R2; WPN-1 [2100,2160) P3/R2; FLT-1 [3420,3510) P4,P5/R3. Initial pairs DC/ENG and CS/WPN share person and resource. All five due occurrences satisfied, zero remaining conflicts. Loads P1/P2/P3/P4/P5/P6=120/60/120/90/90/0, total 480 person-minutes. Prior duty zero. The recurrence fixture's history satisfies occurrence 0 (deadline 2880), CS-B at 3540 satisfies occurrence 1 (7200), occurrence 2 pending-future (11520). Its impossible variant leaves occurrence 1 unmet. These are hand-keyed fictional expectations, not independent SME validation. Host seals distinct evaluation cases; builder must rely on general public rules and application tests, not reconstruct the sealed key.

# Ordered implementation tasks

1. Inspect host-materialized FOUNDATION.md, foundation-lock.json, server/client and computation callers. Retain full runtime manifest. Add domain.mjs and meaningful domain.test.mjs importing compute.mjs. Do not edit protected inputs, contracts or .fleet.
2. Implement strict public validation and error precedence; signed historical interval arithmetic; pairwise overlaps/rest and prior-duty accounting. Daily and rolling budgets are not horizon maxMinutes. Unit checks use supplied exact/just-over scenarios plus independent assertions.
3. Expand fixed-window occurrences and credit history; keep pending-future and unmet visible. Build complete due-request set before staffing/search. Implement finite candidate role selection, deterministic ordering, bounded DFS and trace; never relax constraints. Use worker_threads behind the existing HTTP adapter to allow cancellation/disconnect to terminate computation. No undeclared worker file required: domain.mjs can serve as worker entrypoint with explicit workerData; compute.mjs exports shared computation used in both modes.
4. Return exact public projections and full result. Independently recheck final assignment pairs, roles, candidate containment, person totals and every occurrence in application tests. Host evaluates required capabilities in clean runtime before UI completion. No hardcoded fixture results.
5. Extend foundation client/layout for weekly task board, named agents, inline start/crew editing, collision explanations, numeric daily heatmap, prior-duty totals, explicit policy, recurrence and budget status. Add fixture embedding, secondary JSON editor, native labeled controls and keyboard focus. Responsive day sections on narrow screens; no drag-only behavior. Implement all frozen selectors and literal outcomes.
6. Implement separate draft/committed result/review states in localStorage; changes revoke acknowledgment immediately. Applying an edit is explicit; Check board reports invalidity; Optimize recomputes and commits. Switching input while dirty requires Save draft or Discard draft. Acceptance baseline loads start clean; recovery uses deliberate discard. Acknowledge only current feasible content after evidence checkbox. Export exactly that revision with warnings; no operational acceptance.
7. Add failure/cancellation recovery, no duplicate requests, last valid result preservation and no stale-result acceptance. Run meaningful *.test.mjs checks against actual shared core, including all prepared scenarios. Build user guide and path-to-fleet.md; start both with primary deferrals. Record no results in this planning phase.
8. During build and verify complete each phase's mandatory fleet_browser/fleet_visual_review initial desktop+narrow reviews and fresh rechecks, resolving findings on later captures. Host runs frozen journeys at both widths and sealed capabilities. Preserve frozen expectations and record actual evidence in verification.md. Shared repair budget is two attempts. Owner reviews specific revision before delivery/deployment.

# Operational boundaries, monitoring and escalation

Show current input version, policy version, search limit, calculating/cancel state, feasibility unknown versus impossible, stale changes, rejected proposals and every unmet occurrence. Cancel aborts invocation and worker; last committed result remains with explicit canceled status and no newly accepted partial result. No external messages, real roster access, policy invention, automatic relaxation, operational publishing or SFTRM certification. Escalate unresolved obligations and any requested relaxation to the operator. Shutdown terminates the local service/worker; localStorage remains local to browser. Actual policy, crew/history, fatigue safety, retention/security and operator authority need later owner/domain review. No model-assisted explanation is needed; explanations are deterministic summaries of trace facts. If a model is added later it cannot alter constraints and requires a new runtime/contract plan.

# Scope and risks

Finite staffing products may grow quickly: show budget_exhausted, never infeasible on timeout. CP-SAT upgrade needs measured benchmark and locked runtime evidence; not required for small fictional fixtures. Resource capacity >1 and non-fixed recurrence grammar reject explicitly. Human review assesses semantic adequacy of every named output and fictional-format fidelity separately from passing prototype checks. An implemented synthetic criterion does not close deferred real-data requirements. Report generated/runnable/tested/reviewer-accepted/operationally-validated separately. Optional Impeccable engine did not run; assigned reference guidance was read directly. No clarification is needed for routine choices already bounded by the fixtures and synthetic-only scope.
