---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Governed internal-tool reference with a new AI builder, approval gates and enterprise runtime dependence."
---

# Retool

## Bottom line

[R] Retool is the strongest reference here for putting governed actions behind a simple internal-tool interface. [V] Its current app builder generates React apps with connected resources and functions (https://docs.retool.com/build/apps). [R] Borrow function approval, authenticated publishing and administrator-provided resources. [A] Self-hosting does not by itself verify an offline AI authoring path or Navy authorization.

## The first ten minutes

[E] Proposed walkthrough from public documentation, reviewed November 4, 2026; no live session was run. [A] This assumes an administrator has already enabled the new builder and provided a synthetic resource. Without that setup, ten minutes may end at access provisioning.

1. [R] Minute 0 to 1: personally sign in to the approved Retool instance. Choose Create, then App.
2. [R] Minute 1 to 3: prompt: Use the synthetic training_requests resource. Show pending room requests and conflicts. Let a reviewer mark a request approved with a reason. Keep all writes subject to review.
3. [R] Minute 3 to 6: inspect generated screens and the resource it selected. Reject any unexpected datasource or write action.
4. [R] Minute 6 to 8: try one accepted and one rejected request in Preview. Review any proposed function execution before approving it.
5. [R] Minute 8 to 9: select a component and ask for one wording change. Verify the change did not alter another action.
6. [R] Minute 9 to 10: inspect the publish checklist, pending functions and destination folder permissions. Record findings and leave publishing unexecuted.

[V] The quickstart documents administrator enablement, Create > App, generated preview, review of write functions and a publish checklist. Published apps require authenticated users, with folder access affecting who can use them (https://docs.retool.com/build/apps/quickstart).

## How it decides, asks and exposes controls

[V] The builder uses the prompt, available resources, components and functions; the quickstart asks users to specify data, interface and desired actions. Selection mode scopes edits to a chosen component (https://docs.retool.com/build/apps/concepts/app-builder). [A] A mandatory domain interview was not verified. [R] Present a short list of allowed resources and operational rules before generating functions.

[V] Older descriptions of Assist are stale for most users: Retool ended that public beta on September 30, 2026, directing users to the new builder; some customers retained temporary access (https://docs.retool.com/changelog/assist-removal). [R] Compare the current builder rather than mixing it with classic drag-and-drop behavior.

## Checks and the point where it needs engineers

[R] Test the write itself, not just the button. Verify reviewer and ordinary-user permissions; refresh the actual record; inspect function parameters; try direct access as an unauthorized test account. Require approval from a separate reviewer for destructive changes.

[R] Database credentials with broad authority can make a small internal tool consequential. Have an engineer own query permissions, transaction behavior, schema changes, release review and recovery. Keep the mission rule in a testable service rather than scattered generated UI conditions.

## Data, login, incidents and independent evaluation

[V] Retool says centralized authentication, role permissions and data policies are inherited from its platform rather than embedded in each generated app (https://retool.com/blog/retool-launches-react-ai-app-builder). [R] Treat this as a vendor architecture claim and test the configured boundaries. [A] Selected model providers, retention and whether schema or row contents leave the instance were not verified.

[V] Vendor incident disclosure dated September 13, 2023: a spear-phishing attack led to account takeover for 27 cloud customers. Retool said on-premises and managed accounts were unaffected and described cloud-synced one-time-password tokens as part of the chain (https://retool.com/blog/mfa-isnt-mfa). [R] Require phishing-resistant authentication and a second approval for privileged support or account changes.

[V] Independent first-person evaluation on the public forum, June 2026: an experienced user reported concern that repeated AI prompting for small corrections could become costly and frustrating without code-editing skills. This is one person's early experience, not a controlled benchmark (https://community.retool.com/t/new-app-builder-first-impressions/66338). [A] No independent current-version security certification or broad non-coder success study was verified.

## Export, offline and price

[V] Retool documents a CLI for locally developing, importing and publishing Retool-native React apps, with source-control synchronization (https://docs.retool.com/build/apps/concepts/cli). [R] This is a development handoff, not evidence that exported apps run without Retool services.

[V] Current pricing lists self-hosted or air-gapped options under custom Enterprise. Annual-billing list prices include Team at $10 per builder and $5 per internal user monthly, and Business at $50 and $15 respectively; AI credits are pooled (https://retool.com/pricing). [A] Air-gapped AI model connectivity, licensing checks, exact self-hosted feature parity and disconnected operation were not tested. [R] Confirm those separately; include users, AI credits and platform operations in cost estimates.

## Sources

- [V] Current apps: https://docs.retool.com/build/apps
- [V] Quickstart and publishing: https://docs.retool.com/build/apps/quickstart
- [V] Builder controls: https://docs.retool.com/build/apps/concepts/app-builder
- [V] Assist removal: https://docs.retool.com/changelog/assist-removal
- [V] Architecture: https://retool.com/blog/retool-launches-react-ai-app-builder
- [V] Incident: https://retool.com/blog/mfa-isnt-mfa
- [V] First-person evaluation: https://community.retool.com/t/new-app-builder-first-impressions/66338
- [V] CLI: https://docs.retool.com/build/apps/concepts/cli
- [V] Pricing: https://retool.com/pricing
