---
name: fleet-offline
description: Build disconnected record workflows with durable local edits, idempotent reconciliation, explicit conflict resolution, and resumable priority-based transfer planning.
---

# Offline data and reconnect

Persist an edit before showing it as saved. A reconnect simulator should be labeled. A real adapter needs authenticated transport, receiver acknowledgements and a documented retention policy. Evaluate established replication technology before extending a bespoke protocol.

`fleet_reconcile_records` merges immutable revisions with `{id, recordId, parents, actor, value}`. Values are strings; `null` is a tombstone. IDs must be unique to an immutable operation. Missing parents, cross-record parents, cycles and ID/content collisions are errors. Keep the original local queue on an error and request missing history.

Two heads mean a conflict, including edit-versus-delete. Preserve both. Resolve by creating a new unique revision referencing every reviewed head and containing the reviewer's chosen value. Never pick a winner using device clocks. Retain the decision and actor in an application audit record; the fixture's actor string is not authentication.

`fleet_plan_uploads` plans bytes by caller-supplied priority, then age and ID. `uploadedBytes` means receiver-acknowledged bytes. Do not advance it after sending alone. Planned chunks do not constitute a transport or durability implementation. A zero-byte connection must retain pending work.

Test replay idempotence, opposite merge orders, concurrent edits, concurrent delete, missing history, resumable byte offsets and interrupted acknowledgements. Browser tests must separately prove reload persistence and the complete offline-to-reconnect journey. If the challenge requires encryption, use a validated device/key design and mark it unverified until demonstrated; do not call plain IndexedDB encrypted storage.
