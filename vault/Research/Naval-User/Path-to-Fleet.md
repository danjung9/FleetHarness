---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Authorization, acquisition, hosting and sustainment paths, with dated public examples and a proposed transition experiment."
---

# From a useful prototype to Fleet use

## Bottom line

[R] Deliver a tested application plus the evidence a mission owner and technical owner need to evaluate a pilot. [V] RMF makes authorization a risk decision by a senior official; cATO and Navy RAISE provide controlled ways to keep delivering changes (F1 to F4). [R] A platform authorization can help, but the app must fit its boundary and approved delivery process. [V] Public examples show working betas, successful staging and later product retirement, which are distinct outcomes (F7 to F11). [A] No FleetHarness host, authorizing official, installation permission or sustainment funding was verified.

## The separate decisions

| Decision | Evidence and meaning | FleetHarness deliverable [R] |
| --- | --- | --- |
| Mission ownership | [P] The event requires a mission owner, technical owner and next experiment. | Named roles, an agreed task, acceptance criteria, baseline timing and a user feedback plan. Actual people remain unassigned [A]. |
| Security authorization | [V] NIST RMF includes prepare, categorize, select, implement, assess, authorize and monitor. Authorization is an accountable official's risk decision (F1). | System boundary, data flow, controls evidence, assessment results, known risks and monitoring plan. |
| Hosting and integration | [V] CANES documentation includes application compatibility testing before fielding (F5). | A target-specific build, dependencies, deployment and rollback instructions, resource profile and integration test results. |
| Acquisition and resources | [V] The software pathway uses iterative planning and execution with user governance. DAU's primer calls for a program team, operational sponsor and user agreement (F6). | A capability statement, user agreement draft, cost drivers and ownership of hosting, updates and support. |
| Distribution and operation | [R] An app needs a permitted installation route, supported endpoint and operator instructions. | Reproducible package, version identifier, test record, operator guide and stop/recovery procedure. |
| Sustainment | [V] CRS explains that rights to software and technical data affect the government's ability to operate and maintain acquired capabilities (F12). | License inventory, source/build access plan, support owner, patch cadence and handover exercise. |

[R] Do not present a command endorsement, a platform ATO, a mobile store listing or a software acquisition pathway as substitutes for the other decisions. [A] The exact approval sequence depends on the chosen host, information and intended use.

## RMF, ATO, cATO and RAISE in plain language

[V] RMF connects system security and privacy work to the system lifecycle. It includes choosing and implementing controls, assessment, authorization and continuing monitoring. NIST also distinguishes controls inherited from a platform from controls implemented by the application (F1). [R] Ask the host owner which controls can be inherited and what application evidence remains necessary. Keep the boundary explicit, including any model endpoint and synchronization service.

[V] DoD's public cATO implementation guide describes three competencies: continuous monitoring of RMF controls, active cyber defense and an approved DevSecOps reference design. It also addresses software supply-chain protection (F2). [R] Treat cATO as continuing risk management supported by an authorized process. A passing scan or a generated evidence folder does not confer that status.

[V] Navy RAISE 2.0 allows qualifying containerized applications to enter a production environment's existing ATO through certified delivery tooling and delegated authority. Its implementation guide excludes non-containerized applications from scope (F3 and F4). [R] Establish eligibility with the platform's security owner before selecting this route. RAISE does not mean every app requires its own separate ATO, nor does it remove accountable authorization.

[E] The official DoDI 8510.01 and DoDI 5000.87 PDF fetches returned 403. The cATO memo and evaluation-criteria PDF fetches also returned 403. [V] The public DoD CIO library lists the RMF instruction and cATO materials (F13). [R] Use the accessible NIST explanation, indexed DoD guide and DON RAISE notices for this research; verify current signed instructions and applicability with the responsible office before a pilot.

## Software pathway and current enterprise tooling

[V] DAU's January 2023 software-pathway primer describes moving from planning to execution with operational sponsors, architecture and user engagement defined early (F6). [V] DoD's March 10, 2025 public explanation says the March 6 memorandum directs adoption of the Software Acquisition Pathway and flexible contracting approaches for software (F14). [V] GAO's software-acquisition page reports policy updates still in progress and emphasizes user engagement and value measures (F15). [R] Have the acquisition owner confirm the applicable current pathway and resources. Do not promise a fixed ATO or fielding duration.

[V] DON's June 30, 2026 notice says Orion was designated on June 26 as an enterprise DevSecOps service for the stated development processes at IL5 and below. The notice identifies a sole authorized environment for the covered tool suite and excludes low-code/no-code environments (F16). [E] The announcement was available through indexed text; full-page retrieval failed, and the signed memorandum was not reviewed. [R] Recheck scope, exceptions and onboarding with the technical owner. A private hackathon repository is not evidence of an approved DON development or production environment. No repository on that service was opened for this research [E].

## What happened to public examples

| Example and source | Publicly documented outcome | Why it matters and what remains unknown |
| --- | --- | --- |
| [V] iLoc Development Team, War on the Rocks, February 27, 2020 (F7). | Its team lead reports fielded browser applications that run without internet and an average 30 person-hours saved per week per squadron. He attributes progress to operators building with users and security support. | [R] Borrow close user involvement and small local tools. [A] These are firsthand author claims, not independently audited savings; present-day sustainment and formal authorization scope were not verified. Tactical performance details are deliberately excluded. |
| [V] Chaplain Corps App, official Navy account, August 20, 2021 (F8). | Twenty chaplains and religious program specialists produced a beta during a five-day facilitated event on a Navy-hosted low-code platform. The account credits months of requirements preparation and planned incremental testing. | [R] An event can produce a useful beta when needs and hosting have been prepared. [A] The source planned initial capability for October 2021; it does not verify that milestone or current Fleet-wide adoption. No chaplain or personal records were accessed. |
| [V] Overmatch Software Armory RAISE pilot, DON CIO, July 28, 2023 (F9). | Platform-of-choice designation; eight applications approved for operational staging. | [R] Reuse a defined platform and evidence process. [A] Staging is not proof all eight reached production or all ships. No tactical application details are collected here. |
| [V] Black Pearl, Presidential Innovation Fellows 2020 impact report, p. 24 (F10). | The program reports delivering a working platform, ATO and customers in 75 days against a 100-day goal. | [R] Platform preparation can accelerate authorization. [A] This is an official program success account, not a guarantee of 75-day authorization for another app. The current Black Pearl website contains inconsistent wording about RAISE designation, so that status is not treated as settled. |
| [V] eNavFit and NAVFIT98A, official messages and support material (F11). | A 2023 support document records latency and data-handling problems. NAVADMIN 012/25 ends eNavFit Fleet availability on May 1, 2025 and consolidates evaluation needs in modernized NAVFIT98A. | [R] Test correctness, recovery and end-user configuration before scaling. [A] The discontinuation is verified; a single definitive cause is not. It would be inaccurate to say a cloud-only design alone caused retirement. |
| [V] Maintenance-system interfaces, GAO-24-106525, September 2024 (F17). | GAO reports that automatic information transfer had existed, but supporting interfaces stopped being resourced and were shut down around 2011. | [R] Fund the connector and its maintenance owner as part of the product. Working integration can disappear after fielding if support ends. |
| [P] Beachmaster surf-index app in event case 37. | The submitted case says a working offline prototype lacks approved hosting and a phone installation path. | [R] Its fielding package is a relevant transition artifact. [A] Public fielding history and approval status were not independently verified. See [[UseCases/37-sailor-built-to-fleet-fielded]]. |

[V] Proceedings' April 2021 organization argument and the 2022 SWO survey reporting both describe administrative competition for officer time. [R] Keep the application owner close to those users after the event. A demonstration result needs continuing feedback and support rather than a one-time handover.

## Proposed 30/60/90-day experiment

[R] The following are milestones to propose, not promises of authorization or a schedule for Fleet installation.

| Period | Responsible role to secure [R] | Reviewable outcome and gate [R] |
| --- | --- | --- |
| By day 30 | Mission sponsor, officer user, records/data owner and technical host owner. | Repeat a synthetic task with at least five representative users; measure total preparation and review time. Select one runtime and document permitted data, boundaries and support needs. Gate: mission and host owners agree the task and pilot boundary. |
| By day 60 | Technical owner with security manager and authorizing chain. | Produce a reproducible build, dependency inventory, scan results, data-flow diagram, offline/recovery evidence and installation plan. Determine whether existing platform authorization, RAISE or another approved route applies. Gate: responsible officials decide whether the controlled pilot may proceed. |
| By day 90 | Mission owner and funded sustainment owner. | Conduct only the approved pilot, measure corrections and support load, exercise rollback and transfer maintenance to someone other than the original builder. Gate: continue, revise or stop based on results and permissions. |

[R] The handover package should include the approved scope, prohibited actions, human review points, audit log design, escalation route and a simple shutdown procedure. [A] Required funding, host capacity, official sponsorship and pilot participants remain unverified.

## Sources

- [V] F1, NIST RMF overview and SP 800-37 revision 2: https://csrc.nist.gov/projects/risk-management/about-rmf and https://csrc.nist.gov/pubs/sp/800/37/r2/final
- [V] F2, DoD CIO, cATO implementation guide, indexed text retrieved: https://dodcio.defense.gov/Portals/0/Documents/Library/DoDCIO-ContinuousAuthorizationImplementationGuide.pdf
- [V] F3, DON RAISE 2.0 announcement, November 3, 2022: https://www.doncio.navy.mil/ContentView.aspx?ID=15943
- [V] F4, DON RAISE implementation guide, indexed text: https://www.doncio.navy.mil/FileHandler.ashx?id=19108
- [V] F5, Navy CANES application integration budget description, March 2023: https://www.secnav.navy.mil/fmc/fmb/Documents/24pres/OPN_BA2_Book.pdf
- [V] F6, DAU software pathway quick-start primer, January 2023: https://aaf.dau.edu/storage/2023/01/SWP-Quick-Start-Guide_Jan2023.pdf
- [V] F7, War on the Rocks, firsthand account, February 27, 2020: https://warontherocks.com/fixing-the-navys-software/
- [V] F8, official Navy beta-development account, August 20, 2021: https://www.navy.mil/Press-Office/News-Stories/display-news/Article/2764264/chaplains-code-their-own-cloud-tool-tracking-sailor-resiliency/
- [V] F9, DON RAISE pilot outcomes, July 28, 2023: https://www.doncio.navy.mil/ContentView.aspx?id=16441
- [V] F10, program-reported platform outcome, 2020: https://presidentialinnovationfellows.gov/reports/PIF-Impact-Report-2020.pdf and current claims checked November 4, 2026: https://blackpearl.navy.mil/
- [V] F11, official evaluation-tool records: https://www.mynavyhr.navy.mil/Portals/55/Messages/NAVADMIN/NAV2025/NAV25012.pdf and https://www.mynavyhr.navy.mil/Portals/55/Career/PerformanceEvaluation/eNavFit_TipsTricksandBestPractices.pdf
- [V] F12, CRS IF12083, April 22, 2022: https://www.congress.gov/crs-product/IF12083
- [V] F13, DoD CIO public policy library: https://dodcio.defense.gov/library/
- [V] F14, DoD public explanation, March 10, 2025: https://www.defense.gov/News/News-Stories/Article/Article/4114775/modern-software-acquisition-to-speed-delivery-boost-warfighter-lethality/
- [V] F15, GAO-23-105867, July 2023 report with subsequent implementation updates: https://www.gao.gov/products/gao-23-105867
- [V] F16, DON Orion designation announcement, June 30, 2026, indexed text: https://www.doncio.navy.mil/ContentView.aspx?id=20501
- [V] F17, GAO maintenance IT history, printed p. 38 and footnote 80: https://www.gao.gov/assets/880/872778.pdf
- [V] Practitioner admin context: https://www.usni.org/magazines/proceedings/2021/april/time-new-shipboard-organization and https://news.usni.org/2023/06/19/surface-warfare-tackles-persistent-problems-as-more-than-half-of-jos-say-they-dont-want-command
