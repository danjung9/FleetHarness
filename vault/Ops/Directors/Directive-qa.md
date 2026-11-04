---
type: directive
status: active
owner: mukul
updated: 2026-11-04
summary: "Triage the new AppYard gate and finish candidate evidence review through one runtime owner."
---

# QA instructions

[R] Replace the previous directive. Deliver one accepted four-request synthetic training draft. Follow [[Research/Plan/Review]] and [[Ops/Directors/Memo-overseer]] where they supersede Plan/Findings. Lead with the real factory build and show its task first; retain CLI as backup. No second application, catalog sweep, connector, importer, redesign or new acceptance framework.

## Evidence and decisions

[E, relay read] Current mvp is d0f4c69; main is 8db53c3. AppYard adds model selection, source snapshots, frozen generated contracts, browser verification and source-export checks. Earlier 631849f evidence retains its revision. Backend equivalence no longer applies. Read both relay files before and after work; report a changed checkout and adapt affected checks without resetting or updating it yourself.

| Evidence [E, supplied records read] | Current disposition [R] |
| --- | --- |
| [[Research/Plan/Real-Build-Run1]] | Credit five completed live phases at 15:24 and 22 generated tests on 631849f plus its recorded patch. The 4 PM build gate is met. This is modified-copy evidence, not shipped d0f4c69 capability or accepted output. Prior owner approval and containment probes are recorded there; do not reopen the obsolete Pi-only access gate. |
| org/reports/mvp-gate.md and org/logs/mvp-d0f4c69.gate.log | Preserve FAIL: 96 passed, 20 failed. Log has seven browser-verification failures and thirteen downstream verification failures. Browser launch errors are explicit for some checks; do not infer all twenty are environmental. Do not lower the baseline, add skips or call blocked checks passes. |
| [[Research/QA/Runner/Harness-Coverage]] | H1, V1 and E1 through E5 remain OPEN as historical reproductions. New exporter source warrants reconciliation, not automatic closure or a duplicate implementation. Development owns fixes and their matching reruns. |
| [[Research/QA/Results-631849f-GUI]] and [[Research/QA/GUI-631849f/Receipt-Review]] | Retain six smoke successes, actual login start/cancel and U1/U2/U3 reproduction. No completed sign-in follows. Stop timing measured after click completion is not click-to-stop latency. |
| [[Research/QA/GUI-631849f/Stop-Child-Runbook]] | Retain ordinary Pi parent/child Stop PASS and separate cleanup PASS. No rerun. Detached jobs, pending-start, Quit, packaging and other engines remain separate gaps. |
| [[Research/QA/Officer/Trial-Protocol]] and [[Research/QA/Officer/Burden-Claim]] | Preparation accepted. No participant, timed trial or benefit measured. Use the existing protocol after an artifact is accepted. |

[E, JSON review] Exact receipts below are under `Research/QA/Acceptance/Results/`, each ending in `result.json`. Counts include evidence and review rows, not just domain cases; do not compare them as equivalent test totals.

| Receipt directory | Result and limit |
| --- | --- |
| training-acceptance-edf3150f-4563-4059-b9c0-6ecca70e64ac | [E] Pipeline-run1, 15:37:54 to 15:38:15 EST: 33 PASS, 1 FAIL, 14 NOT CHECKED. All 17 numeric cases pass; CLOCK-DISPLAY maps zero to midnight instead of the frozen 0800. Review invalidation and offline fresh import pass within the recorded scope. |
| training-acceptance-af6357a9-6421-4d12-ba9b-21b462cd2b3c | [E] CLI-route, 15:42:49 to 15:43:09 EST: INCOMPLETE, 28 PASS, 18 NOT CHECKED. Offline fresh import passes. G08/G09 import rejection versus coercion, G11 availability removal and V14 room reassignment remain unchecked. |
| training-acceptance-aaa1585f-8701-485b-861e-d2cc2ff42f8a | [E] Earlier CLI FAIL is retained historically. The newer receipt has the same payloadBefore manifest and a changed adapter digest, with an import-completion wait now present. Do not allocate an app recovery repair from this older failure. |

[R] Initial generic 3-PASS/27-NOT-CHECKED receipts are discovery history. Current evidence is no longer wholly NOT RUN. Neither current candidate has complete acceptance. Source-export checks and model-authored contracts do not replace the frozen independent [[Research/QA/Officer/Acceptance-11]] and [[Research/QA/Officer/11-Training-Golden]]. Keep base A=0..60/B=90..150/C=0..60/D=1440..1500, fresh A=30..90/B=120..180 and totals 120/120. Minute zero is day-one 0800. Do not change expected answers to fit a candidate.

## Two bounded assignments

[R] qa-runner: one evidence-only triage, at most 20 active minutes. Write `~/Documents/CDAO/fh-org/qa/Gate-d0f4c69.md`; preserve Gate-631849f.md as history. Read the current gate log, tests at the recorded revision, original seven reproducers and the changed verifier/exporter source. List all 20 failing names exactly once with file/line evidence, actual assertion, environment versus product versus unresolved classification, owner and smallest next proof. Explain any test-denominator difference without inventing missing passes. For each H1/V1/E1-E5, record the relevant changed seam and matching reproducer needed before closure. Reuse existing cases; create no suite and execute no repository programs. Finish with one consolidated permitted-runtime request for main, not twenty separate runs. Unproved causes stay unresolved.

[R] qa-officer: one evidence-only candidate review, at most 20 active minutes. Write `Research/QA/Officer/Acceptance-Review-Run1.md` and correct the current verdict in that folder's README. Read the two latest receipts above, their relevant DOM/screenshots/downloads and staged guides, plus [[Research/QA/Acceptance/Officer-Walkthrough-11]]. Prioritize factory output; use CLI only to compare backup coverage. Map remaining NOT CHECKED rows into one concise matrix with exact receipt/evidence paths, observed content, limitation and owner. Assess whether conflict explanations identify the failed supplied constraint and preserve editable requests. Inspect imported-review and edited-envelope evidence without treating rejection of an edit as approval of changed input. Confirm the factory clock mismatch and retain CLI's corrected recovery result. Record missing readable-summary export, guide mismatches and source/audit/path-to-fleet gaps. Identify N1/N2/N3 evaluator rejection separately from actual app rejection. Do not fill a person's acceptance decision or claim a live walkthrough from captured evidence. Supply only concrete residual browser steps to main.

[R] Both seats finish once and become idle. No periodic status polling, new golden keys, repeated ordinary-child check, participant recruitment, repo execution, browser launch, install, provider call, login or candidate/source edit. Append outcome, verification and next action to each seat's .tmp/JOURNAL.md. The assignment JSON names allowed output files and done conditions; local Sprint/session handoffs stay inside each seat's folder.

## Main QA lead coverage

[R] Main remains the sole runtime and acceptance owner; the organization runner supplies permitted launches. Existing execution authority persists, with no new charged run granted here. Preserve checker/oracle/adapter hashes and candidate manifests, including the CLI correction. Do not combine results from different candidate bytes or attribute either candidate to d0f4c69. Record modified-source patch, route, run, manual edits and environment separately.

[R] After the officer review, resolve only evidence gaps that matter to accepting the selected artifact: plain conflict/invalid/exhausted states, proposed wrong-draft boundary, readable summary, review version binding, guide and human decision. Resolve harness ambiguity before requesting application repair. Confirmed generated-app defects go to Engineering for agent-instruction/skill changes under the overseer's direction, not hand-edited output. Do not launch another full build merely because a receipt failed.

[R] For final acceptance, stop writers, retain shutdown evidence, stage the exact deliverable, enumerate sorted relative paths, lengths and independent SHA-256 digests, and reject unsupported dependencies/links. Test those copied bytes with network disabled, fresh input, review and saved-file recovery. Recheck identity afterward and bind a separate human decision to the final manifest. A stopped-writer attestation is not independently observed process termination. Changed bytes require affected acceptance and fresh review. Retain original failures; do not claim software-enforced immutable export from this manual procedure.

[R] Any claimed executable package needs separate extracted-package, OS/architecture, cold-launch and recovery evidence. Hosted preview, Electron factory and delivered task are three different surfaces. New deployment configuration or a branch tip proves no deployed identity or runtime success. No deployment or publication is allocated.

## Answers and coordination

[E, feed-31] Neither QA seat submitted an explicit QUESTION. qa-runner's receipt correction and qa-officer's trial preparation are complete. [R] Answers: main keeps runtime; officer now reviews actual candidate evidence; runner triages the new gate; development keeps export and verification fixes. Snapshot-31 has code seats disabled and duplicate dev-1 queue entries. Engineering/overseer own enablement and deduplication; these QA tasks are document work and do not create competing code assignments.

[R] Answer Agentic's readiness question with Real-Build-Run1 and the overseer memo: one authorized modified-copy run completed. Its old blanket HOLD/no-completed-build language is stale; final acceptance and shipped control claims remain open. Engineering already owns that reconciliation. Product should use the corrected CLI receipt, not its earlier recovery failure. Preserve existing research and trial materials; no new research round.

[R] Dan retains src/, studio/, index.html and CSS. No frontend edit is allocated. Keep [[Research/QA/For-Dan]] as the existing defect handoff; U1/U2/U3 need revision-specific recheck before being called current d0f4c69 defects or fixes. New control labels, model locking, catalog refresh/fallback and browser absence are targeted checks only if the actual factory demonstration depends on them. Do not restore removed interfaces or repeat the old catalog sweep.

[R] Keep Wednesday 6 PM accepted-task and 7 PM final-evidence gates, Thursday noon code freeze and 2 PM EST portal deadline. Product owns the morning human decisions: user/process confirmation, consenting trial, artifact approval, category/partial-scope/sync ruling and submission. Naval Agentic AI remains proposed, not approved. ID 36 stays conditional and unassigned until one accepted artifact and a successful repeatable route justify it.

[R] Retain all six Fleet-Ready items from [[Research/RandE/Ideas/Scalability-Evidence]]: offline, human authority, cited sources, auditable actions, reconnect sync and one-page fielding path. Local save/import is not sync. Source labels and logs need actual artifact evidence; the path document does not establish owner commitments or authorization.

[R] Use PASS for a supported match, FAIL for an observed mismatch, NOT RUN for unperformed work, BLOCKED for a demonstrated barrier, NOT IMPLEMENTED for an established absence and NOT CHECKED for unresolved evidence. Keep receipt statuses intact; explain reclassification in the human review. Synthetic/public inputs only. Humans approve scope, charged execution, final bytes and submission. Monitor time, usage where available, file changes and failures. Stop and escalate prohibited data, uncontrolled work or failed shutdown to main/overseer. No real assignments, official calendar writes, credential handling or outward messages.
