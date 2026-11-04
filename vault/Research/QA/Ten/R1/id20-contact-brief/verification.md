# Verification evidence, 2026-11-04

The application is generated in self-contained index.html. Node tests execute its actual contact-core script through node:vm, with no duplicate implementation or toolkit verification. Architecture and filenames match system-design.json. Frozen acceptance-plan.json, ux-spec.json, system-design.json and .fleet inputs were preserved.

## Executed tests and bounded repair

Environment: Node v26.0.0. Command: `node --test app.test.cjs`, from the workspace root. Original suite: 7 passed, 0 failed, 0 skipped. Expanded adversarial suite before repair: 8 passed, 2 failed, 0 skipped. Final run after the one bounded implementation repair: 10 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo.

Preserved failure evidence:

- `RET-02: impossible calendar dates are invalid rather than normalized`, app.test.cjs:76: expected invalid, actual stale for sourceTime 2026-02-30T09:00:00Z. JavaScript Date.parse normalized the impossible date.
- `RET-01: incomplete provenance and missing spans fail closed`, app.test.cjs:83: expected null, actual resolved reg-a/r1 with locator set to the empty string.

Repair scope: freshness parsing now requires a UTC ISO round trip, rejecting normalized invalid dates and hour 24. Citation resolution requires nonempty document ID, revision and locator plus an array of spans, returning null for incomplete records. No frozen expected outcome was changed. The shared single repair attempt is consumed; the host must independently rerun both gates.

Build-history note retained from the prior verification file: the initial build suite had 6 passes and one authored Unicode-length assertion failure (39 versus the literal's 41 UTF-16 units). The builder corrected that authored expectation before this phase; its final seven tests passed. This was not a frozen-plan change.

## Criterion-to-evidence mapping

Canonical provenance: .fleet/packet.json, challenge 20, capturedOn 2026-11-04; source revision unspecified. Exact requirement quotations and packet paths remain in test-matrix.md. No external source was fetched or asserted as authoritative.

| Criterion | Inputs and expected result | Executed evidence and remaining status |
| --- | --- | --- |
| UC20-1 | AIS/registry/sanctions ingestion across actual feeds | Deferred, unverified: seven inline synthetic snapshots across four identities provide no ingestion evidence. Approved feeds, rights and connectors absent. |
| UC20-2 | Every claim resolves to immutable capture; unresolved queries Unknown | Deferred, unverified: exact local spans and UNKNOWN logic tested, but editable text cannot demonstrate immutability or universal claim assurance. |
| RET-01 | Stronger excluded match absent; exact eligible spans/provenance; Twin requires explicit selection | app.test.cjs tests exclusion, offsets, revisions, duplicate/missing sources, literal Unicode/markup, exact identifiers, ambiguity, invalid candidate selection, incomplete metadata and conflicts. Node checks pass. Frozen inspect-evidence and resolve-identity journeys remain unverified at desktop and narrow widths. |
| RET-02 | Stale Ember cannot support current flag; missing facts UNKNOWN; invalid input recovers | app.test.cjs tests stale/missing support, empty input, exact 90-day boundary, one millisecond older, future/missing/inconsistent clocks, impossible dates and absent identity. Node checks pass. Frozen stale-evidence and recover-lookup journeys remain unverified at desktop and narrow widths. |
| RET-03 | Owner-labeled held-out evaluation with relevance, source coverage, hardware and p50/p95 | Deferred, unverified: no owner set, agreed metrics or representative benchmark. Test timings are not retrieval latency evidence. |

Conflicting current TEST-A/TEST-Z values retain inspectable references and no current flag; lexical rank does not choose a fact. Exact reference validation covers negative, reversed and oversized offsets, wrong revision, absent/duplicate snapshots and literal UTF-16 source spans. Eligibility is a fixture boundary only, not access control. No replay, scheduling, persistence approval or conflict-resolution workflow is specified for this recipe.

## Browser and guide checks still required

No browser runner is assigned to this agent and no host report, screenshots or traces are present. All four frozen journeys need actual execution on desktop and narrow viewports, with console and overflow checks. Node success does not satisfy this gate. test-report.json, source hashes, screenshots and traces are host-owned and were not created or edited here. Overall verification gate is not passed until host evidence establishes browser outcomes.

README quick-start, walkthrough controls, sample identifiers, source metadata and limitations were compared with the delivered source and tested core. The guide now reports the 10-test run and new rejection behavior. Opening index.html directly, clicking example buttons, submitting with Enter, selecting candidates, inspecting/closing sources, focus restoration, safe rendered markup, live error announcements, reload/reset behavior, narrow layouts and print preview were not exercised in a browser. Frozen journeys cover only some of these actions. Single-page A4 fit, accessibility and all guide interactions require browser/manual review. No claim of visual inspection is made.

## Status boundaries

Generated: yes; mapped component files exist. Local core runnable/tested: yes, 10 passing application tests. Browser runnable behavior and prototype checks: unverified pending host. Reviewer-accepted: no evidence. Operationally validated: no. requirementsMet=false because UC20-1, UC20-2 and RET-03 remain deferred.

No live registry/AIS/sanctions/JLLIS/SharePoint connection, trusted authorization, archival integrity, owner relevance evaluation, safe engineering decision, government-device approval or authority to operate is established. Domain freshness policy, identity rules, source applicability and one-page definition still require independent owner review.
