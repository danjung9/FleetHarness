---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Use resource-selected SharePoint access after tenant approval; demonstrate local synthetic files now."
---

# SharePoint documents and lists

## Bottom line

[R] A single approved library, list or file is a better post-event boundary than tenant-wide SharePoint search. [V] Microsoft's Selected permission model supports scoped resource assignments in addition to Entra consent. https://learn.microsoft.com/en-us/graph/permissions-selected-overview [R] A user choosing a site in the interface does not itself enforce that boundary. [R] Thursday should use a synthetic local document or list snapshot.

## How it works

[V] `Sites.Selected` and finer Selected scopes require consent, an explicit resource grant and a token carrying the scope. A `read` role allows metadata and content reads. Delegated access intersects user permissions with app permissions. File/list-level assignments can break permission inheritance; site-level assignments do not. https://learn.microsoft.com/en-us/graph/permissions-selected-overview

[R] Ask the tenant owner whether site-selected or finer file/list permissions fit the approved workflow and target cloud. An administrator or authorized resource-permission service performs provisioning, not the ordinary import user. Never give the importer tenant-wide permission-management access simply so it can grant itself a site.

[R] Treat document libraries and structured lists as different adapters. A file download feeds the file parser; a list query maps approved columns into the task schema. For each, allowlist resource IDs, cap retrieval and reject unsupported content. Confirm national-cloud support method by method before committing to a Navy deployment.

## What the user sees

[R] Show only pre-approved sources with plain names. The person chooses one document or list, sees selected fields and a source timestamp, then confirms an imported snapshot. A missing grant becomes "This source has not been approved for this app". Avoid asking a non-technical user to paste site IDs or change permissions.

## Navy approvals and event rule 4

[R] Obtain tenant app consent, the explicit resource assignment, site/list owner's agreement and the authorization-boundary review in [[Research/RandE/Connectors/README]]. The security team must evaluate inherited labels, retention, sharing, local copies and any external inference. The exact Navy provisioning process is not verified.

[R] A single library can still hold sensitive personnel, readiness, maintenance or nonpublic policy information. Hidden columns, document comments and embedded workbook sheets may exceed the intended data contract. Do not browse or copy a real Navy SharePoint library at this event. Resource scoping controls access, not rule 4 eligibility.

## Thursday and post-event

[R] Thursday: show an invented CSV list snapshot or plain-text instruction file with a synthetic source card. It must say "No SharePoint connection". Do not claim authentication, live list retrieval or synchronization.

[R] Post-event: configure one approved resource, prove access fails for a second resource, revoke the assignment and verify it blocks new reads. Test permission inheritance consequences before fine-grained rollout. Retention and removal of already imported copies need their own procedure.

## Build size and evidence

[A] Estimate: 3 to 5 engineer-days for one selected-site library or list adapter after shared Graph auth and administrator provisioning. Finer-grained permission provisioning and multiple list schemas add work. Approval duration is unknown. No SharePoint site, list or resource grant was accessed or created.

## Sources

- [V] https://learn.microsoft.com/en-us/graph/permissions-selected-overview
- [V] https://learn.microsoft.com/en-us/graph/deployments

