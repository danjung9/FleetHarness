---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Ranked connector choices, synthetic Thursday scope and approval gates for a later Navy pilot."
---

# Bringing work into FleetHarness

## Bottom line

[R] Build a fixed-schema synthetic CSV import and a bounded local file chooser first. [R] Use invented calendar rows for the training draft; show any mailbox or Teams experience as an explicitly labeled local fixture. [E] FleetHarness has a Codex/ChatGPT model-account path, unchanged by the final `631849f` teammate update, which removes Studio and Workbench. [R] Keep live work-data connections on a post-event path with tenant, data-owner and system authorization review. [P] Real mailboxes and real messages must never be used at this event.

## Ranking

[R] This is implementation priority for the current synthetic training task, not a ranking of long-term Navy value. Authentication and deployment rows are enabling work, not data importers. The Flank Speed review is a prerequisite for any Navy tenant integration, wherever its row appears.

[A] Estimates below assume one engineer familiar with the app, eight hours per engineer-day and an existing editable task draft. They include narrow failure/acceptance work, exclude approval waits and are not delivery commitments. API adapters assume the named shared authentication layer already exists. Estimates overlap and must not be summed as independent projects.

| Priority | Note | Thursday disposition | Post-event path | Rough build size [A] |
| --- | --- | --- | --- | --- |
| [R] 1 | [[Research/RandE/Connectors/CSV-import]] | First proposed implementation: one synthetic template and reviewed preview | Confirm actual export schema and allowed transfer | 4 to 8 hours |
| [R] 2 | [[Research/RandE/Connectors/File-drop]] | New bounded text/JSON selection; prior alternate-interface import was removed | Add only needed document formats | 4 to 8 hours for basic selection; richer formats add days |
| [R] 3 | [[Research/RandE/Connectors/Spreadsheet-import]] | Use a newly created synthetic sheet exported as CSV | Pick local `.xlsx`, chosen-file Sheets or Excel API after permission review | CSV reuse; native workbook adds 1 to 3 days |
| [R] 4 | [[Research/RandE/Connectors/Calendars]] | Invented CSV schedule; limited `.ics` optional | Approved availability/read adapter before publication or sync | CSV mapping 4 to 8 hours; limited `.ics` 1 to 2 days |
| [R] 5 | [[Research/RandE/Connectors/ChatGPT-sign-in]] | Verify/reuse existing model-access path if separately authorized; no data import | Confirm distribution path, storage, account and provider controls | Existing-path QA 2 to 4 hours; hardening 1 to 3 days |
| [R] 6 | [[Research/RandE/Connectors/OAuth-sign-in]] | No new identity provider needed for local imports | One approved identity provider if shared ownership requires it | 2 to 4 days per provider |
| [R] 7 | [[Research/RandE/Connectors/Flank-Speed-Entra]] | Explain only; no Navy tenant sign-in | Sponsor, cloud, tenant, endpoint and authorization decisions before integration | 2 to 5 technical days after shared auth; approval time unknown |
| [R] 8 | [[Research/RandE/Connectors/Microsoft-365-Graph]] | Fixture only if needed to explain future workflow | Shared cloud-aware connection layer | 2 to 4 days, plus service adapters |
| [R] 9 | [[Research/RandE/Connectors/OneDrive]] | Synthetic local copy with an honest source label | One selected work-file import | 2 to 4 days after Graph auth |
| [R] 10 | [[Research/RandE/Connectors/SharePoint]] | Synthetic list/document snapshot | One explicitly granted site/list/file | 3 to 5 days after Graph auth/provisioning |
| [R] 11 | [[Research/RandE/Connectors/Google-Drive]] | Local synthetic download; picker mock optional | Chosen-file grant in an approved Workspace environment | 2 to 4 days after Google auth |
| [R] 12 | [[Research/RandE/Connectors/Outlook-mail]] | Local invented mailbox fixture only, no account | Bounded delegated reads in an approved environment | Fixture 4 to 8 hours; adapter 2 to 4 days after Graph auth |
| [R] 13 | [[Research/RandE/Connectors/Teams]] | Invented thread fixture only | One approved channel or chat consent model | 4 to 7 days after Graph auth |
| [R] 14 | [[Research/RandE/Connectors/Gmail]] | Local invented mailbox fixture only, no account | Restricted-scope verification and approved test environment | Fixture 4 to 8 hours; adapter 3 to 5 days after Google auth |
| [R] 15 | [[Research/RandE/Connectors/MCP-connectors]] | Optional local synthetic read server only after task acceptance | One approved server and downstream connector | Local fixture 1 to 2 days; protected remote path 5 to 10 days plus adapter |

[R] Do not add all these choices to the officer interface. Default to "Use synthetic example" or "Choose a file". Place approved online sources in a later, organization-managed connection menu. The officer should choose their task and source, not an identity framework or protocol.

## What exists, what is proposed and what was checked

- [E] Initial source baseline: `50fcaea1e86028503ae66bd2f17287093ad30cbe`, read using Git objects. Final relay adaptation: `631849f638614735a89a555d487d6b3c777c52e3`, which removes Studio/Workbench and keeps one interface. The checked-out HEAD was initially `0f175a8`, so this review used pinned Git objects rather than working-tree source.
- [E] `electron/codex-account.ts` and `electron/codex-rpc.ts` implement model-account login, cancellation, refresh and logout through bundled Codex. This is not a mailbox, Drive or ChatGPT-history import.
- [E] Historical `50fcaea` Studio/Workbench source contained saved brief/request JSON import with validation. Both renderers are deleted in `631849f`. A targeted search of retained `src/App.tsx` found no file-input or file-text-read matches. A new CSV/file importer remains proposed work, not a current capability.
- [E] The named reports folder's `mvp-gate.md` first reported 128 tests passed at `50fcaea`, then 128 passed at `631849f` at 14:42:27. This seat read the reports and test source; it did not execute tests, inspect the referenced gate logs, sign in, install packages or run any connector.
- [E] The older [[Research/Plan/Test-Results]] covers earlier commits and explicitly distinguishes scripted providers from live inference. Neither report establishes live enterprise authentication or data import.
- [E] Public primary documentation was checked on November 4, 2026. API permission claims are documented behavior, not observed tenant capabilities. Where retrieval failed or only a search excerpt was available, the note says so.
- [A] No current Navy tenant consent policy, application onboarding procedure, approved model destination or authorization decision was verified. Build estimates are judgments, not measured implementation times.

## Two different places to bring work in

[P] The project README describes FleetHarness as a software development system, not a mandatory runtime for every generated app. [R] A build brief belongs in the factory and may enter model context. Scheduling rows, selected documents and messages usually belong in the delivered task application's data layer. Do not send task data into the coding pipeline just because the factory has an account connection.

[R] For Thursday, prefer this flow: synthetic file, local parser, explicit field preview, validated task state, human-reviewed draft, local save/export. Any external model processing must be separately visible and within event authorization. Never include connector tokens, account caches or authenticated source URLs in the app export.

[R] A post-event online task app needs its own approved client/service, deployment configuration and authorization boundary. The factory's ChatGPT account cannot supply Microsoft/Google permissions, and its model credentials must not be handed to generated applications. Browser-only HTML should use an approved service or native host for secrets, not embed a shared client secret.

## Thursday demonstration contract

[R] Use [[Research/Plan/Plan]] and [[Research/Plan/Findings]] as the task scope. The proposed primary demonstration is four invented training requests, not live inbox triage. This research supplies decisions and acceptance ideas, not an implemented demo or changed product code.

1. [R] Show "Synthetic example data" before selecting anything. Use invented IDs, rooms, qualifications and event times, with no real names, organization rosters or copied messages.
2. [R] Choose the fixed-format file and preview row counts, errors and exact fields. Explain whether the bytes remain local. Cancel must preserve the old draft.
3. [R] Accept the valid rows, change one event and show a new deterministic conflict/result. Require a fresh review after changes.
4. [R] Save, close and reopen the draft. Repeat with network disabled before claiming offline behavior. Export and manual transfer are not synchronization.
5. [R] If showing mail, use only a bundled invented dataset. Label "Synthetic mailbox. No account connected. No messages sent." Simulate permission denial and malicious instructions without contacting a mail API.
6. [R] Capture which artifact and source revision were actually exercised, actual results and remaining limits. Never record tokens, authentication URLs, account emails or real file paths containing personal data in demo evidence.

[R] No live Outlook/Gmail mailbox, personal test mailbox, real message export, actual Teams conversation, government calendar or Navy work-drive browsing at this event. A fixture is not a successful network integration. A sign-in demo is not evidence that data use is authorized.

## Common Navy approval gates

[V] Entra administrators control the consent workflow; this is an application-permission decision. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow [V] RMF authorization separately involves a senior official's acceptance of system security and privacy risk. https://csrc.nist.gov/Projects/risk-management/about-rmf/authorize-step [R] The following is a proposed review sequence, not a verified Navy onboarding procedure or a claim that a new ATO is universally required.

| Gate | Who must settle it | Evidence before an authorized pilot [R] |
| --- | --- | --- |
| [R] Mission and data | Mission sponsor and resource/data owner | Named purpose, allowed fields, data category, source permission and exclusions |
| [R] Identity and resource access | Tenant/service administrators and relevant source owner | Correct cloud, registered app, exact grants, allowed users/resources, consent and denial evidence |
| [R] Application authorization | System owner, security team and responsible authorizing authority | Determination of existing versus changed authorization boundary, deployment/endpoint requirements and acceptable risk |
| [R] External processing and storage | Data owner, security/privacy/records roles as applicable | Approved model destination, network routes, retention, local caches, logs and exported artifacts |
| [R] Operation and support | Designated operational/technical owner roles, not invented named people | Monitoring, incident route, revoke/disconnect procedure, updates and shutdown demonstration |

[R] Platform IL5/FedRAMP claims, Microsoft consent, Google verification, MCP compatibility, a successful login and the event's permission to experiment are different facts. None should be substituted for the app's actual authorized data flow. Production approval does not relax event rule 4.

## Controls every proposed importer needs

| Control | Required behavior [R] |
| --- | --- |
| [R] Approval | Select a bounded source, preview exact fields and destination, then explicitly accept the import. New permissions and writes require separate review. |
| [R] Prohibited actions | No sends, posts, deletion, calendar publication, broad crawls, automatic attachment execution or arbitrary shell/network tools in an import-only feature. |
| [R] Monitoring | Show source, permitted operations, count, capture time and errors. Record minimal metadata without raw sensitive content or tokens. |
| [R] Data as data | Message text, file content, links and tool descriptions cannot expand permissions or instruct the app to call tools. Validate structured output against the task schema. |
| [R] Escalation | Stop on disallowed data, unexpected resource access or policy denial. Preserve only an appropriate minimal incident record and route to the approved owner; never retry through a personal account. |
| [R] Shutdown | Cancel reads, stop background jobs, disconnect and support administrator revocation. Treat deletion of cached imports separately; logout alone is not a retention policy. |

## Next decision

[R] Authorize implementation of only CSV plus a small new bounded file importer if it fits the accepted training app. Target the retained interface or delivered task app and respect frontend ownership; do not restore removed renderers. Reuse existing model-account work without treating it as data connectivity. Hold online connectors for a post-event pilot selected by an actual user and sponsor. Add a connector only when it supplies a necessary input that the simpler local workflow cannot meet.

## Sources

- [E] FleetHarness `50fcaea` with final adaptation to `631849f`, read-only source evidence specified in the connector notes.
- [E] [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Test-Results]].
- [E] `~/.local/share/fleethacker-context/org/reports/mvp-gate.md`, `feed-7.md`, `snapshot-7.md`.
- [E] `~/.local/share/fleethacker-context/org/relay/LATEST.md` and `LATEST-analysis.md`, read before completion.
- [P] [[Research/00-Brief]], assignment and provided event-rule constraints.
- [V] https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow
- [V] https://csrc.nist.gov/Projects/risk-management/about-rmf/authorize-step
- [V] Each connector note lists its direct primary sources and retrieval limitations.
