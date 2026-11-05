# Connector core

All seven cards have working sample data with no sign-in, keychain setup or network request. Use Connectors, Try sample data, Check it and Use this. Select saved sources in the brief before starting a build. The activity log names the sources used.

The desktop host enables the installed adapters. Connect opens the normal browser, displays a sign-in code when needed, and asks the adapter's questions on the card. Secret answers use password fields, leave the renderer immediately after submission, and are never returned by IPC. The person can cancel during sign-in, a question, or a fetch. Successful sign-in opens Choose what to include; Check data fetches through the real adapter and shows the same sanitized preview as samples. Use this freezes that preview.

Real connections can be previewed and saved locally. Builds for this event still accept synthetic snapshots only. The brief explains that real previews are unavailable for an event build, and the host enforces the same boundary before writing workspace files. No real mailbox was connected in this work. This change does not add agent file or network isolation.

## Integration

`electron/connectors/types.ts` is unchanged. `ConnectorService.register(adapter)` accepts its existing interface. The main process supplies host configuration to `registerInstalledAdapters()` for the following installed exports:

| Module | Exports |
| --- | --- |
| google.ts | GmailConnector, GoogleCalendarConnector, GoogleDriveConnector |
| microsoft.ts | OutlookConnector, OutlookCalendarConnector, OneDriveConnector |
| custom-api.ts | CustomApiConnector |

The compiler includes connector files explicitly. Production client IDs come from administrator-supplied environment variables documented in connectors.md. A missing registration disables Connect and shows an administrator message; sample data remains available. The custom service card accepts an address or documentation link and follows the adapter's discovery, internal-address confirmation and key questions. IPC exposes list, connect, progress, answer, preview, use, cancel and disconnect. It exposes no secret reader, stored token, key, provider URL override or account identity.

`ConnectorStore` keeps encrypted per-connection secret values separate from sanitized snapshots. Production passes Electron `safeStorage`. It refuses unavailable encryption and Linux basic-text storage. No secret getters are exposed to the renderer. IPC uses the existing main-frame sender check and replaces internal error details with one plain failure and next step.

## Snapshot and build

Preview content is held in memory until Use this. Marked items are excluded before size limiting or redaction. Email addresses, phone numbers and SSN-shaped numbers are hidden. Senders are hidden; names elsewhere in prose are not recognized and the screen makes no promise that they are. Remote source URLs and provider-specific fields are omitted.

The brief records connection ID, snapshot digest and an include-in-app choice that defaults to false. Sample data is always included. Host preparation reads approved disk snapshots, never adapters, and writes one JSON file per source plus context/README.md. Requirements and activity identify the chosen data. The brief hash includes snapshot selection and digest. A checkpoint also hashes every context file, including the README; changes, missing files, extra files and symlinks fail subsequent stages or resume.

Real-account snapshots are refused before workspace writes, regardless of include-in-app choice. Consequently real data cannot reach this event build or its source export. The source exporter already copies and verifies sample context. Live data-service delivery, its browser key prompt and its helper belong to the separate data-service work and are not claimed here.

Connection records contain only ID, kind and whether the source is a built-in sample. Credentials and custom-service addresses are encrypted separately. Saved sign-ins survive restart and can fetch again without repeating questions. A snapshot's synthetic flag is separate from its connection type: local fixture snapshots still use the real adapter on the next fetch. Disconnect removes the saved connection, secrets and snapshots, and revokes account access where supported. Reconnecting an account revokes its old grant before issuing new credentials. Choosing Use this on sample data replaces that card's saved connection.

Frozen sample copies in existing build workspaces remain evidence for those builds. Stop checks the existing build cancellation signal during context preparation and removes incomplete context. Quit waits for pending connector work and writes as well as existing backend and delivery cleanup. Source data carries no permission to send messages, open links or run commands.

With no selected connector, preparation does not call the connector store, add a checkpoint field, change the brief hash or insert an extra asynchronous context check. The checkpoint survives a JSON round trip with the same shape as before.

## Verification

Run `npm run build`, then `node --test tests/connectors-core.test.mjs`.

Outside the restricted sandbox, run `node scripts/smoke-connectors.mjs`. It uses the actual Electron screen and IPC for all seven sample cards, service discovery and a secret question against the local data-service server, and Google and Microsoft sign-in against the fake provider. It opens the actual system browser and checks the provider's authorization proof. It cancels a secret question, restarts Electron, fetches using saved credentials, forces token refresh, and verifies disconnect removal. The existing local fixture provider supplies model responses for a build containing both built-in samples and synthetic data fetched through real adapters. It requires review from the full native pipeline, checks exact workspace snapshots, requirements and activity, exercises native safeStorage and scans saved state, logs and workspace files for distinctive fake credentials. Files named auth.json are never opened. It does not replace process discovery, sandbox-exec, browser opening or browser verification. A receipt is written only after all checks pass.

The fake endpoint seam is host-only in config.ts: the app must be unpackaged, NODE_ENV must be test, and APPYARD_CONNECTOR_TEST_MODE must equal 1. APPYARD_CONNECTOR_TEST_SERVERS supplies JSON with accounts and dataService loopback HTTP origins. Saved settings and renderer requests cannot enable it. Packaged apps ignore even malformed test configuration. Only data fetched from those explicit local fixtures can be marked synthetic by this seam. The smoke sets these values and uses isolated state under output/.

If OS secure storage is unavailable in that same fixture mode, config.ts supplies an explicit AES-256-GCM test encryptor. The smoke runner generates an ephemeral key in memory and passes it as APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY across its app restarts. No key file is written. The host removes that environment variable before starting build children. Available OS secure storage takes precedence; packaged apps and ordinary production configuration never select the fallback. Without secure storage they refuse Connect with "Secure storage is unavailable. Use sample data." Samples still work.

The separate connector-native-check.mjs always uses native safeStorage, with no fallback. Only its exact unavailable-storage result with exit code 1 is recorded as not exercised, with a printed explanation. All other failures, missing results, abnormal exits or failed encryption assertions fail the smoke. Fixture encryption does not count as native keychain evidence. Core tests cover both configuration guards and real adapter flows using the fallback, including plaintext leak checks on disk.

The unit suite uses real sample and account/service adapters, local HTTP, authorization callbacks, refresh, sanitizer, disk storage, context writing and source copying. Core integration tests substitute Node authenticated encryption for native safeStorage and a local HTTP opener for the system browser; these are not native keychain or browser proof. The cancellation-during-read test injects cancellation at that boundary; it is not native process shutdown proof. No live model or real account call is part of these checks.
