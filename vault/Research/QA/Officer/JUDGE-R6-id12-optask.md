---
type: evidence
status: complete
owner: mukul
updated: 2026-11-05
summary: "R6 ID 12 remains NOT: the invented input grammar does not establish mock USMTF fidelity; prepared-browser offline evidence is retained."
---

# R6 challenge 12 judgment

VERDICT: NOT

WHY: [E] The tool implements an invented SYN-OPTASK/1 grammar. No supplied mapping or conforming synthetic examples establish the original USMTF input requirement. Real extraction, timeline and prepared-browser offline evidence support the substitute workflow, while the automatic FAIL and final pipeline NOT after two repairs remain unchanged.

FIX: [R] Product/main must resolve a releasable documented input subset and independent domain review. The existing Engineering planning audit should reject a mutually consistent substitute protocol/key as proof of the original format. Preserve the current failure and expectations; use a new versioned plan if the prerequisite becomes available. No direct app repair or new repair loop is authorized here.

[E] This is the canonical Officer judgment for the reviewed R6/id12-optask hashes. Initial searches found no equivalent canonical R6 judgment. Existing R1/R101 judgments remain unchanged and do not supply acceptance for R6.

## Evidence boundary

[E] Relative artifact paths below refer to [R6/id12-optask](../Ten/R6/id12-optask/requirements.md). Source/tests were read as text; final/judge/test reports, manifests, supplied screenshots, complete retained outputs, downloads and trace JSON were inspected as data. No generated code, browser, tests or build ran here.

[E] final.json records failed verification with human review and delivery queued. The latest test-report.json at 09:09:44 UTC reports 26/26 tests, 12/12 journey/viewport executions, 15 host evaluation cases and a passed clean service package; `requirementsMet` remains false. The final embedded report differs only in its top-level provenance object. The latest host receipt supersedes verification.md's pending-rerun and earlier 25-test wording within its scope. R6 is attributed by the scoreboard to 5f4eb39 plus scratch changes, not a clean delivered release.

## Original-obligation matrix

| Retained card obligation [P] | Cited evidence [E] | Supported result or remaining gap [E] | Next owner [R] |
| --- | --- | --- | --- |
| Accept raw USMTF-formatted text, using mock messages for the deliverable. | `requirements.md`; `public/domain.mjs:6,14`; `data/README.md`; `format-boundary.test.mjs`. | Unmet format fidelity. Invocation accepts only SYN-OPTASK/1, with an invented banner and custom set fields. No reviewed relationship to a documented USMTF subset is supplied. Mock content does not authorize a replacement syntax. | Product/main supplies a releasable format mapping and reviewed synthetic fixtures; Engineering uses a new versioned plan. |
| Extract frequency plans. | `public/domain.mjs:2,31`; complete extraction outputs; desktop/narrow downloaded JSON. | Substantive synthetic parsing includes frequency, unit, label, ship, start/end and exact source spans. The new offline example retains 278.25 MHz and 11:00 to 12:00 UTC. Format-conforming extraction remains unverified. | Existing implementation owner after the format prerequisite. |
| Extract crypto change-over windows. | Same parser; extraction outputs; offline downloads. | Synthetic label and explicit interval are extracted, including 12:00 to 12:20 in the disconnected example. No actual key material is involved. The required format mapping is absent. | Product/main for specification; existing implementation owner for verified mapping. |
| Extract flight quarters times. | Parser time/selection logic; domain.test.mjs; time-selection outputs. | Synthetic explicit timestamps, invalid times and day clipping are implemented. Downloaded 23:45 to next-day 00:15 preserves 30-minute duration while displaying through 24:00. Required-format behavior is unverified. | Same owners. |
| Consolidate events into a synchronized 24-hour visual schedule. | `public/app.js`; host synthetic-primary/overnight journeys; retained visual ledger and images. | Shared UTC day and event rows are supported for the synthetic grammar. Both widths retain readable category, time and source controls. A synchronized day axis does not establish multi-device synchronization, which this retained card does not request. | Main owns later exact-delivery verification and Product owns usefulness. |
| Make dense source useful for a watchstander's selected ship. | domain.test.mjs SYN-DENSE; dense-ship journeys; complete event/selection outputs. | A 320-line synthetic input and ship filtering are covered in retained receipts. No actual watchstander trial or measured benefit is supplied. | Product/main for a later human trial. |

## Independent format finding

[E] The original requirements name the input format, not merely three output labels. The frozen test-matrix.md calls the primary outcomes implemented while substituting SYN-OPTASK/1 and disclaiming real-format validation. `public/domain.mjs` recognizes FREQPLAN, CRYPTO and FLIGHTQ under that custom envelope. Complete fixture equality in domain.test.mjs establishes agreement with those invented rules. It cannot establish correspondence to the requested format. Verification.md acknowledges that no actual USMTF specification was consulted for the supplied intake grammar. This is a supported scope mismatch plus an absent domain prerequisite, not evidence of an incorrect synthetic calculation.

[E] The final judge's phrase that format-boundary.test.mjs rejects USMTF needs a narrow interpretation. Lines 5 to 24 send an invented placeholder body while varying the API grammarVersion, including the token USMTF. The test explicitly identifies itself as boundary evidence, not conformance coverage. It proves envelope rejection, not rejection of a known valid USMTF raw message. There is no retained conforming-message counterexample. This qualification does not rescue the original requirement: source, protocol and provenance independently establish the substitute grammar.

## Offline and complete-output evidence

[E] MSG-05 is a recipe criterion, separate from the retained card. The initial judge identified missing proof of actual disconnection. The later additional test supplies bounded evidence: `tests/offline.integration.mjs:23` prepares the cache online; line 30 disables browser networking; lines 32 and 49 reload; line 34 requires an uncached health request to fail; later steps enter new raw text, recover from empty input, save, review and download. It never sets the simulation route header. `public/sw.js` imports the same domain core for disconnected invocation.

[E] `repair-evidence/offline-run.json` and offline.tap report two application passes with zero failures. This is a retained development integration receipt, distinct from helper self-tests and independent host acceptance. Both trace archives record setOffline(true), navigator.onLine false, failed uncached health access and two completed reloads. Trace metadata names Chromium through Playwright 1.64.1 on darwin at 1280 by 800 and 390 by 844. Those tools were not launched by this review.

[E] Both complete downloaded files are identical. Independent JSON inspection confirms nine top-level fields, the new original text, synthetic provenance, reviewed-draft status, no unresolved issue codes and three events. Exact tuples are frequency 11:00 to 12:00, 278.25 MHz, 60 minutes, segment 660 to 720; crypto 12:00 to 12:20, 20 minutes, segment 720 to 740; flight 23:45 to next-day 00:15, 30 minutes, segment 1425 to 1440. All 26 retained source/field spans in each download reproduce the corresponding UTF-16 slice. Viewed desktop/narrow schedule images agree with those values. These checks inspect saved evidence; they are not a new offline execution or proof of omitted-event recall on arbitrary input.

[E] The evidence supports use in an already prepared browser cache. It does not prove offline cold launch on an unprepared device, independent delivery/installation, exact pasted-file CRLF preservation, or human acceptance. The original direct browser-launch failure remains retained; the subsequent helper-run pass does not erase it. The final judge no longer lists offline as a remaining gap, which is supported at this bounded scope.

## Disposition and exact limits

[E] Supported implementation gap: required-format fidelity is absent from the implemented contract. Absent prerequisite: a releasable documented subset, reviewed field/time mapping and independent conforming synthetic cases. Missing evidence: any known valid USMTF input/output pair, sealed evaluator inputs/expectations, separate delivered-copy or first-open-offline receipt, and an actual user acceptance decision. No first-open.json or evaluation-plan.json is retained in the artifact or manifest. Source cannot establish these missing runtime/domain facts.

[R] Product/main owns prerequisite availability and the eventual human decision. Engineering's already queued audit should catch this before implementation even when every synthetic key and protocol agrees. Keep the original requirement, test baseline and FAIL. No waiver, revised frozen answer, new grammar invented as authority or extra implementation loop follows from this review.

## Identity and sources

[E] All 228 manifest entries exist. 220 match raw SHA-256; eight differing files are FOUNDATION.md, README.md, data/README.md, plan.md, research.md, scope.md, test-matrix.md and verification.md. The manifest discloses Markdown dash normalization by sync. Treat these as disclosed text-copy differences; all listed non-Markdown application, test, JSON, image and trace entries match. No actual application/test mutation is demonstrated. Exact original Markdown equivalence is not independently proven, and separately retained originals were not accessed. The inventory hashes 231 total files including three additional receipt/manifest files.

[E] Package runtime filesHash is `5e2fdabcc340648986bb46a40fcafad51b43617421a33cdbe717f9a9b65fb6cf`. Individual SHA-256 identities, including decisive parser, test, receipt, image and download files, are in [R6 evidence inventory](.tmp/R6-evidence-sha256.json). [Receipt review](.tmp/R6-receipt-review.json) retains complete outputs and download checks; [offline trace review](.tmp/R6-offline-trace-review.json) records the selected completed trace calls. File digests and composite runtime hashes are different identifiers.

[P] Original card attribution, read only through retained requirements.md: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12. [E] Shared routing is in [[Research/QA/Officer/Handoff-R6]].
