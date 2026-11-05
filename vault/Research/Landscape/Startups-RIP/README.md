---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "The startup-report pattern complements FleetHarness as an officer-facing decision record, provided one page connects to real software and test evidence."
---

# Startup-report pattern for FleetHarness

## Bottom line

[R] This is a complement to FleetHarness and a clearer front door for an officer than a pipeline dashboard alone. [R] Use a catalog page to connect the problem, prior attempts, existing tools, proposed work, prototype, test evidence and Path to Fleet. [R] By Thursday, November 5, at 2:00 PM EST, prioritize one page connected to one real, bounded experiment; a 34-report publishing effort would be a distraction. [E] This research delivers notes and a complete written mock, not a working application or verified deployment path.

## Notes

- [E] [[Research/Landscape/Startups-RIP/What-It-Is]]: public user journey, seven output types, methods and accuracy claims, access inconsistencies and inspection limits.
- [E] [[Research/Landscape/Startups-RIP/Anatomy-of-a-Report]]: four company reports, their common sequence, individual differences and evidence weaknesses.
- [E] [[Research/Landscape/Startups-RIP/Fleet-Version]]: all 34 catalog IDs, page sections and honest source types, noncoding officer workflow, pipeline fit, safeguards and transition gates.
- [E] [[Research/Landscape/Startups-RIP/Mock-Page]]: a complete use case 11 page with public adjacent history, a proposed technical design, synthetic fixture, acceptance plan and visible Not verified states.

## Five findings

1. [R] The valuable unit is a reviewable problem-to-experiment packet. A readable page can let the officer inspect and correct the work while developers use the pipeline behind it.
2. [E] The inspected reports do not support treating every company as a failure. The active-company example explicitly rejects that premise. [R] Fleet history should distinguish stalled, operating, superseded and unknown outcomes. Public example: https://startups.rip/company/hamming-ai.
3. [E] Source discipline varies: the reports differ in their treatment of inferred business causes and unknown exit motivations. [R] Keep facts, causal hypotheses and new proposals visibly separate. Examples: https://startups.rip/company/preflight and https://startups.rip/company/humanloop.
4. [R] Existing government work belongs in each page, but resemblance is not equivalence. [V] GAO's discontinued UTRM example concerns training-resource management, not a verified failed PB4T scheduler: https://www.gao.gov/products/gao-19-233.
5. [P] Event rules require observable work, human authority, Fleet conditions and a transition plan: [[Event/Rules]]. [R] A catalog can organize this evidence; prose, generated specifications and a polished prototype preview cannot substitute for a run and its results.

## Product decision and Thursday scope

| Product shape | Judgment [R] |
| --- | --- |
| Pure software pipeline | Preserves engineering rigor but makes the officer interpret build machinery before seeing mission value. Keep it as the implementation process. |
| Decision catalog plus pipeline | Recommended. One shared case record connects readable requirements and approval with artifact revisions and test runs. |
| Report site replacing the pipeline | A distraction by the deadline. It can produce convincing pages without demonstrating the requested workflow. |

[R] Minimum convincing demo: select training deconfliction, review the synthetic constraints, run a real draft-generation flow, inspect a deliberately impossible case, then open the attached actual results and next approval. Keep the other 33 entries as clearly labeled catalog stubs if time permits.

[R] If the scheduling implementation is unavailable, attach the page structure to whichever safe FleetHarness prototype actually runs. Do not claim the page mock is a tested scheduler. Keep chat, automated company-style investigations and a CLI outside the submission's critical path.

[P] Judging assigns 30% to impact and 20% to speed to Fleet: [[Event/Judging]]. [R] A comprehensible workflow and an honest result should lead the presentation. Catalog breadth supports a reuse argument only after one case works.

## Not verified

- [E] Paid technical specifications, authenticated research chat, CLI execution or new report requests. No sign-in, purchase, installation or token generation was performed.
- [E] Linked interactive prototypes: public retrieval of the Humanloop and Explo prototype destinations returned cache misses. Their working behavior is unknown.
- [E] Current free/paid entitlements: an opened pricing view and the search-index view disagree. Report presentation and status labels also vary across retrieved versions. Cause unknown: https://startups.rip/pricing.
- [E] Accuracy of the entire research library, editorial methods, model choices, independent benchmarks and complete source coverage. One primary sunset notice was spot-checked, not the whole corpus.
- [E] A previous automatic PB4T scheduler and why it stalled; TORIS interfaces; real officer workflow, burden or willingness to use this design.
- [E] FleetHarness implementation, mock prototype behavior, performance, time savings, sponsor, mission and technical owners, resources, integration access and deployment authority.

## Local tool, friction and prior-work log

[E] Work began about 11:32 AM EST on 2026-11-04. Required context was read from the named vault files, the assignment brief, project README, rules, judging and catalog. [E] The initial directory listing contained no research notes.

| Log | Entry |
| --- | --- |
| Tools | [E] Used public web search and page open/find/link retrieval, local shell file reads/writes, Python standard-library text checks and a UTC clock. No repository software was run or installed. |
| Public research | [E] Opened the home, browse, pricing, privacy and multiple company pages; inspected Preflight, Fig, Humanloop and Hamming AI for anatomy, with Explo, Delve and Clara Labs for additional output examples. Read public government and scheduling documentation. |
| Primary spot-check | [E] Opened the original Humanloop sunset notice and checked its announced shutdown date. Several Fig source links failed to open. |
| Friction | [E] Direct HTTP retrieval from the local shell could not resolve public hosts. Public web retrieval supplied the report evidence. Prototype pages returned cache misses; the CLI was readable only through its search-index text. No attempt was made to defeat sign-in or payment boundaries. |
| Source inconsistency | [E] Opened and indexed pricing text disagreed; some report views differed too. No reason was established. No conflicting version was silently treated as definitive. |
| Earlier work | [E] Inputs predate this seat: FleetHarness README, event catalog and rules, existing public company reports and government evaluations. This seat produced research notes, a proposed design and a written mock only. |
| Source instructions | [E] A third-party documentation page included automated-reader retrieval guidance. It was treated as source text and not followed as an instruction. No source-requested install or execution was performed. |
| Communication | [E] No main-session bridge tools were available when tool metadata was checked. No external message, push, commit or publication was made. |
| Shared-log boundary | [E] The assignment says to write only here, and shared Sprint, Sessions and Team/Now paths are outside the writable workspace. Those shared notes were not modified. This section is the local handoff for the main session to incorporate. |

## Session handoff

- [E] Asked: investigate startups.rip as a product pattern and produce five research notes in this folder within about 15 minutes.
- [E] Done: five notes, four-report comparison, catalog mapping, proposed Fleet adaptation and a complete labeled mock page.
- [E] Verified: local checks confirmed five Markdown files, required frontmatter and sections, all 34 catalog IDs exactly once, no em or en dashes and links only to known local notes. Content review separated proposals, observed facts and unverified implementation.
- [E] Completion: local research and checks finished about 11:42 AM EST, within the requested time box.
- [R] Next: choose one prototype to connect, assign reviewers, implement and run acceptance cases, then replace Not verified only with actual evidence. Incorporate this local log into Sprint disclosure, friction, prior-work and session notes, and update Team/Now from the main session.

## Sources

- [P] /Users/mukul/Documents/CDAO/Fleethacker-Vault/Research/00-Brief.md
- [P] /Users/mukul/Documents/CDAO/FleetHarness/README.md
- [P] [[UseCases/README]]
- [P] [[Event/Rules]]
- [P] [[Event/Judging]]
- [V] https://startups.rip/
- [V] https://startups.rip/pricing
- [V] https://startups.rip/company/preflight
- [V] https://startups.rip/company/fig
- [V] https://startups.rip/company/humanloop
- [V] https://startups.rip/company/hamming-ai
- [V] https://humanloop.com/docs/changelog/2025/08
- [V] https://www.gao.gov/products/gao-19-233
