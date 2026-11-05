# Acceptance and evidence matrix

The planning outcomes below are preserved; current results appear in this matrix and verification.md. Implemented means planned prototype coverage, not passed evidence. Deferred criteria remain unverified; requirementsMet must remain false. Browser journeys run in fresh desktop and narrow contexts. Host owns test-report.json and screenshot/trace locations; later verification.md records application test results. Independent planner expectations reduce drift, but are not independent SME ground truth.

Source: P37, .fleet/packet.json schema 1, captured 2026-11-04; source URL https://cdao.hackathon.maximus.com/event/norfolk/use-cases/37. Exact packet requirement text and JSON pointers below preserve provenance; source revision/hash and excerpt register are in research.md. No live website verification.

## UC37-1

- Original requirement: Offline; government mobile devices
- Provenance: requirement UC37-1 at `challenge.requirements[0]`
- Expected full outcome: The owner tool installs through a permitted government-mobile path and completes its documented workflow without connectivity.
- Disposition: deferred. Actual tool, permitted install route and government device are absent. Local file use and responsive browser checks demonstrate only the synthetic planner.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## UC37-2

- Original requirement: Human approval of every result
- Provenance: requirement UC37-2 at `challenge.requirements[1]`
- Expected full outcome: Every operational result requires attributable human approval, with edits invalidating approval and an auditable decision history.
- Disposition: deferred. The owner application and operational approval identity are absent. Review of a draft transition record is not Beachmaster result approval.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## UC37-3

- Original requirement: Security evidence aligned to the authorization process
- Provenance: requirement UC37-3 at `challenge.requirements[2]`
- Expected full outcome: Security evidence for the actual tool is mapped to the applicable authorization process and reviewed by its responsible authority.
- Disposition: deferred. No applicable checklist, real tool or authorizing representative is supplied. The prototype records missing evidence only.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## UC37-4

- Original requirement: Open, maintainable code
- Provenance: requirement UC37-4 at `challenge.requirements[3]`
- Expected full outcome: The transitioned owner application has openly available maintainable source, known reuse rights, reproducible instructions and application tests.
- Disposition: deferred. Readable prototype source and tests will be delivered, but the absent owner baseline and unknown license prevent establishing the complete source requirement.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## UC37-5

- Original requirement: Fleet-Ready Definition of Done (all solutions): runs offline; keeps humans in authority; cites sources; logs auditable actions; syncs on reconnect; includes a one-page path to fleet.
- Provenance: requirement UC37-5 at `challenge.requirements[4]`
- Expected full outcome: The actual solution runs offline, retains human authority, cites sources, logs auditable actions, synchronizes on reconnect and includes a one-page path to fleet.
- Disposition: deferred. The draft planner includes source attribution and a path summary only. Operational offline lifecycle, approval, audit integrity and sync remain unspecified and unverified.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## FLD-01

- Original requirement: Reproduce installation on the intended device.
- Provenance: recipe FLD-01 at `recipe.acceptance[0]`
- Expected full outcome: A second operator installs the owner package on the intended device and completes the offline demo using the supplied instructions.
- Disposition: deferred. The intended device, owner package and approved installation route are absent. Opening the synthetic index.html does not establish installation.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## FLD-02

- Original requirement: Preserve baseline behavior.
- Provenance: recipe FLD-02 at `recipe.acceptance[1]`
- Expected full outcome: The same supplied owner-application baseline tests pass before and after packaging, preserving behavior.
- Disposition: deferred. No owner application or baseline tests supplied. New planner tests and toolkit fixtures cannot substitute.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## FLD-03

- Original requirement: Name accountable transition owners and unresolved approvals.
- Provenance: recipe FLD-03 at `recipe.acceptance[2]`
- Expected full outcome: Actual accountable transition, hosting, authorization, update and sustainment owners review their decisions and unresolved approvals.
- Disposition: deferred. Real owners and owner review are external dependencies. The prototype shows explicit Unassigned statuses and proposed actions only.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## EVAL37-1

- Original requirement: Calculations verified against a hand-computed answer key
- Provenance: evaluation EVAL37-1 at `challenge.evaluationCriteria[0]`; user USER37-1 at `userScope.criteria[0]`
- Expected full outcome: Actual application calculations match an independent SME-reviewed hand-computed answer key including boundary cases.
- Disposition: deferred. Rules, units, thresholds, worksheet revision and answer key are absent. No surf calculation or GO/NO-GO output will be invented.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## EVAL37-2

- Original requirement: Working offline on a representative device
- Provenance: evaluation EVAL37-2 at `challenge.evaluationCriteria[1]`; user USER37-2 at `userScope.criteria[1]`
- Expected full outcome: The actual owner application completes its task offline on a confirmed representative device with retained evidence.
- Disposition: deferred. Device and operational offline test conditions are unknown. Desktop and narrow browser contexts are not representative-device evidence.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## EVAL37-3

- Original requirement: Fielding package completeness, judged by the authorizing-official representative
- Provenance: evaluation EVAL37-3 at `challenge.evaluationCriteria[2]`; user USER37-3 at `userScope.criteria[2]`
- Expected full outcome: The authorizing-official representative judges the real fielding package complete against the applicable checklist.
- Disposition: deferred. No applicable checklist, owner application or authority judgement supplied. Synthetic draft review cannot confer completeness.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## EVAL37-4

- Original requirement: Named sustainment owner
- Provenance: evaluation EVAL37-4 at `challenge.evaluationCriteria[3]`; user USER37-4 at `userScope.criteria[3]`
- Expected full outcome: A real named sustainment owner accepts responsibility for support, updates, rollback and ongoing maintenance.
- Disposition: deferred. No accepted real owner supplied. Fictional names or Unassigned in the planner cannot satisfy this criterion.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## EVAL37-5

- Original requirement: Remaining barriers documented with a proposed fix for each
- Provenance: evaluation EVAL37-5 at `challenge.evaluationCriteria[4]`; user USER37-5 at `userScope.criteria[4]`
- Expected full outcome: All eight known remaining barriers are documented with a nonempty proposed fix and explicit ownership status; save rejects a missing fix, review and exports retain unresolved status, and the saved register survives reload.
- Disposition: implemented. 
 - Input: Synthetic Beach Log 0.1; eight known gap rows; blank-name/blank-fix variants and unsaved name change.
- Planned check: review-barriers, recover-incomplete, protect-saved-review; application core tests below.
- Result: Local Node PASS (22/22). Supplied host browser FAILED: review-barriers at step 26 at both widths; both recovery journeys passed at both widths. Post-repair browser rerun pending.
- Evidence location: verification-repair-node.txt, test-report.json and its .quality-evidence screenshot/trace paths; verification.md maps the current repair and limits.

## EVAL37-6

- Original requirement: Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.
- Provenance: evaluation EVAL37-6 at `challenge.evaluationCriteria[5]`; user USER37-6 at `userScope.criteria[5]`
- Expected full outcome: Official judges evaluate the solution under Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges’ Discretion 15%.
- Disposition: deferred. External judging is unavailable. Preserve the packet rubric verbatim in documentation; do not calculate or self-award a score.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## DELIVERABLE37-1

- Original requirement: A fieldable package for at least one Sailor-built tool
- Provenance: deliverable DELIVERABLE37-1 at `challenge.expectedDeliverables.lines[0]`
- Expected full outcome: At least one actual Sailor-built tool has a fieldable package with supported hosting/install route, reviewed security evidence and sustainment responsibility.
- Disposition: deferred. Only a synthetic draft record is feasible without the owner application, target platform, authorization evidence and external owners. Packaging alone grants no authorization.
 - Input: Actual owner baseline, device/authority/SME evidence appropriate to the expected full outcome; not supplied.
- Planned check: External human/integration review; no prototype journey establishes this full criterion.
- Result: UNVERIFIED / DEFERRED.
- Evidence location: No qualifying evidence supplied; future owner/authority/device review record required.

## DELIVERABLE37-2

- Original requirement: A reusable fielding playbook for the next one
- Provenance: deliverable DELIVERABLE37-2 at `challenge.expectedDeliverables.lines[1]`
- Expected full outcome: A downloadable reusable fielding playbook covers baseline, device/offline install, hosting/signing, security review, result approval/audit, disconnected sync, sustainment/update/rollback, barriers and proposed fixes, and second-operator rehearsal; it preserves external approval gates and is usable for a different tool.
- Disposition: implemented. 
 - Input: Synthetic Beach Log 0.1; eight known gap rows; blank-name/blank-fix variants and unsaved name change.
- Planned check: review-barriers, recover-incomplete, protect-saved-review; application core tests below.
- Result: Local Node PASS (22/22). Supplied host browser FAILED: review-barriers at step 26 at both widths; both recovery journeys passed at both widths. Post-repair browser rerun pending.
- Evidence location: verification-repair-node.txt, test-report.json and its .quality-evidence screenshot/trace paths; verification.md maps the current repair and limits.

## Application Node tests to build

| Test group | Input | Literal expected outcome / invariant | Coverage |
| --- | --- | --- | --- |
| validateRecord | Blank/whitespace name; otherwise sample | Enter a fictional tool name.; draft remains unchanged | recover-incomplete |
| validateRecord | Blank baseline fix | Enter a proposed fix for Owner application unavailable. | recover-incomplete |
| barrier register | Sample; unknown evidence; blank owners | Eight rows; all Unresolved; blank owner normalizes to Unassigned; no readiness or approval inference | review-barriers |
| Boundary validation | Name 1/120/121 chars; version 1/40/41; action 1/1000/1001; whitespace-only | Inclusive limits accepted; empty/over-limit rejected with field-specific errors | EVAL37-5 application invariants |
| Snapshot boundary | Commit sample; mutate name; attempt review/export; discard | Saved revision unchanged; dirty guard rejects; discard restores sample; save increments revision | protect-saved-review |
| Round-trip persistence | Draft plus saved snapshot; invalid JSON/schema; storage exception | Both snapshots round-trip; corruption is not silently reset; failure never reports durable save | recovery / manual storage checks |
| Package output | Sample and edited fix; HTML-like user text | All eight fixes, Unassigned and Unresolved retained as plain text; no executable markup; source metadata and synthetic disclaimer preserved | EVAL37-5 |
| Reusable playbook | Two distinct fictional names | Same generic nine-step checklist and external gates; no claim of fieldability; next-tool reuse instructions | DELIVERABLE37-2 |
| Browser/core consistency | Extract identified inline core block from index.html in Node vm and call exported API; compare with transition-core.cjs on valid, invalid, export and dirty cases | Behavioral results equal on the same independent literals; tests call actual inline and standalone functions, not source-string checks | Both implemented criteria |

Use Node built-in runner in transition-core.test.cjs. Tests must call actual application functions; do not test toolkit examples or merely compare duplicated implementations. Browser journeys assert independent literal output. The standalone core and inline core must both pass the independent invariant tests as well as equality checks.

## Risks and human operational review

LocalStorage/file-origin behavior, export support, keyboard usability, layout and assistive technology need host/browser and human review. Storage corruption and download failure are planned manual fault-injection checks if not expressible in the declarative contract; do not label them browser-verified without evidence. Readable source, code licensing and maintainability need human review. Actual owner app acquisition, verified calculation rules/answer key, permitted device route, baseline before/after tests, authorizing checklist, named accepting owners, approval/audit integrity, transport/reconnect, signing and hosting are external gates. No authorization submission, deployment, operational contact or credentials are part of this build.

Official rubric (packet wording): Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.

## Implementation handoff, 2026-11-04

The planning entries above retain the frozen intended outcomes; their browser results remain NOT RUN. `transition-core.test.cjs` now implements the listed application test groups against both real core implementations. Local command `node --test transition-core.test.cjs`: 15 passed, 0 failed, 0 skipped. Evidence: `verification.md`; test definitions: `transition-core.test.cjs`. EVAL37-5 and DELIVERABLE37-2 have passing local core checks and pending host journeys (`review-barriers`, `recover-incomplete`, `protect-saved-review`). Every other criterion listed above remains UNVERIFIED / DEFERRED with its original provenance and external evidence requirement. These core results do not replace browser outcomes or satisfy deferred criteria.


## Verification phase update, 2026-11-04

Executed application suite: 19 passed, 0 failed, 0 skipped after the single bounded title-validation repair. Preserved pre-repair failures in verification-failure.txt; final stdout in verification-node.txt. Added malformed fixed barrier title/identity/status and evidence-status cases plus nested commit/export isolation checks against both real cores. All criterion statuses above remain unchanged: implemented criteria have passing core evidence and unverified host browser outcomes; deferred criteria remain unverified. verification.md maps every canonical ID to this evidence and its missing validation. The host owns test-report.json and desktop/narrow screenshots/traces.

## Independent browser failure repair, current result

Input: repeated package/playbook requests from the saved sample. Expected: each explicit request produces the named Markdown with unchanged saved content; unsaved content remains blocked and failures permit retry. Supplied host run: 19/19 Node tests passed; review-barriers failed on its eleventh download (step 26) at desktop and narrow widths; recover-incomplete and protect-saved-review passed both widths. Exact host paths are mapped in verification.md; test-report.json and host artifacts remain unchanged.

Repair: index.html spaces requests by at least 250 ms using a shared busy guard for both export controls. Application test transition-download.test.cjs calls the real UI handler with controlled browser APIs for 18 alternating exports, cooldown re-entry, exact generated bytes/filenames, URL cleanup, blocked review and download-error retry. Combined application command passes 22/22, zero skipped (verification-repair-node.txt). This is Node handler evidence only; actual browser events on repaired source remain unverified pending the host rerun. Both implemented criteria EVAL37-5 and DELIVERABLE37-2 retain failed prior browser evidence and require all frozen journeys to pass at both widths. All fourteen deferred criteria remain unverified; requirementsMet remains false.
