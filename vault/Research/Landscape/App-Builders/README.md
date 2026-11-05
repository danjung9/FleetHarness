---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Council verdict: borrow simple interactions, require executable evidence and verify government runtime boundaries."
---

# AI app builders and no-code tools

## Bottom line

[R] FleetHarness should be a guided task-to-tested-software workflow, with a preview as one piece of evidence. [R] Borrow Lovable's planning loop, Replit's visible test-and-repair stages and Retool's governed action approvals. [R] Investigate the existing Microsoft path for staff use, but verify the exact Power Apps Copilot feature in the actual government tenant. [R] Demonstrate an exported or locally hosted workflow with the network disabled before claiming readiness for disconnected Fleet conditions.

## Notes and seat verdict

| Note | Verdict for FleetHarness |
| --- | --- |
| [[Research/Landscape/App-Builders/Lovable]] | [R] Borrow conversational planning, previews and scoped edits. Validate data boundaries and migration independently. |
| [[Research/Landscape/App-Builders/Bolt]] | [R] Borrow integrated setup, visible database inspection and usage meters. Require a complete export rehearsal. |
| [[Research/Landscape/App-Builders/v0]] | [R] Borrow rapid interface iteration and source-control handoff. Keep mission acceptance tests separate from design approval. |
| [[Research/Landscape/App-Builders/Replit-Agent]] | [R] Borrow staged execution and browser-test evidence. Enforce production isolation and repair budgets. |
| [[Research/Landscape/App-Builders/Retool]] | [R] Borrow governed resources, function approvals and authenticated publishing. Confirm enterprise runtime and air-gap requirements. |
| [[Research/Landscape/App-Builders/Power-Apps-Copilot]] | [R] Investigate first for an existing Microsoft staff workflow path. Verify maker features, licensing and mobile offline in the target tenant. |
| [[Research/Landscape/App-Builders/FlutterFlow]] | [R] Consider for native mobile and local-storage experiments. Generated screens do not establish synchronization. |
| [[Research/Landscape/App-Builders/Appsmith]] | [R] Use as a self-hosted internal-tool comparator or prepared template runtime. It needs engineering support and patch ownership. |
| [[Research/Landscape/App-Builders/Simplicity-Patterns]] | [R] Adopt bounded tasks, examples, reviewable assumptions, evidence beside preview and visible authority. |
| [[Research/Landscape/App-Builders/Failure-Patterns]] | [R] Turn hidden failures into executable tests and enforced permissions. |
| [[Research/Landscape/App-Builders/Research-Log]] | [E] Local tool, friction, prior-work and session record for this research pass. |

## Five findings for the council

1. [R] Simplicity means fewer unsupported decisions, not fewer visible safety controls. Give an officer task choices and concrete examples, then ask only the unresolved mission questions.
2. [V] Microsoft lists Build apps through conversation as unavailable in GCC in its feature table. Government Power Apps and Microsoft 365 availability must not be treated as proof of this maker feature's availability in Flank Speed (https://learn.microsoft.com/en-us/power-platform/admin/geographical-availability-copilot). [A] The actual Navy tenant was not checked.
3. [R] Separate four questions in every architecture review: can we export source, move data and identity, host the runtime ourselves, and operate disconnected? Evidence for one does not establish the others.
4. [V] Public records include a Lovable project-visibility regression, a Vercel credential exposure and a Retool cloud account takeover. They involve different trust boundaries (https://lovable.dev/blog/our-response-to-the-april-2026-incident, https://vercel.com/kb/bulletin/vercel-april-2026-security-incident, https://retool.com/blog/mfa-isnt-mfa). [R] Put controls at each boundary rather than labeling a whole product safe or unsafe.
5. [V] A preliminary independent comparison of Lovable, v0 and Replit covered only nine apps and static structural metrics (https://arxiv.org/abs/2608.16302). [R] Select implementation tools using FleetHarness's actual parsing, scheduling and offline acceptance cases, not a generalized quality ranking.

## What can be real by the deadline

[P] The project README proposes operational-message extraction, schedule deconfliction and an offline-first workflow as three distinct proofs. [P] The brief sets the downselect deadline at November 5, 2026, 2 PM EST. [R] Demonstrate one guided front door and make the evidence for each use case inspectable, even if the resulting apps have different runtimes.

[R] Minimal interaction: choose a task, inspect synthetic examples, approve assumptions, build a small slice, inspect fixed acceptance results, run locally and hand off. Require separate approval for deployment or external writes. Put missing features and blocked integrations on screen. Avoid spending the remaining sprint building a general-purpose visual editor.

## Scope and limits

[E] Public web search and vendor documentation were reviewed November 4, 2026. The required brief, project README, rules, judging and mandatory vault context were read. No product account, installation, live build, purchase, deployment or security probe was performed. First-ten-minute sequences are recommended scripts, not measured completion times.

[A] Not verified: product access for this team; Navy authorization; Flank Speed feature availability and licensing; current contracts, retention and data residency; complete source/data/identity migration for several products; disconnected cold starts and sync; current standalone export instructions for Replit; a directly documented Bolt or FlutterFlow platform breach; broad independent non-coder success studies. Product notes state narrower gaps.

[E] All notes and logs from this seat are confined to this folder as the brief requires. No shared Sprint, Sessions or Team/Now files were changed. [R] The coordinating seat should merge the local log into shared records.

## Sources

- [V] Government feature table: https://learn.microsoft.com/en-us/power-platform/admin/geographical-availability-copilot
- [V] Lovable incident: https://lovable.dev/blog/our-response-to-the-april-2026-incident
- [V] Vercel incident: https://vercel.com/kb/bulletin/vercel-april-2026-security-incident
- [V] Retool incident: https://retool.com/blog/mfa-isnt-mfa
- [V] Independent study: https://arxiv.org/abs/2608.16302
