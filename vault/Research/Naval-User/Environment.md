---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Public enterprise and afloat computing context, with realistic candidate runtimes and explicit access gaps."
---

# Where an officer's tool can run

## Bottom line

[V] Flank Speed provides Navy Microsoft 365 cloud services, and CANES provides afloat network infrastructure and application hosting (E1 and E4). [R] Treat connected shore work, a disconnected government workstation and an approved onboard server as separate deployment targets. [A] This research did not verify a particular unit's devices, licenses, browser policy or hosting permissions. [R] A browser application can be a useful packaging choice, but its local storage, installation and network access still need approval and testing. [R] Do not make personal phones or a cloud model API prerequisites for completing an offline workflow.

## Public environment and its limits

| Environment | Public evidence | Practical implication [R] |
| --- | --- | --- |
| Connected shore workspace | [V] DON describes Flank Speed as its Microsoft 365 cloud environment, with collaboration and productivity services (E1). [V] NAVWAR's 2024 ODIN announcement names Dataverse, Power Apps, Power Automate and Power BI within Flank Speed (E2). | Consider a tenant-hosted application or SharePoint-based workflow if the mission owner already has the environment, permissions and support. Confirm connectors and licenses before depending on them. |
| Government endpoint | [V] PEO Digital's January 2025 Nautilus announcement describes cloud-managed endpoint modernization and a planned October 2025 transition (E3). | Test the actual managed configuration. The published transition target is not evidence that every device migrated or permits arbitrary software installation. |
| Virtual desktop | [V] A February 2025 Navy Reserve newsletter describes Nautilus Virtual Desktop and changed personal-device access requirements (E5). | Useful for connected access to a government workspace. A cloud-hosted desktop is not an offline execution environment. |
| Afloat local network | [V] Navy budget documentation describes CANES application hosting and an application-integration testing process before fielding (E4). | An onboard service could support several local browser clients without a shore round trip, subject to hosting, identity, integration and administration approval. Do not equate a cloud deployment with a CANES deployment. |
| Limited or absent shore connection | [V] GAO's 2024 maintenance review documents paper backup records and connectivity problems in the administrative workflow context (E6). [P] Event rule 9 requires consideration of disconnected operation. | Load essential assets locally, save work durably and make pending synchronization visible. Connectivity restoration must not silently overwrite a reviewed record. |
| Personal device | [V] Reserve guidance describes approved remote-access routes. The 2024 telework instruction favors keeping government documents inside Flank Speed or the authorized portal rather than storing them on personal devices (E5 and E7). | Do not assume BYOD means permission to cache government data, install an arbitrary app, or bridge a personal network into an official system. |

[V] An April-June 2023 CHIPS article described a gap between shore Flank Speed access and tactical fleet commands at that time (E8). [V] An October 2024 DON update mentions testing of Flank Speed Edge capabilities (E1). [R] Read these as dated evidence of an evolving service. Neither establishes universal disconnected M365 operation or current access for every afloat officer.

## Connectivity and emission control

[V] An April 2025 official Military Sealift Command publication says its personal-use Wi-Fi service remains subject to operational-security and emission-control policy and can be shut down (E9). [R] The relevant product requirement is user-directed suspension of network activity and useful local behavior when disconnected. [A] This source covers that service; it does not establish a Fleet-wide device policy or a standard outage duration.

[R] Do not infer any real unit's connectivity, electromagnetic posture, schedules or system limitations from these generic publications. In testing, label bandwidth and outage conditions as synthetic engineering scenarios. [R] A local network may remain available when the shore link is unavailable, but also test a single-device mode with every network interface disabled. [A] Permission to use a local network under a particular posture is a command decision, not established here.

## What can realistically run

| Candidate package | Suitable demonstration | What must be true before a Fleet pilot | Offline claim that is supportable |
| --- | --- | --- | --- |
| [R] Flank Speed low-code workflow | Synthetic shore-staff request routing using tenant lists and approvals. | [A] Authorized tenant access, app maker role, connector policy, licenses, data owner and sustainment owner. | [R] Claim connected workflow only until the specific client and storage mode pass disconnected tests. |
| [R] Self-contained local browser tool | Deterministic message parsing, form validation or a small local scheduler. | [A] Permitted packaging and launch method, supported browser, approved storage, identity and update process. | [R] Can claim tested functions work locally if scripts, assets and data are packaged and no runtime network requests are needed. |
| [R] Local service on an approved government host | Multi-user synthetic routing and synchronization on a local network. | [A] Approved host resources, port/service rules, access control, backup, administrator and integration testing. | [R] Works without shore connectivity if every runtime dependency is local. It still requires the local host and network. |
| [R] Approved government mobile package | Offline capture of a synthetic form. | [A] Supported government hardware, distribution path, device management, storage protection and command permission. | [R] Claim only after cold launch, local save and restart tests on that approved device configuration. |
| [R] Cloud model service | Build-time development and connected interpretation of synthetic inputs. | [A] Authorized service, network egress and allowed data boundary. Event access does not establish Navy authorization. | [R] No runtime model inference while fully disconnected unless a separately tested local engine exists. |

[R] Separate the FleetHarness development environment from each generated application's runtime. A developer can use a cloud service to build a program that later runs locally. [P] The project README explicitly permits distinct deployment architectures for its applications.

## Questions for a future technical owner

[R] Before selecting a runtime, obtain answers for the intended pilot: approved device class and operating system; supported browser; local write permissions; authorized identity method; hosting boundary; permitted data; required export format; update and rollback owner; and disconnected session policy. [A] None of those unit-specific answers was verified here. [R] Do not obtain them by collecting operational configurations or credentials during this event.

## Sources

- [V] E1, DON CIO, October 28, 2024, Flank Speed service update, indexed text: https://www.doncio.navy.mil/ContentView.aspx?ID=18012
- [V] E2, NAVWAR ODIN announcement, January-March 2024, indexed text; full-page retrieval returned 502: https://www.doncio.navy.mil/CHIPS/ArticleDetails.aspx?ID=16666
- [V] E3, PEO Digital, January 2025, Nautilus endpoint announcement: https://www.peodigital.navy.mil/News/Article/4040734/nautilus-devices-drastically-improve-sailors-experience-with-it-and-improve-the/
- [V] E4, Navy FY2024 procurement justification, March 2023, CANES application integration description: https://www.secnav.navy.mil/fmc/fmb/Documents/24pres/OPN_BA2_Book.pdf
- [V] E5, Navy Reserve Strategic Sealift Officer newsletter, February 2025, dated access guidance, not verified as the November 2026 universal rule: https://www.navyreserve.navy.mil/Portals/35/SSO%20Documents/Strategic%20Sealift%20Officer%20Force%20Newsletter%20%28FEB%202025%29.pdf
- [V] E6, GAO-24-106525, September 2024, administrative IT context: https://www.gao.gov/assets/880/872778.pdf
- [V] E7, COMNAVRESFORINST 12610.2D, March 28, 2024, command-specific telework guidance: https://www.navyreserve.navy.mil/Portals/35/12610.2D%20NEW.pdf
- [V] E8, CHIPS, April-June 2023, historical shore/afloat access comparison, indexed text; full page returned 502: https://www.doncio.navy.mil/CHIPS/ArticleDetails.aspx?ID=16219
- [V] E9, U.S. Fleet Forces, April 2025, MSC personal-use connectivity policy example: https://www.usff.navy.mil/Press-Room/News-Stories/Article/4162204/shipboard-wi-fi-is-coming-to-military-sealift-commands-fleet-of-government-owne/
