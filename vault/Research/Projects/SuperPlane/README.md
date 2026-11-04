---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Borrow SuperPlane factory patterns, but keep its installation off the critical path for the remaining sprint."
---

# SuperPlane project scout

## Bottom line

[R] **Borrow from it. Do not make installing it the FleetHarness critical path with about 27 hours left.** [E] SuperPlane can take a bounded development ticket through a coding agent, a branch, a pull request, configured checks and repairs, with durable history. [E] It assumes engineering infrastructure and does not supply the naval requirements, representative data or acceptance criteria FleetHarness still needs. [R] Spend the remaining time proving one complete use case with the confirmed coding tool, and copy the useful process boundaries.

## What the product is

[E] At commit `7d755d16b8ae836ecebf61639efc6266d74a4b0b`, SuperPlane is a Go workflow engine, React interface, CLI and runner system with a software factory built on top. Evidence: `go.mod`, `web_src/package.json`, `pkg/workers/event_router.go`, `pkg/grpc/actions/factories/factory_app_templates.go`, and `pkg/runners/README.md` in the supplied read-only clone.

[E] Its natural user is an engineering team with an existing repository, tickets and test infrastructure. The bundled implementation automation consumes a task title, description, optional specification and repository information. It produces commits, a branch and a linked pull request. Evidence: `pkg/grpc/actions/factories/templates/github/line-implementation.canvas.yaml`. [R] A naval officer should see the resulting use-case application and approval decisions, with an engineer operating this infrastructure.

## Notes

- [R] [[Research/Projects/SuperPlane/How-It-Works]] traces the code and control boundaries.
- [R] [[Research/Projects/SuperPlane/Setup-and-Dependencies]] covers model choices, deployment, disconnection and setup estimates.
- [R] [[Research/Projects/SuperPlane/Claims-vs-Evidence]] separates implementation, public claims, maturity and licensing.
- [R] [[Research/Projects/SuperPlane/FleetHarness-Fit]] maps all seven steps and gives the proposed decision.

## Five findings that matter

1. [E] This checkout really contains factory implementation and repair graphs. Describing it only as DevOps workflow glue would miss the current product. See `pkg/grpc/actions/factories/templates/github/line-implementation.canvas.yaml` and `pr_feedback_checks_template.go`.
2. [E] OpenAI with Codex is a native execution route. Grok and Gemini can be selected through the OpenRouter/OpenCode route, subject to provider availability. Cursor has a separate remote-agent integration. None of that establishes that event credentials work in those services. See `pkg/components/runner/codex/`, `pkg/components/runner/openrouter/`, and `pkg/integrations/cursor/`.
3. [E] Configured CI check failures have bounded automatic repairs, default three attempts. An empty selected-check list can pass the check evaluator. Agent-written summaries and confidence scores remain different evidence from an independently executed acceptance test. See `pr_feedback_template.go`, `pr_feedback_checks_template.go`, `pkg/integrations/github/components/checks/wait_for_pull_request_checks_eval.go`, and the implementation YAML.
4. [E] Host execution is supported, and the Codex wrapper disables its own approval and sandbox checks. A fresh working directory alone is not an operating-system security boundary. See `pkg/runners/agent/host_executor.go` and `pkg/components/runner/codex/run.js`.
5. [E] `LICENSE` and `NOTICE` identify an Apache 2.0 core and a separately licensed `ee/` tree. [R] Reuse only identified community material, preserve notices and disclose the upstream baseline separately from event work.

## Decision and reversal criteria

[R] Borrow the durable task record, explicit run states, branch-per-change workflow, configured verification, bounded repair and final human decision. Do not port the full server, billing, fleet provisioning and integration stack into a new 27-hour project.

[R] Change to **use it** only if a team member can show an already authorized installation completing one synthetic task on our chosen model, producing a real failed test, repairing it, showing the passing result and stopping at human review in a two-hour evaluation window. Require a measured compute cost, clear credential boundaries and a runnable application artifact. If that proof needs new cloud access, enterprise licensing or a large agent adapter, defer adoption beyond the event.

## Session record and disclosure handoff

[E] This seat read the named brief, FleetHarness README, event rules, judging and terms summary, plus required vault context. Research used read-only shell file searches, Git metadata, source inspection and public web search on 2026-11-04. Repository programs, installers, builds and tests were not run. No repository changes, sign-ins, outward messages, pushes or live integration calls were made.

[E] The supplied clone already existed at the pinned commit. All implementation described here predates this research. The event contribution from this seat is these five research notes, not SuperPlane's code or demonstrated performance.

[E] Friction: several direct GitHub issue pages returned cache misses; the public issue index was readable. Search results included stale release summaries and reviews without hands-on testing. Mac setup, provider account access, costs, runtime test success and offline operation remain unverified.

[R] These paragraphs are ready to transfer into the team's tool disclosure, prior-work and friction logs. The assignment restricts all writes to this folder, so shared Sprint, Sessions and Team notes were not edited.

## Sources

- [E] Local read-only clone: `<local clones>/superplane`, commit `7d755d16b8ae836ecebf61639efc6266d74a4b0b`.
- [V] Public upstream: https://github.com/superplanehq/superplane
- [V] Factory documentation: https://docs.superplane.com/get-started/overview/
- [P] Local assignment brief: `Research/00-Brief.md`; FleetHarness: `~/Documents/CDAO/FleetHarness/README.md`.
