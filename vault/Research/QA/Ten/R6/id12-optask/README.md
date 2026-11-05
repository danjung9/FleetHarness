# Primary deferrals

None declared in the frozen plan. UC12-1 and DELIVERABLE12-1 remain unmet: the parser accepts invented SYN-OPTASK/1, not a documented USMTF subset. A new planning run and reviewed mapping are needed. Synthetic; not validated against the real USMTF format. Owner approval is required before delivery/deployment.

The current repair does not resolve the independent evaluator's format finding. The frozen invocation requires `grammarVersion: SYN-OPTASK/1` and the invented banner/sets; it explicitly rejects other versions. No independently domain-reviewed USMTF mapping or format-conforming held-out dataset is available in the supplied artifacts. Supporting that format requires a new planning run to revise the public protocol and establish independent format expectations. Passing synthetic tests must not be interpreted as completing UC12-1 or DELIVERABLE12-1.

Run `node --test domain.test.mjs workflow.test.mjs verifier.test.mjs format-boundary.test.mjs` for the original suite plus the additional HTTP format-boundary regression. The new test documents rejection behavior; it supplies no USMTF conformance evidence.

# OPTASK watch schedule

A local review workspace for watchstanders and shipboard leaders evaluating fictional messages. It extracts frequency plans, crypto change-over windows and flight quarters, shows a common 24-hour UTC timeline, and links each field to exact original source evidence.

## Prerequisites and startup

The person starting the local service needs Node.js 22.19 or newer. People using an already running service need only a modern browser. Run the following command from the application folder. No package installation, API keys, model configuration or third-party dependencies are required.

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

Open http://127.0.0.1:3000/. Keep the local service running for normal parsing. Do not open the HTML through file://. Stop with Ctrl-C.

## Review a synthetic schedule

1. Select `SYN-NOMINAL` under **Synthetic example**, then **Load sample**.
2. Keep **Ship** as FS AURORA and **UTC day** as 2026-11-05. Click **Parse message**.
3. Expect **4 extracted · 3 selected · 0 issues**. The selected frequency plan is 312.5 MHz at 06:00 to 10:00 UTC; crypto window is 08:00 to 08:15; flight quarters is 08:00 to 09:00. Scroll the timeline horizontally on narrow screens.
4. Select a field button such as **frequency: 312.5**. Source evidence shows **Line 6 · UTF-16 [232,237)** and highlights the exact value. UTC endpoints, full duration and day clipping are explained separately.
5. Click **Save draft**. Saved input stays in this browser and is recomputed on reload. Check **I have reviewed this saved synthetic draft**, then **Confirm reviewed draft**.
6. Click **Download schedule JSON** to save `synthetic-schedule.json`. It includes selected events, original text, evidence and explicit synthetic provenance. It does not transmit orders or approve an operational schedule.

Edits and ship/day changes clear previous source evidence and derived-time guidance, invalidate review and require parsing again. Review requires a current, saved, issue-free revision. **Discard draft** restores the last saved source and selection. **Clear draft** asks for confirmation and leaves the saved revision recoverable. Loading another sample offers keep/discard choices for unsaved work. Review confirmation is deliberately repeated after reload.

## Paste and correct a message

1. Paste fictional text into **Original message · SYN-OPTASK/1**. The **Ship** picker includes FS AURORA, FS LANTERN and additional ship names found in event sets. Select the exact ship and a **UTC day**.
2. Click **Parse message**. Read the counts, timeline and per-category schedule. Events for other ships and dates contribute to the extracted count but do not appear in the selected schedule.
3. If an issue appears, click **Inspect line** when available to see its source. Correct the original text and parse again. For an empty draft, enter text or load a sample.
4. Save and review the corrected revision before downloading. Acknowledging a problem cannot clear it; the source must be corrected.

## Save, restore and reset

1. Click **Save draft** to commit the exact current message, ship and day locally. **Saved locally** confirms success. Reload recomputes that saved input; the review declaration is not persisted.
2. To undo edits, click **Discard draft**, then **Parse message**. This restores the last saved input and selection. Without a saved revision, the app explains that there is nothing to restore.
3. To start an empty working draft, click **Clear draft** and confirm the browser prompt. Cancel keeps the current draft. To make an empty draft survive reload, click **Save draft** after clearing.
4. To replace an unsaved nonempty draft with a sample, click **Load sample**, then choose **Discard changes and load** or **Keep draft**. Merely selecting a sample does not replace text.

The app stores one saved input per browser origin. Changing the port, browser profile or device uses different storage. **Save draft** overwrites that one saved input; there is no version history. A downloaded JSON is a portable review artifact, but there is no JSON import or automatic restore control. For full removal, clear this site’s storage in browser settings; this also removes its offline cache.

## Supported input and validation

Only the invented SYN-OPTASK/1 plain-text grammar is supported. The first nonblank line must be `SYNTHETIC OPTASK, NOT REAL USMTF`. Event sets occur within `MSGID/id//` and `ENDMSG//` blocks:

```text
FREQPLAN/id/ship/label/2026-11-05T06:00Z/2026-11-05T10:00Z/312.5/MHz//
CRYPTO/id/ship/label/2026-11-05T08:00Z/2026-11-05T08:15Z//
FLIGHTQ/id/ship/label/2026-11-05T08:00Z/2026-11-05T09:00Z//
```

Fields cannot contain slashes/newlines. Explicit Z or endpoint offsets are required; invalid dates, unknown sets and duplicate identities require correction. No dates or overnight rollover are guessed. Correct **Original message**, then **Parse message**. Valid unrelated records remain visible, but unresolved issues block review/export. Empty input displays **Enter a synthetic OPTASK message.** All 18 prepared scenarios are in the picker, including overnight, dense, CRLF/Unicode and invalid examples. Samples preserve their original string until edited; textarea edits become a new source revision.

Local storage can fail or be cleared by browser settings. A failure leaves working text visible; copy it before closing and retry saving. Storage is local to this browser origin, with no authentication, synchronization or encryption guarantee. Reload restores the saved revision; unsaved edits are not durable across reload.

## Offline use

1. Start the local service and open the app on localhost or approved HTTPS. Click **Prepare offline**.
2. Wait for **Ready for offline parsing**. This requires service-worker activation and cached assets; a preparation message alone does not indicate readiness.
3. Click **Use offline route**. **Offline route active** means new parse requests bypass the network through the worker using the identical core. Enter a new message, then parse, save, review and download as above.
4. Click **Use online route** to return to normal network-first parsing. After a genuine disconnection, an installed worker also falls back to local computation when the request cannot reach the service.

First-time disconnected startup is unsupported. After successful preparation, the browser can disconnect and reload without using the route button. Additional Chromium integration tests passed at desktop and narrow widths: a distinct new message, empty-input recovery, save, second disconnected reload, review and downloaded JSON assertions. See repair-evidence/offline-run.json and the captured traces/downloads. Browser policy and cache eviction can prevent offline use; preparation failure means keep the service running and retry. Native textarea input normalizes CRLF to LF; byte preservation of pasted CRLF files is not established.

## Troubleshooting

| Symptom | Recovery |
| --- | --- |
| Cannot open the page | Start the service from the app folder and use the exact host/port in the command. If port 3000 is occupied, choose another unused port and open that address. |
| Parsing fails or times out | Keep the service running, retain the source text and retry **Parse message**. Offline use requires successful prior preparation. |
| Explicit timezone or impossible date issue | Correct both endpoint dates/times in **Original message**; use minute precision and an explicit Z or offset. Reparse. |
| Duplicate identity or unsupported set | Correct the source identity or unsupported content; the app cannot choose an amendment or infer meaning. |
| Review or download unavailable | Parse the current source, resolve all issues, **Save draft**, check the review declaration and **Confirm reviewed draft**. Edits invalidate review. |
| Local storage unavailable | Keep the page open, copy the source elsewhere, allow site storage and retry **Save draft**. No durable save is claimed after an error. |
| Offline preparation times out | Allow service workers on localhost/HTTPS, keep the service running and retry. If instructed, reload first. Browser policies may prohibit service workers. |

## Developer tests

These checks are for developers and require Node; they are not a prerequisite for using an already running app. No test dependencies need installation. From the application folder run:

```sh
node --test domain.test.mjs workflow.test.mjs verifier.test.mjs
```

25 local application tests passed, including complete prepared responses, malformed envelopes, HTTP invocation and adversarial protocol boundaries. All 25 also passed in a fresh directory containing only declared runtime files and test files. Tests use actual `compute.mjs` and `public/domain.mjs`; the service worker imports the same domain module. No toolkit test is counted as application evidence. The host-owned [.quality-evidence/core-report.json](.quality-evidence/core-report.json) reports all three required capabilities passed under Node v24.22.2. The host report records all 12 frozen browser executions passed. Additional actual disconnected-browser tests passed at both widths. USMTF format fidelity and operational validation remain unverified.

## Known limitations and integrations

No file upload, scanned-document support, export import, amendment resolution, multi-user synchronization or remote integration is implemented. Ship/day filtering uses exact ship names and UTC days only; the local computer timezone does not change the display. Frequency values retain their stated MHz or kHz units. The service has the foundation limits of 1 MB input JSON and 2 MB output; very large evidence-rich messages can exceed those bounds.

Foundation node-service/messages version 1.0.0 is retained with provenance in FOUNDATION.md and foundation-lock.json. No third-party packages were added. Template redistribution licensing is unresolved as documented in research.md; Node runtime licensing is separate.

No actual USMTF mapping, OCR, handwriting recognition, real crypto material, government connectivity, operational accuracy or authorization to operate is established. See [verification.md](verification.md) for observed checks and gaps, and [path-to-fleet.md](path-to-fleet.md) for owner validation and deployment prerequisites.

### Additional disconnected browser integration

`tests/offline.integration.mjs` is a separate application integration gate requiring provisioned Playwright and Chromium, outside the dependency-free frozen runtime manifest. It fails when prerequisites or the workflow fail; nothing is skipped.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright CHROME_EXECUTABLE=/absolute/path/to/chromium OFFLINE_EVIDENCE_DIR=repair-evidence node --test tests/offline.integration.mjs
```

The tested project helper `offline-browser` runs this same test with the inherited environment where direct shell browser launch is restricted. Helper configuration self-tests are separate from application results.
