---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Investigate the existing Microsoft path, but verify each Copilot capability in the actual government tenant."
---

# Microsoft Power Apps with Copilot

## Bottom line

[R] Investigate Power Apps before proposing another staff workflow platform. [P] The assignment identifies Flank Speed as the staff's Microsoft 365 environment; it does not establish a particular user's Power Apps or Copilot entitlement. [V] Microsoft documents government Power Apps environments, while a separate availability table marks Build apps through conversation unavailable in GCC (https://learn.microsoft.com/en-us/power-platform/admin/powerapps-us-government, https://learn.microsoft.com/en-us/power-platform/admin/geographical-availability-copilot). [R] Verify the exact feature, tenant, license and environment with the administrator before promising Copilot app creation in Flank Speed.

## The first ten minutes

[E] Public-documentation script, reviewed November 4, 2026; no tenant was accessed. [A] The Copilot path below assumes an approved environment, Dataverse and appropriate maker permissions. It is not a claim that the feature is available in a Navy tenant.

1. [R] Minute 0 to 2: personally open the organization's approved Power Apps maker URL, select the intended environment and inspect available creation options. Do not move work to a commercial tenant to bypass a missing feature.
2. [R] Minute 2 to 3: if permitted and available, choose Start with data, then Create new data. Otherwise record the missing capability and use an administrator-approved template as the fallback.
3. [R] Minute 3 to 5: describe a synthetic training-room request table with request ID, room, start, end and approval state. Ask for six fictional rows. Check column types and relationships before saving.
4. [R] Minute 5 to 7: use the Copilot panel to correct a field or relationship. Create the canvas app from the reviewed tables.
5. [R] Minute 7 to 9: Preview, create a request and reload. Test two overlapping times. Do not assume a generated form implements conflict detection.
6. [R] Minute 9 to 10: inspect app sharing and datasource access separately. Record whether an ordinary test user could run it, and leave publishing or tenant configuration changes for authorized review.

[V] The documented conversational creation flow generates Dataverse tables, relationships and sample data before opening a canvas app. Prerequisites include a Dataverse database, region availability and System Customizer permissions (https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/ai-conversations-create-app).

## How it decides and asks

[V] Microsoft's transparency note says the feature proposes tables, columns, types and fictional rows from the user's description; users can revise the generated structure conversationally (https://learn.microsoft.com/ga-ie/power-apps/maker/common/transparency-note-build-apps-conversation). [R] Make schema review a plain-language question: Can one request use two rooms? Can an approval be revoked? Do not ask an officer to select database architecture.

[A] An obligatory interview about mission constraints was not verified. [R] Add a FleetHarness requirements card that stays independent of the maker interface.

## Data, login and government boundary

[V] Power Apps US Government has GCC, GCC High and DoD variants, with different service endpoints and documented feature exceptions. Microsoft describes customer-content segregation from commercial services (https://learn.microsoft.com/en-us/power-platform/admin/powerapps-us-government). [R] Match the actual tenant and feature availability; a statement about Microsoft 365 Copilot is not evidence about Power Apps maker Copilot.

[R] Confirm Entra identity configuration, app sharing, Dataverse roles and connector permissions with the tenant owner. Use separate maker and test-user identities. [A] This seat did not verify Flank Speed licensing, DLP policies, connector allowlists, CAC behavior, conditional access or selected AI data movement. None should be inferred from a Microsoft logo.

## Checking and where apps get difficult

[R] Test with enough synthetic records to reveal filtering limits, two user roles, a failed connector and two concurrent edits. Count persisted records, not the number of cards visible on screen. Have an owner review formulas, data permissions and solution deployment.

[R] A generated CRUD form is a useful starting point for staff tracking. A schedule optimizer, accountable approval chain or offline sync workflow needs explicit implementation and acceptance tests. Require the app to show unsynchronized changes and conflicts.

## Security incidents and independent evidence

[V] Independent security research by UpGuard, published August 23, 2021, reported 38 million exposed records across Power Apps portals through anonymous list access and permission configurations. This concerned portals, not a demonstrated flaw in today's Copilot-generated canvas apps or a breach of Flank Speed (https://www.upguard.com/breaches/power-apps). [R] Borrow the lesson: test anonymous and ordinary-user access to every data surface, including APIs.

[A] A controlled independent evaluation of current Copilot app generation in Navy government tenants was not verified. Microsoft's own testing statements are vendor claims, not such an evaluation.

## Export, offline and price

[A] Full standalone source export and runtime independence from Power Platform were not verified. [R] Treat movement of a platform solution as different from delivery of an independently runnable application.

[V] Dataverse-backed canvas apps support configured offline-first operation in native Power Apps Mobile players on iOS, Android and Windows. Initial synchronization requires connectivity; profiles control local data, and reconnection triggers synchronization. This does not imply ordinary browser apps work offline (https://learn.microsoft.com/en-us/power-apps/mobile/canvas-mobile-offline-overview, https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/offline-apps). [A] Availability and device policy in the team's target government environment remain unverified.

[V] Microsoft's September 9, 2026 announcement lists Premium at $20 per user monthly before January 1, 2027, increasing to $22, with annual-billing list prices and government-specific limits on increases (https://www.microsoft.com/en-us/licensing/news/power-apps-premium-price-update). [R] Check existing entitlements first; include every runtime user, premium connectors, capacity and tenant administration in the estimate.

## Sources

- [V] Government service: https://learn.microsoft.com/en-us/power-platform/admin/powerapps-us-government
- [V] Feature-level availability: https://learn.microsoft.com/en-us/power-platform/admin/geographical-availability-copilot
- [V] Creation flow: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/ai-conversations-create-app
- [V] AI transparency note: https://learn.microsoft.com/ga-ie/power-apps/maker/common/transparency-note-build-apps-conversation
- [V] Independent security investigation: https://www.upguard.com/breaches/power-apps
- [V] Offline architecture: https://learn.microsoft.com/en-us/power-apps/mobile/canvas-mobile-offline-overview
- [V] Offline clients: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/offline-apps
- [V] Price change: https://www.microsoft.com/en-us/licensing/news/power-apps-premium-price-update
