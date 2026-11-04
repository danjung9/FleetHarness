---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Public administrative workflows mapped to event use cases and bounded prototype opportunities."
---

# Paperwork and coordination workflows

## Bottom line

[R] Build around an existing input, a reviewable transformation and an accepted output. [V] Navy maintenance evidence documents repeated entry across systems, while current correspondence instructions retain explicit signature and release authorities (W1 and W3). [P] The event cases describe message sorting, training conflicts, draft routing and offline forms as specific burdens. [R] Demonstrate these with synthetic records and preserve the human decision at the end. [A] Current local tool versions, interfaces and routing details need confirmation for each future pilot.

## Workflow map

| Job | Public picture of the present process | Event use case | Bounded application and human control [R] |
| --- | --- | --- | --- |
| Handle incoming messages | [P] Case 24 describes manual reading for command tasks and case 40 describes email distribution and duplicate copies. [V] NETC's communications instruction assigns review and release responsibilities (W2). | [[UseCases/24-automated-message-traffic-task-event-extraction]], [[UseCases/40-anchor-authoritative-naval-communications-hub-for-official-r]], [[UseCases/12-electronic-optask-operational-tasking-message-parser-timelin]] | Import a synthetic administrative message; extract action, due date, addressee and source span; officer confirms applicability and assignment. Distinguish a draft task from an official order. |
| Plan training | [P] Case 11 describes weekly PB4T conflicts among departments, resources and personnel. [V] Public Navy medical guidance places all-hands medical training in the PB4T process and long- and short-range schedules (W4). | [[UseCases/11-pb4t-planning-board-for-training-autonomous-deconfliction-ag]] | Import synthetic availability and training requirements, show collisions, propose alternatives and explain infeasibility. A designated officer approves the plan. |
| Draft and route a casualty report | [P] Case 8 describes email, paper edits and separate tools between originator and CO. [V] In 2023, SURFOR representatives told USNI some ships were smoothing this reporting chain through automation (W5). | [[UseCases/8-casrep-command-unified-casualty-report-drafting-routing-rele]] | Demonstrate a wholly fictional draft, review comments, return, revision and approval. Do not connect to message release, infer actual readiness or claim verified compliance with a manual not reviewed here. |
| Schedule and record maintenance | [V] NAVSEA describes SKED as scheduling maintenance, recording completion and supporting technical feedback (W6). [V] GAO found repeated entry, reconciliation and paper backup records in its maintenance IT review (W1). | [[UseCases/44-equipment-maintenance-at-the-edge-using-ai]], [[UseCases/22-handwritten-to-digitized-fleet-documents]] | Capture a synthetic entry once, validate it, preserve the original scan and export a review package. Human attestation is required before recording work as complete. |
| Prepare watchbills | [V] Navy organization guidance assigns watch-organization responsibilities; GAO evaluates fatigue management and watchbill-related efforts (W7 and W8). [A] Excel, paper or a particular scheduling app is not verified as the universal method. | [P] Case 11 includes availability and fatigue constraints. No dedicated watchbill case was identified in the index read. | Use a fictional training roster to illustrate constraint checks. Let qualified leadership resolve exceptions. Do not collect a real watch rotation, qualification roster or availability picture. |
| Route correspondence and requisition packages | [V] A 2025 Naples instruction specifies ETMS2 business rules, routing matrices, checklists and a routing slip (W3). [P] Case 36 describes handwriting, re-keying and manual routing. | [[UseCases/36-paperless-underway]] | Validate required fields, show who has the package and produce a printable/exportable draft. Preserve the approved signature process. |
| Track shore-staff actions | [P] Case 42 describes public-affairs spreadsheets, email and unlinked status trackers. It names Flank Speed, SharePoint lists, Power Apps and Power Automate. | [[UseCases/42-enterprise-pa-ops-platform-fleet-wide-operational-planning-m]] | Show a synthetic request-to-review-to-close sequence and draft an after-action summary. Keep funding, commitments and public-release decisions with humans. |

## Shared steps worth simplifying

[R] Use this common sequence to scope an application: receive, identify, check, assign, draft, review, approve, export and retain. Each transition should name the responsible role and the evidence needed. [A] The sequence is a design abstraction inferred from the cases and public routing examples, not a Navy-wide prescribed process.

[R] Preserve three different states: the original source, the application's proposed interpretation and the human-approved record. A corrected extraction should not rewrite the original source. A routing acknowledgment should not imply approval. A successful export should not imply acceptance by the authoritative system.

[R] For message handling, display the exact source sentence beside each task, retain source identifiers and flag missing dates. For scheduling, report which supplied constraints conflict and which can be relaxed by an authorized person. For forms, validate the supplied template and show uncertain handwriting beside the scan. [P] Case 22 specifies a 70% confidence review threshold. [R] Treat that as an event requirement, not proof that a model confidence score is calibrated to 70% accuracy.

## A concrete first demonstration

1. [R] Load 20 wholly synthetic administrative messages with fictional units and arbitrary dates unrelated to real activities. Seed explicit tasks, non-task text, corrections and missing information.
2. [R] Produce an officer's review queue containing proposed tasks, deadlines and source spans. Leave unknown values blank and marked for review.
3. [R] Approve one task, correct one date, reject one extraction and show the recorded decisions.
4. [R] Export the approved list as CSV and a readable review document. Keep outgoing message transmission disabled.
5. [R] Repeat with the network disabled. State which parts are functional locally and which require the build-time cloud service.

[P] The project README defines message parsing, training deconfliction and offline workflow as its initial proof of concept. [R] Use the same review pattern across those three applications, while allowing different technical implementations. Do not require the officer to choose an agent framework, database or model to describe the desired work.

## How to measure the burden

[R] Compare the same synthetic task with the user's current method and the prototype. Count active minutes across every participant, review corrections, missed required items, duplicate entries, handoffs and time waiting for approval. Report waiting time separately from labor. Include setup and training amortization when estimating recurring savings.

[R] Calculate net person-minutes saved as baseline preparation plus baseline review, minus assisted preparation, assisted review and any added reconciliation. Repeat enough cases to reveal corrections rather than timing only a successful example. [A] No local baseline or measured savings was established during this research.

## Sources

- [V] W1, GAO-24-106525, September 2024, maintenance IT discussion on printed pp. 37 to 39: https://www.gao.gov/assets/880/872778.pdf
- [V] W2, NETCSTAFFINST 2300.1G, public message-handling guidance, indexed excerpt: https://www.netc.navy.mil/Portals/46/NETC/staff%20inst/23001G.pdf
- [V] W3, Naples administrative document routing instruction, April 7, 2025: https://cnreurafcent.cnic.navy.mil/Portals/78/NSA_Naples/Documents/NSA%20Naples%20Instructions/NAVSUPPACTNAPLESINST%205216_1N%20-%20ADMINISTRATIVE%20DOCUMENT%20ROUTING_1.pdf
- [V] W4, public medical training guidance, March 6, 2014, historical example, current applicability not verified: https://www.med.navy.mil/Portals/62/Documents/NMFA/NMCPHC/root/Program%20and%20Policy%20Support/Water%20Sanitation%20and%20Safety/SURFLANTPACINST_6000_1_6Mar2014.pdf
- [V] W5, USNI News, June 19, 2023, interview evidence: https://news.usni.org/2023/06/19/surface-warfare-tackles-persistent-problems-as-more-than-half-of-jos-say-they-dont-want-command
- [V] W6, NAVSEA maintenance planning product description, retrieved November 4, 2026: https://www.navsea.navy.mil/Home/Warfare-Centers/NUWC-Keyport/NSLC/Products-Services/Maintenance-Planning/
- [V] W7, OPNAVINST 3120.32D with change 1: https://www.secnav.navy.mil/doni/Directives/03000%20Naval%20Operations%20and%20Readiness/03-100%20Naval%20Operations%20Support/3120.32D%20W%20CH-1.pdf
- [V] W8, GAO-21-366: https://www.gao.gov/products/gao-21-366
- [P] Local event evidence: [[UseCases/README]] and the linked use-case notes above. These describe submitted needs, not independently observed command processes.
