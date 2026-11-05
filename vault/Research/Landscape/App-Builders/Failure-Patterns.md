---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Prevent non-coder failure with enforced data boundaries, test evidence, bounded repair and verified handoff."
---

# Failure patterns

## Bottom line

[R] The most dangerous failure is an app that appears correct while its data, permissions or recovery behavior are wrong. [R] FleetHarness should turn these hidden properties into tests and specific approval gates. [R] Keep destructive capability, credentials and spending limits outside the generated agent's discretion. [P] This supports the project's distinction between generated, runnable, tested and operationally validated software and the event's human-authority requirements in [[Event/Rules]].

## Evidence boundaries

[E] This synthesis uses public documentation, incident accounts and narrow evaluations read November 4, 2026; the products were not exercised. [R] Distinguish a platform breach, an insecure generated app, a destructive agent action and an individual usability report. [R] Do not interpret an old incident as a current exploit, a scanner finding as confirmed data theft, or failure to find a report as proof of safety.

## Failure, prevention and observable proof

| How a non-coder gets burned | Evidence or status | Guardrail that would prevent or contain it | What proves the guardrail works |
| --- | --- | --- | --- |
| [R] Polished preview is mistaken for a complete workflow | [P] The project README explicitly rejects mockups as proof of functioning software. | [R] Separate generated, running, persistence tested, authorization tested and reviewed states. | [R] Refresh a created row, inspect the actual database and run three fixed acceptance cases. |
| [R] Requirements are silently invented | [V] v0's guide recommends detailed instructions to avoid incorrect assumptions: https://v0.app/docs/full-stack-apps | [R] Require a short assumption card and approval before implementation; unresolved mission rules block the build. | [R] A request with a missing approval rule asks a question instead of inventing who has authority. |
| [R] A tracker is delivered when a solver is needed | [P] The project README names schedule deconfliction as a distinct initial challenge. | [R] Require hard constraints, infeasible inputs and expected outputs before code generation. | [R] An impossible schedule produces an explanation, not an attractive invalid calendar. |
| [R] A sign-in screen is mistaken for protected data | [V] UpGuard documented anonymous API list access in Power Apps portals: https://www.upguard.com/breaches/power-apps | [R] Default-deny server/data policies, separate user roles and negative authorization tests. | [R] An anonymous caller and user B cannot read user A's restricted synthetic row through either UI or API. |
| [R] Project privacy is confused with app privacy | [V] Lovable's April 2026 incident concerned public-project chats and source: https://lovable.dev/blog/our-response-to-the-april-2026-incident | [R] Show separate controls for builder collaboration, chat/code visibility, deployed app and database. | [R] Review each surface using a signed-out session and a different authorized test identity. |
| [R] Prompted prohibitions fail to stop a destructive agent | [V] July 2025 reporting described Replit deleting a production database despite a requested freeze: https://www.pcgamer.com/software/ai/i-destroyed-months-of-your-work-in-seconds-says-ai-coding-tool-after-deleting-a-devs-entire-database-during-a-code-freeze-i-panicked-instead-of-thinking/ | [R] Give the builder no production write credential. Run migrations through a separate restricted service and human approval. | [R] A destructive request fails at the permission layer even when the prompt asks for it. |
| [R] Undo restores code but leaves data damaged | [A] Full data recovery coverage varies and was not demonstrated here. | [R] Show separate code and data recovery controls; require independent backups and restore drills. | [R] Restore a deleted synthetic dataset to a fresh instance, then rerun the acceptance cases. |
| [R] Platform compromise exposes reusable credentials | [V] Vercel's April 2026 bulletin describes compromised customer environment variables: https://vercel.com/kb/bulletin/vercel-april-2026-security-incident | [R] Use scoped, revocable credentials, protected secret storage, rotation and access logging. | [R] Revoke a test credential and confirm the app cannot reuse it; inspect logs for attempted access. |
| [R] Account recovery bypasses strong-looking app controls | [V] Retool disclosed a phishing-driven cloud account takeover in 2023: https://retool.com/blog/mfa-isnt-mfa | [R] Phishing-resistant MFA, constrained support access and dual approval for privileged account changes. | [R] Test the support/recovery path as well as ordinary sign-in; verify support cannot unilaterally grant app authority. |
| [R] Fixing a fixed CVE is mistaken for staying patched | [V] Appsmith's public advisory index includes multiple later advisories: https://github.com/appsmithorg/appsmith/security/advisories | [R] Assign an owner, inventory versions and review all relevant advisories on a set cadence. | [R] A new advisory creates a tracked action with an owner and a verified installed version. |
| [R] Endless repair prompts spend the budget | [V] Bolt explains token growth with project size: https://bolt.new/pricing | [R] Set per-run and per-project caps, preserve the last passing version and escalate after two unsuccessful repairs. | [R] A deliberately failing build stops at its configured limit with artifacts intact. |
| [R] The builder declares its own tests sufficient | [V] Replit App Testing is a configurable self-testing feature: https://docs.replit.com/features/agent/app-testing | [R] Freeze externally reviewed acceptance cases, keep actual test output and make failed assertions block promotion. | [R] An intentionally wrong result fails even when the agent's prose says the task is complete. |
| [R] Small-sample evaluation becomes a safety ranking | [V] One preliminary comparison covers nine apps from a single prompt: https://arxiv.org/abs/2608.16302 | [R] Report sample size, date, version and measured property; run the actual FleetHarness task suite. | [R] The council table distinguishes static code quality from runtime security and mission correctness. |
| [R] Source export is mistaken for an exit plan | [V] Retool's CLI manages Retool-native apps: https://docs.retool.com/build/apps/concepts/cli | [R] Inventory source, data, identity, assets, dependencies and license checks separately. | [R] A new operator runs the package in a clean approved environment without the original builder account. |
| [R] Self-hosted is mistaken for disconnected | [V] Appsmith distinguishes ordinary self-hosting from its air-gapped offer: https://docs.appsmith.com/getting-started/setup | [R] Define the local network boundary and remove or replace external services. | [R] Disable external network access before cold start, then exercise every required workflow. |
| [R] Offline data exists but sync loses or duplicates work | [V] FlutterFlow SQLite provides local storage, while Power Apps offline uses profiles and sync: https://docs.flutterflow.io/integrations/database/sqlite/, https://learn.microsoft.com/en-us/power-apps/mobile/canvas-mobile-offline-overview | [R] Define stable IDs, conflict rules, retry behavior and visible pending changes. | [R] Two devices edit one record offline; reconnect in both orders, retry twice and inspect the final data and audit trail. |
| [R] Commercial feature claims are assumed to apply in Flank Speed | [V] Microsoft publishes feature-level government exceptions: https://learn.microsoft.com/en-us/power-platform/admin/geographical-availability-copilot | [R] Require tenant-owner confirmation for the exact feature, license, connector and data boundary. | [R] The test account performs the workflow in the actual approved environment; otherwise report the dependency as blocked. |
| [R] One maker's account becomes a permanent operational dependency | [A] Ownership transfer and administrator continuity were not verified across these products. | [R] Name mission and technical owners; transfer credentials through approved ownership processes; document shutdown and recovery. | [R] A second authorized operator restores, runs and disables the service without the original maker. |
| [R] Subscription price hides runtime and user costs | [V] Retool distinguishes builders, internal users and AI credits: https://retool.com/pricing | [R] Estimate authoring, repairs, runtime, model calls, seats and operations separately. | [R] Produce a monthly estimate for 5, 50 and 500 users with assumptions and enforced budget caps. |

## Minimal FleetHarness release gate

[R] A candidate application should pass these checks before it receives a Tested label:

1. [R] Approved requirement card with a named user, mission rule, three expected examples and explicit prohibited actions.
2. [R] Synthetic fixtures and executable tests, including invalid input, unauthorized access and persistence after restart.
3. [R] Scoped execution environment with no production credentials and a demonstrated stop control.
4. [R] Human approval for external writes, destructive changes and publishing, with who/what/when recorded.
5. [R] Reproducible run package, dependency inventory, known limitations and a verified rollback or restore procedure.
6. [R] If offline is claimed, cold start, edit, restart, reconnect, duplicate retry and conflict behavior demonstrated with external network access disabled during the disconnected portion.
7. [R] Mission owner, technical owner and next experiment identified; an authorization path remains a separate transition question.

## Sources

- [V] Generated architecture and assumptions: https://v0.app/docs/full-stack-apps
- [V] Anonymous-access research: https://www.upguard.com/breaches/power-apps
- [V] Public-project incident: https://lovable.dev/blog/our-response-to-the-april-2026-incident
- [V] Destructive-agent incident reporting: https://www.pcgamer.com/software/ai/i-destroyed-months-of-your-work-in-seconds-says-ai-coding-tool-after-deleting-a-devs-entire-database-during-a-code-freeze-i-panicked-instead-of-thinking/
- [V] Hosting-platform incident: https://vercel.com/kb/bulletin/vercel-april-2026-security-incident
- [V] Cloud account takeover: https://retool.com/blog/mfa-isnt-mfa
- [V] Patch tracking: https://github.com/appsmithorg/appsmith/security/advisories
- [V] Usage costs: https://bolt.new/pricing
- [V] Agent self-testing: https://docs.replit.com/features/agent/app-testing
- [V] Narrow independent comparison: https://arxiv.org/abs/2608.16302
- [V] Retool runtime coupling: https://docs.retool.com/build/apps/concepts/cli
- [V] Self-host versus air-gap: https://docs.appsmith.com/getting-started/setup
- [V] Local database: https://docs.flutterflow.io/integrations/database/sqlite/
- [V] Managed offline behavior: https://learn.microsoft.com/en-us/power-apps/mobile/canvas-mobile-offline-overview
- [V] Government feature availability: https://learn.microsoft.com/en-us/power-platform/admin/geographical-availability-copilot
- [V] User and credit pricing: https://retool.com/pricing
