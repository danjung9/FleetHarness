# Account connectors

AppYard reads Gmail, Google Calendar, Google Drive, Outlook, Outlook Calendar and OneDrive. It cannot send mail, modify events, upload files or delete provider data. Each card requires an administrator-supplied public client ID. Without one, `available()` is false and the card should say "Ask your administrator to turn this on" while offering sample data.

During this event, use synthetic or published data only. Do not connect real mailboxes to a build using the event key. Local fixture sign-in proves the implemented protocol and parsing paths; it does not prove a real registration, tenant policy or government account works.

## Google registration

1. Register an OAuth application for a desktop client in the organization's Google project. Enable Gmail API, Google Calendar API and Google Drive API for the connectors being offered.
2. Configure the consent screen, intended audience and permitted test users. The administrator must resolve any verification or organization approval required for these read permissions before rollout.
3. Supply that registration's client ID as `GoogleConfig.clientId`. Do not provide a client secret, password or token in settings. Sign-in uses the system browser and a temporary listener bound only to `127.0.0.1`, with a redirect such as `http://127.0.0.1:<temporary-port>/oauth/callback`.
4. The person signs in and approves only the selected card's permission. AppYard requests offline access and consent so it can refresh access without another sign-in.

| Card | Requested scope |
| --- | --- |
| Gmail | `https://www.googleapis.com/auth/gmail.readonly` |
| Google Calendar | `https://www.googleapis.com/auth/calendar.readonly` |
| Google Drive | `https://www.googleapis.com/auth/drive.readonly` |

## Microsoft registration

Register a public desktop application in the same cloud as its accounts. Configure the supported account audience, delegated permissions below, and organization consent where needed. Configure the mobile/desktop loopback redirect `http://localhost/oauth/callback`, with the native-client allowance for a temporary localhost port. The local server binds only to `127.0.0.1`. Enable public client/device-code flows if government accounts need the fallback. No client secret is used.

Sign-in asks one question: "Which Microsoft account?"

| Answer | Authorization and token host | Graph host |
| --- | --- | --- |
| Personal or business | `login.microsoftonline.com` | `graph.microsoft.com` |
| US Government | `login.microsoftonline.us` | `graph.microsoft.us` |
| Navy or DoD | `login.microsoftonline.us` | `dod-graph.microsoft.us` |

The US Government choice means the GCC High endpoint in the design. Accounts hosted in the commercial cloud must use Personal or business. Navy or DoD uses the DoD endpoints; actual Flank Speed compatibility and tenant approval remain unverified.

Supply `MicrosoftConfig.clientId` and, when required, `tenantId`. A specific tenant ID is recommended for organization deployments. Defaults are `common` for commercial and `organizations` for government. Registrations cannot cross national clouds. If offering several clouds, supply separate registrations under `clouds.commercial`, `clouds.government` and `clouds.dod`. Each entry takes `clientId` and `tenantId`; these override the common configuration. Leave the common client ID unset to enable only explicitly configured clouds.

| Card | Delegated resource permission | Also requested |
| --- | --- | --- |
| Outlook | `Mail.Read` | `User.Read`, `offline_access` |
| Outlook Calendar | `Calendars.Read` | `User.Read`, `offline_access` |
| OneDrive | `Files.Read.All` | `User.Read`, `offline_access` |

Resource scopes are qualified with the selected Graph host, for example `https://dod-graph.microsoft.us/Mail.Read`. No write scopes or application permissions are requested.

Government sign-in first tries authorization code with PKCE. If the browser cannot open or the loopback listener cannot start, it requests a device code, displays the code and sign-in address, and polls until approved, expired or cancelled. The person enters the code and credentials themselves. Pending authorization and requests to slow polling are honored. Declining consent does not trigger a second sign-in attempt. Commercial accounts use the browser flow only.

## What is read

- Mail defaults to the last 30 days. Gmail accepts its search syntax and a label ID. Outlook accepts a literal search phrase in subject, sender or body and an optional mail folder ID. HTML is converted to plain text. Gmail prefers the plain MIME alternative, supports inline bodies held behind attachment IDs, and decodes declared text character sets. Named attachments are excluded. If only a snippet is readable, it is labeled "Message preview".
- Calendar defaults to the primary calendar. `folder` can select another calendar ID. Google reads expanded events since the cutoff; Outlook reads expanded occurrences from that cutoff through the next 30 days. Cancelled events are omitted. Outlook requests UTC dates. Calendar searches match readable event text.
- Files default to a 30-day modification cutoff. Google Drive searches accessible files, optionally restricted to a parent folder ID. OneDrive lists the root or selected folder's immediate files; supplying a search phrase uses that folder's search endpoint. Folder selection uses IDs, not filesystem paths. Neither connector pretends that a folder itself is a readable file.
- Supported file extensions are `txt`, `md`, `markdown`, `csv`, `tsv`, `json`, `xml`, `html`, `htm`, `log`, `yaml`, `yml` and `ics`, with compatible text MIME types. Files must contain readable UTF-8 text; binary or undecodable files are omitted. HTML becomes plain text. Google Docs are exported as plain text. PDF, Office binaries, images, archives, Google Sheets and Slides, shortcuts and remote OneDrive items are excluded. There is no OCR, workbook conversion or binary document parser.
- `maxItems` caps the returned count. `maxBytes` caps the sum of UTF-8 bytes of serialized returned items, including metadata. Oversized items are omitted whole. Each HTTP body also has an 8 MiB ceiling, and file downloads use the smaller of that ceiling and `maxBytes`. A response that exceeds the streaming cap fails with a request to select a smaller file. Unicode is measured in bytes, not characters.
- Requests time out after 15 seconds including the response body. A fetch has a two-minute deadline and at most 100 pages per listing. Sign-in has a five-minute deadline. Repeated pages fail explicitly; duplicate item IDs are not returned twice. Cancellation stops waiting, HTTP requests and the callback listener.

Source text remains untrusted. These adapters return `ContextItem[]` to the core service. The separately owned snapshot service must apply marking checks and redaction, require preview approval before use, exclude real data from exports by default, and keep agents offline without secrets. Those responsibilities are not implemented by these three adapter files.

## Errors and removal

| Situation | What happens and what the person should do |
| --- | --- |
| Expired token | Refresh through secure storage before fetching; reconnect if refresh is no longer valid. |
| HTTP 401 | Refresh and retry once; a second rejection asks the person to connect again. |
| HTTP 403 | Explain that organization approval is required and ask the administrator to approve the listed permissions. |
| HTTP 429 | Honor a short Retry-After and retry once; otherwise ask the person to wait a minute. |
| Slow or unreachable service | Stop within the deadline and ask the person to retry or check their connection. |
| Invalid provider response or unexpected next page/download address | Stop and show a plain next step; provider response bodies and raw exception messages are not exposed. |
| Secure storage unavailable | Ask the person to unlock the system keychain and try again. |

Disconnect cancels active operations and removes the credential record. Google also receives a revocation request; if that fails, local removal still succeeds and the person is told to remove AppYard in account permissions. Microsoft has no per-app delegated-token revocation endpoint used here; administrators or users can remove the grant in their account/tenant application permissions. The core service must also remove connection records and snapshots.

## Integration and test boundary

`types.ts` is unchanged. Use `GoogleConnector(kind, config)` or the `GmailConnector`, `GoogleCalendarConnector`, `GoogleDriveConnector` convenience classes. Microsoft provides `MicrosoftConnector(kind, config)` plus `OutlookConnector`, `OutlookCalendarConnector` and `OneDriveConnector`. All implement `ConnectorAdapter`.

Construct adapters in the main process. Pass only the documented registration fields from saved configuration. The third constructor argument is reserved for tests, requires `NODE_ENV=test`, and allows only explicit loopback HTTP(S) endpoints. Normal configuration cannot replace any provider URL. Do not expose this argument through IPC or saved settings.

The `SecretStore` holds one JSON credential record under `connectors:<kind>:oauth`, containing access token, optional refresh token, expiry and the selected Microsoft cloud. It must be the encrypted main-process store, never renderer state or workspace files. Pass a store scoped to the connection if multiple accounts of the same kind are supported. Returned labels are generic account labels, not verified identities. Tokens do not appear in `ContextItem` fields or error text; known credentials echoed by a provider are hidden.

Pagination stays on the configured API origin and path. Ordinary API redirects are refused. OneDrive content redirects are validated at every hop against the selected cloud's download hosts; redirected downloads never receive the bearer header. Temporary download URLs are not included in returned items.

Run the local protocol tests with:

```sh
node --test tests/connectors-accounts.test.mjs
npm run build:electron
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/tsc -p harness/tsconfig.json --noEmit
```

The account test compiles the actual connector sources with strict checking into `dist-electron/connector-account-tests`. It uses real local HTTP servers and the production callback, PKCE verifier, token exchange, refresh, API requests and streaming reads. Only the UI browser opener is replaced with a local HTTP browser simulation, and SecretStore with an in-memory fixture. No production HTTP function is replaced with a fake. The fake provider verifies PKCE and rotating refresh tokens. Assertions cover all six adapters, scopes, account clouds, device polling, consent failures, paging, filters, limits, cancellation, redirects, MIME parsing, and distinctive synthetic credentials absent from errors and returned items.

Real browser consent, Electron UI integration, encrypted system keychain behavior, real Google/Microsoft tenants, government access, and an end-to-end sample-data build require separate verification. No real provider or model call is part of these tests.

## Local handoff record

[E] Work is limited to the three account adapter files, the account fixture/test files and this document. The shared interface and other connector writers' files remain unchanged. No repository metadata, vault files or other checkouts were changed.

[E] Existing local tools used: Node.js 26.0.0 and its built-in HTTP, cryptography, text decoder and test modules; TypeScript 7.0.2 from the repository; shell file inspection and ripgrep. No dependency or external service was added. The dataset is synthetic mailbox, calendar and text-file content generated by `tests/fixtures/connector-servers.mjs`.

[E] Vault ledger and session updates could not be written: the vault is read-only, its tools directory is denied, and this task authorizes changes only in this checkout. Carry this record into the tool, friction and session logs from an authorized session. The shell also refused a here-document temporary file; patch-based editing succeeded. Test and runtime evidence is recorded in the task handoff, without claiming real-provider verification.

[E, 2026-11-04] Verification: 38 account tests passed, zero failed or skipped, using native loopback HTTP. Strict compilation of the account sources passed. Frontend, Electron and harness type checks passed. Direct Electron compilation passed. `npm run build:electron` separately exited 255 without diagnostics; the cause was not established. The full native suite, browser consent, Electron UI/keychain flow, real tenants and a sample-data build were not run here. The overseer owns those remaining checks. The first protocol run exposed a Gmail attachment/body selection error; the implementation was corrected and the original assertion retained.
