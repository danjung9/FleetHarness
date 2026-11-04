# Implementation plan, synthetic cyber evidence workbench

Planning date: 2026-11-04. Phase: plan only. Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/35, recorded in packet challenge 35, capturedOn 2026-11-04. Inputs read: requirements.md, scope.md, research.md, .fleet/README.md, .fleet/packet.json, .fleet/quality-contract.md and all four assigned planning, UX, evidence and cyber skills. Source URLs identify packet provenance; no external source or operational system was accessed.

## Outcome and limits

The smallest complete vertical slice lets an analyst load or paste synthetic evidence, analyze an explicit synthetic control, distinguish a seeded issue from a benign look-alike, inspect exact citations and gaps, prepare a proposed change, explicitly review its committed revision, and export a durable analyst handoff. All delivered functionality runs by opening index.html. The UI is a single responsive workbench with progressive evidence, proposal/review and handoff sections. Audience, screen states, keyboard and recovery behavior are frozen in ux-spec.json; literal selectors and browser outcomes are frozen in acceptance-plan.json.

CYB-01 is planned as implemented for explaining the explicitly synthetic fixture with asset and control evidence. Its answer key is established below before implementation. This separate planning outcome protects against implementation drift; it is not independent SME ground truth or an approved control. Full source meaning, provenance, disposition and complete expected outcomes for all 18 canonical IDs are in test-matrix.md and acceptance-plan.json. USER35-1 through USER35-6 are provenance aliases of EVAL35-1 through EVAL35-6, never extra criteria. All other criteria are deferred, including CYB-02's execution-rejection scenario. Their partial proposal demonstrations cannot satisfy the full requirement. No claim that requirementsMet is true is permitted.

No scanning, exploitation, patching, identity administration, CAC/PKI, live Navy systems, deployment, reconnect synchronization or execution adapter. No simulated apply/rollback buttons or successful remediation claims. Approval means reviewed for handoff only. Every proposal and export states Not executed / not verified. No credentials, external calls, dependencies or network endpoints. Existing .fleet/ contents and toolkit remain untouched.

## Published architecture and source ownership

system-design.json was published early via fleet_system_design. Its six application components are the analyst workbench, synthetic corpus/baseline, deterministic analysis, revision-bound review, local journal and portable handoff. Connections carry versioned evidence into analysis, findings into review, events into persistence, and citations/current review into export. No operational or simulated network integration is selected.

Builder files:

- index.html: the complete application, inline CSS, classic inline JavaScript, inline synthetic corpus and baseline; no imports, external scripts, fonts, images, fetch or CDN. Render evidence as text, never HTML. The page is usable at desktop and narrow widths with wrapping citations and stacked panels.
- core.cjs: Node-loadable copy of the actual pure domain/state functions also embedded in index.html. Browser core lives inside one named factory function, exposed as CyberCore; core.cjs exports that same factory's result. CommonJS is required here because surrounding package module settings must not interfere.
- core.test.cjs: built-in Node application tests calling those functions, with literal vectors from this plan. Include a behavioral consistency check: extract the explicitly delimited inline factory from index.html, execute it in node:vm and run the same classification, canonical serialization, review transition and export vectors against both exports. Comparing source strings alone is not a consistency test. UI handlers must call CyberCore, not a duplicate rule implementation.
- verification.md: later build/verification record of actual checks and limitations; no tests are claimed during planning.

No package installation or third-party reuse. Research rejects current OpenSCAP integration, defers OPA runtime adoption and uses explicit inspectable synthetic rules. Toolkit lexical evidence search is neither needed at runtime nor a domain oracle. It cannot establish applicability. Research source register S1 to S11 remains the record of reuse decisions, provenance and missing versions/licenses.

## Planning-defined fixture and answer key

This is synthetic training data authored in planning revision 1 on 2026-11-04, not a sanitized snapshot, official bulletin or real vulnerability. The demonstration control is SYN-AUDIT revision r1, source timestamp 2026-11-01T00:00:00Z, local source `baseline/SYN-AUDIT/r1`, exact excerpt: `For training-service assets, auditEnabled must be true.` The baseline applicability is exactly type=training-service and supported revision r1. A synthetic owner accepted it for this demonstration only; no approval from a domain authority is implied.

Analysis uses fixed asOf=2026-11-04T00:00:00Z for reproducibility; explain this visibly. Maximum evidence age is 30 elapsed days inclusive. Future, stale, unsupported or incomplete evidence remains insufficient evidence. This is an invented demonstration freshness rule, not operational policy. Expected configuration value is Boolean true; false is the seeded misconfiguration. Strings such as `"false"` are invalid types. A missing field or null means unknown, not false. Other asset types and other control IDs/revisions are unsupported; do not guess compliance. All assets must have traceable exact source excerpts consistent with their known observed values.

Load synthetic sample fills the evidence textarea with exactly this logical bundle (formatting may vary):

```json
{
  "schemaVersion": 1,
  "synthetic": true,
  "bundleId": "SYN-SEED-1",
  "capturedAt": "2026-11-01T12:00:00Z",
  "assets": [
    {
      "assetId": "LAB-A",
      "type": "training-service",
      "evidenceId": "CFG-A",
      "revision": "r1",
      "sourceTimestamp": "2026-11-01T12:00:00Z",
      "controlId": "SYN-AUDIT",
      "controlRevision": "r1",
      "excerpt": "auditEnabled=false",
      "auditEnabled": false
    },
    {
      "assetId": "LAB-B",
      "type": "training-service",
      "evidenceId": "CFG-B",
      "revision": "r1",
      "sourceTimestamp": "2026-11-01T12:00:00Z",
      "controlId": "SYN-AUDIT",
      "controlRevision": "r1",
      "excerpt": "auditEnabled=true",
      "auditEnabled": true
    }
  ]
}
```

Independent planned answers: LAB-A is the only finding, because false differs from required true. LAB-B is a benign negative control, because true matches the same control; the asset name or mentioning audit cannot trigger a finding. The unknown bundle in the frozen recovery journey uses LAB-C, CFG-C, excerpt `auditEnabled=unknown`, auditEnabled=null and otherwise supported metadata; it yields no finding, no benign/compliant claim and exactly one insufficient-evidence result. The exact visible assertions in acceptance-plan.json override incidental copy choices. Findings are evidence correlations, not proven exploitation or complete policy evaluations. No official severity, mission importance or CVE is invented.

The source timestamp/revision and entire excerpt are retained, with excerpt offsets [0, excerpt.length) in the source record; baseline offsets are [0, 55), the exact 55-character fixed excerpt; calculate offsets from the actual excerpt and verify the slice reproduces it. Use the exact excerpt and JSON source pointer to identify it in the original bundle. Retain the original raw bundle for review. Unsupported/excluded/stale/future sources may be displayed as investigative gaps but never support a current positive finding. No live feed or search result is consulted.

## Data and state contracts

Input bundle schema is the JSON example above: schemaVersion=1, synthetic=true, nonempty bundleId, valid ISO UTC capturedAt, assets array with 1 to 20 entries. Allow only these documented fields; auditEnabled alone may be absent or null for unknown. IDs are 1 to 80 letters, digits, underscores or hyphens, starting with a letter. Per-asset IDs and evidence IDs must be unique. Required strings are nonempty; excerpt is at most 1000 characters and must match the known observed setting. Values must be Boolean/null, never coerced. Reject malformed/unsupported schema, non-synthetic content, duplicate IDs, invalid timestamps, inconsistent known excerpts or unknown extra fields atomically. Total input limit is 65536 UTF-8 bytes. These limits are demonstration choices, not operational requirements. Supported fields can contain only synthetic examples; the marker does not provide data-loss-prevention assurance.

Finding record: generated findingId, bundleId, assetId, outcome (finding/benign/insufficient), observed/expected values, reason, evidenceId/revision/sourceTimestamp/source pointer/excerpt/offsets, control ID/revision/sourceTimestamp/source pointer/excerpt/offsets, uncertainties and next step. No positive finding without both current applicable asset evidence and baseline citation.

Proposal record: proposalId SYN-PROP-1, integer revision starting at 1, exact affected asset LAB-A, setting auditEnabled, before=false, after=true; attached finding and bundle identity; full evidence and baseline references; rationale; prerequisites; verification steps; rollback steps; impact explanation and remaining gaps. The minimal editor exposes rationale and reviewer label; structured target/before/after and reference values are read-only and shown for review. Future evidence changes replace the whole proposal after a deliberate discard confirmation, never silently retarget a reviewed proposal. Initial rationale: `Disabled audit logging may leave local activity unrecorded in this training scenario.` Prerequisites: `Obtain authorized lab access, capture the current configuration and confirm control applicability.` Proposed verification: `In an authorized lab, confirm auditEnabled=true and inspect a new local test event.` Proposed rollback: `In the same authorized lab, restore auditEnabled=false from the captured prior configuration and verify the restored value.` These are instructions only; do not perform them. Impact: potential missing local audit records in the synthetic scenario; mission impact is unknown. Responsible role: synthetic system-owner reviewer, not an authenticated official.

Review record: proposalId/revision, canonical proposal SHA-256 digest, synthetic reviewer label, decision (reviewed/rejected), decision timestamp and optional rationale. Canonicalize recursively sorted object keys, preserve array order, UTF-8 JSON without insignificant whitespace; digest covers the entire committed proposal including IDs, revision, target, before/after, rationale, prerequisites, citations/revisions, impact, verification, rollback and gaps, excluding review metadata, journal and digest itself. Use browser Web Crypto when available with a self-contained dependency-free SHA-256 fallback if required for file:// operation; test against known SHA-256 vectors. The digest is content binding, not a signature or authenticated approval. Reviewer labels are required and clearly synthetic.

Draft and committed proposal are distinct. Editing any review-relevant content immediately blocks review/export and shows Unsaved changes, review unavailable. A click on review while dirty reports Save or discard draft changes before review. Keep the action reachable so it can explain this state. Save proposal commits a changed draft, increments revision, invalidates review and logs the reason. Saving an identical draft is a no-op. Discard changes restores the committed record and its review. Approval is an explicit user click after committed content is visible; it cannot be granted by analysis. Rejected review remains recorded and requires a subsequent explicit decision. On restoration, recompute digest and invalidate mismatches; never trust a stored reviewed flag alone. No execution API exists.

Session envelope: schemaVersion=1, raw evidence draft, accepted bundle, analysis, proposal draft, committed proposal, review history/current decision, ordered events and dirty flag. localStorage key `synthetic-cyber-workbench-v1`; persist ordinary input changes and transitions. On reload restore draft and committed values separately, reviewer label and current valid review. If storage is unavailable/quota-limited, keep working in memory and display Local storage unavailable, export before closing. Corrupt stored data is not silently trusted or overwritten: show a recovery warning and let the user start a new sample after explicit discard. No cross-tab merging, encrypted storage, authenticated identity or sync is claimed.

Event record: monotonic sequence/eventId, ISO local timestamp, synthetic actor label, action, success/failure, bundle ID, proposal ID/revision/digest where applicable, and reason. Log analysis success/failure, proposal creation/save/no-op or rejection, dirty review attempts, review/rejection, invalidation, replacement discard and export request. Preserve old decisions as history; never rewrite them as current. Include export-request event in the exported snapshot. Mutable local events are not a tamper-resistant operational audit trail.

Handoff JSON schemaVersion=1 includes synthetic=true, bundle and raw source, baseline, analysis/findings, committed proposal and digest, current review and all review history, event journal, uncertainties, impact/next actions, executionStatus=`not executed`, verificationStatus=`not verified`, rollbackStatus=`not executed`, and boundary note. Export filename is synthetic-cyber-handoff.json with UTF-8 pretty JSON. The on-page readable summary accompanies the structured download; raw JSON stays secondary. Export is enabled only for a clean committed reviewed proposal. A dirty or rejected proposal must be saved/reviewed first; export or storage failure preserves work. This documented local format is not an interoperable external integration contract.

## Browser contract and recovery

All frozen journeys run fresh at both desktop and narrow widths; none depends on another journey's storage. They use stable IDs, not text-based or positional selectors. #load-sample populates evidence; #analyze validates atomically; #analysis-summary and #finding-LAB-A/B/C contain only their literal planned result text. #citation-LAB-A contains the exact citation assertion while a nearby detail section contains the full baseline source and offsets. #create-proposal creates the one supported finding's proposal. #proposal-rationale, #reviewer, #save-proposal, #discard-changes, #approve-proposal and #reject-proposal govern review; #change-summary, #review-status, #draft-status and #proposal-error show narrow states. #execution-status always reads Not executed / not verified. #export-handoff performs the download. #evidence-error preserves and explains invalid input. Provide descriptive visible labels for all controls.

A replacement sample must not discard existing proposal/draft data silently: if a proposal exists, reveal a confirmation panel with Keep current work and Discard and load sample. No frozen journey requires replacement of an existing proposal. A failed parse preserves the previous accepted results explicitly labeled Last valid analysis and does not let the invalid draft be mistaken for the source of those results. Analyze cannot replace a proposal context without deliberate discard. Unknown evidence blocks proposal creation with an actionable message; loading a supported sample then restores progress. Draft rationale survives reload and a rejected review remains in history. Errors and status are accessible live regions, focus moves deliberately, and native controls have visible keyboard focus.

## Ordered implementation tasks and gates

1. Create index.html shell with clear synthetic-only and no-execution boundaries, the three workbench sections, native controls, stable selectors, responsive styles and all empty/error/status regions. Include the schema help and synthetic sample; do not introduce external dependencies.
2. Implement actual pure core validation/classification/citation functions and the planning-defined corpus/baseline. Build Node tests for seeded/benign/unknown outcomes, types, atomic validation, byte/asset limits, duplicate IDs, unsupported applicability and date boundaries. No model output decides a finding.
3. Connect the browser to that same core; implement invalid-input preservation, supported/unknown result views and exact literal outputs. Add behavioral inline/core consistency tests with node:vm, using independent expected values rather than output from one side as the oracle.
4. Implement proposal draft/commit, canonical serialization and SHA-256 digest, explicit review/rejection, edit suspension/invalidation and deliberate discard. Test all review-relevant content fields, no-op save, blank reviewer, stale stored digest and dirty export rejection. Preserve no-execution status in every transition.
5. Add versioned local persistence, reload restoration, memory-only warning, corrupt-store recovery and ordered events. Complete primary/recovery paths without losing raw input or draft. Local storage never implies operational retention or authenticated approval.
6. Implement readable handoff and JSON download with complete citations, proposal/current decision/history, audit and unexecuted checks. Tests must parse the actual export function output and assert fields; a static download fixture is insufficient.
7. Run node --test core.test.cjs, record actual output in verification.md and let the host execute all frozen browser journeys on desktop and narrow widths. The host owns test-report.json and captures. No visual review, browser pass or screenshot is claimed until evidence exists. Human review still checks clarity, fit, keyboard behavior, layout and domain limits beyond the specified assertions.
8. If a gate fails, use the single bounded implementation repair to address its cause without changing acceptance-plan.json or ux-spec.json. A suspected expectation error is recorded for a new planning run. Hand off when gates are reported honestly; all deferred items stay unverified.

## Calculations, explanation and later operational review

Domain logic is deterministic Boolean comparison under a labeled synthetic applicability/freshness rule. Counts are displayed as counts, not generalized detection coverage. SHA-256 binds content; timestamps support ordering and reproducibility but do not measure time savings or plan correctness. There is no model-assisted runtime explanation. Plain-language text is a transparent template linked to the actual evidence; any later model integration must remain secondary and cannot decide applicability, modify citations, approve proposals or turn instructions into verified outcomes.

Owners must supply approved control examples, sanitized snapshots under a separately authorized boundary, independent seeded/benign corpus and actionability review. An authorized training range, reviewed execution adapter, identity/approval model, audit integrity and retention policy, failed/partial remediation and rollback tests, constrained-link profile/emulator and comparable manual timing/effort baseline are prerequisites for the deferred claims. A later one-page path to fleet requires owner decisions at the source's 30/60/90/180-day milestones and is not asserted as delivered here. Neither local export nor synthetic reviewer entry establishes fleet readiness, CAC authentication, STIG compliance, authority to operate or a government connection.

## Planning completion

Required planning artifacts: plan.md, test-matrix.md, system-design.json, acceptance-plan.json and ux-spec.json. The host validates and freezes both JSON contracts immediately after planning. This handoff contains planning artifacts only; no application implementation, application tests, screenshots, reviewer acceptance or operational validation is claimed.
