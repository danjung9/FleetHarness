---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A line-by-line reading of the FleetHarness proposal, its vocabulary and its unresolved choices."
---

# What the FleetHarness README means

## Bottom line

[P, project README lines 9 to 11] FleetHarness proposes a repeatable way to build separate applications from problem descriptions. [P, lines 23 to 31] It covers requirements, research, planning, coding, testing, repair, packaging and reuse, under human review. [E, close reading] The text describes intended behavior, not evidence that these capabilities exist. [P, lines 71 to 77 and 93 to 95] Three different trial challenges are the first proposed proof; repeatedly producing useful software with less engineering effort is the broader goal. [E, close reading] The README does not yet explain how a noncoding officer would drive this process or know when to trust its results.

## How to read the promises

[E, reading method] Line numbers below refer to the local project README read on 2026-11-04. Blank lines, headings and diagram arrows add structure, not separate requirements. Every substantive line is covered below. These are interpretations of the text, not implementation findings.

- [E, textual classification] **Commitment** means a stated design choice, required behavior or explicit initial plan. It does not mean completed work.
- [E, textual classification] **Hope** means an ambition, desired result, optional feature or long-term vision without a demonstrated result.
- [E, textual classification] **Open** means the README gives no answer or no measurable threshold. Silence does not grant permission.

## Opening and overview, lines 1 to 11

| Line | Plain-language reading | Commitment, hope and open question |
| --- | --- | --- |
| 1 | [P] FleetHarness is the project name. | [E] The name alone defines no capability. |
| 3 | [P] AI helps turn a described operational need into software someone can run and test. | [E] This is a purpose statement. It does not claim a deployed factory, automatic correctness or formal qualification under a software-factory standard. |
| 7 | [P] The project is for the Norfolk event and aims to cover the 34 use cases it names across several problem types. | [E] Broad coverage is a hope. The line gives no delivery date for all 34, effort estimate or ranked selection. [A] Whether 34 is the current count is not verified. |
| 9 | [P] Use a repeatable process rather than manually assembling an unrelated demo for every problem or using the same generic agent for everything. | [E] Repeating the method is a design commitment. It does not mean identical software for every problem. |
| 11 | [P] FleetHarness helps develop apps. The resulting apps can use different designs, tools and places to run. | [E] A shared app runtime is not required. Shared support remains possible. The line leaves hosting, interfaces, maintenance and the developer's own interface open. |

## The problem, lines 15 to 17

| Line | Plain-language reading | Commitment, hope and open question |
| --- | --- | --- |
| 15 | [P] Going from a written problem to useful software involves understanding, design, coding, data connections, testing and demonstration. | [E] The bottleneck is framed as the whole development process. No actual user's present workflow or measured time burden is supplied. |
| 17 | [P] Helping with coding alone is insufficient; the project wants to coordinate all the steps and avoid misleading prototypes. | [E] Coordination is the proposed contribution. That it saves time or produces deeper functionality remains an untested hope. |

## What we are building, lines 21 to 31

| Line | Plain-language reading | Commitment, hope and open question |
| --- | --- | --- |
| 21 | [P] Build a repeatable development pipeline assisted by AI. | [E] AI assistance is explicit; unattended operation is not. |
| 23 | [P] Record the intended user, goal, limits, data entering and leaving, prerequisites and definition of success. | [E] The intake must capture these fields. The text does not say who supplies them, resolves ambiguity or approves them. |
| 24 | [P] Look for usable existing software and technical approaches before creating new code. | [E] Research before coding is explicit. Licensing checks, trust checks and selection thresholds are open. |
| 25 | [P] Turn the need into a detailed plan and tests a machine can run. | [E] A specification, design, task list and executable tests are intended outputs. Who checks that the tests reflect the real need is open. |
| 26 | [P] Let coding agents work in separate work areas and connect appropriate existing tools. | [E] Agent-assisted coding and isolation are commitments. A separate folder alone does not establish network, data or permission isolation. The isolation mechanism is open. |
| 27 | [P] Run tests and complete workflows, identify failures, change the software and test again. | [E] Generating code is insufficient. Repair limits, regression checks, spending limits and what happens after repeated failure are open. |
| 28 | [P] Hand over an executable app, instructions, evidence, limitations and a repeatable demonstration. | [E] A screenshot alone would not meet this stated output. The target device and exact reproduction procedure are open. |
| 29 | [P] Offer components that worked in earlier cases to later cases when appropriate. | [E] Reuse is selective. How a component earns trusted status, is versioned or is retired is open. |
| 31 | [P] Humans control requirements, sensitive actions and claims that something is ready for operations. | [E] Human authority is explicit. Named approvers, pause points, allowed actions, monitoring, escalation and shutdown are not defined. |

## Core principles, lines 35 to 41

| Line | Plain-language reading | Commitment, hope and open question |
| --- | --- | --- |
| 35 | [P] Demonstrate that the task works, beyond showing an attractive screen. | [E] This rejects appearance as sufficient evidence. It leaves the minimum working workflow open. |
| 36 | [P] Prefer suitable existing open-source software to rebuilding it. | [E] This is a preference qualified by practicality, not a ban on new code or a mandate to adopt every candidate. |
| 37 | [P] Set measurable criteria and try inputs that represent the problem. | [E] The text requires acceptance evidence. It supplies no actual thresholds, fixtures or independent review of expected answers. |
| 38 | [P] Use a suitable engine: a scheduling solver, security tool or text-extraction tool may be more appropriate than a language model. | [E] Different architectures are intentional. The named approaches are examples, not selected dependencies. |
| 39 | [P] Use real connections only with authorization; otherwise label synthetic or sanitized substitutes. | [E] Authorized integration is conditional. [R] For this event, use synthetic or approved public inputs; describing data as sanitized does not establish rule 4 compliance. |
| 40 | [P] Obtain appropriate human approval and maintain records and safeguards for consequential actions. | [E] This is an oversight commitment without an implemented permission model. Who decides what is consequential is open. |
| 41 | [P] Distinguish code that was produced, code that starts, code that passed tests and software validated for actual operations. | [E] These are distinct evidence claims. The README does not define who can confer each status, which test scope applies or how status expires after changes. |

## How it works, lines 46 to 67

| Lines | Plain-language reading | Commitment, hope and open question |
| --- | --- | --- |
| 46 | [P] A Norfolk use-case description starts the process. | [E] This is not permission to ingest restricted attachments or live operational traffic. |
| 49 | [P] Convert the description into requirements and acceptance tests. | [E] The diagram places these before detailed implementation research. Whether they are revised after research is unstated. |
| 52 | [P] Research existing code and make an implementation plan. | [E] This repeats the research and planning stages. It does not define the selection process. |
| 55 | [P] Use coding agents and reusable components to implement the plan. | [E] The number of agents, coordination model and agent product are unspecified. A multi-agent architecture is not promised. |
| 58 | [P] Run the app, execute tests and fix defects. | [E] Repair is a loop, although the drawing is linear. A successful run must be distinguished from tests that never executed or were weakened. |
| 61 | [P] A human reviews the result and its repeatable demo. | [E] A final review is shown. Lines 31 and 40 also reserve authority earlier; this diagram is not a complete approval policy. |
| 64 | [P] The intended endpoint is a working solution to the use case. | [E] This is the desired outcome, not proof of field readiness. |
| 67 | [P] Prefer an existing orchestrator; evaluate SWE-AF, SuperPlane, OpenAI Symphony and Aperant with coding, container and test tools. Select a stack using hands-on results. | [E] This is a candidate list and selection method, not an adoption decision or a claim that the candidates are equivalent. Their identities, availability, licenses and performance were not verified by this seat. |

## Initial proof of concept, lines 71 to 77

| Line | Plain-language reading | Commitment, hope and open question |
| --- | --- | --- |
| 71 | [P] The first validation uses three deliberately different challenges. | [E] This is the clearest stated initial scope. It gives no deadline or minimum depth for each. Reducing that scope would be a team decision to revise the plan. |
| 73 | [P] Convert representative messages into structured tasks, events and references back to their sources. | [E] Message types, task definitions, expected answers, allowed errors and the user who confirms the result are open. No real operational messages are authorized by this line. |
| 74 | [P] Build schedules that obey people, time and resource limits, and recognize when no valid schedule exists. | [E] Detecting impossible requests is part of the proposed behavior. Priorities, conflicting requirements and who approves changes are open. |
| 75 | [P] Let a user make changes without a connection, then synchronize reliably later. | [E] This concerns the resulting workflow. It does not promise that app generation, cloud models or the entire factory work offline. The record being edited and conflict policy are open. |
| 77 | [P] The three challenges test different technical abilities, beyond producing similar chat screens. | [E] Technical variety motivates the selection. It does not establish which Fleet burden matters most. An offline workflow is a cross-cutting behavior until the team supplies a concrete task and user. |

## Deliverables and success, lines 81 to 95

| Line | Plain-language reading | Commitment, hope and open question |
| --- | --- | --- |
| 81 | [P] The following artifacts are the desired output for each supported challenge. | [E] Desired outputs are a target, not an inventory of completed artifacts. |
| 83 | [P] Explain the problem and state how acceptance will be decided. | [E] Written requirements and explicit criteria are expected. Actual owners and criteria remain absent. |
| 84 | [P] Provide source code and instructions for installing and running it. | [E] Running somewhere is intended. Target hardware, supported operating systems and dependency availability remain open. |
| 85 | [P] Include the connections, supporting processes and screens the task actually needs. | [E] The line is conditional on relevance. It does not require a separate service or graphical interface for every app. |
| 86 | [P] Include machine-run checks and a repeatable complete demonstration. | [E] Passing tests and reproducing a workflow need evidence. Neither is demonstrated in the README. |
| 87 | [P] Report successes, failures and claims that have not been checked. | [E] Honest limitations are a deliverable, not a reason to hide incomplete work. |
| 89 | [P] A portfolio dashboard is optional. Counting repositories is insufficient; correctly solving different problems with little needless effort is what matters. | [E] A dashboard is a hope, not required initial scope. Correctness, repeatability and human effort have no numerical targets yet. |
| 93 | [P] Success means using the same process more than once to create useful, verifiable apps, reducing engineering effort while respecting each problem's requirements. | [E] Repeatability and effort reduction must be demonstrated, not inferred from code volume. No comparator, timing method or sample size is specified. |
| 95 | [P] The longer-term aim is software suitable for field experiments, beyond event demonstrations. | [E] Field-testable is a hope, not authorization, accreditation, operational validation or a promise to deploy by Friday. |

## Vocabulary in plain language

[E, interpretation of the README] These definitions explain the terms in this proposal. They do not assert capabilities of the named candidate projects or invoke a formal government standard.

| Term | Meaning here |
| --- | --- |
| Software factory | [E] An organized way to turn a need into built, tested and packaged software. The README uses a production metaphor, not evidence of an accredited platform. |
| AI-powered or AI-assisted | [E] AI helps perform some development work. Neither phrase specifies how much is automated, which model is used or whether a human must approve each step. |
| Harness | [E] The project's surrounding machinery for coordinating work, running checks and collecting evidence. The README does not separately define this word. |
| Pipeline | [E] Connected stages where one stage's outputs feed later work. Some stages can stop, fail or require review. |
| Orchestration layer | [E] The coordinator that starts work, passes artifacts between tools and tracks outcomes. Its technology is not selected. |
| Use case or operational challenge | [E] A description of a person, a task, the conditions and the outcome they need. A topic such as readiness is not yet a complete use case. |
| Naval operations, readiness and maintenance | [E] Navy mission activities; preparedness to perform assigned work; and the work of keeping or restoring equipment to useful condition. The README names these as domains, not specified app behaviors. |
| Cybersecurity, document processing and decision support | [E] Protecting systems and information; extracting, organizing or transforming document content; and helping a person understand choices. These labels do not authorize access, testing or autonomous decisions. |
| Ingest | [E] Bring a description into a structured record. It does not mean upload every available file or grant access to systems. |
| Goals and success criteria | [E] The outcome wanted and the observable conditions used to decide whether it was achieved. |
| Constraints and dependencies | [E] Limits that must be respected and things the solution needs to function. |
| Inputs and outputs | [E] What enters a task and what the task produces. |
| Requirements or specification | [E] A clear description of what the software must do, for whom and within what limits. |
| System design or architecture | [E] The main parts of the app, their responsibilities and their connections. |
| Software development system and engineering effort | [E] Tools and procedures used to make software; the human work spent understanding, creating, checking and maintaining it. This is distinct from the user's effort performing the eventual task. |
| Coding agent | [E] A tool that can carry out development tasks, potentially including code edits and command execution. Its permitted actions must be separately bounded. |
| Isolated workspace | [E] A separated work area intended to contain work on one task. The degree of containment depends on actual permissions and execution controls. |
| Runtime and deployment model | [E] Runtime is what an app needs while executing. Deployment model is where and how it is installed and operated. Neither must be identical across output apps. |
| Containerized execution | [E] Running software with a packaged user environment. It does not by itself prove safe permissions, no network access or host protection. |
| Library, component and open source | [E] A library supplies code to other code; a component supplies a reusable function; open source makes source available under license terms. Reuse still needs suitability and license review. |
| Standard | [E] An agreed technical rule or convention that software can follow. Finding a relevant standard does not itself show that an implementation meets it. |
| Integration and data adapter | [E] An integration connects systems. An adapter translates a source's format or interface into what the app can use. |
| Service and user interface | [E] A service performs work for other software. A user interface is how a person supplies information, sees results and makes decisions. |
| Automated test | [E] A machine-executed check with an expected result. Running it does not establish that its expectation is correct. |
| Executable acceptance test | [E] A machine-run check tied to an agreed requirement, with an objective pass or fail condition. |
| Representative input and edge case | [E] Representative input reflects intended use; an edge case tests a boundary, unusual condition or failure. |
| End-to-end scenario | [E] A check of the complete task from input through processing to the output a user needs. |
| Repair | [E] Change software after a failure, then run relevant checks again. Changing a test to accept a wrong result is not evidence of repair. |
| Reproducible demo | [E] Another person can follow recorded steps with identified versions and inputs and observe the stated behavior. Exact matching of all AI-generated code is not specified. |
| Generated, runnable, tested, operationally validated | [E] Code exists; it starts in a stated environment; specified checks were executed with recorded results; actual operational suitability has been established in an appropriate setting. These claims require different evidence. |
| Proof of concept | [E] A limited experiment that tests whether an approach can work. It is not evidence of general coverage or operational readiness. |
| Prototype and mockup | [E] A prototype tries a limited implementation. A mockup shows a proposed appearance or interaction. Neither label establishes complete or correct task behavior. |
| Operational-message parsing and source reference | [E] Turning message text into fields, with a way to identify the original passage supporting each extracted item. |
| Schedule deconfliction and constraint solver | [E] Finding a schedule without forbidden overlaps or resource conflicts, using an engine that searches subject to explicit rules. |
| Infeasible case | [E] A request for which no schedule satisfies all required constraints. It must be reported rather than silently breaking a rule. |
| OCR, parser and LLM | [E] Optical character recognition extracts text from images. A parser interprets structure. A large language model generates or interprets language. They solve different parts of a task. |
| Document intelligence, optimization and distributed application design | [E] Interpreting document content; finding a good valid answer within stated limits; and designing cooperating software or data copies in more than one place. These describe the different abilities the three trials are intended to test. |
| Offline-first and synchronization | [E] A defined task remains usable without a connection; later exchanges reconcile local and remote changes. Conflict handling must be specified. |
| Synthetic and sanitized data | [E] Synthetic data is constructed rather than taken from real records. Sanitized data has been altered to remove content. Neither label alone establishes an approved release or acceptable handling. |
| Auditability and operational readiness | [E] Auditability means actions and decisions can be traced. Operational readiness is a claim about fitness for actual use, requiring more than a successful demo. |
| Codebase, repository and dashboard | [E] An application's source and related files; a stored versioned collection of project files; and a summary display of progress. Their existence is not evidence of a correctly solved problem. |
| Functional, verifiable and domain-specific rigor | [E] Performs the intended task; can be checked against evidence; and respects the particular problem's correctness requirements. A scheduling test and a message-extraction test need different expected results. |
| Field-testable and reusable | [E] Suitable to propose for a bounded field experiment; usable again in another context with stated assumptions. Neither means universally deployable. |

## The distinction the team should preserve

[R] Treat FleetHarness as the development process, its output application as a separate deliverable, and the officer's work as the reason for both. Measure the process's engineering benefit and the application's user benefit separately. Do not describe the optional dashboard, three prototypes, offline app behavior or long-term vision as completed capabilities.

## Sources

- [P] Project README: `/Users/mukul/Documents/CDAO/FleetHarness/README.md`, lines 1 to 95, read locally on 2026-11-04. No project web URL, branch or commit was independently verified.
- [P] Research instructions: [[Research/00-Brief]].
- [P] Data restrictions used to qualify line 39: [[Event/Rules]], rule 4. The source portal URL is not supplied in the local snapshot and was not verified.
- [E] No public web source was used; there are no verified full web URLs to list. Source paths and known vault links identify the actual material read.
