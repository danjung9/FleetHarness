# Implementation plan: synthetic dependency review

Planning date: 2026-11-04. Phase boundary: planning only. The assigned fleet-planning, fleet-ux, fleet-evidence and fleet-readiness skills were read and applied. Architecture was published with fleet_system_design before the remaining planning artifacts. Inputs: requirements.md, scope.md, research.md, .fleet/README.md, .fleet/packet.json and .fleet/quality-contract.md. Do not implement during this phase.

## Smallest complete workflow

An analyst loads an illustrative synthetic snapshot for a mission 21 days away, computes two dependency targets, applies five ordered synthetic changes, inspects all late-target evidence, records an advisory review, saves the local session and exports a reproducible brief. The analyst can correct missing estimates and invalid dependency structures without losing the note or mistaking stale results for current analysis. There is no network transport, source writeback, decision execution, model service or operational data.

`acceptance-plan.json` defines six journeys and all 17 canonical criteria exactly once. Seven criteria are planned as implemented: UC32-1, UC32-2, UC32-3, DEP-01, DEP-02, DEP-03, EVAL32-3. Ten criteria are explicitly deferred; full original meanings and every provenance entry, including USER aliases, are preserved in test-matrix.md. These dispositions are planning commitments, not completed or tested work. Implemented traceability criteria cover every flag in the bounded synthetic application. Operational applicability remains unverified. Partial demonstrations do not satisfy deferred source requirements.

## Application architecture and files

See system-design.json: analyst workspace → timing engine → evidence resolver → human brief, supported by immutable synthetic snapshots and local session storage. Six components map to these exact planned source files:

- `index.html`: self-contained document, inline CSS and classic JavaScript, all data and all runtime logic embedded. Open directly using file:// with no server, build step, CDN, module import or external fetch.
- `core.cjs`: Node-compatible application core exporting createBaseline, applyEvent, validateModel, analyze, resolveEvidence, makeBrief and analysisFingerprint (names can be consistently refined by builder). No browser globals or third-party dependencies. Adapt supplied DAG semantics at the application boundary; keep .fleet/ unchanged.
- `core.test.cjs`: Node built-in test runner tests of the actual core and behavior of the inline core extracted from the shipped HTML in a Node VM. Inline core exposes the same API through a deliberate namespace. Verify values, failures and source immutability, rather than merely comparing source strings.
- `README.md`: opening instructions, test command `node --test *.test.cjs`, workflow, synthetic limits and honest verification status.
- `path-to-fleet.md`: one-page, explicitly hypothetical owner validation, approved scenario/answer key, access/security review, shore pilot, integration and audit milestones; cite source 30/60/90/180-day hypothesis without promising dates or approval.

No external dependencies. Keep runtime pure core in a marked inline classic-script block; browser controller binds controls separately. Maintain the embedded core and core.cjs consistently, and run identical fixture expectations against both. Toolkit/reference fixtures are not application acceptance evidence. The phase-specific calculation tool, if later used in build, is a cross-check only, never a browser gate or SME baseline.

## Frozen synthetic model and independent arithmetic

Use whole elapsed days from epoch `2026-11-04T00:00:00Z`, not working days or local date rounding. Day 0 is the epoch; baseline mission deadline is day 21. Snapshot `SYN-21` revision `r1`, model `ILLUSTRATIVE-DAG-1`, synthetic asset `SYN-DDG-01`, last-sync and observed timestamp `2026-11-04T00:00:00Z`. This is a declared demonstration time convention, not operational policy. Display snapshot as-of and last-sync timestamps, not fabricated live freshness. There is no SME-approved 21-day scenario; the sequence below is planner-authored illustrative content.

| Node ID / label | Dependencies | readyAt | duration | Baseline source |
| --- | --- | --- | --- | --- |
| parts / Parts | none | 4 | 0 | SYN-PARTS r1: Part available day 4. |
| repair / Repair | parts | 0 | 3 | SYN-MAINT r1: Repair duration 3 days. |
| radar / Radar test | repair | 0 | 2 | SYN-TEST r1: Radar test duration 2 days. |
| staff / Qualified personnel | none | 6 | 0 | SYN-MANNING r1: Qualified personnel available day 6. |
| watch / Qualification review | staff | 0 | 1 | SYN-QUAL r1: Qualification review duration 1 day. |

Targets are `radar` (display Radar restoration) and `watch` (display Watch qualification). `SYN-SCHEDULE r1` excerpt is `Mission deadline day 21.`. Finish equals max(own readyAt, prerequisite finishes) + duration. Target margin equals deadline minus target finish. Baseline radar: 4+3+2=9, margin 21−9=12. Watch: 6+1=7, margin 14. Baseline radar controlling path is Parts → Repair → Radar test. These are timing targets, not validated capability classifications.

Apply each change to a local copy only; preserve baseline and earlier record revisions. Event timestamps are synthetic observation order on the same epoch day, at 01:00, 02:00, 03:00, 04:00, 05:00 UTC respectively. They are simulated updates, not a live source stream. Later recorded future availability is a forecast in the excerpt, not a future observation timestamp.

| Event | Exact introduced source excerpt | Local model change | Radar finish / margin | Watch finish / margin |
| --- | --- | --- | --- | --- |
| E1 Radar casualty | SYN-CASUALTY r1: Radar repair duration 6 days. | repair duration 6 | 12 / 9 | 7 / 14 |
| E2 Part delay | SYN-PARTS r2: Part available day 15. | parts readyAt 15 | 23 / -2 | 7 / 14 |
| E3 Maintenance backlog | SYN-MAINT r2: Repair duration increased to 8 days. | repair duration 8 | 25 / -4 | 7 / 14 |
| E4 Two qualified personnel detach | SYN-MANNING r2: Two qualified personnel detach; illustrative replacement availability day 23. | staff readyAt 23 | 25 / -4 | 24 / -3 |
| E5 Mission schedule moves | SYN-SCHEDULE r2: Mission deadline day 20. | deadline 20 | 25 / -5 | 24 / -4 |

E4 is explicitly a made-up availability mapping, not a calculation of manning readiness or an operational staffing rule. Event application updates the labeled repair-duration field to match the current model. Applying an event invalidates prior analysis/review; users must Analyze. Disable Apply next change after E5 with `All five synthetic changes applied.` Repeated clicks must not duplicate events. Maintain an event history with before/after values. No source precedence is silently inferred; these events explicitly supersede earlier values in the illustrative working model while retaining prior records.

`known-path` freezes intermediate results after E1/E2. `all-risk-evidence` freezes E5 results and the exact evidence summary strings. Additional per-event arithmetic is tested in core.test.cjs. Final radar explanation states part day 15 + repair 8 + test 2 = day 25; final watch explains personnel day 23 + review 1 = day 24. UNKNOWNs appear separately and are never ranked as safe. If showing an illustrative consideration order, use lowest known margin first (radar -5 before watch -4); ties by stable target ID, with explanation that this is a demonstration ordering, not an approved leadership priority policy.

## Data contracts and provenance

Snapshot object: schemaVersion 1, classification `synthetic`, id, revision, modelId, assetId, epoch, timeUnit `day`, observedAt, lastSyncAt, deadline, targetIds, nodes, records and appliedEvents. Each node: stable id, label, deps[], readyAt nonnegative integer, duration nonnegative integer or explicit null, sourceRefs[] of {recordId, revision}, assetId. Record: recordId, revision, assetId, reportType, observedAt, lastSyncAt, exact excerpt, excerptStart 0, excerptEnd equal to excerpt length (Unicode character offsets, exclusive), synthetic true and supersedes when applicable. Keep exact record text so citations resolve by stable record/revision, never lexical similarity. Use the same epoch and unit for all numeric inputs.

Core result: model fingerprint, per-target status known/unknown, known finish/margin or null, lowerBound, unknownNodeIds, controlling paths (all ties or explicitly representative with tie warning), dependency closure and evidenceRefs. Current late flags derive from known negative margin. Known zero margin is WITHIN DEADLINE, explicitly timing only. Unknown prerequisites propagate even if another known branch is longer. Do not label a lower-bound path proven critical. Delayed own availability can control start independently of predecessors; explain this rather than inventing upstream slack.

Blank repair duration maps to null. Reject malformed numbers instead of rounding, negative inputs, duplicates, missing targets, cycles (including disconnected cycles), dangling references and mismatched asset identities. Bound graphs at 200 nodes and inputs to manageable length; no arbitrary code or HTML from data. Render with textContent. Evidence must exist for every target dependency and event used in its explanation, including superseded changes relevant to the narrative. Source metadata and model links appear beside each evidence summary in separate elements so the exact frozen summary selector contains only its specified text. Every final late flag must have a detail panel; a traceability percentage alone is insufficient.

Identity matches require stable asset IDs; aliases alone are uncertain. Retain conflicts as competing records and block a current definitive conclusion pending a deliberate choice; do not silently pick newest text. Freshness displays observed and last-sync timestamps and age relative to a stated as-of. No operational staleness threshold exists; mark age policy unapproved. Missing/future timestamps show a warning and cannot silently support a current claim. Tests exercise these cases even though the bundled baseline is consistent.

Local session schema: version, savedAt, snapshot, current model, applied events, repair draft, note, acknowledgment, current analysis fingerprint, current review fingerprint and local audit entries. Explicit save persists the full state; stale or malformed stored sessions must never resurrect a green result. Audit entries record local time, action, model/snapshot revisions, event IDs and analysis fingerprint. Local storage is not trusted multi-user audit or encryption. No synchronize-on-reconnect simulation is claimed.

## UX and selector contract

ux-spec.json owns intended screens, all four states, persistence, recovery and keyboard behavior. acceptance-plan.json owns exact outcome selectors and literal strings; builder must reproduce them unchanged. Two sections form one responsive page: dependency review, and advisory brief/review. A sidebar may summarize limitations on desktop and stack on narrow screens. Use semantic headings, labeled native controls, generous spacing, wrapped excerpts and visible focus. Main analyst controls are prominent; advanced synthetic graph error samples are secondary behind `#model-tools-toggle`.

Primary controls: `#load-sample`, `#apply-next`, `#repair-duration`, `#analyze`, `#radar-evidence-toggle`, `#watch-evidence-toggle`, `#review-note`, `#review-ack`, `#record-review`, `#save-session`, `#export-brief`. Result panels: `#radar-result`, `#watch-result`, `#radar-path`, `#margin-note`, `#flag-count`, `#analysis-caveat`. Evidence summaries: `#radar-evidence` and `#watch-evidence`; include exact frozen citations plus separately displayed full metadata and causal explanations. Boundaries: `#source-boundary`, `#source-version`, `#decision-boundary`. Status/error: `#analysis-status`, `#analysis-error`, `#review-status`, `#review-error`, `#save-status`.

Advanced `#model-case` native select has values valid, cycle and dangling. Cycle adds radar as a predecessor of repair (repair already precedes radar). Dangling adds missing-task to repair. These are clearly labeled synthetic validation examples, not operational diagnoses. Returning to valid restores only the structural baseline while preserving the ordinary duration draft. In frozen invalid-graph journey the draft duration stays 3. UNKNOWN recovery requires an input accepting empty value without coercion or browser-required blocking.

Any calculation input change marks results outdated and prevents review/export until recomputed. Keep prior results, if desired for comparison, labeled Previous analysis, never current. Draft note and input values survive panel toggling and errors. Review acknowledgment binds to current fingerprint; model changes clear the acknowledgment and current review. A first review can commit an initial draft; if replacing an existing saved/reviewed scenario with different unsaved inputs, require explicit save or discard before another review. After ordinary note changes users can save the updated note without losing the current calculation. Save-session and reload in human-brief must restore the full final reviewed state exactly.

The text download is `synthetic-readiness-brief.txt`. Include `ADVISORY ONLY, Human decision required.`, model/snapshot identity, as-of and last-sync, all five events, both final calculations, every cited record/revision/excerpt, missing facts, illustrative considerations, review note and acknowledgment, and explicit lack of validated capability model. Deterministic template explanation is sufficient. No LLM or network call; domain calculations remain pure and independent from explanatory prose. Future model-assisted explanation must be labeled, grounded in these results, unable to invent estimates and never alter source evidence or execute recommendations.

## Ordered build tasks and dependency gates

1. Establish immutable synthetic baseline/records and five events exactly as specified. Implement pure data validation and identity/provenance checks. Keep .fleet and frozen plans unchanged.
2. Adapt DAG timing into core.cjs with unknown propagation and path semantics. Implement source resolver, event application and analysis fingerprint. Write meaningful core.test.cjs cases from test-matrix.md, including every intermediate event.
3. Embed the same core into self-contained index.html and add baseline load, changes, duration edit, Analyze and current/outdated states. Verify the inline core behavior against independent Node expectations, without requiring a browser module loader.
4. Add complete evidence inspection, immutable source/version indicators and timing-only limitations. Implement known, unknown and invalid recovery behavior using frozen selectors and literals.
5. Add advisory review with acknowledgment, note preservation, fingerprint invalidation, local audit, explicit save/restore and export. Handle unavailable or corrupted storage visibly. Add deterministic brief and illustrative options, with no operational action controls.
6. Finish responsive and keyboard behavior, empty/loading/error/success states and advanced model validation examples. Check all frozen journey selectors are unique. Document README.md and path-to-fleet.md accurately.
7. Run application Node tests, then hand to host desktop/narrow browser verification. Record additional checks in verification.md. Host owns test-report.json, screenshots/traces and source hashes. One bounded implementation repair may follow failures; never alter frozen expectations. No extra tests or repeated gate runs without changes or unresolved concerns.

## Completion and limitations

Planning outputs are plan.md, test-matrix.md, system-design.json, acceptance-plan.json and ux-spec.json. The host validates and freezes the JSON contracts immediately after planning. Planning may check JSON syntax and coverage only; application tests and visual inspection are not claimed. No application code is implemented here.

Unknowns remain: approved capability model; SME-reviewed 21-day scenario; approved risk/ranking/noise rules; manual timing baseline; record freshness/conflict policy; source access and synchronization; authenticated audit, encryption and accreditation; domain expert and official judge approval. Future work must obtain these independently. The source transition owner/destination are hypotheses, not access authority. Work is synthetic-only, local, and read-only toward all source systems. No publication, deployment, external contact or operational decision is authorized. Prototype checks, complete requirements, human acceptance and operational validation must be reported separately.
