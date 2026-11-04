---
type: directive
status: active
owner: mukul
updated: 2026-11-04
summary: "Preserve three overseer-owned code tasks, reconcile current export behavior and require evidence before review."
---

# Development instructions

[P, overseer, 15:45] Code seats are enabled. A task from the runner is your permission to work. Ignore any older text below or in a snapshot that says code seats are disabled, that a successor base must be approved, or that you must wait. Your clone is already on the right base, dev/reviewed, which holds Dan's mvp. Dan's d0f4c69 added `electron/source-export.ts`, browser verification and a quality contract, so check whether your task still applies before you start. Local notes go in `.tmp/JOURNAL.md`, not in new folders in the repo.

[R] Replace previous engineering instructions. Follow [[Ops/Dev-Pattern]] and [[Ops/Directors/Memo-overseer]]. Keep one four-request synthetic training task from [[Research/Plan/Plan]], with the existing CLI candidate as backup. No new application, connector, framework, catalog rewrite or general worker system.

## Current evidence and authority

[E, [[Research/Plan/Real-Build-Run1]]] A modified 631849f copy completed five phases at 15:24:21 with 22 generated tests reported passing. The permission profile and four-file patch are experimental. [R] Credit that completed build and the 4 PM gate without transferring its capabilities to stock mvp. Human review and independent task acceptance remain separate.

[E, snapshot-31, 15:34:44] Code seats are disabled; two dev-1 assignments are queued. [R] Runner: retain one existing overseer-owned dev-1 task and remove the redundant stale assignment. This meeting emits no duplicate dev-1/dev-2/dev-3 tasks. Start only after overseer enablement, checkout confirmation and exclusive file allocation. A directive does not enable a seat.

[R] Use the coordinator's latest base containing Dan's mvp changes. The runner owns integration, commits, tests and exact-commit independent review on dev/reviewed. Never push, reset, rebase or commit from a seat. No movement to mvp, main deployment or external message follows from this meeting. Mukul's own instruction is required for mvp. Noon Thursday is the overseer-enforced code freeze; plan affected acceptance before it.

## Adapt to AppYard

[E, both relay files and aggregate patch] mvp d0f4c69, merged to main 8db53c3, changes much more than styling. Preserve AppYard branding, Home/Flow, the existing data path, model selection, source snapshots, catalog fallback, frozen acceptance-plan.json/ux-spec.json, browser evidence and the new source exporter. Keep build:web and desktop delivery separate.

[R] Dan owns src/, studio/, index.html and CSS. No frontend edits are allocated. Do not restore removed interfaces or make Dan's pushes conflict with ours. Existing U1/U2/U3 are 631849f receipts for Quality to recheck only where relevant, not proven current defects. Put reports in the existing For-Dan handoff through Quality; do not message Dan.

[E, gate log] d0f4c69 reports 96 passed and 20 failed in 116 Node tests. Seven browser failures include missing cached-browser and installed-Chrome launch errors; thirteen workflow cases fail verification. [R] Quality/main must separate setup failures from product defects in the permitted runtime, retain failures and report the full suite inventory. Do not lower baseline counts, add skips, replace browser assertions with stubs or call all twenty environmental. Older 128-pass and 403/410 reports are different scopes and revisions.

## Existing owners, no duplicate assignments

| Seat | Current work and required evidence [R] |
| --- | --- |
| dev-2 | Keep the overseer's event-key engine-route assignment. Reconcile electron/codex-rpc.ts, electron/codex-account.ts and electron/codex-session.ts with d0f4c69. Record the true account route and preserve application of the approved permission profile. Coordinate any main.ts/shared-type/test edits before taking their lock. Prove supported account routes, denial/failure behavior and accurate route metadata with synthetic fixtures; live evidence belongs to the operator. Do not enter credentials or patch frontend consent text. Report any remaining allowance-label mismatch for Dan. |
| dev-3 | Keep the overseer's generated-test sandbox assignment. Preserve browser verification and source/evidence checks added in electron/quality.ts. No unsandboxed fallback when the configured runner/profile is unavailable. Prove allowed local test execution, denied outside access, timeout and cancellation using synthetic fixtures in the authorized environment. State whether browser execution is outside the measured boundary. Release electron/verification.ts and affected tests only after the reviewed change lands. |
| dev-1 | Keep one source-export assignment, adapted to the new electron/source-export.ts and tests/source-export.test.mjs. Dan already added source/destination checks and failed-copy cleanup, with six passing export tests in the gate log. Reproduce BUG-E1/E2/E4 against current behavior before editing. If expectations already pass, return the receipt and stop that slice. Never replace the new exporter with the old design. |

[R] For dev-1, accepted payload or rejection remains the outcome. Reuse the original cases in [[Research/QA/Runner/Harness-Coverage]] and qa/qa-scenarios/verification-export-edges.mjs, adapting only the caller to the new API. Preserve native-dialog coverage, cancellation, concurrent starts, destination checks and executable delivery. Record copied-byte identity independently; the current sourceHash still has H1 serialization ambiguity. H1 digest migration, E3 authoritative metadata and E5 unsupported-link policy need separate allocated scope, not silent expansion. Shared main.ts, storage.ts and verification.ts changes require a single confirmed owner. The old blanket 4 PM optional-export cutoff is superseded by the overseer's explicit assignment; this does not authorize extended generation.

## Proof, acceptance and answers

[R] Every code task needs files and done_when fields, a failing regression before its fix, and a PROOF line mapping each condition to command, exit, expected/actual result and retained log. Use direct local tool commands from the charter. After changes compile Electron and run focused affected tests; the runner performs the full required gate and independent review. Report blocked native/browser checks honestly. Do not claim a matching regression passed unless it ran on the named revision. Preserve .tmp/JOURNAL.md in each assigned clone.

[E, QA acceptance result.json files] First attempts were INCOMPLETE on schema discovery. Later adapter runs edf3150f-4563-4059-b9c0-6ecca70e64ac (15:37:54) and aaa1585f-8701-485b-861e-d2cc2ff42f8a (15:38:20) both FAIL. Pipeline-run1 uses midnight where the officer key expects 0800; its numeric cases and fresh offline import pass, with 14 checks NOT CHECKED. CLI-route reports changed canonical input after offline reimport and retains additional coverage gaps. [R] Main QA confirms the failure boundaries and finishes remaining acceptance. Keep the factory candidate primary and CLI as an unaccepted backup. Repairs must improve agent instructions/skills and produce separately identified bytes; no hand-editing output, altered oracle or claim that a fresh-context test alone proves all offline behavior.

[R] Manual final-copy acceptance remains required: stopped writers, complete file inventory, independent path/length/SHA-256 manifest, actual browser behavior, review invalidation and save/import recovery, with a human decision bound to tested bytes. Model-authored frozen browser contracts add evidence but are not independent domain acceptance. Keep H1/V1/E1-E5 open until matching current closure receipts. General shutdown, packaging, offline operation and user benefit need their own evidence.

[E, feed-31] No new development QUESTIONS were reported. [R] Answers: preserve overseer ownership; no second code queue; code enablement is still required; new exporter checks must be credited; runtime triage stays with Quality. Person-only review, trial, category and submission decisions belong on Product's single Status.md morning list while preparation continues.

[R] Keep 6 PM task acceptance and 7 PM final-copy evidence targets. Synthetic/public data only. Humans approve execution bounds, accepted artifacts and submission. Monitor files, tests, elapsed time and available usage; stop and escalate prohibited data, uncontrolled activity, changed accepted bytes or failed shutdown to the overseer. No operational release, real-person assignments, external writes or credential handling. Read both relay files before and after work; log locally for authorized central transfer.
