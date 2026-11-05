---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Strong reference for conversational planning and preview, with separate platform and generated-app security risks."
---

# Lovable

## Bottom line

[R] Borrow Lovable's plan, preview, point-and-edit loop for FleetHarness. [R] Add explicit acceptance tests before treating a polished screen as a working workflow. [V] Lovable documents source export and external hosting, but that does not establish disconnected operation of a generated application (https://docs.lovable.dev/tips-tricks/deployment-hosting-ownership). [A] No Navy authorization or Flank Speed integration was verified.

## The first ten minutes

[E] This is a documentation-based script, not a timed product trial; sources were read on November 4, 2026. [A] Account creation, model latency or account limits can exceed the time budget.

1. [R] Minute 0 to 1: open https://lovable.dev and personally create an account. Keep the project private. Use synthetic data only.
2. [R] Minute 1 to 3: select Plan and enter: Build a training-slot request tracker using fictional units Alpha and Bravo, three rooms and six requests. Show conflicts. A reviewer approves requests. No external connections. Ask me about rules before building.
3. [R] Minute 3 to 4: answer who may approve, whether rooms can overlap, and what must remain usable without internet. Reject invented requirements in the plan.
4. [R] Minute 4 to 7: approve one screen and one workflow. Let the first build finish. If it has not finished, record the delay rather than skipping checks.
5. [R] Minute 7 to 9: use the preview to add two requests for the same room and time. Confirm the conflict is visible. Change one selected label through the visual editor.
6. [R] Minute 9 to 10: refresh and check whether changes persist. Record whether persistence is real or only sample state. Save a version; leave publishing for a separate approval.

[V] The documented onboarding is account, prompt, generated preview and iteration. Its initial example deliberately excludes login and database. The guide offers a roughly ten-minute introduction, not a production-readiness claim (https://docs.lovable.dev/introduction/getting-started).

## How it chooses and asks

[V] Plan mode examines project context, can ask clarifying questions, and presents an editable plan before code changes. Chat discusses ideas; Build implements them. The vendor says Plan itself does not modify code (https://docs.lovable.dev/features/plan-mode).

[R] Supply the decision rules and test examples explicitly. A generated table of training requests is insufficient evidence that the tool has implemented scheduling constraints. Make assumptions visible in a short approval card.

## How the user checks the result

[R] Require a visible record of expected and actual outcomes: overlapping booking rejected; non-overlapping booking accepted; unapproved request cannot become approved through an ordinary user account. A refresh tests persistence, not authorization. A separate user and direct server-side check test authorization.

[R] Require the generated app to identify sample data and unavailable integrations on the screen. Use a restore point before schema changes, and separately test database restoration.

## Data, login and security evidence

[V] Lovable Cloud documents a built-in backend for data and authentication. These are app services, separate from the builder account (https://docs.lovable.dev/integrations/cloud). [V] The security page describes infrastructure controls and a model-training opt-out setting for Free and Pro users (https://lovable.dev/security). [A] Retention, selected hosting region, full subprocessors and the team's contractual terms were not verified.

[V] Platform incident, vendor account dated April 22, 2026: a regression allowed authenticated users with a public-project link potentially to access its chat history and source code between February 3 and April 20. Lovable says it fixed the problem and that private projects and Lovable Cloud were unaffected. This was not the same issue as insecure generated database permissions (https://lovable.dev/blog/our-response-to-the-april-2026-incident).

[V] Independent academic evaluation, August 17, 2026: a preliminary study generated three projects each with Lovable, v0 and Replit from one prompt and used SonarQube. Lovable had a higher density of code smells but generally lower-severity issues. Nine apps and static analysis cannot establish comparative mission correctness or security (https://arxiv.org/abs/2608.16302). [A] The widely repeated 2025 claim about 170 exposed apps was located in secondary reports, but the original researcher statement was not verified in this pass; do not use that statistic as council evidence.

## Where it gets hard

[R] Expect an engineering handoff at per-record permissions, schema migrations, competing edits, background tasks and synchronization. Make the app prove a two-user boundary and a destructive-change restore. Marketing security controls do not replace those tests.

## Export, offline and price

[V] GitHub integration supports export and two-way source synchronization. The ownership documentation describes migrating data and self-hosting portions or all of the app stack (https://docs.lovable.dev/integrations/github, https://docs.lovable.dev/tips-tricks/deployment-hosting-ownership). [A] Offline authoring was not verified. [R] For offline runtime, inventory every dependency: database, identity, remote model, fonts and external APIs. Replacing hosting alone is insufficient.

[V] The current pricing page describes shared workspace credits for building, cloud hosting and app AI. Free includes five daily build credits, capped at 30 monthly. Paid plans are credit-based rather than seat-based. The page's readable content did not expose a reliable base subscription amount (https://lovable.dev/pricing). [R] Track build, hosting and app inference costs separately; confirm checkout rather than copying older price tables.

## Sources

- [V] Onboarding: https://docs.lovable.dev/introduction/getting-started
- [V] Planning: https://docs.lovable.dev/features/plan-mode
- [V] Backend: https://docs.lovable.dev/integrations/cloud
- [V] Security: https://lovable.dev/security
- [V] Platform incident: https://lovable.dev/blog/our-response-to-the-april-2026-incident
- [V] Independent study: https://arxiv.org/abs/2608.16302
- [V] Git export: https://docs.lovable.dev/integrations/github
- [V] Hosting and ownership: https://docs.lovable.dev/tips-tricks/deployment-hosting-ownership
- [V] Pricing: https://lovable.dev/pricing
