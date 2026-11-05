# PB4T reuse research

Research date: 2026-11-05. Phase: research only. Recommendation: **adopt `node-service` 1.0.0 and adapt the `scheduling` computation pack**. Extend the host-materialized shared backend; do not rebuild service setup. The pack supplies useful validation and bounded feasibility search, but does not implement the full PB4T domain. This recommendation preserves the entire synthetic workflow in `scope.md`.

## Scope and evidence boundary

Read `requirements.md`, `scope.md`, `.fleet/packet.json`, `.fleet/README.md`, both foundation documents, the quality and solution contracts, `inputs/manifest.json`, prepared data and documentation, and all four assigned skill entrypoints. Applied fleet-research for component decisions, fleet-scheduling for constraint semantics, fleet-evidence for evidence boundaries, and Ponytail full mode for this phase only. `fleet_helpers` returned no helpers; no new helper was necessary. No application, implementation plan, foundation selection artifact or acceptance contracts were created.

The manifest is version 1, synthetic mode, with no attached sources. The prepared fixtures now exist despite the earlier future-tense intake text. Preserve them unchanged. Their invented JSON grammar is **synthetic, not validated against Navy or SFTRM formats**. Data preparation checks are reported by the data agent, not independently rerun application tests in this phase.

Operational deferrals remain as recorded in scope: UC11-1 and SCOPE11-6 require applicable actual SFTRM rules/history; DESC11-1 requires actual crew and operations; SCH-04 remains unverified for actual periodicities; SCH-05 requires real operator acceptance. All associated synthetic behavior is still mandatory. No approval, publication, ship-system connection, connector exercise or operational validation occurred. Owner approval remains required before delivery/deployment.

## Component decisions

| Component | Decision | Evidence, fit and integration effort |
|---|---|---|
| Bundled Node service 1.0.0 | **Adopt** | Catalog declares dependency-free Node 22.19+, HTTP adapter, browser client, validation/error handling and `compute.mjs`. Fits the local browser plus shared computation requirement without another framework. Retain all catalog runtime files, `foundation-lock.json`, scheduling library, validation and example transport file. Use service profile, `/health` and `/api/invoke`. Host copies the version after planning; actual starter source and hashes are not yet available for inspection. |
| Bundled scheduling pack / `solveSchedule` | **Adapt** | Inspected `.fleet/toolkit/scheduling.js` and `validation.js`. Reuse existing validation/search/conflict mechanics through the shared backend; extend the domain model for fixtures. Significant semantic extensions are required, detailed below. Do not edit the protected toolkit. No published semantic pack version or license grant was found in its private package metadata; later foundation lock must establish copied-source provenance. |
| Prepared PB4T fixtures | **Adopt** | Three records (`baseline-week`, `shifted-operations`, `tiny-impossible`) and 20 scenarios with independent expected witnesses. Use exactly each `solverInput` for computation; keep `expected` outside runtime answer generation. Reuse scenarios in samples and later tests. Data are supplied for this build; no separate redistribution license is specified. |
| OR-Tools CP-SAT | **Reject for this bounded prototype; retain as scale-up candidate** | Official scheduling and CP-SAT pages inspected. Integer scheduling, richer constraints and objectives are suitable when a larger horizon or soft objectives warrant them. Official release API reports v9.15, published 2026-01-12; v9.15 LICENSE inspected and identifies Apache License 2.0. Native/Python integration adds dependency and runtime work to a dependency-free Node foundation. No package installed, benchmark run, platform wheel checked or bridge exercised. This is a complexity/fit choice for small finite fixture domains, not a demonstrated performance superiority claim. |
| Bundled Python service 1.0.0 | **Reject for current prototype** | Catalog offers standard-library Python 3.10+ and requires custom computation. No Python-specific computation need justifies replacing the existing JavaScript pack. Python runtime is not supplied by the desktop host; actual Python starter source/license remain unchecked. Useful alternative only if a future CP-SAT integration justifies the change. |
| Custom foundation | **Reject** | No concrete incompatibility with bundled Node service. Self-contained sample inputs inside HTML coexist with backend computation; they do not require a browser-only architecture. |
| Other packs: messages, offline, evidence, readiness | **Reject as primary computation packs** | Catalog functions respectively extract messages, reconcile records, retrieve evidence and analyze dependencies. None solves departmental scheduling. Evidence search was used for supplied-document research only. These packs do not supply schedule persistence or operational integrations. |
| Vite and create-fastify references | **Reject as added starters** | Inspected official Vite guide and create-fastify README. They scaffold/build applications but add no required PB4T behavior beyond the bundled service. Versions, dependency locks and license texts were not evaluated for adoption. Catalog explicitly says they are references, not vendored starter code. |
| Full Stack FastAPI Template reference | **Reject as added starter** | Inspected upstream README: FastAPI, frontend and broader deployment/authentication stack. Unnecessary for the local synthetic service; version and license grant not verified for reuse. It is not the bundled Python template. |
| External LLM/agent framework or calendar connector | **Reject for current scope** | No source requires model calls. Deterministic departmental software agents can negotiate from computed constraints. No credentials or real remote systems are authorized; no connector was tested. Decorative department labels around a central solver would not meet the negotiation requirement. |

Bundled templates are identified by the catalog as “AppYard original”; that statement is provenance, not an independently verified open-source license. The foundation version is catalog-verified 1.0.0, not yet verified against materialized source. No third-party code was installed or copied during research. Local `node --version` returned v26.0.0, meeting the declared minimum; this does not establish clean-runtime compatibility or application execution.

## Scheduling pack compatibility findings

The inspected primitive accepts integer minutes relative to a caller-defined epoch. It supports up to 200 people, 24 requests, 100 windows per collection and 100 candidate starts per request. Request duration is 1 to 10,080 minutes; default search budget is 50,000 and allowed `maxNodes` is 1 to 200,000. It assigns exact supplied people, requires collective qualification coverage, treats shared resources as exclusive, and checks availability, pairwise rest and horizon duty budgets. Assignments are half open. Cancellation throws when an AbortSignal is observed. Search stops at its first feasible result.

These are concrete mismatches with the supplied fixtures, not optional enhancements:

- **Personnel and qualification semantics:** Fixtures have per-role candidate alternatives, role counts, distinct people per role and qualification validity intervals. The primitive has fixed `people` arrays and undated collective qualification strings. Shifted operations must actually move D2 to P3; start-time search alone cannot satisfy the expected negotiation.
- **Operations and resources:** Fixtures contain prohibited families/resources, resource availability, capacities and unit demands, plus per-request execution windows. The primitive only has shared allowed windows and exclusive resource IDs. Do not flatten these into a permissive global interval.
- **Fatigue and history:** Fixtures require fixed duties, prior-horizon rest, daily limits, horizon limits and fixed-offset midnight splitting. Primitive `maxMinutes` applies across its whole horizon, with no daily accounting or fixed-duty history. Fictional values are explicit inputs; missing policy must fail rather than default.
- **Recurrence:** The primitive explicitly infers no recurrence. Fixtures require history-anchored deadlines, all seven due occurrences, three separate DC occurrences, deadline equality and outside-horizon reporting. Missing mandatory occurrences and impossible deadlines must remain visible.
- **Deterministic ordering:** Primitive sorts requests by candidate count then ID, starts numerically and final assignments by time then ID. Fixture witnesses instead use request array, start array and role candidate array order. Naively wrapping fixed-person primitive calls can change the first witness. Planning must retain the fixture convention and specify output ordering explicitly.
- **Budget and statuses:** Primitive rejects zero budget and returns `budget_exhausted`; fixtures deliberately accept zero and expect `exhausted` with zero attempts. Primitive throws for malformed inputs/cancel; fixture behaviors include `invalid_input` and `cancelled`. Planning must define the public envelope, error precedence, budget accounting and status mapping explicitly. Renaming a status alone does not resolve zero-attempt semantics. Never map exhausted search to infeasibility.
- **Negotiation and review:** No departmental proposals, objections, counterproposals, editable board, heatmap, export, revision review or persistence exist in the primitive. These remain application requirements. Counterproposals must follow actual candidate/constraint results. Edits invalidate simulated review; failed/cancelled work preserves the previous valid draft and cannot replace it with stale results.

The small fixture domains support a bounded deterministic search as a reasonable reuse recommendation: data documentation reports 128 baseline joint candidates and 256 shifted candidates, with 8 and 12 feasible witnesses respectively, and one impossible combination for the tiny case. These are data-agent preparation observations, not benchmarks independently reproduced here. Bounded search is feasibility over explicit candidates, never proof of global roster optimality. Revisit CP-SAT if realistic size/objectives exceed a measured interactive budget; no measured upgrade threshold exists yet.

## Fixture integration risks and observable anchors

Embed necessary fixture **inputs** in the delivered `public/index.html` without fetching local data files. The foundation's browser client can still invoke the shared backend. UI and evaluator must use the same computation; do not build a second browser solver or package expected answers as output logic. The toolkit `example-input.json` is transport documentation, not a replacement for the prepared weekly packages.

The fixtures use a fixed -05:00 offset for November 9 to 16, 2026, 60-minute slots and half-open intervals. Preserve explicit instants and local-calendar accounting; do not silently infer browser timezone or daylight-saving behavior. Equality at rest, daily budget, qualification finish and occurrence deadline is meaningful.

Independent fixture anchors for later planning include three original collisions (P1 D1/D2, P2 D1/D4, SIM D2/D3), OP1 preventing early flight quarters, seven due occurrences and 540 training person-minutes. Baseline person loads are 120/240/60/60/60/0 for P1 to P6; shifted operations changes P1 to 60 and P3 to 120. These are declared expected values, not research test results. Retain invalid, infeasible, exhaustion, changed-operation, expiry, budget-boundary, cancellation and correction scenarios. Runtime responses must compute their outputs from inputs, not select these values by record ID.

## Primary public sources inspected

All requests below were read-only HTTP retrievals on 2026-11-05. Public pages are mutable; document inspection does not establish an installed dependency or integration.

- [Challenge 11](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11): retrieval returned HTTP 403. Use the supplied packet's captured interpretation (scope records capture date 2026-11-04); no independently inspected live challenge text or official SFTRM register is claimed.
- [OR-Tools scheduling](https://developers.google.com/optimization/scheduling) and [CP-SAT solver](https://developers.google.com/optimization/cp/cp_solver): HTTP 200. Documentation describes integer constraints and distinct FEASIBLE, INFEASIBLE, MODEL_INVALID and UNKNOWN statuses. UNKNOWN is not proof of infeasibility. These pages do not supply PB4T policies or automatically expand SFTRM recurrence.
- [Official release metadata](https://api.github.com/repos/google/or-tools/releases/latest): HTTP 200, tag v9.15, published 2026-01-12T15:38:30Z. [Versioned license](https://raw.githubusercontent.com/google/or-tools/v9.15/LICENSE): HTTP 200, Apache License 2.0. Transitive binary licenses, wheel availability, installation and Node integration remain unverified.
- [Node HTTP documentation](https://nodejs.org/api/http.html): HTTP 200, confirms standard HTTP platform capability; current page identified v26.13.0, distinct from installed v26.0.0 and foundation minimum 22.19. No specific foundation adapter code was inspected yet.
- [Vite guide](https://vite.dev/guide/), [create-fastify README](https://raw.githubusercontent.com/fastify/create-fastify/main/README.md), [Full Stack FastAPI README](https://raw.githubusercontent.com/fastapi/full-stack-fastapi-template/master/README.md): HTTP 200; informational alternatives only, no installation/version pin or adoption license review.
- [Python http.server documentation](https://docs.python.org/3/library/http.server.html): HTTP 200; documents basic local HTTP serving and explicitly cautions against production use. No operational deployment suitability follows from the bundled service recommendation.

## Handoff limits and unresolved integration questions

No material user decision blocks research. The synthetic policy and deterministic fixture conventions are supplied, and scope already withholds operational claims. Do not request actual crew data or approve invented policies as real SFTRM rules.

Planning must resolve the public status/budget/order protocol, departmental negotiation behavior, cancellation transport/late-result handling, and local persistence/export details within the existing scope. It must carry every canonical ID: UC11-1, SCH-01 to 05, DELIVERABLE11-1, DESC11-1 to 3, SUMMARY11-1, SCOPE11-4 to 7 and SCOPE11-9. Source headings and attribution remain traceable without inventing functional requirements. Preserve primary deferrals and their complete synthetic coverage.

A raw toolkit schedule evaluator can independently check simple fixed-person interval constraints, but cannot establish expiry, recurrence, daily fatigue, negotiation or review behavior. Later contracts need corresponding meaningful computational and browser evidence. Real UI and application tests, host clean-runtime capability checks and desktop/narrow visual review remain future work. No application tests, performance benchmark, browser journey, accessibility review or human acceptance passed in research. This document recommends components; it does not freeze architecture or implementation steps.

## Supplied-document evidence ledger

`fleet_search_evidence` retrieved the excerpts below for queries `synthetic` and `budget`, as of 2026-11-05T23:59:59Z. The corpus used supplied files approved for this research; approval here means inclusion in the research corpus, not policy approval. Retrieval timestamps were normalized to the filesystem modification date at 00:00:00Z to satisfy the tool timestamp grammar; actual filesystem timestamps are retained below and are not claimed publication dates. Results were not stale under the tool default 90-day window. Offsets are zero-based Unicode string slices, end excluded. Lexical matching is not factual or operational validation.

Source ID/path: `.fleet/foundation-guide.md`; revision SHA-256 `a7f6a61e9d7fa3f8d3389afe4270dce03f2288066318d7ffb37cd0236cdf3474`; filesystem timestamp `2026-11-05T07:56:09+00:00`; excerpt `[2122,2522)`:

```text
ation primitives, not completed challenge applications. example-input.json is a synthetic toolkit transport example; use the prepared brief data for the actual application and acceptance tests. Workflow/offline still need actual transitions, durable storage and synchronization; cyber only gets evidence search; governance/physics/custom fail explicitly until the agent implements the planned core. D
```

Source ID/path: `data/README.md`; revision SHA-256 `a15113efb4a8e327f256af22783af45a8fb98755588c371ae8641f0c4457a8a0`; filesystem timestamp `2026-11-05T08:01:24+00:00`; excerpt `[0,322)`:

```text
# Synthetic PB4T data handoff

All records are fictional and deterministic. No records were attached (`inputs/manifest.json` has no sources), and no operational system or external service was contacted. The fictional ship, identities, qualifications, history, availability and policy values were created for this brief. Th
```

Source ID/path: `data/README.md`; revision SHA-256 `a15113efb4a8e327f256af22783af45a8fb98755588c371ae8641f0c4457a8a0`; filesystem timestamp `2026-11-05T08:01:24+00:00`; excerpt `[4301,4701)`:

```text
uests, starts, persons (strings describing deterministic array order) |
| searchBudget | nonnegative integer number: maximum candidate assignment attempts; zero deliberately permits no attempt |

Each request contains `id`, `departmentId`, `family`, `requirementId`, `occurrenceId`, `preferredStart` (strings), `durationMinutes`, `priority` (numbers), `allowedStartWindows` (array of start/end timest
```

Source ID/path: `scope.md`; revision SHA-256 `63de9ad6d26668e80c68b6b7ada2bf9017d3f47ec848b5790984cef6fb6fdaef`; filesystem timestamp `2026-11-05T07:57:45+00:00`; excerpt `[107,507)`:

```text
putational and interactive behaviors must still be demonstrated end to end with synthetic data. A deferred disposition must not be changed merely because the demonstration passes. Full original wording and provenance appear in the inventory below.

| Canonical ID | Concrete dependency and withheld action | Synthetic workflow still required |
|---|---|---|
| UC11-1 | real-data: Applicable SFTRM rul
```

Preserved fixture SHA-256: `data/synthetic-data.json` = `2672e1271ccdbdbac6cb22c4633fd4787a7a521f67f7c75760015b5aeedc93c6`; `data/README.md` = `a15113efb4a8e327f256af22783af45a8fb98755588c371ae8641f0c4457a8a0`; `inputs/manifest.json` = `fcfe1130245c287cf29d0dc10ac8031ecbb516f0f23b2c0d6ea4e08438e2adc2`. These hashes identify inspected inputs; they are not application verification.
