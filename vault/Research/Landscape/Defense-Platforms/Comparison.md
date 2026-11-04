---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Existing platforms cover much of the proposed scope; a defensible gap is a narrow, tested, portable officer workflow with a clear owner."
---

# Defense and enterprise AI platform comparison

## Bottom line

[V] GenAI.mil already has a Navy enterprise designation. https://www.doncio.navy.mil/ContentView.aspx?ID=20456
[A] FleetHarness's strongest possible distinction is a repeatable way to produce a small application with evidence that it works for one officer, including a demonstrated disconnected path. [R] Compare that result against available incumbent workflows before claiming a gap. [R] Reuse an existing runtime or builder when it passes the same tests with less burden.

## How to read the comparison

[E] This is a public-source review as of November 4, 2026. No products were operated, installed or benchmarked. [A] Training burden describes likely task learning and integration work, not measured user-study results. [A] A first useful interaction after access exists is different from a reliable deployment at a new command. [E] Unknown means not verified in this review, not impossible.

| Product | User and actual adoption evidence | Training burden | Time to first value | Offline ability | Cost signal |
| --- | --- | --- | --- | --- | --- |
| C3 AI | [V, government] Air Force and Army maintenance adoption. https://www.diu.mil/solutions/portfolio/catalog/a0Tt0000009En6aEAC-a0ht000000AYgyGAAT | [A] Moderate for workflow users; high for data and implementation owners. | [V, vendor] One-month rapid pilot option; separate commercial implementation offer spans six months. https://docs.c3.ai/docs/readiness/22.0/topic/rdns-overview | [E] Complete disconnected workflow unknown. | [V, listing] $500,000 six-month commercial initial deployment, not a Navy quote. https://marketplace.microsoft.com/en-us/product/saas/c3iotinc.c3_ai_suite_t?tab=Overview |
| Maven Smart System | [V, service] Marine Corps enterprise adoption and ODIN reporting. https://www.marines.mil/News/Press-Releases/Press-Release-Display/Article/4523871/us-marine-corps-announces-odin-reporting-system/ | [A] Application-specific training; substantial new data/workflow integration. | [A] Existing app potentially useful in a provisioned session; new-command duration unknown. | [E] Exact offline functions and synchronization in the target environment unknown. | [V, historical award] $480 million 2024 prototype award, not a seat price or current ceiling. https://www.defense.gov/News/Contracts/Contract/Article/3790490/ |
| Palantir AIP | [V, vendor] Builders and frontline users; Navy-linked ShipOS training. https://www.palantir.com/shipos-atf | [A] Low to moderate for a prepared app; high for data and action configuration. | [V, vendor] Five-day facilitated initial-use-case offer, not full authorization. https://www.palantir.com/platforms/aip/bootcamp/ | [V, vendor] Localized edge AI supported; [E] target deployment untested. https://www.palantir.com/docs/foundry/aip/overview/ | [E] Current per-officer price unknown. |
| Scale Donovan | [V, government research] Army North planning experiment. https://media.defense.gov/2025/Aug/05/2003773179/-1/-1/0/CENTAUR%20IN%20TRAINING%20ISSUE%20PAPER_2025%2006-26_MD.PDF | [V, researchers] Practical familiarization needed; [A] more effort for workflow owners. | [E] No verified rollout median; [A] existing prepared assistant could be useful in a session. | [V, vendor] Air-gapped option advertised; [E] team configuration unknown. https://scale.com/donovan | [E] Seat price and relevant deployment quote unknown. |
| Ask Sage | [V, government] Army enterprise workspace. https://www.army.mil/article/285537/army_launches_army_enterprise_llm_workspace_the_revolutionary_ai_platform_that_wrote_this_article | [A] Low for prepared chat; moderate for visual workflows; higher for Edge administration. | [V, Army announcement] Eligible CAC registration described as immediate; [E] current Navy access unknown. | [V, vendor] Edge works with local models and dependencies; hosted service needs connectivity. https://docs.asksage.ai/edge/offline-operation/ | [V, vendor] September 2026 Power User signal: $90/month, two million platform tokens. https://docs.asksage.ai/asksage-sales/ |
| GenAI.mil | [V, Navy] Enterprise service for DON mission owners and users. https://www.doncio.navy.mil/ContentView.aspx?ID=20456 | [A] Low for drafts; additional learning for agent configuration and checking output. | [A] One session after entitlement for a draft; no verified onboarding median. | [E] Fully disconnected generation or agent execution not verified. | [V, budget] $123 million FY2026 allocation signal; not a per-seat charge. https://comptroller.war.gov/Portals/45/Documents/news/FY2026_Mandatory_Funding_Allocation_Plan.pdf |
| Prometheus Forge | [V, program] Navy/DoW training evidenced; [E] Forge deployments unknown. https://www.linkedin.com/company/navair-prometheus-group | [V, program] One-day course offered; [E] Forge learning curve unknown. | [E] Course duration is not a verified Forge fielding timeline. | [E] Unknown. | [V, program] Tools described as free to DoW/support; [E] Forge-specific terms unknown. |
| Defense Unicorns UDS | [V, Navy] Delivery platform linked to submarine sustainment. https://www.navysbir.com/success/docs/Defense_Unicorns-AF21A-TCSO1-308.pdf | [A] High for platform engineer; mission app users need not administer it. | [V, vendor] Demo about 15 minutes; Core install two to four hours on prepared production infrastructure. https://docs.defenseunicorns.com/core/getting-started/overview/ | [V, vendor] Core supports disconnected runtime; apps must carry their own dependencies. https://docs.defenseunicorns.com/core/ | [V, repository] Open component; [E] support, infrastructure and deployment quote unknown. https://github.com/defenseunicorns/uds-core |
| Defense Unicorns Ark | [V, provider] App development/delivery product described; [E] named production users unknown. https://job-boards.greenhouse.io/defenseunicorns/jobs/5277744007 | [E] Unknown. | [E] Access-to-working-app duration unknown. | [E] Builder and output application behavior separately unverified. | [E] Price and entitlement unknown. |

## The gap one naval officer might have

[A] Working persona: a division training officer repeatedly reconciling a small schedule from allowed reference files. This persona has not been interviewed. The hypothesis is that the officer wants a usable schedule and a clear explanation of conflicts, rather than a model console, integration project or new software platform.

[R] Let the officer describe the task and choose a prepared workflow. Produce a small application that accepts synthetic inputs, enforces constraints, explains impossible cases and exports a familiar result. The officer reviews requirements and results; a named technical owner handles builds, dependencies, hosting and maintenance.

[P] The project README also calls for message parsing and offline-first workflow demonstrations. The software factory and its resulting applications are separate deliverables. A generated schedule app may work offline even if the development pipeline requires connectivity. Local source: `~/Documents/CDAO/FleetHarness/README.md`, read November 4, 2026.

[R] Make the proposed distinction measurable:

1. [R] One synthetic input produces a result with source references or constraint evidence, not just persuasive prose.
2. [R] Acceptance tests are agreed before generation and include missing inputs, contradictions and impossible schedules.
3. [R] A clean environment can run the delivered application from documented dependencies.
4. [R] Connectivity is removed during the task. Record which functions survive and which stop. If synchronization is in scope, demonstrate conflict handling and duplicate prevention after reconnection.
5. [R] The user can review, reject and stop work. No operational system changes happen automatically. Failures stop the workflow and go to the named technical owner.

[R] Simplicity should mean fewer user decisions and less repeat entry. Keep provenance, approval, logs and failure visibility even when the interface is small.

## Why existing products may already cover it

- [V, vendor] GenAI.mil's Gemini Agent Designer already accepts natural-language agent requests. https://cloud.google.com/blog/topics/public-sector/gemini-for-government-build-custom-ai-agents-for-unclassified-work-on-genaimil/
- [V, vendor] Ask Sage already offers visual workflows and templates. https://docs.asksage.ai/agent-builder/
- [V, vendor] AIP already includes workflow builders and evaluations. https://www.palantir.com/docs/foundry/aip/overview/
- [V, vendor] Donovan already combines no-code agents with sources and evaluation. https://scale.com/donovan
- [V, provider] Ark explicitly targets the development-to-delivery path. Its public description is limited evidence of shipped scope. https://job-boards.greenhouse.io/defenseunicorns/jobs/5277744007
- [V, program] Prometheus already teaches mission personnel to build tools. https://www.linkedin.com/company/navair-prometheus-group

[A] The gap may therefore be access, task configuration, approved data or sustained ownership rather than missing software capability. A provider's ability to support a deployment does not show that the intended officer has it, but lack of team access does not show a market gap either.

[R] If an existing tool passes the same task tests with comparable effort, reuse it. FleetHarness can contribute requirements, synthetic fixtures, adapters, evaluations and a portable package. If none does, claim only the observed advantage on the tested workflow and environment.

## Recommended decision before the deadline

[P] The brief gives a November 5, 2026, 2 PM EST downselect deadline. Judging assigns 30% to impact and 20% to speed to Fleet, with disconnected conditions explicitly relevant. [[Research/00-Brief]] and [[Event/Judging]]

[R] Run one comparison against the easiest already accessible incumbent. Give it the same synthetic inputs and expected outputs. Record user steps, elapsed task time, correctness, manual repair, offline results and export/restart behavior. If access cannot be established, record that friction and avoid declaring the incumbent incapable.

[R] Prioritize one working application and its evidence over a dashboard counting generated repositories. Retain a local runnable path, a clear stop control and a handoff package. For the 30/60/90-day recommendation: first validate with a mission owner, then test the authorized hosting and data path, then evaluate sustainment and a second user. Owners remain to be assigned; do not invent them.

## Sources

[E] The table and paragraphs link full source URLs next to each public factual claim. The individual product notes separate provider claims, government adoption and criticism and contain source lists. [E] Several military sites were available only through indexed extracts; retrieval limits are recorded in those notes.

- [P] [[Research/00-Brief]]
- [P] [[Event/Rules]]
- [P] [[Event/Judging]]
- [V, Navy incumbent designation] https://www.doncio.navy.mil/ContentView.aspx?ID=20456
- [V, vendor agent-builder scope] https://cloud.google.com/blog/topics/public-sector/gemini-for-government-build-custom-ai-agents-for-unclassified-work-on-genaimil/
- [V, direct government experiment] https://media.defense.gov/2025/Aug/05/2003773179/-1/-1/0/CENTAUR%20IN%20TRAINING%20ISSUE%20PAPER_2025%2006-26_MD.PDF
- [V, provider factory scope, limited evidence] https://job-boards.greenhouse.io/defenseunicorns/jobs/5277744007
