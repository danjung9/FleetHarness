---
type: directive
status: active
owner: mukul
updated: 2026-11-04
summary: "Judge real catalog builds as receipts arrive, reconcile existing runtime evidence once and preserve independent acceptance."
---

# QA instructions

[P, latest direction] Follow [[Research/Agentic/Flow-Goals]] and the 15:50 order in [[Ops/Directors/Memo-overseer]]. Ten satisfactory end-to-end catalog builds govern priority. This replaces the previous one-artifact-only allocation. Plan/Findings remain historical where Review and the newer order supersede them. Thursday noon is the code freeze; portal submission is Thursday November 5 at 2 PM EST.

## Work now

[E, feed-51 and deliverables] qa-runner completed the twenty-failure triage; qa-officer completed [[Research/QA/Officer/Acceptance-Review-Run1]]. Accept both as document reviews with their stated limits. Neither is a new runtime run or human acceptance. No explicit QUESTIONS were submitted by either seat.

[R] Assign qa-runner one evidence crosswalk, capped at 15 active minutes, after any active benchmark failure needing its evidence support. Update `~/Documents/CDAO/fh-org/qa/Gate-d0f4c69.md` using the existing Auto receipt and available retained logs. Match each of the twenty failed test names to actual outside-runtime evidence, including revision, command, environment and log location. A summary count supports a suite result, not an invented named-case receipt or root cause. If detailed logs or matching identity are unavailable, retain that precise gap and request the existing receipt from main once. Do not rerun or re-triage source.

[R] Preserve the sandbox FAIL and its five demonstrated launch barriers/fifteen unresolved causes. Credit the separate outside result at its stated scope. Distinguish the two suites, five smoke failures and seven historical defect reproductions. Record the behavior still unreached by each failed smoke and the existing dev-3 owner. End with one short main-runtime handoff, then idle. No new suite, repository execution, browser launch, provider call, login, installation, product edit or smoke-file edit.

[E, closing recheck] [[Research/QA/Ten/Scoreboard]] appeared during this meeting. Round 1 now has one completed result, id12-optask: automatic bar PASS, judge pending, 12 tests/eight journeys passing, one repair, 9.7 minutes and 232,070 uncached-plus-output tokens. It uses d0f4c69 plus a scratch four-file patch, not an unmodified reviewed-branch run. The final report has requirementsMet=false and four unverified criteria, including UC12-1 and DELIVERABLE12-1, the actual card requirements. No satisfactory result or performance target is established.

[R] Assign qa-officer the independent judgment of this exact artifact now, ahead of the crosswalk. Write `Research/QA/Officer/JUDGE-R1-id12-optask.md`. Coalesce with any automatically queued judgment of the same round/challenge; one seat, one file, one verdict. Read requirements, scope, guide, final/test/first-open reports, frozen journeys and available source/captures. Compare the delivered synthetic slice to the original card, not only its added MSG criteria. Separate useful partial behavior from challenge satisfaction. Do not count the full challenge satisfactory while its central requirement remains unverified. Retain evidence for the repair, unsupported independent-answer-key claim and first-open versus full offline workflow distinction. Record manifest/identity gaps and the smallest main-runtime check only when needed; no invented domain validation. Existing `12-Timeline-Golden.md` is an evaluation aid with its own scope, not proof that the card requirements were supplied or met. No new operational examples or live data.

[R] Main/benchmark retains execution, scoreboard updates and automatic failure routing. Keep the independent verdict separate from a person's final acceptance. Finish the supplied judgment once; trigger later judgments only on new receipts. Do not poll repeatedly or fabricate missing results.

## Benchmark judgment

[R] For each available result, qa-runner checks evidence identity and qa-officer supplies the independent satisfactory/unsatisfactory/incomplete judgment. The benchmark remains the single runtime owner under main's supervision. These responsibilities do not authorize duplicate builds or turn this document into a second task queue.

[R] A challenge counts only when the receipt shows the catalog card and recipe, exact reviewed source commit, actual engine/model route, run identity, no human-written brief or output repair, autonomous arrival at review, passing genuine tests and every planned browser journey, error-free offline opening, and a satisfactory independent judgment. Inspect task meaning, fresh input, failure explanations and recovery where relevant to the card. Compare generated criteria with the card so self-selected tests cannot silently omit requirements. A sandbox/selector barrier is incomplete evidence; unsupported requirements remain explicit.

[R] Bind each judgment to copied artifact paths, lengths and SHA-256 digests, checker/contract identities, browser/OS, receipts and observed limitations. Generated tests and an automated review click are not independent judgment or human approval. Keep initial success, automatic repairs/retries and total attempts separately visible. A successful retry does not erase the first failure. Changed bytes require affected checks and a new judgment.

[R] Route failed builds through the existing automatic agentic-architect handoff with exact input, expected/actual behavior, artifact identity and smallest reproduction. Repair the factory, prompts or skills through Engineering. Never edit the generated app or weaken the oracle to improve the score. Leave the scoreboard to its runtime owner; seats write only in their own allowed folders.

[R] Report per-stage and total elapsed time, uncached-plus-output tokens and gross input separately when measured. Missing usage/cost stays unknown. The curated baseline in Flow-Goals is not a matched ten-card benchmark. Do not claim under-eight-minute, under-200,000-token or ten-of-ten success without comparable receipts.

## Evidence to carry forward

| Evidence read [E] | Decision [R] |
| --- | --- |
| Runner Gate-d0f4c69: 96 unit passes/20 failures plus 51 harness passes | Preserve combined 147/20 sandbox history. Historical 403/410 additional scenarios are another denominator. |
| [[Research/QA/Auto/d0f4c69]] and [[Research/QA/Auto/Review-d0f4c69]]: outside sandbox, 116/116 unit and 51/51 harness; four smoke passes, five failures | Credit reported suite success; crosswalk exact cases once. Activity needs coherent run identity; Electron needs the current catalog control; Home needs intended fresh/returning layouts; model/system-design starts need scoped controls. Dev-3 owns repairs and main owns behavioral reruns. The login smoke starts/cancels real protocol flow, so the whole suite is not fixture-only. No completed login or live inference follows. |
| [[Research/QA/Acceptance/Review-Candidates]] and officer review | Pipeline edf3150f retains 33 PASS/1 clock FAIL/14 NOT CHECKED; corrected CLI af6357a9 retains 28 PASS/18 NOT CHECKED. Both pass fresh offline import. Counts include infrastructure. Neither is human accepted or a card-only benchmark result. |
| [[Research/QA/Acceptance-Reconcile-d0f4c69]] and feed-51 | E1/E2/E4 have source guards; H1 has a separately reported fix/review. No blanket closure follows. H1/V1/E1-E5 need matching reproduction on the integrated revision. Preserve original failure records and fresh verification after digest-format changes. |
| [[Research/QA/GUI-631849f/Stop-Child-Runbook]] and [[Research/QA/GUI-d0f4c69/Detached-Stop-Runbook]] | Ordinary Pi child Stop passed at 631849f. Detached d0f4c69 fixture is prepared, runtime pending. Main owns it; do not repeat the ordinary-child case. Cleanup success cannot convert Stop failure into a pass. |

## Main QA lead coverage and answers

[R] Answer Agentic's clock dependency: the key's 0800 origin and separate readable-summary export exceed the delivered briefs. Preserve key and raw results; record scope reconciliation for human decision. The factory's exhausted-state explanation contradicts its unknown-feasibility headline and is a supported clarity defect. CLI recovery repair is not required by the corrected evidence. Reuse the officer matrix instead of another evidence review.

[R] Main retains four execution responsibilities: benchmark launches/receipts; Auto reruns after dev-3's smoke changes; native/packaged containment plus the prepared detached-Stop case; selected-artifact residual acceptance. Engineering owns code integration and exclusive files, including dev-2/builder's backend overlap and dev-3's verifier. Do not launch generated tests twice or outside the required boundary just to count registrations. A synthetic launcher pass cannot establish native containment.

[R] For the selected ID 11 artifact, reuse unchanged numeric and recovery receipts. Remaining work is proposed-wrong-draft rejection, consistent changed-import review binding, guide following and the human scope/acceptance decision. The officer matrix names exact residual steps. CLI G08/G09/G11/V14 stay unchecked unless existing supported input boundaries express those exact cases. Keep evaluator rejection separate from application rejection. Human-only decisions remain on Product's morning list; their absence does not stop independent benchmark work or justify invented approval.

[R] Final delivery needs stopped writers, independent acceptance of the exact copied bytes, offline cold launch/recovery, identity recheck and human acceptance bound to the manifest. Operator shutdown attestations are distinct from measured process termination. No automatic export-integrity, durable audit or reconnect-sync claim follows from a manual copy or local save/import. Reuse [[Research/RandE/Ideas/Scalability-Evidence]] and existing trial materials; no connector, new trial protocol or research round is assigned.

## Teammate changes and limits

[E, final relay at 16:03:16] mvp remains d0f4c69. Windows branch `codex/fh-001-windows-installer` advances from f3dcca1 to 5e78e5b. The earlier batch adds installer provenance and awaited verification shutdown; its overlapping verification/export tests remain Engineering's integration responsibility. The latest package.json-only change adds `--test-concurrency=2` to the main test script on all platforms. It changes test-file scheduling, not test selection, agent concurrency or shutdown behavior. [R] Reread both relays before and after work. Preserve the cap, Windows path/junction, line-ending and process-tree coverage. Direct Node commands must record whether the cap is supplied; old commands/results do not validate the new revision. No frontend file changed in this latest delta.

[R] Windows release claims need exact installed provenance and target-OS install, restart, upgrade, Stop and export receipts. A same-source two-version fixture does not establish arbitrary historical upgrade compatibility. Hosted preview, desktop factory and delivered task remain separate surfaces. Main/overseer owns the exact-5e78e5b Windows rerun if that delivery target is selected; retain command, same test set, duration, failures and environment. Hold this separate work behind benchmark failures. No Windows execution or reliability improvement is established by the relay. No release activation, deployment, publication or admin action is assigned.

[R] Dan owns src/, studio/, index.html and CSS. Dev-3 adapts smoke assumptions to his interface; QA does not restore removed layouts. [[Research/QA/For-Dan]] remains the local frontend handoff. U1's removed surface is superseded; U2 still lacks direct Home Stop; U3 has a source correction pending runtime proof. No message to Dan.

[R] Use synthetic/public inputs only. Never read credential stores, enter credentials, send messages, change official systems or publish. Existing execution authority persists; this directive adds no unbounded spend or separate live-run authority. Monitor elapsed time, usage where available, source changes and failures. Stop and escalate prohibited data, uncontrolled work or failed shutdown to main/overseer, using the authorized environment shutdown fallback. Humans retain scope, execution-limit, final-artifact and submission decisions. Keep PASS/FAIL, NOT RUN, BLOCKED, NOT IMPLEMENTED and NOT CHECKED distinct. Finish each assignment once, update the seat journal and local Sprint/session handoff, then idle.
