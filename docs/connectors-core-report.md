# Connector core handoff

Implemented the service and checked IPC, encrypted secret store, marking checks, contact redaction, frozen snapshots, all seven sample cards, brief selection and pipeline preparation. Context gets a README that lists every item and source and treats content as untrusted data. Chosen digests affect brief identity and checkpoint checks reject altered context. Sample context is retained by the verified source exporter. Real account access remains off for the event.

The account and data-service files remain owned by the other writers. Optional registration matches their existing exported classes and loads them when present. The shared electron/connectors/types.ts file is unchanged. The live data-service delivery helper is outside this core implementation.

## Observed checks

| Check | Result |
| --- | --- |
| Frontend TypeScript, tsc --noEmit | Passed |
| Electron TypeScript, tsc -p electron/tsconfig.json | Passed |
| Vite production build | Passed |
| tests/connectors-core.test.mjs | 20 passed |
| Existing tests/source-export.test.mjs | 10 passed |
| Existing optional brief fields test in tests/runtime.test.mjs | 1 passed |
| scripts/smoke-connectors.mjs syntax | Passed |
| git diff --check | Passed |

The npm build wrapper returned 255 without a diagnostic. The underlying compiler and bundler commands passed separately. No existing test assertions were changed. Unit encryption uses authenticated Node crypto at the OS encryption boundary, so those tests do not prove native safeStorage. One unit injects cancellation during a read, which does not prove native process shutdown.

## Not run

The real Electron smoke, Chrome, native safeStorage, ps, sandbox-exec and the full suite require the overseer's unrestricted host. No real account, live data service or live model was used. The guard rejected proposed additional synthetic marking-literal test variants; the accepted suite tests the actual sample banner, not every public banner or portion form.

Run the build steps, then `node scripts/smoke-connectors.mjs`. The driver uses the actual screen, main-frame IPC, sample adapters and pipeline with the local fixture provider. It requires a successful review result without replacing native cleanup or verification. It checks native encryption, exact workspace context, requirements, activity, persistence and disconnect. Results go to output/connectors-smoke/receipt.json only if all assertions pass.

## Every existing frontend line changed

Only src/App.tsx changed among existing frontend files. These are all changed or added lines, with current line numbers. No existing CSS, studio/ or index.html file changed.

| Previous line | Current line | Change |
| --- | --- | --- |
| Added | 2 | Import Connectors and ConnectedDataSection |
| Added | 57 | Keep connected-data selections in the brief form |
| 60 | 62 | Preserve selections in draft changes |
| 61 | 63 | Observe selection changes in the draft effect |
| 65 | 67 | Include selections when saving the brief |
| Added | 80 | Render Use connected data |
| Added | 236 | Add one Connectors rail entry |
| 241 | 245 | Permit the screen with no project open |
| 246 | 250 | Keep its rail button enabled without a project |
| 251 | 255 | Show the Connectors title |
| Added | 264 | Render the Connectors screen |
| 260 | 265 | Omit the project progress header on Connectors |

The new frontend files are src/Connectors.tsx and src/connectors.css. Backend hooks are confined to the main process, preload, pipeline, shared brief types/validation and the connector compiler include. All writes stayed in this checkout. Vault logging is staged in Sprint/connectors-core.md because vault writes and its logging helper are denied here.

COMMIT: Add sample connectors and frozen build context
