---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan for readable version history and explicit, non-destructive recovery."
---

# 09: Compare versions and recover without losing work

## Bottom line

[R] Show what changed between the last accepted tool and a new draft. [R] Let the person open an earlier version before choosing it. [E] Preserving run folders is already described in FleetHarness, but the shared Project contract does not expose a complete user-facing version history. [R] Add that contract before promising Undo or Resume.

## User's problem

[A] A new build may improve one feature and break another. A noncoding sponsor cannot inspect source diffs or know whether returning to an old app also changes saved task records.

## Exactly what they see and click

[R] Add Versions to the existing task workspace. Each row has a date, request summary, checks, human review state and Open preview. The current accepted version and the proposed revision are visibly different.

[R] Click Compare beside a new revision. Show a small before/after preview and a plain list: labels changed, behavior requested, checks rerun, unresolved differences. Describe only changes supported by evidence. Click Open previous version to inspect it without changing the current one.

[R] Click Use as new draft to copy the chosen artifact into a new revision, keeping both old and current versions. Show explicitly whether saved task records are unaffected, compatible or require a reviewed conversion. Require fresh checks and review before replacing the active prototype. Cancel leaves everything intact.

## How we would know it worked

[R] Introduce an intentionally failing revision. Recover the previously accepted artifact, check its digest and confirm the failed revision remains inspectable. Test a schema mismatch without data loss. The user must predict whether their saved draft changes before confirming recovery. Restoring files must not fabricate a new test pass or approval.

## Build size

[A] Large: 6 to 12 person-hours for version metadata, immutable snapshots, a simple comparison and recovery checks. Automatic data migration and collaborative branching are excluded. [R] Thursday rank 8, defer; after-event rank 8, before card 08.

## Backend needs

[R] Persist version ID, parent ID, artifact digest, request snapshot, check record, review scope and data-schema compatibility. Add list/open/copy-version operations with atomic updates. Current run metadata must remain linked to its own artifacts. Do not overwrite live workspaces or make two interfaces share a store as a shortcut.

## Dan's frontend

[R] Yes, proposal for Dan, one version list and comparison view inside the chosen renderer. No full UI merger is needed. Use plain difference summaries and optional technical details, not a source-diff screen as the officer's main view.

## Sources

- [V] Documented checkpoints and timelines: https://docs.replit.com/replit-workspace/workspace-features/version-control
- [V] Preview before restoring a version: https://support.bolt.new/building/quickstart
- [E] 50fcaea: shared/types.ts Project, src/App.tsx start disclosure, src/studio/Studio.tsx brief/save notices and src/workbench/BuildWorkspace.tsx.

