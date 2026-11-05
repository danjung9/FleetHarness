---
type: review
status: complete
owner: mukul
updated: 2026-11-04
summary: "Round 1 id12-optask is unsatisfactory: passing synthetic journeys leave defining card outcomes unverified."
---

# Challenge 12, round 1

VERDICT: unsatisfactory

WHY: [E, requirements, scope, source and receipts] The delivered app parses an invented EVENT/TASK grammar and requires manual category choices. It does not demonstrate the card's conversion of mock USMTF into a consolidated schedule covering frequency plans, crypto change-over windows and flight quarters times. `requirementsMet` is false. This is an established scope shortfall, with additional incomplete evidence, rather than merely an unavailable browser check.

FIX: [R] Correct the factory's completion gate and acceptance planning so passing recipe checks cannot satisfy a card whose defining requirements are deferred. Preserve this result and route it through the existing agentic-architect automation. Require source-linked primary-task evidence before a later build can count as satisfactory; do not repair this generated app by hand or weaken the original card.

[E, existing judgment and Scoreboard] This updates the existing judgment for `R1/id12-optask` in place. The scoreboard already records the same negative outcome as `NOT`. It is one judgment of one artifact, not another attempt, independent vote or satisfactory count. Main owns the scoreboard, runtime and failure routing. No new runtime result or human acceptance is claimed.

[E, Scoreboard and final.json] Retained measurements are **one repair, 9.7 minutes, 232070 uncached-plus-output tokens, 12/12 tests, 8/8 browser journeys, three demonstrated criteria and four unverified criteria**. Provenance is **patched-d0f4c69**: the scoreboard names scratch changes to `electron/codex-account.ts`, `electron/codex-rpc.ts`, `electron/codex-session.ts` and `verification.ts`, using `gpt-6.1-sol` on the event route. This is not an unmodified reviewed-branch run and is not attributed to current mvp `1d9eeee`. Per-stage time, gross input, monetary cost and a complete patch digest are unavailable in this review copy; the 4826 ms report duration is verification time, not total build time.

[E, verification.md] The repair history reports seven initial passes, then seven passes and three failures after added regressions, then twelve final passes after one bounded implementation repair. The failures concerned approval surviving oversized input, UTC year-boundary ordering and embedded carriage returns. The successful final receipt does not erase those failures. These are retained reports, not tests rerun here.

[P, captured requirements.md] The card requires the three named kinds of information to be extracted from formatted message text and displayed on a synchronized 24-hour visual schedule. [E, scope.md] No narrower user-approved scope or actual-format mapping was supplied. The proposed synthetic slice is explicitly a recommendation, not a waiver of the card.

| Criterion | Available evidence [E] | Judgment |
| --- | --- | --- |
| UC12-1 | Frozen plan defers it with no journeys. Source recognizes generic EVENT/TASK fields; category is a separate user annotation. No reviewed USMTF mapping is supplied. | Unverified, central card outcome unmet. |
| DELIVERABLE12-1 | Frozen plan defers it with no journeys. A dated UTC timeline exists, but no mock-USMTF conversion or owner assessment of the complete workflow is demonstrated. | Unverified, central deliverable unmet. |
| MSG-01, MSG-02, MSG-03 | Reported passes for source spans, rejecting ambiguous/invalid timestamps and UTC normalization. Core tests use actual inline app logic and literal assertions. | Credit the demonstrated synthetic scope only. |
| MSG-04 | No independent held-out corpus, reviewer, matching rules or agreed threshold. Consistency test compares two loads of the same implementation. | Unverified. A test name claiming an independent sample answer does not establish independent domain validation. |
| MSG-05 | Self-contained source and a clean reported offline first-open check; frozen plan expressly defers the complete disconnected task. | Unverified. First-open is not end-to-end offline completion. |

[E, source, README and captures] Useful behavior is implemented: source inspection, validation, deliberate review, UTC bars, cross-midnight segments and reviewed JSON export. The sample has a radio check and briefing, with no crypto window, flight event or frequency values. A user must choose each category. The three first-open/click/narrow captures show empty or rejected-empty states; two inspected journey captures show a generic reviewed interval and its next-day segment. Those pictures support useful partial mechanics, not the defining transformation. No obvious canned output or no-op control was found in the inspected source; this is not a fresh interaction claim.

[E, frozen plan and tests] Eight journeys are four scenarios at desktop 1280 by 800 and narrow 390 by 844. They cover trace/review/export, UTC boundaries, invalid-input recovery and edited-draft blocking. They do not exercise all three requested categories, the full sample-button walkthrough, TASK-point rendering or category changes through native controls. Download assertions check a filename and selected text fragments, not every field in a retained independent output. Node assertions add useful calculation coverage but do not replace those browser steps. README and verification still say browser checks are pending; the later host receipt supplies the eight planned passes at its stated scope.

[E, first-open.json] The receipt has empty page-error, console-error, external-request and click-error arrays, five unspecified clicks, `blank: false` and `overflowNarrow: false`. [E, Scoreboard] Its owner labels this offline first-open. The JSON itself does not identify a disconnection method or completed input-to-export task. Trace headers identify Chromium, Chrome channel and Darwin, but not exact browser/OS versions; they show no explicit offline setting. No complete disconnected-task capture is present. README/source also establish session loss on reload and no import/restore. Those recovery limits are disclosed, not silently treated as a new original-card requirement.

[E, 12-Timeline-Golden.md] The existing key covers invented EVENT/TASK examples, three category labels, dummy plan/channel text, time arithmetic and source spans. It explicitly does not establish actual USMTF support, numeric-frequency validation or operational suitability. It was not run against this copy, is visible to builders and cannot fill MSG-04's missing held-out domain evidence. No new oracle, operational input or actual-format mapping was created.

[E, local SHA-256 inventory] Judgment binds to `Research/QA/Ten/R1/id12-optask/` and the following copied bytes. The [local evidence inventory](.tmp/id12-review-manifest.json) records all 38 supplied files, including source, tests, guides and captures. All 17 files in the earlier review inventory remain byte-identical. This inventory is a local observation, not a host-attested copy manifest.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| index.html | 17437 | `7a6267696266b3dae240f8bc324c16f4ec271a360c53dea0e71f03decafcd0df` |
| requirements.md | 1063 | `03d7cf160010a653a25ec73d68936084d5bc9f1d1955efe319e1e08b434934e4` |
| acceptance-plan.json | 12618 | `a87279a69dbf91937f578ae715b8d9e717cebdbaf1950c43cfca86a926be6bae` |
| ux-spec.json | 3789 | `b553198d1d05fc11c2d5b92b645b5eb4055213b4b1a7c906145492168e873591` |
| test-report.json | 11237 | `e95583a2d8f37c875045d3192946f4ddde2a3b78d4a2bd2c8f8fb8a7cfa02acc` |
| final.json | 12076 | `a584abed6e8f268285dd9522bfa7937d15ce6824b2b5dc6ae8d4f23ab7b5a991` |
| first-open.json | 215 | `91bdba342d5e8d2ea3582eb8f51fa503a256f13d06b2db641f20ac4fe3818a3d` |

[E, parsed receipts] `final.json.report` equals `test-report.json`. Receipt time is `2026-11-04T21:05:16.064Z`; challenge ID is `12`. Recorded workspace suffix is `160fdf74-0be4-4a44-a266-ce11d6368a9b/c5917ae3-dc38-444b-a5a5-d8c26dc6c621`. Reported aggregate source identity is `94cff89336b5240f3abbab56e47255cee34396e9c24154f2e0c946934f6dfd7d`; reported contract identity is `ac51203e0a7681459a22663bb6bae2fc845ff003c45b913ba1dd0719241c834a`. These aggregate values are preserved as reported, not equated to individual file hashes or independently reproduced.

[E, file inventory and trace headers] All eight referenced screenshots and eight trace ZIPs exist under `.quality-evidence/10fe6d11ea71-85617333-9ad6-4d1e-abd0-3699fd316003/`; none of those references is missing. Five images were inspected, and eight trace headers were read without replay. Missing from the review copy: host `MANIFEST.json`, original `.fleet/packet.json` and quality-contract inputs, exact checker revision/hash implementation, full scratch-patch identity, exact browser/OS versions, standalone downloaded `reviewed-schedule.json`, independent mapped-domain results and a complete disconnected-task capture. The copied frozen-plan bytes can be identified, but their original freeze enforcement and equality to the aggregate contract hash cannot be independently established from this bundle.

[R] Smallest factory proof: use this existing card/plan/report triple as a regression for completion classification. With both central criteria deferred and `requirementsMet: false`, the expected outcome is partial/unsatisfactory plus one existing failure handoff, even when 12 tests and eight journeys pass. Actual behavior is automatic-bar PASS and review reached with the primary task deferred. Preserve automatic-bar metrics if useful, while preventing them from becoming full-card success. Main and the existing agentic-architect automation own this correction; no duplicate queue or launch is requested here.

[R] A future positive judgment needs an explicitly reviewed, permitted synthetic mock-format mapping and independent expected outputs covering all three card categories. Missing mapping remains a recorded gap. Main then runs only the changed primary workflow and remaining offline proof on exact saved bytes: disconnect before opening, enter fresh permitted input, inspect and review the resulting 24-hour schedule, exercise one invalid-input recovery, and download and compare the complete result. Retain manifest, contract/checker identities, environment versions, network-disconnection evidence, screenshots and exact download. Existing golden examples can support their documented synthetic checks only. No further runtime is needed to establish this current negative verdict.

[E, source and guide] Approval/export guards and synthetic-only notices keep review visible; no operational integration is implemented. [R] Human scope and final acceptance remain separate decisions. Monitor exact inputs, artifacts and failures; stop and escalate prohibited data or lost traceability to main, whose runtime shutdown authority is unchanged. No browser/model launch, app edit or outward message occurred in this review.

[E] Sources: supplied requirements, scope, README, source/tests, frozen acceptance/UX plans, final/test/first-open reports and retained captures; [[Research/QA/Ten/Scoreboard]], [[Research/QA/Ten/QA-Lead-Notes]], [[Research/QA/Officer/12-Timeline-Golden]], [[Ops/Directors/Directive-qa]]. The original card URL is https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12, read through the supplied requirements capture, not a new portal visit. Disclosure and central-log handoff are in [[Research/QA/Officer/Sprint/Judge-R1-id12-optask]].

