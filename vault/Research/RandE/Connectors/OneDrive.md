---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "OneDrive can supply a chosen work file, but an app-side picker does not itself narrow the grant."
---

# OneDrive files

## Bottom line

[R] One chosen file is a sensible first Microsoft data pilot after the event. [V] Graph can download a file's primary content stream through its drive item ID. https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0 [R] Use a synthetic local copy for Thursday. [R] A picker alone must not be described as a file-specific security boundary.

## How it works

[V] The content endpoint's least delegated permission is `Files.Read`; its listed application alternative is `Files.Read.All`. The method is documented for US Government L5. https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0 [R] Prefer delegated reads for a user-driven pilot. A broad read grant can exceed the item chosen in the app, so disclose both the grant and the retrieval limit.

[V] Microsoft also documents Selected permissions with separate resource assignments. https://learn.microsoft.com/en-us/graph/permissions-selected-overview [R] Evaluate those with the tenant owner for the exact business drive and endpoints instead of assuming all OneDrive account types and pickers have identical support. See [[Research/RandE/Connectors/SharePoint]] for the grant model. Avoid broad application access just to simplify a demo.

[R] Download one permitted CSV, text file or supported workbook into a bounded import pipeline, not into the generated source tree. Treat temporary download URLs as sensitive and keep them out of logs and prompts. Apply type, size, content and redirect checks before processing.

## What the user sees

[R] "Choose a work file" opens an approved file-selection experience, followed by a field preview. Show organization, source timestamp and "Imported copy, changes do not sync". If download is blocked, retain the draft and explain that the organization controls access. An alternative local-file option should not instruct users to export government data into the event environment.

## Navy approvals and event rule 4

[R] Obtain tenant consent, file-owner permission and a reviewed processing boundary, including local caching and any model destination. Use the actual national cloud configuration in [[Research/RandE/Connectors/Flank-Speed-Entra]]. Selected access does not remove data-handling review.

[R] A work drive may contain nonpublic government documents, personal information, embedded objects and hidden workbook content. For the event, choose only an invented local file. Do not browse real work-drive names during a demo or inherit an existing personal browser session.

## Thursday and post-event

[R] Thursday: a local synthetic CSV demonstrates the useful import without OneDrive authorization. A mock source card must say that no OneDrive account is connected. Post-event: pilot one authorized file type and resource, then test unselected-resource denial, source changes, permission revocation and temporary-file removal. No sync or write-back in the first pilot.

## Build size and evidence

[A] Estimate: 2 to 4 engineer-days for selection, bounded download, parsing and error handling after shared Graph auth. Add file-format work separately. Approval and picker availability in the target tenant are not estimated. No OneDrive connection was tested.

## Sources

- [V] https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0
- [V] https://learn.microsoft.com/en-us/graph/permissions-selected-overview

