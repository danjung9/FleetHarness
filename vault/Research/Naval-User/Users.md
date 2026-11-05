---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Officer roles, documented administrative burden and limits on the available time estimates."
---

# Officers who could use FleetHarness

## Bottom line

[R] Start with a division officer or training officer who needs to turn an existing document into a reviewed action list or feasible training plan. [V] A Navy survey received 2,550 SWO responses, and USNI reporting describes administrative requirements as a major source of dissatisfaction (sources U2 and U3 below). [V] A CIMSEC author estimated 30% of in-port submarine officer time went to administrative and miscellaneous tasks, but this was a constructed estimate with broad categories, not a representative time-use survey (U5). [R] Measure the selected task directly before claiming hours saved. [A] The best initial role still needs confirmation with an available mission owner.

## Roles and accountabilities

[V] The shipboard responsibilities below summarize the public Standard Organization and Regulations of the U.S. Navy, OPNAVINST 3120.32D with change 1. Local organization can vary; its currency for a specific command was not verified. Source U1: https://www.secnav.navy.mil/doni/Directives/03000%20Naval%20Operations%20and%20Readiness/03-100%20Naval%20Operations%20Support/3120.32D%20W%20CH-1.pdf

| Role | Public accountability [V, U1] | Proposed use [R] | Burden evidence and limit |
| --- | --- | --- | --- |
| Division officer | Division personnel, training, assigned equipment and records; reports through department leadership. | Review extracted tasks, prepare a draft package, check missing fields. | [V] SWO survey reporting identifies admin and workload distribution as dissatisfaction factors for junior officers (U3). [A] Hours per division officer are not verified. |
| Department head, such as engineering or operations | Department readiness, administration, personnel, training and maintenance. | Resolve cross-division conflicts and review draft reports. | [V] Proceedings describes the competing demands of personnel, maintenance and other duties across officer levels (U4). [A] Department-specific admin hours are not verified. |
| Executive officer (XO) | Coordinates work, training and schedules; supervises the 3-M program and assists the commanding officer. | View overdue reviews, conflicting commitments and package status. | [V] GAO's maintenance review documents duplicate systems and repeated data reconciliation (U8). [A] It does not isolate XO paperwork hours. |
| Training officer | Coordinates the unit training program and schedules within the command organization. | Prepare a proposed schedule and explain infeasible constraints. | [P] Case 11 describes weekly planning conflicts and double-booking. See [[UseCases/11-pb4t-planning-board-for-training-autonomous-deconfliction-ag]]. |
| Commanding officer (CO) | Responsibility and authority for the command. | Approve consequential products and changes; inspect the evidence. | [R] Treat this role as an approval authority and sponsor, with a concise review view. |
| Shore staff action officer | [V] Staff correspondence uses assigned signature and release authorities; NETC publishes a routing matrix (U9). Specific duties depend on billet. | Track tasking, coordinate a response and prepare a decision package. | [P] Case 42 describes email, spreadsheets and disconnected trackers in public affairs planning. See [[UseCases/42-enterprise-pa-ops-platform-fleet-wide-operational-planning-m]]. [A] Shore-staff admin hours are not verified. |

[R] Include a chief, yeoman, maintainer or other person who prepares the inputs in user testing. A smoother officer review screen can still shift extra work to the person assembling the package. [A] The officer entering a need into FleetHarness, the person using its generated application and the person authorized to approve installation may be different people.

## What the numbers actually establish

| Finding | Population, date and method | What can be claimed |
| --- | --- | --- |
| [V] 2,550 responses, 33% response rate; a senior-officer survey received 855 responses, 61% response rate. | CNSF's June 9, 2023 public announcement of the 2022 SWO surveys, ensign through captain (U2). | A substantial documented sample. The announcement does not provide a time-use measure. Do not add the two response counts as unique individuals. |
| [V] USNI reports most junior officers were dissatisfied with administrative requirements, workload distribution and shipyard working hours. | June 19, 2023 reporting on the survey and interviews with SURFOR representatives (U3). | Admin friction is a user problem. This is not a causal estimate of retention effects or software savings. |
| [V] Estimated 30% administrative and miscellaneous, plus a separately defined 14% divisional and collateral duties. | CIMSEC, April 30, 2018, in-port submarine officer allocation assuming an 11-hour workday (U5). The admin category includes meetings, planning, lunch and unaccounted time. | Public estimate only. Neither 30% nor the combined 44% is a measured share of automatable paperwork across the Navy. |
| [V] Figure 8 reports 7 hours per week of administrative and other activity versus a 4-hour standard allowance; total duty was 108 hours versus 81. | GAO-17-413, May 2017, pp. 19 to 21, citing a 2014 Navy study. Three crews recalled the preceding 24 hours, extrapolated to a week (U6). | Historical crew-level context. The category includes inspections and medical attention. This is not an officer-specific admin figure or a current Fleet average. |
| [V] GAO estimated 14% of officers received at least 7 hours of daily sleep and 67% received 5 hours or less on their most recent deployment. | GAO-21-366, May 2021, based on a 2020 survey of surface warfare officers (U7). | Design for constrained attention and interruptions. These figures do not identify what share of lost sleep admin caused. |
| [V] GAO surveyed XOs across 232 ships in scope, with a 91% response rate, and visited 25 ships. It found fragmented maintenance IT increased administrative burden. | GAO-24-106525, September 2024, survey, interviews and observations (U8). | Re-entry and reconciliation have independent audit evidence. No verified number of paperwork hours saved by a new app. |

[E] The GAO chart was available in the search service's rendered description and screenshot retrieval was requested; no numeric calculation was made from a guessed chart shape. [R] Prefer the report's category names and methodology when quoting the figures.

## Which user to prioritize

[R] First candidate: a junior officer reviewing synthetic administrative message tasks, cases 24 and 12 at a safe abstract level. Second candidate: a training officer preparing a synthetic PB4T schedule, case 11. Third candidate: an originator and reviewer completing an offline form, case 36. These align with the three proof-of-concept areas in the project README [P].

[R] Ask an eventual user to demonstrate one redacted or fully synthetic task from start to finish: what arrives, what must be checked, who approves, where the accepted record goes and what happens when the tool is unavailable. Capture aggregate task timing and error counts. [R] Do not collect real rosters, messages, watchbills, maintenance status or personal records for this event.

## Sources

- [V] U1, OPNAVINST 3120.32D with change 1, public organization reference: https://www.secnav.navy.mil/doni/Directives/03000%20Naval%20Operations%20and%20Readiness/03-100%20Naval%20Operations%20Support/3120.32D%20W%20CH-1.pdf
- [V] U2, CNSF, June 9, 2023, survey announcement, indexed text retrieved; full page returned 403: https://www.surfpac.navy.mil/Media/News/Article/3423138/on-surface-warfare/
- [V] U3, USNI News, June 19, 2023, reporting and interviews: https://news.usni.org/2023/06/19/surface-warfare-tackles-persistent-problems-as-more-than-half-of-jos-say-they-dont-want-command
- [V] U4, Proceedings, April 2021, practitioner argument, not a survey: https://www.usni.org/magazines/proceedings/2021/april/time-new-shipboard-organization
- [V] U5, CIMSEC, April 30, 2018, author estimate and explanatory footnote 6: https://cimsec.org/deckplate-review-submarine-force-can-reach-warfighting-potential-pt-1/
- [V] U6, GAO-17-413, May 2017: https://www.gao.gov/assets/gao-17-413.pdf
- [V] U7, GAO-21-366, May 2021: https://www.gao.gov/products/gao-21-366
- [V] U8, GAO-24-106525, September 2024: https://www.gao.gov/products/gao-24-106525 and https://www.gao.gov/assets/880/872778.pdf
- [V] U9, NETCSTAFFINST 5216.1H, January 27, 2025: https://www.netc.navy.mil/Portals/46/NETC/staff%20inst/52161H.pdf
