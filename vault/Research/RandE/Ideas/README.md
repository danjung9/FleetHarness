---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Six candidate additions beyond the existing research, with three keeps and three sprint kills."
---

# Ideas beyond the current plan

## Bottom line

[R] Keep the current one-task plan and consider three small additions: preserve settled events, check equivalent inputs, and test whether the reviewer understands one rule. [R] Kill assumption branching, delay sensitivity and a paper continuity worksheet for this sprint. [A] These are candidate gaps in the available record, not claims of market originality or measured officer benefit. [R] Finish the plan's required acceptance and recovery work before adding any feature.

## Idea cards

| Card | Recommendation [R] | Rough size [A] | Distinction to test [A] |
| --- | --- | --- | --- |
| [[Research/RandE/Ideas/01-Preserve-settled-events]] | Keep conditionally | 2 to 4 person-hours | A correction should disturb as little of the reviewed draft as possible. |
| [[Research/RandE/Ideas/02-Equivalent-input-check]] | Keep as a manual check | 0.5 to 1.5 person-hours | Feasibility should survive harmless renaming and row reordering. |
| [[Research/RandE/Ideas/03-Reviewer-teach-back]] | Keep as a facilitated trial | 0.25 to 0.75 person-hours | Show whether a person understands a checked rule before relying on it. |
| [[Research/RandE/Ideas/04-Assumption-fork]] | Kill for this sprint | 3 to 5 person-hours | Compare consequences of a disputed input without silently settling it. |
| [[Research/RandE/Ideas/05-Delay-sensitivity]] | Kill for this sprint | 4 to 8 person-hours | Show a draft's tested tolerance to specific synthetic delays. |
| [[Research/RandE/Ideas/06-Paper-continuity]] | Kill for this sprint | 2 to 4 person-hours | Continue a small checking task with no working device. |

[A] Sizes include preparation and the focused check in each card, assume a contributor familiar with the accepted task app, and exclude access recovery, model waiting and core defect repair. They are estimates, not commitments. [R] Do not sum these into a new sprint scope. Start with the two manual keeps; add the conditional feature only if the core artifact is accepted and its owner agrees it fits.

## What was scanned and what was missing

[E] Scanned the existing Research inventory, headings, summaries and recommendation text, then searched full text for candidate mechanisms and near duplicates. Read Plan, Findings and Test-Results directly, with targeted reading of the landscape syntheses, user requirements and implementation reviews. At the first document validation, Research contained 116 Markdown notes outside this folder, including work arriving during the scan. This was a novelty scan, not a fresh verification of every public claim in those notes.

[E] The supplied relay files did not exist at the initial check, but both arrived and were read before completion. The new relay confirms Workbench, standalone packaging and app-before-guide work at 50fcaea. The reports folder also gained a gate reporting 128 passes and zero failures, plus an activity snapshot and pull notice; these were read, not rerun. Directive-rande.md remained absent at the final check. See [[Research/RandE/Ideas/Sessions/2026-11-04-idea-scan]]. Unpublished or incomplete teammate ideas cannot be excluded.

[E] Resolved supplied commit 50fcaea to 50fcaea1e86028503ae66bd2f17287093ad30cbe. Read its change summary from 0f175a8 and its Workbench product, direction and usage records. Those records describe a third interface, plain-language intake, trying a tool, review, download and standalone-app delivery work. These are excluded from the cards as new ideas. Documentation claims about smoke tests were not treated as fresh execution evidence.

[E] Existing themes excluded as repeats: examples before building, guided intake, conflict explanations, human review, approval invalidation, immutable export, independent acceptance, offline operation, save/import, accessibility, usage limits, technical handoff, incumbent comparison and sourced evidence pages. New Agentic notes, connector/UX work records and the engineering meeting record were also checked for overlap as they arrived. Each card names its closest overlap. [R] Treat novelty as provisional while other seats are still writing.

## Shared controls

[R] All proposed examples use invented administrative training requests and invented limits. The person approves input changes and the exact draft. No card authorizes real personnel assignment, policy inference, calendar writes, messages or deployment. Monitor changed inputs, check results and draft versions; stop on unexplained results and escalate to the mission and technical reviewer roles. Those roles are proposed, not assigned people.

## Sources

- [E] [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Test-Results]], [[Research/Plan/Research-Map]].
- [E] [[Research/Landscape/App-Builders/Simplicity-Patterns]], [[Research/Landscape/App-Builders/Failure-Patterns]], [[Research/Landscape/Defense-Platforms/Comparison]], [[Research/Landscape/Startups-RIP/Fleet-Version]].
- [E] Local source reference: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe, specifically docs/workbench/PRODUCT.md, docs/workbench-direction.md and docs/workbench.md. No remote request was made.
- [E] Scan and disclosure handoff: [[Research/RandE/Ideas/Sprint/Review-Log]].
