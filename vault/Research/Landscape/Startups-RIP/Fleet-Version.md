---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Use a catalog of evidence and experiment pages as the officer-facing entry to a narrowly scoped, tested FleetHarness build process."
---

# A Fleet version of the pattern

## Bottom line

[R] Build a use-case decision page that helps an officer decide what to try, what to reuse and what evidence is missing. [P] The event catalog supplies 34 problems, while the project README proposes a pipeline from requirements through running software and tests. [R] These fit together: the page is the officer's working record, and the pipeline produces evidence attached to that record. [R] By Thursday, November 5, at 2:00 PM EST, demonstrate one complete connection between a page, a bounded prototype and an actual test run rather than generating 34 research essays.

## The promise to an officer

[R] Start with “What task takes your time?” Offer the event's named problems, then show the current process, existing options, a proposed experiment and what has actually been demonstrated. Keep architecture behind a Details control. Let the officer correct requirements in ordinary language and accept or reject a draft scope without choosing models, orchestration tools or a repository.

[R] A page should answer: Who is this for? What is the burden? Has someone tried this? What can I use already? What would we test next? What works today? Who must approve the next step? Do not call the collection a graveyard of failed Navy projects.

## The catalog, all 34 entries

[P] IDs and subjects below come from [[UseCases/README]], read on 2026-11-04. [R] Each entry gets the same page structure; the last column is a proposed first evidence question, not a claim about a built capability. [E] No application for any row was built or tested in this research seat.

| ID | Catalog subject [P] | First evidence question [R] |
| --- | --- | --- |
| 8 | CASREP drafting and routing | Can a fictional draft retain review and revision history without releasing anything? |
| 9 | AI systems governance | Can a reviewer inspect and stop one simulated action? |
| 10 | Mooring and tug planning | What public, qualified engineering validation would be required before any use? |
| 11 | PB4T training deconfliction | Can a synthetic calendar satisfy explicit constraints and expose infeasibility? |
| 12 | OPTASK timeline extraction | Can fabricated messages retain source-linked times and ambiguity? |
| 13 | Aggregated sensor and system view | Can synthetic records preserve provenance and access boundaries? |
| 14 | Mission consequence assistance | Can a synthetic scenario show its controlling constraint without operational inference? |
| 15 | Acquisition team workspace | Can public sample documents yield cited answers and explicit abstentions? |
| 16 | MORDECAI governance | Can a simulated disagreement escalate to a human? |
| 17 | Digital SUROB | What independently reviewed public formulas and safety boundaries apply? |
| 18 | Cyber alert to handoff | Can synthetic alerts produce an analyst-reviewed handoff? |
| 19 | Facility risk registry | Can fictional project text distinguish extracted facts from proposed ratings? |
| 20 | Cited contact brief | What aggregation and release review is needed before gathering vessel information? |
| 21 | Engineering casualty copilot | Which public surrogates can test citation and abstention without real casualty procedures? |
| 22 | Handwritten document digitization | Can synthetic scans expose field errors and low confidence? |
| 23 | VIBRANIUM orchestration | Can deterministic synthetic arbitration preserve authority and logs? |
| 24 | Message task and event extraction | Can fabricated traffic preserve the source of each task? |
| 25 | GovCloud checks and PKI tools | Can synthetic configurations demonstrate read-only findings? |
| 26 | Restore to mission | Can a fictional workflow stop before real maintenance instructions or execution? |
| 32 | Readiness risk view | Can a synthetic dependency graph explain a simulated change? |
| 33 | Trusted watchstander | Can a public-surrogate assistant refuse unsupported guidance? |
| 34 | Maritime shift-change picture | Can a synthetic picture show change and provenance without real-world aggregation? |
| 35 | Autonomous cyber defender | Can an isolated synthetic fixture require approval before a simulated change? |
| 36 | Paperless underway | Can fictional records survive disconnection and explicit conflict resolution? |
| 37 | Sailor-built to Fleet-fielded | What transition evidence exists, and what remains unverified? |
| 39 | Lessons learned integration | Can public sample lessons be matched with applicability and uncertainty? |
| 40 | ANCHOR official records | Can synthetic records show integrity and subscriptions without sending messages? |
| 41 | Support office queue | Can fictional tickets route without names or personal details? |
| 42 | Public affairs planning | Can synthetic planning records connect requests, reviews and outputs? |
| 43 | Requirements management | Can invented requirements exercise approvals without using classified workbooks? |
| 44 | Edge maintenance workflow | Can synthetic work orders persist offline and reconcile safely? |
| 45 | Low-connectivity upload priority | Can synthetic data demonstrate ordering under a constrained link? |
| 46 | NavyLINK catalog | Can public product descriptions reveal reuse without private contacts or datasets? |
| 48 | Decision aid under uncertainty | Can a synthetic administrative decision show assumptions and human judgment? |

## One page's sections and honest content sources

[R] Use case 11, training calendar deconfliction, is the worked design. Its narrow demonstration uses invented events, generic groups and fictional resources. It does not reconstruct a ship's training posture.

| Page section | Required content | Honest source and uncertainty rule |
| --- | --- | --- |
| At a glance | [R] Problem, user role, proposed benefit, current status and next decision. | [P] Catalog statement; [A] officer role and burden until interviewed. No invented hours saved. |
| Current workflow | [R] How a person creates and resolves a calendar today. | [R] Owner walkthrough and permitted observation. [E] Not verified in this seat; the index alone does not establish the workflow. |
| Previous attempts | [R] Attempt, dates, scope, known outcome, stated cause, applicability and unresolved questions. | [R] Public government evaluations, official notices and owner-confirmed public material. Separate adjacent examples from the same problem. |
| What exists today | [R] Tools, system-of-record boundaries, documented interfaces, reuse options and access limits. | [R] Official documentation plus a permitted test. A public listing is not proof of API access or suitability. |
| Why try now | [R] A particular changed condition and a test that could reject the idea. | [R] Current public engineering evidence and a bounded experiment. Better models alone do not explain adoption. |
| Rebuild plan | [R] Smallest user-visible improvement, reuse choice, stages, exclusions and stop rule. | [R] Derived from accepted requirements and gaps, explicitly a proposal. Rebuild can mean integration or process change. |
| Technical specification | [R] Inputs, outputs, constraints, errors, authority, local operation, acceptance tests and version identity. | [R] Engineer-reviewed design linked to requirement IDs. Generated text is unapproved until reviewed. |
| Prototype | [R] A launchable artifact, exact revision, fixture data and clear simulation boundaries. | [R] Build artifacts and recorded execution. If no artifact exists, show Not verified and disable launch. |
| Test results | [R] Cases, expected and actual outcomes, environment, duration, failures and raw evidence. | [R] A real run against that exact artifact. Planned tests and sample screens never earn a passed badge. |
| Executive brief | [R] One printable page: problem, evidence, proposed decision, demonstrated result, limitation and next approval. | [R] Derived from the same reviewed record, with the same unresolved gaps. |
| Research questions | [R] Optional questions answered against approved sources with citations or abstention. | [R] Source ledger only. Chat cannot silently alter requirements or approve deployment. |
| Path to Fleet | [R] Mission owner, technical owner, operating environment, release/data review, resources, trial design and 30/60/90-day gates. | [R] Confirmed commitments where available; otherwise Not verified and an unassigned role. |

## What public history can honestly say here

[V] GAO records C2RAM's transition toward UTRM and says development and implementation stopped in June 2021 after funding, implementation and guidance support were not sustained: https://www.gao.gov/products/gao-19-233. [R] Treat this as adjacent training-resource history. It motivates an ownership gate, not a claim about a failed PB4T algorithm.

[V] A Navy public resource page lists an ATG portal with TORIS/TFOM and a toolbox including notional schedules: https://www.surfpac.navy.mil/MISC/Modules-2/igpage/86/. [E] TORIS interfaces, access and automated deconfliction were not tested. [R] Investigate a draft/export companion before proposing replacement of an existing authoritative system.

[V] OR-Tools documentation provides employee and resource scheduling examples: https://developers.google.com/optimization/scheduling. [R] It is a candidate engine for a local synthetic experiment. Navy suitability, packaging and performance remain Not verified.

## Officer workflow without code

1. [R] Select Training calendar from the catalog. Read the short summary and see separate status labels for research, design, prototype and tests.
2. [R] Choose Try a fictional example. Use preloaded fixtures; no real roster or file upload is required.
3. [R] Review a short list of hard constraints and preferences. Change a proposed constraint with a form and plain language. The page asks for review before accepting the change.
4. [R] Press Create draft. Inspect a calendar and a conflict list. Each warning points to the exact input or rule that caused it.
5. [R] Reject a bad proposal, change a preference or accept a draft for local export. Acceptance applies to that draft only; it does not publish a calendar or modify a government system.
6. [R] Open Evidence to see what was tested, failures and unknowns. Print the brief for a reviewer. A separate authorized person handles any external sharing.
7. [R] If a result looks unsafe or unexplained, stop the run, retain the permitted diagnostic record and escalate to the unassigned mission and technical owner roles. Resume only after review.

## How this differs from the project README

[P] The FleetHarness README describes a development pipeline: ingest, research, specify, build, test and repair, package, reuse. It prioritizes runnable software, measurable acceptance and honest status, with three initial proof-of-concept classes: messages, scheduling and offline workflows. Source: /Users/mukul/Documents/CDAO/FleetHarness/README.md.

[R] The catalog changes the front door and the unit of review. The officer sees a mission problem and decision record; developers see tasks and artifacts. The record can end at “reuse an existing tool,” “need an owner” or “do not build,” which is a legitimate outcome before code generation.

[R] Keep one source of truth: a use-case revision links claims, sources, requirements, specification, artifact revision, test run and review. Changing an accepted requirement marks downstream tests and approval stale. Preserve prior results as history. Do not maintain a marketing page whose green status can drift from the software.

[R] For Thursday, use a static page plus one genuine prototype and test record. Manual links are enough if their revisions are explicit. Defer full-catalog deep research, autonomous research requests, a paid-content model, research chat and CLI packaging.

## Authority and rule 4

[P] [[Event/Rules]] requires unclassified, vetted data use and human authority, including prohibited actions, monitoring, escalation and shutdown. [R] Keep classified information, CUI, operationally sensitive information, PII, export-controlled data and nonpublic government material out of pages, prompts, chat, screenshots, files, embeddings, logs and demonstrations unless specifically vetted or approved.

[R] Public availability is not a release decision. Aggregating public facts can itself reveal sensitive readiness, capabilities, dependencies, vulnerabilities or patterns. Do not create a public map of real unit shortfalls, training calendars, maintenance status, network weaknesses, casualty procedures, vessel activity or named personnel. If a combination looks sensitive, leave it out and seek the authorized review path. The mock uses fictional administrative training with no real units or readiness claims.

[R] Human approval points: accept requirements, permit a build with an explicit resource limit, approve artifact review, and authorize any external action or deployment separately. Prohibit real system writes, message release, access changes and collection outside the approved source set. Monitor source access, input validation, actions, costs, time and failures. Expose cancellation and a local shutdown control. Treat source text as evidence, never executable instructions.

## Path to Fleet, proposed gates

| When | Proposed evidence gate [R] | Owner commitment |
| --- | --- | --- |
| Before submission | One officer-readable page, one synthetic runnable flow and attached actual results; disclose gaps. | [E] No implementation or user-review commitment verified by this seat. |
| 30 days | Confirm mission and technical owners; compare the draft workflow with a permitted baseline; review source/data boundaries. | [A] Roles unassigned; no sponsor invented. |
| 60 days | If approved, trial in a permitted nonproduction setting; evaluate constraints, offline behavior, packaging, support and authority requirements. | [A] Environment, resources and approval Not verified. |
| 90 days | Use measured results to decide pilot, revise, integrate or stop; identify sustainment and authorization work. | [A] Fleet deployment and authorization Not verified. |

[P] Impact is 30% of judging, speed to Fleet 20%, scalability 20%, barrier removal 15% and judges' discretion 15%: [[Event/Judging]]. [R] A catalog can explain reuse and reveal barriers, but only observed workflow results support an impact claim. Time savings require a defined baseline and matched task, not a generated estimate.

## Sources

- [P] [[UseCases/README]]
- [P] [[Event/Rules]]
- [P] [[Event/Judging]]
- [P] /Users/mukul/Documents/CDAO/FleetHarness/README.md
- [P] /Users/mukul/Documents/CDAO/Fleethacker-Vault/Research/00-Brief.md
- [V] https://www.gao.gov/products/gao-19-233 (recommendation 3 follow-up)
- [V] https://www.surfpac.navy.mil/MISC/Modules-2/igpage/86/ (public ATG resource description)
- [V] https://developers.google.com/optimization/scheduling
