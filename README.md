# AppYard

**An AI-powered software factory for turning operational challenges into working, testable software.**

## Desktop application

AppYard has one interface: the original desktop app and its browser preview. The alternate Studio (UI 2) and Workbench (UI 3) designs have been removed.

The Electron app now runs **Pi coding agents** for intake, research, planning, implementation and verification, with [bounded functional repair loops and an early executable user-workflow checkpoint](docs/functional-build-loop.md). Each phase inherits global workspace tools and adds its assigned skills and phase-specific tools. It includes saved challenges, the 39-entry Norfolk catalog, an inspectable factory graph, isolated app previews, real test evidence, human review, and delivery export.

Agents can also [create, test and reuse project-local helpers](docs/agent-helpers.md). Both backends discover helper metadata on demand and execute tested Node utilities through a separate sandbox, with no network and output confined to `.agent-output/`.

See the [agent architecture diagrams](docs/agent-architecture.md) for the host orchestrator, worker roles, Pi and Codex backends, independent checks, repair loops, and human review.

Build and verification agents can [open and interact with their app](docs/agent-browser.md) in a host-managed browser. They receive actual screenshots, page controls and console errors, then can edit the source and reopen the app to inspect the changes. Pi and Codex both support this loop with image-capable models.

**Apple Silicon build:** open release/mac-arm64/AppYard.app or install the DMG in release/. Connect a provider in **Pi settings**, choose a challenge, and start a build.

For development: npm ci, then npm run dev (Node 22.19+). Build packages with npm run dist.

On the **`codex/one-shot-goal` experiment**, save the brief, then choose **Open new Codex goal** on Build to open a real Codex CLI goal with full access in macOS Terminal. Saving a brief or starting a pipeline build does not open Terminal. The complete brief and attached data go into a fresh folder; Codex owns implementation, testing and repair in one session. The existing pipeline remains available for comparison. See [the Codex goal experiment](docs/codex-goal-experiment.md) for usage, authentication and result boundaries.

Use **Data & storage** to browse current and previous builds, inspect and export files, archive projects, and clean up through recoverable Trash. See [storage and recovery](docs/data-storage.md) for scope and verification behavior.

The **tokens** counter in the toolbar shows recorded workspace usage. Open it for each project's share, input/output counts, and cached input. Counts update during agent work and persist across builds; see [token usage](docs/token-usage.md) for coverage and limitations.

The **Reasoning** bar beside the model picker adjusts effort from faster responses to deeper thinking. Drag it or use the arrow keys; the current level is named above the bar and saved locally. Choices come from the selected model's capabilities. The control is unavailable for fixed-effort models and while agents are working. Pi and Codex apply the choice when starting or resuming work; experiment candidates retain the effort pinned when their comparison began. An explicit choice also applies to new Terminal goals when the CLI's own model supports it.

Before handing off a change, run `npm run check`. It captures the current source and runs the frontend build, Electron and harness builds, foundation checksum validation, and both test suites in a private workspace. Logs, source hashes and results remain in `output/checks/`; shared build directories stay untouched. See [build validation](docs/build-validation.md) for prerequisites and result interpretation.

Use **Project lead** inside a saved project to discuss the brief, inspect progress and apply proposed build changes. Research and planning can ask focused questions there, closing their model sessions while waiting for your answer. Read [project conversations and clarification](docs/project-conversation.md) for behavior and validation.

Read [desktop setup, behavior, and limitations](docs/desktop.md) and the [challenge pipeline, recipes, skills, and tools](docs/pipeline.md). New builds declare computational capabilities and a browser, CLI, or local-service runtime. Host-owned evaluations, clean package execution and applicable browser checks gate delivery. Operational integrations and field readiness remain unverified. Read [solution contracts and evaluation](docs/solution-evaluation.md) for supported scorers, runtime profiles and factory benchmarks. The product vision below describes the broader goal.

Application agents start from [versioned foundations](docs/application-foundations.md): the host copies a Node or Python service with a browser client, then agents extend its shared backend computation. Recipe-selected modules reuse message parsing, scheduling, evidence search, dependency analysis and record reconciliation. See [foundation research](docs/application-foundations-research.md) for the starter alternatives and selection rationale.

Agents build the functional application and its integration interfaces. After the build, users implement their plugins and data connectors against those interfaces and configure access to their systems. The app should use normal product language and actionable setup states such as **Connect a data source** or **No records yet**. Development fixtures retain their provenance in test and developer artifacts; they must not become live-looking operational records or banners describing the app as synthetic, a mock, or a demo.

## Overview

AppYard is a project for the **Norfolk FleetHacker hackathon**. Its goal is to systematically build solutions for the **39 published use cases**, spanning naval operations, readiness, maintenance, cybersecurity, document processing, scheduling, and decision support.

We want a repeatable process that takes each challenge from **problem statement to running application**.

AppYard is primarily a **software development system**, not a common runtime that every resulting app must use. Each solution can have its own architecture, tools, and deployment model, while reusing components when that genuinely helps.

## The Problem

Many operational problems have already been described in detail, but turning them into useful software is still slow. Teams must interpret requirements, research existing technologies, design an implementation, write code, connect data, test edge cases, and demonstrate real functionality.

AI coding tools can accelerate individual steps. The harder problem is coordinating the *entire process* across many different use cases without producing shallow prototypes that merely look functional.

## What We're Building

A repeatable, AI-assisted development pipeline that can:

1. **Ingest a use case:** Capture its goals, users, constraints, inputs, outputs, dependencies, and success criteria.
2. **Research existing solutions:** Discover relevant open-source projects, libraries, standards, and reusable components before writing new code.
3. **Plan the implementation:** Produce a concrete specification, system design, development tasks, and executable acceptance tests.
4. **Build the application:** Use coding agents in isolated workspaces to implement working software, reuse appropriate tools, and define interfaces for users to implement plugins and data connectors after the build.
5. **Test and repair:** Run automated tests and realistic end-to-end scenarios, then iterate on failures rather than declaring success after generating code.
6. **Package and hand off:** Deliver a runnable application with setup and integration instructions, test results, known limitations, and a reproducible workflow.
7. **Reuse what works:** Make proven components available to later use cases without imposing a one-size-fits-all architecture.

Human reviewers retain control over requirements, security-sensitive actions, and claims of operational readiness.

## Core Principles

- **Working software over mockups.** A polished interface is not proof that a workflow works.
- **Reuse before rebuilding.** Start with established open-source software where practical.
- **Tests define success.** Every implementation needs measurable acceptance criteria and representative inputs.
- **Fit the problem.** Scheduling may require constraint solvers; cybersecurity may require security tooling; document extraction may require OCR and parsers. An LLM is not always the right engine.
- **User-owned integrations.** Build the working application with documented plugin and data connector interfaces. Users implement and configure their integrations after the build. Missing connections have honest setup states; development fixtures remain traceable in test and developer artifacts.
- **Human oversight.** High-consequence decisions and changes require appropriate approval, auditability, and safeguards.
- **Honest status.** Distinguish generated, runnable, tested, and operationally validated solutions.

## How It Works

```text
Norfolk use-case descriptions
           |
           v
Requirements and acceptance tests
           |
           v
Open-source research + implementation plan
           |
           v
AI coding agents + reusable components
           |
           v
Run application + execute tests + repair defects
           |
           v
Human review + reproducible workflow
           |
           v
Working use-case solution
```

The orchestration layer should be assembled from existing open-source software where possible, rather than built from scratch. Projects to evaluate include **SWE-AF, SuperPlane, OpenAI Symphony, and Aperant**, alongside a coding agent, containerized execution, and automated test tooling. The final stack will be selected based on hands-on performance rather than feature claims.

## Initial Proof of Concept

We will first validate the process on **three deliberately different challenges**:

- **Operational-message parsing:** Extract structured tasks, events, and source references from representative messages.
- **Training schedule deconfliction:** Generate schedules that respect personnel, time, and resource constraints; detect infeasible cases.
- **Offline-first workflow:** Make changes while disconnected and reliably synchronize when connectivity returns.

This tests whether the system can produce real software across document intelligence, optimization, and distributed application design—not just generate similar chat interfaces.

## Deliverables

For each supported challenge, the desired output is:

- A documented problem specification and explicit acceptance criteria.
- A runnable codebase with installation and execution instructions.
- Working services and user interfaces, plus documented interfaces for users to implement their plugins and data connectors.
- Automated tests and a reproducible end-to-end workflow.
- A short report describing what works, what failed, and what remains unverified.

A dashboard may track progress across all 39 use cases, but **the number of generated repositories is not the measure of success**. The real measure is how many distinct challenges can be solved correctly, reproducibly, and with minimal unnecessary human effort.

## Success Criteria

AppYard succeeds if it demonstrates that the same development process can repeatedly turn different FleetHacker challenge descriptions into **functional, verifiable applications**, while reducing engineering effort and preserving the domain-specific rigor each problem requires.

**Long-term vision:** a reusable system for rapidly translating operational needs into field-testable software.
