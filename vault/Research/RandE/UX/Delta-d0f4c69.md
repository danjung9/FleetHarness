---
type: research
status: complete
owner: mukul
updated: 2026-11-04
summary: "AppYard source walkthrough at d0f4c69, browser prerequisites and current candidate evidence, with three remaining operator checks."
---

# UX delta at d0f4c69

## Bottom line

[E, Git object reads] AppYard retains Home and Flow; the catalog now sits inside New challenge, while Home presents three examples and saved builds. [R, meeting 31] Prepare the four-request synthetic ID 11 brief through that existing interface and show the task before factory evidence. [E, receipt reads] Real generation and independent candidate checks have run, including fresh offline draft import; neither candidate is human accepted. [E] This review inspected source and existing evidence only, so it makes no setup, repair or acceptance claim.

## Shortest route through New challenge

[E, source-only] Read at `d0f4c690d3f40ac260eb0a291dde75f0d55c4aa5`, using Git objects in `~/Documents/CDAO/FleetHarness`. The route below uses rendered text from `src/Home.tsx` and `src/App.tsx`; it has not been driven at this revision by this review.

| Step | Existing label and behavior | Pinned source |
| --- | --- | --- |
| Open intake | Home -> **New challenge**. Both Home and the shared toolbar expose it. | `src/Home.tsx:50`; `src/App.tsx:258,291` |
| Find the catalog entry | Choose **Norfolk catalog** (followed by the current count), enter `11` in **Find a published challenge**, then select the **#11** result. New challenge initially selects Custom problem, so the catalog choice is necessary on this route. | `src/App.tsx:139,152-157` |
| Review the brief | Selection collapses the list and identifies challenge #11. Review **Challenge title**, **Problem statement** and **Evaluation criteria (optional)**; **Add resources & links** opens optional context. Retain ID 11 linkage while stating the assigned four-request synthetic slice and omissions. | `src/App.tsx:108-134,157-158` |
| Save into Flow | **Save challenge** creates the saved project and calls the project-opening path, which selects Flow for a draft. Confirm the current challenge is the saved ID 11 project. **Build flow** is the initial Flow surface. Saving does not start agents. | `src/App.tsx:61,70,158-159,259-263,309` |

[E, source-only] A shorter alternative bypasses catalog search: Home -> **A training plan that fits** opens the prefilled ID 11 brief -> **Save challenge**. That example creates a brief, not a generated task example. Home -> **Recent builds** or **My builds** reopens saved projects; review/approved/delivered projects open Review instead of Flow. **Brief** and **Save requirements** edit an existing project and warn that tests and approval reset. Sources: `src/Home.tsx:8-14,52-68`; `src/App.tsx:259-263,279,305`.

[E, source-only] **Build model** offers configured models for the selected engine; it is disabled while busy or while any project is running. Model settings supplies the connection route. **Start build** opens a consent dialog; **Cancel** closes it, and **Run Codex agents** or **Run Pi agents** starts work and opens Preview. **Agents** exposes activity. **Stop run** is on the project toolbar, but Home's branch shows New challenge instead. None of these labels proves containment or completed shutdown. Sources: `src/ModelSelector.tsx:14-50`; `src/App.tsx:223-228,257,291-311`. Existing U1/U2/U3 and shutdown evidence stay with Quality at their measured revision.

## Browser setup is a source finding

[E, source-only] `package.json:16,40` declares Playwright 1.64.1 as a runtime dependency and defines `setup:browser` as `playwright install chromium`. `electron/browser-verification.ts:143-157` first tries the default Playwright Chromium installation, then installed Chrome. An explicit browser executable overrides that search; its type comment excludes Node/Electron as the browser binary. If launch fails, the error directs the operator to install Chrome or use `npm run setup:browser` from a source checkout. It says builds do not download a browser. These are dependency and error-path findings, not commands run here or proof that a browser is installed.

[R, inference from those paths] A packaged factory operator needs an available compatible browser; installed Chrome is the fallback identified by the source. Source-checkout Chromium setup is a separate preparation step. Do not turn the relay's packaged-Chrome shorthand into a verified installation claim. `docs/desktop.md` does not document this new prerequisite, and its older Development/Artifacts/Evidence labels and fixed 34-entry count should not override the actual controls and dynamic count in `src/App.tsx`.

[E, source-only] Verification uses a loopback preview and browser server, runs desktop 1280 by 800 and narrow 390 by 844 journeys, and records screenshots/traces. Its default deadline is 120 seconds. Reload and download assertions exist, but there is no retained-file upload/import action in this file's action switch. Host browser results therefore cannot replace Quality's separate saved-file import receipt. Sources: `electron/browser-verification.ts:19,78-125,130-157,158-208`; [[Research/QA/Acceptance-Reconcile-d0f4c69]].

## Three different products and stores

| Surface | Supported source or receipt finding | Claim boundary |
| --- | --- | --- |
| Desktop factory | [E, source-only] The renderer uses `window.fleetHarness` for desktop operations. AppYard is the product name; desktop documentation retains the `fleetharness` application-data directory. | [R] Saving a brief, approving a prototype and packaging an app are separate actions. A changed brand is not evidence of migrated state, a working provider route or accepted output. |
| Hosted browser preview | [E, source-only] Without that desktop bridge, `src/api.ts` saves briefs to `fleet-browser-preview` localStorage. Generation, approval, export, model settings and catalog refresh use desktop-only errors; generated preview returns null. | [R] The hosted interface is a brief/UI preview, not the factory runtime or the delivered task. No browser-to-desktop transfer or deployed-site success is established. |
| Delivered task | [E, attributed receipts] Quality exercised copied Pipeline-run1 and CLI-route task payloads, including fresh offline import. Desktop documentation separately describes a packaged wrapper with storage distinct from the factory preview. | [R] Candidate HTML receipts do not establish standalone executable packaging, synchronization or device authorization. Accept the final copied bytes and task data separately from the factory's project store. |

[E, source-only] Sources: `src/api.ts:5-34`, `package.json:60-88`, `docs/desktop.md:20-38,58-60,74`; design boundary in `docs/desktop-home-direction.md:3-15`. [R] Preserve removed Studio/Workbench history in [Delta-631849f](Delta-631849f.md) and [README](README.md); do not restore their routes or redesign allocations.

## Evidence that replaces blanket unrun claims

[E, attributed run report] [[Research/Plan/Real-Build-Run1]] records modified `631849f`, five phases completed at 15:24:21 EST, 22 generated-test passes and a true route differing from the displayed subscription wording. Meeting 31 credits the 4 PM build gate. Those experimental controls are not demonstrated shipped `d0f4c69` controls. The same note now records a second modified `d0f4c69` run reaching review; it does not replace the assigned Pipeline-run1 primary or establish independent acceptance of run2.

[E, JSON receipt reads, November 4] [Factory edf3150f](../../QA/Acceptance/Results/training-acceptance-edf3150f-4563-4059-b9c0-6ecca70e64ac/result.json), finished 15:38:15 EST: **33 PASS, 1 FAIL, 14 NOT CHECKED**. [CLI af6357a9](../../QA/Acceptance/Results/training-acceptance-af6357a9-6421-4d12-ba9b-21b462cd2b3c/result.json), finished 15:43:09 EST: **28 PASS, 0 FAIL, 18 NOT CHECKED**. Counts include infrastructure/review checks. [[Research/QA/Acceptance/Review-Candidates]] records 17 numeric/outcome passes for Pipeline and 13 for CLI, with four exact CLI variants not expressible through its form. Both have observed review invalidation and fresh offline import; human acceptance remains pending.

[E, receipt comparison and Quality review] The latest CLI payload manifest equals [earlier aaa1585f](../../QA/Acceptance/Results/training-acceptance-aaa1585f-8701-485b-861e-d2cc2ff42f8a/result.json). Quality attributes the earlier import failure to checker dismissal of the confirmation, corrected in af6357a9. Preserve that failed attempt and meeting 31's reference to Review-Candidates' earlier rerun-pending wording only as history. The version read here already records the successful rerun. No application import repair or pending rerun is inferred.

[E, attributed Quality review] Preserve the raw CLOCK-DISPLAY failure and frozen 0800 key. The delivered brief specifies relative minutes and portable JSON; 0800 and a separate readable-summary export are contract gaps, not proven violations of that brief. Factory G10 also has a concrete contradiction: unknown feasibility in the exhausted headline but a complete conflict-free draft in the explanation. [R] Quality owns scope reconciliation, explanation consistency, imported-review binding, tampered-file assessment and residual coverage. Reuse its records without changing expected results, adding an acceptance matrix or claiming a repair.

[E, dated gate read] `org/reports/mvp-gate.md` at **15:46:40 EST, November 4**, reports **147 pass/20 fail**, `d0f4c69` on `dev/reviewed`, inside the sandbox. The relay analysis and some memos retain **96/20 at 15:29:35** as history. The runner attributes listed failures to sandbox constraints and asserts outside-browser success without an execution-receipt link in that report. Quality must substantiate causes and reconcile the denominator. This is not current runtime acceptance. [[Research/Plan/Test-Results]] remains older revision evidence; [[Research/QA/Acceptance-Reconcile-d0f4c69]] grants no matched runtime closure to the historical export cases.

## Sources and handoff

[E] Source inspection only: https://github.com/danjung9/FleetHarness/tree/d0f4c690d3f40ac260eb0a291dde75f0d55c4aa5 . All eight requested files were read with `git show d0f4c69:<path>`. No working-tree source was used.

[E] Decision context: [[Ops/Directors/Directive-rande]], [[Ops/Directors/Memo-director-product]], [[Ops/Directors/Memo-director-quality]], [[Ops/Directors/Memo-director-engineering]], [[Ops/Directors/Memo-overseer]], [[Research/Plan/Review]], [[Research/00-Brief]]. Both relay files and the gate are under `~/.local/share/fleethacker-context/org/`. [R] Reuse [[Research/QA/Officer/Trial-Protocol]] and [[Research/QA/Officer/Burden-Claim]]; an authorized person arranges the session after scope reconciliation and acceptance. No participant or saving is assumed.

## Remaining operator checks

[R, meeting 31] These are handoffs to existing owners, not new executions or permission to launch. Humans retain execution bounds, final-byte acceptance and submission approval. Monitor elapsed work, changes, failures and tool activity; stop progression and escalate prohibited data, ambiguous results or failed shutdown to the overseer. No real assignments, official calendars, credentials, messages or publication belong in this task.

| Check | Source paths | Required evidence from the existing owner |
| --- | --- | --- |
| 1. Rehearse the current desktop route and control visibility | `d0f4c69:src/Home.tsx`, `src/App.tsx`, `src/ModelSelector.tsx`; [[Research/QA/For-Dan]] | Exact revision, ID 11 saved-brief identity, observed labels/navigation into Flow, model lock/consent and access to Stop. Preserve separate process/heartbeat/write evidence for the tested shutdown path; a badge does not prove termination. |
| 2. Establish browser readiness for the factory actually used | `d0f4c69:electron/browser-verification.ts`, `package.json`, `docs/desktop.md`; dated `reports/mvp-gate.md` | Factory/package identity, OS/browser version and resolved executable, launch outcome, desktop/narrow journey receipt and evidence paths, plus exact outside-sandbox receipt if claimed. Missing browser remains a setup finding, not a verified fix. |
| 3. Complete the existing final-task walkthrough and trial handoff | [[Research/QA/Acceptance/Review-Candidates]], [[Research/QA/Officer/Acceptance-11]], [[Research/QA/Officer/Trial-Protocol]], [[Research/QA/Officer/Burden-Claim]] | Quality's residual evidence and clock/summary decision, coherent exhaustion wording, guide and saved-file recovery, stopped writers and sorted final relative paths/lengths/SHA-256 manifest, then a human decision bound to those bytes. Reuse the trial only after acceptance; report benefit only from its actual anonymous record. |
