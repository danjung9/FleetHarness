---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Gmail is a restricted-scope connector with a fixture-only event path."
---

# Gmail

## Bottom line

[R] Demonstrate a fictional mailbox from a local fixture, never a live Gmail mailbox at this event. [V] Google classifies both `gmail.readonly` and `gmail.metadata` as restricted scopes. https://developers.google.com/workspace/gmail/api/auth/scopes [R] Gmail is a later connector if a confirmed user needs it in an approved environment. [R] It adds no necessary capability to Thursday's four-event training draft.

## How it works

[V] A registered OAuth client obtains the selected Gmail grant through the user's consent. `gmail.readonly` permits message access; metadata access omits bodies but remains restricted. Public restricted-scope applications face verification, and Google states that storing or transmitting restricted-scope data on servers requires a security assessment. https://developers.google.com/workspace/gmail/api/auth/scopes

[V] Google's installed-app flow supports PKCE and desktop loopback redirects. https://developers.google.com/identity/protocols/oauth2/native-app [R] Use the system browser and protected host token storage. Confirm applicable verification exceptions and Workspace administrator policies rather than assuming that a testing-mode account removes production obligations. Do not use a service account with domain-wide delegation for an initial user-selected import.

[R] A later adapter should list a bounded selection, retrieve only chosen messages, sanitize HTML and extract an explicit schema. A Gmail label or search query is a retrieval restriction, not a per-message authorization grant. Keep attachments and send/modify functions disabled. Do not forward access tokens or mailbox contents into prompts by default.

## What the user sees

[R] The later user chooses "Import selected mail", reviews requested access at Google, selects a short date range and messages, then checks extracted fields before accepting a local draft. A visible connection panel shows the account's approved organization, allowed operations and disconnect action. For Thursday, replace that entire network path with "Synthetic Gmail example, no account connected".

## Navy approvals and event rule 4

[R] Google verification and Workspace consent are distinct from Navy authorization. Confirm the approved service, tenant, processing location, resource owner, security review and inference destination under the common gates in [[Research/RandE/Connectors/README]]. Do not suggest forwarding Flank Speed mail to Gmail or using a personal mailbox as a bridge.

[R] Sender, subject and headers can expose personal or sensitive information even without message bodies. Quoted threads, links, signatures and attachments increase the risk. Only invented content belongs in the event fixture. Treat mail content as data that cannot instruct the importer to send, delete or fetch another source.

## Thursday and post-event

[R] Thursday: show three invented records, selection, field preview, cancellation and removal of the local import. Include a synthetic adversarial message to prove it cannot trigger tools. No live account or real messages, including copied or lightly redacted mail. This design has not been implemented here.

[R] Post-event: secure a dedicated authorized development environment and an owner-approved test plan before a network trial. Validate revoked grants, token expiry, missing scopes, paging, attachment refusal and retention. Obtain the applicable Google verification decision before broader use.

## Build size and evidence

[A] Estimate: 4 to 8 engineer-hours for a local fixture on an existing importer; 3 to 5 engineer-days for a bounded Gmail adapter after shared Google auth. Verification, security assessment, tenant provisioning and Navy approvals have unknown elapsed time and are excluded. No Gmail account, API or mailbox was accessed.

## Sources

- [V] https://developers.google.com/workspace/gmail/api/auth/scopes
- [V] https://developers.google.com/identity/protocols/oauth2/native-app

