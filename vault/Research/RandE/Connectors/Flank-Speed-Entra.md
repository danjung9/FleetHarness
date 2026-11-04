---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Flank Speed access depends on the Navy tenant, device policy and application authorization."
---

# Flank Speed and Entra ID realities

## Bottom line

[R] Do not offer "Sign in with Flank Speed" as a ready Thursday connector. [V, search-index evidence] A Navy public article describes Flank Speed as an IL5 Azure and Microsoft 365 implementation assessed against Zero Trust objectives. https://www.niwcatlantic.navy.mil/media/article/3945479/department-of-the-navys-flank-speed-service-sets-new-standard-for-zero-trust-in/ [R] Its platform security posture does not establish authorization for FleetHarness or for exporting content to an event service. [A] The applicable tenant's current app onboarding and consent policy has not been verified.

## How it works

[V] Microsoft documents these cloud endpoint combinations. Tokens are not interchangeable across clouds. https://learn.microsoft.com/en-us/graph/deployments

| Environment | Authority | Graph service root |
| --- | --- | --- |
| [V] Commercial and GCC | `https://login.microsoftonline.com` | `https://graph.microsoft.com` |
| [V] GCC High | `https://login.microsoftonline.us` | `https://graph.microsoft.us` |
| [V] Microsoft 365 DoD | `https://login.microsoftonline.us` | `https://dod-graph.microsoft.us` |

[V] Source for the table: https://learn.microsoft.com/en-us/graph/deployments. Graph Explorer is not supported for the listed US Government deployments. [R] Use a tenant-specific authority and approved app registration after the owner confirms which environment applies. Do not infer cloud configuration from a user's email suffix.

[V] Entra Conditional Access can require MFA, compliant devices or other controls and can block access. https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview [R] Let the Navy's approved browser and identity tooling handle CAC/PIV or other authentication requirements where applicable. Never collect a CAC PIN, substitute a personal account, suggest device-code flow as a policy bypass or disable compliance checks. [A] Exact CAC, device, network and broker requirements for this application are unknown.

## What the user sees

[R] In an approved pilot, the user enters an approved work-account flow, completes the organization's authentication and sees either a bounded source picker or a clear blocked state. An "administrator approval required" result is an expected outcome to explain, not an error the user must solve with developer settings. Provide the approved support contact through the organization, not an invented person.

## Approval and accreditation path

[V] NIST's RMF authorization step assigns a senior official the decision to accept system security and privacy risk. https://csrc.nist.gov/Projects/risk-management/about-rmf/authorize-step [R] Ask the Navy system owner and security team whether this app and its model, host storage, network routes and connector service can fit an existing authorization boundary or require additional authorization. Have the tenant owner approve exact grants and the data owner approve purpose and handling. Do not claim that a separate ATO is always required or automatically inherited.

[R] The event's rule 4 remains stricter than a general unclassified platform label. Government mailbox contents, calendar entries and document metadata must not be imported into event work. An IL5 label does not permit that transfer.

## Thursday, post-event and size

[R] Thursday: explain this deployment path with a synthetic blocked/approved-state mock, labeled as a design. No Navy sign-in or tenant request. Post-event: obtain a sponsor and the actual onboarding process, confirm cloud/API availability, then seek an approved synthetic-only development pilot before any work-data proposal.

[A] Estimate: 2 to 5 engineer-days for cloud-aware auth/configuration after the shared Graph layer, plus endpoint and deployment work once requirements are known. Approval duration is unknown and is not included. No Navy tenant, CAC workflow, accreditation decision or endpoint access was tested.

## Sources

- [V] https://learn.microsoft.com/en-us/graph/deployments
- [V] https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview
- [V] https://csrc.nist.gov/Projects/risk-management/about-rmf/authorize-step
- [V, search-index excerpt only; direct retrieval returned 403] https://www.niwcatlantic.navy.mil/media/article/3945479/department-of-the-navys-flank-speed-service-sets-new-standard-for-zero-trust-in/
- [V, issuance located by search; full PDF retrieval returned 403] https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/851001p.pdf
