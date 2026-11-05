---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Graph is a shared access layer with separate permissions and cloud support for each service."
---

# Microsoft 365 through Microsoft Graph

## Bottom line

[R] Build one approved Microsoft connection layer after the event, then add a narrowly scoped service adapter. [V] Graph uses different service endpoints and non-interchangeable tokens across commercial and national clouds. https://learn.microsoft.com/en-us/graph/deployments [R] A general "Connect Microsoft 365" button should explain the specific service and data requested before consent. [R] Thursday should show synthetic service fixtures without connecting a mailbox or a Navy tenant.

## How it works

[V] An application first registers and obtains access tokens, then calls the API endpoint for its cloud. API availability varies by service and method. https://learn.microsoft.com/en-us/graph/deployments [R] Use delegated access for an initial interactive pilot. Application access is a separate unattended-service design requiring administrator review and resource scoping. `/me` requests require a signed-in user context; do not reuse them as an application-only design.

[R] Put tenant, cloud, token lifecycle, disconnect and sanitized error handling in a shared host service. Put mail, calendar, files and Teams in distinct adapters. Use stable resource IDs, bounded page counts, cancellation and explicit date/file selections. Honor throttling and provider retry guidance. Keep tokens out of the renderer, model prompts and generated app source.

## What the user sees

[R] The user chooses "Import a calendar" or "Choose a work file", signs in with the approved work account, selects a bounded source, previews the extracted fields and confirms the import. Show a source timestamp and "Snapshot, not live sync". If consent, policy or cloud support blocks access, retain the user's draft and explain which owner must help.

## Navy approvals and event rule 4

[R] The tenant owner must approve the application identity and exact grants; the resource owner must approve data use; the system owner and security team must establish the authorized processing boundary. Follow [[Research/RandE/Connectors/Flank-Speed-Entra]] and the common approval gates in [[Research/RandE/Connectors/README]]. Token possession must never be treated as permission to send content to the event model service.

[R] A broad tenant crawl can expose personnel records, messages, meeting details and nonpublic documents. Start with a resource allowlist and explicit user selection. Never enable send, delete, calendar publication or directory mutation for an import feature.

## Thursday and post-event

[R] Thursday: a fixture adapter can return invented Graph-shaped data, show permission-denied and expired-connection states, and exercise preview/import. Label it "Synthetic Microsoft 365 example, no account connected". This proves only the local adapter workflow once tested.

[R] Post-event: agree on one cloud and one service, use an isolated approved development tenant, then test narrow grants and denial cases. An authorized Navy pilot follows separately. Do not infer cross-cloud operation from a commercial-tenant demonstration.

## Build size and evidence

[A] Estimate: 2 to 4 engineer-days for the shared authentication and connection layer, plus the per-service adapter estimates. Shared work should not be counted again for every service. Authorization time, licensed tenant provisioning and deployment hardening are excluded.

[E] A scoped search of `package.json`, `electron/` and `shared/` at `50fcaea` found none of the searched Graph endpoint, mail-scope or MSAL strings. This is limited source evidence, not proof that all possible integrations are absent. No Graph request was made.

## Sources

- [V] https://learn.microsoft.com/en-us/graph/deployments
- [V] https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- [E] FleetHarness `50fcaea`, read-only scoped Git search.

