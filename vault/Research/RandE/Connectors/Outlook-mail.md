---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Outlook import needs explicit mail permission; Thursday must use a fixture mailbox only."
---

# Outlook mailbox through Graph

## Bottom line

[R] Use an entirely invented mailbox fixture for Thursday, with no Outlook account or live mailbox connection. [V] Graph distinguishes basic mail metadata from access to message content. https://learn.microsoft.com/en-us/graph/permissions-reference#mailreadbasic [R] Post-event, make the first authorized mail experiment a bounded, user-reviewed import. [R] Reading mail still creates substantial disclosure risk even when sending is disabled.

## How it works

[V] `GET /me/messages` or a specific mail-folder messages endpoint lists messages for the signed-in user. The least delegated permission is `Mail.ReadBasic`; content-oriented use needs a higher permission such as `Mail.Read`. The list method is documented for US Government L5. https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0

[V] `Mail.ReadBasic` excludes bodies, previews, attachments and extended properties. https://learn.microsoft.com/en-us/graph/permissions-reference#mailreadbasic [R] If the task requires extracting requests from bodies, say so before requesting `Mail.Read`. A folder filter, date filter or small `$select` reduces retrieval but does not narrow the OAuth grant to that folder. Do not request `Mail.Send` or `Mail.ReadWrite` for an import.

[V] Exchange application RBAC can scope unattended application access, but a broader Entra grant can independently preserve access. https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac [R] Keep app-only mail out of the first pilot. A later service must prove effective mailbox scoping, including denial of access outside the approved set.

## What the user sees

[R] "Choose synthetic messages" for the event. Later, an approved user selects a folder/date range, sees source cards, chooses messages, reviews extracted fields with message references and accepts a local draft. Show exactly what is retained and whether anything reaches a model. Never auto-forward, send a reply, open attachments or create tasks merely because message text requests it.

## Navy approvals and event rule 4

[R] Tenant consent, Exchange owner approval, data-owner permission and system authorization review all apply. Use the Flank Speed cloud configuration only after its owner confirms the tenant. See [[Research/RandE/Connectors/Flank-Speed-Entra]]. Approved Microsoft hosting does not establish approval for a new external processor.

[R] Real messages may contain personal identifiers, hidden quoted threads, sensitive schedules, attachments or nonpublic government information. Metadata can also violate rule 4. Treat message bodies as untrusted data, strip active HTML and remote images, and retain no live mailbox content at this event.

## Thursday and post-event

[R] Thursday: supply fictional message IDs and `.invalid` addresses inside a static fixture. Show a normal request, a conflicting date, and a message containing instructions that the importer ignores. State "Synthetic mailbox. No Outlook connection. No messages sent." Test preview, cancel and local deletion. Do not connect even a personal mailbox described as a test account.

[R] Post-event: obtain approval before using any tenant mailbox, then validate paging, cancellation, HTML treatment, attachment refusal, permissions, revocation and retention. Real mail remains excluded from event work regardless of post-event plans.

## Build size and evidence

[A] Estimate: 4 to 8 engineer-hours for a fixture picker on an existing import UI; 2 to 4 engineer-days for a bounded live read adapter after shared Graph authentication. Attachment parsing, mailbox sync and authorization lead time are excluded. No live or fixture mailbox was built or tested here.

## Sources

- [V] https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0
- [V] https://learn.microsoft.com/en-us/graph/permissions-reference#mailreadbasic
- [V] https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac

