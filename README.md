# AppYard

**An AI-powered software factory for turning operational challenges into working, testable software.**

## Desktop application

AppYard shares its interface across the Electron desktop app, hosted application and static browser preview.

The Electron app now runs **Pi coding agents** for intake, research, planning, implementation and verification, with one repair attempt. Each phase inherits global workspace tools and adds its assigned skills and phase-specific tools. It includes saved challenges, the 39-entry Norfolk catalog, an inspectable factory graph, isolated app previews, real test evidence, human review, and delivery export.

**Windows x64:** use the [latest successful Windows release](https://github.com/danjung9/FleetHarness/releases/latest) once publishing is enabled, or build locally with `npm run dist:win`. This repository is private; sign in to GitHub with repository access to download. See [Windows downloads and team releases](docs/windows-releases.md) for activation status, installation, checksums, and manual upgrades.

**Apple Silicon:** open `release/mac-arm64/AppYard.app` or install the DMG in `release/`. The existing `npm run dist` command still builds macOS ARM64 packages. In either app, connect an engine in **Model settings**, choose a challenge, and start a build.

For development: `npm ci`, `npm run setup:browser`, then `npm run dev` (Node 24.x). Every team change must reach `main` to enter the shared Windows installer. Each successful Windows release includes all changes in its source commit. Installed copies are upgraded by running a newer installer; there is no background updater.

Read [desktop setup, behavior, and limitations](docs/desktop.md) and the [challenge pipeline, recipes, skills, and tools](docs/pipeline.md). The packaged app targets self-contained browser prototypes; operational integrations and field readiness remain unverified. The product vision below describes the broader goal.

## Hosted web application

Use `npm run build:hosted` for the hosted MVP: individual logins, private projects, account-level OpenAI API keys, background builds, checkpoint recovery, app previews, review, source ZIP downloads and share links. It requires Supabase authentication/storage and Vercel Workflow/Sandbox configuration; see [hosted setup and release checks](docs/hosted.md). Builds continue after signing out or closing the browser.

The `prod` branch contains the hosted application; `main` contains the local Electron application and static browser preview. Base hosted changes on `prod`, test them on staging, then merge into `prod`. Only pushes to `prod` trigger the production GitHub Actions workflow for [fleetharness-studio.vercel.app](https://fleetharness-studio.vercel.app/). The current private-repository Hobby setup accepts deployments authored by the Vercel project owner; other contributors' commits are blocked. See the [hosting requirements](docs/hosted.md) before relying on team-wide automatic deployments.

For a static interface snapshot, `npm run build:web` writes `dist-web`. That build supports browsing challenges and saving briefs in the current browser; it does not include accounts or agent execution. The hosted build produces Vercel build output with backend functions, rather than a static `dist-web` deployment.

## Overview

AppYard is a project for the **Norfolk FleetHacker hackathon**. Its goal is to systematically build solutions for the **39 published use cases**, spanning naval operations, readiness, maintenance, cybersecurity, document processing, scheduling, and decision support.

Instead of building 39 disconnected demos by hand—or forcing every problem into one generic AI agent—we want a repeatable process that takes a challenge from **problem statement to running application**.

AppYard is primarily a **software development system**, not a common runtime that every resulting app must use. Each solution can have its own architecture, tools, and deployment model, while reusing components when that genuinely helps.

## The Problem

Many operational problems have already been described in detail, but turning them into useful software is still slow. Teams must interpret requirements, research existing technologies, design an implementation, write code, connect data, test edge cases, and demonstrate real functionality.

AI coding tools can accelerate individual steps. The harder problem is coordinating the *entire process* across many different use cases without producing shallow prototypes that merely look functional.

## What We're Building

A repeatable, AI-assisted development pipeline that can:

1. **Ingest a use case:** Capture its goals, users, constraints, inputs, outputs, dependencies, and success criteria.
2. **Research existing solutions:** Discover relevant open-source projects, libraries, standards, and reusable components before writing new code.
3. **Plan the implementation:** Produce a concrete specification, system design, development tasks, and executable acceptance tests.
4. **Build the application:** Use coding agents in isolated workspaces to implement working software and integrate appropriate existing tools.
5. **Test and repair:** Run automated tests and realistic end-to-end scenarios, then iterate on failures rather than declaring success after generating code.
6. **Package and demonstrate:** Deliver a runnable application with setup instructions, test results, known limitations, and a reproducible demo.
7. **Reuse what works:** Make proven components available to later use cases without imposing a one-size-fits-all architecture.

Human reviewers retain control over requirements, security-sensitive actions, and claims of operational readiness.

## Core Principles

- **Working software over mockups.** A polished interface is not proof that a workflow works.
- **Reuse before rebuilding.** Start with established open-source software where practical.
- **Tests define success.** Every implementation needs measurable acceptance criteria and representative inputs.
- **Fit the problem.** Scheduling may require constraint solvers; cybersecurity may require security tooling; document extraction may require OCR and parsers. An LLM is not always the right engine.
- **Real integrations when authorized.** Prefer functional connections to approved data and systems. Use clearly labeled synthetic or sanitized data when operational access is unavailable.
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
Human review + reproducible demo
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
- Relevant data adapters, services, and user interfaces.
- Automated tests and a reproducible end-to-end demonstration.
- A short report describing what works, what failed, and what remains unverified.

A dashboard may track progress across all 39 use cases, but **the number of generated repositories is not the measure of success**. The real measure is how many distinct challenges can be solved correctly, reproducibly, and with minimal unnecessary human effort.

## Success Criteria

AppYard succeeds if it demonstrates that the same development process can repeatedly turn different FleetHacker challenge descriptions into **functional, verifiable applications**, while reducing engineering effort and preserving the domain-specific rigor each problem requires.

**Long-term vision:** a reusable system for rapidly translating operational needs into field-testable software—not simply a hackathon demo generator.
