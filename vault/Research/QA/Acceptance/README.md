---
type: test-plan
status: ready
owner: mukul
updated: 2026-11-04
summary: "Independent browser acceptance of the exact delivered synthetic ID 11 page, with incomplete discovery kept visible."
---

# Independent task-app acceptance

[R] The acceptance contract is [[Research/QA/Officer/Acceptance-11]], using [[Research/QA/Officer/11-Training-Golden]]. The entry point is `accept-training.mjs`. Its target is a final folder containing `index.html` and local companion files. It must exercise the actual page in existing Chrome through Playwright. It may not import candidate functions, trust candidate tests, manufacture observed values from expected answers or use private application storage as an oracle.

[R] Stop all candidate writers and identify each final copy before execution. Keep the factory-generated and direct-CLI candidates separate, with their actual build routes. Use a clean browser context with network disabled before opening the exact file URL. Existing Chrome and Playwright are required; no installer, live provider, login or credential is part of this checker. The main session owns execution in its independently permitted environment. This QA environment's existing browser/loopback restriction is not retried or bypassed.

## Run and interpret

[R] Replace the two placeholder paths with the actual final candidate folder and its existing stopped-writer receipt. Use the same frozen script on both candidates. The output folder receives a unique run directory. `--chrome` may name an existing Chrome binary if the default installed path differs.

```sh
node ~/Documents/CDAO/Fleethacker-Vault/Research/QA/Acceptance/accept-training.mjs \
  /absolute/path/to/final-task-app \
  ~/Documents/CDAO/Fleethacker-Vault/Research/QA/Acceptance/Results \
  --deps ~/Documents/CDAO/fh-org/gui-631849f \
  --writers-stopped-evidence /absolute/path/to/operator-receipt.md
```

[E, implementation] Exit codes are 0 for all applicable checks passing, 1 for an observed failure, 2 for setup/harness/cleanup error and 3 for incomplete coverage. `result.json` retains every check, DOM observations, screenshots, downloaded files and manifests. Known form limitations are UI LIMITATION and keep the result incomplete. OUT OF BRIEF is counted separately and does not become a product failure or a pass. Human guide/decision and ambiguous evidence remain NOT CHECKED, so a successful automated subset can still exit 3. Do not convert that result to overall acceptance. The optional stopped-writer file is recorded as an operator attestation and hash, not independently verified shutdown.

[E, direct preparation verification] The final script passes Node syntax checking and its pure evaluator self-check. It validates seven feasible expected answers, rejects N1/N2/N3, numeric strings, duplicate IDs and malformed membership values, and accepts harmless extra diagnostics. Additional controls check room-only contention, cross-day minutes and chronological rest. No candidate was inspected or executed and no browser was launched during preparation.

## Required evidence

- [R] Record the exact artifact file set and hashes before and after acceptance, browser/runtime versions, checker and expectation hashes, timestamps and caller-supplied stopped-writer evidence. Store receipts outside candidate write authority.
- [R] Run G01 through G12b, the four outcomes and independent extra variants frozen before candidate inspection. Compare the exact request multiset, durations, people, rooms, start/end values, windows, qualifications, chronological rest and horizon totals. Keep displayed totals distinct from independently calculated totals.
- [R] Prove the evaluator rejects N1 overlap, N2 missing D and N3 disallowed start/rest. App rejection needs an actual supported proposed-draft boundary; an evaluator rejection alone is not an app pass.
- [R] Establish reviewed base input, edit to the fresh case, and inspect review immediately before another check. Rechecking cannot silently approve the new result. Observe an explicit fresh review.
- [R] Save an actual draft download and readable summary. Close the context, start a new offline context with no previous storage, import those saved bytes and compare complete fresh inputs, four assignments, totals and review binding. A local-storage reload is not an import test.
- [R] Where controls, schema or results cannot be uniquely discovered, retain NOT CHECKED and the captured evidence. Distinguish this uncertainty from an established UI LIMITATION, with its exact boundary and evidence. A separate summary absent from the reviewed public brief is OUT OF BRIEF; retain it as an additional QA expectation without calling it a build failure.

## Independent extra cases

[E, manual derivation and separate Python standard-library enumeration before candidate inspection] These inputs are independent evaluation variants, not security-isolated holdouts. They live in the shared vault and were not supplied in the public build brief by this QA assignment. Reset every unlisted value to the golden base.

| Case | Edits | Expected result |
| --- | --- | --- |
| V13 | A duration 45; B starts 60 or 75 | Unique A 0 to 45, B 75 to 135, C 0 to 60, D 1440 to 1500. Totals 105/120, chronological rest 30/1380. |
| V14 | C uses Room-1; C starts 0, 60 or 150 | Unique A 0 to 60, B 90 to 150, C 150 to 210, D 1440 to 1500. Totals 120/120, rest 30/1230. Touching room endpoints is allowed. |
| V15 | P02 maximum 119 minutes | Infeasible: C and D total 120 across both days. Keep all four requests. |
| V16 | A starts 120; B starts 30 or 60 | Unique B 30 to 90 before A 120 to 180; C 0 to 60, D 1440 to 1500. Totals 120/120, rest 30/1380. Compare by ID, not input order. |

[R] Review screenshots and structured observations for stale examples, ambiguous status wording, dropped requests, hidden accepted output and unsupported input coercion. A green outcome alone is insufficient. The result needs complete current data and the correct branch: feasible, infeasible, invalid input or exhausted search. A checker-only fallback cannot claim a search outcome it does not implement.

[R] Keep automated findings beside [[Research/QA/Acceptance/Officer-Walkthrough-11]]. A person decides whether the exact accepted bytes and disclosed partial scope are useful. This process does not issue a schedule, certify policy compliance, publish an app or authorize a submission.

[E, preparation check] Independent enumeration of only the supplied synthetic constraints found one answer each for V13, V14 and V16 and zero for V15, matching the table. This calculation did not import or execute candidate code, open a browser, or establish application acceptance.

[E, implementation review] The checker stages regular eligible payload files under its evidence folder and compares source and staged manifests. Excluded hidden, credential-like or linked entries keep complete-payload coverage NOT CHECKED. A staged copy is the tested artifact; the original directory is not silently called accepted. Main must stop writers and retain the exact delivered-file scope.

## Explicit adapters after first runtime discovery

[E, main-session receipts] Initial generic runs on Pipeline-run1 and CLI-route each recorded 3 PASS and 27 NOT CHECKED. The passes covered attestation and payload checks, not scheduling. Those receipts remain in Results. Schema discovery could not bind the page controls to the canonical contract.

[R] Rerun the same CLI with `--adapter pipeline-run1` for `Research/TaskApp/Pipeline-run1`, or `--adapter cli-route` for `Research/TaskApp/CLI-route`. Keep the corresponding existing stopped-writer receipt and output arguments. The adapters were discovered from those exact pages and retained DOM captures. They change representation and UI navigation only; the 17 frozen oracle cases and expected answers are unchanged. Script and selected-adapter hashes are recorded in the new receipt.

[E, source inspection] Pipeline-run1 uses `operatingWindows`, person `availability`, single person/room/qualification fields and board cards. The adapter fills its actual JSON editor and a synthetic reviewer label, and reads rendered times, membership, totals and review text. Its board maps minute zero to midnight while the frozen officer key maps zero to 0800. The checker preserves this as a separate CLOCK-DISPLAY failure; numeric-minute results stay separately assessable.

[E, source inspection] CLI-route exposes labelled form fields and selected start options, plus a portable JSON format. Its adapter accepts only the exact known import/reset confirmations. It does not coerce G08 duplicate IDs, G09 quoted numeric types, G11 removal of an availability window or V14 room reassignment through controls that cannot express those values. Those exact form variants remain NOT CHECKED. Both candidates omit a separate readable-summary download. Their saved-review policies differ: pipeline snapshots can retain historical review, while CLI saves omit it; both require fresh current review after import.

[E, preparation verification] Revised checker and both adapters pass syntax checks. Pure evaluator controls still pass. Pipeline schema mapping was compared with the actual captured native download, including preserved invalid scalar types and unchanged old result/review in a tampered-envelope test. No candidate function was imported or executed and no browser was launched here.

## Retained candidate outcomes

[E, reporting revision 3] Both explicit Run1 adapters are ready. They already drive input, solve, rendered assignments/totals/outcomes, review, actual save and fresh offline import. The new reporting distinguishes established form limitations from missing observations, with no change to the 17 cases, evaluator, golden key or acceptance contract. Historical receipts below retain their original labels and counts; no new runtime receipt is claimed for this reporting revision.

| Candidate and adapter | Existing stopped-writer receipt | Known input limitation |
| --- | --- | --- |
| `Research/TaskApp/Pipeline-run1`, `--adapter pipeline-run1` | `Research/QA/Acceptance/Receipts/Pipeline-run1-writers-stopped.md` | [E, later receipt] All 17 exact outcome inputs were exercised through its JSON editor. |
| `Research/TaskApp/CLI-route`, `--adapter cli-route` | `Research/QA/Acceptance/Receipts/CLI-route-writers-stopped.md` | [E, inspected form and retained observations] G08 duplicate IDs, G09 quoted numeric types, G11 removal of an availability window and V14 room reassignment cannot be entered exactly through this form. New receipts label these UI LIMITATION. |

[E] CLI portable import exists, and its behavior for those four exact variants was not tested. The form finding does not establish app-wide inability. V14 also changes the fixed room assignment in the supplied brief, so it is an additional evaluation variant rather than an established brief violation. Missing or ambiguous controls still yield NOT CHECKED.

[E, supplied briefs] Separate readable-summary export is absent from Pipeline `requirements.md` and CLI `BRIEF.md`; both require portable save/import of inputs and draft. Each adapter records the reviewed brief digest, and a future receipt labels READABLE-SUMMARY as OUT OF BRIEF only if that exact file matches the copied payload manifest. A changed or missing brief leaves scope NOT CHECKED. The frozen additional summary expectation and historical results are unchanged.

[E, preparation verification] Node syntax and pure evaluator/reporting checks pass. The frozen oracle/evaluator region SHA-256 remains `ee6dc9643add11efdde38b6ec69ec4c6e061e10755dfbd4b4038fcaff1fb8aa4`; both contract files also match their prior digests. Main owns any fresh browser run.

[E, Run2 adapter and receipt] `--adapter pipeline-run2` supports the new labelled form and public two-step replacement preview, preserving the frozen oracle. Run `beb73e23` records 28 PASS, zero FAIL and 18 NOT CHECKED: 13 outcome cases and exact fresh offline downloaded-file recovery pass. G07/G08/G09/V14 remain unsupported; G11 passes. Review clears on edit/recalculation/import, and inconsistent saved inputs/results are rejected without replacing the original. See [[Research/QA/Acceptance/Review-Run2]] for exact identities, main's stopped-writer/Markdown-normalization provenance and remaining limits.

[E, main-executed receipts reviewed independently] Pipeline receipt `edf3150f` records 33 PASS, 1 FAIL and 14 NOT CHECKED, including all 17 numeric/outcome cases and actual fresh offline save/import. The clock failure comes from a mismatch between the frozen key's 0800 convention and the actual brief, which specifies minute zero without that convention. Preserve the raw result and key; do not call it a demonstrated brief violation. Both briefs omit a separate readable-summary requirement. [[Research/QA/Acceptance/Review-Candidates]] records these scope differences and the real Pipeline exhausted-state wording defect.

[E] Corrected CLI receipt `af6357a9`, 15:42:49 to 15:43:09 EST, records 28 PASS, zero FAIL and 18 NOT CHECKED, overall INCOMPLETE. It covers 13 numeric/outcome cases, review clearing, saved inputs and fresh offline import. Saved file 044 and re-exported file 049 are byte-identical. Four exact variants remain unsupported by the form. The previous `aaa1585f` import failure was caused by the checker dismissing the confirmation. The corrected checker records acceptance and waits for the import outcome; no candidate change was required. The earlier receipt remains as an invalidated attempt. G08/G09 detail text incorrectly mentions failed import roundtrip; their entered records show unsupported form input and no import attempt. These automated subsets do not supply the officer's final acceptance decision.
