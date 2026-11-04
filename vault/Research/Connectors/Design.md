---
type: design
status: active
owner: mukul
updated: 2026-11-04
summary: "Data connectors and GenAI.mil sign-in: what a person sees, how it is built, how it stays safe and how it is tested."
---

# Data connectors

[P] Mukul, 2026-11-04: connect the things a Navy officer uses every day (Gmail or Outlook, calendar, Drive, OneDrive) and custom APIs, so a build has real context, like C3 or Maven. Make it as easy as possible for a non-technical person. They should understand a little of what it is doing, and the app does 99% of the work. Fully tested.

## What a person sees

[R] A new Connectors item on the left rail, available without a project open. Cards: Gmail, Google Calendar, Google Drive, Outlook, Outlook Calendar, OneDrive, Your own data service. Each card has one sentence on what it reads, a Connect button, and Try sample data.

Connecting an account, three steps and no technical words:

1. **Sign in.** One click opens the normal sign-in page in the browser. The card says: "AppYard can only read. It cannot send, change or delete anything."
2. **Choose what to include.** Sensible defaults already set: last 30 days, or a folder or a search word if they want one.
3. **Check it.** A plain preview: "12 emails and 3 files. Names, phone numbers and email addresses are hidden. 2 items with markings such as CUI were left out. This goes to [model name] only when you use it in a build." Then Use this.

Connecting a data service:

1. Paste the address, or a link to its documentation.
2. AppYard works out the rest: it looks for an API description at the usual places, tries a read-only request, and tells from the response whether a key is needed. It asks only for what it needs: "This service needs a key. Paste it here."
3. It shows what it found in plain words with a small table: "Ships (24 records), Work orders (110 records)." Then Use this. Nothing technical is ever required, and field names are turned into readable labels.

On a challenge: one new section in the brief, Use connected data, with a checkbox per connected source. That is the only change to the build flow. The activity log then says in plain words which data the build used.

Every failure gets one plain sentence and one next step, for example: "Your organization has to approve AppYard before it can read this account. Send your administrator this page."

## How it is built

[R] Code lives in `electron/connectors/`, one file per concern, so three writers do not collide.

| File | Owner | Job |
| --- | --- | --- |
| `types.ts` | given, below | The shared interface |
| `index.ts`, `store.ts` | core | Service, IPC, saved connections without secrets, secrets encrypted with Electron safeStorage |
| `snapshot.ts`, `sanitize.ts` | core | Fetch to `ContextItem[]`, limits, redaction, marking check, written to the workspace |
| `sample-data.ts` | core | Synthetic Navy mailbox, calendar, files and a data service, for every card |
| `oauth.ts`, `google.ts`, `microsoft.ts` | accounts | Sign-in and the six account connectors |
| `custom-api.ts` | data service | Discovery, key detection, safe requests, the plain-word summary |
| `src/Connectors.tsx`, `src/connectors.css` | core | The screen, using the existing style tokens |

Pipeline: [R] when a build starts, the host writes the chosen snapshot to `context/` in the workspace, with `context/README.md` listing every item and its source, and adds a Connected data section to `requirements.md`. The brief hash includes the snapshot digest so a changed snapshot is a changed brief. Agents read files. They never get a token, and their sandbox stays network-off. Nothing fetches during a build.

Delivered apps: [R] real account data is left out of the delivered bundle unless the person ticks Include this data in the finished app, which is off by default. Sample data is included. A data service used live gets `appyard-connectors.js` in the app: it reads the address from `connectors.json` (never a key), asks the person for their key on first use, keeps it in that browser, falls back to the frozen sample, and gives a plain message if the service blocks the request.

## Safety rules, all tested

- [R] Read-only only. Google scopes: `gmail.readonly`, `calendar.readonly`, `drive.readonly`. Microsoft scopes: `Mail.Read`, `Calendars.Read`, `Files.Read.All`, `User.Read`, `offline_access`. Data services: GET only during builds.
- [R] Tokens and keys never appear in logs, errors, saved state, what the renderer receives, the workspace, agent environments or exports. Tested with distinctive fake values.
- [R] Content from these sources is untrusted data. `context/README.md` says so, and an email containing instructions gets no special treatment. The real protection is that agents have no network and no secrets.
- [R] Marking check: any item carrying a standard banner or portion marking is left out by default and counted in the preview. It reduces accidents and is not a classification decision. The preview must say so.
- [R] Redaction on by default: email addresses, phone numbers and SSN patterns.
- [R] Data service requests: https unless the person confirms an internal address. Link-local and cloud metadata addresses are always refused, checked on the resolved address and on every redirect. Limits on size, count and time.
- [R] Disconnect deletes the secrets, revokes where the provider allows it, and deletes saved snapshots.
- [E] Event rule 4 still applies: synthetic or published data only with the event key. Real mailboxes must not be connected while building on the event key. Testing uses sample data and fake servers.

## Real accounts

- [V] Microsoft: tokens are not interchangeable across national clouds, and apps reach only tenants in the same cloud. Commercial uses `login.microsoftonline.com` and `graph.microsoft.com`. GCC High uses `login.microsoftonline.us` and `graph.microsoft.us`. DoD uses `login.microsoftonline.us` and `dod-graph.microsoft.us`. Source: https://learn.microsoft.com/en-us/graph/deployments (may have changed).
- [V] Flank Speed is the Navy's Microsoft 365 environment, authorized up to IL5, inside DOD365. Source: https://www.peodigital.navy.mil/News/Article/3433458 (may have changed). [A] So it needs the DoD row above and that tenant's admin consent. Not verified.
- [R] The Outlook and OneDrive sign-in asks one question in plain words: Which Microsoft account? Personal or business, US Government, or Navy or DoD.
- [A] Real sign-in needs a registered app (a client ID) with Google and with Microsoft, and for Flank Speed an administrator's approval. A person has to do that. Client IDs come from settings or a config file, never hard-coded and never invented. With no client ID, the card says "Ask your administrator to turn this on" and still offers sample data. `docs/connectors.md` gives the administrator the steps.
- [E] So what can be proven here: the full flow against fake sign-in and API servers, and sample data through a real build. Real Google and Microsoft sign-in stays unproven until someone registers an app and uses a test account.

## GenAI.mil

- [V] A DefenseScoop column of 2026-04-30 reports a recent release of a GenAI.mil API and frequent connection failures with developer applications, with no endpoint, key or format details. Source: https://defensescoop.com/2026/04/30/improved-but-incomplete-genai-mil-and-the-last-mile-problem/ (may have changed).
- [V] A Marine Corps page lists API access as a planned future enhancement, cites MARADMIN 018/26 signed 2026-01-21, and says the platform is approved for CUI and not for PII, PHI or classified information. Source: https://semper-admin-portal.app.cloud.gov/marines/genai-mil-enterprise-platform/ (may have changed). A search summary of Marine Corps guidance also says personal devices are not authorized. Not verified directly.
- [E] No public endpoint, key process or request format was found, so none may be invented or hard-coded. That message lists a help desk.
- [P] Mukul, 2026-11-04: do not test the GenAI.mil API for now, that comes later. Set up the UI and the integration framework only. Fully test everything else.
- [R] Model settings gets tabs: ChatGPT, API key, GenAI.mil, Other providers. The GenAI.mil tab takes the service address and the key from their administrator, stores them safely and hands them to a small provider module with a clear place to plug in the real format later, on the Pi engine. It says plainly that the connection has not been tested yet and never shows Connected. Unit tests cover saving, encrypted key storage and that the key stays out of logs and saved state. Nothing is tested against a GenAI.mil service or a stand-in for one.

## Tests

- [R] `tests/fixtures/connector-servers.mjs`: local fake sign-in, Google, Microsoft and data-service servers, with token refresh, expiry, 401, 403 for admin approval required, pagination, 429 and slow responses.
- [R] Unit tests per file. A test that the marked item, the redacted values and the fake tokens are absent from everything saved.
- [R] `scripts/smoke-connectors.mjs`: the real Electron app through the real screen. Sample data, the data service against the fake server, and sign-in against the fake provider. The overseer runs it outside the sandbox.
- [R] One real build on the event login using sample connector data, checking the delivered app really uses that data.
