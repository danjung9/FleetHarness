# Product

<!-- impeccable:product-schema 1 -->

> Updated from the supplied product-direction brief, the user’s request for a Pi agent backend, and the implemented desktop application. Agents build functional applications; users implement their plugins and data connectors after the build. Operational integrations remain outside the verified scope until implemented and tested.

## Platform

web

## Stack

Electron 45 with a local React and TypeScript renderer and Pi SDK 1.5.0 in the main process. The first packaged target is macOS Apple Silicon. The desktop window supports 1120×720 and larger.

## Users

Primary users are hackathon builders, engineering leads, and operational reviewers who need to turn a published FleetHacker challenge into a reviewable, tested application. They need to understand requirements, follow agent work, inspect evidence, and distinguish generated output from verified capability.

## Product Purpose

AppYard is an AI-assisted software factory for moving operational challenges from problem statement through requirements, implementation, automated verification, human review, and reproducible delivery. Success means demonstrating one honest end-to-end path that produces working, testable software across materially different challenge types.

## Positioning

AppYard connects a visual implementation plan to the actual agent work, artifacts, acceptance tests, repair loops, and delivery evidence for each challenge. It is a development system, not a shared runtime imposed on every generated application.

## Operating Context

Users begin from one of 34 published challenge descriptions or a newly entered operational problem. They progressively refine requirements, observe a software-factory pipeline, inspect running agent sessions and logs, interact with a live application preview, review test evidence, and package the resulting application. After the build, they implement their plugins and data connectors using the delivered integration interfaces and setup guide.

## Capabilities and Constraints

- Capture goals, users, constraints, inputs, outputs, dependencies, and measurable acceptance criteria.
- Research reusable solutions before implementation.
- Present an implementation plan as an inspectable visual workflow.
- Surface tasks, agent activity, build logs, artifacts, tests, and human feedback.
- Clearly distinguish planned, generated, runnable, tested, and operationally validated states.
- Keep humans in control of requirements, security-sensitive actions, and readiness claims.
- Separate intake, research, planning, implementation and verification sessions run sequentially per challenge, using selected model-provider credentials, global workspace tools and phase-specific tools and skills; up to three challenge runs may execute concurrently.
- Challenges, execution state, logs, generated files, test reports, and review decisions persist locally. Each run has a dedicated working directory, not an operating-system sandbox.
- The delivery contract is a working application with a declared browser, CLI, or service runtime, source, executable tests, and user documentation. Independent checks gate review, with bounded repair loops for failed checks.
- Generated applications use normal product language. Do not describe them in the UI as synthetic, mocks, demos, or prototypes. Keep development-data provenance in test and developer artifacts, keep fixtures out of live-looking operational views, and show accurate empty or setup states when integrations are absent.
- Agents implement working workflows and documented plugin and data connector interfaces. Users implement and configure their integrations after the build; an unconfigured connector must not report a successful connection or invent records.
- The 34-entry Norfolk catalog connects to challenge-specific recipes, selected skills, and seven synthetic-data domain tools. Toolkit checks are distinct from generated-application verification.
- Preview content runs on a separate loopback origin without desktop IPC privileges. Packet and source integrity checks protect review evidence; a human approval gate precedes export.
- End-to-end SDK/tool orchestration, failure/repair, preview isolation, persistence, and review/export were tested with a deterministic local provider. Hosted-model authentication, model output quality, external operational integrations, and field readiness have not been validated.

## Brand Commitments

The product name is AppYard. The voice should be direct, credible, operationally literate, and explicit about evidence and limitations. The UI should take functional inspiration from SuperPlane, Factory Desktop, OpenHands, and Replit without copying their branding.

## Evidence on Hand

- Product goals and principles in `README.md`.
- Platform and interface research in the supplied pasted-text brief.
- Three proof-of-concept challenge types: operational-message parsing, training schedule deconfliction, and offline-first workflow.
- No production integrations, customer claims, or operational-readiness evidence are currently present; future work must not fabricate them.

## Product Principles

- Working software over mockups.
- Tests define success.
- Reuse before rebuilding.
- Fit the architecture to the problem.
- Report status and evidence honestly.

## Accessibility & Inclusion

The desktop interface should support keyboard navigation, visible focus, reduced motion, and readable contrast. No additional product-specific accessibility requirements have been confirmed.
