# Connector core

All seven cards have working sample data with no sign-in, keychain setup or network request. Use Connectors, Try sample data, Check it and Use this. Select saved sources in the brief before starting a build. The activity log names the sources used.

The event profile keeps real account access off. Registering an adapter does not enable real account fetches. This is required by the synthetic-data restriction and by the existing Pi workspace, which does not provide the file and network isolation needed for real account data. This change does not claim to add that isolation.

## Integration

`electron/connectors/types.ts` is unchanged. `ConnectorService.register(adapter)` accepts its existing interface. The main process calls `registerInstalledAdapters()` to load the following optional exports when their files land:

| Module | Exports |
| --- | --- |
| google.ts | GmailConnector, GoogleCalendarConnector, GoogleDriveConnector |
| microsoft.ts | OutlookConnector, OutlookCalendarConnector, OneDriveConnector |
| custom-api.ts | CustomApiConnector |

The compiler includes connector files explicitly. Constructors receive their default configuration; no client IDs or credentials are invented. Future account activation needs the owning modules' configuration and person-owned sign-in flow, plus a reviewed environment that permits it. The current renderer and IPC expose sample preview, use, cancellation and disconnect only.

`ConnectorStore` keeps encrypted per-connection secret values separate from sanitized snapshots. Production passes Electron `safeStorage`. It refuses unavailable encryption and Linux basic-text storage. No secret getters are exposed to the renderer. IPC uses the existing main-frame sender check and replaces internal error details with one plain failure and next step.

## Snapshot and build

Preview content is held in memory until Use this. Marked items are excluded before size limiting or redaction. Email addresses, phone numbers and SSN-shaped numbers are hidden. Senders are hidden; names elsewhere in prose are not recognized and the screen makes no promise that they are. Remote source URLs and provider-specific fields are omitted.

The brief records connection ID, snapshot digest and an include-in-app choice that defaults to false. Sample data is always included. Host preparation reads approved disk snapshots, never adapters, and writes one JSON file per source plus context/README.md. Requirements and activity identify the chosen data. The brief hash includes snapshot selection and digest. A checkpoint also hashes every context file, including the README; changes, missing files, extra files and symlinks fail subsequent stages or resume.

Real-account snapshots are refused before workspace writes, regardless of include-in-app choice. Consequently real data cannot reach this event build or its source export. The source exporter already copies and verifies sample context. Live data-service delivery, its browser key prompt and its helper belong to the separate data-service work and are not claimed here.

Disconnect removes the saved source and its encrypted secrets. Frozen sample copies in existing build workspaces remain evidence for those builds. The person can stop a build through the existing Stop control; context preparation checks that same cancellation signal and removes incomplete context. Quit cancels pending previews. Source data carries no permission to send messages, open links or run commands.

## Verification

Run `npm run build`, then `node --test tests/connectors-core.test.mjs`.

Outside the restricted sandbox, run `node scripts/smoke-connectors.mjs`. It uses the actual Electron screen and IPC for all seven sample cards, brief selection and build start. The existing local fixture provider supplies the model responses. It requires a review result from the full native pipeline and checks the exact selected snapshots in the workspace, requirements and activity. It also checks the real safeStorage path. It does not replace process discovery, sandbox-exec or browser verification. A fresh output directory holds screenshots and a small receipt.

The unit suite uses the real sample adapter, sanitizer, disk store, context writer and source copier. Its encryption boundary uses Node authenticated encryption instead of native safeStorage, so those unit results are not native keychain proof. The cancellation-during-read test injects cancellation at that boundary; it is not native process shutdown proof. No live model or real account call is part of these checks.
