# Implementation plan: synthetic message review and UTC timeline

Phase: planning only. Date: 2026-11-04. Apply fleet-planning, fleet-ux, fleet-evidence and fleet-messages. Inputs read: requirements.md, scope.md, research.md, .fleet/README.md, .fleet/packet.json, .fleet/quality-contract.md and all four assigned SKILL.md files. Architecture published through fleet_system_design before writing contracts. No implementation or verification is claimed.

## Scope and intended result

Build the smallest complete local workflow: paste one synthetic message → parse deterministic EVENT/TASK records → inspect original evidence → choose provisional categories → deliberately approve → view a UTC daily timeline → download reviewed JSON. Serve the entire application by opening index.html. Use inline CSS and classic JavaScript only, without imports, fetch, CDN, external assets, package installs or operational connections.

The source requirement and source deliverable retain their full meaning. UC12-1, DELIVERABLE12-1, MSG-04 and MSG-05 are deferred for the explicit reasons in acceptance-plan.json. MSG-01, MSG-02 and MSG-03 are implemented dispositions, meaning planned implementation, not current passing evidence. The complete independent outcomes and original requirements/provenance are in test-matrix.md. No source evaluation criteria or additional user criteria were supplied; these planner outcomes are engineering proposals. RequirementsMet must remain false while any canonical criterion is deferred.

The prototype does not establish USMTF coverage. The three requested category names are choices made by the reviewer, with visible “Synthetic category annotation, not a reviewed USMTF mapping” help. Their correspondence to actual message types remains unverified. No lexical category guesses, invented dates, OCR or model extraction fallback. A mock-USMTF mapping requires a future SME-reviewed specification and new planning run.

## Deliverables and dependencies

Builder produces index.html, core.cjs, core.test.cjs, consistency.test.cjs, README.md and path-to-fleet.md. All application architecture components map to index.html; domain logic also maps to core.cjs. core.cjs is a dependency-free Node adapter loading the actual inline core from index.html rather than a separately maintained parser. The browser file remains entirely self-contained. Tag the core script with id="application-core" and expose a plain global SyntheticCore. core.cjs reads that script and executes it using node:vm without DOM access, exporting its functions. Use a VM context with ordinary language built-ins; no filesystem or network access inside the core. Browser UI code in a separate inline classic script calls the same global. Tests exercise actual core behavior, including adapters and frozen journey cases; a string-equality or marker check alone is insufficient.

Reuse research recommends adapting the supplied parser and timestamp helper. Builder may read those assigned toolkit modules and adapt their logic into the inline core, preserving attribution and documenting that package version/license is unverified. Never edit .fleet/. No toolkit runtime dependency, hosted tool response or toolkit fixture counts as application verification. No external candidate dependency is needed; Tesseract, Tika and LLM fallback are excluded.

## Data contract and deterministic rules

Input uses exactly the documented synthetic grammar:

```
EVENT/id/start/end/owner/description//
TASK/id/due/owner/description//
```

Fields cannot contain slash/newline; every required token must be nonempty. Accept LF and CRLF without normalizing the immutable snapshot. Source text is at most 200,000 UTF-16 code units, sourceId at most 200 characters. Blank lines may be skipped, but wholly blank input is an error. All unsupported nonblank lines remain visible issues, never silently discarded. Missing fields, invalid timestamps, any duplicate ID (flag all occurrences), zero/reversed interval and unsupported structure block approval of the snapshot. Valid records may be inspected alongside issues, but none becomes approved until all issues are fixed. TASK is a point; EVENT is an interval. No automatic conversion of one into the other.

Strict timestamps use YYYY-MM-DDTHH:mm with optional seconds and fractional milliseconds, followed by Z or numeric ±HH:mm offset. Validate calendar components and offsets before conversion; no JavaScript rollover, named zones, relative dates or borrowed current clock. Supported years 1900 to 9999. Invalid instants are null plus explicit issue; original literals remain intact. UTC is the sole display/export day basis for this slice, avoiding unreviewed local daylight-saving assumptions.

Core logical contracts (names may be adapted without altering behavior):

- parseSource({sourceId, sourceText}) → {grammar:'fleet-synthetic-message/v1', offsetUnit:'UTF-16', sourceId, sourceText, records, issues}. Each record has kind, source line range, raw fields, fieldSpans, normalized timestamps and issues. Every extracted token including kind/id/owner/description has {start,end,sourceText}; original.slice(start,end) must equal sourceText, using half-open UTF-16 indices. Missing fields retain empty evidence and an issue, never invented source. Escape text through textContent in the UI.
- normalizeTimestamp(literal) → normalized UTC ISO string or null, using independently tested calendar validation.
- review snapshot contains immutable parsed revision, categoryByRecord, approvedRevision and source draft. Categories use values frequency, crypto, flight, other with visible labels Frequency plan, Crypto change-over, Flight quarters, Other synthetic. They are reviewer annotations, never extracted fields, and thus do not pretend to have source spans.
- approve(snapshot,draft,categories) requires exact draft/snapshot equality, no issues, nonempty records and all categories selected. Reparse deliberately commits new source and clears approval/categories even when prior IDs recur. Failed parsing replaces extraction with visible failed results, never an apparently current old schedule. Source draft remains intact.
- Editing source preserves the old immutable snapshot and review state in memory but gates all approval/export, displaying the exact unsaved message in the frozen journey. Discard draft explicitly restores the snapshot source and approval. Parse changes explicitly commits replacement; label this consequence before the action. Date/category/evidence interactions preserve the draft. Category changes invalidate approval until deliberately approved again.
- buildDay(records,day) uses [dayT00:00Z,nextDayT00:00Z). EVENT intersects when start < dayEnd and end > dayStart. Store clipped segment separately from full interval. TASK appears only in the day containing its due instant, with no invented duration. Show overlapping entries separately; sort by effective start then source order. Day defaults explicitly to 2026-11-04 and can be changed via #schedule-day and #show-day.
- buildExport returns JSON object with schemaVersion:1, syntheticOnly:true, grammar, offsetUnit, sourceId, sourceText, selectedDay, timezone:'UTC', reviewStatus:'reviewed', and records. Include approved records intersecting selected day, each retaining original fields/spans, normalized full endpoints or due, chosen category, review state and separate clipped segment. No audit wall-clock timestamp required. JSON.stringify with indent 2 ensures the frozen sourceText download substring. Suggested filename is reviewed-schedule.json. Empty day or invalid/unapproved/dirty snapshot cannot export; explain why. Download uses a local Blob and object URL, revoked after use.

## UX and stable selectors

The three logical screens share one responsive page: message entry, review/evidence, daily schedule. The authoritative states, persistence and keyboard contract are ux-spec.json. Use readable text alongside a 24-hour timeline, marked 00:00 and 24:00 UTC. Full duration and source detail remain available when clipping. Technical spans are secondary evidence, not the primary schedule presentation.

Implement all frozen selectors literally. Fixed controls: #source-input, #parse, #issues, #original-source (read-only textarea), #approve, #review-status, #draft-status, #discard-draft, #schedule-day, #show-day, #schedule-summary, #export. Record selectors use an escaped/safe deterministic ID; for the frozen E1/E2/X examples: #evidence-E1, #evidence-id, #normalized-start-E1, #normalized-start-E2, #category-E1, #category-E2, #category-X, #schedule-row-E1, #schedule-row-X, #duration-X. Avoid generating duplicate CSS IDs from duplicate message IDs; attach source-line identity internally and expose duplicate issues before scheduling. Evidence-id refers to the selected record's ID evidence. #original-source always displays the committed snapshot, while #source-input is the editable draft.

For the frozen E1, id evidence is exactly `E1 | [6, 8) | E1`. Schedule rows use category label, description, clipped UTC range and Reviewed, separated by vertical bars. Default #schedule-summary when no approved records match is `No reviewed records for this day.` Exact errors and singular/plural status strings are in acceptance-plan.json. When draft differs, clicking #approve explains the block rather than silently approving prior content. Export is disabled while dirty, with visible reason. Source edits do not erase the committed snapshot until deliberate parsing/discard.

Use native labeled controls, visible focus, sufficient contrast and status regions. Wrap schedule rows at narrow widths; avoid a page-wide horizontal scroll. Enter in textarea inserts text; Space/Enter activate buttons. No persistence across reload is promised; prominently disclose in-memory-only work and export before leaving. Local operations are immediate but have announced busy status and duplicate-action guards. No clearing/reset action is necessary for this slice.

## Ordered implementation tasks and exit conditions

1. Read frozen JSON, matrix and architecture. Preserve them unchanged. Establish standalone index.html skeleton with synthetic-only notice, grammar help and all native controls. Exit: local opening requires no server or dependencies.
2. Adapt parser/calendar validation into the tagged inline core and add core.cjs adapter. Define exact spans and issue handling before UI. Add meaningful core.test.cjs cases from matrix including Unicode/mixed line endings, invalid dates and duplicates. Exit: actual application functions satisfy independently specified boundary values.
3. Implement immutable snapshot/draft/review state, source evidence, provisional categories and invalidation guards. Add tests for edit→blocked approval/export→discard and category-change invalidation. Exit: source and annotation provenance cannot be confused.
4. Implement UTC day intersection, full duration preservation, point tasks, stable sort and overlapping rows. Build visual timeline plus equivalent readable rows. Exit: equal-offset and cross-midnight literals match frozen expectations.
5. Implement guarded reviewed JSON export with full source/spans and selected-day segments. Exit: frozen downloads contain specified source/endpoint literals and no unreviewed output is represented as approved.
6. Wire responsive accessible controls, empty/busy/error/success and recovery behavior. Add consistency.test.cjs behavioral adapter/inline-core checks. Exit: every frozen journey selector and exact literal is supported without changing contracts.
7. Document finished synthetic grammar, local start, Node test command, in-memory storage, export contract, reuse attribution and limitations in README.md/path-to-fleet.md. Build agent runs appropriate application Node tests; host runs browser journeys on both viewports and records actual evidence. Do not claim visual checks without evidence.

## Failure and review boundaries

Oversize source and malformed date/day input fail specifically without discarding draft. Render untrusted source as plain text. No ambiguous timestamp can be acknowledged into validity. Unsupported text and duplicate identities require source correction. Invalid parsed snapshots have no approved schedule. In-memory state avoids dependence on file-origin storage policies; opening index.html remains the delivery boundary. Download/browser compatibility and true offline execution need separate witnessed review, which is why MSG-05 remains deferred despite local architecture.

Missing facts remain visible: actual USMTF structures, reviewed event-type mapping, operational event-window semantics, owner acceptance of manual category review, independent accuracy corpus/thresholds, operational day/time authority and deployment controls. Future work must address these with domain owners rather than guessed parser rules. No model-assisted explanation is used: extraction, calendar normalization, interval clipping, durations and export are deterministic. Optional future explanatory prose must remain separate and cannot override domain calculations, source evidence or review eligibility.

## Handoff and evidence status

Five planning outputs: plan.md, test-matrix.md, system-design.json, acceptance-plan.json and ux-spec.json. Host validates and freezes the two JSON contracts before build. This planning pass checks artifact structure and coverage only; no application exists, no Node application tests or browser journeys have run, no reviewer acceptance or operational validation has occurred. Future host test-report.json and screenshots/traces are host-owned. A missing browser runtime is a verification failure. One bounded repair may alter implementation only; suspected requirement errors require a new planning run, never weakening frozen expectations.
