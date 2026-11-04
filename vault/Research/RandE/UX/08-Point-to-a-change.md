---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan for preview-based change requests that preserve review and version boundaries."
---

# 08: Point to what needs changing

## Bottom line

[R] Let a sponsor point at a confusing label or result and describe the desired change. [V] Lovable and Bolt document selection-based editing in their previews. [R] Begin with a reviewable change request, not direct unrestricted modification of an accepted app. [R] This is after-event work because reliable preview targeting and revision control are prerequisites.

## User's problem

[A] “Change the second field in that panel” is difficult to express without knowing UI or code terminology. The user can identify the confusing part visually but may not know how to describe it to a developer.

## Exactly what they see and click

[R] In Try your tool, click Suggest a change. A border indicates selection mode. Click a visible element, such as the heading Start, and see a side panel: Selected text: Start; Proposed change: [editable text box]. Enter Rename this to Earliest permitted start.

[R] Click Review change to see the target, requested behavior, affected version and checks to rerun. Click Create draft revision only after confirming. Keep the accepted version available beside the new draft. When checks finish, Compare versions leads to card 09; it does not replace the accepted app automatically.

[R] Escape exits selection. Provide a keyboard-selectable list of labeled controls and a plain text route for behavior changes. A visual highlight must not intercept Stop or imply that the selected element identifies all affected logic. Changing data values in the task is a separate interaction from changing the software.

## How we would know it worked

[R] Test target selection across rerender, zoom and a renamed element. The saved request must bind to the intended artifact version; a stale target must require reselection. An attempted cross-frame message from an unrelated origin is rejected. A label edit must not change scheduling behavior. A failed revision cannot replace the accepted version or inherit its approval.

## Build size

[A] Large: 8 to 16 person-hours for limited text targeting, revision creation and focused isolation tests, assuming version storage exists. Freehand drawing, arbitrary DOM editing and a full page builder add substantial work and are excluded. [R] Thursday rank 9, cut; after-event rank 9.

## Backend needs

[R] A preview messaging contract with origin/run/version validation, stable element references or a generated element map, a version-bound change request, immutable starting snapshot, regeneration and acceptance invalidation. FleetAPI currently has no element-edit operation. Preserve iframe isolation; do not enable direct code execution from a selection event. Card 09 is a dependency.

## Dan's frontend

[R] Yes, a significant proposal for Dan, not permission to add an overlay now. He owns selection affordances and the review panel. Backend owner controls revision creation and checks. Start with a low-fidelity trial before committing this build size.

## Sources

- [V] Pointing and editing in preview: https://docs.lovable.dev/features/preview-toolbar
- [V] Selector interaction: https://support.bolt.new/building/quickstart
- [E] 50fcaea: preview iframes in src/App.tsx, src/studio/Studio.tsx and src/workbench/BuildWorkspace.tsx; FleetAPI in shared/types.ts.

