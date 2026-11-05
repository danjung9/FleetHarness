---
version: 1
slug: "src-connectors-tsx"
primary_target: "src/Connectors.tsx"
related_targets: ["src/connectors.css", "src/App.tsx", "src/styles.css"]
---

# Connectors

Mode: Operate. Scope: a frontend-only connector catalog in the global navigation, prominently featuring MSS Ontology, Google Calendar, and Gmail alongside other planned services.

## Direction contract

THESIS: Make available connector categories and planned setup clear. Give MSS Ontology the leading position, followed by a scannable service list.

OWN-WORLD: Inherit the current dark olive surfaces, ivory text, peach accent, DM Serif Display headings, DM Sans interface text, fine dividers, and compact controls. Use shared primary, secondary, input, and focus styles.

STORY: Enter Connectors from the persistent rail, browse eight services, narrow them by search or category, and open MSS Ontology at https://mss.data.mil in a new browser tab. Other services reveal local setup notices. The page states that no accounts are connected and setup is coming soon.

FIRST VIEWPORT: A serif title and account status sit above search, category filtering, and result count. A bordered MSS Ontology feature contains objects, relationships, properties, and the primary action; Google Calendar and Gmail lead the divided rows below.

FORM: A bounded catalog with one featured service and responsive rows. The feature wraps below 1000px; below 600px search spans the toolbar, row metadata and actions stack, and the featured action fills its width. Local extension; no concept seed applies.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Behavior and boundaries

Search, category filtering, result counts, clear-filter actions, and dismissible setup notices use component-local state. The MSS Ontology action is a standard external link to https://mss.data.mil with a new-tab indicator and noopener/noreferrer. The desktop shell opens this exact HTTPS destination in the system browser while continuing to deny new in-app windows and navigation. Other connect actions only reveal notices: no credentials, authorization, service API calls, connector persistence, sync, or successful-connection state are implemented. Empty results provide a clear recovery action. This follows PRODUCT.md's requirement to show accurate setup states for absent integrations.

## Incumbent comparison

`src/connectors.css` reuses the current `src/styles.css` palette and controls: olive-black ground, dark paper, peach accent, serif headings, small rounded controls, and flat divided lists. These preserve the documented typography and compact operational hierarchy. Global navigation and the workspace header remain the entry and orientation points.

`DESIGN.md` and `.impeccable/design.json` still describe the earlier navy, white, and gold palette; DESIGN.md also records an older rail and no mobile layout. This is pre-existing drift from the current shared stylesheet, not a connector-specific system change. The root design files and PRODUCT.md remain unchanged; obsolete values are not promoted into this surface.

## Finish review

Disposition: **ship** for the frontend catalog scope. Evidence: `.impeccable/review/connectors/desktop.png`, `minimum.png`, `mobile.png`, and `mobile-services.png` show the feature hierarchy, persistent navigation, compact desktop rows, and stacked mobile rows. Type checking and the frontend production build passed in the implementation handoff. No live connector tests were run, as requested; operational connectivity is outside this delivery.
