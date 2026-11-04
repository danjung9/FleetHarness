---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Identity sign-in needs a provider registration and does not authorize work-data access."
---

# Other OAuth and identity sign-ins

## Bottom line

[R] Offer an approved work identity only when the app needs shared ownership, saved online projects or audited access. [V] OpenID Connect adds identity authentication to OAuth authorization. https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc [R] A Microsoft, Google or GitHub login must not imply mailbox, file or organization access. [R] Defer new login providers until a useful synthetic import works.

## How it works

[V] Microsoft's authorization-code flow supports desktop applications with PKCE and recommends a supported authentication library. https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow [R] Register a public desktop client with approved callback addresses, open the system browser, validate state and identity claims, and store tokens in protected host storage. Never embed a client secret in Electron or exported HTML. Use separate account records and grants for each provider and resource.

| Option | Real function and limit |
| --- | --- |
| [V] Microsoft Entra ID | Work identity using OIDC; use a known tenant and issuer. Separate Graph permissions authorize data access. https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc |
| [V] Google identity | OIDC identity with `openid` and optional profile/email scopes. Workspace data requires additional API grants. https://developers.google.com/identity/openid-connect/openid-connect |
| [V] GitHub OAuth | Authorization-code flow with requested scopes for GitHub account resources. It is a separate developer identity, not Navy work authorization. https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps |

## What the user sees

[R] Use a short sequence: choose approved identity, sign in at the provider, return to the app, see the active organization, then select a particular data source. Request new data permissions only when the user selects that source. If approval is blocked, show "Your organization must approve this connection" with a support route. Avoid repeated sign-in prompts and raw scope names in the ordinary workflow; keep permission details inspectable.

## Navy approvals and event rule 4

[V] Entra tenant policy controls user consent, and an optional administrator workflow can handle requests that users cannot approve. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow [R] Confirm tenant app registration, publisher identity, redirect configuration, allowed users, Conditional Access and endpoint approval through the tenant owner. Apply the authorization and data-flow review in [[Research/RandE/Connectors/README]]. A successful token exchange does not complete that review.

[R] Identity alone can introduce personal names, email addresses and organization affiliation. Do not log these in event artifacts. Do not use personal identities to bridge government data into an event service. Never ask a user to paste an access token or bypass an administrator denial.

## Thursday and post-event

[R] Thursday: use an explicitly simulated identity/consent screen if explaining the concept. Do not claim a successful login from that screen. The current local synthetic workflow does not need a new identity system. No provider registration or consent request was created here.

[R] Post-event: pick one approved provider, prove tenant and issuer enforcement, cancellation, wrong-account rejection, revoked grants, restart persistence and disconnect. Data connectors still need their own permission tests.

## Build size and evidence

[A] Estimate: 2 to 4 engineer-days for one desktop provider with protected storage and failure handling; a hosted identity service adds server operations and a separate authorization boundary. Tenant and provider approval waits are excluded. No new login was implemented or exercised by this research.

## Sources

- [V] https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- [V] https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- [V] https://developers.google.com/identity/openid-connect/openid-connect
- [V] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- [V] https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow

