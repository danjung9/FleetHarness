---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A chosen-file Drive import is preferable to a broad crawl, with explicit grant limits."
---

# Google Drive

## Bottom line

[R] Prefer a chosen synthetic file over a Drive-wide connection. [V] Google recommends `drive.file` with a file picker to limit access to files the user shares with the app. https://developers.google.com/workspace/drive/api/guides/api-specific-auth [R] That scope can modify selected files, so an import-only interface must disclose the grant and enforce its own read-only behavior. [R] Thursday's reliable path is a synthetic file downloaded ahead of time and imported locally.

## How it works

[V] `drive.file` is non-sensitive and covers files created by, opened with or shared with the application. Broad `drive.readonly` is restricted. The Google Picker provides file selection but authorization still comes from the OAuth token. https://developers.google.com/workspace/drive/api/guides/api-specific-auth

[V] Binary files are downloaded with `files.get` and `alt=media`; native Workspace documents require an export into a supported format. Download capability should be checked before retrieving content. https://developers.google.com/workspace/drive/api/guides/manage-downloads [R] Use a format allowlist, size limits and one explicit selection. Do not recursively traverse folders or shared drives in the first version. Never turn a user's sharing settings public to avoid OAuth setup.

## What the user sees

[R] A future "Choose from Drive" action opens the approved Google account and picker. The app then shows file name, source version/time, format and fields about to enter the draft. The user can remove the selection or confirm. Clearly state "Imported copy" and whether any selected text will be sent to the configured model. The event UI should name a synthetic source and require no account.

## Navy approvals and event rule 4

[R] Confirm the approved Workspace environment, OAuth registration and verification requirements, administrator access controls, data-owner permission and complete processing boundary. Apply [[Research/RandE/Connectors/README]]. An event-provided Google environment would still need confirmation of its permitted use and contents; access was not verified here.

[R] Risks include other files visible in a real account's picker, shared-drive permissions, document comments, revision metadata and hidden spreadsheet tabs. Use only pre-created synthetic material. The import-only adapter must expose no update/delete tool even though the selected-file scope permits writes. Do not place account identity or sharing links in presentation evidence.

## Thursday and post-event

[R] Thursday: import the synthetic CSV or text file locally and label its provenance. If illustrating the Drive picker, use a labeled static mock. A live file-only demo would require the main session to first verify a dedicated approved synthetic-only workspace, account-owner sign-in and absence of personal data; it is outside the recommended deadline scope. No mailbox connection is involved or permitted.

[R] Post-event: implement one chosen-file import, verify that an unselected file is denied, demonstrate revoked access and disconnect, and check source changes before reimport. Separate reimport from synchronization. Keep generated application credentials separate from the factory's model account.

## Build size and evidence

[A] Estimate: 2 to 4 engineer-days for one Drive picker/import after Google auth; 2 to 4 additional days if authentication, secure storage and hosting for the picker also need building. Dedicated-account provisioning and approval waits are excluded. No Drive API call, account or picker was exercised.

## Sources

- [V] https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- [V] https://developers.google.com/workspace/drive/api/guides/manage-downloads

