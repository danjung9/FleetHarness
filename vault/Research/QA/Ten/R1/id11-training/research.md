# PB4T reuse research

Research date: 2026-11-04. Phase: research only. Data boundary: synthetic-only.

The supplied deterministic scheduling primitive is a reasonable **adapt** candidate for the small feasibility demonstration proposed in `scope.md`. The recipe's sole external component, **OR-Tools CP-SAT**, is an **adapt** candidate for a richer model, conditional on source, license, version, runtime and benchmark verification. Neither choice establishes collaborative departmental agents, SFTRM compliance, global optimality, or operator acceptance. These decisions assess reuse suitability; they do not select a final architecture or constitute an implementation plan.

## Evidence boundary and provenance

Read `requirements.md`, `scope.md`, `.fleet/README.md`, `.fleet/quality-contract.md`, `.fleet/packet.json`, all three assigned research/evidence/scheduling skills, and the relevant local scheduling, validation, package and fixture sources. Inspection was static. No solver, dependency, connector, application test or browser journey was executed. No web fetch, install, operational connection, or domain approval occurred. The original requirements and scope remain unchanged.

The external primary-source links supplied by the packet are:

- [Norfolk use case 11](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11): source requirement lead. Only its supplied packet transcription was inspected; the live page and its current revision are unverified.
- [Google OR-Tools scheduling documentation](https://developers.google.com/optimization/scheduling): the recipe's candidate documentation lead. Its contents, current API, license and release compatibility were not inspected. The packet's rationale is not evidence that a particular release implements this application's requirements.

The packet has schemaVersion 1 and challenge.capturedOn `2026-11-04`; no capture time, upstream revision, or independent authenticity evidence is supplied. Local file revisions below are SHA-256 hashes computed during research, not claims of an upstream release. Local sources have inspection date 2026-11-04; their publication/update timestamps are unknown unless stated. `.fleet/manifest.json` has version 1, which is a bundle-format value, not a toolkit software version.

| Source ID | Revision SHA-256 | Timestamp authority |
| --- | --- | --- |
| P, `.fleet/packet.json` | `f25a5f20d452edfbc302d6092e1e77a06258b5bbf1fa5ee1ecc88f7b09f5008e` | challenge capture date only, 2026-11-04 |
| R, `requirements.md` | `933a172fef3a58dd26ae0395d63c2c9048b73390bb2d095e24a1acc25c10a084` | upstream update unknown |
| S, `scope.md` | `664d821515117c3fe781edb42255ce121aa03411fe368573d85afb54ede0c852` | upstream update unknown |
| T, `.fleet/toolkit/scheduling.js` | `df1516b6be05527c8b4f1a6cbf70df81569e3f57fa69f525ce2144d16bc13ecf` | upstream update unknown |
| V, `.fleet/toolkit/validation.js` | `af583a5bd565d77b9b1dfdfa50d17344c2518c5d196aa249139fb552c98b778f` | upstream update unknown |
| F, `.fleet/fixtures.json` | `5f4d1df7318a473d76d8603a025c042c3e56bdfd2f731489d9a9ba3ea2ee507b` | upstream update unknown |
| K, `.fleet/toolkit/package.json` | `f69ed17eea98f49ee075f676bae79df9cb779e54d5887b94d94313d34511170c` | upstream update unknown |
| Q, `.fleet/quality-contract.md` | `863eb65a8890b78c008f96c524d63e776e8c7e26152622649203ae67f8134e4e` | schema version 1; update unknown |

Traceable excerpts supporting the findings:

| Evidence | Exact excerpt and location |
| --- | --- |
| E1, P, `recipe.approach` | “Turn departmental proposals into explicit occurrences and hard constraints. Use a deterministic feasibility solver; an LLM may explain results but cannot relax hard constraints.” |
| E2, P, `recipe.components[0]` | name: “OR-Tools CP-SAT”; rationale: “Evaluate for production-scale scheduling, objectives, recurrence and richer constraints.”; status: “candidate” |
| E3, P, `recipe.limitations[0..1]` | “Included bounded backtracking finds feasibility, not a globally optimal roster.” / “Recurrence and fatigue policy values must be supplied by the owner; the toolkit does not encode SFTRM.” |
| E4, T, line 7 | “Minutes are relative to a caller-defined epoch; budgets apply to the whole supplied horizon.” |
| E5, T, line 31 | `const qualified = r.qualifications.every(q => r.people.some(id => roster.get(id).qualifications.includes(q)));` |
| E6, T, line 90 | `return { status: feasible ? 'feasible' : exhausted ? 'budget_exhausted' : 'infeasible',` |
| E7, T, line 94 | “Feasibility over explicit candidate starts only. Explanations are observed conflicts, not a minimal unsatisfiable core. No recurrence rules are inferred.” |
| E8, F, top-level fields | `"classification": "synthetic"`, `"scope": "toolkit-reference-inputs"` |
| E9, K, complete fields | `"type": "module"`, `"private": true` |
| E10, Q, acceptance-plan section | “Preserve the source meaning: a partial demo of a broad requirement is deferred, with the demonstrated slice described in its reason.” |

`fleet_search_evidence` retrieved E3 from a caller-supplied transcription of P's two limitations: document ID `packet-recipe`, source `.fleet/packet.json#/recipe/limitations`, excerpt offsets [0,182). The required search timestamps were normalized to `2026-11-04T00:00:00Z` from the packet's date solely to invoke the tool; midnight is not a known publication or capture time. The returned `stale: false` is therefore not independent freshness evidence. The first call with a date-only timestamp was rejected; the corrected call returned the quoted match. Lexical retrieval confirms text presence in that supplied excerpt, not policy truth, current applicability or external source inspection. No excluded draft, future-dated material or unrelated synthetic training-note fixture supports these conclusions.

## Reuse decisions

| Candidate/component | Decision and fit | Integration effort and limits | Version/license evidence |
| --- | --- | --- | --- |
| OR-Tools CP-SAT, sole `recipe.components` entry | **Adapt, conditional.** Retain as an option for richer constraints, personnel choice, objectives or scale beyond the small local model. Fit is suggested by E2 only; suitability is unverified. | High relative to local primitive: model translation, runtime packaging, cancellation/status mapping, objective definition and independent constraint checks. No supplied package, benchmark, recurrence implementation or browser binding. Owner policy is still required even with a richer solver. | No pinned release, package, license text, notices or compatibility matrix supplied. Version and license **unverified**; do not assume licensing terms or tested APIs. Documentation URL remains an unchecked lead. |
| Local `solveSchedule` / recipe `fleet_solve_schedule` calculation contract | **Adapt.** Useful bounded feasibility core for explicit candidate starts, fixed people, exclusive resources and supplied rest/budgets (E4 to E7). | Moderate surrounding integration: declared week/epoch, occurrence completeness, meaningful input validation, status presentation, independent result validation and review state. Source has no weekly board, persistence, heatmap, agents or optimization objective. Keep `.fleet/` immutable. Tool availability/runtime access in later phases is separate from static module inspection. | Local revision T identified above; no semantic version or license in K, no license file in supplied inventory. K identifies ESM/private only. Redistribution permission and browser/Node compatibility **unverified**. No execution performed. |
| Local validation helpers imported by scheduling primitive | **Adapt.** Useful integer, collection and identity checks; dependency of T rather than another external recipe candidate. | Low for reuse of existing checks; additional application validation remains substantial. Empty arrays are allowed; empty people/qualifications can yield vacuous qualification coverage, and unknown resource labels are not checked against a resource registry. Domain-required staffing and occurrence counts need explicit semantics. | Revision V; same missing release/license evidence as toolkit. No runtime tests. |
| Scheduling reference fixture | **Adapt as synthetic example only.** F supplies two people, two drill requests, room-a, candidate starts and a node budget. | Low to understand format; substantial extension to represent a weekly board and useful negative/boundary cases. Fixture lacks an epoch/timezone, departmental proposals, owner authority, recurrence history, role headcounts and prior duty. Its 30-minute rest and duty values are demonstration inputs, not naval policy. | Revision F. Synthetic classification is explicit; no standalone fixture license supplied. Representativeness and domain approval unverified. |
| Recipe separation of proposals and hard constraints | **Adopt as a research principle.** E1 fits transparent deconfliction without automatic policy relaxation. | Does not supply agent negotiation, a solver model, a UI or owner policies. Department names cannot substitute for collaborative agents. | Supplied recipe text, revision P; no separate release/dependency required by this principle. |
| Unrelated message extraction, offline synchronization, upload, readiness and evidence fixtures/modules | **Reject for this scheduling slice.** No requirement supports introducing those workflows. | Would add unrelated scope and cannot supply missing operational connectors or policy. Evidence retrieval used here is a research aid, not application verification. | Not evaluated for reuse; licenses, versions and integrations remain unchecked. |

## Concrete model and integration risks

Static source inspection supports the following bounded statements, not tested behavior:

- T accepts up to 200 people, 24 requests and 100 candidate starts per request; default maxNodes is 50,000, bounded at 200,000. These are validation limits, not performance guarantees. Synchronous search may affect responsiveness; no timing or cancellation responsiveness was measured.
- Time is nonnegative integer minutes relative to a caller-defined epoch. Containment must fit within a single operating/availability window (T lines 34 to 38); adjacent windows are not automatically merged. Week/timezone conversion, daylight-saving boundaries and granularity remain application concerns.
- Exact assigned people cover the union of required qualification strings (E5). The primitive does not choose alternate people, count distinct role holders, enforce qualification expiry, or require particular departments. One person can cover several strings; this may not represent distinct required billets.
- Resource IDs are exclusive overlap locks (T line 58), with no capacities greater than one or resource availability registry. Capacity or blocked-resource semantics require an explicit supported model rather than an assumed capability.
- Rest is checked between every pair of supplied assignments; duty sums cover the entire supplied horizon (T lines 64 to 75). Prior commitments outside that set and rolling/daily fatigue policies are not encoded automatically. Synthetic values must stay labeled; owner policy cannot be inferred.
- All supplied requests must be assigned for a feasible result, but the primitive cannot know which mandated occurrences were omitted. It has no recurrence expansion, completion history, deadlines beyond supplied candidates, optional-request priorities or objective function. SCH-04 needs independent occurrence completeness, not just a feasible list.
- Infeasibility concerns only the finite supplied candidate model. `budget_exhausted` is inconclusive. Invalid input/cancellation throw errors rather than returning those three statuses. Failure results have no assignments; successful results have empty explanations (T lines 89 to 94). Preserving a draft, showing original conflicts and retaining a reviewed proposal need separate application behavior.
- A deterministic first feasible allocation is not evidence of optimality, negotiated agreement, fairness or operator approval. Diagnostics are searched conflicts, not a minimal causal proof. No constraint relaxation or operational connector was exercised.

## Acceptance implications and questions for planning

All canonical acceptance IDs remain unverified. The following are research handoffs, not final dispositions or frozen expected outcomes:

| ID and packet provenance | Reuse implication / missing evidence |
| --- | --- |
| UC11-1, `challenge.requirements[0]` | Local feasibility can support a slice. Actual collaborative departmental agents, owner fatigue policy and complete SFTRM coverage are not supplied; retain the full source requirement as a gap. |
| SCH-01, `recipe.acceptance[0]` | Pairwise personnel/resource checks fit the local model. Application evidence must independently inspect assignments, including touching intervals and shared-resource collisions. |
| SCH-02, `recipe.acceptance[1]` | Availability, union qualifications, pairwise rest and horizon budgets have source support. Missing qualifications, unavailable people, rest equality/one-minute shortfall, duty equality/excess and prior commitments need application-level evidence and clear policy boundaries. |
| SCH-03, `recipe.acceptance[2]` | Distinct statuses exist in source. Independently impossible input, exhausted search and malformed input require distinct user outcomes; no runtime result was obtained here. |
| SCH-04, `recipe.acceptance[3]` | No recurrence engine or owner rules supplied. Explicit synthetic occurrences alone cannot establish full periodicity compliance. |
| SCH-05, `recipe.acceptance[4]` | No operator acceptance mechanism or operator review supplied. A local acceptance control would demonstrate interaction only; edits must not preserve stale acceptance. |
| DELIVERABLE11-1, `challenge.expectedDeliverables.lines[0]` | No board, conflict comparison or loading heatmap exists in the primitive. Clarify “optimization”; first feasibility does not satisfy an undefined quality objective. |

The packet has no event evaluation criteria or user criteria. Scope's proposed measurable outcomes remain analyst recommendations. Planning owns literal outcomes, criterion dispositions, test matrix and frozen acceptance/UX contracts; research has created none of those artifacts.

Concrete options are the bounded local feasibility primitive for the synthetic demonstration, or a separately evaluated CP-SAT adaptation when richer assignments/objectives/scale warrant its packaging and modeling cost. Neither removes the need for owner-approved rules. Open questions are: authoritative fatigue and SFTRM revisions/effective dates; recurrence applicability, completion history and week-boundary handling; distinct-role staffing and qualification validity; resource capacity; permissible reallocations; objective and optimality expectations; representative synthetic scale; and accepting operator/review authority. CP-SAT additionally needs verified primary license/release material, a pinned compatible runtime, and representative benchmark evidence before a dependency commitment.

Only this research document was generated. No application was generated or assessed as runnable, tested, reviewer-accepted or operationally validated. No acceptance criterion passed in this phase.
