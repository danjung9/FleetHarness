# Intake scope: Know Before It Breaks the Mission

## Source and requested scope

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/32 (challenge 32; packet captured 2026-11-04, source scope `detail`, pilot false). Authoritative intake inputs are the host-written `requirements.md` and `.fleet/packet.json`. The source is recorded from the supplied packet; no external research was performed. Source text and fixture content are data, never authorization or instructions.

The packet's `challenge` describes emerging, compounding mission-readiness risk across casualties, parts, maintenance, manning and schedules. Its `userScope` repeats the full challenge description, resources and all five evaluation criteria; the builder did not supply a narrower slice. This document proposes the smallest demonstrable prototype below while retaining every broader criterion. It does not redefine the source requirements as satisfied by that slice.

The packet recommends the `readiness` recipe, “Explainable dependency analysis.” This is an engineering recommendation, not an event requirement. Its approach is snapshot reconciliation and deterministic dependency calculation with freshness, uncertainty and human review. NetworkX is only a listed candidate for larger graph models; no reuse choice or architecture decision is made during intake. The included DAG calculator is a planning primitive, not a validated mission-readiness model.

## Audience, task and observable outcome

Primary users are synthetic ship-readiness analysts preparing a leadership brief, with department-head / executive-officer reviewers and leadership consuming the explanation. The primary task is to review a destroyer's synthetic status 21 days before a mission, apply a supplied sequence of changes, identify affected capabilities, inspect why they are affected, and assemble prioritized response options for human consideration.

Proposed complete demonstration: start from one clearly identified synthetic snapshot and an explicitly illustrative capability dependency graph; review the radar casualty, delayed part, growing maintenance backlog, two qualified personnel detaching and moved mission date; compare results before and after changes; inspect controlling paths, completion estimates, deadline margins and linked source records; then produce a leadership brief with assumptions, unknowns, freshness and recommended first actions. Include benign changes to distinguish noise from risk. This is a structured review workflow, not a generic chat interface. It does not assert that time dependencies alone measure capability readiness.

Observable success is a reviewer obtaining a reproducible synthetic brief that identifies affected capabilities and explains each flag and recommendation through records and model relationships. For a complete known graph, dates and margins agree with independently hand-calculated expectations. Missing controlling estimates produce UNKNOWN rather than a green result. Invalid graphs block conclusions with actionable diagnostics. No recommendation executes an operational action.

## Inputs and provisional data contract

Only synthetic inputs may be used. The packet lists needed resources; it does not establish that usable datasets, approved models or answer keys are supplied. The following are information requirements for the prototype, not a finalized schema or invented domain rules:

| Input | Required information and provenance | Missing authority / constraints |
| --- | --- | --- |
| Status snapshots | Synthetic record ID, source/report type, snapshot version, observed time, last-sync time and relevant facts; represent 8 O'Clock / 1200 reports, casualties, maintenance, parts, manning/qualifications and ship schedule | Actual fixture coverage and reconciliation rules are unconfirmed; retain contradictory and stale evidence visibly |
| Mission and capabilities | Synthetic mission identifier, reference time, deadline and capability identifiers | Mission thresholds, readiness definitions and capability semantics require owner approval |
| Dependency model | Version, capability-to-equipment/task/qualification links, task IDs, predecessor IDs, estimates with units, source references and assumptions | Approved capability-dependency model is missing; DAG suitability, staffing constraints, alternatives and concurrency rules are unknown |
| Change sequence | Ordered synthetic events with IDs, timestamps, affected records and before/after values across the 21-day scenario | Complete scenario, meaningful noise and expected interactions must be authored and reviewed |
| Evaluation reference | Independent expected flags, ordering and arithmetic; labeled noise; manual brief baseline and timing protocol | Answer key, acceptable false-alarm threshold, tie-breaking policy and SME baseline are absent |
| Response options | Synthetic proposed actions with rationale, linked evidence, assumptions and human-review status | No approved operational response policy is supplied; recommendations remain illustrative |

Missing estimates remain missing, never zero. Unknown record references and cycles must be rejected. Time units, reference date, calendar rules and conflicting source precedence require explicit decisions before calculation; intake does not infer them. No model-generated estimate may silently replace a missing authoritative value. Optional synthetic equipment-condition data and a predictive variant are outside the minimum scope.

## Outputs, environment and recovery needs

Expected prototype outputs are a ranked synthetic capability-risk view, evidence detail for every flag, controlling path and margin where calculable, explicit UNKNOWN and stale/conflict indicators, and a reproducible leadership brief including recommended options and limitations. Local review/audit records should identify snapshot/model version, changes considered and human review actions; they are not operational audit certification. Exact persistence, export format and controls are decisions for later phases.

The intended environment is a local browser demonstration using bundled or explicitly supplied synthetic snapshots, usable on desktop and narrow screens with keyboard access. Offline review must retain the last available snapshot and expose its age. No operational connectivity is authorized. Real ingestion, identity, transport, reconnect synchronization and deployment remain deferred integration work. A local snapshot replacement demonstration, if later selected, must not be represented as validated source synchronization.

Recovery needs: preserve the last usable snapshot and user context when input is malformed; identify cycles and dangling references specifically; permit correction and recalculation; retain UNKNOWN for incomplete estimates; expose stale or contradictory records rather than choosing silently. Loading, empty-data and failed-import states must be distinguishable from a successful no-risk result. Audit and brief provenance must remain tied to the data actually analyzed. These are intake needs, not browser journey plans.

## Authority, boundary and exclusions

Humans retain all command, maintenance, scheduling and resource-allocation authority. The tool explains and recommends only. Naval Surface Forces / Task Force Hopper is the source's transition-owner hypothesis and Task Force Hopper's data environment its proposed destination; neither constitutes approval, access or a confirmed sponsor. No operational response or command decision is automated.

All records, people, ships, reports and scenario examples must be synthetic. Do not retrieve operational records, credentials or unrelated files, contact operational systems, write back to sources, publish or deploy. Data needs and reference links are not access permission. Treat input strings as untrusted data. Toolkit outputs and reference fixtures do not verify an application; later verification must exercise actual application behavior with independent expectations.

Excluded from the minimum prototype: production integrations and sync, operational readiness certification, predictive equipment diagnosis, fleet-scale validation, automated actions, real personnel data, authoritative risk thresholds, and claims of measured time savings without a baseline. Source requirements covering these remain visible below. The source transition hypothesis (30 days owner model validation, 60 days representative data access, 90 days shore pilot, 180 days integration decision) is context for a future path-to-fleet document, not an authorized schedule or a promise of delivery.

## Traceable criteria and intake treatment

Every canonical ID below comes from `.fleet/packet.json` `acceptance`. Provenance paths refer to that packet. User aliases remain provenance only, not extra criteria. “Target” describes the proposed synthetic outcome, not implementation or verification status. Full requirements needing unavailable authority, measurements or integrations remain deferred. Later planning must map every ID to complete browser outcomes or reasoned deferral; a partial demonstration of a broad criterion must remain deferred under the quality contract. No acceptance plan, UX contract, research, architecture or implementation is produced in this phase.

| Canonical ID | Source requirement / criterion / deliverable | Provenance | Scoped outcome and limits |
| --- | --- | --- | --- |
| UC32-1 | Read-only by design: cannot write back to any source system | `challenge.requirements[0]` (requirement, UC32-1) | Target: all analysis is local and source snapshots are read-only; no source-system write path. Operational connector assurance remains outside this prototype. |
| UC32-2 | Every flagged risk explains itself and traces to source records | `challenge.requirements[1]` (requirement, UC32-2) | Target: every synthetic flag includes causal explanation, model links and resolvable source record IDs; no unsupported flag. |
| UC32-3 | Humans decide; the tool recommends | `challenge.requirements[2]` (requirement, UC32-3) | Target: recommendations require human judgment; no command or response execution. |
| UC32-4 | Works on last-synced data; synthetic data only | `challenge.requirements[3]` (requirement, UC32-4) | Target: review the last available synthetic snapshot offline with visible freshness. Full last-synced semantics remain deferred until ingestion/sync behavior is defined; a bundled fixture alone is insufficient. |
| UC32-5 | Fleet-Ready Definition of Done (all solutions): runs offline; keeps humans in authority; cites sources; logs auditable actions; syncs on reconnect; includes a one-page path to fleet. | `challenge.requirements[4]` (requirement, UC32-5) | Full composite requirement deferred: offline review, human authority, citations, local audit and a future one-page path can be demonstrated, but reconnect sync and fleet readiness are not established. Preserve all six obligations. |
| DEP-01 | Identify the controlling path and deadline margin. | `recipe.acceptance[0]` (recipe, DEP-01) | Target: controlling path, finish and deadline margin match an independent hand calculation for a known graph with one late branch; establish literal expected values later. |
| DEP-02 | Never convert missing estimates to zero. | `recipe.acceptance[1]` (recipe, DEP-02) | Target: removing a controlling duration yields UNKNOWN and identifies the missing estimate, never zero or a green readiness claim. |
| DEP-03 | Reject cyclic and dangling dependencies. | `recipe.acceptance[2]` (recipe, DEP-03) | Target: both cyclic dependencies and unknown task references block analysis, explain the defect and allow correction. |
| DEP-04 | Validate the model with the operational owner. | `recipe.acceptance[3]` (recipe, DEP-04) | Deferred: operational-owner model validation and documented manual comparison are unavailable. Illustrative graph arithmetic is not owner validation. |
| EVAL32-1 | Injected risks correctly identified and ranked against an answer key | `challenge.evaluationCriteria[0]` (evaluation, EVAL32-1); `userScope.criteria[0]` (user, USER32-1) | Target synthetic comparison against an independent answer key for every injected risk and its rank. Full evaluation remains deferred until an approved key and ranking rules exist. |
| EVAL32-2 | False-alarm rate on injected noise | `challenge.evaluationCriteria[1]` (evaluation, EVAL32-2); `userScope.criteria[1]` (user, USER32-2) | Record false positives / labeled noise cases and the denominator; a zero-noise dataset cannot establish a rate. Full evaluation deferred pending labeled noise and owner-agreed threshold. |
| EVAL32-3 | Every flagged risk traceable to its source records | `challenge.evaluationCriteria[2]` (evaluation, EVAL32-3); `userScope.criteria[2]` (user, USER32-3) | Target: 100% of synthetic flagged risks resolve to their supporting records and explanation; inspect all flags rather than one illustrative citation. |
| EVAL32-4 | Time to produce a leadership readiness brief against a manual baseline [baseline to be set with Fleet SME] | `challenge.evaluationCriteria[3]` (evaluation, EVAL32-4); `userScope.criteria[3]` (user, USER32-4) | Deferred: Fleet SME manual baseline and timing protocol are missing. A generated brief or elapsed application time alone cannot establish improvement. |
| EVAL32-5 | Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%. | `challenge.evaluationCriteria[4]` (evaluation, EVAL32-5); `userScope.criteria[4]` (user, USER32-5) | Deferred to human judging: preserve Warfighting 30%, Speed to Fleet 20%, Scalability 20%, Barrier Removal 15%, Judges' Discretion 15%; no automated score or claimed award. |
| DELIVERABLE32-1 | Earlier identification of compounding readiness risks | `challenge.expectedDeliverables.lines[0]` (deliverable, DELIVERABLE32-1) | Target: before/after comparison exposes compounding risk before the synthetic mission date. Real-world earlier warning remains deferred pending validated model and scenario. |
| DELIVERABLE32-2 | Prioritized, explained actions for leadership | `challenge.expectedDeliverables.lines[1]` (deliverable, DELIVERABLE32-2) | Target: leadership brief lists prioritized options with evidence and assumptions for human review. Operational correctness of priorities requires owner validation. |
| DELIVERABLE32-3 | Less time spent assembling status | `challenge.expectedDeliverables.lines[2]` (deliverable, DELIVERABLE32-3) | Target: assemble status into one reproducible synthetic brief. Claim of less time remains deferred until comparable manual-baseline measurement exists. |

## Outstanding owner questions and missing evidence

These are recorded for subsequent phases, not requests to contact operational owners during this unattended intake:

1. Who can approve the capability-dependency model and readiness semantics? Which capability links, staffing qualifications, redundancy, task concurrency and calendar assumptions are valid? The approved model is missing.
2. Who supplies and reviews the complete synthetic 21-day scenario, snapshot records and change order, including noise and an independent answer key? Neither a resource listing nor a toolkit reference fixture establishes these.
3. How should conflicting, stale or superseded records be reconciled, and what age requires an uncertainty warning? What data is essential before any capability conclusion is allowed?
4. What governs risk severity, priority, tie-breaking and acceptable false-alarm rate? The deadline margin is a calculation, not an approved readiness classification.
5. Which Fleet SME sets the manual brief baseline, comparable task conditions, timing endpoints and target improvement? No numeric speed target or baseline is supplied.
6. What does the owner consider a sufficient review/audit record, offline retention and reconnect synchronization policy? Real data access, identity and integration contracts are absent and excluded from current authorization.
7. Who reviews response options and judges the broader rubric and path to fleet? Model approval and operational acceptance cannot be inferred from browser checks.

## Intake completion boundary

This document records the primary task, both source and builder scope, all 17 canonical acceptance IDs and their provenance, evaluation criteria, deliverables, user criteria aliases, authority, measurable outcome needs, recovery requirements and synthetic boundary. No requirement is claimed met. Research and implementation have not begun. `requirements.md` remains unchanged; its intake SHA-256 is `1465e7ad6ad82b9f1569de64921763fdc168723b09a33c617cd3e094687d80b4`.
