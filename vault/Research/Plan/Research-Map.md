---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A complete directory of the research notes, their questions, code baselines and superseded advice."
---

# Research map

## Bottom line

[E] This directory covers every Markdown note under Research at the time of writing, including the three new Plan notes. [R] Start with Findings and Plan, then use the links to inspect the evidence behind a ruling. [E] The current implementation basis is 0f175a8; many architecture and MVP notes remain explicitly based on f72c5dc. [E] Public-source, user and design notes often use neither commit, so they are labeled that way instead of being given a false code baseline.

## Reading order and provenance

[R] For current decisions read [[Research/Plan/Findings]], [[Research/Plan/Plan]], [[Research/Plan/Test-Results]], [[Research/FleetHarness-MVP/Delta-0f175a8]] and [[Research/Council/Verification/Verification]]. Use the original seat decisions to understand dissent, not as the final implementation plan.

[E] Each directory line states what the note answers, its basis and whether newer evidence changes it. Superseded means the stated claim or priority has been replaced, not that the whole note should be deleted. The source labels describe this inventory observation; they do not upgrade the claims inside the linked note. Public vendor claims and proposed numerical targets keep their original limits.

[E] Baseline revisions are `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e` and `0f175a8ce346521c4462fc134d40c0973eac1323`. The early README-only history is a separate revision, `575a307`, identified in the verification record. Upstream project revisions are separate from all three. Images and non-Markdown artifacts are not notes in this directory.


## Research root

- [E] [[Research/00-Brief]]: Defines the research question, evidence labels, source boundaries and required response format. Basis: Neither: assignment brief, not code evidence. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## Architecture

- [E] [[Research/Architecture/Current-Architecture]]: Traces the current components, stages, data flow and trust boundaries, with a limited late delta. Basis: f72c5dc, with a limited late 0f175a8 comparison. Status: Partly superseded: use Delta and Test-Results for phases, tools, auth and compilation; Thursday priority set by Plan/Plan.
- [E] [[Research/Architecture/Findings]]: Ranks source-level risks in acceptance, export, execution authority and lifecycle controls. Basis: f72c5dc, with a limited late 0f175a8 comparison. Status: Partly superseded: use Delta and Test-Results for phases, tools, auth and compilation; Thursday priority set by Plan/Plan.
- [E] [[Research/Architecture/Optimizations]]: Estimates targeted improvements and identifies changes that need measurement. Basis: f72c5dc, with a limited late 0f175a8 comparison. Status: Partly superseded: use Delta and Test-Results for phases, tools, auth and compilation; Thursday priority set by Plan/Plan.
- [E] [[Research/Architecture/README]]: Indexes the architecture review and recommends improving the existing implementation. Basis: f72c5dc, with a limited late 0f175a8 comparison. Status: Partly superseded: use Delta and Test-Results for phases, tools, auth and compilation; Thursday priority set by Plan/Plan.
- [E] [[Research/Architecture/Review-Log]]: Records inspected revisions, tools, limits and the architecture session handoff. Basis: f72c5dc, with a limited late 0f175a8 comparison. Status: Partly superseded: use Delta and Test-Results for phases, tools, auth and compilation; Thursday priority set by Plan/Plan.
- [E] [[Research/Architecture/Target-Architecture]]: Proposes stronger worker, evaluator and delivery boundaries around the existing host. Basis: f72c5dc, with a limited late 0f175a8 comparison. Status: Partly superseded: use Delta and Test-Results for phases, tools, auth and compilation; Thursday priority set by Plan/Plan.

## Build-Patterns

- [E] [[Research/Build-Patterns/Airgap-Packaging]]: Explains what dependencies, provenance and cold-start checks a disconnected package needs. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/Build-Options]]: Compares implementation routes and the tradeoffs of a bounded first build. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Options retained; the one-task plan supersedes a new controller or multi-demo sprint recommendation.
- [E] [[Research/Build-Patterns/Harness-Engineering]]: Explains controller contracts, tool boundaries and evidence needed around coding agents. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/Human-Review-UX]]: Defines review states, visible evidence and human approval behavior. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/Isolated-Execution]]: Separates workspace organization from enforceable execution isolation. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/Offline-Local-Models]]: Examines local inference feasibility, hardware constraints and untested offline assumptions. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/README]]: Indexes reusable engineering patterns and their evidence limits. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/Reuse-Research]]: Explains how to evaluate existing components without equating a link with integration. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/Security]]: Maps untrusted text, candidate code, secrets and release authority to separate boundaries. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/Specs-and-Acceptance-Tests]]: Turns a task into independently checkable fixtures and browser/export acceptance. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Build-Patterns/Test-and-Repair-Loops]]: Describes bounded repair, useful failure evidence and escalation when progress stops. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## Council/Builder

- [E] [[Research/Council/Builder/Decision-v2]]: Revises the build choice around the existing factory, four requests and manual event acceptance. Basis: 0f175a8, revising the pre-implementation recommendation. Status: Current seat evidence; final scope and disputed priorities ruled in Plan/Findings and Plan/Plan.
- [E] [[Research/Council/Builder/Decision]]: Proposes the original small deterministic scheduler and estimates its build path. Basis: Neither: early README-level assessment, before the f72c5dc implementation review; historical README traced to 575a307 by verification. Status: Superseded as an action plan by its Decision-v2 and Plan/Plan; retain for dissent and verification.

## Council/Judge

- [E] [[Research/Council/Judge/Decision-v2]]: Revises the judging strategy around an accepted app and stronger browser/export proof. Basis: 0f175a8, revising the pre-implementation recommendation. Status: Current seat evidence; final scope and disputed priorities ruled in Plan/Findings and Plan/Plan.
- [E] [[Research/Council/Judge/Decision]]: Proposes the original richer scheduling entry and a rubric-driven presentation. Basis: Neither: early README-level assessment, before the f72c5dc implementation review; historical README traced to 575a307 by verification. Status: Superseded as an action plan by its Decision-v2 and Plan/Plan; retain for dissent and verification.

## Council/Officer

- [E] [[Research/Council/Officer/Decision-v2]]: Revises the user-facing choice to a small reviewed training draft with the factory behind it. Basis: 0f175a8, revising the pre-implementation recommendation. Status: Current seat evidence; final scope and disputed priorities ruled in Plan/Findings and Plan/Plan.
- [E] [[Research/Council/Officer/Decision]]: Proposes the original message-tasking workflow for a duty-officer role. Basis: Neither: early README-level assessment, before the f72c5dc implementation review; historical README traced to 575a307 by verification. Status: Superseded as an action plan by its Decision-v2 and Plan/Plan; retain for dissent and verification.

## Council/Verification

- [E] [[Research/Council/Verification/README]]: Indexes the 57-claim audit and records its scope, tool use and handoff. Basis: Neither: original council/source audit, including historical README 575a307; not a current-code audit. Status: Current claim-confidence record; do not silently upgrade its verdicts.
- [E] [[Research/Council/Verification/Verification]]: Audits original seat claims, requirements, sources and verdicts that later recommendations must preserve. Basis: Neither: original council/source audit, including historical README 575a307; not a current-code audit. Status: Current claim-confidence record; do not silently upgrade its verdicts.

## FleetHarness

- [E] [[Research/FleetHarness/Gaps-and-Questions]]: Lists open questions from the original README-level product review. Basis: Neither: early README-level review, not pinned to f72c5dc or 0f175a8 in the note. Status: Historical concept evidence; implementation-absence claims superseded by MVP and Delta reviews.
- [E] [[Research/FleetHarness/Officer-Reframe]]: Reframes the general software pipeline around an officer task and human acceptance. Basis: Neither: early README-level review, not pinned to f72c5dc or 0f175a8 in the note. Status: Historical concept evidence; implementation-absence claims superseded by MVP and Delta reviews.
- [E] [[Research/FleetHarness/README]]: Indexes the early product-concept review and its limited evidence. Basis: Neither: early README-level review, not pinned to f72c5dc or 0f175a8 in the note. Status: Historical concept evidence; implementation-absence claims superseded by MVP and Delta reviews.
- [E] [[Research/FleetHarness/Rules-Fit]]: Maps the original concept to event requirements and missing submission proof. Basis: Neither: early README-level review, not pinned to f72c5dc or 0f175a8 in the note. Status: Historical concept evidence; implementation-absence claims superseded by MVP and Delta reviews.
- [E] [[Research/FleetHarness/What-It-Means]]: Explains the original seven-step factory proposal and three demonstration ideas. Basis: Neither: early README-level review, not pinned to f72c5dc or 0f175a8 in the note. Status: Historical concept evidence; implementation-absence claims superseded by MVP and Delta reviews.

## FleetHarness-MVP

- [E] [[Research/FleetHarness-MVP/Delta-0f175a8]]: Identifies the type fixes, five agent phases, new Codex adapter and remaining proof gaps in the newer commit. Basis: f72c5dc to 0f175a8 delta. Status: Current source delta; its pending runtime/type-check questions are partly superseded by Plan/Test-Results, not by a live model run.
- [E] [[Research/FleetHarness-MVP/Officer-Test]]: Walks through a hypothetical first officer visit without claiming a live usability test. Basis: f72c5dc, with notice of the later 0f175a8 revision. Status: Baseline retained; use Delta for changed code and Test-Results for current tests. Hypothetical walkthroughs remain unmeasured.
- [E] [[Research/FleetHarness-MVP/README]]: Indexes the implemented-MVP review and the change from the earlier README-only understanding. Basis: f72c5dc, with notice of the later 0f175a8 revision. Status: Baseline retained; use Delta for changed code and Test-Results for current tests. Hypothetical walkthroughs remain unmeasured.
- [E] [[Research/FleetHarness-MVP/Reconcile]]: Reconciles the first council recommendations with the already implemented factory. Basis: f72c5dc, with notice of the later 0f175a8 revision. Status: Baseline retained; use Delta for changed code and Test-Results for current tests. Hypothetical walkthroughs remain unmeasured.
- [E] [[Research/FleetHarness-MVP/Rules-Fit]]: Maps the implemented MVP, dependency disclosure and remaining gaps to the event rules. Basis: f72c5dc, with notice of the later 0f175a8 revision. Status: Baseline retained; use Delta for changed code and Test-Results for current tests. Hypothetical walkthroughs remain unmeasured.
- [E] [[Research/FleetHarness-MVP/What-Exists]]: Inventories the actual front ends, backend, tools, review flow and implementation limits. Basis: f72c5dc, with notice of the later 0f175a8 revision. Status: Baseline retained; use Delta for changed code and Test-Results for current tests. Hypothetical walkthroughs remain unmeasured.

## Interfaces

- [E] [[Research/Interfaces/Officer-Walkthrough]]: Compares hypothetical officer paths through the original interface and Studio. Basis: 0f175a8. Status: Current source/screenshot record; does not establish live builds or measured officer behavior.
- [E] [[Research/Interfaces/README]]: Indexes the two-interface source and screenshot review. Basis: 0f175a8. Status: Current source/screenshot record; does not establish live builds or measured officer behavior.
- [E] [[Research/Interfaces/Recommendation]]: Proposes small interface changes and priorities for the deadline. Basis: 0f175a8. Status: Source findings retained; Plan/Plan rules that the task app is the officer front door and Studio work is conditional.

## Interfaces/Sessions

- [E] [[Research/Interfaces/Sessions/2026-11-04-interface-comparison]]: Records the interface-review task, method, completion and next steps. Basis: 0f175a8. Status: Current source/screenshot record; does not establish live builds or measured officer behavior.

## Interfaces

- [E] [[Research/Interfaces/Side-by-Side]]: Compares original and Studio behavior, shared backend, browser limits and data separation. Basis: 0f175a8. Status: Current source/screenshot record; does not establish live builds or measured officer behavior.

## Interfaces/Sprint

- [E] [[Research/Interfaces/Sprint/Review-Log]]: Records interface-review tools, prior work and unresolved evidence. Basis: 0f175a8. Status: Current source/screenshot record; does not establish live builds or measured officer behavior.

## Landscape/App-Builders

- [E] [[Research/Landscape/App-Builders/Appsmith]]: Examines a data-oriented internal-app builder and its deployment and maintenance tradeoffs. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/Bolt]]: Examines browser-based prompt-to-app development and what a useful preview proves. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/Failure-Patterns]]: Collects failure patterns that separate a polished generated screen from a dependable workflow. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/FlutterFlow]]: Examines visual application development, export and runtime dependencies. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/Lovable]]: Examines plan, preview, edit and export patterns with security and evidence limits. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/Power-Apps-Copilot]]: Examines enterprise form/workflow building and unresolved government-tenant availability. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/README]]: Indexes the app-builder comparisons and their limits for a naval user. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/Replit-Agent]]: Examines agent-led app building, deployment and the separate burden of checking output. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/Research-Log]]: Records app-builder source retrieval, comparison limits and research handoff. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/Retool]]: Examines operator-facing internal tools, data connections and governance tradeoffs. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/Simplicity-Patterns]]: Extracts interface patterns that could reduce setup, confusion and review effort. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/App-Builders/v0]]: Examines prompt-to-interface generation and the gap between visual output and task acceptance. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## Landscape/Defense-Platforms

- [E] [[Research/Landscape/Defense-Platforms/Ask-Sage]]: Examines enterprise chat, agent-builder and Edge claims without proving this team has access. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/Defense-Platforms/C3-AI]]: Examines readiness and maintenance applications and the limits of deployment comparisons. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/Defense-Platforms/Comparison]]: Compares platform scope, user burden, deployment and evidence, including policy assertions later downgraded. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Policy-confidence assertions limited by verification V55 to V57; designation and mandate remain not verified.
- [E] [[Research/Landscape/Defense-Platforms/Defense-Unicorns-Ark]]: Examines Ark development-to-delivery descriptions and unverified shipped features or access. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/Defense-Platforms/Defense-Unicorns-UDS]]: Separates software delivery infrastructure from task-app creation and acceptance. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/Defense-Platforms/GenAI-mil]]: Examines enterprise-service and agent-design claims whose Navy designation and mandate remain unverified. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Policy-confidence assertions limited by verification V55 to V57; designation and mandate remain not verified.
- [E] [[Research/Landscape/Defense-Platforms/NAVAIR-Prometheus-Forge]]: Separates evidence of mission-user training from unverified Forge product capabilities. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/Defense-Platforms/Palantir-AIP]]: Examines workflow, evaluation and implementation patterns with deployment limits. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/Defense-Platforms/Palantir-Maven-Smart-System]]: Examines service reporting and application claims, with source-access and offline gaps. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/Defense-Platforms/README]]: Indexes platform research and the narrow opening to test against existing tools. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Policy-confidence assertions limited by verification V55 to V57; designation and mandate remain not verified.
- [E] [[Research/Landscape/Defense-Platforms/Research-Log]]: Records public-source coverage, retrieval failures and limits of market evidence. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Landscape/Defense-Platforms/Scale-Donovan]]: Separates advertised agent capabilities from public research on actual user experience. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## Landscape/Startups-RIP

- [E] [[Research/Landscape/Startups-RIP/Anatomy-of-a-Report]]: Breaks down the visible report structure and the evidence behind its sections. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Pattern retained; Plan/Plan narrows immediate work to one evidence record behind the task app.
- [E] [[Research/Landscape/Startups-RIP/Fleet-Version]]: Adapts the evidence-to-experiment pattern to naval tasks and existing alternatives. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Pattern retained; Plan/Plan narrows immediate work to one evidence record behind the task app.
- [E] [[Research/Landscape/Startups-RIP/Mock-Page]]: Sketches a proposed Fleet evidence page; it is not a working product or measured result. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Pattern retained; Plan/Plan narrows immediate work to one evidence record behind the task app.
- [E] [[Research/Landscape/Startups-RIP/README]]: Indexes the site-pattern review and its proposed Fleet adaptation. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Pattern retained; Plan/Plan narrows immediate work to one evidence record behind the task app.
- [E] [[Research/Landscape/Startups-RIP/What-It-Is]]: Distinguishes visible research pages from unverified paid features and generation claims. Basis: Neither: public-source research on November 4, not a FleetHarness code audit. Status: Pattern retained; Plan/Plan narrows immediate work to one evidence record behind the task app.

## Naval-User

- [E] [[Research/Naval-User/Environment]]: Examines connectivity, endpoint, security and operational constraints on a proposed tool. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Naval-User/Path-to-Fleet]]: Proposes ownership, pilot, authorization and sustainment steps after a demonstration. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Naval-User/README]]: Indexes user research, proposed task families and what remains unvalidated. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Naval-User/Simplicity-Requirements]]: Defines measurable intake, task, recovery and review targets, all still proposed. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Targets retained as proposed tests, not measured results or Navy standards.
- [E] [[Research/Naval-User/Users]]: Distinguishes possible officer roles and evidence needed to select a real user. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Naval-User/Workflows]]: Compares candidate naval tasks, present-process evidence and missing validation. Basis: Neither: user/design research, not a pinned FleetHarness implementation review. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## Plan

- [E] [[Research/Plan/Findings]]: Ranks the evidence, rules on council disagreements and forbids unsupported team claims. Basis: 0f175a8. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Plan/Plan]]: Defines the selected slice, gates, PRs, schedule, demo and full submission checklist mapping. Basis: 0f175a8. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Plan/Research-Map]]: Locates every research note and marks its code basis and superseded advice. Basis: 0f175a8. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Plan/Test-Results]]: Reports historical and current test outcomes, including fixed compile failures and incomplete desktop/live-model proof. Basis: Both: historical f72c5dc and current 0f175a8 sections. Status: Current report governs test outcomes; historical failure and old fix recommendations are superseded by its 0f175a8 section.

## Projects/Aperant

- [E] [[Research/Projects/Aperant/Claims-vs-Evidence]]: Separates Aperant claims, inspected source, issue reports and unverified behavior. Basis: Neither FleetHarness revision; upstream Aperant 20250db069a849ab001ac6ab9e3e9779886ab9e2. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/Aperant/FleetHarness-Fit]]: Maps reusable Aperant patterns to FleetHarness and identifies integration and disclosure gaps. Basis: Neither FleetHarness revision; upstream Aperant 20250db069a849ab001ac6ab9e3e9779886ab9e2. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/Aperant/How-It-Works]]: Traces the desktop specification, coding and QA workbench from inputs to output, including human control and limits. Basis: Neither FleetHarness revision; upstream Aperant 20250db069a849ab001ac6ab9e3e9779886ab9e2. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/Aperant/README]]: Indexes the desktop specification, coding and QA workbench review and adopt, borrow or skip recommendation. Basis: Neither FleetHarness revision; upstream Aperant 20250db069a849ab001ac6ab9e3e9779886ab9e2. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/Aperant/Setup-and-Dependencies]]: Records prerequisites, credentials, dependencies and unresolved setup assumptions for Aperant. Basis: Neither FleetHarness revision; upstream Aperant 20250db069a849ab001ac6ab9e3e9779886ab9e2. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## Projects/SWE-AF

- [E] [[Research/Projects/SWE-AF/Claims-vs-Evidence]]: Separates SWE-AF claims, inspected source, issue reports and unverified behavior. Basis: Neither FleetHarness revision; upstream SWE-AF ef26ffbf61496387d7ba554e83799cb5385804d0. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/SWE-AF/FleetHarness-Fit]]: Maps reusable SWE-AF patterns to FleetHarness and identifies integration and disclosure gaps. Basis: Neither FleetHarness revision; upstream SWE-AF ef26ffbf61496387d7ba554e83799cb5385804d0. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/SWE-AF/How-It-Works]]: Traces the classic and installed-engine software-factory paths from inputs to output, including human control and limits. Basis: Neither FleetHarness revision; upstream SWE-AF ef26ffbf61496387d7ba554e83799cb5385804d0. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/SWE-AF/README]]: Indexes the classic and installed-engine software-factory paths review and adopt, borrow or skip recommendation. Basis: Neither FleetHarness revision; upstream SWE-AF ef26ffbf61496387d7ba554e83799cb5385804d0. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/SWE-AF/Setup-and-Dependencies]]: Records prerequisites, credentials, dependencies and unresolved setup assumptions for SWE-AF. Basis: Neither FleetHarness revision; upstream SWE-AF ef26ffbf61496387d7ba554e83799cb5385804d0. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## Projects/SuperPlane

- [E] [[Research/Projects/SuperPlane/Claims-vs-Evidence]]: Separates SuperPlane claims, inspected source, issue reports and unverified behavior. Basis: Neither FleetHarness revision; upstream SuperPlane 7d755d16b8ae836ecebf61639efc6266d74a4b0b. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/SuperPlane/FleetHarness-Fit]]: Maps reusable SuperPlane patterns to FleetHarness and identifies integration and disclosure gaps. Basis: Neither FleetHarness revision; upstream SuperPlane 7d755d16b8ae836ecebf61639efc6266d74a4b0b. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/SuperPlane/How-It-Works]]: Traces the workflow engine and ticket-to-PR factory from inputs to output, including human control and limits. Basis: Neither FleetHarness revision; upstream SuperPlane 7d755d16b8ae836ecebf61639efc6266d74a4b0b. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/SuperPlane/README]]: Indexes the workflow engine and ticket-to-PR factory review and adopt, borrow or skip recommendation. Basis: Neither FleetHarness revision; upstream SuperPlane 7d755d16b8ae836ecebf61639efc6266d74a4b0b. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/SuperPlane/Setup-and-Dependencies]]: Records prerequisites, credentials, dependencies and unresolved setup assumptions for SuperPlane. Basis: Neither FleetHarness revision; upstream SuperPlane 7d755d16b8ae836ecebf61639efc6266d74a4b0b. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## Projects/Symphony

- [E] [[Research/Projects/Symphony/Claims-vs-Evidence]]: Separates Symphony claims, inspected source, issue reports and unverified behavior. Basis: Neither FleetHarness revision; upstream Symphony be10a1b79df723d6d7612b5651c8522704dafb2e. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/Symphony/FleetHarness-Fit]]: Maps reusable Symphony patterns to FleetHarness and identifies integration and disclosure gaps. Basis: Neither FleetHarness revision; upstream Symphony be10a1b79df723d6d7612b5651c8522704dafb2e. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/Symphony/How-It-Works]]: Traces the tracker-driven coding workers and lifecycle from inputs to output, including human control and limits. Basis: Neither FleetHarness revision; upstream Symphony be10a1b79df723d6d7612b5651c8522704dafb2e. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/Symphony/README]]: Indexes the tracker-driven coding workers and lifecycle review and adopt, borrow or skip recommendation. Basis: Neither FleetHarness revision; upstream Symphony be10a1b79df723d6d7612b5651c8522704dafb2e. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/Projects/Symphony/Setup-and-Dependencies]]: Records prerequisites, credentials, dependencies and unresolved setup assumptions for Symphony. Basis: Neither FleetHarness revision; upstream Symphony be10a1b79df723d6d7612b5651c8522704dafb2e. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.

## UseCase-Map

- [E] [[Research/UseCase-Map/Archetypes]]: Groups the 34 captured cases into eight research families, distinct from ten code recipes. Basis: Neither: captured event requirements and proposed designs, not an implementation audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/UseCase-Map/Matrix]]: Maps all captured cases to data, disconnected-use, effort and judging considerations. Basis: Neither: captured event requirements and proposed designs, not an implementation audit. Status: Retained within its stated evidence limits; no runtime or benefit proof implied.
- [E] [[Research/UseCase-Map/PoC-Mapping]]: Matches the three original demonstrations to exact requirements and omissions. Basis: Neither: captured event requirements and proposed designs, not an implementation audit. Status: Options retained; the one-task plan supersedes a new controller or multi-demo sprint recommendation.
- [E] [[Research/UseCase-Map/README]]: Indexes the use-case map, recommendations, evidence boundaries and handoff. Basis: Neither: captured event requirements and proposed designs, not an implementation audit. Status: Options retained; the one-task plan supersedes a new controller or multi-demo sprint recommendation.
- [E] [[Research/UseCase-Map/Top-Candidates]]: Ranks five proposed slices and stop conditions before current-code reconciliation. Basis: Neither: captured event requirements and proposed designs, not an implementation audit. Status: Options retained; the one-task plan supersedes a new controller or multi-demo sprint recommendation.

## Inventory checks and limits

[E] Inventory method: recursive enumeration of `*.md` under the permitted Research root, with one entry per path. The inventory contains 107 notes, including this directory. The original Test-Results note remains unchanged. No source repository was executed or modified to make this directory.

[R] When the teammate advances the code, add the new commit and its delta before promoting a baseline finding to a current fact. Preserve the historical note and mark only the claim that new evidence actually replaces. The source map is a locator, not independent validation of every cited external source.

## Sources

- [E] Local inventory root: `~/Documents/CDAO/Fleethacker-Vault/Research`.
- [E] https://github.com/danjung9/FleetHarness/tree/f72c5dc15aa6c34d2b9080c1c0b87742230cc16e
- [E] https://github.com/danjung9/FleetHarness/tree/0f175a8ce346521c4462fc134d40c0973eac1323
- [V] https://github.com/Agent-Field/SWE-AF/tree/ef26ffbf61496387d7ba554e83799cb5385804d0
- [V] https://github.com/superplanehq/superplane/tree/7d755d16b8ae836ecebf61639efc6266d74a4b0b
- [V] https://github.com/openai/symphony/tree/be10a1b79df723d6d7612b5651c8522704dafb2e
- [V] https://github.com/AndyMik90/Aperant/tree/20250db069a849ab001ac6ab9e3e9779886ab9e2
