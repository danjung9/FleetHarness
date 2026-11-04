---
name: fleet-workflows
description: Build versioned records, queues and review-routing applications for FleetHarness administrative workflows, preserving source lineage and release authority.
---

# Reviewed records and workflow

Define record IDs, revisions, roles and allowed transitions before UI. Keep drafts, reviewed records and released records distinct. Revising approved content invalidates its old approval. Record the approving actor, decision, revision digest and time without treating a user-entered name as strong authentication.

For CASREP and official-message projects, model amendments, cancellation, expiry and supersession. A local export is not an official release. For requirements management, preserve the requirement's history and rejected proposals. For PA planning, make the operation the parent record linking resources, inquiries and products.

Challenge 41 specifically targets existing Navy Microsoft 365 licensing; a standalone web prototype demonstrates flow but does not establish platform compliance. Challenge 48 must remain useful without AI or connectivity and should support a printable workflow, separating facts, assumptions, authority and reassessment triggers.

Use `fleet_reconcile_records` for fixture-level revision merging, then implement persistence and role enforcement in the app. Test invalid transitions, concurrent edits, stale approvals and a full review-return-revise-export journey. Avoid including real personnel or medical information in synthetic queue examples.
