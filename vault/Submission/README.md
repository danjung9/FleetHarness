---
type: index
status: draft
owner: mukul
updated: 2026-11-05
summary: "Submission at f2e5422 with source, native evidence, historical limits and human completion items."
---

# AppYard submission package

[R] Start with [Draft](Draft.md) for the judge's skim. [Disclosure](Disclosure.md) lists tools, skills and historical failures; [Next 30/60/90](Next-30-60-90.md) gives owners, resources and decision gates.

[E] Revision checked in local Git: **mvp `f2e5422f900cfeb0fd73dae194923c5ea4c43f41`**, November 5. Source inspection establishes feature presence; this writing pass ran no application or benchmark. The [claim correction list](../Research/Backend-Audit/Submission-Claims-Review.md) is reconciled in the [session record](Sessions/2026-11-05-submission-rewrite.md).

[E] The runtime owner's [landed report](<~/.local/share/fleethacker-context/org/CHARTER.md>) records **934/934 unit, 94/94 harness and 16/16 real-screen** checks at or just before `f2e5422`. The unit result combines 933 passes with a fixed cleanup race rechecked successfully. This is a reported integration baseline, not a new full run by this writing pass. The restricted seat gate's installation failure is not the native result.

| Native proof at clean `3da8ad8`, immediately before `f2e5422` | Result and scope [E] |
| --- | --- |
| [Inputs and sign-in controls](../Research/QA/Overnight/desktop-inputs-eef69f85-cff0-4169-ac53-332704d6ae2e/result.json) | 15/15. Input limits/persistence, synthetic key rejection/clearing, intercepted login start/reopen/cancel. No completed sign-in. |
| [Browser recovery](../Research/QA/Overnight/browser-recovery-2026-11-05T07-35-45-724Z-c1f7f00f/receipt.json) | 5/5 saved-state startup cases. |
| [Detached Stop](../Research/QA/Overnight/stop-detached-d1fd10f4-8441-46c0-889c-df8e865257e8/result.json) | Seven checks pass for one Pi shell, parent and detached child. Observation precedes separate cleanup. |
| [Restart and resume](../Research/QA/Overnight/native-resume-fbd2f890-5861-4158-b77a-9f1a43344da5/result.json) | 5/5. Stop, full application restart and same-phase resume using a synthetic Pi provider. No crash, final delivery or live-authentication claim. |

[E] These are **synthetic-fixture proofs**. The [independent receipt review](../Research/QA/Acceptance/Review-3da8ad8.md) confirms their bounded verdicts. Source/build identities are recorded separately; browser receipts do not independently prove source-to-build equivalence. None establishes human acceptance or satisfactory real challenge outcomes.

[E] Feature sources inspected at `f2e5422`: `src/ModelSettings.tsx`, `src/GenAiMilTab.tsx`, `electron/connectors/`, [Project lead documentation](../../FleetHarness/docs/project-conversation.md), and `electron/pi-backend.ts:192` for unapproved-build change requests. New post-approval change requests, offline packaging and service container delivery are not claimed as landed. Existing browser-app download code does not prove general offline delivery. Hosted generation is separate from this desktop evidence.

[R] Before submission, Mukul supplies every blank in Draft and the owner/resource fields in the transition plan, accepts exact final bytes, confirms portal/category/rights details and authorizes submission. The benchmark owner supplies the one pending result in Draft from [Research/QA/Ten](../Research/QA/Ten/), with round, revision and judged denominator. No number is inferred from unfinished rows.

[E] [Local log](Sprint/Submission-Log.md), [session handoff](Sessions/2026-11-05-submission-rewrite.md) and [.tmp/JOURNAL](.tmp/JOURNAL.md) retain verification and next actions. Central Sprint, Sessions and Team/Now updates are staged for an authorized owner because this assignment permits writes only here.
