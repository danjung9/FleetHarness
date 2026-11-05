---
type: directive
status: active
owner: mukul
updated: 2026-11-05
summary: "Resolve current benchmark evidence gaps with two bounded reviews while main retains runtime execution."
---

# QA instructions

[P, charter and Flow-Goals] Ten satisfactory catalog builds remain the goal. Current mvp is f2e5422. This directive replaces the old QA allocation. Follow [[Research/Agentic/Flow-Goals]], the charter's overnight decisions and [[Research/Plan/Review]] where it corrects Plan/Findings. Full host/network access is intentional. Do not reopen containment or old Pi-only login requirements. Keep November 5 noon scope freeze and 2 PM EST submission.

## Current decision

[E, meeting 169 read] [[Research/QA/Ten/Scoreboard]] now records R5, started 02:55 on f2e5422 plus a disclosed scratch patch: three finished, zero automatic passes, zero satisfactory. All three saved final.json records say failed with null final reports. Snapshot-169 at 02:49 predates these results. Later queue inspection finds neither QA seat queued.

| Artifact [E, retained R5 files] | Decision [R] |
| --- | --- |
| id12-optask: build log ends with frozen-plan change; final reports unconfirmed cleanup | Runner separates the initiating failure from the final shutdown error. Neither disappears from the handoff. |
| id36-paperless: verify log ends with frozen-plan change; final reports unconfirmed cleanup | Same runner review, one grouped handoff where evidence supports a shared cause. |
| id11-training: build fails independent core evaluation | Officer checks public protocol, frozen expected result and actual host output independently. Generated verification.md alleges contradictory array ordering; that explanation is not a proved evaluator defect. |

[R] Main applies the existing operator shutdown procedure before reusing affected workspaces or launching replacement work when cleanup is unconfirmed. Preserve diagnostic evidence. A generic error proves neither surviving work nor successful termination. Do not disable cleanup, alter the frozen contract or turn missing execution into PASS. This directive does not claim a driver stop or process cleanup occurred.

## qa-runner assignment

[R] Write only Research/QA/Runner/R5-Failure-Triage.md, plus the seat's local journal/disclosures. Read retained R5 IDs 12/36 final.json, log-tail.txt, frozen contracts and available artifact identities. Record each earliest supported failure, later cleanup outcome, missing evidence and exact file/line references. Inspect current host source read-only only if needed to explain error replacement; state its actual revision and distinguish it from the scratch-patched run.

[R] Compare the failure scope with [[Research/QA/Acceptance/Review-3da8ad8]] and later native receipts. Explain why a Pi fixture Stop pass cannot certify Codex or real-build final cleanup. Request only the missing source/patch identity, categorized native cleanup evidence and relevant regression receipt from main. No broad re-audit, real build, browser launch, process scan or product edit. Stop after one actionable report. Do not duplicate architect's queued historical one-shot analysis or Acceptance's checker work.

[R] Done means both failures have a cited chronology, all missing evidence is explicit, the report distinguishes product/fixture/preparation uncertainty, and main/Engineering receives one reviewable return with the exact proof needed to close it. The underlying operating-system cause stays unverified unless retained evidence establishes it.

## qa-officer assignment

[R] Write Research/QA/Officer/JUDGE-R5-id11-training.md, plus local journal/disclosures. Coalesce any automatic judgment queued for this same artifact. Keep VERDICT: NOT because the automatic bar failed. Independently assess the claimed ordering conflict using solution-contract.json, data/synthetic-data.json, .quality-evidence/core-report.json, compute.mjs and original tests. Record file hashes and citations, derive the required ordering from the public contract, and compare the actual failing output with the supplied key. Do not rely on generated prose or run candidate code.

[R] Distinguish an incorrect implementation, contradictory evaluation contract and insufficient evidence. Identify whether the host report's first mismatch hides further differences. A confirmed contradiction becomes a generic planning/contract-consistency repair through the existing owner, with a new versioned run and retained failed evidence. Never rewrite a key to match output. Do not claim the remaining capabilities or original card satisfactory from this narrow finding.

[R] Done means a cited, independently reasoned ordering comparison, an explicit disposition of the model's diagnosis, a preserved NOT verdict and a minimal regression requirement for the factory owner. If decisive expected evidence is unavailable, name it once and finish with that limit. No repeated polling or fresh human trial.

## Main QA lead coverage

| Existing evidence/owner [E] | Next proof and boundary [R] |
| --- | --- |
| Main's all-ten R1 audit and fourteen historical negative officer verdicts | Complete at their historical scope. Retire held ID 32, ID 36 and repeated historical crosswalk tasks. Current R5 reviews add distinct evidence. |
| Acceptance owner: Review-3da8ad8 and Overnight inventory | Preserve the four independently reviewed bounded passes and all F01-F25 gaps. Old browser startup and detached-Pi claims are closed only within their tested scope. No second checker writer. |
| Later 7c8b663 input, native Resume and detached Stop result.json files report PASS; browser recovery also has a later PASS receipt | Main and existing acceptance reviewer retain raw checks, build provenance and exact identities. This meeting read result fields; it did not repeat their full acceptance audit or transfer passes to f2e5422. |
| Charter's landed f2e5422 report: 934/934 unit, 94/94 harness, 16 screen scripts and four native checks | Retain exact commands, compiled identities, raw output and case scope before using these as submission claims. The 02:49 sandbox mvp-gate.md failed dependency installation; it supplies no new runtime pass count and does not rebut outside execution. |
| Acceptance's prepared qa-native-delivery.mjs and qa-native-baseline-resume.mjs | Main executes existing scripts on a stable compiled target and returns receipts to their owner. Preparation is not execution. Full delivery, resumed persisted-test verification, live intended-engine Stop and final-byte approval remain distinct. |
| Existing packaging, container and post-approval-change workers | No duplicate implementation or QA framework. After landing, main supplies changed-input behavior, fresh verification/approval and fresh-destination launch evidence for the actual delivered artifact. |
| Main benchmark owner | Preserve scratch patch and revision identity, terminal receipts and failed attempts; reconcile current rows with real outcomes. Correct the already documented R2 placeholder count and experiment links/verdict without repeating historical investigation. |

[R] Until a new artifact clears the automatic bar, no blanket acceptance sweep or replay of all ten old judgments. For later eligible outputs, officer checks the original card and narrative, all planned journeys, changed inputs and complete delivered results. A decisive missing primary outcome supports NOT; an absent receipt is an evidence gap. Human acceptance, unaided Sailor usability and measured burden remain separate. Reuse RandE's existing trial/evidence material when a person and accepted bytes are available.

## Questions, ownership and teammate adaptation

[E, feed-169] No literal QUESTIONS line or fresh QA-seat report is present. Actionable answers: runtime work stays with main; fixture success cannot settle R5 cleanup; a disputed frozen expectation remains failed until independently adjudicated; corrected rounds never overwrite prior failure evidence.

[R] Engineering/main owns code corrections and serial file transfer. Historical a0d0595/8069a73 review returns are not new allocations: verify current integrated behavior and return only a still-present defect. The latest acceptance review identifies source fixes for publication identity, pending-preview Stop and persisted test filenames; do not repeat old defects as unchanged. No task is assigned to a development seat here.

[E, relay read] LATEST.md at 02:49:23 identifies mvp f2e5422, Dan's branch 29ac921, main b590dae, prod 95b7759 and separate budget/Windows branches. LATEST-analysis.md still describes e27ad6a. [R] Preserve the integrated input preparation, capability contracts, Settings and model tabs, API-key route and Dan's ChatGPT sign-in. Treat older branch-diff removals as historical divergence, not current intent. GenAI.mil is framework only; connector mocks and tab visibility do not establish live interoperability.

[R] Dan owns src/, studio/, index.html and CSS. QA changes none of them. Preserve teammate assertions; adapt any necessary checker selectors through the existing checker owner without weakening outcomes. Read both relays again at completion and carry new relevant changes forward.

[R] Synthetic/public data only. Keep contract, execution, artifact and submission approval points visible. Monitor failures, usage, source changes and owned work. Stop and escalate prohibited data, changed accepted bytes or failed shutdown through main's operator procedure. No credentials, official writes, messages, pushes or publication. Write only inside each seat's assigned folder. Keep .tmp/JOURNAL.md. Stage inaccessible central ledger/session/status updates locally for authorized transfer.

## Allocation

[R] Two unique report files, one per QA seat, are listed in .tmp/tasks-director-quality.json. Coalesce an equivalent queued/running task before dispatch; preserve active ownership. Seats finish once and idle. The JSON is an assignment request, not evidence that dispatch or execution occurred.
