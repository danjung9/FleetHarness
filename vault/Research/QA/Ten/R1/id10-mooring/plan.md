# Implementation plan: synthetic mooring scenario review

Planning date: 2026-11-04. Apply fleet-planning, fleet-ux, fleet-evidence and fleet-physics. Inputs read: requirements.md, scope.md, research.md, .fleet/README.md, .fleet/packet.json and .fleet/quality-contract.md. Architecture was published with fleet_system_design before these documents. This is planning only; no application or tests have been implemented or run.

## Scope and authority

Build a dependency-free local synthetic scenario intake and review application for bridge-team reviewers. The smallest complete workflow is: load or enter a synthetic scenario, arrange its illustrative layout, enter explicitly unit-tagged mock observations, save valid intake, inspect committed inputs and missing authority, deliberately record synthetic review, then reload or export that committed review. Save/discard recovery prevents review from applying to different content.

Engineering assessment is unavailable in every state. Do not implement MSI, force calculations, unit conversions, line/bollard limits, safety margins, tug allocation, mooring sequences, gust thresholds, NSTM compliance or safe/unsafe decisions. No mathematical uncertainty estimate is possible; show unknown uncertainty and its reason. Zero input is distinct from absent input; unknown engineering output is never zero. No model-assisted explanation or AI integration is needed: use deterministic copy explaining missing dependencies. Future model-assisted interpretation must remain separate from approved deterministic calculations and may never make the operational decision.

The source snapshot is packet schemaVersion 1, capturedOn 2026-11-04, challenge 10, https://cdao.hackathon.maximus.com/event/norfolk/use-cases/10. Upstream revision and publication timestamp are unknown; source link was not fetched. Original requirements remain unchanged. Research S1 to S8 retain exact excerpts and locations. Source statements such as recipe.limitations[0], “No MSI formula, craft limit or mooring model is invented or implemented without an authoritative input.” constrain this plan; they supply no model.

## Criterion dispositions and provenance

The following are the canonical packet IDs; no alias IDs or additional acceptance criteria are introduced. Original full requirement text is in packet.acceptance and reproduced in test-matrix.md. Source evaluationCriteria and userScope.criteria are empty. The planner's literal UI outcomes are synthetic behavior expectations, not event-published criteria or independent SME ground truth.

| ID | Provenance kind / original ID / path | Disposition |
| --- | --- | --- |
| UC10-1 | requirement / UC10-1 / challenge.requirements[0] | Deferred: missing authoritative physics and optimization basis. Synthetic selection/layout is a partial demonstration. |
| PHY-01 | recipe / PHY-01 / recipe.acceptance[0] | Deferred: no signed reference corpus, equations or tolerances. |
| PHY-02 | recipe / PHY-02 / recipe.acceptance[1] | Deferred: approved conversions, physical bounds and supported craft definitions absent. Completeness validation remains a partial demonstration. |
| PHY-03 | recipe / PHY-03 / recipe.acceptance[2] | Implemented behavior planned: preserve authority through a blocked engineering decision, offline uncertainty display and explicit revision-specific synthetic review. No qualification, identity or operational approval is asserted. |
| DELIVERABLE10-1 | deliverable / DELIVERABLE10-1 / challenge.expectedDeliverables.lines[0] | Deferred: no approved sheet, rationale basis, margin model or approval process. A synthetic summary/layout, walkthrough and brief are partial deliverables. |

PHY-03 preserves qualified human authority by refusing engineering decisions: acknowledgement cannot authorize a mooring evolution. Actual reviewer qualification and any later operational approval must be assessed by humans outside this prototype. This does not establish an operational approval workflow. All other criteria remain unverified even if prototype checks pass; requirementsMet must remain false.

## Application files and dependencies

- index.html: complete inline CSS, inline SVG and classic JavaScript. Opens directly via file URL without build, fetch, imports, external files, CDNs, fonts or network access.
- core.cjs: Node-compatible exported pure application functions for validation, serialization, review transitions and summary generation. Keep exactly the same pure core inside a dedicated classic script in index.html using a guarded CommonJS export. The UI calls that inline core, never reimplements its rules.
- core.test.cjs: Node built-in tests exercising actual application functions and the browser inline core through Node vm. Read the inline script, execute it in a constrained sandbox and run identical behavioral fixtures against both implementations; compare actual results. Source-string equality alone is not sufficient.
- README.md: opening instructions, synthetic demo walkthrough, test command, storage/export behavior and explicit deferred requirements.
- path-to-fleet.md: one-page fielding brief with required engineering inputs, human gates and integration/security gaps.
- verification.md: later phase records actual results and limitations. Host owns test-report.json, hashes and screenshots/traces; do not create or modify host evidence.

No bundled toolkit code is required. Research's structural-validation concepts may inform original application code; avoid copying modules with unverified redistribution rights. No package install, server, external physics, AI, identity, hydrographic connector or operational integration. The authority gate is a missing dependency, not a simulated engineering service.

## Data contract

Use a version 1 local envelope with draft, saved snapshot, saved revision integer and reviewedRevision nullable. Draft and saved content are separate deep copies. A saved snapshot contains scenario name, classification synthetic, craft choice, pier choice, line choice, raw observations, wind/gust/current raw strings and declared units, current phase, and ship diagram x/y positions. Confirmed numeric values are derived only after structural validation and retained alongside raw strings; no natural-language parsing or engineering inference.

Required synthetic catalog: Demo craft A, Demo pier 1, Demo line A. Stored values may use stable internal keys but visible text must match the frozen summary. Unsupported stored selections are rejected explicitly; synthetic catalog membership makes no claim about real craft support. Sample is Synthetic berth Alpha with wind 12 m/s, gust 15 m/s, current 0.5 m/s, ebb; raw observation text explicitly says synthetic and direction convention unconfirmed. Unit selects offer m/s and an explicitly unsupported knots option; knots is rejected with a message to enter explicitly supplied m/s data, never automatically converted. Current phase is ebb or flood; directions are unconfirmed and engineering use blocked. Do not infer a vector from ebb/flood. No displacement, draft, depth or ratings are needed without a supplied model.

Wind, gust and current speed require nonempty finite non-negative decimal numbers. Zero and decimals are valid intake; negative values, NaN, Infinity, overflow, blanks and malformed strings are rejected. These are speed representation constraints, not craft operating limits; no maximum physical value or gust/wind relation is invented. Scenario name is trimmed nonempty text, maximum 120 characters; raw observation maximum 2000 characters. These are UI storage limits only. Render user text as text, never HTML. Reject malformed persisted envelope, unsupported schema and mismatched reviewed revision.

Layout is an illustrative inline SVG pier, ship, one bollard and line endpoint. Ship moves by pointer or x/y numeric controls, 0 to 100 inclusive in display percentage coordinates; these bounds constrain drawing only. No scale, real berth coordinates or physical line geometry is asserted. Saved summary layout reflects saved positions; editor layout reflects draft. label both distinctly.

Revision starts at 1 on first successful save. Saving semantically changed validated content increments revision and clears review; saving unchanged content is idempotent. Review requires valid saved snapshot, no dirty draft and checked synthetic-only acknowledgement. Editing a reviewed snapshot shows a blocked current review state; the previous review remains attached only to its saved revision. Discard restores that saved content and review. Saving changed content requires a fresh checkbox and review action. Reload restores both committed and unfinished state. Export always uses the committed snapshot and reviewedRevision; unsaved content is excluded with a visible explanation.

## UX contract and selectors

Use a calm two-panel workspace with synthetic/unvalidated banner, intake and layout, then saved review. All engineering outputs explicitly say unavailable; the primary next action remains clear. Follow ux-spec.json for screen states, persistence, recovery, keyboard and narrow layouts. Never expose technical record JSON as the main interface.

Frozen selectors: #load-sample, #scenario-name, #wind-speed, #save-scenario, #save-status, #draft-status, #scenario-summary, #environment-summary, #engineering-status, #uncertainty, #approval-status, #review-ack, #record-review, #review-status, #discard-changes, #validation-error, #export-summary. Each identifies exactly one element. Assertion elements must contain only the literal text specified in acceptance-plan.json, without extra labels or timestamps. Additional labeled controls: #craft, #pier, #line-type, #raw-observations, #gust-speed, #current-speed, #wind-unit, #gust-unit, #current-unit, #current-phase, #ship-x, #ship-y. Use #replace-example-confirm and #reset-storage for deliberate recovery controls when applicable.

Load synthetic example fills a draft, never silently saves or reviews. Loading over existing work opens an inline replacement confirmation; first load in a fresh journey requires no confirmation. Save validates and persists before saying Saved. Review button is disabled with visible reasons until eligible; the checkbox text states review is synthetic-only and grants no operational approval. Dirty state blocks review even if prior checkbox was checked. Discard changes is a deliberate action restoring saved content, no implicit discard during navigation. Do not add approval buttons. Summary download has no approved-sheet title and includes missing engineering outputs, raw and confirmed inputs, illustrative layout positions and review scope.

## Ordered implementation tasks

1. Implement pure structural validation, authority status, versioned persistence codec, summary formatting and immutable save/discard/review state transitions. Add application Node cases from test-matrix.md.
2. Build self-contained accessible intake and layout with synthetic sample, labeled controls, raw/confirmed values and visible dirty state. Wire all UI behavior to the inline core.
3. Add committed summary, authority/uncertainty display, strict review eligibility and revision-bound acknowledgement. Implement local storage restoration and failure warning without false persistence claims.
4. Add marked committed-summary export, deliberate replacement/reset recovery, keyboard position controls and responsive layout. Keep all functionality offline with no network request.
5. Execute Node tests including behavioral parity for inline core; write README walkthrough and one-page path-to-fleet.md describing missing engineering/operational work. Do not modify frozen plans.
6. Hand to host browser verification for all three frozen journeys in fresh desktop and narrow contexts. Host validates/replays; one bounded implementation repair may address failures. Record separate generated, runnable, tested, accepted and operational states.

## Failure and human gates

Missing/unsupported inputs keep draft intact and focus first invalid field. No saved snapshot means review/export unavailable with explanations. Dirty content blocks review. Storage errors show a persistent warning and preserve in-memory work; corrupt envelopes never create fake reviewed scenarios. DOM text escaping and strict restore validation prevent supplied strings becoming executable content. Local storage is neither encrypted nor authenticated and may be unavailable under some file-origin browser policies; describe limitations honestly.

Offline operation requires opening the delivered file without network, plus host browser interaction evidence. Frozen declarative steps cannot toggle network; no-network inspection and a disconnected human opening check remain additional verification, never inferred from a checkbox. Human review must assess readability, focus, drag alternatives and whether the frozen outcomes meaningfully preserve authority. Browser checks cannot establish reviewer qualification or engineering validity.

A calculation-bearing follow-on requires a new planning run: approved NSTM revision/sections, licensed source equations, units/conversions and direction conventions, valid operating domains and craft/line/bollard limits, independent SME-signed boundary examples/tolerances, uncertainty treatment, tug capability/optimization objective, line-sequencing/gust rules, approved sheet schema and reviewer approval process. Identity assurance, retention policy, accessibility assessment, security review, government integration and operational validation are separate gates. No operational connection, deployment or publication is authorized here.
