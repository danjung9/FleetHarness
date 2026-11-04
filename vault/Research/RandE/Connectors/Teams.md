---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Teams chats, channels and files require different grants and belong after the event."
---

# Microsoft Teams

## Bottom line

[R] Defer live Teams access until there is an approved, narrow use case. [V] Chat and channel messages use separate Graph methods and permissions. https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0 and https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0 [R] For Thursday, use a clearly fictional thread fixture if it helps explain intake. [R] Do not connect real chats or channels, or imply that one person's consent covers everyone in a conversation.

## How it works

[V] Listing a chat's messages uses delegated `Chat.Read`; an application option is resource-specific `ChatMessage.Read.Chat`. Personal Microsoft accounts are not supported for this method. https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0

[V] Channel message listing uses delegated `ChannelMessage.Read.All`; application `ChannelMessage.Read.Group` uses resource-specific consent. Listing root messages does not automatically include every reply. This method is documented for US Government L5. https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0

[R] These are distinct authorization designs, not interchangeable scopes. Confirm tenant app policy and resource-specific consent availability before selecting one. Files referenced by a thread need their own authorized file retrieval path; message access is not a blanket file grant. Meeting recordings and transcripts are separate, larger connectors outside this research recommendation.

## What the user sees

[R] A later user chooses an approved team/channel or chat and a short period, selects records and previews the extracted requests with source references. Clearly distinguish a draft request from a posted Teams message. Keep posting, membership changes, broad history search and attachment fetching disabled in the import-only design.

## Navy approvals and event rule 4

[R] Require Teams application-policy approval, tenant permission approval, appropriate team/chat resource approval and the common processing-boundary review. Do not assume that a team owner can override tenant policy or authorize external AI processing. Navy tenant support remains not verified.

[R] Conversation membership, names, mentions, attachments and routine-looking exchanges may reveal personal data or sensitive government activity. Third-party content can contain instructions intended to manipulate an importer. Selected-thread retrieval still copies other people's content. No real Teams messages or screenshots belong in the event demo.

## Thursday and post-event

[R] Thursday: a local invented thread with synthetic participant IDs, three records and one ignored instruction demonstrates the proposed selection flow. Say "Synthetic Teams-style example. No account connected. No posts sent." No tenant or network API is required.

[R] Post-event: choose one channel or chat design, obtain the actual grants, verify outside-resource denial and revocation, and test replies, edits and deletions before claiming complete context. Separate imported snapshots from live sync or retention compliance.

## Build size and evidence

[A] Estimate: 4 to 7 engineer-days after shared Graph auth for one message surface, provisioning, paging and reviewed extraction. Include more time for files, meetings or multiple consent models. Tenant approval time is excluded. No Teams API or conversation was accessed.

## Sources

- [V] https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0
- [V] https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0
