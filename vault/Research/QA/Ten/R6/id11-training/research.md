# Reuse research, PB4T constraint-based planning

Research completed 2026-11-05. This is a reuse assessment, not an implementation plan, application verification, delivery or deployment. Requirements, scope, packet, supplied fixtures and protected files remain unchanged. Applied the assigned fleet-research, fleet-evidence, fleet-scheduling and Ponytail skills in research/full mode. No additional agent sessions, solvers, application connectors or application tests were run. `fleet_helpers` discovered no project helpers; none were needed for inspection.

## Recommendation

**Adopt bundled `node-service` version `1.0.0`; adapt computation pack `scheduling`.** This preserves the host's shared service, validation/error handling, browser client and dependency-free JavaScript foundation. Extend its shared computation rather than rebuild transport or create a separate browser solver. The host copies the versioned foundation after planning; its actual starter files, lock hashes and license still require inspection after materialization. The catalog is evidence of the intended foundation, not evidence that an application already exists.

The scheduling primitive is a useful bounded-search starting point, but cannot directly satisfy the prepared PB4T contract. It needs substantive domain adaptation, not just input renaming. Required gaps include automatic qualified role staffing, departmental proposal/counterproposal behavior, priority and preference ordering, prior duty, calendar and rolling limits, occurrence/history coverage, and useful explanations on successful negotiation. Reject using the primitive unchanged. Recommend retaining the dependency-free approach for the supplied small fictional cases; reconsider CP-SAT when measured scale or an approved optimization objective warrants it. No performance benchmark establishes a production capacity limit.

## Scope and evidence boundary

The complete synthetic workflow remains required: departmental negotiation across Engineering, Weapons, Combat Systems, Damage Control and Flight Operations; all four named source drill families; shared constraints; alternate allocations; an editable weekly board; one-click schedule optimization; personnel loading heatmaps; complete fictional periodicity reporting; error and recovery behavior; and a reviewable draft. Department labels alone do not demonstrate agents negotiating.

Scope retains primary real-data deferrals UC11-1, DESC11-1 and SCOPE11-6: actual SFTRM/fatigue rules, qualified real crew availability, training history and ship operations are unavailable. Withhold real SFTRM compliance and operational readiness claims while demonstrating every named behavior under the supplied fictional rules. No expected deliverable is deferred. SCH-05 requires human acceptance; a synthetic acknowledgment cannot establish owner approval. Owner approval remains required before delivery/deployment of a specific revision. No such action occurs in research.

All 16 canonical acceptance IDs remain in scope: UC11-1; SCH-01 to 05; DELIVERABLE11-1; DESC11-1 to 03; SUMMARY11-1; SCOPE11-4, -5, -6, -7 and -9. Headings/source spans must retain their packet provenance without becoming invented behavioral requirements. No event evaluation criteria were supplied; engineering checks are proposed, not owner-confirmed operational thresholds.

`inputs/manifest.json` version 1 specifies synthetic mode, no sources, and the two generated artifact paths. Both prepared files now exist, superseding scope's earlier statement that they were pending. `data/synthetic-data.json` contains one baseline record and 22 fully materialized scenarios; `data/README.md` documents the fictional schema and hand-keyed outcomes. Research read these artifacts; it does not independently certify the host's data-validation/freeze process. Preserve and reuse them exactly. Keep `records[].expected` and scenario expectation prose out of solver inputs and runtime answer logic. Embed needed **input** fixture data into self-contained `index.html`, retaining the shared service as computation authority; self-contained sample data does not imply offline/browser-only computation.

## Candidate decisions

| Candidate | Decision | Fit and integration effort | Version/license evidence and limits |
| --- | --- | --- | --- |
| Bundled Node service | **Adopt 1.0.0** | Best fit: same JS language as scheduling primitive and required Node tests; supplied HTTP and browser structure avoids duplicate setup. Domain integration remains substantial. | Catalog explicitly names version, no dependencies, Node 22.19+, `/health`, `/api/invoke`, `server.mjs`, `compute.mjs` and UI files. Catalog calls it AppYard original; no standalone foundation license text or actual starter was available here. License rights and copied revision remain unverified until materialization. |
| Scheduling pack / local `solveSchedule` | **Adapt** | Reuse bounded explicit-candidate search, overlap/rest checks and honest feasibility status concepts. Extend shared backend for the whole fictional contract. Unchanged transport schema, ordering and fatigue math are incompatible. | Source `.fleet/toolkit/scheduling.js` inspected, dependency-free relative import of validation module. No independent module semantic version or license field in toolkit package.json. Host foundation pin/hash will establish copied provenance, not operational validation. |
| Shared validation module | **Adapt** | Existing integer/object/list/uniqueness helpers support input checking. Nested PB4T links, signed historical times, identity uniqueness, policies, roles and recurrence need domain validation. | `.fleet/toolkit/validation.js` is referenced by inspected primitive and catalog; detailed domain compatibility and copied version must be checked during build. No module license evidence established. |
| Prepared PB4T fixtures | **Adopt as synthetic examples and reference cases** | Exact brief-specific schema and baseline oracle cover named workflow better than toolkit examples. Separate examples, expectations and computation; scenario outcomes must drive meaningful checks later. | Fictional policy `FICTIONAL-PB4T-1`, six people, five agents, five drills and three resources in baseline; 22 typical/edge/invalid scenarios. Supplied artifacts, no third-party license grant identified. Data consistency statements are not application verification. |
| Toolkit `example-input.json` / `.fleet/fixtures.json` | **Reject as application dataset or acceptance evidence** | They describe transport/calculation examples, not the PB4T multi-agent, recurrence, prior-duty and recovery workflow. Retain foundation-required example file when host supplies it, but use prepared brief data in the actual UI. | Catalog requires example-input.json in the Node runtime allowlist; fixture identity is `fleet_solve_schedule`. No claim of executing fixture tools. |
| OR-Tools CP-SAT | **Reject for initial bounded prototype; retain upgrade candidate** | Official scheduling examples demonstrate appropriate constraint modeling. Integer minutes fit well; optional assignments and richer objectives could help scale. Adds native dependency/runtime packaging, model translation, deterministic tie-breaking and status mapping. Does not supply SFTRM, PB4T agents, UI, history semantics or approval. | Inspected official docs, release API reporting v9.15 (published 2026-01-12), and tag-specific Apache-2.0 license. Not installed, imported, benchmarked or tested; platform wheels, transitive licenses, lock reproducibility and clean-runtime budgets unverified. |
| Bundled Python service 1.0.0 | **Reject for current recommendation** | Could host CP-SAT if future evidence warrants it, but needs custom computation and a separate language/runtime. Catalog requires Python 3.10+; inspected local `python3` is 3.9.6. | Catalog version verified; actual template/license unmaterialized. Python runtime is not bundled with desktop app. No installation attempted. |
| Custom foundation | **Reject** | No supplied incompatibility with shared service warrants rebuilding it. The self-contained sample-data requirement can coexist with service computation. | Guide permits custom only for concrete incompatibility; no candidate implementation inspected. |
| Other packs: messages, offline, evidence, readiness | **Reject as core computation** | Message extraction, reconciliation, lexical retrieval and dependency analysis do not solve scheduling. Evidence search is useful research tooling only. | Catalog entries inspected; unrelated pack runtime compatibility/licenses not evaluated. |
| Vite, create-fastify, FastAPI full-stack starter | **Reject as additional foundation dependencies** | Catalog reference links explain platform alternatives; there is no missing bundler/framework capability requiring adoption for this service. | Links were not individually inspected; upstream versions, licenses and compatibility remain unverified. Catalog links are leads, not vendored code. |
| Node built-in HTTP and browser platform | **Adopt through foundation** | Avoid additional transport/UI framework dependencies. Domain board, accessible controls, loading, stale state and correction flows remain application work. | Official Node HTTP documentation inspected. Local Node v26.0.0 exceeds catalog minimum; foundation behavior on this runtime remains untested. No production auth, persistence or operational integration is supplied. |

## Concrete scheduling mismatches

Inspection of `.fleet/toolkit/scheduling.js` found:

- Inputs are `windows`, `people`, `requests`, `maxNodes`; requests specify exact `people`, aggregate qualification strings and numeric starts. Prepared inputs use role counts/preferences, personnel arrays, candidate windows, policy, operations, agents and training rules. Aggregated qualification coverage cannot establish distinct staff for counted roles.
- Requests are ordered by number of valid starts then ID, and starts are sorted chronologically. Fixtures require descending priority then ID, supplied window order, and preferred people followed by eligible IDs. A wrapper that ignores these differences would produce incorrect negotiation answers.
- `maxMinutes` caps the entire horizon. It cannot substitute for per-UTC-day or rolling-1440-minute limits. Prior duty is absent; historical intervals, cross-midnight intersections and effective per-person/policy minima need explicit accounting.
- Resources are exclusive string IDs without a resource registry or availability model. Qualification/availability preprocessing omits blackout/resource availability, history and recurrence. Inputs need validation before search, not silent pruning of malformed links.
- Rest uses pairwise spacing. Preserve its hard-boundary intent, but extend it to historical duty. The fixture's exact-60/59-minute cases and daily/rolling exact-cap cases distinguish this from simplistic weekly totals.
- Search is bounded to 24 requests, 100 starts per request, 200 people and up to 200,000 nodes in this primitive. Staffing combinations can multiply the search space. These are source limits, not measured sufficient capacity. The primitive's node counter and candidate prefiltering are not the fixture definition of one complete tested time/person/resource combination.
- Returned statuses are `feasible`, `budget_exhausted`, `infeasible`; assignments are empty on non-feasible outcomes and explanations empty on success. PB4T needs rejected proposals, blocking facts, accepted alternatives, unresolved occurrences and initial conflicts even when the final schedule succeeds. Search conflict observations are not a minimal unsatisfiable core.
- Cancellation checks a supplied signal within synchronous recursion. Actual service stop/cancel responsiveness is unverified; passing a signal alone does not establish event-loop responsiveness or end-to-end cancellation.

The simplest complete reuse is therefore the existing service with an adapted scheduling backend, rather than an unchanged solver wrapped in a board. No separate browser or test-only computational implementation should diverge from that backend.

## Fixture-specific integration risks and options for planning

The baseline independent answer retains DC-1 at 540, CS-1 at 660 and FLT-1 at 3420; moves ENG-1 to 1980 and WPN-1 to 2100. Initially there are two colliding drill pairs, each sharing both person and resource: four conflict facts. Final drill loading is P1=120, P2=60, P3=120, P4=90, P5=90, P6=0 minutes: 480 person-minutes versus 330 elapsed drill minutes. Heatmaps must not confuse those totals or merge prior duty into drill-only loading.

Recurrence is the fictional fixed-window grammar, not SFTRM syntax. Carry-in `[-1440,2880)`, due `[2880,7200)` and future `[7200,11520)` distinguish history-satisfied, scheduled, unmet and pending-future obligations. A future deadline outside the week must remain visible without being misclassified overdue. Already completed CS-A and future CS-C cannot be scheduled as due drills just because their proposals exist. The small impossible due occurrence and known-feasible budget-one case must remain different outcomes.

Qualified substitute, no-TAO, prior-duty rest, exact/over daily cap, exact/over rolling cap, half-open blackout, board edit/recompute and eight invalid-input scenarios are explicit reuse obligations. Boundary arithmetic comes from data/README.md, not invented naval rules. Preserve last valid draft and correction input without letting a stale or invalid draft become reviewable. Persistence technology, reload semantics, output/status spellings, ordered arrays, error precedence and cancellation design are unresolved routine choices for planning. They need precise contracts, not owner clarification in this research phase.

The host's schedule evaluator covers the primitive schema and cannot alone validate role staffing, recurrence, daily/rolling fatigue or negotiation. Public invocation and exact full-object evaluation need to cover the richer PB4T results, including negative and boundary cases. This is an evidence suitability finding, not a test plan. Toolkit calculations/self-tests, source inspection and this document are not application acceptance evidence. Node application tests, independent core evaluation, both-width browser journeys and host-recorded visual reviews/rechecks remain later gates. No compatibility or performance pass is claimed here.

Unknown actual policies and operational objectives are questions for later owner review, not blockers to the supplied complete fictional demonstration. No material missing user decision requires clarification now. Global optimality, real ship connectivity, deployment authority and real SFTRM compliance remain unverified.

## Inspected primary sources and traceability

Public sources were fetched read-only via network on 2026-11-05; no remote systems were authenticated or modified.

- [Original challenge](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11): HTTP 403. Live contents and changes could not be checked. Requirements derive from the supplied packet/scope snapshot, reported captured 2026-11-04, not a successful live-page inspection.
- [OR-Tools scheduling overview](https://developers.google.com/optimization/scheduling): HTTP 200; inspected personnel/resource scheduling overview and employee/job-shop references. Documentation displayed last updated 2024-08-28. No scale benchmark inspected.
- [CP-SAT official guide](https://developers.google.com/optimization/cp/cp_solver): HTTP 200; integer constraint requirement and statuses OPTIMAL, FEASIBLE, INFEASIBLE, MODEL_INVALID, UNKNOWN inspected. Preserve distinction between feasible and proven optimal; UNKNOWN is not infeasible.
- [Official release API](https://api.github.com/repos/google/or-tools/releases/latest) and [v9.15 release](https://github.com/google/or-tools/releases/tag/v9.15): API returned tag v9.15, publication 2026-01-12T15:38:30Z. This is the observed release lead, not a dependency installed or selected for this application.
- [Tag-specific OR-Tools license](https://raw.githubusercontent.com/google/or-tools/v9.15/LICENSE): HTTP 200; Apache License, Version 2.0, January 2004. Transitive redistribution obligations not audited.
- [Node HTTP documentation](https://nodejs.org/api/http.html): HTTP 200; built-in HTTP API inspected. Unversioned documentation showed a newer Node version than the local runtime, so exact API compatibility must be checked against the materialized starter.

Local corpus evidence uses supplied documents as approved research inputs, not domain-certified truth. `fleet_search_evidence` was run lexically with explicit as-of 2026-11-05T23:59:59Z; returned records were not stale. Timestamps below are file mtimes, not independent publication dates. Offsets are zero-based character offsets with exclusive end. Exact excerpts:

| Source ID | File timestamp (UTC) | Character offsets | Exact excerpt |
| --- | --- | --- | --- |
| `.fleet/toolkit/scheduling.js` | 2026-11-05T08:40:52Z | [4405,4434) | `supplied horizon duty budget.` |
| `.fleet/toolkit/scheduling.js` | 2026-11-05T08:40:52Z | [5293,5326) | `No recurrence rules are inferred.` |
| `data/README.md` | 2026-11-05T08:45:42Z | [285,410) | `They are **synthetic, not validated against the real format** and do not establish SFTRM compliance or operational readiness.` |

These excerpts are selected from the inspected files and the lexical retrieval spans; retrieval establishes textual presence, not policy validity.

Source revisions inspected (SHA-256):

- requirements.md: `355a8acd2cebe9dab852914b6bfd63fe78f5148be12e3f1aa4f9f792b29d190c`
- scope.md: `e31c48d093d210dae350c221e8af94f155756dee212c37f8f8db28ae739124f9`
- data/README.md: `c93958c026e43701b7db9dfd9eccddf73f7a1abcfb7e6a3357b04de48d55fea0`
- data/synthetic-data.json: `ed2979c1d2900d570db7b00e9612139563690378b64b81a3bb9d46602e55a710`
- .fleet/toolkit/scheduling.js: `df1516b6be05527c8b4f1a6cbf70df81569e3f57fa69f525ce2144d16bc13ecf`
- .fleet/foundation-catalog.json: `fae7ef33a59fd3d61fb90b72e994f340fddb5781eae7e79893bfd10708fb098f`

This handoff selects reuse candidates and identifies gaps. It does not freeze architecture, define implementation steps, implement behavior or claim that any criterion has passed.
