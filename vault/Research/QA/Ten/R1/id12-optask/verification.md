# Verification evidence, 2026-11-04

Status: generated application; application core runnable and locally tested. Browser verification gate remains pending and cannot be claimed passed. `requirementsMet: false`. Reviewer acceptance and operational validation are unverified. Synthetic-only boundary applies throughout.

Read requirements.md, plan.md, acceptance-plan.json, ux-spec.json, system-design.json, README.md, application source, tests, packet, quality contract and assigned fleet-evidence, fleet-ux and fleet-messages skills. Frozen contracts, architecture and .fleet files were not edited. No host evidence was generated or modified; test-report.json, source hashing, desktop/narrow screenshots and traces belong to the host runner.

## Executed checks and bounded repair

Executed `node --test core.test.cjs consistency.test.cjs` before repair: 7 passed, 0 failed, 0 skipped. Added adversarial application regressions and executed again: 7 passed, 3 failed, 0 skipped. Preserved failure observations:

- Oversized commit regression, core.test.cjs: prior approval was `true`, expected `false`, after the rejected commit.
- UTC year spillover regression, core.test.cjs: valid forward interval was rejected with `Resolve extraction issues before approval.` rather than `Reviewed: 1 record` because normalized ISO strings were compared lexically.
- Embedded carriage return regression, core.test.cjs: `TASK/T/2026-11-04T12:00Z/O/One\rTwo//` emitted no issue, violating the single-line field grammar.

One bounded implementation repair in index.html invalidates approval before attempting a commit, redraws review/schedule after a thrown parse, compares interval endpoints as epoch instants, formats UTC clocks independently of ISO year width, rejects embedded carriage returns, and gives reserved/fallback record IDs collision-free evidence selectors. Prior source evidence and draft survive oversized failure; old approval does not return on discard. No frozen expectation was changed. Selector hardening was found by source inspection and covered in an actual core-function regression, not a browser claim.

Final executed command: `node --test core.test.cjs consistency.test.cjs`. Result: **12 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo**. The final run includes a literal independently specified README sample result/export test. Tests load the actual inline application core via core.cjs, without toolkit fixtures or a separate algorithm. consistency.test.cjs compares the adapter and inline core on frozen inputs; this is wiring evidence, not independent correctness or UI evidence. Independent assertions live in core.test.cjs. No mutable temporary fixtures were created.

## Criterion evidence

Canonical provenance follows .fleet/packet.json; complete source meanings remain in test-matrix.md and frozen acceptance-plan.json.

| Criterion | Provenance | Input / expected result | Executed evidence and status | Host journey pending at both sizes |
|---|---|---|---|---|
| UC12-1 | challenge.requirements[0] | Actual USMTF yields the three requested event categories on a consolidated timeline | Deferred/unverified: actual formats and SME mapping absent; synthetic demonstration cannot satisfy this | None; deferred |
| MSG-01 | recipe.acceptance[0] | EVENT/TASK, emoji, mixed CRLF/LF, empty fields: every emitted half-open UTF-16 span slices original input exactly; changed drafts cannot export | core.test.cjs span, draft/category, selector and sample tests pass; browser completion unverified | trace-review-export; draft-approval-boundary |
| MSG-02 | recipe.acceptance[1] | Empty, missing zone, invalid/leap date, unsupported text, duplicate IDs, missing owner, malformed field, reversed/zero interval, embedded CR and oversized input must block review; valid retry works | core.test.cjs validation and repair regressions pass; no invented timestamps; browser recovery unverified | invalid-source-recovery; draft-approval-boundary |
| MSG-03 | recipe.acceptance[2] | 09:00Z equals 04:00-05:00; cross-midnight is 60 minutes with two 30-minute segments; midnight endpoints half-open; point tasks and overlaps retained; UTC year spillover ordered by instant | core.test.cjs normalization/day/export/year tests pass; full endpoints preserved; browser outcomes unverified | utc-day-boundary |
| MSG-04 | recipe.acceptance[3] | Independent held-out human answer key, non-events and event/field precision/recall | Deferred/unverified: no independent corpus, reviewer or agreed scoring threshold. These authored regressions are not held-out accuracy measurements | None; deferred |
| MSG-05 | recipe.acceptance[4] | Disconnected browser parses, reviews, displays and downloads | Deferred/unverified: self-contained source inspection does not demonstrate witnessed disconnected operation | None; deferred |
| DELIVERABLE12-1 | challenge.expectedDeliverables.lines[0] | Mock USMTF becomes synchronized usable 24-hour schedule | Deferred/unverified: missing reviewed mapping and owner assessment; manual synthetic annotations are partial scope | None; deferred |

## README and UI limits

Reviewed quick start and walkthrough against event handlers, sample text, category labels, date application, export schema, session-only reset and recovery. Executed the sample’s domain workflow and asserted both literal schedule rows, two exported records and source offsets. README now documents oversized-failure recovery, standalone carriage-return rejection and UTC year-boundary behavior.

Could not exercise opening index.html in a real browser, sample button activation, native date/select/keyboard controls, evidence expansion, actual Blob download and filename, reload behavior, status announcements, focus, desktop/narrow overflow, console errors, offline disconnection or screenshots/traces. No dedicated browser tool or existing host browser evidence was available in this workspace. These are unverified, not passes; missing runtime remains a gate failure if the host cannot run it. The host must execute all four frozen journeys on desktop and narrow viewports and retain its report/screenshots/traces. Local Node results cannot substitute for that gate.

No USMTF compliance, handwritten/OCR accuracy, SME-reviewed category mapping, operational timezone policy, CAC, government-system integration, device encryption or operational readiness is established. All six architecture components have existing mapped implementation files; generated status reports implementation existence only.
