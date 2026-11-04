---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Defense platform council verdict, product-note index and the most important unresolved evidence."
---

# Defense and enterprise AI platforms

## Bottom line

[R] Build evidence for one officer's useful application before building another general platform. [V] The Navy already designates GenAI.mil for enterprise generative AI. https://www.doncio.navy.mil/ContentView.aspx?ID=20456
[A] Ark is the closest stated factory overlap, while UDS is a plausible delivery foundation and Prometheus a plausible adoption partner. [R] FleetHarness should earn its place through tested task outcomes, portable delivery and measured user burden.

## Read first

- [R] [[Research/Landscape/Defense-Platforms/Comparison]] gives the cross-product table, proposed gap, incumbent counterargument and decision experiment.
- [R] [[Research/Landscape/Defense-Platforms/Research-Log]] records tools, friction, prior work, scope and the local session handoff.

## Product notes

| Note | Seat verdict |
| --- | --- |
| [[Research/Landscape/Defense-Platforms/C3-AI]] | [R] Borrow evidence-backed maintenance case workflows; avoid assuming a small app needs a large enterprise data project. |
| [[Research/Landscape/Defense-Platforms/Palantir-Maven-Smart-System]] | [R] Check existing reporting applications before duplicating them. |
| [[Research/Landscape/Defense-Platforms/Palantir-AIP]] | [R] Reuse an available builder/runtime if it passes the task tests. |
| [[Research/Landscape/Defense-Platforms/Scale-Donovan]] | [R] Borrow evaluation and source grounding; use deterministic tools for exact reasoning. |
| [[Research/Landscape/Defense-Platforms/Ask-Sage]] | [R] Consider a prepared workflow in an existing workspace. |
| [[Research/Landscape/Defense-Platforms/GenAI-mil]] | [R] Check this incumbent first for everyday Navy productivity work. |
| [[Research/Landscape/Defense-Platforms/NAVAIR-Prometheus-Forge]] | [R] Verify Forge directly and build on existing training routes. |
| [[Research/Landscape/Defense-Platforms/Defense-Unicorns-UDS]] | [R] Consider it a delivery target; keep platform administration with engineers. |
| [[Research/Landscape/Defense-Platforms/Defense-Unicorns-Ark]] | [R] Compare before rebuilding a similar software factory. |

## Five findings

1. [V, Navy direction] GenAI.mil is an existing enterprise service, not a hypothetical future alternative. https://www.doncio.navy.mil/ContentView.aspx?ID=20456
2. [V, vendor] No-code agent creation already exists in Donovan, Ask Sage and GenAI.mil's Gemini offering. A simpler chat interface is insufficient differentiation. https://scale.com/donovan ; https://docs.asksage.ai/agent-builder/ ; https://cloud.google.com/blog/topics/public-sector/gemini-for-government-build-custom-ai-agents-for-unclassified-work-on-genaimil/
3. [V, government user research] The Army's Donovan experiment identifies reasoning/context limits and a training need. [R] Use acceptance tests and exact tools, not prompt quality alone. https://media.defense.gov/2025/Aug/05/2003773179/-1/-1/0/CENTAUR%20IN%20TRAINING%20ISSUE%20PAPER_2025%2006-26_MD.PDF
4. [V, government transition account] UDS/Zarf has public Navy delivery evidence. [R] Distinguish an offline delivery platform, an offline app and an offline builder. https://www.navysbir.com/success/docs/Defense_Unicorns-AF21A-TCSO1-308.pdf
5. [V, provider description] Ark's stated scope overlaps app generation, validation and packaging. [E] Exact shipped features remain unverified. https://job-boards.greenhouse.io/defenseunicorns/jobs/5277744007

## Confidence and unresolved questions

[E] This review used public search, product documentation, government adoption statements and available public criticism as of November 4, 2026. No product was tested, no access was obtained and no implementation was installed. Government adoption statements establish use or direction, not independent efficacy. Vendor claims remain labeled.

[E] Not verified: Forge-specific capabilities; Ark production use and entitlements; current per-officer prices for the enterprise platforms; the target command's actual access; exact authorization boundaries; end-to-end offline behavior; and comparable setup or training benchmarks. A specific Navy production user was not verified for C3 AI, Donovan or Ask Sage.

[R] Ask the council to validate one named officer, one repeated task, its permitted data and its existing service access. Compare a complete task with an incumbent before claiming a unique gap. No outreach was performed by this seat.

## Sources

- [P] [[Research/00-Brief]]
- [P] [[Event/Rules]]
- [P] [[Event/Judging]]
- [V, Navy service designation] https://www.doncio.navy.mil/ContentView.aspx?ID=20456
- [V, provider scope] https://job-boards.greenhouse.io/defenseunicorns/jobs/5277744007
- [V, government user experiment] https://media.defense.gov/2025/Aug/05/2003773179/-1/-1/0/CENTAUR%20IN%20TRAINING%20ISSUE%20PAPER_2025%2006-26_MD.PDF
- [V, Navy delivery account] https://www.navysbir.com/success/docs/Defense_Unicorns-AF21A-TCSO1-308.pdf
