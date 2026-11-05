---
type: disclosure
status: draft
owner: mukul
updated: 2026-11-05
summary: "Tools, bundled third-party skills, historical failures, prior work and unresolved rights for f2e5422."
---

# AppYard disclosure

[P] Rules 5, 7 and 10 require tools, prior work and friction disclosures. [R] Attach the complete [tool ledger](../Sprint/Tool-Disclosure-Log.md), [prior-work log](../Sprint/Prior-Work-Log.md) and [friction log](../Sprint/Friction-Log.md). The full ledger's itemized tools, models, providers, purposes and account basis are incorporated by reference. This summary adds the inspected `f2e5422` inventory; completeness and rights need team confirmation. [Event rules](../Event/Rules.md).

## Tools, models and data

| Resource | Use, provider and version [E] |
| --- | --- |
| Model tools | OpenAI Codex CLI 0.163.0 is historical recorded use; `@openai/codex` **0.166.0** is bundled at `f2e5422`. Pi coding agent SDK **1.5.0**, Earendil Works, provides the alternate engine. |
| Factory and evaluation models | OpenAI **gpt-6.1-sol** for recorded real builds; **gpt-6-astra** for evaluation/review, through event access. Other research and coordination models, browser automation and services are individually disclosed in the attached ledger; they do not establish the factory's model route. |
| Application and build | Electron **45.2.2**, React **19.3.1**, Vite **8.3.5**, TypeScript **7.0.2**, electron-builder **26.18.0**, Electron packager **20.3.0** and Playwright **1.64.1**. Providers: their open-source projects; Microsoft for TypeScript and Playwright. |
| QA | Team-created synthetic providers, connector servers, benchmark and independent browser checkers; Node.js **26.0.0** and Google Chrome **156.0.8078.80** in the historical browser receipt. |
| Local tools | Git/GitHub CLI, Git **2.50.1**, ripgrep **15.2.0**, Python **3.9.6**, zsh **5.9**, pdftotext, macOS process inspection, command/patch/image tools, clocks and sprint scripts. Providers and unrecorded versions remain as itemized in the ledger. |
| Data and integrations | Captured event requirements, cited public research and synthetic examples. Google/Microsoft connectors have sample/fake-server evidence, no registered client ID or proven real sign-in. GenAI.mil is framework only, never run against the service. |

[E] Sources: [tool ledger](../Sprint/Tool-Disclosure-Log.md), [package manifest](../../FleetHarness/package.json) inspected through Git at `f2e5422`, [real build](../Research/Plan/Real-Build-Run1.md) and [QA evidence](README.md). The manifest and lockfile record remaining dependencies, including fonts, icons, token handling and archive utilities. Team browser/helper support is in `electron/agent-browser.ts`, `electron/agent-helpers.ts` and `electron/helper-execution.ts`.

## Bundled third-party skills

[E] From [skills/THIRD_PARTY.md](../../FleetHarness/skills/THIRD_PARTY.md) at `f2e5422`. These are adapted upstream assets.

| Skill or included material | Upstream pin and license [E] |
| --- | --- |
| Ponytail, DietrichGebert/ponytail | `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846`; MIT. |
| Impeccable, pbakaus/impeccable | Skill **4.4.0**, `5efd0eeee80b7a627233b53539fe829f05b5a60f`; Apache-2.0, NOTICE retained. |
| Impeccable engine compatibility | Wrappers target **0.1.8**, `43ef0baa93264367421423679b0f1d6215a183bc`, rather than the tag's 0.1.10. No native engine binary is bundled. |
| Included platform-design-skills references | ehmo; MIT notice retained. Exact license-source pin is in Impeccable provenance. |
| Included modern-screenshot bundle | wxm; MIT notice retained. Bundle hash recorded; unreported version not inferred. |

[E] Original entrypoints, provenance and notices are retained alongside phase-specific adapters. Impeccable font indexes are metadata, not bundled fonts. [R] Include the notices with distribution and reconcile all dependency licenses before release.

## Historical results, not current certification

- [E] **November 4: 0 satisfactory of 14 independently judged automatic passes**, nine from round 1 and five from experiment R101. Round 1's tenth build failed verification. This denominator is not fourteen distinct challenges or the current benchmark. The [November 5 reconciliation](../Research/QA/Ten/Round-Reconciliation-2026-11-05.md) confirms all five experiment rejections despite one stale pending row. Current result: [Draft](Draft.md).
- [E] **November 4, `631849f` plus patch:** the curated training app took 13.4 minutes; its 22 generated tests passed. Independent receipt: **33 PASS, 1 FAIL, 14 NOT CHECKED**. Later review identifies CLOCK-DISPLAY as a key/brief mismatch; a separate readable-summary export was also outside the brief. A contradictory search-exhaustion explanation remains a real Run1 defect. Offline recovery and 17 outcome passes apply only to that frozen HTML artifact. [Corrected review](../Research/QA/Acceptance/Review-Candidates.md).
- [E] Detached Pi work survived Stop at `d0f4c69`. Receipt **6b784ff0** at clean `16a6940` later passed seven bounded checks; [overnight receipts](README.md) repeat that case. This does not prove other engines, Quit, crash recovery, Windows or packaging shutdown. [Closure review](../Research/QA/GUI-16a6940/Detached-Stop-Review.md).
- [E] Curated Run1 token use and dollar cost are unknown. R1 and R101 rows contain token counts; whole-event usage and dollar cost remain unestablished. [Reconciliation](../Research/QA/Ten/Round-Reconciliation-2026-11-05.md).

## Prior work, rights and friction

[E] AppYard/FleetHarness includes existing source, event integrations, generated examples and independent QA. The separate CLI candidate retains its own provenance. **[MUKUL/DAN TO SUPPLY: imported ffc21e2 history, pre-event/event split, ownership, licenses, restrictions and staff disclosure].** [Prior-work log](../Sprint/Prior-Work-Log.md).

| Area | Remaining issue and next action |
| --- | --- |
| Policy | [R] Confirm category, partial scope and missing-sync disposition; no waiver recorded. |
| Data | [E] No measured user burden. [R] Run the matched synthetic trial. |
| Authority | [R] A person must accept final bytes and authorize submission. |
| Infrastructure | [E] Native browser checks require the runtime owner's environment. Real connector sign-in lacks registered client IDs. |
| Acquisition | [A] Device route, support funding and sustainment owner remain unconfirmed. |
| Technical | [E] Fixtures did not establish satisfactory challenge outcomes in the historical judge record. [R] Judge current outputs independently. |

[E] Local review and logging limits are recorded in [Submission-Log](Sprint/Submission-Log.md). [R] Transfer staged records to central ledgers and confirm completeness before submission.
