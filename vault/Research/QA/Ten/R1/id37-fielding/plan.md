# Transition package planner implementation plan

Planning phase only, 2026-11-04. Architecture is published in system-design.json. This plan uses the assigned fleet-planning, fleet-ux and fleet-evidence skills. Inputs read: requirements.md, scope.md, research.md, .fleet/README.md, packet and quality contract. No implementation or application tests have been performed.

## Smallest complete workflow

A transition coordinator loads a fictional example or enters a fictional tool, edits proposed transition information and known barrier fixes, explicitly saves, reviews the committed version, and downloads a synthetic draft package and reusable fielding playbook. Draft and saved snapshot survive reload. Invalid entries preserve work. Unsaved changes require Save or Discard changes before review/export. No operational result approval is represented. The two implemented criteria are EVAL37-5 and DELIVERABLE37-2; all other full criteria remain deferred for the reasons in the frozen acceptance plan and matrix. A playbook is a reusable checklist, not evidence that the actual tool has been fielded.

Deliver index.html with inline CSS and classic JS; it must run directly from a local file without network, CDN, imports, fonts or external assets. Also deliver transition-core.cjs, transition-core.test.cjs, README.md and path-to-fleet.md. No package installation or third-party software reuse is needed. Adopt the recipe topic structure; use no toolkit calculations or fixtures as app evidence. The complete running UI must not depend on the standalone core file.

## Data contract and deterministic behavior

Storage envelope: schemaVersion:1, draft:Record, saved:Record|null, savedRevision:nonnegative integer. Record has toolName (trimmed 1 to 120), toolVersion (1 to 40), task (1 to 1000), baseline (missing or supplied-synthetic), deviceProposal, hostingProposal, installProposal, securityNotes, humanReviewNotes, updateRollbackNotes and sustainmentNotes (each 1 to 1000), evidence (array of reference records), barriers (eight fixed known IDs below). Sample gives explicit Unknown / Not supplied notes for all absent facts. Evidence records contain sourceId, revision or Unknown, capturedOn or Unknown, exact excerpt, source pointer/offset, purpose and status (missing or synthetic-unverified). Do not offer an accepted/authorized evidence status. Source challenge references are attribution, not proof of current operational applicability. Retain P37 reported capture 2026-11-04, revision hash and exact source excerpt/pointer from research.md. No link fetching.

Barrier: id, title (fixed), proposedFix (trimmed 1 to 1000), owner (trimmed 0 to 120; normalize empty to Unassigned), status fixed Unresolved. No row may be removed or silently resolved. Preserve all eight known barriers; explicit additional notes may describe newly discovered gaps without affecting the frozen sample count. Save validates all required fields in DOM order, commits a cloned snapshot, increments revision once and clears dirty state. Dirty state is semantic draft versus saved comparison. Editing a committed record never mutates the saved object. Export functions reject dirty/no-saved state and generate from saved content only. Sample loading creates an unsaved draft; fresh sample has no saved revision. Discard changes deliberately restores the saved snapshot. Avoid destructive full resets in the primary task.

Core API to expose both inline and in CommonJS: createSample(), validateRecord(record), normalizeRecord(record), isDirty(draft,saved), commitRecord(envelope), buildPackage(saved,revision), buildPlaybook(). Choose structured validation results and document them in README. Core functions must be pure; storage, focus, DOM and Blob/download effects belong to the UI adapter. Name validation is first, then version and topic fields, then barriers in the order below. No hidden approval flag, model output or populated field may grant readiness.

| Barrier ID | Fixed gap title | Default proposed fix |
| --- | --- | --- |
| baseline | Owner application unavailable | Obtain source, version, license and baseline tests from the tool owner. |
| device | Target device unknown | Confirm representative device and permitted offline install route with the device authority. |
| hosting | Hosting and signing unapproved | Request hosting decision and signing process from the hosting representative. |
| security | Authorization evidence requirements unknown | Obtain the applicable checklist and review criteria from the authorizing representative. |
| sustainment | Sustainment owner unassigned | Ask the command to name an owner who accepts support, updates and rollback. |
| rules | Calculation rules and answer key absent | Obtain authoritative worksheet rules and an independent hand-computed answer key from the SME. |
| approval | Operational approval and audit undefined | Define per-result human approval, identity, retention and audit integrity with the Beachmaster authority. |
| sync | Disconnected transfer unspecified | Define transport, acknowledgements, replay and conflict rules with the network owner. |

All default owners are Unassigned, all statuses Unresolved. Default sample name Synthetic Beach Log, version 0.1, task Record fictional beach observations. Baseline missing. Other topic values explicitly say Unknown or Not supplied; sample can be saved with unknown facts because saving documents gaps, it does not verify them.

No MSI, craft threshold, safety status, scheduling or readiness score is calculated. The only deterministic operations are validation, snapshot/version management, barrier counts and document formatting. There is no model-assisted explanation or AI/speech integration in this slice. If added in a later scope, model interpretation must remain separate from authoritative calculations and human operational approval.

## UX and stable selector contract

Use a readable local workspace with a prominent synthetic-only warning and local-storage notice, record editor, barrier register and saved review. Review can be a section rather than a route. Make status and next action visible on desktop and stacked narrow layouts. Native labeled controls and visible focus are mandatory. ux-spec.json defines empty/loading/error/success, keyboard and recovery behavior.

Selectors: #load-sample (Load synthetic example), #tool-name, #tool-version, #tool-task and topic fields with names matching the Record contract in kebab case; #fix-<barrier-id>, #owner-<barrier-id>; #save-record (Save record), #discard-changes (Discard changes), #review-record (Review saved record), #back-to-edit, #export-package, #export-playbook. Assertions use unique #form-error, #review-error, #save-status, #draft-status, #review-title, #package-status, #barrier-count and #review-barrier-<barrier-id>. Each barrier assertion selector contains exactly the text defined in acceptance-plan.json with no buttons or additional nested help text. Keep longer explanations outside assertion elements.

Save status is Saved revision N: NAME VERSION. Draft status is Unsaved changes or Saved. Review/export controls remain clickable when unsaved so an attempt explains how to recover; they must never generate a stale download. The review guard message is Unsaved changes. Save or discard changes before review or export. Successful review focuses its heading and displays Synthetic draft, not authorized for fielding. Export does not mark any criterion approved or barrier resolved. Initial blank state offers the sample action; loading it over existing work needs an inline replace/cancel confirmation. Loading and transient work must not erase draft data. Storage errors must disclose session-only persistence; corrupt content requires explicit recovery rather than silent overwrite.

## Export contents and reusable playbook

transition-package.md is a UTF-8 Markdown draft containing tool identity/version, saved revision, all proposed topics, missing baseline, evidence index with provenance, eight barrier titles/fixes/owners/statuses, and the one-page path-to-fleet summary. Its first visible label and body include Synthetic draft, not authorized for fielding. Preserve unknowns and state that packaging grants no authority to operate or install. The browser download name is exact. Exported user text must stay plain text; render UI with textContent rather than interpreting HTML.

fielding-playbook.md is generic and reusable for another tool. Include these nine numbered lines verbatim, with additional explanatory prompts allowed between steps:
1. Obtain the owner application, version, license and baseline tests.
2. Confirm the representative device, permitted install route and offline test conditions.
3. Record proposed hosting and signing decisions with the responsible external reviewers.
4. Obtain the applicable security checklist and collect traceable evidence for authority review.
5. Define human approval of every operational result and auditable change handling.
6. Specify disconnected transfer, acknowledgements, replay handling and reconnect conflicts.
7. Name an accepting sustainment owner and document updates, rollback and support.
8. Record remaining barriers with a proposed fix and accountable owner or Unassigned.
9. Have a second operator rehearse installation and the offline demo, then retain review evidence.

Include verbatim: Do not install, publish or submit for authorization without the appropriate external approvals.
Explain reuse: start a fresh fictional record for the next tool, replace identity/proposals/evidence, revisit every gap, and obtain independent reviewers rather than copying acceptance. Include source URL, source capture date, unknown revision caveat and unresolved approval disclaimer. README documents local opening, source/core relationship, Node test command, file inventory, persistence and limitations. path-to-fleet.md provides a concise one-page draft with known gaps, proposed next actions and unassigned accountable roles. Preserve source 30/60/90/180-day milestones only as unconfirmed hypotheses, never commitments.

## Ordered build tasks and verification handoff

1. Read the frozen JSON contracts; implement sample, record validation, fixed gap registry and pure snapshot/output functions in the inline core and standalone CommonJS core. Keep an identified inline core script block extractable by Node vm for behavioral parity tests.
2. Write meaningful Node built-in tests against actual functions using independent literals and boundary cases in test-matrix.md. Run both inline and standalone functions against the same invariant suite. Equality alone is insufficient evidence.
3. Build labeled editor and localStorage adapter, draft autosave, explicit commit/discard, corruption/error handling and status announcements. No transport or identity adapter is needed.
4. Build saved review, guard unsaved content, then implement Blob-based Markdown downloads from committed data. Reuse pure formatters; do not duplicate output rules in UI handlers.
5. Complete responsive styling, visible keyboard focus, validation focus and review/back behavior; write README.md and path-to-fleet.md reflecting the finished source and limitations.
6. Run application Node tests; hand off the untouched frozen browser contracts to host verification on desktop and narrow contexts. Record actual results in verification.md in the verification phase. Host owns test-report.json, screenshots, traces and source hashing. There is one shared bounded implementation repair if gates fail; never weaken the contracts.

## Dependencies, risks and acceptance boundaries

Dependencies are browser classic JS, localStorage (fallible) and Blob downloads, plus Node built-ins for tests. No external runtime, connector, model, library or network is selected. File-origin storage differences, denied/quota storage, corrupt envelopes, failed downloads, whitespace validation, stale review and unsafe rendering require explicit handling. Download failure leaves the saved record intact for retry. Human review must assess usability, actual device suitability, maintainability and whether expected outcomes express the real source need.

Every canonical packet ID and all original provenance aliases/paths are preserved in test-matrix.md; acceptance-plan.json contains each ID exactly once under the required schema. EVAL37-5 covers documenting the supplied known barriers, not independent discovery of every operational barrier. DELIVERABLE37-2 supplies a reusable checklist without asserting fielding success. Source-linked claims use the P37/R37 register in research.md; no current website, authority acceptance or evidence authenticity was verified. Official rubric weights remain unchanged and no score is self-awarded.

Missing external prerequisites remain visible: actual app/source/license/tests, SME rules and hand key, intended device/OS, approved hosting/install/signing route, applicable authorization checklist and reviewer, actual accepted sustainment/transition owners, operational result approval identity/audit policy and disconnected transport/reconnect semantics. A prototype pass cannot settle any of them. Generated planning artifacts are not runnable, tested, reviewer-accepted or operationally validated application evidence. Handoff ends this phase; do not implement application code here.
